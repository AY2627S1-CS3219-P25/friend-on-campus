import {
  createHash,
  createPrivateKey,
  randomBytes,
  sign,
} from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import { UserRole } from '../persistence/auth-repository';

const JWT_HEADER = Object.freeze({ alg: 'EdDSA', typ: 'JWT' });

interface JwtAccessTokenClaims {
  userId: string;
  sessionId: string;
  role: UserRole;
  issuedAt: number;
  expiresAt: number;
  issuer: string;
  audience: string;
}

export interface TokenManager {
  issueAccessToken(userId: string, sessionId: string, role: UserRole): string;
  generateRefreshToken(): string;
  hashRefreshToken(refreshToken: string): string;
}

export interface TokenManagerOptions {
  accessTokenPrivateKey: string;
  accessTokenLifetimeSeconds: number;
  accessTokenIssuer: string;
  accessTokenAudience: string;
}

function encodeJson(value: object): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function readPrivateKey(encodedKey: string): KeyObject {
  if (encodedKey.length !== 64 || !/^[A-Za-z0-9_-]+$/.test(encodedKey)) {
    throw new Error('JWT private key must be a 64-character Base64URL string');
  }

  const key = createPrivateKey({
    key: Buffer.from(encodedKey, 'base64url'),
    format: 'der',
    type: 'pkcs8',
  });
  if (key.asymmetricKeyType !== 'ed25519') {
    throw new Error('JWT private key must be an Ed25519 key');
  }

  return key;
}

export function createTokenManager(options: TokenManagerOptions): TokenManager {
  const privateKey = readPrivateKey(options.accessTokenPrivateKey);

  return {
    issueAccessToken(userId, sessionId, role) {
      const currentUnixTimeSeconds = Math.floor(Date.now() / 1000);
      const claims: JwtAccessTokenClaims = {
        userId,
        sessionId,
        role,
        issuedAt: currentUnixTimeSeconds,
        expiresAt: currentUnixTimeSeconds + options.accessTokenLifetimeSeconds,
        issuer: options.accessTokenIssuer,
        audience: options.accessTokenAudience,
      };
      const unsignedToken = `${encodeJson(JWT_HEADER)}.${encodeJson(claims)}`;
      const signature = sign(null, Buffer.from(unsignedToken), privateKey);

      return `${unsignedToken}.${signature.toString('base64url')}`;
    },

    generateRefreshToken() {
      return randomBytes(32).toString('base64url');
    },

    hashRefreshToken(refreshToken) {
      return createHash('sha256').update(refreshToken).digest('hex');
    },
  };
}
