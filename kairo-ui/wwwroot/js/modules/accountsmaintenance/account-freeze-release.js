/**
 * Account Freeze/Release Module
 * Modified to adhere to the standardized submodule pattern
 */
window.AccountFreezeReleaseModule = (function () {
    'use strict';

    /* ── State ─────────────────────────────────────────────── */
    const state = {
        editMode: 'NONE',   // NONE | ADD | EDIT
        freezeData: null,
        currentReferenceId: null,
        currentUpdateCount: 0,
        operatorID: null
    };

    /* ── API Routes ─────────────────────────────────────────── */
    /* ── API Routes (Standard MVC Controller Routes) ────────── */
    const API = {
        GET: 'AccountsMaintenance/api/get-account-freeze',
        HISTORY: 'AccountsMaintenance/api/get-blocked-history',
        GET_ACCOUNT: 'AccountsMaintenance/get-account',
        GET_ACCOUNT_ALT: 'AccountsMaintenance/api/get-account',
        ADD: 'AccountsMaintenance/api/add-account-freeze',
        UPDATE: 'AccountsMaintenance/api/update-account-freeze',
        RELEASE: 'AccountsMaintenance/api/release-account-freeze'
    };

    /* ── Context ────────────────────────────────────────────── */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        const parentPs = window.parent?.AccountMaintenanceState;
        const doc = window.document;
        const parentDoc = window.parent?.document;
        const branchFromForm = val('branchId');
        const accountFromForm = val('accountId');
        const accountNameFromForm = val('accountName');
        const branchNameFromForm = val('branchName');

        const pickText = function (v) {
            return (v == null) ? '' : String(v).trim();
        };

        const ownBranchName =
            pickText(doc?.getElementById('BranchName')?.value) ||
            pickText(doc?.querySelector('[name="BranchName"]')?.value) ||
            pickText(doc?.getElementById('branchName')?.value) ||
            pickText(doc?.querySelector('[data-field="branchName"]')?.textContent);

        const parentBranchName =
            pickText(parentDoc?.getElementById('BranchName')?.value) ||
            pickText(parentDoc?.querySelector('[name="BranchName"]')?.value) ||
            pickText(parentDoc?.getElementById('branchName')?.value) ||
            pickText(parentDoc?.querySelector('[data-field="branchName"]')?.textContent) ||
            '';
        return {
            AccountID: ps?.AccountID || parentPs?.AccountID || accountFromForm || sessionStorage.getItem('currentAccountID') || '',
            AccountName: ps?.AccountName || parentPs?.AccountName || accountNameFromForm || sessionStorage.getItem('currentAccountName') || '',
            BranchName: ps?.BranchName || parentPs?.BranchName || branchNameFromForm || ownBranchName || parentBranchName || sessionStorage.getItem('currentBranchName') || sessionStorage.getItem('branch_name') || '',
            OurBranchID: ps?.OurBranchID || parentPs?.OurBranchID || branchFromForm || sessionStorage.getItem('currentBranchID') || '',
            OperatorID: ps?.OperatorID || parentPs?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM'
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

    function asArray(v) {
        return Array.isArray(v) ? v : [];
    }

    function pickFreezeDetails(raw) {
        const details02 = asArray(raw?.Details02 || raw?.details02);
        if (details02.length > 0) return details02[0];

        if (raw?.FreezeDetails && typeof raw.FreezeDetails === 'object') return raw.FreezeDetails;
        if (raw?.freezeDetails && typeof raw.freezeDetails === 'object') return raw.freezeDetails;

        // Some endpoints flatten freeze fields directly in the payload
        const looksLikeFreeze = raw && (
            raw.ReferenceID || raw.referenceId || raw.FreezedValue || raw.FreezeAmount ||
            raw.FreezedReason || raw.FreezeReason || raw.EffectiveDate || raw.FreezedDate
        );
        return looksLikeFreeze ? raw : {};
    }

    function pickAccountDetails(raw) {
        const details01 = asArray(raw?.Details01 || raw?.details01);
        if (details01.length > 0) return details01[0];

        if (raw?.AccountInfo && typeof raw.AccountInfo === 'object') return raw.AccountInfo;
        if (raw?.accountInfo && typeof raw.accountInfo === 'object') return raw.accountInfo;

        if (raw?.AccountDetails && typeof raw.AccountDetails === 'object') {
            return {
                ...raw.AccountDetails,
                ...(raw.FinancialSummary || {})
            };
        }

        return {};
    }

    function accountFromContext(ctx) {
        const ps = window.AccountMaintenanceState || {};
        return {
            AccountID: ctx.AccountID || ps.AccountID || '',
            AccountName: ctx.AccountName || ps.AccountName || '',
            ProductID: ps.ProductID || '',
            CurrencyID: ps.CurrencyID || sessionStorage.getItem('currentCurrencyID') || '',
            ClearBalance: ps.ClearBalance || 0,
            UnclearBalance: ps.UnclearBalance || 0,
            AvailableBalance: ps.AvailableBalance || 0,
            TotalBalance: ps.TotalBalance || 0,
            DrawingPower: ps.DrawingPower || 0,
            MinimumBalance: ps.MinimumBalance || 0
        };
    }

    function hasAccountSnapshot(acct) {
        if (!acct) return false;
        const keys = ['ProductID', 'CurrencyID', 'ClearBalance', 'AvailableBalance', 'TotalBalance', 'MinimumBalance'];
        return keys.some(k => acct[k] !== undefined && acct[k] !== null && String(acct[k]).trim() !== '');
    }

    async function fetchAccountSnapshot(ctx) {
        const base = accountFromContext(ctx);
        if (!ctx.AccountID) return base;

        const payload = {
            AccountID: ctx.AccountID,
            OurBranchID: ctx.OurBranchID,
            Direction: 0,
            OperatorID: ctx.OperatorID
        };

        const endpoints = [API.GET_ACCOUNT, API.GET_ACCOUNT_ALT];
        for (let i = 0; i < endpoints.length; i++) {
            try {
                const resp = await window.AppCore.invokeControllerAsync(endpoints[i], payload);
                const raw = resp?.Details || resp?.Data || resp?.data || resp || {};
                const acct = pickAccountDetails(raw);
                if (hasAccountSnapshot(acct)) {
                    return { ...base, ...acct };
                }
            } catch (_) {
                // Keep trying fallback endpoints and finally return context values.
            }
        }

        return base;
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
        const hasData = !!state.freezeData;
        setFieldsEditable(editing);

        // Parent-provided action panel buttons (by ID)
        var viewB = el('submoduleBtnView');
        var addB = el('submoduleBtnAdd');
        var editB = el('submoduleBtnEdit');
        var delB = el('submoduleBtnDelete');
        var saveB = el('submoduleBtnSave');
        var cancelB = el('submoduleBtnCancel');

        // View: only active when no data loaded yet and not editing
        if (viewB) viewB.disabled = editing || hasData;
        // Add: active in view/init mode, disabled only while editing
        if (addB) addB.disabled = editing;
        if (editB) { editB.disabled = true; editB.style.display = 'none'; }
        if (delB) { delB.disabled = true; delB.style.display = 'none'; }
        // Save: only during editing
        if (saveB) saveB.disabled = !editing;
        // Cancel: active after data loaded or while editing
        if (cancelB) cancelB.disabled = !editing && !hasData;

        var btnRelease = el('submoduleBtnRelease');
        if (btnRelease) btnRelease.disabled = editing || !state.currentReferenceId;

        var btnHistory = el('submoduleBtnHistory');
        if (btnHistory) btnHistory.disabled = editing || !hasData;

        if (mode === 'ADD') {
            clearEditable();
            const ctx = getContext();
            setVal('branchId', ctx.OurBranchID);
            setVal('accountId', ctx.AccountID);
            setVal('branchName', ctx.BranchName);
            setVal('accountName', ctx.AccountName);
            el('effectiveDate')?.focus();
        } else if (mode === 'NONE' && state.freezeData) {
            const freeze = state.freezeData?.FreezeDetails || {};
            populateForm(freeze);
        }

        console.log('[FreezeRelease] Mode →', mode);
    }

    /* ── Modals ──────────────────────────────────────────────── */
    let historyModalInstance = null;
    let releaseModalInstance = null;

    function cleanupModalBackdrop() {
        document.querySelectorAll('.modal-backdrop').forEach(b => b.remove());
        document.body.classList.remove('modal-open');
        document.body.style.removeProperty('overflow');
        document.body.style.removeProperty('padding-right');
    }

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
            // Move modals to body so Bootstrap backdrop/z-index works correctly
            if (hMod) {
                document.body.appendChild(hMod);
                historyModalInstance = new bootstrap.Modal(hMod);
                hMod.addEventListener('hidden.bs.modal', cleanupModalBackdrop);
            }
            if (rMod) {
                document.body.appendChild(rMod);
                releaseModalInstance = new bootstrap.Modal(rMod);
                rMod.addEventListener('hidden.bs.modal', cleanupModalBackdrop);
            }
        }

        const btnHistory = el('submoduleBtnHistory');
        if (btnHistory) btnHistory.addEventListener('click', showHistory);

        const btnRel = el('submoduleBtnRelease');
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
    async function navigate(direction) {
        direction = (typeof direction === 'number') ? direction : 0;
        const ctx = getContext();
        if (!ctx.AccountID) { showMsg('No Account selected.', 'warning'); return; }

        showLoading(true);
        try {
            const payload = {
                AccountID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID,
                Direction: direction
            };
            if (state.currentReferenceId != null) {
                payload.ReferenceID = state.currentReferenceId;
            }

            const result = await window.AppCore.invokeControllerAsync(API.GET, payload);
            const raw = result?.Details || result?.Data || result?.data || result || {};
            const noFreezeRecords = result?.ResponseCode === 'DBEX000020'
                || raw?.error === 'No_Freeze_Records'
                || raw?.Error === 'No_Freeze_Records';

            showLoading(false);
            if (isSuccess(result)) {
                const acct = pickAccountDetails(raw);
                const freeze = pickFreezeDetails(raw);
                const d = {
                    ...raw,
                    AccountInfo: acct,
                    FreezeDetails: freeze
                };
                state.freezeData = d;

                state.currentReferenceId = freeze.ReferenceID || d.ReferenceID || null;
                state.currentUpdateCount = freeze.UpdateCount || 0;

                setVal('branchId', ctx.OurBranchID);
                setVal('accountId', ctx.AccountID);
                setVal('branchName', ctx.BranchName || '');
                setVal('accountName', acct.AccountDescription || acct.AccountName || acct.Name || ctx.AccountName || '');

                populateForm(freeze);
                populateBts(acct, freeze);
                populateAudit(freeze.ReferenceID ? freeze : acct);
            } else if (noFreezeRecords) {
                const acct = await fetchAccountSnapshot(ctx);

                state.freezeData = {
                    AccountInfo: acct,
                    FreezeDetails: {}
                };
                state.currentReferenceId = null;
                state.currentUpdateCount = 0;

                setVal('branchId', ctx.OurBranchID);
                setVal('accountId', ctx.AccountID);
                setVal('branchName', ctx.BranchName || '');
                setVal('accountName', acct.AccountDescription || acct.AccountName || acct.Name || ctx.AccountName || '');

                clearEditable();
                populateBts(acct, {});
                populateAudit(acct);
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
        if (state.editMode !== 'ADD' && state.editMode !== 'EDIT') return;

        const amount = val('fixedAmount').trim();
        const reason = val('reason').trim();
        const date = val('effectiveDate');

        if (!date) { showMsg('Effective date is required', 'warning'); return; }
        if (!amount || parseFloat(amount) <= 0) { showMsg('Freeze amount must be > 0', 'warning'); return; }
        if (!reason) { showMsg('Reason is required', 'warning'); return; }

        const isEdit = state.editMode === 'EDIT';
        const confirmMsg = isEdit
            ? 'Are you sure you want to update this Freeze?'
            : 'Are you sure you want to add a Freeze to this account?';

        const confirmed = await showConfirm(confirmMsg, isEdit ? 'Confirm Update' : 'Confirm Freeze', 'bi-snow');
        if (!confirmed) return;

        const ctx = getContext();
        const resolvedAccountID = ctx.AccountID || val('accountId');
        const resolvedBranchID = ctx.OurBranchID || val('branchId');
        const payload = {
            AccountID: resolvedAccountID,
            FreezeAmount: amount,
            FreezeReason: reason,
            FreezeDate: date,
            EffectiveDate: date,
            FreezedDate: date,
            OurBranchID: resolvedBranchID,
            BranchID: resolvedBranchID,
            OperatorID: ctx.OperatorID,
            CreatedBy: ctx.OperatorID,
            MakerID: ctx.OperatorID
        };

        if (isEdit) {
            payload.ReferenceID = state.currentReferenceId;
            payload.ModifiedBy = ctx.OperatorID;
        }

        const endpoint = isEdit ? API.UPDATE : API.ADD;

        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(endpoint, payload);
            showLoading(false);
            if (isSuccess(result)) {
                showMsg(isEdit ? 'Account Freeze updated.' : 'Account Freeze added.', 'success');
                setMode('NONE');
                navigate();
            } else {
                showMsg(result.ResponseMessage || (isEdit ? 'Update Freeze failed.' : 'Add Freeze failed.'), 'error');
            }
        } catch (err) {
            showLoading(false);
            showMsg((isEdit ? 'Update' : 'Add') + ' Freeze error: ' + err.message, 'error');
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
            const payload = {
                AccountID: ctx.AccountID,
                ReferenceID: state.currentReferenceId != null ? String(state.currentReferenceId) : '',
                ReleasedDate: new Date().toISOString(),
                ReleasedReason: releaseReason,
                OurBranchID: ctx.OurBranchID,
                BranchName: ctx.BranchName || '',
                OperatorID: ctx.OperatorID
            };
            console.log('[FreezeRelease] Release payload:', JSON.stringify(payload));
            const result = await window.AppCore.invokeControllerAsync(API.RELEASE, payload);

            showLoading(false);
            if (isSuccess(result)) {
                showMsg('Freeze released successfully', 'success');
                navigate();
            } else {
                showMsg(result.ResponseMessage || 'Failed to release Freeze', 'error');
            }
        } catch (err) {
            showLoading(false);
            console.error('[FreezeRelease] Release error detail:', {
                message: err.message,
                status: err.status,
                response: err.response
            });
            const detail = err.response?.ErrorMessage || err.response?.ResponseMessage || err.response?.Detail || err.message;
            showMsg('Release error: ' + detail, 'error');
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
            // Legacy freeze history query uses a date window; keep a generous range.
            const toDate = new Date();
            const fromDate = new Date();
            fromDate.setMonth(fromDate.getMonth() - 12);

            const extractRecords = function (result) {
                const d = result?.Details || result?.Data || result?.data || result || {};
                return asArray(d?.Details)
                    .concat(asArray(d?.HistoryDetails))
                    .concat(asArray(d?.FreezeHistory))
                    .concat(asArray(d?.Details01))
                    .concat(asArray(d?.Details02))
                    .concat(asArray(d?.data))
                    .concat(asArray(result?.Details?.Details))
                    .concat(asArray(result?.Details?.Details01))
                    .concat(asArray(result?.Details?.Details02))
                    .concat(asArray(result?.Details))
                    .concat(asArray(result?.Data))
                    .concat(Array.isArray(d) ? d : [])
                    .filter(r => r && typeof r === 'object' && !r.error);
            };

            let records = [];

            const blockedResult = await window.AppCore.invokeControllerAsync(API.HISTORY, {
                AccountID: ctx.AccountID,
                RelevantID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID,
                FromDate: fromDate.toISOString(),
                ToDate: toDate.toISOString(),
                ModuleID: 1300
            });
            records = extractRecords(blockedResult);

            // Final fallback: at least show current freeze record from get-account-freeze
            if (records.length === 0) {
                const currentResult = await window.AppCore.invokeControllerAsync(API.GET, {
                    AccountID: ctx.AccountID,
                    OurBranchID: ctx.OurBranchID,
                    OperatorID: ctx.OperatorID,
                    Direction: 0
                });
                records = extractRecords(currentResult);
            }

            if (loading) loading.classList.add('d-none');

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
    function confirmEdit() { setMode('EDIT'); }
    function confirmCancel() { cancelChanges(); }
    function cancelChanges() {
        if (state.editMode === 'ADD' || state.editMode === 'EDIT') {
            // Cancel editing — restore loaded data
            if (state.freezeData) populateForm(state.freezeData?.FreezeDetails || {});
            else clearEditable();
        } else {
            // Cancel from view — reset to initial state
            state.freezeData = null;
            state.currentReferenceId = null;
            clearAll();
        }
        setMode('NONE');
    }

    function clearEditable() {
        EDITABLE.forEach(id => setVal(id, ''));
        setVal('referenceId', '');
    }

    const BTS_FIELDS = ['releasedReason','releasedDate','productId','currencyId',
        'clearBalance','unclearBalance','availableBalance','totalBalance',
        'drawingPower','minimumBalance','freezedAmount','loanBranchId','loanAccountId'];

    function clearAll() {
        clearEditable();
        BTS_FIELDS.forEach(id => setVal(id, ''));
        AUDIT.forEach(id => setText(id, '-'));
    }

    function init() {
        wireEvents();
        // Show account identification immediately from context
        const ctx = getContext();
        setVal('branchId', ctx.OurBranchID);
        setVal('branchName', ctx.BranchName);
        setVal('accountId', ctx.AccountID);
        setVal('accountName', ctx.AccountName);
        setMode('NONE');
    }

    return {
        init: init,
        setMode: setMode,
        navigate: navigate,
        navigatePrev: function () { navigate(-1); },
        navigateNext: function () { navigate(1); },
        saveData: saveData,
        confirmAdd: confirmAdd,
        confirmEdit: confirmEdit,
        confirmCancel: confirmCancel,
        cancelChanges: cancelChanges,
        clearForm: clearAll,
        loadData: navigate,
        showHistory: showHistory,
        showReleaseModal: showReleaseModal
    };
})();


console.log('[FreezeRelease] Module registered');
