// Interest Rates Modal - Main JavaScript

// DOM Elements - Buttons
const viewBtn = document.getElementById('viewBtn');
const addBtn = document.getElementById('addBtn');
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const backBtn = document.getElementById('backBtn');
const searchEffectiveDateBtn = document.getElementById('searchEffectiveDateBtn');

// Form Elements
const rateType = document.getElementById('rateType');
const effectiveDate = document.getElementById('effectiveDate');
const expiryDate = document.getElementById('expiryDate');
const baseRate = document.getElementById('baseRate');
const refId = document.getElementById('refId');

// Amount Slab Elements
const amount1From = document.getElementById('amount1From');
const amount1To = document.getElementById('amount1To');
const amount1MarkUp = document.getElementById('amount1MarkUp');
const amount1Rate = document.getElementById('amount1Rate');

const amount2From = document.getElementById('amount2From');
const amount2To = document.getElementById('amount2To');
const amount2MarkUp = document.getElementById('amount2MarkUp');
const amount2Rate = document.getElementById('amount2Rate');

const amount3From = document.getElementById('amount3From');
const amount3To = document.getElementById('amount3To');
const amount3MarkUp = document.getElementById('amount3MarkUp');
const amount3Rate = document.getElementById('amount3Rate');

const amount4From = document.getElementById('amount4From');
const amount4To = document.getElementById('amount4To');
const amount4MarkUp = document.getElementById('amount4MarkUp');
const amount4Rate = document.getElementById('amount4Rate');

const amount5From = document.getElementById('amount5From');
const amount5To = document.getElementById('amount5To');
const amount5MarkUp = document.getElementById('amount5MarkUp');
const amount5Rate = document.getElementById('amount5Rate');

const penaltyMarkUp = document.getElementById('penaltyMarkUp');
const penaltyRate = document.getElementById('penaltyRate');

// Audit Fields
const createdBy = document.getElementById('createdBy');
const modifiedBy = document.getElementById('modifiedBy');
const supervisedBy = document.getElementById('supervisedBy');
const createdOn = document.getElementById('createdOn');
const modifiedOn = document.getElementById('modifiedOn');
const supervisedOn = document.getElementById('supervisedOn');

// Table
const historyTableBody = document.getElementById('historyTableBody');
const statusMessage = document.getElementById('statusMessage');

// State
let isEditMode = false;
let interestRates = [];
let selectedRateIndex = -1;

// Event Listeners
viewBtn.addEventListener('click', viewRate);
addBtn.addEventListener('click', addRate);
editBtn.addEventListener('click', enableEdit);
deleteBtn.addEventListener('click', deleteRate);
saveBtn.addEventListener('click', saveRate);
cancelBtn.addEventListener('click', cancelOperation);
backBtn.addEventListener('click', closeModal);
searchEffectiveDateBtn.addEventListener('click', searchEffectiveDate);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    disableEdit();
});

function viewRate() {
    if (interestRates.length === 0) {
        showStatusMessage('No interest rates to view', 'info');
        return;
    }

    if (selectedRateIndex === -1) {
        showStatusMessage('Please select a rate from the history table', 'warning');
        return;
    }

    loadRateData(interestRates[selectedRateIndex]);
    disableEdit();
}

function addRate() {
    isEditMode = true;
    selectedRateIndex = -1;
    
    // Clear form
    clearForm();
    
    // Enable form
    enableFormFields();
    
    // Set default value for first amount from
    amount1From.value = '0.00';
    
    // Update button states
    addBtn.disabled = true;
    editBtn.disabled = true;
    deleteBtn.disabled = true;
    viewBtn.disabled = true;
    saveBtn.disabled = false;
    
    hideStatusMessage();
    rateType.focus();
}

function enableEdit() {
    if (interestRates.length === 0) {
        showStatusMessage('No rate to edit. Click Add to create new rate.', 'warning');
        return;
    }

    if (selectedRateIndex === -1) {
        showStatusMessage('Please select a rate from the history table to edit.', 'warning');
        return;
    }

    isEditMode = true;
    enableFormFields();
    
    addBtn.disabled = true;
    editBtn.disabled = true;
    deleteBtn.disabled = true;
    viewBtn.disabled = true;
    saveBtn.disabled = false;
}

function deleteRate() {
    if (interestRates.length === 0) {
        showStatusMessage('No rate to delete', 'warning');
        return;
    }

    if (selectedRateIndex === -1) {
        showStatusMessage('Please select a rate from the history table to delete', 'warning');
        return;
    }

    if (confirm('Are you sure you want to delete this interest rate?')) {
        interestRates.splice(selectedRateIndex, 1);
        selectedRateIndex = -1;
        refreshHistoryTable();
        clearForm();
        showStatusMessage('Interest rate deleted successfully', 'success');
    }
}

