// New Branch Creation - Main JavaScript

// DOM Elements
const addBtn = document.getElementById('addBtn');
const createBtn = document.getElementById('createBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Search Buttons
const searchCurrencyBtn = document.getElementById('searchCurrencyBtn');
const searchBranchBtn = document.getElementById('searchBranchBtn');
const searchSourceBranchBtn = document.getElementById('searchSourceBranchBtn');

// Form Elements - Branch Details
const bankId = document.getElementById('bankId');
const bankName = document.getElementById('bankName');
const newBranchId = document.getElementById('newBranchId');
const branchPrefix = document.getElementById('branchPrefix');
const branchName = document.getElementById('branchName');
const shortName = document.getElementById('shortName');
const isHeadOffice = document.getElementById('isHeadOffice');
const isClearingCentre = document.getElementById('isClearingCentre');
const localCurrencyId = document.getElementById('localCurrencyId');
const address = document.getElementById('address');

// Form Elements - Location & Contact
const city = document.getElementById('city');
const country = document.getElementById('country');
const zipCode = document.getElementById('zipCode');
const emailId = document.getElementById('emailId');
const phone1 = document.getElementById('phone1');
const phone2 = document.getElementById('phone2');
const mobile = document.getElementById('mobile');
const faxNo = document.getElementById('faxNo');
const timeZoneDiff = document.getElementById('timeZoneDiff');

// Form Elements - Branch Configuration
const clearingDays = document.getElementById('clearingDays');
const reportingBranchId = document.getElementById('reportingBranchId');
const branchCashLimit = document.getElementById('branchCashLimit');
const largestAllowableTrxAmt = document.getElementById('largestAllowableTrxAmt');
const holidayProcessingTypeId = document.getElementById('holidayProcessingTypeId');

// Form Elements - Branch Status
const systemStartDate = document.getElementById('systemStartDate');
const sourceBranchId = document.getElementById('sourceBranchId');
const sourceBranchName = document.getElementById('sourceBranchName');

// Event Listeners
addBtn.addEventListener('click', addBranch);
createBtn.addEventListener('click', createBranch);
cancelBtn.addEventListener('click', resetForm);

// Search Button Listeners
searchCurrencyBtn.addEventListener('click', searchCurrency);
searchBranchBtn.addEventListener('click', searchReportingBranch);
searchSourceBranchBtn.addEventListener('click', searchSourceBranch);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    const today = new Date().toISOString().split('T')[0];
    systemStartDate.value = today;
    timeZoneDiff.value = '00.00';
});

function addBranch() {
    if (!validateForm()) return;

    showMessage('Branch details validated successfully. Ready to add.', 'success');
}

function createBranch() {
    if (!validateForm()) return;

    const branchData = {
        bankId: bankId.value,
        newBranchId: newBranchId.value.trim(),
        branchPrefix: branchPrefix.value.trim(),
        branchName: branchName.value.trim(),
        shortName: shortName.value.trim(),
        isHeadOffice: isHeadOffice.checked,
        isClearingCentre: isClearingCentre.checked,
        localCurrencyId: localCurrencyId.value.trim(),
        address: address.value.trim(),
        city: city.value,
        country: country.value,
        zipCode: zipCode.value.trim(),
        emailId: emailId.value.trim(),
        phone1: phone1.value.trim(),
        phone2: phone2.value.trim(),
        mobile: mobile.value.trim(),
        faxNo: faxNo.value.trim(),
        timeZoneDiff: timeZoneDiff.value,
        clearingDays: clearingDays.value,
        reportingBranchId: reportingBranchId.value.trim(),
        branchCashLimit: branchCashLimit.value,
        largestAllowableTrxAmt: largestAllowableTrxAmt.value,
        holidayProcessingTypeId: holidayProcessingTypeId.value,
        systemStartDate: systemStartDate.value,
        sourceBranchId: sourceBranchId.value
    };

    console.log('Creating branch:', branchData);
    showMessage(`Branch "${branchData.branchName}" created successfully!`, 'success');
    
    // Optionally reset form after creation
    setTimeout(() => {
        if (confirm('Branch created successfully! Would you like to create another branch?')) {
            resetForm();
        }
    }, 500);
}

function validateForm() {
    // Required field validation
    if (!newBranchId.value.trim()) {
        showMessage('New Branch ID is required', 'error');
        newBranchId.focus();
        return false;
    }

    if (!branchName.value.trim()) {
        showMessage('Branch Name is required', 'error');
        branchName.focus();
        return false;
    }

    // Email validation
    if (emailId.value.trim()) {
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailPattern.test(emailId.value.trim())) {
            showMessage('Please enter a valid email address', 'error');
            emailId.focus();
            return false;
        }
    }

    // Time zone format validation
    if (timeZoneDiff.value) {
        const timeZonePattern = /^\d{2}\.\d{2}$/;
        if (!timeZonePattern.test(timeZoneDiff.value)) {
            showMessage('Time Zone format should be hh.mm (e.g., 03.00)', 'error');
            timeZoneDiff.focus();
            return false;
        }
    }

    return true;
}

function searchCurrency() {
    // Currency search functionality - to be implemented with real data
    showMessage('Currency search feature - connect to backend', 'info');
}

function searchReportingBranch() {
    // Reporting branch search functionality - to be implemented with real data
    showMessage('Branch search feature - connect to backend', 'info');
}

function searchSourceBranch() {
    // Source branch search functionality - to be implemented with real data
    showMessage('Source branch search feature - connect to backend', 'info');
}

function resetForm() {
    // Reset all form fields except Bank ID and Bank Name
    newBranchId.value = '';
    branchPrefix.value = '';
    branchName.value = '';
    shortName.value = '';
    isHeadOffice.checked = false;
    isClearingCentre.checked = false;
    localCurrencyId.value = '';
    address.value = '';
    
    city.value = '';
    country.value = '';
    zipCode.value = '';
    emailId.value = '';
    phone1.value = '';
    phone2.value = '';
    mobile.value = '';
    faxNo.value = '';
    timeZoneDiff.value = '00.00';
    
    clearingDays.value = '';
    reportingBranchId.value = '';
    branchCashLimit.value = '';
    largestAllowableTrxAmt.value = '';
    holidayProcessingTypeId.value = '';
    
    const today = new Date().toISOString().split('T')[0];
    systemStartDate.value = today;
    sourceBranchId.value = '0101';
    sourceBranchName.value = 'Head Office';

    showMessage('Form reset successfully', 'info');
}

function showMessage(message, type) {
    // Simple alert for now - can be replaced with toast notifications
    const icon = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    alert(`${icon[type] || ''} ${message}`);
}

// Auto-generate branch prefix based on branch name
branchName.addEventListener('blur', () => {
    if (branchName.value.trim() && !branchPrefix.value.trim()) {
        const words = branchName.value.trim().split(' ');
        const prefix = words.map(word => word.charAt(0).toUpperCase()).join('');
        branchPrefix.value = prefix.substring(0, 4);
    }
});

// Auto-populate short name from branch name if not filled
branchName.addEventListener('blur', () => {
    if (branchName.value.trim() && !shortName.value.trim()) {
        shortName.value = branchName.value.trim().substring(0, 20);
    }
});
