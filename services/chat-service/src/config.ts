/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1, Claude Sonnet 5.5); Codex (model: GPT-6), date: 2026-10-20 to 2026-11-09
 * Scope: Configuration for the Chat Service, copied from notification-service/src/config.ts with the service's own port (8006), database (chat_db, role chat_svc),..; updated across 5 AI-assisted revisions through D4 wrap-up (added realtime.exchange (RABBITMQ_REALTIME_EXCHANGE, default chat-service.events.realtime) for cross-replica delivery (issue #240)).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
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
    // Dependency outages retry even after the handler-failure limit.
    retryDelayMs: integer('CHAT_RETRY_DELAY_MS', 2000, 1),
    retryLimit: integer('CHAT_RETRY_LIMIT', 30, 0),
  },
  // Cross-replica live delivery (issue #240): a fanout exchange inside the chat_service account's configure/write permissions.
  realtime: {
    exchange: process.env.RABBITMQ_REALTIME_EXCHANGE || 'chat-service.events.realtime',
  },
});
