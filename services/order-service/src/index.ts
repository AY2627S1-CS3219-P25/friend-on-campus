import express, { Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import {
  OrderDTO,
  ApiResponse,
  CreateOrderRequest,
  OrderCreatedEvent,
  OrderAcceptedEvent,
  OrderCompletedEvent,
} from '@campus-errand/common-dtos';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8003;
const DATABASE_URL = process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/order_db';
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672';
const CREDIT_SERVICE_URL = process.env.CREDIT_SERVICE_URL || 'http://localhost:8004';

app.use(cors());
app.use(express.json());

// In-memory mock orders store
const mockOrders: OrderDTO[] = [
  {
    id: 'ord-1001',
    orderCode: 'E-1042',
    requesterId: 'u1111111-1111-1111-1111-111111111111', // Alice
    courierId: null,
    supplierId: 's1111111-1111-1111-1111-111111111111',
    supplierName: 'CoffeeBean @ COM3',
    campusZone: 'COM3',
    itemDescription: '1x Large Iced Hazelnut Latte (Oat Milk)',
    specialNotes: 'Less ice please! Bench 3 near staircase.',
    dropoffLocation: 'COM2 #02-04 Discussion Room',
    requesterContactNote: 'Wearing blue NUS Computing hoodie',
    rewardCredits: 15,
    status: 'OPEN',
    expiresAt: new Date(Date.now() + 25 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    version: 1,
  },
  {
    id: 'ord-1002',
    orderCode: 'E-1043',
    requesterId: 'u2222222-2222-2222-2222-222222222222', // Bob
    courierId: 'u1111111-1111-1111-1111-111111111111',   // Alice accepted
    supplierId: 's2222222-2222-2222-2222-222222222222',
    supplierName: 'Printers @ PCCommons',
    campusZone: 'UTown',
    itemDescription: 'CS3219 Tutorial 4 Handouts (8 pages, double-sided)',
    specialNotes: 'PIN Code: 8842',
    dropoffLocation: 'UTown ERC Study Deck Table 12',
    requesterContactNote: 'Green backpack on the table',
    rewardCredits: 20,
    status: 'IN_TRANSIT',
    expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
    acceptedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
    pickedUpAt: new Date(Date.now() - 3 * 60 * 1000).toISOString(),
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    version: 2,
  },
];

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({ service: 'order-service', status: 'UP', port: PORT, timestamp: new Date() });
});

// 1. Errand Discovery Feed (Supports zone & status filtering)
app.get('/api/orders', (req: Request, res: Response<ApiResponse<OrderDTO[]>>) => {
  const { status, campusZone } = req.query;
  let results = [...mockOrders];

  if (status) {
    results = results.filter((o) => o.status === status);
  } else {
    // Default feed shows OPEN orders
    results = results.filter((o) => o.status === 'OPEN');
  }

  if (campusZone) {
    results = results.filter((o) => o.campusZone?.toLowerCase() === (campusZone as string).toLowerCase());
  }

  res.json({ success: true, data: results });
});

// 2. Order Details
app.get('/api/orders/:id', (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
  const order = mockOrders.find((o) => o.id === req.params.id);
  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }
  res.json({ success: true, data: order });
});

// 3. User Activity (Requested vs Delivering)
app.get('/api/orders/user/activity', (req: Request, res: Response<ApiResponse<{ requested: OrderDTO[]; delivering: OrderDTO[]; history: OrderDTO[] }>>) => {
  const userId = (req.query.userId as string) || 'u1111111-1111-1111-1111-111111111111';

  const requested = mockOrders.filter((o) => o.requesterId === userId && ['OPEN', 'ACCEPTED', 'IN_TRANSIT'].includes(o.status));
  const delivering = mockOrders.filter((o) => o.courierId === userId && ['ACCEPTED', 'IN_TRANSIT'].includes(o.status));
  const history = mockOrders.filter((o) => (o.requesterId === userId || o.courierId === userId) && ['COMPLETED', 'CANCELLED', 'EXPIRED'].includes(o.status));

  res.json({
    success: true,
    data: { requested, delivering, history },
  });
});

