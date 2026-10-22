/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Added unassignOrderById and 'unassign' action to TaskOrderAction so couriers can drop ACCEPTED errands prior to pickup, and added optional courierContactNote support to acceptOrderById (F3.3.6).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-21
 * Scope: Added pickup, deliver, complete, and cancel lifecycle API helpers, preserved 400/403/409 backend error messages, and included user activity history in fetchCombinedOrders (Issue #132).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted order feed, user activity, and accept order API helpers from student-app App.tsx into modular api/orders.ts.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { OrderDTO } from '@campus-errand/common-dtos';
import { AuthFetchFn } from './auth';

export type TaskOrderAction = 'pickup' | 'deliver' | 'complete' | 'cancel' | 'unassign';

export async function fetchCombinedOrders(authFetch: AuthFetchFn): Promise<OrderDTO[]> {
  const [feedResponse, activityResponse] = await Promise.all([
    authFetch('/api/orders?status=OPEN&limit=100'),
    authFetch('/api/orders/user/activity'),
  ]);
  const [feed, activity] = await Promise.all([feedResponse.json(), activityResponse.json()]);
  if (!feedResponse.ok || !activityResponse.ok || !feed.success || !activity.success) {
    throw new Error('Order API unavailable');
  }
  const combined: OrderDTO[] = [
    ...feed.data,
    ...activity.data.requested,
    ...activity.data.delivering,
    ...(activity.data.history ?? []),
  ];
  return [...new Map(combined.map((order) => [order.id, order])).values()];
}

async function postOrderLifecycleAction(
  authFetch: AuthFetchFn,
  orderId: string,
  action: 'accept' | TaskOrderAction,
  fallbackMessage: string,
  payload: Record<string, unknown> = {}
): Promise<OrderDTO> {
  const res = await authFetch(`/api/orders/${encodeURIComponent(orderId)}/${action}`, {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.error || `${fallbackMessage} (HTTP ${res.status})`);
  }
  return body.data as OrderDTO;
}

export async function acceptOrderById(
  authFetch: AuthFetchFn,
  orderId: string,
  courierContactNote?: string
): Promise<OrderDTO> {
  const trimmedNote = courierContactNote?.trim();
  return postOrderLifecycleAction(
    authFetch,
    orderId,
    'accept',
    'Unable to accept this errand.',
    trimmedNote ? { courierContactNote: trimmedNote } : {}
  );
}

export async function pickupOrderById(
  authFetch: AuthFetchFn,
  orderId: string
): Promise<OrderDTO> {
  return postOrderLifecycleAction(
    authFetch,
    orderId,
    'pickup',
    'Unable to mark this errand as picked up.'
  );
}

export async function deliverOrderById(
  authFetch: AuthFetchFn,
  orderId: string
): Promise<OrderDTO> {
  return postOrderLifecycleAction(
    authFetch,
    orderId,
    'deliver',
    'Unable to mark this errand as delivered.'
  );
}

export async function completeOrderById(
  authFetch: AuthFetchFn,
  orderId: string
): Promise<OrderDTO> {
  return postOrderLifecycleAction(
    authFetch,
    orderId,
    'complete',
    'Unable to confirm delivery for this errand.'
  );
}

export async function cancelOrderById(
  authFetch: AuthFetchFn,
  orderId: string
): Promise<OrderDTO> {
  return postOrderLifecycleAction(
    authFetch,
    orderId,
    'cancel',
    'Unable to cancel this errand.'
  );
}

export async function unassignOrderById(
  authFetch: AuthFetchFn,
  orderId: string
): Promise<OrderDTO> {
  return postOrderLifecycleAction(
    authFetch,
    orderId,
    'unassign',
    'Unable to drop this errand.'
  );
}
