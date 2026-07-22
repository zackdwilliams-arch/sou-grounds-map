import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ringAreaSqMeters, formatArea } from './area.mjs';

// A ~100m x ~100m box near SOU (42.188N). 0.001 deg lat ≈ 111.3m;
// lng scaled by cos(lat) so both sides ≈ 111m → ~12,370 m². Assert within 5%.
test('ringAreaSqMeters approximates a small box', () => {
  const lat = 42.188, dLat = 0.001, dLng = 0.001 / Math.cos(lat * Math.PI / 180);
  const ring = [
    [-122.67, lat], [-122.67 + dLng, lat], [-122.67 + dLng, lat + dLat], [-122.67, lat + dLat],
  ];
  const a = ringAreaSqMeters(ring);
  assert.ok(Math.abs(a - 12370) / 12370 < 0.05, `area ${a} not within 5% of 12370`);
});
test('degenerate ring (<3 pts) is 0', () => {
  assert.equal(ringAreaSqMeters([[-122, 42], [-122, 42.001]]), 0);
});
test('formatArea reports acres + sqft', () => {
  const f = formatArea(4046.8564224); // exactly 1 acre
  assert.ok(Math.abs(f.acres - 1) < 1e-6);
  assert.match(f.label, /1\.00 ac/);
});
