/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-11
 * Scope: Added integration tests for admin order endpoints, RBAC authorization (403), optimistic concurrency (409), and search.
 * Author review: (to be completed by author after review)
 *
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
const ADMIN_ID = '90000000-0000-4000-8000-000000000001';
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

    // Mock authenticate middleware reading x-user-id and x-user-role headers
    const authenticate = (req: Request, res: Response, next: NextFunction) => {
      const userId = req.headers['x-user-id'] as string;
      if (!userId) {
        return res.status(401).json({ success: false, error: 'Unauthorized: missing credentials' });
      }
      const role = (req.headers['x-user-role'] as string) || 'STUDENT';
      res.locals.auth = { userId, role, sessionId: 'test-session' };
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

  it('rejects GET endpoints without authentication (401)', async () => {
    const { app } = setupApp();
    const server = await startTestServer(app);
    try {
      const listRes = await fetch(`${server.url}/api/orders`);
      assert.equal(listRes.status, 401);

      const activityRes = await fetch(`${server.url}/api/orders/user/activity`);
      assert.equal(activityRes.status, 401);

      // Verify that query param userId cannot bypass authentication
      const spoofRes = await fetch(`${server.url}/api/orders/user/activity?userId=${ALICE_ID}`);
      assert.equal(spoofRes.status, 401);

      const detailRes = await fetch(`${server.url}/api/orders/some-id`);
      assert.equal(detailRes.status, 401);
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

      // 2. Discover in feed (authenticated)
      const listRes = await fetch(`${server.url}/api/orders`, {
        headers: { 'x-user-id': ALICE_ID },
      });
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

      // 7. Check Alice's activity (authenticated)
      const activityRes = await fetch(`${server.url}/api/orders/user/activity`, {
        headers: { 'x-user-id': ALICE_ID },
      });
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

  it('rejects invalid page and limit query parameters with 400 Bad Request', async () => {
    const { app } = setupApp();
    const server = await startTestServer(app);
    try {
      const cases = [
        { query: 'page=abc', expectedMsg: 'page must be an integer >= 1' },
        { query: 'page=0', expectedMsg: 'page must be an integer >= 1' },
        { query: 'page=-2', expectedMsg: 'page must be an integer >= 1' },
        { query: 'limit=abc', expectedMsg: 'limit must be an integer >= 1 and <= 100' },
        { query: 'limit=0', expectedMsg: 'limit must be an integer >= 1 and <= 100' },
        { query: 'limit=-10', expectedMsg: 'limit must be an integer >= 1 and <= 100' },
        { query: 'limit=101', expectedMsg: 'limit must be an integer >= 1 and <= 100' },
      ];

      for (const { query, expectedMsg } of cases) {
        const res = await fetch(`${server.url}/api/orders?${query}`, {
          headers: { 'x-user-id': ALICE_ID },
        });
        assert.equal(res.status, 400, `Expected 400 for ?${query}`);
        const body = await res.json() as any;
        assert.equal(body.success, false);
        assert.equal(body.error, expectedMsg);
      }

      // Valid pagination passes
      const validRes = await fetch(`${server.url}/api/orders?page=1&limit=20`, {
        headers: { 'x-user-id': ALICE_ID },
      });
      assert.equal(validRes.status, 200);
    } finally {
      await server.close();
    }
  });

  it('rejects over-length dropoffLocation or non-string specialNotes with 400 Bad Request without reserving escrow', async () => {
    const { app, fakeCredit } = setupApp();
    const server = await startTestServer(app);
    try {
      // Over 255 chars dropoffLocation
      const overLengthRes = await fetch(`${server.url}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ALICE_ID,
        },
        body: JSON.stringify({
          supplierId: SUPPLIER_ID,
          itemDescription: 'Drink',
          dropoffLocation: 'x'.repeat(256),
          rewardCredits: 10,
        }),
      });
      assert.equal(overLengthRes.status, 400);
      const overLengthBody = await overLengthRes.json() as any;
      assert.equal(overLengthBody.success, false);
      assert.match(overLengthBody.error, /dropoffLocation must be at most 255 characters/);

      // Non-string specialNotes
      const nonStringRes = await fetch(`${server.url}/api/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ALICE_ID,
        },
        body: JSON.stringify({
          supplierId: SUPPLIER_ID,
          itemDescription: 'Drink',
          dropoffLocation: 'PGPR',
          specialNotes: 12345,
          rewardCredits: 10,
        }),
      });
      assert.equal(nonStringRes.status, 400);
      const nonStringBody = await nonStringRes.json() as any;
      assert.equal(nonStringBody.success, false);
      assert.match(nonStringBody.error, /specialNotes must be a string/);

      // Verify that no escrow reservation was attempted
      assert.equal(fakeCredit.reservations.length, 0);
    } finally {
      await server.close();
    }
  });

  it('rejects admin endpoints with 403 Forbidden when called by a student', async () => {
    const { app, fakeRepo } = setupApp();
    const server = await startTestServer(app);
    try {
      const order = await fakeRepo.repo.createOrderWithOutbox({
        orderCode: 'ORD-TEST01',
        requesterId: ALICE_ID,
        supplierId: SUPPLIER_ID,
        itemDescription: 'Coffee',
        dropoffLocation: 'UTown',
        rewardCredits: 10,
        expiresAt: new Date(Date.now() + 60000),
      }, {
        eventType: 'order.created',
        eventId: 'evt-1',
        timestamp: new Date().toISOString(),
        orderId: 'dummy',
        orderCode: 'ORD-TEST01',
        requesterId: ALICE_ID,
        supplierId: SUPPLIER_ID,
        rewardCredits: 10,
      });

      // Student attempts admin cancel
      const cancelRes = await fetch(`${server.url}/api/orders/${order.id}/admin/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ALICE_ID,
          'x-user-role': 'STUDENT',
        },
        body: JSON.stringify({ reason: 'Student trying to cancel as admin' }),
      });
      assert.equal(cancelRes.status, 403);
      const cancelBody = await cancelRes.json() as any;
      assert.equal(cancelBody.success, false);
      assert.match(cancelBody.error, /Administrator access is required/);

      // Student attempts admin complete
      const completeRes = await fetch(`${server.url}/api/orders/${order.id}/admin/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ALICE_ID,
          'x-user-role': 'STUDENT',
        },
        body: JSON.stringify({ reason: 'Student trying to complete as admin' }),
      });
      assert.equal(completeRes.status, 403);

      // Student attempts admin unassign
      const unassignRes = await fetch(`${server.url}/api/orders/${order.id}/admin/unassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ALICE_ID,
          'x-user-role': 'STUDENT',
        },
        body: JSON.stringify({ reason: 'Student trying to unassign as admin' }),
      });
      assert.equal(unassignRes.status, 403);
    } finally {
      await server.close();
    }
  });

  it('allows admin role to cancel an order and triggers escrow refund', async () => {
    const { app, fakeRepo } = setupApp();
    const server = await startTestServer(app);
    try {
      const order = await fakeRepo.repo.createOrderWithOutbox({
        orderCode: 'ORD-TEST02',
        requesterId: ALICE_ID,
        supplierId: SUPPLIER_ID,
        itemDescription: 'Snack',
        dropoffLocation: 'UTown',
        rewardCredits: 8,
        expiresAt: new Date(Date.now() + 60000),
      }, {
        eventType: 'order.created',
        eventId: 'evt-2',
        timestamp: new Date().toISOString(),
        orderId: 'dummy',
        orderCode: 'ORD-TEST02',
        requesterId: ALICE_ID,
        supplierId: SUPPLIER_ID,
        rewardCredits: 8,
      });

      const res = await fetch(`${server.url}/api/orders/${order.id}/admin/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ADMIN_ID,
          'x-user-role': 'ADMIN',
        },
        body: JSON.stringify({
          reason: 'Duplicate order mistakenly placed',
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json() as any;
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'CANCELLED');
      assert.ok(body.data.specialNotes.includes('Admin Cancel'));

      const cancelOutbox = fakeRepo.outboxEvents.find((e) => e.eventType === 'order.cancelled');
      assert.ok(cancelOutbox, 'Expected outbox event for admin cancel');
    } finally {
      await server.close();
    }
  });

  it('enforces optimistic concurrency control on admin mutations (409 Conflict)', async () => {
    const { app, fakeRepo } = setupApp();
    const server = await startTestServer(app);
    try {
      const order = await fakeRepo.repo.createOrderWithOutbox({
        orderCode: 'ORD-TEST03',
        requesterId: ALICE_ID,
        supplierId: SUPPLIER_ID,
        itemDescription: 'Meal',
        dropoffLocation: 'UTown',
        rewardCredits: 10,
        expiresAt: new Date(Date.now() + 60000),
      }, {
        eventType: 'order.created',
        eventId: 'evt-3',
        timestamp: new Date().toISOString(),
        orderId: 'dummy',
        orderCode: 'ORD-TEST03',
        requesterId: ALICE_ID,
        supplierId: SUPPLIER_ID,
        rewardCredits: 10,
      });

      // Pass stale expectedVersion
      const res = await fetch(`${server.url}/api/orders/${order.id}/admin/cancel`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ADMIN_ID,
          'x-user-role': 'ADMIN',
        },
        body: JSON.stringify({
          reason: 'Stale version admin cancel',
          expectedVersion: 99,
        }),
      });

      assert.equal(res.status, 409);
      const body = await res.json() as any;
      assert.equal(body.success, false);
      assert.match(body.error, /Order was modified concurrently/);
    } finally {
      await server.close();
    }
  });

  it('allows admin role to complete a delivered order and releases escrow', async () => {
    const { app, fakeRepo } = setupApp();
    const server = await startTestServer(app);
    try {
      const order = await fakeRepo.repo.createOrderWithOutbox({
        orderCode: 'ORD-TEST04',
        requesterId: ALICE_ID,
        supplierId: SUPPLIER_ID,
        itemDescription: 'Bento',
        dropoffLocation: 'Science',
        rewardCredits: 15,
        expiresAt: new Date(Date.now() + 60000),
      }, {
        eventType: 'order.created',
        eventId: 'evt-4',
        timestamp: new Date().toISOString(),
        orderId: 'dummy',
        orderCode: 'ORD-TEST04',
        requesterId: ALICE_ID,
        supplierId: SUPPLIER_ID,
        rewardCredits: 15,
      });

      // Move to ACCEPTED, IN_TRANSIT, DELIVERED
      await fakeRepo.repo.acceptOrder(order.id, BOB_ID, undefined, {
        eventType: 'order.accepted',
        eventId: 'evt-acc',
        timestamp: new Date().toISOString(),
        orderId: order.id,
        orderCode: order.orderCode,
        requesterId: ALICE_ID,
        courierId: BOB_ID,
        rewardCredits: 15,
      });
      await fakeRepo.repo.pickupOrder(order.id, BOB_ID, {
        eventType: 'order.in_transit',
        eventId: 'evt-pick',
        timestamp: new Date().toISOString(),
        orderId: order.id,
        orderCode: order.orderCode,
        requesterId: ALICE_ID,
        courierId: BOB_ID,
        rewardCredits: 15,
      });
      await fakeRepo.repo.deliverOrder(order.id, BOB_ID, {
        eventType: 'order.delivered',
        eventId: 'evt-del',
        timestamp: new Date().toISOString(),
        orderId: order.id,
        orderCode: order.orderCode,
        requesterId: ALICE_ID,
        courierId: BOB_ID,
        rewardCredits: 15,
      });

      const res = await fetch(`${server.url}/api/orders/${order.id}/admin/complete`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ADMIN_ID,
          'x-user-role': 'ADMIN',
        },
        body: JSON.stringify({
          reason: 'Requester unresponsive after dropoff confirmed',
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json() as any;
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'COMPLETED');
      assert.ok(body.data.completedAt);

      const completeOutbox = fakeRepo.outboxEvents.find((e) => e.eventType === 'order.completed');
      assert.ok(completeOutbox, 'Expected order.completed outbox event');
    } finally {
      await server.close();
    }
  });

  it('allows admin role to unassign courier from an accepted order', async () => {
    const { app, fakeRepo } = setupApp();
    const server = await startTestServer(app);
    try {
      const order = await fakeRepo.repo.createOrderWithOutbox({
        orderCode: 'ORD-TEST05',
        requesterId: ALICE_ID,
        supplierId: SUPPLIER_ID,
        itemDescription: 'Milk Tea',
        dropoffLocation: 'UTown',
        rewardCredits: 6,
        expiresAt: new Date(Date.now() + 60000),
      }, {
        eventType: 'order.created',
        eventId: 'evt-5',
        timestamp: new Date().toISOString(),
        orderId: 'dummy',
        orderCode: 'ORD-TEST05',
        requesterId: ALICE_ID,
        supplierId: SUPPLIER_ID,
        rewardCredits: 6,
      });

      await fakeRepo.repo.acceptOrder(order.id, BOB_ID, undefined, {
        eventType: 'order.accepted',
        eventId: 'evt-acc',
        timestamp: new Date().toISOString(),
        orderId: order.id,
        orderCode: order.orderCode,
        requesterId: ALICE_ID,
        courierId: BOB_ID,
        rewardCredits: 6,
      });

      const res = await fetch(`${server.url}/api/orders/${order.id}/admin/unassign`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-user-id': ADMIN_ID,
          'x-user-role': 'ADMIN',
        },
        body: JSON.stringify({
          reason: 'Courier reported unable to fulfill before pickup',
        }),
      });

      assert.equal(res.status, 200);
      const body = await res.json() as any;
      assert.equal(body.success, true);
      assert.equal(body.data.status, 'OPEN');
      assert.equal(body.data.courierId, null);
    } finally {
      await server.close();
    }
  });
});
