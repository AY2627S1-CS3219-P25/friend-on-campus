/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity; Google Antigravity Agent, date: 2026-09-20 to 2026-10-20
 * Scope: Generated Prisma client singleton for the user service; updated across 2 AI-assisted revisions through D4 wrap-up (standardized Prisma client module to import from ../generated/prisma, use centralized config.databaseUrl with globalForPrisma singleton guard, and re-export..).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
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

export default prisma;
