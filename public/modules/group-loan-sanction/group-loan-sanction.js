// Group Loan Sanction Module

// Close modal function
function closeModal() {
    const modalElement = document.querySelector('.modal');
    if (modalElement) {
        const modal = bootstrap.Modal.getInstance(modalElement);
        if (modal) {
            modal.hide();
        }
    }
}

// Load loan applications
function loadLoanApplications() {
    const centerId = document.getElementById('centerId').value.trim();
    const groupId = document.getElementById('groupId').value.trim();
    const schemeId = document.getElementById('schemeId').value.trim();
    
    if (!centerId || !groupId || !schemeId) {
        return;
    }
    
    // Here you would make API call to fetch loan applications
    const tableBody = document.getElementById('loanTableBody');
    tableBody.innerHTML = '<tr><td colspan="14" class="no-data">No records to display.</td></tr>';
}

// Validate form
function validateForm() {
    const centerId = document.getElementById('centerId').value.trim();
    const groupId = document.getElementById('groupId').value.trim();
    const schemeId = document.getElementById('schemeId').value.trim();
    const approvedBy = document.getElementById('approvedBy').value.trim();
    
    if (!centerId) {
        alert('Please enter Center ID');
        document.getElementById('centerId').focus();
        return false;
    }
    
    if (!groupId) {
        alert('Please enter Group ID');
        document.getElementById('groupId').focus();
        return false;
    }
    
    if (!schemeId) {
        alert('Please enter Scheme ID');
        document.getElementById('schemeId').focus();
        return false;
    }
    
    if (!approvedBy) {
        alert('Please enter Approved By');
        document.getElementById('approvedBy').focus();
        return false;
    }
    
    return true;
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // View button
    document.getElementById('viewBtn').addEventListener('click', function() {
        if (!validateForm()) {
            return;
        }
        loadLoanApplications();
    });
    
    // Deviate button
    document.getElementById('deviateBtn').addEventListener('click', function() {
        alert('Deviate functionality will be implemented');
    });
    
    // Sanction button
    document.getElementById('sanctionBtn').addEventListener('click', function() {
        if (!validateForm()) {
            return;
        }
        
        if (confirm('Are you sure you want to sanction these group loan applications?')) {
            console.log('Sanctioning group loan applications...');
            alert('Group loan applications sanctioned successfully');
        }
    });
    
    // Cancel button
    document.getElementById('cancelBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            closeModal();
        }
    });
    
    // Charges button
    document.getElementById('chargesBtn').addEventListener('click', function() {
        alert('Charges functionality will be implemented');
    });
    
    // Group Detail button
    document.getElementById('groupDetailBtn').addEventListener('click', function() {
        alert('Group Detail functionality will be implemented');
    });
    
    // Sign/Photo button
    document.getElementById('signPhotoBtn').addEventListener('click', function() {
        alert('Sign/Photo functionality will be implemented');
    });
    
    // Search button handlers
    document.querySelectorAll('.btn-search').forEach(btn => {
        btn.addEventListener('click', function() {
            alert('Search functionality will be implemented with lookup modal');
        });
    });
});
