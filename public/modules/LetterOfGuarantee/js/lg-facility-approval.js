(function () {
  'use strict';

  // Prototype screen: no backend wiring yet.
  // Keep minimal behavior to avoid breaking the shared shell.
  document.addEventListener('click', (event) => {
    const button = event.target.closest('[data-lg-approval-action]');
    if (!button) return;

    const action = button.getAttribute('data-lg-approval-action');
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
