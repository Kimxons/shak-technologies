// Branch Parameters JavaScript
(function () {
    'use strict';

    const APP_NAME = 'PROJECT_KAIRO';
    const FORM_IDS = {
        GET: 'dbo.p_GetSystemParameters',
        EDIT: 'dbo.p_EditSystemParameters'
    };

    // Branch Parameters is a SysParamType-specific view.
    // If your backend expects a different code, update this.
    const DEFAULT_SYS_PARAM_TYPE = 'B';

    let isEditMode = false;
    let lastLoadedRows = [];
    let selectedSysParamId = '';

    document.addEventListener('DOMContentLoaded', () => {
        wireUi();
        wireRowSelection();
        loadSystemParameters();
    });

    function setNarrationPanelText(text) {
        const el = document.getElementById('paramNarrationText');
        if (!el) return;
        el.textContent = String(text ?? '').trim();
    }

    function selectRow(row, { scrollIntoView = false } = {}) {
        if (!row) {
            selectedSysParamId = '';
            setNarrationPanelText('');
            return;
        }

        selectedSysParamId = String(row.SysParamID ?? '').trim();
        setNarrationPanelText(row.Narration || '');

        const tbody = document.querySelector('.parameters-table tbody');
        if (tbody) {
            tbody.querySelectorAll('tr').forEach(tr => tr.classList.remove('is-selected'));
            const selectedTr = tbody.querySelector(`tr[data-sys-param-id="${cssEscape(selectedSysParamId)}"]`);
            if (selectedTr) {
                selectedTr.classList.add('is-selected');
                if (scrollIntoView) selectedTr.scrollIntoView({ block: 'nearest' });
            }
        }
    }

    function findInitialRow(rows) {
        if (!Array.isArray(rows) || rows.length === 0) return null;

        // Match legacy screenshot behavior: default to the "Inward Clearing" parameter narration.
        const looksLikeInwardClearing = (r) => {
            const desc = String(r?.Description ?? '').toLowerCase();
            const nar = String(r?.Narration ?? '').toLowerCase();
            return (
                desc.includes('inward credit clearing') ||
                desc.includes('inward clearing') ||
                nar.includes('inward clearing transactions') ||
                nar.includes('back dated')
            );
        };

        const inward = rows.find(looksLikeInwardClearing);
        if (inward) return inward;

        // Otherwise, pick the first row that has narration/help text.
        const withNarration = rows.find(r => String(r?.Narration ?? '').trim().length > 0);
        return withNarration || rows[0];
    }

    function wireRowSelection() {
        const tbody = document.querySelector('.parameters-table tbody');
        if (!tbody) return;

        tbody.addEventListener('click', (e) => {
            const tr = e.target?.closest?.('tr');
            if (!tr) return;

            // Ignore clicks on checkboxes (selection is for narration preview, not bulk select).
            const isCheckbox = e.target?.closest?.('input[type="checkbox"]');
            if (isCheckbox) return;

            const sysParamId = String(tr.dataset.sysParamId ?? '').trim();
            const row = lastLoadedRows.find(r => String(r.SysParamID ?? '').trim() === sysParamId);
            if (row) selectRow(row);
        });
    }

    function cssEscape(value) {
        try {
            return CSS.escape(value);
        } catch {
            return String(value).replace(/\\/g, '\\\\').replace(/"/g, '\\"');
        }
    }

    function resolveOldApiEndpoint() {
        try {
            if (window.Environment?.useLocalOldApiProxy === true) return '/api/OldAPI';
            const base = (window.Environment?.baseUrlCommon || window.Environment?.baseUrlSystemCodes || '').toString().replace(/\/+$/, '');
            return base ? `${base}/api/OldAPI` : '/api/OldAPI';
        } catch {
            return '/api/OldAPI';
        }
    }

    function formatLegacyRequestTime(d = new Date()) {
        const pad2 = (n) => String(n).padStart(2, '0');
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const yyyy = d.getFullYear();
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
    }

    function getSession() {
        try {
            const raw = localStorage.getItem('nimble_auth_session');
            return raw ? JSON.parse(raw) : null;
        } catch {
            return null;
        }
    }

    function firstTruthy(...values) {
        for (const v of values) {
            if (v !== undefined && v !== null && String(v).trim() !== '') return v;
        }
        return '';
    }

    function getParentFieldValue(id) {
        try {
            const el = window.parent?.document?.getElementById?.(id);
            return el?.value ?? '';
        } catch {
            return '';
        }
    }

    function getContext() {
        const session = getSession() || {};

        const operatorId =
            session.operatorID ||
            session.OperatorID ||
            session.operatorId ||
            session.operator ||
            'CSADM';

        const branchId =
            session.branchID ||
            session.BranchID ||
            session.ourBranchID ||
            session.OurBranchID ||
            window.Environment?.OurBranchID ||
            window.Environment?.defaultOurBranchId ||
            '0101';

        const bankId = firstTruthy(
            getParentFieldValue('bankId'),
            session.bankID,
            session.BankID,
            window.Environment?.defaultBankId,
            '00'
        );

        const productId = firstTruthy(
            session.ProductID,
            session.productID,
            session.productId,
            localStorage.getItem('ProductID'),
            branchId // Default ProductID to BranchID if not specified
        );

        return {
            operatorId: String(operatorId || '').trim(),
            branchId: String(branchId || '').trim(),
            bankId: String(bankId || '').trim(),
            productId: String(productId || branchId || '').trim()
        };
    }

    function getSysParamType() {
        // No UI selector yet; keep as a constant for Branch Parameters.
        return DEFAULT_SYS_PARAM_TYPE;
    }

    function makeLegacyEnvelope(formId, requestData) {
        if (!window.CoreApi?.makeRequestEnvelope) {
            throw new Error('CoreApi is not available in this module iframe.');
        }
        const envelope = window.CoreApi.makeRequestEnvelope(formId, requestData, APP_NAME);
        envelope.RequestID = formId;
        envelope.FormID = formId;
        envelope.FormId = formId;
        envelope.RequestTime = formatLegacyRequestTime();
        envelope.Checksum = envelope.Checksum ?? '';
        return envelope;
    }

    function setLoading(loading) {
        const editBtn = document.querySelector('.btn-edit');
        const saveBtn = document.querySelector('.btn-save');
        const cancelBtn = document.querySelector('.btn-cancel');

        if (editBtn) editBtn.disabled = loading || isEditMode;
        if (saveBtn) saveBtn.disabled = loading || !isEditMode;
        if (cancelBtn) cancelBtn.disabled = loading || !isEditMode;
    }

    function wireUi() {
        const editBtn = document.querySelector('.btn-edit');
        const saveBtn = document.querySelector('.btn-save');
        const cancelBtn = document.querySelector('.btn-cancel');
        const backBtn = document.querySelector('.btn-back');
        const selectAllCheckbox = document.getElementById('selectAll');

        setEditMode(false);

        if (editBtn) {
            editBtn.addEventListener('click', () => {
                setEditMode(true);
            });
        }

        if (saveBtn) {
            saveBtn.addEventListener('click', async () => {
                if (!validateForm()) return;
                await saveSystemParameters();
            });
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', () => {
                if (!confirm('Are you sure you want to cancel? All unsaved changes will be lost.')) return;
                // Restore from the last loaded snapshot.
                renderTable(lastLoadedRows);
                setEditMode(false);
            });
        }

        if (backBtn) {
            backBtn.addEventListener('click', () => {
                if (isEditMode) {
                    if (!confirm('You have unsaved changes. Are you sure you want to go back?')) return;
                }

                window.parent.postMessage(
                    { source: 'branch-parameters', action: 'navigate', section: 'branch-settings' },
                    '*'
                );
            });
        }

        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', () => {
                const rowCheckboxes = document.querySelectorAll('.parameters-table tbody input[type="checkbox"].row-select');
                rowCheckboxes.forEach(checkbox => {
                    checkbox.checked = selectAllCheckbox.checked;
                });
            });
        }

        document.addEventListener('keydown', (e) => {
            // Ctrl+S to save
            if (e.ctrlKey && e.key === 's') {
                e.preventDefault();
                if (isEditMode && saveBtn && !saveBtn.disabled) saveBtn.click();
            }

            // Escape to cancel
            if (e.key === 'Escape') {
                if (isEditMode && cancelBtn && !cancelBtn.disabled) cancelBtn.click();
            }
        });
    }

    function setEditMode(editMode) {
        isEditMode = editMode;

        // Only Description and Value are editable; Narration stays read-only.
        document.querySelectorAll('.parameters-table tbody tr').forEach((tr) => {
            const desc = tr.querySelector('input.param-description');
            const val = tr.querySelector('input.param-value');
            const nar = tr.querySelector('input.param-narration');

            if (desc) desc.readOnly = !editMode;
            if (val) val.readOnly = !editMode;
            if (nar) nar.readOnly = true;
        });

        setLoading(false);
    }

    function validateForm() {
        // Add validations as needed.
        return true;
    }

    function extractFirstArrayOfObjects(payload) {
        const seen = new Set();
        const queue = [payload];
        let iterations = 0;

        while (queue.length > 0 && iterations < 5000) {
            iterations++;
            const cur = queue.shift();
            if (!cur) continue;

            if (typeof cur === 'object') {
                if (seen.has(cur)) continue;
                seen.add(cur);
            }

            if (Array.isArray(cur)) {
                const hasObjects = cur.some(x => x && typeof x === 'object' && !Array.isArray(x));
                if (hasObjects) return cur;
                for (const item of cur) queue.push(item);
                continue;
            }

            if (typeof cur !== 'object') continue;

            // OldAPI commonly returns recordsets as Details01/Details02...
            // Prefer those over Details (which is often status/audit metadata).
            for (const k of Object.keys(cur)) {
                if (/^Details\d+$/i.test(k) && Array.isArray(cur[k]) && cur[k].some(x => x && typeof x === 'object' && !Array.isArray(x))) {
                    return cur[k];
                }
            }

            // common wrappers
            if (cur.data !== undefined) queue.push(cur.data);
            if (cur.Data !== undefined) queue.push(cur.Data);
            if (cur.Details !== undefined) queue.push(cur.Details);
            if (cur.details !== undefined) queue.push(cur.details);

            for (const k of Object.keys(cur)) {
                if (/^Details\d+$/i.test(k)) queue.push(cur[k]);
            }

            for (const k of Object.keys(cur)) {
                const v = cur[k];
                if (v && typeof v === 'object') queue.push(v);
            }
        }

        return [];
    }

    function normalizeRows(rawRows) {
        const rows = Array.isArray(rawRows) ? rawRows : [];

        console.log('[BranchParameters] Raw rows before normalize:', rawRows);

        // For safety, only keep objects.
        const normalized = rows
            .filter(r => r && typeof r === 'object' && !Array.isArray(r))
            .map((r) => ({
                SysParamID: String(firstTruthy(r.SysParamID, r.ParamID, r.SystemParamID) ?? '').trim(),
                Grouping: String(firstTruthy(r.SysParamGrp, r.SysParamGrpID, r.Grouping, r.GroupName, r.Group, r.Category) ?? '').trim(),
                Description: String(firstTruthy(r.Description, r.DetailValues, r.DetailValue, r.Detail, r.ParamDescription) ?? '').trim(),
                Narration: String(firstTruthy(r.Narration, r.Narr, r.ParamNarration) ?? '').trim(),
                ParamValue: String(firstTruthy(r.ParamValue, r.Applicable, r.Value, r.Param, r.Enabled) ?? '').trim(),
                UpdateCount: r.UpdateCount ?? r.updateCount ?? 0
            }));

        console.log('[BranchParameters] Normalized rows:', normalized);
        return normalized;
    }

    function renderTable(rows) {
        const tbody = document.querySelector('.parameters-table tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        rows.forEach((row) => {
            const tr = document.createElement('tr');
            tr.dataset.sysParamId = String(row.SysParamID ?? '').trim();

            const tdSelect = document.createElement('td');
            tdSelect.className = 'col-checkbox';
            tdSelect.innerHTML = '<input type="checkbox" class="row-select">';

            const tdGrouping = document.createElement('td');
            tdGrouping.className = 'col-grouping';
            tdGrouping.textContent = String(row.Grouping ?? '');

            const tdDesc = document.createElement('td');
            tdDesc.className = 'col-description';
            tdDesc.innerHTML = `<input type="text" class="form-control param-description" value="${escapeHtmlAttr(String(row.Description ?? ''))}" readonly>`;

            const tdNarr = document.createElement('td');
            tdNarr.className = 'col-narration';
            tdNarr.innerHTML = `<input type="text" class="form-control param-narration" value="${escapeHtmlAttr(String(row.Narration ?? ''))}" readonly>`;

            const tdValue = document.createElement('td');
            tdValue.className = 'col-value';
            tdValue.innerHTML = `<input type="text" class="form-control param-value" value="${escapeHtmlAttr(String(row.ParamValue ?? ''))}" readonly>`;

            tr.appendChild(tdSelect);
            tr.appendChild(tdGrouping);
            tr.appendChild(tdDesc);
            tr.appendChild(tdNarr);
            tr.appendChild(tdValue);
            tbody.appendChild(tr);
        });

        // re-apply edit state after rerender
        setEditMode(isEditMode);

        // Keep narration panel in sync (select an initial row on first load)
        const current = selectedSysParamId
            ? rows.find(r => String(r.SysParamID ?? '').trim() === selectedSysParamId)
            : null;
        const initial = current || findInitialRow(rows);
        if (initial) selectRow(initial, { scrollIntoView: true });
    }

    function escapeHtmlAttr(s) {
        return s
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /**
     * Extract audit/behind-the-scene metadata from API response.
     * OldAPI responses may have audit fields in various locations:
     * - Directly on the response object
     * - In resp.data or resp.Details
     * - In the first row of an array (Details01, etc.)
     */
    function extractAuditMeta(resp) {
        // Helper to check if object has audit fields
        const hasAuditFields = (obj) => obj && (
            obj.ModifiedBy || obj.modifiedBy ||
            obj.ModifiedOn || obj.modifiedOn ||
            obj.SupervisedBy || obj.supervisedBy ||
            obj.SupervisedOn || obj.supervisedOn
        );

        // Check direct properties first
        if (hasAuditFields(resp)) return resp;
        if (hasAuditFields(resp?.data)) return resp.data;
        if (hasAuditFields(resp?.Details)) return resp.Details;

        // Check if Details is an array with audit fields in first row
        if (Array.isArray(resp?.Details) && resp.Details.length > 0 && hasAuditFields(resp.Details[0])) {
            return resp.Details[0];
        }

        // Check numbered Details (Details01, Details02, etc.)
        if (resp?.data) {
            for (const key of Object.keys(resp.data)) {
                if (/^Details\d*$/i.test(key)) {
                    const val = resp.data[key];
                    if (hasAuditFields(val)) return val;
                    if (Array.isArray(val) && val.length > 0 && hasAuditFields(val[0])) return val[0];
                }
            }
        }

        // Fallback: check first row of any array we find
        const dataObj = resp?.data ?? resp;
        if (dataObj) {
            for (const key of Object.keys(dataObj)) {
                const val = dataObj[key];
                if (Array.isArray(val) && val.length > 0 && hasAuditFields(val[0])) {
                    return val[0];
                }
            }
        }

        return resp?.data ?? resp ?? {};
    }

    function setBehindScene(resp) {
        const meta = extractAuditMeta(resp);
        
        const set = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;
            if ('value' in el) {
                el.value = val ?? '';
            } else {
                el.textContent = val ?? '';
            }
        };

        set('modifiedBy', firstTruthy(meta.ModifiedBy, meta.modifiedBy));
        set('modifiedOn', firstTruthy(meta.ModifiedOn, meta.modifiedOn));
        set('supervisedBy', firstTruthy(meta.SupervisedBy, meta.supervisedBy));
        set('supervisedOn', firstTruthy(meta.SupervisedOn, meta.supervisedOn));
    }

    async function loadSystemParameters() {
        setLoading(true);
        setEditMode(false);

        try {
            const ctx = getContext();
            const requestData = {
                SysParamType: getSysParamType(),
                ProductID: ctx.productId,
                BankID: ctx.bankId,
                OurBranchID: ctx.branchId,
                OperatorID: ctx.operatorId
            };

            const envelope = makeLegacyEnvelope(FORM_IDS.GET, requestData);
            const resp = await window.CoreApi.post(resolveOldApiEndpoint(), envelope);

            if (!resp?.success) {
                showErrorToast(resp?.message || 'Failed to load Branch Parameters');
                return;
            }

            const rawRows = extractFirstArrayOfObjects(resp?.data ?? resp?.Details ?? resp);
            const rows = normalizeRows(rawRows);

            lastLoadedRows = rows;
            renderTable(rows);

            // Bind Behind The Scene audit fields from response
            setBehindScene(resp);
        } catch (e) {
            console.error('Failed to load Branch Parameters:', e);
            showErrorToast(e?.message || 'Failed to load Branch Parameters');
        } finally {
            setLoading(false);
        }
    }

    function readTableRows() {
        const rows = [];
        document.querySelectorAll('.parameters-table tbody tr').forEach((tr) => {
            const sysParamId = String(tr.dataset.sysParamId ?? '').trim();
            const grouping = tr.querySelector('td.col-grouping')?.textContent ?? '';
            const description = (tr.querySelector('input.param-description')?.value ?? '').trim();
            const narration = (tr.querySelector('input.param-narration')?.value ?? '').trim();
            const value = (tr.querySelector('input.param-value')?.value ?? '').trim();
            rows.push({ SysParamID: sysParamId, Grouping: grouping, Description: description, Narration: narration, ParamValue: value });
        });
        return rows;
    }

    // ==================== TOAST HELPERS ====================
    function showSuccessToast(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'success',
                title: message,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        } else {
            alert(message);
        }
    }

    function showErrorToast(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'error',
                title: message,
                showConfirmButton: false,
                timer: 4000,
                timerProgressBar: true
            });
        } else {
            alert(message);
        }
    }

    function showWarningToast(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'warning',
                title: message,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        } else {
            alert(message);
        }
    }

    function showInfoToast(message) {
        if (typeof Swal !== 'undefined') {
            Swal.fire({
                toast: true,
                position: 'top-end',
                icon: 'info',
                title: message,
                showConfirmButton: false,
                timer: 3000,
                timerProgressBar: true
            });
        } else {
            alert(message);
        }
    }

    function normalizeBit(value) {
        const raw = String(value ?? '').trim().toLowerCase();
        if (raw === '1' || raw === 'true' || raw === 'yes' || raw === 'y' || raw === 'on') return 1;
        if (raw === '0' || raw === 'false' || raw === 'no' || raw === 'n' || raw === 'off' || raw === '') return 0;
        // If user types something else, treat as truthy.
        return 1;
    }

    function formatSqlDateTime(d = new Date()) {
        const pad2 = (n) => String(n).padStart(2, '0');
        const yyyy = d.getFullYear();
        const mm = pad2(d.getMonth() + 1);
        const dd = pad2(d.getDate());
        const hh = pad2(d.getHours());
        const mi = pad2(d.getMinutes());
        const ss = pad2(d.getSeconds());
        return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
    }

    async function saveSystemParameters() {
        const ctx = getContext();
        console.log('[BranchParameters] Context:', ctx);

        const currentRows = readTableRows();
        const originalById = new Map(lastLoadedRows.map(r => [String(r.SysParamID ?? '').trim(), r]));

        console.log('[BranchParameters] Current rows:', currentRows);
        console.log('[BranchParameters] Original rows:', lastLoadedRows);

        const changed = currentRows.filter(r => {
            const orig = originalById.get(String(r.SysParamID ?? '').trim());
            if (!orig) {
                console.log('[BranchParameters] No original found for:', r.SysParamID);
                return false;
            }
            const descChanged = String(orig.Description ?? '').trim() !== String(r.Description ?? '').trim();
            const valueChanged = String(orig.ParamValue ?? '').trim() !== String(r.ParamValue ?? '').trim();
            if (descChanged || valueChanged) {
                console.log('[BranchParameters] Change detected for SysParamID:', r.SysParamID, {
                    origDesc: orig.Description, newDesc: r.Description,
                    origValue: orig.ParamValue, newValue: r.ParamValue
                });
            }
            return descChanged || valueChanged;
        });

        console.log('[BranchParameters] Changed rows:', changed);

        if (changed.length === 0) {
            showInfoToast('No changes to save.');
            setEditMode(false);
            return;
        }

        setLoading(true);

        try {
            for (const row of changed) {
                // Get the original row to retrieve UpdateCount
                const origRow = originalById.get(String(row.SysParamID ?? '').trim());
                const updateCount = origRow?.UpdateCount ?? 0;

                // Build request matching: exec p_EditSystemParameters @SysParamType, @BankID, @ProductID, 
                // @OurBranchID, @SysParamID, @ParamValue, @DetailValues, @ModifiedBy, @ModifiedOn, @SupervisedBy, @NewRecord
                const requestData = {
                    SysParamType: getSysParamType(),
                    BankID: ctx.bankId,
                    ProductID: ctx.productId,
                    OurBranchID: ctx.branchId,
                    SysParamID: Number(row.SysParamID),
                    ParamValue: normalizeBit(row.ParamValue),
                    DetailValues: String(row.Description ?? '').trim() || null,
                    ModifiedBy: ctx.operatorId,
                    ModifiedOn: formatSqlDateTime(),
                    SupervisedBy: ctx.operatorId,
                    NewRecord: updateCount
                };

                console.log('[BranchParameters] Saving row:', requestData);

                const envelope = makeLegacyEnvelope(FORM_IDS.EDIT, requestData);
                const resp = await window.CoreApi.post(resolveOldApiEndpoint(), envelope);

                if (!resp?.success) {
                    throw new Error(resp?.message || `Failed to save parameter SysParamID=${row.SysParamID}`);
                }
            }

            showSuccessToast('Branch Parameters saved successfully!');
            setEditMode(false);
            await loadSystemParameters();
        } catch (e) {
            console.error('Failed to save Branch Parameters:', e);
            showErrorToast(e?.message || 'Failed to save Branch Parameters');
        } finally {
            setLoading(false);
        }
    }
})();
