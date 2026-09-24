/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Connected Prisma before listening and closed it on startup failure and shutdown.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { createApp } from './app';
import { config } from './config';
import { createCreditService } from './credits/service';
import { createCreditStore } from './credits/store';
import { prisma } from './database/client';

async function main() {
  await prisma.$connect();
  // Check both tables before reporting a runnable HTTP service.
  await prisma.creditWallet.findFirst();
  await prisma.creditTransaction.findFirst();
  const store = createCreditStore(prisma);
  const credits = createCreditService(store);
  const app = createApp({ credits, port: config.port });

  const server = app.listen(config.port, () => {
    console.log(`🚀 [Credit Service] running on port ${config.port} with tsx`);
  });
  server.on('error', () => {
    console.error('[Credit Service] HTTP server failed to start');
    void prisma.$disconnect().finally(() => { process.exitCode = 1; });
  });
  let stopping = false;
  const shutdown = () => {
    if (stopping) return;
    stopping = true;
    server.close(() => {
      void prisma.$disconnect().catch(() => { process.exitCode = 1; });
    });
  };
  process.once('SIGINT', shutdown);
  process.once('SIGTERM', shutdown);
}

void main().catch(async () => {
  console.error('[Credit Service] Database startup failed. Check DATABASE_URL and run db:deploy.');
  await prisma.$disconnect();
  process.exitCode = 1;
});
