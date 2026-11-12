/**
 * AERO GUARD - Reliability Module
 * Item 1 & Telemetry Ingestion Engine
 * 
 * Hardware: ESP32 with MQ-4, MQ-7, MQ-136, MQ-137, BME680, GPS.
 * Sensor filter: Polarized electrolytic capacitor (+ to 5V, other leg to GND).
 * Voltage divider: 10k/20k reduces MQ outputs (0-5V) to 0-3.3V ADC range.
 * 
 * Rules:
 * - Freshness: Stale after 5s, Offline after 15s.
 * - Show LIVE ONLY for real hardware data, NEVER during simulation.
 * - Flag brownout reset as a power-supply warning.
 * - Automatic reconnection with exponential backoff and zero crash guarantees.
 * - Telemetry is indicative only.
 */

export const GAS_KEYS = ['MQ4', 'MQ7', 'MQ136', 'MQ137'];

export const GAS_METADATA = {
  MQ4: { name: 'Methane (CH4)', sensor: 'MQ-4', defaultUnit: 'Rs/R0', cleanAirRatio: 4.4, color: '#10B981' },
  MQ7: { name: 'Carbon Monoxide (CO)', sensor: 'MQ-7', defaultUnit: 'Rs/R0', cleanAirRatio: 26.0, color: '#EF4444' },
  MQ136: { name: 'Hydrogen Sulfide (H2S)', sensor: 'MQ-136', defaultUnit: 'Rs/R0', cleanAirRatio: 3.6, color: '#F59E0B' },
  MQ137: { name: 'Ammonia (NH3)', sensor: 'MQ-137', defaultUnit: 'Rs/R0', cleanAirRatio: 3.8, color: '#8B5CF6' }
};

export class TelemetryReliabilityService {
  constructor() {
    this.latestPacket = null;
    this.lastPacketTimestamp = 0;
    this.subscribers = new Set();
    this.freshnessSubscribers = new Set();
    this.statusTimer = null;
    this.reconnectTimer = null;
    this.reconnectAttempts = 0;
    this.maxReconnectAttempts = 10;
    this.isSimulation = true;
    this.isRealHardwareConnected = false;
    this.reconnectBackoffMs = 1000;
    this.brownoutWarningActive = false;
    this.brownoutEvent = null;
    
    // Default simulated sequence state
    this.simUptimeMs = 0;
    this.simSeq = 1;
    this.simWarmupDone = true;
    this.simInterval = null;

    // Start freshness evaluation loop (runs every 500ms)
    this.startFreshnessWatchdog();
  }

  /**
   * Evaluates data freshness:
   * Fresh: < 5,000ms
   * Stale: 5,000ms - 14,999ms
   * Offline: >= 15,000ms (or no packet received yet)
   */
  getFreshnessState() {
    if (!this.lastPacketTimestamp) {
      return {
        status: 'offline',
        label: 'OFFLINE',
        badgeClass: 'badge-offline',
        ageMs: Infinity,
        isFresh: false,
        isStale: false,
        isOffline: true,
        isLive: false,
        isSimulation: this.isSimulation
      };
    }

    const ageMs = Date.now() - this.lastPacketTimestamp;

    if (ageMs < 5000) {
      const isLive = !this.isSimulation && this.isRealHardwareConnected;
      return {
        status: 'fresh',
        label: isLive ? 'LIVE' : 'SIMULATION',
        badgeClass: isLive ? 'badge-live' : 'badge-simulation',
        ageMs,
        isFresh: true,
        isStale: false,
        isOffline: false,
        isLive,
        isSimulation: this.isSimulation
      };
    }

    if (ageMs < 15000) {
      return {
        status: 'stale',
        label: `STALE (${Math.round(ageMs / 1000)}s ago)`,
        badgeClass: 'badge-stale',
        ageMs,
        isFresh: false,
        isStale: true,
        isOffline: false,
        isLive: false,
        isSimulation: this.isSimulation
      };
    }

    return {
      status: 'offline',
      label: `OFFLINE (${Math.round(ageMs / 1000)}s ago)`,
      badgeClass: 'badge-offline',
      ageMs,
      isFresh: false,
      isStale: false,
      isOffline: true,
      isLive: false,
      isSimulation: this.isSimulation
    };
  }

  startFreshnessWatchdog() {
    if (this.statusTimer) clearInterval(this.statusTimer);
    this.statusTimer = setInterval(() => {
      const freshness = this.getFreshnessState();
      for (const cb of this.freshnessSubscribers) {
        try {
          cb(freshness);
        } catch (e) {
          console.error('Freshness subscriber error:', e);
        }
      }
    }, 500);
  }

