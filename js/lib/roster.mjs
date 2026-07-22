// Roster grouping for the nested layer control.
export const CATEGORY_ORDER = [
  'Academic Buildings',
  'Residence Halls',
  'Cascade Complex',
  'Athletics & Recreation',
  'Student Services',
  'Facilities & Operations',
  'Campus Areas & Grounds',
  'Student Family Housing',
];

export function buildLayerTree(roster) {
  // Group order follows the roster's own categories list (data-driven, so renames /
  // reorders stick); fall back to the seed order if a roster omits it.
  const order = (roster.categories && roster.categories.length) ? roster.categories : CATEGORY_ORDER;
  const byCat = new Map(order.map(c => [c, []]));
  for (const p of roster.properties) {
    if (!byCat.has(p.category)) byCat.set(p.category, []); // categories not in the list append after
    byCat.get(p.category).push(p);
  }
  return [...byCat.entries()]
    .filter(([, ps]) => ps.length > 0)
    .map(([category, ps]) => ({
      category,
      properties: ps.slice().sort((a, b) => a.name.localeCompare(b.name)),
    }));
}

export function mappedIds(featureCollection) {
  return new Set(
    (featureCollection.features || [])
      .map(f => f && f.properties && f.properties.id)
      .filter(id => id != null)
  );
}
