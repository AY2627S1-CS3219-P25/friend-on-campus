/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Tests for the event-to-notification mapping, order.delivered, and store-before-push delivery.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-03
 * Scope: Unit checks for order-event validation and failure classification; no broker needed.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  InvalidNotificationEvent,
  classifyNotificationFailure,
  createDeliver,
  parseOrderEvent,
  toNotification,
} from '../src/notifications/events';

const accepted = {
  eventId: '10000000-0000-4000-8000-000000000001',
  eventType: 'order.accepted',
  timestamp: '2026-10-03T04:00:00.000Z',
  orderId: '30000000-0000-4000-8000-000000000001',
  orderCode: 'ORD-0001',
  requesterId: '20000000-0000-4000-8000-000000000001',
  courierId: '20000000-0000-4000-8000-000000000002',
};
const body = (value: unknown) => Buffer.from(JSON.stringify(value));

test('accepts a well-formed order.accepted event and normalises ids', () => {
  const event = parseOrderEvent(body({ ...accepted, courierId: accepted.courierId.toUpperCase() }), 'order.accepted');
  assert.equal(event.courierId, accepted.courierId);
  assert.equal(event.orderCode, 'ORD-0001');
});

test('order.expired does not require a courier', () => {
  const { courierId: _courier, ...expired } = { ...accepted, eventType: 'order.expired' };
  assert.equal(parseOrderEvent(body(expired), 'order.expired').courierId, undefined);
});

for (const [name, content, key] of [
  ['non-JSON', Buffer.from('{'), 'order.accepted'],
  ['routing key mismatch', body(accepted), 'order.in_transit'],
  ['unknown routing key', body({ ...accepted, eventType: 'user.registered' }), 'user.registered'],
  ['bad eventId', body({ ...accepted, eventId: 'evt-1' }), 'order.accepted'],
  ['bad timestamp', body({ ...accepted, timestamp: '2026-10-03' }), 'order.accepted'],
  ['missing courier on accepted', body({ ...accepted, courierId: undefined }), 'order.accepted'],
] as const) {
  test(`rejects ${name} as a permanent failure`, () => {
    assert.throws(() => parseOrderEvent(content, key), InvalidNotificationEvent);
    assert.deepEqual(classifyNotificationFailure(new InvalidNotificationEvent('x')), {
      category: 'permanent',
      reason: 'invalid_event',
    });
  });
}

test('anything else is transient', () => {
  assert.equal(classifyNotificationFailure(new Error('db down')).category, 'transient');
});

// AI-generated (edited by Reallyeasy1)
const draft = (overrides: Record<string, unknown>, key: string) =>
  toNotification(parseOrderEvent(body({ ...accepted, eventType: key, ...overrides }), key));

test('order.accepted becomes ORDER_ACCEPTED and names the errand (F5.1.1)', () => {
  assert.deepEqual(draft({}, 'order.accepted'), {
    kind: 'ORDER_ACCEPTED',
    title: 'Your errand ORD-0001 was accepted',
    body: 'A courier has been assigned to your errand.',
  });
});

test('order.in_transit becomes ORDER_PICKED_UP, with the order code when the event carries one (F5.2.1)', () => {
  assert.deepEqual(draft({}, 'order.in_transit'), {
    kind: 'ORDER_PICKED_UP',
    title: 'Your errand ORD-0001 was picked up',
    body: 'Your courier has the items and is on the way.',
  });
  assert.equal(draft({ orderCode: undefined }, 'order.in_transit')?.title, 'Your errand was picked up');
});

test('order.delivered becomes ORDER_DELIVERED and asks the requester to confirm (F5.3.1)', () => {
  assert.deepEqual(draft({}, 'order.delivered'), {
    kind: 'ORDER_DELIVERED',
    title: 'Your errand ORD-0001 was delivered',
    body: 'Review the delivery and confirm it.',
  });
  assert.throws(() => parseOrderEvent(body({ ...accepted, eventType: 'order.delivered', courierId: undefined }), 'order.delivered'), InvalidNotificationEvent);
});

for (const key of ['order.created', 'order.completed', 'order.cancelled', 'order.expired']) {
  test(`${key} is accepted but produces no notification`, () => {
    assert.equal(draft({}, key), null);
  });
}

test('delivery stores the notification for the requester before pushing it, stamped with the event time', async () => {
  const steps: string[] = [];
  const stored: any[] = [];
  const saved = { id: 'row-1' } as any;
  const deliver = createDeliver(
    { insert: async (row) => { steps.push('insert'); stored.push(row); return saved; } },
    (userId, notification) => { steps.push(`push ${userId}`); assert.equal(notification, saved); },
  );
  const event = parseOrderEvent(body(accepted), 'order.accepted');
  await deliver(event, toNotification(event)!);
  assert.deepEqual(steps, ['insert', `push ${accepted.requesterId}`]);
  assert.deepEqual(stored[0], {
    userId: accepted.requesterId,
    eventId: accepted.eventId,
    kind: 'ORDER_ACCEPTED',
    orderId: accepted.orderId,
    orderCode: 'ORD-0001',
    courierId: accepted.courierId,
    title: 'Your errand ORD-0001 was accepted',
    body: 'A courier has been assigned to your errand.',
    createdAt: accepted.timestamp,
  });
});

test('a redelivered event that is already stored is not pushed again', async () => {
  let pushes = 0;
  const deliver = createDeliver({ insert: async () => null }, () => { pushes += 1; });
  const event = parseOrderEvent(body(accepted), 'order.accepted');
  await deliver(event, toNotification(event)!);
  assert.equal(pushes, 0);
});
