/* IRAN COIN — NOWPayments via Supabase Edge Functions */
(function () {
  "use strict";

  var PLANS = {
    "1m":  { amount: 29,  label: "۱ ماهه" },
    "3m":  { amount: 79,  label: "۳ ماهه" },
    "6m":  { amount: 149, label: "۶ ماهه" },
    "1yr": { amount: 249, label: "۱ ساله" },
  };

  var cryptos = [
    { code: "usdttrc20", name: "USDT (TRC20)", icon: "₮" },
    { code: "btc", name: "Bitcoin", icon: "₿" },
    { code: "eth", name: "Ethereum", icon: "Ξ" },
    { code: "usdc", name: "USDC", icon: "$" },
    { code: "ltc", name: "Litecoin", icon: "Ł" },
    { code: "doge", name: "Dogecoin", icon: "Ð" },
  ];

  function getApiBase() {
    return (window.IC && window.IC.supabase && window.IC.supabase.functionsUrl)
      || "https://ibnpgzmbepieudwalwtv.supabase.co/functions/v1";
  }

  function getAnonKey() {
    return (window.IC && window.IC.supabase && window.IC.supabase.anonKey) || "";
  }

  function getUserToken() {
    try {
      var raw = localStorage.getItem("sb-ibnpgzmbepieudwalwtv-auth-token");
      if (raw) {
        var parsed = JSON.parse(raw);
        return parsed.access_token || "";
      }
    } catch (e) {}
    return "";
  }

  async function createInvoice(planId, payCurrency) {
    var plan = PLANS[planId];
    if (!plan) throw new Error("Invalid plan");

    var token = getUserToken();
    var user_email = "";
    var user_name = "";

    try {
      var raw = localStorage.getItem("sb-ibnpgzmbepieudwalwtv-auth-token");
      if (raw) {
        var parsed = JSON.parse(raw);
        if (parsed.user) {
          user_email = parsed.user.email || "";
          user_name = parsed.user.user_metadata && parsed.user.user_metadata.full_name || "";
        }
      }
    } catch (e) {}

    var body = {
      plan_id: planId,
      pay_currency: payCurrency || "usdttrc20",
      user_email: user_email,
      user_name: user_name,
    };

    var headers = {
      "Content-Type": "application/json",
      "Authorization": "Bearer " + (token || getAnonKey()),
      "apikey": getAnonKey(),
    };

    var res = await fetch(getApiBase() + "/create-invoice", {
      method: "POST",
      headers: headers,
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      var err = await res.json().catch(function () { return {}; });
      throw new Error(err.error || "Invoice creation failed");
    }

    return res.json();
  }

  async function checkPayment(invoiceId) {
    var token = getUserToken();
    var headers = {
      "Content-Type": "application/json",
      "apikey": getAnonKey(),
    };
    if (token) headers["Authorization"] = "Bearer " + token;

    var res = await fetch(getApiBase() + "/check-payment?invoice_id=" + invoiceId, {
      method: "GET",
      headers: headers,
    });

    if (!res.ok) return null;
    return res.json();
  }

  function showCryptoModal(planId) {
    var plan = PLANS[planId];
    if (!plan) return;

    var existing = document.getElementById("crypto-modal");
    if (existing) existing.remove();

    var overlay = document.createElement("div");
    overlay.id = "crypto-modal";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);animation:fadeIn .2s";

    var cryptoHtml = "";
    cryptos.forEach(function (c) {
      cryptoHtml += '<button class="crypto-opt" data-currency="' + c.code + '" style="display:flex;align-items:center;gap:0.75rem;padding:0.875rem 1.25rem;border-radius:0.75rem;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:white;font-size:0.9375rem;cursor:pointer;transition:all .2s;width:100%;text-align:right;font-family:inherit"><span style="width:2.25rem;height:2.25rem;border-radius:0.5rem;background:var(--grad-brand);display:grid;place-items:center;font-size:1rem;flex-shrink:0">' + c.icon + '</span><span style="flex:1">' + c.name + '</span><span style="color:rgba(255,255,255,0.4);font-size:0.75rem">انتخاب</span></button>';
    });

    overlay.innerHTML = '<div style="background:linear-gradient(160deg,#1a1040,#0f172a);border-radius:1.25rem;border:1px solid rgba(124,58,237,0.3);padding:2rem;max-width:24rem;width:90%;box-shadow:0 25px 60px rgba(0,0,0,0.5)"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem"><h3 style="color:white;font-size:1.125rem;font-weight:700;margin:0">انتخاب ارز دیجیتال</h3><button id="crypto-close" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:1.5rem;cursor:pointer;padding:0.25rem">&times;</button></div><div style="margin-bottom:1rem;padding:0.75rem 1rem;border-radius:0.75rem;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2)"><div style="color:rgba(255,255,255,0.6);font-size:0.75rem;margin-bottom:0.25rem">پلن انتخابی</div><div style="color:white;font-weight:600">' + plan.label + " — $" + plan.amount + '</div></div><div style="display:grid;gap:0.5rem">' + cryptoHtml + '</div><p style="color:rgba(255,255,255,0.4);font-size:0.75rem;text-align:center;margin-top:1rem">پرداخت از طریق NOWPayments — امن و رمزنگاری‌شده</p></div>';

    document.body.appendChild(overlay);

    overlay.querySelector("#crypto-close").addEventListener("click", function () {
      overlay.remove();
    });

    overlay.addEventListener("click", function (e) {
      if (e.target === overlay) overlay.remove();
    });

    overlay.querySelectorAll(".crypto-opt").forEach(function (btn) {
      btn.addEventListener("mouseenter", function () {
        btn.style.background = "rgba(124,58,237,0.2)";
        btn.style.borderColor = "rgba(124,58,237,0.4)";
      });
      btn.addEventListener("mouseleave", function () {
        btn.style.background = "rgba(255,255,255,0.06)";
        btn.style.borderColor = "rgba(255,255,255,0.1)";
      });
      btn.addEventListener("click", function () {
        var currency = btn.dataset.currency;
        btn.innerHTML = '<span style="flex:1;text-align:center;color:rgba(255,255,255,0.6)">در حال ایجاد فاکتور...</span>';
        btn.disabled = true;

        createInvoice(planId, currency)
          .then(function (data) {
            if (data.invoice_url) {
              window.location.href = data.invoice_url;
            } else {
              throw new Error("No invoice URL");
            }
          })
          .catch(function (err) {
            alert("خطا در ایجاد فاکتور: " + err.message);
            btn.disabled = false;
          });
      });
    });
  }

  function showPaymentResult(status) {
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px)";

    var isSuccess = status === "success";
    var bgColor = isSuccess ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)";
    var icon = isSuccess ? "✅" : "❌";
    var title = isSuccess ? "پرداخت موفق!" : "پرداخت لغو شد";
    var desc = isSuccess
      ? "اشتراک شما با موفقیت فعال شد. ایمیل تایید برای شما ارسال شد."
      : "تراکنش لغو شده است. می‌توانید دوباره تلاش کنید.";

    overlay.innerHTML = '<div style="background:linear-gradient(160deg,#1a1040,#0f172a);border-radius:1.25rem;border:1px solid ' + bgColor + ';padding:2.5rem;max-width:22rem;width:90%;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.5)"><div style="font-size:3rem;margin-bottom:1rem">' + icon + '</div><h3 style="color:white;font-size:1.25rem;font-weight:700;margin:0 0 0.5rem">' + title + '</h3><p style="color:rgba(255,255,255,0.6);font-size:0.875rem;margin:0 0 1.5rem">' + desc + '</p><button onclick="this.closest(\'div[style]\').parentElement.remove();window.history.replaceState({},\'\',window.location.pathname)" style="background:var(--grad-brand);color:white;border:none;padding:0.75rem 2rem;border-radius:0.75rem;font-weight:600;cursor:pointer;font-size:0.9375rem;font-family:inherit">بستن</button></div>';

    document.body.appendChild(overlay);
    window.history.replaceState({}, "", window.location.pathname);
  }

  function showPaymentPending() {
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px)";

    overlay.innerHTML = '<div style="background:linear-gradient(160deg,#1a1040,#0f172a);border-radius:1.25rem;border:1px solid rgba(251,191,36,0.3);padding:2.5rem;max-width:22rem;width:90%;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.5)"><div style="font-size:3rem;margin-bottom:1rem">⏳</div><h3 style="color:white;font-size:1.25rem;font-weight:700;margin:0 0 0.5rem">پرداخت در انتظار تایید</h3><p style="color:rgba(255,255,255,0.6);font-size:0.875rem;margin:0 0 1.5rem">تراکنش شما در حال تایید است. معمولاً ۱ تا ۳۰ دقیقه طول می‌کشد. ایمیل تایید برای شما ارسال خواهد شد.</p><button onclick="this.closest(\'div[style]\').parentElement.remove()" style="background:var(--grad-brand);color:white;border:none;padding:0.75rem 2rem;border-radius:0.75rem;font-weight:600;cursor:pointer;font-size:0.9375rem;font-family:inherit">بستن</button></div>';

    document.body.appendChild(overlay);
    window.history.replaceState({}, "", window.location.pathname);
  }

  function init() {
    document.querySelectorAll("[data-crypto-pay]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var planId = btn.dataset.cryptoPay;
        showCryptoModal(planId);
      });
    });

    var params = new URLSearchParams(window.location.search);
    if (params.get("payment") === "success") {
      showPaymentResult("success");
    } else if (params.get("payment") === "cancelled") {
      showPaymentResult("cancelled");
    } else if (params.get("payment") === "pending") {
      showPaymentPending();
    }
  }

  document.addEventListener("DOMContentLoaded", init);

  window.ICPayments = { createInvoice: createInvoice, checkPayment: checkPayment };
})();
