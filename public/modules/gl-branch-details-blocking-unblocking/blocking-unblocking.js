// GL Branch Details - Blocking/Unblocking Module - Event Handlers and Logic

document.addEventListener('DOMContentLoaded', function () {
  initializeBlockingUnblockingHandlers();
});

function initializeBlockingUnblockingHandlers() {
  // Disable form fields initially
  disableFormFields();
  
  // Load Behind The Scene data (but not the editable fields)
  loadBehindTheSceneData();
  
  // Action Button Handlers
  document.getElementById('historyBtn').addEventListener('click', function () {
    showHistory();
  });

  document.getElementById('editBtn').addEventListener('click', function () {
    editBlockingUnblocking();
  });

  document.getElementById('saveBtn').addEventListener('click', function () {
    saveBlockingUnblocking();
  });

  document.getElementById('cancelBtn').addEventListener('click', function () {
    cancelBlockingUnblocking();
  });

  document.getElementById('backBtn').addEventListener('click', function () {
    backToParent();
  });
}

// Action Functions
function loadBehindTheSceneData() {
  try {
    // Get account info from parent GL Branch Details form
    const parentDoc = window.parent.document;
    const glBranchDetailsModal = parentDoc.getElementById('glBranchDetailsModal');
    
    if (!glBranchDetailsModal) return;
    
    const glBranchDetailsIframe = glBranchDetailsModal.querySelector('iframe');
    if (!glBranchDetailsIframe) return;
    
    const glBranchDetailsDoc = glBranchDetailsIframe.contentDocument || glBranchDetailsIframe.contentWindow.document;
    
    const branchId = glBranchDetailsDoc.getElementById('branchIdField')?.value;
    const accountId = glBranchDetailsDoc.getElementById('accountIdField')?.value;
    
    if (!accountId) return;
    
    // Prepare request data
    const requestData = {
      OurBranchID: branchId || '0101',
      ModuleTypeID: 'G',
      RelevantID: accountId,
      OperatorID: 'ADMIN',
      ModuleID: 1
    };
    
    // Call the API to get current blocking status
    GeneralLedgerService.getBlockedDetails(requestData)
      .then(response => {
        if (response.success && response.data && response.data.Details01 && response.data.Details01.length > 0) {
          // Get the most recent blocking record (first one)
          const currentRecord = response.data.Details01[0];
          
          // Populate ONLY Behind The Scene fields (readonly fields)
          // DO NOT populate the editable fields at the top (Reason, Description, Instruction Given By)
          document.getElementById('previousStatusField').value = currentRecord.UnblockedDate ? 'Unblocked' : 'Blocked';
          document.getElementById('dateField').value = currentRecord.BlockedDate || '';
          document.getElementById('reasonIdField').value = currentRecord.BlockedReasonID || '';
          document.getElementById('btsDescriptionField').value = currentRecord.BlockedDescription || '';
          document.getElementById('btsInstructionGivenByField').value = currentRecord.BlockedInstructionBy || '';
          document.getElementById('createdByField').value = currentRecord.CreatedBy || '';
          document.getElementById('supervisedByField').value = currentRecord.SupervisedBy || '';
          document.getElementById('createdOnField').value = currentRecord.CreatedOn || '';
          document.getElementById('supervisedOnField').value = currentRecord.SupervisedOn || '';
        }
      })
      .catch(error => {
        console.error('Error loading Behind The Scene data:', error);
      });
      
  } catch (error) {
    console.error('Error in loadBehindTheSceneData:', error);
  }
}

function showHistory() {
  console.log('Showing blocking/unblocking history...');
  
  try {
    // Get account info from parent GL Branch Details form
    // The parent document contains the GL Branch Details modal with an iframe
    const parentDoc = window.parent.document;
    const glBranchDetailsModal = parentDoc.getElementById('glBranchDetailsModal');
    
    if (!glBranchDetailsModal) {
      showErrorMessage('Cannot access GL Branch Details modal');
      return;
    }
    
    const glBranchDetailsIframe = glBranchDetailsModal.querySelector('iframe');
    if (!glBranchDetailsIframe) {
      showErrorMessage('Cannot access GL Branch Details form');
      return;
    }
    
    const glBranchDetailsDoc = glBranchDetailsIframe.contentDocument || glBranchDetailsIframe.contentWindow.document;
    
    const branchId = glBranchDetailsDoc.getElementById('branchIdField')?.value;
    const accountId = glBranchDetailsDoc.getElementById('accountIdField')?.value;
    
    console.log('Branch ID:', branchId, 'Account ID:', accountId);
    
    if (!accountId) {
      showErrorMessage('Please select an account from the main form first');
      return;
    }
    
    // Prepare request data
    const requestData = {
      OurBranchID: branchId || '0101',
      ModuleTypeID: 'G', // 'G' for General Ledger module
      RelevantID: accountId,
      OperatorID: 'ADMIN', // Replace with actual operator ID from session
      ModuleID: 1 // smallint value
    };
    
    console.log('Fetching blocked details with params:', requestData);
    
    // Call the API
    GeneralLedgerService.getBlockedDetails(requestData)
      .then(response => {
        console.log('API Response:', response);
        console.log('Response Data:', response.data);
        if (response.success && response.data) {
          // Show the history modal with the data
          showHistoryModal(response.data, branchId, accountId);
        } else {
          showErrorMessage(response.message || 'No blocking history found for this account');
        }
      })
      .catch(error => {
        console.error('Error fetching blocked details:', error);
        showErrorMessage('Failed to fetch blocking history: ' + (error.message || 'Unknown error'));
      });
      
  } catch (error) {
    console.error('Error in showHistory:', error);
    showErrorMessage('Failed to access account information from parent form');
  }
}

