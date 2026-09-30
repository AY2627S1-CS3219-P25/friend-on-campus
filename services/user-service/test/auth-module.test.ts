/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
 * Scope: Unit tests for src/auth/auth-module.ts against an in-memory repository and a fake token manager:
 * registration validation and duplicate mapping, login and the dummy-hash path, refresh rotation and replay,
 * keep-me-logged-in lifetimes, logout.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { AuthError, createAuthModule } from '../src/auth/auth-module';
import { hashPassword, verifyPassword } from '../src/auth/password';
import { makeFakeAuthRepository, makeFakeTokens, makeUser } from './helpers';

const LIFETIMES = {
  accessTokenLifetimeSeconds: 900,
  refreshTokenIdleLifetimeSeconds: 86_400,
  persistentRefreshTokenIdleLifetimeSeconds: 30 * 86_400,
};

async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof AuthError, `expected AuthError, got ${String(error)}`);
    assert.equal(error.code, code);
    return true;
  });
}

describe('register', () => {
  let fake = makeFakeAuthRepository();
  let auth = createAuthModule({ repository: fake.repo, tokens: makeFakeTokens(), ...LIFETIMES });
  beforeEach(() => {
    fake = makeFakeAuthRepository();
    auth = createAuthModule({ repository: fake.repo, tokens: makeFakeTokens(), ...LIFETIMES });
  });

  it('creates a STUDENT, trims the username, normalises the email and stores a scrypt hash', async () => {
    const user = await auth.register({ username: '  alice ', email: ' Alice@U.NUS.EDU ', password: 'Password123!' });
    assert.equal(user.username, 'alice');
    assert.equal(user.email, 'alice@u.nus.edu');
    assert.equal(user.userRole, 'STUDENT');
    assert.equal(user.status, true);
    assert.equal('passwordHash' in user, false, 'DTO never carries the hash');
    const stored = [...fake.users.values()][0];
    assert.notEqual(stored.passwordHash, 'Password123!');
    assert.equal(await verifyPassword('Password123!', stored.passwordHash), true);
  });

  it('rejects invalid input before touching the repository', async () => {
    await rejects(auth.register({ username: '', email: 'a@b.co', password: 'Password123!' }), 'INVALID_INPUT');
    await rejects(auth.register({ username: 'x'.repeat(51), email: 'a@b.co', password: 'Password123!' }), 'INVALID_INPUT');
    await rejects(auth.register({ username: 'alice', email: 'not-an-email', password: 'Password123!' }), 'INVALID_INPUT');
    await rejects(auth.register({ username: 'alice', email: 'a@b.co', password: 'short' }), 'INVALID_INPUT');
    await rejects(auth.register({ username: 'alice', email: 'a@b.co', password: 'x'.repeat(25) }), 'INVALID_INPUT');
    await rejects(auth.register(undefined as any), 'INVALID_INPUT');
    assert.equal(fake.calls.length, 0);
  });

  it('maps a duplicate email (Prisma P2002) to DUPLICATE_EMAIL, ignoring case', async () => {
    await auth.register({ username: 'alice', email: 'alice@u.nus.edu', password: 'Password123!' });
    await rejects(auth.register({ username: 'alice2', email: 'ALICE@u.nus.edu', password: 'Password123!' }), 'DUPLICATE_EMAIL');
  });

  it('maps a duplicate username (Postgres 23505 with the constraint name) to DUPLICATE_USERNAME', async () => {
    await auth.register({ username: 'alice', email: 'alice@u.nus.edu', password: 'Password123!' });
    await rejects(auth.register({ username: 'Alice', email: 'other@u.nus.edu', password: 'Password123!' }), 'DUPLICATE_USERNAME');
  });

  it('rethrows repository errors that are not uniqueness violations', async () => {
    fake.repo.createUser = async () => {
      throw new Error('connection refused');
    };
    await assert.rejects(
      auth.register({ username: 'alice', email: 'alice@u.nus.edu', password: 'Password123!' }),
      /connection refused/,
    );
  });
});

