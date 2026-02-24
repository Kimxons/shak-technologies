(() => {
  if (window.__billSanctionDetailsLoaded) {
    console.warn("bill-sanction-details.js already loaded; skipping duplicate execution.");
    return;
  }
  window.__billSanctionDetailsLoaded = true;

  const supportedPages = ["bill-sanction-details"];
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
    window.setTimeout(() => toast.classList.add("d-none"), 1500);
  };

  document.addEventListener("click", (event) => {
    const button = event.target.closest("[data-bill-sanction-action]");
    if (!button) return;

    const action = (button.dataset.billSanctionAction || "").trim().toLowerCase();
    if (action !== "back" && action !== "cancel" && action !== "close") return;

    // Prefer closing an inline modal if present, else close parent dashboard modal.
    try {
      const parent = window.parent;
      const candidates = ["billSanctionDetailsInline", "billSanctionDetailsModal"];
      const bootstrapLib = parent?.bootstrap || window.bootstrap || parent?.parent?.bootstrap;
      for (const id of candidates) {
        const el = parent?.document?.getElementById(id);
        if (el) {
          if (bootstrapLib?.Modal) {
            const instance = bootstrapLib.Modal.getInstance(el) || bootstrapLib.Modal.getOrCreateInstance(el);
            if (instance) {
              instance.hide();
              return;
            }
          }
          const closeBtn = el.querySelector('[data-window-action="close"], [data-bs-dismiss="modal"]');
          if (closeBtn) {
            closeBtn.click();
            return;
          }
        }
      }
    } catch (e) {
      console.error("Failed to close parent modal", e);
    }

    // Fallback if opened directly.
    window.history.back();
  });
})();
