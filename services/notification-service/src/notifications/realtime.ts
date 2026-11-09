/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
 * Scope: Subscriber-side delivery for cross-replica notification signals (issue #241, wiki section 4): a
 *        `notifications` signal re-reads each created row for its owner and pushes NOTIFICATION only when the event
 *        was not stale and the row is still unread, then INBOX_CHANGED to every recipient; an `inbox_changed` signal
 *        pushes INBOX_CHANGED to the user's local sockets. The signal builders live here so the store and the
 *        subscriber agree on one shape. PR #246 review: a row whose action the order's current state has already
 *        resolved by the time its signal is handled (a delivery review after completion) is not pushed; its recipient
 *        still gets the inbox hint. Progress notices are pushed however quickly later ones follow (F5.1 to F5.3).
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { randomUUID } from 'node:crypto';
import type { NotificationDTO } from '@campus-errand/common-dtos';
import type { RealtimeSignal } from '@campus-errand/messaging';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface NotificationsSignalPayload {
  producer: string;
  /** Rows the event created, per recipient; identifiers only, the subscriber re-reads them. */
  created: { userId: string; notificationId: string }[];
  /** Every recipient the event addressed (created or already present): each gets an inbox refresh hint. */
  recipientIds: string[];
  /** The event was older than the projection: history only, no toast. */
  stale: boolean;
}

export interface InboxChangedSignalPayload {
  userId: string;
}

/** Event id doubles as the stable signal id: one business event, one signal, replay recognised. */
export function notificationsSignal(eventId: string, payload: NotificationsSignalPayload): RealtimeSignal {
  return { eventId, kind: 'notifications', payload: { ...payload } };
}

export function inboxChangedSignal(userId: string): RealtimeSignal {
  const payload: InboxChangedSignalPayload = { userId };
  return { eventId: randomUUID(), kind: 'inbox_changed', payload: { ...payload } };
}

export class InvalidRealtimeSignal extends Error {}

export interface NotificationDeliveryHub {
  push(userId: string, notification: NotificationDTO): number;
  inboxChanged(userId: string): number;
}

export interface NotificationReader {
  /** The row as stored now, only when it belongs to `userId`, and whether the order's current state already resolved its action. */
  findForUser(userId: string, id: string): Promise<{ notification: NotificationDTO; actionResolved: boolean } | null>;
}

export function createNotificationDelivery(deps: { store: NotificationReader; hub: NotificationDeliveryHub }) {
  async function handle(signal: RealtimeSignal, abort: AbortSignal): Promise<void> {
    const payload = signal.payload;
    if (signal.kind === 'notifications') {
      const created = Array.isArray(payload.created) ? payload.created : null;
      const recipientIds = Array.isArray(payload.recipientIds) ? payload.recipientIds : null;
      if (!created || !recipientIds || created.length > 16 || recipientIds.length > 16) throw new InvalidRealtimeSignal('notifications signal is malformed');
      const stale = payload.stale === true;
      if (!stale) {
        for (const item of created as unknown[]) {
          const entry = item as { userId?: unknown; notificationId?: unknown };
          if (typeof entry.userId !== 'string' || !UUID.test(entry.userId) || typeof entry.notificationId !== 'string' || !UUID.test(entry.notificationId)) {
            throw new InvalidRealtimeSignal('notifications signal names an invalid row');
          }
          // Re-read for the owner: a row read, deleted or re-owned since the event was handled is never toasted. Nor is
          // one asking for an action the order has since resolved while the intent waited: `stale` was decided at
          // commit time and cannot know that. A newer version alone is not enough: progress notices that arrive in a
          // burst must each be pushed (F5.1 to F5.3).
          const found = await deps.store.findForUser(entry.userId.toLowerCase(), entry.notificationId.toLowerCase());
          if (abort.aborted) return;
          if (found && !found.actionResolved && found.notification.readAt === null) deps.hub.push(entry.userId.toLowerCase(), found.notification);
        }
      }
      for (const userId of new Set(recipientIds as unknown[])) {
        if (typeof userId !== 'string' || !UUID.test(userId)) throw new InvalidRealtimeSignal('notifications signal names an invalid recipient');
        deps.hub.inboxChanged(userId.toLowerCase());
      }
      return;
    }
    if (signal.kind === 'inbox_changed') {
      if (typeof payload.userId !== 'string' || !UUID.test(payload.userId)) throw new InvalidRealtimeSignal('inbox_changed signal names an invalid user');
      deps.hub.inboxChanged(payload.userId.toLowerCase());
      return;
    }
    throw new InvalidRealtimeSignal(`unknown notification signal kind ${signal.kind}`);
  }

  return { handle };
}

export type NotificationDelivery = ReturnType<typeof createNotificationDelivery>;
