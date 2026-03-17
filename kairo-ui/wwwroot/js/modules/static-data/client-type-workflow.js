/**
 * Client Type Workflow Module
 * MVC Pattern: state + AppCore.invokeControllerAsync + POST endpoints
 * Only VIEW and EDIT modes – no Add/Delete.
 */
(function () {
    'use strict';

    if (window.__kairoClientTypeWorkflowLoaded) return;
    window.__kairoClientTypeWorkflowLoaded = true;

    // ─── Constants ───────────────────────────────────────────────────────
    const MODES = { VIEW: 'View', EDIT: 'Edit' };

    const endpoints = {
        getWorkflowOptions: '/StaticData/ClientTypeWorkflow/GetWorkflowOptions',
        getWorkflow:        'StaticData/ClientTypeWorkflow/GetClientTypeWorkflow',
        saveWorkflow:       'StaticData/ClientTypeWorkflow/SaveClientTypeWorkflow'
    };

    // ─── State ───────────────────────────────────────────────────────────
    const state = {
        mode:                MODES.VIEW,
        hasLoaded:           false,
        isBusy:              false,
        allClientTypes:      [],   // normalised rows cached after last View
        originalClientTypes: []    // snapshot at start of Edit for Cancel
    };

    // ─── DOM Helpers ─────────────────────────────────────────────────────
    function qs(sel, root)  { return (root || document).querySelector(sel); }
    function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }

    // ─── Context ─────────────────────────────────────────────────────────
    function ctx() {
        return {
            moduleId:   (qs('#moduleId_ctw')?.value   || '').trim(),
            operatorId: (qs('#OperatorID')?.value      || '').trim() || sessionStorage.getItem('user_name')   || '',
            branchId:   (qs('#hdn_BranchCode')?.value  || '').trim() || sessionStorage.getItem('branch_code') || '',
            bankId:     (qs('#hdn_BankId')?.value      || '').trim() || sessionStorage.getItem('bank_id')     || '00'
        };
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
        if (span)  span.textContent = '';
        if (icon)  icon.className   = 'bi bi-info-circle';
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
            view:   qs('[data-ctw-action="view"]'),
            edit:   qs('[data-ctw-action="edit"]'),
            save:   qs('[data-ctw-action="save"]'),
            cancel: qs('[data-ctw-action="cancel"]')
        };
    }

    function updateActionButtons() {
        const { view, edit, save, cancel } = getActionButtons();
        const isEdit = state.mode === MODES.EDIT;

        setDisabled(view,   isEdit || state.hasLoaded);
        setDisabled(edit,   !state.hasLoaded || isEdit);
        setDisabled(save,   !isEdit);
        setDisabled(cancel, !isEdit && !state.hasLoaded);
    }

    // ─── Row extraction / normalisation ──────────────────────────────────
    function extractClientTypes(resp) {
        if (!resp) return [];
        const data = resp.data || resp.Data || resp;

        // Details01 array (most common for this SP)
        if (data?.Details01 && Array.isArray(data.Details01)) return data.Details01;

        // Details may be an array directly
        if (Array.isArray(data?.Details)) return data.Details;

        // Details might be a JSON string containing ClientTypeWorkFlowData
        let details = data?.Details || data?.details;
        if (typeof details === 'string') {
            try { details = JSON.parse(details); } catch { /* ignore */ }
        }
        if (details?.ClientTypeWorkFlowData) {
            const ctd = details.ClientTypeWorkFlowData;
            if (typeof ctd === 'string') {
                try { return JSON.parse(ctd); } catch { return []; }
            }
            if (Array.isArray(ctd)) return ctd;
        }
        if (Array.isArray(details)) return details;

        if (Array.isArray(data)) return data;
        return [];
    }

    function extractAuditData(resp) {
        if (!resp) return null;
        const data = resp.data || resp.Data || resp;
        let details = data?.Details || data?.details;
        if (typeof details === 'string') {
            try { details = JSON.parse(details); } catch { return null; }
        }
        if (details?.SupervisionData) {
            const sv = details.SupervisionData;
            if (typeof sv === 'string') { try { return JSON.parse(sv); } catch { return null; } }
            return sv;
        }
        return null;
    }

    function normaliseRow(row) {
        const isSelected = row.IsSelected === true || row.IsSelected === 1 || row.IsSelected === '1'
                        || row.isSelected === true || row.isSelected === 1 || row.isSelected === '1'
                        || row.Selected   === true || row.Selected   === 1 || row.Selected   === '1';
        return {
            clientTypeId:   String(row.ClientType || row.ClientTypeID || row.ClientTypeId || row.clientTypeId || '').trim(),
            clientTypeName: String(row.ClientTypeName || row.Description || row.clientTypeName || '').trim(),
            isSelected
        };
    }

    // ─── Grid ────────────────────────────────────────────────────────────
    function populateGrid(rows) {
        const tbody = qs('#clientTypeTableBody');
        if (!tbody) return;

        tbody.innerHTML = '';
        state.allClientTypes = [];

        rows.forEach(row => {
            const n = normaliseRow(row);
            state.allClientTypes.push(n);

            const tr = document.createElement('tr');
            tr.dataset.clientTypeId = n.clientTypeId;
            tr.innerHTML = `
                <td class="text-center">
                    <input type="checkbox"
                           class="form-check-input client-type-checkbox"
                           data-client-type-id="${n.clientTypeId}"
                           ${n.isSelected ? 'checked' : ''}
                           ${state.mode !== MODES.EDIT ? 'disabled' : ''} />
                </td>
                <td>${n.clientTypeId}</td>
                <td>${n.clientTypeName}</td>`;
            tbody.appendChild(tr);
        });

        syncSelectAll();
    }

    function setGridEnabled(enabled) {
        qsa('.client-type-checkbox').forEach(cb => { cb.disabled = !enabled; });
        const sa = qs('.grid-select-all');
        if (sa) sa.disabled = !enabled;
    }

    function syncSelectAll() {
        const cbs = qsa('.client-type-checkbox');
        const sa  = qs('.grid-select-all');
        if (!sa || !cbs.length) return;
        const all  = cbs.every(c => c.checked);
        const some = cbs.some(c => c.checked);
        sa.checked       = all;
        sa.indeterminate = some && !all;
    }

    function getSelectedIds() {
        return qsa('.client-type-checkbox:checked').map(cb => cb.dataset.clientTypeId).filter(Boolean);
    }

    // ─── Audit ───────────────────────────────────────────────────────────
    function populateAudit(data) {
        const setText = (id, val) => { const el = qs('#' + id); if (el) el.textContent = String(val ?? '').trim(); };
        setText('CreatedBy',   data?.CreatedBy    ?? data?.createdBy);
        setText('CreatedOn',   data?.CreatedOn    ?? data?.createdOn);
        setText('ModifiedBy',  data?.ModifiedBy   ?? data?.modifiedBy  ?? data?.OperatedBy  ?? data?.operatedBy);
        setText('ModifiedOn',  data?.ModifiedOn   ?? data?.modifiedOn  ?? data?.OperatedOn  ?? data?.operatedOn);
        setText('SupervisedBy',data?.SupervisedBy ?? data?.supervisedBy);
        setText('SupervisedOn',data?.SupervisedOn ?? data?.supervisedOn);
    }

    function clearAudit() {
        qsa('[data-ctw-audit]').forEach(el => { el.textContent = ''; });
    }

    // ─── XML builder ─────────────────────────────────────────────────────
    function buildXml(selectedIds) {
        const { branchId } = ctx();
        return selectedIds.map(id => {
            const ct   = state.allClientTypes.find(x => x.clientTypeId === id);
            const name = ct?.clientTypeName || id;
            return `<dt_ClientTypeWorkflow>`
                 + `<OurBranchID>${branchId}</OurBranchID>`
                 + `<ClientType>${id}</ClientType>`
                 + `<ClientTypeName>${name}</ClientTypeName>`
                 + `<ButtonMark>N</ButtonMark>`
                 + `</dt_ClientTypeWorkflow>`;
        }).join('');
    }

    // ─── Mode management ─────────────────────────────────────────────────
    function setMode(nextMode) {
        state.mode = nextMode;
        setGridEnabled(nextMode === MODES.EDIT);
        updateActionButtons();
    }

    // ─── Handlers ────────────────────────────────────────────────────────
    async function handleView() {
        if (state.isBusy) return;

        const workflowId = (qs('#WorkflowId')?.value || '').trim();
        if (!workflowId) { showMessage('Please select a Workflow ID.', 'warning'); return; }

        state.isBusy = true;
        updateActionButtons();

        try {
            const c = ctx();
            const resp = await apiInvoke(endpoints.getWorkflow, {
                WorkFlowID:  workflowId,
                ID:          'ClientTypeID',
                BankID:      c.bankId,
                OurBranchID: c.branchId,
                OperatorID:  c.operatorId
            });

            if (!resp?.success) {
                showMessage(resp?.message || 'No data found for this workflow.', 'info');
                populateGrid([]);
                clearAudit();
                state.hasLoaded = false;
                setMode(MODES.VIEW);
                return;
            }

            const rows = extractClientTypes(resp);
            if (!rows.length) {
                showMessage('No client types found for this workflow.', 'info');
                populateGrid([]);
                clearAudit();
                state.hasLoaded = false;
                setMode(MODES.VIEW);
                return;
            }

            populateGrid(rows);

            const audit = extractAuditData(resp) || rows[0];
            populateAudit(audit);

            state.hasLoaded = true;
            setMode(MODES.VIEW);
            showMessage(`Loaded ${rows.length} client type(s).`, 'success');
        } catch (ex) {
            showMessage(ex?.message || 'Failed to load workflow.', 'danger');
            state.hasLoaded = false;
        } finally {
            state.isBusy = false;
            updateActionButtons();
        }
    }

    function handleEdit() {
        if (!state.hasLoaded) { showMessage('Please load a workflow first.', 'warning'); return; }

        // snapshot current checked state for Cancel
        state.originalClientTypes = state.allClientTypes.map(ct => ({
            ...ct,
            isSelected: qsa(`.client-type-checkbox[data-client-type-id="${ct.clientTypeId}"]:checked`).length > 0
        }));

        setMode(MODES.EDIT);
        showMessage('Edit mode – modify selections then click Save.', 'info');
    }

    async function handleSave() {
        if (state.isBusy) return;

        const workflowId = (qs('#WorkflowId')?.value || '').trim();
        if (!workflowId) { showMessage('Please select a Workflow ID.', 'warning'); return; }

        const selected = getSelectedIds();
        if (!selected.length) { showMessage('Please select at least one client type.', 'warning'); return; }

        state.isBusy = true;
        updateActionButtons();

        try {
            const c = ctx();
            const resp = await apiInvoke(endpoints.saveWorkflow, {
                WorkflowID:    workflowId,
                BankID:        c.bankId,
                OurBranchID:   c.branchId,
                OperatorID:    c.operatorId,
                DetailRecords: buildXml(selected)
            });

            if (!resp?.success) {
                throw new Error(resp?.message || 'Save failed.');
            }

            showMessage('Workflow saved successfully.', 'success');
            // Reload to reflect latest data
            await handleView();
        } catch (ex) {
            showMessage(ex?.message || 'Failed to save workflow.', 'danger');
        } finally {
            state.isBusy = false;
            updateActionButtons();
        }
    }

    function handleCancel() {
        if (state.mode === MODES.EDIT && state.originalClientTypes.length) {
            // Restore checkbox states from snapshot
            state.originalClientTypes.forEach(orig => {
                const cb = qs(`.client-type-checkbox[data-client-type-id="${orig.clientTypeId}"]`);
                if (cb) cb.checked = orig.isSelected;
            });
        }

        if (state.hasLoaded) {
            setMode(MODES.VIEW);
            showMessage('Edit cancelled.', 'info');
        } else {
            // Full clear
            const sel = qs('#WorkflowId');
            if (sel) sel.value = '';
            populateGrid([]);
            clearAudit();
            state.hasLoaded            = false;
            state.allClientTypes       = [];
            state.originalClientTypes  = [];
            setMode(MODES.VIEW);
            clearMessage();
        }
    }

    // ─── Workflow dropdown loader ─────────────────────────────────────────
    async function loadWorkflowOptions() {
        const sel = qs('#WorkflowId');
        if (!sel) return;

        try {
            const c = ctx();
            const url = `${endpoints.getWorkflowOptions}?bankId=${encodeURIComponent(c.bankId)}`;
            const response = await fetch(url, {
                method: 'GET',
                credentials: 'same-origin',
                headers: { 'X-Requested-With': 'XMLHttpRequest' }
            });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);

            const resp = await response.json();
            if (!resp?.success) return;

            const data = resp.data || resp.Data || resp;

            // Try Details01 → Details array → root array
            let rows =
                (data?.Details01 && Array.isArray(data.Details01))  ? data.Details01  :
                (data?.Details   && Array.isArray(data.Details))    ? data.Details    :
                Array.isArray(data)                                  ? data            : [];

            // Details may be a JSON string
            if (!rows.length && typeof data?.Details === 'string') {
                try { rows = JSON.parse(data.Details); } catch { rows = []; }
            }

            rows.forEach(row => {
                const value = (row.WorkflowID ?? row.WorkFlowID ?? '').toString().trim();
                const text  = (row.Description ?? value).toString().trim();
                if (!value) return;
                const opt = document.createElement('option');
                opt.value       = value;
                opt.textContent = text;
                sel.appendChild(opt);
            });

            // Refresh bootstrap-select if present
            if (typeof $ !== 'undefined' && typeof $.fn?.selectpicker !== 'undefined') {
                $(sel).selectpicker('refresh');
            }
        } catch (ex) {
            console.error('Failed to load workflow options:', ex);
        }
    }

    // ─── Section toggles (matches LoanAnalysis pattern) ──────────────────
    function wireSectionToggles() {
        qsa('[data-section-toggle]').forEach(header => {
            const btn     = header.querySelector('.section-toggle-btn');
            const section = header.closest('[data-section]');
            const content = section?.querySelector('[data-section-content]');
            if (!btn || !content) return;

            const toggle = () => {
                const expanded = btn.getAttribute('aria-expanded') === 'true';
                btn.setAttribute('aria-expanded', String(!expanded));
                content.hidden = expanded;
                const icon = btn.querySelector('i');
                if (icon) {
                    icon.classList.toggle('bi-chevron-up',  !expanded);
                    icon.classList.toggle('bi-chevron-down',  expanded);
                }
            };

            header.addEventListener('click', e => { if (!e.target.closest('.section-toggle-btn')) toggle(); });
            btn.addEventListener('click',    e => { e.stopPropagation(); toggle(); });
        });
    }

    // ─── Event binding ────────────────────────────────────────────────────
    function bindEvents() {
        const { view, edit, save, cancel } = getActionButtons();
        view?.addEventListener('click',   handleView);
        edit?.addEventListener('click',   handleEdit);
        save?.addEventListener('click',   handleSave);
        cancel?.addEventListener('click', handleCancel);

        // Auto-fetch when workflow selection changes
        qs('#WorkflowId')?.addEventListener('change', () => {
            populateGrid([]);
            clearAudit();
            state.hasLoaded           = false;
            state.allClientTypes      = [];
            state.originalClientTypes = [];
            clearMessage();
            setMode(MODES.VIEW);
            void handleView();
        });

        // Select-all checkbox
        qs('.grid-select-all')?.addEventListener('change', e => {
            if (state.mode !== MODES.EDIT) { e.preventDefault(); return; }
            qsa('.client-type-checkbox').forEach(cb => { cb.checked = e.target.checked; });
        });

        // Individual checkbox → keep select-all in sync
        document.addEventListener('change', e => {
            if (e.target.classList.contains('client-type-checkbox')) syncSelectAll();
        });
    }

    // ─── Init ─────────────────────────────────────────────────────────────
    function init() {
        wireSectionToggles();
        bindEvents();
        updateActionButtons();
        clearMessage();
        void loadWorkflowOptions();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
