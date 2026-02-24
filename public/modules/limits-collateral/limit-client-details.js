/**
 * Limit Client Details Module
 * Manages collateral details for client limits
 * @version 1.0.0
 */

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
  initializeLimitClientDetails();
  setupEventListeners();
  setupKeyboardShortcuts();
});

let isEditMode = false;
let collateralRecords = [];
let selectedRecordIndex = -1;

/**
 * Toggle sidebar submenu visibility
 */
function toggleSubmenu(button) {
  const submenu = button.nextElementSibling;
  if (submenu) {
    button.classList.toggle('collapsed');
    submenu.classList.toggle('collapsed');
  }
}

/**
 * Initialize the limit client details module
 */
function initializeLimitClientDetails() {
  loadCollateralRecords();
  disableFormInputs();
}

/**
 * Setup event listeners
 */
function setupEventListeners() {
  // Table row click event
  const tableBody = document.getElementById('collateralTableBody');
  if (tableBody) {
    tableBody.addEventListener('click', function(e) {
      const row = e.target.closest('tr');
      if (row && row.dataset.index !== undefined) {
        selectRecord(parseInt(row.dataset.index));
      }
    });
  }
}

/**
 * Setup keyboard shortcuts
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', function(e) {
    // Alt+A - Add
    if (e.altKey && e.key.toLowerCase() === 'a') {
      e.preventDefault();
      handleAdd();
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
 * Load collateral records
 */
function loadCollateralRecords() {
  // In a real application, this would fetch from backend
  collateralRecords = [];
  updateTable();
}

/**
 * Update the collateral table
 */
function updateTable() {
  const tbody = document.getElementById('collateralTableBody');
  if (!tbody) return;

  tbody.innerHTML = '';

  if (!collateralRecords || collateralRecords.length === 0) {
    const row = tbody.insertRow();
    const cell = row.insertCell();
    cell.colSpan = 6;
    cell.className = 'no-records';
    cell.textContent = 'No records to display.';
    return;
  }

  collateralRecords.forEach((record, index) => {
    const row = tbody.insertRow();
    row.dataset.index = index;
    row.style.cursor = 'pointer';

    if (index === selectedRecordIndex) {
      row.classList.add('selected');
    }

    // Collateral ID
    const collateralIdCell = row.insertCell();
    collateralIdCell.textContent = record.collateralId;

    // Reference No.
    const referenceNoCell = row.insertCell();
    referenceNoCell.textContent = record.referenceNo;

    // Apportioned Ratio
    const ratioCell = row.insertCell();
    ratioCell.textContent = record.apportionedRatio;

    // Apportioned Value
    const valueCell = row.insertCell();
    valueCell.textContent = record.apportionedValue;

    // Margin
    const marginCell = row.insertCell();
    marginCell.textContent = record.margin;

    // Net Collateral Value
    const netValueCell = row.insertCell();
    netValueCell.textContent = record.netCollateralValue;
  });
}

/**
 * Select a record from the table
 */
function selectRecord(index) {
  if (!isEditMode && index >= 0 && index < collateralRecords.length) {
    selectedRecordIndex = index;
    const record = collateralRecords[index];
    populateForm(record);
    updateTable();
  }
}

/**
 * Populate form with record data
 */
function populateForm(record) {
  document.getElementById('collateralId').value = record.collateralId || '';
  document.getElementById('referenceNo').value = record.referenceNo || '';
  document.getElementById('apportionedRatio').value = record.apportionedRatio || '';
  document.getElementById('margin').value = record.margin || '';
  document.getElementById('apportionedValue').value = record.apportionedValue || '';
  document.getElementById('apportionedCollateralValue').value = record.apportionedCollateralValue || '';
  document.getElementById('assignedDate').value = record.assignedDate || '';
  
  document.getElementById('owner').value = record.owner || '';
  document.getElementById('limitCollateralValue').value = record.limitCollateralValue || '';
  document.getElementById('collateralType').value = record.collateralType || '';
  document.getElementById('collateralValue').value = record.collateralValue || '';
  document.getElementById('usedCollateralValue').value = record.usedCollateralValue || '';
  document.getElementById('status').value = record.status || '';
  document.getElementById('withdrawnReason').value = record.withdrawnReason || '';
  document.getElementById('withdrawnDate').value = record.withdrawnDate || '';
}

/**
 * Clear form inputs
 */
