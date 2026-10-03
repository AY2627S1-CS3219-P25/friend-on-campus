/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Created the service-local Prisma client using centralized configuration.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { config } from '../config';
import { PrismaClient } from './generated/client';

export { Prisma, PrismaClient } from './generated/client';
export type { CreditWallet, CreditTransaction } from './generated/client';

export const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
