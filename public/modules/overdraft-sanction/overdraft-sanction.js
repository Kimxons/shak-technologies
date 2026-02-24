// Overdraft Sanction - Main JavaScript

// DOM Elements - Buttons
const viewBtn = document.getElementById('viewBtn');
const editBtn = document.getElementById('editBtn');
const saveBtn = document.getElementById('saveBtn');
const sanctionBtn = document.getElementById('sanctionBtn');
const rejectBtn = document.getElementById('rejectBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Search Buttons
const searchBranchBtn = document.getElementById('searchBranchBtn');
const searchAccountBtn = document.getElementById('searchAccountBtn');
const searchApplicationBtn = document.getElementById('searchApplicationBtn');
const searchClientBtn = document.getElementById('searchClientBtn');
const searchProductBtn = document.getElementById('searchProductBtn');
const searchOfficerBtn = document.getElementById('searchOfficerBtn');

// Sidebar Menu Items
const menuItems = document.querySelectorAll('.menu-item');

// Form Elements - Account Identification
const overdraftType = document.getElementById('overdraftType');
const branchId = document.getElementById('branchId');
const branchName = document.getElementById('branchName');
const accountId = document.getElementById('accountId');
const applicationId = document.getElementById('applicationId');

// Application Details
const clientId = document.getElementById('clientId');
const clientName = document.getElementById('clientName');
const product = document.getElementById('product');
const productName = document.getElementById('productName');
const overdraftPurpose = document.getElementById('overdraftPurpose');
const lineOfBusiness = document.getElementById('lineOfBusiness');
const creditOfficer = document.getElementById('creditOfficer');
const officerName = document.getElementById('officerName');
const appliedAmount = document.getElementById('appliedAmount');
const applicationDate = document.getElementById('applicationDate');
const expiryDate = document.getElementById('expiryDate');
const reviewDate = document.getElementById('reviewDate');
const status = document.getElementById('status');
const fileId = document.getElementById('fileId');
const remarks = document.getElementById('remarks');

// Client Details
const limitId = document.getElementById('limitId');
const limitAmount = document.getElementById('limitAmount');
const limitExpiryDate = document.getElementById('limitExpiryDate');
const totalOdAmount = document.getElementById('totalOdAmount');
const totalTodAmount = document.getElementById('totalTodAmount');

// Audit Fields
const createdBy = document.getElementById('createdBy');
const modifiedBy = document.getElementById('modifiedBy');
const supervisedBy = document.getElementById('supervisedBy');
const createdOn = document.getElementById('createdOn');
const modifiedOn = document.getElementById('modifiedOn');
const supervisedOn = document.getElementById('supervisedOn');

// State
let isEditMode = false;
let currentSanction = null;
let activeSection = 'dataentry';

// Event Listeners
viewBtn.addEventListener('click', viewSanction);
editBtn.addEventListener('click', enableEdit);
saveBtn.addEventListener('click', saveSanction);
sanctionBtn.addEventListener('click', sanctionApplication);
rejectBtn.addEventListener('click', rejectApplication);
cancelBtn.addEventListener('click', cancelOperation);

// Note: searchBranchBtn uses onclick in HTML to call openBranchSearch()
searchAccountBtn.addEventListener('click', searchAccount);
searchApplicationBtn.addEventListener('click', searchApplication);
searchClientBtn.addEventListener('click', searchClient);
searchProductBtn.addEventListener('click', searchProduct);
searchOfficerBtn.addEventListener('click', searchOfficer);

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

function loadSection(section) {
    console.log('Loading section:', section);
    // In a real application, this would load section-specific data
    // Interest Rates section could open a modal similar to overdraft maintenance
}

function viewSanction() {
    if (!applicationId.value.trim()) {
        showMessage('Please enter Application ID to view sanction', 'warning');
        return;
    }
    
    showMessage('View sanction feature - connect to backend to load application data', 'info');
}

function enableEdit() {
    if (!applicationId.value.trim()) {
        showMessage('Please enter Application ID to edit', 'warning');
        return;
    }

    isEditMode = true;
    enableFormFields();
    
    viewBtn.disabled = true;
    editBtn.disabled = true;
    sanctionBtn.disabled = true;
    rejectBtn.disabled = true;
    saveBtn.disabled = false;
    
    showMessage('Edit mode enabled', 'info');
}

function disableEdit() {
    isEditMode = false;
    
    // Disable form fields
    overdraftType.disabled = true;
    branchId.disabled = true;
    accountId.disabled = true;
    applicationId.disabled = true;
    clientId.disabled = true;
    product.disabled = true;
    overdraftPurpose.disabled = true;
    lineOfBusiness.disabled = true;
    creditOfficer.disabled = true;
    appliedAmount.disabled = true;
    applicationDate.disabled = true;
    expiryDate.disabled = true;
    reviewDate.disabled = true;
    status.disabled = true;
    fileId.disabled = true;
    remarks.disabled = true;
    limitId.disabled = true;
    limitAmount.disabled = true;
    limitExpiryDate.disabled = true;
    
    viewBtn.disabled = false;
    editBtn.disabled = false;
    sanctionBtn.disabled = false;
    rejectBtn.disabled = false;
    saveBtn.disabled = true;
}

function enableFormFields() {
    overdraftType.disabled = false;
    branchId.disabled = false;
    accountId.disabled = false;
    applicationId.disabled = false;
    clientId.disabled = false;
    product.disabled = false;
    overdraftPurpose.disabled = false;
    lineOfBusiness.disabled = false;
    creditOfficer.disabled = false;
    appliedAmount.disabled = false;
    applicationDate.disabled = false;
    expiryDate.disabled = false;
    reviewDate.disabled = false;
    status.disabled = false;
    fileId.disabled = false;
    remarks.disabled = false;
    limitId.disabled = false;
    limitAmount.disabled = false;
    limitExpiryDate.disabled = false;
}

function saveSanction() {
    // Validate required fields
    if (!applicationId.value.trim()) {
        showMessage('Please enter Application ID', 'error');
        applicationId.focus();
        return;
    }

    if (!clientId.value.trim()) {
        showMessage('Please enter Client ID', 'error');
        clientId.focus();
        return;
    }

    if (!appliedAmount.value) {
        showMessage('Please enter Applied Amount', 'error');
        appliedAmount.focus();
        return;
    }

    // Save sanction data
    currentSanction = {
        overdraftType: overdraftType.value,
        branchId: branchId.value,
        branchName: branchName.value,
        accountId: accountId.value,
        applicationId: applicationId.value,
        clientId: clientId.value,
        product: product.value,
        overdraftPurpose: overdraftPurpose.value,
        lineOfBusiness: lineOfBusiness.value,
        creditOfficer: creditOfficer.value,
        appliedAmount: parseFloat(appliedAmount.value),
        applicationDate: applicationDate.value,
        expiryDate: expiryDate.value,
        reviewDate: reviewDate.value,
        status: status.value,
        fileId: fileId.value,
        remarks: remarks.value,
        limitId: limitId.value,
        limitAmount: parseFloat(limitAmount.value) || 0,
        limitExpiryDate: limitExpiryDate.value,
        totalOdAmount: parseFloat(totalOdAmount.value) || 0,
        totalTodAmount: parseFloat(totalTodAmount.value) || 0
    };

    // Update audit fields (simulated)
    if (!createdBy.value) {
        createdBy.value = 'Admin';
        createdOn.value = new Date().toLocaleString();
    }
    modifiedBy.value = 'Admin';
    modifiedOn.value = new Date().toLocaleString();

    showMessage('Sanction saved successfully', 'success');
    disableEdit();
}

function sanctionApplication() {
    if (!applicationId.value.trim()) {
        showMessage('Please enter Application ID to sanction', 'warning');
        return;
    }

    if (confirm('Are you sure you want to sanction this overdraft application?')) {
        // Update status
        status.value = 'sanctioned';
        supervisedBy.value = 'Admin';
        supervisedOn.value = new Date().toLocaleString();
        
        showMessage('Application sanctioned successfully', 'success');
    }
}

function rejectApplication() {
    if (!applicationId.value.trim()) {
        showMessage('Please enter Application ID to reject', 'warning');
        return;
    }

    const reason = prompt('Please enter reason for rejection:');
    if (reason) {
        // Update status
        status.value = 'rejected';
        remarks.value = remarks.value ? remarks.value + '\nRejection Reason: ' + reason : 'Rejection Reason: ' + reason;
        supervisedBy.value = 'Admin';
        supervisedOn.value = new Date().toLocaleString();
        
        showMessage('Application rejected', 'success');
    }
}

function cancelOperation() {
    if (isEditMode) {
        if (confirm('Discard changes?')) {
            disableEdit();
            if (currentSanction) {
                loadSanctionData(currentSanction);
            }
        }
    } else {
        if (confirm('Clear form?')) {
            clearForm();
        }
    }
}

function searchBranch() {
    if (!branchId.value.trim()) {
        showMessage('Please enter Branch ID', 'warning');
        return;
    }
    showMessage('Branch search feature - connect to backend', 'info');
}

function searchAccount() {
    if (!accountId.value.trim()) {
        showMessage('Please enter Account ID', 'warning');
        return;
    }
    showMessage('Account search feature - connect to backend', 'info');
}

function searchApplication() {
    if (!applicationId.value.trim()) {
        showMessage('Please enter Application ID', 'warning');
        return;
    }
    showMessage('Application search feature - connect to backend', 'info');
}

function searchClient() {
    if (!clientId.value.trim()) {
        showMessage('Please enter Client ID', 'warning');
        return;
    }
    showMessage('Client search feature - connect to backend', 'info');
}

function searchProduct() {
    if (!product.value.trim()) {
        showMessage('Please enter Product', 'warning');
        return;
    }
    showMessage('Product search feature - connect to backend', 'info');
}

function searchOfficer() {
    if (!creditOfficer.value.trim()) {
        showMessage('Please enter Credit Officer', 'warning');
        return;
    }
    showMessage('Officer search feature - connect to backend', 'info');
}

function loadSanctionData(data) {
    overdraftType.value = data.overdraftType;
    branchId.value = data.branchId;
    branchName.value = data.branchName;
    accountId.value = data.accountId;
    applicationId.value = data.applicationId;
    clientId.value = data.clientId;
    product.value = data.product;
    overdraftPurpose.value = data.overdraftPurpose;
    lineOfBusiness.value = data.lineOfBusiness;
    creditOfficer.value = data.creditOfficer;
    appliedAmount.value = data.appliedAmount;
    applicationDate.value = data.applicationDate;
    expiryDate.value = data.expiryDate;
    reviewDate.value = data.reviewDate;
    status.value = data.status;
    fileId.value = data.fileId;
    remarks.value = data.remarks;
    limitId.value = data.limitId;
    limitAmount.value = data.limitAmount;
    limitExpiryDate.value = data.limitExpiryDate;
    totalOdAmount.value = data.totalOdAmount;
    totalTodAmount.value = data.totalTodAmount;
}

function clearForm() {
    overdraftType.value = '';
    branchId.value = '';
    branchName.value = '';
    accountId.value = '';
    applicationId.value = '';
    clientId.value = '';
    product.value = '';
    overdraftPurpose.value = '';
    lineOfBusiness.value = '';
    creditOfficer.value = '';
    appliedAmount.value = '';
    applicationDate.value = '';
    expiryDate.value = '0001-01-01';
    reviewDate.value = '0001-01-01';
    status.value = '';
    fileId.value = '';
    remarks.value = '';
    limitId.value = '';
    limitAmount.value = '';
    limitExpiryDate.value = '0001-01-01';
    totalOdAmount.value = '';
    totalTodAmount.value = '';
    createdBy.value = '';
    modifiedBy.value = '';
    supervisedBy.value = '';
    createdOn.value = '';
    modifiedOn.value = '';
    supervisedOn.value = '';
    
    currentSanction = null;
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

// Branch Search Modal Functions
function openBranchSearch() {
    const modal = new bootstrap.Modal(document.getElementById('branchSearchModal'));
    modal.show();
}

function closeBranchSearchModal() {
    const modalElement = document.getElementById('branchSearchModal');
    const modal = bootstrap.Modal.getInstance(modalElement);
    if (modal) {
        modal.hide();
    }
}

function setBranchFromSearch(branch) {
    if (branch) {
        branchId.value = branch.branchId;
        branchName.value = branch.branchName;
    }
}

