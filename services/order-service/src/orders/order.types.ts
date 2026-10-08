/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Domain types, custom errors, and DTO mappers for Order Service.
 * Author review: (to be completed by author after review)
 */
import { randomBytes } from 'node:crypto';
import type { OrderDTO, OrderStatus } from '@campus-errand/common-dtos';
import type { Order as PrismaOrder } from '../database/client';

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
