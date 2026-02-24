// Sample module data
const moduleConfigData = [
    {
        id: 1,
        moduleType: '1',
        fieldName: 'CF001',
        isMandatory: true,
        fieldDescription: 'Custom Field 01',
        createdBy: 'System',
        createdOn: '2024-01-01',
        supervisedBy: 'Admin',
        supervisedOn: '2024-01-02'
    },
    {
        id: 2,
        moduleType: '2',
        fieldName: 'CF002',
        isMandatory: false,
        fieldDescription: 'Custom Field 02',
        createdBy: 'Manager',
        createdOn: '2024-01-05',
        supervisedBy: 'Admin',
        supervisedOn: '2024-01-06'
    }
];

let currentModuleIndex = 0;
let isEditMode = false;

function initializeUserDefinableModule() {
    if (moduleConfigData.length > 0) {
        selectModule(0);
    }
    attachEventListeners();
}

function attachEventListeners() {
    document.addEventListener('keydown', function(e) {
        if (e.key === 'v' || e.key === 'V') handleView();
        if (e.key === 'a' || e.key === 'A') handleAdd();
        if (e.key === 'e' || e.key === 'E') handleEdit();
        if (e.key === 'd' || e.key === 'D') handleDelete();
        if (e.key === 's' || e.key === 'S') handleSave();
        if (e.key === 'c' || e.key === 'C') handleCancel();
        if (e.key === 'n' || e.key === 'N') handleNew();
    });
}

function selectModule(index) {
    if (index >= 0 && index < moduleConfigData.length) {
        currentModuleIndex = index;
        const module = moduleConfigData[index];
        
        // Safely set values with null checks
        const moduleTypeEl = document.getElementById('moduleType');
        if (moduleTypeEl) moduleTypeEl.value = module.moduleType || '';
        
        const fieldNameEl = document.getElementById('fieldName');
        if (fieldNameEl) fieldNameEl.value = module.fieldName || '';
        
        const isMandatoryEl = document.getElementById('isMandatory');
        if (isMandatoryEl) isMandatoryEl.checked = module.isMandatory || false;
        
        // Populate audit fields
        const createdByEl = document.getElementById('createdBy');
        if (createdByEl) createdByEl.value = module.createdBy || '';
        
        const createdOnEl = document.getElementById('createdOn');
        if (createdOnEl) createdOnEl.value = module.createdOn || '';
        
        const supervisedByEl = document.getElementById('supervisedBy');
        if (supervisedByEl) supervisedByEl.value = module.supervisedBy || '';
        
        const supervisedOnEl = document.getElementById('supervisedOn');
        if (supervisedOnEl) supervisedOnEl.value = module.supervisedOn || '';
        
        loadModuleTable();
        setEditMode(false);
        showStatus('Module ' + (index + 1) + ' of ' + moduleConfigData.length + ' loaded', 'info');
    }
}

function loadModuleTable() {
    const tbody = document.getElementById('moduleTableBody');
    if (!tbody) {
        console.warn('[user-definable-module] loadModuleTable: #moduleTableBody not found — skipping table render');
        return;
    }
    tbody.innerHTML = '';

    if (moduleConfigData.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="2">No records to display</td></tr>';
        return;
    }

    moduleConfigData.forEach((module, index) => {
        const row = document.createElement('tr');
        row.className = index === currentModuleIndex ? 'selected' : '';
        row.innerHTML = `
            <td>${module.fieldDescription}</td>
            <td>
                <input type="checkbox" ${module.isMandatory ? 'checked' : ''} disabled>
            </td>
        `;
        row.onclick = () => selectRowFromTable(index);
        tbody.appendChild(row);
    });
}

function selectRowFromTable(index) {
    selectModule(index);
}

function handleView() {
    if (!isEditMode) {
        showStatus('Viewing module ' + (currentModuleIndex + 1), 'info');
    }
}

function handleNew() {
    clearFormFields();
    isEditMode = true;
    setEditMode(true);
    showStatus('Creating new module configuration', 'info');
}

function handleAlter() {
    if (!isEditMode) {
        isEditMode = true;
        setEditMode(true);
        showStatus('Alter mode activated', 'warning');
    }
}

function handleRemove() {
    if (!isEditMode && confirm('Are you sure you want to remove this module configuration?')) {
        moduleConfigData.splice(currentModuleIndex, 1);
        if (moduleConfigData.length > 0) {
            if (currentModuleIndex >= moduleConfigData.length) {
                currentModuleIndex = moduleConfigData.length - 1;
            }
            selectModule(currentModuleIndex);
        } else {
            clearFormFields();
            loadModuleTable();
        }
        showStatus('Module configuration removed', 'success');
    }
}

function handleUpdate() {
    if (!isEditMode) {
        showStatus('Use Edit mode to update configuration', 'warning');
    }
}

