// Sample bank process setting data
const bankProcessData = [
    {
        id: 'BPS001',
        name: 'Daily Close Process',
        subProcesses: [
            { name: 'GL Consolidation', required: true, prerequisite: '', dependant: 'Reconciliation' },
            { name: 'Reconciliation', required: true, prerequisite: 'GL Consolidation', dependant: 'Reports Generation' },
            { name: 'Reports Generation', required: false, prerequisite: 'Reconciliation', dependant: '' }
        ]
    },
    {
        id: 'BPS002',
        name: 'Month End Process',
        subProcesses: [
            { name: 'Interest Accrual', required: true, prerequisite: '', dependant: 'Fee Processing' },
            { name: 'Fee Processing', required: true, prerequisite: 'Interest Accrual', dependant: 'Balance Certification' },
            { name: 'Balance Certification', required: true, prerequisite: 'Fee Processing', dependant: '' }
        ]
    }
];

let currentProcess = null;
let isEditMode = false;

function initializeBankProcessSetting() {
    setupEventListeners();
}

function setupEventListeners() {
    const processIdInput = document.getElementById('processId');
    processIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleProcessSearch();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.altKey) {
            switch(e.key.toUpperCase()) {
                case 'V': handleView(); break;
                case 'E': handleEdit(); break;
                case 'D': handleDelete(); break;
                case 'S': handleSave(); break;
                case 'C': handleCancel(); break;
            }
        }
    });
}

function handleProcessSearch() {
    const processId = document.getElementById('processId').value.trim();
    
    if (!processId) {
        showStatus('Please enter a Process ID to search', 'error');
        return;
    }
    
    const process = bankProcessData.find(p => p.id === processId);
    
    if (!process) {
        showStatus(`Process ID '${processId}' not found`, 'error');
        clearForm();
        return;
    }
    
    currentProcess = JSON.parse(JSON.stringify(process));
    populateForm(process);
    loadSubProcesses(process.subProcesses);
    setEditMode(false);
    showStatus(`Process '${process.name}' loaded successfully`, 'success');
}

function populateForm(process) {
    document.getElementById('processId').value = process.id;
    document.getElementById('processName').value = process.name;
}

function loadSubProcesses(subProcesses) {
    const tableBody = document.getElementById('subProcessTableBody');
    
    if (!subProcesses || subProcesses.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-gray);">No records to display</td></tr>`;
        return;
    }
    
    tableBody.innerHTML = '';
    subProcesses.forEach(sp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><input type="checkbox" ${isEditMode ? '' : 'disabled'} ${sp.apply ? 'checked' : ''}></td>
            <td><input type="checkbox" ${isEditMode ? '' : 'disabled'} ${sp.required ? 'checked' : ''}></td>
            <td>${sp.name}</td>
            <td>${sp.prerequisite || '-'}</td>
            <td>${sp.dependant || '-'}</td>
        `;
        tableBody.appendChild(row);
    });
}

function clearForm() {
    document.getElementById('processId').value = '';
    document.getElementById('processName').value = '';
    loadSubProcesses([]);
    currentProcess = null;
    setEditMode(false);
}

function handleView() {
    if (!currentProcess) {
        showStatus('Please select a process first', 'error');
        return;
    }
    
    setEditMode(false);
    loadSubProcesses(currentProcess.subProcesses);
    showStatus(`Viewing process '${currentProcess.name}'`, 'info');
}

function handleEdit() {
    if (!currentProcess) {
        showStatus('Please select a process first', 'error');
        return;
    }
    
    setEditMode(true);
    showStatus(`Editing process '${currentProcess.name}'`, 'warning');
}

function handleDelete() {
    if (!currentProcess) {
        showStatus('Please select a process first', 'error');
        return;
    }
    
    if (confirm(`Delete process '${currentProcess.id}'?`)) {
        const index = bankProcessData.indexOf(currentProcess);
        if (index > -1) {
            bankProcessData.splice(index, 1);
        }
        clearForm();
        showStatus(`Process '${currentProcess.id}' deleted successfully`, 'success');
    }
}

function handleSave() {
    if (!currentProcess) {
        showStatus('Please select a process first', 'error');
        return;
    }
    
    // In a real scenario, would save checkbox states from table
    showStatus(`Process '${currentProcess.name}' settings saved successfully`, 'success');
    setEditMode(false);
    loadSubProcesses(currentProcess.subProcesses);
}

function handleCancel() {
    if (isEditMode) {
        loadSubProcesses(currentProcess.subProcesses);
        setEditMode(false);
        showStatus('Changes cancelled', 'warning');
    } else {
        clearForm();
        showStatus('Cancelled', 'info');
    }
}

function setEditMode(enabled) {
    isEditMode = enabled;
    const editBtn = document.querySelector('.action-button.edit');
    const deleteBtn = document.querySelector('.action-button.delete');
    const saveBtn = document.querySelector('.action-button.save');
    
    if (enabled) {
        editBtn.disabled = true;
        deleteBtn.disabled = true;
        saveBtn.disabled = false;
        loadSubProcesses(currentProcess.subProcesses);
    } else {
        editBtn.disabled = !currentProcess;
        deleteBtn.disabled = !currentProcess;
        saveBtn.disabled = true;
        loadSubProcesses(currentProcess ? currentProcess.subProcesses : []);
    }
}

function showStatus(message, type = 'info') {
    const statusMsg = document.getElementById('statusMsg');
    statusMsg.textContent = message;
    statusMsg.className = `status-message show status-${type}`;
    
    setTimeout(() => {
        statusMsg.classList.remove('show');
    }, 4000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeBankProcessSetting);

// Add the input-group-icon styling
const style = document.createElement('style');
style.textContent = `
    .input-group-icon {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        margin-left: -35px;
        color: var(--text-gray);
        cursor: pointer;
        transition: color 0.3s;
    }
    
    .input-group-icon:hover {
        color: var(--primary);
    }
    
    .field-control {
        display: flex;
        align-items: center;
        position: relative;
    }
    
    .field-control input {
        width: 100%;
    }
`;
document.head.appendChild(style);
