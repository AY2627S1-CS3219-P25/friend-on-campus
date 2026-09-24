/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Replaced the unused shared RabbitMQ credential with Notification Service's dedicated development identity.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import express, { Request, Response } from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import { WebSocketServer, WebSocket } from 'ws';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 8005;
const RABBITMQ_URL = process.env.RABBITMQ_URL || 'amqp://notification_service:notification-service-dev@localhost:5672/campus';

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
