// js/map.js — base map + basemap switcher. Plain script (references global L). Exposes window.SOUMap.
(function () {
  const SOU_CENTER = [42.1877985, -122.6927259]; // Wightman St ∩ Lee St, SOU campus (tunable)
  const SOU_ZOOM = 17;

  // Two keyless XYZ sources: one good aerial + a street map. Esri World Imagery is
  // recent, sub-meter Maxar, sharp to ~z19-20 over campus. (Esri Clarity [pre-2012] and
  // USGS/NAIP [too low-res] were dropped 2026-07-22 — Zack: "just need one good aerial".)
  function baseLayers() {
    return {
      'Aerial': L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Imagery © Esri, Maxar, Earthstar Geographics', maxNativeZoom: 19, maxZoom: 21 }),
      'Street map': L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap contributors', maxNativeZoom: 19, maxZoom: 21 }),
    };
  }

  // The default base — must be a key in baseLayers(). Change this string to re-default.
  const DEFAULT_BASE = 'Aerial';

  function initMap(elementId) {
    const map = L.map(elementId, { zoomControl: true }).setView(SOU_CENTER, SOU_ZOOM);
    const bases = baseLayers();
    bases[DEFAULT_BASE].addTo(map);
    L.control.layers(bases, null, { position: 'bottomleft', collapsed: false }).addTo(map);
    return map;
  }

  window.SOUMap = { initMap, SOU_CENTER, SOU_ZOOM };
})();
