/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Persistence for notifications as the author's design specifies: one insert guarded by the unique event id,
 * listing newest first with an unread count, and mark-read operations scoped to the owning user.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import type { NotificationDTO, NotificationKind, PaginatedResponse } from '@campus-errand/common-dtos';
import type { PrismaClient } from '../database/generated/client';

export interface NewNotification {
  userId: string;
  eventId: string;
  kind: NotificationKind;
  orderId: string;
  orderCode: string | null;
  courierId: string | null;
  title: string;
  body: string;
  /** The event's timestamp. */
  createdAt: string;
}

export type NotificationPage = PaginatedResponse<NotificationDTO> & { unreadCount: number };

export interface NotificationStore {
  /** Returns null when a notification for this event id already exists. */
  insert(notification: NewNotification): Promise<NotificationDTO | null>;
  list(userId: string, options: { unreadOnly: boolean; page: number; limit: number }): Promise<NotificationPage>;
  unreadCount(userId: string): Promise<number>;
  /** Returns null when the notification does not exist or belongs to someone else. */
  markRead(userId: string, id: string): Promise<NotificationDTO | null>;
  markAllRead(userId: string): Promise<number>;
  ping(): Promise<boolean>;
}

interface Row {
  id: string;
  kind: string;
  orderId: string;
  orderCode: string | null;
  courierId: string | null;
  title: string;
  body: string;
  readAt: Date | null;
  createdAt: Date;
}

function toDTO(row: Row): NotificationDTO {
  return {
    id: row.id,
    kind: row.kind as NotificationKind,
    orderId: row.orderId,
    orderCode: row.orderCode,
    courierId: row.courierId,
    title: row.title,
    body: row.body,
    readAt: row.readAt ? row.readAt.toISOString() : null,
    createdAt: row.createdAt.toISOString(),
  };
}

export function createNotificationStore(prisma: PrismaClient): NotificationStore {
  const unreadCount = (userId: string) => prisma.notification.count({ where: { userId, readAt: null } });

  return {
    async insert(n) {
      // The unique index on event_id is the idempotency mechanism: a redelivered event inserts nothing.
      const rows = await prisma.$queryRaw<Row[]>`
        INSERT INTO notifications (user_id, event_id, kind, order_id, order_code, courier_id, title, body, created_at)
        VALUES (${n.userId}::uuid, ${n.eventId}::uuid, ${n.kind}, ${n.orderId}::uuid, ${n.orderCode},
                ${n.courierId}::uuid, ${n.title}, ${n.body}, ${n.createdAt}::timestamptz)
        ON CONFLICT (event_id) DO NOTHING
        RETURNING id, kind, order_id AS "orderId", order_code AS "orderCode", courier_id AS "courierId",
                  title, body, read_at AS "readAt", created_at AS "createdAt"`;
      return rows.length > 0 ? toDTO(rows[0]) : null;
    },

    async list(userId, { unreadOnly, page, limit }) {
      const where = unreadOnly ? { userId, readAt: null } : { userId };
      const [rows, total, unread] = await Promise.all([
        prisma.notification.findMany({
          where,
          orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
          skip: (page - 1) * limit,
          take: limit,
        }),
        prisma.notification.count({ where }),
        unreadCount(userId),
      ]);
      return { items: rows.map(toDTO), total, page, limit, totalPages: Math.ceil(total / limit), unreadCount: unread };
    },

    unreadCount,

    async markRead(userId, id) {
      // Only an unread row is stamped, so reading twice keeps the first read time.
      await prisma.notification.updateMany({ where: { id, userId, readAt: null }, data: { readAt: new Date() } });
      const row = await prisma.notification.findFirst({ where: { id, userId } });
      return row ? toDTO(row) : null;
    },

    async markAllRead(userId) {
      const updated = await prisma.notification.updateMany({ where: { userId, readAt: null }, data: { readAt: new Date() } });
      return updated.count;
    },

    async ping() {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    },
  };
}
