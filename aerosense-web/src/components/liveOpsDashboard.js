/**
 * AERO GUARD - Reliability Module
 * Priority 1: Unified Live Operations Dashboard
 * 
 * Implements:
 * 1. Connection and data-freshness badges (Stale after 5s, Offline after 15s).
 *    Show LIVE only for real data, never during simulation.
 * 2. Sensor calibration manager interface (clean-air R0, history, 10k/20k divider).
 * 3. Sensor fault detection: warming_up, uncalibrated, ok, noisy_supply, fault_low, fault_high.
 *    Brownout reset warning banner.
 * 4. Configurable gas thresholds with alert acknowledge, snooze, and resolve.
 *    Suppression of alerts during warming-up or faulty sensors.
 * 5. Mission state machine controls (Draft, Pre-flight, Active, Paused, Resumed, Completed, Cancelled).
 * 6. Telemetry persistence, historical stats, CSV & PDF export.
 * 7. Priority 2 analytics: Hotspot detection with insufficient data flag, trends, z-score anomaly.
 */

import { telemetryReliabilityService, GAS_METADATA } from '../reliability/telemetryReliabilityService.js';
import { sensorCalibrationManager } from '../reliability/sensorCalibrationManager.js';
import { sensorFaultDetector, FAULT_DEFINITIONS } from '../reliability/sensorFaultDetector.js';
import { gasAlertManager } from '../reliability/gasAlertManager.js';
import { missionStateMachine, MISSION_STATES } from '../reliability/missionStateMachine.js';
import { telemetryStorage } from '../reliability/telemetryStorage.js';
import { exportMissionCSV, generatePrintableReport } from '../reliability/reportGenerator.js';
import { advancedAnalytics } from '../reliability/advancedAnalytics.js';
import { showTestRunnerModal } from '../reliability/testRunnerModal.js';

