/**
 * AI Assistance Disclosure:
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
import type { MessagingConfig } from '../src/messaging/rabbitmq';
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
    retryExchange: `${prefix}.retry`,
    retryQueue: `${prefix}.retry`,
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

  const accepted = (overrides: Record<string, unknown> = {}) => ({
    eventId: randomUUID(),
    eventType: 'order.accepted',
    timestamp: '2026-10-05T04:00:00.000Z',
    orderId: randomUUID(),
    orderCode: 'ORD-0042',
    requesterId: ALICE,
    courierId: BOB,
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

    consumer = await startNotificationConsumer(config, createDeliver(store, hub.push));
    connection = await amqp.connect(config.url);
    channel = await connection.createConfirmChannel();
  });

  after(async () => {
    await consumer?.close();
    if (channel) {
      for (const queue of [config.queue, config.retryQueue, config.deadLetterQueue]) await channel.deleteQueue(queue);
      for (const exchange of [config.exchange, config.retryExchange, config.deadLetterExchange]) await channel.deleteExchange(exchange);
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
});
