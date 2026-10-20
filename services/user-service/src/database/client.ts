/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Standardized Prisma client module to import from ../generated/prisma, configure datasources.db.url with fallback, and re-export Prisma and model types.
 * Author review: <to be completed by author after review>
 *
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Generated Prisma client singleton for the user service; added dotenv.config() so
 *        standalone scripts (seed.ts) also pick up src/.env, not just the app entrypoint.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from '../generated/prisma';

export { Prisma, PrismaClient } from '../generated/prisma';
export type { User, Session, OutboxEvent } from '../generated/prisma';

dotenv.config({
  path: [
    path.resolve(__dirname, '../../.env'),
    path.resolve(__dirname, '../../../../.env'),
  ],
});

const databaseUrl =
  process.env.DATABASE_URL ||
  process.env.USER_DATABASE_URL ||
  'postgresql://user_svc:user-service-dev@localhost:5432/user_db';

export const prisma = new PrismaClient({ datasources: { db: { url: databaseUrl } } });

export default prisma;
