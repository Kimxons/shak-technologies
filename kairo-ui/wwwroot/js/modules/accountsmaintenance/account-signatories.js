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
        loadMetadata: null,
        context: {
            OurBranchID: '',
            AccountID: '',
            OperatorID: '',
            ClientID: '',
            BankID: '00'
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
        // Re-resolve messageBar lazily if not found initially
        if (!messageBar) messageBar = document.querySelector('.de-message-bar');

        // Always use parent toast system for prominent notifications
        if (typeof window.showSystemToast === 'function') {
            window.showSystemToast(msg, { variant: type === 'error' ? 'error' : type === 'warning' ? 'warning' : type === 'success' ? 'success' : 'info' });
        }

        // Also update the inline message bar
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
    function showError(m) { showMessage(m, 'error'); }
    function showWarning(m) { showMessage(m, 'warning'); }
    function showInfo(m) { showMessage(m, 'info'); }

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

    function getJsonHeaders() {
        const csrfToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        return {
            'Content-Type': 'application/json',
            ...(csrfToken && { RequestVerificationToken: csrfToken })
        };
    }

    async function postJson(endpoint, payload) {
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: getJsonHeaders(),
            body: JSON.stringify(payload)
        });

        let result = null;
        try {
            result = await response.json();
        } catch {
            result = null;
        }

        if (!response.ok) {
            throw new Error(result?.ErrorMessage || result?.ResponseMessage || `HTTP ${response.status}`);
        }

        return result;
    }

    function formatDate(value) {
        if (!value) return '-';
        if (window.GlobalUtils?.formatDate) {
            return window.GlobalUtils.formatDate(value);
        }
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
            state.context.AccountID = window.AccountMaintenanceState.AccountID || '';
            state.context.OperatorID = window.AccountMaintenanceState.OperatorID || '';
            state.context.ClientID = window.AccountMaintenanceState.ClientID || '';
            state.context.BankID = window.AccountMaintenanceState.BankID
                || sessionStorage.getItem('BankId')
                || sessionStorage.getItem('BankID')
                || '00';
            console.log('[AccountSignatories] Context from AccountMaintenanceState:', state.context);
            return;
        }
        // 2) sessionStorage fallback
        state.context.AccountID = sessionStorage.getItem('currentAccountID') || '';
        state.context.OurBranchID = sessionStorage.getItem('currentBranchID') || '';
        state.context.OperatorID = sessionStorage.getItem('currentOperatorID') || 'SYSTEM';
        state.context.ClientID = sessionStorage.getItem('currentClientID') || '';
        state.context.BankID = sessionStorage.getItem('BankId') || sessionStorage.getItem('BankID') || '00';
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

        ['createdBy', 'createdOn', 'modifiedBy', 'modifiedOn', 'supervisedBy', 'supervisedOn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
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

        sv('signatoryId', fv(['SignatoryID', 'signatoryID', 'OperatorID']));
        sv('signatoryName', fv(['SignatoryName', 'signatoryName', 'OperatorName']));
        sv('groupId', fv(['GroupID', 'groupID']));
        sv('sequenceNo', fv(['ReferenceID', 'Sequence', 'SeqNo', 'SequenceNo']));
        sv('limit', fv(['Limit', 'limit']));

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
            const mv = fv(['IsMandatory', 'isMandatory', 'Ismandatory', 'IsMendetory', 'Mandatory']);
            mand.checked = mv === true || mv === 1 || mv === '1' || mv === 'Y' || mv === 'Yes';
        }

        const menu = document.getElementById('mandatesDropdownMenu');
        if (menu) {
            menu.querySelectorAll('input[type="checkbox"]').forEach(cb => (cb.checked = false));
            const fallbackMandate = state.loadMetadata?.AgentMandate || state.loadMetadata?.agentMandate || '';
            const vals = String(fv(['AgentMandate', 'agentMandate', 'Mandates', 'MandateID', 'mandateID']) || fallbackMandate).split(',').map(v => v.trim()).filter(Boolean);
            vals.forEach(v => {
                const cb = menu.querySelector(`input[type="checkbox"][value="${v}"]`);
                if (cb) cb.checked = true;
            });
            updateMandatesButtonText();
        }

        const sa = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v ?? '-'; };
        sa('createdBy', data.CreatedBy);
        sa('createdOn', data.CreatedOn ? formatDate(data.CreatedOn) : '-');
        sa('modifiedBy', data.ModifiedBy);
        sa('modifiedOn', data.ModifiedOn ? formatDate(data.ModifiedOn) : '-');
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
        const openedDate = existing?.OpenedDate || existing?.openedDate || new Date().toISOString().split('T')[0];
        const updateCount = existing?.UpdateCount ?? existing?.updateCount ?? 0;
        const referenceID = gv('sequenceNo') || existing?.ReferenceID || existing?.Sequence || existing?.SeqNo || existing?.SequenceNo || '';

        let fd = {
            OurBranchID: state.context.OurBranchID,
            AccountID: state.context.AccountID,
            SignatoryID: gv('signatoryId'),
            SignatoryName: gv('signatoryName') || gv('signatoryId'),
            GroupID: gv('groupId'),
            SignatoryTypeID: stVal,
            SignatoryType: stTxt,
            ReferenceID: referenceID,
            Limit: gv('limit'),
            AgentMandate: getSelectedMandates(),
            Mandates: getSelectedMandates(),
            IsMandatory: document.getElementById('isMandatory')?.checked || false,
            OpenedDate: openedDate,
            UpdateCount: updateCount,
            SignID: existing?.SignID || existing?.SignatoryID || gv('signatoryId'),
            PhotoID: existing?.PhotoID || existing?.SignatoryID || gv('signatoryId'),
            _isNew: isNew,
            _isModified: !isNew
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

    function getMandateLabel(value) {
        const lbl = document.querySelector(`#mandatesDropdownMenu input[value="${value}"]`)?.closest('.form-check')?.querySelector('label');
        return lbl ? lbl.textContent.trim() : value;
    }

    // ========================================================================
    // MANDATES HELPERS
    // ========================================================================
    function getSelectedMandates() {
        const cbs = document.querySelectorAll('#mandatesDropdownMenu input[type="checkbox"]:checked');
        return Array.from(cbs)
            .map(cb => ({ value: cb.value, label: getMandateLabel(cb.value) }))
            .sort((a, b) => a.label.localeCompare(b.label) || a.value.localeCompare(b.value))
            .map(item => item.value)
            .join(',');
    }

    function updateMandatesButtonText() {
        const btn = document.getElementById('mandatesDropdown');
        if (!btn) return;
        const sel = getSelectedMandates();
        if (sel) {
            const labels = sel.split(',').map(v => getMandateLabel(v));
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

        const visible = state.signatories
            .filter(r => !r._isDeleted)
            .slice()
            .sort((a, b) => {
                const av = parseInt(a.ReferenceID || a.referenceID || a.SequenceNo || a.Sequence || a.SeqNo, 10);
                const bv = parseInt(b.ReferenceID || b.referenceID || b.SequenceNo || b.Sequence || b.SeqNo, 10);
                const aNum = Number.isNaN(av) ? Number.MAX_SAFE_INTEGER : av;
                const bNum = Number.isNaN(bv) ? Number.MAX_SAFE_INTEGER : bv;
                if (aNum !== bNum) return aNum - bNum;
                return String(a.SignatoryID || a.signatoryID || '').localeCompare(String(b.SignatoryID || b.signatoryID || ''));
            });
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
            const idx = state.signatories.indexOf(row);
            const sid = fv(row, ['SignatoryID', 'signatoryID', 'OperatorID']) || '-';
            const nm = fv(row, ['SignatoryName', 'signatoryName', 'OperatorName']) || '-';
            const st = fv(row, ['SignatoryType', 'SignatoryTypeID', 'signatoryType']) || '-';
            const lim = fv(row, ['Limit', 'limit', 'GroupID']) || '-';
            const ref = fv(row, ['ReferenceID', 'referenceID', 'SequenceNo', 'SeqNo']) || '-';
            const mv = fv(row, ['IsMandatory', 'isMandatory', 'Ismandatory', 'IsMendetory', 'Mandatory']);
            const mand = mv === true || mv === 1 || mv === '1' || mv === 'Y' || mv === 'Yes';
            const isN = row._isNew === true;
            const isM = row._isModified === true;
            const cls = isN ? 'table-info' : isM ? 'table-warning' : '';
            const bdg = isN ? ' <span class="badge bg-success">NEW</span>' : isM ? ' <span class="badge bg-warning">MOD</span>' : '';

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
            populateBts(state.loadMetadata, d);
            state.mode = state.pendingChanges.length > 0 ? 'UPDATE' : 'VIEW';
            updateButtonStates();
            showInfo('Signatory selected. Click Edit or Alter to modify it.');
        }
    }

    // ========================================================================
    // BUTTON STATE MANAGEMENT
    // ========================================================================
    function updateButtonStates() {
        // Parent action-panel buttons
        const signatureBtn = document.getElementById('submoduleBtnSignature');
        const photoBtn = document.getElementById('submoduleBtnPhoto');
        const bothBtn = document.getElementById('submoduleBtnBoth');
        const addBtn = document.getElementById('submoduleBtnAdd');
        const editBtn = document.getElementById('submoduleBtnEdit');
        const saveBtn = document.getElementById('submoduleBtnSave');
        const cancelBtn = document.getElementById('submoduleBtnCancel');
        const closeSubmoduleBtn = document.getElementById('submoduleBtnClose');

        const se = (btn, on) => {
            if (!btn) return;
            btn.disabled = !on;
            btn.classList.toggle('disabled', !on);
            btn.style.opacity = on ? '1' : '0.5';
        };

        const sa = (btn, on) => {
            if (!btn) return;
            btn.classList.toggle('active', !!on);
        };

        // Update BTS operating mode display
        const modeEl = document.getElementById('operatingMode');
        if (modeEl) modeEl.textContent = state.mode;

        const hasPending = state.pendingChanges.length > 0;
        const hasRows = state.signatories.some(s => !s._isDeleted);
        const hasSelection = state.selectedRow !== null && !!state.signatories[state.selectedRow] && !state.signatories[state.selectedRow]._isDeleted;

        sa(addBtn, state.mode === 'ADD' || state.mode === 'NEW');
        sa(editBtn, state.mode === 'ALTER' || state.mode === 'UPDATE');
        sa(saveBtn, hasPending || state.mode === 'REMOVE');
        sa(signatureBtn, false);
        sa(photoBtn, false);
        sa(bothBtn, false);

        switch (state.mode) {
            case 'VIEW':
                se(signatureBtn, hasSelection); se(photoBtn, hasSelection); se(bothBtn, hasSelection);
                se(editBtn, hasRows); se(addBtn, true); se(saveBtn, hasPending); se(cancelBtn, hasPending);
                se(closeSubmoduleBtn, true);
                setFormFieldsReadonly(true);
                break;

            case 'EDIT':
                se(signatureBtn, hasSelection); se(photoBtn, hasSelection); se(bothBtn, hasSelection);
                se(editBtn, hasRows); se(addBtn, true); se(saveBtn, hasPending); se(cancelBtn, true);
                se(closeSubmoduleBtn, true);
                setFormFieldsReadonly(true);
                break;

            case 'ADD': case 'NEW':
                se(signatureBtn, false); se(photoBtn, false); se(bothBtn, false);
                se(addBtn, false); se(editBtn, false); se(saveBtn, true); se(cancelBtn, true);
                se(closeSubmoduleBtn, true);
                setFormFieldsReadonly(false);
                break;

            case 'ALTER':
                se(signatureBtn, hasSelection); se(photoBtn, hasSelection); se(bothBtn, hasSelection);
                se(addBtn, false); se(editBtn, false); se(saveBtn, true); se(cancelBtn, true);
                se(closeSubmoduleBtn, true);
                setFormFieldsReadonly(false);
                break;

            case 'UPDATE':
                se(signatureBtn, hasSelection); se(photoBtn, hasSelection); se(bothBtn, hasSelection);
                se(addBtn, false); se(editBtn, false); se(saveBtn, true); se(cancelBtn, true);
                se(closeSubmoduleBtn, true);
                setFormFieldsReadonly(false);
                break;

            case 'SAVE':
                se(signatureBtn, hasSelection); se(photoBtn, hasSelection); se(bothBtn, hasSelection);
                se(editBtn, hasRows); se(addBtn, true); se(saveBtn, false); se(cancelBtn, false);
                se(closeSubmoduleBtn, true);
                setFormFieldsReadonly(true);
                break;

            case 'REMOVE':
                se(signatureBtn, hasSelection); se(photoBtn, hasSelection); se(bothBtn, hasSelection);
                se(addBtn, false); se(editBtn, false); se(saveBtn, true); se(cancelBtn, true);
                se(closeSubmoduleBtn, true);
                setFormFieldsReadonly(true);
                break;

            default:
                se(signatureBtn, hasSelection); se(photoBtn, hasSelection); se(bothBtn, hasSelection);
                se(editBtn, hasRows); se(addBtn, true); se(saveBtn, hasPending); se(cancelBtn, hasPending);
                se(closeSubmoduleBtn, true);
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
            let allRows = [];
            let lastMetadata = null;
            const searchKey = `[${state.context.OurBranchID}:${state.context.AccountID}]`;
            const basePayload = {
                SearchKey: searchKey,
                SearchID: searchKey,
                OurBranchID: state.context.OurBranchID,
                AccountID: state.context.AccountID,
                OperatorID: state.context.OperatorID,
                BankID: state.context.BankID || '00',
                ModuleID: 20,
                IncludeAgentMandate: true,
                IncludeClosed: false
            };

            const firstPayload = { ...basePayload, Direction: 0, SignatoryID: '' };
            const firstResult = await postJson('/AccountsMaintenance/api/get-account-signatories', firstPayload);
            console.log('[AccountSignatories] First response:', firstResult);

            const firstOk = firstResult?.ResponseCode === '00' || firstResult?.ResponseCode === 0 ||
                firstResult?.success === true || firstResult?.Success === true ||
                firstResult?.Details || firstResult?.data;
            if (!firstOk) {
                showError(firstResult?.ResponseMessage || firstResult?.message || 'Failed to load signatories');
                renderGrid([]);
                return;
            }

            const parsed = parseSignatoriesResponse(firstResult);
            allRows = parsed.rows;
            lastMetadata = parsed.metadata || firstResult;

            if (allRows.length === 0) {
                allRows = await loadSignatoriesByNavigation(basePayload, firstResult);
            }

            console.log(`[AccountSignatories] Finished loading ${allRows.length} signator(ies).`);
            state.pendingChanges = [];
            state.loadMetadata = lastMetadata;
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

    function parseSignatoriesResponse(result) {
        const rows = [];
        const seen = new Set();
        let metadata = null;
        let sharedAgentMandate = null;

        const isStatusRow = item => item && typeof item === 'object' &&
            ((item.ResponseCode !== undefined) || (item.EventID !== undefined && item.SignatoryID === undefined && item.SignatoryName === undefined));

        const isSignatoryRow = item => item && typeof item === 'object' &&
            (item.SignatoryID !== undefined || item.signatoryID !== undefined || item.SignatoryName !== undefined || item.signatoryName !== undefined);

        const pushRows = value => {
            if (!Array.isArray(value)) return;
            value.forEach(item => {
                if (!isSignatoryRow(item) || isStatusRow(item)) return;
                const key = item.SignatoryID || item.signatoryID || item.ReferenceID || `${rows.length}`;
                if (seen.has(key)) return;
                seen.add(key);
                rows.push(item);
            });
        };

        const scanObject = obj => {
            if (!obj || typeof obj !== 'object') return;

            if (!metadata && obj.Metadata && typeof obj.Metadata === 'object' && !Array.isArray(obj.Metadata)) {
                metadata = obj.Metadata;
            }

            if (sharedAgentMandate == null && obj.AgentMandate !== undefined && obj.AgentMandate !== null) {
                sharedAgentMandate = obj.AgentMandate;
            }

            if (Array.isArray(obj.AccountOperators)) pushRows(obj.AccountOperators);
            if (Array.isArray(obj.Signatories)) pushRows(obj.Signatories);
            if (Array.isArray(obj.SignatoryData)) pushRows(obj.SignatoryData);

            Object.keys(obj).forEach(key => {
                const value = obj[key];
                if (Array.isArray(value)) {
                    pushRows(value);
                    return;
                }

                if (value && typeof value === 'object' && !Array.isArray(value)) {
                    if (!metadata && key.toLowerCase().includes('metadata')) metadata = value;
                    if (isSignatoryRow(value)) pushRows([value]);
                }
            });
        };

        scanObject(result);
        scanObject(result?.Details);
        scanObject(result?.data);
        scanObject(result?.Data);

        if (sharedAgentMandate) {
            rows.forEach(row => {
                if (row.AgentMandate === undefined && row.Mandates === undefined && row.MandateID === undefined) {
                    row.AgentMandate = sharedAgentMandate;
                }
            });

            metadata = metadata || {};
            if (metadata.AgentMandate === undefined) {
                metadata.AgentMandate = sharedAgentMandate;
            }
        }

        return { rows, metadata };
    }

    async function loadSignatoriesByNavigation(basePayload, firstResult) {
        const allRows = [];
        const seedRecord = extractSingleRecord(firstResult);
        const seedId = seedRecord?.SignatoryID || seedRecord?.signatoryID || '';
        if (seedRecord && !allRows.some(r => (r.SignatoryID || r.signatoryID) === seedId)) {
            allRows.push(seedRecord);
        }

        let currentID = firstResult?.Details?.Navigation?.NextID || firstResult?.Navigation?.NextID || '';
        const totalCount = firstResult?.Details?.Navigation?.TotalCount ?? firstResult?.Navigation?.TotalCount ?? 0;
        const MAX_ITERATIONS = 200;

        for (let i = 0; i < MAX_ITERATIONS && currentID; i++) {
            const payload = { ...basePayload, Direction: 1, SignatoryID: currentID };
            const result = await postJson('/AccountsMaintenance/api/get-account-signatories', payload);
            const record = extractSingleRecord(result);
            if (!record) break;

            const recordId = record.SignatoryID || record.signatoryID || '';
            if (!allRows.some(r => (r.SignatoryID || r.signatoryID) === recordId)) {
                allRows.push(record);
            }

            currentID = result?.Details?.Navigation?.NextID || result?.Navigation?.NextID || '';
            if (!currentID || (totalCount > 0 && allRows.length >= totalCount)) break;
        }

        return allRows;
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

    function pickAuditValue(source, keys) {
        if (!source || typeof source !== 'object') return null;
        for (const key of keys) {
            if (source[key] !== undefined && source[key] !== null && source[key] !== '') {
                return source[key];
            }
        }
        return null;
    }

    function resolveBtsData(result, selectedRowData) {
        const details = result?.Details || result?.data?.Details || result?.Data?.Details || null;
        const metadata = result?.Metadata || details?.Metadata || result?.data?.Metadata || state.loadMetadata || null;
        const summary = result?.Summary || details?.Summary || result?.data?.Summary || null;
        const rowData = selectedRowData || (state.selectedRow !== null ? state.signatories[state.selectedRow] : null);
        const parentState = window.AccountMaintenanceState || {};

        return {
            metadata,
            summary,
            rowData,
            operatingMode: parentState.OperatingModeDescription
                || parentState.OperatingMode
                || parentState.OperatingModeID
                || pickAuditValue(rowData, ['OperatingModeDescription', 'OperatingMode', 'OperatingModeID'])
                || pickAuditValue(metadata, ['OperatingModeDescription', 'OperatingMode', 'OperatingModeID'])
                || state.mode,
            operatingInstruction: parentState.OperatingInstructions
                || parentState.OperatingInstruction
                || parentState.OperatingInstructionID
                || pickAuditValue(rowData, ['OperatingInstructions', 'OperatingInstruction', 'OperatingInstructionID'])
                || pickAuditValue(metadata, ['OperatingInstructions', 'OperatingInstruction', 'OperatingInstructionID'])
                || '-',
            createdBy: pickAuditValue(rowData, ['CreatedBy', 'OpenedBy']),
            createdOn: pickAuditValue(rowData, ['CreatedOn', 'OpenedDate']),
            modifiedBy: pickAuditValue(rowData, ['ModifiedBy', 'UpdatedBy']),
            modifiedOn: pickAuditValue(rowData, ['ModifiedOn', 'UpdatedOn']),
            supervisedBy: pickAuditValue(rowData, ['SupervisedBy']),
            supervisedOn: pickAuditValue(rowData, ['SupervisedOn'])
        };
    }

    function populateBts(result, selectedRowData) {
        const bts = resolveBtsData(result, selectedRowData);

        if (window.AccountMaintenanceState) {
            const m = document.getElementById('operatingMode');
            const i = document.getElementById('operatingInstruction');
            if (m) m.textContent = bts.operatingMode || '-';
            if (i) i.textContent = bts.operatingInstruction || '-';
        }

        const sf = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v || '-'; };
        sf('createdBy', bts.createdBy || '-');
        sf('createdOn', bts.createdOn ? formatDate(bts.createdOn) : '-');
        sf('modifiedBy', bts.modifiedBy || '-');
        sf('modifiedOn', bts.modifiedOn ? formatDate(bts.modifiedOn) : '-');
        sf('supervisedBy', bts.supervisedBy || '-');
        sf('supervisedOn', bts.supervisedOn ? formatDate(bts.supervisedOn) : '-');
    }

    function buildSignatoriesApiPayload(detailRecords) {
        const searchKey = `[${state.context.OurBranchID}:${state.context.AccountID}]`;
        return {
            AccountID: state.context.AccountID,
            SearchKey: searchKey,
            SearchID: searchKey,
            OurBranchID: state.context.OurBranchID,
            OperatorID: state.context.OperatorID || 'web_portal',
            BankID: state.context.BankID || '00',
            ModuleID: 20,
            OperatingModeID: window.AccountMaintenanceState?.OperatingModeID || '',
            OperatingInstructionID: window.AccountMaintenanceState?.OperatingInstructionID || '',
            SignatoriesXml: detailRecords
        };
    }

    function buildAddSignatoriesApiPayload(signatories) {
        const searchKey = `[${state.context.OurBranchID}:${state.context.AccountID}]`;
        const maxUpdateCount = (state.signatories || []).reduce((max, sig) => {
            const count = parseInt(sig?.UpdateCount ?? sig?.updateCount ?? 0, 10) || 0;
            return Math.max(max, count);
        }, 0);
        const detailRecords = (signatories || []).map((sig, index) => {
            const referenceId = sig.ReferenceID || sig.Sequence || sig.SeqNo || sig.SequenceNo || String(index + 1);
            const mandateId = sig.AgentMandate || sig.agentMandate || sig.Mandates || sig.MandateID || sig.mandateID || '';
            const limit = sig.Limit ?? sig.limit ?? '';
            const groupId = sig.GroupID ?? sig.groupID ?? sig.groupId ?? '';
            const isMandatory = sig.IsMandatory ?? sig.isMandatory ?? sig.Mandatory ?? sig.IsMendetory ?? false;

            return {
                ReferenceID: String(referenceId),
                SignatoryID: sig.SignatoryID || sig.OperatorID || '',
                SignatoryTypeID: sig.SignatoryTypeID || '',
                Limit: limit,
                GroupID: groupId,
                AgentMandateID: mandateId,
                IsMandatory: !!isMandatory
            };
        });

        return {
            AccountID: state.context.AccountID,
            SearchKey: searchKey,
            SearchID: searchKey,
            OurBranchID: state.context.OurBranchID,
            OperatorID: state.context.OperatorID || 'web_portal',
            OperatedBy: state.context.OperatorID || 'web_portal',
            OperatedOn: new Date().toISOString(),
            SupervisedBy: '',
            UpdateCount: maxUpdateCount,
            BankID: state.context.BankID || '00',
            ModuleID: 20,
            OperatingModeID: window.AccountMaintenanceState?.OperatingModeID || '',
            OperatingInstructionID: window.AccountMaintenanceState?.OperatingInstructionID || '',
            DetailRecords: detailRecords
        };
    }

    async function saveSignatoriesBatch(endpoint, signatories, forceMark) {
        if (!Array.isArray(signatories) || signatories.length === 0) {
            return null;
        }

        const isAddEndpoint = endpoint === '/AccountsMaintenance/api/add-account-signatories';
        const detailRecords = isAddEndpoint ? null : buildXmlForSubset(signatories, forceMark);
        const payload = isAddEndpoint
            ? buildAddSignatoriesApiPayload(signatories)
            : buildSignatoriesApiPayload(detailRecords);
        console.log('[AccountSignatories] Saving batch:', { endpoint, count: signatories.length, payload });

        const result = await postJson(endpoint, payload);
        const ok = result?.success === true || result?.Success === true || result?.ResponseCode === '00' || result?.ResponseCode === 0;
        if (!ok) {
            throw new Error(result?.ErrorMessage || result?.ResponseMessage || result?.message || 'Failed to save signatories.');
        }

        return result;
    }

    async function saveAllChanges() {
        console.log('[AccountSignatories] Saving...');
        if (!state.context.AccountID || !state.context.OurBranchID) {
            showError('Missing AccountID or BranchID.');
            return;
        }

        showLoader(true);
        try {
            const maxUC = state.signatories.reduce((m, s) => Math.max(m, parseInt(s.UpdateCount, 10) || 0), 0);
            const changedRows = state.signatories.filter(s => s._isNew || s._isModified || s._isDeleted);
            console.log('[AccountSignatories] Pending changes summary:', {
                mode: state.mode,
                total: state.signatories.length,
                changedRows: changedRows.length,
                pendingChanges: state.pendingChanges.length
            });

            if (changedRows.length === 0) {
                showInfo('No changes to save.');
                return;
            }

            const newRows = changedRows.filter(s => s._isNew && !s._isDeleted);
            const existingRows = changedRows.filter(s => !s._isNew && (s._isModified || s._isDeleted));

            if (newRows.length > 0) {
                try {
                    await saveSignatoriesBatch('/AccountsMaintenance/api/add-account-signatories', newRows, 'N');
                } catch (err) {
                    if (String(err?.message || '').includes('Transaction count after EXECUTE')) {
                        throw new Error('The add signatory stored procedure is failing in the backend with a transaction mismatch. Existing signatory edits can save, but new signatories need the AccountManagement add procedure fixed.');
                    }
                    throw err;
                }
            }

            if (existingRows.length > 0) {
                await saveSignatoriesBatch('/AccountsMaintenance/api/edit-account-signatories', existingRows);
            }

            state.pendingChanges = [];
            showSuccess('Signatories saved successfully.');
            await loadSignatories();
            clearForm();
            state.selectedRow = null;
            state.mode = 'VIEW';
            updateButtonStates();
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
            const mandates = sig.AgentMandate || sig.agentMandate || sig.Mandates || sig.MandateID || sig.mandateID || '';
            const limit = sig.Limit ?? sig.limit ?? sig.GroupID ?? sig.groupID ?? sig.groupId ?? '';
            xml += '<dt_AccountOperatedBy>';
            xml += `<ReferenceID>${escapeXml(ref)}</ReferenceID>`;
            xml += `<SignatoryTypeID>${escapeXml(sig.SignatoryTypeID || '')}</SignatoryTypeID>`;
            xml += `<SignatoryID>${escapeXml(sig.SignatoryID || sig.OperatorID || '')}</SignatoryID>`;
            xml += `<SignatoryName>${escapeXml(sig.SignatoryName || sig.SignatoryID || '')}</SignatoryName>`;
            xml += `<ButtonMark>${bm}</ButtonMark>`;
            if (bm !== 'R') {
                xml += `<Limit>${escapeXml(limit)}</Limit>`;
                xml += `<GroupID>${escapeXml(limit)}</GroupID>`;
                xml += `<IsMendetory>${sig.IsMandatory ? 'true' : 'false'}</IsMendetory>`;
                xml += `<IsMandatory>${sig.IsMandatory ? 'true' : 'false'}</IsMandatory>`;
                xml += `<Mandatory>${sig.IsMandatory ? 'true' : 'false'}</Mandatory>`;
                xml += `<AgentMandate>${escapeXml(mandates)}</AgentMandate>`;
                xml += `<Mandates>${escapeXml(mandates)}</Mandates>`;
                xml += `<MandateID>${escapeXml(mandates)}</MandateID>`;
            }
            xml += '</dt_AccountOperatedBy>';
        });
        return xml;
    }

    // ========================================================================
    // GRID OPERATIONS
    // ========================================================================
    function addToGrid(fd) {
        const maxRef = state.signatories.reduce((m, s) => Math.max(m, parseInt(s.ReferenceID, 10) || 0), 0);
        const typedRef = parseInt(fd.ReferenceID, 10);
        fd.ReferenceID = Number.isNaN(typedRef) ? String(maxRef + 1) : String(typedRef);
        fd._isNew = true;
        fd.UpdateCount = fd.UpdateCount ?? 0;
        fd.OpenedDate = fd.OpenedDate || new Date().toISOString().split('T')[0];
        state.signatories.push(fd);
        state.pendingChanges.push({ action: 'add', data: fd, index: state.signatories.length - 1 });
        renderGrid(state.signatories);
    }

    function updateGridRow(index, fd) {
        const wasNew = state.signatories[index]?._isNew;
        const existing = state.signatories[index] || {};
        state.signatories[index] = {
            ...existing,
            ...fd,
            ReferenceID: fd.ReferenceID || existing.ReferenceID || existing.Sequence || existing.SeqNo || existing.SequenceNo,
            UpdateCount: fd.UpdateCount ?? existing.UpdateCount ?? existing.updateCount ?? 0,
            OpenedDate: fd.OpenedDate || existing.OpenedDate || existing.openedDate,
            SignID: fd.SignID || existing.SignID || existing.SignatoryID,
            PhotoID: fd.PhotoID || existing.PhotoID || existing.SignatoryID,
            _isNew: wasNew,
            _isModified: !wasNew
        };
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
        const sigId = sig.SignatoryID || sig.OperatorID || '';
        const sigName = sig.SignatoryName || sig.OperatorName || sigId;

        const mId = document.getElementById('modalSignatoryId');
        const mNm = document.getElementById('modalSignatoryName');
        if (mId) mId.value = sigId;
        if (mNm) mNm.value = sigName;

        const sCol = document.getElementById('signatureCol');
        const pCol = document.getElementById('photoCol');
        if (sCol && pCol) {
            if (type === 'signature') { sCol.hidden = false; sCol.className = 'col-12'; pCol.hidden = true; }
            else if (type === 'photo') { sCol.hidden = true; pCol.hidden = false; pCol.className = 'col-12'; }
            else { sCol.hidden = false; sCol.className = 'col-6'; pCol.hidden = false; pCol.className = 'col-6'; }
        }

        if (type === 'signature' || type === 'both') displayImage('signature', sig, sigId);
        if (type === 'photo' || type === 'both') displayImage('photo', sig, sigId);

        const modalEl = document.getElementById('signaturePhotoModal');
        if (modalEl && typeof bootstrap !== 'undefined') {
            // Move modal to document.body so backdrop renders above all containers
            if (modalEl.parentElement !== document.body) {
                document.body.appendChild(modalEl);
            }
            bootstrap.Modal.getOrCreateInstance(modalEl).show();
        }
    }

    async function displayImage(imageType, sig, signatoryId) {
        const cid = imageType === 'signature' ? 'signatureImage' : 'photoImage';
        const c = document.getElementById(cid);
        if (!c) return;

        const directB64 = imageType === 'signature'
            ? sig?.SignatureData || sig?.sImage || sig?.SignatureImage
            : sig?.PhotoData || sig?.pImage || sig?.PhotoImage;

        c.innerHTML = `<span class="text-muted"><i class="bi bi-hourglass-split fs-1 d-block mb-2"></i>Loading ${imageType}...</span>`;

        let b64 = directB64;
        if (!b64 && signatoryId) {
            b64 = await fetchImageFromEndpoint(imageType, signatoryId);
        }

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

    async function fetchImageFromEndpoint(imageType, signatoryId) {
        const csrfToken = document.querySelector('input[name="__RequestVerificationToken"]')?.value;
        const headers = {
            'Content-Type': 'application/json',
            ...(csrfToken && { 'RequestVerificationToken': csrfToken })
        };

        const endpoint = imageType === 'signature'
            ? '/AccountsMaintenance/api/get-signature-image'
            : '/AccountsMaintenance/api/get-photo-image';

        try {
            const resp = await fetch(endpoint, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    OurBranchID: state.context.OurBranchID,
                    SignatoryID: signatoryId,
                    OperatorID: state.context.OperatorID
                })
            });

            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const result = await resp.json();
            return result?.ImageData || result?.imageData || result?.Data || result?.data || null;
        } catch (err) {
            console.error(`[AccountSignatories] Failed to fetch ${imageType}:`, err);
            return null;
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
            // --- Parent action panel buttons ---
            case 'add':
                clearForm();
                state.mode = 'ADD';
                state.selectedRow = null;
                updateButtonStates();
                showInfo('Add mode. Fill the form, then click Save to persist changes.');
                document.getElementById('signatoryId')?.focus();
                break;

            case 'edit':
                if (state.selectedRow === null) {
                    showWarning('Please select a signatory first.');
                    return;
                }
                state.mode = 'ALTER';
                updateButtonStates();
                showInfo('Edit mode. Make changes, then click Save to persist changes.');
                document.getElementById('signatoryId')?.focus();
                break;

            case 'save':
                if (state.mode === 'ADD' || state.mode === 'ALTER') {
                    const fd = collectFormData();
                    const v = validateFormData(fd);
                    if (!v.isValid) { showError(v.message); return; }

                    if (state.mode === 'ADD') {
                        addToGrid(fd);
                    } else if (state.selectedRow !== null) {
                        updateGridRow(state.selectedRow, fd);
                    } else {
                        showWarning('Please select a signatory.');
                        return;
                    }

                    state.mode = 'UPDATE';
                    updateButtonStates();
                }
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
            submoduleBtnPhoto: 'photo',
            submoduleBtnBoth: 'both',
            submoduleBtnAdd: 'add',
            submoduleBtnEdit: 'edit',
            submoduleBtnSave: 'save',
            submoduleBtnCancel: 'cancel',
            submoduleBtnClose: 'close-submodule'
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
                const ic = hdr.querySelector('.section-toggle-btn i');
                const tb = hdr.querySelector('.section-toggle-btn');
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
