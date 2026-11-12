/**
 * AERO GUARD - Reliability Module
 * Item 4: Configurable Gas Thresholds & Alert Management
 * 
 * Rules:
 * - Configurable warning and danger thresholds per gas (MQ-4, MQ-7, MQ-136, MQ-137).
 * - Lifecycle: Acknowledge, Snooze (5m, 15m, 30m), Resolve.
 * - CRITICAL: STRICTLY NO ALERTS from faulty or warming-up sensors!
 * - Non-PPM rule: Indicative ratios / threshold bands.
 */

import { GAS_KEYS, GAS_METADATA } from './telemetryReliabilityService.js';
import { sensorFaultDetector } from './sensorFaultDetector.js';

const THRESHOLDS_STORAGE_KEY = 'aeroguard_thresholds_v2';
const ALERTS_STORAGE_KEY = 'aeroguard_alerts_history_v2';

export class GasAlertManager {
  constructor() {
    this.listeners = new Set();
    this.thresholds = this._loadThresholds();
    this.activeAlerts = new Map(); // key -> alertObject
    this.alertHistory = this._loadHistory();
    this.snoozedUntil = new Map(); // key -> timestamp
  }

  _loadThresholds() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(THRESHOLDS_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse thresholds:', e);
    }

    // Default thresholds based on Rs/R0 indicative ratio drops (gas concentration increases as Rs/R0 drops for MQ reduction)
    // Or relative voltage / indicative scale
    return {
      MQ4: { warningRsR0: 1.5, dangerRsR0: 1.0, warningVolts: 1.8, dangerVolts: 2.4, name: 'Methane (CH4)' },
      MQ7: { warningRsR0: 1.8, dangerRsR0: 1.2, warningVolts: 1.4, dangerVolts: 2.0, name: 'Carbon Monoxide (CO)' },
      MQ136: { warningRsR0: 1.4, dangerRsR0: 0.9, warningVolts: 1.6, dangerVolts: 2.2, name: 'Hydrogen Sulfide (H2S)' },
      MQ137: { warningRsR0: 1.6, dangerRsR0: 1.0, warningVolts: 1.2, dangerVolts: 1.8, name: 'Ammonia (NH3)' }
    };
  }

  _loadHistory() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(ALERTS_STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse alerts history:', e);
    }
    return [];
  }

  _persist() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(THRESHOLDS_STORAGE_KEY, JSON.stringify(this.thresholds));
        localStorage.setItem(ALERTS_STORAGE_KEY, JSON.stringify(this.alertHistory.slice(0, 100)));
      }
    } catch (e) {
      console.warn('Failed to persist alerts:', e);
    }
    this._notify();
  }

  setThresholds(gasKey, config) {
    if (!GAS_KEYS.includes(gasKey)) throw new Error(`Invalid gasKey: ${gasKey}`);
    this.thresholds[gasKey] = {
      ...this.thresholds[gasKey],
      ...config
    };
    this._persist();
  }

  getThresholds(gasKey = null) {
    if (!gasKey) return { ...this.thresholds };
    return this.thresholds[gasKey];
  }

  /**
   * Process a telemetry packet against configured thresholds.
   * STRICT ENFORCEMENT: No alerts if sensor is warming up or faulty!
   */
  evaluatePacket(packet) {
    if (!packet || !packet.gas) return [];

    const now = Date.now();
    const evaluatedAlerts = [];

    for (const gasKey of GAS_KEYS) {
      const g = packet.gas[gasKey];
      if (!g) continue;

      const faultReport = sensorFaultDetector.lastEvaluation;
      const sensorFault = faultReport && faultReport.sensors && faultReport.sensors[gasKey];
      const isFaultyOrWarming = !packet.warmup_done || (sensorFault && sensorFault.isFault);

      // RULE ENFORCEMENT: Suppress gas alert if faulty or warming up
      if (isFaultyOrWarming) {
        // If an alert was active for this sensor, resolve it due to sensor fault
        if (this.activeAlerts.has(gasKey)) {
          this.resolveAlert(gasKey, 'Auto-resolved: Sensor entered fault or warm-up state');
        }
        continue;
      }

      // Check if snoozed
      const snoozeExpiry = this.snoozedUntil.get(gasKey) || 0;
      if (now < snoozeExpiry) {
        continue;
      }

      const cfg = this.thresholds[gasKey] || {};
      const volts = g.volts;
      const rsR0 = g.rs_r0;

      let level = null;
      let reason = '';

      // Check Danger threshold (higher priority)
      if ((cfg.dangerVolts && volts >= cfg.dangerVolts) || (cfg.dangerRsR0 && rsR0 <= cfg.dangerRsR0)) {
        level = 'DANGER';
        reason = `Voltage ${volts.toFixed(2)}V exceeded danger threshold (${cfg.dangerVolts}V) / Rs/R0 ${rsR0.toFixed(2)} <= ${cfg.dangerRsR0}`;
      } else if ((cfg.warningVolts && volts >= cfg.warningVolts) || (cfg.warningRsR0 && rsR0 <= cfg.warningRsR0)) {
        level = 'WARNING';
        reason = `Voltage ${volts.toFixed(2)}V exceeded warning threshold (${cfg.warningVolts}V) / Rs/R0 ${rsR0.toFixed(2)} <= ${cfg.warningRsR0}`;
      }

      if (level) {
        let alert = this.activeAlerts.get(gasKey);
        if (!alert) {
          alert = {
            id: `ALT-${Date.now()}-${gasKey}`,
            gasKey,
            sensorName: GAS_METADATA[gasKey].sensor,
            gasName: GAS_METADATA[gasKey].name,
            level,
            reason,
            volts,
            rsR0,
            status: 'ACTIVE', // ACTIVE, ACKNOWLEDGED, SNOOZED, RESOLVED
            firstTriggeredAt: now,
            lastTriggeredAt: now,
            gps: packet.gps ? { lat: packet.gps.lat, lon: packet.gps.lon } : null,
            acknowledgedAt: null,
            acknowledgedBy: null
          };
          this.activeAlerts.set(gasKey, alert);
          this.alertHistory.unshift({ ...alert });
        } else {
          alert.level = level;
          alert.reason = reason;
          alert.volts = volts;
          alert.rsR0 = rsR0;
          alert.lastTriggeredAt = now;
        }
        evaluatedAlerts.push(alert);
      } else {
        // Drop below threshold -> auto resolve if active
        if (this.activeAlerts.has(gasKey)) {
          this.resolveAlert(gasKey, 'Auto-resolved: Gas reading dropped back below threshold');
        }
      }
    }

    this._persist();
    return evaluatedAlerts;
  }

  acknowledgeAlert(gasKey, operator = 'Field Operator') {
    const alert = this.activeAlerts.get(gasKey);
    if (alert) {
      alert.status = 'ACKNOWLEDGED';
      alert.acknowledgedAt = Date.now();
      alert.acknowledgedBy = operator;
      this._updateHistoryEntry(alert);
      this._persist();
    }
  }

  snoozeAlert(gasKey, durationMinutes = 10) {
    const alert = this.activeAlerts.get(gasKey);
    const snoozeUntil = Date.now() + durationMinutes * 60 * 1000;
    this.snoozedUntil.set(gasKey, snoozeUntil);

    if (alert) {
      alert.status = 'SNOOZED';
      alert.snoozeUntil = snoozeUntil;
      alert.snoozeMinutes = durationMinutes;
      this._updateHistoryEntry(alert);
      this._persist();
    }
  }

  resolveAlert(gasKey, resolutionNote = 'Manually resolved by operator') {
    const alert = this.activeAlerts.get(gasKey);
    if (alert) {
      alert.status = 'RESOLVED';
      alert.resolvedAt = Date.now();
      alert.resolutionNote = resolutionNote;
      this._updateHistoryEntry(alert);
      this.activeAlerts.delete(gasKey);
      this._persist();
    }
  }

  _updateHistoryEntry(updatedAlert) {
    const idx = this.alertHistory.findIndex(a => a.id === updatedAlert.id);
    if (idx !== -1) {
      this.alertHistory[idx] = { ...updatedAlert };
    }
  }

  getActiveAlerts() {
    return Array.from(this.activeAlerts.values());
  }

  getHistory() {
    return [...this.alertHistory];
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.getActiveAlerts(), this.getHistory());
    return () => this.listeners.delete(callback);
  }

  _notify() {
    const active = this.getActiveAlerts();
    const history = this.getHistory();
    for (const cb of this.listeners) {
      try {
        cb(active, history);
      } catch (e) {
        console.error('Alert manager subscriber error:', e);
      }
    }
  }
}

export const gasAlertManager = new GasAlertManager();