function handleClear() {
    if (isEditMode) {
        clearFormFields();
        showStatus('Form cleared', 'info');
    }
}

function handleAdd() {
    if (!isEditMode) {
        isEditMode = true;
        setEditMode(true);
        clearFormFields();
        showStatus('Add new configuration', 'info');
    }
}

function handleEdit() {
    if (!isEditMode) {
        isEditMode = true;
        setEditMode(true);
        showStatus('Edit mode activated', 'warning');
    }
}

function handleDelete() {
    if (confirm('Are you sure you want to delete this configuration?')) {
        moduleConfigData.splice(currentModuleIndex, 1);
        if (moduleConfigData.length > 0) {
            if (currentModuleIndex >= moduleConfigData.length) {
                currentModuleIndex = moduleConfigData.length - 1;
            }
            selectModule(currentModuleIndex);
        } else {
            clearFormFields();
            loadModuleTable();
        }
        showStatus('Configuration deleted', 'success');
    }
}

function handleSave() {
    if (!validateForm()) {
        showStatus('Please fill in all required fields', 'error');
        return;
    }

    if (isEditMode) {
        if (currentModuleIndex < moduleConfigData.length) {
            // Update existing
            moduleConfigData[currentModuleIndex] = {
                id: moduleConfigData[currentModuleIndex].id,
                moduleType: document.getElementById('moduleType').value,
                fieldName: document.getElementById('fieldName').value,
                isMandatory: document.getElementById('isMandatory').checked,
                fieldDescription: getFieldDescription(document.getElementById('fieldName').value),
                createdBy: document.getElementById('createdBy').value,
                createdOn: document.getElementById('createdOn').value,
                supervisedBy: document.getElementById('supervisedBy').value,
                supervisedOn: document.getElementById('supervisedOn').value
            };
        } else {
            // Add new
            const newModule = {
                id: Math.max(...moduleConfigData.map(m => m.id), 0) + 1,
                moduleType: document.getElementById('moduleType').value,
                fieldName: document.getElementById('fieldName').value,
                isMandatory: document.getElementById('isMandatory').checked,
                fieldDescription: getFieldDescription(document.getElementById('fieldName').value),
                createdBy: 'System',
                createdOn: new Date().toISOString().split('T')[0],
                supervisedBy: 'Admin',
                supervisedOn: new Date().toISOString().split('T')[0]
            };
            moduleConfigData.push(newModule);
            currentModuleIndex = moduleConfigData.length - 1;
        }

        isEditMode = false;
        setEditMode(false);
        selectModule(currentModuleIndex);
        showStatus('Configuration saved successfully', 'success');
    }
}

function handleCancel() {
    if (isEditMode) {
        isEditMode = false;
        setEditMode(false);
        if (currentModuleIndex < moduleConfigData.length) {
            selectModule(currentModuleIndex);
        } else {
            clearFormFields();
        }
        showStatus('Operation cancelled', 'warning');
    }
}

function getFieldDescription(fieldName) {
    const fieldMap = {
        'CF001': 'Custom Field 01',
        'CF002': 'Custom Field 02'
    };
    return fieldMap[fieldName] || '';
}

function validateForm() {
    const moduleType = document.getElementById('moduleType').value;
    const fieldName = document.getElementById('fieldName').value;

    return moduleType && fieldName;
}

function clearFormFields() {
    document.getElementById('moduleType').value = '';
    document.getElementById('fieldName').value = '';
    document.getElementById('isMandatory').checked = false;
    document.getElementById('createdBy').value = '';
    document.getElementById('createdOn').value = '';
    document.getElementById('supervisedBy').value = '';
    document.getElementById('supervisedOn').value = '';
}

function setEditMode(mode) {
    const formControls = ['moduleType', 'fieldName', 'isMandatory'];

    formControls.forEach(id => {
        const control = document.getElementById(id);
        if (control.tagName === 'INPUT' && control.type === 'checkbox') {
            control.disabled = !mode;
        } else {
            if (mode) {
                control.removeAttribute('disabled');
                control.style.backgroundColor = 'var(--white)';
            } else {
                control.setAttribute('disabled', 'disabled');
                control.style.backgroundColor = 'var(--secondary)';
            }
        }
    });
}

function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMsg');
    statusEl.textContent = message;
    statusEl.className = 'status ' + type;
    statusEl.classList.remove('hidden');

    setTimeout(() => {
        statusEl.classList.add('hidden');
    }, 4000);
}

function toggleNav(button) {
    const navItems = button.nextElementSibling;
    button.classList.toggle('collapsed');
    navItems.classList.toggle('collapsed');
}

function navigateTo(page) {
    if (page === 'user-definable-fields') {
        window.location.href = '../user-definable-fields/user-definable-fields.html';
    } else if (page === 'user-definable-modules') {
        window.location.href = '../user-definable-module/user-definable-module.html';
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', initializeUserDefinableModule);
