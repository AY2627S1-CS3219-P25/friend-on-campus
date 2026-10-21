/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-19
 * Scope: Classify identified infrastructure failures for unlimited retry while retaining invalid-result rejection.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Validate and consume correlated credit results with the existing durable retry/DLQ behavior.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by yanhwee)
import type { CreditReservationResultEvent } from '@campus-errand/common-dtos';
import { OrderError, OrderValidationError } from '../orders/order.types';
import { isInfrastructureFailure, startRabbitConsumer, type Failure, type MessagingConfig } from '@campus-errand/messaging';

export const reservationResultKeys = ['credit.reservation.succeeded', 'credit.reservation.failed'] as const;

export function parseReservationResult(content: Buffer, routingKey: string): CreditReservationResultEvent {
  let event: CreditReservationResultEvent;
  try { event = JSON.parse(content.toString('utf8')); }
  catch { throw new OrderValidationError('Invalid credit result JSON'); }
  if (!event || event.eventType !== routingKey || !reservationResultKeys.includes(event.eventType)) throw new OrderValidationError('Unsupported credit result');
  for (const value of [event.eventId, event.correlationId, event.orderId, event.requesterId]) {
    if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) throw new OrderValidationError('Invalid credit result identity');
  }
  if (!Number.isInteger(event.rewardCredits) || event.rewardCredits <= 0 || event.rewardCredits > 2147483647 ||
      typeof event.timestamp !== 'string' || !Number.isFinite(Date.parse(event.timestamp))) throw new OrderValidationError('Invalid credit result fields');
  if (event.eventType === 'credit.reservation.failed' && (typeof event.reason !== 'string' || !event.reason || event.reason.length > 500)) throw new OrderValidationError('Missing credit failure reason');
  return { ...event, eventId: event.eventId.toLowerCase(), correlationId: event.correlationId.toLowerCase(), orderId: event.orderId.toLowerCase(), requesterId: event.requesterId.toLowerCase() };
}

export function classifyReservationFailure(error: unknown): Failure {
  if (error instanceof OrderError) return { category: 'permanent', reason: 'invalid_reservation_result' };
  if (isInfrastructureFailure(error)) return { category: 'infrastructure', reason: 'dependency_unavailable' };
  return { category: 'transient', reason: 'processing_failure' };
}

export function startReservationConsumer(
  config: MessagingConfig,
  orderService: { handleReservationResult(event: CreditReservationResultEvent): Promise<unknown> },
  onFatal?: () => void
) {
  return startRabbitConsumer(config, {
    routingKeys: reservationResultKeys,
    handle: async (content, key) => {
      await orderService.handleReservationResult(parseReservationResult(content, key));
    },
    classify: classifyReservationFailure,
    onFatal,
  });
}
