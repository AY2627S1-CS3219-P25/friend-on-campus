/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Updated generated Prisma client import path to ../generated/prisma and exported Notification type.
 * Author review: <to be completed by author after review>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Prisma client for notification_db, same shape as credit-service's client module.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by yanhwee)
// AI-generated (edited by Reallyeasy1)
import { config } from '../config';
import { PrismaClient } from '../generated/prisma';

export { Prisma, PrismaClient } from '../generated/prisma';
export type { Notification } from '../generated/prisma';

export const prisma = new PrismaClient({ datasources: { db: { url: config.databaseUrl } } });
