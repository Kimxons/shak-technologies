/**
 * Legal Expense Module
 * Modernized implementation aligned with legacy frmlegalExpense.js
 * Features: View account details, Manage transactions (New/Alter/Update/Remove), Calculate amounts, Save transactions
 */

(function (global) {
  if (global.__LegalExpenseLoaded) {
    console.warn("legal-expense.js already loaded; skipping duplicate execution.");
    return;
  }
  global.__LegalExpenseLoaded = true;

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  // ========================================
  // STATE MANAGEMENT
  // ========================================
  const state = {
    transactions: [],           // Current transactions
    removedRows: [],            // Rows marked for removal (to send to DB with ButtonMark 'R')
    btsData: null,
    tillDetails: [],            // Till details from pc_GetTillDetailPerTill
    selectedTillID: null,       // Selected till ID when Cash is chosen
    selectedTillCashControlGLID: null, // Selected till's CashControlGLID
    selectedIndex: -1,
    mode: 'view',               // 'view', 'edit', 'add', 'alter'
    hasRecords: false,
    hasChanges: false,          // Track unsaved changes
    addEnabled: true,           // Flag to control Add button (enabled on first load or after Cancel)
    loanSeries: null,
    accountCurrencyID: null,
    localCurrencyID: 'KES',
    searchModal: null,          // SearchModal instance for lookups
    contraAccountSearchModal: null // SearchModal for Contra Account
  };

  // ========================================
  // DOM ELEMENTS
  // ========================================
  const elements = {
    // Account Details Fields
    branchID: null,
    branchName: null,
    clientID: null,
    clientName: null,
    accountID: null,
    accountName: null,
    loanSeries: null,
    totalLegalExpense: null,

    // Transaction Fields
    transferType: null,
    till: null,
    transactionType: null,
    accountType: null,
    contraBranchID: null,
    contraBranchName: null,
    contraAccountID: null,
    contraAccountName: null,
    fixedAmount: null,
    exchangeRate: null,
    localAmount: null,
    referenceNo: null,
    forexGainLoss: null,
    narration: null,

    // Behind The Scene Fields
    currencyID: null,
    productID: null,
    systemDate: null,
    dayStatus: null,

    // Footer
    unpostedAmount: null,

    // Grid
    gridBody: null,
    emptyState: null,
    errorBox: null,
    errorMessage: null,

    // Buttons
    btnView: null,
    btnNew: null,
    btnAlter: null,
    btnRemove: null,
    btnUpdate: null,
    btnClear: null,
    btnProceed: null,
    btnDenomination: null,
    btnAdd: null,
    btnEdit: null,
    btnSave: null,
    btnCancel: null,
    btnBack: null
  };

  // ========================================
  // INITIALIZATION
  // ========================================

  async function init() {
    console.log('[LegalExpense] Initializing...');
    const shell = $('[data-llex-root]');
    if (!shell) {
      console.error('[LegalExpense] Shell not found');
      return;
    }
    cacheDomElements();
    initializeFromSession();
    await initializeDataFromServer();
    bindEvents();
    initializeLookups();
    disableTransactionFields();
    
    // Enable Transfer Type AFTER disabling other fields (can be changed before Add)
    if (elements.transferType) {
      elements.transferType.disabled = false;
    }
    
    updateButtonStates();
    console.log('[LegalExpense] Initialization complete');
  }

  /**
   * Fetch till details, legal expense, and populate dropdowns
   */
  async function initializeDataFromServer() {
    try {
      // Get operator/cashier ID - hardcoded for now
      // TODO: Replace with session-based cashierId when ready
      let cashierId = 'MARTIN_MARANGA';
      // if (typeof AuthService !== 'undefined' && AuthService.getSession) {
      //   const session = AuthService.getSession();
      //   cashierId = session?.OperatorID || session?.operatorID || null;
      // }
      
      // Get branch/account/loanSeries from fields
      const OurBranchID = elements.branchID?.value;
      const AccountID = elements.accountID?.value;
      const LoanSeries = elements.loanSeries?.value;

      // 1. Fetch till details (store for later use when Cash is selected)
      if (cashierId) {
        const tillResp = await LegalExpenseService.getTillDetailsPerTill(cashierId);
        if (tillResp.success && Array.isArray(tillResp.Details) && tillResp.Details.length > 0) {
          // Store till details in state for later use
          state.tillDetails = tillResp.Details;
          console.log('[LegalExpense] Till details loaded:', tillResp.Details);
        }
      }

      // 2. Fetch legal expense
      if (OurBranchID && AccountID && LoanSeries) {
        const leResp = await LegalExpenseService.getLoanLegalExpense({ OurBranchID, AccountID, LoanSeries });
        if (leResp.success && Array.isArray(leResp.Details) && leResp.Details.length > 0) {
          if (elements.totalLegalExpense) {
            elements.totalLegalExpense.value = leResp.Details[0].LoanLegalExpence || '0';
          }
        }
      }

      // 3. Populate Transaction Type dropdown
      if (elements.transactionType && global.LookupService?.getTransactionTypes) {
        const trxTypes = await global.LookupService.getTransactionTypes();
        elements.transactionType.innerHTML = '<option value="">--Select--</option>';
        trxTypes.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          elements.transactionType.appendChild(o);
        });
      }

      // 4. Populate Account Type dropdown
      if (elements.accountType && global.LookupService?.getSystemCodeOptions) {
        const accTypes = await global.LookupService.getSystemCodeOptions('AccountTypeID');
        elements.accountType.innerHTML = '<option value="">--Select--</option>';
        accTypes.forEach(opt => {
          const o = document.createElement('option');
          o.value = opt.value;
          o.textContent = opt.label;
          elements.accountType.appendChild(o);
        });
      }

      // 5. Set Transfer Type default to "T" (Transfer) and enable it
      if (elements.transferType) {
        elements.transferType.value = 'T';
        elements.transferType.disabled = false; // Enable before Add is clicked
        // Till should be empty for Transfer (default)
        if (elements.till) {
          elements.till.value = '';
        }
      }
    } catch (err) {
      console.error('[LegalExpense] Error initializing data from server:', err);
    }
  }

  function cacheDomElements() {
    // Account Details
    elements.branchID = $('#BranchID');
    elements.branchName = $('#BranchName');
    elements.clientID = $('#ClientID');
    elements.clientName = $('#ClientName');
    elements.accountID = $('#AccountID');
    elements.accountName = $('#AccountName');
    elements.loanSeries = $('#LoanSeries');
    elements.totalLegalExpense = $('#TotalLegalExpense');

    // Transaction Fields
    elements.transferType = $('#TransferType');
    elements.till = $('#Till');
    elements.transactionType = $('#TransactionType');
    elements.accountType = $('#AccountType');
    elements.contraBranchID = $('#ContraBranchID');
    elements.contraBranchName = $('#ContraBranchName');
    elements.contraAccountID = $('#ContraAccountID');
    elements.contraAccountName = $('#ContraAccountName');
    elements.fixedAmount = $('#FixedAmount');
    elements.exchangeRate = $('#ExchangeRate');
    elements.localAmount = $('#LocalAmount');
    elements.referenceNo = $('#ReferenceNo');
    elements.forexGainLoss = $('#ForexGainLoss');
    elements.narration = $('#Narration');

    // Behind The Scene
    elements.currencyID = $('#CurrencyID');
    elements.productID = $('#ProductID');
    elements.systemDate = $('#SystemDate');
    elements.dayStatus = $('#DayStatus');

    // Footer
    elements.unpostedAmount = $('#UnpostedAmount');

    // Grid
    elements.gridBody = $('[data-llex-rows]');
    elements.emptyState = $('[data-llex-empty]');
    elements.errorBox = $('[data-llex-error]');
    elements.errorMessage = $('[data-error-message]');

    // Buttons - get by data-action
    elements.btnView = $('[data-action="view"]');
    elements.btnNew = $('[data-action="new"]');
    elements.btnAlter = $('[data-action="alter"]');
    elements.btnRemove = $('[data-action="remove"]');
    elements.btnUpdate = $('[data-action="update"]');
    elements.btnClear = $('[data-action="clear"]');
    elements.btnProceed = $('[data-action="proceed"]');
    elements.btnDenomination = $('[data-action="denomination"]');
    elements.btnAdd = $('[data-action="add"]');
    elements.btnEdit = $('[data-action="edit"]');
    elements.btnSave = $('[data-action="save"]');
    elements.btnCancel = $('[data-action="cancel"]');
    elements.btnBack = $('[data-action="back"]');
  }

  function initializeFromSession() {
    // First, populate account fields from parent loan maintenance screen
    const parentData = getSessionData();
    if (parentData) {
      console.log('[LegalExpense] Populating from parent:', parentData);
      
      // Populate account details from parent
      if (parentData.BranchID && elements.branchID) {
        elements.branchID.value = parentData.BranchID;
        elements.branchID.disabled = true;
      }
      if (parentData.BranchName && elements.branchName) {
        elements.branchName.value = parentData.BranchName;
      }
      if (parentData.ClientID && elements.clientID) {
        elements.clientID.value = parentData.ClientID;
        elements.clientID.disabled = true;
      }
      if (parentData.ClientName && elements.clientName) {
        elements.clientName.value = parentData.ClientName;
      }
      if (parentData.AccountID && elements.accountID) {
        elements.accountID.value = parentData.AccountID;
        elements.accountID.disabled = true;
      }
      if (parentData.AccountName && elements.accountName) {
        elements.accountName.value = parentData.AccountName;
      }
      if (parentData.LoanSeries && elements.loanSeries) {
        elements.loanSeries.value = parentData.LoanSeries;
        state.loanSeries = parentData.LoanSeries;
      }
      // Populate CurrencyID and ProductID from parent (Behind The Scene fields)
      if (parentData.CurrencyID) {
        if (elements.currencyID) elements.currencyID.value = parentData.CurrencyID;
        state.accountCurrencyID = parentData.CurrencyID;
        console.log('[LegalExpense] Currency set from parent:', parentData.CurrencyID);
      }
      if (parentData.ProductID && elements.productID) {
        elements.productID.value = parentData.ProductID;
      }
    }

    // Then get additional session info (system date, day status) from AuthService
    if (typeof AuthService !== 'undefined' && AuthService.getSession) {
      const session = AuthService.getSession();
      
      if (session) {
        // Set system date and day status
        if (session.SystemDate && elements.systemDate) {
          elements.systemDate.value = formatDate(session.SystemDate);
          state.workingDate = session.SystemDate;
        }
        if (session.DayStatus && elements.dayStatus) {
          elements.dayStatus.value = session.DayStatus;
        }
        
        // Fallback: If branch wasn't set from parent, use session
        if (!elements.branchID?.value && session.BranchID && elements.branchID) {
          elements.branchID.value = session.BranchID;
          elements.branchID.disabled = true;
        }
        if (!elements.branchName?.value && session.BranchName && elements.branchName) {
          elements.branchName.value = session.BranchName;
        }
      }
    }
  }

  /**
   * Get session data from parent window
   * Reads values directly from parent document form elements
   */
  function getSessionData() {
    try {
      // Primary method: Read directly from parent document form elements
      const parentDoc = global.parent?.document;
      if (parentDoc) {
        const read = (id) => parentDoc?.getElementById(id)?.value?.trim?.() || '';
        
        const branchID = read('BranchID') || read('OurBranchID');
        const branchName = read('BranchName');
        const clientID = read('ClientID');
        const clientName = read('ClientName');
        const accountID = read('AccountID');
        const accountName = read('AccountName');
        const loanSeries = read('LoanSeries');
        const applicationID = read('ApplicationID');
        const loanRefNo = read('LoanRefNo');
        const currencyID = read('CurrencyID') || read('LoanCurrencyID');
        const productID = read('ProductID') || read('LoanProductID');
        
        if (branchID && accountID) {
          console.log('[LegalExpense] Session data from parent document:', {
            BranchID: branchID,
            BranchName: branchName,
            ClientID: clientID,
            ClientName: clientName,
            AccountID: accountID,
            AccountName: accountName,
            LoanSeries: loanSeries,
            ApplicationID: applicationID,
            CurrencyID: currencyID,
            ProductID: productID
          });
          return {
            BranchID: branchID,
            BranchName: branchName,
            ClientID: clientID,
            ClientName: clientName,
            AccountID: accountID,
            AccountName: accountName,
            LoanSeries: loanSeries,
            ApplicationID: applicationID,
            LoanRefNo: loanRefNo,
            CurrencyID: currencyID,
            ProductID: productID
          };
        }
      }
      
      // Fallback: Try to get data from sessionStorage
      const sessionStr = sessionStorage.getItem('lm-legal-expense-context');
      if (sessionStr) {
        return JSON.parse(sessionStr);
      }
      
      // Fallback: Try getLoanMaintenanceContext from parent window
      if (global.parent && global.parent !== global) {
        const parentData = global.parent.getLoanMaintenanceContext?.();
        if (parentData) {
          return parentData;
        }
      }
      
      return null;
    } catch (error) {
      console.error('[LegalExpense] Error getting session data:', error);
      return null;
    }
  }

  function bindEvents() {
    // Action buttons
    if (elements.btnView) elements.btnView.addEventListener('click', onViewClick);
    if (elements.btnNew) elements.btnNew.addEventListener('click', onNewClick);
    if (elements.btnAlter) elements.btnAlter.addEventListener('click', onAlterClick);
    if (elements.btnRemove) elements.btnRemove.addEventListener('click', onRemoveClick);
    if (elements.btnUpdate) elements.btnUpdate.addEventListener('click', onUpdateClick);
    if (elements.btnClear) elements.btnClear.addEventListener('click', onClearClick);
    if (elements.btnProceed) elements.btnProceed.addEventListener('click', onProceedClick);
    if (elements.btnDenomination) elements.btnDenomination.addEventListener('click', onDenominationClick);
    if (elements.btnAdd) elements.btnAdd.addEventListener('click', onAddClick);
    if (elements.btnEdit) elements.btnEdit.addEventListener('click', onEditClick);
    if (elements.btnSave) elements.btnSave.addEventListener('click', onSaveClick);
    if (elements.btnCancel) elements.btnCancel.addEventListener('click', onCancelClick);
    if (elements.btnBack) elements.btnBack.addEventListener('click', onBackClick);

    // Field change events
    if (elements.transferType) elements.transferType.addEventListener('change', onTransferTypeChange);
    if (elements.accountType) elements.accountType.addEventListener('change', onAccountTypeChange);
    if (elements.fixedAmount) elements.fixedAmount.addEventListener('input', onAmountChange);
    if (elements.exchangeRate) elements.exchangeRate.addEventListener('input', onExchangeRateChange);

    // Blur events for auto-lookup (like legacy system)
    if (elements.contraBranchID) {
      elements.contraBranchID.addEventListener('blur', onContraBranchBlur);
      elements.contraBranchID.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onContraBranchBlur();
          if (elements.contraAccountID) elements.contraAccountID.focus();
        }
      });
    }
    if (elements.contraAccountID) {
      elements.contraAccountID.addEventListener('blur', onContraAccountBlur);
      elements.contraAccountID.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onContraAccountBlur();
          if (elements.fixedAmount) elements.fixedAmount.focus();
        }
      });
    }
  }

  // ========================================
  // BUTTON HANDLERS
  // ========================================

  /**
   * View button handler - Loads account details
   */
  async function onViewClick() {
    try {
      hideError();

      // Validate inputs
      if (!validateAccountInputs()) {
        return;
      }

      const params = {
        OurBranchID: elements.branchID.value,
        AccountID: elements.accountID.value
      };

      console.log('[LegalExpense] Loading account details:', params);
      showMessage('Loading account details...', 'info');

      const response = await LegalExpenseService.getLegalExpenseDetails(params);

      if (response.success) {
        // Bind data to Behind The Scene section
        if (response.Details02) {
          state.btsData = response.Details02;
          bindBehindTheSceneData(response.Details02);
        }

        // Load existing transactions if any
        if (response.Details01 && response.Details01.length > 0) {
          // Mark existing records with ButtonMark 'A' for alter
          state.transactions = response.Details01.map(row => ({
            ...row,
            ButtonMark: row.ButtonMark || 'A'
          }));
          state.removedRows = []; // Clear removed rows on data load
          bindTransactionsToGrid();
          calculateUnpostedAmount();
        }

        showMessage('Account details loaded successfully', 'success');
        state.hasRecords = true;
        state.hasChanges = false;
        state.addEnabled = true; // Enable Add on first data load
        state.mode = 'view';
        updateButtonStates();
      } else {
        showMessage(response.message || 'Failed to load account details', 'error');
      }
    } catch (error) {
      console.error('[LegalExpense] Error loading account details:', error);
      showMessage('An error occurred while loading account details', 'error');
    }
  }

  /**
   * Edit button handler - Enters edit mode and allows row selection
   */
  function onEditClick() {
    if (state.transactions.length === 0) {
      showMessage('No transactions to edit', 'warning');
      return;
    }

    console.log('[LegalExpense] Entering edit mode');
    state.mode = 'edit';
    state.selectedIndex = -1; // Clear any selection
    state.addEnabled = false; // Disable Add when in edit mode
    clearTransactionFields(false); // Preserve Transfer Type and Till
    disableTransactionFields(); // Fields stay disabled until Alter is clicked
    updateButtonStates();
    bindTransactionsToGrid(); // Re-render grid to enable selection
    
    showMessage('Click on a row to select it, or click New to add a new transaction', 'info');
  }

  /**
   * New button handler - Prepares form for new transaction
   */
  function onNewClick() {
    if (state.mode !== 'edit') {
      showMessage('Please click Edit first', 'warning');
      return;
    }

    console.log('[LegalExpense] Entering add mode');
    state.mode = 'add';
    state.selectedIndex = -1;
    clearTransactionFields(false); // Preserve Transfer Type and Till
    enableTransactionFields();
    
    // Set defaults
    if (elements.transactionType) elements.transactionType.value = 'DR'; // Default to Debit
    if (elements.accountType) elements.accountType.value = 'G';
    if (elements.exchangeRate) elements.exchangeRate.value = '1.0000';
    if (elements.fixedAmount) elements.fixedAmount.value = '0.00';
    if (elements.localAmount) elements.localAmount.value = '0.00';
    if (elements.forexGainLoss) elements.forexGainLoss.value = '0.00';
    
    updateButtonStates();
    bindTransactionsToGrid(); // Re-render to clear selection highlight
    
    if (elements.transferType) elements.transferType.focus();
  }

  /**
   * Alter button handler - Loads selected transaction for editing
   */
  function onAlterClick() {
    if (state.mode !== 'edit') {
      showMessage('Please click Edit first', 'warning');
      return;
    }

    if (state.selectedIndex < 0) {
      showMessage('Please select a transaction to alter', 'warning');
      return;
    }

    console.log('[LegalExpense] Entering alter mode for index:', state.selectedIndex);
    state.mode = 'alter';
    const txn = state.transactions[state.selectedIndex];
    loadTransactionToForm(txn);
    enableTransactionFields();
    updateButtonStates();
  }

  /**
   * Remove button handler - Marks selected transaction for removal
   */
  function onRemoveClick() {
    if (state.mode !== 'edit') {
      showMessage('Please click Edit first', 'warning');
      return;
    }

    if (state.selectedIndex < 0) {
      showMessage('Please select a transaction to remove', 'warning');
      return;
    }

    if (!confirm('Are you sure you want to remove this transaction?')) {
      return;
    }

    console.log('[LegalExpense] Removing transaction at index:', state.selectedIndex);
    
    // Get the row to remove
    const rowToRemove = state.transactions[state.selectedIndex];
    
    // Mark with ButtonMark 'R' for removal and add to removedRows
    rowToRemove.ButtonMark = 'R';
    state.removedRows.push(rowToRemove);
    
    // Remove from transactions array
    state.transactions.splice(state.selectedIndex, 1);
    
    // Reset selection and stay in edit mode
    state.selectedIndex = -1;
    state.hasChanges = true;
    
    bindTransactionsToGrid();
    calculateUnpostedAmount();
    clearTransactionFields(false); // Preserve Transfer Type and Till
    updateButtonStates();
    
    showMessage('Transaction marked for removal', 'success');
  }

  /**
   * Update button handler - Updates/adds transaction and returns to edit mode
   */
  function onUpdateClick() {
    if (state.mode !== 'add' && state.mode !== 'alter') {
      showMessage('No transaction in progress', 'warning');
      return;
    }

    if (!validateTransactionInputs()) {
      return;
    }

    const txn = readTransactionFromForm();

    if (state.mode === 'add') {
      // New transaction - set ButtonMark 'N'
      txn.ButtonMark = 'N';
      state.transactions.push(txn);
      console.log('[LegalExpense] Added new transaction with ButtonMark N');
      showMessage('Transaction added successfully', 'success');
    } else if (state.mode === 'alter') {
      // Altered transaction - set ButtonMark 'A'
      txn.ButtonMark = 'A';
      state.transactions[state.selectedIndex] = txn;
      console.log('[LegalExpense] Updated transaction at index', state.selectedIndex, 'with ButtonMark A');
      showMessage('Transaction updated successfully', 'success');
    }
    
    // Return to edit mode
    state.mode = 'edit';
    state.selectedIndex = -1;
    state.hasChanges = true;
    
    bindTransactionsToGrid();
    calculateUnpostedAmount();
    clearTransactionFields(false); // Preserve Transfer Type and Till
    updateButtonStates();
  }

  /**
   * Clear button handler - Clears transaction form and returns to edit mode
   */
  function onClearClick() {
    console.log('[LegalExpense] Clearing form, returning to edit mode');
    clearTransactionFields(false); // Preserve Transfer Type and Till
    state.selectedIndex = -1;
    state.mode = 'edit'; // Stay in edit mode
    updateButtonStates();
    bindTransactionsToGrid(); // Re-render to clear selection highlight
  }

  /**
   * Proceed button handler - Validates transactions before save
   */
  function onProceedClick() {
    if (state.transactions.length === 0) {
      showMessage('No transactions to proceed', 'warning');
      return;
    }

    // If in add mode, ask user to complete transaction first
    if (state.mode === 'add') {
      if (!validateTransactionInputs()) {
        return;
      }
      
      // Add current transaction with ButtonMark 'N'
      const txn = readTransactionFromForm();
      txn.ButtonMark = 'N';
      state.transactions.push(txn);
      state.hasChanges = true;
      bindTransactionsToGrid();
      calculateUnpostedAmount();
      clearTransactionFields();
      state.mode = 'view';
    }

    // Check if unposted amount matches
    const unpostedAmt = parseFloat(elements.unpostedAmount.value || '0');
    const totalExpense = parseFloat(elements.totalLegalExpense.value || '0');

    if (Math.abs(unpostedAmt - totalExpense) > 0.01) {
      showMessage(`Unposted amount (${unpostedAmt.toFixed(2)}) does not match Total Legal Expense (${totalExpense.toFixed(2)})`, 'warning');
      return;
    }

    showMessage('Ready to save. Click Save to proceed.', 'info');
    updateButtonStates();
  }

  /**
   * Denomination button handler (placeholder)
   */
  function onDenominationClick() {
    showMessage('Denomination functionality coming soon', 'info');
  }

  /**
   * Add button handler - Initiates adding a new transaction (only available when no data in grid)
   */
  function onAddClick() {
    if (!state.addEnabled) {
      showMessage('Add is not available. Use Edit to modify existing transactions.', 'warning');
      return;
    }

    if (state.transactions.length > 0) {
      showMessage('Cannot add when data exists in grid. Use Edit instead.', 'warning');
      return;
    }

    console.log('[LegalExpense] Starting new transaction via Add button');
    state.mode = 'add';
    state.selectedIndex = -1;
    state.addEnabled = false;
    
    // Save current Transfer Type value before clearing
    const currentTransferType = elements.transferType?.value || 'T';
    const currentTill = elements.till?.value || '';
    
    clearTransactionFields();
    enableTransactionFields();
    
    // Restore Transfer Type and Till - they should NOT be changed after Add
    if (elements.transferType) {
      elements.transferType.value = currentTransferType;
      elements.transferType.disabled = true; // Lock Transfer Type after Add
    }
    if (elements.till) {
      elements.till.value = currentTill;
      // Till is already readonly in HTML
    }
    
    // Set defaults for other fields
    if (elements.transactionType) elements.transactionType.value = 'DR'; // Default to Debit
    if (elements.accountType) elements.accountType.value = 'G';
    if (elements.exchangeRate) elements.exchangeRate.value = '1.0000';
    if (elements.fixedAmount) elements.fixedAmount.value = '0.00';
    if (elements.localAmount) elements.localAmount.value = '0.00';
    if (elements.forexGainLoss) elements.forexGainLoss.value = '0.00';
    
    // Default Contra Branch from parent screen BranchID/BranchName
    if (elements.contraBranchID) {
      elements.contraBranchID.value = elements.branchID?.value || '';
    }
    if (elements.contraBranchName) {
      elements.contraBranchName.value = elements.branchName?.value || '';
    }
    
    // Set initial Unposted Amount to Total Legal Expense (like legacy system)
    // This is the full amount that needs to be settled via transactions
    if (elements.unpostedAmount && elements.totalLegalExpense) {
      elements.unpostedAmount.value = elements.totalLegalExpense.value;
    }
    
    updateButtonStates();
    
    // Focus on Transaction Type instead (since Transfer Type is now locked)
    if (elements.transactionType) elements.transactionType.focus();
  }

  /**
   * Save button handler - Saves all transactions to database
   */
  async function onSaveClick() {
    try {
      if (state.transactions.length === 0) {
        showMessage('No transactions to save', 'warning');
        return;
      }

      // Validate that transactions are balanced (Unposted Amount must be zero)
      const unpostedValue = parseFloat(String(elements.unpostedAmount?.value || '0').replace(/,/g, ''));
      if (Math.abs(unpostedValue) > 0.001) { // Allow for floating point tolerance
        showMessage('Cannot save: Unposted Amount must be zero. Please balance the transactions.', 'error');
        return;
      }

      if (!confirm('Are you sure you want to save these legal expense transactions?')) {
        return;
      }

      const params = {
        OurBranchID: elements.branchID.value,
        LoanAccountID: elements.accountID.value,
        LoanSeries: state.loanSeries,
        transactions: state.transactions
      };

      console.log('[LegalExpense] Saving transactions:', params);
      showMessage('Saving legal expense transactions...', 'info');

      const response = await LegalExpenseService.saveLegalExpenseTransaction(params);

      if (response && response.success) {
        showMessage('Legal expense transactions saved successfully', 'success');
        
        // Reset form after successful save
        setTimeout(() => {
          resetForm();
        }, 1500);
      } else {
        // Extract error message from various possible locations in the response
        const errorMsg = response?.message 
          || response?.data?.Message 
          || response?.Details?.Message 
          || 'Failed to save legal expense transactions';
        console.error('[LegalExpense] Save failed:', errorMsg);
        showMessage(errorMsg, 'error');
      }
    } catch (error) {
      console.error('[LegalExpense] Error saving transactions:', error);
      const errorMsg = error?.message || 'An error occurred while saving transactions';
      showMessage(errorMsg, 'error');
    }
  }

  /**
   * Cancel button handler - Resets form and enables Add
   */
  function onCancelClick() {
    if (state.hasChanges) {
      if (!confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        return;
      }
    }

    console.log('[LegalExpense] Cancelling, resetting to view mode');
    state.addEnabled = true; // Enable Add on Cancel
    resetForm();
  }

  /**
   * Back button handler - Closes subwindow
   */
  function onBackClick() {
    if (state.transactions.length > 0) {
      if (!confirm('Are you sure you want to go back? All unsaved transactions will be lost.')) {
        return;
      }
    }

    closeSubwindow();
  }

  // ========================================
  // FIELD CHANGE HANDLERS
  // ========================================

  function onTransferTypeChange() {
    const transferType = elements.transferType.value;
    console.log('[LegalExpense] Transfer type changed to:', transferType);
    
    // If Cash, map the TillName for the loan's currency
    if (transferType === 'C') {
      // Find till matching the loan's currency
      const loanCurrency = state.accountCurrencyID || elements.currencyID?.value;
      console.log('[LegalExpense] Looking for till with currency:', loanCurrency);
      console.log('[LegalExpense] Available till details:', state.tillDetails);
      
      if (state.tillDetails && state.tillDetails.length > 0 && loanCurrency) {
        // Find till matching the loan's currency (case-insensitive comparison)
        const matchingTill = state.tillDetails.find(t => 
          t.CurrencyID && t.CurrencyID.toUpperCase() === loanCurrency.toUpperCase()
        );
        console.log('[LegalExpense] Matching till found:', matchingTill);
        
        if (matchingTill && elements.till) {
          // Format: TillID-TillName
          elements.till.value = `${matchingTill.TillID}-${matchingTill.TillName || ''}`;
          // Store the TillID and CashControlGLID for saving
          state.selectedTillID = matchingTill.TillID;
          state.selectedTillCashControlGLID = matchingTill.CashControlGLID;
          console.log('[LegalExpense] Till set to:', elements.till.value);
        } else if (elements.till) {
          // Fallback to local currency till or first till
          const localTill = state.tillDetails.find(t => t.LocalCurrency === 1) || state.tillDetails[0];
          elements.till.value = localTill ? `${localTill.TillID}-${localTill.TillName || ''}` : '';
          state.selectedTillID = localTill?.TillID;
          state.selectedTillCashControlGLID = localTill?.CashControlGLID;
          console.log('[LegalExpense] Fallback till set to:', elements.till.value);
        }
      } else if (state.tillDetails && state.tillDetails.length > 0 && elements.till) {
        // No currency specified, fallback to local currency till or first till
        const localTill = state.tillDetails.find(t => t.LocalCurrency === 1) || state.tillDetails[0];
        elements.till.value = localTill ? `${localTill.TillID}-${localTill.TillName || ''}` : '';
        state.selectedTillID = localTill?.TillID;
        state.selectedTillCashControlGLID = localTill?.CashControlGLID;
        console.log('[LegalExpense] No currency, fallback till set to:', elements.till.value);
      } else {
        console.warn('[LegalExpense] No till details available or no currency set');
      }
      
      // Clear contra fields for cash transactions
      if (elements.contraBranchID) elements.contraBranchID.value = '';
      if (elements.contraBranchName) elements.contraBranchName.value = '';
      if (elements.contraAccountID) elements.contraAccountID.value = '';
      if (elements.contraAccountName) elements.contraAccountName.value = '';
    } else if (transferType === 'T') {
      // Transfer - clear Till field
      if (elements.till) {
        elements.till.value = '';
      }
      state.selectedTillID = null;
      state.selectedTillCashControlGLID = null;
    }
  }

  function onAccountTypeChange() {
    // Clear contra account when account type changes
    if (elements.contraAccountID) elements.contraAccountID.value = '';
    if (elements.contraAccountName) elements.contraAccountName.value = '';
  }

  function onAmountChange() {
    calculateLocalAmount();
  }

  function onExchangeRateChange() {
    calculateLocalAmount();
  }

  /**
   * Contra Branch blur handler - auto-lookup branch name when user types and leaves field
   * Similar to legacy txtContraBranchID_GetDescription
   */
  async function onContraBranchBlur() {
    const branchID = elements.contraBranchID?.value?.trim();
    
    // If empty, clear the name field
    if (!branchID) {
      if (elements.contraBranchName) elements.contraBranchName.value = '';
      if (elements.contraAccountID) elements.contraAccountID.value = '';
      if (elements.contraAccountName) elements.contraAccountName.value = '';
      return;
    }

    console.log('[LegalExpense] Looking up Contra Branch:', branchID);

    try {
      // Use SearchService to lookup branch
      const response = await SearchService.searchClients({
        TableID: 'BranchID',
        ModuleID: '4300',
        AdvFilterString: `OurBranchID='${branchID}'`,
        WhereStmt: '',
        OperatorID: getOperatorId(),
        OurBranchID: '000'
      });

      if (response.success && response.Details && response.Details.length > 0) {
        const branch = response.Details[0];
        if (elements.contraBranchName) {
          elements.contraBranchName.value = branch.BranchName || '';
        }
        console.log('[LegalExpense] Contra Branch found:', branch.BranchName);
        
        // Clear contra account since branch changed
        if (elements.contraAccountID) elements.contraAccountID.value = '';
        if (elements.contraAccountName) elements.contraAccountName.value = '';
      } else {
        // Branch not found
        if (elements.contraBranchName) elements.contraBranchName.value = '';
        showMessage('Branch not found: ' + branchID, 'warning');
        console.warn('[LegalExpense] Contra Branch not found:', branchID);
      }
    } catch (error) {
      console.error('[LegalExpense] Error looking up Contra Branch:', error);
      if (elements.contraBranchName) elements.contraBranchName.value = '';
    }
  }

  /**
   * Contra Account blur handler - auto-lookup account name when user types and leaves field
   * Similar to legacy txtContraAccountID_GetDescription
   */
  async function onContraAccountBlur() {
    const accountID = elements.contraAccountID?.value?.trim();
    const accountType = elements.accountType?.value;
    const contraBranchID = elements.contraBranchID?.value?.trim() || elements.branchID?.value || '';

    // If empty, clear the name field
    if (!accountID) {
      if (elements.contraAccountName) elements.contraAccountName.value = '';
      return;
    }

    if (!accountType) {
      showMessage('Please select Account Type first', 'warning');
      return;
    }

    console.log('[LegalExpense] Looking up Contra Account:', accountID, 'Type:', accountType);

    try {
      let tableID, advFilterString;
      
      if (accountType === 'G') {
        // GL Account
        tableID = 'GLDrTrxAllowID';
        advFilterString = `OurBranchID='${contraBranchID}' AND AccountID='${accountID}'`;
      } else if (accountType === 'C') {
        // CASA Account
        tableID = 'AccountDrTrxAllowID';
        const currencyID = elements.currencyID?.value || '';
        const clientID = elements.clientID?.value || '';
        
        let filters = [`OurBranchID='${contraBranchID}'`, `AccountID='${accountID}'`];
        if (currencyID) filters.push(`CurrencyID='${currencyID}'`);
        filters.push(`ProductTypeID IN ('SB','CS','CA')`);
        if (clientID) filters.push(`ClientID='${clientID}'`);
        
        advFilterString = filters.join(' AND ');
      } else {
        showMessage('Invalid Account Type', 'warning');
        return;
      }

      const response = await SearchService.searchClients({
        TableID: tableID,
        ModuleID: accountType === 'G' ? '3119' : '3000',
        AdvFilterString: advFilterString,
        WhereStmt: '',
        OperatorID: getOperatorId(),
        OurBranchID: contraBranchID
      });

      if (response.success && response.Details && response.Details.length > 0) {
        const account = response.Details[0];
        // GL returns 'Description', CASA returns 'Name'
        const accountName = account.Description || account.Name || account.AccountName || '';
        
        if (elements.contraAccountName) {
          elements.contraAccountName.value = accountName;
        }
        console.log('[LegalExpense] Contra Account found:', accountName);
        
        // Handle exchange rate based on currency (like legacy)
        const accountCurrency = account.CurrencyID || '';
        const localCurrency = state.localCurrencyID || 'KES';
        
        if (accountCurrency && accountCurrency.toUpperCase() === localCurrency.toUpperCase()) {
          if (elements.exchangeRate) {
            elements.exchangeRate.value = '1.0000';
            elements.exchangeRate.disabled = true;
          }
        } else if (accountCurrency) {
          if (elements.exchangeRate) {
            elements.exchangeRate.disabled = false;
          }
        }
      } else {
        // Account not found
        if (elements.contraAccountName) elements.contraAccountName.value = '';
        showMessage('Account not found: ' + accountID, 'warning');
        console.warn('[LegalExpense] Contra Account not found:', accountID);
      }
    } catch (error) {
      console.error('[LegalExpense] Error looking up Contra Account:', error);
      if (elements.contraAccountName) elements.contraAccountName.value = '';
    }
  }

  // ========================================
  // VALIDATIONS
  // ========================================

  function validateAccountInputs() {
    if (!elements.branchID || !elements.branchID.value.trim()) {
      showMessage('Branch ID is required', 'error');
      if (elements.branchID) elements.branchID.focus();
      return false;
    }

    if (!elements.accountID || !elements.accountID.value.trim()) {
      showMessage('Account ID is required', 'error');
      if (elements.accountID) elements.accountID.focus();
      return false;
    }

    return true;
  }

  function validateTransactionInputs() {
    if (!elements.transferType || !elements.transferType.value) {
      showMessage('Transfer Type is required', 'error');
      if (elements.transferType) elements.transferType.focus();
      return false;
    }

    if (!elements.transactionType || !elements.transactionType.value) {
      showMessage('Transaction Type is required', 'error');
      if (elements.transactionType) elements.transactionType.focus();
      return false;
    }

    if (!elements.accountType || !elements.accountType.value) {
      showMessage('Account Type is required', 'error');
      if (elements.accountType) elements.accountType.focus();
      return false;
    }

    // Contra branch required for Transfer type
    if (elements.transferType.value === 'T') {
      if (!elements.contraBranchID || !elements.contraBranchID.value.trim()) {
        showMessage('Contra Branch ID is required for Transfer', 'error');
        if (elements.contraBranchID) elements.contraBranchID.focus();
        return false;
      }

      if (!elements.contraAccountID || !elements.contraAccountID.value.trim()) {
        showMessage('Contra Account ID is required for Transfer', 'error');
        if (elements.contraAccountID) elements.contraAccountID.focus();
        return false;
      }
    }

    if (!elements.fixedAmount || parseFloat(elements.fixedAmount.value || '0') <= 0) {
      showMessage('Fixed Amount must be greater than 0', 'error');
      if (elements.fixedAmount) elements.fixedAmount.focus();
      return false;
    }

    if (!elements.narration || !elements.narration.value.trim()) {
      showMessage('Narration is required', 'error');
      if (elements.narration) elements.narration.focus();
      return false;
    }

    return true;
  }

  // ========================================
  // DATA BINDING
  // ========================================

  function bindBehindTheSceneData(btsData) {
    if (!btsData) return;

    if (elements.currencyID && btsData.CurrencyID) {
      elements.currencyID.value = btsData.CurrencyID;
      state.accountCurrencyID = btsData.CurrencyID;
    }

    if (elements.productID && btsData.ProductID) {
      elements.productID.value = btsData.ProductID;
    }

    if (btsData.LoanSeries) {
      state.loanSeries = btsData.LoanSeries;
      if (elements.loanSeries) {
        elements.loanSeries.value = btsData.LoanSeries;
      }
    }

    if (btsData.TotalLegalExpense !== undefined) {
      if (elements.totalLegalExpense) {
        elements.totalLegalExpense.value = formatCurrency(btsData.TotalLegalExpense);
      }
    }

    if (btsData.AccountName && elements.accountName) {
      elements.accountName.value = btsData.AccountName;
    }
  }

  function bindTransactionsToGrid() {
    if (!elements.gridBody) return;

    elements.gridBody.innerHTML = '';

    if (!state.transactions || state.transactions.length === 0) {
      if (elements.emptyState) elements.emptyState.style.display = '';
      return;
    }

    if (elements.emptyState) elements.emptyState.style.display = 'none';

    state.transactions.forEach((txn, index) => {
      const tr = document.createElement('tr');
      
      if (index === state.selectedIndex) {
        tr.classList.add('table-active');
      }

      tr.innerHTML = `
        <td>${escapeHtml(txn.ContraBranchID || '')}</td>
        <td>${escapeHtml(txn.TrxType || '')}</td>
        <td>${escapeHtml(txn.AccountType || '')}</td>
        <td>${escapeHtml(txn.ContraAccountID || '')}</td>
        <td class="text-end">${formatCurrency(txn.TrxAmount)}</td>
        <td class="text-end">${formatCurrency(txn.LocalAmount)}</td>
        <td class="text-end">${formatNumber(txn.ExchangeRate, 4)}</td>
        <td>${escapeHtml(txn.ReferenceNo || '')}</td>
        <td>${escapeHtml(txn.Narration || '')}</td>
      `;

      tr.style.cursor = 'pointer';
      tr.addEventListener('click', () => {
        // Allow selection in view mode or edit mode
        if (state.mode !== 'view' && state.mode !== 'edit') return;
        state.selectedIndex = index;
        loadTransactionToForm(state.transactions[index]);
        bindTransactionsToGrid(); // Re-render to update selection
        updateButtonStates(); // Update button states based on selection
      });

      elements.gridBody.appendChild(tr);
    });
  }

  function readTransactionFromForm() {
    return {
      TransferType: elements.transferType?.value || '',
      TrxType: elements.transactionType?.value || 'DR', // DR = Debit, CR = Credit
      AccountType: elements.accountType?.value || 'G',
      ContraBranchID: elements.contraBranchID?.value || '',
      ContraBranchName: elements.contraBranchName?.value || '',
      ContraAccountID: elements.contraAccountID?.value || '',
      ContraAccountName: elements.contraAccountName?.value || '',
      TrxAmount: elements.fixedAmount?.value || '0.00',
      LocalAmount: elements.localAmount?.value || '0.00',
      ExchangeRate: elements.exchangeRate?.value || '1.0000',
      ForexGainLoss: elements.forexGainLoss?.value || '0.00',
      ReferenceNo: elements.referenceNo?.value || '',
      Narration: elements.narration?.value || '',
      TillID: elements.till?.value || ''
    };
  }

  function loadTransactionToForm(txn) {
    if (!txn) return;

    if (elements.transferType) elements.transferType.value = txn.TransferType || '';
    if (elements.transactionType) elements.transactionType.value = txn.TrxType || 'DR';
    if (elements.accountType) elements.accountType.value = txn.AccountType || 'G';
    if (elements.contraBranchID) elements.contraBranchID.value = txn.ContraBranchID || '';
    if (elements.contraBranchName) elements.contraBranchName.value = txn.ContraBranchName || '';
    if (elements.contraAccountID) elements.contraAccountID.value = txn.ContraAccountID || '';
    if (elements.contraAccountName) elements.contraAccountName.value = txn.ContraAccountName || '';
    if (elements.fixedAmount) elements.fixedAmount.value = txn.TrxAmount || '0.00';
    if (elements.localAmount) elements.localAmount.value = txn.LocalAmount || '0.00';
    if (elements.exchangeRate) elements.exchangeRate.value = txn.ExchangeRate || '1.0000';
    if (elements.forexGainLoss) elements.forexGainLoss.value = txn.ForexGainLoss || '0.00';
    if (elements.referenceNo) elements.referenceNo.value = txn.ReferenceNo || '';
    if (elements.narration) elements.narration.value = txn.Narration || '';
    if (elements.till) elements.till.value = txn.TillID || '';
  }

  // ========================================
  // CALCULATIONS
  // ========================================

  function calculateLocalAmount() {
    const fixedAmt = parseFloat(elements.fixedAmount?.value || '0');
    const exRate = parseFloat(elements.exchangeRate?.value || '1');
    
    const localAmt = fixedAmt * exRate;
    
    if (elements.localAmount) {
      elements.localAmount.value = formatCurrency(localAmt);
    }

    // Calculate forex gain/loss if account currency differs from local
    if (state.accountCurrencyID && state.accountCurrencyID !== state.localCurrencyID) {
      // Placeholder - would need actual calculation logic from legacy system
      if (elements.forexGainLoss) {
        elements.forexGainLoss.value = '0.00';
      }
    }
  }

  function calculateUnpostedAmount() {
    // Get the Total Legal Expense (the amount that needs to be fully covered by transactions)
    const totalLegalExpense = parseFloat(String(elements.totalLegalExpense?.value || '0').replace(/,/g, ''));
    
    // Calculate based on Transaction Type:
    // DR (Debit) transactions reduce the unposted amount (paying the expense)
    // CR (Credit) transactions increase the unposted amount
    // The goal is to have DR total = Total Legal Expense, and DR = CR for balance
    let totalDR = 0;
    let totalCR = 0;
    
    state.transactions.forEach(txn => {
      const amt = parseFloat(String(txn.TrxAmount || '0').replace(/,/g, ''));
      if (!isNaN(amt)) {
        if (txn.TrxType === 'DR') {
          totalDR += amt;
        } else if (txn.TrxType === 'CR') {
          totalCR += amt;
        }
      }
    });

    // Unposted Amount = Total Legal Expense - DR amounts + CR amounts
    // Or simpler: Unposted = Total - (DR - CR) which means DR must match Total and CR must equal DR
    // Legacy logic: Unposted starts at Total, decreases with each DR, 
    // When DR = CR and DR = Total, unposted = 0
    const unpostedAmount = totalLegalExpense - totalDR + totalCR;

    if (elements.unpostedAmount) {
      elements.unpostedAmount.value = formatCurrency(unpostedAmount);
    }
  }

  // ========================================
  // UI HELPERS
  // ========================================

  function updateButtonStates() {
    const hasSelection = state.selectedIndex >= 0;
    const inEditMode = state.mode === 'edit'; // Edit mode is when Edit button was clicked
    const hasRecords = state.transactions.length > 0;
    const hasChanges = state.hasChanges;

    // Horizontal (form) buttons: New, Alter, Remove, Update, Clear
    // Disable all horizontal buttons by default
    if (elements.btnNew) elements.btnNew.disabled = true;
    if (elements.btnAlter) elements.btnAlter.disabled = true;
    if (elements.btnRemove) elements.btnRemove.disabled = true;
    if (elements.btnUpdate) elements.btnUpdate.disabled = true;
    if (elements.btnClear) elements.btnClear.disabled = true;

    // Horizontal button logic based on mode
    if (state.mode === 'edit') {
      // Edit clicked and NO row selected - enable New only
      if (!hasSelection) {
        if (elements.btnNew) elements.btnNew.disabled = false;
      } else {
        // Row is selected - enable Alter, Remove, Clear only (NOT Update)
        // User must click Alter first to enable Update
        if (elements.btnAlter) elements.btnAlter.disabled = false;
        if (elements.btnRemove) elements.btnRemove.disabled = false;
        if (elements.btnClear) elements.btnClear.disabled = false;
      }
    } else if (state.mode === 'add') {
      // In add mode (New clicked) - enable Update and Clear
      if (elements.btnUpdate) elements.btnUpdate.disabled = false;
      if (elements.btnClear) elements.btnClear.disabled = false;
    } else if (state.mode === 'alter') {
      // In alter mode (Alter clicked) - enable Update and Clear
      if (elements.btnUpdate) elements.btnUpdate.disabled = false;
      if (elements.btnClear) elements.btnClear.disabled = false;
    }

    // Right-side buttons (View, Add, Edit, Delete, Save, Cancel)
    // View is always disabled
    if (elements.btnView) elements.btnView.disabled = true;
    
    // Add: Disabled if data exists in grid, otherwise check addEnabled
    // Also disabled when in edit/add/alter mode
    if (elements.btnAdd) {
      elements.btnAdd.disabled = hasRecords || !state.addEnabled || state.mode === 'edit' || state.mode === 'add' || state.mode === 'alter';
    }
    
    // Edit: Enabled if data exists in grid AND we're in view mode (not already editing)
    if (elements.btnEdit) {
      elements.btnEdit.disabled = !hasRecords || state.mode === 'edit' || state.mode === 'add' || state.mode === 'alter';
    }
    
    // Proceed: Enable when there are transactions
    if (elements.btnProceed) elements.btnProceed.disabled = !hasRecords;
    
    // Save: Enabled when there are changes
    if (elements.btnSave) elements.btnSave.disabled = !hasChanges;
    
    // Cancel: Always enabled
    if (elements.btnCancel) elements.btnCancel.disabled = false;
  }

  function enableTransactionFields() {
    // NOTE: Transfer Type and Till are NOT enabled here - they are set on screen load
    // and should remain locked during transaction entry
    if (elements.transactionType) elements.transactionType.disabled = false;
    if (elements.accountType) elements.accountType.disabled = false;
    if (elements.contraBranchID) elements.contraBranchID.disabled = false;
    if (elements.contraAccountID) elements.contraAccountID.disabled = false;
    if (elements.fixedAmount) elements.fixedAmount.disabled = false;
    if (elements.exchangeRate) elements.exchangeRate.disabled = false;
    if (elements.referenceNo) elements.referenceNo.disabled = false;
    if (elements.narration) elements.narration.disabled = false;
    
    // Enable lookup buttons
    const contraBranchBtn = $('[data-lookup="contra-branch"]');
    const contraAccountBtn = $('[data-lookup="contra-account"]');
    if (contraBranchBtn) contraBranchBtn.disabled = false;
    if (contraAccountBtn) contraAccountBtn.disabled = false;
  }

  function disableTransactionFields() {
    if (elements.transferType) elements.transferType.disabled = true;
    if (elements.till) elements.till.disabled = true;
    if (elements.transactionType) elements.transactionType.disabled = true;
    if (elements.accountType) elements.accountType.disabled = true;
    if (elements.contraBranchID) elements.contraBranchID.disabled = true;
    if (elements.contraAccountID) elements.contraAccountID.disabled = true;
    if (elements.fixedAmount) elements.fixedAmount.disabled = true;
    if (elements.exchangeRate) elements.exchangeRate.disabled = true;
    if (elements.referenceNo) elements.referenceNo.disabled = true;
    if (elements.narration) elements.narration.disabled = true;
    
    // Disable lookup buttons
    const contraBranchBtn = $('[data-lookup="contra-branch"]');
    const contraAccountBtn = $('[data-lookup="contra-account"]');
    if (contraBranchBtn) contraBranchBtn.disabled = true;
    if (contraAccountBtn) contraAccountBtn.disabled = true;
  }

  function clearTransactionFields(includeTransferType = true) {
    // Transfer Type and Till are only cleared on full reset, not during Add/New
    if (includeTransferType) {
      if (elements.transferType) elements.transferType.value = '';
      if (elements.till) elements.till.value = '';
    }
    if (elements.transactionType) elements.transactionType.value = '';
    if (elements.accountType) elements.accountType.value = '';
    if (elements.contraBranchID) elements.contraBranchID.value = '';
    if (elements.contraBranchName) elements.contraBranchName.value = '';
    if (elements.contraAccountID) elements.contraAccountID.value = '';
    if (elements.contraAccountName) elements.contraAccountName.value = '';
    if (elements.fixedAmount) elements.fixedAmount.value = '0.00';
    if (elements.exchangeRate) elements.exchangeRate.value = '1.0000';
    if (elements.localAmount) elements.localAmount.value = '0.00';
    if (elements.forexGainLoss) elements.forexGainLoss.value = '0.00';
    if (elements.referenceNo) elements.referenceNo.value = '';
    if (elements.narration) elements.narration.value = '';
  }

  function resetForm() {
    // Clear account details
    if (elements.clientID) elements.clientID.value = '';
    if (elements.clientName) elements.clientName.value = '';
    if (elements.accountID) elements.accountID.value = '';
    if (elements.accountName) elements.accountName.value = '';
    if (elements.loanSeries) elements.loanSeries.value = '';
    if (elements.totalLegalExpense) elements.totalLegalExpense.value = '0.00';

    // Clear BTS fields
    if (elements.currencyID) elements.currencyID.value = '';
    if (elements.productID) elements.productID.value = '';

    // Clear transactions
    state.transactions = [];
    state.removedRows = [];
    state.btsData = null;
    state.selectedIndex = -1;
    state.mode = 'view';
    state.hasRecords = false;
    state.hasChanges = false;
    state.addEnabled = true;

    // Clear grid
    bindTransactionsToGrid();
    
    // Clear transaction fields
    clearTransactionFields();
    
    // Reset unposted amount
    if (elements.unpostedAmount) elements.unpostedAmount.value = '0.00';

    // Disable transaction fields
    disableTransactionFields();
    
    // Re-enable Transfer Type (can be changed before Add is clicked)
    if (elements.transferType) {
      elements.transferType.value = 'T'; // Reset to default Transfer
      elements.transferType.disabled = false;
    }
    if (elements.till) {
      elements.till.value = ''; // Clear Till for Transfer
    }
    
    // Update button states
    updateButtonStates();
    
    // Clear any messages
    hideError();
  }

  // ========================================
  // LOOKUP INTEGRATION
  // ========================================

  function getOperatorId() {
    try {
      const authService = global.parent?.AuthService || global.AuthService;
      const session = authService?.getSession?.();
      return session?.operatorId || session?.operatorID || session?.name || 'web_portal';
    } catch {
      return 'web_portal';
    }
  }

  function initializeLookups() {
    console.log('[LegalExpense] Initializing lookups...');
    
    // Get SearchModal class from parent or local
    const SearchModalClass = global.parent?.SearchModal || global.SearchModal;
    
    if (!SearchModalClass) {
      console.warn('[LegalExpense] SearchModal not available');
      return;
    }

    // Contra Branch lookup - uses BranchID TableID with ModuleID 4300
    const contraBranchLookupBtn = $('[data-lookup="contra-branch"]');
    if (contraBranchLookupBtn && elements.contraBranchID && elements.contraBranchName) {
      contraBranchLookupBtn.addEventListener('click', () => {
        console.log('[LegalExpense] Opening Contra Branch search...');
        
        // Create or reuse search modal for branch
        if (!state.searchModal) {
          state.searchModal = new SearchModalClass({
            prefix: 'llex-branch',
            moduleID: '4300',
            getOperatorId: getOperatorId,
            getOurBranchId: () => '000',
            onError: (msg) => showMessage(msg, 'error')
          });
        }
        
        state.searchModal.open({
          title: 'Select Branch',
          tableID: 'BranchID',
          advFilterString: '',
          whereStmt: '',
          searchFields: [
            { name: 'BranchID', label: 'Branch ID', column: 'OurBranchID', value: elements.contraBranchID?.value || '' },
            { name: 'BranchName', label: 'Branch Name', column: 'BranchName' }
          ],
          displayFields: [
            { key: 'OurBranchID', label: 'Branch ID' },
            { key: 'BranchName', label: 'Branch Name' }
          ],
          onSelect: (selected) => {
            console.log('[LegalExpense] Branch selected:', selected);
            if (elements.contraBranchID) elements.contraBranchID.value = selected.OurBranchID || selected.BranchID || '';
            if (elements.contraBranchName) elements.contraBranchName.value = selected.BranchName || '';
          }
        });
      });
    }

    // Contra Account lookup - depends on Account Type (GL or CASA)
    const contraAccountLookupBtn = $('[data-lookup="contra-account"]');
    if (contraAccountLookupBtn && elements.contraAccountID && elements.contraAccountName) {
      contraAccountLookupBtn.addEventListener('click', () => {
        const accountType = elements.accountType?.value;
        const contraBranchID = elements.contraBranchID?.value || elements.branchID?.value || '1201';

        if (!accountType) {
          showMessage('Please select Account Type first', 'warning');
          return;
        }

        console.log('[LegalExpense] Opening Contra Account search for type:', accountType);

        if (accountType === 'G') {
          // GL Account search
          // Returns: AccountID, Description, CurrencyID, GLAccountTypeID
          if (!state.contraAccountSearchModal) {
            state.contraAccountSearchModal = new SearchModalClass({
              prefix: 'llex-gl',
              moduleID: 3119,
              getOperatorId: getOperatorId,
              getOurBranchId: () => contraBranchID,
              onError: (msg) => showMessage(msg, 'error')
            });
          }
          
          state.contraAccountSearchModal.open({
            title: 'Select GL Account',
            tableID: 'GLDrTrxAllowID',
            advFilterString: `OurBranchID='${contraBranchID}'`,
            whereStmt: '',
            searchFields: [
              { name: 'AccountID', label: 'GL ID', column: 'AccountID', value: elements.contraAccountID?.value || '' },
              { name: 'Description', label: 'GL Name', column: 'Description' }
            ],
            displayFields: [
              { key: 'AccountID', label: 'GL ID' },
              { key: 'Description', label: 'GL Name' },
              { key: 'CurrencyID', label: 'Currency' }
            ],
            onSelect: (selected) => {
              console.log('[LegalExpense] GL Account selected:', selected);
              if (elements.contraAccountID) elements.contraAccountID.value = selected.AccountID || '';
              if (elements.contraAccountName) elements.contraAccountName.value = selected.Description || '';
            }
          });
        } else if (accountType === 'C') {
          // CASA Account search - aligned with legacy frmlegalExpense.js
          // Returns: AccountID, Name, ProductID, CurrencyID
          const currencyID = elements.currencyID?.value || '';
          const clientID = elements.clientID?.value || '';
          
          // Build AdvFilterString matching legacy pattern
          let advFilters = [];
          advFilters.push(`OurBranchID='${contraBranchID}'`);
          if (currencyID) advFilters.push(`CurrencyID='${currencyID}'`);
          advFilters.push(`ProductTypeID IN ('SB','CS','CA')`);
          if (clientID) advFilters.push(`ClientID='${clientID}'`);
          
          if (!state.contraAccountSearchModal) {
            state.contraAccountSearchModal = new SearchModalClass({
              prefix: 'llex-casa',
              moduleID: 3000,
              getOperatorId: getOperatorId,
              getOurBranchId: () => contraBranchID,
              onError: (msg) => showMessage(msg, 'error')
            });
          }
          
          state.contraAccountSearchModal.open({
            title: 'Select CASA Account',
            tableID: 'AccountDrTrxAllowID',
            advFilterString: advFilters.join(' AND '),
            whereStmt: '',
            searchFields: [
              { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: elements.contraAccountID?.value || '' },
              { name: 'Name', label: 'Account Name', column: 'Name' }
            ],
            displayFields: [
              { key: 'AccountID', label: 'Account ID' },
              { key: 'Name', label: 'Account Name' },
              { key: 'CurrencyID', label: 'Currency' }
            ],
            onSelect: (selected) => {
              console.log('[LegalExpense] CASA Account selected:', selected);
              if (elements.contraAccountID) elements.contraAccountID.value = selected.AccountID || '';
              if (elements.contraAccountName) elements.contraAccountName.value = selected.Name || '';
            }
          });
        } else {
          showMessage('Invalid Account Type', 'warning');
        }
      });
    }
    
    console.log('[LegalExpense] Lookups initialized');
  }

  // ========================================
  // UTILITY FUNCTIONS
  // ========================================

  function showMessage(message, type = 'info') {
    console.log(`[LegalExpense] ${type.toUpperCase()}: ${message}`);
    
    // Show popup for errors (API errors, validation errors, etc.)
    if (type === 'error') {
      showErrorPopup(message);
    }
    
    if (elements.errorBox && elements.errorMessage) {
      elements.errorMessage.textContent = message;
      elements.errorBox.classList.remove('alert-danger', 'alert-warning', 'alert-info', 'alert-success');
      
      if (type === 'error') {
        elements.errorBox.classList.add('alert-danger');
      } else if (type === 'warning') {
        elements.errorBox.classList.add('alert-warning');
      } else if (type === 'success') {
        elements.errorBox.classList.add('alert-success');
      } else {
        elements.errorBox.classList.add('alert-info');
      }
      
      elements.errorBox.removeAttribute('hidden');
      
      // Auto-hide success/info messages after 3 seconds
      if (type === 'success' || type === 'info') {
        setTimeout(() => {
          hideError();
        }, 3000);
      }
    }
  }

  /**
   * Show error popup modal for API errors
   */
  function showErrorPopup(message) {
    // Check if modal already exists
    let modalEl = document.getElementById('llex-error-modal');
    
    if (!modalEl) {
      // Create modal HTML
      const modalHtml = `
        <div class="modal fade" id="llex-error-modal" tabindex="-1" aria-labelledby="llex-error-modal-label" aria-hidden="true">
          <div class="modal-dialog modal-dialog-centered">
            <div class="modal-content">
              <div class="modal-header bg-danger text-white">
                <h5 class="modal-title" id="llex-error-modal-label">
                  <i class="bi bi-exclamation-triangle-fill me-2"></i>Error
                </h5>
                <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal" aria-label="Close"></button>
              </div>
              <div class="modal-body">
                <p id="llex-error-modal-message" class="mb-0"></p>
              </div>
              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">OK</button>
              </div>
            </div>
          </div>
        </div>
      `;
      document.body.insertAdjacentHTML('beforeend', modalHtml);
      modalEl = document.getElementById('llex-error-modal');
    }
    
    // Set message and show modal
    const messageEl = document.getElementById('llex-error-modal-message');
    if (messageEl) {
      messageEl.textContent = message;
    }
    
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  function hideError() {
    if (elements.errorBox) {
      elements.errorBox.setAttribute('hidden', '');
    }
    if (elements.errorMessage) {
      elements.errorMessage.textContent = '';
    }
  }

  function formatCurrency(value) {
    const num = parseFloat(String(value).replace(/,/g, ''));
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  }

  function formatNumber(value, decimals = 2) {
    const num = parseFloat(String(value).replace(/,/g, ''));
    if (isNaN(num)) return '0'.padEnd(decimals + 2, '0');
    return num.toFixed(decimals);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function escapeHtml(value) {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function closeSubwindow() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: 'close-child-form' }, '*');
      }
    } catch (error) {
      console.error('[LegalExpense] Error closing subwindow:', error);
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
