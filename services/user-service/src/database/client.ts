/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-20
 * Scope: Generated Prisma client singleton for the user service; added dotenv.config() so
 *        standalone scripts (seed.ts) also pick up src/.env, not just the app entrypoint.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import path from 'node:path';
import dotenv from 'dotenv';
import { PrismaClient } from './generated/client';

// Load src/.env explicitly (relative to this file, not the caller's cwd) so
// standalone scripts like seed.ts get DATABASE_URL too — only src/index.ts
// called dotenv.config() before, which app-entrypoint-only scripts miss.
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const prisma = new PrismaClient();

export default prisma;
