/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-10-03
 * Scope: Wired RabbitMQ publisher into authentication module and added graceful shutdown handlers.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented User Service startup, dependency wiring, middleware initialization, and route registration.
 * Author review: <to be completed by ngkhengyang>
 *
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Integrated ADMIN authorization middleware into the User Service route pipeline.
 * Author review: <to be completed by ngkhengyang>
 */


// AI-generated (edited by ngkhengyang)
import { authMiddleware, requireAdmin } from '@campus-errand/auth';
import { createApp } from './app';
import { createAuthModule } from './auth/auth-module';
import { createTokenManager } from './auth/tokens';
import { config } from './config';
import { prisma } from './database/client';
import { createRabbitMQPublisher } from './messaging/publisher';
import { createAuthRepository } from './persistence/auth-repository';
import { createDatabase } from './persistence/database';
import { createUserRepository } from './persistence/user-repository';
import { logError } from './utils/logger';
import { createUserModule } from './users/user-module';

const database = createDatabase(prisma);
const repository = createAuthRepository(prisma);
const userRepository = createUserRepository(prisma);
const publisher = createRabbitMQPublisher({
  url: config.rabbitmqUrl,
  exchange: config.eventsExchange,
});
const tokens = createTokenManager({
  accessTokenPrivateKey: config.accessTokenPrivateKey,
  accessTokenLifetimeSeconds: config.accessTokenLifetimeSeconds,
  accessTokenIssuer: config.accessTokenIssuer,
  accessTokenAudience: config.accessTokenAudience,
});
const auth = createAuthModule({
  repository,
  tokens,
  publisher,
  accessTokenLifetimeSeconds: config.accessTokenLifetimeSeconds,
  refreshTokenIdleLifetimeSeconds: config.refreshTokenIdleLifetimeSeconds,
  persistentRefreshTokenIdleLifetimeSeconds:
    config.persistentRefreshTokenIdleLifetimeSeconds,
});
const users = createUserModule({ repository: userRepository });
const requireAuthentication = authMiddleware({
  publicKey: config.accessTokenPublicKey,
  issuer: config.accessTokenIssuer,
  audience: config.accessTokenAudience,
});
const app = createApp({
  auth,
  users,
  requireAuthentication,
  requireAdmin,
  database,
  corsOrigin: config.corsOrigin,
  secureCookies: config.secureCookies,
});

const server = app.listen(config.port);

server.on('error', (error) => {
  logError('http_server_error', error, { port: config.port });
});

async function shutdown(): Promise<void> {
  await publisher.close().catch(() => {});
  await database.close().catch(() => {});
  server.close();
}

process.once('SIGINT', () => void shutdown());
process.once('SIGTERM', () => void shutdown());
