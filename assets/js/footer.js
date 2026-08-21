/**
 * footer.js — shared footer component for all pages.
 * Injects consistent footer HTML. Call initFooter() after DOM ready.
 */
(function () {
  "use strict";

  function initFooter() {
    var existing = document.querySelector(".site-footer");
    if (existing) return; // already present (fallback)

    var footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML =
      '<div class="container">' +
      '<div class="grid">' +
      '<div>' +
      '<a href="./index.html" class="logo-mark" style="font-size:19px;"><span class="lg-iran">Iran</span><span class="lg-coin">Coin</span></a>' +
      '<p class="about" style="margin-top:14px;">پلتفرم پیشرفته معاملات ارز دیجیتال با هوش مصنوعی. هوش، دقت، سرعت و امنیت در خدمت تصمیم‌های مالی شما.</p>' +
      "</div>" +
      "<div>" +
      "<h3>محصول</h3>" +
      '<ul><li><a href="./index.html#agents">هسته هوش مصنوعی</a></li><li><a href="./dashboard.html">داشبورد</a></li><li><a href="./pricing.html">تعرفه‌ها</a></li></ul>' +
      "</div>" +
      "<div>" +
      "<h3>دسترسی سریع</h3>" +
      '<ul><li><a href="./pricing.html">خرید اشتراک</a></li><li><a href="./pricing.html#faq">سوالات متداول</a></li><li><a href="./index.html">صفحه اصلی</a></li></ul>' +
      "</div>" +
      "<div>" +
      "<h3>ارتباط با ما</h3>" +
      '<ul><li><a href="mailto:support@irancoin.ir">پشتیبانی</a></li><li><a href="https://t.me/irancoin" rel="noopener noreferrer" target="_blank">تلگرام</a></li><li><a href="https://instagram.com/irancoin" rel="noopener noreferrer" target="_blank">اینستاگرام</a></li></ul>' +
      "</div>" +
      "</div>" +
      '<div class="bottom">' +
      "<span>© ۱۴۰۵ IranCoin. تمامی حقوق محفوظ است.</span>" +
      "<span>ساخته‌شده با هسته‌ی هوش مصنوعی IranCoin</span>" +
      "</div>" +
      "</div>" +
      "</footer>";

    document.body.appendChild(footer);
  }

  window.initFooter = initFooter;

  document.addEventListener("DOMContentLoaded", function () {
    initFooter();
  });
})();
