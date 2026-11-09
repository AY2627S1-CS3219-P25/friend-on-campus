/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-09
 * Scope: Wire opt-in observability without changing business behavior.
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-6), date: 2026-11-08
 * Scope: Gracefully drain HTTP, WebSockets, the consumer and Prisma on signals or broker failure, including startup races.
 * Author review: <to be completed by the author>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-22
 * Scope: createDeliver receives the hub (push and inboxChanged) and the app gets hub.inboxChanged for read changes.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Rewritten as wiring only, per the author's Notification Service Design: store, WebSocket hub, REST app and
 * consumer. The unauthenticated echo handler and POST /api/notifications/broadcast of the starter stub are removed.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Replaced the unused shared RabbitMQ credential with Notification Service's dedicated development identity.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-03
 * Scope: Started the RabbitMQ consumer copied from PR #91 (src/messaging, src/notifications/events) at boot, exposed its
 * readiness on /health, and moved PORT/RABBITMQ_URL into src/config.ts. Delivery is a log line until the store and socket hub exist.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by huangjiaxi1111, Reallyeasy1)
import { observeSocket } from '@campus-errand/observability';
import '@campus-errand/observability/bootstrap';
import http from 'http';
import { WebSocketServer } from 'ws';
import { authMiddleware } from '@campus-errand/auth';
import { createApp } from './app';
import { config } from './config';
import { prisma } from './database/client';
import { createDeliver, startNotificationConsumer } from './notifications/events';
import { createNotificationStore } from './notifications/store';
import { createHub, createSocketAuthenticator } from './ws/hub';

const store = createNotificationStore(prisma);
const hub = createHub({ authenticate: createSocketAuthenticator(config.auth), unreadCount: store.unreadCount });
let consumerReady = () => false;
// AI-generated (edited by ngkhengyang)
let stopping = false;
let shutdownPromise: Promise<void> | undefined;

const app = createApp({
  store,
  authenticate: authMiddleware(config.auth),
  port: config.port,
  isReady: async () => !stopping && consumerReady() && (await store.ping()),
  status: () => ({ activeWsClients: hub.connectionCount(), rabbitmq: consumerReady() ? 'UP' : 'DOWN' }),
  onInboxChanged: hub.inboxChanged,
});

// REST and WebSocket share one HTTP server; the gateway forwards /ws/ to its root path.
const server = http.createServer(app);
const sockets = new WebSocketServer({ server });
sockets.on('connection', (socket) => { observeSocket(socket, 'notification'); hub.handleConnection(socket); });
server.listen(config.port, () => {
  console.log(`[Notification Service] listening on ${config.port}`);
});

// AI-generated (edited by ngkhengyang)
const consumerPromise = startNotificationConsumer(
  config.rabbitmq,
  createDeliver(store, hub),
  () => { void shutdown(true); },
);
consumerPromise.then(
  (consumer) => { consumerReady = consumer.isReady; },
  (error: Error) => { console.error(error.message); void shutdown(true); },
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
    const consumer = await consumerPromise.catch(() => undefined);
    await consumer?.close();
    await Promise.all([requestsClosed, socketsClosed]);
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
