/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-19
 * Scope: Classify identified infrastructure failures for unlimited retry while retaining permanent event failures.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Connected validated credit event handling to the generic RabbitMQ consumer.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { isInfrastructureFailure, startRabbitConsumer, type MessagingConfig, type Failure } from '@campus-errand/messaging';
import { CreditError, InvalidCreditEvent } from './errors';
import { createCreditEventHandler, creditRoutingKeys } from './events';
import type { CreditService } from './service';

export function classifyCreditFailure(error: unknown): Failure {
  if (error instanceof CreditError) return {
    category: 'permanent', reason: error instanceof InvalidCreditEvent ? 'invalid_event' : 'business_conflict',
  };
  if (isInfrastructureFailure(error)) return { category: 'infrastructure', reason: 'dependency_unavailable' };
  const code = (error as { code?: string } | null)?.code;
  // Constraint/value violations will not be repaired by redelivering identical input.
  if (code && ['P2000', 'P2003', 'P2004', 'P2005', 'P2006', 'P2007', 'P2011', 'P2020'].includes(code)) {
    return { category: 'permanent', reason: 'database_constraint' };
  }
  // Unknown processing errors get bounded retries; never include raw errors/URLs in logs.
  return { category: 'transient', reason: 'processing_failure' };
}

export function startCreditConsumer(config: MessagingConfig, credits: CreditService, onFatal?: () => void) {
  return startRabbitConsumer(config, {
    routingKeys: creditRoutingKeys, handle: createCreditEventHandler(credits), classify: classifyCreditFailure, onFatal,
  });
}
