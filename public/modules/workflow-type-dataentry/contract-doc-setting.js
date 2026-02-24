// Contract Document Setting - JavaScript
// Handles form interactions, table management, and CRUD operations

// Sample data storage
let contractDocuments = [];

// Initialize form on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    loadSampleData();
});

// Initialize form elements and event listeners
function initializeForm() {
    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Alt+A - Add
        if (e.altKey && e.key === 'a') {
            e.preventDefault();
            handleAdd();
        }
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

// Search contract format
function searchContractFormat() {
    showStatus('Opening contract format search...', 'info');
    // Sample contract formats
    const formats = ['FMT001', 'FMT002', 'FMT003'];
    const selected = formats[Math.floor(Math.random() * formats.length)];
    document.getElementById('contractFormatId').value = selected;
    showStatus(`Contract format ${selected} selected`, 'success');
}

// Handle New button
function handleNew() {
    const workflowStage = document.getElementById('workflowStage').value;
    const contractFormatId = document.getElementById('contractFormatId').value;
    
    if (!workflowStage || !contractFormatId) {
        showStatus('Please select Workflow Stage and Contract Format ID', 'warning');
        return;
    }
    
    // Add to array and update table
    contractDocuments.push({ workflowStage, contractFormatId });
    updateTable();
    clearInputs();
    showStatus('New contract document setting added', 'success');
}

// Handle Remove button
function handleRemove() {
    const workflowStage = document.getElementById('workflowStage').value;
    
    if (!workflowStage) {
        showStatus('Please select a Workflow Stage to remove', 'warning');
        return;
    }
    
    const index = contractDocuments.findIndex(doc => doc.workflowStage === workflowStage);
    if (index !== -1) {
        contractDocuments.splice(index, 1);
        updateTable();
        clearInputs();
        showStatus('Contract document setting removed', 'success');
    } else {
        showStatus('No matching workflow stage found', 'warning');
    }
}

// Handle Update button
function handleUpdate() {
    const workflowStage = document.getElementById('workflowStage').value;
    const contractFormatId = document.getElementById('contractFormatId').value;
    
    if (!workflowStage || !contractFormatId) {
        showStatus('Please select Workflow Stage and Contract Format ID', 'warning');
        return;
    }
    
    const index = contractDocuments.findIndex(doc => doc.workflowStage === workflowStage);
    if (index !== -1) {
        contractDocuments[index].contractFormatId = contractFormatId;
        updateTable();
        clearInputs();
        showStatus('Contract document setting updated', 'success');
    } else {
        showStatus('No matching workflow stage found', 'warning');
    }
}

// Handle Clear button
function handleClear() {
    clearInputs();
    showStatus('Form cleared', 'info');
}

// Update table display
function updateTable() {
    const tbody = document.getElementById('contractDocTableBody');
    
    if (contractDocuments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="2" class="no-records">No Records To Display</td></tr>';
    } else {
        tbody.innerHTML = '';
        contractDocuments.forEach(doc => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${doc.workflowStage}</td>
                <td>${doc.contractFormatId}</td>
            `;
            row.style.cursor = 'pointer';
            row.onclick = function() {
                document.getElementById('workflowStage').value = doc.workflowStage;
                document.getElementById('contractFormatId').value = doc.contractFormatId;
            };
            tbody.appendChild(row);
        });
    }
}

// Clear input fields
function clearInputs() {
    document.getElementById('workflowStage').value = '';
    document.getElementById('contractFormatId').value = '';
}

// Action Handlers (Right sidebar)
function handleAdd() {
    showStatus('Add mode enabled - Fill in the form and click New', 'info');
    clearInputs();
    document.getElementById('workflowStage').focus();
}

function handleEdit() {
    const workflowStage = document.getElementById('workflowStage').value;
    if (!workflowStage) {
        showStatus('Please select a workflow stage from the table to edit', 'warning');
        return;
    }
    showStatus('Edit mode enabled - Update the fields and click Update', 'info');
}

function handleDelete() {
    if (contractDocuments.length === 0) {
        showStatus('No records to delete', 'warning');
        return;
    }
    
    if (confirm('Delete all contract document settings?')) {
        contractDocuments = [];
        updateTable();
        clearInputs();
        showStatus('All contract document settings deleted', 'success');
    }
}

function handleSave() {
    if (confirm('Save contract document settings?')) {
        console.log('Saving contract document settings:', contractDocuments);
        
        // Simulate save operation
        setTimeout(() => {
            showStatus('Contract document settings saved successfully', 'success');
            loadSampleData();
        }, 500);
    }
}

function handleCancel() {
    if (confirm('Cancel changes and reset form?')) {
        contractDocuments = [];
        updateTable();
        clearInputs();
        showStatus('Form reset successfully', 'info');
    }
}

function handleBack() {
    if (confirm('Go back? Any unsaved changes will be lost.')) {
        window.history.back();
    }
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