// 4. Create Errand Request (Triggers synchronous Escrow reservation)
app.post('/api/orders', (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
  const body: CreateOrderRequest = req.body;
  const requesterId = (req.headers['x-user-id'] as string) || 'u1111111-1111-1111-1111-111111111111';

  if (!body.supplierId || !body.itemDescription || !body.dropoffLocation || !body.rewardCredits) {
    return res.status(400).json({ success: false, error: 'Missing required order fields' });
  }

  const newOrder: OrderDTO = {
    id: `ord-${Date.now()}`,
    orderCode: `E-${Math.floor(1000 + Math.random() * 9000)}`,
    requesterId,
    courierId: null,
    supplierId: body.supplierId,
    supplierName: 'Selected Campus Location',
    campusZone: 'COM3',
    itemDescription: body.itemDescription,
    specialNotes: body.specialNotes,
    dropoffLocation: body.dropoffLocation,
    requesterContactNote: body.requesterContactNote,
    rewardCredits: body.rewardCredits,
    status: 'OPEN',
    expiresAt: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
    createdAt: new Date().toISOString(),
    version: 1,
  };

  mockOrders.unshift(newOrder);

  // RabbitMQ Mock Dispatch
  const event: OrderCreatedEvent = {
    eventType: 'order.created',
    eventId: `evt-${Date.now()}`,
    timestamp: new Date().toISOString(),
    orderId: newOrder.id,
    orderCode: newOrder.orderCode,
    requesterId: newOrder.requesterId,
    rewardCredits: newOrder.rewardCredits,
    campusZone: newOrder.campusZone || 'Campus',
    expiresAt: newOrder.expiresAt,
  };
  console.log('📢 [Order Service] Published event to RabbitMQ:', event.eventType, event);

  res.status(201).json({ success: true, data: newOrder, message: 'Order created and escrow reserved successfully' });
});

// 5. Accept Errand (Single Courier assignment & self-accept validation)
app.post('/api/orders/:id/accept', (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
  const courierId = (req.headers['x-user-id'] as string) || 'u2222222-2222-2222-2222-222222222222';
  const order = mockOrders.find((o) => o.id === req.params.id);

  if (!order) {
    return res.status(404).json({ success: false, error: 'Order not found' });
  }

  if (order.status !== 'OPEN') {
    return res.status(409).json({ success: false, error: 'Order has already been claimed or is no longer open' });
  }

  if (order.requesterId === courierId) {
    return res.status(400).json({ success: false, error: 'You cannot accept your own errand request' });
  }

  order.status = 'ACCEPTED';
  order.courierId = courierId;
  order.acceptedAt = new Date().toISOString();
  order.version += 1;

  res.json({ success: true, data: order, message: 'Errand accepted! Proceed to pickup spot.' });
});

// 6. Pickup Item
app.post('/api/orders/:id/pickup', (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
  const order = mockOrders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  order.status = 'IN_TRANSIT';
  order.pickedUpAt = new Date().toISOString();
  order.version += 1;

  res.json({ success: true, data: order, message: 'Item picked up! Head to dropoff location.' });
});

// 7. Complete Delivery (Atomic Escrow settlement)
app.post('/api/orders/:id/complete', (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
  const order = mockOrders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  order.status = 'COMPLETED';
  order.completedAt = new Date().toISOString();
  order.version += 1;

  res.json({ success: true, data: order, message: 'Delivery confirmed! Credits transferred to courier.' });
});

// 8. Cancel Errand
app.post('/api/orders/:id/cancel', (req: Request, res: Response<ApiResponse<OrderDTO>>) => {
  const order = mockOrders.find((o) => o.id === req.params.id);
  if (!order) return res.status(404).json({ success: false, error: 'Order not found' });

  order.status = 'CANCELLED';
  order.version += 1;

  res.json({ success: true, data: order, message: 'Errand cancelled. Escrow credits refunded.' });
});

app.listen(PORT, () => {
  console.log(`🚀 [Order Service] running on port ${PORT} with tsx`);
});
