// Process configuration mapping
const processMap = {
    'process-manager': {
        name: 'Process Manager',
        modalId: 'processManagerModal',
        path: 'process-manager-new.html'
    },
    'process-manager-batch': {
        name: 'Process Manager-Batch',
        modalId: 'processManagerBatchModal',
        path: 'process-manager-batch-new.html'
    },
    'loan-balancing': {
        name: 'Loan Balancing',
        modalId: 'loanBalancingModal',
        path: 'loan-balancing-new.html'
    },
    'bank-process-setting': {
        name: 'Bank Process Setting',
        modalId: 'bankProcessSettingModal',
        path: 'bank-process-setting-new.html'
    },
    'system-exception-overriding': {
        name: 'System Exception Overriding',
        modalId: 'systemExceptionOverridingModal',
        path: 'system-exception-overriding-new.html'
    }
};

let selectedProcess = null;

function initializeOtherProcesses() {
    setupEventListeners();
}

function setupEventListeners() {
    const selector = document.getElementById('processSelector');
    selector.addEventListener('change', handleProcessSelection);
    
    document.addEventListener('keydown', (e) => {
        if (e.altKey && e.key.toUpperCase() === 'P') {
            handleProcess();
        }
    });
}

function handleProcessSelection() {
    const selector = document.getElementById('processSelector');
    const selectedValue = selector.value;
    const workspace = document.getElementById('workspace');
    
    if (!selectedValue) {
        selectedProcess = null;
        workspace.style.display = 'none';
        showStatus('Please select a process', 'warning');
        return;
    }
    
    selectedProcess = processMap[selectedValue];
    
    if (selectedProcess) {
        // Show workspace area
        workspace.style.display = 'block';
        workspace.innerHTML = `
            <div style="text-align: center; padding: 40px;">
                <i class="bi bi-hourglass-split" style="font-size: 48px; color: var(--primary); margin-bottom: 16px; animation: spin 2s linear infinite;"></i>
                <p style="font-size: 14px; color: var(--text-gray);">Loading ${selectedProcess.name}...</p>
            </div>
        `;
        
        // In a real scenario, would load the process module
        loadProcessModule(selectedValue);
        showStatus(`${selectedProcess.name} selected`, 'info');
    }
}

function loadProcessModule(processKey) {
    const workspace = document.getElementById('workspace');
    const process = processMap[processKey];
    
    if (!process) {
        workspace.innerHTML = `<p style="color: var(--danger);">Process module not found</p>`;
        return;
    }
    
    // Simulate loading delay
    setTimeout(() => {
        workspace.innerHTML = `
            <div style="background: var(--secondary); padding: 16px; border-radius: 3px; border-left: 4px solid var(--primary);">
                <p style="font-weight: 600; color: var(--text-dark); margin-bottom: 8px;">
                    <i class="bi bi-check-circle" style="color: var(--success); margin-right: 8px;"></i>
                    ${process.name} Module Loaded
                </p>
                <p style="font-size: 13px; color: var(--text-gray);">
                    Ready to process. Click the Process button to execute the selected process.
                </p>
            </div>
        `;
    }, 800);
}

function handleProcess() {
    const selector = document.getElementById('processSelector');
    
    if (!selectedProcess) {
        showStatus('Please select a process first', 'error');
        return;
    }
    
    // Trigger process execution
    executeProcess(selectedProcess.modalId, selectedProcess.name);
}

function executeProcess(modalId, processName) {
    showStatus(`Executing ${processName}...`, 'warning');
    
    // In a real scenario, would trigger the actual process module
    // This could involve:
    // 1. Opening a modal dialog with the form
    // 2. Initializing the process module
    // 3. Setting up event handlers
    
    setTimeout(() => {
        showStatus(`${processName} is now ready for processing`, 'success');
    }, 1500);
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
document.addEventListener('DOMContentLoaded', initializeOtherProcesses);

// Add CSS animation for loading spinner
const style = document.createElement('style');
style.textContent = `
    @keyframes spin {
        from { transform: rotate(0deg); }
        to { transform: rotate(360deg); }
    }
    
    .spinner {
        animation: spin 2s linear infinite;
    }
`;
document.head.appendChild(style);
