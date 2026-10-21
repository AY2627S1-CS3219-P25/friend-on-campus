/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-22
 * Scope: Updated ACCEPTED order cancellation test to verify courierId preservation for courier history, and added unit tests for courier unassignOrder (ACCEPTED -> OPEN).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-19
 * Scope: Verify development sample seeding requires explicit opt-in.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Update creation tests for outbox submissions while preserving funded lifecycle coverage; cover the inclusive reward limit and reject overflow before persistence.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-17
 * Scope: Tests that accept, pickup and deliver put the caller's username on the outbox event when present (F5.1.1).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-11
 * Scope: Added unit test suite for Admin Order Management: force-cancel, force-complete, unassign, optimistic concurrency guards, and query search.
 * Author review: (to be completed by author after review)
 * Tool: Codex (model: GPT-5.6 Sol), date: 2026-10-11
 * Scope: Removed an unused error import identified by the root lint configuration.
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Unit test suite for Order Service core lifecycle state machine, escrow reservation, single-winner concurrency, and sweeper.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by huangjiaxi1111)
// AI-generated (edited by yanhwee)
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
// AI-generated (edited by huangjiaxi1111)
import { prisma } from '../src/database/client';
import { seedOrders } from '../src/database/seed';
import { createExpirySweeper } from '../src/orders/expiry.sweeper';
import { createOrderService } from '../src/orders/order.service';
import {
  OrderAuthorizationError,
  OrderStateConflictError,
  OrderValidationError,
  SelfAcceptForbiddenError,
} from '../src/orders/order.types';
import {
  makeFakeOrderRepository,
  makeFakeSupplierClient,
} from './helpers';

const REQUESTER_ID = '20000000-0000-4000-8000-000000000001';
const COURIER_1_ID = '20000000-0000-4000-8000-000000000002';
const COURIER_2_ID = '20000000-0000-4000-8000-000000000003';
const ADMIN_ID = '90000000-0000-4000-8000-000000000001';
const SUPPLIER_ID = '10000000-0000-4000-8000-000000000001';

// AI-generated (edited by huangjiaxi1111)
it('sample seeding requires explicit true and does not access the database otherwise', async t => {
  const original = process.env.SEED_SAMPLE_ORDERS;
  const originalInsert = prisma.order.createMany;
  const insert = t.mock.fn(async () => ({ count: 4 }));
  prisma.order.createMany = insert as typeof originalInsert;
  try {
    for (const value of [undefined, 'false', 'TRUE', '1']) {
      if (value === undefined) delete process.env.SEED_SAMPLE_ORDERS;
      else process.env.SEED_SAMPLE_ORDERS = value;
      await seedOrders();
    }
    assert.equal(insert.mock.callCount(), 0);
    process.env.SEED_SAMPLE_ORDERS = 'true';
    await seedOrders();
    assert.equal(insert.mock.callCount(), 1);
  } finally {
    prisma.order.createMany = originalInsert;
    if (original === undefined) delete process.env.SEED_SAMPLE_ORDERS;
    else process.env.SEED_SAMPLE_ORDERS = original;
  }
});

