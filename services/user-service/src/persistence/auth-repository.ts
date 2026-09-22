/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Replaced raw pg account and session queries with equivalent Prisma persistence operations.
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
  createSession(input: CreateSessionRecord): Promise<SessionUserRecord>;
  rotateSession(
    currentTokenHash: string,
    nextTokenHash: string,
    standardIdleExpiresAt: Date,
    persistentIdleExpiresAt: Date,
  ): Promise<SessionUserRecord | null>;
  revokeSession(refreshTokenHash: string): Promise<void>;
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
      const user = await prisma.user.findFirst({ where: { email } });
      return user ? toUserRecord(user) : null;
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
  };
}
