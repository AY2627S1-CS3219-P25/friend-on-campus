/**
 * AI Assistance Disclosure:
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

const app = createApp({
  store,
  authenticate: authMiddleware(config.auth),
  port: config.port,
  isReady: async () => consumerReady() && (await store.ping()),
  status: () => ({ activeWsClients: hub.connectionCount(), rabbitmq: consumerReady() ? 'UP' : 'DOWN' }),
});

// REST and WebSocket share one HTTP server; the gateway forwards /ws/ to its root path.
const server = http.createServer(app);
new WebSocketServer({ server }).on('connection', hub.handleConnection);
server.listen(config.port, () => {
  console.log(`[Notification Service] listening on ${config.port}`);
});

// A broker or channel failure exits the process, and Compose restarts it (restart: unless-stopped).
startNotificationConsumer(
  config.rabbitmq,
  createDeliver(store, hub.push),
  () => { console.error('RabbitMQ consumer failed; exiting for restart'); process.exit(1); },
)
  .then((consumer) => { consumerReady = consumer.isReady; })
  .catch((error: Error) => { console.error(error.message); process.exit(1); });
