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

    function normalizeTransferDetails(result) {
        // Normalise payloads coming from AccountManagementApi.
        // SPs commonly return:
        //  - Details.Details01 = BTS / account summary
        //  - Details.Details02 = transfer specific fields
        //  - or a flat Details array / object
        const root = result?.Details || result?.details || result?.data || null;
        if (!root) return null;

        // Case 1: Details01 / Details02 pattern (two result sets)
        const d1 = root.Details01 || root.details01;
        const d2 = root.Details02 || root.details02;
        if (d1 || d2) {
            const p1 = Array.isArray(d1) ? d1[0] : d1;
            const p2 = Array.isArray(d2) ? d2[0] : d2;
            return { ...(p1 || {}), ...(p2 || {}) };
        }

        // Case 2: Details is an array of rows – merge into one object
        if (Array.isArray(root)) {
            const merged = root.reduce((acc, row) => {
                if (row && typeof row === 'object') {
                    return { ...acc, ...row };
                }
                return acc;
            }, {});
            return Object.keys(merged).length > 0 ? merged : null;
        }

        // Case 3: Flatten nested objects (e.g. AccountSummary) into a single object
        if (root && typeof root === 'object') {
            const flat = {};
            for (const [k, v] of Object.entries(root)) {
                if (Array.isArray(v) && v.length && typeof v[0] === 'object') {
                    Object.assign(flat, v[0]);
                } else if (v && typeof v === 'object' && !Array.isArray(v)) {
                    Object.assign(flat, v);
                }
            }

            // Scalar values override nested merges
            for (const [k, v] of Object.entries(root)) {
                if (v === null || typeof v !== 'object') flat[k] = v;
            }

            return Object.keys(flat).length > 0 ? flat : root;
        }

        return null;
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

            const isOk = result && (result.success || result.Success || result.ResponseCode === '00');
            console.log('[AccountTransfer] API result isOk:', isOk, 'raw Details:', result?.Details);
            if (isOk) {
                const data = normalizeTransferDetails(result);
                console.log('[AccountTransfer] Normalized data:', data);
                if (data) {
                    state.transferData = data;
                    populateForm(data);
                    setMode(false);
                } else {
                    showMsg('No transfer details found', 'info');
                    clearForm();
                }
            } else {
                showMsg(result?.message || result?.ResponseMessage || 'Failed to load transfer details', 'error');
            }
        } catch (err) {
            showMsg('Error loading transfer details: ' + err.message, 'error');
        }
    }

    function populateForm(data) {
        console.log('[AccountTransfer] populateForm keys:', Object.keys(data));

        const ps = window.AccountMaintenanceState || {};

        // Identification / destination
        setVal('branchId',
            data.ToBranchID ||
            data.NewBranchID ||
            data.BranchID ||
            data.OurBranchID ||
            data.branchId ||
            ps.OurBranchID ||
            ''
        );

        setVal('branchName',
            data.ToBranchName ||
            data.NewBranchName ||
            data.BranchName ||
            data.BranchDescription ||
            ps.BranchName ||
            data.Description ||
            ''
        );

        setVal('productId',
            data.ToProductID ||
            data.NewProductID ||
            data.ProductID ||
            data.productId ||
            ps.ProductID ||
            ''
        );

        setVal('productName',
            data.ToProductName ||
            data.NewProductName ||
            data.ProductName ||
            data.ProductTypeName ||
            ps.ProductName ||
            data.Description ||
            ''
        );

        const retain = el('retainAccountId');
        if (retain) retain.checked = data.RetainAccountID === 'Y' || data.RetainAccountID === true;

        // Reason / narrative
        setVal('reason', data.TransferReasonID || data.ReasonID || data.Reason || '');
        setVal('remarks', data.Remarks || data.TransferReason || data.Narration || data.Description || '');

        // Financial fields — prefer AccountSummary values (already merged)
        setVal('balance', formatAmount(data.Balance ?? data.ClearBalance));
        setVal('creditInterestPayable', formatAmount(data.InterestPayable ?? data.CreditInterestPayable ?? 0));
        setVal('debitInterestReceivable', formatAmount(data.InterestReceivable ?? data.DebitInterestReceivable ?? 0));
        setVal('penalInterestReceivable', formatAmount(data.PenaltyReceivable ?? data.PenalInterestReceivable ?? 0));
        setVal('transferCharges', formatAmount(data.TransferCharge ?? data.TransferCharges ?? 0));

        calculateNetPayable();

        console.log('[AccountTransfer] Form populated — balance:', el('balance')?.value,
            'branch:', el('branchId')?.value, 'product:', el('productId')?.value,
            'reason:', el('reason')?.value, 'remarks:', el('remarks')?.value);
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
            const isOk = result && (result.success || result.Success || result.ResponseCode === '00');
            if (isOk) {
                showMsg(result.message || result.ResponseMessage || 'Account transfer saved successfully', 'success');
                loadData();
                return true;
            } else {
                showMsg(result?.message || result?.ResponseMessage || 'Save failed', 'error');
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

        // Populate basic info from parent if available (mirrors legacy behaviour)
        const ctx = getContext();
        const ps = window.AccountMaintenanceState || {};

        // Branch / product descriptions like legacy desktop
        if (ctx.OurBranchID) {
            setVal('branchId', ctx.OurBranchID);
        }
        if (ps.BranchName) {
            setVal('branchName', ps.BranchName);
        }
        if (ps.ProductID) {
            setVal('productId', ps.ProductID);
        }
        if (ps.ProductName) {
            setVal('productName', ps.ProductName);
        }

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
        add: () => { clearForm(); setMode(true); },
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
