/* IRAN COIN — Animated counters (stats reveal) */
(function () {
  "use strict";

  const els = document.querySelectorAll("[data-count]");
  if (!els.length) return;

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function formatValue(el, value) {
    const dec = parseInt(el.dataset.decimals || "0", 10);
    const prefix = el.dataset.prefix || "";
    const suffix = el.dataset.suffix || "";
    const group = el.dataset.group !== "false";
    let str = value.toFixed(dec);
    if (group) {
      const [int, frac] = str.split(".");
      const grouped = int.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
      str = frac !== undefined ? `${grouped}.${frac}` : grouped;
    }
    return prefix + str + suffix;
  }

  function animate(el) {
    const target = parseFloat(el.dataset.count);
    const dur = parseInt(el.dataset.duration || "1800", 10);
    const start = performance.now();

    if (prefersReduced) {
      el.textContent = formatValue(el, target);
      return;
    }

    function tick(now) {
      const p = Math.min(1, (now - start) / dur);
      const eased = 1 - Math.pow(1 - p, 3);
      el.textContent = formatValue(el, target * eased);
      if (p < 1) requestAnimationFrame(tick);
      else el.textContent = formatValue(el, target);
    }
    requestAnimationFrame(tick);
  }

  if ("IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            animate(entry.target);
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.4 }
    );
    els.forEach((el) => io.observe(el));
  } else {
    els.forEach((el) => el.textContent = formatValue(el, parseFloat(el.dataset.count)));
  }
})();