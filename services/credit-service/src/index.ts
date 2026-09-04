import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  CreditWalletDTO,
  CreditTransactionDTO,
  ApiResponse,
  EscrowReserveRequest,
  EscrowSettleRequest,
  EscrowRefundRequest,
} from '@campus-errand/common-dtos';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8004;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/credit_db';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

app.use(cors());
app.use(express.json());

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

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ service: 'credit-service', status: 'UP', port: PORT, timestamp: new Date() });
});

// 1. Get Wallet Balance
app.get('/api/credits/wallet', (req: Request, res: Response<ApiResponse<CreditWalletDTO>>) => {
  const userId = (req.headers['x-user-id'] as string) || 'u1111111-1111-1111-1111-111111111111';
  let wallet = mockWallets[userId];

  if (!wallet) {
    wallet = {
      userId,
      availableCredits: 100, // Default 100 welcome grant
      escrowCredits: 0,
      totalEarnedCredits: 0,
      updatedAt: new Date().toISOString(),
    };
    mockWallets[userId] = wallet;
  }

  res.json({ success: true, data: wallet });
});

// 2. Get Transaction Ledger
app.get('/api/credits/ledger', (req: Request, res: Response<ApiResponse<CreditTransactionDTO[]>>) => {
  const userId = (req.headers['x-user-id'] as string) || 'u1111111-1111-1111-1111-111111111111';
  const userTransactions = mockLedger.filter((t) => t.fromUserId === userId || t.toUserId === userId);
  res.json({ success: true, data: userTransactions });
});

// 3. Escrow Reserve (Deduct available, Add to escrow)
app.post('/api/credits/escrow/reserve', (req: Request, res: Response<ApiResponse<CreditWalletDTO>>) => {
  const body: EscrowReserveRequest = req.body;
  const wallet = mockWallets[body.requesterId] || {
    userId: body.requesterId,
    availableCredits: 100,
    escrowCredits: 0,
    totalEarnedCredits: 0,
    updatedAt: new Date().toISOString(),
  };

  if (wallet.availableCredits < body.amount) {
    return res.status(400).json({ success: false, error: 'Insufficient available credits for escrow hold' });
  }

  wallet.availableCredits -= body.amount;
  wallet.escrowCredits += body.amount;
  wallet.updatedAt = new Date().toISOString();
  mockWallets[body.requesterId] = wallet;

  mockLedger.unshift({
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

  res.json({ success: true, data: wallet, message: 'Escrow reserved successfully' });
});

// 4. Escrow Settle (Deduct escrow, Transfer to courier available)
app.post('/api/credits/escrow/settle', (req: Request, res: Response<ApiResponse<{ requesterWallet: CreditWalletDTO; courierWallet: CreditWalletDTO }>>) => {
  const body: EscrowSettleRequest = req.body;
  const reqWallet = mockWallets[body.requesterId];
  let courWallet = mockWallets[body.courierId];

  if (!reqWallet || reqWallet.escrowCredits < body.amount) {
    return res.status(400).json({ success: false, error: 'Insufficient escrow credits to settle' });
  }

  if (!courWallet) {
    courWallet = {
      userId: body.courierId,
      availableCredits: 100,
      escrowCredits: 0,
      totalEarnedCredits: 0,
      updatedAt: new Date().toISOString(),
    };
  }

  reqWallet.escrowCredits -= body.amount;
  reqWallet.updatedAt = new Date().toISOString();

  courWallet.availableCredits += body.amount;
  courWallet.totalEarnedCredits += body.amount;
  courWallet.updatedAt = new Date().toISOString();

  mockWallets[body.requesterId] = reqWallet;
  mockWallets[body.courierId] = courWallet;

  mockLedger.unshift({
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

  res.json({
    success: true,
    data: { requesterWallet: reqWallet, courierWallet: courWallet },
    message: 'Credits atomically settled to courier',
  });
});

// 5. Escrow Refund (Return escrow to available)
app.post('/api/credits/escrow/refund', (req: Request, res: Response<ApiResponse<CreditWalletDTO>>) => {
  const body: EscrowRefundRequest = req.body;
  const reqWallet = mockWallets[body.requesterId];

  if (!reqWallet || reqWallet.escrowCredits < body.amount) {
    return res.status(400).json({ success: false, error: 'Insufficient escrow credits to refund' });
  }

  reqWallet.escrowCredits -= body.amount;
  reqWallet.availableCredits += body.amount;
  reqWallet.updatedAt = new Date().toISOString();

  mockLedger.unshift({
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

  res.json({ success: true, data: reqWallet, message: 'Escrow refunded to available balance' });
});

app.listen(PORT, () => {
  console.log(`🚀 [Credit Service] running on port ${PORT} with tsx`);
});
