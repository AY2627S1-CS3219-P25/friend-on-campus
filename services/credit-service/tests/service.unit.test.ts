/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Unit tests for the escrow service (F4.0–F4.6) against an in-memory store that reproduces the transaction,
 * savepoint and rollback semantics the service relies on, plus the Serializable retry loop of createCreditStore
 * against a fake Prisma client. No database or broker needed.
 * Author review: <to be completed by Reallyeasy1>
 */

// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { describe, test } from 'node:test';
import type { CreditReservationRequestEvent } from '@campus-errand/common-dtos';
import { CreditConflict, CreditError, createCreditService } from '../src/credits/service';
import { createCreditStore, type CreditStore } from '../src/credits/store';

// ---------------------------------------------------------------------------------------------------------------
// In-memory store. Each `transaction` snapshots the state and restores it when the operation throws; `savepoint`
// nests a second snapshot, as `reservationResult` expects. Every method mirrors the Prisma-backed `queries()`.
// ---------------------------------------------------------------------------------------------------------------
type Wallet = { userId: string; availableCredits: number; escrowCredits: number; totalEarnedCredits: number; updatedAt: string };
type Escrow = { orderId: string; requesterId: string; courierId: string | null; amount: number; state: 'RESERVED' | 'SETTLED' | 'REFUNDED' };
type Row = Record<string, unknown> & { id: string; createdAt: string };
interface State {
  wallets: Map<string, Wallet>;
  grants: Map<string, { userId: string; amount: number }>;
  escrows: Map<string, Escrow>;
  events: Map<string, { eventId: string; eventType: string; fingerprint: string }>;
  transactions: Row[];
  outbox: Record<string, unknown>[];
}

function memoryStore() {
  const ctx: { s: State; failNext: string | null } = {
    s: { wallets: new Map(), grants: new Map(), escrows: new Map(), events: new Map(), transactions: [], outbox: [] },
    failNext: null,
  };
  let savepoint: State | null = null;
  const now = () => new Date().toISOString();
  const guard = (name: string) => { if (ctx.failNext === name) { ctx.failNext = null; throw new Error(`simulated ${name} failure`); } };
  const queries = () => ({
    savepoint: async () => { savepoint = structuredClone(ctx.s); },
    rollbackAttempt: async () => { if (!savepoint) throw new Error('no savepoint'); ctx.s = savepoint; },
    releaseSavepoint: async () => { savepoint = null; },
    addOutbox: async (event: Record<string, unknown>) => { ctx.s.outbox.push(event); },
    findGrant: async (userId: string) => ctx.s.grants.get(userId) ?? null,
    createGrant: async (userId: string, amount: number) => { const g = { userId, amount }; ctx.s.grants.set(userId, g); return g; },
    findEscrow: async (orderId: string) => { const e = ctx.s.escrows.get(orderId); return e ? { ...e } : null; },
    createEscrow: async (data: { orderId: string; requesterId: string; amount: number }) => {
      guard('createEscrow');
      const e: Escrow = { ...data, courierId: null, state: 'RESERVED' }; ctx.s.escrows.set(data.orderId, e); return { ...e };
    },
    transitionEscrow: async (orderId: string, state: 'SETTLED' | 'REFUNDED', courierId?: string) => {
      const e = ctx.s.escrows.get(orderId);
      if (!e || e.state !== 'RESERVED') return false;
      e.state = state; if (courierId !== undefined) e.courierId = courierId; return true;
    },
    findEvent: async (eventId: string) => ctx.s.events.get(eventId) ?? null,
    addEvent: async (data: { eventId: string; eventType: string; fingerprint: string }) => { ctx.s.events.set(data.eventId, data); return data; },
    findWallet: async (userId: string) => { const w = ctx.s.wallets.get(userId); return w ? { ...w } : undefined; },
    createWallet: async (userId: string, availableCredits: number) => {
      if (!ctx.s.wallets.has(userId)) ctx.s.wallets.set(userId, { userId, availableCredits, escrowCredits: 0, totalEarnedCredits: 0, updatedAt: now() });
      return { ...ctx.s.wallets.get(userId)! };
    },
    changeBalance: async (userId: string, delta: { available?: number; escrow?: number; earned?: number }, minimum: { available?: number; escrow?: number } = {}) => {
      const w = ctx.s.wallets.get(userId);
      if (!w) return false;
      if (minimum.available !== undefined && w.availableCredits < minimum.available) return false;
      if (minimum.escrow !== undefined && w.escrowCredits < minimum.escrow) return false;
      w.availableCredits += delta.available ?? 0; w.escrowCredits += delta.escrow ?? 0; w.totalEarnedCredits += delta.earned ?? 0; w.updatedAt = now();
      return true;
    },
    findTransactions: async (userId: string) => ctx.s.transactions.filter((t) => t.fromUserId === userId || t.toUserId === userId).reverse(),
    addTransaction: async (data: Record<string, unknown>) => {
      const row = { id: randomUUID(), createdAt: now(), ...data };
      ctx.s.transactions.push(row);
      return { id: row.id, transactionCode: String(data.transactionCode) };
    },
  });
  const store = {
    ...queries(),
    async transaction<T>(operation: (tx: ReturnType<typeof queries>) => Promise<T>): Promise<T> {
      const before = structuredClone(ctx.s);
      try { return await operation(queries()); } catch (error) { ctx.s = before; savepoint = null; throw error; }
    },
  };
  return { store: store as unknown as CreditStore, state: () => ctx.s, failNext: (name: string) => { ctx.failNext = name; } };
}

