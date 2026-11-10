/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
 * Scope: Cross-replica chat delivery with a real broker and database (issue #240 RT2.1 to RT2.5): two independent replicas (hub, subscriber, relay each), Alice on A...
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
// Opt in with CHAT_TEST_DATABASE_URL and CHAT_TEST_RABBITMQ_URL (an account allowed to declare chat-service.events.test-*).
// Uses its own fanout exchange (deleted afterwards), replica queues that auto-delete, and its own database schema.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import net from 'node:net';
import type { AddressInfo } from 'node:net';
import { setTimeout as delay } from 'node:timers/promises';
import amqp from 'amqplib';
import { WebSocketServer } from 'ws';
import {
  createFanoutPublisher,
  createOutboxRelay,
  createSqlOutboxStore,
  startRealtimeSubscriber,
  type OutboxStore,
  type RealtimeSubscriber,
} from '@campus-errand/messaging';
import { createConversationService } from '../src/conversations/service';
import { createConversationStore } from '../src/conversations/store';
import { createChatDelivery, messageSignal } from '../src/realtime/delivery';
import { createChatHub, createSocketAuthenticator } from '../src/ws/hub';
import { ADMIN, ALICE, AUDIENCE, BOB, CAROL, ISSUER, makeKeys, makeTestDatabase, openSocket, signToken, until } from './helpers';

const databaseUrl = process.env.CHAT_TEST_DATABASE_URL;
const brokerUrl = process.env.CHAT_TEST_RABBITMQ_URL;
const quiet = () => {};

/** A TCP relay in front of the broker whose connections can be cut to stand in for a broker interruption. */
async function startProxy(target: URL) {
  const sockets = new Set<net.Socket>();
  let cut = false;
  let holdMs = 0;
  let accepted = 0;
  const server = net.createServer((client) => {
    if (cut) { client.destroy(); return; }
    accepted += 1;
    const forward = () => {
      const upstream = net.connect(Number(target.port || 5672), target.hostname);
      sockets.add(client); sockets.add(upstream);
      client.pipe(upstream); upstream.pipe(client);
      const drop = () => { client.destroy(); upstream.destroy(); sockets.delete(client); sockets.delete(upstream); };
      client.on('error', drop); upstream.on('error', drop); client.on('close', drop); upstream.on('close', drop);
    };
    if (holdMs === 0) { forward(); return; }
    // Keep the new connection away from the broker for a while, so a connection attempt is observably in flight.
    client.pause();
    client.on('error', () => {});
    setTimeout(() => { if (!client.destroyed) { forward(); client.resume(); } }, holdMs);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const url = new URL(target.toString());
  url.hostname = '127.0.0.1';
  url.port = String((server.address() as AddressInfo).port);
  return {
    url: url.toString(),
    interrupt() { cut = true; for (const socket of sockets) socket.destroy(); sockets.clear(); },
    restore() { cut = false; },
    /** Delay every later connection by `ms` before it reaches the broker. */
    hold(ms: number) { holdMs = ms; },
    accepted: () => accepted,
    open: () => sockets.size,
    async stop() { this.interrupt(); await new Promise<void>((resolve) => server.close(() => resolve())); },
  };
}

describe('cross-replica chat delivery (RabbitMQ + PostgreSQL)', { skip: !databaseUrl || !brokerUrl }, () => {
  const keys = makeKeys();
  const exchange = `chat-service.events.test-${randomUUID().slice(0, 8)}.realtime`;
  let database: Awaited<ReturnType<typeof makeTestDatabase>>;
  let store: ReturnType<typeof createConversationStore>;
  let outbox: OutboxStore;
  let proxy: Awaited<ReturnType<typeof startProxy>>;

  interface Replica {
    name: string;
    hub: ReturnType<typeof createChatHub>;
    url: string;
    wss: WebSocketServer;
    publisher: ReturnType<typeof createFanoutPublisher>;
    subscriber: RealtimeSubscriber;
    relay: ReturnType<typeof createOutboxRelay>;
    lostSubscriptions: number;
    close(): Promise<void>;
  }
  const replicas: Replica[] = [];

  async function startReplica(name: string, url: string): Promise<Replica> {
    const service = createConversationService({ store, orders: { async getOrder() { return { kind: 'not_found' }; } } });
    const publisher = createFanoutPublisher({ url, exchange });
    const hub = createChatHub({
      authenticate: createSocketAuthenticator({ publicKey: keys.publicKey, issuer: ISSUER, audience: AUDIENCE }),
      send: service.send,
      broadcast: publisher.publish,
    });
    const replica = { name, hub, publisher, lostSubscriptions: 0 } as Replica;
    const delivery = createChatDelivery({ store, hub });
    replica.subscriber = await startRealtimeSubscriber({
      url, exchange, handle: delivery.handle, log: quiet, maxReconnectDelayMs: 500,
      onSubscriptionLost: () => { replica.lostSubscriptions += 1; hub.disconnectAll(); },
    });
    replica.relay = createOutboxRelay({ store: outbox, publish: publisher.publish, pollMs: 25, failureDelayMs: 100, owner: `relay-${name}`, log: quiet });
    replica.relay.start();
    replica.wss = new WebSocketServer({ port: 0 });
    replica.wss.on('connection', hub.handleConnection);
    await new Promise<void>((resolve) => replica.wss.once('listening', resolve));
    replica.url = `ws://127.0.0.1:${(replica.wss.address() as AddressInfo).port}`;
    replica.close = async () => {
      await replica.relay.stop();
      await replica.subscriber.close();
      await hub.close();
      await publisher.close();
      await new Promise<void>((resolve) => replica.wss.close(() => resolve()));
    };
    replicas.push(replica);
    return replica;
  }

  const connect = async (replica: Replica, userId: string, claims: Record<string, unknown> = {}) => {
    const client = await openSocket(replica.url);
    client.send({ type: 'AUTH', token: signToken(keys.privateKey, userId, { username: `user-${userId.slice(-1)}`, ...claims }) });
    await client.frame('AUTH_OK');
    return client;
  };
  const messagesOf = (client: Awaited<ReturnType<typeof openSocket>>) => client.frames.filter((f) => f.type === 'MESSAGE');
  const pendingRows = () => database.db.realtimeOutbox.count();
  const settled = () => delay(300);

  let a: Replica;
  let b: Replica;

  before(async () => {
    database = await makeTestDatabase(databaseUrl!);
    store = createConversationStore(database.db);
    outbox = createSqlOutboxStore(database.db, 'realtime_outbox');
    proxy = await startProxy(new URL(brokerUrl!));
    // Replica A reaches the broker through the proxy so its link can be cut; B talks to the broker directly.
    a = await startReplica('a', proxy.url);
    b = await startReplica('b', brokerUrl!);
  });

  after(async () => {
    for (const replica of replicas) await replica.close().catch(() => {});
    await proxy?.stop();
    if (brokerUrl) {
      const connection = await amqp.connect(brokerUrl);
      const channel = await connection.createChannel();
      await channel.deleteExchange(exchange).catch(() => {});
      await connection.close();
    }
    await database?.drop();
  });

  it('RT2.1: Alice on A reaches Bob on B once, with her echo correlated on every tab and nothing for outsiders', async () => {
    const orderId = randomUUID();
    await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: '2026-11-09T04:00:00.000Z' });
    const aliceA = await connect(a, ALICE);
    const aliceB = await connect(b, ALICE);
    const bobB = await connect(b, BOB);
    const carolA = await connect(a, CAROL);
    const adminB = await connect(b, ADMIN, { role: 'ADMIN' });

    aliceA.send({ type: 'SEND', orderId, text: 'hello from A', clientId: 'c1' });
    const [echoA, echoB, bob] = await Promise.all([aliceA.frame('MESSAGE'), aliceB.frame('MESSAGE'), bobB.frame('MESSAGE')]);
    assert.deepEqual([echoA.clientId, echoB.clientId, bob.clientId], ['c1', 'c1', undefined]);
    assert.deepEqual([bob.orderId, bob.message.senderId, bob.message.text, bob.message.sequence], [orderId, ALICE, 'hello from A', 1]);
    await until(async () => (await pendingRows()) === 0, 'outbox drained');
    await settled();
    assert.equal(messagesOf(bobB).length, 1, 'exactly one MESSAGE for Bob although two replicas handled the signal');
    assert.equal(messagesOf(aliceA).length + messagesOf(aliceB).length, 2);
    assert.deepEqual([messagesOf(carolA).length, messagesOf(adminB).length], [0, 0], 'outsiders and admins receive nothing');
    assert.equal(await database.db.message.count(), 1);

    // Bob answers from B; the signal travels back to A.
    bobB.send({ type: 'SEND', orderId, text: 'hi from B', clientId: 'c2' });
    assert.equal((await aliceA.frame('MESSAGE', 2)).message.sequence, 2);
    assert.equal((await bobB.frame('MESSAGE', 2)).clientId, 'c2');
    for (const client of [aliceA, aliceB, bobB, carolA, adminB]) client.ws.close();
    await until(() => a.hub.connectionCount() + b.hub.connectionCount() === 0, 'sockets evicted');
  });

  it('RT2.3: a replayed signal pushes nothing and creates no row', async () => {
    const orderId = randomUUID();
    await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: '2026-11-09T04:00:00.000Z' });
    const bobB = await connect(b, BOB);
    const aliceA = await connect(a, ALICE);
    aliceA.send({ type: 'SEND', orderId, text: 'once', clientId: 'c3' });
    const first = await bobB.frame('MESSAGE');
    await until(async () => (await pendingRows()) === 0, 'outbox drained');

    // The same intent published again (a relay that died after publishing but before completing would do this).
    const found = await store.findMessage(first.message.id);
    await b.publisher.publish(messageSignal(found!.message, found!.conversation, 'c3'));
    await a.publisher.publish(messageSignal(found!.message, found!.conversation, 'c3'));
    await settled();
    assert.equal(messagesOf(bobB).length, 1);
    assert.equal(messagesOf(aliceA).length, 1);
    assert.equal(await database.db.message.count({ where: { conversationId: found!.conversation.id } }), 1);
    aliceA.ws.close(); bobB.ws.close();
    await until(() => a.hub.connectionCount() + b.hub.connectionCount() === 0, 'sockets evicted');
  });

  it('RT2.2 and RT2.4: a writer stopping after commit leaves a pending intent; delivery respects current membership', async () => {
    const orderId = randomUUID();
    const { conversation } = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: '2026-11-09T04:00:00.000Z' });
    // No relay is running: the message commits with its intent and nothing is published, as if the writer died.
    for (const replica of [a, b]) await replica.relay.stop();
    const aliceA = await connect(a, ALICE);
    const bobB = await connect(b, BOB);
    const carolB = await connect(b, CAROL);
    aliceA.send({ type: 'SEND', orderId, text: 'before the handover', clientId: 'c4' });
    await until(async () => (await database.db.message.count({ where: { conversationId: conversation.id } })) === 1, 'message committed');
    assert.equal(await pendingRows(), 1, 'the intent waits for a relay');
    await settled();
    assert.deepEqual([messagesOf(aliceA).length, messagesOf(bobB).length], [0, 0], 'nothing was pushed without a relay');

    // Bob is replaced by Carol before any relay publishes the intent.
    await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: CAROL, createdAt: '2026-11-09T04:10:00.000Z' });
    // A surviving replica's relay picks the row up.
    const survivor = createOutboxRelay({ store: outbox, publish: b.publisher.publish, pollMs: 25, owner: 'survivor', log: quiet });
    assert.equal(await survivor.runOnce(), 1);
    await aliceA.frame('MESSAGE');
    await settled();
    assert.equal(messagesOf(aliceA)[0].clientId, 'c4', 'the sender still gets her correlated echo');
    assert.equal(messagesOf(bobB).length, 0, 'the removed courier receives nothing');
    assert.equal(messagesOf(carolB).length, 0, 'the new courier was not in the original recipient set');
    assert.equal(await pendingRows(), 0);
    for (const replica of [a, b]) {
      replica.relay = createOutboxRelay({ store: outbox, publish: replica.publisher.publish, pollMs: 25, failureDelayMs: 100, owner: `relay-${replica.name}`, log: quiet });
      replica.relay.start();
    }
    aliceA.ws.close(); bobB.ws.close(); carolB.ws.close();
    await until(() => a.hub.connectionCount() + b.hub.connectionCount() === 0, 'sockets evicted');
  });

  it('RT2.4: a relay that dies after publishing is superseded after its lease; completion by the dead owner is refused', async () => {
    const orderId = randomUUID();
    await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: '2026-11-09T04:00:00.000Z' });
    for (const replica of [a, b]) await replica.relay.stop();
    const bobB = await connect(b, BOB);
    const aliceA = await connect(a, ALICE);
    aliceA.send({ type: 'SEND', orderId, text: 'published then lost', clientId: 'c5' });
    const row = await until(async () => (await database.db.realtimeOutbox.findFirst()) ?? undefined, 'intent committed');

    // "Dying" relay: claims with a short lease, publishes, never completes.
    const [claimed] = await outbox.claim('dying', 200, 5);
    assert.equal(claimed.id, row.id);
    await a.publisher.publish({ eventId: claimed.eventId, kind: claimed.kind, payload: claimed.payload });
    await bobB.frame('MESSAGE');
    await delay(250);
    // A healthy relay reclaims the expired lease and republishes; the subscribers already saw this event id.
    const healthy = createOutboxRelay({ store: outbox, publish: b.publisher.publish, pollMs: 25, owner: 'healthy', log: quiet });
    assert.equal(await healthy.runOnce(), 1);
    assert.equal(await outbox.complete(claimed.id, 'dying'), false, 'the stale owner cannot complete the row');
    await settled();
    assert.equal(messagesOf(bobB).length, 1, 'the republished signal was deduplicated');
    assert.equal(await pendingRows(), 0);
    for (const replica of [a, b]) {
      replica.relay = createOutboxRelay({ store: outbox, publish: replica.publisher.publish, pollMs: 25, failureDelayMs: 100, owner: `relay-${replica.name}`, log: quiet });
      replica.relay.start();
    }
    aliceA.ws.close(); bobB.ws.close();
    await until(() => a.hub.connectionCount() + b.hub.connectionCount() === 0, 'sockets evicted');
  });

  it('RT2.5: a broker interruption keeps the committed message and its intent; recovery recreates the queue and drains it', { timeout: 60_000 }, async () => {
    const orderId = randomUUID();
    const { conversation } = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: '2026-11-09T04:00:00.000Z' });
    const bobA = await connect(a, BOB);
    const aliceB = await connect(b, ALICE);
    const queueBefore = a.subscriber.queueName();

    // B's relay must not publish during the outage so the pending intent is observable; A's relay publishes via the proxy.
    await b.relay.stop();
    proxy.interrupt();
    assert.equal(await bobA.closed(10_000), 1012, 'A closes its sockets when its replica queue is lost');
    await until(() => a.lostSubscriptions === 1 && !a.subscriber.isReady(), 'A reports the lost subscription');

    aliceB.send({ type: 'SEND', orderId, text: 'sent during the outage', clientId: 'c6' });
    await until(async () => (await database.db.message.count({ where: { conversationId: conversation.id } })) === 1, 'message committed during the outage');
    await delay(500);
    assert.equal(await pendingRows(), 1, 'the intent stays pending while the broker is unreachable');
    assert.equal(messagesOf(aliceB).length, 0, 'no echo yet: nothing could be published');
    const history = await store.listMessages(conversation.id, { afterSequence: 0, limit: 10 });
    assert.equal(history.length, 1, 'REST history already shows the committed message');

    proxy.restore();
    await until(() => a.subscriber.isReady() && a.subscriber.queueName() !== queueBefore, 'A recreated a fresh replica queue', 20_000);
    const bobAgain = await connect(a, BOB);
    await until(async () => (await pendingRows()) === 0, 'the pending intent drained after recovery', 20_000);
    assert.equal((await aliceB.frame('MESSAGE')).clientId, 'c6', 'the sender gets her echo once the signal flows');
    // Bob reconnected after the interruption: the live signal may or may not have raced his AUTH, so the authoritative
    // recovery is history, which holds the message either way.
    const recovered = await store.listMessages(conversation.id, { afterSequence: 0, limit: 10 });
    assert.deepEqual(recovered.map((m) => m.text), ['sent during the outage']);
    b.relay = createOutboxRelay({ store: outbox, publish: b.publisher.publish, pollMs: 25, failureDelayMs: 100, owner: 'relay-b', log: quiet });
    b.relay.start();
    aliceB.ws.close(); bobAgain.ws.close();
    await until(() => a.hub.connectionCount() + b.hub.connectionCount() === 0, 'sockets evicted');
  });

  // PR #246 review: close() during a reconnect found nothing to tear down, and the reconnect then installed a new
  // connection and queue that nothing closed, keeping a stopping process alive.
  it('a subscriber closed while its reconnect is in flight leaves no queue or broker connection behind', { timeout: 30_000 }, async () => {
    const own = await startProxy(new URL(brokerUrl!));
    const events: string[] = [];
    const subscriber = await startRealtimeSubscriber({
      url: own.url, exchange, handle: async () => {}, maxReconnectDelayMs: 500, log: (event) => { events.push(event); },
    });
    try {
      own.interrupt();
      await until(() => events.includes('realtime_subscription_lost'), 'subscription lost');
      const before = own.accepted();
      own.hold(800);
      own.restore();
      await until(() => own.accepted() > before, 'the reconnect attempt reached the proxy');
      await subscriber.close();
      await delay(2_000);
      assert.deepEqual(
        { queue: subscriber.queueName(), brokerSockets: own.open(), restored: events.includes('realtime_subscription_restored') },
        { queue: undefined, brokerSockets: 0, restored: false },
      );
    } finally {
      await own.stop();
    }
  });
});
