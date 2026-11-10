/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-03 to 2026-11-09
 * Scope: Broker configuration for the Notification Service, mirroring credit-service/src/config.ts on PR #91; updated across 5 AI-assisted revisions through D4 wrap-up (added realtime.exchange (RABBITMQ_REALTIME_EXCHANGE, default notification-service.events.realtime) for cross-replica delivery (issue #241)).
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

if (!process.env.DATABASE_URL && process.env.NOTIFICATION_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.NOTIFICATION_DATABASE_URL;
}

function integer(name: string, fallback: number, minimum: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > 2147483647) throw new Error(`Invalid ${name}`);
  return value;
}

const queue = process.env.NOTIFICATION_QUEUE || 'notification-service.events';
const exchange = process.env.NOTIFICATION_EXCHANGE || 'campus.events';

export const config = Object.freeze({
  port: process.env.PORT || process.env.NOTIFICATION_SERVICE_PORT || 8005,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://notification_svc:notification-service-dev@localhost:5432/notification_db',
  auth: {
    // Validated by authMiddleware during startup, before opening connections.
    publicKey: process.env.JWT_PUBLIC_KEY ?? '',
    issuer: process.env.JWT_ISSUER ?? 'friend-on-campus-user-service',
    audience: process.env.JWT_AUDIENCE ?? 'friend-on-campus-services',
  },
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://notification_service:notification-service-dev@localhost:5672/campus',
    exchange,
    queue,
    deadLetterExchange: process.env.NOTIFICATION_DLX || `${queue}.dlx`,
    deadLetterQueue: process.env.NOTIFICATION_DLQ || `${queue}.dlq`,
    // Connectivity failures (Prisma/PostgreSQL/network codes) retry without limit via the shared classifier; this
    // budget is for unexpected handler errors only, after which the message is dead-lettered for an operator.
    retryDelayMs: integer('NOTIFICATION_RETRY_DELAY_MS', 2000, 1),
    retryLimit: integer('NOTIFICATION_RETRY_LIMIT', 5, 0),
  },
  // Cross-replica live delivery (issue #241): a fanout exchange inside the notification_service account's permissions.
  realtime: {
    exchange: process.env.RABBITMQ_REALTIME_EXCHANGE || 'notification-service.events.realtime',
  },
});
