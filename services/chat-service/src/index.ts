/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Wiring only, in the shape of notification-service/src/index.ts: store, conversation service with the Order
 * Service fallback, the REST app (/health, /ready, /api/chat), the chat socket hub on the same HTTP server (the
 * gateway forwards /ws/chat/ to its root path), and the consumer projecting order events onto conversations.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
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
import { createChatHub, createSocketAuthenticator } from './ws/hub';

const store = createConversationStore(prisma);
const conversations = createConversationService({ store, orders: createOrderClient(config.orderServiceUrl) });
const hub = createChatHub({ authenticate: createSocketAuthenticator(config.auth), send: conversations.send });
let consumerReady = () => false;

const app = createApp({
  port: config.port,
  isReady: async () => consumerReady() && (await store.ping()),
  status: () => ({ activeWsClients: hub.connectionCount(), rabbitmq: consumerReady() ? 'UP' : 'DOWN' }),
  chat: { service: conversations, authenticate: authMiddleware(config.auth) },
});

// REST and WebSocket share one HTTP server; the gateway forwards /ws/chat/ to its root path.
const server = http.createServer(app);
new WebSocketServer({ server }).on('connection', hub.handleConnection);
server.listen(config.port, () => {
  console.log(`[Chat Service] listening on ${config.port}`);
});

// A broker or channel failure exits the process, and Compose restarts it (restart: unless-stopped).
startChatConsumer(config.rabbitmq, store, () => { console.error('RabbitMQ consumer failed; exiting for restart'); process.exit(1); })
  .then((consumer) => { consumerReady = consumer.isReady; })
  .catch((error: Error) => { console.error(error.message); process.exit(1); });
