/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Tests for the inbox helpers of the author's Notification Redesign: open actions follow the live order status,
 * views, id-merging of duplicate frames, the toast rule and the unknown-kind label. Replaces test/errands.test.ts.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NotificationDTO } from '@campus-errand/common-dtos';
import { inView, isActionOpen, kindLabel, mergeNotifications, shouldToast } from '../src/notifications/inbox';

const row = (overrides: Partial<NotificationDTO> = {}): NotificationDTO => ({
  id: 'n1', kind: 'ORDER_DELIVERED', orderId: 'order-1', orderCode: 'ORD-1', courierId: null, title: 't', body: 'b',
  readAt: null, createdAt: '2026-10-22T04:00:00.000Z', producer: 'order-service', category: 'ACTION', priority: 'HIGH',
  actionType: 'REVIEW_DELIVERY', targetId: 'order-1', sourceVersion: 4, storedAt: '2026-10-22T04:00:01.000Z', orderStatus: 'DELIVERED',
  ...overrides,
});

test('a delivery review is open while the order is DELIVERED, or when nothing newer is known', () => {
  assert.equal(isActionOpen(row()), true);
  assert.equal(isActionOpen(row({ orderStatus: null })), true, 'legacy row with no projection: let the errand screen validate');
  assert.equal(isActionOpen(row({ orderStatus: 'COMPLETED' })), false);
  assert.equal(isActionOpen(row({ orderStatus: 'DELIVERED' }), 'COMPLETED'), false, 'the order the app loaded beats the projection');
  assert.equal(isActionOpen(row({ orderStatus: 'COMPLETED' }), 'DELIVERED'), true);
  assert.equal(isActionOpen(row({ readAt: '2026-10-22T05:00:00.000Z' })), true, 'reading does not resolve the action');
  assert.equal(isActionOpen(row({ actionType: 'VIEW_ERRAND' })), false);
});

test('views: action_needed, important, unread and all', () => {
  const cancelled = row({ id: 'n2', kind: 'ORDER_CANCELLED', category: 'IMPORTANT', actionType: 'VIEW_ERRAND', readAt: '2026-10-22T05:00:00.000Z' });
  assert.deepEqual([inView(row(), 'action_needed'), inView(cancelled, 'action_needed')], [true, false]);
  assert.deepEqual([inView(row(), 'important'), inView(cancelled, 'important')], [false, true]);
  assert.deepEqual([inView(row(), 'unread'), inView(cancelled, 'unread')], [true, false]);
  assert.deepEqual([inView(row(), 'all'), inView(cancelled, 'all')], [true, true]);
});

test('merging keeps one row per id with the incoming copy, newest arrival first', () => {
  const older = row({ id: 'a', storedAt: '2026-10-22T04:00:00.000Z' });
  const newer = row({ id: 'b', storedAt: '2026-10-22T04:00:05.000Z' });
  const merged = mergeNotifications([older, newer], [{ ...older, readAt: '2026-10-22T04:01:00.000Z' }, newer]);
  assert.deepEqual(merged.map((n) => n.id), ['b', 'a']);
  assert.ok(merged[1].readAt, 'the incoming copy wins');
  assert.equal(mergeNotifications([], [newer, newer]).length, 1, 'a duplicate frame adds nothing');
});

test('toast rule: never for the publication receipt, never on the Tasks or Alerts screens', () => {
  assert.equal(shouldToast(row(), 'feed'), true);
  assert.equal(shouldToast(row({ priority: 'NORMAL', kind: 'ORDER_ACCEPTED' }), 'post'), true);
  assert.equal(shouldToast(row({ kind: 'ORDER_PUBLISHED', priority: 'NORMAL' }), 'feed'), false);
  assert.equal(shouldToast(row(), 'tasks'), false);
  assert.equal(shouldToast(row(), 'alerts'), false);
});

test('unknown kinds get a generic label', () => {
  assert.equal(kindLabel('ORDER_CANCELLED'), 'Cancelled');
  assert.equal(kindLabel('SOMETHING_NEW'), 'Update');
});
