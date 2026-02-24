// Sample user definable fields data
const userDefinableFieldsData = [
    {
        id: 1,
        fieldName: 'Custom Field 01',
        fieldCaption: 'Custom Field',
        valueTypeId: '1',
        dataSource: 'Manual',
        maximumLength: '100',
        minimumValue: '',
        maximumValue: '',
        defaultText: '',
        createdBy: 'System',
        modifiedBy: 'System',
        supervisedBy: 'Admin',
        createdOn: '2024-01-01',
        modifiedOn: '2024-01-15',
        supervisedOn: '2024-01-16'
    },
    {
        id: 2,
        fieldName: 'Custom Field 02',
        fieldCaption: 'Additional Field',
        valueTypeId: '2',
        dataSource: 'Database',
        maximumLength: '50',
        minimumValue: '0',
        maximumValue: '1000',
        defaultText: '0',
        createdBy: 'Manager',
        modifiedBy: 'Manager',
        supervisedBy: 'Admin',
        createdOn: '2024-01-05',
        modifiedOn: '2024-01-20',
        supervisedOn: '2024-01-21'
    }
];

let currentRecordIndex = 0;
let isEditMode = false;

function initializeUserDefinableFields() {
    if (userDefinableFieldsData.length > 0) {
        selectRecord(0);
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
    });
}

function selectRecord(index) {
    if (index >= 0 && index < userDefinableFieldsData.length) {
        currentRecordIndex = index;
        const record = userDefinableFieldsData[index];
        
        document.getElementById('fieldName').value = record.fieldName || '';
        document.getElementById('fieldCaption').value = record.fieldCaption || '';
        document.getElementById('valueTypeId').value = record.valueTypeId || '';
        document.getElementById('dataSource').value = record.dataSource || '';
        document.getElementById('maximumLength').value = record.maximumLength || '';
        document.getElementById('minimumValue').value = record.minimumValue || '';
        document.getElementById('maximumValue').value = record.maximumValue || '';
        document.getElementById('defaultText').value = record.defaultText || '';
        
        // Populate audit fields
        document.getElementById('createdBy').value = record.createdBy || '';
        document.getElementById('modifiedBy').value = record.modifiedBy || '';
        document.getElementById('supervisedBy').value = record.supervisedBy || '';
        document.getElementById('createdOn').value = record.createdOn || '';
        document.getElementById('modifiedOn').value = record.modifiedOn || '';
        document.getElementById('supervisedOn').value = record.supervisedOn || '';
        
        setEditMode(false);
        showStatus('Record ' + (index + 1) + ' of ' + userDefinableFieldsData.length + ' loaded', 'info');
    }
}

function handleView() {
    if (!isEditMode) {
        showStatus('Viewing record ' + (currentRecordIndex + 1), 'info');
    }
}

function handleAdd() {
    clearForm();
    isEditMode = true;
    setEditMode(true);
    showStatus('Add new record', 'info');
}

function handleEdit() {
    if (!isEditMode) {
        isEditMode = true;
        setEditMode(true);
        showStatus('Edit mode activated', 'warning');
    }
}

function handleDelete() {
    if (confirm('Are you sure you want to delete this record?')) {
        userDefinableFieldsData.splice(currentRecordIndex, 1);
        if (userDefinableFieldsData.length > 0) {
            if (currentRecordIndex >= userDefinableFieldsData.length) {
                currentRecordIndex = userDefinableFieldsData.length - 1;
            }
            selectRecord(currentRecordIndex);
        } else {
            clearForm();
        }
        showStatus('Record deleted successfully', 'success');
    }
}

