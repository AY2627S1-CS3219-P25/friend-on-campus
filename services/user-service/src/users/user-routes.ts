/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-28
 * Scope: Restored GET /api/users/:id endpoint returning structured 501 Not Implemented response.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Implemented authenticated profile routes and structured 501 ADMIN user-management placeholders for the User Service.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-23
 * Scope: The deferred ADMIN placeholders now return the service's standard JSON error body with code
 * NOT_IMPLEMENTED instead of an empty 501, so JSON clients (e.g. the admin portal Users page) do not throw.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express';
import { getSessionUser } from '@campus-errand/auth';
import { AuthError } from '../auth/auth-module';
import { UserError, UserModule } from './user-module';

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

function authenticatedUserId(req: Request): string {
  const session = getSessionUser(req);
  if (!session) {
    throw new AuthError('INVALID_SESSION', 'Authentication is required');
  }

  return session.userId;
}

export function createUserRouter(users: UserModule): Router {
  const router = Router();

  router.get(
    '/me',
    asyncRoute(async (req, res) => {
      const user = await users.getOwnProfile(authenticatedUserId(req));
      res.json({ success: true, data: { user } });
    }),
  );

  router.patch(
    '/me',
    asyncRoute(async (req, res) => {
      const user = await users.updateOwnProfile(authenticatedUserId(req), req.body);
      res.json({ success: true, data: { user } });
    }),
  );

  router.put(
    '/me/password',
    asyncRoute(async (req, res) => {
      await users.changePassword(authenticatedUserId(req), req.body);
      res.status(204).send();
    }),
  );

  function throwNotImplemented(): never {
    throw new UserError('NOT_IMPLEMENTED', 'User management is not implemented');
  }


  // Admin endpoints (guarded by NGINX gateway perimeter at /api/users)
  router.get(
    '/',
    asyncRoute(async (_req, res) => {
      const allUsers = await users.listUsers();
      res.json({ success: true, data: { users: allUsers } });
    }),
  );
  router.get('/:id', (_req, _res) => {
    throwNotImplemented();
  });
  router.post('/:id/promote', (_req, _res) => {
    throwNotImplemented();
  });
  router.patch(
    '/:id/admin',
    asyncRoute(async (req, res) => {
      const user = await users.toggleUserStatus(req.params.id);
      res.json({ success: true, data: { user } });
    }),
  );

  return router;
}
