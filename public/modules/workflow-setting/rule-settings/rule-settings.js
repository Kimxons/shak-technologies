// Rule Settings - Kairo Banking Application

// ========== STATE MANAGEMENT ==========
let isEditMode = false;
let currentRecord = null;
let rulesData = [];

// Sample data
const sampleRules = [
  {
    ruleId: 'RULE001',
    description: 'KYC Verification Required',
    isMandatory: true,
    ruleTypeName: 'Validation Rules',
    canBeOverridden: false,
    workflowTypeId: 'WF001',
    workflowStage: 'initiation',
    ruleType: 'validation'
  },
  {
    ruleId: 'RULE002',
    description: 'Manager Approval Required',
    isMandatory: true,
    ruleTypeName: 'Approval Rules',
    canBeOverridden: true,
    workflowTypeId: 'WF001',
    workflowStage: 'approval',
    ruleType: 'approval'
  },
  {
    ruleId: 'RULE003',
    description: 'Credit Score Check',
    isMandatory: false,
    ruleTypeName: 'Validation Rules',
    canBeOverridden: true,
    workflowTypeId: 'WF001',
    workflowStage: 'verification',
    ruleType: 'validation'
  }
];

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  initializeForm();
  setupEventListeners();
  loadRulesData();
});

function initializeForm() {
  console.log('Rule Settings form initialized');
  disableFormFields();
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
  document.getElementById('ruleSettingsForm').addEventListener('submit', function(e) {
    e.preventDefault();
  });
}

// ========== DATA MANAGEMENT ==========
function loadRulesData() {
  rulesData = [...sampleRules];
  renderGrid();
}

function renderGrid() {
  const gridBody = document.getElementById('gridBody');
  
  if (rulesData.length === 0) {
    gridBody.innerHTML = '<div class="empty-state">No Records To Display</div>';
    return;
  }

  let html = '';
  rulesData.forEach((rule, index) => {
    html += `
      <div class="grid-row" onclick="selectRow(${index})">
        <div class="grid-col">${rule.ruleId}</div>
        <div class="grid-col">${rule.description}</div>
        <div class="grid-col">${rule.isMandatory ? 'Yes' : 'No'}</div>
        <div class="grid-col">${rule.ruleTypeName}</div>
        <div class="grid-col">${rule.canBeOverridden ? 'Yes' : 'No'}</div>
      </div>
    `;
  });

  gridBody.innerHTML = html;
}

function selectRow(index) {
  currentRecord = rulesData[index];
  
  // Remove previous selection
  document.querySelectorAll('.grid-row').forEach(row => row.classList.remove('selected'));
  
  // Add selection to clicked row
  document.querySelectorAll('.grid-row')[index].classList.add('selected');
  
  // Enable buttons
  document.getElementById('alterBtn').disabled = false;
  document.getElementById('removeBtn').disabled = false;
  
  // Populate form
  populateForm(currentRecord);
}

function populateForm(rule) {
  document.getElementById('workflowTypeId').value = rule.workflowTypeId || '';
  document.getElementById('workflowStage').value = rule.workflowStage || '';
  document.getElementById('ruleType').value = rule.ruleType || '';
  document.getElementById('ruleId').value = rule.ruleId || '';
  document.getElementById('isMandatory').checked = rule.isMandatory || false;
  document.getElementById('allowOverride').checked = rule.canBeOverridden || false;
}

function clearForm() {
  document.getElementById('ruleSettingsForm').reset();
  currentRecord = null;
  
  // Clear selection
  document.querySelectorAll('.grid-row').forEach(row => row.classList.remove('selected'));
  
  // Disable buttons
  document.getElementById('alterBtn').disabled = true;
  document.getElementById('removeBtn').disabled = true;
  document.getElementById('updateBtn').disabled = true;
}

// ========== CRUD OPERATIONS ==========
function handleNew() {
  isEditMode = true;
  clearForm();
  enableFormFields();
  
  document.getElementById('saveBtn').disabled = false;
  document.getElementById('cancelBtn').disabled = false;
  document.getElementById('updateBtn').disabled = true;
  
  showStatusMessage('Enter new rule details', 'info');
}

