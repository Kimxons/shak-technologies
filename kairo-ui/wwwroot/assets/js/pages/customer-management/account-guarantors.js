/**
 * Account Guarantors Module
 * Displays guarantor information for customer query accounts with loan data
 * Uses GuarantorService to fetch from p_GuarantorView API endpoint
 */

// ==================== DATA LOADING & RENDERING ====================
(function () {
  'use strict';

  const LOG_PREFIX = '[Account Guarantors]';

  /**
   * Retrieves customer query context from multiple sources with fallbacks
   * Priority: CustomerQueryState → selectedAccount → direct field access
   */
  function getCustomerQueryContext() {
    console.log(LOG_PREFIX, '=== Retrieving Customer Query context ===');

    // Method 1: CustomerQueryState from parent window
    try {
      console.log(LOG_PREFIX, 'Method 1: Checking window.parent.CustomerQueryState');
      console.log(LOG_PREFIX, '  window.parent available:', !!window.parent);
      console.log(LOG_PREFIX, '  window.parent.CustomerQueryState:', window.parent.CustomerQueryState);
      
      if (window.parent.CustomerQueryState) {
        console.log(LOG_PREFIX, '✓ Retrieved context from CustomerQueryState:', JSON.stringify(window.parent.CustomerQueryState, null, 2));
        return window.parent.CustomerQueryState;
      }
    } catch (e) {
      console.log(LOG_PREFIX, '✗ CustomerQueryState not accessible:', e.message);
    }

    // Method 2: selectedAccount from parent window
    try {
      console.log(LOG_PREFIX, 'Method 2: Checking window.parent.selectedAccount');
      console.log(LOG_PREFIX, '  window.parent.selectedAccount:', window.parent.selectedAccount);
      
      if (window.parent.selectedAccount) {
        console.log(LOG_PREFIX, '✓ Retrieved context from selectedAccount:', JSON.stringify(window.parent.selectedAccount, null, 2));
        return window.parent.selectedAccount;
      }
    } catch (e) {
      console.log(LOG_PREFIX, '✗ selectedAccount not accessible:', e.message);
    }

    // Method 3: Direct field access from parent document
    try {
      console.log(LOG_PREFIX, 'Method 3: Checking parent document fields');
      const doc = window.parent.document;
      
      const branchId = doc.getElementById('OurBranchID')?.value || doc.getElementById('BranchID')?.value;
      const accountId = doc.getElementById('AccountID')?.value;
      const loanSeries = doc.getElementById('LoanSeries')?.value;
      const operatorId = doc.getElementById('OperatorID')?.value;

      console.log(LOG_PREFIX, '  OurBranchID field value:', branchId);
      console.log(LOG_PREFIX, '  AccountID field value:', accountId);
      console.log(LOG_PREFIX, '  LoanSeries field value:', loanSeries);
      console.log(LOG_PREFIX, '  OperatorID field value:', operatorId);

      if (branchId && accountId) {
        console.log(LOG_PREFIX, '✓ Retrieved context from parent document fields');
        return {
          OurBranchID: branchId,
          AccountID: accountId,
          LoanSeries: loanSeries || ''
        };
      } else {
        console.log(LOG_PREFIX, '✗ Missing required fields (BranchID or AccountID)');
      }
    } catch (e) {
      console.log(LOG_PREFIX, '✗ Direct field access failed:', e.message);
    }

    console.warn(LOG_PREFIX, '✗ Unable to retrieve context from ANY source!');
    return null;
  }

  /**
   * Retrieves operator ID from parent form or returns default
   */
  function getOperatorId() {
    try {
      if (typeof window.parent.getOperatorId === 'function') {
        const id = window.parent.getOperatorId();
        console.log(LOG_PREFIX, 'OperatorID from parent function:', id);
        return id;
      }
    } catch (e) {
      console.log(LOG_PREFIX, 'Could not call parent getOperatorId function:', e.message);
    }

    try {
      const operatorId = window.parent.document.getElementById('OperatorID')?.value;
      console.log(LOG_PREFIX, 'OperatorID from field:', operatorId);
      return operatorId || '0';
    } catch (e) {
      console.log(LOG_PREFIX, 'Could not get OperatorID from field:', e.message);
      return '0';
    }
  }

  /**
   * Formats a number with thousand separators and 2 decimal places
   */
  function formatNumber(value) {
    if (!value || isNaN(value)) return '-';
    return parseFloat(value).toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  }

  /**
   * Renders guarantor data to the table
   */
  function renderGuarantors(rows) {
    console.log(LOG_PREFIX, 'Rendering guarantors:', rows);

    const table = document.getElementById('guarantorsTable');
    if (!table) {
      console.error(LOG_PREFIX, 'Table element not found');
      return;
    }

    const tbody = table.querySelector('tbody');
    if (!tbody) {
      console.error(LOG_PREFIX, 'Table tbody not found');
      return;
    }

    // Handle empty data
    if (!rows || rows.length === 0) {
      tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-4">No records to display.</td></tr>';
      updateRecordCount(0);
      return;
    }

    // Build table rows
    const html = rows.map(row => `
      <tr>
        <td>${row.GuarantorID || '-'}</td>
        <td>${row.GuarantorName || '-'}</td>
        <td class="text-end">${formatNumber(row.GuaranteeAmount)}</td>
        <td>${row.GuarantorType || '-'}</td>
        <td>${row.GuaranteeSignedBy || '-'}</td>
        <td class="text-end">${formatNumber(row.Networth)}</td>
        <td class="text-end">${formatNumber(row.Liability)}</td>
      </tr>
    `).join('');

    tbody.innerHTML = html;
    updateRecordCount(rows.length);
    console.log(LOG_PREFIX, `Rendered ${rows.length} records`);
  }

  /**
   * Updates the record count display
   */
  function updateRecordCount(count) {
    const recordCount = document.getElementById('recordCount');
    if (recordCount) {
      recordCount.textContent = `(${count} record${count !== 1 ? 's' : ''})`;
    }
  }

  /**
   * Loads guarantor data from the API
   */
  async function loadGuarantors() {
    console.log(LOG_PREFIX, '=== Starting loadGuarantors ===');

    try {
      const context = getCustomerQueryContext();
      if (!context) {
        console.error(LOG_PREFIX, 'No context available for guarantor query');
        renderGuarantors([]);
        return;
      }

      console.log(LOG_PREFIX, 'Full Context Object:', JSON.stringify(context, null, 2));

      // Verify CoreApi is available
      if (!window.CoreApi) {
        console.error(LOG_PREFIX, 'CoreApi not loaded');
        renderGuarantors([]);
        return;
      }

      console.log(LOG_PREFIX, 'CoreApi is available');

      const operatorId = getOperatorId();
      console.log(LOG_PREFIX, 'OperatorID:', operatorId);

      // Allow LoanSeries to be any value (0, 1, empty) - let API handle validation
      const loanSeries = parseInt(context.LoanSeries) || '1';
      console.log(LOG_PREFIX, 'Parsed LoanSeries:', loanSeries, 'from original:', context.LoanSeries);

      const requestParams = {
        OurBranchID: context.OurBranchID,
        AccountID: context.AccountID,
        LoanSeries: loanSeries,
        OperatorID: operatorId
      };

      console.log(LOG_PREFIX, 'Request Parameters:', JSON.stringify(requestParams, null, 2));

      const formId = 'p_GuarantorView';
      console.log(LOG_PREFIX, 'Creating envelope for:', formId);

      const envelope = window.CoreApi.makeRequestEnvelope(formId, requestParams);
      
      if (!envelope) {
        console.error(LOG_PREFIX, 'Failed to create request envelope');
        renderGuarantors([]);
        return;
      }

      console.log(LOG_PREFIX, 'Envelope created successfully');

      // Determine API endpoint from environment
      const apiEndpoint = (window.Environment?.baseUrlLoans || window.Environment?.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "") + "/api/OldAPI";
      console.log(LOG_PREFIX, 'API Endpoint:', apiEndpoint);
      console.log(LOG_PREFIX, 'Envelope to send:', JSON.stringify(envelope, null, 2));

      const resp = await window.CoreApi.post(apiEndpoint, envelope);

      console.log(LOG_PREFIX, '=== API Response Received ===');
      console.log(LOG_PREFIX, 'Response Type:', typeof resp);
      console.log(LOG_PREFIX, 'Is Array:', Array.isArray(resp));
      console.log(LOG_PREFIX, 'Full Response:', JSON.stringify(resp, null, 2));

      // Handle multiple response formats (same as Loan Maintenance guarantors.js)
      let rows = [];
      if (Array.isArray(resp)) {
        console.log(LOG_PREFIX, 'Response is direct array with', resp.length, 'items');
        rows = resp;
      } else if (resp && resp.success) {
        console.log(LOG_PREFIX, 'Response has success=true');
        if (Array.isArray(resp.data)) {
          console.log(LOG_PREFIX, 'Found data array with', resp.data.length, 'items');
          rows = resp.data;
        } else if (Array.isArray(resp.Details)) {
          console.log(LOG_PREFIX, 'Found Details array with', resp.Details.length, 'items');
          rows = resp.Details;
        } else if (Array.isArray(resp.Details02)) {
          console.log(LOG_PREFIX, 'Found Details02 array with', resp.Details02.length, 'items');
          rows = resp.Details02;
        } else {
          console.warn(LOG_PREFIX, 'Response.success=true but no data array found. Response keys:', Object.keys(resp));
        }
      } else {
        console.warn(LOG_PREFIX, 'Response does not match expected formats');
        if (resp) console.warn(LOG_PREFIX, 'Response.success:', resp.success);
      }

      console.log(LOG_PREFIX, 'Final rows to render:', rows.length, 'records');
      if (rows.length > 0) {
        console.log(LOG_PREFIX, 'First row sample:', JSON.stringify(rows[0], null, 2));
      }

      renderGuarantors(rows);
    } catch (error) {
      console.error(LOG_PREFIX, 'Error loading guarantors:', error);
      console.error(LOG_PREFIX, 'Error stack:', error.stack);
      renderGuarantors([]);
    }
  }

  /**
   * Initialize guarantor view on DOM ready
   */
  document.addEventListener('DOMContentLoaded', function () {
    console.log(LOG_PREFIX, 'DOM Content Loaded - Initializing');
    loadGuarantors();
  });

})();

