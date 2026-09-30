/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-30
 * Scope: Mirror last-admin protection and UUID case handling in the user repository fake.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
 * Scope: Test helpers: in-memory fakes for AuthRepository and UserRepository, a deterministic TokenManager,
 * an Ed25519 key pair for tests, and a small HTTP client for the app tests. No production code changed.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { generateKeyPairSync, createHash } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Express } from 'express';
import type {
  AuthRepository,
  CreateSessionRecord,
  CreateUserRecord,
  SessionUserRecord,
  UserRecord,
} from '../src/persistence/auth-repository';
import type { UpdateUserRecord, UserRepository } from '../src/persistence/user-repository';
import { LastAdminError } from '../src/persistence/user-repository';
import type { TokenManager } from '../src/auth/tokens';

export function makeUser(overrides: Partial<UserRecord> = {}): UserRecord {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    username: 'alice',
    email: 'alice@u.nus.edu',
    passwordHash: '$scrypt$16384$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA==',
    role: 'STUDENT',
    status: true,
    ...overrides,
  };
}

/** Ed25519 key pair in the encoding the services expect (base64url DER). */
export function makeKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKey: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64url'),
    publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64url'),
  };
}

/** Records every call and returns predictable tokens; no cryptography. */
export function makeFakeTokens(): TokenManager & { issued: Array<{ userId: string; sessionId: string; role: string }> } {
  let counter = 0;
  const issued: Array<{ userId: string; sessionId: string; role: string }> = [];
  return {
    issued,
    issueAccessToken(userId, sessionId, role) {
      issued.push({ userId, sessionId, role });
      return `access-token-for-${userId}-${sessionId}-${role}`;
    },
    generateRefreshToken() {
      counter += 1;
      return `refresh-${counter}`;
    },
    hashRefreshToken(refreshToken) {
      return createHash('sha256').update(refreshToken).digest('hex');
    },
  };
}

interface StoredSession {
  sessionId: string;
  userId: string;
  refreshTokenHash: string;
  persistent: boolean;
  idleExpiresAt: Date;
}

/** In-memory AuthRepository with the same contract as the Prisma one, including duplicate errors. */
export function makeFakeAuthRepository(seed: UserRecord[] = []) {
  const users = new Map<string, UserRecord>(seed.map((u) => [u.id, { ...u }]));
  const sessions = new Map<string, StoredSession>();
  let nextId = 1;
  const calls: string[] = [];

  const repo: AuthRepository = {
    async createUser(input: CreateUserRecord) {
      calls.push('createUser');
      for (const existing of users.values()) {
        if (existing.email.toLowerCase() === input.email.toLowerCase()) {
          throw Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['email'] } });
        }
        if (existing.username.toLowerCase() === input.username.toLowerCase()) {
          throw Object.assign(new Error('unique'), { code: '23505', constraint: 'users_username_case_insensitive_uq' });
        }
      }
      const user: UserRecord = {
        id: `00000000-0000-4000-8000-${String(nextId++).padStart(12, '0')}`,
        username: input.username,
        email: input.email,
        passwordHash: input.passwordHash,
        role: 'STUDENT',
        status: true,
      };
      users.set(user.id, user);
      return { ...user };
    },
    async findUserByEmail(email) {
      calls.push('findUserByEmail');
      for (const u of users.values()) {
        if (u.email.toLowerCase() === email.toLowerCase()) return { ...u };
      }
      return null;
    },
    async cleanupExpiredSessions(now) {
      calls.push('cleanupExpiredSessions');
      for (const [hash, s] of sessions) {
        if (s.idleExpiresAt <= now) sessions.delete(hash);
      }
    },
    async createSession(input: CreateSessionRecord) {
      calls.push('createSession');
      const session: StoredSession = {
        sessionId: `session-${nextId++}`,
        userId: input.userId,
        refreshTokenHash: input.refreshTokenHash,
        persistent: input.persistent,
        idleExpiresAt: input.idleExpiresAt,
      };
      sessions.set(session.refreshTokenHash, session);
      return toSessionUser(session);
    },
    async rotateSession(currentTokenHash, nextTokenHash, standardIdleExpiresAt, persistentIdleExpiresAt) {
      calls.push('rotateSession');
      const current = sessions.get(currentTokenHash);
      if (!current || current.idleExpiresAt <= new Date()) return null;
      sessions.delete(currentTokenHash);
      const rotated: StoredSession = {
        ...current,
        refreshTokenHash: nextTokenHash,
        idleExpiresAt: current.persistent ? persistentIdleExpiresAt : standardIdleExpiresAt,
      };
      sessions.set(nextTokenHash, rotated);
      return toSessionUser(rotated);
    },
    async revokeSession(refreshTokenHash) {
      calls.push('revokeSession');
      sessions.delete(refreshTokenHash);
    },
    async deleteExpiredSessions(now) {
      calls.push('deleteExpiredSessions');
      for (const [hash, s] of sessions) {
        if (s.idleExpiresAt <= now) sessions.delete(hash);
      }
    },
  };

  function toSessionUser(session: StoredSession): SessionUserRecord {
    const user = users.get(session.userId);
    if (!user) throw new Error('session without user');
    return {
      sessionId: session.sessionId,
      user: { ...user },
      persistent: session.persistent,
      idleExpiresAt: session.idleExpiresAt,
    };
  }

  return { repo, users, sessions, calls };
}

