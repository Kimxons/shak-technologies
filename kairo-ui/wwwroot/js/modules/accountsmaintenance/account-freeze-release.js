/**
 * Account Freeze/Release Module
 * Modified to adhere to the standardized submodule pattern
 */
window.AccountFreezeReleaseModule = (function () {
    'use strict';

    /* ── State ─────────────────────────────────────────────── */
    const state = {
        editMode: 'NONE',   // NONE | ADD | DELETE
        freezeData: null,
        currentReferenceId: null,
        currentUpdateCount: 0,
        operatorID: null
    };

    /* ── API Routes ─────────────────────────────────────────── */
    /* ── API Routes (Standard MVC Controller Routes) ────────── */
    const API = {
        GET: 'AccountsMaintenance/api/get-account-freeze',
        ADD: 'AccountsMaintenance/api/add-account-freeze',
        RELEASE: 'AccountsMaintenance/api/release-account-freeze'
    };

    /* ── Context ────────────────────────────────────────────── */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID: ps?.AccountID || sessionStorage.getItem('currentAccountID') || '',
            AccountName: ps?.AccountName || sessionStorage.getItem('currentAccountName') || '',
            BranchName: ps?.BranchName || sessionStorage.getItem('currentBranchName') || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM'
        };
    }

    /* ── UI Helpers ──────────────────────────────────────────── */
    function el(id) { return document.getElementById(id); }
    function val(id) { const e = el(id); return e ? e.value : ''; }
    function setVal(id, v) {
        const e = el(id);
        if (!e) return;
        const s = (v == null) ? '' : v;
        if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT') {
            if (e.value !== s) e.value = s;
        } else {
            if (e.textContent !== s) e.textContent = s;
        }
    }
    function setText(id, v) {
        const e = el(id);
        if (!e) return;
        const s = (v == null) ? '' : v;
        e.textContent = (s === '') ? '-' : s;
    }

    function showLoading(show) {
        const o = el('loadingOverlay');
        if (o) o.hidden = !show;
    }

    function showMsg(msg, type) {
        if (typeof window.showSystemToast === 'function') {
            window.showSystemToast(msg, { variant: type === 'error' ? 'danger' : type });
        }
        console.log('[FreezeRelease] ' + type + ': ' + msg);
    }

    function isSuccess(r) {
        if (!r) return false;
        return r.Success === true || r.ResponseCode === '00' || r.ResponseCode === 0;
    }

    function showConfirm(message, title, iconClass) {
        if (window.AppCore && window.AppCore.showConfirmation) {
            return window.AppCore.showConfirmation(title || 'Confirm Action', message);
        }
        title = title || 'Confirm Action';
        iconClass = iconClass || 'bi-question-circle';
        return new Promise(function (resolve) {
            var overlay = document.querySelector('.acd-confirm-overlay');
            if (!overlay) {
                overlay = document.createElement('div');
                overlay.className = 'acd-confirm-overlay';
                overlay.innerHTML =
                    '<div class="acd-confirm-card">' +
                    '  <div class="acd-confirm-icon"><i class="bi ' + iconClass + '"></i></div>' +
                    '  <div class="acd-confirm-title">' + title + '</div>' +
                    '  <div class="acd-confirm-msg">' + message + '</div>' +
                    '  <div class="acd-confirm-actions">' +
                    '    <button type="button" class="acd-confirm-btn acd-confirm-btn--cancel">Cancel</button>' +
                    '    <button type="button" class="acd-confirm-btn acd-confirm-btn--confirm">Confirm</button>' +
                    '  </div>' +
                    '</div>';
                document.body.appendChild(overlay);
            } else {
                overlay.querySelector('.acd-confirm-title').textContent = title;
                overlay.querySelector('.acd-confirm-msg').textContent = message;
                overlay.querySelector('.acd-confirm-icon i').className = 'bi ' + iconClass;
            }

            var confirmBtn = overlay.querySelector('.acd-confirm-btn--confirm');
            var cancelBtn = overlay.querySelector('.acd-confirm-btn--cancel');

            var handleResponse = function (result) {
                overlay.classList.remove('is-visible');
                confirmBtn.onclick = null;
                cancelBtn.onclick = null;
                setTimeout(function () { resolve(result); }, 300);
            };

            confirmBtn.onclick = function () { handleResponse(true); };
            cancelBtn.onclick = function () { handleResponse(false); };

            requestAnimationFrame(function () {
                overlay.classList.add('is-visible');
                setTimeout(function () { confirmBtn.focus(); }, 100);
            });
        });
    }

    function fmtDate(ds) {
        if (!ds) return '';
        try {
            const d = new Date(ds);
            return isNaN(d.getTime()) ? ds : d.toLocaleDateString();
        } catch (e) { return ds; }
    }

    function formatDateForInput(ds) {
        if (!ds) return '';
        try {
            const d = new Date(ds);
            if (isNaN(d.getTime())) return '';
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        } catch (e) { return ''; }
    }

    function fmtDateTime(ds) {
        if (!ds) return '-';
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch (e) { return ds; }
    }

    function fmtMoney(n) {
        const v = parseFloat(n || 0);
        return isNaN(v) ? '0.00' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function escHtml(s) {
        if (!s) return '';
        const d = document.createElement('div');
        d.textContent = s;
        return d.innerHTML;
    }

    const EDITABLE = ['effectiveDate', 'fixedAmount', 'reason'];
    const AUDIT = ['MakerID', 'MakerDT', 'ModifierID', 'ModifierDT', 'CheckerID', 'CheckerDT'];

    function setFieldsEditable(editable) {
        EDITABLE.forEach(id => { const e = el(id); if (e) { e.disabled = !editable; e.readOnly = !editable; } });
    }

    /* ── Mode Management ─────────────────────────────────────── */
    function setMode(mode) {
        state.editMode = mode;
        const editing = (mode === 'ADD' || mode === 'EDIT');
        setFieldsEditable(editing);

        // Parent-provided action panel buttons (by ID)
        var viewB = el('submoduleBtnView');
        var addB = el('submoduleBtnAdd');
        var editB = el('submoduleBtnEdit');
        var delB = el('submoduleBtnDelete');
        var saveB = el('submoduleBtnSave');
        var cancelB = el('submoduleBtnCancel');

        if (viewB) viewB.disabled = editing;
        if (addB) addB.disabled = editing || !!state.currentReferenceId;
        if (editB) { editB.disabled = true; editB.style.display = 'none'; }
        if (delB) { delB.disabled = true; delB.style.display = 'none'; }
        if (saveB) saveB.disabled = !editing;
        if (cancelB) cancelB.disabled = !editing;

        var btnRelease = el('btnRelease');
        if (btnRelease) btnRelease.disabled = editing || !state.currentReferenceId;

        if (mode === 'ADD') {
            clearEditable();
            const ctx = getContext();
            setVal('branchId', ctx.OurBranchID);
            setVal('accountId', ctx.AccountID);
            setVal('branchName', ctx.BranchName);
            setVal('accountName', ctx.AccountName);
            el('effectiveDate')?.focus();
        } else if (mode === 'NONE' && state.freezeData) {
            const freeze = state.freezeData?.Details02?.[0] || {};
            populateForm(freeze);
        }

        console.log('[FreezeRelease] Mode →', mode);
    }

    /* ── Modals ──────────────────────────────────────────────── */
    let historyModalInstance = null;
    let releaseModalInstance = null;

    function wireEvents() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            if (header._wiredFR) return;
            header._wiredFR = true;
            header.addEventListener('click', e => {
                if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;
                var section = header.closest('.form-section');
                var content = section ? section.querySelector('[data-section-content]') : null;
                var toggleBtn = section ? section.querySelector('.section-toggle-btn') : null;
                var icon = toggleBtn ? toggleBtn.querySelector('i') : null;
                if (!content) return;
                var isOpen = content.style.display !== 'none';
                content.style.display = isOpen ? 'none' : '';
                if (icon) {
                    icon.classList.toggle('bi-chevron-up', !isOpen);
                    icon.classList.toggle('bi-chevron-down', isOpen);
                }
            });
        });

        if (typeof bootstrap !== 'undefined') {
            const hMod = el('historyModal');
            const rMod = el('releaseModal');
            if (hMod) historyModalInstance = new bootstrap.Modal(hMod);
            if (rMod) releaseModalInstance = new bootstrap.Modal(rMod);
        }

        const btnHistory = document.querySelector('[data-action="history"]');
        if (btnHistory) btnHistory.addEventListener('click', showHistory);

        const btnRel = document.querySelector('[data-action="release"]');
        if (btnRel) btnRel.addEventListener('click', showReleaseModal);

        const btnConfirmRel = el('btnConfirmRelease');
        if (btnConfirmRel) btnConfirmRel.addEventListener('click', doRelease);
    }

    /* ── Bind / Populate form data ───────────────────────────── */
    function populateForm(f) {
        if (!f) return;
        setVal('referenceId', f.ReferenceID || '');
        setVal('effectiveDate', formatDateForInput(f.EffectiveDate || f.FreezedDate));
        setVal('fixedAmount', f.FreezedValue || f.FreezeAmount || f.FixedAmount || '');
        setVal('reason', f.FreezedReason || f.FreezeReason || '');
    }

    function populateBts(acct, f) {
        setVal('releasedReason', f.ReleasedReason || '');
        setVal('releasedDate', fmtDate(f.ReleasedDate));
        setVal('productId', acct.ProductID || '');
        setVal('currencyId', acct.CurrencyID || '');
        setVal('clearBalance', fmtMoney(acct.ClearBalance));
        setVal('unclearBalance', fmtMoney(acct.UnclearBalance));
        setVal('availableBalance', fmtMoney(acct.AvailableBalance));
        setVal('totalBalance', fmtMoney(acct.TotalBalance));
        setVal('drawingPower', fmtMoney(acct.DrawingPower));
        setVal('minimumBalance', fmtMoney(acct.MinimumBalance));
        setVal('freezedAmount', fmtMoney(f.FreezedValue || f.FreezeAmount));
        setVal('loanBranchId', f.LoanBranchID || '');
        setVal('loanAccountId', f.LoanAccountID || '');
    }

    function populateAudit(d) {
        setText('MakerID', d.CreatedBy || '-');
        setText('MakerDT', fmtDateTime(d.CreatedOn));
        setText('ModifierID', d.ModifiedBy || '-');
        setText('ModifierDT', fmtDateTime(d.ModifiedOn));
        setText('CheckerID', d.SupervisedBy || '-');
        setText('CheckerDT', fmtDateTime(d.SupervisedOn));
    }

    /* ── Load / Navigate ─────────────────────────────────────── */
    async function navigate() {
        const ctx = getContext();
        if (!ctx.AccountID) { showMsg('No Account selected.', 'warning'); return; }

        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.GET, {
                AccountID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID
            });

            showLoading(false);
            if (isSuccess(result)) {
                const d = result.Details || result.Data || result;
                state.freezeData = d;

                const acct = d?.Details01?.[0] || {};
                const freeze = d?.Details02?.[0] || {};

                state.currentReferenceId = freeze.ReferenceID || null;

                setVal('branchId', ctx.OurBranchID);
                setVal('accountId', ctx.AccountID);
                setVal('branchName', acct.BranchName || ctx.BranchName || '');
                setVal('accountName', acct.AccountName || ctx.AccountName || '');

                populateForm(freeze);
                populateBts(acct, freeze);
                populateAudit(freeze);
            } else {
                clearAll();
                state.currentReferenceId = null;
                setVal('branchId', ctx.OurBranchID);
                setVal('accountId', ctx.AccountID);
                setVal('branchName', ctx.BranchName);
                setVal('accountName', ctx.AccountName);
            }
            setMode('NONE');
        } catch (err) {
            showLoading(false);
            showMsg('Error loading Freeze data: ' + err.message, 'error');
        }
    }

    /* ── Save ────────────────────────────────────────────────── */
    async function saveData() {
        if (state.editMode !== 'ADD') return;

        const amount = val('fixedAmount').trim();
        const reason = val('reason').trim();
        const date = val('effectiveDate');

        if (!date) { showMsg('Effective date is required', 'warning'); return; }
        if (!amount || parseFloat(amount) <= 0) { showMsg('Freeze amount must be > 0', 'warning'); return; }
        if (!reason) { showMsg('Reason is required', 'warning'); return; }

        const confirmed = await showConfirm('Are you sure you want to add a Freeze to this account?', 'Confirm Freeze', 'bi-snow');
        if (!confirmed) return;

        const ctx = getContext();
        const payload = {
            AccountID: ctx.AccountID,
            FreezeAmount: amount,
            FreezeReason: reason,
            FreezeDate: date,
            OurBranchID: ctx.OurBranchID,
            OperatorID: ctx.OperatorID
        };

        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.ADD, payload);
            showLoading(false);
            if (isSuccess(result)) {
                showMsg('Account Freeze added.', 'success');
                setMode('NONE');
                navigate();
            } else {
                showMsg(result.ResponseMessage || 'Add Freeze failed.', 'error');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Add Freeze error: ' + err.message, 'error');
        }
    }

    /* ── Release ─────────────────────────────────────────────── */
    function showReleaseModal() {
        if (!state.currentReferenceId) { showMsg('No records to release', 'warning'); return; }
        setVal('releaseReason', '');
        if (releaseModalInstance) releaseModalInstance.show();
    }

    async function doRelease() {
        const releaseReason = val('releaseReason').trim();
        if (!releaseReason) { showMsg('Release reason is required', 'warning'); return; }

        const confirmed = await showConfirm('Are you sure you want to release this Freeze?', 'Confirm Release', 'bi-unlock');
        if (!confirmed) return;

        const ctx = getContext();
        if (releaseModalInstance) releaseModalInstance.hide();
        showLoading(true);

        try {
            const result = await window.AppCore.invokeControllerAsync(API.RELEASE, {
                AccountID: ctx.AccountID,
                FreezeId: state.currentReferenceId,
                ReleaseReason: releaseReason,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID
            });

            showLoading(false);
            if (isSuccess(result)) {
                showMsg('Freeze released successfully', 'success');
                navigate();
            } else {
                showMsg(result.ResponseMessage || 'Failed to release Freeze', 'error');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Release error: ' + err.message, 'error');
        }
    }

    /* ── History ─────────────────────────────────────────────── */
    async function showHistory() {
        if (historyModalInstance) historyModalInstance.show();

        const loading = el('historyLoading');
        const empty = el('historyEmpty');
        const container = el('historyTableContainer');
        const tbody = el('historyTableBody');

        if (loading) loading.classList.remove('d-none');
        if (empty) empty.classList.add('d-none');
        if (container) container.classList.add('d-none');
        if (tbody) tbody.innerHTML = '';

        try {
            const ctx = getContext();
            const result = await window.AppCore.invokeControllerAsync(API.GET, {
                AccountID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID
            });

            if (loading) loading.classList.add('d-none');

            const d = result.Details || result.Data || result;
            const records = d?.Details02 || (Array.isArray(d) ? d : []);

            if (records.length === 0) {
                if (empty) empty.classList.remove('d-none');
                return;
            }

            if (container) container.classList.remove('d-none');
            if (tbody) {
                tbody.innerHTML = records.map(rec => `
                    <tr>
                        <td>${escHtml(rec.ClientID || '')}</td>
                        <td>${escHtml(rec.ClientName || '')}</td>
                        <td>${escHtml(rec.AccountName || '')}</td>
                        <td>${escHtml(rec.ReferenceID || '')}</td>
                        <td>${fmtDate(rec.EffectiveDate || rec.FreezedDate)}</td>
                        <td class="text-end">${fmtMoney(rec.FreezedValue || rec.FreezeAmount)}</td>
                        <td>${escHtml(rec.FreezedReason || rec.FreezeReason || '')}</td>
                        <td>${fmtDate(rec.ReleasedDate)}</td>
                        <td class="text-end">${fmtMoney(rec.ReleasedValue || 0)}</td>
                        <td>${escHtml(rec.ReleasedReason || '')}</td>
                    </tr>
                `).join('');
            }
        } catch (err) {
            if (loading) loading.classList.add('d-none');
            showMsg('Failed to load history.', 'error');
        }
    }

    /* ── Public API ──────────────────────────────────────────── */
    function confirmAdd() { setMode('ADD'); }
    function confirmCancel() { cancelChanges(); }
    function cancelChanges() {
        if (state.freezeData) populateForm(state.freezeData?.Details02?.[0] || {});
        else clearEditable();
        setMode('NONE');
    }

    function clearEditable() {
        EDITABLE.forEach(id => setVal(id, ''));
        setVal('referenceId', '');
    }

    function clearAll() {
        clearEditable();
        AUDIT.forEach(id => setText(id, '-'));
    }

    function init() {
        wireEvents();
        setMode('NONE');
        const ctx = getContext();
        if (ctx.AccountID) navigate();
    }

    return {
        init: init,
        setMode: setMode,
        navigate: navigate,
        saveData: saveData,
        confirmAdd: confirmAdd,
        confirmCancel: confirmCancel,
        cancelChanges: cancelChanges,
        clearForm: clearAll,
        loadData: navigate,
        showHistory: showHistory,
        showReleaseModal: showReleaseModal
    };
})();


console.log('[FreezeRelease] Module registered');
