(() => {
  if (window.__kairoSystemCodesLoaded) return;
  window.__kairoSystemCodesLoaded = true;

  const MODES = {
    VIEW: "View",
    EDIT: "Edit",
  };

  const state = {
    mode: MODES.VIEW,
  };

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function qsa(sel, root = document) {
    return Array.from(root.querySelectorAll(sel));
  }

  function setToast(message, variant = "info") {
    const toast = qs("#suCodesToast");
    if (!toast) return;
    toast.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    toast.classList.add(`alert-${variant}`);
    toast.textContent = message;
    window.setTimeout(() => toast.classList.add("d-none"), 2200);
  }

  function setMode(nextMode) {
    state.mode = nextMode;

    const pill = qs("[data-page-function-pill]");
    if (pill) pill.textContent = `Mode · ${nextMode}`;

    const form = qs("#su-codes-form");
    if (!form) return;

    const isEditable = nextMode === MODES.EDIT;

    qsa("input, select, textarea, button", form).forEach((el) => {
      if (el.hasAttribute("data-always-enabled")) {
        el.disabled = false;
        return;
      }

      if (el.closest(".cm-legacy-actions")) {
        el.disabled = false;
        return;
      }

      if (el.tagName === "BUTTON") {
        el.disabled = !isEditable;
        return;
      }

      el.disabled = !isEditable;
    });

    const saveBtn = qs('[data-su-action="save"]');
    const cancelBtn = qs('[data-su-action="cancel"]');
    if (saveBtn) saveBtn.disabled = !isEditable;
    if (cancelBtn) cancelBtn.disabled = !isEditable;
  }

  function bindModeButtons() {
    qs('[data-shell-mode="View"]')?.addEventListener("click", () => setMode(MODES.VIEW));
    qs('[data-shell-mode="Update"]')?.addEventListener("click", () => setMode(MODES.EDIT));
  }

  function bindActions() {
    qs('[data-su-action="save"]')?.addEventListener("click", () => {
      if (state.mode !== MODES.EDIT) {
        setToast("Switch to Edit before saving.", "warning");
        return;
      }
      setToast("System codes saved.", "success");
      setMode(MODES.VIEW);
    });

    qs('[data-su-action="cancel"]')?.addEventListener("click", () => {
      setToast("Cancelled.", "info");
      setMode(MODES.VIEW);
    });

  }

  window.addEventListener("load", () => {
    bindModeButtons();
    bindActions();
    setMode(MODES.VIEW);
  });
})();
