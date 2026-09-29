/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-29
 * Scope: Simplified auth middleware for security perimeter model: downstream services trust gateway-offloaded identity headers (X-User-Id, X-User-Role). Removed cryptographic fallback and bearer token parsing.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import type { RequestHandler, Response } from 'express';
import type { UserRole } from '@campus-errand/common-dtos';

export type { UserRole };

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
  role: UserRole;
  email?: string;
}

function sendError(
  res: Response,
  status: 401 | 403,
  code: 'MISSING_TOKEN' | 'ADMIN_REQUIRED',
  message: string,
): void {
  res.status(status).json({ success: false, error: message, code });
}

export function authMiddleware(): RequestHandler {
  return (req, res, next) => {
    const userId = req.header('x-user-id');
    const role = req.header('x-user-role') as UserRole | undefined;

    if (userId && (role === 'STUDENT' || role === 'ADMIN')) {
      res.locals.auth = {
        userId,
        sessionId: req.header('x-session-id') ?? '',
        role,
        email: req.header('x-user-email') ?? undefined,
      };
      return next();
    }

    sendError(res, 401, 'MISSING_TOKEN', 'Authentication is required');
  };
}

export function requireAdmin(
  _req: Parameters<RequestHandler>[0],
  res: Parameters<RequestHandler>[1],
  next: Parameters<RequestHandler>[2],
): void {
  const principal = res.locals.auth as AuthenticatedPrincipal | undefined;
  if (!principal) {
    sendError(res, 401, 'MISSING_TOKEN', 'Authentication is required');
    return;
  }

  if (principal.role !== 'ADMIN') {
    sendError(res, 403, 'ADMIN_REQUIRED', 'Administrator access required');
    return;
  }

  next();
}
