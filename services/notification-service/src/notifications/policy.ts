/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-23
 * Scope: Increment 6 receipts (§4, §9): credit.escrow.settled is a quiet CREDITS_RECEIVED receipt for the courier with the
 * exact amount and ledger code; credit.escrow.refunded a quiet CREDITS_RETURNED receipt for the requester. Both point
 * at the wallet. Nothing is said about money on Order events.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: The recipient and trigger matrix of the author's Notification Redesign (§2–§4): one validated Order event
 * becomes zero or more recipient drafts with kind, category, priority, action and the copy fixed by the design.
 * Version-1 events keep the three F5 alerts and produce nothing else; the acting student never gets a self-alert.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import type { NotificationActionType, NotificationCategory, NotificationPriority } from '@campus-errand/common-dtos';
import type { CreditReceiptEvent, NotificationEvent, OrderEvent, OrderEventV2 } from './events';
import type { NotificationDraft } from './store';

/** Bump when the matrix changes, so replayed events can be told apart from ones processed under an older policy. */
export const POLICY_VERSION = 1;

type Shape = Pick<NotificationDraft, 'kind' | 'category' | 'priority' | 'actionType'>;
const progress = (kind: NotificationDraft['kind']): Shape => ({ kind, category: 'PROGRESS', priority: 'NORMAL', actionType: 'VIEW_ERRAND' });
const important = (kind: NotificationDraft['kind'], priority: NotificationPriority, actionType: NotificationActionType = 'VIEW_ERRAND'): Shape =>
  ({ kind, category: 'IMPORTANT' satisfies NotificationCategory, priority, actionType });

/** The three F5 alerts, worded as before; shared by version 1 and version 2 events. */
function f5(event: OrderEvent): (Shape & { title: string; body: string }) | null {
  const errand = event.orderCode ? `Your errand ${event.orderCode}` : 'Your errand';
  switch (event.eventType) {
    case 'order.accepted':
      return {
        ...progress('ORDER_ACCEPTED'),
        title: `${errand} was accepted`,
        // F5.1.1: name the courier when the event carries it; rows stored before the field existed keep the generic text.
        body: event.courierUsername
          ? `${event.courierUsername} accepted your errand and will pick the items up next.`
          : 'A courier has been assigned to your errand.',
      };
    case 'order.in_transit':
      return { ...progress('ORDER_PICKED_UP'), title: `${errand} was picked up`, body: 'Your courier has the items and is on the way.' };
    case 'order.delivered':
      return {
        kind: 'ORDER_DELIVERED', category: 'ACTION', priority: 'HIGH', actionType: 'REVIEW_DELIVERY',
        title: `${errand} was delivered`, body: 'Review the delivery and confirm it.',
      };
    default:
      return null;
  }
}

