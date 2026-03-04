(function () {
  // ============================================
  // STATE MANAGEMENT
  // ============================================
  const FormState = {
    INIT: 'INIT',
    VIEW: 'VIEW',
    EDIT: 'EDIT'
  };

  let currentState = FormState.INIT;

  // Store current record data for edit
  let currentRecordData = null;
  let currentAuditData = null;

  // DOM references for buttons
  let btnView, btnEdit, btnSave, btnCancel;

  // ============================================
  // UTILITIES
  // ============================================
  function getParentFieldValue(fieldId) {
    try {
      return window.parent?.document?.getElementById(fieldId)?.value?.trim?.() || '';
    } catch (_) {
      return '';
    }
  }

  function getOperatorId() {
    return localStorage.getItem('OperatorID') || 'SYSTEM';
  }

  function showMessage(message, type = 'info') {
    // Also update message bar if it exists
    const msgBar = document.querySelector('.de-message-bar');
    const msgText = msgBar?.querySelector('span');
    const msgIcon = msgBar?.querySelector('i');
    
    if (msgBar && msgText && msgIcon) {
      msgText.textContent = message;
      msgBar.setAttribute('aria-label', message);
      
      msgIcon.className = type === 'error' ? 'bi bi-exclamation-circle' : 
                          type === 'success' ? 'bi bi-check-circle' :
                          'bi bi-info-circle';
      
      msgBar.style.display = 'flex';
      
      if (type !== 'error') {
        setTimeout(() => { msgBar.style.display = 'none'; }, 5000);
      }
    }

    // Map type to variant
    const variantMap = {
      'error': 'danger',
      'success': 'success',
      'warning': 'warning',
      'info': 'info'
    };
    
    // Show kairo-toast notification
    showSystemToast(message, { 
      title: type === 'error' ? 'Error' : type === 'success' ? 'Success' : 'Notice', 
      variant: variantMap[type] || 'info',
      timeoutMs: type === 'error' ? 8000 : 5000
    });
  }

  /**
   * Ensure toast container exists
   */
  function ensureToastContainer() {
    let el = document.querySelector('[data-kairo-toast-container]');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
  }

  /**
   * Show kairo-style toast notification
   */
  function showSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();
    
    // Limit to one toast at a time - remove existing
    const existingToasts = container.querySelectorAll('.kairo-toast');
    existingToasts.forEach(t => t.remove());

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const titleEl = document.createElement('div');
    titleEl.className = 'kairo-toast__title';
    titleEl.textContent = title;

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    const closeBtn = document.createElement('button');
    closeBtn.className = 'kairo-toast__close';
    closeBtn.innerHTML = '&times;';
    closeBtn.setAttribute('aria-label', 'Close');

    toast.appendChild(titleEl);
    toast.appendChild(body);
    toast.appendChild(closeBtn);
    container.appendChild(toast);

    const remove = () => {
      try {
        toast.classList.remove('is-show');
        setTimeout(() => toast.remove(), 160);
      } catch {
        // ignore
      }
    };

    closeBtn.addEventListener('click', remove);
    setTimeout(() => toast.classList.add('is-show'), 10);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  function setStatus(message) {
    const statusBar = document.querySelector('.de-status-bar');
    if (statusBar) statusBar.textContent = message;
  }

  function showLoading(show = true) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.hidden = !show;
  }

  // ============================================
  // BUTTON STATE MANAGEMENT
  // ============================================
  function setButtonState(state) {
    currentState = state;
    console.log('[Activate Dormant] State changed to:', state);

    // Get form inputs
    const formInputs = document.querySelectorAll('.form-content input:not([readonly]), .form-content textarea, .form-content select');

    switch (state) {
      case FormState.INIT:
        // Only View is enabled
        if (btnView) btnView.disabled = false;
        if (btnEdit) btnEdit.disabled = true;
        if (btnSave) btnSave.disabled = true;
        if (btnCancel) btnCancel.disabled = true;
        formInputs.forEach(el => el.disabled = true);
        setStatus('Ready - Click View to load record');
        break;

      case FormState.VIEW:
        // View, Edit, and Cancel are enabled
        if (btnView) btnView.disabled = false;
        if (btnEdit) btnEdit.disabled = false;
        if (btnSave) btnSave.disabled = true;
        if (btnCancel) btnCancel.disabled = false;
        formInputs.forEach(el => el.disabled = true);
        setStatus('View mode');
        break;

      case FormState.EDIT:
        // Save and Cancel are enabled
        if (btnView) btnView.disabled = true;
        if (btnEdit) btnEdit.disabled = true;
        if (btnSave) btnSave.disabled = false;
        if (btnCancel) btnCancel.disabled = false;
        formInputs.forEach(el => el.disabled = false);
        setStatus('Edit mode - Make changes and Save');
        break;
    }
  }

  // ============================================
  // ACTION HANDLERS
  // ============================================
  async function handleView() {
    console.log('[Activate Dormant] View clicked');
    
    const branchId = document.getElementById('branchId')?.value?.trim();
    const accountId = document.getElementById('accountId')?.value?.trim();

    if (!branchId || !accountId) {
      showMessage('Please enter Branch ID and Account ID', 'error');
      return;
    }

    showLoading(true);
    setStatus('Loading dormant account data...');

    try {
      const requestData = {
        OurBranchID: branchId,
        AccountID: accountId,
        OperatorID: getOperatorId()
      };

      const response = await window.AccountActivateDormantService.getAccountDormant(requestData);
      console.log('[Activate Dormant] Full API Response:', JSON.stringify(response, null, 2));

      if (response.success) {
        // Data is in Details01 array (not Details which has audit info)
        const details01 = response.Details01 || response.data?.Details01 || [];
        const details = response.Details || response.data?.Details || [];
        
        const data = Array.isArray(details01) && details01.length > 0 
          ? details01[0] 
          : null;
        const auditData = Array.isArray(details) && details.length > 0 
          ? details[0] 
          : null;
        
        console.log('[Activate Dormant] Extracted data:', data);
        console.log('[Activate Dormant] Extracted audit data:', auditData);
        
        if (data) {
          currentRecordData = data; // Store for edit
          currentAuditData = auditData; // Store audit data with UpdateCount
          populateFormData(data, auditData);
          setButtonState(FormState.VIEW);
          showMessage('Record loaded successfully', 'success');
        } else {
          showMessage('No dormant account data found', 'error');
        }
      } else {
        showMessage(response.message || 'No dormant account data found', 'error');
      }
    } catch (error) {
      console.error('[Activate Dormant] Error loading data:', error);
      showMessage('Failed to load dormant account data: ' + error.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  /**
   * Populate form fields with data from API response
   * @param {Object} data - The account dormant data from Details01
   * @param {Object} auditData - The audit data from Details
   */
  function populateFormData(data, auditData) {
    if (!data) return;
    
    console.log('[Activate Dormant] Populating form with data keys:', Object.keys(data));
    console.log('[Activate Dormant] Data values:', data);
    console.log('[Activate Dormant] Audit data:', auditData);

    // Account identification
    setFieldValue('branchId', data.OurBranchID || data.BranchID || '');
    setFieldValue('branchName', data.BranchName || '');
    setFieldValue('accountId', data.AccountID || '');
    setFieldValue('accountName', data.AccountName || '');

    // Activation details - check both data and auditData sources
    const instructedBy = data.InstructedBy || auditData?.InstructedBy || '';
    const comments = data.Comments || data.Description || auditData?.Comments || auditData?.Description || '';
    setFieldValue('instructedBy', instructedBy);
    setFieldValue('comments', comments);

    // Behind The Scene fields - from Details01
    const dormantDateValue = data.Dormantdate || data.DormantDate;
    setAuditValue('dormantDate', dormantDateValue ? formatDate(dormantDateValue) : '-');
    
    // Product information
    const originalProduct = data.OriginalProductID && data.OriginalproductName 
      ? `${data.OriginalProductID} - ${data.OriginalproductName}` 
      : (data.OriginalProductID || data.OriginalproductName || '-');
    setAuditValue('originalProduct', originalProduct);
    
    const dormantProduct = data.DormantProductID && data.DormantproductName 
      ? `${data.DormantProductID} - ${data.DormantproductName}` 
      : (data.DormantProductID || data.DormantproductName || '-');
    setAuditValue('dormantProduct', dormantProduct);
    
    // Balance and amounts
    setAuditValue('balance', formatAmount(data.Balance));
    setAuditValue('lastCreditDate', data.LastCreditTrxDate ? formatDate(data.LastCreditTrxDate) : '-');
    setAuditValue('creditAmount', formatAmount(data.CreditAmount));
    setAuditValue('lastDebitDate', data.LastDebitTrxDate ? formatDate(data.LastDebitTrxDate) : '-');
    setAuditValue('debitAmount', formatAmount(data.DebitAmout)); // Note: API typo "DebitAmout"

    // Fixed amount - show 0.00 format when value exists or is 0
    const fixedAmountValue = data.FixedAmount;
    if (fixedAmountValue !== null && fixedAmountValue !== undefined && fixedAmountValue !== '') {
      setAuditValue('fixedAmount', formatAmount(fixedAmountValue));
    } else {
      setAuditValue('fixedAmount', '-');
    }
  }

  /**
   * Format amount for display
   */
  function formatAmount(value) {
    if (value === null || value === undefined || value === '') return '-';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  /**
   * Set form field value
   */
  function setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (field) {
      field.value = value;
      console.log(`[Activate Dormant] Set ${fieldId} = "${value}"`);
    } else {
      console.warn(`[Activate Dormant] Field not found: ${fieldId}`);
    }
  }

  /**
   * Set audit span value
   */
  function setAuditValue(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = value || '-';
      console.log(`[Activate Dormant] Set audit ${elementId} = "${value || '-'}"`);
    } else {
      console.warn(`[Activate Dormant] Audit element not found: ${elementId}`);
    }
  }

  /**
   * Format date for display using GlobalUtils (DD-MMM-YYYY)
   */
  function formatDate(dateStr) {
    if (!dateStr || dateStr === '-') return '-';
    // Use GlobalUtils.formatDate for consistent formatting across app
    if (window.GlobalUtils && window.GlobalUtils.formatDate) {
      const formatted = window.GlobalUtils.formatDate(dateStr);
      return formatted || '-';
    }
    // Fallback if GlobalUtils not available
    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return dateStr;
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const day = String(date.getDate()).padStart(2, '0');
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}-${month}-${year}`;
    } catch {
      return dateStr;
    }
  }

  function handleEdit() {
    console.log('[Activate Dormant] Edit clicked');
    setButtonState(FormState.EDIT);
  }

  async function handleSave() {
    console.log('[Activate Dormant] Save clicked');
    
    const branchId = document.getElementById('branchId')?.value?.trim();
    const accountId = document.getElementById('accountId')?.value?.trim();
    const instructedBy = document.getElementById('instructedBy')?.value?.trim();
    const comments = document.getElementById('comments')?.value?.trim();

    // Validation checks with user-friendly messages
    if (!branchId || !accountId) {
      showMessage('Please enter Branch ID and Account ID', 'error');
      return;
    }

    if (!instructedBy) {
      showMessage('Please enter who instructed the activation', 'error');
      return;
    }

    if (!currentRecordData) {
      showMessage('No dormant record loaded. Please click View first to load the account data.', 'error');
      return;
    }

    if (!currentRecordData.ReferenceID) {
      showMessage('Invalid dormant record. Reference ID is missing. Please reload the data.', 'error');
      return;
    }

    // Check if account might already be activated
    if (currentRecordData.ActivatedDate || currentRecordData.ActivatedOn) {
      showMessage('This account appears to already be activated. Please verify.', 'error');
      return;
    }

    showLoading(true);
    setStatus('Saving changes...');

    try {
      const operatorId = getOperatorId();
      const now = new Date().toISOString().split('.')[0]; // Format: YYYY-MM-DDTHH:mm:ss

      // Use ReferenceID from loaded dormant data
      const referenceID = parseInt(currentRecordData?.ReferenceID || 0, 10);
      const trxRowID = parseFloat(currentRecordData?.TrxRowID || 0);
      // NewRecord: 0 = editing existing dormant record to activate it
      const isNewRecord = 0;

      console.log('[Activate Dormant] Current record data:', currentRecordData);
      console.log('[Activate Dormant] ReferenceID:', referenceID, 'TrxRowID:', trxRowID, 'NewRecord:', isNewRecord);

      const requestData = {
        OurBranchID: branchId,
        AccountID: accountId,
        ReferenceID: referenceID,
        ActivatedDate: now,
        ActivatedBy: operatorId,
        InstructedBy: instructedBy,
        Comments: comments || '',
        TrxRowID: trxRowID,
        ModifiedOn: now,
        SupervisedBy: operatorId,
        NewRecord: isNewRecord
      };

      console.log('[Activate Dormant] Save request data:', requestData);

      const response = await window.AccountActivateDormantService.editAccountDormant(requestData);
      console.log('[Activate Dormant] Save response:', response);

      if (response.success) {
        showMessage('Account activated successfully', 'success');
        // Clear form and reset to initial state - only View button active
        clearForm();
        currentRecordData = null;
        currentAuditData = null;
        setButtonState(FormState.INIT);
      } else {
        // Parse and display user-friendly error messages
        const errorMsg = parseErrorMessage(response.message || response.code);
        showMessage(errorMsg, 'error');
      }
    } catch (error) {
      console.error('[Activate Dormant] Save error:', error);
      showMessage('Failed to save: ' + error.message, 'error');
    } finally {
      showLoading(false);
    }
  }

  /**
   * Parse backend error messages and return user-friendly text
   */
  function parseErrorMessage(message) {
    if (!message) return 'An unknown error occurred';
    
    const errorMap = {
      'BREXDB621101': 'This account has already been activated. Cannot activate again.',
      'BREXDB005305': 'No matching dormant record found. Please verify the account details.',
      'Please enter valid Refence ID': 'This account has already been activated or the dormant record no longer exists. Please try a different account.',
      'Edit already done by another User': 'This record is being edited by another user. Please refresh and try again.'
    };

    // Check for known error codes/messages
    for (const [key, value] of Object.entries(errorMap)) {
      if (message.includes(key)) {
        return value;
      }
    }

    return message; // Return original if no mapping found
  }

  /**
   * Clear all form fields and reset to initial state
   */
  function clearForm() {
    // Clear form inputs
    setFieldValue('branchId', '');
    setFieldValue('branchName', '');
    setFieldValue('accountId', '');
    setFieldValue('accountName', '');
    setFieldValue('instructedBy', '');
    setFieldValue('comments', '');

    // Reset Behind The Scene fields to default values
    setAuditValue('dormantDate', '-');
    setAuditValue('originalProduct', '-');
    setAuditValue('dormantProduct', '-');
    setAuditValue('balance', '-');
    setAuditValue('lastCreditDate', '-');
    setAuditValue('creditAmount', '-');
    setAuditValue('lastDebitDate', '-');
    setAuditValue('debitAmount', '-');
    setAuditValue('fixedAmount', '-');
  }

  function handleCancel() {
    console.log('[Activate Dormant] Cancel clicked');
    // If in EDIT mode, revert to view; if in VIEW mode, clear form
    if (currentState === FormState.EDIT && currentRecordData) {
      populateFormData(currentRecordData, currentAuditData);
      setButtonState(FormState.VIEW);
      showMessage('Changes cancelled', 'info');
    } else {
      clearForm();
      setButtonState(FormState.INIT);
      showMessage('Form cleared', 'info');
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  function initializeForm() {
    console.log('[Activate Dormant] Initializing form');

    // Initialize button references
    btnView = document.querySelector('[data-action="view"]');
    btnEdit = document.querySelector('[data-action="edit"]');
    btnSave = document.querySelector('[data-action="save"]');
    btnCancel = document.querySelector('[data-action="cancel"]');

    // Populate branch and account from parent form if available
    const parentBranchId = getParentFieldValue('branchId') || getParentFieldValue('BranchID');
    const parentBranchName = getParentFieldValue('branchName') || getParentFieldValue('BranchName');
    const parentAccountId = getParentFieldValue('accountId') || getParentFieldValue('AccountID');
    const parentAccountName = getParentFieldValue('accountName') || getParentFieldValue('AccountName');

    if (parentBranchId) {
      document.getElementById('branchId').value = parentBranchId;
    }
    
    if (parentBranchName) {
      document.getElementById('branchName').value = parentBranchName;
    }

    if (parentAccountId) {
      document.getElementById('accountId').value = parentAccountId;
    }
    
    if (parentAccountName) {
      document.getElementById('accountName').value = parentAccountName;
    }

    // Wire window controls
    wireWindowControls();

    // Wire action buttons
    wireActionButtons();

    // Set initial state - only View enabled
    setButtonState(FormState.INIT);

    // Notify parent form that this module has opened
    try {
      window.parent.postMessage({ action: 'submoduleOpened', source: 'ActivateDormant' }, '*');
    } catch (_) {
      // ignore
    }
  }

  function wireActionButtons() {
    if (btnView) btnView.addEventListener('click', handleView);
    if (btnEdit) btnEdit.addEventListener('click', handleEdit);
    if (btnSave) btnSave.addEventListener('click', handleSave);
    if (btnCancel) btnCancel.addEventListener('click', handleCancel);
  }

  function wireWindowControls() {
    const buttons = document.querySelectorAll('[data-action]');
    buttons.forEach(btn => {
      const action = btn.getAttribute('data-action');

      if (action === 'refresh') {
        btn.addEventListener('click', () => {
          console.log('[Activate Dormant] Refresh clicked');
          location.reload();
        });
      } else if (action === 'maximize') {
        btn.addEventListener('click', () => {
          console.log('[Activate Dormant] Maximize clicked');
          window.parent.postMessage({ action: 'toggleSidebarForMaximize' }, '*');
        });
      } else if (action === 'close') {
        btn.addEventListener('click', () => {
          console.log('[Activate Dormant] Close clicked');
          window.parent.postMessage({ action: 'submoduleClosed', source: 'ActivateDormant' }, '*');
          setTimeout(() => {
            try {
              window.close();
            } catch (e) {
              console.log('[Activate Dormant] Could not close window:', e.message);
            }
          }, 100);
        });
      }
    });
  }

  // ============================================
  // DOCUMENT READY
  // ============================================
  document.addEventListener('DOMContentLoaded', initializeForm);
})();
