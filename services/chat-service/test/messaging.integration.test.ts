/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: End-to-end test of the consumer with a real broker and database (the pattern of the Notification Service's
 * messaging suite): order.accepted creates the conversation, a redelivery changes nothing, in_transit and completed
 * set their timestamps, a terminal event for an unknown order is acknowledged without a row, and a malformed
 * message is dead-lettered without blocking the queue.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
// Opt in with CHAT_TEST_DATABASE_URL and CHAT_TEST_RABBITMQ_URL (an account allowed to declare chat-service.events.test-*).
// Uses its own exchange and queues and its own database schema, and removes them afterwards; the real queue is never touched.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import amqp from 'amqplib';
import type { MessagingConfig } from '../src/messaging/rabbitmq';
import { startChatConsumer } from '../src/conversations/events';
import { createConversationStore } from '../src/conversations/store';
import { ALICE, BOB, CAROL, makeTestDatabase, until } from './helpers';

const databaseUrl = process.env.CHAT_TEST_DATABASE_URL;
const brokerUrl = process.env.CHAT_TEST_RABBITMQ_URL;

describe('order events to conversations (RabbitMQ + PostgreSQL)', { skip: !databaseUrl || !brokerUrl }, () => {
  const prefix = `chat-service.events.test-${randomUUID().slice(0, 8)}`;
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
  let consumer: Awaited<ReturnType<typeof startChatConsumer>>;
  let connection: Awaited<ReturnType<typeof amqp.connect>>;
  let channel: Awaited<ReturnType<Awaited<ReturnType<typeof amqp.connect>>['createConfirmChannel']>>;

  const event = (eventType: string, orderId: string, overrides: Record<string, unknown> = {}) => ({
    eventId: randomUUID(),
    eventType,
    timestamp: '2026-10-20T04:00:00.000Z',
    orderId,
    requesterId: ALICE,
    courierId: BOB,
    ...overrides,
  });
  const publish = (content: Buffer, routingKey: string) =>
    new Promise<void>((resolve, reject) => {
      channel.publish(config.exchange, routingKey, content, { persistent: true }, (error) => (error ? reject(error) : resolve()));
    });
  const publishEvent = (e: Record<string, unknown>) => publish(Buffer.from(JSON.stringify(e)), String(e.eventType));
  const row = (orderId: string) => database.db.conversation.findUnique({ where: { orderId } });

  before(async () => {
    database = await makeTestDatabase(databaseUrl!);
    consumer = await startChatConsumer(config, createConversationStore(database.db));
    connection = await amqp.connect(brokerUrl!);
    channel = await connection.createConfirmChannel();
    await until(() => consumer.isReady(), 'consumer ready');
  });

  after(async () => {
    await consumer.close();
    for (const queue of [config.queue, config.retryQueue, config.deadLetterQueue]) await channel.deleteQueue(queue).catch(() => {});
    for (const exchange of [config.exchange, config.retryExchange, config.deadLetterExchange]) await channel.deleteExchange(exchange).catch(() => {});
    await connection.close();
    await database.drop();
  });

  it('projects the lifecycle onto one row and ignores a redelivered accept', async () => {
    const orderId = randomUUID();
    const accepted = event('order.accepted', orderId);
    await publishEvent(accepted);
    const created = await until(() => row(orderId), 'conversation created');
    assert.deepEqual([created.requesterId, created.courierId, created.closedAt], [ALICE, BOB, null]);

    await publishEvent(accepted);
    await publishEvent(event('order.in_transit', orderId, { timestamp: '2026-10-20T04:10:00.000Z' }));
    await until(async () => (await row(orderId))?.pickedUpAt, 'picked up');
    await publishEvent(event('order.accepted', orderId, { courierId: CAROL, timestamp: '2026-10-20T04:20:00.000Z' }));
    await until(async () => (await row(orderId))?.courierId === CAROL, 'courier replaced');
    await publishEvent(event('order.completed', orderId, { courierId: CAROL, timestamp: '2026-10-20T05:00:00.000Z' }));
    const closed = await until(async () => (await row(orderId))?.closedAt && row(orderId), 'closed');
    assert.deepEqual(
      [closed.id, closed.createdAt.toISOString(), closed.pickedUpAt?.toISOString(), closed.closedAt?.toISOString()],
      [created.id, '2026-10-20T04:00:00.000Z', '2026-10-20T04:10:00.000Z', '2026-10-20T05:00:00.000Z'],
    );
    assert.equal(await database.db.conversation.count(), 1);
  });

  it('acknowledges a terminal event for an unknown order and dead-letters a malformed message, keeping the queue draining', async () => {
    await publish(Buffer.from('{not json'), 'order.accepted');
    const stray = randomUUID();
    await publishEvent(event('order.expired', stray, { courierId: undefined }));
    const orderId = randomUUID();
    await publishEvent(event('order.accepted', orderId));
    await until(() => row(orderId), 'queue still drains after the malformed message');
    assert.equal(await row(stray), null);
    const dead = await until(() => channel.get(config.deadLetterQueue, { noAck: true }).then((m) => m || undefined), 'dead-lettered message');
    assert.equal(dead.properties.headers?.['x-chat-failure-category'], 'permanent');
    assert.equal(dead.properties.headers?.['x-chat-original-routing-key'], 'order.accepted');
  });
});
