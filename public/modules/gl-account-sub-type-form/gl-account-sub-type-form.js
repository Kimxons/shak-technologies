// GL Account Sub Type Form Module - Event Handlers and Functionality

document.addEventListener('DOMContentLoaded', function() {
  // Initialize module
  initializeGLAccountSubTypeForm();
  attachEventListeners();
});

function initializeGLAccountSubTypeForm() {
  // Set default values
  document.getElementById('glSubTypeGroupSelect').value = '--Select--';
}

function attachEventListeners() {
  // Content Area Action Buttons
  const newBtn = document.getElementById('newBtn');
  if (newBtn) {
    newBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleNewAction();
    });
  }

  const alterBtn = document.getElementById('alterBtn');
  if (alterBtn) {
    alterBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleAlterAction();
    });
  }

  const removeBtn = document.getElementById('removeBtn');
  if (removeBtn) {
    removeBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleRemoveAction();
    });
  }

  const updateBtn = document.getElementById('updateBtn');
  if (updateBtn) {
    updateBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleUpdateAction();
    });
  }

  const clearBtn = document.getElementById('clearBtn');
  if (clearBtn) {
    clearBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleClearAction();
    });
  }

  // Right Panel Action Buttons
  const viewBtn = document.getElementById('viewBtn');
  if (viewBtn) {
    viewBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleViewAction();
    });
  }

  const addBtn = document.getElementById('addBtn');
  if (addBtn) {
    addBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleAddAction();
    });
  }

  const editBtn = document.getElementById('editBtn');
  if (editBtn) {
    editBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleEditAction();
    });
  }

  const deleteBtn = document.getElementById('deleteBtn');
  if (deleteBtn) {
    deleteBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleDeleteAction();
    });
  }

  const saveBtn = document.getElementById('saveBtn');
  if (saveBtn) {
    saveBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleSaveAction();
    });
  }

  const cancelBtn = document.getElementById('cancelBtn');
  if (cancelBtn) {
    cancelBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleCancelAction();
    });
  }

  const backBtn = document.getElementById('backBtn');
  if (backBtn) {
    backBtn.addEventListener('click', function(e) {
      e.preventDefault();
      handleBackAction();
    });
  }
}

function handleNewAction() {
  console.log('New action triggered');
  // Clear form for new entry
  handleClearAction();
}

function handleAlterAction() {
  console.log('Alter action triggered');
  const selectedRow = document.querySelector('#subAccountTypeTableBody tr.selected');
  if (selectedRow) {
    // TODO: Load selected row data into form for editing
    console.log('Altering selected record');
  }
}

function handleRemoveAction() {
  console.log('Remove action triggered');
  const selectedRow = document.querySelector('#subAccountTypeTableBody tr.selected');
  if (selectedRow) {
    if (confirm('Are you sure you want to remove this record?')) {
      selectedRow.remove();
      // TODO: Make API call to remove record
    }
  }
}

function handleUpdateAction() {
  console.log('Update action triggered');
  // TODO: Implement update functionality
}

function handleClearAction() {
  console.log('Clear action triggered');
  
  // Clear form fields
  document.getElementById('glSubTypeGroupSelect').value = '--Select--';
  document.getElementById('subAccountTypeIdField').value = '';
  document.getElementById('descriptionField').value = '';
  
  // Clear Behind The Scene fields
  document.getElementById('createdByField').value = '';
  document.getElementById('modifiedByField').value = '';
  document.getElementById('supervisedByField').value = '';
  document.getElementById('createdOnField').value = '';
  document.getElementById('modifiedOnField').value = '';
  document.getElementById('supervisedOnField').value = '';
}

function handleViewAction() {
  console.log('View action triggered');
  const selectedRow = document.querySelector('#subAccountTypeTableBody tr.selected');
  if (selectedRow) {
    // TODO: Open view dialog for selected record
  }
}

function handleAddAction() {
  console.log('Add action triggered');
  // Add current form data to table
  addSubAccountTypeToTable();
}

function addSubAccountTypeToTable() {
  const tableBody = document.getElementById('subAccountTypeTableBody');
  
  // Get form values
  const subAccountTypeId = document.getElementById('subAccountTypeIdField').value;
  const description = document.getElementById('descriptionField').value;

  if (!subAccountTypeId) {
    console.log('Please enter Sub Account Type ID');
    return;
  }

  // Remove "No records to display" message if present
  const noRecordsRow = tableBody.querySelector('tr:has(td[colspan="2"])');
  if (noRecordsRow) {
    noRecordsRow.remove();
  }

  // Add new row
  const row = document.createElement('tr');
  row.innerHTML = `
    <td>${escapeHtml(subAccountTypeId)}</td>
    <td>${escapeHtml(description)}</td>
  `;
  
  row.addEventListener('click', function() {
    // Remove selection from other rows
    tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
    // Select this row
    this.classList.add('selected');
  });
  
  tableBody.appendChild(row);
}

function handleEditAction() {
  console.log('Edit action triggered');
  const selectedRow = document.querySelector('#subAccountTypeTableBody tr.selected');
  if (selectedRow) {
    // TODO: Load selected row data into form for editing
  }
}

function handleDeleteAction() {
  console.log('Delete action triggered');
  const selectedRow = document.querySelector('#subAccountTypeTableBody tr.selected');
  if (selectedRow) {
    if (confirm('Are you sure you want to delete this record?')) {
      selectedRow.remove();
      // TODO: Make API call to delete record
      
      // Show "No records" message if table is empty
      const tableBody = document.getElementById('subAccountTypeTableBody');
      if (tableBody.querySelectorAll('tr').length === 0) {
        tableBody.innerHTML = '<tr style="text-align: center; color: #64748b; font-size: 0.8rem;">' +
                             '<td colspan="2" style="padding: 20px;">No records to display.</td></tr>';
      }
    }
  }
}

function handleSaveAction() {
  console.log('Save action triggered');
  
  // Validate form
  const subAccountTypeId = document.getElementById('subAccountTypeIdField').value;
  if (!subAccountTypeId) {
    console.log('Please enter Sub Account Type ID before saving.');
    return;
  }

  // TODO: Implement save functionality - submit data to API
  console.log('Saving GL Account Sub Type...');
}

function handleCancelAction() {
  console.log('Cancel action triggered');
  handleClearAction();
  
  // Clear table
  const tableBody = document.getElementById('subAccountTypeTableBody');
  tableBody.innerHTML = '<tr style="text-align: center; color: #64748b; font-size: 0.8rem;">' +
                       '<td colspan="2" style="padding: 20px;">No records to display.</td></tr>';
}

function handleBackAction() {
  console.log('Back action triggered');
  // Close the modal/dialog
  try {
    const parentModal = window.parent.document.getElementById('glAccountSubTypeNestedModal');
    if (parentModal) {
      const bootstrapModal = window.parent.bootstrap.Modal.getInstance(parentModal);
      if (bootstrapModal) {
        bootstrapModal.hide();
      }
    }
  } catch (e) {
    console.log('Back button clicked');
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
