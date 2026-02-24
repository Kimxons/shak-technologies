// Kairo Banking Application - Charge Maintenance Module

// ========== HARDCODED CONFIGURATION (REMOVE WHEN BACKEND SESSION IS READY) ==========
// TODO: Replace these with actual session/user data from backend
const HARDCODED_CONFIG = {
  BankID: "00",
  OurBranchID: "0101",
  OperatorID: "SYS"
};
// ========== END HARDCODED SECTION ==========

// ========== SERVICE INITIALIZATION ==========
let ChargeService = null;

// ========== STATE MANAGEMENT ==========
let isEditMode = false;
let currentRecord = null;
let activeSection = 'dataentry';
let dateRecords = [];
let selectedDateRow = null;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', async function() {
  // Load required services
  const { ServiceLoader } = window;
  await ServiceLoader.loadCore();
  await ServiceLoader.loadChargeService();
  
  // Get service instance
  ChargeService = window.ChargeService;
  
  initSectionToggles();
  initHeaderControls();
  initSidebar();

  initializeForm();
  setupEventListeners();
  disableEdit();
  refreshDateHistoryTable();
});

function initializeForm() {
  // Clear all text inputs
  document.getElementById('chargeId').value = '';
  document.getElementById('description').value = '';
  document.getElementById('currencyId').value = '';
  document.getElementById('customerDescriptionId').value = '';
  document.getElementById('customerNarration').value = '';
  document.getElementById('deferredIncomeGl').value = '';
  document.getElementById('chargeReceivableGl').value = '';
  
  // Clear date inputs
  document.getElementById('effectiveDate').value = '';
  document.getElementById('expiryDate').value = '';
  
  // Reset select dropdowns to default values
  document.getElementById('productTypes').selectedIndex = 0;
  document.getElementById('rounding').value = '0.01';
  document.getElementById('chargingMethod').value = 'waive';
  document.getElementById('applyCharge').selectedIndex = 0;
  document.getElementById('chargeType').value = 'transaction';
  document.getElementById('calculationMethod').selectedIndex = 0;
  document.getElementById('chargeOn').selectedIndex = 0;
  document.getElementById('shareIncome').value = 'none';
  document.getElementById('taxId').selectedIndex = 0;
  document.getElementById('chargeRecoveryMode').selectedIndex = 0;
  
  // Clear all checkboxes
  document.getElementById('chargeInLocalCurrency').checked = false;
  document.getElementById('holidayApplicable').checked = false;
  document.getElementById('scheduleBased').checked = false;
  document.getElementById('insuranceCharge').checked = false;
  document.getElementById('deferIncome').checked = false;
  document.getElementById('applyToNonCustomer').checked = false;
  document.getElementById('taxable').checked = false;
  document.getElementById('chargeIncludeTax').checked = false;
  
  // Clear readonly fields (Behind The Scene)
  document.getElementById('createdBy').value = '';
  document.getElementById('modifiedBy').value = '';
  document.getElementById('supervisedBy').value = '';
  document.getElementById('createdOn').value = '';
  document.getElementById('modifiedOn').value = '';
  document.getElementById('supervisedOn').value = '';
}

// ========================================
// STANDARDIZED SHELL HELPERS
// ========================================
function isMainChargeMaintenancePage() {
  return document.body && document.body.dataset && document.body.dataset.page === 'charge-maintenance';
}

function getMessageBar() {
  return document.querySelector('.am-message-panel') || document.getElementById('statusMessage');
}

function closeThisWindowOrModal() {
  const modalId = document.body?.dataset?.closeModal;
  if (modalId && window.parent && window.parent !== window) {
    try {
      const parentDoc = window.parent.document;
      const el = parentDoc.getElementById(modalId);
      const inst = window.parent.bootstrap?.Modal?.getInstance(el) || (el ? new window.parent.bootstrap.Modal(el) : null);
      if (inst) {
        inst.hide();
        return;
      }
    } catch (e) {
      // fall through
    }
  }

  // If embedded but modal not found, return to dashboard
  if (window.self !== window.top && isMainChargeMaintenancePage()) {
    window.location.href = '../../dashboard.html';
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
}

function initSectionToggles() {
  const toggles = document.querySelectorAll('[data-section-toggle]');
  toggles.forEach((header) => {
    const section = header.closest('.form-section');
    const content = section ? section.querySelector('[data-section-content]') : null;
    const btn = section ? section.querySelector('.section-toggle-btn') : null;
    const icon = btn ? btn.querySelector('i') : null;
    if (!content || !btn) return;

    const setExpanded = (expanded) => {
      btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
      content.hidden = !expanded;
      if (icon) {
        icon.classList.toggle('bi-chevron-up', expanded);
        icon.classList.toggle('bi-chevron-down', !expanded);
      }
    };

    if (!btn.hasAttribute('aria-expanded')) setExpanded(true);

    const toggle = () => {
      const expanded = btn.getAttribute('aria-expanded') !== 'false';
      setExpanded(!expanded);
    };

    header.addEventListener('click', toggle);
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggle();
    });
  });
}

