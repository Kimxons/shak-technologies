/**
 * Workflow Fees Module
 * Manages workflow fees configuration by stage
 * @version 1.0.0
 */

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initializeWorkflowFees();
  setupEventListeners();
  setupKeyboardShortcuts();
});

let isEditMode = false;
let workflowFees = [];

/**
 * Initialize the workflow fees module
 */
function initializeWorkflowFees() {
  loadWorkflowFees();
  setDefaultValues();
}

/**
 * Set default values for the form
 */
function setDefaultValues() {
  const stageSelect = document.getElementById('stage');
  if (stageSelect && stageSelect.value) {
    loadWorkflowFees();
  }
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Stage dropdown change event
  const stageSelect = document.getElementById('stage');
  if (stageSelect) {
    stageSelect.addEventListener('change', function() {
      loadWorkflowFees();
    });
  }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Alt+V - View
    if (e.altKey && e.key.toLowerCase() === 'v') {
      e.preventDefault();
      handleView();
    }
    // Alt+E - Edit
    else if (e.altKey && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      handleEdit();
    }
    // Ctrl+S - Save
    else if (e.ctrlKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      handleSave();
    }
    // ESC - Cancel
    else if (e.key === 'Escape') {
      e.preventDefault();
      handleCancel();
    }
    // Alt+B - Back
    else if (e.altKey && e.key.toLowerCase() === 'b') {
      e.preventDefault();
      handleBack();
    }
  });
}

/**
 * Load workflow fees based on selected stage
 */
function loadWorkflowFees() {
  const stage = document.getElementById('stage').value;
  
  if (!stage) {
    updateTable([]);
    return;
  }

  // Get sample data for the selected stage
  const fees = getSampleFeesData(stage);
  workflowFees = fees;
  updateTable(fees);
}

/**
 * Get sample workflow fees data for a given stage
 */
function getSampleFeesData(stage) {
  const feesByStage = {
    'APPLICATION': [
      { chargeId: 'APP-001', description: 'Application Processing Fee', apply: true },
      { chargeId: 'APP-002', description: 'Document Verification Fee', apply: false },
      { chargeId: 'APP-003', description: 'Credit Report Fee', apply: true },
      { chargeId: 'APP-004', description: 'Initial Assessment Fee', apply: false }
    ],
    'APPRAISAL': [
      { chargeId: 'APR-001', description: 'Property Appraisal Fee', apply: true },
      { chargeId: 'APR-002', description: 'Valuation Fee', apply: true },
      { chargeId: 'APR-003', description: 'Site Visit Charges', apply: false },
      { chargeId: 'APR-004', description: 'Technical Assessment Fee', apply: true }
    ],
    'SANCTION': [
      { chargeId: 'SAN-001', description: 'Sanction Letter Fee', apply: true },
      { chargeId: 'SAN-002', description: 'Legal Review Fee', apply: false },
      { chargeId: 'SAN-003', description: 'Documentation Charges', apply: true },
      { chargeId: 'SAN-004', description: 'Processing Fee', apply: false }
    ],
    'DISBURSEMENT': [
      { chargeId: 'DIS-001', description: 'Disbursement Processing Fee', apply: true },
      { chargeId: 'DIS-002', description: 'RTGS/NEFT Charges', apply: false },
      { chargeId: 'DIS-003', description: 'Cheque Issuance Fee', apply: true },
      { chargeId: 'DIS-004', description: 'Account Opening Fee', apply: false }
    ]
  };

  return feesByStage[stage] || [];
}

/**
 * Update the fees table
 */
function updateTable(fees) {
  const tbody = document.getElementById('workflowFeesTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!fees || fees.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 3;
    cell.className = 'no-records';
    cell.textContent = 'No Records To Display';
    return;
  }

  fees.forEach((fee, index) => {
    const row = tbody.insertRow();
    row.dataset.index = index;

    // Charge ID
    const chargeIdCell = row.insertCell();
    chargeIdCell.textContent = fee.chargeId;

    // Description
    const descriptionCell = row.insertCell();
    descriptionCell.textContent = fee.description;

    // Apply checkbox
    const applyCell = row.insertCell();
    applyCell.style.textAlign = 'center';
    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = fee.apply;
    checkbox.disabled = !isEditMode;
    checkbox.addEventListener('change', function() {
      fee.apply = this.checked;
    });
    applyCell.appendChild(checkbox);
  });
}

/**
 * Enable edit mode
 */
function enableEditMode() {
  isEditMode = true;
  
  // Enable checkboxes
  const checkboxes = document.querySelectorAll('#workflowFeesTableBody input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.disabled = false;
  });

  showStatusMessage('Edit mode enabled. Modify the applicable fees and click Save.', 'info');
}

/**
 * Disable edit mode
 */
function disableEditMode() {
  isEditMode = false;
  
  // Disable checkboxes
  const checkboxes = document.querySelectorAll('#workflowFeesTableBody input[type="checkbox"]');
  checkboxes.forEach(checkbox => {
    checkbox.disabled = true;
  });
}

/**
 * Handle View button click
 */
function handleView() {
  disableEditMode();
  loadWorkflowFees();
  showStatusMessage('Viewing workflow fees.', 'info');
}

/**
 * Handle Edit button click
 */
function handleEdit() {
  const stage = document.getElementById('stage').value;
  if (!stage) {
    showStatusMessage('Please select a stage first.', 'error');
    return;
  }

  enableEditMode();
}

/**
 * Handle Save button click
 */
function handleSave() {
  if (!isEditMode) {
    showStatusMessage('Please click Edit to modify workflow fees.', 'warning');
    return;
  }

  const stage = document.getElementById('stage').value;
  if (!stage) {
    showStatusMessage('Please select a stage first.', 'error');
    return;
  }

  // Update Behind The Scene fields
  updateBehindTheScene();

  // In a real application, this would save to the server
  console.log('Saving workflow fees:', workflowFees);

  disableEditMode();
  showStatusMessage('Workflow fees saved successfully!', 'success');
}

/**
 * Handle Cancel button click
 */
function handleCancel() {
  if (isEditMode) {
    disableEditMode();
    loadWorkflowFees(); // Reload original data
    showStatusMessage('Changes cancelled.', 'info');
  } else {
    handleBack();
  }
}

/**
 * Handle Back button click
 */
function handleBack() {
  // Try to close modal first
  if (window.parent !== window) {
    window.parent.postMessage({ action: 'closeModal' }, '*');
  } else {
    window.close();
  }
}

/**
 * Update Behind The Scene fields
 */
function updateBehindTheScene() {
  const now = new Date().toLocaleString();
  const user = 'Admin User'; // In a real app, this would come from session

  document.getElementById('createdBy').value = user;
  document.getElementById('createdOn').value = now;
  document.getElementById('supervisedBy').value = user;
  document.getElementById('supervisedOn').value = now;
}

/**
 * Show status message
 */
function showStatusMessage(message, type = 'info') {
  const statusDiv = document.getElementById('statusMessage');
  if (!statusDiv) return;

  statusDiv.textContent = message;
  statusDiv.className = `status-message status-${type}`;
  statusDiv.style.display = 'block';

  // Auto-hide after 5 seconds
  setTimeout(() => {
    statusDiv.style.display = 'none';
  }, 5000);
}
