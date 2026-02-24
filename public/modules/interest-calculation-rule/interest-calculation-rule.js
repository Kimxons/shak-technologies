// Interest Calculation Rule (standardized UI)

// ========== MODAL CLOSE FUNCTION ==========
function closeParentModal() {
  try {
    const parentDoc = window.parent?.document;
    if (!parentDoc) return false;

    // Legacy dashboard modal close button
    const closeBtn = parentDoc.querySelector('#interestCalculationRuleModal .window-control--close');
    if (closeBtn) {
      closeBtn.click();
      return true;
    }

    // Fallback: hide modal using Bootstrap
    const modal = parentDoc.getElementById('interestCalculationRuleModal');
    if (modal && window.parent?.bootstrap?.Modal) {
      const bsModal = window.parent.bootstrap.Modal.getInstance(modal) || new window.parent.bootstrap.Modal(modal);
      bsModal.hide();
      return true;
    }
  } catch (e) {
    console.error('Error closing modal:', e);
  }

  return false;
}

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

function closeThisWindowOrModal() {
  // Try to close dashboard modal if embedded
  if (window.self !== window.top) {
    if (closeParentModal()) return;
    window.location.href = '../../dashboard.html';
    return;
  }

  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.close();
  }
}

// ========== SEARCH FUNCTIONS ==========
function searchInterestCalc() {
  console.log('Search Interest Calculation triggered');
  // Implement search functionality
  showMessage('Search not yet implemented', 'info');
}

// ========== FORM ACTIONS ==========
function viewInterestCalc() {
  const calcId = document.getElementById('interestCalculationId').value;
  
  if (!calcId) {
    showMessage('Please enter or select an Interest Calculation ID', 'warning');
    return;
  }
  
  setFormMode('view');
  setEditing(false);
  
  console.log('Viewing Interest Calculation Rule:', calcId);
  showMessage('Viewing Interest Calculation Rule: ' + calcId, 'info');
}

function addInterestCalc() {
  document.getElementById('interestCalcForm').reset();
  setFormMode('edit');

  clearAuditValues();
  setEditing(true);
  document.getElementById('interestCalculationId').focus();
  
  console.log('Adding new Interest Calculation Rule');
  showMessage('Ready to add new Interest Calculation Rule', 'info');
}

function editInterestCalc() {
  const calcId = document.getElementById('interestCalculationId').value;
  
  if (!calcId) {
    showMessage('Please enter or select an Interest Calculation ID to edit', 'warning');
    return;
  }
  
  setFormMode('edit');
  setEditing(true);
  
  console.log('Editing Interest Calculation Rule:', calcId);
  showMessage('Editing Interest Calculation Rule: ' + calcId, 'info');
}

function deleteInterestCalc() {
  const calcId = document.getElementById('interestCalculationId').value;
  
  if (!calcId) {
    showMessage('Please select an Interest Calculation Rule to delete', 'warning');
    return;
  }
  
  if (confirm('Are you sure you want to delete this Interest Calculation Rule?')) {
    console.log('Deleting Interest Calculation Rule:', calcId);
    document.getElementById('interestCalcForm').reset();
    clearAuditValues();
    setFormMode('view');
    setEditing(false);
    showMessage('Interest Calculation Rule deleted successfully', 'success');
  }
}

function saveInterestCalc() {
  const form = document.getElementById('interestCalcForm');
  const calcId = document.getElementById('interestCalculationId').value;
  
  if (!calcId) {
    showMessage('Interest Calculation ID is required', 'error');
    document.getElementById('interestCalculationId').focus();
    return;
  }
  
  const formData = {
    interestCalculationId: calcId,
    description: document.getElementById('description').value,
    productTypes: document.getElementById('productTypes').value,
    interestType: document.getElementById('interestType').value,
    basis: document.getElementById('basis').value,
    balanceType: document.getElementById('balanceType').value,
    interestPeriod: document.getElementById('interestPeriod').value,
    dayCountBasis: document.getElementById('dayCountBasis').value,
    roundingMethod: document.getElementById('roundingMethod').value,
    compoundingFrequency: document.getElementById('compoundingFrequency').value,
    effectiveDate: document.getElementById('effectiveDate').value,
    expiryDate: document.getElementById('expiryDate').value,
    applyOnWeekends: document.getElementById('applyOnWeekends').checked,
    applyOnHolidays: document.getElementById('applyOnHolidays').checked,
    accrueDaily: document.getElementById('accrueDaily').checked,
    capitalizeInterest: document.getElementById('capitalizeInterest').checked
  };
  
  console.log('Saving Interest Calculation Rule:', formData);
  
  showMessage('Interest Calculation Rule saved successfully', 'success');
  setFormMode('view');

  setEditing(false);
  
  updateAuditFields();
}

