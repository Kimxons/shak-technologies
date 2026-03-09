(async function () {
  // ============================================
  // LOAD SERVICES
  // ============================================
  const { ServiceLoader } = window;
  
  await ServiceLoader.loadCore();
  await ServiceLoader.loadScript('/assets/js/services/account/accountservice.js');
  await ServiceLoader.loadAccountChargeRateService();
  
  const AccountService = window.AccountService;
  const AccountChargeRateService = window.AccountChargeRateService;

  // ============================================
  // STATE VARIABLES
  // ============================================
  let currentMode = 'view'; // 'view', 'add', 'edit'
  let chargeSettingsData = []; // Store grid data
  let selectedGridRow = null;

  // ============================================
  // UTILITIES
  // ============================================
  
  /**
   * Get the current account context from parent AccountMaintenanceState
   * Follows the same pattern as other submodules (account-documents.js, etc.)
   */
  function getContext() {
    const ps = window.AccountMaintenanceState;
    
    // Secondary fallback: pull directly from parent form if global state is missing
    const parentBranch = document.getElementById('BranchID')?.value || '';
    const parentAcc = document.getElementById('AccountID')?.value || '';
    
    return {
      AccountID: ps?.AccountID || parentAcc || sessionStorage.getItem('currentAccountID') || '',
      OurBranchID: ps?.OurBranchID || parentBranch || sessionStorage.getItem('currentBranchID') || '',
      OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM'
    };
  }

  function getOperatorId() {
    return getContext().OperatorID;
  }

  function getBranchId() {
    return getContext().OurBranchID;
  }
  
  function getAccountId() {
    return getContext().AccountID;
  }

  function showMessage(message, type = 'info') {
    const msgPanel = document.querySelector('.am-message-panel');
    const msgText = msgPanel?.querySelector('span');
    const msgIcon = msgPanel?.querySelector('i');

    if (msgPanel && msgText && msgIcon) {
      msgText.textContent = message;
      msgPanel.setAttribute('aria-label', message);

      msgIcon.className = type === 'error' ? 'bi bi-exclamation-circle' :
                          type === 'success' ? 'bi bi-check-circle' :
                          'bi bi-info-circle';

      msgPanel.style.display = 'flex';

      if (type !== 'error') {
        setTimeout(() => { msgPanel.style.display = 'none'; }, 3000);
      }
    }
  }

  function showLoading(isLoading) {
    const overlay = document.getElementById('loadingOverlay');
    if (overlay) overlay.hidden = !isLoading;
  }

  function setFieldValue(fieldId, value) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    if (field.tagName === 'SPAN' || field.classList.contains('audit-value')) {
      field.textContent = value || '-';
    } else if (field.tagName === 'SELECT') {
      field.value = value || '';
      // If value not found, try to add it as an option
      if (field.value !== value && value) {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = value;
        field.appendChild(option);
        field.value = value;
      }
    } else {
      field.value = value || '';
    }
  }

  function getFieldValue(fieldId) {
    const field = document.getElementById(fieldId);
    if (!field) return '';
    return field.value?.trim() || '';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    const date = new Date(dateStr);
    return isNaN(date.getTime()) ? dateStr : date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
  }

  function formatDateForInput(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    if (isNaN(date.getTime())) return '';
    // Format as YYYY-MM-DD for date input
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function clearForm() {
    // Clear charge selection fields
    setFieldValue('chargeId', '');
    setFieldValue('chargeName', '');
    setFieldValue('effectiveDate', '');
    setFieldValue('expiryDate', '');

    // Clear charge settings fields
    setFieldValue('ceilingAmountType', '--Select--');
    setFieldValue('ceilingAmount', '');
    setFieldValue('calculationMethod', '--Select--');
    setFieldValue('minCharge', '');
    setFieldValue('maximumCharge', '');
    setFieldValue('value', '');
    setFieldValue('fixedAmount', '');

    // Clear audit fields
    setFieldValue('MakerID', '-');
    setFieldValue('MakerDT', '-');
    setFieldValue('CheckerID', '-');
    setFieldValue('CheckerDT', '-');
    setFieldValue('ModifierID', '-');
    setFieldValue('ModifierDT', '-');

    // Clear grid
    chargeSettingsData = [];
    renderGrid();
  }

  function setButtonStates(mode) {
    // Form action buttons
    const addBtn = document.querySelector('[data-action="add"]');
    const editBtn = document.querySelector('[data-action="edit"]');
    const saveBtn = document.querySelector('[data-action="save"]');
    const deleteBtn = document.querySelector('[data-action="delete"]');
    const cancelBtn = document.querySelector('[data-action="cancel"]');

    // Grid action buttons
    const newBtn = document.querySelector('[data-grid-action="new"]');
    const alterBtn = document.querySelector('[data-grid-action="alter"]');
    const removeBtn = document.querySelector('[data-grid-action="remove"]');
    const updateBtn = document.querySelector('[data-grid-action="update"]');
    const clearBtn = document.querySelector('[data-grid-action="clear"]');

    // Enable all form buttons by default
    [addBtn, editBtn, saveBtn, deleteBtn, cancelBtn].forEach(btn => {
      if (btn) btn.disabled = false;
    });

    // Enable all grid buttons by default
    [newBtn, alterBtn, removeBtn, updateBtn, clearBtn].forEach(btn => {
      if (btn) btn.disabled = false;
    });

    if (mode === 'view') {
      if (saveBtn) saveBtn.disabled = true;
      if (cancelBtn) cancelBtn.disabled = true;
      // In view mode, disable all grid action buttons
      [newBtn, alterBtn, removeBtn, updateBtn, clearBtn].forEach(btn => {
        if (btn) btn.disabled = true;
      });
    } else if (mode === 'add') {
      if (editBtn) editBtn.disabled = true;
      if (deleteBtn) deleteBtn.disabled = true;
      // In add mode, only New button should be active
      if (alterBtn) alterBtn.disabled = true;
      if (removeBtn) removeBtn.disabled = true;
      if (updateBtn) updateBtn.disabled = true;
      // New and Clear buttons stay enabled
    } else if (mode === 'edit') {
      if (editBtn) editBtn.disabled = true;
      if (deleteBtn) deleteBtn.disabled = true;
      // In edit mode, all grid buttons are active
    }
  }

  // ============================================
  // DATA LOADING - VIEW
  // ============================================
  function loadAccountChargeRate() {
    const chargeId = getFieldValue('chargeId');
    const effectiveDate = getFieldValue('effectiveDate');

    if (!chargeId) {
      showMessage('Please enter a Charge ID to view', 'error');
      return;
    }

    showLoading(true);

    // Get account context from parent state
    const ctx = getContext();
    
    // Validate account context
    if (!ctx.AccountID) {
      showMessage('No account selected. Please select an account first.', 'error');
      showLoading(false);
      return;
    }
    
    if (!ctx.OurBranchID) {
      showMessage('Branch ID not available. Please ensure an account is loaded.', 'error');
      showLoading(false);
      return;
    }

    const requestData = {
      OurBranchID: ctx.OurBranchID,
      AccountID: ctx.AccountID,
      ApplicationID: '',
      ChargeID: chargeId,
      EffectiveDate: effectiveDate || '',
      EffectiveDateID: 0,
      OperatorID: ctx.OperatorID
    };

    console.log('[Account Charge Rates] Loading charge rate data with:', requestData);

    AccountService.getAccountChargeRate(requestData)
      .then(response => {
        showLoading(false);
        console.log('[Account Charge Rates] Response:', response);

        if (response && response.success) {
          const details = response.Details || response.data || [];

          if (details.length > 0) {
            populateChargeRateForm(details[0]);
            populateGrid(details);
            showMessage(response.message || 'Charge rate data loaded successfully', 'success');
            currentMode = 'view';
            setButtonStates('view');
          } else {
            // No data found - show alert and enable Add button
            alert('Charge rate details not found. You can add new charge rate details.');
            showMessage('No charge rate data found - Click Add to create new', 'info');
            currentMode = 'add';
            clearForm();
            // Keep the charge ID that was searched
            setFieldValue('chargeId', chargeId);
            setButtonStates('add');
          }
        } else {
          showMessage(response?.message || 'Failed to load charge rate data', 'error');
        }
      })
      .catch(error => {
        showLoading(false);
        showMessage(error.message || 'Error loading charge rate data', 'error');
        console.error('[Account Charge Rates] Error:', error);
      });
  }

  function populateChargeRateForm(data) {
    console.log('[Account Charge Rates] Populating form with:', data);

    // Charge selection fields
    setFieldValue('chargeId', data.ChargeID);
    setFieldValue('chargeName', data.ChargeName || data.ChargeDescription);
    
    // Populate effective date
    if (data.EffectiveDate) {
      setFieldValue('effectiveDate', formatDateForInput(data.EffectiveDate));
    }

    // Populate expiry date
    if (data.ExpiryDate) {
      setFieldValue('expiryDate', formatDateForInput(data.ExpiryDate));
    }

    // Audit trail
    setFieldValue('MakerID', data.CreatedBy || data.MakerID || '-');
    setFieldValue('MakerDT', data.CreatedOn ? formatDate(data.CreatedOn) : '-');
    setFieldValue('CheckerID', data.SupervisedBy || data.CheckerID || '-');
    setFieldValue('CheckerDT', data.SupervisedOn ? formatDate(data.SupervisedOn) : '-');
    setFieldValue('ModifierID', data.ModifiedBy || data.ModifierID || '-');
    setFieldValue('ModifierDT', data.ModifiedOn ? formatDate(data.ModifiedOn) : '-');
  }

  // ============================================
  // GRID FUNCTIONS
  // ============================================
  function populateGrid(data) {
    chargeSettingsData = data.map((item, index) => ({
      id: index,
      ceilingAmount: item.CeilingAmount || '',
      minCharge: item.MinCharge || item.MinimumCharge || '',
      maxCharge: item.MaxCharge || item.MaximumCharge || '',
      calculationMethod: item.CalculationMethod || '',
      value: item.Value || '',
      fixedAmount: item.FixedAmount || ''
    }));

    renderGrid();
  }

  function renderGrid() {
    const tbody = document.getElementById('chargeSettingsBody');
    if (!tbody) return;

    if (chargeSettingsData.length === 0) {
      tbody.innerHTML = `
        <tr class="no-records-row">
          <td colspan="6" class="text-center text-muted">No records to display.</td>
        </tr>
      `;
      return;
    }

    tbody.innerHTML = chargeSettingsData.map((row, index) => `
      <tr data-row-id="${index}" class="${selectedGridRow === index ? 'table-active' : ''}">
        <td>${row.ceilingAmount}</td>
        <td>${row.minCharge}</td>
        <td>${row.maxCharge}</td>
        <td>${row.calculationMethod}</td>
        <td>${row.value}</td>
        <td>${row.fixedAmount}</td>
      </tr>
    `).join('');

    // Add row click handlers
    tbody.querySelectorAll('tr[data-row-id]').forEach(tr => {
      tr.addEventListener('click', () => {
        const rowId = parseInt(tr.getAttribute('data-row-id'));
        selectGridRow(rowId);
      });
    });
  }

  function selectGridRow(rowId) {
    selectedGridRow = rowId;
    renderGrid();

    // Populate form fields with selected row data
    const row = chargeSettingsData[rowId];
    if (row) {
      setFieldValue('ceilingAmount', row.ceilingAmount);
      setFieldValue('minCharge', row.minCharge);
      setFieldValue('maximumCharge', row.maxCharge);
      setFieldValue('calculationMethod', row.calculationMethod);
      setFieldValue('value', row.value);
      setFieldValue('fixedAmount', row.fixedAmount);
    }
  }

  function addGridRow() {
    const newRow = {
      id: chargeSettingsData.length,
      ceilingAmount: getFieldValue('ceilingAmount'),
      minCharge: getFieldValue('minCharge'),
      maxCharge: getFieldValue('maximumCharge'),
      calculationMethod: getFieldValue('calculationMethod'),
      value: getFieldValue('value'),
      fixedAmount: getFieldValue('fixedAmount')
    };

    chargeSettingsData.push(newRow);
    renderGrid();
    clearGridFields();
    showMessage('Row added to grid', 'success');
  }

  function alterGridRow() {
    if (selectedGridRow === null) {
      showMessage('Please select a row to alter', 'error');
      return;
    }

    chargeSettingsData[selectedGridRow] = {
      ...chargeSettingsData[selectedGridRow],
      ceilingAmount: getFieldValue('ceilingAmount'),
      minCharge: getFieldValue('minCharge'),
      maxCharge: getFieldValue('maximumCharge'),
      calculationMethod: getFieldValue('calculationMethod'),
      value: getFieldValue('value'),
      fixedAmount: getFieldValue('fixedAmount')
    };

    renderGrid();
    showMessage('Row updated', 'success');
  }

  function removeGridRow() {
    if (selectedGridRow === null) {
      showMessage('Please select a row to remove', 'error');
      return;
    }

    chargeSettingsData.splice(selectedGridRow, 1);
    selectedGridRow = null;
    renderGrid();
    clearGridFields();
    showMessage('Row removed', 'success');
  }

  function clearGridFields() {
    setFieldValue('ceilingAmountType', '--Select--');
    setFieldValue('ceilingAmount', '');
    setFieldValue('calculationMethod', '--Select--');
    setFieldValue('minCharge', '');
    setFieldValue('maximumCharge', '');
    setFieldValue('value', '');
    setFieldValue('fixedAmount', '');
    selectedGridRow = null;
  }

  // ============================================
  // SAVE FUNCTIONALITY
  // ============================================
  function generateXMLData() {
    if (chargeSettingsData.length === 0) {
      return '';
    }

    const chargeId = getFieldValue('chargeId');
    const effectiveDate = getFieldValue('effectiveDate');
    const branchId = getBranchId();

    let xml = '';
    chargeSettingsData.forEach((row) => {
      xml += '<dt_ChargeRates>';
      xml += '<BankID>00</BankID>';
      xml += `<OurBranchID>${branchId}</OurBranchID>`;
      xml += `<ChargeID>${chargeId}</ChargeID>`;
      xml += `<CalculationMethod>${row.calculationMethod || ''}</CalculationMethod>`;
      xml += `<CeilingAmount>${row.ceilingAmount || ''}</CeilingAmount>`;
      xml += '<ComparisonSignID>=</ComparisonSignID>';
      xml += '<ComparisonSign>Equal To</ComparisonSign>';
      xml += `<MinimumCharge>${row.minCharge || ''}</MinimumCharge>`;
      xml += `<MaximumCharge>${row.maxCharge || ''}</MaximumCharge>`;
      xml += `<EffectiveDate>${effectiveDate}</EffectiveDate>`;
      xml += '<ButtonMark>N</ButtonMark>';
      xml += '<EffectiveDateID>0</EffectiveDateID>';
      xml += '<UpdateCount>1</UpdateCount>';
      xml += '<AccountID></AccountID>';
      xml += '</dt_ChargeRates>';
    });

    return xml;
  }

  function validateForm() {
    const chargeId = getFieldValue('chargeId');
    const effectiveDate = getFieldValue('effectiveDate');

    if (!chargeId) {
      showMessage('Please enter a Charge ID', 'error');
      return false;
    }

    if (!effectiveDate) {
      showMessage('Please enter an Effective Date', 'error');
      return false;
    }

    if (chargeSettingsData.length === 0) {
      showMessage('Please add at least one charge setting', 'error');
      return false;
    }

    return true;
  }

  function saveAccountChargeRate() {
    if (!validateForm()) {
      return;
    }

    showLoading(true);

    const requestData = {
      OurBranchID: getBranchId(),
      AccountID: '',
      ApplicationID: '',
      // ChargeID: getFieldValue('chargeId'),
      ChargeID: 'CH114',
      EffectiveDate: getFieldValue('effectiveDate'),
      EffectiveDateID: 0,
      ExpiryDate: getFieldValue('expiryDate') || '',
      OperatorID: getOperatorId(),
      XMLData: generateXMLData()
    };

    console.log('[Account Charge Rates] Saving charge rate data:', requestData);

    AccountChargeRateService.addEditAccountChargeRate(requestData)
      .then(response => {
        showLoading(false);
        console.log('[Account Charge Rates] Save response:', response);

        if (response && response.success) {
          showMessage(response.message || 'Charge rate saved successfully', 'success');
          currentMode = 'view';
          setButtonStates('view');
          // Reload the data
          loadAccountChargeRate();
        } else {
          showMessage(response?.message || 'Failed to save charge rate', 'error');
        }
      })
      .catch(error => {
        showLoading(false);
        showMessage(error.message || 'Error saving charge rate data', 'error');
        console.error('[Account Charge Rates] Save error:', error);
      });
  }

  // ============================================
  // ACTION BUTTON HANDLERS
  // ============================================
  function wireActionButtons() {
    // View button
    const viewBtn = document.querySelector('[data-action="view"]');
    if (viewBtn) {
      viewBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loadAccountChargeRate();
      });
    }

    // Add button
    const addBtn = document.querySelector('[data-action="add"]');
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentMode = 'add';
        clearForm();
        setButtonStates('add');
        showMessage('Add mode - Enter new charge rate details', 'info');
      });
    }

    // Edit button
    const editBtn = document.querySelector('[data-action="edit"]');
    if (editBtn) {
      editBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentMode = 'edit';
        setButtonStates('edit');
        showMessage('Edit mode - Modify charge rate details', 'info');
      });
    }

    // Save button
    const saveBtn = document.querySelector('[data-action="save"]');
    if (saveBtn) {
      saveBtn.addEventListener('click', (e) => {
        e.preventDefault();
        saveAccountChargeRate();
      });
    }

    // Delete button
    const deleteBtn = document.querySelector('[data-action="delete"]');
    if (deleteBtn) {
      deleteBtn.addEventListener('click', (e) => {
        e.preventDefault();
        showMessage('Delete functionality - To be implemented', 'info');
      });
    }

    // Cancel button
    const cancelBtn = document.querySelector('[data-action="cancel"]');
    if (cancelBtn) {
      cancelBtn.addEventListener('click', (e) => {
        e.preventDefault();
        currentMode = 'view';
        clearForm();
        setButtonStates('view');
        showMessage('Operation cancelled', 'info');
      });
    }

    // Close button
    const closeBtn = document.querySelector('.action-panel [data-action="close"]');
    if (closeBtn) {
      closeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        postClose();
      });
    }
  }

  // ============================================
  // GRID ACTION BUTTON HANDLERS
  // ============================================
  function wireGridButtons() {
    // New button
    const newBtn = document.querySelector('[data-grid-action="new"]');
    if (newBtn) {
      newBtn.addEventListener('click', (e) => {
        e.preventDefault();
        addGridRow();
      });
    }

    // Alter button
    const alterBtn = document.querySelector('[data-grid-action="alter"]');
    if (alterBtn) {
      alterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        alterGridRow();
      });
    }

    // Remove button
    const removeBtn = document.querySelector('[data-grid-action="remove"]');
    if (removeBtn) {
      removeBtn.addEventListener('click', (e) => {
        e.preventDefault();
        removeGridRow();
      });
    }

    // Update button
    const updateBtn = document.querySelector('[data-grid-action="update"]');
    if (updateBtn) {
      updateBtn.addEventListener('click', (e) => {
        e.preventDefault();
        loadAccountChargeRate();
      });
    }

    // Clear button
    const clearBtn = document.querySelector('[data-grid-action="clear"]');
    if (clearBtn) {
      clearBtn.addEventListener('click', (e) => {
        e.preventDefault();
        clearGridFields();
      });
    }
  }

  // ============================================
  // LOOKUP HANDLERS
  // ============================================
  function wireLookups() {
    // Charge ID lookup
    const chargeIdLookup = document.querySelector('[data-lookup="chargeId"]');
    if (chargeIdLookup) {
      chargeIdLookup.addEventListener('click', (e) => {
        e.preventDefault();
        // Lookup functionality - can be wired to searchService
        const chargeIdInput = document.getElementById('chargeId');
        if (chargeIdInput) chargeIdInput.focus();
        showMessage('Charge ID lookup - Select a charge', 'info');
      });
    }

  }

  // ============================================
  // CLOSE FUNCTIONALITY
  // ============================================
  function postClose() {
    try {
      window.parent.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
      window.parent.postMessage({ action: 'submoduleClosed', source: 'Account Charge Rates' }, '*');
    } catch (_) {
      // ignore
    }
  }

  // ============================================
  // INITIALIZATION
  // ============================================
  function initializeForm() {
    console.log('[Account Charge Rates] Initializing form');

    // Wire all button handlers
    wireActionButtons();
    wireGridButtons();
    wireLookups();

    // Set initial button states
    setButtonStates('view');

    // Notify parent form that this module has opened
    try {
      window.parent.postMessage({ action: 'submoduleOpened', source: 'Account Charge Rates' }, '*');
    } catch (_) {
      // ignore
    }

    showMessage('Ready - Enter Charge ID and click View to load data', 'info');
  }

  // ============================================
  // DOCUMENT READY
  // ============================================
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeForm);
  } else {
    initializeForm();
  }
})();
