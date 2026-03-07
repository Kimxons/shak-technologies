/**
 * Account Reminders Module
 * Refactored to use AppCore.invokeControllerAsync and align with IApiService pattern.
 */
window.AccountRemindersModule = (function () {
    'use strict';

    const state = {
        currentMode: 'NONE',   // NONE | VIEW | ADD | EDIT | DELETE
        reminderData: null,     // last fetched reminder record
        currentUpdateCount: 0
    };

    const API = {
        GET: 'get-account-reminders',
        SAVE: 'save-account-reminder', // Handles both add and update in backend usually, or mapped in orchestrator
        ADD: 'add-account-reminder',
        UPDATE: 'update-account-reminder',
        DELETE: 'delete-account-reminder'
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
        console.log(`[AccountReminders] ${type}: ${msg}`);
    }

    function fmtDate(ds) {
        if (!ds) return '';
        try {
            const d = new Date(ds);
            if (isNaN(d.getTime())) return ds;
            const day = String(d.getDate()).padStart(2, '0');
            const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            return `${day}-${months[d.getMonth()]}-${d.getFullYear()}`;
        } catch { return ds; }
    }

    function fmtDateTime(ds) {
        if (!ds) return '-';
        try {
            const d = new Date(ds);
            return isNaN(d.getTime()) ? ds : d.toLocaleString();
        } catch { return ds; }
    }

    // ── Mode management ────────────────────────────────────────
    const EDITABLE = ['reminder', 'reminderColor', 'reminderPriority', 'fromDate', 'toDate'];
    const CLIENT = ['clientId', 'clientName', 'address1', 'address2', 'city', 'country', 'phoneHome', 'phoneWork', 'faxNo', 'mobile', 'emailId'];

    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD' || mode === 'EDIT';

        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = !editing; });
        ['fromDatePicker', 'toDatePicker'].forEach(id => { const b = el(id); if (b) b.disabled = !editing; });

        // Lookup for reminder ID should be disabled while editing
        const lk = document.querySelector('[data-lookup="reminderId"]');
        if (lk) lk.disabled = editing;

        // Action panel updates are handled by the orchestrator, 
        // but we can set internal state and trigger UI updates if needed.
        console.log('[AccountReminders] Mode →', mode);

        if (mode === 'ADD') clearForm();
    }

    // ── Load Data ──────────────────────────────────────────────
    async function loadData() {
        const ctx = getContext();
        const remId = val('reminderId');

        if (!ctx.AccountID || !ctx.OurBranchID) {
            showMsg('Please select an account first', 'warning');
            return;
        }

        try {
            const result = await AppCore.invokeControllerAsync('AccountsMaintenance', API.GET, {
                AccountID: ctx.AccountID,
                ReminderID: remId || 0,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID,
                Direction: 0
            });

            if (result && result.success) {
                const d = result.data || result.Details;

                // Details often contains Details01 (Client) and Details02 (Reminders)
                const client = d?.Details01?.[0] || d?.[0] || {};
                populateClient(client);

                let rem = null;
                if (d?.Details02?.[0]) rem = d.Details02[0];
                else if (Array.isArray(d) && d.length > 1) rem = d[1]; // fallback if not in DetailsXX
                else if (d && !d.Details01 && !Array.isArray(d)) rem = d;

                if (rem) {
                    state.reminderData = rem;
                    state.currentUpdateCount = parseInt(rem.UpdateCount || 0) || 0;
                    bindForm(rem);
                    // showMsg('Reminder details loaded', 'success');
                } else {
                    state.reminderData = null;
                    if (remId) showMsg('Reminder not found', 'warning');
                }

                // Ensure identification fields are correct
                setVal('branchId', ctx.OurBranchID);
                setVal('accountId', ctx.AccountID);
                setText('branchName', client.BranchName || window.AccountMaintenanceState?.BranchName || '');
                setText('accountName', client.AccountName || window.AccountMaintenanceState?.AccountName || '');

            } else {
                showMsg(result?.message || 'Failed to load reminder data', 'error');
            }
        } catch (err) {
            showMsg('Error loading reminders: ' + err.message, 'error');
        }
    }

    function bindForm(rem) {
        setVal('reminderId', rem.ReminderID || rem.ReminderId || '');
        setVal('reminder', rem.Reminder || rem.ReminderText || '');
        setVal('reminderColor', rem.ColorID || rem.ReminderColor || '');
        setVal('reminderPriority', rem.Priority || rem.PriorityID || '');
        setVal('fromDate', fmtDate(rem.ReminderStartDate || rem.FromDate));
        setVal('toDate', fmtDate(rem.ReminderEndDate || rem.ToDate));

        // Audit
        setText('MakerID', rem.CreatedBy || rem.MakerID || '-');
        setText('MakerDT', fmtDateTime(rem.CreatedOn || rem.MakerDT));
        setText('CheckerID', rem.SupervisedBy || rem.CheckerID || '-');
        setText('CheckerDT', fmtDateTime(rem.SupervisedOn || rem.CheckerDT));
        setText('ModifierID', rem.ModifiedBy || rem.ModifierID || '-');
        setText('ModifierDT', fmtDateTime(rem.ModifiedOn || rem.ModifierDT));
    }

    function populateClient(client) {
        CLIENT.forEach(id => {
            const key = id.charAt(0).toUpperCase() + id.slice(1);
            // Try different case variations common in the API
            const value = client[key] || client[id] || client[id.toLowerCase()] || '-';
            setText(id, value);
        });
    }

    // ── Save ───────────────────────────────────────────────────
    async function saveData() {
        const reminderText = val('reminder');
        if (!reminderText) {
            showMsg('Reminder text is required', 'warning');
            el('reminder')?.focus();
            return false;
        }

        const ctx = getContext();
        const isAdd = state.currentMode === 'ADD';

        const payload = {
            AccountID: ctx.AccountID,
            ReminderID: isAdd ? 0 : (parseInt(val('reminderId')) || 0),
            Reminder: reminderText,
            ColorID: val('reminderColor'),
            Priority: val('reminderPriority'),
            ReminderStartDate: val('fromDate'),
            ReminderEndDate: val('toDate'),
            OurBranchID: ctx.OurBranchID,
            OperatorID: ctx.OperatorID,
            NewRecord: isAdd ? 1 : state.currentUpdateCount
        };

        try {
            const endpoint = isAdd ? API.ADD : API.UPDATE;
            const result = await AppCore.invokeControllerAsync('AccountsMaintenance', endpoint, payload);

            if (result && result.success) {
                showMsg(result.message || 'Reminder saved successfully', 'success');
                setMode('NONE');
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

    // ── Delete ─────────────────────────────────────────────────
    async function deleteData() {
        const reminderId = val('reminderId');
        if (!reminderId) { showMsg('Please select a reminder to delete', 'warning'); return; }

        if (!confirm('Are you sure you want to delete this reminder?')) return;

        const ctx = getContext();
        try {
            const result = await AppCore.invokeControllerAsync('AccountsMaintenance', API.DELETE, {
                AccountID: ctx.AccountID,
                ReminderID: parseInt(reminderId),
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID,
                NewRecord: 0
            });

            if (result && result.success) {
                showMsg(result.message || 'Reminder deleted', 'success');
                state.reminderData = null;
                clearForm();
                loadData();
            } else {
                showMsg(result?.message || 'Delete failed', 'error');
            }
        } catch (err) {
            showMsg('Delete error: ' + err.message, 'error');
        }
    }

    // ── Cancel / Clear ─────────────────────────────────────────
    function cancelChanges() {
        if (state.reminderData) {
            bindForm(state.reminderData);
        } else {
            clearForm();
        }
        setMode('NONE');
    }

    function clearForm() {
        [...EDITABLE, 'reminderId'].forEach(id => setVal(id, ''));
        ['MakerID', 'MakerDT', 'CheckerID', 'CheckerDT', 'ModifierID', 'ModifierDT'].forEach(id => setText(id, '-'));
        state.currentUpdateCount = 0;
    }

    // ── Initialization ─────────────────────────────────────────
    function init() {
        console.log('[AccountReminders] Initializing submodule');

        // Setup UI state
        setMode('NONE');

        // Pre-populate identification if possible
        const ctx = getContext();
        setVal('branchId', ctx.OurBranchID);
        setVal('accountId', ctx.AccountID);
        setText('branchName', window.AccountMaintenanceState?.BranchName || '');
        setText('accountName', window.AccountMaintenanceState?.AccountName || '');

        // If we have an account, load basic info (like client details)
        if (ctx.AccountID && ctx.OurBranchID) {
            loadData();
        }

        // Wire section toggles if they exist
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
        init,
        loadData,
        setMode,
        saveData,
        deleteData,
        cancelChanges
    };
})();

console.log('[AccountReminders] Module loaded');
