/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1, Sonnet 5); Codex (model: GPT-6, GPT-5.6 Terra), date: 2026-09-22 to 2026-10-04
 * Scope: Implemented authenticated profile routes and structured 501 ADMIN user-management placeholders for the User Service; updated across 7 AI-assisted revisions through D4 wrap-up (a non-UUID :id is answered with 400 INVALID_INPUT by one router.param check instead of reaching Prisma and failing with 500 (UAT A10)).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */





import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express';
import { AuthError } from '../auth/auth-module';
import { AuthRouteOptions, clearRefreshCookie } from '../auth/auth-routes';
import { isUuid } from '../utils/validation';
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

  if (authenticatedUser.role === 'ADMIN' || authenticatedUser.userId === req.params.id.toLowerCase()) {
    next();
    return;
  }

  next(new UserError('FORBIDDEN', 'You can only delete your own account'));
}

export function createUserRouter(
  users: UserModule,
  requireAuthentication: RequestHandler,
  requireAdmin: RequestHandler,
  options: AuthRouteOptions,
): Router {
  const router = Router();

  router.use(requireAuthentication);

  // The id column is a Postgres uuid; any other string makes the query itself fail.
  router.param('id', (_req, _res, next, id) => {
    next(isUuid(id) ? undefined : new UserError('INVALID_INPUT', 'User id must be a UUID'));
  });

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

  router.get(
    '/',
    requireAdmin,
    asyncRoute(async (_req, res) => {
      const allUsers = await users.listUsers();
      res.json({ success: true, data: { users: allUsers } });
    }),
  );
  router.patch(
    '/:id/toggle-status',
    requireAdmin,
    asyncRoute(async (req, res) => {
      const user = await users.toggleUserStatus(req.params.id);
      res.json({ success: true, data: { user } });
    }),
  );
  router.patch(
    '/:id/toggle-role',
    requireAdmin,
    asyncRoute(async (req, res) => {
      if (req.params.id.toLowerCase() === authenticatedUserId(res)) {
        throw new UserError('SELF_ACTION_FORBIDDEN', 'Admins cannot change their own role');
      }
      const user = await users.toggleUserRole(req.params.id);
      res.json({ success: true, data: { user } });
    }),
  );
  router.delete(
    '/:id',
    requireSelfOrAdmin,
    asyncRoute(async (req, res) => {
      await users.deleteUser(req.params.id);
      // Deletion cascades to all sessions; expire this browser's cookie as well.
      if (req.params.id.toLowerCase() === authenticatedUserId(res).toLowerCase()) {
        clearRefreshCookie(res, options.secureCookies);
      }
      res.status(204).send();
    }),
  );

  return router;
}
