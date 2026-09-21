import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express';
import { AuthError } from '../auth/auth-module';
import { UserModule } from './user-module';

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

function authenticatedUserId(res: Response): string {
  const authenticatedUser = res.locals.auth as
    | { userId?: unknown }
    | undefined;
  if (typeof authenticatedUser?.userId !== 'string') {
    throw new AuthError('INVALID_SESSION', 'Authentication is required');
  }

  return authenticatedUser.userId;
}

export function createUserRouter(
  users: UserModule,
  requireAuthentication: RequestHandler,
): Router {
  const router = Router();

  router.use(requireAuthentication);

  router.get(
    '/me',
    asyncRoute(async (_req, res) => {
      const user = await users.getOwnProfile(authenticatedUserId(res));
      res.json({ success: true, data: { user } });
    }),
  );

  router.patch(
    '/me',
    asyncRoute(async (req, res) => {
      const user = await users.updateOwnProfile(authenticatedUserId(res), req.body);
      res.json({ success: true, data: { user } });
    }),
  );

  router.put(
    '/me/password',
    asyncRoute(async (req, res) => {
      await users.changePassword(authenticatedUserId(res), req.body);
      res.status(204).send();
    }),
  );

  return router;
}
