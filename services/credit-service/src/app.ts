/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Assembled Express middleware, health check and credit routes without starting a listener.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import cors from 'cors';
import express from 'express';
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

  return app;
}
