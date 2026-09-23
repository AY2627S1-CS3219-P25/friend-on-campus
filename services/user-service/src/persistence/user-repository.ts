/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Replaced raw pg profile and password queries with equivalent Prisma persistence operations.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Removed email mutation from the User Service profile persistence path.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { PrismaClient, User as PrismaUser } from '../database/generated/client';

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
      const existing = await prisma.user.findUnique({ where: { id: userId } });
      if (!existing) {
        return null;
      }

      const updated = await prisma.user.update({
        where: { id: userId },
        data: { status: !existing.status },
      });

      return toUserRecord(updated);
    },
  };
}
