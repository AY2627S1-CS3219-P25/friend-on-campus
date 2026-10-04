/**
 * AI Assistance Disclosure:
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
  parseOrderEvent,
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
