/**
 * Account Interest Rates Module
 * Migrated from: public/modules/account-maintenance/DataEntry/account-interest-rates.js
 */
window.AccountInterestRatesModule = (function () {
    'use strict';

    /* ── State ─────────────────────────────────────────────── */
    const state = {
        editMode: 'NONE',   // NONE | ADD | EDIT | DELETE
        rateData: null,
        slabs: [],
        originalData: null,
        operatorID: null
    };

    /* ── API Routes ─────────────────────────────────────────── */
    /* ── API Routes (Standard MVC Controller Routes) ────────── */
    const API = {
        GET: 'AccountsMaintenance/api/get-account-interest-rate',
        ADD: 'AccountsMaintenance/api/add-account-interest-rate',
        UPDATE: 'AccountsMaintenance/api/update-account-interest-rate',
        DELETE: 'AccountsMaintenance/api/delete-account-interest-rate'
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
        console.log('[InterestRates] ' + type + ': ' + msg);
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

    function formatDateForInput(ds) {
        if (!ds) return '';
        if (window.GlobalUtils?.parseDateInput) {
            const parsed = window.GlobalUtils.parseDateInput(ds);
            if (parsed) return parsed;
        }
        try {
            const d = new Date(ds);
            if (isNaN(d.getTime())) return '';
            const y = d.getFullYear();
            const m = String(d.getMonth() + 1).padStart(2, '0');
            const day = String(d.getDate()).padStart(2, '0');
            return `${y}-${m}-${day}`;
        } catch (e) { return ''; }
    }

    function formatNumber(num) { return parseFloat(num || 0).toFixed(4); }

    const EDITABLE = ['rateType', 'effectiveDate', 'expiryDate', 'refId'];
    const AUDIT = ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'];

    function setFieldsEditable(editable) {
        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = !editable; });
        const addSlabBtn = el('btnAddSlab');
        if (addSlabBtn) addSlabBtn.style.display = editable ? 'inline-block' : 'none';
    }

    /* ── Mode Management (button states via parent IDs) ──────── */
    function setMode(mode) {
        state.editMode = mode;
        const editing = (mode === 'ADD' || mode === 'EDIT' || mode === 'DELETE');
        setFieldsEditable(editing);
        renderSlabGrid();

        // Parent-provided action panel buttons (by ID)
        var viewB = el('submoduleBtnView');
        var addB = el('submoduleBtnAdd');
        var editB = el('submoduleBtnEdit');
        var delB = el('submoduleBtnDelete');
        var saveB = el('submoduleBtnSave');
        var cancelB = el('submoduleBtnCancel');

        if (viewB) viewB.disabled = editing;
        if (addB) addB.disabled = editing || state.rateData !== null;
        if (editB) editB.disabled = editing || state.rateData === null;
        if (delB) delB.disabled = editing || state.rateData === null;
        if (saveB) saveB.disabled = !editing;
        if (cancelB) cancelB.disabled = !editing;

        if (mode === 'ADD') {
            clearForm();
            el('rateType')?.focus();
        } else if (mode === 'NONE' && state.rateData) {
            bindForm(state.rateData);
        }

        console.log('[InterestRates] Mode →', mode);
    }

    /* ── Collapsible Sections ────────────────────────────────── */
    function wireEvents() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            if (header._wiredIntRate) return;
            header._wiredIntRate = true;
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

        const addSlabBtn = el('btnAddSlab');
        if (addSlabBtn && !addSlabBtn._wiredIntRate) {
            addSlabBtn._wiredIntRate = true;
            addSlabBtn.addEventListener('click', () => {
                if (state.editMode === 'ADD' || state.editMode === 'EDIT') {
                    state.slabs.push({ FromAmount: 0, ToAmount: 0, Spread: 0, InterestRate: 0 });
                    renderSlabGrid();
                }
            });
        }
    }

    /* ── Bind form data ──────────────────────────────────────── */
    function bindForm(data) {
        if (!data) return;
        setVal('rateType', data.RateType || data.InterestRateTypeID || '');
        setVal('baseRate', formatNumber(data.BaseRate || 0));
        setVal('effectiveDate', formatDateForInput(data.EffectiveDate));
        setVal('expiryDate', formatDateForInput(data.ExpiryDate));
        setVal('refId', data.RefID || data.ReferenceID || '');

        setVal('CreatedBy', data.CreatedBy || '-');
        setVal('CreatedOn', fmtDateTime(data.CreatedOn));
        setVal('SupervisedBy', data.SupervisedBy || '-');
        setVal('SupervisedOn', fmtDateTime(data.SupervisedOn));
        setVal('ModifiedBy', data.ModifiedBy || '-');
        setVal('ModifiedOn', fmtDateTime(data.ModifiedOn));

        state.slabs = data.Slabs || data.RateSlabs || [];
        renderSlabGrid();
    }

    /* ── Render Slab Grid ────────────────────────────────────── */
    function renderSlabGrid() {
        const tbody = document.querySelector('#rateSlabGrid tbody');
        if (!tbody) return;

        tbody.innerHTML = '';
        if (state.slabs.length === 0) {
            tbody.innerHTML = '<tr class="table__empty"><td colspan="5">No rate slabs defined.</td></tr>';
            return;
        }

        const isEditing = state.editMode === 'ADD' || state.editMode === 'EDIT';

        state.slabs.forEach((slab, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><input type="number" class="bs-input-text text-end" data-field="FromAmount" 
                           value="${slab.FromAmount || 0}" ${!isEditing ? 'disabled' : ''}></td>
                <td><input type="number" class="bs-input-text text-end" data-field="ToAmount" 
                           value="${slab.ToAmount || 0}" ${!isEditing ? 'disabled' : ''}></td>
                <td><input type="number" class="bs-input-text text-end" data-field="Spread" 
                           value="${slab.Spread || slab.SpreadMargin || 0}" step="0.0001" ${!isEditing ? 'disabled' : ''}></td>
                <td><input type="number" class="bs-input-text text-end" data-field="InterestRate" 
                           value="${slab.InterestRate || slab.Rate || 0}" step="0.0001" ${!isEditing ? 'disabled' : ''}></td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-danger" data-delete-slab="${index}" 
                            ${!isEditing ? 'disabled' : ''} title="Remove slab">
                        <i class="bi bi-trash"></i>
                    </button>
                </td>
            `;

            row.querySelectorAll('input').forEach(input => {
                input.addEventListener('change', () => {
                    const field = input.dataset.field;
                    state.slabs[index][field] = parseFloat(input.value) || 0;
                });
            });

            row.querySelector('[data-delete-slab]')?.addEventListener('click', () => {
                if (isEditing) {
                    state.slabs.splice(index, 1);
                    renderSlabGrid();
                }
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
                const data = result.Details || result.Data || result;
                if (Array.isArray(data) && data.length > 0) state.rateData = data[0];
                else if (data && !Array.isArray(data)) state.rateData = data;
                else state.rateData = null;

                if (state.rateData) {
                    state.originalData = JSON.parse(JSON.stringify(state.rateData));
                    bindForm(state.rateData);
                } else {
                    state.originalData = null;
                    clearForm();
                }
                setMode('NONE');
            } else {
                state.rateData = null;
                state.originalData = null;
                clearForm();
                setMode('NONE');
            }
        } catch (err) {
            showLoading(false);
            showMsg('Error loading Interest Rates: ' + err.message, 'error');
        }
    }

    /* ── Save ────────────────────────────────────────────────── */
    async function saveData() {
        const isAdd = state.editMode === 'ADD';
        const rateType = val('rateType');
        if (!rateType) { showMsg('Rate Type is required', 'warning'); return; }

        const confirmed = await showConfirm(
            `Are you sure you want to ${isAdd ? 'create' : 'update'} this interest rate?`,
            'Save Confirmation'
        );
        if (!confirmed) return;

        const ctx = getContext();
        const searchKey = `[${ctx.OurBranchID}:${ctx.AccountID}]`;

        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            CreatedBy: ctx.OperatorID,
            OperatorID: ctx.OperatorID,
            SearchKey: searchKey,
            RateType: rateType,
            InterestRateTypeID: rateType,
            BaseRate: parseFloat(val('baseRate')) || 0,
            EffectiveDate: val('effectiveDate') ? new Date(val('effectiveDate')).toISOString() : null,
            ExpiryDate: val('expiryDate') ? new Date(val('expiryDate')).toISOString() : null,
            RefID: val('refId'),
            Slabs: state.slabs
        };

        if (!isAdd && state.rateData) {
            payload.RateID = state.rateData.RateID || state.rateData.InterestRateID || '';
        }

        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(isAdd ? API.ADD : API.UPDATE, payload);
            showLoading(false);
            if (isSuccess(result)) {
                showMsg('Interest Rate saved.', 'success');
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
        if (!state.rateData) { showMsg('No data to delete.', 'warning'); return; }

        const confirmed = await showConfirm('Are you sure you want to delete this Interest Rate?', 'Delete Confirmation');
        if (!confirmed) return;

        const ctx = getContext();
        const payload = {
            AccountID: ctx.AccountID,
            OurBranchID: ctx.OurBranchID,
            OperatorID: ctx.OperatorID,
            SearchKey: `[${ctx.OurBranchID}:${ctx.AccountID}]`,
            RateID: state.rateData.RateID || state.rateData.InterestRateID || ''
        };

        showLoading(true);
        try {
            const result = await window.AppCore.invokeControllerAsync(API.DELETE, payload);
            showLoading(false);
            if (isSuccess(result)) {
                showMsg('Interest Rate deleted.', 'success');
                state.rateData = null;
                state.originalData = null;
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
    function confirmEdit() { if (state.rateData) setMode('EDIT'); else showMsg('No internal record.', 'warning'); }
    function confirmCancel() { cancelChanges(); }
    function cancelChanges() {
        if (state.originalData) {
            state.rateData = JSON.parse(JSON.stringify(state.originalData));
            bindForm(state.rateData);
        } else clearForm();
        setMode('NONE');
    }

    function clearForm() {
        EDITABLE.forEach(id => setVal(id, ''));
        setVal('baseRate', '0.0000');
        AUDIT.forEach(id => setVal(id, '-'));
        state.slabs = [];
        renderSlabGrid();
    }

    function init() {
        wireEvents();
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


console.log('[InterestRates] Module registered');
