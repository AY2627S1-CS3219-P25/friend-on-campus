/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Real PostgreSQL/RabbitMQ reservation saga, restart, rollback, duplicate, rejection and compensation tests.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import amqp from 'amqplib';
import { PrismaClient as OrderPrisma } from '../src/database/client';
import { PrismaClient as CreditPrisma } from '../../credit-service/src/database/client';
import { createReservationSaga, type SubmissionPayload } from '../src/orders/reservation.saga';
import { createRabbitMQPublisher } from '../src/messaging/event.publisher';
import { createOutboxRelay } from '../src/messaging/outbox.relay';
import { startReservationConsumer, reservationResultKeys } from '../src/messaging/reservation.consumer';
import { createCreditStore } from '../../credit-service/src/credits/store';
import { createCreditService } from '../../credit-service/src/credits/service';
import { createCreditEventHandler, creditRoutingKeys } from '../../credit-service/src/credits/events';
import { startCreditConsumer } from '../../credit-service/src/credits/consumer';
import { createCreditOutbox } from '../../credit-service/src/messaging/outbox';
import { createConfirmedPublisher } from '../../credit-service/src/messaging/rabbitmq';

function testUrl(name: string) {
  const value = process.env[name];
  if (!value || !new URL(value).pathname.endsWith('_test')) throw new Error(`${name} must select an isolated _test database`);
  return value;
}
async function until(check: () => Promise<unknown>, label: string) {
  const deadline = Date.now() + 15000;
  while (Date.now() < deadline) { if (await check()) return; await delay(25); }
  throw new Error(`Timed out: ${label}`);
}

