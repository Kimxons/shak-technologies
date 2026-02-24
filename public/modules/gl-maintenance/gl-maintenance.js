// GL Maintenance Module - Event Handlers and Logic

document.addEventListener('DOMContentLoaded', function () {
  initializeGLMaintenanceHandlers();
});

function initializeGLMaintenanceHandlers() {
  // Search Button Handlers
  document.getElementById('glAccountIdSearchBtn').addEventListener('click', function (e) {
    e.preventDefault();
    searchGLAccountId();
  });

  document.getElementById('currencyIdSearchBtn').addEventListener('click', function (e) {
    e.preventDefault();
    searchCurrencyId();
  });

  document.getElementById('mainAccountIdSearchBtn').addEventListener('click', function (e) {
    e.preventDefault();
    searchMainAccountId();
  });

  document.getElementById('contraAccountIdSearchBtn').addEventListener('click', function (e) {
    e.preventDefault();
    searchContraAccountId();
  });

  // Action Button Handlers
  document.getElementById('closeBtn').addEventListener('click', function () {
    closeGLMaintenance();
  });

  document.getElementById('viewBtn').addEventListener('click', function () {
    viewGLMaintenance();
  });

  document.getElementById('addBtn').addEventListener('click', function () {
    addNewGLMaintenance();
  });

  document.getElementById('editBtn').addEventListener('click', function () {
    editGLMaintenance();
  });

  document.getElementById('deleteBtn').addEventListener('click', function () {
    deleteGLMaintenance();
  });

  document.getElementById('saveBtn').addEventListener('click', function () {
    saveGLMaintenance();
  });

  document.getElementById('cancelBtn').addEventListener('click', function () {
    cancelGLMaintenance();
  });

  // Dropdown Change Handlers
  document.getElementById('glTypeSelect').addEventListener('change', function () {
    onGLTypeChanged();
  });

  document.getElementById('glSubTypeGroupSelect').addEventListener('change', function () {
    onGLSubTypeGroupChanged();
  });

  // Checkbox Handler
  document.getElementById('doRevaluationCheckbox').addEventListener('change', function () {
    onDoRevaluationChanged();
  });

  // Enter key handler for GL Account ID field
  document.getElementById('glAccountIdField').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      viewGLMaintenance();
    }
  });
}

// Search Functions
function searchGLAccountId() {
  console.log('Searching for GL Account ID...');
  // Open the GL Search Modal
  const modalElement = document.getElementById('glSearchModal');
  console.log('Modal element:', modalElement);
  if (modalElement) {
    if (typeof bootstrap !== 'undefined') {
      const modal = new bootstrap.Modal(modalElement);
      modal.show();
      clearGLSearchResults();
      // Perform initial search to show all records
      setTimeout(() => performGLSearch(), 100);
    } else {
      console.error('Bootstrap is not loaded!');
      alert('Bootstrap library is not loaded. Please refresh the page.');
    }
  } else {
    console.error('Modal element #glSearchModal not found!');
  }
}

function searchCurrencyId() {
  console.log('Searching for Currency ID...');
  if (typeof window.openCurrencySearch === 'function') {
    window.openCurrencySearch();
  } else {
    alert('Currency search function not loaded');
  }
}

function searchMainAccountId() {
  console.log('Searching for Main Account ID...');
  if (typeof window.openMainAccountSearch === 'function') {
    window.openMainAccountSearch();
  } else {
    alert('Main Account search function not loaded');
  }
}

function searchContraAccountId() {
  console.log('Searching for Contra Account ID...');
  if (typeof window.openContraAccountSearch === 'function') {
    window.openContraAccountSearch();
  } else {
    alert('Contra Account search function not loaded');
  }
}

// Action Functions
function closeGLMaintenance() {
  console.log('Closing GL Maintenance...');
  // Close modal
  if (window.parent && window.parent.closeModal) {
    window.parent.closeModal('glMaintenanceModal');
  }
}

