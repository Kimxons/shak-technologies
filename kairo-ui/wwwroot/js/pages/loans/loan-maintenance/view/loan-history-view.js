(function (global) {
  if (global.__LoanHistoryLoaded) {
    console.warn("loan-history-view.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LoanHistoryLoaded = true;

  const $ = (sel, root = document) => root.querySelector(sel);

  function requestClose() {
    // Send message to parent window to close child form
    if (window.parent && window.parent !== window) {
      window.parent.postMessage('close-loan-history', '*');
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

  // Render results in the grid
  function renderGrid(rows) {
    const table = document.getElementById('loanHistoryTable');
    const tbody = table ? table.querySelector('tbody') : null;
    
    if (!tbody) {
      console.error('[LoanHistory] Table tbody not found');
      return;
    }
    
    tbody.innerHTML = '';
    
    if (!rows || !rows.length) {
      const tr = document.createElement('tr');
      tr.innerHTML = `<td colspan="9" class="text-center text-muted py-4">No records to display.</td>`;
      tbody.appendChild(tr);
      updateRecordCount(0);
      return;
    }
    
    // Render rows: ApplicationID, LoanSeries, FirstDisbursementDate, SanctionedAmount, DisbursedAmount, Term, InterestRate, ClosedDate, FileNumber
    for (const row of rows) {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${row.ApplicationID ?? ''}</td>
        <td>${row.LoanSeries ?? ''}</td>
        <td>${formatDate(row.FirstDisbursementDate)}</td>
        <td class="text-end">${formatNumber(row.SanctionedAmount)}</td>
        <td class="text-end">${formatNumber(row.DisbursedAmount)}</td>
        <td>${row.Term ?? ''}</td>
        <td>${row.InterestRate ?? ''}</td>
        <td>${formatDate(row.ClosedDate)}</td>
        <td>${row.FileNumber ?? ''}</td>
      `;
      tbody.appendChild(tr);
    }
    
    updateRecordCount(rows.length);
  }

  // Fetch and display loan history
  async function loadLoanHistory() {
    console.log('[LoanHistory] loadLoanHistory called');
    
    // Try to get context from parent state first
    let state = getParentState();
    let OurBranchID = state?.OurBranchID || getParentFieldValue('BranchID');
    let AccountID = state?.AccountID || getParentFieldValue('AccountID');
    
    console.log('[LoanHistory] Parent context:', { OurBranchID, AccountID });
    
    if (!OurBranchID || !AccountID) {
      console.warn('Missing required parameters: BranchID or AccountID');
      renderGrid([]);
      return;
    }
    
    if (!window.LoanHistoryService) {
      console.error('LoanHistoryService not loaded');
      renderGrid([]);
      return;
    }
    
    try {
      console.log('[LoanHistory] Calling LoanHistoryService.getLoanHistory with:', { OurBranchID, AccountID });
      const resp = await window.LoanHistoryService.getLoanHistory({ 
        OurBranchID, 
        AccountID 
      });
      
      console.log('[LoanHistory] Service response:', resp);
      
      let rows = [];
      if (resp && resp.success) {
        if (Array.isArray(resp.data)) {
          rows = resp.data;
        } else if (Array.isArray(resp.Details)) {
          rows = resp.Details;
        } else if (Array.isArray(resp.Details01)) {
          rows = resp.Details01;
        } else if (resp.data && Array.isArray(resp.data.rows)) {
          rows = resp.data.rows;
        }
      }
      
      console.log('[LoanHistory] Rows to render:', rows);
      renderGrid(rows);
    } catch (error) {
      console.error('Error loading loan history:', error);
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
        loadLoanHistory();
      });
    }

    // Auto-load loan history when screen opens
    loadLoanHistory();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
