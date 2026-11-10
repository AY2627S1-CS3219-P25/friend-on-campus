/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1, Claude Sonnet 5.5); Google Antigravity Agent, date: 2026-10-19 to 2026-11-06
 * Scope: Extracted order feed, user activity, and accept order API helpers from student-app App.tsx into modular api/orders.ts; updated across 8 AI-assisted revisions through D4 wrap-up (added disputeOrderById and the 'dispute' task action).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


import { OrderDTO, ParsedErrandDraftDTO } from '@campus-errand/common-dtos';
import { AuthFetchFn } from './auth';

export type TaskOrderAction = 'pickup' | 'deliver' | 'complete' | 'cancel' | 'unassign' | 'dispute' | 'courier-dispute';

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
  // On a 2xx the server may have committed the action, so a body that cannot
  // be read (connection dropped, deadline hit mid-body) is a lost response and its error propagates to
  // describeWriteFailure; an unreadable error body still falls back to the HTTP status message.
  const body = await res.json().catch((error: unknown) => {
    if (res.ok) throw error;
    return {};
  });
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

export async function disputeOrderById(
  authFetch: AuthFetchFn,
  orderId: string,
  details: string
): Promise<OrderDTO> {
  return postOrderLifecycleAction(
    authFetch,
    orderId,
    'dispute',
    'Unable to raise a dispute for this errand.',
    { details }
  );
}

export async function courierDisputeOrderById(
  authFetch: AuthFetchFn,
  orderId: string,
  details: string
): Promise<OrderDTO> {
  return postOrderLifecycleAction(
    authFetch,
    orderId,
    'courier-dispute',
    'Unable to submit your dispute report.',
    { details }
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

/**
 * Order Service looks suppliers up (4 s timeout) and then gives SoCLaaS 10 s before answering with an offline draft,
 * so this caller's deadline must outlast both; the 10 s authFetch default would drop the fallback on the floor.
 */
export const DRAFT_DEADLINE_MS = 20_000;

export async function parseErrandDraft(
  authFetch: AuthFetchFn,
  prompt: string
): Promise<ParsedErrandDraftDTO> {
  const res = await authFetch('/api/orders/assistant/draft', {
    method: 'POST',
    body: JSON.stringify({ prompt }),
    signal: AbortSignal.timeout(DRAFT_DEADLINE_MS),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body.error || `Failed to extract errand draft (HTTP ${res.status})`);
  }
  return body.data as ParsedErrandDraftDTO;
}