  /**
   * Validates and parses an incoming ESP32 JSON telemetry string or object.
   * Telemetry Schema:
   * {device, mode, seq, uptime_ms, reset_reason, warmup_done,
   *  gas:{MQ4|MQ7|MQ136|MQ137:{volts, noise_v, rs_r0, status}},
   *  env:{temp_c, hum_pct, press_hpa}, gps:{lat, lon, sats, hdop, age_ms}}
   */
  ingestPacket(rawPacket, isRealHardware = false) {
    try {
      let packet = rawPacket;
      if (typeof rawPacket === 'string') {
        packet = JSON.parse(rawPacket);
      }

      if (!packet || typeof packet !== 'object') {
        throw new Error('Invalid telemetry payload: must be a JSON object');
      }

      // Check required top-level fields
      const requiredFields = ['device', 'mode', 'seq', 'uptime_ms', 'reset_reason', 'warmup_done', 'gas', 'env', 'gps'];
      for (const field of requiredFields) {
        if (packet[field] === undefined) {
          throw new Error(`Telemetry missing required field: ${field}`);
        }
      }

      // Check gas sensors
      for (const gasKey of GAS_KEYS) {
        if (!packet.gas[gasKey]) {
          throw new Error(`Telemetry gas missing sensor entry: ${gasKey}`);
        }
        const g = packet.gas[gasKey];
        if (typeof g.volts !== 'number' || typeof g.noise_v !== 'number' || typeof g.rs_r0 !== 'number' || typeof g.status !== 'string') {
          throw new Error(`Telemetry gas.${gasKey} missing required numeric fields or status`);
        }
      }

      // Flag brownout reset reason
      const reason = String(packet.reset_reason).toLowerCase();
      if (reason.includes('brownout')) {
        this.brownoutWarningActive = true;
        this.brownoutEvent = {
          timestamp: Date.now(),
          device: packet.device,
          uptime_ms: packet.uptime_ms,
          reason: packet.reset_reason,
          message: 'ESP32 Brownout Reset detected! Sensor 5V supply dropped below operational threshold. Verify electrolytic capacitor polarity (+ to 5V, - to GND) and 10k/20k voltage divider integrity.'
        };
      }

      // Update state
      this.isSimulation = !isRealHardware;
      this.isRealHardwareConnected = isRealHardware;
      this.lastPacketTimestamp = Date.now();
      
      // Store packet with enrichment
      const enrichedPacket = {
        ...packet,
        _receivedAt: this.lastPacketTimestamp,
        _isRealHardware: isRealHardware,
        _freshness: this.getFreshnessState()
      };

      this.latestPacket = enrichedPacket;
      this.reconnectAttempts = 0; // Reset reconnection counter on success

      // Notify telemetry subscribers
      for (const cb of this.subscribers) {
        try {
          cb(enrichedPacket);
        } catch (e) {
          console.error('Telemetry subscriber error:', e);
        }
      }

      return { success: true, packet: enrichedPacket };
    } catch (err) {
      console.warn('Telemetry ingestion error:', err.message);
      return { success: false, error: err.message };
    }
  }

  /**
   * Dismiss the brownout warning once acknowledged by user
   */
  dismissBrownoutWarning() {
    this.brownoutWarningActive = false;
  }

  /**
   * Start generating simulated telemetry adhering to exact format
   */
  startSimulatedStream(intervalMs = 1000) {
    if (this.simInterval) clearInterval(this.simInterval);
    this.isSimulation = true;
    this.isRealHardwareConnected = false;

    this.simInterval = setInterval(() => {
      this.simUptimeMs += intervalMs;
      this.simSeq += 1;
      const simPacket = this._generateSimulatedPacket();
      this.ingestPacket(simPacket, false);
    }, intervalMs);

    // Initial packet immediately
    const initPacket = this._generateSimulatedPacket();
    this.ingestPacket(initPacket, false);
  }

  stopSimulatedStream() {
    if (this.simInterval) {
      clearInterval(this.simInterval);
      this.simInterval = null;
    }
  }

