/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-06
 * Scope: Bell button with the unread badge (top nav and mobile tab variants) and the notification panel, per the
 * author's Notification Service Design: list, mark read on tap, mark all read, delivered rows lead to the errand.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { Bell, CheckCheck, RefreshCw } from 'lucide-react';
import type { NotificationDTO } from '@campus-errand/common-dtos';

function Badge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      data-testid="notification-badge"
      className="absolute -top-1 -right-1 min-w-[1.1rem] h-[1.1rem] px-1 rounded-full bg-rose-500 text-white text-[10px] font-black leading-[1.1rem] text-center"
    >
      {count > 9 ? '9+' : count}
    </span>
  );
}

export function NotificationBell({ unreadCount, active, onClick, variant }: {
  unreadCount: number;
  active: boolean;
  onClick: () => void;
  /** Top nav at md: and up, or the fixed bottom tab bar on mobile. */
  variant: 'top' | 'tab';
}) {
  const label = unreadCount > 0 ? `Alerts, ${unreadCount} unread` : 'Alerts';
  if (variant === 'tab') {
    return (
      <button
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={`relative flex flex-col items-center py-1 transition ${active ? 'text-nus-orange font-bold' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <span className="relative">
          <Bell className="w-5 h-5" />
          <Badge count={unreadCount} />
        </span>
        <span className="text-xs mt-0.5">Alerts</span>
      </button>
    );
  }
  return (
    <button
      aria-label={label}
      aria-pressed={active}
      onClick={onClick}
      className={`relative flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition ${
        active ? 'bg-nus-orange text-white shadow-sm' : 'text-blue-200 hover:text-white hover:bg-blue-800/60'
      }`}
    >
      <span className="relative">
        <Bell className="w-4 h-4" />
        <Badge count={unreadCount} />
      </span>
      <span>Alerts</span>
    </button>
  );
}

function timeAgo(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 60) return 'just now';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} h ago`;
  return new Date(iso).toLocaleDateString();
}

export function NotificationPanel({ items, unreadCount, isLoading, error, onMarkRead, onMarkAllRead, onRefresh, onOpenErrand }: {
  items: NotificationDTO[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  /** The delivered row's "Confirm delivery" action: takes the user to the errand. */
  onOpenErrand: (notification: NotificationDTO) => void;
}) {
  return (
    <section aria-label="Notifications" className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
      <header className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-800">
          Notifications{unreadCount > 0 && <span className="ml-2 text-xs font-bold text-rose-600">{unreadCount} unread</span>}
        </h2>
        <div className="flex items-center space-x-1">
          <button onClick={onRefresh} aria-label="Refresh notifications" className="p-1.5 rounded-lg text-slate-500 hover:bg-slate-100">
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            className="flex items-center space-x-1 text-xs font-bold text-blue-700 disabled:text-slate-400 px-2 py-1.5 rounded-lg hover:bg-blue-50 disabled:hover:bg-transparent"
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all read</span>
          </button>
        </div>
      </header>

      {error && <p className="px-4 py-3 text-sm text-rose-700 bg-rose-50">{error}</p>}
      {!error && items.length === 0 && !isLoading && (
        <p className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet. You will be told here when a courier accepts, picks up or delivers your errand.</p>
      )}

      <ul className="divide-y divide-slate-100 max-h-[60vh] overflow-y-auto">
        {items.map((n) => {
          const unread = !n.readAt;
          return (
            <li key={n.id} data-testid="notification-row" data-unread={unread} className={unread ? 'bg-blue-50/60' : ''}>
              <button
                onClick={() => { if (unread) onMarkRead(n.id); }}
                className="w-full text-left px-4 py-3 flex items-start space-x-3 hover:bg-slate-50"
              >
                <span aria-hidden className={`mt-1.5 w-2 h-2 rounded-full shrink-0 ${unread ? 'bg-rose-500' : 'bg-transparent'}`} />
                <span className="flex-1 min-w-0">
                  <span className={`block text-sm ${unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.title}</span>
                  <span className="block text-xs text-slate-500 mt-0.5">{n.body}</span>
                  <span className="block text-[11px] text-slate-400 mt-1">
                    {timeAgo(n.createdAt)}
                    {n.orderCode && <> · <span className="font-mono">{n.orderCode}</span></>}
                  </span>
                </span>
              </button>
              {n.kind === 'ORDER_DELIVERED' && (
                <div className="px-4 pb-3 -mt-1">
                  <button
                    onClick={() => onOpenErrand(n)}
                    className="text-xs font-bold text-white bg-nus-orange hover:bg-orange-600 px-3 py-1.5 rounded-lg shadow-sm"
                  >
                    Confirm delivery
                  </button>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