describe('Order Service Lifecycle and Concurrency', () => {
  function setupTest() {
    const fakeRepo = makeFakeOrderRepository();
    const fakeSupplier = makeFakeSupplierClient({
      [SUPPLIER_ID]: {
        id: SUPPLIER_ID,
        name: 'The Deck Canteen',
        campusZone: 'FASS',
        isActive: true,
      },
    });
    const service = createOrderService({
      repository: fakeRepo.repo,
      supplierClient: fakeSupplier.client,
    });

    const fundedService = {
      ...service,
      createOrder: async (...args: Parameters<typeof service.createOrder>) => {
        const pendingOrder = await service.createOrder(...args);
        return fakeRepo.approve(pendingOrder.id);
      },
    };
    return { fakeRepo, fakeSupplier, service, fundedService };
  }

  describe('createOrder & handleReservationResult', () => {
    it('validates required fields and positive rewardCredits', async () => {
      const { service } = setupTest();

      await assert.rejects(
        () => service.createOrder(REQUESTER_ID, {
          supplierId: '',
          itemDescription: 'Meal',
          dropoffLocation: 'Hall',
          rewardCredits: 10,
        }),
        OrderValidationError,
      );

      await assert.rejects(
        () => service.createOrder(REQUESTER_ID, {
          supplierId: SUPPLIER_ID,
          itemDescription: 'Meal',
          dropoffLocation: 'Hall',
          rewardCredits: 0,
        }),
        OrderValidationError,
      );

      await assert.rejects(
        () => service.createOrder(REQUESTER_ID, {
          supplierId: SUPPLIER_ID,
          itemDescription: 'Meal',
          dropoffLocation: 'Hall',
          rewardCredits: 10,
          durationMinutes: 10, // Under 30 minutes
        }),
        OrderValidationError,
      );
    });

    it('rejects oversized rewards before persisting an order', async () => {
      const { service, fakeRepo } = setupTest();
      for (const rewardCredits of [2147483648, Number.MAX_SAFE_INTEGER]) {
        await assert.rejects(service.createOrder(REQUESTER_ID, {
          supplierId: SUPPLIER_ID, itemDescription: 'Meal', dropoffLocation: 'Hall', rewardCredits,
        }), (error: Error) => error instanceof OrderValidationError && error.status === 400);
      }
      assert.equal(fakeRepo.orders.length, 0);
      assert.equal(fakeRepo.outboxEvents.length, 0);
    });

    it('accepts the maximum supported reward for asynchronous credit checking', async () => {
      const { service, fakeRepo } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID, itemDescription: 'Meal', dropoffLocation: 'Hall', rewardCredits: 2147483647,
      });
      assert.equal(order.status, 'PENDING');
      assert.equal(order.rewardCredits, 2147483647);
      assert.equal(fakeRepo.outboxEvents[0].eventType, 'order.reservation.requested');
    });

    it('rejects order creation if requesterId or supplierId is not a valid UUID', async () => {
      const { service } = setupTest();

      await assert.rejects(
        () => service.createOrder('not-a-uuid', {
          supplierId: SUPPLIER_ID,
          itemDescription: 'Meal',
          dropoffLocation: 'Hall',
          rewardCredits: 10,
        }),
        (err: Error) => err instanceof OrderValidationError && err.message.includes('requesterId'),
      );

      await assert.rejects(
        () => service.createOrder(REQUESTER_ID, {
          supplierId: 'not-a-uuid',
          itemDescription: 'Meal',
          dropoffLocation: 'Hall',
          rewardCredits: 10,
        }),
        (err: Error) => err instanceof OrderValidationError && err.message.includes('supplierId'),
      );
    });

    it('rejects order creation if supplier does not exist or is inactive', async () => {
      const { service, fakeSupplier } = setupTest();

      // Non-existent supplier
      await assert.rejects(
        () => service.createOrder(REQUESTER_ID, {
          supplierId: '90000000-0000-4000-8000-000000000001',
          itemDescription: 'Meal',
          dropoffLocation: 'Hall',
          rewardCredits: 10,
        }),
        (err: Error) => err instanceof OrderValidationError && /not exist/i.test(err.message),
      );

      // Inactive supplier
      const inactiveId = '80000000-0000-4000-8000-000000000001';
      fakeSupplier.addSupplier({
        id: inactiveId,
        name: 'Closed Kiosk',
        campusZone: 'UTown',
        isActive: false,
      });

      await assert.rejects(
        () => service.createOrder(REQUESTER_ID, {
          supplierId: inactiveId,
          itemDescription: 'Meal',
          dropoffLocation: 'Hall',
          rewardCredits: 10,
        }),
        (err: Error) => err instanceof OrderValidationError && /inactive/i.test(err.message),
      );
    });

    it('rejects order creation with 503 when supplier service is unavailable', async () => {
      const { service, fakeSupplier } = setupTest();
      fakeSupplier.setAvailable(false);

      await assert.rejects(
        () => service.createOrder(REQUESTER_ID, {
          supplierId: SUPPLIER_ID,
          itemDescription: 'Meal',
          dropoffLocation: 'Hall',
          rewardCredits: 10,
        }),
        (err: any) => err.status === 503 && /temporarily unavailable/i.test(err.message),
      );
    });

    it('persists a PENDING order and order.reservation.requested outbox event, then transitions to OPEN + order.created on credit.reservation.succeeded', async () => {
      const { service, fakeRepo } = setupTest();
      const pendingOrder = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID, itemDescription: 'Chicken Rice', dropoffLocation: 'Hall', rewardCredits: 15,
      });
      assert.equal(pendingOrder.status, 'PENDING');
      assert.equal(fakeRepo.orders.length, 1);
      assert.equal(fakeRepo.outboxEvents.length, 1);
      assert.equal(fakeRepo.outboxEvents[0].eventType, 'order.reservation.requested');

      const openedOrder = await service.handleReservationResult({
        eventId: '30000000-0000-4000-8000-000000000001',
        correlationId: pendingOrder.id,
        timestamp: new Date().toISOString(),
        eventType: 'credit.reservation.succeeded',
        orderId: pendingOrder.id,
        requesterId: REQUESTER_ID,
        rewardCredits: 15,
      });
      assert.equal(openedOrder.status, 'OPEN');
      assert.equal(fakeRepo.outboxEvents.length, 2);
      assert.equal(fakeRepo.outboxEvents[1].eventType, 'order.created');
    });

    it('transitions a PENDING order to REJECTED with rejectionReason on credit.reservation.failed', async () => {
      const { service, fakeRepo } = setupTest();
      const pendingOrder = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID, itemDescription: 'Lobster', dropoffLocation: 'Hall', rewardCredits: 500,
      });
      const rejectedOrder = await service.handleReservationResult({
        eventId: '30000000-0000-4000-8000-000000000002',
        correlationId: pendingOrder.id,
        timestamp: new Date().toISOString(),
        eventType: 'credit.reservation.failed',
        orderId: pendingOrder.id,
        requesterId: REQUESTER_ID,
        rewardCredits: 500,
        reason: 'Insufficient credits',
      });
      assert.equal(rejectedOrder.status, 'REJECTED');
      assert.equal(rejectedOrder.rejectionReason, 'Insufficient credits');
      assert.equal(fakeRepo.outboxEvents.length, 1);
    });

    it('transitions a PENDING order to EXPIRED and emits order.expired if reservation succeeds after expiresAt', async () => {
      const { service, fakeRepo } = setupTest();
      const pendingOrder = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID, itemDescription: 'Late Snack', dropoffLocation: 'Hall', rewardCredits: 12,
      });
      fakeRepo.orders[0].expiresAt = new Date(Date.now() - 5000).toISOString();

      const expiredOrder = await service.handleReservationResult({
        eventId: '30000000-0000-4000-8000-000000000003',
        correlationId: pendingOrder.id,
        timestamp: new Date().toISOString(),
        eventType: 'credit.reservation.succeeded',
        orderId: pendingOrder.id,
        requesterId: REQUESTER_ID,
        rewardCredits: 12,
      });
      assert.equal(expiredOrder.status, 'EXPIRED');
      assert.equal(fakeRepo.outboxEvents.length, 2);
      assert.equal(fakeRepo.outboxEvents[1].eventType, 'order.expired');
    });

    it('does not create an order if its durable write fails', async () => {
      const { service, fakeRepo } = setupTest();
      fakeRepo.repo.createOrderWithOutbox = async () => { throw new Error('Database unavailable'); };
      await assert.rejects(service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID, itemDescription: 'Meal', dropoffLocation: 'Hall', rewardCredits: 10,
      }), /Database unavailable/);
      assert.equal(fakeRepo.orders.length, 0);
    });
  });

  describe('acceptOrder', () => {
    it('allows a courier to claim an open errand, setting status to ACCEPTED', async () => {
      const { fundedService: service, fakeRepo } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Waffles',
        dropoffLocation: 'PGPR',
        rewardCredits: 10,
      });

      const accepted = await service.acceptOrder(order.id, COURIER_1_ID, {
        courierContactNote: 'Arriving in 15 mins by shuttle',
      });

      assert.equal(accepted.status, 'ACCEPTED');
      assert.equal(accepted.courierId, COURIER_1_ID);
      assert.equal(accepted.courierContactNote, 'Arriving in 15 mins by shuttle');
      assert.equal(accepted.version, 3);

      // Verify outbox event order.accepted
      const lastEvent = fakeRepo.outboxEvents[fakeRepo.outboxEvents.length - 1];
      assert.equal(lastEvent.eventType, 'order.accepted');
      const payload = JSON.parse(lastEvent.payload);
      assert.equal(payload.orderId, order.id);
      assert.equal(payload.courierId, COURIER_1_ID);
    });

    // AI-generated (edited by Reallyeasy1)
    it('puts the courier username on order.accepted when the caller has one, and omits it otherwise (F5.1.1)', async () => {
      const { fundedService: service, fakeRepo } = setupTest();
      const request = { supplierId: SUPPLIER_ID, itemDescription: 'Kaya toast', dropoffLocation: 'COM1', rewardCredits: 5 };
      const lastPayload = () => JSON.parse(fakeRepo.outboxEvents[fakeRepo.outboxEvents.length - 1].payload);

      const named = await service.createOrder(REQUESTER_ID, request);
      await service.acceptOrder(named.id, COURIER_1_ID, undefined, 'bob');
      assert.equal(lastPayload().courierUsername, 'bob');

      const anonymous = await service.createOrder(REQUESTER_ID, request);
      await service.acceptOrder(anonymous.id, COURIER_1_ID);
      assert.equal('courierUsername' in lastPayload(), false);
    });

    it('rejects self-fulfillment when requester attempts to claim their own errand', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Coffee',
        dropoffLocation: 'Central Library',
        rewardCredits: 5,
      });

      await assert.rejects(
        () => service.acceptOrder(order.id, REQUESTER_ID),
        SelfAcceptForbiddenError,
      );
    });

    it('enforces single-winner concurrency by rejecting competing claims on already claimed errand', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Juice',
        dropoffLocation: 'UTown RC4',
        rewardCredits: 10,
      });

      // Courier 1 wins
      await service.acceptOrder(order.id, COURIER_1_ID);

      // Courier 2 tries to claim same errand -> 409 Conflict
      await assert.rejects(
        () => service.acceptOrder(order.id, COURIER_2_ID),
        OrderStateConflictError,
      );
    });

    it('rejects claiming an order whose expiration deadline has passed', async () => {
      const { fundedService: service, fakeRepo } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Snack',
        dropoffLocation: 'Museum',
        rewardCredits: 8,
      });

      // Manually simulate expiration
      const stored = fakeRepo.orders.find((o) => o.id === order.id)!;
      stored.expiresAt = new Date(Date.now() - 10000).toISOString();

      await assert.rejects(
        () => service.acceptOrder(order.id, COURIER_1_ID),
        OrderStateConflictError,
      );
    });

    it('rejects courierContactNote if it is not a string or exceeds 255 characters', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Juice',
        dropoffLocation: 'UTown RC4',
        rewardCredits: 10,
      });

      // Non-string
      await assert.rejects(
        () => service.acceptOrder(order.id, COURIER_1_ID, { courierContactNote: 12345 as any }),
        (err: Error) => err instanceof OrderValidationError && err.message.includes('courierContactNote must be a string'),
      );

      // Over 255 characters
      await assert.rejects(
        () => service.acceptOrder(order.id, COURIER_1_ID, { courierContactNote: 'a'.repeat(256) }),
        (err: Error) => err instanceof OrderValidationError && err.message.includes('courierContactNote must be at most 255 characters'),
      );
    });
  });

  describe('pickupOrder, deliverOrder, completeOrder', () => {
    it('progresses full happy path: ACCEPTED -> IN_TRANSIT -> DELIVERED -> COMPLETED', async () => {
      const { fundedService: service, fakeRepo } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Fruit Cup',
        dropoffLocation: 'Sheares Hall',
        rewardCredits: 12,
      });

      await service.acceptOrder(order.id, COURIER_1_ID);

      // 1. Pickup
      const inTransit = await service.pickupOrder(order.id, COURIER_1_ID, 'bob');
      assert.equal(inTransit.status, 'IN_TRANSIT');
      assert.ok(inTransit.pickedUpAt);
      assert.equal(JSON.parse(fakeRepo.outboxEvents[fakeRepo.outboxEvents.length - 1].payload).courierUsername, 'bob');

      // 2. Deliver
      const delivered = await service.deliverOrder(order.id, COURIER_1_ID, 'bob');
      assert.equal(delivered.status, 'DELIVERED');
      assert.ok(delivered.deliveredAt);
      assert.equal(JSON.parse(fakeRepo.outboxEvents[fakeRepo.outboxEvents.length - 1].payload).courierUsername, 'bob');

      // 3. Complete (confirmed by requester)
      const completed = await service.completeOrder(order.id, REQUESTER_ID);
      assert.equal(completed.status, 'COMPLETED');
      assert.ok(completed.completedAt);
      assert.equal(completed.version, 6);

      // Check final completed event in outbox
      const lastEvent = fakeRepo.outboxEvents[fakeRepo.outboxEvents.length - 1];
      assert.equal(lastEvent.eventType, 'order.completed');
      const payload = JSON.parse(lastEvent.payload);
      assert.equal(payload.orderId, order.id);
      assert.equal(payload.rewardCredits, 12);
      assert.equal(payload.courierId, COURIER_1_ID);
    });

    it('rejects pickup or deliver by someone other than the assigned courier', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Boba',
        dropoffLocation: 'UTown',
        rewardCredits: 10,
      });

      await service.acceptOrder(order.id, COURIER_1_ID);

      // Courier 2 tries to pickup Courier 1's errand
      await assert.rejects(
        () => service.pickupOrder(order.id, COURIER_2_ID),
        OrderAuthorizationError,
      );

      // Courier 1 picks up
      await service.pickupOrder(order.id, COURIER_1_ID);

      // Courier 2 tries to deliver Courier 1's errand
      await assert.rejects(
        () => service.deliverOrder(order.id, COURIER_2_ID),
        OrderAuthorizationError,
      );
    });

    it('rejects confirmation of completion by someone other than the requester', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Salad',
        dropoffLocation: 'Kent Ridge Hall',
        rewardCredits: 10,
      });

      await service.acceptOrder(order.id, COURIER_1_ID);
      await service.pickupOrder(order.id, COURIER_1_ID);
      await service.deliverOrder(order.id, COURIER_1_ID);

      // Courier tries to confirm completion themselves
      await assert.rejects(
        () => service.completeOrder(order.id, COURIER_1_ID),
        OrderAuthorizationError,
      );
    });

    it('rejects confirmation of completion if errand is IN_TRANSIT and not yet DELIVERED', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Snack',
        dropoffLocation: 'Kent Ridge Hall',
        rewardCredits: 10,
      });

      await service.acceptOrder(order.id, COURIER_1_ID);
      await service.pickupOrder(order.id, COURIER_1_ID);

      // Attempt complete while IN_TRANSIT
      await assert.rejects(
        () => service.completeOrder(order.id, REQUESTER_ID),
        (err: Error) => err instanceof OrderStateConflictError && /DELIVERED/i.test(err.message),
      );
    });
  });

  describe('cancelOrder', () => {
    it('allows requester to cancel an OPEN errand, creating order.cancelled outbox event', async () => {
      const { fundedService: service, fakeRepo } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Notebook',
        dropoffLocation: 'YIH',
        rewardCredits: 20,
      });

      const cancelled = await service.cancelOrder(order.id, REQUESTER_ID);
      assert.equal(cancelled.status, 'CANCELLED');

      const lastEvent = fakeRepo.outboxEvents[fakeRepo.outboxEvents.length - 1];
      assert.equal(lastEvent.eventType, 'order.cancelled');
      const payload = JSON.parse(lastEvent.payload);
      assert.equal(payload.orderId, order.id);
      assert.equal(payload.rewardCredits, 20);
    });

    it('allows requester to cancel an ACCEPTED errand before pickup and preserves courierId for courier history', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Notebook',
        dropoffLocation: 'YIH',
        rewardCredits: 20,
      });

      await service.acceptOrder(order.id, COURIER_1_ID);

      const cancelled = await service.cancelOrder(order.id, REQUESTER_ID);
      assert.equal(cancelled.status, 'CANCELLED');
      assert.equal(cancelled.courierId, COURIER_1_ID);

      const courierActivity = await service.getUserActivity(COURIER_1_ID);
      assert.equal(courierActivity.history.some((o) => o.id === order.id && o.status === 'CANCELLED'), true);
    });

    it('allows assigned courier to drop (unassign) an ACCEPTED errand before pickup and returns it to OPEN', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Iced Tea',
        dropoffLocation: 'UTown',
        rewardCredits: 12,
      });

      await service.acceptOrder(order.id, COURIER_1_ID, { courierContactNote: 'On my way' });

      await assert.rejects(
        () => service.unassignOrder(order.id, COURIER_2_ID),
        OrderAuthorizationError,
      );

      const dropped = await service.unassignOrder(order.id, COURIER_1_ID);
      assert.equal(dropped.status, 'OPEN');
      assert.equal(dropped.courierId, null);
      assert.equal(dropped.acceptedAt, null);
      assert.equal(dropped.courierContactNote, null);

      // Another courier can now accept the reopened order
      const reaccepted = await service.acceptOrder(order.id, COURIER_2_ID);
      assert.equal(reaccepted.status, 'ACCEPTED');
      assert.equal(reaccepted.courierId, COURIER_2_ID);

      // Once picked up (IN_TRANSIT), courier can no longer drop the errand
      await service.pickupOrder(order.id, COURIER_2_ID);
      await assert.rejects(
        () => service.unassignOrder(order.id, COURIER_2_ID),
        OrderStateConflictError,
      );
    });

    it('rejects cancellation once errand is IN_TRANSIT or DELIVERED', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Lunch',
        dropoffLocation: 'Eusoff Hall',
        rewardCredits: 15,
      });

      await service.acceptOrder(order.id, COURIER_1_ID);
      await service.pickupOrder(order.id, COURIER_1_ID);

      await assert.rejects(
        () => service.cancelOrder(order.id, REQUESTER_ID),
        OrderStateConflictError,
      );
    });
  });

  describe('Expiry Sweeper', () => {
    it('automatically transitions expired open orders to EXPIRED status', async () => {
      const { fundedService: service, fakeRepo } = setupTest();
      const order1 = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Past Errand',
        dropoffLocation: 'Hall',
        rewardCredits: 10,
      });
      const order2 = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Active Errand',
        dropoffLocation: 'Hall',
        rewardCredits: 15,
      });

      // Expire order1 manually in storage
      const stored1 = fakeRepo.orders.find((o) => o.id === order1.id)!;
      stored1.expiresAt = new Date(Date.now() - 30000).toISOString();

      const sweeper = createExpirySweeper({
        repository: fakeRepo.repo,
      });

      const sweptCount = await sweeper.sweep();
      assert.equal(sweptCount, 1);

      const updated1 = await service.getOrderById(order1.id);
      assert.equal(updated1.status, 'EXPIRED');

      const updated2 = await service.getOrderById(order2.id);
      assert.equal(updated2.status, 'OPEN');

      // Verify order.expired outbox event
      const expiredEvent = fakeRepo.outboxEvents.find((e) => e.eventType === 'order.expired');
      assert.ok(expiredEvent);
      const payload = JSON.parse(expiredEvent.payload);
      assert.equal(payload.orderId, order1.id);
      assert.equal(payload.rewardCredits, 10);
    });
  });

  describe('getUserActivity', () => {
    it('correctly partitions user requested, delivering, and historical orders', async () => {
      const { fundedService: service } = setupTest();

      // Order 1: Alice is requester, open
      const o1 = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Errand 1',
        dropoffLocation: 'Loc 1',
        rewardCredits: 10,
      });

      // Order 2: Alice is requester, Courier 1 claims and delivers, Alice completes
      const o2 = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Errand 2',
        dropoffLocation: 'Loc 2',
        rewardCredits: 15,
      });
      await service.acceptOrder(o2.id, COURIER_1_ID);
      await service.pickupOrder(o2.id, COURIER_1_ID);
      await service.deliverOrder(o2.id, COURIER_1_ID);
      await service.completeOrder(o2.id, REQUESTER_ID);

      // Order 3: Courier 1 is requester, Alice claims
      const o3 = await service.createOrder(COURIER_1_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Errand 3',
        dropoffLocation: 'Loc 3',
        rewardCredits: 20,
      });
      await service.acceptOrder(o3.id, REQUESTER_ID);

      // Alice's activity
      const aliceActivity = await service.getUserActivity(REQUESTER_ID);
      assert.equal(aliceActivity.requested.length, 1);
      assert.equal(aliceActivity.requested[0].id, o1.id);

      assert.equal(aliceActivity.delivering.length, 1);
      assert.equal(aliceActivity.delivering[0].id, o3.id);

      assert.equal(aliceActivity.history.length, 1);
      assert.equal(aliceActivity.history[0].id, o2.id);
    });
  });

  describe('Admin Order Management & Concurrency Guards', () => {
    it('allows admin to cancel an OPEN order with valid reason and records order.cancelled outbox event', async () => {
      const { fundedService: service, fakeRepo } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Late Night Waffles',
        dropoffLocation: 'Eusoff Hall',
        rewardCredits: 12,
      });

      const cancelled = await service.adminCancelOrder(order.id, ADMIN_ID, {
        reason: 'User reported mistaken duplicate submission',
      });

      assert.equal(cancelled.status, 'CANCELLED');
      assert.ok(cancelled.specialNotes?.includes('Admin Cancel'));
      assert.equal(cancelled.version, 3);

      const cancelEvent = fakeRepo.outboxEvents.find(
        (e) => e.eventType === 'order.cancelled' && JSON.parse(e.payload).orderId === order.id
      );
      assert.ok(cancelEvent, 'Expected order.cancelled outbox event for escrow refund');
    });

    it('allows admin to cancel an ACCEPTED or IN_TRANSIT order with reason', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Bubble Tea',
        dropoffLocation: 'PGPR Block 20',
        rewardCredits: 10,
      });

      await service.acceptOrder(order.id, COURIER_1_ID);
      await service.pickupOrder(order.id, COURIER_1_ID);

      const inTransit = await service.getOrderById(order.id);
      assert.equal(inTransit.status, 'IN_TRANSIT');

      const cancelled = await service.adminCancelOrder(order.id, ADMIN_ID, {
        reason: 'Courier bicycle broke down midway, order unfulfillable',
      });

      assert.equal(cancelled.status, 'CANCELLED');
      assert.ok(cancelled.specialNotes?.includes('Courier bicycle broke down midway'));
    });

    it('rejects admin cancel if order is already in a terminal state (COMPLETED or CANCELLED)', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Salad Bowl',
        dropoffLocation: 'Science LT27',
        rewardCredits: 15,
      });

      await service.acceptOrder(order.id, COURIER_1_ID);
      await service.pickupOrder(order.id, COURIER_1_ID);
      await service.deliverOrder(order.id, COURIER_1_ID);
      await service.completeOrder(order.id, REQUESTER_ID);

      await assert.rejects(
        () => service.adminCancelOrder(order.id, ADMIN_ID, { reason: 'Try cancelling completed' }),
        OrderStateConflictError
      );
    });

    it('rejects admin cancel when expectedVersion does not match current version (F7.1.4.1)', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Coffee',
        dropoffLocation: 'Biz School',
        rewardCredits: 8,
      });

      // Another user accepts the order concurrently (version moves from 2 to 3)
      await service.acceptOrder(order.id, COURIER_1_ID);

      // Admin attempts to cancel with stale expectedVersion 2
      await assert.rejects(
        () => service.adminCancelOrder(order.id, ADMIN_ID, {
          reason: 'Stale admin action',
          expectedVersion: 2,
        }),
        OrderStateConflictError
      );
    });

    it('rejects admin operations without a valid non-empty reason', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Sandwich',
        dropoffLocation: 'UTown ERC',
        rewardCredits: 5,
      });

      await assert.rejects(
        () => service.adminCancelOrder(order.id, ADMIN_ID, { reason: '   ' }),
        (err: Error) => err instanceof OrderValidationError && err.message.includes('reason cannot be empty')
      );
    });

    it('allows admin to force-complete a DELIVERED order and releases escrow via order.completed event', async () => {
      const { fundedService: service, fakeRepo } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Subway Sandwich',
        dropoffLocation: 'Ridge View Residential College',
        rewardCredits: 10,
      });

      await service.acceptOrder(order.id, COURIER_1_ID);
      await service.pickupOrder(order.id, COURIER_1_ID);
      await service.deliverOrder(order.id, COURIER_1_ID);

      const completed = await service.adminCompleteOrder(order.id, ADMIN_ID, {
        reason: 'Requester uncontactable after photo confirmation',
        expectedVersion: 5,
      });

      assert.equal(completed.status, 'COMPLETED');
      assert.ok(completed.completedAt);
      assert.ok(completed.specialNotes?.includes('Admin Force-Complete'));

      const completeEvent = fakeRepo.outboxEvents.find(
        (e) => e.eventType === 'order.completed' && JSON.parse(e.payload).orderId === order.id
      );
      assert.ok(completeEvent, 'Expected order.completed outbox event for courier escrow payout');
    });

    it('rejects admin force-complete if order is not in DELIVERED state', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Chicken Rice',
        dropoffLocation: 'YIH',
        rewardCredits: 10,
      });

      // Still OPEN
      await assert.rejects(
        () => service.adminCompleteOrder(order.id, ADMIN_ID, { reason: 'Force complete premature' }),
        OrderStateConflictError
      );
    });

    it('allows admin to unassign courier from ACCEPTED order and reverts status to OPEN', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Fruit Juice',
        dropoffLocation: 'Kent Ridge Hall',
        rewardCredits: 7,
      });

      await service.acceptOrder(order.id, COURIER_1_ID);

      const unassigned = await service.adminUnassignOrder(order.id, ADMIN_ID, {
        reason: 'Courier requested unassignment due to emergency',
      });

      assert.equal(unassigned.status, 'OPEN');
      assert.equal(unassigned.courierId, null);
      assert.equal(unassigned.acceptedAt, null);
      assert.ok(unassigned.specialNotes?.includes('emergency'));
    });

    it('rejects admin unassign if order is not in ACCEPTED state', async () => {
      const { fundedService: service } = setupTest();
      const order = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Snack',
        dropoffLocation: 'PGP',
        rewardCredits: 5,
      });

      // Still OPEN, cannot unassign
      await assert.rejects(
        () => service.adminUnassignOrder(order.id, ADMIN_ID, { reason: 'No courier assigned' }),
        OrderStateConflictError
      );
    });

    it('supports listing all orders with search text matching orderCode or description', async () => {
      const { fundedService: service } = setupTest();
      const o1 = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Special Thai Basil Chicken',
        dropoffLocation: 'Raffles Hall',
        rewardCredits: 12,
      });
      const o2 = await service.createOrder(REQUESTER_ID, {
        supplierId: SUPPLIER_ID,
        itemDescription: 'Iced Lemon Tea',
        dropoffLocation: 'Utown Stephen Riady Centre',
        rewardCredits: 5,
      });

      const resSearch = await service.listOrders({
        status: 'ALL',
        search: 'Thai Basil',
      });

      assert.equal(resSearch.total, 1);
      assert.equal(resSearch.orders[0].id, o1.id);

      const resCode = await service.listOrders({
        status: 'ALL',
        search: o2.orderCode,
      });

      assert.equal(resCode.total, 1);
      assert.equal(resCode.orders[0].id, o2.id);
    });
  });
});
