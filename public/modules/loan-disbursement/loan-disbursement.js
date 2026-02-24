// Loan Disbursement JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeDisbursement();
    attachEventListeners();
});

function initializeDisbursement() {
    // Set default date
    const today = new Date().toISOString().split('T')[0];
    
    // Calculate net disbursement amount
    calculateNetDisbursement();
    
    // Calculate local amount based on exchange rate
    calculateLocalAmount();
    
    console.log('Loan Disbursement initialized');
}

function attachEventListeners() {
    // Search buttons
    document.getElementById('searchBranchBtn')?.addEventListener('click', () => searchBranch());
    document.getElementById('searchClientBtn')?.addEventListener('click', () => searchClient());
    document.getElementById('searchAccountBtn')?.addEventListener('click', () => searchAccount());
    document.getElementById('searchContraBranchBtn')?.addEventListener('click', () => searchContraBranch());
    document.getElementById('searchContraAccountBtn')?.addEventListener('click', () => searchContraAccount());
    
    // Calculation fields
    document.getElementById('disbursementAmount')?.addEventListener('input', calculateNetDisbursement);
    document.getElementById('deduction')?.addEventListener('input', calculateNetDisbursement);
    document.getElementById('exchangeRate')?.addEventListener('input', calculateLocalAmount);
    
    // Action buttons
    document.getElementById('viewBtn')?.addEventListener('click', viewDisbursement);
    document.getElementById('deviateBtn')?.addEventListener('click', deviateDisbursement);
    document.getElementById('addBtn')?.addEventListener('click', addDisbursement);
    document.getElementById('saveBtn')?.addEventListener('click', saveDisbursement);
    document.getElementById('cancelBtn')?.addEventListener('click', cancelDisbursement);
    
    // Section selector
    document.getElementById('sectionSelector')?.addEventListener('change', function() {
        loadSection(this.value);
    });
}

// Calculation Functions
function calculateNetDisbursement() {
    const disbursementAmount = parseFloat(document.getElementById('disbursementAmount')?.value) || 0;
    const deduction = parseFloat(document.getElementById('deduction')?.value) || 0;
    const netAmount = disbursementAmount - deduction;
    
    document.getElementById('netDisbAmount').value = netAmount.toFixed(2);
    document.getElementById('netDisbAmountDetails').value = netAmount.toFixed(2);
}

function calculateLocalAmount() {
    const netAmount = parseFloat(document.getElementById('netDisbAmount')?.value) || 0;
    const exchangeRate = parseFloat(document.getElementById('exchangeRate')?.value) || 1;
    const localAmount = netAmount * exchangeRate;
    
    document.getElementById('localAmount').value = localAmount.toFixed(2);
    
    // Calculate forex gain/loss if needed
    const forexDifference = localAmount - netAmount;
    document.getElementById('forexGainLoss').value = forexDifference.toFixed(2);
}

// Search Functions
function searchBranch() {
    // TODO: Implement branch search modal
    console.log('Search branch...');
    alert('Branch search functionality to be implemented');
}

function searchClient() {
    // TODO: Implement client search modal
    console.log('Search client...');
    alert('Client search functionality to be implemented');
}

function searchAccount() {
    // TODO: Implement account search modal
    console.log('Search account...');
    alert('Account search functionality to be implemented');
}

function searchContraBranch() {
    // TODO: Implement contra branch search modal
    console.log('Search contra branch...');
    alert('Contra branch search functionality to be implemented');
}

function searchContraAccount() {
    // TODO: Implement contra account search modal
    console.log('Search contra account...');
    alert('Contra account search functionality to be implemented');
}

// Action Functions
function viewDisbursement() {
    console.log('View disbursement...');
    alert('View functionality to be implemented');
}

function deviateDisbursement() {
    console.log('Deviate disbursement...');
    alert('Deviate functionality to be implemented');
}

function addDisbursement() {
    console.log('Add new disbursement...');
    clearForm();
}

function saveDisbursement() {
    if (!validateForm()) {
        return;
    }
    
    const disbursementData = {
        branchId: document.getElementById('branchId').value,
        clientId: document.getElementById('clientId').value,
        accountId: document.getElementById('accountId').value,
        loanSeries: document.getElementById('loanSeries').value,
        disbursementAmount: parseFloat(document.getElementById('disbursementAmount').value),
        deduction: parseFloat(document.getElementById('deduction').value),
        netDisbAmount: parseFloat(document.getElementById('netDisbAmount').value),
        contractPrinted: document.getElementById('contractPrinted').checked,
        modeOfDisbursement: document.getElementById('modeOfDisbursement').value,
        till: document.getElementById('till').value,
        contraBranchId: document.getElementById('contraBranchId').value,
        accountType: document.getElementById('accountType').value,
        contraAccountId: document.getElementById('contraAccountId').value,
        chequeId: document.getElementById('chequeId').value,
        referenceNo: document.getElementById('referenceNo').value,
        beneficiary: document.getElementById('beneficiary').value,
        exchangeRate: parseFloat(document.getElementById('exchangeRate').value),
        localAmount: parseFloat(document.getElementById('localAmount').value),
        forexGainLoss: parseFloat(document.getElementById('forexGainLoss').value),
        narration: document.getElementById('narration').value
    };
    
    console.log('Saving disbursement data:', disbursementData);
    
    // TODO: Send to API
    alert('Disbursement saved successfully!\n(API integration pending)');
}

function cancelDisbursement() {
    if (confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) {
        clearForm();
    }
}

