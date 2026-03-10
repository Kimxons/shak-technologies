/**
 * Account Cancel Stop Payment Module
 * Standardized for KAIRO MVC project.
 * Uses AppCore.invokeControllerAsync for all API calls.
 */
window.CancelStopPaymentModule = (function () {
    'use strict';

    // Module State
    const state = {
        accountId: '',
        branchId: '',
        operatorId: '',
        currentMode: 'VIEW', // VIEW, ADD, EDIT
        records: [],
        selectedIndex: -1,
        selectedRecord: null,
        currentUpdateCount: 0
    };

    // API Paths
    const API = {
        GET: 'AccountsMaintenance/api/get-cancel-stop-payments',
        ADD: 'AccountsMaintenance/api/add-cancel-stop-payment',
        UPDATE: 'AccountsMaintenance/api/update-cancel-stop-payment'
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[CancelStopPayment] Initializing module...');
        wireSectionToggles();
        const ctx = loadContext();

        // Initial data load
        if (ctx.accountId) {
            loadData();
        } else {
            AppCore.showMsg('No account context found. Please select an account.', 'warning');
            setMode('VIEW');
        }

        // Wire lookup buttons that are internal to this submodule
        wireInternalLookups();
    }

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            if (header._wiredSectionToggle) return;
            header._wiredSectionToggle = true;

            header.addEventListener('click', function () {
                const section = this.closest('.form-section');
                const content = section?.querySelector('[data-section-content], .section-content');
                const btn = section?.querySelector('.section-toggle-btn');
                const icon = btn?.querySelector('i');
                if (!content) return;

                const expanded = (btn?.getAttribute('aria-expanded') ?? 'true') === 'true';
                content.style.display = expanded ? 'none' : '';
                btn?.setAttribute('aria-expanded', String(!expanded));

                if (icon) {
                    icon.classList.toggle('bi-chevron-up', !expanded);
                    icon.classList.toggle('bi-chevron-down', expanded);
                }
            });
        });
    }

    /**
     * Load account and branch context from global state or session
     */
    function getContext() {
        const globalState = window.AccountMaintenanceState || {};
        return {
            accountId: globalState.AccountID || sessionStorage.getItem('currentAccountID') || '',
            branchId: globalState.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            operatorId: globalState.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM',
            accountName: globalState.AccountName || sessionStorage.getItem('currentAccountName') || '',
            branchName: globalState.BranchName || sessionStorage.getItem('currentBranchName') || ''
        };
    }

    function applyContextToIdentification(ctx) {
        const branchInput = document.getElementById('branchId');
        const accountInput = document.getElementById('accountId');
        const branchNameInput = document.getElementById('branchName');
        const accountNameInput = document.getElementById('accountName');

        if (branchInput) branchInput.value = ctx.branchId;
        if (accountInput) accountInput.value = ctx.accountId;
        if (branchNameInput) branchNameInput.value = ctx.branchName;
        if (accountNameInput) accountNameInput.value = ctx.accountName;
    }

    function loadContext() {
        const ctx = getContext();
        state.accountId = ctx.accountId;
        state.branchId = ctx.branchId;
        state.operatorId = ctx.operatorId;
        applyContextToIdentification(ctx);
        return ctx;
    }

    /**
     * Load data from the server
     */
    async function loadData() {
        const ctx = loadContext();
        if (!ctx.accountId || !ctx.branchId) return;

        AppCore.showLoading(true);
        try {
            const result = await AppCore.invokeControllerAsync(API.GET, {
                OurBranchID: ctx.branchId,
                AccountID: ctx.accountId,
                OperatorID: ctx.operatorId
            });

            if (result && result.ResponseCode === '00') {
                const details = result.Details || {};

                // Details01 usually contains client/account info
                const clientInfo = (details.Details01 && details.Details01.length > 0) ? details.Details01[0] : {};
                populateAccountDetails(clientInfo);

                // Details02 usually contains the records
                state.records = details.Details02 || (Array.isArray(details) ? details : []);
                renderGrid();

                if (state.records.length > 0) {
                    selectRecord(0);
                } else {
                    clearForm();
                    setMode('VIEW');
                }
            } else {
                state.records = [];
                renderGrid();
                clearForm();
                setMode('VIEW');
                AppCore.showMsg(result.ResponseMessage || 'No records found', 'info');
            }
        } catch (error) {
            console.error('[CancelStopPayment] Error loading data:', error);
            AppCore.showMsg('Failed to load cancel stop payment records', 'error');
        } finally {
            AppCore.showLoading(false);
        }
    }

    /**
     * Render the grid with records
     */
    function renderGrid() {
        const gridBody = document.querySelector('#stopPaymentGrid tbody');
        if (!gridBody) return;

        if (state.records.length === 0) {
            gridBody.innerHTML = '<tr class="grid-empty-row"><td colspan="8" class="text-center">No records to display.</td></tr>';
            document.getElementById('recordCount').textContent = '0 records';
            return;
        }

        gridBody.innerHTML = state.records.map((rec, index) => `
            <tr class="grid-row ${index === state.selectedIndex ? 'selected' : ''}" data-index="${index}">
                <td>${rec.ChequePrefix || ''}</td>
                <td>${rec.StartChequeID || rec.ChequeNoStart || ''}</td>
                <td>${rec.EndChequeID || rec.ChequeNoEnd || ''}</td>
                <td>${AppCore.formatDate(rec.ChequeDate)}</td>
                <td>${rec.CancelReason || rec.ReasonText || ''}</td>
                <td>${AppCore.formatDate(rec.CancelledDate || rec.CancellationDate)}</td>
                <td class="text-end">${AppCore.formatCurrency(rec.ChequeAmount)}</td>
                <td>${rec.CancelledBy || rec.InstructionGivenBy || ''}</td>
            </tr>
        `).join('');

        document.getElementById('recordCount').textContent = `${state.records.length} record(s)`;

        // Wire up row click events
        gridBody.querySelectorAll('.grid-row').forEach(row => {
            row.addEventListener('click', () => {
                const index = parseInt(row.getAttribute('data-index'));
                selectRecord(index);
            });
        });
    }

    /**
     * Select a record from the grid
     */
    function selectRecord(index) {
        if (state.currentMode !== 'VIEW') return;

        state.selectedIndex = index;
        state.selectedRecord = state.records[index];

        // Highlight selected row
        const rows = document.querySelectorAll('#stopPaymentGrid tbody tr');
        rows.forEach((row, i) => {
            row.classList.toggle('selected', i === index);
        });

        if (state.selectedRecord) {
            populateForm(state.selectedRecord);
        }
    }

    /**
     * Populate the form fields with record data
     */
    function populateForm(rec) {
        document.getElementById('requestRef').value = rec.RequestReferenceNo || rec.RequestRef || '';
        document.getElementById('chequeNoStart').value = rec.StartChequeID || rec.ChequeNoStart || '';
        document.getElementById('chequeNoEnd').value = rec.EndChequeID || rec.ChequeNoEnd || '';
        document.getElementById('chequeDate').value = formatDateForInput(rec.ChequeDate);
        document.getElementById('chequeAmount').value = rec.ChequeAmount || '0.00';
        document.getElementById('reasonId').value = rec.CancelReasonID || rec.ReasonId || '';
        document.getElementById('reasonText').value = rec.CancelReason || rec.ReasonText || '';
        document.getElementById('cancellationDate').value = formatDateForInput(rec.CancelledDate || rec.CancellationDate);
        document.getElementById('instructionGivenBy').value = rec.CancelledBy || rec.InstructionGivenBy || '';

        state.currentUpdateCount = parseInt(rec.UpdateCount || 0);

        // Populate Audit info
        document.getElementById('CurrencyID').textContent = rec.CurrencyID || '-';
        document.getElementById('MakerID').textContent = rec.MakerID || rec.CreatedBy || '-';
        document.getElementById('MakerDT').textContent = AppCore.formatDate(rec.MakerDT || rec.CreatedOn, true);
        document.getElementById('SupervisorID').textContent = rec.SupervisorID || rec.SupervisedBy || '-';
        document.getElementById('SupervisorDT').textContent = AppCore.formatDate(rec.SupervisorDT || rec.SupervisedOn, true);
    }

    function formatDateForInput(dateStr) {
        if (!dateStr) return '';
        if (window.GlobalUtils?.parseDateInput) {
            const parsed = window.GlobalUtils.parseDateInput(dateStr);
            if (parsed) return parsed;
        }
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        } catch {
            return '';
        }
    }

    /**
     * Populate the account details section
     */
    function populateAccountDetails(client) {
        if (!client) return;

        document.getElementById('clientId').value = client.ClientID || '';
        document.getElementById('clientName').value = client.ClientName || '';
        document.getElementById('productId').value = client.ProductID || '';
        document.getElementById('productName').value = client.ProductName || '';
        document.getElementById('address1').value = client.Address1 || '';
        document.getElementById('address2').value = client.Address2 || '';
        document.getElementById('city').value = client.City || '';
        document.getElementById('country').value = client.Country || '';
        document.getElementById('phoneHome').value = client.PhoneHome || '';
        document.getElementById('phoneWork').value = client.PhoneWork || '';
        document.getElementById('faxNo').value = client.FaxNo || '';
        document.getElementById('mobile').value = client.Mobile || '';

        // If not already set, update branch and account names from client info
        if (client.BranchName && !document.getElementById('branchName').value) {
            document.getElementById('branchName').value = client.BranchName;
        }
        if (client.AccountName && !document.getElementById('accountName').value) {
            document.getElementById('accountName').value = client.AccountName;
        }
    }

    /**
     * Clear the form fields
     */
    function clearForm() {
        const fields = [
            'requestRef', 'chequeNoStart', 'chequeNoEnd', 'chequeDate', 'chequeAmount',
            'reasonId', 'reasonText', 'cancellationDate', 'instructionGivenBy'
        ];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        document.getElementById('CurrencyID').textContent = '-';
        document.getElementById('MakerID').textContent = '-';
        document.getElementById('MakerDT').textContent = '-';
        document.getElementById('SupervisorID').textContent = '-';
        document.getElementById('SupervisorDT').textContent = '-';

        state.currentUpdateCount = 0;
    }

    /**
     * Set the UI mode (VIEW, ADD, EDIT)
     */
    function setMode(mode) {
        state.currentMode = mode;
        const isEditing = mode === 'ADD' || mode === 'EDIT';

        // Enable/disable fields based on mode
        const editableFields = [
            'requestRef', 'chequeNoStart', 'chequeNoEnd', 'chequeDate', 'chequeAmount',
            'reasonId', 'reasonText', 'cancellationDate', 'instructionGivenBy'
        ];

        editableFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !isEditing;
        });

        console.log(`[CancelStopPayment] Mode changed to: ${mode}`);

        // Update Global Buttons
        const btnView = document.getElementById('submoduleBtnView');
        const btnAdd = document.getElementById('submoduleBtnAdd');
        const btnEdit = document.getElementById('submoduleBtnEdit');
        const btnSave = document.getElementById('submoduleBtnSave');
        const btnCancel = document.getElementById('submoduleBtnCancel');
        const btnDelete = document.getElementById('submoduleBtnDelete');

        if (btnView) btnView.disabled = isEditing;
        if (btnAdd) btnAdd.disabled = isEditing;
        if (btnEdit) btnEdit.disabled = isEditing;
        if (btnSave) btnSave.disabled = !isEditing;
        if (btnCancel) btnCancel.disabled = !isEditing;
        if (btnDelete) btnDelete.disabled = isEditing;
    }

    /**
     * UI Action: Navigate (Refresh data)
     */
    function navigate() {
        setMode('VIEW');
        loadData();
    }

    /**
     * UI Action: Confirm Add
     */
    function confirmAdd() {
        clearForm();
        setMode('ADD');
    }

    /**
     * UI Action: Confirm Edit
     */
    function confirmEdit() {
        if (state.selectedIndex < 0) {
            AppCore.showMsg('Please select a record to edit', 'warning');
            return;
        }
        setMode('EDIT');
    }

    /**
     * UI Action: Save Data
     */
    async function saveData() {
        if (state.currentMode === 'VIEW') return;
        const ctx = loadContext();

        // Validation
        const startCh = document.getElementById('chequeNoStart').value.trim();
        const endCh = document.getElementById('chequeNoEnd').value.trim();
        const reasonId = document.getElementById('reasonId').value;

        if (!startCh) { AppCore.showMsg('Cheque No Start is required', 'warning'); return; }
        if (!endCh) { AppCore.showMsg('Cheque No End is required', 'warning'); return; }
        if (!reasonId) { AppCore.showMsg('Cancel Reason is required', 'warning'); return; }

        const confirmed = await AppCore.showConfirmation('Confirm Save', 'Are you sure you want to save this cancel stop payment?');
        if (!confirmed) return;

        AppCore.showLoading(true);
        try {
            const isAdd = state.currentMode === 'ADD';
            const payload = {
                OurBranchID: ctx.branchId,
                AccountTypeID: 'C',
                AccountID: ctx.accountId,
                OperatorID: ctx.operatorId,
                RequestReferenceNo: document.getElementById('requestRef').value.trim(),
                StartChequeID: startCh,
                EndChequeID: endCh,
                ChequeDate: document.getElementById('chequeDate').value,
                ChequeAmount: document.getElementById('chequeAmount').value || '0',
                CancelReasonID: reasonId,
                CancelReason: document.getElementById('reasonText').value.trim(),
                CancelledBy: document.getElementById('instructionGivenBy').value.trim(),
                CancelledDate: document.getElementById('cancellationDate').value,
                NewRecord: isAdd ? 1 : 0,
                UpdateCount: state.currentUpdateCount
            };

            const endpoint = isAdd ? API.ADD : API.UPDATE;
            const result = await AppCore.invokeControllerAsync(endpoint, payload);

            const isOk = result && (result.ResponseCode === '00' || result.success || result.Success);
            if (isOk) {
                AppCore.showMsg(result.ResponseMessage || result.message || 'Record saved successfully', 'success');
                setMode('VIEW');
                loadData();
            } else {
                AppCore.showMsg(result?.ResponseMessage || result?.message || 'Failed to save record', 'error');
            }
        } catch (error) {
            console.error('[CancelStopPayment] Error saving data:', error);
            AppCore.showMsg('An error occurred while saving', 'error');
        } finally {
            AppCore.showLoading(false);
        }
    }

    /**
     * UI Action: Delete Data
     */
    async function deleteData() {
        if (state.selectedIndex < 0) {
            AppCore.showMsg('Please select a record to delete', 'warning');
            return;
        }

        const ctx = loadContext();

        const confirmed = await AppCore.showConfirmation('Confirm Delete', 'Are you sure you want to delete this cancel stop payment record?');
        if (!confirmed) return;

        AppCore.showLoading(true);
        try {
            const rec = state.records[state.selectedIndex];
            const payload = {
                OurBranchID: ctx.branchId,
                AccountTypeID: 'C',
                AccountID: ctx.accountId,
                OperatorID: ctx.operatorId,
                RequestReferenceNo: rec.RequestReferenceNo || rec.RequestRef || '',
                NewRecord: -1 // Signal for delete
            };

            const result = await AppCore.invokeControllerAsync(API.UPDATE, payload);

            const isOk = result && (result.ResponseCode === '00' || result.success || result.Success);
            if (isOk) {
                AppCore.showMsg(result.ResponseMessage || result.message || 'Record deleted successfully', 'success');
                loadData();
            } else {
                AppCore.showMsg(result?.ResponseMessage || result?.message || 'Failed to delete record', 'error');
            }
        } catch (error) {
            console.error('[CancelStopPayment] Error deleting data:', error);
            AppCore.showMsg('An error occurred while deleting', 'error');
        } finally {
            AppCore.showLoading(false);
        }
    }

    /**
     * UI Action: Confirm Cancel (Discard changes)
     */
    function confirmCancel() {
        if (state.currentMode === 'VIEW') return;

        if (state.selectedIndex >= 0) {
            populateForm(state.records[state.selectedIndex]);
        } else {
            clearForm();
        }
        setMode('VIEW');
    }

    /**
     * Wire up internal lookup buttons
     */
    function wireInternalLookups() {
        // Internal lookups can be handled here if needed
        // The main lookups (Account, Branch) are usually handled by the orchestrator
    }

    // Public API
    return {
        init,
        navigate,
        confirmAdd,
        confirmEdit,
        saveData,
        deleteData,
        confirmCancel,
        setMode
    };

})();

console.log('[CancelStopPayment] Module loaded');
