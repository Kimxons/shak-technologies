// Sample batch process data
const batchProcessData = [
    {
        branchId: '0101',
        branchName: 'Head Office',
        processDate: '2024-01-20',
        status: 'Completed',
        selected: false
    },
    {
        branchId: '0102',
        branchName: 'Downtown Branch',
        processDate: '2024-01-20',
        status: 'In Progress',
        selected: false
    },
    {
        branchId: '0103',
        branchName: 'Midtown Branch',
        processDate: '2024-01-20',
        status: 'Pending',
        selected: false
    }
];

let allRegionsMode = true;
let selectedBatches = [];

function initializeProcessManagerBatch() {
    setupEventListeners();
    loadBatchData();
}

function setupEventListeners() {
    document.addEventListener('keydown', (e) => {
        if (e.altKey) {
            switch(e.key.toUpperCase()) {
                case 'R': handleRefresh(); break;
                case 'V': handleView(); break;
                case 'C': handleContinue(); break;
            }
        }
    });
}

function handleAllRegionsChange() {
    allRegionsMode = document.getElementById('allRegions').checked;
    const regionInput = document.getElementById('regionId');
    const regionSearch = document.querySelector('[onclick="handleRegionSearch()"]');
    
    regionInput.disabled = allRegionsMode;
    regionSearch.parentElement.style.opacity = allRegionsMode ? '0.5' : '1';
    
    if (allRegionsMode) {
        regionInput.value = '';
        loadBatchData();
    }
}

function handleRegionSearch() {
    if (allRegionsMode) {
        showStatus('Search is disabled when "All Regions" is selected', 'warning');
        return;
    }
    showStatus('Region search is a UI stub in this prototype', 'info');
}

function handleProcessSearch() {
    const processId = document.getElementById('processId').value.trim();
    
    if (!processId) {
        showStatus('Please enter a Process ID to search', 'error');
        return;
    }
    
    showStatus(`Searching for processes matching '${processId}'`, 'info');
}

function loadBatchData() {
    const tableBody = document.getElementById('batchTableBody');
    
    if (batchProcessData.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-gray);">No records to display</td></tr>`;
        return;
    }
    
    tableBody.innerHTML = '';
    batchProcessData.forEach((batch, index) => {
        const row = document.createElement('tr');
        row.id = `batch-row-${index}`;
        row.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" onchange="handleRowSelection(${index})">
            </td>
            <td>${batch.branchId}</td>
            <td>${batch.branchName}</td>
            <td>${batch.processDate}</td>
            <td>${batch.status}</td>
        `;
        tableBody.appendChild(row);
    });
    
    updateSelectAllState();
}

function handleSelectAll() {
    const selectAll = document.getElementById('selectAll').checked;
    const checkboxes = document.querySelectorAll('#batchTableBody input[type="checkbox"]');
    
    checkboxes.forEach(checkbox => {
        checkbox.checked = selectAll;
    });
    
    if (selectAll) {
        selectedBatches = [...batchProcessData];
    } else {
        selectedBatches = [];
    }
    
    updateButtonStates();
}

function handleRowSelection(index) {
    const checkbox = document.getElementById(`batch-row-${index}`).querySelector('input[type="checkbox"]');
    
    if (checkbox.checked) {
        if (!selectedBatches.includes(batchProcessData[index])) {
            selectedBatches.push(batchProcessData[index]);
        }
    } else {
        selectedBatches = selectedBatches.filter(b => b !== batchProcessData[index]);
    }
    
    updateSelectAllState();
}

function updateSelectAllState() {
    const checkboxes = document.querySelectorAll('#batchTableBody input[type="checkbox"]');
    const allChecked = Array.from(checkboxes).every(cb => cb.checked);
    const someChecked = Array.from(checkboxes).some(cb => cb.checked);
    
    const selectAllCheckbox = document.getElementById('selectAll');
    selectAllCheckbox.checked = allChecked;
    selectAllCheckbox.indeterminate = someChecked && !allChecked;
    
    updateButtonStates();
}

function updateButtonStates() {
    const refreshBtn = document.querySelector('.action-button.refresh');
    const continueBtn = document.querySelector('.action-button.continue');
    
    refreshBtn.disabled = selectedBatches.length === 0;
    continueBtn.disabled = selectedBatches.length === 0;
}

function handleRefresh() {
    if (selectedBatches.length === 0) {
        showStatus('Please select batch processes to refresh', 'error');
        return;
    }
    
    showStatus(`Refreshed ${selectedBatches.length} batch process(es)`, 'success');
}

function handleView() {
    if (selectedBatches.length === 0) {
        showStatus('Please select batch processes to view', 'error');
        return;
    }
    
    showStatus(`Viewing ${selectedBatches.length} batch process(es)`, 'info');
}

function handleContinue() {
    if (selectedBatches.length === 0) {
        showStatus('Please select batch processes to continue', 'error');
        return;
    }
    
    selectedBatches.forEach(batch => {
        if (batch.status === 'In Progress') {
            batch.status = 'Completed';
        } else if (batch.status === 'Pending') {
            batch.status = 'In Progress';
        }
    });
    
    loadBatchData();
    selectedBatches = [];
    showStatus(`Continued ${selectedBatches.length} batch process(es)`, 'success');
}

function handleCancel() {
    selectedBatches = [];
    document.getElementById('selectAll').checked = false;
    const checkboxes = document.querySelectorAll('#batchTableBody input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
        checkbox.checked = false;
    });
    updateButtonStates();
    showStatus('Batch selection cancelled', 'info');
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
document.addEventListener('DOMContentLoaded', initializeProcessManagerBatch);

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
