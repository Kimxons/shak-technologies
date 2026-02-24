// Bank Limit Maintenance - JavaScript Functionality

(async function() {
  'use strict';

  console.log('🏦 Bank Limit Maintenance Module Loading...');

  // Load ServiceLoader
  const { ServiceLoader } = window;
  if (!ServiceLoader) {
    console.error('❌ ServiceLoader not found!');
    showToast('ServiceLoader not available. Please check console for details.', { title: 'Critical Error', variant: 'error', timeoutMs: 0 });
    return;
  }

  // Load dependencies
  await ServiceLoader.loadCore();
  await ServiceLoader.loadOtherStaticDataService();
  
  // Load LookupService for dropdowns
  if (!window.LookupService) {
    console.log('📦 Loading LookupService...');
    await ServiceLoader.loadLookupService();
  }

  const OtherStaticDataService = window.OtherStaticDataService;
  const LookupService = window.LookupService;
  
  if (!OtherStaticDataService) {
    console.error('❌ OtherStaticDataService not loaded!');
    showToast('OtherStaticDataService not available. Please check console for details.', { title: 'Service Error', variant: 'error', timeoutMs: 0 });
    return;
  }
  
  if (!LookupService) {
    console.error('❌ LookupService not loaded!');
    console.warn('⚠️ Type dropdown will not be populated');
  }

  console.log('✅ Services loaded successfully');

  // Form state constants
  const STATE = {
    INITIAL: 'INITIAL',           // Form just loaded - Add, Back enabled
    ADD_MODE: 'ADD_MODE',         // After clicking Add - Update, Clear, Cancel enabled; FIELDS EDITABLE
    EDIT_MODE: 'EDIT_MODE',       // After clicking Edit/Alter - Update, Clear, Cancel enabled; FIELDS EDITABLE
    GRID_HAS_DATA: 'GRID_HAS_DATA', // After Update (data in grid) - New, Alter, Remove, Save, Cancel enabled
    SAVED: 'SAVED',               // After Save - Edit, Delete, Back enabled
    VIEW_MODE: 'VIEW_MODE'        // After Clear - All buttons enabled except Add and Update
  };

  // Form state management
  let formState = {
    isEditing: false,
    originalData: {},
    gridData: [],
    bankData: null, // Current bank context
    updateCount: 0,
    currentState: STATE.INITIAL,
    editingIndex: undefined // Track which grid record is being edited
  };

  // Get bank context from parent window or fallback to window variables
  const getBankContext = () => {
    // Try to get from parent window first (if in iframe)
    let bankID = window.currentBankID;
    let clientID = window.currentClientID;
    let branchID = window.currentBranchID;
    let operatorID = window.currentOperatorID;
    
    console.log('🔍 Getting bank context from window:', { bankID, clientID, branchID, operatorID });
    
    // If not found and we're in an iframe, try parent window
    if (!bankID && window.parent && window.parent !== window) {
      try {
        const parentBankData = window.parent.currentBankData;
        if (parentBankData) {
          bankID = parentBankData.BankID;
          clientID = parentBankData.ClientID;
          console.log('🔍 Got bank context from parent window:', { bankID, clientID });
          // branchID might not be in currentBankData
        }
      } catch (e) {
        console.warn('Could not access parent window data:', e);
      }
    }
    
    const context = {
      BankID: bankID || '',
      ClientID: clientID || '',
      ClientBranchID: branchID || '',
      OperatorID: operatorID || 'CSADM'
    };
    
    console.log('✅ Final bank context:', context);
    return context;
  };

  // =========================================================================
  // TOAST NOTIFICATION SYSTEM - Account Maintenance Pattern
  // =========================================================================

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

  function showToast(message, { title = 'Notification', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const header = document.createElement('div');
    header.className = 'kairo-toast__title';

    const titleEl = document.createElement('div');
    titleEl.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'kairo-toast__close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    toast.appendChild(header);
    toast.appendChild(body);
    container.appendChild(toast);

    const remove = () => {
      try {
        toast.remove();
      } catch {
        // Ignore errors during removal
      }
    };

    closeBtn.addEventListener('click', remove);
    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize);
  } else {
    initialize();
  }

  function initialize() {
    console.log('🚀 Initializing Bank Limit Maintenance...');
    initializeForm();
    loadDropdowns();
    attachEventListeners();
    
    // Log current window variables
    console.log('📋 Window variables at init:', {
      currentBankID: window.currentBankID,
      currentClientID: window.currentClientID,
      hasParent: !!(window.parent && window.parent !== window)
    });
    
    console.log('ℹ️ Initialization complete - waiting for parent to trigger data load');
  }

  // Expose loadBankLimitData to window so parent can trigger reload
  window.loadBankLimitData = loadBankLimitData;

  // Initialize form
  function initializeForm() {
    setFormEditable(false);
    setButtonState(STATE.INITIAL);
    console.log('Bank Limit Maintenance form initialized');
  }

  // ============================
  // BUTTON STATE MANAGEMENT
  // ============================

  /**
   * Enable or disable a button
   */
  function setButtonEnabled(buttonId, enabled) {
    const button = document.getElementById(buttonId);
    if (button) {
      button.disabled = !enabled;
    }
  }

  /**
   * Set the state of all buttons based on the current form state
   */
  function setButtonState(state) {
    formState.currentState = state;
    console.log('🔘 Setting button state:', state);

    // Vertical action panel buttons
    const verticalButtons = {
      btnAdd: false,
      btnEdit: false,
      btnDelete: false,
      btnSave: false,
      btnCancel: false,
      btnBack: false
    };

    // Horizontal action buttons
    const horizontalButtons = {
      btnNew: false,
      btnAlter: false,
      btnRemove: false,
      btnUpdate: false,
      btnClear: false
    };

    switch (state) {
      case STATE.INITIAL:
        // Initial state: Add, Back enabled
        verticalButtons.btnAdd = true;
        verticalButtons.btnBack = true;
        break;

      case STATE.ADD_MODE:
        // NEW MODE: Update, Clear, Cancel enabled (form cleared for new record)
        verticalButtons.btnCancel = true;
        horizontalButtons.btnUpdate = true;
        horizontalButtons.btnClear = true;
        break;

      case STATE.EDIT_MODE:
        // EDIT MODE: Only New and Cancel enabled
        verticalButtons.btnCancel = true;
        horizontalButtons.btnNew = true;
        break;

      case STATE.GRID_HAS_DATA:
        // Grid has data: New, Alter, Remove, Save, Cancel enabled
        verticalButtons.btnCancel = true;
        verticalButtons.btnSave = true;
        horizontalButtons.btnNew = true;
        horizontalButtons.btnAlter = true;
        horizontalButtons.btnRemove = true;
        break;

      case STATE.SAVED:
        // Saved: Edit, Delete, Back enabled
        verticalButtons.btnEdit = true;
        verticalButtons.btnDelete = true;
        verticalButtons.btnBack = true;
        break;

      case STATE.VIEW_MODE:
        // After Clear - All buttons enabled except Add and Update
        horizontalButtons.btnNew = true;
        horizontalButtons.btnAlter = true;
        horizontalButtons.btnRemove = true;
        horizontalButtons.btnClear = true;
        verticalButtons.btnEdit = true;
        verticalButtons.btnDelete = true;
        verticalButtons.btnSave = true;
        verticalButtons.btnCancel = true;
        verticalButtons.btnBack = true;
        break;
    }

    // Apply vertical button states
    Object.keys(verticalButtons).forEach(btnId => {
      setButtonEnabled(btnId, verticalButtons[btnId]);
    });

    // Apply horizontal button states
    Object.keys(horizontalButtons).forEach(btnId => {
      setButtonEnabled(btnId, horizontalButtons[btnId]);
    });
  }

  // Load Dropdowns
  async function loadDropdowns() {
    console.log('📥 Loading dropdowns...');
    
    try {
      // Load Type dropdown using LookupService.getTreasuryTypes()
      if (LookupService) {
        const typeOptions = await LookupService.getTreasuryTypes();
        const typeSelect = document.getElementById('type');
        
        if (typeSelect && typeOptions) {
          // Keep the default option
          typeSelect.innerHTML = '<option value="">--Select--</option>';
          
          // Populate with treasury types
          typeOptions.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value || '';
            option.textContent = opt.label || opt.text || opt.value || '';
            typeSelect.appendChild(option);
          });
          
          console.log('✅ Type dropdown loaded with', typeOptions.length, 'treasury types');
        } else {
          console.warn('⚠️ Type select element not found or no options returned');
        }
      } else {
        console.warn('⚠️ LookupService not available - Type dropdown not populated');
      }
    } catch (error) {
      console.error('❌ Error loading dropdowns:', error);
    }
  }

