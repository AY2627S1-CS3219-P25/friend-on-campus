/**
 * AI Assistance Disclosure:
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
  OrderAcceptedEvent,
  OrderCancelledEvent,
  OrderCompletedEvent,
  OrderDeliveredEvent,
  OrderDTO,
  OrderInTransitEvent,
  OrderSubmissionDTO,
} from '@campus-errand/common-dtos';
import crypto from 'node:crypto';
import type { SupplierClient } from '../clients/supplier.client';
import type { OutboxRelay } from '../messaging/outbox.relay';
import type { ListOrdersOptions, OrderRepository } from '../repositories/order.repository';
import { generateOrderCode, OrderError, OrderNotFoundError, OrderValidationError } from './order.types';
import type { ReservationSaga } from './reservation.saga';

export interface OrderService {
  createOrder(requesterId: string, req: CreateOrderRequest): Promise<OrderSubmissionDTO>;
  getSubmission(id: string, requesterId: string): Promise<OrderSubmissionDTO>;
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
  adminCancelOrder(orderId: string, adminUserId: string, req: AdminCancelOrderRequest): Promise<OrderDTO>;
  adminCompleteOrder(orderId: string, adminUserId: string, req: AdminCompleteOrderRequest): Promise<OrderDTO>;
  adminUnassignOrder(orderId: string, adminUserId: string, req: AdminUnassignOrderRequest): Promise<OrderDTO>;
}

export interface OrderServiceDependencies {
  repository: OrderRepository;
  reservationSaga: ReservationSaga;
  supplierClient: SupplierClient;
  outboxRelay?: OutboxRelay;
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

  if (typeof req.rewardCredits !== 'number' || !Number.isInteger(req.rewardCredits) || req.rewardCredits <= 0) {
    throw new OrderValidationError('rewardCredits must be a positive integer');
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
): Promise<OrderSubmissionDTO> {
  const { reservationSaga, supplierClient, outboxRelay } = deps;

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

  // Save only the submission/outbox. The credit result consumer creates the actual Order.
  const submission = await reservationSaga.submit({
    id: crypto.randomUUID(), orderCode: generateOrderCode(), requesterId,
    supplierId: validatedInput.supplierId, supplierName, campusZone,
    itemDescription: validatedInput.itemDescription, specialNotes: validatedInput.specialNotes,
    dropoffLocation: validatedInput.dropoffLocation, requesterContactNote: validatedInput.requesterContactNote,
    rewardCredits: validatedInput.rewardCredits,
    expiresAt: new Date(Date.now() + validatedInput.durationMinutes * 60 * 1000),
  });
  if (outboxRelay) void outboxRelay.trigger();
  return submission;
}

async function handleAcceptOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  courierId: string,
  req?: AcceptOrderRequest,
  courierUsername?: string
): Promise<OrderDTO> {
  const { repository, outboxRelay } = deps;

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
  };

  const accepted = await repository.acceptOrder(existing.id, courierId, courierContactNote, event);

  if (outboxRelay) {
    void outboxRelay.trigger();
  }

  return accepted;
}

async function handlePickupOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  courierId: string,
  courierUsername?: string
): Promise<OrderDTO> {
  const { repository, outboxRelay } = deps;

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
  };

  const inTransit = await repository.pickupOrder(existing.id, courierId, event);

  if (outboxRelay) {
    void outboxRelay.trigger();
  }

  return inTransit;
}

async function handleDeliverOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  courierId: string,
  courierUsername?: string
): Promise<OrderDTO> {
  const { repository, outboxRelay } = deps;

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
  };

  const delivered = await repository.deliverOrder(existing.id, courierId, event);

  if (outboxRelay) {
    void outboxRelay.trigger();
  }

  return delivered;
}

async function handleCompleteOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  requesterId: string
): Promise<OrderDTO> {
  const { repository, outboxRelay } = deps;

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
  };

  const completed = await repository.completeOrder(existing.id, requesterId, event);

  if (outboxRelay) {
    void outboxRelay.trigger();
  }

  return completed;
}

async function handleCancelOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  requesterId: string
): Promise<OrderDTO> {
  const { repository, outboxRelay } = deps;

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
  };

  const cancelled = await repository.cancelOrder(existing.id, requesterId, event);

  if (outboxRelay) {
    void outboxRelay.trigger();
  }

  return cancelled;
}

async function handleAdminCancelOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  adminUserId: string,
  req: AdminCancelOrderRequest
): Promise<OrderDTO> {
  const { repository, outboxRelay } = deps;
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
  };

  const cancelled = await repository.adminCancelOrder(
    existing.id,
    adminUserId,
    reason,
    event,
    req?.expectedVersion
  );

  if (outboxRelay) {
    void outboxRelay.trigger();
  }

  return cancelled;
}

async function handleAdminCompleteOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  adminUserId: string,
  req: AdminCompleteOrderRequest
): Promise<OrderDTO> {
  const { repository, outboxRelay } = deps;
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
  };

  const completed = await repository.adminCompleteOrder(
    existing.id,
    adminUserId,
    reason,
    event,
    req?.expectedVersion
  );

  if (outboxRelay) {
    void outboxRelay.trigger();
  }

  return completed;
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

  const unassigned = await repository.adminUnassignOrder(
    existing.id,
    adminUserId,
    reason,
    req?.expectedVersion
  );

  return unassigned;
}

// ---------------------------------------------------------------------------
// Lightweight Factory Function
// ---------------------------------------------------------------------------

export function createOrderService(deps: OrderServiceDependencies): OrderService {
  return {
    createOrder: (requesterId, req) => handleCreateOrder(deps, requesterId, req),
    getSubmission: (id, requesterId) => deps.reservationSaga.get(id, requesterId),
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
    adminCancelOrder: (orderId, adminUserId, req) =>
      handleAdminCancelOrder(deps, orderId, adminUserId, req),
    adminCompleteOrder: (orderId, adminUserId, req) =>
      handleAdminCompleteOrder(deps, orderId, adminUserId, req),
    adminUnassignOrder: (orderId, adminUserId, req) =>
      handleAdminUnassignOrder(deps, orderId, adminUserId, req),
  };
}
