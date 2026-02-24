document.addEventListener("DOMContentLoaded", () => {
  const MODAL_ID = "lgAccountStatementModal";

  const els = {
    statusText: document.getElementById("statusText"),
    closeX: document.getElementById("closeX"),
    viewBtn: document.getElementById("viewBtn"),
    printBtn: document.getElementById("printBtn"),
    representBtn: document.getElementById("representBtn"),
    unpayBtn: document.getElementById("unpayBtn"),
    imageBtn: document.getElementById("imageBtn"),
    reverseBtn: document.getElementById("reverseBtn"),
    cancelBtn: document.getElementById("cancelBtn"),
    backBtn: document.getElementById("backBtn")
  };

  const setStatus = (text) => {
    if (!els.statusText) return;
    els.statusText.textContent = text || "";
  };

  const closeSelf = () => {
    // Prefer closing the parent dashboard modal if embedded in an iframe.
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

  els.closeX?.addEventListener("click", closeSelf);
  els.backBtn?.addEventListener("click", closeSelf);

  els.cancelBtn?.addEventListener("click", () => {
    setStatus("");
  });

  const placeholder = (label) => {
    setStatus(`${label} is a prototype`);
    alert(`${label} is a prototype (no backend).`);
  };

  els.viewBtn?.addEventListener("click", () => placeholder("View"));
  els.printBtn?.addEventListener("click", () => placeholder("Print"));
  els.representBtn?.addEventListener("click", () => placeholder("Represent Chq"));
  els.unpayBtn?.addEventListener("click", () => placeholder("Unpay Trx"));
  els.imageBtn?.addEventListener("click", () => placeholder("Image"));
  els.reverseBtn?.addEventListener("click", () => placeholder("Reverse"));

  setStatus("");
});
