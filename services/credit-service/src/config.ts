/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Centralized validated RabbitMQ topology and retry configuration.
 * Author review: <to be completed by Jiaxi>
 */
// AI-generated (edited by Jiaxi)
import dotenv from 'dotenv';

dotenv.config();

function integer(name: string, fallback: number, minimum: number) {
  const value = Number(process.env[name] ?? fallback);
  if (!Number.isSafeInteger(value) || value < minimum || value > 2147483647) throw new Error(`Invalid ${name}`);
  return value;
}
const queue = process.env.CREDIT_QUEUE || 'credit-service.events';
const exchange = process.env.CREDIT_EXCHANGE || 'campus.events';
export const config = Object.freeze({
  port: process.env.PORT || 8004,
  databaseUrl: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/credit_db',
  rabbitmq: {
    url: process.env.RABBITMQ_URL || 'amqp://guest:guest@localhost:5672',
    exchange, queue,
    retryExchange: process.env.CREDIT_RETRY_EXCHANGE || `${queue}.retry`,
    retryQueue: process.env.CREDIT_RETRY_QUEUE || `${queue}.retry`,
    deadLetterExchange: process.env.CREDIT_DLX || `${exchange}.dlx`,
    deadLetterQueue: process.env.CREDIT_DLQ || `${queue}.dlq`,
    retryDelayMs: integer('CREDIT_RETRY_DELAY_MS', 1000, 1),
    retryLimit: integer('CREDIT_RETRY_LIMIT', 5, 0),
  },
});
