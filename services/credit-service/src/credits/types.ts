/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Reused the shared credit DTOs and named the existing settlement result shape.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import type { CreditWalletDTO } from '@campus-errand/common-dtos';

export type {
  CreditWalletDTO,
  CreditTransactionDTO,
  EscrowReserveRequest,
  EscrowSettleRequest,
  EscrowRefundRequest,
} from '@campus-errand/common-dtos';

export type CreditSettlement = {
  requesterWallet: CreditWalletDTO;
  courierWallet: CreditWalletDTO;
};
