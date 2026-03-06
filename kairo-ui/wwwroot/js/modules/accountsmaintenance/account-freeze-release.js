/**
 * Account Freeze/Release Module
 * DTOs: GetAccountFreezeRequest(AccountID), AddAccountFreezeRequest(AccountID,FreezeAmount,FreezeReason,FreezeDate),
 *        ReleaseAccountFreezeRequest(AccountID,FreezeId,ReleaseReason) — all typed with EnsureDefaults
 *
 * Parent wires: View → setMode('VIEW'), Save → saveData(), Cancel → cancelChanges()
 */
window.AccountFreezeReleaseModule = (function () {
    'use strict';

    const state = {
        currentMode: 'VIEW',
        freezeData: null,
        currentReferenceId: null,
        currentUpdateCount: 0
    };

    const API = {
        GET:     '/AccountsMaintenance/api/get-account-freeze',
        ADD:     '/AccountsMaintenance/api/add-account-freeze',
        RELEASE: '/AccountsMaintenance/api/release-account-freeze'
    };

    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID:   ps?.AccountID   || sessionStorage.getItem('currentAccountID')   || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID')    || '',
            OperatorID:  ps?.OperatorID  || sessionStorage.getItem('currentOperatorID')  || localStorage.getItem('OperatorID') || 'SYSTEM'
        };
    }

    // ── UI Helpers ─────────────────────────────────────────────
    function el(id)       { return document.getElementById(id); }
    function val(id)      { const e = el(id); return e ? e.value : ''; }
    function setVal(id,v) { const e = el(id); if (e) e.value = (v == null) ? '' : v; }
    function setText(id,v){ const e = el(id); if (!e) return; if (e.tagName==='INPUT'||e.tagName==='TEXTAREA'||e.tagName==='SELECT') e.value=(v==null)?'':v; else e.textContent=(v==null)?'-':v; }

    function showLoading(show) { const o = el('loadingOverlay') || document.querySelector('.de-loading-overlay'); if (o) o.hidden = !show; }
    function showMsg(msg, type) { const t = window.showSystemToast || window.parent?.showSystemToast; if (t) t(msg, { variant: type==='error'?'danger':type }); console.log(`[FreezeRelease] ${type}: ${msg}`); }
    function isSuccess(r) { return r?.ResponseCode === '00' || r?.ResponseCode === 0; }

    function fmtDate(ds) { if (!ds) return ''; try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleDateString(); } catch { return ds; } }
    function fmtDateTime(ds) { if (!ds) return '-'; try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch { return ds; } }
    function fmtMoney(n) { const v = parseFloat(n || 0); return isNaN(v) ? '0.00' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
    function escHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    const EDITABLE = ['effectiveDate', 'fixedAmount', 'reason'];
    const BTS = ['releasedReason', 'releasedDate', 'productId', 'currencyId', 'clearBalance', 'unclearBalance', 'availableBalance', 'totalBalance', 'drawingPower', 'minimumBalance', 'freezedAmount', 'loanBranchId', 'loanAccountId'];
    const AUDIT = ['MakerID', 'MakerDT', 'ModifierID', 'ModifierDT', 'CheckerID', 'CheckerDT'];

    // ── Mode management ────────────────────────────────────────
    function setActionBtn(action, enabled) {
        const btn = document.querySelector(`[data-action="${action}"]`);
        if (btn) { btn.disabled = !enabled; btn.style.opacity = enabled ? '1' : '0.5'; }
    }

    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD';

        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = !editing; });

        setActionBtn('view',    !editing);
        setActionBtn('add',     !editing);
        setActionBtn('save',    editing);
        setActionBtn('cancel',  editing);
        setActionBtn('history', !editing);
        setActionBtn('release', !editing && !!state.currentReferenceId);

        if (mode === 'ADD') { clearEditable(); }
        console.log('[FreezeRelease] Mode →', mode);
    }

    // ── Wire Events ────────────────────────────────────────────
    function wireEvents() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            if (btn._wired) return;
            btn._wired = true;
            const a = btn.getAttribute('data-action');
            if (a === 'view')    btn.addEventListener('click', () => { state.currentMode = 'VIEW'; loadData(); });
            if (a === 'add')     btn.addEventListener('click', () => setMode('ADD'));
            if (a === 'save')    btn.addEventListener('click', saveData);
            if (a === 'cancel')  btn.addEventListener('click', cancelChanges);
            if (a === 'history') btn.addEventListener('click', showHistory);
            if (a === 'release') btn.addEventListener('click', showReleaseModal);
        });

        document.querySelectorAll('[data-section-toggle]').forEach(hdr => {
            if (hdr._wired) return;
            hdr._wired = true;
            hdr.addEventListener('click', function () {
                const sec = this.closest('.form-section');
                const c = sec?.querySelector('.section-content');
                const btn = sec?.querySelector('.section-toggle-btn');
                const icon = btn?.querySelector('i');
                const exp = btn?.getAttribute('aria-expanded') === 'true';
                if (c) c.hidden = exp;
                btn?.setAttribute('aria-expanded', String(!exp));
                icon?.classList.toggle('bi-chevron-up');
                icon?.classList.toggle('bi-chevron-down');
            });
        });
    }

    // ── Load Data ──────────────────────────────────────────────
    function loadData() {
        const ctx = getContext();
        showLoading(true);

        fetch(API.GET, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AccountID:   ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID:  ctx.OperatorID
            })
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            if (isSuccess(result)) {
                const d = result.Details;
                state.freezeData = d;

                const acct   = d?.Details01?.[0] || {};
                const freeze = d?.Details02?.[0] || {};

                state.currentReferenceId = freeze.ReferenceID || freeze.FreezeId || null;
                state.currentUpdateCount = parseInt(freeze.UpdateCount || 0) || 0;

                const ctx2 = getContext();
                setVal('branchId',  ctx2.OurBranchID);
                setVal('accountId', ctx2.AccountID);
                setText('branchName',  acct.BranchName || acct.OurBranchName || window.AccountMaintenanceState?.BranchName || '');
                setText('accountName', acct.AccountName || window.AccountMaintenanceState?.AccountName || '');

                populateForm(freeze);
                populateBts(acct, freeze);
                populateAudit(freeze);

                setActionBtn('release', !!state.currentReferenceId);
                showMsg(result.ResponseMessage || 'Freeze data loaded', 'success');
            } else {
                clearAll();
                state.currentReferenceId = null;
                showMsg(result?.ResponseMessage || 'No freeze records found', 'warning');
            }
        })
        .catch(err => {
            showLoading(false);
            showMsg('Error loading freeze data: ' + err.message, 'error');
        });
    }

    // ── Populate ───────────────────────────────────────────────
    function populateForm(f) {
        setVal('referenceId',   f.ReferenceID || '');
        setVal('effectiveDate', f.EffectiveDate ? f.EffectiveDate.split('T')[0] : (f.FreezedDate ? f.FreezedDate.split('T')[0] : ''));
        setVal('fixedAmount',   f.FreezedValue || f.FreezeAmount || f.FixedAmount || '');
        setVal('reason',        f.FreezedReason || f.FreezeReason || '');
    }

    function populateBts(acct, f) {
        setVal('releasedReason',   f.ReleasedReason || '');
        setVal('releasedDate',     fmtDate(f.ReleasedDate));
        setVal('productId',        acct.ProductID || '');
        setVal('currencyId',       acct.CurrencyID || '');
        setVal('clearBalance',     fmtMoney(acct.ClearBalance));
        setVal('unclearBalance',   fmtMoney(acct.UnclearBalance));
        setVal('availableBalance', fmtMoney(acct.AvailableBalance));
        setVal('totalBalance',     fmtMoney(acct.TotalBalance));
        setVal('drawingPower',     fmtMoney(acct.DrawingPower));
        setVal('minimumBalance',   fmtMoney(acct.MinimumBalance));
        setVal('freezedAmount',    fmtMoney(f.FreezedValue || f.FreezeAmount));
        setVal('loanBranchId',     f.LoanBranchID || '');
        setVal('loanAccountId',    f.LoanAccountID || '');
    }

    function populateAudit(d) {
        setText('MakerID',    d.CreatedBy || d.MakerID || '-');
        setText('MakerDT',    fmtDateTime(d.CreatedOn || d.MakerDT));
        setText('ModifierID', d.ModifiedBy || d.ModifierID || '-');
        setText('ModifierDT', fmtDateTime(d.ModifiedOn || d.ModifierDT));
        setText('CheckerID',  d.SupervisedBy || d.CheckedBy || d.CheckerID || '-');
        setText('CheckerDT',  fmtDateTime(d.SupervisedOn || d.CheckedOn || d.CheckerDT));
    }

    // ── Save (Add Freeze) ──────────────────────────────────────
    function saveData() {
        const amount = val('fixedAmount').trim();
        const reason = val('reason').trim();
        const date   = val('effectiveDate');

        if (!date)   { showMsg('Effective date is required', 'warning'); return; }
        if (!amount || parseFloat(amount) <= 0) { showMsg('Freeze amount must be > 0', 'warning'); return; }
        if (!reason) { showMsg('Reason is required', 'warning'); return; }

        const ctx = getContext();
        showLoading(true);

        fetch(API.ADD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AccountID:    ctx.AccountID,
                FreezeAmount: amount,
                FreezeReason: reason,
                FreezeDate:   date,
                OurBranchID:  ctx.OurBranchID,
                OperatorID:   ctx.OperatorID
            })
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            if (isSuccess(result)) {
                showMsg(result.ResponseMessage || 'Freeze added', 'success');
                state.currentMode = 'VIEW';
                loadData();
            } else {
                showMsg(result?.ResponseMessage || 'Failed to add freeze', 'error');
            }
        })
        .catch(err => {
            showLoading(false);
            showMsg('Save error: ' + err.message, 'error');
        });
    }

    // ── Release ────────────────────────────────────────────────
    function showReleaseModal() {
        if (!state.currentReferenceId) { showMsg('No freeze record to release', 'warning'); return; }

        const modal = el('releaseModal');
        if (modal) {
            modal.style.display = 'flex';
            const rr = el('releaseReason');
            if (rr) rr.value = '';

            const confirmBtn = modal.querySelector('[data-action="confirmRelease"], .btn-primary, button[type="submit"]');
            if (confirmBtn) {
                const nb = confirmBtn.cloneNode(true);
                confirmBtn.parentNode.replaceChild(nb, confirmBtn);
                nb.addEventListener('click', () => doRelease());
            }
            modal.querySelectorAll('[data-action="cancelRelease"], .btn-secondary, [data-dismiss="modal"]').forEach(b => {
                b.addEventListener('click', () => { modal.style.display = 'none'; });
            });
        } else {
            const reason = prompt('Enter release reason:');
            if (reason && reason.trim()) doRelease(reason.trim());
        }
    }

    function doRelease(reasonOverride) {
        const releaseReason = reasonOverride || el('releaseReason')?.value?.trim();
        if (!releaseReason) { showMsg('Release reason is required', 'warning'); return; }

        const ctx = getContext();
        showLoading(true);
        const modal = el('releaseModal');
        if (modal) modal.style.display = 'none';

        fetch(API.RELEASE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AccountID:     ctx.AccountID,
                FreezeId:      state.currentReferenceId,
                ReleaseReason: releaseReason,
                OurBranchID:   ctx.OurBranchID,
                OperatorID:    ctx.OperatorID
            })
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            if (isSuccess(result)) {
                showMsg(result.ResponseMessage || 'Freeze released', 'success');
                loadData();
            } else {
                showMsg(result?.ResponseMessage || 'Failed to release', 'error');
            }
        })
        .catch(err => {
            showLoading(false);
            showMsg('Release error: ' + err.message, 'error');
        });
    }

    // ── History ────────────────────────────────────────────────
    function showHistory() {
        const modal = el('historyModal');
        if (!modal) { showMsg('History modal not available', 'warning'); return; }
        modal.style.display = 'flex';

        const loading = el('historyLoading');
        const empty   = el('historyEmpty');
        const tbody   = el('historyTableBody');
        if (loading) loading.hidden = false;
        if (empty)   empty.hidden = true;
        if (tbody)   tbody.innerHTML = '';

        modal.querySelectorAll('[data-dismiss="modal"], .btn-close, .close').forEach(b => {
            b.addEventListener('click', () => { modal.style.display = 'none'; });
        });

        const ctx = getContext();
        fetch(API.GET, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AccountID:   ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID:  ctx.OperatorID
            })
        })
        .then(r => r.json())
        .then(result => {
            if (loading) loading.hidden = true;
            const d = result.Details;
            const records = d?.Details02 || (Array.isArray(d) ? d : []);
            if (records.length === 0) { if (empty) empty.hidden = false; return; }
            if (tbody) {
                tbody.innerHTML = records.map(rec => `
                    <tr>
                        <td>${escHtml(rec.ClientID || '')}</td>
                        <td>${escHtml(rec.ClientName || '')}</td>
                        <td>${escHtml(rec.AccountName || '')}</td>
                        <td>${escHtml(rec.ReferenceID || '')}</td>
                        <td>${fmtDate(rec.EffectiveDate || rec.FreezedDate)}</td>
                        <td>${fmtMoney(rec.FreezedValue || rec.FreezeAmount)}</td>
                        <td>${escHtml(rec.FreezedReason || rec.FreezeReason || '')}</td>
                        <td>${fmtDate(rec.ReleasedDate)}</td>
                        <td>${fmtMoney(rec.ReleasedValue)}</td>
                        <td>${escHtml(rec.ReleasedReason || '')}</td>
                    </tr>
                `).join('');
            }
        })
        .catch(err => { if (loading) loading.hidden = true; console.error('[FreezeRelease] History error:', err); });
    }

    // ── Cancel / Clear ─────────────────────────────────────────
    function cancelChanges() {
        if (state.freezeData) {
            const freeze = state.freezeData?.Details02?.[0] || {};
            populateForm(freeze);
        }
        state.currentMode = 'VIEW';
        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = true; });
        setActionBtn('view', true);
        setActionBtn('add', true);
        setActionBtn('save', false);
        setActionBtn('cancel', false);
        setActionBtn('history', true);
        setActionBtn('release', !!state.currentReferenceId);
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

    // ── Init ───────────────────────────────────────────────────
    function init() {
        console.log('[FreezeRelease] Initializing');
        wireEvents();

        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = true; });
        setActionBtn('save', false);
        setActionBtn('cancel', false);

        const ctx = getContext();
        setVal('branchId', ctx.OurBranchID);
        setVal('accountId', ctx.AccountID);

        if (ctx.AccountID) {
            setTimeout(() => loadData(), 300);
        }
    }

    return { init, setMode, saveData, cancelChanges, loadData };
})();

console.log('[FreezeRelease] Module registered');
