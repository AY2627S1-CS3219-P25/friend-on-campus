/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Added durable consumption, confirmed forwarding, delayed retries and graceful closure.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import amqp, { type ConfirmChannel, type ConsumeMessage, type Options } from 'amqplib';
import { setTimeout as delay } from 'node:timers/promises';

export type MessagingConfig = {
  url: string; exchange: string; queue: string; retryExchange: string; retryQueue: string;
  deadLetterExchange: string; deadLetterQueue: string; retryDelayMs: number; retryLimit: number;
};
export type Failure = { category: 'permanent' | 'transient'; reason: string };

// Serialize this channel's publications so a mandatory return belongs to exactly one call.
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
      } catch { finish(new Error('Publication failed')); }
    }));
    tail = publish.catch(() => {});
    return publish;
  };
}

export async function startRabbitConsumer(
  config: MessagingConfig,
  options: {
    routingKeys: readonly string[];
    handle: (content: Buffer, routingKey: string) => Promise<void>;
    classify: (error: unknown) => Failure;
    onFatal?: () => void;
  },
) {
  const connection = await amqp.connect(config.url, { timeout: 5000 });
  let ready = false;
  let stopping = false;
  let failed = false;
  let closing: Promise<void> | undefined;
  const abort = new AbortController();
  const pending = new Set<Promise<void>>();
  const channels: amqp.Channel[] = [];
  const tags: { channel: amqp.Channel; tag: string }[] = [];
  const fatal = () => {
    ready = false;
    if (stopping || failed) return;
    failed = true;
    options.onFatal?.();
    // Closing releases unacknowledged messages. Do not hot-loop nack/requeue.
    void close();
  };
  connection.on('error', fatal);
  connection.on('close', fatal);
  connection.on('blocked', () => { ready = false; });
  connection.on('unblocked', () => { if (!failed && !stopping) ready = true; });
  function close(): Promise<void> {
    if (closing) return closing;
    stopping = true;
    ready = false;
    abort.abort();
    closing = (async () => {
      await Promise.allSettled(tags.map(({ channel, tag }) => channel.cancel(tag)));
      await Promise.allSettled([...pending]);
      await Promise.allSettled(channels.map(channel => channel.close()));
      await connection.close().catch(() => {});
    })();
    return closing;
  }
  function track(work: Promise<void>) {
    const task = work.catch(() => fatal()).finally(() => pending.delete(task));
    pending.add(task);
  }
  try {
    const consume = await connection.createChannel();
    channels.push(consume);
    consume.on('error', fatal); consume.on('close', fatal);
    const retry = await connection.createChannel();
    channels.push(retry);
    retry.on('error', fatal); retry.on('close', fatal);
    const publishChannel = await connection.createConfirmChannel();
    channels.push(publishChannel);
    publishChannel.on('error', fatal); publishChannel.on('close', fatal);
    const publish = createConfirmedPublisher(publishChannel);
    await consume.assertExchange(config.exchange, 'topic', { durable: true });
    await consume.assertExchange(config.retryExchange, 'direct', { durable: true });
    await consume.assertExchange(config.deadLetterExchange, 'direct', { durable: true });
    await consume.assertQueue(config.queue, { durable: true });
    await consume.assertQueue(config.retryQueue, { durable: true });
    await consume.assertQueue(config.deadLetterQueue, { durable: true });
    for (const key of options.routingKeys) await consume.bindQueue(config.queue, config.exchange, key);
    await consume.bindQueue(config.retryQueue, config.retryExchange, config.retryQueue);
    await consume.bindQueue(config.deadLetterQueue, config.deadLetterExchange, config.deadLetterQueue);
    await consume.prefetch(1);
    await retry.prefetch(1);

    function metadata(message: ConsumeMessage) {
      const headers = message.properties.headers ?? {};
      const originalKey = headers['x-credit-original-routing-key'];
      const routingKey = typeof originalKey === 'string' ? originalKey : message.fields.routingKey;
      const raw = headers['x-credit-retry-count'];
      const count = Number.isSafeInteger(raw) && raw >= 0 ? raw as number : 0;
      return { headers, routingKey, count };
    }
    function properties(message: ConsumeMessage, headers: Record<string, unknown>): Options.Publish {
      // Expiration from an external producer must not expire forwarded messages.
      const { expiration: _expiration, ...original } = message.properties;
      return { ...original, headers };
    }
    async function process(message: ConsumeMessage) {
      const { headers, routingKey, count } = metadata(message);
      try {
        await options.handle(message.content, routingKey);
      } catch (error) {
        const failure = options.classify(error);
        const retrying = failure.category === 'transient' && count < config.retryLimit;
        let eventId = 'unknown';
        let eventType = /^[a-z0-9_.-]{1,64}$/.test(routingKey) ? routingKey : 'invalid';
        try {
          const body = JSON.parse(message.content.toString('utf8'));
          if (typeof body?.eventId === 'string' && /^[0-9a-f-]{36}$/i.test(body.eventId)) eventId = body.eventId;
          if (typeof body?.eventType === 'string' && /^[a-z0-9_.-]{1,64}$/.test(body.eventType)) eventType = body.eventType;
        } catch { /* Malformed JSON has no event identity. */ }
        console.error(JSON.stringify({ service: 'credit-service', eventId, eventType, retryCount: count,
          failureCategory: failure.category, reason: failure.reason, action: retrying ? 'retry' : 'dead-letter' }));
        await publish(
          retrying ? config.retryExchange : config.deadLetterExchange,
          retrying ? config.retryQueue : config.deadLetterQueue,
          message.content,
          properties(message, {
            ...headers, 'x-credit-original-routing-key': routingKey,
            'x-credit-retry-count': retrying ? count + 1 : count,
            'x-credit-failure-category': failure.category, 'x-credit-failure-reason': failure.reason,
            'x-credit-failed-at': new Date().toISOString(),
            ...(retrying ? { 'x-credit-not-before': Date.now() + config.retryDelayMs } : {}),
          }),
        );
      }
      consume.ack(message);
    }
    async function forwardRetry(message: ConsumeMessage) {
      const { headers } = metadata(message);
      const due = Number(headers['x-credit-not-before']);
      // A durable retry worker forwards with confirms instead of classic-queue TTL dead-lettering.
      try {
        await delay(Math.min(config.retryDelayMs, Math.max(0, Number.isFinite(due) ? due - Date.now() : config.retryDelayMs)), undefined, { signal: abort.signal });
      } catch { return; } // Shutdown: leave delivery unacked for the next worker.
      if (stopping) return;
      // Default exchange targets only this consumer's main queue, avoiding fan-out to other services.
      await publish('', config.queue, message.content, properties(message, headers));
      retry.ack(message);
    }
    const mainTag = await consume.consume(config.queue, message => {
      if (!message) return fatal();
      if (!stopping) track(process(message));
    }, { noAck: false });
    tags.push({ channel: consume, tag: mainTag.consumerTag });
    const retryTag = await retry.consume(config.retryQueue, message => {
      if (!message) return fatal();
      if (!stopping) track(forwardRetry(message));
    }, { noAck: false });
    tags.push({ channel: retry, tag: retryTag.consumerTag });
    if (failed || stopping) throw new Error('RabbitMQ consumer startup failed');
    ready = true;
    return { isReady: () => ready, close };
  } catch {
    await close();
    throw new Error('RabbitMQ consumer startup failed');
  }
}
