(function (global) {
  if (global.__LGFacilityApplicationLoaded) {
    console.warn("lg-facility-application.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LGFacilityApplicationLoaded = true;

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

  const PAGE_ATTR = "data-page";
  const SUPPORTED_PAGES = ["lg-facility-application"];

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

  const init = () => {
    const pageId = document.body?.getAttribute(PAGE_ATTR) || "";
    if (!SUPPORTED_PAGES.includes(pageId)) return;

    const form = document.getElementById("lg-facility-application-form");
    if (!form) return;

    setMode(form, "view");

    form.addEventListener("click", (event) => {
      const modalOpener = event.target.closest('[data-open-parent-modal]');
      if (modalOpener) {
        event.preventDefault();
        event.stopPropagation();

        const modalId = modalOpener.getAttribute('data-open-parent-modal');
        const fallbackUrl = modalId === 'lgCollateralsModal'
          ? 'lg-collaterals.html'
          : modalId === 'facilityAuditTrailModal'
            ? 'facility-audit-trail.html'
            : undefined;
        openParentModal(modalId, fallbackUrl);
        return;
      }

      const scrollBtn = event.target.closest('[data-scroll-target]');
      if (scrollBtn) {
        scrollToTarget(scrollBtn.getAttribute("data-scroll-target"));
        return;
      }

      const lookupBtn = event.target.closest('[data-lookup]');
      if (lookupBtn) {
        setToast("Lookup is not wired yet.", "info");
        return;
      }

      const navBtn = event.target.closest('[data-nav-action]');
      if (navBtn) {
        setToast("Navigation is not wired yet.", "info");
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
