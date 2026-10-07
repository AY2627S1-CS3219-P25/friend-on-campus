/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Integration test suite for Order Service HTTP application, authentication middleware, route handlers, and status codes.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { Request, Response, NextFunction } from 'express';
import { createApp } from '../src/app';
import { createOrderService } from '../src/orders/order.service';
import {
  makeFakeCreditClient,
  makeFakeOrderRepository,
  makeFakeSupplierClient,
  startTestServer,
} from './helpers';

const ALICE_ID = '20000000-0000-4000-8000-000000000001';
const BOB_ID = '20000000-0000-4000-8000-000000000002';
const SUPPLIER_ID = '10000000-0000-4000-8000-000000000001';

describe('Order Service HTTP Application & Routes', () => {
  function setupApp() {
    const fakeRepo = makeFakeOrderRepository();
    const fakeCredit = makeFakeCreditClient();
    const fakeSupplier = makeFakeSupplierClient({
      [SUPPLIER_ID]: {
        id: SUPPLIER_ID,
        name: 'Frontier Canteen',
        campusZone: 'Science',
        isActive: true,
      },
    });

    const orderService = createOrderService({
      repository: fakeRepo.repo,
      creditClient: fakeCredit.client,
      supplierClient: fakeSupplier.client,
    });

    // Mock authenticate middleware reading x-user-id header
    const authenticate = (req: Request, res: Response, next: NextFunction) => {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized: missing credentials' });
      }
      res.locals.auth = { userId, role: 'STUDENT', sessionId: 'test-session' };
      next();
    };

    const app = createApp({
      orderService,
      authenticate,
      port: 0,
      isReady: async () => true,
    });

    return { app, fakeRepo, fakeCredit, fakeSupplier };
  }

  it('responds with UP and READY on health and readiness endpoints', async () => {
    const { app } = setupApp();
    const server = await startTestServer(app);
    try {
      const healthRes = await fetch(`${server.url}/health`);
      assert.equal(healthRes.status, 200);
      const health = await healthRes.json() as any;
      assert.equal(health.service, 'order-service');
      assert.equal(health.status, 'UP');

      const readyRes = await fetch(`${server.url}/ready`);
      assert.equal(readyRes.status, 200);
      const ready = await readyRes.json() as any;
      assert.equal(ready.service, 'order-service');
      assert.equal(ready.status, 'READY');
    } finally {
      await server.close();
    }
  });

  it('rejects order mutations without authentication (401)', async () => {
    const { app } = setupApp();
    const server = await startTestServer(app);
    try {
      const res = await fetch(`${server.url}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          supplierId: SUPPLIER_ID,
          itemDescription: 'Juice',
          dropoffLocation: 'Science LT27',
          rewardCredits: 10,
        }),
      });
      assert.equal(res.status, 401);
    } finally {
      await server.close();
    }
  });

  it('creates, claims, picks up, delivers, and completes an errand through HTTP endpoints', async () => {
    const { app } = setupApp();
    const server = await startTestServer(app);
    try {
      // 1. Create order as Alice
      const createRes = await fetch(`${server.url}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ALICE_ID,
        },
        body: JSON.stringify({
          supplierId: SUPPLIER_ID,
          itemDescription: 'Subway Sandwich',
          dropoffLocation: 'Block S17 Level 4',
          rewardCredits: 20,
          durationMinutes: 45,
        }),
      });
      assert.equal(createRes.status, 201);
      const createdBody = await createRes.json() as any;
      assert.equal(createdBody.success, true);
      const orderId = createdBody.data.id;
      assert.equal(createdBody.data.status, 'OPEN');

      // 2. Discover in feed
      const listRes = await fetch(`${server.url}/api/orders`);
      assert.equal(listRes.status, 200);
      const listBody = await listRes.json() as any;
      assert.equal(listBody.orders?.length || listBody.data?.length, 1);

      // 3. Bob accepts the errand
      const acceptRes = await fetch(`${server.url}/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': BOB_ID,
        },
        body: JSON.stringify({ courierContactNote: 'Leaving Science library now' }),
      });
      assert.equal(acceptRes.status, 200);
      const acceptedBody = await acceptRes.json() as any;
      assert.equal(acceptedBody.data.status, 'ACCEPTED');
      assert.equal(acceptedBody.data.courierId, BOB_ID);

      // 4. Bob picks up item
      const pickupRes = await fetch(`${server.url}/api/orders/${orderId}/pickup`, {
        method: 'POST',
        headers: { 'x-user-id': BOB_ID },
      });
      assert.equal(pickupRes.status, 200);
      const pickupBody = await pickupRes.json() as any;
      assert.equal(pickupBody.data.status, 'IN_TRANSIT');

      // 5. Bob marks delivered
      const deliverRes = await fetch(`${server.url}/api/orders/${orderId}/deliver`, {
        method: 'POST',
        headers: { 'x-user-id': BOB_ID },
      });
      assert.equal(deliverRes.status, 200);
      const deliverBody = await deliverRes.json() as any;
      assert.equal(deliverBody.data.status, 'DELIVERED');

      // 6. Alice confirms completion
      const completeRes = await fetch(`${server.url}/api/orders/${orderId}/complete`, {
        method: 'POST',
        headers: { 'x-user-id': ALICE_ID },
      });
      assert.equal(completeRes.status, 200);
      const completeBody = await completeRes.json() as any;
      assert.equal(completeBody.data.status, 'COMPLETED');

      // 7. Check Alice's activity
      const activityRes = await fetch(`${server.url}/api/orders/user/activity?userId=${ALICE_ID}`);
      assert.equal(activityRes.status, 200);
      const activityBody = await activityRes.json() as any;
      assert.equal(activityBody.data.history.length, 1);
      assert.equal(activityBody.data.history[0].id, orderId);
    } finally {
      await server.close();
    }
  });

  it('returns 409 Conflict when a second user attempts to claim an already accepted errand', async () => {
    const { app } = setupApp();
    const server = await startTestServer(app);
    try {
      // Create order
      const createRes = await fetch(`${server.url}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ALICE_ID,
        },
        body: JSON.stringify({
          supplierId: SUPPLIER_ID,
          itemDescription: 'Salad',
          dropoffLocation: 'Science Library',
          rewardCredits: 10,
        }),
      });
      const orderId = (await createRes.json() as any).data.id;

      // Bob accepts
      const bobRes = await fetch(`${server.url}/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'x-user-id': BOB_ID },
      });
      assert.equal(bobRes.status, 200);

      // Third party (Charlie) attempts to accept same order -> 409
      const charlieRes = await fetch(`${server.url}/api/orders/${orderId}/accept`, {
        method: 'POST',
        headers: { 'x-user-id': '20000000-0000-4000-8000-000000000009' },
      });
      assert.equal(charlieRes.status, 409);
      const errorBody = await charlieRes.json() as any;
      assert.equal(errorBody.success, false);
      assert.match(errorBody.error, /already been claimed/);
    } finally {
      await server.close();
    }
  });
});
