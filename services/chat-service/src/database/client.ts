/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Wire opt-in observability without changing business behavior.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Prisma client for chat_db, copied from notification-service/src/database/client.ts (generated client under
 * src/generated/prisma, singleton guard outside production).
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { instrumentDatabase } from '@campus-errand/observability';
import { config } from '../config';
import { PrismaClient } from '../generated/prisma';

export { Prisma, PrismaClient } from '../generated/prisma';
export type * from '../generated/prisma';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  instrumentDatabase(new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
  }));

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
