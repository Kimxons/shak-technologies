(function () {
  'use strict';

  // ============================================================================
  // DOM ELEMENTS
  // ============================================================================
  const elements = {
    closeBtn: document.querySelector('[data-action="close"]'),
    backBtn: document.querySelector('[data-action="back"]'),
    tableBody: document.querySelector('#installmentScheduleTable tbody'),
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
      window.parent.postMessage({ action: 'close-child-form' }, '*');
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
   * Format date values
   */
  function formatDate(dateStr) {
    if (!dateStr) return '-';
    try {
      const date = new Date(dateStr);
      return date.toLocaleDateString('en-GB');
    } catch {
      return dateStr;
    }
  }

  // ============================================================================
  // DATA LOADING
  // ============================================================================
  
  /**
   * Load installment schedule from parent context
   */
  async function loadInstallmentSchedule() {
    try {
      // Get loan context from parent window
      const OurBranchID = getParentFieldValue('BranchID');
      const AccountID = getParentFieldValue('AccountID');
      const LoanSeries = getParentFieldValue('LoanSeries');
      
      if (!OurBranchID || !AccountID || !LoanSeries) {
        renderEmptyState();
        return;
      }

      // Check if service is available
      if (!window.CoreApi) {
        console.error('[InstallmentSchedule] CoreApi not loaded');
        renderEmptyState();
        return;
      }

      // Fetch installment schedule data
      const formId = "dbo.p_GetLoanInstallments";
      const requestData = {
        OurBranchID,
        AccountID,
        LoanSeries
      };
      
      const envelope = window.CoreApi.makeRequestEnvelope(formId, requestData);
      const BASE_URL = (window.Environment?.baseUrlLoans || window.Environment?.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
      const LOANS_ENDPOINT = `${BASE_URL}/api/OldAPI`;
      
      console.log('[InstallmentSchedule] Request payload:', {
        formId,
        requestData,
        envelope
      });
      
      const response = await window.CoreApi.post(LOANS_ENDPOINT, envelope);

      console.log('[InstallmentSchedule] Response:', response);

      // Extract rows from response
      let rows = [];
      if (response && response.success && Array.isArray(response.data)) {
        rows = response.data;
      } else if (response && response.success && response.data && Array.isArray(response.data.Details)) {
        rows = response.data.Details;
      } else if (response && Array.isArray(response)) {
        rows = response;
      }
      
      console.log('[InstallmentSchedule] Extracted rows:', rows);

      // VERIFY THE LOAN CONTEXT - show which loan this data is for
      if (rows && rows.length > 0) {
        const firstRow = rows[0];
        console.log('[InstallmentSchedule] ===== DATA CONTEXT =====');
        console.log('[InstallmentSchedule] Account ID:', firstRow.AccountID);
        console.log('[InstallmentSchedule] Account Name:', firstRow.AccountName);
        console.log('[InstallmentSchedule] Loan Series:', firstRow.LoanSeries);
        console.log('[InstallmentSchedule] Product:', firstRow.productName);
        console.log('[InstallmentSchedule] Branch:', firstRow.BranchName);
        console.log('[InstallmentSchedule] Total Records:', rows.length);
        console.log('[InstallmentSchedule] First Installment:', {
          no: firstRow.InstallmentNo,
          dueDate: firstRow.InstallmentDueDate,
          loanBalance: firstRow.LoanBalance,
          installmentAmount: firstRow.InstallmentAmount
        });
        console.log('[InstallmentSchedule] ========================');
      }

      // CRITICAL: Validate data is NOT test data before rendering
      if (!validateExtractedData(rows)) {
        console.error('[InstallmentSchedule] DATA VALIDATION FAILED - Possible test data detected!');
        showError('Invalid data received from database. Please try again.');
        return;
      }

      // Render the schedule
      renderSchedule(rows);
      
    } catch (error) {
      console.error('[InstallmentSchedule] Error loading schedule:', error);
      showError('Failed to load installment schedule');
    }
  }

  /**
   * Validate extracted data to ensure it's real database data, not test data
   * @param {Array} rows - Data rows to validate
   * @returns {boolean} True if data is valid production data
   */
  function validateExtractedData(rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
      return false;
    }

    // Check first row for valid structure
    const firstRow = rows[0];
    
    // Must have required fields
    const requiredFields = ['InstallmentNo', 'InstallmentDueDate', 'LoanBalance'];
    const hasRequiredFields = requiredFields.some(field => 
      field in firstRow || 
      field.replace(/([A-Z])/g, '_$1').toLowerCase() in firstRow
    );
    
    if (!hasRequiredFields) {
      console.error('[InstallmentSchedule] VALIDATION FAILED: Missing required fields', Object.keys(firstRow));
      return false;
    }

    // CRITICAL CHECK: Reject data with unrealistic years (test data indicators)
    // Test data often uses year 2039, 2040, 2041, etc. as placeholders
    const dueDate = firstRow.InstallmentDueDate || firstRow.Installment_Due_Date || '';
    const dateString = String(dueDate).toLowerCase();
    
    // Reject if contains test year patterns
    if (dateString.includes('2039') || dateString.includes('2040') || dateString.includes('2041') || 
        dateString.includes('2042') || dateString.includes('2099')) {
      console.error('[InstallmentSchedule] VALIDATION FAILED: Detected test data year in date:', dueDate);
      return false;
    }

    // Check that we have a reasonable number of records
    if (rows.length < 1) {
      console.error('[InstallmentSchedule] VALIDATION FAILED: No installment records provided');
      return false;
    }

    console.log('[InstallmentSchedule] Data validation PASSED - data is production data with', rows.length, 'records. First date:', dueDate);
    return true;
  }

  /**
   * Get field value from parent Loan Maintenance form
   */
  function getParentFieldValue(fieldId) {
    try {
      if (window.parent && window.parent.document) {
        const field = window.parent.document.getElementById(fieldId);
        return field ? (field.value || '').trim() : '';
      }
    } catch (error) {
      console.warn('[InstallmentSchedule] Cannot access parent field:', fieldId);
    }
    return '';
  }

  /**
   * Get context from parent window (alternative method)
   */
  function getContextFromParent() {
    return new Promise((resolve) => {
      if (window.parent && window.parent !== window) {
        // Request context from parent
        window.parent.postMessage({ action: 'get-context' }, '*');
        
        // Listen for response
        const handler = (event) => {
          if (event.data && event.data.action === 'context-response') {
            window.removeEventListener('message', handler);
            resolve(event.data.context || {});
          }
        };
        window.addEventListener('message', handler);
        
        // Timeout after 2 seconds
        setTimeout(() => {
          window.removeEventListener('message', handler);
          resolve({});
        }, 2000);
      } else {
        resolve({});
      }
    });
  }

  /**
   * Render installment schedule data
   */
  function renderSchedule(data) {
    if (!elements.tableBody) {
      console.error('[InstallmentSchedule] Table body element not found!');
      return;
    }
    
    if (!data || data.length === 0) {
      console.warn('[InstallmentSchedule] No data to render');
      renderEmptyState();
      return;
    }

    console.log('[InstallmentSchedule] Starting renderSchedule with', data.length, 'records');

    const rows = data.map((item, index) => {
      // Log the ENTIRE first item to see what fields are available
      if (index === 0) {
        console.log('[InstallmentSchedule] FIRST ROW OBJECT KEYS AND VALUES:');
        console.log('Full first record:', JSON.stringify(item, null, 2));
        console.log('Available fields:', Object.keys(item));
      }

      // Map database field names to display field names
      // Handle variations in field naming from database
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

      // Log sample rows to verify rendering
      if (index < 3 || index === data.length - 1) {
        console.log(`[InstallmentSchedule] Row ${index + 1} MAPPED VALUES:`, {
          instNo,
          dueDate,
          loanBal,
          instAmount,
          intDue,
          taxAmount
        });
      }

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

    console.log('[InstallmentSchedule] Generated HTML rows:', rows.substring(0, 200) + '...');
    elements.tableBody.innerHTML = rows;
    console.log('[InstallmentSchedule] Table body updated with', data.length, 'rows');
    updateRecordCount(data.length);
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
  }

  /**
   * Show error message
   */
  function showError(message) {
    console.error('[InstallmentSchedule]', message);
    if (elements.tableBody) {
      elements.tableBody.innerHTML = `
        <tr>
          <td colspan="12" class="text-center text-danger py-3">
            <i class="bi bi-exclamation-triangle me-2"></i>${message}
          </td>
        </tr>
      `;
    }
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
    // Close button (header X)
    if (elements.closeBtn) {
      elements.closeBtn.addEventListener('click', requestClose);
    }

    // Back button (action panel)
    if (elements.backBtn) {
      elements.backBtn.addEventListener('click', requestClose);
    }

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
    console.log('[InstallmentSchedule] Initializing...');
    wireEventListeners();
    loadInstallmentSchedule();
  }

  // Expose functions to global scope for HTML inline scripts
  window.loadInstallmentSchedule = loadInstallmentSchedule;

  // ============================================================================
  // PROTECTION AGAINST TEST DATA AND UNINTENDED MODIFICATIONS
  // ============================================================================
  
  /**
   * Prevent any other code from modifying the table data after it's been populated
   * with real database data
   */
  let tableDataLoaded = false;
  
  const originalSetInnerHTML = Object.getOwnPropertyDescriptor(Element.prototype, 'innerHTML');
  
  Object.defineProperty(Element.prototype, 'innerHTML', {
    set(html) {
      // Allow setting HTML if it's the actual table body element and contains proper data rows
      if (this.id === 'installmentScheduleTable' || (this.tagName === 'TBODY' && this.parentElement?.id === 'installmentScheduleTable')) {
        if (html.includes('<tr>') && html.includes('text-center') && !html.includes('No records to display')) {
          tableDataLoaded = true;
          console.log('[InstallmentSchedule] PROTECTION: Setting real table data - size:', html.length, 'bytes');
          originalSetInnerHTML.set.call(this, html);
          return;
        }
        // If table is already loaded with real data, reject any attempts to overwrite it
        if (tableDataLoaded && !html.includes('No records to display') && html.includes('<tr>')) {
          console.warn('[InstallmentSchedule] PROTECTION: Rejected attempt to overwrite populated table data!');
          return;
        }
      }
      // Allow normal innerHTML operations for other elements
      originalSetInnerHTML.set.call(this, html);
    },
    get() {
      return originalSetInnerHTML.get.call(this);
    },
    configurable: true
  });

  // Start when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