function initHeaderControls() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'refresh') {
      // Preserve existing stateful services; refresh is a no-op for now
      window.location.reload();
      return;
    }
    if (action === 'maximize') {
      const win = document.querySelector('.window');
      if (win) win.classList.toggle('maximized');
      return;
    }
    if (action === 'minimize') {
      return;
    }
    if (action === 'close') {
      closeThisWindowOrModal();
    }
  });
}

function initSidebar() {
  const sidebar = document.getElementById('main-sidebar');
  const toggleBtn = document.getElementById('sidebarToggle');
  const main = document.querySelector('.main-container');

  if (toggleBtn && sidebar && main) {
    toggleBtn.addEventListener('click', () => {
      const collapsed = sidebar.classList.toggle('collapsed');
      main.classList.toggle('sidebar-collapsed', collapsed);
      toggleBtn.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
    });
  }

  document.querySelectorAll('[data-nav-section]').forEach((section) => {
    const arrow = section.querySelector('.nav-arrow');
    const items = section.querySelector('.nav-items');
    if (!arrow || !items) return;

    arrow.addEventListener('click', (e) => {
      e.preventDefault();
      const open = section.classList.toggle('is-open');
      arrow.setAttribute('aria-expanded', open ? 'true' : 'false');
      items.hidden = !open;
      const icon = arrow.querySelector('i');
      if (icon) {
        icon.classList.toggle('bi-chevron-down', open);
        icon.classList.toggle('bi-chevron-right', !open);
      }
    });

    if (!section.classList.contains('is-open')) {
      items.hidden = true;
      arrow.setAttribute('aria-expanded', 'false');
    } else {
      items.hidden = false;
      arrow.setAttribute('aria-expanded', 'true');
    }
  });

  // open submodules
  document.querySelectorAll('[data-open-modal]').forEach((el) => {
    const open = () => {
      const modalId = el.getAttribute('data-open-modal');
      openModal(modalId);
    };
    el.addEventListener('click', open);
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        open();
      }
    });
  });

  // sidebar search
  const search = document.getElementById('submoduleSearch');
  const clear = document.getElementById('submoduleSearchClear');

  const applyFilter = () => {
    if (!search) return;
    const q = (search.value || '').trim().toLowerCase();
    document.querySelectorAll('.sidebar-item').forEach((item) => {
      const txt = (item.textContent || '').trim().toLowerCase();
      item.style.display = !q || txt.includes(q) ? '' : 'none';
    });
    if (clear) clear.style.visibility = q ? 'visible' : '';
  };

  if (search) search.addEventListener('input', applyFilter);
  if (clear && search) {
    clear.addEventListener('click', () => {
      search.value = '';
      applyFilter();
      search.focus();
    });
  }
}

// ========================================
// BOOTSTRAP MODALS (MAIN PAGE)
// ========================================
function openModal(modalId) {
  if (!modalId) return;
  const el = document.getElementById(modalId);
  if (!el || !window.bootstrap?.Modal) return;
  const inst = window.bootstrap.Modal.getInstance(el) || new window.bootstrap.Modal(el);
  inst.show();
}

function closeModal(modalId) {
  if (!modalId) return;
  const el = document.getElementById(modalId);
  if (!el || !window.bootstrap?.Modal) return;
  const inst = window.bootstrap.Modal.getInstance(el) || new window.bootstrap.Modal(el);
  inst.hide();
}

// Expose for any legacy callers
window.openModal = openModal;
window.closeModal = closeModal;



function setupEventListeners() {
  // Form submit prevention
  document.getElementById('chargeForm').addEventListener('submit', function(e) {
    e.preventDefault();
  });

  // Unified action routing (replaces inline onclick)
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    switch (action) {
      // CRUD / main actions
      case 'view':
        handleView();
        break;
      case 'add':
        handleAdd();
        break;
      case 'edit':
        handleEdit();
        break;
      case 'delete':
        handleDelete();
        break;
      case 'save':
        handleSave();
        break;
      case 'cancel':
        handleCancel();
        break;
      case 'back':
        closeThisWindowOrModal();
        break;

      // lookups / searches
      case 'searchCharge':
        searchCharge();
        break;
      case 'searchCurrency':
        searchCurrency();
        break;
      case 'searchCustomerDescription':
        searchCustomerDescription();
        break;
      case 'searchGlAccount':
        searchGlAccount();
        break;

      // search modals
      case 'executeChargeSearch':
        executeChargeSearch();
        break;
      case 'navigatePrevious':
        navigatePrevious();
        break;
      case 'navigateNext':
        navigateNext();
        break;
      case 'selectChargeAndClose':
        selectChargeAndClose();
        break;
      case 'executeCurrencySearch':
        executeCurrencySearch();
        break;
      case 'navigateCurrencyPrevious':
        navigateCurrencyPrevious();
        break;
      case 'navigateCurrencyNext':
        navigateCurrencyNext();
        break;
      case 'selectCurrencyAndClose':
        selectCurrencyAndClose();
        break;

      // date history
      case 'newDate':
        handleNewDate();
        break;
      case 'alterDate':
        handleAlterDate();
        break;
      case 'removeDate':
        handleRemoveDate();
        break;
      case 'updateDate':
        handleUpdateDate();
        break;
      case 'clearDate':
        handleClearDate();
        break;
      default:
        break;
    }
  });

  // Checkbox dependencies
  document.getElementById('deferIncome').addEventListener('change', function() {
    const deferredGl = document.getElementById('deferredIncomeGl');
    deferredGl.disabled = !this.checked;
    if (!this.checked) {
      deferredGl.value = '';
    }
  });

  document.getElementById('taxable').addEventListener('change', function() {
    const taxId = document.getElementById('taxId');
    taxId.disabled = !this.checked;
    if (!this.checked) {
      taxId.value = '';
    }
  });
}

