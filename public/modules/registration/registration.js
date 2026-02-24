// Registration - Main JavaScript

// DOM Elements
const registerBtn = document.getElementById('registerBtn');
const cancelBtn = document.getElementById('cancelBtn');
const browseBtn = document.getElementById('browseBtn');

// Form Elements
const licenceTo = document.getElementById('licenceTo');
const branchLicenses = document.getElementById('branchLicenses');
const userLicenses = document.getElementById('userLicenses');
const address = document.getElementById('address');
const city = document.getElementById('city');
const country = document.getElementById('country');
const contactPerson = document.getElementById('contactPerson');
const emailId = document.getElementById('emailId');
const telephoneNo = document.getElementById('telephoneNo');
const registerFilePath = document.getElementById('registerFilePath');

// Event Listeners
registerBtn.addEventListener('click', registerProduct);
cancelBtn.addEventListener('click', resetForm);
browseBtn.addEventListener('click', browseFile);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    // Form is ready
});

function registerProduct() {
    // Validate required fields
    if (!licenceTo.value.trim()) {
        showMessage('Please enter the licence organization name', 'warning');
        licenceTo.focus();
        return;
    }

    // Validate email if provided
    if (emailId.value.trim() && !validateEmail(emailId.value)) {
        showMessage('Please enter a valid email address', 'warning');
        emailId.focus();
        return;
    }

    // Collect registration data
    const registrationData = {
        licenceTo: licenceTo.value.trim(),
        branchLicenses: branchLicenses.value.trim(),
        userLicenses: userLicenses.value.trim(),
        address: address.value.trim(),
        city: city.value.trim(),
        country: country.value.trim(),
        contactPerson: contactPerson.value.trim(),
        emailId: emailId.value.trim(),
        telephoneNo: telephoneNo.value.trim(),
        registerFilePath: registerFilePath.value.trim()
    };

    // Confirmation
    if (confirm(`Register product for:\n${registrationData.licenceTo}?\n\nBranch Licenses: ${registrationData.branchLicenses || 'Not specified'}\nUser Licenses: ${registrationData.userLicenses || 'Not specified'}`)) {
        // In a real application, this would send data to backend
        console.log('Registration Data:', registrationData);
        showMessage('Product registration submitted successfully', 'success');
        
        // Reset form after successful registration
        setTimeout(() => {
            resetForm();
        }, 1500);
    }
}

function resetForm() {
    // Clear all fields
    licenceTo.value = '';
    branchLicenses.value = '';
    userLicenses.value = '';
    address.value = '';
    city.value = '';
    country.value = '';
    contactPerson.value = '';
    emailId.value = '';
    telephoneNo.value = '';
    registerFilePath.value = '';
    
    showMessage('Form reset successfully', 'info');
}

function browseFile() {
    // In a real application, this would open a file picker dialog
    // For now, we'll simulate it
    showMessage('File browser feature - connect to backend file system', 'info');
    
    // Simulate file selection (would be replaced with actual file picker)
    // const input = document.createElement('input');
    // input.type = 'file';
    // input.accept = '.lic,.key,.reg';
    // input.onchange = (e) => {
    //     const file = e.target.files[0];
    //     if (file) {
    //         registerFilePath.value = file.name;
    //     }
    // };
    // input.click();
}

function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
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
