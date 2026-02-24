// Collateral Properties Details - Kairo Banking Application

// ========== STATE MANAGEMENT ==========
let isEditMode = false;
let currentDetailRecord = null;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  initializeServices();
  initializeDetailForm();
  setupDetailEventListeners();
  setupStandardShell();
  wireWindowControls();
  disableDetailEdit();
  
  // Expose loadCollateralProperties globally so parent can call it when modal opens
  window.loadCollateralProperties = loadCollateralProperties;
});

// ========== LOAD COLLATERAL PROPERTIES (Called by parent when modal opens) ==========
async function loadCollateralProperties(branchId, collateralId) {
  if (!branchId || !collateralId) {
    console.warn('loadCollateralProperties: Missing BranchID or CollateralID');
    return;
  }
  
  console.log('loadCollateralProperties called with:', { branchId, collateralId });
  await fetchAndBindCollateralProperties(branchId, collateralId);
}

// Fetch collateral properties using CollateralService
async function fetchAndBindCollateralProperties(branchId, collateralId) {
  try {
    // Wait for CollateralService to be available
    await waitForCollateralService();
    
    const operatorId = sessionStorage.getItem('operatorId') || sessionStorage.getItem('username') || 'ADMIN';
    
    const requestData = {
      OurBranchID: branchId,
      CollateralID: collateralId,
      RefNo: 0,        // Default to 0
      OperatorID: operatorId,
      Direction: 0     // Default to 0
    };
    
    console.log('Fetching collateral properties:', requestData);
    
    const result = await window.CollateralService.getCollateralProperties(requestData);
    
    if (result.success) {
      console.log('Collateral properties loaded:', result.data);
      bindCollateralPropertiesData(result.data);
    } else {
      console.error('Failed to load collateral properties:', result.message);
      showDetailStatusMessage(result.message || 'Failed to load collateral properties', 'error');
    }
  } catch (error) {
    console.error('Error fetching collateral properties:', error);
    showDetailStatusMessage('Error loading collateral properties', 'error');
  }
}

// Wait for CollateralService to be available
function waitForCollateralService() {
  return new Promise((resolve) => {
    const checkService = () => {
      if (typeof window.CollateralService !== 'undefined' && window.CollateralService.getCollateralProperties) {
        resolve();
      } else {
        setTimeout(checkService, 100);
      }
    };
    checkService();
  });
}

// Bind all data from the response to form fields
function bindCollateralPropertiesData(data) {
  const details01 = (data.Details01 && data.Details01[0]) ? data.Details01[0] : {};
  const details02 = (data.Details02 && data.Details02[0]) ? data.Details02[0] : {};
  
  console.log('Binding collateral properties - Details01:', details01);
  console.log('Binding collateral properties - Details02:', details02);
  
  // ===== More Details Section (from Details02) =====
  setFieldValue('documentNo', details02.PropertyDocNo);
  setFieldValue('referenceNo', details02.RefNo);
  setFieldValue('documentDate', formatDateForInput(details02.PropertyDocDate));
  setFieldValue('city', details02.City);
  setFieldValue('landArea', details02.LandArea);
  setFieldValue('superBuildUpArea', details02.BuildArea);
  setFieldValue('constructionYear', details02.ConstructionYear);
  setFieldValue('builderName', details02.BuilderName);
  setFieldValue('typeOfBuilding', details02.TypeofBuilding);
  setFieldValue('certificateOfTitleNumber', details02.CertificateofTitleNumber);
  setFieldValue('placeIdentificationNumber', details02.Placeidentificationnumber);
  setFieldValue('location', details02.Location);
  
  // Leased checkbox
  const leasedCheckbox = document.getElementById('leased');
  if (leasedCheckbox) {
    leasedCheckbox.checked = details02.IsLeased === true;
    // Trigger change event to enable/disable dependent fields
    leasedCheckbox.dispatchEvent(new Event('change'));
  }
  
  setFieldValue('leaseExpiryDate', formatDateForInput(details02.LeasedExpiryDate));
  setFieldValue('leaseLoanAmount', details02.leaseloanamount);
  setFieldValue('constructionCost', details02.ConstructionCost);
  setFieldValue('valuationDate', formatDateForInput(details02.ValuationDate));
  setFieldValue('valuedBy', details02.ValuationBy);
  setFieldValue('marketValue', details02.MarketValue);
  setFieldValue('invoiceValue', details02.InvoiceValue);
  setFieldValue('forcedSaleValue', details02.WrittenDownValue);
  setFieldValue('address', details02.Address);
  setFieldValue('remarksDetail', details02.Remarks);
  
  // ===== Behind The Scene Section =====
  // From Details01
  setFieldValue('collateralValueDetail', details01.CollateralValue);
  setFieldValue('currencyIdDetail', details01.CurrencyID);
  setFieldValue('usedCollateralValueDetail', details01.CollateralValueUsed);
  setFieldValue('withdrawnDateDetail', formatDateForInput(details01.WithdrawnDate));
  setFieldValue('collateralStatus', details01.CollateralStatus);
  setFieldValue('recordStatus', details02.CollateralDetailStatus);
  
  // Audit fields from Details02
  setFieldValue('createdByDetail', details02.CreatedBy);
  setFieldValue('createdOnDetail', formatDateForDisplay(details02.CreatedOn));
  setFieldValue('supervisedByDetail', details02.SupervisedBy);
  setFieldValue('supervisedOnDetail', formatDateForDisplay(details02.SupervisedOn));
  
  // Trigger auto-grow for textareas after populating
  triggerAutoGrow('address');
  triggerAutoGrow('remarksDetail');
  
  console.log('Collateral properties data bound successfully');
}

