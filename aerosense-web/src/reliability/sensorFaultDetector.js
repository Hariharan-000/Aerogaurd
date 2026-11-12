/**
 * AERO GUARD - Reliability Module
 * Item 3: Sensor Fault Detection Engine
 * 
 * Hardware Statuses from ESP32:
 * 1. warming_up: Warm-up timer active (< 3 minutes). Output invalid.
 * 2. uncalibrated: No clean-air R0 recorded.
 * 3. ok: Sensor nominal.
 * 4. noisy_supply: V_noise > 0.06V. Power filtering degraded (check 5V polarized electrolytic capacitor).
 * 5. fault_low: V_adc < 0.1V. Open-circuit, sensor disconnected, heater broken, or divider grounded.
 * 6. fault_high: V_adc > 3.2V. Short-circuit to 5V or divider lower resistor (20k) disconnected.
 * 
 * Brownout Warning:
 * Reset reason 'brownout' or 'ESP_RST_BROWNOUT' flags severe 5V supply droop.
 */

import { GAS_KEYS, GAS_METADATA } from './telemetryReliabilityService.js';
import { sensorCalibrationManager } from './sensorCalibrationManager.js';

export const FAULT_DEFINITIONS = {
  warming_up: {
    severity: 'warning',
    label: 'WARMING UP',
    badgeColor: '#F59E0B',
    isFault: true,
    description: 'Sensor heater coil is stabilizing (at least 3 minutes required). Gas readings are not valid.'
  },
  uncalibrated: {
    severity: 'warning',
    label: 'UNCALIBRATED',
    badgeColor: '#EC4899',
    isFault: true,
    description: 'Sensor requires clean-air baseline (R0) calibration before mission flight.'
  },
  ok: {
    severity: 'normal',
    label: 'OPERATIONAL',
    badgeColor: '#10B981',
    isFault: false,
    description: 'Sensor voltage, noise floor, and heater coil are healthy.'
  },
  noisy_supply: {
    severity: 'danger',
    label: 'NOISY 5V SUPPLY',
    badgeColor: '#F97316',
    isFault: true,
    description: 'Analog supply ripple exceeds 0.06V. Check electrolytic capacitor (+ to 5V, other leg to GND).'
  },
  fault_low: {
    severity: 'critical',
    label: 'FAULT: LOW / DISCONNECTED',
    badgeColor: '#EF4444',
    isFault: true,
    description: 'Voltage < 0.10V. Sensor disconnected, heater burned out, or signal pulled to GND.'
  },
  fault_high: {
    severity: 'critical',
    label: 'FAULT: HIGH / SHORT',
    badgeColor: '#DC2626',
    isFault: true,
    description: 'Voltage > 3.20V. Sensor output shorted to 5V rail or 10k/20k voltage divider defective.'
  }
};

export class SensorFaultDetector {
  constructor() {
    this.listeners = new Set();
    this.lastEvaluation = null;
  }

  /**
   * Evaluate a telemetry packet and produce a comprehensive diagnostic report.
   */
  evaluatePacket(packet) {
    if (!packet || !packet.gas) {
      return { hasFaults: true, sensors: {}, brownoutActive: false, summary: 'No telemetry packet available' };
    }

    const sensorReports = {};
    let totalFaults = 0;
    let anyWarmingUp = false;

    // Check brownout reset reason
    const resetReason = String(packet.reset_reason || '').toLowerCase();
    const isBrownout = resetReason.includes('brownout');

    for (const gasKey of GAS_KEYS) {
      const g = packet.gas[gasKey];
      if (!g) continue;

      let status = g.status || 'ok';
      const volts = g.volts || 0;
      const noiseV = g.noise_v || 0;

      // Validate status against electrical constraints
      if (!packet.warmup_done) {
        status = 'warming_up';
        anyWarmingUp = true;
      } else if (volts < 0.10) {
        status = 'fault_low';
      } else if (volts > 3.20) {
        status = 'fault_high';
      } else if (noiseV > 0.06) {
        status = 'noisy_supply';
      } else {
        // Check calibration state
        const cal = sensorCalibrationManager.getCalibration(gasKey);
        if (!cal || !cal.r0) {
          status = 'uncalibrated';
        }
      }

      const faultDef = FAULT_DEFINITIONS[status] || FAULT_DEFINITIONS.ok;
      const isFault = faultDef.isFault;
      if (isFault) totalFaults++;

      // Hardware troubleshooting recommendation
      let hardwareFix = null;
      if (status === 'noisy_supply') {
        hardwareFix = 'Inspect the polarized electrolytic capacitor on the 5V rail. Ensure + leg is firmly attached to 5V and - leg to GND. Capacitor rating should be >= 10V (16V recommended).';
      } else if (status === 'fault_low') {
        hardwareFix = 'Check sensor wiring: verify 5V power leads, GND, and heater resistance (~30Ω). Check 10k/20k divider bottom resistor connection to GND.';
      } else if (status === 'fault_high') {
        hardwareFix = 'Check voltage divider resistors. Ensure 20k resistor is grounded and 10k resistor is between MQ output and ESP32 pin.';
      } else if (status === 'uncalibrated') {
        hardwareFix = 'Perform Clean Air Calibration in fresh outdoor air for at least 60 seconds.';
      } else if (status === 'warming_up') {
        hardwareFix = 'Allow sensor heater to warm up for at least 3 minutes before taking flight measurements.';
      }

      sensorReports[gasKey] = {
        gasKey,
        sensorName: GAS_METADATA[gasKey].sensor,
        gasName: GAS_METADATA[gasKey].name,
        volts,
        noiseV,
        rsR0: g.rs_r0,
        status,
        severity: faultDef.severity,
        label: faultDef.label,
        badgeColor: faultDef.badgeColor,
        isFault,
        description: faultDef.description,
        hardwareFix
      };
    }

    const report = {
      timestamp: Date.now(),
      uptimeMs: packet.uptime_ms,
      warmupDone: packet.warmup_done,
      hasFaults: totalFaults > 0,
      totalFaults,
      anyWarmingUp,
      brownoutActive: isBrownout,
      brownoutDetails: isBrownout ? {
        resetReason: packet.reset_reason,
        warning: 'Brownout reset detected on ESP32! High sensor heater current (up to 800mA for 4 MQ sensors) caused 5V rail voltage dip. Verify power supply capacity and polarized electrolytic bulk capacitor.',
        hardwareAction: 'Increase bulk capacitance (e.g. 470µF-1000µF, 16V) near sensor supply terminals.'
      } : null,
      sensors: sensorReports
    };

    this.lastEvaluation = report;
    this._notify(report);
    return report;
  }

  isSensorReady(gasKey) {
    if (!this.lastEvaluation || !this.lastEvaluation.sensors[gasKey]) return false;
    const s = this.lastEvaluation.sensors[gasKey];
    return s.status === 'ok';
  }

  subscribe(callback) {
    this.listeners.add(callback);
    if (this.lastEvaluation) callback(this.lastEvaluation);
    return () => this.listeners.delete(callback);
  }

  _notify(report) {
    for (const cb of this.listeners) {
      try {
        cb(report);
      } catch (e) {
        console.error('Fault subscriber error:', e);
      }
    }
  }
}

export const sensorFaultDetector = new SensorFaultDetector();
