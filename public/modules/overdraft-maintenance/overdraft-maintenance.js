// Overdraft Maintenance - Main JavaScript

// DOM Elements - Buttons
const viewBtn = document.getElementById('viewBtn');
const editBtn = document.getElementById('editBtn');
const reviewBtn = document.getElementById('reviewBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');
const prevAccountBtn = document.getElementById('prevAccountBtn');
const nextAccountBtn = document.getElementById('nextAccountBtn');

// Search Buttons
const searchBranchBtn = document.getElementById('searchBranchBtn');
const searchClientBtn = document.getElementById('searchClientBtn');
const searchAccountBtn = document.getElementById('searchAccountBtn');
const searchRepaymentBtn = document.getElementById('searchRepaymentBtn');

// Account Identification
const branchId = document.getElementById('branchId');
const branchName = document.getElementById('branchName');
const clientId = document.getElementById('clientId');
const accountId = document.getElementById('accountId');

// Overdraft Details
const amount = document.getElementById('amount');
const creditOfficer = document.getElementById('creditOfficer');
const expiryDate = document.getElementById('expiryDate');
const reviewDate = document.getElementById('reviewDate');
const remarks = document.getElementById('remarks');
const clientLimit = document.getElementById('clientLimit');
const clientLimitExpiry = document.getElementById('clientLimitExpiry');
const mainRepaymentAccountId = document.getElementById('mainRepaymentAccountId');
const drawingPower = document.getElementById('drawingPower');

// Limit Details
const limitId = document.getElementById('limitId');
const healthCode = document.getElementById('healthCode');
const todLimitAmount = document.getElementById('todLimitAmount');
const todExpiry = document.getElementById('todExpiry');
const odLimitAmount = document.getElementById('odLimitAmount');
const odExpiry = document.getElementById('odExpiry');

// Interest & Provision
const accruedInterest = document.getElementById('accruedInterest');
const interestDue = document.getElementById('interestDue');
const provisionAmount = document.getElementById('provisionAmount');
const suspendedInterest = document.getElementById('suspendedInterest');
const interestDueDays = document.getElementById('interestDueDays');
const excessDays = document.getElementById('excessDays');

// Behind The Scene
const clearBalance = document.getElementById('clearBalance');
const freezedAmount = document.getElementById('freezedAmount');
const unclearBalance = document.getElementById('unclearBalance');
const availableBalance = document.getElementById('availableBalance');
const unsupervisedCredit = document.getElementById('unsupervisedCredit');
const totalBalance = document.getElementById('totalBalance');
const unsupervisedDebit = document.getElementById('unsupervisedDebit');
const productId = document.getElementById('productId');
const status = document.getElementById('status');
const currencyId = document.getElementById('currencyId');

// Audit Fields
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
let currentOverdraft = null;
let activeSection = 'dataentry';

// Event Listeners
viewBtn.addEventListener('click', viewOverdraft);
editBtn.addEventListener('click', enableEdit);
reviewBtn.addEventListener('click', reviewOverdraft);
saveBtn.addEventListener('click', saveOverdraft);
cancelBtn.addEventListener('click', cancelOperation);

prevAccountBtn.addEventListener('click', navigatePrevious);
nextAccountBtn.addEventListener('click', navigateNext);

searchBranchBtn.addEventListener('click', searchBranch);
searchClientBtn.addEventListener('click', searchClient);
searchAccountBtn.addEventListener('click', searchAccount);
searchRepaymentBtn.addEventListener('click', searchRepaymentAccount);

// Sidebar Menu Navigation
menuItems.forEach(item => {
    item.addEventListener('click', () => {
        menuItems.forEach(i => i.classList.remove('active'));
        item.classList.add('active');
        
        activeSection = item.dataset.section;
        loadSection(activeSection);
    });
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    disableEdit();
    loadSection('dataentry');
});

