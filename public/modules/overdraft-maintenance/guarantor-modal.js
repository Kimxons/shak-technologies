// Guarantor Modal - Main JavaScript

// DOM Elements - Buttons
const addBtn = document.getElementById('addBtn');
const editBtn = document.getElementById('editBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const backBtn = document.getElementById('backBtn');
const searchGuarantorBtn = document.getElementById('searchGuarantorBtn');

// Form Elements
const guarantorType = document.getElementById('guarantorType');
const guarantorId = document.getElementById('guarantorId');
const institutionClientId = document.getElementById('institutionClientId');
const guaranteeAmount = document.getElementById('guaranteeAmount');
const remarks = document.getElementById('remarks');

// Behind The Scene Elements
const signedBy = document.getElementById('signedBy');
const totalGuaranteeAmount = document.getElementById('totalGuaranteeAmount');
const maxGuaranteeAmount = document.getElementById('maxGuaranteeAmount');
const loansGuaranteed = document.getElementById('loansGuaranteed');
const maxLoans = document.getElementById('maxLoans');
const netWorth = document.getElementById('netWorth');
const liability = document.getElementById('liability');

// Audit Fields
const createdBy = document.getElementById('createdBy');
const modifiedBy = document.getElementById('modifiedBy');
const supervisedBy = document.getElementById('supervisedBy');
const createdOn = document.getElementById('createdOn');
const modifiedOn = document.getElementById('modifiedOn');
const supervisedOn = document.getElementById('supervisedOn');

// Table
const guarantorsTableBody = document.getElementById('guarantorsTableBody');
const statusMessage = document.getElementById('statusMessage');

// State
let isEditMode = false;
let guarantors = [];
let selectedGuarantorIndex = -1;

// Event Listeners
addBtn.addEventListener('click', addGuarantor);
editBtn.addEventListener('click', enableEdit);
saveBtn.addEventListener('click', saveGuarantor);
cancelBtn.addEventListener('click', cancelOperation);
backBtn.addEventListener('click', closeModal);
searchGuarantorBtn.addEventListener('click', searchGuarantor);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    disableEdit();
});

function addGuarantor() {
    isEditMode = true;
    selectedGuarantorIndex = -1;
    
    // Clear form
    guarantorType.value = '';
    guarantorId.value = '';
    institutionClientId.value = '';
    guaranteeAmount.value = '';
    remarks.value = '';
    
    // Enable form
    guarantorType.disabled = false;
    guarantorId.disabled = false;
    institutionClientId.disabled = false;
    guaranteeAmount.disabled = false;
    remarks.disabled = false;
    
    // Update button states
    addBtn.disabled = true;
    editBtn.disabled = true;
    saveBtn.disabled = false;
    
    hideStatusMessage();
    guarantorId.focus();
}

function enableEdit() {
    if (guarantors.length === 0) {
        showStatusMessage('No guarantor to edit. Click Add to create new guarantor.', 'warning');
        return;
    }

    if (selectedGuarantorIndex === -1) {
        showStatusMessage('Please select a guarantor from the table to edit.', 'warning');
        return;
    }

    isEditMode = true;
    
    guarantorType.disabled = false;
    institutionClientId.disabled = false;
    guaranteeAmount.disabled = false;
    remarks.disabled = false;
    
    addBtn.disabled = true;
    editBtn.disabled = true;
    saveBtn.disabled = false;
}

function disableEdit() {
    isEditMode = false;
    
    guarantorType.disabled = false;
    guarantorId.disabled = false;
    institutionClientId.disabled = false;
    guaranteeAmount.disabled = false;
    remarks.disabled = false;
    
    addBtn.disabled = false;
    editBtn.disabled = false;
    saveBtn.disabled = true;
}

