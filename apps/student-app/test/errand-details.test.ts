/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Unit tests for src/errand/details.ts (issue #188, DP1.4–DP1.6, DP1.8): tracker states per status including a
 * terminal order with partial timestamps, end states, escrow state and copy, viewer role for a former courier, the
 * countdown clamp at zero, and the conversation rule.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { OrderStatus } from '@campus-errand/common-dtos';
import { endState, escrowCopy, escrowState, formatCountdown, hasConversation, trackerSteps, viewerRole } from '../src/errand/details';

const T0 = '2026-10-26T04:00:00.000Z';
const T1 = '2026-10-26T04:10:00.000Z';
const T2 = '2026-10-26T04:20:00.000Z';
const times = { createdAt: T0, acceptedAt: null, pickedUpAt: null, deliveredAt: null, completedAt: null };

test('tracker: IN_TRANSIT with timestamps marks posted, accepted, picked up done and delivered current', () => {
  const steps = trackerSteps({ ...times, status: 'IN_TRANSIT', acceptedAt: T1, pickedUpAt: T2 });
  assert.deepEqual(steps.map((s) => [s.key, s.state, s.at]), [
    ['posted', 'done', T0], ['accepted', 'done', T1], ['picked_up', 'done', T2], ['delivered', 'current', null], ['completed', 'todo', null],
  ]);
});

test('tracker: CANCELLED after pickup shows three done and nothing current', () => {
  const steps = trackerSteps({ ...times, status: 'CANCELLED', acceptedAt: T1, pickedUpAt: T2 });
  assert.deepEqual(steps.map((s) => s.state), ['done', 'done', 'done', 'todo', 'todo']);
});

test('tracker: PENDING has posted current and nothing done; COMPLETED has all five done', () => {
  assert.deepEqual(trackerSteps({ ...times, status: 'PENDING' }).map((s) => s.state), ['current', 'todo', 'todo', 'todo', 'todo']);
  const all = trackerSteps({ status: 'COMPLETED', createdAt: T0, acceptedAt: T1, pickedUpAt: T2, deliveredAt: T2, completedAt: T2 });
  assert.deepEqual(all.map((s) => s.state), ['done', 'done', 'done', 'done', 'done']);
  assert.equal(all[0].label, 'Posted');
});

test('endState: CANCELLED with a reason, EXPIRED, REJECTED, DISPUTED, and null for OPEN', () => {
  assert.deepEqual(endState({ status: 'CANCELLED', rejectionReason: 'Admin: duplicate' }), { label: 'Cancelled', reason: 'Admin: duplicate' });
  assert.deepEqual(endState({ status: 'EXPIRED', rejectionReason: null }), { label: 'Expired', reason: null });
  assert.deepEqual(endState({ status: 'REJECTED', rejectionReason: '' }), { label: 'Declined', reason: null });
  assert.deepEqual(endState({ status: 'DISPUTED' }), { label: 'Disputed', reason: null });
  assert.equal(endState({ status: 'OPEN' }), null);
  assert.equal(endState({ status: 'COMPLETED' }), null);
});

test('escrowState per status and escrowCopy wording never claims a transfer happened', () => {
  const expected: Record<OrderStatus, ReturnType<typeof escrowState>> = {
    PENDING: 'reserving', OPEN: 'held', ACCEPTED: 'held', IN_TRANSIT: 'held', DELIVERED: 'held',
    COMPLETED: 'released', CANCELLED: 'returned', EXPIRED: 'returned', REJECTED: 'returned', DISPUTED: 'disputed',
  };
  for (const [status, state] of Object.entries(expected)) assert.equal(escrowState(status as OrderStatus), state, status);
  assert.equal(escrowCopy('held', 5), '5 credits held in escrow');
  assert.equal(escrowCopy('released', 5), '5 credits paid to the courier once Credit Service settles the escrow');
  assert.equal(escrowCopy('returned', 3), '3 reserved credits are returned by Credit Service');
  assert.equal(escrowCopy('reserving', 3), 'Reserving 3 credits…');
  assert.equal(escrowCopy('disputed', 3), '3 credits held while the dispute is resolved');
});

test('viewerRole: requester, courier, other (former courier or admin)', () => {
  const order = { requesterId: 'alice', courierId: 'bob' };
  assert.equal(viewerRole(order, 'alice'), 'requester');
  assert.equal(viewerRole(order, 'bob'), 'courier');
  assert.equal(viewerRole(order, 'carol'), 'other', 'a former courier gets no participant view');
  assert.equal(viewerRole({ requesterId: 'alice', courierId: null }, null), 'other');
});

test('formatCountdown: m:ss under an hour, h:mm:ss above, days from 48 h, 0:00 when past', () => {
  const now = Date.parse(T0);
  assert.equal(formatCountdown(new Date(now + 303_000).toISOString(), now), '5:03');
  assert.equal(formatCountdown(new Date(now + 3_723_000).toISOString(), now), '1:02:03');
  assert.equal(formatCountdown(new Date(now + 47 * 3_600_000).toISOString(), now), '47:00:00');
  assert.equal(formatCountdown(new Date(now + 175 * 86_400_000 + 5 * 3_600_000).toISOString(), now), '175d 5h', 'long-lived seed errands read in days');
  assert.equal(formatCountdown(new Date(now - 1_000).toISOString(), now), '0:00', 'expiry already passed (sweeper lag)');
});

test('hasConversation: false for PENDING, OPEN, REJECTED; true from ACCEPTED onwards', () => {
  for (const status of ['PENDING', 'OPEN', 'REJECTED'] as const) assert.equal(hasConversation(status), false, status);
  for (const status of ['ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'DISPUTED'] as const) assert.equal(hasConversation(status), true, status);
});
