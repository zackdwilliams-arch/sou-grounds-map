// Per-feature Leaflet path styling + category color defaults.
// Palette: 8 high-contrast hues that read on dark aerial imagery.
export const CATEGORY_COLORS = {
  'Academic Buildings':      '#4e79a7',
  'Residence Halls':         '#59a14f',
  'Cascade Complex':         '#9c755f',
  'Athletics & Recreation':  '#e15759',
  'Student Services':        '#edc948',
  'Facilities & Operations': '#b07aa1',
  'Campus Areas & Grounds':  '#76b7b2',
  'Student Family Housing':  '#ff9da7',
};

export function defaultColorForCategory(cat) {
  return CATEGORY_COLORS[cat] || '#888888';
}

export function featureToPathStyle(props) {
  const s = props.style || {};
  const isPoly = props.kind === 'polygon';
  return {
    color: s.color || defaultColorForCategory(props.category),
    weight: s.weight ?? 3,
    opacity: 1,
    fill: isPoly,
    fillOpacity: isPoly ? (s.fillOpacity ?? 0.25) : 0,
    dashArray: s.dashArray ?? null,
  };
}
