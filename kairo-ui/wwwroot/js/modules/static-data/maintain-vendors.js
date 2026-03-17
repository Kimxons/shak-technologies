/**
 * Maintain Vendors Module
 * MVC Pattern: state + AppCore.invokeControllerAsync + POST endpoints
 */
(function () {
    'use strict';

    if (window.__kairoMaintainVendorsLoaded) return;
    window.__kairoMaintainVendorsLoaded = true;

    // ─── Constants ───────────────────────────────────────────────────────
    const MODES = { VIEW: 'View', ADD: 'Add', UPDATE: 'Update' };

    const endpoints = {
        getVendor:        'StaticData/MaintainVendors/GetVendor',
        searchVendor:     'StaticData/MaintainVendors/SearchVendor',
        getContactPerson: 'StaticData/MaintainVendors/GetContactPerson',
        saveVendor:       'StaticData/MaintainVendors/SaveVendor',
        deleteVendor:     'StaticData/MaintainVendors/DeleteVendor'
    };

    // ─── State ───────────────────────────────────────────────────────────
    const state = {
        mode: MODES.VIEW,
        hasLoaded: false,
        canAddFromId: false,
        lastLoadedRow: null,
        updateCount: 0,
        isBusy: false,
        vendorModalInstance: null,
        context: { bankId: '', branchId: '', operatorId: '', moduleId: '' }
    };

    // ─── DOM Helpers ─────────────────────────────────────────────────────
    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

    // ─── Context ─────────────────────────────────────────────────────────
    function loadContext() {
        state.context.moduleId   = (qs('#moduleId_maintainVendors')?.value || '').trim();
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
            del:    qs('[data-mv-action="delete"]'),
            save:   qs('[data-mv-action="save"]'),
            cancel: qs('[data-mv-action="cancel"]')
        };
    }

    function updateActionButtons() {
        const { view, add, edit, del, save, cancel } = getActionButtons();
        const isEditable = state.mode === MODES.ADD || state.mode === MODES.UPDATE;

        setDisabled(view,   isEditable || (state.mode === MODES.VIEW && state.hasLoaded));
        setDisabled(add,    !(state.mode === MODES.VIEW && state.canAddFromId && !state.hasLoaded));
        setDisabled(edit,   !state.hasLoaded || state.mode === MODES.UPDATE);
        setDisabled(save,   !isEditable);
        setDisabled(cancel, !(isEditable || state.hasLoaded || state.canAddFromId));
        setDisabled(del,    !state.hasLoaded);
    }

    // ─── Mode management ─────────────────────────────────────────────────
    function setMode(nextMode) {
        state.mode = nextMode;
        if (nextMode === MODES.ADD) state.updateCount = 0;

        const form = qs('#maintain-vendors-form');
        if (!form) return;

        const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

        qsa('input, select, textarea', form).forEach(el => {
            if (el.hasAttribute('data-always-enabled')) { el.disabled = false; return; }
            el.disabled = !isEditable;
        });

        qsa('[data-always-enabled]', form).forEach(el => { el.disabled = false; });

        updateActionButtons();
    }

    // ─── Form utilities ───────────────────────────────────────────────────
    function getVendorId() {
        return (qs('#VendorId')?.value || '').trim();
    }

    function clearForm({ keepId = false } = {}) {
        clearMessage();
        const form = qs('#maintain-vendors-form');
        if (!form) return;

        const savedId = keepId ? getVendorId() : '';

        qsa('input, select, textarea', form).forEach(el => {
            const id = el.getAttribute('id') || '';
            if (id === 'VendorId' && keepId) return;
            if (el.tagName === 'INPUT' && el.type === 'checkbox') { el.checked = false; return; }
            if (el.tagName === 'SELECT') { el.value = ''; return; }
            el.value = '';
            el.removeAttribute('data-iso-value');
        });

        qsa('[data-mv-audit]', form).forEach(el => { el.textContent = ''; });

        const idEl = qs('#VendorId');
        if (idEl) idEl.value = keepId ? savedId : '';
    }

    function fillForm(row) {
        if (!row || typeof row !== 'object') return;

        function setVal(id, val) {
            const el = qs('#' + id);
            if (el && val != null) el.value = String(val);
        }
        function setText(id, val) {
            const el = qs('#' + id);
            if (el && val != null) el.textContent = String(val);
        }

        const updateCount = row.UpdateCount ?? row.updateCount;
        if (updateCount != null) state.updateCount = Number(updateCount) || 0;

        const id = row.VendorID ?? row.VendorId ?? row.vendorId ?? row.vendorID;
        if (id != null) setVal('VendorId', id);

        setVal('VendorName',          row.VendorName    ?? row.Name);
        setVal('Address1',            row.Address1);
        setVal('Address2',            row.Address2);
        setVal('ZipCode',             row.ZipCode);
        setVal('EmailId',             row.Email ?? row.EmailId ?? row.EmailID);
        setVal('PhoneHome',           row.Phone1    ?? row.PhoneHome);
        setVal('PhoneWork',           row.Phone2    ?? row.PhoneWork);
        setVal('Mobile',              row.Mobile);
        setVal('FaxNo',               row.Fax ?? row.FaxNo);
        setVal('ContactPerson',       row.ContactPersonID ?? row.ContactPerson);
        setVal('ContactPersonName',   row.ContactPersonName);
        setVal('ProductsDealingWith', row.ProductDetails ?? row.ProductsDealingWith);

        // Dropdowns
        const cityEl    = qs('#City');
        const countryEl = qs('#Country');
        const cityId    = row.CityID    ?? row.CityId    ?? row.City;
        const countryId = row.CountryID ?? row.CountryId ?? row.Country;
        if (cityEl    && cityId    != null) cityEl.value    = String(cityId);
        if (countryEl && countryId != null) countryEl.value = String(countryId);

        // Audit
        setText('CreatedBy',   row.CreatedBy);
        setText('CreatedOn',   row.CreatedOn    ?? row.CreatedDate);
        setText('ModifiedBy',  row.ModifiedBy);
        setText('ModifiedOn',  row.ModifiedOn   ?? row.ModifiedDate);
        setText('SupervisedBy',row.SupervisedBy);
        setText('SupervisedOn',row.SupervisedOn);
    }

    function readFormRow() {
        function v(id) { return (qs('#' + id)?.value || '').trim(); }

        const current = state.lastLoadedRow || {};
        return {
            BankID:             state.context.bankId,
            OurBranchID:        state.context.branchId,
            OperatorID:         state.context.operatorId,
            VendorID:           v('VendorId'),
            VendorName:         v('VendorName'),
            Address1:           v('Address1'),
            Address2:           v('Address2'),
            CityID:             v('City'),
            CountryID:          v('Country'),
            ZipCode:            v('ZipCode'),
            Email:              v('EmailId'),
            Phone1:             v('PhoneHome'),
            Phone2:             v('PhoneWork'),
            Mobile:             v('Mobile'),
            Fax:                v('FaxNo'),
            ContactPersonID:    v('ContactPerson'),
            ContactPersonName:  v('ContactPersonName'),
            ProductDetails:     v('ProductsDealingWith'),
            CreatedBy:          current.CreatedBy  || current.CreatedBY  || state.context.operatorId,
            CreatedOn:          state.mode === MODES.ADD  ? '' : (current.CreatedOn ?? current.CreatedDate ?? ''),
            ModifiedBy:         state.context.operatorId,
            ModifiedOn:         state.mode === MODES.ADD  ? '' : (current.ModifiedOn ?? current.ModifiedDate ?? ''),
            SupervisedBy:       current.SupervisedBy || current.SupervisedBY || '',
            NewRecord:          state.mode === MODES.ADD  ? 1 : (state.updateCount || 0)
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
    async function loadVendorById() {
        if (state.isBusy) return;

        const id = getVendorId();
        if (!id) {
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
            const resp = await apiInvoke(endpoints.getVendor, {
                VendorID:    id,
                BankID:      state.context.bankId,
                OurBranchID: state.context.branchId,
                OperatorID:  state.context.operatorId,
                Direction:   0
            });

            if (resp?.success) {
                const row = pickFirstRow(resp);
                if (row) {
                    fillForm(row);
                    state.lastLoadedRow = { ...row };
                    state.hasLoaded = true;
                    state.canAddFromId = false;
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

    // ─── Contact Person lookup ────────────────────────────────────────────
    async function lookupContactPerson() {
        const id = (qs('#ContactPerson')?.value || '').trim();
        const nameEl = qs('#ContactPersonName');
        if (!id) { if (nameEl) nameEl.value = ''; return; }

        try {
            const resp = await apiInvoke(endpoints.getContactPerson, { ContactPersonID: id });
            if (resp?.success) {
                const row = pickFirstRow(resp);
                const name = row?.ContactPersonName ?? row?.Name ?? row?.FullName ?? '';
                if (nameEl) nameEl.value = name ? String(name) : '';
            } else {
                if (nameEl) nameEl.value = '';
            }
        } catch (ex) {
            console.warn('[MaintainVendors] Contact person lookup failed', ex);
            if (nameEl) nameEl.value = '';
        }
    }

    // ─── Vendor Search Modal ─────────────────────────────────────────────
    function getLookupEls() {
        const modal = qs('#vendorLookupModal');
        if (!modal) return null;
        return {
            modal,
            form:    qs('#vendorLookupForm',    modal),
            id:      qs('#vendorSearchId',      modal),
            name:    qs('#vendorSearchName',    modal),
            modeId:  qs('#vendorSearchModeId',  modal),
            modeName:qs('#vendorSearchModeName',modal),
            reset:   qs('#vendorSearchReset',   modal),
            refresh: qs('#vendorSearchRefresh', modal),
            results: qs('#vendorSearchResults', modal),
            empty:   qs('#vendorSearchEmpty',   modal),
            loading: qs('#vendorSearchLoading', modal)
        };
    }

    async function performVendorSearch(e) {
        if (e?.preventDefault) e.preventDefault();
        const els = getLookupEls();
        if (!els?.results) return;

        if (els.loading) els.loading.classList.remove('d-none');
        if (els.empty)   els.empty.style.display = 'none';
        els.results.innerHTML = '';

        try {
            const resp = await apiInvoke(endpoints.searchVendor, {
                VendorID:      (els.id?.value   || '').trim(),
                VendorName:    (els.name?.value || '').trim(),
                VendorIdMode:  els.modeId?.value   || 'Like',
                VendorNameMode:els.modeName?.value || 'Like',
                OurBranchID:   state.context.branchId,
                OperatorID:    state.context.operatorId,
                ModuleID:      parseInt(state.context.moduleId, 10) || 1000
            });

            const rows = extractRows(resp);
            if (!rows.length) {
                if (els.empty) { els.empty.textContent = 'No vendors found.'; els.empty.style.display = 'block'; }
                return;
            }

            const frag = document.createDocumentFragment();
            rows.forEach(row => {
                const vid  = String(row.VendorID ?? row.VendorId ?? '');
                const name = String(row.VendorName ?? row.Name ?? '');
                const tr = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.setAttribute('data-vendor-id', vid);
                tr.innerHTML = `<td>${vid}</td><td>${name}</td>`;
                frag.appendChild(tr);
            });
            els.results.appendChild(frag);
        } catch (ex) {
            if (els.empty) { els.empty.textContent = 'Search failed.'; els.empty.style.display = 'block'; }
        } finally {
            if (els.loading) els.loading.classList.add('d-none');
        }
    }

    function confirmVendorSelection(id) {
        if (!id) return;
        if (state.vendorModalInstance) state.vendorModalInstance.hide();
        const idEl = qs('#VendorId');
        if (idEl) { idEl.value = id; }
        void loadVendorById();
    }

    function openSearchModal() {
        const els = getLookupEls();
        if (!els?.modal) return;
        if (!state.vendorModalInstance) {
            state.vendorModalInstance = new bootstrap.Modal(els.modal);
        }
        state.vendorModalInstance.show();
        setTimeout(() => els.id?.focus(), 150);
    }

    function wireSearchModal() {
        const els = getLookupEls();
        if (!els?.form) return;

        els.form.addEventListener('submit', e => performVendorSearch(e));

        els.reset?.addEventListener('click', () => {
            if (els.id)       els.id.value = '';
            if (els.name)     els.name.value = '';
            if (els.modeId)   els.modeId.value = 'Like';
            if (els.modeName) els.modeName.value = 'Like';
            els.results.innerHTML = '';
            if (els.empty) { els.empty.textContent = 'Enter at least one filter above and click Search to query vendors.'; els.empty.style.display = 'block'; }
        });

        els.refresh?.addEventListener('click', () => performVendorSearch());

        els.results?.addEventListener('click', e => {
            const tr = e.target?.closest?.('tr[data-vendor-id]');
            if (tr) confirmVendorSelection(tr.getAttribute('data-vendor-id'));
        });

        els.results?.addEventListener('dblclick', e => {
            const tr = e.target?.closest?.('tr[data-vendor-id]');
            if (tr) confirmVendorSelection(tr.getAttribute('data-vendor-id'));
        });
    }

    // ─── Action bindings ──────────────────────────────────────────────────
    function bindModeButtons() {
        qsa('[data-shell-mode]').forEach(btn => {
            btn.addEventListener('click', async () => {
                const next = btn.getAttribute('data-shell-mode');
                if (!next) return;

                if (next === MODES.VIEW) {
                    await loadVendorById();
                    return;
                }
                if (next === MODES.ADD) {
                    if (!getVendorId()) { showMessage('Enter Vendor ID first.', 'warning'); return; }
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
        const idEl = qs('#VendorId');
        if (!idEl) return;
        idEl.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); void loadVendorById(); }
        });
        idEl.addEventListener('input', () => {
            const hasId = !!idEl.value.trim();
            if (!hasId) {
                clearForm();
                state.hasLoaded = false;
                state.canAddFromId = false;
                updateActionButtons();
            }
        });
    }

    function bindActions() {
        const { save, cancel, del } = getActionButtons();
        const searchBtn   = qs('[data-mv-action="search"]');
        const contactBtn  = qs('[data-mv-action="lookup-contact"]');
        const viewBtn     = qs('[data-shell-mode="View"]');

        searchBtn?.addEventListener('click', () => openSearchModal());
        viewBtn?.addEventListener('click', () => void loadVendorById());

        qs('#ContactPerson')?.addEventListener('blur', () => void lookupContactPerson());
        qs('#ContactPerson')?.addEventListener('keydown', e => {
            if (e.key === 'Enter') { e.preventDefault(); void lookupContactPerson(); }
        });
        contactBtn?.addEventListener('click', () => void lookupContactPerson());

        // Save
        save?.addEventListener('click', async () => {
            if (state.isBusy || state.mode === MODES.VIEW) return;

            const payload = readFormRow();
            if (!payload.VendorID) { showMessage('Vendor ID is required.', 'warning'); return; }
            if (!payload.VendorName) { showMessage('Vendor Name is required.', 'warning'); return; }

            state.isBusy = true;
            showMessage('Saving...', 'info');

            try {
                const resp = await apiInvoke(endpoints.saveVendor, payload);

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

                    // Concurrency / concurrent update handling
                    const lower = msg.toLowerCase();
                    if (lower.includes('another user') || lower.includes('already updated') || lower.includes('concurrent')) {
                        const confirmed = window.Swal
                            ? (await window.Swal.fire({
                                icon: 'warning',
                                title: 'Record was changed',
                                text: 'Another user updated this Vendor. Reload latest and retry?',
                                showCancelButton: true,
                                confirmButtonText: 'Reload & Retry',
                                cancelButtonText: 'Cancel'
                              })).isConfirmed
                            : window.confirm('Another user updated this Vendor. Reload and retry?');

                        if (confirmed) {
                            await loadVendorById();
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

            const id = getVendorId();
            const confirmed = window.Swal
                ? (await window.Swal.fire({
                    icon: 'warning',
                    title: 'Confirm delete',
                    text: `Delete vendor "${id}"?`,
                    showCancelButton: true,
                    confirmButtonText: 'Delete',
                    confirmButtonColor: '#dc3545'
                  })).isConfirmed
                : window.confirm(`Delete vendor "${id}"?`);

            if (!confirmed) return;

            state.isBusy = true;
            showMessage('Deleting...', 'info');

            try {
                const resp = await apiInvoke(endpoints.deleteVendor, {
                    VendorID:    id,
                    BankID:      state.context.bankId,
                    OurBranchID: state.context.branchId,
                    OperatorID:  state.context.operatorId,
                    UpdateCount: state.updateCount
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

    // ─── Nav (Prev / Next) ────────────────────────────────────────────────
    function bindNav() {
        qs('[data-mv-nav="prev"]')?.addEventListener('click', () => {
            // Prev navigation placeholder
        });
        qs('[data-mv-nav="next"]')?.addEventListener('click', () => {
            // Next navigation placeholder
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
        wireSearchModal();
        bindModeButtons();
        bindIdWatcher();
        bindActions();
        bindNav();
        setMode(MODES.VIEW);
        clearMessage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
