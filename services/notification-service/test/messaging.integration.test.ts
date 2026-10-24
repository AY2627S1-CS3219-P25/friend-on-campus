/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Increment 6 (2026-10-23): a settlement receipt reaches the courier once. Per the author's Notification Redesign: a version-1 order.completed is acknowledged and suppressed, and a
 * version-2 admin cancellation reaches requester and courier once each (two sockets, two rows, replay adds nothing).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-21
 * Scope: Retry-path tests rewritten for the native quorum-queue redelivery of PR #145 (no retry queue; x-delivery-count and the broker's x-death / x-first-death-* headers instead of the former x-notification-* headers).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-19
 * Scope: Added the retry path: a transient failure is retried and delivered once it clears, and a failure that outlasts retryLimit is dead-lettered while the main queue keeps draining; the consumer is started through a deliver wrapper that can simulate the outage.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-17
 * Scope: The accepted event carries courierUsername and the pushed frame's body is asserted (F5.1.1).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: End-to-end test of the consumer with a real broker and database: an order.accepted event becomes one row
 * and one pushed frame, a redelivery adds neither, and a malformed message is dead-lettered without blocking the queue.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
// Opt in with NOTIFICATION_TEST_DATABASE_URL and NOTIFICATION_TEST_RABBITMQ_URL (the notification_service account).
// Uses its own exchange and queues under notification-service.events.test-<id> and its own database schema, and
// removes them afterwards; the real queue is never touched.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import amqp, { type GetMessage } from 'amqplib';
import { WebSocketServer } from 'ws';
import type { MessagingConfig } from '@campus-errand/messaging';
import { createDeliver, startNotificationConsumer } from '../src/notifications/events';
import { createNotificationStore } from '../src/notifications/store';
import { createHub, createSocketAuthenticator } from '../src/ws/hub';
import { ALICE, AUDIENCE, BOB, ISSUER, makeKeys, makeTestDatabase, openSocket, signToken, until } from './helpers';

const databaseUrl = process.env.NOTIFICATION_TEST_DATABASE_URL;
const brokerUrl = process.env.NOTIFICATION_TEST_RABBITMQ_URL;

