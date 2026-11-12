import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

export class ThreeDroneDemo {
  constructor(containerElement, onModeChange) {
    this.container = containerElement;
    this.onModeChange = onModeChange;
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    this.controls = null;
    this.animationId = null;
    this.drone = null;
    this.tank = null;
    this.rotors = [];
    this.cloud = null;
    this.innerPts = null;
    this.coreMat = null;
    this.innerGeo = null;
    this.coneMat = null;
    this.intakeMat = null;
    this.wheel = null;
    this.needle = null;

    // Simulation state (100% complete gas collection into bottle container)
    this.mode = 'idle'; // 'idle', 'collecting', 'full', 'venting'
    this.N = 420;
    this.INNER = 360;
    this.absorbed = [];
    this.cloudList = [];
    this.spawnAcc = 0;
    this.fillShown = 0;
    this.t = 0;
    this.RATE = 500; // Ultra-fast 100% collection rate
    this.VENT_RATE = 500; // Ultra-fast release rate
    this.nozzle = new THREE.Vector3();
    this.tmp = new THREE.Vector3();
    this.tmp2 = new THREE.Vector3();

    this.state = new Uint8Array(this.N);
    this.dir = new Uint8Array(this.N);
    this.uProg = new Float32Array(this.N);
    this.dur = new Float32Array(this.N);
    this.Ax = new Float32Array(this.N * 3);
    this.Cx = new Float32Array(this.N * 3);
    this.home = new Float32Array(this.N * 3);
    this.phase = new Float32Array(this.N * 3);
    this.cPos = new Float32Array(this.N * 3);
    this.cSize = new Float32Array(this.N);
    this.baseA = new Float32Array(this.N);
    this.cAlpha = new Float32Array(this.N);

    this.cloudCenter = new THREE.Vector3(-4.5, 1.2, 3.5);
    this.R = 0.38;
    this.LC = 1.5;

    // Flight target positions for D-pad controls
    this.targetPosX = 0;
    this.targetPosY = 1.5;
    this.targetPosZ = 0;

    this.init();
  }

