// Workflow Stage Setting - JavaScript
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

    // Add event listeners to checkboxes
    const checkboxes = document.querySelectorAll('#stageSettingTableBody input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.addEventListener('change', handleCheckboxChange);
    });

    // Add event listeners to order inputs
    const orderInputs = document.querySelectorAll('.order-input');
    orderInputs.forEach(input => {
        input.addEventListener('change', handleOrderChange);
    });
}

// Load sample audit data
function loadSampleData() {
    document.getElementById('createdBy').value = 'admin';
    document.getElementById('createdOn').value = '2026-01-13 10:30:00';
    document.getElementById('supervisedBy').value = 'supervisor';
    document.getElementById('supervisedOn').value = '2026-01-13 14:45:00';
}

// Handle checkbox change
function handleCheckboxChange(e) {
    const checkbox = e.target;
    const row = checkbox.closest('tr');
    const stageId = row.cells[1].textContent;
    
    if (checkbox.checked) {
        showStatus(`Stage ${stageId} applied`, 'info');
    } else {
        showStatus(`Stage ${stageId} unapplied`, 'info');
    }
}

// Handle order input change
function handleOrderChange(e) {
    const input = e.target;
    const row = input.closest('tr');
    const stageId = row.cells[1].textContent;
    
    showStatus(`Order updated for stage ${stageId}: ${input.value}`, 'info');
}

// Action Handlers
function handleEdit() {
    showStatus('Edit mode enabled for workflow stage settings', 'info');
    setFormReadonly(false);
}

function handleSave() {
    if (confirm('Save workflow stage setting changes?')) {
        // Collect data from table
        const stages = [];
        const rows = document.querySelectorAll('#stageSettingTableBody tr');
        
        rows.forEach(row => {
            const apply = row.querySelector('input[type="checkbox"]').checked;
            const stageId = row.cells[1].textContent;
            const workflowStage = row.cells[2].textContent;
            const isSystem = row.cells[3].textContent;
            const order = row.querySelector('.order-input').value;
            
            stages.push({
                apply,
                stageId,
                workflowStage,
                isSystem,
                order
            });
        });
        
        console.log('Saving workflow stage settings:', stages);
        
        // Simulate save operation
        setTimeout(() => {
            showStatus('Workflow stage settings saved successfully', 'success');
            loadSampleData();
            setFormReadonly(true);
        }, 500);
    }
}

function handleCancel() {
    if (confirm('Cancel changes and reset form?')) {
        // Reset checkboxes and inputs
        const rows = document.querySelectorAll('#stageSettingTableBody tr');
        rows.forEach((row, index) => {
            const checkbox = row.querySelector('input[type="checkbox"]');
            const orderInput = row.querySelector('.order-input');
            
            // Reset based on original data
            if (index < 8) {
                checkbox.checked = false;
                orderInput.value = '';
            } else {
                checkbox.checked = true;
                // Keep the original order values for checked items
            }
        });
        
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
    const checkboxes = document.querySelectorAll('#stageSettingTableBody input[type="checkbox"]');
    const orderInputs = document.querySelectorAll('.order-input');
    
    checkboxes.forEach(checkbox => {
        checkbox.disabled = readonly;
    });
    
    orderInputs.forEach(input => {
        input.readOnly = readonly;
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

// Initialize form in readonly mode
setTimeout(() => {
    setFormReadonly(true);
}, 100);
