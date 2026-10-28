/**
 * AI Assistance Disclosure:
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
import { OrderDTO, OrderStatus } from '@campus-errand/common-dtos';
import { ArrowRight, Coins, MapPin, RefreshCw, Send, Truck } from 'lucide-react';
import { ExpandableNotes } from '../components/ExpandableNotes';
import { statusBadgeClasses } from '../errand/details';

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
      return { text: 'Expired · Reserved credits are returned by Credit Service', tone: 'text-slate-500' };
    case 'REJECTED':
      return {
        text: task.rejectionReason ? `Declined: ${task.rejectionReason}` : 'Declined · Credit reservation failed',
        tone: 'text-rose-700',
      };
    case 'DISPUTED':
      return { text: 'Disputed · An admin is reviewing this errand', tone: 'text-rose-700' };
  }
}

/** Returns the active milestone index (0 to 4) for normal lifecycle */
function getProgressStep(status: OrderStatus): number {
  switch (status) {
    case 'PENDING':
      return 0;
    case 'OPEN':
      return 1;
    case 'ACCEPTED':
      return 2;
    case 'IN_TRANSIT':
      return 3;
    case 'DELIVERED':
      return 4;
    case 'COMPLETED':
      return 5;
    default:
      return -1;
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

  const groups = [
    {
      key: 'posted' as const,
      title: 'Tasks posted',
      description: 'Errands you requested from other students.',
      tasks: postedTasks,
      emptyCta: 'Need food, drinks, or printouts?',
      emptyAction: 'Post an Errand',
    },
    {
      key: 'accepted' as const,
      title: 'Tasks accepted',
      description: 'Errands you are delivering for other students.',
      tasks: acceptedTasks,
      emptyCta: 'Earn extra credits on campus between lectures.',
      emptyAction: 'Browse Errand Feed',
    },
  ];

  const visibleGroups = groups.filter((g) => filterView === 'all' || filterView === g.key);

  return (
    <div className="space-y-6">
      {/* Top Header & Refresh Control */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
            My Tasks &amp; Deliveries
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
            Track active requests and your delivery courier commitments
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          {onRefreshOrders && (
            <button
              type="button"
              onClick={onRefreshOrders}
              disabled={ordersLoading}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-3.5 py-2 text-xs font-bold text-slate-700 shadow-subtle transition hover:bg-slate-50 disabled:opacity-50"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? 'animate-spin text-nus-blue' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>
      </div>

      {/* Segmented Filter Pills */}
      <div className="flex p-1 bg-slate-100 rounded-xl max-w-md">
        <button
          type="button"
          onClick={() => setFilterView('all')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
            filterView === 'all'
              ? 'bg-white text-slate-900 shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          All ({postedTasks.length + acceptedTasks.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterView('posted')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
            filterView === 'posted'
              ? 'bg-white text-nus-blue shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Posted by Me ({postedTasks.length})
        </button>
        <button
          type="button"
          onClick={() => setFilterView('accepted')}
          className={`flex-1 py-1.5 px-3 rounded-lg text-xs font-bold transition ${
            filterView === 'accepted'
              ? 'bg-white text-nus-orange shadow-sm'
              : 'text-slate-600 hover:text-slate-900'
          }`}
        >
          Delivering ({acceptedTasks.length})
        </button>
      </div>

      {/* Task Groups */}
      {visibleGroups.map((group) => (
        <section key={group.key} aria-labelledby={`tasks-${group.key}`} className="space-y-3.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 id={`tasks-${group.key}`} className="text-lg font-bold text-slate-900">
                {group.title}{' '}
                <span className="text-xs font-bold bg-slate-200/70 text-slate-700 px-2 py-0.5 rounded-full ml-1">
                  {group.tasks.length}
                </span>
              </h3>
              <p className="text-xs sm:text-sm text-slate-500 mt-0.5">{group.description}</p>
            </div>
          </div>

          <div className="responsive-card-grid items-start">
            {group.tasks.length === 0 && (
              <div className="col-span-full rounded-2xl border-2 border-dashed border-slate-200 bg-white/60 p-8 text-center shadow-subtle flex flex-col items-center justify-center">
                <div className="h-11 w-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 mb-2.5">
                  {group.key === 'posted' ? (
                    <Send className="h-5 w-5 text-nus-blue" />
                  ) : (
                    <Truck className="h-5 w-5 text-nus-orange" />
                  )}
                </div>
                <p className="font-bold text-slate-700 text-sm">No {group.key} tasks yet.</p>
                <p className="text-xs text-slate-500 mt-1">{group.emptyCta}</p>
              </div>
            )}

            {group.tasks.map((task) => {
              const line = statusLine(task, group.key);
              const stepIndex = getProgressStep(task.status);
              const isTerminal = ['COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED', 'DISPUTED'].includes(
                task.status
              );

              return (
                <article
                  key={`${group.key}-${task.id}`}
                  data-testid={`task-card-${group.key}-${task.orderCode}`}
                  data-order-id={task.id}
                  className="group relative flex flex-col justify-between bg-white rounded-2xl p-4 sm:p-5 shadow-subtle border border-slate-200 hover:border-nus-blue/40 hover:shadow-elevated hover:-translate-y-0.5 transition-all duration-200 focus-within:ring-2 focus-within:ring-nus-orange"
                >
                  <div className="space-y-3">
                    {/* Top Order Code & Status Badge */}
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className="text-xs font-mono font-bold text-nus-blue bg-nus-blue-50 border border-nus-blue-100 px-2 py-0.5 rounded-md">
                        {task.orderCode}
                      </span>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-xs font-bold px-2.5 py-0.5 rounded-md ${statusBadgeClasses(
                            task.status
                          )}`}
                        >
                          {task.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>

                    {/* Item Description */}
                    <h4
                      title={task.itemDescription}
                      className="text-sm sm:text-base font-bold text-slate-900 leading-snug line-clamp-2 group-hover:text-nus-blue transition-colors"
                    >
                      {task.itemDescription}
                    </h4>

                    {/* Reward Badge */}
                    <div className="flex items-center gap-1.5 text-xs font-extrabold text-amber-700 bg-amber-50/80 px-2.5 py-1 rounded-lg border border-amber-200/80 w-fit">
                      <Coins className="h-3.5 w-3.5 text-amber-500 fill-amber-400" />
                      <span>{task.rewardCredits} credits reward</span>
                    </div>

                    {/* Special Notes */}
                    <div className="pt-0.5">
                      <ExpandableNotes notes={task.specialNotes} />
                    </div>

                    {/* Route Details */}
                    <div className="bg-slate-50/80 rounded-xl p-2.5 border border-slate-100 space-y-1.5 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-blue-100 text-nus-blue">
                          <MapPin className="h-2.5 w-2.5" />
                        </span>
                        <span className="font-bold text-slate-500 shrink-0">Pickup:</span>
                        <span className="font-medium text-slate-800 truncate" title={task.supplierName}>
                          {task.supplierName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-orange-100 text-nus-orange">
                          <ArrowRight className="h-2.5 w-2.5" />
                        </span>
                        <span className="font-bold text-slate-500 shrink-0">Dropoff:</span>
                        <span className="font-medium text-slate-800 truncate" title={task.dropoffLocation}>
                          {task.dropoffLocation}
                        </span>
                      </div>
                    </div>

                    {/* Visual Milestone Stepper for Active Tasks */}
                    {stepIndex >= 0 && !isTerminal && (
                      <div className="pt-1">
                        <div className="flex items-center justify-between text-[10px] font-semibold text-slate-400 mb-1">
                          <span className={stepIndex >= 1 ? 'text-nus-blue font-bold' : ''}>Open</span>
                          <span className={stepIndex >= 2 ? 'text-nus-blue font-bold' : ''}>Accepted</span>
                          <span className={stepIndex >= 3 ? 'text-nus-blue font-bold' : ''}>En Route</span>
                          <span className={stepIndex >= 4 ? 'text-nus-blue font-bold' : ''}>Delivered</span>
                        </div>
                        <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex">
                          <div
                            className="bg-nus-blue transition-all duration-300 rounded-full"
                            style={{ width: `${Math.min(100, Math.max(15, (stepIndex / 4) * 100))}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Footer: Status Copy & View Details Link */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    {line ? (
                      <p className={`text-xs font-semibold ${line.tone} line-clamp-1`}>{line.text}</p>
                    ) : (
                      <span />
                    )}

                    {/* Stretched link covers whole card */}
                    <a
                      href={`/?tab=tasks&orderId=${encodeURIComponent(task.id)}`}
                      data-testid="open-errand-link"
                      aria-label={`View details of errand ${task.orderCode}`}
                      onClick={(event) => {
                        event.preventDefault();
                        onOpenErrand(task.id);
                      }}
                      className="inline-flex items-center gap-1 text-xs font-bold text-nus-blue hover:text-blue-900 whitespace-nowrap rounded focus:outline-none after:absolute after:inset-0 after:rounded-2xl after:content-[''] group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>View details</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </a>
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
