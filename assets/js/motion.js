/**
 * motion.js — Unified motion architecture for IRANCOIN.
 * Provides scroll-triggered reveals, stagger groups, text reveals,
 * magnetic buttons, hover lift, parallax, and scroll progress.
 * Zero dependencies. Reads data-motion attributes for declarative usage.
 */
(function () {
  "use strict";

  // ---- Reduced motion check ----
  var mql = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)");
  var reduced = mql ? mql.matches : false;
  if (mql && mql.addEventListener) {
    mql.addEventListener("change", function (e) { reduced = e.matches; });
  }

  // ---- Utility: clamp ----
  function clamp(v, min, max) { return Math.min(Math.max(v, min), max); }

  // ---- Utility: debounce ----
  function debounce(fn, ms) {
    var t;
    return function () {
      clearTimeout(t);
      t = setTimeout(fn, ms);
    };
  }

  // ============================================================
  // 1. ScrollReveal — IntersectionObserver-based reveal
  // ============================================================
  function initScrollReveal() {
    var els = document.querySelectorAll("[data-motion]");
    if (!els.length) return;
    if (reduced || typeof IntersectionObserver === "undefined") {
      els.forEach(function (el) { el.classList.add("is-visible"); });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var el = entry.target;
            var delay = parseInt(el.getAttribute("data-motion-delay") || "0", 10);
            if (delay > 0) {
              setTimeout(function () { el.classList.add("is-visible"); }, delay);
            } else {
              el.classList.add("is-visible");
            }
            io.unobserve(el);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    els.forEach(function (el) { io.observe(el); });
  }

  // ============================================================
  // 2. StaggerGroup — staggered children reveal
  // ============================================================
  function initStaggerGroups() {
    var groups = document.querySelectorAll("[data-stagger]");
    if (!groups.length || reduced) {
      groups.forEach(function (g) {
        g.querySelectorAll("[data-motion]").forEach(function (c) {
          c.classList.add("is-visible");
        });
      });
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var children = entry.target.querySelectorAll("[data-motion]");
            var baseDelay = parseInt(entry.target.getAttribute("data-stagger-base") || "80", 10);
            children.forEach(function (child, i) {
              var d = parseInt(child.getAttribute("data-motion-delay") || "0", 10) + i * baseDelay;
              child.setAttribute("data-motion-delay", d);
            });
            // Re-trigger observer on children
            children.forEach(function (c) { c.classList.add("is-visible"); });
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    groups.forEach(function (g) { io.observe(g); });
  }

  // ============================================================
  // 3. NumberCounter — count-up with easing
  // ============================================================
  function animateCounter(el) {
    var to = parseFloat(el.getAttribute("data-count-to"));
    if (!Number.isFinite(to)) return;
    var suffix = el.getAttribute("data-count-suffix") || "";
    var rawDecimals = el.getAttribute("data-count-decimals");
    var decimals = rawDecimals ? (parseInt(rawDecimals, 10) || 0) : 0;
    var duration = reduced ? 0 : 1400;
    var start = performance.now();
    function frame(now) {
      var p = duration ? Math.min(1, (now - start) / duration) : 1;
      var eased = 1 - Math.pow(1 - p, 3);
      var val = to * eased;
      el.textContent = val.toLocaleString("en-US", {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }) + suffix;
      if (p < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
  }

  function initCounters() {
    var els = document.querySelectorAll("[data-count-to]");
    if (!els.length) return;
    if (typeof IntersectionObserver === "undefined") {
      els.forEach(animateCounter);
      return;
    }
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            animateCounter(entry.target);
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" }
    );
    els.forEach(function (el) { io.observe(el); });
  }

  // ============================================================
  // 4. MagneticButton — cursor-following magnetic pull
  // ============================================================
  function initMagneticButtons() {
    if (reduced) return;
    var btns = document.querySelectorAll(".btn-primary[data-magnetic]");
    btns.forEach(function (btn) {
      var strength = parseFloat(btn.getAttribute("data-magnetic") || "0.3");
      btn.addEventListener("mousemove", function (e) {
        var rect = btn.getBoundingClientRect();
        var x = e.clientX - rect.left - rect.width / 2;
        var y = e.clientY - rect.top - rect.height / 2;
        btn.style.transform = "translate(" + (x * strength) + "px, " + (y * strength) + "px)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.transform = "";
      });
    });
  }

  // ============================================================
  // 5. HoverLift — card lift + shadow on hover
  // ============================================================
  function initHoverLift() {
    var cards = document.querySelectorAll("[data-hover-lift]");
    cards.forEach(function (card) {
      card.addEventListener("mouseenter", function () {
        card.style.transform = "translateY(-4px)";
        card.style.boxShadow = "var(--shadow-xl)";
      });
      card.addEventListener("mouseleave", function () {
        card.style.transform = "";
        card.style.boxShadow = "";
      });
    });
  }

  // ============================================================
  // 6. ParallaxLayer — scroll-linked translateY offset
  // ============================================================
  function initParallax() {
    if (reduced) return;
    var layers = document.querySelectorAll("[data-parallax]");
    if (!layers.length) return;
    var ticking = false;
    function update() {
      var scrollY = window.pageYOffset;
      layers.forEach(function (layer) {
        var speed = parseFloat(layer.getAttribute("data-parallax") || "0.1");
        var rect = layer.getBoundingClientRect();
        var offset = (rect.top + scrollY - window.innerHeight / 2) * speed;
        layer.style.transform = "translateY(" + offset + "px)";
      });
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  // ============================================================
  // 7. ScrollProgress — thin progress bar at top
  // ============================================================
  function initScrollProgress() {
    var bar = document.querySelector("[data-scroll-progress]");
    if (!bar) return;
    var ticking = false;
    function update() {
      var scrollTop = window.pageYOffset;
      var docHeight = document.documentElement.scrollHeight - window.innerHeight;
      var progress = docHeight > 0 ? clamp(scrollTop / docHeight, 0, 1) : 0;
      bar.style.transform = "scaleX(" + progress + ")";
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  // ============================================================
  // 8. Header scroll state
  // ============================================================
  function initHeaderScroll() {
    var nav = document.querySelector(".site-nav");
    if (!nav) return;
    var ticking = false;
    function update() {
      if (window.pageYOffset > 40) {
        nav.classList.add("is-scrolled");
      } else {
        nav.classList.remove("is-scrolled");
      }
      ticking = false;
    }
    window.addEventListener("scroll", function () {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    }, { passive: true });
  }

  // ============================================================
  // 9. TextReveal — character-by-character mask reveal
  // ============================================================
  function initTextReveal() {
    if (reduced) return;
    var els = document.querySelectorAll("[data-text-reveal]");
    els.forEach(function (el) {
      var text = el.textContent;
      el.textContent = "";
      el.setAttribute("aria-label", text);
      el.style.opacity = "1";
      var chars = text.split("");
      chars.forEach(function (ch, i) {
        var span = document.createElement("span");
        span.textContent = ch === " " ? "\u00A0" : ch;
        span.style.display = "inline-block";
        span.style.opacity = "0";
        span.style.transform = "translateY(10px)";
        span.style.transition = "opacity 0.4s ease " + (i * 0.03) + "s, transform 0.4s ease " + (i * 0.03) + "s";
        el.appendChild(span);
      });
    });
    // Trigger reveal on scroll
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            var spans = entry.target.querySelectorAll("span");
            spans.forEach(function (s) {
              s.style.opacity = "1";
              s.style.transform = "translateY(0)";
            });
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.2 }
    );
    els.forEach(function (el) { io.observe(el); });
  }

  // ============================================================
  // 10. SectionDivider — animated line between sections
  // ============================================================
  function initSectionDividers() {
    if (reduced) return;
    var dividers = document.querySelectorAll(".section-divider");
    dividers.forEach(function (d) {
      d.style.transform = "scaleX(0)";
      d.style.transition = "transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)";
    });
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.style.transform = "scaleX(1)";
            io.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.5 }
    );
    dividers.forEach(function (d) { io.observe(d); });
  }

  // ============================================================
  // Init all motion systems
  // ============================================================
  document.addEventListener("DOMContentLoaded", function () {
    initScrollReveal();
    initStaggerGroups();
    initCounters();
    initMagneticButtons();
    initHoverLift();
    initParallax();
    initScrollProgress();
    initHeaderScroll();
    initTextReveal();
    initSectionDividers();
  });
})();
