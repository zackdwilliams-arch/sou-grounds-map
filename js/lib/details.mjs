// Click-for-details popup HTML builder.
export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function buildPopupHtml(props, areaLabel) {
  const famis = (props.famis_locations || []).join(', ') || '—';
  const rows = [
    ['Category', props.category],
    ['FAMIS location(s)', famis],
    props.kind === 'polygon' ? ['Area', areaLabel || '—'] : null,
    props.notes ? ['Notes', props.notes] : null,
  ].filter(Boolean);
  return (
    `<div class="popup"><h3>${escapeHtml(props.name)}</h3>` +
    rows.map(([k, v]) => `<div class="row"><span class="k">${escapeHtml(k)}</span><span class="v">${escapeHtml(v)}</span></div>`).join('') +
    `</div>`
  );
}
