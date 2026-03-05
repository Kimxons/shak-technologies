(function () {
  function postClose() {
    try {
      window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
    } catch (_) {
      // ignore
    }
  }

  function setMinimized(isMinimized) {
    var root = document.querySelector('[data-spv-window]');
    if (!root) return;
    root.classList.toggle('spv-window--minimized', Boolean(isMinimized));
  }

  function doRefresh() {
    try {
      window.location.reload();
    } catch (_) {
      // ignore
    }
  }

  function wireTitleBar() {
    var btnClose = document.querySelector('[data-spv-close]');
    var btnMin = document.querySelector('[data-spv-minimize]');
    var btnRefresh = document.querySelector('[data-spv-refresh]');

    if (btnClose) btnClose.addEventListener('click', postClose);

    if (btnMin) {
      btnMin.addEventListener('click', function () {
        var root = document.querySelector('[data-spv-window]');
        var minimized = root && root.classList.contains('spv-window--minimized');
        setMinimized(!minimized);
      });
    }

    if (btnRefresh) btnRefresh.addEventListener('click', doRefresh);
  }

  function wireNoops() {
    var noopSelectors = [
      '[data-spv-branch-lookup]',
      '[data-spv-account-lookup]',
      '[data-spv-ref-lookup]',
      '[data-spv-view]',
      '[data-spv-add]',
      '[data-spv-edit]',
      '[data-spv-delete]',
      '[data-spv-save]',
      '[data-spv-cancel]'
    ];

    noopSelectors.forEach(function (sel) {
      var el = document.querySelector(sel);
      if (!el) return;
      el.addEventListener('click', function (e) {
        e.preventDefault();
      });
    });
  }

  document.addEventListener('DOMContentLoaded', function () {
    wireTitleBar();
    wireNoops();
  });
})();
