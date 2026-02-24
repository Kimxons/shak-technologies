// Kairo Banking Application - Slab Details Module

// ========== STATE MANAGEMENT ==========
let isEditMode = false;
let currentRecord = null;
let slabData = [];

// ========================================
// STANDARD UI HELPERS
// ========================================
function getMessageBar() {
  return document.querySelector('.am-message-panel');
}

function showMessage(text, type, timeoutMs) {
  const t = type || 'info';
  const ms = typeof timeoutMs === 'number' ? timeoutMs : 3000;
  const bar = getMessageBar();
  if (!bar) return;

  bar.className = `am-message-panel show ${t}`;
  const span = bar.querySelector('span');
  if (span) span.textContent = text;

  window.clearTimeout(showMessage._t);
  showMessage._t = window.setTimeout(() => {
    bar.classList.remove('show');
  }, ms);
}

function setAuditValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = (value === null || value === undefined || value === '') ? '-' : String(value);
}

function clearAuditValues() {
  setAuditValue('createdBy', '-');
  setAuditValue('modifiedBy', '-');
  setAuditValue('supervisedBy', '-');
  setAuditValue('createdOn', '-');
  setAuditValue('modifiedOn', '-');
  setAuditValue('supervisedOn', '-');
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

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  initializeForm();
  setupEventListeners();
  disableEdit();

  initHeaderControls();
  initSectionToggles();
  initActionPanel();
});

function initializeForm() {
  // Set current date as effective date
  const today = new Date().toISOString().split('T')[0];
  document.getElementById('effectiveDate').value = today;

  clearAuditValues();
}

function setupEventListeners() {
  // Form submit prevention
  document.getElementById('slabDetailsForm').addEventListener('submit', function(e) {
    e.preventDefault();
  });
}

// ========================================
// STANDARD SHELL WIRING
// ========================================
function initHeaderControls() {
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'refresh') {
      window.location.reload();
      return;
    }

    if (action === 'close') {
      closeThisWindowOrModal();
    }
  });
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

function initActionPanel() {
  const actionPanel = document.querySelector('.action-panel');
  if (!actionPanel) return;

  actionPanel.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'view') return handleView();
    if (action === 'add') return handleAdd();
    if (action === 'edit') return handleEdit();
    if (action === 'delete') return handleDelete();
    if (action === 'save') return handleSave();
    if (action === 'cancel') return handleCancel();
    if (action === 'back') return handleBack();
  });

  const form = document.getElementById('slabDetailsForm');
  if (!form) return;
  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'searchEffectiveDate') return searchEffectiveDate();
    if (action === 'spreadDown') return adjustSpread(-1);
    if (action === 'spreadUp') return adjustSpread(1);
    if (action === 'gridNew') return handleNew();
    if (action === 'gridAlter') return handleAlter();
    if (action === 'gridUpdate') return handleUpdate();
    if (action === 'gridRemove') return handleRemove();
    if (action === 'gridClear') return handleClear();
  });
}

// ========== SPREAD ADJUSTMENT ==========
function adjustSpread(delta) {
  const spreadInput = document.getElementById('spread');
  const currentValue = parseFloat(spreadInput.value) || 0;
  spreadInput.value = (currentValue + delta).toFixed(2);
}

// ========== SEARCH FUNCTIONS ==========
function searchEffectiveDate() {
  console.log('Search Effective Date clicked');
  // Backend integration point
}

// ========== GRID ACTIONS ==========
function handleNew() {
  if (!validateSlabFields()) {
    return;
  }
  
  const slabRecord = getSlabFormData();
  slabData.push(slabRecord);
  populateSlabTable();
  clearSlabFields();
  
  console.log('New slab record added:', slabRecord);
}

function handleAlter() {
  if (currentRecord === null) {
    alert('Please select a record from the table to alter.');
    return;
  }
  
  console.log('Alter record:', currentRecord);
}

function handleUpdate() {
  if (currentRecord === null) {
    alert('Please select a record from the table to update.');
    return;
  }
  
  if (!validateSlabFields()) {
    return;
  }
  
  const slabRecord = getSlabFormData();
  slabData[currentRecord] = slabRecord;
  populateSlabTable();
  clearSlabFields();
  currentRecord = null;
  
  console.log('Record updated');
}

