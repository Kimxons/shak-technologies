// Sample data for Unlock User
const branchData = [
    { id: '0101', name: 'Head Office' },
    { id: '0102', name: 'Downtown Branch' },
    { id: '0103', name: 'Midtown Branch' },
    { id: '0104', name: 'Uptown Branch' },
    { id: '0105', name: 'Airport Branch' }
];

const operatorSessionData = [
    {
        branchId: '0101',
        operatorId: 'OP001',
        timeLoggedIn: '2024-01-20 10:30:45',
        ipAddress: '192.168.1.100',
        selected: false
    },
    {
        branchId: '0101',
        operatorId: 'OP002',
        timeLoggedIn: '2024-01-20 11:15:20',
        ipAddress: '192.168.1.101',
        selected: false
    },
    {
        branchId: '0101',
        operatorId: 'OP003',
        timeLoggedIn: '2024-01-20 09:45:10',
        ipAddress: '192.168.1.102',
        selected: false
    },
    {
        branchId: '0102',
        operatorId: 'OP004',
        timeLoggedIn: '2024-01-20 10:00:00',
        ipAddress: '192.168.2.100',
        selected: false
    },
    {
        branchId: '0102',
        operatorId: 'OP005',
        timeLoggedIn: '2024-01-20 14:20:30',
        ipAddress: '192.168.2.101',
        selected: false
    }
];

let currentBranchId = '0101';
let currentBranchName = 'Head Office';
let selectedOperators = [];

// Initialize the module
function initializeUnlockUser() {
    setupEventListeners();
    loadBranchData();
}

function setupEventListeners() {
    const branchIdInput = document.getElementById('branchId');
    
    branchIdInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearchBranch();
    });
    
    document.addEventListener('keydown', (e) => {
        if (e.altKey) {
            switch(e.key.toUpperCase()) {
                case 'V': handleView(); break;
                case 'P': handleProcess(); break;
                case 'C': handleCancel(); break;
            }
        }
    });
}

function loadBranchData() {
    // Load default branch
    document.getElementById('branchId').value = currentBranchId;
    document.getElementById('branchName').value = currentBranchName;
    loadOperatorSessions(currentBranchId);
}

function handleSearchBranch() {
    const branchId = document.getElementById('branchId').value.trim();
    
    if (!branchId) {
        showStatus('Please enter a Branch ID', 'error');
        return;
    }
    
    const branch = branchData.find(b => b.id === branchId);
    
    if (!branch) {
        showStatus(`Branch ID '${branchId}' not found`, 'error');
        document.getElementById('branchName').value = '';
        clearOperatorTable();
        return;
    }
    
    currentBranchId = branch.id;
    currentBranchName = branch.name;
    document.getElementById('branchName').value = currentBranchName;
    loadOperatorSessions(currentBranchId);
    showStatus(`Branch '${currentBranchName}' loaded successfully`, 'success');
}

function loadOperatorSessions(branchId) {
    const operators = operatorSessionData.filter(op => op.branchId === branchId);
    const tableBody = document.getElementById('operatorTableBody');
    
    if (operators.length === 0) {
        clearOperatorTable();
        return;
    }
    
    tableBody.innerHTML = '';
    operators.forEach((op, index) => {
        const row = document.createElement('tr');
        row.id = `row-${index}`;
        row.innerHTML = `
            <td style="width: 30px; text-align: center;">
                <input type="checkbox" onchange="handleRowSelection(${index})">
            </td>
            <td>${op.operatorId}</td>
            <td>${op.timeLoggedIn}</td>
            <td>${op.ipAddress}</td>
        `;
        tableBody.appendChild(row);
    });
    
    updateProcessButton();
}

function clearOperatorTable() {
    const tableBody = document.getElementById('operatorTableBody');
    tableBody.innerHTML = `
        <tr>
            <td colspan="4" style="text-align: center; padding: 20px; color: var(--text-gray);">
                No records to display
            </td>
        </tr>
    `;
    selectedOperators = [];
    updateProcessButton();
}

function handleSelectAll() {
    const selectAllCheckbox = document.getElementById('selectAll');
    const checkboxes = document.querySelectorAll('#operatorTableBody input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAllCheckbox.checked;
    });
    
    // Update selected operators list
    const operators = operatorSessionData.filter(op => op.branchId === currentBranchId);
    if (selectAllCheckbox.checked) {
        selectedOperators = [...operators];
    } else {
        selectedOperators = [];
    }
    
    updateProcessButton();
}

function handleRowSelection(index) {
    const operators = operatorSessionData.filter(op => op.branchId === currentBranchId);
    const checkbox = document.getElementById(`row-${index}`).querySelector('input[type="checkbox"]');
    
    if (checkbox.checked) {
        if (!selectedOperators.includes(operators[index])) {
            selectedOperators.push(operators[index]);
        }
    } else {
        selectedOperators = selectedOperators.filter(op => op !== operators[index]);
    }
    
    // Update select-all checkbox state
    const checkboxes = document.querySelectorAll('#operatorTableBody input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const someChecked = Array.from(checkboxes).some(cb => cb.checked);
    
    const selectAllCheckbox = document.getElementById('selectAll');
    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.indeterminate = someChecked && !allChecked;
    
    updateProcessButton();
}

function updateProcessButton() {
    const processBtn = document.querySelector('.action-button.process');
    processBtn.disabled = selectedOperators.length === 0;
}

function handleView() {
    if (!currentBranchId || selectedOperators.length === 0) {
        showStatus('Please select operators to view', 'error');
        return;
    }
    
    const operatorList = selectedOperators.map(op => op.operatorId).join(', ');
    showStatus(`Viewing ${selectedOperators.length} operator session(s): ${operatorList}`, 'info');
}

function handleProcess() {
    if (selectedOperators.length === 0) {
        showStatus('Please select operators to unlock', 'error');
        return;
    }
    
    const operatorIds = selectedOperators.map(op => op.operatorId);
    
    if (confirm(`Unlock ${selectedOperators.length} operator session(s)?\n\nOperators: ${operatorIds.join(', ')}`)) {
        // Process unlock
        const processedOperators = operatorIds.join(', ');
        
        // Remove from session data
        selectedOperators.forEach(op => {
            const index = operatorSessionData.indexOf(op);
            if (index > -1) {
                operatorSessionData.splice(index, 1);
            }
        });
        
        showStatus(`Successfully unlocked ${selectedOperators.length} operator session(s): ${processedOperators}`, 'success');
        
        // Clear selection and reload
        selectedOperators = [];
        loadOperatorSessions(currentBranchId);
        document.getElementById('selectAll').checked = false;
        updateProcessButton();
    }
}

function handleCancel() {
    if (selectedOperators.length > 0) {
        const confirmed = confirm(`Cancel unlock operation for ${selectedOperators.length} operator(s)?`);
        if (confirmed) {
            selectedOperators = [];
            const checkboxes = document.querySelectorAll('#operatorTableBody input[type="checkbox"]');
            checkboxes.forEach(checkbox => {
                checkbox.checked = false;
            });
            document.getElementById('selectAll').checked = false;
            updateProcessButton();
            showStatus('Operation cancelled', 'warning');
        }
    } else {
        showStatus('No operators selected to cancel', 'info');
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

function navigateTo(module) {
    console.log('Navigating to:', module);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeUnlockUser);
