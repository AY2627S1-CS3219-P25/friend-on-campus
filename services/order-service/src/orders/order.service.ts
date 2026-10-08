/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Refactored Order Service orchestrator into modular, extracted domain handler functions and a lightweight factory function.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import crypto from 'node:crypto';
import type {
  AcceptOrderRequest,
  CreateOrderRequest,
  OrderAcceptedEvent,
  OrderCancelledEvent,
  OrderCompletedEvent,
  OrderCreatedEvent,
  OrderDTO,
  OrderDeliveredEvent,
  OrderInTransitEvent,
} from '@campus-errand/common-dtos';
import type { CreditClient } from '../clients/credit.client';
import type { SupplierClient } from '../clients/supplier.client';
import type { ListOrdersOptions, OrderRepository } from '../repositories/order.repository';
import type { OutboxRelay } from '../messaging/outbox.relay';
import { generateOrderCode, OrderError, OrderNotFoundError, OrderValidationError } from './order.types';

export interface OrderService {
  createOrder(requesterId: string, req: CreateOrderRequest): Promise<OrderDTO>;
  getOrderById(id: string): Promise<OrderDTO>;
  listOrders(options: ListOrdersOptions): Promise<{ orders: OrderDTO[]; total: number }>;
  getUserActivity(userId: string): Promise<{ requested: OrderDTO[]; delivering: OrderDTO[]; history: OrderDTO[] }>;
  acceptOrder(orderId: string, courierId: string, req?: AcceptOrderRequest): Promise<OrderDTO>;
  pickupOrder(orderId: string, courierId: string): Promise<OrderDTO>;
  deliverOrder(orderId: string, courierId: string): Promise<OrderDTO>;
  completeOrder(orderId: string, requesterId: string): Promise<OrderDTO>;
  cancelOrder(orderId: string, requesterId: string): Promise<OrderDTO>;
}

export interface OrderServiceDependencies {
  repository: OrderRepository;
  creditClient: CreditClient;
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
): Promise<OrderDTO> {
  const { repository, creditClient, supplierClient, outboxRelay } = deps;

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

  // 3. Reserve credit escrow synchronously before order becomes OPEN
  const orderId = crypto.randomUUID();
  const orderCode = generateOrderCode();
  const expiresAt = new Date(Date.now() + validatedInput.durationMinutes * 60 * 1000);

  const reservation = await creditClient.reserveEscrow({
    orderId,
    requesterId,
    amount: validatedInput.rewardCredits,
  });

  if (!reservation.success) {
    throw new OrderValidationError(reservation.error || 'Failed to reserve escrow credits');
  }

  // 4. Create Order & Outbox event atomically with compensation
  const event: OrderCreatedEvent = {
    eventType: 'order.created',
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId,
    orderCode,
    requesterId,
    rewardCredits: validatedInput.rewardCredits,
    campusZone,
    expiresAt: expiresAt.toISOString(),
  };

  let created: OrderDTO;
  try {
    created = await repository.createOrderWithOutbox({
      id: orderId,
      orderCode,
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
    }, event);
  } catch (insertErr) {
    console.error('[create_order_failed_after_escrow_hold] Recording compensating cancellation refund outbox event', {
      orderId,
      requesterId,
      insertErr,
    });

    let refundRecorded = false;
    const maxRetries = 5;
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        await repository.recordCompensatingRefund(orderId, requesterId, validatedInput.rewardCredits);
        refundRecorded = true;
        break;
      } catch (refundErr) {
        if (attempt === maxRetries) {
          console.error('[compensating_refund_lost]', {
            orderId,
            requesterId,
            amount: validatedInput.rewardCredits,
            error: refundErr,
          });
        } else {
          await new Promise((resolve) => setTimeout(resolve, 50 * attempt));
        }
      }
    }

    if (refundRecorded && outboxRelay) {
      void outboxRelay.trigger();
    }
    throw insertErr;
  }

  if (outboxRelay) {
    void outboxRelay.trigger();
  }

  return created;
}

async function handleAcceptOrder(
  deps: OrderServiceDependencies,
  orderId: string,
  courierId: string,
  req?: AcceptOrderRequest
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
  courierId: string
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
  courierId: string
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

// ---------------------------------------------------------------------------
// Lightweight Factory Function
// ---------------------------------------------------------------------------

export function createOrderService(deps: OrderServiceDependencies): OrderService {
  return {
    createOrder: (requesterId, req) => handleCreateOrder(deps, requesterId, req),
    getOrderById: async (id) => {
      const order = await deps.repository.findOrderById(id);
      if (!order) {
        throw new OrderNotFoundError();
      }
      return order;
    },
    listOrders: (options) => deps.repository.listOrders(options),
    getUserActivity: (userId) => deps.repository.getUserActivity(userId),
    acceptOrder: (orderId, courierId, req) => handleAcceptOrder(deps, orderId, courierId, req),
    pickupOrder: (orderId, courierId) => handlePickupOrder(deps, orderId, courierId),
    deliverOrder: (orderId, courierId) => handleDeliverOrder(deps, orderId, courierId),
    completeOrder: (orderId, requesterId) => handleCompleteOrder(deps, orderId, requesterId),
    cancelOrder: (orderId, requesterId) => handleCancelOrder(deps, orderId, requesterId),
  };
}
