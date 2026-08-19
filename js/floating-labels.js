/**
 * floating-labels.js — IRANCOiN Floating Console Labels v2
 * ========================================================
 * Labels drift freely inside the hero-visual container.
 * - NEVER leave the display (strict boundary enforcement)
 * - NO overlapping (intelligent collision avoidance)
 * - Smooth, visible motion with premium feel
 * - Smart path correction near edges
 */

(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ============================================================
  // DEFAULT LABELS
  // ============================================================
  var DEFAULT_LABELS = [
    { id: "fl-signal",   text: "SIGNAL +4.2%",  icon: '<i class="fa-solid fa-chart-line"></i>', color: "#a78bfa", bg: "rgba(124,58,237,0.15)", border: "rgba(124,58,237,0.35)" },
    { id: "fl-speed",    text: "LATENCY 4ms",   icon: '<i class="fa-solid fa-bolt"></i>', color: "#22d3ee", bg: "rgba(34,211,238,0.15)",  border: "rgba(34,211,238,0.35)" },
    { id: "fl-winrate",  text: "WIN RATE 67.8%", icon: '<i class="fa-solid fa-bullseye"></i>', color: "#34d399", bg: "rgba(52,211,153,0.15)",  border: "rgba(52,211,153,0.35)" },
    { id: "fl-uptime",   text: "UPTIME 99.97%",  icon: '<i class="fa-solid fa-circle-check"></i>',  color: "#eab308", bg: "rgba(234,179,8,0.15)",   border: "rgba(234,179,8,0.35)" },
  ];

  // ============================================================
  // LABEL ELEMENT
  // ============================================================
  function createLabelEl(cfg) {
    var el = document.createElement("div");
    el.className = "floating-label";
    el.setAttribute("aria-label", cfg.text);
    el.innerHTML = '<span class="fl-icon">' + (cfg.icon || "") + '</span><span class="fl-text">' + cfg.text + '</span>';
    el.style.setProperty("--fl-color", cfg.color || "#a78bfa");
    el.style.setProperty("--fl-bg", cfg.bg || "rgba(124,58,237,0.15)");
    el.style.setProperty("--fl-border", cfg.border || "rgba(124,58,237,0.35)");
    return el;
  }

  // ============================================================
  // STATE
  // ============================================================
  var labels = [];
  var container = null;
  var cRect = null;
  var animId = null;
  var lastT = 0;

  // ============================================================
  // INIT
  // ============================================================
  function init(selector) {
    container = document.querySelector(selector || "#hero-visual");
    if (!container) return;

    var pos = getComputedStyle(container).position;
    if (pos === "static") container.style.position = "relative";

    DEFAULT_LABELS.forEach(function (cfg) {
      var el = createLabelEl(cfg);
      container.appendChild(el);
      labels.push({
        id: cfg.id, el: el, cfg: cfg,
        x: 0, y: 0,
        w: el.offsetWidth || 100, h: el.offsetHeight || 28,
        angle: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4,
        radius: 25 + Math.random() * 40,
        phase: Math.random() * Math.PI * 2,
        bobAmp: 5 + Math.random() * 8,
        bobFreq: 0.2 + Math.random() * 0.3,
        bobPhase: Math.random() * Math.PI * 2,
        wanderTimer: 0,
        wanderInterval: 4 + Math.random() * 6,
        // Velocity for smooth steering
        vx: 0, vy: 0,
      });
    });

    updateRect();
    scatter();
    measureAll();
    enforceBounds();
    resolveAll();
    labels.forEach(applyPos);
    lastT = performance.now();
    if (!reduced) animate();

    // Recalculate on resize
    window.addEventListener("resize", function () {
      updateRect();
      enforceBounds();
      resolveAll();
      labels.forEach(applyPos);
    });
  }

  // ============================================================
  // HELPERS
  // ============================================================
  function updateRect() {
    cRect = container.getBoundingClientRect();
  }

  function measureAll() {
    labels.forEach(function (l) {
      l.w = l.el.offsetWidth || 100;
      l.h = l.el.offsetHeight || 28;
    });
  }

  /** Scatter labels avoiding the center zone (brain/cards area) */
  function scatter() {
    if (!cRect || !cRect.width) return;
    var W = cRect.width, H = cRect.height;
    var pad = 15;

    labels.forEach(function (l) {
      var x, y, tries = 0;
      do {
        x = pad + Math.random() * (W - l.w - pad * 2);
        y = pad + Math.random() * (H - l.h - pad * 2);
        tries++;
      } while (tries < 50 && isCenterZone(x, y, l.w, l.h, W, H));

      l.x = x;
      l.y = y;
    });
  }

  function isCenterZone(x, y, w, h, W, H) {
    var cx = x + w / 2, cy = y + h / 2;
    // Center 35% of the viewport is reserved for brain/coins
    return Math.abs(cx - W / 2) < W * 0.2 && Math.abs(cy - H / 2) < H * 0.2;
  }

  function applyPos(l) {
    l.el.style.transform = "translate(" + l.x.toFixed(1) + "px," + l.y.toFixed(1) + "px)";
  }

  // ============================================================
  // COLLISION RESOLUTION — strict, no overlapping
  // ============================================================
  function resolveAll() {
    if (!cRect) return;
    var pad = 8;
    var tolerance = 10;
    for (var iter = 0; iter < 20; iter++) {
      var settled = true;
      for (var i = 0; i < labels.length; i++) {
        for (var j = i + 1; j < labels.length; j++) {
          var a = labels[i], b = labels[j];
          var ax = a.x + a.w / 2, ay = a.y + a.h / 2;
          var bx = b.x + b.w / 2, by = b.y + b.h / 2;
          var overlapX = (a.w / 2 + b.w / 2 + pad + tolerance) - Math.abs(ax - bx);
          var overlapY = (a.h / 2 + b.h / 2 + pad + tolerance) - Math.abs(ay - by);
          if (overlapX > 0 && overlapY > 0) {
            settled = false;
            var pushX = overlapX / 2 * (ax < bx ? -1 : 1);
            var pushY = overlapY / 2 * (ay < by ? -1 : 1);
            if (overlapX < overlapY) {
              a.x += pushX; b.x -= pushX;
            } else {
              a.y += pushY; b.y -= pushY;
            }
          }
        }
      }
      enforceBounds();
      if (settled) break;
    }
  }

  /** STRICT boundary enforcement — labels NEVER leave the container */
  function enforceBounds() {
    if (!cRect) return;
    var W = cRect.width, H = cRect.height, pad = 10;
    labels.forEach(function (l) {
      // Clamp position — ensure entire label stays visible
      if (l.x < pad) l.x = pad;
      if (l.y < pad) l.y = pad;
      if (l.x + l.w > W - pad) l.x = W - l.w - pad;
      if (l.y + l.h > H - pad) l.y = H - l.h - pad;
      // Double-check dimensions
      if (l.w > W - pad * 2) l.x = pad;
      if (l.h > H - pad * 2) l.y = pad;
    });
  }

  // ============================================================
  // ANIMATION — smooth drift + bob + smart steering
  // ============================================================
  function animate() {
    var now = performance.now();
    var dt = Math.min((now - lastT) / 1000, 0.1);
    lastT = now;
    var t = now / 1000;
    var W = cRect.width, H = cRect.height;
    var pad = 12;

    // Safety margin — start turning before hitting edge
    var safeMargin = 60;

    labels.forEach(function (l) {
      // Wander — periodically nudge direction
      l.wanderTimer += dt;
      if (l.wanderTimer > l.wanderInterval) {
        l.wanderTimer = 0;
        l.angle += (Math.random() - 0.5) * 2.5;
        l.speed = 0.3 + Math.random() * 0.4;
        l.radius = 25 + Math.random() * 40;
      }

      // Drift
      l.angle += l.speed * dt;
      var dx = Math.cos(l.angle) * l.radius * dt;
      var dy = Math.sin(l.angle * 0.7 + l.phase) * l.radius * dt * 0.5;

      // Bob
      var bob = Math.sin(t * l.bobFreq * Math.PI * 2 + l.bobPhase) * l.bobAmp * dt;

      var nx = l.x + dx;
      var ny = l.y + dy + bob;

      // SMART BOUNDARY STEERING — turn away before hitting edges
      if (nx < pad + safeMargin) {
        l.angle = Math.PI * 0.3 + Math.random() * 0.4; // steer right
        nx = pad;
      } else if (nx > W - l.w - pad - safeMargin) {
        l.angle = Math.PI * 0.7 + Math.random() * 0.4; // steer left
        nx = W - l.w - pad;
      }

      if (ny < pad + safeMargin) {
        l.angle = Math.PI * 0.5 + Math.random() * 0.4; // steer down
        ny = pad;
      } else if (ny > H - l.h - pad - safeMargin) {
        l.angle = -Math.PI * 0.5 + Math.random() * 0.4; // steer up
        ny = H - l.h - pad;
      }

      // Final hard clamp (never escape)
      nx = Math.max(pad, Math.min(W - l.w - pad, nx));
      ny = Math.max(pad, Math.min(H - l.h - pad, ny));

      l.x = nx;
      l.y = ny;
      applyPos(l);
    });

    // Resolve collisions every few frames
    if (Math.floor(t * 10) % 4 === 0) {
      resolveAll();
      labels.forEach(applyPos);
    }

    animId = requestAnimationFrame(animate);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  window.FloatingLabels = {
    init: init,
    add: function (cfg) {
      if (!container) return null;
      var el = createLabelEl(cfg);
      container.appendChild(el);
      var l = {
        id: cfg.id, el: el, cfg: cfg,
        x: 0, y: 0,
        w: el.offsetWidth || 100, h: el.offsetHeight || 28,
        angle: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.4,
        radius: 25 + Math.random() * 40,
        phase: Math.random() * Math.PI * 2,
        bobAmp: 5 + Math.random() * 8,
        bobFreq: 0.2 + Math.random() * 0.3,
        bobPhase: Math.random() * Math.PI * 2,
        wanderTimer: 0,
        wanderInterval: 4 + Math.random() * 6,
        vx: 0, vy: 0,
      };
      labels.push(l);
      updateRect();
      l.x = Math.random() * (cRect.width - l.w - 30) + 15;
      l.y = Math.random() * (cRect.height - l.h - 30) + 15;
      applyPos(l);
      resolveAll();
      labels.forEach(applyPos);
      return l;
    },
    remove: function (id) {
      for (var i = labels.length - 1; i >= 0; i--) {
        if (labels[i].id === id) {
          labels[i].el.remove();
          labels.splice(i, 1);
          return;
        }
      }
    },
    updateText: function (id, text) {
      labels.forEach(function (l) {
        if (l.id === id) {
          l.cfg.text = text;
          var textEl = l.el.querySelector(".fl-text");
          if (textEl) textEl.textContent = text;
          l.w = l.el.offsetWidth || 100;
          l.h = l.el.offsetHeight || 28;
        }
      });
    },
    destroy: function () {
      if (animId) cancelAnimationFrame(animId);
      labels.forEach(function (l) { l.el.remove(); });
      labels = [];
    },
  };

  document.addEventListener("DOMContentLoaded", function () {
    init("#hero-visual");
  });
})();
