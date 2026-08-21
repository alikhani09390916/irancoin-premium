/**
 * auth-modal.js — Shared authentication modal for all pages.
 * Provides show/hide, tab switching, focus trap, Escape to close.
 * Exposes window.showAuthModal() and window.hideAuthModal() globally.
 */
(function () {
  "use strict";

  var modal = null;

  function getModal() {
    if (modal) return modal;
    modal = document.getElementById("auth-modal");
    return modal;
  }

  // ---- Show modal ----
  function showAuthModal(plan) {
    var m = getModal();
    if (!m) return;

    // Update plan display if present
    var planDisplay = document.getElementById("modal-selected-plan");
    if (planDisplay && plan) {
      var names = { starter: "استارتر", professional: "حرفه‌ای", elite: "الیت" };
      planDisplay.textContent = names[plan] || plan;
      planDisplay.style.display = "inline";
    } else if (planDisplay) {
      planDisplay.style.display = "none";
    }

    m.hidden = false;
    requestAnimationFrame(function () {
      m.classList.add("is-active");
      m.setAttribute("aria-modal", "true");
    });

    // Focus first input
    requestAnimationFrame(function () {
      var first = m.querySelector('input:not([disabled]), button:not([type="button"]):not([disabled])');
      if (first) first.focus();
    });
  }

  // ---- Hide modal ----
  function hideAuthModal() {
    var m = getModal();
    if (!m) return;
    m.classList.remove("is-active");
    m.removeAttribute("aria-modal");
    setTimeout(function () { m.hidden = true; }, 300);
  }

  // ---- Switch tab ----
  function switchAuthTab(tabName) {
    var m = getModal();
    if (!m) return;
    var tabs = m.querySelectorAll(".auth-tab");
    var btns = m.querySelectorAll(".auth-tab-switcher button");
    tabs.forEach(function (t) { t.classList.remove("is-active"); });
    btns.forEach(function (b) { b.classList.remove("is-active"); });
    var target = m.querySelector("#" + tabName + "-tab");
    if (target) target.classList.add("is-active");
    var btnTarget = m.querySelector('[data-auth-tab="' + tabName + '"]');
    if (btnTarget) btnTarget.classList.add("is-active");
  }

  // ---- Init ----
  function initAuthModal() {
    var m = getModal();
    if (!m) return;

    // Close button
    var closeBtn = m.querySelector(".close-modal");
    if (closeBtn) {
      closeBtn.addEventListener("click", hideAuthModal);
    }

    // Overlay click to close
    m.addEventListener("click", function (e) {
      if (e.target === m) hideAuthModal();
    });

    // Escape + focus trap
    document.addEventListener("keydown", function (e) {
      if (!m.classList.contains("is-active")) return;
      if (e.key === "Escape") {
        hideAuthModal();
        return;
      }
      if (e.key === "Tab") {
        var focusable = m.querySelectorAll(
          'button:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
        );
        if (!focusable.length) return;
        var first = focusable[0];
        var last = focusable[focusable.length - 1];
        if (e.shiftKey) {
          if (document.activeElement === first) { e.preventDefault(); last.focus(); }
        } else {
          if (document.activeElement === last) { e.preventDefault(); first.focus(); }
        }
      }
    });

    // Tab switcher buttons
    var tabBtns = m.querySelectorAll(".auth-tab-switcher button");
    tabBtns.forEach(function (btn) {
      btn.addEventListener("click", function () {
        switchAuthTab(btn.getAttribute("data-auth-tab"));
      });
    });
  }

  // Expose globally
  window.showAuthModal = showAuthModal;
  window.hideAuthModal = hideAuthModal;
  window.switchAuthTab = switchAuthTab;

  document.addEventListener("DOMContentLoaded", initAuthModal);
})();
