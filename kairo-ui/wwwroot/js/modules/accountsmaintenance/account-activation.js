/**
 * Account Activation Module
 * Matches original: public/modules/account-maintenance/DataEntry/account-activation.js
 * 
 * Parent wires: View → init(), Edit → edit(), Save → save(), Cancel → cancel()
 */
window.AccountActivationModule = (function () {
    'use strict';

    let currentUpdateCount = 0;
    let currentActivationData = null;

    const API = {
        GET:    '/AccountsMaintenance/api/get-account-activation',
        UPDATE: '/AccountsMaintenance/api/update-account-activation'
    };

    // ── Context helpers ────────────────────────────────────────
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID:   ps?.AccountID   || sessionStorage.getItem('currentAccountID')   || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID')    || '',
            OperatorID:  ps?.OperatorID  || sessionStorage.getItem('currentOperatorID')  || localStorage.getItem('OperatorID') || 'SYSTEM'
        };
    }

    // ── UI helpers ─────────────────────────────────────────────
    function setFieldValue(id, val) {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SPAN' || el.classList.contains('audit-value')) {
            el.textContent = (val === null || val === undefined || val === '') ? '-' : val;
        } else {
            el.value = (val === null || val === undefined) ? '' : val;
        }
    }

    function showLoading(show) {
        const o = document.getElementById('loadingOverlay') || document.querySelector('.de-loading-overlay');
        if (o) o.hidden = !show;
    }

    function showMessage(msg, type) {
        const toast = window.showSystemToast || window.parent?.showSystemToast;
        if (toast) toast(msg, { variant: type === 'error' ? 'danger' : type });
        console.log(`[AccountActivation] ${type}: ${msg}`);
    }

    function isSuccess(r) {
        return r?.ResponseCode === '00' || r?.ResponseCode === 0;
    }

    function formatDate(dateStr) {
        if (!dateStr) return '-';
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return dateStr;
            return d.toLocaleDateString();
        } catch { return dateStr; }
    }

    function formatMoney(val) {
        const n = parseFloat(val);
        if (isNaN(n)) return (val === null || val === undefined) ? '-' : String(val);
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

    // ── Button state ───────────────────────────────────────────
    function setButtonState(action, enabled) {
        const btn = document.querySelector(`[data-action="${action}"]`);
        if (btn) {
            btn.disabled = !enabled;
            btn.style.opacity = enabled ? '1' : '0.5';
            btn.style.cursor = enabled ? 'pointer' : 'not-allowed';
        }
    }

    function setViewMode() {
        setButtonState('view', false);
        setButtonState('edit', true);
        setButtonState('save', false);
        setButtonState('cancel', false);
        const ib = document.getElementById('instructedBy');
        const cm = document.getElementById('comments');
        if (ib) { ib.readOnly = true; ib.style.cursor = 'default'; }
        if (cm) { cm.readOnly = true; cm.style.cursor = 'default'; }
    }

    function setEditMode() {
        setButtonState('view', false);
        setButtonState('edit', false);
        setButtonState('save', true);
        setButtonState('cancel', true);
        const ib = document.getElementById('instructedBy');
        const cm = document.getElementById('comments');
        if (ib) { ib.readOnly = false; ib.style.cursor = 'text'; setTimeout(() => { ib.focus(); ib.select(); }, 100); }
        if (cm) { cm.readOnly = false; cm.style.cursor = 'text'; }
    }

    // ── Section toggles ────────────────────────────────────────
    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(hdr => {
            if (hdr._wired) return;
            hdr._wired = true;
            hdr.addEventListener('click', function () {
                const section = this.closest('.form-section');
                const content = section?.querySelector('.section-content');
                const btn = section?.querySelector('.section-toggle-btn');
                const icon = btn?.querySelector('i');
                const expanded = btn?.getAttribute('aria-expanded') === 'true';
                if (content) content.hidden = expanded;
                btn?.setAttribute('aria-expanded', String(!expanded));
                icon?.classList.toggle('bi-chevron-up');
                icon?.classList.toggle('bi-chevron-down');
            });
        });
    }

    // ── Populate ───────────────────────────────────────────────
    function populateForm(data) {
        if (!data) return;
        const ctx = getContext();
        setFieldValue('branchId',   data.OurBranchID || ctx.OurBranchID);
        setFieldValue('branchName', data.BranchName || '');
        setFieldValue('accountId',  data.AccountID || ctx.AccountID);
        setFieldValue('accountName', data.AccountName || '');
        setFieldValue('instructedBy', data.InstructedBy || '');
        setFieldValue('comments', data.Comments || '');

        // BTS fields
        setFieldValue('dormantDate',       formatDate(data.DormantDate));
        setFieldValue('originalProductId',  data.ProductID || data.OriginalProductID || '-');
        setFieldValue('dormantProductId',   data.DormantProductID || '-');
        setFieldValue('balance',            formatMoney(data.Balance ?? data.AvailableBalance));
        setFieldValue('fixedAmount',        formatMoney(data.CreditAmount ?? data.FixedAmount ?? data.FreezedAmount));
        setFieldValue('lastCreditDate',     formatDate(data.LastCreditToDate || data.LastCreditDate));
        setFieldValue('lastDebitDate',      formatDate(data.LastDebitDate));
        setFieldValue('fixedAmountId',      data.FixedAmountID || '-');

        currentUpdateCount = data.UpdateCount || 0;
    }

    // ── Load Data ──────────────────────────────────────────────
    function loadData() {
        const ctx = getContext();
        const branchId = document.getElementById('branchId')?.value?.trim() || ctx.OurBranchID;
        const accountId = document.getElementById('accountId')?.value?.trim() || ctx.AccountID;

        if (!branchId || !accountId) {
            showMessage('Please select both Branch and Account', 'warning');
            return;
        }

        showLoading(true);
        setButtonState('view', false);
        setButtonState('edit', false);
        setButtonState('save', false);
        setButtonState('cancel', false);

        fetch(API.GET, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ OurBranchID: branchId, AccountID: accountId, OperatorID: ctx.OperatorID })
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            if (isSuccess(result)) {
                // Response: Details may contain nested Details01/Details02 or be the record directly
                let details = null;
                const d = result.Details;
                if (d?.Details01?.[0])      details = d.Details01[0];
                else if (d?.Details02?.[0]) details = d.Details02[0];
                else if (Array.isArray(d) && d[0]) details = d[0];
                else if (d && typeof d === 'object') details = d;

                if (details) {
                    currentActivationData = details;
                    populateForm(details);
                    setViewMode();
                    showMessage(result.ResponseMessage || 'Activation data loaded', 'success');
                } else {
                    showMessage('No activation data found for this account', 'warning');
                }
            } else {
                showMessage(result?.ResponseMessage || 'Failed to load activation data', 'error');
            }
        })
        .catch(err => {
            showLoading(false);
            showMessage('Error loading activation data: ' + err.message, 'error');
            console.error('[AccountActivation] Load error:', err);
        });
    }

    // ── Save ───────────────────────────────────────────────────
    function handleSave() {
        const instructedBy = document.getElementById('instructedBy')?.value?.trim();
        const comments = document.getElementById('comments')?.value?.trim() || '';
        const ctx = getContext();
        const branchId = document.getElementById('branchId')?.value?.trim() || ctx.OurBranchID;
        const accountId = document.getElementById('accountId')?.value?.trim() || ctx.AccountID;

        if (!instructedBy) {
            showMessage('Instructed By is required', 'warning');
            document.getElementById('instructedBy')?.focus();
            return;
        }
        if (!branchId || !accountId) {
            showMessage('Branch ID and Account ID are required', 'warning');
            return;
        }

        const isNew = currentActivationData ? 0 : 1;
        const now = new Date();
        let referenceID = parseInt(currentActivationData?.ReferenceID || currentActivationData?.ReferenceId || 0) || 0;
        let trxRowID = parseFloat(currentActivationData?.TrxRowID || currentActivationData?.RowID || 0) || 0;
        const activatedDate = currentActivationData?.ActivatedDate || currentActivationData?.ActivatedOn || formatDateForApi(now);

        showLoading(true);

        const payload = {
            OurBranchID: branchId,
            AccountID: accountId,
            ReferenceID: referenceID,
            ActivatedDate: formatDateForApi(activatedDate),
            ActivatedBy: ctx.OperatorID,
            InstructedBy: instructedBy,
            Comments: comments,
            TrxRowID: trxRowID,
            ModifiedOn: formatDateForApi(now),
            SupervisedBy: ctx.OperatorID,
            NewRecord: isNew
        };

        fetch(API.UPDATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            if (isSuccess(result)) {
                showMessage(result.ResponseMessage || 'Account activation saved successfully', 'success');
                loadData();
            } else {
                showMessage(result?.ResponseMessage || 'Failed to save account activation', 'error');
            }
        })
        .catch(err => {
            showLoading(false);
            showMessage('Error saving activation: ' + err.message, 'error');
            console.error('[AccountActivation] Save error:', err);
        });
    }

    // ── Init ───────────────────────────────────────────────────
    function init() {
        console.log('[AccountActivation] Initializing');

        setButtonState('view', false);
        setButtonState('edit', false);
        setButtonState('save', false);
        setButtonState('cancel', false);

        const ib = document.getElementById('instructedBy');
        const cm = document.getElementById('comments');
        if (ib) { ib.readOnly = true; ib.style.cursor = 'default'; }
        if (cm) { cm.readOnly = true; cm.style.cursor = 'default'; }

        wireSectionToggles();

        // Populate identification from parent state
        const ctx = getContext();
        setFieldValue('branchId', ctx.OurBranchID);
        setFieldValue('accountId', ctx.AccountID);
        setFieldValue('branchName', window.AccountMaintenanceState?.BranchName || '');
        setFieldValue('accountName', window.AccountMaintenanceState?.AccountName || '');

        if (ctx.OurBranchID && ctx.AccountID) {
            setTimeout(() => loadData(), 300);
        }
    }

    // ── Public API (matches parent wiring) ─────────────────────
    return {
        init: init,
        save: handleSave,
        edit: function () { setEditMode(); },
        cancel: function () { loadData(); },
        refresh: loadData
    };
})();

console.log('[AccountActivation] Module registered');
