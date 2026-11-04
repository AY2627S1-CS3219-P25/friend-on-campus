/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-28
 * Scope: Added SoCLaaS LLM gateway configuration for Natural-Language Errand Creation Assistant (F6).
 * Author review: <to be completed by yanhwee>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-19
 * Scope: Set the default delayed retry interval to five seconds.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-6), date: 2026-10-18
 * Scope: Replace synchronous Credit configuration with reservation consumer retry/DLQ settings.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Centralized Order Service environment configuration including database, RabbitMQ, Credit Service URL, Supplier Service URL, and JWT authentication.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({
  path: [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../../.env'),
  ],
});

if (!process.env.DATABASE_URL && process.env.ORDER_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.ORDER_DATABASE_URL;
}

function integer(name: string, fallback: number, minimum: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > 2147483647) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
}

export const config = Object.freeze({
  port: Number(process.env.PORT || process.env.ORDER_SERVICE_PORT || 8003),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://order_svc:order-service-dev@localhost:5432/order_db',
  supplierServiceUrl: process.env.SUPPLIER_SERVICE_URL || 'http://localhost:8002',
  auth: {
    publicKey: process.env.JWT_PUBLIC_KEY ?? '',
    issuer: process.env.JWT_ISSUER ?? 'friend-on-campus-user-service',
    audience: process.env.JWT_AUDIENCE ?? 'friend-on-campus-services',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://order_service:order-service-dev@localhost:5672/campus',
    exchange: process.env.EVENTS_EXCHANGE || 'campus.events',
    queue: 'order-service.events',
    deadLetterExchange: 'order-service.events.dlq',
    deadLetterQueue: 'order-service.events.dlq',
    retryDelayMs: integer('ORDER_RETRY_DELAY_MS', 5000, 1),
    retryLimit: integer('ORDER_RETRY_LIMIT', 5, 0),
    connectionTimeoutMs: integer('RABBITMQ_TIMEOUT_MS', 5000, 1000),
  },
  expirySweeper: {
    intervalMs: integer('EXPIRY_SWEEPER_INTERVAL_MS', 30000, 5000),
  },
  // AI-generated (edited by yanhwee)
  assistant: {
    soclaasBaseUrl: process.env.SOCLAAS_BASE_URL || 'https://soclaas-api.comp.nus.edu.sg/v1',
    soclaasApiKey: process.env.SOCLAAS_API_KEY || '',
    soclaasModel: process.env.SOCLAAS_MODEL || 'default',
  },
});
