/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: The three REST routes of the author's design (list, mark one read, mark all read), every one behind the
 * access-token middleware and scoped to the caller's user id.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { AuthenticatedPrincipal } from '@campus-errand/auth';
import type { NotificationStore } from './store';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Express 4 does not forward rejected async handlers automatically.
function asyncRoute(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => { handler(req, res).catch(next); };
}

function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Math.min(maximum, Math.max(minimum, Number.isNaN(parsed) ? fallback : parsed));
}

export function createNotificationRouter(store: NotificationStore, authenticate: RequestHandler) {
  const router = Router();
  router.use(authenticate);
  const caller = (res: Response) => (res.locals.auth as AuthenticatedPrincipal).userId;

  router.get('/', asyncRoute(async (req, res) => {
    const page = await store.list(caller(res), {
      unreadOnly: req.query.unread === 'true',
      page: clamp(req.query.page, 1, 1, Number.MAX_SAFE_INTEGER),
      limit: clamp(req.query.limit, 20, 1, 100),
    });
    res.json({ success: true, data: page });
  }));

  router.patch('/:id/read', asyncRoute(async (req, res) => {
    // Someone else's notification answers exactly like a missing one.
    const notification = UUID.test(req.params.id) ? await store.markRead(caller(res), req.params.id) : null;
    if (!notification) {
      res.status(404).json({ success: false, error: 'Notification not found', code: 'NOTIFICATION_NOT_FOUND' });
      return;
    }
    res.json({ success: true, data: notification });
  }));

  router.post('/read-all', asyncRoute(async (_req, res) => {
    res.json({ success: true, data: { updated: await store.markAllRead(caller(res)) } });
  }));

  return router;
}
