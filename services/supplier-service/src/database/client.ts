/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5), date: 2026-09-19
 * Scope: Generated Prisma client singleton for the supplier service; added dotenv.config() so
 *        standalone scripts (seed.ts) also pick up src/.env, not just backend/server.ts.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by jagdeepsh)
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from './generated/client';

// Load src/.env explicitly (relative to this file, not the caller's cwd) so
// standalone scripts like seed.ts get DATABASE_URL too — only backend/server.ts
// called dotenv.config() before, which app-entrypoint-only scripts miss.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

// Single shared Prisma client instance for the whole process.
// Both the running application (backend -> supplierRepository) and the
// standalone seed script import from here.
export const prisma = new PrismaClient();

export default prisma;
