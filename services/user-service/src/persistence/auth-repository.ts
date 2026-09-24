/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented Prisma-backed persistence operations for users, case-insensitive lookup, refresh sessions, expiry cleanup, token rotation, and revocation.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
 * Scope: findUserByEmail now queries LOWER(email) so it uses the case-insensitive unique index instead of a
 * sequential scan; added deleteExpiredSessions for opportunistic clean-up of idle-expired session rows.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { Prisma, PrismaClient, User as PrismaUser } from '../database/generated/client';

export type UserRole = 'STUDENT' | 'ADMIN';

export interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
}

export interface SessionUserRecord {
  sessionId: string;
  user: UserRecord;
  persistent: boolean;
  idleExpiresAt: Date;
}

export interface CreateUserRecord {
  username: string;
  email: string;
  passwordHash: string;
}

export interface CreateSessionRecord {
  userId: string;
  refreshTokenHash: string;
  persistent: boolean;
  idleExpiresAt: Date;
}

export interface AuthRepository {
  createUser(input: CreateUserRecord): Promise<UserRecord>;
  findUserByEmail(email: string): Promise<UserRecord | null>;
  cleanupExpiredSessions(now: Date): Promise<void>;
  createSession(input: CreateSessionRecord): Promise<SessionUserRecord>;
  rotateSession(
    currentTokenHash: string,
    nextTokenHash: string,
    standardIdleExpiresAt: Date,
    persistentIdleExpiresAt: Date,
  ): Promise<SessionUserRecord | null>;
  revokeSession(refreshTokenHash: string): Promise<void>;
  deleteExpiredSessions(now: Date): Promise<void>;
}

type SessionWithUser = Prisma.SessionGetPayload<{ include: { user: true } }>;

function toUserRecord(row: PrismaUser): UserRecord {
  return {
    id: row.id,
    username: row.username,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role as UserRole,
  };
}

function toSessionUserRecord(row: SessionWithUser): SessionUserRecord {
  return {
    sessionId: row.id,
    user: toUserRecord(row.user),
    persistent: row.persistent,
    idleExpiresAt: row.idleExpiresAt,
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
        SELECT id, username, email, password_hash AS "passwordHash", role,
               created_at AS "createdAt", updated_at AS "updatedAt"
        FROM users
        WHERE LOWER(email) = LOWER(${email})
        LIMIT 1
      `;
      return rows.length === 1 ? toUserRecord(rows[0]) : null;
    },

    async cleanupExpiredSessions(now) {
      await prisma.session.deleteMany({
        where: { idleExpiresAt: { lte: now } },
      });
    },

    async createSession(input) {
      const session = await prisma.session.create({
        data: input,
        include: { user: true },
      });

      return toSessionUserRecord(session);
    },

    async rotateSession(
      currentTokenHash,
      nextTokenHash,
      standardIdleExpiresAt,
      persistentIdleExpiresAt,
    ) {
      return prisma.$transaction(async (transaction: Prisma.TransactionClient) => {
        const currentSession = await transaction.session.findUnique({
          where: { refreshTokenHash: currentTokenHash },
          include: { user: true },
        });
        const now = new Date();
        if (!currentSession || currentSession.idleExpiresAt <= now) {
          return null;
        }

        const idleExpiresAt = currentSession.persistent
          ? persistentIdleExpiresAt
          : standardIdleExpiresAt;
        const updated = await transaction.session.updateMany({
          where: {
            id: currentSession.id,
            refreshTokenHash: currentTokenHash,
            idleExpiresAt: { gt: now },
          },
          data: {
            refreshTokenHash: nextTokenHash,
            lastUsedAt: now,
            idleExpiresAt,
          },
        });
        if (updated.count !== 1) {
          return null;
        }

        return toSessionUserRecord({ ...currentSession, idleExpiresAt });
      });
    },

    async revokeSession(refreshTokenHash) {
      await prisma.session.deleteMany({ where: { refreshTokenHash } });
    },

    async deleteExpiredSessions(now) {
      await prisma.session.deleteMany({ where: { idleExpiresAt: { lte: now } } });
    },
  };
}
