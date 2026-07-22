// js/layers.js — render GeoJSON boundaries (+ on-map name labels) + the tri-state
// nested layer panel (which doubles as the structure editor in edit mode).
// Plain script: uses global L; pure logic comes from ES modules via window.SOULib.
(function () {
  const lib = () => window.SOULib;

  // Render one L.LayerGroup per property id (a property may hold >1 feature).
  // Each boundary gets a popup AND a permanent name label (the map's core job is
  // telling you which property you're on, especially where two properties meet).
  function render(map, fc) {
    const { featureToPathStyle, ringAreaSqMeters, formatArea, buildPopupHtml } = lib();
    const groups = new Map();
    for (const feature of fc.features) {
      const props = feature.properties;
      const layer = L.geoJSON(feature, { style: () => featureToPathStyle(props) });
      let areaLabel = '';
      if (props.kind === 'polygon' && feature.geometry && feature.geometry.type === 'Polygon') {
        areaLabel = formatArea(ringAreaSqMeters(feature.geometry.coordinates[0])).label;
      }
      layer.bindPopup(buildPopupHtml(props, areaLabel));
      layer.eachLayer(l => l.bindTooltip(props.name || '', {
        permanent: true, direction: 'center', className: 'boundary-label', opacity: 1,
      }));
      if (!groups.has(props.id)) groups.set(props.id, L.layerGroup());
      groups.get(props.id).addLayer(layer);
    }
    return groups;
  }

  // Build the collapsible tri-state panel. `groups` = Map<id, L.LayerGroup>.
  // editable=true adds structure-editing affordances (data-action hooks that
  // js/edit.js wires via one delegated listener on the panel container).
  function buildPanel(container, tree, groups, map, { showUnmapped = false, editable = false } = {}) {
    const { computeParentState, nextChildStateOnParentToggle, featureToPathStyle } = lib();
    container.hidden = false;
    container.innerHTML = '';
    const shown = new Set();

    for (const { category, properties } of tree) {
      const details = document.createElement('details');
      details.className = 'cat';
      details.open = true;
      const summary = document.createElement('summary');
      const parentCb = document.createElement('input');
      parentCb.type = 'checkbox';
      const parentLabel = document.createElement('span');
      parentLabel.className = 'cat-name';
      parentLabel.textContent = ' ' + category;
      summary.append(parentCb, parentLabel);
      if (editable) {
        summary.append(mkEdBtn('✎', 'rename-group', 'Rename group', { cat: category }));
        summary.append(mkEdBtn('＋', 'add-prop', 'Add a property to this group', { cat: category }));
      }
      details.append(summary);

      const childCbs = [];
      let rowsAdded = 0;
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
        swatch.style.background = p.defaultColor
          || (featureToPathStyle({ kind: 'polygon', category: p.category, style: {} })).color;
        const name = document.createElement('span');
        name.className = 'prop-name';
        name.textContent = p.name + (hasGeom ? '' : ' (unmapped)');
        if (editable) { name.classList.add('editable'); name.dataset.action = 'edit-prop'; name.dataset.id = p.id; name.title = 'Edit this property'; }
        row.append(cb, swatch, name);
        details.append(row);
        rowsAdded++;
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
        parentCb.disabled = childCbs.length === 0;
      }
      parentCb.addEventListener('change', () => {
        const state = computeParentState(childCbs.map(c => c.checked));
        const next = nextChildStateOnParentToggle(state);
        for (const c of childCbs) { if (c.checked !== next) { c.checked = next; c.dispatchEvent(new Event('change')); } }
      });

      if (rowsAdded) container.append(details);
      syncParent();
    }
    container.hidden = container.children.length === 0;
    return shown;
  }

  function mkEdBtn(text, action, title, data) {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'ed-btn'; b.textContent = text; b.title = title;
    b.dataset.action = action;
    for (const k in data) b.dataset[k] = data[k];
    return b;
  }

  window.SOULayers = { render, buildPanel };
})();