// Helper to set field value safely
function setFieldValue(fieldId, value) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.value = value ?? '';
  }
}

// Helper to trigger auto-grow on textareas
function triggerAutoGrow(fieldId) {
  const textarea = document.getElementById(fieldId);
  if (textarea) {
    textarea.dispatchEvent(new Event('input'));
  }
}

// Helper function to format date for input[type="date"]
function formatDateForInput(dateValue) {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    return date.toISOString().split('T')[0];
  } catch (e) {
    return '';
  }
}

// Helper function to format date for display
function formatDateForDisplay(dateValue) {
  if (!dateValue) return '';
  try {
    const date = new Date(dateValue);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: '2-digit', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '';
  }
}

function setupStandardShell() {
  // Sidebar collapse
  const sidebar = document.getElementById('main-sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebar && sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      sidebarToggle.setAttribute('aria-expanded', String(!isCollapsed));
    });
  }

  // Nav section expand/collapse
  document.querySelectorAll('.nav-arrow[aria-controls]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const controlsId = btn.getAttribute('aria-controls');
      const target = controlsId ? document.getElementById(controlsId) : null;
      if (!target) return;

      const isExpanded = btn.getAttribute('aria-expanded') !== 'false';
      btn.setAttribute('aria-expanded', String(!isExpanded));
      const section = btn.closest('[data-nav-section]');
      if (section) section.classList.toggle('is-open', !isExpanded);
    });
  });

  // Form section collapse/expand
  document.querySelectorAll('[data-section-toggle]').forEach((header) => {
    header.addEventListener('click', (e) => {
      const toggleBtn = header.querySelector('.section-toggle-btn');
      if (!toggleBtn) return;

      // Ignore clicks on interactive elements inside header
      if (e.target instanceof Element) {
        const isInteractive = e.target.closest('button, a, input, select, textarea');
        if (isInteractive && isInteractive !== toggleBtn) return;
      }

      const section = header.closest('.form-section');
      const content = section ? section.querySelector('[data-section-content]') : null;
      if (!section || !content) return;

      const isCollapsed = section.classList.contains('collapsed');
      section.classList.toggle('collapsed', !isCollapsed);
      toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
    });
  });

  // Window control wiring (iframe-safe)
}

function wireWindowControls() {
  const header = document.querySelector('.am-header__right');
  if (!header) return;

  header.querySelectorAll('[data-action]').forEach((btn) => {
    const action = btn.getAttribute('data-action');
    btn.addEventListener('click', (e) => {
      e.preventDefault();

      if (action === 'refresh') {
        window.location.reload();
        return;
      }

      if (action === 'minimize') {
        // No-op (kept for parity with standard window chrome)
        return;
      }

      if (action === 'maximize') {
        const windowEl = document.querySelector('.window');
        if (!windowEl) return;
        const isMaximized = windowEl.classList.toggle('maximized');

        const icon = btn.querySelector('i');
        if (icon) icon.className = isMaximized ? 'bi bi-fullscreen-exit' : 'bi bi-square';
        btn.title = isMaximized ? 'Restore' : 'Maximize';
        btn.setAttribute('aria-label', isMaximized ? 'Restore' : 'Maximize');
        return;
      }

      if (action === 'close') {
        closeModal();
      }
    });
  });
}

// ========== SERVICE INITIALIZATION ==========
async function initializeServices() {
  try {
    // Wait for services to be available
    await waitForServices();
    
    // Load dropdown options from database
    await Promise.all([
      loadCities(),
      loadBuildingTypes()
    ]);
    
    console.log('Collateral Properties Details services initialized successfully');
  } catch (error) {
    console.error('Error initializing services:', error);
  }
}

function waitForServices() {
  return new Promise((resolve) => {
    const checkServices = () => {
      if (typeof LookupService !== 'undefined' && LookupService.getSystemCodeOptions) {
        resolve();
      } else {
        setTimeout(checkServices, 100);
      }
    };
    checkServices();
  });
}

