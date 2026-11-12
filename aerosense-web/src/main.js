import './styles/app.css';
import { esp32Service } from './services/mockEsp32Service.js';
import { renderHomeScreen } from './components/homeScreen.js';
import { renderMonitorScreen, updateChart } from './components/monitorScreen.js';
import { renderMapScreen, updateMapTelemetry } from './components/mapScreen.js';
import { ThreeDroneDemo } from './components/threeDroneDemo.js';
import { renderExploreScreen } from './components/exploreScreen.js';
import { showConnectionModal } from './components/connectionModal.js';
import { showDiagnosticsModal } from './components/diagnosticsModal.js';
import { IntroPage } from './components/introPage.js';
import { renderLiveOpsDashboard } from './components/liveOpsDashboard.js';
import { telemetryReliabilityService } from './reliability/telemetryReliabilityService.js';
import { telemetryStorage } from './reliability/telemetryStorage.js';
import { gasAlertManager } from './reliability/gasAlertManager.js';
import { missionStateMachine } from './reliability/missionStateMachine.js';
import { showTestRunnerModal } from './reliability/testRunnerModal.js';

// Application State
let activeTab = 'home'; // 'splash', 'home', 'monitor', 'map', 'demo3d', 'explore'
let latestData = esp32Service.latestPacket;
let threeDemoInstance = null;
let introInstance = null;

const appRoot = document.getElementById('app-root');

// Launch Animated Intro Tour
export function launchIntroTour() {
  if (threeDemoInstance) {
    threeDemoInstance.destroy();
    threeDemoInstance = null;
  }
  introInstance = new IntroPage(appRoot, () => {
    switchTab('home');
  });
}

// Initialize App
function initApp() {
  initSimulatorControls();
  initStatusClock();
  
  // Show Advanced Animated Intro Onboarding
  launchIntroTour();

  // Initialize Reliability Telemetry Stream (1Hz exact schema)
  telemetryReliabilityService.startSimulatedStream(1000);
  telemetryReliabilityService.subscribe((packet) => {
    // Persist 1-second samples locally with IndexedDB
    telemetryStorage.saveSample(packet, missionStateMachine.getMission().id);
    // Evaluate gas thresholds and alert triggers (suppressed if warming up or faulty)
    gasAlertManager.evaluatePacket(packet);

    // If OPS dashboard is active, re-render
    if (activeTab === 'ops') {
      const viewport = document.getElementById('screen-viewport');
      if (viewport) renderLiveOpsDashboard(viewport);
    }
  });

  telemetryReliabilityService.subscribeFreshness((freshness) => {
    updateHeaderFreshness(freshness);
  });

  // Subscribe to ESP32 Telemetry Stream
  esp32Service.subscribe((data) => {
    latestData = data;
    handleTelemetryUpdate(data);
  });

  // Start ESP32 Stream
  esp32Service.startStream(2000);
}

// 1. Splash Screen
function renderSplashScreen() {
  appRoot.innerHTML = `
    <div class="splash-container">
      <div class="splash-drone-icon">
        <svg viewBox="0 0 100 100" fill="none">
          <circle cx="50" cy="50" r="46" stroke="#06B6D4" stroke-width="1.5" stroke-dasharray="6, 6" opacity="0.6"/>
          <path d="M25 25L75 75M75 25L25 75" stroke="#38BDF8" stroke-width="4" stroke-linecap="round"/>
          <circle cx="25" cy="25" r="10" stroke="#06B6D4" stroke-width="2.5" fill="#0D1424"/>
          <circle cx="75" cy="25" r="10" stroke="#06B6D4" stroke-width="2.5" fill="#0D1424"/>
          <circle cx="25" cy="75" r="10" stroke="#06B6D4" stroke-width="2.5" fill="#0D1424"/>
          <circle cx="75" cy="75" r="10" stroke="#06B6D4" stroke-width="2.5" fill="#0D1424"/>
          <circle cx="50" cy="50" r="16" fill="#1E293B" stroke="#10B981" stroke-width="2.5"/>
          <circle cx="50" cy="50" r="6" fill="#10B981"/>
        </svg>
      </div>
      <h1 class="splash-title">AEROGUARD</h1>
      <p class="splash-tagline">Drone-Mounted Air Quality Monitor</p>
      
      <div class="splash-loader">
        <div class="splash-loader-bar"></div>
      </div>
      <span style="margin-top: 10px; font-size: 11px; font-family: var(--font-mono); color: var(--primary);">CALIBRATING MQ SENSORS...</span>
    </div>
  `;

  setTimeout(() => {
    switchTab('home');
  }, 2200);
}

