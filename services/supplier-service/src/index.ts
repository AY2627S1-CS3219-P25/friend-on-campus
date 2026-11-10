/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent; Claude Code (model: Claude Opus 5); Codex (model: GPT-5.6 Terra), date: 2026-09-19 to 2026-10-22
 * Scope: Generated Express server entry point that mounts the supplier routes (replaces src/index.ts); updated across 5 AI-assisted revisions through D4 wrap-up (wired database readiness check (SELECT 1) into createApp() for /ready probe).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */

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
