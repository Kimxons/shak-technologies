document.addEventListener('DOMContentLoaded', () => {
  const MODAL_ID = 'lcDiscrepancyChargesModal';
  const closeX = document.getElementById('closeX');

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

  closeX?.addEventListener('click', closeSelf);
});
