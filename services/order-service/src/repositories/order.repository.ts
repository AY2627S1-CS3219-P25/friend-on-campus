/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Refactored persistence repository for Order Service using extracted domain handler functions and a lightweight factory function.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import crypto from 'node:crypto';
import type { OrderDTO } from '@campus-errand/common-dtos';
import type { PrismaClient } from '../database/client';
import type { OrderLifecycleEvent } from '../messaging/event.publisher';
import {
  OrderAuthorizationError,
  OrderNotFoundError,
  OrderStateConflictError,
  SelfAcceptForbiddenError,
  toOrderDTO,
} from '../orders/order.types';

export interface CreateOrderParams {
  id?: string;
  orderCode: string;
  requesterId: string;
  supplierId: string;
  supplierName?: string;
  campusZone?: string;
  itemDescription: string;
  specialNotes?: string;
  dropoffLocation: string;
  requesterContactNote?: string;
  rewardCredits: number;
  expiresAt: Date;
}

export interface ListOrdersOptions {
  status?: string;
  campusZone?: string;
  page?: number;
  limit?: number;
}

export interface OrderRepository {
  createOrderWithOutbox(data: CreateOrderParams, event: OrderLifecycleEvent): Promise<OrderDTO>;
  findOrderById(id: string): Promise<OrderDTO | null>;
  listOrders(options: ListOrdersOptions): Promise<{ orders: OrderDTO[]; total: number }>;
  getUserActivity(userId: string): Promise<{ requested: OrderDTO[]; delivering: OrderDTO[]; history: OrderDTO[] }>;
  acceptOrder(orderId: string, courierId: string, courierContactNote: string | undefined, event: OrderLifecycleEvent): Promise<OrderDTO>;
  pickupOrder(orderId: string, courierId: string, event: OrderLifecycleEvent): Promise<OrderDTO>;
  deliverOrder(orderId: string, courierId: string, event: OrderLifecycleEvent): Promise<OrderDTO>;
  completeOrder(orderId: string, requesterId: string, event: OrderLifecycleEvent): Promise<OrderDTO>;
  cancelOrder(orderId: string, requesterId: string, event: OrderLifecycleEvent): Promise<OrderDTO>;
  expireDueOrders(now: Date): Promise<number>;
  recordCompensatingRefund(orderId: string, requesterId: string, rewardCredits: number): Promise<void>;
}

// ---------------------------------------------------------------------------
// Extracted Repository Handlers
// ---------------------------------------------------------------------------

async function handleCreateOrderWithOutbox(
  prisma: PrismaClient,
  data: CreateOrderParams,
  event: OrderLifecycleEvent
): Promise<OrderDTO> {
  const created = await prisma.$transaction(async (tx) => {
    const order = await tx.order.create({
      data: {
        id: data.id,
        orderCode: data.orderCode,
        requesterId: data.requesterId,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        campusZone: data.campusZone,
        itemDescription: data.itemDescription,
        specialNotes: data.specialNotes,
        dropoffLocation: data.dropoffLocation,
        requesterContactNote: data.requesterContactNote,
        rewardCredits: data.rewardCredits,
        status: 'OPEN',
        expiresAt: data.expiresAt,
        version: 1,
      },
    });

    await tx.outboxEvent.create({
      data: {
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
      },
    });

    return order;
  });

  return toOrderDTO(created);
}

async function handleFindOrderById(
  prisma: PrismaClient,
  id: string
): Promise<OrderDTO | null> {
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
  const order = isUuid
    ? await prisma.order.findUnique({ where: { id } })
    : await prisma.order.findUnique({ where: { orderCode: id } });

  if (!order) return null;
  return toOrderDTO(order);
}

async function handleListOrders(
  prisma: PrismaClient,
  options: ListOrdersOptions
): Promise<{ orders: OrderDTO[]; total: number }> {
  const { status, campusZone, page = 1, limit = 50 } = options;
  const skip = Math.max(0, (page - 1) * limit);

  const where: Record<string, any> = {};

  if (!status || status.toUpperCase() === 'OPEN') {
    where.status = 'OPEN';
    where.expiresAt = { gt: new Date() };
  } else if (status.toUpperCase() !== 'ALL') {
    where.status = status.toUpperCase();
  }

  if (campusZone && campusZone.trim() !== '') {
    where.campusZone = { equals: campusZone.trim(), mode: 'insensitive' };
  }

  const [orders, total] = await Promise.all([
    prisma.order.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      skip,
      take: Math.min(limit, 100),
    }),
    prisma.order.count({ where }),
  ]);

  return {
    orders: orders.map(toOrderDTO),
    total,
  };
}

