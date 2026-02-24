// State Management
let isEditMode = false;
let currentSanction = null;

// Initialize form
document.addEventListener('DOMContentLoaded', () => {
    initializeForm();
    initializeSidebar();
    attachEventListeners();
});

function initializeForm() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    const appDateField = document.getElementById('applicationDate');
    if (appDateField) appDateField.value = today;
}

// ========================================================================
// SIDEBAR FUNCTIONALITY
// ========================================================================
function initializeSidebar() {
    // Sidebar toggle (collapse/expand)
    const sidebarToggle = document.getElementById('sidebarToggle');
    const sidebar = document.getElementById('main-sidebar');
    
    if (sidebarToggle && sidebar) {
        sidebarToggle.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            sidebar.classList.toggle('collapsed');
            const isExpanded = !sidebar.classList.contains('collapsed');
            sidebarToggle.setAttribute('aria-expanded', isExpanded);
        });
    }
    
    // Nav header toggle (expand/collapse sections)
    const navHeaders = document.querySelectorAll('.nav-header--card');
    navHeaders.forEach(header => {
        header.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Expand sidebar if collapsed
            if (sidebar && sidebar.classList.contains('collapsed')) {
                sidebar.classList.remove('collapsed');
            }
            
            const section = this.closest('.nav-section--card');
            const navItems = section ? section.querySelector('.nav-items--card') : null;
            
            if (section && navItems) {
                section.classList.toggle('expanded');
                navItems.classList.toggle('is-visible');
            }
        });
    });
    
    // Sidebar item clicks - open modals or switch sections
    const sidebarItems = document.querySelectorAll('.sidebar-item--enhanced[data-section]');
    sidebarItems.forEach(item => {
        item.addEventListener('click', function(e) {
            e.preventDefault();
            e.stopPropagation();
            
            // Update active state
            sidebarItems.forEach(i => i.classList.remove('active'));
            this.classList.add('active');
            
            // Get section and open corresponding modal
            const section = this.getAttribute('data-section');
            openSectionModal(section);
        });
    });
    
    // Section header toggle (form sections)
    const sectionHeaders = document.querySelectorAll('.section-header[data-section-toggle]');
    sectionHeaders.forEach(header => {
        header.addEventListener('click', function() {
            const section = this.closest('.form-section');
            if (section) {
                section.classList.toggle('collapsed');
                const icon = this.querySelector('.section-toggle-btn i');
                if (icon) {
                    icon.classList.toggle('bi-chevron-up');
                    icon.classList.toggle('bi-chevron-down');
                }
            }
        });
    });
}

// Open section modal based on sidebar item click
function openSectionModal(section) {
    console.log('[LoanSanction] Opening modal for section:', section);
    
    let modalId = null;
    
    switch(section) {
        case 'dataentry':
            // Main form - no modal, just scroll to top
            document.querySelector('.form-content')?.scrollTo(0, 0);
            return;
        case 'schedule':
            modalId = 'scheduleModal';
            break;
        case 'charges':
            modalId = 'chargesModal';
            break;
        case 'collateral':
            modalId = 'collateralModal';
            break;
        case 'guarantor':
            modalId = 'guarantorModal';
            break;
        default:
            console.warn('[LoanSanction] Unknown section:', section);
            return;
    }
    
    if (modalId) {
        const modalElement = document.getElementById(modalId);
        if (modalElement) {
            const modal = new bootstrap.Modal(modalElement);
            modal.show();
        } else {
            console.log('[LoanSanction] Modal not found:', modalId, '- functionality to be implemented');
            alert(`${section.charAt(0).toUpperCase() + section.slice(1)} functionality - to be implemented`);
        }
    }
}

