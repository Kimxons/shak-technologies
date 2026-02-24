(() => {
  if (window.__kairoChangeOfficerPortfolioLoaded) return;
  window.__kairoChangeOfficerPortfolioLoaded = true;

  const MODES = {
    VIEW: "View",
    CHANGE: "Change",
  };

  const state = {
    mode: MODES.VIEW,
    isBusy: false,
    hasLoaded: false,
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  // ==================== TOAST HELPERS (Kairo Design System) ====================
  function ensureToastContainer() {
    let el = document.querySelector('[data-kairo-toast-container]');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
  }

  function showToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();

    // Limit to one toast at a time - remove existing
    const existingToasts = container.querySelectorAll('.kairo-toast');
    existingToasts.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    toast.appendChild(body);
    container.appendChild(toast);

    const remove = () => {
      try {
        toast.classList.remove('is-show');
        setTimeout(() => toast.remove(), 160);
      } catch {
        // ignore
      }
    };

    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  function showSuccessToast(message) {
    showToast(message, { title: 'Success', variant: 'success', timeoutMs: 3000 });
  }

  function showErrorToast(message) {
    showToast(message, { title: 'Error', variant: 'danger', timeoutMs: 4000 });
  }

  function showWarningToast(message) {
    showToast(message, { title: 'Warning', variant: 'warning', timeoutMs: 3000 });
  }

  function showInfoToast(message) {
    showToast(message, { title: 'Info', variant: 'info', timeoutMs: 3000 });
  }

  function setToast(message, variant = "success") {
    switch (variant) {
      case 'success':
        showSuccessToast(message);
        break;
      case 'danger':
      case 'error':
        showErrorToast(message);
        break;
      case 'warning':
        showWarningToast(message);
        break;
      case 'info':
      default:
        showInfoToast(message);
        break;
    }
  }

  function setButtonDisabled(buttonEl, disabled) {
    if (!buttonEl) return;
    buttonEl.disabled = !!disabled;
    if (disabled) {
      buttonEl.setAttribute("disabled", "");
      buttonEl.setAttribute("aria-disabled", "true");
      buttonEl.classList.add("is-disabled");
    } else {
      buttonEl.removeAttribute("disabled");
      buttonEl.setAttribute("aria-disabled", "false");
      buttonEl.classList.remove("is-disabled");
    }
  }

  function getActionButtons() {
    return {
      view: qs('[data-shell-mode="View"]'),
      change: qs('[data-shell-mode="Change"]'),
      save: qs('[data-cop-action="save"]'),
      cancel: qs('[data-cop-action="cancel"]'),
    };
  }

  function updateActionButtons() {
    const { view, change, save, cancel } = getActionButtons();
    const isEditable = state.mode === MODES.CHANGE;
    const isViewing = state.mode === MODES.VIEW;

    // View: enabled only in VIEW mode (refresh basically)
    setButtonDisabled(view, !isViewing);

    // Change: enabled in VIEW mode
    setButtonDisabled(change, !isViewing);

    // Save: only in Change mode
    setButtonDisabled(save, !isEditable);

    // Cancel: only in Change mode
    setButtonDisabled(cancel, !isEditable);
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const form = qs("#change-officer-portfolio-form");
    if (!form) return;

    const isEditable = nextMode === MODES.CHANGE;

    qsa("input, select, textarea", form).forEach((el) => {
      // Data-always-enabled fields (like search inputs)
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }

      // Keep name fields read-only and potentially disabled depending on requirement.
      // In this module, let's follow the standard: if strictly read-only for display (names),
      // we usually only need to disable inputs that user MIGHT try to edit.
      // But simpler to disable all non-always-enabled.

      // Exception: If we decide some fields are read-only even in edit mode, handling them here:
      if (el.readOnly && !el.classList.contains("bs-input-text") && !el.classList.contains("kairo-branch-control__name")) {
        // keep it disabled if it was meant to be static
      }

      el.disabled = !isEditable;
    });

    // Specifically enable search buttons if needed
    qsa(".btn-lookup", form).forEach((btn) => {
      if (btn.hasAttribute("data-always-enabled")) {
        btn.disabled = false;
      } else {
        btn.disabled = !isEditable;
      }
    });

    updateActionButtons();
  }

  function bindModeButtons() {
    qsa("[data-shell-mode]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const next = btn.getAttribute("data-shell-mode");
        if (!next || !MODES[next.toUpperCase()]) return;
        setMode(MODES[next.toUpperCase()]);
      });
    });
  }

  function bindActions() {
    const saveBtn = qs('[data-cop-action="save"]');
    const cancelBtn = qs('[data-cop-action="cancel"]');

    saveBtn?.addEventListener("click", () => {
      if (state.mode !== MODES.CHANGE) return;
      // Mock save
      setToast("Portfolio transferred successfully.");
      setMode(MODES.VIEW);
    });

    cancelBtn?.addEventListener("click", () => {
      if (state.mode === MODES.CHANGE) {
        setMode(MODES.VIEW);
        setToast("Validation cancelled.", "info");
      }
    });
  }

  window.addEventListener("load", () => {
    bindModeButtons();
    bindActions();
    setMode(MODES.VIEW);

    // Simulate lookup interaction
    const branchLookup = qs("#BranchId + button");
    if (branchLookup) {
      branchLookup.addEventListener("click", () => {
        // If we were implementing full logic, we'd open a modal.
        // For now just fill if empty to simulate selection
        const branchId = qs("#BranchId");
        if (branchId && !branchId.value) {
          branchId.value = "001";
          qs("#BranchName").value = "Head Office";
          setToast("Branch selected (Mock).");
        }
      });
    }
  });
})();

