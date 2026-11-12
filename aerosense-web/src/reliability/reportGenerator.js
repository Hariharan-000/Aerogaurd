/**
 * AERO GUARD - Reliability Module
 * Item 6B: PDF and CSV Report Generator
 * 
 * Rules:
 * - Readings are indicative only. Never claim ppm accuracy or certification.
 * - Exports complete telemetry logs adhering to exact schema.
 */

import { GAS_METADATA } from './telemetryReliabilityService.js';
import { sensorCalibrationManager } from './sensorCalibrationManager.js';

export function exportMissionCSV(samples, missionName = 'Mission') {
  if (!samples || samples.length === 0) {
    alert('No telemetry records available to export.');
    return;
  }

  const headers = [
    'Timestamp',
    'DateTime_ISO',
    'Mission_ID',
    'Device',
    'Mode',
    'Seq',
    'Uptime_ms',
    'Reset_Reason',
    'Warmup_Done',
    // MQ-4 Methane
    'MQ4_Volts',
    'MQ4_Noise_V',
    'MQ4_Rs_R0',
    'MQ4_Status',
    // MQ-7 Carbon Monoxide
    'MQ7_Volts',
    'MQ7_Noise_V',
    'MQ7_Rs_R0',
    'MQ7_Status',
    // MQ-136 H2S
    'MQ136_Volts',
    'MQ136_Noise_V',
    'MQ136_Rs_R0',
    'MQ136_Status',
    // MQ-137 Ammonia
    'MQ137_Volts',
    'MQ137_Noise_V',
    'MQ137_Rs_R0',
    'MQ137_Status',
    // Environment BME680
    'Env_Temp_C',
    'Env_Hum_Pct',
    'Env_Press_hPa',
    // GPS
    'GPS_Lat',
    'GPS_Lon',
    'GPS_Sats',
    'GPS_HDOP',
    'GPS_Age_ms',
    'Regulatory_Notice'
  ];

  const notice = '"Indicative readings only - not certified ppm"';

  const rows = samples.map(s => {
    const g = s.gas || {};
    const e = s.env || {};
    const gps = s.gps || {};

    const mq4 = g.MQ4 || {};
    const mq7 = g.MQ7 || {};
    const mq136 = g.MQ136 || {};
    const mq137 = g.MQ137 || {};

    return [
      s.timestamp,
      new Date(s.timestamp).toISOString(),
      `"${s.missionId || 'N/A'}"`,
      `"${s.device || 'ESP32_AERO'}"`,
      `"${s.mode || 'DRONE'}"`,
      s.seq || 0,
      s.uptime_ms || 0,
      `"${s.reset_reason || 'ok'}"`,
      s.warmup_done ? 'TRUE' : 'FALSE',
      // MQ4
      mq4.volts ?? '',
      mq4.noise_v ?? '',
      mq4.rs_r0 ?? '',
      `"${mq4.status || ''}"`,
      // MQ7
      mq7.volts ?? '',
      mq7.noise_v ?? '',
      mq7.rs_r0 ?? '',
      `"${mq7.status || ''}"`,
      // MQ136
      mq136.volts ?? '',
      mq136.noise_v ?? '',
      mq136.rs_r0 ?? '',
      `"${mq136.status || ''}"`,
      // MQ137
      mq137.volts ?? '',
      mq137.noise_v ?? '',
      mq137.rs_r0 ?? '',
      `"${mq137.status || ''}"`,
      // Env
      e.temp_c ?? '',
      e.hum_pct ?? '',
      e.press_hpa ?? '',
      // GPS
      gps.lat ?? '',
      gps.lon ?? '',
      gps.sats ?? '',
      gps.hdop ?? '',
      gps.age_ms ?? '',
      notice
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', `AERO_GUARD_${missionName.replace(/\s+/g, '_')}_${Date.now()}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

/**
 * Generate a high-fidelity printable HTML/PDF report
 */
export function generatePrintableReport(mission, samples, alerts = [], stats = null) {
  const calibrations = sensorCalibrationManager.getAllCalibrations();
  const printWindow = window.open('', '_blank', 'width=900,height=800');
  if (!printWindow) {
    alert('Please allow popups to generate the printable PDF report.');
    return;
  }

  const sampleCount = samples ? samples.length : 0;
  const gasStats = stats && stats.gases ? stats.gases : {};

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <title>AERO GUARD Mission Reliability Report — ${mission.id}</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
            background: #ffffff;
            color: #111827;
            padding: 32px;
            font-size: 13px;
            line-height: 1.5;
          }
          .header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            border-bottom: 2px solid #0284c7;
            padding-bottom: 16px;
            margin-bottom: 24px;
          }
          .title { font-size: 24px; font-weight: 800; color: #0f172a; margin: 0; }
          .subtitle { color: #64748b; font-size: 13px; margin-top: 4px; }
          .disclaimer-box {
            background: #fffbeb;
            border: 1px solid #fef08a;
            border-left: 4px solid #f59e0b;
            padding: 12px 16px;
            border-radius: 4px;
            margin-bottom: 24px;
            font-size: 12px;
            color: #92400e;
          }
          .section { margin-bottom: 28px; }
          .section-title {
            font-size: 15px;
            font-weight: 700;
            color: #1e293b;
            text-transform: uppercase;
            letter-spacing: 0.05em;
            border-bottom: 1px solid #e2e8f0;
            padding-bottom: 6px;
            margin-bottom: 12px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            margin-top: 8px;
            font-size: 12px;
          }
          th, td {
            border: 1px solid #e2e8f0;
            padding: 8px 12px;
            text-align: left;
          }
          th {
            background: #f8fafc;
            color: #475569;
            font-weight: 600;
          }
          .badge {
            display: inline-block;
            padding: 2px 8px;
            border-radius: 4px;
            font-size: 11px;
            font-weight: 700;
          }
          .badge-ok { background: #dcfce7; color: #166534; }
          .badge-danger { background: #fee2e2; color: #991b1b; }
          .badge-warning { background: #fef3c7; color: #92400e; }
          .badge-state { background: #e0f2fe; color: #0369a1; }
          .timeline-item {
            display: flex;
            gap: 16px;
            padding: 8px 0;
            border-bottom: 1px dashed #e2e8f0;
          }
          .timeline-time { color: #64748b; font-family: monospace; min-width: 140px; }
          .print-btn-bar {
            margin-bottom: 20px;
            display: flex;
            gap: 12px;
          }
          .btn {
            background: #0284c7;
            color: white;
            border: none;
            padding: 8px 16px;
            border-radius: 6px;
            cursor: pointer;
            font-weight: 600;
          }
          @media print {
            .print-btn-bar { display: none; }
            body { padding: 0; }
          }
        </style>
      </head>
      <body>
        <div class="print-btn-bar">
          <button class="btn" onclick="window.print()">🖨️ Print / Save as PDF</button>
          <button class="btn" style="background: #475569;" onclick="window.close()">Close Window</button>
        </div>

        <div class="header">
          <div>
            <h1 class="title">AERO GUARD AIRBORNE SURVEILLANCE</h1>
            <div class="subtitle">Multi-Gas Drone Telemetry & Mission Reliability Report</div>
          </div>
          <div style="text-align: right;">
            <div><strong>Mission:</strong> ${mission.name}</div>
            <div style="color: #64748b; font-size: 11px;">ID: ${mission.id}</div>
            <div style="margin-top: 4px;">Status: <span class="badge badge-state">${mission.state.toUpperCase()}</span></div>
          </div>
        </div>

        <div class="disclaimer-box">
          <strong>LEGAL & REGULATORY NOTICE:</strong> Readings generated by this drone-mounted system are indicative relative sensor resistance ratios (Rs/R0). This instrument is designed for industrial screening and leak localization. It does NOT claim certified parts-per-million (ppm) accuracy and must not be used as the sole basis for life-safety certification or chemical release verification.
        </div>

        <!-- Section 1: Hardware & Calibration Audit -->
        <div class="section">
          <div class="section-title">1. Hardware Baseline & Sensor Calibration (R0)</div>
          <table>
            <thead>
              <tr>
                <th>Gas Target</th>
                <th>Sensor</th>
                <th>Hardware Circuit</th>
                <th>Clean-Air R0</th>
                <th>Calibrated Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${['MQ4', 'MQ7', 'MQ136', 'MQ137'].map(k => {
                const cal = calibrations[k] || {};
                const meta = GAS_METADATA[k];
                return `
                  <tr>
                    <td><strong>${meta.name}</strong></td>
                    <td>${meta.sensor}</td>
                    <td>10k/20k Divider + 5V Filter Cap</td>
                    <td>${cal.r0 ? `${cal.r0} Ω` : 'UNCALIBRATED'}</td>
                    <td>${cal.calibratedAt ? new Date(cal.calibratedAt).toLocaleString() : 'N/A'}</td>
                    <td>
                      <span class="badge ${cal.status === 'calibrated' ? 'badge-ok' : 'badge-warning'}">
                        ${(cal.status || 'uncalibrated').toUpperCase()}
                      </span>
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Section 2: Gas Exposure Statistics -->
        <div class="section">
          <div class="section-title">2. Mission Gas Telemetry Summary (${sampleCount} Samples Logged)</div>
          <table>
            <thead>
              <tr>
                <th>Sensor</th>
                <th>Min Volts</th>
                <th>Max Volts</th>
                <th>Avg Volts</th>
                <th>Min Rs/R0</th>
                <th>Max Rs/R0</th>
                <th>Avg Rs/R0</th>
              </tr>
            </thead>
            <tbody>
              ${['MQ4', 'MQ7', 'MQ136', 'MQ137'].map(k => {
                const s = gasStats[k] || {};
                const meta = GAS_METADATA[k];
                return `
                  <tr>
                    <td><strong>${meta.name} (${meta.sensor})</strong></td>
                    <td>${s.minVolts ?? '--'} V</td>
                    <td>${s.maxVolts ?? '--'} V</td>
                    <td>${s.avgVolts ?? '--'} V</td>
                    <td>${s.minRsR0 ?? '--'}</td>
                    <td>${s.maxRsR0 ?? '--'}</td>
                    <td>${s.avgRsR0 ?? '--'}</td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Section 3: Mission Timeline -->
        <div class="section">
          <div class="section-title">3. Mission State Machine Timeline & Transitions</div>
          <div>
            ${mission.timeline.map(t => `
              <div class="timeline-item">
                <div class="timeline-time">${new Date(t.timestamp).toLocaleTimeString()}</div>
                <div>
                  <strong>${t.action}</strong> [${t.fromState || 'None'} → ${t.toState}]<br/>
                  <span style="color: #475569;">${t.notes}</span>
                  ${t.gps ? `<br/><span style="font-size: 11px; color: #0284c7;">GPS: ${t.gps.lat.toFixed(5)}, ${t.gps.lon.toFixed(5)} (${t.gps.sats} Sats, HDOP ${t.gps.hdop})</span>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- Section 4: Incident & Alert Log -->
        <div class="section">
          <div class="section-title">4. Hazard Alert & Fault Log (${alerts.length} Incidents)</div>
          ${alerts.length === 0 ? '<p style="color: #64748b;">No threshold violations or sensor faults recorded during this mission.</p>' : `
            <table>
              <thead>
                <tr>
                  <th>Time</th>
                  <th>Gas</th>
                  <th>Level</th>
                  <th>Reason</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                ${alerts.map(a => `
                  <tr>
                    <td>${new Date(a.firstTriggeredAt || a.timestamp || Date.now()).toLocaleTimeString()}</td>
                    <td>${a.sensorName} (${a.gasName})</td>
                    <td><span class="badge ${a.level === 'DANGER' ? 'badge-danger' : 'badge-warning'}">${a.level}</span></td>
                    <td>${a.reason}</td>
                    <td>${a.status}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div style="margin-top: 40px; border-top: 1px solid #cbd5e1; padding-top: 16px; display: flex; justify-content: space-between; font-size: 11px; color: #64748b;">
          <div>Generated by AERO GUARD Reliability Module v2.0</div>
          <div>Operator Sign-off: _______________________________</div>
        </div>
      </body>
    </html>
  `;

  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
}
