document.addEventListener("DOMContentLoaded", () => {
  const MODAL_ID = "guaranteeClaimModal";

  const els = {
    statusText: document.getElementById("statusText"),
    closeX: document.getElementById("closeX"),
    backBtn: document.getElementById("backBtn"),
    saveBtn: document.getElementById("saveBtn"),
    approveBtn: document.getElementById("approveBtn"),
    cancelBtn: document.getElementById("cancelBtn"),
    applicationLookup: document.getElementById("applicationLookup"),
    loanProductLookup: document.getElementById("loanProductLookup")
  };

  const setStatus = (text) => {
    if (!els.statusText) return;
    els.statusText.textContent = text || "";
  };

  const setEditable = (enabled) => {
    document.querySelectorAll('[data-editable="true"]').forEach((el) => {
      el.disabled = !enabled;
    });
    if (els.saveBtn) els.saveBtn.disabled = !enabled;
    if (els.cancelBtn) els.cancelBtn.disabled = !enabled;
    if (els.approveBtn) els.approveBtn.disabled = enabled; // approve only after save in this prototype
  };

  const closeSelf = () => {
    try {
      const parent = window.parent;
      const modalEl = parent?.document?.getElementById(MODAL_ID);
      const Modal = parent?.bootstrap?.Modal;
      if (modalEl && Modal) {
        (Modal.getInstance(modalEl) || Modal.getOrCreateInstance(modalEl)).hide();
        return;
      }
    } catch {
      // ignore
    }

    try {
      window.close();
    } catch {
      // ignore
    }
  };

  document.addEventListener("click", (event) => {
    const modeBtn = event.target.closest("[data-mode]");
    if (!modeBtn) return;

    const mode = (modeBtn.getAttribute("data-mode") || "view").toLowerCase();
    if (mode === "view") {
      setEditable(false);
      setStatus("View mode");
      return;
    }

    if (mode === "add") {
      setEditable(true);
      setStatus("Add mode");
    }
  });

  els.saveBtn?.addEventListener("click", () => {
    setEditable(false);
    if (els.approveBtn) els.approveBtn.disabled = false;
    setStatus("Saved");
  });

  els.approveBtn?.addEventListener("click", () => {
    setStatus("Approved (prototype)");
    alert("Approve is a prototype.");
  });

  els.cancelBtn?.addEventListener("click", () => {
    try {
      document.querySelector("form")?.reset?.();
    } catch {
      // ignore
    }
    setEditable(false);
    setStatus("Canceled");
  });

  els.applicationLookup?.addEventListener("click", () => {
    alert("Application lookup is a placeholder in this prototype.");
  });

  els.loanProductLookup?.addEventListener("click", () => {
    alert("Loan product lookup is a placeholder in this prototype.");
  });

  els.backBtn?.addEventListener("click", closeSelf);
  els.closeX?.addEventListener("click", closeSelf);

  setEditable(false);
  setStatus("");
});
