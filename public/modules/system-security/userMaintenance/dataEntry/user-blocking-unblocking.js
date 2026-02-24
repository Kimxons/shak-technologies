(function () {
  function postClose() {
    try {
      window.parent.postMessage({ type: 'kairo-dataentry-close' }, '*');
    } catch (_) {
      // ignore
    }
  }

  function setMinimized(isMinimized) {
    var root = document.querySelector('[data-ubu-window]');
    if (!root) return;
    root.classList.toggle('ubu-window--minimized', Boolean(isMinimized));
  }

  function doRefresh() {
    try {
      window.location.reload();
    } catch (_) {
      // ignore
    }
  }

  function wireTitleBar() {
    var btnClose = document.querySelector('[data-ubu-close]');
    var btnMin = document.querySelector('[data-ubu-minimize]');
    var btnRefresh = document.querySelector('[data-ubu-refresh]');

    if (btnClose) btnClose.addEventListener('click', postClose);

    if (btnMin) {
      btnMin.addEventListener('click', function () {
        var root = document.querySelector('[data-ubu-window]');
        var minimized = root && root.classList.contains('ubu-window--minimized');
        setMinimized(!minimized);
      });
    }

    if (btnRefresh) btnRefresh.addEventListener('click', doRefresh);
  }

  function wireActionButtons() {
    var btnBack = document.querySelector('[data-ubu-back]');
    if (btnBack) btnBack.addEventListener('click', postClose);

    // Wire lookup buttons
    var lookupBtns = document.querySelectorAll('[data-ubu-lookup]');
    lookupBtns.forEach(function(btn) {
      btn.addEventListener('click', function(e) {
        var lookupType = e.currentTarget.dataset.ubuLookup;
        showSearchModal(lookupType);
      });
    });

    // Wire other action buttons (no-op for now)
    var noopSelectors = [
      '[data-ubu-history]',
      '[data-ubu-edit]',
      '[data-ubu-save]',
      '[data-ubu-cancel]'
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

  function showSearchModal(lookupType) {
    // Clear any previously active lookup buttons
    var activeLookups = document.querySelectorAll('[data-ubu-lookup].active');
    activeLookups.forEach(function(btn) {
      btn.classList.remove('active');
    });
    
    // Mark the clicked button as active
    var clickedBtn = event.target.closest('[data-ubu-lookup]');
    if (clickedBtn) {
      clickedBtn.classList.add('active');
    }
    
    var overlay = document.getElementById('ubuSearchOverlay');
    var frame = document.getElementById('ubuSearchFrame');
    
    if (overlay && frame) {
      if (lookupType === 'user') {
        frame.src = '../../common/user-search.html';
      }
      overlay.style.display = 'flex';
    }
  }

  function hideSearchModal() {
    var overlay = document.getElementById('ubuSearchOverlay');
    var frame = document.getElementById('ubuSearchFrame');
    
    if (overlay) {
      overlay.style.display = 'none';
    }
    if (frame) {
      frame.src = 'about:blank';
    }
  }

  function wireSearchModal() {
    var closeBtn = document.getElementById('ubuSearchClose');
    var overlay = document.getElementById('ubuSearchOverlay');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', hideSearchModal);
    }
    
    if (overlay) {
      overlay.addEventListener('click', function(e) {
        if (e.target === overlay) {
          hideSearchModal();
        }
      });
    }
  }

  function init() {
    wireTitleBar();
    wireActionButtons();
    wireSearchModal();
    
    // Listen for messages from search modals
    window.addEventListener('message', function(e) {
      if (e.data && e.data.type === 'USER_SELECTED') {
        // Handle user selection
        var userData = e.data.payload;
        // Find the active lookup field and populate it
        var activeLookup = document.querySelector('[data-ubu-lookup].active');
        if (activeLookup) {
          var input = activeLookup.previousElementSibling;
          if (input && input.tagName === 'INPUT') {
            input.value = userData.loginId || userData.name || '';
          }
        }
        hideSearchModal();
      }
    });
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();