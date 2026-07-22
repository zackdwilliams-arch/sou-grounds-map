import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildLayerTree, mappedIds, CATEGORY_ORDER } from './roster.mjs';

const roster = {
  categories: CATEGORY_ORDER,
  properties: [
    { id: 'zeta', name: 'Zeta Hall', category: 'Academic Buildings' },
    { id: 'alpha', name: 'Alpha Hall', category: 'Academic Buildings' },
    { id: 'rec', name: 'Rec Center', category: 'Athletics & Recreation' },
  ],
};

test('groups by category in CATEGORY_ORDER, drops empty categories', () => {
  const tree = buildLayerTree(roster);
  assert.deepEqual(tree.map(t => t.category), ['Academic Buildings', 'Athletics & Recreation']);
});
test('properties within a category are sorted by name', () => {
  const tree = buildLayerTree(roster);
  assert.deepEqual(tree[0].properties.map(p => p.name), ['Alpha Hall', 'Zeta Hall']);
});
test('mappedIds returns the set of feature property ids', () => {
  const fc = { type: 'FeatureCollection', features: [
    { properties: { id: 'rec' } }, { properties: { id: 'alpha' } },
  ]};
  const ids = mappedIds(fc);
  assert.ok(ids.has('rec') && ids.has('alpha') && !ids.has('zeta'));
});
test('mappedIds tolerates null/propertyless features (RFC7946 allows properties:null)', () => {
  const fc = { type: 'FeatureCollection', features: [
    null, { properties: null }, { properties: {} }, { properties: { id: 'rec' } },
  ]};
  const ids = mappedIds(fc);
  assert.ok(ids.has('rec'));
  assert.equal(ids.size, 1); // no undefined/null leaked into the set
});
