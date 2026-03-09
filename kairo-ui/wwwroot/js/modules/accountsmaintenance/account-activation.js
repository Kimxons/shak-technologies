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

    function showMsg(msg, type) {
        const t = window.showSystemToast || window.parent?.showSystemToast;
        if (t) t(msg, { variant: type === 'error' ? 'danger' : type });
        console.log(`[AccountActivation] ${type}: ${msg}`);
    }

    function formatDate(ds) {
        if (!ds) return '-';
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

            if (result && result.success) {
                let details = null;
                const d = result.Details || result.data;
                if (d?.Details01?.[0]) details = d.Details01[0];
                else if (d?.Details02?.[0]) details = d.Details02[0];
                else if (Array.isArray(d) && d[0]) details = d[0];
                else if (d && typeof d === 'object' && !d.Details01) details = d;

                if (details) {
                    state.currentActivationData = details;
                    populateForm(details);
                    setMode(false);
                } else {
                    showMsg('No activation data found for this account', 'warning');
                }
            } else {
                showMsg(result?.message || 'Failed to load activation data', 'error');
            }
        } catch (err) {
            showMsg('Error loading activation data: ' + err.message, 'error');
        }
    }

    function populateForm(data) {
        setVal('branchId', data.OurBranchID || '');
        setVal('branchName', data.BranchName || '');
        setVal('accountId', data.AccountID || '');
        setVal('accountName', data.AccountName || '');
        setVal('instructedBy', data.InstructedBy || '');
        setVal('comments', data.Comments || '');

        // BTS fields
        setVal('dormantDate', formatDate(data.DormantDate));
        setVal('originalProductId', data.ProductID || data.OriginalProductID || '-');
        setVal('dormantProductId', data.DormantProductID || '-');
        setVal('balance', formatMoney(data.Balance ?? data.AvailableBalance));
        setVal('fixedAmount', formatMoney(data.CreditAmount ?? data.FixedAmount ?? data.FreezedAmount));
        setVal('lastCreditDate', formatDate(data.LastCreditToDate || data.LastCreditDate));
        setVal('lastDebitDate', formatDate(data.LastDebitDate));
        setVal('fixedAmountId', data.FixedAmountID || '-');

        state.currentUpdateCount = data.UpdateCount || 0;
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
            if (result && result.success) {
                showMsg(result.message || 'Account activation saved successfully', 'success');
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
