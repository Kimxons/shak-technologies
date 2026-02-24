// Maintain Institutions - JavaScript Functionality

document.addEventListener('DOMContentLoaded', function() {
  initializeForm();
  attachEventListeners();
});

// Form state management
let formState = {
  isEditing: false,
  originalData: {}
};

// Initialize form
function initializeForm() {
  // Set initial form state
  setFormEditable(false);
  
  // Initialize any default values if needed
  console.log('Maintain Institutions form initialized');
}

// Attach event listeners
function attachEventListeners() {
  // Action buttons
  const viewBtn = document.querySelector('.action-btn-view');
  const addBtn = document.querySelector('.action-btn-add');
  const editBtn = document.querySelector('.action-btn-edit');
  const deleteBtn = document.querySelector('.action-btn-delete');
  const saveBtn = document.querySelector('.action-btn-save');
  const cancelBtn = document.querySelector('.action-btn-cancel');
  const searchBtn = document.querySelector('.search-btn');

  if (viewBtn) viewBtn.addEventListener('click', handleView);
  if (addBtn) addBtn.addEventListener('click', handleAdd);
  if (editBtn) editBtn.addEventListener('click', handleEdit);
  if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
  if (saveBtn) saveBtn.addEventListener('click', handleSave);
  if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
  if (searchBtn) searchBtn.addEventListener('click', handleSearch);

  // Keyboard shortcuts
  document.addEventListener('keydown', handleKeyboardShortcuts);
}

// Handle View
function handleView() {
  console.log('View institution');
  // Implement view logic
  setFormEditable(false);
}

// Handle Add
function handleAdd() {
  console.log('Add new institution');
  formState.isEditing = true;
  clearForm();
  setFormEditable(true);
  enableSaveButton();
  
  // Focus on first input
  const firstInput = document.getElementById('institutionName');
  if (firstInput) firstInput.focus();
}

// Handle Edit
function handleEdit() {
  console.log('Edit institution');
  formState.isEditing = true;
  saveOriginalData();
  setFormEditable(true);
  enableSaveButton();
}

// Handle Delete
function handleDelete() {
  const institutionId = document.getElementById('institutionId').value;
  
  if (!institutionId) {
    alert('Please select an institution to delete');
    return;
  }

  if (confirm('Are you sure you want to delete this institution?')) {
    console.log('Delete institution:', institutionId);
    // Implement delete logic
    clearForm();
  }
}

// Handle Save
function handleSave() {
  if (!validateForm()) {
    return;
  }

  const formData = collectFormData();
  console.log('Save institution data:', formData);
  
  // Implement save logic here
  // After successful save:
  formState.isEditing = false;
  setFormEditable(false);
  disableSaveButton();
  
  alert('Institution saved successfully');
}

// Handle Cancel
function handleCancel() {
  if (formState.isEditing) {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
      restoreOriginalData();
      formState.isEditing = false;
      setFormEditable(false);
      disableSaveButton();
    }
  }
}

// Handle Search
function handleSearch() {
  console.log('Search institution');
  // Implement search/lookup logic
  // This would typically open a search modal or dropdown
}

// Form validation
function validateForm() {
  const institutionName = document.getElementById('institutionName').value.trim();
  
  if (!institutionName) {
    alert('Institution Name is required');
    document.getElementById('institutionName').focus();
    return false;
  }

  // Add more validation as needed
  
  return true;
}

// Collect form data
function collectFormData() {
  return {
    institutionId: document.getElementById('institutionId').value,
    institutionName: document.getElementById('institutionName').value,
    address1: document.getElementById('address1').value,
    address2: document.getElementById('address2').value,
    city: document.getElementById('city').value,
    country: document.getElementById('country').value,
    zipCode: document.getElementById('zipCode').value,
    emailId: document.getElementById('emailId').value,
    phone1: document.getElementById('phone1').value,
    phone2: document.getElementById('phone2').value,
    mobile: document.getElementById('mobile').value,
    faxNo: document.getElementById('faxNo').value,
    contactPerson: document.getElementById('contactPerson').value,
    exposureLimit: document.getElementById('exposureLimit').value,
    etb: document.getElementById('etb').value,
    payrollLay: document.getElementById('payrollLay').value
  };
}

// Save original data for cancel operation
function saveOriginalData() {
  formState.originalData = collectFormData();
}

// Restore original data
function restoreOriginalData() {
  if (formState.originalData) {
    Object.keys(formState.originalData).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        element.value = formState.originalData[key] || '';
      }
    });
  }
}

// Clear form
function clearForm() {
  const inputs = document.querySelectorAll('.form-control:not([readonly])');
  inputs.forEach(input => {
    if (input.tagName === 'SELECT') {
      input.selectedIndex = 0;
    } else {
      input.value = '';
    }
  });
  
  // Clear readonly fields in Behind The Scene section
  const readonlyInputs = document.querySelectorAll('.behind-scene-content .form-control[readonly]');
  readonlyInputs.forEach(input => input.value = '');
}

// Set form editable state
function setFormEditable(editable) {
  const editableInputs = document.querySelectorAll('.form-control:not([readonly])');
  editableInputs.forEach(input => {
    input.disabled = !editable;
  });
  
  const searchBtn = document.querySelector('.search-btn');
  if (searchBtn) {
    searchBtn.disabled = editable; // Disable search when editing
  }
}

// Enable save button
function enableSaveButton() {
  const saveBtn = document.querySelector('.action-btn-save');
  if (saveBtn) saveBtn.disabled = false;
}

// Disable save button
function disableSaveButton() {
  const saveBtn = document.querySelector('.action-btn-save');
  if (saveBtn) saveBtn.disabled = true;
}

// Keyboard shortcuts
function handleKeyboardShortcuts(event) {
  // Ctrl/Cmd + S to save
  if ((event.ctrlKey || event.metaKey) && event.key === 's') {
    event.preventDefault();
    if (formState.isEditing) {
      handleSave();
    }
  }
  
  // Escape to cancel
  if (event.key === 'Escape') {
    if (formState.isEditing) {
      handleCancel();
    }
  }
}

// Utility function to format dates
function formatDate(date) {
  if (!date) return '';
  const d = new Date(date);
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
}

// Export functions if needed
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    handleView,
    handleAdd,
    handleEdit,
    handleDelete,
    handleSave,
    handleCancel
  };
}
