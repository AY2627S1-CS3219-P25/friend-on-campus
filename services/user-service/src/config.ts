/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-10-21
 * Scope: Remove application RabbitMQ publisher settings now owned by the Debezium relay.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Google Antigravity, date: 2026-10-20
 * Scope: Converted accessTokenPrivateKey and accessTokenPublicKey to lazy property getters on config so DB-only scripts and tests can read config.databaseUrl without requiring JWT keys in process.env.
 * Author review: <to be completed by author after review>
 *
 * Tool: Google Antigravity Agent, date: 2026-10-03
 * Scope: Added RabbitMQ URL and exchange configuration for user registration event publishing.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented User Service environment loading and runtime configuration for the database, JWT, CORS, and service settings.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by yanhwee)
// AI-generated (edited by ngkhengyang)
import path from 'node:path';
import dotenv from 'dotenv';

dotenv.config({
  path: [
    path.resolve(__dirname, '../.env'),
    path.resolve(__dirname, '../../../.env'),
  ],
});

if (!process.env.DATABASE_URL && process.env.USER_DATABASE_URL) {
  process.env.DATABASE_URL = process.env.USER_DATABASE_URL;
}

const DEFAULT_PORT = 8001;
const DEFAULT_DATABASE_URL = 'postgresql://user_svc:user-service-dev@localhost:5432/user_db';

function readPort(value: string | undefined): number {
  if (value === undefined) {
    return DEFAULT_PORT;
  }

  const port = Number(value);
  if (!Number.isInteger(port) || port <= 0 || port > 65_535) {
    throw new Error('PORT must be an integer between 1 and 65535');
  }

  return port;
}

export interface AppConfig {
  port: number;
  databaseUrl: string;
  accessTokenPrivateKey: string;
  accessTokenPublicKey: string;
  accessTokenLifetimeSeconds: number;
  refreshTokenIdleLifetimeSeconds: number;
  persistentRefreshTokenIdleLifetimeSeconds: number;
  accessTokenIssuer: string;
  accessTokenAudience: string;
  corsOrigin: string;
  secureCookies: boolean;
}

function readRequiredKey(name: 'JWT_PRIVATE_KEY' | 'JWT_PUBLIC_KEY'): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`${name} is required`);
  }

  return value;
}

function readDurationSeconds(value: string | undefined, fallback: string): number {
  const duration = value ?? fallback;
  const match = /^(\d+)(s|m|h|d)$/.exec(duration);
  if (!match) {
    throw new Error(`Invalid duration: ${duration}`);
  }

  const amount = Number(match[1]);
  const multiplier = {
    s: 1,
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60,
  }[match[2]];

  if (!Number.isSafeInteger(amount) || amount <= 0 || multiplier === undefined) {
    throw new Error(`Invalid duration: ${duration}`);
  }

  return amount * multiplier;
}

const nodeEnvironment = process.env.NODE_ENV ?? 'development';

export const config: AppConfig = Object.freeze({
  port: readPort(process.env.PORT ?? process.env.USER_SERVICE_PORT),
  databaseUrl: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  get accessTokenPrivateKey(): string {
    return readRequiredKey('JWT_PRIVATE_KEY');
  },
  get accessTokenPublicKey(): string {
    return readRequiredKey('JWT_PUBLIC_KEY');
  },
  accessTokenLifetimeSeconds: readDurationSeconds(process.env.JWT_ACCESS_TOKEN_TTL, '15m'),
  refreshTokenIdleLifetimeSeconds: readDurationSeconds(
    process.env.JWT_REFRESH_TOKEN_TTL,
    '1d',
  ),
  persistentRefreshTokenIdleLifetimeSeconds: readDurationSeconds(
    process.env.JWT_PERSISTENT_REFRESH_TOKEN_TTL,
    '30d',
  ),
  accessTokenIssuer: process.env.JWT_ISSUER ?? 'friend-on-campus-user-service',
  accessTokenAudience: process.env.JWT_AUDIENCE ?? 'friend-on-campus-services',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  secureCookies: nodeEnvironment === 'production',
});
