// Workflow Type - Main JavaScript

// DOM Elements - Buttons
const viewBtn = document.getElementById('viewBtn');
const addBtn = document.getElementById('addBtn');
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Form Elements
const workflowTypeId = document.getElementById('workflowTypeId');
const description = document.getElementById('description');
const validFrom = document.getElementById('validFrom');
const validTo = document.getElementById('validTo');
const module = document.getElementById('module');
const noOfGuarantors = document.getElementById('noOfGuarantors');
const enforceMakerChecker = document.getElementById('enforceMakerChecker');

// Search Button
const searchWorkflowBtn = document.getElementById('searchWorkflowBtn');

// Behind The Scene Elements
const createdBy = document.getElementById('createdBy');
const modifiedBy = document.getElementById('modifiedBy');
const supervisedBy = document.getElementById('supervisedBy');
const createdOn = document.getElementById('createdOn');
const modifiedOn = document.getElementById('modifiedOn');
const supervisedOn = document.getElementById('supervisedOn');

// Sidebar Menu Items
const menuItems = document.querySelectorAll('.menu-item');

// State
let isEditMode = false;
let currentWorkflow = null;
let activeWorkflowType = 'dataentry';

// Event Listeners
viewBtn.addEventListener('click', viewWorkflow);
addBtn.addEventListener('click', addNewWorkflow);
editBtn.addEventListener('click', enableEdit);
deleteBtn.addEventListener('click', deleteWorkflow);
saveBtn.addEventListener('click', saveWorkflow);
cancelBtn.addEventListener('click', cancelOperation);
searchWorkflowBtn.addEventListener('click', searchWorkflow);

// Sidebar Menu Navigation
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        // Remove active class from all items
        menuItems.forEach(i => i.classList.remove('active'));
        // Add active class to clicked item
        item.classList.add('active');
        
        activeWorkflowType = item.dataset.workflowType;
        loadWorkflowType(activeWorkflowType);
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    disableEdit();
    loadWorkflowType('dataentry');
});

function loadWorkflowType(type) {
    // Clear form
    workflowTypeId.value = '';
    description.value = '';
    validFrom.value = '';
    validTo.value = '';
    module.value = '';
    noOfGuarantors.value = '';
    enforceMakerChecker.checked = false;
    clearAuditFields();
    
    currentWorkflow = null;
    
    // Load data based on workflow type
    // In a real application, this would fetch data from backend
    console.log('Loading workflow type:', type);
}

function viewWorkflow() {
    if (!workflowTypeId.value.trim()) {
        showMessage('Please enter Workflow Type ID to view', 'warning');
        return;
    }

    // In a real application, this would fetch workflow from backend
    showMessage('Loading workflow...', 'info');
}

function addNewWorkflow() {
    isEditMode = true;
    currentWorkflow = null;
    
    // Clear form
    workflowTypeId.value = '';
    description.value = '';
    validFrom.value = '';
    validTo.value = '';
    module.value = '';
    noOfGuarantors.value = '';
    enforceMakerChecker.checked = false;
    
    // Clear audit fields
    clearAuditFields();
    
    // Enable editing
    workflowTypeId.disabled = false;
    description.disabled = false;
    validFrom.disabled = false;
    validTo.disabled = false;
    module.disabled = false;
    noOfGuarantors.disabled = false;
    enforceMakerChecker.disabled = false;
    
    // Update button states
    addBtn.disabled = true;
    editBtn.disabled = true;
    deleteBtn.disabled = true;
    viewBtn.disabled = true;
    saveBtn.disabled = false;
    
    workflowTypeId.focus();
    showMessage('Enter new workflow type details', 'info');
}

function enableEdit() {
    if (!currentWorkflow && !workflowTypeId.value.trim()) {
        showMessage('No workflow to edit. Click Add to create new workflow.', 'warning');
        return;
    }

    isEditMode = true;
    
    workflowTypeId.disabled = false;
    description.disabled = false;
    validFrom.disabled = false;
    validTo.disabled = false;
    module.disabled = false;
    noOfGuarantors.disabled = false;
    enforceMakerChecker.disabled = false;
    
    addBtn.disabled = true;
    editBtn.disabled = true;
    deleteBtn.disabled = true;
    viewBtn.disabled = true;
    saveBtn.disabled = false;
    
    showMessage('Edit mode enabled', 'info');
}

function disableEdit() {
    isEditMode = false;
    
    workflowTypeId.disabled = false;
    description.disabled = false;
    validFrom.disabled = false;
    validTo.disabled = false;
    module.disabled = false;
    noOfGuarantors.disabled = false;
    enforceMakerChecker.disabled = false;
    
    addBtn.disabled = false;
    editBtn.disabled = false;
    deleteBtn.disabled = false;
    viewBtn.disabled = false;
    saveBtn.disabled = true;
}

function deleteWorkflow() {
    if (!currentWorkflow && !workflowTypeId.value.trim()) {
        showMessage('No workflow to delete', 'warning');
        return;
    }

    if (confirm('Are you sure you want to delete this workflow type?')) {
        // In a real application, this would send delete request to backend
        
        // Clear form
        workflowTypeId.value = '';
        description.value = '';
        validFrom.value = '';
        validTo.value = '';
        module.value = '';
        noOfGuarantors.value = '';
        enforceMakerChecker.checked = false;
        clearAuditFields();
        currentWorkflow = null;
        
        showMessage('Workflow type deleted successfully', 'success');
    }
}

function saveWorkflow() {
    // Validate
    if (!workflowTypeId.value.trim()) {
        showMessage('Please enter Workflow Type ID', 'warning');
        workflowTypeId.focus();
        return;
    }

    if (!description.value.trim()) {
        showMessage('Please enter Description', 'warning');
        description.focus();
        return;
    }

    if (!module.value) {
        showMessage('Please select Module', 'warning');
        module.focus();
        return;
    }

    if (confirm('Save this workflow type?')) {
        // In a real application, this would save to backend
        const workflowData = {
            workflowTypeId: workflowTypeId.value,
            description: description.value,
            validFrom: validFrom.value,
            validTo: validTo.value,
            module: module.value,
            noOfGuarantors: noOfGuarantors.value,
            enforceMakerChecker: enforceMakerChecker.checked,
            workflowType: activeWorkflowType
        };

        console.log('Saving workflow:', workflowData);
        
        // Update audit fields (simulated)
        if (!currentWorkflow) {
            createdBy.value = 'Admin';
            createdOn.value = new Date().toLocaleString();
        }
        modifiedBy.value = 'Admin';
        modifiedOn.value = new Date().toLocaleString();
        
        currentWorkflow = workflowData;
        disableEdit();
        showMessage('Workflow type saved successfully', 'success');
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
        workflowTypeId.value = '';
        description.value = '';
        validFrom.value = '';
        validTo.value = '';
        module.value = '';
        noOfGuarantors.value = '';
        enforceMakerChecker.checked = false;
        clearAuditFields();
        currentWorkflow = null;
        showMessage('Form reset', 'info');
    }
}

function searchWorkflow() {
    if (!workflowTypeId.value.trim()) {
        showMessage('Please enter Workflow Type ID', 'warning');
        return;
    }
    
    // Workflow search functionality - to be implemented with real data
    showMessage('Workflow search feature - connect to backend', 'info');
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
