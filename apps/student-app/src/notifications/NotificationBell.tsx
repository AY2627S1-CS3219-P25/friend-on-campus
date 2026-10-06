/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-06
 * Scope: Bell button with the unread count (top nav and mobile tab variants) and the Alerts board, per the author's
 * Notification Service Design: list, mark read, mark all read, delivered rows lead to the errand. Fourth pass the
 * same day, after a scan of notification-centre patterns (Courier's design guide, Linear's inbox, delivery-app
 * order tracking): a two-pane inbox on desktop (errand list left, the selected errand's stage timeline right), a
 * list-then-detail flow on a phone, rows bundled per errand under "Needs your confirmation" / "Today" / "Earlier",
 * one quiet unread signal, read on open. The delivered step's button says what it does today (opens Tasks);
 * confirming delivery is an Order Service action that does not exist yet.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { useEffect, useState } from 'react';
import { ArrowLeft, ArrowRight, Bell, CheckCheck, PackageCheck, RefreshCw, Truck, UserCheck } from 'lucide-react';
import type { NotificationDTO, NotificationKind } from '@campus-errand/common-dtos';

const FOCUS = 'focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-300 focus-visible:ring-offset-1';

// The three stages F5 notifies about: accepted, picked up, delivered.
const STAGE: Record<NotificationKind, { label: string; Icon: typeof Bell; ring: string; pill: string }> = {
  ORDER_ACCEPTED: { label: 'Accepted', Icon: UserCheck, ring: 'bg-blue-100 text-blue-700', pill: 'bg-blue-50 text-blue-700 border-blue-200' },
  ORDER_PICKED_UP: { label: 'Picked up', Icon: Truck, ring: 'bg-amber-100 text-amber-700', pill: 'bg-amber-50 text-amber-700 border-amber-200' },
  ORDER_DELIVERED: { label: 'Delivered', Icon: PackageCheck, ring: 'bg-emerald-100 text-emerald-700', pill: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
};

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
      className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-sm font-bold transition ${FOCUS} ${
        active ? 'bg-nus-orange text-white shadow-sm' : 'text-blue-200 hover:text-white hover:bg-blue-800/60'
      }`}
    >
      <Bell className="w-4 h-4" />
      <span>Alerts</span>
      {unreadCount > 0 && (
        <span
          data-testid="notification-badge"
          className={`min-w-[1.25rem] h-5 px-1.5 rounded-full text-[11px] font-black leading-5 text-center ${
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

interface Errand {
  orderId: string;
  orderCode: string | null;
  /** Oldest first, so the timeline reads downwards. */
  steps: NotificationDTO[];
  latest: NotificationDTO;
  unread: number;
}

type Section = 'Needs your confirmation' | 'Today' | 'Earlier';
const SECTIONS: Section[] = ['Needs your confirmation', 'Today', 'Earlier'];

// One entry per errand (bundling by source). The event timestamp orders the steps, so late or redelivered events do not reorder them.
function groupByErrand(items: NotificationDTO[]): Errand[] {
  const groups = new Map<string, Errand>();
  for (const n of items) {
    const group = groups.get(n.orderId) ?? { orderId: n.orderId, orderCode: n.orderCode ?? null, steps: [], latest: n, unread: 0 };
    group.steps.push(n);
    if (n.createdAt > group.latest.createdAt) group.latest = n;
    if (!n.readAt) group.unread += 1;
    if (!group.orderCode && n.orderCode) group.orderCode = n.orderCode;
    groups.set(n.orderId, group);
  }
  for (const group of groups.values()) group.steps.sort((a, b) => a.createdAt.localeCompare(b.createdAt));
  return [...groups.values()].sort((a, b) => b.latest.createdAt.localeCompare(a.latest.createdAt));
}

function sectionOf(errand: Errand): Section {
  if (errand.latest.kind === 'ORDER_DELIVERED') return 'Needs your confirmation';
  return new Date(errand.latest.createdAt).toDateString() === new Date().toDateString() ? 'Today' : 'Earlier';
}

export function NotificationPanel({ items, unreadCount, isLoading, error, onMarkRead, onMarkAllRead, onRefresh, onOpenErrand }: {
  items: NotificationDTO[];
  unreadCount: number;
  isLoading: boolean;
  error: string | null;
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onRefresh: () => void;
  /** The delivered step's action. Today it opens Tasks; the confirm-delivery call arrives with Order Service. */
  onOpenErrand: (notification: NotificationDTO) => void;
}) {
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  // On a phone the board is one pane at a time: the list, then the errand you tapped.
  const [mobileDetail, setMobileDetail] = useState(false);

  const errands = groupByErrand(items).filter((e) => filter === 'all' || e.unread > 0);
  const selected = errands.find((e) => e.orderId === selectedId) ?? errands[0] ?? null;
  useEffect(() => {
    if (selected && selected.orderId !== selectedId) setSelectedId(selected.orderId);
  }, [selected, selectedId]);

  // Opening an errand marks its alerts read, as an inbox does.
  const open = (errand: Errand) => {
    setSelectedId(errand.orderId);
    if (window.matchMedia('(max-width: 1023px)').matches) setMobileDetail(true);
    for (const step of errand.steps) if (!step.readAt) onMarkRead(step.id);
  };

  const list = (
    <ol className="divide-y divide-slate-100">
      {SECTIONS.map((section) => {
        const rows = errands.filter((e) => sectionOf(e) === section);
        if (rows.length === 0) return null;
        const urgent = section === 'Needs your confirmation';
        return (
          <li key={section}>
            <h3 className={`px-4 pt-3 pb-1 text-[11px] font-bold uppercase tracking-wide ${urgent ? 'text-nus-orange' : 'text-slate-400'}`}>
              {section}{urgent ? ` · ${rows.length}` : ''}
            </h3>
            <ol>
              {rows.map((errand) => {
                const stage = STAGE[errand.latest.kind];
                const active = selected?.orderId === errand.orderId;
                return (
                  <li key={errand.orderId} data-testid="notification-row" data-unread={errand.unread > 0}>
                    <button
                      onClick={() => open(errand)}
                      aria-current={active ? 'true' : undefined}
                      aria-label={`${errand.orderCode ?? 'Errand'}, ${stage.label}${errand.unread > 0 ? `, ${errand.unread} unread` : ''}`}
                      className={`w-full text-left px-4 py-3 flex items-start gap-3 border-l-2 transition ${FOCUS} ${
                        active ? 'border-nus-orange bg-orange-50/60' : 'border-transparent hover:bg-slate-50'
                      }`}
                    >
                      <span className={`mt-0.5 w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${stage.ring}`}>
                        <stage.Icon className="w-4 h-4" aria-hidden />
                      </span>
                      <span className="flex-1 min-w-0">
                        <span className="flex items-center gap-2">
                          <span className={`font-mono text-sm ${errand.unread > 0 ? 'font-bold text-slate-900' : 'font-medium text-slate-700'}`}>{errand.orderCode ?? 'Errand'}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-px rounded-full border ${stage.pill}`}>{stage.label}</span>
                        </span>
                        <span className="block text-xs text-slate-500 mt-0.5 truncate">{errand.latest.body}</span>
                      </span>
                      <span className="flex flex-col items-end shrink-0 text-[11px] text-slate-400 pt-0.5">
                        <span>{timeAgo(errand.latest.createdAt)}</span>
                        {errand.unread > 0 && <span aria-hidden className="mt-2 w-2 h-2 rounded-full bg-rose-500" />}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ol>
          </li>
        );
      })}
    </ol>
  );

  const detail = selected && (
    <article aria-label={`${selected.orderCode ?? 'Errand'} timeline`} className="h-full flex flex-col">
      <header className="flex flex-wrap items-center gap-2 px-5 pt-5 pb-4 border-b border-slate-100">
        <button onClick={() => setMobileDetail(false)} aria-label="Back to all alerts" className={`lg:hidden p-1.5 -ml-1.5 rounded-lg text-slate-500 hover:bg-slate-100 ${FOCUS}`}>
          <ArrowLeft className="w-4 h-4" />
        </button>
        <h3 className="font-mono text-lg font-bold text-slate-900">{selected.orderCode ?? 'Errand'}</h3>
        <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full border ${STAGE[selected.latest.kind].pill}`}>{STAGE[selected.latest.kind].label}</span>
        <span className="ml-auto text-xs text-slate-400">{selected.steps.length} of 3 stages</span>
      </header>

      <ol className="px-5 py-5 flex-1">
        {selected.steps.map((n, i) => {
          const stage = STAGE[n.kind];
          const last = i === selected.steps.length - 1 && selected.steps.length === 3;
          return (
            <li key={n.id} className="relative flex gap-4">
              {!last && <span aria-hidden className="absolute left-[19px] top-10 bottom-0 w-px bg-slate-200" />}
              <span className={`relative mt-0.5 w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${stage.ring}`}>
                <stage.Icon className="w-5 h-5" aria-hidden />
              </span>
              <div className={`flex-1 min-w-0 ${last ? '' : 'pb-6'}`}>
                <div className="flex flex-col sm:flex-row sm:items-baseline sm:justify-between gap-0.5 sm:gap-3">
                  <p className="text-sm font-bold text-slate-900">{n.title}</p>
                  <time dateTime={n.createdAt} className="text-[11px] text-slate-400 shrink-0">{timeOfDay(n.createdAt)} · {timeAgo(n.createdAt)}</time>
                </div>
                <p className="text-sm text-slate-600 mt-0.5">{n.body}</p>
                {n.kind === 'ORDER_DELIVERED' && (
                  <button
                    onClick={() => onOpenErrand(n)}
                    className={`mt-3 inline-flex items-center space-x-1.5 text-sm font-bold text-white bg-nus-orange hover:bg-orange-600 px-4 py-2 rounded-lg shadow-sm ${FOCUS}`}
                  >
                    <span>Open in Tasks to confirm</span>
                    <ArrowRight className="w-4 h-4" aria-hidden />
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {selected.steps.length < 3 && (
          <li className="flex gap-4 text-slate-400">
            <span className="w-10 h-10 rounded-full border-2 border-dashed border-slate-200 shrink-0" aria-hidden />
            <p className="text-sm pt-2.5">
              Next: {selected.latest.kind === 'ORDER_ACCEPTED' ? 'your courier picks the items up' : 'your courier delivers the items'}
            </p>
          </li>
        )}
      </ol>
    </article>
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div role="tablist" aria-label="Filter alerts" className="flex items-center bg-white border border-slate-200 rounded-full p-0.5 text-xs font-bold shadow-sm">
          {(['all', 'unread'] as const).map((value) => (
            <button
              key={value}
              role="tab"
              aria-selected={filter === value}
              onClick={() => setFilter(value)}
              className={`px-3 py-1.5 rounded-full transition ${FOCUS} ${filter === value ? 'bg-nus-blue text-white shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {value === 'all' ? `All · ${items.length}` : `Unread · ${unreadCount}`}
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

      {error && <p className="rounded-xl px-4 py-3 text-sm text-rose-700 bg-rose-50 border border-rose-200">{error} Refresh to try again.</p>}

      {!error && errands.length === 0 && !isLoading && (
        <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-14 text-center">
          <Bell className="w-8 h-8 mx-auto text-slate-300" />
          <p className="mt-3 text-sm font-bold text-slate-700">{filter === 'unread' ? "You're all caught up" : 'No alerts yet'}</p>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            {filter === 'unread'
              ? 'New alerts appear here the moment a courier acts on one of your errands.'
              : 'Post an errand and you will hear here when a courier accepts, picks up and delivers it.'}
          </p>
        </div>
      )}

      {errands.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden lg:grid lg:grid-cols-[minmax(20rem,2fr)_3fr] lg:min-h-[28rem]">
          <section aria-label="Errands with alerts" className={`${mobileDetail ? 'hidden lg:block' : ''} lg:border-r lg:border-slate-100 lg:max-h-[70vh] lg:overflow-y-auto`}>
            {list}
          </section>
          <section aria-label="Selected errand" className={`${mobileDetail ? '' : 'hidden lg:block'} bg-slate-50/50`}>
            {detail}
          </section>
        </div>
      )}
    </div>
  );
}
