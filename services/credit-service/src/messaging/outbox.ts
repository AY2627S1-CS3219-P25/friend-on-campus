/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Publish committed credit saga results with confirms, persistent retries, and reconnect support.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Replaced manual amqplib connection/channel state with createRabbitPublisher from @campus-errand/messaging.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by huangjiaxi1111, yanhwee)
import type { PrismaClient } from '../database/client';
import { createRabbitPublisher } from '@campus-errand/messaging';

export function createCreditOutbox(prisma: PrismaClient, config: { url: string; exchange: string; intervalMs?: number }) {
  const publisher = createRabbitPublisher({ url: config.url });
  let timer: NodeJS.Timeout | undefined;
  let running: Promise<number> | undefined;
  let stopped = false;

  function processPending(): Promise<number> {
    if (stopped) return Promise.resolve(0);
    if (running) return running;
    running = (async () => {
      let delivered = 0;
      const rows = await prisma.creditOutboxEvent.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 20 });
      for (const row of rows) {
        if (stopped) break;
        try {
          await publisher.publish(config.exchange, row.eventType, Buffer.from(row.payload), {
            messageId: row.id,
            contentType: 'application/json',
          });
        } catch {
          await prisma.creditOutboxEvent.updateMany({ where: { id: row.id, status: 'PENDING' }, data: { retryCount: { increment: 1 } } });
          break;
        }
        await prisma.creditOutboxEvent.updateMany({ where: { id: row.id, status: 'PENDING' }, data: { status: 'DELIVERED' } });
        delivered++;
      }
      return delivered;
    })().finally(() => { running = undefined; });
    return running;
  }

  const tick = () => { void processPending().catch(() => console.error('[credit_outbox] Database unavailable; will retry')); };
  return {
    processPending,
    start() { if (!stopped && !timer) { tick(); timer = setInterval(tick, config.intervalMs ?? 2000); timer.unref(); } },
    async stop() {
      stopped = true;
      if (timer) clearInterval(timer);
      await running?.catch(() => {});
      await publisher.close();
    },
  };
}
