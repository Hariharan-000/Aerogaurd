import { SENSOR_CONFIGS, getSensorStatus } from '../services/sensorConfig.js';

export function renderHomeScreen(container, data, onNavigate, onModeToggle) {
  const { aqi, aqiStatus, aqiColor, aqiText, temperature, humidity, pressure, altitude, mode, isConnected, deviceId, gases } = data;

  const circumference = 2 * Math.PI * 75; // radius = 75
  const normalizedAqi = Math.min(300, aqi);
  const strokeOffset = circumference - (normalizedAqi / 300) * circumference;

  container.innerHTML = `
    <!-- Top Status Banner -->
    <div class="status-row">
      <div class="connection-pill">
        <span class="status-indicator ${isConnected ? 'live' : ''}"></span>
        <span>${isConnected ? 'ESP32 BLE CONNECTED' : 'DISCONNECTED'}</span>
      </div>
      <button id="home-mode-toggle-btn" class="mode-pill" title="Tap to switch Drone/Portable mode">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
          <path d="${mode === 'DRONE' ? 'M12 2v20M2 12h20M4.93 4.93l14.14 14.14M19.07 4.93L4.93 19.07' : 'M20 12V8H6a2 2 0 0 1-2-2c0-1.1.9-2 2-2h12v4M4 6v12c0 1.1.9 2 2 2h14v-4'}"/>
        </svg>
        ${mode} MODE
      </button>
    </div>

    <!-- Radial AQI Gauge -->
    <div class="aqi-container">
      <div class="aqi-gauge">
        <svg class="aqi-svg" viewBox="0 0 180 180">
          <circle class="aqi-bg-circle" cx="90" cy="90" r="75" />
          <circle 
            class="aqi-prog-circle" 
            cx="90" 
            cy="90" 
            r="75" 
            stroke="${aqiColor}"
            stroke-dasharray="${circumference}"
            stroke-dashoffset="${strokeOffset}"
          />
        </svg>
        <div class="aqi-center-data">
          <span class="aqi-val" style="color: ${aqiColor}">${aqi}</span>
          <span class="aqi-unit">AIR QUALITY INDEX</span>
          <span class="aqi-badge" style="background: ${aqiColor}22; color: ${aqiColor}; border: 1px solid ${aqiColor}66">
            ${aqiStatus}
          </span>
        </div>
      </div>
      <p class="aqi-advisory">${aqiText}</p>
    </div>

    <!-- Environmental KPI Grid -->
    <div class="env-grid">
      <div class="env-card">
        <div class="env-card-header">
          <span class="env-card-title">Temperature</span>
          <div class="env-card-icon" style="background: rgba(239, 68, 68, 0.15); color: #F87171;">🌡️</div>
        </div>
        <div>
          <span class="env-card-val">${temperature.toFixed(1)}</span>
          <span class="env-card-unit">°C</span>
        </div>
      </div>

      <div class="env-card">
        <div class="env-card-header">
          <span class="env-card-title">Humidity</span>
          <div class="env-card-icon" style="background: rgba(56, 189, 248, 0.15); color: #38BDF8;">💧</div>
        </div>
        <div>
          <span class="env-card-val">${humidity.toFixed(1)}</span>
          <span class="env-card-unit">%</span>
        </div>
      </div>

      <div class="env-card">
        <div class="env-card-header">
          <span class="env-card-title">Barometer</span>
          <div class="env-card-icon" style="background: rgba(16, 185, 129, 0.15); color: #34D399;">⏱️</div>
        </div>
        <div>
          <span class="env-card-val">${pressure.toFixed(0)}</span>
          <span class="env-card-unit">hPa</span>
        </div>
      </div>

      <div class="env-card">
        <div class="env-card-header">
          <span class="env-card-title">Drone Alt</span>
          <div class="env-card-icon" style="background: rgba(168, 85, 247, 0.15); color: #C084FC;">✈️</div>
        </div>
        <div>
          <span class="env-card-val">${altitude.toFixed(1)}</span>
          <span class="env-card-unit">m</span>
        </div>
      </div>
    </div>

    <!-- Multi-Gas Telemetry Snapshot -->
    <div class="gas-section">
      <div class="section-title">
        <span>7-Sensor Multi-Gas Array</span>
        <button id="view-monitor-btn" style="background: transparent; border: none; color: var(--primary); font-size: 11px; cursor: pointer; font-weight: 700;">
          VIEW CHARTS →
        </button>
      </div>
      <div class="card" style="padding: 12px 16px;">
        ${SENSOR_CONFIGS.map(cfg => {
          const val = gases[cfg.key] || 0;
          const status = getSensorStatus(val, cfg);
          return `
            <div style="display: flex; align-items: center; justify-content: space-between; padding: 7px 0; border-bottom: 1px solid rgba(255, 255, 255, 0.05);">
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-size: 10px; font-family: var(--font-mono); background: rgba(255, 255, 255, 0.08); padding: 2px 6px; border-radius: 4px; color: var(--primary-light);">
                  ${cfg.type}
                </span>
                <span style="font-size: 13px; font-weight: 500;">${cfg.name}</span>
              </div>
              <div style="display: flex; align-items: center; gap: 8px;">
                <span style="font-family: var(--font-mono); font-size: 13px; font-weight: 700;">
                  ${val.toFixed(1)} <span style="font-size: 10px; color: var(--text-dim);">${cfg.unit}</span>
                </span>
                <span style="width: 8px; height: 8px; border-radius: 50%; background: ${status.color}; box-shadow: 0 0 6px ${status.color};"></span>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    </div>
  `;

  // Bind Events
  const modeBtn = container.querySelector('#home-mode-toggle-btn');
  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      onModeToggle(mode === 'DRONE' ? 'PORTABLE' : 'DRONE');
    });
  }

  const viewMonitorBtn = container.querySelector('#view-monitor-btn');
  if (viewMonitorBtn) {
    viewMonitorBtn.addEventListener('click', () => onNavigate('monitor'));
  }
}
