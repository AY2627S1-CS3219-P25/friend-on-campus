/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Review fixes (PR #148, second round) for src/conversations/store.ts upsertAccepted against a scripted Prisma
 * client, for schedules PostgreSQL cannot be made to produce on demand: a newer accept whose conditional UPDATE runs
 * before an older accept inserts the row, and a terminal fallback whose row an event created meanwhile.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { PrismaClient } from '../src/database/client';
import { createConversationStore } from '../src/conversations/store';
import { ALICE, BOB, CAROL, ORDER } from './helpers';

const T0 = new Date('2026-10-20T04:00:00.000Z');
const T1 = new Date('2026-10-20T05:00:00.000Z');
const T2 = new Date('2026-10-20T06:00:00.000Z');
const row = (courierId: string, courierSince: Date, closedAt: Date | null = null) => ({
  id: '40000000-0000-4000-8000-000000000001', orderId: ORDER, requesterId: ALICE, courierId, courierSince, createdAt: T0,
  pickedUpAt: null, deliveredAt: null, closedAt,
});

/** A `prisma.conversation` whose calls are answered in order from `script`; `calls` records what was asked. */
function scriptedPrisma(script: Array<[method: string, answer: unknown]>) {
  const calls: Array<[string, unknown]> = [];
  const next = (method: string, args: unknown) => {
    calls.push([method, args]);
    const [expected, answer] = script.shift() ?? [];
    assert.equal(method, expected, `unexpected call ${method}(${JSON.stringify(args)})`);
    return Promise.resolve(answer);
  };
  const conversation = Object.fromEntries(['updateMany', 'findUnique', 'create', 'findUniqueOrThrow'].map((m) => [m, (args: unknown) => next(m, args)]));
  return { prisma: { conversation } as unknown as PrismaClient, calls, done: () => assert.equal(script.length, 0, 'every scripted call was made') };
}

test('P2: a newer accept whose UPDATE preceded a concurrent older insert re-applies its guard instead of reporting a replay', async () => {
  // Carol's accept at T1: UPDATE matches nothing (no row yet); Bob's accept at T0 inserts; Carol's read finds Bob's
  // older row, so her guard runs again and wins.
  const { prisma, calls, done } = scriptedPrisma([
    ['updateMany', { count: 0 }],
    ['findUnique', row(BOB, T0)],
    ['updateMany', { count: 1 }],
    ['findUniqueOrThrow', row(CAROL, T1)],
  ]);
  const result = await createConversationStore(prisma).upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: CAROL, createdAt: T1.toISOString() });
  assert.equal(result.outcome, 'recouriered');
  assert.equal(result.conversation.courierId, CAROL);
  assert.deepEqual(calls[2][1], { where: { orderId: ORDER, courierSince: { lt: T1 } }, data: { courierId: CAROL, courierSince: T1 } });
  done();
});

test('P1: a row that is already as new as the accept is reported as ignored without another UPDATE', async () => {
  const { prisma, done } = scriptedPrisma([
    ['updateMany', { count: 0 }],
    ['findUnique', row(CAROL, T1)],
    ['findUniqueOrThrow', row(CAROL, T1)],
  ]);
  const result = await createConversationStore(prisma).upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: T0.toISOString() });
  assert.equal(result.outcome, 'ignored');
  assert.equal(result.conversation.courierId, CAROL);
  done();
});

test('P2: a terminal fallback that finds a row created meanwhile closes it set-once and returns it closed', async () => {
  const { prisma, calls, done } = scriptedPrisma([
    ['updateMany', { count: 0 }],
    ['findUnique', row(BOB, T0)],
    ['updateMany', { count: 1 }], // close(): WHERE closed_at IS NULL
    ['findUniqueOrThrow', row(BOB, T0, T2)],
  ]);
  const result = await createConversationStore(prisma).upsertAccepted({ orderId: ORDER, requesterId: ALICE, courierId: BOB, createdAt: T0.toISOString(), closedAt: T2.toISOString() });
  assert.equal(result.outcome, 'ignored');
  assert.equal(result.conversation.closedAt, T2.toISOString());
  assert.deepEqual(calls[2][1], { where: { orderId: ORDER, closedAt: null }, data: { closedAt: T2 } });
  done();
});
