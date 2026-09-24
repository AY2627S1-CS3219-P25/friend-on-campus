/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-24
 * Scope: Generated ephemeral Ed25519 credentials for HTTP authentication tests.
 * Author review: <to be completed by huangjiaxi1111>
 */
// AI-generated (edited by huangjiaxi1111)
import { generateKeyPairSync, randomUUID, sign } from 'node:crypto';
import { authMiddleware } from '@campus-errand/auth';

export function createTestAuth() {
  const { privateKey, publicKey } = generateKeyPairSync('ed25519');
  const options = {
    publicKey: publicKey.export({ type: 'spki', format: 'der' }).toString('base64url'),
    issuer: 'friend-on-campus-user-service',
    audience: 'friend-on-campus-services',
  };
  return {
    authenticate: authMiddleware(options),
    token(userId: string, overrides: Record<string, unknown> = {}) {
      const now = Math.floor(Date.now() / 1000);
      const header = Buffer.from(JSON.stringify({ alg: 'EdDSA', typ: 'JWT' })).toString('base64url');
      const payload = Buffer.from(JSON.stringify({
        sub: userId, sid: randomUUID(), role: 'STUDENT', iat: now, exp: now + 300,
        iss: options.issuer, aud: options.audience, ...overrides,
      })).toString('base64url');
      const unsigned = `${header}.${payload}`;
      return `${unsigned}.${sign(null, Buffer.from(unsigned), privateKey).toString('base64url')}`;
    },
  };
}
