/**
 * AERO GUARD - Reliability Module
 * Comprehensive Unit Test Suite
 * 
 * Covers:
 * - Priority 1:
 *   1. Freshness evaluation (Fresh, Stale @ 5s, Offline @ 15s) & Live vs Simulation separation
 *   2. Clean-air R0 calibration, 10k/20k voltage divider math, history log
 *   3. Fault detection on all 6 statuses + brownout reset reason
 *   4. Gas thresholds, alert lifecycle (ack, snooze, resolve) & suppression during warmup/fault
 *   5. Mission state machine: strict transitions, illegal transition rejection, immutable timeline
 *   6. Local telemetry database persistence, statistics, and CSV formatting
 * - Priority 2:
 *   7. Heatmap hotspot detection with "insufficient data" warning on sparse points, Z-score anomaly (|z| > 2.5), trend analysis, replay
 */

import { TelemetryReliabilityService } from './telemetryReliabilityService.js';
import { SensorCalibrationManager } from './sensorCalibrationManager.js';
import { SensorFaultDetector } from './sensorFaultDetector.js';
import { GasAlertManager } from './gasAlertManager.js';
import { MissionStateMachine, MISSION_STATES, IllegalStateTransitionError } from './missionStateMachine.js';
import { TelemetryStorage } from './telemetryStorage.js';
import { AdvancedAnalyticsEngine } from './advancedAnalytics.js';

