(() => {
  if (window.__availmentSettlementLoaded) {
    console.warn("availment-settlement.js already loaded; skipping duplicate execution.");
    return;
  }
  window.__availmentSettlementLoaded = true;

  const supportedPages = ["availment-settlement"];
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
      const modalEl = parent?.document?.getElementById("availmentSettlementModal");
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
    // Don't interfere with tab buttons - let the tab handler (registered in capture phase) handle them.
    const isTabButton = event.target?.closest?.('[data-bs-toggle="tab"]');
    if (isTabButton) {
      return;
    }

    const docActionEl = event.target.closest("[data-availment-doc-action]");
    if (docActionEl) {
      event.preventDefault();

      const docAction = (docActionEl.dataset.availmentDocAction || "").trim().toLowerCase();
      if (docAction === "browse-image") {
        document.getElementById("DocumentImageFile")?.click();
        return;
      }

      showToast(`Document action '${docAction}' is a prototype (no backend).`, "info");
      return;
    }

    const actionEl = event.target.closest("[data-availment-action]");
    if (!actionEl) return;

    event.preventDefault();

    const action = (actionEl.dataset.availmentAction || "").trim().toLowerCase();

    if (action === "back") {
      if (!closeParentModalIfPossible()) {
        window.history.back();
      }
      return;
    }

    showToast(`Action '${action}' is a prototype (no backend).`, "info");
  });

  // Make Bootstrap tabs work reliably inside iframe/modals.
  // Some pages attach global click handlers that can interfere with Bootstrap's delegated tab toggle.
  // We handle tab clicks in capture phase and either ask Bootstrap to show the tab, or fall back to a minimal toggler.
  const showTabFallback = (tabButton) => {
    if (!tabButton) return;
    const targetSelector = tabButton.getAttribute("data-bs-target") || tabButton.getAttribute("data-target");
    if (!targetSelector) return;
    const targetPane = document.querySelector(targetSelector);
    if (!targetPane) return;

    const tabList = tabButton.closest('[role="tablist"]') || tabButton.closest('.nav');
    if (tabList) {
      tabList.querySelectorAll('[data-bs-toggle="tab"], [role="tab"]').forEach((btn) => {
        btn.classList.remove("active");
        btn.setAttribute("aria-selected", "false");
      });
    }

    tabButton.classList.add("active");
    tabButton.setAttribute("aria-selected", "true");

    const tabContent = targetPane.closest('.tab-content') || document.querySelector('.tab-content');
    if (tabContent) {
      tabContent.querySelectorAll('.tab-pane').forEach((pane) => {
        pane.classList.remove('show', 'active');
      });
    }

    targetPane.classList.add('show', 'active');
  };

  const handleTabTrigger = (event, explicitButton) => {
    const tabButton = explicitButton || event?.target?.closest?.('[data-bs-toggle="tab"]');
    if (!tabButton) return;

    // Tab buttons are type="button" so this mainly guards against other delegated handlers.
    event?.preventDefault?.();

    const resetTabScroll = () => {
      // When users scroll deep in the Settlement tab, switching tabs can appear blank
      // because the scroll position is retained. Reset both the page scroll and any
      // internal scroll container.
      try {
        window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
      } catch {
        window.scrollTo(0, 0);
      }

      if (document.documentElement) {
        document.documentElement.scrollTop = 0;
      }
      if (document.body) {
        document.body.scrollTop = 0;
      }

      const scrollContainer = document.querySelector('.cm-content-scroll');
      if (scrollContainer && 'scrollTop' in scrollContainer) {
        scrollContainer.scrollTop = 0;
      }
    };

    try {
      if (window.bootstrap?.Tab) {
        window.bootstrap.Tab.getOrCreateInstance(tabButton).show();
        window.requestAnimationFrame(resetTabScroll);
        return;
      }
    } catch {
      // ignore
    }

    showTabFallback(tabButton);
    window.requestAnimationFrame(resetTabScroll);
  };

  // Register on window capture so we run before document-level handlers.
  window.addEventListener('click', (event) => handleTabTrigger(event), true);
  // Also register on document capture as a fallback.
  document.addEventListener('click', (event) => handleTabTrigger(event), true);

  // Additionally, bind directly to the known tab buttons (extra reliability).
  ["settlement-tab", "documents-tab"].forEach((id) => {
    const btn = document.getElementById(id);
    if (!btn) return;
    btn.addEventListener('click', (event) => handleTabTrigger(event, btn), true);
  });

  document.getElementById("DocumentImageFile")?.addEventListener("change", (event) => {
    const input = event.target;
    const file = input?.files?.[0];
    const nameField = document.getElementById("DocumentImageName");
    if (nameField) {
      nameField.value = file ? file.name : "";
    }
  });

  const documentsTable = document.getElementById("availmentDocumentsTable");
  const documentsTableBody = document.getElementById("availmentDocumentsTableBody");

  const setSelectedDocumentRow = (row) => {
    if (!documentsTableBody) return;
    documentsTableBody.querySelectorAll("tr.is-selected").forEach((tr) => tr.classList.remove("is-selected"));
    row?.classList?.add?.("is-selected");
  };

  const isEmptyStateRow = (row) => {
    if (!row) return true;
    const onlyCell = row.querySelector("td[colspan]");
    return Boolean(onlyCell);
  };

  if (documentsTable) {
    documentsTable.addEventListener("click", (event) => {
      const row = event.target?.closest?.("tbody tr");
      if (!row) return;

      if (isEmptyStateRow(row)) {
        showToast("No documents to select.", "info");
        return;
      }

      setSelectedDocumentRow(row);
      showToast("Document row selected (prototype).", "info");
    });
  }
})();