// Guarantor Modal Functions
function openGuarantorModal() {
    const modal = document.getElementById('guarantorModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeGuarantorModal() {
    const modal = document.getElementById('guarantorModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Interest Rates Modal Functions
function openInterestRatesModal() {
    const modal = document.getElementById('interestRatesModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeInterestRatesModal() {
    const modal = document.getElementById('interestRatesModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Documents Modal Functions
function openDocumentsModal() {
    const modal = document.getElementById('documentsModal');
    if (modal) {
        modal.classList.add('active');
    }
}

function closeDocumentsModal() {
    const modal = document.getElementById('documentsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

// Make modal close functions available globally for iframe
window.closeGuarantorModal = closeGuarantorModal;
window.closeInterestRatesModal = closeInterestRatesModal;
window.closeDocumentsModal = closeDocumentsModal;

function loadSection(section) {
    console.log('Loading section:', section);
    // Open Guarantor modal if Guarantor section is selected
    if (section === 'guarantor') {
        openGuarantorModal();
    }
    // Open Interest Rates modal if Interest Rates section is selected
    if (section === 'interest-rates') {
        openInterestRatesModal();
    }
    // Open Documents modal if Documents section is selected
    if (section === 'documents') {
        openDocumentsModal();
    }
    // In a real application, this would load section-specific data
    // For now, DataEntry is always visible, other sections would load different views
}

function viewOverdraft() {
    if (!accountId.value.trim()) {
        showMessage('Please enter Account ID to view overdraft', 'warning');
        return;
    }

    showMessage('Loading overdraft details...', 'info');
}

function enableEdit() {
    if (!currentOverdraft && !accountId.value.trim()) {
        showMessage('No overdraft to edit. Enter account details first.', 'warning');
        return;
    }

    isEditMode = true;
    
    // Enable all input fields
    enableFormFields();
    
    // Update button states
    editBtn.disabled = true;
    viewBtn.disabled = true;
    reviewBtn.disabled = true;
    saveBtn.disabled = false;
    
    showMessage('Edit mode enabled', 'info');
}

function disableEdit() {
    isEditMode = false;
    
    // Keep basic search fields enabled
    editBtn.disabled = false;
    viewBtn.disabled = false;
    reviewBtn.disabled = false;
    saveBtn.disabled = true;
}

function enableFormFields() {
    amount.disabled = false;
    creditOfficer.disabled = false;
    expiryDate.disabled = false;
    reviewDate.disabled = false;
    remarks.disabled = false;
    clientLimit.disabled = false;
    clientLimitExpiry.disabled = false;
    mainRepaymentAccountId.disabled = false;
    drawingPower.disabled = false;
    limitId.disabled = false;
    healthCode.disabled = false;
    todLimitAmount.disabled = false;
    todExpiry.disabled = false;
    odLimitAmount.disabled = false;
    odExpiry.disabled = false;
    accruedInterest.disabled = false;
    interestDue.disabled = false;
    provisionAmount.disabled = false;
    suspendedInterest.disabled = false;
    interestDueDays.disabled = false;
    excessDays.disabled = false;
}

function reviewOverdraft() {
    if (!currentOverdraft && !accountId.value.trim()) {
        showMessage('No overdraft to review', 'warning');
        return;
    }

    if (confirm('Submit this overdraft for review/approval?')) {
        showMessage('Overdraft submitted for review', 'success');
    }
}

function saveOverdraft() {
    // Validate
    if (!accountId.value.trim()) {
        showMessage('Please enter Account ID', 'warning');
        accountId.focus();
        return;
    }

    if (!amount.value) {
        showMessage('Please enter Amount', 'warning');
        amount.focus();
        return;
    }

    if (confirm('Save this overdraft?')) {
        const overdraftData = {
            branchId: branchId.value,
            clientId: clientId.value,
            accountId: accountId.value,
            amount: amount.value,
            creditOfficer: creditOfficer.value,
            expiryDate: expiryDate.value,
            reviewDate: reviewDate.value,
            remarks: remarks.value,
            clientLimit: clientLimit.value,
            clientLimitExpiry: clientLimitExpiry.value,
            mainRepaymentAccountId: mainRepaymentAccountId.value,
            drawingPower: drawingPower.value,
            limitId: limitId.value,
            healthCode: healthCode.value,
            todLimitAmount: todLimitAmount.value,
            todExpiry: todExpiry.value,
            odLimitAmount: odLimitAmount.value,
            odExpiry: odExpiry.value,
            accruedInterest: accruedInterest.value,
            interestDue: interestDue.value,
            provisionAmount: provisionAmount.value,
            suspendedInterest: suspendedInterest.value,
            interestDueDays: interestDueDays.value,
            excessDays: excessDays.value
        };

        console.log('Saving overdraft:', overdraftData);
        
        // Update audit fields (simulated)
        if (!currentOverdraft) {
            createdBy.value = 'Admin';
            createdOn.value = new Date().toLocaleString();
        }
        modifiedBy.value = 'Admin';
        modifiedOn.value = new Date().toLocaleString();
        
        currentOverdraft = overdraftData;
        disableEdit();
        showMessage('Overdraft saved successfully', 'success');
    }
}

function cancelOperation() {
    if (isEditMode) {
        if (confirm('Discard changes?')) {
            disableEdit();
            showMessage('Operation cancelled', 'info');
        }
    } else {
        if (confirm('Clear form?')) {
            clearForm();
            showMessage('Form cleared', 'info');
        }
    }
}

function navigatePrevious() {
    showMessage('Navigate to previous account - feature to be implemented', 'info');
}

function navigateNext() {
    showMessage('Navigate to next account - feature to be implemented', 'info');
}

function searchBranch() {
    showMessage('Branch search feature - connect to backend', 'info');
}

function searchClient() {
    if (!clientId.value.trim()) {
        showMessage('Please enter Client ID', 'warning');
        return;
    }
    showMessage('Client search feature - connect to backend', 'info');
}

function searchAccount() {
    if (!accountId.value.trim()) {
        showMessage('Please enter Account ID', 'warning');
        return;
    }
    showMessage('Account search feature - connect to backend', 'info');
}

function searchRepaymentAccount() {
    if (!mainRepaymentAccountId.value.trim()) {
        showMessage('Please enter Repayment Account ID', 'warning');
        return;
    }
    showMessage('Repayment account search feature - connect to backend', 'info');
}

function clearForm() {
    clientId.value = '';
    accountId.value = '';
    amount.value = '';
    creditOfficer.value = '';
    expiryDate.value = '0001-01-01';
    reviewDate.value = '0001-01-01';
    remarks.value = '';
    clientLimit.value = '';
    clientLimitExpiry.value = '0001-01-01';
    mainRepaymentAccountId.value = '';
    drawingPower.value = '';
    limitId.value = '';
    healthCode.value = '';
    todLimitAmount.value = '';
    todExpiry.value = '0001-01-01';
    odLimitAmount.value = '';
    odExpiry.value = '0001-01-01';
    accruedInterest.value = '';
    interestDue.value = '';
    provisionAmount.value = '';
    suspendedInterest.value = '';
    interestDueDays.value = '';
    excessDays.value = '';
    clearBalance.value = '';
    freezedAmount.value = '';
    unclearBalance.value = '';
    availableBalance.value = '';
    unsupervisedCredit.value = '';
    totalBalance.value = '';
    unsupervisedDebit.value = '';
    productId.value = '';
    status.value = '';
    currencyId.value = '';
    createdBy.value = '';
    modifiedBy.value = '';
    supervisedBy.value = '';
    createdOn.value = '';
    modifiedOn.value = '';
    supervisedOn.value = '';
    
    currentOverdraft = null;
}

function showMessage(message, type) {
    const icon = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    alert(`${icon[type] || ''} ${message}`);
}
