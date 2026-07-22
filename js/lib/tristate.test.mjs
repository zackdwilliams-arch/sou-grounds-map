import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeParentState, nextChildStateOnParentToggle } from './tristate.mjs';

test('all children on → checked', () => {
  assert.equal(computeParentState([true, true, true]), 'checked');
});
test('all children off → unchecked', () => {
  assert.equal(computeParentState([false, false]), 'unchecked');
});
test('mixed → indeterminate', () => {
  assert.equal(computeParentState([true, false, true]), 'indeterminate');
});
test('empty → unchecked', () => {
  assert.equal(computeParentState([]), 'unchecked');
});
test('toggling a checked parent turns children off', () => {
  assert.equal(nextChildStateOnParentToggle('checked'), false);
});
test('toggling an unchecked/indeterminate parent turns children on', () => {
  assert.equal(nextChildStateOnParentToggle('unchecked'), true);
  assert.equal(nextChildStateOnParentToggle('indeterminate'), true);
});
