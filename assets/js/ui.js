/**
 * ui.js — small shared behaviors used on all three pages.
 * Zero dependencies. Safe to include even on pages that don't use
 * every helper (each one no-ops if its markup isn't present).
 */
(function () {
  "use strict";

  const mql = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  let reduced = mql ? mql.matches : false;
  if (mql && mql.addEventListener) {
    mql.addEventListener("change", (e) => { reduced = e.matches; });
  }

  const driftTimers = [];
  window.addEventListener("beforeunload", () => driftTimers.forEach(clearInterval));

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
      { threshold: 0.1, rootMargin: "0px 0px -10% 0px" }
    );
    els.forEach((el) => io.observe(el));
  }

  // ---- slow "live" ticking for a counter that keeps drifting upward
  function initLiveDrift() {
    document.querySelectorAll("[data-live-drift]").forEach((el) => {
      if (reduced) return;
      const stepMin = parseInt(el.getAttribute("data-drift-min") || "1", 10);
      const stepMax = parseInt(el.getAttribute("data-drift-max") || "3", 10);
      const intervalMs = parseInt(el.getAttribute("data-drift-interval") || "3200", 10);
      const id = setInterval(() => {
        const current = parseInt(el.textContent.replace(/[^\d]/g, ""), 10) || 0;
        const next = current + stepMin + Math.floor(Math.random() * (stepMax - stepMin + 1));
        const suffix = el.getAttribute("data-count-suffix") || "";
        el.textContent = next.toLocaleString("en-US") + suffix;
      }, intervalMs);
      driftTimers.push(id);
    });
  }

  // ---- mobile nav toggle with Escape key + focus management ----
  function initNavToggle() {
    const btn = document.querySelector(".nav-toggle");
    const links = document.querySelector(".nav-links");
    if (!btn || !links) return;
    btn.addEventListener("click", () => {
      const open = links.classList.toggle("is-open");
      btn.setAttribute("aria-expanded", open ? "true" : "false");
      if (open) {
        const firstLink = links.querySelector("a");
        if (firstLink) firstLink.focus();
      }
    });
    document.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && links.classList.contains("is-open")) {
        links.classList.remove("is-open");
        btn.setAttribute("aria-expanded", "false");
        btn.focus();
      }
    });
  }

  // ---- FAQ accordion with ARIA + arrow-key navigation ----
  function initFaq() {
    const items = document.querySelectorAll(".faq-item");
    if (!items.length) return;

    items.forEach((item, idx) => {
      const btn = item.querySelector(".faq-q");
      const panel = item.querySelector(".faq-a");
      if (!btn || !panel) return;

      const btnId = "faq-q-" + idx;
      const panelId = "faq-a-" + idx;
      btn.id = btnId;
      btn.setAttribute("aria-controls", panelId);
      btn.setAttribute("aria-expanded", item.classList.contains("is-open") ? "true" : "false");
      panel.id = panelId;
      panel.setAttribute("role", "region");
      panel.setAttribute("aria-labelledby", btnId);

      btn.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");
        items.forEach((other) => {
          if (other !== item) {
            other.classList.remove("is-open");
            const otherBtn = other.querySelector(".faq-q");
            if (otherBtn) otherBtn.setAttribute("aria-expanded", "false");
          }
        });
        item.classList.toggle("is-open", !isOpen);
        btn.setAttribute("aria-expanded", !isOpen ? "true" : "false");
      });

      btn.addEventListener("keydown", (e) => {
        const btns = Array.from(items).map((it) => it.querySelector(".faq-q")).filter(Boolean);
        const i = btns.indexOf(btn);
        if (e.key === "ArrowDown" || e.key === "Down") {
          e.preventDefault();
          const next = btns[(i + 1) % btns.length];
          if (next) next.focus();
        } else if (e.key === "ArrowUp" || e.key === "Up") {
          e.preventDefault();
          const prev = btns[(i - 1 + btns.length) % btns.length];
          if (prev) prev.focus();
        } else if (e.key === "Home") {
          e.preventDefault();
          if (btns[0]) btns[0].focus();
        } else if (e.key === "End") {
          e.preventDefault();
          if (btns[btns.length - 1]) btns[btns.length - 1].focus();
        }
      });
    });
  }

  // ---- generic tab switcher with ARIA + arrow-key navigation ----
  function initTabs() {
    document.querySelectorAll(".tabs").forEach((group) => {
      const buttons = Array.from(group.querySelectorAll(".tab"));
      if (!buttons.length) return;

      group.setAttribute("role", "tablist");
      buttons.forEach((btn, i) => {
        btn.setAttribute("role", "tab");
        btn.setAttribute("aria-selected", btn.classList.contains("is-active") ? "true" : "false");
        if (!btn.id) btn.id = "tab-" + Math.random().toString(36).slice(2, 8) + "-" + i;
      });

      function activateTab(btn) {
        buttons.forEach((b) => {
          b.classList.remove("is-active");
          b.setAttribute("aria-selected", "false");
          b.setAttribute("tabindex", "-1");
        });
        btn.classList.add("is-active");
        btn.setAttribute("aria-selected", "true");
        btn.setAttribute("tabindex", "0");
        btn.focus();
        const target = btn.getAttribute("data-tab");
        const scope = group.closest("[data-tab-scope]") || document;
        scope.querySelectorAll("[data-tab-panel]").forEach((panel) => {
          const isTarget = panel.getAttribute("data-tab-panel") === target;
          panel.hidden = !isTarget;
          if (panel.hasAttribute("id")) {
            btn.setAttribute("aria-controls", panel.id);
            panel.setAttribute("role", "tabpanel");
            panel.setAttribute("aria-labelledby", btn.id);
          }
        });
      }

      buttons.forEach((btn) => {
        btn.addEventListener("click", () => activateTab(btn));
        btn.addEventListener("keydown", (e) => {
          const i = buttons.indexOf(btn);
          if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
            e.preventDefault();
            const dir = e.key === "ArrowRight" ? 1 : -1;
            const next = buttons[(i + dir + buttons.length) % buttons.length];
            if (next) activateTab(next);
          } else if (e.key === "Home") {
            e.preventDefault();
            activateTab(buttons[0]);
          } else if (e.key === "End") {
            e.preventDefault();
            activateTab(buttons[buttons.length - 1]);
          }
        });
      });

      buttons.forEach((btn) => {
        btn.setAttribute("tabindex", btn.classList.contains("is-active") ? "0" : "-1");
      });
    });
  }

  // ---- scroll reveal ----
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
