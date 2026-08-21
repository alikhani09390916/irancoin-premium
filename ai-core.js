/**
 * ai-core.js
 * ------------------------------------------------------------------
 * A self-contained, zero-dependency "AI Core" hero visual: a glowing
 * particle/neural sphere that rotates continuously around its own
 * vertical axis, with a pulsing energy core and connecting lines
 * between nearby particles (the "luxury AI product" look — the same
 * family of visual used by many 2025/2026 AI/fintech hero sections).
 *
 * Deliberately NOT an anatomical 3D brain: pixel-accurate anatomical
 * detail requires a real sculpted 3D asset (see README.md for where
 * to source one). This is a fully procedural, always-correct
 * alternative that needs no external model, no WebGL, and no CDN —
 * just this one <canvas> and this one script.
 *
 * USAGE
 * -----
 *   <div class="ai-core-stage" id="ai-core-stage">
 *     <canvas id="ai-core-canvas"></canvas>
 *   </div>
 *
 *   <script src="./ai-core.js"></script>
 *   <script>
 *     const core = new AICore(document.getElementById('ai-core-canvas'));
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

  class AICore {
    constructor(canvas, userOptions) {
      this.canvas = canvas;
      this.ctx = canvas.getContext("2d");

      this.opts = Object.assign(
        {
          pointCount: 300,
          color: [124, 58, 237], // primary accent (violet, #7C3AED)
          color2: [46, 196, 255], // secondary accent (cyan) — every 5th point
          rotationPeriodSeconds: 26, // one full 360° turn every N seconds
          pulsePeriodSeconds: 2.5,
          wobbleDeg: 2,
          wobblePeriodSeconds: 10,
          neighborCount: 3,
          maxLineDist: 0.42, // in unit-sphere distance units
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
      this.ringAngle1 = 0;
      this.ringAngle2 = 0;
      this.time = 0;
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

      this.radiusPx = Math.min(this.cssW, this.cssH) * 0.34;
      this.cx = this.cssW / 2;
      this.cy = this.cssH / 2;
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

      const rotationSpeed = this.reduced
        ? (2 * Math.PI) / (this.opts.rotationPeriodSeconds * 6)
        : (2 * Math.PI) / this.opts.rotationPeriodSeconds;
      this.angleY += rotationSpeed * dt;

      const wobbleAmp =
        (Math.PI / 180) * this.opts.wobbleDeg * (this.reduced ? 0.3 : 1);
      this.angleX =
        Math.sin((this.time * 2 * Math.PI) / this.opts.wobblePeriodSeconds) *
        wobbleAmp;

      // independent slow orbital rings — reinforce the "AI reactor core"
      // feel; deliberately not tied to the main sphere's rotation speed
      const ringSpeed = this.reduced ? 0.15 : 1;
      this.ringAngle1 += ((2 * Math.PI) / 42) * dt * ringSpeed;
      this.ringAngle2 -= ((2 * Math.PI) / 58) * dt * ringSpeed;

      this._draw();
      this._rafId = requestAnimationFrame(this._tick);
    }

    _draw() {
      const ctx = this.ctx;
      ctx.clearRect(0, 0, this.cssW, this.cssH);

      const projected = this.points.map((p) => this._project(p));
      const pulse =
        0.5 + 0.5 * Math.sin((this.time * 2 * Math.PI) / this.opts.pulsePeriodSeconds);

      // central energy-core glow (soft ambient halo)
      const [r1, g1, b1] = this.opts.color;
      const coreGrad = ctx.createRadialGradient(
        this.cx,
        this.cy,
        0,
        this.cx,
        this.cy,
        this.radiusPx * 0.95
      );
      coreGrad.addColorStop(0, `rgba(${r1},${g1},${b1},${0.26 + pulse * 0.16})`);
      coreGrad.addColorStop(1, `rgba(${r1},${g1},${b1},0)`);
      ctx.fillStyle = coreGrad;
      ctx.fillRect(0, 0, this.cssW, this.cssH);

      // dashed orbital rings — reads as "reactor core" / trading-engine HUD
      this._drawRings(pulse);

      // small bright core ball at dead-center — the "AI core" itself
      // (the HTML brand wordmark sits visually on top of this, in CSS)
      const ballR = this.radiusPx * (0.15 + pulse * 0.025);
      const ballGrad = ctx.createRadialGradient(this.cx, this.cy, 0, this.cx, this.cy, ballR);
      ballGrad.addColorStop(0, `rgba(255,255,255,0.95)`);
      ballGrad.addColorStop(0.4, `rgba(${r1},${g1},${b1},0.9)`);
      ballGrad.addColorStop(1, `rgba(${r1},${g1},${b1},0)`);
      ctx.fillStyle = ballGrad;
      ctx.beginPath();
      ctx.arc(this.cx, this.cy, ballR, 0, Math.PI * 2);
      ctx.fill();

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

    _drawRings(pulse) {
      const ctx = this.ctx;
      const [r1, g1, b1] = this.opts.color;
      const [r2, g2, b2] = this.opts.color2;
      const rings = [
        { rx: 1.32, ry: 0.3, angle: this.ringAngle1, color: [r1, g1, b1], dash: [10, 8], width: 1.4, alpha: 0.45 },
        { rx: 1.55, ry: 0.2, angle: this.ringAngle2, color: [r2, g2, b2], dash: [3, 9], width: 1.1, alpha: 0.35 },
      ];
      for (const cfg of rings) {
        ctx.save();
        ctx.translate(this.cx, this.cy);
        ctx.rotate(cfg.angle);
        ctx.setLineDash(cfg.dash);
        ctx.lineDashOffset = -this.time * 40;
        ctx.strokeStyle = `rgba(${cfg.color[0]},${cfg.color[1]},${cfg.color[2]},${cfg.alpha * (0.6 + pulse * 0.4)})`;
        ctx.lineWidth = cfg.width;
        ctx.beginPath();
        ctx.ellipse(0, 0, this.radiusPx * cfg.rx, this.radiusPx * cfg.ry, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
      ctx.setLineDash([]);
    }

    dispose() {
      this._disposed = true;
      if (this._rafId) cancelAnimationFrame(this._rafId);
      window.removeEventListener("resize", this._onResize);
    }
  }

  global.AICore = AICore;
})(typeof window !== "undefined" ? window : this);
