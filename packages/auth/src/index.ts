/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-28
 * Scope: Refactored shared auth middleware to use industry-standard 'jose' for constant-time cryptographic verification
 * alongside NGINX gateway header offloading.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { jwtVerify } from 'jose';
import type { RequestHandler, Response } from 'express';
import type { UserRole } from '@campus-errand/common-dtos';

export type { UserRole };

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
  role: UserRole;
  email?: string;
}

export interface AuthMiddlewareOptions {
  secretKey?: string;
  issuer?: string;
  audience?: string;
}

function sendError(
  res: Response,
  status: 401 | 403,
  code: 'MISSING_TOKEN' | 'TOKEN_EXPIRED' | 'INVALID_TOKEN' | 'ADMIN_REQUIRED',
  message: string,
): void {
  res.status(status).json({ success: false, error: message, code });
}

function readBearerToken(authorization: string | undefined): string | undefined {
  return authorization?.match(/^Bearer\s+(\S+)$/i)?.[1];
}

function readCookie(req: { headers: { cookie?: string } }, name: string): string | undefined {
  const cookieHeader = req.headers.cookie;
  if (!cookieHeader) {
    return undefined;
  }

  for (const cookie of cookieHeader.split(';')) {
    const separatorIndex = cookie.indexOf('=');
    if (separatorIndex === -1) {
      continue;
    }

    const cookieName = cookie.slice(0, separatorIndex).trim();
    if (cookieName === name) {
      try {
        return decodeURIComponent(cookie.slice(separatorIndex + 1).trim());
      } catch {
        return undefined;
      }
    }
  }

  return undefined;
}

export function authMiddleware(options?: AuthMiddlewareOptions): RequestHandler {
  const issuer = options?.issuer ?? process.env.JWT_ISSUER ?? 'friend-on-campus-user-service';
  const audience = options?.audience ?? process.env.JWT_AUDIENCE ?? 'friend-on-campus-services';
  const secretKey =
    options?.secretKey ??
    process.env.SESSION_SECRET ??
    process.env.JWT_SECRET ??
    'dev-campuserrand-session-secret-key-32-chars-minimum';

  if (process.env.NODE_ENV === 'production' && secretKey.length < 32) {
    throw new Error('SESSION_SECRET must be at least 32 characters in production');
  }

  const encodedSecret = new TextEncoder().encode(secretKey);
  const expectedGatewayKey = process.env.GATEWAY_KEY ?? 'campuserrand-gateway-internal-auth';

  return async (req, res, next) => {
    // 1. Fast Path: NGINX Gateway Offloaded headers
    // Only trust identity headers when verified and forwarded by the API gateway
    const gatewayKey = req.header('x-gateway-key');
    const gatewayUserId = req.header('x-user-id');
    const gatewayUserRole = req.header('x-user-role') as UserRole | undefined;

    if (
      gatewayKey === expectedGatewayKey &&
      gatewayUserId &&
      (gatewayUserRole === 'STUDENT' || gatewayUserRole === 'ADMIN')
    ) {
      res.locals.auth = {
        userId: gatewayUserId,
        sessionId: req.header('x-session-id') ?? '',
        role: gatewayUserRole,
      };
      return next();
    }

    // 2. Direct Fallback Path (jose verification)
    const token = readBearerToken(req.header('authorization')) ?? readCookie(req, 'session');
    if (!token) {
      sendError(res, 401, 'MISSING_TOKEN', 'Authentication is required');
      return;
    }

    try {
      const { payload } = await jwtVerify(token, encodedSecret, {
        issuer,
        audience,
        algorithms: ['HS256'],
      });

      const role = payload.role as UserRole;
      if (typeof payload.sub !== 'string' || (role !== 'STUDENT' && role !== 'ADMIN')) {
        sendError(res, 401, 'INVALID_TOKEN', 'Invalid access token');
        return;
      }

      res.locals.auth = {
        userId: payload.sub,
        sessionId: (payload.sid as string) ?? '',
        role,
        email: payload.email as string | undefined,
      };
      next();
    } catch (err: any) {
      if (err?.code === 'ERR_JWT_EXPIRED') {
        sendError(res, 401, 'TOKEN_EXPIRED', 'Access token has expired');
        return;
      }

      sendError(res, 401, 'INVALID_TOKEN', 'Invalid access token');
    }
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
