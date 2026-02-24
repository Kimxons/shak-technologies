(function (global) {
  if (global.__CustomerQueryAccountCollateralsLoaded) {
    console.warn("account-collaterals.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__CustomerQueryAccountCollateralsLoaded = true;

  // DOM element caching
  const elements = {
    table: () => document.getElementById('collateralsTable'),
    tbody: () => document.querySelector('#collateralsTable tbody'),
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
    console.log('[AccountCollaterals] Retrieving context from parent');
    
    // Method 1: Check parent window's CustomerQueryState object
    try {
      if (window.parent && window.parent.CustomerQueryState) {
        console.log('[AccountCollaterals] Found CustomerQueryState:', window.parent.CustomerQueryState);
        return window.parent.CustomerQueryState;
      }
    } catch (e) {
      console.log('[AccountCollaterals] Could not access CustomerQueryState:', e.message);
    }

    // Method 2: Check parent window's selectedAccount object
    try {
      if (window.parent && window.parent.selectedAccount) {
        console.log('[AccountCollaterals] Found selectedAccount:', window.parent.selectedAccount);
        return window.parent.selectedAccount;
      }
    } catch (e) {
      console.log('[AccountCollaterals] Could not access selectedAccount:', e.message);
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
          console.log('[AccountCollaterals] Retrieved context from parent fields:', context);
          return context;
        }
      }
    } catch (e) {
      console.log('[AccountCollaterals] Could not read from parent fields:', e.message);
    }

    console.warn('[AccountCollaterals] No context found in parent window');
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

  // Render collaterals rows in table
  function renderGrid(rows) {
    const tbody = elements.tbody();
    
    if (!tbody) {
      console.error('[AccountCollaterals] Table tbody not found');
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
    console.log('[AccountCollaterals] loadCollaterals called');
    
    // Get context from parent window
    const context = getCustomerQueryContext();
    
    if (!context || !context.OurBranchID || !context.AccountID) {
      console.warn('[AccountCollaterals] Missing required context: OurBranchID or AccountID');
      renderGrid([]);
      return;
    }

    console.log('[AccountCollaterals] Context retrieved:', context);
    
    // Verify CoreApi is available
    if (!window.CoreApi) {
      console.error('[AccountCollaterals] CoreApi not loaded');
      renderGrid([]);
      return;
    }
    
    try {
      const OperatorID = getOperatorId();
      const LoanSeries = parseInt(context.LoanSeries) || 1;

      console.log('[AccountCollaterals] Calling p_LoanCollateralView with:', {
        OurBranchID: context.OurBranchID,
        AccountID: context.AccountID,
        LoanSeries,
        OperatorID
      });

      const formId = "p_LoanCollateralView";
      const envelope = window.CoreApi.makeRequestEnvelope(formId, {
        OurBranchID: context.OurBranchID,
        AccountID: context.AccountID,
        LoanSeries,
        OperatorID
      });

      const resp = await window.CoreApi.post(
        (window.Environment?.baseUrlLoans || window.Environment?.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "") + "/api/OldAPI",
        envelope
      );
      
      console.log('[AccountCollaterals] Service response:', resp);
      
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
      
      console.log('[AccountCollaterals] Rows to render:', rows);
      renderGrid(rows);
    } catch (error) {
      console.error('[AccountCollaterals] Error loading collaterals:', error);
      renderGrid([]);
    }
  }

  // Close window
  function requestClose() {
    console.log('[AccountCollaterals] Closing window');
    if (window.parent && window.parent !== window) {
      window.parent.postMessage('close-account-collaterals', '*');
    }
  }

  // Initialize
  function init() {
    console.log('[AccountCollaterals] Initializing');

    // Setup button handlers
    const refreshBtn = elements.refreshBtn();
    const closeBtn = elements.closeBtn();
    
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log('[AccountCollaterals] Refresh clicked');
        loadCollaterals();
      });
    }
    
    if (closeBtn) {
      closeBtn.addEventListener('click', requestClose);
    }

    // Load data on initialization
    loadCollaterals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})(window);