// ========== DROPDOWN LOADING ==========
async function loadCities() {
  try {
    const citySelect = document.getElementById('city');
    if (!citySelect) return;
    
    const options = await LookupService.getSystemCodeOptions('CityID');
    
    // Clear existing options except placeholder
    citySelect.innerHTML = '<option value="">--Select--</option>';
    
    // Add options from database
    options.forEach(option => {
      const optElement = document.createElement('option');
      optElement.value = option.value;
      optElement.textContent = option.label;
      citySelect.appendChild(optElement);
    });
    
    console.log('Cities loaded:', options.length);
  } catch (error) {
    console.error('Error loading cities:', error);
  }
}

async function loadBuildingTypes() {
  try {
    const buildingTypeSelect = document.getElementById('typeOfBuilding');
    if (!buildingTypeSelect) return;
    
    const options = await LookupService.getSystemCodeOptions('BuildingTypeID');
    
    // Clear existing options except placeholder
    buildingTypeSelect.innerHTML = '<option value="">--Select--</option>';
    
    // Add options from database
    options.forEach(option => {
      const optElement = document.createElement('option');
      optElement.value = option.value;
      optElement.textContent = option.label;
      buildingTypeSelect.appendChild(optElement);
    });
    
    console.log('Building types loaded:', options.length);
  } catch (error) {
    console.error('Error loading building types:', error);
  }
}

function initializeDetailForm() {
  // Set default values
  document.getElementById('collateralStatus').value = 'Active';
  document.getElementById('recordStatus').value = 'Active';
  
  // Set default coordinates
  document.getElementById('latitude').placeholder = '-1.304804';
  document.getElementById('longitude').placeholder = '36.847397';
}

// ========== EVENT LISTENERS ==========
function setupDetailEventListeners() {
  // Form submit prevention
  document.getElementById('moreDetailsForm').addEventListener('submit', function(e) {
    e.preventDefault();
  });

  // Leased checkbox dependency
  document.getElementById('leased').addEventListener('change', function() {
    const leaseExpiryDate = document.getElementById('leaseExpiryDate');
    const leaseLoanAmount = document.getElementById('leaseLoanAmount');
    
    if (this.checked) {
      leaseExpiryDate.disabled = false;
      leaseLoanAmount.disabled = false;
    } else {
      leaseExpiryDate.disabled = true;
      leaseLoanAmount.disabled = true;
      leaseExpiryDate.value = '';
      leaseLoanAmount.value = '';
    }
  });

  // Initialize leased field state
  const leased = document.getElementById('leased');
  document.getElementById('leaseExpiryDate').disabled = !leased.checked;
  document.getElementById('leaseLoanAmount').disabled = !leased.checked;
}

// ========== MODAL FUNCTIONS ==========
function closeModal() {
  if (window.parent && window.parent.closeModal) {
    window.parent.closeModal('collateralPropertiesDetailsModal');
  }
}

// ========== CRUD OPERATIONS ==========
function addDetail() {
  isEditMode = true;
  currentDetailRecord = null;
  
  clearDetailForm();
  enableDetailFormFields();
  
  document.getElementById('documentNo').focus();
  showDetailStatusMessage('Add new detail - fill in required fields', 'info');
}

function editDetail() {
  if (!currentDetailRecord) {
    showDetailStatusMessage('Please select a record to edit', 'warning');
    return;
  }

  isEditMode = true;
  enableDetailFormFields();
  
  showDetailStatusMessage('Edit mode enabled - modify fields and save', 'info');
}

function saveDetail() {
  if (!validateDetailForm()) {
    return;
  }

  const formData = collectDetailFormData();
  
  if (currentDetailRecord) {
    updateDetailRecord(formData);
  } else {
    createDetailRecord(formData);
  }
}

function deleteDetail() {
  if (!currentDetailRecord) {
    showDetailStatusMessage('Please select a record to delete', 'warning');
    return;
  }

  if (confirm('Are you sure you want to delete this detail record?')) {
    deleteDetailRecord(currentDetailRecord);
  }
}

function cancelDetail() {
  if (isEditMode) {
    if (confirm('Discard all changes?')) {
      isEditMode = false;
      
      if (currentDetailRecord) {
        loadDetailRecordData(currentDetailRecord);
      } else {
        clearDetailForm();
      }
      
      disableDetailEdit();
      showDetailStatusMessage('Changes discarded', 'info');
    }
  } else {
    clearDetailForm();
    currentDetailRecord = null;
    showDetailStatusMessage('Form cleared', 'info');
  }
}

function goBackToMain() {
  closeModal();
}

