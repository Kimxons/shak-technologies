/**
 * Account Notification Module
 * Migrated from: public/modules/account-maintenance/DataEntry/account-notification.js
 *
 * Button pattern (mirrors old JS setViewMode / setEditMode):
 *   VIEW MODE  → Edit enabled, Save disabled, Cancel disabled, fields disabled, checkboxes disabled
 *   EDIT MODE  → Edit disabled, Save enabled, Cancel enabled, fields enabled, checkboxes enabled
 */
window.AccountNotificationModule = (function () {
    'use strict';

    /* ── State ───────────────────────────────────────────────── */
    let loadedNotifications = [];
    let isEditing = false;

    /* ── API Routes ──────────────────────────────────────────── */
    const API = {
        GET:    'AccountsMaintenance/api/get-account-notification',
        UPDATE: 'AccountsMaintenance/api/update-account-notification'
    };

    /* ── Context ─────────────────────────────────────────────── */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID:  ps?.AccountID  || sessionStorage.getItem('currentAccountID')  || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID')  || localStorage.getItem('OperatorID') || 'SYSTEM',
            ProductID:  ps?.ProductID  || sessionStorage.getItem('currentProductID')   || 'null'
        };
    }

    /* ── UI Helpers ──────────────────────────────────────────── */
    function el(id) { return document.getElementById(id); }
    function val(id) { const e = el(id); return e ? e.value : ''; }
    function setVal(id, v) {
        const e = el(id);
        if (!e) return;
        const s = (v == null) ? '' : String(v);
        if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT') {
            if (e.value !== s) e.value = s;
        } else {
            if (e.textContent !== s) e.textContent = s;
        }
    }

    function showLoading(show) {
        const o = el('loadingOverlay');
        if (o) o.hidden = !show;
    }

    function showMsg(msg, type) {
        if (typeof window.showSystemToast === 'function') {
            window.showSystemToast(msg, { variant: type === 'error' ? 'danger' : type });
        }
        console.log('[AccountNotification] ' + type + ': ' + msg);
    }

    function isSuccess(r) {
        if (!r) return false;
        if (r.Success === true) return true;
        const d = r.Data || r.data || r;
        const code = d?.ResponseCode ?? d?.responseCode ?? d?.Status;
        if (code === undefined || code === null) return true; // no code = assume ok
        const s = String(code).trim();
        return s === '' || s === '00' || s === '0' || s.toLowerCase() === 'ok' || s.toLowerCase() === 'success';
    }

    function fmtDateTime(ds) {
        if (!ds) return '-';
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch (e) { return ds; }
    }

    function formatDateForInput(ds) {
        if (!ds) return '';
        try {
            const d = new Date(ds);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().slice(0, 10);
        } catch (e) { return ''; }
    }

    function escapeXml(str) {
        return String(str || '')
            .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    /* ── Button state — mirrors old setViewMode / setEditMode ── */
    function setViewMode() {
        isEditing = false;
        const editB   = el('submoduleBtnEdit');
        const saveB   = el('submoduleBtnSave');
        const cancelB = el('submoduleBtnCancel');

        if (editB)   editB.disabled   = false;  // always enabled in view mode
        if (saveB)   saveB.disabled   = true;
        if (cancelB) cancelB.disabled = true;

        // Disable form fields and checkboxes
        ['frequency', 'dayOfMonth', 'executionDate'].forEach(id => {
            const e = el(id);
            if (e) e.disabled = true;
        });
        setCheckboxesEnabled(false);
        renderGrid();
        console.log('[AccountNotification] → VIEW MODE');
    }

    function setEditMode() {
        isEditing = true;
        const editB   = el('submoduleBtnEdit');
        const saveB   = el('submoduleBtnSave');
        const cancelB = el('submoduleBtnCancel');

        if (editB)   editB.disabled   = true;
        if (saveB)   saveB.disabled   = false;
        if (cancelB) cancelB.disabled = false;

        // Enable form fields and checkboxes
        ['frequency', 'dayOfMonth', 'executionDate'].forEach(id => {
            const e = el(id);
            if (e) e.disabled = false;
        });
        setCheckboxesEnabled(true);
        renderGrid();
        console.log('[AccountNotification] → EDIT MODE');
    }

    /* ── Checkbox helpers ────────────────────────────────────── */
    function setCheckboxesEnabled(enabled) {
        const selectAllCb = el('selectAll');
        if (selectAllCb) selectAllCb.disabled = !enabled;
        document.querySelectorAll('#notificationsTable .notification-checkbox')
            .forEach(cb => cb.disabled = !enabled);
    }

    /* ── Render grid ─────────────────────────────────────────── */
    function renderGrid() {
        const tbody = document.querySelector('#notificationsTable tbody');
        const countSpan = el('recordCount');
        const selectAllCb = el('selectAll');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (countSpan) countSpan.textContent = loadedNotifications.length + ' records';

        if (loadedNotifications.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="4">No notifications found.</td></tr>';
            if (selectAllCb) selectAllCb.disabled = true;
            return;
        }

        if (selectAllCb) selectAllCb.disabled = !isEditing;

        loadedNotifications.forEach((item, index) => {
            const isChecked = item.IsSelected === 1 || item.IsSelected === true || item.IsSelected === '1';
            const row = document.createElement('tr');
            row.innerHTML =
                `<td><input type="checkbox" class="notification-checkbox" data-index="${index}" aria-label="Select notification" ${isChecked ? 'checked' : ''} ${isEditing ? '' : 'disabled'} /></td>` +
                `<td>${item.NotificationID || item.notificationId || '-'}</td>` +
                `<td>${item.NotificationType || item.notificationType || '-'}</td>` +
                `<td>${item.NotificationMessage || item.notificationMessage || '-'}</td>`;
            tbody.appendChild(row);
        });

        if (selectAllCb) {
            selectAllCb.checked = false;
            selectAllCb.onchange = function () {
                tbody.querySelectorAll('.notification-checkbox').forEach(cb => cb.checked = selectAllCb.checked);
            };
        }
    }

    /* ── Populate audit fields ───────────────────────────────── */
    function populateAudit(notifications) {
        if (notifications && notifications.length > 0) {
            const n = notifications[0];
            setVal('ModifierID', n.ModifiedBy || '-');
            setVal('ModifierDT', fmtDateTime(n.ModifiedOn));
            setVal('MakerID',    n.CreatedBy  || '-');
            setVal('MakerDT',    fmtDateTime(n.CreatedOn));
            setVal('CheckerID',  n.CheckedBy  || n.SupervisedBy || '-');
            setVal('CheckerDT',  fmtDateTime(n.CheckedOn || n.SupervisedOn));
        } else {
            ['ModifierID','ModifierDT','MakerID','MakerDT','CheckerID','CheckerDT']
                .forEach(id => setVal(id, '-'));
        }
    }

    /* ── Populate header fields from first notification ─────── */
    function populateHeader(notifications) {
        if (notifications && notifications.length > 0) {
            const n = notifications[0];
            setVal('frequency',     n.NotificationFrequency || n.Frequency || '');
            setVal('dayOfMonth',    n.NotificationDuration  || n.NoOfDays  || '');
            setVal('executionDate', formatDateForInput(n.ExecutionDate || ''));
        } else {
            setVal('frequency', '');
            setVal('dayOfMonth', '');
            setVal('executionDate', '');
        }
    }

    /* ── Load notifications ──────────────────────────────────── */
    async function loadNotifications() {
        const ctx = getContext();
        if (!ctx.AccountID) {
            showMsg('No Account selected.', 'warning');
            setViewMode();
            return;
        }

        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.GET, {
                AccountID:    ctx.AccountID,
                ModuleID:     2091,
                AccountTypeID: ctx.ProductID || 'null'   // controller maps this to ProductID for the SP
            });
            showLoading(false);

            // Mirror old JS — check every known response shape
            let data = [];
            if (result) {
                const d = result.Data || result.data || result;
                if      (d?.Details01 && Array.isArray(d.Details01) && d.Details01.length > 0) data = d.Details01;
                else if (d?.Details02 && Array.isArray(d.Details02) && d.Details02.length > 0) data = d.Details02;
                else if (d?.Details   && Array.isArray(d.Details)   && d.Details.length   > 0) data = d.Details;
                else if (Array.isArray(d)                            && d.length           > 0) data = d;
                else if (Array.isArray(result.Details01))                                       data = result.Details01;
                else if (Array.isArray(result.Details))                                         data = result.Details;
            }

            loadedNotifications = data;   // keep all rows — no filter
            populateHeader(loadedNotifications);
            populateAudit(loadedNotifications);
            renderGrid();
            console.log('[AccountNotification] Loaded', loadedNotifications.length, 'notifications');
        } catch (err) {
            showLoading(false);
            showMsg('Error loading notifications: ' + err.message, 'error');
        } finally {
            setViewMode();
        }
    }

    /* ── Save ────────────────────────────────────────────────── */
    async function saveData() {
        const frequency = val('frequency');
        if (!frequency) {
            showMsg('Notification Frequency is required.', 'warning');
            el('frequency')?.focus();
            return;
        }

        const checkboxes = document.querySelectorAll('#notificationsTable .notification-checkbox');
        const anySelected = Array.from(checkboxes).some(cb => cb.checked);
        if (checkboxes.length > 0 && !anySelected) {
            showMsg('Please select at least one notification to save.', 'warning');
            return;
        }

        const executionDateRaw = val('executionDate').trim();
        let formattedExecutionDate = '';
        if (executionDateRaw) {
            const parsed = new Date(executionDateRaw);
            if (isNaN(parsed.getTime())) {
                showMsg('Execution Date is not a valid date.', 'warning');
                el('executionDate')?.focus();
                return;
            }
            formattedExecutionDate = parsed.toISOString().split('.')[0];
        }

        const ctx = getContext();
        const duration = val('dayOfMonth').trim();

        const notificationsToSave = loadedNotifications.map((notification, index) => {
            const cb = checkboxes[index];
            return {
                ...notification,
                IsSelected:            cb ? (cb.checked ? 1 : 0) : (notification.IsSelected || 0),
                NotificationFrequency: frequency,
                NotificationDuration:  duration || '0',
                ExecutionDate:         formattedExecutionDate,
                ButtonMark:            'A'
            };
        });

        const xmlData = notificationsToSave.map(n =>
            `<dt_NotificationFormat>` +
            `<NotificationID>${escapeXml(n.NotificationID || '')}</NotificationID>` +
            `<NotificationType>${escapeXml(n.NotificationType || '')}</NotificationType>` +
            `<NotificationMessage>${escapeXml(n.NotificationMessage || '')}</NotificationMessage>` +
            `<IsSelected>${n.IsSelected}</IsSelected>` +
            `<IsEditable>${n.IsEditable ? 1 : 0}</IsEditable>` +
            `<ProductLevel>${n.ProductLevel ? 1 : 0}</ProductLevel>` +
            `<NotificationFrequency>${escapeXml(n.NotificationFrequency)}</NotificationFrequency>` +
            `<NotificationDuration>${escapeXml(n.NotificationDuration)}</NotificationDuration>` +
            `<ExecutionDate>${escapeXml(n.ExecutionDate)}</ExecutionDate>` +
            `<ButtonMark>${n.ButtonMark}</ButtonMark>` +
            `</dt_NotificationFormat>`
        ).join('');

        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.UPDATE, {
                AccountID:   ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID:  ctx.OperatorID,
                ProductID:   ctx.ProductID,
                XMLData:     xmlData
            });
            showLoading(false);
            if (isSuccess(result)) {
                showMsg(result?.Data?.ResponseMessage || result?.ResponseMessage || 'Notifications saved successfully.', 'success');
                await loadNotifications();
            } else {
                const msg = result?.Data?.ResponseMessage || result?.ResponseMessage || result?.Message || 'Save failed.';
                showMsg(msg, 'error');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Save error: ' + err.message, 'error');
        }
    }

    /* ── Cancel ──────────────────────────────────────────────── */
    function cancelChanges() {
        populateHeader(loadedNotifications);
        renderGrid();
        setViewMode();
    }

    /* ── Section toggles ─────────────────────────────────────── */
    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(function (header) {
            if (header._wiredActNotif) return;
            header._wiredActNotif = true;
            header.addEventListener('click', function (e) {
                if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;
                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const toggleBtn = section?.querySelector('.section-toggle-btn');
                const icon = toggleBtn?.querySelector('i');
                if (!content) return;
                const isOpen = content.style.display !== 'none';
                content.style.display = isOpen ? 'none' : '';
                if (icon) {
                    icon.classList.toggle('bi-chevron-up', !isOpen);
                    icon.classList.toggle('bi-chevron-down', isOpen);
                }
                if (toggleBtn) toggleBtn.setAttribute('aria-expanded', String(!isOpen));
            });
        });
    }

    /* ── Init (called by parent after buttons are in DOM) ────── */
    async function init() {
        console.log('[AccountNotification] Initializing');
        wireSectionToggles();
        setViewMode();        // set button states first — buttons exist at this point
        await loadNotifications();
    }

    /* ── Public API ──────────────────────────────────────────── */
    return {
        init:          init,
        navigate:      loadNotifications,
        loadData:      loadNotifications,
        confirmEdit:   setEditMode,
        saveData:      saveData,
        confirmCancel: cancelChanges,
        cancelChanges: cancelChanges
    };
})();

console.log('[AccountNotification] Module registered');