// ========== CRUD OPERATIONS ==========

function handleView() {
  if (!currentRecord) {
    showStatusMessage('Please select a record to view', 'warning');
    return;
  }

  disableEdit();
  loadRecordData(currentRecord);
  showStatusMessage('Viewing record in read-only mode', 'info');
}

function handleAdd() {
  isEditMode = true;
  currentRecord = null;
  
  clearForm();
  enableFormFields();
  
  // Focus first input
  document.getElementById('chargeId').focus();
  
  showStatusMessage('Add new charge - fill in required fields', 'info');
}

function handleEdit() {
  if (!currentRecord) {
    showStatusMessage('Please select a record to edit', 'warning');
    return;
  }

  isEditMode = true;
  enableFormFields();
  
  showStatusMessage('Edit mode enabled - modify fields and save', 'info');
}

function handleSave() {
  if (!validateForm()) {
    return;
  }

  const formData = collectFormData();
  
  if (currentRecord) {
    // Update existing record
    updateRecord(formData);
  } else {
    // Create new record
    createRecord(formData);
  }
}

function handleDelete() {
  if (!currentRecord) {
    showStatusMessage('Please select a record to delete', 'warning');
    return;
  }

  if (confirm('Are you sure you want to delete this charge? This action cannot be undone.')) {
    deleteRecord(currentRecord);
  }
}

function handleCancel() {
  if (isEditMode) {
    if (confirm('Discard all changes?')) {
      isEditMode = false;
      clearForm();
      currentRecord = null;
      dateRecords = [];
      refreshDateHistoryTable();
      disableEdit();
      showStatusMessage('Changes discarded', 'info');
    }
  } else {
    clearForm();
    currentRecord = null;
    dateRecords = [];
    refreshDateHistoryTable();
    showStatusMessage('Form cleared', 'info');
  }
}

// ========== FORM MANAGEMENT ==========

function enableFormFields() {
  const form = document.getElementById('chargeForm');
  const inputs = form.querySelectorAll('input:not([readonly]), select, textarea');
  
  inputs.forEach(input => {
    if (!input.id.startsWith('created') && 
        !input.id.startsWith('modified') && 
        !input.id.startsWith('supervised')) {
      input.disabled = false;
    }
  });
}

function disableEdit() {
  const form = document.getElementById('chargeForm');
  const inputs = form.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    // Keep date fields and chargeId enabled for date history management and searching
    if (input.id !== 'effectiveDate' && input.id !== 'expiryDate' && input.id !== 'chargeId') {
      input.disabled = true;
    }
  });
  
  isEditMode = false;
}

function clearForm() {
  const form = document.getElementById('chargeForm');
  
  // Clear all text inputs
  form.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]').forEach(input => {
    if (!input.readOnly) {
      input.value = '';
    }
  });
  
  // Clear textareas
  form.querySelectorAll('textarea').forEach(textarea => {
    textarea.value = '';
  });
  
  // Reset selects to first option
  form.querySelectorAll('select').forEach(select => {
    select.selectedIndex = 0;
  });
  
  // Uncheck all checkboxes
  form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
    checkbox.checked = false;
  });
  
  // Clear audit fields
  document.getElementById('createdBy').value = '';
  document.getElementById('createdOn').value = '';
  document.getElementById('modifiedBy').value = '';
  document.getElementById('modifiedOn').value = '';
  document.getElementById('supervisedBy').value = '';
  document.getElementById('supervisedOn').value = '';
  
  // Restore defaults
  initializeForm();
}

