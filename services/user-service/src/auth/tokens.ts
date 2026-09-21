import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
import { UserRole } from '../persistence/auth-repository';

// `alg` and `typ` are standard JOSE header names and must remain abbreviated
// for JWT interoperability. Application-owned payload claims use descriptive names.
const JWT_HEADER = Object.freeze({ alg: 'HS256', typ: 'JWT' });

export interface AccessTokenClaims {
  userId: string;
  sessionId: string;
  userRole: UserRole;
  issuedAt: number;
  expiresAt: number;
  issuer: string;
  audience: string;
}

export interface TokenManager {
  issueAccessToken(userId: string, sessionId: string, userRole: UserRole): string;
  verifyAccessToken(accessToken: string): AccessTokenClaims;
  generateRefreshToken(): string;
  hashRefreshToken(refreshToken: string): string;
}

export interface TokenManagerOptions {
  accessTokenSigningSecret: string;
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

function isAccessTokenClaims(value: unknown): value is AccessTokenClaims {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const claims = value as Partial<AccessTokenClaims>;
  return (
    typeof claims.userId === 'string' &&
    typeof claims.sessionId === 'string' &&
    (claims.userRole === 'STUDENT' || claims.userRole === 'ADMIN') &&
    typeof claims.issuedAt === 'number' &&
    typeof claims.expiresAt === 'number' &&
    typeof claims.issuer === 'string' &&
    typeof claims.audience === 'string'
  );
}

export function createTokenManager(options: TokenManagerOptions): TokenManager {
  function createSignature(unsignedToken: string): string {
    return createHmac('sha256', options.accessTokenSigningSecret)
      .update(unsignedToken)
      .digest('base64url');
  }

  return {
    issueAccessToken(userId, sessionId, userRole) {
      const currentUnixTimeSeconds = Math.floor(Date.now() / 1000);
      const claims: AccessTokenClaims = {
        userId,
        sessionId,
        userRole,
        issuedAt: currentUnixTimeSeconds,
        expiresAt: currentUnixTimeSeconds + options.accessTokenLifetimeSeconds,
        issuer: options.accessTokenIssuer,
        audience: options.accessTokenAudience,
      };
      const unsignedToken = `${encodeJson(JWT_HEADER)}.${encodeJson(claims)}`;

      return `${unsignedToken}.${createSignature(unsignedToken)}`;
    },

    verifyAccessToken(accessToken) {
      const parts = accessToken.split('.');
      if (parts.length !== 3) {
        throw new Error('Invalid access token');
      }

      const [headerPart, claimsPart, signaturePart] = parts;
      const unsignedToken = `${headerPart}.${claimsPart}`;
      const suppliedSignature = Buffer.from(signaturePart, 'base64url');
      const expectedSignature = Buffer.from(createSignature(unsignedToken), 'base64url');
      if (
        suppliedSignature.length !== expectedSignature.length ||
        !timingSafeEqual(suppliedSignature, expectedSignature)
      ) {
        throw new Error('Invalid access token');
      }

      const header = parseJsonPart<{ alg?: string; typ?: string }>(headerPart);
      if (header.alg !== JWT_HEADER.alg || header.typ !== JWT_HEADER.typ) {
        throw new Error('Invalid access token');
      }

      const claims = parseJsonPart<unknown>(claimsPart);
      const currentUnixTimeSeconds = Math.floor(Date.now() / 1000);
      if (
        !isAccessTokenClaims(claims) ||
        claims.issuer !== options.accessTokenIssuer ||
        claims.audience !== options.accessTokenAudience ||
        claims.expiresAt <= currentUnixTimeSeconds ||
        claims.issuedAt > currentUnixTimeSeconds + 60
      ) {
        throw new Error('Invalid access token');
      }

      return claims;
    },

    generateRefreshToken() {
      return randomBytes(32).toString('base64url');
    },

    hashRefreshToken(refreshToken) {
      return createHash('sha256').update(refreshToken).digest('hex');
    },
  };
}
