/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: PostgreSQL tests for src/conversations/store.ts: upsert by order id (create, then courier replaced only),
 * set-once pickup, delivery and close marks, the per-conversation sequence under concurrent appends (the unique
 * index as arbiter), and paging by sequence. Same opt-in and throwaway-schema pattern as the Notification Service.
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
    const created = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: T0 });
    assert.deepEqual([created.requesterId, created.courierId, created.createdAt, created.closedAt], [ALICE, BOB, T0, null]);
    const again = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: CAROL, createdAt: T1 });
    assert.deepEqual([again.id, again.courierId, again.createdAt], [created.id, CAROL, T0]);
    assert.equal((await store.findByOrderId(orderId))?.courierId, CAROL);
    assert.equal(await store.findByOrderId(randomUUID()), null);
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
    const conversation = await store.upsertAccepted({ orderId, requesterId: ALICE, courierId: BOB, createdAt: T0 });
    const message = (i: number) => ({
      conversationId: conversation.id,
      senderId: i % 2 ? ALICE : BOB,
      senderUsername: i % 2 ? 'alice' : 'bob',
      senderRole: 'STUDENT',
      text: `m${i}`,
      sentAt: T0,
    });
    const rows = await Promise.all([1, 2, 3, 4, 5, 6].map((i) => store.append(message(i))));
    assert.deepEqual(rows.map((r) => r.sequence).sort((a, b) => a - b), [1, 2, 3, 4, 5, 6]);

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
