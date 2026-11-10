/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1); Codex (model: GPT-6), date: 2026-09-24 to 2026-11-09
 * Scope: Replaced the unused shared RabbitMQ credential with Notification Service's dedicated development identity; updated across 6 AI-assisted revisions through D4 wrap-up (cross-replica delivery wiring (issue #241): fanout publisher, SQL outbox relay, per-replica realtime subscriber feeding createNotificationDelivery;..).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import http from 'http';
import { WebSocketServer } from 'ws';
import { authMiddleware } from '@campus-errand/auth';
import { createFanoutPublisher, createOutboxRelay, createSqlOutboxStore, startRealtimeSubscriber, type RealtimeSubscriber } from '@campus-errand/messaging';
import { createApp } from './app';
import { config } from './config';
import { prisma } from './database/client';
import { createDeliver, startNotificationConsumer } from './notifications/events';
import { createNotificationDelivery } from './notifications/realtime';
import { createNotificationStore } from './notifications/store';
import { createHub, createSocketAuthenticator } from './ws/hub';

const store = createNotificationStore(prisma);
const hub = createHub({ authenticate: createSocketAuthenticator(config.auth), unreadCount: store.unreadCount });
// Cross-replica delivery (issue #241): the consumer commits inbox rows with a notification_realtime_outbox intent; this
// replica's relay publishes intents to the fanout exchange and this replica's subscriber pushes every replica's
// signals (new rows, read-state changes) to the sockets it holds.
const publisher = createFanoutPublisher({ url: config.rabbitmq.url, exchange: config.realtime.exchange });
const delivery = createNotificationDelivery({ store, hub });
const relay = createOutboxRelay({ store: createSqlOutboxStore(prisma, 'notification_realtime_outbox'), publish: publisher.publish });
let consumerReady = () => false;
let subscriber: RealtimeSubscriber | undefined;
let stopping = false;
let shutdownPromise: Promise<void> | undefined;

const app = createApp({
  store,
  authenticate: authMiddleware(config.auth),
  port: config.port,
  isReady: async () => !stopping && consumerReady() && subscriber?.isReady() === true && (await store.ping()),
  status: () => ({
    activeWsClients: hub.connectionCount(),
    rabbitmq: consumerReady() ? 'UP' : 'DOWN',
    realtime: subscriber?.isReady() ? 'UP' : 'DOWN',
  }),
});

// REST and WebSocket share one HTTP server; the gateway forwards /ws/ to its root path.
const server = http.createServer(app);
const sockets = new WebSocketServer({ server });
// A replica without its realtime queue cannot push: refuse the socket (1013, try again later) so the client backs off
// and retries instead of sitting on a connection that misses signals (issue #241).
sockets.on('connection', (ws) => {
  // Before anything else: a socket with no 'error' listener turns one malformed frame into an uncaught exception that
  // ends the process. That includes a socket refused here and one the hub closes at once during shutdown.
  ws.on('error', () => {});
  if (subscriber?.isReady()) hub.handleConnection(ws);
  else ws.close(1013);
});
server.listen(config.port, () => {
  console.log(`[Notification Service] listening on ${config.port}`);
});

const consumerPromise = startNotificationConsumer(
  config.rabbitmq,
  createDeliver(store),
  () => { void shutdown(true); },
);
consumerPromise.then(
  (consumer) => { consumerReady = consumer.isReady; },
  (error: Error) => { console.error(error.message); void shutdown(true); },
);

const subscriberPromise = startRealtimeSubscriber({
  url: config.rabbitmq.url,
  exchange: config.realtime.exchange,
  handle: delivery.handle,
  // The replica queue may have dropped signals: clients reconnect and refresh their inbox from REST.
  onSubscriptionLost: () => hub.disconnectAll(),
});
subscriberPromise.then(
  (started) => { subscriber = started; relay.start(); },
  (error: Error) => { console.error('[Notification Service] Realtime subscriber failed:', error.message); void shutdown(true); },
);

function shutdown(failed = false): Promise<void> {
  if (failed) process.exitCode = 1;
  if (shutdownPromise) return shutdownPromise;
  stopping = true;
  // Bound draining so an unresponsive socket cannot outlive the container's stop grace period.
  const deadline = setTimeout(() => { console.error('[Notification Service] Shutdown timed out'); process.exit(1); }, 10_000);
  deadline.unref();
  const requestsClosed = new Promise<void>((resolve) => server.close(() => resolve()));
  const socketsClosed = new Promise<void>((resolve) => sockets.close(() => resolve()));
  hub.close();
  shutdownPromise = (async () => {
    // Stop claiming new intents first; a row this relay has leased is reclaimed by another replica after the lease.
    await relay.stop();
    const started = await subscriberPromise.catch(() => undefined);
    await started?.close();
    const consumer = await consumerPromise.catch(() => undefined);
    await consumer?.close();
    await Promise.all([requestsClosed, socketsClosed]);
    await publisher.close();
    await prisma.$disconnect();
  })().catch((error: unknown) => {
    console.error('[Notification Service] Shutdown failed:', error instanceof Error ? error.name : 'Unknown error');
    process.exitCode = 1;
  }).finally(() => clearTimeout(deadline));
  return shutdownPromise;
}

process.once('SIGINT', () => { void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });
server.on('error', (error: Error) => { console.error('[Notification Service] HTTP server failed:', error.message); void shutdown(true); });
