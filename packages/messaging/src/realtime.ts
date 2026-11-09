/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-09
 * Scope: Realtime fanout primitives for cross-replica WebSocket delivery (issue #239, wiki "RabbitMQ Cross-Replica
 *        Chat and Notification Delivery"): confirmed fanout publisher, per-replica exclusive-queue subscriber with
 *        bounded handler attempts and a recent-event cache, leased outbox relay with owner-checked completion, and a
 *        loopback implementation for unit tests.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { randomUUID } from 'node:crypto';
import { once } from 'node:events';
import { setTimeout as delay } from 'node:timers/promises';
import { Connection, ConsumerStatus } from 'rabbitmq-client';

/** A signal tells every replica that something committed; the receiving replica re-reads the authoritative row. */
export interface RealtimeSignal {
  /** Stable per logical event, so a redelivered signal is recognised. */
  eventId: string;
  kind: string;
  payload: Record<string, unknown>;
}

export const REALTIME_DEFAULTS = Object.freeze({
  messageTtlMs: 60_000,
  maxQueueLength: 10_000,
  prefetch: 20,
  attempts: 3,
  attemptTimeoutMs: 5_000,
  publishTimeoutMs: 5_000,
  maxReconnectDelayMs: 10_000,
  dedupeSize: 10_000,
  pollMs: 250,
  leaseMs: 30_000,
  failureDelayMs: 1_000,
  batchSize: 20,
});

export type RealtimeLogger = (event: string, detail?: Record<string, unknown>) => void;

const defaultLogger: RealtimeLogger = (event, detail) => {
  console.error(JSON.stringify({ event, ...detail }));
};

/** Insertion-ordered set that forgets its oldest member once `capacity` is exceeded. */
export function createRecentSet(capacity: number) {
  const ids = new Set<string>();
  return {
    has: (id: string) => ids.has(id),
    add(id: string) {
      if (ids.has(id)) return;
      ids.add(id);
      if (ids.size > capacity) ids.delete(ids.values().next().value as string);
    },
    get size() {
      return ids.size;
    },
  };
}

function isSignal(value: unknown): value is RealtimeSignal {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  return typeof candidate.eventId === 'string' && candidate.eventId.length > 0 && candidate.eventId.length <= 128
    && typeof candidate.kind === 'string' && candidate.kind.length > 0 && candidate.kind.length <= 64
    && !!candidate.payload && typeof candidate.payload === 'object' && !Array.isArray(candidate.payload);
}

/**
 * Runs `handle` up to `attempts` times, each bounded by `attemptTimeoutMs` through the AbortSignal it receives.
 * Resolves true when an attempt succeeded, false when every attempt failed or `parent` was aborted.
 */
export async function runWithAttempts(
  handle: (signal: AbortSignal) => Promise<void>,
  options: { attempts: number; attemptTimeoutMs: number; parent?: AbortSignal; onFailure?: (attempt: number, error: unknown) => void },
): Promise<boolean> {
  for (let attempt = 1; attempt <= options.attempts; attempt += 1) {
    if (options.parent?.aborted) return false;
    const controller = new AbortController();
    const onParentAbort = () => controller.abort();
    options.parent?.addEventListener('abort', onParentAbort, { once: true });
    const timer = setTimeout(() => controller.abort(), options.attemptTimeoutMs);
    try {
      await handle(controller.signal);
      return true;
    } catch (error) {
      options.onFailure?.(attempt, error);
    } finally {
      clearTimeout(timer);
      options.parent?.removeEventListener('abort', onParentAbort);
    }
  }
  return false;
}

export interface FanoutPublisher {
  publish(signal: RealtimeSignal): Promise<void>;
  close(): Promise<void>;
}

/**
 * Publishes signals to a durable fanout exchange with publisher confirms. No `mandatory` flag: an exchange with
 * no replica queue bound (every replica restarting) is not an error, the rows stay in PostgreSQL for catch-up.
 */
export function createFanoutPublisher(config: { url: string; exchange: string; connectionTimeoutMs?: number }): FanoutPublisher {
  const timeout = config.connectionTimeoutMs ?? REALTIME_DEFAULTS.publishTimeoutMs;
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

  const publish = (signal: RealtimeSignal) => {
    const attempt = tail.then(async () => {
      if (!connection || !publisher) {
        const conn = new Connection({ url: config.url, connectionTimeout: timeout, acquireTimeout: timeout });
        const fail = once(conn, 'error').then(([err]) => { throw err; });
        fail.catch(() => {});
        conn.on('error', () => {});
        try {
          await Promise.race([conn.onConnect(timeout), fail]);
          await conn.exchangeDeclare({ exchange: config.exchange, type: 'fanout', durable: true });
        } catch (error) {
          await conn.close().catch(() => {});
          throw error;
        }
        connection = conn;
        publisher = conn.createPublisher({ confirm: true, maxAttempts: 1 });
      }
      let timedOut = false;
      const timer = new AbortController();
      const confirmTimeout = delay(timeout, undefined, { signal: timer.signal }).then(() => {
        timedOut = true;
        throw new Error('RabbitMQ realtime publish confirm timed out');
      });
      confirmTimeout.catch(() => {});
      try {
        await Promise.race([
          publisher.send({ exchange: config.exchange, routingKey: '', durable: false, messageId: signal.eventId, contentType: 'application/json' }, signal),
          confirmTimeout,
        ]);
      } catch (error) {
        if (timedOut || !connection?.ready) await close();
        throw error;
      } finally {
        timer.abort();
      }
    });
    tail = attempt.catch(() => {});
    return attempt;
  };

  return { publish, close };
}

export interface RealtimeSubscriberOptions {
  url: string;
  exchange: string;
  /** Re-reads authoritative data and pushes to local sockets; must stop when `signal` aborts. */
  handle: (signal: RealtimeSignal, abort: AbortSignal) => Promise<void>;
  /** The replica queue may be gone: the service should close its sockets so clients reconnect and reconcile. */
  onSubscriptionLost?: () => void;
  log?: RealtimeLogger;
  connectionTimeoutMs?: number;
  attempts?: number;
  attemptTimeoutMs?: number;
  messageTtlMs?: number;
  maxQueueLength?: number;
  prefetch?: number;
  maxReconnectDelayMs?: number;
  dedupeSize?: number;
}

export interface RealtimeSubscriber {
  isReady(): boolean;
  /** The current replica queue name, or undefined while reconnecting. */
  queueName(): string | undefined;
  close(): Promise<void>;
}

/**
 * One exclusive, auto-delete, non-durable queue per running replica, bound to the fanout exchange. Connection loss
 * tears the pair down and starts a fresh queue (new UUID) with back-off, so a broker that has not yet noticed the
 * dead connection never blocks the redeclaration of an exclusive name.
 */
export async function startRealtimeSubscriber(options: RealtimeSubscriberOptions): Promise<RealtimeSubscriber> {
  const log = options.log ?? defaultLogger;
  const timeout = options.connectionTimeoutMs ?? REALTIME_DEFAULTS.publishTimeoutMs;
  const attempts = options.attempts ?? REALTIME_DEFAULTS.attempts;
  const attemptTimeoutMs = options.attemptTimeoutMs ?? REALTIME_DEFAULTS.attemptTimeoutMs;
  const maxReconnectDelayMs = options.maxReconnectDelayMs ?? REALTIME_DEFAULTS.maxReconnectDelayMs;
  const seen = createRecentSet(options.dedupeSize ?? REALTIME_DEFAULTS.dedupeSize);
  const lifetime = new AbortController();
  let closing = false;
  let restarting = false;
  let current: { connection: Connection; consumer: ReturnType<Connection['createConsumer']>; queue: string } | undefined;

  async function teardown(target = current) {
    if (!target) return;
    if (current === target) current = undefined;
    target.consumer.removeAllListeners('error');
    target.connection.removeAllListeners('error');
    target.consumer.on('error', () => {});
    target.connection.on('error', () => {});
    await target.consumer.close().catch(() => {});
    await target.connection.close().catch(() => {});
  }

  async function handleMessage(body: unknown): Promise<ConsumerStatus> {
    if (!isSignal(body)) {
      log('realtime_signal_invalid', { exchange: options.exchange });
      return ConsumerStatus.DROP;
    }
    if (seen.has(body.eventId)) return ConsumerStatus.ACK;
    const handled = await runWithAttempts((abort) => options.handle(body, abort), {
      attempts,
      attemptTimeoutMs,
      parent: lifetime.signal,
      onFailure: (attempt, error) => log('realtime_handler_failure', {
        exchange: options.exchange, kind: body.kind, eventId: body.eventId, attempt,
        reason: error instanceof Error ? error.name : 'unknown',
      }),
    });
    if (handled) seen.add(body.eventId);
    else log('realtime_signal_dropped', { exchange: options.exchange, kind: body.kind, eventId: body.eventId });
    // The replica queue is exclusive to this process: a hint it could not handle is dropped, never requeued. Clients
    // repair from REST history, the durable rows are untouched.
    return ConsumerStatus.ACK;
  }

  async function connectOnce(): Promise<void> {
    const queue = `${options.exchange}.replica.${randomUUID()}`;
    const connection = new Connection({ url: options.url, connectionTimeout: timeout, acquireTimeout: timeout });
    const fail = once(connection, 'error').then(([err]) => { throw err; });
    fail.catch(() => {});
    connection.on('error', () => {});
    let consumer: ReturnType<Connection['createConsumer']> | undefined;
    try {
      await Promise.race([connection.onConnect(timeout), fail]);
      consumer = connection.createConsumer(
        {
          queue,
          queueOptions: {
            exclusive: true,
            autoDelete: true,
            durable: false,
            arguments: {
              'x-queue-type': 'classic',
              'x-message-ttl': options.messageTtlMs ?? REALTIME_DEFAULTS.messageTtlMs,
              'x-max-length': options.maxQueueLength ?? REALTIME_DEFAULTS.maxQueueLength,
              'x-overflow': 'drop-head',
            },
          },
          qos: { prefetchCount: options.prefetch ?? REALTIME_DEFAULTS.prefetch },
          concurrency: 1,
          requeue: false,
          exchanges: [{ exchange: options.exchange, type: 'fanout', durable: true }],
          queueBindings: [{ exchange: options.exchange, queue, routingKey: '' }],
        },
        (msg) => handleMessage(msg.body),
      );
      consumer.on('error', () => {});
      await Promise.race([once(consumer, 'ready'), fail]);
    } catch (error) {
      consumer?.removeAllListeners('error');
      consumer?.on('error', () => {});
      await consumer?.close().catch(() => {});
      await connection.close().catch(() => {});
      throw error;
    }
    const pair = { connection, consumer, queue };
    current = pair;
    const lost = (error: unknown) => { void onLost(pair, error); };
    connection.removeAllListeners('error');
    consumer.removeAllListeners('error');
    connection.on('error', lost);
    consumer.on('error', lost);
  }

  async function onLost(pair: typeof current, error: unknown) {
    if (closing || restarting || current !== pair) return;
    restarting = true;
    log('realtime_subscription_lost', { exchange: options.exchange, reason: error instanceof Error ? error.message : 'unknown' });
    await teardown(pair);
    options.onSubscriptionLost?.();
    let wait = 1_000;
    while (!closing) {
      await delay(wait, undefined, { signal: lifetime.signal }).catch(() => {});
      if (closing) break;
      try {
        await connectOnce();
        log('realtime_subscription_restored', { exchange: options.exchange, queue: current?.queue });
        break;
      } catch (retryError) {
        log('realtime_subscription_retry_failed', { exchange: options.exchange, reason: retryError instanceof Error ? retryError.message : 'unknown' });
        wait = Math.min(wait * 2, maxReconnectDelayMs);
      }
    }
    restarting = false;
  }

  await connectOnce();

  return {
    isReady: () => !closing && current !== undefined && current.connection.ready,
    queueName: () => current?.queue,
    async close() {
      if (closing) return;
      closing = true;
      lifetime.abort();
      await teardown();
    },
  };
}

/** A pending delivery intent as the service store returns it. */
export interface OutboxRow {
  id: string;
  eventId: string;
  kind: string;
  payload: Record<string, unknown>;
  attempts: number;
}

export interface OutboxStore {
  /** Leases up to `limit` rows that are due and unleased (or whose lease expired) to `owner`. */
  claim(owner: string, leaseMs: number, limit: number): Promise<OutboxRow[]>;
  /** Deletes the row only while `owner` still holds it; false means the lease was lost. */
  complete(id: string, owner: string): Promise<boolean>;
  /** Returns the row to the pending state after `delayMs`, only while `owner` still holds it. */
  release(id: string, owner: string, delayMs: number): Promise<boolean>;
}

export interface OutboxRelayOptions {
  store: OutboxStore;
  publish: (signal: RealtimeSignal) => Promise<void>;
  owner?: string;
  pollMs?: number;
  leaseMs?: number;
  failureDelayMs?: number;
  batchSize?: number;
  log?: RealtimeLogger;
}

export interface OutboxRelay {
  readonly owner: string;
  start(): void;
  /** One claim-publish-complete pass; returns how many rows were published and completed. */
  runOnce(): Promise<number>;
  stop(): Promise<void>;
}

/**
 * Claims pending intents under a lease, publishes them and deletes them with an owner check. Any number of relays
 * (one per replica) may run against the same table; an intent whose relay died is reclaimed after its lease expires
 * and published again, so subscribers must treat signals as at-least-once.
 */
export function createOutboxRelay(options: OutboxRelayOptions): OutboxRelay {
  const log = options.log ?? defaultLogger;
  const owner = options.owner ?? randomUUID();
  const pollMs = options.pollMs ?? REALTIME_DEFAULTS.pollMs;
  const leaseMs = options.leaseMs ?? REALTIME_DEFAULTS.leaseMs;
  const failureDelayMs = options.failureDelayMs ?? REALTIME_DEFAULTS.failureDelayMs;
  const batchSize = options.batchSize ?? REALTIME_DEFAULTS.batchSize;
  const lifetime = new AbortController();
  let loop: Promise<void> | undefined;
  let stopping = false;

  async function runOnce(): Promise<number> {
    const rows = await options.store.claim(owner, leaseMs, batchSize);
    let published = 0;
    for (const row of rows) {
      if (stopping) break;
      try {
        await options.publish({ eventId: row.eventId, kind: row.kind, payload: row.payload });
      } catch (error) {
        log('realtime_outbox_publish_failed', { id: row.id, kind: row.kind, attempts: row.attempts + 1, reason: error instanceof Error ? error.message : 'unknown' });
        await options.store.release(row.id, owner, failureDelayMs).catch((releaseError: unknown) => {
          log('realtime_outbox_release_failed', { id: row.id, reason: releaseError instanceof Error ? releaseError.message : 'unknown' });
        });
        continue;
      }
      if (await options.store.complete(row.id, owner)) published += 1;
      else log('realtime_outbox_lease_lost', { id: row.id, kind: row.kind });
    }
    return published;
  }

  async function run() {
    while (!stopping) {
      let count = 0;
      try {
        count = await runOnce();
      } catch (error) {
        log('realtime_outbox_relay_failure', { reason: error instanceof Error ? error.message : 'unknown' });
        await delay(failureDelayMs, undefined, { signal: lifetime.signal }).catch(() => {});
        continue;
      }
      if (count === 0 && !stopping) await delay(pollMs, undefined, { signal: lifetime.signal }).catch(() => {});
    }
  }

  return {
    owner,
    start() {
      if (!loop) loop = run();
    },
    runOnce,
    async stop() {
      stopping = true;
      lifetime.abort();
      await loop;
    },
  };
}

/** In-process stand-in for the broker: publish fans out to every subscribed handler, awaiting each. */
export function createLoopbackRealtime() {
  const handlers = new Set<(signal: RealtimeSignal, abort: AbortSignal) => Promise<void>>();
  return {
    async publish(signal: RealtimeSignal) {
      for (const handler of [...handlers]) await handler(signal, new AbortController().signal);
    },
    subscribe(handler: (signal: RealtimeSignal, abort: AbortSignal) => Promise<void>) {
      handlers.add(handler);
      return () => { handlers.delete(handler); };
    },
    get subscribers() {
      return handlers.size;
    },
  };
}
