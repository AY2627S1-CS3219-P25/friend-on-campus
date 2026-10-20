/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Standardized Prisma client module to import from ../generated/prisma, use centralized config.databaseUrl with globalForPrisma singleton guard, and re-export Prisma and model types.
 * Author review: <to be completed by author after review>
 *
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Generated Prisma client singleton for the user service; added dotenv.config() so
 *        standalone scripts (seed.ts) also pick up src/.env, not just the app entrypoint.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
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