const ids = () => ({ alice: randomUUID(), bob: randomUUID(), carol: randomUUID(), order: randomUUID() });
const txs = (s: State, type: string) => s.transactions.filter((t) => t.transactionType === type);
const reservationEvent = (orderId: string, requesterId: string, rewardCredits: number): CreditReservationRequestEvent => ({
  eventId: randomUUID(), eventType: 'order.reservation.requested', timestamp: new Date().toISOString(),
  correlationId: randomUUID(), orderId, requesterId, rewardCredits,
});

describe('F4.1 initial allocation', () => {
  test('the welcome grant of 100 is allocated once, and re-registration returns the same wallet', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice } = ids();
    const first = await svc.initializeWallet(alice);
    assert.equal(first.availableCredits, 100); assert.equal(first.escrowCredits, 0);
    const again = await svc.initializeWallet(alice);
    assert.deepEqual({ a: again.availableCredits, e: again.escrowCredits }, { a: 100, e: 0 });
    assert.equal(txs(state(), 'WELCOME_GRANT').length, 1, 'exactly one grant transaction');
    assert.equal(state().grants.size, 1);
  });

  test('a retried registration event with a different grant amount is rejected without changing balances', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice } = ids();
    await svc.applyEvent({ eventId: randomUUID(), eventType: 'user.registered', fingerprint: 'a' }, { kind: 'register', userId: alice, initialGrant: 100 });
    await assert.rejects(
      svc.applyEvent({ eventId: randomUUID(), eventType: 'user.registered', fingerprint: 'b' }, { kind: 'register', userId: alice, initialGrant: 50 }),
      (e: unknown) => e instanceof CreditConflict && /Initial grant conflicts/.test((e as Error).message),
    );
    assert.equal((await svc.getWallet(alice)).availableCredits, 100);
    assert.equal(txs(state(), 'WELCOME_GRANT').length, 1);
  });
});

describe('F4.2 balances', () => {
  test('an unknown wallet is a 404, not an empty wallet', async () => {
    const { store } = memoryStore(); const svc = createCreditService(store);
    await assert.rejects(svc.getWallet(randomUUID()), (e: unknown) => e instanceof CreditError && (e as CreditError).status === 404);
  });

  test('a reservation beyond the available balance is rejected and leaves no partial state', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice, order } = ids();
    await svc.initializeWallet(alice);
    await assert.rejects(svc.reserve({ orderId: order, requesterId: alice, amount: 101 }), (e: unknown) => e instanceof CreditError && /Insufficient available credits/.test((e as Error).message));
    const w = await svc.getWallet(alice);
    assert.deepEqual({ a: w.availableCredits, e: w.escrowCredits }, { a: 100, e: 0 });
    assert.equal(state().escrows.size, 0, 'the escrow row created before the balance check is rolled back');
    assert.equal(txs(state(), 'ESCROW_HOLD').length, 0);
  });
});

