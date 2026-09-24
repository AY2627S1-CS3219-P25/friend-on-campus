/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Preserved credit rules using transactional persistence and asynchronous operations.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { randomBytes } from 'node:crypto';
import type { CreditStore } from './store';
import type { CreditWalletDTO, CreditSettlement, EscrowReserveRequest, EscrowSettleRequest, EscrowRefundRequest } from './types';

export class CreditError extends Error {}

function transactionCode() {
  // 27 characters, within the existing VARCHAR(30) unique column.
  return `TX-${randomBytes(12).toString('hex')}`;
}

export function createCreditService(store: CreditStore) {
  return {
    async getWallet(userId: string): Promise<CreditWalletDTO> {
      return (await store.findWallet(userId)) ?? store.createWallet(userId, 100);
    },
    getLedger(userId: string) {
      return store.findTransactions(userId);
    },
    reserve(body: EscrowReserveRequest): Promise<CreditWalletDTO> {
      return store.transaction(async (tx) => {
        if (!(await tx.findWallet(body.requesterId))) await tx.createWallet(body.requesterId, 100);
        const changed = await tx.changeBalance(body.requesterId,
          { available: -body.amount, escrow: body.amount }, { available: body.amount });
        if (!changed) throw new CreditError('Insufficient available credits for escrow hold');
        await tx.addTransaction({
          transactionCode: transactionCode(),
          fromUserId: body.requesterId,
          toUserId: null,
          orderId: body.orderId,
          amount: body.amount,
          transactionType: 'ESCROW_HOLD',
          description: `Escrow hold for order ${body.orderId}`,
        });
        return (await tx.findWallet(body.requesterId))!;
      });
    },
    settle(body: EscrowSettleRequest): Promise<CreditSettlement> {
      return store.transaction(async (tx) => {
        const changed = await tx.changeBalance(body.requesterId,
          { escrow: -body.amount }, { escrow: body.amount });
        if (!changed) throw new CreditError('Insufficient escrow credits to settle');
        if (!(await tx.findWallet(body.courierId))) await tx.createWallet(body.courierId, 100);
        await tx.changeBalance(body.courierId, { available: body.amount, earned: body.amount });
        await tx.addTransaction({
          transactionCode: transactionCode(),
          fromUserId: body.requesterId,
          toUserId: body.courierId,
          orderId: body.orderId,
          amount: body.amount,
          transactionType: 'ESCROW_RELEASE',
          description: `Escrow payout to courier for order ${body.orderId}`,
        });
        return {
          requesterWallet: (await tx.findWallet(body.requesterId))!,
          courierWallet: (await tx.findWallet(body.courierId))!,
        };
      });
    },
    refund(body: EscrowRefundRequest): Promise<CreditWalletDTO> {
      return store.transaction(async (tx) => {
        const changed = await tx.changeBalance(body.requesterId,
          { available: body.amount, escrow: -body.amount }, { escrow: body.amount });
        if (!changed) throw new CreditError('Insufficient escrow credits to refund');
        await tx.addTransaction({
          transactionCode: transactionCode(),
          fromUserId: null,
          toUserId: body.requesterId,
          orderId: body.orderId,
          amount: body.amount,
          transactionType: 'ESCROW_REFUND',
          description: `Escrow refund for cancelled/expired order ${body.orderId}`,
        });
        return (await tx.findWallet(body.requesterId))!;
      });
    },
  };
}

export type CreditService = ReturnType<typeof createCreditService>;
