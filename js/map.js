// js/map.js — base map + basemap switcher. Plain script (references global L). Exposes window.SOUMap.
(function () {
  const SOU_CENTER = [42.1877985, -122.6927259]; // Wightman St ∩ Lee St, SOU campus (tunable)
  const SOU_ZOOM = 17;

  // All keyless XYZ sources. Aerials have different capture dates, so if one has
  // cloud cover over campus at a given zoom, switch to another.
  //   Esri / Esri Clarity  → sub-meter, sharp to ~z19-20 (Clarity is a different capture,
  //                          so it's the go-to when Esri has cloud over a spot).
  //   USGS/NAIP            → USDA orthoimagery, acquired cloud-free, but only native to
  //                          ~z16 here, so maxNativeZoom is capped and Leaflet upscales
  //                          (blurry-but-present) past it instead of showing blank tiles.
  //   OSM                  → street map.
  function baseLayers() {
    return {
      'Aerial — Esri': L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Imagery © Esri, Maxar, Earthstar Geographics', maxNativeZoom: 19, maxZoom: 21 }),
      'Aerial — Esri Clarity': L.tileLayer(
        'https://clarity.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Imagery © Esri (Clarity), Maxar, Earthstar Geographics', maxNativeZoom: 19, maxZoom: 21 }),
      'Aerial — USGS/NAIP (cloud-free)': L.tileLayer(
        'https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}',
        { attribution: 'Imagery © USGS The National Map (NAIP)', maxNativeZoom: 16, maxZoom: 21 }),
      'Street map — OSM': L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap contributors', maxNativeZoom: 19, maxZoom: 21 }),
    };
  }

  // The default base — must be a key in baseLayers(). Change this string to re-default.
  const DEFAULT_BASE = 'Aerial — Esri';

  function initMap(elementId) {
    const map = L.map(elementId, { zoomControl: true }).setView(SOU_CENTER, SOU_ZOOM);
    const bases = baseLayers();
    bases[DEFAULT_BASE].addTo(map);
    L.control.layers(bases, null, { position: 'bottomleft', collapsed: false }).addTo(map);
    return map;
  }

  window.SOUMap = { initMap, SOU_CENTER, SOU_ZOOM };
})();
