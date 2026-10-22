/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Pure helpers for the inbox of the author's Notification Redesign (§2, §10): the four views, whether a
 * delivery review is still open (live order status beats the server's projection), merging rows by id, the toast
 * rule and a safe label for unknown kinds. Replaces notifications/errands.ts (stage grouping).
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import type { NotificationDTO, OrderStatus } from '@campus-errand/common-dtos';

export type InboxView = 'action_needed' | 'important' | 'all' | 'unread';

export const VIEWS: { key: InboxView; label: string }[] = [
  { key: 'action_needed', label: 'Action needed' },
  { key: 'important', label: 'Important' },
  { key: 'all', label: 'All' },
  { key: 'unread', label: 'Unread' },
];

/**
 * A delivery review stays open while the order is still DELIVERED. The order the app has loaded is the freshest
 * signal, then the status the Notification Service projected; with neither, the notice is shown and the errand
 * screen validates it. Read state never resolves an action.
 */
export function isActionOpen(n: NotificationDTO, liveStatus?: OrderStatus): boolean {
  if (n.actionType !== 'REVIEW_DELIVERY') return false;
  return (liveStatus ?? n.orderStatus ?? 'DELIVERED') === 'DELIVERED';
}

export function inView(n: NotificationDTO, view: InboxView, liveStatus?: OrderStatus): boolean {
  switch (view) {
    case 'action_needed': return isActionOpen(n, liveStatus);
    case 'important': return n.category === 'IMPORTANT';
    case 'unread': return !n.readAt;
    default: return true;
  }
}

/** Rows by id (incoming wins), newest arrival first. A duplicate socket frame therefore changes nothing. */
export function mergeNotifications(current: NotificationDTO[], incoming: NotificationDTO[]): NotificationDTO[] {
  const byId = new Map(current.map((n) => [n.id, n]));
  for (const n of incoming) byId.set(n.id, n);
  return [...byId.values()].sort((a, b) => b.storedAt.localeCompare(a.storedAt) || b.id.localeCompare(a.id));
}

/**
 * A toast is a hint for someone looking elsewhere: never for the quiet publication or wallet receipts, and not while the
 * Tasks or Alerts screen already shows the change. The server never pushes stale or duplicate rows.
 */
export function shouldToast(n: NotificationDTO, activeTab: string): boolean {
  if (n.kind === 'ORDER_PUBLISHED' || n.category === 'RECEIPT') return false;
  return activeTab !== 'tasks' && activeTab !== 'alerts';
}

const LABELS: Record<string, string> = {
  ORDER_ACCEPTED: 'Accepted',
  ORDER_PICKED_UP: 'Picked up',
  ORDER_DELIVERED: 'Delivered',
  ORDER_PUBLISHED: 'Posted',
  ORDER_REJECTED: 'Not posted',
  ORDER_EXPIRED: 'Expired',
  ORDER_COMPLETED: 'Completed',
  ORDER_CANCELLED: 'Cancelled',
  ORDER_UNASSIGNED: 'Courier changed',
  CREDITS_RECEIVED: 'Credits received',
  CREDITS_RETURNED: 'Credits returned',
};

/** A kind this build does not know renders as a plain update instead of crashing the board. */
export function kindLabel(kind: string): string {
  return LABELS[kind] ?? 'Update';
}
