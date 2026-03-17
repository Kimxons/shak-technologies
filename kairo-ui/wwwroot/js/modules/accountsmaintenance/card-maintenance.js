/**
 * Card Maintenance Module
 */
window.CardMaintenanceModule = (function () {
    'use strict';

    /* ── State ─────────────────────────────────────────────── */
    const state = {
        editMode: 'NONE',   // NONE | ADD | EDIT | DELETE
        cards: [],
        selectedIndex: -1,
        operatorID: null,
        accountId: null,
        branchId: null,
        accountName: null,
        currentMode: 'VIEW'
    };

    /* ── API Routes ─────────────────────────────────────────── */
    const API = {
        GET: 'AccountsMaintenance/api/get-account-card',
        ADD: 'AccountsMaintenance/api/add-account-card',
        UPDATE: 'AccountsMaintenance/api/update-account-card',
        DELETE: 'AccountsMaintenance/api/delete-account-card'
    };

    /* ── Context ────────────────────────────────────────────── */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID: ps?.AccountID || sessionStorage.getItem('currentAccountID') || '',
            AccountName: ps?.AccountName || sessionStorage.getItem('currentAccountName') || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM'
        };
    }

    function refreshContext() {
        const ctx = getContext();
        state.accountId = ctx.AccountID || null;
        state.branchId = ctx.OurBranchID || null;
        state.operatorID = ctx.OperatorID || null;
        state.accountName = ctx.AccountName || null;
        return ctx;
    }

    /* ── UI Helpers ──────────────────────────────────────────── */
    function el(id) { return document.getElementById(id); }
    function val(id) { const e = el(id); return e ? e.value : ''; }
    function setVal(id, v) {
        const e = el(id);
        if (!e) return;
        const s = (v == null) ? '' : v;
        if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT') {
            if (e.type === 'checkbox') e.checked = !!v;
            else if (e.value !== s) e.value = s;
        } else {
            if (e.textContent !== s) e.textContent = s;
        }
    }
    function isChecked(id) { const e = el(id); return e ? e.checked : false; }

    function showLoading(show) {
        const o = el('loadingOverlay');
        if (o) o.hidden = !show;
    }

    function showMsg(msg, type) {
        if (typeof window.showSystemToast === 'function') {
            window.showSystemToast(msg, { variant: type === 'error' ? 'danger' : type });
        }
        console.log('[CardMaintenance] ' + type + ': ' + msg);
    }

    function isSuccess(r) {
        if (!r) return false;
        return r.Success === true || r.success === true || r.ResponseCode === '00' || r.ResponseCode === '000' || r.ResponseCode === 0;
    }

    function normalizeDetails(result) {
        if (!result) return [];

        let details = result.Details ?? result.Data ?? result.data ?? result;

        if (typeof details === 'string') {
            try {
                details = JSON.parse(details);
            } catch (e) {
                details = [];
            }
        }

        if (Array.isArray(details)) return details;
        if (details && Array.isArray(details.Details01)) return details.Details01;
        if (details && typeof details === 'object' && (details.TrackingCardID || details.TrackingID || details.AccountID)) return [details];
        return [];
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
        if (window.GlobalUtils?.formatDateTime) {
            return window.GlobalUtils.formatDateTime(ds);
        }
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch (e) { return ds; }
    }

    function formatDateForInput(ds) {
        if (!ds) return '';

        const toIsoDate = (dateObj) => {
            if (!(dateObj instanceof Date) || isNaN(dateObj.getTime())) return '';
            const y = dateObj.getFullYear();
            const m = String(dateObj.getMonth() + 1).padStart(2, '0');
            const d = String(dateObj.getDate()).padStart(2, '0');
            return `${y}-${m}-${d}`;
        };

        try {
            if (ds instanceof Date) return toIsoDate(ds);

            const raw = String(ds).trim();
            if (!raw) return '';

            // Already in expected HTML date format
            if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

            // dd/MM/yyyy or d/M/yyyy
            const dmyMatch = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
            if (dmyMatch) {
                const day = dmyMatch[1].padStart(2, '0');
                const month = dmyMatch[2].padStart(2, '0');
                const year = dmyMatch[3];
                return `${year}-${month}-${day}`;
            }

            // .NET JSON date: /Date(1710028800000)/
            const dotNetMatch = raw.match(/\/Date\((\d+)\)\//);
            if (dotNetMatch) {
                const d = new Date(Number(dotNetMatch[1]));
                return toIsoDate(d);
            }

            // ISO datetime or other parseable date strings
            const d = new Date(raw);
            return toIsoDate(d);
        } catch (e) { return ''; }
    }

    const EDITABLE = [
        'trackingId', 'cardProvider', 'cardType',
        'cardRemarks', 'isApproved', 'approvedDate',
        'isExported', 'exportedDate', 'isActive', 'activatedDate',
        'startDate', 'expiryDate', 'collected', 'collectionDate',
        'deactivationDate', 'reason', 'reactivationDate', 'reactivationRemarks',
        'status', 'initialTransaction'
    ];
    const AUDIT = ['MakerID', 'MakerDT', 'ModifierID', 'ModifierDT', 'CheckerID', 'CheckerDT'];

    function setFieldsEditable(editable) {
        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = !editable; });
    }

    /* ── Mode Management (button states via parent IDs) ──────── */
    function setMode(mode) {
        state.editMode = mode;
        state.currentMode = mode === 'NONE' ? 'VIEW' : mode;
        const editing = (mode === 'ADD' || mode === 'EDIT' || mode === 'DELETE');
        setFieldsEditable(editing);

        // Parent-provided action panel buttons (by ID)
        var viewB = el('submoduleBtnView');
        var addB = el('submoduleBtnAdd');
        var editB = el('submoduleBtnEdit');
        var delB = el('submoduleBtnDelete');
        var saveB = el('submoduleBtnSave');
        var cancelB = el('submoduleBtnCancel');

        if (viewB) viewB.disabled = editing;
        if (addB) addB.disabled = editing;
        if (editB) editB.disabled = editing || state.cards.length === 0 || state.selectedIndex === -1;
        if (delB) delB.disabled = editing || state.cards.length === 0 || state.selectedIndex === -1;
        if (saveB) saveB.disabled = !editing;
        if (cancelB) cancelB.disabled = !editing;

        if (mode === 'ADD') {
            clearForm();
            const ctx = getContext();
            setVal('cardName', ctx.AccountName || '');
            el('trackingId')?.focus();
        } else if (mode === 'NONE' && state.selectedIndex >= 0) {
            bindForm(state.cards[state.selectedIndex]);
        }

        console.log('[CardMaintenance] Mode →', mode);
    }

    /* ── Collapsible Sections ────────────────────────────────── */
    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            if (header._wiredCardMaint) return;
            header._wiredCardMaint = true;
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
    }

    /* ── Bind form data ──────────────────────────────────────── */
    function readField(obj, ...keys) {
        if (!obj || typeof obj !== 'object') return undefined;

        for (const key of keys) {
            if (Object.prototype.hasOwnProperty.call(obj, key)) {
                return obj[key];
            }

            const match = Object.keys(obj).find(k => k.toLowerCase() === String(key).toLowerCase());
            if (match) return obj[match];
        }

        return undefined;
    }

    function bindForm(data) {
        if (!data) return;

        const toBool = (value) => {
            if (typeof value === 'boolean') return value;
            if (typeof value === 'number') return value !== 0;
            if (typeof value === 'string') {
                const v = value.trim().toLowerCase();
                return v === 'true' || v === '1' || v === 'y' || v === 'yes';
            }
            return false;
        };

        setVal('trackingId', readField(data, 'TrackingCardID', 'TrackingID') || '');
        setVal('cardProvider', readField(data, 'CardProvider', 'Provider', 'CardProviderID') || '');
        setVal('cardName', readField(data, 'CardName', 'NameOnCard') || '');
        setVal('cardType', readField(data, 'CardType', 'Type', 'CardTypeID') || '');

        setVal('cardId', readField(data, 'CardID', 'ID') || '');
        setVal('cardRemarks', readField(data, 'CardRemarks', 'Remarks') || '');
        setVal('isApproved', toBool(readField(data, 'IsApproved')));
        setVal('approvedDate', formatDateForInput(readField(data, 'ApprovedDate', 'ApprovalDate')));

        setVal('isExported', toBool(readField(data, 'IsExported', 'IsCardExported')));
        setVal('exportedDate', formatDateForInput(readField(data, 'ExportedDate', 'CardExportedDate')));
        setVal('isActive', toBool(readField(data, 'IsActive')));
        setVal('activatedDate', formatDateForInput(readField(data, 'ActivatedDate', 'ActvationDate')));

        setVal('startDate', formatDateForInput(readField(data, 'StartDate')));
        setVal('expiryDate', formatDateForInput(readField(data, 'ExpiryDate')));
        setVal('collected', toBool(readField(data, 'Collected', 'IsCollected')));
        setVal('collectionDate', formatDateForInput(readField(data, 'CollectionDate')));

        setVal('deactivationDate', formatDateForInput(readField(data, 'DeactivationDate', 'CardBlockDate')));
        setVal('reason', readField(data, 'DeactivationReason', 'Reason', 'CardDeactivationReasonID', 'CardBlockReasonID') || '');
        setVal('reactivationDate', formatDateForInput(readField(data, 'ReactivationDate')));
        setVal('reactivationRemarks', readField(data, 'ReactivationRemarks') || '');

        setVal('status', readField(data, 'Status', 'CardStatus', 'CardStatusID') || '');
        setVal('initialTransaction', readField(data, 'InitialTransaction') || '');

        setVal('MakerID', readField(data, 'CreatedBy') || '-');
        setVal('MakerDT', fmtDateTime(readField(data, 'CreatedOn')));
        setVal('ModifierID', readField(data, 'ModifiedBy') || '-');
        setVal('ModifierDT', fmtDateTime(readField(data, 'ModifiedOn', 'Modifiedon')));
        setVal('CheckerID', readField(data, 'CheckedBy') || '-');
        setVal('CheckerDT', fmtDateTime(readField(data, 'CheckedOn')));
    }

    /* ── Render Grid ─────────────────────────────────────────── */
    function renderGrid() {
        const tbody = document.querySelector('#cardsListTable tbody');
        const countSpan = el('recordCount');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (countSpan) countSpan.textContent = state.cards.length + ' records';

        if (state.cards.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="5">No cards found.</td></tr>';
            return;
        }

        state.cards.forEach((item, index) => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            if (index === state.selectedIndex) row.classList.add('table-active');

            row.innerHTML = `
                <td>${readField(item, 'TrackingCardID', 'TrackingID') || '-'}</td>
                <td>${readField(item, 'CardID', 'ID') || '-'}</td>
                <td>${readField(item, 'AccountID') || '-'}</td>
                <td>${readField(item, 'CardProvider') || '-'}</td>
                <td>${readField(item, 'CardRemarks', 'Remarks') || '-'}</td>
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
        const ctx = refreshContext();
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
                state.cards = normalizeDetails(result);

                if (state.cards.length > 0) {
                    state.selectedIndex = 0;
                    bindForm(state.cards[0]);
                } else {
                    state.selectedIndex = -1;
                    clearForm();
                }
                renderGrid();
                setMode('NONE');
            } else {
                state.cards = [];
                state.selectedIndex = -1;
                renderGrid();
                setMode('NONE');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Error loading Account Cards: ' + err.message, 'error');
        }
    }

    /* ── Save ────────────────────────────────────────────────── */
    async function saveData() {
        const isAdd = state.editMode === 'ADD';
        const trackingId = val('trackingId');

        // For new cards the SP accepts TrackingCardID = 0 and auto-assigns one.
        // Only require a value when editing an existing card.
        if (!isAdd && !trackingId) { showMsg('TrackingCardID is required', 'warning'); return; }

        const confirmed = await showConfirm(
            `Are you sure you want to ${isAdd ? 'create' : 'update'} this card?`,
            'Save Confirmation'
        );
        if (!confirmed) return;

        const ctx = refreshContext();
        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            CreatedBy: ctx.OperatorID,
            OperatorID: ctx.OperatorID,
            SearchKey: `[${ctx.OurBranchID}:${ctx.AccountID}]`,

            TrackingCardID: trackingId,
            TrackingID: trackingId,
            CardProvider: val('cardProvider'),
            CardProviderID: val('cardProvider'),
            CardName: val('cardName'),
            CardType: val('cardType'),
            CardTypeID: val('cardType'),
            CardRemarks: val('cardRemarks'),
            IsApproved: isChecked('isApproved'),
            ApprovedDate: val('approvedDate') || null,
            IsExported: isChecked('isExported'),
            ExportedDate: val('exportedDate') || null,
            IsActive: isChecked('isActive'),
            ActivatedDate: val('activatedDate') || null,
            StartDate: val('startDate') || null,
            ExpiryDate: val('expiryDate') || null,
            Collected: isChecked('collected'),
            CollectionDate: val('collectionDate') || null,
            DeactivationDate: val('deactivationDate') || null,
            Reason: val('reason'),
            CardDeactivationReasonID: val('reason'),
            ReactivationDate: val('reactivationDate') || null,
            ReactivationRemarks: val('reactivationRemarks'),
            Status: val('status'),
            CardStatusID: val('status'),
            InitialTransaction: val('initialTransaction')
        };

        if (!isAdd && state.selectedIndex >= 0) {
            const item = state.cards[state.selectedIndex];
            payload.CardID = item.CardID || item.ID || '';
        }

        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(isAdd ? API.ADD : API.UPDATE, payload);
            showLoading(false);
            if (isSuccess(result)) {
                showMsg('Card saved successfully.', 'success');
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
        if (state.selectedIndex === -1) { showMsg('No card selected.', 'warning'); return; }

        const confirmed = await showConfirm('Are you sure you want to delete this card?', 'Delete Confirmation');
        if (!confirmed) return;

        const item = state.cards[state.selectedIndex];
        const ctx = refreshContext();
        const itemAccountId = readField(item, 'AccountID') || ctx.AccountID;
        const itemBranchId = readField(item, 'OurBranchID', 'BranchID') || ctx.OurBranchID;
        const itemTrackingId = readField(item, 'TrackingCardID', 'TrackingID');

        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.DELETE, {
                AccountID: itemAccountId,
                OurBranchID: itemBranchId,
                OperatorID: ctx.OperatorID,
                SearchKey: `[${itemBranchId}:${itemAccountId}]`,
                TrackingCardID: itemTrackingId,
                TrackingID: itemTrackingId,
                CardID: readField(item, 'CardID', 'ID') || ''
            });

            showLoading(false);
            if (isSuccess(result)) {
                showMsg('Card deleted successfully.', 'success');
                state.selectedIndex = -1;
                clearForm();
                navigate();
            } else {
                showMsg(result.ResponseMessage || 'Delete failed.', 'error');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Delete error: ' + err.message, 'error');
        }
    }

    /* ── Public API ──────────────────────────────────────────── */
    async function confirmAdd() {
        setMode('ADD');
        // Auto-populate TrackingID from the SP
        try {
            const ctx = refreshContext();
            const result = await window.AppCore.invokeControllerAsync(
                'AccountsMaintenance/api/get-next-tracking-card-id',
                {
                    BankID:      ctx.BankID      || sessionStorage.getItem('bank_id') || '00',
                    OurBranchID: ctx.OurBranchID,
                    AccountID:   ctx.AccountID
                }
            );
            // SP returns a single-column, single-row result — extract the value
            const raw = result?.data ?? result;
            let nextId = '';
            if (raw?.Details01?.[0]) {
                nextId = String(Object.values(raw.Details01[0])[0] ?? '');
            } else if (raw?.Details?.[0]) {
                nextId = String(Object.values(raw.Details[0])[0] ?? '');
            } else if (typeof raw === 'number' || typeof raw === 'string') {
                nextId = String(raw);
            }
            if (nextId) setVal('trackingId', nextId);
        } catch (err) {
            console.warn('[CardMaintenance] Could not fetch next TrackingCardID:', err.message);
        }
    }
    function confirmEdit() { if (state.selectedIndex >= 0) setMode('EDIT'); else showMsg('Select a record.', 'warning'); }
    function confirmCancel() { cancelChanges(); }
    function cancelChanges() {
        if (state.selectedIndex >= 0) bindForm(state.cards[state.selectedIndex]);
        else clearForm();
        setMode('NONE');
    }

    function clearForm() {
        EDITABLE.forEach(id => setVal(id, ''));
        const ctx = refreshContext();
        setVal('cardName', ctx.AccountName || '');
        setVal('cardId', '');
        AUDIT.forEach(id => setVal(id, '-'));
    }

    function init() {
        const ctx = refreshContext();
        wireSectionToggles();
        setMode('NONE');
        if (ctx.AccountID) navigate();
    }

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


console.log('[CardMaintenance] Module registered');
