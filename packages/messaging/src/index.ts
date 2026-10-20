/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Extracted shared RabbitMQ publisher and native quorum-queue/DLX consumer using rabbitmq-client.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { type ConfirmChannel, type Options } from 'amqplib';
import { Connection, ConsumerStatus } from 'rabbitmq-client';

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
    'x-queue-type': 'quorum' as const,
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
          const onReturn = () => { returned = true; };
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
  const timeout = config.connectionTimeoutMs ?? 5000;
  const connection = new Connection({ url: config.url, connectionTimeout: timeout, acquireTimeout: timeout });
  let consumer: ReturnType<Connection['createConsumer']> | undefined;
  let closing = false;
  let failed = false;
  const abort = new AbortController();

  // Prevent unhandled error event crashes before and after consumer setup.
  connection.on('error', () => {});

  try {
    await connection.onConnect(timeout);
    await connection.exchangeDeclare({ exchange: config.deadLetterExchange, type: 'direct', durable: true });
    await connection.queueDeclare({ queue: config.deadLetterQueue, durable: true });
    await connection.queueBind({
      queue: config.deadLetterQueue,
      exchange: config.deadLetterExchange,
      routingKey: config.deadLetterQueue,
    });

    consumer = connection.createConsumer(
      {
        queue: config.queue,
        queueOptions: { durable: true, arguments: queueArguments(config) },
        qos: { prefetchCount: 1 },
        concurrency: 1,
        exchanges: [{ exchange: config.exchange, type: 'topic', durable: true }],
        queueBindings: handlers.routingKeys.map((routingKey) => ({
          exchange: config.exchange,
          queue: config.queue,
          routingKey,
        })),
      },
      async (msg) => {
        const deliveryCount = Number(msg.headers?.['x-delivery-count'] ?? 0);
        try {
          await handlers.handle(msg.rawBody, msg.routingKey);
          return ConsumerStatus.ACK;
        } catch (error) {
          if (closing || failed) return ConsumerStatus.REQUEUE;
          const failure = handlers.classify(error);
          const retrying =
            failure.category === 'infrastructure' ||
            (failure.category === 'transient' && deliveryCount < config.retryLimit);
          console.error(
            JSON.stringify({
              event: 'rabbitmq_consumer_failure',
              queue: config.queue,
              routingKey: msg.routingKey,
              messageId: msg.messageId,
              category: failure.category,
              reason: failure.reason,
              deliveryCount,
              action: retrying ? 'retry' : 'dlq',
            }),
          );
          if (!retrying) return ConsumerStatus.DROP;
          await delay(config.retryDelayMs, undefined, { signal: abort.signal }).catch(() => {});
          return ConsumerStatus.REQUEUE;
        }
      },
    );

    await once(consumer, 'ready');
    consumer.on('error', () => {});

    const close = async () => {
      if (closing) return;
      closing = true;
      abort.abort();
      await consumer?.close().catch(() => {});
      await connection.close().catch(() => {});
    };

    const fatal = () => {
      if (closing || failed) return;
      failed = true;
      abort.abort();
      void close().finally(() => handlers.onFatal?.());
    };

    connection.on('error', fatal);
    consumer.on('error', fatal);

    return {
      isReady: () => !closing && !failed && connection.ready,
      close,
    };
  } catch (error) {
    closing = true;
    abort.abort();
    consumer?.on('error', () => {});
    await consumer?.close().catch(() => {});
    await connection.close().catch(() => {});
    throw error;
  }
}
