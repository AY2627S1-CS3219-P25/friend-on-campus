/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Order-event validation copied from notification-service/src/notifications/events.ts (same rules, the six
 * keys the F8 decision record names), and the projection the author specified in S3: order.accepted creates or
 * re-couriers the conversation, order.in_transit and order.delivered are recorded, the three terminal keys close it;
 * events for an order with no row are acknowledged and ignored.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { startRabbitConsumer, type Failure, type MessagingConfig } from '../messaging/rabbitmq';
import type { ConversationStore } from './store';

export class InvalidChatEvent extends Error {}

/** The order.* keys a conversation reacts to (F8 brief, D2 and D7). */
export const chatRoutingKeys = [
  'order.accepted',
  'order.in_transit',
  'order.delivered',
  'order.completed',
  'order.cancelled',
  'order.expired',
] as const;
export type ChatRoutingKey = (typeof chatRoutingKeys)[number];

/** The subset of the shared order event DTOs this service reads. */
export interface OrderEvent {
  eventId: string;
  eventType: ChatRoutingKey;
  timestamp: string;
  orderId: string;
  requesterId: string;
  courierId?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const ISO_UTC = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/;

function uuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !UUID.test(value)) throw new InvalidChatEvent(`${field} must be a UUID`);
  return value.toLowerCase();
}

function timestamp(value: unknown): string {
  if (typeof value !== 'string' || !ISO_UTC.test(value)) throw new InvalidChatEvent('timestamp must be a UTC ISO-8601 timestamp');
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) throw new InvalidChatEvent('timestamp is not a valid calendar date');
  return date.toISOString();
}

export function parseOrderEvent(content: Buffer, routingKey: string): OrderEvent {
  let input: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(content.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    input = parsed as Record<string, unknown>;
  } catch {
    throw new InvalidChatEvent('Message must be a JSON object');
  }
  if (!chatRoutingKeys.includes(routingKey as ChatRoutingKey) || input.eventType !== routingKey) {
    throw new InvalidChatEvent('Unsupported or mismatched event type and routing key');
  }
  const eventType = routingKey as ChatRoutingKey;
  const event: OrderEvent = {
    eventId: uuid(input.eventId, 'eventId'),
    eventType,
    timestamp: timestamp(input.timestamp),
    orderId: uuid(input.orderId, 'orderId'),
    requesterId: uuid(input.requesterId, 'requesterId'),
  };
  if (eventType === 'order.accepted' || eventType === 'order.in_transit' || eventType === 'order.delivered' || eventType === 'order.completed') {
    event.courierId = uuid(input.courierId, 'courierId');
  }
  return event;
}

export function classifyChatFailure(error: unknown): Failure {
  if (error instanceof InvalidChatEvent) return { category: 'permanent', reason: 'invalid_event' };
  return { category: 'transient', reason: 'processing_failure' };
}

/** What one event did to the projection, for logs and tests. */
export type ProjectionOutcome = 'created_or_recouriered' | 'picked_up' | 'delivered' | 'closed' | 'ignored';

export function createProjection(store: ConversationStore) {
  return async (event: OrderEvent): Promise<ProjectionOutcome> => {
    switch (event.eventType) {
      case 'order.accepted':
        await store.upsertAccepted({ orderId: event.orderId, requesterId: event.requesterId, courierId: event.courierId!, createdAt: event.timestamp });
        return 'created_or_recouriered';
      case 'order.in_transit':
        return (await store.markPickedUp(event.orderId, event.timestamp)) ? 'picked_up' : 'ignored';
      case 'order.delivered':
        return (await store.markDelivered(event.orderId, event.timestamp)) ? 'delivered' : 'ignored';
      case 'order.completed':
      case 'order.cancelled':
      case 'order.expired':
        return (await store.close(event.orderId, event.timestamp)) ? 'closed' : 'ignored';
    }
  };
}

export function createChatEventHandler(project: (event: OrderEvent) => Promise<ProjectionOutcome>) {
  return async (content: Buffer, routingKey: string) => {
    await project(parseOrderEvent(content, routingKey));
  };
}

export function startChatConsumer(messaging: MessagingConfig, store: ConversationStore, onFatal?: () => void) {
  return startRabbitConsumer(messaging, {
    routingKeys: chatRoutingKeys,
    handle: createChatEventHandler(createProjection(store)),
    classify: classifyChatFailure,
    onFatal,
  });
}
