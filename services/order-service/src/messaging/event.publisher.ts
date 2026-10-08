/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Refactored confirmed RabbitMQ publisher using extracted channel/publishing handlers and a lightweight factory function.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import amqp, { type ConfirmChannel, type Options } from 'amqplib';
import type {
  OrderCreatedEvent,
  OrderAcceptedEvent,
  OrderInTransitEvent,
  OrderDeliveredEvent,
  OrderCompletedEvent,
  OrderExpiredEvent,
  OrderCancelledEvent,
} from '@campus-errand/common-dtos';

export type OrderLifecycleEvent =
  | OrderCreatedEvent
  | OrderAcceptedEvent
  | OrderInTransitEvent
  | OrderDeliveredEvent
  | OrderCompletedEvent
  | OrderExpiredEvent
  | OrderCancelledEvent;

type AmqpConnection = Awaited<ReturnType<typeof amqp.connect>>;

export interface OrderEventPublisher {
  publishOrderEvent(event: OrderLifecycleEvent): Promise<boolean>;
  close(): Promise<void>;
}

export interface RabbitMQPublisherConfig {
  url: string;
  exchange: string;
  connectionTimeoutMs?: number;
}

type PublishFn = (exchange: string, key: string, content: Buffer, options?: Options.Publish) => Promise<void>;

// ---------------------------------------------------------------------------
// Extracted Confirmed Channel Wrapper
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Extracted Publisher Handlers
// ---------------------------------------------------------------------------

async function handlePublishEvent(
  publishFn: PublishFn | null,
  exchange: string,
  event: OrderLifecycleEvent
): Promise<boolean> {
  if (!publishFn) {
    throw new Error('Publisher channel unavailable');
  }

  const content = Buffer.from(JSON.stringify(event), 'utf8');
  await publishFn(exchange, event.eventType, content, {
    contentType: 'application/json',
    messageId: event.eventId,
  });

  return true;
}

async function handleClosePublisher(
  resources: { channel: ConfirmChannel | null; connection: AmqpConnection | null }
): Promise<void> {
  try {
    if (resources.channel) {
      await resources.channel.close().catch(() => {});
      resources.channel = null;
    }
    if (resources.connection) {
      await resources.connection.close().catch(() => {});
      resources.connection = null;
    }
  } catch (err) {
    console.error('[rabbitmq_close_error]', err);
  }
}

// ---------------------------------------------------------------------------
// Lightweight Factory Function
// ---------------------------------------------------------------------------

export function createRabbitMQPublisher(config: RabbitMQPublisherConfig): OrderEventPublisher {
  let connection: AmqpConnection | null = null;
  let channel: ConfirmChannel | null = null;
  let publishFn: PublishFn | null = null;
  let isClosing = false;
  let connectingPromise: Promise<ConfirmChannel> | null = null;

  async function getChannel(): Promise<ConfirmChannel> {
    if (channel) return channel;
    if (connectingPromise) return connectingPromise;

    connectingPromise = (async () => {
      try {
        let conn = connection;
        if (!conn) {
          conn = await amqp.connect(config.url, {
            timeout: config.connectionTimeoutMs ?? 5000,
          });
          connection = conn;
          conn.on('error', (err) => {
            console.error('[rabbitmq_connection_error]', err);
          });
          conn.on('close', () => {
            if (connection !== conn) return;
            channel = null;
            connection = null;
            publishFn = null;
          });
        }

        const ch = await conn.createConfirmChannel();
        ch.on('error', (err) => {
          console.error('[rabbitmq_channel_error]', err);
          if (channel !== ch) return;
          channel = null;
          publishFn = null;
        });
        ch.on('close', () => {
          if (channel !== ch) return;
          channel = null;
          publishFn = null;
        });

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
    async publishOrderEvent(event: OrderLifecycleEvent): Promise<boolean> {
      if (isClosing) return false;
      try {
        await getChannel();
        return await handlePublishEvent(publishFn, config.exchange, event);
      } catch (error) {
        console.error('[order_event_publish_failed]', error, {
          eventId: event.eventId,
          eventType: event.eventType,
          orderId: event.orderId,
        });
        return false;
      }
    },

    async close(): Promise<void> {
      isClosing = true;
      await handleClosePublisher({ channel, connection });
    },
  };
}
