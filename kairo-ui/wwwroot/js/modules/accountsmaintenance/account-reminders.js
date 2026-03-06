/**
 * Account Reminders Module
 * Matches original: public/modules/account-maintenance/DataEntry/account-reminders.js
 *
 * Parent wires: View → setMode('VIEW'), Edit → setMode('EDIT'), Save → saveData(), Cancel → cancelChanges()
 * DTOs: AccountID, ReminderID, Reminder, ColorID, Priority, ReminderStartDate, ReminderEndDate, NewRecord/UpdateCount
 */
window.AccountRemindersModule = (function () {
    'use strict';

    const state = {
        currentMode: 'NONE',   // NONE | VIEW | ADD | EDIT | DELETE
        reminderData: null,     // last fetched reminder record
        currentUpdateCount: 0
    };

    const API = {
        GET:    '/AccountsMaintenance/api/get-account-reminders',
        ADD:    '/AccountsMaintenance/api/add-account-reminder',
        UPDATE: '/AccountsMaintenance/api/update-account-reminder',
        DELETE: '/AccountsMaintenance/api/delete-account-reminder'
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
    function showMsg(msg, type) { const t = window.showSystemToast || window.parent?.showSystemToast; if (t) t(msg, { variant: type==='error'?'danger':type }); console.log(`[AccountReminders] ${type}: ${msg}`); }
    function isSuccess(r) { return r?.ResponseCode === '00' || r?.ResponseCode === 0; }

    function fmtDate(ds) {
        if (!ds) return '';
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleDateString(); } catch { return ds; }
    }
    function fmtDateTime(ds) {
        if (!ds) return '-';
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch { return ds; }
    }

    // ── Mode management ────────────────────────────────────────
    const EDITABLE = ['reminder', 'reminderColor', 'reminderPriority', 'fromDate', 'toDate'];
    const CLIENT   = ['clientId', 'clientName', 'address1', 'address2', 'city', 'country', 'phoneHome', 'phoneWork', 'faxNo', 'mobile', 'emailId'];

    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD' || mode === 'EDIT';

        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = !editing; });
        ['fromDatePicker', 'toDatePicker'].forEach(id => { const b = el(id); if (b) b.disabled = !editing; });

        // Lookup for reminder ID
        const lk = document.querySelector('[data-lookup="reminderId"]');
        if (lk) lk.disabled = editing;

        // Action button states
        setActionBtn('view',   !editing);
        setActionBtn('add',    !editing);
        setActionBtn('edit',   !editing && !!state.reminderData);
        setActionBtn('save',   editing);
        setActionBtn('delete', !editing && !!state.reminderData);
        setActionBtn('cancel', editing);

        if (mode === 'ADD') clearForm();
        if (mode === 'VIEW' || mode === 'NONE') loadData();
        console.log('[AccountReminders] Mode →', mode);
    }

    function setActionBtn(action, enabled) {
        const btn = document.querySelector(`[data-action="${action}"]`);
        if (btn) { btn.disabled = !enabled; btn.style.opacity = enabled ? '1' : '0.5'; }
    }

    // ── Wire Events ────────────────────────────────────────────
    function wireEvents() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            if (btn._wired) return;
            btn._wired = true;
            const a = btn.getAttribute('data-action');
            if (a === 'view')   btn.addEventListener('click', () => setMode('VIEW'));
            if (a === 'add')    btn.addEventListener('click', () => setMode('ADD'));
            if (a === 'edit')   btn.addEventListener('click', () => setMode('EDIT'));
            if (a === 'save')   btn.addEventListener('click', saveData);
            if (a === 'delete') btn.addEventListener('click', deleteData);
            if (a === 'cancel') btn.addEventListener('click', cancelChanges);
        });

        // Date pickers
        ['fromDate', 'toDate'].forEach(inputId => {
            const btn = el(inputId + 'Picker');
            if (!btn || btn._wired) return;
            btn._wired = true;
            btn.addEventListener('click', () => {
                const input = el(inputId);
                if (!input || input.disabled) return;
                const picker = document.createElement('input');
                picker.type = 'date';
                picker.style.cssText = 'position:absolute;opacity:0;pointer-events:none;';
                document.body.appendChild(picker);
                picker.addEventListener('change', () => { if (picker.value) input.value = fmtDate(picker.value + 'T00:00:00'); picker.remove(); });
                picker.showPicker ? picker.showPicker() : picker.click();
            });
        });

        // Section toggles
        document.querySelectorAll('[data-section-toggle]').forEach(hdr => {
            if (hdr._wired) return;
            hdr._wired = true;
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

    // ── Load Data ──────────────────────────────────────────────
    function loadData() {
        const ctx = getContext();
        const remId = val('reminderId').trim();
        showLoading(true);

        fetch(API.GET, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AccountID: ctx.AccountID,
                ReminderID: remId || null,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID
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

                // Reminder from Details02
                let rem = null;
                if (d?.Details02?.[0]) rem = d.Details02[0];
                else if (Array.isArray(d) && d[0]) rem = d[0];
                else if (d && typeof d === 'object' && !d.Details01) rem = d;

                if (rem) {
                    state.reminderData = rem;
                    state.currentUpdateCount = parseInt(rem.UpdateCount || 0) || 0;
                    bindForm(rem);
                    showMsg(result.ResponseMessage || 'Reminder loaded', 'success');
                } else {
                    state.reminderData = null;
                    showMsg('No reminder data found', 'warning');
                }

                // Account identification
                setVal('branchId', ctx.OurBranchID);
                setVal('accountId', ctx.AccountID);
                setText('branchName', client.BranchName || window.AccountMaintenanceState?.BranchName || '');
                setText('accountName', client.AccountName || window.AccountMaintenanceState?.AccountName || '');

                setActionBtn('edit', !!state.reminderData);
                setActionBtn('delete', !!state.reminderData);
            } else {
                state.reminderData = null;
                showMsg(result?.ResponseMessage || 'No reminders found', 'warning');
            }
        })
        .catch(err => {
            showLoading(false);
            showMsg('Error loading reminders: ' + err.message, 'error');
        });
    }

    function bindForm(rem) {
        setVal('reminderId',       rem.ReminderID || rem.ReminderId || '');
        setVal('reminder',         rem.Reminder || rem.ReminderText || '');
        setVal('reminderColor',    rem.ColorID || rem.ReminderColor || '');
        setVal('reminderPriority', rem.Priority || rem.PriorityID || '');
        setVal('fromDate',         fmtDate(rem.ReminderStartDate || rem.FromDate));
        setVal('toDate',           fmtDate(rem.ReminderEndDate || rem.ToDate));

        // Audit
        setText('MakerID',    rem.CreatedBy || rem.MakerID || '-');
        setText('MakerDT',    fmtDateTime(rem.CreatedOn || rem.MakerDT));
        setText('CheckerID',  rem.SupervisedBy || rem.CheckerID || '-');
        setText('CheckerDT',  fmtDateTime(rem.SupervisedOn || rem.CheckerDT));
        setText('ModifierID', rem.ModifiedBy || rem.ModifierID || '-');
        setText('ModifierDT', fmtDateTime(rem.ModifiedOn || rem.ModifierDT));
    }

    function populateClient(client) {
        CLIENT.forEach(id => {
            const key = id.charAt(0).toUpperCase() + id.slice(1);
            setText(id, client[key] || client[id] || '-');
        });
    }

    // ── Save ───────────────────────────────────────────────────
    function saveData() {
        const reminderText = val('reminder').trim();
        if (!reminderText) { showMsg('Reminder text is required', 'warning'); el('reminder')?.focus(); return; }

        const ctx = getContext();
        const isAdd = state.currentMode === 'ADD';
        const payload = {
            AccountID:        ctx.AccountID,
            ReminderID:       isAdd ? null : (val('reminderId').trim() || null),
            Reminder:         reminderText,
            ColorID:          val('reminderColor').trim() || null,
            Priority:         val('reminderPriority').trim() || null,
            ReminderStartDate: val('fromDate').trim() || null,
            ReminderEndDate:   val('toDate').trim() || null,
            OurBranchID:      ctx.OurBranchID,
            OperatorID:       ctx.OperatorID
        };

        if (isAdd) {
            payload.NewRecord = 1;
        } else {
            payload.UpdateCount = state.currentUpdateCount || 0;
        }

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
                showMsg(result.ResponseMessage || 'Reminder saved', 'success');
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
        if (!state.reminderData) { showMsg('No reminder selected', 'warning'); return; }
        if (!confirm('Delete this reminder?')) return;

        const ctx = getContext();
        showLoading(true);

        fetch(API.DELETE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AccountID:   ctx.AccountID,
                ReminderID:  val('reminderId').trim() || state.reminderData?.ReminderID,
                OurBranchID: ctx.OurBranchID,
                OperatorID:  ctx.OperatorID
            })
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            if (isSuccess(result)) {
                showMsg(result.ResponseMessage || 'Reminder deleted', 'success');
                state.reminderData = null;
                clearForm();
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
        if (state.reminderData) bindForm(state.reminderData);
        state.currentMode = 'NONE';
        setActionBtn('view', true);
        setActionBtn('add', true);
        setActionBtn('edit', !!state.reminderData);
        setActionBtn('save', false);
        setActionBtn('delete', !!state.reminderData);
        setActionBtn('cancel', false);
        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = true; });
    }

    function clearForm() {
        [...EDITABLE, 'reminderId'].forEach(id => setVal(id, ''));
        ['MakerID', 'MakerDT', 'CheckerID', 'CheckerDT', 'ModifierID', 'ModifierDT'].forEach(id => setText(id, '-'));
        state.currentUpdateCount = 0;
    }

    // ── Init ───────────────────────────────────────────────────
    function init() {
        console.log('[AccountReminders] Initializing');
        wireEvents();

        const ctx = getContext();
        setVal('branchId', ctx.OurBranchID);
        setVal('accountId', ctx.AccountID);
        setText('branchName', window.AccountMaintenanceState?.BranchName || '');
        setText('accountName', window.AccountMaintenanceState?.AccountName || '');

        // Disable all editable fields initially
        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = true; });
        setActionBtn('save', false);
        setActionBtn('cancel', false);
        setActionBtn('edit', false);
        setActionBtn('delete', false);

        if (ctx.AccountID) {
            setTimeout(() => loadData(), 300);
        }
    }

    return { init, setMode, saveData, cancelChanges, loadData };
})();

console.log('[AccountReminders] Module registered');
