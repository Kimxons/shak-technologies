// Kairo Banking Application - Charge Rates Module

// ========== STATE MANAGEMENT ==========
let isEditMode = false;
let currentRecord = null;
let activeSection = 'rates';

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  initSectionToggles();
  initHeaderControls();
  initActionRouting();

  initializeForm();
  setupEventListeners();
  disableEdit();
});

// ========================================
// STANDARDIZED SHELL HELPERS
// ========================================
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
      window.location.reload();
      return;
    }
  });
}

function initActionRouting() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    switch (action) {
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
      case 'close':
        closeThisWindowOrModal();
        break;
      default:
        break;
    }
  });
}

function initializeForm() {
  // Set current date as effective date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('effectiveDate').value = today;
  
  // Set default values
  document.getElementById('ceilingAmountType').value = '';
  document.getElementById('calculationMethod').value = '';
  document.getElementById('rateType').value = '';
}

function setupEventListeners() {
  // Form submit prevention
  document.getElementById('chargeRatesForm').addEventListener('submit', function(e) {
    e.preventDefault();
  });

  // Calculation method change
  document.getElementById('calculationMethod').addEventListener('change', function() {
    updateFieldVisibility();
  });

  // Ceiling amount type change
  document.getElementById('ceilingAmountType').addEventListener('change', function() {
    const ceilingAmount = document.getElementById('ceilingAmount');
    if (this.value === 'unlimited') {
      ceilingAmount.disabled = true;
      ceilingAmount.value = '';
    } else {
      ceilingAmount.disabled = false;
    }
  });

  // Apply minimum/maximum checkbox handlers
  document.getElementById('applyMinimum').addEventListener('change', function() {
    document.getElementById('minCharge').disabled = !this.checked;
    if (!this.checked) {
      document.getElementById('minCharge').value = '';
    }
  });

  document.getElementById('applyMaximum').addEventListener('change', function() {
    document.getElementById('maximumCharge').disabled = !this.checked;
    if (!this.checked) {
      document.getElementById('maximumCharge').value = '';
    }
  });
}

function updateFieldVisibility() {
  const method = document.getElementById('calculationMethod').value;
  const chargeValue = document.getElementById('chargeValue');
  const fixedAmount = document.getElementById('fixedAmount');

  switch(method) {
    case 'fixed':
      fixedAmount.disabled = false;
      chargeValue.disabled = true;
      chargeValue.value = '';
      break;
    case 'percentage':
      fixedAmount.disabled = true;
      fixedAmount.value = '';
      chargeValue.disabled = false;
      break;
    case 'tiered':
    case 'slab':
      fixedAmount.disabled = false;
      chargeValue.disabled = false;
      break;
    default:
      fixedAmount.disabled = true;
      chargeValue.disabled = true;
      fixedAmount.value = '';
      chargeValue.value = '';
  }
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
  document.getElementById('effectiveDate').focus();
  
  showStatusMessage('Add new charge rate - fill in required fields', 'info');
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

  if (confirm('Are you sure you want to delete this charge rate? This action cannot be undone.')) {
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
  const form = document.getElementById('chargeRatesForm');
  const inputs = form.querySelectorAll('input:not([readonly]), select, textarea');
  
  inputs.forEach(input => {
    if (!input.id.startsWith('created') && 
        !input.id.startsWith('modified') && 
        !input.id.startsWith('supervised')) {
      input.disabled = false;
    }
  });
  
  // Apply conditional disabling based on checkboxes
  document.getElementById('minCharge').disabled = !document.getElementById('applyMinimum').checked;
  document.getElementById('maximumCharge').disabled = !document.getElementById('applyMaximum').checked;
  
  updateFieldVisibility();
}

function disableEdit() {
  const form = document.getElementById('chargeRatesForm');
  const inputs = form.querySelectorAll('input, select, textarea');
  
  inputs.forEach(input => {
    input.disabled = true;
  });
  
  isEditMode = false;
}

function clearForm() {
  const form = document.getElementById('chargeRatesForm');
  
  // Clear all inputs
  form.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]').forEach(input => {
    if (!input.readOnly) {
      input.value = '';
    }
  });
  
  // Clear textareas
  form.querySelectorAll('textarea').forEach(textarea => {
    textarea.value = '';
  });
  
  // Reset selects
  form.querySelectorAll('select').forEach(select => {
    select.selectedIndex = 0;
  });
  
  // Uncheck checkboxes
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

function loadRecordData(record) {
  // Backend connection required
  console.log('Loading record:', record);
}

function collectFormData() {
  const form = document.getElementById('chargeRatesForm');
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

function validateForm() {
  const requiredFields = [
    { id: 'effectiveDate', label: 'Effective Date' },
    { id: 'calculationMethod', label: 'Calculation Method' }
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
  
  // Validate min/max charges
  const minCharge = parseFloat(document.getElementById('minCharge').value) || 0;
  const maxCharge = parseFloat(document.getElementById('maximumCharge').value) || 0;
  
  if (minCharge > 0 && maxCharge > 0 && minCharge > maxCharge) {
    showStatusMessage('Minimum Charge cannot be greater than Maximum Charge', 'error');
    document.getElementById('minCharge').focus();
    return false;
  }
  
  return true;
}

// ========== DATA OPERATIONS (Backend Integration Required) ==========

function createRecord(formData) {
  console.log('Creating record:', formData);
  
  const currentUser = 'System User';
  const currentDateTime = new Date().toLocaleString();
  
  document.getElementById('createdBy').value = currentUser;
  document.getElementById('createdOn').value = currentDateTime;
  
  currentRecord = { ...formData, id: Date.now() };
  isEditMode = false;
  disableEdit();
  
  showStatusMessage('Charge rate created successfully', 'success');
  loadRatesTable();
}

function updateRecord(formData) {
  console.log('Updating record:', formData);
  
  const currentUser = 'System User';
  const currentDateTime = new Date().toLocaleString();
  
  document.getElementById('modifiedBy').value = currentUser;
  document.getElementById('modifiedOn').value = currentDateTime;
  
  currentRecord = { ...currentRecord, ...formData };
  isEditMode = false;
  disableEdit();
  
  showStatusMessage('Charge rate updated successfully', 'success');
  loadRatesTable();
}

function deleteRecord(record) {
  console.log('Deleting record:', record);
  
  currentRecord = null;
  clearForm();
  disableEdit();
  
  showStatusMessage('Charge rate deleted successfully', 'success');
  loadRatesTable();
}

function loadRatesTable() {
  const tableBody = document.getElementById('ratesTableBody');
  
  tableBody.innerHTML = `
    <tr class="empty-state">
      <td colspan="7">No records to display. Backend connection required.</td>
    </tr>
  `;
}

// ========== SEARCH FUNCTIONS ==========

function searchEffectiveDate() {
  showStatusMessage('Search functionality requires backend connection', 'info');
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
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    if (isEditMode) {
      handleSave();
    }
  }
  
  if (e.key === 'Escape') {
    if (isEditMode) {
      handleCancel();
    }
  }
});