function attachEventListeners() {
    // Section dropdown (if exists)
    const sectionDropdown = document.getElementById('sectionDropdown');
    if (sectionDropdown) {
        sectionDropdown.addEventListener('change', handleSectionChange);
    }

    // Action buttons
    const viewBtn = document.getElementById('viewBtn');
    const deviateBtn = document.getElementById('deviateBtn');
    const sanctionBtn = document.getElementById('sanctionBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const chargesBtn = document.getElementById('chargesBtn');
    
    if (viewBtn) viewBtn.addEventListener('click', viewSanction);
    if (deviateBtn) deviateBtn.addEventListener('click', deviateSanction);
    if (sanctionBtn) sanctionBtn.addEventListener('click', sanctionApplication);
    if (cancelBtn) cancelBtn.addEventListener('click', cancelOperation);
    if (chargesBtn) chargesBtn.addEventListener('click', openCharges);
}

// Section Change Handler
function handleSectionChange(event) {
    const section = event.target.value;
    console.log('Section changed to:', section);
    // TODO: Load different sections when implemented
    // For now, only DataEntry is visible
}

// Marking Rate Spinner Functions
function incrementMarkingRate() {
    const input = document.getElementById('markingRate');
    const currentValue = parseFloat(input.value) || 0;
    input.value = (currentValue + 0.1).toFixed(2);
}

function decrementMarkingRate() {
    const input = document.getElementById('markingRate');
    const currentValue = parseFloat(input.value) || 0;
    if (currentValue > 0) {
        input.value = (currentValue - 0.1).toFixed(2);
    }
}

// View Sanction
function viewSanction() {
    console.log('View sanction');
    // TODO: Connect to backend to fetch sanction details
    alert('View functionality - connect to backend to fetch sanction details');
}

// Deviate Sanction
function deviateSanction() {
    console.log('Deviate sanction');
    if (!validateForm()) {
        return;
    }
    
    // TODO: Connect to backend to deviate sanction
    alert('Deviate functionality - connect to backend to process deviation');
}

// Sanction Application
function sanctionApplication() {
    console.log('Sanction application');
    if (!validateForm()) {
        return;
    }

    const sanctionData = collectFormData();
    
    // TODO: Connect to backend to save sanction
    console.log('Sanction data to save:', sanctionData);
    alert('Sanction functionality - connect to backend to save sanction');
}

// Open Charges
function openCharges() {
    console.log('Open charges');
    // TODO: Open charges modal/section
    alert('Charges functionality - to be implemented');
}

// Cancel Operation
function cancelOperation() {
    if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
        clearForm();
    }
}

// Validate Form
function validateForm() {
    const applicationId = document.getElementById('applicationId').value.trim();
    const approvedAmount = parseFloat(document.getElementById('approvedAmount').value);
    const modeOfDisbursement = document.getElementById('modeOfDisbursement').value;

    if (!applicationId) {
        alert('Please select an Application ID');
        return false;
    }

    if (!approvedAmount || approvedAmount <= 0) {
        alert('Please enter a valid Approved Amount');
        return false;
    }

    if (!modeOfDisbursement) {
        alert('Please select a Mode Of Disbursement');
        return false;
    }

    return true;
}

// Collect Form Data
function collectFormData() {
    return {
        branchId: document.getElementById('branchId').value,
        branchName: document.getElementById('branchName').value,
        applicationDate: document.getElementById('applicationDate').value,
        workflowTypeId: document.getElementById('workflowTypeId').value,
        workflowTypeName: document.getElementById('workflowTypeName').value,
        applicationId: document.getElementById('applicationId').value,
        applicationName: document.getElementById('applicationName').value,
        approvedAmount: parseFloat(document.getElementById('approvedAmount').value),
        modeOfDisbursement: document.getElementById('modeOfDisbursement').value,
        noOfDisbursements: parseInt(document.getElementById('noOfDisbursements').value) || 0,
        firstDisbursementDate: document.getElementById('firstDisbursementDate').value,
        collectInterestDuringGrace: document.getElementById('collectInterestDuringGrace').checked,
        repaymentTerm: document.getElementById('repaymentTerm').value,
        gracePeriod: parseInt(document.getElementById('gracePeriod').value) || 0,
        installmentStartDate: document.getElementById('installmentStartDate').value,
        templateSchedule: document.getElementById('templateSchedule').value,
        markingRate: parseFloat(document.getElementById('markingRate').value) || 0,
        interestRateType: document.getElementById('interestRateType').value,
        interestRate: parseFloat(document.getElementById('interestRate').value) || 0,
        baseRate: parseFloat(document.getElementById('baseRate').value) || 0,
        mainRepaymentAccountId: document.getElementById('mainRepaymentAccountId').value,
        mainRepaymentAccountName: document.getElementById('mainRepaymentAccountName').value,
        approvedBy: document.getElementById('approvedBy').value,
        approvedByName: document.getElementById('approvedByName').value,
        approvedDate: document.getElementById('approvedDate').value,
        // Application Details
        clientId: document.getElementById('clientId').value,
        mailingAddress: document.getElementById('mailingAddress').value,
        city: document.getElementById('city').value,
        phone: document.getElementById('phone').value,
        loanType: document.getElementById('loanType').value,
        accountId: document.getElementById('accountId').value,
        loanSeries: document.getElementById('loanSeries').value,
        productId: document.getElementById('productId').value,
        currencyId: document.getElementById('currencyId').value,
        sanctionAmount: parseFloat(document.getElementById('sanctionAmount').value) || 0,
        appliedAmount: parseFloat(document.getElementById('appliedAmount').value) || 0,
        term: parseInt(document.getElementById('term').value) || 0,
        repaymentTermDetails: document.getElementById('repaymentTermDetails').value,
        markingRateDetails: parseFloat(document.getElementById('markingRateDetails').value) || 0,
        interestRateDetails: parseFloat(document.getElementById('interestRateDetails').value) || 0,
        installmentAmount: parseFloat(document.getElementById('installmentAmount').value) || 0,
        calculationMethod: document.getElementById('calculationMethod').value,
        netCollateralValue: parseFloat(document.getElementById('netCollateralValue').value) || 0,
        noOfGuarantors: parseInt(document.getElementById('noOfGuarantors').value) || 0,
        applicationStatus: document.getElementById('applicationStatus').value
    };
}

