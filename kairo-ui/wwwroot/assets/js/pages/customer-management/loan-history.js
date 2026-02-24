(function (global) {
  if (global.__CustomerQueryLoanHistoryLoaded) {
    console.warn("loan-history.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__CustomerQueryLoanHistoryLoaded = true;

  // DOM element caching
  const elements = {
    table: () => document.getElementById('loanHistoryTable'),
    tbody: () => document.querySelector('#loanHistoryTable tbody'),
    recordCount: () => document.getElementById('recordCount'),
    refreshBtn: () => document.querySelector('[data-action="refresh"]'),
    closeBtn: () => document.querySelector('[data-action="close"]')
  };

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

  // Update record count display
  function updateRecordCount(count) {
    const countEl = elements.recordCount();
    if (countEl) {
      countEl.textContent = `(${count} records)`;
    }
  }

  // Get Customer Query context from parent window
  function getCustomerQueryContext() {
    console.log('[LoanHistory] Retrieving context from parent');
    
    // Method 1: Check parent window's CustomerQueryState object
    try {
      if (window.parent && window.parent.CustomerQueryState) {
        console.log('[LoanHistory] Found CustomerQueryState:', window.parent.CustomerQueryState);
        return window.parent.CustomerQueryState;
      }
    } catch (e) {
      console.log('[LoanHistory] Could not access CustomerQueryState:', e.message);
    }

    // Method 2: Check parent window's selectedAccount object
    try {
      if (window.parent && window.parent.selectedAccount) {
        console.log('[LoanHistory] Found selectedAccount:', window.parent.selectedAccount);
        return window.parent.selectedAccount;
      }
    } catch (e) {
      console.log('[LoanHistory] Could not access selectedAccount:', e.message);
    }

    // Method 3: Read fields directly from parent document
    try {
      if (window.parent && window.parent.document) {
        const parent = window.parent.document;
        const context = {
          OurBranchID: parent.getElementById('txtOurBranchID')?.value || '',
          AccountID: parent.getElementById('txtAccountID')?.value || '',
          ProductID: parent.getElementById('txtProductID')?.value || '',
          ProductTypeID: parent.getElementById('txtProductTypeID')?.value || '',
          LoanSeries: parent.getElementById('txtLoanSeries')?.value || '1',
          ClientID: parent.getElementById('txtClientID')?.value || ''
        };
        if (context.OurBranchID || context.AccountID) {
          console.log('[LoanHistory] Retrieved context from parent fields:', context);
          return context;
        }
      }
    } catch (e) {
      console.log('[LoanHistory] Could not read from parent fields:', e.message);
    }

    console.warn('[LoanHistory] No context found in parent window');
    return null;
  }

  // Render loan history rows in table
  function renderGrid(rows) {
    const tbody = elements.tbody();
    
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
    
    // Get context from parent window
    const context = getCustomerQueryContext();
    
    if (!context || !context.OurBranchID || !context.AccountID) {
      console.warn('[LoanHistory] Missing required context: OurBranchID or AccountID');
      renderGrid([]);
      return;
    }

    console.log('[LoanHistory] Context retrieved:', context);
    
    // Verify service is available
    if (!window.LoanHistoryService) {
      console.error('[LoanHistory] LoanHistoryService not loaded');
      renderGrid([]);
      return;
    }
    
    try {
      console.log('[LoanHistory] Calling LoanHistoryService.getLoanHistory with:', {
        OurBranchID: context.OurBranchID,
        AccountID: context.AccountID
      });

      const resp = await window.LoanHistoryService.getLoanHistory({
        OurBranchID: context.OurBranchID,
        AccountID: context.AccountID
      });
      
      console.log('[LoanHistory] Service response:', resp);
      
      let rows = [];
      if (resp && resp.success) {
        // Handle various response formats
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
      console.error('[LoanHistory] Error loading loan history:', error);
      renderGrid([]);
    }
  }

  // Close window
  function requestClose() {
    console.log('[LoanHistory] Closing window');
    if (window.parent && window.parent !== window) {
      window.parent.postMessage('close-loan-history', '*');
    }
  }

  // Initialize
  function init() {
    console.log('[LoanHistory] Initializing');

    // Setup button handlers
    const refreshBtn = elements.refreshBtn();
    const closeBtn = elements.closeBtn();
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('[LoanHistory] Refresh clicked');
        loadLoanHistory();
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', requestClose);
    }

    // Load data on initialization
    loadLoanHistory();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
