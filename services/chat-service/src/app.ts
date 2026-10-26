/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Express app for the Chat Service in the shape of notification-service/src/app.ts: /health, /ready, the chat
 * history route under /api/chat (S6) and the generic error handler.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import cors from 'cors';
import express, { type ErrorRequestHandler, type RequestHandler } from 'express';
import { createChatRouter } from './chat/routes';
import type { ConversationService } from './conversations/service';

export function createApp(dependencies: {
  port: string | number;
  /** Consumer connected and database reachable. */
  isReady: () => Promise<boolean>;
  /** Extra fields for /health, such as the socket count. */
  status?: () => Record<string, unknown>;
  /** Absent only in the smoke test of the bare app. */
  chat?: { service: ConversationService; authenticate: RequestHandler };
}) {
  const app = express();
  app.use(cors());
  app.use(express.json());

  app.get('/health', (_req, res) => {
    res.json({
      service: 'chat-service',
      status: 'UP',
      port: dependencies.port,
      ...dependencies.status?.(),
      timestamp: new Date(),
    });
  });
  app.get('/ready', async (_req, res) => {
    let ready = false;
    try { ready = await dependencies.isReady(); } catch { /* Dependency unavailable. */ }
    res.status(ready ? 200 : 503).json({ service: 'chat-service', status: ready ? 'READY' : 'NOT_READY' });
  });
  if (dependencies.chat) {
    app.use('/api/chat', createChatRouter(dependencies.chat.service, dependencies.chat.authenticate));
  }

  const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
    if (error?.type === 'entity.parse.failed') {
      res.status(400).json({ success: false, error: 'Invalid JSON request body' });
      return;
    }
    console.error('[Chat Service] Request failed:', error instanceof Error ? error.name : 'Unknown error');
    res.status(500).json({ success: false, error: 'Chat operation failed' });
  };
  app.use(errorHandler);

  return app;
}
