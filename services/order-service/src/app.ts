/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Express application factory for Order Service configuring CORS, JSON middleware, health and readiness checks, and routing.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import cors from 'cors';
import { createOrderRouter } from './orders/order.routes';
import type { OrderService } from './orders/order.service';

export interface AppDependencies {
  orderService: OrderService;
  authenticate: RequestHandler;
  port?: number | string;
  isReady?: () => Promise<boolean>;
}

// ---------------------------------------------------------------------------
// Error Handling Middleware
// ---------------------------------------------------------------------------

const jsonParseErrorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error?.type === 'entity.parse.failed') {
    res.status(400).json({ success: false, error: 'Invalid JSON request body' });
    return;
  }
  console.error('[Order Service] Request failed:', error);
  res.status(500).json({ success: false, error: 'Internal server error' });
};

// ---------------------------------------------------------------------------
// Application Factory
// ---------------------------------------------------------------------------

export function createApp(deps: AppDependencies) {
  const app = express();

  app.use(cors());
  app.use(express.json());

  // Health and Readiness probes
  app.get('/health', (_req, res) => {
    res.json({
      service: 'order-service',
      status: 'UP',
      port: deps.port ?? 8003,
      timestamp: new Date().toISOString(),
    });
  });

  app.get('/ready', async (_req, res) => {
    let ready = false;
    try {
      ready = deps.isReady ? await deps.isReady() : true;
    } catch {
      ready = false;
    }
    res.status(ready ? 200 : 503).json({
      service: 'order-service',
      status: ready ? 'READY' : 'NOT_READY',
    });
  });

  // Mount API routes
  app.use('/api/orders', createOrderRouter(deps.orderService, deps.authenticate));

  // JSON parse error handler
  app.use(jsonParseErrorHandler);

  return app;
}
