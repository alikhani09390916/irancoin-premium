/**
 * ai-core-connectors.js
 * ------------------------------------------------------------------
 * Draws animated glowing "data cable" SVG paths from the AI Core's
 * center (the brand hub) out to each floating card/coin, so the whole
 * visual reads as one connected trading-AI system instead of separate
 * floating pieces.
 *
 * Zero dependencies, pure DOM + SVG. Recomputes on resize so it stays
 * correct at any viewport size, and it finds its elements by
 * attribute, so markup order doesn't matter.
 *
 * USAGE
 * -----
 *   <div class="visual-wrap" id="visual-wrap">   <!-- container -->
 *     <div class="ai-core-logo" data-ai-core-hub>...</div>  <!-- hub -->
 *     <div class="ai-core-card" data-ai-core-connect>...</div>
 *     <div class="ai-core-coin" data-ai-core-connect>...</div>
 *     ...
 *   </div>
 *
 *   <script src="./ai-core-connectors.js"></script>
 *   <script>
 *     initAICoreConnectors(document.getElementById('visual-wrap'));
 *   </script>
 * ------------------------------------------------------------------
 */

(function (global) {
  "use strict";

  function clamp(x, a, b) {
    return Math.max(a, Math.min(b, x));
  }

  function initAICoreConnectors(container, userOptions) {
    const opts = Object.assign(
      { color1: "#7c3aed", color2: "#2ec4ff", speed: 0.006 },
      userOptions || {}
    );

    const hub = container.querySelector("[data-ai-core-hub]") || container;
    const targets = Array.prototype.slice.call(
      container.querySelectorAll("[data-ai-core-connect]")
    );

    if (!container.style.position) container.style.position = "relative";

    const svgNS = "http://www.w3.org/2000/svg";
    const svg = document.createElementNS(svgNS, "svg");
    svg.setAttribute("class", "ai-core-connectors");
    svg.style.position = "absolute";
    svg.style.inset = "0";
    svg.style.width = "100%";
    svg.style.height = "100%";
    svg.style.zIndex = "2";
    svg.style.pointerEvents = "none";
    container.appendChild(svg);

    const uid = "aiCoreCableGrad-" + Math.random().toString(36).slice(2, 8);
    const defs = document.createElementNS(svgNS, "defs");
    const grad = document.createElementNS(svgNS, "linearGradient");
    grad.setAttribute("id", uid);
    const stop1 = document.createElementNS(svgNS, "stop");
    stop1.setAttribute("offset", "0%");
    stop1.setAttribute("stop-color", opts.color1);
    stop1.setAttribute("stop-opacity", "0.85");
    const stop2 = document.createElementNS(svgNS, "stop");
    stop2.setAttribute("offset", "100%");
    stop2.setAttribute("stop-color", opts.color2);
    stop2.setAttribute("stop-opacity", "0.15");
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    const paths = targets.map((target, i) => {
      const path = document.createElementNS(svgNS, "path");
      path.setAttribute("class", "ai-core-cable");
      path.setAttribute("fill", "none");
      path.setAttribute("stroke", "url(#" + uid + ")");
      path.setAttribute("stroke-width", "1.6");
      path.setAttribute("stroke-linecap", "round");
      svg.appendChild(path);

      const pulse = document.createElementNS(svgNS, "circle");
      pulse.setAttribute("r", "3");
      pulse.setAttribute("fill", opts.color2);
      pulse.setAttribute("class", "ai-core-cable-pulse");
      svg.appendChild(pulse);

      return { target, path, pulse, phaseOffset: i / Math.max(1, targets.length), length: 0 };
    });

    function rectRelativeTo(el, containerRect) {
      const r = el.getBoundingClientRect();
      return {
        left: r.left - containerRect.left,
        top: r.top - containerRect.top,
        width: r.width,
        height: r.height,
        cx: r.left - containerRect.left + r.width / 2,
        cy: r.top - containerRect.top + r.height / 2,
      };
    }

    function layout() {
      const containerRect = container.getBoundingClientRect();
      if (containerRect.width < 1 || containerRect.height < 1) return;
      svg.setAttribute("viewBox", "0 0 " + containerRect.width + " " + containerRect.height);

      const hubRect = rectRelativeTo(hub, containerRect);
      const from = { x: hubRect.cx, y: hubRect.cy };

      paths.forEach((p) => {
        const tRect = rectRelativeTo(p.target, containerRect);
        const to = {
          x: clamp(from.x, tRect.left, tRect.left + tRect.width),
          y: clamp(from.y, tRect.top, tRect.top + tRect.height),
        };

        const midX = (from.x + to.x) / 2;
        const midY = (from.y + to.y) / 2;
        const dx = to.x - from.x;
        const dy = to.y - from.y;
        const dist = Math.hypot(dx, dy) || 1;
        const curveOffset = Math.min(60, dist * 0.22);
        const nx = -dy / dist;
        const ny = dx / dist;
        const cx1 = midX + nx * curveOffset;
        const cy1 = midY + ny * curveOffset;

        const d = "M " + from.x + " " + from.y + " Q " + cx1 + " " + cy1 + " " + to.x + " " + to.y;
        p.path.setAttribute("d", d);
        p.length = p.path.getTotalLength();
      });
    }

    let phase = 0;
    let rafId = null;
    function animate() {
      phase = (phase + opts.speed) % 1;
      for (const p of paths) {
        if (!p.length) continue;
        const t = (phase + p.phaseOffset) % 1;
        const pt = p.path.getPointAtLength(t * p.length);
        p.pulse.setAttribute("cx", pt.x);
        p.pulse.setAttribute("cy", pt.y);
      }
      rafId = requestAnimationFrame(animate);
    }

    layout();
    rafId = requestAnimationFrame(animate);

    let resizeTimer = null;
    function onResize() {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(layout, 80);
    }
    window.addEventListener("resize", onResize);

    return {
      relayout: layout,
      dispose() {
        cancelAnimationFrame(rafId);
        clearTimeout(resizeTimer);
        window.removeEventListener("resize", onResize);
        svg.remove();
      },
    };
  }

  global.initAICoreConnectors = initAICoreConnectors;
})(typeof window !== "undefined" ? window : this);
