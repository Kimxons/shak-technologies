// Refinance - Initiation JavaScript
document.addEventListener('DOMContentLoaded', function() {
    initializeRefinance();
    attachEventListeners();
});

function initializeRefinance() {
    // Set default application type
    document.getElementById('applicationType').value = 'refinance';
    
    // Initialize calculations
    calculateNewLoan();
    
    console.log('Refinance - Initiation initialized');
}

function attachEventListeners() {
    // Search buttons
    document.getElementById('searchBranchBtn')?.addEventListener('click', () => searchBranch());
    document.getElementById('searchClientBtn')?.addEventListener('click', () => searchClient());
    document.getElementById('searchAccountBtn')?.addEventListener('click', () => searchAccount());
    
    // Select all checkbox
    document.getElementById('selectAll')?.addEventListener('change', function() {
        const checkboxes = document.querySelectorAll('#existingLoansTable tbody input[type="checkbox"]');
        checkboxes.forEach(cb => cb.checked = this.checked);
        calculateNewLoan();
    });
    
    // Calculation fields
    document.getElementById('additionalAmount')?.addEventListener('input', calculateNewLoan);
    document.getElementById('roundingAmount')?.addEventListener('input', calculateNewLoan);
    
    // Action buttons
    document.getElementById('printBtn')?.addEventListener('click', printRefinance);
    document.getElementById('viewBtn')?.addEventListener('click', viewRefinance);
    document.getElementById('addBtn')?.addEventListener('click', addRefinance);
    document.getElementById('editBtn')?.addEventListener('click', editRefinance);
    document.getElementById('deleteBtn')?.addEventListener('click', deleteRefinance);
    document.getElementById('saveBtn')?.addEventListener('click', saveRefinance);
    document.getElementById('cancelBtn')?.addEventListener('click', cancelRefinance);
    
    // Section selector
    document.getElementById('sectionSelector')?.addEventListener('change', function() {
        loadSection(this.value);
    });
}

// Calculation Functions
function calculateNewLoan() {
    const osBalance = parseFloat(document.getElementById('osLoanBalance')?.value) || 0;
    const additionalAmount = parseFloat(document.getElementById('additionalAmount')?.value) || 0;
    const roundingAmount = parseFloat(document.getElementById('roundingAmount')?.value) || 0;
    
    const newLoan = osBalance + additionalAmount + roundingAmount;
    document.getElementById('newLoan').value = newLoan.toFixed(2);
}

function calculateOSBalance() {
    // Get selected loans from table
    const selectedLoans = [];
    const checkboxes = document.querySelectorAll('#existingLoansTable tbody input[type="checkbox"]:checked');
    
    let totalOS = 0;
    checkboxes.forEach(checkbox => {
        const row = checkbox.closest('tr');
        const loanAmount = parseFloat(row.cells[2]?.textContent) || 0;
        totalOS += loanAmount;
    });
    
    document.getElementById('osLoanBalance').value = totalOS.toFixed(2);
    calculateNewLoan();
}

// Search Functions
function searchBranch() {
    console.log('Search branch...');
    alert('Branch search functionality to be implemented');
}

function searchClient() {
    console.log('Search client...');
    alert('Client search functionality to be implemented');
    // After selecting client, load their existing loans
    // loadExistingLoans();
}

function searchAccount() {
    console.log('Search account...');
    alert('Account search functionality to be implemented');
    // After selecting account, load loan details
    // loadLoanDetails();
}

// Data Loading Functions
function loadExistingLoans() {
    // TODO: Fetch existing loans from API
    const sampleLoans = [
        { accountId: 'LA001', loanAmount: 50000, loanSeries: '1' },
        { accountId: 'LA002', loanAmount: 30000, loanSeries: '1' }
    ];
    
    renderExistingLoans(sampleLoans);
}