/** Version-2 outcomes (Notification Redesign §3, §4): recipients other than the F5 requester alerts. */
function v2Drafts(event: OrderEventV2): NotificationDraft[] {
  const code = event.orderCode;
  const to = (userId: string, shape: Shape, title: string, body: string): NotificationDraft => ({ userId, ...shape, title, body });
  const admin = event.actorRole === 'ADMIN';
  switch (event.eventType) {
    case 'order.created':
      return [to(event.requesterId, progress('ORDER_PUBLISHED'), `Errand ${code} is posted`, 'Couriers can now see it. You will hear here when one accepts it.')];
    case 'order.completed':
      return admin
        ? [event.requesterId, event.courierId!].map((u) => to(u, important('ORDER_COMPLETED', 'HIGH'),
            `${code} was completed by an administrator`, 'An administrator confirmed this delivery. Open the errand to see its final state.'))
        : [to(event.courierId!, important('ORDER_COMPLETED', 'NORMAL'),
            `Delivery confirmed for ${code}`, 'The requester confirmed your delivery. Your payment appears in your wallet once it is settled.')];
    case 'order.cancelled':
      if (admin) {
        return [event.requesterId, ...(event.courierId ? [event.courierId] : [])].map((u) => to(u, important('ORDER_CANCELLED', 'HIGH'),
          'Errand cancelled', `An administrator cancelled ${code}. Open the errand for its current status.`));
      }
      // The requester acted and needs no self-alert; a courier who had accepted it does.
      return event.courierId
        ? [to(event.courierId, important('ORDER_CANCELLED', 'HIGH'), 'Errand cancelled', `The requester cancelled ${code} before pickup.`)]
        : [];
    case 'order.expired':
      return event.reasonCode === 'PUBLICATION_EXPIRED'
        ? [to(event.requesterId, important('ORDER_EXPIRED', 'NORMAL'), `Errand ${code} could not be posted in time`,
            'The deadline passed before publication completed. Any reserved credits are returned separately.')]
        : [to(event.requesterId, important('ORDER_EXPIRED', 'NORMAL'), `Errand ${code} expired`,
            'No courier accepted it before the deadline. You can post a new request.')];
    case 'order.unassigned':
      return admin
        ? [
            to(event.requesterId, important('ORDER_UNASSIGNED', 'HIGH'), `Courier removed from ${code}`, 'An administrator removed the courier. It is open again.'),
            to(event.priorCourierId!, important('ORDER_UNASSIGNED', 'HIGH'), `You were removed from ${code}`, 'An administrator removed you from this errand.'),
          ]
        : [to(event.requesterId, important('ORDER_UNASSIGNED', 'HIGH'), `Your courier dropped ${code}`, 'It is open again for another courier.')];
    case 'order.rejected':
      return event.reasonCode === 'INSUFFICIENT_CREDITS'
        ? [to(event.requesterId, important('ORDER_REJECTED', 'HIGH', 'REVIEW_WALLET'), `Errand ${code} could not be posted`,
            'There were not enough available credits. Review your wallet or lower the reward and try again.')]
        : [to(event.requesterId, important('ORDER_REJECTED', 'HIGH'), `Errand ${code} could not be posted`,
            'The credit reservation was declined. Open the errand for details.')];
    default:
      return [];
  }
}

// AI-generated (edited by Reallyeasy1)
/** A committed wallet change. Quiet: it sits in the inbox and never toasts; the wallet shows the ledger row. */
function receipt(event: CreditReceiptEvent): NotificationDraft[] {
  const errand = event.orderCode ?? 'your errand';
  const shape: Shape = { kind: 'CREDITS_RECEIVED', category: 'RECEIPT', priority: 'NORMAL', actionType: 'REVIEW_WALLET' };
  if (event.eventType === 'credit.escrow.settled') {
    return [{
      userId: event.beneficiaryId, ...shape,
      title: `${event.amount} credits received`,
      body: `Payment for ${errand} is complete (${event.transactionCode}).`,
    }];
  }
  return [{
    userId: event.beneficiaryId, ...shape, kind: 'CREDITS_RETURNED',
    title: `${event.amount} reserved credits are available again`,
    body: `Refund for ${errand} is complete (${event.transactionCode}).`,
  }];
}

/**
 * Map one validated event to the students who should see it. Zero drafts is a valid answer: the event changed
 * nothing a student needs to know, or (version 1) the design never defined a recipient for it.
 */
export function toNotifications(event: NotificationEvent): NotificationDraft[] {
  if (event.schemaVersion === 2 && event.producer === 'credit-service') return receipt(event);
  const alert = f5(event);
  const drafts: NotificationDraft[] = alert ? [{ userId: event.requesterId, ...alert }] : [];
  if (event.schemaVersion === 2) drafts.push(...v2Drafts(event));
  // One row per recipient, and never one for the student who caused the change.
  const seen = new Set<string>();
  return drafts.filter((d) => {
    if (d.userId === event.actorId || seen.has(d.userId)) return false;
    seen.add(d.userId);
    return true;
  });
}
