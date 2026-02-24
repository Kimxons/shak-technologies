// Guarantor Modal JavaScript

// Get services - will be available after script loads
let LookupService;

function getLookupService() {
    if (!LookupService) {
        LookupService = window.LookupService || window.parent?.LookupService;
    }
    return LookupService;
}

function showMessage(message, type = 'info') {
    if (window.parent && window.parent.NotificationService) {
        window.parent.NotificationService.showToast(message, type);
    } else {
        alert(message);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeGuarantorModal();
    // Wait a bit for services to load
    setTimeout(loadGuarantorTypes, 100);
});

/**
 * Load Guarantor Types from database
 */
async function loadGuarantorTypes() {
    try {
        console.log('[GuarantorModal] Loading guarantor types...');
        
        const service = getLookupService();
        if (!service) {
            console.error('[GuarantorModal] LookupService not available');
            showMessage('Service not available. Please refresh the page.', 'error');
            return;
        }

        const guarantorTypes = await service.getGuarantorTypes();
        console.log('[GuarantorModal] Guarantor types loaded:', guarantorTypes);
        
        const selectElement = document.getElementById('guarantorType');
        if (!selectElement) {
            console.error('[GuarantorModal] Guarantor Type select element not found');
            return;
        }

        // Clear existing options except the first one
        selectElement.innerHTML = '<option value="">Select Guarantor Type</option>';
        
        // Populate with database options
        guarantorTypes.forEach(type => {
            const option = document.createElement('option');
            option.value = type.value;
            option.textContent = type.label;
            selectElement.appendChild(option);
        });

        console.log('[GuarantorModal] Guarantor type dropdown populated');
    } catch (error) {
        console.error('[GuarantorModal] Error loading guarantor types:', error);
        showMessage('Failed to load guarantor types', 'error');
    }
}

// Initialize modal handlers
function initializeGuarantorModal() {
    // Top bar button handlers
    const btnClose = document.getElementById('btnClose');
    const btnResize = document.getElementById('btnResize');

    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }

    if (btnResize) {
        btnResize.addEventListener('click', toggleWidth);
    }

    // Search button handler
    const btnSearchGuarantor = document.getElementById('btnSearchGuarantor');
    if (btnSearchGuarantor) {
        btnSearchGuarantor.addEventListener('click', openGuarantorSearchModal);
    }

    // Guarantor type change handler
    const guarantorTypeSelect = document.getElementById('guarantorType');
    if (guarantorTypeSelect) {
        guarantorTypeSelect.addEventListener('change', handleGuarantorTypeChange);
    }

    // Action button handlers
    const viewBtn = document.getElementById('viewBtn');
    const addBtn = document.getElementById('addBtn');
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const backBtn = document.getElementById('backBtn');

    if (viewBtn) viewBtn.addEventListener('click', handleView);
    if (addBtn) addBtn.addEventListener('click', handleAdd);
    if (editBtn) editBtn.addEventListener('click', handleEdit);
    if (saveBtn) saveBtn.addEventListener('click', handleSave);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (backBtn) backBtn.addEventListener('click', handleBack);
}

/**
 * Open guarantor search modal
 */
function openGuarantorSearchModal() {
    console.log('[GuarantorModal] Opening guarantor search modal...');
    
    // Check if bootstrap is available
    if (typeof bootstrap === 'undefined') {
        console.error('[GuarantorModal] Bootstrap is not loaded');
        showMessage('Modal library not available. Please refresh the page.', 'error');
        return;
    }
    
    const searchModal = document.getElementById('guarantorSearchModal');
    if (searchModal) {
        // Modal already loaded, show it
        try {
            const modal = new bootstrap.Modal(searchModal);
            modal.show();
        } catch (error) {
            console.error('[GuarantorModal] Error showing modal:', error);
            showMessage('Error opening search modal', 'error');
        }
    } else {
        // Modal not loaded yet, wait and try again
        console.log('[GuarantorModal] Waiting for search modal to load...');
        setTimeout(() => {
            const delayedModal = document.getElementById('guarantorSearchModal');
            if (delayedModal) {
                try {
                    const modal = new bootstrap.Modal(delayedModal);
                    modal.show();
                } catch (error) {
                    console.error('[GuarantorModal] Error showing delayed modal:', error);
                    showMessage('Error opening search modal', 'error');
                }
            } else {
                console.error('[GuarantorModal] Guarantor search modal not found after delay');
                showMessage('Search modal not available. Please try again.', 'error');
            }
        }, 500);
    }
}

