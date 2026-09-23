/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-5.6 Terra), date: 2026-09-23
 * Scope: Implemented Ed25519 access-token issuance with interoperable JWT claims and refresh-token session claims.
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import {
  createHash,
  createPrivateKey,
  randomBytes,
  sign,
} from 'node:crypto';
import type { KeyObject } from 'node:crypto';
import type { JWTPayload } from '@campus-errand/common-dtos';
import { UserRole } from '../persistence/auth-repository';

const JWT_HEADER = Object.freeze({ alg: 'EdDSA', typ: 'JWT' });

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
      const claims: JWTPayload = {
        sub: userId,
        sid: sessionId,
        role,
        iat: currentUnixTimeSeconds,
        exp: currentUnixTimeSeconds + options.accessTokenLifetimeSeconds,
        iss: options.accessTokenIssuer,
        aud: options.accessTokenAudience,
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
