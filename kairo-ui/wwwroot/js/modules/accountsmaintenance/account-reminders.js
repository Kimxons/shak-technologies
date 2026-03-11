/**
 * Account Reminders Module
 * Refactored to use AppCore.invokeControllerAsync and align with IApiService pattern.
 */
window.AccountRemindersModule = (function () {
    'use strict';

    const state = {
        currentMode: 'NONE',   // NONE | VIEW | ADD | EDIT | DELETE
        reminderData: null,     // last fetched reminder record
        currentUpdateCount: 0,
        lastLoadedReminderId: '',
        reminderLookupTimers: [],
        selectedLookupReminder: null,
        currentReminderId: 0,
        nextReminderId: 1
    };

    const API = {
        GET: 'AccountsMaintenance/api/get-account-reminders',
        ADD: 'AccountsMaintenance/api/add-account-reminder',
        UPDATE: 'AccountsMaintenance/api/update-account-reminder',
        DELETE: 'AccountsMaintenance/api/delete-account-reminder'
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

    function getCaseInsensitive(row, key) {
        if (!row || !key || typeof row !== 'object') return null;
        const matchedKey = Object.keys(row).find(prop => prop.toLowerCase() === key.toLowerCase());
        return matchedKey ? row[matchedKey] : null;
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

    function toRequestDate(ds) {
        const date = parseDisplayDate(ds);
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function parseDisplayDate(ds) {
        if (!ds) return null;
        const trimmed = String(ds).trim();
        if (!trimmed) return null;

        const direct = new Date(trimmed);
        if (!isNaN(direct.getTime())) return direct;

        const match = trimmed.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{4})$/);
        if (!match) return null;

        const monthMap = {
            Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5,
            Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11
        };

        const day = parseInt(match[1], 10);
        const month = monthMap[match[2]];
        const year = parseInt(match[3], 10);
        if (month == null) return null;

        const date = new Date(year, month, day);
        return isNaN(date.getTime()) ? null : date;
    }

    function toIsoDateValue(ds) {
        const date = ds instanceof Date ? ds : parseDisplayDate(ds);
        if (!date) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function fmtDateTime(ds) {
        if (!ds) return '-';
        try {
            const d = new Date(ds);
            return isNaN(d.getTime()) ? ds : d.toLocaleString();
        } catch { return ds; }
    }

    function normalizeReminderRecord(record) {
        if (!record || typeof record !== 'object') return null;

        const reminderId = getCaseInsensitive(record, 'ReminderID') || getCaseInsensitive(record, 'ReminderId') || getCaseInsensitive(record, 'RequestedReminderID');
        const reminderText = getCaseInsensitive(record, 'Reminder') || getCaseInsensitive(record, 'ReminderText') || getCaseInsensitive(record, 'Description');
        const colorId = getCaseInsensitive(record, 'ColorID') || getCaseInsensitive(record, 'ReminderColor');
        const priority = getCaseInsensitive(record, 'Priority') || getCaseInsensitive(record, 'PriorityID');
        const startDate = getCaseInsensitive(record, 'ReminderStartDate') || getCaseInsensitive(record, 'FromDate');
        const endDate = getCaseInsensitive(record, 'ReminderEndDate') || getCaseInsensitive(record, 'ToDate');

        if (reminderId == null && !reminderText && !startDate && !endDate) return null;

        return {
            ReminderID: reminderId || '',
            Reminder: reminderText || '',
            ColorID: colorId || '',
            Priority: priority || '',
            ReminderStartDate: startDate || '',
            ReminderEndDate: endDate || '',
            CreatedBy: getCaseInsensitive(record, 'CreatedBy') || getCaseInsensitive(record, 'MakerID') || '',
            CreatedOn: getCaseInsensitive(record, 'CreatedOn') || getCaseInsensitive(record, 'MakerDT') || '',
            SupervisedBy: getCaseInsensitive(record, 'SupervisedBy') || getCaseInsensitive(record, 'CheckerID') || '',
            SupervisedOn: getCaseInsensitive(record, 'SupervisedOn') || getCaseInsensitive(record, 'CheckerDT') || '',
            ModifiedBy: getCaseInsensitive(record, 'ModifiedBy') || getCaseInsensitive(record, 'ModifierID') || '',
            ModifiedOn: getCaseInsensitive(record, 'ModifiedOn') || getCaseInsensitive(record, 'ModifierDT') || '',
            UpdateCount: getCaseInsensitive(record, 'UpdateCount') || 0
        };
    }

    function hasReminderContent(rem) {
        if (!rem || typeof rem !== 'object') return false;
        return Boolean(
            rem.Reminder || rem.ReminderText || rem.ColorID || rem.ReminderColor ||
            rem.Priority || rem.PriorityID || rem.ReminderStartDate || rem.FromDate ||
            rem.ReminderEndDate || rem.ToDate
        );
    }

    function applyLookupReminder(row) {
        const normalized = normalizeReminderRecord(row);
        if (!normalized) return;

        state.selectedLookupReminder = normalized;

        if (normalized.ReminderID) {
            setVal('reminderId', normalized.ReminderID);
            state.lastLoadedReminderId = String(normalized.ReminderID);
            const numericId = parseInt(normalized.ReminderID, 10);
            if (!isNaN(numericId) && numericId > 0) {
                state.currentReminderId = numericId;
                state.nextReminderId = Math.max(state.nextReminderId, numericId + 1);
            }
        }

        if (normalized.Reminder) setVal('reminder', normalized.Reminder);
        if (normalized.ColorID) setVal('reminderColor', normalized.ColorID);
        if (normalized.Priority) setVal('reminderPriority', normalized.Priority);
        if (normalized.ReminderStartDate) setVal('fromDate', fmtDate(normalized.ReminderStartDate));
        if (normalized.ReminderEndDate) setVal('toDate', fmtDate(normalized.ReminderEndDate));
    }

    // ── Mode management ────────────────────────────────────────
    const EDITABLE = ['reminder', 'reminderColor', 'reminderPriority', 'fromDate', 'toDate'];
    const CLIENT = ['clientId', 'clientName', 'address1', 'address2', 'city', 'country', 'phoneHome', 'phoneWork', 'faxNo', 'mobile', 'emailId'];

    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD' || mode === 'EDIT';
        const reminderIdInput = el('reminderId');

        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = !editing; });
        ['fromDatePicker', 'toDatePicker'].forEach(id => { const b = el(id); if (b) b.disabled = !editing; });
        if (reminderIdInput) reminderIdInput.disabled = editing;

        // Lookup for reminder ID should be disabled while editing
        const lk = document.querySelector('[data-lookup="reminderId"]');
        if (lk) lk.disabled = editing;

        // Action panel updates are handled by the orchestrator, 
        // but we can set internal state and trigger UI updates if needed.
        console.log('[AccountReminders] Mode →', mode);

        if (mode === 'ADD') clearForm();
    }

    function updateReminderPointers(record, payload) {
        const requestedId = parseInt(payload?.RequestedReminderID || payload?.ReminderID || 0, 10);
        const currentId = parseInt(payload?.CurrentReminderID || 0, 10);
        const recordId = parseInt(record?.ReminderID || record?.ReminderId || 0, 10);
        const candidates = [requestedId, currentId, recordId].filter(id => !isNaN(id) && id > 0);
        const highestId = candidates.length ? Math.max(...candidates) : 0;

        if (recordId > 0) {
            state.currentReminderId = recordId;
        } else if (currentId > 0) {
            state.currentReminderId = currentId;
        } else if (requestedId > 0) {
            state.currentReminderId = requestedId;
        }

        state.nextReminderId = highestId > 0 ? highestId + 1 : Math.max(state.nextReminderId, 1);
    }

    // ── Load Data ──────────────────────────────────────────────
    async function loadData(options = {}) {
        const modeOnFound = options.modeOnFound || 'VIEW';
        const modeOnMissing = options.modeOnMissing || null;
        const skipAutoResolveCurrent = Boolean(options.skipAutoResolveCurrent);
        const ctx = getContext();
        const remId = val('reminderId');

        if (!ctx.AccountID || !ctx.OurBranchID) {
            showMsg('Please select an account first', 'warning');
            return;
        }

        try {
            const result = await AppCore.invokeControllerAsync(API.GET, {
                AccountID: ctx.AccountID,
                ReminderID: remId || null,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID,
                Direction: 0
            });

            const isOk = result && (result.success || result.Success || result.ResponseCode === '00');
            if (isOk) {
                const d = result.data || result.Details;

                const client = d?.CustomerDetails || d?.Details01?.[0] || d?.[0] || {};
                populateClient(client);

                let rem = null;
                if (hasReminderContent(d?.ReminderDetails)) rem = d.ReminderDetails;
                else if (d?.Details02?.[0]) rem = d.Details02[0];
                else if (Array.isArray(d) && d.length > 1) rem = d[1]; // fallback if not in DetailsXX
                else if (hasReminderContent(d)) rem = d;

                updateReminderPointers(rem, d);

                const autoResolveReminderId = parseInt(d?.CurrentReminderID || d?.RequestedReminderID || 0, 10);
                if (!remId && !skipAutoResolveCurrent && !hasReminderContent(rem) && autoResolveReminderId > 0) {
                    setVal('reminderId', autoResolveReminderId);
                    return loadData({
                        ...options,
                        skipAutoResolveCurrent: true,
                        modeOnFound: 'VIEW'
                    });
                }

                const selectedReminder = state.selectedLookupReminder && String(state.selectedLookupReminder.ReminderID || '') === String(remId || d?.RequestedReminderID || '')
                    ? state.selectedLookupReminder
                    : null;

                if (!hasReminderContent(rem) && selectedReminder) {
                    rem = selectedReminder;
                }

                if (rem) {
                    const normalized = normalizeReminderRecord(rem) || rem;
                    state.reminderData = normalized;
                    state.lastLoadedReminderId = String(normalized.ReminderID || normalized.ReminderId || remId || '');
                    state.currentUpdateCount = parseInt(normalized.UpdateCount || 0) || 0;
                    updateReminderPointers(normalized, d);
                    bindForm(normalized);
                    setMode(modeOnFound);
                    // showMsg('Reminder details loaded', 'success');
                } else {
                    state.reminderData = null;
                    state.lastLoadedReminderId = '';
                    if (remId) {
                        clearForm();
                        setMode(modeOnMissing || 'ADD');
                        showMsg('Reminder not found. You can add a new reminder.', 'warning');
                    }
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
        const normalized = normalizeReminderRecord(rem) || rem;
        setVal('reminderId', normalized.ReminderID || normalized.ReminderId || '');
        setVal('reminder', normalized.Reminder || normalized.ReminderText || '');
        setVal('reminderColor', normalized.ColorID || normalized.ReminderColor || '');
        setVal('reminderPriority', normalized.Priority || normalized.PriorityID || '');
        setVal('fromDate', fmtDate(normalized.ReminderStartDate || normalized.FromDate));
        setVal('toDate', fmtDate(normalized.ReminderEndDate || normalized.ToDate));

        // Audit
        setText('MakerID', normalized.CreatedBy || normalized.MakerID || '-');
        setText('MakerDT', fmtDateTime(normalized.CreatedOn || normalized.MakerDT));
        setText('CheckerID', normalized.SupervisedBy || normalized.CheckerID || '-');
        setText('CheckerDT', fmtDateTime(normalized.SupervisedOn || normalized.CheckerDT));
        setText('ModifierID', normalized.ModifiedBy || normalized.ModifierID || '-');
        setText('ModifierDT', fmtDateTime(normalized.ModifiedOn || normalized.ModifierDT));
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
        if (state.currentMode !== 'ADD' && state.currentMode !== 'EDIT') {
            showMsg('Select Add or Edit before entering reminder details', 'warning');
            return false;
        }
        const reminderText = val('reminder');
        if (!reminderText) {
            showMsg('Reminder text is required', 'warning');
            el('reminder')?.focus();
            return false;
        }

        const ctx = getContext();
        const isAdd = state.currentMode === 'ADD';
        const now = new Date();
        const timestamp = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

        const payload = {
            AccountID: ctx.AccountID,
            ReminderID: val('reminderId') || null,
            Reminder: reminderText,
            ColorID: val('reminderColor'),
            Priority: val('reminderPriority'),
            ReminderStartDate: toRequestDate(val('fromDate')),
            ReminderEndDate: toRequestDate(val('toDate')),
            OurBranchID: ctx.OurBranchID,
            OperatorID: ctx.OperatorID,
            CreatedBy: ctx.OperatorID,
            CreatedOn: timestamp,
            ModifiedBy: ctx.OperatorID,
            ModifiedOn: timestamp,
            SupervisedBy: ctx.OperatorID,
            SupervisedOn: timestamp,
            NewRecord: isAdd ? 1 : 0,
            UpdateCount: isAdd ? 0 : state.currentUpdateCount
        };

        try {
            const endpoint = isAdd ? API.ADD : API.UPDATE;
            const result = await AppCore.invokeControllerAsync(endpoint, payload);

            const isOk = result && (result.success || result.Success || result.ResponseCode === '00');
            if (isOk) {
                showMsg(result.message || result.ResponseMessage || 'Reminder saved successfully', 'success');
                setMode('NONE');
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

    // ── Delete ─────────────────────────────────────────────────
    async function deleteData() {
        const reminderId = val('reminderId');
        if (!reminderId) { showMsg('Please select a reminder to delete', 'warning'); return; }

        const confirmed = await AppCore.showConfirmation('Delete Reminder', 'Are you sure you want to delete this reminder?');
        if (!confirmed) return;

        const ctx = getContext();
        try {
            const result = await AppCore.invokeControllerAsync(API.DELETE, {
                AccountID: ctx.AccountID,
                ReminderID: reminderId,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID,
                NewRecord: 2
            });

            const isOk = result && (result.success || result.Success || result.ResponseCode === '00');
            if (isOk) {
                showMsg(result.message || result.ResponseMessage || 'Reminder deleted', 'success');
                state.reminderData = null;
                clearForm();
                loadData();
            } else {
                showMsg(result?.message || result?.ResponseMessage || 'Delete failed', 'error');
            }
        } catch (err) {
            showMsg('Delete error: ' + err.message, 'error');
        }
    }

    // ── Cancel / Clear ─────────────────────────────────────────
    function cancelChanges() {
        if (state.reminderData) {
            bindForm(state.reminderData);
            setMode('VIEW');
        } else {
            clearForm();
            setMode('ADD');
        }
    }

    function clearForm() {
        [...EDITABLE, 'reminderId'].forEach(id => setVal(id, ''));
        ['MakerID', 'MakerDT', 'CheckerID', 'CheckerDT', 'ModifierID', 'ModifierDT'].forEach(id => setText(id, '-'));
        state.reminderData = null;
        state.lastLoadedReminderId = '';
        state.currentUpdateCount = 0;
    }

    async function beginAdd() {
        const ctx = getContext();
        if (!ctx.AccountID || !ctx.OurBranchID) {
            showMsg('Please select an account first', 'warning');
            return;
        }

        state.selectedLookupReminder = null;
        await loadData({ modeOnFound: 'VIEW', modeOnMissing: null });

        const generatedId = Math.max(state.nextReminderId || 1, (state.currentReminderId || 0) + 1, 1);
        setMode('ADD');
        setVal('reminderId', generatedId);
        state.lastLoadedReminderId = '';
        state.currentUpdateCount = 0;
        el('reminder')?.focus();
    }

    function viewData() {
        return loadData({ modeOnFound: 'VIEW' });
    }

    function syncSelectedReminder() {
        const remId = val('reminderId');
        if (!remId || state.currentMode === 'ADD' || state.currentMode === 'EDIT') {
            return;
        }

        if (String(remId) === String(state.lastLoadedReminderId)) {
            return;
        }

        loadData({ modeOnFound: 'EDIT' });
    }

    function scheduleReminderSelectionSync() {
        state.reminderLookupTimers.forEach(window.clearTimeout);
        state.reminderLookupTimers = [300, 900, 1600].map((delay) => window.setTimeout(syncSelectedReminder, delay));
    }

    function openDatePicker(inputId) {
        const input = el(inputId);
        if (!input || input.disabled) return;

        const picker = document.createElement('input');
        picker.type = 'date';
        picker.value = toIsoDateValue(input.value);
        picker.style.position = 'fixed';
        picker.style.left = '-9999px';
        picker.style.opacity = '0';
        picker.style.pointerEvents = 'none';
        document.body.appendChild(picker);

        const cleanup = () => {
            picker.removeEventListener('change', onChange);
            picker.removeEventListener('blur', cleanup);
            if (picker.parentNode) picker.parentNode.removeChild(picker);
        };

        const onChange = () => {
            if (picker.value) {
                input.value = fmtDate(picker.value);
                input.dispatchEvent(new Event('change', { bubbles: true }));
                input.dispatchEvent(new Event('blur', { bubbles: true }));
            }
            cleanup();
        };

        picker.addEventListener('change', onChange);
        picker.addEventListener('blur', cleanup);
        picker.click();

        if (typeof picker.showPicker === 'function') {
            try { picker.showPicker(); } catch (_) { }
        }
    }

    function wireDatePickers() {
        el('fromDatePicker')?.addEventListener('click', (event) => {
            event.preventDefault();
            openDatePicker('fromDate');
        });

        el('toDatePicker')?.addEventListener('click', (event) => {
            event.preventDefault();
            openDatePicker('toDate');
        });
    }

    function handleLookupSelection(event) {
        const targetInputId = event?.detail?.targetInputId;
        if (String(targetInputId || '').toLowerCase() !== 'reminderid') return;

        const row = event.detail?.selectedRow;
        if (!row) return;

        applyLookupReminder(row);
        state.lastLoadedReminderId = '';
        syncSelectedReminder();
    }

    function wireReminderSelection() {
        const reminderIdInput = el('reminderId');
        const reminderLookupButton = document.querySelector('[data-lookup="reminderId"]');

        reminderIdInput?.addEventListener('change', syncSelectedReminder);
        reminderIdInput?.addEventListener('blur', syncSelectedReminder);
        reminderIdInput?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                syncSelectedReminder();
            }
        });

        reminderLookupButton?.addEventListener('click', scheduleReminderSelectionSync);
        document.addEventListener('kairo:lookup-selected', handleLookupSelection);
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

        wireReminderSelection();
        wireDatePickers();
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
        viewData,
        beginAdd,
        setMode,
        saveData,
        deleteData,
        cancelChanges
    };
})();

console.log('[AccountReminders] Module loaded');
