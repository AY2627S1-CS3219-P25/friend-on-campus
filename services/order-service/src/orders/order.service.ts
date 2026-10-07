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
import { generateOrderCode, OrderNotFoundError, OrderValidationError } from './order.types';

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

function validateCreateOrderRequest(req: CreateOrderRequest): number {
  if (!req.supplierId || typeof req.supplierId !== 'string' || req.supplierId.trim() === '') {
    throw new OrderValidationError('supplierId is required');
  }
  if (!req.itemDescription || typeof req.itemDescription !== 'string' || req.itemDescription.trim() === '') {
    throw new OrderValidationError('itemDescription is required');
  }
  if (!req.dropoffLocation || typeof req.dropoffLocation !== 'string' || req.dropoffLocation.trim() === '') {
    throw new OrderValidationError('dropoffLocation is required');
  }
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

  return durationMinutes;
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

  // 1. Input validations
  const durationMinutes = validateCreateOrderRequest(req);

  // 2. Validate supplier
  let supplierName = 'Campus Spot';
  let campusZone = 'Campus';
  const supplier = await supplierClient.getSupplier(req.supplierId);
  if (supplier) {
    if (!supplier.isActive) {
      throw new OrderValidationError('Selected supplier is currently inactive');
    }
    supplierName = supplier.name;
    campusZone = supplier.campusZone || 'Campus';
  }

  // 3. Reserve credit escrow synchronously before order becomes OPEN
  const orderId = crypto.randomUUID();
  const orderCode = generateOrderCode();
  const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

  const reservation = await creditClient.reserveEscrow({
    orderId,
    requesterId,
    amount: req.rewardCredits,
  });

  if (!reservation.success) {
    throw new OrderValidationError(reservation.error || 'Failed to reserve escrow credits');
  }

  // 4. Create Order & Outbox event atomically
  const event: OrderCreatedEvent = {
    eventType: 'order.created',
    eventId: crypto.randomUUID(),
    timestamp: new Date().toISOString(),
    orderId,
    orderCode,
    requesterId,
    rewardCredits: req.rewardCredits,
    campusZone,
    expiresAt: expiresAt.toISOString(),
  };

  const created = await repository.createOrderWithOutbox({
    id: orderId,
    orderCode,
    requesterId,
    supplierId: req.supplierId,
    supplierName,
    campusZone,
    itemDescription: req.itemDescription.trim(),
    specialNotes: req.specialNotes?.trim() || undefined,
    dropoffLocation: req.dropoffLocation.trim(),
    requesterContactNote: req.requesterContactNote?.trim() || undefined,
    rewardCredits: req.rewardCredits,
    expiresAt,
  }, event);

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

  const accepted = await repository.acceptOrder(existing.id, courierId, req?.courierContactNote?.trim(), event);

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
