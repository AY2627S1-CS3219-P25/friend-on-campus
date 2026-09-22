/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Passed the author-approved ADMIN authorization middleware to deferred User Service routes.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import cors from 'cors';
import express, { Request, RequestHandler, Response } from 'express';
import { AuthModule } from './auth/auth-module';
import { createAuthRouter } from './auth/auth-routes';
import { errorHandler } from './http/error-handler';
import { requestLogger } from './http/request-logger';
import { Database } from './persistence/database';
import { createUserRouter } from './users/user-routes';
import { UserModule } from './users/user-module';

export interface AppDependencies {
  auth: AuthModule;
  users: UserModule;
  requireAuthentication: RequestHandler;
  requireAdmin: RequestHandler;
  database: Database;
  corsOrigin: string;
  secureCookies: boolean;
}

export function createApp(dependencies: AppDependencies) {
  const app = express();

  app.use(requestLogger);
  app.use(
    cors({
      origin: dependencies.corsOrigin,
      credentials: true,
    }),
  );
  app.use(express.json());

  app.get('/health', (_req: Request, res: Response) => {
    res.json({ service: 'user-service', status: 'UP' });
  });

  app.get('/ready', async (_req: Request, res: Response) => {
    const ready = await dependencies.database.isReady();
    res.status(ready ? 200 : 503).json({
      service: 'user-service',
      status: ready ? 'READY' : 'NOT_READY',
      dependencies: {
        database: ready ? 'UP' : 'DOWN',
      },
    });
  });

  app.use(
    '/api/auth',
    createAuthRouter(dependencies.auth, { secureCookies: dependencies.secureCookies }),
  );
  app.use(
    '/api/users',
    createUserRouter(
      dependencies.users,
      dependencies.requireAuthentication,
      dependencies.requireAdmin,
    ),
  );

  app.use((_req: Request, res: Response) => {
    res.status(404).json({ success: false, error: 'Route not found' });
  });

  app.use(errorHandler);

  return app;
}
