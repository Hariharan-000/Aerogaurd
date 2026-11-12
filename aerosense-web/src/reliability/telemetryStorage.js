/**
 * AERO GUARD - Reliability Module
 * Item 6A: Local Telemetry Database (IndexedDB)
 * 
 * Persists 1-second telemetry samples locally with high-performance IndexedDB,
 * with graceful in-memory/localStorage fallback.
 */

const DB_NAME = 'AeroGuardTelemetryDB_v2';
const DB_VERSION = 1;
const STORE_NAME = 'telemetry_samples';

export class TelemetryStorage {
  constructor() {
    this.db = null;
    this.memoryFallback = [];
    this.initPromise = this._initDB();
  }

  async _initDB() {
    if (typeof indexedDB === 'undefined') {
      console.warn('IndexedDB unavailable; using in-memory fallback.');
      return null;
    }

    return new Promise((resolve) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          const store = db.createObjectStore(STORE_NAME, { keyPath: 'id', autoIncrement: true });
          store.createIndex('missionId', 'missionId', { unique: false });
          store.createIndex('timestamp', 'timestamp', { unique: false });
          store.createIndex('seq', 'seq', { unique: false });
        }
      };

      request.onsuccess = (e) => {
        this.db = e.target.result;
        resolve(this.db);
      };

      request.onerror = (e) => {
        console.warn('IndexedDB open error:', e);
        resolve(null);
      };
    });
  }

  /**
   * Save a telemetry sample with mission ID
   */
  async saveSample(sample, missionId = 'DEFAULT_MISSION') {
    await this.initPromise;

    const record = {
      missionId,
      timestamp: sample._receivedAt || Date.now(),
      seq: sample.seq || 0,
      uptime_ms: sample.uptime_ms || 0,
      mode: sample.mode || 'DRONE',
      reset_reason: sample.reset_reason || 'power_on',
      warmup_done: sample.warmup_done || false,
      gas: sample.gas,
      env: sample.env,
      gps: sample.gps
    };

    if (!this.db) {
      this.memoryFallback.push(record);
      if (this.memoryFallback.length > 2000) this.memoryFallback.shift();
      return record;
    }

    return new Promise((resolve, reject) => {
      try {
        const tx = this.db.transaction([STORE_NAME], 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        const req = store.add(record);
        req.onsuccess = () => resolve(record);
        req.onerror = (e) => reject(e);
      } catch (err) {
        this.memoryFallback.push(record);
        resolve(record);
      }
    });
  }

  /**
   * Get all samples for a mission
   */
  async getMissionSamples(missionId, limit = 500) {
    await this.initPromise;

    if (!this.db) {
      return this.memoryFallback
        .filter(s => s.missionId === missionId)
        .slice(-limit);
    }

    return new Promise((resolve) => {
      try {
        const tx = this.db.transaction([STORE_NAME], 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const index = store.index('missionId');
        const req = index.getAll(IDBKeyRange.only(missionId));

        req.onsuccess = (e) => {
          const results = e.target.result || [];
          resolve(results.slice(-limit));
        };

        req.onerror = () => resolve([]);
      } catch (err) {
        resolve(this.memoryFallback.slice(-limit));
      }
    });
  }

  /**
   * Calculate summary statistics for historical gas readings
   */
  async getGasStats(missionId) {
    const samples = await this.getMissionSamples(missionId, 1000);
    if (!samples.length) return null;

    const stats = {
      count: samples.length,
      startTime: samples[0].timestamp,
      endTime: samples[samples.length - 1].timestamp,
      gases: {}
    };

    const keys = ['MQ4', 'MQ7', 'MQ136', 'MQ137'];
    for (const key of keys) {
      const voltsList = samples.map(s => s.gas && s.gas[key] ? s.gas[key].volts : 0).filter(v => v > 0);
      const rsR0List = samples.map(s => s.gas && s.gas[key] ? s.gas[key].rs_r0 : 0).filter(r => r > 0);

      const minV = voltsList.length ? Math.min(...voltsList) : 0;
      const maxV = voltsList.length ? Math.max(...voltsList) : 0;
      const avgV = voltsList.length ? voltsList.reduce((a, b) => a + b, 0) / voltsList.length : 0;

      const minR = rsR0List.length ? Math.min(...rsR0List) : 0;
      const maxR = rsR0List.length ? Math.max(...rsR0List) : 0;
      const avgR = rsR0List.length ? rsR0List.reduce((a, b) => a + b, 0) / rsR0List.length : 0;

      stats.gases[key] = {
        minVolts: Number(minV.toFixed(3)),
        maxVolts: Number(maxV.toFixed(3)),
        avgVolts: Number(avgV.toFixed(3)),
        minRsR0: Number(minR.toFixed(2)),
        maxRsR0: Number(maxR.toFixed(2)),
        avgRsR0: Number(avgR.toFixed(2))
      };
    }

    return stats;
  }
}

export const telemetryStorage = new TelemetryStorage();
