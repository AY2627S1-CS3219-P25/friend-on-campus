/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-28
 * Scope: Fully purged asymmetric JWT keys from configuration. Service uses symmetric SESSION_SECRET exclusively.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import dotenv from 'dotenv';

dotenv.config();

const DEFAULT_PORT = 8001;
const DEFAULT_DATABASE_URL = 'postgresql://postgres:postgres@localhost:5432/user_db';

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
  sessionSecret: string;
  accessTokenLifetimeSeconds: number;
  refreshTokenIdleLifetimeSeconds: number;
  persistentRefreshTokenIdleLifetimeSeconds: number;
  accessTokenIssuer: string;
  accessTokenAudience: string;
  corsOrigin: string;
  secureCookies: boolean;
}

function readSessionSecret(): string {
  const secret = process.env.SESSION_SECRET ?? process.env.JWT_SECRET;
  if (!secret || secret.length < 32) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('SESSION_SECRET must be set and at least 32 characters in production');
    }
    return secret || 'dev-campuserrand-session-secret-key-32-chars-minimum';
  }
  return secret;
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
  port: readPort(process.env.PORT),
  databaseUrl: process.env.DATABASE_URL ?? DEFAULT_DATABASE_URL,
  sessionSecret: readSessionSecret(),
  accessTokenLifetimeSeconds: readDurationSeconds(
    process.env.SESSION_TTL ?? process.env.JWT_ACCESS_TOKEN_TTL,
    '1d',
  ),
  refreshTokenIdleLifetimeSeconds: readDurationSeconds(
    process.env.JWT_REFRESH_TOKEN_TTL,
    '1d',
  ),
  persistentRefreshTokenIdleLifetimeSeconds: readDurationSeconds(
    process.env.PERSISTENT_SESSION_TTL ?? process.env.JWT_PERSISTENT_REFRESH_TOKEN_TTL,
    '30d',
  ),
  accessTokenIssuer: process.env.JWT_ISSUER ?? 'friend-on-campus-user-service',
  accessTokenAudience: process.env.JWT_AUDIENCE ?? 'friend-on-campus-services',
  corsOrigin: process.env.CORS_ORIGIN ?? 'http://localhost:5173',
  secureCookies: nodeEnvironment === 'production',
});
