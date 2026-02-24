(() => {
  if (window.__lgMessagesLoaded) {
    console.warn("lg-messages.js already loaded; skipping duplicate execution.");
    return;
  }
  window.__lgMessagesLoaded = true;

  const supportedPages = ["lg-messages"];
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
      const modalEl = parent?.document?.getElementById("lgMessagesModal");
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
      const lookupEl = event.target.closest("[data-lg-messages-lookup]");
      if (lookupEl) {
        event.preventDefault();
        const key = (lookupEl.dataset.lgMessagesLookup || "").trim();
        showToast(`Lookup '${key}' is a prototype (no backend).`, "info");
        return;
      }

      const actionEl = event.target.closest("[data-lg-messages-action]");
      if (!actionEl) return;

      event.preventDefault();

      const action = (actionEl.dataset.lgMessagesAction || "").trim().toLowerCase();
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
})();
