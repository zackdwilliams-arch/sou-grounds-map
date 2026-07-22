import { test } from 'node:test';
import assert from 'node:assert/strict';
import { featureToPathStyle, defaultColorForCategory } from './style.mjs';

test('polygon gets fill; explicit style wins', () => {
  const s = featureToPathStyle({ kind: 'polygon', category: 'Residence Halls',
    style: { color: '#ff0000', weight: 5, fillOpacity: 0.4, dashArray: null } });
  assert.equal(s.color, '#ff0000');
  assert.equal(s.weight, 5);
  assert.equal(s.fill, true);
  assert.equal(s.fillOpacity, 0.4);
});
test('polyline has no fill', () => {
  const s = featureToPathStyle({ kind: 'polyline', category: 'Residence Halls', style: {} });
  assert.equal(s.fill, false);
  assert.equal(s.fillOpacity, 0);
});
test('missing style falls back to category default color + defaults', () => {
  const s = featureToPathStyle({ kind: 'polygon', category: 'Athletics & Recreation' });
  assert.equal(s.color, defaultColorForCategory('Athletics & Recreation'));
  assert.equal(s.weight, 3);
  assert.equal(s.fillOpacity, 0.25);
});
