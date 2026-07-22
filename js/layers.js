// js/layers.js — render GeoJSON boundaries + the tri-state nested layer panel.
// Plain script: uses global L; pure logic comes from ES modules via window.SOULib
// (app.mjs attaches the imported functions to window.SOULib before calling in).
(function () {
  const lib = () => window.SOULib;

  // Render one L.LayerGroup per property id (a property may hold >1 feature).
  function render(map, fc) {
    const { featureToPathStyle, ringAreaSqMeters, formatArea, buildPopupHtml } = lib();
    const groups = new Map();
    for (const feature of fc.features) {
      const props = feature.properties;
      const layer = L.geoJSON(feature, { style: () => featureToPathStyle(props) });
      // popup with computed area for polygons
      let areaLabel = '';
      if (props.kind === 'polygon' && feature.geometry && feature.geometry.type === 'Polygon') {
        areaLabel = formatArea(ringAreaSqMeters(feature.geometry.coordinates[0])).label;
      }
      layer.bindPopup(buildPopupHtml(props, areaLabel));
      if (!groups.has(props.id)) groups.set(props.id, L.layerGroup());
      groups.get(props.id).addLayer(layer);
    }
    return groups;
  }

  // Build the collapsible tri-state panel. `groups` = Map<id, L.LayerGroup>.
  function buildPanel(container, tree, groups, map, { showUnmapped = false } = {}) {
    const { computeParentState, nextChildStateOnParentToggle, featureToPathStyle } = lib();
    container.hidden = false;
    container.innerHTML = '';
    const shown = new Set(); // property ids currently on the map

    for (const { category, properties } of tree) {
      const details = document.createElement('details');
      details.className = 'cat';
      details.open = true;
      const summary = document.createElement('summary');
      const parentCb = document.createElement('input');
      parentCb.type = 'checkbox';
      const parentLabel = document.createElement('span');
      parentLabel.textContent = ' ' + category;
      summary.append(parentCb, parentLabel);
      details.append(summary);

      const childCbs = [];
      for (const p of properties) {
        const hasGeom = groups.has(p.id);
        if (!hasGeom && !showUnmapped) continue;
        const row = document.createElement('label');
        row.className = 'prop' + (hasGeom ? '' : ' unmapped');
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.disabled = !hasGeom;
        const swatch = document.createElement('span');
        swatch.className = 'swatch';
        swatch.style.background = (featureToPathStyle({ kind: 'polygon', category: p.category, style: {} })).color;
        const name = document.createElement('span');
        name.textContent = p.name + (hasGeom ? '' : ' (unmapped)');
        row.append(cb, swatch, name);
        details.append(row);
        if (!hasGeom) continue;
        childCbs.push(cb);

        cb.addEventListener('change', () => {
          const group = groups.get(p.id);
          if (cb.checked) { group.addTo(map); shown.add(p.id); }
          else { map.removeLayer(group); shown.delete(p.id); }
          syncParent();
        });
      }

      function syncParent() {
        const state = computeParentState(childCbs.map(c => c.checked));
        parentCb.checked = state === 'checked';
        parentCb.indeterminate = state === 'indeterminate';
      }
      parentCb.addEventListener('change', () => {
        const state = computeParentState(childCbs.map(c => c.checked));
        const next = nextChildStateOnParentToggle(state);
        for (const c of childCbs) { if (c.checked !== next) { c.checked = next; c.dispatchEvent(new Event('change')); } }
      });

      if (childCbs.length) container.append(details);
      syncParent();
    }
    return shown;
  }

  window.SOULayers = { render, buildPanel };
})();
