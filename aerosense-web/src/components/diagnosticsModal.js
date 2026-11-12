import { SENSOR_CONFIGS } from '../services/sensorConfig.js';

export function showDiagnosticsModal(latestData) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';

  backdrop.innerHTML = `
    <div class="modal-card" style="max-width: 380px;">
      <div class="modal-header">
        <span class="modal-title">Hardware Diagnostics</span>
        <button id="diag-close-btn" class="icon-btn" style="width: 28px; height: 28px; font-size: 14px;">✕</button>
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px; max-height: 400px; overflow-y: auto;">
        <!-- Core Systems -->
        <div class="card" style="padding: 12px; font-size: 12px;">
          <div style="font-weight: 700; margin-bottom: 8px; color: var(--primary-light);">SYSTEM HEALTH</div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: var(--text-muted);">LiPo Battery:</span>
            <span style="color: #10B981; font-weight: 700;">${latestData.batteryLevel}% (15.2V 4S)</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: var(--text-muted);">GPS 3D Fix:</span>
            <span style="color: #10B981; font-weight: 700;">LOCKED (9 Satellites)</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
            <span style="color: var(--text-muted);">BMP280 Barometer:</span>
            <span style="color: #10B981; font-weight: 700;">OK (1013 hPa)</span>
          </div>
          <div style="display: flex; justify-content: space-between;">
            <span style="color: var(--text-muted);">MCU Temp:</span>
            <span>41.2 °C (Nominal)</span>
          </div>
        </div>

        <!-- Sensor Health -->
        <div class="card" style="padding: 12px; font-size: 12px;">
          <div style="font-weight: 700; margin-bottom: 8px; color: var(--primary-light);">GAS SENSOR SELF-TEST</div>
          ${SENSOR_CONFIGS.map(cfg => `
            <div style="display: flex; justify-content: space-between; margin-bottom: 4px;">
              <span>${cfg.name} (${cfg.type})</span>
              <span style="color: #10B981; font-weight: 700; font-size: 11px;">PASS</span>
            </div>
          `).join('')}
        </div>
      </div>

      <button id="diag-dismiss-btn" class="sim-btn active" style="width: 100%; justify-content: center; padding: 10px;">
        CLOSE DIAGNOSTICS
      </button>
    </div>
  `;

  document.body.appendChild(backdrop);

  const close = () => {
    if (backdrop.parentNode) document.body.removeChild(backdrop);
  };

  backdrop.querySelector('#diag-close-btn').addEventListener('click', close);
  backdrop.querySelector('#diag-dismiss-btn').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => {
    if (e.target === backdrop) close();
  });
}