function showHistoryModal(data, branchId, accountId) {
  // Set modal title
  document.getElementById('historyAccountTitle').textContent = `${branchId} : ${accountId}`;
  
  // Get the table body
  const tableBody = document.getElementById('blockingHistoryTableBody');
  
  // Clear existing rows
  tableBody.innerHTML = '';
  
  // Handle array of details from the API response
  // The data structure is {Details: [...], Details01: [...]}
  // Details = audit/tracking data, Details01 = actual blocking data
  const details = data.Details01 || [];
  
  console.log('Total Details01 records:', details.length);
  console.log('Full Details01 data:', details);
  
  // Warning if only 1 record found - backend issue
  if (details.length === 1) {
    console.warn('⚠️ Only 1 record returned by stored procedure. The SP may be filtering to TOP 1 or most recent only.');
    console.warn('⚠️ Check if dbo.p_GetBlockedDetails needs modification to return all historical records.');
  }
  
  // Check if BlockedReasonID is missing from response
  if (details.length > 0 && !details[0].hasOwnProperty('BlockedReasonID')) {
    console.error('❌ BlockedReasonID field is missing from stored procedure response!');
    console.error('❌ The stored procedure dbo.p_GetBlockedDetails must SELECT BlockedReasonID column.');
  }
  
  if (!details || details.length === 0) {
    const row = document.createElement('tr');
    row.innerHTML = '<td colspan="5" style="text-align: center; padding: 20px; color: #6b7280;">No blocking history found</td>';
    tableBody.appendChild(row);
  } else {
    // Populate table rows
    details.forEach((record, index) => {
      console.log(`History Record ${index + 1}:`, record);
      const row = document.createElement('tr');
      row.style.cursor = 'pointer';
      
      // If unblocked, style the row differently
      if (record.UnblockedDate) {
        row.style.backgroundColor = '#f0f9ff';
        row.style.color = '#6b7280';
      }
      
      // Map reason ID to text if BlockedReason is null
      const reasonMap = {
        '1': 'Default',
        '2': 'Suspicious Account Activity',
        '3': 'KYC Norms not met',
        '4': 'On Leave',
        1: 'Default',
        2: 'Suspicious Account Activity',
        3: 'KYC Norms not met',
        4: 'On Leave'
      };
      
      // Use BlockedReason if available, otherwise map from BlockedReasonID
      let reasonText = record.BlockedReason;
      if (!reasonText) {
        if (record.BlockedReasonID) {
          reasonText = reasonMap[record.BlockedReasonID] || reasonMap[record.BlockedReasonID.toString()] || `Reason ID: ${record.BlockedReasonID}`;
        } else {
          reasonText = '⚠️ BlockedReasonID missing from SP';
        }
      }
      
      console.log(`Record ${index + 1}: BlockedReasonID=${record.BlockedReasonID}, BlockedReason=${record.BlockedReason}, Mapped=${reasonText}`);
      
      // Details01 contains: BlockedDate, BlockedReason, BlockedDescription, BlockedInstructionBy
      row.innerHTML = `
        <td style="text-align: center;">${index + 1}</td>
        <td>${record.BlockedDate || ''}</td>
        <td>${reasonText || ''}</td>
        <td>${record.BlockedDescription || ''}</td>
        <td>${record.BlockedInstructionBy || ''}</td>
      `;
      
      // Add click handler to select/highlight row
      row.addEventListener('click', function() {
        // Remove highlight from all rows
        tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
        // Highlight clicked row
        row.classList.add('table-active');
        
        // Populate the main form with this record's details
        populateBlockedDetailsForm(record);
      });
      
      tableBody.appendChild(row);
    });
  }
  
  // Show the modal using Bootstrap 5
  const modal = new bootstrap.Modal(document.getElementById('blockingHistoryModal'));
  modal.show();
}

function editBlockingUnblocking() {
  console.log('Editing blocking/unblocking record...');
  enableFormFields();
  clearErrorMessage();
}

