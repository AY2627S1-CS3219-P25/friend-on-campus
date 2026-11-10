/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent; Google Antigravity; Claude Code (model: Claude Fable 5.1, Sonnet 5); Codex (model: GPT-6, GPT-5.6 Terra), date: 2026-09-22 to 2026-11-10
 * Scope: Enforced immutable email addresses in the User Service profile persistence path; updated across 8 AI-assisted revisions through D4 wrap-up (require at least one enabled admin to remain when demoting or deleting an enabled admin (issue #109)).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */

import { Prisma, PrismaClient, type User as PrismaUser } from '../database/client';

export class LastAdminError extends Error {
  constructor(message = 'The last admin cannot be demoted or deleted') {
    super(message);
    this.name = 'LastAdminError';
  }
}

export type UserRole = 'STUDENT' | 'ADMIN';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  status: boolean;
}

export interface UpdateUserRecord {
  username: string;
}

export interface UserRepository {
  findById(userId: string): Promise<UserRecord | null>;
  listAll(): Promise<UserRecord[]>;
  updateProfile(userId: string, input: UpdateUserRecord): Promise<UserRecord | null>;
  updatePassword(
    userId: string,
    currentPasswordHash: string,
    newPasswordHash: string,
  ): Promise<boolean>;
  toggleStatus(userId: string): Promise<UserRecord | null>;
  toggleRole(userId: string): Promise<UserRecord | null>;
  deleteById(userId: string): Promise<boolean>;
}

function toUserRecord(row: PrismaUser): UserRecord {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role as UserRole,
    status: row.status,
  };
}

export function createUserRepository(prisma: PrismaClient): UserRepository {
  // Role changes, status changes and deletions share a database lock across all service instances.
  // ReadCommitted gives the reads after a lock wait a fresh view of committed admins.
  function withAdminMembershipLock<T>(operation: (tx: Prisma.TransactionClient) => Promise<T>) {
    return prisma.$transaction(async (tx) => {
      // Reserved advisory-lock namespace: 3219 (application), 1 (admin membership).
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(3219, 1)`;
      return operation(tx);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted });
  }

  // Preserve at least one enabled ADMIN across demotion and deletion (issue #109).
  async function assertAdminRemains(tx: Prisma.TransactionClient, user: PrismaUser) {
    if (
      user.role === 'ADMIN' &&
      user.status &&
      (await tx.user.count({ where: { role: 'ADMIN', status: true, id: { not: user.id } } })) === 0
    ) {
      throw new LastAdminError();
    }
  }

  return {
    async findById(userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      return user ? toUserRecord(user) : null;
    },

    async listAll() {
      const users = await prisma.user.findMany({ orderBy: { username: 'asc' } });
      return users.map(toUserRecord);
    },

    async updateProfile(userId, input) {
      const updated = await prisma.user.updateMany({
        where: { id: userId },
        data: { username: input.username },
      });
      if (updated.count !== 1) {
        return null;
      }

      const user = await prisma.user.findUnique({ where: { id: userId } });
      return user ? toUserRecord(user) : null;
    },

    async updatePassword(userId, currentPasswordHash, newPasswordHash) {
      const updated = await prisma.user.updateMany({
        where: { id: userId, passwordHash: currentPasswordHash },
        data: { passwordHash: newPasswordHash },
      });

      return updated.count === 1;
    },

    async toggleStatus(userId) {
      return withAdminMembershipLock(async (tx) => {
        const existing = await tx.user.findUnique({ where: { id: userId } });
        if (!existing) return null;
        // Only an enabled admin can re-enable an account, so one must always remain.
        if (existing.status && existing.role === 'ADMIN'
          && await tx.user.count({ where: { role: 'ADMIN', status: true, id: { not: existing.id } } }) === 0) {
          throw new LastAdminError('The last enabled admin cannot be disabled');
        }
        const updated = await tx.user.update({
          where: { id: userId },
          data: { status: !existing.status },
        });
        return toUserRecord(updated);
      });
    },

    async toggleRole(userId) {
      return withAdminMembershipLock(async (tx) => {
        const existing = await tx.user.findUnique({ where: { id: userId } });
        if (!existing) return null;
        await assertAdminRemains(tx, existing);
        const updated = await tx.user.update({
          where: { id: userId },
          data: { role: existing.role === 'ADMIN' ? 'STUDENT' : 'ADMIN' },
        });
        return toUserRecord(updated);
      });
    },

    async deleteById(userId) {
      return withAdminMembershipLock(async (tx) => {
        const existing = await tx.user.findUnique({ where: { id: userId } });
        if (!existing) return false;
        await assertAdminRemains(tx, existing);
        await tx.user.delete({ where: { id: userId } });
        return true;
      });
    },
  };
}
