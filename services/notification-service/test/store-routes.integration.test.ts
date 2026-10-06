/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: PostgreSQL tests for src/notifications/store.ts and the REST routes over it: the unique event id as the
 * duplicate guard, ordering by event time, the unread filter and count, ownership on list and mark-read, read-all.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
// Opt in with NOTIFICATION_TEST_DATABASE_URL pointing to any PostgreSQL database.
// Creates and removes its own random schema; never touches existing tables.
import { after, before, beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { authMiddleware } from '@campus-errand/auth';
import { createApp } from '../src/app';
import { createNotificationStore, type NewNotification, type NotificationStore } from '../src/notifications/store';
import { ALICE, AUDIENCE, BOB, ISSUER, makeKeys, makeTestDatabase, signToken } from './helpers';

const databaseUrl = process.env.NOTIFICATION_TEST_DATABASE_URL;

describe('notification store and routes (PostgreSQL)', { skip: !databaseUrl }, () => {
  const keys = makeKeys();
  let database: Awaited<ReturnType<typeof makeTestDatabase>>;
  let store: NotificationStore;
  let server: Server;
  let base: string;

  const row = (overrides: Partial<NewNotification> = {}): NewNotification => ({
    userId: ALICE,
    eventId: randomUUID(),
    kind: 'ORDER_ACCEPTED',
    orderId: randomUUID(),
    orderCode: 'ORD-0001',
    courierId: BOB,
    title: 'Your errand ORD-0001 was accepted',
    body: 'A courier has been assigned to your errand.',
    createdAt: '2026-10-05T04:00:00.000Z',
    ...overrides,
  });

  async function call(method: string, path: string, userId?: string) {
    const res = await fetch(base + path, {
      method,
      headers: userId ? { Authorization: `Bearer ${signToken(keys.privateKey, userId)}` } : {},
    });
    return { status: res.status, body: (await res.json()) as any };
  }

  before(async () => {
    database = await makeTestDatabase(databaseUrl!);
    store = createNotificationStore(database.db);
    const app = createApp({
      store,
      authenticate: authMiddleware({ publicKey: keys.publicKey, issuer: ISSUER, audience: AUDIENCE }),
      isReady: async () => true,
      port: 0,
    });
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(async () => {
    await database.db.notification.deleteMany();
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await database.drop();
  });

  describe('store', () => {
    it('inserting the same event id twice yields one row, and the second call returns null', async () => {
      const first = row();
      const saved = await store.insert(first);
      assert.equal(saved?.title, first.title);
      assert.equal(saved?.readAt, null);
      assert.equal(await store.insert({ ...first, title: 'changed on redelivery' }), null);
      assert.equal(await database.db.notification.count(), 1);
      assert.equal((await store.list(ALICE, { unreadOnly: false, page: 1, limit: 20 })).items[0].title, first.title);
    });

    it('stamps the row with the event time and lists newest first', async () => {
      await store.insert(row({ title: 'older', createdAt: '2026-10-05T04:00:00.000Z' }));
      await store.insert(row({ title: 'newest', createdAt: '2026-10-05T06:00:00.000Z' }));
      await store.insert(row({ title: 'middle', createdAt: '2026-10-05T05:00:00.000Z' }));
      const page = await store.list(ALICE, { unreadOnly: false, page: 1, limit: 2 });
      assert.deepEqual(page.items.map((n) => n.title), ['newest', 'middle']);
      assert.equal(page.items[0].createdAt, '2026-10-05T06:00:00.000Z');
      assert.deepEqual([page.total, page.page, page.limit, page.totalPages, page.unreadCount], [3, 1, 2, 2, 3]);
      const second = await store.list(ALICE, { unreadOnly: false, page: 2, limit: 2 });
      assert.deepEqual(second.items.map((n) => n.title), ['older']);
    });

    it('keeps optional fields null when the event did not carry them', async () => {
      const saved = await store.insert(row({ orderCode: null, courierId: null }));
      assert.equal(saved?.orderCode, null);
      assert.equal(saved?.courierId, null);
    });
  });

  describe('routes', () => {
    it('every route needs a token', async () => {
      assert.equal((await call('GET', '/api/notifications')).status, 401);
      assert.equal((await call('PATCH', `/api/notifications/${randomUUID()}/read`)).status, 401);
      assert.equal((await call('POST', '/api/notifications/read-all')).status, 401);
    });

    it('the list is scoped to the caller and carries the unread count', async () => {
      await store.insert(row({ title: 'for alice' }));
      await store.insert(row({ userId: BOB, title: 'for bob' }));
      const alice = await call('GET', '/api/notifications', ALICE);
      assert.equal(alice.status, 200);
      assert.equal(alice.body.success, true);
      assert.deepEqual(alice.body.data.items.map((n: any) => n.title), ['for alice']);
      assert.equal(alice.body.data.unreadCount, 1);
      assert.deepEqual(Object.keys(alice.body.data.items[0]).sort(),
        ['body', 'courierId', 'createdAt', 'id', 'kind', 'orderCode', 'orderId', 'readAt', 'title']);
      const nobody = await call('GET', '/api/notifications', '20000000-0000-4000-8000-00000000ffff');
      assert.deepEqual([nobody.body.data.items.length, nobody.body.data.total, nobody.body.data.totalPages], [0, 0, 0]);
    });

    it('PATCH /:id/read marks the caller\'s own row and is 404 for anyone else\'s, an unknown id or a non-UUID', async () => {
      const mine = (await store.insert(row()))!;
      const theirs = (await store.insert(row({ userId: BOB })))!;
      const read = await call('PATCH', `/api/notifications/${mine.id}/read`, ALICE);
      assert.equal(read.status, 200);
      assert.equal(typeof read.body.data.readAt, 'string');
      const again = await call('PATCH', `/api/notifications/${mine.id}/read`, ALICE);
      assert.equal(again.body.data.readAt, read.body.data.readAt, 'reading twice keeps the first read time');

      for (const id of [theirs.id, randomUUID(), 'not-a-uuid']) {
        const res = await call('PATCH', `/api/notifications/${id}/read`, ALICE);
        assert.equal(res.status, 404, id);
        assert.equal(res.body.code, 'NOTIFICATION_NOT_FOUND');
      }
      assert.equal((await store.list(BOB, { unreadOnly: true, page: 1, limit: 20 })).total, 1, 'bob\'s row is still unread');
    });

    it('unread=true lists only unread rows; read-all marks the caller\'s rows and reports how many', async () => {
      const one = (await store.insert(row({ title: 'one' })))!;
      await store.insert(row({ title: 'two' }));
      await store.insert(row({ userId: BOB }));
      await call('PATCH', `/api/notifications/${one.id}/read`, ALICE);
      const unread = await call('GET', '/api/notifications?unread=true', ALICE);
      assert.deepEqual(unread.body.data.items.map((n: any) => n.title), ['two']);
      assert.deepEqual([unread.body.data.total, unread.body.data.unreadCount], [1, 1]);

      const all = await call('POST', '/api/notifications/read-all', ALICE);
      assert.deepEqual(all.body, { success: true, data: { updated: 1 } });
      assert.equal((await call('GET', '/api/notifications?unread=true', ALICE)).body.data.total, 0);
      assert.equal(await store.unreadCount(BOB), 1);
    });

    it('page and limit default to 1 and 20 and are clamped', async () => {
      for (let i = 0; i < 3; i += 1) await store.insert(row());
      const defaults = await call('GET', '/api/notifications', ALICE);
      assert.deepEqual([defaults.body.data.page, defaults.body.data.limit], [1, 20]);
      const clamped = await call('GET', '/api/notifications?page=0&limit=500', ALICE);
      assert.deepEqual([clamped.body.data.page, clamped.body.data.limit], [1, 100]);
      const junk = await call('GET', '/api/notifications?page=abc&limit=-2', ALICE);
      assert.deepEqual([junk.body.data.page, junk.body.data.limit], [1, 1]);
    });

    it('/ready reports the dependencies and the old broadcast route is gone', async () => {
      assert.equal((await fetch(`${base}/ready`)).status, 200);
      assert.equal((await fetch(`${base}/health`)).status, 200);
      const broadcast = await fetch(`${base}/api/notifications/broadcast`, { method: 'POST' });
      assert.equal(broadcast.status, 401);
    });
  });
});
