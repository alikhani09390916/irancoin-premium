/**
 * floating-labels.js — IRANCOiN Floating Console Labels
 * =======================================================
 * Modular floating label system with:
 * - Collision avoidance (labels never overlap)
 * - Boundary constraints (stay inside container)
 * - Smooth, professional drift animation
 * - Responsive — works on mobile/tablet/laptop/desktop
 * - Reduced-motion safe
 *
 * Usage:
 *   FloatingLabels.init(containerSelector, labelsConfig)
 *   FloatingLabels.add(labelConfig)
 *   FloatingLabels.remove(id)
 *   FloatingLabels.updateText(id, newText)
 */

(function () {
  "use strict";

  const reduced = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  // ============================================================
  // DEFAULT LABEL CONFIGS
  // ============================================================
  const DEFAULT_LABELS = [
    {
      id: "fl-signal",
      text: "SIGNAL +4.2%",
      icon: "📊",
      color: "var(--c-violet-500)",
      bg: "rgba(124,58,237,0.12)",
      border: "rgba(124,58,237,0.3)",
    },
    {
      id: "fl-speed",
      text: "LATENCY 4ms",
      icon: "⚡",
      color: "var(--c-cyan-500)",
      bg: "rgba(34,211,238,0.12)",
      border: "rgba(34,211,238,0.3)",
    },
    {
      id: "fl-winrate",
      text: "WIN RATE 67.8%",
      icon: "🎯",
      color: "var(--c-emerald-500)",
      bg: "rgba(52,211,153,0.12)",
      border: "rgba(52,211,153,0.3)",
    },
    {
      id: "fl-uptime",
      text: "UPTIME 99.97%",
      icon: "●",
      color: "var(--c-gold-500)",
      bg: "rgba(234,179,8,0.12)",
      border: "rgba(234,179,8,0.3)",
    },
  ];

  // ============================================================
  // FLOATING LABEL CLASS
  // ============================================================
  class FloatingLabel {
    constructor(config, container) {
      this.id = config.id;
      this.container = container;
      this.config = config;

      // DOM
      this.el = document.createElement("div");
      this.el.className = "floating-label";
      this.el.setAttribute("role", "status");
      this.el.setAttribute("aria-label", config.text);
      this.el.innerHTML = `
        <span class="fl-icon">${config.icon || ""}</span>
        <span class="fl-text">${config.text}</span>
      `;
      this.el.style.setProperty("--fl-color", config.color || "var(--c-violet-500)");
      this.el.style.setProperty("--fl-bg", config.bg || "rgba(124,58,237,0.12)");
      this.el.style.setProperty("--fl-border", config.border || "rgba(124,58,237,0.3)");

      // Physics state
      this.x = 0;
      this.y = 0;
      this.vx = 0;
      this.vy = 0;
      this.targetX = 0;
      this.targetY = 0;
      this.driftAngle = Math.random() * Math.PI * 2;
      this.driftSpeed = 0.15 + Math.random() * 0.2;
      this.driftRadius = 8 + Math.random() * 12;
      this.driftPhase = Math.random() * Math.PI * 2;
      this.bobAmplitude = 2 + Math.random() * 4;
      this.bobFrequency = 0.3 + Math.random() * 0.3;
      this.bobPhase = Math.random() * Math.PI * 2;
      this.width = 0;
      this.height = 0;

      container.appendChild(this.el);
    }

    measure() {
      const rect = this.el.getBoundingClientRect();
      this.width = rect.width;
      this.height = rect.height;
    }

    setPosition(x, y) {
      this.x = x;
      this.y = y;
      this.el.style.transform = `translate(${x}px, ${y}px)`;
    }
  }

  // ============================================================
  // FLOATING LABELS SYSTEM
  // ============================================================
  const FloatingLabels = {
    labels: [],
    container: null,
    containerRect: null,
    animId: null,
    lastTime: 0,
    initialized: false,

    /**
     * Initialize the system
     * @param {string} containerSelector — CSS selector for hero-visual
     * @param {Array} [labelConfigs] — optional custom label configs
     */
    init(containerSelector, labelConfigs) {
      if (this.initialized) return;
      this.initialized = true;

      this.container = document.querySelector(containerSelector);
      if (!this.container) return;

      const configs = labelConfigs || DEFAULT_LABELS;

      // Create labels
      configs.forEach((cfg) => {
        const label = new FloatingLabel(cfg, this.container);
        this.labels.push(label);
      });

      // Initial layout
      this._updateContainerRect();
      this._distributeLabels();
      this.labels.forEach((l) => l.measure());

      // Start animation
      this.lastTime = performance.now();
      this._animate();

      // Observe resize
      if (window.ResizeObserver) {
        const ro = new ResizeObserver(() => {
          this._updateContainerRect();
          this._distributeLabels();
        });
        ro.observe(this.container);
      }
    },

    _updateContainerRect() {
      this.containerRect = this.container.getBoundingClientRect();
    },

    /**
     * Distribute labels in a grid pattern inside the container,
     * avoiding overlap with existing AI cards and coins
     */
    _distributeLabels() {
      const rect = this.containerRect;
      if (!rect || !rect.width) return;

      const pad = 16;
      const n = this.labels.length;
      if (n === 0) return;

      // Place labels in the empty quadrants (avoid center where brain was)
      // Use golden-angle distribution for natural spacing
      const goldenAngle = Math.PI * (3 - Math.sqrt(5));

      // Define safe zones — avoid center 40% where AI cards are
      const zones = [
        { x: 0.08, y: 0.12 },
        { x: 0.85, y: 0.15 },
        { x: 0.08, y: 0.82 },
        { x: 0.88, y: 0.78 },
      ];

      this.labels.forEach((label, i) => {
        const zone = zones[i % zones.length];
        const jitterX = (Math.random() - 0.5) * 0.08;
        const jitterY = (Math.random() - 0.5) * 0.08;
        const tx = (zone.x + jitterX) * rect.width;
        const ty = (zone.y + jitterY) * rect.height;

        // Clamp to boundaries
        label.x = Math.max(pad, Math.min(tx, rect.width - label.width - pad));
        label.y = Math.max(pad, Math.min(ty, rect.height - label.height - pad));
        label.setPosition(label.x, label.y);
      });

      // Run collision resolution
      this._resolveCollisions();
    },

    /**
     * Iterative collision resolution — push overlapping labels apart
     */
    _resolveCollisions() {
      const pad = 8;
      const iterations = 20;
      const rect = this.containerRect;

      for (let iter = 0; iter < iterations; iter++) {
        let settled = true;

        for (let i = 0; i < this.labels.length; i++) {
          for (let j = i + 1; j < this.labels.length; j++) {
            const a = this.labels[i];
            const b = this.labels[j];

            const overlapX = (a.width / 2 + b.width / 2 + pad) - Math.abs(a.x + a.width / 2 - (b.x + b.width / 2));
            const overlapY = (a.height / 2 + b.height / 2 + pad) - Math.abs(a.y + a.height / 2 - (b.y + b.height / 2));

            if (overlapX > 0 && overlapY > 0) {
              settled = false;
              // Push apart along the axis with less overlap
              if (overlapX < overlapY) {
                const push = overlapX / 2;
                const dir = a.x < b.x ? -1 : 1;
                a.x += dir * push;
                b.x -= dir * push;
              } else {
                const push = overlapY / 2;
                const dir = a.y < b.y ? -1 : 1;
                a.y += dir * push;
                b.y -= dir * push;
              }
            }
          }
        }

        // Enforce boundaries
        for (const label of this.labels) {
          label.x = Math.max(pad, Math.min(label.x, rect.width - label.width - pad));
          label.y = Math.max(pad, Math.min(label.y, rect.height - label.height - pad));
        }

        if (settled) break;
      }

      // Apply final positions
      for (const label of this.labels) {
        label.setPosition(label.x, label.y);
      }
    },

    /**
     * Animation loop — smooth drift with boundary enforcement
     */
    _animate() {
      const now = performance.now();
      const dt = Math.min((now - this.lastTime) / 1000, 0.1);
      this.lastTime = now;

      if (!reduced) {
        const rect = this.containerRect;
        const pad = 12;
        const t = now / 1000;

        for (const label of this.labels) {
          // Drift motion
          label.driftAngle += label.driftSpeed * dt;
          const driftX = Math.cos(label.driftAngle) * label.driftRadius * dt;
          const driftY = Math.sin(label.driftAngle * 0.7 + label.driftPhase) * label.driftRadius * dt;

          // Bob motion
          const bobY = Math.sin(t * label.bobFrequency + label.bobPhase) * label.bobAmplitude * dt;

          // Apply velocity
          let newX = label.x + driftX;
          let newY = label.y + driftY + bobY;

          // Boundary enforcement — smart direction change
          if (newX < pad) {
            newX = pad;
            label.driftAngle = Math.abs(label.driftAngle) + 0.5;
          } else if (newX > rect.width - label.width - pad) {
            newX = rect.width - label.width - pad;
            label.driftAngle = Math.PI - Math.abs(label.driftAngle) + 0.5;
          }

          if (newY < pad) {
            newY = pad;
            label.driftAngle = -label.driftAngle + 0.3;
          } else if (newY > rect.height - label.height - pad) {
            newY = rect.height - label.height - pad;
            label.driftAngle = -label.driftAngle + 0.3;
          }

          label.x = newX;
          label.y = newY;
          label.setPosition(newX, newY);
        }

        // Lightweight collision check every 10 frames
        if (Math.floor(t * 60) % 10 === 0) {
          this._resolveCollisions();
        }
      }

      this.animId = requestAnimationFrame(() => this._animate());
    },

    /**
     * Add a new label dynamically
     */
    add(config) {
      const label = new FloatingLabel(config, this.container);
      this.labels.push(label);
      this._updateContainerRect();
      label.measure();

      // Place at a random safe position
      const rect = this.containerRect;
      label.x = Math.random() * (rect.width - label.width - 32) + 16;
      label.y = Math.random() * (rect.height - label.height - 32) + 16;
      label.setPosition(label.x, label.y);
      this._resolveCollisions();

      return label;
    },

    /**
     * Remove a label by id
     */
    remove(id) {
      const idx = this.labels.findIndex((l) => l.id === id);
      if (idx === -1) return;
      const label = this.labels[idx];
      label.el.remove();
      this.labels.splice(idx, 1);
    },

    /**
     * Update text of a label
     */
    updateText(id, newText) {
      const label = this.labels.find((l) => l.id === id);
      if (!label) return;
      label.config.text = newText;
      label.el.querySelector(".fl-text").textContent = newText;
      label.el.setAttribute("aria-label", newText);
      label.measure();
      this._resolveCollisions();
    },

    /**
     * Destroy the system
     */
    destroy() {
      if (this.animId) cancelAnimationFrame(this.animId);
      this.labels.forEach((l) => l.el.remove());
      this.labels = [];
      this.initialized = false;
    },
  };

  // Expose globally
  window.FloatingLabels = FloatingLabels;

  // Auto-init on DOMContentLoaded
  document.addEventListener("DOMContentLoaded", () => {
    FloatingLabels.init("#hero-visual");
  });
})();
