/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: The history route of the author's S5/S6 answers (REST like the bell): GET /api/chat/:orderId opens the
 * conversation (running the Order Service fallback when no row exists) and returns it with its messages in
 * sequence order. Paging and error shape follow notification-service/src/notifications/routes.ts.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-25
 * Scope: Review fix (PR #148): afterSequence is clamped to the INTEGER maximum so an oversized value pages to an
 * empty list instead of a 500.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { Router, type Request, type RequestHandler, type Response } from 'express';
import type { AuthenticatedPrincipal } from '@campus-errand/auth';
import type { ConversationService } from '../conversations/service';
import { toMessageDTO } from '../ws/hub';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Express 4 does not forward rejected async handlers automatically.
function asyncRoute(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => { handler(req, res).catch(next); };
}

function clamp(value: unknown, fallback: number, minimum: number, maximum: number): number {
  const parsed = Number.parseInt(String(value ?? ''), 10);
  return Math.min(maximum, Math.max(minimum, Number.isNaN(parsed) ? fallback : parsed));
}

export function createChatRouter(service: ConversationService, authenticate: RequestHandler) {
  const router = Router();
  router.use(authenticate);

  router.get('/:orderId', asyncRoute(async (req, res) => {
    if (!UUID.test(req.params.orderId)) {
      res.status(400).json({ success: false, error: 'Order id must be a UUID', code: 'INVALID_INPUT' });
      return;
    }
    const principal = res.locals.auth as AuthenticatedPrincipal;
    // The fallback calls the Order Service as the caller; the middleware already verified this token.
    const token = (req.headers.authorization ?? '').replace(/^Bearer\s+/i, '');
    const opened = await service.open(req.params.orderId.toLowerCase(), principal, token);
    if (opened.kind === 'not_found') {
      res.status(404).json({ success: false, error: 'No conversation exists for this errand', code: 'CONVERSATION_NOT_FOUND' });
      return;
    }
    if (opened.kind === 'forbidden') {
      res.status(403).json({ success: false, error: 'You are not a participant of this conversation', code: 'FORBIDDEN' });
      return;
    }
    if (opened.kind === 'unavailable') {
      res.status(503).json({ success: false, error: 'Order Service is temporarily unavailable', code: 'ORDER_SERVICE_UNAVAILABLE' });
      return;
    }
    const messages = await service.messages(opened.conversation.id, {
      // Message.sequence is a Postgres INTEGER; anything above its maximum would be a 500 from the query engine.
      afterSequence: clamp(req.query.afterSequence, 0, 0, 2147483647),
      limit: clamp(req.query.limit, 50, 1, 100),
    });
    res.json({ success: true, data: { conversation: opened.conversation, messages: messages.map(toMessageDTO) } });
  }));

  return router;
}
