/**
 * ai-core.js — v2
 * ------------------------------------------------------------------
 * Zero-dependency "AI Core" hero visual:
 *
 *   1. A glowing particle/neural sphere that rotates continuously
 *      around its own vertical axis — the trading brain itself.
 *   2. Three tilted orbit rings around that sphere, each carrying one
 *      traveling satellite node. Each ring is a *separate* specialized
 *      AI agent working around the core brain:
 *        - "market"  (violet) — market / signal analysis AI
 *        - "risk"    (rose)   — risk-management AI
 *        - "capital" (teal)   — capital / position-sizing AI
 *      This gives the rotating sphere literal meaning instead of being
 *      a decorative ball: the brain analyzes, and three independent
 *      agents orbiting it handle strategy, risk and capital.
 *
 * No CDN, no WebGL, no three.js — one <canvas>, one script.
 *
 * USAGE
 * -----
 *   <div class="ai-core-stage" id="ai-core-stage">
 *     <canvas id="ai-core-canvas"></canvas>
 *   </div>
 *   <script src="./assets/js/ai-core.js"></script>
 *   <script>
 *     const core = new AICore(document.getElementById('ai-core-canvas'));
 *     core.getCenter(); // -> {x, y} in the canvas's own CSS pixel space,
 *                        // used by cables.js to anchor the data cables.
 *     // core.dispose() if the section is ever removed from the DOM
 *   </script>
 * ------------------------------------------------------------------
 */