function handleRemove() {
  if (currentRecord === null) {
    alert('Please select a record from the table to remove.');
    return;
  }
  
  if (confirm('Are you sure you want to remove this record?')) {
    slabData.splice(currentRecord, 1);
    populateSlabTable();
    clearSlabFields();
    currentRecord = null;
    console.log('Record removed');
  }
}

function handleClear() {
  clearSlabFields();
  currentRecord = null;
}

// ========== CRUD OPERATIONS ==========
function handleView() {
  disableEdit();
  console.log('View mode');
}

function handleAdd() {
  clearForm();
  enableEdit();
  isEditMode = true;
  currentRecord = null;
  
  document.getElementById('effectiveDate').focus();
}

function handleEdit() {
  enableEdit();
  isEditMode = true;
}

function handleDelete() {
  const effectiveDate = document.getElementById('effectiveDate').value;
  if (!effectiveDate) {
    alert('Please select a slab details record to delete.');
    return;
  }
  
  if (confirm('Are you sure you want to delete this slab details record?')) {
    console.log('Delete record');
    slabData = [];
    populateSlabTable();
  }
}

function handleSave() {
  if (!validateForm()) {
    return;
  }
  
  const formData = getFormData();
  console.log('Save data:', formData);
  alert('Slab details saved successfully.');
  
  disableEdit();
  isEditMode = false;
}

function handleCancel() {
  if (isEditMode) {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      clearForm();
      disableEdit();
      isEditMode = false;
      currentRecord = null;
    }
  } else {
    clearForm();
  }
}

function handleBack() {
  // Prefer standardized close behavior.
  if (window.parent && window.parent.closeModal) {
    window.parent.closeModal('slabDetailsModal');
    return;
  }
  closeThisWindowOrModal();
}

// ========== FORM VALIDATION ==========
function validateForm() {
  const effectiveDate = document.getElementById('effectiveDate').value;
  
  if (!effectiveDate) {
    alert('Effective Date is required.');
    document.getElementById('effectiveDate').focus();
    return false;
  }
  
  if (slabData.length === 0) {
    alert('Please add at least one rate slab.');
    return false;
  }
  
  return true;
}

function validateSlabFields() {
  const amountFrom = parseFloat(document.getElementById('amountFrom').value) || 0;
  const amountTo = parseFloat(document.getElementById('amountTo').value) || 0;
  const termFrom = parseInt(document.getElementById('termFrom').value) || 0;
  const termTo = parseInt(document.getElementById('termTo').value) || 0;
  
  if (amountFrom >= amountTo && amountTo !== 0) {
    alert('Amount From must be less than Amount To.');
    document.getElementById('amountFrom').focus();
    return false;
  }
  
  if (termFrom >= termTo && termTo !== 0) {
    alert('Term From must be less than Term To.');
    document.getElementById('termFrom').focus();
    return false;
  }
  
  return true;
}

// ========== FORM UTILITIES ==========
function getFormData() {
  return {
    effectiveDate: document.getElementById('effectiveDate').value,
    spread: document.getElementById('spread').value,
    slabs: slabData,
    createdBy: document.getElementById('createdBy')?.textContent || '',
    modifiedBy: document.getElementById('modifiedBy')?.textContent || '',
    supervisedBy: document.getElementById('supervisedBy')?.textContent || '',
    createdOn: document.getElementById('createdOn')?.textContent || '',
    modifiedOn: document.getElementById('modifiedOn')?.textContent || '',
    supervisedOn: document.getElementById('supervisedOn')?.textContent || ''
  };
}

function getSlabFormData() {
  return {
    amountFrom: document.getElementById('amountFrom').value,
    amountTo: document.getElementById('amountTo').value,
    termFrom: document.getElementById('termFrom').value,
    termTo: document.getElementById('termTo').value,
    effectiveRate: document.getElementById('effectiveRate').value,
    commissionRate: document.getElementById('commissionRate').value,
    penaltyRate: document.getElementById('penaltyRate').value,
    taxRate: document.getElementById('taxRate').value,
    maxRepaymentGracePeriod: document.getElementById('maxRepaymentGracePeriod').value,
    maxAdjustmentDays: document.getElementById('maxAdjustmentDays').value
  };
}

