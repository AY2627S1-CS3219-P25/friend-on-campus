/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Restored clean 1-line Campus Alerts page title header without redundant multi-line subtitle copy, eliminating phantom space-y margin and anchoring the notifications view with consistent typography.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed visual Campus Alerts title banner and subtitle in favor of sr-only accessible heading, bringing notification filters and alert list immediately above the fold.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: Redesigned AlertsPage header with refined typography and disclosure metadata.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-24
 * Scope: Review fix (PR #184): passes the server-fetched view, its total and the view setter through to the panel.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Inbox props of the author's Notification Redesign (stale flag, load more, live order status, onOpen) replace
 * the awaitingConfirmation set; subtitle reworded for an inbox of changes rather than a stage timeline.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted alerts/notifications page from student-app App.tsx into pages/AlertsPage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)
// AI-generated (edited by Reallyeasy1)

import { NotificationDTO, OrderStatus } from '@campus-errand/common-dtos';
import { NotificationPanel } from '../notifications/NotificationBell';
import type { InboxView } from '../notifications/inbox';

interface AlertsPageProps {
  items: NotificationDTO[];
  unreadCount: number;
  /** Rows the server has for the selected view. */
  total: number;
  view: InboxView;
  isLoading: boolean;
  stale: boolean;
  error: string | null;
  hasMore: boolean;
  /** The status of an errand the app has loaded, if it has; fresher than the server's projection. */
  liveStatus: (orderId: string) => OrderStatus | undefined;
  onViewChange: (view: InboxView) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  /** Follows the notification's action: the exact errand, or the wallet. */
  onOpen: (notification: NotificationDTO) => void;
}

export function AlertsPage(props: AlertsPageProps) {
  return (
    <div className="space-y-3 sm:space-y-4">
      <div>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Campus Alerts
        </h2>
      </div>
      <NotificationPanel {...props} />
    </div>
  );
}
