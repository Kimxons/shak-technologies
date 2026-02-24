/**
 * Loan Waiver Module
 * Handles loan waiver component editing and transaction generation
 * Implements Loan Maintenance style search and auto-population
 */

(function (global) {
  'use strict';

  // Prevent duplicate initialization
  if (global.__LoanWaiverLoaded) {
    console.warn('[LoanWaiver] Module already loaded; skipping duplicate execution.');
    return;
  }
  global.__LoanWaiverLoaded = true;

  // Services
  const LoanWaiverService = global.LoanWaiverService;
  const SearchService = global.SearchService;
  const AuthService = global.AuthService;

  // State management
  const state = {
    mode: 'view', // 'view', 'add'
    isLoaded: false,
    header: null,
    components: [],
    transactions: [],
    isSupervised: false
  };

  // DOM Elements
  let elements = {};

  /**
   * Format money values
   */
  function formatMoney(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Parse money string to number
   */
  function parseMoney(value) {
    if (!value) return 0;
    const cleaned = String(value).replace(/[^0-9.-]/g, '');
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Get or set value from/to input element
   */
  function getValue(fieldId) {
    const el = document.getElementById(fieldId);
    return el ? el.value.trim() : '';
  }

  function setInputValue(fieldId, value) {
    const el = document.getElementById(fieldId);
    if (el) el.value = value || '';
  }

  /**
   * Show message to user
   */
  function showMessage(message, type = 'info') {
    if (type === 'error') {
      console.error('[LoanWaiver]', message);
      alert(message);
    } else if (type === 'success') {
      console.log('[LoanWaiver]', message);
      alert(message);
    } else {
      console.log('[LoanWaiver]', message);
    }
  }

  /**
   * Get session data
   */
  function getSession() {
    if (AuthService && AuthService.getSession) {
      return AuthService.getSession();
    }
    return { BranchID: '0101', BranchName: 'Head Office', OperatorID: 'web_portal' };
  }

  function getOperatorId() {
    const session = getSession();
    return session.OperatorID || 'web_portal';
  }

  /**
   * Initialize DOM elements
   */
  function initElements() {
    elements = {
      // Account Info
      branchId: document.getElementById('BranchID'),
      branchName: document.getElementById('BranchName'),
      clientId: document.getElementById('ClientID'),
      clientName: document.getElementById('ClientName'),
      accountId: document.getElementById('AccountID'),
      accountName: document.getElementById('AccountName'),
      loanSeries: document.getElementById('LoanSeries'),

      // Component grid
      componentRows: document.querySelector('[data-component-rows]'),
      componentEmpty: document.querySelector('[data-component-empty]'),

      // Transaction grid
      trxRows: document.querySelector('[data-trx-rows]'),
      trxEmpty: document.querySelector('[data-trx-empty]'),

      // Remarks
      remarks: document.getElementById('Remarks'),

      // Behind The Scene
      btsLoanAmount: document.getElementById('BTSLoanAmount'),
      btsLoanBalance: document.getElementById('BTSLoanBalance'),
      btsProductId: document.getElementById('BTSProductID'),
      btsCurrencyId: document.getElementById('BTSCurrencyID'),
      btsMaturityDate: document.getElementById('BTSMaturityDate'),
      btsArrearDays: document.getElementById('BTSArrearDays'),
      btsRiskClassification: document.getElementById('BTSRiskClassification'),

      // Buttons
      btnView: document.querySelector('[data-action="view"]'),
      btnAdd: document.querySelector('[data-action="add"]'),
      btnGenerate: document.querySelector('[data-action="generate"]'),
      btnSave: document.querySelector('[data-action="save"]'),
      btnCancel: document.querySelector('[data-action="cancel"]'),

      // Lookup buttons
      branchLookup: document.querySelector('[aria-label="Lookup branch"]'),
      clientLookup: document.querySelector('[aria-label="Search client"]'),
      accountLookup: document.querySelector('[aria-label="Search account"]'),
      loanSeriesLookup: document.querySelector('[aria-label="Search loan series"]')
    };
  }

  /**
   * Set form mode
   */
  function setFormMode(mode) {
    state.mode = mode;

    const isViewMode = mode === 'view';
    const isAddMode = mode === 'add';

    // Account ID lookup
    if (elements.accountId) elements.accountId.disabled = !isViewMode;
    if (elements.accountLookup) elements.accountLookup.disabled = !isViewMode;

    // Remarks
    if (elements.remarks) elements.remarks.disabled = isViewMode;

    // Buttons based on mode
    if (isViewMode) {
      // View mode: only View and Cancel enabled
      if (elements.btnView) elements.btnView.disabled = false;
      if (elements.btnAdd) elements.btnAdd.disabled = !state.isLoaded; // Enable Add after successful View
      if (elements.btnGenerate) elements.btnGenerate.disabled = true;
      if (elements.btnSave) elements.btnSave.disabled = true;
      if (elements.btnCancel) elements.btnCancel.disabled = false;
    } else if (isAddMode) {
      // Add mode: Generate, Save, Cancel enabled
      if (elements.btnView) elements.btnView.disabled = true;
      if (elements.btnAdd) elements.btnAdd.disabled = true;
      if (elements.btnGenerate) elements.btnGenerate.disabled = false;
      if (elements.btnSave) elements.btnSave.disabled = true; // Enable after Generate
      if (elements.btnCancel) elements.btnCancel.disabled = false;
    }

    console.log('[LoanWaiver] Mode set to:', mode);
  }

  /**
   * Clear all fields
   */
  function clearFields() {
    // Clear account info (except branch)
    setInputValue('ClientID', '');
    setInputValue('ClientName', '');
    setInputValue('AccountID', '');
    setInputValue('AccountName', '');
    setInputValue('LoanSeries', '');
    setInputValue('Remarks', '');

    // Clear BTS fields
    setInputValue('BTSLoanAmount', '');
    setInputValue('BTSLoanBalance', '');
    setInputValue('BTSProductID', '');
    setInputValue('BTSCurrencyID', '');
    setInputValue('BTSMaturityDate', '');
    setInputValue('BTSArrearDays', '');
    setInputValue('BTSRiskClassification', '');

    // Clear state
    state.isLoaded = false;
    state.header = null;
    state.components = [];
    state.transactions = [];

    renderComponents();
    renderTransactions();
  }

  /**
   * Load account details (View)
   */
  async function handleView() {
    const branchId = getValue('BranchID');
    const accountId = getValue('AccountID');

    if (!accountId) {
      showMessage('Please provide an Account ID', 'error');
      elements.accountId?.focus();
      return;
    }

    // Disable View button during loading
    if (elements.btnView) elements.btnView.disabled = true;

    try {
      console.log('[LoanWaiver] Loading account details...');
      const result = await LoanWaiverService.getLoanWaiverDetails(branchId, accountId);

      if (!result.success) {
        showMessage(result.error || 'Failed to load account details', 'error');
        if (elements.btnView) elements.btnView.disabled = false;
        return;
      }

      // Store data
      state.header = result.data.header || {};
      state.components = (result.data.components || []).map(comp => ({
        ...comp,
        WaiverAmount: comp.WaiverAmount || 0,
        SettlementAmount: comp.SettlementAmount || comp.ActualAmount || 0
      }));
      state.isLoaded = true;

      // Populate fields
      populateAccountInfo();
      populateBTSFields();
      renderComponents();
      renderTransactions();

      // Stay in view mode - user must click Add to enable editing
      setFormMode('view');
      showMessage('Account details loaded successfully. Click Add to enable editing.', 'info');
    } catch (error) {
      console.error('[LoanWaiver] Error in handleView:', error);
      showMessage('An error occurred while loading account details', 'error');
      if (elements.btnView) elements.btnView.disabled = false;
    }
  }

  /**
   * Populate account information
   */
  function populateAccountInfo() {
    if (!state.header) return;

    setInputValue('ClientID', state.header.ClientID || '');
    setInputValue('ClientName', state.header.ClientName || '');
    setInputValue('AccountName', state.header.AccountName || '');
    setInputValue('LoanSeries', state.header.LoanSeries || '');
  }

  /**
   * Populate Behind The Scene fields
   */
  function populateBTSFields() {
    if (!state.header) return;

    setInputValue('BTSLoanAmount', formatMoney(state.header.LoanAmount));
    setInputValue('BTSLoanBalance', formatMoney(state.header.LoanBalance));
    setInputValue('BTSProductID', state.header.ProductID || '');
    setInputValue('BTSCurrencyID', state.header.CurrencyID || '');
    setInputValue('BTSMaturityDate', state.header.MaturityDate || '');
    setInputValue('BTSArrearDays', state.header.DaysArrears || '');
    setInputValue('BTSRiskClassification', state.header.RiskClassification || '');
  }

  /**
   * Render component rows (editable grid)
   */
  function renderComponents() {
    if (!elements.componentRows || !elements.componentEmpty) return;

    elements.componentRows.innerHTML = '';

    if (!state.components || state.components.length === 0) {
      elements.componentEmpty.style.display = 'block';
      return;
    }

    elements.componentEmpty.style.display = 'none';

    state.components.forEach((comp, index) => {
      const tr = document.createElement('tr');

      // Component name
      const tdComponent = document.createElement('td');
      tdComponent.textContent = comp.Component || '';
      tr.appendChild(tdComponent);

      // Actual Amount (read-only)
      const tdActual = document.createElement('td');
      tdActual.className = 'text-end';
      tdActual.textContent = formatMoney(comp.ActualAmount);
      tr.appendChild(tdActual);

      // Settlement Amount (calculated: Actual - Waiver, read-only)
      const tdSettlement = document.createElement('td');
      tdSettlement.className = 'text-end';
      const settlementAmount = parseMoney(comp.ActualAmount) - parseMoney(comp.WaiverAmount || 0);
      state.components[index].SettlementAmount = settlementAmount.toFixed(2); // Update state
      tdSettlement.textContent = formatMoney(settlementAmount);
      tr.appendChild(tdSettlement);

      // Waiver Amount (editable if IsEditable = true)
      const tdWaiver = document.createElement('td');
      tdWaiver.className = 'text-end';
      if (comp.IsEditable === 'true' || comp.IsEditable === true) {
        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'form-control form-control-sm text-end';
        input.value = formatMoney(comp.WaiverAmount || 0);
        input.disabled = state.mode === 'view';
        input.dataset.index = index;
        input.dataset.field = 'WaiverAmount';
        input.addEventListener('blur', handleComponentFieldChange);
        input.addEventListener('keydown', handleComponentKeyDown);
        tdWaiver.appendChild(input);
      } else {
        tdWaiver.textContent = formatMoney(comp.WaiverAmount || 0);
      }
      tr.appendChild(tdWaiver);

      // IsEditable
      const tdEditable = document.createElement('td');
      tdEditable.textContent = comp.IsEditable === 'true' || comp.IsEditable === true ? 'True' : 'False';
      tr.appendChild(tdEditable);

      elements.componentRows.appendChild(tr);
    });
  }

  /**
   * Handle component field change
   */
  function handleComponentFieldChange(event) {
    const input = event.target;
    const index = parseInt(input.dataset.index);
    const field = input.dataset.field;

    if (isNaN(index) || !field) return;

    const value = parseMoney(input.value);
    input.value = formatMoney(value);

    // Update state
    if (state.components[index]) {
      state.components[index][field] = value.toFixed(2);
      // Recalculate settlement amount (ActualAmount - WaiverAmount)
      const actualAmount = parseMoney(state.components[index].ActualAmount);
      const waiverAmount = parseMoney(state.components[index].WaiverAmount || 0);
      state.components[index].SettlementAmount = (actualAmount - waiverAmount).toFixed(2);
    }

    // Re-render to update waiver amount
    renderComponents();
  }

  /**
   * Handle keydown in component fields
   */
  function handleComponentKeyDown(event) {
    // Allow numeric input, decimal, backspace, delete, arrow keys, tab
    const allowedKeys = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', '.'];
    if (allowedKeys.includes(event.key) || /^[0-9]$/.test(event.key)) {
      return;
    }
    event.preventDefault();
  }

  /**
   * Render transaction rows
   */
  function renderTransactions() {
    if (!elements.trxRows || !elements.trxEmpty) return;

    elements.trxRows.innerHTML = '';

    if (!state.transactions || state.transactions.length === 0) {
      elements.trxEmpty.style.display = 'block';
      return;
    }

    elements.trxEmpty.style.display = 'none';

    state.transactions.forEach((trx) => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${trx.AccountType || ''}</td>
        <td>${trx.OurBranchID || ''}</td>
        <td>${trx.AccountID || ''}</td>
        <td>${trx.Name || ''}</td>
        <td>${trx.TrxDescription || ''}</td>
        <td>${trx.TrxType || ''}</td>
        <td class="text-end">${formatMoney(trx.Amount)}</td>
        <td class="text-end">${formatMoney(trx.LocalAmount)}</td>
      `;
      elements.trxRows.appendChild(tr);
    });
  }

  /**
   * Handle Add button click - Check user rights before enabling editing
   */
  async function handleAdd() {
    if (!state.isLoaded) {
      showMessage('Please load account details first using the View button', 'error');
      return;
    }

    const branchId = getValue('BranchID');
    const accountId = getValue('AccountID');
    const loanSeries = getValue('LoanSeries');

    // Disable Add button during processing
    if (elements.btnAdd) elements.btnAdd.disabled = true;

    try {
      // TODO: Re-enable user rights check when stored procedure is available
      // console.log('[LoanWaiver] Checking user rights...');
      // const result = await LoanWaiverService.checkUserRights('ADD', branchId, accountId, loanSeries);
      // if (!result.success) {
      //   showMessage(result.message || 'User rights check failed', 'error');
      //   if (elements.btnAdd) elements.btnAdd.disabled = false;
      //   return;
      // }
      // state.isSupervised = result.data?.isSupervised || false;

      // Temporarily bypass user rights check
      console.log('[LoanWaiver] User rights check bypassed (stored procedure not yet available)');
      state.isSupervised = false;

      // Switch to add mode - enables editing
      setFormMode('add');
      
      // Re-render components to enable Settlement Amount fields
      renderComponents();
      
      showMessage('Add mode enabled. You can now edit and generate transactions.', 'info');
    } catch (error) {
      console.error('[LoanWaiver] Error in handleAdd:', error);
      showMessage('An error occurred', 'error');
      if (elements.btnAdd) elements.btnAdd.disabled = false;
    }
  }

  /**
   * Handle Generate button click
   */
  async function handleGenerate() {
    if (state.mode === 'view' || !state.isLoaded) {
      showMessage('Please load an account first', 'error');
      return;
    }

    const branchId = getValue('BranchID');
    const accountId = getValue('AccountID');
    const loanSeries = getValue('LoanSeries');

    if (!accountId) {
      showMessage('Account ID is required', 'error');
      return;
    }

    // Disable Generate button during processing
    if (elements.btnGenerate) elements.btnGenerate.disabled = true;

    try {
      console.log('[LoanWaiver] Generating waiver transactions...');
      const result = await LoanWaiverService.generateLoanWaiver(branchId, accountId, loanSeries, state.components);

      if (!result.success) {
        showMessage(result.error || 'Failed to generate waiver transactions', 'error');
        if (elements.btnGenerate) elements.btnGenerate.disabled = false;
        return;
      }

      // Update transactions
      state.transactions = result.data.transactions || [];
      renderTransactions();

      // Disable Generate and Remarks, enable Save
      if (elements.btnGenerate) elements.btnGenerate.disabled = true;
      if (elements.btnSave) elements.btnSave.disabled = false;
      if (elements.remarks) elements.remarks.disabled = true;

      showMessage('Waiver transactions generated successfully', 'info');
    } catch (error) {
      console.error('[LoanWaiver] Error in handleGenerate:', error);
      showMessage('An error occurred while generating transactions', 'error');
      if (elements.btnGenerate) elements.btnGenerate.disabled = false;
    }
  }

  /**
   * Handle Save button click
   */
  async function handleSave() {
    if (state.mode === 'view' || !state.isLoaded) {
      showMessage('Nothing to save', 'error');
      return;
    }

    if (!state.transactions || state.transactions.length === 0) {
      showMessage('Please generate transactions before saving', 'error');
      return;
    }

    const branchId = getValue('BranchID');
    const accountId = getValue('AccountID');
    const loanSeries = getValue('LoanSeries');
    const remarks = getValue('Remarks') || '';
    const session = getSession();

    // Disable Save button during processing
    if (elements.btnSave) elements.btnSave.disabled = true;

    try {
      console.log('[LoanWaiver] Saving loan waiver...');
      const result = await LoanWaiverService.saveLoanWaiver(
        branchId,
        accountId,
        loanSeries,
        state.header,
        state.components,
        state.transactions,
        remarks,
        session.OperatorID || 'web_portal'
      );

      if (!result.success) {
        // Relay actual database error to user
        showMessage(result.error || result.message || 'Failed to save loan waiver', 'error');
        if (elements.btnSave) elements.btnSave.disabled = false;
        return;
      }

      showMessage(result.message || 'Loan waiver saved successfully!', 'success');
      // Reset form
      clearFields();
      setFormMode('view');
    } catch (error) {
      console.error('[LoanWaiver] Error in handleSave:', error);
      // Relay actual error message to user
      showMessage(error && error.message ? error.message : 'An error occurred while saving', 'error');
      if (elements.btnSave) elements.btnSave.disabled = false;
    }
  }

  /**
   * Handle Cancel button click
   */
  function handleCancel() {
    if (state.mode === 'add') {
      // Cancel from add mode - clear data and return to view mode
      if (confirm('Cancel changes? All unsaved changes will be lost.')) {
        clearFields();
        setFormMode('view');
        showMessage('Operation cancelled', 'info');
      }
    } else {
      // Cancel from view mode - clear everything
      clearFields();
      setFormMode('view');
      showMessage('Form cleared', 'info');
    }
  }

  // Store modal instances for reuse
  let branchSearchModal = null;
  let clientSearchModal = null;
  let accountSearchModal = null;

  /**
   * Perform direct lookup of field value without opening modal
   * Mirrors Loan Maintenance GetDescription logic
   */
  async function performLookup(fieldId, relatedFieldId, tableID, whereColumn, advFilterString = '') {
    const value = getValue(fieldId);
    
    // Don't proceed if field is empty
    if (!value) {
      setInputValue(relatedFieldId, '');
      return null;
    }

    try {
      if (!window.SearchService) {
        console.warn('[LoanWaiver] SearchService not available');
        return null;
      }

      // Build WHERE statement with LIKE operator (partial match)
      const whereStmt = `${whereColumn} LIKE '%${value.replace(/'/g, "''")}'`;
      const branchId = getValue('BranchID');

      console.log('[LoanWaiver] GetDescription lookup:', {
        TableID: tableID,
        WhereStmt: whereStmt,
        AdvFilterString: advFilterString,
        OperatorID: getOperatorId(),
        ModuleID: '4361'
      });

      // Call SearchService with proper parameters
      const response = await window.SearchService.searchClients({
        TableID: tableID,
        WhereStmt: whereStmt,
        AdvFilterString: advFilterString,
        PrevOrNext: '1',
        RefID: '',
        OperatorID: getOperatorId(),
        ModuleID: '4361',
        OurBranchID: branchId || '0101',
        SearchKey: ''
      });

      if (!response) {
        console.warn('[LoanWaiver] No response from SearchService');
        return null;
      }

      // Handle response data - response structure has Details array
      const responseData = response.Details || response.Data || [];
      if (responseData && responseData.length > 0) {
        const record = responseData[0];
        let displayValue = '';

        // Map field names to response fields based on tableID
        switch (tableID) {
          case 'BranchID':
            displayValue = record.BranchName || record.Name || '';
            break;
          case 'ClientAccountID':
            displayValue = record.ClientName || record.Name || '';
            break;
          case 'LoanID':
            displayValue = record.AccountName || record.Name || '';
            break;
          default:
            displayValue = record.Name || '';
        }

        console.log('[LoanWaiver] GetDescription result found:', { fieldId, displayValue, record });
        setInputValue(relatedFieldId, displayValue);
        
        // For AccountID, also populate LoanSeries
        if (fieldId === 'AccountID') {
          setInputValue('LoanSeries', record.LoanSeries || '');
        }
        
        return record; // Return the record so caller can access additional fields
      } else {
        // No match found - clear related field
        console.warn(`[LoanWaiver] No match found for ${fieldId}: ${value}`);
        setInputValue(relatedFieldId, '');
        if (fieldId === 'AccountID') {
          setInputValue('LoanSeries', '');
        }
        return null;
      }
    } catch (error) {
      console.error(`[LoanWaiver] GetDescription lookup failed for ${fieldId}:`, error);
      setInputValue(relatedFieldId, '');
      if (fieldId === 'AccountID') {
        setInputValue('LoanSeries', '');
      }
      return null;
    }
  }

  /**
   * Initialize search modals
   */
  function initializeSearchModals() {
    console.log('[LoanWaiver] Initializing search modals...');
    
    if (typeof window.SearchModal === 'undefined') {
      console.warn('[LoanWaiver] SearchModal not available, retrying...');
      setTimeout(initializeSearchModals, 500);
      return;
    }

    const moduleID = '4361'; // Loan Waiver module ID
    const getOperatorId = () => (typeof window.getOperatorId === 'function' ? window.getOperatorId() : 'web_portal');
    const getOurBranchId = () => getValue('BranchID') || '';

    // Branch search modal
    branchSearchModal = new window.SearchModal({
      prefix: 'lwa-branch-search',
      moduleID,
      getOperatorId,
      getOurBranchId
    });

    // Client search modal
    clientSearchModal = new window.SearchModal({
      prefix: 'lwa-client-search',
      moduleID,
      getOperatorId,
      getOurBranchId
    });

    // Account search modal
    accountSearchModal = new window.SearchModal({
      prefix: 'lwa-account-search',
      moduleID,
      getOperatorId,
      getOurBranchId
    });

    console.log('[LoanWaiver] Search modals initialized successfully');
  }

  /**
   * Handle search for Branch
   */
  async function handleBranchSearch() {
    const branchIDValue = getValue('BranchID');
    
    if (!branchSearchModal) {
      showMessage('Search modal not ready. Please try again.', 'error');
      return;
    }

    try {
      console.log('[LoanWaiver] Opening branch search modal');
      await branchSearchModal.open({
        tableID: 'BranchID',
        searchFields: [
          { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID', value: branchIDValue },
          { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
        ],
        autoSearch: !!branchIDValue,
        autoSelectSingle: !!branchIDValue, // Auto-select if only one result
        onSelect: (record) => {
          console.log('[LoanWaiver] Branch selected:', record);
          setInputValue('BranchID', record.OurBranchID || '');
          setInputValue('BranchName', record.BranchName || '');
        }
      });
    } catch (error) {
      console.error('[LoanWaiver] Error in handleBranchSearch:', error);
      showMessage('Error opening branch search: ' + error.message, 'error');
    }
  }

  /**
   * Handle search for Client
   */
  async function handleClientSearch() {
    const branchId = getValue('BranchID');
    const clientIDValue = getValue('ClientID');

    if (!branchId) {
      showMessage('Please select a Branch first', 'error');
      elements.branchId?.focus();
      return;
    }

    if (!clientSearchModal) {
      showMessage('Search modal not ready. Please try again.', 'error');
      return;
    }

    try {
      console.log('[LoanWaiver] Opening client search modal');
      await clientSearchModal.open({
        tableID: 'ClientAccountID',
        whereStmt: `ProductTypeID='LN' AND OurBranchID='${branchId}'`,
        searchFields: [
          { name: 'ClientID', label: 'Client ID', column: 'ClientID', value: clientIDValue },
          { name: 'ClientName', label: 'Client Name', column: 'ClientName' }
        ],
        autoSearch: !!clientIDValue,
        autoSelectSingle: !!clientIDValue, // Auto-select if only one result
        onSelect: (record) => {
          console.log('[LoanWaiver] Client selected:', record);
          setInputValue('ClientID', record.ClientID || '');
          setInputValue('ClientName', record.ClientName || record.Name || '');
        }
      });
    } catch (error) {
      console.error('[LoanWaiver] Error in handleClientSearch:', error);
      showMessage('Error opening client search: ' + error.message, 'error');
    }
  }

  /**
   * Handle search for Account
   */
  async function handleAccountSearch() {
    const branchId = getValue('BranchID');
    const accountIDValue = getValue('AccountID');

    if (!branchId) {
      showMessage('Please select a Branch first', 'error');
      elements.branchId?.focus();
      return;
    }

    if (!accountSearchModal) {
      showMessage('Search modal not ready. Please try again.', 'error');
      return;
    }

    try {
      console.log('[LoanWaiver] Opening account search modal');
      await accountSearchModal.open({
        tableID: 'LoanID',
        whereStmt: `LoanStatusID IN ('A','R','S','N') AND OurBranchID='${branchId}'`,
        searchFields: [
          { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: accountIDValue },
          { name: 'Name', label: 'Account Name', column: 'Name' }
        ],
        autoSearch: !!accountIDValue,
        autoSelectSingle: !!accountIDValue, // Auto-select if only one result
        onSelect: (record) => {
          console.log('[LoanWaiver] Account selected:', record);
          setInputValue('AccountID', record.AccountID || '');
          setInputValue('AccountName', record.AccountName || record.Name || '');
          setInputValue('LoanSeries', record.LoanSeries || '');
        }
      });
    } catch (error) {
      console.error('[LoanWaiver] Error in handleAccountSearch:', error);
      showMessage('Error opening account search: ' + error.message, 'error');
    }
  }

  /**
   * Initialize event listeners
   */
  function initEventListeners() {
    // Button events
    if (elements.btnView) {
      elements.btnView.addEventListener('click', handleView);
    }
    if (elements.btnAdd) {
      elements.btnAdd.addEventListener('click', handleAdd);
    }
    if (elements.btnGenerate) {
      elements.btnGenerate.addEventListener('click', handleGenerate);
    }
    if (elements.btnSave) {
      elements.btnSave.addEventListener('click', handleSave);
    }
    if (elements.btnCancel) {
      elements.btnCancel.addEventListener('click', handleCancel);
    }

    // Search button events
    if (elements.branchLookup) {
      elements.branchLookup.addEventListener('click', handleBranchSearch);
    }
    if (elements.clientLookup) {
      elements.clientLookup.addEventListener('click', handleClientSearch);
    }
    if (elements.accountLookup) {
      elements.accountLookup.addEventListener('click', handleAccountSearch);
    }

    // Enter key on search fields
    if (elements.branchId) {
      elements.branchId.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleBranchSearch();
        }
      });
      // Auto-populate on blur (focus out) - direct lookup without modal
      elements.branchId.addEventListener('blur', () => {
        performLookup('BranchID', 'BranchName', 'BranchID', 'OurBranchID', '');
      });
    }

    if (elements.clientId) {
      elements.clientId.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          handleClientSearch();
        }
      });
      // Auto-populate on blur (focus out) - direct lookup without modal
      elements.clientId.addEventListener('blur', () => {
        const advFilter = `ProductTypeID='LN'`;
        performLookup('ClientID', 'ClientName', 'ClientAccountID', 'ClientID', advFilter);
      });
    }

    if (elements.accountId) {
      elements.accountId.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          if (state.mode === 'view') {
            handleAccountSearch();
          }
        }
      });
      // Auto-populate on blur (focus out) - direct lookup without modal
      elements.accountId.addEventListener('blur', () => {
        const advFilter = `LoanStatusID IN ('A','R','S','N')`;
        performLookup('AccountID', 'AccountName', 'LoanID', 'AccountID', advFilter);
      });
    }
  }

  /**
   * Wire section collapse/expand functionality
   * Matches Account Maintenance form-section behavior
   */
  function wireFormSections() {
    const sections = document.querySelectorAll('.form-section');
    
    sections.forEach((section) => {
      const header = section.querySelector('.section-header');
      const toggle = section.querySelector('.section-toggle-btn');
      
      if (header && toggle) {
        const handleToggle = (e) => {
          e.preventDefault();
          section.classList.toggle('collapsed');
          const isCollapsed = section.classList.contains('collapsed');
          toggle.setAttribute('aria-expanded', !isCollapsed);
        };
        
        header.addEventListener('click', handleToggle);
        toggle.addEventListener('click', handleToggle);
      }
    });
  }

  /**
   * Initialize the module
   */
  function init() {
    console.log('[LoanWaiver] Initializing module...');

    initElements();

    // Wire form section collapse/expand
    wireFormSections();

    // Set initial session data
    const session = getSession();
    setInputValue('BranchID', session.BranchID || '0101');
    setInputValue('BranchName', session.BranchName || 'Head Office');

    // Wait for SearchModal to be available before initializing modals
    function waitForSearchModal(callback, maxWaitMs = 5000, intervalMs = 100) {
      const start = Date.now();
      (function poll() {
        if (window.SearchModal) {
          callback();
        } else if (Date.now() - start < maxWaitMs) {
          setTimeout(poll, intervalMs);
        } else {
          console.warn('[LoanWaiver] SearchModal not available after timeout');
        }
      })();
    }

    waitForSearchModal(() => {
      initializeSearchModals();
    });

    initEventListeners();
    setFormMode('view');

    console.log('[LoanWaiver] Module initialized successfully');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})(window);
