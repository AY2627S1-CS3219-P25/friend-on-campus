/**
 * AI Assistance Disclosure:
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

import { OrderDTO } from '@campus-errand/common-dtos';
import { ArrowRight, Coins, RefreshCw } from 'lucide-react';
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
    case 'PENDING': return { text: 'Reserving credits…', tone: 'text-amber-700' };
    case 'OPEN': return side === 'posted' ? { text: 'Open · Waiting for a courier', tone: 'text-amber-700' } : null;
    case 'ACCEPTED': return { text: side === 'accepted' ? 'Accepted · Head to the pickup spot' : 'Accepted · A courier is on it', tone: 'text-amber-700' };
    case 'IN_TRANSIT': return { text: side === 'accepted' ? 'In transit · Deliver to the dropoff' : 'In transit · Courier has picked up your item', tone: 'text-amber-700' };
    case 'DELIVERED': return { text: side === 'posted' ? 'Delivered · Review and confirm' : 'Delivered · Waiting for requester confirmation', tone: 'text-blue-700' };
    case 'COMPLETED': return { text: side === 'posted' ? 'Completed · Delivery confirmed' : `Completed · ${task.rewardCredits} credits are paid once Credit Service settles the escrow`, tone: 'text-emerald-700' };
    case 'CANCELLED': return { text: side === 'posted' ? 'Cancelled · Reserved credits are returned by Credit Service' : 'Cancelled · Order was cancelled before completion', tone: 'text-slate-500' };
    case 'EXPIRED': return { text: 'Expired · Reserved credits are returned by Credit Service', tone: 'text-slate-500' };
    case 'REJECTED': return { text: task.rejectionReason ? `Declined: ${task.rejectionReason}` : 'Declined · Credit reservation failed', tone: 'text-rose-700' };
    case 'DISPUTED': return { text: 'Disputed · An admin is reviewing this errand', tone: 'text-rose-700' };
  }
}

export function TasksPage({ orders, currentUserId, ordersLoading = false, onRefreshOrders, onOpenErrand }: TasksPageProps) {
  const groups = [
    {
      key: 'posted' as const,
      title: 'Tasks posted',
      description: 'Errands you requested from other students.',
      tasks: orders.filter((task) => currentUserId && task.requesterId === currentUserId),
    },
    {
      key: 'accepted' as const,
      title: 'Tasks accepted',
      description: 'Errands you are delivering for other students.',
      tasks: orders.filter((task) => currentUserId && task.courierId === currentUserId),
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-xl lg:text-2xl font-bold text-slate-800">My Tasks</h2>
        {onRefreshOrders && (
          <button
            type="button"
            onClick={onRefreshOrders}
            disabled={ordersLoading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-700 shadow-sm transition hover:bg-slate-50 disabled:opacity-50"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${ordersLoading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        )}
      </div>
      {groups.map((group) => (
        <section key={group.key} aria-labelledby={`tasks-${group.key}`} className="space-y-3">
          <div>
            <h3 id={`tasks-${group.key}`} className="text-lg font-bold text-slate-800">
              {group.title}{' '}
              <span className="text-sm font-medium text-slate-500">({group.tasks.length})</span>
            </h3>
            <p className="text-sm text-slate-500">{group.description}</p>
          </div>
          <div className="responsive-card-grid items-start">
            {group.tasks.length === 0 && (
              <p className="col-span-full rounded-xl border border-dashed border-slate-300 p-6 text-center text-slate-500">
                No {group.key} tasks yet.
              </p>
            )}
            {group.tasks.map((task) => {
              const line = statusLine(task, group.key);
              return (
                <article
                  key={`${group.key}-${task.id}`}
                  data-testid={`task-card-${group.key}-${task.orderCode}`}
                  data-order-id={task.id}
                  className="relative bg-white rounded-xl p-4 shadow-sm border border-slate-200 hover:shadow-md transition focus-within:ring-2 focus-within:ring-nus-orange"
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {task.orderCode}
                      </span>
                      <span className={`text-xs font-bold px-2 py-1 rounded ${statusBadgeClasses(task.status)}`}>
                        {task.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p title={task.itemDescription} className="text-sm font-bold text-slate-800 h-10 leading-5 line-clamp-2">
                      {task.itemDescription}
                    </p>
                    <p className="flex items-center gap-1 text-sm font-bold text-amber-700">
                      <Coins className="h-4 w-4" />
                      {task.rewardCredits} credits
                    </p>
                    <ExpandableNotes notes={task.specialNotes} />
                    <p title={task.supplierName} className="truncate text-xs text-slate-500">
                      Pickup: {task.supplierName}
                    </p>
                    <p title={task.dropoffLocation} className="truncate text-xs text-slate-500">
                      Dropoff: {task.dropoffLocation}
                    </p>
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                      {line ? <p className={`text-xs font-medium ${line.tone}`}>{line.text}</p> : <span />}
                      {/* Stretched over the whole card (after:inset-0): the card is the link without wrapping other
                          interactive content; the notes' Show more sits above it (z-10). */}
                      <a
                        href={`/?tab=tasks&orderId=${encodeURIComponent(task.id)}`}
                        data-testid="open-errand-link"
                        aria-label={`View details of errand ${task.orderCode}`}
                        onClick={(event) => { event.preventDefault(); onOpenErrand(task.id); }}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 whitespace-nowrap rounded focus:outline-none after:absolute after:inset-0 after:rounded-xl after:content-['']"
                      >
                        View details <ArrowRight className="h-3.5 w-3.5" />
                      </a>
                    </div>
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