// 2. Shell & Tab Navigation Layout
function renderShell() {
  appRoot.innerHTML = `
    <!-- App Header Bar -->
    <header class="app-header">
      <div class="header-title-box">
        <div class="header-logo-icon">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
            <path d="M3 5l4 2M21 5l-4 2M3 19l4-2M21 19l-4-2" stroke="#F97316" stroke-width="2.5" stroke-linecap="round"/>
            <path d="M7 7l10 10M17 7L7 17" stroke="#2563EB" stroke-width="2.5" stroke-linecap="round"/>
            <rect x="9" y="9" width="6" height="6" rx="1.5" fill="#1E3A8A" stroke="#06B6D4" stroke-width="1.5"/>
            <circle cx="12" cy="12" r="1.5" fill="#10B981"/>
          </svg>
        </div>
        <div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <div class="header-title">AeroGuard</div>
            <div id="header-freshness-badge" style="cursor: pointer;"></div>
          </div>
          <div class="header-subtitle" id="header-subtitle-text">${latestData.mode} • ${latestData.deviceId}</div>
        </div>
      </div>
      <div class="header-actions">
        <button id="header-conn-btn" class="icon-btn" title="Device Connection">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M6.5 6.5l11 11L12 23V1l5.5 5.5-11 11"/>
          </svg>
        </button>
      </div>
    </header>

    <!-- Content Viewport -->
    <main id="screen-viewport" class="app-screen-container"></main>

    <!-- Bottom Navigation Bar -->
    <nav class="bottom-nav">
      <button class="nav-tab ${activeTab === 'home' ? 'active' : ''}" data-tab="home">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
        <span>HOME</span>
      </button>

      <button class="nav-tab ${activeTab === 'ops' ? 'active' : ''}" data-tab="ops">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="3"/>
          <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>
        </svg>
        <span>OPS</span>
      </button>

      <button class="nav-tab ${activeTab === 'monitor' ? 'active' : ''}" data-tab="monitor">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <rect x="2" y="3" width="20" height="14" rx="2" ry="2"/>
          <line x1="8" y1="21" x2="16" y2="21"/>
          <line x1="12" y1="17" x2="12" y2="21"/>
        </svg>
        <span>MONITOR</span>
      </button>

      <button class="nav-tab ${activeTab === 'map' ? 'active' : ''}" data-tab="map">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="1 6 1 22 8 18 16 22 23 18 23 2 16 6 8 2 1 6"/>
          <line x1="8" y1="2" x2="8" y2="18"/>
          <line x1="16" y1="6" x2="16" y2="22"/>
        </svg>
        <span>MAP</span>
      </button>

      <button class="nav-tab ${activeTab === 'demo3d' ? 'active' : ''}" data-tab="demo3d">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <polygon points="12 2 2 7 12 12 22 7 12 2"/>
          <polyline points="2 17 12 22 22 17"/>
          <polyline points="2 12 12 17 22 12"/>
        </svg>
        <span>3D DEMO</span>
        <span class="nav-badge-dot"></span>
      </button>

      <button class="nav-tab ${activeTab === 'explore' ? 'active' : ''}" data-tab="explore">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10"/>
          <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"/>
        </svg>
        <span>EXPLORE</span>
      </button>
    </nav>
  `;

  // Bind Bottom Nav Clicks
  appRoot.querySelectorAll('.nav-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      const target = tab.getAttribute('data-tab');
      switchTab(target);
    });
  });

  // Bind Header Bluetooth Button
  const connBtn = appRoot.querySelector('#header-conn-btn');
  if (connBtn) {
    connBtn.addEventListener('click', () => {
      showConnectionModal(esp32Service.isConnected, () => {
        esp32Service.toggleStream();
        updateSimulatorStreamBtn();
      });
    });
  }

  // Bind Header Freshness Pill to switch to OPS tab
  const freshnessBadge = appRoot.querySelector('#header-freshness-badge');
  if (freshnessBadge) {
    freshnessBadge.addEventListener('click', () => {
      switchTab('ops');
    });
  }

  updateHeaderFreshness(telemetryReliabilityService.getFreshnessState());
}

