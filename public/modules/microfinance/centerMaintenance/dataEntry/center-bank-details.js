// Sample data for Center Bank Details
const bankAccountsData = [];

let currentMode = 'view'; // 'view', 'add', 'edit'
let selectedAccount = null;

/**
 * Parent context - Branch ID and Center ID from Center Maintenance
 */
let parentContext = {
  branchId: '',
  branchName: '',
  centerId: '',
  centerName: ''
};

document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
    getParentContext();
    loadProductTypes(); // Load Account Type dropdown options
    loadInstitutionTypes(); // Load Institution Type dropdown options
    loadBankAccounts();
});

/**
 * Load Product Types (Account Types) from LookupService and populate dropdown
 */
async function loadProductTypes() {
    try {
        // Ensure LookupService is loaded
        if (window.ServiceLoader) {
            await window.ServiceLoader.loadCore();
            await window.ServiceLoader.loadScript('../../../../assets/js/services/shared/lookupService.js');
        }

        if (!window.LookupService || !window.LookupService.getProductTypes) {
            console.warn('[Center Bank Details] LookupService.getProductTypes not available');
            return;
        }

        console.log('[Center Bank Details] Loading Account Type options...');
        const options = await window.LookupService.getProductTypes();
        
        if (options && options.length > 0) {
            populateAccountTypeDropdown(options);
            console.log('[Center Bank Details] Account Type options loaded:', options.length);
        } else {
            console.warn('[Center Bank Details] No Account Type options returned');
        }
    } catch (error) {
        console.error('[Center Bank Details] Error loading Account Type options:', error);
    }
}

/**
 * Load Institution Types from LookupService and populate dropdown
 */
async function loadInstitutionTypes() {
    try {
        // Ensure LookupService is loaded
        if (window.ServiceLoader) {
            await window.ServiceLoader.loadCore();
            await window.ServiceLoader.loadScript('../../../../assets/js/services/shared/lookupService.js');
        }

        if (!window.LookupService || !window.LookupService.getInstitutionTypes) {
            console.warn('[Center Bank Details] LookupService.getInstitutionTypes not available');
            return;
        }

        console.log('[Center Bank Details] Loading Institution Type options...');
        const options = await window.LookupService.getInstitutionTypes();
        
        if (options && options.length > 0) {
            populateInstitutionTypeDropdown(options);
            console.log('[Center Bank Details] Institution Type options loaded:', options.length);
        } else {
            console.warn('[Center Bank Details] No Institution Type options returned');
        }
    } catch (error) {
        console.error('[Center Bank Details] Error loading Institution Type options:', error);
    }
}

/**
 * Populate the Institution Type dropdown with options
 * @param {Array} options - Array of options from LookupService
 * Expected fields: value (SubCodeID), label (Description)
 */
function populateInstitutionTypeDropdown(options) {
    const select = document.getElementById('InstitutionType');
    if (!select) {
        console.warn('[Center Bank Details] InstitutionType select not found');
        return;
    }

    // Clear existing options except the first placeholder
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Add options from API
    // LookupService returns: { value: SubCodeID, label: Description }
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value || ''; // SubCodeID
        option.textContent = opt.label || opt.value || '';
        select.appendChild(option);
    });

    console.log('[Center Bank Details] Institution Type dropdown populated with', options.length, 'options');
}

/**
 * Populate the Account Type dropdown with options
 * @param {Array} options - Array of options from LookupService
 * Expected fields: value (SubCodeID), label (Description)
 */
function populateAccountTypeDropdown(options) {
    const select = document.getElementById('AccountType');
    if (!select) {
        console.warn('[Center Bank Details] AccountType select not found');
        return;
    }

    // Clear existing options except the first placeholder
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Add options from API
    // LookupService returns: { value: SubCodeID, label: Description }
    options.forEach(opt => {
        const option = document.createElement('option');
        option.value = opt.value || ''; // SubCodeID
        option.textContent = opt.label || opt.value || '';
        select.appendChild(option);
    });

    console.log('[Center Bank Details] Account Type dropdown populated with', options.length, 'options');
}

