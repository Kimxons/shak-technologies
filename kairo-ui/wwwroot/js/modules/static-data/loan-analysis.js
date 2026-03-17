/**
 * Loan Analysis Module
 * MVC Pattern: state + AppCore.invokeControllerAsync + POST endpoints
 */
(function () {
    'use strict';

    if (window.__kairoLoanAnalysisLoaded) return;
    window.__kairoLoanAnalysisLoaded = true;

    // ─── Constants ───────────────────────────────────────────────────────
    const MODES = { VIEW: 'View', ADD: 'Add', UPDATE: 'Update' };

    const endpoints = {
        getAnalysisTypes:   '/StaticData/LoanAnalysis/GetLoanAnalysisTypes',
        getLoanAnalysis:    'StaticData/LoanAnalysis/GetLoanAnalysis',
        searchLoanAnalysis: 'StaticData/LoanAnalysis/SearchLoanAnalysis',
        saveLoanAnalysis:   'StaticData/LoanAnalysis/SaveLoanAnalysis',
        deleteLoanAnalysis: 'StaticData/LoanAnalysis/DeleteLoanAnalysis'
    };

    // ─── State ───────────────────────────────────────────────────────────
    const state = {
        mode: MODES.VIEW,
        hasLoaded: false,
        isBusy: false,
        recordNotFound: false,
        slabs: [],
        updateCount: 0,
        selectedSlabIndex: -1,
        gridAction: null,
        context: { bankId: '', branchId: '', operatorId: '' },
        analysisTypes: [],   // [{ value, text, isSlabRequired }]
        typesLoaded: false
    };

    let searchModal = null;
    const searchState = { results: [], selectedIndex: -1 };

    // ─── DOM Helpers ─────────────────────────────────────────────────────
    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
    function getValue(id) { const el = qs('#' + id); return el ? el.value.trim() : ''; }
    function setText(id, val) { const el = qs('#' + id); if (el) el.textContent = String(val ?? ''); }
    function setVal(id, val) { const el = qs('#' + id); if (el) el.value = String(val ?? ''); }

    // ─── Context ─────────────────────────────────────────────────────────
    function loadContext() {
        state.context.operatorId = getValue('OperatorID') || sessionStorage.getItem('user_name') || '';
        state.context.branchId   = getValue('hdn_BranchCode') || sessionStorage.getItem('branch_code') || sessionStorage.getItem('OurBranchID') || '';
        state.context.bankId     = getValue('hdn_BankId') || sessionStorage.getItem('bank_id') || sessionStorage.getItem('BankID') || '00';
    }

    function apiInvoke(endpoint, payload) {
        const appCore = window.AppCore;
        if (!appCore || typeof appCore.invokeControllerAsync !== 'function') {
            return Promise.reject(new Error('AppCore.invokeControllerAsync is not available'));
        }
        return appCore.invokeControllerAsync(endpoint, payload || {});
    }

    // ─── Message Panel ───────────────────────────────────────────────────
    function showMessage(text, type) {
        const panel = qs('#dv_messagePanel');
        const span  = qs('#spn_messageText');
        const icon  = qs('#icn_messageIcon');
        if (!panel || !span) return;

        panel.className = 'am-message-panel';
        const typeMap = {
            success: ['am-message-panel--success', 'bi-check-circle-fill'],
            danger:  ['am-message-panel--danger',  'bi-exclamation-triangle-fill'],
            warning: ['am-message-panel--warning',  'bi-exclamation-circle-fill'],
            info:    ['am-message-panel--info',     'bi-info-circle']
        };
        const [cls, iconCls] = typeMap[type] || typeMap.info;
        panel.classList.add(cls);
        span.textContent = text;
        if (icon) icon.className = 'bi ' + iconCls;
        panel.style.display = 'block';

        if (type === 'success') {
            setTimeout(() => { panel.style.display = 'none'; }, 3000);
        }
    }

    // ─── Section Toggles ─────────────────────────────────────────────────
    function wireSectionToggles() {
        qsa('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const btn     = header.querySelector('.section-toggle-btn');
                const icon    = btn?.querySelector('i');
                if (!content) return;

                const hidden = content.style.display === 'none';
                content.style.display = hidden ? '' : 'none';
                if (btn) btn.setAttribute('aria-expanded', String(hidden));
                if (icon) icon.className = hidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
            });
        });
    }

    // ─── Mode / Button State ─────────────────────────────────────────────
    function setMode(nextMode) {
        state.mode = nextMode;
        const form = qs('#loan-analysis-form');
        if (!form) return;

        const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

        qsa('input:not([data-always-enabled]), select:not([data-always-enabled]), textarea:not([data-always-enabled])', form).forEach(el => {
            el.disabled = !isEditable;
        });

        // ID + lookup always enabled
        qsa('[data-always-enabled]', form).forEach(el => { el.disabled = false; });

        // NoOfSlabs always readonly
        const slabCountEl = qs('#NoOfSlabs');
        if (slabCountEl) slabCountEl.disabled = true;

        updateModeButtons();
        updateGridButtons();
    }

    function setButtonDisabled(btn, disabled) {
        if (!btn) return;
        btn.disabled = disabled;
        btn.classList.toggle('disabled', disabled);
    }

    function updateModeButtons() {
        const viewBtn   = qs('[data-shell-mode="View"]');
        const addBtn    = qs('[data-shell-mode="Add"]');
        const updateBtn = qs('[data-shell-mode="Update"]');
        const saveBtn   = qs('[data-la-action="save"]');
        const cancelBtn = qs('[data-la-action="cancel"]');
        const deleteBtn = qs('[data-la-action="delete"]');

        const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;

        if (state.mode === MODES.VIEW) {
            if (!state.hasLoaded && !state.recordNotFound) {
                setButtonDisabled(viewBtn,   false);
                setButtonDisabled(addBtn,    true);
                setButtonDisabled(updateBtn, true);
                setButtonDisabled(saveBtn,   true);
                setButtonDisabled(cancelBtn, true);
                setButtonDisabled(deleteBtn, true);
            } else if (state.recordNotFound) {
                setButtonDisabled(viewBtn,   false);
                setButtonDisabled(addBtn,    false);
                setButtonDisabled(updateBtn, true);
                setButtonDisabled(saveBtn,   true);
                setButtonDisabled(cancelBtn, true);
                setButtonDisabled(deleteBtn, true);
            } else {
                setButtonDisabled(viewBtn,   true);
                setButtonDisabled(addBtn,    true);
                setButtonDisabled(updateBtn, false);
                setButtonDisabled(saveBtn,   true);
                setButtonDisabled(cancelBtn, false);
                setButtonDisabled(deleteBtn, false);
            }
        } else if (isEditable) {
            setButtonDisabled(viewBtn,   true);
            setButtonDisabled(addBtn,    true);
            setButtonDisabled(updateBtn, true);
            setButtonDisabled(saveBtn,   false);
            setButtonDisabled(cancelBtn, false);
            setButtonDisabled(deleteBtn, true);
        }
    }

    function updateGridButtons() {
        const isEditable     = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
        const hasRowSelected = state.selectedSlabIndex >= 0;
        const currentAction  = state.gridAction;

        const newBtn    = qs('[data-la-grid-action="new"]');
        const alterBtn  = qs('[data-la-grid-action="alter"]');
        const removeBtn = qs('[data-la-grid-action="remove"]');
        const updateBtn = qs('[data-la-grid-action="update"]');
        const clearBtn  = qs('[data-la-grid-action="clear"]');

        const descField = qs('#DetailDescription');
        const fromField = qs('#FromValue');
        const toField   = qs('#ToValue');

        const fieldsEditable = isEditable && (currentAction === 'new' || currentAction === 'alter');
        if (descField) descField.disabled = !fieldsEditable;
        if (fromField) fromField.disabled = !fieldsEditable;
        if (toField)   toField.disabled   = !fieldsEditable;

        if (!isEditable) {
            setButtonDisabled(newBtn,    true);
            setButtonDisabled(alterBtn,  true);
            setButtonDisabled(removeBtn, true);
            setButtonDisabled(updateBtn, true);
            setButtonDisabled(clearBtn,  true);
        } else if (currentAction === 'new' || currentAction === 'alter') {
            setButtonDisabled(newBtn,    true);
            setButtonDisabled(alterBtn,  true);
            setButtonDisabled(removeBtn, true);
            setButtonDisabled(updateBtn, false);
            setButtonDisabled(clearBtn,  false);
        } else {
            setButtonDisabled(newBtn,    false);
            setButtonDisabled(alterBtn,  !hasRowSelected);
            setButtonDisabled(removeBtn, !hasRowSelected);
            setButtonDisabled(updateBtn, true);
            setButtonDisabled(clearBtn,  true);
        }
    }

    // ─── Grid Actions ────────────────────────────────────────────────────
    function handleGridButton(e) {
        const action = e.currentTarget.dataset.laGridAction;
        switch (action) {
            case 'new':    handleGridNew();    break;
            case 'alter':  handleGridAlter();  break;
            case 'remove': handleGridRemove(); break;
            case 'update': handleGridUpdate(); break;
            case 'clear':  handleGridClear();  break;
        }
    }

    function handleGridNew() {
        state.gridAction = 'new';
        state.selectedSlabIndex = -1;
        setVal('DetailDescription', '');
        setVal('FromValue', '');
        setVal('ToValue', '');
        qsa('tr', qs('#slabsTableBody')).forEach(tr => tr.classList.remove('table-primary'));
        updateGridButtons();
        qs('#DetailDescription')?.focus();
        showMessage('Enter new slab details', 'info');
    }

    function handleGridAlter() {
        if (state.selectedSlabIndex < 0) { showMessage('Please select a row to alter', 'warning'); return; }
        state.gridAction = 'alter';
        updateGridButtons();
        qs('#DetailDescription')?.focus();
        showMessage('Modify the details and click Update', 'info');
    }

    function handleGridRemove() {
        if (state.selectedSlabIndex < 0) { showMessage('Please select a row to remove', 'warning'); return; }
        const slab = state.slabs[state.selectedSlabIndex];
        const desc = slab?.Description || 'this slab';
        const doRemove = () => { performRemoveSlab(); };

        if (typeof Swal !== 'undefined') {
            Swal.fire({
                title: 'Confirm Removal',
                text: `Remove "${desc}"?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, remove it'
            }).then(result => { if (result.isConfirmed) doRemove(); });
        } else if (confirm(`Remove "${desc}"?`)) {
            doRemove();
        }
    }

    function performRemoveSlab() {
        state.slabs.splice(state.selectedSlabIndex, 1);
        rerenderSlabsTable();
        handleGridClear();
        showMessage('Slab removed', 'success');
    }

    function handleGridUpdate() {
        const desc = qs('#DetailDescription')?.value?.trim() || '';
        const from = qs('#FromValue')?.value?.trim() || '';
        const to   = qs('#ToValue')?.value?.trim() || '';

        if (!desc) { showMessage('Please enter a description', 'warning'); return; }

        if (state.gridAction === 'alter' && state.selectedSlabIndex >= 0) {
            const existing = state.slabs[state.selectedSlabIndex];
            state.slabs[state.selectedSlabIndex] = { Description: desc, FromValue: from, ToValue: to, isNew: existing?.isNew ?? false };
            showMessage('Slab updated', 'success');
        } else if (state.gridAction === 'new') {
            state.slabs.push({ Description: desc, FromValue: from, ToValue: to, isNew: true });
            showMessage('Slab added', 'success');
        }

        setVal('NoOfSlabs', state.slabs.length);
        rerenderSlabsTable();
        handleGridClear();
    }

    function handleGridClear() {
        state.gridAction = null;
        state.selectedSlabIndex = -1;
        setVal('DetailDescription', '');
        setVal('FromValue', '');
        setVal('ToValue', '');
        qsa('tr', qs('#slabsTableBody')).forEach(tr => tr.classList.remove('table-primary'));
        updateGridButtons();
    }

    function rerenderSlabsTable() {
        const tbody = qs('#slabsTableBody');
        if (!tbody) return;
        tbody.innerHTML = '';
        if (!state.slabs.length) {
            tbody.innerHTML = '<tr><td colspan="3" class="text-muted text-center">No records to display.</td></tr>';
            return;
        }
        state.slabs.forEach((slab, i) => {
            const tr = document.createElement('tr');
            tr.dataset.index = i;
            tr.style.cursor = 'pointer';
            tr.innerHTML = `<td>${escHtml(slab.Description)}</td><td>${escHtml(slab.FromValue)}</td><td>${escHtml(slab.ToValue)}</td>`;
            tr.addEventListener('click', () => selectSlabRow(i));
            tbody.appendChild(tr);
        });
    }

    function selectSlabRow(index) {
        if (index < 0 || index >= state.slabs.length) return;
        state.selectedSlabIndex = index;
        state.gridAction = null;
        const slab = state.slabs[index];
        setVal('DetailDescription', slab.Description);
        setVal('FromValue', slab.FromValue);
        setVal('ToValue', slab.ToValue);
        qsa('tr', qs('#slabsTableBody')).forEach((tr, i) => tr.classList.toggle('table-primary', i === index));
        updateGridButtons();
    }

    // ─── Data Helpers ────────────────────────────────────────────────────
    function normKey(s) { return String(s ?? '').trim().toLowerCase().replace(/[_\-\s]+/g, ''); }

    function isMetaOnlyObject(obj) {
        if (!obj || typeof obj !== 'object') return false;
        const keys = Object.keys(obj).map(normKey);
        const hasMeta     = keys.some(k => k === 'eventid' || k === 'updatecount' || k === 'newdata' || k === 'operatorid');
        const hasBusiness = keys.some(k => k.includes('loananalysis') || k === 'description' || k.includes('analysis'));
        return hasMeta && !hasBusiness;
    }

    function pickValue(obj, preferred, fragments) {
        if (!obj || typeof obj !== 'object') return undefined;
        for (const k of preferred) { if (Object.prototype.hasOwnProperty.call(obj, k)) return obj[k]; }
        if (!fragments?.length) return undefined;
        for (const [k, v] of Object.entries(obj)) { if (fragments.some(f => normKey(k).includes(f))) return v; }
        return undefined;
    }

    function extractHeader(payload, loanAnalysisId) {
        if (!payload || typeof payload !== 'object') return null;

        const tryArrays = ['Details01', 'Details', 'details01', 'details'];
        for (const key of tryArrays) {
            const arr = payload[key];
            if (!Array.isArray(arr) || !arr.length) continue;
            for (const row of arr) {
                if (!row || isMetaOnlyObject(row)) continue;
                const id   = pickValue(row, ['LoanAnalysisID', 'LoanAnalysisId'], ['loananalysisid']);
                const type = pickValue(row, ['AnalysisTypeID', 'AnalysisTypeId'], ['analysistypeid']);
                if (id == null && type == null) continue;
                if (loanAnalysisId && id != null && String(id).trim() === String(loanAnalysisId).trim()) return row;
                return row;
            }
        }
        return null;
    }

    function extractSlabs(payload) {
        if (!payload || typeof payload !== 'object') return [];
        if (Array.isArray(payload.Details02) && payload.Details02.length) {
            return payload.Details02.filter(r => r && !isMetaOnlyObject(r));
        }
        function looksLikeSlab(r) {
            if (!r || typeof r !== 'object' || isMetaOnlyObject(r)) return false;
            const keys = Object.keys(r).map(normKey);
            return keys.some(x => x === 'fromvalue' || x.includes('from')) && keys.some(x => x === 'tovalue' || x.includes('to'));
        }
        for (const v of Object.values(payload)) {
            if (!Array.isArray(v) || !v.length) continue;
            const rows = v.filter(looksLikeSlab);
            if (rows.length) return rows;
        }
        return [];
    }

    function applyDataToForm(data) {
        if (!data) return;

        setVal('LoanAnalysisId', pickValue(data, ['LoanAnalysisID', 'LoanAnalysisId'], ['loananalysisid']) ?? '');
        setVal('Description',    pickValue(data, ['Description'], ['description']) ?? '');
        setVal('NoOfSlabs',      pickValue(data, ['NoOfSlabs', 'NoOfSlab'], ['noofslabs']) ?? '');

        const typeId = pickValue(data, ['AnalysisTypeID', 'AnalysisTypeId'], ['analysistypeid']);
        if (typeId != null) {
            setSelectValue(qs('#AnalysisTypeId'), String(typeId).trim());
            _applySlabVisibility(String(typeId).trim());
        }

        const uc = pickValue(data, ['UpdateCount'], ['updatecount']);
        if (uc != null) state.updateCount = parseInt(uc, 10) || 0;

        setText('CreatedBy',   pickValue(data, ['CreatedBy'],   ['createdby']) ?? '');
        setText('ModifiedBy',  pickValue(data, ['ModifiedBy'],  ['modifiedby']) ?? '');
        setText('SupervisedBy',pickValue(data, ['SupervisedBy'],['supervisedby']) ?? '');
        setText('CreatedOn',   pickValue(data, ['CreatedOn','CreatedDate'],  ['createdon','createddate']) ?? '');
        setText('ModifiedOn',  pickValue(data, ['ModifiedOn','ModifiedDate'],['modifiedon','modifieddate']) ?? '');
        setText('SupervisedOn',pickValue(data, ['SupervisedOn'],['supervisedon']) ?? '');
    }

    function setSelectValue(selectEl, value) {
        if (!selectEl) return;
        if (!value) { selectEl.value = ''; return; }
        const match = Array.from(selectEl.options).find(o => String(o.value).trim() === value);
        if (match) { selectEl.value = match.value; return; }
        const opt = document.createElement('option');
        opt.value = value;
        opt.textContent = value;
        selectEl.appendChild(opt);
        selectEl.value = value;
    }

    function renderSlabs(slabs) {
        const tbody = qs('#slabsTableBody');
        if (!tbody) return;

        state.slabs = (Array.isArray(slabs) ? slabs : []).map(row => ({
            Description: String(pickValue(row, ['Description', 'DetailDescription'], ['description']) ?? ''),
            FromValue:   String(pickValue(row, ['FromValue', 'AnalysisFrom'], ['fromvalue', 'analysisfrom', 'from']) ?? ''),
            ToValue:     String(pickValue(row, ['ToValue', 'AnalysisTo'], ['tovalue', 'analysisto', 'to']) ?? ''),
            isNew: false
        }));

        state.selectedSlabIndex = -1;
        rerenderSlabsTable();
    }

    function clearFormData() {
        const form = qs('#loan-analysis-form');
        if (!form) return;
        qsa('input:not([data-always-enabled]), select:not([data-always-enabled]), textarea:not([data-always-enabled])', form)
            .forEach(el => { el.value = ''; });
        ['CreatedBy','CreatedOn','ModifiedBy','ModifiedOn','SupervisedBy','SupervisedOn'].forEach(id => setText(id, ''));
        renderSlabs([]);
        state.hasLoaded = false;
        state.recordNotFound = false;
        state.updateCount = 0;
    }

    function escHtml(str) {
        return String(str ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    }

    // ─── Detail Records XML ──────────────────────────────────────────────
    function buildDetailRecordsXml() {
        if (!state.slabs.length) return '';
        const esc = s => String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
        return state.slabs.map((slab, i) =>
            `<dt_LoanAgingDetails><Description>${esc(slab.Description)}</Description><SLNo>${i + 1}</SLNo><AnalysisFrom>${esc(slab.FromValue)}</AnalysisFrom><AnalysisTo>${esc(slab.ToValue)}</AnalysisTo></dt_LoanAgingDetails>`
        ).join('');
    }

    // ─── CRUD Handlers ───────────────────────────────────────────────────
    async function handleSearch() {
        if (state.isBusy) return;
        const id = getValue('LoanAnalysisId');
        if (!id) { showMessage('Enter Loan Analysis ID.', 'warning'); return; }

        state.isBusy = true;
        showMessage('Loading...', 'info');

        try {
            const resp = await apiInvoke(endpoints.getLoanAnalysis, {
                LoanAnalysisID: id,
                BankID:      state.context.bankId,
                OurBranchID: state.context.branchId,
                OperatorID:  state.context.operatorId
            });

            if (!resp?.success) {
                clearFormData();
                showMessage(resp?.message || 'Record not found.', 'warning');
                state.recordNotFound = true;
                setMode(MODES.VIEW);
                return;
            }

            const payload = resp?.data ?? resp;
            const row     = extractHeader(payload, id);

            if (!row) {
                clearFormData();
                showMessage('Record not found.', 'warning');
                state.recordNotFound = true;
                setMode(MODES.VIEW);
                return;
            }

            applyDataToForm(row);
            renderSlabs(extractSlabs(payload));
            state.hasLoaded = true;
            state.recordNotFound = false;
            setMode(MODES.VIEW);
            showMessage('Loaded successfully.', 'success');

        } catch (err) {
            console.error('[LoanAnalysis] Load error:', err);
            showMessage(err?.message || 'Failed to load.', 'danger');
        } finally {
            state.isBusy = false;
        }
    }

    async function handleSave() {
        if (state.mode === MODES.VIEW) return;

        const id = getValue('LoanAnalysisId');
        if (!id) { showMessage('Loan Analysis ID is required.', 'warning'); return; }

        const isAdd = state.mode === MODES.ADD;

        // SP branching: @UpdateCount = 1 → INSERT, anything > 1 → UPDATE
        const updateCount = isAdd ? 1 : (state.updateCount || 2);

        state.isBusy = true;
        showMessage('Saving...', 'info');

        try {
            const resp = await apiInvoke(endpoints.saveLoanAnalysis, {
                LoanAnalysisID: id,
                Description:    getValue('Description'),
                AnalysisTypeID: getValue('AnalysisTypeId'),
                NoOfSlabs:      parseInt(getValue('NoOfSlabs') || '0', 10),
                CreatedBy:      state.context.operatorId,
                CreatedOn:      null,
                ModifiedBy:     isAdd ? null : state.context.operatorId,
                ModifiedOn:     null,
                SupervisedBy:   null,
                UpdateCount:    updateCount,
                DetailRecords:  buildDetailRecordsXml() || null,
                BankID:         state.context.bankId,
                OurBranchID:    state.context.branchId,
                OperatorID:     state.context.operatorId
            });

            if (resp?.success) {
                setMode(MODES.VIEW);
                // Reload the record so UpdateCount is refreshed for subsequent edits
                await handleSearch();
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Saved!',
                        text: 'Loan Analysis saved successfully.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    showMessage('Saved successfully.', 'success');
                }
            } else {
                const errMsg = resp?.message || 'Failed to save.';
                if (typeof Swal !== 'undefined') {
                    Swal.fire({ icon: 'error', title: 'Save Failed', text: errMsg });
                } else {
                    showMessage(errMsg, 'danger');
                }
            }
        } catch (err) {
            console.error('[LoanAnalysis] Save error:', err);
            const errMsg = err?.message || 'Failed to save.';
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: 'Save Error', text: errMsg });
            } else {
                showMessage(errMsg, 'danger');
            }
        } finally {
            state.isBusy = false;
        }
    }

    async function handleDelete() {
        const id = getValue('LoanAnalysisId');
        if (!id)              { showMessage('Loan Analysis ID is required for deletion.', 'warning'); return; }
        if (!state.hasLoaded) { showMessage('Please load a record first.', 'warning'); return; }

        let confirmed = false;
        if (typeof Swal !== 'undefined') {
            const result = await Swal.fire({
                title: 'Confirm Deletion',
                text: `Delete Loan Analysis "${id}"?`,
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it'
            });
            confirmed = result.isConfirmed;
        } else {
            confirmed = confirm(`Delete Loan Analysis "${id}"?`);
        }
        if (!confirmed) return;

        state.isBusy = true;
        showMessage('Deleting...', 'info');

        try {
            const resp = await apiInvoke(endpoints.deleteLoanAnalysis, {
                LoanAnalysisID: id,
                UpdateCount:    state.updateCount || 0,
                BankID:         state.context.bankId,
                OurBranchID:    state.context.branchId,
                OperatorID:     state.context.operatorId
            });

            if (resp?.success) {
                clearFormData();
                setMode(MODES.VIEW);
                if (typeof Swal !== 'undefined') {
                    Swal.fire({
                        icon: 'success',
                        title: 'Deleted!',
                        text: 'Loan Analysis deleted successfully.',
                        timer: 2000,
                        showConfirmButton: false
                    });
                } else {
                    showMessage('Deleted successfully.', 'success');
                }
            } else {
                const errMsg = resp?.message || 'Failed to delete.';
                if (typeof Swal !== 'undefined') {
                    Swal.fire({ icon: 'error', title: 'Delete Failed', text: errMsg });
                } else {
                    showMessage(errMsg, 'danger');
                }
            }
        } catch (err) {
            console.error('[LoanAnalysis] Delete error:', err);
            const errMsg = err?.message || 'Failed to delete.';
            if (typeof Swal !== 'undefined') {
                Swal.fire({ icon: 'error', title: 'Delete Error', text: errMsg });
            } else {
                showMessage(errMsg, 'danger');
            }
        } finally {
            state.isBusy = false;
        }
    }

    function handleCancel() {
        clearFormData();
        state.slabs = [];
        setMode(MODES.VIEW);
        showMessage('Cancelled.', 'info');
    }

    // ─── Analysis Types Loader ────────────────────────────────────────────
    async function loadAnalysisTypes() {
        if (state.typesLoaded) return;
        try {
            const response = await fetch(endpoints.getAnalysisTypes, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const resp = await response.json();
            if (!resp?.success) return;

            const data = resp.data || resp;
            let rows =
                (data?.Details01 && Array.isArray(data.Details01)) ? data.Details01 :
                (data?.Details   && Array.isArray(data.Details))   ? data.Details   :
                Array.isArray(data)                                 ? data           : [];

            if (!rows.length && typeof data?.Details === 'string') {
                try { rows = JSON.parse(data.Details); } catch { rows = []; }
            }

            state.analysisTypes = rows.map(r => ({
                value:          String(r.AnalysisTypeID ?? r.SubCodeID ?? '').trim(),
                text:           String(r.Description ?? '').trim(),
                isSlabRequired: r.IsSlabRequired === 1 || r.IsSlabRequired === true || r.IsSlabRequired === '1'
            })).filter(t => t.value);

            _populateTypeSelect(qs('#AnalysisTypeId'),      false);
            _populateTypeSelect(qs('#searchAnalysisTypeId'), true);

            state.typesLoaded = true;
        } catch (ex) {
            console.error('[LoanAnalysis] Failed to load analysis types:', ex);
        }
    }

    function _populateTypeSelect(sel, includeAll) {
        if (!sel) return;
        // Preserve current value
        const prev = sel.value;
        // Remove all but first option
        while (sel.options.length > 1) sel.remove(1);
        sel.options[0].value       = '';
        sel.options[0].textContent = includeAll ? '--All--' : '--Select--';

        state.analysisTypes.forEach(t => {
            const opt = document.createElement('option');
            opt.value       = t.value;
            opt.textContent = t.text;
            sel.appendChild(opt);
        });

        // Restore prior selection if still valid
        if (prev && Array.from(sel.options).some(o => o.value === prev)) sel.value = prev;

        if (typeof $ !== 'undefined' && typeof $.fn?.selectpicker !== 'undefined') {
            $(sel).selectpicker('refresh');
        }
    }

    function _applySlabVisibility(typeValue) {
        const typeData = state.analysisTypes.find(t => t.value === typeValue);
        const section  = qs('[data-section="analysis-details"]');
        if (!section) return;
        const content = section.querySelector('[data-section-content]');
        const header  = section.querySelector('.section-header');
        // Show slabs section only when IsSlabRequired (LoanAnalysisTypeID group)
        const show = !typeValue || typeData?.isSlabRequired !== false;
        if (content) content.style.display = show ? '' : 'none';
        if (header)  header.style.display  = show ? '' : 'none';
    }

    // ─── Search Modal ────────────────────────────────────────────────────
    function openSearchModal() {
        const modalEl  = qs('#loanAnalysisSearchModal');
        const Bootstrap = window.bootstrap || window.parent?.bootstrap;
        if (!modalEl || !Bootstrap) return;

        if (!searchModal) searchModal = new Bootstrap.Modal(modalEl);

        setVal('searchLoanAnalysisId', '');
        setVal('searchDescription',    '');
        const typeEl = qs('#searchAnalysisTypeId'); if (typeEl) typeEl.value = '';
        clearSearchResults();
        searchModal.show();

        setTimeout(() => performSearch(), 200);
    }

    async function performSearch() {
        const loader   = qs('#loanAnalysisSearchLoader');
        const emptyMsg = qs('#loanAnalysisSearchEmpty');
        const tbody    = qs('#loanAnalysisSearchResults');

        if (loader)   loader.classList.remove('d-none');
        if (emptyMsg) emptyMsg.classList.add('d-none');
        if (tbody)    tbody.innerHTML = '';

        try {
            // t_SystemSearchItem SearchID="LoanAnalysisID" → p_GetSearchResult
            // returns LoanAnalysisID, Description, AnalysisTypeID from t_LoanAnalysis.
            const resp = await apiInvoke(endpoints.searchLoanAnalysis, {
                LoanAnalysisID: getValue('searchLoanAnalysisId'),
                Description:    getValue('searchDescription'),
                AnalysisTypeID: getValue('searchAnalysisTypeId'),
                BankID:         state.context.bankId,
                OurBranchID:    state.context.branchId,
                OperatorID:     state.context.operatorId
            });

            if (!resp?.success) throw new Error(resp?.message || 'Search failed');

            const data = resp.data || resp;
            const rows =
                (data?.Details01 && Array.isArray(data.Details01) && data.Details01.length) ? data.Details01 :
                (data?.Details   && Array.isArray(data.Details)   && data.Details.length)   ? data.Details   :
                Array.isArray(data)                                                          ? data           : [];

            const results = rows
                .map(r => ({
                    LoanAnalysisID: String(r.LoanAnalysisID ?? '').trim(),
                    Description:    String(r.Description    ?? '').trim(),
                    AnalysisTypeID: String(r.AnalysisTypeID ?? '').trim()
                }))
                .filter(r => r.LoanAnalysisID);

            searchState.results       = results;
            searchState.selectedIndex = -1;
            renderSearchResults(results);

        } catch (err) {
            console.error('[LoanAnalysis] Search error:', err);
            if (emptyMsg) { emptyMsg.textContent = 'Search failed. Please try again.'; emptyMsg.classList.remove('d-none'); }
        } finally {
            if (loader) loader.classList.add('d-none');
        }
    }

    function clearSearchResults() {
        const tbody = qs('#loanAnalysisSearchResults'); if (tbody) tbody.innerHTML = '';
        const empty = qs('#loanAnalysisSearchEmpty');  if (empty) empty.classList.add('d-none');
        searchState.results = []; searchState.selectedIndex = -1;
        updateSearchNavButtons();
    }

    function renderSearchResults(results) {
        const tbody   = qs('#loanAnalysisSearchResults');
        const emptyEl = qs('#loanAnalysisSearchEmpty');
        if (!tbody) return;

        if (!results?.length) {
            tbody.innerHTML = '';
            if (emptyEl) { emptyEl.textContent = 'No results found.'; emptyEl.classList.remove('d-none'); }
            return;
        }
        if (emptyEl) emptyEl.classList.add('d-none');

        tbody.innerHTML = results.map((row, idx) => {
            const id   = escHtml(pickValue(row, ['LoanAnalysisID', 'LoanAnalysisId'], ['loananalysisid']) || '');
            const desc = escHtml(pickValue(row, ['Description'], ['description']) || '');
            const type = escHtml(pickValue(row, ['AnalysisTypeID', 'AnalysisTypeId'], ['analysistypeid']) || '');
            const bg   = idx % 2 === 0 ? '' : 'style="background:#e8f4fc"';
            return `<tr data-index="${idx}" ${bg} style="cursor:pointer"><td>${idx + 1}</td><td>${id}</td><td>${desc}</td><td>${type}</td></tr>`;
        }).join('');

        updateSearchNavButtons();
    }

    function updateSearchNavButtons() {
        const prev = qs('#btnSearchPrev');
        const next = qs('#btnSearchNext');
        if (prev) prev.disabled = searchState.selectedIndex <= 0;
        if (next) next.disabled = searchState.selectedIndex >= searchState.results.length - 1;
    }

    function selectAndClose() {
        if (searchState.selectedIndex < 0 || searchState.selectedIndex >= searchState.results.length) {
            showMessage('Please select a record first.', 'warning'); return;
        }
        const selected = searchState.results[searchState.selectedIndex];
        const id = String(selected.LoanAnalysisID || '');
        setVal('LoanAnalysisId', id);
        if (searchModal) searchModal.hide();
        handleSearch();
    }

    function navigateSearchResults(direction) {
        const newIdx = searchState.selectedIndex + direction;
        if (newIdx < 0 || newIdx >= searchState.results.length) return;
        searchState.selectedIndex = newIdx;
        const tbody = qs('#loanAnalysisSearchResults');
        if (tbody) {
            qsa('tr', tbody).forEach((r, i) => r.classList.toggle('table-primary', i === newIdx));
            const sel = tbody.querySelector(`tr[data-index="${newIdx}"]`);
            if (sel) sel.scrollIntoView({ block: 'nearest' });
        }
        updateSearchNavButtons();
    }

    function bindSearchModal() {
        const lookupBtn = qs('#btnLoanAnalysisLookup');
        if (lookupBtn) lookupBtn.addEventListener('click', async () => {
            await loadAnalysisTypes();
            openSearchModal();
        });

        const searchForm = qs('#loanAnalysisSearchForm');
        if (searchForm) searchForm.addEventListener('submit', e => { e.preventDefault(); performSearch(); });

        const searchBtn = qs('#btnSearchLoanAnalysis');
        if (searchBtn) searchBtn.addEventListener('click', () => performSearch());

        const tbody = qs('#loanAnalysisSearchResults');
        if (tbody) {
            tbody.addEventListener('click', e => {
                const row = e.target.closest('tr'); if (!row) return;
                const idx = parseInt(row.dataset.index, 10); if (isNaN(idx)) return;
                qsa('tr', tbody).forEach(r => r.classList.remove('table-primary'));
                row.classList.add('table-primary');
                searchState.selectedIndex = idx;
                updateSearchNavButtons();
            });
            tbody.addEventListener('dblclick', e => {
                const row = e.target.closest('tr'); if (!row) return;
                const idx = parseInt(row.dataset.index, 10); if (isNaN(idx)) return;
                searchState.selectedIndex = idx;
                selectAndClose();
            });
        }

        const okBtn     = qs('#btnSearchOk');             if (okBtn)     okBtn.addEventListener('click', selectAndClose);
        const refreshBtn = qs('#btnSearchRefreshLoanAnalysis'); if (refreshBtn) refreshBtn.addEventListener('click', () => performSearch());
        const resetBtn  = qs('#btnSearchResetLoanAnalysis');
        if (resetBtn) resetBtn.addEventListener('click', () => {
            setVal('searchLoanAnalysisId', '');
            setVal('searchDescription', '');
            const typeEl = qs('#searchAnalysisTypeId'); if (typeEl) typeEl.value = '';
            clearSearchResults();
        });
    }

    // ─── Mode Buttons ────────────────────────────────────────────────────
    function bindModeButtons() {
        qsa('[data-shell-mode]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const next = btn.getAttribute('data-shell-mode');
                if (!next || !Object.values(MODES).includes(next)) return;

                if (next === MODES.VIEW) {
                    const id = getValue('LoanAnalysisId');
                    if (id) { await handleSearch(); }
                    else    { showMessage('Please enter a Loan Analysis ID to view.', 'warning'); }
                    return;
                }
                setMode(next);
            });
        });
    }

    function bindActionButtons() {
        qs('[data-la-action="save"]')?.addEventListener('click', handleSave);
        qs('[data-la-action="cancel"]')?.addEventListener('click', handleCancel);
        qs('[data-la-action="delete"]')?.addEventListener('click', handleDelete);

        // Enter on ID field triggers view/search
        qs('#LoanAnalysisId')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); handleSearch(); }
        });

        // Toggle slabs section based on selected analysis type
        qs('#AnalysisTypeId')?.addEventListener('change', function () {
            _applySlabVisibility(this.value);
        });

        // Grid buttons
        qsa('[data-la-grid-action]').forEach(btn => btn.addEventListener('click', handleGridButton));
    }

    // ─── Init ────────────────────────────────────────────────────────────
    function init() {
        loadContext();
        wireSectionToggles();
        bindModeButtons();
        bindActionButtons();
        bindSearchModal();
        clearFormData();
        setMode(MODES.VIEW);
        void loadAnalysisTypes();
        console.log('[LoanAnalysis] Initialized');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();
