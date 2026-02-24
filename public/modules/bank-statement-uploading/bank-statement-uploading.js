/* Bank Statement Uploading Module */

(function () {
  'use strict';

  // Form state
  let formState = {
    mode: 'view', // view, add, edit
    currentData: null
  };

  const form = document.getElementById('bank-statement-uploading-form');
  const formElements = {
    branchId: document.getElementById('branchId'),
    batchNo: document.getElementById('batchNo'),
    formatId: document.getElementById('formatId'),
    glAccountId: document.getElementById('glAccountId'),
    glAccountName: document.getElementById('glAccountName'),
    stmtFromDate: document.getElementById('stmtFromDate'),
    stmtToDate: document.getElementById('stmtToDate'),
    closingBalance: document.getElementById('closingBalance'),
    batchStatus: document.getElementById('batchStatus')
  };

  const buttons = {
    viewError: document.getElementById('viewErrorBtn'),
    showStatement: document.getElementById('showStatementBtn'),
    upload: document.getElementById('uploadBtn'),
    view: document.getElementById('viewBtn'),
    add: document.getElementById('addBtn'),
    edit: document.getElementById('editBtn'),
    delete: document.getElementById('deleteBtn'),
    save: document.getElementById('saveBtn'),
    cancel: document.getElementById('cancelBtn')
  };

  /**
   * Initialize the module
   */
  async function initializeModule() {
    console.log('[BankStatementUploading] Initializing module...');

    // Load services
    await loadServices();

    // Bind event listeners
    bindEventListeners();

    console.log('[BankStatementUploading] Module initialized successfully');
  }

  /**
   * Load required services
   */
  async function loadServices() {
    try {
      console.log('[BankStatementUploading] Loading services...');
      
      // Check if CoreApi is available
      if (!window.CoreApi) {
        throw new Error('CoreApi not loaded. Please ensure coreApi.js is included before this module.');
      }
      console.log('[BankStatementUploading] CoreApi available');

      // Check if OtherModuleService is available
      if (!window.OtherModuleService) {
        throw new Error('OtherModuleService not loaded. Please ensure otherModuleService.js is included before this module.');
      }
      console.log('[BankStatementUploading] OtherModuleService available');

      console.log('[BankStatementUploading] Services loaded successfully');
    } catch (error) {
      console.error('[BankStatementUploading] Error loading services:', error);
      console.error('[BankStatementUploading] Error stack:', error.stack);
      showSnackbar('Failed to load required services: ' + error.message, 'error');
      throw error; // Re-throw to prevent module from appearing to work
    }
  }

  /**
   * Bind event listeners to buttons
   */
  function bindEventListeners() {
    if (buttons.view) {
      buttons.view.addEventListener('click', handleViewAction);
    }
    if (buttons.add) {
      buttons.add.addEventListener('click', handleAddAction);
    }
    if (buttons.edit) {
      buttons.edit.addEventListener('click', handleEditAction);
    }
    if (buttons.delete) {
      buttons.delete.addEventListener('click', handleDeleteAction);
    }
    if (buttons.save) {
      buttons.save.addEventListener('click', handleSaveAction);
    }
    if (buttons.cancel) {
      buttons.cancel.addEventListener('click', handleCancelAction);
    }
    if (buttons.upload) {
      buttons.upload.addEventListener('click', handleUploadAction);
    }
    if (buttons.showStatement) {
      buttons.showStatement.addEventListener('click', handleShowStatementAction);
    }
    if (buttons.viewError) {
      buttons.viewError.addEventListener('click', handleViewErrorAction);
    }
  }

  /**
   * Handle View button click
   */
  async function handleViewAction() {

    const branchId = formElements.branchId?.value?.trim();
    const batchNo = formElements.batchNo?.value?.trim();

    if (!branchId) {
      showSnackbar('Please enter Branch ID', 'error');
      formElements.branchId?.focus();
      return;
    }

    if (!batchNo) {
      showSnackbar('Please enter Batch No.', 'error');
      formElements.batchNo?.focus();
      return;
    }

    await loadBankStatement();
  }

  /**
   * Load bank statement data from API
   */
  async function loadBankStatement() {
    console.log('[BankStatementUploading] loadBankStatement called');
    
    if (!window.OtherModuleService) {
      console.error('[BankStatementUploading] Service not available - attempting to reload...');
      showSnackbar('Service not available. Reloading services...', 'error');
      
      try {
        await loadServices();
        if (!window.OtherModuleService) {
          showSnackbar('Failed to load service. Please refresh the page.', 'error');
          return;
        }
      } catch (error) {
        console.error('[BankStatementUploading] Failed to reload services:', error);
        showSnackbar('Failed to load service. Please refresh the page.', 'error');
        return;
      }
    }

    try {
      // Build request data matching the exact format
      const requestData = {
        BankID:  '00',
        OurBranchID: formElements.branchId?.value?.trim() || '',
        BatchNo: formElements.batchNo?.value?.trim() || '',
        OperatorID: 'CSADM'
      };

      console.log('[BankStatementUploading] Request data structure:');
      console.log('  BankID:', requestData.BankID);
      console.log('  OurBranchID:', requestData.OurBranchID);
      console.log('  BatchNo:', requestData.BatchNo);
      console.log('  OperatorID:', requestData.OperatorID);
      console.log('[BankStatementUploading] Full request:', JSON.stringify(requestData, null, 2));

      showSnackbar('Loading bank statement...', 'info');

      const result = await OtherModuleService.getBankStatement(requestData);

      console.log('[BankStatementUploading] API Response:', result);

      if (result && result.success) {
        // API returns data as an array, get first element
        const dataRecord = Array.isArray(result.data) ? result.data[0] : result.data;
        formState.currentData = dataRecord;
        console.log('[BankStatementUploading] Response data to patch:', dataRecord);
        patchFormFields(dataRecord);
        showSnackbar('Bank statement loaded successfully', 'success');
      } else {
        const errorMessage = result?.message || 'No data found';
        console.warn('[BankStatementUploading] API returned non-success:', errorMessage);
        showSnackbar(errorMessage, 'error');
      }
    } catch (error) {
      console.error('[BankStatementUploading] Error loading bank statement:', error);
      console.error('[BankStatementUploading] Error details:', error.message);
      showSnackbar('Failed to load bank statement: ' + error.message, 'error');
    }
  }

  /**
   * Patch form fields with data from API response
   */
  function patchFormFields(data) {
    if (!data) return;

    console.log('[BankStatementUploading] Patching form fields with:', data);
    console.log('[BankStatementUploading] Available keys in response:', Object.keys(data));

    // Map API fields to form fields (actual field names from API response)
    const fieldMappings = {
      branchId: ['OurBranchID', 'BranchID', 'ourBranchID', 'branchId', 'branch_id'],
      batchNo: ['BatchNo', 'batchNo', 'batch_no'],
      closingBalance: ['ClosingBalance', 'closingBalance'],
      batchStatus: ['Status', 'BatchStatus', 'batchStatus'],
      formatId: ['FormatID', 'formatID', 'formatId'],
      glAccountId: ['AccountID', 'accountID', 'BankID', 'GLAccountID'],
      glAccountName: ['GLAccountName', 'glAccountName', 'AccountName'],
      stmtFromDate: ['StatementFromDate', 'StmtFromDate', 'statementFromDate'],
      stmtToDate: ['StatementToDate', 'StmtToDate', 'statementToDate']
    };

    // Patch each field
    Object.keys(fieldMappings).forEach(fieldKey => {
      const element = formElements[fieldKey];
      if (!element) {
        console.warn(`[BankStatementUploading] Form element not found: ${fieldKey}`);
        return;
      }

      const possibleKeys = fieldMappings[fieldKey];
      let valueFound = false;
      for (const key of possibleKeys) {
        if (data[key] !== undefined && data[key] !== null && data[key] !== '') {
          // Format date values for date input fields - extract date without timestamp
          if ((fieldKey === 'stmtFromDate' || fieldKey === 'stmtToDate') && data[key]) {
            element.value = String(data[key]).split('T')[0];
          } else {
            element.value = data[key];
          }
          valueFound = true;
          break;
        }
      }

    });
  }

  /**
   * Handle Add button click
   */
  function handleAddAction() {
    console.log('[BankStatementUploading] Add button clicked');
    formState.mode = 'add';
    clearForm();
    showSnackbar('Add mode enabled', 'info');
  }

  /**
   * Handle Edit button click
   */
  function handleEditAction() {
    console.log('[BankStatementUploading] Edit button clicked');
    if (!formState.currentData) {
      showSnackbar('Please load data first using View button', 'error');
      return;
    }
    formState.mode = 'edit';
    showSnackbar('Edit mode enabled', 'info');
  }

  /**
   * Handle Delete button click
   */
  async function handleDeleteAction() {
    console.log('[BankStatementUploading] Delete button clicked');
    
    if (!formState.currentData) {
      showSnackbar('Please load data first using View button', 'error');
      return;
    }

    const confirmed = confirm('Are you sure you want to delete this bank statement?');
    if (!confirmed) return;

    try {
      const requestData = {
        BankID: formElements.glAccountId?.value?.trim() || '',
        OurBranchID: formElements.branchId?.value?.trim() || '',
        BatchNo: formElements.batchNo?.value?.trim() || '',
        OperatorID: 'CSADM'
      };

      const result = await OtherModuleService.deleteBankStatement(requestData);

      if (result && result.success) {
        showSnackbar('Bank statement deleted successfully', 'success');
        clearForm();
        formState.currentData = null;
      } else {
        const errorMessage = result?.message || 'Delete failed';
        showSnackbar(errorMessage, 'error');
      }
    } catch (error) {
      console.error('[BankStatementUploading] Error deleting:', error);
      showSnackbar('Failed to delete bank statement', 'error');
    }
  }

  /**
   * Handle Save button click
   */
  async function handleSaveAction(e) {
    e.preventDefault();
    console.log('[BankStatementUploading] Save button clicked');

    const branchId = formElements.branchId?.value?.trim();
    const batchNo = formElements.batchNo?.value?.trim();

    if (!branchId || !batchNo) {
      showSnackbar('Please fill in required fields', 'error');
      return;
    }

    try {
      const requestData = {
        BankID: formElements.glAccountId?.value?.trim() || '',
        OurBranchID: branchId,
        BatchNo: batchNo,
        FormatID: formElements.formatId?.value?.trim() || '',
        ClosingBalance: formElements.closingBalance?.value?.trim() || '',
        OperatorID: 'CSADM'
      };

      const result = await OtherModuleService.saveBankStatement(requestData);

      if (result && result.success) {
        showSnackbar('Bank statement saved successfully', 'success');
        formState.mode = 'view';
      } else {
        const errorMessage = result?.message || 'Save failed';
        showSnackbar(errorMessage, 'error');
      }
    } catch (error) {
      console.error('[BankStatementUploading] Error saving:', error);
      showSnackbar('Failed to save bank statement', 'error');
    }
  }

  /**
   * Handle Cancel button click
   */
  function handleCancelAction() {
    console.log('[BankStatementUploading] Cancel button clicked');
    formState.mode = 'view';
    if (formState.currentData) {
      patchFormFields(formState.currentData);
      showSnackbar('Changes cancelled', 'info');
    } else {
      clearForm();
    }
  }

  /**
   * Handle Upload button click
   */
  async function handleUploadAction() {
    console.log('[BankStatementUploading] Upload button clicked');
    showSnackbar('Upload functionality coming soon', 'info');
    // TODO: Implement file upload
  }

  /**
   * Handle Show Statement button click
   */
  function handleShowStatementAction() {
    console.log('[BankStatementUploading] Show Statement button clicked');
    showSnackbar('Show statement functionality coming soon', 'info');
    // TODO: Implement show statement
  }

  /**
   * Handle View Error button click
   */
  function handleViewErrorAction() {
    console.log('[BankStatementUploading] View Error button clicked');
    showSnackbar('View error functionality coming soon', 'info');
    // TODO: Implement view error
  }

  /**
   * Clear all form fields
   */
  function clearForm() {
    Object.values(formElements).forEach(element => {
      if (element && element.tagName === 'INPUT') {
        if (element.id !== 'branchId') { // Keep branch ID
          element.value = '';
        }
      } else if (element && element.tagName === 'SELECT') {
        element.selectedIndex = 0;
      }
    });
  }

  /**
   * Show snackbar notification
   */
  function showSnackbar(message, type = 'info') {
    const snackbar = document.getElementById('snackbar');
    if (!snackbar) {
      console.warn('[BankStatementUploading] Snackbar element not found');
      console.log(`[${type.toUpperCase()}] ${message}`);
      return;
    }

    snackbar.textContent = message;
    snackbar.className = 'snackbar show';

    // Add type-specific class
    if (type === 'error') {
      snackbar.classList.add('snackbar-error');
    } else if (type === 'success') {
      snackbar.classList.add('snackbar-success');
    } else {
      snackbar.classList.add('snackbar-info');
    }

    // Auto-hide after 3 seconds
    setTimeout(() => {
      snackbar.className = 'snackbar';
    }, 3000);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeModule);
  } else {
    initializeModule();
  }

})();
