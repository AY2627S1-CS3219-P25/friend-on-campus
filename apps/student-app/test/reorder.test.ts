/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-06
 * Scope: Tests for the "Order again" request builder.
 * Author review: <to be completed by the author>
 */
// AI-generated (edited by jagdeepsh)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { OrderDTO } from '@campus-errand/common-dtos';
import { buildReorderRequest, originalDurationMinutes, stripAdminNotes } from '../src/orders/reorder';

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
