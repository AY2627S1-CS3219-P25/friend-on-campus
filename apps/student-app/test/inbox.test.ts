/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-24
 * Scope: Review regressions (PR #184) for the paging data flow against a fake offset-paginating server: the only
 * Important row sitting beyond the first 50 All rows is fetched when that view is selected, and 100 loaded + 60 offline
 * arrivals end with all 160 ids present before hasMore turns false.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Tests for the inbox helpers of the author's Notification Redesign: open actions follow the live order status,
 * views, id-merging of duplicate frames, the toast rule and the unknown-kind label. Replaces test/errands.test.ts.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { NotificationDTO, NotificationPageDTO } from '@campus-errand/common-dtos';
import { applyPages, inboxQuery, inView, isActionOpen, kindLabel, mergeNotifications, shouldToast, type InboxView } from '../src/notifications/inbox';

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
  assert.equal(shouldToast(row({ kind: 'CREDITS_RECEIVED', category: 'RECEIPT', priority: 'NORMAL' }), 'feed'), false, 'wallet receipts are quiet');
});

test('unknown kinds get a generic label', () => {
  assert.equal(kindLabel('ORDER_CANCELLED'), 'Cancelled');
  assert.equal(kindLabel('CREDITS_RETURNED'), 'Credits returned');
  assert.equal(kindLabel('SOMETHING_NEW'), 'Update');
});

// ---------------------------------------------------------------------------------------------------------------
// Paging data flow. A fake of the service's GET /api/notifications: offset pages over rows newest first, the same
// view/unread filters as store.list(). The "client" below does what useNotifications does with the responses.
// ---------------------------------------------------------------------------------------------------------------
const at = (i: number) => new Date(Date.UTC(2026, 9, 22, 0, 0, 0) + i * 1000).toISOString();
const rows = (count: number, from = 0, overrides: Partial<NotificationDTO> = {}) =>
  Array.from({ length: count }, (_, i) => row({ id: `n${from + i}`, storedAt: at(from + i), createdAt: at(from + i), kind: 'ORDER_ACCEPTED', category: 'PROGRESS', priority: 'NORMAL', actionType: 'VIEW_ERRAND', ...overrides }));

function serve(db: NotificationDTO[], query: string): NotificationPageDTO {
  const q = new URLSearchParams(query);
  const view = q.get('view'); const page = Number(q.get('page')); const limit = Number(q.get('limit'));
  const matching = [...db].sort((a, b) => b.storedAt.localeCompare(a.storedAt)).filter((n) =>
    (q.get('unread') !== 'true' || !n.readAt) && (view === 'all' || inView(n, view as InboxView)));
  return { items: matching.slice((page - 1) * limit, page * limit), total: matching.length, page, limit, totalPages: Math.ceil(matching.length / limit), unreadCount: db.filter((n) => !n.readAt).length };
}

function client(db: () => NotificationDTO[], limit = 50) {
  let items: NotificationDTO[] = []; let pagesLoaded = 0; let hasMore = false; let total = 0;
  const fetchPage = (view: InboxView, page: number) => serve(db(), inboxQuery(view, page, limit));
  const apply = (pages: NotificationPageDTO[]) => { ({ items, pagesLoaded, hasMore, total } = applyPages(items, pages)); };
  return {
    refresh: (view: InboxView) => apply(Array.from({ length: Math.max(1, pagesLoaded) }, (_, i) => fetchPage(view, i + 1))),
    loadMore: (view: InboxView) => apply([fetchPage(view, pagesLoaded + 1)]),
    selectView: (view: InboxView) => { pagesLoaded = 0; apply([fetchPage(view, 1)]); },
    get items() { return items; }, get hasMore() { return hasMore; }, get total() { return total; }, get pagesLoaded() { return pagesLoaded; },
  };
}

test('inboxQuery: views go to the server; Unread is unread=true over All', () => {
  assert.equal(inboxQuery('all', 1, 50), 'view=all&page=1&limit=50');
  assert.equal(inboxQuery('important', 2, 50), 'view=important&page=2&limit=50');
  assert.equal(inboxQuery('action_needed', 1, 20), 'view=action_needed&page=1&limit=20');
  assert.equal(inboxQuery('unread', 3, 50), 'view=all&unread=true&page=3&limit=50');
});

test('the only Important row beyond the first 50 All rows is fetched when that view is selected', () => {
  const important = row({ id: 'old-important', kind: 'ORDER_CANCELLED', category: 'IMPORTANT', actionType: 'VIEW_ERRAND', storedAt: at(-1), createdAt: at(-1) });
  const db = [...rows(50, 0), important];
  const c = client(() => db);
  c.refresh('all');
  assert.equal(c.items.filter((n) => inView(n, 'important')).length, 0, 'All page 1 does not contain it: a client-side filter would show an empty view');
  assert.equal(c.hasMore, true);
  c.selectView('important');
  assert.deepEqual(c.items.filter((n) => inView(n, 'important')).map((n) => n.id), ['old-important']);
  assert.equal(c.total, 1, 'the active tab count is the server total for that view');
  assert.equal(c.hasMore, false);
  assert.equal(c.items.length, 51, 'rows from the All view stay cached');
});

test('100 loaded, 60 arrive while disconnected: a refresh re-reads the loaded pages and every id is present before hasMore is false', () => {
  let db = rows(100, 0);
  const c = client(() => db);
  c.refresh('all'); c.loadMore('all');
  assert.equal(c.items.length, 100); assert.equal(c.pagesLoaded, 2); assert.equal(c.hasMore, false);
  db = [...db, ...rows(60, 100)]; // newer arrivals: they push every existing row 60 offsets down
  c.refresh('all');
  assert.equal(c.pagesLoaded, 2, 'the window is re-read, not advanced');
  assert.equal(c.items.length, 160, 'pages 1-2 now hold the 60 new rows and 40 old ones; the rest were cached');
  assert.equal(c.hasMore, true);
  c.loadMore('all'); c.loadMore('all');
  assert.equal(c.hasMore, false);
  assert.equal(new Set(c.items.map((n) => n.id)).size, 160, 'no id skipped before the server says there is no more');
});

test('a refresh reconciles read state on an older loaded page', () => {
  const db = rows(60, 0);
  const c = client(() => db);
  c.refresh('all'); c.loadMore('all');
  db[0] = { ...db[0], readAt: at(999) }; // the oldest row (page 2) was read on another device
  c.refresh('all');
  assert.ok(c.items.find((n) => n.id === 'n0')?.readAt, 'page 2 is re-read, not only page 1');
});
