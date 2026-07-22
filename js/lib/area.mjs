// Spherical polygon area. Input rings are GeoJSON order: [lng, lat].
const R = 6378137; // earth radius, meters
const toRad = d => (d * Math.PI) / 180;

export function ringAreaSqMeters(coords) {
  const n = coords.length;
  if (n < 3) return 0;
  let total = 0;
  for (let i = 0; i < n; i++) {
    const [lng1, lat1] = coords[i];
    const [lng2, lat2] = coords[(i + 1) % n];
    total += toRad(lng2 - lng1) * (2 + Math.sin(toRad(lat1)) + Math.sin(toRad(lat2)));
  }
  return Math.abs((total * R * R) / 2);
}

export function formatArea(sqm) {
  const sqft = sqm * 10.7639104;
  const acres = sqm / 4046.8564224;
  return { sqm, sqft, acres, label: `${acres.toFixed(2)} ac (${Math.round(sqft).toLocaleString()} sq ft)` };
}
