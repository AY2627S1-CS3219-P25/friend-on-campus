/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Per the author's Notification Redesign (§5, §6, §8, §10): version-2 parsing (envelope, actor, reason code,
 * committed versions, assignee fields) next to the unchanged version-1 rules, order.rejected and order.unassigned
 * routing keys, a canonical payload fingerprint, the shared infrastructure classifier, and createDeliver() running
 * the policy plus the one-transaction store write before pushing NOTIFICATION and INBOX_CHANGED frames.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-17
 * Scope: parseOrderEvent validates the optional courierUsername (1–50 characters) and toNotification names the
 * courier in the acceptance body, falling back to the previous wording (F5.1.1, author's design and copy).
 * Author review: <to be completed by Reallyeasy1>
 *
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
import { createHash } from 'node:crypto';
import type { NotificationDTO, OrderActorRole, OrderReasonCode, OrderStatus } from '@campus-errand/common-dtos';
import { isInfrastructureFailure, startRabbitConsumer, type Failure, type MessagingConfig } from '@campus-errand/messaging';
import { POLICY_VERSION, toNotifications } from './policy';
import { ContractMismatch, type NotificationStore } from './store';

export class InvalidNotificationEvent extends Error {}

/** Every order.* key the notification_service broker account may read. */
export const notificationRoutingKeys = [
  'order.created',
  'order.accepted',
  'order.in_transit',
  'order.delivered',
  'order.completed',
  'order.cancelled',
  'order.expired',
  'order.rejected',
  'order.unassigned',
] as const;
export type NotificationRoutingKey = (typeof notificationRoutingKeys)[number];

/** A message without schemaVersion: the contract Order Service published before the redesign. */
export interface OrderEventV1 {
  schemaVersion: 1;
  eventId: string;
  eventType: NotificationRoutingKey;
  timestamp: string;
  orderId: string;
  orderCode?: string;
  requesterId: string;
  courierId?: string;
  /** The courier's display name from their access token; absent on events from tokens that predate it (F5.1.1). */
  courierUsername?: string;
  actorId?: undefined;
}

/** schemaVersion 2 (Notification Redesign §6): the full contract is required. */
export interface OrderEventV2 extends Omit<OrderEventV1, 'schemaVersion' | 'orderCode' | 'actorId'> {
  schemaVersion: 2;
  producer: 'order-service';
  orderCode: string;
  orderVersion: number;
  previousStatus: OrderStatus;
  status: OrderStatus;
  actorRole: OrderActorRole;
  actorId?: string;
  reasonCode?: OrderReasonCode;
  correlationId: string;
  priorCourierId?: string;
}

export type OrderEvent = OrderEventV1 | OrderEventV2;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;
const STATUSES: readonly string[] = ['PENDING', 'OPEN', 'ACCEPTED', 'IN_TRANSIT', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'EXPIRED', 'REJECTED', 'DISPUTED'];
const ACTOR_ROLES: readonly string[] = ['STUDENT', 'ADMIN', 'SYSTEM'];
const REASON_CODES: readonly string[] = [
  'REQUESTER_CANCELLED', 'ADMIN_CANCELLED', 'COURIER_DROPPED', 'ADMIN_UNASSIGNED', 'OPEN_EXPIRED', 'PUBLICATION_EXPIRED',
  'INSUFFICIENT_CREDITS', 'RESERVATION_FAILED', 'REQUESTER_CONFIRMED', 'ADMIN_CONFIRMED',
];
/** Keys whose courier is the acting or assigned courier and therefore required. */
const COURIER_REQUIRED: readonly string[] = ['order.accepted', 'order.in_transit', 'order.delivered', 'order.completed'];
const REASON_REQUIRED: readonly string[] = ['order.rejected', 'order.unassigned', 'order.cancelled', 'order.expired', 'order.completed'];

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

function oneOf<T extends string>(value: unknown, allowed: readonly string[], field: string): T {
  if (typeof value !== 'string' || !allowed.includes(value)) throw new InvalidNotificationEvent(`${field} is not an allowed value`);
  return value as T;
}

function orderCode(value: unknown): string {
  if (typeof value !== 'string' || value.length === 0 || value.length > 32) {
    throw new InvalidNotificationEvent('orderCode must be a non-empty string');
  }
  return value;
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
  const base = {
    eventId: uuid(input.eventId, 'eventId'),
    eventType,
    timestamp: timestamp(input.timestamp),
    orderId: uuid(input.orderId, 'orderId'),
    requesterId: uuid(input.requesterId, 'requesterId'),
  };
  // Optional: order service calls made with a token that predates the username claim omit it. Same bounds as users.username.
  let courierUsername: string | undefined;
  if (input.courierUsername !== undefined) {
    const name = input.courierUsername;
    if (typeof name !== 'string' || name.length === 0 || name.length > 50) {
      throw new InvalidNotificationEvent('courierUsername must be a string of 1 to 50 characters');
    }
    courierUsername = name;
  }

  if (input.schemaVersion === undefined) {
    // Version 1: the keys that never existed before the redesign cannot arrive without its envelope.
    if (eventType === 'order.rejected' || eventType === 'order.unassigned') {
      throw new InvalidNotificationEvent(`${eventType} requires schemaVersion 2`);
    }
    const event: OrderEventV1 = { schemaVersion: 1, ...base };
    if (input.orderCode !== undefined) event.orderCode = orderCode(input.orderCode);
    if (COURIER_REQUIRED.includes(eventType)) event.courierId = uuid(input.courierId, 'courierId');
    if (courierUsername !== undefined) event.courierUsername = courierUsername;
    return event;
  }
  if (input.schemaVersion !== 2) throw new InvalidNotificationEvent('Unsupported schemaVersion');
  if (input.producer !== 'order-service') throw new InvalidNotificationEvent('producer must be order-service');
  if (typeof input.orderVersion !== 'number' || !Number.isInteger(input.orderVersion) || input.orderVersion < 1) {
    throw new InvalidNotificationEvent('orderVersion must be a positive integer');
  }
  const actorRole = oneOf<OrderActorRole>(input.actorRole, ACTOR_ROLES, 'actorRole');
  const event: OrderEventV2 = {
    schemaVersion: 2,
    producer: 'order-service',
    ...base,
    orderCode: orderCode(input.orderCode),
    orderVersion: input.orderVersion,
    previousStatus: oneOf<OrderStatus>(input.previousStatus, STATUSES, 'previousStatus'),
    status: oneOf<OrderStatus>(input.status, STATUSES, 'status'),
    actorRole,
    correlationId: uuid(input.correlationId, 'correlationId'),
  };
  if (actorRole !== 'SYSTEM' || input.actorId !== undefined) event.actorId = uuid(input.actorId, 'actorId');
  if (input.reasonCode !== undefined || REASON_REQUIRED.includes(eventType)) {
    event.reasonCode = oneOf<OrderReasonCode>(input.reasonCode, REASON_CODES, 'reasonCode');
  }
  if (COURIER_REQUIRED.includes(eventType) || input.courierId !== undefined) event.courierId = uuid(input.courierId, 'courierId');
  if (eventType === 'order.unassigned') event.priorCourierId = uuid(input.priorCourierId, 'priorCourierId');
  if (courierUsername !== undefined) event.courierUsername = courierUsername;
  return event;
}

/** sha256 of the normalized event with keys sorted, so key order and unknown extra fields never count as a change. */
export function fingerprint(event: OrderEvent): string {
  const sorted = Object.fromEntries(Object.entries(event).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b)));
  return createHash('sha256').update(JSON.stringify(sorted)).digest('hex');
}

