(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('subgroup-search-btn');
  const loadingEl = document.getElementById('subgroup-loading');
  const resultsEl = document.getElementById('subgroup-results');
  const emptyEl = document.getElementById('subgroup-empty');
  const criteriaEl = document.getElementById('subgroup-criteria');

  let selectedRow = null;
  let selectedData = null;

  // Load dependencies using ServiceLoader
  (async () => {
    const { ServiceLoader } = global;
    if (!ServiceLoader) return;
    try {
      await ServiceLoader.loadCore();
      await ServiceLoader.loadScript('../../../../assets/js/services/shared/searchService.js');
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

    // Load sub groups on init
    executeSearch();
  }

  /**
   * Get parent context (Branch ID and Center ID) from parent window
   */
  function getParentContext() {
    try {
      let targetWindow = window.parent;
      
      if (targetWindow && targetWindow !== window) {
        // First check for newGroupContext (for new group section in change-center-group)
        try {
          if (targetWindow.isNextStepActive && targetWindow.newGroupContext && targetWindow.newGroupContext.centerId) {
            return { 
              branchId: targetWindow.newGroupContext.branchId || '0603', 
              centerId: targetWindow.newGroupContext.centerId 
            };
          }
        } catch (e) { }

        // Check for parentContext (regular scenario)
        try {
          const parentCtx = targetWindow.parentContext;
          if (parentCtx && parentCtx.centerId) {
            return { 
              branchId: parentCtx.branchId || '0603', 
              centerId: parentCtx.centerId 
            };
          }
        } catch (e) { }

        // Try to get from parent document directly
        try {
          const parentDoc = targetWindow.document;
          
          if (targetWindow.isNextStepActive) {
            const newCenterId = parentDoc.getElementById('NewCenterId')?.value?.trim() || '';
            const branchId = parentDoc.getElementById('branchId')?.value?.trim() || '0603';
            if (newCenterId) {
              return { branchId, centerId: newCenterId };
            }
          }
          
          const centerId = parentDoc.getElementById('CenterId')?.value?.trim() || 
                           parentDoc.getElementById('centerId')?.value?.trim() || '';
          const branchId = parentDoc.getElementById('branchId')?.value?.trim() || '0603';
          
          if (centerId) {
            return { branchId, centerId };
          }
        } catch (e) { }
        
        // Try grandparent (center-maintenance scenario)
        if (targetWindow.parent && targetWindow.parent !== targetWindow) {
          try {
            const grandParentDoc = targetWindow.parent.document;
            const branchId = grandParentDoc.getElementById('branchId')?.value?.trim() || '';
            const centerId = grandParentDoc.getElementById('centerId')?.value?.trim() || '';
            
            if (branchId && centerId) {
              return { branchId, centerId };
            }
          } catch (e) { }
        }
      }
    } catch (error) {
      console.warn('[SubGroup Search] Could not get parent context:', error);
    }
    return { branchId: '', centerId: '' };
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get parent context
    const parentContext = getParentContext();
    
    if (!parentContext.branchId || !parentContext.centerId) {
      showError('Branch ID and Center ID are required. Please select them first.');
      return;
    }

    // Get search values from inputs
    const subGroupIdInput = criteriaEl?.querySelector('[data-search-field="subGroupId"]');
    const descriptionInput = criteriaEl?.querySelector('[data-search-field="description"]');
    const subGroupIdMode = criteriaEl?.querySelector('[data-search-mode="subGroupId"]');
    const descriptionMode = criteriaEl?.querySelector('[data-search-mode="description"]');

    const searchSubGroupId = subGroupIdInput?.value.trim() || '';
    const searchDescription = descriptionInput?.value.trim() || '';
    const subGroupIdOp = subGroupIdMode?.value || 'Like';
    const descriptionOp = descriptionMode?.value || 'Like';

    // Build WhereStmt based on search conditions
    const conditions = [];
    if (searchSubGroupId) {
      if (subGroupIdOp === 'Exact') {
        conditions.push(`SubGroupID='${searchSubGroupId}'`);
      } else {
        conditions.push(`SubGroupID LIKE '%${searchSubGroupId}%'`);
      }
    }
    if (searchDescription) {
      if (descriptionOp === 'Exact') {
        conditions.push(`subgroupname='${searchDescription}'`);
      } else {
        conditions.push(`subgroupname LIKE '%${searchDescription}%'`);
      }
    }
    const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

    // Build AdvFilterString based on parent context
    const advFilterString = `OurBranchID='${parentContext.branchId}' AND GroupID='${parentContext.centerId}'`;

    const payload = {
      WhereStmt: whereStmt,
      TableID: 'SubGroupID',
      RefID: null,
      PrevOrNext: 0,
      AdvFilterString: advFilterString,
      OperatorID: 'CSADM',
      ModuleID: 5067,
      OurBranchID: parentContext.branchId,
      SearchKey: null,
      LanguageID: 'en'
    };

    try {
      const result = await global.SearchService.searchSubGroups(payload);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        let subGroups = Array.isArray(result.data) ? result.data : (result.Details || result.data?.Details || []);
        renderResults(subGroups);
      } else {
        showError(result.message || 'Search failed');
      }
    } catch (err) {
      console.error('[SubGroup Search] Error:', err);
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
            <th>Sub Group ID</th>
            <th>Sub Group Name</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}">
          <td>${row.SubGroupID || ''}</td>
          <td>${row.SubGroupName || ''}</td>
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
      type: 'SUBGROUP_SELECTED',
      subGroupId: selectedData.SubGroupID || '',
      subGroupName: selectedData.SubGroupName || '',
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
