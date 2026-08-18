/**
 * IRANCOiN 3D Scenes Engine
 * ==========================
 * Three.js scenes for:
 * - Hero: Floating crypto coins
 * - Intelligence: 3D brain/neural network
 * - Dashboard: 3D portfolio visualization
 * - Background: Particle system
 */

class IranCoin3D {
  constructor() {
    this.scenes = {};
    this.animations = {};
    this.init();
  }

  init() {
    if (typeof THREE === 'undefined') {
      console.warn('Three.js not loaded');
      return;
    }
    this.setupHeroScene();
    this.setupBrainScene();
    this.setupDashboardScene();
    this.setupParticles();
    this.animate();
  }

  // Color helper functions
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
  // HERO SCENE - Floating Crypto Coins
  // ============================================================
  setupHeroScene() {
    const container = document.getElementById('hero-3d');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);

    // Strong lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x7C3AED, 3, 30);
    pointLight1.position.set(-4, 3, 4);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x22D3EE, 3, 30);
    pointLight2.position.set(4, 3, -4);
    scene.add(pointLight2);

    const pointLight3 = new THREE.PointLight(0xffffff, 2, 20);
    pointLight3.position.set(0, 5, 0);
    scene.add(pointLight3);

    // Crypto coins - using emissive materials for visibility
    const coins = [];
    const coinData = [
      { color: 0xF7931A, emissive: 0xF7931A, size: 0.8, pos: [-3, 0.5, 0], symbol: 'BTC', svg: 'assets/brands/BTC.svg' },
      { color: 0x26A17B, emissive: 0x26A17B, size: 0.6, pos: [-1.5, 0, 1], symbol: 'USDT', svg: 'assets/brands/USDT.svg' },
      { color: 0x627EEA, emissive: 0x627EEA, size: 0.7, pos: [0, 1, -1], symbol: 'ETH', svg: 'assets/brands/ETH.svg' },
      { color: 0xF0B90B, emissive: 0xF0B90B, size: 0.5, pos: [1.5, 0.3, 0.5], symbol: 'BNB', svg: 'assets/brands/BNB.svg' },
      { color: 0x9945FF, emissive: 0x9945FF, size: 0.55, pos: [3, 0.7, -0.5], symbol: 'SOL', svg: 'assets/brands/SOL.svg' },
      { color: 0x0033AD, emissive: 0x0033AD, size: 0.45, pos: [-2, -0.5, -1], symbol: 'ADA', svg: 'assets/brands/ADA.svg' },
      { color: 0xC2A633, emissive: 0xC2A633, size: 0.5, pos: [2, -0.3, 1], symbol: 'DOGE', svg: 'assets/brands/DOGE.svg' },
      { color: 0x346AA9, emissive: 0x346AA9, size: 0.55, pos: [0, -0.5, 2], symbol: 'XRP', svg: null },
    ];

    // Helper to load SVG as Image
    const loadSVG = (url) => {
      return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = url;
      });
    };

    // Preload all SVGs
    const svgImages = {};
    const svgPromises = coinData.filter(c => c.svg).map(async (data) => {
      svgImages[data.symbol] = await loadSVG(data.svg);
    });

    // Draw coin texture with SVG or fallback text
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
      
      // Draw SVG logo if available, otherwise text
      const img = svgImages[data.symbol];
      if (img) {
        // Draw SVG logo centered and sized to fit
        const logoSize = 500;
        ctx.drawImage(img, 512 - logoSize/2, 512 - logoSize/2, logoSize, logoSize);
      } else {
        // Fallback: text symbol with shadow
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
      
      // Shine effect
      ctx.shadowColor = 'transparent';
      const shineGradient = ctx.createLinearGradient(200, 200, 800, 800);
      shineGradient.addColorStop(0, 'rgba(255,255,255,0.5)');
      shineGradient.addColorStop(0.3, 'rgba(255,255,255,0.1)');
      shineGradient.addColorStop(0.7, 'rgba(255,255,255,0)');
      shineGradient.addColorStop(1, 'rgba(255,255,255,0.2)');
      ctx.fillStyle = shineGradient;
      ctx.beginPath();
      ctx.arc(512, 512, 490, 0, Math.PI * 2);
      ctx.fill();
      
      return canvas;
    };

    // Wait for all SVGs to load, then create coins
    Promise.all(svgPromises).then(() => {
      coinData.forEach((data, i) => {
        const canvas = drawCoinTexture.call(this, data);
        const texture = new THREE.CanvasTexture(canvas);
      texture.needsUpdate = true;

      // Create coin with ridged edge
      const coinGroup = new THREE.Group();
      
      // Main coin body with texture
      const bodyGeometry = new THREE.CylinderGeometry(data.size, data.size, 0.25, 64);
      const bodyMaterial = new THREE.MeshStandardMaterial({
        map: texture,
        emissive: data.emissive,
        emissiveIntensity: 0.4,
        metalness: 0.85,
        roughness: 0.15,
      });
      const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
      coinGroup.add(body);

      // Ridged edge (torus around the coin)
      const ridgeGeometry = new THREE.TorusGeometry(data.size, 0.05, 16, 64);
      const ridgeMaterial = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.emissive,
        emissiveIntensity: 0.5,
        metalness: 0.95,
        roughness: 0.05,
      });
      const ridge = new THREE.Mesh(ridgeGeometry, ridgeMaterial);
      ridge.rotation.x = Math.PI / 2;
      coinGroup.add(ridge);

      coinGroup.position.set(...data.pos);
      coinGroup.rotation.x = Math.PI / 2;
      coinGroup.userData = { 
        originalY: data.pos[1],
        speed: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      };
      scene.add(coinGroup);
      coins.push(coinGroup);

      // Add glow ring
      const ringGeometry = new THREE.TorusGeometry(data.size + 0.2, 0.04, 16, 100);
      const ringMaterial = new THREE.MeshBasicMaterial({ 
        color: data.color, 
        transparent: true, 
        opacity: 0.6 
      });
      const ring = new THREE.Mesh(ringGeometry, ringMaterial);
      ring.position.copy(coinGroup.position);
      ring.rotation.x = Math.PI / 2;
      scene.add(ring);
    });

    // Neural connections
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x7C3AED, 
      transparent: true, 
      opacity: 0.4 
    });

    for (let i = 0; i < coins.length; i++) {
      for (let j = i + 1; j < coins.length; j++) {
        if (Math.random() > 0.6) continue;
        const points = [coins[i].position, coins[j].position];
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const line = new THREE.Line(geometry, lineMaterial);
        scene.add(line);
      }
    }

    camera.position.z = 7;

    this.scenes.hero = { scene, camera, renderer, coins };
    }); // end Promise.all
  }

  // ============================================================
  // BRAIN SCENE - Neural Network Visualization
  // ============================================================
  setupBrainScene() {
    const container = document.getElementById('brain-3d');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0x404040, 0.3);
    scene.add(ambientLight);

    const pointLight = new THREE.PointLight(0x7C3AED, 3, 30);
    pointLight.position.set(0, 0, 5);
    scene.add(pointLight);

    // Brain nodes
    const nodes = [];
    const nodeCount = 50;
    const nodeGeometry = new THREE.SphereGeometry(0.08, 16, 16);
    const nodeMaterial = new THREE.MeshBasicMaterial({ color: 0xA78BFA });

    for (let i = 0; i < nodeCount; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);
      const r = 1.5 + Math.random() * 0.5;

      const node = new THREE.Mesh(nodeGeometry, nodeMaterial.clone());
      node.position.set(
        r * Math.sin(phi) * Math.cos(theta),
        r * Math.sin(phi) * Math.sin(theta),
        r * Math.cos(phi)
      );
      node.userData = {
        originalPos: node.position.clone(),
        speed: 0.2 + Math.random() * 0.3,
        phase: Math.random() * Math.PI * 2
      };
      scene.add(node);
      nodes.push(node);
    }

    // Neural connections
    const connections = [];
    const lineMaterial = new THREE.LineBasicMaterial({ 
      color: 0x22D3EE, 
      transparent: true, 
      opacity: 0.2 
    });

    nodes.forEach((node1, i) => {
      nodes.forEach((node2, j) => {
        if (i >= j) return;
        if (node1.position.distanceTo(node2.position) < 1.2) {
          const points = [node1.position.clone(), node2.position.clone()];
          const geometry = new THREE.BufferGeometry().setFromPoints(points);
          const line = new THREE.Line(geometry, lineMaterial.clone());
          scene.add(line);
          connections.push({ line, node1, node2 });
        }
      });
    });

    // Central glow
    const glowGeometry = new THREE.SphereGeometry(0.3, 32, 32);
    const glowMaterial = new THREE.MeshBasicMaterial({
      color: 0x7C3AED,
      transparent: true,
      opacity: 0.4
    });
    const glow = new THREE.Mesh(glowGeometry, glowMaterial);
    scene.add(glow);

    camera.position.z = 4;

    this.scenes.brain = { scene, camera, renderer, nodes, connections, glow };
  }

  // ============================================================
  // DASHBOARD SCENE - 3D Portfolio
  // ============================================================
  setupDashboardScene() {
    const container = document.getElementById('dashboard-3d');
    if (!container) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, container.clientWidth / container.clientHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.5;
    container.appendChild(renderer.domElement);

    // Strong lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xffffff, 2);
    directionalLight.position.set(5, 10, 5);
    scene.add(directionalLight);

    const pointLight1 = new THREE.PointLight(0x7C3AED, 3, 30);
    pointLight1.position.set(-4, 5, 4);
    scene.add(pointLight1);

    const pointLight2 = new THREE.PointLight(0x22D3EE, 3, 30);
    pointLight2.position.set(4, 5, -4);
    scene.add(pointLight2);

    // Portfolio bars (3D bar chart)
    const bars = [];
    const barData = [
      { height: 2, color: 0x7C3AED, pos: [-2, 0, 0] },
      { height: 1.5, color: 0x22D3EE, pos: [-1, 0, 0] },
      { height: 3, color: 0x10B981, pos: [0, 0, 0] },
      { height: 1.8, color: 0xEC4899, pos: [1, 0, 0] },
      { height: 2.5, color: 0xF59E0B, pos: [2, 0, 0] },
    ];

    barData.forEach((data, i) => {
      const geometry = new THREE.BoxGeometry(0.6, data.height, 0.6);
      const material = new THREE.MeshStandardMaterial({
        color: data.color,
        emissive: data.color,
        emissiveIntensity: 0.3,
        metalness: 0.6,
        roughness: 0.2,
      });
      const bar = new THREE.Mesh(geometry, material);
      bar.position.set(data.pos[0], data.height / 2, data.pos[2]);
      bar.userData = { 
        originalHeight: data.height,
        speed: 0.5 + Math.random() * 0.5,
        phase: Math.random() * Math.PI * 2
      };
      scene.add(bar);
      bars.push(bar);
    });

    // Grid
    const gridHelper = new THREE.GridHelper(10, 10, 0x7C3AED, 0x4a5568);
    gridHelper.position.y = -0.01;
    scene.add(gridHelper);

    camera.position.set(4, 3, 4);
    camera.lookAt(0, 1, 0);

    this.scenes.dashboard = { scene, camera, renderer, bars };
  }

  // ============================================================
  // PARTICLES - Background System
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

    // Particles
    const particleCount = 500;
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    const colorPalette = [
      new THREE.Color(0x7C3AED),
      new THREE.Color(0x22D3EE),
      new THREE.Color(0xEC4899),
      new THREE.Color(0x10B981),
    ];

    for (let i = 0; i < particleCount; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const color = colorPalette[Math.floor(Math.random() * colorPalette.length)];
      colors[i * 3] = color.r;
      colors[i * 3 + 1] = color.g;
      colors[i * 3 + 2] = color.b;
    }

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({
      size: 0.05,
      vertexColors: true,
      transparent: true,
      opacity: 0.6,
      blending: THREE.AdditiveBlending,
    });

    const particles = new THREE.Points(geometry, material);
    scene.add(particles);

    camera.position.z = 5;

    this.scenes.particles = { scene, camera, renderer, particles };
  }

  // ============================================================
  // ANIMATION LOOP
  // ============================================================
  animate() {
    requestAnimationFrame(() => this.animate());

    const time = Date.now() * 0.001;

    // Hero coins animation
    if (this.scenes.hero) {
      this.scenes.hero.coins.forEach((coin, i) => {
        coin.position.y = coin.userData.originalY + Math.sin(time * coin.userData.speed + coin.userData.phase) * 0.4;
        coin.rotation.z = Math.sin(time * 0.5 + coin.userData.phase) * 0.2;
        coin.rotation.y += 0.008;
      });
      this.scenes.hero.renderer.render(this.scenes.hero.scene, this.scenes.hero.camera);
    }

    // Brain animation
    if (this.scenes.brain) {
      this.scenes.brain.nodes.forEach((node) => {
        node.position.x = node.userData.originalPos.x + Math.sin(time * node.userData.speed + node.userData.phase) * 0.1;
        node.position.y = node.userData.originalPos.y + Math.cos(time * node.userData.speed + node.userData.phase) * 0.1;
      });

      // Update connections
      this.scenes.brain.connections.forEach(({ line, node1, node2 }) => {
        const positions = line.geometry.attributes.position.array;
        positions[0] = node1.position.x;
        positions[1] = node1.position.y;
        positions[2] = node1.position.z;
        positions[3] = node2.position.x;
        positions[4] = node2.position.y;
        positions[5] = node2.position.z;
        line.geometry.attributes.position.needsUpdate = true;
      });

      // Pulse glow
      this.scenes.brain.glow.scale.setScalar(1 + Math.sin(time * 2) * 0.2);

      this.scenes.brain.renderer.render(this.scenes.brain.scene, this.scenes.brain.camera);
    }

    // Dashboard bars animation
    if (this.scenes.dashboard) {
      this.scenes.dashboard.bars.forEach((bar) => {
        const scale = 1 + Math.sin(time * bar.userData.speed + bar.userData.phase) * 0.1;
        bar.scale.y = scale;
      });
      this.scenes.dashboard.renderer.render(this.scenes.dashboard.scene, this.scenes.dashboard.camera);
    }

    // Particles rotation
    if (this.scenes.particles) {
      this.scenes.particles.particles.rotation.y += 0.0005;
      this.scenes.particles.particles.rotation.x += 0.0002;
      this.scenes.particles.renderer.render(this.scenes.particles.scene, this.scenes.particles.camera);
    }
  }

  // ============================================================
  // RESIZE HANDLER
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
}

// Initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  window.IranCoin3D = new IranCoin3D();
  
  window.addEventListener('resize', () => {
    if (window.IranCoin3D) {
      window.IranCoin3D.handleResize();
    }
  });
});
