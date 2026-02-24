// Cash Transaction JavaScript - Modern Blue Edition
(function () {
    let currentMode = 'VIEW';

    let toastContainerEl = null;

    function ensureToastContainer() {
        if (toastContainerEl && document.body.contains(toastContainerEl)) return toastContainerEl;
        toastContainerEl = document.createElement('div');
        toastContainerEl.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainerEl.style.zIndex = '1080';
        document.body.appendChild(toastContainerEl);
        return toastContainerEl;
    }

    function showToast(message, variant) {
        if (!message) return;
        const container = ensureToastContainer();
        const toastEl = document.createElement('div');
        const tone = (variant || 'info').toLowerCase();
        toastEl.className = `toast align-items-center text-bg-${tone} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body"></div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" aria-label="Close"></button>
            </div>
        `;
        toastEl.querySelector('.toast-body').textContent = message;
        toastEl.querySelector('button')?.addEventListener('click', () => toastEl.remove());
        container.appendChild(toastEl);

        try {
            if (window.bootstrap?.Toast) {
                const toast = new window.bootstrap.Toast(toastEl, { delay: 2500 });
                toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove(), { once: true });
                toast.show();
            } else {
                setTimeout(() => toastEl.remove(), 2500);
            }
        } catch {
            setTimeout(() => toastEl.remove(), 2500);
        }
    }

    function openDatePickerById(id) {
        const input = document.getElementById(id);
        if (!input) return;
        if (input.disabled) return;
        try {
            if (typeof input.showPicker === 'function') {
                input.showPicker();
                return;
            }
        } catch {
            // ignore
        }
        input.focus();
        input.click();
    }

    function wireDatePickerButtons() {
        document.querySelectorAll('[data-open-date]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-open-date');
                if (!id) return;
                openDatePickerById(id);
            });
        });
    }

    function wireLookupButtons() {
        document.querySelectorAll('[data-lookup]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                // If form is disabled (View mode), lookups should likely be disabled too, 
                // UNLESS it's purely informational like 'signature'. 
                // However, standard pattern: if inputs are disabled, lookups usually are too 
                // (except maybe signature).
                // Let's allow signature always, but block others if mode is VIEW.

                const lookupType = btn.dataset.lookup;
                if (!lookupType) return;

                if (currentMode === 'VIEW' && lookupType !== 'signature') {
                    // Ideally these buttons should be visually disabled in VIEW mode, 
                    // but as a safeguard we return here.
                    // console.log('Lookup ignored in VIEW mode:', lookupType);
                    return;
                }

                console.log(`Lookup requested: ${lookupType}`);
                notifyParent(`lookup-${lookupType}`);
            });
        });
    }

    function notifyParent(action) {
        if (!action) return;
        if (window.parent === window) return;
        try {
            window.parent.postMessage({
                type: 'kairo-action',
                module: 'cash-transaction',
                action
            }, '*');
        } catch {
            // Ignore cross-window messaging issues.
        }
    }

    // BASIC WIRING ONLY: Action button handlers
    function onViewClick() {
        console.log('View button clicked');
        // If we have a Serial ID, treat this as a "Fetch" request
        const serialId = document.getElementById('serialId').value;
        if (serialId) {
            fetchTransaction();
        } else {
            currentMode = 'VIEW';
            disableFormControls();
            updateActionButtonsState('View');
            notifyParent('view');
        }
    }

    function wireSerialIdSearch() {
        const serialInput = document.getElementById('serialId');
        if (serialInput) {
            serialInput.addEventListener('keydown', function (e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    fetchTransaction();
                }
            });
        }
    }

    function onAddClick() {
        console.log('Add button clicked');
        enableAddMode();
        notifyParent('add');
    }

    function onSaveClick() {
        console.log('Save button clicked');
        if (currentMode === 'VIEW') {
            showToast('Warning: Click Add/Edit before Save.', 'warning');
            notifyParent('save');
            return;
        }

        // Keep existing form flow (validate + status) while still treating this as wiring.
        performSave();
        notifyParent('save');
    }

    function onCancelClick() {
        console.log('Cancel button clicked');
        if (currentMode === 'VIEW') {
            showToast('Warning: Nothing to cancel in View mode.', 'warning');
            notifyParent('cancel');
            return;
        }

        currentMode = 'VIEW';
        disableFormControls();
        updateActionButtonsState('View');
        setStatus('Operation cancelled', 'text-secondary');
        notifyParent('cancel');
    }

    function onDeleteClick() {
        console.log('Delete button clicked');
        notifyParent('delete');
    }

    function onEditClick() {
        console.log('Edit button clicked');
        currentMode = 'EDIT';
        enableFormControls();
        updateActionButtonsState('Edit');
        setStatus('Edit mode enabled.', 'text-info');
        notifyParent('edit');
    }

    function onViewAllClick() {
        console.log('View All button clicked');
        notifyParent('view-all');
    }

    function onDenominationClick() {
        console.log('Denomination button clicked');
        notifyParent('denomination');
    }

    function onPrintClick() {
        console.log('Print button clicked');
        notifyParent('print');
    }

    function onTellerBalanceClick() {
        console.log('Teller Balance button clicked');
        notifyParent('teller-balance');
    }

    function onAccountInfoClick() {
        console.log('Account Info button clicked');
        notifyParent('account-info');
    }

    function wireActionButtons() {
        const viewAllBtn = document.querySelector('.btn-action[data-action="view-all"]');
        const denominationBtn = document.querySelector('.btn-action[data-action="denomination"]');
        const printBtn = document.querySelector('.btn-action[data-action="print"]');
        const tellerBalanceBtn = document.querySelector('.btn-action[data-action="teller-balance"]');
        const accountInfoBtn = document.querySelector('.btn-action[data-action="account-info"]');

        const viewBtn = document.querySelector('.btn-action[data-action="view"]');
        const addBtn = document.querySelector('.btn-action[data-action="add"]');
        const editBtn = document.querySelector('.btn-action[data-action="edit"]');
        const saveBtn = document.querySelector('.btn-action[data-action="save"]');
        const cancelBtn = document.querySelector('.btn-action[data-action="cancel"]');
        const deleteBtn = document.querySelector('.btn-action[data-action="delete"]');

        if (viewAllBtn) viewAllBtn.addEventListener('click', onViewAllClick);
        if (denominationBtn) denominationBtn.addEventListener('click', onDenominationClick);
        if (printBtn) printBtn.addEventListener('click', onPrintClick);
        if (tellerBalanceBtn) tellerBalanceBtn.addEventListener('click', onTellerBalanceClick);
        if (accountInfoBtn) accountInfoBtn.addEventListener('click', onAccountInfoClick);

        if (viewBtn) viewBtn.addEventListener('click', onViewClick);
        if (addBtn) addBtn.addEventListener('click', onAddClick);
        if (editBtn) editBtn.addEventListener('click', onEditClick);
        if (saveBtn) saveBtn.addEventListener('click', onSaveClick);
        if (cancelBtn) cancelBtn.addEventListener('click', onCancelClick);
        if (deleteBtn) deleteBtn.addEventListener('click', onDeleteClick);
    }

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

    // Action Panel Functions
    function enableAddMode() {
        currentMode = 'ADD';
        clearForm();
        enableFormControls();
        updateActionButtonsState('Add');
        setStatus('Ready to add new Cash Transaction', 'text-info');
    }

    async function fetchTransaction() {
        // Validation for search only requires Serial ID usually, but sticking to basics
        const serialId = document.getElementById('serialId').value;
        if (!serialId) {
            showToast('Please enter a Serial ID to search.', 'warning');
            return;
        }

        setStatus('Fetching transaction...', 'text-primary');

        try {
            const requestData = {
                "TrxBranchID": "0101",
                "OurBranchID": "0101",
                "SerialID": serialId,
                "OperatorID": "OperatorID",
                "ModuleID": "3000"
            };

            const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetCashTrx", requestData);
            // Fallback to the specific backend IP provided by user if Environment is missing
            const BASE_URL = (window.Environment?.baseUrlCommon || "http://172.16.2.31:3306").replace(/\/+$/, "");
            const SEARCH_ENDPOINT = `${BASE_URL}/api/OldAPI`;

            console.log('Fetching from:', SEARCH_ENDPOINT); // Debug log for user

            const response = await CoreApi.post(SEARCH_ENDPOINT, envelope);

            if (response.success) {
                setStatus('Transaction fetched successfully', 'text-success');

                if (response.Details && response.Details.length > 0) {
                    const detail = response.Details[0];
                    if (detail.BranchName) document.getElementById('branchName').value = detail.BranchName;
                    if (detail.AccountName) document.getElementById('accountName').value = detail.AccountName;

                    if (detail.ClearBalance !== undefined) document.getElementById('clearBalance').value = formatMoney(detail.ClearBalance);
                    if (detail.UnclearBalance !== undefined) document.getElementById('unclearBalance').value = formatMoney(detail.UnclearBalance);
                    if (detail.DrawingPower !== undefined) document.getElementById('drawingPower').value = formatMoney(detail.DrawingPower);
                    if (detail.FreezedAmount !== undefined) document.getElementById('freezedAmount').value = formatMoney(detail.FreezedAmount);
                    if (detail.MinimumBalance !== undefined) document.getElementById('minimumBalance').value = formatMoney(detail.MinimumBalance);
                    if (detail.AvailableBalance !== undefined) document.getElementById('availableBalance').value = formatMoney(detail.AvailableBalance);
                    if (detail.DepositBalance !== undefined) document.getElementById('depositBalance').value = formatMoney(detail.DepositBalance);
                    if (detail.TotalBalance !== undefined) document.getElementById('totalBalance').value = formatMoney(detail.TotalBalance);

                    if (detail.CurrencyID) document.getElementById('accCurrencyId').value = detail.CurrencyID;
                    if (detail.ProductID) document.getElementById('accProductId').value = detail.ProductID;

                    if (detail.UnSupervisedCredits !== undefined) document.getElementById('unsupervisedCr').value = formatMoney(detail.UnSupervisedCredits);
                    if (detail.UnSupervisedDebits !== undefined) document.getElementById('unsupervisedDr').value = formatMoney(detail.UnSupervisedDebits);
                }

                if (response.Details01 && response.Details01.length > 0) {
                    const trx = response.Details01[0];
                    if (trx.TrxTypeID) setSelectValue('transactionType', trx.TrxTypeID);
                    if (trx.InstrumentTypeID) setSelectValue('instrumentType', trx.InstrumentTypeID);
                    if (trx.Amount !== undefined) document.getElementById('transactionAmount').value = formatMoney(trx.Amount);
                    if (trx.TrxCurrencyID) {
                        document.getElementById('transactionCurrencyId').value = trx.TrxCurrencyID;
                        document.getElementById('transactionCurrencyName').value = trx.CurrencyName || '';
                    }
                    if (trx.TrxDescription) document.getElementById('narration').value = trx.TrxDescription;
                    if (trx.ReferenceNo) document.getElementById('referenceNo').value = trx.ReferenceNo;
                    if (trx.TrxBatchID) document.getElementById('transactionId').value = trx.TrxBatchID;
                    if (trx.ExchangeRate) document.getElementById('exchangeRate').value = formatMoney(trx.ExchangeRate);
                }

                currentMode = 'VIEW';
                disableFormControls();
                updateActionButtonsState('View');

                // Allow specific fields to be editable if we just fetched? 
                // Usually for 'View' we keep it disabled.
            } else {
                setStatus('Error: ' + (response.message || 'Unknown error'), 'text-danger');
            }

        } catch (err) {
            console.error(err);
            setStatus('System Error: ' + err.message, 'text-danger');
        }
    }

    // Placeholder for actual save (Insert/Update)
    function performSave() {
        showToast('Save functionality not yet implemented (waiting for SP details)', 'info');
    }

    // Helper to safely set select values even if the option doesn't exist yet (creates it temporarily)
    function setSelectValue(id, value) {
        const select = document.getElementById(id);
        if (!select) return;

        // Check if option exists
        let exists = false;
        for (let i = 0; i < select.options.length; i++) {
            if (select.options[i].value == value) {
                select.selectedIndex = i;
                exists = true;
                break;
            }
        }

        // If not exists, add it temporarily so data is visible
        if (!exists && value) {
            const opt = document.createElement('option');
            opt.value = value;
            opt.text = value; // Ideally we'd have the description, but ID is better than nothing
            opt.selected = true;
            select.add(opt);
        }
    }

    function validateForm() {
        let isValid = true;
        const requiredIds = ['transactionType', 'serialId', 'accountType', 'branchNo', 'accountId', 'instrumentType', 'transactionId', 'narration', 'transactionAmount'];

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

    function clearForm() {
        document.querySelectorAll('#cashTransactionForm input:not([readonly]), #cashTransactionForm select, #cashTransactionForm textarea').forEach(el => {
            if (el.type === 'checkbox') el.checked = false;
            else el.value = '';
        });
        // Reset defaults
        document.getElementById('branchNo').value = '0325';
        document.getElementById('branchName').value = 'Tillil';
        document.getElementById('accountType').value = 'Customer';
        document.getElementById('systemDate').value = '29/Aug/2025';
        document.getElementById('dayStatus').value = 'Open';
    }

    async function populateDropdowns() {
        try {
            // These would typically be fetched from specific lookup endpoints.
            // Using placeholder logic or generic lookup service calls here.

            // Transaction Types
            const trxTypes = [
                { id: 'Cash Deposit', text: 'Cash Deposit' },
                { id: 'Cash Withdrawal', text: 'Cash Withdrawal' },
                { id: 'Cheque Deposit', text: 'Cheque Deposit' }
            ];
            const trxSelect = document.getElementById('transactionType');
            trxTypes.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.text = t.text;
                trxSelect.add(opt);
            });

            // Instrument Types
            const instTypes = [
                { id: 'Cash', text: 'Cash' },
                { id: 'Cheque', text: 'Cheque' },
                { id: 'Slip', text: 'Slip' }
            ];
            const instSelect = document.getElementById('instrumentType');
            instTypes.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.text = t.text;
                instSelect.add(opt);
            });

            // Liquidation Option
            const liqOptions = [
                { id: 'Auto', text: 'Auto Liquidation' },
                { id: 'Manual', text: 'Manual' }
            ];
            const liqSelect = document.getElementById('liquidationOption');
            liqOptions.forEach(t => {
                const opt = document.createElement('option');
                opt.value = t.id;
                opt.text = t.text;
                liqSelect.add(opt);
            });


        } catch (error) {
            console.error('Failed to populate dropdowns', error);
        }
    }

    function disableFormControls() {
        document.querySelectorAll('#cashTransactionForm input, #cashTransactionForm select, #cashTransactionForm textarea, .btn-lookup').forEach(el => {
            el.disabled = true;
        });
    }

    function enableFormControls() {
        document.querySelectorAll('#cashTransactionForm input, #cashTransactionForm select, #cashTransactionForm textarea, .btn-lookup').forEach(el => {
            if (el.readOnly) return;
            el.disabled = false;
        });
    }

    function updateActionButtonsState(activeAction) {
        document.querySelectorAll('.btn-action[data-action]').forEach(btn => {
            const action = btn.dataset.action;

            if (['view-all', 'denomination', 'print', 'teller-balance', 'account-info'].includes(action)) {
                btn.disabled = false;
                return;
            }

            if (activeAction === 'Add' || activeAction === 'Edit') {
                btn.disabled = !['save', 'cancel'].includes(action);
                if (action === 'save') btn.classList.add('underline');
                else btn.classList.remove('underline');
            } else {
                btn.disabled = !['add', 'edit', 'delete', 'view'].includes(action);
                btn.classList.remove('underline');
            }
        });
    }

    function setStatus(msg, className) {
        const el = document.getElementById('statusMessage');
        // Validation / flow issues should surface as warning toasts.
        if ((className || '').includes('text-danger') || (className || '').includes('text-warning')) {
            showToast(msg, 'warning');
        }
        if (!el) return;
        el.textContent = msg;
        el.className = className || '';
    }

    // Initialization
    function init() {
        console.log('Cash Transaction: Init called');
        wireActionButtons();
        wireMoneyFields();
        wireDatePickerButtons();
        wireLookupButtons();
        wireSerialIdSearch();
        populateDropdowns();

        // Default state: View mode (Save/Cancel disabled).
        disableFormControls();
        updateActionButtonsState('View');
        console.log('Cash Transaction - Basic Wiring Initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
