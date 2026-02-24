(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('user-search-btn');
  const loadingEl = document.getElementById('user-loading');
  const resultsEl = document.getElementById('user-results');
  const emptyEl = document.getElementById('user-empty');
  const criteriaEl = document.getElementById('user-criteria');

  let selectedRow = null;
  let selectedData = null;

  // Load dependencies using ServiceLoader
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) return;
    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadScript('../../../../assets/js/services/shared/lookupService.js');
      await ServiceLoader.loadScript('../../../../assets/js/auth/auth.service.js');
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

    // Load all users on init
    executeSearch();
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get search values from inputs
    const operatorIdInput = criteriaEl?.querySelector('[data-search-field="operatorId"]');
    const operatorIdMode = criteriaEl?.querySelector('[data-search-mode="operatorId"]');

    const searchOperatorId = operatorIdInput?.value.trim() || '';
    const operatorIdOp = operatorIdMode?.value || 'Like';

    // Build WhereStmt based on search conditions
    const conditions = [];
    if (searchOperatorId) {
      if (operatorIdOp === 'Exact') {
        conditions.push(`OperatorID='${searchOperatorId}'`);
      } else {
        conditions.push(`OperatorID LIKE '%${searchOperatorId}%'`);
      }
    }
    const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

    // Get Session
    let operatorId = 'CSADM';
    let branchId = '0603';
    try {
      const session = global.AuthService?.getSession?.();
      if (session) {
        operatorId = session.operatorId || operatorId;
        branchId = session.branchId || branchId;
      }
    } catch (e) { }

    const payload = {
      WhereStmt: whereStmt,
      OperatorID: operatorId,
      OurBranchID: '0603',
      RefID: '',
      TableID: 'OperatorID',
      ModuleID: 2315,
      PrevOrNext: 0,
      SearchKey: '',
      LanguageID: 'en',
      AdvFilterString: 'IsLoginDeleted = 0'
    };

    try {
      const result = await global.LookupService.searchOperators(payload);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        renderResults(result.data);
      } else {
        showError(result.message || 'Search failed');
      }
    } catch (err) {
      console.error('User Search Error:', err);
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
    const rows = Array.isArray(data) ? data : (data.Details || []);

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
            <th>Operator ID</th>
            <th>Client Name</th>
            <th>Branch ID</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}">
          <td>${row.OperatorID || row.LoginID || ''}</td>
          <td>${row.ClientName || ''}</td>
          <td>${row.OurBranchID || ''}</td>
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
      type: 'USER_SELECTED',
      loginId: selectedData.OperatorID || selectedData.LoginID,
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