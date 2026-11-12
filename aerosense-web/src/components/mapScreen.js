import L from 'leaflet';

let mapInstance = null;
let droneMarker = null;
let pathPolyline = null;
let waypointsGroup = null;
let tileLayer = null;
let currentLayerType = 'dark'; // 'dark' or 'satellite'

export function renderMapScreen(container, latestData, history) {
  // Use real user geolocation if available, otherwise telemetry location
  let initialLat = latestData.latitude;
  let initialLng = latestData.longitude;

  container.innerHTML = `
    <div class="map-view-wrapper" style="position: relative; width: 100%; height: 100%; display: flex; flex-direction: column;">
      <!-- Heads-Up Telemetry HUD -->
      <div class="map-telemetry-hud" style="position: absolute; top: 12px; left: 12px; right: 12px; z-index: 1000; background: rgba(11,15,25,0.9); backdrop-filter: blur(12px); padding: 8px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.1); display: flex; justify-content: space-between; font-size: 11px; color: #fff;">
        <div class="map-hud-item">
          <span class="map-hud-label" style="color: #64748B; font-size: 9px;">GPS COORD</span>
          <span class="map-hud-val" id="hud-latlng" style="font-weight: 700; color: #38BDF8;">${initialLat.toFixed(4)}, ${initialLng.toFixed(4)}</span>
        </div>
        <div class="map-hud-item">
          <span class="map-hud-label" style="color: #64748B; font-size: 9px;">ALTITUDE</span>
          <span class="map-hud-val" id="hud-alt" style="font-weight: 700; color: #10B981;">${latestData.altitude.toFixed(1)} m</span>
        </div>
        <div class="map-hud-item">
          <span class="map-hud-label" style="color: #64748B; font-size: 9px;">AIR SPEED</span>
          <span class="map-hud-val" id="hud-spd" style="font-weight: 700; color: #F59E0B;">${latestData.speed.toFixed(1)} km/h</span>
        </div>
        <div class="map-hud-item">
          <span class="map-hud-label" style="color: #64748B; font-size: 9px;">LOGGED</span>
          <span class="map-hud-val" id="hud-pts" style="font-weight: 700; color: #A855F7;">${history.length} pts</span>
        </div>
      </div>

      <!-- Map Canvas Container -->
      <div id="map-canvas" style="width: 100%; height: 100%; min-height: 480px; flex: 1; background: #070A12; position: relative; z-index: 1;"></div>

      <!-- Floating Controls -->
      <div class="map-floating-controls" style="position: absolute; bottom: 20px; right: 16px; z-index: 1000; display: flex; flex-direction: column; gap: 8px;">
        <button id="map-btn-recenter" class="map-control-btn" title="Center on User / Drone Location" style="width: 42px; height: 42px; border-radius: 50%; background: #0B0F19; border: 1px solid rgba(255,255,255,0.2); color: #38BDF8; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="7"/><circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/>
          </svg>
        </button>
        <button id="map-btn-layer" class="map-control-btn" title="Toggle Google Satellite / Dark Layer" style="width: 42px; height: 42px; border-radius: 50%; background: #0B0F19; border: 1px solid rgba(255,255,255,0.2); color: #10B981; display: flex; align-items: center; justify-content: center; cursor: pointer;">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>
          </svg>
        </button>
      </div>
    </div>
  `;

  setTimeout(() => {
    initLeafletMap(latestData, history);

    // Check GPS Geolocation
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          if (mapInstance && droneMarker) {
            const newPos = [userLat, userLng];
            mapInstance.setView(newPos, 15);
            droneMarker.setLatLng(newPos);

            const hudCoord = document.getElementById('hud-latlng');
            if (hudCoord) hudCoord.textContent = `${userLat.toFixed(4)}, ${userLng.toFixed(4)}`;
          }
        },
        (err) => { console.log('Using default telemetry map location'); },
        { timeout: 8000, enableHighAccuracy: true }
      );
    }
  }, 100);

  // Recenter button
  const recenterBtn = container.querySelector('#map-btn-recenter');
  if (recenterBtn) {
    recenterBtn.addEventListener('click', () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition((pos) => {
          const userPos = [pos.coords.latitude, pos.coords.longitude];
          if (mapInstance && droneMarker) {
            mapInstance.setView(userPos, 16, { animate: true });
            droneMarker.setLatLng(userPos);
          }
        });
      } else if (mapInstance && droneMarker) {
        mapInstance.setView(droneMarker.getLatLng(), 15, { animate: true });
      }
    });
  }

  // Layer toggle button
  const layerBtn = container.querySelector('#map-btn-layer');
  if (layerBtn) {
    layerBtn.addEventListener('click', () => {
      toggleMapLayer();
    });
  }
}

