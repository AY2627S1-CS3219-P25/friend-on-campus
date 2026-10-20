/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-19
 * Scope: Extracted Express application factory createApp() for Supplier Service to match service architecture conventions.
 * Author review: (to be completed by yanhwee)
 */
// AI-generated (edited by yanhwee)
import { authMiddleware, requireAdmin } from '@campus-errand/auth';
import cors from 'cors';
import express, { Express, Request, RequestHandler, Response } from 'express';
import { config } from './config';
import { createSupplierRouter } from './suppliers/supplierRoutes';

export interface SupplierAppOptions {
  port?: number;
  requireAuthentication?: RequestHandler;
  requireAdminRole?: RequestHandler;
}

function defaultAuthMiddleware(): RequestHandler {
  if (!config.auth.publicKey) {
    throw new Error('JWT_PUBLIC_KEY must be configured');
  }
  return authMiddleware({
    publicKey: config.auth.publicKey,
    issuer: config.auth.issuer,
    audience: config.auth.audience,
  });
}

export function createApp(options: SupplierAppOptions = {}): Express {
  const app = express();
  const port = options.port ?? config.port;
  const authenticateToken =
    options.requireAuthentication ?? defaultAuthMiddleware();
  const authorizeAdmin = options.requireAdminRole ?? requireAdmin;

  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({
      service: 'supplier-service',
      status: 'UP',
      port,
      timestamp: new Date(),
    });
  });

  app.use('/api/suppliers', createSupplierRouter(authenticateToken, authorizeAdmin));

  return app;
}
