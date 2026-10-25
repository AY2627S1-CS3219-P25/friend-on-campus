/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Unit checks for order-event validation and the S3 projection: accept creates, a second accept replaces the
 * courier only, pickup and delivery are recorded once, the three terminal keys close once, and events for an order
 * with no row are ignored. No broker needed.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fix (PR #148 P1): regression for accept A, accept B, replay A (and a same-timestamp redelivery).
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { InvalidChatEvent, classifyChatFailure, createProjection, parseOrderEvent } from '../src/conversations/events';
import { ALICE, BOB, CAROL, ORDER, memoryStore } from './helpers';

const base = {
  eventId: '10000000-0000-4000-8000-000000000001',
  timestamp: '2026-10-20T04:00:00.000Z',
  orderId: ORDER,
  requesterId: ALICE,
  courierId: BOB,
};
const body = (value: unknown) => Buffer.from(JSON.stringify(value));
const event = (eventType: string, extra: Record<string, unknown> = {}) =>
  parseOrderEvent(body({ ...base, eventType, ...extra }), eventType);

test('parses the six keys and normalises ids', () => {
  const parsed = event('order.accepted', { courierId: BOB.toUpperCase() });
  assert.equal(parsed.courierId, BOB);
  assert.equal(event('order.cancelled', { courierId: undefined }).courierId, undefined);
});

for (const [name, content, key] of [
  ['non-JSON', Buffer.from('{'), 'order.accepted'],
  ['routing key mismatch', body({ ...base, eventType: 'order.accepted' }), 'order.in_transit'],
  ['unbound key', body({ ...base, eventType: 'order.created' }), 'order.created'],
  ['missing courier on completed', body({ ...base, eventType: 'order.completed', courierId: undefined }), 'order.completed'],
] as const) {
  test(`rejects ${name} as a permanent failure`, () => {
    assert.throws(() => parseOrderEvent(content, key), InvalidChatEvent);
    assert.deepEqual(classifyChatFailure(new InvalidChatEvent('x')), { category: 'permanent', reason: 'invalid_event' });
  });
}

test('anything else is transient', () => {
  assert.deepEqual(classifyChatFailure(new Error('db')), { category: 'transient', reason: 'processing_failure' });
});

test('accept creates the row; a later accept replaces the courier and nothing else', async () => {
  const { store, conversations } = memoryStore();
  const project = createProjection(store);
  assert.equal(await project(event('order.accepted')), 'created_or_recouriered');
  const row = conversations.get(ORDER)!;
  assert.deepEqual([row.requesterId, row.courierId, row.createdAt, row.closedAt], [ALICE, BOB, base.timestamp, null]);
  assert.equal(await project(event('order.accepted', { courierId: CAROL, timestamp: '2026-10-20T05:00:00.000Z' })), 'created_or_recouriered');
  assert.equal(row.courierId, CAROL);
  assert.equal(row.createdAt, base.timestamp, 'creation time is kept');
});

test('P1: an older or replayed accept cannot restore a former courier', async () => {
  const { store, conversations } = memoryStore();
  const project = createProjection(store);
  const bobAccept = event('order.accepted');                                                   // Bob at T0
  await project(bobAccept);
  await project(event('order.accepted', { courierId: CAROL, timestamp: '2026-10-20T05:00:00.000Z' })); // Carol at T1
  const row = conversations.get(ORDER)!;
  assert.equal(row.courierId, CAROL);

  assert.equal(await project(bobAccept), 'ignored', 'replay of the older accept');
  assert.equal(row.courierId, CAROL, 'Carol stays the courier');
  assert.equal(await project(event('order.accepted', { courierId: CAROL, timestamp: '2026-10-20T05:00:00.000Z' })), 'ignored', 'redelivery of the same accept');
  assert.equal(await project(event('order.accepted', { courierId: BOB, timestamp: '2026-10-20T06:00:00.000Z' })), 'created_or_recouriered', 'a genuinely newer accept still applies');
  assert.deepEqual([row.courierId, row.courierSince, row.createdAt], [BOB, '2026-10-20T06:00:00.000Z', base.timestamp]);
});

test('pickup, delivery and close are recorded once each; redelivery is ignored', async () => {
  const { store, conversations } = memoryStore();
  const project = createProjection(store);
  await project(event('order.accepted'));
  assert.equal(await project(event('order.in_transit')), 'picked_up');
  assert.equal(await project(event('order.in_transit')), 'ignored');
  assert.equal(await project(event('order.delivered')), 'delivered');
  assert.equal(await project(event('order.completed')), 'closed');
  assert.equal(await project(event('order.cancelled', { courierId: undefined })), 'ignored');
  const row = conversations.get(ORDER)!;
  assert.deepEqual([row.pickedUpAt, row.deliveredAt, row.closedAt], [base.timestamp, base.timestamp, base.timestamp]);
});

test('events for an order with no row are ignored (S3 answer 3)', async () => {
  const { store, conversations } = memoryStore();
  const project = createProjection(store);
  for (const key of ['order.in_transit', 'order.delivered', 'order.completed', 'order.expired'] as const) {
    assert.equal(await project(event(key, key === 'order.expired' ? { courierId: undefined } : {})), 'ignored');
  }
  assert.equal(conversations.size, 0);
});
