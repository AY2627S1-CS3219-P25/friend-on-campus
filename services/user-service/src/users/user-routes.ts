/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-29
 * Scope: Implemented user profile and administration routes with perimeter auth offloaded headers, supporting toggle-status, toggle-role, self-or-admin delete, and aliases.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import {
  NextFunction,
  Request,
  RequestHandler,
  Response,
  Router,
} from 'express';
import { getSessionUser, SessionUser } from '@campus-errand/auth';
import { AuthError } from '../auth/auth-module';
import { UserError, UserModule } from './user-module';

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): RequestHandler {
  return (req: Request, res: Response, next: NextFunction) => {
    handler(req, res).catch(next);
  };
}

function authenticatedUser(req: Request): SessionUser {
  const session = getSessionUser(req);
  if (!session) {
    throw new AuthError('INVALID_SESSION', 'Authentication is required');
  }
  return session;
}

function requireAdmin(req: Request): void {
  const user = authenticatedUser(req);
  if (user.role !== 'ADMIN') {
    throw new UserError('FORBIDDEN', 'Administrator access required');
  }
}

function requireSelfOrAdmin(req: Request): void {
  const user = authenticatedUser(req);
  if (
    user.role === 'ADMIN' ||
    user.userId.toLowerCase() === req.params.id.toLowerCase()
  ) {
    return;
  }
  throw new UserError('FORBIDDEN', 'You can only delete your own account');
}

export function createUserRouter(users: UserModule): Router {
  const router = Router();

  router.get(
    '/me',
    asyncRoute(async (req, res) => {
      const user = await users.getOwnProfile(authenticatedUser(req).userId);
      res.json({ success: true, data: { user } });
    }),
  );

  router.patch(
    '/me',
    asyncRoute(async (req, res) => {
      const user = await users.updateOwnProfile(
        authenticatedUser(req).userId,
        req.body,
      );
      res.json({ success: true, data: { user } });
    }),
  );

  router.put(
    '/me/password',
    asyncRoute(async (req, res) => {
      await users.changePassword(authenticatedUser(req).userId, req.body);
      res.status(204).send();
    }),
  );

  function throwNotImplemented(): never {
    throw new UserError('NOT_IMPLEMENTED', 'User management is not implemented');
  }

  // Admin endpoints (guarded by NGINX gateway perimeter at /api/users)
  router.get(
    '/',
    asyncRoute(async (req, res) => {
      requireAdmin(req);
      const allUsers = await users.listUsers();
      res.json({ success: true, data: { users: allUsers } });
    }),
  );

  router.get('/:id', (req, _res) => {
    requireAdmin(req);
    throwNotImplemented();
  });

  router.post('/:id/promote', (req, _res) => {
    requireAdmin(req);
    throwNotImplemented();
  });

  const handleToggleStatus = asyncRoute(async (req, res) => {
    requireAdmin(req);
    const user = await users.toggleUserStatus(req.params.id);
    res.json({ success: true, data: { user } });
  });

  router.patch('/:id/toggle-status', handleToggleStatus);
  router.patch('/:id/admin', handleToggleStatus);

  router.patch(
    '/:id/toggle-role',
    asyncRoute(async (req, res) => {
      requireAdmin(req);
      const caller = authenticatedUser(req);
      if (req.params.id.toLowerCase() === caller.userId.toLowerCase()) {
        throw new UserError(
          'SELF_ACTION_FORBIDDEN',
          'Admins cannot change their own role',
        );
      }
      const user = await users.toggleUserRole(req.params.id);
      res.json({ success: true, data: { user } });
    }),
  );

  router.delete(
    '/:id',
    asyncRoute(async (req, res) => {
      requireSelfOrAdmin(req);
      await users.deleteUser(req.params.id);
      res.status(204).send();
    }),
  );

  return router;
}
