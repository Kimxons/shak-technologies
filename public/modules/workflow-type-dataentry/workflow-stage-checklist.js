// Workflow Stage Checklist - JavaScript
// Handles form interactions, table management, and CRUD operations

// Initialize form on page load
document.addEventListener('DOMContentLoaded', function() {
    initializeForm();
    loadStageChecklist();
});

// Initialize form elements and event listeners
function initializeForm() {
    const stageSelect = document.getElementById('stage');
    
    // Load checklist when stage changes
    if (stageSelect) {
        stageSelect.addEventListener('change', function() {
            loadStageChecklist();
        });
    }

    // Keyboard shortcuts
    document.addEventListener('keydown', function(e) {
        // Alt+V - View
        if (e.altKey && e.key === 'v') {
            e.preventDefault();
            handleView();
        }
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
}

// Load checklist data for selected stage
function loadStageChecklist() {
    const stage = document.getElementById('stage').value;
    const tbody = document.getElementById('checklistTableBody');
    
    if (!stage) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-records">Please select a stage</td></tr>';
        return;
    }

    // Sample data for demonstration
    const checklistData = getSampleChecklistData(stage);
    
    if (checklistData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="4" class="no-records">No Records To Display</td></tr>';
        loadSampleAuditData();
    } else {
        renderChecklistTable(checklistData);
        loadSampleAuditData();
    }
}

// Get sample checklist data based on stage
function getSampleChecklistData(stage) {
    const data = {
        'SCORING': [],
        'VERIFICATION': [
            { apply: true, ruleId: 'VER-001', description: 'Verify Customer Identity', mandatory: 'Yes' },
            { apply: true, ruleId: 'VER-002', description: 'Verify Income Documentation', mandatory: 'Yes' },
            { apply: false, ruleId: 'VER-003', description: 'Verify Collateral Valuation', mandatory: 'No' }
        ],
        'APPROVAL': [
            { apply: true, ruleId: 'APP-001', description: 'Credit Committee Approval', mandatory: 'Yes' },
            { apply: true, ruleId: 'APP-002', description: 'Risk Assessment Review', mandatory: 'Yes' }
        ],
        'DISBURSEMENT': [
            { apply: true, ruleId: 'DIS-001', description: 'Account Verification', mandatory: 'Yes' },
            { apply: true, ruleId: 'DIS-002', description: 'Final Document Check', mandatory: 'Yes' }
        ]
    };
    
    return data[stage] || [];
}

// Render checklist table
function renderChecklistTable(data) {
    const tbody = document.getElementById('checklistTableBody');
    tbody.innerHTML = '';
    
    data.forEach((item, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" ${item.apply ? 'checked' : ''} 
                       onchange="handleCheckboxChange(${index})">
            </td>
            <td>${item.ruleId}</td>
            <td>${item.description}</td>
            <td>${item.mandatory}</td>
        `;
        tbody.appendChild(row);
    });
}

// Handle checkbox change
function handleCheckboxChange(index) {
    showStatus('Rule application status updated', 'info');
}

// Load sample audit data
function loadSampleAuditData() {
    document.getElementById('createdBy').value = 'admin';
    document.getElementById('createdOn').value = '2026-01-13 10:30:00';
    document.getElementById('supervisedBy').value = 'supervisor';
    document.getElementById('supervisedOn').value = '2026-01-13 14:45:00';
}

// Action Handlers
function handleView() {
    const stage = document.getElementById('stage').value;
    
    if (!stage) {
        showStatus('Please select a stage to view', 'error');
        return;
    }
    
    showStatus('Viewing workflow stage checklist for: ' + stage, 'info');
    setFormReadonly(true);
}

function handleEdit() {
    const stage = document.getElementById('stage').value;
    
    if (!stage) {
        showStatus('Please select a stage to edit', 'error');
        return;
    }
    
    showStatus('Edit mode enabled for stage: ' + stage, 'info');
    setFormReadonly(false);
}

function handleSave() {
    const stage = document.getElementById('stage').value;
    
    if (!stage) {
        showStatus('Please select a stage before saving', 'error');
        return;
    }
    
    if (confirm('Save workflow stage checklist changes?')) {
        // Simulate save operation
        setTimeout(() => {
            showStatus('Workflow stage checklist saved successfully', 'success');
            loadSampleAuditData();
        }, 500);
    }
}

function handleCancel() {
    if (confirm('Cancel changes and reset form?')) {
        document.getElementById('workflowStageChecklistForm').reset();
        document.getElementById('stage').value = 'SCORING';
        loadStageChecklist();
        showStatus('Form reset successfully', 'info');
    }
}

function handleBack() {
    if (confirm('Go back? Any unsaved changes will be lost.')) {
        window.history.back();
    }
}

// Set form readonly state
function setFormReadonly(readonly) {
    const stage = document.getElementById('stage');
    const checkboxes = document.querySelectorAll('#checklistTableBody input[type="checkbox"]');
    
    if (stage) {
        stage.disabled = readonly;
    }
    
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

// Modal handling functions (for future use)
function openModal(modalId) {
    showStatus('Opening modal: ' + modalId, 'info');
}

function toggleSubmenu(button) {
    const submenu = button.nextElementSibling;
    const icon = button.querySelector('i');
    
    if (submenu && submenu.classList.contains('sidebar-submenu')) {
        submenu.classList.toggle('active');
        icon.classList.toggle('bi-caret-down-fill');
        icon.classList.toggle('bi-caret-right-fill');
    }
}
