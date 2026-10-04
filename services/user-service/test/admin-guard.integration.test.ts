/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-04
 * Scope: Added PostgreSQL tests for the last-enabled-admin disable guard (UAT A8) and for refresh being refused
 * for a disabled account (A11).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Codex (model: GPT-6), date: 2026-09-30
 * Scope: PostgreSQL integration tests for concurrent admin removal and self-deletion session cleanup.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
// Opt in with ADMIN_GUARD_TEST_DATABASE_URL pointing to a disposable PostgreSQL database.
// Creates and removes its own random schema; never modifies existing application tables.
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { authMiddleware, requireAdmin } from '@campus-errand/auth';
import { PrismaClient } from '../src/database/generated/client';
import { createApp } from '../src/app';
import { createAuthModule } from '../src/auth/auth-module';
import { createTokenManager } from '../src/auth/tokens';
import { createAuthRepository } from '../src/persistence/auth-repository';
import { createDatabase } from '../src/persistence/database';
import { createUserRepository } from '../src/persistence/user-repository';
import { createUserModule } from '../src/users/user-module';
import { makeKeyPair, makeUser, startApp } from './helpers';

const databaseUrl = process.env.ADMIN_GUARD_TEST_DATABASE_URL;

describe('atomic admin guards (PostgreSQL)', { skip: !databaseUrl }, () => {
  const schema = `admin_guard_${randomUUID().replaceAll('-', '')}`;
  const adminA = randomUUID();
  const adminB = randomUUID();
  const student = randomUUID();
  const keys = makeKeyPair();
  const tokens = createTokenManager({
    accessTokenPrivateKey: keys.privateKey,
    accessTokenLifetimeSeconds: 900,
    accessTokenIssuer: 'admin-guard-test',
    accessTokenAudience: 'admin-guard-test',
  });
  const databases: PrismaClient[] = [];
  const clients: Awaited<ReturnType<typeof startApp>>[] = [];
  const tokenFor = (id: string) => tokens.issueAccessToken(id, randomUUID(), id === student ? 'STUDENT' : 'ADMIN');

  before(async () => {
    const url = new URL(databaseUrl!);
    url.searchParams.set('schema', schema);
    for (let i = 0; i < 2; i++) databases.push(new PrismaClient({ datasources: { db: { url: url.toString() } } }));
    await databases[0].$executeRawUnsafe(`CREATE SCHEMA "${schema}"`);
    const migrations = path.resolve(__dirname, '../src/database/prisma/migrations');
    for (const dir of (await readdir(migrations, { withFileTypes: true })).filter((entry) => entry.isDirectory()).sort((a, b) => a.name.localeCompare(b.name))) {
      const sql = await readFile(path.join(migrations, dir.name, 'migration.sql'), 'utf8');
      for (const statement of sql.split(';').filter((part) => part.trim())) {
        await databases[0].$executeRawUnsafe(statement);
      }
    }
    // Separate application instances and Prisma pools exercise the shared database lock.
    for (const db of databases) {
      clients.push(await startApp(createApp({
        auth: createAuthModule({
          repository: createAuthRepository(db), tokens,
          accessTokenLifetimeSeconds: 900,
          refreshTokenIdleLifetimeSeconds: 86_400,
          persistentRefreshTokenIdleLifetimeSeconds: 30 * 86_400,
        }),
        users: createUserModule({ repository: createUserRepository(db) }),
        requireAuthentication: authMiddleware({ publicKey: keys.publicKey, issuer: 'admin-guard-test', audience: 'admin-guard-test' }),
        requireAdmin,
        database: createDatabase(db),
        corsOrigin: 'http://localhost', secureCookies: true,
      })));
    }
  });

  beforeEach(async () => {
    await databases[0].user.deleteMany();
    await databases[0].user.createMany({ data: [
      makeUser({ id: adminA, username: 'admin-a', email: 'admin-a@nus.edu.sg', role: 'ADMIN' }),
      makeUser({ id: adminB, username: 'admin-b', email: 'admin-b@nus.edu.sg', role: 'ADMIN' }),
      makeUser({ id: student, username: 'student', email: 'student@u.nus.edu' }),
    ] });
  });

  after(async () => {
    await Promise.all(clients.map((client) => client.close()));
    try {
      if (databases[0]) await databases[0].$executeRawUnsafe(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
    } finally {
      await Promise.all(databases.map((db) => db.$disconnect()));
    }
  });

  for (const operations of [['demote', 'demote'], ['delete', 'delete'], ['demote', 'delete']]) {
    it(`preserves one admin when two instances race to ${operations.join(' / ')}`, async () => {
      const results = await Promise.all(operations.map((operation, i) => clients[i].call(
        operation === 'demote' ? 'PATCH' : 'DELETE',
        `/api/users/${i === 0 ? adminB : adminA}${operation === 'demote' ? '/toggle-role' : ''}`,
        { token: tokenFor(i === 0 ? adminA : adminB) },
      )));
      assert.equal(results.filter((result) => result.status === 200 || result.status === 204).length, 1);
      const rejected = results.find((result) => result.status === 409);
      assert.equal(rejected?.body.code, 'LAST_ADMIN_REQUIRED');
      assert.equal(await databases[0].user.count({ where: { role: 'ADMIN' } }), 1);
    });
  }

  it('refuses last-admin deletion without removing its sessions or clearing its cookie', async () => {
    await databases[0].user.delete({ where: { id: adminB } });
    await databases[0].session.create({ data: {
      userId: adminA, refreshTokenHash: tokens.hashRefreshToken('last-admin-session'),
      idleExpiresAt: new Date(Date.now() + 86_400_000),
    } });
    const res = await clients[0].call('DELETE', `/api/users/${adminA.toUpperCase()}`, { token: tokenFor(adminA) });
    assert.equal(res.status, 409);
    assert.equal(res.body.code, 'LAST_ADMIN_REQUIRED');
    assert.equal(res.headers.get('set-cookie'), null);
    assert.equal(await databases[0].session.count({ where: { userId: adminA } }), 1);
  });

  // AI-generated (edited by Reallyeasy1)
  it('keeps one enabled admin when two instances race to disable each other', async () => {
    const results = await Promise.all([0, 1].map((i) => clients[i].call(
      'PATCH', `/api/users/${i === 0 ? adminB : adminA}/toggle-status`, { token: tokenFor(i === 0 ? adminA : adminB) },
    )));
    assert.equal(results.filter((result) => result.status === 200).length, 1);
    assert.equal(results.find((result) => result.status === 409)?.body.code, 'LAST_ADMIN_REQUIRED');
    assert.equal(await databases[0].user.count({ where: { role: 'ADMIN', status: true } }), 1);
  });

  it('refuses the last enabled admin disabling itself, and still lets it disable a student', async () => {
    await databases[0].user.update({ where: { id: adminB }, data: { status: false } });
    const self = await clients[0].call('PATCH', `/api/users/${adminA}/toggle-status`, { token: tokenFor(adminA) });
    assert.equal(self.status, 409);
    assert.equal(self.body.code, 'LAST_ADMIN_REQUIRED');
    const other = await clients[0].call('PATCH', `/api/users/${student}/toggle-status`, { token: tokenFor(adminA) });
    assert.equal(other.body.data.user.status, false);
    assert.equal((await databases[0].user.findUnique({ where: { id: adminA } }))?.status, true);
  });

  it('refuses refresh for a disabled account without rotating or revoking its session', async () => {
    const refreshToken = tokens.generateRefreshToken();
    await databases[0].session.create({ data: {
      userId: student, refreshTokenHash: tokens.hashRefreshToken(refreshToken),
      idleExpiresAt: new Date(Date.now() + 86_400_000),
    } });
    await databases[0].user.update({ where: { id: student }, data: { status: false } });
    const refused = await clients[0].call('POST', '/api/auth/refresh', { cookie: `refresh_token=${refreshToken}` });
    assert.equal(refused.status, 401);
    assert.equal(refused.body.code, 'INVALID_SESSION');
    await databases[0].user.update({ where: { id: student }, data: { status: true } });
    const restored = await clients[0].call('POST', '/api/auth/refresh', { cookie: `refresh_token=${refreshToken}` });
    assert.equal(restored.status, 200);
  });

  for (const role of ['student', 'admin']) {
    it(`clears the cookie and revokes all sessions after ${role} self-deletion`, async () => {
      const id = role === 'student' ? student : adminA;
      const refreshToken = tokens.generateRefreshToken();
      await databases[0].session.createMany({ data: [refreshToken, tokens.generateRefreshToken()].map((value) => ({
        userId: id, refreshTokenHash: tokens.hashRefreshToken(value), idleExpiresAt: new Date(Date.now() + 86_400_000),
      })) });
      const res = await clients[0].call('DELETE', `/api/users/${id.toUpperCase()}`, { token: tokenFor(id) });
      assert.equal(res.status, 204);
      assert.match(res.headers.get('set-cookie')!, /refresh_token=;.*Path=\/api\/auth;.*Expires=Thu, 01 Jan 1970.*HttpOnly; Secure; SameSite=Lax/);
      assert.equal(await databases[0].session.count({ where: { userId: id } }), 0);
      const refresh = await clients[0].call('POST', '/api/auth/refresh', { cookie: `refresh_token=${refreshToken}` });
      assert.equal(refresh.status, 401);
      assert.equal(await databases[0].user.count({ where: { role: 'ADMIN' } }), role === 'student' ? 2 : 1);
    });
  }
});