// Handle search guarantor
function handleSearchGuarantor() {
    const guarantorId = document.getElementById('guarantorId').value;
    console.log('Searching for guarantor:', guarantorId);
    // TODO: Implement actual search functionality
}

// Handle guarantor type change
function handleGuarantorTypeChange(event) {
    const guarantorType = event.target.value;
    console.log('Guarantor type changed to:', guarantorType);
    // TODO: Adjust form fields based on guarantor type
}

// Handle view action
function handleView() {
    console.log('View button clicked');
    // TODO: Implement view functionality
}

// Handle add action
function handleAdd() {
    if (validateGuarantorForm()) {
        console.log('Add button clicked');
        // TODO: Implement add functionality
        addGuarantorToTable();
    }
}

// Handle edit action
function handleEdit() {
    console.log('Edit button clicked');
    enableFormEditing();
}

// Handle save action
function handleSave() {
    if (validateGuarantorForm()) {
        console.log('Save button clicked');
        // TODO: Implement save functionality
        showMessage('Guarantor details saved successfully', 'success');
    }
}

// Handle cancel action
function handleCancel() {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        clearGuarantorForm();
    }
}

// Handle back action
function handleBack() {
    window.parent.postMessage({ action: 'closeGuarantorModal' }, '*');
}

// Validate guarantor form
function validateGuarantorForm() {
    const guarantorId = document.getElementById('guarantorId').value;
    const guaranteeAmount = document.getElementById('guaranteeAmount').value;

    if (!guarantorId.trim()) {
        showMessage('Please enter Guarantor ID', 'error');
        document.getElementById('guarantorId').focus();
        return false;
    }

    if (!guaranteeAmount || parseFloat(guaranteeAmount) <= 0) {
        showMessage('Please enter a valid Guarantee Amount', 'error');
        document.getElementById('guaranteeAmount').focus();
        return false;
    }

    return true;
}

// Clear guarantor form
function clearGuarantorForm() {
    // Clear editable fields
    document.getElementById('guarantorId').value = '';
    document.getElementById('guaranteeAmount').value = '';
    document.getElementById('remarks').value = '';
    
    // Clear readonly fields
    document.getElementById('institutionClientId').value = '';
    document.getElementById('guaranteedAmount').value = '';
    document.getElementById('maxGuaranteeAmount').value = '';
    document.getElementById('loansAlreadyGuaranteed').value = '';
    document.getElementById('maxNoOfLoan').value = '';
    document.getElementById('netWorth').value = '';
    document.getElementById('liability').value = '';
    document.getElementById('applicationStatus').value = '';
    document.getElementById('signedBy').value = '';
    document.getElementById('createdBy').value = '';
    document.getElementById('modifiedBy').value = '';
    document.getElementById('createdOn').value = '';
    document.getElementById('modifiedOn').value = '';
}

// Enable form editing
function enableFormEditing() {
    const editableFields = ['guarantorId', 'guaranteeAmount', 'remarks'];
    editableFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.removeAttribute('readonly');
            field.removeAttribute('disabled');
        }
    });
}

// Add guarantor to table
function addGuarantorToTable() {
    const guarantorId = document.getElementById('guarantorId').value;
    const guaranteeAmount = document.getElementById('guaranteeAmount').value;
    const guarantorType = document.getElementById('guarantorType').value;

    const tableBody = document.getElementById('guarantorTableBody');
    
    // Remove "No records" row if it exists
    const noDataRow = tableBody.querySelector('.no-data');
    if (noDataRow) {
        noDataRow.parentElement.remove();
    }

    // Create new row
    const newRow = document.createElement('tr');
    newRow.innerHTML = `
        <td><input type="checkbox" class="form-check-input"></td>
        <td>${guarantorId}</td>
        <td>Guarantor Name</td>
        <td>${parseFloat(guaranteeAmount).toFixed(2)}</td>
        <td>Active</td>
    `;

    tableBody.appendChild(newRow);

    // Clear form after adding
    clearGuarantorForm();
}

// Close modal function
function closeModal() {
    // Send message to parent to close modal
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: 'closeGuarantorModal' }, '*');
    } else {
        window.close();
    }
}

// Toggle width function
function toggleWidth() {
    document.body.classList.toggle('wide-mode');
}

// Export functions for external use
window.guarantorModal = {
    handleSearchGuarantor,
    handleView,
    handleAdd,
    handleEdit,
    handleSave,
    handleCancel,
    handleBack,
    validateGuarantorForm,
    clearGuarantorForm
};
