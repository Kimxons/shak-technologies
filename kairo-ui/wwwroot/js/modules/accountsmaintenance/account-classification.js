/**
 * Account Classification Module
 * Migrated from: public/modules/account-maintenance/DataEntry/account-classification.js
 *
 * Parent wires via updateActionPanelForSubmodule:
 *   ADD → setMode('ADD'), EDIT → setMode('EDIT'), VIEW → setMode('VIEW') (via loadData),
 *   DELETE → deleteData(), SAVE → saveData(), CANCEL → cancelChanges(), CLOSE → closeSubmodule()
 */
window.AccountClassificationModule = (function () {
    'use strict';

    /* ── State ─────────────────────────────────────────────── */
    const state = {
        editMode: 'NONE',   // NONE | ADD | EDIT | DELETE
        classifications: [],
        selectedIndex: -1,
        operatorID: null
    };

    /* ── API Routes ─────────────────────────────────────────── */
    /* ── API Routes (Standard MVC Controller Routes) ────────── */
    const API = {
        GET: 'AccountsMaintenance/api/get-account-classification',
        ADD: 'AccountsMaintenance/api/add-account-classification',
        UPDATE: 'AccountsMaintenance/api/update-account-classification',
        DELETE: 'AccountsMaintenance/api/delete-account-classification'
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
        console.log('[AccountClassification] ' + type + ': ' + msg);
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
        if (window.GlobalUtils?.formatDateTime) {
            return window.GlobalUtils.formatDateTime(ds);
        }
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch (e) { return ds; }
    }

    /* ── Editable fields ─────────────────────────────────────── */
    const EDITABLE = ['classificationCode', 'classificationSubCode'];
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

        if (viewB) viewB.disabled = editing;
        if (addB) addB.disabled = editing;
        if (editB) editB.disabled = editing || state.classifications.length === 0 || state.selectedIndex === -1;
        if (delB) delB.disabled = editing || state.classifications.length === 0 || state.selectedIndex === -1;
        if (saveB) saveB.disabled = !editing;
        if (cancelB) cancelB.disabled = !editing;

        if (mode === 'ADD') {
            clearForm();
            el('classificationCode')?.focus();
        } else if (mode === 'NONE' && state.selectedIndex >= 0 && state.classifications[state.selectedIndex]) {
            bindForm(state.classifications[state.selectedIndex]);
        }

        console.log('[AccountClassification] Mode →', mode);
    }

    /* ── Collapsible Sections ────────────────────────────────── */
    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(function (header) {
            if (header._wiredActClass) return;
            header._wiredActClass = true;
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
        setVal('classificationCode', doc.ClassificationCode || doc.ClassReq || doc.Code || '');
        setVal('classificationSubCode', doc.ClassificationSubCode || doc.SubClassReq || doc.SubCode || '');

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
        const tbody = document.querySelector('#classificationGrid tbody');
        const countSpan = el('recordCount');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (countSpan) countSpan.textContent = state.classifications.length + ' records';

        if (state.classifications.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="2">No classifications found.</td></tr>';
            return;
        }

        state.classifications.forEach((item, index) => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            row.className = index === state.selectedIndex ? 'table-active' : '';

            row.innerHTML = `
                <td>${item.ClassificationCode || item.ClassReq || item.Code || '-'}</td>
                <td>${item.ClassificationSubCode || item.SubClassReq || item.SubCode || '-'}</td>
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

                state.classifications = data;
                if (state.classifications.length > 0) {
                    state.selectedIndex = 0;
                    bindForm(state.classifications[0]);
                } else {
                    state.selectedIndex = -1;
                    clearForm();
                }
                renderGrid();
                setMode('NONE');
            } else {
                state.classifications = [];
                state.selectedIndex = -1;
                renderGrid();
                clearForm();
                setMode('NONE');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Error loading Account Classification: ' + err.message, 'error');
        }
    }

    /* ── Save ────────────────────────────────────────────────── */
    async function saveData() {
        const isAdd = state.editMode === 'ADD';
        const classCode = val('classificationCode');
        if (!classCode) { showMsg('Classification code is required', 'warning'); return; }

        const confirmed = await showConfirm(
            `Are you sure you want to ${isAdd ? 'create' : 'update'} this classification?`,
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
            ClassificationCode: val('classificationCode').trim(),
            ClassificationSubCode: val('classificationSubCode').trim()
        };

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
        if (state.selectedIndex === -1 || !state.classifications[state.selectedIndex]) return;

        const confirmed = await showConfirm(
            'Are you sure you want to delete this classification?',
            'Delete Confirmation'
        );
        if (!confirmed) return;

        const ctx = getContext();
        const item = state.classifications[state.selectedIndex];
        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.DELETE, {
                AccountID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID,
                SearchKey: `[${ctx.OurBranchID}:${ctx.AccountID}]`,
                ClassificationCode: item.ClassificationCode || item.ClassReq || item.Code || ''
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

    /* ── Public API ──────────────────────────────────────────── */
    function confirmAdd() { setMode('ADD'); }
    function confirmEdit() { if (state.selectedIndex !== -1) setMode('EDIT'); else showMsg('No record selected.', 'warning'); }
    function confirmCancel() { cancelChanges(); }
    function cancelChanges() {
        if (state.selectedIndex >= 0 && state.classifications[state.selectedIndex]) bindForm(state.classifications[state.selectedIndex]);
        else clearForm();
        setMode('NONE');
    }
    function clearForm() {
        EDITABLE.forEach(id => setVal(id, ''));
        AUDIT.forEach(id => setVal(id, '-'));
    }

    function init() {
        wireSectionToggles();
        setMode('NONE');
        const ctx = getContext();
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


console.log('[AccountClassification] Module registered');
