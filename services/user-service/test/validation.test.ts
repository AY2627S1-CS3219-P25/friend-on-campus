/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
 * Scope: Unit tests for src/utils/validation.ts (username, email, password rules and email normalisation).
 * Author review: <to be completed by ngkhengyang>
 */
// AI-generated (edited by ngkhengyang)
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  isNonEmptyString,
  isValidEmail,
  isValidPassword,
  isValidUsername,
  normalizeEmail,
} from '../src/utils/validation';

describe('isNonEmptyString', () => {
  it('accepts a string with visible characters', () => {
    assert.equal(isNonEmptyString('a'), true);
    assert.equal(isNonEmptyString('  a  '), true);
  });

  it('rejects empty, whitespace-only and non-strings', () => {
    for (const value of ['', '   ', '\t\n', 0, 1, null, undefined, {}, [], true]) {
      assert.equal(isNonEmptyString(value), false, `value ${JSON.stringify(value)}`);
    }
  });
});

describe('isValidUsername', () => {
  it('accepts 1 to 50 characters after trimming', () => {
    assert.equal(isValidUsername('a'), true);
    assert.equal(isValidUsername('x'.repeat(50)), true);
    assert.equal(isValidUsername('  ' + 'x'.repeat(50) + '  '), true, 'surrounding whitespace is not counted');
  });

  it('rejects 51 characters, whitespace-only and non-strings', () => {
    assert.equal(isValidUsername('x'.repeat(51)), false);
    assert.equal(isValidUsername('   '), false);
    assert.equal(isValidUsername(42), false);
    assert.equal(isValidUsername(undefined), false);
  });
});

describe('isValidEmail', () => {
  it('accepts ordinary addresses, any domain, trimmed', () => {
    assert.equal(isValidEmail('alice@u.nus.edu'), true);
    assert.equal(isValidEmail('  bob@example.test  '), true);
    assert.equal(isValidEmail('first.last+tag@sub.domain.org'), true);
  });

  it('rejects addresses without @, without a dot after @, with spaces, or over 320 characters', () => {
    assert.equal(isValidEmail('alice'), false);
    assert.equal(isValidEmail('alice@nus'), false);
    assert.equal(isValidEmail('ali ce@u.nus.edu'), false);
    assert.equal(isValidEmail('@u.nus.edu'), false);
    assert.equal(isValidEmail('alice@'), false);
    assert.equal(isValidEmail('a'.repeat(311) + '@u.nus.edu'), false, '321 characters');
    assert.equal(isValidEmail(''), false);
    assert.equal(isValidEmail(null), false);
  });

  it('accepts exactly 320 characters', () => {
    const local = 'a'.repeat(320 - '@b.co'.length);
    assert.equal(isValidEmail(local + '@b.co'), true);
  });
});

describe('isValidPassword', () => {
  it('accepts 8 to 24 characters, counted as code points', () => {
    assert.equal(isValidPassword('12345678'), true);
    assert.equal(isValidPassword('x'.repeat(24)), true);
    assert.equal(isValidPassword('😀'.repeat(8)), true, 'astral characters count once each');
  });

  it('rejects 7 or 25 characters and non-strings', () => {
    assert.equal(isValidPassword('1234567'), false);
    assert.equal(isValidPassword('x'.repeat(25)), false);
    assert.equal(isValidPassword('😀'.repeat(25)), false);
    assert.equal(isValidPassword(12345678), false);
    assert.equal(isValidPassword(undefined), false);
  });

  it('does not trim: surrounding spaces are part of the password', () => {
    assert.equal(isValidPassword('      ab'), true);
  });
});

describe('normalizeEmail', () => {
  it('trims and lower-cases', () => {
    assert.equal(normalizeEmail('  Alice@U.NUS.EDU '), 'alice@u.nus.edu');
  });
});
