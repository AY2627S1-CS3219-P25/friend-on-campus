/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Unit checks for the conversation rules: open uses the local row, else the Order Service fallback (S4) and
 * fails closed on 404 or outage; read for participants and admins, not others (F8.1.2, D8); send only for
 * participants while open, blank text rejected, sender name and role from the token (F8.2, F8.2.2, F8.2.3, F8.3.2);
 * history in sequence order (F8.3.1). In-memory store and a fake Order Service.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fixes (PR #148 P1, P2): regressions for a close or re-courier committed between send's pre-check and
 * the append (racingStore), and for accept A, accept B, replay A keeping only B authorised.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Review fix (PR #148, second round): a terminal Order fallback whose row is created by an accept event during
 * the lookup still returns a closed conversation and later sends are refused.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { OrderClient, OrderLookupResult } from '../src/clients/order.client';
import { createConversationService } from '../src/conversations/service';
import { ADMIN, ALICE, BOB, CAROL, ORDER, memoryStore, principal } from './helpers';

const TOKEN = 'token';
const fakeOrders = (result: OrderLookupResult): OrderClient & { calls: string[] } => {
  const calls: string[] = [];
  return { calls, async getOrder(orderId) { calls.push(orderId); return result; } };
};
const accepted: OrderLookupResult = {
  kind: 'found',
  order: { id: ORDER, requesterId: ALICE, courierId: BOB, status: 'ACCEPTED', acceptedAt: '2026-10-20T04:00:00.000Z', completedAt: null },
};

test('open returns the local row without calling the Order Service', async () => {
  const { store } = memoryStore();
  await store.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: '2026-10-20T04:00:00.000Z' });
  const orders = fakeOrders({ kind: 'not_found' });
  const service = createConversationService({ store, orders });
  const result = await service.open(ORDER, principal(ALICE), TOKEN);
  assert.equal(result.kind, 'found');
  assert.deepEqual(orders.calls, []);
});

test('open with no row creates it from the Order Service (S4), once', async () => {
  const { store, conversations } = memoryStore();
  const orders = fakeOrders(accepted);
  const service = createConversationService({ store, orders });
  const first = await service.open(ORDER, principal(BOB), TOKEN);
  assert.equal(first.kind, 'found');
  assert.equal(conversations.get(ORDER)?.createdAt, '2026-10-20T04:00:00.000Z');
  await service.open(ORDER, principal(BOB), TOKEN);
  assert.deepEqual(orders.calls, [ORDER]);
});

test('open with no row and a completed order creates a closed row', async () => {
  const { store } = memoryStore();
  const completed: OrderLookupResult = { ...accepted, order: { ...accepted.order, status: 'COMPLETED', completedAt: '2026-10-20T06:00:00.000Z' } };
  const service = createConversationService({ store, orders: fakeOrders(completed) });
  const result = await service.open(ORDER, principal(ALICE), TOKEN);
  assert.equal(result.kind, 'found');
  assert.equal(result.kind === 'found' && result.conversation.closedAt, '2026-10-20T06:00:00.000Z');
});

for (const [name, lookup] of [
  ['404', { kind: 'not_found' }],
  ['outage', { kind: 'unavailable', message: 'timeout' }],
  ['an order with no courier', { ...accepted, order: { ...accepted.order, courierId: null, status: 'OPEN' } }],
] as const) {
  test(`open with no row and ${name} does not open a conversation`, async () => {
    const { store, conversations } = memoryStore();
    const service = createConversationService({ store, orders: fakeOrders(lookup as OrderLookupResult) });
    const result = await service.open(ORDER, principal(ALICE), TOKEN);
    assert.notEqual(result.kind, 'found');
    assert.equal(conversations.size, 0);
  });
}

