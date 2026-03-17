/**
 * Transaction Description Module
 * MVC Pattern: state + AppCore.invokeControllerAsync + POST endpoints
 */
(function () {
    'use strict';

    if (window.__kairoTransactionDescriptionLoaded) return;
    window.__kairoTransactionDescriptionLoaded = true;

    // ─── Constants ───────────────────────────────────────────────────────
    const MODES = { VIEW: 'View', ADD: 'Add', UPDATE: 'Update' };

    const endpoints = {
        get:    'StaticData/TransactionDescription/GetTrxDescription',
        search: 'StaticData/TransactionDescription/SearchTrxDescription',
        save:   'StaticData/TransactionDescription/SaveTrxDescription',
        delete: 'StaticData/TransactionDescription/DeleteTrxDescription'
    };

    // ─── State ───────────────────────────────────────────────────────────
    const state = {
        mode: MODES.VIEW,
        hasLoaded: false,
        canAddFromId: false,
        lastLoadedRow: null,
        updateCount: 0,
        isBusy: false,
        trxModalInstance: null,
        context: { bankId: '', branchId: '', operatorId: '', moduleId: '' }
    };

    // ─── DOM Helpers ─────────────────────────────────────────────────────
    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

    // ─── Context ─────────────────────────────────────────────────────────
    function loadContext() {
        state.context.moduleId   = (qs('#moduleId_trxDescription')?.value || '').trim();
        state.context.operatorId = (qs('#OperatorID')?.value || '').trim()
                                 || sessionStorage.getItem('user_name') || '';
        state.context.branchId   = (qs('#hdn_BranchCode')?.value || '').trim()
                                 || sessionStorage.getItem('branch_code') || '';
        state.context.bankId     = (qs('#hdn_BankId')?.value || '').trim()
                                 || sessionStorage.getItem('bank_id') || '';
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
        const icon  = qs('#icn_messageIcon');
        const span  = qs('#spn_messageText');
        if (!panel) return;

        if (icon) {
            icon.className = type === 'success' ? 'bi bi-check-circle-fill text-success'
                           : type === 'danger'  ? 'bi bi-exclamation-triangle-fill text-danger'
                           : type === 'warning' ? 'bi bi-exclamation-circle-fill text-warning'
                           :                      'bi bi-info-circle-fill text-info';
        }
        if (span) span.textContent = text || '';
        panel.classList.remove('d-none');
    }

    function clearMessage() {
        const panel = qs('#dv_messagePanel');
        const span  = qs('#spn_messageText');
        const icon  = qs('#icn_messageIcon');
        if (span) span.textContent = '';
        if (icon) icon.className = 'bi bi-info-circle';
        if (panel) panel.classList.add('d-none');
    }

    // ─── Button helpers ───────────────────────────────────────────────────
    function setDisabled(el, disabled) {
        if (!el) return;
        el.disabled = !!disabled;
        el.setAttribute('aria-disabled', String(!!disabled));
        el.classList.toggle('is-disabled', !!disabled);
    }

    function getActionButtons() {
        return {
            view:   qs('[data-shell-mode="View"]'),
            add:    qs('[data-shell-mode="Add"]'),
            edit:   qs('[data-shell-mode="Update"]'),
            del:    qs('[data-td-action="delete"]'),
            save:   qs('[data-td-action="save"]'),
            cancel: qs('[data-td-action="cancel"]'),
            prev:   qs('[data-td-nav="prev"]'),
            next:   qs('[data-td-nav="next"]')
        };
    }

    function updateActionButtons() {
        const { view, add, edit, del, save, cancel, prev, next } = getActionButtons();
        const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;
        const canNav = state.mode === MODES.VIEW && state.hasLoaded;

        setDisabled(view,   isEditable || (state.mode === MODES.VIEW && state.hasLoaded));
        setDisabled(add,    !(state.mode === MODES.VIEW && state.canAddFromId && !state.hasLoaded));
        setDisabled(edit,   !state.hasLoaded || state.mode === MODES.UPDATE);
        setDisabled(save,   !isEditable);
        setDisabled(cancel, !(isEditable || state.hasLoaded || state.canAddFromId));
        setDisabled(del,    !state.hasLoaded);
        setDisabled(prev,   !canNav);
        setDisabled(next,   !canNav);
    }

    // ─── Mode management ─────────────────────────────────────────────────
    function setMode(nextMode) {
        state.mode = nextMode;

        const form = qs('#transaction-description-form');
        if (!form) return;

        const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

        qsa('input, select, textarea', form).forEach(el => {
            if (el.hasAttribute('data-always-enabled')) { el.disabled = false; return; }
            if (el.hasAttribute('data-never-editable')) { el.disabled = true; return; }
            el.disabled = !isEditable;
        });

        updateActionButtons();
    }

    // ─── Form utilities ───────────────────────────────────────────────────
    function getTrxId() {
        return (qs('#TrxDescriptionID')?.value || '').trim();
    }

    function clearForm({ keepId = false } = {}) {
        clearMessage();
        const form = qs('#transaction-description-form');
        if (!form) return;

        const savedId = keepId ? getTrxId() : '';

        qsa('input, select, textarea', form).forEach(el => {
            const id = el.getAttribute('id') || '';
            if (id === 'TrxDescriptionID' && keepId) return;
            if (el.hasAttribute('data-never-editable')) return; // leave system flags alone
            if (el.type === 'checkbox') { el.checked = false; return; }
            if (el.tagName === 'SELECT') { el.value = ''; return; }
            el.value = '';
        });

        qsa('[data-td-audit]', form).forEach(el => { el.textContent = ''; });

        const idEl = qs('#TrxDescriptionID');
        if (idEl) idEl.value = keepId ? savedId : '';
    }

    function fillForm(row) {
        if (!row || typeof row !== 'object') return;

        function setVal(id, val) {
            const el = qs('#' + id);
            if (el && val != null) el.value = String(val);
        }
        function setChk(id, val) {
            const el = qs('#' + id);
            if (!el) return;
            const s = String(val ?? '').toLowerCase();
            el.checked = val === 1 || val === true || s === 'y' || s === 'true' || s === '1' || s === 'yes';
        }
        function setText(id, val) {
            const el = qs('#' + id);
            if (el && val != null) el.textContent = String(val);
        }

        const updateCount = row.UpdateCount ?? row.updateCount ?? row.NewRecord;
        if (updateCount != null) state.updateCount = Number(updateCount) || 0;

        setVal('TrxDescriptionID', row.TrxDescriptionID ?? row.ID ?? row.TrxID ?? row.TransactionID);
        setVal('Description',      row.Description ?? row.TrxDescription ?? row.TrxName ?? row.TransactionName);
        setVal('TransactionTypeID',row.TransactionTypeID ?? row.TransactionType ?? row.TrxType ?? row.TypeID);
        setVal('TrxCategoryID',    row.TrxCategoryID ?? row.TrxCategory ?? row.CategoryID ?? row.Category);

        setChk('IsChargeable', row.IsChargeable ?? row.Chargeable);
        setChk('IsBlocked',    row.IsBlocked    ?? row.Blocked);
        setChk('IsSystemTrx',  row.IsSystemTrx  ?? row.IsSystem  ?? row.SystemTrx);

        // Audit
        setText('CreatedBy',   row.CreatedBy   ?? row.MakerID);
        setText('CreatedOn',   row.CreatedOn   ?? row.CreatedDate ?? row.MakerTime);
        setText('ModifiedBy',  row.ModifiedBy  ?? row.ModifierID);
        setText('ModifiedOn',  row.ModifiedOn  ?? row.ModifiedDate ?? row.ModifierTime);
        setText('SupervisedBy',row.SupervisedBy ?? row.CheckerID);
        setText('SupervisedOn',row.SupervisedOn ?? row.SupervisedDate ?? row.CheckerTime);
    }

    function readFormRow() {
        function v(id)   { return (qs('#' + id)?.value || '').trim(); }
        function chk(id) { return qs('#' + id)?.checked ? 1 : 0; }

        const current = state.lastLoadedRow || {};
        return {
            BankID:           state.context.bankId,
            OurBranchID:      state.context.branchId,
            OperatorID:       state.context.operatorId,
            TrxDescriptionID: v('TrxDescriptionID'),
            Description:      v('Description'),
            TransactionTypeID:v('TransactionTypeID'),
            TrxCategoryID:    v('TrxCategoryID'),
            IsChargeable:     chk('IsChargeable'),
            IsBlocked:        chk('IsBlocked'),
            IsSystemTrx:      chk('IsSystemTrx'),
            CreatedBy:        current.CreatedBy   || current.MakerID || state.context.operatorId,
            CreatedOn:        state.mode === MODES.ADD ? '' : (current.CreatedOn ?? current.CreatedDate ?? ''),
            ModifiedBy:       state.context.operatorId,
            ModifiedOn:       state.mode === MODES.ADD ? '' : (current.ModifiedOn ?? current.ModifiedDate ?? ''),
            SupervisedBy:     current.SupervisedBy || current.CheckerID || '',
            NewRecord:        state.mode === MODES.ADD ? 1 : (state.updateCount || 0)
        };
    }

    // ─── Row helpers ──────────────────────────────────────────────────────
    function extractRows(resp) {
        const candidates = [
            resp?.data?.Details01, resp?.Details01,
            resp?.data?.Details,   resp?.Details,
            resp?.data?.SearchResults, resp?.SearchResults
        ];
        const toRows = v => Array.isArray(v) ? v : (v && typeof v === 'object' ? [v] : []);
        for (const c of candidates) {
            const rows = toRows(c);
            if (rows.length) return rows;
        }
        return [];
    }

    function pickFirstRow(resp) {
        const rows = extractRows(resp);
        return rows.length ? rows[0] : null;
    }

    // ─── Load record ──────────────────────────────────────────────────────
    async function loadById(direction = 0) {
        if (state.isBusy) return;

        const id = getTrxId();
        if (!id && direction === 0) {
            clearForm();
            state.hasLoaded = false;
            state.canAddFromId = false;
            updateActionButtons();
            return;
        }

        state.isBusy = true;
        updateActionButtons();

        try {
            clearMessage();
            const resp = await apiInvoke(endpoints.get, {
                TrxDescriptionID: id,
                BankID:           state.context.bankId,
                OurBranchID:      state.context.branchId,
                OperatorID:       state.context.operatorId,
                Direction:        direction
            });

            if (resp?.success) {
                const row = pickFirstRow(resp);
                if (row) {
                    fillForm(row);
                    state.lastLoadedRow = { ...row };
                    state.hasLoaded = true;
                    state.canAddFromId = false;

                    // After navigate, update the ID field from the loaded row
                    if (direction !== 0) {
                        const newId = row.TrxDescriptionID ?? row.ID ?? row.TrxID ?? '';
                        const idEl = qs('#TrxDescriptionID');
                        if (idEl && newId) idEl.value = String(newId);
                    }

                    setMode(MODES.VIEW);
                    showMessage('Record loaded.', 'success');
                } else {
                    clearForm({ keepId: true });
                    state.hasLoaded = false;
                    state.canAddFromId = true;
                    setMode(MODES.VIEW);
                    showMessage('Record not found. Click Add to create.', 'warning');
                }
            } else {
                clearForm({ keepId: true });
                state.hasLoaded = false;
                state.canAddFromId = true;
                setMode(MODES.VIEW);
                showMessage(resp?.message || 'Record not found. Click Add to create.', 'warning');
            }
        } catch (ex) {
            showMessage(ex?.message || 'Failed to load record.', 'danger');
        } finally {
            state.isBusy = false;
            updateActionButtons();
        }
    }

    // ─── Lookup Modal ─────────────────────────────────────────────────────
    function getLookupEls() {
        const modal = qs('#trxLookupModal');
        if (!modal) return null;
        return {
            modal,
            form:    qs('#trxLookupForm',    modal),
            id:      qs('#trxSearchId',      modal),
            name:    qs('#trxSearchName',    modal),
            modeId:  qs('#trxSearchModeId',  modal),
            modeName:qs('#trxSearchModeName',modal),
            reset:   qs('#trxSearchReset',   modal),
            refresh: qs('#trxSearchRefresh', modal),
            results: qs('#trxSearchResults', modal),
            empty:   qs('#trxSearchEmpty',   modal),
            loading: qs('#trxSearchLoading', modal)
        };
    }

    async function performSearch(e) {
        if (e?.preventDefault) e.preventDefault();
        const els = getLookupEls();
        if (!els?.results) return;

        if (els.loading) els.loading.classList.remove('d-none');
        if (els.empty)   els.empty.style.display = 'none';
        els.results.innerHTML = '';

        try {
            const resp = await apiInvoke(endpoints.search, {
                TrxDescriptionID: (els.id?.value   || '').trim(),
                Description:      (els.name?.value || '').trim(),
                IdMode:           els.modeId?.value   || 'Like',
                DescMode:         els.modeName?.value || 'Like',
                OurBranchID:      state.context.branchId,
                OperatorID:       state.context.operatorId,
                ModuleID:         parseInt(state.context.moduleId, 10) || 1000
            });

            const rows = extractRows(resp);
            if (!rows.length) {
                if (els.empty) { els.empty.textContent = 'No records found.'; els.empty.style.display = 'block'; }
                return;
            }

            const frag = document.createDocumentFragment();
            rows.forEach(row => {
                const id   = String(row.TrxDescriptionID ?? row.ID ?? row.TrxID ?? '');
                const desc = String(row.Description ?? row.TrxDescription ?? row.TrxName ?? '');
                let   type = String(row.TransactionTypeID ?? row.TransactionType ?? row.TrxType ?? '');
                if (type === '1') type = 'Debit';
                else if (type === '2') type = 'Credit';
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.setAttribute('data-trx-id', id);
                tr.innerHTML = `<td>${id}</td><td>${desc}</td><td>${type}</td>`;
                frag.appendChild(tr);
            });
            els.results.appendChild(frag);
        } catch (ex) {
            if (els.empty) { els.empty.textContent = 'Search failed.'; els.empty.style.display = 'block'; }
        } finally {
            if (els.loading) els.loading.classList.add('d-none');
        }
    }

    function confirmSelection(id) {
        if (!id) return;
        if (state.trxModalInstance) state.trxModalInstance.hide();
        const idEl = qs('#TrxDescriptionID');
        if (idEl) idEl.value = id;
        void loadById(0);
    }

    function openModal() {
        const els = getLookupEls();
        if (!els?.modal) return;
        if (!state.trxModalInstance) {
            state.trxModalInstance = new bootstrap.Modal(els.modal);
        }
        state.trxModalInstance.show();
        setTimeout(() => els.id?.focus(), 150);
    }

    function wireLookupModal() {
        const els = getLookupEls();
        if (!els?.form) return;

        els.form.addEventListener('submit', e => performSearch(e));

        els.reset?.addEventListener('click', () => {
            if (els.id)       els.id.value = '';
            if (els.name)     els.name.value = '';
            if (els.modeId)   els.modeId.value = 'Like';
            if (els.modeName) els.modeName.value = 'Like';
            els.results.innerHTML = '';
            if (els.empty) { els.empty.textContent = 'Enter at least one filter above and click Search to query records.'; els.empty.style.display = 'block'; }
        });

        els.refresh?.addEventListener('click', () => performSearch());

        els.results?.addEventListener('click', e => {
            const tr = e.target?.closest?.('tr[data-trx-id]');
            if (tr) confirmSelection(tr.getAttribute('data-trx-id'));
        });
        els.results?.addEventListener('dblclick', e => {
            const tr = e.target?.closest?.('tr[data-trx-id]');
            if (tr) confirmSelection(tr.getAttribute('data-trx-id'));
        });
    }

    // ─── Action bindings ──────────────────────────────────────────────────
    function bindModeButtons() {
        qsa('[data-shell-mode]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const next = btn.getAttribute('data-shell-mode');
                if (!next) return;

                if (next === MODES.VIEW) {
                    await loadById(0);
                    return;
                }
                if (next === MODES.ADD) {
                    if (!getTrxId()) { showMessage('Enter Transaction ID first.', 'warning'); return; }
                    if (!state.canAddFromId) { showMessage('Click View first to confirm the record does not exist.', 'warning'); return; }
                    clearForm({ keepId: true });
                    setMode(MODES.ADD);
                    showMessage('Add mode — fill in the details and click Save.', 'info');
                    return;
                }
                if (next === MODES.UPDATE) {
                    if (!state.hasLoaded) { showMessage('Load a record first before editing.', 'warning'); return; }
                    setMode(MODES.UPDATE);
                    showMessage('Edit mode.', 'info');
                    return;
                }
                setMode(next);
            });
        });
    }

    function bindIdWatcher() {
        const idEl = qs('#TrxDescriptionID');
        if (!idEl) return;
        idEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); void loadById(0); }
        });
        idEl.addEventListener('input', () => {
            if (!idEl.value.trim()) {
                clearForm();
                state.hasLoaded = false;
                state.canAddFromId = false;
                updateActionButtons();
            }
        });
    }

    function bindActions() {
        const { save, cancel, del, prev, next } = getActionButtons();
        const searchBtn = qs('[data-td-action="search"]') || qs('#btnLookupTrx');

        searchBtn?.addEventListener('click', () => openModal());

        // Prev / Next navigation
        prev?.addEventListener('click', () => void loadById(-1));
        next?.addEventListener('click', () => void loadById(1));

        // Save
        save?.addEventListener('click', async () => {
            if (state.isBusy || state.mode === MODES.VIEW) return;

            const payload = readFormRow();
            if (!payload.TrxDescriptionID) { showMessage('Transaction ID is required.', 'warning'); return; }
            if (!payload.Description) { showMessage('Description is required.', 'warning'); return; }

            state.isBusy = true;
            showMessage('Saving...', 'info');

            try {
                const resp = await apiInvoke(endpoints.save, payload);

                if (resp?.success) {
                    showMessage('Saved successfully.', 'success');
                    clearForm({ keepId: true });
                    state.hasLoaded = false;
                    state.canAddFromId = false;
                    state.lastLoadedRow = null;
                    setMode(MODES.VIEW);
                } else {
                    const msg = resp?.message || 'Save failed.';
                    const code = resp?.code ? ` (${resp.code})` : '';

                    const lower = msg.toLowerCase();
                    if (lower.includes('another user') || lower.includes('already updated') || lower.includes('concurrent')) {
                        const confirmed = window.Swal
                            ? (await window.Swal.fire({
                                icon: 'warning',
                                title: 'Record was changed',
                                text: 'Another user updated this record. Reload latest and retry?',
                                showCancelButton: true,
                                confirmButtonText: 'Reload & Retry',
                                cancelButtonText: 'Cancel'
                              })).isConfirmed
                            : window.confirm('Another user updated this record. Reload and retry?');

                        if (confirmed) {
                            await loadById(0);
                            setMode(MODES.UPDATE);
                        }
                        return;
                    }
                    showMessage(`${msg}${code}`, 'danger');
                }
            } catch (ex) {
                showMessage(ex?.message || 'Save failed.', 'danger');
            } finally {
                state.isBusy = false;
                updateActionButtons();
            }
        });

        // Cancel
        cancel?.addEventListener('click', () => {
            if (state.mode === MODES.UPDATE && state.lastLoadedRow) {
                fillForm(state.lastLoadedRow);
                setMode(MODES.VIEW);
                showMessage('Cancelled.', 'info');
                return;
            }
            clearForm({ keepId: state.mode === MODES.ADD });
            state.hasLoaded = false;
            state.canAddFromId = false;
            state.lastLoadedRow = null;
            setMode(MODES.VIEW);
            showMessage('Cleared.', 'info');
        });

        // Delete
        del?.addEventListener('click', async () => {
            if (!state.hasLoaded) return;

            const id = getTrxId();
            const confirmed = window.Swal
                ? (await window.Swal.fire({
                    icon: 'warning',
                    title: 'Confirm delete',
                    text: `Delete transaction description "${id}"?`,
                    showCancelButton: true,
                    confirmButtonText: 'Delete',
                    confirmButtonColor: '#dc3545'
                  })).isConfirmed
                : window.confirm(`Delete transaction description "${id}"?`);

            if (!confirmed) return;

            state.isBusy = true;
            showMessage('Deleting...', 'info');

            try {
                const resp = await apiInvoke(endpoints.delete, {
                    TrxDescriptionID: id,
                    BankID:           state.context.bankId,
                    OurBranchID:      state.context.branchId,
                    OperatorID:       state.context.operatorId,
                    NewRecord:        state.updateCount
                });

                if (resp?.success) {
                    showMessage('Deleted successfully.', 'success');
                    clearForm();
                    state.hasLoaded = false;
                    state.canAddFromId = false;
                    state.lastLoadedRow = null;
                    setMode(MODES.VIEW);
                } else {
                    showMessage(resp?.message || 'Delete failed.', 'danger');
                }
            } catch (ex) {
                showMessage(ex?.message || 'Delete failed.', 'danger');
            } finally {
                state.isBusy = false;
                updateActionButtons();
            }
        });
    }

    // ─── Section toggles ─────────────────────────────────────────────────
    function wireSectionToggles() {
        qsa('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const content = header.closest('.form-section')?.querySelector('[data-section-content]');
                const icon    = header.querySelector('.section-toggle-btn i');
                if (!content) return;
                const isHidden = content.style.display === 'none';
                content.style.display = isHidden ? '' : 'none';
                if (icon) icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
                header.querySelector('.section-toggle-btn')?.setAttribute('aria-expanded', String(isHidden));
            });
        });
    }

    // ─── Init ─────────────────────────────────────────────────────────────
    function init() {
        loadContext();
        wireSectionToggles();
        wireLookupModal();
        bindModeButtons();
        bindIdWatcher();
        bindActions();
        setMode(MODES.VIEW);
        clearMessage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
