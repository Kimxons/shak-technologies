// User Defined Fields Modal JavaScript

// Service references
let LookupService = null;

function getLookupService() {
    if (!LookupService) {
        LookupService = window.LookupService || window.parent?.LookupService;
    }
    return LookupService;
}

function showMessage(message, type = 'info') {
    if (window.parent && window.parent.NotificationService) {
        window.parent.NotificationService.showToast(message, type);
    } else if (window.NotificationService) {
        window.NotificationService.showToast(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
        if (type === 'error') alert(message);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    await loadServices();
    initializeUserFieldsModal();
    // Load dynamic dropdowns
    setTimeout(loadDynamicDropdowns, 100);
});

/**
 * Load required services
 */
async function loadServices() {
    try {
        if (window.ServiceLoader) {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadLookupService();
        }
        console.log('[UDFModal] Services loaded');
    } catch (error) {
        console.error('[UDFModal] Error loading services:', error);
    }
}

/**
 * Load dynamic dropdowns from database
 */
async function loadDynamicDropdowns() {
    await Promise.all([
        loadUDFOptions('field7', 'UDFOption1ID'),
        loadUDFOptions('field8', 'UDFOption2ID')
    ]);
}

/**
 * Load UDF options from database
 */
async function loadUDFOptions(fieldId, codeId) {
    try {
        const service = getLookupService();
        if (!service) {
            console.log(`[UDFModal] LookupService not available for ${fieldId}`);
            return;
        }

        const options = await service.getSystemCodeOptions(codeId);
        console.log(`[UDFModal] Options for ${fieldId} loaded:`, options);
        
        const selectElement = document.getElementById(fieldId);
        if (!selectElement) return;

        if (options && options.length > 0) {
            selectElement.innerHTML = '<option value="">--Select--</option>';
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value;
                option.textContent = opt.label;
                selectElement.appendChild(option);
            });
        }
        // Keep static options as fallback if no data
    } catch (error) {
        console.error(`[UDFModal] Error loading options for ${fieldId}:`, error);
    }
}

// Initialize modal handlers
function initializeUserFieldsModal() {
    // Top bar button handlers
    const btnClose = document.getElementById('btnClose');
    const btnResize = document.getElementById('btnResize');

    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }

    if (btnResize) {
        btnResize.addEventListener('click', toggleWidth);
    }

    // Add change listeners for dropdown fields to adjust related fields
    const field7 = document.getElementById('field7');
    const field8 = document.getElementById('field8');
    
    if (field7) {
        field7.addEventListener('change', () => handleUDFChange('field7', field7.value));
    }
    if (field8) {
        field8.addEventListener('change', () => handleUDFChange('field8', field8.value));
    }

    // Action button handlers
    const viewBtn = document.getElementById('viewBtn');
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const backBtn = document.getElementById('backBtn');

    if (viewBtn) viewBtn.addEventListener('click', handleView);
    if (editBtn) editBtn.addEventListener('click', handleEdit);
    if (saveBtn) saveBtn.addEventListener('click', handleSave);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (backBtn) backBtn.addEventListener('click', handleBack);

    // Initialize form state
    disableEdit();
}

/**
 * Handle UDF dropdown change - can adjust related fields
 */
function handleUDFChange(fieldId, value) {
    console.log(`[UDFModal] ${fieldId} changed to:`, value);
    
    // Example: If field7 has a specific value, show/hide related fields
    if (fieldId === 'field7') {
        const field9Row = document.getElementById('field9')?.closest('.col');
        const field10Row = document.getElementById('field10')?.closest('.col');
        
        // Adjust date fields based on field7 selection
        if (value === 'option3') {
            // If specific option selected, dates might be required
            if (field9Row) field9Row.style.opacity = '1';
            if (field10Row) field10Row.style.opacity = '1';
        } else {
            // Otherwise, dates are optional (show slightly dimmed)
            if (field9Row) field9Row.style.opacity = '0.8';
            if (field10Row) field10Row.style.opacity = '0.8';
        }
    }
    
    if (fieldId === 'field8') {
        const field11Row = document.getElementById('field11')?.closest('.col');
        const field12Row = document.getElementById('field12')?.closest('.col');
        
        // Adjust numeric fields based on field8 selection
        if (value) {
            // If any option selected, numeric fields become more relevant
            if (field11Row) field11Row.style.opacity = '1';
            if (field12Row) field12Row.style.opacity = '1';
        }
    }
}

// Handle view
function handleView() {
    console.log('View user defined fields');
    showMessage('View mode activated', 'info');
    disableEdit();
}

// Handle edit
function handleEdit() {
    console.log('Edit user defined fields');
    showMessage('Edit mode activated', 'info');
    enableEdit();
}

// Handle save
function handleSave() {
    console.log('Save user defined fields');
    
    if (!validateForm()) {
        return;
    }

    // TODO: Implement API call to save user defined fields
    showMessage('Save functionality - connect to backend', 'info');
}

// Handle cancel
function handleCancel() {
    console.log('Cancel operation');
    clearForm();
    disableEdit();
    showMessage('Operation cancelled', 'info');
}

// Handle back
function handleBack() {
    console.log('Back to main form');
    closeModal();
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

// Clear form
function clearForm() {
    for (let i = 1; i <= 14; i++) {
        const field = document.getElementById('field' + i);
        if (field) {
            field.value = '';
        }
    }
    
    document.getElementById('applicationStatus').value = '';
    document.getElementById('createdBy').value = '';
    document.getElementById('modifiedBy').value = '';
    document.getElementById('createdOn').value = '';
    document.getElementById('modifiedOn').value = '';
}

// Validate form
function validateForm() {
    // Basic validation - can be customized based on requirements
    return true;
}

// Close modal function
function closeModal() {
    // Send message to parent to close modal
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: 'closeUserDefinedFieldsModal' }, '*');
    } else {
        window.close();
    }
}

// Toggle width function
function toggleWidth() {
    document.body.classList.toggle('wide-mode');
}
