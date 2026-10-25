/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Increment 6 receipts added 2026-10-23. One test per row of the recipient and trigger matrix in the author's Notification Redesign (§3, §4), plus the
 * audience rules (no self-alert, deduplicated recipients, version-1 events keep only the F5 alerts).
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import { parseNotificationEvent, parseOrderEvent } from '../src/notifications/events';
import { toNotifications } from '../src/notifications/policy';

const REQUESTER = '20000000-0000-4000-8000-000000000001';
const COURIER = '20000000-0000-4000-8000-000000000002';
const ADMIN = '90000000-0000-4000-8000-000000000001';
const ORDER = '30000000-0000-4000-8000-000000000001';

const v2 = (eventType: string, overrides: Record<string, unknown> = {}) => {
  const payload: Record<string, unknown> = {
    eventId: '10000000-0000-4000-8000-000000000001',
    eventType,
    timestamp: '2026-10-22T04:00:00.000Z',
    schemaVersion: 2,
    producer: 'order-service',
    orderId: ORDER,
    orderCode: 'ORD-1042',
    orderVersion: 5,
    previousStatus: 'OPEN',
    status: 'ACCEPTED',
    requesterId: REQUESTER,
    actorRole: 'STUDENT',
    actorId: COURIER,
    correlationId: ORDER,
    ...overrides,
  };
  for (const [k, v] of Object.entries(payload)) if (v === undefined) delete payload[k];
  return parseOrderEvent(Buffer.from(JSON.stringify(payload)), eventType);
};
const v1 = (eventType: string, overrides: Record<string, unknown> = {}) =>
  parseOrderEvent(Buffer.from(JSON.stringify({
    eventId: '10000000-0000-4000-8000-000000000001', eventType, timestamp: '2026-10-22T04:00:00.000Z',
    orderId: ORDER, orderCode: 'ORD-1042', requesterId: REQUESTER, courierId: COURIER, ...overrides,
  })), eventType);

const important = (userId: string, kind: string, priority: 'HIGH' | 'NORMAL', title: string, body: string, actionType = 'VIEW_ERRAND') =>
  ({ userId, kind, category: 'IMPORTANT', priority, actionType, title, body });

test('version 1: accepted, picked up and delivered keep their F5 wording and go to the requester only', () => {
  assert.deepEqual(toNotifications(v1('order.accepted', { courierUsername: 'bob' })), [{
    userId: REQUESTER, kind: 'ORDER_ACCEPTED', category: 'PROGRESS', priority: 'NORMAL', actionType: 'VIEW_ERRAND',
    title: 'Your errand ORD-1042 was accepted', body: 'bob accepted your errand and will pick the items up next.',
  }]);
  assert.equal(toNotifications(v1('order.accepted'))[0].body, 'A courier has been assigned to your errand.');
  assert.equal(toNotifications(v1('order.in_transit', { orderCode: undefined }))[0].title, 'Your errand was picked up');
  assert.deepEqual(toNotifications(v1('order.delivered')), [{
    userId: REQUESTER, kind: 'ORDER_DELIVERED', category: 'ACTION', priority: 'HIGH', actionType: 'REVIEW_DELIVERY',
    title: 'Your errand ORD-1042 was delivered', body: 'Review the delivery and confirm it.',
  }]);
});

for (const key of ['order.created', 'order.completed', 'order.cancelled', 'order.expired']) {
  test(`version 1 ${key} has no defined recipient and produces nothing`, () => {
    assert.deepEqual(toNotifications(v1(key)), []);
  });
}

test('v2 order.created: quiet publication receipt for the requester', () => {
  assert.deepEqual(toNotifications(v2('order.created', { previousStatus: 'PENDING', status: 'OPEN', actorRole: 'SYSTEM', actorId: undefined })), [{
    userId: REQUESTER, kind: 'ORDER_PUBLISHED', category: 'PROGRESS', priority: 'NORMAL', actionType: 'VIEW_ERRAND',
    title: 'Errand ORD-1042 is posted', body: 'Couriers can now see it. You will hear here when one accepts it.',
  }]);
});

test('v2 progress alerts: accepted names the courier; the acting courier gets no self-alert', () => {
  const drafts = toNotifications(v2('order.accepted', { courierId: COURIER, courierUsername: 'bob' }));
  assert.deepEqual(drafts.map((d) => [d.userId, d.kind]), [[REQUESTER, 'ORDER_ACCEPTED']]);
  assert.equal(drafts[0].body, 'bob accepted your errand and will pick the items up next.');
  assert.deepEqual(toNotifications(v2('order.in_transit', { courierId: COURIER, previousStatus: 'ACCEPTED', status: 'IN_TRANSIT' })).map((d) => d.kind), ['ORDER_PICKED_UP']);
  assert.deepEqual(toNotifications(v2('order.delivered', { courierId: COURIER, previousStatus: 'IN_TRANSIT', status: 'DELIVERED' })).map((d) => d.actionType), ['REVIEW_DELIVERY']);
});

