/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Reused the shared credit DTOs and named the existing settlement result shape.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
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
