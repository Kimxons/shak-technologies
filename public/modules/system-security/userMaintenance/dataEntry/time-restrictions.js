(function () {
  function postClose() {
    try {
      window.parent.postMessage({ type: 'kairo-dataentry-close' }, '*');
    } catch (_) {
      // ignore
    }
  }

  function setMinimized(isMinimized) {
    var root = document.querySelector('[data-tr-window]');
    if (!root) return;
    root.classList.toggle('tr-window--minimized', Boolean(isMinimized));
  }

  function doRefresh() {
    try {
      window.location.reload();
    } catch (_) {
      // ignore
    }
  }

  function wireTitleBar() {
    var btnClose = document.querySelector('[data-tr-close]');
    var btnMin = document.querySelector('[data-tr-minimize]');
    var btnRefresh = document.querySelector('[data-tr-refresh]');

    if (btnClose) btnClose.addEventListener('click', postClose);

    if (btnMin) {
      btnMin.addEventListener('click', function () {
        var root = document.querySelector('[data-tr-window]');
        var minimized = root && root.classList.contains('tr-window--minimized');
        setMinimized(!minimized);
      });
    }

    if (btnRefresh) btnRefresh.addEventListener('click', doRefresh);
  }

  function wireActionButtons() {
    var btnBack = document.querySelector('[data-tr-back]');
    if (btnBack) btnBack.addEventListener('click', postClose);

    // Wire other action buttons (no-op for now)
    var noopSelectors = [
      '[data-tr-edit]',
      '[data-tr-save]',
      '[data-tr-cancel]'
    ];

    noopSelectors.forEach(function (selector) {
      var btn = document.querySelector(selector);
      if (btn) {
        btn.addEventListener('click', function (e) {
          e.preventDefault();
          // Placeholder for future functionality
        });
      }
    });
  }

  function init() {
    wireTitleBar();
    wireActionButtons();
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();