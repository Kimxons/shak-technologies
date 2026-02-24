// Identity Settings Module
document.addEventListener('DOMContentLoaded', initializeIdentitySettings);

// Form Control References
let identityFor = null;
let identityId = null;
let caption = null;
let format = null;
let formatRequired = null;
let mandatory = null;
let unique = null;
let tableBody = null;
let statusMsg = null;

// Button References
let btnNew = null;
let btnAlter = null;
let btnRemove = null;
let btnUpdate = null;
let btnClear = null;
let btnView = null;
let btnAdd = null;
let btnEdit = null;
let btnDelete = null;
let btnSave = null;
let btnCancel = null;

// Sample data storage
let identityRecords = [
    {
        id: 'ID001',
        caption: 'National ID',
        format: '^[0-9]{8}$',
        isMandatory: true,
        isUnique: true,
        cacheKeys: 'NATID'
    },
    {
        id: 'ID002',
        caption: 'Passport',
        format: '^[A-Z]{2}[0-9]{7}$',
        isMandatory: false,
        isUnique: true,
        cacheKeys: 'PASSPORT'
    }
];

let currentRecord = null;
let isEditMode = false;

function initializeIdentitySettings() {
    // Initialize form controls
    identityFor = document.getElementById('identityFor');
    identityId = document.getElementById('identityId');
    caption = document.getElementById('caption');
    format = document.getElementById('format');
    formatRequired = document.getElementById('formatRequired');
    mandatory = document.getElementById('mandatory');
    unique = document.getElementById('unique');
    tableBody = document.getElementById('tableBody');
    statusMsg = document.getElementById('statusMsg');

    // Initialize buttons
    btnNew = document.getElementById('btnNew');
    btnAlter = document.getElementById('btnAlter');
    btnRemove = document.getElementById('btnRemove');
    btnUpdate = document.getElementById('btnUpdate');
    btnClear = document.getElementById('btnClear');
    btnView = document.getElementById('btnView');
    btnAdd = document.getElementById('btnAdd');
    btnEdit = document.getElementById('btnEdit');
    btnDelete = document.getElementById('btnDelete');
    btnSave = document.getElementById('btnSave');
    btnCancel = document.getElementById('btnCancel');

    // Attach event listeners
    btnNew.addEventListener('click', handleNew);
    btnAlter.addEventListener('click', handleAlter);
    btnRemove.addEventListener('click', handleRemove);
    btnUpdate.addEventListener('click', handleUpdate);
    btnClear.addEventListener('click', handleClear);
    btnView.addEventListener('click', handleView);
    btnAdd.addEventListener('click', handleAdd);
    btnEdit.addEventListener('click', handleEdit);
    btnDelete.addEventListener('click', handleDelete);
    btnSave.addEventListener('click', handleSave);
    btnCancel.addEventListener('click', handleCancel);

    // Populate table
    populateTable();
    
    // Initialize sidebar navigation
    initializeSidebarNavigation();
}

