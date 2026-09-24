/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Extracted the existing wallet and escrow rules without changing the mock credit behavior.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import type { CreditStore } from './store';
import type {
  CreditWalletDTO,
  CreditSettlement,
  EscrowReserveRequest,
  EscrowSettleRequest,
  EscrowRefundRequest,
} from './types';

export class CreditError extends Error {}

function createWallet(userId: string): CreditWalletDTO {
  return {
    userId,
    availableCredits: 100,
    escrowCredits: 0,
    totalEarnedCredits: 0,
    updatedAt: new Date().toISOString(),
  };
}

export function createCreditService(store: CreditStore) {
  return {
    getWallet(userId: string): CreditWalletDTO {
      let wallet = store.findWallet(userId);
      if (!wallet) {
        wallet = createWallet(userId);
        store.saveWallet(wallet);
      }
      return wallet;
    },

    getLedger(userId: string) {
      return store.findTransactions(userId);
    },

    reserve(body: EscrowReserveRequest): CreditWalletDTO {
      const wallet = store.findWallet(body.requesterId) || createWallet(body.requesterId);
      if (wallet.availableCredits < body.amount) {
        throw new CreditError('Insufficient available credits for escrow hold');
      }

      wallet.availableCredits -= body.amount;
      wallet.escrowCredits += body.amount;
      wallet.updatedAt = new Date().toISOString();
      store.saveWallet(wallet);
      store.addTransaction({
        id: `tx-${Date.now()}`,
        transactionCode: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        fromUserId: body.requesterId,
        toUserId: null,
        orderId: body.orderId,
        amount: body.amount,
        transactionType: 'ESCROW_HOLD',
        description: `Escrow hold for order ${body.orderId}`,
        createdAt: new Date().toISOString(),
      });
      return wallet;
    },

    settle(body: EscrowSettleRequest): CreditSettlement {
      const requesterWallet = store.findWallet(body.requesterId);
      if (!requesterWallet || requesterWallet.escrowCredits < body.amount) {
        throw new CreditError('Insufficient escrow credits to settle');
      }
      const courierWallet = store.findWallet(body.courierId) || createWallet(body.courierId);

      requesterWallet.escrowCredits -= body.amount;
      requesterWallet.updatedAt = new Date().toISOString();
      courierWallet.availableCredits += body.amount;
      courierWallet.totalEarnedCredits += body.amount;
      courierWallet.updatedAt = new Date().toISOString();
      store.saveWallet(requesterWallet);
      store.saveWallet(courierWallet);
      store.addTransaction({
        id: `tx-${Date.now()}`,
        transactionCode: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        fromUserId: body.requesterId,
        toUserId: body.courierId,
        orderId: body.orderId,
        amount: body.amount,
        transactionType: 'ESCROW_RELEASE',
        description: `Escrow payout to courier for order ${body.orderId}`,
        createdAt: new Date().toISOString(),
      });
      return { requesterWallet, courierWallet };
    },

    refund(body: EscrowRefundRequest): CreditWalletDTO {
      const wallet = store.findWallet(body.requesterId);
      if (!wallet || wallet.escrowCredits < body.amount) {
        throw new CreditError('Insufficient escrow credits to refund');
      }

      wallet.escrowCredits -= body.amount;
      wallet.availableCredits += body.amount;
      wallet.updatedAt = new Date().toISOString();
      store.saveWallet(wallet);
      store.addTransaction({
        id: `tx-${Date.now()}`,
        transactionCode: `TX-${Math.floor(1000 + Math.random() * 9000)}`,
        fromUserId: null,
        toUserId: body.requesterId,
        orderId: body.orderId,
        amount: body.amount,
        transactionType: 'ESCROW_REFUND',
        description: `Escrow refund for cancelled/expired order ${body.orderId}`,
        createdAt: new Date().toISOString(),
      });
      return wallet;
    },
  };
}

export type CreditService = ReturnType<typeof createCreditService>;