// Attach event listeners
function attachEventListeners() {
  // Horizontal action buttons
  const newBtn = document.getElementById('btnNew');
  const alterBtn = document.getElementById('btnAlter');
  const removeBtn = document.getElementById('btnRemove');
  const updateBtn = document.getElementById('btnUpdate');
  const clearBtn = document.getElementById('btnClear');

  if (newBtn) newBtn.addEventListener('click', handleNew);
  if (alterBtn) alterBtn.addEventListener('click', handleAlter);
  if (removeBtn) removeBtn.addEventListener('click', handleRemove);
  if (updateBtn) updateBtn.addEventListener('click', handleUpdate);
  if (clearBtn) clearBtn.addEventListener('click', handleClear);

  // Vertical action buttons (maintain-banks pattern)
  const showBtn = document.getElementById('btnShow');
  const viewBtn = document.getElementById('btnView');
  const addBtn = document.getElementById('btnAdd');
  const editBtn = document.getElementById('btnEdit');
  const deleteBtn = document.getElementById('btnDelete');
  const saveBtn = document.getElementById('btnSave');
  const cancelBtn = document.getElementById('btnCancel');
  const backBtn = document.getElementById('btnBack');

  if (showBtn) showBtn.addEventListener('click', handleShow);
  if (viewBtn) viewBtn.addEventListener('click', handleView);
  if (addBtn) addBtn.addEventListener('click', handleNew);
  if (editBtn) editBtn.addEventListener('click', handleAlter);
  if (deleteBtn) deleteBtn.addEventListener('click', handleRemove);
  if (saveBtn) saveBtn.addEventListener('click', handleSave);
  if (cancelBtn) cancelBtn.addEventListener('click', handleClear);
  if (backBtn) backBtn.addEventListener('click', handleBack);

  // Search and calendar buttons - using data attributes
  const searchBtn = document.querySelector('[data-lookup="currencyId"]');
  const calendarBtn = document.getElementById('calendarBtn');

  if (searchBtn) searchBtn.addEventListener('click', handleSearchCurrency);
  if (calendarBtn) calendarBtn.addEventListener('click', handleDatePicker);

  // Currency ID auto-fill listener
  const currencyIdInput = document.getElementById('currencyId');
  if (currencyIdInput) {
    // Auto-fill on blur (when user leaves field)
    currencyIdInput.addEventListener('blur', handleCurrencyIdChange);
    // Auto-fill on change
    currencyIdInput.addEventListener('change', handleCurrencyIdChange);
    // Auto-fill on input with debounce (as user types)
    let debounceTimer;
    currencyIdInput.addEventListener('input', function() {
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        handleCurrencyIdChange();
      }, 500); // Wait 500ms after user stops typing
    });
  }

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

  // ============================
  // DATA LOADING
  // ============================

  async function loadBankLimitData(isInitialLoad = false) {
    console.log('🔄 loadBankLimitData called with isInitialLoad:', isInitialLoad);
    try {
      const context = getBankContext();
      console.log('📥 Loading bank limit data for context:', context);
      
      // Validate that we have a valid BankID before proceeding
      if (!context.BankID) {
        console.warn('⚠️ Cannot load bank limit data - no BankID available');
        console.warn('⚠️ Setting INITIAL state (Add, Back buttons only)');
        clearGrid();
        clearFormFields();
        setButtonState(STATE.INITIAL);
        setFormEditable(false);
        return;
      }
      
      console.log('✅ Valid BankID found, proceeding with API call...');
      
      // Clear form state before loading
      formState.isEditing = false;
      formState.editingIndex = undefined;

      const apiPayload = {
        BankID: context.BankID,
        ClientBranchID: context.ClientBranchID,
        ClientID: context.ClientID,
        LimitType: '', // Empty to get all types
        OperatorID: context.OperatorID,
        CurrencyID: '' // Empty to get all currencies
      };
      
      console.log('📤 API Call Payload:', JSON.stringify(apiPayload));

      const response = await OtherStaticDataService.getBankLimit(apiPayload);

      console.log('📥 Bank limit API response:', response);
      console.log('📥 Response code:', response?.code);
      console.log('📥 Response has Details:', !!response?.Details);
      console.log('📥 Response has data.Details:', !!response?.data?.Details);
      console.log('📥 Response has data.Details01:', !!response?.data?.Details01);
      console.log('📥 Response.data:', response?.data);
      console.log('📥 Response.Details:', response?.Details);

      // Check for successful response - API returns {success: true, code: '00', Details: [...]}
      const isSuccess = response && (response.code === '00' || response.success === true);
      
      // Try multiple data locations in order of preference
      let rawData = null;
      if (response?.data?.Details01 && Array.isArray(response.data.Details01)) {
        rawData = response.data.Details01;
        console.log('📍 Using data from: response.data.Details01');
      } else if (response?.data?.Details && Array.isArray(response.data.Details)) {
        rawData = response.data.Details;
        console.log('📍 Using data from: response.data.Details');
      } else if (response?.Details && Array.isArray(response.Details)) {
        rawData = response.Details;
        console.log('📍 Using data from: response.Details');
      } else if (response?.ResponseData) {
        rawData = response.ResponseData;
        console.log('📍 Using data from: response.ResponseData');
      }
      
      console.log('📍 Raw data:', rawData);
      
      if (isSuccess && rawData) {
        const data = Array.isArray(rawData) ? rawData : [rawData];
        
        console.log('📊 Data array length:', data.length);
        console.log('📊 First record keys:', Object.keys(data[0] || {}));
        console.log('📊 First record:', JSON.stringify(data[0]));
        
        // Validate that the record has actual bank limit data (not just metadata)
        const firstRecord = data[0];
        const hasValidData = firstRecord && (
          firstRecord.LimitType || 
          firstRecord.CurrencyID || 
          firstRecord.Limit !== undefined
        );
        
        console.log('📊 Record has valid bank limit data:', hasValidData);
        
        if (!hasValidData) {
          console.warn('⚠️ Record exists but contains no valid bank limit data - treating as empty');
          clearGrid();
          clearFormFields();
          setButtonState(STATE.INITIAL);
          setFormEditable(false);
          return;
        }
        
        formState.gridData = data;
        formState.bankData = data[0] || null;
        
        if (formState.bankData) {
          formState.updateCount = formState.bankData.UpdateCount || 0;
          populateBehindTheScene(formState.bankData);
        }

        populateGridFromData(data);
        
        // Set button state and populate form based on whether we have saved data
        if (data.length > 0) {
          console.log('✅ EXISTING RECORDS FOUND - Setting SAVED state');
          console.log('✅ Populating form with first record (readonly)');
          console.log('✅ Activating buttons: Edit, Delete, Back only');
          
          // Auto-populate form with first record
          populateFormFromGridRow(data[0]);
          // Set form to read-only
          setFormEditable(false);
          // Set state to SAVED (Edit, Delete, Back active)
          setButtonState(STATE.SAVED);
          
          console.log('✅ SCENARIO 1 IMPLEMENTED: Form auto-filled, table populated, Edit/Delete/Back active');
        } else {
          console.log('ℹ️ No existing records - setting INITIAL state (Add, Back active)');
          // No data - clear form and set to INITIAL state (Add, Back active)
          clearFormFields();
          setButtonState(STATE.INITIAL);
          setFormEditable(false);
        }
        
        console.log('✅ Bank limit data loaded successfully');
      } else {
        console.warn('⚠️ No bank limit data found or error:', response);
        clearGrid();
        clearFormFields();
        setButtonState(STATE.INITIAL);
        setFormEditable(false);
      }
    } catch (error) {
      console.error('❌ Error loading bank limit data:', error);
      showToast('Failed to load bank limit data: ' + error.message, { title: 'Load Error', variant: 'error' });
    }
  }

  function populateGridFromData(data) {
    const tbody = document.querySelector('#limitTable tbody');
    if (!tbody) return;

    // Clear existing rows
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
      const row = document.createElement('tr');
      row.className = 'no-data';
      row.innerHTML = '<td colspan="4">No records to display.</td>';
      tbody.appendChild(row);
      return;
    }

    data.forEach((item, index) => {
      const row = document.createElement('tr');
      row.dataset.index = index;
      row.innerHTML = `
        <td>${escapeHtml(item.LimitTypeName || item.LimitType || '')}</td>
        <td>${escapeHtml(item.CurrencyName || item.CurrencyID || '')}</td>
        <td style="text-align: right;">${formatNumber(item.Limit)}</td>
        <td>${formatDate(item.ExpiryDate || '')}</td>
      `;
      
      // Table rows are non-clickable
      
      tbody.appendChild(row);
    });
  }

  function populateBehindTheScene(data) {
    document.getElementById('createdBy').textContent = data.CreatedBy || '-';
    document.getElementById('createdOn').textContent = formatDateTime(data.CreatedOn) || '-';
    document.getElementById('modifiedBy').textContent = data.ModifiedBy || '-';
    document.getElementById('modifiedOn').textContent = formatDateTime(data.ModifiedOn) || '-';
    document.getElementById('supervisedBy').textContent = data.SupervisedBy || '-';
    document.getElementById('supervisedOn').textContent = formatDateTime(data.SupervisedOn) || '-';
  }

  function populateFormFromGridRow(item) {
    document.getElementById('type').value = item.LimitType || '';
    document.getElementById('currencyId').value = item.CurrencyID || '';
    document.getElementById('currencyName').value = item.CurrencyName || '';
    document.getElementById('limit').value = item.Limit || '';
    document.getElementById('expiryDate').value = formatDate(item.ExpiryDate) || '';
    document.getElementById('remarks').value = item.Remarks || '';
  }

  function clearGrid() {
    const tbody = document.querySelector('#limitTable tbody');
    if (!tbody) return;
    
    tbody.innerHTML = '<tr class="no-data"><td colspan="4">No records to display.</td></tr>';
  }

  // ============================
  // GRID ACTIONS WITH API INTEGRATION
  // ============================

  function handleNew() {
    console.log('New limit record');
    clearFormFields();
    formState.editingIndex = undefined; // Clear any editing index to ensure new record is created
    
    // Deselect any selected grid rows
    const selectedRows = document.querySelectorAll('#limitTable tbody tr.selected');
    selectedRows.forEach(row => row.classList.remove('selected'));
    
    setFormEditable(true);
    formState.isEditing = true;
    setButtonState(STATE.ADD_MODE);
    
    // Preload CurrencySearchService for auto-fill functionality
    if (!window.CurrencySearchService) {
      loadCurrencySearchService().catch(err => {
        console.warn('⚠️ Could not preload CurrencySearchService:', err);
      });
    }
  }

  function handleAlter() {
    console.log('Alter limit record');
    if (formState.currentState === STATE.GRID_HAS_DATA) {
      // In GRID_HAS_DATA: Load selected record for editing
      if (!validateSelection()) return;
      // Load the selected record into form
      const selectedRow = document.querySelector('#limitTable tbody tr.selected');
      if (selectedRow) {
        const index = parseInt(selectedRow.dataset.index);
        if (!isNaN(index) && formState.gridData[index]) {
          populateFormFromGridRow(formState.gridData[index]);
          setFormEditable(true); // Fields editable in EDIT_MODE
          formState.isEditing = true;
          formState.editingIndex = index; // Track which record we're editing
          setButtonState(STATE.EDIT_MODE); // Go to INEDIT MODE
          console.log('✏️ Editing existing record at index:', index, '(in EDIT_MODE)');
        }
      }
    } else if (formState.currentState === STATE.SAVED) {
      // In SAVED state: Clicking Edit makes the displayed first record editable
      // Form is already populated with first record, just make it editable
      setFormEditable(true); // Make form editable
      formState.isEditing = true;
      formState.editingIndex = 0; // Editing first record
      setButtonState(STATE.EDIT_MODE); // Enable New and Cancel only
      console.log('✏️ Entering edit mode from SAVED state - first record now editable (EDIT_MODE)');
    } else {
      // Default behavior for other states - fields remain disabled
      if (!validateSelection()) return;
      setFormEditable(false);
      formState.isEditing = false;
    }
  }

  async function handleRemove() {
    console.log('Remove limit record');
    if (!validateSelection()) return;
    
    if (!confirm('Are you sure you want to remove this limit record?')) {
      return;
    }

    try {
      const formData = collectFormData();
      const context = getBankContext();

      const payload = {
        BankID: context.BankID,
        ClientBranchID: context.ClientBranchID,
        ClientID: context.ClientID,
        LimitType: formData.type,
        UpdateCount: formState.updateCount
      };

      console.log('🗑️ Deleting bank limit:', payload);

      const response = await OtherStaticDataService.deleteBankLimit(payload);

      console.log('🗑️ Delete response:', response);

      if (response && (response.code === '00' || response.StatusCode === '00' || response.success === true)) {
        showToast('Bank limit deleted successfully', { title: 'Success', variant: 'success' });
        removeFromGrid();
        clearFormFields();
        // Check if grid still has data after deletion
        if (formState.gridData && formState.gridData.length > 0) {
          setButtonState(STATE.GRID_HAS_DATA);
        } else {
          setButtonState(STATE.INITIAL);
        }
        await loadBankLimitData(); // Reload data
      } else if (response && response.code === '091') {
        // Concurrency error - record was modified by another user
        showToast('Record has been modified by another user. Reloading latest data...', { 
          title: 'Concurrency Error', 
          variant: 'warning',
          timeoutMs: 5000
        });
        
        // Reload fresh data from database
        console.log('🔄 Reloading data due to concurrency error...');
        await loadBankLimitData();
        
        // Reset form state
        setFormEditable(false);
        formState.isEditing = false;
        formState.editingIndex = undefined;
      } else {
        showToast('Failed to delete bank limit: ' + (response.message || response.StatusMessage || 'Unknown error'), { title: 'Delete Failed', variant: 'error' });
      }
    } catch (error) {
      console.error('❌ Error deleting bank limit:', error);
      showToast('Failed to delete bank limit: ' + error.message, { title: 'Delete Error', variant: 'error' });
    }
  }

  async function handleUpdate() {
    console.log('Update - Adding/Updating record to grid');
    if (!validateForm()) return;
    
    // Check if we're editing an existing record
    if (formState.editingIndex !== undefined && formState.editingIndex >= 0) {
      // Update existing record in grid
      updateExistingGridRecord(formState.editingIndex);
      formState.editingIndex = undefined; // Clear editing index
    } else {
      // Add new record to grid
      updateGridData();
    }
    
    // Don't clear form fields - keep them visible after update
    // clearFormFields();
    setFormEditable(false);
    formState.isEditing = false;
    // Button state is set by updateGridData() to GRID_HAS_DATA
  }

  async function handleSave() {
    console.log('Save - Saving all grid records to database');
    
    // Check if there's data in grid to save
    if (!formState.gridData || formState.gridData.length === 0) {
      showToast('No records to save. Please add records first.', { title: 'Validation', variant: 'warning' });
      return;
    }
    
    try {
      const context = getBankContext();

      // Validate BankID and ClientID are present
      if (!context.BankID || !context.ClientID) {
        showToast('Bank ID and Client ID are required to save', { title: 'Validation', variant: 'error' });
        console.error('❌ Missing BankID or ClientID:', context);
        return;
      }

      // Build DetailRecords XML from all grid data
      const detailRecords = buildDetailRecordsXML();

      // Determine if this is a new record or editing existing
      const isNewRecord = !formState.bankData || formState.updateCount === 0;

      const payload = {
        BankID: context.BankID,
        ClientID: context.ClientID,
        LimitType: formState.gridData[0]?.LimitType || '',
        CurrencyID: formState.gridData[0]?.CurrencyID || '',
        CreatedBy: context.OperatorID,
        CreatedOn: new Date().toISOString(),
        ModifiedBy: context.OperatorID,
        ModifiedOn: new Date().toISOString(),
        SupervisedBy: '',
        SupervisedOn: '',
        UpdateCount: isNewRecord ? 0 : formState.updateCount,
        DetailRecords: detailRecords
      };

      console.log('💾 Saving bank limit (isNewRecord: ' + isNewRecord + '):', payload);

      const response = await OtherStaticDataService.addEditBankLimit(payload);

      console.log('💾 Save response:', response);

      if (response && (response.success === true || response.code === '00')) {
        showToast('Bank limit saved successfully', { title: 'Success', variant: 'success' });
        
        // Reload data from database to get fresh UpdateCount and ensure data consistency
        console.log('🔄 Reloading data after successful save...');
        await loadBankLimitData();
        
        setFormEditable(false);
        formState.isEditing = false;
        // State will be set by loadBankLimitData to SAVED
      } else if (response && response.code === '091') {
        // Concurrency error - record was modified by another user
        showToast('Record has been modified by another user. Reloading latest data...', { 
          title: 'Concurrency Error', 
          variant: 'warning',
          timeoutMs: 5000
        });
        
        // Reload fresh data from database
        console.log('🔄 Reloading data due to concurrency error...');
        await loadBankLimitData();
        
        // Reset form state
        setFormEditable(false);
        formState.isEditing = false;
        formState.editingIndex = undefined;
      } else {
        showToast('Failed to save bank limit: ' + (response.message || 'Unknown error'), { title: 'Save Failed', variant: 'error' });
      }
    } catch (error) {
      console.error('❌ Error saving bank limit:', error);
      showToast('Failed to save bank limit: ' + error.message, { title: 'Save Error', variant: 'error' });
    }
  }

  function buildDetailRecordsXML() {
    // Build XML from grid data - each record is a <dt_BankLimit> element
    const context = getBankContext();
    let xml = '';
    
    formState.gridData.forEach(item => {
      xml += '<dt_BankLimit>';
      xml += `<BankID>${escapeXml(context.BankID || '')}</BankID>`;
      xml += `<ClientBranchID>${escapeXml(context.ClientBranchID || '0603')}</ClientBranchID>`;
      xml += `<ClientID>${escapeXml(context.ClientID || '')}</ClientID>`;
      xml += `<LimitType>${escapeXml(item.LimitType || '')}</LimitType>`;
      xml += `<LimitTypeName>${escapeXml(item.LimitTypeName || '')}</LimitTypeName>`;
      xml += `<CurrencyID>${escapeXml(item.CurrencyID || '')}</CurrencyID>`;
      xml += `<CurrencyName>${escapeXml(item.CurrencyName || '')}</CurrencyName>`;
      xml += `<Limit>${escapeXml(item.Limit?.toString() || '0')}</Limit>`;
      xml += `<ExpiryDate>${escapeXml(item.ExpiryDate || '')}</ExpiryDate>`;
      xml += `<Remarks>${escapeXml(item.Remarks || '')}</Remarks>`;
      xml += `<CreatedBy>${escapeXml(context.OperatorID || 'CSADM')}</CreatedBy>`;
      if (item.CreatedOn) {
        xml += `<CreatedOn>${escapeXml(item.CreatedOn)}</CreatedOn>`;
      }
      xml += `<UpdateCount>${escapeXml((item.UpdateCount || formState.updateCount || 0).toString())}</UpdateCount>`;
      xml += '</dt_BankLimit>';
    });
    
    return xml;
  }

  async function handleClear() {
    console.log('Clear form / Cancel');
    
    // Cancel any editing operation
    setFormEditable(false);
    formState.isEditing = false;
    
    // If in ADD_MODE or EDIT_MODE, repopulate form with the record being edited/viewed
    if (formState.editingIndex !== undefined && formState.gridData && formState.gridData[formState.editingIndex]) {
      populateFormFromGridRow(formState.gridData[formState.editingIndex]);
    }
    
    // Clear editing index
    formState.editingIndex = undefined;
    
    // Set to VIEW_MODE - All buttons enabled except Add and Update
    // This ensures Back button is active and user can navigate back to main screen
    if (formState.gridData && formState.gridData.length > 0) {
      setButtonState(STATE.VIEW_MODE);
    } else {
      // No data - go to INITIAL state
      setButtonState(STATE.INITIAL);
    }
  }

  function handleShow() {
    console.log('Show all bank limits');
    // Reload the grid to show all limit records
    loadBankLimitData();
  }

  function handleView() {
    console.log('View selected limit record');
    // View functionality - populate form with selected grid row
    if (!validateSelection()) {
      return;
    }
    const selectedRow = document.querySelector('#limitTable tbody tr.selected');
    if (selectedRow) {
      const index = selectedRow.dataset.index;
      if (index !== undefined && formState.gridData[index]) {
        populateFormFromGridRow(formState.gridData[index]);
      }
    }
  }

  function handleBack() {
    console.log('Back to parent');
    // Close the iframe and return to maintain-banks
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({ 
        action: 'submoduleClosed',
        source: 'Bank Limit Maintenance'
      }, '*');
    } else {
      window.close();
    }
  }

  // Helper Functions
  // ============================
  // CURRENCY HANDLING
  // ============================

  /**
   * Auto-fill currency name when currency ID is entered
   */
   async function handleCurrencyIdChange() {
    const currencyIdInput = document.getElementById('currencyId');
    const currencyNameInput = document.getElementById('currencyName');
    const currencyId = currencyIdInput?.value?.trim();

    if (!currencyId) {
      if (currencyNameInput) currencyNameInput.value = '';
      return;
    }

    try {
      // Load CurrencySearchService if not already loaded
      if (!window.CurrencySearchService) {
        console.log('📦 Loading CurrencySearchService...');
        await loadCurrencySearchService();
      }

      const CurrencySearchService = window.CurrencySearchService;
      if (!CurrencySearchService) {
        console.warn('⚠️ CurrencySearchService not available');
        return;
      }

      // Get all currencies
      const response = await CurrencySearchService.getCurrencies();
      
      if (!response?.success) {
        console.warn('⚠️ Failed to fetch currencies');
        return;
      }

      // Extract currencies from response
      let currencies = [];
      if (Array.isArray(response.data)) currencies = response.data;
      else if (Array.isArray(response.Details)) currencies = response.Details;
      else if (Array.isArray(response?.data?.Details)) currencies = response.data.Details;
      else if (Array.isArray(response?.data?.Details01)) currencies = response.data.Details01;

      // Find matching currency (case-insensitive)
      const matchedCurrency = currencies.find(c => {
        const id = c.CurrencyID ?? c.CurrencyId ?? c.CurrencyCode ?? c.Code ?? c.ID ?? '';
        return id.toLowerCase() === currencyId.toLowerCase();
      });

      if (matchedCurrency && currencyNameInput) {
        const currencyName = matchedCurrency.CurrencyName ?? matchedCurrency.Description ?? matchedCurrency.Name ?? '';
        currencyNameInput.value = currencyName;
        console.log('✅ Currency auto-filled:', currencyId, '->', currencyName);
      } else {
        console.log('⚠️ Currency not found:', currencyId);
        if (currencyNameInput) currencyNameInput.value = '';
      }
    } catch (error) {
      console.error('❌ Error auto-filling currency:', error);
    }
  }

  /**
   * Load CurrencySearchService dynamically
   */
  async function loadCurrencySearchService() {
    return new Promise((resolve, reject) => {
      if (window.CurrencySearchService) {
        resolve();
        return;
      }

      const script = document.createElement('script');
      script.src = '../../../../assets/js/services/search/currencySearchService.js';
      script.onload = () => {
        console.log('✅ CurrencySearchService loaded');
        resolve();
      };
      script.onerror = () => {
        console.error('❌ Failed to load CurrencySearchService');
        reject(new Error('Failed to load CurrencySearchService'));
      };
      document.head.appendChild(script);
    });
  }

  async function handleSearchCurrency() {
    console.log('Search currency');
    
    try {
      // Load CurrencySearchService if not already loaded
      if (!window.CurrencySearchService) {
        console.log('📦 Loading CurrencySearchService...');
        await loadCurrencySearchService();
      }

      const CurrencySearchService = window.CurrencySearchService;
      if (!CurrencySearchService) {
        showToast('Currency search service not available', { title: 'Service Error', variant: 'error' });
        return;
      }

      // Open currency search modal
      await CurrencySearchService.openSearchModal((currencyId, currencyName) => {
        console.log('✅ Currency selected:', currencyId, currencyName);
        document.getElementById('currencyId').value = currencyId || '';
        document.getElementById('currencyName').value = currencyName || '';
      });
    } catch (error) {
      console.error('❌ Error opening currency search:', error);
      showToast('Failed to open currency search: ' + error.message, { title: 'Search Error', variant: 'error' });
    }
  }

  /**
   * Open calendar date picker for Expiry Date field
   */
  function handleDatePicker() {
    const expiryDateInput = document.getElementById('expiryDate');
    if (!expiryDateInput) {
      console.warn('[Calendar] Expiry Date input not found');
      return;
    }

    // If flatpickr is initialized on the field, open it programmatically
    if (expiryDateInput._flatpickr) {
      expiryDateInput._flatpickr.open();
    } else {
      // Fallback: trigger click on the input to open flatpickr
      expiryDateInput.click();
      expiryDateInput.focus();
    }
  }

  function validateSelection() {
    const selectedRow = document.querySelector('#limitTable tbody tr.selected');
    if (!selectedRow || selectedRow.classList.contains('no-data')) {
      showToast('Please select a record from the grid', { title: 'Validation', variant: 'warning' });
      return false;
    }
    return true;
  }

  function validateForm() {
    const type = document.getElementById('type').value;
    const currencyId = document.getElementById('currencyId').value.trim();
    const limit = document.getElementById('limit').value.trim();
    const expiryDate = document.getElementById('expiryDate').value.trim();

    if (!type) {
      showToast('Please select a Type', { title: 'Validation', variant: 'warning' });
      document.getElementById('type').focus();
      return false;
    }

    if (!currencyId) {
      showToast('Currency ID is required', { title: 'Validation', variant: 'warning' });
      document.getElementById('currencyId').focus();
      return false;
    }

    if (!limit) {
      showToast('Limit is required', { title: 'Validation', variant: 'warning' });
      document.getElementById('limit').focus();
      return false;
    }

    if (!expiryDate) {
      showToast('Expiry Date is required', { title: 'Validation', variant: 'warning' });
      document.getElementById('expiryDate').focus();
      return false;
    }

    return true;
  }

  function collectFormData() {
    const typeSelect = document.getElementById('type');
    const typeValue = typeSelect.value;
    const typeText = typeSelect.options[typeSelect.selectedIndex]?.text || typeValue;
    
    return {
      type: typeValue,
      typeName: typeText,
      currencyId: document.getElementById('currencyId').value,
      currencyName: document.getElementById('currencyName').value,
      limit: document.getElementById('limit').value,
      expiryDate: document.getElementById('expiryDate').value,
      remarks: document.getElementById('remarks').value
    };
  }

  function clearFormFields() {
    document.getElementById('type').selectedIndex = 0;
    document.getElementById('currencyId').value = '';
    document.getElementById('currencyName').value = '';
    document.getElementById('limit').value = '';
    document.getElementById('expiryDate').value = '';
    document.getElementById('remarks').value = '';
  }

  function setFormEditable(editable) {
    console.log('🔧 setFormEditable called with editable =', editable);
    
    // Handle text/number inputs - Select ALL .bs-input-text fields
    const textInputs = document.querySelectorAll('#bankLimitForm .bs-input-text');
    textInputs.forEach(input => {
      // Skip currencyName - it should ALWAYS be readonly (auto-filled from currencyId)
      if (input.id === 'currencyName') {
        return;
      }
      
      if (editable) {
        input.disabled = false;
        input.removeAttribute('readonly');
        console.log('✅ Enabled field:', input.id);
      } else {
        // Use readonly instead of disabled to keep data visible and allow number spinners
        input.disabled = false;
        input.setAttribute('readonly', 'readonly');
        console.log('🔒 Made readonly:', input.id);
      }
    });
    
    // Handle select dropdowns - must use disabled (no readonly for selects)
    const selects = document.querySelectorAll('#bankLimitForm .bs-select');
    selects.forEach(select => {
      select.disabled = !editable;
      console.log(editable ? '✅ Enabled dropdown:' : '🔒 Disabled dropdown:', select.id);
    });
    
    const searchBtn = document.querySelector('[data-lookup="currencyId"]');
    const calendarBtn = document.getElementById('calendarBtn');
    if (searchBtn) {
      searchBtn.disabled = !editable;
      console.log(editable ? '✅ Enabled search button' : '🔒 Disabled search button');
    }
    if (calendarBtn) {
      calendarBtn.disabled = !editable;
      console.log(editable ? '✅ Enabled calendar button' : '🔒 Disabled calendar button');
    }
  }

  function updateGridData() {
    const formData = collectFormData();
    const tbody = document.querySelector('#limitTable tbody');
    
    // Remove "no records" message if exists
    const noDataRow = tbody.querySelector('.no-data');
    if (noDataRow) {
      tbody.removeChild(noDataRow);
    }
    
    // Calculate the new index
    const newIndex = formState.gridData.length;
    
    // Add new row
    const row = document.createElement('tr');
    row.dataset.index = newIndex;
    row.innerHTML = `
      <td>${escapeHtml(formData.typeName)}</td>
      <td>${escapeHtml(formData.currencyName)}</td>
      <td style="text-align: right;">${formatNumber(formData.limit)}</td>
      <td>${formatDate(formData.expiryDate)}</td>
    `;
    
    // Table rows are non-clickable
    
    tbody.appendChild(row);
    
    // Update formState.gridData
    formState.gridData.push({
      LimitType: formData.type,
      LimitTypeName: formData.typeName,
      CurrencyID: formData.currencyId,
      CurrencyName: formData.currencyName,
      Limit: formData.limit,
      ExpiryDate: formData.expiryDate,
      Remarks: formData.remarks
    });

    // Switch to GRID_HAS_DATA state
    setButtonState(STATE.GRID_HAS_DATA);
  }

  function updateExistingGridRecord(index) {
    const formData = collectFormData();
    const tbody = document.querySelector('#limitTable tbody');
    
    // Update the data in formState.gridData
    formState.gridData[index] = {
      LimitType: formData.type,
      LimitTypeName: formData.typeName,
      CurrencyID: formData.currencyId,
      CurrencyName: formData.currencyName,
      Limit: formData.limit,
      ExpiryDate: formData.expiryDate,
      Remarks: formData.remarks
    };
    
    // Update the visual row in the table
    const rows = tbody.querySelectorAll('tr:not(.no-data)');
    if (rows[index]) {
      rows[index].dataset.index = index;
      rows[index].innerHTML = `
        <td>${escapeHtml(formData.typeName)}</td>
        <td>${escapeHtml(formData.currencyName)}</td>
        <td style="text-align: right;">${formatNumber(formData.limit)}</td>
        <td>${formatDate(formData.expiryDate)}</td>
      `;
      
      // Re-attach click handler
      rows[index].addEventListener('click', function() {
        const rowIndex = parseInt(this.dataset.index);
        tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        this.classList.add('selected');
        if (!isNaN(rowIndex) && formState.gridData[rowIndex]) {
          populateFormFromGridRow(formState.gridData[rowIndex]);
        }
      });
      
      rows[index].classList.remove('selected');
    }
    
    console.log('✅ Updated record at index:', index);
    
    // Switch to GRID_HAS_DATA state
    setButtonState(STATE.GRID_HAS_DATA);
  }

  function removeFromGrid() {
    const selectedRow = document.querySelector('#limitTable tbody tr.selected');
    if (selectedRow) {
      const index = parseInt(selectedRow.dataset.index);
      if (!isNaN(index)) {
        formState.gridData.splice(index, 1);
      }
      selectedRow.remove();
      
      // Check if tbody is empty
      const tbody = document.querySelector('#limitTable tbody');
      if (tbody.children.length === 0) {
        const row = document.createElement('tr');
        row.className = 'no-data';
        row.innerHTML = '<td colspan="4">No records to display.</td>';
        tbody.appendChild(row);
      }
    }
  }

  function populateFormFromRow(row) {
    const cells = row.cells;
    document.getElementById('type').value = cells[0].textContent;
    document.getElementById('currencyId').value = cells[1].textContent;
    document.getElementById('limit').value = cells[2].textContent;
    document.getElementById('expiryDate').value = cells[3].textContent;
  }

  function handleKeyboardShortcuts(event) {
    // Ctrl/Cmd + S to save
    if ((event.ctrlKey || event.metaKey) && event.key === 's') {
      event.preventDefault();
      if (formState.isEditing) {
        handleUpdate();
      }
    }
    
    // Escape to cancel
    if (event.key === 'Escape') {
      if (formState.isEditing) {
        handleClear();
      }
    }
  }

  // ============================
  // UTILITY FUNCTIONS
  // ============================

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function escapeXml(text) {
    if (!text) return '';
    return String(text)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function formatDate(dateString) {
    if (!dateString) return '01/Jan/0001';
    try {
      const date = new Date(dateString);
      const day = String(date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[date.getMonth()];
      const year = date.getFullYear();
      return `${day}/${month}/${year}`;
    } catch {
      return dateString;
    }
  }

  function formatNumber(value) {
    if (!value && value !== 0) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function formatDateTime(dateString) {
    if (!dateString) return '';
    try {
      const date = new Date(dateString);
      return date.toLocaleString();
    } catch {
      return dateString;
    }
  }

  // Expose debug interface
  window.BankLimitMaintenanceDebug = {
    loadData: loadBankLimitData,
    getState: () => formState,
    getBankContext: getBankContext,
    testSave: handleUpdate,
    testDelete: handleRemove
  };

  console.log('✅ Bank Limit Maintenance Module Loaded');
  console.log('📊 Debug tools available at: window.BankLimitMaintenanceDebug');

})();
