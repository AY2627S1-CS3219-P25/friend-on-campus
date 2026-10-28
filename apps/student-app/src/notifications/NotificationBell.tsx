/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-24
 * Scope: Review fix (PR #184): the view is a prop the hook fetches server side; tab counts are only the ones the server
 * vouches for (the active view's total and the unread count) instead of counts over the rows loaded so far; Load more
 * is offered in every view, so a filtered view can page too.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Alerts board rebuilt as the inbox of the author's Notification Redesign (§2): views Action needed / Important /
 * All / Unread, one row per notification (title, one line of context, time, read state), a detail pane whose single
 * button follows the typed action (review delivery while the order is still DELIVERED, otherwise view errand or
 * wallet), a stale-data line when a refresh failed, Load more paging, and a generic card for kinds this build does
 * not know. The three-stage timeline and the "Needs your confirmation" stage counting are gone. Bell unchanged.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-21
 * Scope: Updated onOpenErrand docstring now that TasksPage provides the confirm-delivery action (Issue #132).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-06
 * Scope: Bell button with the unread count (top nav and mobile tab variants) and the Alerts board, per the author's
 * Notification Service Design: list, mark read, mark all read, delivered rows lead to the errand. Fourth pass the
 * same day, after a scan of notification-centre patterns (Courier's design guide, Linear's inbox, delivery-app
 * order tracking): a two-pane inbox on desktop (errand list left, the selected errand's stage timeline right), a
 * list-then-detail flow on a phone, rows bundled per errand under "Needs your confirmation" / "Today" / "Earlier",
 * one quiet unread signal, read on open. The delivered step's button says what it does today (opens Tasks);
 * confirming delivery is an Order Service action that does not exist yet. Review fix the same day: the selected
 * errand is resolved from all errands, so under the Unread filter it stays open after opening marks it read.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { useEffect, useState } from 'react';
import {
  AlertTriangle, ArrowLeft, ArrowRight, Bell, CheckCheck, CheckCircle2, Clock, Coins, Megaphone, PackageCheck, RefreshCw,
  Truck, UserCheck, UserMinus, Wallet, XCircle,
} from 'lucide-react';
import type { NotificationDTO, OrderStatus } from '@campus-errand/common-dtos';
import { inView, isActionOpen, kindLabel, VIEWS, type InboxView } from './inbox';

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-1';

// Presentation per kind; anything unknown falls back to the generic bell so a new kind never breaks the board.
const LOOK: Record<string, { Icon: typeof Bell; ring: string; pill: string }> = {
  ORDER_ACCEPTED: { Icon: UserCheck, ring: 'bg-blue-100 text-blue-700', pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  ORDER_PICKED_UP: { Icon: Truck, ring: 'bg-amber-100 text-amber-700', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  ORDER_DELIVERED: { Icon: PackageCheck, ring: 'bg-emerald-100 text-emerald-700', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ORDER_PUBLISHED: { Icon: Megaphone, ring: 'bg-slate-100 text-slate-600', pill: 'bg-slate-50 text-slate-600 border-slate-200' },
  ORDER_COMPLETED: { Icon: CheckCircle2, ring: 'bg-emerald-100 text-emerald-700', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  ORDER_CANCELLED: { Icon: XCircle, ring: 'bg-rose-100 text-rose-700', pill: 'bg-rose-50 text-rose-700 border-rose-200' },
  ORDER_EXPIRED: { Icon: Clock, ring: 'bg-slate-100 text-slate-600', pill: 'bg-slate-50 text-slate-600 border-slate-200' },
  ORDER_REJECTED: { Icon: AlertTriangle, ring: 'bg-rose-100 text-rose-700', pill: 'bg-rose-50 text-rose-700 border-rose-200' },
  ORDER_UNASSIGNED: { Icon: UserMinus, ring: 'bg-amber-100 text-amber-700', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  CREDITS_RECEIVED: { Icon: Coins, ring: 'bg-emerald-100 text-emerald-700', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  CREDITS_RETURNED: { Icon: Coins, ring: 'bg-blue-100 text-blue-700', pill: 'bg-blue-50 text-blue-700 border-blue-200' },
};
const GENERIC = { Icon: Bell, ring: 'bg-slate-100 text-slate-600', pill: 'bg-slate-50 text-slate-600 border-slate-200' };
const look = (kind: string) => LOOK[kind] ?? GENERIC;

export function NotificationBell({ unreadCount, active, onClick, variant }: {
  unreadCount: number;
  active: boolean;
  onClick: () => void;
  /** Top nav at md: and up, or the fixed bottom tab bar on mobile. */
  variant: 'top' | 'tab';
}) {
  const label = unreadCount > 0 ? `Alerts, ${unreadCount} unread` : 'Alerts';
  const count = unreadCount > 9 ? '9+' : String(unreadCount);
  if (variant === 'tab') {
    return (
      <button
        aria-label={label}
        aria-pressed={active}
        onClick={onClick}
        className={`relative flex flex-col items-center py-1 transition ${FOCUS} ${active ? 'text-nus-orange font-bold' : 'text-slate-400 hover:text-slate-600'}`}
      >
        <span className="relative">
          <Bell className="w-5 h-5" />
          {unreadCount > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[1rem] h-4 px-1 rounded-full bg-rose-500 text-white text-[10px] font-black leading-4 text-center">
              {count}
            </span>
          )}
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
      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${FOCUS} ${
        active
          ? 'bg-nus-orange text-white border-nus-orange shadow-xs'
          : 'bg-white text-slate-700 border-slate-200/80 hover:text-slate-900 hover:bg-slate-50 hover:border-slate-300 shadow-2xs'
      }`}
    >
      <Bell className="w-3.5 h-3.5" />
      <span>Alerts</span>
      {unreadCount > 0 && (
        <span
          data-testid="notification-badge"
          className={`min-w-[1.25rem] h-4.5 px-1.5 rounded-full text-[10px] font-black leading-4 text-center ${
            active ? 'bg-white text-nus-orange' : 'bg-rose-500 text-white'
          }`}
        >
          {count}
        </span>
      )}
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

function timeOfDay(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
}

type Section = 'Today' | 'Earlier';
const SECTIONS: Section[] = ['Today', 'Earlier'];
const sectionOf = (n: NotificationDTO): Section =>
  new Date(n.createdAt).toDateString() === new Date().toDateString() ? 'Today' : 'Earlier';

/** The one thing the detail pane offers. The errand screen re-checks the order before any command. */
function ctaFor(n: NotificationDTO, liveStatus?: OrderStatus): { label: string; Icon: typeof Bell } | null {
  switch (n.actionType) {
    case 'REVIEW_DELIVERY':
      return isActionOpen(n, liveStatus) ? { label: 'Review delivery', Icon: PackageCheck } : { label: 'View errand', Icon: ArrowRight };
    case 'REVIEW_WALLET':
      return { label: 'Review wallet', Icon: Wallet };
    case 'VIEW_ERRAND':
      return { label: 'View errand', Icon: ArrowRight };
    default:
      return null;
  }
}

export function NotificationPanel({
  items, unreadCount, total, view, isLoading, stale, error, hasMore, liveStatus, onViewChange, onMarkRead, onMarkAllRead, onRefresh, onLoadMore, onOpen,
}: {
  items: NotificationDTO[];
  unreadCount: number;
  /** Rows the server has for the selected view. */
  total: number;
  view: InboxView;
  isLoading: boolean;
  /** The last refresh failed; the rows shown are what was loaded before. */
  stale: boolean;
  error: string | null;
  hasMore: boolean;
  liveStatus: (orderId: string) => OrderStatus | undefined;
  onViewChange: (view: InboxView) => void;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  onLoadMore: () => void;
  /** Opens the notification's destination (errand or wallet); never performs a business action itself. */
  onOpen: (notification: NotificationDTO) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // On a phone the board is one pane at a time: the list, then the item you tapped.
  const [mobileDetail, setMobileDetail] = useState(false);

  // The cache holds rows from every view fetched so far; the selected view's own pages are in it, so filtering here
  // never hides a matching row the server has (the hook fetched that view).
  const visible = items.filter((n) => inView(n, view, liveStatus(n.orderId)));
  // AI-generated (edited by Reallyeasy1): only counts the server vouches for. A count over loaded rows would say
  // "Important · 0" while an older important row sits beyond the loaded pages.
  const countOf = (key: InboxView): number | null => (key === 'unread' ? unreadCount : key === view ? total : null);
  // Resolved from every item, not the filtered list: opening marks read, which would otherwise drop the opened
  // item out of the Unread view and jump the detail pane to the next one.
  const selected = items.find((n) => n.id === selectedId) ?? visible[0] ?? null;
  useEffect(() => {
    if (selected && selected.id !== selectedId) setSelectedId(selected.id);
  }, [selected, selectedId]);

  // Opening a notification marks it read, as an inbox does. It does not confirm, accept or resolve anything.
  const open = (n: NotificationDTO) => {
    setSelectedId(n.id);
    if (window.matchMedia('(max-width: 1023px)').matches) setMobileDetail(true);
    if (!n.readAt) onMarkRead(n.id);
  };

  const emptyText = view === 'unread' ? "You're all caught up" : view === 'action_needed' ? 'Nothing needs your action' : 'No alerts yet';

  const list = (
    <ol className="divide-y divide-slate-100">
      {SECTIONS.map((section) => {
        const rows = visible.filter((n) => sectionOf(n) === section);
        if (rows.length === 0) return null;
        return (
          <li key={section}>
            <h3 className="px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide text-slate-400">{section}</h3>
            <ol>
              {rows.map((n) => {
                const { Icon, ring, pill } = look(n.kind);
                const active = selected?.id === n.id;
                const unread = !n.readAt;
                return (
                  <li key={n.id} data-testid="notification-row" data-unread={unread}>
                    <button
                      onClick={() => open(n)}
                      aria-current={active ? 'true' : undefined}
                      aria-label={`${n.orderCode ?? 'Errand'}, ${kindLabel(n.kind)}${unread ? ', unread' : ''}`}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 border-l-2 transition ${FOCUS} ${
                        active ? 'border-nus-orange bg-orange-50/60' : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <span className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${ring}`}>
                        <Icon className="w-4 h-4" aria-hidden />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className={`font-mono text-sm ${unread ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{n.orderCode ?? 'Errand'}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-px rounded-full border ${pill}`}>{kindLabel(n.kind)}</span>
                          {isActionOpen(n, liveStatus(n.orderId)) && (
                            <span className="text-[10px] font-bold px-1.5 py-px rounded-full bg-nus-orange text-white">Action needed</span>
                          )}
                        </span>
                        <span className={`block text-sm mt-0.5 truncate ${unread ? 'text-slate-900' : 'text-slate-600'}`}>{n.title}</span>
                        <span className="block text-xs text-slate-500 truncate">{n.body}</span>
                      </span>
                      <span className="flex flex-col items-end shrink-0 text-[11px] text-slate-400 pt-0.5">
                        <span>{timeAgo(n.createdAt)}</span>
                        {unread && <span aria-hidden className="mt-2 w-2 h-2 rounded-full bg-rose-500" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </li>
        );
      })}
      {hasMore && (
        <li className="px-4 py-3 text-center">
          <button onClick={onLoadMore} disabled={isLoading} className={`text-xs font-bold text-blue-700 disabled:text-slate-400 ${FOCUS}`}>
            Load more
          </button>
        </li>
      )}
    </ol>
  );

  const detail = selected && (() => {
    const { Icon, ring, pill } = look(selected.kind);
    const live = liveStatus(selected.orderId);
    const cta = ctaFor(selected, live);
    const status = live ?? selected.orderStatus;
    const resolved = selected.actionType === 'REVIEW_DELIVERY' && !isActionOpen(selected, live);
    return (
      <article aria-label={`${selected.orderCode ?? 'Errand'} notification`} className="h-full flex flex-col">
        <header className="flex flex-wrap items-center gap-2 px-5 pt-5 pb-4 border-b border-slate-100">
          <button onClick={() => setMobileDetail(false)} aria-label="Back to all alerts" className={`lg:hidden p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:bg-slate-100 ${FOCUS}`}>
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h3 className="font-mono text-lg font-bold text-slate-900">{selected.orderCode ?? 'Errand'}</h3>
          <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${pill}`}>{kindLabel(selected.kind)}</span>
          {status && <span className="ml-auto text-xs text-slate-400">Errand status: {status.replace(/_/g, ' ')}</span>}
        </header>
        <div className="px-5 py-5 flex-1 flex gap-4">
          <span className={`mt-0.5 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${ring}`}>
            <Icon className="w-5 h-5" aria-hidden />
          </span>
          <div className="flex-1 min-w-0">
            <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
              <p className="text-sm font-bold text-slate-900">{selected.title}</p>
              <time dateTime={selected.createdAt} className="text-[11px] text-slate-400 shrink-0">{timeOfDay(selected.createdAt)} · {timeAgo(selected.createdAt)}</time>
            </div>
            <p className="text-sm text-slate-600 mt-0.5">{selected.body}</p>
            {resolved && (
              <p className="text-xs text-slate-500 mt-2">This delivery no longer needs your confirmation{status ? ` (errand is ${status.replace(/_/g, ' ')})` : ''}.</p>
            )}
            {cta && (
              <button
                onClick={() => onOpen(selected)}
                className={`mt-3 inline-flex items-center space-x-1.5 text-sm font-bold text-white px-4 py-2 rounded-lg shadow-sm ${FOCUS} ${
                  cta.label === 'Review delivery' ? 'bg-nus-orange hover:bg-orange-600' : 'bg-nus-blue hover:bg-blue-800'
                }`}
              >
                <span>{cta.label}</span>
                <cta.Icon className="w-4 h-4" aria-hidden />
              </button>
            )}
          </div>
        </div>
      </article>
    );
  })();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Filter alerts" className="flex flex-wrap items-center bg-white border border-slate-200 rounded-full p-0.5 text-xs font-bold shadow-sm">
          {VIEWS.map(({ key, label }) => (
            <button
              key={key}
              role="tab"
              aria-selected={view === key}
              onClick={() => onViewChange(key)}
              className={`px-3 py-1.5 rounded-full transition ${FOCUS} ${view === key ? 'bg-nus-blue text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {label}{countOf(key) === null ? '' : ` · ${countOf(key)}`}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center space-x-1">
          <button onClick={onRefresh} aria-label="Refresh alerts" className={`p-2 rounded-lg text-slate-500 hover:bg-white hover:shadow-sm ${FOCUS}`}>
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'motion-safe:animate-spin' : ''}`} />
          </button>
          <button
            onClick={onMarkAllRead}
            disabled={unreadCount === 0}
            className={`flex items-center space-x-1.5 text-xs font-bold text-blue-700 disabled:text-slate-400 px-3 py-2 rounded-lg hover:bg-white hover:shadow-sm disabled:hover:bg-transparent disabled:hover:shadow-none ${FOCUS}`}
          >
            <CheckCheck className="w-4 h-4" />
            <span>Mark all as read</span>
          </button>
        </div>
      </div>

      {stale && (
        <p role="status" className="rounded-xl px-4 py-3 text-sm text-amber-800 bg-amber-50 border border-amber-200">
          Showing saved alerts; the last refresh failed{error ? ` (${error})` : ''}. Refresh to try again.
        </p>
      )}
      {!stale && error && <p className="rounded-xl px-4 py-3 text-sm text-rose-700 bg-rose-50 border border-rose-200">{error} Refresh to try again.</p>}

      {visible.length === 0 && !selected && !isLoading && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Bell className="w-8 h-8 mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">{emptyText}</p>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            {view === 'action_needed'
              ? 'A delivery waiting for your confirmation shows up here.'
              : 'You will hear here when an errand of yours is posted, accepted, picked up, delivered, cancelled or changes courier.'}
          </p>
        </div>
      )}

      {(visible.length > 0 || selected) && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:grid lg:grid-cols-[minmax(20rem,2fr)_3fr] lg:min-h-[28rem]">
          <section aria-label="Alerts" className={`${mobileDetail ? 'hidden lg:block' : ''} lg:border-r lg:border-slate-100 lg:max-h-[70vh] lg:overflow-y-auto`}>
            {visible.length > 0 ? list : (
              <p className="px-4 py-10 text-center text-sm text-slate-500">{emptyText}.</p>
            )}
          </section>
          <section aria-label="Selected alert" className={`${mobileDetail ? '' : 'hidden lg:block'} bg-slate-50/50`}>
            {detail}
          </section>
        </div>
      )}
    </div>
  );
}
