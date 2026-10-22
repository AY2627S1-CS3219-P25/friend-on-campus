/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Version-2 parsing (envelope, actor, reason code, versions, assignee fields), the payload fingerprint, the
 * infrastructure/permanent/transient classifier and createDeliver's push-after-commit, stale and duplicate behaviour,
 * per the author's Notification Redesign (§6, §8, §10). The version-1 cases are kept; the mapping tests moved to
 * policy.test.ts.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-17
 * Scope: Tests for courierUsername (F5.1.1): validated on parse, rendered in the acceptance body, generic fallback
 * without it, pickup and delivery wording unchanged.
 * Author review: <to be completed by Reallyeasy1>
 *
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
import type { NotificationDTO } from '@campus-errand/common-dtos';
import {
  InvalidNotificationEvent,
  classifyNotificationFailure,
  createDeliver,
  fingerprint,
  parseOrderEvent,
} from '../src/notifications/events';
import { ContractMismatch, type AppliedEvent, type ProcessedEventInput } from '../src/notifications/store';

const accepted = {
  eventId: '10000000-0000-4000-8000-000000000001',
  eventType: 'order.accepted',
  timestamp: '2026-10-03T04:00:00.000Z',
  orderId: '30000000-0000-4000-8000-000000000001',
  orderCode: 'ORD-0001',
  requesterId: '20000000-0000-4000-8000-000000000001',
  courierId: '20000000-0000-4000-8000-000000000002',
};
const cancelledV2 = {
  eventId: '10000000-0000-4000-8000-000000000002',
  eventType: 'order.cancelled',
  timestamp: '2026-10-22T10:30:00.000Z',
  schemaVersion: 2,
  producer: 'order-service',
  orderId: accepted.orderId,
  orderCode: 'ORD-1042',
  orderVersion: 5,
  previousStatus: 'ACCEPTED',
  status: 'CANCELLED',
  requesterId: accepted.requesterId,
  courierId: accepted.courierId,
  actorId: accepted.requesterId,
  actorRole: 'STUDENT',
  reasonCode: 'REQUESTER_CANCELLED',
  rewardCredits: 8,
  correlationId: accepted.orderId,
};
const body = (value: unknown) => Buffer.from(JSON.stringify(value));

test('accepts a well-formed version-1 order.accepted event and normalises ids', () => {
  const event = parseOrderEvent(body({ ...accepted, courierId: accepted.courierId.toUpperCase() }), 'order.accepted');
  assert.equal(event.schemaVersion, 1);
  assert.equal(event.courierId, accepted.courierId);
  assert.equal(event.orderCode, 'ORD-0001');
});

test('version-1 order.expired does not require a courier', () => {
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
  ['version-1 order.rejected', body({ ...accepted, eventType: 'order.rejected' }), 'order.rejected'],
  ['version-1 order.unassigned', body({ ...accepted, eventType: 'order.unassigned' }), 'order.unassigned'],
  ['an unknown schemaVersion', body({ ...cancelledV2, schemaVersion: 3 }), 'order.cancelled'],
  ['a foreign producer', body({ ...cancelledV2, producer: 'credit-service' }), 'order.cancelled'],
  ['a non-integer orderVersion', body({ ...cancelledV2, orderVersion: 1.5 }), 'order.cancelled'],
  ['an unknown status', body({ ...cancelledV2, status: 'DONE' }), 'order.cancelled'],
  ['an unknown reasonCode', body({ ...cancelledV2, reasonCode: 'BECAUSE' }), 'order.cancelled'],
  ['a missing reasonCode on cancellation', body({ ...cancelledV2, reasonCode: undefined }), 'order.cancelled'],
  ['a STUDENT actor without actorId', body({ ...cancelledV2, actorId: undefined }), 'order.cancelled'],
  ['a missing correlationId', body({ ...cancelledV2, correlationId: undefined }), 'order.cancelled'],
  ['a version-2 orderCode missing', body({ ...cancelledV2, orderCode: undefined }), 'order.cancelled'],
  ['unassigned without priorCourierId', body({ ...cancelledV2, eventType: 'order.unassigned', status: 'OPEN', reasonCode: 'COURIER_DROPPED' }), 'order.unassigned'],
] as const) {
  test(`rejects ${name} as a permanent failure`, () => {
    assert.throws(() => parseOrderEvent(content, key), InvalidNotificationEvent);
  });
}