(function (global) {
  "use strict";

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  function prefersReducedMotion() {
    return (
      typeof window !== "undefined" &&
      window.matchMedia &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    );
  }

  const ORBIT_RINGS = [
    // name        color(rgb)          radiusMul  tiltDeg  speed(rad/s, signed)  agent size
    { key: "market",  color: [124, 58, 237], radiusMul: 1.22, tiltDeg: 8,   speed: 0.42, size: 4.4 },
    { key: "risk",    color: [244, 63, 94],  radiusMul: 1.42, tiltDeg: -14, speed: -0.30, size: 3.8 },
    { key: "capital", color: [31, 191, 159], radiusMul: 1.62, tiltDeg: 22,  speed: 0.23, size: 4.0 },
  ];

  class AICore {
    constructor(canvas, userOptions) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");

      this.opts = Object.assign(
        {
          pointCount: 260,
          color: [124, 58, 237], // primary accent (violet, #7C3AED)
          color2: [46, 196, 255], // secondary accent (cyan) — every 5th point
          rotationPeriodSeconds: 26, // one full 360° turn every N seconds
          pulsePeriodSeconds: 2.5,
          wobbleDeg: 2,
          wobblePeriodSeconds: 10,
          neighborCount: 3,
          maxLineDist: 0.42, // in unit-sphere distance units
          sphereRadiusFrac: 0.27, // fraction of min(w,h) — leaves room for orbit rings
          showOrbits: true,
          respectReducedMotion: true,
        },
        userOptions || {}
      );

      this.reduced = this.opts.respectReducedMotion && prefersReducedMotion();

      this.points = this._makeFibonacciSphere(this.opts.pointCount);
      this.edges = this._computeEdges(
        this.points,
        this.opts.neighborCount,
        this.opts.maxLineDist
      );

      this.angleY = 0;
      this.angleX = 0;
      this.time = 0;
      this.orbitAngles = ORBIT_RINGS.map(() => Math.random() * Math.PI * 2);
      this._lastT = null;
      this._rafId = null;
      this._disposed = false;

      this._onResize = this._resize.bind(this);
      window.addEventListener("resize", this._onResize);
      this._resize();

      this._tick = this._tick.bind(this);
      this._rafId = requestAnimationFrame(this._tick);
    }

    // -- geometry (computed once, in normalized unit-sphere space) --

    _makeFibonacciSphere(n) {
      const pts = [];
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));
      for (let i = 0; i < n; i++) {
        const y = n > 1 ? 1 - (i / (n - 1)) * 2 : 0;
        const r = Math.sqrt(Math.max(0, 1 - y * y));
        const theta = goldenAngle * i;
        pts.push({ x: Math.cos(theta) * r, y, z: Math.sin(theta) * r });
      }
      return pts;
    }

    _computeEdges(points, k, maxDist) {
      const n = points.length;
      const raw = [];
      for (let i = 0; i < n; i++) {
        const dists = [];
        for (let j = 0; j < n; j++) {
          if (i === j) continue;
          const dx = points[i].x - points[j].x;
          const dy = points[i].y - points[j].y;
          const dz = points[i].z - points[j].z;
          const d = Math.sqrt(dx * dx + dy * dy + dz * dz);
          if (d <= maxDist) dists.push([d, j]);
        }
        dists.sort((a, b) => a[0] - b[0]);
        for (let m = 0; m < Math.min(k, dists.length); m++) {
          const j = dists[m][1];
          const key = i < j ? i + "_" + j : j + "_" + i;
          raw.push([i, j, key]);
        }
      }
      const seen = new Set();
      const edges = [];
      for (const [i, j, key] of raw) {
        if (seen.has(key)) continue;
        seen.add(key);
        edges.push([i, j]);
      }
      return edges;
    }

    // -- sizing --

    _resize() {
      const parent = this.canvas.parentElement || this.canvas;
      const rect = parent.getBoundingClientRect();
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      this.cssW = Math.max(1, rect.width);
      this.cssH = Math.max(1, rect.height);

      this.canvas.width = Math.round(this.cssW * dpr);
      this.canvas.height = Math.round(this.cssH * dpr);
      this.canvas.style.width = this.cssW + "px";
      this.canvas.style.height = this.cssH + "px";

      this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

      this.radiusPx = Math.min(this.cssW, this.cssH) * this.opts.sphereRadiusFrac;
      this.cx = this.cssW / 2;
      this.cy = this.cssH / 2;
    }

    /** Center point of the core, in the canvas's own CSS-pixel space.
     *  cables.js uses this (translated into page coordinates by the
     *  caller) to anchor the data cables at the exact core center. */
    getCenter() {
      return { x: this.cx, y: this.cy, radiusPx: this.radiusPx };
    }

    // -- per-frame math --

    _project(p) {
      const cosY = Math.cos(this.angleY);
      const sinY = Math.sin(this.angleY);
      const x1 = p.x * cosY + p.z * sinY;
      const z1 = -p.x * sinY + p.z * cosY;
      const y1 = p.y;

      const cosX = Math.cos(this.angleX);
      const sinX = Math.sin(this.angleX);
      const y2 = y1 * cosX - z1 * sinX;
      const z2 = y1 * sinX + z1 * cosX;

      const focal = 2.6;
      const scale = focal / (focal + z2);

      return {
        sx: this.cx + x1 * this.radiusPx * scale,
        sy: this.cy + y2 * this.radiusPx * scale,
        scale,
        z: z2,
      };
    }

    _tick(now) {
      if (this._disposed) return;
      if (this._lastT == null) this._lastT = now;
      const dt = Math.min((now - this._lastT) / 1000, 0.1);
      this._lastT = now;
      this.time += dt;

      const slow = this.reduced ? 6 : 1;

      const rotationSpeed = (2 * Math.PI) / (this.opts.rotationPeriodSeconds * slow);
      this.angleY += rotationSpeed * dt;

      const wobbleAmp = (Math.PI / 180) * this.opts.wobbleDeg * (this.reduced ? 0.3 : 1);
      this.angleX =
        Math.sin((this.time * 2 * Math.PI) / this.opts.wobblePeriodSeconds) * wobbleAmp;

      for (let i = 0; i < ORBIT_RINGS.length; i++) {
        this.orbitAngles[i] += (ORBIT_RINGS[i].speed / slow) * dt;
      }

      this._draw();
      this._rafId = requestAnimationFrame(this._tick);
    }

    _drawOrbitRings(pulse) {
      if (!this.opts.showOrbits) return;
      const ctx = this.ctx;
      for (let i = 0; i < ORBIT_RINGS.length; i++) {
        const ring = ORBIT_RINGS[i];
        const [r, g, b] = ring.color;
        const rx = this.radiusPx * ring.radiusMul;
        const ry = rx * Math.cos((ring.tiltDeg * Math.PI) / 180) * 0.42;
        const rot = (ring.tiltDeg * Math.PI) / 180 * 0.6;

        ctx.save();
        ctx.translate(this.cx, this.cy);
        ctx.rotate(rot);
        ctx.beginPath();
        ctx.ellipse(0, 0, rx, Math.max(6, Math.abs(ry)), 0, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${r},${g},${b},${0.16 + pulse * 0.08})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        // traveling satellite node for this AI agent
        const a = this.orbitAngles[i];
        const sx = Math.cos(a) * rx;
        const sy = Math.sin(a) * Math.max(6, Math.abs(ry));
        const depth = (Math.sin(a) + 1) / 2; // 0..1, used for a subtle front/back fade
        const alpha = 0.55 + depth * 0.45;
        const size = ring.size * (0.75 + depth * 0.5);

        ctx.beginPath();
        ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`;
        ctx.shadowColor = `rgba(${r},${g},${b},0.9)`;
        ctx.shadowBlur = 8;
        ctx.arc(sx, sy, size, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 0;
        ctx.restore();
      }
    }

    _draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.cssW, this.cssH);

      const projected = this.points.map((p) => this._project(p));
      const pulse =
        0.5 + 0.5 * Math.sin((this.time * 2 * Math.PI) / this.opts.pulsePeriodSeconds);

      // central energy-core glow (the "brain")
      const [r1, g1, b1] = this.opts.color;
      const coreGrad = ctx.createRadialGradient(
        this.cx, this.cy, 0,
        this.cx, this.cy, this.radiusPx * 0.95
      );
      coreGrad.addColorStop(0, `rgba(${r1},${g1},${b1},${0.26 + pulse * 0.16})`);
      coreGrad.addColorStop(1, `rgba(${r1},${g1},${b1},0)`);
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, this.cssW, this.cssH);

      // orbit rings (the three specialized AI agents) — behind the sphere
      this._drawOrbitRings(pulse);

      // connecting lines (neural network look), faded by depth
      ctx.lineWidth = 1;
      for (const [i, j] of this.edges) {
        const a = projected[i];
        const b = projected[j];
        const depth = (a.scale + b.scale) / 2;
        const alpha = clamp((depth - 0.7) / 0.5, 0, 1) * 0.35 * (0.6 + pulse * 0.4);
        if (alpha <= 0.02) continue;
        ctx.strokeStyle = `rgba(${r1},${g1},${b1},${alpha})`;
        ctx.beginPath();
        ctx.moveTo(a.sx, a.sy);
        ctx.lineTo(b.sx, b.sy);
        ctx.stroke();
      }

      // particles, back-to-front (painter's algorithm)
      const order = projected.map((_, i) => i).sort((a, b) => projected[a].z - projected[b].z);
      const [r2, g2, b2] = this.opts.color2;
      for (const idx of order) {
        const p = projected[idx];
        const size = Math.max(0.6, 2.6 * p.scale);
        const alpha = clamp((p.scale - 0.7) / 0.8, 0.14, 1);
        const useColor2 = idx % 5 === 0;
        const rc = useColor2 ? r2 : r1;
        const gc = useColor2 ? g2 : g1;
        const bc = useColor2 ? b2 : b1;

        ctx.beginPath();
        ctx.fillStyle = `rgba(${rc},${gc},${bc},${alpha})`;
        ctx.shadowColor = `rgba(${rc},${gc},${bc},0.85)`;
        ctx.shadowBlur = 6 * p.scale;
        ctx.arc(p.sx, p.sy, size, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.shadowBlur = 0;
    }

    dispose() {
      this._disposed = true;
      if (this._rafId) cancelAnimationFrame(this._rafId);
      window.removeEventListener("resize", this._onResize);
    }
  }

  global.AICore = AICore;
})(typeof window !== "undefined" ? window : this);
