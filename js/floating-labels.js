/**
 * floating-labels.js — IRANCOiN Floating Console Labels
 * =======================================================
 * Labels drift freely inside the hero-visual container.
 * - Never leave the display
 * - Small overlaps allowed
 * - Collision avoidance for major overlaps
 * - Smooth, visible motion
 */

(function () {
  "use strict";

  var reduced = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ============================================================
  // DEFAULT LABELS
  // ============================================================
  var DEFAULT_LABELS = [
    { id: "fl-signal",   text: "SIGNAL +4.2%",  icon: "📊", color: "#a78bfa", bg: "rgba(124,58,237,0.15)", border: "rgba(124,58,237,0.35)" },
    { id: "fl-speed",    text: "LATENCY 4ms",   icon: "⚡", color: "#22d3ee", bg: "rgba(34,211,238,0.15)",  border: "rgba(34,211,238,0.35)" },
    { id: "fl-winrate",  text: "WIN RATE 67.8%", icon: "🎯", color: "#34d399", bg: "rgba(52,211,153,0.15)",  border: "rgba(52,211,153,0.35)" },
    { id: "fl-uptime",   text: "UPTIME 99.97%",  icon: "●",  color: "#eab308", bg: "rgba(234,179,8,0.15)",   border: "rgba(234,179,8,0.35)" },
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

    // Ensure container is positioning context
    var pos = getComputedStyle(container).position;
    if (pos === "static") container.style.position = "relative";

    DEFAULT_LABELS.forEach(function (cfg) {
      var el = createLabelEl(cfg);
      container.appendChild(el);
      labels.push({
        id: cfg.id,
        el: el,
        cfg: cfg,
        x: 0, y: 0,
        w: el.offsetWidth || 100,
        h: el.offsetHeight || 28,
        // drift params — each label gets unique random values
        angle: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.6,       // radians/sec
        radius: 30 + Math.random() * 50,          // pixels of drift range
        phase: Math.random() * Math.PI * 2,
        // bob
        bobAmp: 6 + Math.random() * 10,           // pixels vertical bob
        bobFreq: 0.3 + Math.random() * 0.4,       // Hz
        bobPhase: Math.random() * Math.PI * 2,
        // wander — periodically change drift direction
        wanderTimer: 0,
        wanderInterval: 3 + Math.random() * 5,    // seconds between direction changes
      });
    });

    updateRect();
    scatter();
    measureAll();
    lastT = performance.now();
    if (!reduced) animate();
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

  /** Scatter labels across the container avoiding the center (AI cards zone) */
  function scatter() {
    if (!cRect || !cRect.width) return;
    var W = cRect.width, H = cRect.height;
    var pad = 12;

    labels.forEach(function (l, i) {
      var x, y, tries = 0;
      do {
        x = pad + Math.random() * (W - l.w - pad * 2);
        y = pad + Math.random() * (H - l.h - pad * 2);
        tries++;
      } while (tries < 30 && isCenterZone(x, y, l.w, l.h, W, H));

      l.x = x;
      l.y = y;
      applyPos(l);
    });

    resolveAll();
  }

  function isCenterZone(x, y, w, h, W, H) {
    var cx = x + w / 2, cy = y + h / 2;
    return Math.abs(cx - W / 2) < W * 0.18 && Math.abs(cy - H / 2) < H * 0.18;
  }

  function applyPos(l) {
    l.el.style.transform = "translate(" + l.x.toFixed(1) + "px," + l.y.toFixed(1) + "px)";
  }

  // ============================================================
  // COLLISION RESOLUTION — push overlapping labels apart
  // Small overlaps (< 15px) are tolerated
  // ============================================================
  function resolveAll() {
    if (!cRect) return;
    var pad = 6;
    var tolerance = 15; // small overlaps okay
    for (var iter = 0; iter < 15; iter++) {
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
    labels.forEach(applyPos);
  }

  function enforceBounds() {
    if (!cRect) return;
    var W = cRect.width, H = cRect.height, pad = 8;
    labels.forEach(function (l) {
      if (l.x < pad) l.x = pad;
      if (l.y < pad) l.y = pad;
      if (l.x > W - l.w - pad) l.x = W - l.w - pad;
      if (l.y > H - l.h - pad) l.y = H - l.h - pad;
    });
  }

  // ============================================================
  // ANIMATION — visible drift + bob
  // ============================================================
  function animate() {
    var now = performance.now();
    var dt = Math.min((now - lastT) / 1000, 0.1);
    lastT = now;
    var t = now / 1000;
    var W = cRect.width, H = cRect.height;
    var pad = 10;

    labels.forEach(function (l) {
      // Wander — periodically nudge drift angle
      l.wanderTimer += dt;
      if (l.wanderTimer > l.wanderInterval) {
        l.wanderTimer = 0;
        l.angle += (Math.random() - 0.5) * 2.0; // random direction change
        l.speed = 0.4 + Math.random() * 0.6;
        l.radius = 30 + Math.random() * 50;
      }

      // Drift
      l.angle += l.speed * dt;
      var dx = Math.cos(l.angle) * l.radius * dt;
      var dy = Math.sin(l.angle * 0.7 + l.phase) * l.radius * dt * 0.6;

      // Bob
      var bob = Math.sin(t * l.bobFreq * Math.PI * 2 + l.bobPhase) * l.bobAmp * dt;

      var nx = l.x + dx;
      var ny = l.y + dy + bob;

      // Bounce off walls — reverse direction
      if (nx < pad) { nx = pad; l.angle = Math.PI - l.angle; }
      else if (nx > W - l.w - pad) { nx = W - l.w - pad; l.angle = Math.PI - l.angle; }

      if (ny < pad) { ny = pad; l.angle = -l.angle; }
      else if (ny > H - l.h - pad) { ny = H - l.h - pad; l.angle = -l.angle; }

      l.x = nx;
      l.y = ny;
      applyPos(l);
    });

    // Occasional collision resolve
    if (Math.floor(t * 10) % 3 === 0) resolveAll();

    animId = requestAnimationFrame(animate);
  }

  // ============================================================
  // PUBLIC API
  // ============================================================
  window.FloatingLabels = {
    init: init,
    add: function (cfg) {
      var el = createLabelEl(cfg);
      container.appendChild(el);
      var l = {
        id: cfg.id, el: el, cfg: cfg,
        x: 0, y: 0,
        w: el.offsetWidth || 100, h: el.offsetHeight || 28,
        angle: Math.random() * Math.PI * 2,
        speed: 0.4 + Math.random() * 0.6,
        radius: 30 + Math.random() * 50,
        phase: Math.random() * Math.PI * 2,
        bobAmp: 6 + Math.random() * 10,
        bobFreq: 0.3 + Math.random() * 0.4,
        bobPhase: Math.random() * Math.PI * 2,
        wanderTimer: 0,
        wanderInterval: 3 + Math.random() * 5,
      };
      labels.push(l);
      updateRect();
      l.x = Math.random() * (cRect.width - l.w - 24) + 12;
      l.y = Math.random() * (cRect.height - l.h - 24) + 12;
      applyPos(l);
      resolveAll();
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
          l.el.querySelector(".fl-text").textContent = text;
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