describe('F4.3 reservation', () => {
  test('reserving moves credits from available to escrow atomically and records ESCROW_HOLD', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice, order } = ids();
    await svc.initializeWallet(alice);
    const w = await svc.reserve({ orderId: order, requesterId: alice, amount: 30 });
    assert.deepEqual({ a: w.availableCredits, e: w.escrowCredits, total: w.availableCredits + w.escrowCredits }, { a: 70, e: 30, total: 100 });
    const hold = txs(state(), 'ESCROW_HOLD'); assert.equal(hold.length, 1); assert.equal(hold[0].amount, 30); assert.equal(hold[0].orderId, order);
    assert.equal(state().escrows.get(order)?.state, 'RESERVED');
  });

  test('non-positive, fractional and oversized amounts are rejected before anything is written', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice, order } = ids();
    await svc.initializeWallet(alice);
    for (const amount of [0, -5, 1.5, 2 ** 31]) {
      await assert.rejects(svc.reserve({ orderId: order, requesterId: alice, amount }), (e: unknown) => e instanceof CreditError && (e as CreditError).status === 400, `amount ${amount}`);
    }
    assert.equal((await svc.getWallet(alice)).availableCredits, 100); assert.equal(state().escrows.size, 0);
  });

  test('an identical reserve replay returns the wallet without a second hold; a different amount or requester conflicts', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice, bob, order } = ids();
    await svc.initializeWallet(alice); await svc.initializeWallet(bob);
    await svc.reserve({ orderId: order, requesterId: alice, amount: 30 });
    const replay = await svc.reserve({ orderId: order, requesterId: alice, amount: 30 });
    assert.deepEqual({ a: replay.availableCredits, e: replay.escrowCredits }, { a: 70, e: 30 });
    assert.equal(txs(state(), 'ESCROW_HOLD').length, 1);
    await assert.rejects(svc.reserve({ orderId: order, requesterId: alice, amount: 31 }), CreditConflict);
    await assert.rejects(svc.reserve({ orderId: order, requesterId: bob, amount: 30 }), CreditConflict);
    assert.equal((await svc.getWallet(bob)).availableCredits, 100, 'the conflicting requester is untouched');
  });
});

describe('F4.4 settlement', () => {
  test('settling pays the exact reserved amount to the courier, initialising the courier wallet if needed', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice, bob, order } = ids();
    await svc.initializeWallet(alice); await svc.reserve({ orderId: order, requesterId: alice, amount: 30 });
    const { requesterWallet, courierWallet } = await svc.settle({ orderId: order, requesterId: alice, courierId: bob, amount: 30 });
    assert.deepEqual({ a: requesterWallet.availableCredits, e: requesterWallet.escrowCredits }, { a: 70, e: 0 });
    assert.deepEqual({ a: courierWallet.availableCredits, earned: courierWallet.totalEarnedCredits }, { a: 130, earned: 30 }, 'welcome grant + payout');
    const release = txs(state(), 'ESCROW_RELEASE'); assert.equal(release.length, 1);
    assert.deepEqual({ from: release[0].fromUserId, to: release[0].toUserId, amount: release[0].amount }, { from: alice, to: bob, amount: 30 });
    assert.equal(state().escrows.get(order)?.state, 'SETTLED');
  });

  test('repeated confirmations do not transfer twice; a different courier, amount or unknown order conflicts', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice, bob, carol, order } = ids();
    await svc.initializeWallet(alice); await svc.reserve({ orderId: order, requesterId: alice, amount: 30 });
    await svc.settle({ orderId: order, requesterId: alice, courierId: bob, amount: 30 });
    const again = await svc.settle({ orderId: order, requesterId: alice, courierId: bob, amount: 30 });
    assert.equal(again.courierWallet.availableCredits, 130); assert.equal(txs(state(), 'ESCROW_RELEASE').length, 1);
    await assert.rejects(svc.settle({ orderId: order, requesterId: alice, courierId: carol, amount: 30 }), (e: unknown) => e instanceof CreditConflict && /courier conflicts/.test((e as Error).message));
    await assert.rejects(svc.settle({ orderId: order, requesterId: alice, courierId: bob, amount: 29 }), CreditConflict);
    await assert.rejects(svc.settle({ orderId: randomUUID(), requesterId: alice, courierId: bob, amount: 30 }), (e: unknown) => e instanceof CreditConflict && /No reservation exists/.test((e as Error).message));
  });

  test('a refunded order cannot be settled afterwards', async () => {
    const { store } = memoryStore(); const svc = createCreditService(store); const { alice, bob, order } = ids();
    await svc.initializeWallet(alice); await svc.reserve({ orderId: order, requesterId: alice, amount: 30 });
    await svc.refund({ orderId: order, requesterId: alice, amount: 30 });
    await assert.rejects(svc.settle({ orderId: order, requesterId: alice, courierId: bob, amount: 30 }), (e: unknown) => e instanceof CreditConflict && /already refunded/.test((e as Error).message));
    assert.equal((await svc.getWallet(alice)).availableCredits, 100);
  });
});

