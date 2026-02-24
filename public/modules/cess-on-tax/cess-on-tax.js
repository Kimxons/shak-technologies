// Cess On Tax (standardized UI)

// ========================================
// STATE MANAGEMENT
// ========================================
let currentMode = 'view'; // view, add, edit
let selectedCessId = null;

// ========================================
// INITIALIZATION
// ========================================
document.addEventListener('DOMContentLoaded', function () {
    initHeaderControls();
    initSectionToggles();
    initActions();
    initializeForm();
});

function initializeForm() {
    disableFormFields();
    setEditing(false);
}

function getMessageBar() {
    return document.querySelector('.am-message-panel');
}

function showMessage(text, type, timeoutMs) {
    const t = type || 'info';
    const ms = typeof timeoutMs === 'number' ? timeoutMs : 3000;
    const bar = getMessageBar();
    if (!bar) return;

    bar.className = `am-message-panel show ${t}`;
    const span = bar.querySelector('span');
    if (span) span.textContent = text;

    window.clearTimeout(showMessage._t);
    showMessage._t = window.setTimeout(function () {
        bar.classList.remove('show');
    }, ms);
}

function closeThisWindow() {
    // If embedded as a module page (iframe), return to dashboard.
    if (window.self !== window.top) {
        window.location.href = '../../dashboard.html';
        return;
    }

    if (window.history.length > 1) {
        window.history.back();
    } else {
        window.close();
    }
}

function initHeaderControls() {
    document.addEventListener('click', function (e) {
        const btn = e.target.closest('[data-action]');
        if (!btn) return;
        const action = btn.getAttribute('data-action');

        if (action === 'refresh') {
            window.location.reload();
            return;
        }

        if (action === 'maximize') {
            const win = document.querySelector('.window');
            if (win) win.classList.toggle('maximized');
            return;
        }

        if (action === 'minimize') {
            // kept for parity with standardized header; no-op
            return;
        }

        if (action === 'close') {
            closeThisWindow();
        }
    });
}

function initSectionToggles() {
    const toggles = document.querySelectorAll('[data-section-toggle]');
    toggles.forEach(function (header) {
        const section = header.closest('.form-section');
        const content = section ? section.querySelector('[data-section-content]') : null;
        const btn = section ? section.querySelector('.section-toggle-btn') : null;
        const icon = btn ? btn.querySelector('i') : null;
        if (!content || !btn) return;

        const setExpanded = function (expanded) {
            btn.setAttribute('aria-expanded', expanded ? 'true' : 'false');
            content.hidden = !expanded;
            if (icon) {
                icon.classList.toggle('bi-chevron-up', expanded);
                icon.classList.toggle('bi-chevron-down', !expanded);
            }
        };

        if (!btn.hasAttribute('aria-expanded')) setExpanded(true);

        const toggle = function () {
            const expanded = btn.getAttribute('aria-expanded') !== 'false';
            setExpanded(!expanded);
        };

        header.addEventListener('click', toggle);
        btn.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            toggle();
        });
    });
}

function setEditing(on) {
    const btnView = document.querySelector('.action-panel [data-action="view"]');
    const btnAdd = document.querySelector('.action-panel [data-action="add"]');
    const btnEdit = document.querySelector('.action-panel [data-action="edit"]');
    const btnDelete = document.querySelector('.action-panel [data-action="delete"]');
    const btnSave = document.querySelector('.action-panel [data-action="save"]');
    const btnCancel = document.querySelector('.action-panel [data-action="cancel"]');

    if (btnView) btnView.disabled = false;
    if (btnAdd) btnAdd.disabled = false;
    if (btnEdit) btnEdit.disabled = on;
    if (btnDelete) btnDelete.disabled = on;
    if (btnSave) btnSave.disabled = !on;
    if (btnCancel) btnCancel.disabled = !on;
}

function initActions() {
    document.addEventListener('click', function (e) {
        const el = e.target.closest('[data-action]');
        if (!el) return;
        const action = el.getAttribute('data-action');

        if (action === 'view') handleView();
        if (action === 'add') handleAdd();
        if (action === 'edit') handleEdit();
        if (action === 'delete') handleDelete();
        if (action === 'save') handleSave();
        if (action === 'cancel') handleCancel();
        if (action === 'searchCess') searchCess();
    });
}

// ========================================
// FORM FIELD MANAGEMENT
// ========================================
function enableFormFields() {
    const fields = [
        'cessId', 'description', 'rounding', 'payableGlId', 
        'paidGlId', 'receivableGlId', 'amountPercentage', 
        'cess', 'minimumCess', 'maximumCess', 'remarks'
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.disabled = false;
        }
    });
}

