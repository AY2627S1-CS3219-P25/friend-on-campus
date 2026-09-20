/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5), date: 2026-09-19
 * Scope: Generated Prisma client singleton for the supplier service.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by jagdeepsh)
import { PrismaClient } from './generated/client';

// Single shared Prisma client instance for the whole process.
// Both the running application (backend -> supplierRepository) and the
// standalone seed script import from here.
export const prisma = new PrismaClient();

export default prisma;
