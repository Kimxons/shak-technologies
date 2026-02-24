(() => {
  if (window.__lgPortfolioLoaded) {
    console.warn('lg-portfolio.js already loaded; skipping duplicate execution.');
    return;
  }
  window.__lgPortfolioLoaded = true;

  const supportedPages = ['lg-portfolio'];
  const activePage = document.body?.dataset?.page;
  if (!supportedPages.includes(activePage)) {
    return;
  }

  const closeParentModalIfPossible = () => {
    try {
      const parent = window.parent;
      const parentBootstrap = parent?.bootstrap;
      const modalEl = parent?.document?.getElementById('lgPortfolioModal');
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
    const actionEl = event.target.closest('[data-lg-portfolio-action]');
    if (!actionEl) return;

    event.preventDefault();

    const action = (actionEl.dataset.lgPortfolioAction || '').trim().toLowerCase();
    if (action === 'back') {
      if (!closeParentModalIfPossible()) {
        window.history.back();
      }
    }
  });
})();