async function main() {
  const orders = new OrderPrisma({ datasources: { db: { url: testUrl('ORDER_TEST_DATABASE_URL') } } });
  const credit = new CreditPrisma({ datasources: { db: { url: testUrl('CREDIT_TEST_DATABASE_URL') } } });
  const url = process.env.CREDIT_TEST_RABBITMQ_URL ?? 'amqp://credit_test:credit-test-dev@localhost:5672/campus';
  const prefix = `credit-test.saga-${randomUUID()}`;
  const exchange = `${prefix}.events`;
  const config = (side: string) => ({ url, exchange, queue: `${prefix}.${side}`, retryExchange: `${prefix}.${side}.retry`,
    retryQueue: `${prefix}.${side}.retry`, deadLetterExchange: `${prefix}.${side}.dlq`, deadLetterQueue: `${prefix}.${side}.dlq`, retryDelayMs: 50, retryLimit: 5 });
  const cc = config('credit'); const oc = config('order');
  const connection = await amqp.connect(url);
  connection.on('error', () => {});
  const channel = await connection.createConfirmChannel();
  const publish = createConfirmedPublisher(channel);
  const publisher = createRabbitMQPublisher({ url, exchange });
  const relay = createOutboxRelay({ prisma: orders, publisher });
  const results = createCreditOutbox(credit, { url, exchange });
  const saga = createReservationSaga(orders);
  const store = createCreditStore(credit);
  const credits = createCreditService(store);
  const users: string[] = [];
  const ids: string[] = [];
  const commandIds: string[] = [];
  let creditConsumer: Awaited<ReturnType<typeof startCreditConsumer>> | undefined;
  let orderConsumer: Awaited<ReturnType<typeof startReservationConsumer>> | undefined;
  const emit = (event: { eventType: string; eventId: string }) => publish(exchange, event.eventType, Buffer.from(JSON.stringify(event)), { messageId: event.eventId });
  async function submit(rewardCredits = 15, expiresAt = new Date(Date.now() + 600000)) {
    const requesterId = randomUUID(); users.push(requesterId);
    await credits.initializeWallet(requesterId);
    const id = randomUUID(); ids.push(id); commandIds.push(id);
    await saga.submit({ id, orderCode: `ORD-${id.slice(0, 8)}`, requesterId, supplierId: randomUUID(),
      supplierName: 'Saga test', campusZone: 'Campus', itemDescription: 'Meal', dropoffLocation: 'Hall', rewardCredits, expiresAt });
    return { id, requesterId };
  }
  const getResult = async (id: string) => {
    const rows = await credit.creditOutboxEvent.findMany();
    return rows.map(row => JSON.parse(row.payload)).find(event => event.correlationId === id);
  };
  async function pump() { await relay.processPending(); await results.processPending(); }
  try {
    // Provision durable routes before consumers start, just as definitions.json does in Compose.
    await channel.assertExchange(exchange, 'topic', { durable: true });
    for (const [cfg, keys] of [[cc, creditRoutingKeys], [oc, reservationResultKeys]] as const) {
      await channel.assertQueue(cfg.queue, { durable: true });
      for (const key of keys) await channel.bindQueue(cfg.queue, exchange, key);
    }
    await channel.assertQueue(`${prefix}.created`, { durable: true });
    await channel.bindQueue(`${prefix}.created`, exchange, 'order.created');

    const first = await submit();
    assert.equal(await orders.order.count({ where: { id: first.id } }), 0);
    assert.equal((await saga.get(first.id, first.requesterId)).status, 'PENDING');
    await assert.rejects(saga.get(first.id, randomUUID()), /authorized/);
    await relay.processPending();
    assert.equal((await channel.checkQueue(cc.queue)).messageCount, 1);
    assert.equal(await orders.order.count({ where: { id: first.id } }), 0);
    creditConsumer = await startCreditConsumer(cc, credits);
    await until(() => getResult(first.id), 'durable reservation result');
    assert.equal((await credits.getWallet(first.requesterId)).escrowCredits, 15);
    assert.equal(await orders.order.count({ where: { id: first.id } }), 0);
    // A restart after the credit commit cannot lose the result waiting in its outbox.
    await creditConsumer.close();
    await results.processPending();
    assert.equal((await channel.checkQueue(oc.queue)).messageCount, 1);
    orderConsumer = await startReservationConsumer(oc, saga);
    await until(() => orders.order.findUnique({ where: { id: first.id } }), 'confirmed order');
    assert.equal((await saga.get(first.id, first.requesterId)).status, 'OPEN');
    creditConsumer = await startCreditConsumer(cc, credits);
    const request = JSON.parse((await orders.outboxEvent.findUniqueOrThrow({ where: { id: first.id } })).payload) as SubmissionPayload;
    const { submission: _localDetails, ...command } = request;
    await Promise.all([emit(command), emit(command), emit(await getResult(first.id)), emit(await getResult(first.id))]);
    await delay(150);
    assert.equal(await credit.creditTransaction.count({ where: { orderId: first.id, transactionType: 'ESCROW_HOLD' } }), 1);
    assert.equal(await orders.order.count({ where: { id: first.id } }), 1);
    assert.equal((await orders.outboxEvent.findMany({ where: { eventType: 'order.created' } })).filter(row => JSON.parse(row.payload).orderId === first.id).length, 1);

    const rejected = await submit(1000);
    await until(async () => { await pump(); return (await saga.get(rejected.id, rejected.requesterId)).status === 'REJECTED'; }, 'insufficient funds rejection');
    assert.equal(await orders.order.count({ where: { id: rejected.id } }), 0);
    assert.equal(await credit.creditEscrow.count({ where: { orderId: rejected.id } }), 0);
    assert.equal((await credits.getWallet(rejected.requesterId)).availableCredits, 100);

    const expired = await submit(10, new Date(Date.now() - 1000));
    await until(async () => { await pump(); return (await saga.get(expired.id, expired.requesterId)).status === 'REJECTED'; }, 'expired request rejection');
    assert.equal(await credit.creditEscrow.count({ where: { orderId: expired.id } }), 0);

    // Funds were reserved in time, but the success reaches Order only after expiry.
    const late = await submit(12, new Date(Date.now() + 1200));
    await relay.processPending();
    await until(() => getResult(late.id), 'late reservation committed');
    assert.equal((await credits.getWallet(late.requesterId)).escrowCredits, 12);
    await delay(1300);
    await until(async () => { await pump(); return (await saga.get(late.id, late.requesterId)).status === 'COMPENSATED'; }, 'late-success refund');
    assert.equal(await orders.order.count({ where: { id: late.id } }), 0);
    assert.equal((await credits.getWallet(late.requesterId)).availableCredits, 100);
    assert.equal(await credit.creditTransaction.count({ where: { orderId: late.id, transactionType: 'ESCROW_REFUND' } }), 1);
    const release = (await orders.outboxEvent.findMany({ where: { eventType: 'order.reservation.release_requested' } })).find(row => JSON.parse(row.payload).orderId === late.id)!;
    commandIds.push(release.id);
    await emit(JSON.parse(release.payload)); await emit(await getResult(late.id)); await delay(100);
    assert.equal(await credit.creditTransaction.count({ where: { orderId: late.id, transactionType: 'ESCROW_REFUND' } }), 1);

    // Credit's balance, dedup marker, and response must all roll back if the outbox insert fails.
    const rollback = await submit();
    const stored = JSON.parse((await orders.outboxEvent.findUniqueOrThrow({ where: { id: rollback.id } })).payload);
    const failingCredits = createCreditService({ ...store, transaction: operation => store.transaction(tx => operation({
      ...tx, addOutbox: () => { throw new Error('Injected credit outbox failure'); },
    })) });
    await assert.rejects(createCreditEventHandler(failingCredits)(Buffer.from(JSON.stringify(stored)), stored.eventType), /Injected/);
    assert.equal(await credit.creditEscrow.count({ where: { orderId: rollback.id } }), 0);
    assert.equal(await credit.processedCreditEvent.count({ where: { eventId: rollback.id } }), 0);
    assert.equal((await credits.getWallet(rollback.requesterId)).availableCredits, 100);

    // Order insertion and order.created publication are also one transaction.
    await orderConsumer.close(); orderConsumer = undefined;
    await relay.processPending();
    await until(() => getResult(rollback.id), 'result after retry');
    const faultDb = new Proxy(orders, { get(target, property) {
      if (property === '$transaction') return (operation: (tx: unknown) => Promise<unknown>) => target.$transaction(tx => operation(new Proxy(tx, {
        get(inner, key) { return key === 'outboxEvent' ? new Proxy(inner.outboxEvent, { get(delegate, method) {
          if (method === 'create') return () => { throw new Error('Injected order outbox failure'); };
          return Reflect.get(delegate, method);
        } }) : Reflect.get(inner, key); },
      })));
      return Reflect.get(target, property);
    } });
    await assert.rejects(createReservationSaga(faultDb).handleResult(await getResult(rollback.id)), /Injected/);
    assert.equal(await orders.order.count({ where: { id: rollback.id } }), 0);
    await results.processPending();
    orderConsumer = await startReservationConsumer(oc, saga);
    await until(() => orders.order.findUnique({ where: { id: rollback.id } }), 'order after consumer restart');
    console.log('PASS: outbox-only submissions, offline consumers, persisted results, duplicate safety, insufficient funds, expiry compensation, atomic rollbacks and restart recovery');
  } finally {
    await orderConsumer?.close(); await creditConsumer?.close();
    await relay.stop(); await publisher.close(); await results.stop();
    for (const cfg of [cc, oc]) {
      for (const queue of [cfg.queue, cfg.retryQueue, cfg.deadLetterQueue]) await channel.deleteQueue(queue);
      for (const ex of [cfg.retryExchange, cfg.deadLetterExchange]) await channel.deleteExchange(ex);
    }
    await channel.deleteQueue(`${prefix}.created`); await channel.deleteExchange(exchange);
    await channel.close(); await connection.close();
    const all = await orders.outboxEvent.findMany();
    const ownRows = all.filter(row => ids.includes(JSON.parse(row.payload).orderId)).map(row => row.id);
    await orders.outboxEvent.deleteMany({ where: { id: { in: ownRows } } });
    await orders.order.deleteMany({ where: { id: { in: ids } } });
    const responses = await credit.creditOutboxEvent.findMany();
    await credit.creditOutboxEvent.deleteMany({ where: { id: { in: responses.filter(row => ids.includes(JSON.parse(row.payload).orderId)).map(row => row.id) } } });
    await credit.processedCreditEvent.deleteMany({ where: { eventId: { in: [...commandIds, ...ownRows] } } });
    await credit.creditTransaction.deleteMany({ where: { OR: [{ fromUserId: { in: users } }, { toUserId: { in: users } }] } });
    await credit.creditEscrow.deleteMany({ where: { orderId: { in: ids } } });
    await credit.creditGrant.deleteMany({ where: { userId: { in: users } } });
    await credit.creditWallet.deleteMany({ where: { userId: { in: users } } });
    await orders.$disconnect(); await credit.$disconnect();
  }
}
void main().catch(error => { console.error(error); process.exitCode = 1; });
