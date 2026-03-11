/**
 * Account Activate Dormant Module
 * Standardized for KAIRO MVC project.
 * Uses AppCore.invokeControllerAsync for all API calls.
 * Reads account context from parent AccountMaintenanceState.
 */
window.ActivateDormantModule = (function () {
    'use strict';

    // Module State
    const state = {
        accountId: '',
        branchId: '',
        operatorId: '',
        currentMode: 'VIEW',
        currentData: null,
        currentUpdateCount: 0
    };

    // API Paths
    const API = {
        GET: 'AccountsMaintenance/api/get-account-dormant',
        SAVE: 'AccountsMaintenance/api/edit-account-dormant'
    };

    /**
     * Initialize the module
     */
    function init() {
        console.log('[ActivateDormant] Initializing module...');
        wireSectionToggles();
        const ctx = loadContext();

        if (ctx.accountId) {
            loadData();
        } else {
            notify('No account context found. Please select an account.', 'warning');
            updateButtonStates();
        }
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

    // =========================================================================
    // Context from parent AccountMaintenanceState
    // =========================================================================
    function getContext() {
        const globalState = window.AccountMaintenanceState || {};
        // BranchName is not always set on AccountMaintenanceState, fall back to parent DOM
        const parentBranchName = document.getElementById('BranchName');
        return {
            accountId: globalState.AccountID || sessionStorage.getItem('currentAccountID') || '',
            branchId: globalState.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            operatorId: globalState.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM',
            accountName: globalState.AccountName || sessionStorage.getItem('currentAccountName') || '',
            branchName: globalState.BranchName || (parentBranchName && parentBranchName.value) || sessionStorage.getItem('currentBranchName') || ''
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

    // =========================================================================
    // Notification & Loading Helpers (matching parent pattern)
    // =========================================================================
    function notify(message, type) {
        if (window.showSystemToast) {
            window.showSystemToast(message, { variant: type });
        } else if (AppCore && AppCore.showNotification) {
            AppCore.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    function showLoading(show) {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) overlay.hidden = !show;
    }

    // =========================================================================
    // DOM Helpers
    // =========================================================================
    function $(id) { return document.getElementById(id); }

    // =========================================================================
    // Form Operations
    // =========================================================================
    function clearForm() {
        if ($('instructedBy')) $('instructedBy').value = '';
        if ($('comments')) $('comments').value = '';

        const auditFields = ['dormantDate', 'originalProduct', 'dormantProduct', 'balance',
            'lastCreditDate', 'creditFixedAmount', 'lastDebitDate', 'debitFixedAmount'];
        auditFields.forEach(id => {
            const el = $(id);
            if (el) el.textContent = '-';
        });
    }

    function populateForm(data) {
        if (!data) return;

        if ($('instructedBy')) $('instructedBy').value = data.InstructedBy || '';
        if ($('comments')) $('comments').value = data.Comments || '';

        if ($('dormantDate')) $('dormantDate').textContent = data.DormantDate || '-';
        if ($('originalProduct')) $('originalProduct').textContent = data.OriginalProductID || '-';
        if ($('dormantProduct')) $('dormantProduct').textContent = data.DormantProductID || '-';
        if ($('balance')) $('balance').textContent = data.Balance != null ? String(data.Balance) : '-';
        if ($('lastCreditDate')) $('lastCreditDate').textContent = data.LastCreditDate || '-';
        if ($('creditFixedAmount')) $('creditFixedAmount').textContent = data.CreditFixedAmount != null ? String(data.CreditFixedAmount) : '-';
        if ($('lastDebitDate')) $('lastDebitDate').textContent = data.LastDebitDate || '-';
        if ($('debitFixedAmount')) $('debitFixedAmount').textContent = data.DebitFixedAmount != null ? String(data.DebitFixedAmount) : '-';
    }

    function getFormData() {
        return {
            branchId: ($('branchId')?.value || '').trim(),
            accountId: ($('accountId')?.value || '').trim(),
            instructedBy: ($('instructedBy')?.value || '').trim(),
            comments: ($('comments')?.value || '').trim()
        };
    }

    function setFieldsEditable(enabled) {
        const fields = ['instructedBy', 'comments'];
        fields.forEach(id => {
            const el = $(id);
            if (el) el.disabled = !enabled;
        });
    }

    /**
     * Update parent action panel button states based on current mode
     */
    function updateButtonStates() {
        const isEditing = state.currentMode === 'EDIT';
        const hasData = !!state.currentData;

        const btnView = document.getElementById('submoduleBtnView');
        const btnEdit = document.getElementById('submoduleBtnEdit');
        const btnSave = document.getElementById('submoduleBtnSave');
        const btnCancel = document.getElementById('submoduleBtnCancel');

        if (btnView) btnView.disabled = isEditing;
        if (btnEdit) btnEdit.disabled = isEditing || !hasData;
        if (btnSave) btnSave.disabled = !isEditing;
        if (btnCancel) btnCancel.disabled = !isEditing;
    }

    // =========================================================================
    // Data Loading
    // =========================================================================
    async function loadData() {
        const ctx = loadContext();
        if (!ctx.accountId || !ctx.branchId) return;

        showLoading(true);
        try {
            const result = await AppCore.invokeControllerAsync(API.GET, {
                OurBranchID: ctx.branchId,
                AccountID: ctx.accountId,
                OperatorID: ctx.operatorId
            });

            if (result && result.ResponseCode === '00') {
                const details = result.Details || {};
                // API returns Details.AccountDormantDetails for this endpoint
                const dormantData = details.AccountDormantDetails || details.Details01?.[0] || null;

                const isEmpty = !dormantData || (typeof dormantData === 'object' && Object.keys(dormantData).length === 0);

                if (!isEmpty) {
                    populateForm(dormantData);
                    state.currentData = dormantData;
                    state.currentUpdateCount = dormantData.UpdateCount || 0;
                    setFieldsEditable(false);
                    notify('Dormant account details loaded.', 'success');
                } else {
                    clearForm();
                    state.currentData = null;
                    setFieldsEditable(false);
                    notify('No dormant records found for this account.', 'info');
                }
            } else {
                clearForm();
                state.currentData = null;
                setFieldsEditable(false);
                notify(result?.ResponseMessage || 'Failed to retrieve dormant account details.', 'warning');
            }
        } catch (error) {
            console.error('[ActivateDormant] Error loading data:', error);
            notify('Failed to load dormant account details', 'error');
        } finally {
            showLoading(false);
            updateButtonStates();
        }
    }

    // =========================================================================
    // Action Handlers (called by parent action panel)
    // =========================================================================
    function navigate() {
        state.currentMode = 'VIEW';
        setFieldsEditable(false);
        updateButtonStates();
        loadData();
    }

    function confirmEdit() {
        if (!state.currentData) {
            notify('Please view an account first', 'warning');
            return;
        }
        state.currentMode = 'EDIT';
        setFieldsEditable(true);
        updateButtonStates();
        notify('Edit mode enabled', 'info');
    }

    async function saveData() {
        if (state.currentMode !== 'EDIT') return;

        const formData = getFormData();
        const referenceId = parseInt(state.currentData?.ReferenceID || state.currentData?.ReferenceId || 0) || 0;

        if (!formData.branchId || !formData.accountId || !referenceId) {
            notify('OurBranchID, AccountID, and ReferenceID are required', 'warning');
            return;
        }

        showLoading(true);
        try {
            const result = await AppCore.invokeControllerAsync(API.SAVE, {
                OurBranchID: formData.branchId,
                AccountID: formData.accountId,
                ReferenceID: referenceId,
                InstructedBy: formData.instructedBy,
                Comments: formData.comments,
                OperatorID: state.operatorId,
                UpdateCount: state.currentUpdateCount
            });

            if (result && result.ResponseCode === '00') {
                notify(result.ResponseMessage || 'Dormant account activation saved successfully', 'success');
                state.currentMode = 'VIEW';
                setFieldsEditable(false);

                // Reload data
                await loadData();
            } else {
                notify(result?.ResponseMessage || 'Save failed', 'error');
            }
        } catch (error) {
            console.error('[ActivateDormant] Save failed:', error);
            notify('Failed to save dormant account activation', 'error');
        } finally {
            showLoading(false);
        }
    }

    function confirmCancel() {
        if (state.currentMode !== 'EDIT') return;

        if (state.currentData) {
            populateForm(state.currentData);
        } else {
            clearForm();
        }

        state.currentMode = 'VIEW';
        setFieldsEditable(false);
        updateButtonStates();
        notify('Changes cancelled', 'info');
    }

    // =========================================================================
    // Public API
    // =========================================================================
    return {
        init,
        navigate,
        confirmEdit,
        saveData,
        confirmCancel
    };
})();
