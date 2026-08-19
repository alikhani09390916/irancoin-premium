/**
 * IRANCOiN 3D Scenes Engine v2
 * =============================
 * Complete rewrite: Pulsing brain + Electric veins + Vapor crypto logos
 * + Realistic 3D coins + Background particles
 */

class IranCoin3D {
  constructor() {
    this.scenes = {};
    this.vaporLogos = [];
    this.brainParticles = [];
    this.electricParticles = [];
    this.coins = [];
    this.running = true;
    this.init();
  }

  init() {
    if (typeof THREE === 'undefined') {
      console.warn('Three.js not loaded');
      return;
    }
    this.setupMainScene();
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
  // MAIN SCENE — Brain + Coins + Vapor (all in one)
  // ============================================================
  setupMainScene() {
    const container = document.getElementById('hero-3d');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.4;
    container.appendChild(renderer.domElement);

    // === LIGHTING ===
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambientLight);

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

    // === BRAIN (center) ===
    this.createBrain(scene);

    // === 3D COINS (flanking brain) ===
    this.createCoins(scene);

    // === VAPOR LOGO SYSTEM ===
    this.vaporSystem = this.createVaporSystem(scene);

    camera.position.set(0, 1.5, 8);
    camera.lookAt(0, 0.5, 0);

    this.scenes.main = { scene, camera, renderer, container };
  }

  // ============================================================
  // BRAIN — Pulsing human brain shape with electric veins
  // ============================================================
  createBrain(scene) {
    const brainGroup = new THREE.Group();
    brainGroup.position.set(0, 0.3, 0);

    // Create brain shape from particle voxels
    const brainMat = new THREE.MeshStandardMaterial({
      color: 0x7C3AED,
      emissive: 0x7C3AED,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.85,
      roughness: 0.4,
      metalness: 0.2,
    });

    // Brain shape: two hemispheres with slight gap
    const hemisphere = (offsetX, flip) => {
      const count = 600;
      const geo = new THREE.BufferGeometry();
      const positions = new Float32Array(count * 3);
      const sizes = new Float32Array(count);

      for (let i = 0; i < count; i++) {
        // Brain-like shape: sphere with wrinkles
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        let r = 1.0 + Math.random() * 0.15;

        // Add wrinkle-like variation
        r += Math.sin(theta * 6) * 0.06;
        r += Math.sin(phi * 8) * 0.04;

        // Flatten slightly on bottom
        const yScale = phi > Math.PI * 0.6 ? 0.7 : 1.0;

        positions[i * 3] = offsetX + r * Math.sin(phi) * Math.cos(theta) * (flip ? -1 : 1);
        positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * yScale;
        positions[i * 3 + 2] = r * Math.cos(phi) * 0.9;

        sizes[i] = 0.03 + Math.random() * 0.04;
      }

      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

      const mat = new THREE.PointsMaterial({
        color: 0x9F7AEA,
        size: 0.06,
        transparent: true,
        opacity: 0.9,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      });

      return new THREE.Points(geo, mat);
    };

    // Left hemisphere
    brainGroup.add(hemisphere(-0.12, false));
    // Right hemisphere
    brainGroup.add(hemisphere(0.12, true));

    // Brain stem
    const stemGeo = new THREE.CylinderGeometry(0.2, 0.15, 0.5, 16);
    const stemMat = new THREE.MeshStandardMaterial({
      color: 0x6D28D9,
      emissive: 0x6D28D9,
      emissiveIntensity: 0.2,
      transparent: true,
      opacity: 0.7,
    });
    const stem = new THREE.Mesh(stemGeo, stemMat);
    stem.position.set(0, -0.9, 0);
    brainGroup.add(stem);

    // Electric vein particles on brain surface
    this.createElectricVeins(brainGroup);

    // Central glow
    const glowGeo = new THREE.SphereGeometry(0.5, 32, 32);
    const glowMat = new THREE.MeshBasicMaterial({
      color: 0x7C3AED,
      transparent: true,
      opacity: 0.15,
    });
    const glow = new THREE.Mesh(glowGeo, glowMat);
    glow.position.set(0, 0.1, 0);
    brainGroup.add(glow);

    scene.add(brainGroup);

    this.scenes.brain = {
      group: brainGroup,
      glow: glow,
      pulsePhase: 0,
      electricPhase: 0,
    };
  }

  // ============================================================
  // ELECTRIC VEINS — Random spark/discharge on brain surface
  // ============================================================
  createElectricVeins(brainGroup) {
    const veinCount = 200;
    const geo = new THREE.BufferGeometry();
    const positions = new Float32Array(veinCount * 3);
    const colors = new Float32Array(veinCount * 3);
    const sizes = new Float32Array(veinCount);
    const phases = new Float32Array(veinCount);

    for (let i = 0; i < veinCount; i++) {
      // Position on brain surface
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.05 + Math.random() * 0.1;

      positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = r * Math.cos(phi) * 0.9;

      // Cyan/white electric color
      const t = Math.random();
      colors[i * 3] = 0.5 + t * 0.5;     // R
      colors[i * 3 + 1] = 0.8 + t * 0.2;  // G
      colors[i * 3 + 2] = 1.0;              // B

      sizes[i] = 0.02 + Math.random() * 0.03;
      phases[i] = Math.random() * Math.PI * 2;
    }

    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const veins = new THREE.Points(geo, mat);
    brainGroup.add(veins);

    this.scenes.electricVeins = { points: veins, phases: phases };
  }

