import { createApp } from './app';
import { createAuthenticationMiddleware } from './auth/auth-middleware';
import { createAuthModule } from './auth/auth-module';
import { createTokenManager } from './auth/tokens';
import { config } from './config';
import { createAuthRepository } from './persistence/auth-repository';
import { createDatabase } from './persistence/database';
import { createSessionRepository } from './persistence/session-repository';
import { createUserRepository } from './persistence/user-repository';
import { logError } from './utils/logger';
import { createUserModule } from './users/user-module';

const database = createDatabase(config.databaseUrl);
const repository = createAuthRepository(database);
const userRepository = createUserRepository(database);
const sessionRepository = createSessionRepository(database);
const tokens = createTokenManager({
  accessTokenSigningSecret: config.accessTokenSigningSecret,
  accessTokenLifetimeSeconds: config.accessTokenLifetimeSeconds,
  accessTokenIssuer: config.accessTokenIssuer,
  accessTokenAudience: config.accessTokenAudience,
});
const auth = createAuthModule({
  repository,
  tokens,
  accessTokenLifetimeSeconds: config.accessTokenLifetimeSeconds,
  refreshTokenIdleLifetimeSeconds: config.refreshTokenIdleLifetimeSeconds,
  persistentRefreshTokenIdleLifetimeSeconds:
    config.persistentRefreshTokenIdleLifetimeSeconds,
});
const users = createUserModule({ repository: userRepository });
const requireAuthentication = createAuthenticationMiddleware({
  tokens,
  sessions: sessionRepository,
});
const app = createApp({
  auth,
  users,
  requireAuthentication,
  database,
  corsOrigin: config.corsOrigin,
  secureCookies: config.secureCookies,
});

const server = app.listen(config.port);

server.on('error', (error) => {
  logError('http_server_error', error, { port: config.port });
});
