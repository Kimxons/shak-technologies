// Budget Transfer - Main JavaScript
(() => {
    const form = document.getElementById('budgetTransferForm');
    const statusBar = document.getElementById('statusMessage');
    const statusIcon = statusBar?.querySelector('.bi');
    const statusText = statusBar?.querySelector('.status-text');
    const statusClose = statusBar?.querySelector('.status-close');

    const actionButtons = {
        print: document.querySelector('[data-action="print"]'),
        archive: document.querySelector('[data-action="archive"]'),
        reject: document.querySelector('[data-action="reject"]'),
        view: document.querySelector('[data-action="view"]'),
        add: document.querySelector('[data-action="add"]'),
        save: document.querySelector('[data-action="save"]'),
        cancel: document.querySelector('[data-action="cancel"]')
    };

    // Form fields
    const serialId = document.getElementById('serialId');
    const branchId = document.getElementById('branchId');
    const branchDescription = document.getElementById('branchDescription');
    const fromGlAccount = document.getElementById('fromGlAccount');
    const fromGlAccountDesc = document.getElementById('fromGlAccountDesc');
    const toGlAccount = document.getElementById('toGlAccount');
    const toGlAccountDesc = document.getElementById('toGlAccountDesc');
    const fromBudgetMonth = document.getElementById('fromBudgetMonth');
    const fromBudgetMonthDesc = document.getElementById('fromBudgetMonthDesc');
    const toBudgetMonth = document.getElementById('toBudgetMonth');
    const toBudgetMonthDesc = document.getElementById('toBudgetMonthDesc');
    const budgetAmount = document.getElementById('budgetAmount');

    // Audit fields
    const createdBy = document.getElementById('createdBy');
    const createdOn = document.getElementById('createdOn');
    const supervisedBy = document.getElementById('supervisedBy');
    const supervisedOn = document.getElementById('supervisedOn');

    const requiredFields = Array.from(form.querySelectorAll('[data-required="true"]'));
    let isEditMode = false;
    let currentRecord = null;
    let statusTimer;

    // Initialize
    function init() {
        initializeEventListeners();
        setFormEnabled(false);
        generateSerialId();
    }

    // Event listeners
    function initializeEventListeners() {
        // Action buttons
        actionButtons.view?.addEventListener('click', () => handleAction('view'));
        actionButtons.add?.addEventListener('click', () => handleAction('add'));
        actionButtons.save?.addEventListener('click', () => handleAction('save'));
        actionButtons.cancel?.addEventListener('click', () => handleAction('cancel'));
        actionButtons.print?.addEventListener('click', () => handleAction('print'));
        actionButtons.archive?.addEventListener('click', () => handleAction('archive'));
        actionButtons.reject?.addEventListener('click', () => handleAction('reject'));

        // Status close
        statusClose?.addEventListener('click', hideStatus);

        // Search buttons
        document.querySelector('[data-action="search-branch"]')?.addEventListener('click', searchBranch);
        document.querySelector('[data-action="search-from-gl"]')?.addEventListener('click', searchFromGlAccount);
        document.querySelector('[data-action="search-to-gl"]')?.addEventListener('click', searchToGlAccount);
        document.querySelector('[data-action="search-from-month"]')?.addEventListener('click', searchFromMonth);
        document.querySelector('[data-action="search-to-month"]')?.addEventListener('click', searchToMonth);

        // Form validation on input
        requiredFields.forEach(field => {
            field.addEventListener('input', () => {
                field.classList.remove('is-invalid');
            });
        });
    }

    // Handle actions
    function handleAction(action) {
        switch (action) {
            case 'view':
                viewTransfer();
                break;
            case 'add':
                addNewTransfer();
                break;
            case 'save':
                saveTransfer();
                break;
            case 'cancel':
                cancelOperation();
                break;
            case 'print':
                printTransfer();
                break;
            case 'archive':
                archiveTransfer();
                break;
            case 'reject':
                rejectTransfer();
                break;
        }
    }

    // Status management
    const icons = {
        success: 'bi-check-circle',
        error: 'bi-x-circle',
        warning: 'bi-exclamation-triangle',
        info: 'bi-info-circle'
    };

    function showStatus(message, type = 'info') {
        clearTimeout(statusTimer);

        statusIcon.className = `bi ${icons[type]}`;
        statusText.textContent = message;
        statusBar.className = `status ${type}`;

        if (type !== 'error') {
            statusTimer = setTimeout(hideStatus, 4000);
        }
    }

    function hideStatus() {
        statusBar.classList.add('hidden');
    }

    // Form management
    function setFormEnabled(enabled) {
        const editableFields = form.querySelectorAll('input:not([readonly]), select, textarea');
        editableFields.forEach(field => {
            if (enabled) {
                field.removeAttribute('disabled');
            } else {
                field.setAttribute('disabled', 'disabled');
            }
        });

        actionButtons.save.disabled = !enabled;
    }

    function clearForm() {
        form.reset();
        clearInvalid();
        generateSerialId();
        createdBy.value = '';
        createdOn.value = '';
        supervisedBy.value = '';
        supervisedOn.value = '';
        branchDescription.value = '';
        fromGlAccountDesc.value = '';
        toGlAccountDesc.value = '';
        fromBudgetMonthDesc.value = '';
        toBudgetMonthDesc.value = '';
    }

    function clearInvalid() {
        requiredFields.forEach(field => field.classList.remove('is-invalid'));
    }

    function validateForm() {
        let isValid = true;
        clearInvalid();

        requiredFields.forEach(field => {
            if (!field.value.trim()) {
                field.classList.add('is-invalid');
                isValid = false;
            }
        });

        if (!isValid) {
            showStatus('Please fill in all required fields', 'error');
        }

        return isValid;
    }

    function generateSerialId() {
        // Generate a random serial ID (in production, this would come from backend)
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000);
        serialId.value = `BT${timestamp}${random}`.substring(0, 12);
    }

    function getUserContext() {
        // In a real application, fetch from authentication context
        return {
            userName: 'CSADM',
            timestamp: new Date().toLocaleString()
        };
    }

    function updateAudit(user) {
        createdBy.value = user.userName;
        createdOn.value = user.timestamp;
    }

    // Action handlers
    function viewTransfer() {
        if (!serialId.value.trim()) {
            showStatus('Please enter a Serial ID to view', 'warning');
            return;
        }

        showStatus('Loading transfer details...', 'info');
        // In production, fetch from backend
        setTimeout(() => {
            showStatus('Transfer details loaded', 'success');
        }, 500);
    }

    function addNewTransfer() {
        isEditMode = true;
        clearForm();
        setFormEnabled(true);
        
        const user = getUserContext();
        updateAudit(user);

        showStatus('Add mode enabled. Enter transfer details', 'info');
    }

    function saveTransfer() {
        if (!validateForm()) {
            return;
        }

        const transferData = {
            serialId: serialId.value,
            branchId: branchId.value,
            fromGlAccount: fromGlAccount.value,
            toGlAccount: toGlAccount.value,
            fromBudgetMonth: fromBudgetMonth.value,
            toBudgetMonth: toBudgetMonth.value,
            budgetAmount: budgetAmount.value,
            createdBy: createdBy.value,
            createdOn: createdOn.value
        };

        console.log('Saving budget transfer:', transferData);

        // Simulate save
        showStatus('Budget transfer saved successfully', 'success');
        setFormEnabled(false);
        isEditMode = false;

        // Update supervised fields
        const user = getUserContext();
        supervisedBy.value = user.userName;
        supervisedOn.value = user.timestamp;
    }

    function cancelOperation() {
        if (isEditMode) {
            if (confirm('Discard changes?')) {
                setFormEnabled(false);
                isEditMode = false;
                if (currentRecord) {
                    loadRecord(currentRecord);
                } else {
                    clearForm();
                }
                showStatus('Changes discarded', 'info');
            }
        } else {
            clearForm();
            showStatus('Form cleared', 'info');
        }
    }

    function printTransfer() {
        if (!serialId.value.trim()) {
            showStatus('No transfer to print', 'warning');
            return;
        }

        showStatus('Printing budget transfer...', 'info');
        // In production, generate and print report
        setTimeout(() => {
            showStatus('Print job sent', 'success');
        }, 500);
    }

    function archiveTransfer() {
        if (!serialId.value.trim()) {
            showStatus('No transfer to archive', 'warning');
            return;
        }

        if (confirm('Archive this budget transfer?')) {
            showStatus('Transfer archived successfully', 'success');
            clearForm();
        }
    }

    function rejectTransfer() {
        if (!serialId.value.trim()) {
            showStatus('No transfer to reject', 'warning');
            return;
        }

        const reason = prompt('Enter rejection reason:');
        if (reason) {
            showStatus('Transfer rejected', 'success');
            clearForm();
        }
    }

    function loadRecord(record) {
        currentRecord = record;
        serialId.value = record.serialId || '';
        branchId.value = record.branchId || '';
        branchDescription.value = record.branchDescription || '';
        fromGlAccount.value = record.fromGlAccount || '';
        fromGlAccountDesc.value = record.fromGlAccountDesc || '';
        toGlAccount.value = record.toGlAccount || '';
        toGlAccountDesc.value = record.toGlAccountDesc || '';
        fromBudgetMonth.value = record.fromBudgetMonth || '';
        fromBudgetMonthDesc.value = record.fromBudgetMonthDesc || '';
        toBudgetMonth.value = record.toBudgetMonth || '';
        toBudgetMonthDesc.value = record.toBudgetMonthDesc || '';
        budgetAmount.value = record.budgetAmount || '';
        createdBy.value = record.createdBy || '';
        createdOn.value = record.createdOn || '';
        supervisedBy.value = record.supervisedBy || '';
        supervisedOn.value = record.supervisedOn || '';
    }

    // Search functions
    function searchBranch() {
        showStatus('Branch search - connect to backend', 'info');
        // Simulate search result
        branchDescription.value = 'Head Office';
    }

    function searchFromGlAccount() {
        showStatus('GL Account search - connect to backend', 'info');
        // Simulate search result
        fromGlAccountDesc.value = 'Operating Expenses';
    }

    function searchToGlAccount() {
        showStatus('GL Account search - connect to backend', 'info');
        // Simulate search result
        toGlAccountDesc.value = 'Administrative Costs';
    }

    function searchFromMonth() {
        showStatus('Month selection - connect to backend', 'info');
        // Simulate month selection
        fromBudgetMonthDesc.value = 'January 2026';
    }

    function searchToMonth() {
        showStatus('Month selection - connect to backend', 'info');
        // Simulate month selection
        toBudgetMonthDesc.value = 'February 2026';
    }

    // Initialize on load
    init();
})();