function initializeEventListeners() {
    // Main action buttons
    document.querySelectorAll('.btn-action[data-action]').forEach(btn => {
        btn.addEventListener('click', handleAction);
    });

    // Inline buttons
    document.querySelectorAll('[data-cbd-inline]').forEach(btn => {
        btn.addEventListener('click', handleInlineAction);
    });

    // Lookup buttons
    document.querySelectorAll('[data-cu-lookup]').forEach(btn => {
        btn.addEventListener('click', handleLookup);
    });

    // Title bar controls
    document.querySelectorAll('[data-cu-close]').forEach(btn => {
        btn.addEventListener('click', () => {
            window.parent.postMessage({ type: 'kairo-dataentry-close' }, '*');
        });
    });

    document.querySelectorAll('[data-cu-minimize]').forEach(btn => {
        btn.addEventListener('click', () => {
            // Handle minimize - send message to parent
            window.parent.postMessage({ type: 'kairo-dataentry-minimize' }, '*');
        });
    });

    document.querySelectorAll('[data-cu-refresh]').forEach(btn => {
        btn.addEventListener('click', () => {
            // Handle refresh - reload data
            loadBankAccounts();
            showMessage('Data refreshed', 'info');
        });
    });

    // Form inputs
    document.querySelectorAll('input, select').forEach(input => {
        input.addEventListener('input', validateForm);
    });
}

function handleAction(event) {
    const action = event.currentTarget.dataset.action;
    switch (action) {
        case 'view':
            viewAccount();
            break;
        case 'add':
            addNewAccount();
            break;
        case 'edit':
            editAccount();
            break;
        case 'delete':
            deleteAccount();
            break;
        case 'save':
            saveAccount();
            break;
        case 'cancel':
            cancelOperation();
            break;
        case 'back':
            goBack();
            break;
    }
}

function handleInlineAction(event) {
    const action = event.currentTarget.dataset.cbdInline;
    switch (action) {
        case 'new':
            currentMode = 'add';
            clearForm();
            updateButtonStates();
            break;
        case 'alter':
            if (!selectedAccount) return;
            currentMode = 'edit-item';
            updateButtonStates();
            break;
        case 'remove':
            removeAccount();
            break;
        case 'update':
            updateAccount();
            break;
        case 'clear':
            clearForm();
            break;
    }
}

function handleLookup(event) {
    const type = event.currentTarget.dataset.cuLookup;
    console.log('[Center Bank Details] Lookup clicked:', type);
    
    switch(type) {
        case 'bank':
            console.log('[Center Bank Details] Opening bank search...');
            openBankSearch();
            break;
        case 'branch':
            console.log('[Center Bank Details] Opening bank branch search...');
            openBankBranchSearch();
            break;
        default:
            console.log('[Center Bank Details] Unknown lookup type:', type);
    }
}

/**
 * Open bank search dialog
 */
function openBankSearch() {
    console.log('[Center Bank Details] Opening bank search dialog');

    // Open search dialog in local modal
    const modal = document.getElementById('bankSearchModal');
    const iframe = document.getElementById('bankSearchFrame');
    const modalTitle = document.getElementById('bankSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        console.error('[Center Bank Details] Modal elements not found');
        return;
    }

    modalTitle.textContent = 'Bank Search';
    iframe.src = '../../../common/searchDialogs/bank-search/bank-search.html';

    // Use Bootstrap modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    console.log('[Center Bank Details] Bank search dialog opened');
}

/**
 * Open bank branch search dialog
 */
function openBankBranchSearch() {
    const bankId = document.getElementById('BankId').value.trim();
    if (!bankId) {
        showMessage('Please select a bank first', 'error');
        return;
    }

    console.log('[Center Bank Details] Opening bank branch search dialog');

    // Open search dialog in local modal
    const modal = document.getElementById('bankBranchSearchModal');
    const iframe = document.getElementById('bankBranchSearchFrame');
    const modalTitle = document.getElementById('bankBranchSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        console.error('[Center Bank Details] Modal elements not found');
        return;
    }

    modalTitle.textContent = 'Bank Branch Search';
    iframe.src = '../../../common/searchDialogs/bank-branch-search/bank-branch-search.html';

    // Use Bootstrap modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    console.log('[Center Bank Details] Bank branch search dialog opened');
}

