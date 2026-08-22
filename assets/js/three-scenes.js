/**
 * IRANCOiN 3D Scenes Engine v3
 * =============================
 * - Hero: Pulsing brain (center) + realistic 3D coins + vapor logos
 * - Intelligence section: pulsing brain + electric veins + lightning bolts
 * - Dashboard preview: 3D portfolio bars
 * - Mini brain: dashboard.html topbar
 * - Background: ambient particles
 */

class IranCoin3D {
  constructor() {
    this.scenes = {};
    this.brains = [];
    this.coins = [];
    this.vaporSystem = null;
    this.running = true;
    this.reducedMotion = typeof window.matchMedia === 'function'
      && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.init();
  }

  init() {
    if (typeof THREE === 'undefined') {
      console.warn('Three.js not loaded');
      return;
    }
    this.setupMainScene();
    this.setupIntelScene();
    this.setupDashboardScene();
    this.setupMiniBrain();
    this.setupParticles();
    this.animate();

    window.addEventListener('resize', () => this.handleResize());
  }

  // ============================================================
  // COLOR HELPERS
  // ============================================================
  colorToHex(color) {
    return '#' + color.toString(16).padStart(6, '0');
  }

  lightenColor(color, percent) {
    const num = parseInt(this.colorToHex(color).slice(1), 16);
    const r = Math.min(255, (num >> 16) + Math.round(255 * percent / 100));
    const g = Math.min(255, ((num >> 8) & 0x00FF) + Math.round(255 * percent / 100));
    const b = Math.min(255, (num & 0x0000FF) + Math.round(255 * percent / 100));
    return `rgb(${r},${g},${b})`;
  }

  darkenColor(color, percent) {
    const num = parseInt(this.colorToHex(color).slice(1), 16);
    const r = Math.max(0, (num >> 16) - Math.round(255 * percent / 100));
    const g = Math.max(0, ((num >> 8) & 0x00FF) - Math.round(255 * percent / 100));
    const b = Math.max(0, (num & 0x0000FF) - Math.round(255 * percent / 100));
    return `rgb(${r},${g},${b})`;
  }

