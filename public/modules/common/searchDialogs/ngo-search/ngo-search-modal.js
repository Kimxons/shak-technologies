(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('ngo-search-btn');
  const loadingEl = document.getElementById('ngo-loading');
  const resultsEl = document.getElementById('ngo-results');
  const emptyEl = document.getElementById('ngo-empty');
  const criteriaEl = document.getElementById('ngo-criteria');

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

    // Load all NGOs on init
    executeSearch();
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get search values from inputs
    const ngoIdInput = criteriaEl?.querySelector('[data-search-field="ngoId"]');
    const ngoNameInput = criteriaEl?.querySelector('[data-search-field="ngoName"]');
    const ngoIdMode = criteriaEl?.querySelector('[data-search-mode="ngoId"]');
    const ngoNameMode = criteriaEl?.querySelector('[data-search-mode="ngoName"]');

    const searchNgoId = ngoIdInput?.value.trim() || '';
    const searchNgoName = ngoNameInput?.value.trim() || '';
    const ngoIdOp = ngoIdMode?.value || 'Like';
    const ngoNameOp = ngoNameMode?.value || 'Like';

    // Build WhereStmt based on search conditions
    const conditions = [];
    if (searchNgoId) {
      if (ngoIdOp === 'Exact') {
        conditions.push(`NGOID='${searchNgoId}'`);
      } else {
        conditions.push(`NGOID LIKE '%${searchNgoId}%'`);
      }
    }
    if (searchNgoName) {
      if (ngoNameOp === 'Exact') {
        conditions.push(`NGOName='${searchNgoName}'`);
      } else {
        conditions.push(`NGOName LIKE '%${searchNgoName}%'`);
      }
    }
    const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

    // Get branch ID from parent window
    let branchId = '';
    try {
      branchId = window.parent.document.getElementById('branchId')?.value || '0603';
    } catch (e) {
      branchId = '0603';
    }

    const payload = {
      TableID: 'NGOBranchID',
      WhereStmt: whereStmt,
      RefID: null,
      PrevOrNext: 0,
      AdvFilterString: `BranchID='${branchId}'`,
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
        // Extract NGOs from response - check multiple possible locations
        let ngos = [];
        if (result.data && result.data.Details) {
          ngos = result.data.Details;
        } else if (result.Details) {
          ngos = result.Details;
        } else if (Array.isArray(result.data)) {
          ngos = result.data;
        }
        renderResults(ngos);
      } else {
        showError(result.message || 'Search failed');
      }
    } catch (err) {
      console.error('NGO Search Error:', err);
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
            <th>NGO ID</th>
            <th>NGO Name</th>
            <th>Branch ID</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}">
          <td>${row.NGOID || ''}</td>
          <td>${row.NGOName || row.Description || ''}</td>
          <td>${row.BranchID || ''}</td>
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
      type: 'NGO_SELECTED',
      ngoId: selectedData.NGOID || '',
      ngoName: selectedData.NGOName || selectedData.Description || '',
      branchId: selectedData.BranchID || '',
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
