// User Report Grouping - Main JavaScript

// DOM Elements
const viewBtn = document.getElementById('viewBtn');
const addBtn = document.getElementById('addBtn');
const editBtn = document.getElementById('editBtn');
const deleteBtn = document.getElementById('deleteBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Central Buttons
const newBtn = document.getElementById('newBtn');
const removeBtn = document.getElementById('removeBtn');
const updateBtn = document.getElementById('updateBtn');
const clearBtn = document.getElementById('clearBtn');

// Search Buttons
const searchCenterBtn = document.getElementById('searchCenterBtn');
const searchReportBtn = document.getElementById('searchReportBtn');

// Form Elements
const centerId = document.getElementById('centerId');
const description = document.getElementById('description');
const reportId = document.getElementById('reportId');

// Table
const groupingTableBody = document.getElementById('groupingTableBody');

// Data Storage
let reportGroupings = [];
let currentEditIndex = -1;

// Event Listeners - Top Action Bar
viewBtn.addEventListener('click', viewGroupings);
addBtn.addEventListener('click', addGrouping);
editBtn.addEventListener('click', enableEdit);
deleteBtn.addEventListener('click', deleteSelected);
saveBtn.addEventListener('click', saveGrouping);
cancelBtn.addEventListener('click', resetForm);

// Event Listeners - Central Buttons
newBtn.addEventListener('click', createNew);
removeBtn.addEventListener('click', removeGrouping);
updateBtn.addEventListener('click', updateGrouping);
clearBtn.addEventListener('click', clearForm);

// Event Listeners - Search Buttons
searchCenterBtn.addEventListener('click', searchCenter);
searchReportBtn.addEventListener('click', searchReport);

// Initialize
document.addEventListener('DOMContentLoaded', () => {
    renderTable();
    setFormState('view');
});

function createNew() {
    setFormState('create');
    clearForm();
    centerId.focus();
}

function addGrouping() {
    if (!validateForm()) return;

    const newGrouping = {
        id: reportGroupings.length + 1,
        centerId: centerId.value.trim(),
        description: description.value.trim(),
        reportId: reportId.value.trim(),
        createdDate: new Date().toISOString().split('T')[0],
        selected: false
    };

    reportGroupings.push(newGrouping);
    renderTable();
    clearForm();
    showMessage('Report grouping added successfully!', 'success');
}

function enableEdit() {
    const selectedRows = reportGroupings.filter(g => g.selected);
    if (selectedRows.length === 0) {
        showMessage('Please select a row to edit', 'warning');
        return;
    }
    if (selectedRows.length > 1) {
        showMessage('Please select only one row to edit', 'warning');
        return;
    }

    const grouping = selectedRows[0];
    currentEditIndex = reportGroupings.findIndex(g => g.id === grouping.id);
    
    centerId.value = grouping.centerId;
    description.value = grouping.description;
    reportId.value = grouping.reportId;
    
    setFormState('edit');
}

function updateGrouping() {
    if (currentEditIndex === -1) {
        showMessage('No record selected for update', 'warning');
        return;
    }

    if (!validateForm()) return;

    reportGroupings[currentEditIndex] = {
        ...reportGroupings[currentEditIndex],
        centerId: centerId.value.trim(),
        description: description.value.trim(),
        reportId: reportId.value.trim()
    };

    renderTable();
    clearForm();
    currentEditIndex = -1;
    setFormState('view');
    showMessage('Report grouping updated successfully!', 'success');
}

function removeGrouping() {
    const selectedRows = reportGroupings.filter(g => g.selected);
    if (selectedRows.length === 0) {
        showMessage('Please select at least one row to remove', 'warning');
        return;
    }

    if (confirm(`Are you sure you want to remove ${selectedRows.length} grouping(s)?`)) {
        reportGroupings = reportGroupings.filter(g => !g.selected);
        renderTable();
        clearForm();
        showMessage('Selected groupings removed successfully!', 'success');
    }
}

function deleteSelected() {
    removeGrouping();
}

function saveGrouping() {
    if (currentEditIndex !== -1) {
        updateGrouping();
    } else {
        addGrouping();
    }
}

function viewGroupings() {
    renderTable();
    setFormState('view');
}

function clearForm() {
    centerId.value = '';
    description.value = '';
    reportId.value = '';
    currentEditIndex = -1;
}

function resetForm() {
    clearForm();
    setFormState('view');
    reportGroupings.forEach(g => g.selected = false);
    renderTable();
}

function searchCenter() {
    // Center search functionality - to be implemented with real data
    showMessage('Center search feature - connect to backend', 'info');
}

function searchReport() {
    // Report search functionality - to be implemented with real data
    showMessage('Report search feature - connect to backend', 'info');
}

function validateForm() {
    if (!centerId.value.trim()) {
        showMessage('Center ID is required', 'error');
        centerId.focus();
        return false;
    }

    if (!reportId.value.trim()) {
        showMessage('Report ID is required', 'error');
        reportId.focus();
        return false;
    }

    return true;
}

function renderTable() {
    groupingTableBody.innerHTML = '';

    if (reportGroupings.length === 0) {
        groupingTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="6">No report groupings to display. Click "New" to create one.</td>
            </tr>
        `;
        return;
    }

    reportGroupings.forEach((grouping, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>
                <input type="checkbox" class="table-checkbox" 
                    ${grouping.selected ? 'checked' : ''} 
                    onchange="toggleSelection(${grouping.id})">
            </td>
            <td>${grouping.centerId}</td>
            <td>${grouping.description || '--'}</td>
            <td>${grouping.reportId}</td>
            <td>${grouping.createdDate}</td>
            <td>
                <button class="table-action-btn btn-edit-row" onclick="editRow(${grouping.id})">
                    <i class="bi bi-pencil"></i> Edit
                </button>
                <button class="table-action-btn btn-delete-row" onclick="deleteRow(${grouping.id})">
                    <i class="bi bi-trash"></i> Delete
                </button>
            </td>
        `;
        groupingTableBody.appendChild(row);
    });
}

function toggleSelection(id) {
    const grouping = reportGroupings.find(g => g.id === id);
    if (grouping) {
        grouping.selected = !grouping.selected;
    }
}

function editRow(id) {
    reportGroupings.forEach(g => g.selected = false);
    const grouping = reportGroupings.find(g => g.id === id);
    if (grouping) {
        grouping.selected = true;
        enableEdit();
    }
}

function deleteRow(id) {
    if (confirm('Are you sure you want to delete this grouping?')) {
        reportGroupings = reportGroupings.filter(g => g.id !== id);
        renderTable();
        showMessage('Grouping deleted successfully!', 'success');
    }
}

function setFormState(state) {
    const isView = state === 'view';
    const isEdit = state === 'edit';
    const isCreate = state === 'create';

    centerId.disabled = isView;
    description.disabled = isView;
    reportId.disabled = isView;

    // Enable/disable buttons based on state
    newBtn.disabled = !isView;
    updateBtn.disabled = !isEdit;
    saveBtn.disabled = isView;
}

function showMessage(message, type) {
    // Simple alert for now - can be replaced with toast notifications
    const icon = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };

    alert(`${icon[type] || ''} ${message}`);
}
