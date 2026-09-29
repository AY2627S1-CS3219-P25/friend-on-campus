/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent, date: 2026-09-29
 * Scope: TokenManager implemented with `jose` library for standard RFC 7519 JWT signing and verification.
 * Author review: (to be completed by author after review)
 */
// AI-generated (edited by yanhwee)
import { SignJWT, jwtVerify } from 'jose';
import { createHash, randomBytes } from 'node:crypto';
import { UserRole } from '../persistence/user-repository';

export interface AuthenticatedPrincipal {
  userId: string;
  role: UserRole;
  persistent?: boolean;
}

export interface TokenManager {
  issueAccessToken(
    userId: string,
    role: UserRole,
    lifetimeSeconds?: number,
    persistent?: boolean,
  ): Promise<string>;
  verifyToken(token: string): Promise<AuthenticatedPrincipal | null>;
  generateRefreshToken(): string;
  hashRefreshToken(refreshToken: string): string;
}

export interface TokenManagerOptions {
  sessionSecret: string;
  accessTokenLifetimeSeconds: number;
  accessTokenIssuer: string;
  accessTokenAudience: string;
}

export function createTokenManager(options: TokenManagerOptions): TokenManager {
  const secretKey = new TextEncoder().encode(options.sessionSecret);

  return {
    async issueAccessToken(userId, role, lifetimeSeconds, persistent) {
      const lifetime = lifetimeSeconds ?? options.accessTokenLifetimeSeconds;
      const currentUnixTime = Math.floor(Date.now() / 1000);

      const jwt = new SignJWT({
        role,
        ...(persistent ? { persistent: true } : {}),
      })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(userId)
        .setIssuer(options.accessTokenIssuer)
        .setAudience(options.accessTokenAudience)
        .setIssuedAt(currentUnixTime)
        .setExpirationTime(currentUnixTime + lifetime);

      return await jwt.sign(secretKey);
    },

    async verifyToken(token: string): Promise<AuthenticatedPrincipal | null> {
      try {
        const { payload } = await jwtVerify(token, secretKey, {
          issuer: options.accessTokenIssuer,
          audience: options.accessTokenAudience,
          algorithms: ['HS256'],
        });

        if (
          typeof payload.sub !== 'string' ||
          (payload.role !== 'STUDENT' && payload.role !== 'ADMIN')
        ) {
          return null;
        }

        return {
          userId: payload.sub,
          role: payload.role as UserRole,
          persistent: Boolean(payload.persistent),
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
