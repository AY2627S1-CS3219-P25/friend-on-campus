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

  it('handles malformed payload by incrementing retry count without crashing the relay', async () => {
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
    assert.equal(fake.outboxEvents[0].status, 'PENDING');
    assert.equal(fake.outboxEvents[0].retryCount, 1);

    await relay.stop();
  });
});