// ==================== BUTTON HANDLERS & UI CONTROLS ====================
(function () {
  'use strict';

  const LOG_PREFIX = '[Account Guarantors UI]';

  document.addEventListener('DOMContentLoaded', function () {
    // Header action buttons
    const refreshBtn = document.querySelector('[data-action="refresh"]');
    const maximizeBtn = document.querySelector('[data-action="maximize"]');
    const closeBtn = document.querySelector('[data-action="close"]');

    // Action panel buttons
    const actionPanelBtns = {
      view: document.querySelector('[data-action="view"]'),
      print: document.querySelector('[data-action="print"]'),
      refresh: document.querySelector('[data-action="refresh"]'),
      close: document.querySelector('[data-action="close"]')
    };

    // Refresh button handler
    if (refreshBtn) {
      refreshBtn.addEventListener('click', () => {
        console.log(LOG_PREFIX, 'Refresh clicked');
        location.reload();
      });
    }

    // Maximize button handler
    if (maximizeBtn) {
      maximizeBtn.addEventListener('click', () => {
        const windowEl = document.querySelector('.window');
        if (windowEl) {
          windowEl.classList.toggle('maximized');
          console.log(LOG_PREFIX, 'Maximize clicked');
          window.parent.postMessage({
            action: 'toggleSidebarForMaximize',
            isMaximized: windowEl.classList.contains('maximized')
          }, '*');
        }
      });
    }

    // Close button handler
    if (closeBtn) {
      closeBtn.addEventListener('click', () => {
        console.log(LOG_PREFIX, 'Close clicked');
        window.parent.postMessage('close-account-guarantors', '*');
      });
    }

    // Action panel buttons
    if (actionPanelBtns.print) {
      actionPanelBtns.print.addEventListener('click', () => {
        console.log(LOG_PREFIX, 'Print clicked - feature not yet implemented');
      });
    }

    if (actionPanelBtns.view) {
      actionPanelBtns.view.addEventListener('click', () => {
        console.log(LOG_PREFIX, 'View clicked - feature not yet implemented');
      });
    }

    // Section toggle functionality
    const sectionToggles = document.querySelectorAll('[data-section-toggle]');
    sectionToggles.forEach(toggle => {
      toggle.addEventListener('click', function () {
        const section = this.closest('[data-section]');
        if (section) {
          const content = section.querySelector('[data-section-content]');
          const btn = this.querySelector('.section-toggle-btn');

          if (content) {
            const isHidden = content.style.display === 'none';
            content.style.display = isHidden ? 'block' : 'none';
            if (btn) {
              btn.innerHTML = isHidden
                ? '<i class="bi bi-chevron-up"></i>'
                : '<i class="bi bi-chevron-down"></i>';
            }
            console.log(LOG_PREFIX, `Section toggled: ${isHidden ? 'shown' : 'hidden'}`);
          }
        }
      });
    });

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        console.log(LOG_PREFIX, 'Escape key pressed - closing window');
        window.parent.postMessage('close-account-guarantors', '*');
      }
    });

    console.log(LOG_PREFIX, 'UI controls initialized');
  });

})();