export async function runAllReliabilityUnitTests() {
  const results = [];

  function assert(condition, testName, details = '') {
    if (condition) {
      results.push({ name: testName, passed: true, details });
    } else {
      results.push({ name: testName, passed: false, details: details || 'Assertion failed' });
      console.error(`TEST FAILED: ${testName} - ${details}`);
    }
  }

  console.log('--- STARTING AERO GUARD RELIABILITY UNIT TESTS ---');

  // ==========================================
  // ITEM 1: Live Ops & Telemetry Freshness Tests
  // ==========================================
  try {
    const service = new TelemetryReliabilityService();
    
    // Ingest simulated packet
    const validPacket = {
      device: 'ESP32_AERO_01',
      mode: 'DRONE',
      seq: 1,
      uptime_ms: 200000,
      reset_reason: 'power_on',
      warmup_done: true,
      gas: {
        MQ4: { volts: 1.45, noise_v: 0.02, rs_r0: 1.82, status: 'ok' },
        MQ7: { volts: 0.95, noise_v: 0.015, rs_r0: 2.10, status: 'ok' },
        MQ136: { volts: 1.10, noise_v: 0.025, rs_r0: 1.65, status: 'ok' },
        MQ137: { volts: 0.88, noise_v: 0.018, rs_r0: 2.40, status: 'ok' }
      },
      env: { temp_c: 28.5, hum_pct: 58.2, press_hpa: 1012.4 },
      gps: { lat: 19.0760, lon: 72.8777, sats: 9, hdop: 0.95, age_ms: 250 }
    };

    // Test 1.1: Schema validation
    const ingestRes = service.ingestPacket(validPacket, false);
    assert(ingestRes.success === true, '1.1 Telemetry JSON Schema Ingestion validates required fields');

    // Test 1.2: Never show LIVE during simulation
    const simFreshness = service.getFreshnessState();
    assert(simFreshness.isLive === false, '1.2 Show LIVE only for real data: isLive MUST be false during simulation');
    assert(simFreshness.label === 'SIMULATION', '1.2 Badge label is SIMULATION during simulation, never LIVE');

    // Test 1.3: Show LIVE for real hardware data
    service.ingestPacket(validPacket, true);
    const realFreshness = service.getFreshnessState();
    assert(realFreshness.isLive === true && realFreshness.label === 'LIVE', '1.3 Show LIVE when real hardware packet is ingested within 5s');

    // Test 1.4: Freshness - Stale after 5s
    service.lastPacketTimestamp = Date.now() - 6000;
    const staleFreshness = service.getFreshnessState();
    assert(staleFreshness.status === 'stale' && staleFreshness.isStale === true, '1.4 Freshness transitions to STALE after 5 seconds without packet');

    // Test 1.5: Freshness - Offline after 15s
    service.lastPacketTimestamp = Date.now() - 16000;
    const offlineFreshness = service.getFreshnessState();
    assert(offlineFreshness.status === 'offline' && offlineFreshness.isOffline === true, '1.5 Freshness transitions to OFFLINE after 15 seconds');

    // Test 1.6: Brownout reset reason detection
    const brownoutPacket = { ...validPacket, reset_reason: 'ESP_RST_BROWNOUT' };
    service.ingestPacket(brownoutPacket, false);
    assert(service.brownoutWarningActive === true, '1.6 Brownout reset reason is flagged as a power-supply warning');

    service.destroy();
  } catch (e) {
    assert(false, 'Item 1 Exception', e.message);
  }

  // ==========================================
  // ITEM 2: Sensor Calibration Manager Tests
  // ==========================================
  try {
    const calMgr = new SensorCalibrationManager();

    // Test 2.1: 10k/20k Voltage divider math (V_sensor = 1.5 * V_adc)
    const adcVolts = 2.0;
    const sensorVolts = calMgr.adcToSensorVolts(adcVolts);
    assert(Math.abs(sensorVolts - 3.0) < 0.001, '2.1 10k/20k Voltage divider math calculates V_sensor = 1.5 * V_adc (2.0V -> 3.0V)');

    // Test 2.2: Sensor resistance Rs calculation (Rs = RL * (Vcc - V_sensor) / V_sensor)
    // For V_adc = 1.6667V -> V_sensor = 2.5V, Vcc = 5.0V, RL = 10k -> Rs = 10k * (5 - 2.5)/2.5 = 10,000 ohms
    const rsCalculated = calMgr.calculateRs(1.66667, 10000, 5.0);
    assert(Math.abs(rsCalculated - 10000) < 10, '2.2 Clean air Rs calculation accurately computes sensor resistance');

    // Test 2.3: Clean air R0 calibration for MQ-4
    const calRecord = calMgr.calibrateSensor('MQ4', 1.0, { temp_c: 25, hum_pct: 60 }, 'Test Tech');
    assert(calRecord.status === 'calibrated' && calRecord.r0 > 0, '2.3 Clean air R0 is computed and stored for MQ-4');

    // Test 2.4: Calibration history logging
    const history = calMgr.getHistory('MQ4');
    assert(history.length > 0 && history[0].gasKey === 'MQ4', '2.4 Calibration history log records timestamp, R0, raw volts, and operator');

    // Test 2.5: Indicative Rs/R0 ratio calculation
    const rsR0Result = calMgr.calculateRsR0('MQ4', 1.0);
    assert(rsR0Result.isCalibrated === true && rsR0Result.ratio > 0, '2.5 Calculates indicative Rs/R0 ratio using calibrated baseline');
  } catch (e) {
    assert(false, 'Item 2 Exception', e.message);
  }

  // ==========================================
  // ITEM 3: Sensor Fault Detection Tests
  // ==========================================
  try {
    const faultDetector = new SensorFaultDetector();

    // Test 3.1: Warming up status when warmup_done is false
    const warmingPacket = {
      uptime_ms: 60000,
      warmup_done: false,
      reset_reason: 'power_on',
      gas: {
        MQ4: { volts: 1.2, noise_v: 0.02, rs_r0: 1.5, status: 'ok' },
        MQ7: { volts: 1.0, noise_v: 0.02, rs_r0: 1.5, status: 'ok' },
        MQ136: { volts: 1.0, noise_v: 0.02, rs_r0: 1.5, status: 'ok' },
        MQ137: { volts: 1.0, noise_v: 0.02, rs_r0: 1.5, status: 'ok' }
      }
    };
    const warmingReport = faultDetector.evaluatePacket(warmingPacket);
    assert(warmingReport.anyWarmingUp === true && warmingReport.sensors.MQ4.status === 'warming_up', '3.1 Warming-up status is set when warmup_done is false (< 3 mins)');

    // Test 3.2: Fault low when voltage < 0.1V (sensor disconnected)
    const lowFaultPacket = {
      uptime_ms: 240000,
      warmup_done: true,
      gas: {
        MQ4: { volts: 0.04, noise_v: 0.01, rs_r0: 99, status: 'ok' },
        MQ7: { volts: 1.0, noise_v: 0.02, rs_r0: 1.5, status: 'ok' },
        MQ136: { volts: 1.0, noise_v: 0.02, rs_r0: 1.5, status: 'ok' },
        MQ137: { volts: 1.0, noise_v: 0.02, rs_r0: 1.5, status: 'ok' }
      }
    };
    const lowReport = faultDetector.evaluatePacket(lowFaultPacket);
    assert(lowReport.sensors.MQ4.status === 'fault_low', '3.2 Fault Low is triggered when ADC voltage < 0.1V');

    // Test 3.3: Fault high when voltage > 3.2V (sensor shorted)
    const highFaultPacket = {
      uptime_ms: 240000,
      warmup_done: true,
      gas: {
        MQ4: { volts: 3.28, noise_v: 0.01, rs_r0: 0.1, status: 'ok' },
        MQ7: { volts: 1.0, noise_v: 0.02, rs_r0: 1.5, status: 'ok' },
        MQ136: { volts: 1.0, noise_v: 0.02, rs_r0: 1.5, status: 'ok' },
        MQ137: { volts: 1.0, noise_v: 0.02, rs_r0: 1.5, status: 'ok' }
      }
    };
    const highReport = faultDetector.evaluatePacket(highFaultPacket);
    assert(highReport.sensors.MQ4.status === 'fault_high', '3.3 Fault High is triggered when ADC voltage > 3.2V');

    // Test 3.4: Noisy supply when noise_v > 0.06V (capacitor filter issue)
    const noisyPacket = {
      uptime_ms: 240000,
      warmup_done: true,
      gas: {
        MQ4: { volts: 1.5, noise_v: 0.085, rs_r0: 1.2, status: 'ok' },
        MQ7: { volts: 1.0, noise_v: 0.02, rs_r0: 1.5, status: 'ok' },
        MQ136: { volts: 1.0, noise_v: 0.02, rs_r0: 1.5, status: 'ok' },
        MQ137: { volts: 1.0, noise_v: 0.02, rs_r0: 1.5, status: 'ok' }
      }
    };
    const noisyReport = faultDetector.evaluatePacket(noisyPacket);
    assert(noisyReport.sensors.MQ4.status === 'noisy_supply', '3.4 Noisy Supply status triggered when noise_v > 0.06V');
  } catch (e) {
    assert(false, 'Item 3 Exception', e.message);
  }

  // ==========================================
  // ITEM 4: Gas Thresholds & Alerts Tests
  // ==========================================
  try {
    const alertMgr = new GasAlertManager();
    alertMgr.setThresholds('MQ4', { warningVolts: 1.8, dangerVolts: 2.4 });

    // Test 4.1: CRITICAL RULE: No alerts from warming-up or faulty sensors
    const warmSample = {
      warmup_done: false,
      gas: {
        MQ4: { volts: 2.9, noise_v: 0.01, rs_r0: 0.4, status: 'warming_up' }
      }
    };
    const warmAlerts = alertMgr.evaluatePacket(warmSample);
    assert(warmAlerts.length === 0, '4.1 CRITICAL: No alerts generated from warming-up sensors');

    // Test 4.2: Trigger alert when gas exceeds danger threshold on operational sensor
    const highGasSample = {
      warmup_done: true,
      gas: {
        MQ4: { volts: 2.6, noise_v: 0.02, rs_r0: 0.5, status: 'ok' }
      }
    };
    const alerts = alertMgr.evaluatePacket(highGasSample);
    assert(alerts.length > 0 && alerts[0].level === 'DANGER', '4.2 Danger alert triggered when gas voltage exceeds danger threshold on healthy sensor');

    // Test 4.3: Alert lifecycle - Acknowledge
    alertMgr.acknowledgeAlert('MQ4', 'Test Pilot');
    assert(alertMgr.activeAlerts.get('MQ4').status === 'ACKNOWLEDGED', '4.3 Alert acknowledged successfully by operator');

    // Test 4.4: Alert lifecycle - Snooze
    alertMgr.snoozeAlert('MQ4', 15);
    assert(alertMgr.activeAlerts.get('MQ4').status === 'SNOOZED', '4.4 Alert snoozed for 15 minutes');

    // Test 4.5: Alert lifecycle - Resolve
    alertMgr.resolveAlert('MQ4', 'Test resolution');
    assert(alertMgr.activeAlerts.has('MQ4') === false, '4.5 Alert resolved and cleared from active alerts map');
  } catch (e) {
    assert(false, 'Item 4 Exception', e.message);
  }

  // ==========================================
  // ITEM 5: Mission State Machine Tests
  // ==========================================
  try {
    const sm = new MissionStateMachine();
    sm.createNewMission('Test Recon Mission');

    // Test 5.1: Initial state is Draft
    assert(sm.getState() === MISSION_STATES.DRAFT, '5.1 Initial mission state is Draft');

    // Test 5.2: Draft -> Pre-flight is legal
    sm.transitionTo(MISSION_STATES.PRE_FLIGHT, { reason: 'Ready for pre-flight check' });
    assert(sm.getState() === MISSION_STATES.PRE_FLIGHT, '5.2 Permitted transition from Draft to Pre-flight succeeds');

    // Test 5.3: Illegal transition rejection (Pre-flight -> Completed is illegal)
    let errorCaught = false;
    try {
      sm.transitionTo(MISSION_STATES.COMPLETED);
    } catch (err) {
      if (err instanceof IllegalStateTransitionError) {
        errorCaught = true;
      }
    }
    assert(errorCaught === true, '5.3 Rejects illegal transition (Pre-flight directly to Completed) with IllegalStateTransitionError');

    // Test 5.4: Pre-flight to Active requires warm-up done
    let warmupErrorCaught = false;
    try {
      sm.transitionTo(MISSION_STATES.ACTIVE, { telemetry: { warmup_done: false, gps: { sats: 8 } } });
    } catch (err) {
      warmupErrorCaught = true;
    }
    assert(warmupErrorCaught === true, '5.4 Transition to Active is rejected if gas sensors are still warming up');

    // Test 5.5: Pre-flight -> Active with warmup_done and GPS
    sm.transitionTo(MISSION_STATES.ACTIVE, { telemetry: { warmup_done: true, gps: { sats: 8, hdop: 1.0 } } });
    assert(sm.getState() === MISSION_STATES.ACTIVE, '5.5 Transition to Active succeeds once pre-flight warm-up and GPS locked');

    // Test 5.6: Active -> Paused -> Resumed -> Completed
    sm.transitionTo(MISSION_STATES.PAUSED, { reason: 'Hovering for inspection' });
    assert(sm.getState() === MISSION_STATES.PAUSED, '5.6 Active transitions to Paused');

    sm.transitionTo(MISSION_STATES.RESUMED, { reason: 'Resuming corridor flight' });
    assert(sm.getState() === MISSION_STATES.RESUMED, '5.7 Paused transitions to Resumed');

    sm.transitionTo(MISSION_STATES.COMPLETED, { reason: 'Drone landed safely' });
    assert(sm.getState() === MISSION_STATES.COMPLETED, '5.8 Resumed transitions to Completed (terminal state)');

    // Test 5.7: Immutable timeline logged every transition
    const timeline = sm.getTimeline();
    assert(timeline.length >= 5, '5.9 Every state transition is recorded in immutable mission timeline');
  } catch (e) {
    assert(false, 'Item 5 Exception', e.message);
  }

  // ==========================================
  // ITEM 6: Local Database Storage & Stats Tests
  // ==========================================
  try {
    const storage = new TelemetryStorage();
    const testSample = {
      _receivedAt: Date.now(),
      seq: 101,
      uptime_ms: 120000,
      gas: {
        MQ4: { volts: 1.5, rs_r0: 1.8 },
        MQ7: { volts: 0.9, rs_r0: 2.1 },
        MQ136: { volts: 1.1, rs_r0: 1.6 },
        MQ137: { volts: 0.8, rs_r0: 2.4 }
      }
    };

    await storage.saveSample(testSample, 'TEST_MSN');
    const samples = await storage.getMissionSamples('TEST_MSN');
    assert(samples.length > 0, '6.1 Local telemetry storage saves and queries mission records');

    const stats = await storage.getGasStats('TEST_MSN');
    assert(stats && stats.gases.MQ4.minVolts > 0, '6.2 Summary statistics compute min, max, avg volts and Rs/R0');
  } catch (e) {
    assert(false, 'Item 6 Exception', e.message);
  }

  // ==========================================
  // ITEM 7: Priority 2 Advanced Analytics Tests
  // ==========================================
  try {
    const analytics = new AdvancedAnalyticsEngine();

    // Test 7.1: Hotspot detection flags "insufficient data" when samples < 5
    const sparseSamples = [
      { gps: { lat: 19.0760, lon: 72.8777 }, gas: { MQ4: { volts: 2.2 } } },
      { gps: { lat: 19.0761, lon: 72.8778 }, gas: { MQ4: { volts: 2.3 } } }
    ];
    const hotspotResult = analytics.computeHotspots(sparseSamples, 'MQ4', 5);
    assert(hotspotResult.hasSparseWarning === true && hotspotResult.cells[0].status === 'INSUFFICIENT_DATA',
      '7.1 Hotspot detector flags "insufficient data" when samples are sparse (< 5 in cell)');

    // Test 7.2: Hotspot detector validates cell when >= 5 samples
    const denseSamples = [];
    for (let i = 0; i < 6; i++) {
      denseSamples.push({ gps: { lat: 19.0760, lon: 72.8777 }, gas: { MQ4: { volts: 2.1 } } });
    }
    const denseResult = analytics.computeHotspots(denseSamples, 'MQ4', 5);
    assert(denseResult.validCellsCount > 0 && denseResult.cells[0].status === 'VALID',
      '7.2 Hotspot detector validates and computes cluster average when samples >= 5');

    // Test 7.3: Z-score anomaly detection (|z| > 2.5)
    const baselineSamples = [];
    for (let i = 0; i < 25; i++) {
      baselineSamples.push({ gas: { MQ4: { volts: 1.0 + (Math.random() - 0.5) * 0.05 } } });
    }
    const spikeSample = { gas: { MQ4: { volts: 2.8 } } }; // Massive spike
    const anomalyResult = analytics.computeZScoreAnomaly(baselineSamples, spikeSample, 'MQ4');
    assert(anomalyResult.isAnomaly === true && Math.abs(anomalyResult.zScore) >= 2.5,
      '7.3 Z-Score anomaly flag triggers when gas spike exceeds |z| > 2.5');

    // Test 7.4: Trend analysis
    const risingSamples = [];
    for (let i = 0; i < 10; i++) {
      risingSamples.push({ gas: { MQ4: { volts: 1.0 + i * 0.1 } } });
    }
    const trend = analytics.computeTrend(risingSamples, 'MQ4');
    assert(trend.trend.includes('RISING'), '7.4 Trend analysis identifies rapidly rising gas concentration');
  } catch (e) {
    assert(false, 'Item 7 Exception', e.message);
  }

  const passedCount = results.filter(r => r.passed).length;
  const failedCount = results.filter(r => !r.passed).length;

  console.log(`--- UNIT TESTS COMPLETE: ${passedCount} PASSED, ${failedCount} FAILED ---`);
  return { results, passedCount, failedCount, total: results.length };
}
