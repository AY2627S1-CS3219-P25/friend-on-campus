import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { UserDTO, ApiResponse, AuthResponse } from '@campus-errand/common-dtos';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8001;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/user_db';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';

app.use(cors());
app.use(express.json());

// In-memory mock store for initial bootstrap / testing
const mockUsers: UserDTO[] = [
  {
    id: 'u1111111-1111-1111-1111-111111111111',
    nusEmail: 'alice@u.nus.edu',
    fullName: 'Alice Tan',
    matricNumber: 'A0212345X',
    telegramHandle: '@alicetan',
    role: 'STUDENT',
    ratingAvg: 4.95,
    totalCompletedOrders: 14,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'u2222222-2222-2222-2222-222222222222',
    nusEmail: 'bob@u.nus.edu',
    fullName: 'Bob Lim',
    matricNumber: 'A0223456Y',
    telegramHandle: '@boblim',
    role: 'STUDENT',
    ratingAvg: 5.0,
    totalCompletedOrders: 28,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'u9999999-9999-9999-9999-999999999999',
    nusEmail: 'admin@nus.edu.sg',
    fullName: 'Campus Admin',
    matricNumber: 'STAFF001',
    role: 'ADMIN',
    ratingAvg: 5.0,
    totalCompletedOrders: 0,
    createdAt: new Date().toISOString(),
  },
];

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ service: 'user-service', status: 'UP', port: PORT, timestamp: new Date() });
});

// Authentication endpoints
app.post('/api/auth/register', (req: Request, res: Response<ApiResponse<AuthResponse>>) => {
  const { nusEmail, fullName, matricNumber, telegramHandle } = req.body;
  if (!nusEmail || !fullName || !matricNumber) {
    return res.status(400).json({ success: false, error: 'Missing required registration fields' });
  }

  const newUser: UserDTO = {
    id: `u-${Date.now()}`,
    nusEmail,
    fullName,
    matricNumber,
    telegramHandle,
    role: 'STUDENT',
    ratingAvg: 5.0,
    totalCompletedOrders: 0,
    createdAt: new Date().toISOString(),
  };

  mockUsers.push(newUser);
  return res.status(201).json({
    success: true,
    data: {
      token: `mock-jwt-token-for-${newUser.id}`,
      user: newUser,
    },
    message: 'User registered successfully with initial 100 welcome credits event dispatched',
  });
});

app.post('/api/auth/login', (req: Request, res: Response<ApiResponse<AuthResponse>>) => {
  const { nusEmail } = req.body;
  const user = mockUsers.find((u) => u.nusEmail.toLowerCase() === (nusEmail || '').toLowerCase()) || mockUsers[0];

  return res.json({
    success: true,
    data: {
      token: `mock-jwt-token-for-${user.id}`,
      user,
    },
  });
});

// Profile endpoints
app.get('/api/users/me', (_req: Request, res: Response<ApiResponse<UserDTO>>) => {
  res.json({ success: true, data: mockUsers[0] });
});

app.get('/api/users/:id', (req: Request, res: Response<ApiResponse<UserDTO>>) => {
  const user = mockUsers.find((u) => u.id === req.params.id);
  if (!user) {
    return res.status(404).json({ success: false, error: 'User not found' });
  }
  res.json({ success: true, data: user });
});

app.listen(PORT, () => {
  console.log(`🚀 [User Service] running on port ${PORT} with tsx`);
});