function cancelInterestCalc() {
  if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
    const calcId = document.getElementById('interestCalculationId').value;
    
    if (calcId) {
      viewInterestCalc();
    } else {
      document.getElementById('interestCalcForm').reset();
      setFormMode('view');
      clearAuditValues();
      setEditing(false);
    }

    setEditing(false);
    showMessage('Changes cancelled', 'info');
  }
}

function goBack() {
  if (confirm('Are you sure you want to go back? Any unsaved changes will be lost.')) {
    closeThisWindowOrModal();
  }
}

// ========== UTILITY FUNCTIONS ==========
function setFormMode(mode) {
  const form = document.getElementById('interestCalcForm');
  const inputs = form.querySelectorAll('input:not([readonly]), select, textarea');
  
  inputs.forEach(input => {
    if (mode === 'view') {
      input.disabled = true;
    } else {
      input.disabled = false;
    }
  });
}

function updateAuditFields() {
  const currentUser = 'SYSTEM';
  const currentDate = new Date().toLocaleDateString();
  const currentTime = new Date().toLocaleTimeString();

  const createdByEl = document.getElementById('createdBy');
  const createdByVal = createdByEl ? String(createdByEl.textContent || '').trim() : '';

  if (!createdByVal || createdByVal === '-') {
    setAuditValue('createdBy', currentUser);
    setAuditValue('createdOn', currentDate);
    setAuditValue('createdTime', currentTime);
  }

  setAuditValue('modifiedBy', currentUser);
  setAuditValue('modifiedOn', currentDate);
  setAuditValue('modifiedTime', currentTime);
}

function setAuditValue(id, value) {
  const el = document.getElementById(id);
  if (!el) return;
  el.textContent = (value === null || value === undefined || value === '') ? '-' : String(value);
}

function clearAuditValues() {
  setAuditValue('createdBy', '-');
  setAuditValue('createdOn', '-');
  setAuditValue('createdTime', '-');
  setAuditValue('modifiedBy', '-');
  setAuditValue('modifiedOn', '-');
  setAuditValue('modifiedTime', '-');
}

function setEditing(on) {
  const btnView = document.querySelector('.action-panel [data-action="view"]');
  const btnAdd = document.querySelector('.action-panel [data-action="add"]');
  const btnEdit = document.querySelector('.action-panel [data-action="edit"]');
  const btnDelete = document.querySelector('.action-panel [data-action="delete"]');
  const btnSave = document.querySelector('.action-panel [data-action="save"]');
  const btnCancel = document.querySelector('.action-panel [data-action="cancel"]');

  if (btnView) btnView.disabled = false;
  if (btnAdd) btnAdd.disabled = false;
  if (btnEdit) btnEdit.disabled = on;
  if (btnDelete) btnDelete.disabled = on;
  if (btnSave) btnSave.disabled = !on;
  if (btnCancel) btnCancel.disabled = !on;
}

function initHeaderControls() {
  // shared click handler below handles header actions
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

function initActionRouting() {
  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-action]');
    if (!el) return;
    const action = el.getAttribute('data-action');
    if (!action) return;

    // Header actions
    if (action === 'refresh') {
      window.location.reload();
      return;
    }

    if (action === 'maximize') {
      const win = document.querySelector('.window');
      if (win) win.classList.toggle('maximized');
      return;
    }

    if (action === 'minimize') {
      // kept for parity; no-op
      return;
    }

    if (action === 'close') {
      closeThisWindowOrModal();
      return;
    }

    // Form actions
    if (action === 'view') viewInterestCalc();
    if (action === 'add') addInterestCalc();
    if (action === 'edit') editInterestCalc();
    if (action === 'delete') deleteInterestCalc();
    if (action === 'save') saveInterestCalc();
    if (action === 'cancel') cancelInterestCalc();
    if (action === 'back') goBack();
    if (action === 'searchInterestCalc') searchInterestCalc();
  });
}

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function () {
  // Mark context if loaded in iframe/modal
  if (window.self !== window.top || window.opener) {
    document.body.classList.add('in-modal');
  }

  initHeaderControls();
  initSectionToggles();
  initActionRouting();

  setFormMode('view');
  setEditing(false);
  clearAuditValues();

  const form = document.getElementById('interestCalcForm');
  if (form) {
    form.addEventListener('submit', function (e) {
      e.preventDefault();
      saveInterestCalc();
    });
  }

  console.log('Interest Calculation Rule form initialized');
});
