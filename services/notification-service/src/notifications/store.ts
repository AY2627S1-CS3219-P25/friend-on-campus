/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Rewritten for the author's Notification Redesign (§5, §7, §8): applyEvent() claims (producer, event_id),
 * checks the payload fingerprint, advances the per-order attention projection only on a newer version and inserts
 * one row per recipient, all in one transaction; list() adds the action_needed/important views, orders by stored_at
 * and takes items, total and unreadCount from one snapshot; mark-read operations return the authoritative unread count.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Imported PrismaClient type from ../database/client instead of directly from generated folder.
 * Author review: <to be completed by author after review>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Persistence for notifications as the author's design specifies: one insert guarded by the unique event id,
 * listing newest first with an unread count, and mark-read operations scoped to the owning user.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by yanhwee)
// AI-generated (edited by Reallyeasy1)
import type {
  NotificationActionType,
  NotificationCategory,
  NotificationDTO,
  NotificationKind,
  NotificationPageDTO,
  NotificationPriority,
  NotificationView,
  OrderStatus,
} from '@campus-errand/common-dtos';
import { Prisma, type PrismaClient } from '../database/client';

/** One intended recipient of one event, as the policy decided it. */
export interface NotificationDraft {
  userId: string;
  kind: NotificationKind;
  title: string;
  body: string;
  category: NotificationCategory;
  priority: NotificationPriority;
  actionType: NotificationActionType | null;
}

/** What applyEvent records about the event itself, independent of how many recipients it has. */
export interface ProcessedEventInput {
  producer: 'order-service' | 'credit-service';
  eventId: string;
  /** sha256 of the normalized event; the same id with another fingerprint is a contract error. */
  fingerprint: string;
  schemaVersion: 1 | 2;
  policyVersion: number;
  orderId: string;
  orderCode: string | null;
  courierId: string | null;
  /** The event's timestamp, stored as created_at. */
  occurredAt: string;
  /** Version-2 events carry the committed order state; the projection advances only on a newer version. */
  projection?: { orderVersion: number; status: OrderStatus; requesterId: string; courierId: string | null };
}

export interface CreatedNotification {
  userId: string;
  notification: NotificationDTO;
}

export type AppliedEvent =
  | { outcome: 'created' | 'suppressed'; created: CreatedNotification[]; stale: boolean }
  | { outcome: 'duplicate'; created: []; stale: false };

/** The same event id arrived with different content. Permanent: dead-letter it. */
export class ContractMismatch extends Error {}

export interface NotificationStore {
  /** One transaction: claim the event, advance the projection, insert every recipient row. */
  applyEvent(event: ProcessedEventInput, drafts: NotificationDraft[]): Promise<AppliedEvent>;
  list(
    userId: string,
    options: { view: NotificationView; unreadOnly: boolean; page: number; limit: number },
  ): Promise<NotificationPageDTO>;
  unreadCount(userId: string): Promise<number>;
  /** Returns null when the notification does not exist or belongs to someone else. */
  markRead(userId: string, id: string): Promise<{ notification: NotificationDTO; unreadCount: number } | null>;
  /** Marks the rows stored so far; a row that arrives afterwards stays unread. */
  markAllRead(userId: string): Promise<{ updated: number; unreadCount: number }>;
  ping(): Promise<boolean>;
}

interface Row {
  id: string;
  producer: string;
  kind: string;
  orderId: string;
  orderCode: string | null;
  courierId: string | null;
  title: string;
  body: string;
  category: string;
  priority: string;
  actionType: string | null;
  targetId: string | null;
  sourceVersion: number | null;
  readAt: Date | null;
  createdAt: Date;
  storedAt: Date;
  orderStatus: string | null;
}

// Selected from the notifications table aliased as n.
const COLUMNS = Prisma.sql`n.id, n.producer, n.kind, n.order_id AS "orderId", n.order_code AS "orderCode",
  n.courier_id AS "courierId", n.title, n.body, n.category, n.priority, n.action_type AS "actionType",
  n.target_id AS "targetId", n.source_version AS "sourceVersion", n.read_at AS "readAt",
  n.created_at AS "createdAt", n.stored_at AS "storedAt"`;
const PROJECTED_STATUS = Prisma.sql`(SELECT s.status FROM order_notification_state s WHERE s.order_id = n.order_id) AS "orderStatus"`;

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
    producer: row.producer,
    category: row.category as NotificationCategory,
    priority: row.priority as NotificationPriority,
    actionType: row.actionType as NotificationActionType | null,
    targetId: row.targetId,
    sourceVersion: row.sourceVersion,
    storedAt: row.storedAt.toISOString(),
    orderStatus: row.orderStatus as OrderStatus | null,
  };
}

