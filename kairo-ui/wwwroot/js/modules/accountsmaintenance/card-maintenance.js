/**
 * Card Maintenance Module
 * Rewritten to standard submodule API pattern for KAIRO MVC
 */
window.CardMaintenanceModule = (function () {
    'use strict';

    /* ── State ─────────────────────────────────────────────── */
    const state = {
        editMode: 'NONE',   // NONE | ADD | EDIT | DELETE
        cards: [],
        selectedIndex: -1,
        operatorID: null
    };

    /* ── API Routes ─────────────────────────────────────────── */
    const API = {
        GET: '/AccountsMaintenance/api/get-account-card',
        ADD: '/AccountsMaintenance/api/add-account-card',
        UPDATE: '/AccountsMaintenance/api/update-account-card',
        DELETE: '/AccountsMaintenance/api/delete-account-card'
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

    /* ── UI Helpers ──────────────────────────────────────────── */
    function el(id) { return document.getElementById(id); }
    function val(id) { const e = el(id); return e ? e.value : ''; }
    function setVal(id, v) {
        const e = el(id);
        if (!e) return;
        const s = (v == null) ? '' : v;
        if (e.tagName === 'INPUT' || e.tagName === 'TEXTAREA' || e.tagName === 'SELECT') {
            if (e.type === 'checkbox') {
                e.checked = !!v;
            } else if (e.value !== s) {
                e.value = s;
            }
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

    function fmtDateTime(ds) {
        if (!ds) return '-';
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch (e) { return ds; }
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

    /* ── Editable fields ─────────────────────────────────────── */
    const EDITABLE = [
        'trackingId', 'cardProvider', 'cardType',
        'cardRemarks', 'isApproved', 'approvedDate',
        'isExported', 'exportedDate', 'isActive', 'activatedDate',
        'startDate', 'expiryDate', 'collected', 'collectionDate',
        'deactivationDate', 'reason', 'reactivationDate', 'reactivationRemarks',
        'status', 'initialTransaction'
    ];
    // cardName and cardId are readonly manually managed.

    const AUDIT = ['MakerID', 'MakerDT', 'ModifierID', 'ModifierDT', 'CheckerID', 'CheckerDT'];

    function setFieldsEditable(editable) {
        EDITABLE.forEach(function (id) {
            var e = el(id);
            if (e) e.disabled = !editable;
        });
    }

    /* ── Mode Management ─────────────────────────────────────── */
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
        if (editB) editB.disabled = editing || state.cards.length === 0 || state.selectedIndex === -1;
        if (delB) delB.disabled = editing || state.cards.length === 0 || state.selectedIndex === -1;
        if (saveB) saveB.disabled = !editing;
        if (cancelB) cancelB.disabled = !editing;
        if (prevB) prevB.style.display = 'none';
        if (nextB) nextB.style.display = 'none';

        if (mode === 'ADD') {
            clearForm();
            var ctx = getContext();
            setVal('cardName', ctx.AccountName || ''); // Auto-populate cardName from context
            el('trackingId')?.focus();
        } else if (mode === 'NONE' && state.selectedIndex >= 0 && state.cards[state.selectedIndex]) {
            bindForm(state.cards[state.selectedIndex]);
        }

        console.log('[CardMaintenance] Mode →', mode);
    }

    /* ── Collapsible Sections ────────────────────────────────── */
    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(function (header) {
            if (header._wiredCardMaint) return;
            header._wiredCardMaint = true;
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
    function bindForm(data) {
        setVal('trackingId', data.TrackingID || data.TrackingId || '');
        setVal('cardProvider', data.CardProvider || data.Provider || data.CardProviderID || '');
        setVal('cardName', data.CardName || data.NameOnCard || '');
        setVal('cardType', data.CardType || data.Type || data.CardTypeID || '');

        setVal('cardId', data.CardID || data.ID || '');
        setVal('cardRemarks', data.CardRemarks || data.Remarks || '');
        setVal('isApproved', data.IsApproved || false);
        setVal('approvedDate', formatDateForInput(data.ApprovedDate));

        setVal('isExported', data.IsExported || false);
        setVal('exportedDate', formatDateForInput(data.ExportedDate));
        setVal('isActive', data.IsActive || false);
        setVal('activatedDate', formatDateForInput(data.ActivatedDate));

        setVal('startDate', formatDateForInput(data.StartDate));
        setVal('expiryDate', formatDateForInput(data.ExpiryDate));
        setVal('collected', data.Collected || data.IsCollected || false);
        setVal('collectionDate', formatDateForInput(data.CollectionDate));

        setVal('deactivationDate', formatDateForInput(data.DeactivationDate));
        setVal('reason', data.DeactivationReason || data.Reason || data.CardDeactivationReasonID || '');
        setVal('reactivationDate', formatDateForInput(data.ReactivationDate));
        setVal('reactivationRemarks', data.ReactivationRemarks || '');

        setVal('status', data.Status || data.CardStatus || data.CardStatusID || '');
        setVal('initialTransaction', data.InitialTransaction || '');

        // Audit
        setVal('MakerID', data.CreatedBy || data.MakerId || data.MakerID || '-');
        setVal('MakerDT', fmtDateTime(data.CreatedOn || data.MakerDt || data.MakerDT));
        setVal('ModifierID', data.ModifiedBy || data.ModifierId || data.ModifierID || '-');
        setVal('ModifierDT', fmtDateTime(data.ModifiedOn || data.ModifierDt || data.ModifierDT));
        setVal('CheckerID', data.CheckedBy || data.CheckerId || data.CheckerID || '-');
        setVal('CheckerDT', fmtDateTime(data.CheckedOn || data.CheckerDt || data.CheckerDT));

        state.operatorID = data.OperatorID || data.OperatorId || '';
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
            row.className = index === state.selectedIndex ? 'table-active' : '';

            row.innerHTML = `
                <td>${item.TrackingID || item.TrackingId || '-'}</td>
                <td>${item.CardID || item.ID || '-'}</td>
                <td>${item.AccountID || item.AccountId || '-'}</td>
                <td>${item.CardProvider || item.Provider || item.CardProviderID || '-'}</td>
                <td>${item.CardRemarks || item.Remarks || '-'}</td>
            `;

            row.addEventListener('click', () => {
                if (state.editMode !== 'NONE') return;
                state.selectedIndex = index;
                renderGrid();
                bindForm(item);
                setMode('NONE'); // Re-evaluate button states
            });
            tbody.appendChild(row);
        });
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
                    let data = [];
                    var d = result && result.Details ? result.Details : null;

                    if (Array.isArray(d)) data = d;
                    else if (d && d.Details01 && Array.isArray(d.Details01)) data = d.Details01;
                    else if (Array.isArray(result.Data)) data = result.Data;
                    else if (d && typeof d === 'object') data = [d];
                    else if (result.Data && typeof result.Data === 'object') data = [result.Data];

                    state.cards = data;

                    if (state.cards.length > 0) {
                        state.selectedIndex = 0;
                        bindForm(state.cards[0]);
                        showMsg(`Loaded ${state.cards.length} card(s).`, 'success');
                    } else {
                        state.selectedIndex = -1;
                        clearForm();
                        showMsg('No cards found.', 'info');
                    }

                    renderGrid();
                    setMode('NONE');
                } else {
                    state.cards = [];
                    state.selectedIndex = -1;
                    renderGrid();
                    clearForm();
                    setMode('NONE');
                    showMsg(result.ResponseMessage || 'No cards found.', 'warning');
                }
            })
            .catch(function (err) {
                showLoading(false);
                showMsg('Error loading Account Cards: ' + err.message, 'error');
            });
    }

    /* ── Save ────────────────────────────────────────────────── */
    function saveData() {
        var isAdd = state.editMode === 'ADD';
        var actionLabel = isAdd ? 'create' : 'update';

        var trackingId = val('trackingId');
        if (!trackingId) { showMsg('TrackingID is required', 'warning'); return; }

        showConfirm(
            'Are you sure you want to ' + actionLabel + ' this card?',
            'Save Card',
            'bi-save'
        ).then(function (confirmed) {
            if (!confirmed) { showMsg('Save cancelled.', 'info'); return; }

            var ctx = getContext();
            var searchKey = `[${ctx.OurBranchID}:${ctx.AccountID}]`;

            // Build payload
            var payload = {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                CreatedBy: ctx.OperatorID,
                OperatorID: ctx.OperatorID,
                SearchKey: searchKey,

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
                var item = state.cards[state.selectedIndex];
                payload.CardID = item.CardID || item.ID || '';
            }

            showLoading(true);

            fetch(isAdd ? API.ADD : API.UPDATE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(function (r) { return r.json(); })
                .then(function (result) {
                    showLoading(false);
                    if (isSuccess(result)) {
                        showMsg(result.ResponseMessage || (isAdd ? 'Card added.' : 'Card updated.'), 'success');
                        setMode('NONE');
                        navigate();
                    } else {
                        showMsg(result.ResponseMessage || 'Save failed.', 'error');
                    }
                })
                .catch(function (err) {
                    showLoading(false);
                    showMsg('Save error: ' + err.message, 'error');
                });
        });
    }

    /* ── Delete ──────────────────────────────────────────────── */
    function deleteData() {
        if (state.selectedIndex === -1 || !state.cards[state.selectedIndex]) {
            showMsg('No data to delete.', 'warning'); return;
        }

        showConfirm(
            'Are you sure you want to delete this card?',
            'Delete Card',
            'bi-trash'
        ).then(function (confirmed) {
            if (!confirmed) return;

            setMode('DELETE');

            var ctx = getContext();
            var searchKey = `[${ctx.OurBranchID}:${ctx.AccountID}]`;
            var item = state.cards[state.selectedIndex];

            showLoading(true);

            var payload = {
                AccountID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID,
                SearchKey: searchKey,
                CardID: item.CardID || item.ID || ''
            };

            fetch(API.DELETE, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            })
                .then(function (r) { return r.json(); })
                .then(function (result) {
                    showLoading(false);
                    if (isSuccess(result)) {
                        showMsg(result.ResponseMessage || 'Card deleted.', 'success');
                        state.selectedIndex = -1;
                        clearForm();
                        setMode('NONE');
                        navigate();
                    } else {
                        showMsg(result.ResponseMessage || 'Delete failed.', 'error');
                    }
                })
                .catch(function (err) {
                    showLoading(false);
                    showMsg('Delete error: ' + err.message, 'error');
                });
        });
    }

    /* ── Confirmed Action Wrappers (for AccountMaintenance parent) ─ */
    function confirmAdd() {
        setMode('ADD');
    }

    function confirmEdit() {
        if (state.cards.length === 0 || state.selectedIndex === -1) {
            showMsg('No record available to edit.', 'warning'); return;
        }
        setMode('EDIT');
    }

    function confirmCancel() {
        cancelChanges();
    }

    /* ── Cancel / Clear ──────────────────────────────────────── */
    function cancelChanges() {
        if (state.selectedIndex >= 0 && state.cards[state.selectedIndex]) {
            bindForm(state.cards[state.selectedIndex]);
        } else {
            clearForm();
        }
        setMode('NONE');
    }

    function clearForm() {
        var ctx = getContext();
        EDITABLE.forEach(function (id) { setVal(id, ''); });
        // Set context-driven fields
        setVal('cardName', ctx.AccountName || '');
        setVal('cardId', '');

        AUDIT.forEach(function (id) { setVal(id, '-'); });
    }

    /* ── Init ────────────────────────────────────────────────── */
    function init() {
        console.log('[CardMaintenance] Initializing');
        wireSectionToggles();
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
        deleteData: deleteData,
        confirmAdd: confirmAdd,
        confirmEdit: confirmEdit,
        confirmCancel: confirmCancel,
        cancelChanges: cancelChanges,
        clearForm: clearForm,
        loadData: function () { navigate(); }
    };
})();

console.log('[CardMaintenance] Module registered');
