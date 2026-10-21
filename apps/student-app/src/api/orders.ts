/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted order feed, user activity, and accept order API helpers from student-app App.tsx into modular api/orders.ts.
 * Author review: Verified by yanhwee
 */

// AI-generated (edited by yanhwee)

import { OrderDTO } from '@campus-errand/common-dtos';
import { AuthFetchFn } from './auth';

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
  ];
  return [...new Map(combined.map((order) => [order.id, order])).values()];
}

export async function acceptOrderById(
  authFetch: AuthFetchFn,
  orderId: string
): Promise<OrderDTO> {
  const res = await authFetch(`/api/orders/${orderId}/accept`, {
    method: 'POST',
    body: '{}',
  });
  const body = await res.json();
  if (!res.ok || !body.success) {
    throw new Error(body.error || 'Unable to accept this errand.');
  }
  return body.data as OrderDTO;
}
