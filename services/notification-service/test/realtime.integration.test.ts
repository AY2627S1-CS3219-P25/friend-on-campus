/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
 * Scope: Cross-replica notification delivery with a real broker and database (issue #241 RT3.1 to RT3.5): the work
 *        queue consumed on replica A reaching a recipient held by replica B, exclusion of unrelated users, duplicate
 *        business events and replayed signals, stale and already-read suppression, read and read-all propagation
 *        through the REST routes of one replica to the sockets of the other, lost-lease ownership checks and REST
 *        recovery after a reconnect.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
// Opt in with NOTIFICATION_TEST_DATABASE_URL and NOTIFICATION_TEST_RABBITMQ_URL (the notification_service account).
// Uses its own work exchange/queues and fanout exchange under notification-service.events.test-<id> and its own
// database schema, and removes them afterwards; the real queues are never touched.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { setTimeout as delay } from 'node:timers/promises';
import amqp from 'amqplib';
import { WebSocketServer } from 'ws';
import { authMiddleware } from '@campus-errand/auth';
import {
  createFanoutPublisher,
  createOutboxRelay,
  createSqlOutboxStore,
  startRealtimeSubscriber,
  type MessagingConfig,
  type OutboxStore,
  type RealtimeSubscriber,
} from '@campus-errand/messaging';
import { createApp } from '../src/app';
import { createDeliver, startNotificationConsumer } from '../src/notifications/events';
import { createNotificationDelivery, notificationsSignal } from '../src/notifications/realtime';
import { createNotificationStore } from '../src/notifications/store';
import { createHub, createSocketAuthenticator } from '../src/ws/hub';
import { ALICE, AUDIENCE, BOB, ISSUER, makeKeys, makeTestDatabase, openSocket, signToken, until } from './helpers';

const databaseUrl = process.env.NOTIFICATION_TEST_DATABASE_URL;
const brokerUrl = process.env.NOTIFICATION_TEST_RABBITMQ_URL;
const CAROL = '20000000-0000-4000-8000-000000000003';
const quiet = () => {};

describe('cross-replica notification delivery (RabbitMQ + PostgreSQL)', { skip: !databaseUrl || !brokerUrl }, () => {
  const keys = makeKeys();
  const prefix = `notification-service.events.test-${randomUUID().slice(0, 8)}`;
  const exchange = `${prefix}.realtime`;
  const work: MessagingConfig = {
    url: brokerUrl!, exchange: `${prefix}.in`, queue: prefix, deadLetterExchange: `${prefix}.dlx`, deadLetterQueue: `${prefix}.dlq`, retryDelayMs: 50, retryLimit: 2,
  };
  let database: Awaited<ReturnType<typeof makeTestDatabase>>;
  let store: ReturnType<typeof createNotificationStore>;
  let outbox: OutboxStore;
  let consumer: Awaited<ReturnType<typeof startNotificationConsumer>>;
  let connection: Awaited<ReturnType<typeof amqp.connect>>;
  let channel: Awaited<ReturnType<Awaited<ReturnType<typeof amqp.connect>>['createConfirmChannel']>>;

  interface Replica {
    name: string;
    hub: ReturnType<typeof createHub>;
    wsUrl: string;
    httpUrl: string;
    publisher: ReturnType<typeof createFanoutPublisher>;
    subscriber: RealtimeSubscriber;
    relay: ReturnType<typeof createOutboxRelay>;
    close(): Promise<void>;
  }
  const replicas: Replica[] = [];

  async function startReplica(name: string): Promise<Replica> {
    const publisher = createFanoutPublisher({ url: brokerUrl!, exchange });
    const hub = createHub({ authenticate: createSocketAuthenticator({ publicKey: keys.publicKey, issuer: ISSUER, audience: AUDIENCE }), unreadCount: store.unreadCount });
    const subscriber = await startRealtimeSubscriber({ url: brokerUrl!, exchange, handle: createNotificationDelivery({ store, hub }).handle, log: quiet, onSubscriptionLost: () => hub.disconnectAll() });
    const relay = createOutboxRelay({ store: outbox, publish: publisher.publish, pollMs: 25, failureDelayMs: 100, owner: `relay-${name}`, log: quiet });
    relay.start();
    const app = createApp({ store, authenticate: authMiddleware({ publicKey: keys.publicKey, issuer: ISSUER, audience: AUDIENCE }), isReady: async () => true, port: 0 });
    const server: Server = app.listen(0);
    await new Promise<void>((resolve) => server.once('listening', resolve));
    const wss = new WebSocketServer({ server });
    wss.on('connection', hub.handleConnection);
    const port = (server.address() as AddressInfo).port;
    const replica: Replica = {
      name, hub, publisher, subscriber, relay,
      wsUrl: `ws://127.0.0.1:${port}`,
      httpUrl: `http://127.0.0.1:${port}`,
      async close() {
        // The property, not the captured constant: RT3.5 replaces the relay, and the replacement must be stopped too.
        await replica.relay.stop();
        await subscriber.close();
        hub.close();
        await publisher.close();
        await new Promise<void>((resolve) => wss.close(() => resolve()));
        await new Promise<void>((resolve) => server.close(() => resolve()));
      },
    };
    replicas.push(replica);
    return replica;
  }

  const connect = async (replica: Replica, userId: string) => {
    const client = await openSocket(replica.wsUrl);
    client.send({ type: 'AUTH', token: signToken(keys.privateKey, userId) });
    await client.frame('AUTH_OK');
    return client;
  };
  const rest = async (replica: Replica, method: string, path: string, userId: string) => {
    const res = await fetch(`${replica.httpUrl}${path}`, { method, headers: { Authorization: `Bearer ${signToken(keys.privateKey, userId)}` } });
    return { status: res.status, body: await res.json() };
  };
  const publishEvent = (event: Record<string, unknown>) => new Promise<void>((resolve, reject) => {
    channel.publish(work.exchange, String(event.eventType), Buffer.from(JSON.stringify(event)), { persistent: true }, (error) => (error ? reject(error) : resolve()));
  });
  const accepted = (overrides: Record<string, unknown> = {}) => ({
    eventId: randomUUID(), eventType: 'order.accepted', timestamp: '2026-11-09T04:00:00.000Z', orderId: randomUUID(), orderCode: 'ORD-0042',
    requesterId: ALICE, courierId: BOB, courierUsername: 'bob', ...overrides,
  });
  const v2 = (orderId: string, orderVersion: number, eventType: string, status: string, extra: Record<string, unknown> = {}) => ({
    eventId: randomUUID(), eventType, timestamp: '2026-11-09T04:00:00.000Z', schemaVersion: 2, producer: 'order-service', orderId, orderCode: 'ORD-2000',
    orderVersion, previousStatus: 'OPEN', status, requesterId: ALICE, courierId: BOB, actorRole: 'STUDENT', actorId: BOB, correlationId: orderId, ...extra,
  });
  const notificationsOf = (client: Awaited<ReturnType<typeof openSocket>>) => client.frames.filter((f) => f.type === 'NOTIFICATION');
  const inboxHints = (client: Awaited<ReturnType<typeof openSocket>>) => client.frames.filter((f) => f.type === 'INBOX_CHANGED').length;
  const pendingRows = () => database.db.notificationRealtimeOutbox.count();
  const settled = () => delay(300);

  let a: Replica;
  let b: Replica;

  before(async () => {
    database = await makeTestDatabase(databaseUrl!);
    store = createNotificationStore(database.db);
    outbox = createSqlOutboxStore(database.db, 'notification_realtime_outbox');
    a = await startReplica('a');
    b = await startReplica('b');
    // Only replica A consumes the business work queue; B must still push to its sockets.
    consumer = await startNotificationConsumer(work, createDeliver(store));
    connection = await amqp.connect(brokerUrl!);
    channel = await connection.createConfirmChannel();
    await until(() => consumer.isReady(), 'consumer ready');
  });

  after(async () => {
    await consumer?.close();
    for (const replica of replicas) await replica.close().catch(() => {});
    if (channel) {
      for (const queue of [work.queue, work.deadLetterQueue]) await channel.deleteQueue(queue).catch(() => {});
      for (const name of [work.exchange, work.deadLetterExchange, exchange]) await channel.deleteExchange(name).catch(() => {});
      await channel.close();
    }
    await connection?.close();
    await database?.drop();
  });

  it('RT3.1 and RT3.2: an event consumed on A reaches the recipient on B once; duplicates add no row and no frame', async () => {
    const aliceB = await connect(b, ALICE);
    const aliceA = await connect(a, ALICE);
    const carolB = await connect(b, CAROL);
    const event = accepted();
    await publishEvent(event);
    const [onB, onA] = await Promise.all([aliceB.frame('NOTIFICATION'), aliceA.frame('NOTIFICATION')]);
    assert.equal(onB.data.title, 'Your errand ORD-0042 was accepted');
    assert.equal(onB.data.id, onA.data.id, 'both replicas pushed the same stored row');
    await until(async () => (await pendingRows()) === 0, 'outbox drained');
    await until(() => inboxHints(aliceB) >= 1 && inboxHints(aliceA) >= 1, 'inbox hints on both replicas');

    // Duplicate business event through the work queue, then the same realtime signal replayed by both publishers.
    await publishEvent(event);
    const stored = await database.db.notification.findFirstOrThrow({ where: { userId: ALICE } });
    const replay = notificationsSignal(String(event.eventId), { producer: 'order-service', created: [{ userId: ALICE, notificationId: stored.id }], recipientIds: [ALICE], stale: false });
    await a.publisher.publish(replay);
    await b.publisher.publish(replay);
    await settled();
    assert.equal(await database.db.notification.count({ where: { userId: ALICE } }), 1);
    assert.deepEqual([notificationsOf(aliceB).length, notificationsOf(aliceA).length, notificationsOf(carolB).length], [1, 1, 0]);
    for (const client of [aliceA, aliceB, carolB]) client.ws.close();
    await until(() => a.hub.connectionCount() + b.hub.connectionCount() === 0, 'sockets evicted');
  });

  it('RT3.3: a stale event and an already-read row are kept as history but never pushed', async () => {
    const orderId = randomUUID();
    const aliceB = await connect(b, ALICE);
    const bobB = await connect(b, BOB);
    await publishEvent(v2(orderId, 7, 'order.cancelled', 'CANCELLED', { reasonCode: 'REQUESTER_CANCELLED', actorRole: 'STUDENT', actorId: ALICE, courierId: BOB }));
    await until(() => notificationsOf(bobB).some((f) => f.data.orderId === orderId), 'cancellation pushed to the courier');
    const before = notificationsOf(bobB).length;
    // Older version arriving late: stored for history, flagged stale, never toasted.
    await publishEvent(v2(orderId, 3, 'order.in_transit', 'IN_TRANSIT', { previousStatus: 'ACCEPTED' }));
    await until(async () => (await database.db.notification.count({ where: { orderId } })) === 2, 'stale progress row stored');
    await until(async () => (await pendingRows()) === 0, 'outbox drained');
    await settled();
    assert.deepEqual(notificationsOf(aliceB).filter((f) => f.data.orderId === orderId), [], 'the stale requester alert was not pushed');
    assert.equal(notificationsOf(bobB).length, before);
    await until(() => inboxHints(aliceB) >= 1, 'the requester still gets an inbox refresh hint');

    // A row read before its signal is handled: replaying the signal pushes nothing.
    const row = await database.db.notification.findFirstOrThrow({ where: { orderId, userId: BOB } });
    const read = await rest(a, 'PATCH', `/api/notifications/${row.id}/read`, BOB);
    assert.equal(read.status, 200);
    const countBefore = notificationsOf(bobB).length;
    await a.publisher.publish({ eventId: randomUUID(), kind: 'notifications', payload: { producer: 'order-service', created: [{ userId: BOB, notificationId: row.id }], recipientIds: [BOB], stale: false } });
    await settled();
    assert.equal(notificationsOf(bobB).length, countBefore, 'an already-read notification produces no delayed toast');
    aliceB.ws.close(); bobB.ws.close();
    await until(() => a.hub.connectionCount() + b.hub.connectionCount() === 0, 'sockets evicted');
  });

  it('RT3.4: read and read-all on replica A refresh the user\'s sockets on replica B and nobody else', async () => {
    const aliceB = await connect(b, ALICE);
    const aliceA = await connect(a, ALICE);
    const bobB = await connect(b, BOB);
    await publishEvent(accepted());
    const frame = await aliceB.frame('NOTIFICATION');
    await until(async () => (await pendingRows()) === 0, 'outbox drained');
    const hints = { b: inboxHints(aliceB), a: inboxHints(aliceA), bob: inboxHints(bobB) };

    const read = await rest(a, 'PATCH', `/api/notifications/${frame.data.id}/read`, ALICE);
    assert.equal(read.status, 200);
    await until(() => inboxHints(aliceB) === hints.b + 1 && inboxHints(aliceA) === hints.a + 1, 'read propagated to both replicas');
    const all = await rest(a, 'POST', '/api/notifications/read-all', ALICE);
    assert.equal(all.body.data.updated >= 0, true);
    const unreadBefore = all.body.data.unreadCount;
    await settled();
    assert.equal(inboxHints(bobB), hints.bob, 'another user hears nothing about Alice\'s reads');
    // Nothing left unread: a second read-all commits no intent and therefore no hint.
    const hintsNow = inboxHints(aliceB);
    const nothing = await rest(a, 'POST', '/api/notifications/read-all', ALICE);
    assert.deepEqual([nothing.body.data.updated, unreadBefore], [0, 0]);
    await settled();
    assert.equal(inboxHints(aliceB), hintsNow);
    for (const client of [aliceA, aliceB, bobB]) client.ws.close();
    await until(() => a.hub.connectionCount() + b.hub.connectionCount() === 0, 'sockets evicted');
  });

  it('RT3.5: an expired lease cannot be completed by its old owner, and a reconnecting client recovers from REST', async () => {
    for (const replica of [a, b]) await replica.relay.stop();
    const event = accepted();
    await publishEvent(event);
    const row = await until(async () => (await database.db.notificationRealtimeOutbox.findFirst()) ?? undefined, 'intent committed');
    const [claimed] = await outbox.claim('slow', 150, 5);
    assert.equal(claimed.id, row.id);
    await delay(200);
    const [reclaimed] = await outbox.claim('fast', 30_000, 5);
    assert.equal(reclaimed.id, row.id, 'the expired lease is reclaimed');
    assert.equal(await outbox.complete(row.id, 'slow'), false, 'the old owner cannot complete it');
    assert.equal(await outbox.release(row.id, 'slow', 0), false, 'nor release it');
    assert.equal(await outbox.complete(row.id, 'fast'), true);

    // Alice was offline for the event: a fresh connection on either replica recovers the row over REST.
    const aliceA = await connect(a, ALICE);
    const inbox = await rest(a, 'GET', '/api/notifications?view=all&page=1&limit=20', ALICE);
    assert.ok(inbox.body.data.items.some((n: { orderId: string }) => n.orderId === event.orderId), 'the missed notification is in history');
    assert.equal(notificationsOf(aliceA).length, 0, 'no live frame was needed for recovery');
    aliceA.ws.close();
    for (const replica of [a, b]) {
      replica.relay = createOutboxRelay({ store: outbox, publish: replica.publisher.publish, pollMs: 25, failureDelayMs: 100, owner: `relay-${replica.name}`, log: quiet });
      replica.relay.start();
    }
    await until(() => a.hub.connectionCount() + b.hub.connectionCount() === 0, 'sockets evicted');
  });
});
