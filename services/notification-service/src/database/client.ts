/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Prisma client for notification_db, same shape as credit-service's client module.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { config } from '../config';
import { PrismaClient } from './generated/client';

export { Prisma, PrismaClient } from './generated/client';

export const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
