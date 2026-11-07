/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Standardized Campus Alerts page header with Credit Wallet and Profile by introducing matching action controls (Mark all as read and Refresh) with uniform 32px height, 4xl max width, and unified icon styling.
 * Author review: <to be completed by yanhwee>
 *
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
import { CheckCheck, RefreshCw } from 'lucide-react';
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
  const { onRefresh, onMarkAllRead, unreadCount, isLoading } = props;

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4">
      {/* 1-Line Page Header matching Credit Wallet & Profile */}
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Campus Alerts
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-nus-blue bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <CheckCheck className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Mark all as read</span>
          </button>
          <button
            type="button"
            onClick={onRefresh}
            disabled={isLoading}
            aria-label="Refresh alerts"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 disabled:opacity-50 transition-all cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin text-nus-blue' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
      <NotificationPanel {...props} />
    </div>
  );
}