function disableFormFields() {
    const fields = [
        'cessId', 'description', 'rounding', 'payableGlId', 
        'paidGlId', 'receivableGlId', 'amountPercentage', 
        'cess', 'minimumCess', 'maximumCess', 'remarks'
    ];
    
    fields.forEach(field => {
        const element = document.getElementById(field);
        if (element) {
            element.disabled = true;
        }
    });
}

function clearForm() {
    document.getElementById('cessId').value = '';
    document.getElementById('description').value = '';
    document.getElementById('rounding').selectedIndex = 0;
    document.getElementById('payableGlId').value = '';
    document.getElementById('paidGlId').value = '';
    document.getElementById('receivableGlId').value = '';
    document.getElementById('amountPercentage').selectedIndex = 0;
    document.getElementById('cess').value = '';
    document.getElementById('minimumCess').value = '';
    document.getElementById('maximumCess').value = '';
    document.getElementById('remarks').value = '';
}

// ========================================
// CRUD OPERATIONS
// ========================================
function handleView() {
    if (!selectedCessId) {
        showMessage('Please select a cess record to view', 'info');
        return;
    }
    
    currentMode = 'view';
    disableFormFields();
    setEditing(false);
    showMessage('Viewing cess details', 'info');
}

function handleAdd() {
    currentMode = 'add';
    clearForm();
    enableFormFields();
    document.getElementById('cessId').disabled = true;

    setEditing(true);
    showMessage('Enter new cess details', 'info');
}

function handleEdit() {
    if (!selectedCessId) {
        showMessage('Please select a cess record to edit', 'info');
        return;
    }
    
    currentMode = 'edit';
    enableFormFields();
    document.getElementById('cessId').disabled = true;

    setEditing(true);
    showMessage('Edit mode enabled', 'info');
}

function handleSave() {
    if (!validateForm()) {
        showMessage('Please fill in all required fields', 'error');
        return;
    }
    
    const formData = {
        cessId: document.getElementById('cessId').value,
        description: document.getElementById('description').value,
        rounding: document.getElementById('rounding').value,
        payableGlId: document.getElementById('payableGlId').value,
        paidGlId: document.getElementById('paidGlId').value,
        receivableGlId: document.getElementById('receivableGlId').value,
        amountPercentage: document.getElementById('amountPercentage').value,
        cess: document.getElementById('cess').value,
        minimumCess: document.getElementById('minimumCess').value,
        maximumCess: document.getElementById('maximumCess').value,
        remarks: document.getElementById('remarks').value
    };
    
    if (currentMode === 'add') {
        console.log('Adding new cess:', formData);
        showMessage('Cess record added successfully', 'success');
    } else if (currentMode === 'edit') {
        console.log('Updating cess:', formData);
        showMessage('Cess record updated successfully', 'success');
    }
    
    disableEdit();
    updateAuditTrail();
}

function handleDelete() {
    if (!selectedCessId) {
        showMessage('Please select a cess record to delete', 'info');
        return;
    }
    
    if (confirm('Are you sure you want to delete this cess record?')) {
        console.log('Deleting cess:', selectedCessId);
        showMessage('Cess record deleted successfully', 'success');
        clearForm();
        selectedCessId = null;
    }
}

function handleCancel() {
    disableEdit();
    if (selectedCessId) {
        // Reload the selected record
        showMessage('Changes cancelled', 'info');
    } else {
        clearForm();
        showMessage('Operation cancelled', 'info');
    }
}

// ========================================
// HELPER FUNCTIONS
// ========================================
function validateForm() {
    const cessId = document.getElementById('cessId').value;
    const description = document.getElementById('description').value;
    
    if (currentMode === 'add' && !cessId) {
        return false;
    }
    
    if (!description) {
        return false;
    }
    
    return true;
}

function disableEdit() {
    disableFormFields();
    setEditing(false);
    currentMode = 'view';
}

function updateAuditTrail() {
    const now = new Date();
    const dateStr = now.toLocaleDateString();
    const timeStr = now.toLocaleTimeString();
    
    if (currentMode === 'add') {
        document.getElementById('createdBy').textContent = 'Current User';
        document.getElementById('createdOn').textContent = dateStr;
    } else {
        document.getElementById('modifiedBy').textContent = 'Current User';
        document.getElementById('modifiedOn').textContent = dateStr;
    }
}

function searchCess() {
    showMessage('Search functionality to be implemented', 'info');
}

// Keep legacy global names available (if anything external calls them)
window.handleView = handleView;
window.handleAdd = handleAdd;
window.handleEdit = handleEdit;
window.handleSave = handleSave;
window.handleDelete = handleDelete;
window.handleCancel = handleCancel;
window.searchCess = searchCess;
