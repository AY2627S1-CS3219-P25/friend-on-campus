/**
 * AI Assistance Disclosure:
 * Tool: Codex (model: GPT-6), date: 2026-11-01
 * Scope: Regression tests for coincident supplier markers and missing coordinates.
 * Author review: I validated correctness, edited for style, and verified with automated tests.
 */
import assert from 'node:assert/strict';
import { test } from 'node:test';
import type { SupplierDTO } from '@campus-errand/common-dtos';
import { groupSuppliersByLocation } from '../src/map/supplierLocations';

function supplier(id: string, latitude: number | undefined, longitude: number | undefined): SupplierDTO {
  return {
    id, name: id, supplierCode: id, campusZone: 'Central Library', exactLocation: 'Level 1',
    category: 'Food', building: 'Central Library', floor: '1', latitude, longitude,
    isActive: true, createdAt: '2026-11-01T00:00:00Z',
  };
}

test('coincident suppliers share a marker without losing either selectable supplier', () => {
  const anna = supplier("Anna's x Soup Union", 1.296444, 103.773032);
  const robot = supplier('Cafe+ Robot Cafe', 1.296444, 103.773032);
  const locations = groupSuppliersByLocation([anna, robot]);

  assert.equal(locations.length, 1);
  assert.deepEqual(locations[0].position, [1.296444, 103.773032]);
  assert.deepEqual(locations[0].suppliers, [anna, robot]);
  assert.equal(locations[0].suppliers[0], anna);
  assert.equal(locations[0].suppliers[1], robot);
});

test('nearby but distinct suppliers keep separate markers without rounding coordinates', () => {
  const locations = groupSuppliersByLocation([
    supplier('first', 1.296444, 103.773032),
    supplier('second', 1.296445, 103.773032),
    supplier('third', 1.296444, 103.773033),
  ]);

  assert.equal(locations.length, 3);
  assert.equal(new Set(locations.map((location) => location.key)).size, 3);
});

test('unmapped or non-finite locations are excluded while zero coordinates remain usable', () => {
  const valid = supplier('zero', 0, 0);
  const locations = groupSuppliersByLocation([
    supplier('missing-latitude', undefined, 103.77),
    supplier('missing-longitude', 1.29, undefined),
    supplier('invalid', NaN, 103.77),
    supplier('infinite', 1.29, Infinity),
    valid,
  ]);

  assert.equal(locations.length, 1);
  assert.deepEqual(locations[0].suppliers, [valid]);
  assert.deepEqual(groupSuppliersByLocation([]), []);
});