// 3. Switch Tab
function switchTab(tabName) {
  if (activeTab === 'demo3d' && threeDemoInstance) {
    threeDemoInstance.destroy();
    threeDemoInstance = null;
  }

  activeTab = tabName;
  renderShell();

  const viewport = document.getElementById('screen-viewport');
  if (!viewport) return;

  switch (tabName) {
    case 'home':
      renderHomeScreen(viewport, latestData, (navTab) => switchTab(navTab), (mode) => {
        esp32Service.setMode(mode);
        renderHomeScreen(viewport, latestData, (t) => switchTab(t), (m) => esp32Service.setMode(m));
      });
      break;

    case 'ops':
      renderLiveOpsDashboard(viewport);
      break;

    case 'monitor':
      renderMonitorScreen(viewport, latestData, esp32Service.history, (metricKey) => {
        updateChart(esp32Service.history, metricKey);
      });
      break;

    case 'map':
      renderMapScreen(viewport, latestData, esp32Service.history);
      break;

    case 'demo3d':
      render3DDemoScreen(viewport);
      break;

    case 'explore':
      renderExploreScreen(
        viewport,
        latestData,
        esp32Service.history,
        (mode) => {
          esp32Service.setMode(mode);
          switchTab('explore');
        },
        () => showConnectionModal(esp32Service.isConnected, () => {
          esp32Service.toggleStream();
          updateSimulatorStreamBtn();
        }),
        () => showDiagnosticsModal(latestData),
        () => launchIntroTour(),
        () => switchTab('ops'),
        () => showTestRunnerModal()
      );
      break;
  }
}

function updateHeaderFreshness(freshness) {
  const badgeEl = document.getElementById('header-freshness-badge');
  if (!badgeEl) return;
  let bg = 'rgba(148, 163, 184, 0.2)';
  let color = '#94A3B8';
  let border = '1px solid rgba(148, 163, 184, 0.3)';

  if (freshness.isLive) {
    bg = 'rgba(16, 185, 129, 0.2)';
    color = '#10B981';
    border = '1px solid #10B981';
  } else if (freshness.isSimulation && freshness.isFresh) {
    bg = 'rgba(139, 92, 246, 0.2)';
    color = '#C084FC';
    border = '1px solid rgba(139, 92, 246, 0.4)';
  } else if (freshness.isStale) {
    bg = 'rgba(245, 158, 11, 0.2)';
    color = '#F59E0B';
    border = '1px solid #F59E0B';
  } else if (freshness.isOffline) {
    bg = 'rgba(239, 68, 68, 0.2)';
    color = '#EF4444';
    border = '1px solid #EF4444';
  }

  badgeEl.innerHTML = `
    <span style="font-size: 10px; font-weight: 800; font-family: var(--font-mono); padding: 2px 7px; border-radius: 12px; background: ${bg}; color: ${color}; border: ${border};">
      ${freshness.label}
    </span>
  `;
}

