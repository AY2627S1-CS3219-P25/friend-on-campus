/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Implemented the author-specified persistent credit messaging and idempotency contract.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { randomBytes } from 'node:crypto';
import type { CreditStore, CreditTransactionStore } from './store';
import type { CreditWalletDTO, CreditSettlement, EscrowReserveRequest, EscrowSettleRequest, EscrowRefundRequest } from './types';
import { CreditError, CreditConflict } from './errors';
export { CreditError, CreditConflict } from './errors';

export type CreditCommand =
  | { kind: 'register'; userId: string; initialGrant: number }
  | { kind: 'settle'; body: EscrowSettleRequest }
  | { kind: 'refund'; body: EscrowRefundRequest };

function transactionCode() { return `TX-${randomBytes(12).toString('hex')}`; }

async function initializeWallet(tx: CreditTransactionStore, userId: string, initialGrant?: number) {
  const wallet = await tx.findWallet(userId);
  const grant = await tx.findGrant(userId);
  if (grant) {
    if (initialGrant !== undefined && grant.amount !== initialGrant) throw new CreditConflict('Initial grant conflicts with existing grant');
    if (!wallet) throw new CreditConflict('Grant exists without a wallet');
    return wallet;
  }
  // Every initialized wallet must have a grant marker. Never infer a grant from a mutable balance.
  if (wallet) throw new CreditConflict('Wallet has no initial grant record');
  const amount = initialGrant ?? 100;
  const created = await tx.createWallet(userId, amount);
  await tx.createGrant(userId, amount);
  await tx.addTransaction({
    transactionCode: transactionCode(), fromUserId: null, toUserId: userId, orderId: null,
    amount, transactionType: 'WELCOME_GRANT', description: 'Initial credit allocation',
  });
  return created;
}

async function matchingEscrow(tx: CreditTransactionStore, body: EscrowReserveRequest) {
  const escrow = await tx.findEscrow(body.orderId);
  if (!escrow) throw new CreditConflict('No reservation exists for this order');
  if (escrow.requesterId !== body.requesterId || escrow.amount !== body.amount) {
    throw new CreditConflict('Order reservation requester or amount conflicts');
  }
  return escrow;
}

async function reserve(tx: CreditTransactionStore, body: EscrowReserveRequest): Promise<CreditWalletDTO> {
  if (await tx.findEscrow(body.orderId)) {
    await matchingEscrow(tx, body);
    // An identical reserve replay never reopens a terminal reservation.
    return (await tx.findWallet(body.requesterId))!;
  }
  await initializeWallet(tx, body.requesterId);
  await tx.createEscrow(body);
  if (!await tx.changeBalance(body.requesterId, { available: -body.amount, escrow: body.amount }, { available: body.amount })) {
    throw new CreditError('Insufficient available credits for escrow hold');
  }
  await tx.addTransaction({
    transactionCode: transactionCode(), fromUserId: body.requesterId, toUserId: null,
    orderId: body.orderId, amount: body.amount, transactionType: 'ESCROW_HOLD',
    description: `Escrow hold for order ${body.orderId}`,
  });
  return (await tx.findWallet(body.requesterId))!;
}

async function settle(tx: CreditTransactionStore, body: EscrowSettleRequest): Promise<CreditSettlement> {
  const escrow = await matchingEscrow(tx, body);
  if (escrow.state === 'REFUNDED') throw new CreditConflict('Order was already refunded');
  if (escrow.state === 'SETTLED' && escrow.courierId !== body.courierId) throw new CreditConflict('Settlement courier conflicts');
  if (escrow.state === 'RESERVED') {
    if (!await tx.transitionEscrow(body.orderId, 'SETTLED', body.courierId)) throw new CreditConflict('Escrow transition conflicts');
    if (!await tx.changeBalance(body.requesterId, { escrow: -body.amount }, { escrow: body.amount })) {
      throw new CreditConflict('Reserved balance does not match escrow');
    }
    await initializeWallet(tx, body.courierId);
    await tx.changeBalance(body.courierId, { available: body.amount, earned: body.amount });
    await tx.addTransaction({
      transactionCode: transactionCode(), fromUserId: body.requesterId, toUserId: body.courierId,
      orderId: body.orderId, amount: body.amount, transactionType: 'ESCROW_RELEASE',
      description: `Escrow payout to courier for order ${body.orderId}`,
    });
  }
  return { requesterWallet: (await tx.findWallet(body.requesterId))!, courierWallet: (await tx.findWallet(body.courierId))! };
}

async function refund(tx: CreditTransactionStore, body: EscrowRefundRequest): Promise<CreditWalletDTO> {
  const escrow = await matchingEscrow(tx, body);
  if (escrow.state === 'SETTLED') throw new CreditConflict('Order was already settled');
  if (escrow.state === 'RESERVED') {
    if (!await tx.transitionEscrow(body.orderId, 'REFUNDED')) throw new CreditConflict('Escrow transition conflicts');
    if (!await tx.changeBalance(body.requesterId, { available: body.amount, escrow: -body.amount }, { escrow: body.amount })) {
      throw new CreditConflict('Reserved balance does not match escrow');
    }
    await tx.addTransaction({
      transactionCode: transactionCode(), fromUserId: null, toUserId: body.requesterId,
      orderId: body.orderId, amount: body.amount, transactionType: 'ESCROW_REFUND',
      description: `Escrow refund for cancelled/expired order ${body.orderId}`,
    });
  }
  return (await tx.findWallet(body.requesterId))!;
}

export function createCreditService(store: CreditStore) {
  return {
    getWallet: (userId: string) => store.transaction(tx => initializeWallet(tx, userId)),
    getLedger: (userId: string) => store.findTransactions(userId),
    reserve: (body: EscrowReserveRequest) => store.transaction(tx => reserve(tx, body)),
    settle: (body: EscrowSettleRequest) => store.transaction(tx => settle(tx, body)),
    refund: (body: EscrowRefundRequest) => store.transaction(tx => refund(tx, body)),
    applyEvent(identity: { eventId: string; eventType: string; fingerprint: string }, command: CreditCommand) {
      return store.transaction(async tx => {
        const previous = await tx.findEvent(identity.eventId);
        if (previous) {
          if (previous.fingerprint !== identity.fingerprint || previous.eventType !== identity.eventType) {
            throw new CreditConflict('Event ID was reused with different content');
          }
          return;
        }
        await tx.addEvent(identity);
        if (command.kind === 'register') await initializeWallet(tx, command.userId, command.initialGrant);
        else if (command.kind === 'settle') await settle(tx, command.body);
        else await refund(tx, command.body);
      });
    },
  };
}
export type CreditService = ReturnType<typeof createCreditService>;
