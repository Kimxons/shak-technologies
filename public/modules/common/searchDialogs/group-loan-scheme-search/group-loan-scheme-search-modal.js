(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('loan-scheme-search-btn');
  const loadingEl = document.getElementById('loan-scheme-loading');
  const resultsEl = document.getElementById('loan-scheme-results');
  const emptyEl = document.getElementById('loan-scheme-empty');
  const criteriaEl = document.getElementById('loan-scheme-criteria');

  let selectedRow = null;
  let selectedData = null;

  // Load dependencies using ServiceLoader
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) return;
    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadScript('../../../../assets/js/services/shared/lookupService.js');
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

    // Load all loan schemes on init
    executeSearch();
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get search values from inputs
    const schemeIdInput = criteriaEl?.querySelector('[data-search-field="schemeId"]');
    const schemeNameInput = criteriaEl?.querySelector('[data-search-field="schemeName"]');
    const schemeIdMode = criteriaEl?.querySelector('[data-search-mode="schemeId"]');
    const schemeNameMode = criteriaEl?.querySelector('[data-search-mode="schemeName"]');

    const searchSchemeId = schemeIdInput?.value.trim() || '';
    const searchSchemeName = schemeNameInput?.value.trim() || '';
    const schemeIdOp = schemeIdMode?.value || 'Like';
    const schemeNameOp = schemeNameMode?.value || 'Like';

    // Build WhereStmt based on search conditions
    const conditions = [];
    if (searchSchemeId) {
      if (schemeIdOp === 'Exact') {
        conditions.push(`LoanSchemeID='${searchSchemeId}'`);
      } else {
        conditions.push(`LoanSchemeID LIKE '%${searchSchemeId}%'`);
      }
    }
    if (searchSchemeName) {
      if (schemeNameOp === 'Exact') {
        conditions.push(`LoanSchemeName='${searchSchemeName}'`);
      } else {
        conditions.push(`LoanSchemeName LIKE '%${searchSchemeName}%'`);
      }
    }
    const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

    // Get group product ID from parent window
    let groupProductId = '';
    try {
      groupProductId = window.parent.document.getElementById('centerProductId')?.value || 'GRP01';
    } catch (e) {
      groupProductId = 'GRP01';
    }

    // Get branch ID from parent window
    let branchId = '';
    try {
      branchId = window.parent.document.getElementById('branchId')?.value || '0603';
    } catch (e) {
      branchId = '0603';
    }

    const payload = {
      TableID: 'GroupDefaultSchemeID',
      WhereStmt: whereStmt,
      RefID: null,
      PrevOrNext: 0,
      AdvFilterString: `GroupProductID ='${groupProductId}' AND SchemeTypeID = 'P'`,
      OperatorID: 'CSADM',
      ModuleID: 5060,
      OurBranchID: branchId,
      SearchKey: null,
      LanguageID: 'en'
    };

    try {
      const result = await global.LookupService.getSearchResult(payload);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        const schemes = result.data?.Details || result.Details || [];
        renderResults(schemes);

        // Send search results to parent for caching
        window.parent.postMessage({
          type: 'GROUP_LOAN_SCHEME_SEARCH_RESULTS',
          schemes: schemes
        }, '*');
      } else {
        showError(result.message || 'Search failed');
      }
    } catch (err) {
      console.error('Group Loan Scheme Search Error:', err);
      showError('Error occurred during search');
    }
  }

  function showError(msg) {
    if (loadingEl) loadingEl.style.display = 'none';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) {
      emptyEl.textContent = msg;
      emptyEl.style.display = 'block';
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
            <th>Scheme ID</th>
            <th>Scheme Name</th>
            <th>Product ID</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}">
          <td>${row.LoanSchemeID || ''}</td>
          <td>${row.Description || ''}</td>
          <td>${row.GroupProductID || ''}</td>
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
      type: 'GROUP_LOAN_SCHEME_SELECTED',
      schemeId: selectedData.LoanSchemeID || '',
      schemeName: selectedData.Description || '',
      groupProductId: selectedData.GroupProductID || '',
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
    window.parent?.postMessage?.({ type: 'kairo-search-close' }, '*');
  }

})(window);
