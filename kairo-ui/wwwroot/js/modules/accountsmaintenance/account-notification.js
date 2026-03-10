/**
 * Account Notification Module
 * Migrated from: public/modules/account-maintenance/DataEntry/account-notification.js
 *
 * Parent wires via updateActionPanelForSubmodule:
 *   ADD → setMode('ADD'), EDIT → setMode('EDIT'), VIEW → setMode('VIEW') (via loadData),
 *   DELETE → deleteData(), SAVE → saveData(), CANCEL → cancelChanges(), CLOSE → closeSubmodule()
 */
window.AccountNotificationModule = (function () {
    'use strict';

    /* ── State ─────────────────────────────────────────────── */
    const state = {
        editMode: 'NONE',   // NONE | ADD | EDIT | DELETE
        notifications: [],
        selectedIndex: -1,
        operatorID: null
    };

    /* ── API Routes (Standard MVC Controller Routes) ────────── */
    const API = {
        GET: 'AccountsMaintenance/api/get-account-notification',
        ADD: 'AccountsMaintenance/api/add-account-notification',
        UPDATE: 'AccountsMaintenance/api/update-account-notification',
        DELETE: 'AccountsMaintenance/api/delete-account-notification'
    };

    /* ── Context ────────────────────────────────────────────── */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID: ps?.AccountID || sessionStorage.getItem('currentAccountID') || '',
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

    function fmtDateTime(ds) {
        if (!ds) return '-';
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch (e) { return ds; }
    }

    // Attempt to format a date to HTML5 native input Date format (YYYY-MM-DD)
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

    /* ── Editable fields ─────────────────────────────────────── */
    const EDITABLE = ['frequency', 'dayOfMonth', 'executionDate'];
    const AUDIT = ['MakerID', 'MakerDT', 'ModifierID', 'ModifierDT', 'CheckerID', 'CheckerDT'];

    function setFieldsEditable(editable) {
        EDITABLE.forEach(function (id) {
            var e = el(id);
            if (e) e.disabled = !editable;
        });
    }

    /* ── Mode Management (button states via parent IDs) ──────── */
    function setMode(mode) {
        state.editMode = mode;
        var editing = (mode === 'ADD' || mode === 'EDIT' || mode === 'DELETE');
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
        if (addB) addB.disabled = editing;
        if (editB) editB.disabled = editing || state.notifications.length === 0 || state.selectedIndex === -1;
        if (delB) delB.disabled = editing || state.notifications.length === 0 || state.selectedIndex === -1;
        if (saveB) saveB.disabled = !editing;
        if (cancelB) cancelB.disabled = !editing;
        if (prevB) prevB.style.display = 'none';
        if (nextB) nextB.style.display = 'none';

        if (mode === 'ADD') {
            clearForm();
            el('frequency')?.focus();
        } else if (mode === 'NONE' && state.selectedIndex >= 0 && state.notifications[state.selectedIndex]) {
            bindForm(state.notifications[state.selectedIndex]);
        }

        console.log('[AccountNotification] Mode →', mode);
    }

    /* ── Collapsible Sections ────────────────────────────────── */
    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(function (header) {
            if (header._wiredActNotif) return;
            header._wiredActNotif = true;
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
    }

    /* ── Bind form data ──────────────────────────────────────── */
    function bindForm(doc) {
        setVal('frequency', doc.NotificationFrequency || doc.Frequency || '');
        setVal('dayOfMonth', doc.NoOfDays || doc.DayOfMonth || '');
        setVal('executionDate', formatDateForInput(doc.ExecutionDate || ''));

        // Audit
        setVal('MakerID', doc.CreatedBy || doc.MakerId || doc.MakerID || '');
        setVal('MakerDT', fmtDateTime(doc.CreatedOn || doc.MakerDt || doc.MakerDT));
        setVal('ModifierID', doc.ModifiedBy || doc.ModifierId || doc.ModifierID || '');
        setVal('ModifierDT', fmtDateTime(doc.ModifiedOn || doc.ModifierDt || doc.ModifierDT));
        setVal('CheckerID', doc.CheckedBy || doc.CheckerId || doc.CheckerID || '');
        setVal('CheckerDT', fmtDateTime(doc.CheckedOn || doc.CheckerDt || doc.CheckerDT));

        // Metadata
        state.operatorID = doc.OperatorID || doc.OperatorId || '';
    }

    /* ── Render Grid ─────────────────────────────────────────── */
    function renderGrid() {
        const tbody = document.querySelector('#notificationsTable tbody');
        const countSpan = el('recordCount');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (countSpan) countSpan.textContent = state.notifications.length + ' records';

        if (state.notifications.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="3">No notifications found.</td></tr>';
            return;
        }

        state.notifications.forEach((item, index) => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.className = index === state.selectedIndex ? 'table-active' : '';

            row.innerHTML = `
                <td>${item.NotificationID || item.ID || '-'}</td>
                <td>${item.NotificationType || item.Type || '-'}</td>
                <td>${item.NotificationMessage || item.Message || '-'}</td>
            `;

            row.addEventListener('click', () => {
                if (state.editMode !== 'NONE') return;
                state.selectedIndex = index;
                renderGrid();
                bindForm(item);
                setMode('NONE');
            });
            tbody.appendChild(row);
        });
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
                let data = [];
                const d = result.Details || result.Data || result;
                if (Array.isArray(d)) data = d;
                else if (d && d.Details01 && Array.isArray(d.Details01)) data = d.Details01;
                else if (d && typeof d === 'object') data = [d];

                state.notifications = data;
                if (state.notifications.length > 0) {
                    state.selectedIndex = 0;
                    bindForm(state.notifications[0]);
                } else {
                    state.selectedIndex = -1;
                    clearForm();
                }
                renderGrid();
                setMode('NONE');
            } else {
                state.notifications = [];
                state.selectedIndex = -1;
                renderGrid();
                clearForm();
                setMode('NONE');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Error loading Account Notifications: ' + err.message, 'error');
        }
    }

    /* ── Save ────────────────────────────────────────────────── */
    async function saveData() {
        const isAdd = state.editMode === 'ADD';
        const frequency = val('frequency');
        if (!frequency) { showMsg('Notification Frequency is required', 'warning'); return; }

        const confirmed = await showConfirm(
            `Are you sure you want to ${isAdd ? 'create' : 'update'} this notification?`,
            'Save Confirmation'
        );
        if (!confirmed) return;

        const ctx = getContext();
        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            CreatedBy: ctx.OperatorID,
            OperatorID: ctx.OperatorID,
            SearchKey: `[${ctx.OurBranchID}:${ctx.AccountID}]`,
            NotificationFrequency: val('frequency').trim(),
            NoOfDays: val('dayOfMonth').trim() || "0",
            ExecutionDate: val('executionDate').trim() || null
        };

        if (!isAdd && state.selectedIndex >= 0) {
            const item = state.notifications[state.selectedIndex];
            payload.NotificationID = item.NotificationID || item.ID || '';
        }

        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(isAdd ? API.ADD : API.UPDATE, payload);
            showLoading(false);
            if (isSuccess(result)) {
                showMsg(result.ResponseMessage || 'Changes saved successfully.', 'success');
                setMode('NONE');
                navigate();
            } else {
                showMsg(result.ResponseMessage || 'Save failed.', 'error');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Save error: ' + err.message, 'error');
        }
    }

    /* ── Delete ──────────────────────────────────────────────── */
    async function deleteData() {
        if (state.selectedIndex === -1 || !state.notifications[state.selectedIndex]) {
            showMsg('No data to delete.', 'warning'); return;
        }

        const confirmed = await showConfirm(
            'Are you sure you want to delete this notification?',
            'Delete Confirmation'
        );
        if (!confirmed) return;

        const ctx = getContext();
        const item = state.notifications[state.selectedIndex];
        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.DELETE, {
                AccountID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID,
                SearchKey: `[${ctx.OurBranchID}:${ctx.AccountID}]`,
                NotificationID: item.NotificationID || item.ID || ''
            });
            showLoading(false);
            if (isSuccess(result)) {
                showMsg(result.ResponseMessage || 'Deleted successfully.', 'success');
                state.selectedIndex = -1;
                clearForm();
                setMode('NONE');
                navigate();
            } else {
                showMsg(result.ResponseMessage || 'Delete failed.', 'error');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Delete error: ' + err.message, 'error');
        }
    }

    /* ── Confirmed Action Wrappers (for AccountMaintenance parent) ─ */
    function confirmAdd() { setMode('ADD'); }
    function confirmEdit() { if (state.selectedIndex !== -1) setMode('EDIT'); else showMsg('No record selected.', 'warning'); }
    function confirmCancel() { cancelChanges(); }
    function cancelChanges() {
        if (state.selectedIndex >= 0 && state.notifications[state.selectedIndex]) bindForm(state.notifications[state.selectedIndex]);
        else clearForm();
        setMode('NONE');
    }
    function clearForm() {
        EDITABLE.forEach(id => setVal(id, ''));
        AUDIT.forEach(id => setVal(id, '-'));
    }

    /* ── Init ────────────────────────────────────────────────── */
    function init() {
        console.log('[AccountNotification] Initializing');
        wireSectionToggles();
        setMode('NONE');

        // Initial Load
        const ctx = getContext();
        if (ctx.AccountID) {
            navigate();
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
        deleteData: deleteData,
        confirmAdd: confirmAdd,
        confirmEdit: confirmEdit,
        confirmCancel: confirmCancel,
        cancelChanges: cancelChanges,
        loadData: navigate
    };
})();

console.log('[AccountNotification] Module registered');
