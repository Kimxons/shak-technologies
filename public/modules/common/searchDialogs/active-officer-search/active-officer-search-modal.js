(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('officer-search-btn');
  const loadingEl = document.getElementById('officer-loading');
  const resultsEl = document.getElementById('officer-results');
  const emptyEl = document.getElementById('officer-empty');
  const criteriaEl = document.getElementById('officer-criteria');

  let selectedRow = null;
  let selectedData = null;

  // Get branch ID from URL parameters or parent window
  const urlParams = new URLSearchParams(window.location.search);
  let branchId = urlParams.get('branch') || '';

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

    // Load all active officers on init
    executeSearch();
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get search values from inputs
    const officerIdInput = criteriaEl?.querySelector('[data-search-field="officerId"]');
    const officerNameInput = criteriaEl?.querySelector('[data-search-field="officerName"]');
    const officerIdMode = criteriaEl?.querySelector('[data-search-mode="officerId"]');
    const officerNameMode = criteriaEl?.querySelector('[data-search-mode="officerName"]');

    const searchOfficerId = officerIdInput?.value.trim() || '';
    const searchOfficerName = officerNameInput?.value.trim() || '';
    const officerIdOp = officerIdMode?.value || 'Like';
    const officerNameOp = officerNameMode?.value || 'Like';

    // Build WhereStmt based on search conditions
    const conditions = [];
    if (searchOfficerId) {
      if (officerIdOp === 'Exact') {
        conditions.push(`OfficerID='${searchOfficerId}'`);
      } else {
        conditions.push(`OfficerID LIKE '%${searchOfficerId}%'`);
      }
    }
    if (searchOfficerName) {
      if (officerNameOp === 'Exact') {
        conditions.push(`Name='${searchOfficerName}'`);
      } else {
        conditions.push(`Name LIKE '%${searchOfficerName}%'`);
      }
    }
    const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

    // Get branch ID from parent window if not provided in URL
    let currentBranchId = branchId;
    if (!currentBranchId) {
      try {
        const parentDoc = window.parent.document;
        currentBranchId = parentDoc.getElementById('branchId')?.value 
                || parentDoc.getElementById('BranchId')?.value 
                || parentDoc.getElementById('OurBranchID')?.value
                || '0603';
      } catch (e) {
        currentBranchId = '0603';
      }
    }

    const payload = {
      TableID: 'ActiveOfficerID',
      WhereStmt: whereStmt,
      RefID: null,
      PrevOrNext: 0,
      AdvFilterString: `BankID='00' AND OfficerTypeID in ('CO','AO') AND ReportingBranchID='${currentBranchId}'`,
      OperatorID: 'CSADM',
      ModuleID: 5060,
      OurBranchID: currentBranchId,
      SearchKey: null,
      LanguageID: 'en'
    };

    try {
      const result = await global.LookupService.getSearchResult(payload);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        // Extract officers from response - check multiple possible locations
        let officers = [];
        if (result.data && result.data.Details) {
          officers = result.data.Details;
        } else if (result.Details) {
          officers = result.Details;
        } else if (Array.isArray(result.data)) {
          officers = result.data;
        }
        renderResults(officers);
      } else {
        if (emptyEl) {
          emptyEl.textContent = result.message || 'Search failed';
          emptyEl.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Active Officer Search Error:', err);
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
            <th>Officer ID</th>
            <th>Officer Name</th>
            <th>Branch ID</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}">
          <td>${row.OfficerID || ''}</td>
          <td>${row.Name || ''}</td>
          <td>${row.ReportingBranchID || ''}</td>
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
      type: 'ACTIVE_OFFICER_SELECTED',
      officerId: selectedData.OfficerID || '',
      officerName: selectedData.Name || '',
      branchId: selectedData.ReportingBranchID || '',
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