function viewGLMaintenance() {
  console.log('Viewing GL Maintenance record...');
  const glAccountId = document.getElementById('glAccountIdField').value.trim();
  if (!glAccountId) {
    alert('Please enter a GL Account ID first');
    return;
  }
  
  // Fetch GL account details
  const sessionData = {
    BankID: sessionStorage.getItem('BankID') || '00',
    OurBranchID: sessionStorage.getItem('OurBranchID') || '1201',
    OperatorID: sessionStorage.getItem('OperatorID') || 'SYS'
  };
  
  const requestData = {
    BankID: sessionData.BankID,
    OurBranchID: sessionData.OurBranchID,
    AccountID: glAccountId,
    OperatorID: sessionData.OperatorID,
    Direction: 0
  };
  
  console.log('📤 Fetching GL account with request:', requestData);
  
  if (typeof window.GeneralLedgerService === 'undefined') {
    console.error('❌ GeneralLedgerService is not available');
    alert('Service not available. Please refresh the page.');
    return;
  }
  
  window.GeneralLedgerService.getGL(requestData)
    .then(response => {
      console.log('📥 GL response:', response);
      
      if (response && response.success && response.data) {
        let record = null;
        
        // Handle different response structures
        if (Array.isArray(response.data)) {
          record = response.data.length > 0 ? response.data[0] : null;
        } else if (response.data.Details && Array.isArray(response.data.Details)) {
          record = response.data.Details.length > 0 ? response.data.Details[0] : null;
        } else if (response.data.Details01 && Array.isArray(response.data.Details01)) {
          record = response.data.Details01.length > 0 ? response.data.Details01[0] : null;
        } else {
          record = response.data;
        }
        
        console.log('📋 Extracted record:', record);
        
        if (record && record.AccountID) {
          populateFormWithRecord(record);
          window.currentGLRecord = record;
          window.isAddMode = false;
          console.log('✅ Form populated successfully');
        } else {
          console.warn('⚠️ GL Account not found in response');
          alert('GL Account "' + glAccountId + '" not found');
        }
      } else {
        console.warn('⚠️ Response indicates failure:', response);
        alert('GL Account not found or error: ' + (response.message || response.code || 'Unknown error'));
      }
    })
    .catch(error => {
      console.error('❌ Error fetching GL account:', error);
      alert('Error loading GL account details: ' + error.message);
    });
}

function populateFormWithRecord(record) {
  console.log('Populating form with record:', record);
  
  // Populate basic fields
  document.getElementById('glAccountIdField').value = record.AccountID || '';
  document.getElementById('descriptionField').value = record.Description || '';
  document.getElementById('shortNameField').value = record.ShortName || '';
  document.getElementById('currencyIdField').value = record.CurrencyID || '';
  document.getElementById('mainAccountIdField').value = record.MainAccountID || '';
  
  // Populate dropdowns
  if (record.GLAccountTypeID) {
    document.getElementById('glTypeSelect').value = record.GLAccountTypeID;
    // Trigger change to load dependent dropdowns
    document.getElementById('glTypeSelect').dispatchEvent(new Event('change'));
  }
  
  if (record.GLTypeGroupID) {
    setTimeout(() => {
      document.getElementById('glSubTypeGroupSelect').value = record.GLTypeGroupID;
      document.getElementById('glSubTypeGroupSelect').dispatchEvent(new Event('change'));
    }, 100);
  }
  
  if (record.GLSubAccountTypeID) {
    setTimeout(() => {
      document.getElementById('glSubTypeSelect').value = record.GLSubAccountTypeID;
    }, 200);
  }
  
  if (record.CategoryCodeID) {
    document.getElementById('glCategorySelect').value = record.CategoryCodeID;
  }
  
  if (record.PostingTypeID) {
    document.getElementById('postingTypeSelect').value = record.PostingTypeID;
  }
  
  if (record.GLClassID) {
    document.getElementById('glClassSelect').value = record.GLClassID;
  }
  
  document.getElementById('contraAccountIdField').value = record.ContraAccountID || '';
  document.getElementById('doRevaluationCheckbox').checked = record.DoRevaluation === 'Y' || record.DoRevaluation === true || record.DoRevaluation === 1;
  document.getElementById('remarksField').value = record.Remarks || '';
  
  console.log('Form populated successfully');
}

function addNewGLMaintenance() {
  console.log('Adding new GL Maintenance record...');
  clearForm();
  window.isAddMode = true;
  window.currentGLRecord = null;
}

function editGLMaintenance() {
  console.log('Editing GL Maintenance record...');
  const glAccountId = document.getElementById('glAccountIdField').value;
  if (!glAccountId) {
    alert('Please select a GL Account ID first');
    return;
  }
  // Enable form fields for editing
  enableFormFields();
}

function deleteGLMaintenance() {
  console.log('Deleting GL Maintenance record...');
  const glAccountId = document.getElementById('glAccountIdField').value;
  if (!glAccountId) {
    alert('Please select a GL Account ID first');
    return;
  }
  if (confirm('Are you sure you want to delete this record?')) {
    // Implement delete logic
    console.log('Record deleted');
    clearForm();
  }
}

