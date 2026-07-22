// js/map.js — base map. Plain script (references global L). Exposes window.SOUMap.
(function () {
  const SOU_CENTER = [42.1876, -122.6703]; // Ashland main campus (tunable)
  const SOU_ZOOM = 16;

  function initMap(elementId) {
    const map = L.map(elementId, { zoomControl: true }).setView(SOU_CENTER, SOU_ZOOM);
    L.tileLayer(
      'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
      {
        attribution: 'Imagery © Esri, Maxar, Earthstar Geographics',
        maxNativeZoom: 19,
        maxZoom: 21,
      }
    ).addTo(map);
    return map;
  }

  window.SOUMap = { initMap, SOU_CENTER, SOU_ZOOM };
})();
