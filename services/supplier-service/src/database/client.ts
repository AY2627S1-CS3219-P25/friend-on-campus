/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Standardized Prisma client module to import from ../generated/prisma, use centralized config.databaseUrl, and re-export Prisma types.
 * Author review: <to be completed by author after review>
 *
 * Tool: Claude Code (model: Claude Opus 5), date: 2026-09-19
 * Scope: Generated Prisma client singleton for the supplier service; added dotenv.config() so
 *        standalone scripts (seed.ts) also pick up src/.env, not just backend/server.ts.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
// AI-generated (edited by jagdeepsh)
import { config } from '../config';
import { PrismaClient } from '../generated/prisma';

export { Prisma, PrismaClient } from '../generated/prisma';
export type { Supplier } from '../generated/prisma';

export const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });

export default prisma;
