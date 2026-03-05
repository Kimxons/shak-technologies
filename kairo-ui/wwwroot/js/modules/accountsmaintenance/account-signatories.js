/**
 * Account Signatories Module
 * Migrated from: public/modules/account-maintenance/dataentry/account-signatories.js
 *
 * Architecture: Runs as an EMBEDDED submodule inside the Account Maintenance page.
 * - HTML is injected into #submodule-container
 * - Action panel buttons (Signature/Photo/Both/Add/Edit/Save/Cancel) are in the PARENT
 *   action panel with IDs: submoduleBtnSignature, submoduleBtnPhoto, submoduleBtnBoth,
 *   submoduleBtnAdd, submoduleBtnEdit, submoduleBtnSave, submoduleBtnCancel
 * - Form-section buttons (New/Alter/Remove/Update/Clear/Close) are inside submodule HTML
 * - Lookup buttons are wired by the parent's wireLookups() via LOOKUP_CONFIG
 * - Context comes from window.AccountMaintenanceState / sessionStorage
 */
window.AccountSignatoriesModule = (function () {
    'use strict';

    // ========================================================================
    // STATE
    // ========================================================================
    const state = {
        mode: 'VIEW', // VIEW, EDIT, ADD, NEW, ALTER, UPDATE, SAVE, REMOVE
        signatories: [],
        selectedRow: null,
        pendingChanges: [],
        context: {
            OurBranchID: '',
            AccountID: '',
            OperatorID: '',
            ClientID: ''
        }
    };

    // ========================================================================
    // DOM REFERENCES (resolved lazily)
    // ========================================================================
    let tableBody = null;
    let messageBar = null;
    let statusBar = null;
    let loadingOverlay = null;
    let windowEl = null;

    function resolveDom() {
        tableBody = document.getElementById('signatoryTableBody');
        messageBar = document.querySelector('.de-message-bar');
        statusBar = document.querySelector('.de-status-bar');
        loadingOverlay = document.getElementById('loadingOverlay');
        windowEl = document.querySelector('.window');
    }

    // ========================================================================
    // UTILITIES
    // ========================================================================
    function showLoader(show) {
        if (loadingOverlay) loadingOverlay.hidden = !show;
        updateStatus(show ? 'Loading...' : 'Ready');
    }

    function updateStatus(text) {
        if (statusBar) statusBar.textContent = text;
    }

    function showMessage(msg, type) {
        if (!messageBar) return;
        const icon = messageBar.querySelector('i');
        const span = messageBar.querySelector('span');
        if (!span) return;
        span.textContent = msg;
        messageBar.classList.remove('success', 'error', 'warning', 'info');
        messageBar.classList.add(type);
        if (icon) {
            const iconMap = {
                success: 'bi-check-circle',
                error: 'bi-exclamation-circle',
                warning: 'bi-exclamation-triangle',
                info: 'bi-info-circle'
            };
            icon.className = 'bi ' + (iconMap[type] || 'bi-info-circle');
        }
        clearTimeout(messageBar._hideTimer);
        messageBar._hideTimer = setTimeout(() => {
            span.textContent = '';
            messageBar.classList.remove(type);
        }, 5000);
    }

    function showSuccess(m) { showMessage(m, 'success'); }
    function showError(m)   { showMessage(m, 'error'); }
    function showWarning(m) { showMessage(m, 'warning'); }
    function showInfo(m)    { showMessage(m, 'info'); }

    function escapeHtml(text) {
        if (text == null) return '';
        const div = document.createElement('div');
        div.textContent = String(text);
        return div.innerHTML;
    }

    function escapeXml(text) {
        if (text == null) return '';
        return String(text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    function formatDate(value) {
        if (!value) return '-';
        try {
            const d = new Date(value);
            if (isNaN(d.getTime())) return String(value);
            return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        } catch { return String(value); }
    }

    // ========================================================================
    // CONTEXT
    // ========================================================================
    function getContextFromParent() {
        // 1) Same-page global (set by loadSubmoduleView)
        if (window.AccountMaintenanceState) {
            state.context.OurBranchID = window.AccountMaintenanceState.OurBranchID || '';
            state.context.AccountID   = window.AccountMaintenanceState.AccountID || '';
            state.context.OperatorID  = window.AccountMaintenanceState.OperatorID || '';
            state.context.ClientID    = window.AccountMaintenanceState.ClientID || '';
            console.log('[AccountSignatories] Context from AccountMaintenanceState:', state.context);
            return;
        }
        // 2) sessionStorage fallback
        state.context.AccountID   = sessionStorage.getItem('currentAccountID') || '';
        state.context.OurBranchID = sessionStorage.getItem('currentBranchID') || '';
        state.context.OperatorID  = sessionStorage.getItem('currentOperatorID') || 'SYSTEM';
        state.context.ClientID    = sessionStorage.getItem('currentClientID') || '';
        console.log('[AccountSignatories] Context from sessionStorage:', state.context);
    }

    // ========================================================================
    // FORM HELPERS
    // ========================================================================
    function clearForm() {
        ['signatoryId', 'signatoryName', 'groupId', 'sequenceNo', 'limit'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        const sigType = document.getElementById('signatoryType');
        if (sigType) sigType.value = '';

        const mand = document.getElementById('isMandatory');
        if (mand) mand.checked = false;

        const menu = document.getElementById('mandatesDropdownMenu');
        if (menu) menu.querySelectorAll('input[type="checkbox"]').forEach(cb => (cb.checked = false));
        updateMandatesButtonText();

        if (tableBody) tableBody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
    }

    function setFormFieldsReadonly(readonly) {
        const form = document.querySelector('[data-main-form]');
        if (!form) return;

        form.querySelectorAll('input[type="text"]').forEach(el => {
            el.readOnly = readonly;
            el.classList.toggle('readonly', readonly);
        });
        form.querySelectorAll('select').forEach(el => {
            el.disabled = readonly;
            el.classList.toggle('readonly', readonly);
        });

        const mand = document.getElementById('isMandatory');
        if (mand) mand.disabled = readonly;

        const mandBtn = document.getElementById('mandatesDropdown');
        if (mandBtn) {
            mandBtn.disabled = readonly;
            mandBtn.style.opacity = readonly ? '0.5' : '1';
        }

        // Lookup buttons enabled/disabled with the form
        form.querySelectorAll('.btn-lookup').forEach(btn => {
            btn.disabled = readonly;
            btn.style.opacity = readonly ? '0.5' : '1';
        });
    }

    function populateForm(data) {
        if (!data) return;
        const fv = (keys) => {
            for (const k of keys) {
                if (data[k] !== undefined && data[k] !== null) return data[k];
            }
            return '';
        };
        const sv = (id, v) => { const el = document.getElementById(id); if (el) el.value = v ?? ''; };

        sv('signatoryId',  fv(['SignatoryID', 'signatoryID', 'OperatorID']));
        sv('signatoryName', fv(['SignatoryName', 'signatoryName', 'OperatorName']));
        sv('groupId',       fv(['GroupID', 'groupID']));
        sv('sequenceNo',    fv(['ReferenceID', 'Sequence', 'SeqNo', 'SequenceNo']));
        sv('limit',         fv(['Limit', 'limit']));

        const stSel = document.getElementById('signatoryType');
        if (stSel) {
            const tv = fv(['SignatoryTypeID', 'signatoryTypeID', 'SignatoryType', 'TypeID']);
            stSel.value = tv;
            if (!stSel.value && data.SignatoryType) {
                Array.from(stSel.options).forEach(o => {
                    if (o.text === data.SignatoryType) stSel.value = o.value;
                });
            }
        }

        const mand = document.getElementById('isMandatory');
        if (mand) {
            const mv = fv(['IsMandatory', 'isMandatory', 'Mandatory']);
            mand.checked = mv === true || mv === 1 || mv === '1' || mv === 'Y' || mv === 'Yes';
        }

        const menu = document.getElementById('mandatesDropdownMenu');
        if (menu) {
            menu.querySelectorAll('input[type="checkbox"]').forEach(cb => (cb.checked = false));
            const vals = String(fv(['Mandates', 'MandateID', 'mandateID']) || '').split(',').map(v => v.trim()).filter(Boolean);
            vals.forEach(v => {
                const cb = menu.querySelector(`input[type="checkbox"][value="${v}"]`);
                if (cb) cb.checked = true;
            });
            updateMandatesButtonText();
        }

        const sa = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? '-'; };
        sa('createdBy',    data.CreatedBy);
        sa('createdOn',    data.CreatedOn ? formatDate(data.CreatedOn) : '-');
        sa('modifiedBy',   data.ModifiedBy);
        sa('modifiedOn',   data.ModifiedOn ? formatDate(data.ModifiedOn) : '-');
        sa('supervisedBy', data.SupervisedBy);
        sa('supervisedOn', data.SupervisedOn ? formatDate(data.SupervisedOn) : '-');
    }

    function collectFormData() {
        const gv = id => { const el = document.getElementById(id); return el ? el.value.trim() : ''; };
        const stSel = document.getElementById('signatoryType');
        const stVal = stSel ? stSel.value : '';
        const stTxt = stSel?.options[stSel.selectedIndex]?.text || '';
        const isNew = state.mode === 'ADD' || state.mode === 'NEW';
        const existing = (!isNew && state.selectedRow !== null) ? state.signatories[state.selectedRow] : null;

        let fd = {
            OurBranchID:    state.context.OurBranchID,
            AccountID:      state.context.AccountID,
            SignatoryID:    gv('signatoryId'),
            SignatoryName:  gv('signatoryName') || gv('signatoryId'),
            GroupID:        gv('groupId'),
            SignatoryTypeID: stVal,
            SignatoryType:  stTxt,
            ReferenceID:    gv('sequenceNo'),
            Limit:          gv('limit'),
            Mandates:       getSelectedMandates(),
            IsMandatory:    document.getElementById('isMandatory')?.checked || false,
            _isNew:         isNew,
            _isModified:    !isNew
        };
        if (existing) fd = { ...existing, ...fd, _isNew: false, _isModified: true };
        return fd;
    }

    function validateFormData(data) {
        if (!data.SignatoryID) return { isValid: false, message: 'Signatory ID is required.' };
        if (!data.SignatoryTypeID) return { isValid: false, message: 'Signatory Type is required.' };
        const dup = state.signatories.find((s, i) => {
            if ((state.mode === 'EDIT' || state.mode === 'ALTER') && i === state.selectedRow) return false;
            return (s.SignatoryID || s.OperatorID || '') === data.SignatoryID && !s._isDeleted;
        });
        if (dup) return { isValid: false, message: `Signatory "${data.SignatoryID}" already exists.` };
        return { isValid: true };
    }

    // ========================================================================
    // MANDATES HELPERS
    // ========================================================================
    function getSelectedMandates() {
        const cbs = document.querySelectorAll('#mandatesDropdownMenu input[type="checkbox"]:checked');
        return Array.from(cbs).map(cb => cb.value).join(',');
    }

    function updateMandatesButtonText() {
        const btn = document.getElementById('mandatesDropdown');
        if (!btn) return;
        const sel = getSelectedMandates();
        if (sel) {
            const labels = sel.split(',').map(v => {
                const lbl = document.querySelector(`#mandatesDropdownMenu input[value="${v}"]`)?.closest('.form-check')?.querySelector('label');
                return lbl ? lbl.textContent.trim() : v;
            });
            btn.textContent = labels.join(', ');
        } else {
            btn.textContent = 'Select Mandates';
        }
    }

    // ========================================================================
    // GRID
    // ========================================================================
    function renderGrid(data) {
        if (!tableBody) return;
        state.signatories = data || [];

        const visible = state.signatories.filter(r => !r._isDeleted);
        if (visible.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="6" class="text-center py-4 text-muted"><i class="bi bi-inbox fs-3 d-block mb-2"></i><span>No signatories found</span></td></tr>';
            updateStatus('Ready - No records');
            updateButtonStates();
            return;
        }

        const fv = (row, keys) => {
            for (const k of keys) { if (row[k] !== undefined && row[k] !== null) return row[k]; }
            return null;
        };

        tableBody.innerHTML = visible.map(row => {
            const idx  = state.signatories.indexOf(row);
            const sid  = fv(row, ['SignatoryID','signatoryID','OperatorID']) || '-';
            const nm   = fv(row, ['SignatoryName','signatoryName','OperatorName']) || '-';
            const st   = fv(row, ['SignatoryType','SignatoryTypeID','signatoryType']) || '-';
            const lim  = fv(row, ['Limit','limit','GroupID']) || '-';
            const ref  = fv(row, ['ReferenceID','referenceID','SequenceNo','SeqNo']) || '-';
            const mv   = fv(row, ['IsMandatory','isMandatory','Mandatory']);
            const mand = mv === true || mv === 1 || mv === '1' || mv === 'Y' || mv === 'Yes';
            const isN  = row._isNew === true;
            const isM  = row._isModified === true;
            const cls  = isN ? 'table-info' : isM ? 'table-warning' : '';
            const bdg  = isN ? ' <span class="badge bg-success">NEW</span>' : isM ? ' <span class="badge bg-warning">MOD</span>' : '';

            return `<tr class="${cls}" data-index="${idx}" tabindex="0">
                <td>${escapeHtml(String(sid))}${bdg}</td>
                <td>${escapeHtml(String(nm))}</td>
                <td>${escapeHtml(String(st))}</td>
                <td>${escapeHtml(String(lim))}</td>
                <td>${escapeHtml(String(ref))}</td>
                <td>${mand ? '<i class="bi bi-check-circle-fill text-success" title="Yes"></i>' : '<i class="bi bi-dash-circle text-muted" title="No"></i>'}</td>
            </tr>`;
        }).join('');

        updateStatus(`Ready - ${visible.length} record${visible.length !== 1 ? 's' : ''}`);
        bindRowEvents();
        updateButtonStates();
    }

    function bindRowEvents() {
        if (!tableBody) return;
        tableBody.querySelectorAll('tr[data-index]').forEach(row => {
            row.addEventListener('click', () => selectRow(parseInt(row.dataset.index, 10)));
            row.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); row.click(); } });
        });
    }

    function selectRow(index) {
        if (!tableBody) return;
        tableBody.querySelectorAll('tr.selected').forEach(r => r.classList.remove('selected'));
        const row = tableBody.querySelector(`tr[data-index="${index}"]`);
        if (!row) return;
        row.classList.add('selected');
        state.selectedRow = index;
        const d = state.signatories[index];
        if (d) {
            populateForm(d);
            state.mode = 'EDIT';
            updateButtonStates();
            showInfo('Signatory selected. Click ALTER to modify or view details.');
        }
    }

    // ========================================================================
    // BUTTON STATE MANAGEMENT
    // ========================================================================
    function updateButtonStates() {
        // Form-section buttons
        const newBtn    = document.querySelector('.form-section .btn[data-action="new"]');
        const alterBtn  = document.querySelector('.form-section .btn[data-action="alter"]');
        const removeBtn = document.querySelector('.form-section .btn[data-action="remove"]');
        const updateBtn = document.querySelector('.form-section .btn[data-action="update"]');
        const clearBtn  = document.querySelector('.form-section .btn[data-action="clear"]');
        const closeBtn  = document.querySelector('.form-section .btn[data-action="close-form"]');

        // Parent action-panel buttons
        const signatureBtn = document.getElementById('submoduleBtnSignature');
        const photoBtn     = document.getElementById('submoduleBtnPhoto');
        const bothBtn      = document.getElementById('submoduleBtnBoth');
        const addBtn       = document.getElementById('submoduleBtnAdd');
        const editBtn      = document.getElementById('submoduleBtnEdit');
        const saveBtn      = document.getElementById('submoduleBtnSave');
        const cancelBtn    = document.getElementById('submoduleBtnCancel');

        const se = (btn, on) => {
            if (!btn) return;
            btn.disabled = !on;
            btn.classList.toggle('disabled', !on);
            btn.style.opacity = on ? '1' : '0.5';
        };

        // Update BTS operating mode display
        const modeEl = document.getElementById('operatingMode');
        if (modeEl) modeEl.textContent = state.mode;

        const hasPending = state.pendingChanges.length > 0;

        switch (state.mode) {
            case 'VIEW':
                se(signatureBtn, true);  se(photoBtn, true);  se(bothBtn, true);
                se(editBtn, true);       se(addBtn, false);   se(saveBtn, false);  se(cancelBtn, false);
                se(newBtn, false); se(alterBtn, false); se(removeBtn, false);
                se(updateBtn, false); se(clearBtn, false); se(closeBtn, false);
                setFormFieldsReadonly(true);
                break;

            case 'EDIT':
                se(signatureBtn, true);  se(photoBtn, true);  se(bothBtn, true);
                se(editBtn, true);       se(addBtn, false);   se(saveBtn, hasPending); se(cancelBtn, true);
                se(newBtn, true); se(alterBtn, true); se(removeBtn, true);
                se(updateBtn, false); se(clearBtn, true); se(closeBtn, true);
                setFormFieldsReadonly(true);
                break;

            case 'ADD': case 'NEW':
                se(signatureBtn, true); se(photoBtn, true); se(bothBtn, true);
                se(addBtn, false); se(editBtn, false); se(saveBtn, false); se(cancelBtn, true);
                se(updateBtn, true); se(clearBtn, true); se(closeBtn, true);
                se(newBtn, false); se(alterBtn, false); se(removeBtn, false);
                setFormFieldsReadonly(false);
                break;

            case 'ALTER':
                se(signatureBtn, true); se(photoBtn, true); se(bothBtn, true);
                se(addBtn, false); se(editBtn, false); se(saveBtn, true); se(cancelBtn, true);
                se(newBtn, true); se(alterBtn, true); se(removeBtn, true);
                se(updateBtn, true); se(clearBtn, true); se(closeBtn, true);
                setFormFieldsReadonly(false);
                break;

            case 'UPDATE':
                se(signatureBtn, true); se(photoBtn, true); se(bothBtn, true);
                se(addBtn, false); se(editBtn, false); se(saveBtn, true); se(cancelBtn, true);
                se(newBtn, true); se(alterBtn, true); se(removeBtn, true);
                se(updateBtn, false); se(clearBtn, true); se(closeBtn, true);
                setFormFieldsReadonly(false);
                break;

            case 'SAVE':
                se(signatureBtn, true); se(photoBtn, true); se(bothBtn, true);
                se(editBtn, true); se(addBtn, false); se(saveBtn, false); se(cancelBtn, false);
                se(newBtn, false); se(alterBtn, false); se(removeBtn, false);
                se(updateBtn, false); se(clearBtn, false); se(closeBtn, false);
                setFormFieldsReadonly(true);
                break;

            case 'REMOVE':
                se(signatureBtn, true); se(photoBtn, true); se(bothBtn, true);
                se(addBtn, false); se(editBtn, false); se(saveBtn, true); se(cancelBtn, true);
                se(newBtn, true); se(alterBtn, true); se(removeBtn, true);
                se(updateBtn, false); se(clearBtn, false); se(closeBtn, false);
                setFormFieldsReadonly(true);
                break;

            default:
                se(signatureBtn, true); se(photoBtn, true); se(bothBtn, true);
                se(editBtn, true); se(addBtn, false); se(saveBtn, false); se(cancelBtn, false);
                se(newBtn, false); se(alterBtn, false); se(removeBtn, false);
                se(updateBtn, false); se(clearBtn, false); se(closeBtn, false);
                setFormFieldsReadonly(true);
        }
    }

    // ========================================================================
    // API CALLS
    // ========================================================================
    async function loadSignatories() {
        console.log('[AccountSignatories] Loading signatories...');
        if (!state.context.AccountID) {
            console.warn('[AccountSignatories] No AccountID');
            renderGrid([]);
            return;
        }

        showLoader(true);
        try {
            const csrfToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            const headers = {
                'Content-Type': 'application/json',
                ...(csrfToken && { 'RequestVerificationToken': csrfToken })
            };

            const searchKey = `[${state.context.OurBranchID}:${state.context.AccountID}]`;
            const basePayload = {
                SearchKey: searchKey,
                SearchID:  searchKey,
                OurBranchID: state.context.OurBranchID,
                AccountID:   state.context.AccountID,
                OperatorID:  state.context.OperatorID,
                ModuleID: 20
            };

            // V8 backend returns one signatory at a time with Navigation.
            // We loop: Direction=0 (first), then Direction=1 (next) until no NextID.
            const allRows = [];
            let direction = 0;
            let currentID = '';
            let lastMetadata = null;
            const MAX_ITERATIONS = 200; // safety limit

            for (let i = 0; i < MAX_ITERATIONS; i++) {
                const payload = { ...basePayload, Direction: direction, SignatoryID: currentID };
                console.log(`[AccountSignatories] Fetch iteration ${i}, Direction=${direction}, SignatoryID=${currentID}`);

                const resp = await fetch('/AccountsMaintenance/api/get-account-signatories', {
                    method: 'POST', headers, body: JSON.stringify(payload)
                });
                if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
                const result = await resp.json();
                console.log('[AccountSignatories] Response:', result);

                const ok = result?.ResponseCode === '00' || result?.ResponseCode === 0 ||
                           result?.success === true || result?.Success === true;
                if (!ok) {
                    // If first call fails, show error; if mid-navigation, just stop
                    if (i === 0) {
                        showError(result?.ResponseMessage || result?.message || 'Failed to load signatories');
                        renderGrid([]);
                        return;
                    }
                    break;
                }

                // Extract the single record from the response
                const record = extractSingleRecord(result);
                if (!record) {
                    console.log('[AccountSignatories] No record in response, stopping navigation.');
                    break;
                }

                // Avoid duplicates (in case backend loops)
                const rid = record.SignatoryID || record.signatoryID || '';
                if (!allRows.some(r => (r.SignatoryID || r.signatoryID) === rid)) {
                    allRows.push(record);
                }

                // Save metadata from first response
                if (i === 0) lastMetadata = result;

                // Check Navigation for next record
                const nav = result?.Details?.Navigation || result?.Navigation || null;
                const nextID = nav?.NextID;
                const totalCount = nav?.TotalCount ?? 0;

                console.log(`[AccountSignatories] Collected ${allRows.length}/${totalCount}, NextID=${nextID}`);

                if (!nextID || allRows.length >= totalCount) {
                    break; // No more records
                }

                // Navigate to next
                direction = 1;
                currentID = nextID;
            }

            console.log(`[AccountSignatories] Finished loading ${allRows.length} signator(ies).`);
            state.pendingChanges = [];
            state.signatories = allRows;
            renderGrid(allRows);
            if (allRows.length > 0) showSuccess(`Loaded ${allRows.length} signator${allRows.length !== 1 ? 'ies' : 'y'}.`);
            if (lastMetadata) populateBts(lastMetadata);
        } catch (err) {
            console.error('[AccountSignatories] Load error:', err);
            showError('Failed to load: ' + err.message);
            renderGrid([]);
        } finally {
            showLoader(false);
        }
    }

    /**
     * Extract a single signatory record from the V8 navigation response.
     * Expected shape: { Details: { Metadata: {...}, SignatoryData: {...}, Navigation: {...} } }
     * Falls back to legacy array shapes (Details01/Details02) for backward compat.
     */
    function extractSingleRecord(result) {
        // V8 format: Details.SignatoryData is a single object
        const details = result?.Details;
        if (details?.SignatoryData && typeof details.SignatoryData === 'object' && !Array.isArray(details.SignatoryData)) {
            const sig = details.SignatoryData;
            if (sig.SignatoryID || sig.signatoryID || sig.SignatoryName) {
                return sig;
            }
        }

        // Legacy fallback: array in Details01/Details02/Details
        const isSig = arr => Array.isArray(arr) && arr.length > 0 && arr[0] &&
            (arr[0].SignatoryID !== undefined || arr[0].signatoryID !== undefined ||
             arr[0].SignatoryName !== undefined || arr[0].signatoryName !== undefined);

        const data = details || result?.Data || result?.data || result;
        if (Array.isArray(data) && isSig(data)) return data[0];
        if (data && typeof data === 'object') {
            for (const k of ['Details02', 'Details01', 'Details', 'SignatoryData']) {
                if (isSig(data[k])) return data[k][0];
            }
            for (const k of Object.keys(data)) {
                if (isSig(data[k])) return data[k][0];
            }
        }
        return null;
    }

    function populateBts(result) {
        if (window.AccountMaintenanceState) {
            const ps = window.AccountMaintenanceState;
            const m = document.getElementById('operatingMode');
            const i = document.getElementById('operatingInstruction');
            if (m) m.textContent = ps.OperatingModeDescription || ps.OperatingModeID || state.mode;
            if (i) i.textContent = ps.OperatingInstructions || '-';
        }
        const d = result?.Details01?.[0] || result?.data?.Details01?.[0] || null;
        if (!d) return;
        const sf = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '-'; };
        sf('createdBy',    d.CreatedBy || d.OpenedBy);
        sf('createdOn',    d.CreatedOn ? formatDate(d.CreatedOn) : '-');
        sf('modifiedBy',   d.ModifiedBy || d.UpdatedBy);
        sf('modifiedOn',   d.ModifiedOn ? formatDate(d.ModifiedOn) : '-');
        sf('supervisedBy', d.SupervisedBy);
        sf('supervisedOn', d.SupervisedOn ? formatDate(d.SupervisedOn) : '-');
    }

    async function saveAllChanges() {
        console.log('[AccountSignatories] Saving...');
        if (!state.context.AccountID || !state.context.OurBranchID) {
            showError('Missing AccountID or BranchID.');
            return;
        }

        showLoader(true);
        try {
            const searchKey = `[${state.context.OurBranchID}:${state.context.AccountID}]`;
            const maxUC = state.signatories.reduce((m, s) => Math.max(m, parseInt(s.UpdateCount, 10) || 0), 0);
            const csrfToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
            const headers = {
                'Content-Type': 'application/json',
                ...(csrfToken && { 'RequestVerificationToken': csrfToken })
            };

            // Split signatories into new (Add) vs existing (Edit/Remove)
            const newSigs  = state.signatories.filter(s => s._isNew && !s._isDeleted);
            const editSigs = state.signatories.filter(s => !s._isNew); // includes _isModified and _isDeleted

            const buildBasePayload = () => ({
                SearchKey: searchKey,
                SearchID:  searchKey,
                OurBranchID: state.context.OurBranchID,
                AccountID:   state.context.AccountID,
                OperatorID:  state.context.OperatorID || 'web_portal',
                OperatedBy:  state.context.OperatorID || 'web_portal',
                OperatedOn:  new Date().toISOString(),
                SupervisedBy: '',
                UpdateCount: maxUC,
                ModuleID: 20
            });

            let allOk = true;
            let lastMessage = '';

            // 1) Add new signatories (p_V8_AddBankSignatory)
            if (newSigs.length > 0) {
                const addXml = buildXmlForSubset(newSigs, 'N');
                const addPayload = { ...buildBasePayload(), DetailRecords: addXml, SignatoriesXml: addXml };
                console.log('[AccountSignatories] ADD payload:', addPayload);

                const addResp = await fetch('/AccountsMaintenance/api/add-account-signatories', {
                    method: 'POST', headers, body: JSON.stringify(addPayload)
                });
                if (!addResp.ok) throw new Error(`Add HTTP ${addResp.status}`);
                const addResult = await addResp.json();
                console.log('[AccountSignatories] ADD response:', addResult);

                const addOk = addResult?.ResponseCode === '00' || addResult?.ResponseCode === 0 ||
                              addResult?.success === true || addResult?.Success === true;
                if (!addOk) {
                    allOk = false;
                    lastMessage = addResult?.ResponseMessage || addResult?.message || 'Add failed.';
                }
            }

            // 2) Edit/Remove existing signatories (p_V8_EditBankSignatory)
            if (editSigs.length > 0 && allOk) {
                const editXml = buildXmlForSubset(editSigs);
                const editPayload = { ...buildBasePayload(), DetailRecords: editXml, SignatoriesXml: editXml };
                console.log('[AccountSignatories] EDIT payload:', editPayload);

                const editResp = await fetch('/AccountsMaintenance/api/edit-account-signatories', {
                    method: 'POST', headers, body: JSON.stringify(editPayload)
                });
                if (!editResp.ok) throw new Error(`Edit HTTP ${editResp.status}`);
                const editResult = await editResp.json();
                console.log('[AccountSignatories] EDIT response:', editResult);

                const editOk = editResult?.ResponseCode === '00' || editResult?.ResponseCode === 0 ||
                               editResult?.success === true || editResult?.Success === true;
                if (!editOk) {
                    allOk = false;
                    lastMessage = editResult?.ResponseMessage || editResult?.message || 'Edit failed.';
                }
            }

            if (allOk) {
                state.pendingChanges = [];
                showSuccess('Signatories saved successfully.');
                await loadSignatories();
                clearForm();
                state.selectedRow = null;
                state.mode = 'VIEW';
                updateButtonStates();
            } else {
                showError(lastMessage || 'Save failed.');
            }
        } catch (err) {
            console.error('[AccountSignatories] Save error:', err);
            showError('Save error: ' + err.message);
        } finally {
            showLoader(false);
        }
    }

    function buildXml() {
        return buildXmlForSubset(state.signatories);
    }

    /**
     * Build XML for a subset of signatories.
     * @param {Array} sigs - The subset of signatories to serialize.
     * @param {string} [forceMark] - Optional: force all ButtonMark to this value (e.g. 'N' for adds).
     */
    function buildXmlForSubset(sigs, forceMark) {
        let xml = '';
        sigs.forEach((sig, i) => {
            let bm;
            if (forceMark) {
                bm = forceMark;
            } else if (sig._isDeleted) {
                bm = 'R';
            } else if (sig._isNew) {
                bm = 'N';
            } else if (sig._isModified) {
                bm = 'E';
            } else {
                bm = 'E';
            }

            const ref = sig.ReferenceID || sig.Sequence || sig.SeqNo || sig.SequenceNo || (i + 1).toString();
            xml += '<dt_AccountOperatedBy>';
            xml += `<ReferenceID>${escapeXml(ref)}</ReferenceID>`;
            xml += `<SignatoryTypeID>${escapeXml(sig.SignatoryTypeID || '')}</SignatoryTypeID>`;
            xml += `<SignatoryID>${escapeXml(sig.SignatoryID || sig.OperatorID || '')}</SignatoryID>`;
            xml += `<SignatoryName>${escapeXml(sig.SignatoryName || sig.SignatoryID || '')}</SignatoryName>`;
            xml += `<ButtonMark>${bm}</ButtonMark>`;
            if (bm !== 'R') xml += `<IsMendetory>${sig.IsMandatory ? 'true' : 'false'}</IsMendetory>`;
            xml += '</dt_AccountOperatedBy>';
        });
        return xml;
    }

    // ========================================================================
    // GRID OPERATIONS
    // ========================================================================
    function addToGrid(fd) {
        const maxRef = state.signatories.reduce((m, s) => Math.max(m, parseInt(s.ReferenceID, 10) || 0), 0);
        fd.ReferenceID = (maxRef + 1).toString();
        fd._isNew = true;
        state.signatories.push(fd);
        state.pendingChanges.push({ action: 'add', data: fd, index: state.signatories.length - 1 });
        renderGrid(state.signatories);
    }

    function updateGridRow(index, fd) {
        const wasNew = state.signatories[index]?._isNew;
        state.signatories[index] = { ...state.signatories[index], ...fd, _isNew: wasNew, _isModified: !wasNew };
        if (!wasNew) {
            const ei = state.pendingChanges.findIndex(c => c.index === index && c.action === 'edit');
            if (ei >= 0) state.pendingChanges[ei].data = fd;
            else state.pendingChanges.push({ action: 'edit', data: fd, index });
        }
        renderGrid(state.signatories);
        setTimeout(() => {
            const r = tableBody?.querySelector(`tr[data-index="${index}"]`);
            if (r) { tableBody.querySelectorAll('tr.selected').forEach(x => x.classList.remove('selected')); r.classList.add('selected'); }
        }, 50);
    }

    function markForDeletion(index) {
        const sig = state.signatories[index];
        if (!sig) return;
        if (sig._isNew) {
            state.signatories.splice(index, 1);
            state.pendingChanges = state.pendingChanges.filter(c => c.index !== index);
            showInfo('New signatory removed.');
        } else {
            sig._isDeleted = true;
            state.pendingChanges.push({ action: 'delete', data: sig, index });
            showWarning('Signatory marked for deletion. Click Save to persist.');
        }
        renderGrid(state.signatories);
        clearForm();
        state.selectedRow = null;
        const hasPending = state.signatories.some(s => s._isNew || s._isModified || s._isDeleted);
        state.mode = hasPending ? 'UPDATE' : 'VIEW';
        updateButtonStates();
    }

    // ========================================================================
    // IMAGE CAPTURE / DISPLAY
    // ========================================================================
    function openImageCapture(type) {
        console.log('[AccountSignatories] openImageCapture called:', type, '| selectedRow:', state.selectedRow);
        if (state.selectedRow === null || !state.signatories[state.selectedRow]) {
            showWarning('Please select a signatory from the grid first.');
            // Also use parent toast if available for extra visibility
            if (typeof showSystemToast === 'function') {
                showSystemToast('Please select a signatory from the grid first.', { variant: 'warning' });
            }
            return;
        }
        const sig = state.signatories[state.selectedRow];
        const sigId   = sig.SignatoryID || sig.OperatorID || '';
        const sigName = sig.SignatoryName || sig.OperatorName || sigId;

        const mId  = document.getElementById('modalSignatoryId');
        const mNm  = document.getElementById('modalSignatoryName');
        if (mId)  mId.value  = sigId;
        if (mNm)  mNm.value  = sigName;

        const sCol = document.getElementById('signatureCol');
        const pCol = document.getElementById('photoCol');
        if (sCol && pCol) {
            if (type === 'signature') { sCol.hidden = false; sCol.className = 'col-12'; pCol.hidden = true; }
            else if (type === 'photo') { sCol.hidden = true; pCol.hidden = false; pCol.className = 'col-12'; }
            else { sCol.hidden = false; sCol.className = 'col-6'; pCol.hidden = false; pCol.className = 'col-6'; }
        }

        if (type === 'signature' || type === 'both') displayImage('signature', sig);
        if (type === 'photo' || type === 'both')     displayImage('photo', sig);

        const modalEl = document.getElementById('signaturePhotoModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
            // Move modal to document.body so backdrop renders above all containers
            if (modalEl.parentElement !== document.body) {
                document.body.appendChild(modalEl);
            }
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
    }

    function displayImage(imageType, sig) {
        const cid = imageType === 'signature' ? 'signatureImage' : 'photoImage';
        const c = document.getElementById(cid);
        if (!c) return;
        const b64 = sig?.SignatureData || sig?.sImage || sig?.PhotoData || sig?.pImage || sig?.SignatureImage || sig?.PhotoImage;
        if (b64) {
            let mime = 'image/png', clean = b64;
            if (b64.startsWith('data:')) clean = b64.split(',')[1] || b64;
            else if (clean.charAt(0) === '/') mime = 'image/jpeg';
            c.innerHTML = `<img src="data:${mime};base64,${clean}" alt="${imageType}" class="img-fluid" style="max-height:200px;object-fit:contain;">`;
        } else {
            const ic = imageType === 'signature' ? 'bi-pen' : 'bi-person-bounding-box';
            c.innerHTML = `<span class="text-muted"><i class="bi ${ic} fs-1 d-block mb-2"></i>No ${imageType} available</span>`;
        }
    }

    function zoomImage(imageType) {
        const img = document.getElementById(imageType === 'signature' ? 'signatureImage' : 'photoImage')?.querySelector('img');
        if (!img) { showWarning(`No ${imageType} loaded.`); return; }
        const m = document.createElement('div');
        m.className = 'modal fade';
        m.innerHTML = `<div class="modal-dialog modal-lg modal-dialog-centered"><div class="modal-content">
            <div class="modal-header"><h5 class="modal-title">${imageType === 'signature' ? 'Signature' : 'Photo'}</h5><button type="button" class="btn-close" data-bs-dismiss="modal"></button></div>
            <div class="modal-body text-center"><img src="${img.src}" class="img-fluid" alt="${img.alt}"></div></div></div>`;
        document.body.appendChild(m);
        const bsM = new bootstrap.Modal(m);
        m.addEventListener('hidden.bs.modal', () => m.remove());
        bsM.show();
    }

    function downloadImage(imageType) {
        const img = document.getElementById(imageType === 'signature' ? 'signatureImage' : 'photoImage')?.querySelector('img');
        if (!img?.src) { showWarning(`No ${imageType} to download.`); return; }
        const a = document.createElement('a');
        a.href = img.src;
        a.download = `${imageType}_${state.signatories[state.selectedRow]?.SignatoryID || 'unknown'}.png`;
        document.body.appendChild(a); a.click(); document.body.removeChild(a);
    }

    // ========================================================================
    // ACTION HANDLER (unified for form + parent action panel)
    // ========================================================================
    async function handleAction(action) {
        console.log('[AccountSignatories] handleAction called:', action, '| Mode:', state.mode, '| SelectedRow:', state.selectedRow);

        switch (action) {
            // --- Form section buttons ---
            case 'new':
                clearForm();
                state.mode = 'NEW';
                state.selectedRow = null;
                updateButtonStates();
                showInfo('New signatory mode. Fill the form and click Update.');
                document.getElementById('signatoryId')?.focus();
                break;

            case 'alter':
                if (state.selectedRow === null) { showWarning('Please select a signatory first.'); return; }
                state.mode = 'ALTER';
                updateButtonStates();
                showInfo('Alter mode. Make changes and click Update.');
                document.getElementById('signatoryId')?.focus();
                break;

            case 'remove':
                if (state.selectedRow === null) { showWarning('Please select a signatory first.'); return; }
                const rmSig = state.signatories[state.selectedRow];
                const rmName = rmSig?.SignatoryName || rmSig?.SignatoryID || 'this signatory';
                if (confirm(`Are you sure you want to remove ${rmName}?`)) {
                    markForDeletion(state.selectedRow);
                }
                break;

            case 'update':
                if (!['ALTER','UPDATE','NEW','ADD'].includes(state.mode)) {
                    showWarning('Please click ALTER or NEW first.');
                    return;
                }
                const fd = collectFormData();
                const v = validateFormData(fd);
                if (!v.isValid) { showError(v.message); return; }
                if (state.mode === 'ADD' || state.mode === 'NEW') {
                    addToGrid(fd);
                    showSuccess('Signatory added. Saving...');
                    await saveAllChanges();
                } else if (state.selectedRow !== null) {
                    updateGridRow(state.selectedRow, fd);
                    showSuccess('Signatory updated. Saving...');
                    await saveAllChanges();
                } else {
                    showWarning('Please select a signatory.');
                }
                break;

            case 'clear':
                clearForm();
                state.mode = 'VIEW';
                state.selectedRow = null;
                updateButtonStates();
                showInfo('Form cleared.');
                break;

            case 'close-form':
                clearForm();
                state.mode = 'VIEW';
                state.selectedRow = null;
                updateButtonStates();
                break;

            // --- Parent action panel buttons ---
            case 'add':
                clearForm();
                state.mode = 'ADD';
                state.selectedRow = null;
                updateButtonStates();
                showInfo('Add mode. Fill the form and click Update.');
                document.getElementById('signatoryId')?.focus();
                break;

            case 'edit':
                state.mode = 'EDIT';
                updateButtonStates();
                showInfo('Edit mode. Select a signatory or click New.');
                break;

            case 'save':
                await saveAllChanges();
                break;

            case 'cancel':
                clearForm();
                state.pendingChanges = [];
                state.mode = 'VIEW';
                state.selectedRow = null;
                await loadSignatories();
                showInfo('Changes cancelled.');
                break;

            case 'signature': case 'photo': case 'both':
                openImageCapture(action);
                break;

            case 'refresh':
                state.mode = 'VIEW';
                state.signatories = [];
                state.selectedRow = null;
                clearForm();
                getContextFromParent();
                showLoader(true);
                await loadSignatories();
                showLoader(false);
                break;

            case 'close':
            case 'close-submodule':
                // Inline submodule: call parent's closeSubmodule directly
                if (window.AccountMaintenanceCore && typeof window.AccountMaintenanceCore.closeSubmodule === 'function') {
                    window.AccountMaintenanceCore.closeSubmodule();
                } else if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ action: 'submoduleClosed', source: 'Account Signatories' }, '*');
                }
                break;

            default:
                console.log('[AccountSignatories] Unhandled action:', action);
        }
    }

    // ========================================================================
    // EVENT BINDING
    // ========================================================================
    function bindEvents() {
        // Header buttons (refresh, maximize, close)
        document.querySelectorAll('.am-btn[data-action]').forEach(btn => {
            btn.addEventListener('click', e => {
                e.preventDefault();
                const a = btn.getAttribute('data-action');
                if (a === 'maximize') {
                    const mx = windowEl?.classList.toggle('maximized');
                    const ic = btn.querySelector('i');
                    if (ic) ic.className = mx ? 'bi bi-fullscreen-exit' : 'bi bi-square';
                    btn.title = mx ? 'Restore' : 'Maximize';
                } else {
                    handleAction(a);
                }
            });
        });

        // Form section buttons
        document.querySelectorAll('.form-section .btn[data-action]').forEach(btn => {
            btn.addEventListener('click', () => handleAction(btn.getAttribute('data-action')));
        });

        // Parent action panel buttons (by ID)
        // Buttons are created fresh by updateActionPanelForSubmodule (innerHTML),
        // so they have no prior listeners — just bind directly.
        const panelMap = {
            submoduleBtnSignature: 'signature',
            submoduleBtnPhoto:     'photo',
            submoduleBtnBoth:      'both',
            submoduleBtnAdd:       'add',
            submoduleBtnEdit:      'edit',
            submoduleBtnSave:      'save',
            submoduleBtnCancel:    'cancel',
            submoduleBtnClose:     'close-submodule'
        };
        Object.entries(panelMap).forEach(([id, action]) => {
            const btn = document.getElementById(id);
            if (!btn) {
                console.warn(`[AccountSignatories] Panel button #${id} NOT found in DOM`);
                return;
            }
            btn.addEventListener('click', () => {
                console.log(`[AccountSignatories] Panel button clicked: #${id} → ${action}`);
                handleAction(action);
            });
            console.log(`[AccountSignatories] Bound panel button: #${id} → ${action}`);
        });

        // Fallback: event delegation on the action-buttons container
        // This catches clicks even if buttons get replaced after binding
        const actionBtnContainer = document.querySelector('.action-panel .action-buttons');
        if (actionBtnContainer) {
            actionBtnContainer.addEventListener('click', (e) => {
                const btn = e.target.closest('.btn-action[data-action]');
                if (!btn) return;
                const action = btn.getAttribute('data-action');
                if (action) {
                    console.log(`[AccountSignatories] Delegated click on data-action="${action}"`);
                    handleAction(action);
                }
            });
        }

        // Refresh list
        const rlBtn = document.querySelector('[data-action="refresh-list"]');
        if (rlBtn) rlBtn.addEventListener('click', () => loadSignatories());

        // Clear the wired flag on lookup buttons so parent's wireLookups() re-wires them
        document.querySelectorAll('.btn-lookup').forEach(btn => delete btn.dataset.wired);

        // Image zoom/download in modal
        document.querySelectorAll('[data-action="zoom-sig"]').forEach(b => b.addEventListener('click', () => zoomImage('signature')));
        document.querySelectorAll('[data-action="zoom-photo"]').forEach(b => b.addEventListener('click', () => zoomImage('photo')));
        document.querySelectorAll('[data-action="download-sig"]').forEach(b => b.addEventListener('click', () => downloadImage('signature')));
        document.querySelectorAll('[data-action="download-photo"]').forEach(b => b.addEventListener('click', () => downloadImage('photo')));

        // Mandates checkboxes
        document.querySelectorAll('#mandatesDropdownMenu input[type="checkbox"]').forEach(cb => {
            cb.addEventListener('change', updateMandatesButtonText);
        });

        // BTS section toggle
        document.querySelectorAll('[data-section-toggle]').forEach(hdr => {
            hdr.addEventListener('click', () => {
                const sec = hdr.closest('.form-section');
                const cnt = sec?.querySelector('.section-content');
                const ic  = hdr.querySelector('.section-toggle-btn i');
                const tb  = hdr.querySelector('.section-toggle-btn');
                if (cnt) {
                    const exp = !cnt.hidden;
                    cnt.hidden = exp;
                    if (tb) tb.setAttribute('aria-expanded', !exp);
                    if (ic) { ic.classList.toggle('bi-chevron-up', !exp); ic.classList.toggle('bi-chevron-down', exp); }
                }
            });
        });
    }

    // ========================================================================
    // INITIALIZATION
    // ========================================================================
    function init() {
        console.log('[AccountSignatories] Initializing...');
        console.log('[AccountSignatories] submoduleBtnSignature exists?', !!document.getElementById('submoduleBtnSignature'));
        console.log('[AccountSignatories] submoduleBtnAdd exists?', !!document.getElementById('submoduleBtnAdd'));

        resolveDom();
        getContextFromParent();

        state.mode = 'VIEW';
        state.selectedRow = null;

        // Bind all events FIRST (including parent panel buttons)
        bindEvents();

        // Apply initial button states
        updateButtonStates();

        // Load data
        if (state.context.AccountID) {
            showLoader(true);
            loadSignatories().finally(() => showLoader(false));
        } else {
            renderGrid([]);
        }

        console.log('[AccountSignatories] Init complete. Context:', state.context);
    }

    // ========================================================================
    // PUBLIC API
    // ========================================================================
    return {
        init,
        setMode: function (mode) { state.mode = mode; updateButtonStates(); },
        loadSignatories,
        saveAllChanges,
        handleAction
    };
})();

// DO NOT auto-initialize here.
// The parent page (modern-account-maintenance.js) calls init() AFTER
// updateActionPanelForSubmodule() creates the parent action panel buttons.
// Auto-init would fail because those buttons don't exist yet during script execution.
