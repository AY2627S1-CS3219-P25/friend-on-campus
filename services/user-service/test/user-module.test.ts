/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-09-30
 * Scope: Cover last-admin error mapping and deletion when another admin remains.
 * Author review: <to be completed by huangjiaxi1111>
 *
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-09-30
 * Scope: Unit tests for src/users/user-module.ts against an in-memory repository: profile read, list, the
 * username-only update rule, duplicate mapping, password change, status and role toggles, deletion.
 * Author review: <to be completed by Reallyeasy1>
 */
// AI-generated (edited by Reallyeasy1)
import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { hashPassword, verifyPassword } from '../src/auth/password';
import { UserError, createUserModule } from '../src/users/user-module';
import { makeFakeUserRepository, makeUser } from './helpers';

const ALICE = makeUser();
const ADMIN = makeUser({
  id: '22222222-2222-4222-8222-222222222222',
  username: 'admin',
  email: 'admin@nus.edu.sg',
  role: 'ADMIN',
});

async function rejects(promise: Promise<unknown>, code: string) {
  await assert.rejects(promise, (error: unknown) => {
    assert.ok(error instanceof UserError, `expected UserError, got ${String(error)}`);
    assert.equal(error.code, code);
    return true;
  });
}

describe('getOwnProfile and listUsers', () => {
  const fake = makeFakeUserRepository([ADMIN, ALICE]);
  const users = createUserModule({ repository: fake.repo });

  it('returns the DTO shape without the password hash', async () => {
    const me = await users.getOwnProfile(ALICE.id);
    assert.deepEqual(me, { userId: ALICE.id, username: 'alice', email: 'alice@u.nus.edu', userRole: 'STUDENT', status: true });
  });

  it('throws USER_NOT_FOUND for an unknown id', async () => {
    await rejects(users.getOwnProfile('00000000-0000-4000-8000-000000000000'), 'USER_NOT_FOUND');
  });

  it('lists every user as a DTO, ordered by username', async () => {
    const list = await users.listUsers();
    assert.deepEqual(list.map((u) => u.username), ['admin', 'alice']);
    assert.equal(list.some((u) => 'passwordHash' in u), false);
  });
});

describe('updateOwnProfile', () => {
  let fake = makeFakeUserRepository();
  let users = createUserModule({ repository: fake.repo });
  beforeEach(() => {
    fake = makeFakeUserRepository([ALICE, ADMIN]);
    users = createUserModule({ repository: fake.repo });
  });

  it('changes the username, trimmed', async () => {
    const updated = await users.updateOwnProfile(ALICE.id, { username: '  alice2 ' });
    assert.equal(updated.username, 'alice2');
    assert.equal(fake.users.get(ALICE.id)?.username, 'alice2');
  });

  it('rejects any field other than username, and any extra field beside it', async () => {
    for (const body of [
      { email: 'new@u.nus.edu' },
      { role: 'ADMIN' },
      { status: false },
      { userId: ADMIN.id },
      { username: 'ok', role: 'ADMIN' },
      {},
    ]) {
      await rejects(users.updateOwnProfile(ALICE.id, body as any), 'INVALID_INPUT');
    }
    assert.equal(fake.users.get(ALICE.id)?.username, 'alice', 'nothing changed');
    assert.equal(fake.users.get(ALICE.id)?.role, 'STUDENT');
  });

  it('rejects a non-object body and an invalid username', async () => {
    await rejects(users.updateOwnProfile(ALICE.id, null as any), 'INVALID_INPUT');
    await rejects(users.updateOwnProfile(ALICE.id, 'alice' as any), 'INVALID_INPUT');
    await rejects(users.updateOwnProfile(ALICE.id, ['alice'] as any), 'INVALID_INPUT');
    await rejects(users.updateOwnProfile(ALICE.id, { username: '   ' }), 'INVALID_INPUT');
    await rejects(users.updateOwnProfile(ALICE.id, { username: 'x'.repeat(51) }), 'INVALID_INPUT');
  });

  it('maps a taken username to DUPLICATE_USERNAME, ignoring case', async () => {
    await rejects(users.updateOwnProfile(ALICE.id, { username: 'ADMIN' }), 'DUPLICATE_USERNAME');
  });

  it('throws USER_NOT_FOUND when the account no longer exists', async () => {
    await rejects(users.updateOwnProfile('00000000-0000-4000-8000-000000000000', { username: 'x' }), 'USER_NOT_FOUND');
  });

  it('rethrows unexpected repository errors', async () => {
    fake.repo.updateProfile = async () => {
      throw new Error('boom');
    };
    await assert.rejects(users.updateOwnProfile(ALICE.id, { username: 'x' }), /boom/);
  });
});

