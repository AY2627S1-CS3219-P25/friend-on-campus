/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-29
 * Scope: Unified UserRepository consolidating all user queries and credential operations (createUser, findByEmail, findById, listAll, updateProfile, updatePassword, toggleStatus).
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
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

export interface CreateUserRecord {
  username: string;
  email: string;
  passwordHash: string;
  role?: UserRole;
}

export interface UpdateUserRecord {
  username: string;
}

export interface UserRepository {
  createUser(input: CreateUserRecord): Promise<UserRecord>;
  findByEmail(email: string): Promise<UserRecord | null>;
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
    async createUser(input) {
      const user = await prisma.user.create({
        data: {
          username: input.username,
          email: input.email,
          passwordHash: input.passwordHash,
          role: input.role ?? 'STUDENT',
        },
      });

      return toUserRecord(user);
    },

    async findByEmail(email) {
      // Matches the users_email_case_insensitive_uq expression index (LOWER(email))
      const rows = await prisma.$queryRaw<PrismaUser[]>`
        SELECT id, username, email, password_hash AS "passwordHash", role, status,
               created_at AS "createdAt", updated_at AS "updatedAt"
        FROM users
        WHERE LOWER(email) = LOWER(${email})
        LIMIT 1
      `;
      return rows.length === 1 ? toUserRecord(rows[0]) : null;
    },

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
