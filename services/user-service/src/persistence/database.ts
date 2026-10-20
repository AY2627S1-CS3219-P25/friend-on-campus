/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Imported PrismaClient from ../database/client instead of directly from generated folder.
 * Author review: <to be completed by author after review>
 *
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented Prisma client readiness checks and graceful database shutdown handling for the User Service.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by yanhwee)
// AI-generated (edited by ngkhengyang)
import { PrismaClient } from '../database/client';
import { logError } from '../utils/logger';

export interface Database {
  prisma: PrismaClient;
  isReady(): Promise<boolean>;
  close(): Promise<void>;
}

export function createDatabase(prisma: PrismaClient): Database {
  return {
    prisma,

    async isReady() {
      try {
        await prisma.$queryRawUnsafe(`
          SELECT
            u.id,
            u.username,
            u.email,
            u.password_hash,
            u.role,
            s.id,
            s.refresh_token_hash,
            s.persistent,
            s.idle_expires_at
          FROM users u
          LEFT JOIN sessions s ON FALSE
          LIMIT 0
        `);
        return true;
      } catch (error) {
        logError('database_readiness_check_failed', error);
        return false;
      }
    },

    async close() {
      await prisma.$disconnect();
    },
  };
}