  // ============================================================
  // SCENE SETUP HELPERS
  // ============================================================
  createRenderer(container) {
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    const w = container.clientWidth || 1;
    const h = container.clientHeight || 1;
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);
    return renderer;
  }

  // ============================================================
  // BRAIN BUILDER — reusable pulsing brain group
  // Returns: { group, glow, veins, bolts }
  // ============================================================
  buildBrain(scale = 1) {
    const group = new THREE.Group();

    // --- Brain hemispheres (particle clouds) ---
    const hemisphere = (offsetX, flip) => {
      const count = 500;
      const positions = new Float32Array(count * 3);

      for (let i = 0; i < count; i++) {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        let r = 1.0 + Math.random() * 0.15;
        r += Math.sin(theta * 6) * 0.06;
        r += Math.sin(phi * 8) * 0.04;
        const yScale = phi > Math.PI * 0.6 ? 0.7 : 1.0;

        positions[i * 3] = (offsetX + r * Math.sin(phi) * Math.cos(theta) * (flip ? -1 : 1)) * scale;
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * yScale * scale;
        positions[i * 3 + 2] = r * Math.cos(phi) * 0.9 * scale;
      }

      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));

      const mat = new THREE.PointsMaterial({
        color: 0x9F7AEA,
        size: 0.06 * scale,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      return new THREE.Points(geo, mat);
    };

    group.add(hemisphere(-0.12 * scale, false));
    group.add(hemisphere(0.12 * scale, true));

    // --- Brain stem ---
    const stemGeo = new THREE.CylinderGeometry(0.2 * scale, 0.15 * scale, 0.5 * scale, 16);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x6D28D9,
      emissive: 0x6D28D9,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.7,
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0, -0.9 * scale, 0);
    group.add(stem);

    // --- Electric vein particles on surface ---
    const veinCount = 150;
    const vGeo = new THREE.BufferGeometry();
    const vPos = new Float32Array(veinCount * 3);
    const vCol = new Float32Array(veinCount * 3);

    for (let i = 0; i < veinCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.05 + Math.random() * 0.1;

      vPos[i * 3] = r * Math.sin(phi) * Math.cos(theta) * scale;
      vPos[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * scale;
      vPos[i * 3 + 2] = r * Math.cos(phi) * 0.9 * scale;

      const t = Math.random();
      vCol[i * 3] = 0.5 + t * 0.5;
      vCol[i * 3 + 1] = 0.8 + t * 0.2;
      vCol[i * 3 + 2] = 1.0;
    }

    vGeo.setAttribute('position', new THREE.BufferAttribute(vPos, 3));
    vGeo.setAttribute('color', new THREE.BufferAttribute(vCol, 3));

    const vMat = new THREE.PointsMaterial({
      size: 0.045 * scale,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const veins = new THREE.Points(vGeo, vMat);
    group.add(veins);

    // --- Lightning bolt pool (electric discharges) ---
    const bolts = [];
    const boltPoolSize = 8;
    for (let i = 0; i < boltPoolSize; i++) {
      const boltGeo = new THREE.BufferGeometry();
      const boltMat = new THREE.LineBasicMaterial({
        color: 0x7DF9FF,
        transparent: true,
        opacity: 0,
        blending: THREE.AdditiveBlending,
      });
      const bolt = new THREE.Line(boltGeo, boltMat);
      bolt.visible = false;
      group.add(bolt);
      bolts.push({ line: bolt, active: false, timer: 0, dur: 0.18 });
    }

    // --- Central glow ---
    const glowGeo = new THREE.SphereGeometry(0.5 * scale, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x7C3AED,
      transparent: true,
      opacity: 0.15,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0.1 * scale, 0);
    group.add(glow);

    return { group, glow, veins, bolts, scale };
  }

  /** Flash a random lightning bolt from brain core to surface */
  flashBolt(brain) {
    const pool = brain.bolts.filter(b => !b.active);
    if (!pool.length) return;
    const bolt = pool[Math.floor(Math.random() * pool.length)];
    bolt.active = true;
    bolt.timer = 0;
    bolt.line.visible = true;

    const s = brain.scale;
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const endR = (1.0 + Math.random() * 0.2) * s;
    const end = new THREE.Vector3(
      endR * Math.sin(phi) * Math.cos(theta),
      endR * Math.sin(phi) * Math.sin(theta),
      endR * Math.cos(phi) * 0.9
    );

    const start = end.clone().multiplyScalar(0.15 + Math.random() * 0.1);

    const segs = 5 + Math.floor(Math.random() * 3);
    const pts = [];
    for (let i = 0; i <= segs; i++) {
      const p = start.clone().lerp(end, i / segs);
      if (i > 0 && i < segs) {
        p.x += (Math.random() - 0.5) * 0.25 * s;
        p.y += (Math.random() - 0.5) * 0.25 * s;
        p.z += (Math.random() - 0.5) * 0.25 * s;
      }
      pts.push(p);
    }

    bolt.line.geometry.dispose();
    bolt.line.geometry = new THREE.BufferGeometry().setFromPoints(pts);
  }

  // ============================================================
  // HERO SCENE — brain center + coins + vapor
  // ============================================================
  setupMainScene() {
    const container = document.getElementById('hero-3d');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight || 1, 0.1, 1000);
    const renderer = this.createRenderer(container);

    // Lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const dirLight = new THREE.DirectionalLight(0xffffff, 1.5);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const purpleLight = new THREE.PointLight(0x7C3AED, 4, 25);
    purpleLight.position.set(-3, 2, 4);
    scene.add(purpleLight);

    const cyanLight = new THREE.PointLight(0x22D3EE, 4, 25);
    cyanLight.position.set(3, 2, -4);
    scene.add(cyanLight);

    const topLight = new THREE.PointLight(0xffffff, 2, 15);
    topLight.position.set(0, 6, 0);
    scene.add(topLight);

    // Brain (center)
    const brain = this.buildBrain(0.85);
    brain.group.position.set(0, 0.3, 0);
    scene.add(brain.group);
    this.brains.push(brain);

    // 3D coins flanking
    this.createCoins(scene);

    // Vapor system
    this.vaporSystem = this.createVaporSystem(scene);

    camera.position.set(0, 1.5, 8);
    camera.lookAt(0, 0.5, 0);

    this.scenes.main = { scene, camera, renderer, container };
  }

  // ============================================================
  // INTELLIGENCE SECTION SCENE — pulsing brain detail
  // ============================================================
  setupIntelScene() {
    const container = document.getElementById('brain-3d');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight || 1, 0.1, 1000);
    const renderer = this.createRenderer(container);

    scene.add(new THREE.AmbientLight(0xffffff, 0.5));
    const pointLight = new THREE.PointLight(0x7C3AED, 4, 30);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    const cyanLight = new THREE.PointLight(0x22D3EE, 2, 20);
    cyanLight.position.set(3, -2, 3);
    scene.add(cyanLight);

    const brain = this.buildBrain(1.15);
    scene.add(brain.group);
    this.brains.push(brain);

    camera.position.set(0, 0, 4.5);
    camera.lookAt(0, 0, 0);

    this.scenes.intel = { scene, camera, renderer, container };
  }

  // ============================================================
  // DASHBOARD PREVIEW SCENE — 3D portfolio bars
  // ============================================================
  setupDashboardScene() {
    const container = document.getElementById('dashboard-3d');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight || 1, 0.1, 1000);
    const renderer = this.createRenderer(container);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dirLight = new THREE.DirectionalLight(0xffffff, 2);
    dirLight.position.set(5, 10, 5);
    scene.add(dirLight);

    const purpleLight = new THREE.PointLight(0x7C3AED, 3, 30);
    purpleLight.position.set(-4, 5, 4);
    scene.add(purpleLight);

    const cyanLight = new THREE.PointLight(0x22D3EE, 3, 30);
    cyanLight.position.set(4, 5, -4);
    scene.add(cyanLight);

    const barData = [
      { height: 2, color: 0x7C3AED, pos: [-2, 0, 0] },
      { height: 1.5, color: 0x22D3EE, pos: [-1, 0, 0] },
      { height: 3, color: 0x10B981, pos: [0, 0, 0] },
      { height: 1.8, color: 0xEC4899, pos: [1, 0, 0] },
      { height: 2.5, color: 0xF59E0B, pos: [2, 0, 0] },
    ];

    const bars = [];
    barData.forEach((data) => {
      const geo = new THREE.BoxGeometry(0.6, data.height, 0.6);
      const mat = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: 0.3,
        metalness: 0.6,
        roughness: 0.2,
      });
      const bar = new THREE.Mesh(geo, mat);
      bar.position.set(data.pos[0], data.height / 2, data.pos[2]);
      bar.userData = {
        originalHeight: data.height,
        speed: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2,
      };
      scene.add(bar);
      bars.push(bar);
    });

    const grid = new THREE.GridHelper(10, 10, 0x7C3AED, 0x4a5568);
    grid.position.y = -0.01;
    scene.add(grid);

    camera.position.set(4, 3, 4);
    camera.lookAt(0, 1, 0);

    this.scenes.dashboard = { scene, camera, renderer, container, bars };
  }

  // ============================================================
  // MINI BRAIN — dashboard.html topbar
  // ============================================================
  setupMiniBrain() {
    const container = document.getElementById('brain-3d-container');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, 1, 0.1, 100);
    const renderer = this.createRenderer(container);

    scene.add(new THREE.AmbientLight(0xffffff, 0.6));
    const light = new THREE.PointLight(0x7C3AED, 4, 10);
    light.position.set(0, 0, 3);
    scene.add(light);

    const brain = this.buildBrain(0.4);
    scene.add(brain.group);
    this.brains.push(brain);

    camera.position.set(0, 0, 2.5);
    camera.lookAt(0, 0, 0);

    this.scenes.mini = { scene, camera, renderer, container };
  }

  // ============================================================
  // 3D COINS — realistic crypto coins
  // ============================================================
  createCoins(scene) {
    const coinData = [
      { color: 0xF7931A, emissive: 0xF7931A, size: 0.7, pos: [-3.2, 0.5, 0.5], symbol: 'BTC', svg: 'assets/brands/BTC.svg' },
      { color: 0x26A17B, emissive: 0x26A17B, size: 0.55, pos: [-2, -0.3, 1], symbol: 'USDT', svg: 'assets/brands/USDT.svg' },
      { color: 0x627EEA, emissive: 0x627EEA, size: 0.65, pos: [0, 1.8, -1], symbol: 'ETH', svg: 'assets/brands/ETH.svg' },
      { color: 0xF0B90B, emissive: 0xF0B90B, size: 0.5, pos: [2, -0.2, 0.8], symbol: 'BNB', svg: 'assets/brands/BNB.svg' },
      { color: 0x9945FF, emissive: 0x9945FF, size: 0.5, pos: [3.2, 0.6, -0.3], symbol: 'SOL', svg: 'assets/brands/SOL.svg' },
      { color: 0x0033AD, emissive: 0x0033AD, size: 0.45, pos: [-1.5, 1.5, -1.5], symbol: 'ADA', svg: 'assets/brands/ADA.svg' },
      { color: 0xC2A633, emissive: 0xC2A633, size: 0.45, pos: [1.5, 1.3, 1.2], symbol: 'DOGE', svg: 'assets/brands/DOGE.svg' },
      { color: 0x346AA9, emissive: 0x346AA9, size: 0.5, pos: [0, -0.8, 2], symbol: 'XRP', svg: null },
    ];

    const loadSVG = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    const svgImages = {};
    const svgPromises = coinData.filter(c => c.svg).map(async (data) => {
      svgImages[data.symbol] = await loadSVG(data.svg);
    });

    const drawCoinTexture = (data) => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 1024;
      const ctx = canvas.getContext('2d');
      if (!ctx) return canvas;

      const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
      gradient.addColorStop(0, this.lightenColor(data.color, 40));
      gradient.addColorStop(0.5, this.colorToHex(data.color));
      gradient.addColorStop(1, this.darkenColor(data.color, 40));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(512, 512, 512, 0, Math.PI * 2);
      ctx.fill();

      ctx.beginPath();
      ctx.arc(512, 512, 480, 0, Math.PI * 2);
      ctx.strokeStyle = this.lightenColor(data.color, 60);
      ctx.lineWidth = 12;
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(512, 512, 400, 0, Math.PI * 2);
      ctx.strokeStyle = this.lightenColor(data.color, 40);
      ctx.lineWidth = 6;
      ctx.stroke();

      const img = svgImages[data.symbol];
      if (img) {
        const logoSize = 500;
        ctx.drawImage(img, 512 - logoSize / 2, 512 - logoSize / 2, logoSize, logoSize);
      } else {
        ctx.shadowColor = 'rgba(0,0,0,0.5)';
        ctx.shadowBlur = 20;
        ctx.shadowOffsetX = 5;
        ctx.shadowOffsetY = 5;
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 400px Arial';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(data.symbol, 512, 520);
      }

      ctx.shadowColor = 'transparent';
      const shine = ctx.createLinearGradient(200, 200, 800, 800);
      shine.addColorStop(0, 'rgba(255,255,255,0.5)');
      shine.addColorStop(0.3, 'rgba(255,255,255,0.1)');
      shine.addColorStop(0.7, 'rgba(255,255,255,0)');
      shine.addColorStop(1, 'rgba(255,255,255,0.2)');
      ctx.fillStyle = shine;
      ctx.beginPath();
      ctx.arc(512, 512, 490, 0, Math.PI * 2);
      ctx.fill();

      return canvas;
    };

    Promise.all(svgPromises).then(() => {
      coinData.forEach((data) => {
        const canvas = drawCoinTexture(data);
        const texture = new THREE.CanvasTexture(canvas);
        texture.needsUpdate = true;

        const coinGroup = new THREE.Group();

        const bodyGeo = new THREE.CylinderGeometry(data.size, data.size, 0.2, 64);
        const bodyMat = new THREE.MeshStandardMaterial({
          map: texture,
          emissive: data.emissive,
          emissiveIntensity: 0.4,
          metalness: 0.85,
          roughness: 0.15,
        });
        coinGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

        const ridgeGeo = new THREE.TorusGeometry(data.size, 0.04, 16, 64);
        const ridgeMat = new THREE.MeshStandardMaterial({
          color: data.color,
          emissive: data.emissive,
          emissiveIntensity: 0.5,
          metalness: 0.95,
          roughness: 0.05,
        });
        const ridge = new THREE.Mesh(ridgeGeo, ridgeMat);
        ridge.rotation.x = Math.PI / 2;
        coinGroup.add(ridge);

        const ringGeo = new THREE.TorusGeometry(data.size + 0.15, 0.03, 16, 100);
        const ringMat = new THREE.MeshBasicMaterial({
          color: data.color,
          transparent: true,
          opacity: 0.5,
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = Math.PI / 2;
        coinGroup.add(ring);

        coinGroup.position.set(...data.pos);
        coinGroup.rotation.x = Math.PI / 2;
        coinGroup.userData = {
          originalY: data.pos[1],
          speed: 0.4 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          bobAmp: 0.15 + Math.random() * 0.1,
        };

        scene.add(coinGroup);
        this.coins.push(coinGroup);
      });

      // Neural connections
      const lineMat = new THREE.LineBasicMaterial({
        color: 0x7C3AED,
        transparent: true,
        opacity: 0.25,
      });

      for (let i = 0; i < this.coins.length; i++) {
        for (let j = i + 1; j < this.coins.length; j++) {
          if (Math.random() > 0.5) continue;
          const pts = [this.coins[i].position, this.coins[j].position];
          const geo = new THREE.BufferGeometry().setFromPoints(pts);
          scene.add(new THREE.Line(geo, lineMat));
        }
      }
    }).catch(err => console.error('Failed to create 3D coins:', err));
  }

  // ============================================================
  // VAPOR LOGO SYSTEM — logos rising from brain
  // ============================================================
  createVaporSystem(scene) {
    const system = {
      group: new THREE.Group(),
      logos: [],
      spawnTimer: 1,
      spawnInterval: 2,
      maxActive: 8,
      svgImages: {},
      svgLoaded: false,
    };

    const svgSources = [
      { symbol: 'BTC', svg: 'assets/brands/BTC.svg' },
      { symbol: 'ETH', svg: 'assets/brands/ETH.svg' },
      { symbol: 'USDT', svg: 'assets/brands/USDT.svg' },
      { symbol: 'BNB', svg: 'assets/brands/BNB.svg' },
      { symbol: 'SOL', svg: 'assets/brands/SOL.svg' },
      { symbol: 'ADA', svg: 'assets/brands/ADA.svg' },
      { symbol: 'DOGE', svg: 'assets/brands/DOGE.svg' },
    ];

    const loadSVG = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    Promise.all(svgSources.map(async (c) => {
      system.svgImages[c.symbol] = await loadSVG(c.svg);
    })).then(() => { system.svgLoaded = true; });

    scene.add(system.group);
    return system;
  }

  spawnVaporLogo() {
    const system = this.vaporSystem;
    if (!system || !system.svgLoaded) return;
    if (system.logos.filter(l => l.alive).length >= system.maxActive) return;

    const allCryptos = [
      { symbol: 'BTC', color: '#F7931A' },
      { symbol: 'ETH', color: '#627EEA' },
      { symbol: 'USDT', color: '#26A17B' },
      { symbol: 'BNB', color: '#F0B90B' },
      { symbol: 'SOL', color: '#9945FF' },
      { symbol: 'ADA', color: '#0033AD' },
      { symbol: 'DOGE', color: '#C2A633' },
      { symbol: 'XRP', color: '#346AA9' },
      { symbol: 'DOT', color: '#E6007A' },
      { symbol: 'AVAX', color: '#E84142' },
      { symbol: 'LINK', color: '#2A5ADA' },
      { symbol: 'MATIC', color: '#8247E5' },
      { symbol: 'UNI', color: '#FF007A' },
      { symbol: 'ATOM', color: '#2E3148' },
      { symbol: 'LTC', color: '#BFBBBB' },
    ];

    const crypto = allCryptos[Math.floor(Math.random() * allCryptos.length)];
    const svgImg = system.svgImages[crypto.symbol];

    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, crypto.color + 'CC');
    grad.addColorStop(0.7, crypto.color + '66');
    grad.addColorStop(1, crypto.color + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();

    if (svgImg) {
      ctx.drawImage(svgImg, 48, 48, 160, 160);
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 72px Arial';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(crypto.symbol, 128, 128);
    }

    const texture = new THREE.CanvasTexture(canvas);
    const spriteMat = new THREE.SpriteMaterial({
      map: texture,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(spriteMat);
    const startSize = 0.3 + Math.random() * 0.2;
    sprite.scale.set(startSize, startSize, 1);

    const angle = Math.random() * Math.PI * 2;
    const spread = 0.5 + Math.random() * 0.5;
    sprite.position.set(
      Math.cos(angle) * spread,
      0.3 + Math.random() * 0.3,
      Math.sin(angle) * spread
    );

    system.group.add(sprite);

    system.logos.push({
      sprite: sprite,
      alive: true,
      age: 0,
      maxAge: 4 + Math.random() * 3,
      startY: sprite.position.y,
      targetY: sprite.position.y + 2.5 + Math.random() * 1.5,
      startSize: startSize,
      targetSize: startSize * 1.8 + Math.random() * 0.5,
      driftX: (Math.random() - 0.5) * 0.3,
      driftZ: (Math.random() - 0.5) * 0.3,
      pulsePhase: Math.random() * Math.PI * 2,
    });
  }

  updateVaporLogos(dt, time) {
    const system = this.vaporSystem;
    if (!system) return;

    system.spawnTimer += dt;
    if (system.spawnTimer >= system.spawnInterval) {
      system.spawnTimer = 0;
      system.spawnInterval = 1.5 + Math.random() * 2.5;
      this.spawnVaporLogo();
    }

    for (let i = system.logos.length - 1; i >= 0; i--) {
      const logo = system.logos[i];
      if (!logo.alive) continue;

      logo.age += dt;
      const progress = Math.min(logo.age / logo.maxAge, 1);

      logo.sprite.position.y = logo.startY + (logo.targetY - logo.startY) * progress;
      logo.sprite.position.x += logo.driftX * dt;
      logo.sprite.position.z += logo.driftZ * dt;

      const size = logo.startSize + (logo.targetSize - logo.startSize) * progress;
      const pulse = 1 + Math.sin(time * 3 + logo.pulsePhase) * 0.08;
      logo.sprite.scale.set(size * pulse, size * pulse, 1);

      let opacity;
      if (progress < 0.15) {
        opacity = progress / 0.15;
      } else if (progress > 0.7) {
        opacity = (1 - progress) / 0.3;
      } else {
        opacity = 1;
      }
      logo.sprite.material.opacity = Math.max(0, opacity * 0.85);

      if (progress >= 1) {
        logo.alive = false;
        system.group.remove(logo.sprite);
        logo.sprite.material.dispose();
        if (logo.sprite.material.map) logo.sprite.material.map.dispose();
        system.logos.splice(i, 1);
      }
    }
  }

  // ============================================================
  // BACKGROUND PARTICLES
  // ============================================================
  setupParticles() {
    const container = document.getElementById('particles-3d');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight || 1, 0.1, 1000);
    const renderer = this.createRenderer(container);

    const count = 400;
    const positions = new Float32Array(count * 3);
    const colors = new Float32Array(count * 3);

    const palette = [
      new THREE.Color(0x7C3AED),
      new THREE.Color(0x22D3EE),
      new THREE.Color(0xEC4899),
      new THREE.Color(0x10B981),
    ];

    for (let i = 0; i < count; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const c = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3] = c.r;
      colors[i * 3 + 1] = c.g;
      colors[i * 3 + 2] = c.b;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const mat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.5,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geo, mat);
    scene.add(particles);
    camera.position.z = 5;

    this.scenes.particles = { scene, camera, renderer, container, particles };
  }

  // ============================================================
  // ANIMATION LOOP
  // ============================================================
  animate() {
    if (!this.running) return;

    // Respect prefers-reduced-motion: render one static frame, no animation
    if (this.reducedMotion) {
      Object.values(this.scenes).forEach((s) => {
        s.renderer.render(s.scene, s.camera);
      });
      return;
    }

    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;
    const dt = 1 / 60;

    // === BRAINS: pulse + electric ===
    this.brains.forEach((brain) => {
      // Heartbeat pulse (no rotation)
      const heartbeat = Math.pow(Math.sin(time * 2.5), 2) * 0.12;
      const breath = Math.sin(time * 0.8) * 0.03;
      brain.group.scale.setScalar(1 + heartbeat + breath);

      brain.glow.material.opacity = 0.1 + heartbeat * 0.5;
      brain.glow.scale.setScalar(1 + heartbeat * 2);

      // Electric veins flicker
      brain.veins.material.opacity = 0.4 + Math.sin(time * 3) * 0.25 + heartbeat * 0.3;

      // Lightning bolts
      brain.bolts.forEach((bolt) => {
        if (!bolt.active) {
          if (Math.random() < 0.02) this.flashBolt(brain);
          return;
        }
        bolt.timer += dt;
        const p = Math.min(bolt.timer / bolt.dur, 1);
        bolt.line.material.opacity = Math.sin(p * Math.PI) * 0.9;
        if (p >= 1) {
          bolt.active = false;
          bolt.line.visible = false;
          bolt.line.material.opacity = 0;
        }
      });
    });

    // === COINS FLOAT ===
    this.coins.forEach((coin) => {
      const ud = coin.userData;
      coin.position.y = ud.originalY + Math.sin(time * ud.speed + ud.phase) * ud.bobAmp;
      coin.rotation.z = Math.sin(time * 0.3 + ud.phase) * 0.15;
      coin.rotation.y += 0.003;
    });

    // === VAPOR LOGOS ===
    this.updateVaporLogos(dt, time);

    // === RENDER ALL SCENES ===
    Object.values(this.scenes).forEach((s) => {
      s.renderer.render(s.scene, s.camera);
    });

    // === PARTICLES rotation handled above (particles is in scenes) ===
    if (this.scenes.particles) {
      this.scenes.particles.particles.rotation.y += 0.0003;
      this.scenes.particles.particles.rotation.x += 0.0001;
    }
  }

  // ============================================================
  // RESIZE
  // ============================================================
  handleResize() {
    Object.values(this.scenes).forEach((s) => {
      const container = s.renderer.domElement.parentElement;
      if (container && container.clientWidth > 0 && container.clientHeight > 0) {
        s.camera.aspect = container.clientWidth / container.clientHeight;
        s.camera.updateProjectionMatrix();
        s.renderer.setSize(container.clientWidth, container.clientHeight);
      }
    });
  }

  destroy() {
    this.running = false;
    Object.values(this.scenes).forEach((s) => {
      s.renderer.dispose();
    });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.IranCoin3D = new IranCoin3D();
});