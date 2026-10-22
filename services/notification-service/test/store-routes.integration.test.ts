/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Rewritten for the author's Notification Redesign (§7, §8): applyEvent's one-transaction two-recipient commit,
 * replay as a no-op that keeps read_at, fingerprint mismatch, suppressed-event memory, forward-only projection with
 * the stale flag, the action_needed and important views, stored_at ordering with a snapshot unreadCount, the read
 * routes' authoritative counts and INBOX_CHANGED callback, and the migration's legacy backfill.
 * Author review: <to be completed by Reallyeasy1>
 *
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
import type { NotificationView } from '@campus-errand/common-dtos';
import { createApp } from '../src/app';
import {
  ContractMismatch,
  createNotificationStore,
  type NotificationDraft,
  type NotificationStore,
  type ProcessedEventInput,
} from '../src/notifications/store';
import { ALICE, AUDIENCE, BOB, ISSUER, makeKeys, makeTestDatabase, signToken } from './helpers';

const databaseUrl = process.env.NOTIFICATION_TEST_DATABASE_URL;

describe('notification store and routes (PostgreSQL)', { skip: !databaseUrl }, () => {
  const keys = makeKeys();
  let database: Awaited<ReturnType<typeof makeTestDatabase>>;
  let store: NotificationStore;
  let server: Server;
  let base: string;
  const inboxChanges: string[] = [];

  const processed = (overrides: Partial<ProcessedEventInput> = {}): ProcessedEventInput => ({
    producer: 'order-service',
    eventId: randomUUID(),
    fingerprint: 'fp-' + randomUUID(),
    schemaVersion: 2,
    policyVersion: 1,
    orderId: randomUUID(),
    orderCode: 'ORD-0001',
    courierId: BOB,
    occurredAt: '2026-10-05T04:00:00.000Z',
    ...overrides,
  });
  const draft = (userId: string, kind: NotificationDraft['kind'] = 'ORDER_ACCEPTED', actionType: NotificationDraft['actionType'] = 'VIEW_ERRAND'): NotificationDraft => ({
    userId,
    kind,
    title: `${kind} for ${userId.slice(-4)}`,
    body: 'body',
    category: kind === 'ORDER_DELIVERED' ? 'ACTION' : kind === 'ORDER_CANCELLED' ? 'IMPORTANT' : 'PROGRESS',
    priority: 'NORMAL',
    actionType,
  });
  const projection = (orderVersion: number, status: ProcessedEventInput['projection'] extends infer P ? P extends { status: infer S } ? S : never : never) =>
    ({ orderVersion, status, requesterId: ALICE, courierId: BOB });
  const list = (userId: string, view: NotificationView = 'all', unreadOnly = false, page = 1, limit = 20) =>
    store.list(userId, { view, unreadOnly, page, limit });

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
      onInboxChanged: (userId) => { inboxChanges.push(userId); },
    });
    server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  beforeEach(async () => {
    await database.db.notification.deleteMany();
    await database.db.processedNotificationEvent.deleteMany();
    await database.db.orderNotificationState.deleteMany();
    inboxChanges.length = 0;
  });

  after(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await database.drop();
  });

  describe('store', () => {
    it('one event with two recipients commits two rows atomically; replay adds nothing and keeps read_at', async () => {
      const event = processed();
      const drafts = [draft(ALICE, 'ORDER_CANCELLED'), draft(BOB, 'ORDER_CANCELLED')];
      const first = await store.applyEvent(event, drafts);
      assert.equal(first.outcome, 'created');
      assert.deepEqual(first.created.map((c) => c.userId).sort(), [ALICE, BOB].sort());
      assert.equal(first.stale, false);
      const alice = first.created.find((c) => c.userId === ALICE)!.notification;
      assert.deepEqual(
        [alice.producer, alice.category, alice.actionType, alice.targetId, alice.sourceVersion, alice.createdAt, alice.orderStatus],
        ['order-service', 'IMPORTANT', 'VIEW_ERRAND', event.orderId, null, event.occurredAt, null],
      );
      const read = await store.markRead(ALICE, alice.id);
      assert.ok(read?.notification.readAt);

      const again = await store.applyEvent(event, drafts.map((d) => ({ ...d, title: 'changed on redelivery' })));
      assert.deepEqual([again.outcome, again.created.length], ['duplicate', 0]);
      assert.equal(await database.db.notification.count(), 2);
      const page = await list(ALICE);
      assert.deepEqual([page.items[0].title, page.items[0].readAt], [alice.title, read!.notification.readAt]);
      assert.equal((await database.db.processedNotificationEvent.findFirstOrThrow()).outcome, 'created');
    });

    it('a partial first attempt converges: rows already present are not duplicated for a recipient', async () => {
      const event = processed();
      // Simulate a crash after the first recipient was written but before the event was claimed as processed.
      await store.applyEvent({ ...event, eventId: event.eventId }, [draft(ALICE)]);
      await database.db.processedNotificationEvent.deleteMany();
      const redo = await store.applyEvent(event, [draft(ALICE), draft(BOB)]);
      assert.deepEqual(redo.created.map((c) => c.userId), [BOB]);
      assert.equal(await database.db.notification.count(), 2);
    });

    it('the same event id with a different fingerprint is a contract error', async () => {
      const event = processed({ fingerprint: 'a' });
      await store.applyEvent(event, [draft(ALICE)]);
      await assert.rejects(() => store.applyEvent({ ...event, fingerprint: 'b' }, []), ContractMismatch);
    });

    it('a suppressed event is recorded, so a later replay is a duplicate and creates nothing', async () => {
      const event = processed();
      const first = await store.applyEvent(event, []);
      assert.deepEqual([first.outcome, first.created], ['suppressed', []]);
      assert.equal((await database.db.processedNotificationEvent.findFirstOrThrow()).outcome, 'suppressed');
      const replay = await store.applyEvent(event, [draft(ALICE)]);
      assert.equal(replay.outcome, 'duplicate');
      assert.equal(await database.db.notification.count(), 0);
    });

    it('the projection only moves forward, an older event is stale and its action is already resolved', async () => {
      const orderId = randomUUID();
      await store.applyEvent(processed({ orderId, projection: projection(7, 'COMPLETED') }), [draft(BOB, 'ORDER_COMPLETED')]);
      const late = await store.applyEvent(processed({ orderId, projection: projection(6, 'DELIVERED') }), [draft(ALICE, 'ORDER_DELIVERED', 'REVIEW_DELIVERY')]);
      assert.equal(late.stale, true);
      assert.equal(late.created[0].notification.orderStatus, 'COMPLETED', 'the DTO carries the newer projected state');
      assert.equal(late.created[0].notification.sourceVersion, 6);
      const state = await database.db.orderNotificationState.findUniqueOrThrow({ where: { orderId } });
      assert.deepEqual([state.highestOrderVersion, state.status], [7, 'COMPLETED']);
      assert.equal((await list(ALICE, 'action_needed')).total, 0, 'completion already resolved the delivery review');
      assert.equal((await list(ALICE, 'all')).total, 1, 'the delivery notice stays as history');
    });

    it('view=action_needed keeps a delivered notice while the order is DELIVERED or unknown; view=important lists IMPORTANT only', async () => {
      const delivered = randomUUID();
      await store.applyEvent(processed({ orderId: delivered, projection: projection(3, 'DELIVERED') }), [draft(ALICE, 'ORDER_DELIVERED', 'REVIEW_DELIVERY')]);
      const legacy = randomUUID();
      await store.applyEvent(processed({ orderId: legacy, schemaVersion: 1 }), [draft(ALICE, 'ORDER_DELIVERED', 'REVIEW_DELIVERY')]);
      await store.applyEvent(processed(), [draft(ALICE, 'ORDER_CANCELLED')]);
      await store.applyEvent(processed(), [draft(ALICE, 'ORDER_ACCEPTED')]);

      const action = await list(ALICE, 'action_needed');
      assert.deepEqual(action.items.map((n) => n.orderId).sort(), [delivered, legacy].sort());
      assert.deepEqual(action.items.map((n) => n.orderStatus).sort(), [null, 'DELIVERED'].sort());
      assert.equal(action.unreadCount, 4, 'unreadCount is global, not per view');

      await store.applyEvent(processed({ orderId: delivered, projection: projection(4, 'COMPLETED') }), [draft(BOB, 'ORDER_COMPLETED')]);
      assert.deepEqual((await list(ALICE, 'action_needed')).items.map((n) => n.orderId), [legacy]);
      assert.deepEqual((await list(ALICE, 'important')).items.map((n) => n.kind), ['ORDER_CANCELLED']);
      assert.equal((await list(ALICE, 'all')).total, 4);
    });

    it('lists by arrival (stored_at) newest first with paging, and takes items, total and unreadCount from one snapshot', async () => {
      // Event times deliberately out of arrival order: a late event is new to the student and shows on top.
      for (const [title, occurredAt] of [['first', '2026-10-05T06:00:00.000Z'], ['second', '2026-10-05T04:00:00.000Z'], ['third', '2026-10-05T05:00:00.000Z']] as const) {
        await store.applyEvent(processed({ occurredAt }), [{ ...draft(ALICE), title }]);
      }
      const page = await list(ALICE, 'all', false, 1, 2);
      assert.deepEqual(page.items.map((n) => n.title), ['third', 'second']);
      assert.equal(page.items[1].createdAt, '2026-10-05T04:00:00.000Z', 'created_at stays the event time');
      assert.ok(page.items[0].storedAt >= page.items[1].storedAt);
      assert.deepEqual([page.total, page.page, page.limit, page.totalPages, page.unreadCount], [3, 1, 2, 2, 3]);
      assert.deepEqual((await list(ALICE, 'all', false, 2, 2)).items.map((n) => n.title), ['first']);
    });

    it('markRead and markAllRead return the authoritative unread count; a row stored after read-all stays unread', async () => {
      const { created } = await store.applyEvent(processed(), [draft(ALICE)]);
      await store.applyEvent(processed(), [draft(ALICE, 'ORDER_PICKED_UP')]);
      await store.applyEvent(processed(), [draft(BOB)]);
      const read = await store.markRead(ALICE, created[0].notification.id);
      assert.equal(read?.unreadCount, 1);
      assert.equal((await store.markRead(ALICE, created[0].notification.id))?.notification.readAt, read?.notification.readAt, 'reading twice keeps the first time');
      assert.equal(await store.markRead(BOB, created[0].notification.id), null, 'someone else\'s row is not found');

      assert.deepEqual(await store.markAllRead(ALICE), { updated: 1, unreadCount: 0 });
      await store.applyEvent(processed(), [draft(ALICE, 'ORDER_DELIVERED', 'REVIEW_DELIVERY')]);
      assert.equal(await store.unreadCount(ALICE), 1, 'a later arrival is still unread');
      assert.equal(await store.unreadCount(BOB), 1);
    });

    it('the migration backfilled legacy rows as processed events without a fingerprint', async () => {
      // The migration ran on an empty table here; verify its shape by inserting a legacy-looking processed row.
      await database.db.processedNotificationEvent.create({
        data: { producer: 'order-service', eventId: randomUUID(), fingerprint: null, schemaVersion: 1, policyVersion: 1, outcome: 'legacy' },
      });
      const legacy = await database.db.processedNotificationEvent.findFirstOrThrow({ where: { outcome: 'legacy' } });
      // A replay of a legacy event (unknown fingerprint) is a duplicate, never a contract error.
      const replay = await store.applyEvent(processed({ eventId: legacy.eventId, schemaVersion: 1 }), [draft(ALICE)]);
      assert.equal(replay.outcome, 'duplicate');
    });
  });

  describe('routes', () => {
    it('every route needs a token', async () => {
      assert.equal((await call('GET', '/api/notifications')).status, 401);
      assert.equal((await call('PATCH', `/api/notifications/${randomUUID()}/read`)).status, 401);
      assert.equal((await call('POST', '/api/notifications/read-all')).status, 401);
    });

    it('the list is scoped to the caller, carries the unread count and the inbox DTO fields', async () => {
      await store.applyEvent(processed(), [{ ...draft(ALICE), title: 'for alice' }]);
      await store.applyEvent(processed(), [{ ...draft(BOB), title: 'for bob' }]);
      const alice = await call('GET', '/api/notifications', ALICE);
      assert.equal(alice.status, 200);
      assert.equal(alice.body.success, true);
      assert.deepEqual(alice.body.data.items.map((n: any) => n.title), ['for alice']);
      assert.equal(alice.body.data.unreadCount, 1);
      assert.deepEqual(Object.keys(alice.body.data.items[0]).sort(), [
        'actionType', 'body', 'category', 'courierId', 'createdAt', 'id', 'kind', 'orderCode', 'orderId', 'orderStatus',
        'priority', 'producer', 'readAt', 'sourceVersion', 'storedAt', 'targetId', 'title',
      ]);
      const nobody = await call('GET', '/api/notifications', '20000000-0000-4000-8000-00000000ffff');
      assert.deepEqual([nobody.body.data.items.length, nobody.body.data.total, nobody.body.data.totalPages], [0, 0, 0]);
    });

    it('view=action_needed and view=important filter; an unknown view is 400', async () => {
      await store.applyEvent(processed({ projection: projection(3, 'DELIVERED') }), [draft(ALICE, 'ORDER_DELIVERED', 'REVIEW_DELIVERY')]);
      await store.applyEvent(processed(), [draft(ALICE, 'ORDER_CANCELLED')]);
      await store.applyEvent(processed(), [draft(ALICE)]);
      assert.deepEqual((await call('GET', '/api/notifications?view=action_needed', ALICE)).body.data.items.map((n: any) => n.kind), ['ORDER_DELIVERED']);
      assert.deepEqual((await call('GET', '/api/notifications?view=important', ALICE)).body.data.items.map((n: any) => n.kind), ['ORDER_CANCELLED']);
      assert.equal((await call('GET', '/api/notifications?view=all', ALICE)).body.data.total, 3);
      const bogus = await call('GET', '/api/notifications?view=bogus', ALICE);
      assert.deepEqual([bogus.status, bogus.body.code], [400, 'INVALID_VIEW']);
    });

    it('PATCH /:id/read marks the caller\'s own row, returns meta.unreadCount and invalidates their sockets; 404 otherwise', async () => {
      const mine = (await store.applyEvent(processed(), [draft(ALICE)])).created[0].notification;
      await store.applyEvent(processed(), [draft(ALICE, 'ORDER_PICKED_UP')]);
      const theirs = (await store.applyEvent(processed(), [draft(BOB)])).created[0].notification;
      const read = await call('PATCH', `/api/notifications/${mine.id}/read`, ALICE);
      assert.equal(read.status, 200);
      assert.equal(typeof read.body.data.readAt, 'string');
      assert.deepEqual(read.body.meta, { unreadCount: 1 });
      assert.deepEqual(inboxChanges, [ALICE]);
      const again = await call('PATCH', `/api/notifications/${mine.id}/read`, ALICE);
      assert.equal(again.body.data.readAt, read.body.data.readAt, 'reading twice keeps the first read time');

      for (const id of [theirs.id, randomUUID(), 'not-a-uuid']) {
        const res = await call('PATCH', `/api/notifications/${id}/read`, ALICE);
        assert.equal(res.status, 404, id);
        assert.equal(res.body.code, 'NOTIFICATION_NOT_FOUND');
      }
      assert.equal((await store.list(BOB, { view: 'all', unreadOnly: true, page: 1, limit: 20 })).total, 1, 'bob\'s row is still unread');
    });

    it('unread=true lists only unread rows; read-all marks the caller\'s rows and reports count and unreadCount', async () => {
      const one = (await store.applyEvent(processed(), [{ ...draft(ALICE), title: 'one' }])).created[0].notification;
      await store.applyEvent(processed(), [{ ...draft(ALICE), title: 'two' }]);
      await store.applyEvent(processed(), [draft(BOB)]);
      await call('PATCH', `/api/notifications/${one.id}/read`, ALICE);
      const unread = await call('GET', '/api/notifications?unread=true', ALICE);
      assert.deepEqual(unread.body.data.items.map((n: any) => n.title), ['two']);
      assert.deepEqual([unread.body.data.total, unread.body.data.unreadCount], [1, 1]);

      inboxChanges.length = 0;
      const all = await call('POST', '/api/notifications/read-all', ALICE);
      assert.deepEqual(all.body, { success: true, data: { updated: 1, unreadCount: 0 } });
      assert.deepEqual(inboxChanges, [ALICE]);
      assert.equal((await call('GET', '/api/notifications?unread=true', ALICE)).body.data.total, 0);
      assert.equal(await store.unreadCount(BOB), 1);
      const nothing = await call('POST', '/api/notifications/read-all', ALICE);
      assert.deepEqual([nothing.body.data.updated, inboxChanges.length], [0, 1], 'no invalidation when nothing changed');
    });

    it('page and limit default to 1 and 20 and are clamped', async () => {
      for (let i = 0; i < 3; i += 1) await store.applyEvent(processed(), [draft(ALICE)]);
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
