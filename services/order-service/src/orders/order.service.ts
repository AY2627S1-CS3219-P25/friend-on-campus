/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Per the author's Notification Redesign (§6): every outbox draft carries the version-2 fields (schemaVersion,
 * producer, correlationId, actor, reason code) via v2(); courier drop and admin unassign now emit order.unassigned.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Added courier unassignOrder handler allowing assigned couriers to drop an ACCEPTED errand prior to pickup.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Replace synchronous reserve/create calls with durable outbox submission.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-17
 * Scope: accept, pickup and deliver take the caller's optional username and put it on the outbox event as
 * courierUsername (F5.1.1), per the author's design.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-11
 * Scope: Added adminCancelOrder, adminCompleteOrder, adminUnassignOrder handlers for administrative state interventions.
 * Author review: (to be completed by author after review)
 *
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Refactored Order Service orchestrator into modular, extracted domain handler functions and a lightweight factory function.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import type {
  AcceptOrderRequest,
  AdminCancelOrderRequest,
  AdminCompleteOrderRequest,
  AdminUnassignOrderRequest,
  CreateOrderRequest,
  CreditReservationRequestEvent,
  CreditReservationResultEvent,
  OrderAcceptedEvent,
  OrderActorRole,
  OrderCancelledEvent,
  OrderCompletedEvent,
  OrderDeliveredEvent,
  OrderDTO,
  OrderInTransitEvent,
  OrderReasonCode,
} from '@campus-errand/common-dtos';
import crypto from 'node:crypto';
import type { SupplierClient } from '../clients/supplier.client';
import type { ListOrdersOptions, OrderRepository } from '../repositories/order.repository';
import { generateOrderCode, OrderError, type OrderEventDraft, OrderNotFoundError, OrderValidationError } from './order.types';

// AI-generated (edited by Reallyeasy1)
// Version-2 envelope fields the service knows before the transaction (Notification Redesign §6). The repository adds
// orderVersion, previousStatus, status and the removed assignee when it commits.
function v2(order: Pick<OrderDTO, 'id'>, actor: { role: OrderActorRole; id?: string }, reasonCode?: OrderReasonCode) {
  return {
    schemaVersion: 2 as const,
    producer: 'order-service' as const,
    correlationId: order.id,
    actorRole: actor.role,
    ...(actor.id !== undefined && { actorId: actor.id }),
    ...(reasonCode !== undefined && { reasonCode }),
  };
}

type UnassignedDraft = Extract<OrderEventDraft, { eventType: 'order.unassigned' }>;

export interface OrderService {
  createOrder(requesterId: string, req: CreateOrderRequest): Promise<OrderDTO>;
  handleReservationResult(event: CreditReservationResultEvent): Promise<OrderDTO>;
  getOrderById(id: string): Promise<OrderDTO>;
  listOrders(options: ListOrdersOptions): Promise<{ orders: OrderDTO[]; total: number }>;
  getUserActivity(userId: string): Promise<{ requested: OrderDTO[]; delivering: OrderDTO[]; history: OrderDTO[] }>;
  // AI-generated (edited by Reallyeasy1)
  // courierUsername comes from the caller's access token; undefined when the token predates the claim (F5.1.1).
  acceptOrder(orderId: string, courierId: string, req?: AcceptOrderRequest, courierUsername?: string): Promise<OrderDTO>;
  pickupOrder(orderId: string, courierId: string, courierUsername?: string): Promise<OrderDTO>;
  deliverOrder(orderId: string, courierId: string, courierUsername?: string): Promise<OrderDTO>;
  completeOrder(orderId: string, requesterId: string): Promise<OrderDTO>;
  cancelOrder(orderId: string, requesterId: string): Promise<OrderDTO>;
  unassignOrder(orderId: string, courierId: string): Promise<OrderDTO>;
  adminCancelOrder(orderId: string, adminUserId: string, req: AdminCancelOrderRequest): Promise<OrderDTO>;
  adminCompleteOrder(orderId: string, adminUserId: string, req: AdminCompleteOrderRequest): Promise<OrderDTO>;
  adminUnassignOrder(orderId: string, adminUserId: string, req: AdminUnassignOrderRequest): Promise<OrderDTO>;
}

export interface OrderServiceDependencies {
  repository: OrderRepository;
  supplierClient: SupplierClient;
}

// ---------------------------------------------------------------------------
// Validation Helpers
// ---------------------------------------------------------------------------

