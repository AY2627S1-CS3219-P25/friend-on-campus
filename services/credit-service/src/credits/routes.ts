/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Normalized UUIDs and translated credit conflicts into HTTP 409 responses.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { Router, type ErrorRequestHandler, type Request, type RequestHandler, type Response } from 'express';
import { CreditError, type CreditService } from './service';
import type { EscrowReserveRequest } from './types';

function uuid(value: unknown, field: string): string {
  if (typeof value !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)) {
    throw new CreditError(`${field} must be a UUID`);
  }
  return value.toLowerCase();
}

function escrowRequest(body: unknown): EscrowReserveRequest {
  if (!body || typeof body !== 'object') throw new CreditError('A JSON request body is required');
  const input = body as Record<string, unknown>;
  const requesterId = uuid(input.requesterId, 'requesterId');
  const orderId = uuid(input.orderId, 'orderId');
  if (typeof input.amount !== 'number' || !Number.isInteger(input.amount) || input.amount <= 0 || input.amount > 2147483647) {
    throw new CreditError('amount must be a positive PostgreSQL integer (1–2147483647)');
  }
  return { requesterId, orderId, amount: input.amount };
}

// Express 4 does not forward rejected async handlers automatically.
function asyncRoute(handler: (req: Request, res: Response) => Promise<void>): RequestHandler {
  return (req, res, next) => { handler(req, res).catch(next); };
}

export function createCreditRouter(credits: CreditService) {
  const router = Router();
  router.get('/wallet', asyncRoute(async (req, res) => {
    const userId = uuid(req.headers['x-user-id'], 'x-user-id');
    res.json({ success: true, data: await credits.getWallet(userId) });
  }));
  router.get('/ledger', asyncRoute(async (req, res) => {
    const userId = uuid(req.headers['x-user-id'], 'x-user-id');
    res.json({ success: true, data: await credits.getLedger(userId) });
  }));
  router.post('/escrow/reserve', asyncRoute(async (req, res) => {
    const data = await credits.reserve(escrowRequest(req.body));
    res.json({ success: true, data, message: 'Escrow reserved successfully' });
  }));
  router.post('/escrow/settle', asyncRoute(async (req, res) => {
    const body = escrowRequest(req.body);
    const courierId = uuid(req.body.courierId, 'courierId');
    const data = await credits.settle({ ...body, courierId });
    res.json({ success: true, data, message: 'Credits atomically settled to courier' });
  }));
  router.post('/escrow/refund', asyncRoute(async (req, res) => {
    const data = await credits.refund(escrowRequest(req.body));
    res.json({ success: true, data, message: 'Escrow refunded to available balance' });
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