function disableEdit() {
    isEditMode = false;
    
    // Disable all inputs
    rateType.disabled = true;
    effectiveDate.disabled = true;
    expiryDate.disabled = true;
    baseRate.disabled = true;
    refId.disabled = true;
    
    amount1From.disabled = true;
    amount1To.disabled = true;
    amount1MarkUp.disabled = true;
    amount1Rate.disabled = true;
    amount2From.disabled = true;
    amount2To.disabled = true;
    amount2MarkUp.disabled = true;
    amount2Rate.disabled = true;
    amount3From.disabled = true;
    amount3To.disabled = true;
    amount3MarkUp.disabled = true;
    amount3Rate.disabled = true;
    amount4From.disabled = true;
    amount4To.disabled = true;
    amount4MarkUp.disabled = true;
    amount4Rate.disabled = true;
    amount5From.disabled = true;
    amount5To.disabled = true;
    amount5MarkUp.disabled = true;
    amount5Rate.disabled = true;
    penaltyMarkUp.disabled = true;
    penaltyRate.disabled = true;
    
    addBtn.disabled = false;
    editBtn.disabled = false;
    deleteBtn.disabled = false;
    viewBtn.disabled = false;
    saveBtn.disabled = true;
}

function enableFormFields() {
    rateType.disabled = false;
    effectiveDate.disabled = false;
    expiryDate.disabled = false;
    baseRate.disabled = false;
    refId.disabled = false;
    
    amount1From.disabled = false;
    amount1To.disabled = false;
    amount1MarkUp.disabled = false;
    amount1Rate.disabled = false;
    amount2From.disabled = false;
    amount2To.disabled = false;
    amount2MarkUp.disabled = false;
    amount2Rate.disabled = false;
    amount3From.disabled = false;
    amount3To.disabled = false;
    amount3MarkUp.disabled = false;
    amount3Rate.disabled = false;
    amount4From.disabled = false;
    amount4To.disabled = false;
    amount4MarkUp.disabled = false;
    amount4Rate.disabled = false;
    amount5From.disabled = false;
    amount5To.disabled = false;
    amount5MarkUp.disabled = false;
    amount5Rate.disabled = false;
    penaltyMarkUp.disabled = false;
    penaltyRate.disabled = false;
}

function saveRate() {
    // Validate
    if (!rateType.value) {
        showStatusMessage('Please select Rate Type', 'error');
        rateType.focus();
        return;
    }

    if (!effectiveDate.value) {
        showStatusMessage('Please select Effective Date', 'error');
        effectiveDate.focus();
        return;
    }

    const rateData = {
        rateType: rateType.value,
        effectiveDate: effectiveDate.value,
        expiryDate: expiryDate.value,
        baseRate: parseFloat(baseRate.value) || 0,
        refId: refId.value,
        slabs: [
            {
                from: parseFloat(amount1From.value) || 0,
                to: parseFloat(amount1To.value) || 0,
                markUp: amount1MarkUp.value,
                rate: parseFloat(amount1Rate.value) || 0
            },
            {
                from: parseFloat(amount2From.value) || 0,
                to: parseFloat(amount2To.value) || 0,
                markUp: amount2MarkUp.value,
                rate: parseFloat(amount2Rate.value) || 0
            },
            {
                from: parseFloat(amount3From.value) || 0,
                to: parseFloat(amount3To.value) || 0,
                markUp: amount3MarkUp.value,
                rate: parseFloat(amount3Rate.value) || 0
            },
            {
                from: parseFloat(amount4From.value) || 0,
                to: parseFloat(amount4To.value) || 0,
                markUp: amount4MarkUp.value,
                rate: parseFloat(amount4Rate.value) || 0
            },
            {
                from: parseFloat(amount5From.value) || 0,
                to: parseFloat(amount5To.value) || 0,
                markUp: amount5MarkUp.value,
                rate: parseFloat(amount5Rate.value) || 0
            }
        ],
        penalty: {
            markUp: penaltyMarkUp.value,
            rate: parseFloat(penaltyRate.value) || 0
        }
    };

    if (selectedRateIndex === -1) {
        // Add new
        interestRates.push(rateData);
        showStatusMessage('Interest rate added successfully', 'success');
    } else {
        // Update existing
        interestRates[selectedRateIndex] = rateData;
        showStatusMessage('Interest rate updated successfully', 'success');
    }

    // Update audit fields (simulated)
    if (selectedRateIndex === -1) {
        createdBy.value = 'Admin';
        createdOn.value = new Date().toLocaleString();
    }
    modifiedBy.value = 'Admin';
    modifiedOn.value = new Date().toLocaleString();

    refreshHistoryTable();
    disableEdit();
}

function cancelOperation() {
    if (isEditMode) {
        if (confirm('Discard changes?')) {
            disableEdit();
            hideStatusMessage();
            if (selectedRateIndex !== -1) {
                loadRateData(interestRates[selectedRateIndex]);
            } else {
                clearForm();
            }
        }
    }
}

