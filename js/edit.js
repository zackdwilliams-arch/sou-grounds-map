// js/edit.js — ES module, loaded only under ?edit=1. Uses global L + Geoman.
const DRAFT_KEY = 'sou-grounds-map:draft';

export function initEditMode(app) {
  const { map, roster, fc } = app;
  const lib = window.SOULib;
  const $ = id => document.getElementById(id);
  const status = msg => { $('edit-status').textContent = msg; };

  // Restore a draft if present (crash-safety), else keep the committed fc.
  const draft = localStorage.getItem(DRAFT_KEY);
  if (draft) {
    try {
      const parsed = JSON.parse(draft);
      if (parsed.features && parsed.features.length && confirm('Restore unsaved draft from this browser?')) {
        fc.features = parsed.features;
        rerender();
      }
    } catch { /* ignore bad draft */ }
  }

  // Populate the active-property <select> from the roster.
  const sel = $('edit-prop');
  for (const p of [...roster.properties].sort((a, b) => a.name.localeCompare(b.name))) {
    const opt = document.createElement('option');
    opt.value = p.id; opt.textContent = `${p.name} — ${p.category}`;
    opt.dataset.category = p.category; opt.dataset.name = p.name;
    sel.append(opt);
  }

  const currentStyle = () => ({
    color: $('edit-color').value,
    weight: Number($('edit-weight').value),
    fillOpacity: Number($('edit-fill').value),
    dashArray: $('edit-dash').checked ? '6 4' : null,
  });
  $('edit-weight').addEventListener('input', () => $('edit-weight-val').textContent = $('edit-weight').value);
  $('edit-fill').addEventListener('input', () => $('edit-fill-val').textContent = $('edit-fill').value);
  // When active property changes, preload its default color.
  sel.addEventListener('change', () => {
    const p = roster.properties.find(x => x.id === sel.value);
    if (p && p.defaultColor) $('edit-color').value = p.defaultColor;
  });
  sel.dispatchEvent(new Event('change'));

  // Enable Geoman drawing controls.
  map.pm.addControls({ position: 'topleft', drawMarker: false, drawCircle: false,
    drawCircleMarker: false, drawText: false, drawRectangle: false, rotateMode: false });

  // On create: build a feature for the active property and add to fc.
  map.on('pm:create', e => {
    const opt = sel.selectedOptions[0];
    if (!opt) { alert('Pick an active property first.'); e.layer.remove(); return; }
    const isPoly = e.shape === 'Polygon';
    const geo = e.layer.toGeoJSON();
    const props = {
      id: opt.value, name: opt.dataset.name, category: opt.dataset.category,
      famis_locations: (roster.properties.find(p => p.id === opt.value)?.famis_locations) || [opt.dataset.name],
      style: currentStyle(), kind: isPoly ? 'polygon' : 'polyline', notes: '',
    };
    geo.properties = props;
    fc.features.push(geo);
    e.layer.remove();            // remove the raw Geoman layer; rerender draws the styled one
    rerender();
    autosave();
    status(`Added ${props.kind} for ${props.name} (${fc.features.length} total). Export to publish.`);
  });

  function rerender() {
    for (const g of app.groups.values()) map.removeLayer(g);
    app.groups = window.SOULayers.render(map, fc);
    window.SOULayers.buildPanel(document.getElementById('layer-panel'), lib.buildLayerTree(roster), app.groups, map, { showUnmapped: true });
    for (const g of app.groups.values()) g.addTo(map);
  }
  function autosave() { localStorage.setItem(DRAFT_KEY, JSON.stringify(fc)); }

  // Export → download boundaries.geojson.
  $('edit-export').addEventListener('click', () => {
    const blob = new Blob([JSON.stringify(fc, null, 2) + '\n'], { type: 'application/geo+json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'boundaries.geojson'; a.click();
    URL.revokeObjectURL(a.href);
    status('Exported. Commit data/boundaries.geojson to publish.');
  });

  // Import → load a local geojson (e.g. the committed file) to continue editing.
  $('edit-import').addEventListener('change', ev => {
    const file = ev.target.files[0]; if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        fc.features = parsed.features || [];
        rerender(); autosave(); status(`Imported ${fc.features.length} features.`);
      } catch { alert('Not valid GeoJSON.'); }
    };
    reader.readAsText(file);
  });

  status('Edit mode ready. Pick a property, draw a shape, then Export.');
}
