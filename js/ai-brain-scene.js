/**
 * ai-brain-scene.js
 * ------------------------------------------------------------------
 * A complete, self-contained "AI Core" 3D scene: a continuously
 * rotating, physically-shaded, glowing brain with an independent
 * floating halo of candle glyphs / stat cards around it.
 *
 * This is a finished implementation, not a prompt. Do not rewrite its
 * internals — if something looks wrong when integrated, report the
 * exact symptom instead of regenerating this file.
 *
 * USAGE
 * -----
 *   import { initAICoreBrain } from "./ai-brain-scene.js";
 *
 *   const handle = initAICoreBrain(document.getElementById("ai-core-stage"), {
 *     items: [
 *       { type: "glyph", glyph: "₿" },
 *       { type: "stat",  label: "SIGNAL", value: "+4.2%" },
 *       // ...
 *     ],
 *   });
 *
 *   // later, if the section is ever removed from the DOM:
 *   handle.dispose();
 *
 * Requires an import map in the host HTML page mapping "three" and
 * "three/addons/" to a CDN build — see brain-preview.html for the
 * exact snippet.
 * ------------------------------------------------------------------
 */

import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";

// ---- tunable defaults (see 03_DESIGN_SPEC.md for the reasoning) --------
const DEFAULTS = {
  accentColor: 0x7c3aed,
  rotationPeriodSeconds: 26, // one full 360° turn every N seconds
  pulsePeriodSeconds: 2.5,
  wobbleDeg: 2,
  wobblePeriodSeconds: 10,
  bloomStrength: 0.75,
  bloomRadius: 0.4,
  bloomThreshold: 0.15,
  brainRadius: 1.15,
  haloRadius: 2.15,
  items: [], // [{ type: "glyph", glyph }] or [{ type: "stat", label, value }]
  respectReducedMotion: true,
};

