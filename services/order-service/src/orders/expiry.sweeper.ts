/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Refactored Expiry Sweeper using extracted sweep handler and a lightweight factory function.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import type { OrderRepository } from '../repositories/order.repository';
import type { OutboxRelay } from '../messaging/outbox.relay';

export interface ExpirySweeper {
  start(): void;
  stop(): Promise<void>;
  sweep(): Promise<number>;
}

export interface ExpirySweeperOptions {
  repository: OrderRepository;
  outboxRelay?: OutboxRelay;
  pollIntervalMs?: number;
}

// ---------------------------------------------------------------------------
// Extracted Sweep Handler
// ---------------------------------------------------------------------------

async function handleSweep(
  repository: OrderRepository,
  outboxRelay?: OutboxRelay
): Promise<number> {
  try {
    const expiredCount = await repository.expireDueOrders(new Date());
    if (expiredCount > 0 && outboxRelay) {
      void outboxRelay.trigger();
    }
    return expiredCount;
  } catch (err) {
    console.error('[expiry_sweeper_error]', err);
    return 0;
  }
}

// ---------------------------------------------------------------------------
// Lightweight Factory Function
// ---------------------------------------------------------------------------

export function createExpirySweeper(options: ExpirySweeperOptions): ExpirySweeper {
  const { repository, outboxRelay, pollIntervalMs = 30000 } = options;

  let isStopped = false;
  let isSweeping = false;
  let timer: NodeJS.Timeout | null = null;

  async function sweep(): Promise<number> {
    if (isStopped || isSweeping) return 0;
    isSweeping = true;
    try {
      return await handleSweep(repository, outboxRelay);
    } finally {
      isSweeping = false;
    }
  }

  return {
    start() {
      if (timer || isStopped) return;
      void sweep();
      timer = setInterval(() => {
        void sweep();
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
    },

    sweep,
  };
}
