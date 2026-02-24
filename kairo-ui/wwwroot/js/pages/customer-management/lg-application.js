(function (global) {
  if (global.__LGApplicationLoaded) {
    console.warn("lg-application.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LGApplicationLoaded = true;

  const PAGE_ATTR = "data-page";
  const SUPPORTED_PAGES = ["lg-application"];

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

  const setMode = (form, mode) => {
    const normalized = (mode || "view").toLowerCase();
    form.dataset.mode = normalized;

    const isEditable = normalized === "add" || normalized === "edit";
    form.querySelectorAll('[data-editable="true"]').forEach((el) => {
      el.disabled = !isEditable;
    });

    const saveBtn = form.querySelector('[data-lg-action="save"]');
    const cancelBtn = form.querySelector('[data-lg-action="cancel"]');
    if (saveBtn) saveBtn.disabled = !isEditable;
    if (cancelBtn) cancelBtn.disabled = !isEditable;

    form.querySelectorAll('[data-lg-mode]').forEach((btn) => {
      const btnMode = (btn.getAttribute("data-lg-mode") || "").toLowerCase();
      btn.classList.toggle("is-active", btnMode === normalized);
      btn.setAttribute("aria-pressed", btnMode === normalized ? "true" : "false");
    });
  };

  const scrollToTarget = (selector) => {
    if (!selector) return;
    const el = document.querySelector(selector);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const openParentModal = (modalId, fallbackUrl) => {
    if (!modalId) return false;

    try {
      const parent = window.parent;
      const parentBootstrap = parent?.bootstrap;
      const modalEl = parent?.document?.getElementById(modalId);
      if (parentBootstrap?.Modal && modalEl) {
        parentBootstrap.Modal.getOrCreateInstance(modalEl, {
          backdrop: false,
          focus: false,
          keyboard: true
        }).show();
        return true;
      }
    } catch {
      // Ignore cross-frame errors.
    }

    if (fallbackUrl) {
      window.open(fallbackUrl, "_blank", "noopener,noreferrer");
      return true;
    }

    return false;
  };

  const init = () => {
    const pageId = document.body?.getAttribute(PAGE_ATTR) || "";
    if (!SUPPORTED_PAGES.includes(pageId)) return;

    const form = document.getElementById("lg-application-form");
    if (!form) return;

    // Capture-phase delegation so submenu clicks aren't swallowed by other handlers.
    document.addEventListener(
      "click",
      (event) => {
        const target = event.target;
        const modalOpener = target?.closest?.("[data-open-parent-modal]");
        if (!modalOpener) return;

        event.preventDefault();
        event.stopPropagation();

        const modalId = modalOpener.getAttribute("data-open-parent-modal");
        const fallbackUrl = modalId === "lgDocumentsModal"
          ? new URL("../LetterOfGuarantee/form/lg-documents.html", window.location.href).href
          : modalId === "lgGuarantorsModal"
            ? new URL("../LetterOfGuarantee/form/lg-guarantors.html", window.location.href).href
            : modalId === "lgNotesModal"
              ? new URL("../LetterOfGuarantee/form/lg-notes.html", window.location.href).href
            : undefined;
        openParentModal(modalId, fallbackUrl);
      },
      true
    );

    setMode(form, "view");

    form.addEventListener("click", (event) => {
      const scrollBtn = event.target.closest('[data-scroll-target]');
      if (scrollBtn) {
        scrollToTarget(scrollBtn.getAttribute("data-scroll-target"));
        return;
      }

      const navBtn = event.target.closest('[data-nav-action]');
      if (navBtn) {
        setToast("Navigation is not wired yet.", "info");
        return;
      }

      const lookupBtn = event.target.closest('[data-lookup]');
      if (lookupBtn) {
        setToast("Lookup is not wired yet.", "info");
        return;
      }

      const modeBtn = event.target.closest('[data-lg-mode]');
      if (modeBtn) {
        hideToast();
        setMode(form, modeBtn.getAttribute("data-lg-mode"));
        return;
      }

      const actionBtn = event.target.closest('[data-lg-action]');
      if (!actionBtn) return;

      const action = (actionBtn.getAttribute("data-lg-action") || "").toLowerCase();
      hideToast();

      if (action === "delete") {
        setToast("Delete is not available yet.", "warning");
        return;
      }

      if (action === "save") {
        setMode(form, "view");
        setToast("Saved.", "success");
        return;
      }

      if (action === "cancel") {
        form.reset();
        setMode(form, "view");
        setToast("Changes discarded.", "warning");
      }
    });
  };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})(window);
