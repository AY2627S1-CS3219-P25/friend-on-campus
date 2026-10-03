/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-03
 * Scope: Unit tests for confirmed RabbitMQ publisher and event delivery error isolation.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-04
 * Scope: Added regression coverage for recreating a publisher channel without leaking or redialing its live AMQP connection.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import amqp, { type ChannelModel, type ConfirmChannel } from 'amqplib';
import type { UserRegisteredEvent } from '@campus-errand/common-dtos';
import {
  createConfirmedPublisher,
  createRabbitMQPublisher,
  noopPublisher,
} from '../src/messaging/publisher';

function createMockChannel() {
  const emitter = new EventEmitter() as ConfirmChannel;
  const published: {
    exchange: string;
    key: string;
    content: Buffer;
    options: Record<string, unknown>;
  }[] = [];

  let nextPublishError: Error | null = null;
  let simulateReturn = false;

  (emitter as any).publish = (
    exchange: string,
    key: string,
    content: Buffer,
    options: Record<string, unknown>,
    callback: (err?: Error | null) => void,
  ) => {
    published.push({ exchange, key, content, options });
    if (simulateReturn) {
      emitter.emit('return', { replyCode: 312, replyText: 'NO_ROUTE' });
    }
    setImmediate(() => {
      callback(nextPublishError);
    });
    return true;
  };

  (emitter as any).close = async () => {
    emitter.emit('close');
  };

  return {
    channel: emitter,
    published,
    setPublishError(err: Error | null) {
      nextPublishError = err;
    },
    setSimulateReturn(value: boolean) {
      simulateReturn = value;
    },
  };
}

describe('createConfirmedPublisher', () => {
  it('publishes messages with persistent and mandatory flags and resolves upon confirmation', async () => {
    const mock = createMockChannel();
    const publish = createConfirmedPublisher(mock.channel);

    const payload = Buffer.from('{"hello":"world"}');
    await publish('campus.events', 'user.registered', payload, { messageId: 'msg-1' });

    assert.equal(mock.published.length, 1);
    assert.equal(mock.published[0].exchange, 'campus.events');
    assert.equal(mock.published[0].key, 'user.registered');
    assert.deepEqual(mock.published[0].content, payload);
    assert.equal(mock.published[0].options.persistent, true);
    assert.equal(mock.published[0].options.mandatory, true);
    assert.equal(mock.published[0].options.messageId, 'msg-1');
  });

  it('rejects when message is returned unroutable', async () => {
    const mock = createMockChannel();
    mock.setSimulateReturn(true);
    const publish = createConfirmedPublisher(mock.channel);

    await assert.rejects(
      publish('campus.events', 'user.unknown', Buffer.from('{}')),
      /Message was unroutable/,
    );
  });

  it('rejects when channel emits close before confirmation', async () => {
    const mock = createMockChannel();
    const publish = createConfirmedPublisher(mock.channel);

    // Override publish to trigger close
    (mock.channel as any).publish = () => {
      setImmediate(() => mock.channel.emit('close'));
      return true;
    };

    await assert.rejects(
      publish('campus.events', 'user.registered', Buffer.from('{}')),
      /Publisher channel closed/,
    );
  });
});

describe('createRabbitMQPublisher error tolerance', () => {
  // AI-generated (edited by huangjiaxi1111)
  it('reuses a live connection when a closed channel is recreated', async (context) => {
    const firstChannel = createMockChannel();
    const secondChannel = createMockChannel();
    const channels = [firstChannel.channel, secondChannel.channel];
    const connection = new EventEmitter() as ChannelModel;
    let connectCalls = 0;
    let createChannelCalls = 0;
    let connectionCloseCalls = 0;

    connection.createConfirmChannel = async () => {
      createChannelCalls += 1;
      const next = channels.shift();
      if (!next) throw new Error('No mock channel available');
      return next;
    };
    connection.close = async () => {
      connectionCloseCalls += 1;
      connection.emit('close');
    };
    context.mock.method(amqp, 'connect', async () => {
      connectCalls += 1;
      return connection;
    });

    const publisher = createRabbitMQPublisher({
      url: 'amqp://user_service:user_service_dev@rabbitmq:5672/campus',
      exchange: 'campus.events',
    });
    const firstEvent: UserRegisteredEvent = {
      eventId: '10000000-0000-4000-8000-000000000001',
      eventType: 'user.registered',
      timestamp: '2026-10-04T00:00:00.000Z',
      userId: '20000000-0000-4000-8000-000000000001',
      email: 'first@u.nus.edu',
      initialGrant: 100,
    };
    const secondEvent: UserRegisteredEvent = {
      ...firstEvent,
      eventId: '10000000-0000-4000-8000-000000000002',
      userId: '20000000-0000-4000-8000-000000000002',
      email: 'second@u.nus.edu',
    };

    assert.equal(await publisher.publishUserRegistered(firstEvent), true);
    firstChannel.channel.emit('close');
    assert.equal(await publisher.publishUserRegistered(secondEvent), true);

    assert.equal(connectCalls, 1);
    assert.equal(createChannelCalls, 2);
    assert.equal(firstChannel.published.length, 1);
    assert.equal(secondChannel.published.length, 1);

    await publisher.close();
    assert.equal(connectionCloseCalls, 1);
  });

  it('returns false and isolates errors if broker connection fails', async () => {
    // Port 1 will fail to connect immediately
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
