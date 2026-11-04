/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Wired AssistantService with SoCLaaS gateway and supplier client into Order Service startup.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Wire the reservation saga and result consumer into startup, readiness and shutdown.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Main entrypoint for Order Service initializing database, outbox publisher, expiry sweeper, authenticated Express server, and graceful shutdown handlers.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { authMiddleware } from '@campus-errand/auth';
import type { NextFunction, Request, Response } from 'express';
import type { Server } from 'node:http';
import { createApp } from './app';
import { createAssistantService } from './assistant/assistant.service';
import { createSupplierClient } from './clients/supplier.client';
import { config } from './config';
import { prisma } from './database/client';
import { startReservationConsumer } from './messaging/reservation.consumer';
import { createExpirySweeper, type ExpirySweeper } from './orders/expiry.sweeper';
import { createOrderService } from './orders/order.service';
import { createOrderRepository } from './repositories/order.repository';

let consumer: Awaited<ReturnType<typeof startReservationConsumer>> | undefined;
let server: Server | undefined;
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

  const allowDevAuth = process.env.ORDER_DEV_AUTH === '1' || process.env.ORDER_DEV_AUTH === 'true';
  if (!allowDevAuth) {
    throw new Error(
      '[Order Service] FATAL: JWT_PUBLIC_KEY is not set. To run with development mock authentication, explicitly set ORDER_DEV_AUTH=1.'
    );
  }

  console.warn('[Order Service] WARNING: JWT_PUBLIC_KEY not set; using development fallback authentication because ORDER_DEV_AUTH=1.');
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
    await consumer?.close();
    if (expirySweeper) {
      await expirySweeper.stop();
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

  const orderRepo = createOrderRepository(prisma);
  const supplierClient = createSupplierClient(config.supplierServiceUrl);
  const assistantService = createAssistantService(supplierClient, config.assistant);
  const orderService = createOrderService({
    repository: orderRepo,
    supplierClient,
  });
  consumer = await startReservationConsumer(config.rabbitmq, orderService, () => { void shutdown(true); });
  if (stopping) { await consumer.close(); return; }

  expirySweeper = createExpirySweeper({
    repository: orderRepo,
    pollIntervalMs: config.expirySweeper.intervalMs,
  });
  expirySweeper.start();

  // Create Express application
  const app = createApp({
    orderService,
    assistantService,
    authenticate,
    port: config.port,
    isReady: async () => {
      if (stopping || !consumer?.isReady()) return false;
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
