// Kairo Banking Application - Interest Rate Menu Module

// ========== STATE MANAGEMENT ==========
let isEditMode = false;
let currentRecord = null;
let activeSection = 'dataentry';

// ========================================
// STANDARD UI HELPERS
// ========================================
function isInterestRateMenuPage() {
  return document.body && document.body.dataset && document.body.dataset.page === 'interest-rate-menu';
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

  if (window.self !== window.top) {
    window.location.href = '../../dashboard.html';
    return;
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
  initSidebar();
  initActionPanel();
});

function initializeForm() {
  // Set default values
  // Initialize any default selections if needed
  if (isInterestRateMenuPage()) {
    clearAuditValues();
  }
}

// ========== NAVIGATION FUNCTIONS ==========
function handlePrevious() {
  console.log('Previous navigation clicked');
  // Backend integration point
}

function handleNext() {
  console.log('Next navigation clicked');
  // Backend integration point
}

// ========== SIDEBAR TOGGLE ==========
function toggleSubmenu(button) {
  // Legacy no-op kept for backward compatibility.
  // Sidebar now uses standardized nav sections.
  if (!button) return;
}

// ========== MODAL FUNCTIONS ==========
function openModal(modalId) {
  if (!modalId) return;
  const modalEl = document.getElementById(modalId);
  if (!modalEl) return;
  try {
    const inst = window.bootstrap?.Modal?.getOrCreateInstance
      ? window.bootstrap.Modal.getOrCreateInstance(modalEl)
      : (window.bootstrap?.Modal ? new window.bootstrap.Modal(modalEl) : null);
    if (inst) inst.show();
  } catch (e) {
    // ignore
  }
}

function closeModal(modalId) {
  if (!modalId) return;
  const modalEl = document.getElementById(modalId);
  if (!modalEl) return;
  try {
    const inst = window.bootstrap?.Modal?.getInstance(modalEl);
    if (inst) inst.hide();
  } catch (e) {
    // ignore
  }
}

// Make closeModal globally available for iframe communication
window.closeModal = closeModal;

function setupEventListeners() {
  // Form submit prevention
  document.getElementById('interestRateForm').addEventListener('submit', function(e) {
    e.preventDefault();
  });

  // Tier based checkbox dependency
  document.getElementById('tierBased').addEventListener('change', function() {
    if (this.checked) {
      console.log('Tier based rates enabled');
    }
  });

  // Base Rate ID field dependency
  const baseRateField = document.getElementById('baseRateId');
  const baseRateSearch = baseRateField.nextElementSibling;
  
  // Enable/disable base rate based on rate type or interest type
  document.getElementById('interestType').addEventListener('change', function() {
    updateBaseRateField();
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

    if (action === 'maximize') {
      const win = document.querySelector('.window');
      if (win) win.classList.toggle('maximized');
      return;
    }

    if (action === 'minimize') {
      // no-op (kept for parity)
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

function initActionPanel() {
  const actionPanel = document.querySelector('.action-panel');
  if (!actionPanel) return;

  actionPanel.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'previous') {
      handlePrevious();
      return;
    }
    if (action === 'next') {
      handleNext();
      return;
    }
    if (action === 'view') {
      handleView();
      return;
    }
    if (action === 'add') {
      handleAdd();
      return;
    }
    if (action === 'edit') {
      handleEdit();
      return;
    }
    if (action === 'delete') {
      handleDelete();
      return;
    }
    if (action === 'save') {
      handleSave();
      return;
    }
    if (action === 'cancel') {
      handleCancel();
      return;
    }
  });

  // lookup/search buttons within form
  const form = document.getElementById('interestRateForm');
  if (!form) return;
  form.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.getAttribute('data-action');

    if (action === 'searchRateMenu') {
      searchRateMenu();
    }
    if (action === 'searchCurrency') {
      searchCurrency();
    }
    if (action === 'searchBaseRate') {
      searchBaseRate();
    }
  });
}

function updateBaseRateField() {
  const interestType = document.getElementById('interestType').value;
  const baseRateField = document.getElementById('baseRateId');
  
  // Enable base rate field for compound and reducing balance types
  if (interestType === 'compound' || interestType === 'reducing') {
    baseRateField.disabled = false;
  }
}

// ========== SEARCH FUNCTIONS ==========
function searchRateMenu() {
  console.log('Search Rate Menu clicked');
  // Backend integration point
}

function searchCurrency() {
  console.log('Search Currency clicked');
  // Backend integration point
}