// ========== VIEW MAP ==========
function viewMap() {
  const latitude = document.getElementById('latitude').value || '-1.304804';
  const longitude = document.getElementById('longitude').value || '36.847397';
  
  const mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}`;
  window.open(mapUrl, '_blank');
}

// ========== FORM MANAGEMENT ==========
function enableDetailFormFields() {
  const form = document.getElementById('moreDetailsForm');
  const inputs = form.querySelectorAll('input:not([readonly]), select, textarea');
  
  inputs.forEach(input => {
    if (!input.id.includes('Detail') || 
        input.id === 'remarksDetail') {
      if (!input.id.startsWith('created') && 
          !input.id.startsWith('supervised') &&
          !input.id.includes('Status') &&
          input.id !== 'collateralValueDetail' &&
          input.id !== 'currencyIdDetail' &&
          input.id !== 'usedCollateralValueDetail' &&
          input.id !== 'withdrawnDateDetail') {
        input.disabled = false;
      }
    }
  });
  
  document.getElementById('saveDetailBtn').disabled = false;
  document.getElementById('cancelDetailBtn').disabled = false;
}

function disableDetailEdit() {
  const form = document.getElementById('moreDetailsForm');
  const inputs = form.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    input.disabled = true;
  });
  
  document.getElementById('saveDetailBtn').disabled = true;
  document.getElementById('cancelDetailBtn').disabled = true;
  
  isEditMode = false;
}

function clearDetailForm() {
  const form = document.getElementById('moreDetailsForm');
  
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
  
  // Clear readonly fields
  document.getElementById('collateralValueDetail').value = '';
  document.getElementById('currencyIdDetail').value = '';
  document.getElementById('usedCollateralValueDetail').value = '';
  document.getElementById('withdrawnDateDetail').value = '';
  document.getElementById('createdByDetail').value = '';
  document.getElementById('createdOnDetail').value = '';
  document.getElementById('supervisedByDetail').value = '';
  document.getElementById('supervisedOnDetail').value = '';
  
  initializeDetailForm();
}

function loadDetailRecordData(record) {
  console.log('Loading detail record:', record);
  // Backend integration required
}

function collectDetailFormData() {
  const form = document.getElementById('moreDetailsForm');
  const formData = {};
  
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
function validateDetailForm() {
  const requiredFields = [
    { id: 'documentNo', label: 'Document No' }
  ];
  
  for (const field of requiredFields) {
    const input = document.getElementById(field.id);
    
    if (!input.value.trim()) {
      showDetailStatusMessage(`${field.label} is required`, 'error');
      input.focus();
      
      return false;
    }
  }
  
  return true;
}

// ========== DATA OPERATIONS ==========
function createDetailRecord(formData) {
  console.log('Creating detail record:', formData);
  
  const currentUser = 'System User';
  const currentDateTime = new Date().toLocaleString();
  
  document.getElementById('createdByDetail').value = currentUser;
  document.getElementById('createdOnDetail').value = currentDateTime;
  document.getElementById('collateralStatus').value = 'Active';
  document.getElementById('recordStatus').value = 'Active';
  
  currentDetailRecord = { ...formData, id: Date.now() };
  isEditMode = false;
  disableDetailEdit();
  
  showDetailStatusMessage('Detail record created successfully', 'success');
}

function updateDetailRecord(formData) {
  console.log('Updating detail record:', formData);
  
  const currentUser = 'System User';
  const currentDateTime = new Date().toLocaleString();
  
  document.getElementById('supervisedByDetail').value = currentUser;
  document.getElementById('supervisedOnDetail').value = currentDateTime;
  
  currentDetailRecord = { ...currentDetailRecord, ...formData };
  isEditMode = false;
  disableDetailEdit();
  
  showDetailStatusMessage('Detail record updated successfully', 'success');
}

function deleteDetailRecord(record) {
  console.log('Deleting detail record:', record);
  
  currentDetailRecord = null;
  clearDetailForm();
  disableDetailEdit();
  
  showDetailStatusMessage('Detail record deleted successfully', 'success');
}

// ========== STATUS MESSAGING ==========
function showDetailStatusMessage(message, type = 'info') {
  // Try to show message in parent window if available
  if (window.parent && window.parent.showStatusMessage) {
    window.parent.showStatusMessage(message, type);
    return;
  }

  // Local fallback (use shared message panel if present)
  const panel = document.querySelector('.am-message-panel');
  if (panel) {
    panel.classList.remove('error', 'success', 'info', 'warning', 'show');
    panel.classList.add(type);
    const text = panel.querySelector('span');
    if (text) text.textContent = message;
    panel.classList.add('show');
    return;
  }

  console.log(`[${type.toUpperCase()}] ${message}`);
}

// ========== KEYBOARD NAVIGATION ==========
document.addEventListener('keydown', function(e) {
  // Ctrl+S to save
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    if (isEditMode) {
      saveDetail();
    }
  }
  
  // Escape to cancel or close
  if (e.key === 'Escape') {
    if (isEditMode) {
      cancelDetail();
    } else {
      closeModal();
    }
  }
});
