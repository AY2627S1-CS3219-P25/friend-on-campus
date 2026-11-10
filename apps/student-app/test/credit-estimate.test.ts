/**
 * AI Assistance Disclosure:
 * Tool: Claude Code (model: Claude Opus 5.5), date: 2026-11-04
 * Scope: Tests for matchBuildingInText (the assistant draft's drop-off building): whole words, spacing ignored, longest name wins, no match gives null; updated across 2 AI-assisted revisions through D4 wrap-up (tests for the drop-off estimator helpers: haversine distance, the longest span, the linear 5-70 suggestion (bounds, cap beyond D_MAX, rounding, monotonic),..).
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupplierDTO } from '@campus-errand/common-dtos';
import {
  LONGEST_SPAN_CREDITS,
  SAME_BUILDING_CREDITS,
  estimateRewardCredits,
  haversineKm,
  longestSpanKm,
  supplierPoint,
} from '../src/map/creditEstimate';
import { NUS_BUILDINGS, NUS_SPAN_KM, dedupeBuildingsByName, matchBuildingInText, searchBuildings } from '../src/map/nusBuildings';

const CENDANA = { latitude: 1.30812, longitude: 103.77221 };
const LIGHTHOUSE = { latitude: 1.29029, longitude: 103.78169 };

test('haversine distance matches the known Cendana College to LightHouse span', () => {
  assert.equal(haversineKm(CENDANA, CENDANA), 0);
  assert.ok(Math.abs(haversineKm(CENDANA, LIGHTHOUSE) - 2.245) < 0.002);
  assert.equal(haversineKm(CENDANA, LIGHTHOUSE), haversineKm(LIGHTHOUSE, CENDANA));
});

test('longestSpanKm returns the largest pairwise distance', () => {
  const a = { latitude: 1.3, longitude: 103.77 };
  const b = { latitude: 1.3, longitude: 103.78 };
  const c = { latitude: 1.29, longitude: 103.775 };
  const expected = Math.max(haversineKm(a, b), haversineKm(a, c), haversineKm(b, c));
  assert.equal(longestSpanKm([a, b, c]), expected);
  assert.equal(longestSpanKm([a]), 0);
  assert.equal(longestSpanKm([]), 0);
});

test('the estimate is 5 at the same point, 70 at D_MAX and stays at 70 beyond it', () => {
  const dMax = haversineKm(CENDANA, LIGHTHOUSE);
  assert.equal(estimateRewardCredits(CENDANA, CENDANA, dMax), SAME_BUILDING_CREDITS);
  assert.equal(estimateRewardCredits(CENDANA, LIGHTHOUSE, dMax), LONGEST_SPAN_CREDITS);
  assert.equal(estimateRewardCredits(CENDANA, LIGHTHOUSE, dMax / 2), LONGEST_SPAN_CREDITS);
});

test('the estimate is linear and rounded to the nearest credit', () => {
  // Half of D_MAX: 5 + 65 * 0.5 = 37.5, which rounds to 38.
  const dMax = haversineKm(CENDANA, LIGHTHOUSE) * 2;
  assert.equal(estimateRewardCredits(CENDANA, LIGHTHOUSE, dMax), 38);
});

test('the estimate never decreases with distance and is always a whole number in 5-70', () => {
  let previous = 0;
  for (let step = 0; step <= 60; step += 1) {
    const dropoff = { latitude: CENDANA.latitude - step * 0.0005, longitude: CENDANA.longitude };
    const estimate = estimateRewardCredits(CENDANA, dropoff, NUS_SPAN_KM);
    assert.ok(estimate !== null && Number.isInteger(estimate));
    assert.ok(estimate >= SAME_BUILDING_CREDITS && estimate <= LONGEST_SPAN_CREDITS);
    assert.ok(estimate >= previous);
    previous = estimate;
  }
});

test('there is no estimate without both points or with no span', () => {
  assert.equal(estimateRewardCredits(null, CENDANA, 2), null);
  assert.equal(estimateRewardCredits(CENDANA, null, 2), null);
  assert.equal(estimateRewardCredits(CENDANA, LIGHTHOUSE, 0), null);
});

test('supplierPoint returns null for a supplier without coordinates', () => {
  const base: SupplierDTO = {
    id: 's', name: 'Store', supplierCode: 'S', campusZone: 'COM', exactLocation: 'L1', category: 'Food',
    building: 'COM1', floor: '1', isActive: true, createdAt: '2026-11-04T00:00:00Z',
  };
  assert.equal(supplierPoint({ ...base, latitude: null, longitude: null }), null);
  assert.equal(supplierPoint(base), null);
  assert.equal(supplierPoint(null), null);
  assert.deepEqual(supplierPoint({ ...base, latitude: 1.29, longitude: 103.77 }), { latitude: 1.29, longitude: 103.77 });
});

test('buildings sharing a name are merged into one entry with the first record kept', () => {
  const merged = dedupeBuildingsByName([
    { elementId: '1', name: 'Saga College', latitude: 1.1, longitude: 103.1 },
    { elementId: '2', name: 'COM1', latitude: 1.2, longitude: 103.2 },
    { elementId: '3', name: 'saga college', latitude: 1.3, longitude: 103.3 },
  ]);
  assert.deepEqual(merged.map((b) => b.elementId), ['2', '1']);
});

test('the snapshot has one entry per name and a span of about 2.2 km', () => {
  const names = NUS_BUILDINGS.map((b) => b.name.toLowerCase());
  assert.equal(new Set(names).size, names.length);
  assert.ok(NUS_SPAN_KM > 2 && NUS_SPAN_KM < 2.5);
});

test('building search matches names case-insensitively with prefix matches first', () => {
  const buildings = [
    { elementId: '1', name: 'Central Library', latitude: 1, longitude: 103 },
    { elementId: '2', name: 'COM1', latitude: 1, longitude: 103 },
    { elementId: '3', name: 'Information Technology (COM2)', latitude: 1, longitude: 103 },
  ];
  assert.deepEqual(searchBuildings(buildings, 'com').map((b) => b.elementId), ['2', '3']);
  assert.deepEqual(searchBuildings(buildings, '  LIBRARY ').map((b) => b.elementId), ['1']);
  assert.deepEqual(searchBuildings(buildings, ''), []);
  assert.equal(searchBuildings(buildings, 'o', 1).length, 1);
});

test('matchBuildingInText finds the building named in a draft drop-off, ignoring case and spacing', () => {
  const name = (text: string) => matchBuildingInText(NUS_BUILDINGS, text)?.name ?? null;
  assert.equal(name('COM3 Level 2'), 'COM3');
  assert.equal(name('com 2 #02-04'), 'COM2');
  assert.equal(name('LT27 back row'), 'LT 27');
  assert.equal(name('Central Library Annexe, level 1'), 'Central Library Annexe');
  assert.equal(name('outside central library'), 'Central Library');
});

test('matchBuildingInText needs whole words and gives null when nothing matches', () => {
  const name = (text: string) => matchBuildingInText(NUS_BUILDINGS, text)?.name ?? null;
  assert.equal(name('COM31 seminar room'), null);
  assert.equal(name('my hostel room'), null);
  assert.equal(name(''), null);
});
