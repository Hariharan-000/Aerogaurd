/**
 * AERO GUARD - Reliability Module
 * Item 2: Sensor Calibration Manager
 * 
 * Manages clean-air baseline calibration (R0) for:
 * - MQ-4 (Methane)
 * - MQ-7 (Carbon Monoxide)
 * - MQ-136 (Hydrogen Sulfide)
 * - MQ-137 (Ammonia)
 * 
 * Hardware Details:
 * - 5V sensor supply filtered by polarized electrolytic capacitor (+ to 5V, - to GND).
 * - 10k/20k voltage divider reduces 0-5V sensor analog output to 0-3.3V for ESP32 ADC.
 *   V_sensor = V_adc * (10k + 20k) / 20k = 1.5 * V_adc.
 * - Sensor resistance Rs = RL * (Vcc - V_sensor) / V_sensor.
 * - Clean air baseline R0 = Rs_clean / CleanAirRatio.
 * 
 * Non-PPM Rule: Readings are indicative only. Never claim ppm accuracy or certification.
 */

import { GAS_KEYS, GAS_METADATA } from './telemetryReliabilityService.js';

const STORAGE_KEY = 'aeroguard_calibration_v2';
const HISTORY_KEY = 'aeroguard_calibration_history_v2';

export class SensorCalibrationManager {
  constructor() {
    this.listeners = new Set();
    this.calibrations = this._loadCalibrations();
    this.history = this._loadHistory();
  }