describe('login', () => {
  let fake = makeFakeAuthRepository();
  let tokens = makeFakeTokens();
  let auth = createAuthModule({ repository: fake.repo, tokens, ...LIFETIMES });
  beforeEach(async () => {
    fake = makeFakeAuthRepository([makeUser({ passwordHash: await hashPassword('Password123!') })]);
    tokens = makeFakeTokens();
    auth = createAuthModule({ repository: fake.repo, tokens, ...LIFETIMES });
  });

  it('returns an access token, a refresh token and the user on correct credentials', async () => {
    const result = await auth.login({ email: 'alice@u.nus.edu', password: 'Password123!' });
    assert.equal(result.user.username, 'alice');
    assert.equal(result.accessTokenExpiresInSeconds, 900);
    assert.equal(result.refreshToken, 'refresh-1');
    assert.deepEqual(tokens.issued, [{ userId: makeUser().id, sessionId: 'session-1', role: 'STUDENT' }]);
    const stored = fake.sessions.get(tokens.hashRefreshToken('refresh-1'));
    assert.ok(stored, 'session stored under the hash, not the raw token');
    assert.equal(stored.persistent, false);
  });

  it('matches the email ignoring case and surrounding whitespace', async () => {
    const result = await auth.login({ email: '  ALICE@u.nus.edu ', password: 'Password123!' });
    assert.equal(result.user.email, 'alice@u.nus.edu');
  });

  it('rejects a wrong password and an unknown email with the same code', async () => {
    await rejects(auth.login({ email: 'alice@u.nus.edu', password: 'Password123?' }), 'INVALID_CREDENTIALS');
    await rejects(auth.login({ email: 'nobody@u.nus.edu', password: 'Password123!' }), 'INVALID_CREDENTIALS');
    assert.equal(fake.sessions.size, 0, 'no session on failure');
  });

  it('rejects malformed input as INVALID_INPUT, not INVALID_CREDENTIALS', async () => {
    await rejects(auth.login({ email: 'alice', password: 'Password123!' }), 'INVALID_INPUT');
    await rejects(auth.login({ email: 'alice@u.nus.edu', password: 'short' }), 'INVALID_INPUT');
    await rejects(auth.login(undefined as any), 'INVALID_INPUT');
  });

  it('uses the standard idle lifetime by default and the persistent one with keepLoggedIn: true', async () => {
    const start = Date.now();
    const standard = await auth.login({ email: 'alice@u.nus.edu', password: 'Password123!' });
    const persistent = await auth.login({ email: 'alice@u.nus.edu', password: 'Password123!', keepLoggedIn: true });
    const notQuite = await auth.login({ email: 'alice@u.nus.edu', password: 'Password123!', keepLoggedIn: 'true' as any });

    const days = (d: Date) => Math.round((d.getTime() - start) / 86_400_000);
    assert.equal(days(standard.refreshTokenExpiresAt), 1);
    assert.equal(days(persistent.refreshTokenExpiresAt), 30);
    assert.equal(days(notQuite.refreshTokenExpiresAt), 1, 'only the boolean true is persistent');
    assert.equal(fake.sessions.get(tokens.hashRefreshToken(persistent.refreshToken))?.persistent, true);
  });

  it('purges expired sessions on every login', async () => {
    await auth.login({ email: 'alice@u.nus.edu', password: 'Password123!' });
    assert.ok(fake.calls.indexOf('cleanupExpiredSessions') < fake.calls.indexOf('findUserByEmail'));
  });
});

describe('refresh', () => {
  let fake = makeFakeAuthRepository();
  let tokens = makeFakeTokens();
  let auth = createAuthModule({ repository: fake.repo, tokens, ...LIFETIMES });
  beforeEach(async () => {
    fake = makeFakeAuthRepository([makeUser({ passwordHash: await hashPassword('Password123!') })]);
    tokens = makeFakeTokens();
    auth = createAuthModule({ repository: fake.repo, tokens, ...LIFETIMES });
  });

  it('rotates the refresh token and issues a new access token for the same session', async () => {
    const login = await auth.login({ email: 'alice@u.nus.edu', password: 'Password123!' });
    const refreshed = await auth.refresh(login.refreshToken);
    assert.equal(refreshed.refreshToken, 'refresh-2');
    assert.equal(refreshed.accessTokenExpiresInSeconds, 900);
    assert.equal(tokens.issued[1].sessionId, tokens.issued[0].sessionId, 'same session id');
    assert.equal(fake.sessions.has(tokens.hashRefreshToken(login.refreshToken)), false, 'old hash gone');
    assert.ok(fake.sessions.has(tokens.hashRefreshToken('refresh-2')));
  });

  it('refuses a replayed (already rotated) token without revoking the live session', async () => {
    const login = await auth.login({ email: 'alice@u.nus.edu', password: 'Password123!' });
    const refreshed = await auth.refresh(login.refreshToken);
    await rejects(auth.refresh(login.refreshToken), 'INVALID_SESSION');
    const again = await auth.refresh(refreshed.refreshToken);
    // A token is generated before the rotation is attempted, so the failed replay consumed 'refresh-3'.
    assert.equal(again.refreshToken, 'refresh-4', 'the current token still works after the replay');
  });

  it('refuses an empty, non-string or unknown token', async () => {
    await rejects(auth.refresh(''), 'INVALID_SESSION');
    await rejects(auth.refresh(undefined as any), 'INVALID_SESSION');
    await rejects(auth.refresh('never-issued'), 'INVALID_SESSION');
  });

  it('refuses a session whose idle expiry has passed', async () => {
    const login = await auth.login({ email: 'alice@u.nus.edu', password: 'Password123!' });
    const stored = fake.sessions.get(tokens.hashRefreshToken(login.refreshToken))!;
    stored.idleExpiresAt = new Date(Date.now() - 1000);
    await rejects(auth.refresh(login.refreshToken), 'INVALID_SESSION');
  });

  it('keeps the persistent lifetime across rotations', async () => {
    const login = await auth.login({ email: 'alice@u.nus.edu', password: 'Password123!', keepLoggedIn: true });
    const refreshed = await auth.refresh(login.refreshToken);
    const days = Math.round((refreshed.refreshTokenExpiresAt.getTime() - Date.now()) / 86_400_000);
    assert.equal(days, 30);
  });

  it('issues the new access token with the user\'s current role, not the role at login', async () => {
    const login = await auth.login({ email: 'alice@u.nus.edu', password: 'Password123!' });
    fake.users.get(makeUser().id)!.role = 'ADMIN';
    await auth.refresh(login.refreshToken);
    assert.equal(tokens.issued.at(-1)?.role, 'ADMIN');
  });
});

describe('logout', () => {
  it('revokes the session for the given token and ignores empty tokens', async () => {
    const fake = makeFakeAuthRepository([makeUser({ passwordHash: await hashPassword('Password123!') })]);
    const tokens = makeFakeTokens();
    const auth = createAuthModule({ repository: fake.repo, tokens, ...LIFETIMES });
    const login = await auth.login({ email: 'alice@u.nus.edu', password: 'Password123!' });

    await auth.logout('');
    await auth.logout(undefined as any);
    assert.equal(fake.calls.includes('revokeSession'), false);

    await auth.logout(login.refreshToken);
    assert.equal(fake.sessions.size, 0);
    await rejects(auth.refresh(login.refreshToken), 'INVALID_SESSION');
  });
});
