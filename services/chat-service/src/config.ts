/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-08
 * Scope: Use native quorum redelivery instead of the retired Chat retry exchange and queue.
 * Author review: <to be completed by the author>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-20
 * Scope: Configuration for the Chat Service, copied from notification-service/src/config.ts with the service's own
 * port (8006), database (chat_db, role chat_svc), broker account (chat_service) and queue names (chat-service.events*).
 * Retry defaults are the Notification Service's (2 s x 30).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-26
 * Scope: Review fix (PR #148, second round): load the service-local and repository-root .env files and honour
 * CHAT_DATABASE_URL and CHAT_SERVICE_PORT, the same way notification-service/src/config.ts does, so `npm run dev`
 * from the root starts Chat with the documented keys.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Sonnet 5.5), date: 2026-11-05
 * Scope: Added the SOCLAAS_* settings for message translation.
 * Author review: <to be completed by the author>
 */
// AI-generated (edited by Reallyeasy1)
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({
  path: [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../../.env'),
  ],
});

if (!process.env.DATABASE_URL && process.env.CHAT_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.CHAT_DATABASE_URL;
}

function integer(name: string, fallback: number, minimum: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > 2147483647) throw new Error(`Invalid ${name}`);
  return value;
}

const queue = process.env.CHAT_QUEUE || 'chat-service.events';
const exchange = process.env.CHAT_EXCHANGE || 'campus.events';

export const config = Object.freeze({
  port: process.env.PORT || process.env.CHAT_SERVICE_PORT || 8006,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://chat_svc:chat-service-dev@localhost:5432/chat_db',
  // The Order Service fallback (F8 brief, D2 and S4).
  orderServiceUrl: process.env.ORDER_SERVICE_URL || 'http://localhost:8003',
  // Translation of chat messages through the shared @campus-errand/llm package (same variables as the Order Service).
  soclaas: {
    baseUrl: process.env.SOCLAAS_BASE_URL || 'https://soclaas-api.comp.nus.edu.sg/v1',
    apiKey: process.env.SOCLAAS_API_KEY || '',
    model: process.env.SOCLAAS_MODEL || 'default',
  },
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
    deadLetterExchange: process.env.CHAT_DLX || `${queue}.dlx`,
    deadLetterQueue: process.env.CHAT_DLQ || `${queue}.dlq`,
    // AI-generated (edited by ngkhengyang): dependency outages retry even after the handler-failure limit.
    retryDelayMs: integer('CHAT_RETRY_DELAY_MS', 2000, 1),
    retryLimit: integer('CHAT_RETRY_LIMIT', 30, 0),
  },
});