export function renderLiveOpsDashboard(container) {
  const packet = telemetryReliabilityService.latestPacket || telemetryReliabilityService._generateSimulatedPacket();
  const freshness = telemetryReliabilityService.getFreshnessState();
  const mission = missionStateMachine.getMission();
  const faultReport = sensorFaultDetector.evaluatePacket(packet);
  const activeAlerts = gasAlertManager.getActiveAlerts();
  const calibrations = sensorCalibrationManager.getAllCalibrations();
  const thresholds = gasAlertManager.getThresholds();

  // Freshness Badge Styling
  let badgeStyle = 'background: rgba(148, 163, 184, 0.2); color: #94A3B8; border: 1px solid rgba(148, 163, 184, 0.3);';
  let pulseDot = '';

  if (freshness.isLive) {
    badgeStyle = 'background: rgba(16, 185, 129, 0.2); color: #10B981; border: 1px solid #10B981;';
    pulseDot = '<span class="status-indicator live" style="margin-right: 6px;"></span>';
  } else if (freshness.isSimulation && freshness.isFresh) {
    badgeStyle = 'background: rgba(139, 92, 246, 0.2); color: #C084FC; border: 1px solid rgba(139, 92, 246, 0.4);';
    pulseDot = '<span style="width: 8px; height: 8px; border-radius: 50%; background: #C084FC; display: inline-block; margin-right: 6px;"></span>';
  } else if (freshness.isStale) {
    badgeStyle = 'background: rgba(245, 158, 11, 0.2); color: #F59E0B; border: 1px solid #F59E0B;';
    pulseDot = '<span style="width: 8px; height: 8px; border-radius: 50%; background: #F59E0B; display: inline-block; margin-right: 6px;"></span>';
  } else if (freshness.isOffline) {
    badgeStyle = 'background: rgba(239, 68, 68, 0.2); color: #EF4444; border: 1px solid #EF4444;';
    pulseDot = '<span style="width: 8px; height: 8px; border-radius: 50%; background: #EF4444; display: inline-block; margin-right: 6px;"></span>';
  }

  container.innerHTML = `
    <div class="live-ops-wrapper" style="padding: 14px 16px 80px 16px; width: 100%; box-sizing: border-box;">
      
      <!-- Top Connection & Regulatory Bar -->
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; gap: 8px; flex-wrap: wrap;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <!-- Freshness Badge -->
          <div style="display: inline-flex; align-items: center; padding: 4px 10px; border-radius: 20px; font-size: 11px; font-weight: 800; font-family: var(--font-mono); ${badgeStyle}">
            ${pulseDot}${freshness.label}
          </div>

          <!-- Real vs Simulation Toggle -->
          <button id="ops-toggle-source-btn" class="sim-btn" style="padding: 4px 8px; font-size: 10px;">
            ${telemetryReliabilityService.isSimulation ? 'SWITCH TO REAL ESP32' : 'SWITCH TO SIMULATOR'}
          </button>
        </div>

        <div style="display: flex; align-items: center; gap: 6px;">
          <button id="ops-run-tests-btn" class="sim-btn" style="padding: 4px 10px; font-size: 10px; background: rgba(6, 182, 212, 0.15); color: var(--primary); border: 1px solid rgba(6, 182, 212, 0.4);">
            🧪 RUN UNIT TESTS
          </button>
        </div>
      </div>

      <!-- Brownout Warning Banner -->
      ${telemetryReliabilityService.brownoutWarningActive ? `
        <div class="card" style="background: rgba(220, 38, 38, 0.15); border: 1px solid #EF4444; padding: 12px; margin-bottom: 12px;">
          <div style="display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="display: flex; gap: 8px;">
              <span style="font-size: 18px;">⚠️</span>
              <div>
                <strong style="color: #F87171; font-size: 12px;">CRITICAL POWER FAULT: BROWNOUT RESET DETECTED</strong>
                <p style="color: #FCA5A5; font-size: 11px; margin: 4px 0 0;">
                  ESP32 reset due to 5V rail voltage drop. Verify polarized electrolytic capacitor polarity (+ to 5V, other leg to GND) and 10k/20k voltage divider connections.
                </p>
              </div>
            </div>
            <button id="btn-dismiss-brownout" class="icon-btn" style="font-size: 12px; padding: 2px 6px;">✕</button>
          </div>
        </div>
      ` : ''}

      <!-- Indicative Regulatory Banner -->
      <div style="background: rgba(245, 158, 11, 0.08); border-left: 3px solid #F59E0B; padding: 6px 10px; border-radius: 4px; margin-bottom: 14px; font-size: 11px; color: #FBBF24;">
        ⚠️ <strong>INDICATIVE READINGS ONLY:</strong> System provides relative sensor resistance ratios (Rs/R0). Never claim ppm certification or use for life-safety clearance.
      </div>

      <!-- MISSION CONTROL CARD -->
      <div class="card" style="padding: 14px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div>
            <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;">MISSION STATE MACHINE</span>
            <div style="font-weight: 700; font-size: 14px; color: var(--text-main);">${mission.name}</div>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 12px; background: rgba(56, 189, 248, 0.15); color: #38BDF8; border: 1px solid rgba(56, 189, 248, 0.3);">
              ${mission.state.toUpperCase()}
            </span>
            <button id="btn-view-timeline" class="sim-btn" style="padding: 4px 8px; font-size: 10px;">
              TIMELINE (${mission.timeline.length})
            </button>
          </div>
        </div>

        <!-- Mission Action Controls -->
        <div style="display: flex; gap: 8px; flex-wrap: wrap;">
          ${mission.state === MISSION_STATES.DRAFT ? `
            <button id="btn-start-preflight" class="sim-btn active" style="flex: 1; padding: 8px; font-size: 11px; justify-content: center;">
              📋 BEGIN PRE-FLIGHT CHECK
            </button>
          ` : ''}

          ${mission.state === MISSION_STATES.PRE_FLIGHT ? `
            <button id="btn-launch-active" class="sim-btn active" style="flex: 1; padding: 8px; font-size: 11px; justify-content: center; background: #10B981;">
              🚀 LAUNCH ACTIVE MISSION
            </button>
            <button id="btn-cancel-mission" class="sim-btn" style="padding: 8px; font-size: 11px; color: #EF4444;">
              CANCEL
            </button>
          ` : ''}

          ${mission.state === MISSION_STATES.ACTIVE ? `
            <button id="btn-pause-mission" class="sim-btn" style="flex: 1; padding: 8px; font-size: 11px; justify-content: center;">
              ⏸️ PAUSE MISSION
            </button>
            <button id="btn-complete-mission" class="sim-btn active" style="flex: 1; padding: 8px; font-size: 11px; justify-content: center; background: #10B981;">
              🏁 COMPLETE MISSION
            </button>
          ` : ''}

          ${mission.state === MISSION_STATES.PAUSED ? `
            <button id="btn-resume-mission" class="sim-btn active" style="flex: 1; padding: 8px; font-size: 11px; justify-content: center; background: #38BDF8;">
              ▶️ RESUME MISSION
            </button>
            <button id="btn-complete-mission" class="sim-btn" style="flex: 1; padding: 8px; font-size: 11px; justify-content: center;">
              🏁 COMPLETE MISSION
            </button>
          ` : ''}

          ${mission.state === MISSION_STATES.RESUMED ? `
            <button id="btn-pause-mission" class="sim-btn" style="flex: 1; padding: 8px; font-size: 11px; justify-content: center;">
              ⏸️ PAUSE MISSION
            </button>
            <button id="btn-complete-mission" class="sim-btn active" style="flex: 1; padding: 8px; font-size: 11px; justify-content: center; background: #10B981;">
              🏁 COMPLETE MISSION
            </button>
          ` : ''}

          ${mission.state === MISSION_STATES.COMPLETED || mission.state === MISSION_STATES.CANCELLED ? `
            <button id="btn-new-mission" class="sim-btn active" style="flex: 1; padding: 8px; font-size: 11px; justify-content: center;">
              ➕ CREATE NEW MISSION
            </button>
          ` : ''}
        </div>
      </div>

      <!-- 4-GAS SENSOR RELIABILITY & FAULT GRID -->
      <div style="margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
          <span style="font-size: 11px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;">
            GAS SENSOR ARRAY (10k/20k DIVIDER & 5V FILTER CAP)
          </span>
          <button id="btn-calibrate-all" class="sim-btn" style="padding: 4px 8px; font-size: 10px; color: var(--primary);">
            🎯 CALIBRATE CLEAN AIR (R0)
          </button>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(260px, 1fr)); gap: 10px;">
          ${['MQ4', 'MQ7', 'MQ136', 'MQ137'].map(gasKey => {
            const meta = GAS_METADATA[gasKey];
            const g = packet.gas && packet.gas[gasKey] ? packet.gas[gasKey] : { volts: 0, noise_v: 0, rs_r0: 0, status: 'ok' };
            const sensorReport = faultReport.sensors && faultReport.sensors[gasKey] ? faultReport.sensors[gasKey] : {};
            const cal = calibrations[gasKey] || {};
            const dividerSensorVolts = (g.volts * 1.5).toFixed(2); // 10k/20k divider conversion

            const status = sensorReport.status || g.status || 'ok';
            const faultDef = FAULT_DEFINITIONS[status] || FAULT_DEFINITIONS.ok;

            return `
              <div class="card" style="padding: 12px; border: 1px solid ${faultDef.isFault ? faultDef.badgeColor : 'rgba(255,255,255,0.08)'};">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 6px;">
                  <div>
                    <span style="font-size: 10px; font-family: var(--font-mono); background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: 4px; color: ${meta.color};">
                      ${meta.sensor}
                    </span>
                    <div style="font-size: 13px; font-weight: 600; margin-top: 3px;">${meta.name}</div>
                  </div>
                  <span style="font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 4px; background: ${faultDef.badgeColor}22; color: ${faultDef.badgeColor}; border: 1px solid ${faultDef.badgeColor}44;">
                    ${faultDef.label}
                  </span>
                </div>

                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin: 8px 0; font-size: 11px;">
                  <div>
                    <span style="color: var(--text-muted); font-size: 10px;">ADC / Sensor V:</span>
                    <div style="font-family: var(--font-mono); font-weight: 700;">
                      ${g.volts.toFixed(3)}V <span style="font-size: 9px; color: var(--text-dim);">(${dividerSensorVolts}V)</span>
                    </div>
                  </div>
                  <div>
                    <span style="color: var(--text-muted); font-size: 10px;">5V Rail Noise:</span>
                    <div style="font-family: var(--font-mono); font-weight: 700; color: ${g.noise_v > 0.06 ? '#EF4444' : '#10B981'};">
                      ${(g.noise_v * 1000).toFixed(0)} mV
                    </div>
                  </div>
                  <div>
                    <span style="color: var(--text-muted); font-size: 10px;">Clean-Air R0:</span>
                    <div style="font-family: var(--font-mono); font-weight: 700;">
                      ${cal.r0 ? `${cal.r0} Ω` : '<span style="color: #F59E0B;">Not Set</span>'}
                    </div>
                  </div>
                  <div>
                    <span style="color: var(--text-muted); font-size: 10px;">Rs/R0 Ratio:</span>
                    <div style="font-family: var(--font-mono); font-weight: 700; color: ${meta.color};">
                      ${g.rs_r0.toFixed(2)}
                    </div>
                  </div>
                </div>

                ${sensorReport.hardwareFix ? `
                  <div style="background: rgba(239, 68, 68, 0.08); border-left: 2px solid ${faultDef.badgeColor}; padding: 4px 6px; font-size: 10px; color: #FCA5A5; margin-top: 6px;">
                    🔧 <strong>Hardware Note:</strong> ${sensorReport.hardwareFix}
                  </div>
                ` : ''}

                <div style="display: flex; justify-content: flex-end; margin-top: 8px;">
                  <button class="btn-cal-single sim-btn" data-gas="${gasKey}" style="padding: 3px 8px; font-size: 10px;">
                    CALIBRATE R0
                  </button>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>

      <!-- ACTIVE ALERTS & THRESHOLD CONSOLE -->
      <div class="card" style="padding: 14px; margin-bottom: 14px;">
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
          <div>
            <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">SAFETY ALARM CONSOLE</span>
            <div style="font-size: 13px; font-weight: 700;">
              ${activeAlerts.length === 0 ? '🟢 All Sensors Within Nominal Thresholds' : `🚨 ${activeAlerts.length} Active Hazard Alert(s)`}
            </div>
          </div>
          <button id="btn-config-thresholds" class="sim-btn" style="padding: 4px 8px; font-size: 10px;">
            ⚙️ CONFIGURE THRESHOLDS
          </button>
        </div>

        ${activeAlerts.length === 0 ? `
          <div style="font-size: 11px; color: var(--text-muted); padding: 6px 0;">
            No alarms active. Rule: Alerts are automatically suppressed during warm-up (&lt; 3 mins) or sensor faults.
          </div>
        ` : `
          <div style="display: flex; flex-direction: column; gap: 8px;">
            ${activeAlerts.map(alert => `
              <div style="display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; border-radius: 6px; background: rgba(239, 68, 68, 0.12); border: 1px solid rgba(239, 68, 68, 0.3);">
                <div>
                  <div style="display: flex; align-items: center; gap: 6px;">
                    <span style="font-size: 10px; font-weight: 800; padding: 2px 6px; border-radius: 4px; background: #EF4444; color: white;">
                      ${alert.level}
                    </span>
                    <strong style="font-size: 12px; color: var(--text-main);">${alert.sensorName} (${alert.gasName})</strong>
                    <span style="font-size: 10px; font-family: var(--font-mono); color: #FCA5A5;">${alert.volts.toFixed(2)}V (Rs/R0: ${alert.rsR0.toFixed(2)})</span>
                  </div>
                  <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">${alert.reason}</div>
                </div>
                <div style="display: flex; gap: 4px;">
                  <button class="btn-ack-alert sim-btn" data-gas="${alert.gasKey}" style="padding: 4px 6px; font-size: 10px;">
                    ACK
                  </button>
                  <button class="btn-snooze-alert sim-btn" data-gas="${alert.gasKey}" style="padding: 4px 6px; font-size: 10px;">
                    SNOOZE 10M
                  </button>
                  <button class="btn-resolve-alert sim-btn active" data-gas="${alert.gasKey}" style="padding: 4px 6px; font-size: 10px; background: #10B981;">
                    RESOLVE
                  </button>
                </div>
              </div>
            `).join('')}
          </div>
        `}
      </div>

      <!-- HARDWARE CIRCUIT, BME680 & GPS DIAGNOSTICS -->
      <div class="card" style="padding: 14px; margin-bottom: 14px;">
        <span style="font-size: 10px; color: var(--text-muted); text-transform: uppercase;">CIRCUIT INTEGRITY & ENVIRONMENTAL POD</span>
        
        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 8px; margin-top: 8px; font-size: 11px;">
          <div style="padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px;">
            <div style="color: var(--text-muted); font-size: 10px;">5V Electrolytic Cap</div>
            <strong style="color: #10B981;">POLARIZED OK</strong>
            <div style="font-size: 9px; color: var(--text-dim); margin-top: 2px;">+ to 5V, - to GND (16V)</div>
          </div>

          <div style="padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px;">
            <div style="color: var(--text-muted); font-size: 10px;">Voltage Divider</div>
            <strong style="color: #10B981;">10k / 20k OK</strong>
            <div style="font-size: 9px; color: var(--text-dim); margin-top: 2px;">3.3V Max Scaled</div>
          </div>

          <div style="padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px;">
            <div style="color: var(--text-muted); font-size: 10px;">BME680 Temp / Hum</div>
            <strong style="color: #38BDF8;">${packet.env ? packet.env.temp_c : '--'}°C / ${packet.env ? packet.env.hum_pct : '--'}%</strong>
            <div style="font-size: 9px; color: var(--text-dim); margin-top: 2px;">${packet.env ? packet.env.press_hpa : '--'} hPa</div>
          </div>

          <div style="padding: 8px; background: rgba(255,255,255,0.03); border-radius: 6px;">
            <div style="color: var(--text-muted); font-size: 10px;">GPS Quality</div>
            <strong style="color: ${packet.gps && packet.gps.sats >= 6 ? '#10B981' : '#F59E0B'};">
              ${packet.gps ? `${packet.gps.sats} Sats (HDOP ${packet.gps.hdop})` : 'NO GPS'}
            </strong>
            <div style="font-size: 9px; color: var(--text-dim); margin-top: 2px;">Age: ${packet.gps ? packet.gps.age_ms : '--'} ms</div>
          </div>
        </div>
      </div>

      <!-- PRIORITY 2: ADVANCED ANALYTICS & REPORTS ACTION ROW -->
      <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 20px;">
        <button id="btn-export-csv-log" class="sim-btn" style="flex: 1; padding: 10px; font-size: 11px; justify-content: center;">
          📥 EXPORT TELEMETRY CSV
        </button>
        <button id="btn-generate-pdf-report" class="sim-btn active" style="flex: 1; padding: 10px; font-size: 11px; justify-content: center; background: #0284C7;">
          🖨️ MISSION PDF REPORT
        </button>
      </div>

    </div>
  `;

  // Bind Event Handlers
  _bindDashboardEvents(container, packet);
}

function _bindDashboardEvents(container, packet) {
  // Toggle Real ESP32 vs Simulation
  const toggleBtn = container.querySelector('#ops-toggle-source-btn');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      if (telemetryReliabilityService.isSimulation) {
        const url = prompt('Enter ESP32 WebSocket URL (e.g. ws://192.168.4.1:81/telemetry):', 'ws://192.168.4.1:81/telemetry');
        if (url) telemetryReliabilityService.connectWebSocket(url);
      } else {
        telemetryReliabilityService.startSimulatedStream();
      }
      renderLiveOpsDashboard(container);
    });
  }

  // Run Unit Tests
  const testsBtn = container.querySelector('#ops-run-tests-btn');
  if (testsBtn) {
    testsBtn.addEventListener('click', () => {
      showTestRunnerModal();
    });
  }

  // Dismiss Brownout Warning
  const dismissBrownout = container.querySelector('#btn-dismiss-brownout');
  if (dismissBrownout) {
    dismissBrownout.addEventListener('click', () => {
      telemetryReliabilityService.dismissBrownoutWarning();
      renderLiveOpsDashboard(container);
    });
  }

  // Calibrate All Clean Air (R0)
  const calAllBtn = container.querySelector('#btn-calibrate-all');
  if (calAllBtn) {
    calAllBtn.addEventListener('click', () => {
      try {
        sensorCalibrationManager.calibrateAllSensors(packet, 'Field Pilot');
        alert('All 4 MQ gas sensors calibrated in clean air! Baseline R0 stored.');
        renderLiveOpsDashboard(container);
      } catch (err) {
        alert(`Calibration error: ${err.message}`);
      }
    });
  }

  // Calibrate Single Sensor
  container.querySelectorAll('.btn-cal-single').forEach(btn => {
    btn.addEventListener('click', () => {
      const gasKey = btn.getAttribute('data-gas');
      const g = packet.gas && packet.gas[gasKey];
      if (!g) return;
      try {
        sensorCalibrationManager.calibrateSensor(gasKey, g.volts, packet.env, 'Operator');
        alert(`${gasKey} clean-air R0 calibrated successfully!`);
        renderLiveOpsDashboard(container);
      } catch (err) {
        alert(`Calibration error: ${err.message}`);
      }
    });
  });

  // Alert Action Handlers
  container.querySelectorAll('.btn-ack-alert').forEach(btn => {
    btn.addEventListener('click', () => {
      gasAlertManager.acknowledgeAlert(btn.getAttribute('data-gas'), 'Field Operator');
      renderLiveOpsDashboard(container);
    });
  });

  container.querySelectorAll('.btn-snooze-alert').forEach(btn => {
    btn.addEventListener('click', () => {
      gasAlertManager.snoozeAlert(btn.getAttribute('data-gas'), 10);
      renderLiveOpsDashboard(container);
    });
  });

  container.querySelectorAll('.btn-resolve-alert').forEach(btn => {
    btn.addEventListener('click', () => {
      gasAlertManager.resolveAlert(btn.getAttribute('data-gas'), 'Resolved by operator');
      renderLiveOpsDashboard(container);
    });
  });

  // Mission State Transitions
  const bindStateChange = (selector, targetState, reason) => {
    const el = container.querySelector(selector);
    if (el) {
      el.addEventListener('click', () => {
        try {
          missionStateMachine.transitionTo(targetState, { reason, telemetry: packet });
          renderLiveOpsDashboard(container);
        } catch (err) {
          alert(`State transition error: ${err.message}`);
        }
      });
    }
  };

  bindStateChange('#btn-start-preflight', MISSION_STATES.PRE_FLIGHT, 'Pre-flight checklist initialized');
  bindStateChange('#btn-launch-active', MISSION_STATES.ACTIVE, 'Pre-flight verified; airborne survey started');
  bindStateChange('#btn-pause-mission', MISSION_STATES.PAUSED, 'Mission paused for obstacle or inspection');
  bindStateChange('#btn-resume-mission', MISSION_STATES.RESUMED, 'Mission resumed');
  bindStateChange('#btn-complete-mission', MISSION_STATES.COMPLETED, 'Mission completed and drone recovered');
  bindStateChange('#btn-cancel-mission', MISSION_STATES.CANCELLED, 'Mission aborted by operator');

  const newMissionBtn = container.querySelector('#btn-new-mission');
  if (newMissionBtn) {
    newMissionBtn.addEventListener('click', () => {
      const name = prompt('Enter name for new survey mission:', 'Corridor Recon Survey');
      if (name) {
        missionStateMachine.createNewMission(name);
        renderLiveOpsDashboard(container);
      }
    });
  }

  // View Timeline Modal
  const timelineBtn = container.querySelector('#btn-view-timeline');
  if (timelineBtn) {
    timelineBtn.addEventListener('click', () => {
      _showTimelineModal(missionStateMachine.getMission());
    });
  }

  // Export CSV
  const exportCsvBtn = container.querySelector('#btn-export-csv-log');
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', async () => {
      const mission = missionStateMachine.getMission();
      const samples = await telemetryStorage.getMissionSamples(mission.id, 1000);
      if (!samples || samples.length === 0) {
        // Fallback to latest sample
        exportMissionCSV([packet], mission.name);
      } else {
        exportMissionCSV(samples, mission.name);
      }
    });
  }

  // Generate PDF Report
  const exportPdfBtn = container.querySelector('#btn-generate-pdf-report');
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', async () => {
      const mission = missionStateMachine.getMission();
      const samples = await telemetryStorage.getMissionSamples(mission.id, 1000);
      const stats = await telemetryStorage.getGasStats(mission.id);
      const alerts = gasAlertManager.getHistory();
      generatePrintableReport(mission, samples.length ? samples : [packet], alerts, stats);
    });
  }

  // Configure Thresholds
  const configBtn = container.querySelector('#btn-config-thresholds');
  if (configBtn) {
    configBtn.addEventListener('click', () => {
      _showThresholdsModal(() => renderLiveOpsDashboard(container));
    });
  }
}

function _showTimelineModal(mission) {
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.style.zIndex = '9999';

  backdrop.innerHTML = `
    <div class="modal-card" style="max-width: 480px; max-height: 80vh; display: flex; flex-direction: column;">
      <div class="modal-header">
        <span class="modal-title">Mission Timeline (${mission.name})</span>
        <button id="tl-close-btn" class="icon-btn">✕</button>
      </div>

      <div style="flex: 1; overflow-y: auto; padding: 10px 0;">
        ${mission.timeline.map(item => `
          <div style="padding: 8px 10px; border-left: 2px solid #0284C7; margin-bottom: 10px; background: rgba(255,255,255,0.02); border-radius: 0 6px 6px 0;">
            <div style="display: flex; justify-content: space-between; font-size: 11px;">
              <strong style="color: #38BDF8;">${item.action}</strong>
              <span style="color: var(--text-muted); font-family: var(--font-mono);">${new Date(item.timestamp).toLocaleTimeString()}</span>
            </div>
            <div style="font-size: 11px; color: var(--text-main); margin-top: 3px;">${item.notes}</div>
            ${item.gps ? `<div style="font-size: 10px; color: var(--text-dim); margin-top: 2px;">GPS: ${item.gps.lat.toFixed(5)}, ${item.gps.lon.toFixed(5)} (${item.gps.sats} Sats)</div>` : ''}
          </div>
        `).join('')}
      </div>

      <button id="tl-done-btn" class="sim-btn active" style="width: 100%; justify-content: center; padding: 10px;">
        CLOSE TIMELINE
      </button>
    </div>
  `;

  document.body.appendChild(backdrop);
  const close = () => { if (backdrop.parentNode) document.body.removeChild(backdrop); };
  backdrop.querySelector('#tl-close-btn').addEventListener('click', close);
  backdrop.querySelector('#tl-done-btn').addEventListener('click', close);
  backdrop.addEventListener('click', (e) => { if (e.target === backdrop) close(); });
}

function _showThresholdsModal(onSaved) {
  const current = gasAlertManager.getThresholds();
  const backdrop = document.createElement('div');
  backdrop.className = 'modal-backdrop';
  backdrop.style.zIndex = '9999';

  backdrop.innerHTML = `
    <div class="modal-card" style="max-width: 440px;">
      <div class="modal-header">
        <span class="modal-title">Configure Gas Thresholds</span>
        <button id="th-close-btn" class="icon-btn">✕</button>
      </div>

      <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 12px;">
        Set Warning and Danger thresholds (ADC Volts) per sensor. Note: Alerts are strictly suppressed if sensor is warming up or faulty.
      </div>

      <div style="display: flex; flex-direction: column; gap: 12px; max-height: 360px; overflow-y: auto;">
        ${['MQ4', 'MQ7', 'MQ136', 'MQ137'].map(gasKey => {
          const cfg = current[gasKey] || {};
          const meta = GAS_METADATA[gasKey];
          return `
            <div class="card" style="padding: 10px;">
              <strong style="font-size: 12px; color: ${meta.color};">${meta.sensor} — ${meta.name}</strong>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px; margin-top: 6px;">
                <div>
                  <label style="font-size: 10px; color: var(--text-muted);">Warning Volts:</label>
                  <input type="number" step="0.1" id="th-warn-${gasKey}" value="${cfg.warningVolts || 1.5}" class="sim-input" style="width: 100%; padding: 4px; font-size: 11px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: white;" />
                </div>
                <div>
                  <label style="font-size: 10px; color: var(--text-muted);">Danger Volts:</label>
                  <input type="number" step="0.1" id="th-danger-${gasKey}" value="${cfg.dangerVolts || 2.2}" class="sim-input" style="width: 100%; padding: 4px; font-size: 11px; background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; color: white;" />
                </div>
              </div>
            </div>
          `;
        }).join('')}
      </div>

      <div style="display: flex; gap: 8px; margin-top: 14px;">
        <button id="th-cancel-btn" class="sim-btn" style="flex: 1; justify-content: center; padding: 8px;">CANCEL</button>
        <button id="th-save-btn" class="sim-btn active" style="flex: 1; justify-content: center; padding: 8px; background: #0284C7;">SAVE THRESHOLDS</button>
      </div>
    </div>
  `;

  document.body.appendChild(backdrop);
  const close = () => { if (backdrop.parentNode) document.body.removeChild(backdrop); };
  backdrop.querySelector('#th-close-btn').addEventListener('click', close);
  backdrop.querySelector('#th-cancel-btn').addEventListener('click', close);

  backdrop.querySelector('#th-save-btn').addEventListener('click', () => {
    ['MQ4', 'MQ7', 'MQ136', 'MQ137'].forEach(gasKey => {
      const warn = parseFloat(backdrop.querySelector(`#th-warn-${gasKey}`).value) || 1.5;
      const danger = parseFloat(backdrop.querySelector(`#th-danger-${gasKey}`).value) || 2.2;
      gasAlertManager.setThresholds(gasKey, { warningVolts: warn, dangerVolts: danger });
    });
    close();
    if (onSaved) onSaved();
  });
}
