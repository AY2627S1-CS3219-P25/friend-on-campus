/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1, Claude Sonnet 5.5); Codex (model: GPT-6), date: 2026-10-20 to 2026-11-09
 * Scope: Wiring only, in the shape of notification-service/src/index.ts: store, conversation service with the Order Service fallback, the REST app (/health, /ready,..; updated across 5 AI-assisted revisions through D4 wrap-up (cross-replica delivery wiring (issue #240): fanout publisher, SQL outbox relay, per-replica realtime subscriber feeding createChatDelivery).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import http from 'http';
import { WebSocketServer } from 'ws';
import { authMiddleware } from '@campus-errand/auth';
import { createFanoutPublisher, createOutboxRelay, createSqlOutboxStore, startRealtimeSubscriber, type RealtimeSubscriber } from '@campus-errand/messaging';
import { createApp } from './app';
import { createOrderClient } from './clients/order.client';
import { config } from './config';
import { createConversationService } from './conversations/service';
import { startChatConsumer } from './conversations/events';
import { createConversationStore } from './conversations/store';
import { prisma } from './database/client';
import { createModerator } from './moderation/moderate';
import { createChatDelivery } from './realtime/delivery';
import { createTranslator } from './translation/translate';
import { createChatHub, createSocketAuthenticator } from './ws/hub';

const store = createConversationStore(prisma);
const conversations = createConversationService({ store, orders: createOrderClient(config.orderServiceUrl), translate: createTranslator(config.soclaas), moderate: createModerator(config.soclaas) });
// Cross-replica delivery (issue #240): every committed message leaves a realtime_outbox row; this replica's relay
// publishes rows to the fanout exchange and this replica's subscriber pushes every replica's signals to local sockets.
const publisher = createFanoutPublisher({ url: config.rabbitmq.url, exchange: config.realtime.exchange });
const hub = createChatHub({ authenticate: createSocketAuthenticator(config.auth), send: conversations.send, broadcast: publisher.publish });
const delivery = createChatDelivery({ store, hub });
const relay = createOutboxRelay({ store: createSqlOutboxStore(prisma, 'realtime_outbox'), publish: publisher.publish });
let consumerReady = () => false;
let subscriber: RealtimeSubscriber | undefined;
let stopping = false;
let shutdownPromise: Promise<void> | undefined;

const app = createApp({
  port: config.port,
  isReady: async () => !stopping && consumerReady() && subscriber?.isReady() === true && (await store.ping()),
  status: () => ({
    activeWsClients: hub.connectionCount(),
    rabbitmq: consumerReady() ? 'UP' : 'DOWN',
    realtime: subscriber?.isReady() ? 'UP' : 'DOWN',
  }),
  chat: { service: conversations, authenticate: authMiddleware(config.auth) },
});

// REST and WebSocket share one HTTP server; the gateway forwards /ws/chat/ to its root path.
const server = http.createServer(app);
const sockets = new WebSocketServer({ server });
// A replica without its realtime queue cannot push: refuse the socket (1013, try again later) so the client backs off
// and retries instead of sitting on a connection that misses signals (issue #240).
sockets.on('connection', (ws) => {
  // Before anything else: a socket with no 'error' listener turns one malformed frame into an uncaught exception that
  // ends the process. That includes a socket refused here and one the hub closes at once during shutdown.
  ws.on('error', () => {});
  if (subscriber?.isReady()) hub.handleConnection(ws);
  else ws.close(1013);
});
server.listen(config.port, () => {
  console.log(`[Chat Service] listening on ${config.port}`);
});

const consumerPromise = startChatConsumer(config.rabbitmq, store, () => { void shutdown(true); });
consumerPromise.then(
  (consumer) => { consumerReady = consumer.isReady; },
  (error: Error) => { console.error(error.message); void shutdown(true); },
);

const subscriberPromise = startRealtimeSubscriber({
  url: config.rabbitmq.url,
  exchange: config.realtime.exchange,
  handle: delivery.handle,
  // The replica queue may have dropped signals: clients reconnect and reconcile their threads from REST history.
  onSubscriptionLost: () => hub.disconnectAll(),
});
subscriberPromise.then(
  (started) => { subscriber = started; relay.start(); },
  (error: Error) => { console.error('[Chat Service] Realtime subscriber failed:', error.message); void shutdown(true); },
);

function shutdown(failed = false): Promise<void> {
  if (failed) process.exitCode = 1;
  if (shutdownPromise) return shutdownPromise;
  stopping = true;
  // Bound draining so an unresponsive socket cannot outlive the container's stop grace period.
  const deadline = setTimeout(() => { console.error('[Chat Service] Shutdown timed out'); process.exit(1); }, 10_000);
  deadline.unref();
  const requestsClosed = new Promise<void>((resolve) => server.close(() => resolve()));
  const socketsClosed = new Promise<void>((resolve) => sockets.close(() => resolve()));
  const sendsFinished = hub.close();
  shutdownPromise = (async () => {
    // Stop claiming new intents first; a row this relay has leased is reclaimed by another replica after the lease.
    await relay.stop();
    const started = await subscriberPromise.catch(() => undefined);
    await started?.close();
    const consumer = await consumerPromise.catch(() => undefined);
    await consumer?.close();
    await Promise.all([requestsClosed, socketsClosed, sendsFinished]);
    await publisher.close();
    await prisma.$disconnect();
  })().catch((error: unknown) => {
    console.error('[Chat Service] Shutdown failed:', error instanceof Error ? error.name : 'Unknown error');
    process.exitCode = 1;
  }).finally(() => clearTimeout(deadline));
  return shutdownPromise;
}

process.once('SIGINT', () => { void shutdown(); });
process.once('SIGTERM', () => { void shutdown(); });
server.on('error', (error: Error) => { console.error('[Chat Service] HTTP server failed:', error.message); void shutdown(true); });