/** In-memory UserRepository mirroring the Prisma implementation's semantics. */
export function makeFakeUserRepository(seed: UserRecord[] = [], shared?: Map<string, UserRecord>) {
  // Pass the auth repository's map to share one "database" between the two repositories, as Prisma does.
  const users = shared ?? new Map<string, UserRecord>(seed.map((u) => [u.id, { ...u }]));
  const repo: UserRepository = {
    async findById(userId) {
      const u = users.get(userId);
      return u ? { ...u } : null;
    },
    async listAll() {
      return [...users.values()]
        .sort((a, b) => a.username.localeCompare(b.username))
        .map((u) => ({ ...u }));
    },
    async updateProfile(userId, input: UpdateUserRecord) {
      const u = users.get(userId);
      if (!u) return null;
      for (const other of users.values()) {
        if (other.id !== userId && other.username.toLowerCase() === input.username.toLowerCase()) {
          throw Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['username'] } });
        }
      }
      u.username = input.username;
      return { ...u };
    },
    async updatePassword(userId, currentPasswordHash, newPasswordHash) {
      const u = users.get(userId);
      if (!u || u.passwordHash !== currentPasswordHash) return false;
      u.passwordHash = newPasswordHash;
      return true;
    },
    async toggleStatus(userId) {
      const u = users.get(userId);
      if (!u) return null;
      u.status = !u.status;
      return { ...u };
    },
    async toggleRole(userId) {
      const u = users.get(userId);
      if (!u) return null;
      if (u.role === 'ADMIN' && [...users.values()].filter((user) => user.role === 'ADMIN').length <= 1) {
        throw new LastAdminError();
      }
      u.role = u.role === 'ADMIN' ? 'STUDENT' : 'ADMIN';
      return { ...u };
    },
    async deleteById(userId) {
      userId = userId.toLowerCase();
      const u = users.get(userId);
      if (u?.role === 'ADMIN' && [...users.values()].filter((user) => user.role === 'ADMIN').length <= 1) {
        throw new LastAdminError();
      }
      return users.delete(userId);
    },
  };
  return { repo, users };
}

export interface HttpResult {
  status: number;
  headers: Headers;
  body: any;
  text: string;
}

/** Starts the app on a random port and returns a tiny client; call close() when done. */
export async function startApp(app: Express) {
  const server = app.listen(0);
  await new Promise<void>((resolve) => server.once('listening', resolve));
  const { port } = server.address() as AddressInfo;
  const base = `http://127.0.0.1:${port}`;

  async function call(
    method: string,
    path: string,
    options: { body?: unknown; rawBody?: string; token?: string; cookie?: string; headers?: Record<string, string> } = {},
  ): Promise<HttpResult> {
    const headers: Record<string, string> = { ...(options.headers ?? {}) };
    let body: string | undefined;
    if (options.rawBody !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = options.rawBody;
    } else if (options.body !== undefined) {
      headers['Content-Type'] = 'application/json';
      body = JSON.stringify(options.body);
    }
    if (options.token) headers.Authorization = `Bearer ${options.token}`;
    if (options.cookie) headers.Cookie = options.cookie;
    const res = await fetch(base + path, { method, headers, body, redirect: 'manual' });
    const text = await res.text();
    let json: any = null;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      json = null;
    }
    return { status: res.status, headers: res.headers, body: json, text };
  }

  return {
    call,
    close: () => new Promise<void>((resolve) => server.close(() => resolve())),
  };
}

/** The value of a named cookie from a Set-Cookie header, or undefined. */
export function cookieValue(setCookie: string | null, name: string): string | undefined {
  if (!setCookie) return undefined;
  const match = setCookie.match(new RegExp(`(?:^|,\\s*)${name}=([^;]*)`));
  return match ? decodeURIComponent(match[1]) : undefined;
}
