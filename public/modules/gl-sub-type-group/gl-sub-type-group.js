// GL Sub Type Group Module - Event Handlers and Functionality
console.log('🚀 GL Sub Type Group module script loaded!');

(function() {
  'use strict';

  console.log('🚀 GL Sub Type Group IIFE executing...');

  // Service references
  let GeneralLedgerService = null;
  let LookupService = null;

  // State management
  let currentMode = 'view'; // 'view', 'edit', 'new'
  let currentData = [];
  let deletedRecords = []; // Track records to be deleted
  let selectedRecord = null;
  let moduleUpdateCount = 0; // Track UpdateCount for concurrency control
  
  // Sub Type Modal state
  let subTypeCurrentData = [];
  let subTypeSelectedRecord = null;
  let subTypeCurrentMode = 'view'; // 'view', 'add', 'edit'
  let subTypeDeletedRecords = []; // Track deleted sub type records
  let subTypeUpdateCount = 0;

  // Utility functions
  const id = (elementId) => document.getElementById(elementId);
  const qs = (selector) => document.querySelector(selector);

  // Toast notification
  function toast(message, type = 'info') {
    console.log(`[${type.toUpperCase()}] ${message}`);
    // TODO: Integrate with actual toast system
  }

  // Logger
  function log(message, data = null) {
    console.log(`[GL Sub Type Group] ${message}`, data || '');
  }

  // Format date helper
  function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const year = d.getFullYear();
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    const seconds = String(d.getSeconds()).padStart(2, '0');
    return `${month}/${day}/${year} ${hours}:${minutes}:${seconds}`;
  }

  /**
   * Initialize module
   */
  async function initializeGLSubTypeGroup() {
    try {
      console.log('🔧 Initializing GL Sub Type Group module...');
      
      // Access services from global scope
      if (typeof window.GeneralLedgerService !== 'undefined') {
        GeneralLedgerService = window.GeneralLedgerService;
        console.log('✅ GeneralLedgerService loaded successfully:', GeneralLedgerService);
      } else {
        console.error('❌ GeneralLedgerService not found on window object!');
        toast('GeneralLedgerService not available', 'error');
        return;
      }
      
      if (typeof window.LookupService !== 'undefined') {
        LookupService = window.LookupService;
        console.log('✅ LookupService loaded successfully:', LookupService);
      } else {
        console.error('❌ LookupService not found on window object!');
      }
      
      // Load Account Types
      await loadAccountTypes();
      
      // Set up Account Type change listener
      const accountTypeSelect = id('accountTypeSelect');
      if (accountTypeSelect) {
        console.log('✅ Account Type select found, attaching listener');
        accountTypeSelect.addEventListener('change', handleAccountTypeChange);
      } else {
        console.error('❌ Account Type select not found!');
      }
      
      console.log('✅ Module initialized');
    } catch (error) {
      console.error('❌ Error initializing GL Sub Type Group:', error);
      toast('Failed to initialize module', 'error');
    }
  }

  /**
   * Load Account Types from system codes
   */
  async function loadAccountTypes() {
    try {
      console.log('🔍 Loading Account Types from system codes...');
      
      if (!LookupService) {
        console.warn('⚠️ LookupService not available, using hardcoded options');
        return;
      }
      
      // Get Account Types from system codes
      const accountTypes = await LookupService.getSystemCodeOptions('GLAccountTypeID');
      console.log('✅ Account Types loaded:', accountTypes);
      
      const accountTypeSelect = id('accountTypeSelect');
      if (!accountTypeSelect) {
        console.error('❌ Account Type select not found!');
        return;
      }
      
      // Clear existing options except the first "--Select--" option
      accountTypeSelect.innerHTML = '<option value="">--Select--</option>';
      
      // Populate dropdown with account types
      accountTypes.forEach(type => {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.label;
        accountTypeSelect.appendChild(option);
      });
      
      console.log('✅ Account Type dropdown populated with', accountTypes.length, 'options');
    } catch (error) {
      console.error('❌ Error loading account types:', error);
    }
  }

  /**
   * Handle Account Type change
   */
  async function handleAccountTypeChange(event) {
    const accountTypeId = event.target.value;
    
    if (!accountTypeId || accountTypeId === '--Select--') {
      clearForm();
      return;
    }

    log(`Account type changed to: ${accountTypeId}`);
    // Clear grid - data will only load when View button is clicked
    clearForm();
    currentData = [];
    populateTable([]);
  }

  /**
   * Get session data from localStorage
   */
  function getSessionData() {
    const sessionData = {
      BankID: localStorage.getItem('BankID') || '',
      BranchID: localStorage.getItem('BranchID') || '',
      OperatorID: localStorage.getItem('OperatorID') || ''
    };
    
    // Warn if session data is missing
    if (!sessionData.BankID || !sessionData.BranchID || !sessionData.OperatorID) {
      console.warn('⚠️ Missing session data in localStorage. Please ensure you are logged in.');
      console.warn('Current localStorage values:', {
        BankID: sessionData.BankID || '(empty)',
        BranchID: sessionData.BranchID || '(empty)',
        OperatorID: sessionData.OperatorID || '(empty)'
      });
    }
    
    return sessionData;
  }

  /**
   * Load GL Type Group data from API (called by View button and Account Type change)
   */
  async function loadSubAccountTypes() {
    try {
      // Ensure service is loaded
      if (!GeneralLedgerService) {
        console.warn('⚠️ GeneralLedgerService not loaded yet, attempting to load...');
        await initializeGLSubTypeGroup();
        
        if (!GeneralLedgerService) {
          console.error('❌ Failed to load GeneralLedgerService');
          toast('Service not available. Please refresh the page.', 'error');
          return;
        }
      }

      const sessionData = getSessionData();
      const accountTypeId = id('accountTypeSelect')?.value;

      console.log('🔍 Session Data:', sessionData);
      console.log('🔍 Account Type ID:', accountTypeId);

      if (!accountTypeId || accountTypeId === '--Select--') {
        toast('Please select an Account Type', 'warning');
        return;
      }

      log('Loading GL Type Group data...', { accountTypeId });

      const requestData = {
        BankID: sessionData.BankID,
        OurBranchID: sessionData.BranchID,
        GLAccountTypeID: accountTypeId,
        OperatorID: sessionData.OperatorID
      };

      console.log('📤 Request Data:', requestData);

      const result = await GeneralLedgerService.getGLTypeGroup(requestData);

      console.log('📥 Full API Response:', result);
      console.log('📥 Response success:', result.success);
      console.log('📥 Response data:', result.data);
      console.log('📥 Response Details:', result.data?.Details);
      console.log('📥 Response Details01:', result.data?.Details01);
      console.log('📥 Response UpdateCount:', result.data?.UpdateCount);

      if (result.success && result.data) {
        // Extract data from Details01 array (GL Type Group data is in Details01)
        let data = result.data.Details01 || result.data.Details || [];
        
        console.log('✅ Extracted data array:', data);
        console.log('✅ Data length:', data.length);
        if (data.length > 0) {
          console.log('✅ First record:', data[0]);
          console.log('✅ All records:', data);
        }
        
        // Store UpdateCount from the response or first record for concurrency control
        moduleUpdateCount = result.data.UpdateCount || (data[0]?.UpdateCount) || 0;
        console.log('✅ Stored UpdateCount:', moduleUpdateCount);
        
        currentData = data;
        populateTable(data);
        
        if (data.length === 0) {
          toast('No GL Type Group records found for this account type.', 'warning');
          log('No GL Type Group records found');
          // No records scenario: Enable Add and Update/Clear, disable New/Alter/Remove/Delete
          id('addBtn')?.removeAttribute('disabled');
          id('newBtn')?.setAttribute('disabled', 'disabled');
          id('alterBtn')?.setAttribute('disabled', 'disabled');
          id('removeBtn')?.setAttribute('disabled', 'disabled');
          id('deleteBtn')?.setAttribute('disabled', 'disabled');
          id('updateBtn')?.removeAttribute('disabled');
          id('clearBtn')?.removeAttribute('disabled');
        } else {
          toast(`Loaded ${data.length} record(s)`, 'success');
          log('GL Type Group data loaded successfully');
          // Has records scenario: Enable Add and Delete, disable New/Alter/Remove/Update/Clear
          id('addBtn')?.removeAttribute('disabled');
          id('deleteBtn')?.removeAttribute('disabled'); // Enable Delete when records exist
          id('newBtn')?.setAttribute('disabled', 'disabled');
          id('alterBtn')?.setAttribute('disabled', 'disabled');
          id('removeBtn')?.setAttribute('disabled', 'disabled');
          id('updateBtn')?.setAttribute('disabled', 'disabled');
          id('clearBtn')?.setAttribute('disabled', 'disabled');
        }
      } else {
        console.error('❌ API call failed:', result.message);
        toast(result.message || 'Failed to load data', 'error');
        currentData = [];
        populateTable([]);
        // Error scenario: Enable Add and Update/Clear, disable New/Alter/Remove/Delete
        id('addBtn')?.removeAttribute('disabled');
        id('newBtn')?.setAttribute('disabled', 'disabled');
        id('alterBtn')?.setAttribute('disabled', 'disabled');
        id('removeBtn')?.setAttribute('disabled', 'disabled');
        id('deleteBtn')?.setAttribute('disabled', 'disabled');
        id('updateBtn')?.removeAttribute('disabled');
        id('clearBtn')?.removeAttribute('disabled');
      }
    } catch (error) {
      console.error('❌ Error loading GL Type Group data:', error);
      toast('Error loading data', 'error');
      currentData = [];
      populateTable([]);
    }
  }

  /**
   * Populate table with data
   */
  function populateTable(data) {
    const tbody = id('glTypeGroupTableBody');
    console.log('📊 populateTable called with:', data);
    console.log('📊 tbody element:', tbody);
    
    if (!tbody) {
      console.error('❌ Table body element not found!');
      return;
    }

    if (!data || data.length === 0) {
      console.log('⚠️ No data to display');
      tbody.innerHTML = '<tr style="text-align: center; color: #c85c2d; font-size: 0.8rem;"><td colspan="2" style="padding: 20px;">No records to display.</td></tr>';
      return;
    }

    console.log('✅ Populating table with', data.length, 'records');
    
    tbody.innerHTML = data.map((item, index) => {
      console.log(`Row ${index}:`, item);
      // GL Type Group uses GLTypeGroupID, not GLSubAccountTypeID
      const typeGroupId = item.GLTypeGroupID || item.GLSubAccountTypeID || '';
      const description = item.Description || '';
      return `
        <tr data-index="${index}">
          <td>${escapeHtml(typeGroupId)}</td>
          <td>${escapeHtml(description)}</td>
        </tr>
      `;
    }).join('');

    log(`Table populated with ${data.length} records`);

    // Add click handlers to rows
    tbody.querySelectorAll('tr').forEach(row => {
      row.addEventListener('click', function(e) {
        const index = this.getAttribute('data-index');
        if (index !== null) {
          handleRowClick(index);
        }
      });
    });
  }

  /**
   * Handle row click
   */
  function handleRowClick(index) {
    const tbody = id('glTypeGroupTableBody');
    if (!tbody) return;

    // Remove selection from all rows
    tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
    
    // Select clicked row
    const row = tbody.querySelector(`tr[data-index="${index}"]`);
    if (row) {
      row.classList.add('selected');
      selectedRecord = currentData[index];
      log('Selected record:', selectedRecord);
      populateForm(selectedRecord); // Populate the form fields
    }
  }

  /**
   * Clear form fields
   */
  function clearForm() {
    id('glTypeGroupIdField').value = '';
    id('descriptionField').value = '';
    
    // Clear Behind The Scene fields
    id('createdByField').value = '';
    id('modifiedByField').value = '';
    id('supervisedByField').value = '';
    id('createdOnField').value = '';
    id('modifiedOnField').value = '';
    id('supervisedOnField').value = '';

    selectedRecord = null;
    currentMode = 'view';
    
    // Clear table selection
    const tbody = id('glTypeGroupTableBody');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
    }
  }

  /**
   * Populate form with record data
   */
  function populateForm(record) {
    if (!record) return;

    // Prefer GLTypeGroupID, fallback to GLSubAccountTypeID
    id('glTypeGroupIdField').value = record.GLTypeGroupID || record.GLSubAccountTypeID || '';
    id('descriptionField').value = record.Description || '';

    // Behind The Scene fields - format dates if they exist
    id('createdByField').value = record.CreatedBy || '';
    id('modifiedByField').value = record.ModifiedBy || '';
    id('supervisedByField').value = record.SupervisedBy || '';
    id('createdOnField').value = record.CreatedOn ? new Date(record.CreatedOn).toLocaleString() : '';
    id('modifiedOnField').value = record.ModifiedOn ? new Date(record.ModifiedOn).toLocaleString() : '';
    id('supervisedOnField').value = record.SupervisedOn ? new Date(record.SupervisedOn).toLocaleString() : '';

    log('Form populated with record:', record);
  }

  // Event Handlers
  function attachEventListeners() {
    console.log('🔧 Attaching event listeners...');
    
    // DataEntry submenu toggle
    const dataEntryBtn = id('dataEntryBtn');
    if (dataEntryBtn) {
      console.log('✅ DataEntry button found');
      dataEntryBtn.addEventListener('click', (e) => {
        e.preventDefault();
        toggleDataEntrySubmenu();
      });
    } else {
      console.warn('⚠️ DataEntry button not found');
    }

    const glAccountSubTypeBtn = id('glAccountSubTypeBtn');
    if (glAccountSubTypeBtn) {
      glAccountSubTypeBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await openGLAccountSubTypeModal();
      });
    }

    // Content Area Buttons
    id('newBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleNewAction();
    });

    id('alterBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleAlterAction();
    });

    id('removeBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleRemoveAction();
    });

    id('updateBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleUpdateAction();
    });

    id('clearBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleClearAction();
    })
      ;

    // Right Panel Buttons
    id('viewBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleViewAction();
    });

    id('addBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleAddAction();
    });

    id('editBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleEditAction();
    });

    id('deleteBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleDeleteAction();
    });

    id('saveBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSaveAction();
    });

    id('cancelBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleCancelAction();
    });

    // Sub Type Modal buttons
    id('subTypeNewBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubTypeNew();
    });

    id('subTypeAlterBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubTypeAlter();
    });

    id('subTypeRemoveBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubTypeRemove();
    });

    id('subTypeUpdateBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubTypeUpdate();
    });

    id('subTypeClearBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubTypeClear();
    });

    id('subTypeViewBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubTypeView();
    });

    id('subTypeAddBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubTypeAdd();
    });

    id('subTypeEditBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubTypeEdit();
    });

    id('subTypeDeleteBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubTypeDelete();
    });

    id('subTypeSaveBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubTypeSave();
    });

    id('subTypeCancelBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubTypeCancel();
    });

    id('subTypeBackBtn')?.addEventListener('click', (e) => {
      e.preventDefault();
      handleSubTypeBack();
    });
  
    console.log('✅ All event listeners attached');
  }

  function toggleDataEntrySubmenu() {
    const submenu = id('dataEntrySubmenu');
    if (submenu) {
      submenu.style.display = submenu.style.display === 'none' ? 'block' : 'none';
    }
  }

  async function openGLAccountSubTypeModal() {
    log('Opening GL Account Sub Type modal');
    const submenu = id('dataEntrySubmenu');
    if (submenu) {
      submenu.style.display = 'none';
    }
    
    // Get selected account type from main form
    const accountType = id('accountTypeSelect')?.value;
    console.log('🔍 Selected Account Type:', accountType);
    
    if (!accountType || accountType === '' || accountType === '--Select--') {
      console.warn('⚠️ No Account Type selected');
      alert('Please select an Account Type first');
      return;
    }
    
    // Check if data is already loaded in the main form
    if (!currentData || currentData.length === 0) {
      console.warn('⚠️ No data loaded. Please click View first.');
      alert('Please click View button first to load the data');
      return;
    }
    
    // Populate GL Sub Type Groups dropdown from currentData
    console.log('📞 Populating dropdown from currentData:', currentData);
    populateGLSubTypeGroupsDropdown();
    
    // Initialize button states
    updateSubTypeButtonStates('initial');
    
    // Open the modal
    const modal = document.getElementById('glAccountSubTypeModal');
    if (modal) {
      // Ensure Bootstrap is available
      if (typeof bootstrap !== 'undefined') {
        const bootstrapModal = new bootstrap.Modal(modal);
        bootstrapModal.show();
        log('GL Account Sub Type modal opened');
      } else {
        console.error('Bootstrap is not loaded');
      }
    } else {
      console.error('GL Account Sub Type modal not found');
    }
  }

  /**
   * Populate GL Sub Type Groups dropdown from currentData
   */
  function populateGLSubTypeGroupsDropdown() {
    console.log('🔄 Populating GL Sub Type Groups dropdown from currentData');
    
    const dropdown = id('subTypeGroupSelect');
    if (!dropdown) {
      console.error('❌ Sub Type Group dropdown not found!');
      return;
    }

    console.log('✅ Found dropdown element:', dropdown);

    // Clear existing options
    dropdown.innerHTML = '<option value="">--Select--</option>';

    if (currentData && currentData.length > 0) {
      console.log(`📋 Processing ${currentData.length} items from currentData`);
      
      // Populate dropdown with GLTypeGroupID and Description from currentData
      currentData.forEach(item => {
        const option = document.createElement('option');
        option.value = item.GLTypeGroupID;
        option.textContent = `${item.GLTypeGroupID} - ${item.Description}`;
        dropdown.appendChild(option);
        console.log(`✅ Added option: ${item.GLTypeGroupID} - ${item.Description}`);
      });

      console.log(`✅ Successfully loaded ${currentData.length} GL Sub Type Groups`);
      toast(`Loaded ${currentData.length} sub type groups`, 'success');
      
      // Add change event listener to auto-load data when selection changes
      dropdown.removeEventListener('change', handleSubTypeGroupChange); // Remove old listener if exists
      dropdown.addEventListener('change', handleSubTypeGroupChange);
      console.log('✅ Added change event listener to GL Sub Type Group dropdown');
    } else {
      console.warn('⚠️ No data in currentData array');
      toast('No sub type groups available', 'info');
    }
  }

  /**
   * Handle GL Sub Type Group dropdown change
   */
  async function handleSubTypeGroupChange(event) {
    const selectedValue = event.target.value;
    console.log('🔄 GL Sub Type Group changed to:', selectedValue);
    
    if (selectedValue && selectedValue !== '' && selectedValue !== '--Select--') {
      // Automatically load GL Sub Account Types
      await loadGLSubAccountTypes();
      
      // Update button states - View, Add, Edit, Delete, Cancel, Back should be active
      updateSubTypeButtonStates('dataLoaded');
    } else {
      // Clear the table if no selection
      subTypeCurrentData = [];
      populateSubTypeTable([]);
      
      // Reset to initial state
      updateSubTypeButtonStates('initial');
    }
  }

  function handleNewAction() {
    log('New action triggered');
    clearForm();
    currentMode = 'new';

    // Enable update and clear buttons
    id('updateBtn')?.removeAttribute('disabled');
    id('clearBtn')?.removeAttribute('disabled');
  }

  function handleAlterAction() {
    log('Alter action triggered');
    if (!selectedRecord) {
      toast('Please select a record to alter', 'warning');
      return;
    }
    
    populateForm(selectedRecord);
    currentMode = 'edit';
    // Enable Update and Clear buttons
    id('updateBtn')?.removeAttribute('disabled');
    id('clearBtn')?.removeAttribute('disabled');
    toast('Ready to alter record. Modify the fields and click Update to save.', 'info');
    // Focus on description field
    id('descriptionField')?.focus();
  }

  function handleRemoveAction() {
    log('Remove action triggered');
    
    if (!selectedRecord) {
      toast('Please select a record to remove', 'warning');
      return;
    }
    
    // Find the index of the selected record
    const index = currentData.findIndex(item => item === selectedRecord);
    
    if (index === -1) {
      toast('Record not found in current data', 'warning');
      return;
    }
    
    // If it's a new record (not yet saved), just remove it from the array
    if (selectedRecord.IsNew) {
      currentData.splice(index, 1);
      toast('New record removed from grid', 'info');
    } else {
      // For existing records, add to deletedRecords array for backend deletion
      deletedRecords.push({
        GLTypeGroupID: selectedRecord.GLTypeGroupID || selectedRecord.GLSubAccountTypeID,
        Description: selectedRecord.Description,
        ButtonMark: 'R'
      });
      
      // Remove from currentData
      currentData.splice(index, 1);
      
      toast('Record marked for deletion. Click Save to commit.', 'info');
    }
    
    // Repopulate table
    populateTable(currentData);
    
    // Clear form and selection
    clearForm();
    selectedRecord = null;
  }

  async function handleUpdateAction() {
    log('Update action triggered');
    
    // Get form values
    let glTypeGroupId = id('glTypeGroupIdField')?.value?.trim();
    let description = id('descriptionField')?.value?.trim();
    
    // Get session data and account type
    const sessionData = getSessionData();
    const accountTypeId = id('accountTypeSelect')?.value;

    if (!glTypeGroupId) {
      toast('Please enter GLTypeGroupID', 'warning');
      return;
    }

    if (currentMode === 'new' || !selectedRecord) {
      // Adding new record to grid (when no record is selected)
      const exists = currentData.some(item => 
        (item.GLTypeGroupID || item.GLSubAccountTypeID) === glTypeGroupId
      );

      if (exists) {
        toast('GLTypeGroupID already exists in the list', 'warning');
        return;
      }

      const newRecord = {
        BankID: sessionData.BankID,
        GLAccountTypeID: accountTypeId,
        GLTypeGroupID: glTypeGroupId,
        GLSubAccountTypeID: glTypeGroupId,
        Description: description || '',
        CreatedBy: sessionData.OperatorID,
        ModifiedBy: null,
        SupervisedBy: null,
        IsNew: true
      };

      currentData.push(newRecord);
      populateTable(currentData);
      // Form stays filled - user can modify and click Update again to add more
      toast('Record added to grid. Modify and click Update again to add more, or click Save to commit.', 'info');
      return;
    }

    // Editing existing record
    let index = currentData.findIndex(item => item === selectedRecord);

    if (index === -1) {
      toast('No record to update.', 'warning');
      return;
    }

    currentData[index] = {
      ...currentData[index],
      GLTypeGroupID: glTypeGroupId,
      GLSubAccountTypeID: glTypeGroupId,
      Description: description || '',
      IsModified: true
    };

    populateTable(currentData);
    clearForm();
    toast('Record updated in grid. Click Save to commit.', 'info');
  }

  function handleClearAction() {
    log('Clear action triggered');
    clearForm();
  }

  async function handleViewAction() {
    console.log('🔵 View button clicked');
    log('View action triggered');
    // Enable the view button in case it was disabled
    id('viewBtn')?.removeAttribute('disabled');
    try {
      await loadSubAccountTypes();
      // loadSubAccountTypes will call populateTable with the data
      console.log('✅ loadSubAccountTypes completed');
    } catch (error) {
      console.error('❌ Error in handleViewAction:', error);
      toast('Error loading data', 'error');
    }
  }

  function handleAddAction() {
    log('Add action triggered');
    // Add button clears the form for the next record
    clearForm();
    toast('Form cleared. Enter new record details.', 'info');
  }

  async function handleEditAction() {
    log('Edit action triggered');
    
    // Enable New, Alter, Remove buttons; disable Update and Clear
    id('newBtn')?.removeAttribute('disabled');
    id('alterBtn')?.removeAttribute('disabled');
    id('removeBtn')?.removeAttribute('disabled');
    id('updateBtn')?.setAttribute('disabled', 'disabled');
    id('clearBtn')?.setAttribute('disabled', 'disabled');
    
    toast('Edit mode. Click New to add records, Alter to modify, or Remove.', 'info');
  }

  async function handleDeleteAction() {
    log('Delete action triggered');
    
    const accountTypeId = id('accountTypeSelect')?.value;
    
    if (!accountTypeId || accountTypeId === '--Select--') {
      toast('Please select an Account Type first', 'warning');
      return;
    }

    if (!currentData || currentData.length === 0) {
      toast('No records to delete for this Account Type', 'warning');
      return;
    }

    const accountTypeName = id('accountTypeSelect')?.selectedOptions[0]?.text || accountTypeId;
    
    if (!confirm(`Are you sure you want to permanently delete ALL ${currentData.length} record(s) for Account Type "${accountTypeName}"?\n\nThis action cannot be undone!`)) {
      return;
    }

    try {
      const sessionData = getSessionData();

      const requestData = {
        BankID: sessionData.BankID,
        GLAccountTypeID: accountTypeId,
        GLTypeGroupID: '', // Empty means delete all for this account type
        NewRecord: 0
      };

      log('Deleting all records for account type...', requestData);

      const result = await GeneralLedgerService.deleteGLTypeGroup(requestData);

      if (result.success) {
        toast(`All records for Account Type "${accountTypeName}" deleted successfully`, 'success');
        
        // Clear grid and reload
        currentData = [];
        deletedRecords = [];
        populateTable([]);
        clearForm();
        
        // Reload to confirm deletion
        await loadSubAccountTypes();
      } else {
        toast(result.message || 'Failed to delete records', 'error');
      }
    } catch (error) {
      console.error('Error deleting records:', error);
      toast('Error deleting records', 'error');
    }
  }

  async function handleSaveAction() {
    log('Save action triggered');
    
    try {
      const sessionData = getSessionData();
      const accountTypeId = id('accountTypeSelect')?.value;

      if (!accountTypeId || accountTypeId === '--Select--') {
        toast('Please select an Account Type', 'warning');
        return;
      }

      // Allow save if there are records to save OR records to delete
      if ((!currentData || currentData.length === 0) && (!deletedRecords || deletedRecords.length === 0)) {
        toast('No records to save or delete.', 'warning');
        return;
      }

      console.log('📋 Current data to save:', currentData);
      console.log('📋 Number of records:', currentData.length);
      console.log('📋 Deleted records:', deletedRecords);
      
      const now = new Date();
      const isoDateStr = now.toISOString().slice(0, 19); // Keep the T format: 2026-02-03T09:00:30
      
      let detailXml = '';
      
      // Add deleted records first (ButtonMark='R')
      deletedRecords.forEach((record, index) => {
        console.log(`📋 Deleted Record ${index}:`, {
          GLTypeGroupID: record.GLTypeGroupID,
          ButtonMark: 'R'
        });
        
        detailXml += `<dt_GeneralLedgerSubAccountType>`;
        detailXml += `<ButtonMark>R</ButtonMark>`;
        detailXml += `<GLTypeGroupID>${escapeXml(record.GLTypeGroupID)}</GLTypeGroupID>`;
        detailXml += `</dt_GeneralLedgerSubAccountType>`;
      });
      
      // Add current records (new or modified)
      currentData.forEach((record, index) => {
        const glTypeGroupId = record.GLTypeGroupID || record.GLSubAccountTypeID || '';
        const description = record.Description || '';
        
        // Determine ButtonMark: 'N' for new records, 'A' for modified existing records
        const buttonMark = record.IsNew ? 'N' : (record.IsModified ? 'A' : 'A');
        
        console.log(`📋 Record ${index}:`, {
          GLTypeGroupID: glTypeGroupId,
          Description: description,
          ButtonMark: buttonMark,
          IsNew: record.IsNew,
          IsModified: record.IsModified
        });
        
        detailXml += `<dt_GeneralLedgerSubAccountType>`;
        detailXml += `<ButtonMark>${buttonMark}</ButtonMark>`;
        detailXml += `<GLTypeGroupID>${escapeXml(glTypeGroupId)}</GLTypeGroupID>`;
        detailXml += `<Description>${escapeXml(description)}</Description>`;
        detailXml += `</dt_GeneralLedgerSubAccountType>`;
      });
      
      console.log('📋 Generated XML:', detailXml);

      const requestData = {
        BankID: sessionData.BankID,
        GLAccountTypeID: accountTypeId,
        OperatedBy: sessionData.OperatorID,
        OperatedOn: isoDateStr, // Now uses format: 2026-02-03T09:00:30
        SupervisedBy: sessionData.OperatorID,
        UpdateCount: moduleUpdateCount,
        DetailRecords: detailXml
      };

      log('Saving GL Type Group records...', requestData);

      const result = await GeneralLedgerService.addEditGLTypeGroup(requestData);
      
      console.log('📥 Save Response:', result);
      console.log('📥 Save Response Data:', result.data);

      if (result.success) {
        // Update moduleUpdateCount from response for next save
        if (result.data?.UpdateCount !== undefined) {
          moduleUpdateCount = result.data.UpdateCount;
          console.log('✅ Updated moduleUpdateCount from response:', moduleUpdateCount);
        }
        
        toast('Records saved successfully. Click View to reload.', 'success');
        
        // Clear deleted records array after successful save
        deletedRecords = [];
        
        // Clear grid and form after successful save
        currentData = [];
        populateTable([]);
        clearForm();
        
        // Reset button states - only View should be active
        id('viewBtn')?.removeAttribute('disabled');
        id('addBtn')?.setAttribute('disabled', 'disabled');
        id('editBtn')?.setAttribute('disabled', 'disabled');
        id('newBtn')?.setAttribute('disabled', 'disabled');
        id('alterBtn')?.setAttribute('disabled', 'disabled');
        id('removeBtn')?.setAttribute('disabled', 'disabled');
        id('updateBtn')?.setAttribute('disabled', 'disabled');
        id('clearBtn')?.setAttribute('disabled', 'disabled');
        id('saveBtn')?.setAttribute('disabled', 'disabled');
        id('cancelBtn')?.setAttribute('disabled', 'disabled');
        
        console.log('✅ Save completed. Click View to reload data.');
      } else {
        toast(result.message || 'Failed to save records', 'error');
        console.error('❌ Save failed:', result.message);
      }
    } catch (error) {
      console.error('Error saving records:', error);
      toast('Error saving records', 'error');
    }
  }

  // Helper function to escape XML special characters
  function escapeXml(unsafe) {
    if (!unsafe) return '';
    return String(unsafe)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  function handleCancelAction() {
    log('Cancel action triggered');
    clearForm();
    currentData = [];
    populateTable([]);
  }

  function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Sub Type Modal Handlers
  function handleSubTypeNew() {
    log('Sub Type New clicked');
    
    // Clear the selected record first
    subTypeSelectedRecord = null;
    
    // Set mode to add
    subTypeCurrentMode = 'add';
    
    // Clear form fields
    id('subAccountTypeIdField').value = '';
    id('subTypeDescriptionField').value = '';
    
    // Clear Behind The Scene fields
    id('subTypeCreatedByField').value = '';
    id('subTypeModifiedByField').value = '';
    id('subTypeSupervisedByField').value = '';
    id('subTypeCreatedOnField').value = '';
    id('subTypeModifiedOnField').value = '';
    id('subTypeSupervisedOnField').value = '';
    
    // Enable form fields for editing
    id('subAccountTypeIdField').removeAttribute('readonly');
    id('subTypeDescriptionField').removeAttribute('readonly');
    
    console.log('✅ New mode activated, mode set to add, selected record cleared');
    
    // Update button states
    updateSubTypeButtonStates('editing');
    
    toast('Enter new sub account type details and click Update', 'info');
  }

  function handleSubTypeAlter() {
    log('Sub Type Alter clicked');
    
    // Focus on the description field to indicate editing
    const descField = id('subTypeDescriptionField');
    if (descField) {
      descField.focus();
      // Position cursor at the end of the text
      descField.setSelectionRange(descField.value.length, descField.value.length);
    }
  }

  function handleSubTypeRemove() {
    log('Sub Type Remove clicked');
    
    if (!subTypeSelectedRecord) {
      alert('Please select a record from the table first');
      return;
    }
    
    // Show confirmation dialog
    const confirmed = confirm(`Do you want to Abort/ Discard the changes?\n[Nv:r1100]`);
    
    if (!confirmed) {
      return;
    }
    
    // Mark record for deletion
    const index = subTypeCurrentData.findIndex(r => 
      (r.GLSubAccountTypeID || r.SubAccountTypeID) === (subTypeSelectedRecord.GLSubAccountTypeID || subTypeSelectedRecord.SubAccountTypeID)
    );
    
    if (index !== -1) {
      const record = subTypeCurrentData[index];
      
      // If it's a new record (not saved yet), just remove it
      if (record.IsNew) {
        subTypeCurrentData.splice(index, 1);
        toast('New record removed from list', 'success');
      } else {
        // Mark as deleted for server update
        record.IsDeleted = true;
        record.ButtonMark = 'R'; // Mark as Removed
        subTypeDeletedRecords.push(record);
        subTypeCurrentData.splice(index, 1);
        toast('Record marked for removal. Click Save to commit changes.', 'success');
      }
      
      populateSubTypeTable(subTypeCurrentData);
      clearSubTypeForm();
      subTypeSelectedRecord = null;
      
      // Reset button states
      updateSubTypeButtonStates('initial');
    }
  }

  function handleSubTypeUpdate() {
    log('Sub Type Update clicked');
  }

  function handleSubTypeClear() {
    log('Sub Type Clear clicked');
    id('subTypeGroupSelect').value = '--Select--';
    id('subAccountTypeIdField').value = '';
    id('subTypeDescriptionField').value = '';
  }

  function handleSubTypeView() {
    log('Sub Type View clicked');
    loadGLSubAccountTypes();
  }

  /**
   * Load GL Sub Account Types
   */
  async function loadGLSubAccountTypes() {
    try {
      console.log('🔵 Loading GL Sub Account Types...');
      
      // Get session data
      const sessionData = {
        BankID: localStorage.getItem('BankID') || '00',
        BranchID: localStorage.getItem('BranchID') || '0101',
        OperatorID: localStorage.getItem('OperatorID') || 'SYS'
      };

      // Get selected values from modal
      const accountType = id('accountTypeSelect')?.value;
      const glTypeGroupId = id('subTypeGroupSelect')?.value;

      console.log('🔍 Session Data:', sessionData);
      console.log('🔍 Account Type:', accountType);
      console.log('🔍 GL Type Group ID:', glTypeGroupId);

      if (!accountType || accountType === '' || accountType === '--Select--') {
        console.warn('⚠️ No Account Type selected');
        return;
      }

      if (!glTypeGroupId || glTypeGroupId === '' || glTypeGroupId === '--Select--') {
        console.warn('⚠️ No GL Type Group selected');
        return;
      }

      log('Loading GL Sub Account Types...', { accountType, glTypeGroupId });

      const requestData = {
        BankID: sessionData.BankID,
        OurBranchID: sessionData.BranchID,
        GLAccountTypeID: accountType,
        GLTypeGroupID: glTypeGroupId,
        OperatorID: sessionData.OperatorID
      };

      console.log('📤 Request Data:', requestData);

      if (!GeneralLedgerService || !GeneralLedgerService.getGLSubAccountType) {
        console.error('❌ GeneralLedgerService.getGLSubAccountType not available');
        alert('Service not available. Please refresh the page.');
        return;
      }

      const result = await GeneralLedgerService.getGLSubAccountType(requestData);

      console.log('📥 Full API Response:', result);
      console.log('📥 Response success:', result.success);
      console.log('📥 Response data:', result.data);
      console.log('📥 Response Details:', result.data?.Details);
      console.log('📥 Response Details01:', result.data?.Details01);

      if (result.success) {
        // Handle the response - prioritize Details01 over Details
        let dataArray = [];
        
        // Check Details01 first as it typically contains the actual records
        if (result.data?.Details01 && Array.isArray(result.data.Details01)) {
          dataArray = result.data.Details01;
          console.log('✅ Using Details01 array');
        } else if (result.data?.Details && Array.isArray(result.data.Details)) {
          dataArray = result.data.Details;
          console.log('✅ Using Details array');
        } else if (Array.isArray(result.data)) {
          dataArray = result.data;
          console.log('✅ Using data array directly');
        }

        console.log('✅ Extracted data array:', dataArray);
        console.log('✅ Data length:', dataArray.length);

        if (dataArray.length > 0) {
          console.log('✅ First record:', dataArray[0]);
          console.log('✅ All records:', dataArray);
          subTypeCurrentData = dataArray;
          populateSubTypeTable(dataArray);
          toast(`Loaded ${dataArray.length} record(s)`, 'success');
        } else {
          console.warn('⚠️ No records found in response');
          subTypeCurrentData = [];
          populateSubTypeTable([]);
          toast('No records found', 'info');
        }
      } else {
        console.error('❌ API request failed:', result.message);
        console.error('❌ Full error response:', result);
        alert(`Failed to load data: ${result.message || 'Unknown error'}`);
        subTypeCurrentData = [];
        populateSubTypeTable([]);
      }
    } catch (error) {
      console.error('❌ Error loading GL Sub Account Types:', error);
      console.error('❌ Error stack:', error.stack);
      alert(`An error occurred: ${error.message}`);
      subTypeCurrentData = [];
      populateSubTypeTable([]);
    }
  }

  /**
   * Populate Sub Type Table
   */
  function populateSubTypeTable(data) {
    console.log('📊 populateSubTypeTable called with:', data);
    
    const tbody = id('subTypeTableBody');
    if (!tbody) {
      console.error('❌ subTypeTableBody not found');
      return;
    }

    console.log('📊 tbody element:', tbody);

    // Clear existing rows
    tbody.innerHTML = '';

    if (!data || data.length === 0) {
      console.log('⚠️ No data to display');
      tbody.innerHTML = `
        <tr style="text-align: center; color: #c85c2d; font-size: 0.8rem;">
          <td colspan="2" style="padding: 20px;">No records to display.</td>
        </tr>
      `;
      return;
    }

    console.log('✅ Populating table with', data.length, 'records');

    data.forEach((record, index) => {
      console.log(`Row ${index}:`, record);
      const row = document.createElement('tr');
      row.style.cursor = 'pointer';
      
      // Use GLSubAccountTypeID or SubAccountTypeID
      const subAccountTypeId = record.GLSubAccountTypeID || record.SubAccountTypeID || '';
      const description = record.Description || '';

      row.innerHTML = `
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(subAccountTypeId)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${escapeHtml(description)}</td>
      `;

      // Click handler for row selection
      row.addEventListener('click', () => {
        // Remove previous selection
        tbody.querySelectorAll('tr').forEach(tr => {
          tr.style.backgroundColor = '';
        });
        
        // Highlight selected row
        row.style.backgroundColor = '#e0f2fe';
        
        subTypeSelectedRecord = record;
        populateSubTypeForm(record);
        log('Selected sub type record:', record);
        
        // Update button states when record is selected
        updateSubTypeButtonStates('selected');
      });

      tbody.appendChild(row);
    });

    log(`Table populated with ${data.length} records`);
  }

  /**
   * Populate Sub Type Form
   */
  function populateSubTypeForm(record) {
    if (!record) return;

    id('subAccountTypeIdField').value = record.GLSubAccountTypeID || record.SubAccountTypeID || '';
    id('subTypeDescriptionField').value = record.Description || '';

    // Behind The Scene fields
    id('subTypeCreatedByField').value = record.CreatedBy || '';
    id('subTypeModifiedByField').value = record.ModifiedBy || '';
    id('subTypeSupervisedByField').value = record.SupervisedBy || '';
    id('subTypeCreatedOnField').value = record.CreatedOn ? new Date(record.CreatedOn).toLocaleString() : '';
    id('subTypeModifiedOnField').value = record.ModifiedOn ? new Date(record.ModifiedOn).toLocaleString() : '';
    id('subTypeSupervisedOnField').value = record.SupervisedOn ? new Date(record.SupervisedOn).toLocaleString() : '';

    log('Sub Type form populated with record:', record);
  }
  
  function clearSubTypeForm() {
    id('subAccountTypeIdField').value = '';
    id('subTypeDescriptionField').value = '';
    id('subTypeCreatedByField').value = '';
    id('subTypeModifiedByField').value = '';
    id('subTypeSupervisedByField').value = '';
    id('subTypeCreatedOnField').value = '';
    id('subTypeModifiedOnField').value = '';
    id('subTypeSupervisedOnField').value = '';
  }
  
  function updateSubTypeButtonStates(state) {
    const newBtn = id('subTypeNewBtn');
    const alterBtn = id('subTypeAlterBtn');
    const removeBtn = id('subTypeRemoveBtn');
    const updateBtn = id('subTypeUpdateBtn');
    const clearBtn = id('subTypeClearBtn');
    
    const viewBtn = id('subTypeViewBtn');
    const addBtn = id('subTypeAddBtn');
    const editBtn = id('subTypeEditBtn');
    const deleteBtn = id('subTypeDeleteBtn');
    const saveBtn = id('subTypeSaveBtn');
    const cancelBtn = id('subTypeCancelBtn');
    const backBtn = id('subTypeBackBtn');
    
    if (state === 'initial') {
      // Initial state - only View, Add, Save, Cancel, Back active
      newBtn?.setAttribute('disabled', 'disabled');
      alterBtn?.setAttribute('disabled', 'disabled');
      removeBtn?.setAttribute('disabled', 'disabled');
      updateBtn?.setAttribute('disabled', 'disabled');
      clearBtn?.setAttribute('disabled', 'disabled');
      
      viewBtn?.removeAttribute('disabled');
      addBtn?.removeAttribute('disabled');
      editBtn?.setAttribute('disabled', 'disabled');
      deleteBtn?.setAttribute('disabled', 'disabled');
      saveBtn?.removeAttribute('disabled');
      cancelBtn?.removeAttribute('disabled');
      backBtn?.removeAttribute('disabled');
    } else if (state === 'dataLoaded') {
      // Data loaded from dropdown - View, Add, Edit, Delete, Cancel, Back active
      newBtn?.setAttribute('disabled', 'disabled');
      alterBtn?.setAttribute('disabled', 'disabled');
      removeBtn?.setAttribute('disabled', 'disabled');
      updateBtn?.setAttribute('disabled', 'disabled');
      clearBtn?.setAttribute('disabled', 'disabled');
      
      viewBtn?.removeAttribute('disabled');
      addBtn?.removeAttribute('disabled');
      editBtn?.removeAttribute('disabled');
      deleteBtn?.removeAttribute('disabled');
      saveBtn?.removeAttribute('disabled');
      cancelBtn?.removeAttribute('disabled');
      backBtn?.removeAttribute('disabled');
    } else if (state === 'selected') {
      // Record selected - Edit, Delete, Cancel, Back active
      newBtn?.setAttribute('disabled', 'disabled');
      alterBtn?.setAttribute('disabled', 'disabled');
      removeBtn?.setAttribute('disabled', 'disabled');
      updateBtn?.setAttribute('disabled', 'disabled');
      clearBtn?.setAttribute('disabled', 'disabled');
      
      viewBtn?.removeAttribute('disabled');
      addBtn?.removeAttribute('disabled');
      editBtn?.removeAttribute('disabled');
      deleteBtn?.removeAttribute('disabled');
      saveBtn?.removeAttribute('disabled');
      cancelBtn?.removeAttribute('disabled');
      backBtn?.removeAttribute('disabled');
    } else if (state === 'editing') {
      // Edit mode - New, Alter, Remove active
      newBtn?.removeAttribute('disabled');
      alterBtn?.removeAttribute('disabled');
      removeBtn?.removeAttribute('disabled');
      updateBtn?.removeAttribute('disabled');
      clearBtn?.removeAttribute('disabled');
      
      viewBtn?.setAttribute('disabled', 'disabled');
      addBtn?.setAttribute('disabled', 'disabled');
      editBtn?.setAttribute('disabled', 'disabled');
      deleteBtn?.setAttribute('disabled', 'disabled');
      saveBtn?.removeAttribute('disabled');
      cancelBtn?.removeAttribute('disabled');
      backBtn?.removeAttribute('disabled');
    } else if (state === 'adding') {
      // Add mode - similar to editing
      newBtn?.setAttribute('disabled', 'disabled');
      alterBtn?.setAttribute('disabled', 'disabled');
      removeBtn?.setAttribute('disabled', 'disabled');
      updateBtn?.removeAttribute('disabled');
      clearBtn?.removeAttribute('disabled');
      
      viewBtn?.setAttribute('disabled', 'disabled');
      addBtn?.setAttribute('disabled', 'disabled');
      editBtn?.setAttribute('disabled', 'disabled');
      deleteBtn?.setAttribute('disabled', 'disabled');
      saveBtn?.removeAttribute('disabled');
      cancelBtn?.removeAttribute('disabled');
      backBtn?.removeAttribute('disabled');
    }
  }

  function handleSubTypeAdd() {
    log('Sub Type Add clicked');
    
    // Clear the selected record first
    subTypeSelectedRecord = null;
    
    // Set mode to add
    subTypeCurrentMode = 'add';
    
    // Clear form fields
    clearSubTypeForm();
    
    // Enable form fields for editing
    id('subAccountTypeIdField').removeAttribute('readonly');
    id('subTypeDescriptionField').removeAttribute('readonly');
    
    // Update button states
    updateSubTypeButtonStates('adding');
    
    console.log('✅ Add mode activated, selected record cleared');
    toast('Enter new sub account type details and click Update', 'info');
  }

  function handleSubTypeEdit() {
    log('Sub Type Edit clicked');
    
    if (!subTypeSelectedRecord) {
      alert('Please select a record from the table first');
      return;
    }
    
    // Set mode to edit
    subTypeCurrentMode = 'edit';
    
    // Enable form fields for editing
    id('subAccountTypeIdField').removeAttribute('readonly');
    id('subTypeDescriptionField').removeAttribute('readonly');
    
    // Update button states to editing mode
    updateSubTypeButtonStates('editing');
    
    toast('Modify the details and click Update', 'info');
  }

  function handleSubTypeUpdate() {
    log('Sub Type Update clicked');
    
    const subAccountTypeId = id('subAccountTypeIdField')?.value?.trim();
    const description = id('subTypeDescriptionField')?.value?.trim();
    
    console.log(`🔄 Update mode: ${subTypeCurrentMode}, Selected record:`, subTypeSelectedRecord);
    console.log(`🔄 Form values - ID: ${subAccountTypeId}, Description: ${description}`);
    
    if (!subAccountTypeId || !description) {
      alert('Please enter both Sub Account Type ID and Description');
      return;
    }
    
    if (subTypeCurrentMode === 'add') {
      console.log('➕ Processing as NEW record');
      
      // Check if ID already exists
      const exists = subTypeCurrentData.some(r => 
        (r.GLSubAccountTypeID || r.SubAccountTypeID) === subAccountTypeId
      );
      
      if (exists) {
        alert(`Sub Account Type ID "${subAccountTypeId}" already exists. Please use a different ID.`);
        return;
      }
      
      // Add new record to the data array
      const newRecord = {
        GLSubAccountTypeID: subAccountTypeId,
        SubAccountTypeID: subAccountTypeId,
        Description: description,
        IsNew: true,
        IsModified: false
      };
      
      console.log('✅ Adding new record:', newRecord);
      subTypeCurrentData.push(newRecord);
      populateSubTypeTable(subTypeCurrentData);
      
      toast('Record added. Click Save to commit changes.', 'success');
    } else if (subTypeCurrentMode === 'edit' && subTypeSelectedRecord) {
      console.log('✏️ Processing as EDIT record');
      
      // Update existing record
      const index = subTypeCurrentData.findIndex(r => 
        (r.GLSubAccountTypeID || r.SubAccountTypeID) === (subTypeSelectedRecord.GLSubAccountTypeID || subTypeSelectedRecord.SubAccountTypeID)
      );
      
      if (index !== -1) {
        console.log(`✅ Updating record at index ${index}`);
        // Update both ID and description
        subTypeCurrentData[index].GLSubAccountTypeID = subAccountTypeId;
        subTypeCurrentData[index].SubAccountTypeID = subAccountTypeId;
        subTypeCurrentData[index].Description = description;
        subTypeCurrentData[index].IsModified = true;
        subTypeCurrentData[index].IsNew = false; // Ensure it's not marked as new
        populateSubTypeTable(subTypeCurrentData);
        
        toast('Record updated. Click Save to commit changes.', 'success');
      }
    } else {
      console.warn('⚠️ No valid mode or selected record');
      alert('Please click Add (for new) or Edit (for existing) first');
      return;
    }
    
    // Reset mode and make fields readonly again
    subTypeCurrentMode = 'view';
    id('subAccountTypeIdField').setAttribute('readonly', 'readonly');
    id('subTypeDescriptionField').setAttribute('readonly', 'readonly');
    
    // Reset button states
    updateSubTypeButtonStates('initial');
  }

  async function handleSubTypeDelete() {
    log('Sub Type Delete clicked');
    
    // Check if there's data in the grid
    if (!subTypeCurrentData || subTypeCurrentData.length === 0) {
      alert('No records to delete');
      return;
    }
    
    const accountType = id('accountTypeSelect')?.value;
    const glTypeGroupId = id('subTypeGroupSelect')?.value;
    
    // Show confirmation dialog to delete the entire GL Type Group
    if (!confirm(`Do you want to Abort/ Discard the changes?\n[No:r1100]`)) {
      return;
    }
    
    try {
      // Get session data
      const sessionData = {
        BankID: localStorage.getItem('BankID') || '00',
        BranchID: localStorage.getItem('BranchID') || '0101',
        OperatorID: localStorage.getItem('OperatorID') || 'SYS'
      };

      // Prepare request data - deletes the entire group
      const requestData = {
        BankID: sessionData.BankID,
        GLAccountTypeID: accountType,
        GLTypeGroupID: glTypeGroupId
      };

      console.log('🗑️ Deleting GL Type Group:', requestData);

      // Call the delete API
      const response = await GeneralLedgerService.deleteGLSubAccountType(requestData);
      
      console.log('📥 Delete Response:', response);

      if (response && response.success) {
        toast('GL Type Group deleted successfully', 'success');
        
        // Clear form and selection
        clearSubTypeForm();
        subTypeSelectedRecord = null;
        
        // Clear the grid
        subTypeCurrentData = [];
        populateSubTypeTable([]);
        
        // Reset button states
        updateSubTypeButtonStates('initial');
      } else {
        const errorMsg = response?.message || 'Failed to delete GL Type Group';
        toast(errorMsg, 'error');
        alert(errorMsg);
      }
    } catch (error) {
      console.error('❌ Delete error:', error);
      const errorMsg = error.message || 'An error occurred while deleting the GL Type Group';
      toast(errorMsg, 'error');
      alert(errorMsg);
    }
  }

  async function handleSubTypeSave() {
    log('Sub Type Save clicked');
    
    try {
      // Get session data
      const sessionData = {
        BankID: localStorage.getItem('BankID') || '00',
        BranchID: localStorage.getItem('BranchID') || '0101',
        OperatorID: localStorage.getItem('OperatorID') || 'SYS'
      };

      const accountType = id('accountTypeSelect')?.value;
      const glTypeGroupId = id('subTypeGroupSelect')?.value;

      if (!accountType || accountType === '' || accountType === '--Select--') {
        alert('Please select an Account Type first');
        return;
      }

      if (!glTypeGroupId || glTypeGroupId === '' || glTypeGroupId === '--Select--') {
        alert('Please select a GL Sub Type Group first');
        return;
      }

      // Generate ISO datetime string
      const now = new Date();
      const isoDateStr = now.toISOString().slice(0, 19).replace('T', ' ');

      // Build XML for DetailRecords
      let detailXml = '';

      console.log('📋 Current data before building XML:', subTypeCurrentData);
      console.log('📋 Deleted records:', subTypeDeletedRecords);

      // Add modified and new records
      subTypeCurrentData.forEach(record => {
        const subAccountTypeId = escapeXml(record.GLSubAccountTypeID || record.SubAccountTypeID || '');
        const description = escapeXml(record.Description || '');
        const buttonMark = record.IsNew ? 'N' : (record.IsModified ? 'A' : '');
        
        console.log(`📋 Record ${subAccountTypeId}: IsNew=${record.IsNew}, IsModified=${record.IsModified}, ButtonMark=${buttonMark}`);
        
        if (buttonMark) {
          detailXml += `<dt_GeneralLedgerSubAccountType>`;
          detailXml += `<GLSubAccountTypeID>${subAccountTypeId}</GLSubAccountTypeID>`;
          detailXml += `<Description>${description}</Description>`;
          detailXml += `<ButtonMark>${buttonMark}</ButtonMark>`;
          detailXml += `</dt_GeneralLedgerSubAccountType>`;
        }
      });

      // Add deleted records
      subTypeDeletedRecords.forEach(record => {
        const subAccountTypeId = escapeXml(record.GLSubAccountTypeID || record.SubAccountTypeID || '');
        console.log(`📋 Deleted Record ${subAccountTypeId}: ButtonMark=R`);
        detailXml += `<dt_GeneralLedgerSubAccountType>`;
        detailXml += `<GLSubAccountTypeID>${subAccountTypeId}</GLSubAccountTypeID>`;
        detailXml += `<Description></Description>`;
        detailXml += `<ButtonMark>R</ButtonMark>`;
        detailXml += `</dt_GeneralLedgerSubAccountType>`;
      });

      console.log('📋 Generated XML:', detailXml);

      if (!detailXml) {
        alert('No changes to save');
        return;
      }

      const requestData = {
        BankID: sessionData.BankID,
        GLAccountTypeID: accountType,
        GLTypeGroupID: glTypeGroupId,
        OperatedBy: sessionData.OperatorID,
        OperatedOn: isoDateStr,
        SupervisedBy: sessionData.OperatorID,
        UpdateCount: subTypeUpdateCount,
        DetailRecords: detailXml
      };

      log('Saving GL Sub Account Type records...', requestData);

      const result = await GeneralLedgerService.addEditGLSubAccountType(requestData);

      console.log('📥 Save Response:', result);
      console.log('📥 Save Response Data:', result.data);

      if (result.success) {
        // Update UpdateCount from response
        if (result.data?.UpdateCount !== undefined) {
          subTypeUpdateCount = result.data.UpdateCount;
          console.log('✅ Updated subTypeUpdateCount from response:', subTypeUpdateCount);
        }

        toast('Records saved successfully. Reloading data...', 'success');

        // Clear deleted records array
        subTypeDeletedRecords = [];

        // Clear IsNew and IsModified flags from current data
        subTypeCurrentData.forEach(record => {
          delete record.IsNew;
          delete record.IsModified;
        });

        // Reload data from server
        await loadGLSubAccountTypes();

        clearSubTypeForm();
      } else {
        console.error('❌ Save failed:', result.message);
        alert(`Failed to save: ${result.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error saving GL Sub Account Types:', error);
      alert(`An error occurred while saving: ${error.message}`);
    }
  }

  function clearSubTypeForm() {
    id('subAccountTypeIdField').value = '';
    id('subTypeDescriptionField').value = '';
    id('subTypeCreatedByField').value = '';
    id('subTypeModifiedByField').value = '';
    id('subTypeSupervisedByField').value = '';
    id('subTypeCreatedOnField').value = '';
    id('subTypeModifiedOnField').value = '';
    id('subTypeSupervisedOnField').value = '';
    
    // Make fields readonly
    id('subAccountTypeIdField').setAttribute('readonly', 'readonly');
    id('subTypeDescriptionField').setAttribute('readonly', 'readonly');
  }

  function handleSubTypeCancel() {
    log('Sub Type Cancel clicked');
    
    // Clear all form fields
    clearSubTypeForm();
    
    // Clear selection
    subTypeSelectedRecord = null;
    
    // Remove row highlights
    const tbody = id('subTypeTableBody');
    if (tbody) {
      tbody.querySelectorAll('tr').forEach(tr => {
        tr.style.backgroundColor = '';
      });
    }
    
    // Reset mode
    subTypeCurrentMode = 'view';
    
    // Make fields readonly
    id('subAccountTypeIdField')?.setAttribute('readonly', 'readonly');
    id('subTypeDescriptionField')?.setAttribute('readonly', 'readonly');
    
    // Reset button states
    updateSubTypeButtonStates('dataLoaded');
    
    toast('Changes cancelled', 'info');
  }

  function handleSubTypeBack() {
    log('Sub Type Back clicked');
    const modal = document.getElementById('glAccountSubTypeModal');
    if (modal && typeof bootstrap !== 'undefined') {
      const bootstrapModal = bootstrap.Modal.getInstance(modal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      }
    }
  }

  // Initialize on DOM ready
  document.addEventListener('DOMContentLoaded', function() {
    console.log('🚀 DOM Content Loaded - Initializing GL Sub Type Group...');
    initializeGLSubTypeGroup();
    attachEventListeners();
  });

  console.log('🚀 GL Sub Type Group IIFE completed, DOM listener added');

})();
