// Foreign-Local GL Mapping - Main JavaScript

// DOM Elements - Buttons
const viewBtn = document.getElementById('viewBtn');
const addBtn = document.getElementById('addBtn');
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Form Elements
const branchId = document.getElementById('branchId');
const branchName = document.getElementById('branchName');
const foreignAccountId = document.getElementById('foreignAccountId');
const localAccountId = document.getElementById('localAccountId');

// Search Buttons
const searchBranchBtn = document.getElementById('searchBranchBtn');
const searchForeignBtn = document.getElementById('searchForeignBtn');
const searchLocalBtn = document.getElementById('searchLocalBtn');

// Behind The Scene Elements
const createdBy = document.getElementById('createdBy');
const modifiedBy = document.getElementById('modifiedBy');
const supervisedBy = document.getElementById('supervisedBy');
const createdOn = document.getElementById('createdOn');
const modifiedOn = document.getElementById('modifiedOn');
const supervisedOn = document.getElementById('supervisedOn');

// State
let isEditMode = false;
let currentMapping = null;

// Event Listeners
viewBtn.addEventListener('click', viewMapping);
addBtn.addEventListener('click', addNewMapping);
editBtn.addEventListener('click', enableEdit);
deleteBtn.addEventListener('click', deleteMapping);
saveBtn.addEventListener('click', saveMapping);
cancelBtn.addEventListener('click', cancelOperation);

searchBranchBtn.addEventListener('click', searchBranch);
searchForeignBtn.addEventListener('click', searchForeignAccount);
searchLocalBtn.addEventListener('click', searchLocalAccount);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    disableEdit();
});

function viewMapping() {
    if (!foreignAccountId.value.trim() && !localAccountId.value.trim()) {
        showMessage('Please enter Foreign or Local Account ID to view mapping', 'warning');
        return;
    }

    // In a real application, this would fetch mapping from backend
    showMessage('Loading mapping...', 'info');
}

function addNewMapping() {
    isEditMode = true;
    currentMapping = null;
    
    // Clear form
    foreignAccountId.value = '';
    localAccountId.value = '';
    
    // Clear audit fields
    clearAuditFields();
    
    // Enable editing
    foreignAccountId.disabled = false;
    localAccountId.disabled = false;
    
    // Update button states
    addBtn.disabled = true;
    editBtn.disabled = true;
    deleteBtn.disabled = true;
    viewBtn.disabled = true;
    saveBtn.disabled = false;
    
    foreignAccountId.focus();
    showMessage('Enter new mapping details', 'info');
}

function enableEdit() {
    if (!currentMapping && !foreignAccountId.value.trim()) {
        showMessage('No mapping to edit. Click Add to create new mapping.', 'warning');
        return;
    }

    isEditMode = true;
    
    foreignAccountId.disabled = false;
    localAccountId.disabled = false;
    
    addBtn.disabled = true;
    editBtn.disabled = true;
    deleteBtn.disabled = true;
    viewBtn.disabled = true;
    saveBtn.disabled = false;
    
    showMessage('Edit mode enabled', 'info');
}

function disableEdit() {
    isEditMode = false;
    
    foreignAccountId.disabled = false;
    localAccountId.disabled = false;
    
    addBtn.disabled = false;
    editBtn.disabled = false;
    deleteBtn.disabled = false;
    viewBtn.disabled = false;
    saveBtn.disabled = true;
}

function deleteMapping() {
    if (!currentMapping && !foreignAccountId.value.trim()) {
        showMessage('No mapping to delete', 'warning');
        return;
    }

    if (confirm('Are you sure you want to delete this GL mapping?')) {
        // In a real application, this would send delete request to backend
        
        // Clear form
        foreignAccountId.value = '';
        localAccountId.value = '';
        clearAuditFields();
        currentMapping = null;
        
        showMessage('Mapping deleted successfully', 'success');
    }
}

function saveMapping() {
    // Validate
    if (!foreignAccountId.value.trim()) {
        showMessage('Please enter Foreign Account ID', 'warning');
        foreignAccountId.focus();
        return;
    }

    if (!localAccountId.value.trim()) {
        showMessage('Please enter Local Account ID', 'warning');
        localAccountId.focus();
        return;
    }

    if (confirm('Save this GL mapping?')) {
        // In a real application, this would save to backend
        const mappingData = {
            branchId: branchId.value,
            foreignAccountId: foreignAccountId.value,
            localAccountId: localAccountId.value
        };

        console.log('Saving mapping:', mappingData);
        
        // Update audit fields (simulated)
        if (!currentMapping) {
            createdBy.value = 'Admin';
            createdOn.value = new Date().toLocaleString();
        }
        modifiedBy.value = 'Admin';
        modifiedOn.value = new Date().toLocaleString();
        
        currentMapping = mappingData;
        disableEdit();
        showMessage('Mapping saved successfully', 'success');
    }
}

function cancelOperation() {
    if (isEditMode) {
        if (confirm('Discard changes?')) {
            disableEdit();
            showMessage('Operation cancelled', 'info');
        }
    } else {
        // Reset form
        branchId.value = '0101';
        branchName.value = 'Head Office';
        foreignAccountId.value = '';
        localAccountId.value = '';
        clearAuditFields();
        currentMapping = null;
        showMessage('Form reset', 'info');
    }
}

function searchBranch() {
    // Branch search functionality - to be implemented with real data
    showMessage('Branch search feature - connect to backend', 'info');
}

function searchForeignAccount() {
    if (!foreignAccountId.value.trim()) {
        showMessage('Please enter Foreign Account ID', 'warning');
        return;
    }
    
    // Foreign account search functionality - to be implemented with real data
    showMessage('Foreign account search feature - connect to backend', 'info');
}

function searchLocalAccount() {
    if (!localAccountId.value.trim()) {
        showMessage('Please enter Local Account ID', 'warning');
        return;
    }
    
    // Local account search functionality - to be implemented with real data
    showMessage('Local account search feature - connect to backend', 'info');
}

function clearAuditFields() {
    createdBy.value = '';
    modifiedBy.value = '';
    supervisedBy.value = '';
    createdOn.value = '';
    modifiedOn.value = '';
    supervisedOn.value = '';
}

function showMessage(message, type) {
    // Simple alert for now - can be replaced with toast notifications
    const icon = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    alert(`${icon[type] || ''} ${message}`);
}
