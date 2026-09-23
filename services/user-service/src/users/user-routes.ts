/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-22
 * Scope: Added author-approved authenticated ADMIN endpoint placeholders that deliberately return 501.
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

  // AI-generated (edited by ngkhengyang)
  const notImplemented = (_req: Request, res: Response) => {
    res.status(501).json({
      success: false,
      error: 'User administration is not implemented yet',
      code: 'NOT_IMPLEMENTED',
    });
  };

  router.get('/', requireAdmin, notImplemented);
  router.post('/:id/promote', requireAdmin, notImplemented);

  return router;
}
