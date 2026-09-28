/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-28
 * Scope: Fully purged asymmetric Ed25519 signing. TokenManager operates exclusively with symmetric HMAC-SHA256 (HS256)
 * session secret encoding for stateless session tokens.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import {
  createHash,
  createHmac,
  randomBytes,
} from 'node:crypto';
import type { JWTPayload } from '@campus-errand/common-dtos';
import { UserRole } from '../persistence/auth-repository';

const HS256_HEADER = Object.freeze({ alg: 'HS256', typ: 'JWT' });

export interface AuthenticatedPrincipal {
  userId: string;
  sessionId: string;
  role: UserRole;
  email?: string;
}

export interface TokenManager {
  issueAccessToken(
    userId: string,
    sessionId: string,
    role: UserRole,
    email?: string,
    lifetimeSeconds?: number,
  ): string;
  verifyToken(token: string): AuthenticatedPrincipal | null;
  generateRefreshToken(): string;
  hashRefreshToken(refreshToken: string): string;
}

export interface TokenManagerOptions {
  sessionSecret: string;
  accessTokenLifetimeSeconds: number;
  accessTokenIssuer: string;
  accessTokenAudience: string;
}

function encodeJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function parseJsonPart<T>(part: string): T {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8')) as T;
}

export function createTokenManager(options: TokenManagerOptions): TokenManager {
  const sessionSecret = options.sessionSecret;

  return {
    issueAccessToken(userId, sessionId, role, email, lifetimeSeconds) {
      const currentUnixTimeSeconds = Math.floor(Date.now() / 1000);
      const lifetime = lifetimeSeconds ?? options.accessTokenLifetimeSeconds;
      const claims: JWTPayload & { email?: string } = {
        sub: userId,
        sid: sessionId,
        role,
        ...(email ? { email } : {}),
        iat: currentUnixTimeSeconds,
        exp: currentUnixTimeSeconds + lifetime,
        iss: options.accessTokenIssuer,
        aud: options.accessTokenAudience,
      };

      const unsignedToken = `${encodeJson(HS256_HEADER)}.${encodeJson(claims)}`;
      const signature = createHmac('sha256', sessionSecret)
        .update(unsignedToken)
        .digest('base64url');
      return `${unsignedToken}.${signature}`;
    },

    verifyToken(token: string): AuthenticatedPrincipal | null {
      try {
        const parts = token.split('.');
        if (parts.length !== 3 || parts.some((part) => part.length === 0)) {
          return null;
        }

        const [headerPart, claimsPart, signaturePart] = parts;
        const header = parseJsonPart<{ alg?: string; typ?: string }>(headerPart);
        if (header.typ !== 'JWT' || header.alg !== 'HS256') {
          return null;
        }

        const unsignedToken = `${headerPart}.${claimsPart}`;
        const expectedSig = createHmac('sha256', sessionSecret)
          .update(unsignedToken)
          .digest('base64url');
        if (signaturePart !== expectedSig) {
          return null;
        }

        const claims = parseJsonPart<any>(claimsPart);
        if (
          typeof claims.sub !== 'string' ||
          (claims.role !== 'STUDENT' && claims.role !== 'ADMIN') ||
          claims.iss !== options.accessTokenIssuer ||
          claims.aud !== options.accessTokenAudience
        ) {
          return null;
        }

        const now = Math.floor(Date.now() / 1000);
        if (typeof claims.exp !== 'number' || claims.exp <= now) {
          return null;
        }
        if (typeof claims.iat !== 'number' || claims.iat > now + 60) {
          return null;
        }

        return {
          userId: claims.sub,
          sessionId: claims.sid ?? '',
          role: claims.role,
          email: claims.email,
        };
      } catch {
        return null;
      }
    },

    generateRefreshToken() {
      return randomBytes(32).toString('base64url');
    },

    hashRefreshToken(refreshToken) {
      return createHash('sha256').update(refreshToken).digest('hex');
    },
  };
}
