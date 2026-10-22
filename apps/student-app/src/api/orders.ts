/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: fetchOrderById for the notification deep link: the errand's live status from GET /api/orders/:id, with 403
 * and 404 kept apart so a former courier sees "no longer available" rather than a stale action (Notification Redesign §2).
 * Author review: <to be completed by Reallyeasy1>
 *
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

// AI-generated (edited by Reallyeasy1)
export type FetchOrderResult =
  | { status: 'ok'; order: OrderDTO }
  | { status: 'forbidden' | 'not_found' | 'error'; message: string };

/** The authoritative state of one errand, fetched when a notification is opened. */
export async function fetchOrderById(authFetch: AuthFetchFn, orderId: string): Promise<FetchOrderResult> {
  try {
    const res = await authFetch(`/api/orders/${encodeURIComponent(orderId)}`);
    const body = await res.json().catch(() => ({}));
    if (res.ok && body.success) return { status: 'ok', order: body.data as OrderDTO };
    if (res.status === 403) return { status: 'forbidden', message: body.error || 'You no longer have access to this errand.' };
    if (res.status === 404) return { status: 'not_found', message: body.error || 'This errand no longer exists.' };
    return { status: 'error', message: body.error || `Could not load this errand (HTTP ${res.status}).` };
  } catch {
    return { status: 'error', message: 'Could not load this errand. Check your connection and try again.' };
  }
}

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
