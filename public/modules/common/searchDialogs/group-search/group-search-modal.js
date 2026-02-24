(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('group-search-btn');
  const loadingEl = document.getElementById('group-loading');
  const resultsEl = document.getElementById('group-results');
  const emptyEl = document.getElementById('group-empty');
  const criteriaEl = document.getElementById('group-criteria');

  let selectedRow = null;
  let selectedData = null;
  let searchContext = 'group'; // default to group search

  // Get context from URL parameters
  const urlParams = new URLSearchParams(window.location.search);
  searchContext = urlParams.get('context') || 'group';
  let branchId = urlParams.get('branch') || '0603';

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

    // Load all groups on init
    executeSearch();
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get search values from inputs
    const groupIdInput = criteriaEl?.querySelector('[data-search-field="groupId"]');
    const groupNameInput = criteriaEl?.querySelector('[data-search-field="groupName"]');
    const groupIdMode = criteriaEl?.querySelector('[data-search-mode="groupId"]');
    const groupNameMode = criteriaEl?.querySelector('[data-search-mode="groupName"]');

    const searchGroupId = groupIdInput?.value.trim() || '';
    const searchGroupName = groupNameInput?.value.trim() || '';
    const groupIdOp = groupIdMode?.value || 'Like';
    const groupNameOp = groupNameMode?.value || 'Like';

    // Build WhereStmt based on search conditions
    const conditions = [];
    if (searchGroupId) {
      if (groupIdOp === 'Exact') {
        conditions.push(`GroupID='${searchGroupId}'`);
      } else {
        conditions.push(`GroupID LIKE '%${searchGroupId}%'`);
      }
    }
    if (searchGroupName) {
      if (groupNameOp === 'Exact') {
        conditions.push(`GroupName='${searchGroupName}'`);
      } else {
        conditions.push(`GroupName LIKE '%${searchGroupName}%'`);
      }
    }
    const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

    // Get branch ID
    let currentBranchId = branchId;
    if (!currentBranchId) {
      try {
        const parentDoc = window.parent.document;
        currentBranchId = parentDoc.getElementById('branchId')?.value 
                || parentDoc.getElementById('BranchId')?.value 
                || parentDoc.getElementById('OurBranchID')?.value
                || '0603';
        if (!currentBranchId) currentBranchId = '0603';
      } catch (e) {
        currentBranchId = '0603';
      }
    }

    // Build AdvFilterString
    let advFilterString = `OurBranchID='${currentBranchId}'`;
    if (searchContext === 'group' && searchGroupId) {
      advFilterString += ` AND GroupID='${searchGroupId}'`;
    }

    const payload = {
      TableID: 'GroupID',
      OurBranchID: currentBranchId,
      WhereStmt: whereStmt,
      RefID: null,
      PrevOrNext: 0,
      AdvFilterString: advFilterString,
      OperatorID: 'CSADM',
      ModuleID: 5060,
      SearchKey: null,
      LanguageID: 'en'
    };

    try {
      const result = await global.LookupService.getSearchResult(payload);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        const groups = Array.isArray(result.data) ? result.data : (result.Details || []);
        renderResults(groups);
      } else {
        if (emptyEl) {
          emptyEl.textContent = result.message || 'Search failed';
          emptyEl.style.display = 'block';
        }
      }
    } catch (err) {
      console.error('Group Search Error:', err);
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
            <th>Group ID</th>
            <th>Group Name</th>
            <th>Branch ID</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}">
          <td>${row.GroupID || ''}</td>
          <td>${row.GroupName || ''}</td>
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
      type: 'GROUP_SELECTED',
      groupId: selectedData.GroupID || '',
      groupName: selectedData.GroupName || '',
      branchId: selectedData.OurBranchID || '',
      context: searchContext,
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