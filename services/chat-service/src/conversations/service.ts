/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent; Claude Code (model: Claude Fable 5.1, Claude Sonnet 5.5), date: 2026-10-20 to 2026-11-10
 * Scope: The conversation rules from issue #56 and the author's decisions: open with the local row, else the Order Service fallback (S4); updated across 6 AI-assisted revisions through D4 wrap-up (re-fetch and re-validate conversation participants and open status after async moderation before returning flagged recipientIds (issue #235)).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import type { AuthenticatedPrincipal } from '@campus-errand/auth';
import type { OrderStatus } from '@campus-errand/common-dtos';
import type { OrderClient } from '../clients/order.client';
import type { Moderator } from '../moderation/moderate';
import type { Translator } from '../translation/translate';
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
  /** The moderator flagged the text; nothing was stored. The conversation lets the hub address the transient peer notice. */
  | { kind: 'flagged'; conversation: ConversationRow; recipientIds: string[] }
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'closed' }
  | { kind: 'empty' }
  | { kind: 'no_username' };

export type TranslateResult =
  | { kind: 'translated'; translations: Record<string, string> }
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'unavailable' };

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
  /** Translates messages for display only (nothing is stored); absent when no translator is configured. */
  translate?: Translator;
  /** Checks a message before it is stored; absent when no moderator is configured. */
  moderate?: Moderator;
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

  async function send(orderId: string, principal: AuthenticatedPrincipal, text: string, clientId?: string): Promise<SendResult> {
    const conversation = await deps.store.findByOrderId(orderId);
    if (!conversation) return { kind: 'not_found' };
    if (!canSend(conversation, principal)) return { kind: 'forbidden' };
    if (conversation.closedAt) return { kind: 'closed' };
    const trimmed = text.trim();
    if (trimmed.length === 0) return { kind: 'empty' };
    // D6: the name is the token's claim; a token without one cannot be attributed (F8.2.2).
    if (!principal.username) return { kind: 'no_username' };
    // Content moderation runs before anything is written, so a flagged message is never stored or pushed.
    if (deps.moderate && (await deps.moderate(trimmed))) {
      // Re-read the conversation after the async moderation round-trip so a courier
      // reassignment or conversation close during moderation cannot notify a former courier or let an unassigned
      // sender emit a flagged notice (issue #235).
      const current = await deps.store.findByOrderId(orderId);
      if (!current) return { kind: 'not_found' };
      if (!canSend(current, principal)) return { kind: 'forbidden' };
      if (current.closedAt) return { kind: 'closed' };
      return { kind: 'flagged', conversation: current, recipientIds: [current.requesterId, current.courierId] };
    }
    // The checks above are a fast path on a possibly stale row; the store repeats them under the row lock (P2), so a
    // close or re-courier committed in between is refused and the recipients reflect the locked state.
    const appended = await deps.store.append({
      conversationId: conversation.id,
      senderId: principal.userId,
      senderUsername: principal.username,
      senderRole: principal.role,
      text: trimmed,
      sentAt: now().toISOString(),
      clientId,
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

  /**
   * Display-only translations of messages in a conversation the caller may read (participants and admins).
   * Nothing is written: the stored text is untouched.
   */
  async function translate(orderId: string, principal: AuthenticatedPrincipal, language: string, messageIds: string[]): Promise<TranslateResult> {
    const conversation = await deps.store.findByOrderId(orderId);
    if (!conversation) return { kind: 'not_found' };
    if (!canRead(conversation, principal)) return { kind: 'forbidden' };
    if (!deps.translate) return { kind: 'unavailable' };
    const wanted = new Set(messageIds);
    const found: MessageRow[] = [];
    for (let after = 0; wanted.size > found.length; ) {
      const page = await deps.store.listMessages(conversation.id, { afterSequence: after, limit: 100 });
      for (const message of page) if (wanted.has(message.id)) found.push(message);
      if (page.length < 100) break;
      after = page[page.length - 1].sequence;
    }
    if (found.length === 0) return { kind: 'translated', translations: {} };
    const texts = await deps.translate(found.map((m) => m.text), language);
    if (!texts) return { kind: 'unavailable' };
    return { kind: 'translated', translations: Object.fromEntries(found.map((m, i) => [m.id, texts[i]])) };
  }

  return { open, send, history, messages, translate };
}

export type ConversationService = ReturnType<typeof createConversationService>;
