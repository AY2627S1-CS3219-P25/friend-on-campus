/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Added serializable transactions and persistent grant, escrow and event access.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import type { Prisma, PrismaClient, CreditWallet, CreditTransaction } from '../database/client';
import type { CreditTransactionDTO, CreditWalletDTO } from './types';

function walletDTO(wallet: CreditWallet): CreditWalletDTO {
  // SQL permits null timestamps; the HTTP DTO requires a string. Do not invent dates.
  if (!wallet.updatedAt) throw new Error('Wallet updated_at is null');
  return {
    userId: wallet.userId,
    availableCredits: wallet.availableCredits,
    escrowCredits: wallet.escrowCredits,
    totalEarnedCredits: wallet.totalEarnedCredits,
    updatedAt: wallet.updatedAt.toISOString(),
  };
}

function transactionDTO(transaction: CreditTransaction): CreditTransactionDTO {
  const type = transaction.transactionType;
  if (!['WELCOME_GRANT', 'ESCROW_HOLD', 'ESCROW_RELEASE', 'ESCROW_REFUND'].includes(type)) {
    throw new Error('Unknown stored credit transaction type');
  }
  if (!transaction.createdAt) throw new Error('Transaction created_at is null');
  return {
    ...transaction,
    transactionType: type as CreditTransactionDTO['transactionType'],
    description: transaction.description ?? undefined,
    createdAt: transaction.createdAt.toISOString(),
  };
}

function queries(db: Prisma.TransactionClient) {
  return {
    findGrant: (userId: string) => db.creditGrant.findUnique({ where: { userId } }),
    createGrant: (userId: string, amount: number) => db.creditGrant.create({ data: { userId, amount } }),
    findEscrow: (orderId: string) => db.creditEscrow.findUnique({ where: { orderId } }),
    createEscrow: (data: { orderId: string; requesterId: string; amount: number }) =>
      db.creditEscrow.create({ data: { ...data, state: 'RESERVED' } }),
    async transitionEscrow(orderId: string, state: 'SETTLED' | 'REFUNDED', courierId?: string) {
      const result = await db.creditEscrow.updateMany({
        where: { orderId, state: 'RESERVED' }, data: { state, courierId, updatedAt: new Date() },
      });
      return result.count === 1;
    },
    findEvent: (eventId: string) => db.processedCreditEvent.findUnique({ where: { eventId } }),
    addEvent: (data: { eventId: string; eventType: string; fingerprint: string }) =>
      db.processedCreditEvent.create({ data }),
    async findWallet(userId: string) {
      const wallet = await db.creditWallet.findUnique({ where: { userId } });
      return wallet ? walletDTO(wallet) : undefined;
    },
    async createWallet(userId: string, availableCredits: number) {
      // ON CONFLICT DO NOTHING handles simultaneous first requests.
      await db.creditWallet.createMany({ data: [{ userId, availableCredits }], skipDuplicates: true });
      return walletDTO(await db.creditWallet.findUniqueOrThrow({ where: { userId } }));
    },
    async changeBalance(
      userId: string,
      delta: { available?: number; escrow?: number; earned?: number },
      minimum: { available?: number; escrow?: number } = {},
    ) {
      const result = await db.creditWallet.updateMany({
        where: {
          userId,
          availableCredits: minimum.available === undefined ? undefined : { gte: minimum.available },
          escrowCredits: minimum.escrow === undefined ? undefined : { gte: minimum.escrow },
        },
        data: {
          availableCredits: { increment: delta.available ?? 0 },
          escrowCredits: { increment: delta.escrow ?? 0 },
          totalEarnedCredits: { increment: delta.earned ?? 0 },
          updatedAt: new Date(),
        },
      });
      return result.count === 1;
    },
    async findTransactions(userId: string) {
      const rows = await db.creditTransaction.findMany({
        where: { OR: [{ fromUserId: userId }, { toUserId: userId }] },
        orderBy: [{ createdAt: 'desc' }, { id: 'desc' }],
      });
      return rows.map(transactionDTO);
    },
    async addTransaction(data: Omit<CreditTransactionDTO, 'id' | 'createdAt'>) {
      await db.creditTransaction.create({ data });
    },
  };
}

export function createCreditStore(prisma: PrismaClient) {
  return {
    ...queries(prisma),
    async transaction<T>(operation: (store: CreditTransactionStore) => Promise<T>): Promise<T> {
      // Retry the entire transaction after serialization conflicts, never individual writes.
      for (let attempt = 0; ; attempt++) {
        try {
          return await prisma.$transaction((tx) => operation(queries(tx)), {
            isolationLevel: 'Serializable', maxWait: 5000, timeout: 10000,
          });
        } catch (error) {
          const code = (error as { code?: string }).code;
          if (attempt >= 9 || (code !== 'P2034' && code !== 'P2002')) throw error;
          await new Promise(resolve => setTimeout(resolve, 5 * (attempt + 1)));
        }
      }
    },
  };
}

export type CreditStore = ReturnType<typeof createCreditStore>;

export type CreditTransactionStore = ReturnType<typeof queries>;
