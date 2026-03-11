/**
 * Account Activate Dormant Module
 * Uses AccountsMaintenance controller endpoints and reads account context from AccountMaintenanceState.
 */
window.ActivateDormantModule = (function () {
    'use strict';

    const state = {
        accountId: '',
        branchId: '',
        operatorId: '',
        currentMode: 'VIEW',
        currentData: null,
        currentUpdateCount: 0,
        currentReferenceId: 0
    };

    const API = {
        GET: 'AccountsMaintenance/api/get-account-dormant',
        SAVE: 'AccountsMaintenance/api/edit-account-dormant'
    };

    function init() {
        console.log('[ActivateDormant] Initializing module...');
        wireSectionToggles();
        wireLookupSelection();

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

    function wireLookupSelection() {
        if (window.__activateDormantLookupHandler) {
            document.removeEventListener('kairo:lookup-selected', window.__activateDormantLookupHandler);
        }

        window.__activateDormantLookupHandler = function (event) {
            const targetInputId = String(event?.detail?.targetInputId || '').toLowerCase();
            if (targetInputId !== 'accountid' && targetInputId !== 'branchid') {
                return;
            }

            const ctx = loadContext();
            if (ctx.accountId) {
                loadData();
            } else {
                clearForm();
                state.currentData = null;
                state.currentMode = 'VIEW';
                updateButtonStates();
            }
        };

        document.addEventListener('kairo:lookup-selected', window.__activateDormantLookupHandler);
    }

    function getContext() {
        const globalState = window.AccountMaintenanceState || {};
        const parentBranchName = document.getElementById('BranchName');

        return {
            accountId: globalState.AccountID || sessionStorage.getItem('currentAccountID') || '',
            branchId: globalState.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            operatorId: globalState.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM',
            accountName: globalState.AccountName || sessionStorage.getItem('currentAccountName') || '',
            branchName: globalState.BranchName || (parentBranchName && parentBranchName.value) || sessionStorage.getItem('currentBranchName') || ''
        };
    }

    function loadContext() {
        const ctx = getContext();
        state.accountId = ctx.accountId;
        state.branchId = ctx.branchId;
        state.operatorId = ctx.operatorId;

        setValue('branchId', ctx.branchId);
        setValue('branchName', ctx.branchName);
        setValue('accountId', ctx.accountId);
        setValue('accountName', ctx.accountName);

        return ctx;
    }

    function notify(message, type) {
        if (window.showSystemToast) {
            window.showSystemToast(message, { variant: type });
        } else if (window.AppCore?.showNotification) {
            window.AppCore.showNotification(message, type);
        } else {
            console.log(`[${type}] ${message}`);
        }
    }

    function showLoading(show) {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) overlay.hidden = !show;
    }

    function $(id) {
        return document.getElementById(id);
    }

    function setValue(id, value) {
        const el = $(id);
        if (!el) return;

        if (el.tagName === 'SPAN' || el.classList.contains('audit-value')) {
            el.textContent = value || '-';
            return;
        }

        el.value = value || '';
    }

    function clearForm() {
        setValue('instructedBy', '');
        setValue('comments', '');

        ['dormantDate', 'originalProduct', 'dormantProduct', 'balance', 'lastCreditDate', 'creditFixedAmount', 'lastDebitDate', 'debitFixedAmount']
            .forEach(id => setValue(id, '-'));

        state.currentUpdateCount = 0;
        state.currentReferenceId = 0;
    }

    function populateForm(data) {
        if (!data) return;

        setValue('instructedBy', data.InstructedBy || '');
        setValue('comments', data.Comments || data.Remarks || '');
        setValue('dormantDate', data.DormantDate || data.Dormantdate || '-');
        setValue('originalProduct', data.OriginalProductID || data.OriginalProduct || '-');
        setValue('dormantProduct', data.DormantProductID || data.DormantProduct || '-');
        setValue('balance', data.Balance != null ? String(data.Balance) : '-');
        setValue('lastCreditDate', data.LastCreditDate || '-');
        setValue('creditFixedAmount', data.CreditFixedAmount != null ? String(data.CreditFixedAmount) : '-');
        setValue('lastDebitDate', data.LastDebitDate || '-');
        setValue('debitFixedAmount', data.DebitFixedAmount != null ? String(data.DebitFixedAmount) : '-');

        state.currentReferenceId = parseInt(data.ReferenceID || data.ReferenceId || 0, 10) || 0;
        state.currentUpdateCount = parseInt(data.UpdateCount || 0, 10) || 0;
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
        ['instructedBy', 'comments'].forEach(id => {
            const el = $(id);
            if (el) el.disabled = !enabled;
        });
    }

    function updateButtonStates() {
        const isEditing = state.currentMode === 'EDIT';
        const hasData = !!state.currentData;

        const btnView = $('submoduleBtnView');
        const btnEdit = $('submoduleBtnEdit');
        const btnSave = $('submoduleBtnSave');
        const btnCancel = $('submoduleBtnCancel');
        const btnActivate = $('submoduleBtnActivate');

        if (btnView) btnView.disabled = isEditing;
        if (btnEdit) btnEdit.disabled = isEditing || !hasData;
        if (btnSave) btnSave.disabled = !isEditing;
        if (btnCancel) btnCancel.disabled = !isEditing;
        if (btnActivate) btnActivate.disabled = isEditing || !hasData;
    }

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
                const dormantData = details.AccountDormantDetails || details.Details01?.[0] || null;
                const isEmpty = !dormantData || (typeof dormantData === 'object' && Object.keys(dormantData).length === 0);

                if (!isEmpty) {
                    populateForm(dormantData);
                    state.currentData = dormantData;
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
        if (!formData.branchId || !formData.accountId || !state.currentReferenceId) {
            notify('OurBranchID, AccountID, and ReferenceID are required', 'warning');
            return;
        }

        showLoading(true);
        try {
            const result = await AppCore.invokeControllerAsync(API.SAVE, {
                OurBranchID: formData.branchId,
                AccountID: formData.accountId,
                ReferenceID: state.currentReferenceId,
                InstructedBy: formData.instructedBy,
                Comments: formData.comments,
                OperatorID: state.operatorId,
                UpdateCount: state.currentUpdateCount
            });

            if (result && result.ResponseCode === '00') {
                notify(result.ResponseMessage || 'Dormant account activation saved successfully', 'success');
                state.currentMode = 'VIEW';
                setFieldsEditable(false);
                await loadData();
            } else {
                notify(result?.ResponseMessage || 'Save failed', 'error');
            }
        } catch (error) {
            console.error('[ActivateDormant] Save failed:', error);
            notify('Failed to save dormant account activation', 'error');
        } finally {
            showLoading(false);
            updateButtonStates();
        }
    }

    async function activateAccount() {
        if (!state.currentData || !state.currentReferenceId) {
            notify('No dormant record loaded.', 'warning');
            return;
        }

        showLoading(true);
        try {
            const formData = getFormData();
            const result = await AppCore.invokeControllerAsync(API.SAVE, {
                OurBranchID: formData.branchId,
                AccountID: formData.accountId,
                ReferenceID: state.currentReferenceId,
                InstructedBy: formData.instructedBy,
                Comments: formData.comments,
                OperatorID: state.operatorId,
                UpdateCount: state.currentUpdateCount,
                Action: 'ACTIVATE',
                IsDormant: false,
                ActivatedBy: state.operatorId,
                ActivatedDate: new Date().toISOString()
            });

            if (result && result.ResponseCode === '00') {
                notify(result.ResponseMessage || 'Account activated successfully', 'success');
                state.currentMode = 'VIEW';
                setFieldsEditable(false);
                await loadData();
            } else {
                notify(result?.ResponseMessage || 'Activation failed', 'error');
            }
        } catch (error) {
            console.error('[ActivateDormant] Activation failed:', error);
            notify('Failed to activate dormant account', 'error');
        } finally {
            showLoading(false);
            updateButtonStates();
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

    return {
        init,
        navigate,
        confirmEdit,
        saveData,
        activateAccount,
        confirmCancel
    };
})();
