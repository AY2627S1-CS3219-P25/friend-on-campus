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
/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Sonnet 5), date: 2026-09-28
 * Scope: Added DELETE /:id (account deletion) with a new local requireSelfOrAdmin middleware — allows the
 * request through only if the caller is ADMIN or is deleting their own account (auth.userId === req.params.id),
 * otherwise throws UserError('FORBIDDEN'). Deliberately not added to the shared @campus-errand/auth package,
 * since "does the URL's :id match the caller's own id" is specific to this one route.
 * Author review: (to be completed by author after review)
 */
import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express';
import { AuthError } from '../auth/auth-module';
import { UserError, UserModule } from './user-module';

interface AuthenticatedPrincipal {
  userId?: unknown;
  role?: unknown;
}

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

function requireSelfOrAdmin(req: Request, res: Response, next: NextFunction): void {
  const authenticatedUser = res.locals.auth as AuthenticatedPrincipal | undefined;
  if (typeof authenticatedUser?.userId !== 'string') {
    next(new AuthError('INVALID_SESSION', 'Authentication is required'));
    return;
  }

  if (authenticatedUser.role === 'ADMIN' || authenticatedUser.userId === req.params.id) {
    next();
    return;
  }

  next(new UserError('FORBIDDEN', 'You can only delete your own account'));
}

export function createUserRouter(
  users: UserModule,
  requireAuthentication: RequestHandler,
  requireAdmin: RequestHandler,
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

  function throwNotImplemented(): never {
    throw new UserError('NOT_IMPLEMENTED', 'User management is not implemented');
  }

  // AI-generated (edited by ngkhengyang)
  const notImplemented = (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: 'User administration is not implemented yet',
      code: 'NOT_IMPLEMENTED',
    });
  };

  router.get(
    '/',
    requireAdmin,
    asyncRoute(async (_req, res) => {
      const allUsers = await users.listUsers();
      res.json({ success: true, data: { users: allUsers } });
    }),
  );
  router.post('/:id/promote', requireAdmin, notImplemented);
  router.patch(
    '/:id/admin',
    requireAdmin,
    asyncRoute(async (req, res) => {
      const user = await users.toggleUserStatus(req.params.id);
      res.json({ success: true, data: { user } });
    }),
  );
  router.delete(
    '/:id',
    requireSelfOrAdmin,
    asyncRoute(async (req, res) => {
      await users.deleteUser(req.params.id);
      res.status(204).send();
    }),
  );

  return router;
}
