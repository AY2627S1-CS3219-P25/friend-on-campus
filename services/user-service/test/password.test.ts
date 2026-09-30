/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
 * Scope: Unit tests for src/auth/password.ts (scrypt hash format, verification, rejection of malformed or
 * foreign-parameter hashes, the dummy hash).
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '../src/auth/password';

describe('hashPassword', () => {
  it('produces the $scrypt$N$r$p$salt$hash format with the fixed parameters', async () => {
    const encoded = await hashPassword('Password123!');
    const parts = encoded.split('$');
    assert.equal(parts.length, 7);
    assert.equal(parts[0], '');
    assert.equal(parts[1], 'scrypt');
    assert.equal(parts[2], '16384');
    assert.equal(parts[3], '8');
    assert.equal(parts[4], '1');
    assert.equal(Buffer.from(parts[5], 'base64').length, 16, '16-byte salt');
    assert.equal(Buffer.from(parts[6], 'base64').length, 64, '64-byte derived key');
  });

  it('salts: the same password hashes differently each time', async () => {
    const a = await hashPassword('Password123!');
    const b = await hashPassword('Password123!');
    assert.notEqual(a, b);
  });

  it('never contains the password itself', async () => {
    const encoded = await hashPassword('Password123!');
    assert.equal(encoded.includes('Password123!'), false);
  });
});

describe('verifyPassword', () => {
  it('accepts the right password and rejects a wrong one', async () => {
    const encoded = await hashPassword('Password123!');
    assert.equal(await verifyPassword('Password123!', encoded), true);
    assert.equal(await verifyPassword('password123!', encoded), false, 'case matters');
    assert.equal(await verifyPassword('Password123! ', encoded), false, 'trailing space matters');
    assert.equal(await verifyPassword('', encoded), false);
  });

  it('rejects the dummy hash for any password', async () => {
    assert.equal(await verifyPassword('Password123!', DUMMY_PASSWORD_HASH), false);
    assert.equal(await verifyPassword('', DUMMY_PASSWORD_HASH), false);
  });

  it('rejects malformed encodings instead of throwing', async () => {
    for (const bad of ['', 'plaintext', '$bcrypt$x$y', '$scrypt$16384$8$1$$', '$scrypt$16384$8$1$c2FsdA==$', 'not$enough$parts']) {
      assert.equal(await verifyPassword('Password123!', bad), false, `encoding ${JSON.stringify(bad)}`);
    }
  });

  it('rejects a hash made with different scrypt parameters', async () => {
    const encoded = await hashPassword('Password123!');
    const parts = encoded.split('$');
    const withOtherCost = ['', 'scrypt', '8192', parts[3], parts[4], parts[5], parts[6]].join('$');
    const withOtherBlock = ['', 'scrypt', parts[2], '16', parts[4], parts[5], parts[6]].join('$');
    assert.equal(await verifyPassword('Password123!', withOtherCost), false);
    assert.equal(await verifyPassword('Password123!', withOtherBlock), false);
  });

  it('rejects a hash whose derived key has the wrong length', async () => {
    const encoded = await hashPassword('Password123!');
    const parts = encoded.split('$');
    const shortKey = Buffer.from(parts[6], 'base64').subarray(0, 32).toString('base64');
    const tampered = [...parts.slice(0, 6), shortKey].join('$');
    assert.equal(await verifyPassword('Password123!', tampered), false);
  });
});