// Clear Form
function clearForm() {
    // Reset all input fields
    const inputs = document.querySelectorAll('.form-input');
    inputs.forEach(input => {
        if (input.type === 'checkbox') {
            input.checked = false;
        } else if (!input.hasAttribute('readonly')) {
            input.value = '';
        }
    });

    // Reset to today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('applicationDate').value = today;

    // Reset section dropdown
    document.getElementById('sectionDropdown').value = 'dataentry';

    isEditMode = false;
    currentSanction = null;
}

// Load Sanction Data (for editing/viewing)
function loadSanctionData(sanctionData) {
    currentSanction = sanctionData;

    // Populate all fields
    document.getElementById('branchId').value = sanctionData.branchId || '';
    document.getElementById('branchName').value = sanctionData.branchName || '';
    document.getElementById('applicationDate').value = sanctionData.applicationDate || '';
    document.getElementById('workflowTypeId').value = sanctionData.workflowTypeId || '';
    document.getElementById('workflowTypeName').value = sanctionData.workflowTypeName || '';
    document.getElementById('applicationId').value = sanctionData.applicationId || '';
    document.getElementById('applicationName').value = sanctionData.applicationName || '';
    document.getElementById('approvedAmount').value = sanctionData.approvedAmount || '';
    document.getElementById('modeOfDisbursement').value = sanctionData.modeOfDisbursement || '';
    document.getElementById('noOfDisbursements').value = sanctionData.noOfDisbursements || '';
    document.getElementById('firstDisbursementDate').value = sanctionData.firstDisbursementDate || '';
    document.getElementById('collectInterestDuringGrace').checked = sanctionData.collectInterestDuringGrace || false;
    document.getElementById('repaymentTerm').value = sanctionData.repaymentTerm || '';
    document.getElementById('gracePeriod').value = sanctionData.gracePeriod || '';
    document.getElementById('installmentStartDate').value = sanctionData.installmentStartDate || '0001-01-01';
    document.getElementById('templateSchedule').value = sanctionData.templateSchedule || '';
    document.getElementById('markingRate').value = sanctionData.markingRate || '';
    document.getElementById('interestRateType').value = sanctionData.interestRateType || '';
    document.getElementById('interestRate').value = sanctionData.interestRate || '';
    document.getElementById('baseRate').value = sanctionData.baseRate || '';
    document.getElementById('mainRepaymentAccountId').value = sanctionData.mainRepaymentAccountId || '';
    document.getElementById('mainRepaymentAccountName').value = sanctionData.mainRepaymentAccountName || '';
    document.getElementById('approvedBy').value = sanctionData.approvedBy || '';
    document.getElementById('approvedByName').value = sanctionData.approvedByName || '';
    document.getElementById('approvedDate').value = sanctionData.approvedDate || '';

    // Application Details
    document.getElementById('clientId').value = sanctionData.clientId || '';
    document.getElementById('mailingAddress').value = sanctionData.mailingAddress || '';
    document.getElementById('city').value = sanctionData.city || '';
    document.getElementById('phone').value = sanctionData.phone || '';
    document.getElementById('loanType').value = sanctionData.loanType || '';
    document.getElementById('accountId').value = sanctionData.accountId || '';
    document.getElementById('loanSeries').value = sanctionData.loanSeries || '';
    document.getElementById('productId').value = sanctionData.productId || '';
    document.getElementById('currencyId').value = sanctionData.currencyId || '';
    document.getElementById('sanctionAmount').value = sanctionData.sanctionAmount || '';
    document.getElementById('appliedAmount').value = sanctionData.appliedAmount || '';
    document.getElementById('term').value = sanctionData.term || '';
    document.getElementById('repaymentTermDetails').value = sanctionData.repaymentTermDetails || '';
    document.getElementById('markingRateDetails').value = sanctionData.markingRateDetails || '';
    document.getElementById('interestRateDetails').value = sanctionData.interestRateDetails || '';
    document.getElementById('installmentAmount').value = sanctionData.installmentAmount || '';
    document.getElementById('calculationMethod').value = sanctionData.calculationMethod || '';
    document.getElementById('netCollateralValue').value = sanctionData.netCollateralValue || '';
    document.getElementById('noOfGuarantors').value = sanctionData.noOfGuarantors || '';
    document.getElementById('applicationStatus').value = sanctionData.applicationStatus || '';
}
