// Sample system exception overriding data
const branchData = [
    { id: 'BR001', name: 'Main Branch' },
    { id: 'BR002', name: 'Downtown Branch' },
    { id: 'BR003', name: 'Uptown Branch' }
];

const exceptionData = [
    {
        id: 'EX001',
        branchId: 'BR001',
        branchName: 'Main Branch',
        processDate: '2024-01-15',
        refId: 'REF001',
        exception: 'Daily Balance Variance',
        actionType: 'Override'
    },
    {
        id: 'EX002',
        branchId: 'BR002',
        branchName: 'Downtown Branch',
        processDate: '2024-01-16',
        refId: 'REF002',
        exception: 'Reconciliation Mismatch',
        actionType: 'Waive'
    }
];

let currentException = null;
let isEditMode = false;

function initializeSystemException() {
    setupEventListeners();
}

function setupEventListeners() {
    const branchIdInput = document.getElementById('branchId');
    const dateInput = document.getElementById('processDate');
    
    branchIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleBranchSearch();
    });
    
    dateInput.addEventListener('change', () => {
        validateDate();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.altKey) {
            switch(e.key.toUpperCase()) {
                case 'V': handleView(); break;
                case 'E': handleEdit(); break;
                case 'D': handleDelete(); break;
                case 'S': handleSave(); break;
                case 'C': handleCancel(); break;
            }
        }
    });
}

function handleBranchSearch() {
    const branchId = document.getElementById('branchId').value.trim();
    
    if (!branchId) {
        showStatus('Please enter a Branch ID to search', 'error');
        return;
    }
    
    const branch = branchData.find(b => b.id === branchId);
    
    if (!branch) {
        showStatus(`Branch ID '${branchId}' not found`, 'error');
        document.getElementById('branchName').value = '';
        return;
    }
    
    document.getElementById('branchName').value = branch.name;
    showStatus(`Branch '${branch.name}' selected`, 'info');
}

function openDatePicker() {
    const dateInput = document.getElementById('processDate');
    dateInput.click();
}

function validateDate() {
    const dateInput = document.getElementById('processDate');
    const selectedDate = new Date(dateInput.value);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate > today) {
        showStatus('Process Date cannot be in the future', 'error');
        dateInput.value = '';
        return false;
    }
    
    return true;
}

function populateForm(exception) {
    document.getElementById('branchId').value = exception.branchId;
    document.getElementById('branchName').value = exception.branchName;
    document.getElementById('processDate').value = exception.processDate;
    document.getElementById('refId').value = exception.refId;
    document.getElementById('exception').value = exception.exception;
    document.getElementById('actionType').value = exception.actionType;
}

function clearForm() {
    document.getElementById('branchId').value = '';
    document.getElementById('branchName').value = '';
    document.getElementById('processDate').value = '';
    document.getElementById('refId').value = '';
    document.getElementById('exception').value = '';
    document.getElementById('actionType').value = '';
    currentException = null;
    setEditMode(false);
}

function handleView() {
    const branchId = document.getElementById('branchId').value.trim();
    
    if (!branchId) {
        showStatus('Please select a branch first', 'error');
        return;
    }
    
    // Search for exception in data (simplified - in real app would use more criteria)
    const exception = exceptionData.find(e => e.branchId === branchId);
    
    if (!exception) {
        showStatus(`No exceptions found for branch '${branchId}'`, 'error');
        return;
    }
    
    currentException = JSON.parse(JSON.stringify(exception));
    populateForm(exception);
    setEditMode(false);
    showStatus(`Exception record loaded successfully`, 'info');
}

function handleEdit() {
    if (!currentException) {
        showStatus('Please load an exception record first', 'error');
        return;
    }
    
    setEditMode(true);
    showStatus('You are now editing this exception', 'warning');
}

function handleDelete() {
    if (!currentException) {
        showStatus('Please load an exception record first', 'error');
        return;
    }
    
    if (confirm(`Delete this exception record?`)) {
        const index = exceptionData.indexOf(currentException);
        if (index > -1) {
            exceptionData.splice(index, 1);
        }
        clearForm();
        showStatus('Exception record deleted successfully', 'success');
    }
}

function handleSave() {
    if (!validateForm()) {
        return;
    }
    
    if (!currentException) {
        // Create new exception
        const newException = {
            id: 'EX' + (exceptionData.length + 1).toString().padStart(3, '0'),
            branchId: document.getElementById('branchId').value,
            branchName: document.getElementById('branchName').value,
            processDate: document.getElementById('processDate').value,
            refId: document.getElementById('refId').value,
            exception: document.getElementById('exception').value,
            actionType: document.getElementById('actionType').value
        };
        exceptionData.push(newException);
        currentException = newException;
    } else {
        // Update existing exception
        currentException.branchId = document.getElementById('branchId').value;
        currentException.branchName = document.getElementById('branchName').value;
        currentException.processDate = document.getElementById('processDate').value;
        currentException.refId = document.getElementById('refId').value;
        currentException.exception = document.getElementById('exception').value;
        currentException.actionType = document.getElementById('actionType').value;
    }
    
    setEditMode(false);
    showStatus('Exception record saved successfully', 'success');
}

function handleCancel() {
    if (isEditMode) {
        populateForm(currentException);
        setEditMode(false);
        showStatus('Changes cancelled', 'warning');
    } else {
        clearForm();
        showStatus('Cancelled', 'info');
    }
}

function validateForm() {
    const branchId = document.getElementById('branchId').value.trim();
    const processDate = document.getElementById('processDate').value.trim();
    const exception = document.getElementById('exception').value.trim();
    const actionType = document.getElementById('actionType').value;
    
    if (!branchId) {
        showStatus('Branch ID is required', 'error');
        return false;
    }
    
    if (!processDate) {
        showStatus('Process Date is required', 'error');
        return false;
    }
    
    if (!exception) {
        showStatus('Exception description is required', 'error');
        return false;
    }
    
    if (!actionType) {
        showStatus('Type Of Action is required', 'error');
        return false;
    }
    
    return true;
}

function setEditMode(enabled) {
    isEditMode = enabled;
    const editBtn = document.querySelector('.action-button.edit');
    const deleteBtn = document.querySelector('.action-button.delete');
    const saveBtn = document.querySelector('.action-button.save');
    
    const inputs = document.querySelectorAll('.field-control input, .field-control select');
    inputs.forEach(input => {
        if (input.id === 'branchName') {
            input.disabled = true; // Always readonly
        } else {
            input.disabled = !enabled;
        }
    });
    
    if (enabled) {
        editBtn.disabled = true;
        deleteBtn.disabled = true;
        saveBtn.disabled = false;
    } else {
        editBtn.disabled = !currentException;
        deleteBtn.disabled = !currentException;
        saveBtn.disabled = true;
    }
}

function showStatus(message, type = 'info') {
    const statusMsg = document.getElementById('statusMsg');
    statusMsg.textContent = message;
    statusMsg.className = `status-message show status-${type}`;
    
    setTimeout(() => {
        statusMsg.classList.remove('show');
    }, 4000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeSystemException);

// Add input-group-icon styling
const style = document.createElement('style');
style.textContent = `
    .input-group-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin-left: -35px;
        color: var(--text-gray);
        cursor: pointer;
        transition: color 0.3s;
    }
    
    .input-group-icon:hover {
        color: var(--primary);
    }
    
    .field-control {
        display: flex;
        align-items: center;
        position: relative;
    }
    
    .field-control input {
        width: 100%;
    }
`;
document.head.appendChild(style);
