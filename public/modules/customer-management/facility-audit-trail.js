document.addEventListener("DOMContentLoaded", () => {
  const MODAL_ID = "facilityAuditTrailModal";

  const els = {
    closeX: document.getElementById("closeX"),
    cancelBtn: document.getElementById("cancelBtn"),
    viewBtn: document.getElementById("viewBtn"),
    branchLookup: document.getElementById("branchLookup")
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

  els.cancelBtn?.addEventListener("click", closeSelf);
  els.closeX?.addEventListener("click", closeSelf);

  els.viewBtn?.addEventListener("click", () => {
    alert("View is a prototype.");
  });

  els.branchLookup?.addEventListener("click", () => {
    alert("Branch lookup is a placeholder in this prototype.");
  });
});
