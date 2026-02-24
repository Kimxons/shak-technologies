/**
 * GRT Details - Data Entry Page Logic
 */
(function () {
  'use strict';

  const ActionState = {
    INITIAL: 'initial',
    VIEW: 'view',
    ADD: 'add',
    EDIT: 'edit'
  };

  let currentState = ActionState.INITIAL;

  /**
   * Parent context - Branch ID and Center ID from Center Maintenance
   */
  let parentContext = {
    branchId: '',
    branchName: '',
    centerId: '',
    centerName: ''
  };

  /**
   * Cached scheme data from search results
   */
  let cachedSchemes = [];

  /**
   * UpdateCount from fetched GRT details (used for edit operations)
   */
  let fetchedUpdateCount = 0;

  /**
   * Flag to track if LookupService is loaded
   */
  let lookupServiceLoaded = false;

  /**
   * Flag to track if ConfirmationDialog is loaded
   */
  let confirmationDialogLoaded = false;

  /**
   * Load LookupService if not already loaded
   */
  async function ensureLookupServiceLoaded() {
    if (lookupServiceLoaded && window.LookupService) return true;

    try {
      if (window.ServiceLoader) {
        await window.ServiceLoader.loadCore();
        await window.ServiceLoader.loadScript('../../../../assets/js/services/shared/lookupService.js');
        lookupServiceLoaded = true;
        console.log('[GRT Details] LookupService loaded');
        return true;
      }
    } catch (error) {
      console.error('[GRT Details] Failed to load LookupService:', error);
    }
    return false;
  }

  /**
   * Load ConfirmationDialog if not already loaded
   */
  async function ensureConfirmationDialogLoaded() {
    if (confirmationDialogLoaded && window.showConfirmationDialog) return true;

    try {
      if (window.ServiceLoader) {
        await window.ServiceLoader.loadCore();
        await window.ServiceLoader.loadScript('../../../common/confirmationDialog/confirmation-dialog.js');
        confirmationDialogLoaded = true;
        console.log('[GRT Details] ConfirmationDialog loaded');
        return true;
      }
    } catch (error) {
      console.error('[GRT Details] Failed to load ConfirmationDialog:', error);
    }
    return false;
  }

  /**
   * Button configuration for each state
   * true = enabled, false = disabled
   */
  const buttonStates = {
    [ActionState.INITIAL]: {
      view: true,
      add: false,
      edit: false,
      delete: false,
      save: false,
      cancel: false,
      back: true
    },
    [ActionState.VIEW]: {
      view: false,
      add: false,
      edit: true,
      delete: true,
      save: false,
      cancel: true,
      back: true
    },
    [ActionState.ADD]: {
      view: false,
      add: false,
      edit: false,
      delete: false,
      save: true,
      cancel: true,
      back: false
    },
    [ActionState.EDIT]: {
      view: false,
      add: false,
      edit: false,
      delete: false,
      save: true,
      cancel: true,
      back: false
    }
  };

  /**
   * Get button element by action name
   */
  function getButton(action) {
    return document.querySelector(`[data-action="${action}"]`) ||
           document.querySelector(`[data-mcn-de-action="${action}"]`);
  }

  /**
   * Update button states based on current state
   */
  function updateButtonStates() {
    const states = buttonStates[currentState];
    if (!states) return;

    // Remove active class from all action buttons
    document.querySelectorAll('.btn-action').forEach(btn => {
      btn.classList.remove('active');
    });

    // Update enabled/disabled state
    Object.entries(states).forEach(([action, enabled]) => {
      const btn = getButton(action);
      if (btn) {
        btn.disabled = !enabled;
      }
    });

    // Add active class to indicate current mode
    if (currentState === ActionState.VIEW) {
      const viewBtn = getButton('view');
      if (viewBtn) viewBtn.classList.add('active');
    } else if (currentState === ActionState.ADD) {
      const addBtn = getButton('add');
      if (addBtn) addBtn.classList.add('active');
    } else if (currentState === ActionState.EDIT) {
      const editBtn = getButton('edit');
      if (editBtn) editBtn.classList.add('active');
    }

    console.log('[GRT Details] Button states updated - Mode:', currentState);
  }

  /**
   * Key lookup fields that should remain editable in INITIAL state
   */
  const keyLookupFields = ['SchemeId', 'LoanCycleNo'];

  /**
   * Fields that are editable in EDIT mode only
   * All other fields remain readonly during edit
   */
  const editableInEditMode = [
    'GroupDisbursementDate',
    'ValueDate',
    'InstallmentStartDate',
    'GroupDisbursementTime',
    'GrtExpiryDate',
    'Remarks'
  ];

  /**
   * Set form fields readonly state
   * @param {boolean} readonly - Whether fields should be readonly
   * @param {boolean} isInitialState - Whether we're in INITIAL state (key fields stay editable)
   * @param {boolean} isEditState - Whether we're in EDIT state (only specific fields editable)
   */
  function setFieldsReadonly(readonly, isInitialState = false, isEditState = false) {
    const inputs = document.querySelectorAll('.form-section input, .form-section select, .form-section textarea');
    inputs.forEach(input => {
      const isKeyField = keyLookupFields.includes(input.id);
      const isEditableInEdit = editableInEditMode.includes(input.id);
      const isSelectOrTextarea = input.tagName === 'SELECT' || input.tagName === 'TEXTAREA';
      const hasFlatpickr = input._flatpickr;
      
      if (readonly) {
        // In INITIAL state, keep key lookup fields editable
        if (isInitialState && isKeyField) {
          input.removeAttribute('readonly');
          if (isSelectOrTextarea) {
            input.disabled = false;
          }
        } else {
          if (isSelectOrTextarea) {
            input.disabled = true;
          } else {
            input.setAttribute('readonly', '');
          }
          // Disable Flatpickr calendar
          if (hasFlatpickr) {
            try {
              input._flatpickr.set('clickOpens', false);
              input._flatpickr.set('allowInput', false);
              if (input._flatpickr.altInput) {
                input._flatpickr.altInput.setAttribute('readonly', '');
              }
            } catch (e) {
              console.warn('[GRT Details] Error disabling Flatpickr:', e);
            }
          }
        }
      } else if (isEditState) {
        // In EDIT state, only allow editing specific fields
        if (isEditableInEdit) {
          input.removeAttribute('readonly');
          if (isSelectOrTextarea) {
            input.disabled = false;
          }
          // Enable Flatpickr calendar for editable date fields
          if (hasFlatpickr) {
            try {
              input._flatpickr.set('clickOpens', true);
              input._flatpickr.set('allowInput', true);
              if (input._flatpickr.altInput) {
                input._flatpickr.altInput.removeAttribute('readonly');
              }
            } catch (e) {
              console.warn('[GRT Details] Error enabling Flatpickr:', e);
            }
          }
        } else {
          if (isSelectOrTextarea) {
            input.disabled = true;
          } else {
            input.setAttribute('readonly', '');
          }
          // Disable Flatpickr calendar for non-editable date fields
          if (hasFlatpickr) {
            try {
              input._flatpickr.set('clickOpens', false);
              input._flatpickr.set('allowInput', false);
              if (input._flatpickr.altInput) {
                input._flatpickr.altInput.setAttribute('readonly', '');
              }
            } catch (e) {
              console.warn('[GRT Details] Error disabling Flatpickr:', e);
            }
          }
        }
      } else {
        // ADD mode - all fields editable except always readonly ones
        if (!input.dataset.alwaysReadonly) {
          input.removeAttribute('readonly');
          if (isSelectOrTextarea) {
            input.disabled = false;
          }
          // Enable Flatpickr calendar
          if (hasFlatpickr) {
            try {
              input._flatpickr.set('clickOpens', true);
              input._flatpickr.set('allowInput', true);
              if (input._flatpickr.altInput) {
                input._flatpickr.altInput.removeAttribute('readonly');
              }
            } catch (e) {
              console.warn('[GRT Details] Error enabling Flatpickr:', e);
            }
          }
        }
      }
    });
  }

  // ---------------------------------------------------------------------------
  // Toast helpers (aligned with Center Maintenance system)
  // ---------------------------------------------------------------------------

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

  function showToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    toast.appendChild(body);
    container.appendChild(toast);

    const remove = () => {
      toast.classList.remove('is-show');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
      setTimeout(() => toast.remove(), 300);
    };

    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  function showSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();
    const existingToasts = container.querySelectorAll('.kairo-toast');
    existingToasts.forEach(t => t.remove());
    showToast(message, { title, variant, timeoutMs });
  }

  /**
   * Show snackbar/toast message (backwards compatible wrapper)
   */
  function showSnackbar(message, type = 'info') {
    console.log('[GRT Details] showSnackbar:', type, message);
    let variant = 'info';
    if (type === 'success') variant = 'success';
    else if (type === 'error' || type === 'danger') variant = 'danger';
    else if (type === 'warning') variant = 'warning';
    showSystemToast(message, { title: 'Notice', variant });
  }

  /**
   * Show validation error message
   */
  function showError(message) {
    showSnackbar(message, 'error');
    console.warn('[GRT Details] Validation error:', message);
  }

  /**
   * Show success message
   */
  function showSuccess(message) {
    showSnackbar(message, 'success');
    console.log('[GRT Details] Success:', message);
  }

  /**
   * Show info message
   */
  function showInfo(message) {
    showSnackbar(message, 'info');
    console.log('[GRT Details] Info:', message);
  }

  /**
   * Show warning message
   */
  function showWarning(message) {
    showSnackbar(message, 'warning');
    console.warn('[GRT Details] Warning:', message);
  }

  /**
   * Validate required fields for View action
   */
  function validateViewFields() {
    // First validate parent context
    if (!validateParentContext()) {
      return false;
    }

    const schemeId = document.getElementById('SchemeId')?.value?.trim();
    const loanCycleNo = document.getElementById('LoanCycleNo')?.value?.trim();

    if (!schemeId) {
      showError('Scheme ID is required');
      document.getElementById('SchemeId')?.focus();
      return false;
    }

    if (!loanCycleNo) {
      showError('Loan Cycle No. is required');
      document.getElementById('LoanCycleNo')?.focus();
      return false;
    }

    return true;
  }

  /**
   * Handle View action
   */
  function handleView() {
    // Validate required fields
    if (!validateViewFields()) {
      return;
    }

    const schemeId = document.getElementById('SchemeId').value.trim();
    const loanCycleNo = document.getElementById('LoanCycleNo').value.trim();

    console.log('[GRT Details] Fetching GRT details for Scheme:', schemeId, 'Loan Cycle:', loanCycleNo);

    // TODO: Call API to fetch GRT details
    // For now, simulate successful fetch
    fetchGrtDetails(schemeId, loanCycleNo);
  }

  /**
   * Fetch GRT details from API
   */
  async function fetchGrtDetails(schemeId, loanCycleNo) {
    try {
      // Use parent context for branch and center IDs
      const branchId = parentContext.branchId || '0603';
      const groupId = parentContext.centerId || '';

      if (!groupId) {
        showError('Center ID is required. Please select a center in Center Maintenance.');
        return;
      }

      const refNo = document.getElementById('ReferenceNo')?.value?.trim() || '';

      const requestData = {
        OurBranchID: branchId,
        GroupID: groupId,
        LoanSchemeID: schemeId,
        LoanCycleNo: parseInt(loanCycleNo) || 0,
        RefNo: refNo,
        OperatorID: 'CSADM',
        Direction: 0,
        DirectionType: ''
      };

      console.log('[GRT Details] Fetching GRT details with:', requestData);

      // Ensure GroupService is loaded
      await ensureGroupServiceLoaded();

      if (!window.GroupService) {
        throw new Error('GroupService not available');
      }

      const result = await window.GroupService.getGRTDetails(requestData);
      console.log('[GRT Details] API response:', result);

      if (result.success && result.data) {
        // GRT data is in Details02, not Details
        const details02 = result.data.Details02?.[0] || {};
        const details01 = result.data.Details01?.[0] || {};
        
        // Check if this is an empty response (no actual GRT data in Details02)
        const isEmpty = !details02.CreatedOn || details02.CreatedOn === '';
        
        if (isEmpty) {
          // Empty response - enable Add mode but keep entered fields
          console.log('[GRT Details] No existing GRT found - enabling Add mode');
          showInfo('No GRT details found. You can add a new record.');
          
          // Enable Add button while keeping current field values
          currentState = ActionState.INITIAL;
          updateButtonStates();
          
          // Override to enable Add button and disable View button
          const addBtn = getButton('add');
          const viewBtn = getButton('view');
          if (addBtn) addBtn.disabled = false;
          if (viewBtn) viewBtn.disabled = true;
          
          // Store Details01 info if needed
          console.log('[GRT Details] Details01:', details01);
        } else {
          // Populate form with data from Details02
          populateForm(result.data);
          
          // On successful fetch, update state
          currentState = ActionState.VIEW;
          updateButtonStates();
          setFieldsReadonly(true);
          
          showSuccess('GRT details loaded successfully');
          console.log('[GRT Details] View mode activated');
        }
      } else {
        showSnackbar(result.message || 'No GRT details found', 'warning');
      }
    } catch (error) {
      console.error('[GRT Details] Error fetching GRT details:', error);
      showSnackbar('Failed to fetch GRT details', 'error');
    }
  }

  /**
   * Ensure GroupService is loaded
   */
  async function ensureGroupServiceLoaded() {
    if (window.GroupService) return true;

    try {
      if (window.ServiceLoader) {
        await window.ServiceLoader.loadCore();
        await window.ServiceLoader.loadScript('../../../../assets/js/services/microfinance/groupService.js');
        console.log('[GRT Details] GroupService loaded');
        return true;
      }
    } catch (error) {
      console.error('[GRT Details] Failed to load GroupService:', error);
    }
    return false;
  }

  /**
   * Format ISO date string to YYYY-MM-DD for date inputs
   */
  function formatDateForInput(isoDate) {
    if (!isoDate) return '';
    // Handle ISO format like "2025-08-29T00:00:00"
    try {
      if (isoDate.includes('T')) {
        const datePart = isoDate.split('T')[0];
        if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
          return datePart;
        }
      }
      if (/^\d{4}-\d{2}-\d{2}$/.test(isoDate)) {
        return isoDate;
      }
      const date = new Date(isoDate);
      if (isNaN(date.getTime())) return '';
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      console.warn('[GRT Details] Error parsing date:', isoDate, e);
      return '';
    }
  }

  /**
   * Sets a date input value and forces a visual update.
   * Handles Flatpickr instances if present.
   * @param {HTMLInputElement} inputEl - The date input element
   * @param {string} dateValue - Date in YYYY-MM-DD format
   */
  function setDateInputValue(inputEl, dateValue) {
    if (!inputEl) return;
    
    const formattedDate = formatDateForInput(dateValue);
    
    // If Flatpickr is attached, use its API
    if (inputEl._flatpickr) {
      try {
        if (formattedDate) {
          inputEl._flatpickr.setDate(formattedDate, true, 'Y-m-d');
        } else {
          inputEl._flatpickr.clear();
        }
        return;
      } catch (e) {
        console.warn('[GRT Details] Error setting Flatpickr date:', e);
      }
    }
    
    // Fallback for native inputs or if Flatpickr isn't ready yet
    inputEl.value = formattedDate;
    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /**
   * Populate form with GRT details data
   */
  function populateForm(data) {
    // GRT data is in Details02
    const details = data.Details02?.[0] || data;
    const details01 = data.Details01?.[0] || {};

    // Store UpdateCount for edit operations
    fetchedUpdateCount = details.UpdateCount || 1;

    // Main form fields
    document.getElementById('SchemeId').value = details.LoanSchemeID || '';
    document.getElementById('SchemeName').value = details.LoanSchemeName || details.Description || '';
    document.getElementById('LoanCycleNo').value = details.LoanCycleNo || '';
    document.getElementById('ReferenceNo').value = details.RefNo || '';
    
    // Date fields - use setDateInputValue for Flatpickr compatibility
    setDateInputValue(document.getElementById('GroupDisbursementDate'), details.DisbursementDate);
    setDateInputValue(document.getElementById('ValueDate'), details.ValueDate);
    setDateInputValue(document.getElementById('InstallmentStartDate'), details.InstallmentStartDate);
    setDateInputValue(document.getElementById('GrtExpiryDate'), details.GRTExpiryDate);
    setDateInputValue(document.getElementById('GrtDate'), details.GRTDate);
    
    // Time and amount fields
    document.getElementById('GroupDisbursementTime').value = details.DisbursementTime || '';
    document.getElementById('MinLoanAmount').value = details.MinLoanAmount || '';
    document.getElementById('MaxLoanAmount').value = details.MaxLoanAmount || '';
    document.getElementById('LoanAmount').value = details.DefaultLoanAmount || '';
    document.getElementById('LoanTerm').value = details.DefaultTerm || '';
    document.getElementById('InstallmentGracePeriod').value = details.InstallmentGracePeriod || '';
    document.getElementById('Remarks').value = details.Remarks || '';

    // Behind The Scene fields
    document.getElementById('GrtStatus').value = details.GRTStatus || details.GRTStatusID || '';
    
    // Audit fields are spans, use textContent
    const createdBy = document.getElementById('CreatedBy');
    const modifiedBy = document.getElementById('ModifiedBy');
    const supervisedBy = document.getElementById('SupervisedBy');
    const createdOn = document.getElementById('CreatedOn');
    const modifiedOn = document.getElementById('ModifiedOn');
    const supervisedOn = document.getElementById('SupervisedOn');
    
    if (createdBy) createdBy.textContent = details.CreatedBy || '-';
    if (modifiedBy) modifiedBy.textContent = details.ModifiedBy || '-';
    if (supervisedBy) supervisedBy.textContent = details.SupervisedBy || '-';
    if (createdOn) createdOn.textContent = details.CreatedOn ? formatDateForInput(details.CreatedOn) : '-';
    if (modifiedOn) modifiedOn.textContent = details.ModifiedOn ? formatDateForInput(details.ModifiedOn) : '-';
    if (supervisedOn) supervisedOn.textContent = details.SupervisedOn ? formatDateForInput(details.SupervisedOn) : '-';

    console.log('[GRT Details] Form populated with data from Details02');
    console.log('[GRT Details] Details01 metadata:', details01);
  }

  /**
   * Handle Add action
   */
  function handleAdd() {
    currentState = ActionState.ADD;
    updateButtonStates();
    setFieldsReadonly(false);
    // Don't clear form - keep entered values
    showInfo('Add mode - enter GRT details');
    console.log('[GRT Details] Add mode activated');
  }

  /**
   * Handle Edit action
   */
  function handleEdit() {
    currentState = ActionState.EDIT;
    updateButtonStates();
    setFieldsReadonly(false, false, true); // Pass true for isEditState to restrict editable fields
    showInfo('Edit mode - modify editable fields');
    console.log('[GRT Details] Edit mode activated - only date/time fields are editable');
  }

  /**
   * Handle Delete action
   */
  async function handleDelete() {
    // Validate required fields
    const schemeId = document.getElementById('SchemeId')?.value?.trim();
    const loanCycleNo = document.getElementById('LoanCycleNo')?.value?.trim();
    
    if (!schemeId) {
      showError('Scheme ID is required');
      return;
    }
    if (!loanCycleNo) {
      showError('Loan Cycle No. is required');
      return;
    }
    
    // Validate parent context
    if (!validateParentContext()) {
      return;
    }

    // Load confirmation dialog
    const dialogReady = await ensureConfirmationDialogLoaded();
    if (!dialogReady || !window.showConfirmationDialog) {
      showError('Confirmation dialog not available');
      return;
    }

    // Show confirmation dialog
    try {
      const confirmed = await window.showConfirmationDialog(
        'Delete GRT Record',
        'Are you sure you want to delete this GRT record? This action cannot be undone.',
        'danger'
      );

      if (!confirmed) {
        console.log('[GRT Details] Delete cancelled by user');
        return;
      }

      console.log('[GRT Details] Delete confirmed');
      
      // Collect delete request data
      const requestData = {
        OurBranchID: parentContext.branchId,
        GroupID: parentContext.centerId,
        LoanSchemeID: schemeId,
        LoanCycleNo: parseInt(loanCycleNo),
        RefNo: parseInt(document.getElementById('ReferenceNo')?.value) || 0,
        UpdateCount: fetchedUpdateCount
      };
      
      console.log('[GRT Details] Deleting GRT details:', requestData);
      
      // Ensure GroupService is loaded
      await ensureGroupServiceLoaded();
      
      if (!window.GroupService) {
        throw new Error('GroupService not available');
      }
      
      const result = await window.GroupService.deleteGRTDetails(requestData);
      console.log('[GRT Details] Delete response:', result);
      
      if (result.success) {
        showSuccess('GRT details deleted successfully');
        
        // Clear form and reset to initial state
        clearForm();
        
        // Reset to initial state
        currentState = ActionState.INITIAL;
        updateButtonStates();
        setFieldsReadonly(true, true); // Keep key fields editable
        
        // Reset UpdateCount
        fetchedUpdateCount = 0;
        
        // Focus on Scheme ID for next entry
        document.getElementById('SchemeId')?.focus();
      } else {
        showError(result.message || 'Failed to delete GRT details');
      }
    } catch (error) {
      console.error('[GRT Details] Error deleting GRT details:', error);
      showError('Failed to delete GRT details: ' + (error.message || 'Unknown error'));
    }
  }

  /**
   * Handle Save action
   */
  async function handleSave() {
    console.log('[GRT Details] Save action');
    
    // Validate required fields
    const schemeId = document.getElementById('SchemeId')?.value?.trim();
    const loanCycleNo = document.getElementById('LoanCycleNo')?.value?.trim();
    
    if (!schemeId) {
      showError('Scheme ID is required');
      return;
    }
    if (!loanCycleNo) {
      showError('Loan Cycle No. is required');
      return;
    }
    
    // Validate parent context
    if (!validateParentContext()) {
      return;
    }
    
    try {
      // Collect form data
      const requestData = {
        OurBranchID: parentContext.branchId,
        GroupID: parentContext.centerId,
        LoanSchemeID: schemeId,
        LoanCycleNo: parseInt(loanCycleNo),
        RefNo: parseInt(document.getElementById('ReferenceNo')?.value) || undefined,
        DisbursementDate: document.getElementById('GroupDisbursementDate')?.value,
        DisbursementTime: parseFloat(document.getElementById('GroupDisbursementTime')?.value) || 0,
        InstallmentStartDate: document.getElementById('InstallmentStartDate')?.value || null,
        MinLoanAmount: parseFloat(document.getElementById('MinLoanAmount')?.value) || 0,
        MaxLoanAmount: parseFloat(document.getElementById('MaxLoanAmount')?.value) || 0,
        DefaultLoanAmount: parseFloat(document.getElementById('LoanAmount')?.value) || 0,
        DefaultTerm: parseInt(document.getElementById('LoanTerm')?.value) || 0,
        InstallmentGracePeriod: parseInt(document.getElementById('InstallmentGracePeriod')?.value) || 0,
        GRTExpiryDate: document.getElementById('GrtExpiryDate')?.value || null,
        ValueDate: document.getElementById('ValueDate')?.value || null,
        Remarks: document.getElementById('Remarks')?.value || '',
        CreatedOn: document.getElementById('CreatedOn')?.textContent !== '-' ? document.getElementById('CreatedOn')?.textContent : null,
        CreatedBy: document.getElementById('CreatedBy')?.textContent !== '-' ? document.getElementById('CreatedBy')?.textContent : 'CSADM',
        ModifiedOn: new Date().toISOString().split('T')[0],
        ModifiedBy: 'CSADM',
        SupervisedBy: document.getElementById('SupervisedBy')?.textContent !== '-' ? document.getElementById('SupervisedBy')?.textContent : '',
        // UpdateCount: 1 for ADD, fetched value for EDIT
        UpdateCount: currentState === ActionState.ADD ? 1 : fetchedUpdateCount
      };
      
      console.log('[GRT Details] Saving GRT details:', requestData);
      
      // Ensure GroupService is loaded
      await ensureGroupServiceLoaded();
      
      if (!window.GroupService) {
        throw new Error('GroupService not available');
      }
      
      const result = await window.GroupService.addEditGRTDetails(requestData);
      console.log('[GRT Details] Save response:', result);
      
      if (result.success) {
        showSuccess(currentState === ActionState.ADD ? 'GRT details added successfully' : 'GRT details updated successfully');
        
        // Clear form and reset to initial state
        clearForm();
        
        // Reset to initial state
        currentState = ActionState.INITIAL;
        updateButtonStates();
        setFieldsReadonly(true, true); // Keep key fields editable
        
        // Reset UpdateCount
        fetchedUpdateCount = 0;
        
        // Focus on Scheme ID for next entry
        document.getElementById('SchemeId')?.focus();
      } else {
        showError(result.message || 'Failed to save GRT details');
      }
    } catch (error) {
      console.error('[GRT Details] Error saving GRT details:', error);
      showError('Failed to save GRT details: ' + (error.message || 'Unknown error'));
    }
  }

  /**
   * Handle Cancel action
   */
  function handleCancel() {
    // Clear all form fields
    clearForm();
    
    // Reset to initial state
    currentState = ActionState.INITIAL;
    updateButtonStates();
    setFieldsReadonly(true, true); // Pass true for isInitialState to keep key fields editable
    
    // Ensure View button is enabled after cancel
    const viewBtn = getButton('view');
    if (viewBtn) viewBtn.disabled = false;
    
    // Focus on Scheme ID field for user convenience
    document.getElementById('SchemeId')?.focus();
    
    showInfo('Operation cancelled');
    console.log('[GRT Details] Cancel action - form cleared and returned to initial state');
  }

  /**
   * Handle Back/Close action
   */
  function handleBack() {
    // Notify parent to close this data entry form
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ type: 'kairo-dataentry-close' }, '*');
    }
    console.log('[GRT Details] Back/Close action');
  }

  /**
   * Clear form fields
   */
  function clearForm() {
    const inputs = document.querySelectorAll('.form-section input, .form-section textarea');
    inputs.forEach(input => {
      // Clear all form fields including readonly ones like SchemeName
      // Handle Flatpickr date inputs
      if (input._flatpickr) {
        try {
          input._flatpickr.clear();
        } catch (e) {
          input.value = '';
        }
      } else {
        input.value = '';
      }
    });

    const selects = document.querySelectorAll('.form-section select');
    selects.forEach(select => {
      select.selectedIndex = 0;
    });

    // Clear audit span values
    document.querySelectorAll('.audit-value').forEach(span => {
      span.textContent = '-';
    });
  }

  /**
   * Bind button click handlers
   */
  function bindEventHandlers() {
    // Action buttons - use data-action attribute
    document.querySelector('[data-action="view"]')?.addEventListener('click', handleView);
    document.querySelector('[data-action="add"]')?.addEventListener('click', handleAdd);
    document.querySelector('[data-action="edit"]')?.addEventListener('click', handleEdit);
    document.querySelector('[data-action="delete"]')?.addEventListener('click', handleDelete);
    document.querySelector('[data-action="save"]')?.addEventListener('click', handleSave);
    document.querySelector('[data-action="cancel"]')?.addEventListener('click', handleCancel);

    // Scheme ID lookup button
    document.querySelector('[data-mcn-lookup="schemeId"]')?.addEventListener('click', handleSchemeSearch);

    // Scheme ID - fetch scheme details on blur (background search)
    document.getElementById('SchemeId')?.addEventListener('blur', async (e) => {
      const schemeId = e.target.value.trim();
      if (schemeId) {
        await fetchSchemeDetailsByBlur(schemeId);
      }
    });

    // Listen for scheme selection from search dialog
    window.addEventListener('message', handleSearchMessage);
    console.log('[GRT Details] Message listener registered');
  }

  /**
   * Fetch scheme details when user types SchemeId and blurs
   * Performs search in background and finds match
   */
  async function fetchSchemeDetailsByBlur(schemeId) {
    const schemeNameField = document.getElementById('SchemeName');
    const schemeName = schemeNameField?.value?.trim() || '';

    // Ensure LookupService is loaded
    const serviceReady = await ensureLookupServiceLoaded();
    if (!serviceReady || !window.LookupService) {
      console.warn('[GRT Details] LookupService not available');
     // showSnackbar('Service not available', 'error');
      return;
    }

    try {
      // Build where statement - include both SchemeId and SchemeName if present
      const conditions = [];
      if (schemeId) {
        conditions.push(`LoanSchemeID LIKE '%${schemeId}%'`);
      }
      if (schemeName) {
        conditions.push(`Description LIKE '%${schemeName}%'`);
      }
      const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : '';

      // Build search payload (same as search dialog)
      const payload = {
        TableID: 'GroupDefaultSchemeID',
        WhereStmt: whereStmt,
        RefID: null,
        PrevOrNext: 0,
        AdvFilterString: "SchemeTypeID='P'",
        OperatorID: 'CSADM',
        ModuleID: 5060,
        OurBranchID: '0603',
        SearchKey: null,
        LanguageID: 'en'
      };

      const result = await window.LookupService.getSearchResult(payload);
      console.log('[GRT Details] Scheme search result:', result);

      if (result.success) {
        // Extract schemes from response
        const schemes = result.data?.Details || result.Details || [];
        
        // Cache the schemes
        cachedSchemes = schemes;

        // Find exact match by SchemeId
        const scheme = schemes.find(s =>
          (s.LoanSchemeID || '').toLowerCase() === schemeId.toLowerCase()
        );

        if (scheme) {
          if (schemeNameField) {
            schemeNameField.value = scheme.Description || scheme.SchemeName || '';
          }
          console.log('[GRT Details] Scheme found:', scheme.LoanSchemeID, scheme.Description);
        } else {
          if (schemeNameField) schemeNameField.value = '';
          showSnackbar('Scheme not found', 'warning');
        }
      } else {
        if (schemeNameField) schemeNameField.value = '';
        showSnackbar('Scheme not found', 'warning');
      }
    } catch (error) {
      console.error('[GRT Details] Error fetching scheme:', error);
      if (schemeNameField) schemeNameField.value = '';
      showSnackbar('Error fetching scheme details', 'error');
    }
  }

  /**
   * Validate parent context - ensure Branch ID and Center ID are available
   */
  function validateParentContext() {
    if (!parentContext.branchId) {
      showError('Branch ID is required. Please select a branch in Center Maintenance first.');
      return false;
    }
    if (!parentContext.centerId) {
      showError('Center ID is required. Please select a center in Center Maintenance first.');
      return false;
    }
    return true;
  }

  /**
   * Handle Scheme Search - delegates to parent window's modal
   */
  function handleSchemeSearch() {
    // Validate parent context before allowing search
    if (!validateParentContext()) {
      return;
    }

    console.log('[GRT Details] Opening scheme search dialog via parent window');
    console.log('[GRT Details] Branch:', parentContext.branchId, 'Center:', parentContext.centerId);

    // Send message to parent to open search dialog
    // URL is relative to PARENT's location (center-maintenance.html), not this child iframe
    window.parent.postMessage({
      type: 'kairo-open-search',
      action: 'openSearchDialog',
      lookupType: 'groupLoanSchemeSearch',
      title: 'Group Loan Scheme Search',
      url: '../../common/searchDialogs/group-loan-scheme-search/group-loan-scheme-search.html',
      source: 'grt-details'
    }, '*');

    console.log('[GRT Details] Search dialog request sent to parent');
  }

  /**
   * Close search modal - parent handles this now
   */
  function closeSearchModal() {
    // No local modal to close - parent handles the modal
    console.log('[GRT Details] closeSearchModal called - parent handles modal');
  }

  /**
   * Handle messages from search dialogs (relayed via parent)
   */
  function handleSearchMessage(event) {
    const data = event.data;
    if (!data || typeof data !== 'object') return;

    console.log('[GRT Details] Received message:', data.type, data);

    // Handle scheme search results - cache all schemes
    if (data.type === 'GROUP_LOAN_SCHEME_SEARCH_RESULTS') {
      cachedSchemes = data.schemes || [];
      console.log('[GRT Details] Cached', cachedSchemes.length, 'schemes from search');
    }

    // Handle scheme selection
    if (data.type === 'GROUP_LOAN_SCHEME_SELECTED') {
      console.log('[GRT Details] Processing scheme selection...');
      const schemeIdField = document.getElementById('SchemeId');
      const schemeNameField = document.getElementById('SchemeName');

      if (schemeIdField) {
        schemeIdField.value = data.schemeId || '';
        console.log('[GRT Details] Set SchemeId to:', data.schemeId);
      }
      if (schemeNameField) {
        schemeNameField.value = data.schemeName || '';
        console.log('[GRT Details] Set SchemeName to:', data.schemeName);
      }

      // Close the search modal
      closeSearchModal();

      console.log('[GRT Details] Scheme selected:', data.schemeId, data.schemeName);
      showSuccess('Scheme selected: ' + data.schemeName);
    }

    // Handle search close request
    if (data.type === 'kairo-search-close' || data.type === 'kairo-dataentry-close') {
      closeSearchModal();
    }
  }

  /**
   * Get parent context (Branch ID and Center ID) from Center Maintenance
   */
  function getParentContext() {
    try {
      if (window.parent && window.parent !== window) {
        const parentDoc = window.parent.document;
        
        // Get Branch ID and Name
        parentContext.branchId = parentDoc.getElementById('branchId')?.value?.trim() || '';
        parentContext.branchName = parentDoc.getElementById('branchName')?.value?.trim() || '';
        
        // Get Center ID and Name
        parentContext.centerId = parentDoc.getElementById('centerId')?.value?.trim() || '';
        parentContext.centerName = parentDoc.getElementById('centerName')?.value?.trim() || '';
        
        console.log('[GRT Details] Parent context loaded:', parentContext);
        
        // Show warning if context is missing
        if (!parentContext.branchId || !parentContext.centerId) {
          showWarning('Please select Branch and Center in the main screen first.');
        }
      }
    } catch (error) {
      console.warn('[GRT Details] Could not get parent context:', error);
      showWarning('Could not load parent context. Please ensure Branch and Center are selected.');
    }
  }

  /**
   * Initialize the page
   */
  function init() {
    console.log('[GRT Details] Initializing...');
    
    // Get parent context first
    getParentContext();
    
    // Mark SchemeName as always readonly
    const schemeName = document.getElementById('SchemeName');
    if (schemeName) {
      schemeName.dataset.alwaysReadonly = 'true';
    }

    // Mark Behind The Scene fields as always readonly
    const grtStatus = document.getElementById('GrtStatus');
    if (grtStatus) {
      grtStatus.dataset.alwaysReadonly = 'true';
    }

    // Set initial state
    currentState = ActionState.INITIAL;
    updateButtonStates();
    setFieldsReadonly(true, true); // Pass true for isInitialState to keep key fields editable

    // Bind event handlers
    bindEventHandlers();

    console.log('[GRT Details] Initialization complete');
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
