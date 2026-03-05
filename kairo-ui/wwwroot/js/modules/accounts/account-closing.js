/**
 * Account Closing Module
 * Handles account closing operations with modern styling
 * Matches modern-account-maintenance.js patterns
 */
(() => {
  'use strict';

  // DOM Elements
  const windowEl = document.querySelector('.window');
  if (!windowEl) return;

  const messageBar = document.querySelector('.am-message-panel');
  const loadingOverlay = document.getElementById('loadingOverlay');

  // Form state management
  const state = {
    mode: 'VIEW', // VIEW, ADD, EDIT
    context: {
      OurBranchID: '',
      AccountID: '',
      OperatorID: '',
      ProductID: '',   // Main account Product ID
      CurrencyID: ''   // Main account Currency ID
    },
    transactionDetails: [],
    selectedTransactionIndex: null,
    originalBalance: 0, // Balance from Close Details tab
    unpostedAmount: 0   // Remaining amount to be posted
  };

  // ============================================================================
  // MESSAGE PANEL (Toast Notification)
  // ============================================================================
  const showMessage = (msg, type = 'info') => {
    if (!messageBar) return;
    
    messageBar.classList.remove('error', 'success', 'warning', 'info', 'show');
    messageBar.classList.add(type);
    
    const icon = messageBar.querySelector('i');
    if (icon) {
      const iconMap = {
        error: 'bi-exclamation-circle',
        success: 'bi-check-circle',
        warning: 'bi-exclamation-triangle',
        info: 'bi-info-circle'
      };
      icon.className = 'bi ' + (iconMap[type] || 'bi-info-circle');
    }
    
    const span = messageBar.querySelector('.message-text') || messageBar.querySelector('span');
    if (span) span.textContent = msg;
    
    messageBar.classList.add('show');
    
    // Auto-hide after 5 seconds
    setTimeout(() => {
      messageBar.classList.remove('show');
    }, 5000);
  };

  // ============================================================================
  // LOADING OVERLAY
  // ============================================================================
  const showLoader = (show, message = 'Loading account closing...') => {
    if (!loadingOverlay) return;
    
    const textEl = loadingOverlay.querySelector('.page-loading-text');
    if (textEl && message) {
      textEl.textContent = message;
    }
    
    loadingOverlay.hidden = !show;
  };

  // ============================================================================
  // PARENT COMMUNICATION
  // ============================================================================
  const postClose = () => {
    window.parent?.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
  };

  const pullContext = () => {
    const parentState = window.parent?.AccountMaintenanceState;
    if (parentState) {
      state.context.OurBranchID = parentState.OurBranchID || '';
      state.context.AccountID = parentState.AccountID || '';
      state.context.OperatorID = parentState.OperatorID || '';
      state.context.ProductID = parentState.ProductID || '';
      state.context.CurrencyID = parentState.CurrencyID || '';
    }
    
    // Fallback to session if needed
    if (!state.context.OperatorID) {
      const session = window.parent?.AuthService?.getSession?.() || window.AuthService?.getSession?.();
      if (session) {
        state.context.OperatorID = session.operatorID || session.OperatorID || session.operatorId || '';
        state.context.OurBranchID = state.context.OurBranchID || session.branchID || session.BranchID || session.OurBranchID || '';
      }
    }
  };

  // ============================================================================
  // SECTION TOGGLE FUNCTIONALITY
  // ============================================================================
  const initSectionToggles = () => {
    document.querySelectorAll('[data-section-toggle]').forEach(header => {
      header.addEventListener('click', (e) => {
        // Don't toggle if clicking on form controls
        if (e.target.closest('input, select, button:not(.section-toggle-btn)')) {
          return;
        }
        
        const section = header.closest('.form-section');
        const content = section?.querySelector('[data-section-content]');
        const toggleBtn = header.querySelector('.section-toggle-btn');
        const toggleIcon = toggleBtn?.querySelector('i');
        
        if (!content) return;
        
        const isHidden = content.style.display === 'none';
        
        // Toggle visibility
        content.style.display = isHidden ? 'block' : 'none';
        
        // Update toggle button
        if (toggleBtn) {
          toggleBtn.setAttribute('aria-expanded', isHidden ? 'true' : 'false');
        }
        
        // Update icon
        if (toggleIcon) {
          toggleIcon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
        }
      });
    });
    
    // Initialize "Behind The Scene" section as collapsed
    const btsSection = document.querySelector('[data-section="behind-scene"]');
    if (btsSection) {
      const content = btsSection.querySelector('[data-section-content]');
      const toggleBtn = btsSection.querySelector('.section-toggle-btn');
      if (content) {
        content.style.display = 'none';
      }
      if (toggleBtn) {
        toggleBtn.setAttribute('aria-expanded', 'false');
      }
    }
  };

  // ============================================================================
  // FORM MODE MANAGEMENT
  // ============================================================================
  
  // Fields that are always editable (on page load/VIEW mode)
  const accountDetailsEditableFields = ['reason', 'remarks'];
  
  // Fields in Transaction Details tab (enabled on ADD mode)
  // Note: productId, currencyId, balanceAmount, unpostedAmount are excluded - they're view-only/computed fields
  const transactionDetailsFields = [
    'transactionType', 'till',
    'typeOfService', 'referenceNo', 'accountType',
    'txnAccountId', 'txnAccountName',
    'chequeId', 'exchangeRate', 'payableAt', 'payableAtName',
    'forexGainLoss', 'beneficiaryName', 'transactionId', 'transactionIdName',
    'transactionAmount', 'localAmount', 'narration'
  ];

  const setFormMode = (mode) => {
    state.mode = mode;
    
    const isView = mode === 'VIEW';
    const isAdd = mode === 'ADD';
    const isEdit = mode === 'EDIT';
    
    // Update button states
    const viewBtn = document.querySelector('[data-action="view"]');
    const addBtn = document.querySelector('[data-action="add"]');
    const editBtn = document.querySelector('[data-action="edit"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    
    if (viewBtn) viewBtn.classList.toggle('underline', isView);
    if (addBtn) addBtn.classList.toggle('underline', isAdd);
    if (editBtn) editBtn.classList.toggle('underline', isEdit);
    
    // Always enable Account Details editable fields (Reason, Remarks)
    accountDetailsEditableFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.disabled = false;
    });
    
    // Transaction Details fields - keep disabled until user clicks New
    setTransactionFieldsEnabled(false);
    
    // If ADD mode, switch to Transaction Details tab (but fields remain disabled until New is clicked)
    if (isAdd) {
      const transactionTab = document.getElementById('transaction-tab');
      if (transactionTab) {
        transactionTab.click();
      }
      showMessage('Add mode activated - Click New to enter transaction details', 'info');
    } else {
      showMessage(`${mode.charAt(0) + mode.slice(1).toLowerCase()} mode activated`, 'info');
    }
  };

  /**
   * Enable or disable transaction detail fields
   * @param {boolean} enabled - Whether fields should be enabled
   */
  const setTransactionFieldsEnabled = (enabled) => {
    // Check if Transaction Type is Transfer
    const transactionTypeSelect = document.getElementById('transactionType');
    const isTransfer = transactionTypeSelect?.value === 'T' || transactionTypeSelect?.value?.toLowerCase() === 'transfer';
    
    transactionDetailsFields.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.hasAttribute('readonly')) {
        // Keep Till disabled when Transaction Type is Transfer
        if (id === 'till' && isTransfer) {
          el.disabled = true;
        } else {
          el.disabled = !enabled;
        }
      }
    });
  };

  // ============================================================================
  // PAYLOAD BUILDING
  // ============================================================================
  const getInsertFlag = () => (state.mode === 'ADD' ? 'Y' : null);

  const buildRequestPayload = (forInitialLoad = false) => {
    pullContext();
    const { OurBranchID, AccountID, OperatorID } = state.context;
    return {
      OurBranchID,
      AccountID,
      OperatorID,
      InsertYN: forInitialLoad ? null : getInsertFlag()
    };
  };

  // ============================================================================
  // SERVICE CALLS
  // ============================================================================
  const callService = async (forInitialLoad = false) => {
    const svc = window.accountservice || window.AccountService || window.parent?.accountservice;
    if (!svc?.getAccountClosingDetails) {
      throw new Error('accountservice.getAccountClosingDetails not available');
    }
    const requestData = buildRequestPayload(forInitialLoad);
    if (!requestData.OurBranchID || !requestData.AccountID) {
      throw new Error('Branch and Account are required to load closing details.');
    }
    console.log('[AccountClosing] Calling dbo.P_GetAcClosingDetails with:', requestData);
    return svc.getAccountClosingDetails(requestData);
  };

  const populateForm = (data) => {
    if (!data) return;
    
    // Extract and store the balance value (remove formatting for computation)
    const balanceValue = parseFloat(String(data.Balance || data.balance || 0).replace(/,/g, '')) || 0;
    state.originalBalance = balanceValue;
    state.unpostedAmount = balanceValue;
    
    // Store main account ProductID and CurrencyID from API response
    state.context.ProductID = data.ProductID || data.productID || data.productId || state.context.ProductID || '';
    state.context.CurrencyID = data.CurrencyID || data.currencyID || data.currencyId || state.context.CurrencyID || '';
    console.log('[AccountClosing] Main account context - AccountID:', state.context.AccountID, 'ProductID:', state.context.ProductID, 'CurrencyID:', state.context.CurrencyID);
    
    // Populate form fields with data
    const fieldMapping = {
      'reason': data.ReasonID || data.reason || '',
      'remarks': data.Remarks || data.remarks || '',
      'balance': formatMoney(balanceValue),
      'penalInterestReceivable': formatMoney(data.PenalInterestReceivable || data.penalInterestReceivable || 0),
      'creditInterestPayable': formatMoney(data.CreditInterestPayable || data.creditInterestPayable || 0),
      'taxAmount': formatMoney(data.TaxAmount || data.taxAmount || 0),
      'debitInterestReceivable': formatMoney(data.DebitInterestReceivable || data.debitInterestReceivable || 0),
      'closingCharges': formatMoney(data.ClosingCharges || data.closingCharges || 0),
      'netPayable': formatMoney(data.NetPayable || data.netPayable || 0)
    };
    
    Object.entries(fieldMapping).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'SELECT') {
          el.value = value;
        } else {
          el.value = value;
        }
      }
    });
    
    // Populate audit fields
    const auditMapping = {
      'MakerID': data.MakerID || '-',
      'MakerDT': data.MakerDT ? formatDate(data.MakerDT) : '-',
      'CheckerID': data.CheckerID || '-',
      'CheckerDT': data.CheckerDT ? formatDate(data.CheckerDT) : '-',
      'ModifierID': data.ModifierID || '-',
      'ModifierDT': data.ModifierDT ? formatDate(data.ModifierDT) : '-'
    };
    
    Object.entries(auditMapping).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (el) el.textContent = value;
    });
    
    // Populate Transaction Details tab fields: Balance Amount and Unposted Amount
    updateBalanceAndUnpostedFields();
    
    // Update save button state
    updateSaveButtonState();
  };

  const loadClosingDetails = async () => {
    showLoader(true, 'Loading closing details...');
    try {
      const result = await callService(true); // forInitialLoad = true, InsertYN = null
      console.log('[AccountClosing] Loaded details:', result);
      
      if (result?.success) {
        // Result set 1: Account Details (from Details array)
        const accountDetails = result.data?.Details?.[0] || result.Details?.[0] || result.data;
        if (accountDetails) {
          populateForm(accountDetails);
        }
        
        // Result set 2: Components (from Details01 array) - populated in Close Details tab
        const componentsData = result.data?.Details01 || result.Details01 || [];
        populateComponentsGrid(componentsData);
        
        showMessage('Closing details loaded successfully.', 'success');
      } else {
        showMessage(result?.message || 'Failed to load closing details.', 'error');
      }
      
      setFormMode('VIEW');
    } catch (err) {
      console.error('[AccountClosing] Load error:', err);
      showMessage(err?.message || 'Failed to load closing details.', 'error');
    } finally {
      showLoader(false);
    }
  };

  /**
   * Populate the Components grid with data from result set 2
   * This grid is in the Close Details tab only
   * @param {Array} components - Array of component objects
   */
  const populateComponentsGrid = (components) => {
    const tbody = document.getElementById('componentsGridBody');
    if (!tbody) {
      console.warn('[AccountClosing] Components grid body not found');
      return;
    }
    
    // Clear existing rows
    tbody.innerHTML = '';
    
    if (!components || components.length === 0) {
      // Show empty state
      tbody.innerHTML = `
        <tr class="empty-row">
          <td colspan="4" class="text-center text-muted">There are no Items to be Displayed</td>
        </tr>
      `;
      return;
    }
    
    // Populate with data rows
    components.forEach((comp, index) => {
      const row = document.createElement('tr');
      row.dataset.index = index;
      row.innerHTML = `
        <td>${comp.ComponentID || comp.componentID || comp.ComponentId || '-'}</td>
        <td>${comp.TrxBranchID || comp.trxBranchID || comp.TrxBranchId || '-'}</td>
        <td>${comp.AccountTypeID || comp.accountTypeID || comp.AccountTypeId || '-'}</td>
        <td>${comp.AccountID || comp.accountID || comp.AccountId || '-'}</td>
      `;
      tbody.appendChild(row);
    });
    
    console.log(`[AccountClosing] Populated Components grid with ${components.length} rows`);
  };

  // ============================================================================
  // FORMATTING UTILITIES
  // ============================================================================
  const formatMoney = (value) => {
    if (value === null || value === undefined || value === '') return '';
    const num = parseFloat(String(value).replace(/,/g, ''));
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const formatDate = (value) => {
    if (!value) return '';
    // Use GlobalUtils if available
    if (window.GlobalUtils?.formatDate) {
      return window.GlobalUtils.formatDate(value);
    }
    // Fallback formatting
    try {
      const date = new Date(value);
      return date.toLocaleDateString('en-GB');
    } catch {
      return value;
    }
  };

  // ============================================================================
  // BALANCE AND UNPOSTED AMOUNT MANAGEMENT
  // ============================================================================
  
  /**
   * Update Balance Amount and Unposted Amount fields on Transaction Details tab
   */
  const updateBalanceAndUnpostedFields = () => {
    const balanceAmountField = document.getElementById('balanceAmount');
    const unpostedAmountField = document.getElementById('unpostedAmount');
    
    if (balanceAmountField) {
      balanceAmountField.value = formatMoney(state.originalBalance);
    }
    if (unpostedAmountField) {
      unpostedAmountField.value = formatMoney(state.unpostedAmount);
    }
    
    console.log('[AccountClosing] Balance:', state.originalBalance, 'Unposted:', state.unpostedAmount);
  };

  /**
   * Update save button state based on unposted amount
   * Save button is disabled when unposted amount > 0
   */
  const updateSaveButtonState = () => {
    const saveBtn = document.querySelector('[data-action="save"]');
    if (saveBtn) {
      const hasUnposted = state.unpostedAmount > 0;
      saveBtn.disabled = hasUnposted;
      
      if (hasUnposted) {
        saveBtn.title = `Cannot save - Unposted amount: ${formatMoney(state.unpostedAmount)}`;
      } else {
        saveBtn.title = 'Save account closing';
      }
    }
  };

  // ============================================================================
  // CONFIRMATION DIALOG
  // ============================================================================
  const confirmDialog = async (title = 'Confirm', message = 'Do you want to close this account?') => {
    if (window.showConfirmationDialog) {
      return window.showConfirmationDialog(title, message, 'primary');
    }
    return window.confirm(message);
  };

  const confirmAndLoad = async () => {
    const ok = await confirmDialog('Confirm', 'Do you want to close this account?');
    if (!ok) {
      showMessage('Account closing cancelled.', 'info');
      postClose();
      return;
    }
    await loadClosingDetails();
  };

  // ============================================================================
  // SAVE FUNCTIONALITY
  // ============================================================================
  
  /**
   * Build XML string from transaction details array
   * Format: <dt_TransactionBackOffice>...</dt_TransactionBackOffice>
   * @param {Array} transactions - Array of transaction objects
   * @returns {string} XML string
   */
  const buildTransactionXml = (transactions) => {
    if (!transactions || transactions.length === 0) {
      return '';
    }
    
    const xmlParts = transactions.map(txn => {
      // Escape XML special characters
      const escapeXml = (str) => {
        if (str === null || str === undefined) return '';
        return String(str)
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&apos;');
      };
      
      return `<dt_TransactionBackOffice>` +
        `<AccountTypeID>${escapeXml(txn.accountTypeId || 'C')}</AccountTypeID>` +
        `<AccountID>${escapeXml(txn.accountId)}</AccountID>` +
        `<TrxTypeID>${escapeXml(txn.trxTypeId)}</TrxTypeID>` +
        `<Amount>${txn.amount || 0}</Amount>` +
        `<LocalAmount>${txn.localAmount || txn.amount || 0}</LocalAmount>` +
        `<ExchangeRate>${txn.exchangeRate || 1}</ExchangeRate>` +
        `<TrxDescriptionID>${escapeXml(txn.trxDescriptionId)}</TrxDescriptionID>` +
        `<TrxDescription>${escapeXml(txn.trxDescription)}</TrxDescription>` +
        `<EntryType>${escapeXml(txn.entryType || 'S')}</EntryType>` +
        `<DbtTrxAmt>${txn.dbtTrxAmt || 0}</DbtTrxAmt>` +
        `</dt_TransactionBackOffice>`;
    });
    
    return xmlParts.join('');
  };

  /**
   * Save account closing details using accountservice
   * @param {Object} payload - Save payload
   * @returns {Promise<Object>} API response
   */
  const saveClosingDetails = async (payload) => {
    const svc = window.accountservice || window.AccountService || window.parent?.accountservice;
    if (!svc?.saveAccountClosing) {
      throw new Error('accountservice.saveAccountClosing not available');
    }
    
    console.log('[AccountClosing] Calling p_AddAcClosingDetails with:', payload);
    return svc.saveAccountClosing(payload);
  };

  // ============================================================================
  // LOOKUP BUTTON HANDLERS
  // ============================================================================
  
  // SearchModal instance for account search
  let accountSearchModal = null;

  /**
   * Get the tableID for Account search based on Account Type selection
   * Customer/C = AccountCrTrxAllowID
   * General Ledger/G = GLCrTrxAllowID
   * Both/B = AccountCrTrxAllowID
   */
  const getAccountSearchTableID = () => {
    const accountTypeSelect = document.getElementById('accountType');
    const accountType = accountTypeSelect?.value || '';
    
    // Map account type to tableID
    if (accountType === 'G' || accountType.toLowerCase() === 'general ledger') {
      return 'GLCrTrxAllowID';
    }
    // Default to AccountCrTrxAllowID for Customer (C), Both (B), or empty
    return 'AccountCrTrxAllowID';
  };

  /**
   * Custom search function for Account search using p_GetSearchResult
   * Builds the exact payload format required
   */
  const accountSearchFn = async (payload, config) => {
    const Environment = window.Environment || {};
    const CoreApi = window.CoreApi;
    
    const BASE_URL = (Environment.baseUrlCommon || '').replace(/\/+$/, '');
    const SEARCH_ENDPOINT = `${BASE_URL}/api/OldAPI`;
    
    // Build request in exact format
    const requestId = `p_GetSearchResult_${Date.now()}`;
    const requestTime = new Date().toISOString().split('.')[0]; // Format: 2026-01-17T09:48:37
    
    const envelope = {
      RequestID: requestId,
      FormID: 'p_GetSearchResult',
      RequestData: {
        TableID: payload.TableID,
        AdvFilterString: payload.AdvFilterString || '',
        WhereStmt: payload.WhereStmt || '',
        PrevOrNext: payload.PrevOrNext || '1',
        RefID: payload.RefID || '',
        OperatorID: payload.OperatorID || 'web_portal',
        ModuleID: 1000,
        OurBranchID: payload.OurBranchID || state.context.OurBranchID || '002'
      },
      RequestTime: requestTime,
      AppName: 'CLIENT_DATA',
      Checksum: ''
    };
    
    console.log('[AccountClosing] Account search request:', envelope);
    
    return CoreApi.post(SEARCH_ENDPOINT, envelope);
  };

  /**
   * Initialize the account search modal
   */
  const initAccountSearchModal = () => {
    if (accountSearchModal) return;
    
    // Get session info for search
    const getOperatorId = () => {
      const session = window.parent?.AuthService?.getSession?.() || window.AuthService?.getSession?.();
      return session?.operatorID || session?.OperatorID || 'web_portal';
    };
    
    const getOurBranchId = () => {
      return state.context.OurBranchID || '002';
    };

    accountSearchModal = new window.SearchModal({
      prefix: 'account-closing-acct',
      moduleID: 1000,
      getOperatorId,
      getOurBranchId,
      searchFn: accountSearchFn,
      onError: (err) => {
        console.error('[AccountClosing] Search error:', err);
        showMessage('Search failed: ' + (err?.message || err), 'error');
      }
    });
  };

  /**
   * Open Account ID search modal
   */
  const openAccountSearch = async () => {
    initAccountSearchModal();
    
    const tableID = getAccountSearchTableID();
    console.log('[AccountClosing] Opening Account search with tableID:', tableID);
    
    const config = {
      tableID: tableID,
      title: 'Search Account',
      searchFields: [
        { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: '' },
        { name: 'Description', label: 'Description', column: 'Description', value: '' }
      ],
      // Don't provide displayFields - let it dynamically show all columns from API response
      // displayFields: null means SearchModal will auto-generate columns from result keys
      onSelect: (row) => {
        // Populate the form fields with selected account
        const accountIdField = document.getElementById('txnAccountId');
        const accountNameField = document.getElementById('txnAccountName');
        const productIdField = document.getElementById('productId');
        const currencyIdField = document.getElementById('currencyId');
        
        if (accountIdField) {
          accountIdField.value = row.AccountID || row.accountID || '';
        }
        if (accountNameField) {
          // Use Description field from response as Account Name
          accountNameField.value = row.Description || row.AccountName || row.accountName || row.Name || '';
        }
        // Populate Product ID from the selected account (view-only field)
        // For GL accounts, use 'GL' as the default ProductID
        if (productIdField) {
          const accountType = document.getElementById('accountType')?.value || '';
          if (accountType === 'G' || accountType.toLowerCase() === 'general ledger') {
            productIdField.value = 'GL';
          } else {
            productIdField.value = row.ProductID || row.productID || row.productId || '';
          }
        }
        // Populate Currency ID from the selected account (view-only field)
        if (currencyIdField) {
          currencyIdField.value = row.CurrencyID || row.currencyID || row.currencyId || '';
        }
        
        console.log('[AccountClosing] Account selected:', row);
        showMessage('Account selected: ' + (row.AccountID || row.accountID), 'success');
      }
    };
    
    await accountSearchModal.open(config);
  };

  // ============================================================================
  // PAYABLE AT (BRANCH) SEARCH
  // ============================================================================
  
  let branchSearchModal = null;

  /**
   * Custom search function for Branch search using p_GetSearchResult
   * TableID: ClearingBranchID
   */
  const branchSearchFn = async (payload, config) => {
    const Environment = window.Environment || {};
    const CoreApi = window.CoreApi;
    
    const BASE_URL = (Environment.baseUrlCommon || '').replace(/\/+$/, '');
    const SEARCH_ENDPOINT = `${BASE_URL}/api/OldAPI`;
    
    const requestId = `p_GetSearchResult_${Date.now()}`;
    const requestTime = new Date().toISOString().split('.')[0];
    
    const envelope = {
      RequestID: requestId,
      FormID: 'p_GetSearchResult',
      RequestData: {
        TableID: 'ClearingBranchID',
        AdvFilterString: payload.AdvFilterString || '',
        WhereStmt: payload.WhereStmt || '',
        PrevOrNext: payload.PrevOrNext || '1',
        RefID: payload.RefID || '',
        OperatorID: payload.OperatorID || 'web_portal',
        ModuleID: 1000,
        OurBranchID: payload.OurBranchID || state.context.OurBranchID || '002'
      },
      RequestTime: requestTime,
      AppName: 'CLIENT_DATA',
      Checksum: ''
    };
    
    console.log('[AccountClosing] Branch search request:', envelope);
    
    return CoreApi.post(SEARCH_ENDPOINT, envelope);
  };

  /**
   * Initialize the branch search modal
   */
  const initBranchSearchModal = () => {
    if (branchSearchModal) return;
    
    const getOperatorId = () => {
      const session = window.parent?.AuthService?.getSession?.() || window.AuthService?.getSession?.();
      return session?.operatorID || session?.OperatorID || 'web_portal';
    };
    
    const getOurBranchId = () => {
      return state.context.OurBranchID || '002';
    };

    branchSearchModal = new window.SearchModal({
      prefix: 'account-closing-branch',
      moduleID: 1000,
      getOperatorId,
      getOurBranchId,
      searchFn: branchSearchFn,
      onError: (err) => {
        console.error('[AccountClosing] Branch search error:', err);
        showMessage('Search failed: ' + (err?.message || err), 'error');
      }
    });
  };

  /**
   * Open Payable At (Branch) search modal
   */
  const openBranchSearch = async () => {
    initBranchSearchModal();
    
    console.log('[AccountClosing] Opening Branch search with tableID: ClearingBranchID');
    
    const config = {
      tableID: 'ClearingBranchID',
      title: 'Search Branch',
      searchFields: [
        { name: 'BranchID', label: 'Branch ID', column: 'BranchID', value: '' },
        { name: 'BranchName', label: 'Branch Name', column: 'BranchName', value: '' }
      ],
      // Dynamic display - let SearchModal auto-generate columns from API response
      onSelect: (row) => {
        const payableAtField = document.getElementById('payableAt');
        const payableAtNameField = document.getElementById('payableAtName');
        
        if (payableAtField) {
          payableAtField.value = row.BranchID || row.branchID || '';
        }
        if (payableAtNameField) {
          payableAtNameField.value = row.BranchName || row.branchName || row.Description || row.Name || '';
        }
        
        console.log('[AccountClosing] Branch selected:', row);
        showMessage('Branch selected: ' + (row.BranchID || row.branchID), 'success');
      }
    };
    
    await branchSearchModal.open(config);
  };

  // ============================================================================
  // TRANSACTION ID SEARCH (pc_TrxDescriptions)
  // ============================================================================
  
  let trxSearchModal = null;
  let trxDescriptionsCache = null; // Cache the results since they don't change often

  /**
   * Fetch Transaction Descriptions using pc_TrxDescriptions
   * @param {string} bankID - Bank ID (default: "00")
   * @returns {Promise<Array>} Array of transaction descriptions
   */
  const fetchTransactionDescriptions = async (bankID = '00') => {
    // Return cached results if available
    if (trxDescriptionsCache) {
      return trxDescriptionsCache;
    }

    const Environment = window.Environment || {};
    const CoreApi = window.CoreApi;
    
    const BASE_URL = (Environment.baseUrlCommon || '').replace(/\/+$/, '');
    const ENDPOINT = `${BASE_URL}/api/OldAPI`;
    
    const payload = {
      BankID: bankID
    };
    
    const envelope = CoreApi.makeRequestEnvelope('dbo.pc_TrxDescriptions', payload);
    console.log('[AccountClosing] Transaction Descriptions request:', envelope);
    
    const response = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    
    const raw = await response.json();
    console.log('[AccountClosing] Transaction Descriptions raw response:', raw);
    
    // Return Details array which contains the transaction descriptions
    if (raw && Array.isArray(raw.Details)) {
      trxDescriptionsCache = raw.Details;
      return raw.Details;
    }
    return [];
  };

  /**
   * Custom search function for Transaction ID search
   * Uses pc_TrxDescriptions SP with BankID='00'
   */
  const trxSearchFn = async (payload, config) => {
    try {
      const data = await fetchTransactionDescriptions('00');
      
      // Filter results if search criteria provided
      let filtered = data;
      if (payload.WhereStmt || payload.AdvFilterString) {
        const searchTerm = (payload.WhereStmt || payload.AdvFilterString || '').toLowerCase();
        if (searchTerm) {
          filtered = data.filter(row => {
            return Object.values(row).some(val => 
              val && String(val).toLowerCase().includes(searchTerm)
            );
          });
        }
      }
      
      // Return in the expected format
      return { Details: filtered };
    } catch (err) {
      console.error('[AccountClosing] Transaction search error:', err);
      throw err;
    }
  };

  /**
   * Initialize the Transaction ID search modal
   */
  const initTrxSearchModal = () => {
    if (trxSearchModal) return;
    
    const getOperatorId = () => {
      const session = window.parent?.AuthService?.getSession?.() || window.AuthService?.getSession?.();
      return session?.operatorID || session?.OperatorID || 'web_portal';
    };
    
    const getOurBranchId = () => {
      return state.context.OurBranchID || '002';
    };

    trxSearchModal = new window.SearchModal({
      prefix: 'account-closing-trx',
      moduleID: 1000,
      getOperatorId,
      getOurBranchId,
      searchFn: trxSearchFn,
      onError: (err) => {
        console.error('[AccountClosing] Transaction search error:', err);
        showMessage('Search failed: ' + (err?.message || err), 'error');
      }
    });
  };

  /**
   * Open Transaction ID search modal
   */
  const openTrxSearch = async () => {
    initTrxSearchModal();
    
    console.log('[AccountClosing] Opening Transaction ID search (pc_TrxDescriptions)');
    
    const config = {
      tableID: 'TrxDescriptions',
      title: 'Search Transaction Type',
      searchFields: [
        { name: 'TrxDescriptionID', label: 'Transaction ID', column: 'TrxDescriptionID', value: '' },
        { name: 'Description', label: 'Description', column: 'Description', value: '' }
      ],
      // Dynamic display - let SearchModal auto-generate columns from API response
      onSelect: (row) => {
        const trxIdField = document.getElementById('transactionId');
        const trxNameField = document.getElementById('transactionIdName');
        
        if (trxIdField) {
          // Use TrxDescriptionID as the ID (e.g., '001', '002', '003')
          trxIdField.value = row.TrxDescriptionID || row.trxDescriptionID || '';
        }
        if (trxNameField) {
          trxNameField.value = row.Description || row.description || row.TrxDescription || '';
        }
        
        console.log('[AccountClosing] Transaction selected:', row);
        showMessage('Transaction selected: ' + (row.TrxDescriptionID || row.trxDescriptionID), 'success');
      }
    };
    
    await trxSearchModal.open(config);
  };

  const initLookupButtons = () => {
    document.querySelectorAll('[data-lookup]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const targetId = btn.getAttribute('data-lookup') || '';
        
        // Handle Account ID search
        if (targetId === 'txnAccountId') {
          openAccountSearch();
          return;
        }
        
        // Handle Payable At (Branch) search
        if (targetId === 'payableAt') {
          openBranchSearch();
          return;
        }
        
        // Handle Transaction ID search (pc_TrxDescriptions)
        if (targetId === 'transactionId') {
          openTrxSearch();
          return;
        }
        
        // For other lookups, just focus for now
        const targetInput = document.getElementById(targetId);
        if (targetInput) {
          targetInput.focus();
          console.log(`[AccountClosing] Lookup for: ${targetId}`);
        }
      });
    });
  };

  // ============================================================================
  // TYPE AND TAB LOOKUP HANDLERS
  // ============================================================================

  /**
   * Lookup Account by typed value (on blur/tab)
   * Searches for exact match and populates Account Name and Product ID
   */
  const lookupAccountByValue = async (typedValue) => {
    if (!typedValue || !typedValue.trim()) {
      // Clear related fields if input is empty
      document.getElementById('txnAccountName').value = '';
      document.getElementById('productId').value = '';
      return;
    }

    const searchValue = typedValue.trim();
    const tableID = getAccountSearchTableID();
    
    try {
      const result = await accountSearchFn({
        TableID: tableID,
        WhereStmt: searchValue,
        AdvFilterString: '',
        PrevOrNext: '1',
        RefID: '',
        OperatorID: 'web_portal',
        OurBranchID: state.context.OurBranchID || '002'
      });
      
      const details = result?.Details || [];
      console.log('[AccountClosing] Account lookup result:', details);
      
      // Find exact match by AccountID
      const match = details.find(row => 
        (row.AccountID || row.accountID || '').toUpperCase() === searchValue.toUpperCase()
      );
      
      if (match) {
        document.getElementById('txnAccountName').value = match.Description || match.AccountName || match.accountName || match.Name || '';
        // For GL accounts, use 'GL' as the default ProductID
        const accountType = document.getElementById('accountType')?.value || '';
        if (accountType === 'G' || accountType.toLowerCase() === 'general ledger') {
          document.getElementById('productId').value = 'GL';
        } else {
          document.getElementById('productId').value = match.ProductID || match.productID || match.productId || '';
        }
        document.getElementById('currencyId').value = match.CurrencyID || match.currencyID || match.currencyId || '';
        showMessage('Account found: ' + (match.Description || match.AccountID), 'success');
      } else if (details.length === 1) {
        // If only one result, use it
        const row = details[0];
        document.getElementById('txnAccountId').value = row.AccountID || row.accountID || '';
        document.getElementById('txnAccountName').value = row.Description || row.AccountName || row.accountName || row.Name || '';
        // For GL accounts, use 'GL' as the default ProductID
        const accountType = document.getElementById('accountType')?.value || '';
        if (accountType === 'G' || accountType.toLowerCase() === 'general ledger') {
          document.getElementById('productId').value = 'GL';
        } else {
          document.getElementById('productId').value = row.ProductID || row.productID || row.productId || '';
        }
        document.getElementById('currencyId').value = row.CurrencyID || row.currencyID || row.currencyId || '';
        showMessage('Account found: ' + (row.Description || row.AccountID), 'success');
      } else if (details.length > 1) {
        showMessage('Multiple accounts found - use search to select', 'warning');
      } else {
        document.getElementById('txnAccountName').value = '';
        document.getElementById('productId').value = '';
        document.getElementById('currencyId').value = '';
        showMessage('Account not found', 'warning');
      }
    } catch (err) {
      console.error('[AccountClosing] Account lookup error:', err);
      showMessage('Account lookup failed', 'error');
    }
  };

  /**
   * Lookup Branch by typed value (on blur/tab)
   * Searches for exact match and populates Branch Name
   */
  const lookupBranchByValue = async (typedValue) => {
    if (!typedValue || !typedValue.trim()) {
      document.getElementById('payableAtName').value = '';
      return;
    }

    const searchValue = typedValue.trim();
    
    try {
      const result = await branchSearchFn({
        WhereStmt: searchValue,
        AdvFilterString: '',
        PrevOrNext: '1',
        RefID: '',
        OperatorID: 'web_portal',
        OurBranchID: state.context.OurBranchID || '002'
      });
      
      const details = result?.Details || [];
      console.log('[AccountClosing] Branch lookup result:', details);
      
      // Find exact match by BranchID
      const match = details.find(row => 
        (row.BranchID || row.branchID || '').toUpperCase() === searchValue.toUpperCase()
      );
      
      if (match) {
        document.getElementById('payableAtName').value = match.BranchName || match.branchName || match.Description || match.Name || '';
        showMessage('Branch found: ' + (match.BranchName || match.BranchID), 'success');
      } else if (details.length === 1) {
        const row = details[0];
        document.getElementById('payableAt').value = row.BranchID || row.branchID || '';
        document.getElementById('payableAtName').value = row.BranchName || row.branchName || row.Description || row.Name || '';
        showMessage('Branch found: ' + (row.BranchName || row.BranchID), 'success');
      } else if (details.length > 1) {
        showMessage('Multiple branches found - use search to select', 'warning');
      } else {
        document.getElementById('payableAtName').value = '';
        showMessage('Branch not found', 'warning');
      }
    } catch (err) {
      console.error('[AccountClosing] Branch lookup error:', err);
      showMessage('Branch lookup failed', 'error');
    }
  };

  /**
   * Lookup Transaction by typed value (on blur/tab)
   * Searches for exact match and populates Transaction Description
   */
  const lookupTransactionByValue = async (typedValue) => {
    if (!typedValue || !typedValue.trim()) {
      document.getElementById('transactionIdName').value = '';
      return;
    }

    const searchValue = typedValue.trim();
    
    try {
      const data = await fetchTransactionDescriptions('00');
      console.log('[AccountClosing] Transaction lookup data:', data);
      
      // Find exact match by TrxDescriptionID
      const match = data.find(row => 
        (row.TrxDescriptionID || row.trxDescriptionID || '').toUpperCase() === searchValue.toUpperCase()
      );
      
      if (match) {
        document.getElementById('transactionIdName').value = match.Description || match.description || match.TrxDescription || '';
        showMessage('Transaction found: ' + (match.Description || match.TrxDescriptionID), 'success');
      } else {
        document.getElementById('transactionIdName').value = '';
        showMessage('Transaction ID not found', 'warning');
      }
    } catch (err) {
      console.error('[AccountClosing] Transaction lookup error:', err);
      showMessage('Transaction lookup failed', 'error');
    }
  };

  /**
   * Setup type-and-tab listeners for search fields
   * When user types a value and tabs out, lookup and populate related fields
   */
  const setupTypeAndTabListeners = () => {
    // Account ID type and tab
    const txnAccountId = document.getElementById('txnAccountId');
    if (txnAccountId) {
      txnAccountId.addEventListener('blur', (e) => {
        const value = e.target.value;
        if (value && value.trim()) {
          lookupAccountByValue(value);
        }
      });
    }

    // Payable At type and tab
    const payableAt = document.getElementById('payableAt');
    if (payableAt) {
      payableAt.addEventListener('blur', (e) => {
        const value = e.target.value;
        if (value && value.trim()) {
          lookupBranchByValue(value);
        }
      });
    }

    // Transaction ID type and tab
    const transactionId = document.getElementById('transactionId');
    if (transactionId) {
      transactionId.addEventListener('blur', (e) => {
        const value = e.target.value;
        if (value && value.trim()) {
          lookupTransactionByValue(value);
        }
      });
    }
    
    console.log('[AccountClosing] Type-and-tab listeners initialized');
  };

  // ============================================================================
  // TRANSACTION TOOLBAR HANDLERS
  // ============================================================================
  const initTransactionToolbar = () => {
    const actions = ['txnNew', 'txnAlter', 'txnRemove', 'txnUpdate', 'txnClear'];
    
    actions.forEach(action => {
      const btn = document.querySelector(`[data-action="${action}"]`);
      if (btn) {
        btn.addEventListener('click', () => {
          console.log(`[AccountClosing] Transaction action: ${action}`);
          
          switch (action) {
            case 'txnNew':
              clearTransactionForm();
              setTransactionFieldsEnabled(true);
              showMessage('Ready to add new transaction - Fill in details and click Update', 'info');
              break;
            case 'txnAlter':
              showMessage('Select a transaction to alter', 'info');
              break;
            case 'txnRemove':
              removeSelectedTransaction();
              break;
            case 'txnUpdate':
              addTransactionToGrid();
              break;
            case 'txnClear':
              clearTransactionForm();
              setTransactionFieldsEnabled(false);
              showMessage('Transaction form cleared', 'info');
              break;
          }
        });
      }
    });
  };

  /**
   * Initialize click listeners on transaction detail fields to show message when clicked while disabled
   * Note: Disabled elements don't receive click events, so we listen on parent wrappers and labels
   */
  const initDisabledFieldClickListeners = () => {
    // Listen on the entire transaction tab content for clicks
    const transactionTab = document.getElementById('transaction');
    if (!transactionTab) return;
    
    transactionTab.addEventListener('click', (e) => {
      const target = e.target;
      
      // Check if clicking on a label for a transaction field
      if (target.tagName === 'LABEL') {
        const forId = target.getAttribute('for');
        if (forId && transactionDetailsFields.includes(forId)) {
          const field = document.getElementById(forId);
          if (field && field.disabled) {
            showMessage('Please click "New" to enter transaction details', 'info');
            return;
          }
        }
      }
      
      // Check if clicking on a wrapper (.col) containing a disabled field
      const col = target.closest('.col');
      if (col) {
        const field = col.querySelector('input, select, textarea');
        if (field && field.disabled && transactionDetailsFields.includes(field.id)) {
          showMessage('Please click "New" to enter transaction details', 'info');
          return;
        }
      }
    });
    
    console.log('[AccountClosing] Disabled field click listeners initialized');
  };

  /**
   * Add current transaction form data to the transaction grid
   * Also auto-generates a corresponding TD (Transfer Debit) transaction for the main account
   */
  const addTransactionToGrid = () => {
    // Get values from form
    const transactionType = document.getElementById('transactionType');
    const accountType = document.getElementById('accountType');
    const txnAccountId = document.getElementById('txnAccountId');
    const transactionAmount = document.getElementById('transactionAmount');
    const localAmount = document.getElementById('localAmount');
    const exchangeRate = document.getElementById('exchangeRate');
    const transactionId = document.getElementById('transactionId');
    const transactionIdName = document.getElementById('transactionIdName');
    const narration = document.getElementById('narration');
    const till = document.getElementById('till');
    const productId = document.getElementById('productId');
    const currencyId = document.getElementById('currencyId');
    const referenceNo = document.getElementById('referenceNo');
    const beneficiaryName = document.getElementById('beneficiaryName');
    
    // Validate required fields
    if (!transactionType?.value) {
      showMessage('Please select a Transaction Type', 'warning');
      return;
    }
    if (!txnAccountId?.value) {
      showMessage('Please enter an Account ID', 'warning');
      return;
    }
    if (!transactionAmount?.value) {
      showMessage('Please enter a Transaction Amount', 'warning');
      return;
    }
    
    // Get display values
    const typeText = transactionType.options[transactionType.selectedIndex]?.text || transactionType.value;
    const accountTypeText = accountType?.value || 'C';
    const accountText = txnAccountId.value;
    const amountText = transactionAmount.value;
    const narrationText = narration?.value || '';
    const tillText = till?.value || '';
    const productIdText = productId?.value || '';
    const currencyIdText = currencyId?.value || '';
    const referenceNoText = referenceNo?.value || '';
    const beneficiaryNameText = beneficiaryName?.value || '';
    const trxDescriptionText = transactionIdName?.value || transactionId?.value || '';
    
    // Parse amounts - remove commas and convert to numbers
    const amount = parseFloat((transactionAmount?.value || '0').replace(/,/g, '')) || 0;
    const localAmt = parseFloat((localAmount?.value || transactionAmount?.value || '0').replace(/,/g, '')) || amount;
    const exchRate = parseFloat((exchangeRate?.value || '1').replace(/,/g, '')) || 1;
    
    // Get grid and tbody references
    const grid = document.getElementById('transactionGrid');
    const tbody = grid?.querySelector('tbody');
    
    // Remove empty state row if present
    if (tbody) {
      const emptyRow = tbody.querySelector('tr.text-center.text-muted');
      if (emptyRow) {
        emptyRow.remove();
      }
    }
    
    // =========================================================================
    // 1. First, add the TD (Transfer Debit) row for the main account
    // =========================================================================
    const mainAccountTxnData = {
      accountTypeId: 'C', // Customer account
      accountId: state.context.AccountID,
      tillId: tillText,
      trxTypeId: 'TD', // Transfer Debit
      trxTypeText: 'TD',
      productId: state.context.ProductID || productIdText,
      currencyId: state.context.CurrencyID || currencyIdText,
      creditAmount: 0,
      debitAmount: amount,
      amount: amount,
      localAmount: localAmt,
      exchangeRate: exchRate,
      referenceNo: referenceNoText,
      beneficiaryName: '',
      trxDescriptionId: transactionId?.value || '',
      trxDescription: trxDescriptionText,
      entryType: 'S',
      dbtTrxAmt: amount,
      profit: 0,
      remarks: narrationText
    };
    state.transactionDetails.push(mainAccountTxnData);
    
    // Add TD row to grid
    if (tbody) {
      const tdRow = document.createElement('tr');
      tdRow.dataset.index = state.transactionDetails.length - 1;
      tdRow.innerHTML = `
        <td>C</td>
        <td>${state.context.AccountID}</td>
        <td>${tillText}</td>
        <td>TD</td>
        <td>${state.context.ProductID || productIdText}</td>
        <td>${state.context.CurrencyID || currencyIdText}</td>
        <td class="text-right">0.00</td>
        <td class="text-right">${formatMoney(amount)}</td>
        <td class="text-right">${formatMoney(amount)}</td>
        <td class="text-right">${formatMoney(localAmt)}</td>
        <td class="text-right">${formatMoney(exchRate)}</td>
        <td>${referenceNoText}</td>
        <td></td>
        <td>${trxDescriptionText}</td>
        <td class="text-right">0</td>
        <td>${narrationText}</td>
      `;
      
      tdRow.addEventListener('click', () => {
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        tdRow.classList.add('selected');
        state.selectedTransactionIndex = parseInt(tdRow.dataset.index, 10);
      });
      
      tbody.appendChild(tdRow);
    }
    
    // =========================================================================
    // 2. Then, add the TC (Transfer Credit) row for the user-entered account
    // =========================================================================
    const userTxnData = {
      accountTypeId: accountTypeText,
      accountId: txnAccountId.value,
      tillId: tillText,
      trxTypeId: 'TC', // Transfer Credit
      trxTypeText: 'TC',
      productId: productIdText,
      currencyId: currencyIdText,
      creditAmount: amount,
      debitAmount: 0,
      amount: amount,
      localAmount: localAmt,
      exchangeRate: exchRate,
      referenceNo: referenceNoText,
      beneficiaryName: beneficiaryNameText,
      trxDescriptionId: transactionId?.value || '',
      trxDescription: trxDescriptionText,
      entryType: 'U',
      dbtTrxAmt: 0,
      profit: 0,
      remarks: narrationText
    };
    state.transactionDetails.push(userTxnData);
    
    // Add TC row to grid
    if (tbody) {
      const tcRow = document.createElement('tr');
      tcRow.dataset.index = state.transactionDetails.length - 1;
      tcRow.innerHTML = `
        <td>${accountTypeText}</td>
        <td>${accountText}</td>
        <td>${tillText}</td>
        <td>TC</td>
        <td>${productIdText}</td>
        <td>${currencyIdText}</td>
        <td class="text-right">${formatMoney(amount)}</td>
        <td class="text-right">0.00</td>
        <td class="text-right">${formatMoney(amount)}</td>
        <td class="text-right">${formatMoney(localAmt)}</td>
        <td class="text-right">${formatMoney(exchRate)}</td>
        <td>${referenceNoText}</td>
        <td>${beneficiaryNameText}</td>
        <td>${trxDescriptionText}</td>
        <td class="text-right">0</td>
        <td>${narrationText}</td>
      `;
      
      tcRow.addEventListener('click', () => {
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        tcRow.classList.add('selected');
        state.selectedTransactionIndex = parseInt(tcRow.dataset.index, 10);
      });
      
      tbody.appendChild(tcRow);
    }
    
    // Clear form and disable fields
    clearTransactionForm();
    setTransactionFieldsEnabled(false);
    
    // Update unposted amount (subtract transaction amount)
    state.unpostedAmount = Math.max(0, state.unpostedAmount - amount);
    updateBalanceAndUnpostedFields();
    updateSaveButtonState();
    
    showMessage('Transaction added to grid (TD + TC pair)', 'success');
    console.log('[AccountClosing] TD transaction added:', mainAccountTxnData);
    console.log('[AccountClosing] TC transaction added:', userTxnData);
  };

  /**
   * Remove selected transaction from grid
   * Note: TD/TC pairs are generated together, so when removing:
   * - Only add amount back to unposted when removing TD (debit) transactions
   * - TC (credit) transactions don't affect unposted amount tracking
   */
  const removeSelectedTransaction = () => {
    if (state.selectedTransactionIndex === undefined || state.selectedTransactionIndex === null) {
      showMessage('Please select a transaction to remove', 'warning');
      return;
    }
    
    // Get the transaction being removed
    const removedTransaction = state.transactionDetails[state.selectedTransactionIndex];
    const removedAmount = removedTransaction?.amount || 0;
    const trxType = removedTransaction?.trxTypeId || '';
    
    const grid = document.getElementById('transactionGrid');
    const tbody = grid?.querySelector('tbody');
    const selectedRow = tbody?.querySelector(`tr[data-index="${state.selectedTransactionIndex}"]`);
    
    if (selectedRow) {
      selectedRow.remove();
      state.transactionDetails.splice(state.selectedTransactionIndex, 1);
      state.selectedTransactionIndex = null;
      
      // Only add amount back to unposted when removing TD (debit) transactions
      // TD/TC pairs share the same amount, only subtract once when adding
      if (trxType === 'TD') {
        state.unpostedAmount = Math.min(state.originalBalance, state.unpostedAmount + removedAmount);
        updateBalanceAndUnpostedFields();
        updateSaveButtonState();
      }
      
      // Re-index remaining rows
      tbody.querySelectorAll('tr').forEach((row, index) => {
        row.dataset.index = index;
      });
      
      // Show empty state if no rows left
      if (state.transactionDetails.length === 0) {
        tbody.innerHTML = `
          <tr class="text-center text-muted">
            <td colspan="16">No records to display.</td>
          </tr>
        `;
      }
      
      showMessage('Transaction removed', 'info');
    }
  };

  const clearTransactionForm = () => {
    // Fields to clear (excluding balanceAmount and unpostedAmount which are computed)
    const txnFields = [
      'transactionType', 'till',
      'typeOfService', 'referenceNo', 'accountType', 'currencyId',
      'txnAccountId', 'txnAccountName', 'productId',
      'chequeId', 'payableAt', 'payableAtName',
      'forexGainLoss', 'beneficiaryName', 'transactionId', 'transactionIdName',
      'transactionAmount', 'localAmount', 'narration'
    ];
    
    txnFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        } else {
          el.value = '';
        }
      }
    });
    
    // Reset exchange rate to default value of 1
    const exchangeRateField = document.getElementById('exchangeRate');
    if (exchangeRateField) {
      exchangeRateField.value = '1';
    }
  };

  /**
   * Clear all form fields after successful save
   * Includes Account Details, Transaction form, and grids
   */
  const clearAllFields = () => {
    // Clear Account Details fields
    const accountDetailsFields = [
      'reason', 'remarks', 'balance', 'penalInterestReceivable',
      'creditInterestPayable', 'taxAmount', 'debitInterestReceivable',
      'closingCharges', 'netPayable'
    ];
    
    accountDetailsFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        if (el.tagName === 'SELECT') {
          el.selectedIndex = 0;
        } else {
          el.value = '';
        }
      }
    });
    
    // Clear transaction form fields
    clearTransactionForm();
    
    // Clear balance and unposted amount fields
    const balanceAmountField = document.getElementById('balanceAmount');
    const unpostedAmountField = document.getElementById('unpostedAmount');
    if (balanceAmountField) balanceAmountField.value = '';
    if (unpostedAmountField) unpostedAmountField.value = '';
    
    // Clear transaction grid
    const transactionGridBody = document.querySelector('#transactionGrid tbody');
    if (transactionGridBody) {
      transactionGridBody.innerHTML = `
        <tr class="text-center text-muted">
          <td colspan="4">No transactions added</td>
        </tr>
      `;
    }
    
    // Clear components grid
    const componentsGridBody = document.getElementById('componentsGridBody');
    if (componentsGridBody) {
      componentsGridBody.innerHTML = `
        <tr class="text-center text-muted">
          <td colspan="5">No components to display</td>
        </tr>
      `;
    }
    
    // Clear transaction state and balance state
    state.transactionDetails = [];
    state.selectedTransactionIndex = null;
    state.originalBalance = 0;
    state.unpostedAmount = 0;
    
    // Clear audit fields
    const auditFields = ['MakerID', 'MakerDT', 'CheckerID', 'CheckerDT', 'ModifierID', 'ModifierDT'];
    auditFields.forEach(id => {
      const el = document.getElementById(id);
      if (el) el.textContent = '-';
    });
    
    console.log('[AccountClosing] All fields cleared');
  };

  // ============================================================================
  // ACTION BUTTON HANDLERS
  // ============================================================================
  const initActionButtons = () => {
    // Close button
    document.querySelector('[data-action="close"]')?.addEventListener('click', postClose);
    
    // View button
    document.querySelector('[data-action="view"]')?.addEventListener('click', async () => {
      await loadClosingDetails();
    });
    
    // Add button
    document.querySelector('[data-action="add"]')?.addEventListener('click', () => {
      setFormMode('ADD');
    });
    
    // Edit button
    document.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
      setFormMode('EDIT');
    });
    
    // Save button
    document.querySelector('[data-action="save"]')?.addEventListener('click', async () => {
      if (state.mode === 'VIEW') {
        showMessage('Please enter Add or Edit mode to save changes.', 'warning');
        return;
      }
      
      // Validate required fields
      const reason = document.getElementById('reason');
      const remarks = document.getElementById('remarks');
      
      if (!reason?.value) {
        showMessage('Please select a Close Reason', 'warning');
        return;
      }
      
      if (!state.context.AccountID) {
        showMessage('Account ID is required', 'warning');
        return;
      }
      
      if (state.transactionDetails.length === 0) {
        showMessage('Please add at least one transaction', 'warning');
        return;
      }
      
      // Validate unposted amount is zero
      if (state.unpostedAmount > 0) {
        showMessage(`Unposted amount must be zero before saving. Current: ${formatMoney(state.unpostedAmount)}`, 'warning');
        return;
      }
      
      showLoader(true, 'Saving changes...');
      try {
        // Build XML from transaction details
        const userTrxXml = buildTransactionXml(state.transactionDetails);
        
        // Build request payload
        const payload = {
          OurBranchID: state.context.OurBranchID || '002',
          AccountID: state.context.AccountID,
          CloseReasonID: reason.value,
          CloseReason: remarks?.value || '',
          ClosedBy: state.context.OperatorID || 'web_portal',
          UpdateCount: 1,
          SysTrx: '', // Empty XML
          UserTrx: userTrxXml
        };
        
        console.log('[AccountClosing] Save payload:', payload);
        
        // Call the save API
        const result = await saveClosingDetails(payload);
        
        if (result?.success || result?.Status === 'Success' || result?.status === 'success') {
          showMessage('Data saved successfully', 'success');
          
          // Clear all fields
          clearAllFields();
          
          // Disable save button
          const saveBtn = document.querySelector('[data-action="save"]');
          if (saveBtn) {
            saveBtn.disabled = true;
          }
          
          // Disable transaction toolbar buttons
          setTransactionFieldsEnabled(false);
          
          // Set mode to VIEW
          setFormMode('VIEW');
        } else {
          const errorMsg = result?.message || result?.Message || result?.error || 'Failed to save account closing';
          showMessage(errorMsg, 'error');
        }
      } catch (err) {
        console.error('[AccountClosing] Save error:', err);
        showMessage(err?.message || 'Failed to save changes.', 'error');
      } finally {
        showLoader(false);
      }
    });
    
    // Cancel button
    document.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
      // Switch back to Close Details tab
      const closeTab = document.getElementById('close-tab');
      if (closeTab) {
        closeTab.click();
      }
      setFormMode('VIEW');
      showMessage('Changes cancelled', 'info');
    });
  };

  // ============================================================================
  // MONEY FIELD FORMATTING
  // ============================================================================
  const initMoneyFields = () => {
    const moneyFieldIds = [
      'balance', 'penalInterestReceivable', 'creditInterestPayable', 
      'taxAmount', 'debitInterestReceivable', 'closingCharges', 
      'netPayable', 'unpostedAmount', 'balanceAmount', 'transactionAmount',
      'localAmount', 'forexGainLoss', 'exchangeRate'
    ];
    
    moneyFieldIds.forEach(id => {
      const el = document.getElementById(id);
      if (el && !el.hasAttribute('readonly')) {
        el.addEventListener('blur', () => {
          const val = el.value.replace(/,/g, '');
          if (val && !isNaN(parseFloat(val))) {
            el.value = formatMoney(val);
          }
        });
      }
    });
    
    // Set default exchange rate to 1
    const exchangeRateField = document.getElementById('exchangeRate');
    if (exchangeRateField && !exchangeRateField.value) {
      exchangeRateField.value = '1';
    }
    
    // Compute local amount when transaction amount changes
    const transactionAmountField = document.getElementById('transactionAmount');
    const localAmountField = document.getElementById('localAmount');
    
    if (transactionAmountField) {
      const computeLocalAmount = () => {
        const txnAmount = parseFloat((transactionAmountField.value || '0').replace(/,/g, '')) || 0;
        const exchRate = parseFloat((exchangeRateField?.value || '1').replace(/,/g, '')) || 1;
        const localAmt = txnAmount * exchRate;
        if (localAmountField) {
          localAmountField.value = formatMoney(localAmt);
        }
      };
      
      transactionAmountField.addEventListener('input', computeLocalAmount);
      transactionAmountField.addEventListener('blur', computeLocalAmount);
    }
  };

  // ============================================================================
  // DROPDOWN POPULATION
  // ============================================================================
  
  /**
   * Populate a dropdown select element with options
   * @param {string} selectId - The ID of the select element
   * @param {Array} options - Array of { value, label } objects
   * @param {string} placeholder - Placeholder text for first option
   */
  const populateDropdown = (selectId, options, placeholder = 'Select...') => {
    const select = document.getElementById(selectId);
    if (!select) {
      console.warn(`[AccountClosing] Select element not found: ${selectId}`);
      return;
    }
    
    // Clear existing options and add placeholder
    select.innerHTML = `<option value="">${placeholder}</option>`;
    
    // Add options
    if (Array.isArray(options)) {
      options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value || '';
        option.textContent = opt.label || opt.value || '';
        select.appendChild(option);
      });
    }
  };

  /**
   * Load Reason dropdown using LookupService (System Codes)
   * CodeID: AccountCloseReasonID
   */
  const loadReasonDropdown = async () => {
    console.log('[AccountClosing] Loading Reason dropdown...');
    
    try {
      const LookupService = window.LookupService;
      
      if (!LookupService) {
        console.error('[AccountClosing] LookupService not available');
        showMessage('Failed to load dropdown service', 'warning');
        return;
      }
      
      // Get system code options for AccountCloseReasonID
      const options = await LookupService.getSystemCodeOptions('AccountCloseReasonID');
      
      if (options && options.length > 0) {
        populateDropdown('reason', options, 'Select Reason');
        console.log(`[AccountClosing] Reason dropdown populated with ${options.length} options`);
      } else {
        console.warn('[AccountClosing] No options returned for AccountCloseReasonID');
      }
    } catch (err) {
      console.error('[AccountClosing] Error loading Reason dropdown:', err);
      showMessage('Failed to load reason options', 'error');
    }
  };

  /**
   * Load Transaction Type dropdown using LookupService (System Codes)
   * CodeID: CashOrTrf
   */
  const loadTransactionTypeDropdown = async () => {
    console.log('[AccountClosing] Loading Transaction Type dropdown...');
    
    try {
      const LookupService = window.LookupService;
      
      if (!LookupService) {
        console.error('[AccountClosing] LookupService not available');
        return;
      }
      
      const options = await LookupService.getSystemCodeOptions('CashOrTrf');
      
      if (options && options.length > 0) {
        populateDropdown('transactionType', options, 'Select Transaction Type');
        console.log(`[AccountClosing] Transaction Type dropdown populated with ${options.length} options`);
      } else {
        console.warn('[AccountClosing] No options returned for CashOrTrf');
      }
    } catch (err) {
      console.error('[AccountClosing] Error loading Transaction Type dropdown:', err);
    }
  };

  /**
   * Load Type Of Service dropdown using LookupService (System Codes)
   * CodeID: TypeOfServiceID
   */
  const loadTypeOfServiceDropdown = async () => {
    console.log('[AccountClosing] Loading Type Of Service dropdown...');
    
    try {
      const LookupService = window.LookupService;
      
      if (!LookupService) {
        console.error('[AccountClosing] LookupService not available');
        return;
      }
      
      const options = await LookupService.getSystemCodeOptions('TypeOfServiceID');
      
      if (options && options.length > 0) {
        populateDropdown('typeOfService', options, 'Select Service Type');
        console.log(`[AccountClosing] Type Of Service dropdown populated with ${options.length} options`);
      } else {
        console.warn('[AccountClosing] No options returned for TypeOfServiceID');
      }
    } catch (err) {
      console.error('[AccountClosing] Error loading Type Of Service dropdown:', err);
    }
  };

  /**
   * Load Account Type dropdown using LookupService (System Codes)
   * CodeID: AccountTypeID
   */
  const loadAccountTypeDropdown = async () => {
    console.log('[AccountClosing] Loading Account Type dropdown...');
    
    try {
      const LookupService = window.LookupService;
      
      if (!LookupService) {
        console.error('[AccountClosing] LookupService not available');
        return;
      }
      
      const options = await LookupService.getSystemCodeOptions('AccountTypeID');
      
      if (options && options.length > 0) {
        populateDropdown('accountType', options, 'Select Account Type');
        console.log(`[AccountClosing] Account Type dropdown populated with ${options.length} options`);
      } else {
        console.warn('[AccountClosing] No options returned for AccountTypeID');
      }
    } catch (err) {
      console.error('[AccountClosing] Error loading Account Type dropdown:', err);
    }
  };

  /**
   * Setup Transaction Type change listener
   * Clears all transaction detail fields when Transaction Type is changed
   * Disables Till field when Transfer is selected
   */
  const setupTransactionTypeChangeListener = () => {
    const transactionTypeSelect = document.getElementById('transactionType');
    if (!transactionTypeSelect) return;
    
    transactionTypeSelect.addEventListener('change', () => {
      const selectedValue = transactionTypeSelect.value || '';
      
      // Disable Till field when Transaction Type is Transfer (T)
      const tillField = document.getElementById('till');
      if (tillField) {
        const isTransfer = selectedValue === 'T' || selectedValue.toLowerCase() === 'transfer';
        tillField.disabled = isTransfer;
        if (isTransfer) {
          tillField.value = ''; // Clear Till when disabled
        }
      }
      
      // List of all fields to clear (excluding transactionType, till, balanceAmount, unpostedAmount)
      // balanceAmount and unpostedAmount are computed and should not be cleared
      const fieldsToClear = [
        'typeOfService', 'referenceNo', 'accountType',
        'txnAccountId', 'txnAccountName', 'productId', 'currencyId',
        'chequeId', 'exchangeRate', 'payableAt', 'payableAtName',
        'forexGainLoss', 'beneficiaryName', 'transactionId', 'transactionIdName',
        'transactionAmount', 'localAmount', 'narration'
      ];
      
      fieldsToClear.forEach(fieldId => {
        const el = document.getElementById(fieldId);
        if (el) {
          if (el.tagName === 'SELECT') {
            el.selectedIndex = 0;
          } else {
            el.value = '';
          }
        }
      });
      
      console.log('[AccountClosing] Transaction Type changed to:', selectedValue, '- Till disabled:', selectedValue === 'T');
    });
  };

  /**
   * Setup Account Type change listener
   * Clears Account ID, Account Name, Product ID, and Currency ID when Account Type is changed
   */
  const setupAccountTypeChangeListener = () => {
    const accountTypeSelect = document.getElementById('accountType');
    if (!accountTypeSelect) return;
    
    accountTypeSelect.addEventListener('change', () => {
      const txnAccountId = document.getElementById('txnAccountId');
      const txnAccountName = document.getElementById('txnAccountName');
      const productId = document.getElementById('productId');
      const currencyId = document.getElementById('currencyId');
      
      // Clear the account-related fields when account type changes
      if (txnAccountId) txnAccountId.value = '';
      if (txnAccountName) txnAccountName.value = '';
      if (productId) productId.value = '';
      if (currencyId) currencyId.value = '';
      
      console.log('[AccountClosing] Account Type changed - cleared Account ID fields');
    });
  };

  /**
   * Load all dropdowns
   */
  const loadDropdowns = async () => {
    // Load all dropdowns in parallel for better performance
    await Promise.all([
      loadReasonDropdown(),
      loadTransactionTypeDropdown(),
      loadTypeOfServiceDropdown(),
      loadAccountTypeDropdown()
    ]);
    
    // Setup change listeners after dropdowns are loaded
    setupTransactionTypeChangeListener();
    setupAccountTypeChangeListener();
  };

  // ============================================================================
  // INITIALIZATION
  // ============================================================================
  const init = async () => {
    console.log('[AccountClosing] Initializing...');
    
    // Initialize section toggles
    initSectionToggles();
    
    // Initialize lookup buttons
    initLookupButtons();
    
    // Initialize type-and-tab listeners for search fields
    setupTypeAndTabListeners();
    
    // Initialize transaction toolbar
    initTransactionToolbar();
    
    // Initialize disabled field click listeners (show message to click New)
    initDisabledFieldClickListeners();
    
    // Initialize action buttons
    initActionButtons();
    
    // Initialize money field formatting
    initMoneyFields();
    
    // Load dropdowns
    await loadDropdowns();
    
    // Load data on init
    confirmAndLoad();
    
    console.log('[AccountClosing] Initialized successfully');
  };

  // Start initialization when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