async function handleGetUserActivity(
  prisma: PrismaClient,
  userId: string
): Promise<{ requested: OrderDTO[]; delivering: OrderDTO[]; history: OrderDTO[] }> {
  const now = new Date();
  const allUserOrders = await prisma.order.findMany({
    where: {
      OR: [
        { requesterId: userId },
        { courierId: userId },
      ],
    },
    orderBy: { createdAt: 'desc' },
  });

  const requested: OrderDTO[] = [];
  const delivering: OrderDTO[] = [];
  const history: OrderDTO[] = [];

  for (const order of allUserOrders) {
    const dto = toOrderDTO(order);
    const isExpired = order.status === 'OPEN' && order.expiresAt <= now;

    if (order.requesterId === userId) {
      if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(order.status) || isExpired) {
        history.push(dto);
      } else {
        requested.push(dto);
      }
    }

    if (order.courierId === userId) {
      if (['ACCEPTED', 'IN_TRANSIT', 'DELIVERED'].includes(order.status)) {
        delivering.push(dto);
      } else if (order.status === 'COMPLETED') {
        // Already in history if user was also requester, otherwise add
        if (!history.some((h) => h.id === dto.id)) {
          history.push(dto);
        }
      }
    }
  }

  return { requested, delivering, history };
}

async function handleAcceptOrder(
  prisma: PrismaClient,
  orderId: string,
  courierId: string,
  courierContactNote: string | undefined,
  event: OrderLifecycleEvent
): Promise<OrderDTO> {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new OrderNotFoundError();
    }

    if (order.requesterId === courierId) {
      throw new SelfAcceptForbiddenError();
    }

    if (order.status !== 'OPEN') {
      throw new OrderStateConflictError('Order has already been claimed or is no longer open');
    }

    if (order.expiresAt <= new Date()) {
      throw new OrderStateConflictError('Order has expired and can no longer be accepted');
    }

    // Single-winner atomic update with optimistic version check
    const updatedCount = await tx.order.updateMany({
      where: {
        id: orderId,
        status: 'OPEN',
        version: order.version,
      },
      data: {
        status: 'ACCEPTED',
        courierId: courierId,
        courierContactNote: courierContactNote || null,
        acceptedAt: new Date(),
        version: { increment: 1 },
      },
    });

    if (updatedCount.count === 0) {
      throw new OrderStateConflictError('Order was claimed by another courier concurrently');
    }

    await tx.outboxEvent.create({
      data: {
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
      },
    });

    const refreshed = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    return toOrderDTO(refreshed);
  });
}

async function handlePickupOrder(
  prisma: PrismaClient,
  orderId: string,
  courierId: string,
  event: OrderLifecycleEvent
): Promise<OrderDTO> {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new OrderNotFoundError();
    }

    if (order.courierId !== courierId) {
      throw new OrderAuthorizationError('Only the assigned courier can mark this errand as picked up');
    }

    if (order.status !== 'ACCEPTED') {
      throw new OrderStateConflictError(`Cannot mark errand as picked up from status ${order.status}`);
    }

    const updatedResult = await tx.order.updateMany({
      where: {
        id: orderId,
        status: 'ACCEPTED',
        version: order.version,
        courierId,
      },
      data: {
        status: 'IN_TRANSIT',
        pickedUpAt: new Date(),
        version: { increment: 1 },
      },
    });

    if (updatedResult.count === 0) {
      throw new OrderStateConflictError('Errand was modified concurrently');
    }

    await tx.outboxEvent.create({
      data: {
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
      },
    });

    const refreshed = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    return toOrderDTO(refreshed);
  });
}

async function handleDeliverOrder(
  prisma: PrismaClient,
  orderId: string,
  courierId: string,
  event: OrderLifecycleEvent
): Promise<OrderDTO> {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new OrderNotFoundError();
    }

    if (order.courierId !== courierId) {
      throw new OrderAuthorizationError('Only the assigned courier can mark this errand as delivered');
    }

    if (order.status !== 'IN_TRANSIT') {
      throw new OrderStateConflictError(`Cannot mark errand as delivered from status ${order.status}`);
    }

    const updatedResult = await tx.order.updateMany({
      where: {
        id: orderId,
        status: 'IN_TRANSIT',
        version: order.version,
        courierId,
      },
      data: {
        status: 'DELIVERED',
        deliveredAt: new Date(),
        version: { increment: 1 },
      },
    });

    if (updatedResult.count === 0) {
      throw new OrderStateConflictError('Errand was modified concurrently');
    }

    await tx.outboxEvent.create({
      data: {
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
      },
    });

    const refreshed = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    return toOrderDTO(refreshed);
  });
}

