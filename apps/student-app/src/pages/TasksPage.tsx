/**
 * AI Assistance Disclosure:
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
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted active tasks page from student-app App.tsx into pages/TasksPage.tsx.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { OrderDTO, OrderStatus } from '@campus-errand/common-dtos';
import { CheckCircle2, Coins, PackageCheck, RefreshCw, Truck, XCircle } from 'lucide-react';
import { useEffect } from 'react';
import { FetchOrderResult, TaskOrderAction } from '../api/orders';
import { ExpandableNotes } from '../components/ExpandableNotes';

interface TasksPageProps {
  orders: OrderDTO[];
  currentUserId: string | null;
  ordersLoading?: boolean;
  actingOrderId: string | null;
  actingAction: TaskOrderAction | null;
  onRefreshOrders?: () => void;
  onPickupOrder: (orderId: string) => void;
  onDeliverOrder: (orderId: string) => void;
  onCompleteOrder: (orderId: string) => void;
  onCancelOrder: (orderId: string) => void;
  onUnassignOrder: (orderId: string) => void;
  /** The errand a notification opened (deep link); null when Tasks was opened directly. */
  focusOrderId?: string | null;
  /** Its authoritative state, fetched from Order Service when the focus was set; null while loading. */
  focusOrder?: FetchOrderResult | null;
  onClearFocus?: () => void;
}

function getStatusBadgeClasses(status: OrderStatus): string {
  switch (status) {
    case 'COMPLETED':
      return 'text-emerald-700 bg-emerald-50 border border-emerald-200';
    case 'DELIVERED':
      return 'text-blue-700 bg-blue-50 border border-blue-200';
    case 'CANCELLED':
    case 'EXPIRED':
    case 'REJECTED':
      return 'text-rose-700 bg-rose-50 border border-rose-200';
    default:
      return 'text-amber-700 bg-amber-50 border border-amber-200';
  }
}