describe('F4.5 release', () => {
  test('refunding returns 100% of the reservation, once, and records ESCROW_REFUND', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice, order } = ids();
    await svc.initializeWallet(alice); await svc.reserve({ orderId: order, requesterId: alice, amount: 30 });
    const w = await svc.refund({ orderId: order, requesterId: alice, amount: 30 });
    assert.deepEqual({ a: w.availableCredits, e: w.escrowCredits }, { a: 100, e: 0 });
    const again = await svc.refund({ orderId: order, requesterId: alice, amount: 30 });
    assert.deepEqual({ a: again.availableCredits, e: again.escrowCredits }, { a: 100, e: 0 });
    assert.equal(txs(state(), 'ESCROW_REFUND').length, 1); assert.equal(state().escrows.get(order)?.state, 'REFUNDED');
  });

  test('a settled order cannot be refunded, and a release without a reservation is rejected', async () => {
    const { store } = memoryStore(); const svc = createCreditService(store); const { alice, bob, order } = ids();
    await svc.initializeWallet(alice); await svc.reserve({ orderId: order, requesterId: alice, amount: 30 });
    await svc.settle({ orderId: order, requesterId: alice, courierId: bob, amount: 30 });
    await assert.rejects(svc.refund({ orderId: order, requesterId: alice, amount: 30 }), (e: unknown) => e instanceof CreditConflict && /already settled/.test((e as Error).message));
    await assert.rejects(svc.refund({ orderId: randomUUID(), requesterId: alice, amount: 30 }), CreditConflict);
    assert.equal((await svc.getWallet(bob)).availableCredits, 130);
  });
});