function validateRequiredText(value: unknown, field: string, maxLength: number): string {
  if (value === undefined || value === null) {
    throw new OrderValidationError(`${field} is required`);
  }
  if (typeof value !== 'string') {
    throw new OrderValidationError(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    throw new OrderValidationError(`${field} cannot be empty`);
  }
  if (trimmed.length > maxLength) {
    throw new OrderValidationError(`${field} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

function validateOptionalText(value: unknown, field: string, maxLength: number): string | undefined {
  if (value === undefined || value === null) {
    return undefined;
  }
  if (typeof value !== 'string') {
    throw new OrderValidationError(`${field} must be a string`);
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return undefined;
  }
  if (trimmed.length > maxLength) {
    throw new OrderValidationError(`${field} must be at most ${maxLength} characters`);
  }
  return trimmed;
}

interface ValidatedCreateOrderInput {
  supplierId: string;
  itemDescription: string;
  dropoffLocation: string;
  specialNotes?: string;
  requesterContactNote?: string;
  rewardCredits: number;
  durationMinutes: number;
}

function validateCreateOrderRequest(req: CreateOrderRequest): ValidatedCreateOrderInput {
  if (!req || typeof req !== 'object') {
    throw new OrderValidationError('Request body must be an object');
  }

  if (!req.supplierId || typeof req.supplierId !== 'string') {
    throw new OrderValidationError('supplierId is required');
  }
  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(req.supplierId.trim())) {
    throw new OrderValidationError('supplierId must be a valid UUID');
  }

  const itemDescription = validateRequiredText(req.itemDescription, 'itemDescription', 1000);
  const dropoffLocation = validateRequiredText(req.dropoffLocation, 'dropoffLocation', 255);
  const specialNotes = validateOptionalText(req.specialNotes, 'specialNotes', 1000);
  const requesterContactNote = validateOptionalText(req.requesterContactNote, 'requesterContactNote', 255);

  if (typeof req.rewardCredits !== 'number' || !Number.isInteger(req.rewardCredits) || req.rewardCredits <= 0 || req.rewardCredits > 2147483647) {
    throw new OrderValidationError('rewardCredits must be an integer between 1 and 2147483647');
  }

  let durationMinutes = 30;
  if (req.durationMinutes !== undefined) {
    if (typeof req.durationMinutes !== 'number' || !Number.isInteger(req.durationMinutes) || req.durationMinutes < 30 || req.durationMinutes > 1440) {
      throw new OrderValidationError('durationMinutes must be an integer between 30 and 1440 (24 hours)');
    }
    durationMinutes = req.durationMinutes;
  }

  return {
    supplierId: req.supplierId.trim(),
    itemDescription,
    dropoffLocation,
    specialNotes,
    requesterContactNote,
    rewardCredits: req.rewardCredits,
    durationMinutes,
  };
}

// ---------------------------------------------------------------------------
// Extracted Domain Handlers
// ---------------------------------------------------------------------------

async function handleCreateOrder(
  deps: OrderServiceDependencies,
  requesterId: string,
  req: CreateOrderRequest
): Promise<OrderDTO> {
  const { repository, supplierClient } = deps;

  const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!UUID_REGEX.test(requesterId)) {
    throw new OrderValidationError('requesterId must be a valid UUID');
  }

  // 1. Input validations before any external call
  const validatedInput = validateCreateOrderRequest(req);

  // 2. Validate supplier
  const supplierLookup = await supplierClient.getSupplier(validatedInput.supplierId);
  if (supplierLookup.kind === 'not_found') {
    throw new OrderValidationError('Selected supplier does not exist or is invalid');
  }
  if (supplierLookup.kind === 'unavailable') {
    throw new OrderError('Supplier service is temporarily unavailable', 503);
  }
  if (!supplierLookup.supplier.isActive) {
    throw new OrderValidationError('Selected supplier is currently inactive');
  }
  const supplierName = supplierLookup.supplier.name;
  const campusZone = supplierLookup.supplier.campusZone || 'Campus';

  // 3. Persist PENDING order + order.reservation.requested outbox event atomically
  const orderId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + validatedInput.durationMinutes * 60 * 1000);
  const reservationEvent: CreditReservationRequestEvent = {
    eventId: orderId,
    correlationId: orderId,
    timestamp: new Date().toISOString(),
    eventType: 'order.reservation.requested',
    orderId,
    requesterId,
    rewardCredits: validatedInput.rewardCredits,
  };

  return repository.createOrderWithOutbox(
    {
      id: orderId,
      orderCode: generateOrderCode(),
      requesterId,
      supplierId: validatedInput.supplierId,
      supplierName,
      campusZone,
      itemDescription: validatedInput.itemDescription,
      specialNotes: validatedInput.specialNotes,
      dropoffLocation: validatedInput.dropoffLocation,
      requesterContactNote: validatedInput.requesterContactNote,
      rewardCredits: validatedInput.rewardCredits,
      expiresAt,
    },
    reservationEvent
  );
}

async function handleReservationResult(
  deps: OrderServiceDependencies,
  event: CreditReservationResultEvent
): Promise<OrderDTO> {
  const { repository } = deps;
  const result = await repository.applyReservationResult(event);
  return result.order;
}

async function handleAcceptOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  courierId: string,
  req?: AcceptOrderRequest,
  courierUsername?: string
): Promise<OrderDTO> {
  const { repository } = deps;

  const courierContactNote = validateOptionalText(req?.courierContactNote, 'courierContactNote', 255);

  const existing = await repository.findOrderById(orderId);
  if (!existing) {
    throw new OrderNotFoundError();
  }

  const event: OrderAcceptedEvent = {
    eventType: 'order.accepted',
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId: existing.id,
    orderCode: existing.orderCode,
    requesterId: existing.requesterId,
    courierId,
    ...(courierUsername !== undefined && { courierUsername }),
    ...v2(existing, { role: 'STUDENT', id: courierId }),
  };

  return repository.acceptOrder(existing.id, courierId, courierContactNote, event);
}

async function handlePickupOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  courierId: string,
  courierUsername?: string
): Promise<OrderDTO> {
  const { repository } = deps;

  const existing = await repository.findOrderById(orderId);
  if (!existing) {
    throw new OrderNotFoundError();
  }

  const event: OrderInTransitEvent = {
    eventType: 'order.in_transit',
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId: existing.id,
    orderCode: existing.orderCode,
    requesterId: existing.requesterId,
    courierId,
    ...(courierUsername !== undefined && { courierUsername }),
    ...v2(existing, { role: 'STUDENT', id: courierId }),
  };

  return repository.pickupOrder(existing.id, courierId, event);
}

async function handleDeliverOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  courierId: string,
  courierUsername?: string
): Promise<OrderDTO> {
  const { repository } = deps;

  const existing = await repository.findOrderById(orderId);
  if (!existing) {
    throw new OrderNotFoundError();
  }

  const event: OrderDeliveredEvent = {
    eventType: 'order.delivered',
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId: existing.id,
    orderCode: existing.orderCode,
    requesterId: existing.requesterId,
    courierId,
    ...(courierUsername !== undefined && { courierUsername }),
    ...v2(existing, { role: 'STUDENT', id: courierId }),
  };

  return repository.deliverOrder(existing.id, courierId, event);
}

async function handleCompleteOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  requesterId: string
): Promise<OrderDTO> {
  const { repository } = deps;

  const existing = await repository.findOrderById(orderId);
  if (!existing) {
    throw new OrderNotFoundError();
  }

  const event: OrderCompletedEvent = {
    eventType: 'order.completed',
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId: existing.id,
    orderCode: existing.orderCode,
    requesterId: existing.requesterId,
    courierId: existing.courierId ?? '',
    rewardCredits: existing.rewardCredits,
    ...v2(existing, { role: 'STUDENT', id: requesterId }, 'REQUESTER_CONFIRMED'),
  };

  return repository.completeOrder(existing.id, requesterId, event);
}

async function handleCancelOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  requesterId: string
): Promise<OrderDTO> {
  const { repository } = deps;

  const existing = await repository.findOrderById(orderId);
  if (!existing) {
    throw new OrderNotFoundError();
  }

  const event: OrderCancelledEvent = {
    eventType: 'order.cancelled',
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId: existing.id,
    orderCode: existing.orderCode,
    requesterId: existing.requesterId,
    rewardCredits: existing.rewardCredits,
    ...v2(existing, { role: 'STUDENT', id: requesterId }, 'REQUESTER_CANCELLED'),
  };

  return repository.cancelOrder(existing.id, requesterId, event);
}

async function handleUnassignOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  courierId: string
): Promise<OrderDTO> {
  const { repository } = deps;

  const existing = await repository.findOrderById(orderId);
  if (!existing) {
    throw new OrderNotFoundError();
  }

  const event: UnassignedDraft = {
    eventType: 'order.unassigned',
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId: existing.id,
    orderCode: existing.orderCode,
    requesterId: existing.requesterId,
    ...v2(existing, { role: 'STUDENT', id: courierId }, 'COURIER_DROPPED'),
    reasonCode: 'COURIER_DROPPED',
  };

  return repository.unassignOrder(existing.id, courierId, event);
}

async function handleAdminCancelOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  adminUserId: string,
  req: AdminCancelOrderRequest
): Promise<OrderDTO> {
  const { repository } = deps;
  const reason = validateRequiredText(req?.reason, 'reason', 500);

  const existing = await repository.findOrderById(orderId);
  if (!existing) {
    throw new OrderNotFoundError();
  }

  const event: OrderCancelledEvent = {
    eventType: 'order.cancelled',
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId: existing.id,
    orderCode: existing.orderCode,
    requesterId: existing.requesterId,
    rewardCredits: existing.rewardCredits,
    ...v2(existing, { role: 'ADMIN', id: adminUserId }, 'ADMIN_CANCELLED'),
  };

  return repository.adminCancelOrder(
    existing.id,
    adminUserId,
    reason,
    event,
    req?.expectedVersion
  );
}

async function handleAdminCompleteOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  adminUserId: string,
  req: AdminCompleteOrderRequest
): Promise<OrderDTO> {
  const { repository } = deps;
  const reason = validateRequiredText(req?.reason, 'reason', 500);

  const existing = await repository.findOrderById(orderId);
  if (!existing) {
    throw new OrderNotFoundError();
  }

  const event: OrderCompletedEvent = {
    eventType: 'order.completed',
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId: existing.id,
    orderCode: existing.orderCode,
    requesterId: existing.requesterId,
    courierId: existing.courierId ?? '',
    rewardCredits: existing.rewardCredits,
    ...v2(existing, { role: 'ADMIN', id: adminUserId }, 'ADMIN_CONFIRMED'),
  };

  return repository.adminCompleteOrder(
    existing.id,
    adminUserId,
    reason,
    event,
    req?.expectedVersion
  );
}

async function handleAdminUnassignOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  adminUserId: string,
  req: AdminUnassignOrderRequest
): Promise<OrderDTO> {
  const { repository } = deps;
  const reason = validateRequiredText(req?.reason, 'reason', 500);

  const existing = await repository.findOrderById(orderId);
  if (!existing) {
    throw new OrderNotFoundError();
  }

  const event: UnassignedDraft = {
    eventType: 'order.unassigned',
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId: existing.id,
    orderCode: existing.orderCode,
    requesterId: existing.requesterId,
    ...v2(existing, { role: 'ADMIN', id: adminUserId }, 'ADMIN_UNASSIGNED'),
    reasonCode: 'ADMIN_UNASSIGNED',
  };

  return repository.adminUnassignOrder(existing.id, adminUserId, reason, event, req?.expectedVersion);
}

// ---------------------------------------------------------------------------
// Lightweight Factory Function
// ---------------------------------------------------------------------------

export function createOrderService(deps: OrderServiceDependencies): OrderService {
  return {
    createOrder: (requesterId, req) => handleCreateOrder(deps, requesterId, req),
    handleReservationResult: (event) => handleReservationResult(deps, event),
    getOrderById: async (id) => {
      const order = await deps.repository.findOrderById(id);
      if (!order) {
        throw new OrderNotFoundError();
      }
      return order;
    },
    listOrders: (options) => deps.repository.listOrders(options),
    getUserActivity: (userId) => deps.repository.getUserActivity(userId),
    acceptOrder: (orderId, courierId, req, courierUsername) => handleAcceptOrder(deps, orderId, courierId, req, courierUsername),
    pickupOrder: (orderId, courierId, courierUsername) => handlePickupOrder(deps, orderId, courierId, courierUsername),
    deliverOrder: (orderId, courierId, courierUsername) => handleDeliverOrder(deps, orderId, courierId, courierUsername),
    completeOrder: (orderId, requesterId) => handleCompleteOrder(deps, orderId, requesterId),
    cancelOrder: (orderId, requesterId) => handleCancelOrder(deps, orderId, requesterId),
    unassignOrder: (orderId, courierId) => handleUnassignOrder(deps, orderId, courierId),
    adminCancelOrder: (orderId, adminUserId, req) =>
      handleAdminCancelOrder(deps, orderId, adminUserId, req),
    adminCompleteOrder: (orderId, adminUserId, req) =>
      handleAdminCompleteOrder(deps, orderId, adminUserId, req),
    adminUnassignOrder: (orderId, adminUserId, req) =>
      handleAdminUnassignOrder(deps, orderId, adminUserId, req),
  };
}
