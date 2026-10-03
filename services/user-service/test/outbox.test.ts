/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-03
 * Scope: Unit tests for transactional outbox relay, event persistence, publisher retry, and broker recovery.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import type { UserRegisteredEvent } from '@campus-errand/common-dtos';
import { createAuthModule } from '../src/auth/auth-module';
import { createOutboxRelay } from '../src/messaging/outbox';
import type { UserEventPublisher } from '../src/messaging/publisher';
import { makeFakeAuthRepository, makeFakeTokens } from './helpers';

const LIFETIMES = {
  accessTokenLifetimeSeconds: 900,
  refreshTokenIdleLifetimeSeconds: 86_400,
  persistentRefreshTokenIdleLifetimeSeconds: 30 * 86_400,
};

describe('Transactional Outbox Relay', () => {
  it('processes pending events, publishes to RabbitMQ, and marks events as DELIVERED', async () => {
    const fake = makeFakeAuthRepository();
    const published: UserRegisteredEvent[] = [];
    const publisher: UserEventPublisher = {
      async publishUserRegistered(event) {
        published.push(event);
        return true;
      },
      async close() {},
    };

    const relay = createOutboxRelay({
      repository: fake.repo,
      publisher,
      pollIntervalMs: 1000,
    });

    const auth = createAuthModule({
      repository: fake.repo,
      tokens: makeFakeTokens(),
      outboxRelay: relay,
      ...LIFETIMES,
    });

    const user = await auth.register({
      username: 'outboxuser',
      email: 'outbox@u.nus.edu',
      password: 'Password123!',
    });

    // Verify outbox entry was recorded
    assert.equal(fake.outboxEvents.length, 1);
    const eventRecord = fake.outboxEvents[0];
    assert.equal(eventRecord.eventType, 'user.registered');
    const parsedPayload = JSON.parse(eventRecord.payload) as UserRegisteredEvent;
    assert.equal(parsedPayload.userId, user.userId);
    assert.equal(parsedPayload.email, 'outbox@u.nus.edu');
    assert.equal(parsedPayload.initialGrant, 100);

    // Relay trigger should have published and marked as DELIVERED
    await relay.processPending();
    assert.equal(published.length, 1);
    assert.equal(published[0].eventId, parsedPayload.eventId);
    assert.equal(fake.outboxEvents[0].status, 'DELIVERED');

    await relay.stop();
  });

  it('leaves events PENDING and increments retryCount if publisher fails, then delivers on broker recovery', async () => {
    const fake = makeFakeAuthRepository();
    let brokerAvailable = false;
    const published: UserRegisteredEvent[] = [];

    const publisher: UserEventPublisher = {
      async publishUserRegistered(event) {
        if (!brokerAvailable) {
          return false;
        }
        published.push(event);
        return true;
      },
      async close() {},
    };

    const relay = createOutboxRelay({
      repository: fake.repo,
      publisher,
      pollIntervalMs: 1000,
    });

    const auth = createAuthModule({
      repository: fake.repo,
      tokens: makeFakeTokens(),
      outboxRelay: relay,
      ...LIFETIMES,
    });

    // Registration succeeds even when broker is down
    const user = await auth.register({
      username: 'resilientuser',
      email: 'resilient@u.nus.edu',
      password: 'Password123!',
    });
    assert.equal(user.username, 'resilientuser');

    // Registration triggers the relay automatically
    await relay.processPending();
    assert.equal(fake.outboxEvents[0].status, 'PENDING');
    assert.ok(fake.outboxEvents[0].retryCount >= 1);
    assert.equal(published.length, 0);

    const countAfterFirstAttempt = fake.outboxEvents[0].retryCount;

    // Second attempt fails: remains PENDING with incremented retryCount
    await relay.processPending();
    assert.equal(fake.outboxEvents[0].status, 'PENDING');
    assert.equal(fake.outboxEvents[0].retryCount, countAfterFirstAttempt + 1);
    assert.equal(published.length, 0);

    // Broker recovers
    brokerAvailable = true;
    await relay.processPending();

    // Now delivered, preserves exact eventId and payload
    assert.equal(fake.outboxEvents[0].status, 'DELIVERED');
    assert.equal(published.length, 1);
    const parsedPayload = JSON.parse(fake.outboxEvents[0].payload) as UserRegisteredEvent;
    assert.equal(published[0].eventId, parsedPayload.eventId);
    assert.equal(published[0].userId, user.userId);

    await relay.stop();
  });

  it('marks a malformed payload FAILED without crashing the relay', async () => {
    const fake = makeFakeAuthRepository();
    fake.outboxEvents.push({
      id: 'bad-event-1',
      eventType: 'user.registered',
      payload: 'invalid-json{{{',
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const publisher: UserEventPublisher = {
      async publishUserRegistered() {
        return true;
      },
      async close() {},
    };

    const relay = createOutboxRelay({
      repository: fake.repo,
      publisher,
    });

    await relay.processPending();
    assert.equal(fake.outboxEvents[0].status, 'FAILED');
    assert.equal(fake.outboxEvents[0].retryCount, 1);

    await relay.stop();
  });

  it('quarantines a full poisoned batch and delivers the next valid event', async () => {
    const fake = makeFakeAuthRepository();
    const createdAt = new Date('2026-10-04T00:00:00.000Z');

    for (let index = 0; index < 20; index++) {
      fake.outboxEvents.push({
        id: `poison-${index}`,
        eventType: index % 2 === 0 ? 'unsupported.event' : 'user.registered',
        payload: index % 2 === 0 ? '{}' : 'invalid-json{{{',
        status: 'PENDING',
        retryCount: 0,
        createdAt,
        updatedAt: createdAt,
      });
    }

    const validEvent: UserRegisteredEvent = {
      eventId: '10000000-0000-4000-8000-000000000001',
      eventType: 'user.registered',
      timestamp: '2026-10-04T00:00:01.000Z',
      userId: '20000000-0000-4000-8000-000000000001',
      email: 'next@u.nus.edu',
      initialGrant: 100,
    };
    fake.outboxEvents.push({
      id: 'valid-after-poison',
      eventType: validEvent.eventType,
      payload: JSON.stringify(validEvent),
      status: 'PENDING',
      retryCount: 0,
      createdAt: new Date('2026-10-04T00:00:01.000Z'),
      updatedAt: new Date('2026-10-04T00:00:01.000Z'),
    });

    const originalGetPending = fake.repo.getPendingOutboxEvents;
    let fetchCount = 0;
    fake.repo.getPendingOutboxEvents = async (limit) => {
      fetchCount += 1;
      if (fetchCount > 3) throw new Error('Relay repeatedly fetched a poisoned head batch');
      return originalGetPending(limit);
    };

    const published: UserRegisteredEvent[] = [];
    const publisher: UserEventPublisher = {
      async publishUserRegistered(event) {
        published.push(event);
        return true;
      },
      async close() {},
    };
    const relay = createOutboxRelay({ repository: fake.repo, publisher, batchSize: 20 });

    const deliveredCount = await relay.processPending();

    assert.equal(deliveredCount, 1);
    assert.equal(fetchCount, 2);
    assert.equal(published.length, 1);
    assert.equal(published[0].eventId, validEvent.eventId);
    assert.ok(fake.outboxEvents.slice(0, 20).every((event) => event.status === 'FAILED'));
    assert.ok(fake.outboxEvents.slice(0, 20).every((event) => event.retryCount === 1));
    assert.equal(fake.outboxEvents[20].status, 'DELIVERED');

    await relay.stop();
  });
});
