(function () {
  'use strict';

  // Services - accessed lazily to ensure they're loaded
  function getAccountTransferService() {
    return window.AccountTransferService;
  }
  
  function getLookupService() {
    return window.LookupService;
  }

  // Form state
  let formMode = 'view'; // 'view', 'add', 'edit'
  let originalData = {};
  let currentAccountData = null;

  // Account context (passed from parent)
  let accountContext = {
    OurBranchID: '',
    AccountID: '',
    OperatorID: ''
  };

  // DOM Elements
  const elements = {
    branchId: null,
    branchName: null,
    productId: null,
    productName: null,
    retainAccountId: null,
    reason: null,
    remarks: null,
    balance: null,
    creditInterestPayable: null,
    debitInterestReceivable: null,
    penalInterestReceivable: null,
    transferCharges: null,
    netPayable: null,
    messageBar: null,
    loadingOverlay: null
  };

  // Initialize DOM elements
  function initElements() {
    elements.branchId = document.getElementById('branchId');
    elements.branchName = document.getElementById('branchName');
    elements.productId = document.getElementById('productId');
    elements.productName = document.getElementById('productName');
    elements.retainAccountId = document.getElementById('retainAccountId');
    elements.reason = document.getElementById('reason');
    elements.remarks = document.getElementById('remarks');
    elements.balance = document.getElementById('balance');
    elements.creditInterestPayable = document.getElementById('creditInterestPayable');
    elements.debitInterestReceivable = document.getElementById('debitInterestReceivable');
    elements.penalInterestReceivable = document.getElementById('penalInterestReceivable');
    elements.transferCharges = document.getElementById('transferCharges');
    elements.netPayable = document.getElementById('netPayable');
    elements.messageBar = document.querySelector('.am-message-panel');
    elements.loadingOverlay = document.getElementById('loadingOverlay');
  }

  // Show/hide loading overlay
  function setLoading(isLoading) {
    if (elements.loadingOverlay) {
      elements.loadingOverlay.hidden = !isLoading;
    }
  }

  // Show message
  function showMessage(message, type = 'info') {
    if (!elements.messageBar) return;
    
    // Ensure close button exists so message is always closable
    let closeBtn = elements.messageBar.querySelector('.de-message-bar__close, .am-message-panel__close');
    if (!closeBtn) {
      closeBtn = document.createElement('button');
      closeBtn.type = 'button';
      closeBtn.className = 'de-message-bar__close am-message-panel__close';
      closeBtn.setAttribute('aria-label', 'Close message');
      closeBtn.innerHTML = '<i class="bi bi-x"></i>';
      closeBtn.addEventListener('click', () => {
        elements.messageBar.classList.remove('show');
      });
      elements.messageBar.appendChild(closeBtn);
    }
    
    const messageText = elements.messageBar.querySelector('span');
    if (messageText) {
      messageText.textContent = message;
    }
    
    // Remove existing type classes
    elements.messageBar.classList.remove('info', 'success', 'warning', 'error');
    elements.messageBar.className = 'am-message-panel show ' + type;
    
    setTimeout(() => {
      elements.messageBar.classList.remove('show');
    }, 5000);
  }

  // Set form mode and update UI
  function setFormMode(mode) {
    formMode = mode;
    const isEditable = mode === 'add' || mode === 'edit';
    
    // Enable/disable input fields
    if (elements.branchId) elements.branchId.disabled = !isEditable;
    if (elements.productId) elements.productId.disabled = !isEditable;
    if (elements.retainAccountId) elements.retainAccountId.disabled = !isEditable;
    if (elements.reason) elements.reason.disabled = !isEditable;
    if (elements.remarks) elements.remarks.disabled = !isEditable;
    
    // Update lookup buttons
    const lookupButtons = document.querySelectorAll('.btn-lookup');
    lookupButtons.forEach(btn => {
      btn.disabled = !isEditable;
    });
    
    // Update action buttons
    updateActionButtons();
  }

  // Update action button states
  function updateActionButtons() {
    const addBtn = document.querySelector('[data-action="add"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    
    const isEditing = formMode === 'add' || formMode === 'edit';
    
    if (addBtn) addBtn.disabled = isEditing;
    if (saveBtn) saveBtn.disabled = !isEditing;
    if (cancelBtn) cancelBtn.disabled = !isEditing;
  }

  // Clear form
  function clearForm() {
    if (elements.branchId) elements.branchId.value = '';
    if (elements.branchName) elements.branchName.value = '';
    if (elements.productId) elements.productId.value = '';
    if (elements.productName) elements.productName.value = '';
    if (elements.retainAccountId) elements.retainAccountId.checked = false;
    if (elements.reason) elements.reason.value = '';
    if (elements.remarks) elements.remarks.value = '';
    if (elements.balance) elements.balance.value = '';
    if (elements.creditInterestPayable) elements.creditInterestPayable.value = '';
    if (elements.debitInterestReceivable) elements.debitInterestReceivable.value = '';
    if (elements.penalInterestReceivable) elements.penalInterestReceivable.value = '';
    if (elements.transferCharges) elements.transferCharges.value = '';
    if (elements.netPayable) elements.netPayable.value = '';
  }

  // Calculate net payable
  function calculateNetPayable() {
    const balance = parseFloat(elements.balance?.value || 0);
    const creditInterest = parseFloat(elements.creditInterestPayable?.value || 0);
    const debitInterest = parseFloat(elements.debitInterestReceivable?.value || 0);
    const penalInterest = parseFloat(elements.penalInterestReceivable?.value || 0);
    const charges = parseFloat(elements.transferCharges?.value || 0);
    
    const netPayable = balance + creditInterest - debitInterest - penalInterest - charges;
    
    if (elements.netPayable) {
      elements.netPayable.value = netPayable.toFixed(2);
    }
  }

  // Validate form
  function validateForm() {
    const errors = [];
    
    if (!elements.branchId?.value) {
      errors.push('Branch ID is required');
    }
    
    if (!elements.productId?.value) {
      errors.push('Product ID is required');
    }
    
    if (!elements.reason?.value) {
      errors.push('Reason is required');
    }
    
    if (errors.length > 0) {
      showMessage(errors.join(', '), 'error');
      return false;
    }
    
    return true;
  }

  // Handle Add action
  function handleAdd() {
    // Preserve productId and productName before clearing
    const currentProductId = elements.productId?.value || '';
    const currentProductName = elements.productName?.value || '';
    
    clearForm();
    
    // Restore productId and productName
    if (elements.productId) elements.productId.value = currentProductId;
    if (elements.productName) elements.productName.value = currentProductName;
    
    setFormMode('add');
    showMessage('Enter transfer details', 'info');
    
    // Focus first input
    if (elements.branchId) {
      elements.branchId.focus();
    }
  }

  // Handle Save action
  async function handleSave() {
    if (!validateForm()) {
      return;
    }

    const AccountTransferService = getAccountTransferService();
    if (!AccountTransferService) {
      showMessage('Service not available', 'error');
      return;
    }
    
    const context = getAccountContext();
    const parentValues = getParentFormValues();
    
    // Build request data matching dbo.p_AddAcTransferDetails format
    const formData = {
      OurBranchID: context.OurBranchID,
      AccountID: context.AccountID,
      ProductID: parentValues.ProductID || elements.productId?.value,
      NewAccountID: context.AccountID, // Same account for transfer
      CurrentBranchID: parentValues.BranchID || context.OurBranchID,
      NewBranchID: elements.branchId?.value,
      TransferReasonID: elements.reason?.value,
      TransferReason: elements.remarks?.value || '',
      TransferBy: context.OperatorID,
      UpdateCount: 0,
      SysTrx: '',
      UserTrx: ''
    };
    
    setLoading(true);
    
    try {
      const result = await AccountTransferService.saveAccountTransfer(formData);
      
      if (result.success) {
        showMessage('Account transfer saved successfully', 'success');
        originalData = { ...formData };
        setFormMode('view');
        // Reload to get updated data
        await loadTransferDetails();
      } else {
        showMessage(result.message || 'Failed to save transfer', 'error');
      }
    } catch (error) {
      console.error('Error saving transfer:', error);
      showMessage('Error saving transfer', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Handle Cancel action
  function handleCancel() {
    if (formMode === 'edit' && originalData) {
      // Restore original data
      populateForm(originalData);
    } else if (formMode === 'add') {
      // Clear form if cancelling add
      clearForm();
    }
    
    setFormMode('view');
    showMessage('Operation cancelled', 'info');
  }

  /**
   * Listen for messages from parent window
   */
  function setupMessageListener() {
    window.addEventListener('message', (event) => {
      if (event.data && event.data.action === 'setAccountContext') {
        accountContext.OurBranchID = event.data.OurBranchID || accountContext.OurBranchID;
        accountContext.AccountID = event.data.AccountID || accountContext.AccountID;
        accountContext.OperatorID = event.data.OperatorID || accountContext.OperatorID;
        
        // Reload data with new context
        loadTransferDetails();
      }
    });
  }

  // Handle Back/Close action
  function handleBack() {
    try {
      if (window.parent && window.parent !== window) {
        window.parent.postMessage({ 
          action: 'submoduleClosed',
          source: 'Account Transfer'
        }, '*');
      } else {
        window.close();
      }
    } catch (e) {
      console.error('Failed to close window:', e);
    }
  }

  // SearchModal instance
  let searchModalInstance = null;

  /**
   * Get or create SearchModal instance
   */
  function ensureSearchModal() {
    if (searchModalInstance) return searchModalInstance;

    if (typeof window.SearchModal !== 'function' || !window.SearchService) {
      console.warn('[AccountTransfer] SearchModal/SearchService not available');
      return null;
    }

    const context = getAccountContext();
    searchModalInstance = new window.SearchModal({
      prefix: 'actransfer',
      moduleID: '1000',
      getOperatorId: () => context.OperatorID || 'web_portal',
      getOurBranchId: () => context.OurBranchID || '',
      onError: (err) => {
        console.error('[AccountTransfer] Search error:', err);
        showMessage(err?.message || 'Search failed', 'error');
      }
    });

    return searchModalInstance;
  }

  // Handle Branch lookup - uses BranchSearchService (same as product-branch-details)
  async function handleBranchLookup() {
    if (!window.BranchSearchService || typeof window.BranchSearchService.openSearchModal !== 'function') {
      console.error('[AccountTransfer] BranchSearchService not loaded');
      showMessage('Branch search service not available', 'warning');
      return;
    }

    try {
      await window.BranchSearchService.openSearchModal((branchId, branchName) => {
        if (elements.branchId) elements.branchId.value = branchId;
        if (elements.branchName) elements.branchName.value = branchName;
      });
    } catch (err) {
      console.error('[AccountTransfer] Branch search failed:', err);
      showMessage('Branch search failed', 'error');
    }
  }

  // Handle Product lookup
  function handleProductLookup() {
    const modal = ensureSearchModal();
    if (!modal) {
      showMessage('Search not available', 'warning');
      return;
    }

    modal.open({
      title: 'Find Product',
      tableID: 'ProductID',
      whereStmt: '1=1',
      searchFields: [
        { name: 'productId', label: 'Product ID', column: 'ProductID' },
        { name: 'productName', label: 'Product Name', column: 'Description' }
      ],
      displayFields: [
        { key: 'ProductID', label: 'Product ID' },
        { key: 'Description', label: 'Product Name' }
      ],
      onSelect: (record) => {
        const pid = record.ProductID || record.productId || record.ID || '';
        const pname = record.Description || record.ProductName || record.Name || '';
        if (elements.productId) elements.productId.value = pid;
        if (elements.productName) elements.productName.value = pname;
      }
    });
  }

  // Load reasons dropdown from LookupService
  async function loadReasons() {
    if (!elements.reason) return;
    
    try {
      const LookupService = getLookupService();
      if (LookupService) {
        // Use AccountCloseReasonID for transfer reasons
        const options = await LookupService.getSystemCodeOptions("AccountCloseReasonID");
        if (options && options.length > 0) {
          // Clear existing options except the first placeholder
          elements.reason.innerHTML = '<option value="">-- Select Reason --</option>';
          options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            elements.reason.appendChild(option);
          });
          return;
        }
      }
    } catch (error) {
      console.warn('Failed to load reasons from LookupService:', error);
    }
    
    // Fallback to static options if service fails
    const reasons = [
      { value: 'BRANCH_TRANSFER', text: 'Branch Transfer' },
      { value: 'PRODUCT_CHANGE', text: 'Product Change' },
      { value: 'CUSTOMER_REQUEST', text: 'Customer Request' },
      { value: 'ADMIN_CORRECTION', text: 'Administrative Correction' }
    ];
    
    reasons.forEach(reason => {
      const option = document.createElement('option');
      option.value = reason.value;
      option.textContent = reason.text;
      elements.reason.appendChild(option);
    });
  }

  /**
   * Get account context from parent AccountMaintenanceState
   */
  function getAccountContext() {
    // Get from parent AccountMaintenanceState (standard pattern for submodules)
    const ps = (window.parent && window.parent.AccountMaintenanceState) || {};
    
    // Fallback to AuthService session if parent state missing
    let ctx = { ...ps };
    if (!ctx.AccountID || !ctx.OurBranchID || !ctx.OperatorID) {
      try {
        const session = window.parent?.AuthService?.getSession?.() || window.AuthService?.getSession?.();
        if (session) {
          ctx = {
            AccountID: ctx.AccountID || session.AccountID || session.accountId || '',
            OurBranchID: ctx.OurBranchID || session.OurBranchID || session.BranchID || '',
            OperatorID: ctx.OperatorID || session.OperatorID || session.operatorID || 'web_portal'
          };
        }
      } catch (e) {
        console.warn('[AccountTransfer] AuthService session read failed', e);
      }
    }
    
    // Final fallback to sessionStorage
    if (!ctx.AccountID || !ctx.OurBranchID) {
      ctx = {
        AccountID: ctx.AccountID || sessionStorage.getItem('AccountID') || '',
        OurBranchID: ctx.OurBranchID || sessionStorage.getItem('OurBranchID') || sessionStorage.getItem('BranchID') || '',
        OperatorID: ctx.OperatorID || sessionStorage.getItem('OperatorID') || 'web_portal'
      };
    }
    
    accountContext = {
      AccountID: ctx.AccountID || ctx.accountid || ctx.AccountId || '',
      OurBranchID: ctx.OurBranchID || ctx.BranchID || ctx.branchID || '',
      OperatorID: ctx.OperatorID || ctx.operatorID || 'web_portal'
    };
    
    return accountContext;
  }

  /**
   * Get BranchID and ProductID from parent window form inputs
   */
  function getParentFormValues() {
    const values = {
      BranchID: '',
      BranchName: '',
      ProductID: '',
      ProductName: ''
    };
    
    try {
      if (window.parent && window.parent !== window && window.parent.document) {
        const parentDoc = window.parent.document;
        
        // Get BranchID
        const branchInput = parentDoc.getElementById('BranchID') || parentDoc.querySelector('[name="BranchID"]');
        if (branchInput) values.BranchID = branchInput.value || '';
        
        // Get BranchName 
        const branchNameInput = parentDoc.getElementById('BranchName') || parentDoc.querySelector('[name="BranchName"]');
        if (branchNameInput) values.BranchName = branchNameInput.value || '';
        
        // Get ProductID
        const productInput = parentDoc.getElementById('ProductID') || parentDoc.querySelector('[name="ProductID"]');
        if (productInput) values.ProductID = productInput.value || '';
        
        // Get ProductName
        const productNameInput = parentDoc.getElementById('ProductName') || parentDoc.querySelector('[name="ProductName"]');
        if (productNameInput) values.ProductName = productNameInput.value || '';
      }
    } catch (e) {
      console.warn('[AccountTransfer] Could not read parent form values:', e);
    }
    
    return values;
  }

  /**
   * Populate BranchID and ProductID from parent window on page load
   */
  function populateFromParent() {
    const parentValues = getParentFormValues();
    
    if (elements.branchId && parentValues.BranchID) {
      elements.branchId.value = parentValues.BranchID;
    }
    if (elements.branchName && parentValues.BranchName) {
      elements.branchName.value = parentValues.BranchName;
    }
    if (elements.productId && parentValues.ProductID) {
      elements.productId.value = parentValues.ProductID;
    }
    if (elements.productName && parentValues.ProductName) {
      elements.productName.value = parentValues.ProductName;
    }
  }

  /**
   * Load account transfer details from API
   */
  async function loadTransferDetails() {
    const AccountTransferService = getAccountTransferService();
    if (!AccountTransferService) {
      console.error('AccountTransferService not available');
      showMessage('Service not available', 'error');
      return;
    }

    const context = getAccountContext();
    
    if (!context.AccountID) {
      showMessage('No account selected', 'warning');
      return;
    }

    setLoading(true);

    try {
      const result = await AccountTransferService.getAccountTransferDetails({
        OurBranchID: context.OurBranchID,
        AccountID: context.AccountID,
        OperatorID: context.OperatorID
      });

      if (result.success && result.data) {
        // Extract from Details array (API returns data in Details[0])
        const details = result.data.Details?.[0] || result.Details?.[0] || result.data;
        populateForm(details);
        originalData = { ...details };
        currentAccountData = details;
        showMessage('Transfer details loaded', 'success');
      } else {
        showMessage(result.message || 'Failed to load transfer details', 'error');
      }
    } catch (error) {
      console.error('Error loading transfer details:', error);
      showMessage('Error loading transfer details', 'error');
    } finally {
      setLoading(false);
    }
  }

  /**
   * Populate form fields with data from API
   * Note: BranchID, ProductID are populated from parent window on load
   * API returns financial balances for the current account
   */
  function populateForm(data) {
    if (!data) return;

    // Only update transfer destination fields if API returns them (don't overwrite parent values)
    if (data.BranchID || data.ToBranchID) {
      if (elements.branchId) elements.branchId.value = data.BranchID || data.ToBranchID;
    }
    if (data.BranchName || data.ToBranchName) {
      if (elements.branchName) elements.branchName.value = data.BranchName || data.ToBranchName;
    }
    if (data.ProductID || data.ToProductID) {
      if (elements.productId) elements.productId.value = data.ProductID || data.ToProductID;
    }
    if (data.ProductName || data.ToProductName) {
      if (elements.productName) elements.productName.value = data.ProductName || data.ToProductName;
    }
    
    if (elements.retainAccountId) elements.retainAccountId.checked = data.RetainAccountID === 'Y' || data.RetainAccountID === true;
    if (elements.reason) elements.reason.value = data.ReasonID || data.Reason || '';
    if (elements.remarks) elements.remarks.value = data.Remarks || '';
    
    // Financial fields - map from actual API field names
    if (elements.balance) elements.balance.value = formatAmount(data.Balance || 0);
    if (elements.creditInterestPayable) elements.creditInterestPayable.value = formatAmount(data.InterestPayable || data.CreditInterestPayable || 0);
    if (elements.debitInterestReceivable) elements.debitInterestReceivable.value = formatAmount(data.InterestReceivable || data.DebitInterestReceivable || 0);
    if (elements.penalInterestReceivable) elements.penalInterestReceivable.value = formatAmount(data.PenaltyReceivable || data.PenalInterestReceivable || 0);
    if (elements.transferCharges) elements.transferCharges.value = formatAmount(data.TransferCharge || data.TransferCharges || 0);
    
    // Calculate net payable from the values
    calculateNetPayable();

    // Audit fields
    if (data.MakerID) document.getElementById('MakerID').textContent = data.MakerID;
    if (data.MakerDT) document.getElementById('MakerDT').textContent = formatDateTime(data.MakerDT);
    if (data.CheckerID) document.getElementById('CheckerID').textContent = data.CheckerID;
    if (data.CheckerDT) document.getElementById('CheckerDT').textContent = formatDateTime(data.CheckerDT);
    if (data.ModifierID) document.getElementById('ModifierID').textContent = data.ModifierID;
    if (data.ModifierDT) document.getElementById('ModifierDT').textContent = formatDateTime(data.ModifierDT);
  }

  /**
   * Format amount for display
   */
  function formatAmount(value) {
    const num = parseFloat(value);
    if (isNaN(num)) return '0.00';
    return num.toFixed(2);
  }

  /**
   * Format date/time for display
   */
  function formatDateTime(value) {
    if (!value) return '-';
    try {
      const date = new Date(value);
      return date.toLocaleString();
    } catch (e) {
      return value;
    }
  }

  // Wire up header controls (note: refresh, maximize, close are handled by window controls script)
  function wireHeaderControls() {
    // Header controls are now wired by the window controls script in HTML
    // This function is kept for consistency but doesn't need to do anything
  }

  // Wire up action buttons
  function wireActionButtons() {
    const addBtn = document.querySelector('[data-action="add"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    const backBtn = document.querySelector('[data-action="back"]');
    
    if (addBtn) addBtn.addEventListener('click', handleAdd);
    if (saveBtn) saveBtn.addEventListener('click', handleSave);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (backBtn) backBtn.addEventListener('click', handleBack);
  }

  /**
   * Handle Delete action
   */
  async function handleDelete() {
    const AccountTransferService = getAccountTransferService();
    if (!AccountTransferService) {
      showMessage('Service not available', 'error');
      return;
    }

    if (!confirm('Are you sure you want to delete this transfer record?')) {
      return;
    }

    const context = getAccountContext();

    if (!context.AccountID) {
      showMessage('No account selected', 'warning');
      return;
    }

    setLoading(true);

    try {
      const result = await AccountTransferService.deleteAccountTransfer({
        OurBranchID: context.OurBranchID,
        AccountID: context.AccountID,
        OperatorID: context.OperatorID
      });

      if (result.success) {
        showMessage('Transfer record deleted successfully', 'success');
        clearForm();
        setFormMode('view');
      } else {
        showMessage(result.message || 'Failed to delete transfer', 'error');
      }
    } catch (error) {
      console.error('Error deleting transfer:', error);
      showMessage('Error deleting transfer', 'error');
    } finally {
      setLoading(false);
    }
  }

  // Wire up lookup buttons
  function wireLookupButtons() {
    const branchLookupBtn = document.querySelector('[data-lookup="branchId"]');
    const productLookupBtn = document.querySelector('[data-lookup="productId"]');
    
    if (branchLookupBtn) {
      branchLookupBtn.addEventListener('click', handleBranchLookup);
    }
    
    if (productLookupBtn) {
      productLookupBtn.addEventListener('click', handleProductLookup);
    }
  }

  // Wire up financial field calculations
  function wireCalculations() {
    const financialFields = [
      elements.balance,
      elements.creditInterestPayable,
      elements.debitInterestReceivable,
      elements.penalInterestReceivable,
      elements.transferCharges
    ];
    
    financialFields.forEach(field => {
      if (field) {
        field.addEventListener('input', calculateNetPayable);
      }
    });
  }

  // Wire up section toggles
  function wireSectionToggles() {
    const sectionToggles = document.querySelectorAll('[data-section-toggle]');
    
    sectionToggles.forEach(header => {
      header.addEventListener('click', (e) => {
        // Prevent toggle if clicking directly on the button
        if (e.target.closest('.section-toggle-btn')) {
          return;
        }
        
        const section = header.closest('.form-section');
        const content = section.querySelector('[data-section-content]');
        const toggleBtn = header.querySelector('.section-toggle-btn');
        const icon = toggleBtn?.querySelector('i');
        
        if (section && content) {
          section.classList.toggle('collapsed');
          const isCollapsed = section.classList.contains('collapsed');
          
          if (icon) {
            icon.className = isCollapsed ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
          }
          
          if (toggleBtn) {
            toggleBtn.setAttribute('aria-expanded', !isCollapsed);
          }
        }
      });
      
      // Also allow clicking the button itself
      const toggleBtn = header.querySelector('.section-toggle-btn');
      if (toggleBtn) {
        toggleBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          
          const section = header.closest('.form-section');
          const content = section.querySelector('[data-section-content]');
          const icon = toggleBtn.querySelector('i');
          
          if (section && content) {
            section.classList.toggle('collapsed');
            const isCollapsed = section.classList.contains('collapsed');
            
            if (icon) {
              icon.className = isCollapsed ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
            }
            
            toggleBtn.setAttribute('aria-expanded', !isCollapsed);
          }
        });
      }
    });
  }

  // Initialize the form
  async function init() {
    initElements();
    setupMessageListener();
    await loadReasons(); // Load reason dropdown options
    populateFromParent(); // Populate BranchID and ProductID from parent window
    wireHeaderControls();
    wireActionButtons();
    wireLookupButtons();
    wireCalculations();
    wireSectionToggles();
    setFormMode('view');
    
    // Load transfer details on page load
    await loadTransferDetails();
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', init);
})();
