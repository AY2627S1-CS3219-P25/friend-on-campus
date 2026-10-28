/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Fake repository mirrors the version-2 outbox facts of the real one: payloads completed with completeEvent(),
 * order.rejected on a failed reservation, order.unassigned on both unassignment paths, SYSTEM actor on created/expired.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Preserved courierId on cancelOrder and added unassignOrder to fake repository to mirror OrderRepository.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-21
 * Scope: Included admin-cancelled courier orders in fake repository getUserActivity history to mirror OrderRepository.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Replace synchronous Credit fakes with reservation submission and confirmation fixtures.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-11
 * Scope: Added adminCancelOrder, adminCompleteOrder, adminUnassignOrder, and search filtering to fake repository.
 * Author review: (to be completed by author after review)
 *
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: In-memory repository fakes, mock clients, and HTTP test server helpers for Order Service unit/integration testing.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by huangjiaxi1111)
// AI-generated (edited by yanhwee)
import { generateKeyPairSync } from 'node:crypto';
import type { Express } from 'express';
import type { AddressInfo } from 'node:net';
import type { CreditReservationResultEvent, OrderCreatedEvent, OrderDTO, OrderExpiredEvent } from '@campus-errand/common-dtos';
import type { CreateOrderParams, ListOrdersOptions, OrderRepository } from '../src/repositories/order.repository';
import type { SupplierClient, SupplierDetails } from '../src/clients/supplier.client';
import {
  completeEvent,
  OrderNotFoundError,
  OrderAuthorizationError,
  type OrderEventDraft,
  type OrderLifecycleEvent,
  OrderStateConflictError,
  SelfAcceptForbiddenError,
} from '../src/orders/order.types';

// AI-generated (edited by Reallyeasy1)
const systemActor = (orderId: string) =>
  ({ schemaVersion: 2 as const, producer: 'order-service' as const, correlationId: orderId, actorRole: 'SYSTEM' as const });

export interface FakeOutboxRecord {
  id: string;
  eventType: string;
  payload: string;
  status: string;
  retryCount: number;
  createdAt: Date;
  updatedAt: Date;
}

