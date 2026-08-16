/* IRAN COIN — AI Brain neural network canvas (rotating 3D projection) */
(function () {
  "use strict";

  const canvas = document.getElementById("brain-canvas");
  if (!canvas) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  let nodes = [], edges = [];
  let rotation = 0;
  let rafId = null;

  const NODE_COUNT = prefersReduced ? 40 : 90;
  const EDGE_DIST = 0.32;
  const RADIUS_F = 0.42;

  function randSphere() {
    // uniform distribution on sphere
    const u = Math.random() * 2 - 1;
    const phi = Math.random() * Math.PI * 2;
    const r = Math.sqrt(1 - u * u);
    return { x: r * Math.cos(phi), y: u, z: r * Math.sin(phi) };
  }

  function build() {
    nodes = [];
    edges = [];
    for (let i = 0; i < NODE_COUNT; i++) {
      const p = randSphere();
      const r = RADIUS_F * (0.75 + Math.random() * 0.45);
      const size = 1.2 + Math.random() * 2.6;
      const hue = Math.random();
      nodes.push({ x: p.x * r, y: p.y * r, z: p.z * r, size, hue, phase: Math.random() * Math.PI * 2 });
    }
    for (let i = 0; i < nodes.length; i++) {
      for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        const dx = a.x - b.x, dy = a.y - b.y, dz = a.z - b.z;
        if (dx * dx + dy * dy + dz * dz < EDGE_DIST * EDGE_DIST) {
          edges.push([i, j, Math.random()]);
        }
      }
    }
  }

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function project(x, y, z, rotY, rotX) {
    // rotate Y
    const cosY = Math.cos(rotY), sinY = Math.sin(rotY);
    const x1 = x * cosY + z * sinY;
    const z1 = -x * sinY + z * cosY;
    // rotate X
    const cosX = Math.cos(rotX), sinX = Math.sin(rotX);
    const y1 = y * cosX - z1 * sinX;
    const z2 = y * sinX + z1 * cosX;
    const scale = 1.15 / (1.45 + z2);
    return {
      x: W / 2 + x1 * W * 0.5 * scale,
      y: H / 2 + y1 * H * 0.5 * scale,
      z: z2,
      scale
    };
  }

  function palette(h) {
    if (h < 0.33) return [139, 92, 246];   // violet
    if (h < 0.66) return [59, 130, 246];   // blue
    return [34, 211, 238];                  // cyan
  }

  let t = 0;
  function draw(now) {
    t = now / 1000;
    rotation = prefersReduced ? 0.4 : t * 0.28;

    ctx.clearRect(0, 0, W, H);

    // inner glow
    const glow = ctx.createRadialGradient(W / 2, H / 2, 0, W / 2, H / 2, W * 0.55);
    glow.addColorStop(0, "rgba(167,139,250,0.22)");
    glow.addColorStop(1, "rgba(139,92,246,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, W, H);

    const tilt = 0.42;
    const pts = nodes.map((n, i) => {
      const pulse = 0.85 + 0.15 * Math.sin(t * 1.4 + n.phase);
      const p = project(n.x * pulse, n.y * pulse, n.z * pulse, rotation, tilt);
      p.idx = i;
      p.node = n;
      return p;
    });

    // edges (back to front)
    const sorted = pts.slice().sort((a, b) => b.z - a.z);
    ctx.lineWidth = 1;

    for (const e of edges) {
      const a = pts[e[0]], b = pts[e[1]];
      const alpha = (0.10 + 0.16 * e[2]) * Math.max(0, 0.55 - a.z * 0.15) * Math.max(0, 0.55 - b.z * 0.15);
      if (alpha <= 0.01) continue;
      const [r, g, bl] = palette(e[2]);
      ctx.strokeStyle = `rgba(${r},${g},${bl},${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.moveTo(a.x, a.y);
      ctx.lineTo(b.x, b.y);
      ctx.stroke();
    }

    // nodes
    for (const p of sorted) {
      const n = p.node;
      const [r, g, bl] = palette(n.hue);
      const depth = Math.max(0.15, 1 - Math.max(0, p.z) * 0.35);
      const size = n.size * p.scale * depth;
      const alpha = 0.5 + 0.5 * Math.sin(t * 2 + n.phase);
      ctx.fillStyle = `rgba(${r},${g},${bl},${(0.55 + 0.3 * alpha).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
      // bright core
      ctx.fillStyle = "rgba(255,255,255,0.85)";
      ctx.beginPath();
      ctx.arc(p.x, p.y, size * 0.32, 0, Math.PI * 2);
      ctx.fill();
    }

    // data streams: particles orbiting at sphere surface
    for (let i = 0; i < 26; i++) {
      const phase = t * (0.5 + (i % 5) * 0.12) + i * 2.399;
      const lat = Math.sin(i * 1.7) * 1.4;
      const y = Math.sin(lat) * RADIUS_F * 1.02;
      const rad = Math.cos(lat) * RADIUS_F * 1.02;
      const x = Math.cos(phase) * rad;
      const z = Math.sin(phase) * rad;
      const p = project(x, y, z, rotation, tilt);
      const [r, g, bl] = palette((i / 26) % 1);
      ctx.fillStyle = `rgba(${r},${g},${bl},0.75)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 1.6 * p.scale, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = requestAnimationFrame(draw);
  }

  function start() {
    build();
    resize();
    if (rafId) cancelAnimationFrame(rafId);
    draw(performance.now());
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 120);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();