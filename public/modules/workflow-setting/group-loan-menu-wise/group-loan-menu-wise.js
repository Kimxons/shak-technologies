// Group Loan Menu Wise - Kairo Banking Application

// ========== STATE MANAGEMENT ==========
let isEditMode = false;
let currentRecord = null;
let menuData = [];

// Sample data
const sampleData = [
  {
    wfAdvTypeID: 'ADV001',
    wfAdvTypeName: 'Group Loan Application',
    wfAdvStageID: 'STG001'
  },
  {
    wfAdvTypeID: 'ADV002',
    wfAdvTypeName: 'Group Loan Approval',
    wfAdvStageID: 'STG002'
  },
  {
    wfAdvTypeID: 'ADV003',
    wfAdvTypeName: 'Group Loan Disbursement',
    wfAdvStageID: 'STG003'
  }
];

// ========== INITIALIZATION ==========
document.addEventListener('DOMContentLoaded', function() {
  initializeForm();
  setupEventListeners();
  loadMenuData();
});

function initializeForm() {
  console.log('Group Loan Menu Wise form initialized');
  disableFormFields();
  
  // Set default values
  document.getElementById('workflowStage').value = 'SCORING';
  document.getElementById('ruleType').value = 'Group Loan Menu';
  document.getElementById('ruleId').value = 'LWKF06';
}

// ========== EVENT LISTENERS ==========
function setupEventListeners() {
  document.getElementById('groupLoanForm').addEventListener('submit', function(e) {
    e.preventDefault();
  });
}

// ========== DATA MANAGEMENT ==========
function loadMenuData() {
  menuData = [...sampleData];
  renderGrid();
}

function renderGrid() {
  const gridBody = document.getElementById('gridBody');
  
  if (menuData.length === 0) {
    gridBody.innerHTML = '<div class="empty-state">No records to display</div>';
    return;
  }

  let html = '';
  menuData.forEach((item, index) => {
    html += `
      <div class="grid-row" onclick="selectRow(${index})">
        <div class="grid-col">${item.wfAdvTypeID}</div>
        <div class="grid-col">${item.wfAdvTypeName}</div>
        <div class="grid-col">${item.wfAdvStageID}</div>
      </div>
    `;
  });

  gridBody.innerHTML = html;
}

function selectRow(index) {
  currentRecord = menuData[index];
  
  // Remove previous selection
  document.querySelectorAll('.grid-row').forEach(row => row.classList.remove('selected'));
  
  // Add selection to clicked row
  document.querySelectorAll('.grid-row')[index].classList.add('selected');
  
  showStatusMessage(`Selected: ${currentRecord.wfAdvTypeName}`, 'info');
}

// ========== CRUD OPERATIONS ==========
function handleEdit() {
  isEditMode = true;
  enableFormFields();
  
  document.getElementById('saveBtn').disabled = false;
  document.getElementById('cancelBtn').disabled = false;
  
  showStatusMessage('Edit mode enabled - modify fields and save', 'info');
}

function handleSave() {
  const currentUser = 'System User';
  const currentDateTime = new Date().toLocaleString();

  if (!document.getElementById('createdBy').value) {
    document.getElementById('createdBy').value = currentUser;
    document.getElementById('createdOn').value = currentDateTime;
  }

  document.getElementById('supervisedBy').value = currentUser;
  document.getElementById('supervisedOn').value = currentDateTime;

  disableFormFields();
  isEditMode = false;
  
  document.getElementById('saveBtn').disabled = true;
  document.getElementById('cancelBtn').disabled = true;
  
  showStatusMessage('Changes saved successfully', 'success');
}

function handleCancel() {
  if (confirm('Discard all changes?')) {
    disableFormFields();
    isEditMode = false;
    
    document.getElementById('saveBtn').disabled = true;
    document.getElementById('cancelBtn').disabled = true;
    
    showStatusMessage('Changes discarded', 'info');
  }
}

// ========== FORM MANAGEMENT ==========
function enableFormFields() {
  document.getElementById('workflowStage').disabled = false;
  document.getElementById('ruleType').disabled = false;
  document.getElementById('ruleId').disabled = false;
  document.getElementById('isMandatory').disabled = false;
  document.getElementById('allowOverride').disabled = false;
}

function disableFormFields() {
  document.getElementById('workflowStage').disabled = true;
  document.getElementById('ruleType').disabled = true;
  document.getElementById('ruleId').disabled = true;
  document.getElementById('isMandatory').disabled = true;
  document.getElementById('allowOverride').disabled = true;
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