test('parses a version-2 cancellation and keeps actor, reason, versions and assignee', () => {
  const event = parseOrderEvent(body(cancelledV2), 'order.cancelled');
  assert.equal(event.schemaVersion, 2);
  if (event.schemaVersion !== 2) return;
  assert.deepEqual(
    [event.producer, event.orderVersion, event.previousStatus, event.status, event.actorRole, event.actorId, event.reasonCode, event.courierId, event.correlationId],
    ['order-service', 5, 'ACCEPTED', 'CANCELLED', 'STUDENT', accepted.requesterId, 'REQUESTER_CANCELLED', accepted.courierId, accepted.orderId],
  );
  assert.equal('rewardCredits' in event, false, 'fields this service does not read are dropped');
});

test('a SYSTEM actor needs no actorId; unassigned carries priorCourierId', () => {
  const expired = parseOrderEvent(body({
    ...cancelledV2, eventType: 'order.expired', status: 'EXPIRED', previousStatus: 'OPEN', actorRole: 'SYSTEM', actorId: undefined, reasonCode: 'OPEN_EXPIRED', courierId: undefined,
  }), 'order.expired');
  assert.equal(expired.actorId, undefined);
  const unassigned = parseOrderEvent(body({
    ...cancelledV2, eventType: 'order.unassigned', status: 'OPEN', courierId: undefined, actorId: accepted.courierId, reasonCode: 'COURIER_DROPPED', priorCourierId: accepted.courierId,
  }), 'order.unassigned');
  assert.equal(unassigned.schemaVersion === 2 && unassigned.priorCourierId, accepted.courierId);
});

test('courierUsername is kept when valid and rejected when empty, over-long or not a string', () => {
  assert.equal(parseOrderEvent(body({ ...accepted, courierUsername: 'bob' }), 'order.accepted').courierUsername, 'bob');
  for (const courierUsername of ['', 'x'.repeat(51), 7, null]) {
    assert.throws(() => parseOrderEvent(body({ ...accepted, courierUsername }), 'order.accepted'), InvalidNotificationEvent);
  }
});

test('the fingerprint is stable under key order and extra unread fields, and differs on content', () => {
  const a = fingerprint(parseOrderEvent(body(cancelledV2), 'order.cancelled'));
  const shuffled = Object.fromEntries(Object.entries(cancelledV2).reverse());
  assert.equal(fingerprint(parseOrderEvent(body({ ...shuffled, rewardCredits: 9, extra: true }), 'order.cancelled')), a);
  assert.notEqual(fingerprint(parseOrderEvent(body({ ...cancelledV2, orderVersion: 6 }), 'order.cancelled')), a);
});

test('classification: invalid contracts are permanent, connectivity failures are infrastructure, anything else is transient', () => {
  assert.deepEqual(classifyNotificationFailure(new InvalidNotificationEvent('x')), { category: 'permanent', reason: 'invalid_event' });
  assert.deepEqual(classifyNotificationFailure(new ContractMismatch('x')), { category: 'permanent', reason: 'contract_mismatch' });
  for (const failure of [{ code: 'P1001' }, { code: 'ECONNREFUSED' }, { code: 'P2010', meta: { code: '57P01' } }, new Error('wrapped', { cause: { code: 'ECONNRESET' } })]) {
    assert.equal(classifyNotificationFailure(failure).category, 'infrastructure');
  }
  assert.equal(classifyNotificationFailure(new Error('db down')).category, 'transient');
  assert.equal(classifyNotificationFailure({ code: 'P2002' }).category, 'transient');
});

