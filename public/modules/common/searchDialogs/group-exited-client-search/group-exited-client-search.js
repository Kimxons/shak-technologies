(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('exited-client-search-btn');
  const loadingEl = document.getElementById('exited-client-loading');
  const resultsEl = document.getElementById('exited-client-results');
  const emptyEl = document.getElementById('exited-client-empty');
  const criteriaEl = document.getElementById('exited-client-criteria');

  let selectedRow = null;
  let selectedData = null;
  let parentContext = null;

  // Get context from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  const branchFromUrl = urlParams.get('branch') || '0603';
  const centerFromUrl = urlParams.get('centerId') || '';
  const groupFromUrl = urlParams.get('groupId') || '';

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
    // Get parent context or use URL parameters
    if (window.parent && window.parent.parentContext) {
      parentContext = window.parent.parentContext;
    } else {
      parentContext = {
        branchId: branchFromUrl,
        centerId: centerFromUrl,
        groupId: groupFromUrl
      };
    }

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

    // Load all exited clients on init
    executeSearch();
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Validate parent context
    if (!parentContext || !parentContext.branchId) {
      showError('Branch context is required');
      return;
    }

    if (!parentContext.centerId) {
      showError('Please select a Center first');
      return;
    }

    if (!parentContext.groupId) {
      showError('Please select a Group first');
      return;
    }

    // Get search values from inputs
    const clientIdInput = criteriaEl?.querySelector('[data-search-field="clientId"]');
    const clientNameInput = criteriaEl?.querySelector('[data-search-field="clientName"]');
    const clientIdMode = criteriaEl?.querySelector('[data-search-mode="clientId"]');
    const clientNameMode = criteriaEl?.querySelector('[data-search-mode="clientName"]');

    const searchClientId = clientIdInput?.value.trim() || '';
    const searchClientName = clientNameInput?.value.trim() || '';
    const clientIdOp = clientIdMode?.value || 'Like';
    const clientNameOp = clientNameMode?.value || 'Like';

    // Build WhereStmt based on search conditions
    const conditions = [];
    if (searchClientId) {
      if (clientIdOp === 'Exact') {
        conditions.push(`GroupExitedClientID='${searchClientId}'`);
      } else {
        conditions.push(`GroupExitedClientID LIKE '%${searchClientId}%'`);
      }
    }
    if (searchClientName) {
      if (clientNameOp === 'Exact') {
        conditions.push(`GroupExitedClientName='${searchClientName}'`);
      } else {
        conditions.push(`GroupExitedClientName LIKE '%${searchClientName}%'`);
      }
    }
    const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

    // Build AdvFilterString with parent context
    const advFilterString = `OurBranchID='${parentContext.branchId}' AND GroupID='${parentContext.centerId}' AND SubGroupID='${parentContext.groupId}'`;

    const payload = {
      TableID: 'GroupExitedClientID',
      OurBranchID: parentContext.branchId,
      WhereStmt: whereStmt,
      RefID: null,
      PrevOrNext: 0,
      AdvFilterString: advFilterString,
      OperatorID: 'CSADM',
      ModuleID: 5170,
      SearchKey: null,
      LanguageID: 'en'
    };

    try {
      const result = await global.LookupService.getSearchResult(payload);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        const clients = Array.isArray(result.data) ? result.data : (result.data?.Table || []);
        renderResults(clients);
      } else {
        showError(result.message || 'Search failed');
      }
    } catch (err) {
      console.error('[Exited Client Search] Search error:', err);
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
            <th>Client ID</th>
            <th>Client Name</th>
            <th>Exit Date</th>
            <th>Exit Reason</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}">
          <td>${row.GroupExitedClientID || row.ClientID || ''}</td>
          <td>${row.GroupExitedClientName || row.ClientName || ''}</td>
          <td>${row.ExitDate || ''}</td>
          <td>${row.ExitReason || ''}</td>
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

    const clientData = {
      type: 'EXITED_CLIENT_SELECTED',
      clientId: selectedData.GroupExitedClientID || selectedData.ClientID || '',
      clientName: selectedData.GroupExitedClientName || selectedData.ClientName || '',
      mobile: selectedData.MobileNo || '',
      exitDate: selectedData.ExitDate || '',
      exitReason: selectedData.ExitReason || '',
      nextOfKin: selectedData.NextOfKin || '',
      unclaimedAmount: selectedData.UnclaimedAmount || 0,
      osUnclaimed: selectedData.OSUnclaimed || 0,
      data: selectedData
    };

    // Send to parent window
    if (window.parent) {
      window.parent.postMessage(clientData, '*');
    }

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