function clearForm() {
  document.getElementById('slabDetailsForm').reset();
  
  // Clear audit summary
  clearAuditValues();
  
  // Clear slab data
  slabData = [];
  populateSlabTable();
  currentRecord = null;
}

function clearSlabFields() {
  document.getElementById('amountFrom').value = '';
  document.getElementById('amountTo').value = '';
  document.getElementById('termFrom').value = '';
  document.getElementById('termTo').value = '';
  document.getElementById('effectiveRate').value = '';
  document.getElementById('commissionRate').value = '';
  document.getElementById('penaltyRate').value = '';
  document.getElementById('taxRate').value = '';
  document.getElementById('maxRepaymentGracePeriod').value = '';
  document.getElementById('maxAdjustmentDays').value = '';
}

function enableEdit() {
  const inputs = document.querySelectorAll('#slabDetailsForm input:not([readonly]), #slabDetailsForm select');
  inputs.forEach(input => {
    input.disabled = false;
  });
}

function disableEdit() {
  const inputs = document.querySelectorAll('#slabDetailsForm input:not([readonly]), #slabDetailsForm select');
  inputs.forEach(input => {
    input.disabled = true;
  });
}

// ========== TABLE OPERATIONS ==========
function populateSlabTable() {
  const tbody = document.getElementById('slabTableBody');
  tbody.innerHTML = '';
  
  if (!slabData || slabData.length === 0) {
    tbody.innerHTML = '<tr class="empty-state"><td colspan="12">No records to display.</td></tr>';
    return;
  }
  
  slabData.forEach((record, index) => {
    const row = document.createElement('tr');
    row.innerHTML = `
      <td>${record.amountFrom || '-'}</td>
      <td>${record.amountTo || '-'}</td>
      <td>${record.termFrom || '-'}</td>
      <td>${record.termTo || '-'}</td>
      <td>-</td>
      <td>-</td>
      <td>${record.effectiveRate || '-'}</td>
      <td>${record.penaltyRate || '-'}</td>
      <td>${record.maxRepaymentGracePeriod || '-'}</td>
      <td>${record.maxAdjustmentDays || '-'}</td>
      <td>${record.commissionRate || '-'}</td>
      <td>${record.taxRate || '-'}</td>
    `;
    row.addEventListener('click', () => selectSlabRecord(index));
    tbody.appendChild(row);
  });
}

function selectSlabRecord(index) {
  currentRecord = index;
  const record = slabData[index];
  
  // Populate form with record data
  document.getElementById('amountFrom').value = record.amountFrom || '';
  document.getElementById('amountTo').value = record.amountTo || '';
  document.getElementById('termFrom').value = record.termFrom || '';
  document.getElementById('termTo').value = record.termTo || '';
  document.getElementById('effectiveRate').value = record.effectiveRate || '';
  document.getElementById('commissionRate').value = record.commissionRate || '';
  document.getElementById('penaltyRate').value = record.penaltyRate || '';
  document.getElementById('taxRate').value = record.taxRate || '';
  document.getElementById('maxRepaymentGracePeriod').value = record.maxRepaymentGracePeriod || '';
  document.getElementById('maxAdjustmentDays').value = record.maxAdjustmentDays || '';
  
  console.log('Record selected:', index);
}

// ========== EXPORT ==========
// Make functions globally available
window.adjustSpread = adjustSpread;
window.searchEffectiveDate = searchEffectiveDate;
window.handleNew = handleNew;
window.handleAlter = handleAlter;
window.handleUpdate = handleUpdate;
window.handleRemove = handleRemove;
window.handleClear = handleClear;
window.handleView = handleView;
window.handleAdd = handleAdd;
window.handleEdit = handleEdit;
window.handleDelete = handleDelete;
window.handleSave = handleSave;
window.handleCancel = handleCancel;
window.handleBack = handleBack;
