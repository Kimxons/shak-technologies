(() => {
  if (window.__lgDiscrepanciesLoaded) {
    console.warn("lg-discrepancies.js already loaded; skipping duplicate execution.");
    return;
  }
  window.__lgDiscrepanciesLoaded = true;

  const supportedPages = ["lg-discrepancies"];
  const activePage = document.body?.dataset?.page;
  if (!supportedPages.includes(activePage)) {
    return;
  }

  const toast = document.getElementById("formToast");

  const showToast = (message, variant = "success") => {
    if (!toast) return;
    toast.classList.remove("d-none", "alert-success", "alert-danger", "alert-info", "alert-warning");
    toast.classList.add(`alert-${variant}`);
    toast.textContent = message;
    window.setTimeout(() => toast.classList.add("d-none"), 1800);
  };

  const closeParentModalIfPossible = () => {
    try {
      const parent = window.parent;
      const parentBootstrap = parent?.bootstrap;
      const modalEl = parent?.document?.getElementById("lgDiscrepanciesModal");
      if (parentBootstrap?.Modal && modalEl) {
        parentBootstrap.Modal.getOrCreateInstance(modalEl).hide();
        return true;
      }
    } catch {
      // Ignore cross-frame errors.
    }

    return false;
  };

  document.addEventListener(
    "click",
    (event) => {
      const lookupEl = event.target.closest("[data-lg-discrepancies-lookup]");
      if (lookupEl) {
        event.preventDefault();
        const key = (lookupEl.dataset.lgDiscrepanciesLookup || "").trim();
        showToast(`Lookup '${key}' is a prototype (no backend).`, "info");
        return;
      }

      const actionEl = event.target.closest("[data-lg-discrepancies-action]");
      if (!actionEl) return;

      event.preventDefault();

      const action = (actionEl.dataset.lgDiscrepanciesAction || "").trim().toLowerCase();

      if (action === "browse-image") {
        document.getElementById("DocumentImageFile")?.click();
        return;
      }

      if (action === "cancel") {
        if (!closeParentModalIfPossible()) {
          window.history.back();
        }
        return;
      }

      showToast(`Action '${action}' is a prototype (no backend).`, "info");
    },
    true
  );

  document.getElementById("DocumentImageFile")?.addEventListener("change", (event) => {
    const input = event.target;
    const file = input?.files?.[0];
    const nameField = document.getElementById("DocumentImageName");
    if (nameField) {
      nameField.value = file ? file.name : "";
    }
  });
})();