function handleAlter() {
  if (!currentRecord) {
    showStatusMessage('Please select a record to alter', 'warning');
    return;
  }

  isEditMode = true;
  enableFormFields();
  
  document.getElementById('updateBtn').disabled = false;
  document.getElementById('cancelBtn').disabled = false;
  document.getElementById('saveBtn').disabled = true;
  
  showStatusMessage('Modify rule details and click Update', 'info');
}

function handleRemove() {
  if (!currentRecord) {
    showStatusMessage('Please select a record to remove', 'warning');
    return;
  }

  if (confirm(`Are you sure you want to remove rule ${currentRecord.ruleId}?`)) {
    const index = rulesData.findIndex(r => r.ruleId === currentRecord.ruleId);
    if (index > -1) {
      rulesData.splice(index, 1);
      renderGrid();
      clearForm();
      showStatusMessage('Rule removed successfully', 'success');
    }
  }
}

function handleUpdate() {
  if (!validateForm()) {
    return;
  }

  const index = rulesData.findIndex(r => r.ruleId === currentRecord.ruleId);
  if (index > -1) {
    rulesData[index] = {
      ...currentRecord,
      workflowTypeId: document.getElementById('workflowTypeId').value,
      workflowStage: document.getElementById('workflowStage').value,
      ruleType: document.getElementById('ruleType').value,
      ruleId: document.getElementById('ruleId').value,
      isMandatory: document.getElementById('isMandatory').checked,
      canBeOverridden: document.getElementById('allowOverride').checked,
      ruleTypeName: document.getElementById('ruleType').selectedOptions[0]?.text || ''
    };

    const currentUser = 'System User';
    const currentDateTime = new Date().toLocaleString();
    document.getElementById('modifiedBy').value = currentUser;
    document.getElementById('modifiedOn').value = currentDateTime;

    renderGrid();
    disableFormFields();
    isEditMode = false;
    
    document.getElementById('updateBtn').disabled = true;
    document.getElementById('cancelBtn').disabled = true;
    
    showStatusMessage('Rule updated successfully', 'success');
  }
}

function handleClear() {
  clearForm();
  disableFormFields();
  showStatusMessage('Form cleared', 'info');
}

function handleSave() {
  if (!validateForm()) {
    return;
  }

  const newRule = {
    ruleId: document.getElementById('ruleId').value,
    description: `Rule ${document.getElementById('ruleId').value}`,
    workflowTypeId: document.getElementById('workflowTypeId').value,
    workflowStage: document.getElementById('workflowStage').value,
    ruleType: document.getElementById('ruleType').value,
    isMandatory: document.getElementById('isMandatory').checked,
    canBeOverridden: document.getElementById('allowOverride').checked,
    ruleTypeName: document.getElementById('ruleType').selectedOptions[0]?.text || ''
  };

  rulesData.push(newRule);

  const currentUser = 'System User';
  const currentDateTime = new Date().toLocaleString();
  document.getElementById('createdBy').value = currentUser;
  document.getElementById('createdOn').value = currentDateTime;

  renderGrid();
  disableFormFields();
  isEditMode = false;
  
  document.getElementById('saveBtn').disabled = true;
  document.getElementById('cancelBtn').disabled = true;
  
  showStatusMessage('Rule saved successfully', 'success');
}

function handleCancel() {
  if (confirm('Discard all changes?')) {
    clearForm();
    disableFormFields();
    isEditMode = false;
    
    document.getElementById('saveBtn').disabled = true;
    document.getElementById('cancelBtn').disabled = true;
    document.getElementById('updateBtn').disabled = true;
    
    showStatusMessage('Changes discarded', 'info');
  }
}

// ========== RIGHT PANEL ACTIONS ==========
function handleViewAll() {
  renderGrid();
  showStatusMessage('Displaying all rules', 'info');
}

function handleView() {
  if (!currentRecord) {
    showStatusMessage('Please select a record to view', 'warning');
    return;
  }
  
  disableFormFields();
  showStatusMessage('Viewing record in read-only mode', 'info');
}

function handleAdd() {
  handleNew();
}

function handleEdit() {
  handleAlter();
}