function saveBlockingUnblocking() {
  console.log('Saving blocking/unblocking record...');
  clearErrorMessage();
  
  // Validate required fields
  const reason = document.getElementById('reasonSelect').value;
  const description = document.getElementById('descriptionField').value;
  
  if (!reason || reason === '') {
    showErrorMessage('Please select a reason');
    return;
  }
  
  if (!description || description.trim() === '') {
    showErrorMessage('Please enter a description');
    return;
  }
  
  try {
    // Get account info from parent GL Branch Details form
    const parentDoc = window.parent.document;
    const glBranchDetailsModal = parentDoc.getElementById('glBranchDetailsModal');
    
    if (!glBranchDetailsModal) {
      showErrorMessage('Cannot access GL Branch Details modal');
      return;
    }
    
    const glBranchDetailsIframe = glBranchDetailsModal.querySelector('iframe');
    if (!glBranchDetailsIframe) {
      showErrorMessage('Cannot access GL Branch Details form');
      return;
    }
    
    const glBranchDetailsDoc = glBranchDetailsIframe.contentDocument || glBranchDetailsIframe.contentWindow.document;
    
    const branchId = glBranchDetailsDoc.getElementById('branchIdField')?.value;
    const accountId = glBranchDetailsDoc.getElementById('accountIdField')?.value;
    
    if (!accountId) {
      showErrorMessage('Please select an account from the main form first');
      return;
    }
    
    // Prepare request data
    const currentDate = new Date().toISOString().slice(0, 19).replace('T', ' ');
    const instructionGivenBy = document.getElementById('instructionGivenByField').value;
    
    const requestData = {
      OurBranchID: branchId || '0101',
      ModuleTypeID: 'G', // 'G' for General Ledger module
      RelevantID: accountId,
      BlockedDate: currentDate,
      BlockedReasonID: reason,
      BlockedDescription: description,
      BlockedInstructionBy: instructionGivenBy || '',
      CreatedBy: 'ADMIN', // Replace with actual operator ID from session
      CreatedOn: currentDate,
      SupervisedBy: '' // Will be filled when supervised
    };
    
    console.log('Saving blocked details with request:', requestData);
    
    // Call the API
    GeneralLedgerService.addBlockedDetails(requestData)
      .then(response => {
        console.log('Save Response:', response);
        if (response.success) {
          alert('Blocking details saved successfully!');
          disableFormFields();
          clearForm();
        } else {
          showErrorMessage(response.message || 'Failed to save blocking details');
        }
      })
      .catch(error => {
        console.error('Error saving blocked details:', error);
        showErrorMessage('Failed to save blocking details: ' + (error.message || 'Unknown error'));
      });
      
  } catch (error) {
    console.error('Error in saveBlockingUnblocking:', error);
    showErrorMessage('Failed to save: ' + error.message);
  }
}

function cancelBlockingUnblocking() {
  console.log('Cancelling blocking/unblocking operation...');
  clearForm();
  disableFormFields();
  clearErrorMessage();
}

function backToParent() {
  console.log('Going back to GL Branch Details...');
  
  try {
    // Close the nested modal
    const nestedModalElement = window.parent.document.getElementById('glBranchDetailsBlockingUnblockingModal');
    if (nestedModalElement) {
      const bootstrapModal = window.parent.bootstrap.Modal.getInstance(nestedModalElement);
      if (bootstrapModal) {
        bootstrapModal.hide();
      }
    }
    
    // Restore z-index of parent modal
    const parentModal = window.parent.document.getElementById('glBranchDetailsModal');
    if (parentModal) {
      parentModal.style.zIndex = '1050';
      parentModal.style.position = 'relative';
      
      const setParentZIndex = () => {
        parentModal.style.zIndex = '1050 !important';
        parentModal.style.position = 'relative';
      };
      
      setParentZIndex();
      setTimeout(setParentZIndex, 50);
      setTimeout(setParentZIndex, 150);
    }
  } catch (e) {
    console.log('Error going back to parent modal:', e);
  }
}

// Dropdown Change Handlers
function onReasonChanged() {
  const reason = document.getElementById('reasonSelect').value;
  console.log('Reason changed to:', reason);
  
  if (reason && reason !== '--Select--') {
    // Load reason details
    loadReasonDetails(reason);
  }
}

// Form Management Functions
function clearForm() {
  document.getElementById('reasonSelect').value = '--Select--';
  document.getElementById('descriptionField').value = '';
  document.getElementById('instructionGivenByField').value = '';
  clearBehindTheSceneFields();
}

function clearBehindTheSceneFields() {
  document.getElementById('previousStatusField').value = '';
  document.getElementById('dateField').value = '';
  document.getElementById('reasonIdField').value = '';
  document.getElementById('btsDescriptionField').value = '';
  document.getElementById('btsInstructionGivenByField').value = '';
  document.getElementById('createdByField').value = '';
  document.getElementById('supervisedByField').value = '';
  document.getElementById('createdOnField').value = '';
  document.getElementById('supervisedOnField').value = '';
}

