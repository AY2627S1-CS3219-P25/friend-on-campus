/**
 * AI Assistance Disclosure:
 *
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Wired database readiness check (SELECT 1) into createApp() for /ready probe.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted Express app factory to src/app.ts and config to src/config.ts; added graceful SIGINT/SIGTERM shutdown.
 * Author review: yanhwee
 *
 * Tool: Google Antigravity Agent, date: 2026-10-08
 * Scope: Relocated server entry point from src/backend/server.ts to standard root src/index.ts and updated routes import to src/suppliers/supplierRoutes.
 * Author review: <to be completed by author after review>
 *
 * Tool: Claude Code (model: Claude Opus 5), date: 2026-09-19
 * Scope: Generated Express server entry point that mounts the supplier routes (replaces src/index.ts).
 * Author review: (to be completed by author after review)
 *
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Configured the author-approved Ed25519 Supplier Service access-token verifier at startup.
 * Author review: <to be completed by ngkhengyang>
 */

// AI-generated (edited by yanhwee)
// AI-generated (edited by jagdeepsh)
// AI-generated (edited by ngkhengyang)
import { createApp } from './app';
import { config } from './config';
import { prisma } from './database/client';

const app = createApp({
  isReady: async () => {
    try {
      await prisma.$queryRaw`SELECT 1`;
      return true;
    } catch {
      return false;
    }
  },
});

const server = app.listen(config.port, () => {
  console.log(`🚀 [Supplier Service] running on port ${config.port}`);
});

async function shutdown(): Promise<void> {
  await prisma.$disconnect().catch(() => {});
  server.close();
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
