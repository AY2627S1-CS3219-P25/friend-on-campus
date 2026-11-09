/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
 * Scope: Tests for the Browse feed's zone tabs: the per-tab counts cover the whole feed whichever tab is selected
 * (they used to be taken from the list already narrowed to the selected tab, so ALL and the other tabs showed 0),
 * the feed holds only open errands of other students, and a tab matches its zone name exactly.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { OrderDTO } from '@campus-errand/common-dtos';
import { FEED_ZONES, countByFeedZone, feedOrders, inFeedZone } from '../src/orders/feedZones';

const ME = 'me';
const order = (campusZone: string, overrides: Partial<OrderDTO> = {}): OrderDTO =>
  ({ id: `${campusZone}-${Math.random()}`, status: 'OPEN', requesterId: 'someone-else', campusZone, ...overrides }) as OrderDTO;

test('tab counts cover the whole feed, whichever tab is selected', () => {
  const feed = [order('UTown'), order('FASS'), order('FASS')];
  const expected = { ALL: 3, COM3: 0, UTown: 1, PGPR: 0, FASS: 2, Science: 0, Engineering: 0 };
  assert.deepEqual(countByFeedZone(feed), expected);
  // The reported case: Science selected and empty. The cards shown are narrowed to the tab; the counts are not.
  for (const selected of FEED_ZONES) {
    const shown = feed.filter((o) => inFeedZone(o, selected));
    assert.equal(shown.length, expected[selected as keyof typeof expected], `cards under ${selected}`);
    assert.deepEqual(countByFeedZone(feed), expected, `counts while ${selected} is selected`);
  }
});

test('the feed holds open errands posted by other students', () => {
  const orders = [order('UTown'), order('UTown', { requesterId: ME }), order('FASS', { status: 'ACCEPTED' }), order('PGPR', { status: 'COMPLETED' })];
  assert.deepEqual(feedOrders(orders, ME).map((o) => o.campusZone), ['UTown']);
  assert.equal(feedOrders(orders, null).length, 2, 'signed out: nothing is treated as mine');
});

test('a tab matches its zone name exactly and ALL matches everything', () => {
  assert.equal(inFeedZone(order('FASS'), 'FASS'), true);
  assert.equal(inFeedZone(order('FASS'), 'Science'), false);
  assert.equal(inFeedZone(order('anything at all'), 'ALL'), true);
});