function getFormData() {
  return {
    reason: document.getElementById('reasonSelect').value,
    description: document.getElementById('descriptionField').value,
    instructionGivenBy: document.getElementById('instructionGivenByField').value
  };
}

function enableFormFields() {
  // Enable only the editable fields (not Behind The Scene fields)
  document.getElementById('reasonSelect').disabled = false;
  document.getElementById('descriptionField').disabled = false;
  document.getElementById('instructionGivenByField').disabled = false;
}

function disableFormFields() {
  // Disable the editable fields
  document.getElementById('reasonSelect').disabled = true;
  document.getElementById('descriptionField').disabled = true;
  document.getElementById('instructionGivenByField').disabled = true;
}

// Data Loading Functions
function loadReasonDetails(reasonCode) {
  console.log('Loading reason details for:', reasonCode);
  
  // Example data - replace with actual API call
  const reasonData = {
    reasonCode: reasonCode,
    reasonId: 'R001',
    description: 'Account blocking reason',
    instructionGivenBy: 'MANAGER',
    previousStatus: 'Active',
    date: new Date().toISOString().split('T')[0],
    createdBy: 'ADMIN',
    supervisedBy: 'MANAGER',
    createdOn: '2024-01-01',
    supervisedOn: '2024-01-02'
  };
  
  populateFormData(reasonData);
}

function populateFormData(data) {
  document.getElementById('reasonSelect').value = data.reasonCode || '--Select--';
  document.getElementById('descriptionField').value = data.description || '';
  document.getElementById('instructionGivenByField').value = data.instructionGivenBy || '';
  
  // Populate Behind The Scene fields
  document.getElementById('previousStatusField').value = data.previousStatus || '';
  document.getElementById('dateField').value = data.date || '';
  document.getElementById('reasonIdField').value = data.reasonId || '';
  document.getElementById('btsDescriptionField').value = data.description || '';
  document.getElementById('btsInstructionGivenByField').value = data.instructionGivenBy || '';
  document.getElementById('createdByField').value = data.createdBy || '';
  document.getElementById('supervisedByField').value = data.supervisedBy || '';
  document.getElementById('createdOnField').value = data.createdOn || '';
  document.getElementById('supervisedOnField').value = data.supervisedOn || '';
}

function populateBlockedDetailsForm(data) {
  // Handle array response (take first record if multiple)
  const record = Array.isArray(data) ? data[0] : data;
  
  if (!record) {
    showErrorMessage('No blocking details found');
    return;
  }
  
  // Map API response fields from dbo.p_GetBlockedDetails to form fields
  // Main section fields
  document.getElementById('reasonSelect').value = record.BlockedReason || '--Select--';
  document.getElementById('descriptionField').value = record.BlockedDescription || '';
  document.getElementById('instructionGivenByField').value = record.BlockedInstructionBy || '';
  
  // Behind The Scene fields
  // Previous Status - check if it's blocked or unblocked
  const status = record.UnBlockedDate ? 'Unblocked' : 'Blocked';
  document.getElementById('previousStatusField').value = status;
  document.getElementById('dateField').value = record.BlockedDate || '';
  document.getElementById('reasonIdField').value = record.ReferenceID || '';
  document.getElementById('btsDescriptionField').value = record.BlockedDescription || '';
  document.getElementById('btsInstructionGivenByField').value = record.BlockedInstructionBy || '';
  document.getElementById('createdByField').value = record.CreatedBy || '';
  document.getElementById('supervisedByField').value = record.SupervisedBy || '';
  document.getElementById('createdOnField').value = record.CreatedOn || '';
  document.getElementById('supervisedOnField').value = record.SupervisedOn || '';
  
  clearErrorMessage();
  console.log('Form populated with blocked details:', record);
}

// Error Message Management
function showErrorMessage(message) {
  const container = document.getElementById('errorMessageContainer');
  const messageText = document.getElementById('errorMessageText');
  messageText.textContent = message;
  container.style.display = 'block';
}

function clearErrorMessage() {
  const container = document.getElementById('errorMessageContainer');
  container.style.display = 'none';
}

// Form Validation
function validateForm() {
  const reason = document.getElementById('reasonSelect').value;
  
  if (!reason || reason === '--Select--') {
    showErrorMessage('Field cannot be blank (No:1211)');
    return false;
  }
  
  return true;
}

// Utility Functions
function setFieldValue(fieldId, value) {
  const field = document.getElementById(fieldId);
  if (field) {
    field.value = value;
  }
}

function getFieldValue(fieldId) {
  const field = document.getElementById(fieldId);
  return field ? field.value : '';
}
