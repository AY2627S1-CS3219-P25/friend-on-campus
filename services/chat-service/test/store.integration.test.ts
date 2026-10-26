/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: PostgreSQL tests for src/conversations/store.ts: upsert by order id (create, then courier replaced only),
 * set-once pickup, delivery and close marks, the per-conversation sequence under concurrent appends (the unique
 * index as arbiter), and paging by sequence. Same opt-in and throwaway-schema pattern as the Notification Service.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fixes (PR #148 P1, P2): courierSince and the upsert outcome, the replay/redelivery guard, and append's
 * locked recheck (closed, non-participant, missing, recipients from the row) on real PostgreSQL.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Review fix (PR #148, second round): a terminal fallback's closedAt is applied set-once to an existing row.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
// Opt in with CHAT_TEST_DATABASE_URL pointing to any PostgreSQL database.
// Creates and removes its own random schema; never touches existing tables.
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { createConversationStore, type ConversationStore } from '../src/conversations/store';
import { ALICE, BOB, CAROL, makeTestDatabase } from './helpers';

const databaseUrl = process.env.CHAT_TEST_DATABASE_URL;

describe('conversation store (PostgreSQL)', { skip: !databaseUrl }, () => {
  let database: Awaited<ReturnType<typeof makeTestDatabase>>;
  let store: ConversationStore;
  const T0 = '2026-10-20T04:00:00.000Z';
  const T1 = '2026-10-20T05:00:00.000Z';

  before(async () => {
    database = await makeTestDatabase(databaseUrl!);
    store = createConversationStore(database.db);
  });

  after(async () => {
    await database.drop();
  });

  it('creates on the first accept and replaces only the courier on a later one', async () => {
    const orderId = randomUUID();
    const { conversation: created, outcome } = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: T0 });
    assert.equal(outcome, 'created');
    assert.deepEqual([created.requesterId, created.courierId, created.courierSince, created.createdAt, created.closedAt], [ALICE, BOB, T0, T0, null]);
    const again = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: CAROL, createdAt: T1 });
    assert.equal(again.outcome, 'recouriered');
    assert.deepEqual([again.conversation.id, again.conversation.courierId, again.conversation.courierSince, again.conversation.createdAt], [created.id, CAROL, T1, T0]);
    assert.equal((await store.findByOrderId(orderId))?.courierId, CAROL);
    assert.equal(await store.findByOrderId(randomUUID()), null);
  });

  it('P1: an accept not newer than courierSince is ignored (replay of the older accept, redelivery of the current one)', async () => {
    const orderId = randomUUID();
    await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: T0 });
    await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: CAROL, createdAt: T1 });
    const replay = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: T0 });
    assert.equal(replay.outcome, 'ignored');
    assert.equal(replay.conversation.courierId, CAROL);
    const redelivery = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: CAROL, createdAt: T1 });
    assert.equal(redelivery.outcome, 'ignored');
    assert.deepEqual([(await store.findByOrderId(orderId))?.courierId, (await store.findByOrderId(orderId))?.courierSince], [CAROL, T1]);
  });

  it('P2: append re-checks the row under its lock: closed, non-participant and missing conversations are refused; recipients come from the row', async () => {
    const orderId = randomUUID();
    const { conversation } = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: T0 });
    const message = (senderId: string, text: string) => ({ conversationId: conversation.id, senderId, senderUsername: 'x', senderRole: 'STUDENT', text, sentAt: T0 });

    const fromBob = await store.append(message(BOB, 'hi'));
    assert.equal(fromBob.kind, 'appended');
    assert.deepEqual(fromBob.kind === 'appended' && fromBob.recipientIds, [ALICE]);
    assert.equal((await store.append(message(CAROL, 'me too'))).kind, 'forbidden');

    // The courier changes after a caller read the row: the next append sees the new courier, not the stale one.
    await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: CAROL, createdAt: T1 });
    assert.equal((await store.append(message(BOB, 'still here?'))).kind, 'forbidden');
    const toCarol = await store.append(message(ALICE, 'hello courier'));
    assert.deepEqual(toCarol.kind === 'appended' && toCarol.recipientIds, [CAROL]);

    await store.close(orderId, T1);
    assert.equal((await store.append(message(ALICE, 'late'))).kind, 'closed');
    assert.equal((await store.append({ ...message(ALICE, 'nowhere'), conversationId: randomUUID() })).kind, 'not_found');
    assert.deepEqual((await store.listMessages(conversation.id, { afterSequence: 0, limit: 10 })).map((m) => m.text), ['hi', 'hello courier']);
  });

  it('P2: a terminal fallback applies its closedAt to a row an event created, once', async () => {
    const orderId = randomUUID();
    await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: T0 });
    const fallback = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: T0, closedAt: T1 });
    assert.deepEqual([fallback.outcome, fallback.conversation.closedAt], ['ignored', T1]);
    const again = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: T0, closedAt: '2026-10-20T07:00:00.000Z' });
    assert.equal(again.conversation.closedAt, T1, 'set-once: the first closure stands');
  });

  it('records pickup, delivery and close once; a repeat or a missing row is false', async () => {
    const orderId = randomUUID();
    await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: T0 });
    assert.equal(await store.markPickedUp(orderId, T0), true);
    assert.equal(await store.markPickedUp(orderId, T1), false);
    assert.equal(await store.markDelivered(orderId, T0), true);
    assert.equal(await store.close(orderId, T1), true);
    assert.equal(await store.close(orderId, T1), false);
    assert.equal(await store.close(randomUUID(), T1), false);
    const row = await store.findByOrderId(orderId);
    assert.deepEqual([row?.pickedUpAt, row?.deliveredAt, row?.closedAt], [T0, T0, T1]);
  });

  it('numbers concurrent appends 1..n without gaps or duplicates, and pages by sequence', async () => {
    const orderId = randomUUID();
    const { conversation } = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: T0 });
    const message = (i: number) => ({
      conversationId: conversation.id,
      senderId: i % 2 ? ALICE : BOB,
      senderUsername: i % 2 ? 'alice' : 'bob',
      senderRole: 'STUDENT',
      text: `m${i}`,
      sentAt: T0,
    });
    const rows = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => store.append(message(i))));
    assert.deepEqual(rows.map((r) => (r.kind === 'appended' ? r.message.sequence : -1)).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);

    const page = await store.listMessages(conversation.id, { afterSequence: 2, limit: 3 });
    assert.deepEqual(page.map((m) => m.sequence), [3, 4, 5]);
    const rest = await store.listMessages(conversation.id, { afterSequence: 5, limit: 50 });
    assert.deepEqual(rest.map((m) => m.sequence), [6]);
    assert.deepEqual(await store.listMessages(randomUUID(), { afterSequence: 0, limit: 10 }), []);
  });

  it('answers ping', async () => {
    assert.equal(await store.ping(), true);
  });
});
