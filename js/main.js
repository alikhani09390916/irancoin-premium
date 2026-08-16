/* IRAN COIN — Main interaction engine */
(function () {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => Array.from(c.querySelectorAll(s));

  /* ---------- Mobile nav (always visible, no hamburger) ---------- */
  const navLinks = $(".nav-links");
  if (navLinks) {
    navLinks.addEventListener("click", (e) => {
      if (e.target.closest("a")) {
        document.body.style.overflow = "";
      }
    });
  }

  /* ---------- FAQ accordion ---------- */
  $$(".faq-item").forEach((item) => {
    const q = $(".faq-q", item);
    const a = $(".faq-a", item);
    if (!q || !a) return;
    q.addEventListener("click", () => {
      const open = item.classList.contains("is-open");
      $$(".faq-item.is-open").forEach((other) => {
        other.classList.remove("is-open");
        $(".faq-a", other).style.maxHeight = "0";
        $(".faq-q", other).setAttribute("aria-expanded", "false");
      });
      if (!open) {
        item.classList.add("is-open");
        a.style.maxHeight = `${a.scrollHeight}px`;
        q.setAttribute("aria-expanded", "true");
      }
    });
  });

  /* ---------- Billing toggle (pricing) ---------- */
  const billingBtns = $$(".billing-toggle button");
  const pricingPrices = $$("[data-price-monthly]");
  if (billingBtns.length && pricingPrices.length) {
    const setBilling = (period) => {
      billingBtns.forEach((b) => {
        const active = b.dataset.period === period;
        b.classList.toggle("is-active", active);
        b.setAttribute("aria-pressed", String(active));
      });
      pricingPrices.forEach((el) => {
        const monthly = parseFloat(el.dataset.priceMonthly);
        const annual = parseFloat(el.dataset.priceAnnual);
        const value = period === "annual" ? annual : monthly;
        el.textContent = new Intl.NumberFormat("en-US").format(value);
        el.dataset.period = period;
      });
      const notes = $$("[data-price-note]");
      notes.forEach((n) => {
        n.textContent =
          period === "annual"
            ? n.dataset.noteAnnual || n.textContent
            : n.dataset.noteMonthly || n.textContent;
      });
    };
    billingBtns.forEach((b) =>
      b.addEventListener("click", () => setBilling(b.dataset.period))
    );
    setBilling("monthly");
  }

  /* ---------- Plan selection (radio-like cards) ----------
     Landing page: redirect to pricing with plan context.
     Pricing page: handled by its own inline script (payment panel). */
  const hasPayPanel = !!document.getElementById("pay-form");
  if (!hasPayPanel) {
    $$(".pricing-card").forEach((card) => {
      const btn = $(".btn", card);
      if (!btn) return;
      btn.addEventListener("click", () => {
        const plan = card.dataset.plan || "";
        const period = $(".billing-toggle button.is-active")?.dataset.period || "monthly";
        const price = card.querySelector("[data-price-monthly]")?.dataset.priceMonthly || "0";
        window.IRANCOIN.pay(plan, period, price);
      });
    });
  }

  /* ---------- Payment method selection ---------- */
  $$(".pay-method").forEach((m) => {
    m.addEventListener("click", () => {
      $$(".pay-method").forEach((x) => {
        x.classList.remove("is-selected");
        x.setAttribute("aria-pressed", "false");
      });
      m.classList.add("is-selected");
      m.setAttribute("aria-pressed", "true");
    });
  });

  /* ---------- Payment form submit (demo) ---------- */
  const payForm = $("#pay-form");
  if (payForm) {
    payForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const btn = $("#pay-submit");
      if (!btn) return;
      btn.classList.add("is-loading");
      btn.setAttribute("disabled", "true");
      setTimeout(() => {
        btn.classList.remove("is-loading");
        btn.removeAttribute("disabled");
        showToast("پرداخت آزمایشی با موفقیت انجام شد. اشتراک شما فعال شد ✓");
      }, 1600);
    });
  }

  /* ---------- Toast ---------- */
  function showToast(message) {
    let toast = $(".toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.className = "toast";
      toast.setAttribute("role", "status");
      toast.innerHTML = '<span class="toast-dot"></span><span class="toast-msg"></span>';
      document.body.appendChild(toast);
    }
    $(".toast-msg", toast).textContent = message;
    requestAnimationFrame(() => toast.classList.add("is-visible"));
    clearTimeout(toast._t);
    toast._t = setTimeout(() => toast.classList.remove("is-visible"), 3800);
  }

  /* ---------- Page transition (cinematic landing → subscription) ---------- */
  $$("[data-transition]").forEach((link) => {
    link.addEventListener("click", (e) => {
      const href = link.getAttribute("href");
      if (!href || href.startsWith("#")) return;
      const isSamePage = new URL(href, location.href).pathname === location.pathname;
      if (isSamePage) return;
      e.preventDefault();
      const veil = $("#page-veil");
      veil.classList.add("is-active");
      document.body.style.overflow = "hidden";
      setTimeout(() => {
        window.location.href = href;
      }, 650);
    });
  });

  /* ---------- Progress bars ---------- */
  $$("[data-progress]").forEach((el) => {
    const target = parseFloat(el.dataset.progress);
    if ("IntersectionObserver" in window) {
      const io = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            el.querySelector("span").style.width = `${target}%`;
            io.disconnect();
          }
        },
        { threshold: 0.5 }
      );
      io.observe(el);
    }
  });

  /* ---------- Header CTA (landing) ---------- */
  const heroCta = $("#hero-subscribe");
  if (heroCta) {
    heroCta.addEventListener("click", (e) => {
      e.preventDefault();
      window.IRANCOIN.pay("pro", "monthly", "29");
    });
  }

  /* ---------- Tabs (active state switch) ---------- */
  $$(".tabs").forEach((group) => {
    group.addEventListener("click", (e) => {
      const tab = e.target.closest(".tab");
      if (!tab) return;
      $$(".tab", group).forEach((t) => {
        t.classList.toggle("is-active", t === tab);
        t.setAttribute("aria-selected", String(t === tab));
      });
    });
  });

  /* ---------- Shared app namespace ---------- */
  window.IRANCOIN = window.IRANCOIN || {};

  window.IRANCOIN.pay = function (plan, period, price) {
    const p = plan ? `?plan=${encodeURIComponent(plan)}&period=${encodeURIComponent(period)}&price=${encodeURIComponent(price)}` : "";
    const veil = $("#page-veil");
    veil.classList.add("is-active");
    document.body.style.overflow = "hidden";
    setTimeout(() => {
      window.location.href = `pricing.html${p}`;
    }, 650);
  };

  window.IRANCOIN.toast = showToast;
})();