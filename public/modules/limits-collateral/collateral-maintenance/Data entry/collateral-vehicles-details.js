// Collateral Vehicles Details - Kairo Banking Application

let isEditMode = false;
let currentVehicleRecord = null;

document.addEventListener('DOMContentLoaded', function () {
  setupStandardShell();
  wireWindowControls();
  wireAutoGrowTextareas();
  disableVehicleEdit();

  // Expose for future modal/iframe integration
  window.loadCollateralVehiclesDetails = loadCollateralVehiclesDetails;
});

async function loadCollateralVehiclesDetails(branchId, collateralId) {
  if (!branchId || !collateralId) {
    console.warn('loadCollateralVehiclesDetails: Missing BranchID or CollateralID');
    return;
  }

  console.log('loadCollateralVehiclesDetails called with:', { branchId, collateralId });
  // Backend integration can be added later without changing IDs.
}

function setupStandardShell() {
  const sidebar = document.getElementById('main-sidebar');
  const sidebarToggle = document.getElementById('sidebarToggle');
  if (sidebar && sidebarToggle) {
    sidebarToggle.addEventListener('click', () => {
      const isCollapsed = sidebar.classList.toggle('collapsed');
      sidebarToggle.setAttribute('aria-expanded', String(!isCollapsed));
    });
  }

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

  document.querySelectorAll('[data-section-toggle]').forEach((header) => {
    header.addEventListener('click', (e) => {
      const toggleBtn = header.querySelector('.section-toggle-btn');
      if (!toggleBtn) return;

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

function wireAutoGrowTextareas() {
  const textareas = document.querySelectorAll('textarea.js-autogrow-textarea');
  textareas.forEach((el) => {
    const autoResize = () => {
      el.style.height = 'auto';
      el.style.height = el.scrollHeight + 'px';
    };

    autoResize();
    el.addEventListener('input', autoResize);
  });
}

function closeModal() {
  if (window.parent && window.parent.closeModal) {
    window.parent.closeModal('collateralPropertiesDetailsModal');
    return;
  }

  // Fallback for standalone preview
  window.close();
}

function addVehicleDetail() {
  isEditMode = true;
  currentVehicleRecord = null;

  clearVehicleForm();
  enableVehicleFormFields();
  document.getElementById('registrationNo')?.focus();

  showVehicleStatusMessage('Add new vehicle detail - fill in required fields', 'info');
}

function editVehicleDetail() {
  if (!currentVehicleRecord) {
    showVehicleStatusMessage('Please select a record to edit', 'warning');
    return;
  }

  isEditMode = true;
  enableVehicleFormFields();
  showVehicleStatusMessage('Edit mode enabled - modify fields and save', 'info');
}

function saveVehicleDetail() {
  const formData = collectVehicleFormData();

  if (currentVehicleRecord) {
    currentVehicleRecord = { ...currentVehicleRecord, ...formData };
    showVehicleStatusMessage('Vehicle detail updated (stub)', 'success');
  } else {
    currentVehicleRecord = { ...formData, id: Date.now() };
    showVehicleStatusMessage('Vehicle detail created (stub)', 'success');
  }

  isEditMode = false;
  disableVehicleEdit();
}

function deleteVehicleDetail() {
  if (!currentVehicleRecord) {
    showVehicleStatusMessage('Please select a record to delete', 'warning');
    return;
  }

  if (confirm('Are you sure you want to delete this vehicle detail record?')) {
    currentVehicleRecord = null;
    clearVehicleForm();
    disableVehicleEdit();
    showVehicleStatusMessage('Vehicle detail deleted (stub)', 'success');
  }
}

function cancelVehicleDetail() {
  if (!isEditMode) {
    clearVehicleForm();
    currentVehicleRecord = null;
    showVehicleStatusMessage('Form cleared', 'info');
    return;
  }

  if (confirm('Discard all changes?')) {
    isEditMode = false;

    if (currentVehicleRecord) {
      // No backend bind yet; keep current values as-is.
    } else {
      clearVehicleForm();
    }

    disableVehicleEdit();
    showVehicleStatusMessage('Changes discarded', 'info');
  }
}

function goBackToMain() {
  closeModal();
}

function enableVehicleFormFields() {
  const form = document.getElementById('collateralVehiclesDetailsForm');
  if (!form) return;

  const inputs = form.querySelectorAll('input:not([readonly]), select, textarea');
  inputs.forEach((input) => {
    // Keep Behind-The-Scene readonly fields disabled
    if (
      input.id === 'collateralValue' ||
      input.id === 'currencyId' ||
      input.id === 'usedCollateralValue' ||
      input.id === 'withdrawnDate' ||
      input.id === 'collateralStatus' ||
      input.id === 'recordStatus' ||
      input.id === 'createdBy' ||
      input.id === 'createdOn' ||
      input.id === 'supervisedBy' ||
      input.id === 'supervisedOn'
    ) {
      input.disabled = true;
      return;
    }

    input.disabled = false;
  });

  document.getElementById('saveVehicleBtn').disabled = false;
  document.getElementById('cancelVehicleBtn').disabled = false;
}

function disableVehicleEdit() {
  const form = document.getElementById('collateralVehiclesDetailsForm');
  if (!form) return;

  form.querySelectorAll('input, select, textarea').forEach((input) => {
    input.disabled = true;
  });

  document.getElementById('saveVehicleBtn').disabled = true;
  document.getElementById('cancelVehicleBtn').disabled = true;

  isEditMode = false;
}

function clearVehicleForm() {
  const form = document.getElementById('collateralVehiclesDetailsForm');
  if (!form) return;

  form.querySelectorAll('input[type="text"], input[type="date"], input[type="number"]').forEach((input) => {
    if (!input.readOnly) input.value = '';
  });

  form.querySelectorAll('textarea').forEach((textarea) => {
    textarea.value = '';
  });

  form.querySelectorAll('select').forEach((select) => {
    select.selectedIndex = 0;
  });

  form.querySelectorAll('input[type="checkbox"]').forEach((checkbox) => {
    checkbox.checked = false;
  });
}

function collectVehicleFormData() {
  const form = document.getElementById('collateralVehiclesDetailsForm');
  const formData = {};
  if (!form) return formData;

  form.querySelectorAll('input, select, textarea').forEach((field) => {
    if (field.type === 'checkbox') {
      formData[field.id] = field.checked;
    } else {
      formData[field.id] = field.value;
    }
  });

  return formData;
}

function showVehicleStatusMessage(message, type = 'info') {
  if (window.parent && window.parent.showStatusMessage) {
    window.parent.showStatusMessage(message, type);
    return;
  }

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

document.addEventListener('keydown', function (e) {
  if (e.ctrlKey && (e.key === 's' || e.key === 'S')) {
    e.preventDefault();
    if (isEditMode) saveVehicleDetail();
  }

  if (e.key === 'Escape') {
    if (isEditMode) {
      cancelVehicleDetail();
    } else {
      closeModal();
    }
  }
});
