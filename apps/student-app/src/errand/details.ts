/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Pure helpers behind the errand details page (issue #188, author's design of 2026-10-26): the five-step status
 * tracker from the order timestamps, the terminal end state, the escrow state and its copy (no claim that credits
 * moved), the viewer's role, the expiry countdown, the conversation rule and the status badge classes (moved from
 * pages/TasksPage.tsx so the page and the cards share them).
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import type { OrderDTO, OrderStatus } from '@campus-errand/common-dtos';

export type TrackerKey = 'posted' | 'accepted' | 'picked_up' | 'delivered' | 'completed';
export type TrackerStep = { key: TrackerKey; label: string; at: string | null; state: 'done' | 'current' | 'todo' };

const TRACK: { key: TrackerKey; label: string; field: 'createdAt' | 'acceptedAt' | 'pickedUpAt' | 'deliveredAt' | 'completedAt' }[] = [
  { key: 'posted', label: 'Posted', field: 'createdAt' },
  { key: 'accepted', label: 'Accepted', field: 'acceptedAt' },
  { key: 'picked_up', label: 'Picked up', field: 'pickedUpAt' },
  { key: 'delivered', label: 'Delivered', field: 'deliveredAt' },
  { key: 'completed', label: 'Completed', field: 'completedAt' },
];

/**
 * How many steps a status has passed. PENDING and REJECTED never got posted (credits still reserving, or declined);
 * the other terminal statuses were posted and rely on the timestamps for the steps after that.
 */
const REACHED: Record<OrderStatus, number> = {
  PENDING: 0, REJECTED: 0, OPEN: 1, CANCELLED: 1, EXPIRED: 1, DISPUTED: 1, ACCEPTED: 2, IN_TRANSIT: 3, DELIVERED: 4, COMPLETED: 5,
};

const TERMINAL: ReadonlySet<OrderStatus> = new Set(['COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED', 'DISPUTED']);

export function trackerSteps(
  order: Pick<OrderDTO, 'status' | 'createdAt' | 'acceptedAt' | 'pickedUpAt' | 'deliveredAt' | 'completedAt'>,
): TrackerStep[] {
  const reached = REACHED[order.status];
  let currentAssigned = false;
  return TRACK.map((step, index) => {
    const at = order[step.field] ?? null;
    // createdAt exists before the errand is posted (PENDING), so the first step follows the status alone.
    const done = index < reached || (index > 0 && Boolean(at));
    let state: TrackerStep['state'] = 'todo';
    if (done) state = 'done';
    else if (!TERMINAL.has(order.status) && !currentAssigned) {
      state = 'current';
      currentAssigned = true;
    }
    return { key: step.key, label: step.label, at, state };
  });
}

export type EndState = { label: 'Cancelled' | 'Expired' | 'Declined' | 'Disputed'; reason: string | null } | null;

export function endState(order: Pick<OrderDTO, 'status' | 'rejectionReason'>): EndState {
  const label = ({ CANCELLED: 'Cancelled', EXPIRED: 'Expired', REJECTED: 'Declined', DISPUTED: 'Disputed' } as const)[
    order.status as 'CANCELLED' | 'EXPIRED' | 'REJECTED' | 'DISPUTED'
  ];
  return label ? { label, reason: order.rejectionReason || null } : null;
}

export type EscrowState = 'reserving' | 'held' | 'released' | 'returned' | 'disputed';

export function escrowState(status: OrderStatus): EscrowState {
  switch (status) {
    case 'PENDING': return 'reserving';
    case 'OPEN': case 'ACCEPTED': case 'IN_TRANSIT': case 'DELIVERED': return 'held';
    case 'COMPLETED': return 'released';
    case 'CANCELLED': case 'EXPIRED': case 'REJECTED': return 'returned';
    case 'DISPUTED': return 'disputed';
  }
}

/** Credit Service settles the escrow asynchronously, so the copy never says the credits have moved. */
export function escrowCopy(state: EscrowState, credits: number): string {
  switch (state) {
    case 'reserving': return `Reserving ${credits} credits…`;
    case 'held': return `${credits} credits held in escrow`;
    case 'released': return `${credits} credits paid to the courier once Credit Service settles the escrow`;
    case 'returned': return `${credits} reserved credits are returned by Credit Service`;
    case 'disputed': return `${credits} credits held while the dispute is resolved`;
  }
}

export function viewerRole(order: Pick<OrderDTO, 'requesterId' | 'courierId'>, userId: string | null): 'requester' | 'courier' | 'other' {
  if (userId && order.requesterId === userId) return 'requester';
  if (userId && order.courierId === userId) return 'courier';
  return 'other';
}

/** m:ss under an hour, h:mm:ss above, "Nd Nh" from two days, 0:00 once the expiry has passed. */
export function formatCountdown(expiresAt: string, nowMs: number): string {
  const total = Math.max(0, Math.floor((new Date(expiresAt).getTime() - nowMs) / 1000));
  const hours = Math.floor(total / 3600);
  if (hours >= 48) return `${Math.floor(hours / 24)}d ${hours % 24}h`;
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return hours > 0 ? `${hours}:${two(minutes)}:${two(seconds)}` : `${minutes}:${two(seconds)}`;
}

/** A conversation exists from accept onwards (F8.1); before that there is nothing to open. */
const CHAT_STATUSES: ReadonlySet<OrderStatus> = new Set(['ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'DISPUTED']);
export function hasConversation(status: OrderStatus): boolean {
  return CHAT_STATUSES.has(status);
}

export function statusBadgeClasses(status: OrderStatus): string {
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