// 4. Render 3D Demo Screen
function render3DDemoScreen(container) {
  container.innerHTML = `
    <div class="drone-3d-wrapper" style="display: flex; flex-direction: column; width: 100%; height: 100%; position: relative;">
      <!-- 3D HUD Overlay -->
      <div class="drone-hud-overlay">
        <div class="drone-hud-card">
          <div style="color: var(--text-muted); font-size: 9px;">DRONE TELEMETRY</div>
          <div style="font-weight: 700; color: #38BDF8;">QUAD-X CARBON</div>
          <div style="margin-top: 4px;">MOTOR: <strong id="hud-rpm">18,500 RPM</strong></div>
          <div>HOVER: <strong style="color: #10B981;">STABLE</strong></div>
        </div>

        <div class="drone-hud-card">
          <div style="color: var(--text-muted); font-size: 9px;">SENSOR POD</div>
          <div style="color: #F59E0B; font-weight: 700;">MQ-ARRAY 7X ACTIVE</div>
          <div style="margin-top: 4px;">AIRFLOW: <strong style="color: #38BDF8;">LAMINAR</strong></div>
          <div>AQI: <strong id="hud-3d-aqi" style="color: ${latestData.aqiColor};">${latestData.aqi}</strong></div>
        </div>
      </div>

      <!-- Canvas for Three.js -->
      <div id="drone-canvas-mount" style="flex: 1; width: 100%; height: 100%; cursor: grab;"></div>

      <!-- Controls Overlay -->
      <div class="drone-controls-overlay" style="display: flex; flex-direction: column; gap: 8px; padding: 12px; background: rgba(13,20,36,0.92); border-top: 1px solid var(--border-subtle); z-index: 10;">
        <div style="display: flex; gap: 8px; justify-content: space-between; align-items: center;">
          <div class="drone-rotor-slider" style="flex: 1;">
            <span>THROTTLE:</span>
            <input type="range" id="rotor-speed-slider" min="0" max="0.8" step="0.05" value="0.35" />
          </div>
          <button id="btn-wireframe-toggle" class="sim-btn" style="padding: 6px 10px; font-size: 11px;">
            WIREFRAME
          </button>
        </div>

        <!-- Gas Collection & Release Controls -->
        <div style="display: flex; gap: 8px; justify-content: center;">
          <button id="btn-collect-gas" class="sim-btn" style="background: rgba(16,185,129,0.2); color: #10B981; border: 1px solid #10B981; flex: 1; font-weight: 700; justify-content: center;">🟢 COLLECT GAS</button>
          <button id="btn-release-gas" class="sim-btn" style="background: rgba(239,68,68,0.2); color: #EF4444; border: 1px solid #EF4444; flex: 1; font-weight: 700; justify-content: center;">🔴 RELEASE GAS</button>
        </div>

        <!-- Directional Flight Controls (Bottom, Upper, Left, Right, Forward, Backward) -->
        <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; text-align: center;">
          <button id="btn-move-fwd" class="sim-btn" style="justify-content: center; font-size: 11px;">▲ FWD</button>
          <button id="btn-move-up" class="sim-btn" style="justify-content: center; font-size: 11px; color: #38BDF8;">⬆ UP</button>
          <button id="btn-move-back" class="sim-btn" style="justify-content: center; font-size: 11px;">▼ BACK</button>
          <button id="btn-move-left" class="sim-btn" style="justify-content: center; font-size: 11px;">◀ LEFT</button>
          <button id="btn-move-down" class="sim-btn" style="justify-content: center; font-size: 11px; color: #F59E0B;">⬇ DOWN</button>
          <button id="btn-move-right" class="sim-btn" style="justify-content: center; font-size: 11px;">▶ RIGHT</button>
        </div>
      </div>
    </div>
  `;

  const mount = container.querySelector('#drone-canvas-mount');
  threeDemoInstance = new ThreeDroneDemo(mount, (newMode) => {
    esp32Service.setMode(newMode);
  });
  threeDemoInstance.updateTelemetry(latestData);

  // Wireframe toggle button
  const wireframeBtn = container.querySelector('#btn-wireframe-toggle');
  if (wireframeBtn) {
    wireframeBtn.addEventListener('click', () => {
      const isWire = threeDemoInstance.toggleWireframe();
      wireframeBtn.classList.toggle('active', isWire);
    });
  }

  // Throttle slider
  const slider = container.querySelector('#rotor-speed-slider');
  if (slider) {
    slider.addEventListener('input', (e) => {
      threeDemoInstance.setRotorSpeed(e.target.value);
      const rpmEl = container.querySelector('#hud-rpm');
      if (rpmEl) {
        const rpm = Math.round(parseFloat(e.target.value) * 45000);
        rpmEl.textContent = `${rpm.toLocaleString()} RPM`;
      }
    });
  }

  // Gas collection / release buttons
  const collectBtn = container.querySelector('#btn-collect-gas');
  const releaseBtn = container.querySelector('#btn-release-gas');
  if (collectBtn && releaseBtn) {
    collectBtn.addEventListener('click', () => {
      const isCol = !collectBtn.classList.contains('active');
      collectBtn.classList.toggle('active', isCol);
      releaseBtn.classList.remove('active');
      threeDemoInstance.toggleCollectGas(isCol);
      threeDemoInstance.toggleReleaseGas(false);
      collectBtn.style.background = isCol ? '#10B981' : 'rgba(16,185,129,0.2)';
      collectBtn.style.color = isCol ? '#03131C' : '#10B981';
      releaseBtn.style.background = 'rgba(239,68,68,0.2)';
      releaseBtn.style.color = '#EF4444';
    });
    releaseBtn.addEventListener('click', () => {
      const isRel = !releaseBtn.classList.contains('active');
      releaseBtn.classList.toggle('active', isRel);
      collectBtn.classList.remove('active');
      threeDemoInstance.toggleReleaseGas(isRel);
      threeDemoInstance.toggleCollectGas(false);
      releaseBtn.style.background = isRel ? '#EF4444' : 'rgba(239,68,68,0.2)';
      releaseBtn.style.color = isRel ? '#FFFFFF' : '#EF4444';
      collectBtn.style.background = 'rgba(16,185,129,0.2)';
      collectBtn.style.color = '#10B981';
    });
  }

  // Directional buttons
  container.querySelector('#btn-move-up')?.addEventListener('click', () => threeDemoInstance.move('up'));
  container.querySelector('#btn-move-down')?.addEventListener('click', () => threeDemoInstance.move('down'));
  container.querySelector('#btn-move-fwd')?.addEventListener('click', () => threeDemoInstance.move('forward'));
  container.querySelector('#btn-move-back')?.addEventListener('click', () => threeDemoInstance.move('backward'));
  container.querySelector('#btn-move-left')?.addEventListener('click', () => threeDemoInstance.move('left'));
  container.querySelector('#btn-move-right')?.addEventListener('click', () => threeDemoInstance.move('right'));
}

