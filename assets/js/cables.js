/**
 * cables.js
 * ------------------------------------------------------------------
 * Draws the glowing "data cables" (SVG, zero dependency) that visually
 * connect the AI core to each floating stat card — the request being
 * "cables/tubes carrying each capability out to its own display".
 *
 * Deliberately decoupled from ai-core.js: it only needs (a) an element
 * that marks the exact core center, (b) the cards to connect to, and
 * (c) an <svg> to draw into. No shared state, nothing to desync.
 *
 * USAGE
 * -----
 *   <div class="hero-visual" id="hero-visual">
 *     <svg class="cable-layer"></svg>
 *     <div class="ai-core-stage">
 *       <canvas></canvas>
 *       <div class="core-badge">...</div>   <-- marks the core center
 *     </div>
 *     <div class="ai-core-card" data-cable="market">...</div>
 *     ...
 *   </div>
 *   <script src="./assets/js/cables.js"></script>
 *   <script>
 *     const cables = initCables({
 *       container: document.getElementById('hero-visual'),
 *     });
 *     // cables.dispose() if the section is ever removed from the DOM
 *   </script>
 * ------------------------------------------------------------------
 */

(function (global) {
  "use strict";

  const CABLE_COLORS = {
    market: "124,58,237", // violet — AI market/signal analysis
    profit: "31,191,159", // teal — realized PnL
    risk: "244,63,94", // rose — risk-management AI
    growth: "46,196,255", // cyan — user growth
    system: "124,58,237", // violet — uptime / bot status
  };

  function edgeAnchor(rect, fromX, fromY) {
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const dx = fromX - cx;
    const dy = fromY - cy;
    if (dx === 0 && dy === 0) return { x: cx, y: cy };
    const halfW = rect.width / 2 + 2;
    const halfH = rect.height / 2 + 2;
    const scaleX = dx !== 0 ? halfW / Math.abs(dx) : Infinity;
    const scaleY = dy !== 0 ? halfH / Math.abs(dy) : Infinity;
    const scale = Math.min(scaleX, scaleY, 1e6);
    return { x: cx + dx * scale, y: cy + dy * scale };
  }

  function buildPath(x1, y1, x2, y2) {
    const dx = x2 - x1;
    const dy = y2 - y1;
    const dist = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / dist;
    const ny = dx / dist;
    const bend = dist * 0.16 * (y2 < y1 ? -1 : 1);
    const c1x = x1 + dx * 0.35 + nx * bend;
    const c1y = y1 + dy * 0.35 + ny * bend;
    const c2x = x1 + dx * 0.68 + nx * bend;
    const c2y = y1 + dy * 0.68 + ny * bend;
    return `M ${x1.toFixed(1)} ${y1.toFixed(1)} C ${c1x.toFixed(1)} ${c1y.toFixed(1)}, ${c2x.toFixed(1)} ${c2y.toFixed(1)}, ${x2.toFixed(1)} ${y2.toFixed(1)}`;
  }

  const SVG_NS = "http://www.w3.org/2000/svg";

  function initCables(userOptions) {
    const opts = Object.assign(
      {
        container: null,
        coreSelector: ".core-badge",
        svgSelector: ".cable-layer",
        cardSelector: "[data-cable]",
        pulseDuration: "2.6s",
      },
      userOptions || {}
    );

    const container = opts.container;
    if (!container) return { dispose() {} };
    const svg = container.querySelector(opts.svgSelector);
    const core = container.querySelector(opts.coreSelector);
    if (!svg || !core) return { dispose() {} };

    const reduced =
      window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function recompute() {
      const cRect = container.getBoundingClientRect();
      const coreRect = core.getBoundingClientRect();
      const coreX = coreRect.left + coreRect.width / 2 - cRect.left;
      const coreY = coreRect.top + coreRect.height / 2 - cRect.top;

      svg.setAttribute("width", cRect.width);
      svg.setAttribute("height", cRect.height);
      svg.setAttribute("viewBox", `0 0 ${cRect.width} ${cRect.height}`);
      while (svg.firstChild) svg.removeChild(svg.firstChild);

      const cards = container.querySelectorAll(opts.cardSelector);
      cards.forEach((card, i) => {
        const rect = card.getBoundingClientRect();
        const localRect = {
          left: rect.left - cRect.left,
          top: rect.top - cRect.top,
          width: rect.width,
          height: rect.height,
        };
        const anchor = edgeAnchor(localRect, coreX, coreY);
        const d = buildPath(coreX, coreY, anchor.x, anchor.y);
        const key = card.getAttribute("data-cable");
        const rgb = CABLE_COLORS[key] || CABLE_COLORS.market;

        const glow = document.createElementNS(SVG_NS, "path");
        glow.setAttribute("d", d);
        glow.setAttribute("class", "cable cable-glow");
        glow.setAttribute("stroke", `rgba(${rgb},0.16)`);
        svg.appendChild(glow);

        const line = document.createElementNS(SVG_NS, "path");
        line.setAttribute("d", d);
        line.setAttribute("class", "cable cable-line");
        line.setAttribute("stroke", `rgba(${rgb},0.6)`);
        svg.appendChild(line);

        if (!reduced) {
          const dot = document.createElementNS(SVG_NS, "circle");
          dot.setAttribute("r", "3.4");
          dot.setAttribute("class", "cable-pulse");
          dot.setAttribute("fill", `rgb(${rgb})`);
          dot.style.color = `rgb(${rgb})`;

          const anim = document.createElementNS(SVG_NS, "animateMotion");
          anim.setAttribute("dur", opts.pulseDuration);
          anim.setAttribute("repeatCount", "indefinite");
          anim.setAttribute("path", d);
          anim.setAttribute("begin", `${(i * 0.35).toFixed(2)}s`);
          anim.setAttribute("keyPoints", "0;1");
          anim.setAttribute("keyTimes", "0;1");

          dot.appendChild(anim);
          svg.appendChild(dot);
        }
      });
    }

    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(() => recompute());
      ro.observe(container);
    }
    let resizeRaf = 0;
    const debouncedRecompute = () => {
      cancelAnimationFrame(resizeRaf);
      resizeRaf = requestAnimationFrame(recompute);
    };
    window.addEventListener("resize", debouncedRecompute);
    // layout can still be settling (fonts, card content) right after load
    const settleTimer = setTimeout(recompute, 250);
    recompute();

    return {
      recompute,
      dispose() {
        clearTimeout(settleTimer);
        cancelAnimationFrame(resizeRaf);
        window.removeEventListener("resize", debouncedRecompute);
        if (ro) ro.disconnect();
      },
    };
  }

  global.initCables = initCables;
})(typeof window !== "undefined" ? window : this);
