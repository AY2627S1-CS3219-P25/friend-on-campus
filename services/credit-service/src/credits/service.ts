/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: Increment 6 of the author's Notification Redesign (§4, §9): settle() and refund() write a
 * credit.escrow.settled / credit.escrow.refunded outbox row in the same transaction as the escrow transition, ledger
 * row and wallet change, referencing that ledger row; an idempotent replay (escrow already closed) writes nothing.
 * applyEvent passes the triggering Order event's id and code into the receipt.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity, date: 2026-10-19
 * Scope: Validated positive 32-bit integer amount in reserve() and simplified reservationResult to Saga Approach B2 (removed release-request and cross-service expiresAt clock check; order expiry refunds are handled via order.expired).
 * Author review: Reviewed and verified by yanhwee.
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Atomically persist reservation/refund results, balance changes and deduplication; roll back rejected holds.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Implemented the author-specified persistent credit messaging and idempotency contract.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by yanhwee)
// AI-generated (edited by huangjiaxi1111)
import { randomBytes, randomUUID } from 'node:crypto';
import type {
  CreditEscrowRefundedEvent,
  CreditEscrowSettledEvent,
  CreditReservationRequestEvent,
  CreditReservationResultEvent,
} from '@campus-errand/common-dtos';
import type { CreditStore, CreditTransactionStore } from './store';
import type { CreditWalletDTO, CreditSettlement, EscrowReserveRequest, EscrowSettleRequest, EscrowRefundRequest } from './types';
import { CreditError, CreditConflict } from './errors';
export { CreditError, CreditConflict } from './errors';

export type CreditCommand =
  | { kind: 'reserve-request'; event: CreditReservationRequestEvent }
  | { kind: 'register'; userId: string; initialGrant: number }
  | { kind: 'settle'; body: EscrowSettleRequest & { orderCode?: string } }
  | { kind: 'refund'; body: EscrowRefundRequest & { orderCode?: string } };

// AI-generated (edited by Reallyeasy1)
/** What a receipt needs beyond the command: the Order event that caused it and the errand's display code. */
export interface ReceiptContext {
  causationEventId?: string;
  orderCode?: string;
}

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

// AI-generated (edited by yanhwee)
async function reserve(tx: CreditTransactionStore, body: EscrowReserveRequest): Promise<CreditWalletDTO> {
  if (!Number.isInteger(body.amount) || body.amount <= 0 || body.amount > 2147483647) {
    throw new CreditError('Amount must be a positive 32-bit integer');
  }
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

async function settle(tx: CreditTransactionStore, body: EscrowSettleRequest, receipt: ReceiptContext = {}): Promise<CreditSettlement> {
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
    const ledger = await tx.addTransaction({
      transactionCode: transactionCode(), fromUserId: body.requesterId, toUserId: body.courierId,
      orderId: body.orderId, amount: body.amount, transactionType: 'ESCROW_RELEASE',
      description: `Escrow payout to courier for order ${body.orderId}`,
    });
    // AI-generated (edited by Reallyeasy1): the receipt commits with the payout, or not at all.
    const settled: CreditEscrowSettledEvent = {
      eventId: randomUUID(), eventType: 'credit.escrow.settled', timestamp: new Date().toISOString(),
      schemaVersion: 2, producer: 'credit-service', orderId: body.orderId, correlationId: body.orderId,
      ...(receipt.orderCode && { orderCode: receipt.orderCode }),
      ledgerTransactionId: ledger.id, transactionCode: ledger.transactionCode, amount: body.amount,
      beneficiaryId: body.courierId, requesterId: body.requesterId, courierId: body.courierId,
      ...(receipt.causationEventId && { causationEventId: receipt.causationEventId }),
    };
    await tx.addOutbox(settled);
  }
  return { requesterWallet: (await tx.findWallet(body.requesterId))!, courierWallet: (await tx.findWallet(body.courierId))! };
}