function saveGLMaintenance() {
  console.log('Saving GL Maintenance record...');
  
  // Validate required fields
  const glAccountId = document.getElementById('glAccountIdField').value.trim();
  const description = document.getElementById('descriptionField').value.trim();
  
  if (!glAccountId) {
    alert('GL Account ID is required');
    return;
  }
  
  if (!description) {
    alert('Description is required');
    return;
  }

  // Check if this is a new record (Add mode)
  const isNewRecord = !window.currentGLRecord || window.isAddMode;
  
  if (isNewRecord) {
    // Show branch inclusion confirmation
    document.getElementById('branchAccountNo').textContent = glAccountId;
    const modal = new bootstrap.Modal(document.getElementById('branchInclusionModal'));
    modal.show();
    
    // Handle Yes button
    document.getElementById('branchInclusionYesBtn').onclick = function() {
      modal.hide();
      performSave(true); // Include in branches
    };
    
    // Handle No button
    document.getElementById('branchInclusionNoBtn').onclick = function() {
      modal.hide();
      performSave(false); // Don't include in branches
    };
  } else {
    // Existing record - save directly
    performSave(false);
  }
}

function performSave(includeInBranches) {
  // Prepare form data
  const formData = getFormData();
  formData.includeInBranches = includeInBranches;
  
  // Implement save logic (API call)
  console.log('Saving form data:', formData);
  console.log('Include in branches:', includeInBranches);
  
  // TODO: Call GeneralLedgerService.saveGL(formData)
  
  alert('Record saved successfully' + (includeInBranches ? ' and replicated to other branches' : ''));
}

function cancelGLMaintenance() {
  console.log('Cancelling GL Maintenance operation...');
  clearForm();
}

// Form Management Functions
function clearForm() {
  document.getElementById('glAccountIdField').value = '';
  document.getElementById('descriptionField').value = '';
  document.getElementById('shortNameField').value = '';
  document.getElementById('currencyIdField').value = '';
  document.getElementById('mainAccountIdField').value = '';
  document.getElementById('glTypeSelect').value = '--Select--';
  document.getElementById('glSubTypeGroupSelect').value = '--Select--';
  document.getElementById('glSubTypeSelect').value = '--Select--';
  document.getElementById('glCategorySelect').value = 'Others';
  document.getElementById('postingTypeSelect').value = '--Select--';
  document.getElementById('glClassSelect').value = '--Select--';
  document.getElementById('contraAccountIdField').value = '';
  document.getElementById('doRevaluationCheckbox').checked = false;
  document.getElementById('remarksField').value = '';
}

function getFormData() {
  return {
    glAccountId: document.getElementById('glAccountIdField').value,
    description: document.getElementById('descriptionField').value,
    shortName: document.getElementById('shortNameField').value,
    currencyId: document.getElementById('currencyIdField').value,
    mainAccountId: document.getElementById('mainAccountIdField').value,
    glType: document.getElementById('glTypeSelect').value,
    glSubTypeGroup: document.getElementById('glSubTypeGroupSelect').value,
    glSubType: document.getElementById('glSubTypeSelect').value,
    glCategory: document.getElementById('glCategorySelect').value,
    postingType: document.getElementById('postingTypeSelect').value,
    glClass: document.getElementById('glClassSelect').value,
    contraAccountId: document.getElementById('contraAccountIdField').value,
    doRevaluation: document.getElementById('doRevaluationCheckbox').checked,
    remarks: document.getElementById('remarksField').value
  };
}

function enableFormFields() {
  const fields = document.querySelectorAll('.gl-maintenance .form-control, .gl-maintenance .form-select');
  fields.forEach(field => {
    if (field.id !== 'glAccountIdField') { // GL Account ID should remain readonly after selection
      field.disabled = false;
    }
  });
}

function disableFormFields() {
  const fields = document.querySelectorAll('.gl-maintenance .form-control, .gl-maintenance .form-select');
  fields.forEach(field => {
    field.disabled = true;
  });
}

// Dropdown Change Handlers
function onGLTypeChanged() {
  const glType = document.getElementById('glTypeSelect').value;
  console.log('GL Type changed to:', glType);
  // Load GL Sub Type Groups based on GL Type
  populateGLSubTypeGroups(glType);
}

function onGLSubTypeGroupChanged() {
  const glSubTypeGroup = document.getElementById('glSubTypeGroupSelect').value;
  console.log('GL Sub Type Group changed to:', glSubTypeGroup);
  // Load GL Sub Types based on GL Sub Type Group
  populateGLSubTypes(glSubTypeGroup);
}

