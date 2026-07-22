import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateData } from './geo_validate.mjs';

const roster = { categories: ['Residence Halls'], properties: [{ id: 'rv', name: 'Raider Village', category: 'Residence Halls' }] };

test('valid data yields no errors', () => {
  const fc = { type: 'FeatureCollection', features: [{
    type: 'Feature', geometry: { type: 'Polygon', coordinates: [[[0,0],[0,1],[1,1],[0,0]]] },
    properties: { id: 'rv', name: 'Raider Village', category: 'Residence Halls', famis_locations: ['Raider Village'], style: {}, kind: 'polygon' },
  }]};
  assert.deepEqual(validateData(roster, fc), []);
});
test('flags unknown category, unknown id, bad kind, missing keys, missing geometry', () => {
  const fc = { type: 'FeatureCollection', features: [{
    type: 'Feature', geometry: null,
    properties: { id: 'nope', name: 'X', category: 'Mars', kind: 'blob' }, // missing famis_locations + style
  }]};
  const errs = validateData(roster, fc);
  assert.ok(errs.some(e => /category "Mars"/.test(e)));
  assert.ok(errs.some(e => /id "nope"/.test(e)));
  assert.ok(errs.some(e => /kind "blob"/.test(e)));
  assert.ok(errs.some(e => /missing properties\.famis_locations/.test(e)));
  assert.ok(errs.some(e => /missing geometry/.test(e)));
});
test('flags a non-FeatureCollection', () => {
  assert.ok(validateData(roster, { type: 'Nope', features: [] }).some(e => /FeatureCollection/.test(e)));
});
test('a null feature entry yields an error, not a thrown exception', () => {
  const errs = validateData(roster, { type: 'FeatureCollection', features: [null] });
  assert.ok(Array.isArray(errs));
  assert.ok(errs.some(e => /missing geometry/.test(e)));
});