async function refund(tx: CreditTransactionStore, body: EscrowRefundRequest, receipt: ReceiptContext = {}): Promise<CreditWalletDTO> {
  const escrow = await matchingEscrow(tx, body);
  if (escrow.state === 'SETTLED') throw new CreditConflict('Order was already settled');
  if (escrow.state === 'RESERVED') {
    if (!await tx.transitionEscrow(body.orderId, 'REFUNDED')) throw new CreditConflict('Escrow transition conflicts');
    if (!await tx.changeBalance(body.requesterId, { available: body.amount, escrow: -body.amount }, { escrow: body.amount })) {
      throw new CreditConflict('Reserved balance does not match escrow');
    }
    const ledger = await tx.addTransaction({
      transactionCode: transactionCode(), fromUserId: null, toUserId: body.requesterId,
      orderId: body.orderId, amount: body.amount, transactionType: 'ESCROW_REFUND',
      description: `Escrow refund for cancelled/expired order ${body.orderId}`,
    });
    // AI-generated (edited by Reallyeasy1)
    const refunded: CreditEscrowRefundedEvent = {
      eventId: randomUUID(), eventType: 'credit.escrow.refunded', timestamp: new Date().toISOString(),
      schemaVersion: 2, producer: 'credit-service', orderId: body.orderId, correlationId: body.orderId,
      ...(receipt.orderCode && { orderCode: receipt.orderCode }),
      ledgerTransactionId: ledger.id, transactionCode: ledger.transactionCode, amount: body.amount,
      beneficiaryId: body.requesterId, requesterId: body.requesterId,
      ...(receipt.causationEventId && { causationEventId: receipt.causationEventId }),
    };
    await tx.addOutbox(refunded);
  }
  return (await tx.findWallet(body.requesterId))!;
}

// AI-generated (edited by yanhwee)
async function reservationResult(tx: CreditTransactionStore, event: CreditReservationRequestEvent) {
  const body = { orderId: event.orderId, requesterId: event.requesterId, amount: event.rewardCredits };
  let eventType: CreditReservationResultEvent['eventType'] = 'credit.reservation.succeeded';
  let reason: string | undefined;

  // A business rejection must roll back ALL attempted balance/ledger writes, while
  // the outer transaction still commits the dedup marker and the failure response.
  await tx.savepoint();
  try {
    const existing = await tx.findEscrow(body.orderId);
    if (existing && existing.state !== 'RESERVED') throw new CreditConflict('Reservation is already closed');
    await reserve(tx, body);
  } catch (error) {
    if (!(error instanceof CreditError)) throw error;
    await tx.rollbackAttempt();
    eventType = 'credit.reservation.failed';
    reason = error.message;
  }
  await tx.releaseSavepoint();

  const result: CreditReservationResultEvent = {
    eventId: randomUUID(), eventType, correlationId: event.correlationId,
    orderId: event.orderId, requesterId: event.requesterId, rewardCredits: event.rewardCredits,
    timestamp: new Date().toISOString(), ...(reason && { reason }),
  };
  await tx.addOutbox(result);
}

export function createCreditService(store: CreditStore) {
  return {
    initializeWallet: (userId: string) => store.transaction(tx => initializeWallet(tx, userId)),
    async getWallet(userId: string): Promise<CreditWalletDTO> {
      const wallet = await store.findWallet(userId);
      if (!wallet) throw new CreditError('Wallet not found', 404);
      return wallet;
    },
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
        if (command.kind === 'reserve-request') await reservationResult(tx, command.event);
        else if (command.kind === 'register') await initializeWallet(tx, command.userId, command.initialGrant);
        else if (command.kind === 'settle') await settle(tx, command.body, { causationEventId: identity.eventId, orderCode: command.body.orderCode });
        else await refund(tx, command.body, { causationEventId: identity.eventId, orderCode: command.body.orderCode });
      });
    },
  };
}
export type CreditService = ReturnType<typeof createCreditService>;
