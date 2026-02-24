// Group Loan Disbursement Module

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

// Load disbursement list
function loadDisbursementList() {
    const centerId = document.getElementById('centerId').value.trim();
    const groupId = document.getElementById('groupId').value.trim();
    const schemeId = document.getElementById('schemeId').value.trim();
    
    if (!centerId || !groupId || !schemeId) {
        return;
    }
    
    // Here you would make API call to fetch disbursement list
    const tableBody = document.getElementById('disbursementTableBody');
    tableBody.innerHTML = '<tr><td colspan="10" class="no-data">No records to display.</td></tr>';
}

// Calculate totals
function calculateTotals() {
    // This would calculate from the table data
    document.getElementById('totalDisbursementAmount').value = '';
    document.getElementById('totalDeduction').value = '';
    document.getElementById('totalNetAmount').value = '';
    document.getElementById('totalNetDisAmount').value = '';
    document.getElementById('noDisbursements').value = '0';
}

// Validate form
function validateForm() {
    const centerId = document.getElementById('centerId').value.trim();
    const groupId = document.getElementById('groupId').value.trim();
    const schemeId = document.getElementById('schemeId').value.trim();
    const disbursementMode = document.getElementById('disbursementMode').value;
    
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
    
    if (!disbursementMode) {
        alert('Please select Mode Of Disbursement');
        document.getElementById('disbursementMode').focus();
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
        loadDisbursementList();
    });
    
    // Deviate button
    document.getElementById('deviateBtn').addEventListener('click', function() {
        alert('Deviate functionality will be implemented');
    });
    
    // Add button
    document.getElementById('addBtn').addEventListener('click', function() {
        if (!validateForm()) {
            return;
        }
        alert('Add disbursement functionality will be implemented');
    });
    
    // Save button
    document.getElementById('saveBtn').addEventListener('click', function() {
        if (!validateForm()) {
            return;
        }
        
        if (confirm('Are you sure you want to save the group loan disbursement?')) {
            console.log('Saving group loan disbursement...');
            alert('Group loan disbursement saved successfully');
        }
    });
    
    // Sidebar action items using data-action attributes
    document.querySelectorAll('.sidebar-item[data-action]').forEach(item => {
        item.addEventListener('click', function() {
            const action = this.getAttribute('data-action');
            switch(action) {
                case 'charges':
                    alert('Charges functionality will be implemented');
                    break;
                case 'pending-disb':
                    alert('Pending Disbursement functionality will be implemented');
                    break;
                case 'denomination':
                    alert('Denomination functionality will be implemented');
                    break;
                case 'group-detail':
                    alert('Group Detail functionality will be implemented');
                    break;
                case 'client-image':
                    alert('Client Image functionality will be implemented');
                    break;
                case 'inst-schedule':
                    alert('Installment Schedule functionality will be implemented');
                    break;
                case 'print-contract':
                    alert('Print Contract functionality will be implemented');
                    break;
            }
        });
    });
    
    // Search button handlers
    document.querySelectorAll('.btn-search').forEach(btn => {
        btn.addEventListener('click', function() {
            alert('Search functionality will be implemented with lookup modal');
        });
    });
    
    // Center ID change
    document.getElementById('centerId').addEventListener('change', function() {
        calculateTotals();
    });
    
    // Group ID change
    document.getElementById('groupId').addEventListener('change', function() {
        calculateTotals();
    });
    
    // Scheme ID change
    document.getElementById('schemeId').addEventListener('change', function() {
        calculateTotals();
    });
});
