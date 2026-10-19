/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Publish committed credit saga results with confirms, persistent retries, and reconnect support.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import amqp, { type ConfirmChannel } from 'amqplib';
import type { PrismaClient } from '../database/client';
import { createConfirmedPublisher } from './rabbitmq';

export function createCreditOutbox(prisma: PrismaClient, config: { url: string; exchange: string; intervalMs?: number }) {
  let connection: Awaited<ReturnType<typeof amqp.connect>> | undefined;
  let channel: ConfirmChannel | undefined;
  let publish: ReturnType<typeof createConfirmedPublisher> | undefined;
  let timer: NodeJS.Timeout | undefined;
  let running: Promise<number> | undefined;
  let stopped = false;

  async function connect() {
    if (!connection) {
      const conn = await amqp.connect(config.url, { timeout: 5000 });
      connection = conn;
      conn.on('error', () => {});
      conn.on('close', () => { if (connection === conn) { connection = undefined; channel = undefined; publish = undefined; } });
    }
    if (!channel) {
      const ch = await connection.createConfirmChannel();
      channel = ch;
      ch.on('error', () => {});
      ch.on('close', () => { if (channel === ch) { channel = undefined; publish = undefined; } });
      publish = createConfirmedPublisher(ch);
    }
    return publish!;
  }

  function processPending(): Promise<number> {
    if (stopped) return Promise.resolve(0);
    if (running) return running;
    running = (async () => {
      let delivered = 0;
      const rows = await prisma.creditOutboxEvent.findMany({ where: { status: 'PENDING' }, orderBy: { createdAt: 'asc' }, take: 20 });
      for (const row of rows) {
        if (stopped) break;
        try {
          const send = await connect();
          await send(config.exchange, row.eventType, Buffer.from(row.payload), { messageId: row.id, contentType: 'application/json' });
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
      await channel?.close().catch(() => {});
      await connection?.close().catch(() => {});
    },
  };
}
