/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-19
 * Scope: Implemented Saga Approach B2 state transitions (PENDING -> OPEN / REJECTED / EXPIRED) directly in OrderRepository with Debezium CDC outbox metadata.
 * Author review: Reviewed and verified by yanhwee.
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Remove obsolete synchronous reservation compensation bookkeeping.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-11
 * Scope: Added adminCancelOrder, adminCompleteOrder, adminUnassignOrder with optimistic version checks and search options.
 * Author review: (to be completed by author after review)
 *
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Refactored persistence repository for Order Service using extracted domain handler functions and a lightweight factory function.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import type { CreditReservationResultEvent, OrderDTO } from '@campus-errand/common-dtos';
import crypto from 'node:crypto';
import type { PrismaClient } from '../database/client';
import type { OrderLifecycleEvent } from '../messaging/event.publisher';
import {
  OrderAuthorizationError,
  OrderNotFoundError,
  OrderStateConflictError,
  OrderValidationError,
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
  search?: string;
  page?: number;
  limit?: number;
  viewerId?: string;
  isAdmin?: boolean;
}

export interface OrderRepository {
  createOrderWithOutbox(data: CreateOrderParams, event: OrderLifecycleEvent): Promise<OrderDTO>;
  applyReservationResult(event: CreditReservationResultEvent): Promise<{ order: OrderDTO; outboxEvent?: OrderLifecycleEvent }>;
  findOrderById(id: string): Promise<OrderDTO | null>;
  listOrders(options: ListOrdersOptions): Promise<{ orders: OrderDTO[]; total: number }>;
  getUserActivity(userId: string): Promise<{ requested: OrderDTO[]; delivering: OrderDTO[]; history: OrderDTO[] }>;
  acceptOrder(orderId: string, courierId: string, courierContactNote: string | undefined, event: OrderLifecycleEvent): Promise<OrderDTO>;
  pickupOrder(orderId: string, courierId: string, event: OrderLifecycleEvent): Promise<OrderDTO>;
  deliverOrder(orderId: string, courierId: string, event: OrderLifecycleEvent): Promise<OrderDTO>;
  completeOrder(orderId: string, requesterId: string, event: OrderLifecycleEvent): Promise<OrderDTO>;
  cancelOrder(orderId: string, requesterId: string, event: OrderLifecycleEvent): Promise<OrderDTO>;
  adminCancelOrder(orderId: string, adminUserId: string, reason: string, event: OrderLifecycleEvent, expectedVersion?: number): Promise<OrderDTO>;
  adminCompleteOrder(orderId: string, adminUserId: string, reason: string, event: OrderLifecycleEvent, expectedVersion?: number): Promise<OrderDTO>;
  adminUnassignOrder(orderId: string, adminUserId: string, reason: string, expectedVersion?: number): Promise<OrderDTO>;
  expireDueOrders(now: Date): Promise<number>;
}

// ---------------------------------------------------------------------------
// Extracted Repository Handlers
// ---------------------------------------------------------------------------

async function handleCreateOrderWithOutbox(
  prisma: PrismaClient,
  data: CreateOrderParams,
  event: OrderLifecycleEvent
): Promise<OrderDTO> {
  const initialStatus = event.eventType === 'order.reservation.requested' ? 'PENDING' : 'OPEN';
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
        status: initialStatus,
        expiresAt: data.expiresAt,
        version: 1,
      },
    });

    await tx.outboxEvent.create({
      data: {
        id: event.eventId,
        aggregateType: 'order',
        aggregateId: order.id,
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
      },
    });

    return order;
  });

  return toOrderDTO(created);
}