function clearFormInputs() {
  document.getElementById('collateralId').value = '';
  document.getElementById('referenceNo').value = '';
  document.getElementById('apportionedRatio').value = '';
  document.getElementById('margin').value = '';
  document.getElementById('apportionedValue').value = '';
  document.getElementById('apportionedCollateralValue').value = '';
  document.getElementById('assignedDate').value = '';
  
  document.getElementById('owner').value = '';
  document.getElementById('limitCollateralValue').value = '';
  document.getElementById('collateralType').value = '';
  document.getElementById('collateralValue').value = '';
  document.getElementById('usedCollateralValue').value = '';
  document.getElementById('status').value = '';
  document.getElementById('withdrawnReason').value = '';
  document.getElementById('withdrawnDate').value = '';
  
  selectedRecordIndex = -1;
}

/**
 * Enable form inputs
 */
function enableFormInputs() {
  const inputs = document.querySelectorAll('#limitClientDetailsForm input:not([readonly]), #limitClientDetailsForm select');
  inputs.forEach(input => {
    input.disabled = false;
  });
}

/**
 * Disable form inputs
 */
function disableFormInputs() {
  const inputs = document.querySelectorAll('#limitClientDetailsForm input:not([readonly]), #limitClientDetailsForm select');
  inputs.forEach(input => {
    input.disabled = true;
  });
}

/**
 * Search for collateral
 */
function searchCollateral() {
  showStatusMessage('Collateral search feature - connect to backend', 'info');
}

/**
 * Handle New button click
 */
function handleNew() {
  if (!isEditMode) {
    showStatusMessage('Please click Add or Edit to enable input mode.', 'warning');
    return;
  }

  const collateralId = document.getElementById('collateralId').value.trim();
  const referenceNo = document.getElementById('referenceNo').value.trim();

  if (!collateralId) {
    showStatusMessage('Please enter Collateral ID.', 'error');
    return;
  }

  // Calculate net collateral value
  const apportionedValue = parseFloat(document.getElementById('apportionedValue').value) || 0;
  const margin = parseFloat(document.getElementById('margin').value) || 0;
  const netCollateralValue = apportionedValue - (apportionedValue * margin / 100);

  const newRecord = {
    collateralId: collateralId,
    referenceNo: referenceNo,
    apportionedRatio: document.getElementById('apportionedRatio').value,
    margin: document.getElementById('margin').value,
    apportionedValue: document.getElementById('apportionedValue').value,
    apportionedCollateralValue: document.getElementById('apportionedCollateralValue').value,
    assignedDate: document.getElementById('assignedDate').value,
    netCollateralValue: netCollateralValue.toFixed(2),
    owner: document.getElementById('owner').value,
    limitCollateralValue: document.getElementById('limitCollateralValue').value,
    collateralType: document.getElementById('collateralType').value,
    collateralValue: document.getElementById('collateralValue').value,
    usedCollateralValue: document.getElementById('usedCollateralValue').value,
    status: document.getElementById('status').value,
    withdrawnReason: document.getElementById('withdrawnReason').value,
    withdrawnDate: document.getElementById('withdrawnDate').value
  };

  collateralRecords.push(newRecord);
  updateTable();
  clearFormInputs();
  showStatusMessage('Collateral record added successfully!', 'success');
}

/**
 * Handle Alter button click
 */
function handleAlter() {
  if (!isEditMode) {
    showStatusMessage('Please click Edit to enable modification mode.', 'warning');
    return;
  }

  if (selectedRecordIndex === -1) {
    showStatusMessage('Please select a record to alter.', 'error');
    return;
  }

  showStatusMessage('Alter mode enabled. Modify the fields and click Update.', 'info');
}

/**
 * Handle Update button click
 */
