/**
 * Exit Types Module
 * Migrated from legacy implementation to KAIRO MVC architecture
 */
(function () {
    'use strict';

    console.log('🚀 Exit Types module loading...');

    // ═══════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    const state = {
        currentExitTypeId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',    // VIEW, EDIT, NEW
        isDirty: false,
        moduleId: null,
        currentData: null
    };

    function getAppCore() {
        const win = window;
        return win.AppCore || (win.parent && win.parent !== win && win.parent.AppCore) || (win.top && win.top !== win && win.top.AppCore) || null;
    }

    // SearchModal instance
    let searchModal = null;

    // ═══════════════════════════════════════════════════════════════════
    // LOOKUP CONFIGURATION (for SearchModal - NOT dropdowns)
    // ═══════════════════════════════════════════════════════════════════

    const LOOKUP_CONFIG = {
        'ExitTypeID': {
            tableID: 'ExitTypeID',
            displayField: 'txt_exitTypeId',
            valueField: 'txt_exitTypeId',
            displayColumn: 'ExitTypeID',
            valueColumn: 'ExitTypeID',
            whereStmt: ''
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    function init() {
        console.log('🚀 Initializing Exit Types module...');

        loadContext();
        const appCore = getAppCore();
        if (!appCore) {
            console.error('[ExitTypes] AppCore not found. Exit Types cannot initialize.');
            return;
        }
        if (!window.SearchModal) {
            console.error('[ExitTypes] SearchModal not found. Ensure shared search modal scripts are loaded.');
            return;
        }

        searchModal = new SearchModal(appCore);

        wireSectionToggles();
        wireLookupButtons();
        wireFormEvents();
        wireActionButtons();
        wireReinstateCheckbox();
        wireChargeOffCheckbox();
        wireWithinDaysSync();

        // Default mode
        setMode('VIEW');
        setActionButtonsState({ canView: true, canAdd: false, canEdit: false, canDelete: false, canSave: false, canCancel: false });

        // Auto-load if exitTypeId provided
        const autoLoad = document.getElementById('autoLoad_exitTypes')?.value === 'true';
        const exitTypeId = document.getElementById('exitTypeId_exitTypes')?.value;
        if (autoLoad && exitTypeId) {
            document.getElementById('txt_exitTypeId').value = exitTypeId;
            setTimeout(() => handleView(), 300);
        }

        console.log('✅ Exit Types module initialized', state);
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONTEXT LOADING
    // ═══════════════════════════════════════════════════════════════════

    function loadContext() {
        state.moduleId = document.getElementById('moduleId_exitTypes')?.value || '1000';
        state.branchId = sessionStorage.getItem('branch_code') || sessionStorage.getItem('OurBranchID') || '0101';
        state.operatorId = sessionStorage.getItem('user_name') || sessionStorage.getItem('OperatorID') || 'CSADM';

        console.log('📦 Context loaded:', state);
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION TOGGLES
    // ═══════════════════════════════════════════════════════════════════

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', (e) => {
                e.preventDefault();

                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                if (!content) return;

                const toggleBtn = header.querySelector('.section-toggle-btn');
                const isHidden = content.hasAttribute('hidden');

                if (isHidden) {
                    content.removeAttribute('hidden');
                } else {
                    content.setAttribute('hidden', '');
                }

                if (toggleBtn) {
                    const expanded = !content.hasAttribute('hidden');
                    toggleBtn.setAttribute('aria-expanded', String(expanded));
                    const icon = toggleBtn.querySelector('i');
                    if (icon) {
                        icon.className = expanded ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
                    }
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // LOOKUP BUTTONS (SearchModal Integration)
    // ═══════════════════════════════════════════════════════════════════

    function wireLookupButtons() {
        document.querySelectorAll('.btn-lookup[data-lookup]').forEach(btn => {
            btn.addEventListener('click', () => {
                const lookupKey = btn.getAttribute('data-lookup');
                openLookup(lookupKey);
            });
        });
    }

    function openLookup(lookupKey) {
        const config = LOOKUP_CONFIG[lookupKey];
        if (!config) {
            console.error('Lookup config not found:', lookupKey);
            return;
        }

        searchModal.open({
            tableID: config.tableID,
            moduleID: state.moduleId,
            whereStmt: config.whereStmt || '',
            ourbranchId: state.branchId,
            onSelect: (row) => {
                console.log('[Lookup] Selected:', row);

                const exitTypeId = row[config.valueColumn] || row.ExitTypeID || Object.values(row)[0] || '';
                document.getElementById('txt_exitTypeId').value = exitTypeId;

                // Auto-load the selected exit type
                setTimeout(() => handleView(), 100);
            }
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM EVENTS
    // ═══════════════════════════════════════════════════════════════════

    function wireFormEvents() {
        const form = document.getElementById('frm_exitTypes');
        form?.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(field => {
            field.addEventListener('change', () => {
                if (state.currentMode !== 'VIEW') {
                    state.isDirty = true;
                }
            });
        });
    }

    function wireActionButtons() {
        document.querySelector('[data-action="view"]')?.addEventListener('click', handleView);
        document.querySelector('[data-action="add"]')?.addEventListener('click', handleAdd);
        document.querySelector('[data-action="edit"]')?.addEventListener('click', handleEdit);
        document.querySelector('[data-action="delete"]')?.addEventListener('click', handleDelete);
        document.querySelector('[data-action="save"]')?.addEventListener('click', handleSave);
        document.querySelector('[data-action="cancel"]')?.addEventListener('click', handleCancel);

        // Initially only View enabled
        setActionButtonsState({ canView: true, canAdd: false, canEdit: false, canDelete: false, canSave: false, canCancel: false });
    }

    function wireReinstateCheckbox() {
        const allowReinstate = document.getElementById('chk_allowReinstate');
        allowReinstate?.addEventListener('change', handleReinstateChange);
    }

    function wireChargeOffCheckbox() {
        const chargeOffCheckbox = document.getElementById('chk_chargeOffLoan');
        chargeOffCheckbox?.addEventListener('change', syncChargeOffTypeEnabled);
    }

    function wireWithinDaysSync() {
        const withinDaysInput = document.getElementById('txt_withinDays');
        const afterDaysInput = document.getElementById('txt_afterDays');
        withinDaysInput?.addEventListener('input', function () {
            if (afterDaysInput) {
                afterDaysInput.value = withinDaysInput.value;
            }
        });
    }

    function handleReinstateChange() {
        const enabled = document.getElementById('chk_allowReinstate')?.checked || false;
        const nested = document.getElementById('reinstateNested');

        document.getElementById('chk_reopenAccounts').disabled = !enabled;
        document.getElementById('chk_moveOtherGroup').disabled = !enabled;
        document.getElementById('chk_chargeOffNotRecovered').disabled = !enabled;
        document.getElementById('chk_forfeitNotRecovered').disabled = !enabled;

        if (nested) nested.hidden = !enabled;
    }

    function syncChargeOffTypeEnabled() {
        const chargeOffChecked = document.getElementById('chk_chargeOffLoan')?.checked || false;
        const selectEl = document.getElementById('ddl_exitChargeOffType');
        if (selectEl) {
            selectEl.disabled = state.currentMode === 'VIEW' || !chargeOffChecked;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // CRUD OPERATIONS - ALL USE invokeControllerAsync (POST)
    // ═══════════════════════════════════════════════════════════════════

    async function handleView() {
        const appCore = getAppCore();
        const exitTypeId = document.getElementById('txt_exitTypeId')?.value?.trim();
        if (!exitTypeId) {
            showWarning('Enter Exit Type ID to view');
            document.getElementById('txt_exitTypeId')?.focus();
            return;
        }

        showLoading(true);

        try {
            const response = await appCore.invokeControllerAsync('MicroFinance/ExitTypes/get', {
                ExitTypeID: exitTypeId,
                OurBranchID: state.branchId,
                BankID: '00',
                OperatorID: state.operatorId,
                Direction: 0
            });

            console.log('[View] Response:', response);

            // Extract data: Details02 is the main record, Details01 has statistics
            const data = response?.Details02?.[0] || response?.Details?.[0];
            const isSuccess = (response?.ResponseCode === '00') || !!data;

            if (isSuccess && data) {
                populateForm(data, response);
                state.currentExitTypeId = exitTypeId;
                state.currentData = data;
                setMode('VIEW');
                setActionButtonsState({ canView: false, canAdd: false, canEdit: true, canDelete: true, canSave: false, canCancel: true });
                showSuccess(`Exit Type '${exitTypeId}' loaded`);
            } else {
                showError('Exit Type not found');
                setActionButtonsState({ canView: true, canAdd: true, canEdit: false, canDelete: false, canSave: false, canCancel: false });
            }
        } catch (error) {
            console.error('[View] Error:', error);
            showError('Error loading exit type: ' + error.message);
            setActionButtonsState({ canView: true, canAdd: false, canEdit: false, canDelete: false, canSave: false, canCancel: false });
        } finally {
            showLoading(false);
        }
    }

    async function handleAdd() {
        if (state.isDirty && !confirm('Discard unsaved changes?')) {
            return;
        }

        clearForm();
        document.getElementById('txt_exitTypeId').disabled = false;
        document.getElementById('txt_exitTypeId').focus();
        state.currentExitTypeId = null;
        state.currentData = null;
        setMode('NEW');
        setActionButtonsState({ canView: false, canAdd: false, canEdit: false, canDelete: false, canSave: true, canCancel: true });
        showInfo('Enter new exit type details');
    }

    async function handleEdit() {
        if (!state.currentData) {
            showWarning('Please select an exit type first');
            return;
        }

        setMode('EDIT');
        // Keep Exit Type ID disabled during edit (primary key)
        document.getElementById('txt_exitTypeId').disabled = true;
        setActionButtonsState({ canView: false, canAdd: false, canEdit: false, canDelete: false, canSave: true, canCancel: true });
        showInfo('Edit mode enabled');
    }

    async function handleDelete() {
        const appCore = getAppCore();
        if (!state.currentExitTypeId) {
            showWarning('Please select an exit type first');
            return;
        }

        if (!confirm(`Delete Exit Type '${state.currentExitTypeId}'? This cannot be undone.`)) {
            return;
        }

        showLoading(true);

        try {
            const response = await appCore.invokeControllerAsync('MicroFinance/ExitTypes/delete', {
                BankID: '00',
                ExitTypeID: state.currentExitTypeId,
                NewRecord: state.currentData?.UpdateCount || 0,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId
            });

            console.log('[Delete] Response:', response);

            const deleteOk = (response?.ResponseCode === '00') || response?.Details?.[0] || response?.Details02?.[0];
            if (deleteOk) {
                showSuccess(`Exit Type '${state.currentExitTypeId}' deleted successfully`);
                clearForm();
                state.currentExitTypeId = null;
                state.currentData = null;
                setMode('VIEW');
                setActionButtonsState({ canView: true, canAdd: true, canEdit: false, canDelete: false, canSave: false, canCancel: false });
            } else {
                showError(response?.ResponseMessage || 'Delete failed');
            }
        } catch (error) {
            console.error('[Delete] Error:', error);
            showError('Error deleting exit type: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function handleSave() {
        const appCore = getAppCore();
        if (!validateForm()) {
            showError('Please correct the errors before saving');
            return;
        }

        const formData = captureFormData();
        showLoading(true);

        try {
            const response = await appCore.invokeControllerAsync('MicroFinance/ExitTypes/save', formData);

            console.log('[Save] Request:', formData);
            console.log('[Save] Response:', response);

            // Detect success: API may return ResponseCode, Details, or Details02
            const hasError = response?.ResponseCode && response.ResponseCode !== '00';
            const saveOk = !hasError && (
                response?.ResponseCode === '00' ||
                response?.Details02?.[0] ||
                response?.Details?.[0] ||
                (response && !response.ErrorMessage)
            );
            if (saveOk) {
                const action = state.currentMode === 'NEW' ? 'created' : 'updated';
                showSuccess(`Exit Type ${action} successfully`);
                state.isDirty = false;
                setMode('VIEW');
                setActionButtonsState({ canView: true, canAdd: true, canEdit: true, canDelete: true, canSave: false, canCancel: false });

                // Reload to get updated data
                await handleView();
            } else {
                showError(response?.ResponseMessage || 'Save failed');
            }
        } catch (error) {
            console.error('[Save] Error:', error);
            showError('Error saving exit type: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function handleCancel() {
        if (state.isDirty && !confirm('Discard unsaved changes?')) {
            return;
        }

        if (state.currentData) {
            // Reload current data
            populateForm(state.currentData);
            setMode('VIEW');
            setActionButtonsState({ canView: true, canAdd: true, canEdit: true, canDelete: true, canSave: false, canCancel: false });
        } else {
            clearForm();
            setMode('VIEW');
            setActionButtonsState({ canView: true, canAdd: true, canEdit: false, canDelete: false, canSave: false, canCancel: false });
        }

        state.isDirty = false;
        showInfo('Cancelled');
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM DATA OPERATIONS
    // ═══════════════════════════════════════════════════════════════════

    function populateForm(data, fullResponse) {
        console.log('[PopulateForm] Data:', data, 'Full:', fullResponse);

        const firstNonEmpty = (obj, keys, fallback = '') => {
            if (!obj) return fallback;
            for (const key of keys) {
                const val = obj[key];
                if (val !== undefined && val !== null && String(val).trim() !== '') return val;
            }
            return fallback;
        };

        const findFromResponse = (keys, fallback = '') => {
            const direct = firstNonEmpty(data, keys, '');
            if (direct !== '') return direct;

            if (fullResponse && typeof fullResponse === 'object') {
                for (const val of Object.values(fullResponse)) {
                    if (!Array.isArray(val)) continue;
                    for (const row of val) {
                        const hit = firstNonEmpty(row, keys, '');
                        if (hit !== '') return hit;
                    }
                }
            }

            return fallback;
        };

        // Exit Type Identifiers
        document.getElementById('txt_exitTypeId').value = data.ExitTypeID || '';
        document.getElementById('txt_description').value = data.Description || '';

        // Allow Reinstatement
        document.getElementById('chk_allowReinstate').checked = data.AllowRein || false;
        document.getElementById('chk_reopenAccounts').checked = data.ReopenAccounts || false;
        document.getElementById('chk_moveOtherGroup').checked = data.AllowToMoveOtherGroup || false;
        document.getElementById('chk_chargeOffNotRecovered').checked = data.AllowWithOSWriteoff || false;
        document.getElementById('chk_forfeitNotRecovered').checked = data.AllowWithOSForfeit || false;

        // Exit Restrictions
        document.getElementById('txt_notAllowedAfter').value = data.MaxReinDays || '';
        document.getElementById('txt_withinDays').value = data.ReinDays || '';
        document.getElementById('ddl_withinLevel').value = data.ReinCycleID || '';
        document.getElementById('txt_afterDays').value = data.ReinDays || ''; // Sync with within days
        document.getElementById('ddl_afterLevel').value = data.GraceReinCycleID || '';

        // On Exit Behavior
        document.getElementById('chk_forgoInterest').checked = data.ForgoInterestDue || false;
        document.getElementById('chk_forgoCharges').checked = data.ForgoChargesDue || false;
        document.getElementById('chk_forgoFutureInterest').checked = data.ForgoFutureInterest || false;
        document.getElementById('chk_paySavingInterest').checked = data.PaySavingsInterest || false;
        document.getElementById('chk_forfeitSavings').checked = data.ForfeitSavings || false;
        document.getElementById('chk_closeClient').checked = data.CloseClient || false;

        // On Loan Outstanding
        document.getElementById('chk_forfeitCollateral').checked = data.ForfeitCollaterals || false;
        document.getElementById('chk_chargeOffLoan').checked = data.IsChargeOff || false;
        document.getElementById('chk_writeOffSavings').checked = data.AllowWriteOff || false;
        document.getElementById('ddl_exitChargeOffType').value = data.ExitChargeoffTypeID || '';

        // Behind The Scene
        document.getElementById('txt_currentYearExitForType').value = findFromResponse(['TotalExitCurrDeath', 'CurrentYearExitForType'], '');
        document.getElementById('txt_currentYearTotalExits').value = findFromResponse(['TotalExitCurr', 'CurrentYearTotalExits'], '');
        document.getElementById('txt_previousYearExitForType').value = findFromResponse(['TotalExitPrevDeath', 'PreviousYearExitForType'], '');
        document.getElementById('txt_previousYearTotalExits').value = findFromResponse(['TotalExitPrev', 'PreviousYearTotalExits'], '');
        document.getElementById('txt_createdBy').value = findFromResponse(['CreatedBy', 'Maker'], '');
        document.getElementById('txt_createdOn').value = formatDateForDisplay(findFromResponse(['CreatedOn', 'CreatedDate'], ''));
        document.getElementById('txt_modifiedBy').value = findFromResponse(['ModifiedBy', 'LastModifiedBy'], '');
        document.getElementById('txt_modifiedOn').value = formatDateForDisplay(findFromResponse(['ModifiedOn', 'LastModifiedOn'], ''));
        document.getElementById('txt_supervisedBy').value = findFromResponse(['SupervisedBy', 'AuthorizedBy'], '');
        document.getElementById('txt_supervisedOn').value = formatDateForDisplay(findFromResponse(['SupervisedOn', 'AuthorizedOn'], ''));

        // Update count
        document.getElementById('hdn_updateCount').value = data.UpdateCount || '0';

        // Trigger reinstate change
        handleReinstateChange();
        syncChargeOffTypeEnabled();

        state.isDirty = false;
    }

    function captureFormData() {
        const data = {
            BankID: '00',
            ExitTypeID: document.getElementById('txt_exitTypeId')?.value?.trim() || '',
            Description: document.getElementById('txt_description')?.value?.trim() || '',
            AllowRein: document.getElementById('chk_allowReinstate')?.checked || false,
            ReopenAccounts: document.getElementById('chk_reopenAccounts')?.checked || false,
            AllowToMoveOtherGroup: document.getElementById('chk_moveOtherGroup')?.checked || false,
            AllowWithOSWriteoff: document.getElementById('chk_chargeOffNotRecovered')?.checked || false,
            AllowWithOSForfeit: document.getElementById('chk_forfeitNotRecovered')?.checked || false,
            MaxReinDays: parseInt(document.getElementById('txt_notAllowedAfter')?.value) || 0,
            ReinCycleID: document.getElementById('ddl_withinLevel')?.value || '',
            ReinDays: parseInt(document.getElementById('txt_withinDays')?.value) || 0,
            GraceReinCycleID: document.getElementById('ddl_afterLevel')?.value || '',
            ForgoInterestDue: document.getElementById('chk_forgoInterest')?.checked || false,
            ForgoChargesDue: document.getElementById('chk_forgoCharges')?.checked || false,
            ForgoFutureInterest: document.getElementById('chk_forgoFutureInterest')?.checked || false,
            PaySavingsInterest: document.getElementById('chk_paySavingInterest')?.checked || false,
            ForfeitSavings: document.getElementById('chk_forfeitSavings')?.checked || false,
            CloseClient: document.getElementById('chk_closeClient')?.checked || false,
            ForfeitCollaterals: document.getElementById('chk_forfeitCollateral')?.checked || false,
            IsChargeOff: document.getElementById('chk_chargeOffLoan')?.checked || false,
            AllowWriteOff: document.getElementById('chk_writeOffSavings')?.checked || false,
            ExitChargeoffTypeID: document.getElementById('ddl_exitChargeOffType')?.value || '',
            CreatedBy: state.currentMode === 'NEW' ? state.operatorId : (state.currentData?.CreatedBy || state.operatorId),
            ModifiedBy: state.operatorId,
            NewRecord: state.currentMode === 'NEW' ? 1 : (parseInt(document.getElementById('hdn_updateCount')?.value) || 0)
        };

        console.log('[CaptureFormData]:', data);
        return data;
    }

    function clearForm() {
        const form = document.getElementById('frm_exitTypes');
        form?.reset();

        // Clear readonly fields
        document.getElementById('txt_currentYearExitForType').value = '';
        document.getElementById('txt_currentYearTotalExits').value = '';
        document.getElementById('txt_previousYearExitForType').value = '';
        document.getElementById('txt_previousYearTotalExits').value = '';
        document.getElementById('txt_createdBy').value = '';
        document.getElementById('txt_createdOn').value = '';
        document.getElementById('txt_modifiedBy').value = '';
        document.getElementById('txt_modifiedOn').value = '';
        document.getElementById('txt_supervisedBy').value = '';
        document.getElementById('txt_supervisedOn').value = '';
        document.getElementById('hdn_updateCount').value = '0';

        // Hide nested reinstate section
        const nested = document.getElementById('reinstateNested');
        if (nested) nested.hidden = true;

        state.isDirty = false;
        state.currentData = null;
    }

    // ═══════════════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════════════

    function validateForm() {
        let isValid = true;
        const errors = [];

        // Clear previous validation states
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        // Required: Exit Type ID
        const exitTypeId = document.getElementById('txt_exitTypeId');
        if (!exitTypeId?.value?.trim()) {
            errors.push('Exit Type ID is required');
            exitTypeId?.classList.add('is-invalid');
            isValid = false;
        }

        // Required: Description
        const description = document.getElementById('txt_description');
        if (!description?.value?.trim()) {
            errors.push('Description is required');
            description?.classList.add('is-invalid');
            isValid = false;
        }

        // Validation: Within Days should not exceed Not Allowed After Days (only when both set)
        const notAllowedAfter = parseInt(document.getElementById('txt_notAllowedAfter')?.value) || 0;
        const withinDays = parseInt(document.getElementById('txt_withinDays')?.value) || 0;
        if (notAllowedAfter > 0 && withinDays > notAllowedAfter) {
            errors.push("'Within (Days)' cannot be greater than 'Not Allowed After (Days)'");
            document.getElementById('txt_withinDays')?.classList.add('is-invalid');
            isValid = false;
        }

        if (!isValid) {
            showError(errors.join('\n'));
        }

        return isValid;
    }

    // ═══════════════════════════════════════════════════════════════════
    // MODE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    function setMode(mode) {
        state.currentMode = mode;
        const isViewMode = mode === 'VIEW';

        const form = document.getElementById('frm_exitTypes');

        const exitTypeIdInput = document.getElementById('txt_exitTypeId');
        const exitTypeLookupBtn = document.querySelector('.btn-lookup[data-lookup="ExitTypeID"]');

        // Enable/disable form fields
        form?.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(field => {
            if (!field.hasAttribute('data-always-readonly')) {
                // VIEW mode: allow ID entry only; lock everything else
                if (isViewMode) {
                    field.disabled = field.id !== 'txt_exitTypeId';
                } else {
                    field.disabled = false;
                }
                if (field.type !== 'checkbox') {
                    field.readOnly = isViewMode && field.id !== 'txt_exitTypeId';
                }
            }
        });

        // Exit Type ID rules per mode
        if (exitTypeIdInput) {
            // EDIT: primary key locked. NEW/VIEW: allow typing.
            exitTypeIdInput.disabled = mode === 'EDIT';
            exitTypeIdInput.readOnly = mode === 'EDIT';
        }

        // Lookup buttons: only in VIEW mode (to prevent overwriting during edit/add)
        if (exitTypeLookupBtn) {
            exitTypeLookupBtn.disabled = mode !== 'VIEW';
        }

        // Sync nested controls
        handleReinstateChange();
        syncChargeOffTypeEnabled();

        console.log(`📝 Mode: ${mode}`);
    }

    function setActionButtonsState({ canView = true, canAdd = false, canEdit = false, canDelete = false, canSave = false, canCancel = false } = {}) {
        const viewBtn = document.querySelector('[data-action="view"]');
        const addBtn = document.querySelector('[data-action="add"]');
        const editBtn = document.querySelector('[data-action="edit"]');
        const deleteBtn = document.querySelector('[data-action="delete"]');
        const saveBtn = document.querySelector('[data-action="save"]');
        const cancelBtn = document.querySelector('[data-action="cancel"]');

        if (viewBtn) viewBtn.disabled = !canView;
        if (addBtn) addBtn.disabled = !canAdd;
        if (editBtn) editBtn.disabled = !canEdit;
        if (deleteBtn) deleteBtn.disabled = !canDelete;
        if (saveBtn) saveBtn.disabled = !canSave;
        if (cancelBtn) cancelBtn.disabled = !canCancel;
    }

    // ═══════════════════════════════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function showLoading(show) {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
    }

    function showSuccess(message) {
        const appCore = getAppCore();
        appCore?.showToastMessage?.(message, 'success') || console.log('✅', message);
    }

    function showError(message) {
        const appCore = getAppCore();
        appCore?.showToastMessage?.(message, 'error') || console.error('❌', message);
    }

    function showWarning(message) {
        const appCore = getAppCore();
        appCore?.showToastMessage?.(message, 'warning') || console.warn('⚠️', message);
    }

    function showInfo(message) {
        const appCore = getAppCore();
        appCore?.showToastMessage?.(message, 'info') || console.log('ℹ️', message);
    }

    function formatDateForDisplay(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) return dateString;
            return date.toLocaleString();
        } catch {
            return dateString;
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXPOSE PUBLIC API
    // ═══════════════════════════════════════════════════════════════════

    window.ExitTypesModule = {
        init,
        handleView,
        handleAdd,
        handleEdit,
        handleDelete,
        handleSave,
        handleCancel,
        getState: () => ({ ...state })
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Exit Types module loaded');
})();
