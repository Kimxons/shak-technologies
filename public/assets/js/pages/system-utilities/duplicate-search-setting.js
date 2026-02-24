(() => {
  if (window.__kairoDuplicateSearchSettingLoaded) return;
  window.__kairoDuplicateSearchSettingLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update",
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
    const toast = qs("#dssToast");
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

    const form = qs("#dss-form");
    if (!form) return;

    const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

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

    const saveBtn = qs('[data-dss-action="save"]');
    const cancelBtn = qs('[data-dss-action="cancel"]');
    if (saveBtn) saveBtn.disabled = !isEditable;
    if (cancelBtn) cancelBtn.disabled = !isEditable;

    // Back is typically enabled after a list/view-all navigation.
    const backBtn = qs('[data-dss-action="back"]');
    if (backBtn) backBtn.disabled = true;
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
    qs('[data-dss-action="save"]')?.addEventListener("click", () => {
      if (state.mode === MODES.VIEW) {
        setToast("Switch to Add/Edit before saving.", "warning");
        return;
      }
      setToast("Duplicate search setting saved.", "success");
      setMode(MODES.VIEW);
    });

    qs('[data-dss-action="cancel"]')?.addEventListener("click", () => {
      setToast("Cancelled.", "info");
      setMode(MODES.VIEW);
    });

    qs('[data-dss-action="delete"]')?.addEventListener("click", () => {
      setToast("Delete requested (stub).", "warning");
    });

    qs('[data-dss-action="view-all"]')?.addEventListener("click", () => {
      setToast("View All opened (stub).", "info");
      const backBtn = qs('[data-dss-action="back"]');
      if (backBtn) backBtn.disabled = false;
    });

    qs('[data-dss-action="back"]')?.addEventListener("click", () => {
      setToast("Back (stub).", "info");
      const backBtn = qs('[data-dss-action="back"]');
      if (backBtn) backBtn.disabled = true;
    });

    qs('[data-dss-action="search-key"]')?.addEventListener("click", () => {
      setToast("Search opened (stub).", "info");
    });
  }

  window.addEventListener("load", () => {
    bindModeButtons();
    bindActions();
    setMode(MODES.VIEW);
  });
})();
