/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-10-17
 * Scope: Tests for the optional username claim (F5.1.1): issued when given, exposed on the principal by
 * @campus-errand/auth, absent tokens still verify, and non-string, empty or over-long claims are rejected.
 * Author review: <to be completed by Reallyeasy1>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
 * Scope: Unit tests for src/auth/tokens.ts (JWT structure and claims, Ed25519 signature verifiable with the
 * public key, refresh-token generation and hashing, private-key validation).
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateKey, createPublicKey, generateKeyPairSync, sign, verify } from 'node:crypto';
import { readPublicKey, verifyAccessToken } from '@campus-errand/auth';
import { createTokenManager } from '../src/auth/tokens';
import { makeKeyPair } from './helpers';

const keys = makeKeyPair();
const options = {
  accessTokenPrivateKey: keys.privateKey,
  accessTokenLifetimeSeconds: 900,
  accessTokenIssuer: 'test-issuer',
  accessTokenAudience: 'test-audience',
};
const verifyOptions = { publicKey: keys.publicKey, issuer: 'test-issuer', audience: 'test-audience' };
const publicKey = readPublicKey(keys.publicKey);

function decodePart(part: string): any {
  return JSON.parse(Buffer.from(part, 'base64url').toString('utf8'));
}

// AI-generated (edited by Reallyeasy1)
/** Re-signs a real token's claims with the test private key after overriding some of them. */
function reissue(token: string, overrides: Record<string, unknown>): string {
  const [header, claims] = token.split('.');
  const forged = Buffer.from(JSON.stringify({ ...decodePart(claims), ...overrides })).toString('base64url');
  const privateKey = createPrivateKey({ key: Buffer.from(keys.privateKey, 'base64url'), format: 'der', type: 'pkcs8' });
  const signature = sign(null, Buffer.from(`${header}.${forged}`), privateKey);
  return `${header}.${forged}.${signature.toString('base64url')}`;
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

  // AI-generated (edited by Reallyeasy1)
  it('carries the username claim when given, and the shared verifier exposes it on the principal (F5.1.1)', () => {
    const token = tokens.issueAccessToken('user-1', 'session-1', 'STUDENT', 'alice');
    const claims = decodePart(token.split('.')[1]);
    assert.equal(claims.username, 'alice');
    assert.deepEqual(Object.keys(claims).sort(), ['aud', 'exp', 'iat', 'iss', 'role', 'sid', 'sub', 'username']);
    assert.equal(verifyAccessToken(token, publicKey, verifyOptions).username, 'alice');
  });

  it('a token without a username still verifies and the principal has none', () => {
    const principal = verifyAccessToken(tokens.issueAccessToken('user-1', 'session-1', 'STUDENT'), publicKey, verifyOptions);
    assert.deepEqual(principal, { userId: 'user-1', sessionId: 'session-1', role: 'STUDENT' });
  });

  for (const [name, username] of [['a number', 7], ['empty', ''], ['51 characters', 'x'.repeat(51)]] as const) {
    it(`rejects a username claim that is ${name}`, () => {
      const token = reissue(tokens.issueAccessToken('user-1', 'session-1', 'STUDENT'), { username });
      assert.throws(() => verifyAccessToken(token, publicKey, verifyOptions), /INVALID_TOKEN/);
    });
  }

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
