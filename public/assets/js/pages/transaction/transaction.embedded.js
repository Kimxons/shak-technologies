const contentEl = document.getElementById('content');
const menuForexEl = document.getElementById('menu-forex');
const menuCashTransactionEl = document.getElementById('menu-cash-transaction');
const menuCashTransactionTestEl = document.getElementById('menu-cash-transaction-test');
const menuTransferTransactionsEl = document.getElementById('menu-transfer-transactions');

function setActive(activeButton) {
  document.querySelectorAll('.list-group-item-action').forEach((btn) => {
    btn.classList.toggle('active', btn === activeButton);
    btn.setAttribute('aria-current', btn === activeButton ? 'page' : 'false');
  });
}

async function loadScreen(buttonEl, urls, pageTitle, errorMessage) {
  console.log('loadScreen() called with urls:', urls);
  setActive(buttonEl);

  const candidates = Array.isArray(urls) ? urls : [urls];

  contentEl.className = 'card';
  contentEl.innerHTML =
    '<div class="card-body">' +
    '<div class="d-flex align-items-center justify-content-between">' +
    '<h2 class="h6 mb-0">Loading...</h2>' +
    '</div>' +
    '</div>';

  let lastError = null;

  for (const url of candidates) {
    try {
      const response = await fetch(url, { cache: 'no-store' });
      if (!response.ok) throw new Error('Failed to load screen');

      const htmlText = await response.text();
      const parsed = new DOMParser().parseFromString(htmlText, 'text/html');

      // Extract script src attributes BEFORE removing scripts
      const scriptElements = parsed.querySelectorAll('script[src]');
      const scriptsToLoad = [];
      for (const scriptEl of scriptElements) {
        const src = scriptEl.getAttribute('src');
        if (src) {
          scriptsToLoad.push(src);
        }
      }

      // Also extract inline scripts (without src attribute)
      const inlineScripts = [];
      const allScripts = parsed.querySelectorAll('script:not([src])');
      for (const scriptEl of allScripts) {
        if (scriptEl.textContent) {
          inlineScripts.push(scriptEl.textContent);
        }
      }

      // Keep it UI-only: strip any scripts from the loaded document.
      parsed.querySelectorAll('script').forEach((s) => s.remove());

      const mainContent = parsed.querySelector('.container-fluid') || parsed.body;

      // Replace the content area with the loaded screen body.
      contentEl.className = '';
      contentEl.replaceChildren();

      const fragment = document.createDocumentFragment();
      Array.from(mainContent.childNodes).forEach((node) => {
        fragment.appendChild(document.importNode(node, true));
      });

      contentEl.appendChild(fragment);
      document.title = pageTitle;

      // Load and execute external scripts after DOM is ready
      console.log('Scripts to load:', scriptsToLoad);
      for (const src of scriptsToLoad) {
        console.log('Loading script:', src);
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = function () {
          console.log('Script loaded successfully:', src);
        };
        script.onerror = function () {
          console.error('Failed to load script:', src);
        };
        document.body.appendChild(script);
      }

      // Execute inline scripts
      console.log('Inline scripts to execute:', inlineScripts.length);
      for (const scriptText of inlineScripts) {
        console.log('Executing inline script');
        try {
          eval(scriptText);
        } catch (e) {
          console.error('Error executing inline script:', e);
        }
      }

      return;
    } catch (error) {
      lastError = error;
    }
  }

  contentEl.className = 'card';
  contentEl.innerHTML =
    '<div class="card-body">' +
    '<div class="alert alert-danger mb-0" role="alert">' +
    errorMessage +
    '</div>' +
    '</div>';
  console.error('Screen load failed', { candidates, lastError });
}

function loadForexBureauDeChange() {
  loadScreen(
    menuForexEl,
    'modules/transaction/forex-bureau-de-change/forex-bureau-de-change.html',
    'Forex - Bureau De Change',
    'Could not load Forex-Bureau de exchange screen.'
  );
}

function loadCashTransaction() {
  console.log('Opening Cash Transactions modal');
  // Launch the modal from the parent window (dashboard)
  if (window.parent && window.parent.bootstrapLib && window.parent.bootstrapLib.Modal) {
    const parentModal = window.parent.document.getElementById('cashTransactionsModal');
    if (parentModal) {
      const modalInstance = window.parent.bootstrapLib.Modal.getOrCreateInstance(parentModal);
      modalInstance.show();
    }
  }
}

menuForexEl.addEventListener('click', loadForexBureauDeChange);
menuCashTransactionEl.addEventListener('click', loadCashTransaction);
menuCashTransactionTestEl.addEventListener('click', function () {
  console.log('loadCashTransactionTest() called');
  loadScreen(
    menuCashTransactionTestEl,
    'cash-transaction-test.html',
    'Cash Transaction (Test)',
    'Could not load test screen.'
  );
});
menuTransferTransactionsEl.addEventListener('click', function () {
  console.log('Opening Transfer Transactions modal');
  // Launch the modal from the parent window (dashboard)
  if (window.parent && window.parent.bootstrapLib && window.parent.bootstrapLib.Modal) {
    const parentModal = window.parent.document.getElementById('transferTransactionsModal');
    if (parentModal) {
      const modalInstance = window.parent.bootstrapLib.Modal.getOrCreateInstance(parentModal);
      modalInstance.show();
    }
  }
});

// Allow deep-linking from the main dashboard menu.
// Examples:
// - /modules/transaction/transaction.html?screen=cash-transaction
// - /modules/transaction/transaction.html#cash-transaction
(function autoLoadFromUrl() {
  const params = new URLSearchParams(window.location.search);
  const fromQuery = (params.get('screen') || '').trim().toLowerCase();
  const fromHash = (window.location.hash || '').replace('#', '').trim().toLowerCase();
  const target = fromQuery || fromHash;

  if (target === 'cash-transaction' || target === 'cashtransactions') {
    loadCashTransaction();
    return;
  }

  if (target === 'forex' || target === 'forex-bureau-de-change') {
    loadForexBureauDeChange();
  }
})();