function handleUpdate() {
  if (!isEditMode) {
    showStatusMessage('Please click Edit to enable modification mode.', 'warning');
    return;
  }

  if (selectedRecordIndex === -1) {
    showStatusMessage('Please select a record to update.', 'error');
    return;
  }

  const collateralId = document.getElementById('collateralId').value.trim();
  if (!collateralId) {
    showStatusMessage('Please enter Collateral ID.', 'error');
    return;
  }

  // Calculate net collateral value
  const apportionedValue = parseFloat(document.getElementById('apportionedValue').value) || 0;
  const margin = parseFloat(document.getElementById('margin').value) || 0;
  const netCollateralValue = apportionedValue - (apportionedValue * margin / 100);

  collateralRecords[selectedRecordIndex] = {
    collateralId: collateralId,
    referenceNo: document.getElementById('referenceNo').value,
    apportionedRatio: document.getElementById('apportionedRatio').value,
    margin: document.getElementById('margin').value,
    apportionedValue: document.getElementById('apportionedValue').value,
    apportionedCollateralValue: document.getElementById('apportionedCollateralValue').value,
    assignedDate: document.getElementById('assignedDate').value,
    netCollateralValue: netCollateralValue.toFixed(2),
    owner: document.getElementById('owner').value,
    limitCollateralValue: document.getElementById('limitCollateralValue').value,
    collateralType: document.getElementById('collateralType').value,
    collateralValue: document.getElementById('collateralValue').value,
    usedCollateralValue: document.getElementById('usedCollateralValue').value,
    status: document.getElementById('status').value,
    withdrawnReason: document.getElementById('withdrawnReason').value,
    withdrawnDate: document.getElementById('withdrawnDate').value
  };

  updateTable();
  clearFormInputs();
  showStatusMessage('Collateral record updated successfully!', 'success');
}

/**
 * Handle Remove button click
 */
function handleRemove() {
  if (!isEditMode) {
    showStatusMessage('Please click Edit to enable modification mode.', 'warning');
    return;
  }

  if (selectedRecordIndex === -1) {
    showStatusMessage('Please select a record to remove.', 'error');
    return;
  }

  if (confirm('Are you sure you want to remove this collateral record?')) {
    collateralRecords.splice(selectedRecordIndex, 1);
    updateTable();
    clearFormInputs();
    showStatusMessage('Collateral record removed successfully!', 'success');
  }
}

/**
 * Handle Clear button click
 */
function handleClear() {
  clearFormInputs();
  updateTable();
  showStatusMessage('Form cleared.', 'info');
}

/**
 * Handle Withdraw button click
 */
function handleWithdraw() {
  if (!isEditMode) {
    showStatusMessage('Please click Edit to enable modification mode.', 'warning');
    return;
  }

  if (selectedRecordIndex === -1) {
    showStatusMessage('Please select a record to withdraw.', 'error');
    return;
  }

  const withdrawnReason = prompt('Enter withdrawal reason:');
  if (withdrawnReason) {
    collateralRecords[selectedRecordIndex].status = 'Withdrawn';
    collateralRecords[selectedRecordIndex].withdrawnReason = withdrawnReason;
    collateralRecords[selectedRecordIndex].withdrawnDate = new Date().toLocaleDateString();
    
    updateTable();
    populateForm(collateralRecords[selectedRecordIndex]);
    showStatusMessage('Collateral record withdrawn successfully!', 'success');
  }
}

/**
 * Handle Add button click (right sidebar)
 */
function handleAdd() {
  isEditMode = true;
  enableFormInputs();
  clearFormInputs();
  document.getElementById('collateralId').focus();
  showStatusMessage('Add mode enabled. Enter collateral details.', 'info');
}

/**
 * Handle Edit button click (right sidebar)
 */
function handleEdit() {
  isEditMode = true;
  enableFormInputs();
  showStatusMessage('Edit mode enabled. You can now modify records.', 'info');
}

/**
 * Handle Save button click (right sidebar)
 */
function handleSave() {
  if (!isEditMode) {
    showStatusMessage('No changes to save.', 'warning');
    return;
  }

  // Update Behind The Scene fields
  updateBehindTheScene();

  // In a real application, this would save to the server
  console.log('Saving collateral records:', collateralRecords);

  isEditMode = false;
  disableFormInputs();
  showStatusMessage('Collateral details saved successfully!', 'success');
}

/**
 * Handle Cancel button click (right sidebar)
 */
function handleCancel() {
  if (isEditMode) {
    isEditMode = false;
    disableFormInputs();
    clearFormInputs();
    loadCollateralRecords();
    showStatusMessage('Changes cancelled.', 'info');
  } else {
    handleBack();
  }
}

/**
 * Handle Back button click (right sidebar)
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

  if (!document.getElementById('createdBy').value) {
    document.getElementById('createdBy').value = user;
    document.getElementById('createdOn').value = now;
  }
  
  document.getElementById('modifiedBy').value = user;
  document.getElementById('modifiedOn').value = now;
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
