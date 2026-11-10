/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity; Codex (model: GPT-6), date: 2026-09-24 to 2026-10-20
 * Scope: Created the service-local Prisma client using centralized configuration; updated across 2 AI-assisted revisions through D4 wrap-up (updated generated Prisma client import path to ../generated/prisma).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import { config } from '../config';
import { PrismaClient } from '../generated/prisma';

export { Prisma, PrismaClient } from '../generated/prisma';
export type { CreditWallet, CreditTransaction, CreditGrant, CreditEscrow, ProcessedCreditEvent, CreditOutboxEvent } from '../generated/prisma';

export const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
