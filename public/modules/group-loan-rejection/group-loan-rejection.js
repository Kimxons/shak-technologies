// Group Loan Application Rejection Module

// Sample data for testing
const sampleApplications = [
    {
        clientId: "CL001",
        clientName: "Jane Doe",
        applicationId: "GLA2026001",
        applicationDate: "2026-01-10",
        currencyId: "KES",
        loanAmount: "500,000.00",
        loanTerm: "12",
        frequency: "Monthly",
        workflowStage: "Pending Approval",
        applicationStatus: "Active",
        loanType: "Group Loan"
    },
    {
        clientId: "CL002",
        clientName: "John Smith",
        applicationId: "GLA2026002",
        applicationDate: "2026-01-10",
        currencyId: "KES",
        loanAmount: "350,000.00",
        loanTerm: "12",
        frequency: "Monthly",
        workflowStage: "Pending Approval",
        applicationStatus: "Active",
        loanType: "Group Loan"
    }
];

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

// Load applications into table
function loadApplications() {
    const centerId = document.getElementById('centerId').value.trim();
    const schemeId = document.getElementById('schemeId').value.trim();
    
    if (!centerId || !schemeId) {
        return;
    }
    
    const tableBody = document.getElementById('applicationTableBody');
    tableBody.innerHTML = '';
    
    if (sampleApplications.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="11" class="no-data">No records to display.</td></tr>';
        return;
    }
    
    sampleApplications.forEach(app => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${app.clientId}</td>
            <td>${app.clientName}</td>
            <td>${app.applicationId}</td>
            <td>${app.applicationDate}</td>
            <td>${app.currencyId}</td>
            <td class="text-end">${app.loanAmount}</td>
            <td class="text-center">${app.loanTerm}</td>
            <td>${app.frequency}</td>
            <td>${app.workflowStage}</td>
            <td>${app.applicationStatus}</td>
            <td>${app.loanType}</td>
        `;
        tableBody.appendChild(row);
    });
}

// Get selected rejection reasons
function getSelectedReasons() {
    const checkboxes = document.querySelectorAll('.form-check-input[id^="reason"]');
    const selectedReasons = [];
    
    checkboxes.forEach(checkbox => {
        if (checkbox.checked) {
            selectedReasons.push(checkbox.value);
        }
    });
    
    return selectedReasons;
}

// Validate form
function validateForm() {
    const centerId = document.getElementById('centerId').value.trim();
    const schemeId = document.getElementById('schemeId').value.trim();
    
    if (!centerId) {
        alert('Please enter Center ID');
        document.getElementById('centerId').focus();
        return false;
    }
    
    if (!schemeId) {
        alert('Please enter Scheme ID');
        document.getElementById('schemeId').focus();
        return false;
    }
    
    const selectedReasons = getSelectedReasons();
    if (selectedReasons.length === 0) {
        alert('Please select at least one rejection reason');
        return false;
    }
    
    return true;
}

// Initialize event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Center ID change event
    document.getElementById('centerId').addEventListener('change', function() {
        loadApplications();
    });
    
    // Scheme ID change event
    document.getElementById('schemeId').addEventListener('change', function() {
        loadApplications();
    });
    
    // View button
    document.getElementById('viewBtn').addEventListener('click', function() {
        const centerId = document.getElementById('centerId').value.trim();
        const schemeId = document.getElementById('schemeId').value.trim();
        
        if (!centerId || !schemeId) {
            alert('Please enter Center ID and Scheme ID first');
            return;
        }
        
        loadApplications();
    });
    
    // Reject button
    document.getElementById('rejectBtn').addEventListener('click', function() {
        if (!validateForm()) {
            return;
        }
        
        const selectedReasons = getSelectedReasons();
        const confirmMessage = `Are you sure you want to reject the group loan applications?\n\nReasons:\n${selectedReasons.join('\n')}`;
        
        if (confirm(confirmMessage)) {
            // Here you would make the API call to reject the applications
            console.log('Rejecting applications with reasons:', selectedReasons);
            
            alert('Group loan applications rejected successfully');
            
            // Reset form
            document.getElementById('centerId').value = '';
            document.getElementById('centerName').value = '';
            document.getElementById('schemeId').value = '';
            document.getElementById('schemeName').value = '';
            document.getElementById('reverseCharge').checked = false;
            
            // Clear table
            const tableBody = document.getElementById('applicationTableBody');
            tableBody.innerHTML = '<tr><td colspan="11" class="no-data">No records to display.</td></tr>';
            
            // Uncheck all reasons
            document.querySelectorAll('.form-check-input[id^="reason"]').forEach(cb => cb.checked = false);
        }
    });
    
    // Cancel button
    document.getElementById('cancelBtn').addEventListener('click', function() {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            closeModal();
        }
    });
    
    // Search button handlers
    document.querySelectorAll('.btn-search').forEach(btn => {
        btn.addEventListener('click', function() {
            alert('Search functionality will be implemented with lookup modal');
        });
    });
});
