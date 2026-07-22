// Tri-state checkbox logic for the nested layer control.
export function computeParentState(childChecked) {
  if (childChecked.length === 0) return 'unchecked';
  const on = childChecked.filter(Boolean).length;
  if (on === 0) return 'unchecked';
  if (on === childChecked.length) return 'checked';
  return 'indeterminate';
}

export function nextChildStateOnParentToggle(parentState) {
  // Checked → turn everything off; unchecked or indeterminate → turn everything on.
  return parentState !== 'checked';
}
