/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-23
 * Scope: Implemented shared Ed25519 JWT verification middleware, standardized shared JWT claims, and admin-authentication helpers.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { createPublicKey, verify } from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import type { RequestHandler, Response } from 'express';
import type { JWTPayload } from '@campus-errand/common-dtos';

const JWT_HEADER = Object.freeze({ alg: 'EdDSA', typ: 'JWT' });

export type UserRole = 'STUDENT' | 'ADMIN';

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
  role: UserRole;
}

export interface AuthMiddlewareOptions {
  publicKey: string;
  issuer: string;
  audience: string;
}

type JwtAccessTokenClaims = JWTPayload;

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

function isJwtAccessTokenClaims(value: unknown): value is JwtAccessTokenClaims {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const claims = value as Partial<JwtAccessTokenClaims>;
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

function readPublicKey(encodedKey: string): KeyObject {
  if (encodedKey.length !== 59 || !/^[A-Za-z0-9_-]+$/.test(encodedKey)) {
    throw new Error('JWT public key must be a 59-character Base64URL string');
  }

  const key = createPublicKey({
    key: Buffer.from(encodedKey, 'base64url'),
    format: 'der',
    type: 'spki',
  });
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error('JWT public key must be an Ed25519 key');
  }

  return key;
}

function verifyAccessToken(
  accessToken: string,
  publicKey: KeyObject,
  options: AuthMiddlewareOptions,
): AuthenticatedPrincipal {
  try {
    const parts = accessToken.split('.');
    if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
      throw new AuthenticationError('INVALID_TOKEN');
    }

    const [headerPart, claimsPart, signaturePart] = parts;
    const header = parseJsonPart<{ alg?: string; typ?: string }>(headerPart);
    if (header.alg !== JWT_HEADER.alg || header.typ !== JWT_HEADER.typ) {
      throw new AuthenticationError('INVALID_TOKEN');
    }

    const unsignedToken = `${headerPart}.${claimsPart}`;
    const signature = Buffer.from(signaturePart, 'base64url');
    if (!verify(null, Buffer.from(unsignedToken), publicKey, signature)) {
      throw new AuthenticationError('INVALID_TOKEN');
    }

    const claims = parseJsonPart<unknown>(claimsPart);
    if (
      !isJwtAccessTokenClaims(claims) ||
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

export function authMiddleware(options: AuthMiddlewareOptions): RequestHandler {
  const publicKey = readPublicKey(options.publicKey);

  return (req, res, next) => {
    const accessToken = readBearerToken(req.header('authorization'));
    if (!accessToken) {
      sendError(res, 401, 'MISSING_TOKEN', 'Authentication is required');
      return;
    }

    try {
      res.locals.auth = verifyAccessToken(accessToken, publicKey, options);
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

export const requireAdmin: RequestHandler = (_req, res, next) => {
  const principal = res.locals.auth as AuthenticatedPrincipal | undefined;
  if (!principal) {
    sendError(res, 401, 'MISSING_TOKEN', 'Authentication is required');
    return;
  }
  if (principal.role !== 'ADMIN') {
    sendError(res, 403, 'ADMIN_REQUIRED', 'Administrator access is required');
    return;
  }

  next();
};