function handleDelete() {
  handleRemove();
}

// ========== NAVIGATION ==========
function navigateType(direction) {
  const select = document.getElementById('ruleType');
  const currentIndex = select.selectedIndex;
  const newIndex = currentIndex + direction;
  
  if (newIndex >= 0 && newIndex < select.options.length) {
    select.selectedIndex = newIndex;
    showStatusMessage(`Navigated to ${select.options[newIndex].text}`, 'info');
  }
}

function navigateStage(direction) {
  const select = document.getElementById('workflowStage');
  const currentIndex = select.selectedIndex;
  const newIndex = currentIndex + direction;
  
  if (newIndex >= 0 && newIndex < select.options.length) {
    select.selectedIndex = newIndex;
    showStatusMessage(`Navigated to ${select.options[newIndex].text}`, 'info');
  }
}

// ========== SEARCH FUNCTIONS ==========
function searchWorkflowType() {
  if (!isEditMode) return;
  
  const typeId = prompt('Enter Workflow Type ID:');
  if (typeId) {
    document.getElementById('workflowTypeId').value = typeId;
    showStatusMessage(`Workflow Type ID set to ${typeId}`, 'success');
  }
}

function searchRule() {
  if (!isEditMode) return;
  
  const ruleId = prompt('Enter Rule ID:');
  if (ruleId) {
    document.getElementById('ruleId').value = ruleId;
    showStatusMessage(`Rule ID set to ${ruleId}`, 'success');
  }
}

// ========== FORM MANAGEMENT ==========
function enableFormFields() {
  document.getElementById('workflowTypeId').disabled = false;
  document.getElementById('workflowStage').disabled = false;
  document.getElementById('ruleType').disabled = false;
  document.getElementById('ruleId').disabled = false;
  document.getElementById('isMandatory').disabled = false;
  document.getElementById('allowOverride').disabled = false;
  
  const searchButtons = document.querySelectorAll('.search-btn');
  searchButtons.forEach(btn => btn.disabled = false);
}

function disableFormFields() {
  document.getElementById('workflowTypeId').disabled = true;
  document.getElementById('workflowStage').disabled = true;
  document.getElementById('ruleType').disabled = true;
  document.getElementById('ruleId').disabled = true;
  document.getElementById('isMandatory').disabled = true;
  document.getElementById('allowOverride').disabled = true;
  
  const searchButtons = document.querySelectorAll('.search-btn');
  searchButtons.forEach(btn => btn.disabled = true);
}

function validateForm() {
  const workflowTypeId = document.getElementById('workflowTypeId').value.trim();
  const ruleId = document.getElementById('ruleId').value.trim();
  const workflowStage = document.getElementById('workflowStage').value;
  const ruleType = document.getElementById('ruleType').value;

  if (!workflowTypeId) {
    showStatusMessage('Workflow Type ID is required', 'error');
    document.getElementById('workflowTypeId').focus();
    return false;
  }

  if (!workflowStage) {
    showStatusMessage('Workflow Stage is required', 'error');
    document.getElementById('workflowStage').focus();
    return false;
  }

  if (!ruleType) {
    showStatusMessage('Rule Type is required', 'error');
    document.getElementById('ruleType').focus();
    return false;
  }

  if (!ruleId) {
    showStatusMessage('Rule ID is required', 'error');
    document.getElementById('ruleId').focus();
    return false;
  }

  return true;
}

// ========== STATUS MESSAGING ==========
function showStatusMessage(message, type = 'info') {
  const statusDiv = document.getElementById('statusMessage');
  
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
  
  setTimeout(() => {
    statusDiv.classList.remove('show');
  }, 5000);
}

// ========== KEYBOARD NAVIGATION ==========
document.addEventListener('keydown', function(e) {
  if (e.ctrlKey && e.key === 's') {
    e.preventDefault();
    if (isEditMode && !document.getElementById('saveBtn').disabled) {
      handleSave();
    }
  }
  
  if (e.key === 'Escape') {
    if (isEditMode) {
      handleCancel();
    }
  }

  if (e.ctrlKey && e.key === 'n') {
    e.preventDefault();
    handleNew();
  }
});
