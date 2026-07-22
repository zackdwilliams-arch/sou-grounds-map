// CLI: node scripts/validate_data.mjs
import { readFile } from 'node:fs/promises';
import { validateData } from '../js/lib/geo_validate.mjs';

const roster = JSON.parse(await readFile(new URL('../data/properties.json', import.meta.url), 'utf8'));
const fc = JSON.parse(await readFile(new URL('../data/boundaries.geojson', import.meta.url), 'utf8'));
const errors = validateData(roster, fc);
if (errors.length) {
  console.error(`❌ ${errors.length} data error(s):`);
  for (const e of errors) console.error('  - ' + e);
  process.exit(1);
}
console.log('✅ data valid:', fc.features.length, 'features,', roster.properties.length, 'roster entries');
