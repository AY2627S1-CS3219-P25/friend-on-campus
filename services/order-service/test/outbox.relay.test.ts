/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Unit test suite for Transactional Outbox relay polling, publisher confirm retries, and poisoned payload isolation.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { OrderCreatedEvent } from '@campus-errand/common-dtos';
import { createOutboxRelay } from '../src/messaging/outbox.relay';
import type { OrderEventPublisher, OrderLifecycleEvent } from '../src/messaging/event.publisher';

describe('Transactional Outbox Relay for Order Service', () => {
  function makeMockPrisma(initialEvents: Array<{ id: string; eventType: string; payload: string; status: string; retryCount: number; createdAt: Date; updatedAt: Date }>) {
    const events = [...initialEvents];

    const prismaMock = {
      outboxEvent: {
        async findMany(args: { where: { status: string }; take?: number; orderBy?: any }) {
          return events
            .filter((e) => e.status === args.where.status)
            .slice(0, args.take ?? 20);
        },
        async update(args: { where: { id: string }; data: any }) {
          const item = events.find((e) => e.id === args.where.id);
          if (!item) throw new Error('Not found');
          Object.assign(item, args.data);
          return item;
        },
      },
    };

    return { prismaMock, events };
  }

  it('polls pending outbox events, dispatches to publisher, and marks as DELIVERED', async () => {
    const published: OrderLifecycleEvent[] = [];
    const eventPayload: OrderCreatedEvent = {
      eventType: 'order.created',
      eventId: '10000000-0000-4000-8000-000000000001',
      timestamp: new Date().toISOString(),
      orderId: '20000000-0000-4000-8000-000000000001',
      orderCode: 'ORD-12345',
      requesterId: '30000000-0000-4000-8000-000000000001',
      rewardCredits: 10,
      campusZone: 'UTown',
      expiresAt: new Date(Date.now() + 3600000).toISOString(),
    };

    const { prismaMock, events } = makeMockPrisma([
      {
        id: 'outbox-1',
        eventType: 'order.created',
        payload: JSON.stringify(eventPayload),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const publisher: OrderEventPublisher = {
      async publishOrderEvent(event) {
        published.push(event);
        return true;
      },
      async close() {},
    };

    const relay = createOutboxRelay({
      prisma: prismaMock as any,
      publisher,
      pollIntervalMs: 1000,
    });

    const count = await relay.processPending();
    assert.equal(count, 1);
    assert.equal(published.length, 1);
    assert.equal(published[0].eventId, eventPayload.eventId);
    assert.equal(events[0].status, 'DELIVERED');
  });

  it('increments retryCount and keeps status PENDING when publisher temporarily fails', async () => {
    const { prismaMock, events } = makeMockPrisma([
      {
        id: 'outbox-2',
        eventType: 'order.created',
        payload: JSON.stringify({ eventType: 'order.created', eventId: '1' }),
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const publisher: OrderEventPublisher = {
      async publishOrderEvent() {
        return false; // broker failure
      },
      async close() {},
    };

    const relay = createOutboxRelay({
      prisma: prismaMock as any,
      publisher,
    });

    const count = await relay.processPending();
    assert.equal(count, 0);
    assert.equal(events[0].status, 'PENDING');
    assert.equal(events[0].retryCount, 1);
  });

  it('quarantines poisoned JSON payloads as FAILED without crashing the relay', async () => {
    const { prismaMock, events } = makeMockPrisma([
      {
        id: 'outbox-poison',
        eventType: 'order.created',
        payload: '{invalid-json:::',
        status: 'PENDING',
        retryCount: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);

    const publisher: OrderEventPublisher = {
      async publishOrderEvent() {
        return true;
      },
      async close() {},
    };

    const relay = createOutboxRelay({
      prisma: prismaMock as any,
      publisher,
    });

    const count = await relay.processPending();
    assert.equal(count, 0);
    assert.equal(events[0].status, 'FAILED');
  });
});
