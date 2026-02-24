(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('bank-search-btn');
  const loadingEl = document.getElementById('bank-loading');
  const resultsEl = document.getElementById('bank-results');
  const emptyEl = document.getElementById('bank-empty');
  const criteriaEl = document.getElementById('bank-criteria');

  let selectedRow = null;
  let selectedData = null;

  // Load dependencies using ServiceLoader
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) return;
    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadScript('../../../../assets/js/services/microfinance/groupService.js');
      init();
    } catch (err) {
      console.error('Error loading services:', err);
    }
  })();

  function init() {
    // Search button click
    if (searchBtn) {
      searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        executeSearch();
      });
    }

    // Enter key to search
    if (criteriaEl) {
      criteriaEl.querySelectorAll('input').forEach(input => {
        input.addEventListener('keypress', (e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            executeSearch();
          }
        });
      });
    }

    // Load all banks on init
    executeSearch();
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get search values from inputs
    const bankIdInput = criteriaEl?.querySelector('[data-search-field="bankId"]');
    const bankNameInput = criteriaEl?.querySelector('[data-search-field="bankName"]');
    const bankIdMode = criteriaEl?.querySelector('[data-search-mode="bankId"]');
    const bankNameMode = criteriaEl?.querySelector('[data-search-mode="bankName"]');

    const searchBankId = bankIdInput?.value.trim() || '';
    const searchBankName = bankNameInput?.value.trim() || '';
    const bankIdOp = bankIdMode?.value || 'Like';
    const bankNameOp = bankNameMode?.value || 'Like';

    const payload = {};

    try {
      const result = await global.GroupService.searchClearingBanks(payload);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        // Extract banks from response
        let banks = Array.isArray(result.data) ? result.data : (result.Details || []);

        // Filter results by bank ID if provided
        if (searchBankId) {
          const lowerSearchId = searchBankId.toLowerCase();
          if (bankIdOp === 'Exact') {
            banks = banks.filter(b => (b.BankID || '').toLowerCase() === lowerSearchId);
          } else {
            banks = banks.filter(b => (b.BankID || '').toLowerCase().includes(lowerSearchId));
          }
        }

        // Filter results by bank name if provided
        if (searchBankName) {
          const lowerSearchName = searchBankName.toLowerCase();
          if (bankNameOp === 'Exact') {
            banks = banks.filter(b => (b.BankName || '').toLowerCase() === lowerSearchName);
          } else {
            banks = banks.filter(b => (b.BankName || '').toLowerCase().includes(lowerSearchName));
          }
        }

        renderResults(banks);
      } else {
        if (emptyEl) {
          emptyEl.textContent = result.message || 'Search failed';
          emptyEl.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Bank Search Error:', err);
      if (loadingEl) loadingEl.style.display = 'none';
      if (emptyEl) {
        emptyEl.textContent = 'Error occurred during search';
        emptyEl.style.display = 'block';
      }
    }
  }

  function renderResults(data) {
    const rows = Array.isArray(data) ? data : [];

    if (rows.length === 0) {
      if (emptyEl) emptyEl.style.display = 'block';
      if (resultsEl) resultsEl.style.display = 'none';
      return;
    }

    // Build table HTML
    let html = `
      <table class="results-table">
        <thead>
          <tr>
            <th>Bank ID</th>
            <th>Bank Name</th>
            <th>Swift Code</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}">
          <td>${row.BankID || ''}</td>
          <td>${row.BankName || ''}</td>
          <td>${row.SwiftCode || ''}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';

    if (resultsEl) {
      resultsEl.innerHTML = html;
      resultsEl.style.display = 'block';

      // Attach row click handlers
      resultsEl.querySelectorAll('tbody tr').forEach(tr => {
        tr.addEventListener('click', () => selectResult(tr));
        tr.addEventListener('dblclick', () => {
          selectResult(tr);
          setSelected();
        });
      });
    }
  }

  function selectResult(tr) {
    if (selectedRow) selectedRow.classList.remove('selected');
    selectedRow = tr;
    selectedRow.classList.add('selected');
    selectedData = JSON.parse(tr.dataset.row);
  }

  function setSelected() {
    if (!selectedData) return;

    // Send message to parent
    window.parent.postMessage({
      type: 'BANK_SELECTED',
      bankId: selectedData.BankID || '',
      bankName: selectedData.BankName || '',
      swiftCode: selectedData.SwiftCode || '',
      data: selectedData
    }, '*');

    // Close the modal
    close();
  }

  function close() {
    try {
      // Try to close the Bootstrap modal in the parent
      const parentModal = window.parent.document.getElementById('searchModal');
      if (parentModal) {
        const bsModal = window.parent.bootstrap?.Modal?.getInstance(parentModal);
        if (bsModal) {
          bsModal.hide();
          return;
        }
        // Fallback: click close button
        const closeBtn = parentModal.querySelector('[data-bs-dismiss="modal"]');
        if (closeBtn) {
          closeBtn.click();
          return;
        }
      }
    } catch (e) {
      console.warn('Could not close parent modal:', e);
    }
    // Fallback to postMessage
    window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
  }

})(window);