  _loadCalibrations() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(STORAGE_KEY);
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse stored calibration:', e);
    }

    // Default factory baseline state (uncalibrated)
    const defaults = {};
    for (const key of GAS_KEYS) {
      defaults[key] = {
        gasKey: key,
        sensor: GAS_METADATA[key].sensor,
        r0: null,
        calibratedAt: null,
        calibratedVolts: null,
        calibratedTemp: null,
        calibratedHum: null,
        operator: 'System Baseline',
        status: 'uncalibrated'
      };
    }
    return defaults;
  }

  _loadHistory() {
    try {
      if (typeof localStorage !== 'undefined') {
        const stored = localStorage.getItem(HISTORY_KEY);
        if (stored) return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Failed to parse calibration history:', e);
    }
    return [];
  }

  _persist() {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.calibrations));
        localStorage.setItem(HISTORY_KEY, JSON.stringify(this.history));
      }
    } catch (e) {
      console.warn('Failed to save calibrations to localStorage:', e);
    }
    this._notify();
  }

  /**
   * Convert ESP32 0-3.3V ADC voltage to sensor output voltage (0-5V)
   * using the 10k/20k voltage divider.
   */
  adcToSensorVolts(adcVolts) {
    // 10k top, 20k bottom divider: V_adc = V_sensor * (20 / (10 + 20)) = (2/3) * V_sensor
    return Math.min(5.0, Math.max(0, adcVolts * 1.5));
  }

  /**
   * Calculate sensor resistance Rs from ADC volts.
   * Vcc = 5.0V, RL = 10k (standard load resistance on MQ modules).
   */
  calculateRs(adcVolts, rl = 10000, vcc = 5.0) {
    const vSensor = this.adcToSensorVolts(adcVolts);
    if (vSensor <= 0.05) return Infinity;
    if (vSensor >= vcc) return 0.01;
    // Rs = RL * (Vcc - V_sensor) / V_sensor
    const rs = rl * (vcc - vSensor) / vSensor;
    return rs;
  }

  /**
   * Calibrate R0 in clean air for a single sensor.
   * @param {string} gasKey - 'MQ4', 'MQ7', 'MQ136', or 'MQ137'
   * @param {number} adcVolts - ESP32 ADC measured voltage (0-3.3V)
   * @param {object} env - { temp_c, hum_pct }
   * @param {string} operator - Operator name or ID
   */
  calibrateSensor(gasKey, adcVolts, env = { temp_c: 25, hum_pct: 60 }, operator = 'Operator') {
    if (!GAS_KEYS.includes(gasKey)) {
      throw new Error(`Invalid gas key: ${gasKey}. Must be one of ${GAS_KEYS.join(', ')}`);
    }

    if (adcVolts < 0.1 || adcVolts > 3.2) {
      throw new Error(`ADC voltage ${adcVolts}V is outside valid clean-air calibration window (0.1V - 3.2V)`);
    }

    const cleanAirRatio = GAS_METADATA[gasKey].cleanAirRatio;
    const rsClean = this.calculateRs(adcVolts);
    const r0 = Number((rsClean / cleanAirRatio).toFixed(2));

    const record = {
      gasKey,
      sensor: GAS_METADATA[gasKey].sensor,
      r0,
      rsClean: Number(rsClean.toFixed(2)),
      calibratedAt: Date.now(),
      calibratedVolts: Number(adcVolts.toFixed(3)),
      calibratedSensorVolts: Number(this.adcToSensorVolts(adcVolts).toFixed(3)),
      calibratedTemp: env.temp_c || 25,
      calibratedHum: env.hum_pct || 60,
      operator: operator || 'Field Technician',
      status: 'calibrated',
      notes: 'Clean-air baseline captured with 10k/20k divider & 5V filter capacitor'
    };

    this.calibrations[gasKey] = record;
    this.history.unshift({ ...record, id: `CAL-${Date.now()}-${gasKey}` });
    if (this.history.length > 100) this.history.pop();

    this._persist();
    return record;
  }

  /**
   * Calibrate all 4 MQ sensors in clean air at once
   */
  calibrateAllSensors(telemetryPacket, operator = 'Field Technician') {
    if (!telemetryPacket || !telemetryPacket.gas) {
      throw new Error('Valid telemetry packet required for batch calibration');
    }

    if (!telemetryPacket.warmup_done) {
      throw new Error('Cannot calibrate while sensors are warming up! ESP32 requires at least 3 minutes warm-up.');
    }

    const results = {};
    for (const gasKey of GAS_KEYS) {
      const g = telemetryPacket.gas[gasKey];
      if (g) {
        results[gasKey] = this.calibrateSensor(
          gasKey,
          g.volts,
          telemetryPacket.env,
          operator
        );
      }
    }
    return results;
  }

  /**
   * Calculate indicative Rs/R0 ratio using calibrated R0
   */
  calculateRsR0(gasKey, adcVolts) {
    const cal = this.calibrations[gasKey];
    if (!cal || !cal.r0) {
      return { ratio: null, isCalibrated: false };
    }
    const rs = this.calculateRs(adcVolts);
    const ratio = Number((rs / cal.r0).toFixed(2));
    return { ratio, isCalibrated: true };
  }

  getCalibration(gasKey) {
    return this.calibrations[gasKey] || null;
  }

  getAllCalibrations() {
    return { ...this.calibrations };
  }

  getHistory(gasKey = null) {
    if (!gasKey) return [...this.history];
    return this.history.filter(h => h.gasKey === gasKey);
  }

  resetCalibration(gasKey) {
    if (this.calibrations[gasKey]) {
      this.calibrations[gasKey] = {
        gasKey,
        sensor: GAS_METADATA[gasKey].sensor,
        r0: null,
        calibratedAt: null,
        calibratedVolts: null,
        calibratedTemp: null,
        calibratedHum: null,
        operator: 'System Baseline',
        status: 'uncalibrated'
      };
      this._persist();
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    callback(this.getAllCalibrations(), this.getHistory());
    return () => this.listeners.delete(callback);
  }

  _notify() {
    for (const cb of this.listeners) {
      try {
        cb(this.getAllCalibrations(), this.getHistory());
      } catch (e) {
        console.error('Calibration subscriber error:', e);
      }
    }
  }
}

export const sensorCalibrationManager = new SensorCalibrationManager();
