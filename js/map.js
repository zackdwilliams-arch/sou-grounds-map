// js/map.js — base map + basemap switcher. Plain script (references global L). Exposes window.SOUMap.
(function () {
  const SOU_CENTER = [42.1877985, -122.6927259]; // Wightman St ∩ Lee St, SOU campus (tunable)
  const SOU_ZOOM = 17;

  // Minimal ArcGIS ImageServer/MapServer "exportImage" layer, so a NON-tile-cached
  // service (like Ashland's orthophoto) works without pulling in esri-leaflet. It builds
  // a per-tile exportImage request from the tile's Web-Mercator bbox.
  const ArcGISExportLayer = L.TileLayer.extend({
    getTileUrl(coords) {
      const N = 20037508.342789244;               // half the Web-Mercator world (m)
      const span = (2 * N) / Math.pow(2, coords.z);
      const xmin = -N + coords.x * span;
      const ymax = N - coords.y * span;
      return this.options.baseUrl + '/exportImage'
        + `?bbox=${xmin},${ymax - span},${xmin + span},${ymax}`
        + '&bboxSR=3857&imageSR=3857&size=256,256&format=jpgpng&transparent=true&f=image';
    },
  });
  const arcgisImage = (url, opts) => new ArcGISExportLayer('', Object.assign({ baseUrl: url }, opts));

  // Keyless aerials + a street map.
  //   Esri 2024   → Esri World Imagery Wayback release 2024-01 (#41468): recent sub-meter
  //                 Maxar AND cloud-free over Ashland. The LIVE World Imagery is dropped
  //                 because its current capture has a large cloud over N/central Ashland
  //                 (verified persists across zooms 16-18, 2026-07-22).
  //   Ashland 2012→ City orthophoto, 25cm, cloud-free (flown clear) — sharpest, but 2012.
  //   (Esri Clarity + USGS/NAIP dropped 2026-07-22.)
  function baseLayers() {
    return {
      'Aerial (Esri 2024)': L.tileLayer(
        'https://wayback.maptiles.arcgis.com/arcgis/rest/services/World_Imagery/WMTS/1.0.0/default028mm/MapServer/tile/41468/{z}/{y}/{x}',
        { attribution: 'Imagery © Esri, Maxar, Earthstar Geographics (Wayback 2024-01)', maxNativeZoom: 19, maxZoom: 21 }),
      'Aerial (Ashland 2012, 25cm)': arcgisImage(
        'https://gis.ashland.or.us/imageserver23/rest/services/Imagery_2012_3857/ImageServer',
        { attribution: 'Imagery © City of Ashland (2012, 25cm)', maxNativeZoom: 20, maxZoom: 21 }),
      'Street map': L.tileLayer(
        'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
        { attribution: '© OpenStreetMap contributors', maxNativeZoom: 19, maxZoom: 21 }),
    };
  }

  // The default base — must be a key in baseLayers(). Change this string to re-default.
  const DEFAULT_BASE = 'Aerial (Esri 2024)';

  function initMap(elementId) {
    const map = L.map(elementId, { zoomControl: true }).setView(SOU_CENTER, SOU_ZOOM);
    const bases = baseLayers();
    bases[DEFAULT_BASE].addTo(map);
    L.control.layers(bases, null, { position: 'bottomleft', collapsed: false }).addTo(map);
    return map;
  }

  window.SOUMap = { initMap, SOU_CENTER, SOU_ZOOM };
})();
