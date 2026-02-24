(function () {
  'use strict';

  // ============================================================================
  // DOM ELEMENTS
  // ============================================================================
  const elements = {
    closeBtn: document.querySelector('[data-action="close"]'),
    tableBody: document.querySelector('#loanScheduleTable tbody'),
    recordCount: document.querySelector('#recordCount')
  };

  // ============================================================================
  // UTILITY FUNCTIONS
  // ============================================================================
  
  /**
   * Request parent window to close this child form
   */
  function requestClose() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage('close-loan-schedule', '*');
    }
  }

  /**
   * Format money values - handle both plain numbers and comma-formatted strings
   */
  function formatMoney(value) {
    if (!value && value !== 0) return '-';
    
    // Convert to string and remove any existing commas (database returns formatted values)
    let numValue = String(value).replace(/,/g, '');
    
    // Convert to number
    numValue = parseFloat(numValue);
    
    // If not a valid number, return dash
    if (isNaN(numValue)) return '-';
    
    // Format with commas and 2 decimal places
    return numValue.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Format date to DD-MM-YYYY
   */
  function formatDateDDMMYYYY(dateStr) {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  /**
   * Get context from Customer Query parent window
   */
  function getCustomerQueryContext() {
    try {
      // Method 1: Check if parent has CustomerQueryState
      if (window.parent && window.parent.CustomerQueryState) {
        console.log('[LoanSchedule] Got context from CustomerQueryState:', window.parent.CustomerQueryState);
        return window.parent.CustomerQueryState;
      }
      
      // Method 2: Check if parent has selectedAccount
      if (window.parent && window.parent.selectedAccount) {
        const acc = window.parent.selectedAccount;
        console.log('[LoanSchedule] Got context from selectedAccount:', acc);
        return {
          OurBranchID: acc.OurBranchID || '',
          AccountID: acc.AccountID || acc.AccountNumber || '',
          LoanSeries: acc.LoanSeries || acc.LoanSeriesNo || '',
          AccountType: acc.AccountType || acc.Type || '',
          ProductID: acc.ProductID || '',
          ProductTypeID: acc.ProductTypeID || '',
          ProductType: acc.ProductType || ''
        };
      }
      
      // Method 3: Fall back to reading fields directly from parent
      if (window.parent && window.parent.document) {
        const branchId = window.parent.document.querySelector('[name="OurBranchID"]')?.value || '';
        const accountId = window.parent.document.querySelector('[name="AccountID"]')?.value || '';
        const loanSeries = window.parent.document.querySelector('[name="LoanSeries"]')?.value || '';
        
        if (branchId && accountId) {
          console.log('[LoanSchedule] Got context from parent fields:', { branchId, accountId, loanSeries });
          return {
            OurBranchID: branchId,
            AccountID: accountId,
            LoanSeries: loanSeries
          };
        }
      }
    } catch (error) {
      console.warn('[LoanSchedule] Cannot access parent context:', error);
    }
    
    console.error('[LoanSchedule] No context available from parent');
    return null;
  }

  /**
   * Load loan schedule from API
   */
  async function loadLoanSchedule() {
    try {
      console.log('[LoanSchedule] Loading loan schedule...');
      
      // Get loan context from parent window
      const context = getCustomerQueryContext();
      
      if (!context || !context.OurBranchID || !context.AccountID) {
        console.warn('[LoanSchedule] Missing loan context from parent window:', context);
        showError('Missing account information. Please select a loan account from Customer Query.');
        return;
      }

      // Check if LoanSeries is available
      if (!context.LoanSeries) {
        console.warn('[LoanSchedule] LoanSeries not found in context. Attempting to fetch anyway...');
      }

      console.log('[LoanSchedule] Using context:', context);

      // Check if service is available
      if (!window.CoreApi) {
        console.error('[LoanSchedule] CoreApi not loaded');
        showError('CoreApi service not available');
        return;
      }

      // Fetch loan schedule data
      const formId = "dbo.p_GetLoanInstallments";
      const requestData = {
        OurBranchID: context.OurBranchID,
        AccountID: context.AccountID,
        LoanSeries: context.LoanSeries || '1' // Default to '1' if not available
      };
      
      const envelope = window.CoreApi.makeRequestEnvelope(formId, requestData);
      const BASE_URL = (window.Environment?.baseUrlLoans || window.Environment?.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
      const LOANS_ENDPOINT = `${BASE_URL}/api/OldAPI`;
      
      console.log('[LoanSchedule] Request payload:', {
        formId,
        requestData,
        envelope,
        endpoint: LOANS_ENDPOINT
      });
      
      const response = await window.CoreApi.post(LOANS_ENDPOINT, envelope);

      console.log('[LoanSchedule] Response:', response);

      // Extract rows from response
      let rows = [];
      if (response && response.success && Array.isArray(response.data)) {
        rows = response.data;
      } else if (response && response.success && response.data && Array.isArray(response.data.Details)) {
        rows = response.data.Details;
      } else if (response && Array.isArray(response)) {
        rows = response;
      }
      
      console.log('[LoanSchedule] Extracted rows:', rows);

      if (rows && rows.length > 0) {
        console.log('[LoanSchedule] ===== DATA CONTEXT =====');
        console.log('[LoanSchedule] Total Records:', rows.length);
        console.log('[LoanSchedule] First Installment:', rows[0]);
        console.log('[LoanSchedule] ========================');
      }

      // Render the schedule
      renderSchedule(rows);
      
    } catch (error) {
      console.error('[LoanSchedule] Error loading schedule:', error);
      showError('Failed to load loan schedule: ' + error.message);
    }
  }

  /**
   * Render loan schedule data
   */
  function renderSchedule(data) {
    if (!elements.tableBody) {
      console.error('[LoanSchedule] Table body element not found!');
      return;
    }
    
    if (!data || data.length === 0) {
      console.warn('[LoanSchedule] No data to render');
      renderEmptyState();
      return;
    }

    console.log('[LoanSchedule] Starting renderSchedule with', data.length, 'records');

    const rows = data.map((item, index) => {
      // Map database field names to display field names
      const instNo = item.InstallmentNo || item.Installment_No || item.INSTALLMENT_NO || item.InstNo || '-';
      const dueDate = item.InstallmentDueDate || item.Installment_Due_Date || item.DueDate || item.DUE_DATE || '';
      const loanBal = item.LoanBalance || item.Loan_Balance || item.LOAN_BALANCE || item.ClosingBalance || item.Balance || 0;
      const principalBal = item.PrincipalBalance || item.Principal_Balance || item.PRINCIPAL_BALANCE || item.Outstanding || 0;
      const instAmount = item.InstallmentAmount || item.Installment_Amount || item.EMI || item.EMI_Amount || 0;
      const principalDue = item.PrincipalDue || item.Principal_Due || item.PRINCIPAL_DUE || item.Principal || 0;
      const intRate = item.InterestRate || item.Interest_Rate || item.INTEREST_RATE || item.IntRate || '-';
      const intDue = item.InterestDue || item.Interest_Due || item.INTEREST_DUE || item.Interest || 0;
      const expInt = item.ExpectedInterest || item.Expected_Interest || item.EXPECTED_INTEREST || 0;
      const taxAmount = item.Tax || item.TAX || item.TaxAmount || 0;
      const otherAmount = item.Others || item.OtherCharges || item.OTHER_CHARGES || 0;
      const status = item.PaidStatus || item.Paid_Status || item.Status || item.STATUS || '-';

      return `
        <tr>
          <td class="text-center">${instNo}</td>
          <td class="text-center">${formatDateDDMMYYYY(dueDate)}</td>
          <td class="text-end">${formatMoney(loanBal)}</td>
          <td class="text-end">${formatMoney(principalBal)}</td>
          <td class="text-end">${formatMoney(instAmount)}</td>
          <td class="text-end">${formatMoney(principalDue)}</td>
          <td class="text-center">${intRate}</td>
          <td class="text-end">${formatMoney(intDue)}</td>
          <td class="text-end">${formatMoney(expInt)}</td>
          <td class="text-end">${formatMoney(taxAmount)}</td>
          <td class="text-end">${formatMoney(otherAmount)}</td>
          <td class="text-center">${status}</td>
        </tr>
      `;
    }).join('');

    elements.tableBody.innerHTML = rows;
    console.log('[LoanSchedule] Table body updated with', data.length, 'rows');
    updateRecordCount(data.length);
  }

  /**
   * Render empty state
   */
  function renderEmptyState() {
    if (!elements.tableBody) return;
    elements.tableBody.innerHTML = `
      <tr>
        <td colspan="12" class="text-center text-muted py-3">No records to display.</td>
      </tr>
    `;
    updateRecordCount(0);
  }

  /**
   * Show error message
   */
  function showError(message) {
    console.error('[LoanSchedule]', message);
    if (elements.tableBody) {
      elements.tableBody.innerHTML = `
        <tr>
          <td colspan="12" class="text-center text-danger py-3">
            <i class="bi bi-exclamation-triangle me-2"></i>${message}
          </td>
        </tr>
      `;
    }
    updateRecordCount(0);
  }

  /**
   * Update the record count display
   */
  function updateRecordCount(count) {
    if (elements.recordCount) {
      elements.recordCount.textContent = `(${count} record${count !== 1 ? 's' : ''})`;
    }
  }

  // ============================================================================
  // EVENT HANDLERS
  // ============================================================================
  
  /**
   * Wire up event listeners
   */
  function wireEventListeners() {
    // Close button
    const closeButtons = document.querySelectorAll('[data-action="close"]');
    closeButtons.forEach(btn => {
      btn.addEventListener('click', requestClose);
    });

    // Refresh button
    const refreshButtons = document.querySelectorAll('[data-action="refresh"]');
    refreshButtons.forEach(btn => {
      btn.addEventListener('click', () => location.reload());
    });

    // Handle Escape key
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        requestClose();
      }
    });
  }

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  
  /**
   * Initialize module
   */
  function init() {
    console.log('[LoanSchedule] Initializing...');
    wireEventListeners();
    // Don't auto-load here, let the HTML script call it
  }

  // Expose functions to global scope for HTML inline scripts
  window.loadLoanSchedule = loadLoanSchedule;

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