/**
 * Listen for messages from search dialogs
 */
window.addEventListener('message', function(event) {
    if (event.data.type === 'BANK_SELECTED') {
        console.log('[Center Bank Details] Bank selected:', event.data);
        document.getElementById('BankId').value = event.data.bankId;
        document.getElementById('InstitutionName').value = event.data.bankName || '';
        showMessage('Bank selected', 'success');

        // Close the bank search modal
        const modal = document.getElementById('bankSearchModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        }
    } else if (event.data.type === 'BANK_BRANCH_SELECTED') {
        console.log('[Center Bank Details] Bank branch selected:', event.data);
        document.getElementById('BranchId').value = event.data.branchId;
        document.getElementById('BranchName').value = event.data.branchName || '';
        showMessage('Branch selected', 'success');

        // Close the bank branch search modal
        const modal = document.getElementById('bankBranchSearchModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) bsModal.hide();
        }
    } else if (event.data.type === 'kairo-dataentry-close') {
        // Handle close from search dialog - close any open modals
        const bankModal = document.getElementById('bankSearchModal');
        const branchModal = document.getElementById('bankBranchSearchModal');

        if (bankModal) {
            const bsModal = bootstrap.Modal.getInstance(bankModal);
            if (bsModal) bsModal.hide();
        }
        if (branchModal) {
            const bsModal = bootstrap.Modal.getInstance(branchModal);
            if (bsModal) bsModal.hide();
        }
    }
});

/**
 * Get parent context (Branch ID and Center ID) from Center Maintenance
 */
function getParentContext() {
    try {
        if (window.parent && window.parent !== window) {
            const parentDoc = window.parent.document;
            
            // Get Branch ID and Name
            parentContext.branchId = parentDoc.getElementById('branchId')?.value?.trim() || '';
            parentContext.branchName = parentDoc.getElementById('branchName')?.value?.trim() || '';
            
            // Get Center ID and Name
            parentContext.centerId = parentDoc.getElementById('centerId')?.value?.trim() || '';
            parentContext.centerName = parentDoc.getElementById('centerName')?.value?.trim() || '';
            
            console.log('[Center Bank Details] Parent context loaded:', parentContext);
            
            return true;
        }
    } catch (error) {
        console.warn('[Center Bank Details] Could not get parent context:', error);
        showMessage('Could not load parent context. Please ensure Branch and Center are selected.', 'error');
        return false;
    }
    return false;
}

/**
 * Validate parent context - ensure Branch ID and Center ID are available
 */
function validateParentContext() {
    if (!parentContext.branchId) {
        showMessage('Branch ID is required. Please select a branch in Center Maintenance first.', 'error');
        return false;
    }
    if (!parentContext.centerId) {
        showMessage('Center ID is required. Please select a center in Center Maintenance first.', 'error');
        return false;
    }
    return true;
}

/**
 * Ensure GroupService is loaded
 */
async function ensureGroupServiceLoaded() {
    if (window.GroupService) return true;

    try {
        if (window.ServiceLoader) {
            await window.ServiceLoader.loadCore();
            await window.ServiceLoader.loadScript('../../../../assets/js/services/microfinance/groupService.js');
            console.log('[Center Bank Details] GroupService loaded');
            return true;
        }
    } catch (error) {
        console.error('[Center Bank Details] Failed to load GroupService:', error);
    }
    return false;
}

async function loadBankAccounts() {
    const tbody = document.getElementById('bankAccountsTableBody');
    tbody.innerHTML = '<tr><td colspan="7" class="py-3 text-muted">Loading bank accounts...</td></tr>';

    // Validate parent context first
    if (!validateParentContext()) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-3 text-muted text-danger">Please select Branch and Center first.</td></tr>';
        return;
    }

    try {
        // Ensure GroupService is loaded
        const serviceLoaded = await ensureGroupServiceLoaded();
        if (!serviceLoaded) {
            tbody.innerHTML = '<tr><td colspan="7" class="py-3 text-muted text-danger">Failed to load required services.</td></tr>';
            showMessage('Failed to load GroupService', 'error');
            return;
        }

        // Prepare API request data
        const requestData = {
            GroupID: parentContext.centerId,
            OurBranchID: parentContext.branchId,
            OperatorID: "CSADM" // TODO: Get actual operator ID from session/context
        };

        console.log('[Center Bank Details] API Request:', requestData);
        
        // Make API call to get bank accounts
        const response = await window.GroupService.getGroupBankAccounts(requestData);
        console.log('[Center Bank Details] API Response:', response);

        // Clear the array and populate with server data
        bankAccountsData.length = 0;
        
        // Check if response has data - look for Details01 array
        if (response && response.success && response.data && response.data.Details01 && Array.isArray(response.data.Details01) && response.data.Details01.length > 0) {
            // Populate bankAccountsData with server response
            bankAccountsData.push(...response.data.Details01.map(account => ({
                ...account,
                // Store original UpdateCount for incrementing during save
                originalUpdateCount: account.UpdateCount || 1
            })));
            
            // Clear loading message
            tbody.innerHTML = '';
            
            // Populate table with data
            response.data.Details01.forEach(account => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${account.AccountID || ''}</td>
                    <td>${account.InstitutionName || ''}</td>
                    <td>${account.BranchID || ''}</td>
                    <td>${account.BranchName || ''}</td>
                    <td>${account.Balance || '0.00'}</td>
                    <td>${account.TitleOfAccount || ''}</td>
                    <td>${account.Signatory || ''}</td>
                `;
                row.addEventListener('click', () => selectAccount(account));
                tbody.appendChild(row);
            });
            
            showMessage(`Loaded ${response.data.Details01.length} bank accounts`, 'success');
            
            // If data exists: Edit, Delete, Back buttons active - others disabled
            setButtonStatesForDataExists();
        } else {
            // No data found: Add and Back buttons active - others disabled
            tbody.innerHTML = '<tr><td colspan="7" class="py-3 text-muted">No bank accounts found for this center.</td></tr>';
            showMessage('No bank accounts found for this center', 'info');
            
            // If no data: Add and Back buttons active - others disabled
            setButtonStatesForNoData();
        }

    } catch (error) {
        console.error('[Center Bank Details] Error loading bank accounts:', error);
        tbody.innerHTML = '<tr><td colspan="7" class="py-3 text-muted text-danger">Error loading bank accounts. Please try again.</td></tr>';
        showMessage('Failed to load bank accounts: ' + (error.message || 'Unknown error'), 'error');
    }
}

function refreshGrid() {
    const tbody = document.getElementById('bankAccountsTableBody');
    tbody.innerHTML = '';
    
    if (bankAccountsData.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="py-3 text-muted">No bank accounts found for this center.</td></tr>';
        return;
    }
    
    bankAccountsData.forEach(account => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${account.AccountID || account.accountId || ''}</td>
            <td>${account.InstitutionName || account.institutionName || ''}</td>
            <td>${account.BranchID || account.branchId || ''}</td>
            <td>${account.BranchName || account.branchName || ''}</td>
            <td>${account.Balance || account.balance || '0.00'}</td>
            <td>${account.TitleOfAccount || account.titleOfAccount || ''}</td>
            <td>${account.Signatory || account.signatory || ''}</td>
        `;
        row.addEventListener('click', () => selectAccount(account));
        tbody.appendChild(row);
    });
}

function selectAccount(account) {
    selectedAccount = account;
    // Only populate form if in edit mode, not in add mode
    if (currentMode === 'edit') {
        populateForm(account);
    }
    updateButtonStates();
}

function populateForm(account) {
    document.getElementById('AccountType').value = account.ProductTypeID || account.accountType || '';
    document.getElementById('InstitutionType').value = account.InstitutionTypeID || account.institutionType || '';
    document.getElementById('BankId').value = account.BankID || account.bankId || '';
    document.getElementById('InstitutionName').value = account.InstitutionName || account.institutionName || '';
    document.getElementById('BranchId').value = account.BranchID || account.branchId || '';
    document.getElementById('BranchName').value = account.BranchName || account.branchName || '';
    document.getElementById('TitleOfAccount').value = account.TitleOfAccount || account.titleOfAccount || '';
    document.getElementById('AccountId').value = account.AccountID || account.accountId || '';
    document.getElementById('Signatory').value = account.Signatory || account.signatory || '';
    document.getElementById('Balance').value = account.Balance || account.balance || '';
    document.getElementById('AdvanceAmount').value = account.AdvanceAmount || account.advanceAmount || '';
    document.getElementById('Terms').value = account.Term || account.terms || '';
    document.getElementById('MonthlyPayment').value = account.MonthlyPayment || account.monthlyPayment || '';
}

function clearForm() {
    document.querySelectorAll('input, select').forEach(input => {
        input.value = '';
    });
    document.getElementById('AccountType').value = '--Select--';
    document.getElementById('InstitutionType').value = '--Select--';
    // Don't clear selectedAccount when in edit mode with alter
    if (currentMode !== 'edit') {
        selectedAccount = null;
    }
    updateButtonStates();
}

function viewAccount() {
    // View mode - reload data and set to view mode
    currentMode = 'view';
    selectedAccount = null;
    clearForm();
    loadBankAccounts();
    showMessage('View mode activated', 'info');
}

function addNewAccount() {
    currentMode = 'add';
    clearForm();
    updateButtonStates();
    
    // Explicitly enable form inputs for adding new account
    const inputs = document.querySelectorAll('#AccountType, #InstitutionType, #BankId, #InstitutionName, #BranchId, #BranchName, #TitleOfAccount, #AccountId, #Signatory, #Balance, #AdvanceAmount, #Terms, #MonthlyPayment');
    inputs.forEach(input => {
        input.disabled = false;
    });
    
    // Enable lookup buttons
    document.querySelectorAll('[data-cu-lookup]').forEach(btn => {
        btn.disabled = false;
    });
}

function editAccount() {
    currentMode = 'edit';
    updateButtonStates();
}

async function deleteAccount() {
    // This is the main Delete button - deletes all bank accounts for the group
    if (bankAccountsData.length === 0) {
        showMessage('No bank accounts to delete', 'warning');
        return;
    }

    if (!confirm('Are you sure you want to delete all bank accounts for this group? This action cannot be undone.')) {
        return;
    }

    try {
        showMessage('Deleting bank accounts...', 'info');

        // Prepare request data for deleteGroupBankAccounts
        const requestData = {
            OurBranchID: parentContext.branchId,
            GroupID: parentContext.centerId
        };

        console.log('[Center Bank Details] Deleting bank accounts:', requestData);

        const response = await window.GroupService.deleteGroupBankAccounts(requestData);

        console.log('[Center Bank Details] Delete response:', response);

        if (response.success) {
            showMessage('All bank accounts deleted successfully', 'success');

            // Clear local data and reload from server
            bankAccountsData.length = 0;
            selectedAccount = null;
            clearForm();
            await loadBankAccounts();
            currentMode = 'view';
            updateButtonStates();
        } else {
            showMessage('Failed to delete bank accounts: ' + (response.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('[Center Bank Details] Error deleting bank accounts:', error);
        showMessage('Failed to delete bank accounts: ' + (error.message || 'Unknown error'), 'error');
    }
}

async function saveAccount() {
    // This is the main Save button - saves all changes to server
    if (bankAccountsData.length === 0) {
        showMessage('No data to save', 'warning');
        return;
    }

    try {
        // Prepare DetailRecords as XML
        const detailRecordsXml = generateBankAccountsXml(bankAccountsData);

        // Calculate the maximum UpdateCount from all accounts for the request
        const maxUpdateCount = bankAccountsData.length > 0 
            ? Math.max(...bankAccountsData.map(acc => acc.originalUpdateCount || 1))
            : 1;

        // Prepare request data for addEditGroupBankAccounts
        const requestData = {
            OurBranchID: parentContext.branchId,
            GroupID: parentContext.centerId,
            OperatedOn: new Date().toISOString(),
            OperatedBy: 'CSADM', // TODO: Get actual operator ID from session/context
            SupervisedBy: 'CSADM', // TODO: Get actual supervisor ID from session/context
            UpdateCount: maxUpdateCount,
            DetailRecords: detailRecordsXml
        };

        console.log('[Center Bank Details] Saving bank accounts:', requestData);

        const response = await window.GroupService.addEditGroupBankAccounts(requestData);

        console.log('[Center Bank Details] Save response:', response);

        if (response.success) {
            showMessage('Bank accounts saved successfully', 'success');

            // Reload from server to get updated data
            await loadBankAccounts();
            currentMode = 'view';
            selectedAccount = null;
            updateButtonStates();
        } else {
            showMessage('Failed to save bank accounts: ' + (response.message || 'Unknown error'), 'error');
        }
    } catch (error) {
        console.error('[Center Bank Details] Error saving:', error);
        showMessage('Failed to save changes: ' + (error.message || 'Unknown error'), 'error');
    }
}

function updateAccount() {
    const formData = getFormData();
    if (!validateFormData(formData)) return;

    if (currentMode === 'add') {
        // Add new item to the grid
        bankAccountsData.push(formData);
        showMessage('Account added to grid', 'success');
    } else if (currentMode === 'edit-item' && selectedAccount) {
        // Update existing item in the grid
        const accountIdToMatch = selectedAccount.AccountID || selectedAccount.accountId;
        const index = bankAccountsData.findIndex(acc => 
            (acc.AccountID || acc.accountId) === accountIdToMatch
        );
        if (index > -1) {
            // Update the item with new form data, preserving any fields not in form
            bankAccountsData[index] = {
                ...bankAccountsData[index],
                AccountID: formData.accountId,
                accountId: formData.accountId,
                ProductTypeID: formData.accountType,
                InstitutionTypeID: formData.institutionType,
                BankID: formData.bankId,
                InstitutionName: formData.institutionName,
                BranchID: formData.branchId,
                BranchName: formData.branchName,
                TitleOfAccount: formData.titleOfAccount,
                Signatory: formData.signatory,
                Balance: formData.balance,
                AdvanceAmount: formData.advanceAmount,
                Term: formData.terms,
                MonthlyPayment: formData.monthlyPayment
            };
            showMessage('Account updated in grid', 'success');
        }
    }

    // Refresh the grid display without reloading from server
    refreshGrid();
    
    // Return to edit mode so New button is re-enabled
    currentMode = 'edit';
    selectedAccount = null;
    clearForm();
    updateButtonStates();
}

function removeAccount() {
    if (!selectedAccount) return;
    if (confirm('Are you sure you want to delete this account?')) {
        const index = bankAccountsData.findIndex(acc => 
            (acc.AccountID || acc.accountId) === (selectedAccount.AccountID || selectedAccount.accountId)
        );
        if (index > -1) {
            bankAccountsData.splice(index, 1);
            refreshGrid();
            selectedAccount = null;
            clearForm();
            showMessage('Account removed from grid', 'success');
            
            // Stay in edit mode or return based on data
            if (bankAccountsData.length > 0) {
                currentMode = 'edit';
            } else {
                currentMode = 'view';
            }
            updateButtonStates();
        }
    }
}

function cancelOperation() {
    currentMode = 'view';
    selectedAccount = null;
    clearForm();
    // Reload to restore original state
    loadBankAccounts();
}

function goBack() {
    // Implement navigation back
    console.log('Go back');
}

function getFormData() {
    return {
        accountId: document.getElementById('AccountId').value,
        accountType: document.getElementById('AccountType').value,
        institutionType: document.getElementById('InstitutionType').value,
        bankId: document.getElementById('BankId').value,
        institutionName: document.getElementById('InstitutionName').value,
        branchId: document.getElementById('BranchId').value,
        branchName: document.getElementById('BranchName').value,
        titleOfAccount: document.getElementById('TitleOfAccount').value,
        signatory: document.getElementById('Signatory').value,
        balance: document.getElementById('Balance').value,
        advanceAmount: document.getElementById('AdvanceAmount').value,
        terms: document.getElementById('Terms').value,
        monthlyPayment: document.getElementById('MonthlyPayment').value
    };
}

function validateFormData(data) {
    // Basic validation
    if (!data.accountId || !data.institutionName) {
        showMessage('Please fill in required fields', 'error');
        return false;
    }
    return true;
}

function validateForm() {
    // Real-time validation if needed
}

function updateButtonStates() {
    const hasSelection = !!selectedAccount;
    const isEditing = currentMode === 'add' || currentMode === 'edit' || currentMode === 'edit-item';
    const hasData = bankAccountsData.length > 0;

    // Main buttons
    document.querySelector('[data-action="view"]').disabled = isEditing;
    document.querySelector('[data-action="add"]').disabled = isEditing || hasData;
    document.querySelector('[data-action="edit"]').disabled = isEditing || !hasData;
    document.querySelector('[data-action="delete"]').disabled = isEditing || !hasData;
    // Save is active when in edit mode AND there's data in the grid
    document.querySelector('[data-action="save"]').disabled = !(currentMode === 'edit' && hasData);
    document.querySelector('[data-action="cancel"]').disabled = !isEditing;

    // Inline buttons logic based on mode
    if (currentMode === 'edit') {
        // Edit mode: New, Alter, Remove enabled; Update, Clear disabled
        document.querySelector('[data-cbd-inline="new"]').disabled = false;
        document.querySelector('[data-cbd-inline="alter"]').disabled = !hasSelection;
        document.querySelector('[data-cbd-inline="remove"]').disabled = !hasSelection;
        document.querySelector('[data-cbd-inline="update"]').disabled = true;
        document.querySelector('[data-cbd-inline="clear"]').disabled = true;
    } else if (currentMode === 'add' || currentMode === 'edit-item') {
        // Add/Edit-item mode: New, Alter, Remove disabled; Update, Clear enabled
        document.querySelector('[data-cbd-inline="new"]').disabled = true;
        document.querySelector('[data-cbd-inline="alter"]').disabled = true;
        document.querySelector('[data-cbd-inline="remove"]').disabled = true;
        document.querySelector('[data-cbd-inline="update"]').disabled = false;
        document.querySelector('[data-cbd-inline="clear"]').disabled = false;
    } else {
        // View mode: all disabled
        document.querySelector('[data-cbd-inline="new"]').disabled = true;
        document.querySelector('[data-cbd-inline="alter"]').disabled = true;
        document.querySelector('[data-cbd-inline="remove"]').disabled = true;
        document.querySelector('[data-cbd-inline="update"]').disabled = true;
        document.querySelector('[data-cbd-inline="clear"]').disabled = true;
    }

    // Form inputs
    const inputs = document.querySelectorAll('#AccountType, #InstitutionType, #BankId, #InstitutionName, #BranchId, #BranchName, #TitleOfAccount, #AccountId, #Signatory, #Balance, #AdvanceAmount, #Terms, #MonthlyPayment');
    inputs.forEach(input => {
        input.disabled = !(currentMode === 'add' || currentMode === 'edit-item');
    });

    // Lookup buttons
    document.querySelectorAll('[data-cu-lookup]').forEach(btn => {
        btn.disabled = !(currentMode === 'add' || currentMode === 'edit-item');
    });
}

/**
 * Set button states when data exists - Edit, Delete, Back active; others disabled
 */
function setButtonStatesForDataExists() {
    // Main buttons
    document.querySelector('[data-action="view"]').disabled = false;
    document.querySelector('[data-action="add"]').disabled = true;
    document.querySelector('[data-action="edit"]').disabled = false;
    document.querySelector('[data-action="delete"]').disabled = false;
    document.querySelector('[data-action="save"]').disabled = true;
    document.querySelector('[data-action="cancel"]').disabled = true;

    // Inline buttons
    document.querySelector('[data-cbd-inline="new"]').disabled = true;
    document.querySelector('[data-cbd-inline="alter"]').disabled = true;
    document.querySelector('[data-cbd-inline="remove"]').disabled = true;
    document.querySelector('[data-cbd-inline="update"]').disabled = true;
    document.querySelector('[data-cbd-inline="clear"]').disabled = true;

    // Form inputs disabled
    const inputs = document.querySelectorAll('#AccountType, #InstitutionType, #BankId, #InstitutionName, #BranchId, #BranchName, #TitleOfAccount, #AccountId, #Signatory, #Balance, #AdvanceAmount, #Terms, #MonthlyPayment');
    inputs.forEach(input => {
        input.disabled = true;
    });

    // Lookup buttons disabled
    document.querySelectorAll('[data-cu-lookup]').forEach(btn => {
        btn.disabled = true;
    });
}

/**
 * Set button states when no data exists - Add and Back active; others disabled
 */
function setButtonStatesForNoData() {
    // Main buttons
    document.querySelector('[data-action="view"]').disabled = false;
    document.querySelector('[data-action="add"]').disabled = false;
    document.querySelector('[data-action="edit"]').disabled = true;
    document.querySelector('[data-action="delete"]').disabled = true;
    document.querySelector('[data-action="save"]').disabled = true;
    document.querySelector('[data-action="cancel"]').disabled = true;

    // Inline buttons
    document.querySelector('[data-cbd-inline="new"]').disabled = false;
    document.querySelector('[data-cbd-inline="alter"]').disabled = true;
    document.querySelector('[data-cbd-inline="remove"]').disabled = true;
    document.querySelector('[data-cbd-inline="update"]').disabled = true;
    document.querySelector('[data-cbd-inline="clear"]').disabled = false;

    // Form inputs disabled
    const inputs = document.querySelectorAll('#AccountType, #InstitutionType, #BankId, #InstitutionName, #BranchId, #BranchName, #TitleOfAccount, #AccountId, #Signatory, #Balance, #AdvanceAmount, #Terms, #MonthlyPayment');
    inputs.forEach(input => {
        input.disabled = true;
    });

    // Lookup buttons disabled
    document.querySelectorAll('[data-cu-lookup]').forEach(btn => {
        btn.disabled = true;
    });
}

function generateBankAccountsXml(bankAccounts) {
    if (!bankAccounts || bankAccounts.length === 0) {
        return '<BankAccounts></BankAccounts>';
    }

    let xml = '<BankAccounts>';

    bankAccounts.forEach(account => {
        xml += '<BankAccount>';
        xml += `<AccountID>${account.AccountID || account.accountId || ''}</AccountID>`;
        xml += `<InstitutionName>${account.InstitutionName || account.institutionName || ''}</InstitutionName>`;
        xml += `<InstitutionTypeID>${account.InstitutionTypeID || account.institutionType || ''}</InstitutionTypeID>`;
        xml += `<BankID>${account.BankID || account.bankId || ''}</BankID>`;
        xml += `<BranchID>${account.BranchID || account.branchId || ''}</BranchID>`;
        xml += `<BranchName>${account.BranchName || account.branchName || ''}</BranchName>`;
        xml += `<TitleOfAccount>${account.TitleOfAccount || account.titleOfAccount || ''}</TitleOfAccount>`;
        xml += `<Signatory>${account.Signatory || account.signatory || ''}</Signatory>`;
        xml += `<Balance>${account.Balance || account.balance || '0.00'}</Balance>`;
        xml += `<AdvanceAmount>${account.AdvanceAmount || account.advanceAmount || '0.00'}</AdvanceAmount>`;
        xml += `<Term>${account.Term || account.terms || ''}</Term>`;
        xml += `<MonthlyPayment>${account.MonthlyPayment || account.monthlyPayment || '0.00'}</MonthlyPayment>`;
        xml += `<ProductTypeID>${account.ProductTypeID || account.accountType || ''}</ProductTypeID>`;
        
        // Use incremented UpdateCount for existing accounts, 1 for new accounts
        const updateCount = account.originalUpdateCount ? account.originalUpdateCount + 1 : 1;
        xml += `<UpdateCount>${updateCount}</UpdateCount>`;
        
        xml += '</BankAccount>';
    });

    xml += '</BankAccounts>';

    return xml;
}

function showMessage(message, type = 'info') {
    // Try to use parent snackbar if available
    if (window.parent && window.parent.showSnackbar) {
        window.parent.showSnackbar(message, type);
    } else {
        console.log(`[Center Bank Details] ${type.toUpperCase()}: ${message}`);
    }
    
    // Also update local message element
    const messageEl = document.querySelector('.cu-message');
    if (messageEl) {
        messageEl.textContent = message;
        messageEl.className = 'cu-message';
        if (type === 'error') {
            messageEl.style.color = '#c60000';
        } else if (type === 'success') {
            messageEl.style.color = '#006600';
        } else {
            messageEl.style.color = '#333';
        }
    }
}