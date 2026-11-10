/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity; Google Antigravity Agent, date: 2026-10-07 to 2026-10-20
 * Scope: Created service-local Prisma client using centralized configuration; updated across 2 AI-assisted revisions through D4 wrap-up (updated generated Prisma client import path to ../generated/prisma).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import { config } from '../config';
import { PrismaClient } from '../generated/prisma';

export { Prisma, PrismaClient } from '../generated/prisma';
export type { Order, OutboxEvent } from '../generated/prisma';

export const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
