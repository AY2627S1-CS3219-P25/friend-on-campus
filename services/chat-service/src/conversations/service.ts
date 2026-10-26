/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: The conversation rules from issue #56 and the author's decisions: open with the local row, else the Order
 * Service fallback (S4); read for the two participants and admins (F8.1.2, D8); send for participants only while
 * the conversation is open (F8.2, F8.3.2); blank text rejected (F8.2.3); sender name and role from the token (D6).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fix (PR #148 P2): send keeps its fast pre-checks but takes the final participant/closure verdict and
 * the recipients from store.append, which decides under the conversation row lock.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import type { AuthenticatedPrincipal } from '@campus-errand/auth';
import type { OrderStatus } from '@campus-errand/common-dtos';
import type { OrderClient } from '../clients/order.client';
import type { ConversationRow, ConversationStore, MessageRow } from './store';

/** Statuses in which messages may be sent (F8.2; D7). Every other status closes the conversation to writes. */
export const OPEN_STATUSES: readonly OrderStatus[] = ['ACCEPTED', 'IN_TRANSIT', 'DELIVERED'];

export type OpenResult =
  | { kind: 'found'; conversation: ConversationRow }
  | { kind: 'not_found' }
  | { kind: 'unavailable'; message: string }
  | { kind: 'forbidden' };

export type SendResult =
  | { kind: 'sent'; message: MessageRow; recipientIds: string[] }
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'closed' }
  | { kind: 'empty' }
  | { kind: 'no_username' };

export function isParticipant(conversation: ConversationRow, userId: string): boolean {
  return conversation.requesterId === userId || conversation.courierId === userId;
}

/** F8.1.2 for participants; D8 lets admins read. */
export function canRead(conversation: ConversationRow, principal: AuthenticatedPrincipal): boolean {
  return isParticipant(conversation, principal.userId) || principal.role === 'ADMIN';
}

/** Sending stays with the participants (F8.2); admins read only (D8). */
export function canSend(conversation: ConversationRow, principal: AuthenticatedPrincipal): boolean {
  return isParticipant(conversation, principal.userId);
}

export function createConversationService(deps: {
  store: ConversationStore;
  orders: OrderClient;
  now?: () => Date;
}) {
  const now = deps.now ?? (() => new Date());

  /** The row for an order, created from the Order Service when events have not produced one (S4). */
  async function open(orderId: string, principal: AuthenticatedPrincipal, accessToken: string): Promise<OpenResult> {
    let conversation = await deps.store.findByOrderId(orderId);
    if (!conversation) {
      const lookup = await deps.orders.getOrder(orderId, accessToken);
      if (lookup.kind !== 'found') return lookup;
      const { order } = lookup;
      // A row needs a courier (schema, S1); an order that never had one has no conversation.
      if (!order.courierId) return { kind: 'not_found' };
      const closed = !OPEN_STATUSES.includes(order.status);
      conversation = (await deps.store.upsertAccepted({
        orderId: order.id,
        requesterId: order.requesterId,
        courierId: order.courierId,
        createdAt: order.acceptedAt ?? now().toISOString(),
        closedAt: closed ? order.completedAt ?? now().toISOString() : null,
      })).conversation;
    }
    if (!canRead(conversation, principal)) return { kind: 'forbidden' };
    return { kind: 'found', conversation };
  }

  async function send(orderId: string, principal: AuthenticatedPrincipal, text: string): Promise<SendResult> {
    const conversation = await deps.store.findByOrderId(orderId);
    if (!conversation) return { kind: 'not_found' };
    if (!canSend(conversation, principal)) return { kind: 'forbidden' };
    if (conversation.closedAt) return { kind: 'closed' };
    const trimmed = text.trim();
    if (trimmed.length === 0) return { kind: 'empty' };
    // D6: the name is the token's claim; a token without one cannot be attributed (F8.2.2).
    if (!principal.username) return { kind: 'no_username' };
    // The checks above are a fast path on a possibly stale row; the store repeats them under the row lock (P2), so a
    // close or re-courier committed in between is refused and the recipients reflect the locked state.
    const appended = await deps.store.append({
      conversationId: conversation.id,
      senderId: principal.userId,
      senderUsername: principal.username,
      senderRole: principal.role,
      text: trimmed,
      sentAt: now().toISOString(),
    });
    if (appended.kind !== 'appended') return appended;
    return { kind: 'sent', message: appended.message, recipientIds: appended.recipientIds };
  }

  async function history(orderId: string, principal: AuthenticatedPrincipal, options: { afterSequence: number; limit: number }) {
    const conversation = await deps.store.findByOrderId(orderId);
    if (!conversation) return { kind: 'not_found' as const };
    if (!canRead(conversation, principal)) return { kind: 'forbidden' as const };
    return { kind: 'found' as const, conversation, messages: await deps.store.listMessages(conversation.id, options) };
  }

  /** Messages of a conversation already opened (and so already authorised) by `open`. */
  function messages(conversationId: string, options: { afterSequence: number; limit: number }) {
    return deps.store.listMessages(conversationId, options);
  }

  return { open, send, history, messages };
}

export type ConversationService = ReturnType<typeof createConversationService>;
