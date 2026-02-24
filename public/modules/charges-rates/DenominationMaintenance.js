(() => {
  const root = document;

  root.addEventListener('click', (e) => {
    const target = e.target;
    if (!(target instanceof Element)) return;

    const navEl = target.closest('[data-nav-target]');
    if (navEl) {
      const navTarget = navEl.getAttribute('data-nav-target');
      if (navTarget === 'currency') {
        window.location.href = 'CurrencyMaintenance.html';
      }
      return;
    }

    const actionEl = target.closest('[data-action]');
    if (!actionEl) return;

    const action = actionEl.getAttribute('data-action');
    if (action === 'print') {
      window.print();
      return;
    }

    if (action === 'back') {
      window.location.href = 'CurrencyMaintenance.html';
    }
  });
})();