export function classifyNotificationFailure(error: unknown): Failure {
  if (error instanceof InvalidNotificationEvent) return { category: 'permanent', reason: 'invalid_event' };
  if (error instanceof ContractMismatch) return { category: 'permanent', reason: 'contract_mismatch' };
  if (isInfrastructureFailure(error)) return { category: 'infrastructure', reason: 'dependency_unavailable' };
  return { category: 'transient', reason: 'processing_failure' };
}

export type Deliver = (event: OrderEvent) => Promise<void>;

export interface LiveHints {
  push(userId: string, notification: NotificationDTO): unknown;
  inboxChanged(userId: string): unknown;
}

/**
 * The policy decides the recipients, the store commits them in one transaction, and only then do the sockets hear
 * about it: a socket failure after the commit changes nothing, and REST finds the rows on the next load. A stale
 * event (older than the projection) is stored as history but not pushed, so it cannot show an outdated toast.
 */
export function createDeliver(store: Pick<NotificationStore, 'applyEvent'>, hub: LiveHints): Deliver {
  return async (event) => {
    const drafts = toNotifications(event);
    const applied = await store.applyEvent(
      {
        producer: 'order-service',
        eventId: event.eventId,
        fingerprint: fingerprint(event),
        schemaVersion: event.schemaVersion,
        policyVersion: POLICY_VERSION,
        orderId: event.orderId,
        orderCode: event.orderCode ?? null,
        courierId: event.courierId ?? null,
        occurredAt: event.timestamp,
        ...(event.schemaVersion === 2 && {
          projection: {
            orderVersion: event.orderVersion,
            status: event.status,
            requesterId: event.requesterId,
            courierId: event.courierId ?? null,
          },
        }),
      },
      drafts,
    );
    if (applied.outcome === 'duplicate') return;
    const recipients = new Set<string>();
    for (const { userId, notification } of applied.created) {
      if (!applied.stale) hub.push(userId, notification);
      recipients.add(userId);
    }
    for (const userId of recipients) hub.inboxChanged(userId);
  };
}

export function createNotificationEventHandler(deliver: Deliver) {
  return async (content: Buffer, routingKey: string) => {
    await deliver(parseOrderEvent(content, routingKey));
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
