/**
 * Cost Center Module - JavaScript
 * Wires UI actions to CostCenterService (OldAPI stored procedures)
 */

(async function () {
    'use strict';

    console.log('cost-center.js loaded (v=20260122)');

    // Load dependencies
    const { ServiceLoader } = window;
    if (!ServiceLoader) {
        console.error('ServiceLoader not found. Ensure serviceLoader.js is included before cost-center.js');
        return;
    }

    await ServiceLoader.loadCore();
    await ServiceLoader.loadCostCenterService();
    await ServiceLoader.loadSearchService();

    const CostCenterService = window.CostCenterService;
    const SearchService = window.SearchService;
    console.log('CostCenterService loaded:', !!CostCenterService);
    console.log('SearchService loaded:', !!SearchService);

    const CONFIG = {
        // Hard block: duplicate names within the same BranchID are not allowed.
        blockDuplicateNameWithinBranch: true
    };

    const MODES = {
        VIEW: 'view',
        ADD: 'add',
        EDIT: 'edit'
    };

    let currentMode = MODES.VIEW;

    let loadedCostCenterKey = null; // { branchId, costCenterId }

    function setMode(nextMode) {
        if (!nextMode || !Object.values(MODES).includes(nextMode)) return;
        if (currentMode === nextMode) {
            refreshModeUI();
            return;
        }
        currentMode = nextMode;
        refreshModeUI();
    }

    function isInMode(mode) {
        return currentMode === mode;
    }

    function getActionButton(action) {
        return document.querySelector(`.btn-action[data-action="${action}"]`);
    }

    function setButtonEnabled(action, enabled) {
        const btn = getActionButton(action);
        if (!btn) return;
        const on = !!enabled;
        btn.disabled = !on;
        if (on) btn.removeAttribute('disabled');
        else btn.setAttribute('disabled', '');
    }

    function setTextReadOnly(id, readOnly) {
        const el = document.getElementById(id);
        if (!el) return;
        const ro = !!readOnly;
        el.readOnly = ro;
        el.setAttribute('aria-readonly', ro ? 'true' : 'false');
        el.classList.toggle('bg-light', ro);
    }

    function setSelectDisabled(id, disabled) {
        const el = document.getElementById(id);
        if (!el) return;
        const dis = !!disabled;
        el.disabled = dis;
        el.classList.toggle('bg-light', dis);
    }

    function setLookupButtonsEnabled({ branch, costCenter }) {
        const branchLookupBtn = document.querySelector('button[aria-label="Lookup Branch"]');
        const costCenterLookupBtn = document.querySelector('button[aria-label="Lookup CostCenter"]');

        const apply = (btn, on) => {
            if (!btn) return;
            btn.disabled = !on;
            if (on) btn.removeAttribute('disabled');
            else btn.setAttribute('disabled', '');
        };

        apply(branchLookupBtn, !!branch);
        apply(costCenterLookupBtn, !!costCenter);
    }

    function refreshModeUI() {
        const hasLoadedRecord = !!loadedCostCenterKey;

        // Field editability
        const allowDetailsEdit = isInMode(MODES.ADD) || isInMode(MODES.EDIT);
        const lockIdentifiers = isInMode(MODES.EDIT);

        // In VIEW/ADD identifiers can be typed; in EDIT they must be locked.
        setIdentifiersLocked(lockIdentifiers);

        // Detail fields editable only in ADD/EDIT
        setTextReadOnly('Name', !allowDetailsEdit);
        setSelectDisabled('Status', !allowDetailsEdit);

        // Always read-only fields
        setTextReadOnly('BranchName', true);
        ['CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'].forEach((id) => {
            setTextReadOnly(id, true);
        });

        // Lookups: Branch lookup allowed in VIEW/ADD, CostCenter lookup only in VIEW
        setLookupButtonsEnabled({
            branch: !isInMode(MODES.EDIT),
            costCenter: isInMode(MODES.VIEW)
        });

        // Action buttons
        const inView = isInMode(MODES.VIEW);
        setButtonEnabled('view', inView);
        setButtonEnabled('add', inView);
        setButtonEnabled('edit', inView && hasLoadedRecord);
        setButtonEnabled('delete', inView && hasLoadedRecord);
        setButtonEnabled('activate', inView && hasLoadedRecord);
        setButtonEnabled('save', !inView);
        setButtonEnabled('cancel', !inView);
    }

    function normalizeBranchId(value) {
        return String(value ?? '').replace(/\D+/g, '');
    }

    function normalizeCostCenterId(value) {
        return String(value ?? '').replace(/[^0-9a-z]/gi, '').toUpperCase();
    }

    function isValidBranchId(value) {
        const v = String(value ?? '').trim();
        return v.length > 0 && /^\d+$/.test(v);
    }

    function isValidCostCenterId(value) {
        const v = String(value ?? '').trim();
        return v.length > 0 && /^[0-9a-z]+$/i.test(v);
    }

    function isValidStatus(value) {
        const v = String(value ?? '').trim();
        return v === 'Active' || v === 'Inactive';
    }

    function setLoadedCostCenterKey(branchId, costCenterId) {
        const b = normalizeBranchId(branchId).trim();
        const c = normalizeCostCenterId(costCenterId).trim();
        if (!b || !c) {
            loadedCostCenterKey = null;
            refreshModeUI();
            return;
        }
        loadedCostCenterKey = { branchId: b, costCenterId: c };
        refreshModeUI();
    }

    function clearLoadedCostCenterKey() {
        loadedCostCenterKey = null;
        refreshModeUI();
    }

    function isSameAsLoadedKey(branchId, costCenterId) {
        if (!loadedCostCenterKey) return false;
        const b = normalizeBranchId(branchId).trim();
        const c = normalizeCostCenterId(costCenterId).trim();
        return loadedCostCenterKey.branchId === b && loadedCostCenterKey.costCenterId === c;
    }

    function escapeSqlValue(value) {
        return String(value ?? '').replace(/'/g, "''");
    }

    function extractSearchRows(response) {
        const candidates = [
            response?.Details?.SearchResults,
            response?.Details,
            response?.SearchResults,
            response?.data?.Details,
            response?.data?.Details?.SearchResults
        ];
        for (const c of candidates) {
            if (!c) continue;
            if (Array.isArray(c)) return c;
            if (typeof c === 'object') return [c];
        }
        return [];
    }

    async function searchCostCenters(whereStmt) {
        if (!SearchService || typeof SearchService.search !== 'function') {
            return { ok: false, rows: [], message: 'Search service not available' };
        }
        const payload = {
            TableID: 'CostCenterID',
            WhereStmt: whereStmt,
            AdvFilterString: '',
            PrevOrNext: '1',
            RefID: '',
            OperatorID: 'web_portal',
            ModuleID: 1000,
            OurBranchID: normalizeBranchId(document.getElementById('BranchID')?.value || '')
        };

        const response = await SearchService.search(payload);
        const rows = extractSearchRows(response);
        return { ok: true, rows };
    }

    async function checkForDuplicatesBeforeSave(branchId, costCenterId, name) {
        const b = normalizeBranchId(branchId).trim();
        const c = normalizeCostCenterId(costCenterId).trim();
        const n = String(name ?? '').trim();

        // 1) CostCenterID uniqueness within BranchID
        // If we are editing the record that was loaded, allow saving without blocking on itself.
        if (!isSameAsLoadedKey(b, c)) {
            const whereId = `OurBranchID = '${escapeSqlValue(b)}' AND CostCenterID = '${escapeSqlValue(c)}'`;
            const found = await searchCostCenters(whereId);
            if (!found.ok) {
                return {
                    ok: false,
                    reason: 'dup-check-failed',
                    message: found.message || 'Unable to verify duplicates at the moment. Please try again.'
                };
            }
            if (found.ok && found.rows.length > 0) {
                return {
                    ok: false,
                    reason: 'duplicate-id',
                    message: `Duplicate detected: CostCenter ID ${c} already exists for Branch ${b}.`
                };
            }
        }

        // 2) Name uniqueness within BranchID (optional business rule)
        if (n) {
            const whereName = `OurBranchID = '${escapeSqlValue(b)}' AND CostCenter = '${escapeSqlValue(n)}'`;
            const foundByName = await searchCostCenters(whereName);
            if (!foundByName.ok) {
                return {
                    ok: false,
                    reason: 'dup-check-failed',
                    message: foundByName.message || 'Unable to verify duplicates at the moment. Please try again.'
                };
            }
            if (foundByName.ok && foundByName.rows.length > 0) {
                const conflict = foundByName.rows.some((r) => {
                    const rowId = normalizeCostCenterId(r.CostCenterID || '').trim();
                    return rowId && rowId !== c;
                });

                if (conflict) {
                    return {
                        ok: false,
                        reason: 'duplicate-name',
                        message: `Duplicate detected: Name '${n}' already exists for Branch ${b}.`
                    };
                }
            }
        }

        return { ok: true };
    }

    function normalizeFieldInPlace(fieldId, normalizer) {
        const el = document.getElementById(fieldId);
        if (!el) return '';
        const current = String(el.value ?? '');
        const next = normalizer(current);
        if (next !== current) el.value = next;
        return String(el.value ?? '').trim();
    }

    /**
     * Initialize button event listeners
     */
    function initializeButtons() {
        const buttons = document.querySelectorAll('.btn-action');
        
        buttons.forEach(button => {
            button.addEventListener('click', function() {
                const action = this.getAttribute('data-action');
                handleActionButtonClick(action);
            });
        });
    }

    /**
     * Handle action button clicks
     */
    async function handleActionButtonClick(action) {
        console.log('Action clicked:', action);

        const branchId = normalizeFieldInPlace('BranchID', normalizeBranchId);
        const costCenterId = normalizeFieldInPlace('CostCenterID', normalizeCostCenterId);
        const name = (document.getElementById('Name')?.value || '').trim();
        const status = (document.getElementById('Status')?.value || '').trim();
        
        switch(action) {
            case 'view':
                await handleView(branchId, costCenterId);
                break;
            case 'add':
                handleAdd();
                break;
            case 'edit':
                handleEdit(costCenterId);
                break;
            case 'delete':
                handleDelete(costCenterId);
                break;
            case 'save':
                handleSave(branchId, costCenterId, name, status);
                break;
            case 'cancel':
                handleCancel();
                break;
            case 'activate':
                handleActivate(costCenterId);
                break;
            default:
                console.log('Unknown action:', action);
        }
    }

    /**
     * Handle View action
     */
    async function handleView(branchId, costCenterId) {
        if (!CostCenterService) {
            showNotification('CostCenterService not loaded', 'error');
            return;
        }

        if (!branchId) {
            showNotification('Branch ID is required', 'warning');
            return;
        }

        if (!isValidBranchId(branchId)) {
            showNotification('Branch ID must be numeric only', 'warning');
            return;
        }

        if (!costCenterId) {
            showNotification('Please enter CostCenter ID to view', 'warning');
            return;
        }

        if (!isValidCostCenterId(costCenterId)) {
            showNotification('CostCenter ID must be alphanumeric only', 'warning');
            return;
        }

        // Auto-populate Branch Name if Branch ID is provided
        await populateBranchName(branchId);

        // Auto-populate Cost Center Name if Cost Center ID is provided
        await populateCostCenterName(costCenterId);

        const viewBtn = document.querySelector('.btn-action[data-action="view"]');

        try {
            if (viewBtn) viewBtn.disabled = true;

            showNotification(`Loading Cost Center ${costCenterId}...`, 'info');

            const requestData = {
                OurBranchID: branchId,
                CostCenterID: costCenterId,
                OperatorID: 'CSADM'
            };

            const result = await CostCenterService.getCostCenter(requestData);
            console.log('CostCenterService.getCostCenter result:', result);
            console.log('CostCenterService.getCostCenter data:', result?.data);

            if (!result?.success) {
                showNotification(result?.message || 'Failed to retrieve cost center', 'error');
                return;
            }

            const record = extractFirstRecord(result.data);
            console.log('Extracted record:', record);
            if (!record) {
                clearFormFields();
                setMode(MODES.VIEW);
                showNotification('No data found for the specified CostCenter ID', 'warning');
                return;
            }

            populateForm(record);
            setMode(MODES.VIEW);
            showNotification('Cost center retrieved successfully', 'success');
        } catch (error) {
            console.error('Error viewing cost center:', error);
            showNotification('An error occurred while retrieving cost center data', 'error');
        } finally {
            if (viewBtn) viewBtn.disabled = false;
            setMode(MODES.VIEW);
        }
    }

    function extractFirstRecord(data) {
        if (!data) return null;

        const isObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

        const isLikelyDataRow = (row) => {
            if (!isObject(row)) return false;
            // Heuristic: cost center procedures usually contain one of these.
            const keys = ['CostCenterID', 'CostCenterName', 'CostCenterDesc', 'Name', 'Status', 'CreatedBy', 'CreatedOn'];
            if (keys.some((k) => row[k] !== undefined && row[k] !== null && String(row[k]).trim() !== '')) return true;
            // If it's clearly a status row, skip.
            if (row.ResponseCode !== undefined || row.ResponseMessage !== undefined) return false;
            return false;
        };

        const extractFrom = (value) => {
            if (!value) return null;

            if (Array.isArray(value)) {
                for (const item of value) {
                    if (isLikelyDataRow(item)) return item;
                }
                // If array contains wrappers, search inside them.
                for (const item of value) {
                    const found = extractFrom(item);
                    if (found) return found;
                }
                return null;
            }

            if (!isObject(value)) return null;

            // Direct row object
            if (isLikelyDataRow(value)) return value;

            // Prefer Details01/Details02/... if present
            const detailKeys = Object.keys(value).filter((k) => /^Details\d+$/i.test(k)).sort();
            for (const k of detailKeys) {
                const found = extractFrom(value[k]);
                if (found) return found;
            }

            // Then Details
            if (value.Details !== undefined) {
                const found = extractFrom(value.Details);
                if (found) return found;
            }

            // Shallow scan other properties (common OldAPI wrappers)
            for (const k of Object.keys(value)) {
                if (k === 'Details' || /^Details\d+$/i.test(k)) continue;
                const found = extractFrom(value[k]);
                if (found) return found;
            }

            return null;
        };

        return extractFrom(data);
    }

    function populateForm(record) {
        const setValue = (id, value) => {
            const el = document.getElementById(id);
            if (!el) return;
            el.value = value ?? '-';
        };

        // Keep the ID user typed (don’t overwrite with null)
        if (record.CostCenterID) setValue('CostCenterID', record.CostCenterID);

        // Name field: prefer CostCenter, then others
        const name = record.CostCenter ?? record.CostCenterName ?? record.Name ?? record.CostCenterDesc ?? record.Description ?? '-';
        setValue('Name', name);

        // Status: prefer IsActive, then Status, then StatusName
        let status = record.IsActive;
        if (typeof status === 'boolean') {
            status = status ? 'Active' : 'Inactive';
        } else if (status === undefined || status === null || status === '') {
            status = record.Status ?? record.StatusName;
            if (typeof status === 'boolean') {
                status = status ? 'Active' : 'Inactive';
            }
        }
        setValue('Status', status ?? '-');

        // CreatedBy, ModifiedBy, SupervisedBy: try multiple variations
        const createdBy = record.CreatedBy ?? record.Created_User ?? record.CreatedByUser ?? record.Created ?? '-';
        const modifiedBy = record.ModifiedBy ?? record.Modified_User ?? record.ModifiedByUser ?? record.Modified ?? record.CreatedBy ?? record.Created_User ?? record.CreatedByUser ?? record.Created ?? '-';
        const supervisedBy = record.SupervisedBy ?? record.Supervised_User ?? record.SupervisedByUser ?? record.Supervised ?? '-';
        
        setValue('CreatedBy', createdBy);
        setValue('ModifiedBy', modifiedBy);
        setValue('SupervisedBy', supervisedBy);

        // CreatedOn, ModifiedOn, SupervisedOn: try multiple variations
        const createdOn = record.CreatedOn ?? record.Created_Date ?? record.CreatedAt ?? record.Created ?? '-';
        const modifiedOn = record.ModifiedOn ?? record.Modified_Date ?? record.ModifiedAt ?? record.Modified ?? record.CreatedOn ?? record.Created_Date ?? record.CreatedAt ?? record.Created ?? '-';
        const supervisedOn = record.SupervisedOn ?? record.Supervised_Date ?? record.SupervisedAt ?? record.Supervised ?? '-';
        
        setValue('CreatedOn', createdOn);
        setValue('ModifiedOn', modifiedOn);
        setValue('SupervisedOn', supervisedOn);
        
        // Update activate button text based on status
        updateActivateButtonText();

        try {
            const currentBranchId = normalizeBranchId(document.getElementById('BranchID')?.value || '');
            const currentCostCenterId = normalizeCostCenterId(document.getElementById('CostCenterID')?.value || record.CostCenterID || '');
            setLoadedCostCenterKey(currentBranchId, currentCostCenterId);
        } catch (e) {
            // ignore
        }
    }

    /**
     * Handle Add action
     */
    function handleAdd() {
        setMode(MODES.ADD);
        clearFormFields();
        showNotification('New Cost Center ready for entry', 'success');
        updateActivateButtonText();
    }

    /**
     * Handle Edit action
     */
    function handleEdit(costCenterId) {
        if (!loadedCostCenterKey) {
            showNotification('Please View a Cost Center before editing', 'warning');
            return;
        }

        const idToShow = costCenterId || loadedCostCenterKey.costCenterId;
        setMode(MODES.EDIT);
        showNotification(`Editing Cost Center: ${idToShow}`, 'info');
    }

    /**
     * Handle Delete action
     */
    async function handleDelete(costCenterId) {
        if (!costCenterId) {
            showNotification('Please select a Cost Center to delete', 'warning');
            return;
        }

        if (!loadedCostCenterKey) {
            showNotification('Please View a Cost Center before deleting', 'warning');
            return;
        }

        if (!confirm(`Are you sure you want to delete Cost Center: ${costCenterId}?`)) {
            return;
        }

        const branchId = document.getElementById('BranchID')?.value || '';
        const operatorId = 'CSADM';
        const requestData = {
            OurBranchID: branchId,
            CostCenterID: costCenterId,
            OperatorID: operatorId
        };

        try {
            showNotification('Deleting Cost Center...', 'info');
            const result = await CostCenterService.deleteCostCenter(requestData);
            console.log('CostCenterService.deleteCostCenter result:', result);
            if (result?.success) {
                showNotification(`Cost Center ${costCenterId} deleted successfully`, 'success');
                clearFormFields();
                setMode(MODES.VIEW);
            } else {
                showNotification(result?.message || 'Failed to delete Cost Center', 'error');
            }
        } catch (error) {
            console.error('Error deleting cost center:', error);
            showNotification('An error occurred while deleting cost center', 'error');
        }
    }

    /**
     * Handle Save action
     */
    async function handleSave(branchId, costCenterId, name, status) {
        if (isInMode(MODES.VIEW)) {
            showNotification('Click Add or Edit before saving', 'warning');
            return;
        }

        if (!branchId) {
            showNotification('Branch ID is required', 'warning');
            return;
        }

        if (!isValidBranchId(branchId)) {
            showNotification('Branch ID must be numeric only', 'warning');
            return;
        }

        if (!costCenterId || !name) {
            showNotification('Please fill in all required fields (CostCenter ID, Name)', 'warning');
            return;
        }

        if (!status) {
            showNotification('Status is required before saving', 'warning');
            return;
        }

        if (!isValidStatus(status)) {
            showNotification('Status must be Active or Inactive', 'warning');
            return;
        }

        // Backend check: hard-block duplicates within same Branch
        const dupCheck = await checkForDuplicatesBeforeSave(branchId, costCenterId, name);
        if (!dupCheck.ok) {
            showNotification(dupCheck.message || 'Duplicate detected. Save blocked.', 'warning');
            return;
        }

        if (!isValidCostCenterId(costCenterId)) {
            showNotification('CostCenter ID must be alphanumeric only', 'warning');
            return;
        }

        // Prepare requestData as per backend contract
        const operatorId = 'CSADM';
        const requestData = {
            OurBranchID: branchId,
            CostCenterID: costCenterId,
            CostCenter: name,
            CreatedBy: operatorId,
            ModifiedBy: operatorId,
            SupervisedBy: operatorId,
            UpdateCount: 0,
            IsActive: (status === 'Active' || status === '1' || status === 'true') ? true : false
        };

        try {
            showNotification('Saving Cost Center...', 'info');
            const result = await CostCenterService.addOrEditCostCenter(requestData);
            console.log('CostCenterService.addOrEditCostCenter result:', result);
            if (result?.success) {
                showNotification(`Cost Center ${costCenterId} saved successfully`, 'success');
                setLoadedCostCenterKey(branchId, costCenterId);
                setMode(MODES.VIEW);
            } else {
                showNotification(result?.message || 'Failed to save Cost Center', 'error');
            }
        } catch (error) {
            console.error('Error saving cost center:', error);
            showNotification('An error occurred while saving cost center', 'error');
        }
    }

    /**
     * Handle Cancel action
     */
    function handleCancel() {
        if (!isInMode(MODES.VIEW) && confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            // Reset form or close window
            try {
                window.parent.closeCostCenter();
            } catch (e) {
                // If not in iframe, just reset form
                clearFormFields();
                setMode(MODES.VIEW);
                showNotification('Operation cancelled', 'info');
            }
        }
    }

    /**
     * Handle Activate action
     */
    function handleActivate(costCenterId) {
        if (!isInMode(MODES.VIEW)) {
            showNotification('Activate is only available in View mode', 'warning');
            return;
        }

        if (!costCenterId) {
            showNotification('Please select a Cost Center to activate/deactivate', 'warning');
            return;
        }

        if (!isValidCostCenterId(costCenterId)) {
            showNotification('CostCenter ID must be alphanumeric only', 'warning');
            return;
        }
        
        const statusField = document.getElementById('Status');
        const currentStatus = statusField ? statusField.value : '';
        const isActive = currentStatus === 'Active';
        
        const newStatus = isActive ? 'Inactive' : 'Active';
        const action = isActive ? 'deactivated' : 'activated';
        
        showNotification(`Cost Center ${costCenterId} ${action} successfully`, 'success');
        if (statusField) statusField.value = newStatus;
        
        // Update button text
        updateActivateButtonText();
        setMode(MODES.VIEW);
    }

    async function populateBranchName(branchId) {
        
        const normalizedBranchId = normalizeBranchId(branchId);
        if (!normalizedBranchId || !normalizedBranchId.trim()) {
            document.getElementById('BranchName').value = '';
            return;
        }

        try {
            
            // Use the existing branch search functionality to get branch info
            const payload = {
                TableID: 'BranchID',
                WhereStmt: `OurBranchID = '${normalizedBranchId}'`,
                AdvFilterString: '',
                PrevOrNext: '1',
                RefID: '',
                OperatorID: 'web_portal',
                ModuleID: 1000,
                OurBranchID: normalizedBranchId
            };

            const result = await SearchService.search(payload);
            
            if (result && result.success && result.data && result.data.Details && result.data.Details.length > 0) {
                const branch = result.data.Details[0];
                const branchName = branch.BranchName || branch.Name || '';
                document.getElementById('BranchName').value = branchName;
            } else {
                // Branch not found, clear the name field
                document.getElementById('BranchName').value = '';
            }
        } catch (error) {
            console.error('Error fetching branch name:', error);
            // Don't show error notification for auto-population, just clear the field
            document.getElementById('BranchName').value = '';
        }
    }

    /**
     * Auto-populate Cost Center Name based on Cost Center ID
     */
    async function populateCostCenterName(costCenterId) {

        const normalizedCostCenterId = normalizeCostCenterId(costCenterId);
        if (!normalizedCostCenterId || !normalizedCostCenterId.trim()) {
            document.getElementById('Name').value = '';
            return;
        }

        try {
            
            // Use the existing cost center search functionality to get cost center info
            const payload = {
                TableID: 'CostCenterID',
                WhereStmt: `CostCenterID = '${normalizedCostCenterId}'`,
                AdvFilterString: '',
                PrevOrNext: '1',
                RefID: '',
                OperatorID: 'web_portal',
                ModuleID: 1000,
                OurBranchID: document.getElementById('BranchID')?.value || ''
            };

            const result = await SearchService.search(payload);
            
            if (result && result.success && result.data && result.data.Details && result.data.Details.length > 0) {
                const costCenter = result.data.Details[0];
                const costCenterName = costCenter.Name || costCenter.CostCenterName || '';
                document.getElementById('Name').value = costCenterName;
            } else {
                // Cost Center not found, clear the name field
                document.getElementById('Name').value = '';
            }
        } catch (error) {
            console.error('Error fetching cost center name:', error);
            // Don't show error notification for auto-population, just clear the field
            document.getElementById('Name').value = '';
        }
    }

    /**
     * Setup form interactions
     */
    function setupFormInteractions() {
        const mainForm = document.querySelector('[data-main-form]');
        const inputs = mainForm ? mainForm.querySelectorAll('input, select, textarea') : [];
        
        inputs.forEach(input => {
            input.addEventListener('focus', function() {
                this.style.borderColor = '#5b9fd9';
            });
            
            input.addEventListener('blur', function() {
                this.style.borderColor = '#d1d5db';
            });
        });

        // Auto-populate Branch Name when Branch ID changes
        const branchIdField = document.getElementById('BranchID');
        if (branchIdField) {
            branchIdField.addEventListener('input', function () {
                const next = normalizeBranchId(this.value);
                if (next !== this.value) this.value = next;

                // Any manual identifier change invalidates the loaded record selection.
                if (isInMode(MODES.VIEW)) clearLoadedCostCenterKey();
            });
            branchIdField.addEventListener('blur', async function() {
                const branchId = normalizeBranchId(this.value).trim();
                if (branchId !== this.value) this.value = branchId;
                if (branchId) {
                    await populateBranchName(branchId);
                } else {
                    // Clear Branch Name if Branch ID is empty
                    document.getElementById('BranchName').value = '';
                }
            });
        }

        // Auto-populate Cost Center Name when Cost Center ID changes
        const costCenterIdField = document.getElementById('CostCenterID');
        if (costCenterIdField) {
            costCenterIdField.addEventListener('input', function () {
                const next = normalizeCostCenterId(this.value);
                if (next !== this.value) this.value = next;

                // Any manual identifier change invalidates the loaded record selection.
                if (isInMode(MODES.VIEW)) clearLoadedCostCenterKey();
            });
            costCenterIdField.addEventListener('blur', async function() {
                const costCenterId = normalizeCostCenterId(this.value).trim();
                if (costCenterId !== this.value) this.value = costCenterId;
                if (costCenterId) {
                    await populateCostCenterName(costCenterId);
                } else {
                    // Clear Cost Center Name if Cost Center ID is empty
                    document.getElementById('Name').value = '';
                }
            });
        }
    }

    /**
     * Update Activate button text based on current status
     */
    function updateActivateButtonText() {
        const statusField = document.getElementById('Status');
        const activateBtn = document.querySelector('.btn-action[data-action="activate"]');
        
        if (!statusField || !activateBtn) return;
        
        const currentStatus = statusField.value;
        const isActive = currentStatus === 'Active';
        
        const buttonText = isActive ? 'Deactivate' : 'Activate';
        const iconClass = isActive ? 'bi-pause-circle' : 'bi-play-circle';
        
        // Update text content, keeping the icon
        activateBtn.innerHTML = `<i class="bi ${iconClass}"></i>\n                        ${buttonText}`;
    }

    function setIdentifiersLocked(locked) {
        const isLocked = !!locked;
        const branchIdEl = document.getElementById('BranchID');
        const costCenterIdEl = document.getElementById('CostCenterID');

        const lockInput = (el) => {
            if (!el) return;
            el.readOnly = isLocked;
            el.setAttribute('aria-readonly', isLocked ? 'true' : 'false');
            el.classList.toggle('bg-light', isLocked);
        };

        lockInput(branchIdEl);
        lockInput(costCenterIdEl);

        const branchLookupBtn = document.querySelector('button[aria-label="Lookup Branch"]');
        const costCenterLookupBtn = document.querySelector('button[aria-label="Lookup CostCenter"]');
        [branchLookupBtn, costCenterLookupBtn].forEach((btn) => {
            if (!btn) return;
            btn.disabled = isLocked;
            if (isLocked) btn.setAttribute('disabled', '');
            else btn.removeAttribute('disabled');
        });
    }

    /**
     * Enable form fields for editing
     */
    function enableFormFields() {
        // Legacy compatibility: editing is driven by the mode controller now.
        setMode(MODES.EDIT);
    }

    /**
     * Clear form fields
     */
    function clearFormFields() {
        const ids = [
            'CostCenterID',
            'Name',
            'Status',
            'CreatedBy',
            'ModifiedBy',
            'SupervisedBy',
            'CreatedOn',
            'ModifiedOn',
            'SupervisedOn'
        ];
        ids.forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        clearLoadedCostCenterKey();
    }

  /**
   * Show notification message
   */
    let inlineAlertAutoHideTimer = null;

    function setInlineAlert(message, variant = 'info', timeoutMs = 6000) {
        const alertEl = document.querySelector('[data-cost-center-alert]');
        const alertText = alertEl?.querySelector('[data-cost-center-alert-text]');
        const closeBtn = alertEl?.querySelector('[data-cost-center-alert-close]');
        if (!alertEl || !alertText) return false;

        const msg = String(message ?? '').trim();
        const normalized = String(variant || '').toLowerCase();

        const alertVariant =
            normalized === 'success'
                ? 'success'
                : normalized === 'warning'
                    ? 'warning'
                    : normalized === 'error' || normalized === 'danger'
                        ? 'danger'
                        : 'info';

        const alertClass =
            alertVariant === 'success'
                ? 'alert-success'
                : alertVariant === 'warning'
                    ? 'alert-warning'
                    : alertVariant === 'info'
                        ? 'alert-info'
                        : 'alert-danger';

        if (inlineAlertAutoHideTimer) {
            clearTimeout(inlineAlertAutoHideTimer);
            inlineAlertAutoHideTimer = null;
        }

        if (!msg) {
            alertEl.classList.add('d-none');
            alertEl.setAttribute('hidden', '');
            return true;
        }

        alertEl.classList.remove('alert-success', 'alert-danger', 'alert-warning', 'alert-info');
        alertEl.classList.add(alertClass);
        alertText.textContent = msg;
        alertEl.classList.remove('d-none');
        alertEl.removeAttribute('hidden');

        if (closeBtn && !closeBtn.dataset.ccBound) {
            closeBtn.dataset.ccBound = '1';
            closeBtn.addEventListener('click', () => {
                if (inlineAlertAutoHideTimer) {
                    clearTimeout(inlineAlertAutoHideTimer);
                    inlineAlertAutoHideTimer = null;
                }
                alertEl.classList.add('d-none');
                alertEl.setAttribute('hidden', '');
            });
        }

        if (timeoutMs && timeoutMs > 0) {
            inlineAlertAutoHideTimer = setTimeout(() => {
                try {
                    alertEl.classList.add('d-none');
                    alertEl.setAttribute('hidden', '');
                } finally {
                    inlineAlertAutoHideTimer = null;
                }
            }, timeoutMs);
        }

        return true;
    }

  function showNotification(message, type = 'info') {
        // Prefer on-page banner (Device Maintenance-style)
        try {
            if (setInlineAlert(message, type, 6000)) return;
        } catch (e) {
            // Ignore and fall back
        }

    try {
        const toastEl = document.getElementById('statusToast');
        if (toastEl && window.bootstrap?.Toast) {
            const toastText = toastEl.querySelector('.status-text');
            if (toastText) toastText.textContent = message;

            toastEl.classList.remove('text-bg-info', 'text-bg-success', 'text-bg-danger', 'text-bg-warning');
            if (type === 'success') toastEl.classList.add('text-bg-success');
            else if (type === 'error') toastEl.classList.add('text-bg-danger');
            else if (type === 'warning') toastEl.classList.add('text-bg-warning');
            else toastEl.classList.add('text-bg-info');

            const toast = bootstrap.Toast.getOrCreateInstance(toastEl, { delay: 4000 });
            toast.show();
            return;
        }
    } catch (e) {
        // Fall through to snackbar fallback
    }

    // Fallback (if toast markup/bootstrap isn't available yet)
    const notification = document.createElement('div');
    notification.className = `cc-snackbar cc-snackbar-${type}`;
    notification.textContent = message;

    const styles = `
        position: fixed;
        left: 50%;
        bottom: 32px;
        transform: translateX(-50%);
        min-width: 220px;
        max-width: 400px;
        padding: 14px 28px;
        border-radius: 8px;
        font-size: 15px;
        font-weight: 500;
        box-shadow: 0 4px 16px rgba(0,0,0,0.18);
        z-index: 10001;
        animation: snackbarIn 0.25s cubic-bezier(.4,0,.2,1);
        display: flex;
        align-items: center;
        justify-content: center;
        opacity: 0.98;
    `;

    const typeStyles = {
        'success': 'background-color: #10b981; color: #fff;',
        'warning': 'background-color: #f59e0b; color: #fff;',
        'error': 'background-color: #ef4444; color: #fff;',
        'info': 'background-color: #3b82f6; color: #fff;'
    };

    notification.style.cssText = styles + (typeStyles[type] || typeStyles['info']);
    document.body.appendChild(notification);

    setTimeout(() => {
        notification.style.animation = 'snackbarOut 0.2s cubic-bezier(.4,0,.2,1)';
        notification.style.opacity = '0';
        setTimeout(() => notification.remove(), 200);
    }, 3000);
  }

    // Add snackbar keyframes
    (function injectSnackbarKeyframes() {
        if (document.getElementById('cc-snackbar-keyframes')) return;
        const style = document.createElement('style');
        style.id = 'cc-snackbar-keyframes';
        style.textContent = `
        @keyframes snackbarIn {
            from { opacity: 0; transform: translateX(-50%) translateY(40px); }
            to { opacity: 0.98; transform: translateX(-50%) translateY(0); }
        }
        @keyframes snackbarOut {
            from { opacity: 0.98; transform: translateX(-50%) translateY(0); }
            to { opacity: 0; transform: translateX(-50%) translateY(40px); }
        }
        `;
        document.head.appendChild(style);
    })();

    // Branch Search Functions
    function openBranchSearchPanel() {
        const modal = new bootstrap.Modal(document.getElementById('branchLookupModal'));
        modal.show();
        // Auto-load all branches on modal open
        setTimeout(() => performBranchSearch(null, true), 100);
    }

    function closeBranchSearchPanel() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('branchLookupModal'));
        if (modal) modal.hide();
    }

    function resetBranchSearchPanel() {
        document.getElementById('branchSearchId').value = '';
        document.getElementById('branchSearchName').value = '';
        document.getElementById('branchSearchModeId').value = 'Like';
        document.getElementById('branchSearchModeName').value = 'Like';
        document.getElementById('branchSearchResults').innerHTML = '';
        document.getElementById('branchSearchEmpty').style.display = 'block';
        document.getElementById('branchSearchEmpty').textContent = 'Enter at least one filter above and click Search to query branches.';
        document.getElementById('branchSearchLoading').classList.add('d-none');
    }

    async function performBranchSearch(event, forceLoadAll = false) {
        if (event) event.preventDefault();
        const branchSearchIdEl = document.getElementById('branchSearchId');
        const idValue = normalizeBranchId((branchSearchIdEl?.value || '').trim());
        if (branchSearchIdEl && branchSearchIdEl.value !== idValue) branchSearchIdEl.value = idValue;
        const nameValue = (document.getElementById('branchSearchName')?.value || '').trim();
        const idMode = document.getElementById('branchSearchModeId')?.value || 'Like';
        const nameMode = document.getElementById('branchSearchModeName')?.value || 'Like';
        const results = document.getElementById('branchSearchResults');
        const empty = document.getElementById('branchSearchEmpty');
        const loading = document.getElementById('branchSearchLoading');

        if (results) results.innerHTML = '';
        if (empty) empty.style.display = 'none';
        if (loading) loading.classList.remove('d-none');

        const clauses = [];
        const buildClause = (col, mode, val) => {
            if (!val) return null;
            const safe = val.replace(/'/g, "''");
            return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
        };
        const idClause = buildClause('OurBranchID', idMode, idValue);
        const nameClause = buildClause('BranchName', nameMode, nameValue);
        [idClause, nameClause].forEach(c => c && clauses.push(c));

        const whereStmt = clauses.join(' AND ');

        // If no filters and not forcing load all, show empty message
        if (!whereStmt && !forceLoadAll) {
            if (loading) loading.classList.add('d-none');
            if (empty) {
                empty.textContent = 'Enter at least one filter above and click Search to query branches.';
                empty.style.display = 'block';
            }
            return;
        }

        // For loading all branches, use a condition that matches everything
        const finalWhereStmt = forceLoadAll && !whereStmt ? '1=1' : whereStmt;

        // Use PrevOrNext: '0' to get records from the beginning (ascending)
        // Use empty OurBranchID to get broadest results (don't filter by user's current branch)
        const payload = {
            TableID: 'BranchID',
            WhereStmt: finalWhereStmt,
            AdvFilterString: '',
            PrevOrNext: '0',
            RefID: '',
            OperatorID: 'web_portal',
            ModuleID: 1000,
            OurBranchID: ''
        };

        try {
            if (!SearchService || typeof SearchService.search !== 'function') {
                throw new Error('Search service not available');
            }
            const response = await SearchService.search(payload);
            let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || [];
            if (!Array.isArray(rows)) rows = rows ? [rows] : [];
            if (!rows.length) {
                if (empty) {
                    empty.textContent = 'No branches matched the filters.';
                    empty.style.display = 'block';
                }
                return;
            }
            // Sort rows by BranchID ascending (numerically, lowest to highest - starting with 0101)
            rows.sort((a, b) => {
                const aId = (a.OurBranchID || a.BranchID || '').toString().trim();
                const bId = (b.OurBranchID || b.BranchID || '').toString().trim();

                // Extract numeric part for sorting (handle leading zeros and mixed content)
                const aMatch = aId.match(/^(\d+)/);
                const bMatch = bId.match(/^(\d+)/);

                if (aMatch && bMatch) {
                    const aNum = parseInt(aMatch[1], 10);
                    const bNum = parseInt(bMatch[1], 10);
                    if (!isNaN(aNum) && !isNaN(bNum)) {
                        return aNum - bNum; // Ascending order: lowest numbers first (0101, 0102, ...)
                    }
                }

                // Fallback to string comparison with numeric awareness (ascending)
                return aId.localeCompare(bId, undefined, { numeric: true, sensitivity: 'base' });
            });
            if (results) {
                results.innerHTML = rows.map((r, idx) => {
                    const branchId = r.OurBranchID || r.BranchID || '';
                    const branchName = r.BranchName || r.Name || '';
                    return `<tr data-result-index="${idx}" style="cursor: pointer;">
                        <td>${branchId}</td>
                        <td>${branchName}</td>
                        <td class="text-end">
                            <button type="button" class="btn btn-sm btn-primary" data-result-index="${idx}">Select</button>
                        </td>
                    </tr>`;
                }).join('');
                // Add click handlers for rows and buttons
                results.querySelectorAll('tr[data-result-index]').forEach(row => {
                    row.addEventListener('click', () => {
                        const idx = parseInt(row.dataset.resultIndex);
                        selectBranch(rows[idx]);
                    });
                });
                results.querySelectorAll('button[data-result-index]').forEach(btn => {
                    btn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const idx = parseInt(btn.dataset.resultIndex);
                        selectBranch(rows[idx]);
                    });
                });
            }
        } catch (error) {
            console.error('Branch search error:', error);
            if (empty) {
                empty.textContent = `Search failed: ${error.message}`;
                empty.style.display = 'block';
            }
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    function selectBranch(branch) {
        const branchId = branch.OurBranchID || branch.BranchID || '';
        const branchName = branch.BranchName || branch.Name || '';
        document.getElementById('BranchID').value = branchId;
        document.getElementById('BranchName').value = branchName;

        // Changing branch invalidates any previously loaded cost center.
        ['CostCenterID', 'Name', 'Status', 'CreatedBy', 'CreatedOn', 'ModifiedBy', 'ModifiedOn', 'SupervisedBy', 'SupervisedOn'].forEach((id) => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });
        clearLoadedCostCenterKey();
        setMode(MODES.VIEW);

        closeBranchSearchPanel();
        showNotification(`Branch ID - ${branchId} Description - ${branchName}`, 'success');
    }

    function handleBranchLookup() {
        openBranchSearchPanel();
    }

    // Cost Center Search Functions
    function openCostCenterSearchPanel() {
        const modal = new bootstrap.Modal(document.getElementById('costCenterLookupModal'));
        modal.show();
        resetCostCenterSearchPanel();
        // Auto-load all cost centers on modal open
        setTimeout(() => performCostCenterSearch(null, true), 100);
    }

    function closeCostCenterSearchPanel() {
        const modal = bootstrap.Modal.getInstance(document.getElementById('costCenterLookupModal'));
        if (modal) modal.hide();
    }

    function resetCostCenterSearchPanel() {
        document.getElementById('costCenterSearchId').value = '';
        document.getElementById('costCenterSearchName').value = '';
        document.getElementById('costCenterSearchModeId').value = 'Like';
        document.getElementById('costCenterSearchModeName').value = 'Like';
        document.getElementById('costCenterSearchResults').innerHTML = '';
        document.getElementById('costCenterSearchEmpty').style.display = 'block';
        document.getElementById('costCenterSearchEmpty').textContent = 'Enter at least one filter above and click Search to query cost centers.';
        document.getElementById('costCenterSearchLoading').classList.add('d-none');
    }

    async function performCostCenterSearch(event, forceLoadAll = false) {
        if (event) event.preventDefault();
        const costCenterSearchIdEl = document.getElementById('costCenterSearchId');
        const idValue = normalizeCostCenterId((costCenterSearchIdEl?.value || '').trim());
        if (costCenterSearchIdEl && costCenterSearchIdEl.value !== idValue) costCenterSearchIdEl.value = idValue;
        const nameValue = (document.getElementById('costCenterSearchName')?.value || '').trim();
        const idMode = document.getElementById('costCenterSearchModeId')?.value || 'Like';
        const nameMode = document.getElementById('costCenterSearchModeName')?.value || 'Like';
        const results = document.getElementById('costCenterSearchResults');
        const empty = document.getElementById('costCenterSearchEmpty');
        const loading = document.getElementById('costCenterSearchLoading');

        if (results) results.innerHTML = '';
        if (empty) empty.style.display = 'none';
        if (loading) loading.classList.remove('d-none');

        const clauses = [];
        const buildClause = (col, mode, val) => {
            if (!val) return null;
            const safe = val.replace(/'/g, "''");
            return mode === 'Exact' ? `${col} = '${safe}'` : `${col} like '%${safe}%'`;
        };
        const idClause = buildClause('CostCenterID', idMode, idValue);
        const nameClause = buildClause('CostCenter', nameMode, nameValue);
        [idClause, nameClause].forEach(c => c && clauses.push(c));

        const whereStmt = clauses.join(' AND ');

        // If no filters and not forcing load all, show empty message
        const finalWhereStmt = forceLoadAll && !whereStmt ? '1=1' : whereStmt;
        if (!finalWhereStmt) {
            if (loading) loading.classList.add('d-none');
            if (empty) {
                empty.textContent = 'Enter at least one filter above and click Search to query cost centers.';
                empty.style.display = 'block';
            }
            return;
        }

        const payload = {
            TableID: 'CostCenterID',
            WhereStmt: finalWhereStmt,
            AdvFilterString: '',
            PrevOrNext: '1',
            RefID: '',
            OperatorID: 'web_portal',
            ModuleID: 1000,
            OurBranchID: normalizeBranchId(document.getElementById('BranchID')?.value || '')
        };

        try {
            if (!SearchService || typeof SearchService.search !== 'function') {
                throw new Error('Search service not available');
            }
            const response = await SearchService.search(payload);
            let rows = response?.Details?.SearchResults || response?.Details || response?.SearchResults || [];
            if (!Array.isArray(rows)) rows = rows ? [rows] : [];
            if (!rows.length) {
                if (empty) {
                    empty.textContent = 'No cost centers matched the filters.';
                    empty.style.display = 'block';
                }
                return;
            }
            if (results) {
                results.innerHTML = rows.map((r, idx) => {
                    const ccid = r.CostCenterID || '';
                    const costCenter = r.CostCenter || r.Name || r.CostCenterName || '';
                    const branchId = r.OurBranchID || r.BranchID || '';
                    return `<tr data-result-index="${idx}" style="cursor: pointer;">
                        <td>${ccid}</td>
                        <td>${costCenter}</td>
                        <td>${branchId}</td>
                        <td class="text-end">
                            <button type="button" class="btn btn-sm btn-primary" data-result-index="${idx}">Select</button>
                        </td>
                    </tr>`;
                }).join('');
                results.querySelectorAll('button[data-result-index]').forEach(btn => {
                    btn.addEventListener('click', () => {
                        const idx = parseInt(btn.getAttribute('data-result-index'));
                        const selectedRow = rows[idx];
                        if (selectedRow) {
                            selectCostCenter(selectedRow);
                        }
                    });
                });
                results.querySelectorAll('tr[data-result-index]').forEach(tr => {
                    tr.addEventListener('click', (e) => {
                        if (e.target.tagName !== 'BUTTON') {
                            const idx = parseInt(tr.getAttribute('data-result-index'));
                            const selectedRow = rows[idx];
                            if (selectedRow) {
                                selectCostCenter(selectedRow);
                            }
                        }
                    });
                });
            }
        } catch (error) {
            console.error('Cost center search error:', error);
            if (empty) {
                empty.textContent = `Search failed: ${error.message}`;
                empty.style.display = 'block';
            }
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    function selectCostCenter(costCenter) {
        const costCenterId = costCenter.CostCenterID || '';
        const costCenterName = costCenter.CostCenter || costCenter.Name || '';
        const branchId = costCenter.OurBranchID || costCenter.BranchID || '';
        document.getElementById('CostCenterID').value = costCenterId;
        document.getElementById('Name').value = costCenterName;
        document.getElementById('BranchID').value = branchId;

        setLoadedCostCenterKey(branchId, costCenterId);

        setMode(MODES.VIEW);
        
        closeCostCenterSearchPanel();
        showNotification(`CostCenterID - ${costCenterId} CostCenter - ${costCenterName} OurBranchID - ${branchId}`, 'success');
    }

    /**
     * Lookup modal handler
     */
    function handleLookup() {
        openCostCenterSearchPanel();
    }

    // Initialize
    console.log('Initializing Cost Center module...');
    initializeButtons();
    setupFormInteractions();
    setMode(MODES.VIEW);
    
    // Handle lookup buttons
    document.addEventListener('click', function(e) {
        const button = e.target.closest('button[aria-label]');
        if (button) {
            const ariaLabel = button.getAttribute('aria-label');
            
            if (ariaLabel === 'Lookup Branch') {
                handleBranchLookup();
            } else if (ariaLabel === 'Lookup CostCenter') {
                handleLookup(); // Cost center lookup
            }
        }
    });

    // Wire cost center search panel
    document.getElementById('costCenterLookupForm')?.addEventListener('submit', performCostCenterSearch);
    document.getElementById('costCenterSearchReset')?.addEventListener('click', resetCostCenterSearchPanel);
    document.getElementById('costCenterSearchRefresh')?.addEventListener('click', () => {
        resetCostCenterSearchPanel();
        performCostCenterSearch();
    });
    document.getElementById('costCenterSearchCancel')?.addEventListener('click', closeCostCenterSearchPanel);

    // Wire branch search panel
    document.getElementById('branchLookupForm')?.addEventListener('submit', performBranchSearch);
    document.getElementById('branchSearchReset')?.addEventListener('click', resetBranchSearchPanel);
    document.getElementById('branchSearchRefresh')?.addEventListener('click', () => {
        resetBranchSearchPanel();
        performBranchSearch();
    });
    document.getElementById('branchSearchCancel')?.addEventListener('click', closeBranchSearchPanel);

    // ==========================================
    // COST CENTER STATEMENT FUNCTIONALITY
    // ==========================================

    // Currency list (common currencies)
    const CURRENCIES = [
        { CurrencyID: 'UGX', Description: 'Uganda Shilling' },
        { CurrencyID: 'USD', Description: 'US Dollar' },
        { CurrencyID: 'EUR', Description: 'Euro' },
        { CurrencyID: 'GBP', Description: 'British Pound' },
        { CurrencyID: 'KES', Description: 'Kenya Shilling' },
        { CurrencyID: 'TZS', Description: 'Tanzania Shilling' },
        { CurrencyID: 'RWF', Description: 'Rwanda Franc' },
        { CurrencyID: 'ZAR', Description: 'South African Rand' },
        { CurrencyID: 'AED', Description: 'UAE Dirham' },
        { CurrencyID: 'INR', Description: 'Indian Rupee' },
        { CurrencyID: 'CNY', Description: 'Chinese Yuan' },
        { CurrencyID: 'JPY', Description: 'Japanese Yen' }
    ];

    /**
     * Load cost centers into the Statement For dropdown
     */
    async function loadStatementCostCenters() {
        const select = document.getElementById('StatementFor');
        if (!select) return;

        // Keep the first option
        select.innerHTML = '<option value="">~Select Cost Center~</option>';

        try {
            const payload = {
                TableID: 'CostCenterID',
                WhereStmt: '1=1',
                AdvFilterString: '',
                PrevOrNext: '0',
                RefID: '',
                OperatorID: 'web_portal',
                ModuleID: 1000,
                OurBranchID: ''
            };

            const response = await SearchService.search(payload);
            const rows = extractSearchRows(response);

            if (rows && rows.length > 0) {
                // Sort by CostCenterID
                rows.sort((a, b) => {
                    const idA = String(a.CostCenterID || '').toLowerCase();
                    const idB = String(b.CostCenterID || '').toLowerCase();
                    return idA.localeCompare(idB);
                });

                rows.forEach(row => {
                    const id = row.CostCenterID || '';
                    const name = row.CostCenter || row.CostCenterName || row.Name || '';
                    const branchId = row.OurBranchID || '';
                    if (id) {
                        const option = document.createElement('option');
                        option.value = id;
                        option.textContent = `${id} - ${name}${branchId ? ` (${branchId})` : ''}`;
                        option.dataset.branchId = branchId;
                        option.dataset.costCenterName = name;
                        select.appendChild(option);
                    }
                });
            }
        } catch (error) {
            console.error('Error loading cost centers for statement:', error);
        }
    }

    /**
     * Load currencies into the Report Currency dropdown
     */
    function loadStatementCurrencies() {
        const select = document.getElementById('ReportCurrency');
        if (!select) return;

        // Keep the first option
        select.innerHTML = '<option value="">~Select Currency~</option>';

        CURRENCIES.forEach(cur => {
            const option = document.createElement('option');
            option.value = cur.CurrencyID;
            option.textContent = `${cur.CurrencyID} - ${cur.Description}`;
            select.appendChild(option);
        });
    }

    /**
     * Set default dates for the statement form
     */
    function setDefaultStatementDates() {
        const fromDateEl = document.getElementById('FromDate');
        const toDateEl = document.getElementById('ToDate');

        if (fromDateEl && toDateEl) {
            const today = new Date();
            const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);

            fromDateEl.value = formatDateForInput(firstDayOfMonth);
            toDateEl.value = formatDateForInput(today);
        }
    }

    /**
     * Format date for input[type=date] (YYYY-MM-DD)
     */
    function formatDateForInput(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    /**
     * Format date for display (DD/MM/YYYY)
     */
    function formatDateForDisplay(dateStr) {
        if (!dateStr) return '-';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return dateStr;
        }
    }

    /**
     * Format number for display (with commas and decimals)
     */
    function formatAmount(value) {
        if (value === null || value === undefined || value === '') return '-';
        const num = parseFloat(value);
        if (isNaN(num)) return value;
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    /**
     * Fetch and display statement data
     */
    async function fetchStatement(event) {
        if (event) event.preventDefault();

        const statementForSelect = document.getElementById('StatementFor');
        const costCenterId = statementForSelect?.value || '';
        const selectedOption = statementForSelect?.selectedOptions[0];
        const branchId = selectedOption?.dataset?.branchId || '';
        const currency = document.getElementById('ReportCurrency')?.value || '';
        const fromDate = document.getElementById('FromDate')?.value || '';
        const toDate = document.getElementById('ToDate')?.value || '';
        const tableBody = document.getElementById('statementTableBody');
        const loading = document.getElementById('statementLoading');

        // Validation
        if (!costCenterId) {
            showNotification('Please select a Cost Center', 'warning');
            return;
        }

        if (!fromDate || !toDate) {
            showNotification('Please select From Date and To Date', 'warning');
            return;
        }

        if (new Date(fromDate) > new Date(toDate)) {
            showNotification('From Date cannot be after To Date', 'warning');
            return;
        }

        // Show loading
        if (tableBody) tableBody.innerHTML = '';
        if (loading) loading.classList.remove('d-none');

        try {
            // Build WHERE clause for statement search
            // This searches for transactions related to the cost center
            const escapedCostCenterId = escapeSqlValue(costCenterId);
            const escapedFromDate = escapeSqlValue(fromDate);
            const escapedToDate = escapeSqlValue(toDate);

            let whereClause = `CostCenterID = '${escapedCostCenterId}'`;
            whereClause += ` AND TxDate >= '${escapedFromDate}' AND TxDate <= '${escapedToDate}'`;
            if (currency) {
                whereClause += ` AND CurrencyID = '${escapeSqlValue(currency)}'`;
            }

            // Try to fetch statement data
            // Note: This uses a generic search - the actual TableID may need adjustment based on your database schema
            const payload = {
                TableID: 'CostCenterStatement',  // Adjust if different in your system
                WhereStmt: whereClause,
                AdvFilterString: '',
                PrevOrNext: '0',
                RefID: '',
                OperatorID: 'web_portal',
                ModuleID: 1000,
                OurBranchID: branchId  // Use branch ID from selected cost center
            };

            let rows = [];
            try {
                const response = await SearchService.search(payload);
                rows = extractSearchRows(response);
            } catch (searchError) {
                console.warn('Statement search failed, trying alternative:', searchError);
                // If the specific table doesn't exist, we'll show mock data or empty results
            }

            // Render results
            renderStatementTable(rows, costCenterId, currency, fromDate, toDate);

        } catch (error) {
            console.error('Error fetching statement:', error);
            showNotification('Error fetching statement data', 'error');
            if (tableBody) {
                tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-danger">Error loading statement data.</td></tr>';
            }
        } finally {
            if (loading) loading.classList.add('d-none');
        }
    }

    /**
     * Render statement data in the table
     */
    function renderStatementTable(rows, costCenterId, currency, fromDate, toDate) {
        const tableBody = document.getElementById('statementTableBody');
        if (!tableBody) return;

        if (!rows || rows.length === 0) {
            // Show message with filter details
            const currencyText = currency ? ` in ${currency}` : '';
            tableBody.innerHTML = `
                <tr>
                    <td colspan="8" class="text-center text-muted py-4">
                        <i class="bi bi-inbox me-2"></i>
                        No transactions found for Cost Center <strong>${costCenterId}</strong>${currencyText}
                        <br><small class="text-secondary">Period: ${formatDateForDisplay(fromDate)} to ${formatDateForDisplay(toDate)}</small>
                    </td>
                </tr>
            `;
            return;
        }

        // Sort by date ascending
        rows.sort((a, b) => {
            const dateA = new Date(a.TxDate || a.TransactionDate || 0);
            const dateB = new Date(b.TxDate || b.TransactionDate || 0);
            return dateA - dateB;
        });

        // Calculate running balance
        let runningBalance = 0;
        const rowsWithBalance = rows.map(row => {
            const debit = parseFloat(row.Debit || row.DebitAmount || 0) || 0;
            const credit = parseFloat(row.Credit || row.CreditAmount || 0) || 0;
            runningBalance = runningBalance - debit + credit;
            return { ...row, calculatedBalance: runningBalance };
        });

        tableBody.innerHTML = rowsWithBalance.map((row, index) => {
            const txDate = formatDateForDisplay(row.TxDate || row.TransactionDate || row.Date || '');
            const particulars = row.Particulars || row.Description || row.Narration || row.Remarks || '-';
            const debit = row.Debit || row.DebitAmount || 0;
            const credit = row.Credit || row.CreditAmount || 0;
            const balance = row.Balance || row.calculatedBalance || 0;
            const trRef = row.TrRef || row.TransactionRef || row.Reference || row.RefNo || '-';
            const operatorId = row.OperatorID || row.Operator || row.CreatedBy || '-';
            const supervisorId = row.SupervisorID || row.Supervisor || row.SupervisedBy || '-';

            const debitClass = parseFloat(debit) > 0 ? 'text-danger' : '';
            const creditClass = parseFloat(credit) > 0 ? 'text-success' : '';
            const balanceClass = parseFloat(balance) < 0 ? 'text-danger' : 'text-success';

            return `
                <tr>
                    <td>${txDate}</td>
                    <td>${particulars}</td>
                    <td class="text-end ${debitClass}">${formatAmount(debit)}</td>
                    <td class="text-end ${creditClass}">${formatAmount(credit)}</td>
                    <td class="text-end ${balanceClass}">${formatAmount(balance)}</td>
                    <td>${trRef}</td>
                    <td>${operatorId}</td>
                    <td>${supervisorId}</td>
                </tr>
            `;
        }).join('');

        // Add summary row
        const totalDebit = rowsWithBalance.reduce((sum, r) => sum + (parseFloat(r.Debit || r.DebitAmount || 0) || 0), 0);
        const totalCredit = rowsWithBalance.reduce((sum, r) => sum + (parseFloat(r.Credit || r.CreditAmount || 0) || 0), 0);
        const finalBalance = rowsWithBalance.length > 0 ? rowsWithBalance[rowsWithBalance.length - 1].calculatedBalance : 0;

        tableBody.innerHTML += `
            <tr class="table-secondary fw-bold">
                <td colspan="2" class="text-end">Totals:</td>
                <td class="text-end text-danger">${formatAmount(totalDebit)}</td>
                <td class="text-end text-success">${formatAmount(totalCredit)}</td>
                <td class="text-end ${finalBalance < 0 ? 'text-danger' : 'text-success'}">${formatAmount(finalBalance)}</td>
                <td colspan="3"></td>
            </tr>
        `;

        showNotification(`Found ${rows.length} transaction(s)`, 'success');
    }

    /**
     * Reset statement form
     */
    function resetStatementForm() {
        document.getElementById('StatementFor').value = '';
        document.getElementById('ReportCurrency').value = '';
        setDefaultStatementDates();

        const tableBody = document.getElementById('statementTableBody');
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="8" class="text-center text-muted">Select filters and click "Fetch Statement" to view records.</td></tr>';
        }

        showNotification('Statement form reset', 'info');
    }

    // Initialize Statement Tab
    function initializeStatementTab() {
        loadStatementCurrencies();
        loadStatementCostCenters();
        setDefaultStatementDates();

        // Wire up form events
        document.getElementById('statementForm')?.addEventListener('submit', fetchStatement);
        document.getElementById('fetchStatementBtn')?.addEventListener('click', fetchStatement);
        document.getElementById('resetStatementBtn')?.addEventListener('click', resetStatementForm);
    }

    // Initialize statement functionality
    initializeStatementTab();

})();