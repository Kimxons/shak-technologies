window.AccountActivationModule = (function () {
  // ============================================
  // STATE VARIABLES
  // ============================================
  let currentUpdateCount = 0; // Store UpdateCount from viewed record
  let currentActivationData = null; // Store full activation data from loaded record

  // ============================================
  // UTILITIES
  // ============================================
  function getParentFieldValue(fieldId) {
    try {
      const parentForm = window.parent.document;
      const field = parentForm.getElementById(fieldId);
      return field ? field.value : null;
    } catch (_) {
      return null;
    }
  }

  function getOperatorId() {
    return localStorage.getItem('OperatorID') || 'SYSTEM';
  }

  function showValidationSummary(message, type = 'error') {
    // Find the first form section content or form card
    const targetSection = document.querySelector('.form-card .section-content') || 
                          document.querySelector('.form-card');
    if (!targetSection) return;
    
    // Look for existing summary or create one
    let summary = targetSection.querySelector('.validation-summary');
    if (!summary) {
      summary = document.createElement('div');
      summary.className = 'validation-summary';
      summary.setAttribute('role', 'alert');
      summary.setAttribute('aria-live', 'polite');
      
      // Create icon
      const icon = document.createElement('i');
      icon.className = 'bi bi-exclamation-circle validation-summary__icon';
      
      // Create text
      const text = document.createElement('span');
      text.className = 'validation-summary__text';
      
      // Create close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'validation-summary__close';
      closeBtn.setAttribute('type', 'button');
      closeBtn.setAttribute('aria-label', 'Close notification');
      closeBtn.innerHTML = '<i class="bi bi-x"></i>';
      closeBtn.addEventListener('click', () => hideValidationSummary());
      
      summary.appendChild(icon);
      summary.appendChild(text);
      summary.appendChild(closeBtn);
      
      // Insert at the top of the section
      const content = targetSection.querySelector('.section-content');
      if (content) {
        content.insertBefore(summary, content.firstChild);
      } else {
        targetSection.insertBefore(summary, targetSection.firstChild);
      }
    }
    
    // Apply type styling
    if (type === 'success') {
      summary.classList.add('validation-summary--success');
      summary.querySelector('.validation-summary__icon').className = 'bi bi-check-circle validation-summary__icon';
    } else {
      summary.classList.remove('validation-summary--success');
      summary.querySelector('.validation-summary__icon').className = 'bi bi-exclamation-circle validation-summary__icon';
    }
    
    // Update message and show
    const textEl = summary.querySelector('.validation-summary__text');
    if (textEl) textEl.textContent = message;
    summary.classList.add('is-visible');
  }
  
  function hideValidationSummary() {
    const summaries = document.querySelectorAll('.validation-summary');
    summaries.forEach(s => {
      s.classList.remove('is-visible');
      setTimeout(() => s.remove(), 250);
    });
  }
  
  function showMessage(message, type = 'info') {
    if (type === 'error') {
      showValidationSummary(message, 'error');
    } else if (type === 'success') {
      showValidationSummary(message, 'success');
    } else {
      showValidationSummary(message, 'info');
    }
  }



  function showLoading(isLoading) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.hidden = !isLoading;
  }

  // ============================================
  // BUTTON STATE MANAGEMENT
  // ============================================
  function setButtonState(action, enabled) {
    const btn = document.querySelector(`[data-action="${action}"]`);
    if (btn) {
      btn.disabled = !enabled;
      btn.style.opacity = enabled ? '1' : '0.5';
      btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
    }
  }

  function setViewMode() {
    // After data load: Only Edit enabled, others disabled
    setButtonState('view', false);
    setButtonState('edit', true);
    setButtonState('save', false);
    setButtonState('cancel', false);
    
    // Disable editable fields
    const instructedBy = document.getElementById('instructedBy');
    const comments = document.getElementById('comments');
    if (instructedBy) {
      instructedBy.readOnly = true;
      instructedBy.style.cursor = 'default';
    }
    if (comments) {
      comments.readOnly = true;
      comments.style.cursor = 'default';
    }
    
    console.log('[Account Activation] Set to VIEW mode');
  }

  function setEditMode() {
    // When Edit clicked: Enable Save, disable View and Edit
    setButtonState('view', false);
    setButtonState('edit', false);
    setButtonState('save', true);
    setButtonState('cancel', true);
    
    // Enable editable fields
    const instructedBy = document.getElementById('instructedBy');
    const comments = document.getElementById('comments');
    if (instructedBy) {
      instructedBy.readOnly = false;
      instructedBy.style.cursor = 'text';
      // Set focus to Instructed By
      setTimeout(() => {
        instructedBy.focus();
        instructedBy.select();
      }, 100);
    }
    if (comments) {
      comments.readOnly = false;
      comments.style.cursor = 'text';
    }
    
    console.log('[Account Activation] Set to EDIT mode');
  }

  function enableEditButton() {
    setButtonState('edit', true);
    console.log('[Account Activation] Edit button enabled');
  }

  function disableEditButton() {
    setButtonState('edit', false);
    console.log('[Account Activation] Edit button disabled');
  }

  // ============================================
  // DATA LOADING
  // ============================================
  function loadAccountActivationData() {
    const branchId = document.getElementById('branchId')?.value?.trim();
    const accountId = document.getElementById('accountId')?.value?.trim();

    if (!branchId || !accountId) {
      showMessage('Please select both Branch and Account', 'error');
      return;
    }

    showLoading(true);

    const requestData = {
      OurBranchID: branchId,
      AccountID: accountId,
      OperatorID: getOperatorId()
    };

    console.log('[Account Activation] Loading activation data with:', requestData);

    AccountService.getAccountActivation(requestData)
      .then(response => {
        showLoading(false);
        console.log('[Account Activation] Response:', response);

        if (response && response.success) {
          // Response structure: 
          // { success: true, message: "...", Details: [...], data: { Details01: [...], Details02: [...] } }
          // Details01 contains the account activation data
          let details = null;
          
          if (response.data && response.data.Details01 && response.data.Details01[0]) {
            details = response.data.Details01[0];
          } else if (response.data && response.data.Details02 && response.data.Details02[0]) {
            details = response.data.Details02[0];
          } else if (response.Details && response.Details[0]) {
            details = response.Details[0];
          }
          
          if (details) {
            currentActivationData = details; // Store the full data object
            populateActivationForm(details);
            setViewMode(); // Set initial state: only Edit enabled
            showMessage(response.message || 'Account activation data loaded successfully', 'success');
          } else {
            showMessage('No activation data found for this account', 'info');
            disableEditButton();
            // Disable all buttons if no data
            setButtonState('view', false);
            setButtonState('save', false);
            setButtonState('cancel', false);
          }
        } else {
          showMessage(response?.message || 'Failed to load account activation data', 'error');
          disableEditButton();
          // Disable all buttons on error
          setButtonState('view', false);
          setButtonState('save', false);
          setButtonState('cancel', false);
        }
      })
      .catch(error => {
        showLoading(false);
        showMessage(error.message || 'Error loading account activation data', 'error');
        console.error('[Account Activation] Error:', error);
        disableEditButton();
        // Disable all buttons on error
        setButtonState('view', false);
        setButtonState('save', false);
        setButtonState('cancel', false);
      });
  }

  function populateActivationForm(data) {
    console.log('[Account Activation] Populating form with:', data);
    console.log('[Account Activation] Full data object:', JSON.stringify(data, null, 2));

    // Account Identification fields
    setFieldValue('branchId', data.OurBranchID);
    setFieldValue('branchName', data.BranchName);
    setFieldValue('accountId', data.AccountID);
    setFieldValue('accountName', data.AccountName);

    // Main fields
    setFieldValue('instructedBy', data.InstructedBy || '');
    setFieldValue('comments', data.Comments || '');

    // Behind the Scene fields - map database fields to form fields
    const dormantDate = data.DormantDate || data.NewData || data.CreatedOn || '-';
    const originalProductId = data.ProductID || data.productName || '-';
    const dormantProductId = data.DormantProductID || data.productName || '-';
    // For amounts, check if value is 0 - show "0" instead of "-"
    const balanceValue = (data.Balance !== undefined && data.Balance !== null) ? data.Balance : 
                         (data.AvailableBalance !== undefined && data.AvailableBalance !== null) ? data.AvailableBalance : '-';
    const lastCreditDateValue = data.LastCreditToDate || data.LastCreditDate || data.CreatedOn || '-';
    const lastDebitDateValue = data.LastDebitDate || '-';
    const fixedAmountValue = (data.CreditAmount !== undefined && data.CreditAmount !== null) ? data.CreditAmount :
                             (data.Credit !== undefined && data.Credit !== null) ? data.Credit : '-';
    const fixedAmountId = data.FixedAmountID || '-';

    console.log('[Account Activation] Setting BTS fields:', {
      dormantDate,
      originalProductId,
      dormantProductId,
      balance: balanceValue,
      lastCreditDate: lastCreditDateValue,
      lastDebitDate: lastDebitDateValue,
      fixedAmount: fixedAmountValue,
      fixedAmountId
    });

    setFieldValue('dormantDate', dormantDate !== '-' ? GlobalUtils.formatDate(dormantDate) : '-');
    setFieldValue('originalProductId', originalProductId);
    setFieldValue('dormantProductId', dormantProductId);
    // Format balance and fixedAmount - show "0" or "0.00" for zero values
    if (balanceValue === '-' || balanceValue === null || balanceValue === undefined || balanceValue === '') {
      setFieldValue('balance', '-');
    } else {
      const balanceNum = parseFloat(balanceValue);
      setFieldValue('balance', isNaN(balanceNum) ? balanceValue : balanceNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
    setFieldValue('lastCreditDate', lastCreditDateValue !== '-' ? GlobalUtils.formatDate(lastCreditDateValue) : '-');
    setFieldValue('lastDebitDate', lastDebitDateValue !== '-' ? GlobalUtils.formatDate(lastDebitDateValue) : '-');
    // Format fixedAmount - show "0" or "0.00" for zero values
    if (fixedAmountValue === '-' || fixedAmountValue === null || fixedAmountValue === undefined || fixedAmountValue === '') {
      setFieldValue('fixedAmount', '-');
    } else {
      const fixedAmountNum = parseFloat(fixedAmountValue);
      setFieldValue('fixedAmount', isNaN(fixedAmountNum) ? fixedAmountValue : fixedAmountNum.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    }
    setFieldValue('fixedAmountId', fixedAmountId);

    // Store UpdateCount for edit operation
    currentUpdateCount = data.UpdateCount || 0;
  }

  function setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (!field) {
      console.warn(`[Account Activation] Field not found: ${fieldId}`);
      return;
    }

    // Amount fields that should show "0" instead of "-" when zero
    const amountFields = ['balance', 'fixedAmount'];
    const isAmountField = amountFields.includes(fieldId.toLowerCase());
    
    // Check if value is 0 (zero) for amount fields
    if (isAmountField && (value === 0 || value === '0' || value === '0.00')) {
      value = '0.00';
    } else if (value === null || value === undefined || value === '') {
      value = '-';
    }

    if (field.tagName === 'SPAN' || field.classList.contains('audit-value')) {
      field.textContent = value;
    } else {
      field.value = value;
    }
    console.log(`[Account Activation] Set ${fieldId} = ${value}`);
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  function initializeForm() {
    console.log('[Account Activation] Initializing form');

    // Set initial button states - all disabled except Edit (will be enabled after data load)
    setButtonState('view', false);
    setButtonState('edit', false);
    setButtonState('save', false);
    setButtonState('cancel', false);

    // Set fields to readonly initially
    const instructedBy = document.getElementById('instructedBy');
    const comments = document.getElementById('comments');
    if (instructedBy) {
      instructedBy.readOnly = true;
      instructedBy.style.cursor = 'default';
    }
    if (comments) {
      comments.readOnly = true;
      comments.style.cursor = 'default';
    }

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

    // Load account activation data if both branch and account are available
    if (parentBranchId && parentAccountId) {
      setTimeout(() => {
        loadAccountActivationData();
      }, 500);
    }

    // Notify parent form that this module has opened
    try {
      window.parent.postMessage({ action: 'submoduleOpened', source: 'Activation' }, '*');
    } catch (_) {
      // ignore
    }
  }

  function handleEdit() {
    console.log('[Account Activation] Edit clicked');
    setEditMode();
  }

  function formatDateTimeForAPI(date) {
    if (!date) return null;
    
    let d;
    if (date instanceof Date) {
      d = date;
    } else if (typeof date === 'string') {
      // Try parsing various date formats
      d = new Date(date);
      if (isNaN(d.getTime())) {
        // Try parsing MM/DD/YYYY format
        const parts = date.split(/[\/\s-]/);
        if (parts.length >= 3) {
          d = new Date(parts[2], parts[0] - 1, parts[1]);
        }
      }
    } else {
      d = new Date(date);
    }
    
    if (isNaN(d.getTime())) return null;
    
    // Format as MM/DD/YYYY HH:MM:SS
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  }

  function handleSave() {
    console.log('[Account Activation] Save clicked');
    
    // Get form values
    const instructedBy = document.getElementById('instructedBy')?.value?.trim();
    const comments = document.getElementById('comments')?.value?.trim();
    const branchId = document.getElementById('branchId')?.value?.trim();
    const accountId = document.getElementById('accountId')?.value?.trim();

    // Validation
    if (!instructedBy) {
      showMessage('Instructed By is required', 'error');
      document.getElementById('instructedBy')?.focus();
      return;
    }

    if (!branchId || !accountId) {
      showMessage('Branch ID and Account ID are required', 'error');
      return;
    }

    // Get values from parent form if not in current form
    const parentBranchId = branchId || getParentFieldValue('branchId') || getParentFieldValue('BranchID');
    const parentAccountId = accountId || getParentFieldValue('accountId') || getParentFieldValue('AccountID');
    
    // Get operator ID
    const operatorId = getOperatorId();
    const currentDate = new Date();
    
    // Determine if this is a new record or edit (0 = edit, 1 = new)
    // If we have loaded data, it's an edit, otherwise it's new
    const isNewRecord = currentActivationData ? 0 : 1;
    
    // Get values from loaded data if available, otherwise use defaults
    // Try multiple sources for ReferenceID: loaded data, parent form, or default to 0
    // Ensure it's a number (smallint)
    let referenceID = currentActivationData?.ReferenceID || 
                     currentActivationData?.ReferenceId || 
                     currentActivationData?.ID ||
                     getParentFieldValue('ReferenceID') ||
                     getParentFieldValue('ReferenceId') ||
                     null;
    
    // Convert to number, default to 0 if null/undefined
    referenceID = (referenceID !== null && referenceID !== undefined && referenceID !== '') 
                   ? parseInt(referenceID, 10) || 0 
                   : 0;
    
    const activatedDate = currentActivationData?.ActivatedDate || 
                         currentActivationData?.ActivatedOn || 
                         currentActivationData?.CreatedOn ||
                         formatDateTimeForAPI(currentDate);
    
    // Try multiple sources for TrxRowID: loaded data, parent form, or default to 0
    // Ensure it's a number (numeric)
    let trxRowID = currentActivationData?.TrxRowID || 
                  currentActivationData?.RowID || 
                  currentActivationData?.TransactionRowID ||
                  getParentFieldValue('TrxRowID') ||
                  getParentFieldValue('RowID') ||
                  null;
    
    // Convert to number, default to 0 if null/undefined
    trxRowID = (trxRowID !== null && trxRowID !== undefined && trxRowID !== '') 
               ? parseFloat(trxRowID) || 0 
               : 0;
    
    console.log('[Account Activation] Collected values:', {
      referenceID,
      trxRowID,
      activatedDate,
      currentActivationData: currentActivationData ? Object.keys(currentActivationData) : 'none'
    });

    showLoading(true);

    // Build request data according to the API specification
    // Only include fields that have values (or required defaults)
    const requestData = {
      OurBranchID: parentBranchId,
      AccountID: parentAccountId,
      ReferenceID: referenceID,
      ActivatedDate: formatDateTimeForAPI(activatedDate),
      ActivatedBy: operatorId,
      InstructedBy: instructedBy,
      Comments: comments || '',
      TrxRowID: trxRowID,
      ModifiedOn: formatDateTimeForAPI(currentDate),
      SupervisedBy: operatorId,
      NewRecord: isNewRecord
    };

    console.log('[Account Activation] Saving with data:', requestData);
    console.log('[Account Activation] Full request data:', JSON.stringify(requestData, null, 2));

    AccountService.editAccountActivation(requestData)
      .then(response => {
        showLoading(false);
        console.log('[Account Activation] Save response:', response);

        if (response && response.success) {
          showMessage(response.message || 'Account activation saved successfully', 'success');
          // Reload data and return to view mode
          loadAccountActivationData();
        } else {
          showMessage(response?.message || response?.ErrorMessage || 'Failed to save account activation', 'error');
        }
      })
      .catch(error => {
        showLoading(false);
        showMessage(error.message || 'Error saving account activation', 'error');
        console.error('[Account Activation] Save error:', error);
      });
  }

  function handleCancel() {
    console.log('[Account Activation] Cancel clicked');
    // Reload data to reset form and return to view mode
    loadAccountActivationData();
  }

  function wireWindowControls() {
    const buttons = document.querySelectorAll('[data-action]');
    buttons.forEach(btn => {
      const action = btn.getAttribute('data-action');

      if (action === 'view') {
        btn.addEventListener('click', () => {
          console.log('[Account Activation] View clicked');
          loadAccountActivationData();
        });
      } else if (action === 'edit') {
        btn.addEventListener('click', handleEdit);
      } else if (action === 'save') {
        btn.addEventListener('click', handleSave);
      } else if (action === 'cancel') {
        btn.addEventListener('click', handleCancel);
      } else if (action === 'refresh') {
        btn.addEventListener('click', () => {
          console.log('[Account Activation] Refresh clicked');
          location.reload();
        });
      } else if (action === 'maximize') {
        btn.addEventListener('click', () => {
          console.log('[Account Activation] Maximize clicked');
          window.parent.postMessage({ action: 'toggleSidebarForMaximize' }, '*');
        });
      } else if (action === 'close') {
        btn.addEventListener('click', () => {
          console.log('[Account Activation] Close clicked');
          // Clear all validation summaries before closing
          hideValidationSummary();
          window.parent.postMessage({ action: 'submoduleClosed', source: 'Activation' }, '*');
          setTimeout(() => {
            try {
              window.close();
            } catch (e) {
              console.log('[Account Activation] Could not close window:', e.message);
            }
          }, 100);
        });
      }
    });
  }

  // ============================================
  // PUBLIC API
  // ============================================
  return {
    init: initializeForm,
    save: handleSave,
    edit: handleEdit,
    cancel: handleCancel,
    refresh: loadAccountActivationData || (() => location.reload())
  };
})();

