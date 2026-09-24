/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Validated credit event contracts and translated them into transactional credit commands.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { createHash } from 'node:crypto';
import type { OrderCompletedEvent, OrderExpiredEvent, UserRegisteredEvent } from '@campus-errand/common-dtos';
import type { CreditCommand, CreditService } from './service';
import { InvalidCreditEvent } from './errors';

// Temporary local contract until common-dtos gains cancellation.
// See docs/services/credit-service-integration-contract.md.
export type OrderCancelledEvent = Omit<OrderExpiredEvent, 'eventType'> & { eventType: 'order.cancelled' };
export type CreditEvent = UserRegisteredEvent | OrderCompletedEvent | OrderExpiredEvent | OrderCancelledEvent;
export const creditRoutingKeys = ['user.registered', 'order.completed', 'order.cancelled', 'order.expired'] as const;

function uuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new InvalidCreditEvent(`${field} must be a UUID`);
  }
  return value.toLowerCase();
}
function amount(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 1 || value > 2147483647) {
    throw new InvalidCreditEvent(`${field} must be a positive PostgreSQL integer`);
  }
  return value;
}
function timestamp(value: unknown): string {
  // Contract accepts UTC ISO-8601 seconds, optionally with milliseconds.
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/.test(value)) {
    throw new InvalidCreditEvent('timestamp must be a UTC ISO-8601 timestamp');
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== (value.length === 20 ? value.replace('Z', '.000Z') : value)) {
    throw new InvalidCreditEvent('timestamp is not a valid calendar date');
  }
  return date.toISOString();
}

export function parseCreditEvent(content: Buffer, routingKey: string): CreditEvent {
  let input: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(content.toString('utf8'));
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error();
    input = parsed as Record<string, unknown>;
  } catch { throw new InvalidCreditEvent('Message must be a JSON object'); }
  if (input.eventType !== routingKey || !creditRoutingKeys.includes(routingKey as typeof creditRoutingKeys[number])) {
    throw new InvalidCreditEvent('Unsupported or mismatched event type and routing key');
  }
  const base = { eventId: uuid(input.eventId, 'eventId'), timestamp: timestamp(input.timestamp) };
  if (input.eventType === 'user.registered') {
    if (typeof input.email !== 'string' || input.email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.email)) {
      throw new InvalidCreditEvent('email must be a valid email address');
    }
    return { ...base, eventType: 'user.registered', userId: uuid(input.userId, 'userId'), email: input.email, initialGrant: amount(input.initialGrant, 'initialGrant') };
  }
  const order = { ...base, orderId: uuid(input.orderId, 'orderId'), requesterId: uuid(input.requesterId, 'requesterId'), rewardCredits: amount(input.rewardCredits, 'rewardCredits') };
  if (input.eventType === 'order.completed') return { ...order, eventType: 'order.completed', courierId: uuid(input.courierId, 'courierId') };
  return { ...order, eventType: input.eventType as 'order.expired' | 'order.cancelled' };
}

export function createCreditEventHandler(credits: CreditService) {
  return async (content: Buffer, routingKey: string) => {
    const event = parseCreditEvent(content, routingKey);
    let command: CreditCommand;
    if (event.eventType === 'user.registered') command = { kind: 'register', userId: event.userId, initialGrant: event.initialGrant };
    else {
      const body = { orderId: event.orderId, requesterId: event.requesterId, amount: event.rewardCredits };
      command = event.eventType === 'order.completed'
        ? { kind: 'settle', body: { ...body, courierId: event.courierId } }
        : { kind: 'refund', body };
    }
    await credits.applyEvent({
      eventId: event.eventId, eventType: event.eventType,
      fingerprint: createHash('sha256').update(JSON.stringify(event)).digest('hex'),
    }, command);
  };
}
