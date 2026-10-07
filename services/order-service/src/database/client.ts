/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Created service-local Prisma client using centralized configuration.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { config } from '../config';
import { PrismaClient } from './generated/client';

export { Prisma, PrismaClient } from './generated/client';
export type { Order, OutboxEvent } from './generated/client';

export const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
