// js/app.mjs — application entry (ES module).
import * as roster from './lib/roster.mjs';
import * as tristate from './lib/tristate.mjs';
import * as style from './lib/style.mjs';
import * as area from './lib/area.mjs';
import * as details from './lib/details.mjs';

// Expose pure logic to the plain scripts (map.js / layers.js / edit.js use globals).
window.SOULib = {
  ...roster, ...tristate, ...style, ...area, ...details,
};

async function loadData() {
  const [rosterRes, fcRes] = await Promise.all([
    fetch('data/properties.json'), fetch('data/boundaries.geojson'),
  ]);
  if (!rosterRes.ok || !fcRes.ok) throw new Error('data fetch failed (serve over http, not file://)');
  return { roster: await rosterRes.json(), fc: await fcRes.json() };
}

async function main() {
  const map = window.SOUMap.initMap('map');
  let data;
  try { data = await loadData(); }
  catch (e) {
    console.error(e);
    document.getElementById('layer-panel').innerHTML =
      '<b>Could not load map data.</b><br>Run <code>python -m http.server</code> and open via http://localhost:8000/';
    document.getElementById('layer-panel').hidden = false;
    return;
  }
  const { roster: rosterData, fc } = data;
  const groups = window.SOULayers.render(map, fc);
  const tree = window.SOULib.buildLayerTree(rosterData);

  const isEdit = new URLSearchParams(location.search).get('edit') === '1';
  window.SOUApp = { map, roster: rosterData, fc, groups, tree };

  // Build the panel once, then turn everything on so all boundaries are visible on
  // load and the panel reflects that: every enabled child checked, every parent
  // checked (indeterminate cleared).
  window.SOULayers.buildPanel(document.getElementById('layer-panel'), tree, groups, map, { showUnmapped: isEdit });
  for (const group of groups.values()) group.addTo(map);
  for (const cb of document.querySelectorAll('#layer-panel .prop input:not(:disabled)')) { cb.checked = true; }
  for (const d of document.querySelectorAll('#layer-panel .cat > summary > input')) { d.indeterminate = false; d.checked = true; }

  if (isEdit) {
    document.body.classList.add('edit');
    const { initEditMode } = await import('./edit.js' + '');  // dynamic; only in edit mode
    initEditMode(window.SOUApp);
  }
}
main();
