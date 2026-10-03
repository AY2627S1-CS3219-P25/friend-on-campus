/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-03
 * Scope: Implemented transactional outbox relay worker for guaranteed at-least-once event publication to RabbitMQ with publisher confirms and retries.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import type { UserRegisteredEvent } from '@campus-errand/common-dtos';
import type { AuthRepository } from '../persistence/auth-repository';
import { logError } from '../utils/logger';
import type { UserEventPublisher } from './publisher';

export interface OutboxRelay {
  start(): void;
  stop(): Promise<void>;
  trigger(): Promise<void>;
  processPending(): Promise<number>;
}

export interface OutboxRelayOptions {
  repository: AuthRepository;
  publisher: UserEventPublisher;
  pollIntervalMs?: number;
  batchSize?: number;
}

export function createOutboxRelay(options: OutboxRelayOptions): OutboxRelay {
  const {
    repository,
    publisher,
    pollIntervalMs = 2000,
    batchSize = 20,
  } = options;

  let isStopped = false;
  let isProcessing = false;
  let pendingTrigger = false;
  let timer: NodeJS.Timeout | null = null;
  let currentProcessPromise: Promise<number> | null = null;

  async function processPending(): Promise<number> {
    if (isStopped) return 0;
    if (isProcessing) {
      pendingTrigger = true;
      return currentProcessPromise ?? Promise.resolve(0);
    }

    isProcessing = true;
    let deliveredCount = 0;

    currentProcessPromise = (async () => {
      try {
        while (!isStopped) {
          const events = await repository.getPendingOutboxEvents(batchSize);
          if (events.length === 0) {
            break;
          }

          let hasFailure = false;
          for (const event of events) {
            if (isStopped) break;

            if (event.eventType === 'user.registered') {
              let parsed: UserRegisteredEvent;
              try {
                parsed = JSON.parse(event.payload) as UserRegisteredEvent;
              } catch (parseError) {
                logError('outbox_payload_parse_error', parseError, {
                  id: event.id,
                  eventType: event.eventType,
                });
                await repository.markOutboxEventFailed(event.id);
                continue;
              }

              const success = await publisher.publishUserRegistered(parsed);
              if (success) {
                await repository.markOutboxEventDelivered(event.id);
                deliveredCount++;
              } else {
                await repository.incrementOutboxEventRetry(event.id);
                hasFailure = true;
                break;
              }
            } else {
              logError('outbox_unknown_event_type', new Error(`Unknown event type: ${event.eventType}`), {
                id: event.id,
                eventType: event.eventType,
              });
              await repository.markOutboxEventFailed(event.id);
            }
          }

          if (hasFailure || events.length < batchSize) {
            break;
          }
        }
      } catch (error) {
        logError('outbox_relay_error', error);
      } finally {
        isProcessing = false;
        currentProcessPromise = null;
        if (pendingTrigger && !isStopped) {
          pendingTrigger = false;
          void processPending();
        }
      }
      return deliveredCount;
    })();

    return currentProcessPromise;
  }

  return {
    start() {
      if (timer || isStopped) return;
      void processPending();
      timer = setInterval(() => {
        void processPending();
      }, pollIntervalMs);
      if (typeof timer.unref === 'function') {
        timer.unref();
      }
    },

    async stop(): Promise<void> {
      isStopped = true;
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
      if (currentProcessPromise) {
        await currentProcessPromise.catch(() => {});
      }
    },

    async trigger(): Promise<void> {
      await processPending();
    },

    processPending,
  };
}
