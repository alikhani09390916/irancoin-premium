/* IRANCOiN — Payment System (Crypto + Card-to-Card) */
(function () {
  "use strict";

  var PLANS = {
    "1m":  { amount: 29,  label: "۱ ماهه", days: 30 },
    "3m":  { amount: 79,  label: "۳ ماهه", days: 90 },
    "6m":  { amount: 149, label: "۶ ماهه", days: 180 },
    "1yr": { amount: 249, label: "۱ ساله", days: 365 },
  };

  var CARDS = [
    { number: "xxxx-xxxx-xxxx-xxxx", name: "نام دارنده کارت", bank: "بانک" },
  ];

  // Load cards from admin settings
  function loadCards() {
    try {
      var saved = localStorage.getItem('ic-bank-cards');
      if (saved) CARDS = JSON.parse(saved);
    } catch(e) {}
  }
  loadCards();

  var cryptos = [
    { code: "usdttrc20", name: "USDT (TRC20)", icon: "₮" },
    { code: "btc", name: "Bitcoin", icon: "₿" },
    { code: "eth", name: "Ethereum", icon: "Ξ" },
    { code: "usdc", name: "USDC", icon: "$" },
    { code: "ltc", name: "Litecoin", icon: "Ł" },
    { code: "doge", name: "Dogecoin", icon: "Ð" },
  ];

  function apiBase() {
    return (window.IC && window.IC.supabase && window.IC.supabase.functionsUrl)
      || "https://ibnpgzmbepieudwalwtv.supabase.co/functions/v1";
  }
  function anonKey() {
    return (window.IC && window.IC.supabase && window.IC.supabase.anonKey) || "";
  }
  function userToken() {
    try {
      var raw = localStorage.getItem("sb-ibnpgzmbepieudwalwtv-auth-token");
      if (raw) return JSON.parse(raw).access_token || "";
    } catch (e) {}
    return "";
  }
  function userEmail() {
    try {
      var raw = localStorage.getItem("sb-ibnpgzmbepieudwalwtv-auth-token");
      if (raw) return JSON.parse(raw).user?.email || "";
    } catch (e) {}
    return "";
  }
  function userName() {
    try {
      var raw = localStorage.getItem("sb-ibnpgzmbepieudwalwtv-auth-token");
      if (raw) return JSON.parse(raw).user?.user_metadata?.full_name || "";
    } catch (e) {}
    return "";
  }
  function isLoggedIn() {
    return !!userToken();
  }

  /* ============ CRYPTO PAYMENT ============ */
  async function createInvoice(planId, payCurrency) {
    var plan = PLANS[planId];
    if (!plan) throw new Error("Invalid plan");

    var body = {
      plan_id: planId,
      pay_currency: payCurrency || "usdttrc20",
      user_email: userEmail(),
      user_name: userName(),
    };

    var headers = { "Content-Type": "application/json", "Authorization": "Bearer " + (userToken() || anonKey()), "apikey": anonKey() };
    var res = await fetch(apiBase() + "/create-invoice", { method: "POST", headers: headers, body: JSON.stringify(body) });
    if (!res.ok) { var err = await res.json().catch(function(){}); throw new Error(err.error || "Invoice creation failed"); }
    return res.json();
  }

  function showCryptoModal(planId) {
    var plan = PLANS[planId];
    if (!plan) return;
    var old = document.getElementById("ic-payment-modal"); if (old) old.remove();

    var overlay = document.createElement("div");
    overlay.id = "ic-payment-modal";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);animation:fadeIn .25s";

    var cryptoHtml = cryptos.map(function(c) {
      return '<button class="ic-crypto-btn" data-currency="' + c.code + '" style="display:flex;align-items:center;gap:0.75rem;padding:0.875rem 1.25rem;border-radius:0.75rem;background:rgba(255,255,255,0.05);border:1px solid rgba(255,255,255,0.08);color:white;font-size:0.9375rem;cursor:pointer;transition:all .2s;width:100%;text-align:right;font-family:inherit"><span style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:linear-gradient(135deg,#7C3AED,#06B6D4);display:grid;place-items:center;font-size:1.125rem;flex-shrink:0">' + c.icon + '</span><span style="flex:1;font-weight:500">' + c.name + '</span><span style="color:rgba(255,255,255,0.3);font-size:0.75rem">انتخاب →</span></button>';
    }).join("");

    overlay.innerHTML = '<div style="background:linear-gradient(160deg,#1a1040,#0f172a);border-radius:1.25rem;border:1px solid rgba(124,58,237,0.3);padding:2rem;max-width:26rem;width:92%;box-shadow:0 25px 60px rgba(0,0,0,0.5)">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">' +
        '<div style="display:flex;align-items:center;gap:0.75rem">' +
          '<div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:linear-gradient(135deg,#7C3AED,#06B6D4);display:grid;place-items:center;font-size:1.25rem">₿</div>' +
          '<div><div style="color:white;font-weight:700;font-size:1.0625rem">پرداخت با ارز دیجیتال</div><div style="color:rgba(255,255,255,0.4);font-size:0.75rem">NOWPayments</div></div>' +
        '</div>' +
        '<button id="ic-modal-close" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.5rem;cursor:pointer;padding:0.25rem">&times;</button>' +
      '</div>' +
      '<div style="padding:0.75rem 1rem;border-radius:0.75rem;background:rgba(124,58,237,0.08);border:1px solid rgba(124,58,237,0.15);margin-bottom:1.25rem">' +
        '<div style="color:rgba(255,255,255,0.5);font-size:0.75rem;margin-bottom:0.25rem">پلن انتخابی</div>' +
        '<div style="color:white;font-weight:700;font-size:1rem">' + plan.label + ' — <span style="background:linear-gradient(135deg,#7C3AED,#06B6D4);-webkit-background-clip:text;-webkit-text-fill-color:transparent">$' + plan.amount + '</span></div>' +
      '</div>' +
      '<div style="display:grid;gap:0.5rem">' + cryptoHtml + '</div>' +
      '<div style="display:flex;align-items:center;justify-content:center;gap:0.5rem;margin-top:1.25rem;padding-top:1rem;border-top:1px solid rgba(255,255,255,0.06)">' +
        '<span style="color:rgba(255,255,255,0.3);font-size:0.75rem">پرداخت امن از طریق</span>' +
        '<strong style="color:#a78bfa;font-size:0.8125rem">NOWPayments</strong>' +
      '</div>' +
    '</div>';

    document.body.appendChild(overlay);

    overlay.querySelector("#ic-modal-close").addEventListener("click", function() { overlay.remove(); });
    overlay.addEventListener("click", function(e) { if (e.target === overlay) overlay.remove(); });

    overlay.querySelectorAll(".ic-crypto-btn").forEach(function(btn) {
      btn.addEventListener("mouseenter", function() { btn.style.background = "rgba(124,58,237,0.15)"; btn.style.borderColor = "rgba(124,58,237,0.4)"; });
      btn.addEventListener("mouseleave", function() { btn.style.background = "rgba(255,255,255,0.05)"; btn.style.borderColor = "rgba(255,255,255,0.08)"; });
      btn.addEventListener("click", function() {
        if (!isLoggedIn()) { overlay.remove(); showAuthModal("login"); return; }
        var currency = btn.dataset.currency;
        btn.innerHTML = '<span style="flex:1;text-align:center;color:rgba(255,255,255,0.6)">در حال ایجاد فاکتور...</span>';
        btn.disabled = true;
        createInvoice(planId, currency).then(function(data) {
          if (data.invoice_url) window.location.href = data.invoice_url;
          else throw new Error("No invoice URL");
        }).catch(function(err) {
          alert("خطا: " + err.message);
          btn.disabled = false;
        });
      });
    });
  }

  /* ============ CARD-TO-CARD PAYMENT ============ */
  function showCard2CardModal(planId) {
    var plan = PLANS[planId];
    if (!plan) return;
    if (!isLoggedIn()) { showAuthModal("login"); return; }

    var old = document.getElementById("ic-payment-modal"); if (old) old.remove();

    var overlay = document.createElement("div");
    overlay.id = "ic-payment-modal";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);animation:fadeIn .25s";

    var cardsHtml = CARDS.map(function(c, i) {
      return '<div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:0.75rem;padding:1rem;margin-bottom:0.75rem">' +
        '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0.5rem">' +
          '<span style="color:rgba(255,255,255,0.5);font-size:0.75rem">بانک پاسارگاد</span>' +
          '<span style="color:#10b981;font-size:0.6875rem;font-weight:600">فعال</span>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:0.75rem">' +
          '<div style="width:3rem;height:2rem;border-radius:0.375rem;background:linear-gradient(135deg,#10b981,#06b6d4);display:grid;place-items:center;font-size:0.6rem;color:white;font-weight:700;letter-spacing:0.02em">IRANCOiN</div>' +
          '<div style="flex:1">' +
            '<div style="color:white;font-weight:600;font-size:0.9375rem;direction:ltr;text-align:left;font-family:monospace;letter-spacing:0.05em">' + c.number + '</div>' +
            '<div style="color:rgba(255,255,255,0.5);font-size:0.75rem;margin-top:0.25rem">بنام: <strong style="color:rgba(255,255,255,0.8)">' + c.name + '</strong></div>' +
          '</div>' +
          '<button class="ic-copy-card" data-num="' + c.number.replace(/-/g, '') + '" style="padding:0.375rem 0.75rem;border-radius:0.375rem;background:rgba(16,185,129,0.15);border:1px solid rgba(16,185,129,0.3);color:#10b981;cursor:pointer;font-family:inherit;font-size:0.75rem;white-space:nowrap">کپی</button>' +
        '</div>' +
      '</div>';
    }).join("");

    overlay.innerHTML = '<div style="background:linear-gradient(160deg,#1a1040,#0f172a);border-radius:1.25rem;border:1px solid rgba(16,185,129,0.3);padding:2rem;max-width:28rem;width:92%;box-shadow:0 25px 60px rgba(0,0,0,0.5);max-height:90vh;overflow-y:auto">' +
      '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem">' +
        '<div style="display:flex;align-items:center;gap:0.75rem">' +
          '<div style="width:2.5rem;height:2.5rem;border-radius:0.5rem;background:linear-gradient(135deg,#10b981,#06b6d4);display:grid;place-items:center;font-size:1.25rem">🏦</div>' +
          '<div><div style="color:white;font-weight:700;font-size:1.0625rem">پرداخت کارت به کارت</div><div style="color:rgba(255,255,255,0.4);font-size:0.75rem">بانک پاسارگاد</div></div>' +
        '</div>' +
        '<button id="ic-modal-close" style="background:none;border:none;color:rgba(255,255,255,0.4);font-size:1.5rem;cursor:pointer;padding:0.25rem">&times;</button>' +
      '</div>' +
      '<div style="padding:0.75rem 1rem;border-radius:0.75rem;background:rgba(16,185,129,0.08);border:1px solid rgba(16,185,129,0.15);margin-bottom:1.25rem">' +
        '<div style="color:rgba(255,255,255,0.5);font-size:0.75rem;margin-bottom:0.25rem">مبلغ قابل پرداخت</div>' +
        '<div style="color:white;font-weight:700;font-size:1.125rem">$' + plan.amount + ' <span style="color:rgba(255,255,255,0.4);font-size:0.8125rem;font-weight:400">— ' + plan.label + '</span></div>' +
      '</div>' +
      '<div style="color:rgba(255,255,255,0.7);font-size:0.8125rem;margin-bottom:1rem;font-weight:600">شماره کارت‌های بانکی:</div>' +
      cardsHtml +
      '<div style="margin-top:1.25rem">' +
        '<div style="color:rgba(255,255,255,0.7);font-size:0.8125rem;margin-bottom:0.5rem;font-weight:600">کد پیگیری تراکنش</div>' +
        '<input id="ic-tracking-code" type="text" placeholder="مثلاً: 123456789012" style="width:100%;padding:0.75rem 1rem;border-radius:0.5rem;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:white;font-size:0.9375rem;font-family:inherit;outline:none;direction:ltr;text-align:left">' +
      '</div>' +
      '<div style="margin-top:1rem">' +
        '<div style="color:rgba(255,255,255,0.7);font-size:0.8125rem;margin-bottom:0.5rem;font-weight:600">فیش واریزی (اسکرین‌شات)</div>' +
        '<label for="ic-receipt" style="display:flex;flex-direction:column;align-items:center;justify-content:center;padding:1.5rem;border:2px dashed rgba(255,255,255,0.12);border-radius:0.75rem;cursor:pointer;transition:all .2s;background:rgba(255,255,255,0.02)">' +
          '<div style="font-size:1.5rem;margin-bottom:0.5rem">📷</div>' +
          '<div style="color:rgba(255,255,255,0.5);font-size:0.8125rem">کلیک کنید یا فایل را بکشید</div>' +
          '<div id="ic-receipt-name" style="color:#10b981;font-size:0.75rem;margin-top:0.375rem;display:none"></div>' +
          '<input type="file" id="ic-receipt" accept="image/*" style="display:none">' +
        '</label>' +
      '</div>' +
      '<button id="ic-submit-card" style="width:100%;padding:0.875rem;border-radius:0.75rem;background:linear-gradient(135deg,#10b981,#06b6d4);border:none;color:white;font-weight:700;font-size:1rem;cursor:pointer;font-family:inherit;margin-top:1.25rem;transition:all .2s">ارسال فیش و تأیید پرداخت</button>' +
      '<p style="color:rgba(255,255,255,0.3);font-size:0.6875rem;text-align:center;margin-top:0.75rem">اشتراک شما پس از تأیید مدیر (حداکثر ۱ ساعت) فعال می‌شود</p>' +
    '</div>';

    document.body.appendChild(overlay);

    overlay.querySelector("#ic-modal-close").addEventListener("click", function() { overlay.remove(); });
    overlay.addEventListener("click", function(e) { if (e.target === overlay) overlay.remove(); });

    overlay.querySelectorAll(".ic-copy-card").forEach(function(btn) {
      btn.addEventListener("click", function() {
        navigator.clipboard.writeText(btn.dataset.num);
        btn.textContent = "کپی شد ✓";
        setTimeout(function() { btn.textContent = "کپی"; }, 2000);
      });
    });

    var receiptInput = overlay.querySelector("#ic-receipt");
    var receiptName = overlay.querySelector("#ic-receipt-name");
    receiptInput.addEventListener("change", function() {
      if (receiptInput.files.length) {
        receiptName.textContent = "✓ " + receiptInput.files[0].name;
        receiptName.style.display = "block";
      }
    });

    overlay.querySelector("#ic-submit-card").addEventListener("click", async function() {
      var trackingCode = overlay.querySelector("#ic-tracking-code").value.trim();
      var receiptFile = receiptInput.files[0];
      if (!trackingCode) return alert("کد پیگیری را وارد کنید");
      if (!receiptFile) return alert("فیش واریزی را آپلود کنید");

      var btn = overlay.querySelector("#ic-submit-card");
      btn.disabled = true;
      btn.textContent = "در حال ارسال...";

      try {
        var reader = new FileReader();
        reader.onload = async function(e) {
          var base64 = e.target.result.split(",")[1];
          var res = await fetch(apiBase() + "/submit-card-payment", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": "Bearer " + userToken(), "apikey": anonKey() },
            body: JSON.stringify({
              plan_id: planId,
              tracking_code: trackingCode,
              receipt_image: base64,
              card_number: CARDS.map(function(c){return c.number}).join(" , "),
            })
          });
          var data = await res.json();
          if (data.success) {
            overlay.remove();
            showSuccess("فیش شما با موفقیت ارسال شد! پس از تأیید مدیر، اشتراک شما فعال می‌شود.");
          } else {
            throw new Error(data.error || "ارسال ناموفق");
          }
        };
        reader.readAsDataURL(receiptFile);
      } catch (err) {
        alert("خطا: " + err.message);
        btn.disabled = false;
        btn.textContent = "ارسال فیش و تأیید پرداخت";
      }
    });
  }

  /* ============ AUTH MODAL ============ */
  function showAuthModal(tab) {
    var old = document.getElementById("ic-payment-modal"); if (old) old.remove();
    var old2 = document.getElementById("ic-auth-modal"); if (old2) old2.remove();

    var overlay = document.createElement("div");
    overlay.id = "ic-auth-modal";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px);animation:fadeIn .25s";

    overlay.innerHTML = '<div style="background:linear-gradient(160deg,#1a1040,#0f172a);border-radius:1.25rem;border:1px solid rgba(124,58,237,0.3);padding:2rem;max-width:24rem;width:92%;box-shadow:0 25px 60px rgba(0,0,0,0.5)">' +
      '<div style="text-align:center;margin-bottom:1.5rem">' +
        '<div style="width:3rem;height:3rem;border-radius:0.75rem;background:linear-gradient(135deg,#7C3AED,#06B6D4);display:grid;place-items:center;margin:0 auto 0.75rem;font-size:1.5rem">🔐</div>' +
        '<div style="color:white;font-weight:700;font-size:1.125rem" id="auth-title">ورود به حساب</div>' +
      '</div>' +
      '<div style="display:flex;gap:0.5rem;margin-bottom:1.25rem">' +
        '<button class="ic-auth-tab is-active" data-tab="login" style="flex:1;padding:0.5rem;border-radius:0.5rem;border:1px solid rgba(124,58,237,0.3);background:rgba(124,58,237,0.1);color:#a78bfa;cursor:pointer;font-family:inherit;font-size:0.8125rem;font-weight:600">ورود</button>' +
        '<button class="ic-auth-tab" data-tab="signup" style="flex:1;padding:0.5rem;border-radius:0.5rem;border:1px solid rgba(255,255,255,0.08);background:transparent;color:rgba(255,255,255,0.5);cursor:pointer;font-family:inherit;font-size:0.8125rem">ثبت‌نام</button>' +
      '</div>' +
      '<form id="ic-login-form" style="display:block">' +
        '<input id="ic-login-email" type="email" placeholder="ایمیل" required style="width:100%;padding:0.75rem 1rem;border-radius:0.5rem;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:white;font-size:0.9375rem;font-family:inherit;outline:none;margin-bottom:0.75rem;direction:ltr;text-align:left">' +
        '<input id="ic-login-pass" type="password" placeholder="رمز عبور" required style="width:100%;padding:0.75rem 1rem;border-radius:0.5rem;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:white;font-size:0.9375rem;font-family:inherit;outline:none;margin-bottom:0.5rem;direction:ltr;text-align:left">' +
        '<div style="text-align:left;margin-bottom:1rem"><button type="button" id="ic-forgot-pass" style="background:none;border:none;color:#a78bfa;cursor:pointer;font-family:inherit;font-size:0.8125rem">رمز عبور را فراموش کردم</button></div>' +
        '<button type="submit" style="width:100%;padding:0.75rem;border-radius:0.5rem;background:linear-gradient(135deg,#7C3AED,#06B6D4);border:none;color:white;font-weight:600;font-size:0.9375rem;cursor:pointer;font-family:inherit">ورود</button>' +
      '</form>' +
      '<form id="ic-signup-form" style="display:none">' +
        '<input id="ic-signup-name" type="text" placeholder="نام کامل" required style="width:100%;padding:0.75rem 1rem;border-radius:0.5rem;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:white;font-size:0.9375rem;font-family:inherit;outline:none;margin-bottom:0.75rem">' +
        '<input id="ic-signup-email" type="email" placeholder="ایمیل" required style="width:100%;padding:0.75rem 1rem;border-radius:0.5rem;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:white;font-size:0.9375rem;font-family:inherit;outline:none;margin-bottom:0.75rem;direction:ltr;text-align:left">' +
        '<input id="ic-signup-pass" type="password" placeholder="رمز عبور (حداقل ۸ کاراکتر)" required minlength="8" style="width:100%;padding:0.75rem 1rem;border-radius:0.5rem;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:white;font-size:0.9375rem;font-family:inherit;outline:none;margin-bottom:1rem;direction:ltr;text-align:left">' +
        '<button type="submit" style="width:100%;padding:0.75rem;border-radius:0.5rem;background:linear-gradient(135deg,#7C3AED,#06B6D4);border:none;color:white;font-weight:600;font-size:0.9375rem;cursor:pointer;font-family:inherit">ساخت حساب</button>' +
      '</form>' +
      '<div style="display:flex;align-items:center;gap:0.75rem;margin:1.25rem 0"><div style="flex:1;height:1px;background:rgba(255,255,255,0.08)"></div><span style="color:rgba(255,255,255,0.3);font-size:0.75rem">یا</span><div style="flex:1;height:1px;background:rgba(255,255,255,0.08)"></div></div>' +
      '<div style="display:grid;gap:0.5rem">' +
        '<button id="ic-google-login" style="width:100%;padding:0.625rem;border-radius:0.5rem;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:white;cursor:pointer;font-family:inherit;font-size:0.875rem;display:flex;align-items:center;justify-content:center;gap:0.5rem;transition:all .2s"><svg width="18" height="18" viewBox="0 0 24 24"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>ورود با Google</button>' +
        '<button id="ic-github-login" style="width:100%;padding:0.625rem;border-radius:0.5rem;border:1px solid rgba(255,255,255,0.1);background:rgba(255,255,255,0.06);color:white;cursor:pointer;font-family:inherit;font-size:0.875rem;display:flex;align-items:center;justify-content:center;gap:0.5rem;transition:all .2s"><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>ورود با GitHub</button>' +
      '</div>' +
      '<p style="color:rgba(255,255,255,0.3);font-size:0.6875rem;text-align:center;margin-top:1rem">با ورود، شرایط استفاده را می‌پذیرید</p>' +
    '</div>';

    document.body.appendChild(overlay);

    // Tab switching
    var tabs = overlay.querySelectorAll(".ic-auth-tab");
    var loginForm = overlay.querySelector("#ic-login-form");
    var signupForm = overlay.querySelector("#ic-signup-form");
    var title = overlay.querySelector("#auth-title");

    tabs.forEach(function(t) {
      t.addEventListener("click", function() {
        tabs.forEach(function(x) { x.style.background = "transparent"; x.style.borderColor = "rgba(255,255,255,0.08)"; x.style.color = "rgba(255,255,255,0.5)"; x.classList.remove("is-active"); });
        t.style.background = "rgba(124,58,237,0.1)"; t.style.borderColor = "rgba(124,58,237,0.3)"; t.style.color = "#a78bfa"; t.classList.add("is-active");
        var isLogin = t.dataset.tab === "login";
        loginForm.style.display = isLogin ? "block" : "none";
        signupForm.style.display = isLogin ? "none" : "block";
        title.textContent = isLogin ? "ورود به حساب" : "ساخت حساب جدید";
      });
    });

    overlay.querySelector("#ic-modal-close")?.addEventListener("click", function() { overlay.remove(); });
    overlay.addEventListener("click", function(e) { if (e.target === overlay) overlay.remove(); });

    // Login
    loginForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      var email = overlay.querySelector("#ic-login-email").value.trim();
      var pass = overlay.querySelector("#ic-login-pass").value;
      if (!email || !pass) return alert("ایمیل و رمز را وارد کنید");
      try {
        var res = await fetch(apiBase().replace("/functions/v1", "") + "/auth/v1/token?grant_type=password", {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": anonKey() },
          body: JSON.stringify({ email: email, password: pass })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error_description || "ورود ناموفق");
        localStorage.setItem("sb-ibnpgzmbepieudwalwtv-auth-token", JSON.stringify(data));
        overlay.remove();
        showSuccess("با موفقیت وارد شدید!");
      } catch (err) { alert(err.message); }
    });

    // Signup
    signupForm.addEventListener("submit", async function(e) {
      e.preventDefault();
      var name = overlay.querySelector("#ic-signup-name").value.trim();
      var email = overlay.querySelector("#ic-signup-email").value.trim();
      var pass = overlay.querySelector("#ic-signup-pass").value;
      if (!email || !pass) return alert("ایمیل و رمز را وارد کنید");
      if (pass.length < 8) return alert("رمز باید حداقل ۸ کاراکتر باشد");
      try {
        var res = await fetch(apiBase().replace("/functions/v1", "") + "/auth/v1/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": anonKey() },
          body: JSON.stringify({ email: email, password: pass, data: { full_name: name } })
        });
        var data = await res.json();
        if (!res.ok) throw new Error(data.error_description || "ثبت‌نام ناموفق");
        if (data.access_token) {
          localStorage.setItem("sb-ibnpgzmbepieudwalwtv-auth-token", JSON.stringify(data));
          overlay.remove();
          showSuccess("حساب شما ساخته شد!");
        } else {
          alert("ایمیل تایید ارسال شد. لطفاً ایمیل خود را بررسی کنید.");
        }
      } catch (err) { alert(err.message); }
    });

    // Forgot password
    overlay.querySelector("#ic-forgot-pass").addEventListener("click", async function() {
      var email = overlay.querySelector("#ic-login-email").value.trim();
      if (!email) return alert("ایمیل خود را در فیلد بالا وارد کنید");
      try {
        var res = await fetch(apiBase().replace("/functions/v1", "") + "/auth/v1/recover", {
          method: "POST",
          headers: { "Content-Type": "application/json", "apikey": anonKey() },
          body: JSON.stringify({ email: email })
        });
        if (res.ok) alert("لینک بازیابی رمز به ایمیل شما ارسال شد.");
        else alert("خطا در ارسال لینک بازیابی");
      } catch (e) { alert("خطا در ارتباط با سرور"); }
    });

    // Google OAuth
    overlay.querySelector("#ic-google-login").addEventListener("click", function() {
      window.location.href = apiBase().replace("/functions/v1", "") + "/auth/v1/authorize?provider=google&redirect_to=" + encodeURIComponent(window.location.href);
    });

    // GitHub OAuth
    overlay.querySelector("#ic-github-login").addEventListener("click", function() {
      window.location.href = apiBase().replace("/functions/v1", "") + "/auth/v1/authorize?provider=github&redirect_to=" + encodeURIComponent(window.location.href);
    });
  }

  /* ============ SUCCESS MODAL ============ */
  function showSuccess(msg) {
    var old = document.getElementById("ic-payment-modal"); if (old) old.remove();
    var old2 = document.getElementById("ic-auth-modal"); if (old2) old2.remove();

    var overlay = document.createElement("div");
    overlay.id = "ic-payment-modal";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.7);backdrop-filter:blur(10px)";
    overlay.innerHTML = '<div style="background:linear-gradient(160deg,#1a1040,#0f172a);border-radius:1.25rem;border:1px solid rgba(16,185,129,0.3);padding:2.5rem;max-width:22rem;width:92%;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.5)">' +
      '<div style="font-size:3rem;margin-bottom:1rem">✅</div>' +
      '<p style="color:white;font-size:1rem;line-height:1.6;margin-bottom:1.5rem">' + msg + '</p>' +
      '<button onclick="this.closest(\'div[style]\').parentElement.remove()" style="background:linear-gradient(135deg,#7C3AED,#06B6D4);color:white;border:none;padding:0.75rem 2rem;border-radius:0.75rem;font-weight:600;cursor:pointer;font-size:0.9375rem;font-family:inherit">بستن</button>' +
    '</div>';
    document.body.appendChild(overlay);
    overlay.addEventListener("click", function(e) { if (e.target === overlay) overlay.remove(); });
  }

  /* ============ INIT ============ */
  function init() {
    // Bind pricing card buttons
    document.querySelectorAll(".pricing-card .btn").forEach(function(btn) {
      btn.addEventListener("click", function() {
        var card = btn.closest(".pricing-card");
        var planId = card.dataset.plan;
        // Map old plan names to new IDs
        var planMap = { monthly: "1m", quarterly: "3m", semiannual: "6m", annual: "1yr" };
        var mappedId = planMap[planId] || planId;

        // Scroll to payment panel
        var panel = document.getElementById("pay-panel");
        if (panel) {
          panel.scrollIntoView({ behavior: "smooth", block: "start" });
          // Update plan label
          var label = document.getElementById("pp-plan-label");
          if (label) label.textContent = PLANS[mappedId]?.label || planId;
          var total = document.getElementById("pp-total");
          if (total) total.textContent = "$" + (PLANS[mappedId]?.amount || 0);
        }
      });
    });

    // Bind crypto pay button
    var cryptoBtn = document.querySelector("[data-crypto-pay]");
    if (cryptoBtn) {
      cryptoBtn.addEventListener("click", function() {
        var planId = cryptoBtn.dataset.cryptoPay;
        var planMap = { monthly: "1m", quarterly: "3m", semiannual: "6m", annual: "1yr" };
        showCryptoModal(planMap[planId] || planId);
      });
    }

    // Bind card-to-card button
    var c2cBtn = document.querySelector("[data-card2card-pay]");
    if (c2cBtn) {
      c2cBtn.addEventListener("click", function() {
        var planId = c2cBtn.dataset.card2cardPay;
        var planMap = { monthly: "1m", quarterly: "3m", semiannual: "6m", annual: "1yr" };
        showCard2CardModal(planMap[planId] || planId);
      });
    }

    // Payment result from URL
    var params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") showSuccess("پرداخت شما با موفقیت تایید شد! اشتراک شما فعال شد.");
    else if (params.get("payment") === "cancelled") showSuccess("پرداخت لغو شد. می‌توانید دوباره تلاش کنید.");

    // Handle OAuth callback (hash fragment)
    if (window.location.hash.includes("access_token")) {
      try {
        var hash = new URLSearchParams(window.location.hash.substring(1));
        var accessToken = hash.get("access_token");
        var refreshToken = hash.get("refresh_token");
        if (accessToken) {
          // Fetch user info
          fetch(apiBase().replace("/functions/v1", "") + "/auth/v1/user", {
            headers: { "Authorization": "Bearer " + accessToken, "apikey": anonKey() }
          }).then(function(r) { return r.json(); }).then(function(user) {
            var tokenData = { access_token: accessToken, refresh_token: refreshToken, user: user };
            localStorage.setItem("sb-ibnpgzmbepieudwalwtv-auth-token", JSON.stringify(tokenData));
            window.history.replaceState({}, "", window.location.pathname);
            showSuccess("با موفقیت وارد شدید!");
          });
        }
      } catch (e) {}
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  window.ICPayments = { createInvoice: createInvoice, showCryptoModal: showCryptoModal, showCard2CardModal: showCard2CardModal, showAuthModal: showAuthModal };
})();
