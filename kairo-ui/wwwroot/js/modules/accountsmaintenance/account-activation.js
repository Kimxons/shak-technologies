    /**
 * Account Activation Module
 * Refactored to use AppCore.invokeControllerAsync and align with IApiService pattern.
 */
window.AccountActivationModule = (function () {
    'use strict';

    const state = {
        currentUpdateCount: 0,
        currentActivationData: null
    };

    const API = {
        GET: 'AccountsMaintenance/api/get-account-activation',
        UPDATE: 'AccountsMaintenance/api/update-account-activation'
    };

    /**
     * Get context from global state or storage
     */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID: ps?.AccountID || sessionStorage.getItem('currentAccountID') || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM'
        };
    }

    // ── UI Helpers ─────────────────────────────────────────────
    const el = (id) => document.getElementById(id);
    const val = (id) => el(id)?.value?.trim() || '';
    const setVal = (id, v) => { const e = el(id); if (e) e.value = (v == null) ? '' : v; };
    const setText = (id, v) => {
        const e = el(id);
        if (!e) return;
        if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT')
            e.value = (v == null) ? '' : v;
        else
            e.textContent = (v == null) ? '-' : v;
    };

    /** Case-insensitive property getter — tries exact match first, then case-insensitive */
    function getField(obj, ...names) {
        if (!obj) return '';
        for (const n of names) {
            if (obj[n] !== undefined && obj[n] !== null) return obj[n];
        }
        const keys = Object.keys(obj);
        for (const n of names) {
            const lc = n.toLowerCase();
            const k = keys.find(k => k.toLowerCase() === lc);
            if (k !== undefined && obj[k] !== undefined && obj[k] !== null) return obj[k];
        }
        return '';
    }

    function showMsg(msg, type) {
        const t = window.showSystemToast || window.parent?.showSystemToast;
        if (t) t(msg, { variant: type === 'error' ? 'danger' : type });
        console.log(`[AccountActivation] ${type}: ${msg}`);
    }

    function formatDate(ds) {
        if (!ds) return '-';
        if (window.GlobalUtils?.formatDate) {
            return window.GlobalUtils.formatDate(ds);
        }
        try {
            const d = new Date(ds);
            return isNaN(d.getTime()) ? ds : d.toLocaleDateString();
        } catch { return ds; }
    }

    function formatMoney(v) {
        const n = parseFloat(v);
        if (isNaN(n)) return (v == null || v === '') ? '-' : String(v);
        return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDateForApi(date) {
        if (!date) return null;
        const d = date instanceof Date ? date : new Date(date);
        if (isNaN(d.getTime())) return null;
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        const hh = String(d.getHours()).padStart(2, '0');
        const mi = String(d.getMinutes()).padStart(2, '0');
        const ss = String(d.getSeconds()).padStart(2, '0');
        return `${mm}/${dd}/${d.getFullYear()} ${hh}:${mi}:${ss}`;
    }

    // ── Mode Management ────────────────────────────────────────
    function setMode(editing) {
        const ib = el('instructedBy');
        const cm = el('comments');
        if (ib) ib.readOnly = !editing;
        if (cm) cm.readOnly = !editing;

        if (editing && ib) {
            setTimeout(() => { ib.focus(); ib.select(); }, 100);
        }

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

            const isOk = result && (result.success || result.Success
                || result.ResponseCode === '00' || result.responseCode === '00');
            console.log('[AccountActivation] API isOk:', isOk, 'raw result:', JSON.stringify(result).substring(0, 500));
            if (isOk) {
                const d = result.Details || result.details || result.data;
                console.log('[AccountActivation] Details type:', typeof d, Array.isArray(d) ? '(array)' : '',
                    d ? Object.keys(d) : 'null');

                // SP returns two result sets: Details01 = BTS, Details02 = activation fields
                // Merge both into a single flat object so populateForm can read all fields
                let details = null;

                if (d?.Details01 || d?.Details02 || d?.details01 || d?.details02) {
                    const bts = Array.isArray(d.Details01 || d.details01) ? (d.Details01 || d.details01)[0] : (d.Details01 || d.details01);
                    const act = Array.isArray(d.Details02 || d.details02) ? (d.Details02 || d.details02)[0] : (d.Details02 || d.details02);
                    details = { ...(bts || {}), ...(act || {}) };
                } else if (Array.isArray(d) && d.length > 0) {
                    details = d.reduce((acc, row) => ({ ...acc, ...(typeof row === 'object' ? row : {}) }), {});
                } else if (d && typeof d === 'object') {
                    // Flatten any nested sub-objects (e.g. AccountSummary pattern)
                    const flat = {};
                    for (const [k, v] of Object.entries(d)) {
                        if (Array.isArray(v) && v.length > 0 && typeof v[0] === 'object') {
                            Object.assign(flat, v[0]);
                        } else if (v && typeof v === 'object' && !Array.isArray(v)) {
                            Object.assign(flat, v);
                        }
                    }
                    // Scalar values (including those from top-level d) override nested merges
                    for (const [k, v] of Object.entries(d)) {
                        if (v === null || typeof v !== 'object') flat[k] = v;
                    }
                    details = Object.keys(flat).length > 0 ? flat : d;
                }

                console.log('[AccountActivation] Normalized details:', details);

                if (details && Object.keys(details).length > 0) {
                    state.currentActivationData = details;
                    populateForm(details);
                    setMode(false);
                } else {
                    showMsg('No activation data found for this account', 'warning');
                }
            } else {
                showMsg(result?.message || result?.ResponseMessage || 'Failed to load activation data', 'error');
            }
        } catch (err) {
            showMsg('Error loading activation data: ' + err.message, 'error');
        }
    }

    function populateForm(data) {
        console.log('[AccountActivation] populateForm keys:', Object.keys(data));
        console.log('[AccountActivation] Raw Comments value:', data.Comments, '| comments:', data.comments);
        console.log('[AccountActivation] Raw InstructedBy value:', data.InstructedBy, '| instructedBy:', data.instructedBy);

        // Account Identification
        setVal('branchId', getField(data, 'OurBranchID', 'ourBranchID', 'BranchID', 'branchId'));
        setVal('branchName', getField(data, 'BranchName', 'branchName'));
        setVal('accountId', getField(data, 'AccountID', 'accountID', 'accountId'));
        setVal('accountName', getField(data, 'AccountName', 'accountName', 'AccountTitle'));

        // Activation Details
        setVal('instructedBy', getField(data, 'InstructedBy', 'instructedBy'));
        setVal('comments', getField(data, 'Comments', 'comments', 'Remarks', 'remarks'));

        // Behind The Scene — matching legacy fields from p_GetAccountActivation
        setVal('createdOn', formatDate(getField(data, 'CreatedOn', 'createdOn', 'CreatedDate', 'createdDate')));
        setVal('productId', getField(data, 'ProductID', 'productID', 'productId'));
        setVal('productName', getField(data, 'productName', 'ProductName'));
        setVal('availableBalance', formatMoney(getField(data, 'Balance', 'balance', 'AvailableBalance', 'ClearBalance') || 0));
        setVal('lastCreditDate', formatDate(getField(data, 'LastCreditTrxDate', 'lastCreditTrxDate', 'LastCreditDate', 'lastCreditDate')));
        setVal('fixedAmount', formatMoney(getField(data, 'CreditAmount', 'creditAmount', 'FixedAmount', 'fixedAmount') || 0));

        state.currentUpdateCount = getField(data, 'UpdateCount', 'updateCount') || 0;

        console.log('[AccountActivation] Form populated — branch:', el('branchId')?.value,
            'balance:', el('availableBalance')?.value, 'product:', el('productId')?.value,
            'instructedBy:', el('instructedBy')?.value, 'comments:', el('comments')?.value);
    }

    // ── Save ───────────────────────────────────────────────────
    async function handleSave() {
        const instructedBy = val('instructedBy');
        if (!instructedBy) {
            showMsg('Instructed By is required', 'warning');
            el('instructedBy')?.focus();
            return false;
        }

        const ctx = getContext();
        const now = new Date();
        const d = state.currentActivationData;

        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            ReferenceID: parseInt(d?.ReferenceID || d?.ReferenceId || 0) || 0,
            ActivatedDate: formatDateForApi(d?.ActivatedDate || d?.ActivatedOn || now),
            ActivatedBy: ctx.OperatorID,
            InstructedBy: instructedBy,
            Comments: val('comments'),
            TrxRowID: parseFloat(d?.TrxRowID || d?.RowID || 0) || 0,
            ModifiedOn: formatDateForApi(now),
            SupervisedBy: ctx.OperatorID,
            NewRecord: d ? 0 : 1
        };

        // Migration: Add confirmation for save
        const confirmed = await AppCore.showConfirmation('Confirm Activation', 'Are you sure you want to activate this account?');
        if (!confirmed) return false;

        try {
            const result = await AppCore.invokeControllerAsync(API.UPDATE, payload);
            const isOk = result && (result.success || result.Success || result.ResponseCode === '00');
            if (isOk) {
                showMsg(result.message || result.ResponseMessage || 'Account activation saved successfully', 'success');
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

    // ── Init ───────────────────────────────────────────────────
    function init() {
        console.log('[AccountActivation] Initializing submodule');

        // Initial UI state
        setMode(false);

        // Populate identification from global state
        const ctx = getContext();
        setVal('branchId', ctx.OurBranchID);
        setVal('accountId', ctx.AccountID);
        setVal('branchName', window.AccountMaintenanceState?.BranchName || '');
        setVal('accountName', window.AccountMaintenanceState?.AccountName || '');

        if (ctx.OurBranchID && ctx.AccountID) {
            loadData();
        }

        // Section toggles
        document.querySelectorAll('[data-section-toggle]').forEach(hdr => {
            hdr.addEventListener('click', function () {
                const sec = this.closest('.form-section');
                const content = sec?.querySelector('.section-content');
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
        cancel: () => { loadData(); setMode(false); },
        refresh: loadData
    };
})();

console.log('[AccountActivation] Module loaded');