function onDoRevaluationChanged() {
  const isChecked = document.getElementById('doRevaluationCheckbox').checked;
  console.log('Do Revaluation checkbox changed to:', isChecked);
  // Implement any logic needed when checkbox changes
}

// Dropdown Population Functions
function populateGLSubTypeGroups(glType) {
  const select = document.getElementById('glSubTypeGroupSelect');
  // Clear existing options except the first one
  while (select.options.length > 1) {
    select.remove(1);
  }
  // Add options based on GL Type
  if (glType && glType !== '--Select--') {
    const option = document.createElement('option');
    option.value = 'STGR001';
    option.text = 'Sub Type Group 1';
    select.appendChild(option);
  }
}

function populateGLSubTypes(glSubTypeGroup) {
  const select = document.getElementById('glSubTypeSelect');
  // Clear existing options except the first one
  while (select.options.length > 1) {
    select.remove(1);
  }
  // Add options based on GL Sub Type Group
  if (glSubTypeGroup && glSubTypeGroup !== '--Select--') {
    const option = document.createElement('option');
    option.value = 'ST001';
    option.text = 'Sub Type 1';
    select.appendChild(option);
  }
}

// Form Validation
function validateForm() {
  const glAccountId = document.getElementById('glAccountIdField').value.trim();
  const description = document.getElementById('descriptionField').value.trim();
  
  if (!glAccountId || !description) {
    alert('Please fill in all required fields');
    return false;
  }
  
  return true;
}

// General Ledger Search Modal Functions
function clearGLSearchResults() {
  document.getElementById('glSearchAccountId').value = '';
  document.getElementById('glSearchDesc').value = '';
  const shortNameEl = document.getElementById('glSearchShortName');
  if (shortNameEl) shortNameEl.value = '';
  const typeIdEl = document.getElementById('glSearchTypeId');
  if (typeIdEl) typeIdEl.value = '';
  const tbody = document.getElementById('glSearchTable').querySelector('tbody');
  if (tbody) {
    tbody.innerHTML = '';
  }
}

