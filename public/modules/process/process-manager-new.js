// Sample process data
const processData = [
    {
        id: 'PM001',
        name: 'Daily Close Process',
        branchId: '0101',
        branchName: 'Head Office',
        processDate: '2024-01-20',
        status: 'In Progress',
        subProcesses: [
            { name: 'GL Consolidation', status: 'Completed' },
            { name: 'Reconciliation', status: 'In Progress' },
            { name: 'Reports Generation', status: 'Pending' }
        ]
    },
    {
        id: 'PM002',
        name: 'Month End Process',
        branchId: '0102',
        branchName: 'Downtown Branch',
        processDate: '2024-01-31',
        status: 'Completed',
        subProcesses: [
            { name: 'Interest Accrual', status: 'Completed' },
            { name: 'Fee Processing', status: 'Completed' },
            { name: 'Balance Certification', status: 'Completed' }
        ]
    }
];

let currentProcess = null;
let selectedProcessIndex = -1;

function initializeProcessManager() {
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
                case 'R': handleRefresh(); break;
                case 'V': handleView(); break;
                case 'C': handleContinue(); break;
                case 'D': handleDelete(); break;
            }
        }
    });
}

function handleBranchSearch() {
    showStatus('Branch search is a UI stub in this prototype', 'info');
}

function handleProcessSearch() {
    const processId = document.getElementById('processId').value.trim();
    
    if (!processId) {
        showStatus('Please enter a Process ID to search', 'error');
        return;
    }
    
    const process = processData.find(p => p.id === processId);
    
    if (!process) {
        showStatus(`Process ID '${processId}' not found`, 'error');
        clearForm();
        return;
    }
    
    selectedProcessIndex = processData.indexOf(process);
    currentProcess = JSON.parse(JSON.stringify(process));
    populateForm(process);
    loadSubProcesses(process.subProcesses);
    showStatus(`Process '${process.name}' loaded successfully`, 'success');
}

function populateForm(process) {
    document.getElementById('branchId').value = process.branchId;
    document.getElementById('branchName').value = process.branchName;
    document.getElementById('processId').value = process.id;
    document.getElementById('processName').value = process.name;
    document.getElementById('processDate').value = process.processDate;
    document.getElementById('processStatus').value = process.status;
}

function loadSubProcesses(subProcesses) {
    const tableBody = document.getElementById('subProcessTableBody');
    
    if (!subProcesses || subProcesses.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="2" style="text-align: center; padding: 20px; color: var(--text-gray);">No records to display</td></tr>`;
        return;
    }
    
    tableBody.innerHTML = '';
    subProcesses.forEach(sp => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${sp.name}</td>
            <td>${sp.status}</td>
        `;
        tableBody.appendChild(row);
    });
}

function clearForm() {
    document.getElementById('branchId').value = '0101';
    document.getElementById('branchName').value = 'Head Office';
    document.getElementById('processId').value = '';
    document.getElementById('processName').value = '';
    document.getElementById('processDate').value = '';
    document.getElementById('processStatus').value = '';
    loadSubProcesses([]);
    currentProcess = null;
    selectedProcessIndex = -1;
}

function handleRefresh() {
    if (!currentProcess) {
        showStatus('Please select a process first', 'error');
        return;
    }
    
    const process = processData.find(p => p.id === currentProcess.id);
    if (process) {
        currentProcess = JSON.parse(JSON.stringify(process));
        populateForm(process);
        loadSubProcesses(process.subProcesses);
        showStatus(`Process '${process.name}' refreshed`, 'info');
    }
}

function handleView() {
    if (!currentProcess) {
        showStatus('Please select a process first', 'error');
        return;
    }
    
    showStatus(`Viewing process '${currentProcess.name}' (ID: ${currentProcess.id})`, 'info');
}

function handleContinue() {
    if (!currentProcess) {
        showStatus('Please select a process first', 'error');
        return;
    }
    
    if (currentProcess.status === 'In Progress') {
        currentProcess.status = 'Completed';
        document.getElementById('processStatus').value = currentProcess.status;
        showStatus(`Process '${currentProcess.name}' continued and marked as completed`, 'success');
    } else {
        showStatus('Process is already completed or not in progress', 'warning');
    }
}

function handleDelete() {
    if (!currentProcess) {
        showStatus('Please select a process first', 'error');
        return;
    }
    
    if (confirm(`Delete process '${currentProcess.id}'?`)) {
        const index = processData.indexOf(currentProcess);
        if (index > -1) {
            processData.splice(index, 1);
        }
        clearForm();
        showStatus(`Process '${currentProcess.id}' deleted successfully`, 'success');
    }
}

function handleCancel() {
    clearForm();
    showStatus('Process selection cancelled', 'info');
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
document.addEventListener('DOMContentLoaded', initializeProcessManager);

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
