/**
 * Account Activate Dormant Module
 * Standardized for KAIRO MVC project.
 * Uses AppCore.invokeControllerAsync for all API calls.
 */
window.ActivateDormantModule = (function () {
    'use strict';

    // Module State
    const state = {
        accountId: '',
        branchId: '',
        operatorId: '',
        currentMode: 'VIEW', // VIEW, ADD, EDIT
        dormantData: null,
        currentUpdateCount: 0
    };

    // API Paths
    const API = {
        GET_DATA: 'AccountsMaintenance/api/get-account-dormant',
        UPDATE_DATA: 'AccountsMaintenance/api/edit-account-dormant'
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[ActivateDormant] Initializing module...');
        loadContext();

        // Initial data load
        if (state.accountId) {
            loadData();
        } else {
            AppCore.showMsg('No account context found. Please select an account.', 'warning');
            setMode('VIEW');
        }
    }

    /**
     * Load account and branch context
     */
    function loadContext() {
        const globalState = window.AccountMaintenanceState || {};
        state.accountId = globalState.AccountID || sessionStorage.getItem('currentAccountID') || '';
        state.branchId = globalState.OurBranchID || sessionStorage.getItem('currentBranchID') || '';
        state.operatorId = globalState.OperatorID || localStorage.getItem('OperatorID') || 'SYSTEM';

        // Update UI with IDs
        const branchInput = document.getElementById('branchId');
        const accountInput = document.getElementById('accountId');
        if (branchInput) branchInput.value = state.branchId;
        if (accountInput) accountInput.value = state.accountId;

        if (globalState.BranchName) {
            const branchNameInput = document.getElementById('branchName');
            if (branchNameInput) branchNameInput.value = globalState.BranchName;
        }
        if (globalState.AccountName) {
            const accountNameInput = document.getElementById('accountName');
            if (accountNameInput) accountNameInput.value = globalState.AccountName;
        }
    }

    /**
     * Load dormant data from the server
     */
    async function loadData() {
        if (!state.accountId) return;

        AppCore.showLoading(true);
        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const response = await AppCore.invokeControllerAsync(API.GET_DATA, {
                SearchKey: searchKey,
                SearchID: searchKey,
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId
            });

            if (response && response.ResponseCode === '00') {
                const data = response.Details || response.Data || response.data;
                state.dormantData = Array.isArray(data) ? data[0] : data;

                if (state.dormantData) {
                    populateForm(state.dormantData);
                    updateStatusDisplay(state.dormantData);
                } else {
                    clearForm();
                    updateStatusDisplay(null);
                }
                setMode('VIEW');
            } else {
                state.dormantData = null;
                clearForm();
                updateStatusDisplay(null);
                setMode('VIEW');
                AppCore.showMsg(response.ResponseMessage || 'Details not found', 'info');
            }
        } catch (error) {
            console.error('[ActivateDormant] Error loading data:', error);
            AppCore.showMsg('Failed to load dormant details', 'error');
        } finally {
            AppCore.showLoading(false);
        }
    }

    /**
     * Populate form fields with data
     */
    function populateForm(data) {
        document.getElementById('dormantReason').value = data.DormantReason || data.ReasonID || '';
        document.getElementById('dormantDate').value = AppCore.formatDate(data.DormantDate || data.DormancyDate);
        document.getElementById('reactivationDate').value = AppCore.formatDate(data.ReactivationDate || data.LastActiveDate);
        document.getElementById('instructedBy').value = data.InstructedBy || '';
        document.getElementById('remarks').value = data.Remarks || data.Notes || '';

        // Status Info
        document.getElementById('lastActivityDate').value = AppCore.formatDate(data.LastActivityDate);
        document.getElementById('dormantDays').value = data.DormantDays || data.DaysSinceLastActivity || '0';
        document.getElementById('dormancyThreshold').value = data.DormancyThreshold || data.InactiveDaysThreshold || '';

        const btsFieldsAndValues = [
            { id: 'dormantDateVal', value: AppCore.formatDate(data.DormantDate || data.DormancyDate) },
            { id: 'originalProduct', value: data.OriginalProduct || '-' },
            { id: 'dormantProduct', value: data.DormantProduct || '-' },
            { id: 'balance', value: AppCore.formatCurrency(data.Balance || 0) },
            { id: 'lastCreditDate', value: AppCore.formatDate(data.LastCreditDate) },
            { id: 'creditAmount', value: AppCore.formatCurrency(data.CreditAmount || 0) },
            { id: 'lastDebitDate', value: AppCore.formatDate(data.LastDebitDate) },
            { id: 'debitAmount', value: AppCore.formatCurrency(data.DebitAmount || 0) },
            { id: 'fixedAmount', value: AppCore.formatCurrency(data.FixedAmount || 0) },
            { id: 'MakerID', value: data.MakerID || data.CreatedBy || '-' },
            { id: 'MakerDT', value: AppCore.formatDate(data.MakerDT || data.CreatedOn, true) },
            { id: 'ModifierID', value: data.ModifierID || data.ModifiedBy || '-' },
            { id: 'ModifierDT', value: AppCore.formatDate(data.ModifierDT || data.ModifiedOn, true) }
        ];

        btsFieldsAndValues.forEach(f => {
            const el = document.getElementById(f.id);
            if (el) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.value = f.value;
                } else {
                    el.textContent = f.value;
                }
            }
        });

        state.currentUpdateCount = parseInt(data.UpdateCount || 0);
    }

    /**
     * Update status display items
     */
    function updateStatusDisplay(data) {
        const isDormant = data?.IsDormant || data?.DormantStatus === 'Y';
        const statusBadge = document.getElementById('dormantStatus');
        const indicator = document.querySelector('.dormant-indicator');

        if (statusBadge) {
            statusBadge.textContent = isDormant ? 'DORMANT' : 'ACTIVE';
            statusBadge.className = `badge ${isDormant ? 'bg-warning text-dark' : 'bg-success'}`;
        }

        if (indicator) {
            indicator.className = `dormant-indicator ${isDormant ? 'dormant' : 'active'}`;
        }
    }

    /**
     * Set the UI mode
     */
    function setMode(mode) {
        state.currentMode = mode;
        const isEditing = mode === 'EDIT';

        const fields = ['dormantReason', 'instructedBy', 'remarks'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !isEditing;
        });

        console.log(`[ActivateDormant] Mode set to: ${mode}`);

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
     * Clear the form
     */
    function clearForm() {
        const fields = ['dormantReason', 'dormantDate', 'reactivationDate', 'instructedBy', 'remarks', 'lastActivityDate', 'dormantDays', 'dormancyThreshold'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const auditLabels = ['dormantDateVal', 'originalProduct', 'dormantProduct', 'balance', 'lastCreditDate', 'creditAmount', 'lastDebitDate', 'debitAmount', 'fixedAmount', 'MakerID', 'MakerDT', 'ModifierID', 'ModifierDT'];
        auditLabels.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
                    el.value = '';
                } else {
                    el.textContent = '-';
                }
            }
        });

        state.currentUpdateCount = 0;
    }

    /**
     * UI Action: Navigate (Refresh data)
     */
    function navigate() {
        setMode('VIEW');
        loadData();
    }

    /**
     * UI Action: Confirm Edit
     */
    function confirmEdit() {
        if (!state.dormantData) {
            AppCore.showMsg('No data loaded to edit', 'warning');
            return;
        }
        setMode('EDIT');
    }

    /**
     * UI Action: Save Data
     */
    async function saveData() {
        if (state.currentMode !== 'EDIT') return;

        AppCore.showLoading(true);
        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const payload = {
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                SearchKey: searchKey,
                DormantReason: document.getElementById('dormantReason').value,
                InstructedBy: document.getElementById('instructedBy').value,
                Remarks: document.getElementById('remarks').value,
                UpdateCount: state.currentUpdateCount
            };

            const response = await AppCore.invokeControllerAsync(API.UPDATE_DATA, payload);

            const isOk = response && (response.ResponseCode === '00' || response.success || response.Success);
            if (isOk) {
                AppCore.showMsg(response.ResponseMessage || response.message || 'Saved successfully', 'success');
                setMode('VIEW');
                loadData();
            } else {
                AppCore.showMsg(response?.ResponseMessage || response?.message || 'Failed to save', 'error');
            }
        } catch (error) {
            console.error('[ActivateDormant] Error saving data:', error);
            AppCore.showMsg('An error occurred while saving', 'error');
        } finally {
            AppCore.showLoading(false);
        }
    }

    /**
     * UI Action: Activate Account
     */
    async function activateAccount() {
        const confirmed = await AppCore.showConfirmation('Reactivate Account', 'Are you sure you want to reactivate this dormant account?');
        if (!confirmed) return;

        AppCore.showLoading(true);
        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const payload = {
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                SearchKey: searchKey,
                Action: 'ACTIVATE',
                IsDormant: false
            };

            const response = await AppCore.invokeControllerAsync(API.UPDATE_DATA, payload);

            const isOk = response && (response.ResponseCode === '00' || response.success || response.Success);
            if (isOk) {
                AppCore.showMsg(response.ResponseMessage || response.message || 'Account activated successfully', 'success');
                loadData();
            } else {
                AppCore.showMsg(response?.ResponseMessage || response?.message || 'Failed to activate account', 'error');
            }
        } catch (error) {
            console.error('[ActivateDormant] Error activating account:', error);
            AppCore.showMsg('An error occurred during activation', 'error');
        } finally {
            AppCore.showLoading(false);
        }
    }

    /**
     * UI Action: Mark Dormant
     */
    async function markDormant() {
        const reason = document.getElementById('dormantReason').value;
        if (!reason) {
            AppCore.showMsg('Please select a dormancy reason first', 'warning');
            return;
        }

        const confirmed = await AppCore.showConfirmation('Mark Dormant', 'Are you sure you want to mark this account as dormant?');
        if (!confirmed) return;

        AppCore.showLoading(true);
        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const payload = {
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                SearchKey: searchKey,
                DormantReason: reason,
                InstructedBy: document.getElementById('instructedBy').value,
                Remarks: document.getElementById('remarks').value,
                Action: 'MARK_DORMANT',
                IsDormant: true
            };

            const response = await AppCore.invokeControllerAsync(API.UPDATE_DATA, payload);

            const isOk = response && (response.ResponseCode === '00' || response.success || response.Success);
            if (isOk) {
                AppCore.showMsg(response.ResponseMessage || response.message || 'Account marked as dormant', 'success');
                loadData();
            } else {
                AppCore.showMsg(response?.ResponseMessage || response?.message || 'Failed to mark as dormant', 'error');
            }
        } catch (error) {
            console.error('[ActivateDormant] Error marking as dormant:', error);
            AppCore.showMsg('An error occurred while marking as dormant', 'error');
        } finally {
            AppCore.showLoading(false);
        }
    }

    /**
     * UI Action: Confirm Cancel
     */
    function confirmCancel() {
        if (state.currentMode === 'VIEW') return;
        if (state.dormantData) {
            populateForm(state.dormantData);
        } else {
            clearForm();
        }
        setMode('VIEW');
    }

    // Public API
    return {
        init,
        navigate,
        confirmEdit,
        saveData,
        activateAccount,
        markDormant,
        confirmCancel,
        setMode
    };

})();

console.log('[ActivateDormant] Module loaded');
