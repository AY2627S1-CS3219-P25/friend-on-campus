/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-28
 * Scope: Fully purged asymmetric Ed25519 authentication. Simplified shared middleware to use symmetric HMAC-SHA256 (HS256)
 * session verification and NGINX gateway header offloading.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { createHmac } from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import type { JWTPayload, UserRole } from '@campus-errand/common-dtos';

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

type AuthenticationErrorCode =
  | 'MISSING_TOKEN'
  | 'TOKEN_EXPIRED'
  | 'INVALID_TOKEN';

class AuthenticationError extends Error {
  constructor(public readonly code: AuthenticationErrorCode) {
    super(code);
    this.name = 'AuthenticationError';
  }
}

function parseJsonPart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;
}

function isJwtPayload(value: unknown): value is JWTPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const claims = value as Partial<JWTPayload>;
  return (
    typeof claims.sub === 'string' &&
    claims.sub.length > 0 &&
    typeof claims.sid === 'string' &&
    claims.sid.length > 0 &&
    (claims.role === 'STUDENT' || claims.role === 'ADMIN') &&
    Number.isInteger(claims.iat) &&
    Number.isInteger(claims.exp) &&
    typeof claims.iss === 'string' &&
    typeof claims.aud === 'string'
  );
}

function verifyAccessToken(
  accessToken: string,
  options: {
    secretKey: string;
    issuer: string;
    audience: string;
  },
): AuthenticatedPrincipal {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
      throw new AuthenticationError('INVALID_TOKEN');
    }

    const [headerPart, claimsPart, signaturePart] = parts;
    const header = parseJsonPart<{ alg?: string; typ?: string }>(headerPart);
    if (header.typ !== 'JWT' || header.alg !== 'HS256') {
      throw new AuthenticationError('INVALID_TOKEN');
    }

    const unsignedToken = `${headerPart}.${claimsPart}`;
    const expectedSig = createHmac('sha256', options.secretKey)
      .update(unsignedToken)
      .digest('base64url');
    if (signaturePart !== expectedSig) {
      throw new AuthenticationError('INVALID_TOKEN');
    }

    const claims = parseJsonPart<unknown>(claimsPart);
    if (
      !isJwtPayload(claims) ||
      claims.iss !== options.issuer ||
      claims.aud !== options.audience
    ) {
      throw new AuthenticationError('INVALID_TOKEN');
    }

    const currentUnixTimeSeconds = Math.floor(Date.now() / 1000);
    if (claims.exp <= currentUnixTimeSeconds) {
      throw new AuthenticationError('TOKEN_EXPIRED');
    }
    if (claims.iat > currentUnixTimeSeconds + 60) {
      throw new AuthenticationError('INVALID_TOKEN');
    }

    return {
      userId: claims.sub,
      sessionId: claims.sid,
      role: claims.role,
      email: (claims as Record<string, any>).email,
    };
  } catch (error) {
    if (error instanceof AuthenticationError) {
      throw error;
    }

    throw new AuthenticationError('INVALID_TOKEN');
  }
}

function sendError(
  res: Response,
  status: 401 | 403,
  code: AuthenticationErrorCode | 'ADMIN_REQUIRED',
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

  return (req, res, next) => {
    // 1. Check for NGINX Gateway Offloaded headers
    const gatewayUserId = req.header('x-user-id');
    const gatewayUserRole = req.header('x-user-role') as UserRole | undefined;
    if (gatewayUserId && (gatewayUserRole === 'STUDENT' || gatewayUserRole === 'ADMIN')) {
      res.locals.auth = {
        userId: gatewayUserId,
        sessionId: req.header('x-session-id') ?? '',
        role: gatewayUserRole,
      };
      return next();
    }

    // 2. Direct request fallback: Bearer token or session cookie
    const accessToken =
      readBearerToken(req.header('authorization')) ??
      readCookie(req, 'session');

    if (!accessToken) {
      sendError(res, 401, 'MISSING_TOKEN', 'Authentication is required');
      return;
    }

    try {
      res.locals.auth = verifyAccessToken(accessToken, {
        secretKey,
        issuer,
        audience,
      });
      next();
    } catch (error) {
      if (error instanceof AuthenticationError && error.code === 'TOKEN_EXPIRED') {
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
    sendError(res, 403, 'ADMIN_REQUIRED', 'Admin privileges are required');
    return;
  }

  next();
}

export function authenticatedUserId(res: Response): string {
  const principal = res.locals.auth as AuthenticatedPrincipal | undefined;
  if (!principal) {
    throw new Error('Expected authenticated principal in res.locals.auth');
  }

  return principal.userId;
}
