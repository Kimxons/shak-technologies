(() => {
  if (window.__kairoRecurringDepositLoaded) return;
  window.__kairoRecurringDepositLoaded = true;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function setToast(message, variant = "info") {
    const toast = qs("#rdToast");
    if (!toast) return;
    toast.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    toast.classList.add(`alert-${variant}`);
    toast.textContent = message;
    window.setTimeout(() => toast.classList.add("d-none"), 2000);
  }

  function navigateTo(page) {
    window.location.href = page;
  }

  function openDashboardModal(modalId) {
    if (!modalId) return false;

    const modalOptions = {
      backdrop: false,
      focus: false,
      keyboard: true
    };

    const tryOpenInWindow = (targetWindow) => {
      if (!targetWindow) return false;
      const targetBootstrap = targetWindow.bootstrap;
      if (!targetBootstrap?.Modal) return false;

      let modalEl = null;
      try {
        modalEl = targetWindow.document?.getElementById(modalId) || null;
      } catch {
        return false;
      }
      if (!modalEl) return false;

      const instance = targetBootstrap.Modal.getOrCreateInstance(modalEl, modalOptions);
      instance.show();
      return true;
    };

    if (tryOpenInWindow(window)) return true;

    const visited = new Set();
    let current = window;
    while (current) {
      let parent = null;
      try {
        parent = current.parent;
      } catch {
        break;
      }
      if (!parent || parent === current || visited.has(parent)) break;
      visited.add(parent);
      if (tryOpenInWindow(parent)) return true;
      current = parent;
    }

    return false;
  }

  function findHostingLegacyModal() {
    let currentWindow = window;

    for (let depth = 0; depth < 6; depth += 1) {
      if (!currentWindow.parent || currentWindow.parent === currentWindow) return null;

      try {
        const iframes = Array.from(
          currentWindow.parent.document.querySelectorAll("iframe.legacy-modal__iframe")
        );
        const hostingFrame = iframes.find((frame) => frame.contentWindow === currentWindow);
        if (hostingFrame) {
          return hostingFrame.closest(".legacy-modal");
        }
      } catch {
        return null;
      }

      currentWindow = currentWindow.parent;
    }

    return null;
  }

  function triggerHostingModalWindowAction(action) {
    const modalEl = findHostingLegacyModal();
    if (!modalEl) return false;
    const control = modalEl.querySelector(`[data-window-action="${action}"]`);
    if (!control) return false;
    control.click();
    return true;
  }

  function markEmbeddedIfHosted() {
    const modalEl = findHostingLegacyModal();
    if (!modalEl) return;
    document.body.classList.add("rd-embedded");
  }

  function exitToDashboard() {
    const path = window.location.pathname.toLowerCase();
    const isInModule = path.includes("/modules/recurring-deposit/");
    navigateTo(isInModule ? "../../dashboard.html" : "dashboard.html");
  }

  function bindNav() {
    qsa("[data-rd-nav]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const target = (btn.getAttribute("data-rd-nav") || "").trim().toLowerCase();
        if (target === "application") {
          navigateTo("recurring-deposits-application.html");
          return;
        }
        if (target === "approval") {
          navigateTo("recurring-deposits-approval.html");
          return;
        }
        if (target === "maintenance") {
          navigateTo("recurring-maintenance.html");
          return;
        }
        if (target === "close-receipt" || target === "closereceipt") {
          // Close Receipt must be a standalone popup window (dashboard modal),
          // launched from Maintenance -> DataEntry.
          if (openDashboardModal("closeReceiptModal")) return;
          // Fallback if the host page doesn't have the modal (e.g. opened directly).
          navigateTo("close-receipt.html");
          return;
        }
        if (target === "rd-schedule" || target === "schedule" || target === "rdschedule") {
          if (openDashboardModal("rdScheduleModal")) return;
          navigateTo("rd-schedule.html");
          return;
        }
        if (target === "rd-portfolio" || target === "portfolio" || target === "rdportfolio") {
          if (openDashboardModal("rdPortfolioModal")) return;
          navigateTo("rd-portfolio.html");
          return;
        }
        setToast("This option is not wired yet.", "warning");
      });
    });
  }

  function bindActions() {
    qsa("[data-rd-action]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const action = (btn.getAttribute("data-rd-action") || "").trim().toLowerCase();

        if (action === "back") {
          if (triggerHostingModalWindowAction("close")) return;
          exitToDashboard();
          return;
        }

        if (action === "exit") {
          if (triggerHostingModalWindowAction("close")) return;
          exitToDashboard();
          return;
        }

        if (action === "close") {
          if (triggerHostingModalWindowAction("close")) return;
          exitToDashboard();
          return;
        }

        if (action === "minimize") {
          if (triggerHostingModalWindowAction("minimize")) return;
          exitToDashboard();
          return;
        }

        if (action === "maximize") {
          if (triggerHostingModalWindowAction("maximize")) return;
          document.body.classList.toggle("rd-window-maximized");
          return;
        }

        if (action === "nav-prev" || action === "nav-next") {
          setToast("Navigation not wired yet.", "info");
          return;
        }

        if (action === "search") {
          setToast("Search opened (stub).", "info");
          return;
        }

        if (action === "add" || action === "edit") {
          setToast(`${action.toUpperCase()} mode (stub).`, "info");
          const save = qs('[data-rd-action="save"]');
          const cancel = qs('[data-rd-action="cancel"]');
          if (save) save.disabled = false;
          if (cancel) cancel.disabled = false;
          return;
        }

        if (action === "save") {
          setToast("Saved (stub).", "success");
          btn.disabled = true;
          const cancel = qs('[data-rd-action="cancel"]');
          if (cancel) cancel.disabled = true;
          return;
        }

        if (action === "cancel") {
          setToast("Cancelled.", "info");
          btn.disabled = true;
          const save = qs('[data-rd-action="save"]');
          if (save) save.disabled = true;
          return;
        }

        if (action === "approve" || action === "reject" || action === "view") {
          setToast(`${action} (stub).`, "info");
          return;
        }

        setToast("Action not wired yet.", "warning");
      });
    });
  }

  // Mark early (scripts are loaded at the end of <body> for these pages).
  markEmbeddedIfHosted();

  window.addEventListener("load", () => {
    bindNav();
    bindActions();
  });
})();