async function handleApplyReservationResult(
  prisma: PrismaClient,
  event: CreditReservationResultEvent
): Promise<{ order: OrderDTO; outboxEvent?: OrderLifecycleEvent }> {
  return await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${event.orderId}::uuid FOR UPDATE`;
    const order = await tx.order.findUnique({ where: { id: event.orderId } });
    if (!order) {
      throw new OrderValidationError('Unknown reservation order');
    }

    if (order.requesterId !== event.requesterId || order.rewardCredits !== event.rewardCredits) {
      throw new OrderValidationError('Reservation result does not match order');
    }

    // Idempotent no-op for duplicate/replayed reservation results
    if (order.status !== 'PENDING') {
      return { order: toOrderDTO(order) };
    }

    if (event.eventType === 'credit.reservation.failed') {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'REJECTED',
          rejectionReason: event.reason ?? 'Credit reservation failed',
          version: { increment: 1 },
        },
      });
      return { order: toOrderDTO(updated) };
    }

    // credit.reservation.succeeded
    if (order.expiresAt.getTime() <= Date.now()) {
      const expiredEvent: OrderLifecycleEvent = {
        eventId: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        eventType: 'order.expired',
        orderId: order.id,
        orderCode: order.orderCode,
        requesterId: order.requesterId,
        rewardCredits: order.rewardCredits,
      };

      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'EXPIRED',
          version: { increment: 1 },
        },
      });

      await tx.outboxEvent.create({
        data: {
          id: expiredEvent.eventId,
          aggregateType: 'order',
          aggregateId: order.id,
          eventType: expiredEvent.eventType,
          payload: JSON.stringify(expiredEvent),
          status: 'PENDING',
        },
      });

      return { order: toOrderDTO(updated), outboxEvent: expiredEvent };
    }

    const createdEvent: OrderLifecycleEvent = {
      eventId: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      eventType: 'order.created',
      orderId: order.id,
      orderCode: order.orderCode,
      requesterId: order.requesterId,
      rewardCredits: order.rewardCredits,
      campusZone: order.campusZone ?? 'Campus',
      expiresAt: order.expiresAt.toISOString(),
    };

    const updated = await tx.order.update({
      where: { id: order.id },
      data: {
        status: 'OPEN',
        version: { increment: 1 },
      },
    });

    await tx.outboxEvent.create({
      data: {
        id: createdEvent.eventId,
        aggregateType: 'order',
        aggregateId: order.id,
        eventType: createdEvent.eventType,
        payload: JSON.stringify(createdEvent),
        status: 'PENDING',
      },
    });

    return { order: toOrderDTO(updated), outboxEvent: createdEvent };
  });
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
  const { status, campusZone, search, page = 1, limit = 50, viewerId, isAdmin } = options;
  const skip = Math.max(0, (page - 1) * limit);

  const where: Record<string, any> = {};
  const normalizedStatus = status ? status.toUpperCase() : 'OPEN';

  if (normalizedStatus === 'OPEN') {
    where.status = 'OPEN';
    where.expiresAt = { gt: new Date() };
  } else if (normalizedStatus !== 'ALL') {
    where.status = normalizedStatus;
    if (!isAdmin && viewerId && (normalizedStatus === 'PENDING' || normalizedStatus === 'REJECTED')) {
      where.requesterId = viewerId;
    }
  } else if (!isAdmin && viewerId) {
    where.AND = [
      {
        OR: [
          { status: { notIn: ['PENDING', 'REJECTED'] } },
          { requesterId: viewerId },
        ],
      },
    ];
  }

  if (campusZone && campusZone.trim() !== '') {
    where.campusZone = { equals: campusZone.trim(), mode: 'insensitive' };
  }

  if (search && search.trim() !== '') {
    const term = search.trim();
    where.OR = [
      { orderCode: { contains: term, mode: 'insensitive' } },
      { itemDescription: { contains: term, mode: 'insensitive' } },
      { dropoffLocation: { contains: term, mode: 'insensitive' } },
      { supplierName: { contains: term, mode: 'insensitive' } },
    ];
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
      if (['COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(order.status) || isExpired) {
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
        id: event.eventId,
        aggregateType: 'order',
        aggregateId: orderId,
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
        id: event.eventId,
        aggregateType: 'order',
        aggregateId: orderId,
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
        id: event.eventId,
        aggregateType: 'order',
        aggregateId: orderId,
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
        id: event.eventId,
        aggregateType: 'order',
        aggregateId: orderId,
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

    if (order.status === 'PENDING') {
      throw new OrderStateConflictError('Cannot cancel an errand while credit reservation is still pending');
    }

    if (['IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(order.status)) {
      throw new OrderStateConflictError('Cannot cancel an errand that has already been picked up or completed');
    }

    if (['CANCELLED', 'EXPIRED', 'REJECTED'].includes(order.status)) {
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
        id: event.eventId,
        aggregateType: 'order',
        aggregateId: orderId,
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
      },
    });

    const refreshed = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    return toOrderDTO(refreshed);
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
              id: event.eventId,
              aggregateType: 'order',
              aggregateId: candidate.id,
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

async function handleAdminCancelOrder(
  prisma: PrismaClient,
  orderId: string,
  adminUserId: string,
  reason: string,
  event: OrderLifecycleEvent,
  expectedVersion?: number
): Promise<OrderDTO> {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new OrderNotFoundError();
    }

    if (order.status === 'PENDING') {
      throw new OrderStateConflictError('Cannot cancel an errand while credit reservation is still pending');
    }

    if (['COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(order.status)) {
      throw new OrderStateConflictError(`Errand is already in terminal state ${order.status}`);
    }

    if (expectedVersion !== undefined && order.version !== expectedVersion) {
      throw new OrderStateConflictError(
        `Order was modified concurrently (expected version ${expectedVersion}, got ${order.version})`
      );
    }

    const noteTag = `[Admin Cancel by ${adminUserId}: ${reason}]`;
    const updatedNotes = order.specialNotes ? `${order.specialNotes} | ${noteTag}` : noteTag;

    const updatedResult = await tx.order.updateMany({
      where: {
        id: orderId,
        status: order.status,
        version: order.version,
      },
      data: {
        status: 'CANCELLED',
        specialNotes: updatedNotes,
        version: { increment: 1 },
      },
    });

    if (updatedResult.count === 0) {
      throw new OrderStateConflictError('Errand was modified concurrently');
    }

    await tx.outboxEvent.create({
      data: {
        id: event.eventId,
        aggregateType: 'order',
        aggregateId: orderId,
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
      },
    });

    const refreshed = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    return toOrderDTO(refreshed);
  });
}

async function handleAdminCompleteOrder(
  prisma: PrismaClient,
  orderId: string,
  adminUserId: string,
  reason: string,
  event: OrderLifecycleEvent,
  expectedVersion?: number
): Promise<OrderDTO> {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new OrderNotFoundError();
    }

    if (order.status !== 'DELIVERED') {
      throw new OrderStateConflictError(
        `Cannot complete errand from status ${order.status}. Errand must be DELIVERED first.`
      );
    }

    if (expectedVersion !== undefined && order.version !== expectedVersion) {
      throw new OrderStateConflictError(
        `Order was modified concurrently (expected version ${expectedVersion}, got ${order.version})`
      );
    }

    const noteTag = `[Admin Force-Complete by ${adminUserId}: ${reason}]`;
    const updatedNotes = order.specialNotes ? `${order.specialNotes} | ${noteTag}` : noteTag;

    const updatedResult = await tx.order.updateMany({
      where: {
        id: orderId,
        status: 'DELIVERED',
        version: order.version,
      },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
        specialNotes: updatedNotes,
        version: { increment: 1 },
      },
    });

    if (updatedResult.count === 0) {
      throw new OrderStateConflictError('Errand was modified concurrently');
    }

    await tx.outboxEvent.create({
      data: {
        id: event.eventId,
        aggregateType: 'order',
        aggregateId: orderId,
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
      },
    });

    const refreshed = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    return toOrderDTO(refreshed);
  });
}

async function handleAdminUnassignOrder(
  prisma: PrismaClient,
  orderId: string,
  adminUserId: string,
  reason: string,
  expectedVersion?: number
): Promise<OrderDTO> {
  return await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId } });
    if (!order) {
      throw new OrderNotFoundError();
    }

    if (order.status !== 'ACCEPTED') {
      throw new OrderStateConflictError(
        `Cannot unassign courier from status ${order.status}. Errand must be in ACCEPTED state.`
      );
    }

    if (expectedVersion !== undefined && order.version !== expectedVersion) {
      throw new OrderStateConflictError(
        `Order was modified concurrently (expected version ${expectedVersion}, got ${order.version})`
      );
    }

    const noteTag = `[Admin Courier Unassign by ${adminUserId}: ${reason}]`;
    const updatedNotes = order.specialNotes ? `${order.specialNotes} | ${noteTag}` : noteTag;

    const updatedResult = await tx.order.updateMany({
      where: {
        id: orderId,
        status: 'ACCEPTED',
        version: order.version,
      },
      data: {
        status: 'OPEN',
        courierId: null,
        acceptedAt: null,
        courierContactNote: null,
        specialNotes: updatedNotes,
        version: { increment: 1 },
      },
    });

    if (updatedResult.count === 0) {
      throw new OrderStateConflictError('Errand was modified concurrently');
    }

    const refreshed = await tx.order.findUniqueOrThrow({ where: { id: orderId } });
    return toOrderDTO(refreshed);
  });
}

// ---------------------------------------------------------------------------
// Lightweight Factory Function
// ---------------------------------------------------------------------------

export function createOrderRepository(prisma: PrismaClient): OrderRepository {
  return {
    createOrderWithOutbox: (data, event) => handleCreateOrderWithOutbox(prisma, data, event),
    applyReservationResult: (event) => handleApplyReservationResult(prisma, event),
    findOrderById: (id) => handleFindOrderById(prisma, id),
    listOrders: (options) => handleListOrders(prisma, options),
    getUserActivity: (userId) => handleGetUserActivity(prisma, userId),
    acceptOrder: (orderId, courierId, note, event) =>
      handleAcceptOrder(prisma, orderId, courierId, note, event),
    pickupOrder: (orderId, courierId, event) => handlePickupOrder(prisma, orderId, courierId, event),
    deliverOrder: (orderId, courierId, event) => handleDeliverOrder(prisma, orderId, courierId, event),
    completeOrder: (orderId, requesterId, event) => handleCompleteOrder(prisma, orderId, requesterId, event),
    cancelOrder: (orderId, requesterId, event) => handleCancelOrder(prisma, orderId, requesterId, event),
    adminCancelOrder: (orderId, adminUserId, reason, event, expectedVersion) =>
      handleAdminCancelOrder(prisma, orderId, adminUserId, reason, event, expectedVersion),
    adminCompleteOrder: (orderId, adminUserId, reason, event, expectedVersion) =>
      handleAdminCompleteOrder(prisma, orderId, adminUserId, reason, event, expectedVersion),
    adminUnassignOrder: (orderId, adminUserId, reason, expectedVersion) =>
      handleAdminUnassignOrder(prisma, orderId, adminUserId, reason, expectedVersion),
    expireDueOrders: (now) => handleExpireDueOrders(prisma, now),
  };
}