test('read: participants and admins yes, anyone else forbidden (F8.1.2, D8)', async () => {
  const { store } = memoryStore();
  await store.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: '2026-10-20T04:00:00.000Z' });
  const service = createConversationService({ store, orders: fakeOrders({ kind: 'not_found' }) });
  assert.equal((await service.open(ORDER, principal(ALICE), TOKEN)).kind, 'found');
  assert.equal((await service.open(ORDER, principal(BOB), TOKEN)).kind, 'found');
  assert.equal((await service.open(ORDER, principal(ADMIN, { role: 'ADMIN' }), TOKEN)).kind, 'found');
  assert.equal((await service.open(ORDER, principal(CAROL), TOKEN)).kind, 'forbidden');
  assert.equal((await service.history(ORDER, principal(CAROL), { afterSequence: 0, limit: 10 })).kind, 'forbidden');
});

test('send: participants only, while open, non-blank, attributed from the token', async () => {
  const { store } = memoryStore();
  await store.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: '2026-10-20T04:00:00.000Z' });
  const now = () => new Date('2026-10-20T04:30:00.000Z');
  const service = createConversationService({ store, orders: fakeOrders({ kind: 'not_found' }), now });

  assert.equal((await service.send(ORDER, principal(CAROL), 'hi')).kind, 'forbidden');
  assert.equal((await service.send(ORDER, principal(ADMIN, { role: 'ADMIN' }), 'hi')).kind, 'forbidden');
  assert.equal((await service.send(ORDER, principal(ALICE), '   ')).kind, 'empty');
  assert.equal((await service.send(ORDER, principal(ALICE, { username: undefined }), 'hi')).kind, 'no_username');
  assert.equal((await service.send('30000000-0000-4000-8000-000000000002', principal(ALICE), 'hi')).kind, 'not_found');

  const sent = await service.send(ORDER, principal(ALICE, { username: 'alice' }), '  on my way  ');
  assert.equal(sent.kind, 'sent');
  if (sent.kind !== 'sent') return;
  assert.deepEqual(
    [sent.message.sequence, sent.message.senderId, sent.message.senderUsername, sent.message.senderRole, sent.message.text, sent.message.sentAt, sent.recipientIds],
    [1, ALICE, 'alice', 'STUDENT', 'on my way', '2026-10-20T04:30:00.000Z', [BOB]],
  );
  const reply = await service.send(ORDER, principal(BOB, { username: 'bob' }), 'ok');
  assert.equal(reply.kind === 'sent' && reply.message.sequence, 2);
  assert.deepEqual(reply.kind === 'sent' && reply.recipientIds, [ALICE]);

  await store.close(ORDER, '2026-10-20T05:00:00.000Z');
  assert.equal((await service.send(ORDER, principal(ALICE), 'late')).kind, 'closed');
  const history = await service.history(ORDER, principal(BOB), { afterSequence: 0, limit: 10 });
  assert.equal(history.kind, 'found');
  assert.deepEqual(history.kind === 'found' && history.messages.map((m) => m.text), ['on my way', 'ok'], 'F8.3.1 and F8.3.2: readable after close');
});

/** A store whose first read of the row is followed by `race()` before the append, modelling a commit in between. */
function racingStore(race: (store: ReturnType<typeof memoryStore>['store']) => Promise<unknown>) {
  const memory = memoryStore();
  const { store } = memory;
  const original = store.findByOrderId.bind(store);
  let armed = false;
  const racing = {
    ...store,
    async findByOrderId(orderId: string) {
      const row = await original(orderId);
      if (armed && row) { armed = false; await race(store); }
      return row ? { ...row } : row; // a snapshot, as a database read is
    },
  };
  return { ...memory, store: racing, arm: () => { armed = true; } };
}

test('P2: a close committed between the pre-check and the append is honoured; the message is not stored', async () => {
  const { store, arm, messages } = racingStore((inner) => inner.close(ORDER, '2026-10-20T04:31:00.000Z'));
  await store.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: '2026-10-20T04:00:00.000Z' });
  const service = createConversationService({ store, orders: fakeOrders({ kind: 'not_found' }) });
  arm();
  assert.equal((await service.send(ORDER, principal(ALICE), 'just made it?')).kind, 'closed');
  assert.equal(messages.length, 0, 'F8.3.2: nothing stored after closure');
});

