/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Extracted credit HTTP routes and translated existing credit errors into the existing 400 responses.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { Router, type ErrorRequestHandler, type Request, type Response } from 'express';
import type { ApiResponse } from '@campus-errand/common-dtos';
import { CreditError, type CreditService } from './service';
import type { CreditSettlement, CreditTransactionDTO, CreditWalletDTO } from './types';

function getUserId(req: Request): string {
  return (req.headers['x-user-id'] as string) || 'u1111111-1111-1111-1111-111111111111';
}

export function createCreditRouter(credits: CreditService) {
  const router = Router();

  router.get('/wallet', (req: Request, res: Response<ApiResponse<CreditWalletDTO>>) => {
    res.json({ success: true, data: credits.getWallet(getUserId(req)) });
  });

  router.get('/ledger', (req: Request, res: Response<ApiResponse<CreditTransactionDTO[]>>) => {
    res.json({ success: true, data: credits.getLedger(getUserId(req)) });
  });

  router.post('/escrow/reserve', (req: Request, res: Response<ApiResponse<CreditWalletDTO>>) => {
    res.json({
      success: true,
      data: credits.reserve(req.body),
      message: 'Escrow reserved successfully',
    });
  });

  router.post('/escrow/settle', (req: Request, res: Response<ApiResponse<CreditSettlement>>) => {
    res.json({
      success: true,
      data: credits.settle(req.body),
      message: 'Credits atomically settled to courier',
    });
  });

  router.post('/escrow/refund', (req: Request, res: Response<ApiResponse<CreditWalletDTO>>) => {
    res.json({
      success: true,
      data: credits.refund(req.body),
      message: 'Escrow refunded to available balance',
    });
  });

  const handleCreditError: ErrorRequestHandler = (error, _req, res, next) => {
    if (error instanceof CreditError) {
      res.status(400).json({ success: false, error: error.message });
      return;
    }
    next(error);
  };
  router.use(handleCreditError);

  return router;
}
