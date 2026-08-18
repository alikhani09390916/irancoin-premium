/**
 * ai-brain-scene.js — IRANCOIN AI Core Hero Visual
 * =================================================
 * Complete 3D scene: volumetric brain + neural filaments + floating
 * trading elements (candles, BTC/USDT, glass stat cards).
 *
 * Architecture:
 *   BrainRoot (Y rotation only)
 *   ├── BrainSurface (MeshPhysicalMaterial)
 *   ├── NeuralFilaments (ShaderMaterial lines)
 *   ├── InnerGlow (PointLight + mesh)
 *   └── NeuralParticles (Points)
 *   FloaterRoot (NEVER child of BrainRoot)
 *   ├── CandleCluster × N
 *   ├── BTC/USDT coins
 *   └── CSS2DObject stat cards
 *   CameraRig
 *   Lights
 */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// ============================================================
// CONFIG
// ============================================================
const C = {
  accent: 0x7c3aed,
  cyan: 0x22d3ee,
  brainColor: 0x1c1830,
  brainRadius: 1.15,
  haloRadius: 2.3,
  rotationDegPerSec: 10,
  pulsePeriod: 2.5,
  wobbleDeg: 2,
  wobblePeriod: 10,
  bloomStrength: 0.65,
  bloomRadius: 0.4,
  bloomThreshold: 0.2,
  pointerParallax: 0.035,
  mobilePixelRatio: 1.5,
  desktopPixelRatio: 2,
};

function isReducedMotion() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
}

// ============================================================
// BRAIN GEOMETRY — procedural human brain
// ============================================================
function foldNoise(nx, ny, nz) {
  const x = nx * 2.2, y = ny * 2.2, z = nz * 2.2;
  let n = 0;
  n += Math.sin(x * 3.1 + Math.cos(y * 2.3) * 1.5) * 0.5;
  n += Math.sin(y * 4.7 + Math.cos(z * 3.9) * 1.2) * 0.35;
  n += Math.sin(z * 5.3 + Math.cos(x * 4.1) * 1.7) * 0.25;
  n += Math.sin((x + y + z) * 7.9) * 0.15;
  // Central fissure groove
  const groove = Math.min(1, Math.abs(nx) * 2.4);
  return n * 0.09 * groove + n * 0.02 * (1 - groove);
}

function buildBrain(radius) {
  const geo = new THREE.IcosahedronGeometry(radius, 5);
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const dir = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    dir.copy(v).normalize();
    const d = foldNoise(dir.x, dir.y, dir.z);
    v.addScaledVector(dir, d * radius);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// ============================================================
// RIM SHELL — fresnel glow
// ============================================================
function buildRimShell(radius, color) {
  const geo = new THREE.IcosahedronGeometry(radius * 1.06, 4);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      color: { value: new THREE.Color(color) },
      power: { value: 2.2 },
      intensity: { value: 1.5 },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mv.xyz);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float power;
      uniform float intensity;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float f = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), power);
        gl_FragColor = vec4(color * intensity, f);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  return new THREE.Mesh(geo, mat);
}

