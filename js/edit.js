// js/edit.js — ES module, loaded only under ?edit=1. Uses global L + Geoman.
// LEFT panel = draw/style + file export/import. RIGHT panel (#layer-panel) = the
// structure editor (delegated). fc.features is authoritative.
const BOUNDS_KEY = 'sou-grounds-map:draft';
const ROSTER_KEY = 'sou-grounds-map:roster-draft';

export function initEditMode(app) {
  const { map } = app;
  const { roster, fc } = app;
  const lib = window.SOULib;
  const $ = id => document.getElementById(id);
  const status = msg => { $('edit-status').textContent = msg; };
  const sel = $('edit-prop');

  let openEditorId = null;   // id of the property whose inline editor is open (survives rerenders)
  let firstRender = true;    // first render shows everything; later renders preserve the user's show/hide

  const slugify = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
  const parseFamis = t => t.split(',').map(x => x.trim()).filter(Boolean);
  const autosaveBounds = () => localStorage.setItem(BOUNDS_KEY, JSON.stringify(fc));
  const autosaveRoster = () => localStorage.setItem(ROSTER_KEY, JSON.stringify({ categories: roster.categories, properties: roster.properties }));
  const clearBoundsDraft = () => localStorage.removeItem(BOUNDS_KEY);
  const clearRosterDraft = () => localStorage.removeItem(ROSTER_KEY);
  const gcCategories = () => { roster.categories = roster.categories.filter(c => roster.properties.some(p => p.category === c)); };

  // ---- restore drafts (they exist only while there are unexported edits) ----
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

  // ---- left panel: active draw property + style ----
  function refreshPropertySelect(selectId) {
    const keep = selectId != null ? selectId : sel.value;
    sel.innerHTML = '';
    for (const p of [...roster.properties].sort((a, b) => a.name.localeCompare(b.name))) {
      const opt = document.createElement('option');
      opt.value = p.id; opt.textContent = `${p.name} — ${p.category}`;
      sel.append(opt);
    }
    if (keep && roster.properties.some(p => p.id === keep)) sel.value = keep;
    const cur = roster.properties.find(p => p.id === sel.value);
    if (cur && cur.defaultColor) $('edit-color').value = cur.defaultColor;
  }
  sel.addEventListener('change', () => {
    const p = roster.properties.find(x => x.id === sel.value);
    if (p && p.defaultColor) $('edit-color').value = p.defaultColor;
  });

  const currentStyle = () => ({
    color: $('edit-color').value,
    weight: Number($('edit-weight').value),
    fillOpacity: Number($('edit-fill').value),
    dashArray: $('edit-dash').checked ? '6 4' : null,
  });
  $('edit-weight').addEventListener('input', () => $('edit-weight-val').textContent = $('edit-weight').value);
  $('edit-fill').addEventListener('input', () => $('edit-fill-val').textContent = $('edit-fill').value);

  // ---- Geoman: draw/edit/remove all sync back to fc ----
  map.pm.addControls({ position: 'topleft', drawMarker: false, drawCircle: false,
    drawCircleMarker: false, drawText: false, drawRectangle: false, rotateMode: false, cutPolygon: false });

  map.on('pm:create', e => {
    const entry = roster.properties.find(p => p.id === sel.value);
    if (!entry) { alert('Pick an active property first (left panel).'); e.layer.remove(); return; }
    const isPoly = e.shape === 'Polygon';
    const geo = e.layer.toGeoJSON();
    geo.properties = {
      id: entry.id, name: entry.name, category: entry.category,
      famis_locations: (entry.famis_locations || []).slice(),
      style: currentStyle(), kind: isPoly ? 'polygon' : 'polyline', notes: '',
    };
    fc.features.push(geo);
    e.layer.remove(); rerender(entry.id); autosaveBounds();
    status(`Added ${geo.properties.kind} for ${entry.name} (${fc.features.length} total). Export boundaries to publish.`);
  });
  // Vertex-edit / drag: sync geometry ONLY — a full rerender would destroy the layer
  // Geoman is actively editing and orphan its drag markers.
  map.on('pm:update', e => {
    const f = e.layer && e.layer.feature;
    const i = f ? fc.features.indexOf(f) : -1;
    if (i < 0) return;
    fc.features[i].geometry = e.layer.toGeoJSON().geometry;
    autosaveBounds();
    status('Updated boundary geometry. Export boundaries to publish.');
  });
  map.on('pm:remove', e => {
    const f = e.layer && e.layer.feature;
    const i = f ? fc.features.indexOf(f) : -1;
    if (i < 0) return;
    const nm = fc.features[i].properties && fc.features[i].properties.name;
    fc.features.splice(i, 1);
    autosaveBounds(); rerender();
    status(`Removed a boundary${nm ? ' for ' + nm : ''} (${fc.features.length} left). Export boundaries to publish.`);
  });

  // Which mapped property ids are currently checked (visible)? null before any panel exists.
  function currentlyShownIds() {
    const rows = $('layer-panel').querySelectorAll('.prop');
    if (!rows.length) return null;
    const s = new Set();
    rows.forEach(r => {
      const cb = r.querySelector('input'); const nm = r.querySelector('.prop-name');
      if (cb && !cb.disabled && cb.checked && nm && nm.dataset.id) s.add(nm.dataset.id);
    });
    return s;
  }
  function applyVisibility(desired) {
    const panel = $('layer-panel');
    panel.querySelectorAll('.prop').forEach(r => {
      const cb = r.querySelector('input'); const nm = r.querySelector('.prop-name');
      if (!cb || cb.disabled || !nm) return;
      const show = desired === null ? true : desired.has(nm.dataset.id);
      cb.checked = show;
      const g = app.groups.get(nm.dataset.id);
      if (g) { if (show) g.addTo(map); else map.removeLayer(g); }
    });
    panel.querySelectorAll('.cat').forEach(cat => {
      const pc = cat.querySelector('summary > input');
      if (!pc) return;
      const kids = [...cat.querySelectorAll('.prop input:not([disabled])')];
      const state = lib.computeParentState(kids.map(k => k.checked));
      pc.checked = state === 'checked'; pc.indeterminate = state === 'indeterminate'; pc.disabled = kids.length === 0;
    });
  }
  function rerender(showAlso) {
    const desired = firstRender ? null : currentlyShownIds();
    if (desired && showAlso) desired.add(showAlso);
    for (const g of app.groups.values()) map.removeLayer(g);
    // Leaflet doesn't tear down permanent-tooltip DOM synchronously — sweep stale labels.
    document.querySelectorAll('.leaflet-tooltip.boundary-label').forEach(el => el.remove());
    app.groups = window.SOULayers.render(map, fc);
    window.SOULayers.buildPanel($('layer-panel'), lib.buildLayerTree(roster), app.groups, map, { showUnmapped: true, editable: true });
    applyVisibility(desired);
    firstRender = false;
    // re-open an inline editor that a map/structural action rebuilt out from under
    if (openEditorId && roster.properties.some(p => p.id === openEditorId)) {
      const nm = $('layer-panel').querySelector(`.prop-name[data-id="${openEditorId}"]`);
      if (nm) openInlineEditor(openEditorId, nm.closest('.prop'));
    }
  }

  // ---- right panel: structure editing (delegated) ----
  function renameGroup(oldName, newName) {
    newName = (newName || '').trim();
    if (!newName || newName === oldName) return;
    if (roster.categories.includes(newName)) roster.categories = roster.categories.filter(c => c !== oldName); // merge
    else roster.categories = roster.categories.map(c => c === oldName ? newName : c);                          // rename in place
    for (const p of roster.properties) if (p.category === oldName) p.category = newName;
    for (const f of fc.features) if (f.properties && f.properties.category === oldName) f.properties.category = newName;
    gcCategories();
    autosaveRoster(); autosaveBounds(); refreshPropertySelect(); rerender();
    status(`Renamed group "${oldName}" → "${newName}".`);
  }
  function addProperty(name, category) {
    name = (name || '').trim(); if (!name) return;
    const id = slugify(name);
    if (!id) { alert('Name needs letters or numbers.'); return; }
    if (roster.properties.some(p => p.id === id)) { alert(`A property "${id}" already exists.`); return; }
    roster.properties.push({ id, name, category, famis_locations: [], defaultColor: lib.defaultColorForCategory(category), mapped: false });
    autosaveRoster(); refreshPropertySelect(id); rerender();
    status(`Added "${name}" to ${category}. Click its name to set FAMIS locations / color.`);
  }
  function deleteProperty(id) {
    const p = roster.properties.find(x => x.id === id); if (!p) return;
    const n = fc.features.filter(f => f.properties && f.properties.id === id).length;
    if (n > 0) { alert(`"${p.name}" has ${n} drawn boundary/ies — remove the shape(s) with the Geoman trash tool (top-left) first.`); return; }
    if (!confirm(`Delete property "${p.name}"?`)) return;
    roster.properties = roster.properties.filter(x => x.id !== id);
    openEditorId = null; gcCategories();
    autosaveRoster(); refreshPropertySelect(); rerender();
    status(`Deleted "${p.name}".`);
  }
  function savePropFrom(box, id) {
    const p = roster.properties.find(x => x.id === id); if (!p || !box) return;
    const name = box.querySelector('.pe-name').value.trim();
    if (!name) { alert('Name required.'); return; }
    let category = box.querySelector('.pe-group').value;
    if (category === '__newgroup__') category = p.category;
    if (!roster.categories.includes(category)) roster.categories.push(category); // persist a brand-new group
    const color = box.querySelector('.pe-color').value;
    const famis = parseFamis(box.querySelector('.pe-famis').value);
    p.name = name; p.category = category; p.defaultColor = color; p.famis_locations = famis;
    for (const f of fc.features) if (f.properties && f.properties.id === id) {
      f.properties.name = name; f.properties.category = category; f.properties.famis_locations = famis.slice();
      f.properties.style = { ...(f.properties.style || {}), color };
    }
    openEditorId = null; gcCategories();
    autosaveRoster(); autosaveBounds(); refreshPropertySelect(id); rerender();
    status(`Saved "${name}".`);
  }
  function openInlineEditor(id, rowEl) {
    document.querySelectorAll('#layer-panel .prop-editor').forEach(e => e.remove());
    const p = roster.properties.find(x => x.id === id);
    if (!p || !rowEl) return;
    openEditorId = id;
    const box = document.createElement('div'); box.className = 'prop-editor';
    const name = mkInput('text', p.name, 'pe-name');
    const group = document.createElement('select'); group.className = 'pe-group';
    // always include the property's current category, even if it's not in roster.categories,
    // so Save can't silently reassign it to categories[0].
    for (const c of new Set([p.category, ...roster.categories])) {
      const o = document.createElement('option'); o.value = c; o.textContent = c; if (c === p.category) o.selected = true; group.append(o);
    }
    const nw = document.createElement('option'); nw.value = '__newgroup__'; nw.textContent = '＋ New group…'; group.append(nw);
    group.addEventListener('change', () => {
      if (group.value !== '__newgroup__') return;
      const nm = (prompt('New group name:') || '').trim();
      if (nm) {
        if (![...group.options].some(o => o.value === nm)) {
          const o = document.createElement('option'); o.value = nm; o.textContent = nm + ' (new)'; group.insertBefore(o, nw);
        }
        group.value = nm;
      } else { group.value = p.category; }
    });
    const color = mkInput('color', p.defaultColor || '#76b7b2', 'pe-color');
    const famis = mkInput('text', (p.famis_locations || []).join(', '), 'pe-famis'); famis.placeholder = 'FAMIS locations, comma separated';
    const btns = document.createElement('div'); btns.className = 'pe-row';
    btns.append(mkBtn('Save', 'save-prop', id), mkBtn('Delete', 'delete-prop', id), mkBtn('Cancel', 'cancel-prop'));
    box.append(field('Name', name), field('Group', group), field('Default color', color), field('FAMIS location(s)', famis), btns);
    rowEl.insertAdjacentElement('afterend', box);
    name.focus();
  }
  function mkInput(type, val, cls) { const i = document.createElement('input'); i.type = type; i.value = val; i.className = cls; return i; }
  function mkBtn(text, action, id) { const b = document.createElement('button'); b.type = 'button'; b.className = 'ed-btn'; b.textContent = text; b.dataset.action = action; if (id) b.dataset.id = id; return b; }
  function field(lbl, el) { const w = document.createElement('label'); w.className = 'pe-field'; w.textContent = lbl; w.append(el); return w; }

  $('layer-panel').addEventListener('click', e => {
    const t = e.target.closest('[data-action]'); if (!t) return;
    const a = t.dataset.action;
    if (a === 'rename-group') { e.preventDefault(); const nn = prompt('Rename group:', t.dataset.cat); if (nn != null) renameGroup(t.dataset.cat, nn); }
    else if (a === 'add-prop') { e.preventDefault(); const nm = prompt(`New property name in "${t.dataset.cat}":`); if (nm) addProperty(nm, t.dataset.cat); }
    else if (a === 'edit-prop') { e.preventDefault(); openInlineEditor(t.dataset.id, t.closest('.prop')); }
    else if (a === 'save-prop') { e.preventDefault(); savePropFrom(t.closest('.prop-editor'), t.dataset.id); }
    else if (a === 'delete-prop') { e.preventDefault(); deleteProperty(t.dataset.id); }
    else if (a === 'cancel-prop') { e.preventDefault(); openEditorId = null; const b = t.closest('.prop-editor'); if (b) b.remove(); }
  });

  // ---- exports / imports (the two files are coupled — warn if one lags) ----
  function download(filename, text, type) {
    const blob = new Blob([text], { type });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = filename; a.click();
    URL.revokeObjectURL(a.href);
  }
  $('edit-export').addEventListener('click', () => {
    download('boundaries.geojson', JSON.stringify(fc, null, 2) + '\n', 'application/geo+json');
    clearBoundsDraft();
    status('Exported boundaries.geojson — commit it to data/ to publish.' + (localStorage.getItem(ROSTER_KEY) ? ' ⚠️ properties.json also has unexported edits — export it too.' : ''));
  });
  $('rp-export').addEventListener('click', () => {
    download('properties.json', JSON.stringify({ categories: roster.categories, properties: roster.properties }, null, 2) + '\n', 'application/json');
    clearRosterDraft();
    status('Exported properties.json — commit it to data/ to publish.' + (localStorage.getItem(BOUNDS_KEY) ? ' ⚠️ boundaries.geojson also has unexported edits — export it too.' : ''));
  });
  $('edit-import').addEventListener('change', ev => {
    const file = ev.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => { try {
      const parsed = JSON.parse(r.result);
      if (!parsed || !Array.isArray(parsed.features)) throw new Error('bad');
      fc.features = parsed.features; clearBoundsDraft(); rerender(); status(`Imported ${fc.features.length} boundaries.`);
    } catch { alert('Not a valid boundaries GeoJSON.'); } };
    r.readAsText(file); ev.target.value = '';
  });
  $('rp-import').addEventListener('change', ev => {
    const file = ev.target.files[0]; if (!file) return;
    const r = new FileReader();
    r.onload = () => { try {
      const parsed = JSON.parse(r.result);
      if (!parsed || !Array.isArray(parsed.properties) || !Array.isArray(parsed.categories)) throw new Error('bad');
      if (!confirm(`Replace the current property list (${roster.properties.length}) with the imported one (${parsed.properties.length})?`)) return;
      roster.categories = parsed.categories; roster.properties = parsed.properties;
      clearRosterDraft(); refreshPropertySelect(); rerender(); status(`Imported ${roster.properties.length} properties.`);
    } catch { alert('Not a valid properties.json.'); } };
    r.readAsText(file); ev.target.value = '';
  });

  // ---- init ----
  refreshPropertySelect();
  rerender();
  status('Edit mode ready. Draw with the tools (left); edit properties/groups in the panel on the right (✎ / ＋ / click a name).');
}