describe('order events to notifications (RabbitMQ + PostgreSQL)', { skip: !databaseUrl || !brokerUrl }, () => {
  const keys = makeKeys();
  const prefix = `notification-service.events.test-${randomUUID().slice(0, 8)}`;
  const config: MessagingConfig = {
    url: brokerUrl!,
    exchange: `${prefix}.in`,
    queue: prefix,
    deadLetterExchange: `${prefix}.dlx`,
    deadLetterQueue: `${prefix}.dlq`,
    retryDelayMs: 50,
    retryLimit: 2,
  };
  let database: Awaited<ReturnType<typeof makeTestDatabase>>;
  let wss: WebSocketServer;
  let hub: ReturnType<typeof createHub>;
  let consumer: Awaited<ReturnType<typeof startNotificationConsumer>>;
  let connection: Awaited<ReturnType<typeof amqp.connect>>;
  let channel: Awaited<ReturnType<Awaited<ReturnType<typeof amqp.connect>>['createConfirmChannel']>>;
  let alice: Awaited<ReturnType<typeof openSocket>>;
  let bob: Awaited<ReturnType<typeof openSocket>>;
  const outage = { remaining: 0 };

  const accepted = (overrides: Record<string, unknown> = {}) => ({
    eventId: randomUUID(),
    eventType: 'order.accepted',
    timestamp: '2026-10-05T04:00:00.000Z',
    orderId: randomUUID(),
    orderCode: 'ORD-0042',
    requesterId: ALICE,
    courierId: BOB,
    courierUsername: 'bob',
    ...overrides,
  });
  const publish = (content: Buffer, routingKey = 'order.accepted') =>
    new Promise<void>((resolve, reject) => {
      channel.publish(config.exchange, routingKey, content, { persistent: true }, (error) => (error ? reject(error) : resolve()));
    });
  const publishEvent = (event: Record<string, unknown>) => publish(Buffer.from(JSON.stringify(event)), String(event.eventType));
  const rowsFor = (userId: string) => database.db.notification.count({ where: { userId } });

  before(async () => {
    database = await makeTestDatabase(databaseUrl!);
    const store = createNotificationStore(database.db);
    hub = createHub({
      authenticate: createSocketAuthenticator({ publicKey: keys.publicKey, issuer: ISSUER, audience: AUDIENCE }),
      unreadCount: store.unreadCount,
    });
    wss = new WebSocketServer({ port: 0 });
    wss.on('connection', hub.handleConnection);
    await new Promise<void>((resolve) => wss.once('listening', resolve));
    alice = await openSocket(`ws://127.0.0.1:${(wss.address() as AddressInfo).port}`);
    alice.send({ type: 'AUTH', token: signToken(keys.privateKey, ALICE) });
    await alice.frame('AUTH_OK');
    bob = await openSocket(`ws://127.0.0.1:${(wss.address() as AddressInfo).port}`);
    bob.send({ type: 'AUTH', token: signToken(keys.privateKey, BOB) });
    await bob.frame('AUTH_OK');

    // AI-generated (edited by Reallyeasy1)
    // outage.remaining > 0 makes the next deliveries throw a plain error, standing in for an unexpected handler
    // failure (the retry budget; connectivity errors would retry without limit).
    const deliver = createDeliver(store, hub);
    consumer = await startNotificationConsumer(config, async (event) => {
      if (outage.remaining > 0) {
        outage.remaining -= 1;
        throw new Error('simulated handler failure');
      }
      await deliver(event);
    });
    connection = await amqp.connect(config.url);
    channel = await connection.createConfirmChannel();
  });

  after(async () => {
    await consumer?.close();
    if (channel) {
      for (const queue of [config.queue, config.deadLetterQueue]) await channel.deleteQueue(queue);
      for (const exchange of [config.exchange, config.deadLetterExchange]) await channel.deleteExchange(exchange);
      await channel.close();
    }
    await connection?.close();
    alice?.ws.close();
    bob?.ws.close();
    hub?.close();
    if (wss) await new Promise<void>((resolve) => wss.close(() => resolve()));
    await database?.drop();
  });

  it('stores one row and pushes one frame for order.accepted; a redelivery adds neither', async () => {
    const event = accepted();
    await publishEvent(event);
    const frame = await alice.frame('NOTIFICATION');
    assert.equal(frame.data.title, 'Your errand ORD-0042 was accepted');
    assert.equal(frame.data.body, 'bob accepted your errand and will pick the items up next.');
    assert.equal(frame.data.orderId, event.orderId);
    assert.equal(frame.data.courierId, BOB);
    assert.equal(frame.data.createdAt, event.timestamp);
    assert.equal(await rowsFor(ALICE), 1);

    await publishEvent(event);
    // The queue is consumed one message at a time, so once this later event is stored the redelivery was handled.
    await publishEvent(accepted({ requesterId: BOB, courierId: ALICE }));
    await until(async () => (await rowsFor(BOB)) === 1, 'the event after the redelivery');
    assert.equal(await rowsFor(ALICE), 1);
    assert.equal(alice.frames.filter((f) => f.type === 'NOTIFICATION').length, 1);
  });

  it('acknowledges a version-1 event that has no recipient policy and records it as suppressed', async () => {
    const legacy = accepted({ eventType: 'order.completed' });
    await publishEvent(legacy);
    await publishEvent(accepted({ requesterId: BOB, courierId: ALICE }));
    await until(async () => (await rowsFor(BOB)) === 2, 'the event after order.completed');
    assert.equal(await rowsFor(ALICE), 1);
    const processed = await database.db.processedNotificationEvent.findUnique({
      where: { producer_eventId: { producer: 'order-service', eventId: String(legacy.eventId) } },
    });
    assert.equal(processed?.outcome, 'suppressed');
  });

  // AI-generated (edited by Reallyeasy1)
  it('a version-2 admin cancellation reaches requester and courier once each; a redelivery adds nothing', async () => {
    const orderId = randomUUID();
    const cancelled = {
      eventId: randomUUID(),
      eventType: 'order.cancelled',
      timestamp: '2026-10-22T10:30:00.000Z',
      schemaVersion: 2,
      producer: 'order-service',
      orderId,
      orderCode: 'ORD-1042',
      orderVersion: 5,
      previousStatus: 'ACCEPTED',
      status: 'CANCELLED',
      requesterId: ALICE,
      courierId: BOB,
      actorId: '90000000-0000-4000-8000-000000000001',
      actorRole: 'ADMIN',
      reasonCode: 'ADMIN_CANCELLED',
      rewardCredits: 8,
      correlationId: orderId,
    };
    const before = { alice: alice.frames.length, bob: bob.frames.length };
    await publishEvent(cancelled);
    const forAlice = await until(() => alice.frames.slice(before.alice).find((f) => f.type === 'NOTIFICATION'), 'requester frame');
    const forBob = await until(() => bob.frames.slice(before.bob).find((f) => f.type === 'NOTIFICATION'), 'courier frame');
    assert.deepEqual([forAlice.data.kind, forAlice.data.category, forAlice.data.priority, forAlice.data.orderStatus], ['ORDER_CANCELLED', 'IMPORTANT', 'HIGH', 'CANCELLED']);
    assert.equal(forBob.data.body, 'An administrator cancelled ORD-1042. Open the errand for its current status.');
    assert.ok(alice.frames.slice(before.alice).some((f) => f.type === 'INBOX_CHANGED'), 'the requester tab is told to refetch');
    assert.equal(await database.db.notification.count({ where: { orderId } }), 2);

    await publishEvent(cancelled);
    await publishEvent(accepted({ requesterId: BOB, courierId: ALICE }));
    await until(async () => (await rowsFor(BOB)) === 4, 'the event after the redelivery');
    assert.equal(await database.db.notification.count({ where: { orderId } }), 2);
    assert.equal(alice.frames.slice(before.alice).filter((f) => f.type === 'NOTIFICATION').length, 1);
    const state = await database.db.orderNotificationState.findUniqueOrThrow({ where: { orderId } });
    assert.deepEqual([state.highestOrderVersion, state.status, state.courierId], [5, 'CANCELLED', BOB]);
  });

  // AI-generated (edited by Reallyeasy1)
  it('a credit settlement receipt reaches the courier as a quiet CREDITS_RECEIVED row under producer credit-service', async () => {
    const orderId = randomUUID();
    const settled = {
      eventId: randomUUID(), eventType: 'credit.escrow.settled', timestamp: '2026-10-23T04:00:00.000Z',
      schemaVersion: 2, producer: 'credit-service', orderId, orderCode: 'ORD-2001', correlationId: orderId,
      ledgerTransactionId: randomUUID(), transactionCode: 'TX-feedbeef', amount: 8,
      beneficiaryId: BOB, requesterId: ALICE, courierId: BOB,
    };
    const before = bob.frames.length;
    await publishEvent(settled);
    const frame = await until(() => bob.frames.slice(before).find((f) => f.type === 'NOTIFICATION'), 'courier receipt');
    assert.deepEqual([frame.data.kind, frame.data.category, frame.data.priority, frame.data.actionType, frame.data.producer, frame.data.orderStatus],
      ['CREDITS_RECEIVED', 'RECEIPT', 'NORMAL', 'REVIEW_WALLET', 'credit-service', null]);
    assert.equal(frame.data.title, '8 credits received');
    assert.equal(await database.db.orderNotificationState.count({ where: { orderId } }), 0, 'a receipt never creates a projection');
    await publishEvent(settled);
    await publishEvent(accepted({ requesterId: BOB, courierId: ALICE }));
    await until(async () => (await rowsFor(BOB)) === 6, 'the event after the replayed receipt');
    assert.equal(await database.db.notification.count({ where: { orderId } }), 1);
  });

  it('dead-letters a malformed message and keeps draining the queue', async () => {
    await publish(Buffer.from('not json'));
    await until(async () => (await channel.checkQueue(config.deadLetterQueue)).messageCount === 1, 'the dead-lettered message');
    await publishEvent(accepted());
    await until(async () => (await rowsFor(ALICE)) === 2, 'the event after the malformed one');
    assert.equal((await channel.checkQueue(config.queue)).messageCount, 0);
    assert.equal(consumer.isReady(), true);
  });

  // AI-generated (edited by Reallyeasy1): ported from PR #140; counts are relative to the rows the earlier tests stored.
  it('requeues a transient failure on the quorum queue and delivers once it clears', async () => {
    const rowsBefore = await rowsFor(ALICE);
    const dlqBefore = (await channel.checkQueue(config.deadLetterQueue)).messageCount;
    outage.remaining = 1;
    const event = accepted();
    await publishEvent(event);
    const frame = await until(() => alice.frames.find((f) => f.type === 'NOTIFICATION' && f.data.orderId === event.orderId), 'the redelivered notification');
    assert.equal(frame.data.title, 'Your errand ORD-0042 was accepted');
    assert.equal(outage.remaining, 0, 'the first attempt failed');
    await until(async () => (await rowsFor(ALICE)) === rowsBefore + 1, 'one row for the redelivered event');
    await until(async () => (await channel.checkQueue(config.queue)).messageCount === 0, 'the redelivery was consumed from the main queue');
    assert.equal((await channel.checkQueue(config.deadLetterQueue)).messageCount, dlqBefore, 'nothing new is dead-lettered');
    assert.equal(consumer.isReady(), true);
  });

  it('dead-letters after the retry limit with the native x-death headers and keeps draining the queue', async () => {
    const rowsBefore = await rowsFor(ALICE);
    const dlqBefore = (await channel.checkQueue(config.deadLetterQueue)).messageCount;
    const budget = 10;
    outage.remaining = budget;
    const event = accepted();
    let attempts = 0;
    try {
      await publishEvent(event);
      await until(async () => (await channel.checkQueue(config.deadLetterQueue)).messageCount === dlqBefore + 1, 'the exhausted message is dead-lettered');
      attempts = budget - outage.remaining;
    } finally {
      outage.remaining = 0;
    }
    assert.equal(attempts, config.retryLimit + 1, 'the first delivery plus retryLimit redeliveries failed');
    assert.equal(await rowsFor(ALICE), rowsBefore, 'nothing was stored');
    assert.equal(alice.frames.some((f) => f.type === 'NOTIFICATION' && f.data.orderId === event.orderId), false, 'nothing was pushed');

    // Drain the dead-letter queue: the malformed message from the earlier test and the exhausted one.
    const dead: GetMessage[] = [];
    for (let message = await channel.get(config.deadLetterQueue, { noAck: true }); message; message = await channel.get(config.deadLetterQueue, { noAck: true })) dead.push(message);
    const malformed = dead.find((m) => m.content.toString() === 'not json');
    assert.ok(malformed, 'the malformed message from the earlier test is there');
    assert.equal(malformed.properties.headers?.['x-first-death-reason'], 'rejected');
    assert.equal(malformed.properties.headers?.['x-first-death-queue'], config.queue);

    const exhausted = dead.find((m) => m.content.toString() === JSON.stringify(event));
    assert.ok(exhausted, 'the exhausted message keeps its original content');
    const headers = exhausted.properties.headers ?? {};
    assert.equal(headers['x-first-death-reason'], 'rejected', 'dead-lettered by basic.nack(requeue=false)');
    assert.equal(headers['x-first-death-queue'], config.queue);
    assert.equal(headers['x-first-death-exchange'], config.exchange);
    const death = (headers['x-death'] as Array<{ reason: string; queue: string; 'routing-keys': string[] }> | undefined)?.[0];
    assert.ok(death, 'x-death is recorded');
    assert.equal(death.queue, config.queue);
    assert.deepEqual(death['routing-keys'], ['order.accepted'], 'the original routing key is kept');
    assert.equal((await channel.checkQueue(config.deadLetterQueue)).messageCount, 0);

    await publishEvent(accepted());
    await until(async () => (await rowsFor(ALICE)) === rowsBefore + 1, 'the event after the exhausted one');
    assert.equal((await channel.checkQueue(config.queue)).messageCount, 0);
    assert.equal(consumer.isReady(), true);
  });
});
