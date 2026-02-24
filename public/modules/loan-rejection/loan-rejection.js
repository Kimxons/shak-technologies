// Loan Application Rejection Module

// DOM Elements
const applicationIdInput = document.getElementById('applicationId');
const clientIdInput = document.getElementById('clientId');
const loanTypeInput = document.getElementById('loanType');
const productIdInput = document.getElementById('productId');
const termInput = document.getElementById('term');
const currencyIdInput = document.getElementById('currencyId');
const applicationStatusInput = document.getElementById('applicationStatus');
const loanAmountInput = document.getElementById('loanAmount');
const applicationStageInput = document.getElementById('applicationStage');
const applicationDateInput = document.getElementById('applicationDate');
const workflowTypeIdInput = document.getElementById('workflowTypeId');
const reverseChargeCheckbox = document.getElementById('reverseCharge');
const otherReasonTextarea = document.getElementById('otherReason');

// Rejection reason checkboxes
const reasonCheckboxes = {
    reason1: document.getElementById('reason1'),
    reason2: document.getElementById('reason2'),
    reason3: document.getElementById('reason3'),
    reason4: document.getElementById('reason4'),
    reason5: document.getElementById('reason5'),
    reason6: document.getElementById('reason6')
};

// Behind the scene fields
const rejectedByInput = document.getElementById('rejectedBy');
const rejectedOnInput = document.getElementById('rejectedOn');
const createdByInput = document.getElementById('createdBy');
const createdOnInput = document.getElementById('createdOn');
const modifiedByInput = document.getElementById('modifiedBy');
const modifiedOnInput = document.getElementById('modifiedOn');
const verifiedByInput = document.getElementById('verifiedBy');
const verifiedOnInput = document.getElementById('verifiedOn');

// Action Buttons
const viewBtn = document.getElementById('viewBtn');
const rejectBtn = document.getElementById('rejectBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Search buttons
const applicationSearchBtn = applicationIdInput.nextElementSibling;

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    loadInitialData();
});

// Initialize Event Listeners
function initializeEventListeners() {
    // Search button events
    applicationSearchBtn.addEventListener('click', searchApplication);
    
    // Application ID Enter key
    applicationIdInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            e.preventDefault();
            searchApplication();
        }
    });

    // Action button events
    viewBtn.addEventListener('click', viewApplication);
    rejectBtn.addEventListener('click', rejectApplication);
    cancelBtn.addEventListener('click', closeModal);

    // Enable/disable other reason textarea based on checkbox
    reasonCheckboxes.reason6.addEventListener('change', function() {
        otherReasonTextarea.disabled = !this.checked;
        if (!this.checked) {
            otherReasonTextarea.value = '';
        }
    });
}

// Load Initial Data
function loadInitialData() {
    // Set current date as default
    const today = new Date().toISOString().split('T')[0];
    applicationDateInput.value = today;

    // Disable other reason textarea initially
    otherReasonTextarea.disabled = true;

    // Disable reject button initially
    rejectBtn.disabled = true;
}

// Search Application
function searchApplication() {
    const applicationId = applicationIdInput.value.trim();
    
    if (!applicationId) {
        showNotification('Please enter an Application ID', 'warning');
        return;
    }

    // Show loading state
    showLoadingState(true);

    // Simulate API call - Replace with actual API endpoint
    setTimeout(() => {
        // Mock data - Replace with actual API response
        const mockData = {
            clientId: 'CLI001',
            loanType: 'Personal Loan',
            productId: 'PROD123',
            term: '12 months',
            currencyId: 'KES',
            applicationStatus: 'Pending Approval',
            loanAmount: '500,000.00',
            applicationStage: 'Appraisal',
            applicationDate: '2025-01-10',
            workflowTypeId: 'WF001',
            reverseCharge: false,
            createdBy: 'Admin',
            createdOn: '2025-01-10T10:30:00',
            modifiedBy: '',
            modifiedOn: ''
        };

        populateApplicationData(mockData);
        showLoadingState(false);
        rejectBtn.disabled = false;
    }, 800);
}

// Populate Application Data
function populateApplicationData(data) {
    clientIdInput.value = data.clientId || '';
    loanTypeInput.value = data.loanType || '';
    productIdInput.value = data.productId || '';
    termInput.value = data.term || '';
    currencyIdInput.value = data.currencyId || '';
    applicationStatusInput.value = data.applicationStatus || '';
    loanAmountInput.value = data.loanAmount || '';
    applicationStageInput.value = data.applicationStage || '';
    applicationDateInput.value = data.applicationDate || '';
    workflowTypeIdInput.value = data.workflowTypeId || '';
    reverseChargeCheckbox.checked = data.reverseCharge || false;
    
    // Behind the scene
    createdByInput.value = data.createdBy || '';
    createdOnInput.value = data.createdOn || '';
    modifiedByInput.value = data.modifiedBy || '';
    modifiedOnInput.value = data.modifiedOn || '';

    showNotification('Application loaded successfully', 'success');
}

// View Application
function viewApplication() {
    const applicationId = applicationIdInput.value.trim();
    
    if (!applicationId) {
        showNotification('Please search for an application first', 'warning');
        return;
    }

    // Implement view logic - could open detailed view or print
    console.log('Viewing application:', applicationId);
    showNotification('Opening application details...', 'info');
}

