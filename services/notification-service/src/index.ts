/**
 * AI Assistance Disclosure:
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
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';
import { config } from './config';
import { startNotificationConsumer } from './notifications/events';

dotenv.config();

const app = express();
const PORT = config.port;
let consumerReady = () => false;

app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

// Set of connected active WebSocket clients
const clients = new Set<WebSocket>();

wss.on('connection', (ws: WebSocket) => {
  clients.add(ws);
  console.log(`📡 [WS Service] Client connected. Total active connections: ${clients.size}`);

  // Send initial welcome
  ws.send(
    JSON.stringify({
      type: 'CONNECTION_ACK',
      message: 'Connected to NUS CampusErrand Real-Time Hub',
      timestamp: new Date().toISOString(),
    })
  );

  ws.on('message', (data: string) => {
    try {
      const payload = JSON.parse(data.toString());
      console.log('📩 [WS Message Received]:', payload);

      // Echo / Broadcast to all clients for live chat & feed testing
      const broadcastMsg = JSON.stringify({
        ...payload,
        broadcastedAt: new Date().toISOString(),
      });

      for (const client of clients) {
        if (client.readyState === WebSocket.OPEN) {
          client.send(broadcastMsg);
        }
      }
    } catch (e) {
      console.error('Invalid WS payload received');
    }
  });

  ws.on('close', () => {
    clients.delete(ws);
    console.log(`🔌 [WS Service] Client disconnected. Total active: ${clients.size}`);
  });
});

// Health Check
app.get('/health', (_req: Request, res: Response) => {
  res.json({
    service: 'notification-service',
    status: 'UP',
    port: PORT,
    activeWsClients: clients.size,
    rabbitmq: consumerReady() ? 'UP' : 'DOWN',
    timestamp: new Date(),
  });
});

// Trigger broadcast test
app.post('/api/notifications/broadcast', (req: Request, res: Response) => {
  const { title, message } = req.body;
  const payload = JSON.stringify({
    type: 'SYSTEM_BROADCAST',
    title: title || 'Campus Announcement',
    message: message || 'Live errand update',
    timestamp: new Date().toISOString(),
  });

  for (const client of clients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(payload);
    }
  }

  res.json({ success: true, broadcastedTo: clients.size });
});

server.listen(PORT, () => {
  console.log(`🚀 [Notification & WS Service] running on port ${PORT} with tsx`);
});

// Broker failure exits so Compose restarts the process, same as credit-service.
startNotificationConsumer(
  config.rabbitmq,
  async (event, draft) => {
    console.log(JSON.stringify({ service: 'notification-service', action: 'notify', eventId: event.eventId, userId: event.requesterId, kind: draft.kind }));
  },
  () => { console.error('RabbitMQ consumer failed; exiting for restart'); process.exit(1); },
)
  .then((consumer) => { consumerReady = consumer.isReady; })
  .catch((error: Error) => { console.error(error.message); process.exit(1); });
