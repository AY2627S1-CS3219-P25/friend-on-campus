/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5), date: 2026-09-19
 * Scope: Generated Express server entry point that mounts the supplier routes (replaces src/index.ts).
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by jagdeepsh)
import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import supplierRoutes from './supplierRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8002;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ service: 'supplier-service', status: 'UP', port: PORT, timestamp: new Date() });
});

app.use('/api/suppliers', supplierRoutes);

app.listen(PORT, () => {
  console.log(`🚀 [Supplier Service] running on port ${PORT} with tsx`);
});
