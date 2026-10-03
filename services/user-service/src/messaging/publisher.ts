/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-03
 * Scope: Implemented direct confirmed RabbitMQ publisher for user.registered events with error isolation.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-03
 * Scope: Added 5000 ms connection timeout to amqp.connect matching credit-service to prevent unbounded connection stalls.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import amqp, { type ConfirmChannel, type Options } from 'amqplib';
import type { UserRegisteredEvent } from '@campus-errand/common-dtos';
import { logError } from '../utils/logger';

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

export interface UserEventPublisher {
  publishUserRegistered(event: UserRegisteredEvent): Promise<boolean>;
  close(): Promise<void>;
}

export interface RabbitMQPublisherConfig {
  url: string;
  exchange: string;
  connectionTimeoutMs?: number;
}

export function createConfirmedPublisher(channel: ConfirmChannel) {
  let tail: Promise<void> = Promise.resolve();
  return (exchange: string, key: string, content: Buffer, options: Options.Publish = {}) => {
    const publish = tail.then(() => new Promise<void>((resolve, reject) => {
      let returned = false;
      let finished = false;
      const onReturn = () => { returned = true; };
      const onClose = () => finish(new Error('Publisher channel closed'));
      const timer = setTimeout(() => {
        finish(new Error('Publisher confirmation timeout'));
        void channel.close().catch(() => {});
      }, 10000);
      const finish = (error?: Error | null) => {
        if (finished) return;
        finished = true;
        clearTimeout(timer);
        channel.removeListener('return', onReturn);
        channel.removeListener('close', onClose);
        if (error) reject(error);
        else if (returned) reject(new Error('Message was unroutable'));
        else resolve();
      };
      channel.on('return', onReturn);
      channel.once('close', onClose);
      try {
        channel.publish(exchange, key, content, { ...options, persistent: true, mandatory: true }, finish);
      } catch (err) {
        finish(err instanceof Error ? err : new Error('Publication failed'));
      }
    }));
    tail = publish.catch(() => {});
    return publish;
  };
}

export function createRabbitMQPublisher(config: RabbitMQPublisherConfig): UserEventPublisher {
  let connection: AmqpConnection | null = null;
  let channel: ConfirmChannel | null = null;
  let publishFn: ((exchange: string, key: string, content: Buffer, options?: Options.Publish) => Promise<void>) | null = null;
  let isClosing = false;
  let connectingPromise: Promise<ConfirmChannel> | null = null;

  async function getChannel(): Promise<ConfirmChannel> {
    if (channel) return channel;
    if (connectingPromise) return connectingPromise;

    connectingPromise = (async () => {
      try {
        const conn = await amqp.connect(config.url, {
          timeout: config.connectionTimeoutMs ?? 5000,
        });
        conn.on('error', (err) => {
          logError('rabbitmq_connection_error', err);
          channel = null;
          connection = null;
          publishFn = null;
        });
        conn.on('close', () => {
          channel = null;
          connection = null;
          publishFn = null;
        });

        const ch = await conn.createConfirmChannel();
        ch.on('error', (err) => {
          logError('rabbitmq_channel_error', err);
          channel = null;
          publishFn = null;
        });
        ch.on('close', () => {
          channel = null;
          publishFn = null;
        });

        connection = conn;
        channel = ch;
        publishFn = createConfirmedPublisher(ch);
        return ch;
      } finally {
        connectingPromise = null;
      }
    })();

    return connectingPromise;
  }

  return {
    async publishUserRegistered(event: UserRegisteredEvent): Promise<boolean> {
      if (isClosing) return false;
      try {
        await getChannel();
        if (!publishFn) {
          throw new Error('Publisher channel unavailable');
        }
        const content = Buffer.from(JSON.stringify(event), 'utf8');
        await publishFn(config.exchange, event.eventType, content, {
          contentType: 'application/json',
          messageId: event.eventId,
        });
        return true;
      } catch (error) {
        logError('user_registered_publish_failed', error, {
          userId: event.userId,
          eventId: event.eventId,
        });
        return false;
      }
    },

    async close(): Promise<void> {
      isClosing = true;
      try {
        if (channel) {
          await channel.close().catch(() => {});
          channel = null;
        }
        if (connection) {
          await connection.close().catch(() => {});
          connection = null;
        }
        publishFn = null;
      } catch (error) {
        logError('rabbitmq_publisher_close_error', error);
      }
    },
  };
}

export const noopPublisher: UserEventPublisher = {
  async publishUserRegistered() { return true; },
  async close() {},
};
