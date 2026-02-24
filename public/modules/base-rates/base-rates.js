// Base Rates (Charges & Rates) - UI-only implementation
(function () {
    /** @typedef {{ effectiveDate: string, baseRate: string }} RateRow */

    const $ = (id) => document.getElementById(id);

    const els = {
        // Header fields
        baseRateId: $('BaseRateID'),
        baseRateName: $('BaseRateName'),
        currencyId: $('CurrencyID'),
        currencyName: $('CurrencyName'),
        baseRateType: $('BaseRateType'),

        // Detail fields
        effectiveDate: $('EffectiveDate'),
        effectiveDateNative: $('EffectiveDateNative'),
        btnEffectiveDatePicker: $('btnEffectiveDatePicker'),
        baseRateValue: $('BaseRateValue'),

        // Command buttons
        cmdNew: $('cmdNew'),
        cmdAlter: $('cmdAlter'),
        cmdRemove: $('cmdRemove'),
        cmdUpdate: $('cmdUpdate'),
        cmdClear: $('cmdClear'),

        // Action buttons
        btnView: $('btnView'),
        btnAdd: $('btnAdd'),
        btnEdit: $('btnEdit'),
        btnDelete: $('btnDelete'),
        btnSave: $('btnSave'),
        btnCancel: $('btnCancel'),

        // Title bar
        btnRefresh: $('btnRefresh'),

        // Lookups
        btnLookupBaseRate: $('btnLookupBaseRate'),
        btnLookupCurrency: $('btnLookupCurrency'),

        // Lookup popup
        lookupOverlay: $('lookupOverlay'),
        lookupTitle: $('lookupTitle'),
        lookupId: $('lookupId'),
        lookupDesc: $('lookupDesc'),
        lookupGridBody: $('lookupGridBody'),
        btnLookupSearch: $('btnLookupSearch'),
        btnLookupClear: $('btnLookupClear'),
        btnLookupSelect: $('btnLookupSelect'),
        btnLookupCancel: $('btnLookupCancel'),
        btnLookupClose: $('btnLookupClose'),

        // Grid
        gridBody: $('ratesGridBody')
    };

    const MODE = {
        VIEW: 'VIEW',
        ADD: 'ADD',
        EDIT: 'EDIT'
    };

    /** @type {keyof typeof MODE} */
    let mode = MODE.VIEW;

    /** @type {RateRow[]} */
    let rows = [];

    let selectedIndex = -1;
    let isDetailEditing = false;

    // Lookup popup state
    let lookupMode = null; // 'base-rate' | 'currency'
    let lookupSelectedIndex = -1;
    let lookupRows = [];

    // Demo lookup data (replace with API later)
    const LOOKUP_DATA = {
        'base-rate': [
            { id: 'BR001', name: 'Base Rate - Standard' },
            { id: 'BR002', name: 'Base Rate - Premium' },
            { id: 'BR003', name: 'Base Rate - Corporate' }
        ],
        currency: [
            { id: 'USD', name: 'US Dollar' },
            { id: 'EUR', name: 'Euro' },
            { id: 'GBP', name: 'British Pound' },
            { id: 'KES', name: 'Kenyan Shilling' },
            { id: 'UGX', name: 'Ugandan Shilling' }
        ]
    };

    // In-memory store for demo (keyed by BaseRateID)
    /** @type {Map<string, { header: any, rows: RateRow[], audit: any }>} */
    const store = new Map();

    function setAuditFields({ createdBy, createdOn, modifiedBy, modifiedOn, supervisedBy, supervisedOn }) {
        $('CreatedBy').value = createdBy || '';
        $('CreatedOn').value = createdOn || '';
        $('ModifiedBy').value = modifiedBy || '';
        $('ModifiedOn').value = modifiedOn || '';
        $('SupervisedBy').value = supervisedBy || '';
        $('SupervisedOn').value = supervisedOn || '';
    }

    function nowStamp() {
        const d = new Date();
        const pad2 = (n) => String(n).padStart(2, '0');
        return `${pad2(d.getDate())} ${d.toLocaleString('en-US', { month: 'short' })} ${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
    }

    function normalizeId(id) {
        return String(id || '').trim();
    }

    function pad2(n) {
        return String(n).padStart(2, '0');
    }

    function formatIsoToDisplay(iso) {
        const v = String(iso || '').trim();
        if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return '';

        const [y, m, d] = v.split('-').map((x) => Number(x));
        const dt = new Date(Date.UTC(y, m - 1, d));
        if (Number.isNaN(dt.getTime())) return '';
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const mon = months[dt.getUTCMonth()] || 'Jan';
        return `${pad2(dt.getUTCDate())} ${mon} ${dt.getUTCFullYear()}`;
    }

    function parseDisplayToIso(display) {
        const raw = String(display || '').trim();
        if (!raw) return '';

        // Accept ISO directly (flatpickr stores ISO in the real input)
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;

        // Accept dd/mm/yyyy or dd-mm-yyyy or dd mm yyyy
        const m = raw.match(/^(\d{1,2})\s*[\/\-\s]\s*(\d{1,2})\s*[\/\-\s]\s*(\d{4})$/);
        if (m) {
            const dd = Number(m[1]);
            const mm = Number(m[2]);
            const yyyy = Number(m[3]);
            if (!Number.isFinite(dd) || !Number.isFinite(mm) || !Number.isFinite(yyyy)) return '';
            if (yyyy < 1900 || yyyy > 2500) return '';

            // Validate using a Date roundtrip
            const dt = new Date(Date.UTC(yyyy, mm - 1, dd));
            if (dt.getUTCFullYear() !== yyyy || (dt.getUTCMonth() + 1) !== mm || dt.getUTCDate() !== dd) return '';

            return `${yyyy}-${pad2(mm)}-${pad2(dd)}`;
        }

        // Accept dd/mmm/yyyy (e.g. 07/Jan/2026)
        const ddMmm = raw.match(/^(\d{1,2})\s*[\/\-\s]\s*([A-Za-z]{3})\s*[\/\-\s]\s*(\d{4})$/);
        if (ddMmm) {
            const dd = Number(ddMmm[1]);
            const mmm = String(ddMmm[2]).toLowerCase();
            const yyyy = Number(ddMmm[3]);
            const months = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
            const mi = months.indexOf(mmm);
            if (mi < 0) return '';
            const dt = new Date(Date.UTC(yyyy, mi, dd));
            if (Number.isNaN(dt.getTime())) return '';
            if (dt.getUTCFullYear() !== yyyy || dt.getUTCMonth() !== mi || dt.getUTCDate() !== dd) return '';
            return `${yyyy}-${pad2(mi + 1)}-${pad2(dd)}`;
        }

        return '';
    }

    function getEffectiveDateIso() {
        const displayVal = String(els.effectiveDate?.value || '').trim();
        const parsed = parseDisplayToIso(displayVal);
        return parsed;
    }

    function setEffectiveDateIso(iso) {
        const v = String(iso || '').trim();
        if (els.effectiveDate?._flatpickr && typeof els.effectiveDate._flatpickr.setDate === 'function') {
            try {
                els.effectiveDate._flatpickr.setDate(v || null, true, 'Y-m-d');
                return;
            } catch {
                // fall through
            }
        }

        if (els.effectiveDate) {
            // Store ISO if provided; otherwise clear.
            if (!v) {
                els.effectiveDate.value = '';
            } else if (/^\d{4}-\d{2}-\d{2}$/.test(v)) {
                els.effectiveDate.value = v;
            } else {
                els.effectiveDate.value = formatIsoToDisplay(v);
            }
        }
    }

    function resetDetailInputs() {
        if (els.effectiveDate?._flatpickr && typeof els.effectiveDate._flatpickr.clear === 'function') {
            try {
                els.effectiveDate._flatpickr.clear();
            } catch {
                if (els.effectiveDate) els.effectiveDate.value = '';
            }
        } else {
            if (els.effectiveDate) els.effectiveDate.value = '';
        }
        els.baseRateValue.value = '';
        selectedIndex = -1;
        isDetailEditing = false;
    }

    function resetForm() {
        els.baseRateId.value = '';
        els.baseRateName.value = '';
        els.currencyId.value = '';
        els.currencyName.value = '';
        els.baseRateType.value = 'ADVANCE';
        rows = [];
        resetDetailInputs();
        setAuditFields({});
        renderGrid();
    }

    function setHeaderReadonly(isReadonly) {
        els.baseRateId.readOnly = isReadonly;
        els.currencyId.readOnly = isReadonly;
        els.baseRateType.disabled = isReadonly;

        els.btnLookupBaseRate.disabled = isReadonly;
        els.btnLookupCurrency.disabled = isReadonly;
    }

    function setDetailReadonly(isReadonly) {
        els.effectiveDate.disabled = isReadonly;
        if (els.effectiveDate?._flatpickr?.altInput) {
            els.effectiveDate._flatpickr.altInput.disabled = isReadonly;
            els.effectiveDate._flatpickr.altInput.readOnly = isReadonly;
        }
        els.baseRateValue.readOnly = isReadonly;
        els.cmdNew.disabled = isReadonly;
        els.cmdClear.disabled = isReadonly;

        // these are enabled contextually
        if (isReadonly) {
            els.cmdAlter.disabled = true;
            els.cmdRemove.disabled = true;
            els.cmdUpdate.disabled = true;
        }
    }

    function applyMode(newMode) {
        mode = newMode;

        const isView = mode === MODE.VIEW;
        const isAdd = mode === MODE.ADD;
        const isEdit = mode === MODE.EDIT;

        setHeaderReadonly(isView);
        setDetailReadonly(isView);

        // Action buttons
        els.btnEdit.disabled = isView ? true : true; // only enabled after view loads a record
        els.btnDelete.disabled = isView ? true : true;

        els.btnSave.disabled = !(isAdd || isEdit);
        els.btnCancel.disabled = !(isAdd || isEdit);

        // View/Add always available
        els.btnView.disabled = false;
        els.btnAdd.disabled = false;

        // Detail commands context
        updateDetailCommandButtons();
    }

    function setupStandardShell() {
        // Section collapse behavior (standardized forms)
        document.querySelectorAll('[data-section-toggle]').forEach((header) => {
            header.addEventListener('click', (e) => {
                const toggleBtn = header.querySelector('.section-toggle-btn');
                if (!toggleBtn) return;

                if (e.target instanceof Element) {
                    const interactive = e.target.closest('button, a, input, select, textarea');
                    if (interactive && interactive !== toggleBtn) return;
                }

                const section = header.closest('.form-section');
                if (!section) return;

                const isCollapsed = section.classList.contains('collapsed');
                section.classList.toggle('collapsed', !isCollapsed);
                toggleBtn.setAttribute('aria-expanded', isCollapsed ? 'true' : 'false');
            });
        });

        // Window control buttons
        const windowEl = document.querySelector('.window');
        document.querySelectorAll('.am-header [data-action]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                if (!action) return;

                switch (action) {
                    case 'maximize':
                        if (windowEl) windowEl.classList.toggle('maximized');
                        break;
                    case 'minimize':
                        // no-op in browser
                        break;
                    case 'close':
                        try {
                            window.close();
                        } catch {
                            window.history.back();
                        }
                        break;
                }
            });
        });
    }

    function enableEditButtonsForLoadedRecord() {
        if (mode === MODE.VIEW) {
            els.btnEdit.disabled = false;
            els.btnDelete.disabled = false;
        }
    }

    function updateDetailCommandButtons() {
        const isView = mode === MODE.VIEW;
        const hasSelection = selectedIndex >= 0;

        if (isView) {
            els.cmdAlter.disabled = true;
            els.cmdRemove.disabled = true;
            els.cmdUpdate.disabled = true;
            return;
        }

        els.cmdAlter.disabled = !hasSelection;
        els.cmdRemove.disabled = !hasSelection;

        // Update only when editing an existing row
        els.cmdUpdate.disabled = !(hasSelection && isDetailEditing);
    }

    function formatRate(value) {
        const raw = String(value || '').trim();
        if (!raw) return '';
        const num = Number(raw.replace(/,/g, ''));
        if (Number.isFinite(num)) {
            return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        }
        return raw;
    }

    function validateDetailInputs() {
        const iso = getEffectiveDateIso();
        if (!iso) {
            alert('Please select Effective Date.');
            els.effectiveDate.focus();
            return false;
        }
        const rateRaw = String(els.baseRateValue.value || '').trim();
        if (!rateRaw) {
            alert('Please enter Base Rate.');
            els.baseRateValue.focus();
            return false;
        }
        return true;
    }

    function renderGrid() {
        if (!els.gridBody) return;

        els.gridBody.innerHTML = '';

        if (!rows.length) {
            const tr = document.createElement('tr');
            tr.className = 'grid-empty-row';
            const td = document.createElement('td');
            td.colSpan = 2;
            td.textContent = 'No records to display.';
            tr.appendChild(td);
            els.gridBody.appendChild(tr);
            return;
        }

        rows.forEach((r, idx) => {
            const tr = document.createElement('tr');
            if (idx === selectedIndex) tr.classList.add('is-selected', 'table-active');
            tr.tabIndex = 0;
            tr.setAttribute('data-index', String(idx));

            const tdDate = document.createElement('td');
            tdDate.textContent = formatIsoToDisplay(r.effectiveDate) || r.effectiveDate;

            const tdRate = document.createElement('td');
            tdRate.textContent = r.baseRate;

            tr.appendChild(tdDate);
            tr.appendChild(tdRate);

            tr.addEventListener('click', () => selectRow(idx));
            tr.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    selectRow(idx);
                }
            });

            els.gridBody.appendChild(tr);
        });
    }

    function selectRow(idx) {
        selectedIndex = idx;
        isDetailEditing = false;
        renderGrid();
        updateDetailCommandButtons();
    }

    function populateDetailFromSelection() {
        if (selectedIndex < 0 || selectedIndex >= rows.length) return;
        const r = rows[selectedIndex];
        setEffectiveDateIso(r.effectiveDate);
        els.baseRateValue.value = r.baseRate;
        isDetailEditing = true;
        updateDetailCommandButtons();
    }

    function addDetailRow() {
        if (!validateDetailInputs()) return;

        const effectiveDate = getEffectiveDateIso();
        const baseRate = formatRate(els.baseRateValue.value);

        rows.push({ effectiveDate, baseRate });
        rows.sort((a, b) => (a.effectiveDate > b.effectiveDate ? -1 : a.effectiveDate < b.effectiveDate ? 1 : 0));

        resetDetailInputs();
        renderGrid();
        updateDetailCommandButtons();
    }

    function updateDetailRow() {
        if (selectedIndex < 0) return;
        if (!validateDetailInputs()) return;

        rows[selectedIndex] = {
            effectiveDate: getEffectiveDateIso(),
            baseRate: formatRate(els.baseRateValue.value)
        };

        rows.sort((a, b) => (a.effectiveDate > b.effectiveDate ? -1 : a.effectiveDate < b.effectiveDate ? 1 : 0));

        selectedIndex = -1;
        isDetailEditing = false;
        resetDetailInputs();
        renderGrid();
        updateDetailCommandButtons();
    }

    function removeDetailRow() {
        if (selectedIndex < 0) return;
        if (!confirm('Remove selected row?')) return;

        rows.splice(selectedIndex, 1);
        selectedIndex = -1;
        isDetailEditing = false;
        resetDetailInputs();
        renderGrid();
        updateDetailCommandButtons();
    }

    function clearDetailInputsOnly() {
        resetDetailInputs();
        renderGrid();
        updateDetailCommandButtons();
    }

    function handleView() {
        const id = normalizeId(els.baseRateId.value);
        if (!id) {
            alert('Please enter Base Rate ID.');
            els.baseRateId.focus();
            return;
        }

        const rec = store.get(id);
        if (!rec) {
            alert('No record found (demo store). Use Add to create one.');
            applyMode(MODE.VIEW);
            setHeaderReadonly(false);
            setDetailReadonly(true);
            return;
        }

        // load record
        els.baseRateId.value = rec.header.baseRateId;
        els.baseRateName.value = rec.header.baseRateName || '';
        els.currencyId.value = rec.header.currencyId;
        els.currencyName.value = rec.header.currencyName || '';
        els.baseRateType.value = rec.header.baseRateType || 'ADVANCE';

        rows = Array.isArray(rec.rows) ? rec.rows.slice() : [];
        selectedIndex = -1;
        isDetailEditing = false;

        setAuditFields(rec.audit || {});

        applyMode(MODE.VIEW);
        renderGrid();
        enableEditButtonsForLoadedRecord();
    }

    function handleAdd() {
        resetForm();
        applyMode(MODE.ADD);
        setHeaderReadonly(false);
        setDetailReadonly(false);

        // In add/edit, enable New/Clear always
        els.cmdNew.disabled = false;
        els.cmdClear.disabled = false;

        els.baseRateId.focus();
    }

    function handleEdit() {
        const id = normalizeId(els.baseRateId.value);
        if (!id || !store.get(id)) {
            alert('Please View a record first.');
            return;
        }

        applyMode(MODE.EDIT);
        setHeaderReadonly(true); // keep key fields stable on edit
        setDetailReadonly(false);

        els.cmdNew.disabled = false;
        els.cmdClear.disabled = false;
    }

    function handleDelete() {
        const id = normalizeId(els.baseRateId.value);
        if (!id || !store.get(id)) {
            alert('Please View a record first.');
            return;
        }

        if (!confirm('Delete this Base Rate record?')) return;
        store.delete(id);
        resetForm();
        applyMode(MODE.VIEW);
        setHeaderReadonly(false);
        setDetailReadonly(true);
    }

    function handleSave() {
        if (!(mode === MODE.ADD || mode === MODE.EDIT)) return;

        const baseRateId = normalizeId(els.baseRateId.value);
        const currencyId = normalizeId(els.currencyId.value);

        if (!baseRateId) {
            alert('Base Rate ID is required.');
            els.baseRateId.focus();
            return;
        }
        if (!currencyId) {
            alert('Currency ID is required.');
            els.currencyId.focus();
            return;
        }

        const operator = (window?.__USER__?.UserCode) || (document.querySelector('[data-user-name]')?.textContent) || 'CSADM';

        const existing = store.get(baseRateId);
        const isNew = !existing;

        const audit = isNew
            ? {
                createdBy: operator,
                createdOn: nowStamp(),
                modifiedBy: '',
                modifiedOn: '',
                supervisedBy: '',
                supervisedOn: ''
            }
            : {
                ...existing.audit,
                modifiedBy: operator,
                modifiedOn: nowStamp()
            };

        store.set(baseRateId, {
            header: {
                baseRateId,
                baseRateName: els.baseRateName.value,
                currencyId,
                currencyName: els.currencyName.value,
                baseRateType: els.baseRateType.value
            },
            rows: rows.slice(),
            audit
        });

        setAuditFields(audit);

        applyMode(MODE.VIEW);
        setHeaderReadonly(false);
        setDetailReadonly(true);
        enableEditButtonsForLoadedRecord();

        alert('Saved (demo store).');
    }

    function handleCancel() {
        if (!(mode === MODE.ADD || mode === MODE.EDIT)) {
            resetForm();
            applyMode(MODE.VIEW);
            setHeaderReadonly(false);
            setDetailReadonly(true);
            return;
        }

        if (!confirm('Cancel changes?')) return;

        // if editing, reload from store; if adding, clear
        const id = normalizeId(els.baseRateId.value);
        if (mode === MODE.EDIT && id && store.get(id)) {
            handleView();
            return;
        }

        resetForm();
        applyMode(MODE.VIEW);
        setHeaderReadonly(false);
        setDetailReadonly(true);
    }

    function setLookupOpen(isOpen) {
        if (!els.lookupOverlay) return;
        els.lookupOverlay.hidden = !isOpen;

        if (isOpen) {
            // Focus first field
            setTimeout(() => els.lookupId?.focus(), 0);
        }
    }

    function renderLookupGrid() {
        if (!els.lookupGridBody) return;
        els.lookupGridBody.innerHTML = '';

        if (!lookupRows.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 2;
            td.textContent = 'No records to display.';
            tr.appendChild(td);
            els.lookupGridBody.appendChild(tr);
            return;
        }

        lookupRows.forEach((r, idx) => {
            const tr = document.createElement('tr');
            if (idx === lookupSelectedIndex) tr.classList.add('is-selected', 'table-active');
            tr.tabIndex = 0;

            const td1 = document.createElement('td');
            td1.textContent = r.id;
            const td2 = document.createElement('td');
            td2.textContent = r.name;

            tr.appendChild(td1);
            tr.appendChild(td2);

            tr.addEventListener('click', () => {
                lookupSelectedIndex = idx;
                renderLookupGrid();
            });
            tr.addEventListener('dblclick', () => {
                lookupSelectedIndex = idx;
                confirmLookupSelection();
            });
            tr.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    lookupSelectedIndex = idx;
                    confirmLookupSelection();
                }
            });

            els.lookupGridBody.appendChild(tr);
        });
    }

    function openLookup(modeKey) {
        lookupMode = modeKey;
        lookupSelectedIndex = -1;

        if (els.lookupTitle) {
            els.lookupTitle.textContent = modeKey === 'currency' ? 'Currency Lookup' : 'Base Rate Lookup';
        }

        if (els.lookupId) els.lookupId.value = '';
        if (els.lookupDesc) els.lookupDesc.value = '';

        lookupRows = (LOOKUP_DATA[modeKey] || []).slice();
        renderLookupGrid();
        setLookupOpen(true);
    }

    function closeLookup() {
        setLookupOpen(false);
        lookupMode = null;
        lookupSelectedIndex = -1;
        lookupRows = [];
    }

    function performLookupSearch() {
        if (!lookupMode) return;

        const all = LOOKUP_DATA[lookupMode] || [];
        const idQ = String(els.lookupId?.value || '').trim().toLowerCase();
        const nameQ = String(els.lookupDesc?.value || '').trim().toLowerCase();

        lookupRows = all.filter((r) => {
            const idOk = !idQ || String(r.id).toLowerCase().includes(idQ);
            const nameOk = !nameQ || String(r.name).toLowerCase().includes(nameQ);
            return idOk && nameOk;
        });
        lookupSelectedIndex = -1;
        renderLookupGrid();
    }

    function clearLookupSearch() {
        if (els.lookupId) els.lookupId.value = '';
        if (els.lookupDesc) els.lookupDesc.value = '';
        performLookupSearch();
        els.lookupId?.focus();
    }

    function confirmLookupSelection() {
        if (lookupSelectedIndex < 0 || lookupSelectedIndex >= lookupRows.length) {
            alert('Please select a record.');
            return;
        }

        const row = lookupRows[lookupSelectedIndex];
        if (!row) return;

        if (lookupMode === 'currency') {
            els.currencyId.value = row.id;
            els.currencyName.value = row.name;
        } else if (lookupMode === 'base-rate') {
            els.baseRateId.value = row.id;
            els.baseRateName.value = row.name;
        }

        closeLookup();
    }

    function wireEvents() {
        els.btnRefresh?.addEventListener('click', () => {
            resetForm();
            applyMode(MODE.VIEW);
        });

        els.btnLookupBaseRate?.addEventListener('click', () => openLookup('base-rate'));
        els.btnLookupCurrency?.addEventListener('click', () => openLookup('currency'));

        // Actions
        els.btnView?.addEventListener('click', handleView);
        els.btnAdd?.addEventListener('click', handleAdd);
        els.btnEdit?.addEventListener('click', handleEdit);
        els.btnDelete?.addEventListener('click', handleDelete);
        els.btnSave?.addEventListener('click', handleSave);
        els.btnCancel?.addEventListener('click', handleCancel);

        // Commands (detail grid)
        els.cmdNew?.addEventListener('click', addDetailRow);
        els.cmdClear?.addEventListener('click', clearDetailInputsOnly);
        els.cmdAlter?.addEventListener('click', () => {
            if (mode === MODE.VIEW) return;
            populateDetailFromSelection();
        });
        els.cmdUpdate?.addEventListener('click', updateDetailRow);
        els.cmdRemove?.addEventListener('click', removeDetailRow);

        // Enable/disable Update when user changes detail fields while editing
        els.effectiveDate?.addEventListener('input', updateDetailCommandButtons);
        els.effectiveDate?.addEventListener('change', updateDetailCommandButtons);
        els.baseRateValue?.addEventListener('input', updateDetailCommandButtons);

        // Effective Date picker wiring
        els.btnEffectiveDatePicker?.addEventListener('click', () => {
            const native = els.effectiveDateNative;
            if (!native) return;
            // Try the modern picker API if supported
            try {
                if (typeof native.showPicker === 'function') {
                    native.showPicker();
                    return;
                }
            } catch {
                // ignore
            }
            // Fallback: focus/click
            native.focus();
            native.click();
        });

        els.effectiveDateNative?.addEventListener('change', () => {
            const iso = String(els.effectiveDateNative.value || '').trim();
            els.effectiveDate.value = formatIsoToDisplay(iso);
            updateDetailCommandButtons();
        });

        els.effectiveDate?.addEventListener('blur', () => {
            const parsed = parseDisplayToIso(els.effectiveDate.value);
            if (!parsed) {
                // Keep what user typed, but clear native value so validation catches it.
                if (els.effectiveDateNative) els.effectiveDateNative.value = '';
                return;
            }
            setEffectiveDateIso(parsed);
        });

        // Lookup popup wiring
        els.btnLookupSearch?.addEventListener('click', performLookupSearch);
        els.btnLookupClear?.addEventListener('click', clearLookupSearch);
        els.btnLookupSelect?.addEventListener('click', confirmLookupSelection);
        els.btnLookupCancel?.addEventListener('click', closeLookup);
        els.btnLookupClose?.addEventListener('click', closeLookup);

        els.lookupOverlay?.addEventListener('click', (e) => {
            if (e.target === els.lookupOverlay) closeLookup();
        });

        [els.lookupId, els.lookupDesc].forEach((input) => {
            if (!input) return;
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    performLookupSearch();
                }
            });
        });

        // Keyboard: delete selected row in edit/add
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && els.lookupOverlay && !els.lookupOverlay.hidden) {
                e.preventDefault();
                closeLookup();
                return;
            }
            if (e.key === 'Delete' && selectedIndex >= 0 && mode !== MODE.VIEW) {
                e.preventDefault();
                removeDetailRow();
            }
        });

        // Basic right-align formatting for BaseRateValue
        els.baseRateValue?.addEventListener('blur', () => {
            els.baseRateValue.value = formatRate(els.baseRateValue.value);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        setupStandardShell();
        applyMode(MODE.VIEW);
        setHeaderReadonly(false);
        setDetailReadonly(true);
        renderGrid();
        wireEvents();
    });
})();
