// Advanced Animated Intro & Onboarding Experience
export class IntroPage {
  constructor(container, onComplete) {
    this.container = container;
    this.onComplete = onComplete;
    this.currentStep = 0;
    this.canvas = null;
    this.ctx = null;
    this.animationId = null;
    this.particles = [];
    this.radarAngle = 0;
    this.audioCtx = null;
    this.soundEnabled = true;

    this.steps = [
      {
        badge: 'MISSION RECON v2.4',
        title: 'TACTICAL AIRBORNE MONITORING',
        subtitle: 'Real-time multi-gas detection via autonomous drone platform.',
        graphicType: 'drone',
        chips: ['4S LiPo Power', '2.4GHz BLE 5.0', 'GPS 3D Lock', 'Alt Hold: 120m'],
        metrics: [
          { label: 'Air Speed', value: '18.5 km/h' },
          { label: 'Sampling Rate', value: '0.5 Hz' },
          { label: 'Payload', value: '380g' }
        ]
      },
      {
        badge: 'MQ-ARRAY TECHNOLOGY',
        title: '7-SENSOR GAS SPECTRUM',
        subtitle: 'Comprehensive atmospheric sniffing from Smoke to Ozone & Ammonia.',
        graphicType: 'sensors',
        chips: ['MQ-2 Smoke/LPG', 'MQ-7 Carbon Monoxide', 'MQ-135 VOCs', 'MQ-4 Methane', 'MQ-8 H2', 'MQ-131 O3', 'MQ-137 NH3'],
        metrics: [
          { label: 'Range', value: '0-2000 ppm' },
          { label: 'Precision', value: '±2.5%' },
          { label: 'Response', value: '< 1.2s' }
        ]
      },
      {
        badge: 'LIVE GEO-INTELLIGENCE',
        title: 'HEAT MAPS & SPIKE ALERTS',
        subtitle: 'Live corridor path tracking with instant hazardous pollution alarms.',
        graphicType: 'radar',
        chips: ['Corridor Mapping', 'Live Waypoints', 'CSV Telemetry Export', 'EPA AQI Index'],
        metrics: [
          { label: 'GPS Precision', value: '2.5m' },
          { label: 'Latency', value: '< 18ms' },
          { label: 'Storage', value: '100% Local' }
        ]
      },
      {
        badge: 'READY FOR LAUNCH',
        title: 'ALL SYSTEMS OPERATIONAL',
        subtitle: 'Microcontroller online. Sensor pod warmed up and calibrated.',
        graphicType: 'ready',
        chips: ['ESP32 Linked', 'Sensors PASS', 'LiPo 94%', 'Flight Ready'],
        metrics: [
          { label: 'Sensors', value: '7 / 7 OK' },
          { label: 'Battery', value: '15.2V 4S' },
          { label: 'Link', value: 'EXCELLENT' }
        ]
      }
    ];

    this.render();
  }