function saveGuarantor() {
    // Validate
    if (!guarantorId.value.trim()) {
        showStatusMessage('Please Enter Valid Guarantor ID [No:403005]', 'error');
        guarantorId.focus();
        return;
    }

    if (!guarantorType.value) {
        showStatusMessage('Please select Guarantor Type', 'error');
        guarantorType.focus();
        return;
    }

    if (!guaranteeAmount.value) {
        showStatusMessage('Please enter Guarantee Amount', 'error');
        guaranteeAmount.focus();
        return;
    }

    const guarantorData = {
        type: guarantorType.value,
        id: guarantorId.value,
        institutionClientId: institutionClientId.value,
        amount: parseFloat(guaranteeAmount.value),
        remarks: remarks.value,
        name: `Guarantor ${guarantorId.value}` // In real app, this would come from backend
    };

    if (selectedGuarantorIndex === -1) {
        // Add new
        guarantors.push(guarantorData);
        showStatusMessage('Guarantor added successfully', 'success');
    } else {
        // Update existing
        guarantors[selectedGuarantorIndex] = guarantorData;
        showStatusMessage('Guarantor updated successfully', 'success');
    }

    // Update audit fields (simulated)
    if (selectedGuarantorIndex === -1) {
        createdBy.value = 'Admin';
        createdOn.value = new Date().toLocaleString();
    }
    modifiedBy.value = 'Admin';
    modifiedOn.value = new Date().toLocaleString();

    refreshTable();
    updateBehindTheScene();
    disableEdit();
}

function cancelOperation() {
    if (isEditMode) {
        if (confirm('Discard changes?')) {
            disableEdit();
            hideStatusMessage();
        }
    } else {
        if (confirm('Clear form?')) {
            clearForm();
        }
    }
}

function closeModal() {
    // Notify parent window to close modal
    if (window.parent && window.parent.closeGuarantorModal) {
        window.parent.closeGuarantorModal();
    }
}

function searchGuarantor() {
    if (!guarantorId.value.trim()) {
        showStatusMessage('Please enter Guarantor ID', 'warning');
        return;
    }
    
    // Guarantor search functionality - to be implemented with real data
    showStatusMessage('Guarantor search feature - connect to backend', 'warning');
}

function refreshTable() {
    guarantorsTableBody.innerHTML = '';
    
    if (guarantors.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.className = 'empty-row';
        emptyRow.innerHTML = '<td colspan="3">No records to display.</td>';
        guarantorsTableBody.appendChild(emptyRow);
    } else {
        guarantors.forEach((guarantor, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${guarantor.id}</td>
                <td>${guarantor.name}</td>
                <td>${formatCurrency(guarantor.amount)}</td>
            `;
            row.addEventListener('click', () => selectGuarantor(index));
            guarantorsTableBody.appendChild(row);
        });
    }
}

function selectGuarantor(index) {
    selectedGuarantorIndex = index;
    const guarantor = guarantors[index];
    
    guarantorType.value = guarantor.type;
    guarantorId.value = guarantor.id;
    institutionClientId.value = guarantor.institutionClientId;
    guaranteeAmount.value = guarantor.amount;
    remarks.value = guarantor.remarks;
    
    // Highlight selected row
    const rows = guarantorsTableBody.querySelectorAll('tr');
    rows.forEach((row, i) => {
        row.style.backgroundColor = i === index ? '#E3F2FD' : '';
    });
}

function updateBehindTheScene() {
    // Calculate totals
    const total = guarantors.reduce((sum, g) => sum + g.amount, 0);
    totalGuaranteeAmount.value = total;
    
    // Other fields would be populated from backend in real app
    loansGuaranteed.value = guarantors.length;
}

function clearForm() {
    guarantorType.value = '';
    guarantorId.value = '';
    institutionClientId.value = '';
    guaranteeAmount.value = '';
    remarks.value = '';
    
    signedBy.value = '';
    totalGuaranteeAmount.value = '';
    maxGuaranteeAmount.value = '';
    loansGuaranteed.value = '';
    maxLoans.value = '';
    netWorth.value = '';
    liability.value = '';
    
    createdBy.value = '';
    modifiedBy.value = '';
    supervisedBy.value = '';
    createdOn.value = '';
    modifiedOn.value = '';
    supervisedOn.value = '';
    
    selectedGuarantorIndex = -1;
    hideStatusMessage();
}

function showStatusMessage(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
}

function hideStatusMessage() {
    statusMessage.className = 'status-message hidden';
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}
