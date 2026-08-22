/* IRANCOiN — Live Price + Discount + Countdown System */
(function(){
  "use strict";

  /* ===== CONFIG ===== */
  var WALLEX_API = 'https://api.wallex.ir/v1/markets';
  var PRICE_KEY = 'ic-usdt-toman';
  var PRICE_TS_KEY = 'ic-price-timestamp';
  var DISCOUNT_KEY = 'ic-discounts';
  var REFRESH_INTERVAL = 60000; // 1 minute
  var countdownIntervals = {};

  var PLANS = {
    monthly:    { usdt: 29,  label: '۱ ماهه',  days: 30 },
    quarterly:  { usdt: 79,  label: '۳ ماهه',  days: 90 },
    semiannual: { usdt: 149, label: '۶ ماهه',  days: 180 },
    annual:     { usdt: 249, label: '۱ ساله',  days: 365 }
  };

  /* ===== PRICE FETCHING ===== */
  var currentPrice = parseInt(localStorage.getItem(PRICE_KEY)) || 0;
  var priceTimestamp = parseInt(localStorage.getItem(PRICE_TS_KEY)) || 0;

  async function fetchPrice() {
    try {
      var res = await fetch(WALLEX_API);
      if (!res.ok) return currentPrice;
      var data = await res.json();
      var usdt = data.result && data.result.symbols && data.result.symbols.USDTTMN;
      if (usdt && usdt.stats && usdt.stats.lastPrice) {
        currentPrice = Math.round(usdt.stats.lastPrice);
        localStorage.setItem(PRICE_KEY, currentPrice);
        localStorage.setItem(PRICE_TS_KEY, Date.now());
        updatePriceDisplay();
        return currentPrice;
      }
    } catch(e) {
      console.warn('Price fetch failed:', e);
    }
    return currentPrice;
  }

  function getCachedPrice() {
    var ts = parseInt(localStorage.getItem(PRICE_TS_KEY)) || 0;
    if (Date.now() - ts > 300000) { // 5 min stale
      fetchPrice(); // refresh in background
    }
    return parseInt(localStorage.getItem(PRICE_KEY)) || 0;
  }

  /* ===== PRICE CALCULATIONS ===== */
  function toToman(usdt) {
    var price = getCachedPrice();
    if (!price) return 0;
    return Math.round(usdt * price);
  }

  function formatToman(amount) {
    if (!amount) return '۰';
    return amount.toLocaleString('fa-IR');
  }

  function formatUSDT(usdt) {
    return '$' + usdt.toLocaleString('en-US');
  }

  /* ===== DISCOUNT SYSTEM ===== */
  function getDiscounts() {
    try {
      return JSON.parse(localStorage.getItem(DISCOUNT_KEY) || '{}');
    } catch(e) { return {}; }
  }

  function saveDiscounts(d) {
    localStorage.setItem(DISCOUNT_KEY, JSON.stringify(d));
  }

  function getDiscount(planId) {
    var discounts = getDiscounts();
    return discounts[planId] || { active: false, percent: 0, endDate: null };
  }

  function setDiscount(planId, discount) {
    var discounts = getDiscounts();
    discounts[planId] = discount;
    saveDiscounts(discounts);
  }

  function calculateDiscountedPrice(planId) {
    var plan = PLANS[planId];
    if (!plan) return { usdt: 0, toman: 0, discount: 0, original: { usdt: 0, toman: 0 } };

    var discount = getDiscount(planId);
    var originalUsdt = plan.usdt;
    var originalToman = toToman(plan.usdt);

    if (!discount.active || !discount.percent || !discount.endDate) {
      return {
        usdt: originalUsdt,
        toman: originalToman,
        discount: 0,
        original: { usdt: originalUsdt, toman: originalToman }
      };
    }

    var now = new Date();
    var endDate = new Date(discount.endDate);
    if (now >= endDate) {
      discount.active = false;
      setDiscount(planId, discount);
      return {
        usdt: originalUsdt,
        toman: originalToman,
        discount: 0,
        original: { usdt: originalUsdt, toman: originalToman }
      };
    }

    var discountAmount = Math.round(originalUsdt * discount.percent / 100);
    var discountedUsdt = originalUsdt - discountAmount;
    var discountedToman = toToman(discountedUsdt);

    return {
      usdt: discountedUsdt,
      toman: discountedToman,
      discount: discount.percent,
      original: { usdt: originalUsdt, toman: originalToman },
      endDate: discount.endDate
    };
  }

  /* ===== COUNTDOWN TIMER ===== */
  function getCountdown(endDateStr) {
    if (!endDateStr) return null;
    var end = new Date(endDateStr).getTime();
    var now = Date.now();
    var diff = end - now;

    if (diff <= 0) return { days: 0, hours: 0, minutes: 0, seconds: 0, total: 0, danger: true };

    return {
      days: Math.floor(diff / (1000 * 60 * 60 * 24)),
      hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
      minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
      seconds: Math.floor((diff % (1000 * 60)) / 1000),
      total: diff,
      danger: diff < 3600000 // less than 1 hour
    };
  }

  function getCountdownColor(totalMs) {
    if (totalMs <= 0) return { bg: '#dc2626', text: '#fff', glow: 'rgba(220,38,38,0.4)' };
    if (totalMs < 3600000) return { bg: '#dc2626', text: '#fff', glow: 'rgba(220,38,38,0.4)' }; // < 1h: red
    if (totalMs < 86400000) return { bg: '#ea580c', text: '#fff', glow: 'rgba(234,88,12,0.3)' }; // < 1d: orange
    if (totalMs < 259200000) return { bg: '#d97706', text: '#fff', glow: 'rgba(217,119,6,0.3)' }; // < 3d: yellow-orange
    if (totalMs < 604800000) return { bg: '#ca8a04', text: '#fff', glow: 'rgba(202,138,4,0.3)' }; // < 7d: yellow
    return { bg: '#16a34a', text: '#fff', glow: 'rgba(22,163,74,0.3)' }; // > 7d: green
  }

  /* ===== RENDER COUNTDOWN ===== */
  function renderCountdown(endDateStr, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var cd = getCountdown(endDateStr);
    if (!cd || cd.total <= 0) {
      container.innerHTML = '<div style="color:var(--err);font-size:.8125rem;font-weight:600"><i class="fa-solid fa-clock"></i> زمان به پایان رسید</div>';
      return;
    }

    var colors = getCountdownColor(cd.total);
    var isDanger = cd.danger;

    container.innerHTML =
      '<div class="cd-boxes" style="display:flex;gap:.375rem;justify-content:center;direction:ltr">' +
        cdBox(cd.days, 'روز', colors, isDanger) +
        '<span class="cd-sep" style="color:' + colors.bg + ';font-size:1.25rem;font-weight:800;align-self:center;padding:0 .125rem">:</span>' +
        cdBox(cd.hours, 'ساعت', colors, isDanger) +
        '<span class="cd-sep" style="color:' + colors.bg + ';font-size:1.25rem;font-weight:800;align-self:center;padding:0 .125rem">:</span>' +
        cdBox(cd.minutes, 'دقیقه', colors, isDanger) +
        '<span class="cd-sep" style="color:' + colors.bg + ';font-size:1.25rem;font-weight:800;align-self:center;padding:0 .125rem">:</span>' +
        cdBox(cd.seconds, 'ثانیه', colors, isDanger) +
      '</div>' +
      (isDanger ?
        '<div style="margin-top:.5rem;text-align:center;color:' + colors.bg + ';font-size:.75rem;font-weight:600;display:flex;align-items:center;justify-content:center;gap:.375rem">' +
          '<span style="animation:cdBlink 1s ease-in-out infinite"><i class="fa-solid fa-triangle-exclamation"></i></span> زمان باقی‌مانده رو به پایان است!' +
        '</div>' : '');
  }

  function cdBox(value, label, colors, isDanger) {
    var blinkStyle = isDanger ? 'animation:cdBlink 1s ease-in-out infinite' : '';
    return '<div style="text-align:center">' +
      '<div style="background:' + colors.bg + ';color:' + colors.text + ';width:3rem;height:3rem;border-radius:.5rem;display:grid;place-items:center;font-size:1.25rem;font-weight:800;font-variant-numeric:tabular-nums;box-shadow:0 4px 12px ' + colors.glow + ';' + blinkStyle + '">' +
        String(value).padStart(2, '0') +
      '</div>' +
      '<div style="font-size:.625rem;color:var(--text-tertiary);margin-top:.25rem;font-weight:600">' + label + '</div>' +
    '</div>';
  }

  /* ===== RENDER PRICE CARD ===== */
  function renderPriceCard(planId, containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var plan = PLANS[planId];
    if (!plan) return;

    var pricing = calculateDiscountedPrice(planId);
    var hasDiscount = pricing.discount > 0;

    var html = '';
    if (hasDiscount) {
      html += '<div style="position:absolute;top:.75rem;left:.75rem;background:linear-gradient(135deg,#dc2626,#ea580c);color:white;padding:.25rem .625rem;border-radius:999px;font-size:.6875rem;font-weight:700;display:flex;align-items:center;gap:.25rem">';
      html += '<i class="fa-solid fa-clock"></i> ' + pricing.discount + '% تخفیف';
      html += '</div>';
      html += '<div style="position:absolute;top:.75rem;right:.75rem;font-size:.75rem;color:var(--text-tertiary)"><i class="fa-solid fa-clock"></i> مدت محدود</div>';
    }

    html += '<div style="margin-top:' + (hasDiscount ? '2.5rem' : '0') + '">';
    html += '<div style="font-size:.8125rem;color:var(--text-tertiary);margin-bottom:.25rem">' + plan.label + '</div>';

    if (hasDiscount) {
      html += '<div style="display:flex;align-items:baseline;gap:.5rem;flex-wrap:wrap">';
      html += '<span style="font-size:1.75rem;font-weight:800;background:var(--grad-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent">' + formatUSDT(pricing.usdt) + '</span>';
      html += '<span style="font-size:.875rem;color:var(--text-tertiary);text-decoration:line-through">' + formatUSDT(pricing.original.usdt) + '</span>';
      html += '</div>';
      html += '<div style="font-size:1rem;font-weight:700;color:var(--c-amber-500);margin-top:.25rem">' + formatToman(pricing.toman) + ' تومان</div>';
      html += '<div style="font-size:.75rem;color:var(--text-tertiary);text-decoration:line-through">' + formatToman(pricing.original.toman) + ' تومان</div>';
    } else {
      html += '<div style="font-size:1.75rem;font-weight:800;background:var(--grad-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent">' + formatUSDT(pricing.usdt) + '</div>';
      html += '<div style="font-size:1rem;font-weight:700;color:var(--text-primary);margin-top:.25rem">' + formatToman(pricing.toman) + ' تومان</div>';
    }

    html += '<div style="font-size:.75rem;color:var(--text-tertiary);margin-top:.25rem">' + plan.days + ' روز اشتراک</div>';
    html += '</div>';

    if (hasDiscount && pricing.endDate) {
      html += '<div style="margin-top:.75rem;padding-top:.75rem;border-top:1px solid var(--border-default)">';
      html += '<div style="font-size:.6875rem;color:var(--text-tertiary);margin-bottom:.375rem;text-align:center"><i class="fa-solid fa-clock"></i> مدت محدود</div>';
      html += '<div id="cd-' + planId + '"></div>';
      html += '</div>';
    }

    container.innerHTML = html;

    // Start countdown if needed
    if (hasDiscount && pricing.endDate) {
      renderCountdown(pricing.endDate, 'cd-' + planId);
      if (countdownIntervals[planId]) clearInterval(countdownIntervals[planId]);
      countdownIntervals[planId] = setInterval(function() {
        renderCountdown(pricing.endDate, 'cd-' + planId);
        // Auto-deactivate if expired
        var cd = getCountdown(pricing.endDate);
        if (cd && cd.total <= 0) {
          clearInterval(countdownIntervals[planId]);
          delete countdownIntervals[planId];
          var disc = getDiscount(planId);
          disc.active = false;
          setDiscount(planId, disc);
          renderPriceCard(planId, 'price-' + planId);
        }
      }, 1000);
    }
  }

  /* ===== RENDER PRICE BANNER ===== */
  function renderPriceBanner(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var price = getCachedPrice();
    if (!price) {
      container.innerHTML = '<span style="color:var(--text-tertiary)">در حال دریافت قیمت...</span>';
      return;
    }

    container.innerHTML =
      '<div style="display:flex;align-items:center;gap:1rem;flex-wrap:wrap">' +
        '<div style="display:flex;align-items:center;gap:.375rem">' +
          '<span style="font-size:.75rem;color:var(--text-tertiary)">قیمت لحظه‌ای USDT:</span>' +
          '<span style="font-weight:800;background:var(--grad-brand);-webkit-background-clip:text;-webkit-text-fill-color:transparent;font-size:1rem">' + formatToman(price) + ' تومان</span>' +
        '</div>' +
        '<div style="font-size:.6875rem;color:var(--text-tertiary)">هر ۶۰ ثانیه بروزرسانی</div>' +
      '</div>';
  }

  /* ===== ADMIN: SET DISCOUNT ===== */
  function setAdminDiscount(planId, percent, days, hours) {
    if (!percent || percent <= 0 || percent > 100) {
      var disc = getDiscount(planId);
      disc.active = false;
      setDiscount(planId, disc);
      return;
    }

    var durationMs = ((days || 0) * 86400000) + ((hours || 0) * 3600000);
    if (durationMs <= 0) durationMs = 86400000; // default 1 day

    var endDate = new Date(Date.now() + durationMs).toISOString();

    setDiscount(planId, {
      active: true,
      percent: parseInt(percent),
      endDate: endDate,
      created: new Date().toISOString()
    });
  }

  function removeAdminDiscount(planId) {
    setDiscount(planId, { active: false, percent: 0, endDate: null });
  }

  /* ===== AUTO REFRESH ===== */
  setInterval(fetchPrice, REFRESH_INTERVAL);

  /* ===== UPDATE ALL PRICE DISPLAYS ===== */
  function updatePriceDisplay() {
    // Update any price elements with data-plan attribute
    document.querySelectorAll('[data-live-price]').forEach(function(el) {
      var planId = el.dataset.livePrice;
      var pricing = calculateDiscountedPrice(planId);
      el.textContent = formatToman(pricing.toman) + ' تومان';
    });

    // Update USDT price displays
    document.querySelectorAll('[data-usdt-price]').forEach(function(el) {
      var planId = el.dataset.usdtPrice;
      var pricing = calculateDiscountedPrice(planId);
      el.textContent = formatUSDT(pricing.usdt);
    });

    // Re-render banner + cards so the live price actually updates
    renderPriceBanner('live-price-banner');
    Object.keys(PLANS).forEach(function(planId) {
      var container = document.getElementById('price-' + planId);
      if (container) renderPriceCard(planId, 'price-' + planId);
    });
  }

  /* ===== CSS ANIMATION ===== */
  var style = document.createElement('style');
  style.textContent = '@keyframes cdBlink{0%,100%{opacity:1}50%{opacity:.6}}';
  document.head.appendChild(style);

  /* ===== INIT ===== */
  document.addEventListener('DOMContentLoaded', function() {
    fetchPrice();
    renderPriceBanner('live-price-banner');

    // Render all price cards
    Object.keys(PLANS).forEach(function(planId) {
      var container = document.getElementById('price-' + planId);
      if (container) renderPriceCard(planId, 'price-' + planId);
    });
  });

  /* ===== EXPORTS ===== */
  window.ICPrice = {
    toToman: toToman,
    formatToman: formatToman,
    formatUSDT: formatUSDT,
    getDiscount: getDiscount,
    setDiscount: setAdminDiscount,
    removeDiscount: removeAdminDiscount,
    calculateDiscountedPrice: calculateDiscountedPrice,
    renderPriceCard: renderPriceCard,
    renderCountdown: renderCountdown,
    renderPriceBanner: renderPriceBanner,
    getPrice: function() { return getCachedPrice(); },
    refreshPrice: fetchPrice,
    PLANS: PLANS
  };

})();
