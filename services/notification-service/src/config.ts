/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-06
 * Scope: Retry defaults raised to 30 attempts 2 s apart, so a database restart no longer dead-letters notifications
 * (review finding on PR #111).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-05
 * Scope: Added the database URL and the access-token verification settings (same variables as credit-service).
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-03
 * Scope: Broker configuration for the Notification Service, mirroring credit-service/src/config.ts on PR #91. The dead-letter
 * exchange is service-owned (not the shared campus.events.dlx) because the notification_service broker account may only
 * configure and write its own notification-service.events* resources.
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

const queue = process.env.NOTIFICATION_QUEUE || 'notification-service.events';
const exchange = process.env.NOTIFICATION_EXCHANGE || 'campus.events';

export const config = Object.freeze({
  port: process.env.PORT || 8005,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/notification_db',
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
    retryExchange: process.env.NOTIFICATION_RETRY_EXCHANGE || `${queue}.retry`,
    retryQueue: process.env.NOTIFICATION_RETRY_QUEUE || `${queue}.retry`,
    deadLetterExchange: process.env.NOTIFICATION_DLX || `${queue}.dlx`,
    deadLetterQueue: process.env.NOTIFICATION_DLQ || `${queue}.dlq`,
    // About a minute in total: every insert error counts as transient, and the dead-letter queue is terminal,
    // so the budget has to outlast a database restart.
    retryDelayMs: integer('NOTIFICATION_RETRY_DELAY_MS', 2000, 1),
    retryLimit: integer('NOTIFICATION_RETRY_LIMIT', 30, 0),
  },
});