// 5. Handle Live Telemetry Updates
function handleTelemetryUpdate(data) {
  // Update header subtitle
  const headerSubtitle = document.getElementById('header-subtitle-text');
  if (headerSubtitle) {
    headerSubtitle.textContent = `${data.mode} • ${data.deviceId}`;
  }

  // Dynamic Island BLE indicator
  const islandBle = document.getElementById('island-ble-indicator');
  if (islandBle) {
    islandBle.style.background = data.isConnected ? '#10B981' : '#EF4444';
  }

  // Screen specific updates
  if (activeTab === 'home') {
    const viewport = document.getElementById('screen-viewport');
    if (viewport) {
      renderHomeScreen(viewport, data, (tab) => switchTab(tab), (mode) => esp32Service.setMode(mode));
    }
  } else if (activeTab === 'monitor') {
    updateChart(esp32Service.history);
  } else if (activeTab === 'map') {
    updateMapTelemetry(data, esp32Service.history);
  } else if (activeTab === 'demo3d' && threeDemoInstance) {
    threeDemoInstance.updateTelemetry(data);
    const hudAqi = document.getElementById('hud-3d-aqi');
    if (hudAqi) {
      hudAqi.textContent = data.aqi;
      hudAqi.style.color = data.aqiColor;
    }
  }
}

