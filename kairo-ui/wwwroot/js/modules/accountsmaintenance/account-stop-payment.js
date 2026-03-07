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

    // API Endpoints (Simplified for AppCore.invokeControllerAsync)
    const API = {
        GET: 'api/get-stop-payments',
        ADD: 'api/add-stop-payment',
        UPDATE: 'api/update-stop-payment'
    };

    /**
     * Initialize Module
     */
    function init() {
        console.log(`[${state.submoduleName}] Initializing...`);

        // Load context from global state or session
        loadContext();

        if (!state.context.accountId) {
            AppCore.showMsg('No account selected. Please load an account first.', 'warning');
            return;
        }

        // Initial Data Load
        loadData();

        // Initial UI State
        setMode('VIEW');

        console.log(`[${state.submoduleName}] Initialized successfully.`);
    }

    /**
     * Load Account Context
     */
    function loadContext() {
        const globalState = window.AccountMaintenanceState || {};
        state.context.accountId = globalState.AccountID || sessionStorage.getItem('currentAccountID');
        state.context.branchId = globalState.OurBranchID || sessionStorage.getItem('currentBranchID');
        state.context.operatorId = globalState.OperatorID || localStorage.getItem('OperatorID') || 'SYSTEM';

        // Auto-populate Account ID and Branch if available
        const accountIdEl = document.getElementById('accountId');
        const branchIdEl = document.getElementById('branchId');
        const accountNameEl = document.getElementById('accountName');
        const branchNameEl = document.getElementById('branchName');

        if (accountIdEl) accountIdEl.value = state.context.accountId || '';
        if (branchIdEl) branchIdEl.value = state.context.branchId || '';
        if (accountNameEl) accountNameEl.value = globalState.AccountName || '';
        if (branchNameEl) branchNameEl.value = globalState.BranchName || '';
    }

    /**
     * Load Stop Payment Records
     */
    async function loadData() {
        try {
            AppCore.showLoading(true, 'Loading stop payment records...');

            const requestData = {
                AccountID: state.context.accountId,
                OurBranchID: state.context.branchId
            };

            const result = await AppCore.invokeControllerAsync('AccountsMaintenance/' + API.GET, requestData);

            if (result && result.Success) {
                state.records = result.Data || [];
                renderGrid();

                if (state.records.length > 0) {
                    selectRecord(0);
                } else {
                    clearForm();
                }
            } else {
                AppCore.showMsg(result?.ErrorMessage || 'Failed to load stop payment records.', 'error');
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
        if (state.records.length > 0) {
            selectRecord(0);
        }
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

            const isAdd = state.currentMode === 'ADD';

            const payload = {
                AccountID: state.context.accountId,
                OurBranchID: state.context.branchId,
                OperatorID: state.context.operatorId,
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
            const endpoint = 'AccountsMaintenance/' + (isAdd ? API.ADD : API.UPDATE);
            const result = await AppCore.invokeControllerAsync(endpoint, payload);

            if (result && result.Success) {
                AppCore.showMsg('Stop payment record saved successfully.', 'success');
                setMode('VIEW');
                await loadData();
            } else {
                AppCore.showMsg(result?.ErrorMessage || 'Failed to save record.', 'error');
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

        const confirmed = await AppCore.showConfirmation('Confirm Void', 'Are you sure you want to void this stop payment record?');
        if (!confirmed) return;

        try {
            AppCore.showLoading(true, 'Voiding stop payment record...');

            const requestData = {
                AccountID: state.context.accountId,
                OurBranchID: state.context.branchId,
                RecordID: state.selectedRecord.RecordID, // Adjust field name if necessary
                OperatorID: state.context.operatorId
            };

            const result = await AppCore.invokeControllerAsync(API.DELETE, requestData);

            if (result && result.Success) {
                AppCore.showMsg('Stop payment record voided successfully.', 'success');
                await loadData();
            } else {
                AppCore.showMsg(result?.ErrorMessage || 'Failed to void record.', 'error');
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
