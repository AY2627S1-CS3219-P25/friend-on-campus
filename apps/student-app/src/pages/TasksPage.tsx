/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Resolved text truncation and missing dropoff icon on My Errands cards: gave item description dedicated full-width line preventing truncation, added orange MapPin to dropoff route stop, and removed arbitrary max-width caps on location addresses.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Polished My Errands segmented filter into high-end h-11 control with unified blue active styling and embedded count badges.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Streamlined errand cards into sleek compact 2-line cards (~72px), eliminated duplicate status badge and box-in-a-box styling, and provided full-width route row to eliminate text clipping.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Redesigned My Errands into responsive full-width horizontal tracking rows (desktop) with ample room for full pickup/dropoff addresses without text truncation, eliminated 3-column whitespace gaps, and suppressed redundant empty-state placeholders in the All filter view.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Compact mobile toolbar pairing segmented filter tabs and refresh action in a single row without orphan whitespace.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Harmonized Tasks page copy to Errand terminology ('Errands posted', 'Errands delivering') matching My Errands navigation.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Split connected route to 2-line layout (Pickup & Dropoff) with full card width and tooltips to resolve location text truncation.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Compact high-density task cards: inlined order code and reward badges, single-line connected route snippet, removed redundant list-view progress stepper, tightened card padding.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Removed internal backend microservice references (Credit Service) in favor of clear consumer wallet language.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-07
 * Scope: Streamlined TasksPage header into an action-first segmented toolbar, eliminating redundant static title while preserving Refresh button accessibility and role filter counts.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-11-06
 * Scope: Redesigned TasksPage with elevated card ergonomics, glassmorphic card containers, animated milestone progress bar, and refined filter tabs.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Light interactive pill button styling for View Details CTA.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Modernized TasksPage with segmented role filter tabs (All / Posted / Delivering), visual progress step bars, route snippets, and ergonomic interactive cards.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Errand details page (issues #188, #189; author's design of 2026-10-26): each task card is now a summary that
 * links to the errand's page (/?tab=tasks&orderId=), which owns the chat panel and every status action; the action
 * buttons, chat toggle and the notification focus panel left this file. Status badge classes moved to errand/details.ts.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fix (PR #148): the expanded ChatPanel receives the card's status so it can switch to read-only live.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Per the author's Notification Redesign (§2, §9): a focus panel for the errand a notification opened (live
 * status from Order Service, "no longer available" for a former participant), the matching card highlighted and
 * scrolled into view, and status copy that no longer claims credits were transferred or refunded.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Added courier Drop Errand (unassign) action before pickup and CANCELLED status summary on accepted courier task cards.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-21
 * Scope: Added courier pickup/deliver actions and requester confirm-delivery (complete)/cancel actions on task cards in pages/TasksPage.tsx (Issue #132).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Each card of an accepted-or-later errand gains a Chat toggle that expands the conversation in place
 * (author's D9, F8.1.1); OPEN errands have no conversation yet and show no toggle.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted active tasks page from student-app App.tsx into pages/TasksPage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)
// AI-generated (edited by Reallyeasy1)

import { useState } from 'react';
import { OrderDTO } from '@campus-errand/common-dtos';
import { ArrowRight, Coins, MapPin, RefreshCw, Send, Truck } from 'lucide-react';

interface TasksPageProps {
  orders: OrderDTO[];
  currentUserId: string | null;
  ordersLoading?: boolean;
  onRefreshOrders?: () => void;
  /** Opens the errand's details page (#188), which carries the chat and the actions. */
  onOpenErrand: (orderId: string) => void;
}

/** One line under the card so the list still tells the state at a glance; the page has the detail and the actions. */
function statusLine(task: OrderDTO, side: 'posted' | 'accepted'): { text: string; tone: string } | null {
  switch (task.status) {
    case 'PENDING':
      return { text: 'Reserving credits…', tone: 'text-amber-700' };
    case 'OPEN':
      return side === 'posted' ? { text: 'Open · Waiting for a courier', tone: 'text-amber-700' } : null;
    case 'ACCEPTED':
      return {
        text: side === 'accepted' ? 'Accepted · Head to the pickup spot' : 'Accepted · A courier is on it',
        tone: 'text-nus-blue',
      };
    case 'IN_TRANSIT':
      return {
        text: side === 'accepted' ? 'In transit · Deliver to the dropoff' : 'In transit · Courier has picked up your item',
        tone: 'text-amber-700',
      };
    case 'DELIVERED':
      return {
        text: side === 'posted' ? 'Delivered · Review and confirm' : 'Delivered · Waiting for requester confirmation',
        tone: 'text-blue-700',
      };
    case 'COMPLETED':
      return {
        text:
          side === 'posted'
            ? 'Completed · Delivery confirmed'
            : `Completed · ${task.rewardCredits} credits are paid once Credit Service settles the escrow`,
        tone: 'text-emerald-700',
      };
    case 'CANCELLED':
      return {
        text:
          side === 'posted'
            ? 'Cancelled · Reserved credits are returned by Credit Service'
            : 'Cancelled · Order was cancelled before completion',
        tone: 'text-slate-500',
      };
    case 'EXPIRED':
      return { text: 'Expired · Reserved credits refunded to wallet', tone: 'text-slate-500' };
    case 'REJECTED':
      return {
        text: task.rejectionReason ? `Declined: ${task.rejectionReason}` : 'Declined · Credit reservation failed',
        tone: 'text-rose-700',
      };
    case 'DISPUTED':
      return { text: 'Disputed · An admin is reviewing this errand', tone: 'text-rose-700' };
  }
}

export function TasksPage({
  orders,
  currentUserId,
  ordersLoading = false,
  onRefreshOrders,
  onOpenErrand,
}: TasksPageProps) {
  const [filterView, setFilterView] = useState<'all' | 'posted' | 'accepted'>('all');

  const postedTasks = orders.filter((task) => currentUserId && task.requesterId === currentUserId);
  const acceptedTasks = orders.filter((task) => currentUserId && task.courierId === currentUserId);
  const totalCount = postedTasks.length + acceptedTasks.length;

  const groups = [
    {
      key: 'posted' as const,
      title: 'Errands posted',
      description: 'Errands you requested from other students.',
      tasks: postedTasks,
      emptyCta: 'Need food, drinks, or printouts?',
      emptyAction: 'Post an Errand',
    },
    {
      key: 'accepted' as const,
      title: 'Errands delivering',
      description: 'Errands you are delivering for other students.',
      tasks: acceptedTasks,
      emptyCta: 'Earn extra credits on campus between lectures.',
      emptyAction: 'Browse Errand Feed',
    },
  ];

  // In 'all' view, only show groups that actually have tasks to avoid giant empty placeholder boxes.
  // In specific tab views ('posted' or 'accepted'), show the group even if empty so the user gets clear feedback.
  const visibleGroups = groups.filter((g) => {
    if (filterView === 'all') {
      return g.tasks.length > 0;
    }
    return filterView === g.key;
  });

  return (
    <div className="space-y-4 sm:space-y-5">
      {/* Action-First Tasks Toolbar: Role Filter Pills & Refresh Action */}
      <div className="flex items-center justify-between gap-2 overflow-x-auto pb-0.5 no-scrollbar">
        {/* Segmented Filter Pills */}
        <div className="h-11 p-1 flex items-center bg-slate-100/90 rounded-2xl border border-slate-200/60 shadow-2xs shrink-0">
          <button
            type="button"
            onClick={() => setFilterView('all')}
            className={`h-full px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap flex items-center gap-1.5 min-h-0 ${
              filterView === 'all'
                ? 'bg-white text-nus-blue shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>All</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filterView === 'all' ? 'bg-blue-100/90 text-nus-blue' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {totalCount}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterView('posted')}
            className={`h-full px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap flex items-center gap-1.5 min-h-0 ${
              filterView === 'posted'
                ? 'bg-white text-nus-blue shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span className="hidden sm:inline">Posted by Me</span>
            <span className="sm:hidden">Posted</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filterView === 'posted' ? 'bg-blue-100/90 text-nus-blue' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {postedTasks.length}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setFilterView('accepted')}
            className={`h-full px-3 sm:px-3.5 rounded-xl text-xs font-bold transition-all duration-150 cursor-pointer whitespace-nowrap flex items-center gap-1.5 min-h-0 ${
              filterView === 'accepted'
                ? 'bg-white text-nus-blue shadow-xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            <span>Delivering</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                filterView === 'accepted' ? 'bg-blue-100/90 text-nus-blue' : 'bg-slate-200/70 text-slate-600'
              }`}
            >
              {acceptedTasks.length}
            </span>
          </button>
        </div>

        {/* Refresh Action */}
        {onRefreshOrders && (
          <button
            type="button"
            onClick={onRefreshOrders}
            disabled={ordersLoading}
            className="h-11 min-h-0 inline-flex items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white/90 px-3.5 text-xs font-bold text-slate-700 shadow-2xs transition-all hover:bg-slate-50 hover:shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer shrink-0"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? 'animate-spin text-nus-blue' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        )}
      </div>

      {/* Global Empty State (All view with 0 total errands) */}
      {totalCount === 0 && filterView === 'all' && (
        <div className="rounded-3xl border-2 border-dashed border-slate-200/80 bg-white/70 backdrop-blur-sm p-8 sm:p-12 text-center shadow-card flex flex-col items-center justify-center">
          <div className="h-12 w-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-nus-blue mb-3 shadow-2xs">
            <Send className="h-5 w-5 text-nus-blue" />
          </div>
          <p className="font-extrabold text-slate-900 text-base">
            No active errands yet
          </p>
          <p className="text-xs sm:text-sm text-slate-500 mt-1 max-w-sm mx-auto">
            When you request an errand or accept a delivery on campus, your active orders will appear here.
          </p>
        </div>
      )}

      {/* Task Groups */}
      {visibleGroups.map((group) => (
        <section key={group.key} aria-labelledby={`tasks-${group.key}`} className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h3 id={`tasks-${group.key}`} className="text-base sm:text-lg font-extrabold text-slate-900 flex items-center gap-2">
                <span>{group.title}</span>
                <span className="text-xs font-extrabold bg-blue-50 text-nus-blue border border-blue-200/70 px-2.5 py-0.5 rounded-full">
                  {group.tasks.length}
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{group.description}</p>
            </div>
          </div>

          <div className="space-y-3">
            {group.tasks.length === 0 && (
              <div className="rounded-3xl border-2 border-dashed border-slate-200/80 bg-white/70 backdrop-blur-sm p-8 text-center shadow-card flex flex-col items-center justify-center">
                <div className="h-12 w-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mb-3 shadow-2xs">
                  {group.key === 'posted' ? (
                    <Send className="h-5 w-5 text-nus-blue" />
                  ) : (
                    <Truck className="h-5 w-5 text-nus-orange" />
                  )}
                </div>
                <p className="font-extrabold text-slate-800 text-sm">
                  No {group.key === 'posted' ? 'posted' : 'delivering'} errands yet.
                </p>
                <p className="text-xs text-slate-500 mt-1">{group.emptyCta}</p>
              </div>
            )}

            {group.tasks.map((task) => {
              const line = statusLine(task, group.key);

              return (
                <article
                  key={`${group.key}-${task.id}`}
                  data-testid={`task-card-${group.key}-${task.orderCode}`}
                  data-order-id={task.id}
                  className="group relative bg-white rounded-2xl p-3.5 sm:p-4 shadow-subtle hover:shadow-card-hover border border-slate-200/90 hover:border-nus-blue/50 hover:-translate-y-0.5 transition-all duration-200 focus-within:ring-2 focus-within:ring-nus-orange space-y-2"
                >
                  {/* Top Line: Identifiers, Status Summary & Action CTA */}
                  <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap min-w-0">
                      <span className="text-xs font-mono font-extrabold text-nus-blue bg-blue-50/90 border border-nus-blue-100 px-2 py-0.5 rounded-lg shadow-2xs shrink-0">
                        {task.orderCode}
                      </span>
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-amber-800 bg-amber-50/90 px-2 py-0.5 rounded-lg border border-amber-200/90 shadow-2xs shrink-0">
                        <Coins className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                        <span>{task.rewardCredits} C</span>
                      </span>
                      {line && (
                        <span className={`text-xs font-bold ${line.tone} inline-flex items-center gap-1.5 shrink-0`} title={line.text}>
                          <span className="w-1.5 h-1.5 rounded-full bg-current opacity-80" />
                          <span>{line.text}</span>
                        </span>
                      )}
                    </div>

                    <a
                      href={`/?tab=tasks&orderId=${encodeURIComponent(task.id)}`}
                      data-testid="open-errand-link"
                      aria-label={`View details of errand ${task.orderCode}`}
                      onClick={(event) => {
                        event.preventDefault();
                        onOpenErrand(task.id);
                      }}
                      className="inline-flex items-center gap-1 font-extrabold text-xs text-blue-700 bg-blue-50/90 hover:bg-blue-100 border border-blue-200/80 hover:border-blue-300 px-2.5 py-1 rounded-xl shadow-2xs whitespace-nowrap focus:outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:shadow-xs group-hover:scale-[1.02] transition-all shrink-0 cursor-pointer ml-auto"
                    >
                      <span>View details</span>
                      <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
                    </a>
                  </div>

                  {/* Middle Line: Full-width Item Description (Never squeezed or truncated prematurely) */}
                  <div className="min-w-0">
                    <h4
                      title={task.itemDescription}
                      className="text-sm sm:text-base font-extrabold text-slate-900 group-hover:text-nus-blue transition-colors line-clamp-2 leading-snug"
                    >
                      {task.itemDescription}
                    </h4>
                  </div>

                  {/* Bottom Line: Connected Route (with blue Pickup pin & orange Dropoff pin) & Notes */}
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-slate-600 pt-2 border-t border-slate-100/90">
                    <div className="inline-flex items-center gap-1.5 min-w-0">
                      <MapPin className="h-3.5 w-3.5 text-nus-blue shrink-0" />
                      <span className="text-slate-400 font-semibold text-[11px] shrink-0">Pickup:</span>
                      <span className="font-semibold text-slate-800 truncate" title={task.supplierName}>
                        {task.supplierName}
                      </span>
                    </div>

                    <span className="text-slate-300 select-none">➔</span>

                    <div className="inline-flex items-center gap-1.5 min-w-0">
                      <MapPin className="h-3.5 w-3.5 text-nus-orange shrink-0" />
                      <span className="text-slate-400 font-semibold text-[11px] shrink-0">Dropoff:</span>
                      <span className="font-semibold text-slate-800 truncate" title={task.dropoffLocation}>
                        {task.dropoffLocation}
                      </span>
                    </div>

                    {task.specialNotes && (
                      <>
                        <span className="text-slate-300 hidden sm:inline select-none">•</span>
                        <span className="text-slate-500 italic text-[11px] break-words" title={task.specialNotes}>
                          Note: {task.specialNotes}
                        </span>
                      </>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