function renderExistingLoans(loans) {
    const tbody = document.querySelector('#existingLoansTable tbody');
    tbody.innerHTML = '';
    
    if (loans.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="text-center">No records to display.</td></tr>';
        return;
    }
    
    loans.forEach((loan, index) => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td><input type="checkbox" class="form-checkbox" data-index="${index}"></td>
            <td>${loan.accountId}</td>
            <td>${loan.loanAmount.toFixed(2)}</td>
            <td>${loan.loanSeries}</td>
        `;
        
        // Add event listener to checkbox
        row.querySelector('input[type="checkbox"]').addEventListener('change', calculateOSBalance);
    });
}

function loadComponentBreakdown() {
    // TODO: Fetch component breakdown from API
    const sampleComponents = [
        { accountId: 'LA001', component: 'Principal', actualAmount: 45000 },
        { accountId: 'LA001', component: 'Interest', actualAmount: 5000 }
    ];
    
    renderComponentBreakdown(sampleComponents);
}

function renderComponentBreakdown(components) {
    const tbody = document.querySelector('#componentTable tbody');
    tbody.innerHTML = '';
    
    if (components.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="text-center">No records to display.</td></tr>';
        return;
    }
    
    components.forEach(component => {
        const row = tbody.insertRow();
        row.innerHTML = `
            <td>${component.accountId}</td>
            <td>${component.component}</td>
            <td>${component.actualAmount.toFixed(2)}</td>
        `;
    });
}

function loadLoanDetails() {
    // Load behind the scene data
    const sampleData = {
        loanAmount: 50000,
        outstandingPrincipal: 45000,
        totalTerm: 24,
        productId: 'PL001',
        overduePrincipal: 0,
        balanceTerm: 12,
        maturityDate: '2027-01-12',
        installmentAmount: 2500,
        refinanceStatus: 'Pending',
        applicationId: 'APP001',
        applicationStatus: 'Draft'
    };
    
    populateBehindTheScene(sampleData);
}

function populateBehindTheScene(data) {
    document.getElementById('loanAmount').value = data.loanAmount || '';
    document.getElementById('outstandingPrincipal').value = data.outstandingPrincipal || '';
    document.getElementById('totalTerm').value = data.totalTerm || '';
    document.getElementById('productId').value = data.productId || '';
    document.getElementById('overduePrincipal').value = data.overduePrincipal || '';
    document.getElementById('balanceTerm').value = data.balanceTerm || '';
    document.getElementById('maturityDate').value = data.maturityDate || '';
    document.getElementById('installmentAmount').value = data.installmentAmount || '';
    document.getElementById('refinanceStatus').value = data.refinanceStatus || '';
    document.getElementById('applicationId').value = data.applicationId || '';
    document.getElementById('applicationStatus').value = data.applicationStatus || '';
    
    // Also set O/S Loan Balance
    document.getElementById('osLoanBalance').value = data.outstandingPrincipal || '';
}

// Action Functions
function printRefinance() {
    console.log('Print refinance...');
    alert('Print functionality to be implemented');
}

function viewRefinance() {
    console.log('View refinance...');
    alert('View functionality to be implemented');
}

function addRefinance() {
    console.log('Add new refinance...');
    clearForm();
}

function editRefinance() {
    console.log('Edit refinance...');
    alert('Edit functionality to be implemented');
}

function deleteRefinance() {
    if (confirm('Are you sure you want to delete this refinance application?')) {
        console.log('Delete refinance...');
        alert('Delete functionality to be implemented');
    }
}

function saveRefinance() {
    if (!validateForm()) {
        return;
    }
    
    const refinanceData = {
        branchId: document.getElementById('branchId').value,
        clientId: document.getElementById('clientId').value,
        accountId: document.getElementById('accountId').value,
        loanSeries: document.getElementById('loanSeries').value,
        applicationType: document.getElementById('applicationType').value,
        additionalAmount: parseFloat(document.getElementById('additionalAmount').value) || 0,
        newLoan: parseFloat(document.getElementById('newLoan').value) || 0,
        roundingAmount: parseFloat(document.getElementById('roundingAmount').value) || 0,
        proposedTerm: parseInt(document.getElementById('proposedTerm').value) || 0,
        interestRate: parseFloat(document.getElementById('interestRate').value) || 0,
        loanPurpose: document.getElementById('loanPurpose').value,
        expectedDisbursementDate: document.getElementById('expectedDisbursementDate').value,
        installmentStartDate: document.getElementById('installmentStartDate').value,
        osLoanBalance: parseFloat(document.getElementById('osLoanBalance').value) || 0
    };
    
    console.log('Saving refinance data:', refinanceData);
    
    // TODO: Send to API
    alert('Refinance application saved successfully!\n(API integration pending)');
}

function cancelRefinance() {
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
    
    // Application type validation
    if (!document.getElementById('applicationType').value) {
        alert('Please select an Application Type');
        document.getElementById('applicationType').focus();
        return false;
    }
    
    // New loan validation
    const newLoan = parseFloat(document.getElementById('newLoan').value);
    if (!newLoan || newLoan <= 0) {
        alert('New Loan amount must be greater than zero');
        document.getElementById('additionalAmount').focus();
        return false;
    }
    
    // Proposed term validation
    const proposedTerm = parseInt(document.getElementById('proposedTerm').value);
    if (!proposedTerm || proposedTerm <= 0) {
        alert('Please enter a valid Proposed Term');
        document.getElementById('proposedTerm').focus();
        return false;
    }
    
    // Interest rate validation
    const interestRate = parseFloat(document.getElementById('interestRate').value);
    if (!interestRate || interestRate <= 0) {
        alert('Please enter a valid Interest Rate');
        document.getElementById('interestRate').focus();
        return false;
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
    document.getElementById('applicationType').value = 'refinance';
    
    // Clear refinance details
    document.getElementById('additionalAmount').value = '';
    document.getElementById('newLoan').value = '';
    document.getElementById('roundingAmount').value = '';
    document.getElementById('proposedTerm').value = '';
    document.getElementById('interestRate').value = '';
    document.getElementById('loanPurpose').value = '';
    document.getElementById('expectedDisbursementDate').value = '';
    document.getElementById('installmentStartDate').value = '';
    document.getElementById('osLoanBalance').value = '';
    
    // Clear tables
    const loansTableBody = document.querySelector('#existingLoansTable tbody');
    loansTableBody.innerHTML = '<tr><td colspan="4" class="text-center">No records to display.</td></tr>';
    
    const componentTableBody = document.querySelector('#componentTable tbody');
    componentTableBody.innerHTML = '<tr><td colspan="3" class="text-center">No records to display.</td></tr>';
    
    // Clear behind the scene
    document.getElementById('loanAmount').value = '';
    document.getElementById('outstandingPrincipal').value = '';
    document.getElementById('totalTerm').value = '';
    document.getElementById('productId').value = '';
    document.getElementById('overduePrincipal').value = '';
    document.getElementById('balanceTerm').value = '';
    document.getElementById('maturityDate').value = '';
    document.getElementById('installmentAmount').value = '';
    document.getElementById('refinanceStatus').value = '';
    document.getElementById('applicationId').value = '';
    document.getElementById('applicationStatus').value = '';
    
    console.log('Form cleared');
}

function loadSection(section) {
    if (!section) return;
    
    console.log('Loading section:', section);
    
    switch(section) {
        case 'schedule':
            alert('Schedule section to be implemented');
            break;
        case 'payment':
            alert('Payment section to be implemented');
            break;
        case 'new-schedule':
            alert('New Schedule section to be implemented');
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
    document.getElementById('additionalAmount').value = '10000';
    document.getElementById('proposedTerm').value = '24';
    document.getElementById('interestRate').value = '12.5';
    document.getElementById('loanPurpose').value = 'business';
    
    loadExistingLoans();
    loadComponentBreakdown();
    loadLoanDetails();
    
    calculateNewLoan();
}

// Expose for testing in console
window.loadSampleData = loadSampleData;