export function makeFakeOrderRepository() {
  const orders: OrderDTO[] = [];
  const outboxEvents: FakeOutboxRecord[] = [];

  const repo: OrderRepository = {
    async createOrderWithOutbox(data: CreateOrderParams, event: OrderEventDraft): Promise<OrderDTO> {
      const now = new Date();
      const initialStatus = event.eventType === 'order.reservation.requested' ? 'PENDING' : 'OPEN';
      const newOrder: OrderDTO = {
        id: data.id || crypto.randomUUID(),
        orderCode: data.orderCode,
        requesterId: data.requesterId,
        courierId: null,
        supplierId: data.supplierId,
        supplierName: data.supplierName,
        campusZone: data.campusZone,
        itemDescription: data.itemDescription,
        specialNotes: data.specialNotes,
        dropoffLocation: data.dropoffLocation,
        requesterContactNote: data.requesterContactNote,
        courierContactNote: null,
        rewardCredits: data.rewardCredits,
        status: initialStatus,
        rejectionReason: null,
        expiresAt: data.expiresAt.toISOString(),
        acceptedAt: null,
        pickedUpAt: null,
        deliveredAt: null,
        completedAt: null,
        createdAt: now.toISOString(),
        version: 1,
      };

      orders.push(newOrder);

      outboxEvents.push({
        id: event.eventId || crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      return { ...newOrder };
    },

    async applyReservationResult(
      event: CreditReservationResultEvent
    ): Promise<{ order: OrderDTO; outboxEvent?: OrderLifecycleEvent }> {
      const order = orders.find((o) => o.id === event.orderId);
      if (!order) {
        throw new OrderNotFoundError(`Order ${event.orderId} not found for reservation result`);
      }

      if (order.status !== 'PENDING') {
        return { order: { ...order } };
      }

      const now = new Date();
      const before = { ...order };
      if (event.eventType === 'credit.reservation.failed') {
        order.status = 'REJECTED';
        order.rejectionReason = event.reason;
        order.version += 1;
        const rejectedEvent = completeEvent({
          eventId: crypto.randomUUID(),
          eventType: 'order.rejected',
          timestamp: now.toISOString(),
          orderId: order.id,
          orderCode: order.orderCode,
          requesterId: order.requesterId,
          rewardCredits: order.rewardCredits,
          ...systemActor(order.id),
          reasonCode: /insufficient/i.test(event.reason ?? '') ? 'INSUFFICIENT_CREDITS' : 'RESERVATION_FAILED',
        }, before, order);
        outboxEvents.push({
          id: rejectedEvent.eventId,
          eventType: rejectedEvent.eventType,
          payload: JSON.stringify(rejectedEvent),
          status: 'PENDING',
          retryCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        return { order: { ...order }, outboxEvent: rejectedEvent };
      }

      if (new Date(order.expiresAt) <= now) {
        order.status = 'EXPIRED';
        order.version += 1;
        const expiredEvent = completeEvent({
          eventId: crypto.randomUUID(),
          eventType: 'order.expired',
          timestamp: now.toISOString(),
          orderId: order.id,
          orderCode: order.orderCode,
          requesterId: order.requesterId,
          rewardCredits: order.rewardCredits,
          ...systemActor(order.id),
          reasonCode: 'PUBLICATION_EXPIRED',
        }, before, order) as OrderExpiredEvent;
        outboxEvents.push({
          id: expiredEvent.eventId,
          eventType: expiredEvent.eventType,
          payload: JSON.stringify(expiredEvent),
          status: 'PENDING',
          retryCount: 0,
          createdAt: now,
          updatedAt: now,
        });
        return { order: { ...order }, outboxEvent: expiredEvent };
      }

      order.status = 'OPEN';
      order.rejectionReason = null;
      order.version += 1;
      const createdEvent = completeEvent({
        eventId: crypto.randomUUID(),
        eventType: 'order.created',
        timestamp: now.toISOString(),
        orderId: order.id,
        orderCode: order.orderCode,
        requesterId: order.requesterId,
        rewardCredits: order.rewardCredits,
        campusZone: order.campusZone || 'Campus',
        expiresAt: order.expiresAt,
        ...systemActor(order.id),
      }, before, order) as OrderCreatedEvent;
      outboxEvents.push({
        id: createdEvent.eventId,
        eventType: createdEvent.eventType,
        payload: JSON.stringify(createdEvent),
        status: 'PENDING',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });
      return { order: { ...order }, outboxEvent: createdEvent };
    },

    async findOrderById(id: string): Promise<OrderDTO | null> {
      const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
      const found = isUuid
        ? orders.find((o) => o.id === id)
        : orders.find((o) => o.orderCode === id);
      return found ? { ...found } : null;
    },

    async listOrders(options: ListOrdersOptions): Promise<{ orders: OrderDTO[]; total: number }> {
      const { status, campusZone, search, requesterId, courierId, page = 1, limit = 50, viewerId, isAdmin } = options;
      const now = new Date().toISOString();
      const trimmedRequesterId = requesterId?.trim();
      const trimmedCourierId = courierId?.trim();
      const defaultStatus = trimmedRequesterId || trimmedCourierId ? 'ALL' : 'OPEN';
      const normalizedStatus = status ? status.toUpperCase() : defaultStatus;

      let filtered = orders.filter((o) => {
        if (!isAdmin && viewerId && (o.status === 'PENDING' || o.status === 'REJECTED') && o.requesterId !== viewerId) {
          return false;
        }
        if (normalizedStatus === 'OPEN') {
          return o.status === 'OPEN' && o.expiresAt > now;
        }
        if (normalizedStatus !== 'ALL') {
          return o.status === normalizedStatus;
        }
        return true;
      });

      if (trimmedRequesterId) {
        filtered = filtered.filter((o) => o.requesterId.toLowerCase() === trimmedRequesterId.toLowerCase());
      }

      if (trimmedCourierId) {
        filtered = filtered.filter((o) => o.courierId?.toLowerCase() === trimmedCourierId.toLowerCase());
      }

      if (campusZone && campusZone.trim() !== '') {
        const zoneLower = campusZone.trim().toLowerCase();
        filtered = filtered.filter((o) => o.campusZone?.toLowerCase() === zoneLower);
      }

      if (search && search.trim() !== '') {
        const term = search.trim().toLowerCase();
        filtered = filtered.filter(
          (o) =>
            o.orderCode.toLowerCase().includes(term) ||
            o.itemDescription.toLowerCase().includes(term) ||
            o.dropoffLocation.toLowerCase().includes(term) ||
            (o.supplierName && o.supplierName.toLowerCase().includes(term)) ||
            o.requesterId.toLowerCase() === term ||
            (o.courierId && o.courierId.toLowerCase() === term)
        );
      }

      const total = filtered.length;
      const skip = Math.max(0, (page - 1) * limit);
      const paginated = filtered.slice(skip, skip + limit);

      return { orders: paginated, total };
    },

    async getUserActivity(userId: string): Promise<{ requested: OrderDTO[]; delivering: OrderDTO[]; history: OrderDTO[] }> {
      const now = new Date().toISOString();
      const requested: OrderDTO[] = [];
      const delivering: OrderDTO[] = [];
      const history: OrderDTO[] = [];

      for (const order of orders) {
        const isExpired = order.status === 'OPEN' && order.expiresAt <= now;
        if (order.requesterId === userId) {
          if (['COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED'].includes(order.status) || isExpired) {
            history.push({ ...order });
          } else {
            requested.push({ ...order });
          }
        }
        if (order.courierId === userId) {
          if (['ACCEPTED', 'IN_TRANSIT', 'DELIVERED'].includes(order.status)) {
            delivering.push({ ...order });
          } else if (order.status === 'COMPLETED' || order.status === 'CANCELLED') {
            if (!history.some((h) => h.id === order.id)) {
              history.push({ ...order });
            }
          }
        }
      }

      return { requested, delivering, history };
    },

    async acceptOrder(orderId: string, courierId: string, courierContactNote: string | undefined, event: OrderEventDraft): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();
      const before = { ...order };

      if (order.requesterId === courierId) {
        throw new SelfAcceptForbiddenError();
      }

      if (order.status !== 'OPEN') {
        throw new OrderStateConflictError('Order has already been claimed or is no longer open');
      }

      if (new Date(order.expiresAt) <= new Date()) {
        throw new OrderStateConflictError('Order has expired and can no longer be accepted');
      }

      order.status = 'ACCEPTED';
      order.courierId = courierId;
      order.courierContactNote = courierContactNote || null;
      order.acceptedAt = new Date().toISOString();
      order.version += 1;

      outboxEvents.push({
        id: crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(completeEvent(event, before, order)),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async pickupOrder(orderId: string, courierId: string, event: OrderEventDraft): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();
      const before = { ...order };

      if (order.courierId !== courierId) {
        throw new OrderAuthorizationError('Only the assigned courier can mark this errand as picked up');
      }

      if (order.status !== 'ACCEPTED') {
        throw new OrderStateConflictError(`Cannot mark errand as picked up from status ${order.status}`);
      }

      order.status = 'IN_TRANSIT';
      order.pickedUpAt = new Date().toISOString();
      order.version += 1;

      outboxEvents.push({
        id: crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(completeEvent(event, before, order)),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async deliverOrder(orderId: string, courierId: string, event: OrderEventDraft): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();
      const before = { ...order };

      if (order.courierId !== courierId) {
        throw new OrderAuthorizationError('Only the assigned courier can mark this errand as delivered');
      }

      if (order.status !== 'IN_TRANSIT') {
        throw new OrderStateConflictError(`Cannot mark errand as delivered from status ${order.status}`);
      }

      order.status = 'DELIVERED';
      order.deliveredAt = new Date().toISOString();
      order.version += 1;

      outboxEvents.push({
        id: crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(completeEvent(event, before, order)),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async completeOrder(orderId: string, requesterId: string, event: OrderEventDraft): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();
      const before = { ...order };

      if (order.requesterId !== requesterId) {
        throw new OrderAuthorizationError('Only the requester can confirm delivery and complete this errand');
      }

      if (order.status !== 'DELIVERED') {
        throw new OrderStateConflictError(`Cannot complete errand from status ${order.status}. Errand must be DELIVERED first.`);
      }

      order.status = 'COMPLETED';
      order.completedAt = new Date().toISOString();
      order.version += 1;

      outboxEvents.push({
        id: crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(completeEvent(event, before, order)),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async cancelOrder(orderId: string, requesterId: string, event: OrderEventDraft): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();
      const before = { ...order };

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

      order.status = 'CANCELLED';
      order.version += 1;

      outboxEvents.push({
        id: crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(completeEvent(event, before, order)),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async unassignOrder(orderId: string, courierId: string, event: OrderEventDraft): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();
      const before = { ...order };

      if (order.courierId !== courierId) {
        throw new OrderAuthorizationError('Only the assigned courier can drop this errand');
      }

      if (order.status !== 'ACCEPTED') {
        throw new OrderStateConflictError(
          `Cannot drop errand from status ${order.status}. Errand can only be dropped before pickup.`
        );
      }

      order.status = 'OPEN';
      order.courierId = null;
      order.acceptedAt = null;
      order.courierContactNote = null;
      order.version += 1;

      outboxEvents.push({
        id: crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(completeEvent(event, before, order)),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async adminCancelOrder(
      orderId: string,
      adminUserId: string,
      reason: string,
      event: OrderEventDraft,
      expectedVersion?: number
    ): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();
      const before = { ...order };

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

      order.status = 'CANCELLED';
      order.version += 1;
      const noteTag = `[Admin Cancel by ${adminUserId}: ${reason}]`;
      order.specialNotes = order.specialNotes ? `${order.specialNotes} | ${noteTag}` : noteTag;

      outboxEvents.push({
        id: crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(completeEvent(event, before, order)),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async adminCompleteOrder(
      orderId: string,
      adminUserId: string,
      reason: string,
      event: OrderEventDraft,
      expectedVersion?: number
    ): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();
      const before = { ...order };

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

      order.status = 'COMPLETED';
      order.completedAt = new Date().toISOString();
      order.version += 1;
      const noteTag = `[Admin Force-Complete by ${adminUserId}: ${reason}]`;
      order.specialNotes = order.specialNotes ? `${order.specialNotes} | ${noteTag}` : noteTag;

      outboxEvents.push({
        id: crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(completeEvent(event, before, order)),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async adminUnassignOrder(
      orderId: string,
      adminUserId: string,
      reason: string,
      event: OrderEventDraft,
      expectedVersion?: number
    ): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();
      const before = { ...order };

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

      order.status = 'OPEN';
      order.courierId = null;
      order.acceptedAt = null;
      order.courierContactNote = null;
      order.version += 1;
      const noteTag = `[Admin Courier Unassign by ${adminUserId}: ${reason}]`;
      order.specialNotes = order.specialNotes ? `${order.specialNotes} | ${noteTag}` : noteTag;

      outboxEvents.push({
        id: crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(completeEvent(event, before, order)),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async expireDueOrders(now: Date): Promise<number> {
      let count = 0;
      for (const order of orders) {
        if (order.status === 'OPEN' && new Date(order.expiresAt) <= now) {
          const before = { ...order };
          order.status = 'EXPIRED';
          order.version += 1;

          outboxEvents.push({
            id: crypto.randomUUID(),
            eventType: 'order.expired',
            payload: JSON.stringify(completeEvent({
              eventType: 'order.expired',
              eventId: crypto.randomUUID(),
              timestamp: now.toISOString(),
              orderId: order.id,
              orderCode: order.orderCode,
              requesterId: order.requesterId,
              rewardCredits: order.rewardCredits,
              ...systemActor(order.id),
              reasonCode: 'OPEN_EXPIRED',
            }, before, order)),
            status: 'PENDING',
            retryCount: 0,
            createdAt: now,
            updatedAt: now,
          });
          count++;
        }
      }
      return count;
    },

  };

  async function approve(orderId: string): Promise<OrderDTO> {
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new OrderNotFoundError(`Order ${orderId} not found`);
    const result = await repo.applyReservationResult({
      eventId: crypto.randomUUID(),
      correlationId: order.id,
      timestamp: new Date().toISOString(),
      eventType: 'credit.reservation.succeeded',
      orderId: order.id,
      requesterId: order.requesterId,
      rewardCredits: order.rewardCredits,
    });
    return result.order;
  }

  async function reject(orderId: string, reason = 'Insufficient credits'): Promise<OrderDTO> {
    const order = orders.find((o) => o.id === orderId);
    if (!order) throw new OrderNotFoundError(`Order ${orderId} not found`);
    const result = await repo.applyReservationResult({
      eventId: crypto.randomUUID(),
      correlationId: order.id,
      timestamp: new Date().toISOString(),
      eventType: 'credit.reservation.failed',
      orderId: order.id,
      requesterId: order.requesterId,
      rewardCredits: order.rewardCredits,
      reason,
    });
    return result.order;
  }

  return { repo, orders, outboxEvents, approve, reject };
}

export function makeFakeSupplierClient(knownSuppliers: Record<string, SupplierDetails> = {}) {
  const suppliers = new Map<string, SupplierDetails>(Object.entries(knownSuppliers));
  let isAvailable = true;

  const client: SupplierClient = {
    async getSupplier(supplierId: string) {
      if (!isAvailable) {
        return { kind: 'unavailable', message: 'Fake supplier service outage' };
      }
      const s = suppliers.get(supplierId);
      if (!s) return { kind: 'not_found' };
      return { kind: 'found', supplier: s };
    },
    async listActiveSuppliers() {
      if (!isAvailable) return [];
      return Array.from(suppliers.values()).filter((s) => s.isActive);
    },
  };

  return {
    client,
    suppliers,
    setAvailable(val: boolean) {
      isAvailable = val;
    },
    addSupplier(supplier: SupplierDetails) {
      suppliers.set(supplier.id, supplier);
    },
  };
}

export function makeKeyPair(): { privateKey: string; publicKey: string } {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  return {
    privateKey: privateKey.export({ format: 'der', type: 'pkcs8' }).toString('base64url'),
    publicKey: publicKey.export({ format: 'der', type: 'spki' }).toString('base64url'),
  };
}

export async function startTestServer(app: Express): Promise<{ url: string; close: () => Promise<void> }> {
  return new Promise((resolve) => {
    const server = app.listen(0, () => {
      const address = server.address() as AddressInfo;
      const url = `http://127.0.0.1:${address.port}`;
      resolve({
        url,
        close: () => new Promise<void>((res) => server.close(() => res())),
      });
    });
  });
}