  _generateSimulatedPacket() {
    const t = this.simUptimeMs / 1000;
    const noise = (scale = 0.02) => (Math.random() - 0.5) * scale;

    // Simulate 3-minute warm-up if uptime < 180s (unless forced done)
    const warmupDone = this.simUptimeMs >= 180000;

    // Base voltage (simulated 0.5V - 2.5V into 3.3V ADC via 10k/20k divider)
    const mq4Volts = Math.max(0.2, Math.min(3.1, 1.25 + 0.35 * Math.sin(t / 15) + noise(0.04)));
    const mq7Volts = Math.max(0.2, Math.min(3.1, 0.85 + 0.20 * Math.sin(t / 20) + noise(0.03)));
    const mq136Volts = Math.max(0.2, Math.min(3.1, 1.05 + 0.30 * Math.cos(t / 18) + noise(0.05)));
    const mq137Volts = Math.max(0.2, Math.min(3.1, 0.75 + 0.15 * Math.sin(t / 25) + noise(0.03)));

    const calcRsR0 = (volts, baseline = 1.0) => {
      // Indicative ratio
      return Math.max(0.1, Number((baseline / Math.max(0.1, volts)).toFixed(2)));
    };

    const getStatus = (volts, noiseV) => {
      if (!warmupDone) return 'warming_up';
      if (noiseV > 0.06) return 'noisy_supply';
      if (volts < 0.1) return 'fault_low';
      if (volts > 3.2) return 'fault_high';
      return 'ok';
    };

    const mq4Noise = Math.abs(noise(0.04));
    const mq7Noise = Math.abs(noise(0.03));
    const mq136Noise = Math.abs(noise(0.05));
    const mq137Noise = Math.abs(noise(0.03));

    return {
      device: 'ESP32_AERO_01',
      mode: 'DRONE',
      seq: this.simSeq,
      uptime_ms: this.simUptimeMs,
      reset_reason: 'power_on',
      warmup_done: warmupDone,
      gas: {
        MQ4: {
          volts: Number(mq4Volts.toFixed(3)),
          noise_v: Number(mq4Noise.toFixed(3)),
          rs_r0: calcRsR0(mq4Volts, 1.25),
          status: getStatus(mq4Volts, mq4Noise)
        },
        MQ7: {
          volts: Number(mq7Volts.toFixed(3)),
          noise_v: Number(mq7Noise.toFixed(3)),
          rs_r0: calcRsR0(mq7Volts, 0.85),
          status: getStatus(mq7Volts, mq7Noise)
        },
        MQ136: {
          volts: Number(mq136Volts.toFixed(3)),
          noise_v: Number(mq136Noise.toFixed(3)),
          rs_r0: calcRsR0(mq136Volts, 1.05),
          status: getStatus(mq136Volts, mq136Noise)
        },
        MQ137: {
          volts: Number(mq137Volts.toFixed(3)),
          noise_v: Number(mq137Noise.toFixed(3)),
          rs_r0: calcRsR0(mq137Volts, 0.75),
          status: getStatus(mq137Volts, mq137Noise)
        }
      },
      env: {
        temp_c: Number((28.5 + 1.2 * Math.sin(t / 60)).toFixed(1)),
        hum_pct: Number((58.0 + 3.0 * Math.cos(t / 80)).toFixed(1)),
        press_hpa: Number((1012.8 + noise(0.5)).toFixed(1))
      },
      gps: {
        lat: Number((19.0760 + 0.002 * Math.sin(t / 100)).toFixed(6)),
        lon: Number((72.8777 + 0.002 * Math.cos(t / 100)).toFixed(6)),
        sats: 9,
        hdop: 0.95,
        age_ms: Math.floor(Math.random() * 300) + 50
      }
    };
  }

  /**
   * Ingest real telemetry from WebSocket or BLE with auto-reconnection
   */
  connectWebSocket(url) {
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }

    try {
      this.ws = new WebSocket(url);

      this.ws.onopen = () => {
        console.log('Real ESP32 WebSocket connected to', url);
        this.reconnectAttempts = 0;
        this.reconnectBackoffMs = 1000;
        this.isRealHardwareConnected = true;
        this.isSimulation = false;
        this.stopSimulatedStream();
      };

      this.ws.onmessage = (event) => {
        this.ingestPacket(event.data, true);
      };

      this.ws.onerror = (err) => {
        console.warn('ESP32 WebSocket error:', err);
      };

      this.ws.onclose = () => {
        console.warn('ESP32 WebSocket closed. Attempting reconnect...');
        this.isRealHardwareConnected = false;
        this.scheduleReconnect(url);
      };
    } catch (err) {
      console.error('Failed to initiate WebSocket:', err);
      this.scheduleReconnect(url);
    }
  }

  scheduleReconnect(url) {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('Max reconnect attempts reached. Switching to offline state.');
      return;
    }
    this.reconnectAttempts++;
    const delay = Math.min(30000, this.reconnectBackoffMs * Math.pow(1.5, this.reconnectAttempts));
    clearTimeout(this.reconnectTimer);
    this.reconnectTimer = setTimeout(() => {
      this.connectWebSocket(url);
    }, delay);
  }

  subscribe(callback) {
    this.subscribers.add(callback);
    if (this.latestPacket) {
      callback(this.latestPacket);
    }
    return () => this.subscribers.delete(callback);
  }

  subscribeFreshness(callback) {
    this.freshnessSubscribers.add(callback);
    callback(this.getFreshnessState());
    return () => this.freshnessSubscribers.delete(callback);
  }

  destroy() {
    if (this.statusTimer) clearInterval(this.statusTimer);
    if (this.simInterval) clearInterval(this.simInterval);
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) {
      try { this.ws.close(); } catch (_) {}
    }
    this.subscribers.clear();
    this.freshnessSubscribers.clear();
  }
}

export const telemetryReliabilityService = new TelemetryReliabilityService();