// 6. Simulator Controls Bar Handlers
function initSimulatorControls() {
  const phoneBtn = document.getElementById('view-mode-phone');
  const fullBtn = document.getElementById('view-mode-full');
  const workspace = document.getElementById('viewport-workspace');
  const deviceSelector = document.getElementById('device-selector');
  const shell = document.getElementById('device-shell');
  const rotateBtn = document.getElementById('btn-rotate');
  const streamToggle = document.getElementById('sim-telemetry-toggle');
  const spikeTrigger = document.getElementById('sim-spike-trigger');

  // Phone View Mode
  if (phoneBtn && fullBtn && workspace) {
    phoneBtn.addEventListener('click', () => {
      phoneBtn.classList.add('active');
      fullBtn.classList.remove('active');
      workspace.classList.remove('fullscreen-mode');
      workspace.classList.add('phone-mode');
      if (threeDemoInstance) setTimeout(() => threeDemoInstance.resize(), 300);
    });

    fullBtn.addEventListener('click', () => {
      fullBtn.classList.add('active');
      phoneBtn.classList.remove('active');
      workspace.classList.remove('phone-mode');
      workspace.classList.add('fullscreen-mode');
      if (threeDemoInstance) setTimeout(() => threeDemoInstance.resize(), 300);
    });
  }

  // Device Model Switcher
  if (deviceSelector && shell) {
    deviceSelector.addEventListener('change', (e) => {
      shell.classList.remove('iphone16', 'pixel9', 'minimal');
      shell.classList.add(e.target.value);
    });
  }

  // Device Rotation
  if (rotateBtn && shell) {
    rotateBtn.addEventListener('click', () => {
      shell.classList.toggle('landscape');
      if (threeDemoInstance) setTimeout(() => threeDemoInstance.resize(), 400);
    });
  }

  // Replay Intro Tour Button
  const introBtn = document.getElementById('btn-show-intro');
  if (introBtn) {
    introBtn.addEventListener('click', () => {
      launchIntroTour();
    });
  }

  // Stream Toggle
  if (streamToggle) {
    streamToggle.addEventListener('click', () => {
      esp32Service.toggleStream();
      updateSimulatorStreamBtn();
    });
  }

  // Emergency Gas Alert Trigger
  if (spikeTrigger) {
    spikeTrigger.addEventListener('click', () => {
      esp32Service.triggerSpike();
      spikeTrigger.style.background = '#EF4444';
      spikeTrigger.style.color = '#FFFFFF';
      spikeTrigger.textContent = '🚨 GAS SPIKE ACTIVE!';
      setTimeout(() => {
        spikeTrigger.style.background = '';
        spikeTrigger.style.color = '';
        spikeTrigger.textContent = '⚠️ Trigger Gas Alert';
      }, 10000);
    });
  }
}

function updateSimulatorStreamBtn() {
  const btn = document.getElementById('sim-telemetry-toggle');
  if (!btn) return;
  if (esp32Service.isConnected) {
    btn.innerHTML = `<span class="status-indicator live"></span> ESP32 Stream: RUNNING`;
    btn.classList.add('active-state');
  } else {
    btn.innerHTML = `<span class="status-indicator" style="background: #EF4444;"></span> ESP32 Stream: PAUSED`;
    btn.classList.remove('active-state');
  }
}

function initStatusClock() {
  const clockEl = document.getElementById('status-clock');
  const update = () => {
    if (!clockEl) return;
    const now = new Date();
    const hours = now.getHours().toString().padStart(2, '0');
    const mins = now.getMinutes().toString().padStart(2, '0');
    clockEl.textContent = `${hours}:${mins}`;
  };
  update();
  setInterval(update, 30000);
}

// Start Application
document.addEventListener('DOMContentLoaded', initApp);
