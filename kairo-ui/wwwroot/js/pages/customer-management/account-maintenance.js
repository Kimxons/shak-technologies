(function (global) {
  if (global.__AccountMaintenanceLoaded) {
    console.warn("account-maintenance.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__AccountMaintenanceLoaded = true;

  const MODES = {
    VIEW: "View",
    ADD: "Add",
    UPDATE: "Update"
  };

  const setDisabledForFormFields = (form, shouldDisable) => {
    const selector = "input, select, textarea";
    form.querySelectorAll(selector).forEach((field) => {
      if (field.id === "ClientID" || field.id === "ProductID" || field.id === "AccountID") {
        // Keep key identifiers usable in all modes.
        return;
      }
      field.disabled = shouldDisable;
    });
  };

  const setButtonState = (form, mode) => {
    const editBtn = form.querySelector("[data-shell-mode='Update']");
    const saveBtn = form.querySelector("[data-submit-action='save']");
    const cancelBtn = form.querySelector("[data-submit-action='cancel']");

    const isEditEnabled = mode !== MODES.VIEW;
    const isWorkflowEnabled = mode !== MODES.VIEW;

    if (editBtn) editBtn.disabled = !isEditEnabled;
    if (saveBtn) saveBtn.disabled = !isWorkflowEnabled;
    if (cancelBtn) cancelBtn.disabled = !isWorkflowEnabled;
  };

  const applyMode = (form, mode) => {
    const isView = mode === MODES.VIEW;
    setDisabledForFormFields(form, isView);
    setButtonState(form, mode);

    form.querySelectorAll("[data-shell-mode]").forEach((btn) => {
      btn.classList.toggle("is-active", btn.dataset.shellMode === mode);
    });
  };

  const clearNonIdentifierFields = (form) => {
    form.querySelectorAll("input, select, textarea").forEach((field) => {
      if (field.id === "ClientID" || field.id === "ProductID" || field.id === "AccountID") return;
      if (field.type === "checkbox" || field.type === "radio") {
        field.checked = false;
        return;
      }
      if (field.tagName === "SELECT") {
        field.selectedIndex = 0;
        return;
      }
      field.value = "";
    });
  };

  const init = () => {
    const form = document.getElementById("account-form");
    if (!form) return;

    form.querySelectorAll("[data-shell-mode]").forEach((button) => {
      button.addEventListener("click", () => {
        const mode = button.dataset.shellMode;
        if (!mode) return;
        applyMode(form, mode);

        if (mode === MODES.ADD) {
          clearNonIdentifierFields(form);
        }
      });
    });

    const saveBtn = form.querySelector("[data-submit-action='save']");
    saveBtn?.addEventListener("click", () => {
      // UI scaffold only.
      alert("Save is not wired yet.");
    });

    const cancelBtn = form.querySelector("[data-submit-action='cancel']");
    cancelBtn?.addEventListener("click", () => {
      applyMode(form, MODES.VIEW);
    });

    applyMode(form, MODES.VIEW);
  };

  document.addEventListener("DOMContentLoaded", init);
})(window);
