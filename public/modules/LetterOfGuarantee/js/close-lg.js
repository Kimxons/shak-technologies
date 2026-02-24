(() => {
  if (window.__closeLgLoaded) {
    console.warn("close-lg.js already loaded; skipping duplicate execution.");
    return;
  }
  window.__closeLgLoaded = true;

  const supportedPages = ["close-lg"];
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
      const modalEl = parent?.document?.getElementById("closeLgModal");
      if (parentBootstrap?.Modal && modalEl) {
        parentBootstrap.Modal.getOrCreateInstance(modalEl).hide();
        return true;
      }
    } catch {
      // Ignore cross-frame errors.
    }

    return false;
  };

  document.addEventListener("click", (event) => {
    const actionEl = event.target.closest("[data-close-lg-action]");
    if (!actionEl) return;

    event.preventDefault();

    const action = (actionEl.dataset.closeLgAction || "").trim().toLowerCase();

    if (action === "back") {
      if (!closeParentModalIfPossible()) {
        window.history.back();
      }
      return;
    }

    showToast(`Action '${action}' is a prototype (no backend).`, "info");
  });
})();