describe('F4.0 / F4.6 event idempotency and reservation results', () => {
  const identity = (eventId: string, fingerprint = 'fp') => ({ eventId, eventType: 'order.reservation.requested', fingerprint });

  test('a reservation request succeeds once; the same event id is a no-op; a reused id with other content conflicts', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice, order } = ids();
    await svc.initializeWallet(alice);
    const event = reservationEvent(order, alice, 30);
    await svc.applyEvent(identity(event.eventId), { kind: 'reserve-request', event });
    assert.deepEqual(state().outbox.map((o) => o.eventType), ['credit.reservation.succeeded']);
    assert.equal(state().outbox[0].correlationId, event.correlationId);
    await svc.applyEvent(identity(event.eventId), { kind: 'reserve-request', event });
    assert.equal(state().outbox.length, 1, 'redelivery publishes nothing and holds nothing twice');
    assert.equal(txs(state(), 'ESCROW_HOLD').length, 1);
    await assert.rejects(svc.applyEvent(identity(event.eventId, 'other'), { kind: 'reserve-request', event }), (e: unknown) => e instanceof CreditConflict && /reused/.test((e as Error).message));
    assert.deepEqual({ a: (await svc.getWallet(alice)).availableCredits, e: (await svc.getWallet(alice)).escrowCredits }, { a: 70, e: 30 });
  });

  test('an insufficient-balance request publishes a failed result, keeps the dedup marker and rolls back every balance write', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice, order } = ids();
    await svc.initializeWallet(alice);
    const event = reservationEvent(order, alice, 500);
    await svc.applyEvent(identity(event.eventId), { kind: 'reserve-request', event });
    const [result] = state().outbox;
    assert.equal(result.eventType, 'credit.reservation.failed'); assert.match(String(result.reason), /Insufficient available credits/);
    assert.deepEqual({ a: (await svc.getWallet(alice)).availableCredits, e: (await svc.getWallet(alice)).escrowCredits }, { a: 100, e: 0 });
    assert.equal(state().escrows.size, 0); assert.equal(txs(state(), 'ESCROW_HOLD').length, 0);
    assert.ok(state().events.has(event.eventId), 'the failure is committed as processed');
    await svc.applyEvent(identity(event.eventId), { kind: 'reserve-request', event });
    assert.equal(state().outbox.length, 1, 'a redelivered failed request does not publish again');
  });

  test('a request for an order whose reservation is already closed fails without touching balances', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice, bob, order } = ids();
    await svc.initializeWallet(alice); await svc.reserve({ orderId: order, requesterId: alice, amount: 30 });
    await svc.settle({ orderId: order, requesterId: alice, courierId: bob, amount: 30 });
    const event = reservationEvent(order, alice, 30);
    await svc.applyEvent(identity(event.eventId), { kind: 'reserve-request', event });
    assert.equal(state().outbox.at(-1)?.eventType, 'credit.reservation.failed'); assert.match(String(state().outbox.at(-1)?.reason), /already closed/);
    assert.equal((await svc.getWallet(alice)).availableCredits, 70);
  });

  test('an infrastructure failure inside the event aborts the whole transaction, so the event is retried later', async () => {
    const { store, state, failNext } = memoryStore(); const svc = createCreditService(store); const { alice, order } = ids();
    await svc.initializeWallet(alice);
    const event = reservationEvent(order, alice, 30);
    failNext('createEscrow');
    await assert.rejects(svc.applyEvent(identity(event.eventId), { kind: 'reserve-request', event }), /simulated createEscrow failure/);
    assert.equal(state().events.has(event.eventId), false, 'no dedup marker survives a rollback');
    assert.equal(state().outbox.length, 0);
    assert.equal((await svc.getWallet(alice)).availableCredits, 100);
  });

  test('settle and refund delivered as events are idempotent per event id', async () => {
    const { store, state } = memoryStore(); const svc = createCreditService(store); const { alice, bob, order } = ids();
    await svc.initializeWallet(alice); await svc.reserve({ orderId: order, requesterId: alice, amount: 30 });
    const settleId = { eventId: randomUUID(), eventType: 'order.completed', fingerprint: 'c' };
    await svc.applyEvent(settleId, { kind: 'settle', body: { orderId: order, requesterId: alice, courierId: bob, amount: 30 } });
    await svc.applyEvent(settleId, { kind: 'settle', body: { orderId: order, requesterId: alice, courierId: bob, amount: 30 } });
    assert.equal(txs(state(), 'ESCROW_RELEASE').length, 1); assert.equal((await svc.getWallet(bob)).availableCredits, 130);
    await svc.applyEvent({ eventId: randomUUID(), eventType: 'order.cancelled', fingerprint: 'r' }, { kind: 'refund', body: { orderId: order, requesterId: alice, amount: 30 } }).catch((e: unknown) => assert.ok(e instanceof CreditConflict));
    assert.equal((await svc.getWallet(alice)).availableCredits, 70, 'a refund after settlement changes nothing');
  });
});

describe('Serializable transaction retry (createCreditStore)', () => {
  function fakePrisma(outcomes: Array<{ code: string } | 'ok'>) {
    let calls = 0;
    const prisma = {
      $transaction: async (operation: (tx: unknown) => Promise<unknown>) => {
        const outcome = outcomes[Math.min(calls, outcomes.length - 1)]; calls += 1;
        if (outcome === 'ok') return operation({});
        throw Object.assign(new Error(outcome.code), { code: outcome.code });
      },
    };
    return { prisma: prisma as never, calls: () => calls };
  }

  test('serialization and unique-violation conflicts are retried until the transaction commits', async () => {
    const { prisma, calls } = fakePrisma([{ code: 'P2034' }, { code: 'P2002' }, 'ok']);
    const result = await createCreditStore(prisma).transaction(async () => 'committed');
    assert.equal(result, 'committed'); assert.equal(calls(), 3);
  });

  test('other errors are not retried', async () => {
    const { prisma, calls } = fakePrisma([{ code: 'P2003' }, 'ok']);
    await assert.rejects(createCreditStore(prisma).transaction(async () => 'never'), /P2003/);
    assert.equal(calls(), 1);
  });

  test('a conflict that never clears gives up after ten attempts', async () => {
    const { prisma, calls } = fakePrisma([{ code: 'P2034' }]);
    await assert.rejects(createCreditStore(prisma).transaction(async () => 'never'), /P2034/);
    assert.equal(calls(), 10);
  });
});
