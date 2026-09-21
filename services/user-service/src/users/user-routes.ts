import { Response, Router } from 'express';

function notImplemented(res: Response, capability: string) {
  return res.status(501).json({
    success: false,
    error: `${capability} is not implemented`,
  });
}

export function createUserRouter(): Router {
  const router = Router();

  router.get('/me', (_req, res) => notImplemented(res, 'Profile retrieval'));
  router.patch('/me', (_req, res) => notImplemented(res, 'Profile update'));
  router.put('/me/password', (_req, res) => notImplemented(res, 'Password change'));

  return router;
}
