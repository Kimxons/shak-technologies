// Transaction Supervision Module
(async function() {
  'use strict';

  // Load required services
  const { ServiceLoader } = window;
  
  try {
    await ServiceLoader.loadCore();
    await ServiceLoader.loadTransactionSupervisionService();
    await ServiceLoader.loadLookupService();
  } catch (error) {
    console.error('Failed to load services:', error);
    alert('Failed to load required services. Please refresh the page.');
    return;
  }

  // Get services
  const TransactionSupervisionService = window.TransactionSupervisionService;
  const LookupService = window.LookupService;

  // Configuration
  const MODULE_ID = 'transaction-supervision';

  // DOM Reference Cache
  let domCache = {};

  // State
  let isAuthenticated = false;
  let currentTransactions = [];

  // Session data
  let sessionData = {
    branchId: null,
    operatorId: null,
    branchName: null,
    operatorName: null
  };

  /**
   * Get session information from parent window or localStorage
   */
  function getSessionData() {
    try {
      // Try to get from parent window (if loaded in iframe/module system)
      if (window.parent && window.parent.sessionStorage) {
        sessionData.branchId = window.parent.sessionStorage.getItem('branchId') || 
                               window.parent.sessionStorage.getItem('OurBranchID') ||
                               localStorage.getItem('branchId');
        
        sessionData.operatorId = window.parent.sessionStorage.getItem('operatorId') || 
                                window.parent.sessionStorage.getItem('OperatorID') ||
                                localStorage.getItem('operatorId');
        
        sessionData.branchName = window.parent.sessionStorage.getItem('branchName') || 
                                localStorage.getItem('branchName');
        
        sessionData.operatorName = window.parent.sessionStorage.getItem('operatorName') || 
                                  localStorage.getItem('operatorName');
      }
      
      // Fallback to localStorage/sessionStorage
      if (!sessionData.branchId) {
        sessionData.branchId = localStorage.getItem('branchId') || 
                              sessionStorage.getItem('branchId') || 
                              '0101'; // Default fallback to branch 0101
      }
      
      if (!sessionData.operatorId) {
        sessionData.operatorId = localStorage.getItem('operatorId') || 
                                sessionStorage.getItem('operatorId') ||
                                'web_portal'; // Default fallback
      }

      console.log('✓ Session Data Retrieved:', sessionData);
      return true;
    } catch (error) {
      console.error('Error getting session data:', error);
      // Use defaults on error
      sessionData.branchId = '0101';
      sessionData.operatorId = 'web_portal';
      showMessage('Using default branch 0101', 'warning');
      return true;
    }
  }

  // Initialize Page
  async function initialize() {
    console.log('🚀 Initializing Transaction Supervision...');
    
    // Get session data first
    getSessionData();
    
    cacheDOM();
    attachEventListeners();
    wireCollapsibleSections();
    
    // Load modules and categories in parallel
    await Promise.all([
      loadUnsuperviseModules(),
      loadSupervisionCategories()
    ]);
    
    console.log('✓ Transaction Supervision initialized');
  }

  // Cache DOM References
  function cacheDOM() {
    domCache = {
      // Password Verification
      passwordInput: document.getElementById('passwordField'),
      passwordOkBtn: document.getElementById('okBtn'),

      // Transaction Category
      moduleSelect: document.getElementById('moduleSelect'),
      categorySelect: document.getElementById('categorySelect'),
      trxCreatedByInput: document.getElementById('trxCreatedByField'),

      // Transaction Results Table
      transactionTable: document.getElementById('transactionTable'),
      transactionTableBody: document.getElementById('transactionTableBody'),

      // Right Panel Buttons
      viewBtn: document.getElementById('viewBtn'),
      superviseBtn: document.getElementById('superviseBtn'),
      rejectBtn: document.getElementById('rejectBtn'),
      unpayTrxBtn: document.getElementById('unpayTrxBtn'),
      representChqBtn: document.getElementById('representChqBtn'),
      imageBtn: document.getElementById('imageBtn'),
      cancelBtn: document.getElementById('cancelBtn'),

      // Balance Information Fields
      clearBalanceDisplay: document.getElementById('clearBalanceField'),
      clearBalancePlusBtn: document.getElementById('clearBalanceBtn'),
      drawingPowerDisplay: document.getElementById('drawingPowerField'),
      drawingPowerPlusBtn: document.getElementById('drawingPowerBtn'),
      unclearBalanceDisplay: document.getElementById('unclearBalanceField'),
      unclearBalancePlusBtn: document.getElementById('unclearBalanceBtn'),
      freezedAmountDisplay: document.getElementById('freezedAmountField'),
      freezedAmountPlusBtn: document.getElementById('freezedAmountBtn'),
      unsupervisedCreditDisplay: document.getElementById('unsupervisedCreditField'),
      unsupervisedCreditPlusBtn: document.getElementById('unsupervisedCreditBtn'),
      minimumBalanceDisplay: document.getElementById('minimumBalanceField'),
      unsupervisedDebitDisplay: document.getElementById('unsupervisedDebitField'),
      unsupervisedDebitPlusBtn: document.getElementById('unsupervisedDebitBtn'),
      depositBalanceDisplay: document.getElementById('depositBalanceField'),
      availableBalanceDisplay: document.getElementById('availableBalanceField'),
      totalBalanceDisplay: document.getElementById('totalBalanceField'),
      accountCurrencyInput: document.getElementById('accountCurrencyField'),
      accountProductInput: document.getElementById('accountProductField'),
      systemDateInput: document.getElementById('systemDateField'),
      dayStatusInput: document.getElementById('dayStatusField'),
      signatureBtn: document.getElementById('signatureBtn')
    };
  }

  // Attach Event Listeners
  function attachEventListeners() {
    // Password Verification
    if (domCache.passwordOkBtn) {
      domCache.passwordOkBtn.addEventListener('click', handlePasswordVerification);
    }

    // Transaction Category Filters
    if (domCache.moduleSelect) {
      domCache.moduleSelect.addEventListener('change', handleModuleChange);
    }
    if (domCache.categorySelect) {
      domCache.categorySelect.addEventListener('change', handleCategoryChange);
    }

    // Right Panel Buttons
    if (domCache.viewBtn) {
      domCache.viewBtn.addEventListener('click', handleView);
    }
    if (domCache.superviseBtn) {
      domCache.superviseBtn.addEventListener('click', handleSupervise);
    }
    if (domCache.rejectBtn) {
      domCache.rejectBtn.addEventListener('click', handleReject);
    }
    if (domCache.unpayTrxBtn) {
      domCache.unpayTrxBtn.addEventListener('click', handleUnpayTrx);
    }
    if (domCache.representChqBtn) {
      domCache.representChqBtn.addEventListener('click', handleRepresentChq);
    }
    if (domCache.imageBtn) {
      domCache.imageBtn.addEventListener('click', handleImage);
    }
    if (domCache.cancelBtn) {
      domCache.cancelBtn.addEventListener('click', handleCancel);
    }

    // Balance Adjustment Buttons
    if (domCache.clearBalancePlusBtn) {
      domCache.clearBalancePlusBtn.addEventListener('click', () => handleBalanceAdjustment('clearBalance'));
    }
    if (domCache.drawingPowerPlusBtn) {
      domCache.drawingPowerPlusBtn.addEventListener('click', () => handleBalanceAdjustment('drawingPower'));
    }
    if (domCache.unclearBalancePlusBtn) {
      domCache.unclearBalancePlusBtn.addEventListener('click', () => handleBalanceAdjustment('unclearBalance'));
    }
    if (domCache.freezedAmountPlusBtn) {
      domCache.freezedAmountPlusBtn.addEventListener('click', () => handleBalanceAdjustment('freezedAmount'));
    }
    if (domCache.unsupervisedCreditPlusBtn) {
      domCache.unsupervisedCreditPlusBtn.addEventListener('click', () => handleBalanceAdjustment('unsupervisedCredit'));
    }
    if (domCache.unsupervisedDebitPlusBtn) {
      domCache.unsupervisedDebitPlusBtn.addEventListener('click', () => handleBalanceAdjustment('unsupervisedDebit'));
    }

    // Signature Button
    if (domCache.signatureBtn) {
      domCache.signatureBtn.addEventListener('click', handleSignature);
    }
  }

  // Load Unsupervised Modules on Page Load
  async function loadUnsuperviseModules() {
    try {
      console.log('==========================================');
      console.log('📡 Loading unsupervised modules...');
      console.log('Branch ID:', sessionData.branchId);
      console.log('Operator ID:', sessionData.operatorId);
      
      const requestData = {
        OurBranchID: sessionData.branchId,
        OperatorID: sessionData.operatorId
      };

      console.log('📤 Request payload:', JSON.stringify(requestData, null, 2));

      const response = await TransactionSupervisionService.getUnsuperviseModuleList(requestData);
      
      console.log('📥 Full API Response:', JSON.stringify(response, null, 2));
      console.log('==========================================');

      // Check if response exists
      if (!response) {
        console.error('❌ Response is null or undefined');
        showMessage('No response from server', 'error');
        return;
      }

      // Check success flag
      if (response.success === false) {
        console.error('❌ API returned success=false');
        console.error('Error code:', response.code);
        console.error('Error message:', response.message);
        showMessage(response.message || 'API request failed', 'error');
        return;
      }

      // API returned success=true
      console.log('✓ API call successful');

      // Try to extract module data from different possible locations
      let moduleData = null;

      // Check data property (most common)
      if (response.data && Array.isArray(response.data)) {
        moduleData = response.data;
        console.log('✓ Found modules in response.data');
      } 
      // Check ResponseData.Table
      else if (response.ResponseData?.Table && Array.isArray(response.ResponseData.Table)) {
        moduleData = response.ResponseData.Table;
        console.log('✓ Found modules in ResponseData.Table');
      } 
      // Check ResponseData as array
      else if (Array.isArray(response.ResponseData)) {
        moduleData = response.ResponseData;
        console.log('✓ Found modules in ResponseData (array)');
      } 
      // Check other nested properties
      else if (response.ResponseData?.table) {
        moduleData = response.ResponseData.table;
        console.log('✓ Found modules in ResponseData.table');
      } 
      else if (response.ResponseData?.data) {
        moduleData = response.ResponseData.data;
        console.log('✓ Found modules in ResponseData.data');
      } 
      else if (response.Details && Array.isArray(response.Details)) {
        moduleData = response.Details;
        console.log('✓ Found modules in response.Details');
      }
      // Check if response itself is an array
      else if (Array.isArray(response)) {
        moduleData = response;
        console.log('✓ Response itself is an array');
      }

      console.log('Module data:', moduleData);
      console.log('Module count:', moduleData?.length || 0);

      // Handle empty or no data
      if (!moduleData || !Array.isArray(moduleData) || moduleData.length === 0) {
        console.warn('⚠️ No modules found for Branch:', sessionData.branchId);
        showMessage(`No unsupervised modules found for branch ${sessionData.branchId}`, 'info');
        // Keep dropdown with just the default option
        if (domCache.moduleSelect) {
          domCache.moduleSelect.innerHTML = '<option value="">--No Modules Available--</option>';
        }
        return;
      }

      // We have modules, populate the dropdown
      console.log('✓ Found', moduleData.length, 'module(s)');
      console.log('First module sample:', moduleData[0]);
      populateModuleDropdown(moduleData);
      showMessage(`${moduleData.length} module(s) loaded successfully`, 'success');

    } catch (error) {
      console.error('==========================================');
      console.error('❌ EXCEPTION in loadUnsuperviseModules:');
      console.error('Error type:', error.name);
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
      console.error('==========================================');
      showMessage('Failed to load modules: ' + error.message, 'error');
    }
  }

  // Populate Module Dropdown
  function populateModuleDropdown(modules) {
    if (!domCache.moduleSelect) return;
    
    // Clear existing options and add default
    domCache.moduleSelect.innerHTML = '<option value="">--Select Module--</option>';
    
    if (!Array.isArray(modules) || modules.length === 0) {
      console.log('No modules to populate');
      return;
    }
    
    console.log('Populating dropdown with', modules.length, 'modules');
    
    let addedCount = 0;
    
    modules.forEach((module, index) => {
      console.log(`Processing module ${index}:`, module);
      
      // Try different property name variations
      const moduleId = module.ModuleID || module.moduleId || module.ModuleId || 
                       module.MODULEID || module.module_id || module.id || module.ID;
      const moduleName = module.ModuleName || module.moduleName || module.MODULENAME || 
                        module.module_name || module.name || module.Name || 
                        module.Description || module.description || moduleId;
      
      console.log(`  → ID: ${moduleId}, Name: ${moduleName}`);
      
      if (moduleId) {
        const option = document.createElement('option');
        option.value = moduleId;
        option.textContent = moduleName;
        domCache.moduleSelect.appendChild(option);
        addedCount++;
        console.log(`  ✓ Added to dropdown`);
      } else {
        console.warn(`  ✗ Skipped - no valid ID found`);
        console.warn('  Available properties:', Object.keys(module));
      }
    });
    
    console.log(`✓ Total modules added: ${addedCount}`);
  }

  // Password Verification Handler
  async function handlePasswordVerification() {
    const password = domCache.passwordInput ? domCache.passwordInput.value : '';
    if (!password.trim()) {
      showMessage('Please enter your password to verify transactions.', 'warning');
      return;
    }
    
    try {
      const requestData = {
        Password: password,
        OperatorID: sessionData.operatorId,
        OurBranchID: sessionData.branchId
      };
      
      console.log('📤 Verifying password for operator:', sessionData.operatorId);
      const response = await TransactionSupervisionService.verifyPassword(requestData);
      
      if (response.success) {
        isAuthenticated = true;
        showMessage('Password verified successfully. Transaction supervision enabled.', 'success');
        // Clear password for security
        if (domCache.passwordInput) {
          domCache.passwordInput.value = '';
          domCache.passwordInput.disabled = true;
        }
        if (domCache.passwordOkBtn) {
          domCache.passwordOkBtn.disabled = true;
        }
      } else {
        showMessage(response.message || 'Invalid password', 'error');
      }
    } catch (error) {
      console.error('Password verification error:', error);
      showMessage('Password verification failed: ' + error.message, 'error');
    }
  }

  // Module Change Handler
  async function handleModuleChange() {
    const selectedModule = domCache.moduleSelect ? domCache.moduleSelect.value : '';
    console.log('📌 Module changed to:', selectedModule);
    
    // Clear category dropdown
    if (domCache.categorySelect) {
      domCache.categorySelect.innerHTML = '<option value="">--Select Category--</option>';
    }
    
    if (selectedModule) {
      // Load categories for selected module
      await loadSupervisionCategories();
    }
  }

  // Category Change Handler
  function handleCategoryChange() {
    const selectedModule = domCache.moduleSelect ? domCache.moduleSelect.value : '';
    const selectedCategory = domCache.categorySelect ? domCache.categorySelect.value : '';
    
    console.log('📌 Category changed to:', selectedCategory);
    
    // Auto-trigger View when both Module and Category are selected
    if (selectedModule && selectedCategory) {
      console.log('✓ Module and Category selected - Auto-loading transactions...');
      handleView();
    }
  }

  // Load Supervision Categories
  async function loadSupervisionCategories() {
    try {
      console.log('📡 Loading supervision categories...');
      showMessage('Loading categories...', 'info');
      
      const categories = await LookupService.getSystemCodeOptions('SupervisionCategoryID');
      
      console.log('📥 Categories loaded:', categories);
      
      if (categories && categories.length > 0) {
        populateCategoryDropdown(categories);
        showMessage(`${categories.length} category(ies) loaded`, 'success');
      } else {
        console.warn('⚠️ No categories found');
        showMessage('No categories available', 'info');
      }
    } catch (error) {
      console.error('❌ Failed to load categories:', error);
      showMessage('Failed to load categories: ' + error.message, 'error');
    }
  }

  // Populate Category Dropdown
  function populateCategoryDropdown(categories) {
    if (!domCache.categorySelect) return;
    
    // Clear existing options and add default
    domCache.categorySelect.innerHTML = '<option value="">--Select Category--</option>';
    
    if (!Array.isArray(categories) || categories.length === 0) {
      console.log('No categories to populate');
      return;
    }
    
    console.log('Populating category dropdown with', categories.length, 'categories');
    
    categories.forEach((category) => {
      const option = document.createElement('option');
      option.value = category.value;
      option.textContent = category.label;
      domCache.categorySelect.appendChild(option);
      console.log(`  ✓ Added category: ${category.label} (${category.value})`);
    });
    
    console.log(`✓ Total categories added: ${categories.length}`);
  }

  // Load Pending Transactions
  async function loadPendingTransactions() {
    try {
      const requestData = {
        ModuleID: domCache.moduleSelect?.value || '',
        CategoryID: domCache.categorySelect?.value || '',
        CreatedBy: domCache.trxCreatedByInput?.value || '',
        OurBranchID: sessionData.branchId,
        OperatorID: sessionData.operatorId
      };

      console.log('📤 Loading transactions with:', requestData);
      showMessage('Loading transactions...', 'info');
      
      const response = await TransactionSupervisionService.getPendingTransactions(requestData);
      
      console.log('📥 Transactions response:', response);
      
      if (response.success && response.data) {
        const transactions = Array.isArray(response.data) ? response.data : 
                           response.data.Table || response.data.table || [];
        renderTransactions(transactions);
        showMessage(`${transactions.length} transaction(s) loaded`, 'success');
      } else if (response.ResponseData) {
        const transactions = response.ResponseData.Table || response.ResponseData || [];
        renderTransactions(transactions);
        showMessage(`${transactions.length} transaction(s) loaded`, 'success');
      } else {
        renderTransactions([]);
        showMessage('No transactions found', 'info');
      }
    } catch (error) {
      console.error('Failed to load transactions:', error);
      showMessage('Failed to load transactions: ' + error.message, 'error');
    }
  }

  // Refresh Handler (removed refresh button but keeping function for compatibility)
  function handleRefresh() {
    loadPendingTransactions();
  }

  // Render Transactions
  function renderTransactions(transactions) {
    if (!domCache.transactionTableBody) return;

    domCache.transactionTableBody.innerHTML = '';

    if (!transactions || transactions.length === 0) {
      const row = document.createElement('tr');
      row.innerHTML = `<td colspan="15" class="empty-state">No records to display.</td>`;
      domCache.transactionTableBody.appendChild(row);
      return;
    }

    currentTransactions = transactions;
    console.log(`✓ Rendering ${transactions.length} transaction(s)`);
    
    // Log first transaction to see available properties
    if (transactions.length > 0) {
      console.log('Sample transaction data:', transactions[0]);
      console.log('Available properties:', Object.keys(transactions[0]));
    }

    transactions.forEach((trx, index) => {
      const row = document.createElement('tr');
      row.dataset.serialId = trx.SerialID || trx.serialId || '';
      row.dataset.rowIndex = index; // Store the array index for easy lookup
      row.style.cursor = 'pointer';
      
      // Add click handler for row selection
      row.addEventListener('click', function() {
        this.classList.toggle('selected');
        this.style.backgroundColor = this.classList.contains('selected') ? '#e8f1ff' : '';
      });
      
      row.innerHTML = `
        <td>${trx.SerialID || trx.serialId || trx.SERIALID || ''}</td>
        <td>${trx.TrxTypeID || trx.trxTypeId || trx.TRXTYPEID || ''}</td>
        <td>${trx.AccountID || trx.accountId || trx.ACCOUNTID || ''}</td>
        <td>${trx.AccountName || trx.accountName || trx.ACCOUNTNAME || ''}</td>
        <td style="text-align: right;">${trx.Amount || trx.amount || trx.AMOUNT || ''}</td>
        <td>${trx.TrxDescription || trx.trxDescription || trx.TRXDESCRIPTION || ''}</td>
        <td>${trx.ValueDate || trx.valueDate || trx.VALUEDATE || ''}</td>
        <td>${trx.CreatedBy || trx.createdBy || trx.CREATEDBY || ''}</td>
        <td>${trx.TxBatchID || trx.txBatchId || trx.TrxBatchID || trx.trxBatchId || trx.TXBATCHID || trx.TRXBATCHID || ''}</td>
        <td>${trx.ChequeID || trx.chequeId || trx.CHEQUEID || ''}</td>
        <td>${trx.AccountTypeID || trx.accountTypeId || trx.ACCOUNTTYPEID || ''}</td>
        <td style="text-align: right;">${trx.LocalAmount || trx.localAmount || trx.LOCALAMOUNT || ''}</td>
        <td>${trx.TransactionID || trx.transactionId || trx.TRANSACTIONID || ''}</td>
        <td>${trx.BankID || trx.bankId || trx.BANKID || ''}</td>
        <td>${trx.BranchID || trx.branchId || trx.BRANCHID || ''}</td>
      `;
      domCache.transactionTableBody.appendChild(row);
    });
  }

  // View Handler
  async function handleView() {
    // Validate required fields
    const moduleId = domCache.moduleSelect?.value;
    const categoryId = domCache.categorySelect?.value;
    
    if (!moduleId) {
      showMessage('Please select a Module first', 'warning');
      return;
    }
    
    if (!categoryId) {
      showMessage('Please select a Category first', 'warning');
      return;
    }
    
    try {
      console.log('🔍 Loading unsupervised transactions...');
      showMessage('Loading transactions...', 'info');
      
      const requestData = {
        OurBranchID: sessionData.branchId,
        OperatorID: sessionData.operatorId,
        CategoryID: categoryId,
        ModuleID: moduleId,
        IsRole: 0, // Default to 0 (false)
        TrxCreatedBy: domCache.trxCreatedByInput?.value || sessionData.operatorId
      };
      
      console.log('📤 Request data:', requestData);
      
      const response = await TransactionSupervisionService.getUnsuperviseTrxList(requestData);
      
      console.log('📥 Transaction response:', response);
      
      if (response.success && response.data) {
        const transactions = Array.isArray(response.data) ? response.data : 
                           response.data.Table || response.data.table || [];
        renderTransactions(transactions);
        if (transactions.length > 0) {
          showMessage(`${transactions.length} transaction(s) loaded`, 'success');
        } else {
          console.log('ℹ️ No transactions found for selected criteria');
        }
      } else if (response.ResponseData) {
        const transactions = response.ResponseData.Table || response.ResponseData || [];
        renderTransactions(transactions);
        if (transactions.length > 0) {
          showMessage(`${transactions.length} transaction(s) loaded`, 'success');
        } else {
          console.log('ℹ️ No transactions found for selected criteria');
        }
      } else {
        renderTransactions([]);
        console.log('ℹ️ No transactions found for selected criteria');
      }
    } catch (error) {
      console.error('❌ Failed to load transactions:', error);
      showMessage('Failed to load transactions: ' + error.message, 'error');
    }
  }

  // Supervise Handler
  async function handleSupervise() {
    // Password verification removed - to be implemented later
    
    // Get selected rows and extract transaction data
    const selectedRows = document.querySelectorAll('#transactionTableBody tr.selected');
    
    if (selectedRows.length === 0) {
      showMessage('Please select at least one transaction to supervise', 'warning');
      return;
    }
    
    const categoryId = domCache.categorySelect?.value;
    if (!categoryId) {
      showMessage('Category is required for supervision', 'error');
      return;
    }
    
    try {
      console.log(`🔐 Supervising ${selectedRows.length} transaction(s)...`);
      
      // Process each selected transaction
      let successCount = 0;
      let failCount = 0;
      
      for (const row of selectedRows) {
        // Get the row index to find the transaction
        const rowIndex = row.dataset.rowIndex;
        const transaction = currentTransactions[rowIndex];
        
        if (!transaction) {
          console.warn('⚠️ Transaction data not found for row index:', rowIndex);
          console.warn('Available transactions:', currentTransactions.length);
          failCount++;
          continue;
        }
        
        console.log('✓ Found transaction:', transaction);
        
        // Extract TrxBatchID from transaction
        const trxBatchId = transaction.TxBatchID || transaction.txBatchId || 
                          transaction.TrxBatchID || transaction.trxBatchId || 
                          transaction.TXBATCHID || transaction.TRXBATCHID || '';
        
        if (!trxBatchId) {
          console.warn('⚠️ TrxBatchID not found for transaction:', transaction);
          console.warn('Available properties:', Object.keys(transaction));
          failCount++;
          continue;
        }
        
        const requestData = {
          TrxBranchID: sessionData.branchId,
          TrxBatchID: trxBatchId,
          CategoryID: categoryId,
          SupervisedBy: sessionData.operatorId,
          IsJointSupervision: 0, // Default to false
          IsUnpaidItem: 0 // Default to false
        };
        
        console.log('📤 Supervising transaction:', requestData);
        
        const response = await TransactionSupervisionService.superviseTransaction(requestData);
        
        if (response.success) {
          successCount++;
          console.log(`✓ Transaction ${trxBatchId} supervised successfully`);
        } else {
          failCount++;
          console.error(`✗ Failed to supervise transaction ${trxBatchId}:`, response.message);
        }
      }
      
      // Show summary message
      if (successCount > 0 && failCount === 0) {
        showMessage(`${successCount} transaction(s) supervised successfully`, 'success');
      } else if (successCount > 0 && failCount > 0) {
        showMessage(`${successCount} succeeded, ${failCount} failed`, 'warning');
      } else {
        showMessage('Failed to supervise transactions', 'error');
      }
      
      // Reload transactions to refresh the list
      if (successCount > 0) {
        await handleView();
      }
    } catch (error) {
      console.error('❌ Supervise error:', error);
      showMessage('Failed to supervise: ' + error.message, 'error');
    }
  }

  // Reject Handler
  async function handleReject() {
    console.log('🔴 Reject button clicked');
    
    // Get selected rows
    const selectedRows = document.querySelectorAll('#transactionTableBody tr.selected');
    
    if (selectedRows.length === 0) {
      showMessage('Please select at least one transaction to reject', 'warning');
      return;
    }
    
    console.log(`📊 Found ${selectedRows.length} selected transaction(s)`);
    
    // Show the reject reason modal using Bootstrap
    const modalElement = document.getElementById('rejectReasonModal');
    const rejectReasonInput = document.getElementById('rejectReasonInput');
    
    if (!modalElement || !rejectReasonInput) {
      console.error('❌ Modal elements not found');
      showMessage('Error: Modal not found', 'error');
      return;
    }
    
    // Initialize Bootstrap modal
    const bsModal = new bootstrap.Modal(modalElement);
    
    // Clear previous input and show modal
    rejectReasonInput.value = '';
    document.getElementById('charCount').textContent = '0';
    bsModal.show();
    rejectReasonInput.focus();
    
    // Handle modal confirmation (one-time event)
    const confirmReject = async () => {
      const reason = rejectReasonInput.value.trim();
      
      if (!reason) {
        showMessage('Please enter a rejection reason', 'warning');
        rejectReasonInput.focus();
        return;
      }
      
      console.log('📝 Reject reason:', reason);
      
      // Close modal using Bootstrap
      bsModal.hide();
      
      try {
        let successCount = 0;
        let failCount = 0;
        
        // Get module and category for the request
        const moduleId = domCache.moduleSelect?.value || '';
        const categoryId = domCache.categorySelect?.value || '';
        
        console.log(`🔄 Processing ${selectedRows.length} transaction(s) for rejection`);
        
        // Process each selected transaction
        for (const row of selectedRows) {
          const rowIndex = parseInt(row.dataset.rowIndex);
          const transaction = currentTransactions[rowIndex];
          
          if (!transaction) {
            console.error(`❌ Transaction not found for row index: ${rowIndex}`);
            failCount++;
            continue;
          }
          
          // Extract TrxBatchID with multiple property name variations
          const trxBatchId = transaction.TxBatchID || transaction.txBatchId || 
                           transaction.TrxBatchID || transaction.trxBatchId || 
                           transaction.TXBATCHID || transaction.TRXBATCHID ||
                           transaction.TransactionBatchID || transaction.transactionBatchId ||
                           transaction.BatchID || transaction.batchId;
          
          if (!trxBatchId) {
            console.error('❌ TrxBatchID not found in transaction:', transaction);
            console.log('Available properties:', Object.keys(transaction));
            failCount++;
            continue;
          }
          
          console.log(`📤 Rejecting transaction: ${trxBatchId}`);
          
          // Prepare request data matching the stored procedure parameters
          const requestData = {
            TrxBranchID: sessionData.branchId,
            TrxBatchID: trxBatchId,
            SupervisedBy: sessionData.operatorId,
            RejectReason: reason
          };
          
          console.log('📤 Reject request data:', requestData);
          
          const response = await TransactionSupervisionService.rejectTransaction(requestData);
          
          if (response.success) {
            successCount++;
            console.log(`✓ Transaction ${trxBatchId} rejected successfully`);
          } else {
            failCount++;
            console.error(`✗ Failed to reject transaction ${trxBatchId}:`, response.message);
          }
        }
        
        // Show summary message
        if (successCount > 0 && failCount === 0) {
          showMessage(`${successCount} transaction(s) rejected successfully`, 'success');
        } else if (successCount > 0 && failCount > 0) {
          showMessage(`${successCount} succeeded, ${failCount} failed`, 'warning');
        } else {
          showMessage('Failed to reject transactions', 'error');
        }
        
        // Reload transactions to refresh the list
        if (successCount > 0) {
          await handleView();
        }
      } catch (error) {
        console.error('❌ Reject error:', error);
        showMessage('Failed to reject: ' + error.message, 'error');
      }
      
      // Remove event listeners
      document.getElementById('confirmRejectBtn').removeEventListener('click', confirmReject);
    };
    
    // Add event listener for confirm button
    const confirmBtn = document.getElementById('confirmRejectBtn');
    confirmBtn.addEventListener('click', confirmReject, { once: true });
  }

  // Unpay Transaction Handler
  function handleUnpayTrx() {
    showMessage('Unpay selected transaction', 'info');
  }

  // Represent Cheque Handler
  function handleRepresentChq() {
    showMessage('Represent cheque for selected transaction', 'info');
  }

  // Image Handler
  function handleImage() {
    showMessage('View image for selected transaction', 'info');
  }

  // Cancel Handler
  function handleCancel() {
    // Reset form
    if (domCache.moduleSelect) domCache.moduleSelect.value = '';
    if (domCache.categorySelect) domCache.categorySelect.value = '';
    if (domCache.trxCreatedByInput) domCache.trxCreatedByInput.value = '';
    if (domCache.transactionTableBody) {
      domCache.transactionTableBody.innerHTML = '<tr><td colspan="15" class="empty-state">No records to display.</td></tr>';
    }
    currentTransactions = [];
    isAuthenticated = false;
    console.log('Form cancelled and reset');
  }

  // Balance Adjustment Handler
  function handleBalanceAdjustment(balanceField) {
    console.log('Adjust balance for:', balanceField);
    showMessage(`Adjust ${balanceField} balance`, 'info');
  }

  // Signature Handler
  function handleSignature() {
    console.log('Signature button clicked');
    showMessage('Signature form will be implemented', 'info');
  }

  // Show Message
  function showMessage(message, type) {
    const icon = {
      success: '✓',
      error: '✗',
      warning: '⚠',
      info: 'ℹ'
    };

    console.log(`[${type.toUpperCase()}] ${message}`);
    
    // Create a modern toast notification
    const toast = document.createElement('div');
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#27AE60' : type === 'error' ? '#E74C3C' : type === 'warning' ? '#F39C12' : '#4A90E2'};
      color: white;
      padding: 15px 20px;
      border-radius: 5px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      font-size: 14px;
      font-weight: 500;
      display: flex;
      align-items: center;
      gap: 10px;
      animation: slideInRight 0.3s ease-out;
    `;
    toast.innerHTML = `<span style="font-size: 18px;">${icon[type] || ''}</span> ${message}`;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      toast.style.animation = 'slideOutRight 0.3s ease-out';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // Modal event handlers
  function initializeModalHandlers() {
    const rejectReasonInput = document.getElementById('rejectReasonInput');
    const charCount = document.getElementById('charCount');
    
    // Character counter
    if (rejectReasonInput && charCount) {
      rejectReasonInput.addEventListener('input', () => {
        charCount.textContent = rejectReasonInput.value.length;
      });
    }
  }

  // =========================================================================
  // COLLAPSIBLE SECTIONS
  // =========================================================================
  function wireCollapsibleSections() {
    const sections = document.querySelectorAll('.form-section[data-section]');
    
    sections.forEach(section => {
      const header = section.querySelector('[data-section-toggle]');
      const content = section.querySelector('[data-section-content]');
      const toggleBtn = header?.querySelector('.section-toggle-btn');
      
      if (!header || !content || !toggleBtn) return;
      
      // Set initial state from aria-expanded
      const isExpanded = toggleBtn.getAttribute('aria-expanded') === 'true';
      if (isExpanded) {
        section.classList.add('expanded');
        content.style.display = 'block';
      } else {
        section.classList.remove('expanded');
        content.style.display = 'none';
      }
      
      // Toggle handler
      const toggle = () => {
        const isCurrentlyExpanded = section.classList.contains('expanded');
        const willExpand = !isCurrentlyExpanded;
        
        section.classList.toggle('expanded', willExpand);
        toggleBtn.setAttribute('aria-expanded', willExpand);
        
        // Update chevron icon
        const icon = toggleBtn.querySelector('i');
        if (icon) {
          icon.className = willExpand ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
        }
        
        // Animate content
        if (willExpand) {
          content.style.display = 'block';
          requestAnimationFrame(() => {
            content.style.maxHeight = content.scrollHeight + 'px';
            content.style.opacity = '1';
          });
        } else {
          content.style.maxHeight = '0';
          content.style.opacity = '0';
          setTimeout(() => {
            if (!section.classList.contains('expanded')) {
              content.style.display = 'none';
            }
          }, 300);
        }
      };
      
      // Click on header or button
      header.addEventListener('click', (e) => {
        if (e.target.closest('.section-toggle-btn') || e.target === header) {
          toggle();
        }
      });
      
      // Prevent toggle when clicking inside content
      content.addEventListener('click', (e) => {
        e.stopPropagation();
      });
    });
  }

  // Initialize when page loads
  initialize();
  initializeModalHandlers();

})();

