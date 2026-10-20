/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Shared RabbitMQ publisher and native quorum-queue/DLX consumer using rabbitmq-client.
 * Author review: <to be completed by yanhwee>
 */
// AI-generated (edited by yanhwee)
import { once } from 'node:events';
import { setImmediate as immediate, setTimeout as delay } from 'node:timers/promises';
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

export interface PublishOptions {
  messageId?: string;
  contentType?: string;
  headers?: Record<string, string>;
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

export function createRabbitPublisher(config: { url: string; connectionTimeoutMs?: number }) {
  const timeout = config.connectionTimeoutMs ?? 5000;
  let connection: Connection | undefined;
  let publisher: ReturnType<Connection['createPublisher']> | undefined;
  let tail: Promise<unknown> = Promise.resolve();

  const close = async () => {
    const pub = publisher;
    const conn = connection;
    publisher = undefined;
    connection = undefined;
    await pub?.close().catch(() => {});
    await conn?.close().catch(() => {});
  };

  const publish = (exchange: string, routingKey: string, body: unknown, options: PublishOptions = {}) => {
    const attempt = tail.then(async () => {
      if (!connection || !publisher) {
        const conn = new Connection({ url: config.url, connectionTimeout: timeout, acquireTimeout: timeout });
        const fail = once(conn, 'error').then(([err]) => { throw err; });
        fail.catch(() => {});
        conn.on('error', () => {});
        try {
          await Promise.race([conn.onConnect(timeout), fail]);
        } catch (error) {
          await conn.close().catch(() => {});
          throw error;
        }
        connection = conn;
        publisher = conn.createPublisher({ confirm: true, maxAttempts: 1 });
      }
      let returned = false;
      const onReturn = () => { returned = true; };
      publisher.once('basic.return', onReturn);
      try {
        await publisher.send({ exchange, routingKey, mandatory: true, durable: true, ...options }, body);
        await immediate();
        if (returned) throw new Error('RabbitMQ message was unroutable');
      } catch (error) {
        if (!connection?.ready) await close();
        throw error;
      } finally {
        publisher?.removeListener('basic.return', onReturn);
      }
    });
    tail = attempt.catch(() => {});
    return attempt;
  };

  return { publish, close };
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

  const fail = once(connection, 'error').then(([err]) => { throw err; });
  fail.catch(() => {});
  connection.on('error', () => {});

  try {
    await Promise.race([connection.onConnect(timeout), fail]);
    await connection.queueDeclare({ queue: config.deadLetterQueue, durable: true });

    consumer = connection.createConsumer(
      {
        queue: config.queue,
        queueOptions: { durable: true, arguments: queueArguments(config) },
        qos: { prefetchCount: 1 },
        concurrency: 1,
        exchanges: [
          { exchange: config.exchange, type: 'topic', durable: true },
          { exchange: config.deadLetterExchange, type: 'direct', durable: true },
        ],
        queueBindings: [
          {
            exchange: config.deadLetterExchange,
            queue: config.deadLetterQueue,
            routingKey: config.deadLetterQueue,
          },
          ...handlers.routingKeys.map((routingKey) => ({
            exchange: config.exchange,
            queue: config.queue,
            routingKey,
          })),
        ],
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
