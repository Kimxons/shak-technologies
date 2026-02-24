(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('wf-advance-type-search-btn');
  const loadingEl = document.getElementById('wf-advance-type-loading');
  const resultsEl = document.getElementById('wf-advance-type-results');
  const emptyEl = document.getElementById('wf-advance-type-empty');
  const criteriaEl = document.getElementById('wf-advance-type-criteria');

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

    // Load all advance types on init
    executeSearch();
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get search values from inputs
    const advanceTypeIdInput = criteriaEl?.querySelector('[data-search-field="advanceTypeId"]');
    const advanceTypeNameInput = criteriaEl?.querySelector('[data-search-field="advanceTypeName"]');
    const advanceTypeIdMode = criteriaEl?.querySelector('[data-search-mode="advanceTypeId"]');
    const advanceTypeNameMode = criteriaEl?.querySelector('[data-search-mode="advanceTypeName"]');

    const searchAdvanceTypeId = advanceTypeIdInput?.value.trim() || '';
    const searchAdvanceTypeName = advanceTypeNameInput?.value.trim() || '';
    const advanceTypeIdOp = advanceTypeIdMode?.value || 'Like';
    const advanceTypeNameOp = advanceTypeNameMode?.value || 'Like';

    // Build WhereStmt based on search conditions
    const conditions = [];
    if (searchAdvanceTypeId) {
      if (advanceTypeIdOp === 'Exact') {
        conditions.push(`WFAdvTypeID='${searchAdvanceTypeId}'`);
      } else {
        conditions.push(`WFAdvTypeID LIKE '%${searchAdvanceTypeId}%'`);
      }
    }
    if (searchAdvanceTypeName) {
      if (advanceTypeNameOp === 'Exact') {
        conditions.push(`Description='${searchAdvanceTypeName}'`);
      } else {
        conditions.push(`Description LIKE '%${searchAdvanceTypeName}%'`);
      }
    }
    const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

    // Get branch ID from parent window or use default
    let branchId = '0603';
    try {
      branchId = window.parent.document.getElementById('branchId')?.value || 
                 window.parent.Environment?.branchID || 
                 window.parent.sessionStorage?.getItem('BranchID') || '0603';
    } catch (e) {
      branchId = '0603';
    }

    // Payload based on the stored procedure:
    // exec p_GetSearchResult @WhereStmt=N'',@TableID=N'WFAdvTypeActiveID',@RefID=NULL,@PrevOrNext=0,
    // @AdvFilterString=N'ModuleID in (''LN'') AND BankID =''00'' AND OurBranchID =''0603''',
    // @OperatorID=N'CSADM',@ModuleID=5010,@OurBranchID=N'0603',@SearchKey=NULL,@LanguageID='en'
    const payload = {
      TableID: 'WFAdvTypeActiveID',
      WhereStmt: whereStmt,
      RefID: null,
      PrevOrNext: 0,
      AdvFilterString: `ModuleID in ('LN') AND BankID ='00' AND OurBranchID ='${branchId}'`,
      OperatorID: 'CSADM',
      ModuleID: 5010,
      OurBranchID: branchId,
      SearchKey: null,
      LanguageID: 'en'
    };

    console.log('[WFAdvanceTypeSearch] Payload:', payload);

    try {
      const result = await global.LookupService.getSearchResult(payload);

      console.log('[WFAdvanceTypeSearch] Result:', result);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        const advanceTypes = Array.isArray(result.data) ? result.data : (result.Details || []);
        renderResults(advanceTypes);
      } else {
        showError(result.message || 'Search failed');
      }
    } catch (err) {
      console.error('[WFAdvanceTypeSearch] Error:', err);
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
      if (emptyEl) {
        emptyEl.textContent = 'No advance types found matching the criteria.';
        emptyEl.style.display = 'block';
      }
      if (resultsEl) resultsEl.style.display = 'none';
      return;
    }

    // Build table HTML
    let html = `
      <table class="results-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Advance Type ID</th>
            <th>Description</th>
            <th>Module ID</th>
          </tr>
        </thead>
        <tbody>
    `;

    rows.forEach((row, idx) => {
      const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
      const rowColor = idx % 2 === 0 ? '#ffffff' : '#e8f4ff';
      html += `
        <tr data-row="${jsonData}" data-idx="${idx}" style="background: ${rowColor}; cursor: pointer;">
          <td class="num-col">${idx + 1}</td>
          <td>${row.WFAdvTypeID || row.AdvanceTypeID || ''}</td>
          <td>${row.Description || row.AdvanceTypeName || ''}</td>
          <td>${row.ModuleID || ''}</td>
        </tr>
      `;
    });

    html += '</tbody></table>';

    if (resultsEl) {
      resultsEl.innerHTML = html;
      resultsEl.style.display = 'block';

      // Attach row click handlers
      resultsEl.querySelectorAll('tbody tr').forEach(tr => {
        const baseBg = tr.style.background;
        tr.dataset.baseBg = baseBg;

        tr.addEventListener('mouseover', () => {
          if (!tr.classList.contains('selected')) {
            tr.style.background = '#d0e8ff';
          }
        });

        tr.addEventListener('mouseout', () => {
          if (!tr.classList.contains('selected')) {
            tr.style.background = tr.dataset.baseBg;
          }
        });

        tr.addEventListener('click', () => selectResult(tr));
        tr.addEventListener('dblclick', () => {
          selectResult(tr);
          setSelected();
        });
      });
    }
  }

  function selectResult(tr) {
    // Remove selection from previous row
    if (selectedRow) {
      selectedRow.classList.remove('selected');
      selectedRow.style.background = selectedRow.dataset.baseBg;
    }
    
    selectedRow = tr;
    selectedRow.classList.add('selected');
    selectedRow.style.background = '#bfe0ff';
    selectedData = JSON.parse(tr.dataset.row);
  }

  function setSelected() {
    if (!selectedData) return;

    // Send message to parent with WF advance type data
    window.parent.postMessage({
      type: 'WF_ADVANCE_TYPE_SELECTED',
      advanceTypeId: selectedData.WFAdvTypeID || selectedData.AdvanceTypeID || '',
      advanceTypeName: selectedData.Description || selectedData.AdvanceTypeName || '',
      moduleId: selectedData.ModuleID || '',
      bankId: selectedData.BankID || '',
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
      console.warn('[WFAdvanceTypeSearch] Could not close parent modal:', e);
    }
    // Fallback to postMessage
    window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
  }

})(window);
