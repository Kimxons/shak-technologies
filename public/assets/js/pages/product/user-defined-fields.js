(() => {
  if (window.__kairoProductUserDefinedFieldsLoaded) return;
  window.__kairoProductUserDefinedFieldsLoaded = true;

  function qs(sel, root = document) {
    return root.querySelector(sel);
  }

  function setToast(message, variant = "info") {
    const toast = qs("#pudfToast");
    if (!toast) return;
    toast.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    toast.classList.add(`alert-${variant}`);
    toast.textContent = message;
    window.setTimeout(() => toast.classList.add("d-none"), 2200);
  }

  function bindActions() {
    qs('[data-pudf-action="back"]')?.addEventListener("click", () => {
      // Back to the main screen.
      window.location.href = "product-maintenance-treasury.html";
    });
  }

  window.addEventListener("load", () => {
    bindActions();
  });
})();