  // ============================================================
  // 3D COINS — Realistic crypto coins flanking the brain
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

      // Background gradient
      const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512);
      gradient.addColorStop(0, this.lightenColor(data.color, 40));
      gradient.addColorStop(0.5, this.colorToHex(data.color));
      gradient.addColorStop(1, this.darkenColor(data.color, 40));
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(512, 512, 512, 0, Math.PI * 2);
      ctx.fill();

      // Outer ring
      ctx.beginPath();
      ctx.arc(512, 512, 480, 0, Math.PI * 2);
      ctx.strokeStyle = this.lightenColor(data.color, 60);
      ctx.lineWidth = 12;
      ctx.stroke();

      // Inner ring
      ctx.beginPath();
      ctx.arc(512, 512, 400, 0, Math.PI * 2);
      ctx.strokeStyle = this.lightenColor(data.color, 40);
      ctx.lineWidth = 6;
      ctx.stroke();

      // Draw SVG logo or text
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

      // Shine
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

        // Coin body
        const bodyGeo = new THREE.CylinderGeometry(data.size, data.size, 0.2, 64);
        const bodyMat = new THREE.MeshStandardMaterial({
          map: texture,
          emissive: data.emissive,
          emissiveIntensity: 0.4,
          metalness: 0.85,
          roughness: 0.15,
        });
        coinGroup.add(new THREE.Mesh(bodyGeo, bodyMat));

        // Ridged edge
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

        // Glow ring
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
          originalX: data.pos[0],
          speed: 0.4 + Math.random() * 0.4,
          phase: Math.random() * Math.PI * 2,
          bobAmp: 0.15 + Math.random() * 0.1,
        };

        scene.add(coinGroup);
        this.coins.push(coinGroup);
      });

      // Neural connections between coins
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
  // VAPOR LOGO SYSTEM — Crypto logos rising from brain like vapor
  // ============================================================
  createVaporSystem(scene) {
    const allCryptos = [
      { symbol: 'BTC', color: '#F7931A', svg: 'assets/brands/BTC.svg' },
      { symbol: 'ETH', color: '#627EEA', svg: 'assets/brands/ETH.svg' },
      { symbol: 'USDT', color: '#26A17B', svg: 'assets/brands/USDT.svg' },
      { symbol: 'BNB', color: '#F0B90B', svg: 'assets/brands/BNB.svg' },
      { symbol: 'SOL', color: '#9945FF', svg: 'assets/brands/SOL.svg' },
      { symbol: 'ADA', color: '#0033AD', svg: 'assets/brands/ADA.svg' },
      { symbol: 'DOGE', color: '#C2A633', svg: 'assets/brands/DOGE.svg' },
      { symbol: 'XRP', color: '#346AA9', svg: null },
      { symbol: 'DOT', color: '#E6007A', svg: null },
      { symbol: 'AVAX', color: '#E84142', svg: null },
      { symbol: 'LINK', color: '#2A5ADA', svg: null },
      { symbol: 'MATIC', color: '#8247E5', svg: null },
      { symbol: 'UNI', color: '#FF007A', svg: null },
      { symbol: 'ATOM', color: '#2E3148', svg: null },
      { symbol: 'LTC', color: '#BFBBBB', svg: null },
    ];

    const system = {
      group: new THREE.Group(),
      logos: [],
      spawnTimer: 0,
      spawnInterval: 2.5,
      maxActive: 8,
      svgImages: {},
      svgLoaded: false,
    };

    // Preload SVGs
    const loadSVG = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    const svgCryptos = allCryptos.filter(c => c.svg);
    Promise.all(svgCryptos.map(async (c) => {
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

    // Create canvas texture for logo
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');

    // Glowing circle background
    const grad = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    grad.addColorStop(0, crypto.color + 'CC');
    grad.addColorStop(0.7, crypto.color + '66');
    grad.addColorStop(1, crypto.color + '00');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(128, 128, 128, 0, Math.PI * 2);
    ctx.fill();

    // Draw SVG or text
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
      opacity: 0.9,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const sprite = new THREE.Sprite(spriteMat);
    const startSize = 0.3 + Math.random() * 0.2;
    sprite.scale.set(startSize, startSize, 1);

    // Start from brain area (center, near brain surface)
    const angle = Math.random() * Math.PI * 2;
    const spread = 0.5 + Math.random() * 0.5;
    sprite.position.set(
      Math.cos(angle) * spread,
      0.3 + Math.random() * 0.3,
      Math.sin(angle) * spread
    );

    system.group.add(sprite);

    const logoData = {
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
    };

    system.logos.push(logoData);
  }

  updateVaporLogos(dt, time) {
    const system = this.vaporSystem;
    if (!system) return;

    // Spawn timer
    system.spawnTimer += dt;
    if (system.spawnTimer >= system.spawnInterval) {
      system.spawnTimer = 0;
      system.spawnInterval = 1.5 + Math.random() * 2.5;
      this.spawnVaporLogo();
    }

    // Update each logo
    for (let i = system.logos.length - 1; i >= 0; i--) {
      const logo = system.logos[i];
      if (!logo.alive) continue;

      logo.age += dt;
      const progress = Math.min(logo.age / logo.maxAge, 1);

      // Rise upward
      logo.sprite.position.y = logo.startY + (logo.targetY - logo.startY) * progress;
      // Gentle drift
      logo.sprite.position.x += logo.driftX * dt;
      logo.sprite.position.z += logo.driftZ * dt;

      // Grow as rising
      const size = logo.startSize + (logo.targetSize - logo.startSize) * progress;
      const pulse = 1 + Math.sin(time * 3 + logo.pulsePhase) * 0.08;
      logo.sprite.scale.set(size * pulse, size * pulse, 1);

      // Fade in first 15%, then fade out last 30%
      let opacity;
      if (progress < 0.15) {
        opacity = progress / 0.15;
      } else if (progress > 0.7) {
        opacity = (1 - progress) / 0.3;
      } else {
        opacity = 1;
      }
      logo.sprite.material.opacity = Math.max(0, opacity * 0.85);

      // Remove when fully faded
      if (progress >= 1) {
        logo.alive = false;
        system.group.remove(logo.sprite);
        logo.sprite.material.dispose();
        logo.sprite.material.map.dispose();
        system.logos.splice(i, 1);
      }
    }
  }

  // ============================================================
  // PARTICLES — Background ambient system
  // ============================================================
  setupParticles() {
    const container = document.getElementById('particles-3d');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });

    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

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

    this.scenes.particles = { scene, camera, renderer, particles };
  }

  // ============================================================
  // ANIMATION LOOP
  // ============================================================
  animate() {
    if (!this.running) return;
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;
    const dt = 1 / 60;

    // === BRAIN PULSE ===
    if (this.scenes.brain) {
      const brain = this.scenes.brain;

      // Heartbeat-like pulse (two beats then pause)
      const heartbeat = Math.pow(Math.sin(time * 2.5), 2) * 0.12;
      const breath = Math.sin(time * 0.8) * 0.03;
      const scale = 1 + heartbeat + breath;
      brain.group.scale.setScalar(scale);

      // Glow pulse
      brain.glow.material.opacity = 0.1 + heartbeat * 0.5;
      brain.glow.scale.setScalar(1 + heartbeat * 2);

      // No rotation — brain stays still
    }

    // === ELECTRIC VEINS ===
    if (this.scenes.electricVeins) {
      const veins = this.scenes.electricVeins;
      const posAttr = veins.points.geometry.attributes.position;
      const sizesAttr = veins.points.geometry.attributes.size;

      // Randomly flash some particles
      for (let i = 0; i < veins.phases.length; i++) {
        const flash = Math.sin(time * 8 + veins.phases[i] * 10);
        if (flash > 0.95) {
          sizesAttr.array[i] = 0.06 + Math.random() * 0.04;
        } else {
          sizesAttr.array[i] = 0.02 + Math.random() * 0.01;
        }
      }
      sizesAttr.needsUpdate = true;

      // Overall opacity flicker
      veins.points.material.opacity = 0.5 + Math.sin(time * 3) * 0.3;
    }

    // === COINS FLOAT ===
    this.coins.forEach((coin) => {
      const ud = coin.userData;
      coin.position.y = ud.originalY + Math.sin(time * ud.speed + ud.phase) * ud.bobAmp;
      coin.rotation.z = Math.sin(time * 0.3 + ud.phase) * 0.15;
      // Very slow rotation
      coin.rotation.y += 0.003;
    });

    // === VAPOR LOGOS ===
    this.updateVaporLogos(dt, time);

    // === RENDER MAIN ===
    if (this.scenes.main) {
      this.scenes.main.renderer.render(this.scenes.main.scene, this.scenes.main.camera);
    }

    // === PARTICLES ===
    if (this.scenes.particles) {
      this.scenes.particles.particles.rotation.y += 0.0003;
      this.scenes.particles.particles.rotation.x += 0.0001;
      this.scenes.particles.renderer.render(this.scenes.particles.scene, this.scenes.particles.camera);
    }
  }

  // ============================================================
  // RESIZE
  // ============================================================
  handleResize() {
    Object.values(this.scenes).forEach(({ camera, renderer }) => {
      const container = renderer.domElement.parentElement;
      if (container) {
        camera.aspect = container.clientWidth / container.clientHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(container.clientWidth, container.clientHeight);
      }
    });
  }

  destroy() {
    this.running = false;
    Object.values(this.scenes).forEach(({ renderer }) => {
      renderer.dispose();
    });
  }
}

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  window.IranCoin3D = new IranCoin3D();
});