// Reject Application
function rejectApplication() {
    const applicationId = applicationIdInput.value.trim();
    
    if (!applicationId) {
        showNotification('Please search for an application first', 'warning');
        return;
    }

    // Validate that at least one rejection reason is selected
    const selectedReasons = getSelectedReasons();
    if (selectedReasons.length === 0) {
        showNotification('Please select at least one rejection reason', 'warning');
        return;
    }

    // If "Other" is selected, validate description
    if (reasonCheckboxes.reason6.checked && !otherReasonTextarea.value.trim()) {
        showNotification('Please provide a description for other rejection reason', 'warning');
        return;
    }

    // Confirm rejection
    if (!confirm('Are you sure you want to reject this loan application?')) {
        return;
    }

    // Show loading state
    showLoadingState(true);

    // Prepare rejection data
    const rejectionData = {
        applicationId: applicationId,
        reasons: selectedReasons,
        otherReason: otherReasonTextarea.value.trim(),
        reverseCharge: reverseChargeCheckbox.checked,
        rejectedBy: 'Admin', // Get from session
        rejectedOn: new Date().toISOString()
    };

    // Simulate API call - Replace with actual API endpoint
    setTimeout(() => {
        console.log('Rejecting application:', rejectionData);
        
        // Update rejection fields
        rejectedByInput.value = rejectionData.rejectedBy;
        rejectedOnInput.value = rejectionData.rejectedOn;
        
        showLoadingState(false);
        showNotification('Application rejected successfully', 'success');
        
        // Clear form after 2 seconds
        setTimeout(() => {
            clearForm();
        }, 2000);
    }, 1000);
}

// Get Selected Reasons
function getSelectedReasons() {
    const reasons = [];
    const reasonLabels = {
        reason1: 'Bad Credit Rating',
        reason2: 'Client Verification Failure',
        reason3: 'Client not agreed for the Loan',
        reason4: 'Incomplete Documentation',
        reason5: 'Insufficient Collateral',
        reason6: 'Other'
    };

    Object.keys(reasonCheckboxes).forEach(key => {
        if (reasonCheckboxes[key].checked) {
            reasons.push(reasonLabels[key]);
        }
    });

    return reasons;
}

// Clear Form
function clearForm() {
    applicationIdInput.value = '';
    clientIdInput.value = '';
    loanTypeInput.value = '';
    productIdInput.value = '';
    termInput.value = '';
    currencyIdInput.value = '';
    applicationStatusInput.value = '';
    loanAmountInput.value = '';
    applicationStageInput.value = '';
    workflowTypeIdInput.value = '';
    reverseChargeCheckbox.checked = false;
    otherReasonTextarea.value = '';
    
    // Clear all reason checkboxes
    Object.values(reasonCheckboxes).forEach(checkbox => {
        checkbox.checked = false;
    });
    
    // Clear behind the scene fields
    rejectedByInput.value = '';
    rejectedOnInput.value = '';
    createdByInput.value = '';
    createdOnInput.value = '';
    modifiedByInput.value = '';
    modifiedOnInput.value = '';
    verifiedByInput.value = '';
    verifiedOnInput.value = '';
    
    // Reset date and disable buttons
    const today = new Date().toISOString().split('T')[0];
    applicationDateInput.value = today;
    rejectBtn.disabled = true;
    otherReasonTextarea.disabled = true;
}

// Show Loading State
function showLoadingState(loading) {
    const buttons = [viewBtn, rejectBtn, cancelBtn];
    buttons.forEach(btn => {
        btn.disabled = loading;
        if (loading) {
            btn.innerHTML = '<i class="bi bi-hourglass-split"></i> Loading...';
        }
    });
    
    if (!loading) {
        viewBtn.innerHTML = '<i class="bi bi-eye"></i> View';
        rejectBtn.innerHTML = '<i class="bi bi-x-circle"></i> Reject';
        cancelBtn.innerHTML = '<i class="bi bi-x-lg"></i> Cancel';
    }
}

// Show Notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;
    
    // Add to body
    document.body.appendChild(notification);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.add('fade-out');
        setTimeout(() => {
            document.body.removeChild(notification);
        }, 300);
    }, 3000);
}

// Close Modal (for iframe context)
function closeModal() {
    if (window.parent !== window) {
        window.parent.postMessage({ action: 'closeLoanRejectionModal' }, '*');
    } else {
        // If not in iframe, just clear the form
        if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
            clearForm();
        }
    }
}

// Add notification styles dynamically
const style = document.createElement('style');
style.textContent = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        padding: 15px 20px;
        border-radius: 8px;
        color: white;
        font-weight: 500;
        z-index: 10000;
        animation: slideIn 0.3s ease-out;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    
    .notification-success {
        background: linear-gradient(135deg, #10b981 0%, #059669 100%);
    }
    
    .notification-warning {
        background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%);
    }
    
    .notification-error {
        background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%);
    }
    
    .notification-info {
        background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
    }
    
    .notification.fade-out {
        animation: slideOut 0.3s ease-in;
    }
    
    @keyframes slideIn {
        from {
            transform: translateX(400px);
            opacity: 0;
        }
        to {
            transform: translateX(0);
            opacity: 1;
        }
    }
    
    @keyframes slideOut {
        from {
            transform: translateX(0);
            opacity: 1;
        }
        to {
            transform: translateX(400px);
            opacity: 0;
        }
    }
`;
document.head.appendChild(style);
