/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: The Order Service fallback of the author's D2 and S4 decisions, in the shape of
 * order-service/src/clients/supplier.client.ts: GET /api/orders/:id with a 4 s timeout, three result kinds. The
 * caller's own access token is forwarded because the route requires one and no service credential exists.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import type { OrderStatus } from '@campus-errand/common-dtos';

export interface OrderDetails {
  id: string;
  requesterId: string;
  courierId: string | null;
  status: OrderStatus;
  acceptedAt: string | null;
  completedAt: string | null;
}

export type OrderLookupResult =
  | { kind: 'found'; order: OrderDetails }
  | { kind: 'not_found' }
  | { kind: 'unavailable'; message: string };

export interface OrderClient {
  getOrder(orderId: string, accessToken: string): Promise<OrderLookupResult>;
}

export function createOrderClient(orderServiceUrl: string, fetchImpl: typeof fetch = fetch): OrderClient {
  return {
    async getOrder(orderId, accessToken) {
      try {
        const url = new URL(`/api/orders/${orderId}`, orderServiceUrl).toString();
        const response = await fetchImpl(url, {
          headers: { authorization: `Bearer ${accessToken}` },
          signal: AbortSignal.timeout(4000),
        });
        if (response.status === 404 || response.status === 400) return { kind: 'not_found' };
        if (!response.ok) return { kind: 'unavailable', message: `Order Service returned status ${response.status}` };
        const body = (await response.json()) as { success?: boolean; data?: Record<string, unknown> };
        const order = body.success ? body.data : undefined;
        if (!order || typeof order.id !== 'string' || typeof order.requesterId !== 'string' || typeof order.status !== 'string') {
          return { kind: 'not_found' };
        }
        return {
          kind: 'found',
          order: {
            id: order.id,
            requesterId: order.requesterId,
            courierId: typeof order.courierId === 'string' ? order.courierId : null,
            status: order.status as OrderStatus,
            acceptedAt: typeof order.acceptedAt === 'string' ? order.acceptedAt : null,
            completedAt: typeof order.completedAt === 'string' ? order.completedAt : null,
          },
        };
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unknown network failure';
        console.warn(`[order-client] Failed to reach Order Service for ${orderId}: ${message}`);
        return { kind: 'unavailable', message };
      }
    },
  };
}
