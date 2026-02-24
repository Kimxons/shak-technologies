// Repayment Accounts Modal JavaScript

// State management
let repaymentAccounts = [];
let selectedAccountIndex = null;
let isEditMode = false;
let loanApplicationData = null;

// Listen for messages from parent window
window.addEventListener('message', function(event) {
    console.log('Repayment Accounts received message:', event.data);
    
    if (event.data.action === 'populateFromParent' && event.data.data) {
        loanApplicationData = event.data.data;
        console.log('Received loan application data:', loanApplicationData);
        // Fetch repayment accounts for this application
        if (loanApplicationData.applicationId) {
            fetchRepaymentAccounts();
        }
    }
});

document.addEventListener('DOMContentLoaded', async function() {
    console.log('Repayment Accounts modal DOM loaded');
    
    // Load service first
    try {
        if (window.ServiceLoader) {
            await ServiceLoader.loadRepaymentAccountsService();
            console.log('Repayment Accounts service loaded');
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }

    // Try to get data from parent window with polling (wait for parent to be ready)
    function tryGetParentData(attempts = 0) {
        if (loanApplicationData) return; // Already have data
        
        const maxAttempts = 20; // Try for up to 2 seconds (20 * 100ms)
        let parentWindow = window.parent;
        
        // First try direct parent (loan-application.html)
        if (parentWindow && parentWindow.getLoanApplicationData) {
            loanApplicationData = parentWindow.getLoanApplicationData();
            console.log('Got loan application data from parent:', loanApplicationData);
            if (loanApplicationData && loanApplicationData.applicationId) {
                fetchRepaymentAccounts();
            }
            return;
        }
        
        // If not found on direct parent, try one level up (for nested iframes)
        if (parentWindow && parentWindow.parent && parentWindow.parent !== parentWindow && parentWindow.parent.getLoanApplicationData) {
            loanApplicationData = parentWindow.parent.getLoanApplicationData();
            console.log('Got loan application data from grandparent:', loanApplicationData);
            if (loanApplicationData && loanApplicationData.applicationId) {
                fetchRepaymentAccounts();
            }
            return;
        }
        
        // Retry if we haven't exceeded max attempts
        if (attempts < maxAttempts) {
            setTimeout(() => tryGetParentData(attempts + 1), 100);
        } else {
            console.warn('Could not access parent getLoanApplicationData function after multiple attempts');
        }
    }
    
    // Start polling for parent data
    tryGetParentData();

    // DOM Elements
    const isRepaymentAccountCheckbox = document.getElementById('isRepaymentAccount');
    const isMainRepaymentAccountCheckbox = document.getElementById('isMainRepaymentAccount');
    const recoveryOrderInput = document.getElementById('recoveryOrder');
    const tableBody = document.getElementById('repaymentAccountsTableBody');
    
    // Buttons
    const alterBtn = document.getElementById('alterBtn');
    const updateBtn = document.getElementById('updateBtn');
    const clearBtn = document.getElementById('clearBtn');
    const editBtn = document.getElementById('editBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const backBtn = document.getElementById('backBtn');

    // Initialize
    init();

    // Fetch repayment accounts from backend
    async function fetchRepaymentAccounts() {
        if (!loanApplicationData || !loanApplicationData.applicationId) {
            console.warn('No application data available for fetching repayment accounts');
            return;
        }

        try {
            console.log('Fetching repayment accounts for:', loanApplicationData);

            const requestData = {
                OurBranchID: loanApplicationData.branchId || '',
                AccountID: loanApplicationData.accountId || '',
                LoanSeries: loanApplicationData.loanSeries || '',
                ApplicationID: loanApplicationData.applicationId || '',
                OperatorID: 'OperatorID' // Should come from session
            };

            console.log('Request data:', requestData);
            const response = await RepaymentAccountsService.getRepaymentAccounts(requestData);
            console.log('Repayment accounts response:', response);

            if (response) {
                // Handle Details array (main repayment account info)
                if (response.Details && response.Details.length > 0) {
                    const detail = response.Details[0];
                    
                    // Populate Behind The Scene section
                    const modifiedByEl = document.getElementById('modifiedBy');
                    const modifiedOnEl = document.getElementById('modifiedOn');
                    const supervisedByEl = document.getElementById('supervisedBy');
                    const supervisedOnEl = document.getElementById('supervisedOn');
                    
                    if (modifiedByEl) modifiedByEl.value = detail.OperatorID || '';
                    if (modifiedOnEl) modifiedOnEl.value = detail.CreatedOn || '';
                    if (supervisedByEl) supervisedByEl.value = '';
                    if (supervisedOnEl) supervisedOnEl.value = '';
                    
                    console.log('Populated Behind The Scene data:', detail);
                }
                
                // Handle Details01 array (list of repayment accounts)
                if (response.Details01 && response.Details01.length > 0) {
                    repaymentAccounts = response.Details01.map(account => ({
                        accountId: account.AccountID || '',
                        accountName: account.AccountName || '',
                        isRepaymentAccount: account.IsRepaymentAccount === 'Y' || account.IsRepaymentAccount === true,
                        isMainRepaymentAccount: account.IsMainRepaymentAccount === 'Y' || account.IsMainRepaymentAccount === true,
                        recoveryOrder: account.RecoveryOrder || '',
                        modifiedBy: account.ModifiedBy || '',
                        modifiedOn: account.ModifiedOn || '',
                        supervisedBy: account.SupervisedBy || '',
                        supervisedOn: account.SupervisedOn || ''
                    }));
                    renderTable();
                    showNotification('Repayment accounts loaded successfully', 'success');
                } else {
                    console.log('No repayment accounts found in Details01');
                    repaymentAccounts = [];
                    renderTable();
                    showNotification('No repayment accounts found for this application', 'info');
                }
            } else {
                console.log('No response data');
                repaymentAccounts = [];
                renderTable();
                showNotification('No data returned from server', 'info');
            }
        } catch (error) {
            console.error('Error fetching repayment accounts:', error);
            showNotification('Error loading repayment accounts: ' + (error.message || 'Unknown error'), 'error');
        }
    }

    function init() {
        setupEventListeners();
        loadRepaymentAccounts();
        updateButtonStates();
    }

    function setupEventListeners() {
        // Form buttons
        alterBtn.addEventListener('click', handleAlter);
        updateBtn.addEventListener('click', handleUpdate);
        clearBtn.addEventListener('click', handleClear);
        
        // Action buttons
        editBtn.addEventListener('click', handleEdit);
        saveBtn.addEventListener('click', handleSave);
        cancelBtn.addEventListener('click', handleCancel);
        backBtn.addEventListener('click', handleBack);

        // Table row selection
        tableBody.addEventListener('click', handleTableRowClick);

        // Checkbox logic - only one can be main
        isMainRepaymentAccountCheckbox.addEventListener('change', function() {
            if (this.checked) {
                isRepaymentAccountCheckbox.checked = true;
            }
        });
    }

    function handleAlter() {
        // Open account search modal
        const modal = new bootstrap.Modal(document.getElementById('accountSearchModal'));
        modal.show();
        loadAccountSearchResults();
    }

    function handleUpdate() {
        if (!validateForm()) {
            return;
        }

        const accountData = getFormData();

        if (selectedAccountIndex !== null) {
            // Update existing account
            repaymentAccounts[selectedAccountIndex] = accountData;
            showNotification('Repayment account updated successfully', 'success');
        } else {
            // Add new account
            repaymentAccounts.push(accountData);
            showNotification('Repayment account added successfully', 'success');
        }

        renderTable();
        handleClear();
    }

    function handleClear() {
        isRepaymentAccountCheckbox.checked = false;
        isMainRepaymentAccountCheckbox.checked = false;
        recoveryOrderInput.value = '';
        selectedAccountIndex = null;
        
        // Clear table selection
        const rows = tableBody.querySelectorAll('tr');
        rows.forEach(row => row.classList.remove('selected'));
    }

    function handleEdit() {
        isEditMode = true;
        enableForm();
        updateButtonStates();
    }

    function handleSave() {
        // Save to backend/localStorage
        try {
            localStorage.setItem('loanRepaymentAccounts', JSON.stringify(repaymentAccounts));
            showNotification('Changes saved successfully', 'success');
            isEditMode = false;
            disableForm();
            updateButtonStates();
        } catch (error) {
            showNotification('Error saving changes: ' + error.message, 'error');
        }
    }

    function handleCancel() {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            loadRepaymentAccounts();
            handleClear();
            isEditMode = false;
            disableForm();
            updateButtonStates();
        }
    }

    function handleBack() {
        if (window.parent) {
            window.parent.postMessage({ action: 'closeRepaymentAccountsModal' }, '*');
        }
    }

    function handleTableRowClick(event) {
        const row = event.target.closest('tr');
        if (!row || row.querySelector('.no-records')) return;

        const index = parseInt(row.dataset.index);
        if (isNaN(index)) return;

        selectedAccountIndex = index;
        
        // Remove previous selection
        tableBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
        row.classList.add('selected');

        // Populate form
        const account = repaymentAccounts[index];
        isRepaymentAccountCheckbox.checked = account.isRepaymentAccount;
        isMainRepaymentAccountCheckbox.checked = account.isMainRepaymentAccount;
        recoveryOrderInput.value = account.recoveryOrder;
    }

    function loadRepaymentAccounts() {
        try {
            const stored = localStorage.getItem('loanRepaymentAccounts');
            repaymentAccounts = stored ? JSON.parse(stored) : [];
            renderTable();
        } catch (error) {
            console.error('Error loading repayment accounts:', error);
            repaymentAccounts = [];
        }
    }

    function renderTable() {
        if (repaymentAccounts.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="no-records">No records to display.</td></tr>';
            return;
        }

        tableBody.innerHTML = repaymentAccounts.map((account, index) => `
            <tr data-index="${index}">
                <td>
                    <i class="bi ${account.isRepaymentAccount ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-muted'}"></i>
                </td>
                <td>${account.accountId}</td>
                <td>${account.accountName}</td>
                <td>
                    <i class="bi ${account.isMainRepaymentAccount ? 'bi-check-circle-fill text-success' : 'bi-x-circle text-muted'}"></i>
                </td>
                <td>${account.recoveryOrder || '-'}</td>
            </tr>
        `).join('');
    }

    function getFormData() {
        return {
            isRepaymentAccount: isRepaymentAccountCheckbox.checked,
            isMainRepaymentAccount: isMainRepaymentAccountCheckbox.checked,
            recoveryOrder: recoveryOrderInput.value,
            accountId: selectedAccountIndex !== null ? repaymentAccounts[selectedAccountIndex].accountId : '',
            accountName: selectedAccountIndex !== null ? repaymentAccounts[selectedAccountIndex].accountName : '',
            modifiedBy: 'CSADM',
            modifiedOn: new Date().toISOString(),
            supervisedBy: '',
            supervisedOn: ''
        };
    }

    function validateForm() {
        if (!isRepaymentAccountCheckbox.checked && !isMainRepaymentAccountCheckbox.checked) {
            showNotification('Please select at least one account type', 'warning');
            return false;
        }

        if (isMainRepaymentAccountCheckbox.checked) {
            // Check if another account is already set as main
            const hasMain = repaymentAccounts.some((acc, idx) => 
                acc.isMainRepaymentAccount && idx !== selectedAccountIndex
            );
            
            if (hasMain) {
                showNotification('Only one account can be set as Main Repayment Account', 'warning');
                return false;
            }
        }

        if (recoveryOrderInput.value && parseInt(recoveryOrderInput.value) < 0) {
            showNotification('Recovery order must be a positive number', 'warning');
            return false;
        }

        return true;
    }

    function enableForm() {
        isRepaymentAccountCheckbox.disabled = false;
        isMainRepaymentAccountCheckbox.disabled = false;
        recoveryOrderInput.disabled = false;
        alterBtn.disabled = false;
        updateBtn.disabled = false;
        clearBtn.disabled = false;
    }

    function disableForm() {
        isRepaymentAccountCheckbox.disabled = true;
        isMainRepaymentAccountCheckbox.disabled = true;
        recoveryOrderInput.disabled = true;
        alterBtn.disabled = true;
        updateBtn.disabled = true;
        clearBtn.disabled = true;
    }

    function updateButtonStates() {
        if (isEditMode) {
            editBtn.style.display = 'none';
            saveBtn.style.display = 'flex';
            cancelBtn.style.display = 'flex';
            enableForm();
        } else {
            editBtn.style.display = 'flex';
            saveBtn.style.display = 'none';
            cancelBtn.style.display = 'none';
            disableForm();
        }
    }

    function loadAccountSearchResults() {
        // Mock data - replace with actual API call
        const searchResults = document.getElementById('accountSearchResults');
        const mockAccounts = [
            { id: 'ACC001', name: 'Savings Account - Primary', type: 'Savings', balance: '25,000.00' },
            { id: 'ACC002', name: 'Current Account', type: 'Current', balance: '15,500.00' },
            { id: 'ACC003', name: 'Fixed Deposit Account', type: 'Fixed Deposit', balance: '100,000.00' }
        ];

        searchResults.innerHTML = mockAccounts.map(account => `
            <tr onclick="selectAccount('${account.id}', '${account.name}')">
                <td>${account.id}</td>
                <td>${account.name}</td>
                <td>${account.type}</td>
                <td>${account.balance}</td>
                <td>
                    <button class="btn btn-sm btn-primary">
                        <i class="bi bi-check"></i> Select
                    </button>
                </td>
            </tr>
        `).join('');
    }

    // Global function for account selection
    window.selectAccount = function(accountId, accountName) {
        const accountData = {
            isRepaymentAccount: isRepaymentAccountCheckbox.checked,
            isMainRepaymentAccount: isMainRepaymentAccountCheckbox.checked,
            recoveryOrder: recoveryOrderInput.value,
            accountId: accountId,
            accountName: accountName,
            modifiedBy: 'CSADM',
            modifiedOn: new Date().toISOString(),
            supervisedBy: '',
            supervisedOn: ''
        };

        if (selectedAccountIndex !== null) {
            repaymentAccounts[selectedAccountIndex] = accountData;
        } else {
            repaymentAccounts.push(accountData);
        }

        renderTable();
        
        // Close modal
        const modal = bootstrap.Modal.getInstance(document.getElementById('accountSearchModal'));
        if (modal) {
            modal.hide();
        }

        showNotification('Account selected successfully', 'success');
    };

    function showNotification(message, type = 'info') {
        // Create toast notification
        const toast = document.createElement('div');
        toast.className = `alert alert-${type} position-fixed top-0 end-0 m-3`;
        toast.style.zIndex = '9999';
        toast.innerHTML = `
            <i class="bi ${type === 'success' ? 'bi-check-circle' : type === 'warning' ? 'bi-exclamation-triangle' : 'bi-info-circle'}"></i>
            ${message}
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.remove();
        }, 3000);
    }

    // Update metadata fields
    function updateMetadata() {
        const now = new Date();
        document.getElementById('modifiedBy').value = 'CSADM';
        document.getElementById('modifiedOn').value = now.toLocaleString();
    }
});
