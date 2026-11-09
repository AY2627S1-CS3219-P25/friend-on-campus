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
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Wiring only, in the shape of notification-service/src/index.ts: store, conversation service with the Order
 * Service fallback, the REST app (/health, /ready, /api/chat), the chat socket hub on the same HTTP server (the
 * gateway forwards /ws/chat/ to its root path), and the consumer projecting order events onto conversations.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-05
 * Scope: Passed a translator built from the SOCLAAS settings into the conversation service.
 * Author review: <to be completed by the author>
 *
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-07
 * Scope: Passed a moderator built from the SOCLAAS settings into the conversation service.
 * Author review: <to be completed by the author>
 */
// AI-generated (edited by Reallyeasy1)
import { observeSocket } from '@campus-errand/observability';
import '@campus-errand/observability/bootstrap';
import http from 'http';
import { WebSocketServer } from 'ws';
import { authMiddleware } from '@campus-errand/auth';
import { createApp } from './app';
import { createOrderClient } from './clients/order.client';
import { config } from './config';
import { createConversationService } from './conversations/service';
import { startChatConsumer } from './conversations/events';
import { createConversationStore } from './conversations/store';
import { prisma } from './database/client';
import { createModerator } from './moderation/moderate';
import { createTranslator } from './translation/translate';
import { createChatHub, createSocketAuthenticator } from './ws/hub';

const store = createConversationStore(prisma);
const conversations = createConversationService({ store, orders: createOrderClient(config.orderServiceUrl), translate: createTranslator(config.soclaas), moderate: createModerator(config.soclaas) });
const hub = createChatHub({ authenticate: createSocketAuthenticator(config.auth), send: conversations.send });
let consumerReady = () => false;
// AI-generated (edited by ngkhengyang)
let stopping = false;
let shutdownPromise: Promise<void> | undefined;

const app = createApp({
  port: config.port,
  isReady: async () => !stopping && consumerReady() && (await store.ping()),
  status: () => ({ activeWsClients: hub.connectionCount(), rabbitmq: consumerReady() ? 'UP' : 'DOWN' }),
  chat: { service: conversations, authenticate: authMiddleware(config.auth) },
});

// REST and WebSocket share one HTTP server; the gateway forwards /ws/chat/ to its root path.
const server = http.createServer(app);
const sockets = new WebSocketServer({ server });
sockets.on('connection', (socket) => { observeSocket(socket, 'chat'); hub.handleConnection(socket); });
server.listen(config.port, () => {
  console.log(`[Chat Service] listening on ${config.port}`);
});

// AI-generated (edited by ngkhengyang)
const consumerPromise = startChatConsumer(config.rabbitmq, store, () => { void shutdown(true); });
consumerPromise.then(
  (consumer) => { consumerReady = consumer.isReady; },
  (error: Error) => { console.error(error.message); void shutdown(true); },
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
    const consumer = await consumerPromise.catch(() => undefined);
    await consumer?.close();
    await Promise.all([requestsClosed, socketsClosed, sendsFinished]);
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
