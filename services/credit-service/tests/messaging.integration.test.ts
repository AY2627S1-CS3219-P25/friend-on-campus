/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Retained messaging and readiness regression coverage with injected HTTP authentication.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { fork, type ChildProcess } from 'node:child_process';
import { setTimeout as delay } from 'node:timers/promises';
import amqp, { type GetMessage } from 'amqplib';
import { PrismaClient } from '../src/database/client';
import { createApp } from '../src/app';
import { createCreditService } from '../src/credits/service';
import { createCreditStore, type CreditStore } from '../src/credits/store';
import { createCreditEventHandler, creditRoutingKeys } from '../src/credits/events';
import { classifyCreditFailure, startCreditConsumer } from '../src/credits/consumer';
import { createConfirmedPublisher, startRabbitConsumer, type MessagingConfig } from '../src/messaging/rabbitmq';
import { createTestAuth } from './auth-fixture';

async function until<T>(check: () => Promise<T>, label: string): Promise<NonNullable<T>> {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) {
    const value = await check();
    if (value) return value as NonNullable<T>;
    await delay(25);
  }
  throw new Error(`Timed out: ${label}`);
}
function database() {
  const url = process.env.CREDIT_TEST_DATABASE_URL;
  if (!url || !new URL(url).pathname.includes('_test')) throw new Error('CREDIT_TEST_DATABASE_URL must identify an isolated _test database');
  return new PrismaClient({ datasources: { db: { url } } });
}

// Separate process is intentionally killed between commit and ack to exercise real redelivery.
async function crashWorker() {
  const db = database();
  const config: MessagingConfig = JSON.parse(process.env.CREDIT_TEST_MESSAGING_CONFIG!);
  assert(config.queue.startsWith('credit-test.'));
  const handle = createCreditEventHandler(createCreditService(createCreditStore(db)));
  await startRabbitConsumer(config, {
    routingKeys: creditRoutingKeys, classify: classifyCreditFailure,
    handle: async (body, key) => {
      await handle(body, key);
      process.send?.('committed');
      await new Promise<void>(() => {});
    },
  });
  process.send?.('ready');
}

