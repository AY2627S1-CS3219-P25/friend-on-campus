/**
 * AI Assistance Disclosure:
 * Tool: Google Antigravity Agent; Claude Code (model: Claude Fable 5.1), date: 2026-11-04 to 2026-11-10
 * Scope: Unit test for validateSupplierForm (PR #222 review): coordinates are mandatory on creation, a legacy supplier's missing coordinate may stay blank on edit, a..; updated across 2 AI-assisted revisions through D4 wrap-up (add unit test for describeOrderEscrowSubtitle (issue #200)).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */


import assert from 'node:assert/strict';
import { test } from 'node:test';
import { describeOrderEscrowSubtitle, validateSupplierForm } from '../src/constants';

const complete = {
  name: 'NUS Co-op',
  campusZone: 'Central Lib',
  category: 'Shopping',
  exactLocation: 'Inside the library',
  building: 'Central Library',
  floor: '1',
};

test('creation requires both coordinates', () => {
  const errors = validateSupplierForm({ ...complete, latitude: '', longitude: '' });
  assert.equal(errors.latitude, 'Latitude is required.');
  assert.equal(errors.longitude, 'Longitude is required.');
  assert.deepEqual(validateSupplierForm({ ...complete, latitude: 1.2967866, longitude: 103.7732677 }), {});
});

test('editing a legacy supplier without coordinates lets both stay blank, so an unrelated edit can be saved', () => {
  const legacy = { latitude: null, longitude: null };
  assert.deepEqual(validateSupplierForm({ ...complete, latitude: undefined, longitude: undefined }, legacy), {});
  // Entering one of the two is also accepted: the other stays missing, as it was.
  assert.deepEqual(validateSupplierForm({ ...complete, latitude: 1.2967866, longitude: undefined }, legacy), {});
});

test('blanking a recorded coordinate on edit is still an error', () => {
  const recorded = { latitude: 1.2967866, longitude: 103.7732677 };
  const errors = validateSupplierForm({ ...complete, latitude: '', longitude: 103.7732677 }, recorded);
  assert.deepEqual(errors, { latitude: 'Latitude is required.' });
  const partial = validateSupplierForm({ ...complete, latitude: undefined, longitude: undefined }, { latitude: 1.2967866, longitude: null });
  assert.deepEqual(Object.keys(partial), ['latitude']);
});

test('a non-numeric coordinate is rejected in both modes', () => {
  const nan = Number('abc');
  assert.equal(validateSupplierForm({ ...complete, latitude: nan, longitude: 103.7732677 }).latitude, 'Latitude is required.');
  assert.equal(
    validateSupplierForm({ ...complete, latitude: nan, longitude: 103.7732677 }, { latitude: null, longitude: null }).latitude,
    'Latitude is required.',
  );
});

test('describeOrderEscrowSubtitle reflects asynchronous settlement/refund without claiming Credit Service completion from Order status alone (issue #200)', () => {
  assert.equal(describeOrderEscrowSubtitle('PENDING'), 'Awaiting Escrow');
  assert.equal(describeOrderEscrowSubtitle('REJECTED'), 'Not Reserved');
  assert.equal(describeOrderEscrowSubtitle('OPEN'), 'Held in Escrow');
  assert.equal(describeOrderEscrowSubtitle('ACCEPTED'), 'Held in Escrow');
  assert.equal(describeOrderEscrowSubtitle('IN_TRANSIT'), 'Held in Escrow');
  assert.equal(describeOrderEscrowSubtitle('DELIVERED'), 'Held in Escrow');
  assert.equal(describeOrderEscrowSubtitle('COMPLETED'), 'Settlement queued');
  assert.equal(describeOrderEscrowSubtitle('CANCELLED'), 'Refund queued');
  assert.equal(describeOrderEscrowSubtitle('EXPIRED'), 'Refund queued');
});
