/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
 * Scope: Subscriber-side delivery for cross-replica chat signals (issue #240, wiki section 3): a `message` signal
 *        re-reads the stored message and the current conversation and pushes MESSAGE only to users who are both in the
 *        original recipient set and current participants (clientId only on the sender's sockets); a transient
 *        `moderated` signal pushes MODERATED_PEER to the current peer. The outbox payload builder lives here too so the
 *        store and the subscriber agree on one shape. PR #246 review: the sender's clientId is echoed whatever its
 *        length (author's decision), since the hub accepts any length.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { randomUUID } from 'node:crypto';
import type { RealtimeSignal } from '@campus-errand/messaging';
import type { ChatServerFrame } from '@campus-errand/common-dtos';
import type { ConversationRow, ConversationStore, MessageRow } from '../conversations/store';
import { toMessageDTO } from '../ws/hub';

export const MODERATED_PEER_TEXT = 'This message was removed as it was harmful and abusive';

/** Payload of a `message` signal: identifiers only; the subscriber re-reads the row. */
export interface MessageSignalPayload {
  messageId: string;
  conversationId: string;
  orderId: string;
  senderId: string;
  /** Participants at commit time; the subscriber intersects them with the current participants. */
  recipientIds: string[];
  /** The sender's correlation value for their own echo; opaque, never an idempotency key. */
  clientId?: string;
}

export interface ModeratedSignalPayload {
  orderId: string;
  conversationId: string;
  senderId: string;
  recipientIds: string[];
}

export function messageSignal(message: MessageRow, conversation: Pick<ConversationRow, 'orderId' | 'requesterId' | 'courierId'>, clientId?: string): RealtimeSignal {
  const payload: MessageSignalPayload = {
    messageId: message.id,
    conversationId: message.conversationId,
    orderId: conversation.orderId,
    senderId: message.senderId,
    recipientIds: [conversation.requesterId, conversation.courierId],
    ...(clientId !== undefined && { clientId }),
  };
  // The message id is the stable event id: a replayed signal is recognised by the subscriber cache.
  return { eventId: message.id, kind: 'message', payload: { ...payload } };
}

export function moderatedSignal(conversation: ConversationRow, senderId: string): RealtimeSignal {
  const payload: ModeratedSignalPayload = {
    orderId: conversation.orderId,
    conversationId: conversation.id,
    senderId,
    recipientIds: [conversation.requesterId, conversation.courierId],
  };
  return { eventId: randomUUID(), kind: 'moderated', payload: { ...payload } };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function ids(value: unknown): string[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > 4) return null;
  return value.every((item) => typeof item === 'string' && UUID.test(item)) ? value.map((item: string) => item.toLowerCase()) : null;
}

export class InvalidRealtimeSignal extends Error {}

export interface ChatDeliveryHub {
  push(userId: string, frame: ChatServerFrame): number;
}

export function createChatDelivery(deps: { store: Pick<ConversationStore, 'findMessage' | 'findById'>; hub: ChatDeliveryHub }) {
  /** Users named by the signal who are still participants now; the current row, not the signal, decides eligibility. */
  const eligible = (recipientIds: string[], conversation: ConversationRow) =>
    recipientIds.filter((userId) => userId === conversation.requesterId || userId === conversation.courierId);

  async function handle(signal: RealtimeSignal, abort: AbortSignal): Promise<void> {
    const payload = signal.payload;
    if (signal.kind === 'message') {
      const messageId = typeof payload.messageId === 'string' && UUID.test(payload.messageId) ? payload.messageId : null;
      const recipientIds = ids(payload.recipientIds);
      // Echoed exactly as the hub accepted it: a length check here would drop an id the SEND was allowed to carry.
      const clientId = typeof payload.clientId === 'string' ? payload.clientId : undefined;
      if (!messageId || !recipientIds) throw new InvalidRealtimeSignal('message signal is missing identifiers');
      const found = await deps.store.findMessage(messageId);
      if (abort.aborted) return;
      // Not stored (yet) on this replica's view, or the conversation vanished: nothing to push; REST history is the fallback.
      if (!found) return;
      const { message, conversation } = found;
      const frame = toMessageDTO(message);
      for (const userId of new Set(eligible(recipientIds, conversation))) {
        if (userId === message.senderId) deps.hub.push(userId, { type: 'MESSAGE', orderId: conversation.orderId, clientId, message: frame });
        else deps.hub.push(userId, { type: 'MESSAGE', orderId: conversation.orderId, message: frame });
      }
      return;
    }
    if (signal.kind === 'moderated') {
      const conversationId = typeof payload.conversationId === 'string' && UUID.test(payload.conversationId) ? payload.conversationId : null;
      const senderId = typeof payload.senderId === 'string' && UUID.test(payload.senderId) ? payload.senderId.toLowerCase() : null;
      const recipientIds = ids(payload.recipientIds);
      if (!conversationId || !senderId || !recipientIds) throw new InvalidRealtimeSignal('moderated signal is missing identifiers');
      const conversation = await deps.store.findById(conversationId);
      if (abort.aborted || !conversation) return;
      // The sender hears ERROR MODERATED on the socket that sent; only the other current participant gets the notice.
      for (const userId of new Set(eligible(recipientIds, conversation))) {
        if (userId !== senderId) {
          deps.hub.push(userId, { type: 'ERROR', orderId: conversation.orderId, eventId: signal.eventId, code: 'MODERATED_PEER', message: MODERATED_PEER_TEXT });
        }
      }
      return;
    }
    throw new InvalidRealtimeSignal(`unknown chat signal kind ${signal.kind}`);
  }

  return { handle };
}

export type ChatDelivery = ReturnType<typeof createChatDelivery>;
