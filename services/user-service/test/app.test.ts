/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
 * Scope: HTTP tests for the assembled user-service app (src/app.ts with the real routers, error handler and
 * @campus-errand/auth middleware) over in-memory repositories: health and readiness, body parsing errors, the
 * auth routes and their cookies, token errors, RBAC on the admin routes, the self-target rules, error bodies.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { authMiddleware, requireAdmin } from '@campus-errand/auth';
import { createApp } from '../src/app';
import { createAuthModule } from '../src/auth/auth-module';
import { hashPassword } from '../src/auth/password';
import { createTokenManager } from '../src/auth/tokens';
import { createUserModule } from '../src/users/user-module';
import {
  cookieValue,
  makeFakeAuthRepository,
  makeFakeUserRepository,
  makeKeyPair,
  makeUser,
  startApp,
} from './helpers';

const keys = makeKeyPair();
const ISSUER = 'test-issuer';
const AUDIENCE = 'test-audience';
const ALICE_ID = '11111111-1111-4111-8111-111111111111';
const BOB_ID = '33333333-3333-4333-8333-333333333333';
const ADMIN_ID = '22222222-2222-4222-8222-222222222222';
const UNKNOWN_ID = '00000000-0000-4000-8000-000000000000';

describe('user-service app', () => {
  let client: Awaited<ReturnType<typeof startApp>>;
  let databaseReady = true;
  let issueToken: (userId: string, role: 'STUDENT' | 'ADMIN', overrides?: Partial<{ exp: number; iss: string }>) => string;
  let tokens: ReturnType<typeof createTokenManager>;

  before(async () => {
    const passwordHash = await hashPassword('Password123!');
    const seed = [
      makeUser({ id: ALICE_ID, username: 'alice', email: 'alice@u.nus.edu', passwordHash }),
      makeUser({ id: BOB_ID, username: 'bob', email: 'bob@u.nus.edu', passwordHash }),
      makeUser({ id: ADMIN_ID, username: 'admin', email: 'admin@nus.edu.sg', role: 'ADMIN', passwordHash }),
    ];
    const authRepo = makeFakeAuthRepository(seed);
    const userRepo = makeFakeUserRepository(seed, authRepo.users);
    tokens = createTokenManager({
      accessTokenPrivateKey: keys.privateKey,
      accessTokenLifetimeSeconds: 900,
      accessTokenIssuer: ISSUER,
      accessTokenAudience: AUDIENCE,
    });
    issueToken = (userId, role, overrides = {}) => {
      // Re-sign with custom claims for the expiry / issuer cases.
      if (Object.keys(overrides).length === 0) return tokens.issueAccessToken(userId, 'sid-1', role);
      const manager = createTokenManager({
        accessTokenPrivateKey: keys.privateKey,
        accessTokenLifetimeSeconds: overrides.exp ?? 900,
        accessTokenIssuer: overrides.iss ?? ISSUER,
        accessTokenAudience: AUDIENCE,
      });
      return manager.issueAccessToken(userId, 'sid-1', role);
    };

    const app = createApp({
      auth: createAuthModule({
        repository: authRepo.repo,
        tokens,
        accessTokenLifetimeSeconds: 900,
        refreshTokenIdleLifetimeSeconds: 86_400,
        persistentRefreshTokenIdleLifetimeSeconds: 30 * 86_400,
      }),
      users: createUserModule({ repository: userRepo.repo }),
      requireAuthentication: authMiddleware({ publicKey: keys.publicKey, issuer: ISSUER, audience: AUDIENCE }),
      requireAdmin,
      database: { isReady: async () => databaseReady } as any,
      corsOrigin: 'http://localhost:5173',
      secureCookies: false,
    });
    client = await startApp(app);
  });

  after(async () => {
    await client.close();
  });

  describe('service endpoints', () => {
    it('GET /health is UP without touching the database', async () => {
      const res = await client.call('GET', '/health');
      assert.equal(res.status, 200);
      assert.deepEqual(res.body, { service: 'user-service', status: 'UP' });
    });

    it('GET /ready reports the database state with 200 or 503', async () => {
      let res = await client.call('GET', '/ready');
      assert.equal(res.status, 200);
      assert.equal(res.body.dependencies.database, 'UP');
      databaseReady = false;
      res = await client.call('GET', '/ready');
      assert.equal(res.status, 503);
      assert.equal(res.body.status, 'NOT_READY');
      databaseReady = true;
    });

    it('an unknown route is a JSON 404; under /api/users the token check comes first', async () => {
      const res = await client.call('GET', '/nope');
      assert.equal(res.status, 404);
      assert.deepEqual(res.body, { success: false, error: 'Route not found' });
      const noToken = await client.call('GET', '/api/users/' + ALICE_ID);
      assert.equal(noToken.status, 401, 'router-level authentication runs before route matching');
      const withToken = await client.call('GET', '/api/users/' + ALICE_ID, { token: issueToken(ALICE_ID, 'STUDENT') });
      assert.equal(withToken.status, 404, 'there is no GET /api/users/:id');
    });

    it('a malformed JSON body is 400 INVALID_JSON', async () => {
      const res = await client.call('POST', '/api/auth/login', { rawBody: '{"email": ' });
      assert.equal(res.status, 400);
      assert.equal(res.body.code, 'INVALID_JSON');
    });
  });

  describe('registration and login', () => {
    it('registers a STUDENT and returns 201 without any password material', async () => {
      const res = await client.call('POST', '/api/auth/register', {
        body: { username: 'carol', email: 'Carol@U.NUS.EDU', password: 'Password123!' },
      });
      assert.equal(res.status, 201);
      assert.equal(res.body.data.user.userRole, 'STUDENT');
      assert.equal(res.body.data.user.email, 'carol@u.nus.edu');
      assert.equal(res.text.includes('Password123!'), false);
      assert.equal(res.text.includes('passwordHash'), false);
      assert.equal(res.headers.get('set-cookie'), null, 'registration creates no session');
    });

    it('maps validation and duplicate errors to 400 and 409 with a code', async () => {
      const bad = await client.call('POST', '/api/auth/register', { body: { username: 'x', email: 'nope', password: 'Password123!' } });
      assert.equal(bad.status, 400);
      assert.equal(bad.body.code, 'INVALID_INPUT');
      const dup = await client.call('POST', '/api/auth/register', { body: { username: 'alice', email: 'new@u.nus.edu', password: 'Password123!' } });
      assert.equal(dup.status, 409);
      assert.equal(dup.body.code, 'DUPLICATE_USERNAME');
      const dupEmail = await client.call('POST', '/api/auth/register', { body: { username: 'zed', email: 'ALICE@u.nus.edu', password: 'Password123!' } });
      assert.equal(dupEmail.status, 409);
      assert.equal(dupEmail.body.code, 'DUPLICATE_EMAIL');
    });

    it('login returns the access token in the body and the refresh token only in an HttpOnly cookie', async () => {
      const res = await client.call('POST', '/api/auth/login', { body: { email: 'alice@u.nus.edu', password: 'Password123!' } });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.accessTokenExpiresInSeconds, 900);
      assert.equal(res.body.data.user.username, 'alice');
      assert.equal(typeof res.body.data.accessToken, 'string');
      assert.equal('refreshToken' in res.body.data, false, 'refresh token not in the body');
      const setCookie = res.headers.get('set-cookie') ?? '';
      assert.match(setCookie, /refresh_token=/);
      assert.match(setCookie, /HttpOnly/);
      assert.match(setCookie, /Path=\/api\/auth/);
      assert.match(setCookie, /SameSite=Lax/);
      assert.match(setCookie, /Expires=/);
      assert.doesNotMatch(setCookie, /Secure/, 'secureCookies: false');
    });

    it('login fails with 401 INVALID_CREDENTIALS for a wrong password and 400 for bad input', async () => {
      const wrong = await client.call('POST', '/api/auth/login', { body: { email: 'alice@u.nus.edu', password: 'Password123?' } });
      assert.equal(wrong.status, 401);
      assert.equal(wrong.body.code, 'INVALID_CREDENTIALS');
      assert.equal(wrong.headers.get('set-cookie'), null);
      const bad = await client.call('POST', '/api/auth/login', { body: { email: 'alice' } });
      assert.equal(bad.status, 400);
      assert.equal(bad.body.code, 'INVALID_INPUT');
    });

    it('keepLoggedIn: true gives a cookie that expires about 30 days out instead of 1', async () => {
      const short = await client.call('POST', '/api/auth/login', { body: { email: 'alice@u.nus.edu', password: 'Password123!' } });
      const long = await client.call('POST', '/api/auth/login', { body: { email: 'alice@u.nus.edu', password: 'Password123!', keepLoggedIn: true } });
      const days = (h: string | null) => Math.round((new Date(h!.match(/Expires=([^;]+)/)![1]).getTime() - Date.now()) / 86_400_000);
      assert.equal(days(short.headers.get('set-cookie')), 1);
      assert.equal(days(long.headers.get('set-cookie')), 30);
    });
  });

  describe('refresh and logout', () => {
    it('refresh reads the cookie, rotates it and returns a new access token', async () => {
      const login = await client.call('POST', '/api/auth/login', { body: { email: 'alice@u.nus.edu', password: 'Password123!' } });
      const first = cookieValue(login.headers.get('set-cookie'), 'refresh_token')!;
      const refreshed = await client.call('POST', '/api/auth/refresh', { cookie: `refresh_token=${first}` });
      assert.equal(refreshed.status, 200);
      assert.equal(typeof refreshed.body.data.accessToken, 'string');
      const second = cookieValue(refreshed.headers.get('set-cookie'), 'refresh_token')!;
      assert.ok(second && second !== first, 'cookie rotated');

      const replay = await client.call('POST', '/api/auth/refresh', { cookie: `refresh_token=${first}` });
      assert.equal(replay.status, 401);
      assert.equal(replay.body.code, 'INVALID_SESSION');

      const stillValid = await client.call('POST', '/api/auth/refresh', { cookie: `refresh_token=${second}` });
      assert.equal(stillValid.status, 200, 'replay did not revoke the live session');
    });

    it('refresh falls back to refreshToken in the body and rejects a missing token', async () => {
      const login = await client.call('POST', '/api/auth/login', { body: { email: 'bob@u.nus.edu', password: 'Password123!' } });
      const token = cookieValue(login.headers.get('set-cookie'), 'refresh_token')!;
      const viaBody = await client.call('POST', '/api/auth/refresh', { body: { refreshToken: token } });
      assert.equal(viaBody.status, 200);
      const none = await client.call('POST', '/api/auth/refresh');
      assert.equal(none.status, 401);
      assert.equal(none.body.code, 'INVALID_SESSION');
    });

    it('the cookie is read even when other cookies are present', async () => {
      const login = await client.call('POST', '/api/auth/login', { body: { email: 'bob@u.nus.edu', password: 'Password123!' } });
      const token = cookieValue(login.headers.get('set-cookie'), 'refresh_token')!;
      const res = await client.call('POST', '/api/auth/refresh', { cookie: `theme=dark; refresh_token=${token}; other=1` });
      assert.equal(res.status, 200);
    });

    it('logout is 204, clears the cookie and kills the session; a second logout is harmless', async () => {
      const login = await client.call('POST', '/api/auth/login', { body: { email: 'bob@u.nus.edu', password: 'Password123!' } });
      const token = cookieValue(login.headers.get('set-cookie'), 'refresh_token')!;
      const out = await client.call('POST', '/api/auth/logout', { cookie: `refresh_token=${token}` });
      assert.equal(out.status, 204);
      assert.match(out.headers.get('set-cookie') ?? '', /refresh_token=;/);
      const after = await client.call('POST', '/api/auth/refresh', { cookie: `refresh_token=${token}` });
      assert.equal(after.status, 401);
      const again = await client.call('POST', '/api/auth/logout', { cookie: `refresh_token=${token}` });
      assert.equal(again.status, 204);
      const noCookie = await client.call('POST', '/api/auth/logout');
      assert.equal(noCookie.status, 204);
    });
  });

  describe('access-token checks on /api/users', () => {
    it('no token -> 401 MISSING_TOKEN', async () => {
      const res = await client.call('GET', '/api/users/me');
      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'MISSING_TOKEN');
    });

    it('a non-Bearer scheme counts as no token -> 401 MISSING_TOKEN', async () => {
      const res = await client.call('GET', '/api/users/me', { headers: { Authorization: `Basic ${issueToken(ALICE_ID, 'STUDENT')}` } });
      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'MISSING_TOKEN');
    });

    it('garbage, tampered and wrong-issuer tokens -> 401 INVALID_TOKEN', async () => {
      const good = issueToken(ALICE_ID, 'STUDENT');
      for (const headers of [
        { Authorization: 'Bearer not-a-jwt' },
        { Authorization: `Bearer ${good.slice(0, -4)}AAAA` },
        { Authorization: `Bearer ${issueToken(ALICE_ID, 'STUDENT', { iss: 'someone-else' })}` },
      ]) {
        const res = await client.call('GET', '/api/users/me', { headers });
        assert.equal(res.status, 401, JSON.stringify(headers));
        assert.equal(res.body.code, 'INVALID_TOKEN');
      }
    });

    it('a token signed by another key -> 401 INVALID_TOKEN', async () => {
      const other = createTokenManager({
        accessTokenPrivateKey: makeKeyPair().privateKey,
        accessTokenLifetimeSeconds: 900,
        accessTokenIssuer: ISSUER,
        accessTokenAudience: AUDIENCE,
      });
      const res = await client.call('GET', '/api/users/me', { token: other.issueAccessToken(ALICE_ID, 'sid', 'ADMIN') });
      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'INVALID_TOKEN');
    });

    it('an expired token -> 401 TOKEN_EXPIRED', async () => {
      const res = await client.call('GET', '/api/users/me', { token: issueToken(ALICE_ID, 'STUDENT', { exp: -10 }) });
      assert.equal(res.status, 401);
      assert.equal(res.body.code, 'TOKEN_EXPIRED');
    });

    it('a valid token reads the caller\'s own profile from the sub claim', async () => {
      const res = await client.call('GET', '/api/users/me', { token: issueToken(BOB_ID, 'STUDENT') });
      assert.equal(res.status, 200);
      assert.equal(res.body.data.user.userId, BOB_ID);
      assert.equal(res.body.data.user.username, 'bob');
    });

    it('a valid token for a deleted account -> 404 USER_NOT_FOUND', async () => {
      const res = await client.call('GET', '/api/users/me', { token: issueToken(UNKNOWN_ID, 'STUDENT') });
      assert.equal(res.status, 404);
      assert.equal(res.body.code, 'USER_NOT_FOUND');
    });
  });

  describe('profile routes', () => {
    it('PATCH /me changes the username only and rejects protected fields', async () => {
      const token = issueToken(BOB_ID, 'STUDENT');
      const ok = await client.call('PATCH', '/api/users/me', { token, body: { username: 'bobby' } });
      assert.equal(ok.status, 200);
      assert.equal(ok.body.data.user.username, 'bobby');
      for (const body of [{ role: 'ADMIN' }, { status: false }, { userId: ADMIN_ID }, { email: 'x@y.co' }, { username: 'b', role: 'ADMIN' }]) {
        const res = await client.call('PATCH', '/api/users/me', { token, body });
        assert.equal(res.status, 400, JSON.stringify(body));
        assert.equal(res.body.code, 'INVALID_INPUT');
      }
      const me = await client.call('GET', '/api/users/me', { token });
      assert.equal(me.body.data.user.userRole, 'STUDENT');
      assert.equal(me.body.data.user.email, 'bob@u.nus.edu');
      const taken = await client.call('PATCH', '/api/users/me', { token, body: { username: 'ALICE' } });
      assert.equal(taken.status, 409);
      assert.equal(taken.body.code, 'DUPLICATE_USERNAME');
    });

    it('PUT /me/password needs the current password and then the new one logs in', async () => {
      const token = issueToken(BOB_ID, 'STUDENT');
      const wrong = await client.call('PUT', '/api/users/me/password', { token, body: { currentPassword: 'nope', newPassword: 'NewPassword456!' } });
      assert.equal(wrong.status, 401);
      assert.equal(wrong.body.code, 'INVALID_CURRENT_PASSWORD');
      const ok = await client.call('PUT', '/api/users/me/password', { token, body: { currentPassword: 'Password123!', newPassword: 'NewPassword456!' } });
      assert.equal(ok.status, 204);
      const login = await client.call('POST', '/api/auth/login', { body: { email: 'bob@u.nus.edu', password: 'NewPassword456!' } });
      assert.equal(login.status, 200);
      // put it back for the other tests
      await client.call('PUT', '/api/users/me/password', { token, body: { currentPassword: 'NewPassword456!', newPassword: 'Password123!' } });
    });
  });

  describe('admin routes and RBAC', () => {
    it('GET /api/users is 403 ADMIN_REQUIRED for a STUDENT and 200 for an ADMIN', async () => {
      const student = await client.call('GET', '/api/users/', { token: issueToken(ALICE_ID, 'STUDENT') });
      assert.equal(student.status, 403);
      assert.equal(student.body.code, 'ADMIN_REQUIRED');
      const admin = await client.call('GET', '/api/users/', { token: issueToken(ADMIN_ID, 'ADMIN') });
      assert.equal(admin.status, 200);
      assert.ok(admin.body.data.users.length >= 3);
      assert.deepEqual(Object.keys(admin.body.data.users[0]).sort(), ['email', 'status', 'userId', 'userRole', 'username']);
    });

    it('the role is taken from the token, not from the database', async () => {
      // alice is a STUDENT in the store; a token claiming ADMIN gets admin access until it expires.
      const res = await client.call('GET', '/api/users/', { token: issueToken(ALICE_ID, 'ADMIN') });
      assert.equal(res.status, 200);
    });

    it('toggle-status flips status; unknown id 404; STUDENT 403', async () => {
      const admin = issueToken(ADMIN_ID, 'ADMIN');
      const off = await client.call('PATCH', `/api/users/${ALICE_ID}/toggle-status`, { token: admin });
      assert.equal(off.status, 200);
      assert.equal(off.body.data.user.status, false);
      const on = await client.call('PATCH', `/api/users/${ALICE_ID}/toggle-status`, { token: admin });
      assert.equal(on.body.data.user.status, true);
      const unknown = await client.call('PATCH', `/api/users/${UNKNOWN_ID}/toggle-status`, { token: admin });
      assert.equal(unknown.status, 404);
      assert.equal(unknown.body.code, 'USER_NOT_FOUND');
      const student = await client.call('PATCH', `/api/users/${ALICE_ID}/toggle-status`, { token: issueToken(BOB_ID, 'STUDENT') });
      assert.equal(student.status, 403);
    });

    it('toggle-role promotes and demotes, and refuses the caller\'s own id in any letter case', async () => {
      const admin = issueToken(ADMIN_ID, 'ADMIN');
      const up = await client.call('PATCH', `/api/users/${ALICE_ID}/toggle-role`, { token: admin });
      assert.equal(up.status, 200);
      assert.equal(up.body.data.user.userRole, 'ADMIN');
      const down = await client.call('PATCH', `/api/users/${ALICE_ID}/toggle-role`, { token: admin });
      assert.equal(down.body.data.user.userRole, 'STUDENT');

      const self = await client.call('PATCH', `/api/users/${ADMIN_ID}/toggle-role`, { token: admin });
      assert.equal(self.status, 403);
      assert.equal(self.body.code, 'SELF_ACTION_FORBIDDEN');
      const selfUpper = await client.call('PATCH', `/api/users/${ADMIN_ID.toUpperCase()}/toggle-role`, { token: admin });
      assert.equal(selfUpper.status, 403, 'upper-cased own id is still own id');
      assert.equal(selfUpper.body.code, 'SELF_ACTION_FORBIDDEN');
    });

    it('DELETE /:id: a student may delete only their own account, an admin any account', async () => {
      const bob = issueToken(BOB_ID, 'STUDENT');
      const other = await client.call('DELETE', `/api/users/${ALICE_ID}`, { token: bob });
      assert.equal(other.status, 403);
      assert.equal(other.body.code, 'FORBIDDEN');
      const otherUpper = await client.call('DELETE', `/api/users/${BOB_ID.toUpperCase()}`, { token: bob });
      assert.equal(otherUpper.status, 204, 'own id in upper case is accepted');
      const gone = await client.call('GET', '/api/users/me', { token: bob });
      assert.equal(gone.status, 404);

      const admin = issueToken(ADMIN_ID, 'ADMIN');
      const unknown = await client.call('DELETE', `/api/users/${UNKNOWN_ID}`, { token: admin });
      assert.equal(unknown.status, 404);
      const byAdmin = await client.call('DELETE', `/api/users/${ALICE_ID}`, { token: admin });
      assert.equal(byAdmin.status, 204);
    });

    it('nothing stops an admin deleting their own account (documented gap)', async () => {
      const admin = issueToken(ADMIN_ID, 'ADMIN');
      const res = await client.call('DELETE', `/api/users/${ADMIN_ID}`, { token: admin });
      assert.equal(res.status, 204);
    });
  });

  describe('unexpected errors', () => {
    it('are answered with 500, a generic message and a correlation id, never the stack', async () => {
      const failing = createApp({
        auth: { register: async () => { throw new Error('database exploded'); } } as any,
        users: {} as any,
        requireAuthentication: (_req, _res, next) => next(),
        requireAdmin,
        database: { isReady: async () => true } as any,
        corsOrigin: '*',
        secureCookies: false,
      });
      const failingClient = await startApp(failing);
      try {
        const res = await failingClient.call('POST', '/api/auth/register', { body: {} });
        assert.equal(res.status, 500);
        assert.equal(res.body.error, 'Internal server error');
        assert.match(res.body.errorId, /^[0-9a-f-]{36}$/);
        assert.equal(res.headers.get('x-error-id'), res.body.errorId);
        assert.equal(res.text.includes('exploded'), false);
      } finally {
        await failingClient.close();
      }
    });
  });
});
