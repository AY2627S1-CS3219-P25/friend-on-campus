/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: In-memory repository fakes, mock clients, and HTTP test server helpers for Order Service unit/integration testing.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { generateKeyPairSync } from 'node:crypto';
import type { Express } from 'express';
import type { AddressInfo } from 'node:net';
import type { OrderDTO } from '@campus-errand/common-dtos';
import type { CreateOrderParams, ListOrdersOptions, OrderRepository } from '../src/repositories/order.repository';
import type { CreditClient, ReserveEscrowParams } from '../src/clients/credit.client';
import type { SupplierClient, SupplierDetails } from '../src/clients/supplier.client';
import type { OrderEventPublisher, OrderLifecycleEvent } from '../src/messaging/event.publisher';
import {
  OrderAuthorizationError,
  OrderNotFoundError,
  OrderStateConflictError,
  SelfAcceptForbiddenError,
} from '../src/orders/order.types';

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
    async createOrderWithOutbox(data: CreateOrderParams, event: OrderLifecycleEvent): Promise<OrderDTO> {
      const now = new Date();
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
        status: 'OPEN',
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
        id: crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
        retryCount: 0,
        createdAt: now,
        updatedAt: now,
      });

      return newOrder;
    },

    async findOrderById(id: string): Promise<OrderDTO | null> {
      const found = orders.find((o) => o.id === id || o.orderCode === id);
      return found ? { ...found } : null;
    },

    async listOrders(options: ListOrdersOptions): Promise<{ orders: OrderDTO[]; total: number }> {
      const { status, campusZone, page = 1, limit = 50 } = options;
      const now = new Date().toISOString();

      let filtered = orders.filter((o) => {
        if (!status || status.toUpperCase() === 'OPEN') {
          return o.status === 'OPEN' && o.expiresAt > now;
        }
        if (status.toUpperCase() !== 'ALL') {
          return o.status === status.toUpperCase();
        }
        return true;
      });

      if (campusZone && campusZone.trim() !== '') {
        const zoneLower = campusZone.trim().toLowerCase();
        filtered = filtered.filter((o) => o.campusZone?.toLowerCase() === zoneLower);
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
          if (['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(order.status) || isExpired) {
            history.push({ ...order });
          } else {
            requested.push({ ...order });
          }
        }
        if (order.courierId === userId) {
          if (['ACCEPTED', 'IN_TRANSIT', 'DELIVERED'].includes(order.status)) {
            delivering.push({ ...order });
          } else if (order.status === 'COMPLETED') {
            if (!history.some((h) => h.id === order.id)) {
              history.push({ ...order });
            }
          }
        }
      }

      return { requested, delivering, history };
    },

    async acceptOrder(orderId: string, courierId: string, courierContactNote: string | undefined, event: OrderLifecycleEvent): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();

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
        payload: JSON.stringify(event),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async pickupOrder(orderId: string, courierId: string, event: OrderLifecycleEvent): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();

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
        payload: JSON.stringify(event),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async deliverOrder(orderId: string, courierId: string, event: OrderLifecycleEvent): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();

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
        payload: JSON.stringify(event),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async completeOrder(orderId: string, requesterId: string, event: OrderLifecycleEvent): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();

      if (order.requesterId !== requesterId) {
        throw new OrderAuthorizationError('Only the requester can confirm delivery and complete this errand');
      }

      if (order.status !== 'DELIVERED' && order.status !== 'IN_TRANSIT') {
        throw new OrderStateConflictError(`Cannot complete errand from status ${order.status}`);
      }

      order.status = 'COMPLETED';
      order.completedAt = new Date().toISOString();
      order.version += 1;

      outboxEvents.push({
        id: crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(event),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return { ...order };
    },

    async cancelOrder(orderId: string, requesterId: string, event: OrderLifecycleEvent): Promise<OrderDTO> {
      const order = orders.find((o) => o.id === orderId);
      if (!order) throw new OrderNotFoundError();

      if (order.requesterId !== requesterId) {
        throw new OrderAuthorizationError('Only the requester can cancel this errand');
      }

      if (['IN_TRANSIT', 'DELIVERED', 'COMPLETED'].includes(order.status)) {
        throw new OrderStateConflictError('Cannot cancel an errand that has already been picked up or completed');
      }

      if (['CANCELLED', 'EXPIRED'].includes(order.status)) {
        throw new OrderStateConflictError(`Errand is already in terminal state ${order.status}`);
      }

      order.status = 'CANCELLED';
      order.courierId = null;
      order.version += 1;

      outboxEvents.push({
        id: crypto.randomUUID(),
        eventType: event.eventType,
        payload: JSON.stringify(event),
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
          order.status = 'EXPIRED';
          order.version += 1;

          outboxEvents.push({
            id: crypto.randomUUID(),
            eventType: 'order.expired',
            payload: JSON.stringify({
              eventType: 'order.expired',
              eventId: crypto.randomUUID(),
              timestamp: now.toISOString(),
              orderId: order.id,
              orderCode: order.orderCode,
              requesterId: order.requesterId,
              rewardCredits: order.rewardCredits,
            }),
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

  return { repo, orders, outboxEvents };
}

export function makeFakeCreditClient(opts: { defaultSuccess?: boolean; defaultError?: string } = {}) {
  const reservations: ReserveEscrowParams[] = [];
  let shouldSucceed = opts.defaultSuccess ?? true;
  let customError = opts.defaultError;

  const client: CreditClient = {
    async reserveEscrow(params: ReserveEscrowParams) {
      reservations.push(params);
      if (shouldSucceed) {
        return { success: true, status: 200 };
      }
      return { success: false, status: 400, error: customError || 'Insufficient available credits' };
    },
  };

  return {
    client,
    reservations,
    setSuccess(val: boolean, error?: string) {
      shouldSucceed = val;
      customError = error;
    },
  };
}

export function makeFakeSupplierClient(knownSuppliers: Record<string, SupplierDetails> = {}) {
  const suppliers = new Map<string, SupplierDetails>(Object.entries(knownSuppliers));

  const client: SupplierClient = {
    async getSupplier(supplierId: string) {
      return suppliers.get(supplierId) ?? null;
    },
  };

  return {
    client,
    suppliers,
    addSupplier(supplier: SupplierDetails) {
      suppliers.set(supplier.id, supplier);
    },
  };
}

export function makeFakePublisher() {
  const published: OrderLifecycleEvent[] = [];
  let shouldSucceed = true;

  const publisher: OrderEventPublisher = {
    async publishOrderEvent(event: OrderLifecycleEvent) {
      if (shouldSucceed) {
        published.push(event);
        return true;
      }
      return false;
    },
    async close() {},
  };

  return {
    publisher,
    published,
    setSuccess(val: boolean) {
      shouldSucceed = val;
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
