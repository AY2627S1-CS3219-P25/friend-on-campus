/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Added JSON error responses for malformed input and unexpected persistence errors.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import cors from 'cors';
import express, { type ErrorRequestHandler } from 'express';
import { createCreditRouter } from './credits/routes';
import type { CreditService } from './credits/service';

export function createApp(dependencies: { credits: CreditService; port: string | number }) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      service: 'credit-service',
      status: 'UP',
      port: dependencies.port,
      timestamp: new Date(),
    });
  });
  app.use('/api/credits', createCreditRouter(dependencies.credits));

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error?.type === 'entity.parse.failed') {
      res.status(400).json({ success: false, error: 'Invalid JSON request body' });
      return;
    }
    console.error('[Credit Service] Request failed:', error instanceof Error ? error.name : 'Unknown error');
    res.status(500).json({ success: false, error: 'Credit operation failed' });
  };
  app.use(errorHandler);

  return app;
}
