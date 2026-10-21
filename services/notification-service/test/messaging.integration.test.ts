/**
 * AI Assistance Disclosure:
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
import amqp from 'amqplib';
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

    // AI-generated (edited by Reallyeasy1)
    // outage.remaining > 0 makes the next deliveries throw a transient error, standing in for a database outage.
    const deliver = createDeliver(store, hub.push);
    consumer = await startNotificationConsumer(config, async (event, draft) => {
      if (outage.remaining > 0) {
        outage.remaining -= 1;
        throw new Error('simulated database outage');
      }
      await deliver(event, draft);
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

  it('acknowledges events that map to no notification', async () => {
    await publishEvent(accepted({ eventType: 'order.created' }));
    await publishEvent(accepted({ requesterId: BOB, courierId: ALICE }));
    await until(async () => (await rowsFor(BOB)) === 2, 'the event after order.created');
    assert.equal(await rowsFor(ALICE), 1);
  });

  it('dead-letters a malformed message and keeps draining the queue', async () => {
    await publish(Buffer.from('not json'));
    await until(async () => (await channel.checkQueue(config.deadLetterQueue)).messageCount === 1, 'the dead-lettered message');
    await publishEvent(accepted());
    await until(async () => (await rowsFor(ALICE)) === 2, 'the event after the malformed one');
    assert.equal((await channel.checkQueue(config.queue)).messageCount, 0);
    assert.equal(consumer.isReady(), true);
  });

  // AI-generated (edited by Reallyeasy1)
  it('requeues a transient failure on the quorum queue and delivers once it clears', async () => {
    outage.remaining = 1;
    const event = accepted();
    await publishEvent(event);
    const frame = await until(() => alice.frames.find((f) => f.type === 'NOTIFICATION' && f.data.orderId === event.orderId), 'the redelivered notification');
    assert.equal(frame.data.title, 'Your errand ORD-0042 was accepted');
    assert.equal(outage.remaining, 0, 'the first attempt failed');
    assert.equal(await rowsFor(ALICE), 3);
    assert.equal((await channel.checkQueue(config.queue)).messageCount, 0, 'the redelivery was consumed from the main queue');
    assert.equal((await channel.checkQueue(config.deadLetterQueue)).messageCount, 1, 'only the malformed message is dead-lettered');
    assert.equal(consumer.isReady(), true);
  });

  it('dead-letters after the retry limit with the native x-death headers and keeps draining the queue', async () => {
    const budget = 10;
    outage.remaining = budget;
    const event = accepted();
    let attempts = 0;
    try {
      await publishEvent(event);
      await until(async () => (await channel.checkQueue(config.deadLetterQueue)).messageCount === 2, 'the second dead-lettered message');
      attempts = budget - outage.remaining;
    } finally {
      outage.remaining = 0;
    }
    assert.equal(attempts, config.retryLimit + 1, 'the first delivery plus retryLimit redeliveries failed');
    assert.equal(await rowsFor(ALICE), 3, 'nothing was stored');
    assert.equal(alice.frames.some((f) => f.type === 'NOTIFICATION' && f.data.orderId === event.orderId), false, 'nothing was pushed');

    const malformed = await channel.get(config.deadLetterQueue, { noAck: true });
    assert.ok(malformed, 'the malformed message from the earlier test comes first');
    assert.equal(malformed.content.toString(), 'not json');
    assert.equal(malformed.properties.headers?.['x-first-death-reason'], 'rejected');
    assert.equal(malformed.properties.headers?.['x-first-death-queue'], config.queue);

    const exhausted = await channel.get(config.deadLetterQueue, { noAck: true });
    assert.ok(exhausted, 'the exhausted message');
    assert.deepEqual(JSON.parse(exhausted.content.toString()), event, 'the original content is kept');
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
    await until(async () => (await rowsFor(ALICE)) === 4, 'the event after the exhausted one');
    assert.equal((await channel.checkQueue(config.queue)).messageCount, 0);
    assert.equal(consumer.isReady(), true);
  });
});
