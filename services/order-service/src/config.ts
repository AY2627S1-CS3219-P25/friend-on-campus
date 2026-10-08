/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-07
 * Scope: Centralized Order Service environment configuration including database, RabbitMQ, Credit Service URL, Supplier Service URL, and JWT authentication.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import dotenv from 'dotenv';

dotenv.config();

function integer(name: string, fallback: number, minimum: number): number {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > 2147483647) {
    throw new Error(`Invalid ${name}`);
  }
  return value;
}

export const config = Object.freeze({
  port: Number(process.env.PORT || 8003),
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/order_db',
  creditServiceUrl: process.env.CREDIT_SERVICE_URL || 'http://localhost:8004',
  supplierServiceUrl: process.env.SUPPLIER_SERVICE_URL || 'http://localhost:8002',
  auth: {
    publicKey: process.env.JWT_PUBLIC_KEY ?? '',
    issuer: process.env.JWT_ISSUER ?? 'friend-on-campus-user-service',
    audience: process.env.JWT_AUDIENCE ?? 'friend-on-campus-services',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://order_service:order-service-dev@localhost:5672/campus',
    exchange: process.env.EVENTS_EXCHANGE || 'campus.events',
    connectionTimeoutMs: integer('RABBITMQ_TIMEOUT_MS', 5000, 1000),
  },
  expirySweeper: {
    intervalMs: integer('EXPIRY_SWEEPER_INTERVAL_MS', 30000, 5000),
  },
  outboxRelay: {
    intervalMs: integer('OUTBOX_RELAY_INTERVAL_MS', 2000, 500),
    batchSize: integer('OUTBOX_BATCH_SIZE', 20, 1),
  },
});
