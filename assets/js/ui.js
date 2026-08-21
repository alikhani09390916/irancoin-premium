/**
 * ui.js — small shared behaviors used on all three pages.
 * Zero dependencies. Safe to include even on pages that don't use
 * every helper (each one no-ops if its markup isn't present).
 */
(function () {
  "use strict";

  const reduced =
    window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // ---- animated counters: <span data-count-to="12840" data-count-suffix="+"> ----
  function animateCounter(el) {
    const to = parseFloat(el.getAttribute("data-count-to"));
    if (!Number.isFinite(to)) return;
    const suffix = el.getAttribute("data-count-suffix") || "";
    const rawDecimals = el.getAttribute("data-count-decimals");
    const decimals = rawDecimals ? (parseInt(rawDecimals, 10) || 0) : 0;
    const duration = reduced ? 0 : 1400;
    const start = performance.now();
    const from = 0;

    function frame(now) {
      const p = duration ? Math.min(1, (now - start) / duration) : 1;
      const eased = 1 - Math.pow(1 - p, 3);
      const val = from + (to - from) * eased;
      el.textContent = val.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    const els = document.querySelectorAll("[data-count-to]");
    if (!els.length) return;
    if (typeof IntersectionObserver === "undefined") {
      els.forEach(animateCounter);
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.4 }
    );
    els.forEach((el) => io.observe(el));
  }

  // ---- slow "live" ticking for a counter that keeps drifting upward
  // e.g. active-user count on the hero card ----
  function initLiveDrift() {
    document.querySelectorAll("[data-live-drift]").forEach((el) => {
      if (reduced) return;
      const stepMin = parseInt(el.getAttribute("data-drift-min") || "1", 10);
      const stepMax = parseInt(el.getAttribute("data-drift-max") || "3", 10);
      const intervalMs = parseInt(el.getAttribute("data-drift-interval") || "3200", 10);
      el._driftTimer = setInterval(() => {
        const current = parseInt(el.textContent.replace(/[^\d]/g, ""), 10) || 0;
        const next = current + stepMin + Math.floor(Math.random() * (stepMax - stepMin + 1));
        const suffix = el.getAttribute("data-count-suffix") || "";
        el.textContent = next.toLocaleString("en-US") + suffix;
      }, intervalMs);
    });
  }

  // ---- mobile nav toggle ----
  function initNavToggle() {
    const btn = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    if (!btn || !links) return;
    btn.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
    });
  }

  // ---- FAQ accordion: <div class="faq-item"><button class="faq-q">..</button><div class="faq-a">..</div></div> ----
  function initFaq() {
    document.querySelectorAll(".faq-item").forEach((item) => {
      const btn = item.querySelector(".faq-q");
      if (!btn) return;
      btn.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        item.parentElement
          .querySelectorAll(".faq-item.is-open")
          .forEach((el) => { if (el !== item) el.classList.remove("is-open"); });
        item.classList.toggle("is-open", !isOpen);
        btn.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      });
    });
  }

  // ---- generic tab switcher: <div class="tabs"><button class="tab" data-tab="week">..</button></div> + [data-tab-panel="week"] ----
  function initTabs() {
    document.querySelectorAll(".tabs").forEach((group) => {
      const buttons = group.querySelectorAll(".tab");
      buttons.forEach((btn) => {
        btn.addEventListener("click", () => {
          buttons.forEach((b) => b.classList.remove("is-active"));
          btn.classList.add("is-active");
          const target = btn.getAttribute("data-tab");
          const scope = group.closest("[data-tab-scope]") || document;
          scope.querySelectorAll("[data-tab-panel]").forEach((panel) => {
            panel.hidden = panel.getAttribute("data-tab-panel") !== target;
          });
        });
      });
    });
  }

  // ---- scroll reveal: <* class="reveal"> fades/slides up once in view ----
  function initReveal() {
    const els = document.querySelectorAll(".reveal");
    if (!els.length) return;
    if (reduced || typeof IntersectionObserver === "undefined") {
      els.forEach((el) => el.classList.add("is-visible"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15 }
    );
    els.forEach((el) => io.observe(el));
  }

  document.addEventListener("DOMContentLoaded", () => {
    initCounters();
    initLiveDrift();
    initNavToggle();
    initFaq();
    initTabs();
    initReveal();
  });
})();
