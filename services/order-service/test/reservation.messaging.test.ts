/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: The test topology binds order.rejected (new Order outcome, Notification Redesign §9) so the mandatory outbox
 * flush routes it, and the rejection case asserts the committed fact's reason code, statuses and SYSTEM actor.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-21
 * Scope: Exercise Credit result publication through Debezium and keep late-delivery cases behind an offline Order consumer.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Google Antigravity (model: Claude Opus 4.6), date: 2026-10-19
 * Scope: Updated reservation messaging integration test for Saga Approach B2 (PENDING/OPEN/REJECTED/EXPIRED orders and order.expired late-reservation refund).
 * Author review: Reviewed and verified by Yee Yan Hwee (yanhwee)
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-19
 * Scope: Verify infrastructure recovery, release compensation, bounded event retries and immediate malformed-event dead-lettering.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Real PostgreSQL/RabbitMQ reservation saga, restart, rollback, duplicate, rejection and compensation tests.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by yanhwee)
import type { CreditReservationRequestEvent, CreditReservationResultEvent } from '@campus-errand/common-dtos';
import { createRabbitPublisher, queueArguments } from '@campus-errand/messaging';
import amqp from 'amqplib';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { setTimeout as delay } from 'node:timers/promises';
import { classifyCreditFailure, startCreditConsumer } from '../../credit-service/src/credits/consumer';
import { createCreditEventHandler, creditRoutingKeys } from '../../credit-service/src/credits/events';
import { createCreditService } from '../../credit-service/src/credits/service';
import { createCreditStore } from '../../credit-service/src/credits/store';
import { PrismaClient as CreditPrisma } from '../../credit-service/src/database/client';
import { PrismaClient as OrderPrisma } from '../src/database/client';
import { classifyReservationFailure, reservationResultKeys, startReservationConsumer } from '../src/messaging/reservation.consumer';
import { createOrderRepository } from '../src/repositories/order.repository';

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
  // Both services recognize Prisma connection, raw-query, pool and wrapped network failures.
  for (const classify of [classifyReservationFailure, classifyCreditFailure]) {
    for (const failure of [
      { code: 'P1001' }, { errorCode: 'P1002' }, { code: 'P1008' }, { code: 'P1017' },
      { code: 'P2024' }, { code: 'P2034' }, { code: 'P2037' },
      { code: 'P2010', meta: { code: '57P01' } }, { code: '08006' },
      new Error('wrapped', { cause: { code: 'ECONNRESET' } }),
    ]) assert.equal(classify(failure).category, 'infrastructure');
    for (const failure of [new Error('unknown'), { code: 'P2002' }, { code: 'P1000' },
      { code: 'P2010', meta: { code: '42601' } }]) assert.notEqual(classify(failure).category, 'infrastructure');
    const cyclic: { cause?: unknown } = {}; cyclic.cause = cyclic;
    assert.equal(classify(cyclic).category, 'transient');
  }
  const orders = new OrderPrisma({ datasources: { db: { url: testUrl('ORDER_TEST_DATABASE_URL') } } });
  const credit = new CreditPrisma({ datasources: { db: { url: testUrl('CREDIT_TEST_DATABASE_URL') } } });
  const url = process.env.CREDIT_TEST_RABBITMQ_URL ?? 'amqp://credit_test:credit-test-dev@localhost:5672/campus';
  const prefix = `credit-test.saga-${randomUUID()}`;
  const exchange = process.env.SAGA_TEST_EXCHANGE ?? 'credit-test.saga-cdc.events';
  const config = (side: string) => ({ url, exchange, queue: `${prefix}.${side}`,
    deadLetterExchange: `${prefix}.${side}.dlq`, deadLetterQueue: `${prefix}.${side}.dlq`, retryDelayMs: 50, retryLimit: 5 });
  const cc = config('credit'); const oc = config('order');
  const connection = await amqp.connect(url);
  connection.on('error', () => {});
  const channel = await connection.createConfirmChannel();
  const rabbitPublisher = createRabbitPublisher({ url });
  const publish = rabbitPublisher.publish;
  const orderRepo = createOrderRepository(orders);
  const orderHandler = {
    handleReservationResult: (event: CreditReservationResultEvent) => orderRepo.applyReservationResult(event),
  };
  const store = createCreditStore(credit);
  const credits = createCreditService(store);
  const users: string[] = [];
  const ids: string[] = [];
  const commandIds: string[] = [];
  let creditConsumer: Awaited<ReturnType<typeof startCreditConsumer>> | undefined;
  let orderConsumer: Awaited<ReturnType<typeof startReservationConsumer>> | undefined;
  const emit = (event: { eventType: string; eventId: string }) => publish(exchange, event.eventType, Buffer.from(JSON.stringify(event)), { messageId: event.eventId });
  async function flushOrderOutbox() {
    const pending = await orders.outboxEvent.findMany({
      where: { status: 'PENDING' },
      orderBy: { createdAt: 'asc' },
    });
    for (const row of pending) {
      if (!ids.includes(row.aggregateId)) continue;
      await emit(JSON.parse(row.payload));
      await orders.outboxEvent.update({ where: { id: row.id }, data: { status: 'DELIVERED' } });
    }
  }
  async function submit(rewardCredits = 15, expiresAt = new Date(Date.now() + 600000)) {
    const requesterId = randomUUID(); users.push(requesterId);
    await credits.initializeWallet(requesterId);
    const id = randomUUID(); ids.push(id); commandIds.push(id);
    const reservationEvent: CreditReservationRequestEvent = {
      eventId: id,
      correlationId: id,
      timestamp: new Date().toISOString(),
      eventType: 'order.reservation.requested',
      orderId: id,
      requesterId,
      rewardCredits,
    };
    await orderRepo.createOrderWithOutbox(
      {
        id,
        orderCode: `ORD-${id.slice(0, 8)}`,
        requesterId,
        supplierId: randomUUID(),
        supplierName: 'Saga test',
        campusZone: 'Campus',
        itemDescription: 'Meal',
        dropoffLocation: 'Hall',
        rewardCredits,
        expiresAt,
      },
      reservationEvent
    );
    return { id, requesterId };
  }
  const getResult = async (id: string) => {
    const rows = await credit.creditOutboxEvent.findMany();
    return rows.map(row => JSON.parse(row.payload)).find(event => event.correlationId === id);
  };
  async function pump() { await flushOrderOutbox(); }
  try {
    // Provision durable routes before consumers start, just as definitions.json does in Compose.
    await channel.assertExchange(exchange, 'topic', { durable: true });
    for (const [cfg, keys] of [[cc, creditRoutingKeys], [oc, reservationResultKeys]] as const) {
      await channel.assertQueue(cfg.queue, { durable: true, arguments: queueArguments(cfg) });
      for (const key of keys) await channel.bindQueue(cfg.queue, exchange, key);
    }
    await channel.assertQueue(`${prefix}.created`, { durable: true });
    await channel.bindQueue(`${prefix}.created`, exchange, 'order.created');
    // AI-generated (edited by Reallyeasy1): order.rejected is an Order outcome for the Notification Service, which is
    // not part of this topology; the outbox flush publishes mandatory, so it needs a sink too.
    await channel.bindQueue(`${prefix}.created`, exchange, 'order.rejected');

    const first = await submit();
    assert.equal((await orders.order.findUniqueOrThrow({ where: { id: first.id } })).status, 'PENDING');
    await flushOrderOutbox();
    assert.equal((await channel.checkQueue(cc.queue)).messageCount, 1);
    assert.equal((await orders.order.findUniqueOrThrow({ where: { id: first.id } })).status, 'PENDING');
    creditConsumer = await startCreditConsumer(cc, credits);
    await until(() => getResult(first.id), 'durable reservation result');
    assert.equal((await credits.getWallet(first.requesterId)).escrowCredits, 15);
    assert.equal((await orders.order.findUniqueOrThrow({ where: { id: first.id } })).status, 'PENDING');
    // A restart after the credit commit cannot lose the result waiting in its outbox.
    await creditConsumer.close();
    await until(async () => (await channel.checkQueue(oc.queue)).messageCount === 1, 'CDC publishes the committed result');
    assert.equal((await channel.checkQueue(oc.queue)).messageCount, 1);
    orderConsumer = await startReservationConsumer(oc, orderHandler);
    await until(async () => (await orders.order.findUnique({ where: { id: first.id } }))?.status === 'OPEN', 'confirmed order');
    assert.equal((await orders.order.findUniqueOrThrow({ where: { id: first.id } })).status, 'OPEN');
    creditConsumer = await startCreditConsumer(cc, credits);
    const command = JSON.parse((await orders.outboxEvent.findUniqueOrThrow({ where: { id: first.id } })).payload) as CreditReservationRequestEvent;
    await Promise.all([emit(command), emit(command), emit(await getResult(first.id)), emit(await getResult(first.id))]);
    await delay(150);
    assert.equal(await credit.creditTransaction.count({ where: { orderId: first.id, transactionType: 'ESCROW_HOLD' } }), 1);
    assert.equal(await orders.order.count({ where: { id: first.id } }), 1);
    assert.equal((await orders.outboxEvent.findMany({ where: { eventType: 'order.created' } })).filter(row => JSON.parse(row.payload).orderId === first.id).length, 1);

    const rejected = await submit(1000);
    await until(async () => { await pump(); return (await orders.order.findUnique({ where: { id: rejected.id } }))?.status === 'REJECTED'; }, 'insufficient funds rejection');
    const rejectedOrder = await orders.order.findUniqueOrThrow({ where: { id: rejected.id } });
    assert.equal(rejectedOrder.status, 'REJECTED');
    assert.ok(rejectedOrder.rejectionReason);
    const rejectedFact = (await orders.outboxEvent.findMany({ where: { eventType: 'order.rejected' } }))
      .map(row => JSON.parse(row.payload)).find(payload => payload.orderId === rejected.id);
    assert.deepEqual([rejectedFact?.reasonCode, rejectedFact?.previousStatus, rejectedFact?.status, rejectedFact?.actorRole],
      ['INSUFFICIENT_CREDITS', 'PENDING', 'REJECTED', 'SYSTEM']);
    assert.equal(await credit.creditEscrow.count({ where: { orderId: rejected.id } }), 0);
    assert.equal((await credits.getWallet(rejected.requesterId)).availableCredits, 100);

    // Funds were reserved in time, but the success reaches Order only after expiry.
    await orderConsumer.close(); orderConsumer = undefined;
    const late = await submit(12, new Date(Date.now() + 1200));
    await flushOrderOutbox();
    await until(() => getResult(late.id), 'late reservation committed');
    assert.equal((await credits.getWallet(late.requesterId)).escrowCredits, 12);
    await delay(1300);
    orderConsumer = await startReservationConsumer(oc, orderHandler);
    // Refund commands (order.expired) must survive infrastructure failures beyond the event budget.
    await creditConsumer.close();
    let refundAttempts = 0;
    let refundUnavailable = true;
    creditConsumer = await startCreditConsumer(cc, { ...credits, applyEvent: async (identity, cmd) => {
      if (cmd.kind === 'refund' && cmd.body.orderId === late.id && refundUnavailable) {
        refundAttempts++;
        throw Object.assign(new Error('Injected exhausted database pool'), { code: 'P2024' });
      }
      return credits.applyEvent(identity, cmd);
    } });
    await until(async () => { await pump(); return refundAttempts >= 8; }, 'refund retries past event limit');
    assert.equal((await orders.order.findUniqueOrThrow({ where: { id: late.id } })).status, 'EXPIRED');
    assert.equal((await credits.getWallet(late.requesterId)).escrowCredits, 12);
    assert.equal((await channel.checkQueue(cc.deadLetterQueue)).messageCount, 0);
    refundUnavailable = false;
    await until(async () => { await pump(); return (await credits.getWallet(late.requesterId)).availableCredits === 100; }, 'late-success refund');
    assert.equal((await orders.order.findUniqueOrThrow({ where: { id: late.id } })).status, 'EXPIRED');
    assert.equal((await credits.getWallet(late.requesterId)).availableCredits, 100);
    assert.equal(await credit.creditTransaction.count({ where: { orderId: late.id, transactionType: 'ESCROW_REFUND' } }), 1);
    const expiredEvt = (await orders.outboxEvent.findMany({ where: { eventType: 'order.expired' } })).find(row => JSON.parse(row.payload).orderId === late.id)!;
    commandIds.push(expiredEvt.id);
    await emit(JSON.parse(expiredEvt.payload)); await emit(await getResult(late.id)); await delay(100);
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

    // Order status transition (PENDING -> OPEN) and order.created publication are also one transaction.
    await orderConsumer.close(); orderConsumer = undefined;
    await flushOrderOutbox();
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
    await assert.rejects(createOrderRepository(faultDb).applyReservationResult(await getResult(rollback.id)), /Injected/);
    assert.equal((await orders.order.findUniqueOrThrow({ where: { id: rollback.id } })).status, 'PENDING');
    orderConsumer = await startReservationConsumer(oc, orderHandler);
    await until(async () => (await orders.order.findUnique({ where: { id: rollback.id } }))?.status === 'OPEN', 'order after consumer restart');

    // An Order database outage cannot exhaust the result retries or strand the hold.
    await orderConsumer.close();
    const recovering = await submit();
    let resultAttempts = 0;
    orderConsumer = await startReservationConsumer(oc, { handleReservationResult: async event => {
      if (event.orderId === recovering.id) {
        resultAttempts++;
        throw Object.assign(new Error('Injected database restart'), { code: 'P2010', meta: { code: '57P01' } });
      }
      await orderHandler.handleReservationResult(event);
    } });
    await until(async () => { await pump(); return resultAttempts >= 8; }, 'result retries past event limit');
    assert.equal((await orders.order.findUniqueOrThrow({ where: { id: recovering.id } })).status, 'PENDING');
    assert.equal((await credits.getWallet(recovering.requesterId)).escrowCredits, 15);
    assert.equal((await channel.checkQueue(oc.deadLetterQueue)).messageCount, 0);
    await orderConsumer.close();
    orderConsumer = await startReservationConsumer(oc, orderHandler);
    await until(async () => (await orders.order.findUnique({ where: { id: recovering.id } }))?.status === 'OPEN', 'infrastructure recovery after restart');
    assert.equal((await orders.order.findUniqueOrThrow({ where: { id: recovering.id } })).status, 'OPEN');
    assert.equal(await credit.creditTransaction.count({ where: { orderId: recovering.id, transactionType: 'ESCROW_HOLD' } }), 1);

    // Unknown event failures remain bounded; malformed events skip retries entirely.
    await orderConsumer.close();
    let eventAttempts = 0;
    orderConsumer = await startReservationConsumer(oc, { handleReservationResult: async () => {
      eventAttempts++; throw new Error('Injected processing bug');
    } });
    await emit(await getResult(recovering.id));
    await until(async () => (await channel.checkQueue(oc.deadLetterQueue)).messageCount === 1, 'bounded Order retries');
    const exhausted = await channel.get(oc.deadLetterQueue, { noAck: true });
    assert(exhausted);
    assert.equal(eventAttempts, 6);
    assert.equal(exhausted.properties.headers?.['x-first-death-queue'], oc.queue);
    assert.equal(exhausted.properties.headers?.['x-first-death-reason'], 'rejected');
    await publish(exchange, 'credit.reservation.succeeded', Buffer.from('{invalid'));
    await until(async () => (await channel.checkQueue(oc.deadLetterQueue)).messageCount === 1, 'invalid event DLQ');
    const invalid = await channel.get(oc.deadLetterQueue, { noAck: true });
    assert(invalid);
    assert.equal(invalid.properties.headers?.['x-first-death-queue'], oc.queue);
    assert.equal(invalid.properties.headers?.['x-first-death-reason'], 'rejected');
    assert.equal(eventAttempts, 6);
    console.log('PASS: infrastructure retry recovery, bounded event retries, invalid-event DLQ, PENDING order saga, offline consumers, persisted results, duplicate safety, insufficient funds, late-success expiry refund, atomic rollbacks and restart recovery');
  } finally {
    await orderConsumer?.close(); await creditConsumer?.close();
    await rabbitPublisher.close();
    for (const cfg of [cc, oc]) {
      for (const queue of [cfg.queue, cfg.deadLetterQueue]) await channel.deleteQueue(queue);
      await channel.deleteExchange(cfg.deadLetterExchange);
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
