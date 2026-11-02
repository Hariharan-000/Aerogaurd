# AeroSense — Web & Mobile Application Suite

AeroSense is a real-time drone-mounted air quality telemetry and multi-gas sensor monitoring system.

---

## 🚀 1. Running in the Web Browser

The web application is powered by Vite, Vanilla CSS, Three.js, Chart.js, and Leaflet.

To run locally:
```bash
cd "e:\android application\Aero gaurd\aerosense-web"
npm run dev
```

Open your browser to:
- **Local:** [http://localhost:5173/](http://localhost:5173/)
- **Network / Mobile:** [http://172.1.1.71:5173/](http://172.1.1.71:5173/) (Access directly from your phone on the same Wi-Fi)

---

## 📱 2. Mobile Device Simulation in Browser

The browser version includes an interactive **Mobile Simulator Bar** at the top:
- **View Mode:** Toggle between **Mobile View** (realistic smartphone frame) and **Fullscreen Mode**.
- **Device Model:** Switch between **iPhone 16 Pro**, **Pixel 9 Pro**, and **Frameless Glass**.
- **Rotate:** Toggle between **Portrait** and **Landscape** orientation.
- **ESP32 Telemetry:** Pause/Resume the simulated 2-second telemetry cycle.
- **⚠️ Trigger Gas Alert:** Instantly trigger a critical multi-gas pollution spike to test telemetry alarms.

---

## 📲 3. Mobile Application (Android APK & PWA)

This project has been converted and configured for mobile deployment in two ways:

### Option A: Native Android App (Capacitor)
The project includes a full native Android project located in `aerosense-web/android/`.
1. Build web assets and sync:
   ```bash
   npm run build:mobile
   ```
2. Open in Android Studio:
   ```bash
   npx cap open android
   ```
3. In Android Studio, click **Run** or **Build APK** (`Build > Build Bundle(s) / APK(s) > Build APK(s)`).

### Option B: Progressive Web App (PWA)
1. Open [http://172.1.1.71:5173/](http://172.1.1.71:5173/) on Google Chrome or Safari on your phone.
2. Tap the browser menu and select **"Add to Home Screen"** or **"Install AeroSense"**.
3. AeroSense will install with its native icon, splash screen, and full standalone mobile UI.

---

## 🌟 4. Features & Screens

1. **Animated Splash Screen:** Drone calibration sequence with rotor startup.
2. **Home Overview:**
   - Real-time **AQI Radial Gauge** with dynamic color severity (Good, Moderate, Unhealthy, Hazardous).
   - 4 Environmental KPI Cards: Temperature (°C), Humidity (%), Barometer (hPa), Altitude (m).
   - 7-Sensor Multi-Gas snapshot table.
3. **Detailed Monitoring:**
   - Interactive grid for all 7 MQ sensors (**MQ-2**, **MQ-7**, **MQ-135**, **MQ-4**, **MQ-8**, **MQ-131**, **MQ-137**).
   - Real-time rolling graph (**Chart.js**) with live metric selection and Min/Max/Avg statistics.
4. **Live Interactive Map:**
   - **Leaflet.js** map with Dark & Satellite aerial toggle.
   - Live GPS flight trail (Mumbai to Thane airborne drone corridor).
   - Animated drone marker with speed and altitude telemetry.
   - Color-coded AQI waypoints with click popups.
5. **3D Drone & Sensor Demo:**
   - Interactive **Three.js** 3D Quadcopter model.
   - Spinning propellers with dynamic throttle slider.
   - Sensor pod housing the 7 MQ gas probes.
   - Dynamic airflow particle visualization.
   - 360° orbit camera and wireframe shader toggle.
6. **Explore & Settings:**
   - **Export CSV:** One-click download of collected telemetry flight logs.
   - **Mode Switcher:** DRONE airborne mode vs PORTABLE handheld mode.
   - **ESP32 Connection Dialog:** BLE signal and RSSI management.
   - **Hardware Diagnostics:** Sensor self-test, 4S LiPo battery status, GPS 3D fix.
