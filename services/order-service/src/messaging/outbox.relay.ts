/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Refactored Transactional Outbox relay using extracted batch processing helpers and a lightweight factory function.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import type { PrismaClient } from '../database/client';
import type { OrderEventPublisher, OrderLifecycleEvent } from './event.publisher';

export interface OutboxRelay {
  start(): void;
  stop(): Promise<void>;
  trigger(): Promise<void>;
  processPending(): Promise<number>;
}

export interface OutboxRelayOptions {
  prisma: PrismaClient;
  publisher: OrderEventPublisher;
  pollIntervalMs?: number;
  batchSize?: number;
  maxRetries?: number;
}

type EventOutcome = 'DELIVERED' | 'FAILED' | 'RETRY';

interface PendingRecord {
  id: string;
  eventType: string;
  payload: string;
  retryCount: number;
}

// ---------------------------------------------------------------------------
// Extracted Outbox Helpers
// ---------------------------------------------------------------------------

async function processSingleOutboxRecord(
  prisma: PrismaClient,
  publisher: OrderEventPublisher,
  record: PendingRecord,
  maxRetries: number
): Promise<EventOutcome> {
  let parsed: OrderLifecycleEvent;
  try {
    parsed = JSON.parse(record.payload) as OrderLifecycleEvent;
  } catch (parseError) {
    console.error('[outbox_payload_parse_error]', parseError, {
      id: record.id,
      eventType: record.eventType,
    });
    await prisma.outboxEvent.update({
      where: { id: record.id },
      data: { status: 'FAILED' },
    });
    return 'FAILED';
  }

  const success = await publisher.publishOrderEvent(parsed);
  if (success) {
    await prisma.outboxEvent.update({
      where: { id: record.id },
      data: { status: 'DELIVERED' },
    });
    return 'DELIVERED';
  }

  const newRetryCount = record.retryCount + 1;
  if (newRetryCount >= maxRetries && newRetryCount % 10 === 0) {
    console.warn(
      `[outbox_publish_warning] Broker publish failing repeatedly (${newRetryCount} attempts) for event ${record.id} (${record.eventType}); keeping PENDING until broker recovers.`
    );
  }
  await prisma.outboxEvent.update({
    where: { id: record.id },
    data: {
      retryCount: newRetryCount,
      status: 'PENDING',
    },
  });
  return 'RETRY';
}

async function processPendingBatch(
  prisma: PrismaClient,
  publisher: OrderEventPublisher,
  batchSize: number,
  maxRetries: number,
  isStopped: () => boolean
): Promise<{ batchCount: number; deliveredCount: number; hasFailure: boolean }> {
  const events = await prisma.outboxEvent.findMany({
    where: { status: 'PENDING' },
    orderBy: { createdAt: 'asc' },
    take: batchSize,
  });

  if (events.length === 0) {
    return { batchCount: 0, deliveredCount: 0, hasFailure: false };
  }

  let deliveredCount = 0;
  let hasFailure = false;

  for (const record of events) {
    if (isStopped()) break;

    const outcome = await processSingleOutboxRecord(prisma, publisher, record, maxRetries);
    if (outcome === 'DELIVERED') {
      deliveredCount++;
    } else if (outcome === 'RETRY') {
      hasFailure = true;
      break;
    }
  }

  return { batchCount: events.length, deliveredCount, hasFailure };
}

// ---------------------------------------------------------------------------
// Lightweight Factory Function
// ---------------------------------------------------------------------------

export function createOutboxRelay(options: OutboxRelayOptions): OutboxRelay {
  const {
    prisma,
    publisher,
    pollIntervalMs = 2000,
    batchSize = 20,
    maxRetries = 10,
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
    let totalDelivered = 0;

    currentProcessPromise = (async () => {
      try {
        while (!isStopped) {
          const { batchCount, deliveredCount, hasFailure } = await processPendingBatch(
            prisma,
            publisher,
            batchSize,
            maxRetries,
            () => isStopped
          );

          totalDelivered += deliveredCount;

          if (hasFailure || batchCount < batchSize) {
            break;
          }
        }
      } catch (error) {
        console.error('[outbox_relay_error]', error);
      } finally {
        isProcessing = false;
        currentProcessPromise = null;
        if (pendingTrigger && !isStopped) {
          pendingTrigger = false;
          void processPending();
        }
      }
      return totalDelivered;
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
