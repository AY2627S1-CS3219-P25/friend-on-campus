/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Replaced raw pg profile and password queries with equivalent Prisma persistence operations.
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
}

export interface UpdateUserRecord {
  username?: string;
  email?: string;
}

export interface UserRepository {
  findById(userId: string): Promise<UserRecord | null>;
  updateProfile(userId: string, input: UpdateUserRecord): Promise<UserRecord | null>;
  updatePassword(
    userId: string,
    currentPasswordHash: string,
    newPasswordHash: string,
  ): Promise<boolean>;
}

function toUserRecord(row: PrismaUser): UserRecord {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role as UserRole,
  };
}

export function createUserRepository(prisma: PrismaClient): UserRepository {
  return {
    async findById(userId) {
      const user = await prisma.user.findUnique({ where: { id: userId } });
      return user ? toUserRecord(user) : null;
    },

    async updateProfile(userId, input) {
      const updated = await prisma.user.updateMany({
        where: { id: userId },
        data: {
          ...(input.username !== undefined ? { username: input.username } : {}),
          ...(input.email !== undefined ? { email: input.email } : {}),
        },
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
  };
}
