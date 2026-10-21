/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-03
 * Scope: Unit tests for confirmed RabbitMQ publisher and event delivery error isolation.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Updated publisher unit tests for createRabbitPublisher via rabbitmq-client.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by huangjiaxi1111, yanhwee)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { Connection } from 'rabbitmq-client';
import { createRabbitPublisher } from '@campus-errand/messaging';
import type { UserRegisteredEvent } from '@campus-errand/common-dtos';
import {
  createRabbitMQPublisher,
  noopPublisher,
} from '../src/messaging/publisher';

describe('createRabbitMQPublisher error tolerance', () => {
  it('returns false and isolates errors if broker connection fails', async () => {
    const publisher = createRabbitMQPublisher({
      url: 'amqp://user_service:invalid@127.0.0.1:1/campus',
      exchange: 'campus.events',
    });

    const event: UserRegisteredEvent = {
      eventId: '10000000-0000-4000-8000-000000000001',
      eventType: 'user.registered',
      timestamp: new Date().toISOString(),
      userId: '20000000-0000-4000-8000-000000000001',
      email: 'student@u.nus.edu',
      initialGrant: 100,
    };

    const result = await publisher.publishUserRegistered(event);
    assert.equal(result, false);

    await publisher.close();
  });

  it('respects connectionTimeoutMs option when attempting broker connection', async () => {
    const publisher = createRabbitMQPublisher({
      url: 'amqp://user_service:invalid@127.0.0.1:1/campus',
      exchange: 'campus.events',
      connectionTimeoutMs: 100,
    });

    const event: UserRegisteredEvent = {
      eventId: '10000000-0000-4000-8000-000000000001',
      eventType: 'user.registered',
      timestamp: new Date().toISOString(),
      userId: '20000000-0000-4000-8000-000000000001',
      email: 'student@u.nus.edu',
      initialGrant: 100,
    };

    const result = await publisher.publishUserRegistered(event);
    assert.equal(result, false);

    await publisher.close();
  });

  it('returns false after publisher is closed', async () => {
    const publisher = createRabbitMQPublisher({
      url: 'amqp://user_service:invalid@127.0.0.1:1/campus',
      exchange: 'campus.events',
    });
    await publisher.close();

    const event: UserRegisteredEvent = {
      eventId: '10000000-0000-4000-8000-000000000001',
      eventType: 'user.registered',
      timestamp: new Date().toISOString(),
      userId: '20000000-0000-4000-8000-000000000001',
      email: 'student@u.nus.edu',
      initialGrant: 100,
    };

    assert.equal(await publisher.publishUserRegistered(event), false);
  });

  it('rejects when message is returned unroutable (basic.return)', async (t) => {
    t.mock.method(Connection.prototype as unknown as { _connect: () => unknown }, '_connect', () => undefined);
    t.mock.method(Connection.prototype, 'onConnect', async () => {});
    t.mock.method(Connection.prototype, 'close', async () => {});
    t.mock.method(Connection.prototype, 'createPublisher', () => {
      const pub = new EventEmitter() as EventEmitter & { send: () => Promise<void>; close: () => Promise<void> };
      pub.send = async () => {
        pub.emit('basic.return', {});
      };
      pub.close = async () => {};
      return pub as unknown as ReturnType<Connection['createPublisher']>;
    });

    const rabbit = createRabbitPublisher({ url: 'amqp://127.0.0.1:5672/campus' });
    await assert.rejects(
      rabbit.publish('campus.events', 'user.registered', Buffer.from('{}')),
      /RabbitMQ message was unroutable/,
    );
    await rabbit.close();
  });

  it('rejects and resets connection when publish confirm times out', async (t) => {
    t.mock.method(Connection.prototype as unknown as { _connect: () => unknown }, '_connect', () => undefined);
    t.mock.method(Connection.prototype, 'onConnect', async () => {});
    t.mock.method(Connection.prototype, 'close', async () => {});
    t.mock.method(Connection.prototype, 'createPublisher', () => {
      const pub = new EventEmitter() as EventEmitter & { send: () => Promise<void>; close: () => Promise<void> };
      pub.send = () => new Promise<void>(() => {});
      pub.close = async () => {};
      return pub as unknown as ReturnType<Connection['createPublisher']>;
    });

    const rabbit = createRabbitPublisher({ url: 'amqp://127.0.0.1:5672/campus', connectionTimeoutMs: 50 });
    await assert.rejects(
      rabbit.publish('campus.events', 'user.registered', Buffer.from('{}')),
      /RabbitMQ publish confirm timed out/,
    );
    await rabbit.close();
  });
});

describe('noopPublisher', () => {
  it('returns true on publish and closes cleanly', async () => {
    const event: UserRegisteredEvent = {
      eventId: '10000000-0000-4000-8000-000000000001',
      eventType: 'user.registered',
      timestamp: new Date().toISOString(),
      userId: '20000000-0000-4000-8000-000000000001',
      email: 'student@u.nus.edu',
      initialGrant: 100,
    };

    assert.equal(await noopPublisher.publishUserRegistered(event), true);
    await noopPublisher.close();
  });
});