function validateForm() {
    // Branch validation
    if (!document.getElementById('branchId').value) {
        alert('Please select a Branch');
        document.getElementById('searchBranchBtn').focus();
        return false;
    }
    
    // Client validation
    if (!document.getElementById('clientId').value) {
        alert('Please select a Client');
        document.getElementById('searchClientBtn').focus();
        return false;
    }
    
    // Account validation
    if (!document.getElementById('accountId').value) {
        alert('Please select an Account');
        document.getElementById('searchAccountBtn').focus();
        return false;
    }
    
    // Disbursement amount validation
    const disbursementAmount = parseFloat(document.getElementById('disbursementAmount').value);
    if (!disbursementAmount || disbursementAmount <= 0) {
        alert('Please enter a valid Disbursement Amount');
        document.getElementById('disbursementAmount').focus();
        return false;
    }
    
    // Mode of disbursement validation
    if (!document.getElementById('modeOfDisbursement').value) {
        alert('Please select a Mode of Disbursement');
        document.getElementById('modeOfDisbursement').focus();
        return false;
    }
    
    // Contra account validation for transfer mode
    if (document.getElementById('modeOfDisbursement').value === 'transfer') {
        if (!document.getElementById('contraAccountId').value) {
            alert('Please select a Contra Account for transfer disbursement');
            document.getElementById('searchContraAccountBtn').focus();
            return false;
        }
    }
    
    // Cheque validation for cheque mode
    if (document.getElementById('modeOfDisbursement').value === 'cheque') {
        if (!document.getElementById('chequeId').value) {
            alert('Please enter a Cheque ID for cheque disbursement');
            document.getElementById('chequeId').focus();
            return false;
        }
    }
    
    return true;
}

function clearForm() {
    // Clear main fields (keep branch)
    document.getElementById('clientId').value = '';
    document.getElementById('clientName').value = '';
    document.getElementById('accountId').value = '';
    document.getElementById('accountName').value = '';
    document.getElementById('loanSeries').value = '';
    
    // Clear disbursement fields
    document.getElementById('disbursementAmount').value = '';
    document.getElementById('deduction').value = '';
    document.getElementById('netDisbAmount').value = '';
    document.getElementById('contractPrinted').checked = false;
    
    // Clear disbursement details
    document.getElementById('modeOfDisbursement').value = '';
    document.getElementById('till').value = '';
    document.getElementById('contraBranchId').value = '';
    document.getElementById('contraBranchName').value = '';
    document.getElementById('accountType').value = 'customer';
    document.getElementById('contraAccountId').value = '';
    document.getElementById('contraAccountName').value = '';
    document.getElementById('chequeId').value = '';
    document.getElementById('referenceNo').value = '';
    document.getElementById('beneficiary').value = '';
    document.getElementById('netDisbAmountDetails').value = '';
    document.getElementById('exchangeRate').value = '1.00';
    document.getElementById('localAmount').value = '';
    document.getElementById('forexGainLoss').value = '';
    document.getElementById('narration').value = '';
    
    // Clear behind the scene
    document.getElementById('applicationId').value = '';
    document.getElementById('applicationDate').value = '';
    document.getElementById('productId').value = '';
    document.getElementById('currencyId').value = '';
    document.getElementById('loanAmount').value = '';
    document.getElementById('modeDisbursementType').value = '';
    document.getElementById('officerName').value = '';
    document.getElementById('loanType').value = '';
    
    console.log('Form cleared');
}

function loadSection(section) {
    if (!section) return;
    
    console.log('Loading section:', section);
    
    switch(section) {
        case 'denomination':
            alert('Denomination section to be implemented');
            break;
        case 'inst-schedule':
            alert('Installment Schedule section to be implemented');
            break;
        case 'disbursement-schedule':
            alert('Disbursement Schedule section to be implemented');
            break;
        case 'charges':
            alert('Charges section to be implemented');
            break;
        case 'print-contract':
            alert('Print Contract functionality to be implemented');
            break;
        default:
            console.log('Unknown section:', section);
    }
    
    // Reset dropdown
    document.getElementById('sectionSelector').value = '';
}

// Sample data loading (for testing)
function loadSampleData() {
    document.getElementById('clientId').value = 'C001';
    document.getElementById('clientName').value = 'John Doe';
    document.getElementById('accountId').value = 'LA001';
    document.getElementById('accountName').value = 'Personal Loan Account';
    document.getElementById('loanSeries').value = '1';
    document.getElementById('disbursementAmount').value = '50000.00';
    document.getElementById('deduction').value = '1000.00';
    document.getElementById('modeOfDisbursement').value = 'transfer';
    document.getElementById('accountType').value = 'customer';
    document.getElementById('exchangeRate').value = '1.00';
    document.getElementById('beneficiary').value = 'John Doe';
    document.getElementById('narration').value = 'Loan disbursement';
    
    // Behind the scene
    document.getElementById('applicationId').value = 'APP001';
    document.getElementById('applicationDate').value = '2026-01-10';
    document.getElementById('productId').value = 'PL001';
    document.getElementById('currencyId').value = 'KES';
    document.getElementById('loanAmount').value = '50000.00';
    document.getElementById('modeDisbursementType').value = 'Single';
    document.getElementById('officerName').value = 'Jane Smith';
    document.getElementById('loanType').value = 'Personal Loan';
    
    calculateNetDisbursement();
    calculateLocalAmount();
}

// Expose for testing in console
window.loadSampleData = loadSampleData;
