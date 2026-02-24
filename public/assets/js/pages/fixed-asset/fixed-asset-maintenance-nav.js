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

  const buttons = Array.from(document.querySelectorAll('[data-fam-nav]'));

  const navigateTo = (fileName) => {
    const url = new URL(fileName, window.location.href);
    url.searchParams.set('t', String(Date.now()));
    window.location.href = url.toString();
  };

  const setActive = (activeBtn) => {
    buttons.forEach((b) => {
      const isActive = b === activeBtn;
      b.classList.toggle('is-active', isActive);
      b.setAttribute('aria-selected', isActive ? 'true' : 'false');
    });
  };

  buttons.forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn.dataset.famNav;
      if (target === 'asset-cost-history') {
        navigateTo('../data-entry/AssetCostHistory.html');
      } else if (target === 'depreciation-schedule') {
        navigateTo('../data-entry/DepreciationSchedule.html');
      }
    });
  });
})();