test('v2 order.completed by the requester: courier only, normal priority, no claim about money', () => {
  const drafts = toNotifications(v2('order.completed', {
    courierId: COURIER, previousStatus: 'DELIVERED', status: 'COMPLETED', actorId: REQUESTER, reasonCode: 'REQUESTER_CONFIRMED',
  }));
  assert.deepEqual(drafts, [important(COURIER, 'ORDER_COMPLETED', 'NORMAL', 'Delivery confirmed for ORD-1042',
    'The requester confirmed your delivery. Your payment appears in your wallet once it is settled.')]);
});

test('v2 order.completed by an administrator: requester and courier, high priority', () => {
  const drafts = toNotifications(v2('order.completed', {
    courierId: COURIER, previousStatus: 'DELIVERED', status: 'COMPLETED', actorRole: 'ADMIN', actorId: ADMIN, reasonCode: 'ADMIN_CONFIRMED',
  }));
  assert.deepEqual(drafts, [REQUESTER, COURIER].map((u) => important(u, 'ORDER_COMPLETED', 'HIGH', 'ORD-1042 was completed by an administrator',
    'An administrator confirmed this delivery. Open the errand to see its final state.')));
});

test('v2 order.cancelled by the requester: the assigned courier is told, an OPEN cancellation tells nobody', () => {
  const accepted = v2('order.cancelled', {
    courierId: COURIER, previousStatus: 'ACCEPTED', status: 'CANCELLED', actorId: REQUESTER, reasonCode: 'REQUESTER_CANCELLED',
  });
  assert.deepEqual(toNotifications(accepted), [important(COURIER, 'ORDER_CANCELLED', 'HIGH', 'Errand cancelled', 'The requester cancelled ORD-1042 before pickup.')]);
  const open = v2('order.cancelled', { previousStatus: 'OPEN', status: 'CANCELLED', actorId: REQUESTER, reasonCode: 'REQUESTER_CANCELLED' });
  assert.deepEqual(toNotifications(open), []);
});

test('v2 order.cancelled by an administrator: requester and courier if any, safe wording, no admin note', () => {
  const both = v2('order.cancelled', {
    courierId: COURIER, previousStatus: 'IN_TRANSIT', status: 'CANCELLED', actorRole: 'ADMIN', actorId: ADMIN, reasonCode: 'ADMIN_CANCELLED',
  });
  assert.deepEqual(toNotifications(both), [REQUESTER, COURIER].map((u) => important(u, 'ORDER_CANCELLED', 'HIGH', 'Errand cancelled',
    'An administrator cancelled ORD-1042. Open the errand for its current status.')));
  const unassigned = v2('order.cancelled', { previousStatus: 'OPEN', status: 'CANCELLED', actorRole: 'ADMIN', actorId: ADMIN, reasonCode: 'ADMIN_CANCELLED' });
  assert.deepEqual(toNotifications(unassigned).map((d) => d.userId), [REQUESTER]);
});

test('v2 order.expired: OPEN_EXPIRED and PUBLICATION_EXPIRED have distinct wording for the requester', () => {
  const open = v2('order.expired', { previousStatus: 'OPEN', status: 'EXPIRED', actorRole: 'SYSTEM', actorId: undefined, reasonCode: 'OPEN_EXPIRED' });
  assert.deepEqual(toNotifications(open), [important(REQUESTER, 'ORDER_EXPIRED', 'NORMAL', 'Errand ORD-1042 expired',
    'No courier accepted it before the deadline. You can post a new request.')]);
  const late = v2('order.expired', { previousStatus: 'PENDING', status: 'EXPIRED', actorRole: 'SYSTEM', actorId: undefined, reasonCode: 'PUBLICATION_EXPIRED' });
  assert.deepEqual(toNotifications(late), [important(REQUESTER, 'ORDER_EXPIRED', 'NORMAL', 'Errand ORD-1042 could not be posted in time',
    'The deadline passed before publication completed. Any reserved credits are returned separately.')]);
});

