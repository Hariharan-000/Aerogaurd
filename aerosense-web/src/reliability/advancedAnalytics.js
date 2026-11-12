/**
 * AERO GUARD - Reliability Module
 * Priority 2: Advanced Monitoring & Analytics
 * 
 * Features:
 * 1. GPS-tagged gas heatmap & hotspot detection (shows "insufficient data" when samples are sparse).
 * 2. Gas trend analysis (rate of change over sliding window).
 * 3. Z-score anomaly detection (|z| > 2.5).
 * 4. Battery, GPS quality (HDOP, sats, age), and latency monitoring.
 * 5. Mission replay engine.
 */

import { GAS_KEYS, GAS_METADATA } from './telemetryReliabilityService.js';

export class AdvancedAnalyticsEngine {
  constructor() {
    this.replayIndex = 0;
    this.replaySamples = [];
    this.isReplaying = false;
    this.replayTimer = null;
    this.replaySpeed = 1;
    this.replaySubscribers = new Set();
  }

  /**
   * 1. GPS Heatmap & Hotspot Detection
   * Evaluates spatial clusters.
   * STRICT REQUIREMENT: If a cell has fewer than 5 samples, flag "insufficient data".
   */
  computeHotspots(samples, gasKey = 'MQ4', minSamplesPerCell = 5) {
    if (!samples || samples.length === 0) {
      return { status: 'NO_DATA', message: 'No GPS telemetry samples available', cells: [], hotspots: [] };
    }

    // Grid binning: resolution ~ 0.0005 deg (~50 meters)
    const gridSize = 0.0005;
    const gridMap = new Map();

    for (const s of samples) {
      if (!s.gps || typeof s.gps.lat !== 'number' || typeof s.gps.lon !== 'number') continue;
      const val = s.gas && s.gas[gasKey] ? s.gas[gasKey].volts : 0;

      const cellLat = Math.floor(s.gps.lat / gridSize) * gridSize;
      const cellLon = Math.floor(s.gps.lon / gridSize) * gridSize;
      const cellKey = `${cellLat.toFixed(4)},${cellLon.toFixed(4)}`;

      if (!gridMap.has(cellKey)) {
        gridMap.set(cellKey, {
          cellLat,
          cellLon,
          values: [],
          samples: 0
        });
      }

      const cell = gridMap.get(cellKey);
      cell.values.push(val);
      cell.samples++;
    }

    const cells = [];
    const hotspots = [];
    let sparseCellsCount = 0;

    for (const [key, cell] of gridMap.entries()) {
      if (cell.samples < minSamplesPerCell) {
        sparseCellsCount++;
        cells.push({
          center: [cell.cellLat + gridSize / 2, cell.cellLon + gridSize / 2],
          samplesCount: cell.samples,
          status: 'INSUFFICIENT_DATA',
          label: 'Insufficient data (sparse samples < 5)',
          avgValue: null
        });
      } else {
        const sum = cell.values.reduce((a, b) => a + b, 0);
        const avg = sum / cell.samples;
        const max = Math.max(...cell.values);

        const cellData = {
          center: [cell.cellLat + gridSize / 2, cell.cellLon + gridSize / 2],
          samplesCount: cell.samples,
          status: 'VALID',
          avgValue: Number(avg.toFixed(3)),
          maxValue: Number(max.toFixed(3))
        };
        cells.push(cellData);

        // Hotspot flag: cell average voltage > 1.8V (indicative elevated gas)
        if (avg >= 1.8) {
          hotspots.push({
            ...cellData,
            severity: avg >= 2.4 ? 'CRITICAL' : 'ELEVATED',
            gasTarget: GAS_METADATA[gasKey].name
          });
        }
      }
    }

    return {
      status: 'OK',
      totalCells: gridMap.size,
      sparseCellsCount,
      validCellsCount: gridMap.size - sparseCellsCount,
      hasSparseWarning: sparseCellsCount > 0,
      sparseWarningMessage: sparseCellsCount > 0 ? `${sparseCellsCount} grid cell(s) have insufficient data (< 5 samples)` : null,
      cells,
      hotspots
    };
  }

  /**
   * 2. Gas Trend Analysis (Rate of change over sliding window)
   */
  computeTrend(samples, gasKey = 'MQ4', windowSize = 10) {
    if (!samples || samples.length < 3) {
      return { trend: 'STABLE', slope: 0, description: 'Accumulating data' };
    }

    const window = samples.slice(-windowSize);
    const n = window.length;

    // Linear regression on gas voltage over time index
    let sumX = 0;
    let sumY = 0;
    let sumXY = 0;
    let sumXX = 0;

    for (let i = 0; i < n; i++) {
      const y = window[i].gas && window[i].gas[gasKey] ? window[i].gas[gasKey].volts : 0;
      sumX += i;
      sumY += y;
      sumXY += i * y;
      sumXX += i * i;
    }

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const roundedSlope = Number((slope * 10).toFixed(3)); // per 10 samples

    let trend = 'STABLE';
    let description = 'Gas readings steady';

    if (roundedSlope > 0.08) {
      trend = 'RISING_FAST';
      description = `Rapidly increasing gas levels (+${roundedSlope} V/10s)`;
    } else if (roundedSlope > 0.03) {
      trend = 'RISING';
      description = `Gradually increasing (+${roundedSlope} V/10s)`;
    } else if (roundedSlope < -0.08) {
      trend = 'FALLING_FAST';
      description = `Rapidly dissipating (-${Math.abs(roundedSlope)} V/10s)`;
    } else if (roundedSlope < -0.03) {
      trend = 'FALLING';
      description = `Gradually dissipating (-${Math.abs(roundedSlope)} V/10s)`;
    }

    return { trend, slope: roundedSlope, description };
  }

