/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Updated generated Prisma client import path to ../generated/prisma, added globalForPrisma singleton guard, and re-exported Prisma types.
 * Author review: <to be completed by author after review>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Prisma client for notification_db, same shape as credit-service's client module.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by yanhwee)
// AI-generated (edited by Reallyeasy1)
import { config } from '../config';
import { PrismaClient } from '../generated/prisma';

export { Prisma, PrismaClient } from '../generated/prisma';
export type * from '../generated/prisma';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    datasources: {
      db: {
        url: config.databaseUrl,
      },
    },
  });

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}
