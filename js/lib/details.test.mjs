import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPopupHtml, escapeHtml } from './details.mjs';

test('escapes HTML in name', () => {
  assert.equal(escapeHtml('<b>&x</b>'), '&lt;b&gt;&amp;x&lt;/b&gt;');
});
test('polygon popup includes area row', () => {
  const html = buildPopupHtml(
    { name: 'Raider Village', category: 'Residence Halls', famis_locations: ['Raider Village'], kind: 'polygon' },
    '3.10 ac (135,036 sq ft)');
  assert.match(html, /Raider Village/);
  assert.match(html, /3\.10 ac/);
  assert.match(html, /Residence Halls/);
});
test('polyline popup omits area row', () => {
  const html = buildPopupHtml(
    { name: 'Fence Line', category: 'Campus Areas & Grounds', famis_locations: [], kind: 'polyline' }, '');
  assert.doesNotMatch(html, />Area</); // no "Area" label cell (category "…Areas…" is a legit substring, not the row)
  assert.match(html, /—/); // empty famis list shows a dash
});
