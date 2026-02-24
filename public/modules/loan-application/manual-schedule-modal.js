// Manual Schedule Modal JavaScript

// State
let scheduleData = [];
let selectedRowIndex = null;
let loanApplicationData = null;

// Listen for messages from parent window
window.addEventListener('message', function(event) {
    console.log('Manual Schedule received message:', event.data);
    
    if (event.data.action === 'populateFromParent' && event.data.data) {
        loanApplicationData = event.data.data;
        console.log('Received loan application data:', loanApplicationData);
        populateFromParent(loanApplicationData);
    }
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    console.log('Manual Schedule modal DOM loaded');
    
    // Load service first
    try {
        if (window.ServiceLoader) {
            await ServiceLoader.loadManualScheduleService();
            console.log('Manual Schedule service loaded');
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }

    // Try to get data from parent window with polling (wait for parent to be ready)
    function tryGetParentData(attempts = 0) {
        if (loanApplicationData) return; // Already have data
        
        const maxAttempts = 20; // Try for up to 2 seconds (20 * 100ms)
        let parentWindow = window.parent;
        
        // First try direct parent (loan-application.html)
        if (parentWindow && parentWindow.getLoanApplicationData) {
            loanApplicationData = parentWindow.getLoanApplicationData();
            console.log('Got loan application data from parent:', loanApplicationData);
            if (loanApplicationData) {
                populateFromParent(loanApplicationData);
            }
            return;
        }
        
        // If not found on direct parent, try one level up (for nested iframes)
        if (parentWindow && parentWindow.parent && parentWindow.parent !== parentWindow && parentWindow.parent.getLoanApplicationData) {
            loanApplicationData = parentWindow.parent.getLoanApplicationData();
            console.log('Got loan application data from grandparent:', loanApplicationData);
            if (loanApplicationData) {
                populateFromParent(loanApplicationData);
            }
            return;
        }
        
        // Retry if we haven't exceeded max attempts
        if (attempts < maxAttempts) {
            setTimeout(() => tryGetParentData(attempts + 1), 100);
        } else {
            console.warn('Could not access parent getLoanApplicationData function after multiple attempts');
        }
    }
    
    // Start polling for parent data
    tryGetParentData();

    initializeManualScheduleModal();
});

// Populate fields from parent window data
function populateFromParent(data) {
    console.log('populateFromParent called with:', data);
    
    const branchId = document.getElementById('branchId');
    const branchName = document.getElementById('branchName');
    const applicationId = document.getElementById('applicationId');

    console.log('Elements found:', { branchId, branchName, applicationId });

    if (branchId) {
        branchId.value = data.branchId || '';
        console.log('Set branchId to:', branchId.value);
    } else {
        console.error('branchId element not found');
    }
    
    if (branchName) {
        branchName.value = data.branchName || '';
        console.log('Set branchName to:', branchName.value);
    } else {
        console.error('branchName element not found');
    }
    
    if (applicationId) {
        applicationId.value = data.applicationId || '';
        console.log('Set applicationId to:', applicationId.value);
    } else {
        console.error('applicationId element not found');
    }

    console.log('Manual Schedule - Population complete');
}

// Fetch manual schedule data from backend
async function fetchManualScheduleData() {
    if (!loanApplicationData || !loanApplicationData.applicationId) {
        showMessage('No application data available', 'warning');
        return;
    }

    try {
        console.log('Fetching manual schedule data for:', loanApplicationData);

        const requestData = {
            OurBranchID: loanApplicationData.branchId || '',
            ApplicationID: loanApplicationData.applicationId || ''
        };

        console.log('Request data:', requestData);
        const response = await ManualScheduleService.getManualLoanInstallmentTemp(requestData);
        console.log('Manual schedule response:', response);

        if (response && response.Details && response.Details.length > 0) {
            scheduleData = response.Details;
            renderScheduleTable();
            showMessage('Manual schedule data loaded successfully', 'success');
        } else if (response && response.Details01 && response.Details01.length > 0) {
            scheduleData = response.Details01;
            renderScheduleTable();
            showMessage('Manual schedule data loaded successfully', 'success');
        } else {
            console.log('No schedule records found');
            showMessage('No manual schedule records found', 'info');
            scheduleData = [];
            renderScheduleTable();
        }
    } catch (error) {
        console.error('Error fetching manual schedule data:', error);
        showMessage('Error loading manual schedule data: ' + (error.message || 'Unknown error'), 'error');
    }
}

// Initialize modal handlers
function initializeManualScheduleModal() {
    // Top bar button handlers
    const btnClose = document.getElementById('btnClose');
    const btnResize = document.getElementById('btnResize');

    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }

    if (btnResize) {
        btnResize.addEventListener('click', toggleWidth);
    }

    // Action button handlers
    const newBtn = document.getElementById('newBtn');
    const removeBtn = document.getElementById('removeBtn');
    const updateBtn = document.getElementById('updateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const viewBtn = document.getElementById('viewBtn');
    const addBtn = document.getElementById('addBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const backBtn = document.getElementById('backBtn');

    if (newBtn) newBtn.addEventListener('click', handleNew);
    if (removeBtn) removeBtn.addEventListener('click', handleRemove);
    if (updateBtn) updateBtn.addEventListener('click', handleUpdate);
    if (clearBtn) clearBtn.addEventListener('click', handleClear);
    if (viewBtn) viewBtn.addEventListener('click', handleView);
    if (addBtn) addBtn.addEventListener('click', handleAdd);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (backBtn) backBtn.addEventListener('click', handleBack);

    // Initialize form state
    disableEdit();
}

// Handle new installment
function handleNew() {
    console.log('New installment');
    clearInstallmentFields();
    enableEdit();
    showMessage('Enter installment details', 'info');
}

// Handle remove installment
function handleRemove() {
    if (selectedRowIndex === null) {
        showMessage('Please select an installment to remove', 'warning');
        return;
    }

    if (confirm('Are you sure you want to remove this installment?')) {
        scheduleData.splice(selectedRowIndex, 1);
        selectedRowIndex = null;
        renderScheduleTable();
        clearInstallmentFields();
        showMessage('Installment removed successfully', 'success');
    }
}

// Handle update installment
function handleUpdate() {
    if (selectedRowIndex === null) {
        showMessage('Please select an installment to update', 'warning');
        return;
    }

    if (!validateInstallmentFields()) {
        return;
    }

    const installmentDueDate = document.getElementById('installmentDueDate').value;
    const expectedInterest = parseFloat(document.getElementById('expectedInterest').value) || 0;
    const principalDue = parseFloat(document.getElementById('principalDue').value) || 0;

    scheduleData[selectedRowIndex].installmentDueDate = installmentDueDate;
    scheduleData[selectedRowIndex].expectedInterest = expectedInterest;
    scheduleData[selectedRowIndex].principalDue = principalDue;
    scheduleData[selectedRowIndex].installmentAmount = expectedInterest + principalDue;

    // Recalculate balances
    recalculateBalances();
    renderScheduleTable();
    clearInstallmentFields();
    selectedRowIndex = null;
    showMessage('Installment updated successfully', 'success');
}

// Handle clear fields
function handleClear() {
    clearInstallmentFields();
    selectedRowIndex = null;
    showMessage('Fields cleared', 'info');
}

// Handle view
async function handleView() {
    console.log('View manual schedule - fetching data from backend');
    await fetchManualScheduleData();
    disableEdit();
}

// Handle add to schedule
function handleAdd() {
    console.log('Add to schedule');

    if (!validateInstallmentFields()) {
        return;
    }

    const installmentDueDate = document.getElementById('installmentDueDate').value;
    const expectedInterest = parseFloat(document.getElementById('expectedInterest').value) || 0;
    const principalDue = parseFloat(document.getElementById('principalDue').value) || 0;

    const newInstallment = {
        insNo: scheduleData.length + 1,
        installmentDueDate: installmentDueDate,
        loanBalance: 0,
        principalBalance: 0,
        installmentAmount: expectedInterest + principalDue,
        principalDue: principalDue,
        expectedInterest: expectedInterest
    };

    scheduleData.push(newInstallment);
    recalculateBalances();
    renderScheduleTable();
    clearInstallmentFields();
    showMessage('Installment added to schedule', 'success');
}

// Handle cancel
function handleCancel() {
    console.log('Cancel operation');
    clearInstallmentFields();
    selectedRowIndex = null;
    disableEdit();
    showMessage('Operation cancelled', 'info');
}

// Handle back
function handleBack() {
    console.log('Back to main form');
    closeModal();
}

// Validate installment fields
function validateInstallmentFields() {
    const installmentDueDate = document.getElementById('installmentDueDate').value;
    const expectedInterest = document.getElementById('expectedInterest').value;
    const principalDue = document.getElementById('principalDue').value;

    if (!installmentDueDate) {
        showMessage('Please select Installment Due Date', 'error');
        return false;
    }

    if (!expectedInterest || parseFloat(expectedInterest) < 0) {
        showMessage('Please enter valid Expected Interest', 'error');
        return false;
    }

    if (!principalDue || parseFloat(principalDue) <= 0) {
        showMessage('Please enter valid Principal Due', 'error');
        return false;
    }

    return true;
}

// Clear installment fields
function clearInstallmentFields() {
    document.getElementById('installmentDueDate').value = '';
    document.getElementById('expectedInterest').value = '';
    document.getElementById('principalDue').value = '';
}

// Recalculate balances
function recalculateBalances() {
    const appliedAmount = parseFloat(document.getElementById('appliedAmount').value) || 0;
    let remainingBalance = appliedAmount;
    let remainingPrincipal = appliedAmount;

    scheduleData.forEach((installment, index) => {
        installment.insNo = index + 1;
        installment.loanBalance = remainingBalance;
        installment.principalBalance = remainingPrincipal;
        
        remainingBalance -= installment.installmentAmount;
        remainingPrincipal -= installment.principalDue;
    });
}

// Render schedule table
function renderScheduleTable() {
    const tableBody = document.getElementById('scheduleTableBody');
    
    if (scheduleData.length === 0) {
        tableBody.innerHTML = '<tr class="no-data"><td colspan="7">No records to display.</td></tr>';
        return;
    }

    let html = '';
    scheduleData.forEach((installment, index) => {
        html += `
            <tr onclick="selectRow(${index})" class="${index === selectedRowIndex ? 'selected' : ''}">
                <td>${installment.insNo}</td>
                <td>${installment.installmentDueDate}</td>
                <td>${installment.loanBalance.toFixed(2)}</td>
                <td>${installment.principalBalance.toFixed(2)}</td>
                <td>${installment.installmentAmount.toFixed(2)}</td>
                <td>${installment.principalDue.toFixed(2)}</td>
                <td>${installment.expectedInterest.toFixed(2)}</td>
            </tr>
        `;
    });

    tableBody.innerHTML = html;
}

// Select row
function selectRow(index) {
    selectedRowIndex = index;
    const installment = scheduleData[index];
    
    document.getElementById('installmentDueDate').value = installment.installmentDueDate;
    document.getElementById('expectedInterest').value = installment.expectedInterest;
    document.getElementById('principalDue').value = installment.principalDue;
    
    renderScheduleTable();
}

// Enable form editing
function enableEdit() {
    const inputs = document.querySelectorAll('.form-control:not([readonly])');
    inputs.forEach(input => {
        input.disabled = false;
    });
}

// Disable form editing
function disableEdit() {
    const inputs = document.querySelectorAll('.form-control:not([readonly])');
    inputs.forEach(input => {
        input.disabled = true;
    });
}

// Show message
function showMessage(message, type) {
    console.log(`${type.toUpperCase()}: ${message}`);
    // TODO: Implement proper message display
}

// Close modal function
function closeModal() {
    // Send message to parent to close modal
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: 'closeManualScheduleModal' }, '*');
    } else {
        window.close();
    }
}

// Toggle width function
function toggleWidth() {
    document.body.classList.toggle('wide-mode');
}
