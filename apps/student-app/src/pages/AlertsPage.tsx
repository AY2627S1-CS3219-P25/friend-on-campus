/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6); Google Antigravity Agent; Claude Code (model: Claude Fable 5.1), date: 2026-10-19 to 2026-11-07
 * Scope: Extracted alerts/notifications page from student-app App.tsx into pages/AlertsPage.tsx; updated across 8 AI-assisted revisions through D4 wrap-up (apply the approved student-app consistency pass: calmer surfaces, readable type, blue actions and selection, and preserved semantic status colours).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


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
        <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
          Campus Alerts
        </h2>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onMarkAllRead}
            aria-label="Mark all as read"
            disabled={unreadCount === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-campus-blue bg-white border border-slate-200/90 shadow-2xs hover:bg-slate-50 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
            <RefreshCw className={`w-3.5 h-3.5 text-slate-500 ${isLoading ? 'animate-spin text-campus-blue' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>
      </div>
      <NotificationPanel {...props} />
    </div>
  );
}
