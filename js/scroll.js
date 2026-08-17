/* IRANCOiN — Scroll engine: reveals, parallax, active states */
(function () {
  "use strict";

  const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- Reveal on scroll ---------- */
  const revealEls = document.querySelectorAll("[data-reveal]");
  if (revealEls.length && "IntersectionObserver" in window) {
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            io.unobserve(entry.target);
          }
        }
      },
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    revealEls.forEach((el, i) => {
      const base = parseFloat(el.dataset.revealDelay || "0");
      el.style.setProperty("--reveal-delay", `${base + (i % 5) * 70}ms`);
      io.observe(el);
    });
  } else {
    revealEls.forEach((el) => el.classList.add("is-visible"));
  }

  /* ---------- Parallax (subtle, layered depth) ---------- */
  if (!prefersReduced && "IntersectionObserver" in window) {
    const parallaxEls = document.querySelectorAll("[data-parallax]");
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            const speed = parseFloat(entry.target.dataset.parallax || "0.12");
            entry.target._speed = speed;
            entry.target._active = true;
          } else {
            entry.target._active = false;
          }
        }
      },
      { threshold: 0 }
    );
    parallaxEls.forEach((el) => io.observe(el));

    let ticking = false;
    window.addEventListener("scroll", () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        for (const el of parallaxEls) {
          if (!el._active) continue;
          const rect = el.getBoundingClientRect();
          const vh = window.innerHeight;
          const progress = (rect.top + rect.height / 2 - vh / 2) / vh;
          const y = progress * el._speed * 100;
          el.style.transform = `translate3d(0, ${y.toFixed(1)}px, 0)`;
        }
        ticking = false;
      });
    });
  }

  /* ---------- Navbar scroll state ---------- */
  const nav = document.querySelector(".nav");
  if (nav) {
    const onScroll = () => nav.classList.toggle("is-scrolled", window.scrollY > 24);
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Scroll progress bar ---------- */
  const progressBar = document.querySelector("[data-scroll-progress]");
  if (progressBar) {
    const onScroll = () => {
      const h = document.documentElement;
      const max = h.scrollHeight - h.clientHeight;
      progressBar.style.width = `${max > 0 ? (h.scrollTop / max) * 100 : 0}%`;
    };
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- Active nav section highlighting ---------- */
  const navLinks = document.querySelectorAll(".nav-link[href^='#']");
  if (navLinks.length && "IntersectionObserver" in window) {
    const sections = [];
    navLinks.forEach((l) => {
      const id = l.getAttribute("href").slice(1);
      const s = document.getElementById(id);
      if (s) sections.push({ link: l, section: s });
    });
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            sections.forEach(({ link }) => {
              if (link.getAttribute("href") === `#${entry.target.id}`) {
                link.setAttribute("aria-current", "page");
              } else {
                link.removeAttribute("aria-current");
              }
            });
          }
        }
      },
      { rootMargin: "-40% 0px -55% 0px" }
    );
    sections.forEach(({ section }) => io.observe(section));
  }
})();