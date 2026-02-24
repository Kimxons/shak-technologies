(function (global) {
  if (global.__LoanCollateralsLoaded) {
    console.warn("loan-collaterals-view.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LoanCollateralsLoaded = true;

  const $ = (sel, root = document) => root.querySelector(sel);

  function requestClose() {
    // Send message to parent window to close child form
    if (window.parent && window.parent !== window) {
      window.parent.postMessage('close-loan-collaterals', '*');
    }
  }

  // Helper to get parent field value (from parent Loan Maintenance form)
  function getParentFieldValue(id) {
    try {
      if (window.parent && window.parent.document) {
        const el = window.parent.document.getElementById(id);
        return el ? el.value?.trim?.() : '';
      }
    } catch (e) {
      console.error('Error accessing parent field:', e);
    }
    return '';
  }

  // Helper to get parent state object
  function getParentState() {
    try {
      if (window.parent && window.parent.LoanMaintenanceState) {
        return window.parent.LoanMaintenanceState;
      }
    } catch (e) {
      console.error('Error accessing parent state:', e);
    }
    return null;
  }

  // Helper to get operator ID
  function getOperatorId() {
    try {
      if (typeof window.getOperatorId === 'function') {
        return window.getOperatorId();
      }
    } catch (e) {
      console.error('Error getting operator ID:', e);
    }
    return '';
  }

  // Format date to DD-MM-YYYY
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  }

  // Format number with commas
  function formatNumber(num) {
    if (num == null || num === '') return '';
    const numValue = parseFloat(num);
    if (isNaN(numValue)) return num;
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  // Update record count
  function updateRecordCount(count) {
    const countEl = document.getElementById('recordCount');
    if (countEl) {
      countEl.textContent = `(${count} records)`;
    }
  }

  // Render results in the table
  function renderGrid(rows) {
    const table = document.getElementById('collateralsTable');
    const tbody = table ? table.querySelector('tbody') : null;
    
    if (!tbody) {
      console.error('[Collaterals] Table tbody not found');
      return;
    }
    
    tbody.innerHTML = '';
    
    if (!rows || !rows.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="12" class="text-center text-muted py-4">No records to display.</td>`;
      tbody.appendChild(tr);
      updateRecordCount(0);
      return;
    }
    
    // Render rows: RefNo, CollateralID, Description, OwnerClientID, OwnerClientName, AssignedDate, CurrencyID, CollateralValue, ValueAssignedToTheLoan, WithDrawnDate, WithDrawnReason, RecordStatus
    for (const row of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.RefNo ?? ''}</td>
        <td>${row.CollateralID ?? ''}</td>
        <td>${row.Description ?? ''}</td>
        <td>${row.OwnerClientID ?? ''}</td>
        <td>${row.OwnerClientName ?? ''}</td>
        <td>${formatDate(row.AssignedDate)}</td>
        <td>${row.CurrencyID ?? ''}</td>
        <td class="text-end">${formatNumber(row.CollateralValue)}</td>
        <td class="text-end">${formatNumber(row.ValueAssignedToTheLoan)}</td>
        <td>${formatDate(row.WithDrawnDate)}</td>
        <td>${row.WithDrawnReason ?? ''}</td>
        <td>${row.RecordStatus ?? ''}</td>
      `;
      tbody.appendChild(tr);
    }
    
    updateRecordCount(rows.length);
  }

  // Fetch and display collaterals
  async function loadCollaterals() {
    console.log('[Collaterals] loadCollaterals called');
    
    // Try to get context from parent state first
    let state = getParentState();
    let OurBranchID = state?.OurBranchID || getParentFieldValue('BranchID');
    let AccountID = state?.AccountID || getParentFieldValue('AccountID');
    let LoanSeries = state?.LoanSeries || getParentFieldValue('LoanSeries') || '1';
    let OperatorID = getOperatorId();
    
    console.log('[Collaterals] Parent context:', { OurBranchID, AccountID, LoanSeries, OperatorID });
    
    if (!OurBranchID || !AccountID) {
      console.warn('Missing required parameters: BranchID or AccountID');
      renderGrid([]);
      return;
    }
    
    if (!window.CoreApi) {
      console.error('[Collaterals] CoreApi not loaded');
      renderGrid([]);
      return;
    }
    
    try {
      console.log('[Collaterals] Calling p_LoanCollateralView with:', { OurBranchID, AccountID, LoanSeries, OperatorID });
      
      const formId = "p_LoanCollateralView";
      const envelope = window.CoreApi.makeRequestEnvelope(formId, {
        OurBranchID,
        AccountID,
        LoanSeries: parseInt(LoanSeries) || 1,
        OperatorID
      });
      
      const resp = await window.CoreApi.post(
        (window.Environment?.baseUrlLoans || window.Environment?.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "") + "/api/OldAPI",
        envelope
      );
      
      console.log('[Collaterals] Service response:', resp);
      
      let rows = [];
      if (resp && resp.success) {
        if (Array.isArray(resp.data)) {
          rows = resp.data;
        } else if (Array.isArray(resp.Details)) {
          rows = resp.Details;
        } else if (resp.data && Array.isArray(resp.data.rows)) {
          rows = resp.data.rows;
        }
      }
      
      console.log('[Collaterals] Rows to render:', rows);
      renderGrid(rows);
    } catch (error) {
      console.error('[Collaterals] Error loading collaterals:', error);
      renderGrid([]);
    }
  }

  function init() {
    const root = document;

    // Handle action buttons
    const closeBtn = root.querySelector('[data-action="close"]');
    const refreshBtn = root.querySelector('[data-action="refresh"]');
    
    if (closeBtn) {
      closeBtn.addEventListener('click', requestClose);
    }
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        loadCollaterals();
      });
    }

    // Auto-load collaterals when screen opens
    loadCollaterals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
