(function (global) {
  // DOM Elements
  const searchBtn = document.getElementById('loan-cycle-search-btn');
  const loadingEl = document.getElementById('loan-cycle-loading');
  const resultsEl = document.getElementById('loan-cycle-results');
  const emptyEl = document.getElementById('loan-cycle-empty');
  const criteriaEl = document.getElementById('loan-cycle-criteria');

  let selectedRow = null;
  let selectedData = null;
  
  // Get URL parameters for dynamic filtering
  // LoanSchemeID is passed from the parent form
  const urlParams = new URLSearchParams(window.location.search);
  const schemeIdParam = urlParams.get('schemeId') || '';
  const moduleIdParam = urlParams.get('moduleId') || '5020';

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

    // Load all loan cycles on init
    executeSearch();
  }

  async function executeSearch() {
    // Show loading state
    if (loadingEl) loadingEl.style.display = 'block';
    if (resultsEl) resultsEl.style.display = 'none';
    if (emptyEl) emptyEl.style.display = 'none';

    // Get search values from inputs
    const loanCycleNoInput = criteriaEl?.querySelector('[data-search-field="loanCycleNo"]');
    const effectiveDateInput = criteriaEl?.querySelector('[data-search-field="effectiveDate"]');
    const loanCycleNoMode = criteriaEl?.querySelector('[data-search-mode="loanCycleNo"]');
    const effectiveDateMode = criteriaEl?.querySelector('[data-search-mode="effectiveDate"]');

    const searchLoanCycleNo = loanCycleNoInput?.value.trim() || '';
    const searchEffectiveDate = effectiveDateInput?.value.trim() || '';
    const loanCycleNoOp = loanCycleNoMode?.value || 'Like';
    const effectiveDateOp = effectiveDateMode?.value || 'Like';

    // Build WhereStmt based on search conditions
    const conditions = [];
    if (searchLoanCycleNo) {
      if (loanCycleNoOp === 'Exact') {
        conditions.push(`LoanCycleNo='${searchLoanCycleNo}'`);
      } else {
        conditions.push(`LoanCycleNo LIKE '%${searchLoanCycleNo}%'`);
      }
    }
    if (searchEffectiveDate) {
      if (effectiveDateOp === 'Exact') {
        conditions.push(`EffectiveDate='${searchEffectiveDate}'`);
      } else {
        conditions.push(`EffectiveDate LIKE '%${searchEffectiveDate}%'`);
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

    // Build AdvFilterString with LoanSchemeID from URL parameter
    let advFilterString = "BankID = '00'";
    if (schemeIdParam) {
      advFilterString += ` AND LoanSchemeID='${schemeIdParam}'`;
    }

    // Payload based on the stored procedure:
    // exec p_GetSearchResult @WhereStmt=N'',@TableID=N'GPLNMenuEffDate',@RefID=NULL,@PrevOrNext=0,
    // @AdvFilterString=N'BankID = ''00'' AND LoanSchemeID=''SCH01''',@OperatorID=N'CSADM',
    // @ModuleID=5020,@OurBranchID=N'0603',@SearchKey=NULL,@LanguageID='en'
    const payload = {
      TableID: 'GPLNMenuEffDate',
      WhereStmt: whereStmt,
      RefID: null,
      PrevOrNext: 0,
      AdvFilterString: advFilterString,
      OperatorID: 'CSADM',
      ModuleID: parseInt(moduleIdParam) || 5020,
      OurBranchID: branchId,
      SearchKey: null,
      LanguageID: 'en'
    };

    console.log('[LoanCycleSearch] Payload:', payload);

    try {
      const result = await global.LookupService.getSearchResult(payload);

      console.log('[LoanCycleSearch] Result:', result);

      if (loadingEl) loadingEl.style.display = 'none';

      if (result.success) {
        const loanCycles = Array.isArray(result.data) ? result.data : (result.Details || []);
        renderResults(loanCycles);
      } else {
        showError(result.message || 'Search failed');
      }
    } catch (err) {
      console.error('[LoanCycleSearch] Error:', err);
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

  function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      return date.toLocaleDateString();
    } catch {
      return dateStr;
    }
  }

  function renderResults(data) {
    const rows = Array.isArray(data) ? data : [];

    if (rows.length === 0) {
      if (emptyEl) {
        emptyEl.textContent = 'No loan cycles found matching the criteria.';
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
            <th>Loan Cycle No</th>
            <th>Cycle Description</th>
            <th>Loan Level No</th>
            <th>Level Description</th>
            <th>Effective Date</th>
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
          <td>${row.LoanCycleNo || ''}</td>
          <td>${row.LoanCycleDesc || row.CycleDescription || ''}</td>
          <td>${row.LoanLevelNo || ''}</td>
          <td>${row.LoanLevelDesc || row.LevelDescription || ''}</td>
          <td>${formatDate(row.EffectiveDate)}</td>
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

    // Send message to parent with loan cycle data including descriptions
    window.parent.postMessage({
      type: 'LOAN_CYCLE_SELECTED',
      loanCycleNo: selectedData.LoanCycleNo || '',
      loanCycleDesc: selectedData.LoanCycleDesc || selectedData.CycleDescription || '',
      loanLevelNo: selectedData.LoanLevelNo || '',
      loanLevelDesc: selectedData.LoanLevelDesc || selectedData.LevelDescription || '',
      effectiveDate: selectedData.EffectiveDate || '',
      loanSchemeId: selectedData.LoanSchemeID || '',
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
      console.warn('[LoanCycleSearch] Could not close parent modal:', e);
    }
    // Fallback to postMessage
    window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
  }

})(window);
