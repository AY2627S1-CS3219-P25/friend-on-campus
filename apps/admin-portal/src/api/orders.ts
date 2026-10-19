/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted admin order management API calls into src/api/orders.ts.
 * Author review: Verified by yanhwee on 2026-10-19
 */

// AI-generated (edited by yanhwee)

import { OrderDTO } from '@campus-errand/common-dtos';
import { AuthFetchFn } from './suppliers';

export async function fetchOrdersApi(authFetch: AuthFetchFn): Promise<OrderDTO[]> {
  const res = await authFetch('/api/orders?status=ALL&limit=100');
  if (!res.ok) {
    throw new Error(`HTTP error ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  if (json.success && json.data) {
    return Array.isArray(json.data) ? json.data : json.data.orders || [];
  }
  throw new Error(json.error || 'Failed to parse orders payload');
}

export async function executeAdminOrderActionApi(
  authFetch: AuthFetchFn,
  orderId: string,
  actionType: 'cancel' | 'complete' | 'unassign',
  reason: string,
  expectedVersion?: number
) {
  const endpoint =
    actionType === 'cancel'
      ? `/api/orders/${orderId}/admin/cancel`
      : actionType === 'complete'
      ? `/api/orders/${orderId}/admin/complete`
      : `/api/orders/${orderId}/admin/unassign`;

  const res = await authFetch(endpoint, {
    method: 'POST',
    body: JSON.stringify({
      reason,
      expectedVersion,
    }),
  });
  const data = await res.json();
  return { res, data };
}
