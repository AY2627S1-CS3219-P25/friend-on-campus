/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6); Claude Code (model: Claude Fable 5.1), date: 2026-10-20 to 2026-11-08
 * Scope: End-to-end test of the consumer with a real broker and database (the pattern of the Notification Service's messaging suite): order.accepted creates the..; updated across 2 AI-assisted revisions through D4 wrap-up (verify quorum declarations, broker dead-letter metadata and recovery beyond the handler retry budget).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
// Opt in with CHAT_TEST_DATABASE_URL and CHAT_TEST_RABBITMQ_URL (an account allowed to declare chat-service.events.test-*).
// Uses its own exchange and queues and its own database schema, and removes them afterwards; the real queue is never touched.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import amqp from 'amqplib';
import { queueArguments, type MessagingConfig } from '@campus-errand/messaging';
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
    deadLetterExchange: `${prefix}.dlx`,
    deadLetterQueue: `${prefix}.dlq`,
    retryDelayMs: 50,
    retryLimit: 2,
  };
  let database: Awaited<ReturnType<typeof makeTestDatabase>>;
  let consumer: Awaited<ReturnType<typeof startChatConsumer>>;
  let connection: Awaited<ReturnType<typeof amqp.connect>>;
  let channel: Awaited<ReturnType<Awaited<ReturnType<typeof amqp.connect>>['createConfirmChannel']>>;
  const outage = { remaining: 0, code: 'P1001' };

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
    const store = createConversationStore(database.db);
    consumer = await startChatConsumer(config, {
      ...store,
      async upsertAccepted(input) {
        if (outage.remaining-- > 0) throw Object.assign(new Error('simulated outage'), { code: outage.code });
        return store.upsertAccepted(input);
      },
    });
    connection = await amqp.connect(brokerUrl!);
    channel = await connection.createConfirmChannel();
    await until(() => consumer.isReady(), 'consumer ready');
  });

  after(async () => {
    await consumer.close();
    for (const queue of [config.queue, config.deadLetterQueue]) await channel.deleteQueue(queue).catch(() => {});
    for (const exchange of [config.exchange, config.deadLetterExchange]) await channel.deleteExchange(exchange).catch(() => {});
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
    assert.equal(dead.properties.headers?.['x-first-death-reason'], 'rejected');
    assert.equal(dead.properties.headers?.['x-first-death-queue'], config.queue);
    assert.deepEqual(dead.properties.headers?.['x-death']?.[0]?.['routing-keys'], ['order.accepted']);
  });

  it('uses a quorum queue and recovers from a database outage longer than the normal retry allowance', async () => {
    await channel.assertQueue(config.queue, { durable: true, arguments: queueArguments(config) });
    const orderId = randomUUID();
    outage.remaining = config.retryLimit + 3;
    try {
      await publishEvent(event('order.accepted', orderId));
      await until(() => row(orderId), 'conversation created after database recovery');
      assert.equal((await channel.checkQueue(config.deadLetterQueue)).messageCount, 0);
    } finally {
      outage.remaining = 0;
    }
  });

  it('keeps unexpected handler failures bounded and continues with later messages', async () => {
    const failedOrder = randomUUID();
    outage.code = 'UNEXPECTED';
    outage.remaining = config.retryLimit + 2;
    try {
      await publishEvent(event('order.accepted', failedOrder));
      const dead = await until(() => channel.get(config.deadLetterQueue, { noAck: true }).then((m) => m || undefined), 'exhausted handler failure');
      assert.equal(JSON.parse(dead.content.toString()).orderId, failedOrder);
      assert.equal(outage.remaining, 1, 'one initial attempt plus the configured retries');
      assert.equal(await row(failedOrder), null);
    } finally {
      outage.remaining = 0;
      outage.code = 'P1001';
    }
    const nextOrder = randomUUID();
    await publishEvent(event('order.accepted', nextOrder));
    await until(() => row(nextOrder), 'later event still processed');
  });
});