async function handleCompleteOrder(
  prisma: PrismaClient,
  orderId: string,
  requesterId: string,
  event: OrderLifecycleEvent
): Promise<OrderDTO> {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new OrderNotFoundError();
    }

    if (order.requesterId !== requesterId) {
      throw new OrderAuthorizationError('Only the requester can confirm delivery and complete this errand');
    }

    if (order.status !== 'DELIVERED') {
      throw new OrderStateConflictError(`Cannot complete errand from status ${order.status}. Errand must be DELIVERED first.`);
    }

    const updatedResult = await tx.order.updateMany({
      where: {
        id: orderId,
        status: 'DELIVERED',
        version: order.version,
        requesterId,
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        version: { increment: 1 },
      },
    });

    if (updatedResult.count === 0) {
      throw new OrderStateConflictError('Errand was modified concurrently');
    }

    await tx.outboxEvent.create({
      data: {
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
      },
    });

    const refreshed = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    return toOrderDTO(refreshed);
  });
}

async function handleCancelOrder(
  prisma: PrismaClient,
  orderId: string,
  requesterId: string,
  event: OrderLifecycleEvent
): Promise<OrderDTO> {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new OrderNotFoundError();
    }

    if (order.requesterId !== requesterId) {
      throw new OrderAuthorizationError('Only the requester can cancel this errand');
    }

    if (['IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(order.status)) {
      throw new OrderStateConflictError('Cannot cancel an errand that has already been picked up or completed');
    }

    if (['CANCELLED', 'EXPIRED'].includes(order.status)) {
      throw new OrderStateConflictError(`Errand is already in terminal state ${order.status}`);
    }

    const updatedResult = await tx.order.updateMany({
      where: {
        id: orderId,
        status: order.status,
        version: order.version,
        requesterId,
      },
      data: {
        status: 'CANCELLED',
        courierId: null, // unassign courier if was accepted
        version: { increment: 1 },
      },
    });

    if (updatedResult.count === 0) {
      throw new OrderStateConflictError('Errand was modified concurrently');
    }

    await tx.outboxEvent.create({
      data: {
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
      },
    });

    const refreshed = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    return toOrderDTO(refreshed);
  });
}

async function handleRecordCompensatingRefund(
  prisma: PrismaClient,
  orderId: string,
  requesterId: string,
  rewardCredits: number
): Promise<void> {
  const event = {
    eventId: crypto.randomUUID(),
    eventType: 'order.cancelled',
    timestamp: new Date().toISOString(),
    orderId,
    requesterId,
    rewardCredits,
  };
  await prisma.outboxEvent.create({
    data: {
      eventType: 'order.cancelled',
      payload: JSON.stringify(event),
      status: 'PENDING',
    },
  });
}

async function handleExpireDueOrders(
  prisma: PrismaClient,
  now: Date
): Promise<number> {
  const expiredCandidates = await prisma.order.findMany({
    where: {
      status: 'OPEN',
      expiresAt: { lte: now },
    },
    take: 50,
  });

  let count = 0;
  for (const candidate of expiredCandidates) {
    try {
      await prisma.$transaction(async (tx) => {
        const updated = await tx.order.updateMany({
          where: {
            id: candidate.id,
            status: 'OPEN',
          },
          data: {
            status: 'EXPIRED',
            version: { increment: 1 },
          },
        });

        if (updated.count > 0) {
          const event: OrderLifecycleEvent = {
            eventType: 'order.expired',
            eventId: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
            orderId: candidate.id,
            orderCode: candidate.orderCode,
            requesterId: candidate.requesterId,
            rewardCredits: candidate.rewardCredits,
          };

          await tx.outboxEvent.create({
            data: {
              eventType: event.eventType,
              payload: JSON.stringify(event),
              status: 'PENDING',
            },
          });
          count++;
        }
      });
    } catch (err) {
      console.error(`[expire_due_orders] Failed to expire order ${candidate.id}:`, err);
    }
  }

  return count;
}

// ---------------------------------------------------------------------------
// Lightweight Factory Function
// ---------------------------------------------------------------------------

export function createOrderRepository(prisma: PrismaClient): OrderRepository {
  return {
    createOrderWithOutbox: (data, event) => handleCreateOrderWithOutbox(prisma, data, event),
    findOrderById: (id) => handleFindOrderById(prisma, id),
    listOrders: (options) => handleListOrders(prisma, options),
    getUserActivity: (userId) => handleGetUserActivity(prisma, userId),
    acceptOrder: (orderId, courierId, note, event) =>
      handleAcceptOrder(prisma, orderId, courierId, note, event),
    pickupOrder: (orderId, courierId, event) => handlePickupOrder(prisma, orderId, courierId, event),
    deliverOrder: (orderId, courierId, event) => handleDeliverOrder(prisma, orderId, courierId, event),
    completeOrder: (orderId, requesterId, event) => handleCompleteOrder(prisma, orderId, requesterId, event),
    cancelOrder: (orderId, requesterId, event) => handleCancelOrder(prisma, orderId, requesterId, event),
    expireDueOrders: (now) => handleExpireDueOrders(prisma, now),
    recordCompensatingRefund: (orderId, requesterId, rewardCredits) =>
      handleRecordCompensatingRefund(prisma, orderId, requesterId, rewardCredits),
  };
}
