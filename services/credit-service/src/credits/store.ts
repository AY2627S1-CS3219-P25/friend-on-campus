/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Extracted the existing in-memory wallet and ledger data access into an isolated store.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import type { CreditTransactionDTO, CreditWalletDTO } from './types';

export function createCreditStore() {
  // In-memory mock wallet store
  const mockWallets: Record<string, CreditWalletDTO> = {
    'u1111111-1111-1111-1111-111111111111': {
      userId: 'u1111111-1111-1111-1111-111111111111',
      availableCredits: 85,
      escrowCredits: 15,
      totalEarnedCredits: 45,
      updatedAt: new Date().toISOString(),
    },
    'u2222222-2222-2222-2222-222222222222': {
      userId: 'u2222222-2222-2222-2222-222222222222',
      availableCredits: 120,
      escrowCredits: 20,
      totalEarnedCredits: 60,
      updatedAt: new Date().toISOString(),
    },
  };

  // In-memory audit ledger
  const mockLedger: CreditTransactionDTO[] = [
    {
      id: 'tx-1',
      transactionCode: 'TX-1001',
      fromUserId: null,
      toUserId: 'u1111111-1111-1111-1111-111111111111',
      amount: 100,
      transactionType: 'WELCOME_GRANT',
      description: 'Initial student registration welcome credits',
      createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    },
    {
      id: 'tx-2',
      transactionCode: 'TX-1002',
      fromUserId: 'u1111111-1111-1111-1111-111111111111',
      toUserId: null,
      orderId: 'ord-1001',
      amount: 15,
      transactionType: 'ESCROW_HOLD',
      description: 'Escrow lock for errand E-1042',
      createdAt: new Date().toISOString(),
    },
  ];

  return {
    findWallet(userId: string): CreditWalletDTO | undefined {
      return mockWallets[userId];
    },
    saveWallet(wallet: CreditWalletDTO): void {
      mockWallets[wallet.userId] = wallet;
    },
    findTransactions(userId: string): CreditTransactionDTO[] {
      return mockLedger.filter((t) => t.fromUserId === userId || t.toUserId === userId);
    },
    addTransaction(transaction: CreditTransactionDTO): void {
      mockLedger.unshift(transaction);
    },
  };
}

export type CreditStore = ReturnType<typeof createCreditStore>;