// ============================================================
// NEURAL FILAMENTS — glowing lines on brain surface
// ============================================================
function buildNeuralFilaments(radius, count) {
  const points = [];
  for (let i = 0; i < count; i++) {
    // Random start on brain surface
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * 0.98;
    const sx = r * Math.sin(phi) * Math.cos(theta);
    const sy = r * Math.cos(phi);
    const sz = r * Math.sin(phi) * Math.sin(theta);

    // Walk along surface for a few steps
    const steps = 8 + Math.floor(Math.random() * 12);
    let cx = sx, cy = sy, cz = sz;
    for (let s = 0; s < steps; s++) {
      points.push(new THREE.Vector3(cx, cy, cz));
      // Tangent step
      const dx = (Math.random() - 0.5) * 0.08;
      const dy = (Math.random() - 0.5) * 0.08;
      const dz = (Math.random() - 0.5) * 0.08;
      cx += dx; cy += dy; cz += dz;
      // Pull back to surface
      const len = Math.sqrt(cx * cx + cy * cy + cz * cz);
      const scale = radius / len;
      cx *= scale * 0.99;
      cy *= scale * 0.99;
      cz *= scale * 0.99;
      points.push(new THREE.Vector3(cx, cy, cz));
    }
  }

  const geo = new THREE.BufferGeometry().setFromPoints(points);
  const mat = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      color: { value: new THREE.Color(C.cyan) },
      pulseSpeed: { value: 1.5 },
    },
    vertexShader: `
      varying float vAlpha;
      void main() {
        vec4 mv = modelViewMatrix * vec4(position, 1.0);
        vAlpha = 0.3 + 0.7 * smoothstep(0.0, 0.5, abs(position.y) / 1.5);
        gl_Position = projectionMatrix * mv;
      }
    `,
    fragmentShader: `
      uniform float time;
      uniform vec3 color;
      uniform float pulseSpeed;
      varying float vAlpha;
      void main() {
        float pulse = 0.4 + 0.6 * sin(time * pulseSpeed + gl_FragCoord.x * 0.01);
        gl_FragColor = vec4(color, vAlpha * pulse * 0.6);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
  });
  const lines = new THREE.LineSegments(geo, mat);
  return lines;
}

// ============================================================
// NEURAL PARTICLES — data sparks moving along surface
// ============================================================
function buildNeuralParticles(radius, count) {
  const geo = new THREE.BufferGeometry();
  const positions = new Float32Array(count * 3);
  const speeds = [];
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const r = radius * (0.95 + Math.random() * 0.1);
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = r * Math.cos(phi);
    positions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    speeds.push({
      theta, phi, r,
      speed: 0.2 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
    });
  }
  geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  const mat = new THREE.PointsMaterial({
    size: 0.03,
    color: C.cyan,
    transparent: true,
    opacity: 0.7,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
  });
  return { mesh: new THREE.Points(geo, mat), speeds };
}

// ============================================================
// 3D CANDLESTICK
// ============================================================
function makeCandle(bodyColor, h) {
  const g = new THREE.Group();
  // Body
  const body = new THREE.Mesh(
    new THREE.BoxGeometry(0.04, h, 0.02),
    new THREE.MeshPhysicalMaterial({
      color: bodyColor,
      roughness: 0.3,
      metalness: 0.1,
      emissive: new THREE.Color(bodyColor),
      emissiveIntensity: 0.15,
    })
  );
  g.add(body);
  // Wick
  const wick = new THREE.Mesh(
    new THREE.CylinderGeometry(0.003, 0.003, 0.06, 4),
    new THREE.MeshBasicMaterial({ color: 0x888888 })
  );
  wick.position.y = h / 2 + 0.03;
  g.add(wick);
  // Glow
  const glow = new THREE.Mesh(
    new THREE.SphereGeometry(0.04, 6, 6),
    new THREE.MeshBasicMaterial({
      color: bodyColor, transparent: true, opacity: 0.15,
    })
  );
  g.add(glow);
  return g;
}

// ============================================================
// BTC / USDT COIN
// ============================================================
function makeCoin(symbol, color) {
  const g = new THREE.Group();
  // Disc
  const disc = new THREE.Mesh(
    new THREE.CylinderGeometry(0.12, 0.12, 0.02, 24),
    new THREE.MeshPhysicalMaterial({
      color: color,
      roughness: 0.25,
      metalness: 0.6,
      emissive: new THREE.Color(color),
      emissiveIntensity: 0.2,
    })
  );
  disc.rotation.x = Math.PI / 2;
  g.add(disc);
  // Label (CSS2DObject will be added separately)
  return g;
}

// ============================================================
// GLASS STAT CARD (CSS2D)
// ============================================================
function makeStatCard(label, value) {
  const el = document.createElement("div");
  el.className = "ai-core-float-card";
  el.innerHTML = `<div class="ai-core-float-label">${label}</div><div class="ai-core-float-value">${value}</div>`;
  return new CSS2DObject(el);
}

// ============================================================
// GLYPH CARD (CSS2D)
// ============================================================
function makeGlyphCard(glyph) {
  const el = document.createElement("div");
  el.className = "ai-core-float-glyph";
  el.textContent = glyph;
  return new CSS2DObject(el);
}

// ============================================================
// MAIN EXPORT
// ============================================================
export function initAICoreBrain(container, userOptions = {}) {
  const opts = { ...C, ...userOptions };
  const reduced = isReducedMotion();
  const W = container.clientWidth || 600;
  const H = container.clientHeight || 480;

  // ======== RENDERER ========
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, reduced ? 1.5 : 2));
  renderer.setSize(W, H);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.style.cssText = "position:absolute;inset:0;z-index:1;";
  container.appendChild(renderer.domElement);

  // ======== CSS2D RENDERER ========
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(W, H);
  labelRenderer.domElement.style.cssText = "position:absolute;inset:0;z-index:2;pointer-events:none;";
  container.appendChild(labelRenderer.domElement);

  // ======== SCENE + CAMERA ========
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, W / H, 0.1, 100);
  camera.position.set(0, 0, 5.2);

  // ======== LIGHTS ========
  scene.add(new THREE.HemisphereLight(0xaeb8ff, 0x0b0b14, 0.55));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(3, 4, 5);
  scene.add(keyLight);
  const rimLight = new THREE.DirectionalLight(opts.accent, 1.0);
  rimLight.position.set(-4, -2, -3);
  scene.add(rimLight);
  const fillLight = new THREE.DirectionalLight(0x22d3ee, 0.4);
  fillLight.position.set(0, -3, 4);
  scene.add(fillLight);

  // ======== BRAIN GROUP (rotates) ========
  const brainRoot = new THREE.Group();
  scene.add(brainRoot);

  const brainScale = new THREE.Vector3(1, 0.94, 1.08);

  // Brain surface
  const brainMesh = new THREE.Mesh(
    buildBrain(opts.brainRadius),
    new THREE.MeshPhysicalMaterial({
      color: opts.brainColor,
      roughness: 0.4,
      metalness: 0.15,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
      emissive: new THREE.Color(opts.accent),
      emissiveIntensity: 0.6,
    })
  );
  brainMesh.scale.copy(brainScale);
  brainRoot.add(brainMesh);

  // Rim shell
  const rim = buildRimShell(opts.brainRadius, opts.accent);
  rim.scale.copy(brainScale);
  brainRoot.add(rim);

  // Inner glow
  const innerLight = new THREE.PointLight(opts.accent, 2.5, 4);
  brainRoot.add(innerLight);
  const innerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.3, 16, 12),
    new THREE.MeshBasicMaterial({
      color: opts.accent, transparent: true, opacity: 0.12,
    })
  );
  brainRoot.add(innerGlow);

  // Neural filaments
  const filaments = buildNeuralFilaments(opts.brainRadius, reduced ? 30 : 80);
  filaments.scale.copy(brainScale);
  brainRoot.add(filaments);

  // Neural particles
  const { mesh: particles, speeds: pSpeeds } = buildNeuralParticles(opts.brainRadius, reduced ? 20 : 60);
  particles.scale.copy(brainScale);
  brainRoot.add(particles);

  // ======== FLOATER ROOT (independent!) ========
  const floaterRoot = new THREE.Group();
  scene.add(floaterRoot);
  const floatingItems = [];

  function addFloater(obj, pos, opts2 = {}) {
    obj.position.copy(pos);
    floaterRoot.add(obj);
    floatingItems.push({
      obj,
      baseY: pos.y,
      amplitude: opts2.amp ?? (0.08 + Math.random() * 0.1),
      frequency: opts2.freq ?? (0.4 + Math.random() * 0.4),
      phase: Math.random() * Math.PI * 2,
    });
  }

  // Candlesticks
  const candleData = [
    { color: 0x22d3ee, h: 0.12, up: true },
    { color: 0xf87171, h: 0.08, up: false },
    { color: 0x22d3ee, h: 0.15, up: true },
    { color: 0xf87171, h: 0.10, up: false },
    { color: 0x22d3ee, h: 0.09, up: true },
  ];
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  candleData.forEach((cd, i) => {
    const candle = makeCandle(cd.color, cd.h);
    const y = 1 - (i / (candleData.length - 1)) * 2;
    const rAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const pos = new THREE.Vector3(
      Math.cos(theta) * rAtY * opts.haloRadius * 0.85,
      y * opts.haloRadius * 0.5,
      Math.sin(theta) * rAtY * opts.haloRadius * 0.85
    );
    addFloater(candle, pos);
  });

  // BTC coin
  const btc = makeCoin("₿", 0xf7931a);
  addFloater(btc, new THREE.Vector3(-1.8, 0.6, -0.5));

  // USDT coin
  const usdt = makeCoin("₮", 0x26a17b);
  addFloater(usdt, new THREE.Vector3(1.6, -0.4, 0.8));

  // Stat cards
  const stats = [
    { l: "SIGNAL", v: "+4.2%" },
    { l: "LATENCY", v: "4ms" },
    { l: "WIN RATE", v: "67.8%" },
    { l: "RISK", v: "کم" },
    { l: "NEURONS", v: "80" },
    { l: "ACTIVE", v: "●" },
    { l: "DEPTH", v: "5L" },
    { l: "FLOPS", v: "2.4T" },
  ];
  const cardCount = W > 768 ? stats.length : 5;
  stats.slice(0, cardCount).forEach((s, i) => {
    const card = makeStatCard(s.l, s.v);
    const y = 1 - (i / (cardCount - 1)) * 2;
    const rAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * (i + candleData.length);
    const pos = new THREE.Vector3(
      Math.cos(theta) * rAtY * opts.haloRadius,
      y * opts.haloRadius * 0.6,
      Math.sin(theta) * rAtY * opts.haloRadius
    );
    addFloater(card, pos);
  });

  // BTC/USDT ticker cards
  const btcCard = makeGlyphCard("₿");
  addFloater(btcCard, new THREE.Vector3(-2.0, 0.2, 0.3));
  const ethCard = makeGlyphCard("Ξ");
  addFloater(ethCard, new THREE.Vector3(2.1, -0.3, -0.2));

  // ======== POST-PROCESSING ========
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(W, H),
    reduced ? 0.3 : opts.bloomStrength,
    opts.bloomRadius,
    opts.bloomThreshold
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // ======== POINTER PARALLAX ========
  let mouseX = 0, mouseY = 0;
  function onPointerMove(e) {
    mouseX = (e.clientX / window.innerWidth - 0.5) * 2;
    mouseY = (e.clientY / window.innerHeight - 0.5) * 2;
  }
  window.addEventListener("pointermove", onPointerMove, { passive: true });

  // ======== ANIMATION ========
  const clock = new THREE.Clock();
  const rotSpeed = reduced
    ? THREE.MathUtils.degToRad(opts.rotationDegPerSec) * 0.2
    : THREE.MathUtils.degToRad(opts.rotationDegPerSec);
  const wobbleAmp = THREE.MathUtils.degToRad(opts.wobbleDeg) * (reduced ? 0.3 : 1);
  const bobScale = reduced ? 0.3 : 1;

  let rafId;
  function animate() {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1);
    const t = clock.getElapsedTime();

    // Brain rotation
    brainRoot.rotation.y += rotSpeed * dt;
    brainRoot.rotation.x = Math.sin((t * Math.PI * 2) / opts.wobblePeriod) * wobbleAmp;

    // Neural pulse
    const pulse = 0.5 + 0.5 * Math.sin((t * Math.PI * 2) / opts.pulsePeriod);
    brainMesh.material.emissiveIntensity = THREE.MathUtils.lerp(0.4, 1.0, pulse);
    innerLight.intensity = THREE.MathUtils.lerp(1.5, 3.5, pulse);
    innerGlow.material.opacity = THREE.MathUtils.lerp(0.08, 0.18, pulse);
    filaments.material.uniforms.time.value = t;

    // Neural particles orbit
    const pPos = particles.geometry.attributes.position;
    for (let i = 0; i < pSpeeds.length; i++) {
      const sp = pSpeeds[i];
      sp.theta += sp.speed * dt;
      const r = sp.r + Math.sin(t * 0.5 + sp.phase) * 0.03;
      pPos.array[i * 3] = r * Math.sin(sp.phi) * Math.cos(sp.theta);
      pPos.array[i * 3 + 1] = r * Math.cos(sp.phi);
      pPos.array[i * 3 + 2] = r * Math.sin(sp.phi) * Math.sin(sp.theta);
    }
    pPos.needsUpdate = true;

    // Floaters bob
    for (const it of floatingItems) {
      it.obj.position.y = it.baseY + Math.sin(t * it.frequency + it.phase) * it.amplitude * bobScale;
    }

    // Pointer parallax
    camera.position.x = THREE.MathUtils.lerp(camera.position.x, mouseX * opts.pointerParallax, 0.05);
    camera.position.y = THREE.MathUtils.lerp(camera.position.y, -mouseY * opts.pointerParallax, 0.05);
    camera.lookAt(0, 0, 0);

    // Render
    composer.render();
    labelRenderer.render(scene, camera);
  }
  animate();

  // ======== RESIZE (ResizeObserver) ========
  let resizeTimer;
  const ro = new ResizeObserver(() => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      const w = container.clientWidth || W;
      const h = container.clientHeight || H;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, reduced ? 1.5 : 2));
      labelRenderer.setSize(w, h);
      composer.setSize(w, h);
      bloomPass.setSize(w, h);
    }, 150);
  });
  ro.observe(container);

  // ======== INTERSECTION OBSERVER ========
  let visible = true;
  const io = new IntersectionObserver((e) => { visible = e[0].isIntersecting; });
  io.observe(container);

  // ======== DISPOSE ========
  return {
    dispose() {
      cancelAnimationFrame(rafId);
      ro.disconnect();
      io.disconnect();
      window.removeEventListener("pointermove", onPointerMove);
      renderer.dispose();
      if (renderer.domElement.parentNode) container.removeChild(renderer.domElement);
      if (labelRenderer.domElement.parentNode) container.removeChild(labelRenderer.domElement);
    },
  };
}
