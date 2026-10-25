/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Version-2 Order events per the author's Notification Redesign (§6): OrderLifecycleEvent gains order.rejected and
 * order.unassigned; OrderEventDraft is what the service builds and completeEvent() fills orderVersion, previousStatus,
 * status, the cancelled/expired assignee and priorCourierId from the rows inside the committing transaction.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Domain types, custom errors, and DTO mappers for Order Service.
 * Author review: (to be completed by author after review)
 */
import { randomBytes } from 'node:crypto';
import type {
  CreditReservationRequestEvent,
  OrderAcceptedEvent,
  OrderCancelledEvent,
  OrderCompletedEvent,
  OrderCreatedEvent,
  OrderDeliveredEvent,
  OrderDTO,
  OrderExpiredEvent,
  OrderInTransitEvent,
  OrderRejectedEvent,
  OrderStatus,
  OrderUnassignedEvent,
} from '@campus-errand/common-dtos';
import type { Order as PrismaOrder } from '../database/client';

export type OrderLifecycleEvent =
  | CreditReservationRequestEvent
  | OrderCreatedEvent
  | OrderAcceptedEvent
  | OrderInTransitEvent
  | OrderDeliveredEvent
  | OrderCompletedEvent
  | OrderExpiredEvent
  | OrderCancelledEvent
  | OrderRejectedEvent
  | OrderUnassignedEvent;

// AI-generated (edited by Reallyeasy1)
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/** An event as the service builds it, before the repository knows the committed row. */
export type OrderEventDraft = DistributiveOmit<
  OrderLifecycleEvent,
  'orderVersion' | 'previousStatus' | 'status' | 'priorCourierId'
>;

interface CommittedRow {
  version: number;
  status: string;
  courierId?: string | null;
}

/**
 * Fill the fields that only the committing transaction knows (Notification Redesign §6): the version and status
 * after the update, the state before it, the assignee a cancellation or expiry removed, and the courier an
 * unassignment removed. The reservation request is not an order transition and is returned unchanged.
 */
export function completeEvent(draft: OrderEventDraft, before: CommittedRow, after: CommittedRow): OrderLifecycleEvent {
  if (draft.eventType === 'order.reservation.requested') return draft;
  const committed = {
    ...draft,
    orderVersion: after.version,
    previousStatus: before.status as OrderStatus,
    status: after.status as OrderStatus,
  };
  switch (draft.eventType) {
    case 'order.cancelled':
    case 'order.expired':
      return { ...committed, ...(before.courierId && { courierId: before.courierId }) } as OrderLifecycleEvent;
    case 'order.unassigned':
      if (!before.courierId) throw new OrderStateConflictError('No courier is assigned to this errand');
      return { ...committed, priorCourierId: before.courierId } as OrderLifecycleEvent;
    default:
      return committed as OrderLifecycleEvent;
  }
}

export class OrderError extends Error {
  constructor(message: string, public readonly status: number = 400) {
    super(message);
    this.name = 'OrderError';
  }
}

export class OrderNotFoundError extends OrderError {
  constructor(message = 'Order not found') {
    super(message, 404);
    this.name = 'OrderNotFoundError';
  }
}

export class SelfAcceptForbiddenError extends OrderError {
  constructor(message = 'You cannot accept your own errand request') {
    super(message, 400);
    this.name = 'SelfAcceptForbiddenError';
  }
}

export class OrderStateConflictError extends OrderError {
  constructor(message: string) {
    super(message, 409);
    this.name = 'OrderStateConflictError';
  }
}

export class OrderAuthorizationError extends OrderError {
  constructor(message = 'You are not authorized to perform this action') {
    super(message, 403);
    this.name = 'OrderAuthorizationError';
  }
}

export class OrderValidationError extends OrderError {
  constructor(message: string) {
    super(message, 400);
    this.name = 'OrderValidationError';
  }
}

export function toOrderDTO(order: PrismaOrder): OrderDTO {
  return {
    id: order.id,
    orderCode: order.orderCode,
    requesterId: order.requesterId,
    courierId: order.courierId,
    supplierId: order.supplierId,
    supplierName: order.supplierName ?? undefined,
    campusZone: order.campusZone ?? undefined,
    itemDescription: order.itemDescription,
    specialNotes: order.specialNotes ?? undefined,
    dropoffLocation: order.dropoffLocation,
    requesterContactNote: order.requesterContactNote ?? undefined,
    courierContactNote: order.courierContactNote ?? undefined,
    rewardCredits: order.rewardCredits,
    status: order.status as OrderStatus,
    rejectionReason: order.rejectionReason ?? null,
    expiresAt: order.expiresAt.toISOString(),
    acceptedAt: order.acceptedAt?.toISOString() ?? null,
    pickedUpAt: order.pickedUpAt?.toISOString() ?? null,
    deliveredAt: order.deliveredAt?.toISOString() ?? null,
    completedAt: order.completedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    version: order.version,
  };
}

export function generateOrderCode(): string {
  const suffix = randomBytes(4).toString('hex').toUpperCase();
  return `ORD-${suffix}`;
}
