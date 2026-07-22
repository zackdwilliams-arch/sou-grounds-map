// js/edit.js — ES module, loaded only under ?edit=1. Uses global L + Geoman.
// Two jobs: (1) draw/edit/style boundaries, (2) manage the property roster.
// fc.features is authoritative: every Geoman create/edit/remove syncs back into it.
const BOUNDS_KEY = 'sou-grounds-map:draft';
const ROSTER_KEY = 'sou-grounds-map:roster-draft';

export function initEditMode(app) {
  const { map } = app;
  const { roster, fc } = app;            // same objects app holds; we mutate in place
  const lib = window.SOULib;
  const $ = id => document.getElementById(id);
  const status = msg => { $('edit-status').textContent = msg; };
  const sel = $('edit-prop');

  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const parseFamis = t => t.split(',').map(x => x.trim()).filter(Boolean);
  const autosaveBounds = () => localStorage.setItem(BOUNDS_KEY, JSON.stringify(fc));
  const autosaveRoster = () => localStorage.setItem(ROSTER_KEY,
    JSON.stringify({ categories: roster.categories, properties: roster.properties }));
  const clearBoundsDraft = () => localStorage.removeItem(BOUNDS_KEY);
  const clearRosterDraft = () => localStorage.removeItem(ROSTER_KEY);

  // ---- restore drafts (crash safety). Drafts exist ONLY while there are unexported
  //      edits — they are cleared on Export/Import — so a prompt here means real
  //      unsaved work. Copy shows counts so an already-published draft is obvious. ----
  try {
    const rd = JSON.parse(localStorage.getItem(ROSTER_KEY) || 'null');
    if (rd && Array.isArray(rd.properties) && Array.isArray(rd.categories)
        && confirm(`Restore ${rd.properties.length} property-list edits saved in THIS browser but never exported?\n\nOK = use the browser draft · Cancel = keep the published list (${roster.properties.length}).`)) {
      roster.categories = rd.categories; roster.properties = rd.properties;
    }
  } catch { /* ignore bad draft */ }
  try {
    const bd = JSON.parse(localStorage.getItem(BOUNDS_KEY) || 'null');
    if (bd && Array.isArray(bd.features) && bd.features.length
        && confirm(`Restore ${bd.features.length} boundary edit(s) saved in THIS browser but never exported?\n\nOK = use the browser draft · Cancel = keep the published boundaries.`)) {
      fc.features = bd.features;
    }
  } catch { /* ignore bad draft */ }

  // ---- category select (with a "＋ New category…" sentinel) ----
  let lastCat = roster.categories[0];   // last real (non-sentinel) category chosen
  function refreshCategorySelect(selectedCat) {
    const cat = $('rp-category');
    cat.innerHTML = '';
    for (const c of roster.categories) {
      const o = document.createElement('option'); o.value = c; o.textContent = c; cat.append(o);
    }
    const nw = document.createElement('option'); nw.value = '__new__'; nw.textContent = '＋ New category…';
    cat.append(nw);
    if (selectedCat && roster.categories.includes(selectedCat)) { cat.value = selectedCat; lastCat = selectedCat; }
  }
  $('rp-category').addEventListener('change', () => {
    const v = $('rp-category').value;
    if (v !== '__new__') { lastCat = v; return; }
    const name = (prompt('New category name:') || '').trim();
    if (name && !roster.categories.includes(name)) {
      roster.categories.push(name); autosaveRoster(); refreshCategorySelect(name);
    } else if (name && roster.categories.includes(name)) {
      refreshCategorySelect(name);                 // typed an existing one → just select it
    } else {
      refreshCategorySelect(lastCat);              // cancelled → revert to the prior real choice
    }
  });

  // ---- fields + property select ----
  function loadFieldsFor(id) {
    const p = roster.properties.find(x => x.id === id);
    if (!p) { $('rp-name').value = ''; $('rp-famis').value = ''; refreshCategorySelect(); return; }
    if (p.defaultColor) $('edit-color').value = p.defaultColor;   // preload the draw color too
    $('rp-name').value = p.name;
    $('rp-color').value = p.defaultColor || '#76b7b2';
    $('rp-famis').value = (p.famis_locations || []).join(', ');
    refreshCategorySelect(p.category);
  }
  function refreshPropertySelect(selectId) {
    const keep = selectId != null ? selectId : sel.value;
    sel.innerHTML = '';
    for (const p of [...roster.properties].sort((a, b) => a.name.localeCompare(b.name))) {
      const opt = document.createElement('option');
      opt.value = p.id; opt.textContent = `${p.name} — ${p.category}`;
      sel.append(opt);
    }
    if (keep && roster.properties.some(p => p.id === keep)) sel.value = keep;
    loadFieldsFor(sel.value);
  }
  sel.addEventListener('change', () => loadFieldsFor(sel.value));

  // ---- boundary draw + style ----
  const currentStyle = () => ({
    color: $('edit-color').value,
    weight: Number($('edit-weight').value),
    fillOpacity: Number($('edit-fill').value),
    dashArray: $('edit-dash').checked ? '6 4' : null,
  });
  $('edit-weight').addEventListener('input', () => $('edit-weight-val').textContent = $('edit-weight').value);
  $('edit-fill').addEventListener('input', () => $('edit-fill-val').textContent = $('edit-fill').value);

  // Draw markers/circles/rectangles/rotate + polygon-cut are off; edit/drag/remove are ON and wired below.
  map.pm.addControls({ position: 'topleft', drawMarker: false, drawCircle: false,
    drawCircleMarker: false, drawText: false, drawRectangle: false, rotateMode: false, cutPolygon: false });

  map.on('pm:create', e => {
    const entry = roster.properties.find(p => p.id === sel.value);
    if (!entry) { alert('Pick an active property first.'); e.layer.remove(); return; }
    const isPoly = e.shape === 'Polygon';
    const geo = e.layer.toGeoJSON();
    geo.properties = {
      id: entry.id, name: entry.name, category: entry.category,
      famis_locations: (entry.famis_locations || []).slice(),
      style: currentStyle(), kind: isPoly ? 'polygon' : 'polyline', notes: '',
    };
    fc.features.push(geo);
    e.layer.remove(); rerender(); autosaveBounds();
    status(`Added ${geo.properties.kind} for ${entry.name} (${fc.features.length} total). Export boundaries to publish.`);
  });

  // Geoman edited/dragged a shape → write the new geometry back to its fc feature.
  map.on('pm:update', e => {
    const f = e.layer && e.layer.feature;
    const i = f ? fc.features.indexOf(f) : -1;
    if (i < 0) return;
    fc.features[i].geometry = e.layer.toGeoJSON().geometry;
    autosaveBounds(); rerender();
    status('Updated boundary geometry. Export boundaries to publish.');
  });

  // Geoman removed a shape → drop its fc feature so it doesn't reappear on rerender
  // and the property becomes deletable.
  map.on('pm:remove', e => {
    const f = e.layer && e.layer.feature;
    const i = f ? fc.features.indexOf(f) : -1;
    if (i < 0) return;
    const name = fc.features[i].properties && fc.features[i].properties.name;
    fc.features.splice(i, 1);
    autosaveBounds(); rerender();
    status(`Removed a boundary${name ? ' for ' + name : ''} (${fc.features.length} left). Export boundaries to publish.`);
  });

  function rerender() {
    for (const g of app.groups.values()) map.removeLayer(g);
    app.groups = window.SOULayers.render(map, fc);
    window.SOULayers.buildPanel($('layer-panel'), lib.buildLayerTree(roster), app.groups, map, { showUnmapped: true });
    for (const g of app.groups.values()) g.addTo(map);
    // Re-sync the panel checkboxes to reality (all layers are on) — else the tri-state
    // control desyncs after every edit (parent toggle would need two clicks).
    const panel = $('layer-panel');
    for (const cb of panel.querySelectorAll('.prop input:not([disabled])')) cb.checked = true;
    for (const pc of panel.querySelectorAll('.cat > summary > input:not([disabled])')) { pc.checked = true; pc.indeterminate = false; }
  }

  // ---- roster operations ----
  $('rp-add').addEventListener('click', () => {
    const name = $('rp-name').value.trim();
    if (!name) { alert('Enter a name first.'); return; }
    const id = slugify(name);
    if (!id) { alert('Name must contain letters or numbers.'); return; }
    if (roster.properties.some(p => p.id === id)) {
      alert(`A property with id "${id}" already exists — pick a different name.`); return;
    }
    const catVal = $('rp-category').value;
    const category = (catVal === '__new__' || !catVal) ? (lastCat || roster.categories[0]) : catVal;
    roster.properties.push({
      id, name, category, famis_locations: parseFamis($('rp-famis').value),
      defaultColor: $('rp-color').value, mapped: false,
    });
    autosaveRoster(); refreshPropertySelect(id); rerender();
    status(`Added property "${name}". Export properties.json to publish.`);
  });

  $('rp-save').addEventListener('click', () => {
    const id = sel.value;
    const p = roster.properties.find(x => x.id === id);
    if (!p) { alert('Select a property first.'); return; }
    const name = $('rp-name').value.trim();
    if (!name) { alert('Name cannot be empty.'); return; }
    const catVal = $('rp-category').value;
    const category = (catVal === '__new__' || !catVal) ? p.category : catVal;
    const color = $('rp-color').value;
    p.name = name; p.category = category; p.defaultColor = color;
    p.famis_locations = parseFamis($('rp-famis').value);
    // propagate identity + color to any already-drawn boundaries of this property
    for (const f of fc.features) {
      if (f.properties && f.properties.id === id) {
        f.properties.name = name;
        f.properties.category = category;
        f.properties.famis_locations = p.famis_locations.slice();
        f.properties.style = { ...(f.properties.style || {}), color };
      }
    }
    autosaveRoster(); autosaveBounds(); refreshPropertySelect(id); rerender();
    status(`Saved "${name}". Export properties.json (and boundaries, if a color changed) to publish.`);
  });

  $('rp-delete').addEventListener('click', () => {
    const id = sel.value;
    const p = roster.properties.find(x => x.id === id);
    if (!p) { alert('Select a property first.'); return; }
    const n = fc.features.filter(f => f.properties && f.properties.id === id).length;
    if (n > 0) {
      alert(`"${p.name}" has ${n} drawn boundary/ies — remove the shape(s) with the Geoman delete tool (top-left, the trash icon) first, then delete the property.`);
      return;
    }
    if (!confirm(`Delete property "${p.name}"? (It has no boundaries.)`)) return;
    roster.properties = roster.properties.filter(x => x.id !== id);
    autosaveRoster(); refreshPropertySelect(); rerender();
    status(`Deleted "${p.name}". Export properties.json to publish.`);
  });

  // ---- exports / imports ----
  function download(filename, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href);
  }

  $('edit-export').addEventListener('click', () => {
    download('boundaries.geojson', JSON.stringify(fc, null, 2) + '\n', 'application/geo+json');
    clearBoundsDraft();   // published → no longer "unsaved"
    status('Exported boundaries.geojson — commit it to data/ to publish.');
  });
  $('rp-export').addEventListener('click', () => {
    download('properties.json',
      JSON.stringify({ categories: roster.categories, properties: roster.properties }, null, 2) + '\n',
      'application/json');
    clearRosterDraft();
    status('Exported properties.json — commit it to data/ to publish.');
  });

  $('edit-import').addEventListener('change', ev => {
    const file = ev.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result);
        if (!parsed || !Array.isArray(parsed.features)) throw new Error('bad');
        fc.features = parsed.features; clearBoundsDraft(); rerender();
        status(`Imported ${fc.features.length} boundaries.`);
      } catch { alert('Not a valid boundaries GeoJSON.'); }
    };
    r.readAsText(file); ev.target.value = '';
  });
  $('rp-import').addEventListener('change', ev => {
    const file = ev.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => {
      try {
        const parsed = JSON.parse(r.result);
        if (!parsed || !Array.isArray(parsed.properties) || !Array.isArray(parsed.categories)) throw new Error('bad');
        if (!confirm(`Replace the current property list (${roster.properties.length}) with the imported one (${parsed.properties.length})?`)) return;
        roster.categories = parsed.categories; roster.properties = parsed.properties;
        clearRosterDraft(); refreshPropertySelect(); rerender();
        status(`Imported ${roster.properties.length} properties.`);
      } catch { alert('Not a valid properties.json.'); }
    };
    r.readAsText(file); ev.target.value = '';
  });

  // ---- init ----
  refreshPropertySelect();
  rerender();   // reflect any restored drafts
  status('Edit mode ready. Draw/edit boundaries, or open “Manage properties” to edit the list — then Export.');
}
