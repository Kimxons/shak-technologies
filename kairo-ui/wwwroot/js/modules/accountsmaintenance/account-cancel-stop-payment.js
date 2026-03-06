/**
 * Account Cancel Stop Payment Module
 * Matches original: public/modules/account-maintenance/DataEntry/account-cancel-stop-payment.js
 *
 * Parent wires: View → setMode('VIEW'), Edit → setMode('EDIT'), Save → saveData(), Cancel → cancelChanges()
 * GET uses GenericAccountRequest (AccountID + AccountTypeID required)
 * ADD/UPDATE use JsonElement (JS must send all fields incl OurBranchID, OperatorID)
 */
window.AccountCancelStopPaymentModule = (function () {
    'use strict';

    const state = {
        currentMode: 'NONE',    // NONE | ADD | EDIT | DELETE
        records: [],
        selectedIndex: -1,
        currentUpdateCount: 0
    };

    const API = {
        GET:    '/AccountsMaintenance/api/get-cancel-stop-payments',
        ADD:    '/AccountsMaintenance/api/add-cancel-stop-payment',
        UPDATE: '/AccountsMaintenance/api/update-cancel-stop-payment'
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
    function showMsg(msg, type) { const t = window.showSystemToast || window.parent?.showSystemToast; if (t) t(msg, { variant: type==='error'?'danger':type }); console.log(`[CancelStopPayment] ${type}: ${msg}`); }
    function isSuccess(r) { return r?.ResponseCode === '00' || r?.ResponseCode === 0; }

    function fmtDate(ds) {
        if (!ds) return '';
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleDateString(); } catch { return ds; }
    }
    function fmtDateTime(ds) {
        if (!ds) return '-';
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch { return ds; }
    }
    function fmtMoney(n) {
        const v = parseFloat(n || 0);
        return isNaN(v) ? '0.00' : v.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }
    function escHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    const EDITABLE = ['chequeNoStart', 'chequeNoEnd', 'chequeDate', 'chequeAmount', 'reasonId', 'reasonText', 'cancellationDate', 'instructionGivenBy'];
    const CLIENT   = ['clientId', 'clientName', 'productId', 'productName', 'address1', 'address2', 'city', 'country', 'phoneHome', 'phoneWork', 'faxNo', 'mobile'];

    // ── Mode management ────────────────────────────────────────
    function setActionBtn(action, enabled) {
        const btn = document.querySelector(`[data-action="${action}"]`);
        if (btn) { btn.disabled = !enabled; btn.style.opacity = enabled ? '1' : '0.5'; }
    }

    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD' || mode === 'EDIT' || mode === 'DELETE';

        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = !editing; });

        setActionBtn('view',   !editing);
        setActionBtn('add',    !editing);
        setActionBtn('edit',   !editing && state.selectedIndex >= 0);
        setActionBtn('save',   editing);
        setActionBtn('delete', !editing && state.selectedIndex >= 0);
        setActionBtn('cancel', editing);

        if (mode === 'ADD') { clearForm(); state.selectedIndex = -1; }
        console.log('[CancelStopPayment] Mode →', mode);
    }

    // ── Wire Events ────────────────────────────────────────────
    function wireEvents() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            if (btn._wired) return;
            btn._wired = true;
            const a = btn.getAttribute('data-action');
            if (a === 'view')   btn.addEventListener('click', () => { state.currentMode = 'NONE'; loadData(); });
            if (a === 'add')    btn.addEventListener('click', () => setMode('ADD'));
            if (a === 'edit')   btn.addEventListener('click', () => setMode('EDIT'));
            if (a === 'save')   btn.addEventListener('click', saveData);
            if (a === 'delete') btn.addEventListener('click', deleteData);
            if (a === 'cancel') btn.addEventListener('click', cancelChanges);
        });

        // Section toggles
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
                AccountID:     ctx.AccountID,
                AccountTypeID: 'C',
                OurBranchID:   ctx.OurBranchID,
                OperatorID:    ctx.OperatorID
            })
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            if (isSuccess(result)) {
                const d = result.Details;

                // Client info from Details01
                const client = d?.Details01?.[0] || {};
                populateClient(client);

                // Stop payment records from Details02
                state.records = d?.Details02 || (Array.isArray(d) ? d : []);
                renderGrid();

                const ctx2 = getContext();
                setVal('branchId', ctx2.OurBranchID);
                setVal('accountId', ctx2.AccountID);
                setText('branchName', client.BranchName || window.AccountMaintenanceState?.BranchName || '');
                setText('accountName', client.AccountName || window.AccountMaintenanceState?.AccountName || '');

                // Audit
                setText('CurrencyID',   client.CurrencyID || '-');
                setText('MakerID',      client.CreatedBy || client.MakerID || '-');
                setText('MakerDT',      fmtDateTime(client.CreatedOn || client.MakerDT));
                setText('SupervisorID', client.SupervisedBy || '-');
                setText('SupervisorDT', fmtDateTime(client.SupervisedOn));

                if (state.records.length > 0) {
                    selectItem(0);
                } else {
                    clearForm();
                }

                setActionBtn('edit', state.records.length > 0);
                setActionBtn('delete', state.records.length > 0);
                showMsg(result.ResponseMessage || 'Data loaded', 'success');
            } else {
                state.records = [];
                renderGrid();
                clearForm();
                showMsg(result?.ResponseMessage || 'No records found', 'warning');
            }
        })
        .catch(err => {
            showLoading(false);
            showMsg('Error loading data: ' + err.message, 'error');
        });
    }

    // ── Grid ───────────────────────────────────────────────────
    function renderGrid() {
        const tbody = el('stopPaymentGrid')?.querySelector('tbody');
        if (!tbody) return;

        if (state.records.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">No records found</td></tr>';
            return;
        }

        tbody.innerHTML = state.records.map((rec, idx) => `
            <tr class="grid-row ${idx === state.selectedIndex ? 'selected' : ''}" data-index="${idx}" style="cursor:pointer;">
                <td>${escHtml(rec.ChequePrefix || '')}</td>
                <td>${escHtml(rec.StartChequeID || rec.ChequeNoStart || '')}</td>
                <td>${escHtml(rec.EndChequeID || rec.ChequeNoEnd || '')}</td>
                <td>${fmtDate(rec.ChequeDate)}</td>
                <td>${escHtml(rec.CancelReason || rec.ReasonText || '')}</td>
                <td>${fmtDate(rec.CancelledDate || rec.CancellationDate)}</td>
                <td>${fmtMoney(rec.ChequeAmount)}</td>
                <td>${escHtml(rec.CancelledBy || rec.InstructionGivenBy || '')}</td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.grid-row').forEach(row => {
            row.addEventListener('click', () => selectItem(parseInt(row.dataset.index)));
        });
    }

    function selectItem(idx) {
        state.selectedIndex = idx;
        const rec = state.records[idx];
        if (rec) {
            populateForm(rec);
            setActionBtn('edit', true);
            setActionBtn('delete', true);
        }
        // Highlight
        el('stopPaymentGrid')?.querySelectorAll('.grid-row').forEach((row, i) => {
            row.classList.toggle('selected', i === idx);
        });
    }

    function populateForm(rec) {
        setVal('requestRef',        rec.RequestReferenceNo || rec.RequestRef || '');
        setVal('chequeNoStart',     rec.StartChequeID || rec.ChequeNoStart || '');
        setVal('chequeNoEnd',       rec.EndChequeID || rec.ChequeNoEnd || '');
        setVal('chequeDate',        rec.ChequeDate ? rec.ChequeDate.split('T')[0] : '');
        setVal('chequeAmount',      rec.ChequeAmount || '');
        setVal('reasonId',          rec.CancelReasonID || rec.ReasonId || '');
        setVal('reasonText',        rec.CancelReason || rec.ReasonText || '');
        setVal('cancellationDate',  rec.CancelledDate ? rec.CancelledDate.split('T')[0] : (rec.CancellationDate || ''));
        setVal('instructionGivenBy', rec.CancelledBy || rec.InstructionGivenBy || '');
        state.currentUpdateCount = parseInt(rec.UpdateCount || 0) || 0;
    }

    function populateClient(client) {
        CLIENT.forEach(id => {
            const key = id.charAt(0).toUpperCase() + id.slice(1);
            setText(id, client[key] || client[id] || '');
        });
    }

    // ── Save ───────────────────────────────────────────────────
    function saveData() {
        const startCh = val('chequeNoStart').trim();
        const endCh   = val('chequeNoEnd').trim();
        if (!startCh) { showMsg('Cheque No Start is required', 'warning'); return; }
        if (!endCh)   { showMsg('Cheque No End is required', 'warning'); return; }

        const ctx = getContext();
        const isAdd = state.currentMode === 'ADD';
        const payload = {
            OurBranchID:        ctx.OurBranchID,
            AccountTypeID:      'C',
            AccountID:          ctx.AccountID,
            OperatorID:         ctx.OperatorID,
            RequestReferenceNo: val('requestRef').trim(),
            StartChequeID:      startCh,
            EndChequeID:        endCh,
            ChequeDate:         val('chequeDate'),
            ChequeAmount:       val('chequeAmount') || '0',
            CancelReasonID:     val('reasonId'),
            CancelReason:       val('reasonText').trim(),
            CancelledBy:        val('instructionGivenBy').trim(),
            CancelledDate:      val('cancellationDate'),
            NewRecord:          isAdd ? 1 : 0,
            UpdateCount:        state.currentUpdateCount
        };

        showLoading(true);

        fetch(isAdd ? API.ADD : API.UPDATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            if (isSuccess(result)) {
                showMsg(result.ResponseMessage || 'Saved successfully', 'success');
                state.currentMode = 'NONE';
                loadData();
            } else {
                showMsg(result?.ResponseMessage || 'Save failed', 'error');
            }
        })
        .catch(err => {
            showLoading(false);
            showMsg('Save error: ' + err.message, 'error');
        });
    }

    // ── Delete ─────────────────────────────────────────────────
    function deleteData() {
        if (state.selectedIndex < 0) { showMsg('No record selected', 'warning'); return; }
        if (!confirm('Delete this record?')) return;

        const ctx = getContext();
        const rec = state.records[state.selectedIndex];
        showLoading(true);

        fetch(API.UPDATE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                OurBranchID:        ctx.OurBranchID,
                AccountTypeID:      'C',
                AccountID:          ctx.AccountID,
                OperatorID:         ctx.OperatorID,
                RequestReferenceNo: rec?.RequestReferenceNo || '',
                NewRecord:          -1
            })
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            if (isSuccess(result)) {
                showMsg(result.ResponseMessage || 'Deleted', 'success');
                loadData();
            } else {
                showMsg(result?.ResponseMessage || 'Delete failed', 'error');
            }
        })
        .catch(err => {
            showLoading(false);
            showMsg('Delete error: ' + err.message, 'error');
        });
    }

    // ── Cancel / Clear ─────────────────────────────────────────
    function cancelChanges() {
        if (state.selectedIndex >= 0 && state.records[state.selectedIndex]) {
            populateForm(state.records[state.selectedIndex]);
        } else {
            clearForm();
        }
        state.currentMode = 'NONE';
        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = true; });
        setActionBtn('view', true);
        setActionBtn('add', true);
        setActionBtn('edit', state.selectedIndex >= 0);
        setActionBtn('save', false);
        setActionBtn('delete', state.selectedIndex >= 0);
        setActionBtn('cancel', false);
    }

    function clearForm() {
        [...EDITABLE, 'requestRef'].forEach(id => setVal(id, ''));
        state.currentUpdateCount = 0;
    }

    // ── Init ───────────────────────────────────────────────────
    function init() {
        console.log('[CancelStopPayment] Initializing');
        wireEvents();

        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = true; });
        setActionBtn('save', false);
        setActionBtn('cancel', false);
        setActionBtn('edit', false);
        setActionBtn('delete', false);

        const ctx = getContext();
        setVal('branchId', ctx.OurBranchID);
        setVal('accountId', ctx.AccountID);

        if (ctx.AccountID) {
            setTimeout(() => loadData(), 300);
        }
    }

    return { init, setMode, saveData, cancelChanges, loadData };
})();

console.log('[CancelStopPayment] Module registered');
