/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Persistence for conversations and messages as the author specified (F8 brief S1 to S3): upsert on
 * order.accepted keyed by order id, set-once timestamps for pickup, delivery and close, and an append with a
 * per-conversation sequence allocated under the conversation row lock. Shape follows notification-service/src/notifications/store.ts.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import type { PrismaClient } from '../database/client';

export interface ConversationRow {
  id: string;
  orderId: string;
  requesterId: string;
  courierId: string;
  createdAt: string;
  pickedUpAt: string | null;
  deliveredAt: string | null;
  closedAt: string | null;
}

export interface MessageRow {
  id: string;
  conversationId: string;
  sequence: number;
  senderId: string;
  senderUsername: string;
  senderRole: string;
  text: string;
  sentAt: string;
}

export interface NewConversation {
  orderId: string;
  requesterId: string;
  courierId: string;
  /** The event's timestamp (or the order's acceptedAt when created from the fallback). */
  createdAt: string;
  closedAt?: string | null;
}

export interface NewMessage {
  conversationId: string;
  senderId: string;
  senderUsername: string;
  senderRole: string;
  text: string;
  sentAt: string;
}

export interface ConversationStore {
  findByOrderId(orderId: string): Promise<ConversationRow | null>;
  /** Creates the row, or on a repeated accept replaces the courier (S1 answer 2); closedAt is left as it is. */
  upsertAccepted(conversation: NewConversation): Promise<ConversationRow>;
  /** Each returns false when no row exists (S3 answer 3: ignored) or the timestamp was already set. */
  markPickedUp(orderId: string, at: string): Promise<boolean>;
  markDelivered(orderId: string, at: string): Promise<boolean>;
  close(orderId: string, at: string): Promise<boolean>;
  /** Appends with the next sequence number of the conversation. */
  append(message: NewMessage): Promise<MessageRow>;
  /** Messages in sequence order, from `afterSequence` exclusive, at most `limit`. */
  listMessages(conversationId: string, options: { afterSequence: number; limit: number }): Promise<MessageRow[]>;
  ping(): Promise<boolean>;
}

type ConversationRecord = {
  id: string; orderId: string; requesterId: string; courierId: string;
  createdAt: Date; pickedUpAt: Date | null; deliveredAt: Date | null; closedAt: Date | null;
};
type MessageRecord = {
  id: string; conversationId: string; sequence: number; senderId: string; senderUsername: string;
  senderRole: string; text: string; sentAt: Date;
};

const iso = (value: Date | null) => (value ? value.toISOString() : null);

export function toConversationRow(record: ConversationRecord): ConversationRow {
  return {
    id: record.id,
    orderId: record.orderId,
    requesterId: record.requesterId,
    courierId: record.courierId,
    createdAt: record.createdAt.toISOString(),
    pickedUpAt: iso(record.pickedUpAt),
    deliveredAt: iso(record.deliveredAt),
    closedAt: iso(record.closedAt),
  };
}

export function toMessageRow(record: MessageRecord): MessageRow {
  return { ...record, sentAt: record.sentAt.toISOString() };
}


export function createConversationStore(prisma: PrismaClient): ConversationStore {
  return {
    async findByOrderId(orderId) {
      const row = await prisma.conversation.findUnique({ where: { orderId } });
      return row ? toConversationRow(row) : null;
    },

    async upsertAccepted(conversation) {
      const row = await prisma.conversation.upsert({
        where: { orderId: conversation.orderId },
        create: {
          orderId: conversation.orderId,
          requesterId: conversation.requesterId,
          courierId: conversation.courierId,
          createdAt: new Date(conversation.createdAt),
          closedAt: conversation.closedAt ? new Date(conversation.closedAt) : null,
        },
        update: { courierId: conversation.courierId },
      });
      return toConversationRow(row);
    },

    async markPickedUp(orderId, at) {
      const result = await prisma.conversation.updateMany({ where: { orderId, pickedUpAt: null }, data: { pickedUpAt: new Date(at) } });
      return result.count === 1;
    },

    async markDelivered(orderId, at) {
      const result = await prisma.conversation.updateMany({ where: { orderId, deliveredAt: null }, data: { deliveredAt: new Date(at) } });
      return result.count === 1;
    },

    async close(orderId, at) {
      const result = await prisma.conversation.updateMany({ where: { orderId, closedAt: null }, data: { closedAt: new Date(at) } });
      return result.count === 1;
    },

    async append(message) {
      // Appends to one conversation are serialised on its row lock, so the next sequence number is read and
      // written without a gap or a duplicate; the unique (conversationId, sequence) index is the backstop.
      const row = await prisma.$transaction(async (tx) => {
        await tx.$queryRaw`SELECT id FROM conversations WHERE id = ${message.conversationId}::uuid FOR UPDATE`;
        const last = await tx.message.aggregate({ where: { conversationId: message.conversationId }, _max: { sequence: true } });
        return tx.message.create({
          data: { ...message, sequence: (last._max.sequence ?? 0) + 1, sentAt: new Date(message.sentAt) },
        });
      });
      return toMessageRow(row);
    },

    async listMessages(conversationId, options) {
      const rows = await prisma.message.findMany({
        where: { conversationId, sequence: { gt: options.afterSequence } },
        orderBy: { sequence: 'asc' },
        take: options.limit,
      });
      return rows.map(toMessageRow);
    },

    async ping() {
      try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    },
  };
}
