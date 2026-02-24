/**
 * InterBranch GL Parameters Page Logic
 * Handles UI interactions and data flow for InterBranch GL Parameters module
 */
(function(){
  'use strict';

  // State management
  let currentMode = 'view';
  let currentData = [];
  let response = { Details: [] };
  let selectedRecord = null;
  let editRecordIndex = null;
  let GeneralLedgerService = null;

  // Session data
  const sessionData = {
    BankID: localStorage.getItem('BankID') || '00',
    OurBranchID: localStorage.getItem('BranchID') || '1201',
    OperatorID: localStorage.getItem('OperatorID') || 'SYS'
  };

  const qs = (sel) => document.querySelector(sel);
  const qsa = (sel) => Array.from(document.querySelectorAll(sel));
  const id = (x) => document.getElementById(x);
  const log = (m) => console.log('[InterBranch GL Params]', m);

  function toast(msg, type = 'info') {
    if(window.parent && window.parent.bootstrap){
      try {
        const toastEl = window.parent.document.getElementById('globalToast');
        if (toastEl) {
          toastEl.querySelector('.toast-body').textContent = msg;
          const t = new window.parent.bootstrap.Toast(toastEl);
          t.show();
          return;
        }
      } catch(e){}
    }
    console.log(`[IBGLP ${type.toUpperCase()}]`, msg);
  }

  /**
   * Initialize services
   */
  async function initServices() {
    try {
      log('Loading services...');
      
      if (!window.ServiceLoader) {
        console.error('ServiceLoader not found');
        toast('Failed to load ServiceLoader', 'error');
        return false;
      }

      await window.ServiceLoader.loadCore();
      await window.ServiceLoader.loadGeneralLedgerService();
      
      GeneralLedgerService = window.GeneralLedgerService;
      
      if (!GeneralLedgerService) {
        console.error('GeneralLedgerService not found');
        toast('Failed to load GeneralLedgerService', 'error');
        return false;
      }
      
      log('Services loaded successfully');
      return true;
    } catch (error) {
      console.error('Error loading services:', error);
      toast('Error loading services: ' + error.message, 'error');
      return false;
    }
  }

  /**
   * Load InterBranch GL Parameters from API
   */
  async function loadInterBranchGLParameters() {
    try {
      log('Fetching InterBranch GL Parameters...');
      
      const result = await GeneralLedgerService.getGLInterBranch({
        OurBranchID: sessionData.OurBranchID,
        OperatorID: sessionData.OperatorID,
        Direction: 0
      });

      console.log('API Response:', result);

      if (result.success && result.data) {
        let parametersData = null;
        
        // Prioritize Details02 which contains the main InterBranch GL parameters
        if (result.data.Details02 && Array.isArray(result.data.Details02)) {
          parametersData = result.data.Details02;
          log(`Found data in Details02: ${parametersData.length} records`);
        } else if (result.data.Details && Array.isArray(result.data.Details)) {
          parametersData = result.data.Details;
          log(`Found data in Details: ${parametersData.length} records`);
        } else if (result.data.Details01 && Array.isArray(result.data.Details01)) {
          parametersData = result.data.Details01;
        } else if (Array.isArray(result.data)) {
          parametersData = result.data;
        }

        if (parametersData && parametersData.length > 0) {
          currentData = parametersData;
          populateTable(parametersData);
          toast(`Loaded ${parametersData.length} parameter(s)`, 'success');
          log('InterBranch GL Parameters loaded successfully');
        } else {
          currentData = [];
          populateTable([]);
          toast('No parameters found', 'warning');
        }
      } else {
        toast(result.message || 'Failed to load parameters', 'error');
      }
    } catch (error) {
      console.error('Error loading parameters:', error);
      toast('Error loading parameters: ' + error.message, 'error');
    }
  }

  /**
   * Populate table with parameters data
   */
  function populateTable(data) {
    console.log('[DEBUG] populateTable called with', data);
    const tbody = qs('#ibgl-params-table tbody');
    if (!tbody) return;

    // Create array of non-deleted records with their original indices
    const visibleRecords = [];
    data.forEach((item, originalIndex) => {
      if (!item._isDeleted) {
        visibleRecords.push({ item, originalIndex });
      }
    });

    if (visibleRecords.length === 0) {
      tbody.innerHTML = '<tr><td colspan="8" class="text-muted py-4">No records to display.</td></tr>';
      return;
    }

    tbody.innerHTML = visibleRecords.map(({ item, originalIndex }) => {
      // Use the ORIGINAL index in currentData, not the filtered index
      return `
      <tr data-index="${originalIndex}" style="cursor: pointer;">
        <td>${item.OurBranchID || ''}</td>
        <td>${item.BranchName || ''}</td>
        <td>${item.AccountTagID || ''}</td>
        <td>${item.AccountTagName || ''}</td>
        <td>${item.AccountID || ''}</td>
        <td>${item.AccountName || ''}</td>
        <td>${item.CurrencyID || ''}</td>
        <td>${item.CurrencyName || ''}</td>
      </tr>`;
    }).join('');

    log(`Table populated with ${visibleRecords.length} records`);

    // Add click handlers to rows - use specific table selector
    const mainTable = qs('#ibgl-params-table');
    if (mainTable) {
      const rows = mainTable.querySelectorAll('tbody tr');
      console.log('[DEBUG] Attaching click handlers to', rows.length, 'rows');
      rows.forEach((row, i) => {
        const rowIndex = parseInt(row.dataset.index);
        console.log('[DEBUG] Row', i, 'data-index:', rowIndex);
        row.addEventListener('click', function() {
          console.log('[DEBUG] Row clicked, index:', rowIndex);
          selectRow(rowIndex);
        });
      });
    }
  }

  /**
   * Select a row and populate form
   */
  function selectRow(index) {
    console.log('[DEBUG] selectRow called with index:', index);
    // Use specific table selector to avoid selecting modal table rows
    const mainTable = qs('#ibgl-params-table');
    if (mainTable) {
      mainTable.querySelectorAll('tbody tr').forEach(r => r.classList.remove('table-active'));
      const selectedRow = mainTable.querySelector(`tbody tr[data-index="${index}"]`);
      if (selectedRow) {
        selectedRow.classList.add('table-active');
        console.log('[DEBUG] Row highlighted');
      }
    }

    selectedRecord = currentData[index];
    editRecordIndex = index;
    
    log('Selected record:' + JSON.stringify(selectedRecord));
    
    if (selectedRecord) {
      id('branchId') && (id('branchId').value = selectedRecord.OurBranchID || '');
      id('branchName') && (id('branchName').value = selectedRecord.BranchName || '');
      id('accountTag') && (id('accountTag').value = selectedRecord.AccountTagID || '');
      id('currencyId') && (id('currencyId').value = selectedRecord.CurrencyID || '');
      id('accountId') && (id('accountId').value = selectedRecord.AccountID || '');
      
      id('createdBy') && (id('createdBy').value = selectedRecord.CreatedBy || '');
      id('createdOn') && (id('createdOn').value = selectedRecord.CreatedOn || '');
      id('modifiedBy') && (id('modifiedBy').value = selectedRecord.ModifiedBy || '');
      id('modifiedOn') && (id('modifiedOn').value = selectedRecord.ModifiedOn || '');
      id('supervisedBy') && (id('supervisedBy').value = selectedRecord.SupervisedBy || '');
      id('supervisedOn') && (id('supervisedOn').value = selectedRecord.SupervisedOn || '');
      
      log('Form populated with selected record');
    }
  }

  /**
   * Handle View button
   */
  async function handleView() {
    console.log('[DEBUG] handleView called');
    
    // Fetch backend data only (no static records)
    await initServices();
    const result = await GeneralLedgerService.getGLInterBranch({
      OurBranchID: sessionData.OurBranchID,
      OperatorID: sessionData.OperatorID,
      Direction: 0
    });

    let backendData = [];
    if (result.success && result.data && result.data.Details02 && Array.isArray(result.data.Details02)) {
      backendData = result.data.Details02;
    }

    // Use only backend data + local changes
    const key = r => `${r.OurBranchID}|${r.AccountTagID}|${r.CurrencyID}|${r.AccountID}`;
    const mergedMap = new Map();
    
    // Add backend data
    backendData.forEach(r => mergedMap.set(key(r), r));
    
    // Add local records (new/modified)
    if (Array.isArray(response.Details)) {
      response.Details.forEach(r => {
        const k = key(r);
        if (!mergedMap.has(k)) {
          mergedMap.set(k, r); // add new
        } else {
          // If updating, replace only if local record has been modified
          const existing = mergedMap.get(k);
          if (r.UpdateCount && r.UpdateCount > 0) {
            mergedMap.set(k, r); // update
          }
        }
      });
    }
    
    const merged = Array.from(mergedMap.values());
    currentData = merged;
    populateTable(merged);
    toast(`Loaded ${merged.length} parameter(s)`, 'success');
  }

  /**
   * Handle Add button
   */
  function handleAdd() {
    currentMode = 'add';
    selectedRecord = null;
    editRecordIndex = null;
    clearForm();
    id('branchId') && (id('branchId').value = sessionData.OurBranchID);
    id('accountId') && (id('accountId').value = '');
    id('currencyId') && (id('currencyId').value = '');
    id('accountTag') && (id('accountTag').value = '');
    id('accountTag') && (id('accountTag').disabled = false);
    id('currencyId') && (id('currencyId').disabled = false);
    id('accountId') && (id('accountId').disabled = false);
    // Save button handler is globally attached; do not reassign here
    toast('Add mode enabled. Fill in the fields and click Update to add to grid.', 'info');
    // Save logic handled by global event listener and handleSave()
  }

  /**
   * Handle Edit button
   */
  function handleEdit() {
    if (!selectedRecord) {
      toast('Select a record to edit', 'warning');
      return;
    }
    currentMode = 'edit';
    id('newBtn') && (id('newBtn').disabled = false);
    id('removeBtn') && (id('removeBtn').disabled = false);
    id('alterBtn') && (id('alterBtn').disabled = false);
    id('updateBtn') && (id('updateBtn').disabled = false);
    setButtonState(true);
    toast('Edit mode enabled. Click Alter to modify fields, then Update, then Save.', 'info');
    // Save button handler is globally attached; do not reassign here
    // Save logic handled by global event listener and handleSave()
  }

  /**
   * Handle Save button
   */
  async function handleSave() {
    log('handleSave called, currentMode: ' + currentMode);

    // Handle deletion mode - use ButtonMark='R' in XML
    if (currentMode === 'delete' && selectedRecord && selectedRecord._isDeleted) {
      if (!GeneralLedgerService) {
        const loaded = await initServices();
        if (!loaded) {
          toast('Failed to initialize services', 'error');
          return;
        }
      }

      const OurBranchID = selectedRecord.OurBranchID;
      const AccountTagID = selectedRecord.AccountTagID;
      const CurrencyID = selectedRecord.CurrencyID;
      const AccountID = selectedRecord.AccountID;

      try {
        toast('Saving deletion, please wait...', 'info');
        
        // Build XML with ButtonMark='R' for deletion
        const detailXml = 
          `<dt_InterBranchGeneralLedger>` +
          `<ButtonMark>R</ButtonMark>` +
          `<AccountTagID>${AccountTagID}</AccountTagID>` +
          `<CurrencyID>${CurrencyID}</CurrencyID>` +
          `<AccountID>${AccountID}</AccountID>` +
          `</dt_InterBranchGeneralLedger>`;
        
        const requestData = {
          OurBranchID,
          OperatedBy: sessionData.OperatorID,
          OperatedOn: new Date().toISOString(),
          SupervisedBy: null,
          UpdateCount: selectedRecord.UpdateCount || 0,
          DetailRecords: detailXml
        };
        
        const result = await GeneralLedgerService.addEditGLInterBranch(requestData);
        
        log('Delete result: ' + JSON.stringify(result));
        
        if (result && result.success) {
          toast('Record deleted successfully', 'success');
          
          // Permanently remove the deleted record from currentData
          currentData = currentData.filter(r => 
            !(r.OurBranchID === OurBranchID && 
              r.AccountTagID === AccountTagID)
          );
          
          // Also remove from response.Details
          if (Array.isArray(response.Details)) {
            response.Details = response.Details.filter(r => 
              !(r.OurBranchID === OurBranchID && 
                r.AccountTagID === AccountTagID)
            );
          }
          
          log('Record permanently removed from data arrays');
          
          // Refresh grid with updated data
          populateTable(currentData);
          
          // Clear form and reset state
          clearForm(false);
          setButtonState(true);
          currentMode = 'view';
          selectedRecord = null;
          editRecordIndex = null;
        } else {
          toast((result && result.message) || 'Failed to delete from backend', 'error');
          // Remove the deletion flag to restore the record
          currentData.forEach(r => {
            if (r.OurBranchID === OurBranchID && r.AccountTagID === AccountTagID) {
              delete r._isDeleted;
            }
          });
          if (selectedRecord) {
            delete selectedRecord._isDeleted;
          }
          if (Array.isArray(response.Details)) {
            response.Details.forEach(r => {
              if (r.OurBranchID === OurBranchID && r.AccountTagID === AccountTagID) {
                delete r._isDeleted;
              }
            });
          }
          // Refresh grid to show the record again
          populateTable(currentData);
        }
      } catch (error) {
        console.error('Error deleting:', error);
        toast('Error deleting: ' + (error.message || error), 'error');
        // Remove the deletion flag to restore the record
        currentData.forEach(r => {
          if (r.OurBranchID === OurBranchID && r.AccountTagID === AccountTagID) {
            delete r._isDeleted;
          }
        });
        if (selectedRecord) {
          delete selectedRecord._isDeleted;
        }
        if (Array.isArray(response.Details)) {
          response.Details.forEach(r => {
            if (r.OurBranchID === OurBranchID && r.AccountTagID === AccountTagID) {
              delete r._isDeleted;
            }
          });
        }
        // Refresh grid to show the record again
        populateTable(currentData);
      }
      return;
    }

    // Collect form data for add/update operations
    const OurBranchID = id('branchId')?.value?.trim() || sessionData.OurBranchID;
    const AccountTagID = id('accountTag')?.value?.trim() || '';
    const CurrencyID = id('currencyId')?.value?.trim() || '';
    const AccountID = id('accountId')?.value?.trim() || '';

    // Validation (skip for delete mode)
    if (currentMode !== 'delete') {
      if (!OurBranchID) {
        toast('Branch ID is required', 'warning');
        return;
      }
      if (!AccountTagID) {
        toast('Account Tag is required', 'warning');
        return;
      }
      if (!CurrencyID) {
        toast('Currency ID is required', 'warning');
        return;
      }
      if (!AccountID) {
        toast('Account ID is required', 'warning');
        return;
      }
    }

    // Local array management for Add/Edit/Update
    // If record was already added to grid by Update button (has _isNew flag)
    if (currentMode === 'update' && selectedRecord && selectedRecord._isNew) {
      // Record already in grid, now save to backend with ButtonMark='N'
      const OurBranchID = selectedRecord.OurBranchID || sessionData.OurBranchID;
      const AccountTagID = selectedRecord.AccountTagID;
      const CurrencyID = selectedRecord.CurrencyID;
      const AccountID = selectedRecord.AccountID;
      
      try {
        log('Saving new InterBranch GL Parameter to backend...');
        toast('Saving, please wait...', 'info');
        
        // Build XML with ButtonMark='N' for new record
        const detailXml = 
          `<dt_InterBranchGeneralLedger>` +
          `<ButtonMark>N</ButtonMark>` +
          `<AccountTagID>${AccountTagID}</AccountTagID>` +
          `<CurrencyID>${CurrencyID}</CurrencyID>` +
          `<AccountID>${AccountID}</AccountID>` +
          `</dt_InterBranchGeneralLedger>`;
        
        const requestData = {
          OurBranchID,
          OperatedBy: sessionData.OperatorID,
          OperatedOn: new Date().toISOString(),
          SupervisedBy: null,
          UpdateCount: 0,
          DetailRecords: detailXml
        };
        
        if (!GeneralLedgerService) await initServices();
        const result = await GeneralLedgerService.addEditGLInterBranch(requestData);
        log('Save result: ' + JSON.stringify(result));
        
        if (result && result.success) {
          toast('New record saved successfully.', 'success');
          
          // Remove temp flag after successful save
          if (selectedRecord) delete selectedRecord._isNew;
          if (currentData[editRecordIndex]) {
            delete currentData[editRecordIndex]._isNew;
          }
          if (Array.isArray(response.Details) && response.Details[editRecordIndex]) {
            delete response.Details[editRecordIndex]._isNew;
          }
          
          // Refresh the table
          populateTable(currentData);
          
          // Reset state and clear form
          currentMode = 'view';
          editRecordIndex = null;
          selectedRecord = null;
          
          // Clear form fields and disable them
          clearForm(false);
          setButtonState(true); // Re-enable action buttons
          
        } else {
          toast((result && result.message) || 'Failed to save', 'error');
        }
      } catch (error) {
        console.error('Error saving:', error);
        toast('Error saving: ' + (error.message || error), 'error');
      }
      return;
    }
    // Update existing record - use values already captured in selectedRecord by Update button
    if (currentMode === 'update' && selectedRecord != null && editRecordIndex !== null) {
      // First update local arrays
      if (currentData[editRecordIndex]) {
        currentData[editRecordIndex] = {
          ...currentData[editRecordIndex],
          AccountTagID: selectedRecord.AccountTagID,
          CurrencyID: selectedRecord.CurrencyID,
          AccountID: selectedRecord.AccountID,
          ModifiedBy: selectedRecord.ModifiedBy,
          ModifiedOn: selectedRecord.ModifiedOn,
          UpdateCount: (currentData[editRecordIndex].UpdateCount || 0) + 1
        };
      }
      if (Array.isArray(response.Details) && response.Details[editRecordIndex]) {
        response.Details[editRecordIndex] = {
          ...response.Details[editRecordIndex],
          AccountTagID: selectedRecord.AccountTagID,
          CurrencyID: selectedRecord.CurrencyID,
          AccountID: selectedRecord.AccountID,
          ModifiedBy: selectedRecord.ModifiedBy,
          ModifiedOn: selectedRecord.ModifiedOn,
          UpdateCount: (response.Details[editRecordIndex].UpdateCount || 0) + 1
        };
      }
      
      // Now save to backend
      const OurBranchID = selectedRecord.OurBranchID || sessionData.OurBranchID;
      const AccountTagID = selectedRecord.AccountTagID;
      const CurrencyID = selectedRecord.CurrencyID;
      const AccountID = selectedRecord.AccountID;
      
      try {
        log('Updating InterBranch GL Parameter in backend...');
        toast('Saving changes, please wait...', 'info');
        
        // Build XML with ButtonMark='A' for altered/updated record
        const detailXml = 
          `<dt_InterBranchGeneralLedger>` +
          `<ButtonMark>A</ButtonMark>` +
          `<AccountTagID>${AccountTagID}</AccountTagID>` +
          `<CurrencyID>${CurrencyID}</CurrencyID>` +
          `<AccountID>${AccountID}</AccountID>` +
          `</dt_InterBranchGeneralLedger>`;
        
        const requestData = {
          OurBranchID,
          OperatedBy: sessionData.OperatorID,
          OperatedOn: new Date().toISOString(),
          SupervisedBy: null,
          UpdateCount: (selectedRecord.UpdateCount || 0) + 1,
          DetailRecords: detailXml
        };
        
        if (!GeneralLedgerService) await initServices();
        const result = await GeneralLedgerService.addEditGLInterBranch(requestData);
        log('Update result: ' + JSON.stringify(result));
        
        if (result && result.success) {
          toast('Record updated successfully.', 'success');
          // Refresh the table
          populateTable(currentData);
          // Reset state
          currentMode = 'view';
          editRecordIndex = null;
          selectedRecord = null;
          // Clear form fields and disable them
          clearForm(false);
          setButtonState(true); // Re-enable action buttons
        } else {
          toast((result && result.message) || 'Failed to update', 'error');
        }
      } catch (error) {
        console.error('Error updating:', error);
        toast('Error updating: ' + (error.message || error), 'error');
      }
      return;
    }

    // If not local, fallback to backend save
    try {
      log('Saving InterBranch GL Parameter...');
      toast('Saving, please wait...', 'info');
      // Compose requestData for API with ButtonMark='N' for new record
      const detailXml = 
        `<dt_InterBranchGeneralLedger>` +
        `<ButtonMark>N</ButtonMark>` +
        `<AccountTagID>${AccountTagID}</AccountTagID>` +
        `<CurrencyID>${CurrencyID}</CurrencyID>` +
        `<AccountID>${AccountID}</AccountID>` +
        `</dt_InterBranchGeneralLedger>`;
      
      const requestData = {
        OurBranchID,
        OperatedBy: sessionData.OperatorID,
        OperatedOn: new Date().toISOString(),
        SupervisedBy: null,
        UpdateCount: 0,
        DetailRecords: detailXml
      };
      if (!GeneralLedgerService) await initServices();
      const result = await GeneralLedgerService.addEditGLInterBranch(requestData);
      log('Save result: ' + JSON.stringify(result));
      if (result && result.success) {
        toast('InterBranch GL Parameter saved successfully', 'success');
        await loadInterBranchGLParameters();
        currentMode = 'view';
      } else {
        toast((result && result.message) || 'Failed to save', 'error');
      }
    } catch (error) {
      console.error('Error saving:', error);
      toast('Error saving: ' + (error.message || error), 'error');
    }
    // Always clear form after save attempt
    clearForm(false);
    setButtonState(true);
  }

  /**
   * Handle Cancel button
   */
  function handleCancel() {
    currentMode = 'view';
    clearForm();
    toast('Cancelled', 'info');
  }

  /**
   * Clear form fields
   */
  function clearForm(enableButtons = true) {
    log(`clearForm called with enableButtons=${enableButtons}`);
    
    // Clear all form field values explicitly
    id('accountTag') && (id('accountTag').value = '');
    id('currencyId') && (id('currencyId').value = '');
    id('accountId') && (id('accountId').value = '');
    id('createdBy') && (id('createdBy').value = '');
    id('createdOn') && (id('createdOn').value = '');
    id('modifiedBy') && (id('modifiedBy').value = '');
    id('modifiedOn') && (id('modifiedOn').value = '');
    id('supervisedBy') && (id('supervisedBy').value = '');
    id('supervisedOn') && (id('supervisedOn').value = '');
    
    // Disable form fields (keep BTS fields readable)
    id('accountTag') && (id('accountTag').disabled = true);
    id('currencyId') && (id('currencyId').disabled = true);
    id('accountId') && (id('accountId').disabled = true);
    
    // Disable Save button always
    const saveBtn = id('saveBtn');
    if (saveBtn) {
      saveBtn.disabled = true;
    }
    
    selectedRecord = null;
    editRecordIndex = null;
    
    // Clear row selection from main table only
    const mainTable = qs('#ibgl-params-table');
    if (mainTable) {
      mainTable.querySelectorAll('tbody tr').forEach(r => r.classList.remove('table-active'));
    }
    
    // IMPORTANT: enableButtons controls whether New/Edit/Alter/Remove buttons are enabled
    // enableButtons=true means we're ready for new action (set buttons enabled)
    // enableButtons=false means we just finished an operation (keep buttons disabled temporarily, then caller can decide)
    if (enableButtons) {
      setButtonState(true); // Enable action buttons for new actions
    }
    // If enableButtons=false, caller is responsible for calling setButtonState if needed
    
    log('Cleared - enableButtons=' + !!enableButtons);
  }

  /**
   * Set button state
   */
  function setButtonState(editing) {
    id('newBtn') && (id('newBtn').disabled = !editing);
    id('alterBtn') && (id('alterBtn').disabled = !editing);
    id('removeBtn') && (id('removeBtn').disabled = !editing);
    id('updateBtn') && (id('updateBtn').disabled = !editing);
  }

  /**
   * Initialize event listeners
   */
  async function init() {
    log('Initializing InterBranch GL Parameters...');

    // Populate Account Tag dropdown
    const accountTagSelect = id('accountTag');
    if (accountTagSelect) {
      accountTagSelect.innerHTML = '';
      const options = [
        { value: '', text: '--Select--' },
        { value: 'IB_CHARGE_AC', text: 'Inter Branch Charge GL' },
        { value: 'IB_PBLE_AC', text: 'Inter Branch Payable GL' },
        { value: 'IB_RBLE_AC', text: 'Inter Branch Receivable GL' }
      ];
      options.forEach(opt => {
        const o = document.createElement('option');
        o.value = opt.value;
        o.textContent = opt.text;
        accountTagSelect.appendChild(o);
      });
    }
  id('newBtn')?.addEventListener('click', handleAdd);
    id('alterBtn')?.addEventListener('click', () => {
      if (!selectedRecord) {
        toast('Select a record first', 'warning');
        return;
      }
      if (currentMode !== 'edit') {
        toast('Click Edit first', 'warning');
        return;
      }
      // Enable form fields for editing
      id('accountTag') && (id('accountTag').disabled = false);
      id('currencyId') && (id('currencyId').disabled = false);
      id('accountId') && (id('accountId').disabled = false);
      toast('Alter mode - modify the fields as needed', 'info');
    });
    setButtonState(false);
    id('removeBtn')?.addEventListener('click', handleRemove);
    id('updateBtn')?.addEventListener('click', () => {
      log('Update button clicked, currentMode: ' + currentMode);
      // If editing an existing record
      if (selectedRecord && currentMode === 'edit') {
        // Capture the current form values into selectedRecord
        const AccountTagID = id('accountTag')?.value?.trim() || '';
        const CurrencyID = id('currencyId')?.value?.trim() || '';
        const AccountID = id('accountId')?.value?.trim() || '';
        
        // Validation
        if (!AccountTagID) {
          toast('Account Tag is required', 'warning');
          return;
        }
        if (!CurrencyID) {
          toast('Currency ID is required', 'warning');
          return;
        }
        if (!AccountID) {
          toast('Account ID is required', 'warning');
          return;
        }
        
        // Update selectedRecord with new values
        selectedRecord.AccountTagID = AccountTagID;
        selectedRecord.CurrencyID = CurrencyID;
        selectedRecord.AccountID = AccountID;
        selectedRecord.ModifiedBy = sessionData.OperatorID;
        selectedRecord.ModifiedOn = new Date().toISOString();
        
        // Also update in currentData array immediately to show changes
        if (editRecordIndex !== null && currentData[editRecordIndex]) {
          currentData[editRecordIndex].AccountTagID = AccountTagID;
          currentData[editRecordIndex].CurrencyID = CurrencyID;
          currentData[editRecordIndex].AccountID = AccountID;
          currentData[editRecordIndex].ModifiedBy = sessionData.OperatorID;
          currentData[editRecordIndex].ModifiedOn = new Date().toISOString();
        }
        
        // Update in response.Details as well
        if (Array.isArray(response.Details) && editRecordIndex !== null && response.Details[editRecordIndex]) {
          response.Details[editRecordIndex].AccountTagID = AccountTagID;
          response.Details[editRecordIndex].CurrencyID = CurrencyID;
          response.Details[editRecordIndex].AccountID = AccountID;
          response.Details[editRecordIndex].ModifiedBy = sessionData.OperatorID;
          response.Details[editRecordIndex].ModifiedOn = new Date().toISOString();
        }
        
        // Refresh the grid to show the updated values
        populateTable(currentData);
        
        currentMode = 'update';
        const saveBtn = id('saveBtn');
        if (saveBtn) {
          saveBtn.disabled = false;
          log('Save button enabled: ' + !saveBtn.disabled);
        }
        toast('Changes updated in grid. Click Save to persist to backend.', 'info');
        return;
      }
      // If adding a new record (no selectedRecord, mode is add)
      if (!selectedRecord && currentMode === 'add') {
        // Capture the current form values
        const AccountTagID = id('accountTag')?.value?.trim() || '';
        const CurrencyID = id('currencyId')?.value?.trim() || '';
        const AccountID = id('accountId')?.value?.trim() || '';
        const OurBranchID = id('branchId')?.value?.trim() || sessionData.OurBranchID;
        
        // Validation
        if (!AccountTagID) {
          toast('Account Tag is required', 'warning');
          return;
        }
        if (!CurrencyID) {
          toast('Currency ID is required', 'warning');
          return;
        }
        if (!AccountID) {
          toast('Account ID is required', 'warning');
          return;
        }
        
        // Add the new record to the grid immediately
        let currencyName = '';
        let accountName = '';
        if (typeof allAccounts !== 'undefined' && Array.isArray(allAccounts) && AccountID) {
          const foundAccount = allAccounts.find(a => a.AccountID === AccountID);
          if (foundAccount) {
            accountName = foundAccount.Description || '';
            if (foundAccount.CurrencyID) {
              currencyName = foundAccount.CurrencyName || foundAccount.CurrencyID;
            }
          }
        }
        if (!currencyName && CurrencyID) {
          const found = currentData.find(r => r.CurrencyID === CurrencyID && r.CurrencyName);
          if (found) currencyName = found.CurrencyName;
        }
        if (!accountName && AccountID) {
          const found = currentData.find(r => r.AccountID === AccountID && r.AccountName);
          if (found) accountName = found.AccountName;
        }
        
        const newRecord = {
          OurBranchID,
          BranchName: id('branchName')?.value || '',
          AccountTagID,
          AccountTagName: '',
          CurrencyID,
          CurrencyName: currencyName,
          AccountID,
          AccountName: accountName,
          CreatedBy: sessionData.OperatorID,
          CreatedOn: new Date().toISOString(),
          ModifiedBy: null,
          ModifiedOn: null,
          SupervisedBy: null,
          SupervisedOn: null,
          UpdateCount: 0,
          _isNew: true // Flag to track new records
        };
        
        // Add to currentData array
        currentData.push(newRecord);
        // Initialize response.Details if needed
        if (!Array.isArray(response.Details)) {
          response.Details = [];
        }
        response.Details.push(newRecord);
        
        // Store the index for save
        editRecordIndex = currentData.length - 1;
        selectedRecord = newRecord;
        
        // Refresh the grid
        populateTable(currentData);
        
        currentMode = 'update';
        const saveBtn = id('saveBtn');
        if (saveBtn) {
          saveBtn.disabled = false;
          log('Save button enabled: ' + !saveBtn.disabled);
        }
        toast('New record added to grid. Click Save to persist.', 'success');
        return;
      }
      // Otherwise, require correct flow
      toast('Click New to add or Edit to modify a record first.', 'warning');
    });
    id('clearBtn')?.addEventListener('click', clearForm);

    id('arrowLeftBtn')?.addEventListener('click', () => toast('Previous record'));
    id('arrowRightBtn')?.addEventListener('click', () => toast('Next record'));

    id('viewBtn')?.addEventListener('click', handleView);
    id('addBtn')?.addEventListener('click', handleAdd);
    id('editBtn')?.addEventListener('click', handleEdit);
    id('saveBtn')?.addEventListener('click', (e) => {
      log('Save button clicked, disabled: ' + e.target.disabled);
      log('Current mode: ' + currentMode);
      log('Selected record: ' + JSON.stringify(selectedRecord));
      log('Edit record index: ' + editRecordIndex);
      if (!e.target.disabled) {
        handleSave();
      } else {
        log('Save button is disabled, not calling handleSave');
      }
    });
    id('cancelBtn')?.addEventListener('click', handleCancel);

    log('Event listeners attached');

    // Pre-load services and load initial data
    await initServices();
    
    // Auto-load initial data
    await handleView();
  }

  /**
   * Handle Remove/Delete button
   */
  async function handleRemove() {
    if (!selectedRecord) {
      toast('Select a record to remove', 'warning');
      return;
    }
    
    if (currentMode !== 'edit') {
      toast('Click Edit first before removing a record', 'warning');
      return;
    }
    
    // Show confirmation dialog with details
    const msg = `Are you sure you want to delete this record?\n\nBranch: ${selectedRecord.OurBranchID}\nAccount Tag: ${selectedRecord.AccountTagID}\nAccount: ${selectedRecord.AccountID}`;
    if (!confirm(msg)) return;

    // Mark the record for deletion (keep it in the array but flag it)
    if (editRecordIndex !== null && editRecordIndex >= 0 && currentData[editRecordIndex]) {
      currentData[editRecordIndex]._isDeleted = true;
      selectedRecord._isDeleted = true;
      log(`Marked record for deletion at index ${editRecordIndex}: ${JSON.stringify(selectedRecord)}`);
    }
    
    // Also mark in response.Details if it exists
    if (Array.isArray(response.Details) && response.Details[editRecordIndex]) {
      response.Details[editRecordIndex]._isDeleted = true;
    }
    
    // Refresh the grid - populateTable will automatically filter deleted records
    populateTable(currentData);
    
    // Switch to delete mode and enable Save button
    currentMode = 'delete';
    const saveBtn = id('saveBtn');
    if (saveBtn) {
      saveBtn.disabled = false;
      log('Save button enabled for deletion');
    }
    
    toast('Record marked for deletion. Click Save to persist the deletion.', 'success');
    
    // Clear the form
    clearFormFields();
  }
  
  /**
   * Clear form fields only (without resetting selectedRecord)
   */
  function clearFormFields() {
    id('accountTag') && (id('accountTag').value = '');
    id('currencyId') && (id('currencyId').value = '');
    id('accountId') && (id('accountId').value = '');
    id('createdBy') && (id('createdBy').value = '');
    id('createdOn') && (id('createdOn').value = '');
    id('modifiedBy') && (id('modifiedBy').value = '');
    id('modifiedOn') && (id('modifiedOn').value = '');
    id('supervisedBy') && (id('supervisedBy').value = '');
    id('supervisedOn') && (id('supervisedOn').value = '');
    qsa('table tbody tr').forEach(r => r.classList.remove('table-active'));
  }

  // --- Account ID Search Modal Wiring ---
  let allAccounts = [];

  async function showAccountSearchModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('accountSearchModal');
    if (existingModal) existingModal.remove();
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'accountSearchModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '10000';
    
    // Create modal content
    const content = document.createElement('div');
    content.style.background = 'white';
    content.style.borderRadius = '8px';
    content.style.width = '800px';
    content.style.maxHeight = '80vh';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    
    // Modal header with controls
    const header = document.createElement('div');
    header.style.background = '#517a8e';
    header.style.color = 'white';
    header.style.padding = '12px 20px';
    header.style.borderRadius = '8px 8px 0 0';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    const headerTitle = document.createElement('h3');
    headerTitle.textContent = 'Account Search';
    headerTitle.style.margin = '0';
    headerTitle.style.fontSize = '15px';
    headerTitle.style.fontWeight = '600';
    
    const headerButtons = document.createElement('div');
    headerButtons.style.display = 'flex';
    headerButtons.style.gap = '8px';
    
    let isMinimized = false;
    let isMaximized = false;
    
    const minimizeBtn = document.createElement('button');
    minimizeBtn.innerHTML = '−';
    minimizeBtn.style.background = 'rgba(255,255,255,0.1)';
    minimizeBtn.style.border = 'none';
    minimizeBtn.style.color = 'white';
    minimizeBtn.style.width = '32px';
    minimizeBtn.style.height = '32px';
    minimizeBtn.style.borderRadius = '4px';
    minimizeBtn.style.cursor = 'pointer';
    minimizeBtn.style.fontSize = '20px';
    minimizeBtn.onclick = function() {
      isMinimized = !isMinimized;
      body.style.display = isMinimized ? 'none' : 'block';
    };
    
    const maximizeBtn = document.createElement('button');
    maximizeBtn.innerHTML = '□';
    maximizeBtn.style.background = 'rgba(255,255,255,0.1)';
    maximizeBtn.style.border = 'none';
    maximizeBtn.style.color = 'white';
    maximizeBtn.style.width = '32px';
    maximizeBtn.style.height = '32px';
    maximizeBtn.style.borderRadius = '4px';
    maximizeBtn.style.cursor = 'pointer';
    maximizeBtn.style.fontSize = '20px';
    maximizeBtn.onclick = function() {
      if (!isMaximized) {
        content.style.width = '95vw';
        content.style.maxHeight = '95vh';
        isMaximized = true;
      } else {
        content.style.width = '800px';
        content.style.maxHeight = '80vh';
        isMaximized = false;
      }
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.background = 'rgba(255,255,255,0.1)';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.width = '32px';
    closeBtn.style.height = '32px';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '24px';
    closeBtn.onclick = function() { modal.remove(); };
    
    headerButtons.appendChild(minimizeBtn);
    headerButtons.appendChild(maximizeBtn);
    headerButtons.appendChild(closeBtn);
    header.appendChild(headerTitle);
    header.appendChild(headerButtons);
    content.appendChild(header);
    
    // Modal body
    const body = document.createElement('div');
    body.style.padding = '24px';
    body.style.overflowY = 'auto';
    body.style.flex = '1';
    
    // Filter row
    const filterRow = document.createElement('div');
    filterRow.style.display = 'flex';
    filterRow.style.gap = '8px';
    filterRow.style.marginBottom = '16px';
    filterRow.style.alignItems = 'center';
    
    const accountIdLabel = document.createElement('label');
    accountIdLabel.textContent = 'Account ID';
    accountIdLabel.style.fontSize = '12px';
    accountIdLabel.style.fontWeight = '500';
    
    const accountIdType = document.createElement('select');
    accountIdType.id = 'accountSearchAccountIdType';
    accountIdType.innerHTML = '<option value="like">Like</option><option value="equals">Equals</option>';
    accountIdType.style.height = '32px';
    accountIdType.style.fontSize = '12px';
    accountIdType.style.borderRadius = '4px';
    accountIdType.style.border = '1px solid #d1d5db';
    
    const accountIdInput = document.createElement('input');
    accountIdInput.id = 'accountSearchAccountId';
    accountIdInput.type = 'text';
    accountIdInput.style.width = '140px';
    accountIdInput.style.height = '32px';
    accountIdInput.style.fontSize = '12px';
    accountIdInput.style.padding = '6px 10px';
    accountIdInput.style.borderRadius = '4px';
    accountIdInput.style.border = '1px solid #d1d5db';
    
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Description';
    descLabel.style.fontSize = '12px';
    descLabel.style.fontWeight = '500';
    descLabel.style.marginLeft = '16px';
    
    const descType = document.createElement('select');
    descType.id = 'accountSearchDescType';
    descType.innerHTML = '<option value="like">Like</option><option value="equals">Equals</option>';
    descType.style.height = '32px';
    descType.style.fontSize = '12px';
    descType.style.borderRadius = '4px';
    descType.style.border = '1px solid #d1d5db';
    
    const descInput = document.createElement('input');
    descInput.id = 'accountSearchDesc';
    descInput.type = 'text';
    descInput.style.width = '140px';
    descInput.style.height = '32px';
    descInput.style.fontSize = '12px';
    descInput.style.padding = '6px 10px';
    descInput.style.borderRadius = '4px';
    descInput.style.border = '1px solid #d1d5db';
    
    const searchBtn = document.createElement('button');
    searchBtn.textContent = 'Search';
    searchBtn.style.marginLeft = '16px';
    searchBtn.style.height = '32px';
    searchBtn.style.padding = '0 16px';
    searchBtn.style.fontSize = '12px';
    searchBtn.style.fontWeight = '500';
    searchBtn.style.background = '#517a8e';
    searchBtn.style.color = 'white';
    searchBtn.style.border = 'none';
    searchBtn.style.borderRadius = '4px';
    searchBtn.style.cursor = 'pointer';
    
    filterRow.appendChild(accountIdLabel);
    filterRow.appendChild(accountIdType);
    filterRow.appendChild(accountIdInput);
    filterRow.appendChild(descLabel);
    filterRow.appendChild(descType);
    filterRow.appendChild(descInput);
    filterRow.appendChild(searchBtn);
    body.appendChild(filterRow);
    
    // Results header
    const resultsHeader = document.createElement('div');
    resultsHeader.textContent = 'Search Results';
    resultsHeader.style.fontSize = '13px';
    resultsHeader.style.fontWeight = '600';
    resultsHeader.style.margin = '16px 0 8px 0';
    resultsHeader.style.paddingBottom = '8px';
    resultsHeader.style.borderBottom = '2px solid #f9b233';
    body.appendChild(resultsHeader);
    
    // Results table
    const table = document.createElement('table');
    table.id = 'accountSearchTable';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';
    table.innerHTML = `
      <thead>
        <tr style="background:#517a8e;color:#fff;">
          <th style="padding: 8px 12px; text-align: left;">AccountID</th>
          <th style="padding: 8px 12px; text-align: left;">Description</th>
          <th style="padding: 8px 12px; text-align: left;">GLAccountTypeID</th>
          <th style="padding: 8px 12px; text-align: left;">CurrencyID</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    body.appendChild(table);
    
    // Navigation row
    const navRow = document.createElement('div');
    navRow.style.display = 'flex';
    navRow.style.justifyContent = 'center';
    navRow.style.gap = '16px';
    navRow.style.marginTop = '16px';
    
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.height = '32px';
    okBtn.style.padding = '0 24px';
    okBtn.style.fontSize = '12px';
    okBtn.style.fontWeight = '500';
    okBtn.style.background = '#22c55e';
    okBtn.style.color = 'white';
    okBtn.style.border = 'none';
    okBtn.style.borderRadius = '4px';
    okBtn.style.cursor = 'pointer';
    okBtn.onclick = function() {
      const selectedRow = table.querySelector('tbody tr.table-active');
      if (selectedRow) {
        const accountId = selectedRow.cells[0].textContent;
        document.getElementById('accountId').value = accountId;
        modal.remove();
      } else {
        toast('Please select an account', 'warning');
      }
    };
    
    navRow.appendChild(okBtn);
    body.appendChild(navRow);
    
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Load accounts and setup interactions
    await fetchAndDisplayAccounts();
    
    // Search button handler
    searchBtn.onclick = handleAccountSearch;
    
    // Close on outside click
    modal.onclick = function(e) {
      if (e.target === modal) modal.remove();
    };
  }

  async function fetchAndDisplayAccounts() {
    const tableBody = document.querySelector('#accountSearchTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="4" class="text-muted">Loading...</td></tr>';

    // Use mock account data matching the screenshot
    const mockAccounts = [
      { "AccountID": "11110005", "Description": "FOREIGN CURRENCY CASH - AED IN VAULT", "GLAccountTypeID": "A", "CurrencyID": "AED" },
      { "AccountID": "11111005", "Description": "FOREIGN CURRENCY CASH - AED IN TILL ONE", "GLAccountTypeID": "A", "CurrencyID": "AED" },
      { "AccountID": "11112005", "Description": "FOREIGN CURRENCY CASH - AED IN TILL TWO", "GLAccountTypeID": "A", "CurrencyID": "AED" },
      { "AccountID": "11113005", "Description": "FOREIGN CURRENCY CASH - AED IN TILL THREE", "GLAccountTypeID": "A", "CurrencyID": "AED" },
      { "AccountID": "11114005", "Description": "FOREIGN CURRENCY CASH - AED IN TILL FOUR", "GLAccountTypeID": "A", "CurrencyID": "AED" },
      { "AccountID": "11140004", "Description": "Cash in transit FCY", "GLAccountTypeID": "A", "CurrencyID": "AED" },
      { "AccountID": "11870050", "Description": "UAE Positioning Account", "GLAccountTypeID": "A", "CurrencyID": "AED" },
      { "AccountID": "11880040", "Description": "Inter branch Recevable AED", "GLAccountTypeID": "A", "CurrencyID": "AED" }
    ];

    allAccounts = mockAccounts;
    renderAccountTable(allAccounts);
  }

  function renderAccountTable(data) {
    const tableBody = document.querySelector('#accountSearchTable tbody');
    if (!tableBody) return;
    if (!data || data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="4" class="text-muted">No accounts found.</td></tr>';
      return;
    }
    tableBody.innerHTML = data.map((account, idx) =>
      `<tr data-account-id="${account.AccountID}" data-description="${account.Description || ''}" data-gl-type="${account.GLAccountTypeID || ''}" data-currency="${account.CurrencyID || ''}" tabindex="0" role="row" aria-selected="false" style="cursor:pointer;outline:none;">
        <td>${account.AccountID || ''}</td>
        <td>${account.Description || ''}</td>
        <td>${account.GLAccountTypeID || ''}</td>
        <td>${account.CurrencyID || ''}</td>
      </tr>`
    ).join('');

    // Row selection logic (always re-attach after render)
    let selectedRow = null;
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
      row.addEventListener('click', function(e) {
        e.stopPropagation();
        rows.forEach(r => { 
          r.classList.remove('table-active'); 
          r.setAttribute('aria-selected', 'false');
          r.style.background = '';
        });
        selectedRow = this;
        selectedRow.classList.add('table-active');
        selectedRow.setAttribute('aria-selected', 'true');
        selectedRow.style.background = '#e0e7ff';
        selectedRow.focus();
        window._accountModalSelectedRow = selectedRow;
      });
      row.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        selectAccountFromRow(this);
      });
      row.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectAccountFromRow(this);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = this.nextElementSibling;
          if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = this.previousElementSibling;
          if (prev) prev.focus();
        }
      });
    });
    // Reset selected row global on new render
    window._accountModalSelectedRow = null;
    // Focus first row for accessibility
    if (rows.length > 0) rows[0].focus();
    // Ensure modal close button works
    const closeBtn = document.querySelector('#accountSearchModal .btn-close');
    if (closeBtn) {
      closeBtn.onclick = function() {
        const modalEl = document.getElementById('accountSearchModal');
        if (modalEl && window.bootstrap) {
          const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
      };
    }
    // Ensure OK button only works if a row is selected
    const okBtn = document.getElementById('accountOkBtn');
    if (okBtn) {
      okBtn.onclick = function() {
        const row = window._accountModalSelectedRow || document.querySelector('#accountSearchTable tbody tr.table-active');
        if (row) {
          selectAccountFromRow(row);
        } else {
          toast('Please select an account from the list', 'warning');
        }
      };
    }
  }

  // Set account in main form and close modal
  function selectAccountFromRow(row) {
    if (!row) return;
    const accountId = row.getAttribute('data-account-id');
    const description = row.getAttribute('data-description');
    
    log('Selected account: ' + accountId + ' - ' + description);
    
    // Set value in main form
    const accountIdInput = document.getElementById('accountId');
    if (accountIdInput) accountIdInput.value = accountId;
    
    // Close modal by removing it
    const modalEl = document.getElementById('accountSearchModal');
    if (modalEl) {
      modalEl.remove();
    }
  }

  // Search/filter logic for account modal
  async function handleAccountSearch() {
    const accountIdInput = document.getElementById('accountSearchAccountId');
    const accountIdType = document.getElementById('accountSearchAccountIdType');
    const descInput = document.getElementById('accountSearchDesc');
    const descType = document.getElementById('accountSearchDescType');
    
    if (!accountIdInput || !accountIdType || !descInput || !descType) return;
    
    const accountIdVal = accountIdInput.value.trim().toUpperCase();
    const accountIdTypeVal = accountIdType.value;
    const descVal = descInput.value.trim().toUpperCase();
    const descTypeVal = descType.value;
    
    let filtered = allAccounts;
    if (accountIdVal) {
      filtered = filtered.filter(account =>
        accountIdTypeVal === 'like' ? (account.AccountID || '').toUpperCase().includes(accountIdVal) : (account.AccountID || '').toUpperCase() === accountIdVal
      );
    }
    if (descVal) {
      filtered = filtered.filter(account =>
        descTypeVal === 'like' ? (account.Description || '').toUpperCase().includes(descVal) : (account.Description || '').toUpperCase() === descVal
      );
    }
    renderAccountTable(filtered);
  }

  // --- Branch Search Modal Wiring ---
  let allBranches = [{"OurBranchID":"0101","BranchName":"Head Office"},{"OurBranchID":"0102","BranchName":"Head Office IFRS"},{"OurBranchID":"0103","BranchName":"Regional Office"},{"OurBranchID":"0104","BranchName":"IBO"},{"OurBranchID":"0105","BranchName":"Digital Banking Operation"},{"OurBranchID":"0201","BranchName":"Fenoteselam  District"},{"OurBranchID":"0202","BranchName":"Zenbaba"},{"OurBranchID":"0203","BranchName":"Meshenti"},{"OurBranchID":"0204","BranchName":"Wojet"},{"OurBranchID":"0205","BranchName":"Addiet"},{"OurBranchID":"0206","BranchName":"TisAbay"},{"OurBranchID":"0207","BranchName":"Merawi"},{"OurBranchID":"0208","BranchName":"Wotet Abay"},{"OurBranchID":"0209","BranchName":"Durbetie"},{"OurBranchID":"0210","BranchName":"Yismala"},{"OurBranchID":"0211","BranchName":"Finote-selam"},{"OurBranchID":"0212","BranchName":"Burie"},{"OurBranchID":"0213","BranchName":"Sekela"},{"OurBranchID":"0214","BranchName":"Gebeze Mariam"},{"OurBranchID":"0215","BranchName":"Wad"},{"OurBranchID":"0216","BranchName":"Feresbet"},{"OurBranchID":"0217","BranchName":"Dembecha"},{"OurBranchID":"0218","BranchName":"Shindie"},{"OurBranchID":"0219","BranchName":"Mankusa"},{"OurBranchID":"0220","BranchName":"Gonji"},{"OurBranchID":"0221","BranchName":"Shumabo"},{"OurBranchID":"0222","BranchName":"Kunzila"},{"OurBranchID":"0223","BranchName":"Kedemit Lalibela"},{"OurBranchID":"0224","BranchName":"DebreMawi"},{"OurBranchID":"0225","BranchName":"Rim"},{"OurBranchID":"0226","BranchName":"Jiga"},{"OurBranchID":"0227","BranchName":"Quch"},{"OurBranchID":"0228","BranchName":"Filkilk"},{"OurBranchID":"0229","BranchName":"Liben"},{"OurBranchID":"0230","BranchName":"Mecha"},{"OurBranchID":"0231","BranchName":"Goshiye"},{"OurBranchID":"0232","BranchName":"Ghion"},{"OurBranchID":"0233","BranchName":"Donaber"},{"OurBranchID":"0234","BranchName":"Wogedad"},{"OurBranchID":"0235","BranchName":"Agut"},{"OurBranchID":"0236","BranchName":"Genetabo"},{"OurBranchID":"0237","BranchName":"Afessa"},{"OurBranchID":"0238","BranchName":"Birakat"},{"OurBranchID":"0239","BranchName":"Tame"},{"OurBranchID":"0240","BranchName":"Zegie"},{"OurBranchID":"0241","BranchName":"Anjeny"},{"OurBranchID":"0242","BranchName":"Agita"},{"OurBranchID":"0243","BranchName":"Ginib Geregera"},{"OurBranchID":"0244","BranchName":"Ambiki"},{"OurBranchID":"0245","BranchName":"Mentawuha"},{"OurBranchID":"0246","BranchName":"Avadira"},{"OurBranchID":"0247","BranchName":"Gissa"},{"OurBranchID":"0248","BranchName":"Fagita"},{"OurBranchID":"0249","BranchName":"AddisAlem"},{"OurBranchID":"0250","BranchName":"Chiguali"},{"OurBranchID":"0251","BranchName":"Dagi  Abiyot"},{"OurBranchID":"0252","BranchName":"Amarit"},{"OurBranchID":"0253","BranchName":"Yezeleka"},{"OurBranchID":"0254","BranchName":"Yechereka"},{"OurBranchID":"0255","BranchName":"Chimba"},{"OurBranchID":"0256","BranchName":"Makisegnen Dengra"},{"OurBranchID":"0257","BranchName":"Markuma"},{"OurBranchID":"0258","BranchName":"Achefer"},{"OurBranchID":"0259","BranchName":"Mehalgenet"},{"OurBranchID":"0260","BranchName":"Geray"},{"OurBranchID":"0261","BranchName":"Abichikli"},{"OurBranchID":"0262","BranchName":"Gula"},{"OurBranchID":"0263","BranchName":"Burie ber"},{"OurBranchID":"0264","BranchName":"Wonberma"},{"OurBranchID":"0265","BranchName":"Alefa Basie"},{"OurBranchID":"0266","BranchName":"Gish-Abay"},{"OurBranchID":"0267","BranchName":"Waza"},{"OurBranchID":"0268","BranchName":"Tikur Wuha"},{"OurBranchID":"0272","BranchName":"Kimbaba"},{"OurBranchID":"0290","BranchName":"Test"},{"OurBranchID":"0301","BranchName":"Injebara  District"},{"OurBranchID":"0302","BranchName":"Kosober"},{"OurBranchID":"0303","BranchName":"Fetam"},{"OurBranchID":"0304","BranchName":"Addis Kidam"},{"OurBranchID":"0305","BranchName":"Agunta"},{"OurBranchID":"0306","BranchName":"Agew Gimjabet"},{"OurBranchID":"0307","BranchName":"Ardi"},{"OurBranchID":"0308","BranchName":"Azena"},{"OurBranchID":"0309","BranchName":"Chara"},{"OurBranchID":"0310","BranchName":"Jawi"},{"OurBranchID":"0311","BranchName":"Zigem"},{"OurBranchID":"0312","BranchName":"Kidamaja"},{"OurBranchID":"0313","BranchName":"Zengena"},{"OurBranchID":"0314","BranchName":"Ehudit"},{"OurBranchID":"0315","BranchName":"Ajis"},{"OurBranchID":"0316","BranchName":"Bitwoded Mengesha Jemberie"},{"OurBranchID":"0317","BranchName":"Metekel"},{"OurBranchID":"0318","BranchName":"Bitileta"},{"OurBranchID":"0319","BranchName":"Gilgel Beles"},{"OurBranchID":"0320","BranchName":"Pawi"},{"OurBranchID":"0321","BranchName":"Work Meda"},{"OurBranchID":"0322","BranchName":"Aduk"},{"OurBranchID":"0323","BranchName":"ASSOSA"},{"OurBranchID":"0325","BranchName":"Tillil"},{"OurBranchID":"0327","BranchName":"Shashina"},{"OurBranchID":"0328","BranchName":"Deq"},{"OurBranchID":"0329","BranchName":"Gubala"},{"OurBranchID":"0401","BranchName":"Debremarkos  District"},{"OurBranchID":"0402","BranchName":"Debremarkos"},{"OurBranchID":"0403","BranchName":"Lumamie"},{"OurBranchID":"0404","BranchName":"Amanuel"},{"OurBranchID":"0405","BranchName":"Yejubie"},{"OurBranchID":"0406","BranchName":"Rob_Gebia"},{"OurBranchID":"0407","BranchName":"Gozamen"},{"OurBranchID":"0408","BranchName":"Debre_Elias"},{"OurBranchID":"0409","BranchName":"Amber"},{"OurBranchID":"0410","BranchName":"Digotsion"},{"OurBranchID":"0411","BranchName":"Dejen"},{"OurBranchID":"0412","BranchName":"Degasegn"},{"OurBranchID":"0413","BranchName":"Yebokela"},{"OurBranchID":"0414","BranchName":"Yetmen"},{"OurBranchID":"0415","BranchName":"Bichena"},{"OurBranchID":"0416","BranchName":"Yoduha"},{"OurBranchID":"0417","BranchName":"Quyi"},{"OurBranchID":"0418","BranchName":"Enarje"},{"OurBranchID":"0419","BranchName":"Mota"},{"OurBranchID":"0420","BranchName":"Keranio"},{"OurBranchID":"0421","BranchName":"Sedie"},{"OurBranchID":"0422","BranchName":"Goncha"},{"OurBranchID":"0423","BranchName":"Abiyot Adebabay"},{"OurBranchID":"0424","BranchName":"Yelamgej"},{"OurBranchID":"0425","BranchName":"WoynWuha"},{"OurBranchID":"0426","BranchName":"Felege_Berhan"},{"OurBranchID":"0427","BranchName":"Debre-Eyesus"},{"OurBranchID":"0428","BranchName":"Guaye"},{"OurBranchID":"0429","BranchName":"Chemo"},{"OurBranchID":"0430","BranchName":"Maza Genet"},{"OurBranchID":"0431","BranchName":"Woyra"},{"OurBranchID":"0432","BranchName":"Shebel"},{"OurBranchID":"0433","BranchName":"Girakidamen"},{"OurBranchID":"0434","BranchName":"Wojel"},{"OurBranchID":"0435","BranchName":"Kork"},{"OurBranchID":"0436","BranchName":"Chertekel"},{"OurBranchID":"0437","BranchName":"Gubaya"},{"OurBranchID":"0439","BranchName":"Dibo"},{"OurBranchID":"0440","BranchName":"Kernewari"},{"OurBranchID":"0441","BranchName":"Yekebehana"},{"OurBranchID":"0442","BranchName":"Libanos"},{"OurBranchID":"0443","BranchName":"Gedeb"},{"OurBranchID":"0446","BranchName":"Nabrayebalat"},{"OurBranchID":"0447","BranchName":"GetieSemanie"},{"OurBranchID":"0448","BranchName":"Dima"},{"OurBranchID":"0449","BranchName":"Asterio"},{"OurBranchID":"0450","BranchName":"Waber"},{"OurBranchID":"0451","BranchName":"Jeremes"},{"OurBranchID":"0452","BranchName":"Fendika"},{"OurBranchID":"0453","BranchName":"Yesenbet"},{"OurBranchID":"0454","BranchName":"Awuja"},{"OurBranchID":"0455","BranchName":"Gengerta"},{"OurBranchID":"0456","BranchName":"Jamagulma"},{"OurBranchID":"0457","BranchName":"Hadis Alemayehu"},{"OurBranchID":"0458","BranchName":"Debre Work"},{"OurBranchID":"0459","BranchName":"Merto Lemariam"},{"OurBranchID":"0460","BranchName":"Gendeweyen"},{"OurBranchID":"0461","BranchName":"Yetnora"},{"OurBranchID":"0462","BranchName":"Ayermarefiya"},{"OurBranchID":"0463","BranchName":"Gofchima"},{"OurBranchID":"0464","BranchName":"Genet"},{"OurBranchID":"0465","BranchName":"Choqie"},{"OurBranchID":"0466","BranchName":"Machakel"},{"OurBranchID":"0467","BranchName":"Bogena"},{"OurBranchID":"0468","BranchName":"Baso Ber"},{"OurBranchID":"0469","BranchName":"Tedila Gualu"},{"OurBranchID":"0470","BranchName":"Leilte Wolete Esrael"},{"OurBranchID":"0471","BranchName":"Abima"},{"OurBranchID":"0501","BranchName":"Gonder District"},{"OurBranchID":"0502","BranchName":"Tewodros"},{"OurBranchID":"0503","BranchName":"Chilga Branch"},{"OurBranchID":"0504","BranchName":"Koladeba"},{"OurBranchID":"0505","BranchName":"Delgie"},{"OurBranchID":"0506","BranchName":"Alefa"},{"OurBranchID":"0507","BranchName":"Gonder Zuria"},{"OurBranchID":"0508","BranchName":"Metema"},{"OurBranchID":"0509","BranchName":"Hamus Gebeya"},{"OurBranchID":"0510","BranchName":"Dimaza"},{"OurBranchID":"0511","BranchName":"Tikledengay"},{"OurBranchID":"0512","BranchName":"Sanja"},{"OurBranchID":"0513","BranchName":"Gohala"},{"OurBranchID":"0514","BranchName":"Zuy Hamusit"},{"OurBranchID":"0515","BranchName":"Arbaya"},{"OurBranchID":"0516","BranchName":"Walya"},{"OurBranchID":"0517","BranchName":"Ambagiorgis"},{"OurBranchID":"0518","BranchName":"Gedebye"},{"OurBranchID":"0519","BranchName":"Adarkay"},{"OurBranchID":"0520","BranchName":"Ayalew Biru"},{"OurBranchID":"0521","BranchName":"Janamora"},{"OurBranchID":"0522","BranchName":"Beyeda"},{"OurBranchID":"0523","BranchName":"Meder-Genete"},{"OurBranchID":"0524","BranchName":"Soroka"},{"OurBranchID":"0525","BranchName":"Shinfa"},{"OurBranchID":"0526","BranchName":"Gelego"},{"OurBranchID":"0527","BranchName":"Chuahit"},{"OurBranchID":"0528","BranchName":"Negadie Bahir"},{"OurBranchID":"0529","BranchName":"Kirakir"},{"OurBranchID":"0530","BranchName":"Maraki"},{"OurBranchID":"0531","BranchName":"Kokit"},{"OurBranchID":"0532","BranchName":"Seraba"},{"OurBranchID":"0533","BranchName":"Chonchoq"},{"OurBranchID":"0534","BranchName":"Aba Samuel"},{"OurBranchID":"0535","BranchName":"Leul-Alemayehu"},{"OurBranchID":"0536","BranchName":"Abirhajira"},{"OurBranchID":"0537","BranchName":"Enfiranz"},{"OurBranchID":"0538","BranchName":"Zarima"},{"OurBranchID":"0539","BranchName":"Metema Yohanes"},{"OurBranchID":"0540","BranchName":"AtsedeMariam"},{"OurBranchID":"0541","BranchName":"Dikularba"},{"OurBranchID":"0542","BranchName":"Masero"},{"OurBranchID":"0543","BranchName":"Ayimba"},{"OurBranchID":"0544","BranchName":"Wogera"},{"OurBranchID":"0545","BranchName":"Wokin"},{"OurBranchID":"0546","BranchName":"Arada"},{"OurBranchID":"0547","BranchName":"Debark"},{"OurBranchID":"0548","BranchName":"Tseda"},{"OurBranchID":"0549","BranchName":"Dembiya Robit"},{"OurBranchID":"0550","BranchName":"Dabat"},{"OurBranchID":"0551","BranchName":"Shahura"},{"OurBranchID":"0552","BranchName":"Taqusa"},{"OurBranchID":"0553","BranchName":"Makesegnit"},{"OurBranchID":"0554","BranchName":"Airport"},{"OurBranchID":"0556","BranchName":"Hidasie"},{"OurBranchID":"0557","BranchName":"Samuna Ber"},{"OurBranchID":"0558","BranchName":"Gorgora"},{"OurBranchID":"0560","BranchName":"Mussiebamb"},{"OurBranchID":"0561","BranchName":"Chandiba"},{"OurBranchID":"0562","BranchName":"Degoma"},{"OurBranchID":"0563","BranchName":"Bliko"},{"OurBranchID":"0564","BranchName":"Woynoch"},{"OurBranchID":"0565","BranchName":"Silarie"},{"OurBranchID":"0566","BranchName":"Telemt"},{"OurBranchID":"0567","BranchName":"Mintiwab"},{"OurBranchID":"0601","BranchName":"Debretabor District"},{"OurBranchID":"0602","BranchName":"Debretabor"},{"OurBranchID":"0603","BranchName":"Anbesamie"},{"OurBranchID":"0604","BranchName":"Aferewanat"},{"OurBranchID":"0605","BranchName":"Estie"},{"OurBranchID":"0606","BranchName":"Jaragedu"},{"OurBranchID":"0607","BranchName":"Andabet"},{"OurBranchID":"0608","BranchName":"Mekrie"},{"OurBranchID":"0609","BranchName":"Gassay"},{"OurBranchID":"0610","BranchName":"Nefas_Mewcha"},{"OurBranchID":"0611","BranchName":"Sali"},{"OurBranchID":"0612","BranchName":"Arib gebeya"},{"OurBranchID":"0613","BranchName":"Simada"},{"OurBranchID":"0614","BranchName":"Aleka G/Hana"},{"OurBranchID":"0615","BranchName":"Agele Hana"},{"OurBranchID":"0616","BranchName":"Anbo Meda"},{"OurBranchID":"0617","BranchName":"Debre Abajalie"},{"OurBranchID":"0618","BranchName":"Dera Hamusit"},{"OurBranchID":"0619","BranchName":"Alem Ber"},{"OurBranchID":"0620","BranchName":"Fert"},{"OurBranchID":"0621","BranchName":"Kimir_Dingay"},{"OurBranchID":"0622","BranchName":"Sedi_Muja"},{"OurBranchID":"0623","BranchName":"Chena"},{"OurBranchID":"0624","BranchName":"Wolela Bahir"},{"OurBranchID":"0625","BranchName":"Qoma"},{"OurBranchID":"0626","BranchName":"Selemeya"},{"OurBranchID":"0627","BranchName":"Mahdere Mariam"},{"OurBranchID":"0628","BranchName":"Zagoch"},{"OurBranchID":"0629","BranchName":"Mikael Debre"},{"OurBranchID":"0630","BranchName":"Sana"},{"OurBranchID":"0631","BranchName":"Yifag"},{"OurBranchID":"0632","BranchName":"Guramba"},{"OurBranchID":"0633","BranchName":"Adada"},{"OurBranchID":"0634","BranchName":"Qualisa"},{"OurBranchID":"0635","BranchName":"Yequasa"},{"OurBranchID":"0636","BranchName":"Meketewa"},{"OurBranchID":"0637","BranchName":"Agate"},{"OurBranchID":"0638","BranchName":"Jibasera"},{"OurBranchID":"0639","BranchName":"Ebinat"},{"OurBranchID":"0640","BranchName":"Wogeda"},{"OurBranchID":"0641","BranchName":"Hagere Genet"},{"OurBranchID":"0642","BranchName":"Melat"},{"OurBranchID":"0643","BranchName":"Fogera"},{"OurBranchID":"0644","BranchName":"Melo"},{"OurBranchID":"0645","BranchName":"Hagere Tsigie"},{"OurBranchID":"0646","BranchName":"Begemdir"},{"OurBranchID":"0647","BranchName":"Gafat"},{"OurBranchID":"0648","BranchName":"Megendi"},{"OurBranchID":"0649","BranchName":"Shimie"},{"OurBranchID":"0650","BranchName":"Dera Wogedamie"},{"OurBranchID":"0651","BranchName":"Addis Alem Gasay"},{"OurBranchID":"0652","BranchName":"Gob Gob"},{"OurBranchID":"0701","BranchName":"Woldiya District"},{"OurBranchID":"0702","BranchName":"Weldiya"},{"OurBranchID":"0703","BranchName":"Kobo"},{"OurBranchID":"0704","BranchName":"Robit"},{"OurBranchID":"0705","BranchName":"Mersa"},{"OurBranchID":"0706","BranchName":"Wurgessa"},{"OurBranchID":"0707","BranchName":"Delanta"},{"OurBranchID":"0708","BranchName":"Kurba"},{"OurBranchID":"0709","BranchName":"Sanka"},{"OurBranchID":"0710","BranchName":"Mujja"},{"OurBranchID":"0711","BranchName":"Estayish"},{"OurBranchID":"0712","BranchName":"Gashena"},{"OurBranchID":"0713","BranchName":"Kon"},{"OurBranchID":"0714","BranchName":"Flakit"},{"OurBranchID":"0715","BranchName":"Lalibela"},{"OurBranchID":"0716","BranchName":"Hara"},{"OurBranchID":"0717","BranchName":"KeberoMeda"},{"OurBranchID":"0718","BranchName":"Ayina"},{"OurBranchID":"0719","BranchName":"Sirinka"},{"OurBranchID":"0720","BranchName":"Telaje Hamusit"},{"OurBranchID":"0721","BranchName":"Tekulesh"},{"OurBranchID":"0722","BranchName":"Gobye"},{"OurBranchID":"0723","BranchName":"Sriel"},{"OurBranchID":"0724","BranchName":"Dibko"},{"OurBranchID":"0725","BranchName":"ShariyaGenet"},{"OurBranchID":"0726","BranchName":"Dildiy"},{"OurBranchID":"0727","BranchName":"Girana"},{"OurBranchID":"0728","BranchName":"KulMesk"},{"OurBranchID":"0729","BranchName":"Beklo Manekiya"},{"OurBranchID":"0730","BranchName":"Zoble"},{"OurBranchID":"0731","BranchName":"Wondach"},{"OurBranchID":"0732","BranchName":"Kewziba"},{"OurBranchID":"0733","BranchName":"Agirt"},{"OurBranchID":"0734","BranchName":"Hamusit"},{"OurBranchID":"0735","BranchName":"Lalkiw"},{"OurBranchID":"0736","BranchName":"Raya"},{"OurBranchID":"0737","BranchName":"Chena"},{"OurBranchID":"0738","BranchName":"Mecharie"},{"OurBranchID":"0739","BranchName":"Ahuntegegn"},{"OurBranchID":"0740","BranchName":"Haro"},{"OurBranchID":"0741","BranchName":"Kob"},{"OurBranchID":"0742","BranchName":"Debre Zebit"},{"OurBranchID":"0743","BranchName":"Aradom"},{"OurBranchID":"0744","BranchName":"Megenagna"},{"OurBranchID":"0745","BranchName":"Merto"},{"OurBranchID":"0746","BranchName":"Arbit"},{"OurBranchID":"0747","BranchName":"Dufti Hamusit"},{"OurBranchID":"0748","BranchName":"Kalim"},{"OurBranchID":"0749","BranchName":"Bilbala"},{"OurBranchID":"0750","BranchName":"Geregera"},{"OurBranchID":"0751","BranchName":"Mugad"},{"OurBranchID":"0752","BranchName":"Aboare"},{"OurBranchID":"0801","BranchName":"Sekota District"},{"OurBranchID":"0802","BranchName":"Sekota"},{"OurBranchID":"0803","BranchName":"Seriya"},{"OurBranchID":"0804","BranchName":"Woleh"},{"OurBranchID":"0805","BranchName":"Tsitsiqa"},{"OurBranchID":"0806","BranchName":"Niruaq"},{"OurBranchID":"0807","BranchName":"Aseketema"},{"OurBranchID":"0808","BranchName":"Chilla"},{"OurBranchID":"0809","BranchName":"Amedewerk"},{"OurBranchID":"0810","BranchName":"Tsata"},{"OurBranchID":"0811","BranchName":"Meshaha"},{"OurBranchID":"0812","BranchName":"Mkenziba"},{"OurBranchID":"0813","BranchName":"Kidamit"},{"OurBranchID":"0814","BranchName":"Silda"},{"OurBranchID":"0815","BranchName":"Dehana Arbit"},{"OurBranchID":"0816","BranchName":"Cherkos"},{"OurBranchID":"0817","BranchName":"As-Ziva"},{"OurBranchID":"0818","BranchName":"Mekelle"},{"OurBranchID":"0901","BranchName":"Dessie  District"},{"OurBranchID":"0902","BranchName":"Lakomelza"},{"OurBranchID":"0903","BranchName":"Ayiteyef"},{"OurBranchID":"0904","BranchName":"Kombolcha"},{"OurBranchID":"0905","BranchName":"Harbu"},{"OurBranchID":"0906","BranchName":"Degan"},{"OurBranchID":"0907","BranchName":"Salmeny"},{"OurBranchID":"0908","BranchName":"Sulula"},{"OurBranchID":"0909","BranchName":"Haik"},{"OurBranchID":"0910","BranchName":"Bistima"},{"OurBranchID":"0911","BranchName":"Wuchallie"},{"OurBranchID":"0912","BranchName":"Kutaber"},{"OurBranchID":"0913","BranchName":"Guguftu"},{"OurBranchID":"0914","BranchName":"Woreilu"},{"OurBranchID":"0915","BranchName":"Jamma"},{"OurBranchID":"0916","BranchName":"WeynAmba"},{"OurBranchID":"0917","BranchName":"Akesta"},{"OurBranchID":"0918","BranchName":"Genetie"},{"OurBranchID":"0919","BranchName":"Kelala"},{"OurBranchID":"0920","BranchName":"Liguama"},{"OurBranchID":"0921","BranchName":"Wegdie"},{"OurBranchID":"0922","BranchName":"Borena"},{"OurBranchID":"0923","BranchName":"Tewa"},{"OurBranchID":"0924","BranchName":"Sayent"},{"OurBranchID":"0925","BranchName":"Densa"},{"OurBranchID":"0926","BranchName":"Ajibar"},{"OurBranchID":"0927","BranchName":"Mekedela"},{"OurBranchID":"0928","BranchName":"Debre Zeyt"},{"OurBranchID":"0929","BranchName":"Buanbua Wuha"},{"OurBranchID":"0930","BranchName":"Gorenj"},{"OurBranchID":"0931","BranchName":"Ginba"},{"OurBranchID":"0932","BranchName":"Ewa"},{"OurBranchID":"0933","BranchName":"Bora"},{"OurBranchID":"0934","BranchName":"Medina"},{"OurBranchID":"0935","BranchName":"Tsehay-Mewcha"},{"OurBranchID":"0936","BranchName":"Tulu Lemi"},{"OurBranchID":"0937","BranchName":"Kabe"},{"OurBranchID":"0938","BranchName":"Keyafer"},{"OurBranchID":"0939","BranchName":"Bili"},{"OurBranchID":"0940","BranchName":"Wegel-Tena"},{"OurBranchID":"0941","BranchName":"Saint Ajibar"},{"OurBranchID":"0942","BranchName":"Shewaber"},{"OurBranchID":"0943","BranchName":"Worehimeno_Tenta"},{"OurBranchID":"0944","BranchName":"Degaga"},{"OurBranchID":"0945","BranchName":"Gashen"},{"OurBranchID":"0946","BranchName":"Bokekesa"},{"OurBranchID":"0947","BranchName":"Mareye"},{"OurBranchID":"0948","BranchName":"Dager"},{"OurBranchID":"0949","BranchName":"Mume Diguguru"},{"OurBranchID":"0950","BranchName":"Mumie"},{"OurBranchID":"0951","BranchName":"Segnogebeya"},{"OurBranchID":"0952","BranchName":"Kire"},{"OurBranchID":"0953","BranchName":"Dengelega"},{"OurBranchID":"0954","BranchName":"Gedeba"},{"OurBranchID":"0955","BranchName":"Adame"},{"OurBranchID":"0956","BranchName":"Makefta"},{"OurBranchID":"0957","BranchName":"Abyagurba"},{"OurBranchID":"0958","BranchName":"Fita"},{"OurBranchID":"0959","BranchName":"Faji"},{"OurBranchID":"0960","BranchName":"Alif"},{"OurBranchID":"0961","BranchName":"Asayita"},{"OurBranchID":"0962","BranchName":"Chisa"},{"OurBranchID":"0963","BranchName":"Logiya"},{"OurBranchID":"0964","BranchName":"Wortej"},{"OurBranchID":"0966","BranchName":"Degolo"},{"OurBranchID":"0967","BranchName":"Work Mawcha"},{"OurBranchID":"0968","BranchName":"Piassa"},{"OurBranchID":"1001","BranchName":"Kemise  District"},{"OurBranchID":"1002","BranchName":"Shonkie"},{"OurBranchID":"1003","BranchName":"Senbetie"},{"OurBranchID":"1004","BranchName":"Chefarobit"},{"OurBranchID":"1005","BranchName":"Weledy"},{"OurBranchID":"1006","BranchName":"Awsa Ber"},{"OurBranchID":"1007","BranchName":"Tuche"},{"OurBranchID":"1009","BranchName":"Chireti"},{"OurBranchID":"1010","BranchName":"Aela"},{"OurBranchID":"1012","BranchName":"Wareka"},{"OurBranchID":"1101","BranchName":"Debreberehan  District"},{"OurBranchID":"1102","BranchName":"Debre Eba"},{"OurBranchID":"1103","BranchName":"Chacha"},{"OurBranchID":"1104","BranchName":"Ankober"},{"OurBranchID":"1105","BranchName":"Keyet"},{"OurBranchID":"1106","BranchName":"Gen-Ager"},{"OurBranchID":"1107","BranchName":"Enewari"},{"OurBranchID":"1108","BranchName":"Deneba"},{"OurBranchID":"1109","BranchName":"Hagere-Mariam"},{"OurBranchID":"1110","BranchName":"Minjar"},{"OurBranchID":"1111","BranchName":"Shenkora"},{"OurBranchID":"1112","BranchName":"Meriha Betie"},{"OurBranchID":"1113","BranchName":"Mida"},{"OurBranchID":"1114","BranchName":"Metehbela"},{"OurBranchID":"1115","BranchName":"Majetie"},{"OurBranchID":"1116","BranchName":"Ataye"},{"OurBranchID":"1117","BranchName":"Shewarobit"},{"OurBranchID":"1118","BranchName":"Debre-Sina"},{"OurBranchID":"1119","BranchName":"Seladengay"},{"OurBranchID":"1120","BranchName":"Mezezo"},{"OurBranchID":"1121","BranchName":"Mama"},{"OurBranchID":"1122","BranchName":"Wegerie"},{"OurBranchID":"1123","BranchName":"Gera"},{"OurBranchID":"1124","BranchName":"Zemero"},{"OurBranchID":"1125","BranchName":"Gishe"},{"OurBranchID":"1126","BranchName":"Debrebirhan"},{"OurBranchID":"1127","BranchName":"Mekoy"},{"OurBranchID":"1128","BranchName":"Lemi"},{"OurBranchID":"1129","BranchName":"Reima"},{"OurBranchID":"1130","BranchName":"Tebasie"},{"OurBranchID":"1131","BranchName":"Jihur"},{"OurBranchID":"1132","BranchName":"Koremash"},{"OurBranchID":"1133","BranchName":"Fetra"},{"OurBranchID":"1134","BranchName":"Kotu"},{"OurBranchID":"1135","BranchName":"Sasit"},{"OurBranchID":"1136","BranchName":"Rassa"},{"OurBranchID":"1137","BranchName":"Aleyu-Amba"},{"OurBranchID":"1138","BranchName":"Bolo-Giorgis"},{"OurBranchID":"1139","BranchName":"Bergibi"},{"OurBranchID":"1140","BranchName":"Anchekorer"},{"OurBranchID":"1141","BranchName":"Meleya"},{"OurBranchID":"1142","BranchName":"Armenya"},{"OurBranchID":"1143","BranchName":"Gorefo"},{"OurBranchID":"1144","BranchName":"Behera"},{"OurBranchID":"1145","BranchName":"GosheBado"},{"OurBranchID":"1146","BranchName":"Merab Merkato"},{"OurBranchID":"1147","BranchName":"Atse Zerayakob"},{"OurBranchID":"1148","BranchName":"Ras Abebe Aregay"},{"OurBranchID":"1149","BranchName":"Tsehaysina"},{"OurBranchID":"1150","BranchName":"AsaGirt"},{"OurBranchID":"1151","BranchName":"Molale"},{"OurBranchID":"1152","BranchName":"Bulga Ber"},{"OurBranchID":"1153","BranchName":"Yelen"},{"OurBranchID":"1154","BranchName":"Bulega"},{"OurBranchID":"1155","BranchName":"HaileMariam Mamo"},{"OurBranchID":"1156","BranchName":"Balchi"},{"OurBranchID":"1157","BranchName":"Shewareged Gedlie"},{"OurBranchID":"1158","BranchName":"Nigus Sahle Selassie"},{"OurBranchID":"1159","BranchName":"Dr. Kebede Micheal"},{"OurBranchID":"1160","BranchName":"Sheno"},{"OurBranchID":"1161","BranchName":"Nigus Hailemelekot"},{"OurBranchID":"1201","BranchName":"Bahir Dar"},{"OurBranchID":"1301","BranchName":"Genda wuha"},{"OurBranchID":"1401","BranchName":"Feres Megalebia"},{"OurBranchID":"1501","BranchName":"Fasil"},{"OurBranchID":"1601","BranchName":"Tayitu"},{"OurBranchID":"1701","BranchName":"Enjibara"},{"OurBranchID":"1801","BranchName":"Niguse T/Haymanot"},{"OurBranchID":"1901","BranchName":"Adago"},{"OurBranchID":"2001","BranchName":"Dessie"},{"OurBranchID":"2101","BranchName":"Atse Minilik"},{"OurBranchID":"2201","BranchName":"Biraro"},{"OurBranchID":"2300","BranchName":"AddisAbeba District"},{"OurBranchID":"2301","BranchName":"Addis Ababa"},{"OurBranchID":"2302","BranchName":"EdnaMall"},{"OurBranchID":"2303","BranchName":"Ayat"},{"OurBranchID":"2304","BranchName":"WolloSefer"},{"OurBranchID":"2305","BranchName":"Legehar"},{"OurBranchID":"2306","BranchName":"AradaGiorgis"},{"OurBranchID":"2307","BranchName":"Balderas"},{"OurBranchID":"2308","BranchName":"HanaMariam"},{"OurBranchID":"2309","BranchName":"GofaGebriel"},{"OurBranchID":"2310","BranchName":"Adissu Gebya"},{"OurBranchID":"2311","BranchName":"BulbulaMariam"},{"OurBranchID":"2312","BranchName":"GejaSefer"},{"OurBranchID":"2313","BranchName":"Lebu"},{"OurBranchID":"2314","BranchName":"SholaGebeya"},{"OurBranchID":"2315","BranchName":"EhelBerenda"},{"OurBranchID":"2316","BranchName":"BulbulaMedhanialem"},{"OurBranchID":"2317","BranchName":"HayahuletGolagol"},{"OurBranchID":"2318","BranchName":"Bethel Sefer Eyor"},{"OurBranchID":"2319","BranchName":"Ayer Tena"},{"OurBranchID":"2320","BranchName":"Kaliti"},{"OurBranchID":"2321","BranchName":"Summit 72"},{"OurBranchID":"2322","BranchName":"Mehal Summit"},{"OurBranchID":"2323","BranchName":"Bulgariya Mazoriya"},{"OurBranchID":"2324","BranchName":"Arat killo"},{"OurBranchID":"2325","BranchName":"Hawassa"},{"OurBranchID":"2326","BranchName":"Shalla"},{"OurBranchID":"2327","BranchName":"Gerji"},{"OurBranchID":"2328","BranchName":"Kotebie"},{"OurBranchID":"2329","BranchName":"Tulu Dimtu"},{"OurBranchID":"2330","BranchName":"Gelan Condominium"},{"OurBranchID":"2331","BranchName":"Goro"},{"OurBranchID":"2332","BranchName":"Adama Boku Shenen"},{"OurBranchID":"2333","BranchName":"Hangatu"},{"OurBranchID":"2334","BranchName":"Wosen"},{"OurBranchID":"2335","BranchName":"Ayat 05"},{"OurBranchID":"2336","BranchName":"Gurd Shola"},{"OurBranchID":"2337","BranchName":"Bolie"},{"OurBranchID":"2338","BranchName":"Lebu mebrat"},{"OurBranchID":"2339","BranchName":"Sebara babur"},{"OurBranchID":"2340","BranchName":"Bole 24"},{"OurBranchID":"2341","BranchName":"Bishoftu"},{"OurBranchID":"2342","BranchName":"Lafto"},{"OurBranchID":"2343","BranchName":"Meri Loqe"},{"OurBranchID":"2344","BranchName":"Yeka Abado"},{"OurBranchID":"2345","BranchName":"Saris"},{"OurBranchID":"2346","BranchName":"Beklo Bet"},{"OurBranchID":"2347","BranchName":"Semmit Atlet Mender"},{"OurBranchID":"2348","BranchName":"Africa Godana"},{"OurBranchID":"2349","BranchName":"Teppi"},{"OurBranchID":"2350","BranchName":"Dire Dawa"},{"OurBranchID":"2351","BranchName":"Haile Garment"},{"OurBranchID":"2352","BranchName":"Mehal Lafto"},{"OurBranchID":"2353","BranchName":"Saris Addis Sefer"},{"OurBranchID":"2354","BranchName":"Kotebe College"},{"OurBranchID":"2355","BranchName":"Bihere Tsigie"},{"OurBranchID":"2356","BranchName":"Akaki Alem Bank"},{"OurBranchID":"2357","BranchName":"Figa"},{"OurBranchID":"2358","BranchName":"Kara"},{"OurBranchID":"2359","BranchName":"Arba Minch"},{"OurBranchID":"2360","BranchName":"Hossana"},{"OurBranchID":"2361","BranchName":"Legetafo"},{"OurBranchID":"2362","BranchName":"Sebeta"},{"OurBranchID":"2363","BranchName":"Shashemene"},{"OurBranchID":"2364","BranchName":"Wolayta Sodo"},{"OurBranchID":"2365","BranchName":"Dilla"},{"OurBranchID":"2366","BranchName":"Tabor"},{"OurBranchID":"2367","BranchName":"Yirga Cheffe"},{"OurBranchID":"2368","BranchName":"Bisrate Gebriel"},{"OurBranchID":"2369","BranchName":"Jemo Michael"},{"OurBranchID":"2370","BranchName":"Mikililand"},{"OurBranchID":"2371","BranchName":"Moenco"},{"OurBranchID":"2372","BranchName":"Semien Mazegaja"},{"OurBranchID":"2373","BranchName":"Saris Abo"},{"OurBranchID":"2374","BranchName":"Sululta"},{"OurBranchID":"2375","BranchName":"Bonga"},{"OurBranchID":"2376","BranchName":"Jimma"},{"OurBranchID":"2377","BranchName":"Gerji Roba"},{"OurBranchID":"2378","BranchName":"Gambela"},{"OurBranchID":"2379","BranchName":"Mizan Aman"},{"OurBranchID":"2380","BranchName":"Dimma Akobo"},{"OurBranchID":"2381","BranchName":"Merkato Satin Tera"},{"OurBranchID":"2382","BranchName":"Garment Sefera"},{"OurBranchID":"2383","BranchName":"Lam Beret"},{"OurBranchID":"2384","BranchName":"Goro Sefera"},{"OurBranchID":"2385","BranchName":"Megenagna Square"},{"OurBranchID":"2386","BranchName":"Gojjam Berenda"},{"OurBranchID":"2387","BranchName":"Butajira"},{"OurBranchID":"2388","BranchName":"Bole Arabsa"},{"OurBranchID":"2389","BranchName":"Sidamo Tera"},{"OurBranchID":"2390","BranchName":"Jigjiga"},{"OurBranchID":"2401","BranchName":"Hormat"},{"OurBranchID":"2501","BranchName":"Yifat"},{"OurBranchID":"2601","BranchName":"Sebatu Warka"},{"OurBranchID":"2701","BranchName":"Damot"},{"OurBranchID":"2801","BranchName":"Burie Damot"},{"OurBranchID":"2901","BranchName":"Chagni"},{"OurBranchID":"3001","BranchName":"Danegila"},{"OurBranchID":"3101","BranchName":"Woreta"},{"OurBranchID":"3301","BranchName":"Debre Roha"},{"OurBranchID":"3401","BranchName":"Kemissie"},{"OurBranchID":"3501","BranchName":"Batti"},{"OurBranchID":"3601","BranchName":"Yilmana Densa"},{"OurBranchID":"3701","BranchName":"Qoga"},{"OurBranchID":"3801","BranchName":"Dejazmach H/Eyesus Filatie"},{"OurBranchID":"3901","BranchName":"Gojjam Ber"},{"OurBranchID":"4001","BranchName":"Belay Zeleke"},{"OurBranchID":"4101","BranchName":"Aleme Ketema"},{"OurBranchID":"4201","BranchName":"Mehal Meda"},{"OurBranchID":"4301","BranchName":"Efeson"},{"OurBranchID":"4401","BranchName":"Lego Haik"},{"OurBranchID":"4501","BranchName":"Mekaneselam"},{"OurBranchID":"4601","BranchName":"Abageteye"},{"OurBranchID":"4701","BranchName":"Addiszemen"},{"OurBranchID":"4801","BranchName":"Ras Gayint"},{"OurBranchID":"4901","BranchName":"Mekaneyesus"},{"OurBranchID":"5001","BranchName":"Aykel"},{"OurBranchID":"5101","BranchName":"Arerti"},{"OurBranchID":"5201","BranchName":"Meket"},{"OurBranchID":"5301","BranchName":"Tana"},{"OurBranchID":"5401","BranchName":"Azezo"},{"OurBranchID":"5501","BranchName":"Tossa"},{"OurBranchID":"5502","BranchName":"Woizero Siheen"},{"OurBranchID":"5601","BranchName":"Gonder Ber"},{"OurBranchID":"6701","BranchName":"Bahir Dar  District"},{"OurBranchID":"6702","BranchName":"Sefen-Selam"},{"OurBranchID":"6703","BranchName":"Dagemawi Menelik"},{"OurBranchID":"6704","BranchName":"Finote"},{"OurBranchID":"6705","BranchName":"Gordema"},{"OurBranchID":"6706","BranchName":"Dengel"},{"OurBranchID":"6707","BranchName":"Zenzelma"},{"OurBranchID":"6708","BranchName":"Lideta"},{"OurBranchID":"6709","BranchName":"Abay Dar"},{"OurBranchID":"6710","BranchName":"Selam Ber"},{"OurBranchID":"6711","BranchName":"Abay Ena Tana"},{"OurBranchID":"6801","BranchName":"Gendeuha District"},{"OurBranchID":"6802","BranchName":"Dansha"},{"OurBranchID":"6803","BranchName":"Wef Argif"},{"OurBranchID":"6804","BranchName":"Dubaba"},{"OurBranchID":"6805","BranchName":"Humera"},{"OurBranchID":"6806","BranchName":"Maksegno Gebeya"}];

  async function showBranchSearchModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('branchSearchModal');
    if (existingModal) existingModal.remove();
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'branchSearchModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '10000';
    
    // Create modal content
    const content = document.createElement('div');
    content.style.background = 'white';
    content.style.borderRadius = '8px';
    content.style.width = '600px';
    content.style.maxHeight = '80vh';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    
    // Modal header with controls
    const header = document.createElement('div');
    header.style.background = '#517a8e';
    header.style.color = 'white';
    header.style.padding = '12px 20px';
    header.style.borderRadius = '8px 8px 0 0';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    const headerTitle = document.createElement('h3');
    headerTitle.textContent = 'Branch Search';
    headerTitle.style.margin = '0';
    headerTitle.style.fontSize = '15px';
    headerTitle.style.fontWeight = '600';
    
    const headerButtons = document.createElement('div');
    headerButtons.style.display = 'flex';
    headerButtons.style.gap = '8px';
    
    let isMinimized = false;
    let isMaximized = false;
    
    const minimizeBtn = document.createElement('button');
    minimizeBtn.innerHTML = '−';
    minimizeBtn.style.background = 'rgba(255,255,255,0.1)';
    minimizeBtn.style.border = 'none';
    minimizeBtn.style.color = 'white';
    minimizeBtn.style.width = '32px';
    minimizeBtn.style.height = '32px';
    minimizeBtn.style.borderRadius = '4px';
    minimizeBtn.style.cursor = 'pointer';
    minimizeBtn.style.fontSize = '20px';
    minimizeBtn.onclick = function() {
      isMinimized = !isMinimized;
      body.style.display = isMinimized ? 'none' : 'block';
    };
    
    const maximizeBtn = document.createElement('button');
    maximizeBtn.innerHTML = '□';
    maximizeBtn.style.background = 'rgba(255,255,255,0.1)';
    maximizeBtn.style.border = 'none';
    maximizeBtn.style.color = 'white';
    maximizeBtn.style.width = '32px';
    maximizeBtn.style.height = '32px';
    maximizeBtn.style.borderRadius = '4px';
    maximizeBtn.style.cursor = 'pointer';
    maximizeBtn.style.fontSize = '20px';
    maximizeBtn.onclick = function() {
      if (!isMaximized) {
        content.style.width = '95vw';
        content.style.maxHeight = '95vh';
        isMaximized = true;
      } else {
        content.style.width = '600px';
        content.style.maxHeight = '80vh';
        isMaximized = false;
      }
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.background = 'rgba(255,255,255,0.1)';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.width = '32px';
    closeBtn.style.height = '32px';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '24px';
    closeBtn.onclick = function() { modal.remove(); };
    
    headerButtons.appendChild(minimizeBtn);
    headerButtons.appendChild(maximizeBtn);
    headerButtons.appendChild(closeBtn);
    header.appendChild(headerTitle);
    header.appendChild(headerButtons);
    content.appendChild(header);
    
    // Modal body
    const body = document.createElement('div');
    body.style.padding = '24px';
    body.style.overflowY = 'auto';
    body.style.flex = '1';
    
    // Filter row
    const filterRow = document.createElement('div');
    filterRow.style.display = 'flex';
    filterRow.style.gap = '8px';
    filterRow.style.marginBottom = '16px';
    filterRow.style.alignItems = 'center';
    
    const idLabel = document.createElement('label');
    idLabel.textContent = 'Branch ID';
    idLabel.style.fontSize = '12px';
    idLabel.style.fontWeight = '500';
    
    const idType = document.createElement('select');
    idType.id = 'branchSearchIdType';
    idType.innerHTML = '<option value="like">Like</option><option value="equals">Equals</option>';
    idType.style.height = '32px';
    idType.style.fontSize = '12px';
    idType.style.borderRadius = '4px';
    idType.style.border = '1px solid #d1d5db';
    
    const idInput = document.createElement('input');
    idInput.id = 'branchSearchId';
    idInput.type = 'text';
    idInput.style.width = '140px';
    idInput.style.height = '32px';
    idInput.style.fontSize = '12px';
    idInput.style.padding = '6px 10px';
    idInput.style.borderRadius = '4px';
    idInput.style.border = '1px solid #d1d5db';
    
    const nameLabel = document.createElement('label');
    nameLabel.textContent = 'Branch Name';
    nameLabel.style.fontSize = '12px';
    nameLabel.style.fontWeight = '500';
    nameLabel.style.marginLeft = '16px';
    
    const nameType = document.createElement('select');
    nameType.id = 'branchSearchNameType';
    nameType.innerHTML = '<option value="like">Like</option><option value="equals">Equals</option>';
    nameType.style.height = '32px';
    nameType.style.fontSize = '12px';
    nameType.style.borderRadius = '4px';
    nameType.style.border = '1px solid #d1d5db';
    
    const nameInput = document.createElement('input');
    nameInput.id = 'branchSearchName';
    nameInput.type = 'text';
    nameInput.style.width = '140px';
    nameInput.style.height = '32px';
    nameInput.style.fontSize = '12px';
    nameInput.style.padding = '6px 10px';
    nameInput.style.borderRadius = '4px';
    nameInput.style.border = '1px solid #d1d5db';
    
    const searchBtn = document.createElement('button');
    searchBtn.textContent = 'Search';
    searchBtn.style.marginLeft = '16px';
    searchBtn.style.height = '32px';
    searchBtn.style.padding = '0 16px';
    searchBtn.style.fontSize = '12px';
    searchBtn.style.fontWeight = '500';
    searchBtn.style.background = '#517a8e';
    searchBtn.style.color = 'white';
    searchBtn.style.border = 'none';
    searchBtn.style.borderRadius = '4px';
    searchBtn.style.cursor = 'pointer';
    
    filterRow.appendChild(idLabel);
    filterRow.appendChild(idType);
    filterRow.appendChild(idInput);
    filterRow.appendChild(nameLabel);
    filterRow.appendChild(nameType);
    filterRow.appendChild(nameInput);
    filterRow.appendChild(searchBtn);
    body.appendChild(filterRow);
    
    // Results header
    const resultsHeader = document.createElement('div');
    resultsHeader.textContent = 'Search Results';
    resultsHeader.style.fontSize = '13px';
    resultsHeader.style.fontWeight = '600';
    resultsHeader.style.margin = '16px 0 8px 0';
    resultsHeader.style.paddingBottom = '8px';
    resultsHeader.style.borderBottom = '2px solid #f9b233';
    body.appendChild(resultsHeader);
    
    // Results table
    const table = document.createElement('table');
    table.id = 'branchSearchTable';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';
    table.innerHTML = `
      <thead>
        <tr style="background:#517a8e;color:#fff;">
          <th style="padding: 8px 12px; text-align: left;">Branch ID</th>
          <th style="padding: 8px 12px; text-align: left;">Branch Name</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    body.appendChild(table);
    
    // Navigation row
    const navRow = document.createElement('div');
    navRow.style.display = 'flex';
    navRow.style.justifyContent = 'center';
    navRow.style.gap = '16px';
    navRow.style.marginTop = '16px';
    
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.height = '32px';
    okBtn.style.padding = '0 24px';
    okBtn.style.fontSize = '12px';
    okBtn.style.fontWeight = '500';
    okBtn.style.background = '#22c55e';
    okBtn.style.color = 'white';
    okBtn.style.border = 'none';
    okBtn.style.borderRadius = '4px';
    okBtn.style.cursor = 'pointer';
    okBtn.onclick = function() {
      const selectedRow = table.querySelector('tbody tr.table-active');
      if (selectedRow) {
        const branchId = selectedRow.cells[0].textContent;
        const branchName = selectedRow.cells[1].textContent;
        document.getElementById('branchId').value = branchId;
        document.getElementById('branchName').value = branchName;
        modal.remove();
      } else {
        toast('Please select a branch', 'warning');
      }
    };
    
    navRow.appendChild(okBtn);
    body.appendChild(navRow);
    
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Load branches and setup interactions
    renderBranchTable(allBranches);
    
    // Search button handler
    searchBtn.onclick = handleBranchSearch;
    
    // Close on outside click
    modal.onclick = function(e) {
      if (e.target === modal) modal.remove();
    };
  }

  async function fetchAndDisplayBranches() {
    const tableBody = document.querySelector('#branchSearchTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="2" class="text-muted">Loading...</td></tr>';

    // Ensure service is loaded
    if (!window.GeneralLedgerService) {
      if (typeof initServices === 'function') await initServices();
    }
    const svc = window.GeneralLedgerService;
    if (!svc) {
      tableBody.innerHTML = '<tr><td colspan="2" class="text-danger">Service not available</td></tr>';
      return;
    }
    try {
      const result = await svc.getSearchResult({
        TableID: 'OurBranchID',
        AdvFilterString: "OurBankID = '00'",
        WhereStmt: '',
        PrevOrNext: 0,
        RefID: '',
        OperatorID: sessionData.OperatorID,
        ModuleID: 8100,
        OurBranchID: sessionData.OurBranchID,
        SearchKey: '',
        LanguageID: 'en'
      });
      if (result.success && result.data && result.data.Details && Array.isArray(result.data.Details)) {
        allBranches = result.data.Details;
        renderBranchTable(allBranches);
      } else {
        tableBody.innerHTML = `<tr><td colspan="2" class="text-danger">${result.message || 'Failed to load branches'}</td></tr>`;
      }
    } catch (err) {
      tableBody.innerHTML = `<tr><td colspan="2" class="text-danger">${err.message || err}</td></tr>`;
    }
  }

  function renderBranchTable(data) {
    const tableBody = document.querySelector('#branchSearchTable tbody');
    if (!tableBody) return;
    if (!data || data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="2" class="text-muted">No branches found.</td></tr>';
      return;
    }
    tableBody.innerHTML = data.map((branch, idx) =>
      `<tr data-branch-id="${branch.OurBranchID}" data-branch-name="${branch.BranchName}" tabindex="0" role="row" aria-selected="false" style="cursor:pointer;outline:none;">
        <td>${branch.OurBranchID || ''}</td>
        <td>${branch.BranchName || ''}</td>
      </tr>`
    ).join('');

    // Row selection logic (always re-attach after render)
    let selectedRow = null;
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
      row.addEventListener('click', function(e) {
        e.stopPropagation();
        rows.forEach(r => { 
          r.classList.remove('table-active'); 
          r.setAttribute('aria-selected', 'false');
          r.style.background = '';
        });
        selectedRow = this;
        selectedRow.classList.add('table-active');
        selectedRow.setAttribute('aria-selected', 'true');
        selectedRow.style.background = '#e0e7ff';
        selectedRow.focus();
        window._branchModalSelectedRow = selectedRow;
      });
      row.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        selectBranchFromRow(this);
      });
      row.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectBranchFromRow(this);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = this.nextElementSibling;
          if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = this.previousElementSibling;
          if (prev) prev.focus();
        }
      });
    });
    // Reset selected row global on new render
    window._branchModalSelectedRow = null;
    // Focus first row for accessibility
    if (rows.length > 0) rows[0].focus();
    // Ensure modal close button works
    const closeBtn = document.querySelector('#branchSearchModal .btn-close');
    if (closeBtn) {
      closeBtn.onclick = function() {
        const modalEl = document.getElementById('branchSearchModal');
        if (modalEl && window.bootstrap) {
          const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
      };
    }
    // Ensure OK button only works if a row is selected
    const okBtn = document.getElementById('branchOkBtn');
    if (okBtn) {
      okBtn.onclick = function() {
        const row = window._branchModalSelectedRow || document.querySelector('#branchSearchTable tbody tr.table-active');
        if (row) {
          selectBranchFromRow(row);
        } else {
          toast('Please select a branch from the list', 'warning');
        }
      };
    }
  }

  // Set branch in main form and close modal
  function selectBranchFromRow(row) {
    if (!row) return;
    const branchId = row.getAttribute('data-branch-id');
    const branchName = row.getAttribute('data-branch-name');
    
    log('Selected branch: ' + branchId + ' - ' + branchName);
    
    // Set value in main form
    const branchIdInput = document.getElementById('branchId');
    const branchNameInput = document.getElementById('branchName');
    if (branchIdInput) branchIdInput.value = branchId;
    if (branchNameInput) branchNameInput.value = branchName;
    
    // Close modal by removing it
    const modalEl = document.getElementById('branchSearchModal');
    if (modalEl) {
      modalEl.remove();
    }
  }

  // Search/filter logic for branch modal
  async function handleBranchSearch() {
    const idInput = document.getElementById('branchSearchId');
    const idType = document.getElementById('branchSearchIdType');
    const nameInput = document.getElementById('branchSearchName');
    const nameType = document.getElementById('branchSearchNameType');
    
    if (!idInput || !idType || !nameInput || !nameType) return;
    
    const idVal = idInput.value.trim().toUpperCase();
    const idTypeVal = idType.value;
    const nameVal = nameInput.value.trim().toUpperCase();
    const nameTypeVal = nameType.value;
    
    let filtered = allBranches;
    if (idVal) {
      filtered = filtered.filter(branch =>
        idTypeVal === 'like' ? (branch.OurBranchID || '').toUpperCase().includes(idVal) : (branch.OurBranchID || '').toUpperCase() === idVal
      );
    }
    if (nameVal) {
      filtered = filtered.filter(branch =>
        nameTypeVal === 'like' ? (branch.BranchName || '').toUpperCase().includes(nameVal) : (branch.BranchName || '').toUpperCase() === nameVal
      );
    }
    renderBranchTable(filtered);
  }

  // --- Currency Search Modal Wiring ---
  // --- Currency Modal Search/Filter Logic ---
  let allCurrencies = [];

  async function showCurrencySearchModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('currencySearchModal');
    if (existingModal) existingModal.remove();
    
    // Create modal overlay
    const modal = document.createElement('div');
    modal.id = 'currencySearchModal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.background = 'rgba(0,0,0,0.5)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '10000';
    
    // Create modal content
    const content = document.createElement('div');
    content.style.background = 'white';
    content.style.borderRadius = '8px';
    content.style.width = '600px';
    content.style.maxHeight = '80vh';
    content.style.display = 'flex';
    content.style.flexDirection = 'column';
    content.style.boxShadow = '0 4px 6px rgba(0,0,0,0.1)';
    
    // Modal header with controls
    const header = document.createElement('div');
    header.style.background = '#517a8e';
    header.style.color = 'white';
    header.style.padding = '12px 20px';
    header.style.borderRadius = '8px 8px 0 0';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    
    const headerTitle = document.createElement('h3');
    headerTitle.textContent = 'Currency Search';
    headerTitle.style.margin = '0';
    headerTitle.style.fontSize = '15px';
    headerTitle.style.fontWeight = '600';
    
    const headerButtons = document.createElement('div');
    headerButtons.style.display = 'flex';
    headerButtons.style.gap = '8px';
    
    let isMinimized = false;
    let isMaximized = false;
    
    const minimizeBtn = document.createElement('button');
    minimizeBtn.innerHTML = '−';
    minimizeBtn.style.background = 'rgba(255,255,255,0.1)';
    minimizeBtn.style.border = 'none';
    minimizeBtn.style.color = 'white';
    minimizeBtn.style.width = '32px';
    minimizeBtn.style.height = '32px';
    minimizeBtn.style.borderRadius = '4px';
    minimizeBtn.style.cursor = 'pointer';
    minimizeBtn.style.fontSize = '20px';
    minimizeBtn.onclick = function() {
      isMinimized = !isMinimized;
      body.style.display = isMinimized ? 'none' : 'block';
    };
    
    const maximizeBtn = document.createElement('button');
    maximizeBtn.innerHTML = '□';
    maximizeBtn.style.background = 'rgba(255,255,255,0.1)';
    maximizeBtn.style.border = 'none';
    maximizeBtn.style.color = 'white';
    maximizeBtn.style.width = '32px';
    maximizeBtn.style.height = '32px';
    maximizeBtn.style.borderRadius = '4px';
    maximizeBtn.style.cursor = 'pointer';
    maximizeBtn.style.fontSize = '20px';
    maximizeBtn.onclick = function() {
      if (!isMaximized) {
        content.style.width = '95vw';
        content.style.maxHeight = '95vh';
        isMaximized = true;
      } else {
        content.style.width = '600px';
        content.style.maxHeight = '80vh';
        isMaximized = false;
      }
    };
    
    const closeBtn = document.createElement('button');
    closeBtn.innerHTML = '×';
    closeBtn.style.background = 'rgba(255,255,255,0.1)';
    closeBtn.style.border = 'none';
    closeBtn.style.color = 'white';
    closeBtn.style.width = '32px';
    closeBtn.style.height = '32px';
    closeBtn.style.borderRadius = '4px';
    closeBtn.style.cursor = 'pointer';
    closeBtn.style.fontSize = '24px';
    closeBtn.onclick = function() { modal.remove(); };
    
    headerButtons.appendChild(minimizeBtn);
    headerButtons.appendChild(maximizeBtn);
    headerButtons.appendChild(closeBtn);
    header.appendChild(headerTitle);
    header.appendChild(headerButtons);
    content.appendChild(header);
    
    // Modal body
    const body = document.createElement('div');
    body.style.padding = '24px';
    body.style.overflowY = 'auto';
    body.style.flex = '1';
    
    // Filter row
    const filterRow = document.createElement('div');
    filterRow.style.display = 'flex';
    filterRow.style.gap = '8px';
    filterRow.style.marginBottom = '16px';
    filterRow.style.alignItems = 'center';
    
    const idLabel = document.createElement('label');
    idLabel.textContent = 'Currency ID';
    idLabel.style.fontSize = '12px';
    idLabel.style.fontWeight = '500';
    
    const idType = document.createElement('select');
    idType.id = 'currencySearchIdType';
    idType.innerHTML = '<option value="like">Like</option><option value="equals">Equals</option>';
    idType.style.height = '32px';
    idType.style.fontSize = '12px';
    idType.style.borderRadius = '4px';
    idType.style.border = '1px solid #d1d5db';
    
    const idInput = document.createElement('input');
    idInput.id = 'currencySearchId';
    idInput.type = 'text';
    idInput.style.width = '140px';
    idInput.style.height = '32px';
    idInput.style.fontSize = '12px';
    idInput.style.padding = '6px 10px';
    idInput.style.borderRadius = '4px';
    idInput.style.border = '1px solid #d1d5db';
    
    const descLabel = document.createElement('label');
    descLabel.textContent = 'Description';
    descLabel.style.fontSize = '12px';
    descLabel.style.fontWeight = '500';
    descLabel.style.marginLeft = '16px';
    
    const descType = document.createElement('select');
    descType.id = 'currencySearchDescType';
    descType.innerHTML = '<option value="like">Like</option><option value="equals">Equals</option>';
    descType.style.height = '32px';
    descType.style.fontSize = '12px';
    descType.style.borderRadius = '4px';
    descType.style.border = '1px solid #d1d5db';
    
    const descInput = document.createElement('input');
    descInput.id = 'currencySearchDesc';
    descInput.type = 'text';
    descInput.style.width = '140px';
    descInput.style.height = '32px';
    descInput.style.fontSize = '12px';
    descInput.style.padding = '6px 10px';
    descInput.style.borderRadius = '4px';
    descInput.style.border = '1px solid #d1d5db';
    
    const searchBtn = document.createElement('button');
    searchBtn.textContent = 'Search';
    searchBtn.style.marginLeft = '16px';
    searchBtn.style.height = '32px';
    searchBtn.style.padding = '0 16px';
    searchBtn.style.fontSize = '12px';
    searchBtn.style.fontWeight = '500';
    searchBtn.style.background = '#517a8e';
    searchBtn.style.color = 'white';
    searchBtn.style.border = 'none';
    searchBtn.style.borderRadius = '4px';
    searchBtn.style.cursor = 'pointer';
    
    filterRow.appendChild(idLabel);
    filterRow.appendChild(idType);
    filterRow.appendChild(idInput);
    filterRow.appendChild(descLabel);
    filterRow.appendChild(descType);
    filterRow.appendChild(descInput);
    filterRow.appendChild(searchBtn);
    body.appendChild(filterRow);
    
    // Results header
    const resultsHeader = document.createElement('div');
    resultsHeader.textContent = 'Search Results';
    resultsHeader.style.fontSize = '13px';
    resultsHeader.style.fontWeight = '600';
    resultsHeader.style.margin = '16px 0 8px 0';
    resultsHeader.style.paddingBottom = '8px';
    resultsHeader.style.borderBottom = '2px solid #f9b233';
    body.appendChild(resultsHeader);
    
    // Results table
    const table = document.createElement('table');
    table.id = 'currencySearchTable';
    table.style.width = '100%';
    table.style.borderCollapse = 'collapse';
    table.style.fontSize = '12px';
    table.innerHTML = `
      <thead>
        <tr style="background:#517a8e;color:#fff;">
          <th style="padding: 8px 12px; text-align: left;">Currency ID</th>
          <th style="padding: 8px 12px; text-align: left;">Description</th>
        </tr>
      </thead>
      <tbody></tbody>
    `;
    body.appendChild(table);
    
    // Navigation row
    const navRow = document.createElement('div');
    navRow.style.display = 'flex';
    navRow.style.justifyContent = 'center';
    navRow.style.gap = '16px';
    navRow.style.marginTop = '16px';
    
    const okBtn = document.createElement('button');
    okBtn.textContent = 'OK';
    okBtn.style.height = '32px';
    okBtn.style.padding = '0 24px';
    okBtn.style.fontSize = '12px';
    okBtn.style.fontWeight = '500';
    okBtn.style.background = '#22c55e';
    okBtn.style.color = 'white';
    okBtn.style.border = 'none';
    okBtn.style.borderRadius = '4px';
    okBtn.style.cursor = 'pointer';
    okBtn.onclick = function() {
      const selectedRow = table.querySelector('tbody tr.table-active');
      if (selectedRow) {
        const currencyId = selectedRow.cells[0].textContent;
        document.getElementById('currencyId').value = currencyId;
        modal.remove();
      } else {
        toast('Please select a currency', 'warning');
      }
    };
    
    navRow.appendChild(okBtn);
    body.appendChild(navRow);
    
    content.appendChild(body);
    modal.appendChild(content);
    document.body.appendChild(modal);
    
    // Load currencies and setup interactions
    await fetchAndDisplayCurrencies();
    
    // Search button handler
    searchBtn.onclick = handleCurrencySearch;
    
    // Close on outside click
    modal.onclick = function(e) {
      if (e.target === modal) modal.remove();
    };
  }

  async function fetchAndDisplayCurrencies() {
    const tableBody = document.querySelector('#currencySearchTable tbody');
    if (!tableBody) return;
    tableBody.innerHTML = '<tr><td colspan="2" class="text-muted">Loading...</td></tr>';

    // Use mock currency data
    const mockCurrencies = [
      { "CurrencyID": "AED", "Description": "UAE DIRHAM" },
      { "CurrencyID": "AUD", "Description": "AUSTRALIAN DOLLAR" },
      { "CurrencyID": "CAD", "Description": "CANADIAN DOLLAR" },
      { "CurrencyID": "CHF", "Description": "SWISS FRANC" },
      { "CurrencyID": "CNY", "Description": "CHINESE YUAN" },
      { "CurrencyID": "DJF", "Description": "DJIBOUTI FRANC" },
      { "CurrencyID": "DKK", "Description": "DANISH KRONER" },
      { "CurrencyID": "ETB", "Description": "BIRR" },
      { "CurrencyID": "EUR", "Description": "EURO" },
      { "CurrencyID": "GBP", "Description": "POUND STERLING" },
      { "CurrencyID": "INR", "Description": "INDIAN RUPEE" },
      { "CurrencyID": "JPY", "Description": "JAPANESE YEN" },
      { "CurrencyID": "KES", "Description": "KENYA SHILLING" },
      { "CurrencyID": "KWD", "Description": "KUWAITI DINAR" },
      { "CurrencyID": "NOK", "Description": "NORWIGIAN KRONER" },
      { "CurrencyID": "SAR", "Description": "SAUDI RIYAL" },
      { "CurrencyID": "SDR", "Description": "SDR" },
      { "CurrencyID": "SEK", "Description": "SWDISH KRONER" },
      { "CurrencyID": "USD", "Description": "USD DOLLAR" },
      { "CurrencyID": "ZAR", "Description": "SOUTH AFRICA RAND" }
    ];

    allCurrencies = mockCurrencies;
    renderCurrencyTable(allCurrencies);
  }

  function renderCurrencyTable(data) {
    const tableBody = document.querySelector('#currencySearchTable tbody');
    if (!tableBody) return;
    if (!data || data.length === 0) {
      tableBody.innerHTML = '<tr><td colspan="2" class="text-muted">No currencies found.</td></tr>';
      return;
    }
    tableBody.innerHTML = data.map((cur, idx) =>
      `<tr data-currency-id="${cur.CurrencyID}" data-currency-name="${cur.Description}" tabindex="0" role="row" aria-selected="false" style="cursor:pointer;outline:none;">
        <td>${cur.CurrencyID || ''}</td>
        <td>${cur.Description || ''}</td>
      </tr>`
    ).join('');

    // Row selection logic (always re-attach after render)
    let selectedRow = null;
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
      row.addEventListener('click', function(e) {
        e.stopPropagation();
        rows.forEach(r => { 
          r.classList.remove('table-active'); 
          r.setAttribute('aria-selected', 'false');
          r.style.background = '';
        });
        selectedRow = this;
        selectedRow.classList.add('table-active');
        selectedRow.setAttribute('aria-selected', 'true');
        selectedRow.style.background = '#e0e7ff';
        selectedRow.focus();
        window._currencyModalSelectedRow = selectedRow;
      });
      row.addEventListener('dblclick', function(e) {
        e.stopPropagation();
        selectCurrencyFromRow(this);
      });
      row.addEventListener('keydown', function(e) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          selectCurrencyFromRow(this);
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          const next = this.nextElementSibling;
          if (next) next.focus();
        } else if (e.key === 'ArrowUp') {
          e.preventDefault();
          const prev = this.previousElementSibling;
          if (prev) prev.focus();
        }
      });
    });
    // Reset selected row global on new render
    window._currencyModalSelectedRow = null;
    // Focus first row for accessibility
    if (rows.length > 0) rows[0].focus();
    // Ensure modal close button works
    const closeBtn = document.querySelector('#currencySearchModal .btn-close');
    if (closeBtn) {
      closeBtn.onclick = function() {
        const modalEl = document.getElementById('currencySearchModal');
        if (modalEl && window.bootstrap) {
          const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
      };
    }
    // Ensure OK button only works if a row is selected
    const okBtn = document.getElementById('currencyOkBtn');
    if (okBtn) {
      okBtn.onclick = function() {
        const row = window._currencyModalSelectedRow || document.querySelector('#currencySearchTable tbody tr.table-active');
        if (row) {
          selectCurrencyFromRow(row);
        } else {
          toast('Please select a currency from the list', 'warning');
        }
      };
    }
  }

  // Set currency in main form and close modal
  function selectCurrencyFromRow(row) {
    if (!row) return;
    const currencyId = row.getAttribute('data-currency-id');
    const currencyName = row.getAttribute('data-currency-name');
    
    log('Selected currency: ' + currencyId + ' - ' + currencyName);
    
    // Set value in main form
    const currencyInput = document.getElementById('currencyId');
    if (currencyInput) currencyInput.value = currencyId;
    
    // Close modal by removing it
    const modalEl = document.getElementById('currencySearchModal');
    if (modalEl) {
      modalEl.remove();
    }
  }

  // OK and X button events
  document.addEventListener('DOMContentLoaded', function() {
    const okBtn = document.getElementById('currencyOkBtn');
    if (okBtn) {
      okBtn.addEventListener('click', function() {
        const row = window._currencyModalSelectedRow || document.querySelector('#currencySearchTable tbody tr.table-active');
        if (row) {
          selectCurrencyFromRow(row);
        } else {
          toast('Please select a currency from the list', 'warning');
        }
      });
    }
    // X (close) button
    const closeBtn = document.querySelector('#currencySearchModal .btn-close');
    if (closeBtn) {
      closeBtn.addEventListener('click', function() {
        const modalEl = document.getElementById('currencySearchModal');
        if (modalEl && window.bootstrap) {
          const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
      });
    }
    // Also allow double-click to select
    // (already handled in renderCurrencyTable)
  });

  // Search/filter logic for modal
  async function handleCurrencySearch() {
    const idInput = document.getElementById('currencySearchId');
    const idType = document.getElementById('currencySearchIdType');
    const descInput = document.getElementById('currencySearchDesc');
    const descType = document.getElementById('currencySearchDescType');
    
    if (!idInput || !idType || !descInput || !descType) return;
    
    const idVal = idInput.value.trim().toUpperCase();
    const idTypeVal = idType.value;
    const descVal = descInput.value.trim().toUpperCase();
    const descTypeVal = descType.value;
    
    let filtered = allCurrencies;
    if (idVal) {
      filtered = filtered.filter(cur =>
        idTypeVal === 'like' ? (cur.CurrencyID || '').toUpperCase().includes(idVal) : (cur.CurrencyID || '').toUpperCase() === idVal
      );
    }
    if (descVal) {
      filtered = filtered.filter(cur =>
        descTypeVal === 'like' ? (cur.Description || '').toUpperCase().includes(descVal) : (cur.Description || '').toUpperCase() === descVal
      );
    }
    renderCurrencyTable(filtered);
  }

  // Attach search button event for modal
  document.addEventListener('DOMContentLoaded', function() {
    const searchBtn = document.getElementById('currencySearchBtn');
    if (searchBtn) {
      searchBtn.addEventListener('click', handleCurrencySearch);
    }
    // Also allow Enter key in search fields
    ['currencySearchId', 'currencySearchDesc'].forEach(fid => {
      const el = document.getElementById(fid);
      if (el) {
        el.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleCurrencySearch();
          }
        });
      }
    });
    
    // Add cleanup listener for modal hidden event
    const modalEl = document.getElementById('currencySearchModal');
    if (modalEl) {
      modalEl.addEventListener('hidden.bs.modal', function() {
        // Clean up any lingering backdrops
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        log('Modal cleaned up');
      });
    }
  });

  // Attach event to currency, branch, and account search buttons (by class)
  document.addEventListener('DOMContentLoaded', function() {
    // Find the currency search button in the form
    const currencyBtn = document.querySelector('.btn-lookup-currency');
    if (currencyBtn) {
      currencyBtn.addEventListener('click', showCurrencySearchModal);
    }
    
    // Find the branch search button in the form
    const branchBtn = document.querySelector('.btn-lookup');
    if (branchBtn) {
      branchBtn.addEventListener('click', showBranchSearchModal);
    }
    
    // Find the account search button in the form
    const accountBtn = document.querySelector('.btn-lookup-account');
    if (accountBtn) {
      accountBtn.addEventListener('click', showAccountSearchModal);
    }
    
    // Account search button
    const accountSearchBtn = document.getElementById('accountSearchBtn');
    if (accountSearchBtn) {
      accountSearchBtn.addEventListener('click', handleAccountSearch);
    }
    
    // Account OK button
    const accountOkBtn = document.getElementById('accountOkBtn');
    if (accountOkBtn) {
      accountOkBtn.addEventListener('click', function() {
        const row = window._accountModalSelectedRow || document.querySelector('#accountSearchTable tbody tr.table-active');
        if (row) {
          selectAccountFromRow(row);
        } else {
          toast('Please select an account from the list', 'warning');
        }
      });
    }
    
    // Account close button
    const accountCloseBtn = document.querySelector('#accountSearchModal .btn-close');
    if (accountCloseBtn) {
      accountCloseBtn.addEventListener('click', function() {
        const modalEl = document.getElementById('accountSearchModal');
        if (modalEl && window.bootstrap) {
          const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
      });
    }
    
    // Allow Enter key in account search fields
    ['accountSearchAccountId', 'accountSearchDesc'].forEach(fid => {
      const el = document.getElementById(fid);
      if (el) {
        el.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleAccountSearch();
          }
        });
      }
    });
    
    // Add cleanup listener for account modal hidden event
    const accountModalEl = document.getElementById('accountSearchModal');
    if (accountModalEl) {
      accountModalEl.addEventListener('hidden.bs.modal', function() {
        // Clean up any lingering backdrops
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        log('Account modal cleaned up');
      });
    }
    
    // Branch search button
    const branchSearchBtn = document.getElementById('branchSearchBtn');
    if (branchSearchBtn) {
      branchSearchBtn.addEventListener('click', handleBranchSearch);
    }
    
    // Branch OK button
    const branchOkBtn = document.getElementById('branchOkBtn');
    if (branchOkBtn) {
      branchOkBtn.addEventListener('click', function() {
        const row = window._branchModalSelectedRow || document.querySelector('#branchSearchTable tbody tr.table-active');
        if (row) {
          selectBranchFromRow(row);
        } else {
          toast('Please select a branch from the list', 'warning');
        }
      });
    }
    
    // Branch close button
    const branchCloseBtn = document.querySelector('#branchSearchModal .btn-close');
    if (branchCloseBtn) {
      branchCloseBtn.addEventListener('click', function() {
        const modalEl = document.getElementById('branchSearchModal');
        if (modalEl && window.bootstrap) {
          const modalInstance = window.bootstrap.Modal.getInstance(modalEl);
          if (modalInstance) {
            modalInstance.hide();
          }
        }
      });
    }
    
    // Allow Enter key in branch search fields
    ['branchSearchId', 'branchSearchName'].forEach(fid => {
      const el = document.getElementById(fid);
      if (el) {
        el.addEventListener('keydown', function(e) {
          if (e.key === 'Enter') {
            e.preventDefault();
            handleBranchSearch();
          }
        });
      }
    });
    
    // Add cleanup listener for branch modal hidden event
    const branchModalEl = document.getElementById('branchSearchModal');
    if (branchModalEl) {
      branchModalEl.addEventListener('hidden.bs.modal', function() {
        // Clean up any lingering backdrops
        document.querySelectorAll('.modal-backdrop').forEach(el => el.remove());
        document.body.classList.remove('modal-open');
        document.body.style.overflow = '';
        document.body.style.paddingRight = '';
        log('Branch modal cleaned up');
      });
    }
  });

  window.addEventListener('DOMContentLoaded', init);
  
  log('Module loaded');
})();
