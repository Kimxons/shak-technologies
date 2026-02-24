(function (global) {
  if (global.__BankParametersLoaded) {
    console.warn("bank-parameters.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__BankParametersLoaded = true;

  const PAGE_ATTR = "data-page";
  const SUPPORTED_PAGES = ["bank-parameters"];

  const setToast = (message, type = "success") => {
    const toast = document.getElementById("formToast");
    if (!toast) return;
    toast.classList.remove("d-none", "alert-success", "alert-danger", "alert-warning", "alert-info");
    toast.classList.add(`alert-${type}`);
    toast.textContent = message;
  };

  const hideToast = () => {
    const toast = document.getElementById("formToast");
    if (!toast) return;
    toast.classList.add("d-none");
    toast.textContent = "";
  };

  const setEditable = (form, isEditable) => {
    form.dataset.mode = isEditable ? "edit" : "view";
    form.querySelectorAll("[data-editable=\"true\"]").forEach((el) => {
      el.disabled = !isEditable;
    });

    const editBtn = form.querySelector("[data-bank-action=\"edit\"]");
    const saveBtn = form.querySelector("[data-bank-action=\"save\"]");
    const cancelBtn = form.querySelector("[data-bank-action=\"cancel\"]");

    if (editBtn) editBtn.disabled = isEditable;
    if (saveBtn) saveBtn.disabled = !isEditable;
    if (cancelBtn) cancelBtn.disabled = !isEditable;
  };

  const init = () => {
    const pageId = document.body?.getAttribute(PAGE_ATTR) || "";
    if (!SUPPORTED_PAGES.includes(pageId)) return;

    const form = document.getElementById("bank-parameters-form");
    if (!form) return;

    // Default: View mode (matches legacy feel)
    setEditable(form, false);

    form.addEventListener("click", (event) => {
      const actionBtn = event.target.closest("[data-bank-action]");
      if (!actionBtn) return;

      const action = (actionBtn.getAttribute("data-bank-action") || "").toLowerCase();
      hideToast();

      if (action === "edit") {
        setEditable(form, true);
        setToast("Edit mode enabled.", "info");
        return;
      }

      if (action === "save") {
        setEditable(form, false);
        setToast("Saved.", "success");
        return;
      }

      if (action === "cancel") {
        form.reset();
        setEditable(form, false);
        setToast("Changes discarded.", "warning");
        return;
      }

      if (action === "back") {
        window.history.back();
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
