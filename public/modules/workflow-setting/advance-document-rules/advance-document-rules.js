// Advance Document Rules - Kairo Banking Application

// ========== STATE MANAGEMENT ==========
let isEditMode = false;
let currentRecord = null;

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  initializeForm();
  setupEventListeners();
  disableEdit();
});

function initializeForm() {
  // Set default values if needed
  console.log('Advance Document Rules form initialized');
}

// ========== CARD TOGGLE ==========
function toggleCard(header) {
  header.classList.toggle('collapsed');
  const body = header.nextElementSibling;
  if (body) {
    body.classList.toggle('collapsed');
  }
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
  // Form submit prevention
  document.getElementById('advanceDocumentForm').addEventListener('submit', function(e) {
    e.preventDefault();
  });

  // Advance Module change event
  document.getElementById('advanceModule').addEventListener('change', function() {
    updateDocumentTypeOptions(this.value);
  });
}

// ========== DYNAMIC OPTIONS ==========
function updateDocumentTypeOptions(module) {
  const documentTypeSelect = document.getElementById('documentType');
  
  // Clear existing options except first
  documentTypeSelect.innerHTML = '<option value="">--Select--</option>';
  
  // Add module-specific document types
  let options = [];
  switch(module) {
    case 'loans':
      options = [
        { value: 'loan_application', text: 'Loan Application' },
        { value: 'loan_agreement', text: 'Loan Agreement' },
        { value: 'collateral_document', text: 'Collateral Document' },
        { value: 'disbursement_form', text: 'Disbursement Form' }
      ];
      break;
    case 'accounts':
      options = [
        { value: 'account_opening', text: 'Account Opening' },
        { value: 'mandate_form', text: 'Mandate Form' },
        { value: 'closure_form', text: 'Closure Form' }
      ];
      break;
    case 'deposits':
      options = [
        { value: 'deposit_form', text: 'Deposit Form' },
        { value: 'withdrawal_form', text: 'Withdrawal Form' },
        { value: 'fixed_deposit', text: 'Fixed Deposit Certificate' }
      ];
      break;
    default:
      options = [
        { value: 'general', text: 'General Document' },
        { value: 'kyc_document', text: 'KYC Document' },
        { value: 'agreement', text: 'Agreement' }
      ];
  }
  
  options.forEach(option => {
    const opt = document.createElement('option');
    opt.value = option.value;
    opt.textContent = option.text;
    documentTypeSelect.appendChild(opt);
  });
}

// ========== SEARCH FUNCTION ==========
function searchRule() {
  showStatusMessage('Search functionality requires backend connection', 'info');
  console.log('Search Rule triggered');
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
  document.getElementById('ruleId').focus();
  
  showStatusMessage('Add new document rule - fill in required fields', 'info');
}

function handleEdit() {
  if (!currentRecord) {
    showStatusMessage('Please select a record to edit', 'warning');
    return;
  }

  isEditMode = true;
  enableFormFields();
  
  // Rule ID should remain readonly when editing
  document.getElementById('ruleId').readOnly = true;
  
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

  if (confirm('Are you sure you want to delete this document rule? This action cannot be undone.')) {
    deleteRecord(currentRecord);
  }
}

function handleCancel() {
  if (isEditMode) {
    if (confirm('Discard all changes?')) {
      isEditMode = false;
      
      if (currentRecord) {
        loadRecordData(currentRecord);
      } else {
        clearForm();
      }
      
      disableEdit();
      showStatusMessage('Changes discarded', 'info');
    }
  } else {
    clearForm();
    currentRecord = null;
    showStatusMessage('Form cleared', 'info');
  }
}

// ========== FORM MANAGEMENT ==========
function enableFormFields() {
  const form = document.getElementById('advanceDocumentForm');
  const inputs = form.querySelectorAll('input:not([readonly]), select, textarea');
  
  inputs.forEach(input => {
    if (!input.id.startsWith('created') && 
        !input.id.startsWith('modified') && 
        !input.id.startsWith('supervised')) {
      input.disabled = false;
    }
  });
  
  document.getElementById('saveBtn').disabled = false;
  document.getElementById('cancelBtn').disabled = false;
}

function disableEdit() {
  const form = document.getElementById('advanceDocumentForm');
  const inputs = form.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    input.disabled = true;
  });
  
  document.getElementById('saveBtn').disabled = true;
  document.getElementById('cancelBtn').disabled = true;
  
  isEditMode = false;
}

function clearForm() {
  const form = document.getElementById('advanceDocumentForm');
  
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

function loadRecordData(record) {
  // This function would load data from the record object
  // Backend connection required
  console.log('Loading record:', record);
}

function collectFormData() {
  const form = document.getElementById('advanceDocumentForm');
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
    { id: 'ruleId', label: 'Rule ID' },
    { id: 'description', label: 'Description' },
    { id: 'advanceModule', label: 'Advance Module' },
    { id: 'documentClass', label: 'Document Class' }
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
  
  return true;
}

// ========== DATA OPERATIONS (Backend Integration Required) ==========
function createRecord(formData) {
  // Backend API call required
  console.log('Creating record:', formData);
  
  // Simulate success
  const currentUser = 'System User';
  const currentDateTime = new Date().toLocaleString();
  
  document.getElementById('createdBy').value = currentUser;
  document.getElementById('createdOn').value = currentDateTime;
  
  currentRecord = { ...formData, id: Date.now() };
  isEditMode = false;
  disableEdit();
  
  showStatusMessage('Document rule created successfully', 'success');
}

function updateRecord(formData) {
  // Backend API call required
  console.log('Updating record:', formData);
  
  // Simulate success
  const currentUser = 'System User';
  const currentDateTime = new Date().toLocaleString();
  
  document.getElementById('modifiedBy').value = currentUser;
  document.getElementById('modifiedOn').value = currentDateTime;
  
  currentRecord = { ...currentRecord, ...formData };
  isEditMode = false;
  disableEdit();
  
  showStatusMessage('Document rule updated successfully', 'success');
}

function deleteRecord(record) {
  // Backend API call required
  console.log('Deleting record:', record);
  
  // Simulate success
  currentRecord = null;
  clearForm();
  disableEdit();
  
  showStatusMessage('Document rule deleted successfully', 'success');
}

// ========== STATUS MESSAGING ==========
function showStatusMessage(message, type = 'info') {
  const statusDiv = document.getElementById('statusMessage');
  
  // Set icon based on type
  let icon = '';
  switch(type) {
    case 'success':
      icon = '<i class="bi bi-check-circle"></i>';
      break;
    case 'error':
      icon = '<i class="bi bi-exclamation-triangle"></i>';
      break;
    case 'warning':
      icon = '<i class="bi bi-exclamation-circle"></i>';
      break;
    case 'info':
      icon = '<i class="bi bi-info-circle"></i>';
      break;
  }
  
  statusDiv.innerHTML = `${icon} <span>${message}</span>`;
  statusDiv.className = `status-message ${type} show`;
  
  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusDiv.classList.remove('show');
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
