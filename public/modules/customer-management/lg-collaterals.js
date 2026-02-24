document.addEventListener("DOMContentLoaded", () => {
  const MODAL_ID = "lgCollateralsModal";

  const els = {
    statusText: document.getElementById("statusText"),
    closeX: document.getElementById("closeX"),
    backBtn: document.getElementById("backBtn"),
    saveBtn: document.getElementById("saveBtn"),
    cancelBtn: document.getElementById("cancelBtn"),
    deleteBtn: document.getElementById("deleteBtn"),
    collateralLookup: document.getElementById("collateralLookup")
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
      setStatus("");
      return;
    }

    if (mode === "add" || mode === "edit") {
      setEditable(true);
      setStatus(mode === "add" ? "Add mode" : "Edit mode");
    }
  });

  els.saveBtn?.addEventListener("click", () => {
    setEditable(false);
    setStatus("Saved");
  });

  els.cancelBtn?.addEventListener("click", () => {
    setEditable(false);
    setStatus("Canceled");
  });

  els.deleteBtn?.addEventListener("click", () => {
    alert("Delete is a prototype.");
    setStatus("Delete is a prototype");
  });

  els.collateralLookup?.addEventListener("click", () => {
    alert("Collateral lookup is a placeholder in this prototype.");
    setStatus("Lookup is a prototype");
  });

  els.backBtn?.addEventListener("click", closeSelf);
  els.closeX?.addEventListener("click", closeSelf);

  setEditable(false);
  setStatus("");
});
