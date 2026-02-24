// Money Transfer JavaScript - Modern Blue Edition
(function () {
    // Load Prevention Pattern
    if (window.__moneyTransferLoaded) {
        console.warn("money-transfer.js already loaded; skipping duplicate execution.");
        return;
    }
    window.__moneyTransferLoaded = true;

    // Enhanced Mode Management Pattern
    const MODES = {
        VIEW: "View",
        ADD: "Add",
        EDIT: "Edit"
    };

    let currentMode = MODES.VIEW;

    // Field Formatter Helpers
    function formatMoney(value) {
        if (value === null || value === undefined || value === '') return '0.00';
        let num;
        if (typeof value === 'number') num = value;
        else {
            const cleaned = String(value).replace(/,/g, '').trim();
            num = parseFloat(cleaned);
        }
        if (isNaN(num)) return '0.00';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function parseMoneyInput(value) {
        if (value === null || value === undefined || value === '') return '';
        return String(value).replace(/,/g, '').trim();
    }

    function wireMoneyFields() {
        document.querySelectorAll('.money-field').forEach(field => {
            if (field.readOnly || field.disabled) return;
            field.addEventListener('blur', function () {
                const raw = parseMoneyInput(this.value);
                if (raw !== '') this.value = formatMoney(raw);
            });
            field.addEventListener('focus', function () {
                const raw = parseMoneyInput(this.value);
                if (raw !== '') this.value = raw;
            });
            if (field.value && !isNaN(parseFloat(parseMoneyInput(field.value)))) {
                field.value = formatMoney(parseMoneyInput(field.value));
            }
        });
    }

    // Enhanced Form Management Pattern
    const setDisabledForFormFields = (form, shouldDisable) => {
        const selector = "input:not([readonly]), select, textarea, .btn-lookup";
        form.querySelectorAll(selector).forEach((field) => {
            // Keep key identifiers usable in all modes
            if (field.id === "controlNumber" || field.id === "fileId" || field.id === "sendingBranchNo") {
                return;
            }
            field.disabled = shouldDisable;
        });
    };

    const setButtonState = (form, mode) => {
        document.querySelectorAll('.btn-action[data-action]').forEach(btn => {
            const action = btn.dataset.action;

            // Always enabled buttons
            if (['view-all', 'print', 'activate', 'account-info'].includes(action)) {
                btn.disabled = false;
                return;
            }

            const isEditEnabled = mode !== MODES.VIEW;
            const isWorkflowEnabled = mode !== MODES.VIEW;

            if (['view', 'add', 'receive', 'cancel-transfer', 'reverse'].includes(action)) {
                btn.disabled = isEditEnabled;
            } else if (['save', 'cancel'].includes(action)) {
                btn.disabled = !isWorkflowEnabled;
                if (action === 'save' && isWorkflowEnabled) {
                    btn.classList.add('underline');
                } else {
                    btn.classList.remove('underline');
                }
            }
        });
    };

    const applyMode = (form, mode) => {
        const isView = mode === MODES.VIEW;
        setDisabledForFormFields(form, isView);
        setButtonState(form, mode);

        // Update active mode indicators
        form.querySelectorAll("[data-shell-mode]").forEach((btn) => {
            btn.classList.toggle("is-active", btn.dataset.shellMode === mode);
        });
    };

    const clearNonIdentifierFields = (form) => {
        form.querySelectorAll("input:not([readonly]), select, textarea").forEach((field) => {
            // Preserve key identifiers
            if (field.id === "controlNumber" || field.id === "fileId" || field.id === "sendingBranchNo") {
                return;
            }
            if (field.type === "checkbox") {
                field.checked = false;
                return;
            }
            if (field.tagName === "SELECT") {
                field.selectedIndex = 0;
                return;
            }
            field.value = "";
        });
        // Reset defaults
        document.getElementById('sendingBranchNo').value = '0325';
        document.getElementById('sendingBranchName').value = 'Tillil';
    };

    // Action Panel Functions
    function enableAddMode() {
        currentMode = MODES.ADD;
        const form = document.getElementById('moneyTransferForm');
        clearNonIdentifierFields(form);
        applyMode(form, currentMode);
        setStatus('Ready to add new Money Transfer', 'text-info');
    }

    function performSave() {
        if (!validateForm()) return;

        setStatus('Saving...', 'text-primary');
        setTimeout(() => {
            setStatus('Money Transfer saved successfully', 'text-success');
            currentMode = MODES.VIEW;
            const form = document.getElementById('moneyTransferForm');
            applyMode(form, currentMode);
        }, 800);
    }

    function validateForm() {
        let isValid = true;
        const requiredIds = ['controlNumber', 'sendingBranchNo', 'transactionAmount', 'receiverClientName'];

        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (!el.value || el.value === '--Select--') {
                el.style.borderColor = 'var(--danger)';
                isValid = false;
            } else {
                el.style.borderColor = '';
            }
        });

        if (!isValid) {
            setStatus('Please fill in all required fields (indicated in blue).', 'text-danger');
        }
        return isValid;
    }

    // Legacy function - replaced by clearNonIdentifierFields
    function clearForm() {
        const form = document.getElementById('moneyTransferForm');
        clearNonIdentifierFields(form);
    }

    // Legacy function - replaced by setDisabledForFormFields
    function disableFormControls() {
        const form = document.getElementById('moneyTransferForm');
        setDisabledForFormFields(form, true);
    }

    // Legacy function - replaced by setDisabledForFormFields
    function enableFormControls() {
        const form = document.getElementById('moneyTransferForm');
        setDisabledForFormFields(form, false);
    }

    // Legacy function - replaced by setButtonState
    function updateActionButtonsState(activeAction) {
        const form = document.getElementById('moneyTransferForm');
        setButtonState(form, currentMode);
    }

    function setStatus(msg, className) {
        const el = document.getElementById('statusMessage');
        if (!el) return;
        el.textContent = msg;
        el.className = className || '';
    }

    function wireActionButtons() {
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', function () {
                const action = this.dataset.action;
                if (!action) return;

                if (action === 'add') enableAddMode();
                else if (action === 'save') performSave();
                else if (action === 'cancel') {
                    currentMode = MODES.VIEW;
                    const form = document.getElementById('moneyTransferForm');
                    applyMode(form, currentMode);
                    setStatus('Operation cancelled', 'text-secondary');
                }
                else if (action === 'view') {
                    setStatus('Viewing transfer...', 'text-primary');
                }
                else if (action === 'view-all') {
                    setStatus('Loading all transfers...', 'text-primary');
                    setTimeout(() => {
                        setStatus('All transfers loaded successfully', 'text-success');
                    }, 1000);
                }
                else if (action === 'print') {
                    setStatus('Preparing print preview...', 'text-primary');
                    setTimeout(() => {
                        window.print();
                        setStatus('Print dialog opened', 'text-success');
                    }, 500);
                }
                else if (action === 'activate') {
                    if (currentMode === MODES.VIEW) {
                        setStatus('Please select a transfer to activate', 'text-warning');
                    } else {
                        setStatus('Activating transfer...', 'text-primary');
                        setTimeout(() => {
                            setStatus('Transfer activated successfully', 'text-success');
                        }, 800);
                    }
                }
                else if (action === 'account-info') {
                    const accountId = document.getElementById('accountId').value;
                    if (!accountId) {
                        setStatus('Please enter an Account ID first', 'text-warning');
                    } else {
                        setStatus(`Loading account info for ${accountId}...`, 'text-primary');
                        setTimeout(() => {
                            setStatus('Account information loaded', 'text-success');
                        }, 1000);
                    }
                }
                else if (action === 'receive') {
                    if (currentMode === MODES.VIEW) {
                        setStatus('Please select a transfer to receive', 'text-warning');
                    } else {
                        setStatus('Processing transfer receipt...', 'text-primary');
                        setTimeout(() => {
                            setStatus('Transfer received successfully', 'text-success');
                        }, 800);
                    }
                }
                else if (action === 'cancel-transfer') {
                    if (currentMode === MODES.VIEW) {
                        setStatus('Please select a transfer to cancel', 'text-warning');
                    } else {
                        if (confirm('Are you sure you want to cancel this transfer?')) {
                            setStatus('Cancelling transfer...', 'text-primary');
                            setTimeout(() => {
                                setStatus('Transfer cancelled successfully', 'text-success');
                                currentMode = MODES.VIEW;
                                const form = document.getElementById('moneyTransferForm');
                                applyMode(form, currentMode);
                            }, 800);
                        }
                    }
                }
                else if (action === 'reverse') {
                    if (currentMode === MODES.VIEW) {
                        setStatus('Please select a transfer to reverse', 'text-warning');
                    } else {
                        if (confirm('Are you sure you want to reverse this transfer? This action cannot be undone.')) {
                            setStatus('Reversing transfer...', 'text-primary');
                            setTimeout(() => {
                                setStatus('Transfer reversed successfully', 'text-success');
                                currentMode = MODES.VIEW;
                                const form = document.getElementById('moneyTransferForm');
                                applyMode(form, currentMode);
                            }, 1000);
                        }
                    }
                }
            });
        });
    }

    // Lookup Service Integration Pattern
    const lookupService = window.LookupService;
    const MIN_SEARCH_TERM_LENGTH = 3;

    const performBranchSearch = async (branchNo, targetFieldId = 'sendingBranchName') => {
        if (!branchNo || branchNo.length < MIN_SEARCH_TERM_LENGTH) {
            setStatus(`Please enter at least ${MIN_SEARCH_TERM_LENGTH} characters for branch search`, 'text-warning');
            return;
        }

        if (!lookupService || typeof lookupService.searchBranches !== 'function') {
            setStatus('Branch lookup service is not available', 'text-danger');
            return;
        }

        setStatus('Searching for branch...', 'text-primary');
        try {
            const result = await lookupService.searchBranches(branchNo);
            if (result && result.length > 0) {
                const branch = result[0];
                document.getElementById(targetFieldId).value = branch.BranchName || branch.Name || 'Unknown';
                setStatus('Branch found successfully', 'text-success');
            } else {
                setStatus('Branch not found', 'text-warning');
            }
        } catch (error) {
            console.error('Branch search failed:', error);
            setStatus('Branch search failed', 'text-danger');
        }
    };

    const performAccountSearch = async (accountId) => {
        if (!accountId || accountId.length < MIN_SEARCH_TERM_LENGTH) {
            setStatus(`Please enter at least ${MIN_SEARCH_TERM_LENGTH} characters for account search`, 'text-warning');
            return;
        }

        if (!lookupService || typeof lookupService.searchAccounts !== 'function') {
            setStatus('Account lookup service is not available', 'text-danger');
            return;
        }

        setStatus('Searching for account...', 'text-primary');
        try {
            const result = await lookupService.searchAccounts(accountId);
            if (result && result.length > 0) {
                const account = result[0];
                document.getElementById('accountName').value = account.AccountName || account.ClientName || 'Unknown';
                setStatus('Account found successfully', 'text-success');
            } else {
                setStatus('Account not found', 'text-warning');
            }
        } catch (error) {
            console.error('Account search failed:', error);
            setStatus('Account search failed', 'text-danger');
        }
    };

    // Wire lookup buttons
    function wireLookupButtons() {
        document.querySelectorAll('.btn-lookup[data-lookup]').forEach(button => {
            button.addEventListener('click', async (e) => {
                e.preventDefault();
                const lookupType = button.dataset.lookup;
                
                if (lookupType === 'sending-branch') {
                    const branchNo = document.getElementById('sendingBranchNo').value;
                    await performBranchSearch(branchNo, 'sendingBranchName');
                } else if (lookupType === 'account') {
                    const accountId = document.getElementById('accountId').value;
                    await performAccountSearch(accountId);
                } else if (lookupType === 'receiving-branch') {
                    const branchNo = document.getElementById('receivingBranchNo').value;
                    await performBranchSearch(branchNo, 'receivingBranchName');
                }
            });
        });
    }

    // Initialization
    document.addEventListener('DOMContentLoaded', function () {
        wireMoneyFields();
        wireActionButtons();
        wireLookupButtons();

        const form = document.getElementById('moneyTransferForm');
        applyMode(form, MODES.VIEW);

        console.log('Money Transfer - Modern Blue Edition Initialized');
    });
})();