export function TasksPage({
  orders,
  currentUserId,
  ordersLoading = false,
  actingOrderId,
  actingAction,
  onRefreshOrders,
  onPickupOrder,
  onDeliverOrder,
  onCompleteOrder,
  onCancelOrder,
  onUnassignOrder,
  focusOrderId = null,
  focusOrder = null,
  onClearFocus,
}: TasksPageProps) {
  // AI-generated (edited by Reallyeasy1)
  // The notification only pointed here; the current order status decides what the card offers.
  useEffect(() => {
    if (!focusOrderId) return;
    const card = document.querySelector<HTMLElement>(`[data-order-id="${focusOrderId}"]`);
    card?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  }, [focusOrderId, orders.length]);
  const focused = focusOrder?.status === 'ok' ? focusOrder.order : null;

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
      {focusOrderId && (
        <section
          role="status"
          data-testid="focused-errand"
          className="rounded-xl border border-orange-200 bg-orange-50 p-4 text-sm text-slate-800 flex flex-wrap items-center gap-3"
        >
          {focusOrder === null && <span>Checking the errand's current status…</span>}
          {focused && (
            <>
              <span className="font-mono font-bold text-blue-700 bg-white px-2 py-0.5 rounded">{focused.orderCode}</span>
              <span className={`text-xs font-bold px-2 py-1 rounded ${getStatusBadgeClasses(focused.status)}`}>
                {focused.status.replace(/_/g, ' ')}
              </span>
              <span className="text-slate-600">
                {focused.status === 'DELIVERED' && focused.requesterId === currentUserId
                  ? 'Delivered: review it and confirm below.'
                  : focused.requesterId === currentUserId || focused.courierId === currentUserId
                    ? 'This is the current state of the errand; the card below has the actions it allows.'
                    : 'You are no longer part of this errand; this is its current state.'}
              </span>
            </>
          )}
          {focusOrder && focusOrder.status !== 'ok' && (
            <span className="text-slate-600">
              {focusOrder.status === 'error' ? focusOrder.message : 'This errand is no longer available to you.'}
            </span>
          )}
          {onClearFocus && (
            <button type="button" onClick={onClearFocus} className="ml-auto text-xs font-bold text-blue-700 underline">
              Dismiss
            </button>
          )}
        </section>
      )}
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
              const isBusyThisCard = actingOrderId === task.id;
              const disableAllActions = actingOrderId !== null;

              return (
                <article
                  key={`${group.key}-${task.id}`}
                  data-testid={`task-card-${group.key}-${task.orderCode}`}
                  data-order-id={task.id}
                  className={`bg-white rounded-xl p-4 shadow-sm border space-y-2 flex flex-col justify-between ${
                    task.id === focusOrderId ? 'border-nus-orange ring-2 ring-nus-orange/60' : 'border-slate-200'
                  }`}
                >
                  <div className="space-y-2">
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <span className="text-sm font-mono font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
                        {task.orderCode}
                      </span>
                      <span
                        className={`text-xs font-bold px-2 py-1 rounded ${getStatusBadgeClasses(
                          task.status
                        )}`}
                      >
                        {task.status.replace(/_/g, ' ')}
                      </span>
                    </div>
                    <p
                      title={task.itemDescription}
                      className="text-sm font-bold text-slate-800 h-10 leading-5 line-clamp-2"
                    >
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
                  </div>

                  {group.key === 'accepted' && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      {task.status === 'ACCEPTED' && (
                        <div className="w-full flex flex-col sm:flex-row gap-2">
                          <button
                            type="button"
                            data-testid="pickup-order-btn"
                            onClick={() => onPickupOrder(task.id)}
                            disabled={disableAllActions}
                            className="flex-1 inline-flex items-center justify-center gap-1.5 bg-nus-blue hover:bg-blue-800 text-white font-bold text-xs px-3 py-2 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <Truck className="h-3.5 w-3.5" />
                            <span>
                              {isBusyThisCard && actingAction === 'pickup'
                                ? 'Marking Picked Up…'
                                : 'Mark Picked Up'}
                            </span>
                          </button>
                          <button
                            type="button"
                            data-testid="unassign-order-btn"
                            onClick={() => onUnassignOrder(task.id)}
                            disabled={disableAllActions}
                            className="inline-flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <XCircle className="h-3.5 w-3.5" />
                            <span>
                              {isBusyThisCard && actingAction === 'unassign'
                                ? 'Dropping…'
                                : 'Drop Errand'}
                            </span>
                          </button>
                        </div>
                      )}

                      {task.status === 'IN_TRANSIT' && (
                        <button
                          type="button"
                          data-testid="deliver-order-btn"
                          onClick={() => onDeliverOrder(task.id)}
                          disabled={disableAllActions}
                          className="w-full inline-flex items-center justify-center gap-1.5 bg-nus-orange hover:bg-orange-600 text-white font-bold text-xs px-3 py-2 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <PackageCheck className="h-3.5 w-3.5" />
                          <span>
                            {isBusyThisCard && actingAction === 'deliver'
                              ? 'Marking Delivered…'
                              : 'Mark Delivered'}
                          </span>
                        </button>
                      )}

                      {task.status === 'DELIVERED' && (
                        <p className="text-xs font-medium text-blue-700">
                          Delivered · Waiting for requester confirmation
                        </p>
                      )}

                      {task.status === 'COMPLETED' && (
                        <p className="text-xs font-medium text-emerald-700">
                          Completed · {task.rewardCredits} credits are paid once Credit Service settles the escrow
                        </p>
                      )}

                      {task.status === 'CANCELLED' && (
                        <p className="text-xs font-medium text-slate-500">
                          Cancelled · Order was cancelled before completion
                        </p>
                      )}
                    </div>
                  )}

                  {group.key === 'posted' && (
                    <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2">
                      {task.status === 'DELIVERED' && (
                        <button
                          type="button"
                          data-testid="complete-order-btn"
                          onClick={() => onCompleteOrder(task.id)}
                          disabled={disableAllActions}
                          className="w-full inline-flex items-center justify-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs px-3 py-2 rounded-lg shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          <span>
                            {isBusyThisCard && actingAction === 'complete'
                              ? 'Confirming Delivery…'
                              : 'Confirm Delivery'}
                          </span>
                        </button>
                      )}

                      {(task.status === 'OPEN' || task.status === 'ACCEPTED') && (
                        <button
                          type="button"
                          data-testid="cancel-order-btn"
                          onClick={() => onCancelOrder(task.id)}
                          disabled={disableAllActions}
                          className="w-full inline-flex items-center justify-center gap-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs px-3 py-2 rounded-lg transition disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          <XCircle className="h-3.5 w-3.5" />
                          <span>
                            {isBusyThisCard && actingAction === 'cancel'
                              ? 'Cancelling…'
                              : 'Cancel Errand'}
                          </span>
                        </button>
                      )}

                      {task.status === 'PENDING' && (
                        <p className="text-xs font-medium text-amber-700">
                          Reserving credits…
                        </p>
                      )}

                      {task.status === 'IN_TRANSIT' && (
                        <p className="text-xs font-medium text-amber-700">
                          In transit · Courier has picked up your item
                        </p>
                      )}

                      {task.status === 'COMPLETED' && (
                        <p className="text-xs font-medium text-emerald-700">
                          Completed · Delivery confirmed
                        </p>
                      )}

                      {task.status === 'CANCELLED' && (
                        <p className="text-xs font-medium text-slate-500">
                          Cancelled · Reserved credits are returned by Credit Service
                        </p>
                      )}

                      {task.status === 'EXPIRED' && (
                        <p className="text-xs font-medium text-slate-500">
                          Expired · Reserved credits are returned by Credit Service
                        </p>
                      )}

                      {task.status === 'REJECTED' && (
                        <p className="text-xs font-medium text-rose-700">
                          {task.rejectionReason
                            ? `Declined: ${task.rejectionReason}`
                            : 'Declined · Credit reservation failed'}
                        </p>
                      )}
                    </div>
                  )}
                </article>
              );
            })}
          </div>
        </section>
      ))}
    </div>
  );
}
