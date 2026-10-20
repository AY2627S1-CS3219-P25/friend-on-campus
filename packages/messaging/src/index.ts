/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Extracted shared RabbitMQ publisher and native quorum-queue/DLX consumer into @campus-errand/messaging.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import { setTimeout as delay } from 'node:timers/promises';
import amqp, { type Channel, type ConfirmChannel, type ConsumeMessage, type Options } from 'amqplib';

export interface MessagingConfig {
  url: string;
  exchange: string;
  queue: string;
  deadLetterExchange: string;
  deadLetterQueue: string;
  retryDelayMs: number;
  retryLimit: number;
  connectionTimeoutMs?: number;
}

export interface Failure {
  category: 'permanent' | 'transient' | 'infrastructure';
  reason: string;
}

export function queueArguments(config: Pick<MessagingConfig, 'deadLetterExchange' | 'deadLetterQueue'>) {
  return {
    'x-queue-type': 'quorum',
    'x-dead-letter-exchange': config.deadLetterExchange,
    'x-dead-letter-routing-key': config.deadLetterQueue,
  };
}

// Prisma and PostgreSQL connectivity/transient-state codes that indicate infrastructure unavailability.
export function isInfrastructureFailure(error: unknown): boolean {
  const seen = new Set<unknown>();
  let current = error;
  while (current && typeof current === 'object' && !seen.has(current)) {
    seen.add(current);
    const value = current as { code?: unknown; errorCode?: unknown; cause?: unknown; meta?: { code?: unknown } };
    const code = value.code ?? value.errorCode;
    if (
      typeof code === 'string' &&
      [
        'P1001', 'P1002', 'P1008', 'P1017', 'P2024', 'P2034', 'P2037',
        'ECONNREFUSED', 'ECONNRESET', 'EHOSTUNREACH', 'ENETUNREACH', 'EPIPE',
        'ETIMEDOUT', 'EAI_AGAIN', 'ENOTFOUND',
      ].includes(code)
    ) {
      return true;
    }
    const postgres = code === 'P2010' ? value.meta?.code : code;
    if (
      typeof postgres === 'string' &&
      (/^08[0-9A-Z]{3}$/.test(postgres) ||
        ['53300', '57P01', '57P02', '57P03', '40001', '40P01'].includes(postgres))
    ) {
      return true;
    }
    current = value.cause;
  }
  return false;
}

// Serializes mandatory publishes on a confirm channel so an unroutable `return` frame correlates cleanly.
export function createConfirmedPublisher(channel: ConfirmChannel) {
  let tail: Promise<unknown> = Promise.resolve();
  return (exchange: string, key: string, content: Buffer, options: Options.Publish = {}) => {
    const attempt = tail.then(
      () =>
        new Promise<void>((resolve, reject) => {
          let returned = false;
          let settled = false;
          const onReturn = () => {
            returned = true;
          };
          const onClose = () => finish(new Error('RabbitMQ publish channel closed'));
          const timer = setTimeout(() => {
            finish(new Error('RabbitMQ publish confirm timed out'));
            void channel.close().catch(() => {});
          }, 5000);
          const finish = (error?: Error | null) => {
            if (settled) return;
            settled = true;
            clearTimeout(timer);
            channel.removeListener('return', onReturn);
            channel.removeListener('close', onClose);
            if (error) reject(error);
            else if (returned) reject(new Error('RabbitMQ message was unroutable'));
            else resolve();
          };
          channel.on('return', onReturn);
          channel.once('close', onClose);
          try {
            channel.publish(exchange, key, content, { ...options, persistent: true, mandatory: true }, finish);
          } catch {
            finish(new Error('RabbitMQ publish failed'));
          }
        }),
    );
    tail = attempt.catch(() => {});
    return attempt;
  };
}

export async function startRabbitConsumer(
  config: MessagingConfig,
  handlers: {
    routingKeys: readonly string[];
    handle: (content: Buffer, routingKey: string) => Promise<void>;
    classify: (error: unknown) => Failure;
    onFatal?: () => void;
  },
) {
  const connection = await amqp.connect(config.url, { timeout: config.connectionTimeoutMs ?? 5000 });
  let ready = false;
  let closing = false;
  let failed = false;
  let consume: Channel | undefined;
  let consumerTag: string | undefined;
  const abort = new AbortController();
  const pending = new Set<Promise<void>>();

  const fatal = () => {
    ready = false;
    if (closing || failed) return;
    failed = true;
    abort.abort();
    void close().finally(() => handlers.onFatal?.());
  };

  connection.on('error', fatal);
  connection.on('close', fatal);
  connection.on('blocked', () => {
    ready = false;
  });
  connection.on('unblocked', () => {
    if (!failed && !closing) ready = true;
  });

  function track(work: () => Promise<void>) {
    const task = work().finally(() => pending.delete(task));
    pending.add(task);
  }

  async function close() {
    closing = true;
    ready = false;
    abort.abort();
    if (consume && consumerTag) {
      await consume.cancel(consumerTag).catch(() => {});
    }
    await Promise.allSettled([...pending]);
    await consume?.close().catch(() => {});
    await connection.close().catch(() => {});
  }

  try {
    consume = await connection.createChannel();
    consume.on('error', fatal);
    consume.on('close', fatal);
    await consume.prefetch(1);

    await consume.assertExchange(config.exchange, 'topic', { durable: true });
    await consume.assertExchange(config.deadLetterExchange, 'direct', { durable: true });
    await consume.assertQueue(config.deadLetterQueue, { durable: true });
    await consume.bindQueue(config.deadLetterQueue, config.deadLetterExchange, config.deadLetterQueue);

    await consume.assertQueue(config.queue, {
      durable: true,
      arguments: queueArguments(config),
    });
    for (const key of handlers.routingKeys) {
      await consume.bindQueue(config.queue, config.exchange, key);
    }

    const active = consume;
    const subscribed = await active.consume(config.queue, (message: ConsumeMessage | null) => {
      if (!message) {
        fatal();
        return;
      }
      track(async () => {
        const routingKey = message.fields.routingKey;
        const deliveryCount = Number(message.properties.headers?.['x-delivery-count'] ?? 0);
        try {
          await handlers.handle(message.content, routingKey);
          if (!closing && !failed) active.ack(message);
        } catch (error) {
          if (closing || failed) return;
          const failure = handlers.classify(error);
          const retrying =
            failure.category === 'infrastructure' ||
            (failure.category === 'transient' && deliveryCount < config.retryLimit);
          console.error(
            JSON.stringify({
              event: 'rabbitmq_consumer_failure',
              queue: config.queue,
              routingKey,
              messageId: typeof message.properties.messageId === 'string' ? message.properties.messageId : undefined,
              category: failure.category,
              reason: failure.reason,
              deliveryCount,
              action: retrying ? 'retry' : 'dlq',
            }),
          );
          try {
            if (retrying) {
              await delay(config.retryDelayMs, undefined, { signal: abort.signal });
              if (!closing && !failed) active.nack(message, false, true);
            } else {
              active.nack(message, false, false);
            }
          } catch {
            if (!closing) fatal();
          }
        }
      });
    });
    consumerTag = subscribed.consumerTag;
    ready = !failed;
    return { isReady: () => ready && !closing && !failed, close };
  } catch (error) {
    await close();
    throw error;
  }
}
