/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Per the author's Notification Service Design: order.delivered is bound and validated, toNotification maps
 * accepted, in_transit and delivered to a notification (titles from the design, body text added), and createDeliver
 * stores the row before pushing it.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-03
 * Scope: Validates order lifecycle events from campus.events (same rules as credit-service/src/credits/events.ts on PR #91)
 * and wires them to the copied RabbitMQ consumer. The routing-key-to-notification mapping (toNotification) is left for the
 * author to write; until then every valid event is acknowledged without producing a notification.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import type { NotificationDTO, NotificationKind } from '@campus-errand/common-dtos';
import { startRabbitConsumer, type Failure, type MessagingConfig } from '../messaging/rabbitmq';
import type { NotificationStore } from './store';

export class InvalidNotificationEvent extends Error {}

/** Every order.* key the notification_service broker account may read. Unmapped keys are acknowledged and ignored. */
export const notificationRoutingKeys = [
  'order.created',
  'order.accepted',
  'order.in_transit',
  'order.delivered',
  'order.completed',
  'order.cancelled',
  'order.expired',
] as const;
export type NotificationRoutingKey = (typeof notificationRoutingKeys)[number];

/** The subset of the shared order event DTOs this service reads. */
export interface OrderEvent {
  eventId: string;
  eventType: NotificationRoutingKey;
  timestamp: string;
  orderId: string;
  orderCode?: string;
  requesterId: string;
  courierId?: string;
}

// Will move to @campus-errand/common-dtos as NotificationKind in the shared-contract PR.
export interface NotificationDraft {
  kind: NotificationKind;
  title: string;
  body: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function uuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new InvalidNotificationEvent(`${field} must be a UUID`);
  return value.toLowerCase();
}

function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !ISO_UTC.test(value)) {
    throw new InvalidNotificationEvent('timestamp must be a UTC ISO-8601 timestamp');
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new InvalidNotificationEvent('timestamp is not a valid calendar date');
  return date.toISOString();
}

export function parseOrderEvent(content: Buffer, routingKey: string): OrderEvent {
  let input: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(content.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    input = parsed as Record<string, unknown>;
  } catch {
    throw new InvalidNotificationEvent('Message must be a JSON object');
  }
  if (!notificationRoutingKeys.includes(routingKey as NotificationRoutingKey) || input.eventType !== routingKey) {
    throw new InvalidNotificationEvent('Unsupported or mismatched event type and routing key');
  }
  const eventType = routingKey as NotificationRoutingKey;
  const event: OrderEvent = {
    eventId: uuid(input.eventId, 'eventId'),
    eventType,
    timestamp: timestamp(input.timestamp),
    orderId: uuid(input.orderId, 'orderId'),
    requesterId: uuid(input.requesterId, 'requesterId'),
  };
  // orderCode is optional until the shared DTOs carry it on every order event.
  if (input.orderCode !== undefined) {
    if (typeof input.orderCode !== 'string' || input.orderCode.length === 0 || input.orderCode.length > 32) {
      throw new InvalidNotificationEvent('orderCode must be a non-empty string');
    }
    event.orderCode = input.orderCode;
  }
  if (eventType === 'order.accepted' || eventType === 'order.in_transit' || eventType === 'order.delivered' || eventType === 'order.completed') {
    event.courierId = uuid(input.courierId, 'courierId');
  }
  return event;
}

/**
 * Map a validated event to what the requester should see, or null when this event is not a notification (F5).
 *
 * TODO(author): fill in the three F5 cases. The wording here is what the requester reads, so it is yours to decide:
 *   order.accepted   -> ORDER_ACCEPTED   (F5.1.1: identify the errand and its assigned courier)
 *   order.in_transit -> ORDER_PICKED_UP  (F5.2.1: identify the errand whose status changed)
 *   order.delivered  -> ORDER_DELIVERED  (F5.3.1: prompt the requester to review and confirm delivery)
 * `order.delivered` is not yet a routing key; add it here and to notificationRoutingKeys once the shared DTO exists.
 * Use event.orderCode when present and fall back to a short form of event.orderId when it is not.
 */
// AI-generated (edited by Reallyeasy1)
// F5.1 to F5.3: the three events the requester is told about. Every other order.* key is acknowledged without
// a notification until a requirement asks for one. Title and body are fixed text per kind, stored as rendered.
export function toNotification(event: OrderEvent): NotificationDraft | null {
  const errand = event.orderCode ? `Your errand ${event.orderCode}` : 'Your errand';
  switch (event.eventType) {
    case 'order.accepted':
      return { kind: 'ORDER_ACCEPTED', title: `${errand} was accepted`, body: 'A courier has been assigned to your errand.' };
    case 'order.in_transit':
      return { kind: 'ORDER_PICKED_UP', title: `${errand} was picked up`, body: 'Your courier has the items and is on the way.' };
    case 'order.delivered':
      return { kind: 'ORDER_DELIVERED', title: `${errand} was delivered`, body: 'Review the delivery and confirm it.' };
    default:
      return null;
  }
}

export function classifyNotificationFailure(error: unknown): Failure {
  if (error instanceof InvalidNotificationEvent) return { category: 'permanent', reason: 'invalid_event' };
  return { category: 'transient', reason: 'processing_failure' };
}

export type Deliver = (event: OrderEvent, draft: NotificationDraft) => Promise<void>;

// AI-generated (edited by Reallyeasy1)
// The row is written before the push, so a crash between the two loses nothing: the client's next fetch finds it.
// A null insert means this eventId is already stored (a redelivery), and nothing is pushed again.
export function createDeliver(
  store: Pick<NotificationStore, 'insert'>,
  push: (userId: string, notification: NotificationDTO) => unknown,
): Deliver {
  return async (event, draft) => {
    const saved = await store.insert({
      userId: event.requesterId,
      eventId: event.eventId,
      kind: draft.kind,
      orderId: event.orderId,
      orderCode: event.orderCode ?? null,
      courierId: event.courierId ?? null,
      title: draft.title,
      body: draft.body,
      createdAt: event.timestamp,
    });
    if (saved) push(event.requesterId, saved);
  };
}

export function createNotificationEventHandler(deliver: Deliver) {
  return async (content: Buffer, routingKey: string) => {
    const event = parseOrderEvent(content, routingKey);
    const draft = toNotification(event);
    if (draft) await deliver(event, draft);
  };
}

export function startNotificationConsumer(messaging: MessagingConfig, deliver: Deliver, onFatal?: () => void) {
  return startRabbitConsumer(messaging, {
    routingKeys: notificationRoutingKeys,
    handle: createNotificationEventHandler(deliver),
    classify: classifyNotificationFailure,
    onFatal,
  });
}
