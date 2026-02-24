// Group Loan Appraisal Module

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

// Load applications
function loadApplications() {
    const centerId = document.getElementById('centerId').value.trim();
    const groupId = document.getElementById('groupId').value.trim();
    const schemeId = document.getElementById('schemeId').value.trim();
    
    if (!centerId || !groupId || !schemeId) {
        return;
    }
    
    // Here you would make API call to fetch applications
    const tableBody = document.getElementById('applicationTableBody');
    tableBody.innerHTML = '<tr><td colspan="9" class="no-data">No records to display.</td></tr>';
}

// Validate form
function validateForm() {
    const centerId = document.getElementById('centerId').value.trim();
    const groupId = document.getElementById('groupId').value.trim();
    const schemeId = document.getElementById('schemeId').value.trim();
    
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
    
    return true;
}

// Clear recommendation fields
function clearRecommendation() {
    document.getElementById('recommendedAmount').value = '';
    document.getElementById('recommendedTerm').value = '';
    document.getElementById('recommendedGracePeriod').value = '';
    document.getElementById('repaymentFrequency').selectedIndex = 0;
    document.getElementById('interestRate').value = '';
    document.getElementById('repaymentTerm').value = '';
    document.getElementById('remarks').value = '';
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // View button
    document.getElementById('viewBtn').addEventListener('click', function() {
        if (!validateForm()) {
            return;
        }
        loadApplications();
    });
    
    // Edit button
    document.getElementById('editBtn').addEventListener('click', function() {
        alert('Edit functionality will be implemented');
    });
    
    // Save button
    document.getElementById('saveBtn').addEventListener('click', function() {
        if (!validateForm()) {
            return;
        }
        
        const recommendedAmount = document.getElementById('recommendedAmount').value.trim();
        const recommendedTerm = document.getElementById('recommendedTerm').value.trim();
        
        if (!recommendedAmount) {
            alert('Please enter Recommended Amount');
            document.getElementById('recommendedAmount').focus();
            return;
        }
        
        if (!recommendedTerm) {
            alert('Please enter Recommended Term');
            document.getElementById('recommendedTerm').focus();
            return;
        }
        
        if (confirm('Are you sure you want to save the appraisal?')) {
            console.log('Saving appraisal...');
            alert('Appraisal saved successfully');
        }
    });
    
    // Cancel button
    document.getElementById('cancelBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            closeModal();
        }
    });
    
    // Update button
    document.getElementById('updateBtn').addEventListener('click', function() {
        const recommendedAmount = document.getElementById('recommendedAmount').value.trim();
        const recommendedTerm = document.getElementById('recommendedTerm').value.trim();
        
        if (!recommendedAmount || !recommendedTerm) {
            alert('Please fill in at least Recommended Amount and Term');
            return;
        }
        
        alert('Recommendation updated');
    });
    
    // Clear button
    document.getElementById('clearBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to clear the recommendation details?')) {
            clearRecommendation();
        }
    });
    
    // Image button
    document.getElementById('imageBtn').addEventListener('click', function() {
        alert('Image functionality will be implemented');
    });
    
    // Group Detail button
    document.getElementById('groupDetailBtn').addEventListener('click', function() {
        alert('Group Detail functionality will be implemented');
    });
    
    // Search button handlers
    document.querySelectorAll('.btn-search').forEach(btn => {
        btn.addEventListener('click', function() {
            alert('Search functionality will be implemented with lookup modal');
        });
    });
});
