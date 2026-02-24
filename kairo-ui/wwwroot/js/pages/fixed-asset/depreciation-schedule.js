(function () {
  const navToggles = Array.from(document.querySelectorAll('.cm-nav-toggle'));
  navToggles.forEach((toggle) => {
    toggle.addEventListener('click', () => {
      const section = toggle.closest('.cm-nav-section');
      const items = section?.querySelector('.cm-nav-items');
      items?.classList.toggle('is-collapsed');

      const icon = toggle.querySelector('.bi');
      icon?.classList.toggle('bi-chevron-down');
      icon?.classList.toggle('bi-chevron-right');
    });
  });

  const printBtn = document.querySelector('[data-ds-print]');
  const backBtn = document.querySelector('[data-ds-back]');

  const navButtons = Array.from(document.querySelectorAll('[data-fam-nav]'));

  const navigateTo = (fileName) => {
    const url = new URL(fileName, window.location.href);
    url.searchParams.set('t', String(Date.now()));
    window.location.href = url.toString();
  };

  navButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.famNav;
      if (target === 'depreciation-schedule') return;
      if (target === 'asset-cost-history') {
        navigateTo('AssetCostHistory.html');
      }
    });
  });

  printBtn?.addEventListener('click', () => window.print());

  const closeParentModalIfPresent = () => {
    try {
      const parentWin = window.parent;
      if (!parentWin || parentWin === window) return false;
      const modalEl = parentWin.document?.getElementById('depreciationScheduleModal');
      if (!modalEl) return false;
      if (parentWin.bootstrap?.Modal) {
        parentWin.bootstrap.Modal.getOrCreateInstance(modalEl).hide();
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  backBtn?.addEventListener('click', () => {
    // In the iframe/modal flow, go back to Fixed Asset Maintenance.
    try {
      const parentWin = window.parent;
      if (parentWin && parentWin !== window) {
        navigateTo('../views/FixedAssetMaintenance.html');
        return;
      }
    } catch {
      // ignore
    }

    // Fallback: close modal if present, else browser back.
    if (closeParentModalIfPresent()) return;
    if (window.history.length > 1) window.history.back();
  });
})();
