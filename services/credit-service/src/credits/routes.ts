/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity (model: Claude Opus 4.6); Codex (model: GPT-6), date: 2026-09-24 to 2026-10-19
 * Scope: Protected wallet and ledger reads with verified token ownership; retained escrow HTTP behavior; updated across 2 AI-assisted revisions through D4 wrap-up (removed unauthenticated POST /api/credits/escrow/reserve HTTP endpoint (Issue #42)).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import { Router, type ErrorRequestHandler, type Request, type RequestHandler, type Response } from 'express';
import type { AuthenticatedPrincipal } from '@campus-errand/auth';
import { CreditError, type CreditService } from './service';

function uuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new CreditError(`${field} must be a UUID`);
  }
  return value.toLowerCase();
}

// Express 4 does not forward rejected async handlers automatically.
function asyncRoute(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => { handler(req, res).catch(next); };
}

export function createCreditRouter(credits: CreditService, authenticate: RequestHandler) {
  const router = Router();
  router.get('/wallet', authenticate, asyncRoute(async (_req, res) => {
    const userId = uuid((res.locals.auth as AuthenticatedPrincipal).userId, 'Token userId');
    res.json({ success: true, data: await credits.getWallet(userId) });
  }));
  router.get('/ledger', authenticate, asyncRoute(async (_req, res) => {
    const userId = uuid((res.locals.auth as AuthenticatedPrincipal).userId, 'Token userId');
    res.json({ success: true, data: await credits.getLedger(userId) });
  }));
  const handleCreditError: ErrorRequestHandler = (error, _req, res, next) => {
    if (error instanceof CreditError) {
      res.status(error.status).json({ success: false, error: error.message });
      return;
    }
    next(error);
  };
  router.use(handleCreditError);
  return router;
}
