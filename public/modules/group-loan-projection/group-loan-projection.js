// Group Loan Application Projection JavaScript

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeFormHandlers();
    loadInitialData();
    wireCollapsibleSections();
});

// Initialize form handlers
function initializeFormHandlers() {
    // Search button handlers
    document.querySelectorAll('.btn-search').forEach(btn => {
        btn.addEventListener('click', handleSearch);
    });

    // Form action handlers
    const alterBtn = document.querySelector('.btn-alter');
    const updateBtn = document.querySelector('.btn-update');
    const clearBtn = document.querySelector('.btn-clear');

    if (alterBtn) alterBtn.addEventListener('click', handleAlter);
    if (updateBtn) updateBtn.addEventListener('click', handleUpdate);
    if (clearBtn) clearBtn.addEventListener('click', handleClear);

    // Sidebar action handlers
    const viewBtn = document.querySelector('.btn-view');
    const editBtn = document.querySelector('.btn-edit');
    const doneBtn = document.querySelector('.btn-done');
    const cancelBtn = document.querySelector('.btn-cancel');

    if (viewBtn) viewBtn.addEventListener('click', handleView);
    if (editBtn) editBtn.addEventListener('click', handleEdit);
    if (doneBtn) doneBtn.addEventListener('click', handleDone);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);

    // Input validation
    setupInputValidation();
}

// Collapsible Sections
function wireCollapsibleSections() {
    document.querySelectorAll('.form-section').forEach(section => {
        const header = section.querySelector('[data-section-toggle]');
        const toggleBtn = section.querySelector('.section-toggle-btn');
        
        if (!header) return;
        
        header.addEventListener('click', function(e) {
            // Don't toggle if clicking on a button (except the toggle button itself)
            if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;
            
            const isCollapsed = section.classList.contains('collapsed');
            
            if (isCollapsed) {
                // Expand
                section.classList.remove('collapsed');
                if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'true');
            } else {
                // Collapse
                section.classList.add('collapsed');
                if (toggleBtn) toggleBtn.setAttribute('aria-expanded', 'false');
            }
        });
    });
}


// Load initial data
function loadInitialData() {
    // Load branch data (already populated)
    // Additional data loading can be added here
}

// Handle search functionality
function handleSearch(event) {
    const button = event.currentTarget;
    const inputGroup = button.closest('.segmented-input-group') || button.closest('.input-with-search');
    
    if (inputGroup) {
        const idInput = inputGroup.querySelector('.segmented-id') || inputGroup.querySelector('.form-control');
        console.log('Searching for:', idInput.value);
        // TODO: Implement actual search functionality
    }
}

// Handle alter action
function handleAlter() {
    console.log('Alter button clicked');
    // TODO: Implement alter functionality
}

// Handle update action
function handleUpdate() {
    if (validateForm()) {
        console.log('Update button clicked');
        // TODO: Implement update functionality
    }
}

// Handle clear action
function handleClear() {
    if (confirm('Are you sure you want to clear all fields?')) {
        clearForm();
    }
}

// Handle view action
function handleView() {
    console.log('View button clicked');
    // TODO: Implement view functionality
}

// Handle edit action
function handleEdit() {
    console.log('Edit button clicked');
    enableFormEditing();
}

// Handle done action
function handleDone() {
    console.log('Done button clicked');
    // TODO: Implement done functionality
    window.parent.postMessage({ action: 'closeModal' }, '*');
}

// Handle cancel action
function handleCancel() {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        window.parent.postMessage({ action: 'closeModal' }, '*');
    }
}

// Validate form
function validateForm() {
    const requiredFields = [
        'centerId',
        'groupId',
        'schemeId',
        'productId'
    ];

    for (const fieldId of requiredFields) {
        const field = document.getElementById(fieldId);
        if (field && !field.value.trim()) {
            alert(`Please fill in the ${field.previousElementSibling.textContent} field.`);
            field.focus();
            return false;
        }
    }

    return true;
}

// Clear form
function clearForm() {
    // Clear all input fields except readonly ones
    document.querySelectorAll('.form-control:not([readonly])').forEach(input => {
        if (input.tagName === 'SELECT') {
            input.selectedIndex = 0;
        } else {
            input.value = '';
        }
    });

    // Clear table
    const tableBody = document.getElementById('applicationTableBody');
    if (tableBody) {
        tableBody.innerHTML = '<tr><td colspan="14" class="no-data">No records to display.</td></tr>';
    }
}

// Enable form editing
function enableFormEditing() {
    document.querySelectorAll('.form-control').forEach(input => {
        if (!input.classList.contains('segmented-name')) {
            input.removeAttribute('readonly');
            input.removeAttribute('disabled');
        }
    });
}

// Setup input validation
function setupInputValidation() {
    // Numeric fields
    const numericFields = ['loanAmount', 'loanCycle', 'loanLevel', 'term', 'repaymentTerm', 'interestRate', 'gracePeriod'];
    
    numericFields.forEach(fieldId => {
        const field = document.getElementById(fieldId);
        if (field) {
            field.addEventListener('input', function(e) {
                // Allow only numbers and decimal point
                this.value = this.value.replace(/[^0-9.]/g, '');
                // Ensure only one decimal point
                const parts = this.value.split('.');
                if (parts.length > 2) {
                    this.value = parts[0] + '.' + parts.slice(1).join('');
                }
            });
        }
    });
}

// Close modal function
function closeModal() {
    if (confirm('Are you sure you want to close? Any unsaved changes will be lost.')) {
        window.parent.postMessage({ action: 'closeModal' }, '*');
    }
}

// Export functions for external use
window.groupLoanProjection = {
    handleSearch,
    handleAlter,
    handleUpdate,
    handleClear,
    handleView,
    handleEdit,
    handleDone,
    handleCancel,
    validateForm,
    clearForm
};
