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
    const API = {
        GET: '/AccountsMaintenance/api/get-account-freeze',
        ADD: '/AccountsMaintenance/api/add-account-freeze',
        RELEASE: '/AccountsMaintenance/api/release-account-freeze'
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

    function isSuccess(r) { return r && (r.ResponseCode === '00' || r.ResponseCode === 0); }

    function showConfirm(message, title, iconClass) {
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
            overlay.onclick = function (e) { if (e.target === overlay) handleResponse(false); };

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
        } catch (e) {
            return ds;
        }
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
        } catch (e) {
            return '';
        }
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

    /* ── Editable fields ─────────────────────────────────────── */
    const EDITABLE = ['effectiveDate', 'fixedAmount', 'reason'];
    const BTS = ['releasedReason', 'releasedDate', 'productId', 'currencyId', 'clearBalance', 'unclearBalance', 'availableBalance', 'totalBalance', 'drawingPower', 'minimumBalance', 'freezedAmount', 'loanBranchId', 'loanAccountId'];
    const AUDIT = ['MakerID', 'MakerDT', 'ModifierID', 'ModifierDT', 'CheckerID', 'CheckerDT'];

    function setFieldsEditable(editable) {
        EDITABLE.forEach(function (id) {
            var e = el(id);
            if (e) { e.disabled = !editable; e.readOnly = !editable; }
        });
    }

    /* ── Mode Management ─────────────────────────────────────── */
    function setMode(mode) {
        state.editMode = mode;
        var editing = (mode === 'ADD' || mode === 'EDIT');
        setFieldsEditable(editing);

        // Parent-provided action panel buttons (by ID)
        var viewB = el('submoduleBtnView');
        var addB = el('submoduleBtnAdd');
        var editB = el('submoduleBtnEdit');
        var delB = el('submoduleBtnDelete');
        var saveB = el('submoduleBtnSave');
        var cancelB = el('submoduleBtnCancel');

        var prevB = el('submoduleBtnPrev');
        var nextB = el('submoduleBtnNext');

        if (viewB) viewB.disabled = editing;
        if (addB) addB.disabled = editing; // We allow multiple freezes? The original code says yes logic-wise, or just one active Freeze? Add is always available unless editing.
        if (addB) addB.disabled = editing || !!state.currentReferenceId; // If currently frozen, maybe cannot add another? We will restrict for now.
        if (editB) { editB.disabled = true; editB.style.display = 'none'; } // No EDIT for Freeze, only Release or Add
        if (delB) { delB.disabled = true; delB.style.display = 'none'; }  // No DELETE, only RELEASE
        if (saveB) saveB.disabled = !editing;
        if (cancelB) cancelB.disabled = !editing;
        if (prevB) prevB.style.display = 'none';
        if (nextB) nextB.style.display = 'none';

        // Custom action buttons in header
        var btnRelease = el('btnRelease');
        if (btnRelease) {
            btnRelease.disabled = editing || !state.currentReferenceId;
        }

        if (mode === 'ADD') {
            clearEditable();
            var ctx = getContext();
            setVal('branchId', ctx.OurBranchID);
            setVal('accountId', ctx.AccountID);
            setVal('branchName', ctx.BranchName);
            setVal('accountName', ctx.AccountName);
            el('effectiveDate')?.focus();
        } else if (mode === 'NONE' && state.freezeData) {
            // Restore from state
            const acct = state.freezeData?.Details01?.[0] || {};
            const freeze = state.freezeData?.Details02?.[0] || {};
            populateForm(freeze);
        }

        console.log('[FreezeRelease] Mode →', mode);
    }

    /* ── Collapsible Sections & Modals ───────────────────────── */
    let historyModalInstance = null;
    let releaseModalInstance = null;

    function wireEvents() {
        document.querySelectorAll('[data-section-toggle]').forEach(function (header) {
            if (header._wiredFR) return;
            header._wiredFR = true;
            header.addEventListener('click', function (e) {
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
                if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!isOpen));
            });
        });

        // Modals
        if (typeof bootstrap !== 'undefined') {
            historyModalInstance = new bootstrap.Modal(el('historyModal'));
            releaseModalInstance = new bootstrap.Modal(el('releaseModal'));
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

        setVal('freezedAmount', fmtMoney(f.FreezedValue || f.FreezeAmount || f.FixedAmount));
        setVal('loanBranchId', f.LoanBranchID || '');
        setVal('loanAccountId', f.LoanAccountID || '');
    }

    function populateAudit(d) {
        setText('MakerID', d.CreatedBy || d.MakerID || '-');
        setText('MakerDT', fmtDateTime(d.CreatedOn || d.MakerDT));
        setText('ModifierID', d.ModifiedBy || d.ModifierID || '-');
        setText('ModifierDT', fmtDateTime(d.ModifiedOn || d.ModifierDT));
        setText('CheckerID', d.SupervisedBy || d.CheckedBy || d.CheckerID || '-');
        setText('CheckerDT', fmtDateTime(d.SupervisedOn || d.CheckedOn || d.CheckerDT));
    }

    /* ── Load / Navigate ─────────────────────────────────────── */
    function navigate() {
        var ctx = getContext();

        showLoading(true);

        fetch(API.GET, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AccountID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID
            })
        })
            .then(function (r) { return r.json(); })
            .then(function (result) {
                showLoading(false);

                if (isSuccess(result)) {
                    const d = result.Details || result.Data;
                    state.freezeData = d;

                    const acct = d?.Details01?.[0] || {};
                    const freeze = d?.Details02?.[0] || {}; // Typically Details02 is active freeze? OR history?

                    state.currentReferenceId = freeze.ReferenceID || freeze.FreezeId || null;
                    state.currentUpdateCount = parseInt(freeze.UpdateCount || 0) || 0;

                    setVal('branchId', ctx.OurBranchID);
                    setVal('accountId', ctx.AccountID);
                    setVal('branchName', acct.BranchName || acct.OurBranchName || ctx.BranchName || '');
                    setVal('accountName', acct.AccountName || ctx.AccountName || '');

                    populateForm(freeze);
                    populateBts(acct, freeze);
                    populateAudit(freeze);
                    showMsg('Freeze data loaded.', 'success');
                } else {
                    clearAll();
                    state.currentReferenceId = null;
                    showMsg(result.ResponseMessage || 'No active freeze found.', 'info');

                    // Still set context info
                    setVal('branchId', ctx.OurBranchID);
                    setVal('accountId', ctx.AccountID);
                    setVal('branchName', ctx.BranchName);
                    setVal('accountName', ctx.AccountName);
                }
                setMode('NONE');
            })
            .catch(function (err) {
                showLoading(false);
                showMsg('Error loading Freeze data: ' + err.message, 'error');
            });
    }

    /* ── Save ────────────────────────────────────────────────── */
    function saveData() {
        var isAdd = state.editMode === 'ADD';
        if (!isAdd) return; // Only ADD is supported for Freeze saving

        var amount = val('fixedAmount').trim();
        var reason = val('reason').trim();
        var date = val('effectiveDate');

        if (!date) { showMsg('Effective date is required', 'warning'); return; }
        if (!amount || parseFloat(amount) <= 0) { showMsg('Freeze amount must be > 0', 'warning'); return; }
        if (!reason) { showMsg('Reason is required', 'warning'); return; }

        showConfirm(
            'Are you sure you want to add a Freeze to this account?',
            'Confirm Freeze',
            'bi-snow'
        ).then(function (confirmed) {
            if (!confirmed) { showMsg('Save cancelled.', 'info'); return; }

            var ctx = getContext();

            var payload = {
                AccountID: ctx.AccountID,
                FreezeAmount: amount,
                FreezeReason: reason,
                FreezeDate: date,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID
            };

            showLoading(true);

            fetch(API.ADD, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(function (r) { return r.json(); })
                .then(function (result) {
                    showLoading(false);
                    if (isSuccess(result)) {
                        showMsg(result.ResponseMessage || 'Account Freeze added.', 'success');
                        setMode('NONE');
                        navigate();
                    } else {
                        showMsg(result.ResponseMessage || 'Add Freeze failed.', 'error');
                    }
                })
                .catch(function (err) {
                    showLoading(false);
                    showMsg('Add Freeze error: ' + err.message, 'error');
                });
        });
    }

    /* ── Release ─────────────────────────────────────────────── */
    function showReleaseModal() {
        if (!state.currentReferenceId) { showMsg('No freeze record to release', 'warning'); return; }
        setVal('releaseReason', '');
        if (releaseModalInstance) releaseModalInstance.show();
    }

    function doRelease() {
        const releaseReason = val('releaseReason').trim();
        if (!releaseReason) { showMsg('Release reason is required', 'warning'); return; }

        showConfirm(
            'Are you sure you want to release this Freeze?',
            'Confirm Release',
            'bi-unlock'
        ).then(function (confirmed) {
            if (!confirmed) return;

            var ctx = getContext();
            showLoading(true);

            if (releaseModalInstance) releaseModalInstance.hide();

            fetch(API.RELEASE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    AccountID: ctx.AccountID,
                    FreezeId: state.currentReferenceId,
                    ReleaseReason: releaseReason,
                    OurBranchID: ctx.OurBranchID,
                    OperatorID: ctx.OperatorID
                })
            })
                .then(r => r.json())
                .then(result => {
                    showLoading(false);
                    if (isSuccess(result)) {
                        showMsg(result.ResponseMessage || 'Freeze released successfully', 'success');
                        navigate();
                    } else {
                        showMsg(result?.ResponseMessage || 'Failed to release Freeze', 'error');
                    }
                })
                .catch(err => {
                    showLoading(false);
                    showMsg('Release error: ' + err.message, 'error');
                });
        });
    }

    /* ── History ─────────────────────────────────────────────── */
    function showHistory() {
        if (historyModalInstance) historyModalInstance.show();

        const loading = el('historyLoading');
        const empty = el('historyEmpty');
        const container = el('historyTableContainer');
        const tbody = el('historyTableBody');

        if (loading) loading.classList.remove('d-none');
        if (empty) empty.classList.add('d-none');
        if (container) container.classList.add('d-none');
        if (tbody) tbody.innerHTML = '';

        const ctx = getContext();
        fetch(API.GET, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AccountID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID
            })
        })
            .then(r => r.json())
            .then(result => {
                if (loading) loading.classList.add('d-none');

                const d = result.Details || result.Data;
                // Depending on architecture, history could be Details02 Array and current is the latest.
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
            })
            .catch(err => {
                if (loading) loading.classList.add('d-none');
                showMsg('Failed to load history.', 'error');
                console.error('[FreezeRelease] History error:', err);
            });
    }

    /* ── Confirmed Action Wrappers (for AccountMaintenance parent) ─ */
    function confirmAdd() {
        setMode('ADD');
    }

    function confirmCancel() {
        cancelChanges();
    }

    /* ── Cancel / Clear ──────────────────────────────────────── */
    function cancelChanges() {
        if (state.freezeData) {
            const freeze = state.freezeData?.Details02?.[0] || {};
            populateForm(freeze);
        } else {
            clearEditable();
        }
        setMode('NONE');
    }

    function clearEditable() {
        EDITABLE.forEach(id => setVal(id, ''));
        setVal('referenceId', '');
    }

    function clearAll() {
        clearEditable();
        BTS.forEach(id => setVal(id, ''));
        AUDIT.forEach(id => setText(id, '-'));
    }

    /* ── Init ────────────────────────────────────────────────── */
    function init() {
        console.log('[FreezeRelease] Initializing');
        wireEvents();
        setMode('NONE');

        // Initial Load
        var ctx = getContext();
        if (ctx.AccountID) {
            setTimeout(function () { navigate(); }, 300);
        } else {
            showMsg('No Account selected in context.', 'warning');
        }
    }

    /* ── Public API ──────────────────────────────────────────── */
    return {
        init: init,
        setMode: setMode,
        navigate: navigate,
        saveData: saveData,
        confirmAdd: confirmAdd,
        confirmCancel: confirmCancel,
        cancelChanges: cancelChanges,
        clearForm: clearAll,
        loadData: function () { navigate(); },
        showHistory: showHistory,
        showReleaseModal: showReleaseModal
    };
})();

console.log('[FreezeRelease] Module registered');
