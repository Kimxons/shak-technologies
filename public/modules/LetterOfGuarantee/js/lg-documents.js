(function () {
  'use strict';

  const closeParentModalIfPossible = () => {
    try {
      const parent = window.parent;
      const parentBootstrap = parent?.bootstrap;
      const modalEl = parent?.document?.getElementById('lgDocumentsModal');
      if (parentBootstrap?.Modal && modalEl) {
        parentBootstrap.Modal.getOrCreateInstance(modalEl).hide();
        return true;
      }
    } catch {
      // Ignore cross-frame errors.
    }
    return false;
  };

  document.addEventListener('click', (event) => {
    const actionButton = event.target.closest('[data-lg-documents-action]');
    if (!actionButton) return;

    const action = actionButton.getAttribute('data-lg-documents-action');
    if (action === 'cancel') {
      if (!closeParentModalIfPossible()) {
        window.close();
      }
      return;
    }

    const toast = document.getElementById('formToast');
    if (!toast) return;

    toast.classList.remove('d-none', 'alert-success', 'alert-danger');
    toast.classList.add('alert-success');
    toast.textContent = `Action '${action}' is a prototype (no backend).`;

    window.setTimeout(() => {
      toast.classList.add('d-none');
    }, 2000);
  });
})();
