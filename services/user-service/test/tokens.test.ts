/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
 * Scope: Unit tests for src/auth/tokens.ts (JWT structure and claims, Ed25519 signature verifiable with the
 * public key, refresh-token generation and hashing, private-key validation).
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPublicKey, generateKeyPairSync, verify } from 'node:crypto';
import { createTokenManager } from '../src/auth/tokens';
import { makeKeyPair } from './helpers';

const keys = makeKeyPair();
const options = {
  accessTokenPrivateKey: keys.privateKey,
  accessTokenLifetimeSeconds: 900,
  accessTokenIssuer: 'test-issuer',
  accessTokenAudience: 'test-audience',
};

function decodePart(part: string): any {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

describe('createTokenManager', () => {
  it('rejects a private key that is not a 64-character base64url string', () => {
    assert.throws(() => createTokenManager({ ...options, accessTokenPrivateKey: 'short' }), /64-character/);
    assert.throws(() => createTokenManager({ ...options, accessTokenPrivateKey: 'x'.repeat(63) + '+' }), /64-character/);
  });

  it('rejects a key that is not Ed25519 even when the encoding is right', () => {
    // Build a 64-character base64url string that is not a valid PKCS#8 Ed25519 key.
    const garbage = Buffer.alloc(48, 7).toString('base64url');
    assert.equal(garbage.length, 64);
    assert.throws(() => createTokenManager({ ...options, accessTokenPrivateKey: garbage }));
  });
});

describe('issueAccessToken', () => {
  const tokens = createTokenManager(options);

  it('produces a three-part EdDSA JWT with the expected claims', () => {
    const before = Math.floor(Date.now() / 1000);
    const token = tokens.issueAccessToken('user-1', 'session-1', 'ADMIN');
    const after = Math.floor(Date.now() / 1000);
    const parts = token.split('.');
    assert.equal(parts.length, 3);

    assert.deepEqual(decodePart(parts[0]), { alg: 'EdDSA', typ: 'JWT' });
    const claims = decodePart(parts[1]);
    assert.equal(claims.sub, 'user-1');
    assert.equal(claims.sid, 'session-1');
    assert.equal(claims.role, 'ADMIN');
    assert.equal(claims.iss, 'test-issuer');
    assert.equal(claims.aud, 'test-audience');
    assert.ok(claims.iat >= before && claims.iat <= after, 'iat is now');
    assert.equal(claims.exp, claims.iat + 900, 'exp is iat + lifetime');
    assert.deepEqual(Object.keys(claims).sort(), ['aud', 'exp', 'iat', 'iss', 'role', 'sid', 'sub']);
  });

  it('signs with the private key so the matching public key verifies it', () => {
    const token = tokens.issueAccessToken('user-1', 'session-1', 'STUDENT');
    const [header, claims, signature] = token.split('.');
    const publicKey = createPublicKey({
      key: Buffer.from(keys.publicKey, 'base64url'),
      format: 'der',
      type: 'spki',
    });
    assert.equal(
      verify(null, Buffer.from(`${header}.${claims}`), publicKey, Buffer.from(signature, 'base64url')),
      true,
    );
  });

  it('is rejected by a different public key', () => {
    const token = tokens.issueAccessToken('user-1', 'session-1', 'STUDENT');
    const [header, claims, signature] = token.split('.');
    const other = generateKeyPairSync('ed25519').publicKey;
    assert.equal(
      verify(null, Buffer.from(`${header}.${claims}`), other, Buffer.from(signature, 'base64url')),
      false,
    );
  });

  it('changing one character of the claims breaks the signature', () => {
    const token = tokens.issueAccessToken('user-1', 'session-1', 'STUDENT');
    const [header, claims, signature] = token.split('.');
    const forged = Buffer.from(JSON.stringify({ ...decodePart(claims), role: 'ADMIN' })).toString('base64url');
    const publicKey = createPublicKey({ key: Buffer.from(keys.publicKey, 'base64url'), format: 'der', type: 'spki' });
    assert.equal(
      verify(null, Buffer.from(`${header}.${forged}`), publicKey, Buffer.from(signature, 'base64url')),
      false,
    );
  });
});

describe('refresh tokens', () => {
  const tokens = createTokenManager(options);

  it('generates 32 random bytes as base64url, different every time', () => {
    const a = tokens.generateRefreshToken();
    const b = tokens.generateRefreshToken();
    assert.equal(Buffer.from(a, 'base64url').length, 32);
    assert.match(a, /^[A-Za-z0-9_-]+$/);
    assert.notEqual(a, b);
  });

  it('hashes with SHA-256 as 64 hex characters, deterministically', () => {
    const token = tokens.generateRefreshToken();
    const hash = tokens.hashRefreshToken(token);
    assert.match(hash, /^[0-9a-f]{64}$/);
    assert.equal(tokens.hashRefreshToken(token), hash);
    assert.notEqual(tokens.hashRefreshToken(token + 'x'), hash);
  });
});
