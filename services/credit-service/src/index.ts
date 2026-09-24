/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Constructed shared JWT verification and exited cleanly for supervised RabbitMQ recovery.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import type { Server } from 'node:http';
import { authMiddleware } from '@campus-errand/auth';
import { createApp } from './app';
import { config } from './config';
import { createCreditService } from './credits/service';
import { createCreditStore } from './credits/store';
import { startCreditConsumer } from './credits/consumer';
import { prisma } from './database/client';

let consumer: Awaited<ReturnType<typeof startCreditConsumer>> | undefined;
let server: Server | undefined;
let stopping = false;
let shutdownPromise: Promise<void> | undefined;
function shutdown(failed = false) {
  if (failed) process.exitCode = 1;
  if (shutdownPromise) return shutdownPromise;
  stopping = true;
  shutdownPromise = (async () => {
    const httpClosed = server?.listening
      ? new Promise<void>(resolve => server!.close(() => resolve())) : Promise.resolve();
    await consumer?.close();
    await httpClosed;
    await prisma.$disconnect();
  })().catch(() => { process.exitCode = 1; });
  return shutdownPromise;
}

async function main() {
  const authenticate = authMiddleware(config.auth);
  await prisma.$connect();
  // Verify migrations before accepting HTTP requests or messages.
  await Promise.all([prisma.creditWallet.findFirst(), prisma.creditTransaction.findFirst(),
    prisma.creditGrant.findFirst(), prisma.creditEscrow.findFirst(), prisma.processedCreditEvent.findFirst()]);
  const credits = createCreditService(createCreditStore(prisma));
  consumer = await startCreditConsumer(config.rabbitmq, credits, () => {
    console.error('[Credit Service] RabbitMQ consumer unavailable; exiting for process supervisor restart');
    void shutdown(true);
  });
  if (stopping) { await consumer.close(); return; }
  const app = createApp({ credits, authenticate, port: config.port, isReady: async () => {
    if (stopping || !consumer?.isReady()) return false;
    await prisma.$queryRaw`SELECT 1`;
    return !stopping && consumer.isReady();
  } });
  server = app.listen(config.port, () => console.log(`[Credit Service] listening on ${config.port}`));
  server.on('error', () => { void shutdown(true); });
  process.once('SIGINT', () => { void shutdown(); });
  process.once('SIGTERM', () => { void shutdown(); });
}
void main().catch(async () => {
  console.error('[Credit Service] Startup failed; check JWT_PUBLIC_KEY, dependencies and deployed migrations');
  await shutdown(true);
});
