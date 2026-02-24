/**
 * Loan Repayment Reversal Module
 * Modernized implementation aligned with legacy frmLoanRepayReversal.js
 * Features: View transactions, Reverse selected items, Grid selection, Validations
 */

(function (global) {
  if (global.__LoanRepaymentReversalLoaded) {
    console.warn("loan-repayment-reversal.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LoanRepaymentReversalLoaded = true;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ========================================
  // STATE MANAGEMENT
  // ========================================
  const state = {
    transactions: [],
    btsData: null,
    workingDate: null,
    branchStatus: '',
    branchStatusID: '',
    loanSeries: null,
    hasRecords: false,
    selectedRows: new Set(),
    parentData: null  // Data from parent screen
  };

  // ========================================
  // DOM ELEMENTS
  // ========================================
  const elements = {
    // Fields
    branchID: null,
    branchName: null,
    clientID: null,
    accountID: null,
    accountName: null,
    fromDate: null,
    toDate: null,
    currencyID: null,
    productID: null,
    systemDate: null,
    dayStatus: null,
    
    // Buttons
    btnView: null,
    btnReverse: null,
    btnCancel: null,
    btnBack: null,
    
    // Grid
    gridBody: null,
    selectAll: null,
    
    // Lookup buttons
    lookupBranch: null,
    lookupClient: null,
    lookupAccount: null
  };

  // ========================================
  // INITIALIZATION
  // ========================================
  function init() {
    console.log('[LoanRepaymentReversal] Initializing...');
    
    const shell = $("[data-lrr-shell]");
    if (!shell) {
      console.error('[LoanRepaymentReversal] Shell not found');
      return;
    }

    // Cache DOM elements
    cacheDomElements();
    
    // Initialize state from parent screen
    initializeFromSession();
    
    // Bind event listeners
    bindEvents();
    
    // Set initial UI state
    updateButtonStates();
    
    console.log('[LoanRepaymentReversal] Initialization complete');
  }

  function cacheDomElements() {
    elements.branchID = $('#BranchID');
    elements.branchName = $('#BranchName');
    elements.clientID = $('#ClientID');
    elements.clientName = $('#ClientName');
    elements.accountID = $('#AccountID');
    elements.accountName = $('#AccountName');
    elements.fromDate = $('#FromDate');
    elements.toDate = $('#ToDate');
    elements.currencyID = $('#CurrencyID');
    elements.productID = $('#ProductID');
    elements.systemDate = $('#SystemDate');
    elements.dayStatus = $('#DayStatus');
    
    elements.btnView = $("[data-action='view']");
    elements.btnReverse = $("[data-action='reverse']");
    elements.btnCancel = $("[data-action='cancel']");
    elements.btnBack = $("[data-action='back']");
    
    elements.gridBody = $("[data-lrr-rows]");
    elements.selectAll = $('#selectAll');
  }

  function initializeFromSession() {
    // Get data from parent screen (Loan Maintenance)
    state.parentData = getParentData();
    
    if (state.parentData) {
      // Populate readonly fields from parent
      if (elements.branchID) elements.branchID.value = state.parentData.OurBranchID || '';
      if (elements.branchName) elements.branchName.value = state.parentData.BranchName || '';
      if (elements.clientID) elements.clientID.value = state.parentData.ClientID || '';
      if (elements.clientName) elements.clientName.value = state.parentData.ClientName || '';
      if (elements.accountID) elements.accountID.value = state.parentData.AccountID || '';
      if (elements.accountName) elements.accountName.value = state.parentData.AccountName || '';
      
      // Store loan series from parent
      state.loanSeries = state.parentData.LoanSeries || 1;
      
      console.log('[LoanRepaymentReversal] Parent data loaded:', state.parentData);
    } else {
      console.warn('[LoanRepaymentReversal] No parent data available');
    }
    
    // Get session data for system date and day status
    if (typeof AuthService !== 'undefined' && AuthService.getSession) {
      const session = AuthService.getSession();
      
      // Set system date
      if (elements.systemDate) {
        const today = new Date();
        elements.systemDate.value = formatDate(today);
      }
      
      // Set day status (default to Open)
      if (elements.dayStatus) {
        elements.dayStatus.value = 'Open';
      }
      
      state.workingDate = new Date();
      state.branchStatus = 'Open';
      state.branchStatusID = 'O';
    }
  }

  /**
   * Get data from parent screen (Loan Maintenance)
   */
  function getParentData() {
    try {
      if (!isEmbedded()) {
        console.warn('[LoanRepaymentReversal] Not embedded, using fallback data');
        return null;
      }

      const parentDoc = global.parent.document;
      const branchID = parentDoc.getElementById('BranchID')?.value || '';
      const branchName = parentDoc.getElementById('BranchName')?.value || '';
      const clientID = parentDoc.getElementById('ClientID')?.value || '';
      const clientName = parentDoc.getElementById('ClientName')?.value || '';
      const accountID = parentDoc.getElementById('AccountID')?.value || '';
      const accountName = parentDoc.getElementById('AccountName')?.value || '';
      const loanSeries = parentDoc.getElementById('LoanSeries')?.value || '1';

      console.log('[LoanRepaymentReversal] Parent data:', { branchID, clientID, accountID, loanSeries });

      return {
        OurBranchID: branchID,
        BranchName: branchName,
        ClientID: clientID,
        ClientName: clientName,
        AccountID: accountID,
        AccountName: accountName,
        LoanSeries: loanSeries
      };
    } catch (error) {
      console.error('[LoanRepaymentReversal] Error getting parent data:', error);
      return null;
    }
  }

  /**
   * Check if running in an iframe
   */
  function isEmbedded() {
    try {
      return global.self !== global.top;
    } catch {
      return true;
    }
  }

  function bindEvents() {
    // Button events
    if (elements.btnView) {
      elements.btnView.addEventListener('click', onViewClick);
    }
    if (elements.btnReverse) {
      elements.btnReverse.addEventListener('click', onReverseClick);
    }
    if (elements.btnCancel) {
      elements.btnCancel.addEventListener('click', onCancelClick);
    }
    if (elements.btnBack) {
      elements.btnBack.addEventListener('click', onBackClick);
    }
    
    // Select all checkbox
    if (elements.selectAll) {
      elements.selectAll.addEventListener('change', onSelectAllChange);
    }
  }

  // ========================================
  // BUTTON HANDLERS
  // ========================================
  async function onViewClick() {
    console.log('[LoanRepaymentReversal] View button clicked');
    
    // Validate inputs
    if (!validateInputs()) {
      return;
    }
    
    // Disable view button during load
    setButtonState(elements.btnView, false);
    showMessage('Loading data...', 'info');
    
    try {
      const params = {
        OurBranchID: elements.branchID.value,
        AccountID: elements.accountID.value,
        FromDate: elements.fromDate.value,
        ToDate: elements.toDate.value,
        OperatorID: getOperatorId()
      };
      
      const response = await global.LoanRepaymentReversalService.getRepaymentReversalDetails(params);
      
      if (response && response.success) {
        if (!response.transactions || response.transactions.length === 0) {
          showMessage('No transactions found for the selected criteria.', 'warning');
          setButtonState(elements.btnView, true);
          updateButtonStates();
          return;
        }
        
        // Store data in state
        state.transactions = response.transactions;
        state.btsData = response.btsData;
        state.hasRecords = true;
        state.selectedRows.clear();
        
        // Bind data to UI
        bindTransactionsToGrid(response.transactions);
        bindBehindTheSceneData(response.btsData);
        
        // Update UI state
        updateButtonStates();
        disableFields();
        
        showMessage('Data loaded successfully.', 'success');
        
        // Check branch status
        if (state.branchStatusID === 'C' || state.branchStatus === 'Closed') {
          showMessage('Branch is closed. Reversal is not allowed.', 'error');
          setButtonState(elements.btnReverse, false);
        }
      } else {
        showMessage(response?.message || 'Failed to load data.', 'error');
        setButtonState(elements.btnView, true);
      }
    } catch (error) {
      console.error('[LoanRepaymentReversal] Error in View:', error);
      showMessage('An error occurred while loading data.', 'error');
      setButtonState(elements.btnView, true);
    }
  }

  async function onReverseClick() {
    console.log('[LoanRepaymentReversal] Reverse button clicked');
    
    // Get selected transactions
    const selectedTransactions = getSelectedTransactions();
    
    if (selectedTransactions.length === 0) {
      showMessage('Please select at least one transaction to reverse.', 'warning');
      return;
    }
    
    // Confirm reversal
    const confirmed = await showConfirmDialog(
      'Reverse Transactions',
      `Are you sure you want to reverse ${selectedTransactions.length} transaction(s)?`
    );
    
    if (!confirmed) {
      return;
    }
    
    // Disable button during processing
    setButtonState(elements.btnReverse, false);
    showMessage('Reversing transactions...', 'info');
    
    try {
      const params = {
        OurBranchID: elements.branchID.value,
        LoanAccountID: elements.accountID.value,
        LoanSeries: state.loanSeries || 1,
        CreatedBy: getOperatorId(),
        selectedTransactions: selectedTransactions
      };
      
      const response = await global.LoanRepaymentReversalService.reverseRepaymentTransactions(params);
      
      if (response && response.success) {
        showMessage('Transactions reversed successfully.', 'success');
        
        // Clear form and reset
        clearAll();
        
        // Re-enable fields
        enableFields();
        updateButtonStates();
        
        if (elements.accountID) {
          elements.accountID.focus();
        }
      } else {
        showMessage(response?.message || 'Failed to reverse transactions.', 'error');
        setButtonState(elements.btnReverse, true);
      }
    } catch (error) {
      console.error('[LoanRepaymentReversal] Error in Reverse:', error);
      showMessage('An error occurred while reversing transactions.', 'error');
      setButtonState(elements.btnReverse, true);
    }
  }

  function onCancelClick() {
    console.log('[LoanRepaymentReversal] Cancel button clicked');
    clearAll();
    enableFields();
    updateButtonStates();
    showMessage('');
    
    if (elements.accountID) {
      elements.accountID.focus();
    }
  }

  function onBackClick() {
    console.log('[LoanRepaymentReversal] Back button clicked');
    requestClose();
  }

  function onSelectAllChange(e) {
    const isChecked = e.target.checked;
    const checkboxes = $$('input[data-row-checkbox]');
    
    checkboxes.forEach(cb => {
      cb.checked = isChecked;
      const rowIndex = parseInt(cb.dataset.rowIndex);
      
      if (isChecked) {
        state.selectedRows.add(rowIndex);
      } else {
        state.selectedRows.delete(rowIndex);
      }
    });
    
    console.log('[LoanRepaymentReversal] Select all:', isChecked, 'Selected rows:', state.selectedRows.size);
  }

  // ========================================
  // VALIDATION
  // ========================================
  function validateInputs() {
    // Clear previous messages
    showMessage('');
    
    // Validate Account ID (from parent)
    if (!elements.accountID || !elements.accountID.value.trim()) {
      showMessage('Account ID is required. Please select an account from the parent screen.', 'error');
      return false;
    }
    
    // Validate From Date
    if (!elements.fromDate || !elements.fromDate.value) {
      showMessage('From Date is required.', 'error');
      if (elements.fromDate) elements.fromDate.focus();
      return false;
    }
    
    // Validate To Date
    if (!elements.toDate || !elements.toDate.value) {
      showMessage('To Date is required.', 'error');
      if (elements.toDate) elements.toDate.focus();
      return false;
    }
    
    // Validate date range
    const fromDate = new Date(elements.fromDate.value);
    const toDate = new Date(elements.toDate.value);
    
    if (fromDate > toDate) {
      showMessage('From Date cannot be after To Date.', 'error');
      if (elements.fromDate) elements.fromDate.focus();
      return false;
    }
    
    return true;
  }

  // ========================================
  // DATA BINDING
  // ========================================
  function bindTransactionsToGrid(transactions) {
    if (!elements.gridBody) return;
    
    if (!transactions || transactions.length === 0) {
      elements.gridBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-3 px-2 text-muted text-center">No records to display.</td>
        </tr>
      `;
      return;
    }
    
    const rows = transactions.map((trx, index) => {
      const amount = parseFloat(trx.TransactionAmount || 0).toFixed(2);
      const valueDate = formatDate(trx.ValueDate);
      const trxDate = formatDate(trx.TrxDate);
      const description = escapeHtml(trx.Description || '');
      const batchID = escapeHtml(trx.TrxBatchID || '');
      
      return `
        <tr data-row-index="${index}">
          <td class="text-center">
            <input type="checkbox" data-row-checkbox data-row-index="${index}" />
          </td>
          <td class="text-end">${amount}</td>
          <td>${valueDate}</td>
          <td>${trxDate}</td>
          <td>${description}</td>
          <td>${batchID}</td>
        </tr>
      `;
    }).join('');
    
    elements.gridBody.innerHTML = rows;
    
    // Bind checkbox change events
    const checkboxes = $$('input[data-row-checkbox]');
    checkboxes.forEach(cb => {
      cb.addEventListener('change', onRowCheckboxChange);
    });
    
    console.log(`[LoanRepaymentReversal] Bound ${transactions.length} transactions to grid`);
  }

  function bindBehindTheSceneData(btsData) {
    if (!btsData) return;
    
    if (elements.currencyID) {
      elements.currencyID.value = btsData.CurrencyID || '';
    }
    if (elements.productID) {
      elements.productID.value = btsData.ProductID || '';
    }
    
    // Store loan series for reversal
    if (btsData.LoanSeries) {
      state.loanSeries = btsData.LoanSeries;
    }
    
    // Update branch status if available
    if (btsData.BranchStatus) {
      state.branchStatus = btsData.BranchStatus;
      if (elements.dayStatus) {
        elements.dayStatus.value = btsData.BranchStatus;
      }
    }
    
    if (btsData.BranchStatusID) {
      state.branchStatusID = btsData.BranchStatusID;
    }
    
    console.log('[LoanRepaymentReversal] Behind The Scene data bound');
  }

  function onRowCheckboxChange(e) {
    const checkbox = e.target;
    const rowIndex = parseInt(checkbox.dataset.rowIndex);
    
    if (checkbox.checked) {
      state.selectedRows.add(rowIndex);
    } else {
      state.selectedRows.delete(rowIndex);
    }
    
    // Update select all checkbox state
    const allCheckboxes = $$('input[data-row-checkbox]');
    const allChecked = allCheckboxes.every(cb => cb.checked);
    
    if (elements.selectAll) {
      elements.selectAll.checked = allChecked;
    }
    
    console.log('[LoanRepaymentReversal] Row checkbox changed. Selected:', state.selectedRows.size);
  }

  // ========================================
  // UI STATE MANAGEMENT
  // ========================================
  function updateButtonStates() {
    if (!state.hasRecords) {
      // Initial state: only View enabled
      setButtonState(elements.btnView, true);
      setButtonState(elements.btnReverse, false);
      setButtonState(elements.btnCancel, false);
      setButtonState(elements.btnBack, true);
    } else {
      // Data loaded: View disabled, Reverse and Cancel enabled
      setButtonState(elements.btnView, false);
      setButtonState(elements.btnReverse, true);
      setButtonState(elements.btnCancel, true);
      setButtonState(elements.btnBack, true);
    }
  }

  function setButtonState(button, enabled) {
    if (button) {
      button.disabled = !enabled;
    }
  }

  function disableFields() {
    // Only disable date fields (top section fields are always readonly from parent)
    const fieldsToDisable = [
      elements.fromDate,
      elements.toDate
    ];
    
    fieldsToDisable.forEach(field => {
      if (field) {
        field.disabled = true;
      }
    });
  }

  function enableFields() {
    // Only enable date fields (top section fields are always readonly from parent)
    const fieldsToEnable = [
      elements.fromDate,
      elements.toDate
    ];
    
    fieldsToEnable.forEach(field => {
      if (field) {
        field.disabled = false;
      }
    });
  }

  function clearAll() {
    // Clear grid
    if (elements.gridBody) {
      elements.gridBody.innerHTML = `
        <tr>
          <td colspan="6" class="py-3 px-2 text-muted text-center">No records to display.</td>
        </tr>
      `;
    }
    
    // Clear BTS fields
    if (elements.currencyID) elements.currencyID.value = '';
    if (elements.productID) elements.productID.value = '';
    
    // Clear date fields
    if (elements.fromDate) elements.fromDate.value = '';
    if (elements.toDate) elements.toDate.value = '';
    
    // Clear select all
    if (elements.selectAll) elements.selectAll.checked = false;
    
    // Reset state (keep parent data and loan series)
    state.transactions = [];
    state.btsData = null;
    state.hasRecords = false;
    state.selectedRows.clear();
    
    console.log('[LoanRepaymentReversal] All data cleared');
  }

  // ========================================
  // LOOKUP INTEGRATION
  // ========================================
  function initializeLookups() {
    if (!global.SearchService) {
      console.warn('[LoanRepaymentReversal] SearchService not available');
      return;
    }
    
    // Branch lookup
    if (elements.lookupBranch) {
      elements.lookupBranch.addEventListener('click', async () => {
        const result = await global.SearchService.openSearch({
          tableID: 'DIM_BRANCH',
          whereStmt: 'IsActive=1',
          moduleID: '3117'
        });
        
        if (result) {
          elements.branchID.value = result.BranchID || '';
          elements.branchName.value = result.BranchName || '';
        }
      });
    }
    
    // Client lookup
    if (elements.lookupClient) {
      elements.lookupClient.addEventListener('click', async () => {
        const branchID = elements.branchID?.value || '';
        const whereStmt = branchID 
          ? `IsActive=1 AND OurBranchID='${branchID}'`
          : 'IsActive=1';
        
        const result = await global.SearchService.openSearch({
          tableID: 'ClientActiveID',
          whereStmt: whereStmt,
          moduleID: '3117'
        });
        
        if (result) {
          elements.clientID.value = result.ClientID || '';
        }
      });
    }
    
    // Account lookup
    if (elements.lookupAccount) {
      elements.lookupAccount.addEventListener('click', async () => {
        const branchID = elements.branchID?.value || '';
        const clientID = elements.clientID?.value || '';
        
        let whereStmt = "ProductTypeID='LN' AND LoanStatusID IN ('A','N')";
        if (branchID) whereStmt += ` AND OurBranchID='${branchID}'`;
        if (clientID) whereStmt += ` AND ClientID='${clientID}'`;
        
        const result = await global.SearchService.openSearch({
          tableID: 'LoanID',
          whereStmt: whereStmt,
          moduleID: '3117'
        });
        
        if (result) {
          elements.accountID.value = result.AccountID || '';
          elements.accountName.value = result.AccountName || result.ClientName || '';
        }
      });
    }
    
    console.log('[LoanRepaymentReversal] Lookups initialized');
  }

  // ========================================
  // UTILITIES
  // ========================================
  function getSelectedTransactions() {
    const selected = [];
    
    state.selectedRows.forEach(index => {
      if (state.transactions[index]) {
        selected.push(state.transactions[index]);
      }
    });
    
    return selected;
  }

  function getOperatorId() {
    if (typeof AuthService !== 'undefined' && AuthService.getSession) {
      const session = AuthService.getSession();
      return session?.OperatorID || session?.operatorID || 'web_portal';
    }
    return 'web_portal';
  }

  function formatDate(dateValue) {
    if (!dateValue) return '';
    
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return dateValue;
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    
    return `${day}/${month}/${year}`;
  }

  function escapeHtml(str) {
    if (!str) return '';
    
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showMessage(message, type = 'info') {
    // For now, use console logging. Can be enhanced with a proper message display area
    if (message) {
      console.log(`[LoanRepaymentReversal] ${type.toUpperCase()}: ${message}`);
      
      // If there's a message area in the UI, update it
      const messageArea = $('.lrr-message');
      if (messageArea) {
        messageArea.textContent = message;
        messageArea.className = `lrr-message lrr-message--${type}`;
      }
    }
  }

  function showConfirmDialog(title, message) {
    // Use native confirm for now - can be enhanced with Bootstrap modal
    return Promise.resolve(confirm(message));
  }

  function requestClose() {
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ action: 'close-child-form' }, '*');
    }
  }

  // ========================================
  // BOOTSTRAP
  // ========================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