test('P2: a re-courier committed between the pre-check and the append makes the old courier forbidden and the recipients follow the locked row', async () => {
  const { store, arm, messages } = racingStore((inner) =>
    inner.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: CAROL, createdAt: '2026-10-20T04:40:00.000Z' }));
  await store.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: '2026-10-20T04:00:00.000Z' });
  const service = createConversationService({ store, orders: fakeOrders({ kind: 'not_found' }) });

  arm();
  assert.equal((await service.send(ORDER, principal(BOB), 'still here?')).kind, 'forbidden', 'Bob was replaced during his send');
  assert.equal(messages.length, 0);

  // Alice's own send after the same kind of race is delivered to the courier the locked row names, not the stale one.
  const { store: store2, arm: arm2 } = racingStore((inner) =>
    inner.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: CAROL, createdAt: '2026-10-20T04:40:00.000Z' }));
  await store2.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: '2026-10-20T04:00:00.000Z' });
  const service2 = createConversationService({ store: store2, orders: fakeOrders({ kind: 'not_found' }) });
  arm2();
  const sent = await service2.send(ORDER, principal(ALICE), 'hello courier');
  assert.equal(sent.kind, 'sent');
  assert.deepEqual(sent.kind === 'sent' && sent.recipientIds, [CAROL]);
});

test('P1: after accept A, accept B and a replay of A, only B may read and send', async () => {
  const { store } = memoryStore();
  const T0 = '2026-10-20T04:00:00.000Z';
  const T1 = '2026-10-20T05:00:00.000Z';
  await store.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: T0 });
  await store.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: CAROL, createdAt: T1 });
  const service = createConversationService({ store, orders: fakeOrders({ kind: 'not_found' }) });
  assert.equal((await service.send(ORDER, principal(CAROL, { username: 'carol' }), 'hi')).kind, 'sent');

  const replay = await store.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: T0 });
  assert.equal(replay.outcome, 'ignored');
  assert.equal((await service.history(ORDER, principal(BOB), { afterSequence: 0, limit: 10 })).kind, 'forbidden', 'Bob stays out');
  assert.equal((await service.send(ORDER, principal(BOB), 'back?')).kind, 'forbidden');
  assert.equal((await service.history(ORDER, principal(CAROL), { afterSequence: 0, limit: 10 })).kind, 'found', 'Carol keeps access');
  assert.equal((await service.send(ORDER, principal(CAROL, { username: 'carol' }), 'still me')).kind, 'sent');
});

test('P2: a terminal fallback racing an accept event that creates the row still closes it, and later sends are refused', async () => {
  const { store, conversations } = memoryStore();
  const completed: OrderLookupResult = { ...accepted, order: { ...accepted.order, status: 'COMPLETED', completedAt: '2026-10-20T06:00:00.000Z' } };
  // The Order lookup is where the delayed order.accepted lands: open saw no row, the event creates one, open continues.
  const orders: OrderClient = {
    async getOrder() {
      await store.upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: '2026-10-20T04:00:00.000Z' });
      return completed;
    },
  };
  const service = createConversationService({ store, orders });
  const opened = await service.open(ORDER, principal(ALICE), TOKEN);
  assert.equal(opened.kind, 'found');
  assert.equal(opened.kind === 'found' && opened.conversation.closedAt, '2026-10-20T06:00:00.000Z', 'F8.3.2: read-only from the fallback');
  assert.equal(conversations.get(ORDER)?.closedAt, '2026-10-20T06:00:00.000Z', 'the row itself is closed, not just the response');
  assert.equal((await service.send(ORDER, principal(ALICE), 'too late')).kind, 'closed');
  assert.equal((await service.send(ORDER, principal(BOB), 'too late')).kind, 'closed');
});
