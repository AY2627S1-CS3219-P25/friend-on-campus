/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Updated generated Prisma client import path to ../generated/prisma.
 * Author review: <to be completed by author after review>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Created service-local Prisma client using centralized configuration.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { config } from '../config';
import { PrismaClient } from '../generated/prisma';

export { Prisma, PrismaClient } from '../generated/prisma';
export type { Order, OutboxEvent } from '../generated/prisma';

export const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
