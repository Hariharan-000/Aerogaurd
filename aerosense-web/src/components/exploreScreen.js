import { exportTelemetryCSV } from '../services/exportService.js';

export function renderExploreScreen(container, data, history, onModeChange, onOpenConnectionModal, onOpenDiagnosticsModal, onReplayIntro, onOpenOps, onOpenUnitTests) {
  container.innerHTML = `
    <div class="settings-list">
      <div class="section-title">Reliability & Operations Center</div>

      <div class="settings-item" id="btn-open-ops">
        <div class="settings-item-left">
          <div class="settings-icon">🛡️</div>
          <div>
            <div class="settings-title">Unified Live Operations Dashboard</div>
            <div class="settings-subtitle">Freshness badges, R0 calibration, brownout & fault monitoring</div>
          </div>
        </div>
        <span style="font-size: 11px; padding: 4px 10px; border-radius: 12px; background: rgba(16, 185, 129, 0.15); color: #10B981; font-weight: 700;">
          OPEN OPS
        </span>
      </div>

      <div class="settings-item" id="btn-run-tests">
        <div class="settings-item-left">
          <div class="settings-icon">🧪</div>
          <div>
            <div class="settings-title">Run Reliability Unit Tests</div>
            <div class="settings-subtitle">Execute Priority 1 & 2 automated verification suite</div>
          </div>
        </div>
        <span style="font-size: 11px; padding: 4px 10px; border-radius: 12px; background: rgba(6, 182, 212, 0.15); color: var(--primary); font-weight: 700;">
          RUN TESTS
        </span>
      </div>

      <div class="section-title" style="margin-top: 14px;">Mission Tour & Briefing</div>
      
      <div class="settings-item" id="btn-replay-intro">
        <div class="settings-item-left">
          <div class="settings-icon">🎬</div>
          <div>
            <div class="settings-title">Replay Mission Intro Tour</div>
            <div class="settings-subtitle">Launch holographic animated onboarding tour</div>
          </div>
        </div>
        <span style="font-size: 11px; padding: 4px 10px; border-radius: 12px; background: rgba(6, 182, 212, 0.15); color: var(--primary); font-weight: 700;">
          REPLAY
        </span>
      </div>

      <div class="section-title" style="margin-top: 14px;">Telemetry & Flight Data</div>
      
      <div class="settings-item" id="btn-export-csv">
        <div class="settings-item-left">
          <div class="settings-icon">📥</div>
          <div>
            <div class="settings-title">Export Telemetry Log (CSV)</div>
            <div class="settings-subtitle">Download complete multi-sensor flight log</div>
          </div>
        </div>
        <span style="font-size: 12px; color: var(--primary); font-weight: 600;">DOWNLOAD</span>
      </div>

      <div class="section-title" style="margin-top: 14px;">Operational Mode</div>
      
      <div class="settings-item" id="btn-toggle-flight-mode">
        <div class="settings-item-left">
          <div class="settings-icon">${data.mode === 'DRONE' ? '🚁' : '🎒'}</div>
          <div>
            <div class="settings-title">Current Mode: ${data.mode}</div>
            <div class="settings-subtitle">${data.mode === 'DRONE' ? 'Airborne Quadcopter telemetry' : 'Ground-level portable sensor pack'}</div>
          </div>
        </div>
        <span style="font-size: 11px; padding: 4px 10px; border-radius: 12px; background: rgba(6, 182, 212, 0.15); color: var(--primary); font-weight: 700;">
          SWITCH
        </span>
      </div>

      <div class="section-title" style="margin-top: 14px;">Hardware & Connectivity</div>
      
      <div class="settings-item" id="btn-open-connection">
        <div class="settings-item-left">
          <div class="settings-icon">📡</div>
          <div>
            <div class="settings-title">ESP32 BLE Connection</div>
            <div class="settings-subtitle">${data.deviceId} • RSSI ${data.rssi} dBm</div>
          </div>
        </div>
        <span style="color: #10B981; font-size: 12px; font-weight: 600;">ACTIVE</span>
      </div>

      <div class="settings-item" id="btn-open-diagnostics">
        <div class="settings-item-left">
          <div class="settings-icon">⚙️</div>
          <div>
            <div class="settings-title">Hardware Diagnostics</div>
            <div class="settings-subtitle">Inspect sensor health, LiPo battery, GPS fix</div>
          </div>
        </div>
        <span style="color: var(--text-dim); font-size: 16px;">›</span>
      </div>

      <div class="section-title" style="margin-top: 14px;">About & Hardware Reliability Specifications</div>

      <div class="card" style="padding: 14px; font-size: 12px; line-height: 1.6; color: var(--text-muted);">
        <strong style="color: var(--text-main);">AeroGuard Reliability Suite v2.0</strong><br/>
        Microcontroller: ESP32-WROOM-32D (Dual-Core 240MHz)<br/>
        Sensor Filtering: Polarized Electrolytic Capacitor (+ to 5V, other leg to GND, &ge; 10V rating)<br/>
        Voltage Conditioning: 10k/20k Dividers scaling 0-5V sensor outputs to 0-3.3V ADC<br/>
        Gas Targets: MQ-4 (CH4), MQ-7 (CO), MQ-136 (H2S), MQ-137 (NH3)<br/>
        Environmental: BME680 (Temp, Hum, Pressure)<br/>
        Positioning: u-blox GPS Engine with active antenna<br/>
        Warm-Up Protocol: 3-minute heater stabilization before flight measurement
      </div>
    </div>
  `;

  // Bind Open Ops
  const opsBtn = container.querySelector('#btn-open-ops');
  if (opsBtn && onOpenOps) {
    opsBtn.addEventListener('click', onOpenOps);
  }

  // Bind Run Tests
  const runTestsBtn = container.querySelector('#btn-run-tests');
  if (runTestsBtn && onOpenUnitTests) {
    runTestsBtn.addEventListener('click', onOpenUnitTests);
  }

  // Bind Replay Intro
  const introBtn = container.querySelector('#btn-replay-intro');
  if (introBtn && onReplayIntro) {
    introBtn.addEventListener('click', onReplayIntro);
  }

  // Bind Export CSV
  const exportBtn = container.querySelector('#btn-export-csv');
  if (exportBtn) {
    exportBtn.addEventListener('click', () => {
      exportTelemetryCSV(history);
    });
  }

  // Bind Mode Toggle
  const modeBtn = container.querySelector('#btn-toggle-flight-mode');
  if (modeBtn) {
    modeBtn.addEventListener('click', () => {
      onModeChange(data.mode === 'DRONE' ? 'PORTABLE' : 'DRONE');
    });
  }

  // Bind Connection Modal
  const connBtn = container.querySelector('#btn-open-connection');
  if (connBtn) {
    connBtn.addEventListener('click', onOpenConnectionModal);
  }

  // Bind Diagnostics Modal
  const diagBtn = container.querySelector('#btn-open-diagnostics');
  if (diagBtn) {
    diagBtn.addEventListener('click', onOpenDiagnosticsModal);
  }
}
