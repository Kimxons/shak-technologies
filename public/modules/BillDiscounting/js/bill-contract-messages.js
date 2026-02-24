(() => {
  if (window.__billContractMessagesLoaded) {
    return;
  }
  window.__billContractMessagesLoaded = true;

  const supportedPages = ["bill-contract-messages"];
  const activePage = document.body?.dataset?.page;
  if (!supportedPages.includes(activePage)) {
    return;
  }

  const toastEl = document.getElementById("billContractMessagesToast");
  const tableBody = document.getElementById("billContractMessagesTableBody");
  const messageBox = document.getElementById("SelectedMessage");

  const showToast = (message, variant = "success") => {
    if (!toastEl) return;
    toastEl.classList.remove("d-none", "alert-success", "alert-danger", "alert-info", "alert-warning");
    toastEl.classList.add(`alert-${variant}`);
    toastEl.textContent = message;
    window.setTimeout(() => toastEl.classList.add("d-none"), 1800);
  };

  const closeParentModalIfPossible = () => {
    try {
      const parent = window.parent;
      const parentBootstrap = parent?.bootstrap;
      const modalId = "billMessagesModal";
      const modalEl = parent?.document?.getElementById(modalId);
      if (parentBootstrap?.Modal && modalEl) {
        parentBootstrap.Modal.getOrCreateInstance(modalEl).hide();
        return true;
      }
    } catch {
      // ignore cross-frame errors
    }

    return false;
  };

  const clearSelectedRow = () => {
    if (!tableBody) return;
    tableBody.querySelectorAll("tr.is-selected").forEach((tr) => tr.classList.remove("is-selected"));
  };

  const isEmptyStateRow = (row) => {
    if (!row) return true;
    return Boolean(row.querySelector("td[colspan]"));
  };

  document.addEventListener("click", (event) => {
    const row = event.target?.closest?.("[data-bill-contract-messages-table] tbody tr");
    if (row) {
      if (isEmptyStateRow(row)) {
        showToast("No messages to select.", "info");
        return;
      }

      clearSelectedRow();
      row.classList.add("is-selected");

      const cells = row.querySelectorAll("td");
      const text = cells?.[3]?.textContent?.trim?.() || "";
      if (messageBox) {
        messageBox.value = text;
      }
      showToast("Message selected (prototype).", "info");
      return;
    }

    const actionButton = event.target?.closest?.("[data-bill-contract-action]");
    if (!actionButton) return;

    event.preventDefault();

    const action = (actionButton.dataset.billContractAction || "").trim().toLowerCase();
    if (action === "back" || action === "cancel") {
      if (!closeParentModalIfPossible()) {
        window.history.back();
      }
      return;
    }

    showToast(`Action '${action}' is a prototype (no backend).`, "info");
  });
})();