function populateTable() {
    tableBody.innerHTML = '';
    
    if (identityRecords.length === 0) {
        tableBody.innerHTML = '<tr class="empty-row"><td colspan="6">No records found</td></tr>';
        return;
    }

    identityRecords.forEach(record => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${record.id}</td>
            <td>${record.caption}</td>
            <td>${record.format}</td>
            <td>${record.isMandatory ? 'Yes' : 'No'}</td>
            <td>${record.isUnique ? 'Yes' : 'No'}</td>
            <td>${record.cacheKeys}</td>
        `;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => selectRecord(record));
        tableBody.appendChild(row);
    });
}

function selectRecord(record) {
    currentRecord = record;
    identityId.value = record.id;
    caption.value = record.caption;
    format.value = record.format;
    mandatory.checked = record.isMandatory;
    unique.checked = record.isUnique;
    
    // Highlight row
    Array.from(tableBody.querySelectorAll('tr')).forEach(row => {
        row.style.backgroundColor = '';
    });
    event.currentTarget.style.backgroundColor = '#e3f2fd';
    
    showStatus('Record selected', 'info');
}

function handleNew() {
    isEditMode = false;
    clearForm();
    identityFor.focus();
    showStatus('New record mode', 'info');
}

function handleAlter() {
    if (!currentRecord) {
        showStatus('Please select a record to alter', 'warning');
        return;
    }
    isEditMode = true;
    identityId.disabled = true;
    showStatus('Altering record: ' + currentRecord.id, 'info');
}

function handleRemove() {
    if (!currentRecord) {
        showStatus('Please select a record to remove', 'warning');
        return;
    }
    
    if (confirm('Are you sure you want to delete this record?')) {
        identityRecords = identityRecords.filter(r => r.id !== currentRecord.id);
        populateTable();
        clearForm();
        showStatus('Record removed successfully', 'success');
    }
}

function handleUpdate() {
    if (!currentRecord) {
        showStatus('Please select a record to update', 'warning');
        return;
    }
    
    if (!validateForm()) {
        showStatus('Please fill all required fields', 'error');
        return;
    }
    
    currentRecord.caption = caption.value;
    currentRecord.format = format.value;
    currentRecord.isMandatory = mandatory.checked;
    currentRecord.isUnique = unique.checked;
    
    populateTable();
    clearForm();
    isEditMode = false;
    identityId.disabled = false;
    showStatus('Record updated successfully', 'success');
}

function handleClear() {
    clearForm();
    currentRecord = null;
    isEditMode = false;
    identityId.disabled = false;
    showStatus('Form cleared', 'info');
}

function handleView() {
    if (!currentRecord) {
        showStatus('Please select a record to view', 'warning');
        return;
    }
    showStatus('Viewing record: ' + currentRecord.id, 'info');
}

function handleAdd() {
    if (!validateForm()) {
        showStatus('Please fill all required fields', 'error');
        return;
    }
    
    const newId = 'ID' + String(identityRecords.length + 1).padStart(3, '0');
    const newRecord = {
        id: newId,
        caption: caption.value,
        format: format.value,
        isMandatory: mandatory.checked,
        isUnique: unique.checked,
        cacheKeys: caption.value.toUpperCase().replace(/\s+/g, '')
    };
    
    identityRecords.push(newRecord);
    populateTable();
    clearForm();
    showStatus('New record added successfully', 'success');
}

function handleEdit() {
    if (!currentRecord) {
        showStatus('Please select a record to edit', 'warning');
        return;
    }
    
    handleAlter();
}

function handleDelete() {
    if (!currentRecord) {
        showStatus('Please select a record to delete', 'warning');
        return;
    }
    
    handleRemove();
}

function handleSave() {
    if (!validateForm()) {
        showStatus('Please fill all required fields', 'error');
        return;
    }
    
    if (isEditMode && currentRecord) {
        handleUpdate();
    } else {
        handleAdd();
    }
}

function handleCancel() {
    clearForm();
    currentRecord = null;
    isEditMode = false;
    identityId.disabled = false;
    showStatus('Operation cancelled', 'info');
}

function validateForm() {
    const hasCaption = caption.value.trim() !== '';
    const hasFormat = format.value.trim() !== '';
    
    return hasCaption && hasFormat;
}

function clearForm() {
    identityFor.value = '';
    identityId.value = '';
    caption.value = '';
    format.value = '';
    formatRequired.checked = false;
    mandatory.checked = false;
    unique.checked = false;
    
    Array.from(tableBody.querySelectorAll('tr')).forEach(row => {
        row.style.backgroundColor = '';
    });
}

function showStatus(message, type = 'info') {
    statusMsg.textContent = message;
    statusMsg.className = `status ${type}`;
    
    // Auto-hide after 4 seconds
    setTimeout(() => {
        statusMsg.classList.add('hidden');
    }, 4000);
}

function toggleNav(button) {
    const items = button.nextElementSibling;
    button.classList.toggle('collapsed');
    items.classList.toggle('collapsed');
}

function navigateTo(module) {
    // In a real application, this would navigate to a different module
    showStatus('Navigating to ' + module, 'info');
}

// Initialize sidebar navigation
function initializeSidebarNavigation() {
    const toggleButtons = document.querySelectorAll('.nav-toggle');
    toggleButtons.forEach(button => {
        const items = button.nextElementSibling;
        if (items && items.classList.contains('nav-items')) {
            items.classList.remove('collapsed');
        }
    });
}
