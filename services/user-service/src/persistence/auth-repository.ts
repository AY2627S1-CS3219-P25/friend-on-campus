/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-29
 * Scope: Cleaned up dead database session methods (createSession, rotateSession, revokeSession, cleanupExpiredSessions); AuthRepository now solely focuses on user credential persistence.
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
}

export interface AuthRepository {
  createUser(input: CreateUserRecord): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  findById(id: string): Promise<UserRecord | null>;
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

export function createAuthRepository(prisma: PrismaClient): AuthRepository {
  return {
    async createUser(input) {
      const user = await prisma.user.create({
        data: {
          username: input.username,
          email: input.email,
          passwordHash: input.passwordHash,
          role: 'STUDENT',
        },
      });

      return toUserRecord(user);
    },

    async findUserByEmail(email) {
      // Matches the users_email_case_insensitive_uq expression index (LOWER(email)); a plain
      // `WHERE email = $1` cannot use it. Parameterised by Prisma's tagged template.
      const rows = await prisma.$queryRaw<PrismaUser[]>`
        SELECT id, username, email, password_hash AS "passwordHash", role, status,
               created_at AS "createdAt", updated_at AS "updatedAt"
        FROM users
        WHERE LOWER(email) = LOWER(${email})
        LIMIT 1
      `;
      return rows.length === 1 ? toUserRecord(rows[0]) : null;
    },

    async findById(id) {
      const row = await prisma.user.findUnique({
        where: { id },
      });
      return row ? toUserRecord(row) : null;
    },
  };
}
