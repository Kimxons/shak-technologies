(function () {
  'use strict';

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
      window.open(fallbackUrl, '_blank', 'noopener,noreferrer');
      return true;
    }

    return false;
  };

  const scrollToTarget = (target) => {
    if (!target) return;
    const el = document.querySelector(target);
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  // Capture-phase delegation so clicks aren't swallowed by other handlers.
  document.addEventListener(
    'click',
    (event) => {
      const target = event.target;
      const modalOpener = target?.closest?.('[data-open-parent-modal]');
      if (!modalOpener) return;

      event.preventDefault();
      event.stopPropagation();

      const modalId = modalOpener.getAttribute('data-open-parent-modal');
      const fallbackUrl = modalId === 'lgPortfolioModal'
        ? 'lg-portfolio.html'
        : modalId === 'closeLgModal'
          ? 'close-lg.html'
          : modalId === 'availmentSettlementModal'
            ? 'availment-settlement.html'
            : modalId === 'lgAccountStatementModal'
              ? 'lg-account-statement.html'
              : modalId === 'guaranteeClaimModal'
                ? 'guarantee-claim.html'
                : modalId === 'lgTransferModal'
                  ? 'lg-transfer.html'
                  : modalId === 'discrepanciesModal'
                    ? 'discrepancies.html'
            : undefined;
      openParentModal(modalId, fallbackUrl);
    },
    true
  );

  document.addEventListener('click', (event) => {
    const navButton = event.target.closest('[data-scroll-target]');
    if (navButton) {
      event.preventDefault();
      scrollToTarget(navButton.getAttribute('data-scroll-target'));
      return;
    }

    const actionButton = event.target.closest('[data-lg-maintenance-action]');
    if (!actionButton) return;

    const action = actionButton.getAttribute('data-lg-maintenance-action');
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
