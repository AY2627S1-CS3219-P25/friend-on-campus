/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-28
 * Scope: Purged asymmetric JWT_PUBLIC_KEY; configured Supplier Service auth middleware to use SESSION_SECRET and gateway header offloading.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5), date: 2026-09-19
 * Scope: Generated Express server entry point that mounts the supplier routes (replaces src/index.ts).
 * Author review: (to be completed by author after review)
 */
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Configured the author-approved Ed25519 Supplier Service access-token verifier at startup.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by jagdeepsh)
// AI-generated (edited by ngkhengyang)
import { authMiddleware, requireAdmin } from '@campus-errand/auth';
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createSupplierRouter } from './supplierRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;
const authenticateToken = authMiddleware({
  secretKey: process.env.SESSION_SECRET,
  issuer: process.env.JWT_ISSUER ?? 'friend-on-campus-user-service',
  audience: process.env.JWT_AUDIENCE ?? 'friend-on-campus-services',
});

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ service: 'supplier-service', status: 'UP', port: PORT, timestamp: new Date() });
});

app.use('/api/suppliers', createSupplierRouter(authenticateToken, requireAdmin));

app.listen(PORT, () => {
  console.log(`🚀 [Supplier Service] running on port ${PORT} with tsx`);
});