export function createNotificationStore(prisma: PrismaClient): NotificationStore {
  const unreadSql = (userId: string) =>
    prisma.$queryRaw<{ unread: number }[]>`SELECT count(*)::int AS unread FROM notifications WHERE user_id = ${userId}::uuid AND read_at IS NULL`;

  return {
    async applyEvent(event, drafts) {
      return prisma.$transaction(async (tx) => {
        // 1. Claim the event. A concurrent claim on the same key blocks here until it commits, then yields no row.
        const claimed = await tx.$queryRaw<{ event_id: string }[]>`
          INSERT INTO processed_notification_events (producer, event_id, fingerprint, schema_version, policy_version, outcome)
          VALUES (${event.producer}, ${event.eventId}::uuid, ${event.fingerprint}, ${event.schemaVersion}, ${event.policyVersion}, 'processing')
          ON CONFLICT DO NOTHING
          RETURNING event_id`;
        if (claimed.length === 0) {
          const [existing] = await tx.$queryRaw<{ fingerprint: string | null }[]>`
            SELECT fingerprint FROM processed_notification_events
            WHERE producer = ${event.producer} AND event_id = ${event.eventId}::uuid`;
          // A legacy row has no fingerprint to compare against: an identical replay is the only safe reading.
          if (existing?.fingerprint && existing.fingerprint !== event.fingerprint) {
            throw new ContractMismatch(`Event ${event.eventId} was already processed with different content`);
          }
          return { outcome: 'duplicate', created: [], stale: false };
        }

        // 2. The projection moves forward only. An older event still stores history below, but is "stale":
        //    it must not push a live frame or revive an action the newer state resolved.
        let stale = false;
        if (event.projection) {
          const p = event.projection;
          const moved = await tx.$queryRaw<{ order_id: string }[]>`
            INSERT INTO order_notification_state (order_id, highest_order_version, status, requester_id, courier_id)
            VALUES (${event.orderId}::uuid, ${p.orderVersion}, ${p.status}, ${p.requesterId}::uuid, ${p.courierId}::uuid)
            ON CONFLICT (order_id) DO UPDATE SET
              highest_order_version = EXCLUDED.highest_order_version,
              status = EXCLUDED.status,
              requester_id = EXCLUDED.requester_id,
              courier_id = EXCLUDED.courier_id,
              updated_at = now()
            WHERE order_notification_state.highest_order_version < EXCLUDED.highest_order_version
            RETURNING order_id`;
          stale = moved.length === 0;
        }
        const [state] = await tx.$queryRaw<{ status: string }[]>`
          SELECT status FROM order_notification_state WHERE order_id = ${event.orderId}::uuid`;
        const orderStatus = state?.status ?? null;

        // 3. One row per recipient. The unique key makes a partial replay (crash after some inserts) converge.
        const created: CreatedNotification[] = [];
        for (const d of drafts) {
          const rows = await tx.$queryRaw<Row[]>`
            INSERT INTO notifications AS n (user_id, producer, event_id, kind, order_id, order_code, courier_id, title, body,
                                            category, priority, action_type, target_id, source_version, created_at)
            VALUES (${d.userId}::uuid, ${event.producer}, ${event.eventId}::uuid, ${d.kind}, ${event.orderId}::uuid,
                    ${event.orderCode}, ${event.courierId}::uuid, ${d.title}, ${d.body}, ${d.category}, ${d.priority},
                    ${d.actionType}, ${event.orderId}::uuid, ${event.projection?.orderVersion ?? null},
                    ${event.occurredAt}::timestamptz)
            ON CONFLICT (producer, event_id, user_id, kind) DO NOTHING
            RETURNING ${COLUMNS}`;
          if (rows[0]) created.push({ userId: d.userId, notification: toDTO({ ...rows[0], orderStatus }) });
        }

        const outcome = drafts.length > 0 ? 'created' : 'suppressed';
        await tx.$executeRaw`
          UPDATE processed_notification_events SET outcome = ${outcome}
          WHERE producer = ${event.producer} AND event_id = ${event.eventId}::uuid`;
        return { outcome, created, stale };
      });
    },

    async list(userId, { view, unreadOnly, page, limit }) {
      const filter = Prisma.sql`n.user_id = ${userId}::uuid
        ${unreadOnly ? Prisma.sql`AND n.read_at IS NULL` : Prisma.empty}
        ${view === 'action_needed'
          ? Prisma.sql`AND n.action_type = 'REVIEW_DELIVERY' AND (s.status IS NULL OR s.status = 'DELIVERED')`
          : view === 'important'
            ? Prisma.sql`AND n.category = 'IMPORTANT'`
            : Prisma.empty}`;
      const from = Prisma.sql`FROM notifications n LEFT JOIN order_notification_state s ON s.order_id = n.order_id WHERE ${filter}`;
      // One transaction, so items, total and unreadCount describe the same snapshot.
      const [rows, [{ total }], [{ unread }]] = await prisma.$transaction([
        prisma.$queryRaw<Row[]>`SELECT ${COLUMNS}, s.status AS "orderStatus" ${from}
          ORDER BY n.stored_at DESC, n.id DESC LIMIT ${limit} OFFSET ${(page - 1) * limit}`,
        prisma.$queryRaw<{ total: number }[]>`SELECT count(*)::int AS total ${from}`,
        unreadSql(userId),
      ]);
      return { items: rows.map(toDTO), total, page, limit, totalPages: Math.ceil(total / limit), unreadCount: unread };
    },

    async unreadCount(userId) {
      const [{ unread }] = await unreadSql(userId);
      return unread;
    },

    async markRead(userId, id) {
      // Only an unread row is stamped, so reading twice keeps the first read time.
      const [rows, [{ unread }]] = await prisma.$transaction([
        prisma.$queryRaw<Row[]>`
          UPDATE notifications AS n SET read_at = COALESCE(n.read_at, now())
          WHERE n.id = ${id}::uuid AND n.user_id = ${userId}::uuid
          RETURNING ${COLUMNS}, ${PROJECTED_STATUS}`,
        unreadSql(userId),
      ]);
      return rows[0] ? { notification: toDTO(rows[0]), unreadCount: unread } : null;
    },

    async markAllRead(userId) {
      const [updated, [{ unread }]] = await prisma.$transaction([
        prisma.$executeRaw`
          UPDATE notifications SET read_at = now()
          WHERE user_id = ${userId}::uuid AND read_at IS NULL AND stored_at <= now()`,
        unreadSql(userId),
      ]);
      return { updated, unreadCount: unread };
    },

    async ping() {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    },
  };
}
