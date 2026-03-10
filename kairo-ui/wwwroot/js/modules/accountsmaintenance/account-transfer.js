/**
 * Account Transfer Module
 * Refactored to use AppCore.invokeControllerAsync and align with IApiService pattern.
 */
window.AccountTransferModule = (function () {
    'use strict';

    const state = {
        transferData: null
    };

    const API = {
        GET: 'AccountsMaintenance/api/get-account-transfer-details',
        UPDATE: 'AccountsMaintenance/api/add-account-transfer-details'
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
    const numVal = (id) => parseFloat(el(id)?.value || 0) || 0;

    function showMsg(msg, type) {
        const t = window.showSystemToast || window.parent?.showSystemToast;
        if (t) t(msg, { variant: type === 'error' ? 'danger' : type });
        console.log(`[AccountTransfer] ${type}: ${msg}`);
    }

    function formatAmount(v) {
        const n = parseFloat(v);
        return isNaN(n) ? '0.00' : n.toFixed(2);
    }

    // ── Mode Management ────────────────────────────────────────
    function setMode(editing) {
        const fields = ['branchId', 'productId', 'retainAccountId', 'reason', 'remarks'];
        fields.forEach(id => {
            const e = el(id);
            if (e) {
                if (e.type === 'checkbox') e.disabled = !editing;
                else e.readOnly = !editing;
            }
        });

        const lookups = document.querySelectorAll('.btn-lookup');
        lookups.forEach(btn => btn.disabled = !editing);

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

    // ── Calculations ───────────────────────────────────────────
    function calculateNetPayable() {
        const balance = numVal('balance');
        const creditInt = numVal('creditInterestPayable');
        const debitInt = numVal('debitInterestReceivable');
        const penalInt = numVal('penalInterestReceivable');
        const charges = numVal('transferCharges');

        const net = balance + creditInt - debitInt - penalInt - charges;
        setVal('netPayable', net.toFixed(2));
    }

    // ── Load Data ──────────────────────────────────────────────
    async function loadData() {
        const ctx = getContext();
        if (!ctx.AccountID || !ctx.OurBranchID) {
            showMsg('Please select an account first', 'warning');
            return;
        }

        try {
            const result = await AppCore.invokeControllerAsync(API.GET, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                OperatorID: ctx.OperatorID
            });

            if (result && result.success) {
                const data = result.Details?.[0] || result.data?.Details?.[0] || result.data || result.Details;
                if (data) {
                    state.transferData = data;
                    populateForm(data);
                    setMode(false);
                } else {
                    showMsg('No transfer details found', 'info');
                    clearForm();
                }
            } else {
                showMsg(result?.message || 'Failed to load transfer details', 'error');
            }
        } catch (err) {
            showMsg('Error loading transfer details: ' + err.message, 'error');
        }
    }

    function populateForm(data) {
        setVal('branchId', data.ToBranchID || data.BranchID || '');
        setVal('branchName', data.ToBranchName || data.BranchName || '');
        setVal('productId', data.ToProductID || data.ProductID || '');
        setVal('productName', data.ToProductName || data.ProductName || '');

        const retain = el('retainAccountId');
        if (retain) retain.checked = data.RetainAccountID === 'Y' || data.RetainAccountID === true;

        setVal('reason', data.ReasonID || data.Reason || '');
        setVal('remarks', data.Remarks || '');

        setVal('balance', formatAmount(data.Balance));
        setVal('creditInterestPayable', formatAmount(data.InterestPayable || data.CreditInterestPayable));
        setVal('debitInterestReceivable', formatAmount(data.InterestReceivable || data.DebitInterestReceivable));
        setVal('penalInterestReceivable', formatAmount(data.PenaltyReceivable || data.PenalInterestReceivable));
        setVal('transferCharges', formatAmount(data.TransferCharge || data.TransferCharges));

        calculateNetPayable();
    }

    function clearForm() {
        ['branchId', 'branchName', 'productId', 'productName', 'reason', 'remarks',
            'balance', 'creditInterestPayable', 'debitInterestReceivable', 'penalInterestReceivable', 'transferCharges', 'netPayable']
            .forEach(id => setVal(id, ''));

        const retain = el('retainAccountId');
        if (retain) retain.checked = false;
    }

    // ── Save ───────────────────────────────────────────────────
    async function handleSave() {
        if (!val('branchId')) { showMsg('Transfer Branch is required', 'warning'); return false; }
        if (!val('productId')) { showMsg('New Product is required', 'warning'); return false; }
        if (!val('reason')) { showMsg('Reason is required', 'warning'); return false; }

        const ok = await AppCore.showConfirmation('Transfer Account', 'Are you sure you want to transfer this account?');
        if (!ok) return false;

        const ctx = getContext();
        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            ProductID: val('productId'),
            NewAccountID: ctx.AccountID, // Same account for transfer
            CurrentBranchID: ctx.OurBranchID,
            NewBranchID: val('branchId'),
            TransferReasonID: val('reason'),
            TransferReason: val('remarks'),
            RetainAccountID: el('retainAccountId')?.checked ? 'Y' : 'N',
            TransferBy: ctx.OperatorID,
            UpdateCount: 0,
            SysTrx: '',
            UserTrx: ''
        };

        try {
            const result = await AppCore.invokeControllerAsync(API.UPDATE, payload);
            if (result && result.success) {
                showMsg(result.message || 'Account transfer saved successfully', 'success');
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

    // ── Lookups ────────────────────────────────────────────────
    function wireLookups() {
        document.querySelector('[data-lookup="branchId"]')?.addEventListener('click', async () => {
            if (window.BranchSearchService) {
                await window.BranchSearchService.openSearchModal((id, name) => {
                    setVal('branchId', id);
                    setVal('branchName', name);
                });
            }
        });

        document.querySelector('[data-lookup="productId"]')?.addEventListener('click', () => {
            const ctx = getContext();
            if (window.SearchModal) {
                const modal = new window.SearchModal({
                    prefix: 'actransfer',
                    moduleID: '1000',
                    getOperatorId: () => ctx.OperatorID,
                    getOurBranchId: () => ctx.OurBranchID
                });
                modal.open({
                    title: 'Find Product',
                    tableID: 'ProductID',
                    whereStmt: '1=1',
                    searchFields: [{ name: 'productId', label: 'Product ID', column: 'ProductID' }],
                    displayFields: [{ key: 'ProductID', label: 'ID' }, { key: 'Description', label: 'Name' }],
                    onSelect: (r) => {
                        setVal('productId', r.ProductID);
                        setVal('productName', r.Description);
                    }
                });
            }
        });
    }

    // ── Init ───────────────────────────────────────────────────
    function init() {
        console.log('[AccountTransfer] Initializing submodule');
        setMode(false);
        wireLookups();

        // Populate basic info from parent if available
        const ctx = getContext();
        if (ctx.AccountID && ctx.OurBranchID) {
            loadData();
        }

        // Section toggles
        document.querySelectorAll('[data-section-toggle]').forEach(hdr => {
            hdr.addEventListener('click', function () {
                const sec = this.closest('.form-section');
                const content = sec?.querySelector('.section-content, [data-section-content]');
                const btn = sec?.querySelector('.section-toggle-btn');
                const icon = btn?.querySelector('i');
                const exp = btn?.getAttribute('aria-expanded') === 'true';
                if (content) content.hidden = exp;
                btn?.setAttribute('aria-expanded', String(!exp));
                icon?.classList.toggle('bi-chevron-up');
                icon?.classList.toggle('bi-chevron-down');
            });
        });
    }

    return {
        init: init,
        save: handleSave,
        edit: () => setMode(true),
        cancel: async () => {
            const ok = await AppCore.showConfirmation('Cancel', 'Are you sure you want to cancel your changes?');
            if (ok) { loadData(); setMode(false); }
        },
        view: loadData,
        refresh: loadData
    };
})();

console.log('[AccountTransfer] Module loaded');
