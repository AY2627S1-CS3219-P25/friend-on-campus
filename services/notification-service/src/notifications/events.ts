/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-03
 * Scope: Validates order lifecycle events from campus.events (same rules as credit-service/src/credits/events.ts on PR #91)
 * and wires them to the copied RabbitMQ consumer. The routing-key-to-notification mapping (toNotification) is left for the
 * author to write; until then every valid event is acknowledged without producing a notification.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { startRabbitConsumer, type Failure, type MessagingConfig } from '../messaging/rabbitmq';

export class InvalidNotificationEvent extends Error {}

/** Every order.* key the notification_service broker account may read. Unmapped keys are acknowledged and ignored. */
export const notificationRoutingKeys = [
  'order.created',
  'order.accepted',
  'order.in_transit',
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
export type NotificationKind = 'ORDER_ACCEPTED' | 'ORDER_PICKED_UP' | 'ORDER_DELIVERED';

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
  if (eventType === 'order.accepted' || eventType === 'order.in_transit' || eventType === 'order.completed') {
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
export function toNotification(_event: OrderEvent): NotificationDraft | null {
  return null;
}

export function classifyNotificationFailure(error: unknown): Failure {
  if (error instanceof InvalidNotificationEvent) return { category: 'permanent', reason: 'invalid_event' };
  return { category: 'transient', reason: 'processing_failure' };
}

export type Deliver = (event: OrderEvent, draft: NotificationDraft) => Promise<void>;

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