test('v2 order.unassigned: a courier drop tells the requester; an admin removal tells requester and prior courier', () => {
  const dropped = v2('order.unassigned', { previousStatus: 'ACCEPTED', status: 'OPEN', priorCourierId: COURIER, reasonCode: 'COURIER_DROPPED' });
  assert.deepEqual(toNotifications(dropped), [important(REQUESTER, 'ORDER_UNASSIGNED', 'HIGH', 'Your courier dropped ORD-1042', 'It is open again for another courier.')]);
  const removed = v2('order.unassigned', {
    previousStatus: 'ACCEPTED', status: 'OPEN', priorCourierId: COURIER, actorRole: 'ADMIN', actorId: ADMIN, reasonCode: 'ADMIN_UNASSIGNED',
  });
  assert.deepEqual(toNotifications(removed), [
    important(REQUESTER, 'ORDER_UNASSIGNED', 'HIGH', 'Courier removed from ORD-1042', 'An administrator removed the courier. It is open again.'),
    important(COURIER, 'ORDER_UNASSIGNED', 'HIGH', 'You were removed from ORD-1042', 'An administrator removed you from this errand.'),
  ]);
});

test('v2 order.rejected: insufficient credits points at the wallet, any other reason at the errand', () => {
  const broke = v2('order.rejected', { previousStatus: 'PENDING', status: 'REJECTED', actorRole: 'SYSTEM', actorId: undefined, reasonCode: 'INSUFFICIENT_CREDITS' });
  assert.deepEqual(toNotifications(broke), [important(REQUESTER, 'ORDER_REJECTED', 'HIGH', 'Errand ORD-1042 could not be posted',
    'There were not enough available credits. Review your wallet or lower the reward and try again.', 'REVIEW_WALLET')]);
  const other = v2('order.rejected', { previousStatus: 'PENDING', status: 'REJECTED', actorRole: 'SYSTEM', actorId: undefined, reasonCode: 'RESERVATION_FAILED' });
  assert.deepEqual(toNotifications(other), [important(REQUESTER, 'ORDER_REJECTED', 'HIGH', 'Errand ORD-1042 could not be posted',
    'The credit reservation was declined. Open the errand for details.')]);
});

test('audience rules: the acting identity is excluded even when it is a participant, and recipients are deduplicated', () => {
  // An administrator who is also the requester cancels their own errand: only the courier hears.
  const selfAdmin = v2('order.cancelled', {
    courierId: COURIER, previousStatus: 'ACCEPTED', status: 'CANCELLED', actorRole: 'ADMIN', actorId: REQUESTER, reasonCode: 'ADMIN_CANCELLED',
  });
  assert.deepEqual(toNotifications(selfAdmin).map((d) => d.userId), [COURIER]);
  // Corrupt data where requester equals the prior courier yields one row, not two.
  const same = v2('order.unassigned', {
    previousStatus: 'ACCEPTED', status: 'OPEN', priorCourierId: REQUESTER, actorRole: 'ADMIN', actorId: ADMIN, reasonCode: 'ADMIN_UNASSIGNED',
  });
  assert.equal(toNotifications(same).length, 1);
});

// AI-generated (edited by Reallyeasy1)
const LEDGER = '50000000-0000-4000-8000-000000000001';
const receiptEvent = (eventType: string, overrides: Record<string, unknown> = {}) => {
  const payload: Record<string, unknown> = {
    eventId: '10000000-0000-4000-8000-000000000009', eventType, timestamp: '2026-10-23T04:00:00.000Z',
    schemaVersion: 2, producer: 'credit-service', orderId: ORDER, orderCode: 'ORD-1042', correlationId: ORDER,
    ledgerTransactionId: LEDGER, transactionCode: 'TX-abc123', amount: 8, requesterId: REQUESTER,
    ...overrides,
  };
  for (const [k, v] of Object.entries(payload)) if (v === undefined) delete payload[k];
  return parseNotificationEvent(Buffer.from(JSON.stringify(payload)), eventType);
};

test('credit.escrow.settled: quiet receipt for the courier with the exact amount and ledger code', () => {
  assert.deepEqual(toNotifications(receiptEvent('credit.escrow.settled', { beneficiaryId: COURIER, courierId: COURIER })), [{
    userId: COURIER, kind: 'CREDITS_RECEIVED', category: 'RECEIPT', priority: 'NORMAL', actionType: 'REVIEW_WALLET',
    title: '8 credits received', body: 'Payment for ORD-1042 is complete (TX-abc123).',
  }]);
});

test('credit.escrow.refunded: quiet receipt for the requester; without an order code it still reads', () => {
  assert.deepEqual(toNotifications(receiptEvent('credit.escrow.refunded', { beneficiaryId: REQUESTER, orderCode: undefined })), [{
    userId: REQUESTER, kind: 'CREDITS_RETURNED', category: 'RECEIPT', priority: 'NORMAL', actionType: 'REVIEW_WALLET',
    title: '8 reserved credits are available again', body: 'Refund for your errand is complete (TX-abc123).',
  }]);
});
