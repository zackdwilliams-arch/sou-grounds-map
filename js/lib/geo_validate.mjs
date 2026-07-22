// Structural validation for the committed data files.
export const REQUIRED_FEATURE_KEYS = ['id', 'name', 'category', 'famis_locations', 'style', 'kind'];

export function validateData(roster, fc) {
  const errors = [];
  const categories = new Set(roster.categories || []);
  const rosterIds = new Set((roster.properties || []).map(p => p.id));

  if (!fc || fc.type !== 'FeatureCollection') {
    errors.push('boundaries: top-level "type" must be "FeatureCollection"');
    return errors;
  }
  (fc.features || []).forEach((f, i) => {
    const p = (f && f.properties) || {};
    for (const k of REQUIRED_FEATURE_KEYS) {
      if (!(k in p)) errors.push(`feature[${i}] missing properties.${k}`);
    }
    if ('category' in p && !categories.has(p.category)) errors.push(`feature[${i}] category "${p.category}" not in roster`);
    if ('id' in p && !rosterIds.has(p.id)) errors.push(`feature[${i}] id "${p.id}" not in roster`);
    if ('kind' in p && !['polygon', 'polyline'].includes(p.kind)) errors.push(`feature[${i}] bad kind "${p.kind}"`);
    if (!f || !f.geometry) errors.push(`feature[${i}] missing geometry`);
  });
  return errors;
}