async function performGLSearch() {
  const accountId = document.getElementById('glSearchAccountId').value.trim();
  const desc = document.getElementById('glSearchDesc').value.trim();
  const shortName = document.getElementById('glSearchShortName')?.value?.trim?.() || '';
  const typeId = document.getElementById('glSearchTypeId')?.value?.trim?.() || '';

  console.log('Performing GL search with:', { accountId, desc, shortName, typeId });

  // Build AdvFilterString based on user input
  const escapeSqlLiteral = (value) => String(value ?? '').replace(/'/g, "''");
  // Required base filter per contract
  let advFilter = [`BankID = '${escapeSqlLiteral(localStorage.getItem('BankID') || '00')}'`];
  if (accountId) {
    const accountIdType = document.getElementById('glSearchAccountIdType').value;
    const operator = accountIdType === 'Like' ? 'LIKE' : '=';
    const value = accountIdType === 'Like' ? `%${accountId}%` : accountId;
    advFilter.push(`AccountID ${operator} '${escapeSqlLiteral(value)}'`);
  }
  if (desc) {
    const descType = document.getElementById('glSearchDescType').value;
    const operator = descType === 'Like' ? 'LIKE' : '=';
    const value = descType === 'Like' ? `%${desc}%` : desc;
    advFilter.push(`Description ${operator} '${escapeSqlLiteral(value)}'`);
  }
  if (shortName) {
    const shortNameType = document.getElementById('glSearchShortNameType').value;
    const operator = shortNameType === 'Like' ? 'LIKE' : '=';
    const value = shortNameType === 'Like' ? `%${shortName}%` : shortName;
    advFilter.push(`ShortName ${operator} '${escapeSqlLiteral(value)}'`);
  }
  if (typeId) {
    const typeIdType = document.getElementById('glSearchTypeIdType').value;
    const operator = typeIdType === 'Like' ? 'LIKE' : '=';
    const value = typeIdType === 'Like' ? `%${typeId}%` : typeId;
    advFilter.push(`GLAccountTypeID ${operator} '${escapeSqlLiteral(value)}'`);
  }

  const AdvFilterString = advFilter.join(' AND ');

  const requestData = {
    TableID: 'GeneralLedgerID',
    AdvFilterString: AdvFilterString,
    WhereStmt: '',
    PrevOrNext: 0,
    RefID: null,
    OperatorID: localStorage.getItem('OperatorID') || 'SYS',
    ModuleID: 8010,
    OurBranchID: localStorage.getItem('BranchID') || '0101',
    SearchKey: null,
    LanguageID: 'en'
  };

  console.log('Request data:', requestData);

  try {
    // Check if GeneralLedgerService is available
    if (typeof GeneralLedgerService === 'undefined') {
      console.error('GeneralLedgerService is not loaded!');
      alert('Service not available. Please refresh the page.');
      return;
    }

    // Call the GeneralLedgerService.getSearchResult
    const result = await GeneralLedgerService.getSearchResult(requestData);
    console.log('Search result:', result);

    // Populate table
    const tbody = document.getElementById('glSearchTable').querySelector('tbody');
    tbody.innerHTML = '';

    if (result && result.success === false) {
      const msg = String(result.message || result.code || 'Search failed');
      tbody.innerHTML = `<tr><td colspan="2" class="text-danger text-center">Search failed: ${msg}</td></tr>`;
      return;
    }

    if (result && result.success && result.data) {
      let data = result.data;
      
      // Handle different response structures
      if (data.Details01 && Array.isArray(data.Details01) && data.Details01.length > 0) {
        data = data.Details01;
      } else if (data.Details && Array.isArray(data.Details)) {
        data = data.Details;
      } else if (!Array.isArray(data)) {
        data = [data];
      }

      // Handle common OldAPI wrapper shape: [{ ResponseCode, ResponseMessage, Details: [...] }]
      if (Array.isArray(data) && data.length === 1 && data[0] && typeof data[0] === 'object') {
        if (Array.isArray(data[0].Details01)) {
          data = data[0].Details01;
        } else if (Array.isArray(data[0].Details)) {
          data = data[0].Details;
        }
      }

      if (data.length > 0) {
        data.forEach(row => {
          const tr = document.createElement('tr');
          tr.innerHTML = `
            <td>${row.AccountID || ''}</td>
            <td>${row.Description || ''}</td>
          `;
          tr.style.cursor = 'pointer';
          tr.addEventListener('click', function () {
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
            tr.classList.add('table-active');
          });

          tr.addEventListener('dblclick', function () {
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
            tr.classList.add('table-active');
            selectGLFromSearch();
          });
          tbody.appendChild(tr);
        });
      } else {
        tbody.innerHTML = '<tr><td colspan="2" class="text-muted text-center">No results found.</td></tr>';
      }
    } else {
      tbody.innerHTML = '<tr><td colspan="2" class="text-muted text-center">No results found.</td></tr>';
    }
  } catch (error) {
    console.error('Error searching GL accounts:', error);
    const tbody = document.getElementById('glSearchTable').querySelector('tbody');
    tbody.innerHTML = '<tr><td colspan="2" class="text-danger text-center">Error performing search.</td></tr>';
  }
}

function selectGLFromSearch() {
  const selected = document.getElementById('glSearchTable').querySelector('tr.table-active');
  if (selected) {
    const accountId = selected.children[0].textContent;
    const description = selected.children[1].textContent;
    document.getElementById('glAccountIdField').value = accountId;
    document.getElementById('descriptionField').value = description;
    
    // Close the modal
    const modalElement = document.getElementById('glSearchModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
      modal.hide();
    }

    // If the service-layer page script is active, clicking View will fully load/autofill
    const viewBtn = document.getElementById('viewBtn');
    if (viewBtn) {
      viewBtn.click();
    }
  } else {
    alert('Please select a record from the list.');
  }
}

// Wire up GL Search Modal event listeners when DOM is ready
document.addEventListener('DOMContentLoaded', function() {
  // Search button in modal
  const glSearchBtn = document.getElementById('glSearchBtn');
  if (glSearchBtn) {
    glSearchBtn.addEventListener('click', performGLSearch);
  }

  // OK button in modal
  const glSearchOkBtn = document.getElementById('glSearchOkBtn');
  if (glSearchOkBtn) {
    glSearchOkBtn.addEventListener('click', selectGLFromSearch);
  }

  // Enter key in search inputs
  const searchInputs = ['glSearchAccountId', 'glSearchDesc', 'glSearchShortName', 'glSearchTypeId'];
  searchInputs.forEach(inputId => {
    const input = document.getElementById(inputId);
    if (input) {
      input.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
          performGLSearch();
        }
      });
    }
  });
});

// Utility Functions
function setFieldValue(fieldId, value) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.value = value;
  }
}

function getFieldValue(fieldId) {
  const field = document.getElementById(fieldId);
  return field ? field.value : '';
}