function closeModal() {
    // Notify parent window to close modal
    if (window.parent && window.parent.closeInterestRatesModal) {
        window.parent.closeInterestRatesModal();
    }
}

function searchEffectiveDate() {
    showStatusMessage('Effective date search feature - connect to backend', 'info');
}

function loadRateData(rate) {
    rateType.value = rate.rateType;
    effectiveDate.value = rate.effectiveDate;
    expiryDate.value = rate.expiryDate;
    baseRate.value = rate.baseRate;
    refId.value = rate.refId;
    
    if (rate.slabs && rate.slabs.length >= 5) {
        amount1From.value = rate.slabs[0].from;
        amount1To.value = rate.slabs[0].to;
        amount1MarkUp.value = rate.slabs[0].markUp;
        amount1Rate.value = rate.slabs[0].rate;
        
        amount2From.value = rate.slabs[1].from;
        amount2To.value = rate.slabs[1].to;
        amount2MarkUp.value = rate.slabs[1].markUp;
        amount2Rate.value = rate.slabs[1].rate;
        
        amount3From.value = rate.slabs[2].from;
        amount3To.value = rate.slabs[2].to;
        amount3MarkUp.value = rate.slabs[2].markUp;
        amount3Rate.value = rate.slabs[2].rate;
        
        amount4From.value = rate.slabs[3].from;
        amount4To.value = rate.slabs[3].to;
        amount4MarkUp.value = rate.slabs[3].markUp;
        amount4Rate.value = rate.slabs[3].rate;
        
        amount5From.value = rate.slabs[4].from;
        amount5To.value = rate.slabs[4].to;
        amount5MarkUp.value = rate.slabs[4].markUp;
        amount5Rate.value = rate.slabs[4].rate;
    }
    
    if (rate.penalty) {
        penaltyMarkUp.value = rate.penalty.markUp;
        penaltyRate.value = rate.penalty.rate;
    }
}

function refreshHistoryTable() {
    historyTableBody.innerHTML = '';
    
    if (interestRates.length === 0) {
        const emptyRow = document.createElement('tr');
        emptyRow.className = 'empty-row';
        emptyRow.innerHTML = '<td colspan="6">There are no Items to be Displayed</td>';
        historyTableBody.appendChild(emptyRow);
    } else {
        interestRates.forEach((rate, index) => {
            const row = document.createElement('tr');
            const ceiling1 = rate.slabs && rate.slabs[0] ? rate.slabs[0].to : '';
            const effectiveRate1 = rate.slabs && rate.slabs[0] ? rate.slabs[0].rate : '';
            const ceiling2 = rate.slabs && rate.slabs[1] ? rate.slabs[1].to : '';
            const effectiveRate2 = rate.slabs && rate.slabs[1] ? rate.slabs[1].rate : '';
            
            row.innerHTML = `
                <td>${rate.refId || index + 1}</td>
                <td>${rate.effectiveDate}</td>
                <td>${formatCurrency(ceiling1)}</td>
                <td>${effectiveRate1}%</td>
                <td>${formatCurrency(ceiling2)}</td>
                <td>${effectiveRate2}%</td>
            `;
            row.addEventListener('click', () => selectRate(index));
            historyTableBody.appendChild(row);
        });
    }
}

function selectRate(index) {
    selectedRateIndex = index;
    loadRateData(interestRates[index]);
    
    // Highlight selected row
    const rows = historyTableBody.querySelectorAll('tr');
    rows.forEach((row, i) => {
        row.style.backgroundColor = i === index ? '#E3F2FD' : '';
    });
}

function clearForm() {
    rateType.value = '';
    effectiveDate.value = '';
    expiryDate.value = '';
    baseRate.value = '';
    refId.value = '';
    
    amount1From.value = '';
    amount1To.value = '';
    amount1MarkUp.value = '';
    amount1Rate.value = '';
    amount2From.value = '';
    amount2To.value = '';
    amount2MarkUp.value = '';
    amount2Rate.value = '';
    amount3From.value = '';
    amount3To.value = '';
    amount3MarkUp.value = '';
    amount3Rate.value = '';
    amount4From.value = '';
    amount4To.value = '';
    amount4MarkUp.value = '';
    amount4Rate.value = '';
    amount5From.value = '';
    amount5To.value = '';
    amount5MarkUp.value = '';
    amount5Rate.value = '';
    penaltyMarkUp.value = '';
    penaltyRate.value = '';
    
    createdBy.value = '';
    modifiedBy.value = '';
    supervisedBy.value = '';
    createdOn.value = '';
    modifiedOn.value = '';
    supervisedOn.value = '';
    
    selectedRateIndex = -1;
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
    if (!amount) return '';
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount);
}
