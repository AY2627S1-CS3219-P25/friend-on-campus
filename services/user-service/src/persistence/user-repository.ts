/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-04
 * Scope: toggleStatus now runs under the admin-membership lock and refuses to disable the last enabled admin
 * (UAT A8); LastAdminError takes the message for that case.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Codex (model: GPT-6), date: 2026-09-30
 * Scope: Serialize role changes and deletions with a transaction-scoped PostgreSQL advisory lock and reject removal of the last admin.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented Prisma-backed persistence operations for user profiles and password changes.
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Enforced immutable email addresses in the User Service profile persistence path.
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-28
 * Scope: Added deleteById() for the new DELETE /api/users/:id endpoint (self-or-admin account deletion).
 * Author review: (to be completed by author after review)
 *
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-28
 * Scope: Added toggleRole() (flips STUDENT<->ADMIN) for the new PATCH /:id/toggle-role endpoint, same
 * find-then-flip-then-update shape as toggleStatus.
 * Author review: (to be completed by author after review)
 */

// AI-generated (edited by ngkhengyang)

// AI-generated (edited by ngkhengyang)


import { Prisma, PrismaClient, User as PrismaUser } from '../database/generated/client';

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

  async function assertAdminRemains(tx: Prisma.TransactionClient, user: PrismaUser) {
    if (user.role === 'ADMIN' && await tx.user.count({ where: { role: 'ADMIN' } }) <= 1) {
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

    // AI-generated (edited by Reallyeasy1)
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
