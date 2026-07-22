// js/map.js — base map + basemap switcher. Plain script (references global L). Exposes window.SOUMap.
(function () {
  const SOU_CENTER = [42.1877985, -122.6927259]; // Wightman St ∩ Lee St, SOU campus (tunable)
  const SOU_ZOOM = 17;

  // Keyless: one cloud-free aerial + a street map.
  //   Aerial → Esri World Imagery Wayback release 2024-01 (#41468): recent sub-meter Maxar
  //            AND cloud-free over Ashland (the LIVE World Imagery has a cloud baked into
  //            its current capture over N/central Ashland — verified persists z16-18).
  // The City of Ashland 2012 orthophoto (25cm) was removed 2026-07-22 — it rendered all
  // black for Zack. To revisit for the extra detail: the gis.ashland.or.us Image Service
  // isn't tile-cached, so it was driven via a custom exportImage TileLayer; the black is
  // likely a nodata/transparency default or a hotlink/cert issue on that host (see git
  // history at eac420c for the working exportImage layer code).
  function baseLayers() {
    return {
      'Aerial': L.tileLayer(
        'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/41468/{z}/{y}/{x}',
        { attribution: 'Imagery © Esri, Maxar, Earthstar Geographics (Wayback 2024-01)', maxNativeZoom: 19, maxZoom: 21 }),
      // CARTO Positron: OSM-derived light-gray street map with sparse, subtle labels
      // ("very minimal text"). Swap 'light_all' → 'light_nolabels' for zero text.
      'Street map': L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap contributors © CARTO', subdomains: 'abcd', maxNativeZoom: 20, maxZoom: 21 }),
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
