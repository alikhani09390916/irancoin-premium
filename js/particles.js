/* IRAN COIN — Ambient particles & data streams (hero + cta) */
(function () {
  "use strict";

  const canvas = document.getElementById("particles-canvas");
  if (!canvas) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const ctx = canvas.getContext("2d");
  let W = 0, H = 0, dpr = 1;
  let particles = [];
  let rafId = null;

  const COLORS = [
    [139, 92, 246],   // violet
    [59, 130, 246],   // blue
    [34, 211, 238],   // cyan
    [45, 212, 191],   // turquoise
    [16, 185, 129]    // emerald
  ];

  function resize() {
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    const rect = canvas.getBoundingClientRect();
    W = rect.width;
    H = rect.height;
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function spawn(count) {
    particles = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: 0.8 + Math.random() * 2.2,
        vx: (Math.random() - 0.5) * 0.28,
        vy: -0.08 - Math.random() * 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha: 0.15 + Math.random() * 0.5,
        tw: Math.random() * Math.PI * 2
      });
    }
  }

  function draw(now) {
    const t = now / 1000;
    ctx.clearRect(0, 0, W, H);

    for (const p of particles) {
      p.x += p.vx;
      p.y += p.vy;
      if (p.y < -10) { p.y = H + 10; p.x = Math.random() * W; }
      if (p.x < -10) p.x = W + 10;
      if (p.x > W + 10) p.x = -10;

      const twinkle = 0.65 + 0.35 * Math.sin(t * 1.6 + p.tw);
      const [r, g, b] = p.color;
      ctx.fillStyle = `rgba(${r},${g},${b},${(p.alpha * twinkle).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();

      // soft halo
      ctx.fillStyle = `rgba(${r},${g},${b},${(p.alpha * 0.18 * twinkle).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3.2, 0, Math.PI * 2);
      ctx.fill();
    }

    rafId = requestAnimationFrame(draw);
  }

  function start() {
    resize();
    const count = prefersReduced ? 12 : Math.min(90, Math.floor((W * H) / 22000));
    spawn(count);
    if (rafId) cancelAnimationFrame(rafId);
    draw(performance.now());
  }

  let resizeTimer;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(start, 160);
  });

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start);
  } else {
    start();
  }
})();