describe('changePassword', () => {
  let fake = makeFakeUserRepository();
  let users = createUserModule({ repository: fake.repo });
  beforeEach(async () => {
    fake = makeFakeUserRepository([makeUser({ passwordHash: await hashPassword('Password123!') })]);
    users = createUserModule({ repository: fake.repo });
  });

  it('stores a new hash that verifies the new password only', async () => {
    await users.changePassword(ALICE.id, { currentPassword: 'Password123!', newPassword: 'NewPassword456!' });
    const hash = fake.users.get(ALICE.id)!.passwordHash;
    assert.equal(await verifyPassword('NewPassword456!', hash), true);
    assert.equal(await verifyPassword('Password123!', hash), false);
  });

  it('rejects a wrong current password without changing anything', async () => {
    const before = fake.users.get(ALICE.id)!.passwordHash;
    await rejects(users.changePassword(ALICE.id, { currentPassword: 'wrong', newPassword: 'NewPassword456!' }), 'INVALID_CURRENT_PASSWORD');
    assert.equal(fake.users.get(ALICE.id)!.passwordHash, before);
  });

  it('validates the input before reading the user', async () => {
    await rejects(users.changePassword(ALICE.id, { newPassword: 'NewPassword456!' } as any), 'INVALID_INPUT');
    await rejects(users.changePassword(ALICE.id, { currentPassword: 'Password123!', newPassword: 'short' }), 'INVALID_INPUT');
    await rejects(users.changePassword(ALICE.id, { currentPassword: 'Password123!', newPassword: 'x'.repeat(25) }), 'INVALID_INPUT');
    await rejects(users.changePassword(ALICE.id, null as any), 'INVALID_INPUT');
  });

  it('throws USER_NOT_FOUND for an unknown id', async () => {
    await rejects(users.changePassword('00000000-0000-4000-8000-000000000000', { currentPassword: 'Password123!', newPassword: 'NewPassword456!' }), 'USER_NOT_FOUND');
  });

  it('reports INVALID_CURRENT_PASSWORD when the hash changed between verify and update', async () => {
    // Simulates a concurrent password change: the conditional update matches nothing.
    fake.repo.updatePassword = async () => false;
    await rejects(users.changePassword(ALICE.id, { currentPassword: 'Password123!', newPassword: 'NewPassword456!' }), 'INVALID_CURRENT_PASSWORD');
  });
});

describe('administration', () => {
  let fake = makeFakeUserRepository();
  let users = createUserModule({ repository: fake.repo });
  beforeEach(() => {
    fake = makeFakeUserRepository([ALICE, ADMIN]);
    users = createUserModule({ repository: fake.repo });
  });

  it('toggleUserStatus flips status both ways', async () => {
    assert.equal((await users.toggleUserStatus(ALICE.id)).status, false);
    assert.equal((await users.toggleUserStatus(ALICE.id)).status, true);
  });

  it('toggleUserRole flips STUDENT to ADMIN and back', async () => {
    assert.equal((await users.toggleUserRole(ALICE.id)).userRole, 'ADMIN');
    assert.equal((await users.toggleUserRole(ALICE.id)).userRole, 'STUDENT');
  });

  it('deleteUser removes the account', async () => {
    await users.deleteUser(ALICE.id);
    assert.equal(fake.users.has(ALICE.id), false);
  });

  it('maps both last-admin removals to LAST_ADMIN_REQUIRED without changing the account', async () => {
    await rejects(users.toggleUserRole(ADMIN.id), 'LAST_ADMIN_REQUIRED');
    await rejects(users.deleteUser(ADMIN.id), 'LAST_ADMIN_REQUIRED');
    assert.equal(fake.users.get(ADMIN.id)?.role, 'ADMIN');
  });

  it('allows an admin to be deleted when another admin remains', async () => {
    await users.toggleUserRole(ALICE.id);
    await users.deleteUser(ADMIN.id);
    assert.equal(fake.users.has(ADMIN.id), false);
    assert.equal(fake.users.get(ALICE.id)?.role, 'ADMIN');
  });

  it('every admin operation throws USER_NOT_FOUND for an unknown id', async () => {
    const unknown = '00000000-0000-4000-8000-000000000000';
    await rejects(users.toggleUserStatus(unknown), 'USER_NOT_FOUND');
    await rejects(users.toggleUserRole(unknown), 'USER_NOT_FOUND');
    await rejects(users.deleteUser(unknown), 'USER_NOT_FOUND');
  });
});
