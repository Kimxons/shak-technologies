/**
 * NGO Maintenance Module
 * MVC Pattern: state + AppCore.invokeControllerAsync + POST endpoints
 */
(function () {
    'use strict';

    if (window.__kairoNgoMaintenanceLoaded) return;
    window.__kairoNgoMaintenanceLoaded = true;

    // ─── Constants ───────────────────────────────────────────────────────
    const MODES = { VIEW: 'View', ADD: 'Add', UPDATE: 'Update' };

    const endpoints = {
        getNgo:    'StaticData/NgoMaintenance/GetNgo',
        searchNgo: 'StaticData/NgoMaintenance/SearchNgo',
        saveNgo:   'StaticData/NgoMaintenance/SaveNgo',
        deleteNgo: 'StaticData/NgoMaintenance/DeleteNgo'
    };

    // ─── State ───────────────────────────────────────────────────────────
    const state = {
        mode: MODES.VIEW,
        hasLoaded: false,
        canAddFromId: false,
        lastLoadedRow: null,
        updateCount: 0,
        isBusy: false,
        ngoModalInstance: null,
        context: { bankId: '', branchId: '', operatorId: '', moduleId: '' }
    };

    // ─── DOM Helpers ─────────────────────────────────────────────────────
    function qs(sel, root) { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

    // ─── Context ─────────────────────────────────────────────────────────
    function loadContext() {
        state.context.moduleId   = (qs('#moduleId_ngoMaintenance')?.value || '').trim();
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
            del:    qs('[data-nmo-action="delete"]'),
            save:   qs('[data-nmo-action="save"]'),
            cancel: qs('[data-nmo-action="cancel"]')
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

        const form = qs('#ngo-maintenance-form');
        if (!form) return;

        const isEditable = nextMode === MODES.ADD || nextMode === MODES.UPDATE;

        qsa('input, select, textarea', form).forEach(el => {
            if (el.hasAttribute('data-always-enabled')) { el.disabled = false; return; }
            el.disabled = !isEditable;
        });

        // Audit spans are always read-only; ensure search btn stays enabled
        qsa('[data-always-enabled]', form).forEach(el => { el.disabled = false; });

        updateActionButtons();
    }

    // ─── Form utilities ───────────────────────────────────────────────────
    function getNgoId() {
        return (qs('#NgoId')?.value || '').trim();
    }

    function clearForm({ keepId = false } = {}) {
        clearMessage();
        const form = qs('#ngo-maintenance-form');
        if (!form) return;

        const savedId = keepId ? getNgoId() : '';

        qsa('input, select, textarea', form).forEach(el => {
            const id = el.getAttribute('id') || '';
            if (id === 'NgoId') return;
            if (el.tagName === 'INPUT' && el.type === 'checkbox') { el.checked = false; return; }
            if (el.tagName === 'SELECT') { el.value = ''; return; }
            el.value = '';
            el.removeAttribute('data-iso-value');
        });

        qsa('[data-nmo-audit]', form).forEach(el => { el.textContent = ''; });

        const idEl = qs('#NgoId');
        if (idEl) idEl.value = keepId ? savedId : '';
    }

    function fillForm(row) {
        if (!row || typeof row !== 'object') return;

        function setVal(id, val) {
            const el = qs('#' + id);
            if (el && val != null) el.value = String(val).trim();
        }

        function setText(id, val) {
            const el = qs('#' + id);
            if (el && val != null) el.textContent = String(val).trim();
        }

        function setDate(id, val) {
            if (val == null) return;
            const el = qs('#' + id);
            if (!el) return;
            // Store ISO value for submission
            const iso = toIsoDate(String(val));
            el.setAttribute('data-iso-value', iso);
            el.value = formatDateDisplay(iso) || String(val).trim();
        }

        const id = row.NGOID ?? row.NgoId ?? row.NGOId ?? row.NgoID ?? row.Ngoid;
        if (id != null) setVal('NgoId', id);

        setVal('NgoName',           row.NGOName    ?? row.NgoName    ?? row.Name);
        setVal('RegistrationNo',    row.RegistrationNo  ?? row.RegistrationNO);
        setVal('RegistrationDetail',row.RegistrationDetail ?? row.Remarks);
        setVal('ContactPerson',     row.ContactPerson);
        setVal('ZipCode',           row.ZipCode);
        setVal('Address1',          row.Address1);
        setVal('Address2',          row.Address2);
        setVal('EmailId',           row.Email ?? row.EmailId ?? row.EmailID);
        setVal('PhoneHome',         row.Phone1);
        setVal('PhoneWork',         row.Phone2);
        setVal('Mobile',            row.Mobile);
        setVal('FaxNo',             row.Fax);
        setVal('ByLawDetails',      row.ByLawDetails);

        // Dropdowns
        const cityEl    = qs('#City');
        const countryEl = qs('#Country');
        const cityId    = row.CityID    ?? row.CityId    ?? row.City;
        const countryId = row.CountryID ?? row.CountryId ?? row.Country;
        if (cityEl    && cityId    != null) cityEl.value    = String(cityId).trim();
        if (countryEl && countryId != null) countryEl.value = String(countryId).trim();

        // Dates
        setDate('EstablishedDate', row.EstablishedDate ?? row.EstablishedOn);
        setDate('AffiliatedDate',  row.AffiliatedDate);

        // Audit
        setText('CreatedBy',    row.CreatedBy);
        setText('CreatedOn',    row.CreatedOn    ?? row.CreatedDate);
        setText('ModifiedBy',   row.ModifiedBy);
        setText('ModifiedOn',   row.ModifiedOn   ?? row.ModifiedDate);
        setText('SupervisedBy', row.SupervisedBy);
        setText('SupervisedOn', row.SupervisedOn);
    }

    function readFormRow() {
        function v(id) { return (qs('#' + id)?.value || '').trim(); }
        function dateVal(id) {
            const el = qs('#' + id);
            if (!el) return '';
            const iso = el.getAttribute('data-iso-value') || '';
            if (iso) return isoDateToMdy(iso);
            return el.value.trim();
        }

        const current = state.lastLoadedRow || {};
        return {
            BankID:             state.context.bankId,
            OurBranchID:        state.context.branchId,
            OperatorID:         state.context.operatorId,
            NGOID:              v('NgoId'),
            NGOName:            v('NgoName'),
            EstablishedDate:    dateVal('EstablishedDate'),
            RegistrationNo:     v('RegistrationNo'),
            RegistrationDetail: v('RegistrationDetail'),
            AffiliatedDate:     dateVal('AffiliatedDate'),
            ContactPerson:      v('ContactPerson'),
            ByLawDetails:       v('ByLawDetails'),
            Address1:           v('Address1'),
            Address2:           v('Address2'),
            CityID:             v('City'),
            CountryID:          v('Country'),
            ZipCode:            v('ZipCode'),
            Phone1:             v('PhoneHome'),
            Phone2:             v('PhoneWork'),
            Fax:                v('FaxNo'),
            Mobile:             v('Mobile'),
            Email:              v('EmailId'),
            CreatedBy:          current.CreatedBy || current.CreatedBY || state.context.operatorId,
            ModifiedBy:         state.context.operatorId,
            SupervisedBy:       current.SupervisedBy || current.SupervisedBY || '',
            UpdateCount:        state.mode === MODES.ADD ? 1 : (state.updateCount || 0)
        };
    }

    // ─── Date helpers ────────────────────────────────────────────────────
    function pad2(n) { return String(n).padStart(2, '0'); }

    function toIsoDate(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const iso = raw.match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (iso) return `${iso[1]}-${iso[2]}-${iso[3]}`;
        const mdy = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})/);
        if (mdy) return `${mdy[3]}-${pad2(mdy[1])}-${pad2(mdy[2])}`;
        return '';
    }

    function isoDateToMdy(iso) {
        const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})$/);
        if (!m) return iso || '';
        return `${m[2]}/${m[3]}/${m[1]}`;
    }

    function formatDateDisplay(iso) {
        const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
        if (!m) return '';
        const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
        return `${pad2(parseInt(m[3], 10))} ${months[parseInt(m[2], 10) - 1]} ${m[1]}`;
    }

    // ─── Row normalization ────────────────────────────────────────────────
    function getRowNgoId(row) {
        if (!row || typeof row !== 'object') return '';
        const id = row.NGOID ?? row.NgoId ?? row.NGOId ?? row.NgoID ?? row.Ngoid;
        return id == null ? '' : String(id).trim();
    }

    function normalizeId(id) {
        const s = String(id ?? '').trim();
        if (!s) return '';
        if (/^\d+$/.test(s)) return String(parseInt(s, 10));
        return s.toUpperCase();
    }

    function extractRows(resp) {
        const candidates = [
            resp?.data?.Details01, resp?.Details01,
            resp?.data?.Details,   resp?.Details,
            resp?.data?.SearchResults, resp?.SearchResults
        ];
        const toRows = v => {
            if (!v) return [];
            if (Array.isArray(v)) return v.filter(x => x && typeof x === 'object');
            if (typeof v === 'object') return [v];
            return [];
        };
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
    async function loadNgoById({ showNotFoundToast = true } = {}) {
        if (state.isBusy) return { found: false };

        const id = getNgoId();
        if (!id) { showMessage('NGO ID is required.', 'warning'); return { found: false }; }

        state.isBusy = true;
        updateActionButtons();

        try {
            const resp = await apiInvoke(endpoints.getNgo, {
                NGOID:       id,
                BankID:      state.context.bankId,
                OurBranchID: state.context.branchId,
                OperatorID:  state.context.operatorId,
                Direction:   0
            });

            const row = pickFirstRow(resp);

            if (row) {
                const returnedId = getRowNgoId(row);
                if (normalizeId(returnedId) !== normalizeId(id)) {
                    // Different record returned → not found
                    clearForm({ keepId: true });
                    state.hasLoaded = false;
                    state.canAddFromId = true;
                    state.lastLoadedRow = null;
                    state.updateCount = 0;
                    setMode(MODES.VIEW);
                    if (showNotFoundToast) showMessage('Record not found. You can Add.', 'info');
                    return { found: false };
                }

                state.hasLoaded = true;
                state.canAddFromId = false;
                state.lastLoadedRow = row;
                state.updateCount = Number(row.UpdateCount ?? row.updateCount ?? 0) || 0;
                clearForm({ keepId: false });
                fillForm(row);
                setMode(MODES.VIEW);
                showMessage(`NGO details loaded. NGO ID: ${getRowNgoId(row)}`, 'success');
                return { found: true, row };
            }

            clearForm({ keepId: true });
            state.hasLoaded = false;
            state.canAddFromId = true;
            state.lastLoadedRow = null;
            state.updateCount = 0;
            setMode(MODES.VIEW);
            if (showNotFoundToast) showMessage('Record not found. You can Add.', 'info');
            return { found: false };

        } catch (ex) {
            showMessage(ex?.message || 'Load failed.', 'danger');
            return { found: false };
        } finally {
            state.isBusy = false;
            updateActionButtons();
        }
    }

    // ─── Search modal ─────────────────────────────────────────────────────
    function getLookupEls() {
        const modal = qs('#ngoLookupModal');
        if (!modal) return {};
        return {
            modal,
            form:    qs('#ngoLookupForm',    modal),
            id:      qs('#ngoSearchId',      modal),
            name:    qs('#ngoSearchName',    modal),
            modeId:  qs('#ngoSearchModeId',  modal),
            modeName:qs('#ngoSearchModeName',modal),
            reset:   qs('#ngoSearchReset',   modal),
            refresh: qs('#ngoSearchRefresh', modal),
            results: qs('#ngoSearchResults', modal),
            empty:   qs('#ngoSearchEmpty',   modal),
            loading: qs('#ngoSearchLoading', modal),
            submit:  qs('#ngoSearchSubmit',  modal)
        };
    }

    async function performNgoSearch(e) {
        if (e && e.preventDefault) e.preventDefault();
        const els = getLookupEls();
        if (!els.results) return;

        if (els.loading) els.loading.classList.remove('d-none');
        if (els.empty)   els.empty.classList.add('d-none');
        els.results.innerHTML = '';

        try {
            const resp = await apiInvoke(endpoints.searchNgo, {
                NGOID:       (els.id?.value || '').trim(),
                NGOName:     (els.name?.value || '').trim(),
                NgoIdMode:   els.modeId?.value  || 'Like',
                NgoNameMode: els.modeName?.value || 'Like',
                BankID:      state.context.bankId,
                OurBranchID: state.context.branchId,
                OperatorID:  state.context.operatorId,
                ModuleID:    parseInt(state.context.moduleId || '1000', 10) || 1000
            });

            const rows = extractRows(resp);

            if (!rows.length) {
                if (els.empty) els.empty.classList.remove('d-none');
                return;
            }

            rows.forEach(row => {
                const id   = getRowNgoId(row);
                const name = row.NGOName ?? row.NgoName ?? row.Name ?? '';
                const tr   = document.createElement('tr');
                tr.style.cursor = 'pointer';
                tr.setAttribute('data-ngo-id', id);
                tr.innerHTML = `<td><strong>${id}</strong></td><td>${name}</td>`;
                tr.addEventListener('dblclick', () => confirmSelection(id));
                els.results.appendChild(tr);
            });
        } catch (ex) {
            showMessage('Search failed: ' + (ex?.message || ''), 'danger');
        } finally {
            if (els.loading) els.loading.classList.add('d-none');
        }
    }

    function confirmSelection(id) {
        if (!id) return;
        if (state.ngoModalInstance) state.ngoModalInstance.hide();
        const idEl = qs('#NgoId');
        if (idEl) { idEl.value = id; loadNgoById({ showNotFoundToast: true }); }
    }

    function openSearchModal() {
        const { modal } = getLookupEls();
        if (!modal) return;
        if (!state.ngoModalInstance) {
            state.ngoModalInstance = new bootstrap.Modal(modal);
        }
        state.ngoModalInstance.show();
        setTimeout(() => { getLookupEls().id?.focus(); performNgoSearch(); }, 150);
    }

    function wireSearchModal() {
        const { form, reset, refresh, results } = getLookupEls();
        if (!form) return;

        form.addEventListener('submit', e => performNgoSearch(e));

        reset?.addEventListener('click', () => {
            const els = getLookupEls();
            if (els.id)      els.id.value      = '';
            if (els.name)    els.name.value    = '';
            if (els.results) els.results.innerHTML = '';
            performNgoSearch();
        });

        refresh?.addEventListener('click', () => performNgoSearch());

        results?.addEventListener('click', e => {
            const tr = e.target?.closest('tr[data-ngo-id]');
            if (tr) confirmSelection(tr.getAttribute('data-ngo-id'));
        });
    }

    // ─── Action bindings ──────────────────────────────────────────────────
    function bindModeButtons() {
        qsa('[data-shell-mode]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.disabled) return;
                const next = btn.getAttribute('data-shell-mode')?.toUpperCase();
                if (next && MODES[next]) setMode(MODES[next]);
            });
        });
    }

    function bindIdWatcher() {
        const idEl = qs('#NgoId');
        if (!idEl) return;
        idEl.addEventListener('input', () => {
            if (state.mode !== MODES.VIEW) return;
            if (!getNgoId()) {
                state.canAddFromId = false;
                state.hasLoaded    = false;
                state.lastLoadedRow = null;
                state.updateCount  = 0;
            }
            updateActionButtons();
        });
    }

    function bindActions() {
        const { save, cancel, del } = getActionButtons();
        const searchBtn = qs('[data-nmo-action="search"]');

        // Search button (on the kairo-control ID field)
        searchBtn?.addEventListener('click', () => {
            const id = getNgoId();
            if (id) {
                loadNgoById({ showNotFoundToast: true }).then(r => {
                    if (r?.found) showMessage('Record loaded.', 'success');
                });
            } else {
                openSearchModal();
            }
        });

        // View mode button
        qs('[data-shell-mode="View"]')?.addEventListener('click', () => {
            const id = getNgoId();
            if (!id) { openSearchModal(); return; }
            loadNgoById({ showNotFoundToast: true });
        });

        // Save
        save?.addEventListener('click', () => {
            (async () => {
                if (save.disabled || state.mode === MODES.VIEW || state.isBusy) return;

                const id   = getNgoId();
                const name = (qs('#NgoName')?.value || '').trim();
                if (!id)   { showMessage('NGO ID is required.', 'warning');   return; }
                if (!name) { showMessage('NGO Name is required.', 'warning'); return; }

                state.isBusy = true;
                updateActionButtons();

                try {
                    const payload = readFormRow();
                    const resp    = await apiInvoke(endpoints.saveNgo, payload);

                    if (!resp?.success) {
                        let msg  = resp?.message || 'Save failed.';
                        const cd = resp?.code || '';

                        if (cd === '091' || msg.includes('already done')) {
                            if (state.mode === MODES.ADD && window.Swal) {
                                const res = await window.Swal.fire({
                                    icon: 'warning',
                                    title: 'Record Already Exists',
                                    html: `<p>NGO ID <strong>${id}</strong> already exists.</p><p>Load it and switch to Edit mode?</p>`,
                                    showCancelButton: true,
                                    confirmButtonText: 'Yes, Load & Edit',
                                    cancelButtonText: 'No, Choose Different ID'
                                });
                                if (res.isConfirmed) {
                                    const loaded = await loadNgoById({ showNotFoundToast: false });
                                    if (loaded.found) { setMode(MODES.UPDATE); showMessage('Record loaded. You can now edit it.', 'info'); }
                                    else showMessage('Could not load the existing record. Try searching manually.', 'warning');
                                } else {
                                    showMessage('Please enter a different NGO ID.', 'info');
                                }
                                return;
                            } else if (state.mode === MODES.UPDATE) {
                                await loadNgoById({ showNotFoundToast: false });
                                msg = 'Version mismatch. Form refreshed. Please Save again.';
                            }
                        }

                        showMessage(msg, 'danger');
                        return;
                    }

                    showMessage('NGO record saved successfully.', 'success');
                    clearForm({ keepId: false });
                    state.hasLoaded     = false;
                    state.canAddFromId  = false;
                    state.lastLoadedRow = null;
                    state.updateCount   = 0;
                    setMode(MODES.VIEW);
                } catch (ex) {
                    showMessage(ex?.message || 'Save failed.', 'danger');
                } finally {
                    state.isBusy = false;
                    updateActionButtons();
                }
            })();
        });

        // Cancel
        cancel?.addEventListener('click', () => {
            if (cancel.disabled) return;
            if (state.mode === MODES.ADD || state.mode === MODES.UPDATE) {
                if (state.lastLoadedRow) {
                    clearForm({ keepId: false });
                    fillForm(state.lastLoadedRow);
                    state.hasLoaded     = true;
                    state.canAddFromId  = false;
                    state.updateCount   = Number(state.lastLoadedRow.UpdateCount ?? state.lastLoadedRow.updateCount ?? 0) || 0;
                } else {
                    clearForm({ keepId: true });
                    state.hasLoaded    = false;
                    state.canAddFromId = !!getNgoId();
                    state.updateCount  = 0;
                }
                setMode(MODES.VIEW);
                return;
            }
            clearForm({ keepId: false });
            state.hasLoaded     = false;
            state.canAddFromId  = false;
            state.lastLoadedRow = null;
            state.updateCount   = 0;
            setMode(MODES.VIEW);
        });

        // Delete
        del?.addEventListener('click', () => {
            (async () => {
                if (del.disabled || state.isBusy) return;
                const id = getNgoId();
                if (!id) return;

                if (window.Swal) {
                    const result = await window.Swal.fire({
                        title: 'Delete Record?',
                        text: `Are you sure you want to delete NGO ${id}? This cannot be undone.`,
                        icon: 'warning',
                        showCancelButton: true,
                        confirmButtonText: 'Yes, Delete',
                        confirmButtonColor: '#dc3545',
                        cancelButtonText: 'Cancel',
                        cancelButtonColor: '#6c757d'
                    });
                    if (!result.isConfirmed) return;
                }

                state.isBusy = true;
                updateActionButtons();

                try {
                    const resp = await apiInvoke(endpoints.deleteNgo, {
                        NGOID:       id,
                        BankID:      state.context.bankId,
                        OurBranchID: state.context.branchId,
                        OperatorID:  state.context.operatorId,
                        UpdateCount: Number(state.updateCount || state.lastLoadedRow?.UpdateCount || 0) || 0
                    });

                    clearForm({ keepId: false });
                    state.hasLoaded     = false;
                    state.canAddFromId  = false;
                    state.lastLoadedRow = null;
                    state.updateCount   = 0;
                    setMode(MODES.VIEW);
                    showMessage('NGO deleted successfully.', 'success');
                    void resp;
                } catch (ex) {
                    showMessage(ex?.message || 'Delete failed.', 'danger');
                } finally {
                    state.isBusy = false;
                    updateActionButtons();
                }
            })();
        });
    }

    // ─── Section toggles ─────────────────────────────────────────────────
    function wireSectionToggles() {
        qsa('[data-section-toggle]').forEach(header => {
            const btn     = header.querySelector('.section-toggle-btn');
            const section = header.closest('[data-section]');
            const content = section?.querySelector('[data-section-content]');
            if (!btn || !content) return;

            const isExpanded = btn.getAttribute('aria-expanded') === 'true';
            if (!isExpanded) content.hidden = true;

            const toggle = () => {
                const expanded = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', String(!expanded));
                content.hidden = expanded;
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-chevron-up',   !expanded);
                    icon.classList.toggle('bi-chevron-down',  expanded);
                }
            };

            header.addEventListener('click', e => { if (!e.target.closest('.section-toggle-btn')) toggle(); });
            btn.addEventListener('click',    e => { e.stopPropagation(); toggle(); });
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
        setMode(MODES.VIEW);
        clearMessage();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