function handleSave() {
    if (!validateForm()) {
        showStatus('Please fill in all required fields', 'error');
        return;
    }

    if (isEditMode) {
        if (currentRecordIndex < userDefinableFieldsData.length) {
            // Update existing record
            userDefinableFieldsData[currentRecordIndex] = {
                id: userDefinableFieldsData[currentRecordIndex].id,
                fieldName: document.getElementById('fieldName').value,
                fieldCaption: document.getElementById('fieldCaption').value,
                valueTypeId: document.getElementById('valueTypeId').value,
                dataSource: document.getElementById('dataSource').value,
                maximumLength: document.getElementById('maximumLength').value,
                minimumValue: document.getElementById('minimumValue').value,
                maximumValue: document.getElementById('maximumValue').value,
                defaultText: document.getElementById('defaultText').value,
                createdBy: document.getElementById('createdBy').value,
                modifiedBy: document.getElementById('modifiedBy').value,
                supervisedBy: document.getElementById('supervisedBy').value,
                createdOn: document.getElementById('createdOn').value,
                modifiedOn: document.getElementById('modifiedOn').value,
                supervisedOn: document.getElementById('supervisedOn').value
            };
        } else {
            // Add new record
            const newRecord = {
                id: Math.max(...userDefinableFieldsData.map(r => r.id), 0) + 1,
                fieldName: document.getElementById('fieldName').value,
                fieldCaption: document.getElementById('fieldCaption').value,
                valueTypeId: document.getElementById('valueTypeId').value,
                dataSource: document.getElementById('dataSource').value,
                maximumLength: document.getElementById('maximumLength').value,
                minimumValue: document.getElementById('minimumValue').value,
                maximumValue: document.getElementById('maximumValue').value,
                defaultText: document.getElementById('defaultText').value,
                createdBy: 'System',
                modifiedBy: 'System',
                supervisedBy: 'Admin',
                createdOn: new Date().toISOString().split('T')[0],
                modifiedOn: new Date().toISOString().split('T')[0],
                supervisedOn: new Date().toISOString().split('T')[0]
            };
            userDefinableFieldsData.push(newRecord);
            currentRecordIndex = userDefinableFieldsData.length - 1;
        }

        isEditMode = false;
        setEditMode(false);
        showStatus('Record saved successfully', 'success');
    }
}

function handleCancel() {
    if (isEditMode) {
        isEditMode = false;
        setEditMode(false);
        if (currentRecordIndex < userDefinableFieldsData.length) {
            selectRecord(currentRecordIndex);
        } else {
            clearForm();
        }
        showStatus('Operation cancelled', 'warning');
    }
}

function handleLeftArrow() {
    if (currentRecordIndex > 0 && !isEditMode) {
        selectRecord(currentRecordIndex - 1);
    }
}

function handleRightArrow() {
    if (currentRecordIndex < userDefinableFieldsData.length - 1 && !isEditMode) {
        selectRecord(currentRecordIndex + 1);
    }
}

function handleFieldNameSearch() {
    const searchTerm = document.getElementById('fieldName').value.toLowerCase();
    const matches = userDefinableFieldsData.filter(r => 
        r.fieldName.toLowerCase().includes(searchTerm) || 
        r.fieldCaption.toLowerCase().includes(searchTerm)
    );

    if (matches.length > 0) {
        const index = userDefinableFieldsData.indexOf(matches[0]);
        selectRecord(index);
        showStatus('Found matching record', 'success');
    } else {
        showStatus('No matching records found', 'warning');
    }
}

function validateForm() {
    const fieldName = document.getElementById('fieldName').value.trim();
    const fieldCaption = document.getElementById('fieldCaption').value.trim();
    const valueTypeId = document.getElementById('valueTypeId').value;

    return fieldName && fieldCaption && valueTypeId;
}

function clearForm() {
    document.getElementById('fieldName').value = '';
    document.getElementById('fieldCaption').value = '';
    document.getElementById('valueTypeId').value = '';
    document.getElementById('dataSource').value = '';
    document.getElementById('maximumLength').value = '';
    document.getElementById('minimumValue').value = '';
    document.getElementById('maximumValue').value = '';
    document.getElementById('defaultText').value = '';
    
    document.getElementById('createdBy').value = '';
    document.getElementById('modifiedBy').value = '';
    document.getElementById('supervisedBy').value = '';
    document.getElementById('createdOn').value = '';
    document.getElementById('modifiedOn').value = '';
    document.getElementById('supervisedOn').value = '';
    
    currentRecordIndex = -1;
}

function setEditMode(mode) {
    const formControls = [
        'fieldName', 'fieldCaption', 'valueTypeId', 'dataSource',
        'maximumLength', 'minimumValue', 'maximumValue', 'defaultText'
    ];

    formControls.forEach(id => {
        const control = document.getElementById(id);
        if (mode) {
            control.removeAttribute('readonly');
            control.style.backgroundColor = 'var(--white)';
        } else {
            control.setAttribute('readonly', 'readonly');
            control.style.backgroundColor = 'var(--secondary)';
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
document.addEventListener('DOMContentLoaded', initializeUserDefinableFields);
