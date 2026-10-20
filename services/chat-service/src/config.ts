/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Configuration for the Chat Service, copied from notification-service/src/config.ts with the service's own
 * port (8006), database (chat_db, role chat_svc), broker account (chat_service) and queue names (chat-service.events*).
 * Retry defaults are the Notification Service's (2 s x 30).
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import dotenv from 'dotenv';

dotenv.config();

function integer(name: string, fallback: number, minimum: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > 2147483647) throw new Error(`Invalid ${name}`);
  return value;
}

const queue = process.env.CHAT_QUEUE || 'chat-service.events';
const exchange = process.env.CHAT_EXCHANGE || 'campus.events';

export const config = Object.freeze({
  port: process.env.PORT || 8006,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://chat_svc:chat-service-dev@localhost:5432/chat_db',
  // The Order Service fallback (F8 brief, D2 and S4).
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:8003',
  auth: {
    // Validated by authMiddleware during startup, before opening connections.
    publicKey: process.env.JWT_PUBLIC_KEY ?? '',
    issuer: process.env.JWT_ISSUER ?? 'friend-on-campus-user-service',
    audience: process.env.JWT_AUDIENCE ?? 'friend-on-campus-services',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://chat_service:chat-service-dev@localhost:5672/campus',
    exchange,
    queue,
    retryExchange: process.env.CHAT_RETRY_EXCHANGE || `${queue}.retry`,
    retryQueue: process.env.CHAT_RETRY_QUEUE || `${queue}.retry`,
    deadLetterExchange: process.env.CHAT_DLX || `${queue}.dlx`,
    deadLetterQueue: process.env.CHAT_DLQ || `${queue}.dlq`,
    retryDelayMs: integer('CHAT_RETRY_DELAY_MS', 2000, 1),
    retryLimit: integer('CHAT_RETRY_LIMIT', 30, 0),
  },
});