  // Futuristic Web Audio Synthesizer Beep
  playBeep(freq = 660, duration = 0.08, type = 'sine') {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, this.audioCtx.currentTime);
      gain.gain.setValueAtTime(0.08, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + duration);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + duration);
    } catch (e) {
      // Audio context may require user gesture on some browsers
    }
  }

  playLaunchSound() {
    this.playBeep(440, 0.1, 'triangle');
    setTimeout(() => this.playBeep(880, 0.12, 'sine'), 100);
    setTimeout(() => this.playBeep(1320, 0.25, 'sine'), 220);
  }

  render() {
    const step = this.steps[this.currentStep];
    const isLast = this.currentStep === this.steps.length - 1;

    this.container.innerHTML = `
      <div class="intro-viewport">
        <!-- Interactive Animated Canvas Background -->
        <canvas id="intro-canvas" class="intro-canvas"></canvas>

        <!-- Top Intro Navigation Bar -->
        <div class="intro-top-bar">
          <div class="intro-brand">
            <span class="intro-pulse"></span>
            <strong>AEROSENSE</strong>
            <span class="intro-ver">SYS 2.4</span>
          </div>

          <div style="display: flex; align-items: center; gap: 8px;">
            <button id="btn-intro-sound" class="intro-icon-btn" title="Toggle Audio FX">
              ${this.soundEnabled ? '🔊' : '🔇'}
            </button>
            <button id="btn-intro-skip" class="intro-skip-btn">
              SKIP INTRO →
            </button>
          </div>
        </div>

        <!-- Center Content Card -->
        <div class="intro-content-wrapper">
          <!-- Animated Graphic Hologram Area -->
          <div class="intro-graphic-container">
            ${this._renderGraphicHTML(step.graphicType)}
          </div>

          <!-- Slide Text Content -->
          <div class="intro-text-box">
            <div class="intro-step-badge">${step.badge}</div>
            <h1 class="intro-title">${step.title}</h1>
            <p class="intro-desc">${step.subtitle}</p>

            <!-- Feature Chips -->
            <div class="intro-chips-container">
              ${step.chips.map(chip => `
                <span class="intro-chip">
                  <span class="chip-dot"></span>
                  ${chip}
                </span>
              `).join('')}
            </div>

            <!-- Telemetry Spec Metrics Bar -->
            <div class="intro-metrics-row">
              ${step.metrics.map(m => `
                <div class="intro-metric-item">
                  <span class="metric-val">${m.value}</span>
                  <span class="metric-lbl">${m.label}</span>
                </div>
              `).join('')}
            </div>
          </div>
        </div>

        <!-- Bottom Controls & Step Indicator Bar -->
        <div class="intro-bottom-bar">
          <!-- Step Indicator Dots -->
          <div class="intro-step-indicators">
            ${this.steps.map((_, idx) => `
              <div class="step-indicator-pill ${idx === this.currentStep ? 'active' : (idx < this.currentStep ? 'completed' : '')}">
                <div class="pill-fill"></div>
              </div>
            `).join('')}
          </div>

          <!-- Action Buttons -->
          <div class="intro-btn-group">
            ${this.currentStep > 0 ? `
              <button id="btn-intro-prev" class="intro-nav-btn secondary">
                ‹ PREV
              </button>
            ` : ''}

            <button id="btn-intro-next" class="intro-nav-btn primary">
              ${isLast ? '🚀 LAUNCH AEROSENSE' : 'NEXT PHASE ›'}
            </button>
          </div>
        </div>
      </div>
    `;

    this._setupCanvas();
    this._bindEvents();
  }

  _renderGraphicHTML(type) {
    if (type === 'drone') {
      return `
        <div class="holo-drone-scene">
          <div class="drone-radar-rings">
            <div class="ring ring-1"></div>
            <div class="ring ring-2"></div>
            <div class="ring ring-3"></div>
          </div>
          <div class="holo-drone-model">
            <!-- Drone SVG Animated Wireframe -->
            <svg class="holo-drone-svg" viewBox="0 0 160 160" fill="none">
              <!-- Propeller Spinners -->
              <circle cx="35" cy="35" r="22" stroke="#38BDF8" stroke-width="2" class="prop-rotor spin-cw" stroke-dasharray="8 6"/>
              <circle cx="125" cy="35" r="22" stroke="#38BDF8" stroke-width="2" class="prop-rotor spin-ccw" stroke-dasharray="8 6"/>
              <circle cx="35" cy="125" r="22" stroke="#38BDF8" stroke-width="2" class="prop-rotor spin-ccw" stroke-dasharray="8 6"/>
              <circle cx="125" cy="125" r="22" stroke="#38BDF8" stroke-width="2" class="prop-rotor spin-cw" stroke-dasharray="8 6"/>

              <!-- Carbon Arms -->
              <line x1="35" y1="35" x2="125" y2="125" stroke="#06B6D4" stroke-width="4.5" stroke-linecap="round"/>
              <line x1="125" y1="35" x2="35" y2="125" stroke="#06B6D4" stroke-width="4.5" stroke-linecap="round"/>

              <!-- Center Fuselage Core -->
              <rect x="58" y="58" width="44" height="44" rx="10" fill="#0D1424" stroke="#06B6D4" stroke-width="3"/>
              <circle cx="80" cy="80" r="12" fill="#10B981" class="pulse-core"/>
              <circle cx="80" cy="80" r="4" fill="#FFFFFF"/>

              <!-- Direction Arrow -->
              <polygon points="80,50 74,62 86,62" fill="#38BDF8"/>
            </svg>
          </div>
          <div class="altitude-hud-marker">
            <span class="hud-tag">AIRBORNE LOCK</span>
            <span class="hud-num">120.5m ALT</span>
          </div>
        </div>
      `;
    }

    if (type === 'sensors') {
      return `
        <div class="holo-sensor-scene">
          <div class="sensor-orbit-container">
            <div class="sensor-center-core">
              <span style="font-size: 24px;">🔬</span>
              <span style="font-size: 10px; font-weight: 800; color: #10B981; font-family: var(--font-mono);">MQ-POD</span>
            </div>
            <!-- Orbiting Gas Nodes -->
            <div class="gas-orbit-node node-1">MQ-2<br/><small>SMOKE</small></div>
            <div class="gas-orbit-node node-2">MQ-7<br/><small>CO</small></div>
            <div class="gas-orbit-node node-3">MQ-135<br/><small>VOC</small></div>
            <div class="gas-orbit-node node-4">MQ-4<br/><small>CH4</small></div>
            <div class="gas-orbit-node node-5">MQ-131<br/><small>OZONE</small></div>
            <div class="gas-orbit-node node-6">MQ-137<br/><small>NH3</small></div>
          </div>
        </div>
      `;
    }

    if (type === 'radar') {
      return `
        <div class="holo-radar-scene">
          <div class="radar-scope">
            <div class="radar-sweep"></div>
            <div class="radar-target target-1" style="top: 25%; left: 60%;">
              <span class="target-ping"></span>
              <span class="target-label">AQI 42 (GOOD)</span>
            </div>
            <div class="radar-target target-2" style="top: 65%; left: 35%;">
              <span class="target-ping red"></span>
              <span class="target-label red">SPIKE DETECTED</span>
            </div>
            <div class="radar-crosshair-h"></div>
            <div class="radar-crosshair-v"></div>
          </div>
        </div>
      `;
    }

    // Ready / Launch Screen
    return `
      <div class="holo-ready-scene">
        <div class="ready-shield-ring">
          <div class="shield-pulse"></div>
          <div class="ready-check-icon">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#10B981" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
              <polyline points="22 4 12 14.01 9 11.01"/>
            </svg>
          </div>
        </div>
        <div class="ready-status-text">
          <span class="status-online-dot"></span>
          <span>AERO-SYSTEM ONLINE</span>
        </div>
      </div>
    `;
  }

  _setupCanvas() {
    this.canvas = document.getElementById('intro-canvas');
    if (!this.canvas) return;
    this.ctx = this.canvas.getContext('2d');

    const resize = () => {
      this.canvas.width = this.canvas.clientWidth || 380;
      this.canvas.height = this.canvas.clientHeight || 780;
    };
    resize();

    // Generate Background Particle Field
    this.particles = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.canvas.width,
        y: Math.random() * this.canvas.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.3 - Math.random() * 0.5,
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.5 + 0.2
      });
    }

    this._startCanvasAnimation();
  }

  _startCanvasAnimation() {
    if (this.animationId) cancelAnimationFrame(this.animationId);

    const animate = () => {
      this.animationId = requestAnimationFrame(animate);
      if (!this.ctx || !this.canvas) return;

      const w = this.canvas.width;
      const h = this.canvas.height;
      this.ctx.clearRect(0, 0, w, h);

      // 1. Draw subtle coordinate grid lines
      this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.04)';
      this.ctx.lineWidth = 1;
      const gridSize = 40;
      for (let x = 0; x < w; x += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(x, 0);
        this.ctx.lineTo(x, h);
        this.ctx.stroke();
      }
      for (let y = 0; y < h; y += gridSize) {
        this.ctx.beginPath();
        this.ctx.moveTo(0, y);
        this.ctx.lineTo(w, y);
        this.ctx.stroke();
      }

      // 2. Draw animated particles
      this.particles.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.y < 0) {
          p.y = h;
          p.x = Math.random() * w;
        }

        this.ctx.fillStyle = `rgba(56, 189, 248, ${p.alpha})`;
        this.ctx.beginPath();
        this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        this.ctx.fill();
      });

      // 3. Connect nearby particles with subtle faint laser lines
      this.ctx.strokeStyle = 'rgba(6, 182, 212, 0.05)';
      for (let i = 0; i < this.particles.length; i++) {
        for (let j = i + 1; j < this.particles.length; j++) {
          const dx = this.particles[i].x - this.particles[j].x;
          const dy = this.particles[i].y - this.particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < 80) {
            this.ctx.beginPath();
            this.ctx.moveTo(this.particles[i].x, this.particles[i].y);
            this.ctx.lineTo(this.particles[j].x, this.particles[j].y);
            this.ctx.stroke();
          }
        }
      }
    };

    animate();
  }

  _bindEvents() {
    const nextBtn = document.getElementById('btn-intro-next');
    if (nextBtn) {
      nextBtn.addEventListener('click', () => {
        if (this.currentStep < this.steps.length - 1) {
          this.playBeep(750, 0.08);
          this.currentStep++;
          this.render();
        } else {
          this.playLaunchSound();
          this.destroy();
          this.onComplete();
        }
      });
    }

    const prevBtn = document.getElementById('btn-intro-prev');
    if (prevBtn) {
      prevBtn.addEventListener('click', () => {
        if (this.currentStep > 0) {
          this.playBeep(520, 0.08);
          this.currentStep--;
          this.render();
        }
      });
    }

    const skipBtn = document.getElementById('btn-intro-skip');
    if (skipBtn) {
      skipBtn.addEventListener('click', () => {
        this.playBeep(600, 0.06);
        this.destroy();
        this.onComplete();
      });
    }

    const soundBtn = document.getElementById('btn-intro-sound');
    if (soundBtn) {
      soundBtn.addEventListener('click', () => {
        this.soundEnabled = !this.soundEnabled;
        soundBtn.textContent = this.soundEnabled ? '🔊' : '🔇';
        if (this.soundEnabled) this.playBeep(800, 0.05);
      });
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
  }
}