function populateFormFromAPI(response) {
  // Map API response to form fields
  // API returns nested structure: Details01 (main data), Details02 (product types), Details03 (date history)
  if (!response) return;
  
  // Extract main charge data from Details01[0]
  const data = response.Details01 && response.Details01[0] ? response.Details01[0] : null;
  if (!data) {
    showStatusMessage('No charge data found in response', 'warning');
    return;
  }
  
  // Main fields
  if (data.ChargeID) document.getElementById('chargeId').value = data.ChargeID;
  if (data.Description) document.getElementById('description').value = data.Description;
  if (data.CurrencyID) document.getElementById('currencyId').value = data.CurrencyID;
  
  // Product Types - handle array from Details02
  if (response.Details02 && response.Details02.length > 0) {
    // Get the product type select element
    const productSelect = document.getElementById('productTypes');
    // Clear existing options except the first one
    productSelect.innerHTML = '<option value="">--Select--</option>';
    // Add product types from Details02
    response.Details02.forEach(product => {
      const option = document.createElement('option');
      option.value = product.ProductTypeID;
      option.text = product.ProductTypeID;
      productSelect.appendChild(option);
    });
    // Select the first product type if available
    if (response.Details02[0] && response.Details02[0].ProductTypeID) {
      productSelect.value = response.Details02[0].ProductTypeID;
    }
  }
  
  if (data.RoundingID) document.getElementById('rounding').value = data.RoundingID;
  if (data.ChargingMethodID) document.getElementById('chargingMethod').value = data.ChargingMethodID;
  if (data.ApplyChargeID) document.getElementById('applyCharge').value = data.ApplyChargeID;
  if (data.ChargeTypeID) document.getElementById('chargeType').value = data.ChargeTypeID;
  if (data.CalculationMethodID) document.getElementById('calculationMethod').value = data.CalculationMethodID;
  // ChargeOn field not in current API response
  if (data.IncomeSharingTypeID) document.getElementById('shareIncome').value = data.IncomeSharingTypeID;
  if (data.TaxID) document.getElementById('taxId').value = data.TaxID;
  if (data.RecoveryModeID) document.getElementById('chargeRecoveryMode').value = data.RecoveryModeID || '';
  
  // Checkboxes - map from API boolean fields
  document.getElementById('chargeInLocalCurrency').checked = data.ChargeCurrencyID === data.CurrencyID;
  document.getElementById('holidayApplicable').checked = data.IsHolidayApplicable || false;
  document.getElementById('scheduleBased').checked = data.IsScheduleBased || false;
  document.getElementById('insuranceCharge').checked = data.IsInsuaranceCharge || false;
  document.getElementById('deferIncome').checked = data.DeferIncome || false;
  document.getElementById('applyToNonCustomer').checked = data.IsAppliedOnNonCustomers || false;
  document.getElementById('taxable').checked = data.IsTaxable || false;
  document.getElementById('chargeIncludeTax').checked = data.ChargeIncludeTax || false;
  
  // Additional fields
  if (data.CustTrxDescriptionID) document.getElementById('customerDescriptionId').value = data.CustTrxDescriptionID || '';
  if (data.CustTrxNarration) document.getElementById('customerNarration').value = data.CustTrxNarration || '';
  if (data.DeferredIncomeGL) document.getElementById('deferredIncomeGl').value = data.DeferredIncomeGL || '';
  if (data.ChargeReceivableGLID) document.getElementById('chargeReceivableGl').value = data.ChargeReceivableGLID || '';
  
  // Audit fields - format dates nicely
  if (data.CreatedBy) document.getElementById('createdBy').value = data.CreatedBy;
  if (data.CreatedOn) document.getElementById('createdOn').value = formatDateTime(data.CreatedOn);
  if (data.ModifiedBy) document.getElementById('modifiedBy').value = data.ModifiedBy || '';
  if (data.ModifiedOn) document.getElementById('modifiedOn').value = data.ModifiedOn ? formatDateTime(data.ModifiedOn) : '';
  if (data.SupervisedBy) document.getElementById('supervisedBy').value = data.SupervisedBy || '';
  if (data.SupervisedOn) document.getElementById('supervisedOn').value = data.SupervisedOn ? formatDateTime(data.SupervisedOn) : '';
  
  // Populate Date History from Details03
  if (response.Details03 && response.Details03.length > 0) {
    dateRecords = response.Details03.map(dateRecord => ({
      id: dateRecord.EffectiveDateID || Date.now(),
      effectiveDate: dateRecord.EffectiveDate ? dateRecord.EffectiveDate.split('T')[0] : '',
      expiryDate: dateRecord.ExpiryDate ? dateRecord.ExpiryDate.split('T')[0] : '',
      status: dateRecord.ChargeStatus || 'Active'
    }));
    
    // Set the first effective date as the form's effective date
    if (dateRecords.length > 0 && dateRecords[0].effectiveDate) {
      document.getElementById('effectiveDate').value = dateRecords[0].effectiveDate;
      if (dateRecords[0].expiryDate) {
        document.getElementById('expiryDate').value = dateRecords[0].expiryDate;
      }
    }
    
    refreshDateHistoryTable();
  }
}

