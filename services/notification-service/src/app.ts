/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Optional onInboxChanged dependency, handed to the notification router (Notification Redesign §7).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Express app for the Notification Service, in the shape of credit-service's app module: /health, /ready,
 * the notification routes and a generic error handler.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import cors from 'cors';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { createNotificationRouter } from './notifications/routes';
import type { NotificationStore } from './notifications/store';

export function createApp(dependencies: {
  store: NotificationStore;
  authenticate: RequestHandler;
  port: string | number;
  /** Consumer connected and database reachable. */
  isReady: () => Promise<boolean>;
  /** Extra fields for /health, such as the socket count. */
  status?: () => Record<string, unknown>;
  /** Called after a read-state change so the user's open sockets refetch. */
  onInboxChanged?: (userId: string) => unknown;
}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      service: 'notification-service',
      status: 'UP',
      port: dependencies.port,
      ...dependencies.status?.(),
      timestamp: new Date(),
    });
  });
  app.get('/ready', async (_req, res) => {
    let ready = false;
    try { ready = await dependencies.isReady(); } catch { /* Dependency unavailable. */ }
    res.status(ready ? 200 : 503).json({ service: 'notification-service', status: ready ? 'READY' : 'NOT_READY' });
  });
  app.use('/api/notifications', createNotificationRouter(dependencies.store, dependencies.authenticate, dependencies.onInboxChanged));

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error?.type === 'entity.parse.failed') {
      res.status(400).json({ success: false, error: 'Invalid JSON request body' });
      return;
    }
    console.error('[Notification Service] Request failed:', error instanceof Error ? error.name : 'Unknown error');
    res.status(500).json({ success: false, error: 'Notification operation failed' });
  };
  app.use(errorHandler);

  return app;
}