function searchBaseRate() {
  console.log('Search Base Rate clicked');
  // Backend integration point
}

// ========== CRUD OPERATIONS ==========
function handleView() {
  const rateMenuId = document.getElementById('rateMenuId').value;
  if (!rateMenuId) {
    alert('Please enter a Rate Menu ID to view.');
    return;
  }
  
  disableEdit();
  // Backend integration point
  console.log('View clicked for Rate Menu ID:', rateMenuId);
}

function handleAdd() {
  clearForm();
  enableEdit();
  isEditMode = true;
  currentRecord = null;
  
  // Focus on first input
  document.getElementById('rateMenuId').focus();
}

function handleEdit() {
  const rateMenuId = document.getElementById('rateMenuId').value;
  if (!rateMenuId) {
    alert('Please select a rate menu to edit.');
    return;
  }
  
  enableEdit();
  isEditMode = true;
}

function handleDelete() {
  const rateMenuId = document.getElementById('rateMenuId').value;
  if (!rateMenuId) {
    alert('Please select a rate menu to delete.');
    return;
  }
  
  if (confirm('Are you sure you want to delete this interest rate menu?')) {
    // Backend integration point
    console.log('Delete clicked for Rate Menu ID:', rateMenuId);
  }
}

function handleSave() {
  if (!validateForm()) {
    return;
  }
  
  const formData = getFormData();
  
  if (isEditMode && currentRecord) {
    // Update existing record
    console.log('Update data:', formData);
  } else {
    // Create new record
    console.log('Save data:', formData);
  }
  
  showMessage('Record saved successfully.', 'success');
  
  // On successful save, disable edit
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

// ========== FORM VALIDATION ==========
function validateForm() {
  const requiredFields = [
    { id: 'rateMenuId', label: 'Rate Menu ID' },
    { id: 'description', label: 'Description' },
    { id: 'currencyId', label: 'Currency ID' }
  ];
  
  for (const field of requiredFields) {
    const element = document.getElementById(field.id);
    if (!element.value.trim()) {
      alert(`${field.label} is required.`);
      element.focus();
      return false;
    }
  }
  
  // Validate numeric fields
  const lowerVariance = parseFloat(document.getElementById('lowerVariance').value) || 0;
  const upperVariance = parseFloat(document.getElementById('upperVariance').value) || 0;
  
  if (lowerVariance > upperVariance) {
    alert('Lower Variance cannot be greater than Upper Variance.');
    document.getElementById('lowerVariance').focus();
    return false;
  }
  
  return true;
}

// ========== FORM UTILITIES ==========
function getFormData() {
  return {
    rateMenuId: document.getElementById('rateMenuId').value,
    description: document.getElementById('description').value,
    interestType: document.getElementById('interestType').value,
    rateType: document.getElementById('rateType').value,
    currencyId: document.getElementById('currencyId').value,
    baseRateId: document.getElementById('baseRateId').value,
    lowerVariance: document.getElementById('lowerVariance').value,
    upperVariance: document.getElementById('upperVariance').value,
    termPeriod: document.getElementById('termPeriod').value,
    tierBased: document.getElementById('tierBased').checked
  };
}

function clearForm() {
  document.getElementById('interestRateForm').reset();
  
  // Clear audit summary
  clearAuditValues();
}

function enableEdit() {
  const inputs = document.querySelectorAll('#interestRateForm input:not([readonly]), #interestRateForm select');
  inputs.forEach(input => {
    input.disabled = false;
  });
}

function disableEdit() {
  const inputs = document.querySelectorAll('#interestRateForm input:not([readonly]):not([type="checkbox"]), #interestRateForm select');
  inputs.forEach(input => {
    input.disabled = true;
  });
  
  // Also disable checkboxes
  const checkboxes = document.querySelectorAll('#interestRateForm input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.disabled = true;
  });
}

// ========== EXPORT ==========
// Make functions globally available
window.toggleSubmenu = toggleSubmenu;
window.openModal = openModal;
window.closeModal = closeModal;
window.searchRateMenu = searchRateMenu;
window.searchCurrency = searchCurrency;
window.searchBaseRate = searchBaseRate;
window.handlePrevious = handlePrevious;
window.handleNext = handleNext;
window.handleView = handleView;
window.handleAdd = handleAdd;
window.handleEdit = handleEdit;
window.handleDelete = handleDelete;
window.handleSave = handleSave;
window.handleCancel = handleCancel;
