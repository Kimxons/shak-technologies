// Verification Fields - JavaScript
// Handles form interactions, table management, and CRUD operations

// Initialize form on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    loadSampleData();
});

// Initialize form elements and event listeners
function initializeForm() {
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Alt+E - Edit
        if (e.altKey && e.key === 'e') {
            e.preventDefault();
            handleEdit();
        }
        // Alt+D - Delete
        if (e.altKey && e.key === 'd') {
            e.preventDefault();
            handleDelete();
        }
        // Ctrl+S - Save
        if (e.ctrlKey && e.key === 's') {
            e.preventDefault();
            handleSave();
        }
        // ESC - Cancel
        if (e.key === 'Escape') {
            e.preventDefault();
            handleCancel();
        }
        // Alt+B - Back
        if (e.altKey && e.key === 'b') {
            e.preventDefault();
            handleBack();
        }
    });
}

// Load sample audit data
function loadSampleData() {
    document.getElementById('createdBy').value = 'admin';
    document.getElementById('createdOn').value = '2026-01-13 10:30:00';
    document.getElementById('supervisedBy').value = 'supervisor';
    document.getElementById('supervisedOn').value = '2026-01-13 14:45:00';
}

// Load verification fields (sample implementation)
function loadVerificationFields() {
    const tbody = document.getElementById('verificationFieldsTableBody');
    
    // Sample data - replace with actual data fetch
    const fields = [
        { ruleId: 'VF001', description: 'Client Identity Verification' },
        { ruleId: 'VF002', description: 'Income Source Verification' },
        { ruleId: 'VF003', description: 'Employment Verification' },
        { ruleId: 'VF004', description: 'Address Verification' },
        { ruleId: 'VF005', description: 'Credit History Check' }
    ];
    
    if (fields.length === 0) {
        tbody.innerHTML = '<tr><td colspan="3" class="no-records">No Records To Display</td></tr>';
    } else {
        tbody.innerHTML = '';
        fields.forEach(field => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td style="text-align: center;">
                    <input type="checkbox" class="field-checkbox" data-rule-id="${field.ruleId}">
                </td>
                <td>${field.ruleId}</td>
                <td>${field.description}</td>
            `;
            tbody.appendChild(row);
        });
        
        // Add event listeners to checkboxes
        const checkboxes = document.querySelectorAll('.field-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.addEventListener('change', handleCheckboxChange);
        });
    }
}

// Handle checkbox change
function handleCheckboxChange(e) {
    const checkbox = e.target;
    const ruleId = checkbox.dataset.ruleId;
    
    if (checkbox.checked) {
        showStatus(`Field ${ruleId} selected`, 'info');
    } else {
        showStatus(`Field ${ruleId} deselected`, 'info');
    }
}

// Action Handlers
function handleEdit() {
    showStatus('Edit mode enabled for verification fields', 'info');
    loadVerificationFields();
    setFormReadonly(false);
}

function handleDelete() {
    const checkboxes = document.querySelectorAll('.field-checkbox:checked');
    
    if (checkboxes.length === 0) {
        showStatus('Please select at least one field to delete', 'warning');
        return;
    }
    
    const selectedFields = Array.from(checkboxes).map(cb => cb.dataset.ruleId).join(', ');
    
    if (confirm(`Delete selected verification fields: ${selectedFields}?`)) {
        checkboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            row.remove();
        });
        
        // Check if table is empty
        const tbody = document.getElementById('verificationFieldsTableBody');
        if (tbody.children.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" class="no-records">No Records To Display</td></tr>';
        }
        
        showStatus('Selected verification fields deleted successfully', 'success');
    }
}

function handleSave() {
    if (confirm('Save verification fields changes?')) {
        // Collect selected fields
        const checkboxes = document.querySelectorAll('.field-checkbox');
        const fields = [];
        
        checkboxes.forEach(checkbox => {
            const row = checkbox.closest('tr');
            fields.push({
                selected: checkbox.checked,
                ruleId: row.cells[1].textContent,
                description: row.cells[2].textContent
            });
        });
        
        console.log('Saving verification fields:', fields);
        
        // Simulate save operation
        setTimeout(() => {
            showStatus('Verification fields saved successfully', 'success');
            loadSampleData();
            setFormReadonly(true);
        }, 500);
    }
}

function handleCancel() {
    if (confirm('Cancel changes and reset form?')) {
        const tbody = document.getElementById('verificationFieldsTableBody');
        tbody.innerHTML = '<tr><td colspan="3" class="no-records">No Records To Display</td></tr>';
        showStatus('Form reset successfully', 'info');
        setFormReadonly(true);
    }
}

function handleBack() {
    if (confirm('Go back? Any unsaved changes will be lost.')) {
        window.history.back();
    }
}

// Set form readonly state
function setFormReadonly(readonly) {
    const checkboxes = document.querySelectorAll('.field-checkbox');
    checkboxes.forEach(checkbox => {
        checkbox.disabled = readonly;
    });
}

// Show status message
function showStatus(message, type = 'info') {
    const statusDiv = document.getElementById('statusMessage');
    statusDiv.textContent = message;
    statusDiv.className = 'status-message status-' + type;
    statusDiv.style.display = 'block';
    
    setTimeout(() => {
        statusDiv.style.display = 'none';
    }, 4000);
}