// AI-generated (edited by Reallyeasy1)
function fakeHub(steps: string[]) {
  return {
    push: (userId: string, n: NotificationDTO) => { steps.push(`push ${userId} ${n.kind}`); },
    inboxChanged: (userId: string) => { steps.push(`inbox ${userId}`); },
  };
}
const dto = (userId: string, kind: string) => ({ userId, notification: { id: `${userId}-${kind}`, kind } as unknown as NotificationDTO });

test('delivery applies the event in the store first, then pushes one frame per recipient and one INBOX_CHANGED each', async () => {
  const steps: string[] = [];
  let received: ProcessedEventInput | undefined;
  const deliver = createDeliver({
    applyEvent: async (event, drafts) => {
      steps.push('apply');
      received = event;
      return { outcome: 'created', stale: false, created: drafts.map((d) => dto(d.userId, d.kind)) };
    },
  }, fakeHub(steps));
  await deliver(parseOrderEvent(body({ ...cancelledV2, actorRole: 'ADMIN', actorId: '90000000-0000-4000-8000-000000000001', reasonCode: 'ADMIN_CANCELLED' }), 'order.cancelled'));
  assert.equal(steps[0], 'apply');
  assert.deepEqual(steps.slice(1).sort(), [
    `inbox ${accepted.courierId}`, `inbox ${accepted.requesterId}`,
    `push ${accepted.courierId} ORDER_CANCELLED`, `push ${accepted.requesterId} ORDER_CANCELLED`,
  ].sort());
  assert.deepEqual(received, {
    producer: 'order-service',
    eventId: cancelledV2.eventId,
    fingerprint: fingerprint(parseOrderEvent(body({ ...cancelledV2, actorRole: 'ADMIN', actorId: '90000000-0000-4000-8000-000000000001', reasonCode: 'ADMIN_CANCELLED' }), 'order.cancelled')),
    schemaVersion: 2,
    policyVersion: 1,
    orderId: accepted.orderId,
    orderCode: 'ORD-1042',
    courierId: accepted.courierId,
    occurredAt: cancelledV2.timestamp,
    projection: { orderVersion: 5, status: 'CANCELLED', requesterId: accepted.requesterId, courierId: accepted.courierId },
  });
});

test('a version-1 event carries no projection and is stored with the event time', async () => {
  let received: ProcessedEventInput | undefined;
  const deliver = createDeliver({ applyEvent: async (event) => { received = event; return { outcome: 'created', stale: false, created: [] }; } }, fakeHub([]));
  await deliver(parseOrderEvent(body(accepted), 'order.accepted'));
  assert.equal(received?.schemaVersion, 1);
  assert.equal(received?.projection, undefined);
  assert.equal(received?.occurredAt, accepted.timestamp);
});

test('a stale event is stored but not pushed; its recipients still get INBOX_CHANGED', async () => {
  const steps: string[] = [];
  const deliver = createDeliver({
    applyEvent: async (): Promise<AppliedEvent> => ({ outcome: 'created', stale: true, created: [dto(accepted.requesterId, 'ORDER_DELIVERED')] }),
  }, fakeHub(steps));
  await deliver(parseOrderEvent(body(accepted), 'order.accepted'));
  assert.deepEqual(steps, [`inbox ${accepted.requesterId}`]);
});

test('a duplicate or suppressed event is neither pushed nor invalidated', async () => {
  const steps: string[] = [];
  for (const applied of [{ outcome: 'duplicate', stale: false, created: [] }, { outcome: 'suppressed', stale: false, created: [] }] as AppliedEvent[]) {
    const deliver = createDeliver({ applyEvent: async () => applied }, fakeHub(steps));
    await deliver(parseOrderEvent(body(accepted), 'order.accepted'));
  }
  assert.deepEqual(steps, []);
});
