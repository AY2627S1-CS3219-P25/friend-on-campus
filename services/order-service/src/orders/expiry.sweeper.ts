/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Refactored Expiry Sweeper using extracted sweep handler and a lightweight factory function.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import type { OrderRepository } from '../repositories/order.repository';

export interface ExpirySweeper {
  start(): void;
  stop(): Promise<void>;
  sweep(): Promise<number>;
}

export interface ExpirySweeperOptions {
  repository: OrderRepository;
  pollIntervalMs?: number;
}

export function createExpirySweeper(options: ExpirySweeperOptions): ExpirySweeper {
  const { repository, pollIntervalMs = 30000 } = options;

  let isStopped = false;
  let isSweeping = false;
  let timer: NodeJS.Timeout | null = null;

  async function sweep(): Promise<number> {
    if (isStopped || isSweeping) return 0;
    isSweeping = true;
    try {
      return await repository.expireDueOrders(new Date());
    } catch (err) {
      console.error('[expiry_sweeper_error]', err);
      return 0;
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
