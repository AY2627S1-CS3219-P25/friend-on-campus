/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
 * Scope: The Browse feed's zone tabs as pure functions: which errands are in the feed, which tab an errand falls under, and the per-tab counts taken over the whole feed.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import type { OrderDTO } from '@campus-errand/common-dtos';

/** The feed's tabs. A tab matches an errand whose campusZone is exactly this name; ALL matches every errand. */
export const FEED_ZONES = ['ALL', 'COM3', 'UTown', 'PGPR', 'FASS', 'Science', 'Engineering'];

/** Errands a courier can take: open and posted by someone else. */
export function feedOrders(orders: OrderDTO[], currentUserId: string | null): OrderDTO[] {
  return orders.filter((order) => order.status === 'OPEN' && order.requesterId !== currentUserId);
}

export function inFeedZone(order: Pick<OrderDTO, 'campusZone'>, zone: string): boolean {
  return zone === 'ALL' || order.campusZone === zone;
}

/** Errands per tab over the whole feed: a tab's number must not depend on which tab is selected. */
export function countByFeedZone(feed: Pick<OrderDTO, 'campusZone'>[]): Record<string, number> {
  return Object.fromEntries(FEED_ZONES.map((zone) => [zone, feed.filter((order) => inFeedZone(order, zone)).length]));
}
