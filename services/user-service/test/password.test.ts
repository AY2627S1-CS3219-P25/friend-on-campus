/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6); Claude Code (model: Claude Fable 5.1), date: 2026-09-30 to 2026-11-09
 * Scope: Unit tests for src/auth/password.ts (scrypt hash format, verification, rejection of malformed or foreign-parameter hashes, the dummy hash); updated across 2 AI-assisted revisions through D4 wrap-up (verify production seeding creates and resets demo accounts with independently salted Password123!).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { runInNewContext } from 'node:vm';
import { ModuleKind, transpileModule } from 'typescript';
import { DUMMY_PASSWORD_HASH, hashPassword, verifyPassword } from '../src/auth/password';

describe('production demo seed', () => {
  for (const existingAccounts of [false, true]) {
    it(`${existingAccounts ? 'resets existing' : 'creates new'} accounts with hashed Password123!`, async () => {
      const written: Array<{ email?: string; passwordHash: string }> = [];
      const source = readFileSync(path.resolve(__dirname, '../src/database/seed.ts'), 'utf8');
      const compiled = transpileModule(source, { compilerOptions: { module: ModuleKind.CommonJS } }).outputText;

      await new Promise<void>((resolve, reject) => {
        const prisma = {
          $queryRaw: async () => existingAccounts ? [{ id: 'existing-user' }] : [],
          user: {
            create: async ({ data }: { data: { email: string; passwordHash: string } }) => { written.push(data); },
            update: async ({ data }: { data: { passwordHash: string } }) => { written.push(data); },
          },
          $disconnect: async () => { resolve(); },
        };
        runInNewContext(compiled, {
          exports: {},
          require: (name: string) => {
            if (name === '../auth/password') return { hashPassword };
            if (name === './client') return { prisma };
            throw new Error(`Unexpected seed import: ${name}`);
          },
          process: { env: {
            NODE_ENV: 'production',
            SEED_PASSWORD_ALICE: '42a89ba20a0357ac781f8881',
            SEED_PASSWORD_BOB: '111111111111111111111111',
            SEED_PASSWORD_ADMIN: '222222222222222222222222',
          } },
          console: { log: () => {}, error: (_message: string, error: unknown) => { reject(error); } },
        });
      });

      assert.equal(written.length, 3);
      assert.equal(new Set(written.map(user => user.passwordHash)).size, 3);
      for (const user of written) {
        assert.notEqual(user.passwordHash, 'Password123!');
        assert.equal(await verifyPassword('Password123!', user.passwordHash), true);
        assert.equal(await verifyPassword('42a89ba20a0357ac781f8881', user.passwordHash), false);
      }
    });
  }
});

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
