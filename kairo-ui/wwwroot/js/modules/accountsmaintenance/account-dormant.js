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
        currentUpdateCount: 0,
        currentReferenceId: 0,
        currentTrxRowId: 0
    };

    // API Paths
    const API = {
        GET_DATA: 'AccountsMaintenance/api/get-account-dormant',
        UPDATE_DATA: 'AccountsMaintenance/api/edit-account-dormant'
    };

    function extractDormantResponse(response) {
        const root = response?.Details || response?.Data || response?.data || null;
        if (!root || typeof root !== 'object') {
            return { dormantDetails: null, supervision: null };
        }

        const dormantDetails = root.AccountDormantDetails || root.accountDormantDetails || null;
        const supervision = root.SupervisionData || root.supervisionData || null;

        return { dormantDetails, supervision };
    }

    /**
     * Initialize the module
     */
    function init() {
        console.log('[ActivateDormant] Initializing module...');
        loadContext();
        wireLookupSelection();

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

    function refreshContextFromSelection() {
        const globalState = window.AccountMaintenanceState || {};
        state.accountId = document.getElementById('accountId')?.value || globalState.AccountID || sessionStorage.getItem('currentAccountID') || '';
        state.branchId = document.getElementById('branchId')?.value || globalState.OurBranchID || sessionStorage.getItem('currentBranchID') || '';
        state.operatorId = globalState.OperatorID || localStorage.getItem('OperatorID') || 'SYSTEM';
    }

    function handleLookupSelection(event) {
        const targetInputId = String(event?.detail?.targetInputId || '').toLowerCase();
        if (targetInputId !== 'accountid' && targetInputId !== 'branchid') {
            return;
        }

        refreshContextFromSelection();

        const selectedRow = event?.detail?.selectedRow;
        if (targetInputId === 'accountid' && selectedRow) {
            updateStatusDisplay(selectedRow);
        }

        if (!state.accountId) {
            state.dormantData = null;
            clearForm();
            updateStatusDisplay(selectedRow || null);
            setMode('VIEW');
            return;
        }

        loadData();
    }

    function wireLookupSelection() {
        if (window.__activateDormantLookupHandler) {
            document.removeEventListener('kairo:lookup-selected', window.__activateDormantLookupHandler);
        }

        window.__activateDormantLookupHandler = handleLookupSelection;
        document.addEventListener('kairo:lookup-selected', window.__activateDormantLookupHandler);
    }

    /**
     * Load dormant data from the server
     */
    async function loadData() {
        refreshContextFromSelection();
        if (!state.accountId) return;

        AppCore.showLoading(true);
        try {
            const searchKey = `[${state.branchId}:${state.accountId}]`;
            const response = await AppCore.invokeControllerAsync(API.GET_DATA, {
                SearchKey: searchKey,
                SearchID: searchKey,
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                ModuleTypeID: 'A',
                RelevantID: state.accountId
            });

            if (response && response.ResponseCode === '00') {
                const { dormantDetails, supervision } = extractDormantResponse(response);
                state.dormantData = dormantDetails ? { ...dormantDetails, ...(supervision || {}) } : null;

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
        document.getElementById('dormantDate').value = AppCore.formatDate(data.Dormantdate || data.DormantDate || data.DormancyDate);
        document.getElementById('reactivationDate').value = AppCore.formatDate(data.ReactivationDate || data.LastActiveDate);
        document.getElementById('instructedBy').value = data.InstructedBy || '';
        document.getElementById('remarks').value = data.Remarks || data.Comments || data.Notes || '';

        // Status Info
        document.getElementById('lastActivityDate').value = AppCore.formatDate(data.LastActivityDate || data.LastDebitTrxDate || data.LastCreditTrxDate);
        document.getElementById('dormantDays').value = data.DormantDays || data.DaysSinceLastActivity || '0';
        document.getElementById('dormancyThreshold').value = data.DormancyThreshold || data.InactiveDaysThreshold || '';

        const btsFieldsAndValues = [
            { id: 'dormantDateVal', value: AppCore.formatDate(data.Dormantdate || data.DormantDate || data.DormancyDate) },
            { id: 'originalProduct', value: data.OriginalProductName || data.OriginalProduct || data.OriginalProductID || '-' },
            { id: 'dormantProduct', value: data.DormantProductName || data.DormantProduct || data.DormantProductID || '-' },
            { id: 'balance', value: AppCore.formatCurrency(data.Balance || 0) },
            { id: 'lastCreditDate', value: AppCore.formatDate(data.LastCreditDate || data.LastCreditTrxDate) },
            { id: 'creditAmount', value: AppCore.formatCurrency(data.CreditAmount || 0) },
            { id: 'lastDebitDate', value: AppCore.formatDate(data.LastDebitDate || data.LastDebitTrxDate) },
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
        state.currentReferenceId = parseInt(data.ReferenceID || data.ReferenceId || data.ID || 0, 10) || 0;
        state.currentTrxRowId = parseFloat(data.TrxRowID || data.TrxRowId || 0) || 0;
    }

    function buildDormantPayload(overrides = {}) {
        const searchKey = `[${state.branchId}:${state.accountId}]`;
        const now = new Date().toISOString().split('.')[0];
        const remarks = document.getElementById('remarks').value;

        return {
            AccountID: state.accountId,
            OurBranchID: state.branchId,
            OperatorID: state.operatorId,
            SearchKey: searchKey,
            SearchID: searchKey,
            RelevantID: state.accountId,
            ModuleTypeID: 'A',
            ReferenceID: state.currentReferenceId || 0,
            TrxRowID: state.currentTrxRowId || 0,
            DormantReason: document.getElementById('dormantReason').value,
            InstructedBy: document.getElementById('instructedBy').value,
            Remarks: remarks,
            Comments: remarks,
            UpdateCount: state.currentUpdateCount,
            NewRecord: state.currentReferenceId ? 0 : 1,
            CreatedBy: state.operatorId,
            ModifiedBy: state.operatorId,
            ModifiedOn: now,
            SupervisedBy: state.operatorId,
            ...overrides
        };
    }

    /**
     * Update status display items
     */
    function updateStatusDisplay(data) {
        const isDormant = !!(data && (
            data.IsDormant === true ||
            data.IsDormant === 1 ||
            String(data.IsDormant) === '1' ||
            String(data.AccountStatusID || '').toUpperCase() === 'AD' ||
            ((data.ReferenceID || data.ReferenceId) && !data?.ActivatedDate && !data?.ActivatedOn)
        ));
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

        const fields = ['instructedBy', 'remarks'];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !isEditing;
        });

        const dormantReason = document.getElementById('dormantReason');
        if (dormantReason) dormantReason.disabled = true;

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
        state.currentReferenceId = 0;
        state.currentTrxRowId = 0;
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

        if (!state.currentReferenceId) {
            AppCore.showMsg('No dormant record loaded. View an already dormant account first.', 'warning');
            return;
        }

        AppCore.showLoading(true);
        try {
            const payload = buildDormantPayload({
                Action: state.currentReferenceId ? 'EDIT' : 'MARK_DORMANT',
                IsDormant: true
            });

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
        if (!state.currentReferenceId) {
            AppCore.showMsg('This account is not currently dormant. Load an existing dormant record first.', 'warning');
            return;
        }

        const confirmed = await AppCore.showConfirmation('Reactivate Account', 'Are you sure you want to reactivate this dormant account?');
        if (!confirmed) return;

        AppCore.showLoading(true);
        try {
            const now = new Date().toISOString().split('.')[0];
            const payload = buildDormantPayload({
                ActivatedDate: now,
                ActivatedBy: state.operatorId,
                Action: 'ACTIVATE',
                IsDormant: false,
                NewRecord: state.currentReferenceId ? 0 : 1
            });

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
        AppCore.showMsg('Module 1410 only activates existing dormant records. No mark-dormant procedure is configured in this environment.', 'warning');
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
