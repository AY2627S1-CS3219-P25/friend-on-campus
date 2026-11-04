/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Fable 5.1), date: 2026-11-04
 * Scope: Unit test for validateSupplierForm (PR #222 review): coordinates are mandatory on creation, a legacy
 *        supplier's missing coordinate may stay blank on edit, a recorded coordinate cannot be blanked on edit.
 * Author review: <to be completed by Reallyeasy1>
 */

// AI-generated (edited by Reallyeasy1)

import assert from 'node:assert/strict';
import { test } from 'node:test';
import { validateSupplierForm } from '../src/constants';

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
