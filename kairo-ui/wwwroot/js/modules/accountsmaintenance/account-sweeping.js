/**
 * Account Sweeping Module
 * Refactored to use AppCore.invokeControllerAsync and align with IApiService pattern.
 */
window.AccountSweepingModule = (function () {
    'use strict';

    const state = {
        sweepingData: null,
        isDirty: false
    };

    const API = {
        GET: 'get-account-sweeping',
        ADD: 'add-edit-account-sweeping',
        UPDATE: 'add-edit-account-sweeping',
        DELETE: 'delete-account-sweeping'
    };

    /**
     * Get context from global state or storage
     */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID: ps?.AccountID || sessionStorage.getItem('currentAccountID') || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'web_portal'
        };
    }

    // ── UI Helpers ─────────────────────────────────────────────
    const el = (id) => document.getElementById(id);
    const val = (id) => el(id)?.value?.trim() || '';
    const setVal = (id, v) => { const e = el(id); if (e) e.value = (v == null) ? '' : v; };
    const setTxt = (id, v) => { const e = el(id); if (e) e.textContent = (v == null) ? '-' : v; };

    function showMsg(msg, type) {
        const t = window.showSystemToast || window.parent?.showSystemToast;
        if (t) t(msg, { variant: type === 'error' ? 'danger' : type });
        console.log(`[AccountSweeping] ${type}: ${msg}`);
    }

    // ── Mode Management ────────────────────────────────────────
    function setMode(editing) {
        const fields = ['accountTransferId', 'minThreshold', 'maxThreshold', 'sweepingDenomination', 'startDate', 'endDate'];
        fields.forEach(id => {
            const e = el(id);
            if (e) e.readOnly = !editing;
        });

        const lookups = document.querySelectorAll('.btn-lookup');
        lookups.forEach(btn => btn.disabled = !editing);

        state.isDirty = false;

        // Update Global Buttons
        const btnView = document.getElementById('submoduleBtnView');
        const btnAdd = document.getElementById('submoduleBtnAdd');
        const btnEdit = document.getElementById('submoduleBtnEdit');
        const btnSave = document.getElementById('submoduleBtnSave');
        const btnCancel = document.getElementById('submoduleBtnCancel');
        const btnDelete = document.getElementById('submoduleBtnDelete');

        if (btnView) btnView.disabled = editing;
        if (btnAdd) btnAdd.disabled = editing;
        if (btnEdit) btnEdit.disabled = editing;
        if (btnSave) btnSave.disabled = !editing;
        if (btnCancel) btnCancel.disabled = !editing;
        if (btnDelete) btnDelete.disabled = editing;
    }

    // ── Data Operations ────────────────────────────────────────
    async function loadData() {
        const ctx = getContext();
        if (!ctx.AccountID || !ctx.OurBranchID) {
            showMsg('Please select an account first', 'warning');
            return;
        }

        const loader = el('loadingOverlay');
        if (loader) loader.hidden = false;

        try {
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.GET}`, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                OperatorID: ctx.OperatorID
            });

            if (result && result.success) {
                const data = result.Details?.[0] || result.data?.Details?.[0] || result.data || result.Details;
                if (data) {
                    state.sweepingData = data;
                    populateForm(data);
                    setMode(false);
                } else {
                    showMsg('No sweeping configuration found', 'info');
                    clearForm();
                }
            } else {
                showMsg(result?.message || 'Failed to load sweeping details', 'error');
            }
        } catch (err) {
            showMsg('Error loading sweeping details: ' + err.message, 'error');
        } finally {
            if (loader) loader.hidden = true;
        }
    }

    function populateForm(data) {
        // Naming alignment
        setVal('accountTransferId', data.AccountTransferID || data.ToAccountID || data.TransferAccount || '');
        setVal('accountTransferName', data.AccountTransferName || data.ToAccountName || '');
        setVal('minThreshold', data.MinThreshold || data.AccountThreshold || '0');
        setVal('maxThreshold', data.MaxThreshold || data.AccountLimit || '0');
        setVal('sweepingDenomination', data.SweepingDenomination || data.AmtDenomination || '0');
        setVal('startDate', formatDateForInput(data.StartDate || data.EffectiveDate));
        setVal('endDate', formatDateForInput(data.EndDate || data.ExpiryDate));
        setVal('lastSweepingDate', data.LastSweepingDate || data.LastSwpDate || '-');

        // Audit
        setTxt('MakerID', data.CreatedBy || data.MakerID);
        setTxt('MakerDT', data.CreatedOn || data.MakerDT);
        setTxt('CheckerID', data.SupervisedBy || data.CheckerID);
        setTxt('CheckerDT', data.SupervisedOn || data.CheckerDT);
        setTxt('ModifierID', data.ModifiedBy || data.ModifierID);
        setTxt('ModifierDT', data.ModifiedOn || data.ModifierDT);
    }

    function formatDateForInput(d) {
        if (!d) return '';
        try {
            const date = new Date(d);
            if (isNaN(date.getTime())) return '';
            return date.toISOString().split('T')[0];
        } catch { return ''; }
    }

    function clearForm() {
        ['accountTransferId', 'accountTransferName', 'minThreshold', 'maxThreshold',
            'sweepingDenomination', 'startDate', 'endDate', 'lastSweepingDate'].forEach(id => setVal(id, ''));
        ['MakerID', 'MakerDT', 'CheckerID', 'CheckerDT', 'ModifierID', 'ModifierDT'].forEach(id => setTxt(id, '-'));
    }

    async function handleSave() {
        if (!val('accountTransferId')) { showMsg('Transfer Account is required', 'warning'); return false; }

        const ok = await AppCore.showConfirmation('Save Sweeping', 'Are you sure you want to save this sweeping configuration?');
        if (!ok) return false;

        const ctx = getContext();
        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            TransferAccount: val('accountTransferId'),
            AccountThreshold: val('minThreshold') || '0',
            AccountLimit: val('maxThreshold') || '0',
            AmtDenomination: val('sweepingDenomination') || '0',
            StartDate: val('startDate'),
            EndDate: val('endDate'),
            OperatorID: ctx.OperatorID,
            NewRecord: state.sweepingData ? 0 : 1,
            UpdateCount: state.sweepingData?.UpdateCount || 0
        };

        try {
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.ADD}`, payload);
            if (result && result.success) {
                showMsg(result.message || 'Sweeping configuration saved successfully', 'success');
                loadData();
                return true;
            } else {
                showMsg(result?.message || 'Save failed', 'error');
                return false;
            }
        } catch (err) {
            showMsg('Save error: ' + err.message, 'error');
            return false;
        }
    }

    async function handleDelete() {
        if (!state.sweepingData) { showMsg('No data to delete', 'warning'); return; }

        const ok = await AppCore.showConfirmation('Delete Sweeping', 'Are you sure you want to delete this sweeping configuration?');
        if (!ok) return;

        const ctx = getContext();
        try {
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.DELETE}`, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                OperatorID: ctx.OperatorID
            });

            if (result && result.success) {
                showMsg(result.message || 'Deleted successfully', 'success');
                clearForm();
                state.sweepingData = null;
                setMode(false);
            } else {
                showMsg(result?.message || 'Delete failed', 'error');
            }
        } catch (err) {
            showMsg('Delete error: ' + err.message, 'error');
        }
    }

    // ── Lookups ────────────────────────────────────────────────
    function wireLookups() {
        document.querySelector('[data-lookup="AccountTransfer"]')?.addEventListener('click', () => {
            if (window.SearchModal) {
                const modal = new window.SearchModal(window.AppCore);
                modal.open({
                    tableID: 'AccountID',
                    onSelect: (r) => {
                        setVal('accountTransferId', r.AccountID);
                        setVal('accountTransferName', r.AccountName || r.Description);
                    }
                });
            }
        });
    }

    // ── Init ───────────────────────────────────────────────────
    function init() {
        console.log('[AccountSweeping] Initializing');
        setMode(false);
        wireLookups();

        const ctx = getContext();
        if (ctx.AccountID && ctx.OurBranchID) {
            loadData();
        }

        // Toggles
        document.querySelectorAll('[data-section-toggle]').forEach(hdr => {
            hdr.addEventListener('click', function () {
                const sec = this.closest('.form-section');
                const content = sec?.querySelector('.section-content, [data-section-content]');
                const icon = this.querySelector('.bi-chevron-up, .bi-chevron-down');
                if (content) {
                    content.hidden = !content.hidden;
                    icon?.classList.toggle('bi-chevron-up');
                    icon?.classList.toggle('bi-chevron-down');
                }
            });
        });
    }

    return {
        init: init,
        save: handleSave,
        edit: () => setMode(true),
        add: () => { clearForm(); state.sweepingData = null; setMode(true); },
        delete: handleDelete,
        cancel: async () => {
            const ok = await AppCore.showConfirmation('Cancel', 'Are you sure you want to cancel your changes?');
            if (ok) { loadData(); setMode(false); }
        },
        view: () => { loadData(); setMode(false); }
    };
})();

console.log('[AccountSweeping] Module loaded');
