/* IRAN COIN — NOWPayments Integration */
(function () {
  "use strict";

  const NOWPAYMENTS_API = "https://api.nowpayments.io/v1";
  const API_KEY = "3d9590c3-5f68-4e4f-b7ef-33a5958e9510";
  const PUBLIC_KEY = "88YWYPR-VP24XJ8-K5X3A0P-2V6ERKP";

  const PLANS = {
    monthly: { amount: 29, label: "۱ ماهه" },
    quarterly: { amount: 79, label: "۳ ماهه" },
    semiannual: { amount: 149, label: "۶ ماهه" },
    annual: { amount: 249, label: "۱ ساله" },
  };

  const cryptos = [
    { code: "usdttrc20", name: "USDT (TRC20)", icon: "₮" },
    { code: "btc", name: "Bitcoin", icon: "₿" },
    { code: "eth", name: "Ethereum", icon: "Ξ" },
    { code: "usdc", name: "USDC", icon: "$" },
    { code: "ltc", name: "Litecoin", icon: "Ł" },
    { code: "doge", name: "Dogecoin", icon: "Ð" },
  ];

  function getSuccessUrl() {
    return window.location.origin + window.location.pathname.replace("pricing.html", "") + "pricing.html?payment=success";
  }

  function getCancelUrl() {
    return window.location.origin + window.location.pathname.replace("pricing.html", "") + "pricing.html?payment=cancelled";
  }

  async function createInvoice(planId, payCurrency) {
    const plan = PLANS[planId];
    if (!plan) throw new Error("Invalid plan");

    const body = {
      price_amount: plan.amount,
      price_currency: "usd",
      order_id: "irancoin-" + planId + "-" + Date.now(),
      order_description: "IRAN COIN اشتراک " + plan.label,
      success_url: getSuccessUrl(),
      cancel_url: getCancelUrl(),
    };

    if (payCurrency) {
      body.pay_currency = payCurrency;
    }

    const res = await fetch(NOWPAYMENTS_API + "/invoice", {
      method: "POST",
      headers: {
        "x-api-key": API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.message || "Invoice creation failed");
    }

    return res.json();
  }

  function showCryptoModal(planId) {
    const plan = PLANS[planId];
    if (!plan) return;

    const existing = document.getElementById("crypto-modal");
    if (existing) existing.remove();

    const overlay = document.createElement("div");
    overlay.id = "crypto-modal";
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px);animation:fadeIn .2s";

    let cryptoHtml = "";
    cryptos.forEach(function (c) {
      cryptoHtml += '<button class="crypto-opt" data-currency="' + c.code + '" style="display:flex;align-items:center;gap:0.75rem;padding:0.875rem 1.25rem;border-radius:0.75rem;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.1);color:white;font-size:0.9375rem;cursor:pointer;transition:all .2s;width:100%;text-align:right;font-family:inherit"><span style="width:2.25rem;height:2.25rem;border-radius:0.5rem;background:var(--grad-brand);display:grid;place-items:center;font-size:1rem;flex-shrink:0">' + c.icon + '</span><span style="flex:1">' + c.name + '</span><span style="color:rgba(255,255,255,0.4);font-size:0.75rem">انتخاب</span></button>';
    });

    overlay.innerHTML = '<div style="background:linear-gradient(160deg,#1a1040,#0f172a);border-radius:1.25rem;border:1px solid rgba(124,58,237,0.3);padding:2rem;max-width:24rem;width:90%;box-shadow:0 25px 60px rgba(0,0,0,0.5)"><div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:1.5rem"><h3 style="color:white;font-size:1.125rem;font-weight:700;margin:0">انتخاب ارز دیجیتال</h3><button id="crypto-close" style="background:none;border:none;color:rgba(255,255,255,0.5);font-size:1.5rem;cursor:pointer;padding:0.25rem">&times;</button></div><div style="margin-bottom:1rem;padding:0.75rem 1rem;border-radius:0.75rem;background:rgba(124,58,237,0.1);border:1px solid rgba(124,58,237,0.2)"><div style="color:rgba(255,255,255,0.6);font-size:0.75rem;margin-bottom:0.25rem">پلن انتخابی</div><div style="color:white;font-weight:600">' + plan.label + ' — $' + plan.amount + '</div></div><div style="display:grid;gap:0.5rem">' + cryptoHtml + '</div><p style="color:rgba(255,255,255,0.4);font-size:0.75rem;text-align:center;margin-top:1rem">پرداخت از طریق NOWPayments — امن و رمزنگاری‌شده</p></div>';

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
            btn.innerHTML = '<span style="width:2.25rem;height:2.25rem;border-radius:0.5rem;background:var(--grad-brand);display:grid;place-items:center;font-size:1rem;flex-shrink:0">' + btn.querySelector("span").textContent + '</span><span style="flex:1">' + btn.textContent + '</span><span style="color:rgba(255,255,255,0.4);font-size:0.75rem">انتخاب</span>';
          });
      });
    });
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
    }
  }

  function showPaymentResult(status) {
    var overlay = document.createElement("div");
    overlay.style.cssText = "position:fixed;inset:0;z-index:9999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.6);backdrop-filter:blur(8px)";

    var isSuccess = status === "success";
    overlay.innerHTML = '<div style="background:linear-gradient(160deg,#1a1040,#0f172a);border-radius:1.25rem;border:1px solid ' + (isSuccess ? "rgba(16,185,129,0.3)" : "rgba(239,68,68,0.3)") + ';padding:2.5rem;max-width:22rem;width:90%;text-align:center;box-shadow:0 25px 60px rgba(0,0,0,0.5)"><div style="font-size:3rem;margin-bottom:1rem">' + (isSuccess ? "✅" : "❌") + '</div><h3 style="color:white;font-size:1.25rem;font-weight:700;margin:0 0 0.5rem">' + (isSuccess ? "پرداخت موفق!" : "پرداخت لغو شد") + '</h3><p style="color:rgba(255,255,255,0.6);font-size:0.875rem;margin:0 0 1.5rem">' + (isSuccess ? "اشتراک شما با موفقیت فعال شد." : "تراکنش لغو شده است. می‌توانید دوباره تلاش کنید.") + '</p><button onclick="this.closest(\'div[style]\').parentElement.remove();window.history.replaceState({},\'\',window.location.pathname)" style="background:var(--grad-brand);color:white;border:none;padding:0.75rem 2rem;border-radius:0.75rem;font-weight:600;cursor:pointer;font-size:0.9375rem;font-family:inherit">بستن</button></div>';

    document.body.appendChild(overlay);
    window.history.replaceState({}, "", window.location.pathname);
  }

  document.addEventListener("DOMContentLoaded", init);
})();
