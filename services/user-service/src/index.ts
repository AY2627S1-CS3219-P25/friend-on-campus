import { createApp } from './app';
import { createAuthModule } from './auth/auth-module';
import { createTokenManager } from './auth/tokens';
import { config } from './config';
import { createAuthRepository } from './persistence/auth-repository';
import { createDatabase } from './persistence/database';
import { logError } from './utils/logger';

const database = createDatabase(config.databaseUrl);
const repository = createAuthRepository(database);
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
const app = createApp({
  auth,
  database,
  corsOrigin: config.corsOrigin,
  secureCookies: config.secureCookies,
});

const server = app.listen(config.port);

server.on('error', (error) => {
  logError('http_server_error', error, { port: config.port });
});
