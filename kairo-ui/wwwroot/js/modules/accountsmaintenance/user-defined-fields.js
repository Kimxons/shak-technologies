/**
 * User Defined Fields Module
 * Migrated from: public/modules/account-maintenance/DataEntry/user-defined-fields.js
 *
 * Parent wires via updateActionPanelForSubmodule:
 *   ADD → setMode('ADD'), EDIT → setMode('EDIT'), VIEW → setMode('VIEW') (via loadData),
 *   DELETE → deleteData(), SAVE → saveData(), CANCEL → cancelChanges(), CLOSE → closeSubmodule()
 */
window.UserDefinedFieldsModule = (function () {
    'use strict';

    /* ── State ─────────────────────────────────────────────── */
    const state = {
        editMode: 'NONE',   // NONE | ADD | EDIT | DELETE
        originalData: null,
        operatorID: null
    };

    /* ── API Routes (Standard MVC Controller Routes) ────────── */
    const API = {
        GET: 'AccountsMaintenance/api/get-user-defined-fields',
        ADD: 'AccountsMaintenance/api/add-user-defined-fields',
        UPDATE: 'AccountsMaintenance/api/update-user-defined-fields',
        DELETE: 'AccountsMaintenance/api/delete-user-defined-fields'
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
        console.log('[UserDefinedFields] ' + type + ': ' + msg);
    }

    function isSuccess(r) {
        if (!r) return false;
        // Standardize Success check for both JSON and ResponseCode
        return r.Success === true || r.ResponseCode === '00' || r.ResponseCode === 0;
    }

    function showConfirm(message, title, iconClass) {
        if (window.AppCore && window.AppCore.showConfirmation) {
            return window.AppCore.showConfirmation(title || 'Confirm Action', message);
        }
        // Fallback to existing logic if AppCore.showConfirmation is not available
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
        if (window.GlobalUtils?.formatDateTime) {
            return window.GlobalUtils.formatDateTime(ds);
        }
        try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch (e) { return ds; }
    }

    /* ── Editable fields ─────────────────────────────────────── */
    const EDITABLE = ['udf1', 'udf2', 'udf3', 'udf4', 'udf5', 'udf6', 'udf7', 'udf8', 'udf9', 'udf10'];
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

        // Hide prev/next which are unused here
        var prevB = el('submoduleBtnPrev');
        var nextB = el('submoduleBtnNext');

        if (viewB) viewB.disabled = editing;
        if (addB) addB.disabled = editing || state.originalData;
        if (editB) editB.disabled = editing || !state.originalData;
        if (delB) delB.disabled = editing || !state.originalData;
        if (saveB) saveB.disabled = !editing;
        if (cancelB) cancelB.disabled = !editing;
        if (prevB) prevB.style.display = 'none';
        if (nextB) nextB.style.display = 'none';

        if (mode === 'ADD') {
            clearForm();
            el('udf1')?.focus();
        }

        console.log('[UserDefinedFields] Mode →', mode);
    }

    /* ── Collapsible Sections ────────────────────────────────── */
    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(function (header) {
            if (header._wiredUdf) return;
            header._wiredUdf = true;
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
        setVal('udf1', doc.UDF1 || '');
        setVal('udf2', doc.UDF2 || '');
        setVal('udf3', doc.UDF3 || '');
        setVal('udf4', doc.UDF4 || '');
        setVal('udf5', doc.UDF5 || '');
        setVal('udf6', doc.UDF6 || '');
        setVal('udf7', doc.UDF7 || '');
        setVal('udf8', doc.UDF8 || '');
        setVal('udf9', doc.UDF9 || '');
        setVal('udf10', doc.UDF10 || '');

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

    /* ── Load / Navigate ─────────────────────────────────────── */
    async function navigate() {
        const ctx = getContext();
        if (!ctx.AccountID) { showMsg('No Account selected.', 'warning'); return; }

        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.GET, {
                AccountNumber: ctx.AccountID, // Controller might expect AccountNumber or AccountID
                AccountID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID
            });

            showLoading(false);
            if (isSuccess(result)) {
                let doc = null;
                // Complex result unwrapping per legacy pattern
                const d = result.Details || result.Data || result;
                if (Array.isArray(d)) {
                    if (d.length > 0) doc = d[0];
                } else if (d && typeof d === 'object') {
                    doc = d;
                }

                if (doc && (doc.UDF1 !== undefined || doc.AccountID)) {
                    state.originalData = doc;
                    bindForm(doc);
                    setMode('NONE');
                } else {
                    state.originalData = null;
                    clearForm();
                    setMode('NONE');
                }
            } else {
                state.originalData = null;
                clearForm();
                setMode('NONE');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Error loading User Defined Fields: ' + err.message, 'error');
        }
    }

    /* ── Save ────────────────────────────────────────────────── */
    async function saveData() {
        const isAdd = state.editMode === 'ADD';
        const confirmed = await showConfirm(
            `Are you sure you want to ${isAdd ? 'create' : 'update'} User Defined Fields?`,
            'Save Confirmation'
        );
        if (!confirmed) return;

        const ctx = getContext();
        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            CreatedBy: ctx.OperatorID,
            UDF1: val('udf1').trim(),
            UDF2: val('udf2').trim(),
            UDF3: val('udf3').trim(),
            UDF4: val('udf4').trim(),
            UDF5: val('udf5').trim(),
            UDF6: val('udf6').trim(),
            UDF7: val('udf7').trim(),
            UDF8: val('udf8').trim(),
            UDF9: val('udf9').trim(),
            UDF10: val('udf10').trim()
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
                showMsg(result.ResponseMessage || 'Failed to save changes.', 'error');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Save error: ' + err.message, 'error');
        }
    }

    /* ── Delete ──────────────────────────────────────────────── */
    async function deleteData() {
        if (!state.originalData) return;
        const confirmed = await showConfirm(
            'Are you sure you want to delete these User Defined Fields?',
            'Delete Confirmation'
        );
        if (!confirmed) return;

        const ctx = getContext();
        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.DELETE, {
                AccountID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                OperatorID: ctx.OperatorID
            });
            showLoading(false);
            if (isSuccess(result)) {
                showMsg(result.ResponseMessage || 'Deleted successfully.', 'success');
                state.originalData = null;
                clearForm();
                setMode('NONE');
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
    function confirmEdit() { if (state.originalData) setMode('EDIT'); else showMsg('No data to edit.', 'warning'); }
    function confirmCancel() { cancelChanges(); }
    function cancelChanges() {
        if (state.originalData) bindForm(state.originalData);
        else clearForm();
        setMode('NONE');
    }
    function clearForm() {
        EDITABLE.forEach(id => setVal(id, ''));
        AUDIT.forEach(id => setVal(id, '-'));
    }

    /* ── Init ────────────────────────────────────────────────── */
    function init() {
        console.log('[UserDefinedFields] Initializing');
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
        clearForm: clearForm,
        loadData: navigate
    };
})();

console.log('[UserDefinedFields] Module registered');
