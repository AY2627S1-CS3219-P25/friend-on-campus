/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-03
 * Scope: Unit tests for confirmed RabbitMQ publisher and event delivery error isolation.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import type { ConfirmChannel } from 'amqplib';
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
