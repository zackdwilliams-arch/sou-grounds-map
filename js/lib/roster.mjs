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
  const byCat = new Map(CATEGORY_ORDER.map(c => [c, []]));
  for (const p of roster.properties) {
    if (!byCat.has(p.category)) byCat.set(p.category, []); // unknown categories appended after the 8
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