async function main() {
  const db = database();
  const store = createCreditStore(db);
  const credits = createCreditService(store);
  const handle = createCreditEventHandler(credits);
  const prefix = `credit-test.${randomUUID()}`;
  const config: MessagingConfig = {
    url: process.env.CREDIT_TEST_RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    exchange: `${prefix}.events`, queue: `${prefix}.credit`,
    retryExchange: `${prefix}.retry`, retryQueue: `${prefix}.retry`,
    deadLetterExchange: `${prefix}.dlx`, deadLetterQueue: `${prefix}.dlq`, retryDelayMs: 60, retryLimit: 5,
  };
  const connection = await amqp.connect(config.url);
  connection.on('error', () => {});
  const channel = await connection.createConfirmChannel();
  channel.on('error', () => {});
  const publish = createConfirmedPublisher(channel);
  const users: string[] = [];
  const events: string[] = [];
  const user = () => { const id = randomUUID(); users.push(id); return id; };
  function event(eventType: string, fields: Record<string, unknown>): Record<string, unknown> & { eventId: string; eventType: string; timestamp: string } {
    const eventId = randomUUID(); events.push(eventId);
    return { eventId, eventType, timestamp: new Date().toISOString(), ...fields };
  }
  const send = (value: ReturnType<typeof event>) => publish(config.exchange, value.eventType, Buffer.from(JSON.stringify(value)), { contentType: 'application/json', messageId: value.eventId });
  const processed = (value: ReturnType<typeof event>) => until(() => db.processedCreditEvent.findUnique({ where: { eventId: value.eventId } }), value.eventType);
  const dead = async () => (await until(() => channel.get(config.deadLetterQueue, { noAck: true }), 'dead-letter')) as GetMessage;
  let consumer: Awaited<ReturnType<typeof startRabbitConsumer>> | undefined;
  let child: ChildProcess | undefined;
  const app = createApp({ credits, authenticate: createTestAuth().authenticate, port: 0, isReady: async () => {
    await db.$queryRaw`SELECT 1`;
    return consumer?.isReady() ?? false;
  } });
  const server = app.listen(0, '127.0.0.1');
  try {
    await once(server, 'listening');
    const address = server.address(); assert(address && typeof address !== 'string');
    const base = `http://127.0.0.1:${address.port}`;
    assert.equal((await fetch(`${base}/ready`)).status, 503);
    consumer = await startCreditConsumer(config, credits);
    assert.equal((await fetch(`${base}/ready`)).status, 200);
    // Declaration and consumer restart must be repeatable with existing topology.
    await consumer.close();
    consumer = await startCreditConsumer(config, credits);
    assert(consumer.isReady());
    await assert.rejects(publish('', `${prefix}.missing`, Buffer.from('{}')), /unroutable/);

    const registered = user();
    const registration = event('user.registered', { userId: registered, email: 'mq@example.test', initialGrant: 70 });
    await send(registration); await processed(registration);
    await send(registration);
    const registration2 = event('user.registered', { userId: registered, email: 'mq@example.test', initialGrant: 70 });
    await send(registration2); await processed(registration2);
    assert.equal((await credits.getWallet(registered)).availableCredits, 70);
    assert.equal((await credits.getLedger(registered)).filter(t => t.transactionType === 'WELCOME_GRANT').length, 1);
    await send({ ...registration, initialGrant: 71 });
    assert.equal((await dead()).properties.headers!['x-credit-failure-category'], 'permanent');
    const conflict = event('user.registered', { userId: registered, email: 'mq@example.test', initialGrant: 100 });
    await send(conflict); await dead();
    assert.equal(await db.processedCreditEvent.count({ where: { eventId: conflict.eventId } }), 0);
    const lazy = user(); await credits.getWallet(lazy);
    const lazyEvent = event('user.registered', { userId: lazy, email: 'lazy@example.test', initialGrant: 100 });
    await send(lazyEvent); await processed(lazyEvent);
    assert.equal((await credits.getWallet(lazy)).availableCredits, 100);
    assert.equal((await credits.getLedger(lazy)).length, 1);

    const orderId = randomUUID(); const courierId = user();
    const reservation = { orderId, requesterId: registered, amount: 20 };
    const httpReserve = (body: unknown) => fetch(`${base}/api/credits/escrow/reserve`, {
      method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
    });
    assert.equal((await httpReserve(reservation)).status, 200);
    assert.equal((await httpReserve(reservation)).status, 200);
    assert.equal((await httpReserve({ ...reservation, amount: 21 })).status, 409);
    assert.equal((await httpReserve({ ...reservation, requesterId: user() })).status, 409);
    assert.equal((await credits.getWallet(registered)).escrowCredits, 20);
    const completion = event('order.completed', { orderId, requesterId: registered, courierId, rewardCredits: 20 });
    await send(completion); await processed(completion);
    const secondCompletion = event('order.completed', { orderId, requesterId: registered, courierId, rewardCredits: 20 });
    await send(secondCompletion); await processed(secondCompletion);
    await credits.settle({ ...reservation, courierId });
    assert.equal((await credits.getWallet(courierId)).availableCredits, 120);
    assert.equal((await credits.getLedger(courierId)).filter(t => t.transactionType === 'ESCROW_RELEASE').length, 1);
    await assert.rejects(credits.refund(reservation), /already settled/);
    await assert.rejects(credits.settle({ ...reservation, courierId: user() }), /courier conflicts/);

    for (const type of ['order.cancelled', 'order.expired']) {
      const refundOrder = randomUUID();
      const body = { orderId: refundOrder, requesterId: registered, amount: 10 };
      await credits.reserve(body);
      const refundEvent = event(type, { orderId: refundOrder, requesterId: registered, rewardCredits: 10 });
      await send(refundEvent); await processed(refundEvent);
      const duplicate = event(type, { orderId: refundOrder, requesterId: registered, rewardCredits: 10 });
      await send(duplicate); await processed(duplicate);
      await credits.refund(body);
      await assert.rejects(credits.settle({ ...body, courierId }), /already refunded/);
      assert.equal((await credits.getLedger(registered)).filter(t => t.orderId === refundOrder && t.transactionType === 'ESCROW_REFUND').length, 1);
    }
    assert.equal((await credits.getWallet(registered)).availableCredits, 50);
    const contested = { requesterId: registered, orderId: randomUUID(), amount: 5 };
    await credits.reserve(contested);
    const outcomes = await Promise.allSettled([credits.settle({ ...contested, courierId }), credits.refund(contested)]);
    assert.equal(outcomes.filter(result => result.status === 'fulfilled').length, 1);
    assert.equal(outcomes.filter(result => result.status === 'rejected').length, 1);
    const terminalEntries = (await credits.getLedger(registered)).filter(t =>
      t.orderId === contested.orderId && ['ESCROW_RELEASE', 'ESCROW_REFUND'].includes(t.transactionType));
    assert.equal(terminalEntries.length, 1);

    // Invalid JSON and invalid field values must not reach credit rules.
    await publish(config.exchange, 'user.registered', Buffer.from('{'));
    assert.equal((await dead()).content.toString(), '{');
    const invalids = [
      { eventId: 'bad' }, { userId: 'bad' }, { timestamp: '2026-02-30T12:00:00Z' },
      { timestamp: 'yesterday' }, { initialGrant: -1 }, { initialGrant: 1.5 }, { email: 'bad' },
    ];
    for (const fields of invalids) {
      const invalid = { ...registration, ...fields };
      await send(invalid);
      assert.equal((await dead()).properties.headers!['x-credit-failure-reason'], 'invalid_event');
    }
    // Direct enqueue tests an unsupported event that would normally be filtered by bindings.
    const unknown = event('order.unknown', {});
    await publish('', config.queue, Buffer.from(JSON.stringify(unknown)), { headers: { 'x-credit-original-routing-key': unknown.eventType } });
    assert.equal((await dead()).properties.headers!['x-credit-failure-category'], 'permanent');
    await publish(config.exchange, 'order.completed', Buffer.from(JSON.stringify(registration)));
    assert.equal((await dead()).properties.headers!['x-credit-failure-reason'], 'invalid_event');

    // Losing DLQ routing must retain the original delivery, not acknowledge-and-drop it.
    await channel.unbindQueue(config.deadLetterQueue, config.deadLetterExchange, config.deadLetterQueue);
    await publish(config.exchange, 'user.registered', Buffer.from('{"broken":true}'));
    await until(async () => !consumer!.isReady(), 'unroutable forwarding stops consumer');
    await consumer.close();
    assert.equal((await channel.checkQueue(config.queue)).messageCount, 1);
    consumer = await startCreditConsumer(config, credits); // Restores the missing binding.
    assert.equal((await dead()).content.toString(), '{"broken":true}');

    // Two active consumers contend for the same event and different IDs for the same business action.
    const second = await startCreditConsumer(config, credits);
    try {
      const concurrentUser = user();
      const concurrent = event('user.registered', { userId: concurrentUser, email: 'race@example.test', initialGrant: 35 });
      await Promise.all(Array.from({ length: 8 }, () => send(concurrent)));
      const duplicates = Array.from({ length: 6 }, () => event('user.registered', { userId: concurrentUser, email: 'race@example.test', initialGrant: 35 }));
      await Promise.all(duplicates.map(send)); await Promise.all(duplicates.map(processed));
      assert.equal((await credits.getWallet(concurrentUser)).availableCredits, 35);
      assert.equal((await credits.getLedger(concurrentUser)).length, 1);
      const raceOrder = randomUUID();
      await Promise.all(Array.from({ length: 6 }, () => credits.reserve({ orderId: raceOrder, requesterId: concurrentUser, amount: 10 })));
      const races = Array.from({ length: 6 }, () => event('order.completed', { orderId: raceOrder, requesterId: concurrentUser, courierId, rewardCredits: 10 }));
      await Promise.all(races.map(send)); await Promise.all(races.map(processed));
      assert.equal((await credits.getLedger(concurrentUser)).filter(t => t.transactionType === 'ESCROW_RELEASE').length, 1);
    } finally { await second.close(); }
    await consumer.close();

    // Inject temporary failures at the processing boundary, retaining real broker retry routing.
    const transient = event('user.registered', { userId: user(), email: 'retry@example.test', initialGrant: 45 });
    const exhausted = event('user.registered', { userId: user(), email: 'exhausted@example.test', initialGrant: 45 });
    const rollbackUser = user(); const rollbackOrder = randomUUID();
    await credits.reserve({ requesterId: rollbackUser, orderId: rollbackOrder, amount: 10 });
    const rollback = event('order.completed', { orderId: rollbackOrder, requesterId: rollbackUser, courierId: user(), rewardCredits: 10 });
    const beforeRollback = await credits.getWallet(rollbackUser);
    const collision = (await credits.getLedger(registered))[0].transactionCode;
    const failingStore: CreditStore = { ...store, transaction: operation => store.transaction(tx => operation({
      ...tx, addTransaction: data => tx.addTransaction({ ...data, transactionCode: collision }),
    })) };
    const failHandler = createCreditEventHandler(createCreditService(failingStore));
    const attempts = new Map<string, number>();
    consumer = await startRabbitConsumer(config, {
      routingKeys: creditRoutingKeys, classify: classifyCreditFailure,
      handle: async (body, key) => {
        const id = JSON.parse(body.toString()).eventId;
        const attempt = (attempts.get(id) ?? 0) + 1; attempts.set(id, attempt);
        if (id === exhausted.eventId || (id === transient.eventId && attempt <= 2)) throw new Error('Injected temporary dependency failure');
        if (id === rollback.eventId && attempt === 1) {
          try { await failHandler(body, key); }
          catch (error) {
            assert.deepEqual(await credits.getWallet(rollbackUser), beforeRollback);
            assert.equal(await db.processedCreditEvent.count({ where: { eventId: id } }), 0);
            assert.equal((await db.creditEscrow.findUniqueOrThrow({ where: { orderId: rollbackOrder } })).state, 'RESERVED');
            throw error;
          }
          assert.fail('Expected a real PostgreSQL uniqueness failure');
        }
        await handle(body, key);
      },
    });
    await send(transient); await processed(transient);
    assert.equal(attempts.get(transient.eventId), 3);
    await send(rollback); await processed(rollback);
    assert.equal(attempts.get(rollback.eventId), 2);
    assert.equal((await credits.getWallet(rollbackUser)).escrowCredits, 0);
    await send(exhausted);
    const exhaustedMessage = await dead();
    assert.equal(attempts.get(exhausted.eventId), 6);
    assert.equal(exhaustedMessage.properties.headers!['x-credit-retry-count'], 5);
    assert.equal(exhaustedMessage.properties.headers!['x-credit-original-routing-key'], 'user.registered');
    assert.equal(exhaustedMessage.properties.messageId, exhausted.eventId);
    assert.deepEqual(JSON.parse(exhaustedMessage.content.toString()), exhausted);
    assert.equal(await db.creditWallet.count({ where: { userId: exhausted.userId as string } }), 0);
    await consumer.close();

    // Restart while a message waits in the durable retry queue.
    const delayedConfig = { ...config, retryDelayMs: 500 };
    const delayed = event('user.registered', { userId: user(), email: 'delayed@example.test', initialGrant: 30 });
    consumer = await startRabbitConsumer(delayedConfig, {
      routingKeys: creditRoutingKeys, classify: classifyCreditFailure, handle: async () => { throw new Error('Temporary failure'); },
    });
    await send(delayed);
    await delay(150);
    await consumer.close();
    consumer = await startCreditConsumer(delayedConfig, credits);
    await processed(delayed);
    assert.equal((await credits.getWallet(delayed.userId as string)).availableCredits, 30);
    await consumer.close();

    // Commit followed by SIGKILL leaves an unacknowledged delivery in RabbitMQ.
    child = fork(__filename, ['--redelivery-child'], {
      execArgv: ['--import', 'tsx'], env: { ...process.env, CREDIT_TEST_MESSAGING_CONFIG: JSON.stringify(config) },
      stdio: ['ignore', 'inherit', 'inherit', 'ipc'],
    });
    const waitChild = (expected: string) => new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => { cleanup(); reject(new Error(`Child did not report ${expected}`)); }, 10000);
      const receive = (message: unknown) => { if (message === expected) { cleanup(); resolve(); } };
      const exited = () => { cleanup(); reject(new Error('Child exited early')); };
      function cleanup() { clearTimeout(timeout); child!.off('message', receive); child!.off('exit', exited); }
      child!.on('message', receive); child!.on('exit', exited);
    });
    await waitChild('ready');
    const crashEvent = event('user.registered', { userId: user(), email: 'crash@example.test', initialGrant: 60 });
    const committed = waitChild('committed');
    await send(crashEvent); await committed;
    const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited; child = undefined;
    let redelivered = false;
    consumer = await startRabbitConsumer(config, {
      routingKeys: creditRoutingKeys, classify: classifyCreditFailure,
      handle: async (body, key) => { await handle(body, key); redelivered = true; },
    });
    await until(async () => redelivered, 'committed event redelivery');
    assert.equal((await credits.getWallet(crashEvent.userId as string)).availableCredits, 60);
    assert.equal((await credits.getLedger(crashEvent.userId as string)).length, 1);
    await consumer.close();
    assert.equal((await fetch(`${base}/ready`)).status, 503);
    assert.equal((await fetch(`${base}/health`)).status, 200);
    console.log('PASS: real RabbitMQ contracts, grants, HTTP/event idempotency, concurrency, confirms/returns, DLQ, retries, database rollback, readiness, durable retry restart, and commit-before-ack crash redelivery');
  } finally {
    if (child && child.exitCode === null && child.signalCode === null) {
      const exited = once(child, 'exit'); child.kill('SIGKILL'); await exited;
    }
    await consumer?.close();
    await new Promise<void>(resolve => server.close(() => resolve()));
    try {
      for (const queue of [config.queue, config.retryQueue, config.deadLetterQueue]) await channel.deleteQueue(queue);
      for (const exchange of [config.exchange, config.retryExchange, config.deadLetterExchange]) await channel.deleteExchange(exchange);
    } finally { await connection.close(); }
    try {
      await db.processedCreditEvent.deleteMany({ where: { eventId: { in: events } } });
      await db.creditEscrow.deleteMany({ where: { requesterId: { in: users } } });
      await db.creditTransaction.deleteMany({ where: { OR: [{ fromUserId: { in: users } }, { toUserId: { in: users } }] } });
      await db.creditGrant.deleteMany({ where: { userId: { in: users } } });
      await db.creditWallet.deleteMany({ where: { userId: { in: users } } });
    } finally { await db.$disconnect(); }
  }
}
void (process.argv.includes('--redelivery-child') ? crashWorker() : main()).catch(error => {
  console.error(error instanceof Error ? error.message : 'Integration test failed'); process.exitCode = 1;
});