function prefersReducedMotion() {
  return (
    typeof window !== "undefined" &&
    window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

// ---- deterministic "brain fold" displacement (no external noise lib) ---
// Sums a few low/medium-frequency sine waves in 3D so the surface gets an
// organic, non-repeating wrinkle pattern without needing a noise library.
function foldDisplacement(nx, ny, nz) {
  const x = nx * 2.2, y = ny * 2.2, z = nz * 2.2;
  let n = 0;
  n += Math.sin(x * 3.1 + Math.cos(y * 2.3) * 1.5) * 0.5;
  n += Math.sin(y * 4.7 + Math.cos(z * 3.9) * 1.2) * 0.35;
  n += Math.sin(z * 5.3 + Math.cos(x * 4.1) * 1.7) * 0.25;
  n += Math.sin((x + y + z) * 7.9) * 0.15;
  // flatten the displacement near the x=0 plane so the mesh reads as two
  // rounded hemisphere lobes with a visible central groove between them
  const groove = Math.min(1, Math.abs(nx) * 2.4);
  return n * 0.09 * groove + n * 0.02 * (1 - groove);
}

function buildBrainGeometry(radius) {
  const geo = new THREE.IcosahedronGeometry(radius, 5); // ~20k tris, smooth folds
  const pos = geo.attributes.position;
  const v = new THREE.Vector3();
  const dir = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    v.fromBufferAttribute(pos, i);
    dir.copy(v).normalize();
    const d = foldDisplacement(dir.x, dir.y, dir.z);
    v.addScaledVector(dir, d * radius);
    pos.setXYZ(i, v.x, v.y, v.z);
  }
  pos.needsUpdate = true;
  geo.computeVertexNormals();
  return geo;
}

// thin additive shell rendered with a fresnel term -> glowing rim light,
// independent of the base material so it always reads even when the key
// light is dim
function buildRimShell(radius, color) {
  const geo = new THREE.IcosahedronGeometry(radius * 1.05, 4);
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
        vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
        vViewDir = normalize(-mvPosition.xyz);
        gl_Position = projectionMatrix * mvPosition;
      }
    `,
    fragmentShader: `
      uniform vec3 color;
      uniform float power;
      uniform float intensity;
      varying vec3 vNormal;
      varying vec3 vViewDir;
      void main() {
        float fresnel = pow(1.0 - max(dot(normalize(vNormal), normalize(vViewDir)), 0.0), power);
        gl_FragColor = vec4(color * intensity, fresnel);
      }
    `,
    transparent: true,
    depthWrite: false,
    blending: THREE.AdditiveBlending,
    side: THREE.FrontSide,
  });
  return new THREE.Mesh(geo, mat);
}

function makeCardElement(item) {
  const el = document.createElement("div");
  if (item.type === "glyph") {
    el.className = "ai-core-float-glyph";
    el.textContent = item.glyph;
  } else {
    el.className = "ai-core-float-card";
    el.innerHTML =
      `<div class="ai-core-float-label">${item.label}</div>` +
      `<div class="ai-core-float-value">${item.value}</div>`;
  }
  return el;
}

/**
 * Initializes the scene inside `container` (must be a positioned block
 * element with a non-zero width/height — e.g. `position: relative` +
 * `min-height: 420px` in CSS).
 */
export function initAICoreBrain(container, userOptions = {}) {
  const opts = { ...DEFAULTS, ...userOptions };
  const reduced = opts.respectReducedMotion && prefersReducedMotion();

  const width = container.clientWidth || 600;
  const height = container.clientHeight || 480;

  if (!container.style.position) container.style.position = "relative";

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
  camera.position.set(0, 0, 5.2);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setSize(width, height);
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;
  renderer.domElement.style.position = "absolute";
  renderer.domElement.style.inset = "0";
  renderer.domElement.style.zIndex = "1";
  container.appendChild(renderer.domElement);

  // CSS2D overlay: real DOM text for candle/stat labels, always faces
  // the camera by construction (screen-space projection of a 3D point)
  const labelRenderer = new CSS2DRenderer();
  labelRenderer.setSize(width, height);
  labelRenderer.domElement.style.position = "absolute";
  labelRenderer.domElement.style.inset = "0";
  labelRenderer.domElement.style.zIndex = "2";
  labelRenderer.domElement.style.pointerEvents = "none";
  container.appendChild(labelRenderer.domElement);

  // ---- lights ----
  scene.add(new THREE.HemisphereLight(0xaeb8ff, 0x0b0b14, 0.55));
  const key = new THREE.DirectionalLight(0xffffff, 1.1);
  key.position.set(3, 4, 5);
  scene.add(key);
  const rimLight = new THREE.DirectionalLight(opts.accentColor, 1.1);
  rimLight.position.set(-4, -2, -3);
  scene.add(rimLight);

  // ---- brain group: ALL rotation happens on this group, nothing else ----
  const brainGroup = new THREE.Group();
  scene.add(brainGroup);

  const brainScale = new THREE.Vector3(1, 0.94, 1.08); // subtle oval, less "sphere"

  const brainMesh = new THREE.Mesh(
    buildBrainGeometry(opts.brainRadius),
    new THREE.MeshPhysicalMaterial({
      color: 0x1c1830,
      roughness: 0.4,
      metalness: 0.15,
      clearcoat: 0.4,
      clearcoatRoughness: 0.3,
      emissive: new THREE.Color(opts.accentColor),
      emissiveIntensity: 0.7,
    })
  );
  brainMesh.scale.copy(brainScale);
  brainGroup.add(brainMesh);

  const rimShell = buildRimShell(opts.brainRadius, opts.accentColor);
  rimShell.scale.copy(brainScale);
  brainGroup.add(rimShell);

  const innerLight = new THREE.PointLight(opts.accentColor, 2, 4);
  brainGroup.add(innerLight);

  // ---- floating halo: sibling of brainGroup, NEVER a child of it ----
  const floatingGroup = new THREE.Group();
  scene.add(floatingGroup);
  const floatingItems = [];

  const count = opts.items.length;
  const goldenAngle = Math.PI * (3 - Math.sqrt(5));
  opts.items.forEach((item, i) => {
    const y = count > 1 ? 1 - (i / (count - 1)) * 2 : 0;
    const radiusAtY = Math.sqrt(Math.max(0, 1 - y * y));
    const theta = goldenAngle * i;
    const basePos = new THREE.Vector3(
      Math.cos(theta) * radiusAtY * opts.haloRadius,
      y * opts.haloRadius * 0.7,
      Math.sin(theta) * radiusAtY * opts.haloRadius
    );
    const obj = new CSS2DObject(makeCardElement(item));
    obj.position.copy(basePos);
    floatingGroup.add(obj);
    floatingItems.push({
      obj,
      baseY: basePos.y,
      amplitude: THREE.MathUtils.randFloat(0.08, 0.16),
      frequency: THREE.MathUtils.randFloat(0.4, 0.8),
      phase: Math.random() * Math.PI * 2,
    });
  });

  // ---- post-processing (bloom glow) ----
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(width, height),
    opts.bloomStrength,
    opts.bloomRadius,
    opts.bloomThreshold
  );
  composer.addPass(bloomPass);
  composer.addPass(new OutputPass());

  // ---- animation loop ----
  const clock = new THREE.Clock();
  const rotationSpeed = reduced
    ? (2 * Math.PI) / (opts.rotationPeriodSeconds * 6)
    : (2 * Math.PI) / opts.rotationPeriodSeconds;
  const wobbleAmp =
    THREE.MathUtils.degToRad(opts.wobbleDeg) * (reduced ? 0.3 : 1);
  const bobScale = reduced ? 0.3 : 1;

  let rafId;
  function animate() {
    rafId = requestAnimationFrame(animate);
    const dt = Math.min(clock.getDelta(), 0.1); // guard against tab-switch spikes
    const t = clock.getElapsedTime();

    // brain: constant, infinite, delta-time-based rotation — never eased/stopped
    brainGroup.rotation.y += rotationSpeed * dt;
    brainGroup.rotation.x =
      Math.sin((t * 2 * Math.PI) / opts.wobblePeriodSeconds) * wobbleAmp;

    const pulse = 0.5 + 0.5 * Math.sin((t * 2 * Math.PI) / opts.pulsePeriodSeconds);
    brainMesh.material.emissiveIntensity = THREE.MathUtils.lerp(0.5, 1.2, pulse);
    innerLight.intensity = THREE.MathUtils.lerp(1.2, 2.6, pulse);

    // floating halo: independent bob; billboarding is automatic (CSS2DObject)
    for (const it of floatingItems) {
      it.obj.position.y = it.baseY + Math.sin(t * it.frequency + it.phase) * it.amplitude * bobScale;
    }

    composer.render();
    labelRenderer.render(scene, camera);
  }
  animate();

  function onResize() {
    const w = container.clientWidth || width;
    const h = container.clientHeight || height;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    labelRenderer.setSize(w, h);
    composer.setSize(w, h);
    bloomPass.setSize(w, h);
  }
  window.addEventListener("resize", onResize);

  return {
    scene,
    camera,
    renderer,
    dispose() {
      cancelAnimationFrame(rafId);
      window.removeEventListener("resize", onResize);
      renderer.dispose();
      if (renderer.domElement.parentNode === container) container.removeChild(renderer.domElement);
      if (labelRenderer.domElement.parentNode === container) container.removeChild(labelRenderer.domElement);
    },
  };
}
