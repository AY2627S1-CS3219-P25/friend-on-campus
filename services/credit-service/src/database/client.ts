/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Updated generated Prisma client import path to ../generated/prisma.
 * Author review: <to be completed by author after review>
 *
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Created the service-local Prisma client using centralized configuration.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by yanhwee)
// AI-generated (edited by huangjiaxi1111)
import { config } from '../config';
import { PrismaClient } from '../generated/prisma';

export { Prisma, PrismaClient } from '../generated/prisma';
export type { CreditWallet, CreditTransaction, CreditGrant, CreditEscrow, ProcessedCreditEvent, CreditOutboxEvent } from '../generated/prisma';

export const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
