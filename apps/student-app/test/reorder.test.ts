/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-10
 * Scope: Add unit tests for confirmReorderWhenStoreClosed when the pickup store is open, closed, or has unknown hours (issue #234).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 *
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-06
 * Scope: Tests for the "Order again" request builder.
 * Author review: <to be completed by the author>
 */
// AI-generated (edited by yanhwee)
// AI-generated (edited by jagdeepsh)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { OrderDTO, SupplierDTO } from '@campus-errand/common-dtos';
import { buildReorderRequest, confirmReorderWhenStoreClosed, originalDurationMinutes, stripAdminNotes } from '../src/orders/reorder';

const order: OrderDTO = {
  id: 'o1', orderCode: 'ORD-1', requesterId: 'u1', courierId: 'u2', supplierId: 's1', supplierName: 'Deck',
  itemDescription: '2x Iced Americano', specialNotes: 'No sugar', dropoffLocation: 'COM1 level 2',
  requesterContactNote: 'Text me', courierContactNote: 'On my way', rewardCredits: 15,
  dropoffLatitude: 1.29, dropoffLongitude: 103.77, estimatedRewardCredits: 18,
  status: 'COMPLETED', expiresAt: '2026-11-05T10:45:00.000Z', createdAt: '2026-11-05T10:00:00.000Z', version: 6,
};

test('the request repeats the details of the completed errand', () => {
  assert.deepEqual(buildReorderRequest(order), {
    supplierId: 's1', itemDescription: '2x Iced Americano', specialNotes: 'No sugar', dropoffLocation: 'COM1 level 2',
    requesterContactNote: 'Text me', rewardCredits: 15, durationMinutes: 45,
    dropoffLatitude: 1.29, dropoffLongitude: 103.77, estimatedRewardCredits: 18,
  });
});

test('optional fields are left out when the original had none', () => {
  const plain = buildReorderRequest({ ...order, specialNotes: undefined, requesterContactNote: undefined, dropoffLatitude: undefined, dropoffLongitude: undefined, estimatedRewardCredits: undefined });
  assert.deepEqual(Object.keys(plain).sort(), ['dropoffLocation', 'durationMinutes', 'itemDescription', 'rewardCredits', 'supplierId']);
});

test('admin audit tags are not copied, the requester words are', () => {
  assert.equal(stripAdminNotes('No sugar | [Admin Force-Complete by a1: Dispute settled]'), 'No sugar');
  assert.equal(stripAdminNotes('[Admin Cancel by a1: x]'), undefined);
  assert.equal(stripAdminNotes('Leave at desk | Ring bell'), 'Leave at desk | Ring bell');
});

test('the duration is the original window, clamped to 30 to 1440 minutes', () => {
  assert.equal(originalDurationMinutes({ createdAt: '2026-11-05T10:00:00.000Z', expiresAt: '2026-11-05T10:10:00.000Z' }), 30);
  assert.equal(originalDurationMinutes({ createdAt: '2026-11-05T10:00:00.000Z', expiresAt: '2026-11-08T10:00:00.000Z' }), 1440);
  assert.equal(originalDurationMinutes({ createdAt: 'bad', expiresAt: 'bad' }), 30);
});

// AI-generated (edited by yanhwee)
test('confirmReorderWhenStoreClosed prompts only when the store is outside its operating hours (issue #234)', () => {
  const deck: SupplierDTO = {
    id: 's1',
    supplierCode: 'SUP-001',
    name: 'The Deck',
    campusZone: 'FASS',
    exactLocation: 'Level 1',
    category: 'Food',
    startingTime: '0800hrs',
    closingTime: '2000hrs',
    isActive: true,
    createdAt: '2026-11-01T00:00:00.000Z',
  };
  const openAtNoonSGT = new Date('2026-11-05T04:00:00.000Z'); // 12:00 SGT
  const closedAtLateNightSGT = new Date('2026-11-05T14:30:00.000Z'); // 22:30 SGT

  const prompts: string[] = [];
  assert.equal(
    confirmReorderWhenStoreClosed(order, [deck], openAtNoonSGT, (msg) => {
      prompts.push(msg);
      return false;
    }),
    true,
    'open store does not prompt',
  );
  assert.equal(prompts.length, 0);

  assert.equal(
    confirmReorderWhenStoreClosed(order, [deck], closedAtLateNightSGT, (msg) => {
      prompts.push(msg);
      return false;
    }),
    false,
    'closed store cancelled by user returns false',
  );
  assert.equal(prompts.length, 1);
  assert.match(prompts[0], /The Deck is currently closed \(operating hours: 08:00 – 20:00\)/);

  assert.equal(
    confirmReorderWhenStoreClosed(order, [deck], closedAtLateNightSGT, () => true),
    true,
    'closed store confirmed by user returns true',
  );

  const unknownHours: SupplierDTO = { ...deck, startingTime: undefined, closingTime: undefined };
  assert.equal(
    confirmReorderWhenStoreClosed(order, [unknownHours], closedAtLateNightSGT, () => false),
    true,
    'store without operating hours does not prompt',
  );
});