  init() {
    const width = this.container.clientWidth || window.innerWidth || 400;
    const height = this.container.clientHeight || window.innerHeight || 600;

    // 1. Scene
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(0x070d18, 0.026);

    // 2. Camera
    this.camera = new THREE.PerspectiveCamera(42, width / height, 0.1, 200);
    this.camera.position.set(8.2, 4.6, 9.4);

    // 3. Renderer
    this.renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    this.renderer.setClearColor(0x070d18);
    this.renderer.setSize(width, height);
    this.container.appendChild(this.renderer.domElement);

    // 4. OrbitControls
    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.target.set(0, 1.3, 2.4);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.06;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 28;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.update();

    // 5. Lights
    this.scene.add(new THREE.HemisphereLight(0x5aa8ff, 0x050a14, 0.95));
    const key = new THREE.DirectionalLight(0xbfe6ff, 0.9);
    key.position.set(5, 9, 6);
    this.scene.add(key);

    const rim = new THREE.DirectionalLight(0x1fb8d8, 0.85);
    rim.position.set(-6, 3, -6);
    this.scene.add(rim);

    const under = new THREE.PointLight(0x22d3ee, 1.2, 9);
    under.position.set(0, 0.5, 0.6);
    this.scene.add(under);
    this.under = under;

    // 6. Grid & Landing Pad
    const grid = new THREE.GridHelper(80, 80, 0x12718a, 0x0f2a45);
    grid.material.transparent = true;
    grid.material.opacity = 0.55;
    this.scene.add(grid);

    const spriteTex = this._createSpriteTexture();
    const pad = new THREE.Mesh(
      new THREE.CircleGeometry(3.4, 48),
      new THREE.MeshBasicMaterial({ map: spriteTex, color: 0x22d3ee, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false })
    );
    pad.position.set(0, 0.01, 0.4);
    pad.rotation.x = -Math.PI / 2;
    this.scene.add(pad);

    // 7. Ambient background particles
    const DOTS = 190, dp = new Float32Array(DOTS * 3);
    for (let d = 0; d < DOTS; d++) {
      dp[d * 3] = (Math.random() - 0.5) * 30;
      dp[d * 3 + 1] = 0.3 + Math.random() * 8;
      dp[d * 3 + 2] = (Math.random() - 0.5) * 30;
    }
    const dg = new THREE.BufferGeometry();
    dg.setAttribute('position', new THREE.BufferAttribute(dp, 3));
    const dots = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0x2bb6e6, size: 3, sizeAttenuation: false, transparent: true, opacity: 0.75, fog: false }));
    this.scene.add(dots);

    // 8. Build Gas Collector Drone & Tank
    this._buildGasCollectorDrone();

    // 9. Build Gas Plume Cloud Particles
    this._buildGasParticles(spriteTex);

    // 10. Start Animation Loop
    this.animate();
  }

  _createSpriteTexture() {
    const c = document.createElement('canvas'); c.width = c.height = 64;
    const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    gr.addColorStop(0, 'rgba(255,255,255,1)');
    gr.addColorStop(0.4, 'rgba(255,255,255,0.45)');
    gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64);
    return new THREE.CanvasTexture(c);
  }

  _buildGasCollectorDrone() {
    const steel = new THREE.MeshStandardMaterial({ color: 0x1d3250, roughness: 0.4, metalness: 0.75, wireframe: this.isWireframe });
    const steelDark = new THREE.MeshStandardMaterial({ color: 0x0f1c30, roughness: 0.5, metalness: 0.7, wireframe: this.isWireframe });
    const glowCyan = new THREE.MeshStandardMaterial({ color: 0x0a3a4a, emissive: 0x22d3ee, emissiveIntensity: 1 });
    const glowBlue = new THREE.MeshStandardMaterial({ color: 0x0a1e4a, emissive: 0x3b82f6, emissiveIntensity: 1.2 });
    const orangeBlade = new THREE.MeshStandardMaterial({ color: 0xF97316, roughness: 0.3, metalness: 0.5, wireframe: this.isWireframe });

    this.drone = new THREE.Group();
    this.scene.add(this.drone);

    const m = (geo, mat, parent, x, y, z, rx = 0, ry = 0, rz = 0) => {
      const mesh = new THREE.Mesh(geo, mat);
      mesh.position.set(x || 0, y || 0, z || 0);
      mesh.rotation.set(rx, ry, rz);
      (parent || this.drone).add(mesh);
      return mesh;
    };

    m(new THREE.BoxGeometry(2.6, 0.9, 1.9), steel, this.drone, 0, 0, 0);
    m(new THREE.BoxGeometry(1.9, 0.3, 1.4), steelDark, this.drone, 0, 0.55, 0);
    m(new THREE.BoxGeometry(1.6, 0.55, 0.5), steelDark, this.drone, 0, -0.05, 1.1);
    m(new THREE.SphereGeometry(0.24, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2), glowCyan, this.drone, 0, 0.7, 0.35);
    m(new THREE.BoxGeometry(1.1, 0.06, 0.03), glowCyan, this.drone, 0, 0.12, 1.36);
    m(new THREE.BoxGeometry(0.03, 0.05, 1.0), glowBlue, this.drone, 1.31, 0.1, 0);
    m(new THREE.BoxGeometry(0.03, 0.05, 1.0), glowBlue, this.drone, -1.31, 0.1, 0);

    // 4 Rotors with Orange Propellers
    [[1, 1], [-1, 1], [1, -1], [-1, -1]].forEach((s, i) => {
      const [sx, sz] = s;
      const x0 = sx * 1.0, z0 = sz * 0.7, rx = sx * 2.75, rz = sz * 2.0;
      const dx = rx - x0, dz = rz - z0, L = Math.sqrt(dx * dx + dz * dz);

      const arm = m(new THREE.BoxGeometry(0.17, 0.13, L), steelDark, this.drone, (x0 + rx) / 2, 0.15, (z0 + rz) / 2);
      arm.rotation.y = Math.atan2(dx, dz);

      const g = new THREE.Group(); g.position.set(rx, 0.15, rz); this.drone.add(g);
      const hm = steelDark.clone(); hm.side = THREE.DoubleSide;
      m(new THREE.CylinderGeometry(0.56, 0.5, 0.5, 36, 1, true), hm, g);
      m(new THREE.TorusGeometry(0.56, 0.05, 12, 48), glowCyan, g, 0, 0.25, 0, Math.PI / 2, 0, 0);
      m(new THREE.CylinderGeometry(0.09, 0.11, 0.18, 16), steel, g, 0, 0.05, 0);

      const blades = new THREE.Group(); blades.position.y = 0.22; g.add(blades);
      m(new THREE.BoxGeometry(1.8, 0.04, 0.18), orangeBlade, blades);
      this.rotors.push({ blades, dir: i % 2 ? 1 : -1 });
    });

    [-1, 1].forEach(sx => {
      m(new THREE.BoxGeometry(0.09, 0.09, 2.9), steelDark, this.drone, sx * 1.0, -1.45, 0.1);
      [-1, 1].forEach(sz => {
        m(new THREE.BoxGeometry(0.08, 1.0, 0.08), steelDark, this.drone, sx * 1.0, -0.95, sz * 0.8);
      });
    });

    // Gas Container Tank Underneath (12L Bottle)
    this.tank = new THREE.Group();
    this.tank.position.set(0, -0.9, 0.1);
    this.drone.add(this.tank);

    const shellMat = new THREE.MeshPhysicalMaterial({ color: 0x8fe9ff, transparent: true, opacity: 0.35, roughness: 0.08, metalness: 0.1, side: THREE.DoubleSide, depthWrite: false });
    m(new THREE.CylinderGeometry(this.R, this.R, this.LC, 40, 1, true), shellMat, this.tank, 0, 0, 0, Math.PI / 2, 0, 0);
    const capGeo = new THREE.SphereGeometry(this.R, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2);
    m(capGeo, shellMat, this.tank, 0, 0, this.LC / 2, Math.PI / 2, 0, 0);
    m(capGeo, shellMat, this.tank, 0, 0, -this.LC / 2, -Math.PI / 2, 0, 0);

    const coreMat = new THREE.MeshBasicMaterial({ color: 0x62ffb5, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    this.coreMat = coreMat;
    const coreCap = new THREE.SphereGeometry(this.R - 0.04, 28, 14, 0, Math.PI * 2, 0, Math.PI / 2);
    m(new THREE.CylinderGeometry(this.R - 0.04, this.R - 0.04, this.LC, 32, 1, true), coreMat, this.tank, 0, 0, 0, Math.PI / 2, 0, 0);
    m(coreCap, coreMat, this.tank, 0, 0, this.LC / 2, Math.PI / 2, 0, 0);
    m(coreCap, coreMat, this.tank, 0, 0, -this.LC / 2, -Math.PI / 2, 0, 0);

    [-1, 1].forEach(s => {
      m(new THREE.TorusGeometry(this.R + 0.01, 0.05, 12, 40), steel, this.tank, 0, 0, s * this.LC / 2);
      m(new THREE.TorusGeometry(this.R + 0.012, 0.022, 10, 40), glowCyan, this.tank, 0, 0, s * (this.LC / 2 - 0.18));
    });

    // Intake Nozzle
    m(new THREE.CylinderGeometry(0.1, 0.1, 0.28, 20), steel, this.tank, 0, 0, this.LC / 2 + this.R + 0.08, Math.PI / 2, 0, 0);
    const flareMat = steelDark.clone(); flareMat.side = THREE.DoubleSide;
    m(new THREE.CylinderGeometry(0.22, 0.1, 0.2, 28, 1, true), flareMat, this.tank, 0, 0, 1.45, Math.PI / 2, 0, 0);
    this.intakeMat = glowCyan.clone();
    m(new THREE.TorusGeometry(0.22, 0.025, 10, 32), this.intakeMat, this.tank, 0, 0, 1.55);

    // Valve wheel & Pressure gauge
    this.wheel = new THREE.Group();
    this.wheel.position.set(0, 0, -(this.LC / 2 + this.R + 0.24));
    this.tank.add(this.wheel);
    m(new THREE.TorusGeometry(0.13, 0.02, 8, 24), glowCyan, this.wheel);

    const gx = this.R + 0.1, gy = 0.05, gz = -0.3;
    m(new THREE.BoxGeometry(0.1, 0.1, 0.1), steelDark, this.tank, gx, gy, gz);
    m(new THREE.CylinderGeometry(0.15, 0.15, 0.04, 32), steel, this.tank, gx, gy, gz, 0, 0, Math.PI / 2);
    this.needle = new THREE.Group(); this.needle.position.set(gx + 0.035, gy, gz); this.tank.add(this.needle);
    m(new THREE.BoxGeometry(0.006, 0.1, 0.012), new THREE.MeshBasicMaterial({ color: 0x62ffb5 }), this.needle, 0, 0.045, 0);
  }

  _buildGasParticles(spriteTex) {
    const gasMaterial = (color) => new THREE.ShaderMaterial({
      uniforms: { uScale: { value: 600 }, uColor: { value: new THREE.Color(color) }, uMap: { value: spriteTex } },
      vertexShader: 'attribute float aSize; attribute float aAlpha; uniform float uScale; varying float vA;' +
        'void main(){ vA = aAlpha; vec4 mv = modelViewMatrix * vec4(position,1.0);' +
        'gl_PointSize = aSize * uScale / max(0.1, -mv.z); gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'uniform vec3 uColor; uniform sampler2D uMap; varying float vA;' +
        'void main(){ float a = texture2D(uMap, gl_PointCoord).a * vA; gl_FragColor = vec4(uColor, a); }',
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
    });

    const cloudMat = gasMaterial(0x62ffb5), innerMat = gasMaterial(0x7dffc4);

    // Plume cloud (N = 420 particles)
    for (let i = 0; i < this.N; i++) {
      const th = Math.random() * Math.PI * 2, ph = Math.acos(2 * Math.random() - 1), rr = Math.cbrt(Math.random());
      this.home[i * 3] = this.cloudCenter.x + Math.sin(ph) * Math.cos(th) * rr * 1.7;
      this.home[i * 3 + 1] = this.cloudCenter.y + Math.cos(ph) * rr * 0.9;
      this.home[i * 3 + 2] = this.cloudCenter.z + Math.sin(ph) * Math.sin(th) * rr * 1.5;
      this.phase[i * 3] = Math.random() * 6.28; this.phase[i * 3 + 1] = Math.random() * 6.28; this.phase[i * 3 + 2] = Math.random() * 6.28;
      this.cSize[i] = 0.35 + Math.random() * 0.55;
      this.baseA[i] = 0.2 + Math.random() * 0.3;
      this.cAlpha[i] = this.baseA[i];
    }
    const cloudGeo = new THREE.BufferGeometry();
    cloudGeo.setAttribute('position', new THREE.BufferAttribute(this.cPos, 3));
    cloudGeo.setAttribute('aSize', new THREE.BufferAttribute(this.cSize, 1));
    cloudGeo.setAttribute('aAlpha', new THREE.BufferAttribute(this.cAlpha, 1));
    this.cloud = new THREE.Points(cloudGeo, cloudMat);
    this.cloud.frustumCulled = false;
    this.scene.add(this.cloud);

    // Inner tank gas particles
    const iPos = new Float32Array(this.INNER * 3), iSize = new Float32Array(this.INNER), iAlpha = new Float32Array(this.INNER);
    for (let j = 0; j < this.INNER; j++) {
      const a = Math.random() * Math.PI * 2, rad = Math.sqrt(Math.random()) * (this.R - 0.07);
      iPos[j * 3] = Math.cos(a) * rad; iPos[j * 3 + 1] = Math.sin(a) * rad; iPos[j * 3 + 2] = (Math.random() - 0.5) * (this.LC + 0.4);
      iSize[j] = 0.1 + Math.random() * 0.1; iAlpha[j] = 0.35 + Math.random() * 0.45;
    }
    this.innerGeo = new THREE.BufferGeometry();
    this.innerGeo.setAttribute('position', new THREE.BufferAttribute(iPos, 3));
    this.innerGeo.setAttribute('aSize', new THREE.BufferAttribute(iSize, 1));
    this.innerGeo.setAttribute('aAlpha', new THREE.BufferAttribute(iAlpha, 1));
    this.innerGeo.setDrawRange(0, 0);
    this.innerPts = new THREE.Points(this.innerGeo, innerMat);
    this.innerPts.frustumCulled = false;
    this.tank.add(this.innerPts);

    // Intake cone
    this.coneMat = new THREE.MeshBasicMaterial({ color: 0x62ffb5, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false, side: THREE.DoubleSide });
    const cone = new THREE.Mesh(new THREE.ConeGeometry(1.4, 3.2, 40, 1, true), this.coneMat);
    cone.position.set(0, 1.25, 3.35);
    cone.rotation.x = -Math.PI / 2;
    this.scene.add(cone);

    for (let q = 0; q < this.N; q++) this.cloudList.push(q);
  }

  toggleCollectGas(collecting) {
    if (collecting) {
      this.mode = 'collecting';
      this.spawnAcc = 0;
    } else {
      this.mode = 'idle';
    }
  }

  toggleReleaseGas(releasing) {
    if (releasing) {
      this.mode = 'venting';
      this.spawnAcc = 0;
    } else {
      this.mode = 'idle';
    }
  }

  move(direction) {
    const step = 0.6;
    if (direction === 'up') this.targetPosY += step;
    if (direction === 'down') this.targetPosY = Math.max(0.2, this.targetPosY - step);
    if (direction === 'forward') this.targetPosZ -= step;
    if (direction === 'backward') this.targetPosZ += step;
    if (direction === 'left') this.targetPosX -= step;
    if (direction === 'right') this.targetPosX += step;
  }

  toggleWireframe() {
    this.isWireframe = !this.isWireframe;
    this.drone.traverse((child) => {
      if (child.isMesh && child.material) child.material.wireframe = this.isWireframe;
    });
    return this.isWireframe;
  }

  setRotorSpeed(speed) {
    this.rotorSpeed = parseFloat(speed) * 60;
  }

  updateTelemetry(data) {}

  resize() {
    if (!this.container || !this.renderer || !this.camera) return;
    const width = this.container.clientWidth || window.innerWidth || 400;
    const height = this.container.clientHeight || window.innerHeight || 600;
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  animate() {
    this.animationId = requestAnimationFrame(() => this.animate());
    const dt = 0.016; this.t += dt;

    // Smooth position interpolation toward D-pad target position
    const currentX = this.drone.position.x;
    const currentY = this.drone.position.y;
    const currentZ = this.drone.position.z;

    this.drone.position.x += (this.targetPosX - currentX) * 0.1;
    this.drone.position.y += ((this.targetPosY + Math.sin(this.t * 1.8) * 0.07) - currentY) * 0.1;
    this.drone.position.z += (this.targetPosZ - currentZ) * 0.1;

    this.drone.rotation.z = Math.sin(this.t * 1.1) * 0.012;
    this.drone.updateMatrixWorld(true);
    this.tank.localToWorld(this.nozzle.set(0, 0, 1.62));

    if (this.mode === 'collecting') {
      this.spawnAcc += this.RATE * dt;
      while (this.spawnAcc >= 1 && this.cloudList.length) {
        const idx = Math.floor(Math.random() * this.cloudList.length);
        const i = this.cloudList[idx];
        this.cloudList[idx] = this.cloudList[this.cloudList.length - 1]; this.cloudList.pop();

        this.state[i] = 1; this.dir[i] = 1; this.uProg[i] = 0; this.dur[i] = 0.6 + Math.random() * 0.3;
        this.tmp.set(this.cPos[i * 3], this.cPos[i * 3 + 1], this.cPos[i * 3 + 2]);

        const i3 = i * 3;
        this.Ax[i3] = this.tmp.x; this.Ax[i3 + 1] = this.tmp.y; this.Ax[i3 + 2] = this.tmp.z;
        this.Cx[i3] = (this.tmp.x + this.nozzle.x) / 2 + (Math.random() - 0.5) * 1.6;
        this.Cx[i3 + 1] = (this.tmp.y + this.nozzle.y) / 2 + 0.2 + Math.random() * 0.9;
        this.Cx[i3 + 2] = (this.tmp.z + this.nozzle.z) / 2 + (Math.random() - 0.5) * 1.2;

        this.spawnAcc -= 1;
      }
      if (!this.cloudList.length) this.mode = 'full';
    } else if (this.mode === 'venting') {
      this.spawnAcc += this.VENT_RATE * dt;
      while (this.spawnAcc >= 1 && this.absorbed.length) {
        const idx = Math.floor(Math.random() * this.absorbed.length);
        const i = this.absorbed[idx];
        this.absorbed[idx] = this.absorbed[this.absorbed.length - 1]; this.absorbed.pop();

        this.state[i] = 1; this.dir[i] = 2; this.uProg[i] = 0; this.dur[i] = 0.6 + Math.random() * 0.3;
        const time = this.t + 1.2;
        this.tmp2.set(
          this.home[i * 3] + Math.sin(time * 0.6 + this.phase[i * 3]) * 0.16,
          this.home[i * 3 + 1] + Math.sin(time * 0.5 + this.phase[i * 3 + 1]) * 0.16 * 0.7,
          this.home[i * 3 + 2] + Math.sin(time * 0.7 + this.phase[i * 3 + 2]) * 0.16
        );

        const i3 = i * 3;
        this.Ax[i3] = this.nozzle.x; this.Ax[i3 + 1] = this.nozzle.y; this.Ax[i3 + 2] = this.nozzle.z;
        this.Cx[i3] = (this.nozzle.x + this.tmp2.x) / 2 + (Math.random() - 0.5) * 1.6;
        this.Cx[i3 + 1] = (this.nozzle.y + this.tmp2.y) / 2 + 0.2 + Math.random() * 0.9;
        this.Cx[i3 + 2] = (this.nozzle.z + this.tmp2.z) / 2 + (Math.random() - 0.5) * 1.2;

        this.spawnAcc -= 1;
      }
      if (!this.absorbed.length) { this.mode = 'idle'; this.spawnAcc = 0; }
    }

    // Update cloud particles
    for (let i = 0; i < this.N; i++) {
      const i3 = i * 3, s = this.state[i];
      if (s === 0) {
        if (this.mode === 'collecting' || this.mode === 'full') {
          this.cAlpha[i] = 0; // 100% collection: no stray dust left outside!
        } else {
          const time = this.t;
          this.cPos[i3] = this.home[i3] + Math.sin(time * 0.6 + this.phase[i3]) * 0.16;
          this.cPos[i3 + 1] = this.home[i3 + 1] + Math.sin(time * 0.5 + this.phase[i3 + 1]) * 0.16 * 0.7;
          this.cPos[i3 + 2] = this.home[i3 + 2] + Math.sin(time * 0.7 + this.phase[i3 + 2]) * 0.16;
          this.cAlpha[i] = this.baseA[i];
        }
      } else if (s === 1) {
        this.uProg[i] += dt / this.dur[i];
        const kk = Math.min(this.uProg[i], 1);
        let bx, by, bz, e;
        if (this.dir[i] === 1) {
          e = Math.pow(kk, 1.7); bx = this.nozzle.x; by = this.nozzle.y; bz = this.nozzle.z;
        } else {
          e = 1 - Math.pow(1 - kk, 2);
          const time = this.t + 1.2;
          bx = this.home[i * 3] + Math.sin(time * 0.6 + this.phase[i * 3]) * 0.16;
          by = this.home[i * 3 + 1] + Math.sin(time * 0.5 + this.phase[i * 3 + 1]) * 0.16 * 0.7;
          bz = this.home[i * 3 + 2] + Math.sin(time * 0.7 + this.phase[i * 3 + 2]) * 0.16;
        }
        const m = 1 - e, w0 = m * m, w1 = 2 * m * e, w2 = e * e;
        this.cPos[i3] = this.Ax[i3] * w0 + this.Cx[i3] * w1 + bx * w2;
        this.cPos[i3 + 1] = this.Ax[i3 + 1] * w0 + this.Cx[i3 + 1] * w1 + by * w2;
        this.cPos[i3 + 2] = this.Ax[i3 + 2] * w0 + this.Cx[i3 + 2] * w1 + bz * w2;
        this.cAlpha[i] = Math.min(1, this.baseA[i] + (this.dir[i] === 1 ? 0.7 * kk : 0.7 * (1 - kk)));
        if (kk >= 1) {
          if (this.dir[i] === 1) { this.state[i] = 2; this.cAlpha[i] = 0; this.absorbed.push(i); }
          else { this.state[i] = 0; this.cloudList.push(i); }
        }
      } else {
        this.cAlpha[i] = 0;
      }
    }
    if (this.cloud) {
      this.cloud.geometry.attributes.position.needsUpdate = true;
      this.cloud.geometry.attributes.aAlpha.needsUpdate = true;
    }

    const targetFill = this.absorbed.length / this.N;
    this.fillShown += (targetFill - this.fillShown) * Math.min(1, dt * 6);
    if (this.coreMat) this.coreMat.opacity = 0.95 * this.fillShown;
    if (this.innerGeo) this.innerGeo.setDrawRange(0, Math.round(this.fillShown * this.INNER));
    if (this.innerPts) {
      this.innerPts.rotation.z += dt * (0.5 + this.fillShown * 2.5);
      this.innerPts.visible = this.fillShown > 0.01;
    }
    if (this.needle) this.needle.rotation.x = -2.1 + 4.2 * this.fillShown;

    const coll = (this.mode === 'collecting' || this.mode === 'full');
    if (this.intakeMat) this.intakeMat.emissiveIntensity = coll ? 2.2 : 0.5;
    if (this.coneMat) this.coneMat.opacity = coll ? 0.18 : 0;
    if (this.wheel) this.wheel.rotation.z += dt * (coll ? 8 : 0);

    for (const r of this.rotors) {
      r.blades.rotation.y += r.dir * (coll ? 40 : 18) * dt;
    }

    if (this.controls) this.controls.update();
    if (this.renderer && this.scene && this.camera) {
      this.renderer.render(this.scene, this.camera);
    }
  }

  destroy() {
    if (this.animationId) cancelAnimationFrame(this.animationId);
    if (this.renderer && this.renderer.domElement) this.renderer.domElement.remove();
  }
}