function initLeafletMap(latestData, history) {
  const mapEl = document.getElementById('map-canvas');
  if (!mapEl) return;

  if (mapInstance) {
    mapInstance.remove();
    mapInstance = null;
  }

  const center = [latestData.latitude, latestData.longitude];
  mapInstance = L.map('map-canvas', {
    center: center,
    zoom: 14,
    zoomControl: false,
    attributionControl: false
  });

  // Base Tile Layer (Dark theme with Google Satellite support)
  setTileLayer('dark');

  // Flight Path Polyline
  const latLngs = history.map(h => [h.latitude, h.longitude]);
  pathPolyline = L.polyline(latLngs, {
    color: '#06B6D4',
    weight: 4,
    opacity: 0.9,
    dashArray: '6, 8'
  }).addTo(mapInstance);

  // Waypoints Layer Group
  waypointsGroup = L.layerGroup().addTo(mapInstance);
  renderWaypoints(history);

  // Custom Drone Marker
  const droneIcon = L.divIcon({
    className: 'custom-drone-icon',
    html: `
      <div style="position: relative; width: 40px; height: 40px; display: flex; align-items: center; justify-content: center;">
        <div style="position: absolute; width: 40px; height: 40px; border-radius: 50%; border: 2px solid #06B6D4; background: rgba(6, 182, 212, 0.25); animation: pulse 1.6s infinite;"></div>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFFFFF" stroke-width="2.5">
          <circle cx="12" cy="12" r="3" fill="#10B981"/>
          <line x1="6" y1="6" x2="18" y2="18"/>
          <line x1="18" y1="6" x2="6" y2="18"/>
        </svg>
      </div>
    `,
    iconSize: [40, 40],
    iconAnchor: [20, 20]
  });

  droneMarker = L.marker(center, { icon: droneIcon }).addTo(mapInstance);
  droneMarker.bindPopup(`
    <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #0F172A; padding: 4px;">
      <strong style="color: #0284C7; font-size: 13px;">AeroGuard Unit</strong><br/>
      Altitude: ${latestData.altitude.toFixed(1)} m<br/>
      Speed: ${latestData.speed.toFixed(1)} km/h<br/>
      AQI: <strong>${latestData.aqi}</strong> (${latestData.aqiStatus})
    </div>
  `);

  setTimeout(() => {
    if (mapInstance) mapInstance.invalidateSize();
  }, 200);
}

function setTileLayer(type) {
  if (tileLayer && mapInstance) {
    mapInstance.removeLayer(tileLayer);
  }
  currentLayerType = type;
  if (type === 'satellite') {
    // Google Satellite Tile Layer
    tileLayer = L.tileLayer('https://mt1.google.com/vt/lyrs=s&x={x}&y={y}&z={z}', {
      maxZoom: 20
    }).addTo(mapInstance);
  } else {
    // CartoDB Dark Base Layer
    tileLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19
    }).addTo(mapInstance);
  }
}

function toggleMapLayer() {
  setTileLayer(currentLayerType === 'dark' ? 'satellite' : 'dark');
}

function renderWaypoints(history) {
  if (!waypointsGroup) return;
  waypointsGroup.clearLayers();

  history.forEach((pt, i) => {
    if (i % 2 !== 0 && i !== history.length - 1) return;

    const circleMarker = L.circleMarker([pt.latitude, pt.longitude], {
      radius: 6,
      fillColor: pt.aqiColor || '#10B981',
      color: '#FFFFFF',
      weight: 1.5,
      opacity: 0.95,
      fillOpacity: 0.85
    });

    circleMarker.bindPopup(`
      <div style="font-family: 'Plus Jakarta Sans', sans-serif; font-size: 12px; color: #0F172A; min-width: 140px; padding: 4px;">
        <strong style="color: ${pt.aqiColor || '#10B981'}">Waypoint #${i + 1}</strong><br/>
        Time: ${new Date(pt.timestamp).toLocaleTimeString()}<br/>
        AQI: <strong>${pt.aqi}</strong> (${pt.aqiStatus})<br/>
        Smoke MQ-2: ${pt.gases.gas1.toFixed(1)} ppm<br/>
        CO MQ-7: ${pt.gases.gas2.toFixed(1)} ppm<br/>
        VOC MQ-135: ${pt.gases.gas3.toFixed(1)} ppm<br/>
        Alt: ${pt.altitude.toFixed(1)} m
      </div>
    `);

    waypointsGroup.addLayer(circleMarker);
  });
}

export function updateMapTelemetry(latestData, history) {
  if (!mapInstance || !droneMarker) return;

  const newPos = [latestData.latitude, latestData.longitude];
  droneMarker.setLatLng(newPos);

  if (pathPolyline) {
    const latLngs = history.map(h => [h.latitude, h.longitude]);
    pathPolyline.setLatLngs(latLngs);
  }

  // Update HUD
  const hudCoord = document.getElementById('hud-latlng');
  const hudAlt = document.getElementById('hud-alt');
  const hudSpd = document.getElementById('hud-spd');
  const hudPts = document.getElementById('hud-pts');

  if (hudCoord) hudCoord.textContent = `${latestData.latitude.toFixed(4)}, ${latestData.longitude.toFixed(4)}`;
  if (hudAlt) hudAlt.textContent = `${latestData.altitude.toFixed(1)} m`;
  if (hudSpd) hudSpd.textContent = `${latestData.speed.toFixed(1)} km/h`;
  if (hudPts) hudPts.textContent = `${history.length} pts`;
}