function formatDateTime(dateTimeString) {
  if (!dateTimeString) return '';
  
  const date = new Date(dateTimeString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  
  return `${day}/${month}/${year} ${hours}:${minutes}`;
}

function loadRecordData(record) {
  // This function would load data from the record object
  // Backend connection required
  console.log('Loading record:', record);
  
  // Example: populate form fields from record
  // document.getElementById('chargeId').value = record.chargeId;
  // document.getElementById('description').value = record.description;
  // etc...
}

function collectFormData() {
  const form = document.getElementById('chargeForm');
  const formData = {};
  
  // Collect all form fields
  form.querySelectorAll('input, select, textarea').forEach(field => {
    if (field.type === 'checkbox') {
      formData[field.id] = field.checked;
    } else {
      formData[field.id] = field.value;
    }
  });
  
  return formData;
}

// ========== VALIDATION ==========

function validateForm() {
  const requiredFields = [
    { id: 'chargeId', label: 'Charge ID' },
    { id: 'description', label: 'Description' },
    { id: 'currencyId', label: 'Currency ID' },
    { id: 'effectiveDate', label: 'Effective Date' }
  ];
  
  for (const field of requiredFields) {
    const input = document.getElementById(field.id);
    
    if (!input.value.trim()) {
      showStatusMessage(`${field.label} is required`, 'error');
      input.focus();
      input.style.borderColor = '#E74C3C';
      
      setTimeout(() => {
        input.style.borderColor = '';
      }, 3000);
      
      return false;
    }
  }
  
  // Validate date range
  const effectiveDate = document.getElementById('effectiveDate').value;
  const expiryDate = document.getElementById('expiryDate').value;
  
  if (effectiveDate && expiryDate && new Date(expiryDate) < new Date(effectiveDate)) {
    showStatusMessage('Expiry Date must be after Effective Date', 'error');
    document.getElementById('expiryDate').focus();
    return false;
  }
  
  return true;
}

// ========== DATA OPERATIONS (Backend Integration Required) ==========

function createRecord(formData) {
  // Backend API call required
  console.log('Creating record:', formData);
  
  // Simulate success
  const currentUser = 'System User'; // Would come from session
  const currentDateTime = new Date().toLocaleString();
  
  document.getElementById('createdBy').value = currentUser;
  document.getElementById('createdOn').value = currentDateTime;
  
  currentRecord = { ...formData, id: Date.now() };
  isEditMode = false;
  disableEdit();
  
  showStatusMessage('Charge created successfully', 'success');
  
  // Refresh table
  loadChargeTable();
}

function updateRecord(formData) {
  // Backend API call required
  console.log('Updating record:', formData);
  
  // Simulate success
  const currentUser = 'System User'; // Would come from session
  const currentDateTime = new Date().toLocaleString();
  
  document.getElementById('modifiedBy').value = currentUser;
  document.getElementById('modifiedOn').value = currentDateTime;
  
  currentRecord = { ...currentRecord, ...formData };
  isEditMode = false;
  disableEdit();
  
  showStatusMessage('Charge updated successfully', 'success');
  
  // Refresh table
  loadChargeTable();
}

function deleteRecord(record) {
  // Backend API call required
  console.log('Deleting record:', record);
  
  // Simulate success
  currentRecord = null;
  clearForm();
  disableEdit();
  
  showStatusMessage('Charge deleted successfully', 'success');
  
  // Refresh table
  loadChargeTable();
}

function loadChargeTable() {
  // Backend API call required
  console.log('Loading charge table');
  
  const tableBody = document.getElementById('chargeTableBody');
  
  // This would be populated from backend data
  tableBody.innerHTML = `
    <tr class="empty-state">
      <td colspan="6">No records to display. Backend connection required.</td>
    </tr>
  `;
}

// ========== SEARCH FUNCTIONS ==========

let chargeSearchResults = [];
let selectedChargeIndex = null;

function searchCharge() {
  // Open the search modal
  openModal('chargeSearchModal');
  
  // Clear previous search
  document.getElementById('searchChargeIdValue').value = '';
  document.getElementById('searchDescValue').value = '';
  document.getElementById('chargeSearchResultsBody').innerHTML = '<tr><td colspan="3" class="no-results">No results. Enter search criteria and click Search.</td></tr>';
  chargeSearchResults = [];
  selectedChargeIndex = null;
}

async function executeChargeSearch() {
  const chargeId = document.getElementById('searchChargeIdValue').value.trim();
  const description = document.getElementById('searchDescValue').value.trim();
  const chargeIdOp = document.getElementById('searchChargeIdOp').value;
  const descOp = document.getElementById('searchDescOp').value;
  
  if (!ChargeService) {
    showStatusMessage('Service not loaded. Please refresh the page.', 'error');
    return;
  }
  
  try {
    showStatusMessage('Searching...', 'info');
    
    // Build WHERE clause
    let whereConditions = [];
    
    if (chargeId) {
      if (chargeIdOp === 'like') {
        whereConditions.push(`ChargeID LIKE '%${chargeId}%'`);
      } else {
        whereConditions.push(`ChargeID = '${chargeId}'`);
      }
    }
    
    if (description) {
      if (descOp === 'like') {
        whereConditions.push(`Description LIKE '%${description}%'`);
      } else {
        whereConditions.push(`Description = '${description}'`);
      }
    }
    
    const whereStmt = whereConditions.join(' AND ');
    const advFilterString = "BankID='00'";
    const options = {
      OperatorID: HARDCODED_CONFIG.OperatorID,
      ModuleID: 2260,
      OurBranchID: HARDCODED_CONFIG.OurBranchID
    };
    
    const result = await ChargeService.searchCharges(whereStmt, advFilterString, options);
    
    if (result.success && result.data && result.data.Details) {
      const details = result.data.Details;
      
      if (details.length > 0) {
        chargeSearchResults = details;
        displayChargeSearchResults(details);
        showStatusMessage(`Found ${details.length} result(s)`, 'success');
      } else {
        chargeSearchResults = [];
        document.getElementById('chargeSearchResultsBody').innerHTML = '<tr><td colspan="3" class="no-results">No charges found matching your criteria.</td></tr>';
        showStatusMessage('No results found', 'warning');
      }
    } else {
      chargeSearchResults = [];
      document.getElementById('chargeSearchResultsBody').innerHTML = '<tr><td colspan="3" class="no-results">No charges found.</td></tr>';
      showStatusMessage(result.message || 'No results found', 'warning');
    }
  } catch (error) {
    showStatusMessage('Error searching: ' + error.message, 'error');
    console.error('Search error:', error);
  }
}

function displayChargeSearchResults(results) {
  const tbody = document.getElementById('chargeSearchResultsBody');
  tbody.innerHTML = '';
  
  results.forEach((charge, index) => {
    const row = document.createElement('tr');
    row.setAttribute('data-charge-index', index);
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${charge.ChargeID || ''}</td>
      <td>${charge.Description || ''}</td>
    `;
    row.addEventListener('click', function () {
      const idx = parseInt(this.getAttribute('data-charge-index'), 10);
      selectChargeRow(idx);
    });
    row.addEventListener('dblclick', function (e) {
      const idx = parseInt(this.getAttribute('data-charge-index'), 10);
      selectChargeRow(idx);
      selectChargeAndClose(chargeSearchResults[idx]);
    });
    tbody.appendChild(row);
  });
}

function selectChargeRow(index) {
  selectedChargeIndex = index;
  
  // Remove previous selection
  const allRows = document.querySelectorAll('#chargeSearchResultsBody tr');
  allRows.forEach(row => row.classList.remove('selected'));
  
  // Add selection to clicked row
  if (allRows[index]) {
    allRows[index].classList.add('selected');
  }
}

function selectChargeAndClose(selectedCharge) {
  // If called from OK button, fallback to selectedChargeIndex
  if (!selectedCharge) {
    if (selectedChargeIndex === null || !chargeSearchResults[selectedChargeIndex]) {
      showStatusMessage('Please select a charge from the results', 'warning');
      return;
    }
    selectedCharge = chargeSearchResults[selectedChargeIndex];
  }
  // Set the Charge ID in the main form
  document.getElementById('chargeId').value = selectedCharge.ChargeID || '';
  // Close the search modal
  closeModal('chargeSearchModal');
  showStatusMessage('Charge selected: ' + selectedCharge.ChargeID, 'success');
  // Optionally load full charge details
  loadChargeDetails(selectedCharge.ChargeID);
}

async function loadChargeDetails(chargeId) {
  if (!ChargeService) return;
  
  try {
    showStatusMessage('Loading charge details...', 'info');
    
    const requestData = {
      ChargeID: chargeId,
      BankID: HARDCODED_CONFIG.BankID,
      OurBranchID: HARDCODED_CONFIG.OurBranchID,
      OperatorID: HARDCODED_CONFIG.OperatorID,
      Direction: "1"
    };
    
    const result = await ChargeService.getCharge(requestData);
    
    if (result.success) {
      populateFormFromAPI(result.data);
      currentRecord = result.data;
      showStatusMessage('Charge loaded successfully', 'success');
    } else {
      showStatusMessage(result.message || 'Error loading charge details', 'error');
    }
  } catch (error) {
    showStatusMessage('Error loading charge: ' + error.message, 'error');
    console.error('Load error:', error);
  }
}

function navigatePrevious() {
  if (selectedChargeIndex !== null && selectedChargeIndex > 0) {
    selectChargeRow(selectedChargeIndex - 1);
  }
}

function navigateNext() {
  if (selectedChargeIndex !== null && selectedChargeIndex < chargeSearchResults.length - 1) {
    selectChargeRow(selectedChargeIndex + 1);
  }
}

// ========== CURRENCY SEARCH FUNCTIONS ==========

let currencySearchResults = [];
let selectedCurrencyIndex = null;

function searchCurrency() {
  // Open the currency search modal
  openModal('currencySearchModal');
  
  // Clear previous search
  document.getElementById('searchCurrencyIdValue').value = '';
  document.getElementById('searchCurrencyDescValue').value = '';
  document.getElementById('currencySearchResultsBody').innerHTML = '<tr><td colspan="3" class="no-results">No results. Enter search criteria and click Search.</td></tr>';
  currencySearchResults = [];
  selectedCurrencyIndex = null;
}

async function executeCurrencySearch() {
  const currencyId = document.getElementById('searchCurrencyIdValue').value.trim();
  const description = document.getElementById('searchCurrencyDescValue').value.trim();
  const currencyIdOp = document.getElementById('searchCurrencyIdOp').value;
  const descOp = document.getElementById('searchCurrencyDescOp').value;
  
  if (!ChargeService) {
    showStatusMessage('Service not loaded. Please refresh the page.', 'error');
    return;
  }
  
  try {
    showStatusMessage('Searching currencies...', 'info');
    
    // Build WHERE clause
    let whereConditions = [];
    
    if (currencyId) {
      if (currencyIdOp === 'like') {
        whereConditions.push(`CurrencyID LIKE '%${currencyId}%'`);
      } else {
        whereConditions.push(`CurrencyID = '${currencyId}'`);
      }
    }
    
    if (description) {
      if (descOp === 'like') {
        whereConditions.push(`Description LIKE '%${description}%'`);
      } else {
        whereConditions.push(`Description = '${description}'`);
      }
    }
    
    const whereStmt = whereConditions.join(' AND ');
    const advFilterString = "BankID='00'";
    const options = {
      OperatorID: HARDCODED_CONFIG.OperatorID,
      ModuleID: 2260,
      OurBranchID: HARDCODED_CONFIG.OurBranchID
    };
    
    const result = await ChargeService.searchCurrencies(whereStmt, advFilterString, options);
    
    if (result.success && result.data && result.data.Details) {
      const details = result.data.Details;
      
      if (details.length > 0) {
        currencySearchResults = details;
        displayCurrencySearchResults(details);
        showStatusMessage(`Found ${details.length} currency result(s)`, 'success');
      } else {
        currencySearchResults = [];
        document.getElementById('currencySearchResultsBody').innerHTML = '<tr><td colspan="3" class="no-results">No currencies found matching your criteria.</td></tr>';
        showStatusMessage('No results found', 'warning');
      }
    } else {
      currencySearchResults = [];
      document.getElementById('currencySearchResultsBody').innerHTML = '<tr><td colspan="3" class="no-results">No currencies found.</td></tr>';
      showStatusMessage(result.message || 'No results found', 'warning');
    }
  } catch (error) {
    showStatusMessage('Error searching currencies: ' + error.message, 'error');
    console.error('Currency search error:', error);
  }
}

function displayCurrencySearchResults(results) {
  const tbody = document.getElementById('currencySearchResultsBody');
  tbody.innerHTML = '';
  
  results.forEach((currency, index) => {
    const row = document.createElement('tr');
    row.onclick = () => selectCurrencyRow(index);
    row.ondblclick = () => {
      selectCurrencyRow(index);
      selectCurrencyAndClose();
    };
    row.innerHTML = `
      <td>${index + 1}</td>
      <td>${currency.CurrencyID || ''}</td>
      <td>${currency.Description || ''}</td>
    `;
    tbody.appendChild(row);
  });
}

function selectCurrencyRow(index) {
  selectedCurrencyIndex = index;
  
  // Remove previous selection
  const allRows = document.querySelectorAll('#currencySearchResultsBody tr');
  allRows.forEach(row => row.classList.remove('selected'));
  
  // Add selection to clicked row
  if (allRows[index]) {
    allRows[index].classList.add('selected');
  }
}

function selectCurrencyAndClose() {
  if (selectedCurrencyIndex === null || !currencySearchResults[selectedCurrencyIndex]) {
    showStatusMessage('Please select a currency from the results', 'warning');
    return;
  }
  
  const selectedCurrency = currencySearchResults[selectedCurrencyIndex];
  
  // Set the Currency ID in the main form
  document.getElementById('currencyId').value = selectedCurrency.CurrencyID || '';
  
  // Close the search modal
  closeModal('currencySearchModal');
  
  showStatusMessage('Currency selected: ' + selectedCurrency.CurrencyID, 'success');
}

function navigateCurrencyPrevious() {
  if (selectedCurrencyIndex !== null && selectedCurrencyIndex > 0) {
    selectCurrencyRow(selectedCurrencyIndex - 1);
  }
}

function navigateCurrencyNext() {
  if (selectedCurrencyIndex !== null && selectedCurrencyIndex < currencySearchResults.length - 1) {
    selectCurrencyRow(selectedCurrencyIndex + 1);
  }
}

function searchCustomerDescription() {
  showStatusMessage('Search functionality requires backend connection', 'info');
}

function searchGlAccount() {
  showStatusMessage('Search functionality requires backend connection', 'info');
}

// ========== DATE HISTORY MANAGEMENT ==========

function handleNewDate() {
  const effectiveDate = document.getElementById('effectiveDate').value;
  const expiryDate = document.getElementById('expiryDate').value;
  
  if (!effectiveDate) {
    showStatusMessage('Effective Date is required', 'warning');
    document.getElementById('effectiveDate').focus();
    return;
  }
  
  // Validate expiry date is after effective date if provided
  if (expiryDate && new Date(expiryDate) <= new Date(effectiveDate)) {
    showStatusMessage('Expiry Date must be after Effective Date', 'error');
    document.getElementById('expiryDate').focus();
    return;
  }
  
  // Check for duplicate dates
  const duplicate = dateRecords.find(record => 
    record.effectiveDate === effectiveDate
  );
  
  if (duplicate) {
    showStatusMessage('A record with this Effective Date already exists', 'warning');
    return;
  }
  
  // Add new date record
  const newRecord = {
    id: Date.now(),
    effectiveDate: effectiveDate,
    expiryDate: expiryDate || '',
    status: 'Active'
  };
  
  dateRecords.push(newRecord);
  refreshDateHistoryTable();
  
  // Clear the date fields for next entry
  document.getElementById('expiryDate').value = '';
  
  showStatusMessage('Date record added successfully', 'success');
}

function handleAlterDate() {
  if (!selectedDateRow) {
    showStatusMessage('Please select a date record to alter', 'warning');
    return;
  }
  
  const effectiveDate = document.getElementById('effectiveDate').value;
  const expiryDate = document.getElementById('expiryDate').value;
  
  if (!effectiveDate) {
    showStatusMessage('Effective Date is required', 'warning');
    return;
  }
  
  // Validate expiry date is after effective date if provided
  if (expiryDate && new Date(expiryDate) <= new Date(effectiveDate)) {
    showStatusMessage('Expiry Date must be after Effective Date', 'error');
    return;
  }
  
  // Find and update the selected record
  const record = dateRecords.find(r => r.id === selectedDateRow);
  if (record) {
    record.effectiveDate = effectiveDate;
    record.expiryDate = expiryDate || '';
    
    refreshDateHistoryTable();
    showStatusMessage('Date record updated successfully', 'success');
  }
}

function handleRemoveDate() {
  if (!selectedDateRow) {
    showStatusMessage('Please select a date record to remove', 'warning');
    return;
  }
  
  if (confirm('Are you sure you want to remove this date record?')) {
    dateRecords = dateRecords.filter(r => r.id !== selectedDateRow);
    selectedDateRow = null;
    refreshDateHistoryTable();
    
    showStatusMessage('Date record removed successfully', 'success');
  }
}

function handleUpdateDate() {
  // Refresh the table
  refreshDateHistoryTable();
  showStatusMessage('Date history refreshed', 'info');
}

function handleClearDate() {
  if (dateRecords.length === 0) {
    showStatusMessage('No records to clear', 'info');
    return;
  }
  
  if (confirm('Are you sure you want to clear all date records?')) {
    dateRecords = [];
    selectedDateRow = null;
    refreshDateHistoryTable();
    
    // Clear the date fields
    document.getElementById('expiryDate').value = '';
    
    showStatusMessage('All date records cleared', 'info');
  }
}

function refreshDateHistoryTable() {
  const tbody = document.getElementById('dateHistoryTableBody');
  
  if (dateRecords.length === 0) {
    tbody.innerHTML = `
      <tr class="empty-state">
        <td colspan="3">No date records. Click "New" to add.</td>
      </tr>
    `;
    return;
  }
  
  // Sort by effective date descending (most recent first)
  const sortedRecords = [...dateRecords].sort((a, b) => 
    new Date(b.effectiveDate) - new Date(a.effectiveDate)
  );
  
  tbody.innerHTML = sortedRecords.map(record => `
    <tr data-id="${record.id}" onclick="selectDateRow(${record.id})" class="${selectedDateRow === record.id ? 'selected' : ''}">
      <td>${formatDate(record.effectiveDate)}</td>
      <td>${record.expiryDate ? formatDate(record.expiryDate) : ''}</td>
      <td>${record.status}</td>
    </tr>
  `).join('');
}

function selectDateRow(id) {
  selectedDateRow = id;
  
  // Update visual selection
  const tbody = document.getElementById('dateHistoryTableBody');
  const rows = tbody.querySelectorAll('tr');
  rows.forEach(row => {
    if (row.dataset.id == id) {
      row.classList.add('selected');
    } else {
      row.classList.remove('selected');
    }
  });
  
  // Load the record data into form fields
  const record = dateRecords.find(r => r.id === id);
  if (record) {
    document.getElementById('effectiveDate').value = record.effectiveDate;
    document.getElementById('expiryDate').value = record.expiryDate;
  }
}

function formatDate(dateString) {
  if (!dateString) return '';
  
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = date.toLocaleString('en-US', { month: 'short' });
  const year = date.getFullYear();
  
  return `${day}/${month}/${year}`;
}

// ========== STATUS MESSAGING ==========

function showStatusMessage(message, type = 'info') {
  const bar = getMessageBar();
  if (!bar) return;

  bar.className = `am-message-panel show ${type}`;
  const span = bar.querySelector('span');
  if (span) span.textContent = message;

  window.clearTimeout(showStatusMessage._t);
  showStatusMessage._t = window.setTimeout(() => {
    bar.classList.remove('show');
  }, 5000);
}

// ========== KEYBOARD NAVIGATION ==========

document.addEventListener('keydown', function(e) {
  // Ctrl+S to save
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    if (isEditMode) {
      handleSave();
    }
  }
  
  // Escape to cancel
  if (e.key === 'Escape') {
    if (isEditMode) {
      handleCancel();
    }
  }
});
