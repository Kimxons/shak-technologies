/**
 * Stop Payment Void Module
 * Refactored to align with IApiService pattern and AppCore.invokeControllerAsync
 */
window.StopPaymentVoidModule = (function () {
    'use strict';

    // Module State
    const state = {
        submoduleName: 'StopPaymentVoid',
        currentMode: 'VIEW', // VIEW, ADD, EDIT
        records: [],
        selectedIndex: -1,
        selectedRecord: null,
        context: {
            accountId: '',
            branchId: '',
            operatorId: ''
        }
    };

    // API Endpoints
    const API = {
        GET: 'AccountsMaintenance/api/get-stop-payments',
        ADD: 'AccountsMaintenance/api/add-stop-payment',
        UPDATE: 'AccountsMaintenance/api/update-stop-payment',
        DELETE: 'AccountsMaintenance/api/delete-stop-payment'
    };

    /**
     * Initialize Module
     */
    function init() {
        console.log(`[${state.submoduleName}] Initializing...`);

        wireSectionToggles();

        // Load context from global state or session
        const ctx = loadContext();

        if (!ctx.accountId) {
            AppCore.showMsg('No account selected. Please load an account first.', 'warning');
            return;
        }

        // Initial Data Load
        loadData();

        // Initial UI State
        setMode('VIEW');

        console.log(`[${state.submoduleName}] Initialized successfully.`);
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
     * Load Account Context
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
        const accountIdEl = document.getElementById('accountId');
        const branchIdEl = document.getElementById('branchId');
        const accountNameEl = document.getElementById('accountName');
        const branchNameEl = document.getElementById('branchName');

        if (accountIdEl) accountIdEl.value = ctx.accountId || '';
        if (branchIdEl) branchIdEl.value = ctx.branchId || '';
        if (accountNameEl) accountNameEl.value = ctx.accountName || '';
        if (branchNameEl) branchNameEl.value = ctx.branchName || '';
    }

    function loadContext() {
        const ctx = getContext();
        state.context.accountId = ctx.accountId;
        state.context.branchId = ctx.branchId;
        state.context.operatorId = ctx.operatorId;
        applyContextToIdentification(ctx);
        return ctx;
    }

    /**
     * Load Stop Payment Records
     */
    async function loadData() {
        const ctx = loadContext();
        if (!ctx.accountId || !ctx.branchId) {
            AppCore.showMsg('No account selected. Please load an account first.', 'warning');
            return;
        }

        try {
            AppCore.showLoading(true, 'Loading stop payment records...');

            const requestData = {
                AccountID: ctx.accountId,
                OurBranchID: ctx.branchId,
                OperatorID: ctx.operatorId
            };

            const result = await AppCore.invokeControllerAsync(API.GET, requestData);

            const isOk = result && (result.Success || result.success || result.ResponseCode === '00');
            if (isOk) {
                state.records = result.Data || result.data || result.Details || [];
                renderGrid();

                if (state.records.length > 0) {
                    selectRecord(0);
                } else {
                    clearForm();
                }
            } else {
                AppCore.showMsg(result?.ErrorMessage || result?.message || result?.ResponseMessage || 'Failed to load stop payment records.', 'error');
            }
        } catch (error) {
            console.error(`[${state.submoduleName}] Load Error:`, error);
            AppCore.showMsg('Error loading records: ' + error.message, 'error');
        } finally {
            AppCore.showLoading(false);
        }
    }

    /**
     * Render Records Grid
     */
    function renderGrid() {
        const gridBody = document.querySelector('#stopPaymentGrid tbody');
        const recordCountEl = document.getElementById('recordCount');

        if (!gridBody) return;

        gridBody.innerHTML = '';
        if (recordCountEl) recordCountEl.textContent = `${state.records.length} records`;

        if (state.records.length === 0) {
            gridBody.innerHTML = '<tr class="grid-empty-row"><td colspan="6" class="text-center">No records to display.</td></tr>';
            return;
        }

        state.records.forEach((rec, index) => {
            const row = document.createElement('tr');
            if (index === state.selectedIndex) row.classList.add('selected');

            row.innerHTML = `
                <td>${rec.ChequeNoStart || '-'}</td>
                <td>${rec.ChequeNoEnd || '-'}</td>
                <td>${AppCore.formatDate(rec.ChequeDate)}</td>
                <td class="text-end">${AppCore.formatCurrency(rec.ChequeAmount)}</td>
                <td>${rec.ReasonDescription || '-'}</td>
                <td>${AppCore.formatDate(rec.VoidDate)}</td>
            `;

            row.addEventListener('click', () => selectRecord(index));
            gridBody.appendChild(row);
        });
    }

    /**
     * Select Record from Grid
     */
    function selectRecord(index) {
        if (index < 0 || index >= state.records.length) return;

        state.selectedIndex = index;
        state.selectedRecord = state.records[index];

        populateForm(state.selectedRecord);
        renderGrid();
    }

    /**
     * Populate Form with Data
     */
    function populateForm(data) {
        if (!data) return;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val !== null && val !== undefined ? val : '';
        };

        setVal('chequeNoStart', data.ChequeNoStart);
        setVal('chequeNoEnd', data.ChequeNoEnd);
        setVal('chequeDate', AppCore.formatDate(data.ChequeDate, 'YYYY-MM-DD'));
        setVal('chequeAmount', data.ChequeAmount);
        setVal('reasonId', data.ReasonID);
        setVal('voidDate', AppCore.formatDate(data.VoidDate, 'YYYY-MM-DD'));
        setVal('requestRef', data.RequestRef);

        // Audit Fields
        const setAudit = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || '-';
        };

        setAudit('MakerID', data.MakerID);
        setAudit('MakerDT', AppCore.formatDate(data.MakerDT, 'DD/MM/YYYY HH:mm'));
        setAudit('ModifierID', data.ModifierID);
        setAudit('ModifierDT', AppCore.formatDate(data.ModifierDT, 'DD/MM/YYYY HH:mm'));
        setAudit('CheckerID', data.CheckerID);
        setAudit('CheckerDT', AppCore.formatDate(data.CheckerDT, 'DD/MM/YYYY HH:mm'));
    }

    /**
     * Clear Form for New Record
     */
    function clearForm() {
        const fields = ['chequeNoStart', 'chequeNoEnd', 'chequeDate', 'chequeAmount', 'reasonId', 'voidDate', 'requestRef'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = '';
        });

        // Reset Audit
        ['MakerID', 'MakerDT', 'ModifierID', 'ModifierDT', 'CheckerID', 'CheckerDT'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
    }

    /**
     * Set Module Mode
     */
    function setMode(mode) {
        state.currentMode = mode;
        const isReadOnly = mode === 'VIEW';

        const fields = ['chequeNoStart', 'chequeNoEnd', 'chequeDate', 'chequeAmount', 'reasonId', 'requestRef'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.disabled = isReadOnly;
        });

        if (mode === 'ADD') {
            clearForm();
            state.selectedIndex = -1;
            state.selectedRecord = null;
            renderGrid();
        }

        // Update Global Buttons
        const btnView = document.getElementById('submoduleBtnView');
        const btnAdd = document.getElementById('submoduleBtnAdd');
        const btnEdit = document.getElementById('submoduleBtnEdit');
        const btnSave = document.getElementById('submoduleBtnSave');
        const btnCancel = document.getElementById('submoduleBtnCancel');
        const btnDelete = document.getElementById('submoduleBtnDelete');

        const isEditing = mode !== 'VIEW';
        if (btnView) btnView.disabled = isEditing;
        if (btnAdd) btnAdd.disabled = isEditing;
        if (btnEdit) btnEdit.disabled = isEditing;
        if (btnSave) btnSave.disabled = !isEditing;
        if (btnCancel) btnCancel.disabled = !isEditing;
        if (btnDelete) btnDelete.disabled = isEditing;
    }

    /**
     * Navigation Logic (Proxy for View Button)
     */
    function navigate() {
        setMode('VIEW');
        loadData();
    }

    /**
     * Mode Confirmation - Add
     */
    function confirmAdd() {
        setMode('ADD');
    }

    /**
     * Mode Confirmation - Edit
     */
    function confirmEdit() {
        if (!state.selectedRecord) {
            AppCore.showMsg('Please select a record to edit.', 'warning');
            return;
        }
        setMode('EDIT');
    }

    /**
     * Save Data
     */
    async function saveData() {
        try {
            if (state.currentMode === 'VIEW') return;
            const ctx = loadContext();

            const isAdd = state.currentMode === 'ADD';

            const payload = {
                AccountID: ctx.accountId,
                OurBranchID: ctx.branchId,
                OperatorID: ctx.operatorId,
                ChequeNoStart: document.getElementById('chequeNoStart').value,
                ChequeNoEnd: document.getElementById('chequeNoEnd').value,
                ChequeDate: document.getElementById('chequeDate').value,
                ChequeAmount: document.getElementById('chequeAmount').value,
                ReasonID: document.getElementById('reasonId').value,
                RequestRef: document.getElementById('requestRef').value,
            };

            if (!isAdd && state.selectedRecord) {
                payload.RecordID = state.selectedRecord.RecordID; // Assuming RecordID is the identifier for updates
            }

            // Validation
            if (!payload.ChequeNoStart || !payload.ChequeNoEnd || !payload.ReasonID) {
                AppCore.showMsg('Please fill in all required fields.', 'warning');
                return;
            }

            const confirmed = await AppCore.showConfirmation('Confirm Save', 'Are you sure you want to save this stop payment/void?');
            if (!confirmed) return;

            AppCore.showLoading(true, 'Saving stop payment record...');
            const endpoint = isAdd ? API.ADD : API.UPDATE;
            const result = await AppCore.invokeControllerAsync(endpoint, payload);

            const isOk = result && (result.Success || result.success || result.ResponseCode === '00');
            if (isOk) {
                AppCore.showMsg('Stop payment record saved successfully.', 'success');
                setMode('VIEW');
                await loadData();
            } else {
                AppCore.showMsg(result?.ErrorMessage || result?.message || result?.ResponseMessage || 'Failed to save record.', 'error');
            }
        } catch (error) {
            console.error(`[${state.submoduleName}] Save Error:`, error);
            AppCore.showMsg('Error saving record: ' + error.message, 'error');
        } finally {
            AppCore.showLoading(false);
        }
    }

    /**
     * Delete/Void Record
     */
    async function deleteData() {
        if (!state.selectedRecord) {
            AppCore.showMsg('Please select a record to void.', 'warning');
            return;
        }

        const ctx = loadContext();

        const confirmed = await AppCore.showConfirmation('Confirm Void', 'Are you sure you want to void this stop payment record?');
        if (!confirmed) return;

        try {
            AppCore.showLoading(true, 'Voiding stop payment record...');

            const requestData = {
                AccountID: ctx.accountId,
                OurBranchID: ctx.branchId,
                RecordID: state.selectedRecord.RecordID, // Adjust field name if necessary
                OperatorID: ctx.operatorId
            };

            const result = await AppCore.invokeControllerAsync(API.DELETE, requestData);

            const isOk = result && (result.Success || result.success || result.ResponseCode === '00');
            if (isOk) {
                AppCore.showMsg('Stop payment record voided successfully.', 'success');
                await loadData();
            } else {
                AppCore.showMsg(result?.ErrorMessage || result?.message || result?.ResponseMessage || 'Failed to void record.', 'error');
            }
        } catch (error) {
            console.error(`[${state.submoduleName}] Void Error:`, error);
            AppCore.showMsg('Error voiding record: ' + error.message, 'error');
        } finally {
            AppCore.showLoading(false);
        }
    }

    /**
     * Cancel Changes
     */
    function confirmCancel() {
        setMode('VIEW');
        if (state.selectedIndex >= 0) {
            selectRecord(state.selectedIndex);
        } else {
            clearForm();
            if (state.records.length > 0) selectRecord(0);
        }
    }

    // Public API
    return {
        init,
        navigate,
        confirmAdd,
        confirmEdit,
        saveData,
        deleteData,
        confirmCancel
    };
})();
