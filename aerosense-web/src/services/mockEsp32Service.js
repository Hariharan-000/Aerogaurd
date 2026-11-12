// Mock ESP32 Hardware Telemetry Service
import { computeAQI } from './sensorConfig.js';

class MockESP32Service {
  constructor() {
    this.isConnected = true;
    this.mode = 'DRONE'; // 'DRONE' or 'PORTABLE'
    this.deviceId = 'AERO_001_MOCK';
    this.interval = null;
    this.sequenceIndex = 0;
    this.listeners = new Set();
    this.history = [];
    this.emergencySpikeActive = false;

    // Flight route points (Mumbai to Thane airborne drone corridor)
    this.sequence = [
      { gas1: 45.0, gas2: 15.0, gas3: 30.0, gas4: 400.0, gas5: 5.0, gas6: 2.0, gas7: 0.5, temp: 28.5, hum: 65.0, lat: 19.0760, lng: 72.8777, alt: 110.5, speed: 14.2 },
      { gas1: 65.0, gas2: 25.0, gas3: 45.0, gas4: 410.0, gas5: 10.0, gas6: 5.0, gas7: 1.0, temp: 29.0, hum: 63.0, lat: 19.1000, lng: 72.9000, alt: 125.0, speed: 18.5 },
      { gas1: 110.0, gas2: 50.0, gas3: 80.0, gas4: 430.0, gas5: 20.0, gas6: 15.0, gas7: 3.0, temp: 29.5, hum: 60.0, lat: 19.1200, lng: 72.9200, alt: 140.2, speed: 16.8 },
      { gas1: 280.0, gas2: 95.0, gas3: 450.0, gas4: 680.0, gas5: 45.0, gas6: 30.0, gas7: 8.0, temp: 31.5, hum: 52.0, lat: 19.1500, lng: 72.9500, alt: 155.8, speed: 12.0 },
      { gas1: 320.0, gas2: 120.0, gas3: 510.0, gas4: 720.0, gas5: 48.0, gas6: 32.0, gas7: 8.5, temp: 31.8, hum: 51.0, lat: 19.1700, lng: 72.9700, alt: 162.0, speed: 11.4 },
      { gas1: 150.0, gas2: 60.0, gas3: 200.0, gas4: 450.0, gas5: 30.0, gas6: 20.0, gas7: 5.0, temp: 30.0, hum: 58.0, lat: 19.1900, lng: 72.9900, alt: 145.0, speed: 15.6 },
      { gas1: 75.0, gas2: 30.0, gas3: 50.0, gas4: 420.0, gas5: 15.0, gas6: 10.0, gas7: 2.0, temp: 29.2, hum: 62.0, lat: 19.2100, lng: 73.0100, alt: 130.4, speed: 17.1 },
      { gas1: 48.0, gas2: 18.0, gas3: 32.0, gas4: 405.0, gas5: 6.0, gas6: 3.0, gas7: 0.8, temp: 28.8, hum: 64.0, lat: 19.2300, lng: 73.0300, alt: 118.0, speed: 14.8 },
    ];

    // Seed initial history point
    this.latestPacket = this._generateDataPoint();
    this.history.push(this.latestPacket);
  }

  startStream(intervalMs = 2000) {
    if (this.interval) clearInterval(this.interval);
    this.isConnected = true;
    this.interval = setInterval(() => {
      if (!this.isConnected) return;
      const packet = this._generateDataPoint();
      this.latestPacket = packet;
      this.history.push(packet);
      if (this.history.length > 200) this.history.shift();
      this._notify(packet);
    }, intervalMs);
  }

  stopStream() {
    this.isConnected = false;
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
    this._notify(this.latestPacket);
  }

  toggleStream() {
    if (this.isConnected) {
      this.stopStream();
    } else {
      this.startStream();
    }
    return this.isConnected;
  }

  triggerSpike() {
    this.emergencySpikeActive = true;
    setTimeout(() => {
      this.emergencySpikeActive = false;
    }, 10000);
  }

  setMode(newMode) {
    this.mode = newMode;
    if (this.latestPacket) {
      this.latestPacket.mode = newMode;
      this._notify(this.latestPacket);
    }
  }

  subscribe(callback) {
    this.listeners.add(callback);
    if (this.latestPacket) callback(this.latestPacket);
    return () => this.listeners.delete(callback);
  }

  _notify(data) {
    for (const cb of this.listeners) {
      try {
        cb(data);
      } catch (e) {
        console.error('Telemetry subscriber error:', e);
      }
    }
  }

  _generateDataPoint() {
    const raw = this.sequence[this.sequenceIndex];
    this.sequenceIndex = (this.sequenceIndex + 1) % this.sequence.length;

    // Subtle random sensor noise
    const noise = (factor = 1) => (Math.random() - 0.5) * factor;

    let multiplier = 1;
    if (this.emergencySpikeActive) {
      multiplier = 2.8;
    }

    const gases = {
      gas1: Math.max(10, Math.round((raw.gas1 * multiplier + noise(8)) * 10) / 10),
      gas2: Math.max(2, Math.round((raw.gas2 * multiplier + noise(4)) * 10) / 10),
      gas3: Math.max(15, Math.round((raw.gas3 * multiplier + noise(15)) * 10) / 10),
      gas4: Math.max(100, Math.round((raw.gas4 * (multiplier > 1 ? 1.8 : 1) + noise(20)) * 10) / 10),
      gas5: Math.max(1, Math.round((raw.gas5 * multiplier + noise(3)) * 10) / 10),
      gas6: Math.max(0.2, Math.round((raw.gas6 * multiplier + noise(1.5)) * 10) / 10),
      gas7: Math.max(0.1, Math.round((raw.gas7 * multiplier + noise(0.8)) * 10) / 10),
    };

    const aqiData = computeAQI(gases);

    return {
      deviceId: this.deviceId,
      timestamp: Date.now(),
      mode: this.mode,
      isConnected: this.isConnected,
      gases,
      aqi: aqiData.aqi,
      aqiStatus: aqiData.status,
      aqiColor: aqiData.color,
      aqiText: aqiData.text,
      temperature: Math.round((raw.temp + noise(0.4)) * 10) / 10,
      humidity: Math.round((raw.hum + noise(1.2)) * 10) / 10,
      pressure: 1013.25 + Math.round(noise(1.5) * 10) / 10,
      altitude: Math.round((raw.alt + noise(2)) * 10) / 10,
      latitude: raw.lat + noise(0.0008),
      longitude: raw.lng + noise(0.0008),
      speed: Math.round((raw.speed + noise(1)) * 10) / 10,
      batteryLevel: 94 - Math.floor((this.history.length / 50) % 20),
      rssi: -62 + Math.floor(noise(8))
    };
  }
}

export const esp32Service = new MockESP32Service();