  /**
   * 3. Z-Score Anomaly Detection
   * Flags reading if |z| > 2.5 compared to running baseline.
   */
  computeZScoreAnomaly(samples, currentSample, gasKey = 'MQ4') {
    if (!samples || samples.length < 15) {
      return { isAnomaly: false, zScore: 0, message: 'Baseline building' };
    }

    const values = samples.map(s => s.gas && s.gas[gasKey] ? s.gas[gasKey].volts : 0).filter(v => v > 0);
    if (values.length < 10) return { isAnomaly: false, zScore: 0 };

    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    if (stdDev < 0.01) return { isAnomaly: false, zScore: 0 };

    const currentVal = currentSample.gas && currentSample.gas[gasKey] ? currentSample.gas[gasKey].volts : 0;
    const zScore = Number(((currentVal - mean) / stdDev).toFixed(2));

    const isAnomaly = Math.abs(zScore) >= 2.5;

    return {
      isAnomaly,
      zScore,
      mean: Number(mean.toFixed(3)),
      stdDev: Number(stdDev.toFixed(3)),
      currentVal: Number(currentVal.toFixed(3)),
      message: isAnomaly
        ? `Statistical gas spike detected! Z-score: ${zScore} (|z| > 2.5 threshold)`
        : 'Gas reading within standard statistical variance'
    };
  }

  /**
   * 4. Drone Battery, GPS Quality & Latency Monitoring
   */
  evaluateHardwareMetrics(latestSample, previousTimestamp = 0) {
    if (!latestSample) return null;

    const gps = latestSample.gps || {};
    const sats = gps.sats || 0;
    const hdop = gps.hdop || 99;
    const gpsAgeMs = gps.age_ms || 0;

    // Latency
    const now = Date.now();
    const packetArrivalLatencyMs = latestSample._receivedAt ? Math.max(0, now - latestSample._receivedAt) : 0;

    // GPS Fix quality classification
    let gpsStatus = 'NO_FIX';
    let gpsBadge = 'badge-danger';
    if (sats >= 8 && hdop <= 1.2) {
      gpsStatus = 'EXCELLENT';
      gpsBadge = 'badge-ok';
    } else if (sats >= 6 && hdop <= 2.0) {
      gpsStatus = 'GOOD';
      gpsBadge = 'badge-ok';
    } else if (sats >= 4 && hdop <= 3.5) {
      gpsStatus = 'FAIR';
      gpsBadge = 'badge-warning';
    }

    return {
      battery: {
        estimatedUptimeMinutes: Math.floor((latestSample.uptime_ms || 0) / 60000),
        status: (latestSample.uptime_ms || 0) > 1200000 ? 'LOW' : 'NORMAL' // Drone flight time typically ~20-25 mins
      },
      gps: {
        sats,
        hdop,
        ageMs: gpsAgeMs,
        status: gpsStatus,
        badgeClass: gpsBadge,
        isLockSafeForFlight: sats >= 6 && hdop <= 2.0
      },
      latency: {
        latencyMs: packetArrivalLatencyMs,
        isDegraded: packetArrivalLatencyMs > 2500
      }
    };
  }

  /**
   * 5. Mission Replay Engine
   */
  loadReplay(samples) {
    this.pauseReplay();
    this.replaySamples = samples || [];
    this.replayIndex = 0;
    this._notifyReplay();
  }

  startReplay(speed = 1) {
    if (!this.replaySamples.length) return;
    this.replaySpeed = speed;
    this.isReplaying = true;

    if (this.replayTimer) clearInterval(this.replayTimer);
    const intervalMs = Math.max(100, Math.floor(1000 / this.replaySpeed));

    this.replayTimer = setInterval(() => {
      if (this.replayIndex >= this.replaySamples.length - 1) {
        this.pauseReplay();
        return;
      }
      this.replayIndex++;
      this._notifyReplay();
    }, intervalMs);

    this._notifyReplay();
  }

  pauseReplay() {
    this.isReplaying = false;
    if (this.replayTimer) {
      clearInterval(this.replayTimer);
      this.replayTimer = null;
    }
    this._notifyReplay();
  }

  seekReplay(index) {
    if (!this.replaySamples.length) return;
    this.replayIndex = Math.max(0, Math.min(this.replaySamples.length - 1, index));
    this._notifyReplay();
  }

  subscribeReplay(callback) {
    this.replaySubscribers.add(callback);
    this._notifyReplay();
    return () => this.replaySubscribers.delete(callback);
  }

  _notifyReplay() {
    const currentSample = this.replaySamples[this.replayIndex] || null;
    const state = {
      isReplaying: this.isReplaying,
      currentIndex: this.replayIndex,
      totalSamples: this.replaySamples.length,
      currentSample,
      speed: this.replaySpeed
    };

    for (const cb of this.replaySubscribers) {
      try {
        cb(state);
      } catch (e) {
        console.error('Replay subscriber error:', e);
      }
    }
  }
}

export const advancedAnalytics = new AdvancedAnalyticsEngine();
