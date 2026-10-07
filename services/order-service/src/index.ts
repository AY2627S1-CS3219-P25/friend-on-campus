/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Main entrypoint for Order Service initializing database, outbox publisher, expiry sweeper, authenticated Express server, and graceful shutdown handlers.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import type { Server } from 'node:http';
import type { Request, Response, NextFunction } from 'express';
import { authMiddleware } from '@campus-errand/auth';
import { createApp } from './app';
import { config } from './config';
import { prisma } from './database/client';
import { createOrderRepository } from './repositories/order.repository';
import { createCreditClient } from './clients/credit.client';
import { createSupplierClient } from './clients/supplier.client';
import { createOrderService } from './orders/order.service';
import { createExpirySweeper, type ExpirySweeper } from './orders/expiry.sweeper';
import { createRabbitMQPublisher, type OrderEventPublisher } from './messaging/event.publisher';
import { createOutboxRelay, type OutboxRelay } from './messaging/outbox.relay';

let server: Server | undefined;
let publisher: OrderEventPublisher | undefined;
let outboxRelay: OutboxRelay | undefined;
let expirySweeper: ExpirySweeper | undefined;
let stopping = false;
let shutdownPromise: Promise<void> | undefined;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildAuthMiddleware(authConfig: typeof config.auth): (req: Request, res: Response, next: NextFunction) => void {
  if (authConfig.publicKey && authConfig.publicKey.trim() !== '') {
    return authMiddleware(authConfig);
  }

  console.warn('[Order Service] WARNING: JWT_PUBLIC_KEY not set; using development fallback authentication.');
  return (req: Request, res: Response, next: NextFunction) => {
    const headerUserId = req.headers['x-user-id'];
    if (typeof headerUserId === 'string' && headerUserId.trim() !== '') {
      res.locals.auth = {
        userId: headerUserId.trim(),
        role: (req.headers['x-user-role'] as string) || 'STUDENT',
        sessionId: 'dev-session',
      };
      return next();
    }
    res.status(401).json({ success: false, error: 'Unauthorized: missing authentication token or x-user-id header' });
  };
}

function shutdown(failed = false): Promise<void> {
  if (failed) process.exitCode = 1;
  if (shutdownPromise) return shutdownPromise;
  stopping = true;

  shutdownPromise = (async () => {
    console.log('[Order Service] Shutting down gracefully...');
    if (expirySweeper) {
      await expirySweeper.stop();
    }
    if (outboxRelay) {
      await outboxRelay.stop();
    }
    if (publisher) {
      await publisher.close();
    }
    if (server?.listening) {
      await new Promise<void>((resolve) => server!.close(() => resolve()));
    }
    await prisma.$disconnect();
    console.log('[Order Service] Shutdown complete.');
  })().catch((err) => {
    console.error('[Order Service] Error during shutdown:', err);
    process.exitCode = 1;
  });

  return shutdownPromise;
}

// ---------------------------------------------------------------------------
// Main Process Entrypoint
// ---------------------------------------------------------------------------

async function main() {
  console.log(`[Order Service] Initializing on port ${config.port}...`);

  const authenticate = buildAuthMiddleware(config.auth);

  // Connect to PostgreSQL database
  await prisma.$connect();
  console.log('[Order Service] Connected to PostgreSQL order_db.');

  // Verify database tables
  await Promise.all([
    prisma.order.findFirst().catch(() => null),
    prisma.outboxEvent.findFirst().catch(() => null),
  ]);

  // Initialize messaging and domain dependencies
  publisher = createRabbitMQPublisher(config.rabbitmq);
  outboxRelay = createOutboxRelay({
    prisma,
    publisher,
    pollIntervalMs: config.outboxRelay.intervalMs,
    batchSize: config.outboxRelay.batchSize,
  });

  const orderRepo = createOrderRepository(prisma);
  const creditClient = createCreditClient(config.creditServiceUrl);
  const supplierClient = createSupplierClient(config.supplierServiceUrl);
  const orderService = createOrderService({
    repository: orderRepo,
    creditClient,
    supplierClient,
    outboxRelay,
  });

  expirySweeper = createExpirySweeper({
    repository: orderRepo,
    outboxRelay,
    pollIntervalMs: config.expirySweeper.intervalMs,
  });

  // Start background workers
  outboxRelay.start();
  expirySweeper.start();

  // Create Express application
  const app = createApp({
    orderService,
    authenticate,
    port: config.port,
    isReady: async () => {
      if (stopping) return false;
      try {
        await prisma.$queryRaw`SELECT 1`;
        return true;
      } catch {
        return false;
      }
    },
  });

  server = app.listen(config.port, () => {
    console.log(`🚀 [Order Service] listening on port ${config.port}`);
  });

  server.on('error', (err) => {
    console.error('[Order Service] Server error:', err);
    void shutdown(true);
  });

  process.once('SIGINT', () => { void shutdown(); });
  process.once('SIGTERM', () => { void shutdown(); });
}

void main().catch(async (err) => {
  console.error('[Order Service] Startup failed:', err);
  await shutdown(true);
});
