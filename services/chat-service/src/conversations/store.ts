/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Persistence for conversations and messages as the author specified (F8 brief S1 to S3): upsert on
 * order.accepted keyed by order id, set-once timestamps for pickup, delivery and close, and an append with a
 * per-conversation sequence allocated under the conversation row lock. Shape follows notification-service/src/notifications/store.ts.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fixes (PR #148 P1, P2): upsertAccepted replaces the courier only for an accept newer than
 * courierSince and reports whether it applied; append re-reads the participants and closedAt under the row lock it
 * already takes, refuses a closed conversation or a non-participant there, and returns the recipients from that
 * locked state.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Review fixes (PR #148, second round): upsertAccepted re-runs its guard when the row it finds was inserted
 * concurrently and is older than this accept, and applies a supplied closedAt (the terminal Order fallback) to an
 * existing row set-once, so a fallback racing an event-created row does not leave it open.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import type { PrismaClient } from '../database/client';

export interface ConversationRow {
  id: string;
  orderId: string;
  requesterId: string;
  courierId: string;
  /** When the current courier was assigned (the accept event's timestamp). */
  courierSince: string;
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
  /** The accept event's timestamp (or the order's acceptedAt when created from the fallback). */
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

export type UpsertResult = {
  conversation: ConversationRow;
  /** 'ignored' when the accept is not newer than the courier already recorded (a replay or an older event). */
  outcome: 'created' | 'recouriered' | 'ignored';
};

export type AppendResult =
  | { kind: 'appended'; message: MessageRow; recipientIds: string[] }
  | { kind: 'not_found' }
  | { kind: 'forbidden' }
  | { kind: 'closed' };

export interface ConversationStore {
  findByOrderId(orderId: string): Promise<ConversationRow | null>;
  /**
   * Creates the row, or on a later accept replaces the courier (S1 answer 2). An accept whose timestamp is not after
   * courierSince is ignored, so a redelivered or older event cannot restore a former courier. A supplied closedAt
   * (the terminal Order fallback) is applied set-once to a new or an existing row; otherwise closedAt is left as it is.
   */
  upsertAccepted(conversation: NewConversation): Promise<UpsertResult>;
  /** Each returns false when no row exists (S3 answer 3: ignored) or the timestamp was already set. */
  markPickedUp(orderId: string, at: string): Promise<boolean>;
  markDelivered(orderId: string, at: string): Promise<boolean>;
  close(orderId: string, at: string): Promise<boolean>;
  /**
   * Appends with the next sequence number of the conversation, after re-checking under the row lock that the sender
   * is still a participant and the conversation is still open; the recipients come from that locked row.
   */
  append(message: NewMessage): Promise<AppendResult>;
  /** Messages in sequence order, from `afterSequence` exclusive, at most `limit`. */
  listMessages(conversationId: string, options: { afterSequence: number; limit: number }): Promise<MessageRow[]>;
  ping(): Promise<boolean>;
}

type ConversationRecord = {
  id: string; orderId: string; requesterId: string; courierId: string; courierSince: Date;
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
    courierSince: record.courierSince.toISOString(),
    createdAt: record.createdAt.toISOString(),
    pickedUpAt: iso(record.pickedUpAt),
    deliveredAt: iso(record.deliveredAt),
    closedAt: iso(record.closedAt),
  };
}

export function toMessageRow(record: MessageRecord): MessageRow {
  return { ...record, sentAt: record.sentAt.toISOString() };
}

/** The participant and closure state a send must be validated against; shared by the Prisma and in-memory stores. */
export function checkAppend(
  row: { requesterId: string; courierId: string; closedAt: string | Date | null } | null,
  senderId: string,
): { kind: 'ok'; recipientIds: string[] } | { kind: 'not_found' } | { kind: 'forbidden' } | { kind: 'closed' } {
  if (!row) return { kind: 'not_found' };
  if (row.requesterId !== senderId && row.courierId !== senderId) return { kind: 'forbidden' };
  if (row.closedAt) return { kind: 'closed' };
  return { kind: 'ok', recipientIds: [row.requesterId === senderId ? row.courierId : row.requesterId] };
}

export function createConversationStore(prisma: PrismaClient): ConversationStore {
  return {
    async findByOrderId(orderId) {
      const row = await prisma.conversation.findUnique({ where: { orderId } });
      return row ? toConversationRow(row) : null;
    },

    async upsertAccepted(conversation) {
      const at = new Date(conversation.createdAt);
      const where = { orderId: conversation.orderId };
      // An existing row changes courier only for an accept newer than the one recorded (P1: no replay rollback).
      const updated = await prisma.conversation.updateMany({
        where: { ...where, courierSince: { lt: at } },
        data: { courierId: conversation.courierId, courierSince: at },
      });
      let outcome: UpsertResult['outcome'] = 'recouriered';
      if (updated.count === 0) {
        const existing = await prisma.conversation.findUnique({ where });
        if (!existing) {
          try {
            const created = await prisma.conversation.create({
              data: {
                ...where,
                requesterId: conversation.requesterId,
                courierId: conversation.courierId,
                courierSince: at,
                createdAt: at,
                closedAt: conversation.closedAt ? new Date(conversation.closedAt) : null,
              },
            });
            return { conversation: toConversationRow(created), outcome: 'created' };
          } catch (error) {
            // Two first accepts for one order raced on the unique order id; the other one won, so apply this one as an update.
            if (!(error instanceof Error && 'code' in error && (error as { code?: string }).code === 'P2002')) throw error;
            return this.upsertAccepted(conversation);
          }
        }
        // No match can also mean the row was inserted between the UPDATE and this read; if that row is older than this
        // accept the guard has not been applied yet, so run it again instead of reporting a replay.
        if (existing.courierSince < at) return this.upsertAccepted(conversation);
        outcome = 'ignored';
      }
      // The terminal fallback's closure applies even when an event created the row meanwhile (set-once, like close()).
      if (conversation.closedAt) await this.close(conversation.orderId, conversation.closedAt);
      const row = await prisma.conversation.findUniqueOrThrow({ where });
      return { conversation: toConversationRow(row), outcome };
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
      // written without a gap or a duplicate; the unique (conversationId, sequence) index is the backstop. The same
      // lock is where the participants and closedAt are re-read (P2): a close or re-courier committed after the
      // caller's first read is seen here, and the recipients come from this state, not the stale one.
      return prisma.$transaction(async (tx): Promise<AppendResult> => {
        const locked = await tx.$queryRaw<{ requester_id: string; courier_id: string; closed_at: Date | null }[]>`
          SELECT requester_id, courier_id, closed_at FROM conversations WHERE id = ${message.conversationId}::uuid FOR UPDATE`;
        const row = locked[0] ? { requesterId: locked[0].requester_id, courierId: locked[0].courier_id, closedAt: locked[0].closed_at } : null;
        const check = checkAppend(row, message.senderId);
        if (check.kind !== 'ok') return check;
        const last = await tx.message.aggregate({ where: { conversationId: message.conversationId }, _max: { sequence: true } });
        const created = await tx.message.create({
          data: { ...message, sequence: (last._max.sequence ?? 0) + 1, sentAt: new Date(message.sentAt) },
        });
        return { kind: 'appended', message: toMessageRow(created), recipientIds: check.recipientIds };
      });
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
