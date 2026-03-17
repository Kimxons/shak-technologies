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
        wireRecordNavigation();
        wireReinstateCheckbox();
        wireChargeOffCheckbox();
        wireWithinDaysSync();
        wireOnTopFeedback();

        // Enforce After(Days) as derived from Within(Days)
        enforceAfterDaysRule();

        // Default mode
        setMode('VIEW');
        setActionButtonsState({ canView: true, canAdd: false, canEdit: false, canDelete: false, canSave: false, canCancel: false });
        setNavButtonsState({ canPrev: false, canNext: false });

        // Auto-load if exitTypeId provided
        const autoLoad = document.getElementById('autoLoad_exitTypes')?.value === 'true';
        const exitTypeId = document.getElementById('exitTypeId_exitTypes')?.value;
        if (autoLoad && exitTypeId) {
            document.getElementById('txt_exitTypeId').value = exitTypeId;
            setTimeout(() => handleView(), 300);
        }

        console.log('✅ Exit Types module initialized', state);
    }

    function wireRecordNavigation() {
        const prevBtn = document.getElementById('btn_prevExitType');
        const nextBtn = document.getElementById('btn_nextExitType');

        prevBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            navigateExitType(-1);
        });

        nextBtn?.addEventListener('click', (e) => {
            e.preventDefault();
            navigateExitType(1);
        });
    }

    function setNavButtonsState({ canPrev = false, canNext = false } = {}) {
        const prevBtn = document.getElementById('btn_prevExitType');
        const nextBtn = document.getElementById('btn_nextExitType');
        if (prevBtn) prevBtn.disabled = !canPrev;
        if (nextBtn) nextBtn.disabled = !canNext;
    }

    function extractExitTypeRecord(response) {
        // OldAPI can return multiple arrays:
        // - Details02: main record when found
        // - Details: sometimes metadata rows
        // - Details01: often year-statistics rows
        // At record navigation boundaries, the API may return ONLY stats/metadata arrays.
        // Treat a row as a valid ExitType record only if it has a non-empty ExitTypeID.
        const candidates = [response?.Details02, response?.Details, response?.Details01];
        for (const arr of candidates) {
            if (!Array.isArray(arr)) continue;
            for (const row of arr) {
                const id = String(row?.ExitTypeID ?? '').trim();
                if (id) return row;
            }
        }
        return null;
    }

    function enforceAfterDaysRule() {
        const withinDaysInput = document.getElementById('txt_withinDays');
        const afterDaysInput = document.getElementById('txt_afterDays');
        if (!withinDaysInput || !afterDaysInput) return;

        // Make After(Days) derived and non-editable in edit/new.
        afterDaysInput.readOnly = true;

        // Keep it in sync immediately.
        afterDaysInput.value = withinDaysInput.value;
    }

    function wireOnTopFeedback() {
        const closeBtn = document.getElementById('exitTypesValidationClose');
        closeBtn?.addEventListener('click', () => hideOnTopMessage());
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
                // Keep enforced read-only behavior
                afterDaysInput.readOnly = true;
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

            const record = extractExitTypeRecord(response);

            if (record) {
                populateForm(record, response);
                state.currentExitTypeId = exitTypeId;
                state.currentData = record;
                setMode('VIEW');
                setActionButtonsState({ canView: false, canAdd: false, canEdit: true, canDelete: true, canSave: false, canCancel: true });
                setNavButtonsState({ canPrev: true, canNext: true });
                showSuccess(`Exit Type '${exitTypeId}' loaded`);
            } else {
                // Not found: clear everything but keep the typed Exit Type ID
                clearForm({ preserveExitTypeId: true });
                state.currentExitTypeId = null;
                state.currentData = null;
                state.isDirty = false;
                setMode('VIEW');

                // Enable Add + Cancel (and allow View retry)
                setActionButtonsState({ canView: false, canAdd: true, canEdit: false, canDelete: false, canSave: false, canCancel: true });
                setNavButtonsState({ canPrev: false, canNext: false });
                showError('Exit Type Details not Found');
            }
        } catch (error) {
            console.error('[View] Error:', error);
            showError('Error loading exit type: ' + error.message);
            setActionButtonsState({ canView: true, canAdd: false, canEdit: false, canDelete: false, canSave: false, canCancel: false });
            setNavButtonsState({ canPrev: false, canNext: false });
        } finally {
            showLoading(false);
        }
    }

    async function navigateExitType(direction) {
        const appCore = getAppCore();
        if (!appCore) return;

        const boundaryMessage = direction > 0
            ? 'You have reached the Last Record'
            : 'You have reached the First Record';

        if (state.currentMode !== 'VIEW') {
            showWarning('Please save or cancel changes before navigating');
            return;
        }

        if (state.isDirty && !confirm('Discard unsaved changes?')) {
            return;
        }

        const baseExitTypeId = String(state.currentExitTypeId || document.getElementById('txt_exitTypeId')?.value || '').trim();
        if (!baseExitTypeId) {
            showWarning('Please load an Exit Type first before navigating');
            return;
        }

        showLoading(true);
        try {
            const response = await appCore.invokeControllerAsync('MicroFinance/ExitTypes/get', {
                ExitTypeID: baseExitTypeId,
                OurBranchID: state.branchId,
                BankID: '00',
                OperatorID: state.operatorId,
                Direction: direction
            });

            console.log('[Navigate] Response:', response);
            const record = extractExitTypeRecord(response);

            if (record) {
                const resolvedExitTypeId = String(record.ExitTypeID || '').trim() || baseExitTypeId;
                const isSameRecord = resolvedExitTypeId.toLowerCase() === baseExitTypeId.toLowerCase();

                document.getElementById('txt_exitTypeId').value = resolvedExitTypeId;

                // Even if the API returns the same record at boundaries, keep the UI consistent.
                populateForm(record, response);
                state.currentExitTypeId = resolvedExitTypeId;
                state.currentData = record;
                state.isDirty = false;

                setMode('VIEW');
                setActionButtonsState({ canView: false, canAdd: false, canEdit: true, canDelete: true, canSave: false, canCancel: true });
                setNavButtonsState({ canPrev: true, canNext: true });

                if (isSameRecord) {
                    showInfo(boundaryMessage);
                } else {
                    showSuccess(`Exit Type '${state.currentExitTypeId}' loaded`);
                }
            } else {
                showInfo(boundaryMessage);
            }
        } catch (error) {
            console.error('[Navigate] Error:', error);
            showError('Error navigating exit types: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function handleAdd() {
        if (state.isDirty && !confirm('Discard unsaved changes?')) {
            return;
        }

        // Requirement: when clicking Add, do not clear the typed Exit Type ID (e.g. after a Not Found View)
        clearForm({ preserveExitTypeId: true });

        const exitTypeIdEl = document.getElementById('txt_exitTypeId');
        if (exitTypeIdEl) {
            exitTypeIdEl.disabled = false;
            exitTypeIdEl.readOnly = false;
        }

        // Focus Description first (identifiers/description section)
        const descriptionEl = document.getElementById('txt_description');
        const identifiersSection = descriptionEl?.closest('.form-section');
        identifiersSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => descriptionEl?.focus(), 0);
        state.currentExitTypeId = null;
        state.currentData = null;
        setMode('NEW');
        setActionButtonsState({ canView: false, canAdd: false, canEdit: false, canDelete: false, canSave: true, canCancel: true });
        setNavButtonsState({ canPrev: false, canNext: false });
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
        setNavButtonsState({ canPrev: false, canNext: false });

        // Send user to the identifiers section to start editing immediately
        const descriptionEl = document.getElementById('txt_description');
        const identifiersSection = descriptionEl?.closest('.form-section');
        identifiersSection?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        setTimeout(() => descriptionEl?.focus(), 0);

        showInfo('Edit mode enabled');
    }

    async function handleDelete() {
        const appCore = getAppCore();
        if (!state.currentExitTypeId) {
            showWarning('Please select an exit type first');
            return;
        }

        const confirmed = await confirmDeleteExitType(state.currentExitTypeId);
        if (!confirmed) {
            // Requirement: No / Close (X) should leave only Edit + Cancel enabled
            setMode('VIEW');
            setActionButtonsState({ canView: false, canAdd: false, canEdit: true, canDelete: false, canSave: false, canCancel: true });
            setNavButtonsState({ canPrev: true, canNext: true });
            return;
        }

        showLoading(true);

        try {
            const response = await appCore.invokeControllerAsync('MicroFinance/ExitTypes/delete', {
                // IMPORTANT: p_DeleteExitTypes signature is strict; do not send extra fields.
                // Align with legacy implementation: BankID + ExitTypeID + NewRecord (optimistic lock token).
                BankID: '00',
                ExitTypeID: state.currentExitTypeId,
                NewRecord: state.currentData?.UpdateCount ?? 0
            });

            console.log('[Delete] Response:', response);

            const deleteOk = isApiSuccessResponse(response);
            if (deleteOk) {
                const deletedId = state.currentExitTypeId;
                // After delete: clear everything back to initial form load
                clearForm();
                state.currentExitTypeId = null;
                state.currentData = null;
                state.isDirty = false;

                setMode('VIEW');
                setActionButtonsState({ canView: true, canAdd: false, canEdit: false, canDelete: false, canSave: false, canCancel: false });
                setNavButtonsState({ canPrev: false, canNext: false });
                document.getElementById('txt_exitTypeId')?.focus();
                showSuccess(`Exit Type '${deletedId}' deleted successfully`);
            } else {
                showError(getApiErrorMessage(response, 'Delete failed'));
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
        const validation = validateForm();
        if (!validation.isValid) {
            showError((validation.errors || []).join('\n') || 'Please correct the errors before saving');
            validation.firstInvalidEl?.focus?.();
            validation.firstInvalidEl?.scrollIntoView?.({ behavior: 'smooth', block: 'center' });
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
                // Per workflow requirement: after Save, reset back to initial form load state
                clearForm();
                state.currentExitTypeId = null;
                state.currentData = null;
                state.isDirty = false;

                setMode('VIEW');
                setActionButtonsState({ canView: true, canAdd: false, canEdit: false, canDelete: false, canSave: false, canCancel: false });
                setNavButtonsState({ canPrev: false, canNext: false });
                document.getElementById('txt_exitTypeId')?.focus();
                showSuccess('Data saved successfully');
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

        // Reset to initial form load state
        clearForm();
        state.currentExitTypeId = null;
        state.currentData = null;
        state.isDirty = false;

        setMode('VIEW');
        setActionButtonsState({ canView: true, canAdd: false, canEdit: false, canDelete: false, canSave: false, canCancel: false });
        setNavButtonsState({ canPrev: false, canNext: false });

        // Set focus for quick next action
        document.getElementById('txt_exitTypeId')?.focus();
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
        const setBts = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;

            const isEmpty = val === undefined || val === null || val === '';
            el.textContent = isEmpty ? '-' : String(val);
        };
        setBts('txt_currentYearExitForType', findFromResponse(['TotalExitCurrDeath', 'CurrentYearExitForType'], ''));
        setBts('txt_currentYearTotalExits', findFromResponse(['TotalExitCurr', 'CurrentYearTotalExits'], ''));
        setBts('txt_previousYearExitForType', findFromResponse(['TotalExitPrevDeath', 'PreviousYearExitForType'], ''));
        setBts('txt_previousYearTotalExits', findFromResponse(['TotalExitPrev', 'PreviousYearTotalExits'], ''));
        setBts('txt_createdBy', findFromResponse(['CreatedBy', 'Maker'], ''));
        setBts('txt_createdOn', formatDateForDisplay(findFromResponse(['CreatedOn', 'CreatedDate'], '')));
        setBts('txt_modifiedBy', findFromResponse(['ModifiedBy', 'LastModifiedBy'], ''));
        setBts('txt_modifiedOn', formatDateForDisplay(findFromResponse(['ModifiedOn', 'LastModifiedOn'], '')));
        setBts('txt_supervisedBy', findFromResponse(['SupervisedBy', 'AuthorizedBy'], ''));
        setBts('txt_supervisedOn', formatDateForDisplay(findFromResponse(['SupervisedOn', 'AuthorizedOn'], '')));

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

    function clearForm({ preserveExitTypeId = false } = {}) {
        const form = document.getElementById('frm_exitTypes');
        const existingExitTypeId = preserveExitTypeId ? (document.getElementById('txt_exitTypeId')?.value || '') : '';
        form?.reset();

        hideOnTopMessage();

        if (preserveExitTypeId) {
            const idEl = document.getElementById('txt_exitTypeId');
            if (idEl) idEl.value = existingExitTypeId;
        }

        // Clear any validation state
        document.querySelectorAll('#frm_exitTypes .is-invalid').forEach(el => el.classList.remove('is-invalid'));

        // Clear behind-the-scene span fields
        ['txt_currentYearExitForType', 'txt_currentYearTotalExits', 'txt_previousYearExitForType',
         'txt_previousYearTotalExits', 'txt_createdBy', 'txt_createdOn', 'txt_modifiedBy',
         'txt_modifiedOn', 'txt_supervisedBy', 'txt_supervisedOn'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
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
        let firstInvalidEl = null;

        const readNonNegativeInt = (fieldId, label, { allowEmpty = true } = {}) => {
            const el = document.getElementById(fieldId);
            const raw = String(el?.value ?? '').trim();

            if (!el) return { ok: true, value: 0, el: null };

            if (raw === '') {
                if (allowEmpty) return { ok: true, value: 0, el };
                return { ok: false, value: 0, el, error: `${label} is required` };
            }

            // Reject negatives, decimals, scientific notation, etc. Only allow digits.
            if (!/^[0-9]+$/.test(raw)) {
                return { ok: false, value: 0, el, error: `${label} must be a whole number (0 or greater)` };
            }

            const n = Number(raw);
            if (!Number.isFinite(n) || n < 0) {
                return { ok: false, value: 0, el, error: `${label} must be 0 or greater` };
            }

            return { ok: true, value: n, el };
        };

        // Clear previous validation states
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        // Required: Exit Type ID
        const exitTypeId = document.getElementById('txt_exitTypeId');
        if (!exitTypeId?.value?.trim()) {
            errors.push('Exit Type ID is required');
            exitTypeId?.classList.add('is-invalid');
            if (!firstInvalidEl) firstInvalidEl = exitTypeId;
            isValid = false;
        }

        // Required: Description
        const description = document.getElementById('txt_description');
        if (!description?.value?.trim()) {
            errors.push('Description is required');
            description?.classList.add('is-invalid');
            if (!firstInvalidEl) firstInvalidEl = description;
            isValid = false;
        }

        // Numeric fields: must be non-negative whole numbers when provided
        const notAllowedAfterRes = readNonNegativeInt('txt_notAllowedAfter', 'Not Allowed After (Days)');
        if (!notAllowedAfterRes.ok) {
            errors.push(notAllowedAfterRes.error);
            notAllowedAfterRes.el?.classList.add('is-invalid');
            if (!firstInvalidEl) firstInvalidEl = notAllowedAfterRes.el;
            isValid = false;
        }

        // Business rule: Not allowed After (Days) must be strictly more than 0
        if (notAllowedAfterRes.ok && notAllowedAfterRes.value <= 0) {
            errors.push("'Not allowed After (Days)' must be more than 0");
            notAllowedAfterRes.el?.classList.add('is-invalid');
            if (!firstInvalidEl) firstInvalidEl = notAllowedAfterRes.el;
            isValid = false;
        }

        const withinDaysRes = readNonNegativeInt('txt_withinDays', 'Within (Days)');
        if (!withinDaysRes.ok) {
            errors.push(withinDaysRes.error);
            withinDaysRes.el?.classList.add('is-invalid');
            if (!firstInvalidEl) firstInvalidEl = withinDaysRes.el;
            isValid = false;
        }

        // Business rule: Within (Days) must be strictly more than 0
        if (withinDaysRes.ok && withinDaysRes.value <= 0) {
            errors.push("'Within (Days)' must be more than 0");
            withinDaysRes.el?.classList.add('is-invalid');
            if (!firstInvalidEl) firstInvalidEl = withinDaysRes.el;
            isValid = false;
        }

        const afterDaysRes = readNonNegativeInt('txt_afterDays', 'After (Days)');
        if (!afterDaysRes.ok) {
            errors.push(afterDaysRes.error);
            afterDaysRes.el?.classList.add('is-invalid');
            if (!firstInvalidEl) firstInvalidEl = afterDaysRes.el;
            isValid = false;
        }

        // Business rule: After (Days) must be strictly more than 0
        // (Avoid duplicate errors when Within is already failing and After is derived from it.)
        if (afterDaysRes.ok && afterDaysRes.value <= 0 && !(withinDaysRes.ok && withinDaysRes.value <= 0)) {
            errors.push("'After (Days)' must be more than 0");
            afterDaysRes.el?.classList.add('is-invalid');
            if (!firstInvalidEl) firstInvalidEl = afterDaysRes.el;
            isValid = false;
        }

        // After (Days) is derived from Within (Days) and must always match.
        if (withinDaysRes.ok && afterDaysRes.ok && withinDaysRes.value !== afterDaysRes.value) {
            errors.push("'After (Days)' must be equal to 'Within (Days)'");
            afterDaysRes.el?.classList.add('is-invalid');
            if (!firstInvalidEl) firstInvalidEl = afterDaysRes.el;
            isValid = false;
        }

        // Validation: Within Days should not exceed Not Allowed After Days
        const notAllowedAfter = notAllowedAfterRes.value || 0;
        const withinDays = withinDaysRes.value || 0;
        if (withinDaysRes.ok && notAllowedAfterRes.ok && withinDays > notAllowedAfter) {
            errors.push("'Within (Days)' cannot be greater than 'Not Allowed After (Days)'");
            document.getElementById('txt_withinDays')?.classList.add('is-invalid');
            if (!firstInvalidEl) firstInvalidEl = document.getElementById('txt_withinDays');
            isValid = false;
        }

        // Required: Loan level reinstatement selections
        const withinLevelEl = document.getElementById('ddl_withinLevel');
        const afterLevelEl = document.getElementById('ddl_afterLevel');
        const withinLevelVal = String(withinLevelEl?.value ?? '').trim();
        const afterLevelVal = String(afterLevelEl?.value ?? '').trim();
        if (withinLevelEl && afterLevelEl && (withinLevelVal === '' || afterLevelVal === '')) {
            errors.push('Please select Loan level reinstatement');

            if (withinLevelVal === '') withinLevelEl.classList.add('is-invalid');
            if (afterLevelVal === '') afterLevelEl.classList.add('is-invalid');

            if (!firstInvalidEl) firstInvalidEl = withinLevelVal === '' ? withinLevelEl : afterLevelEl;
            isValid = false;
        }

        // Cross-field rule: Within Level cannot be From First Level if After Level is not From First Level.
        // Also: do not allow choosing After(Days) level as From Next Level.
        const levelKind = (selectEl) => {
            if (!selectEl) return '';
            const text = String(selectEl.selectedOptions?.[0]?.text ?? '').trim().toLowerCase();
            const value = String(selectEl.value ?? '').trim().toLowerCase();
            const raw = text || value;
            if (raw.includes('first')) return 'first';
            if (raw.includes('next')) return 'next';
            return raw;
        };

        if (withinLevelEl && afterLevelEl && withinLevelVal !== '' && afterLevelVal !== '') {
            const withinKind = levelKind(withinLevelEl);
            const afterKind = levelKind(afterLevelEl);

            // If Within Level is First Level, After Level must also be First Level.
            if (withinKind === 'first' && afterKind !== 'first') {
                errors.push('After(Days) should be chosen as First level');
                afterLevelEl.classList.add('is-invalid');
                if (!firstInvalidEl) firstInvalidEl = afterLevelEl;
                isValid = false;
            } else if (afterKind === 'next') {
                // Generic block: do not allow After(Days) as Next level.
                errors.push('Cannot choose After(Days) as Next level,');
                afterLevelEl.classList.add('is-invalid');
                if (!firstInvalidEl) firstInvalidEl = afterLevelEl;
                isValid = false;
            }
        }

        return { isValid, errors, firstInvalidEl };
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

        // Record navigation: only when a record is loaded and in VIEW.
        const canNavigate = mode === 'VIEW' && !!state.currentData && !!state.currentExitTypeId;
        setNavButtonsState({ canPrev: canNavigate, canNext: canNavigate });

        // Sync nested controls
        handleReinstateChange();
        syncChargeOffTypeEnabled();

        // Enforce derived After(Days) rule for all modes.
        // (In VIEW mode the generic logic disables it anyway.)
        enforceAfterDaysRule();

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

    function isApiSuccessResponse(response) {
        if (!response || typeof response !== 'object') return false;

        if (response.success === true || response.Success === true) return true;

        const responseCode = response.ResponseCode;
        if (responseCode === '00' || responseCode === '000' || responseCode === 0) return true;

        const status = response.Status;
        if (status === '00' || status === '000' || status === 0) return true;

        // Some OldAPI procedures return only { Details: [] } on success.
        // Treat that as success unless an explicit error is present.
        const hasExplicitError = !!(response.ErrorMessage || response.error || response.errors);
        const hasFailureStatus = status !== undefined && status !== null && String(status) !== '' && String(status) !== '00' && String(status) !== '000' && String(status) !== '0';
        if (hasExplicitError || hasFailureStatus) return false;

        if (Object.prototype.hasOwnProperty.call(response, 'Details') && Array.isArray(response.Details)) return true;
        if (Object.prototype.hasOwnProperty.call(response, 'Details01') && Array.isArray(response.Details01)) return true;
        if (Object.prototype.hasOwnProperty.call(response, 'Details02') && Array.isArray(response.Details02)) return true;

        return false;
    }

    function getApiErrorMessage(response, fallback) {
        if (!response || typeof response !== 'object') return fallback;
        return response.ResponseMessage || response.Message || response.message || response.ErrorMessage || fallback;
    }

    function confirmDeleteExitType(exitTypeId) {
        return new Promise((resolve) => {
            const modal = document.getElementById('exitTypesDeleteConfirmModal');
            const idEl = document.getElementById('exitTypesDeleteConfirmId');
            const btnYes = document.getElementById('exitTypesDeleteConfirmYes');
            const btnNo = document.getElementById('exitTypesDeleteConfirmNo');
            const btnClose = document.getElementById('exitTypesDeleteConfirmClose');
            const backdrop = modal?.querySelector('[data-confirm-backdrop]');

            if (!modal || !idEl || !btnYes || !btnNo || !btnClose) {
                // Fallback to native confirm if modal markup is missing
                resolve(confirm(`Delete Exit Type '${exitTypeId}'? This cannot be undone.`));
                return;
            }

            idEl.textContent = `'${exitTypeId}'`;
            modal.hidden = false;

            const cleanup = () => {
                modal.hidden = true;
                btnYes.removeEventListener('click', onYes);
                btnNo.removeEventListener('click', onNo);
                btnClose.removeEventListener('click', onNo);
                backdrop?.removeEventListener('click', onNo);
                document.removeEventListener('keydown', onKeyDown, true);
            };

            const onYes = () => {
                cleanup();
                resolve(true);
            };

            const onNo = () => {
                cleanup();
                resolve(false);
            };

            const onKeyDown = (e) => {
                if (e.key === 'Escape') {
                    e.preventDefault();
                    onNo();
                }
            };

            btnYes.addEventListener('click', onYes);
            btnNo.addEventListener('click', onNo);
            btnClose.addEventListener('click', onNo);
            backdrop?.addEventListener('click', onNo);
            document.addEventListener('keydown', onKeyDown, true);

            // Focus Yes button by default
            setTimeout(() => btnYes.focus(), 0);
        });
    }

    function showLoading(show) {
        const overlay = document.getElementById('pageLoadingOverlay');
        if (overlay) overlay.style.display = show ? 'flex' : 'none';
    }

    function showOnTopMessage(type, message) {
        const summary = document.getElementById('exitTypesValidationSummary');
        const iconEl = document.getElementById('exitTypesValidationIcon');
        const textEl = document.getElementById('exitTypesValidationText');
        if (!summary || !iconEl || !textEl) return;

        const normalizedType = String(type || 'info').toLowerCase();
        const isSuccess = normalizedType === 'success';

        summary.classList.toggle('validation-summary--success', isSuccess);
        summary.classList.add('is-visible');
        summary.style.display = '';
        textEl.textContent = message || '';

        const iconClassByType = {
            success: 'bi bi-check-circle validation-summary__icon',
            error: 'bi bi-exclamation-circle validation-summary__icon',
            warning: 'bi bi-exclamation-triangle validation-summary__icon',
            info: 'bi bi-info-circle validation-summary__icon'
        };
        iconEl.className = iconClassByType[normalizedType] || iconClassByType.error;

        summary.setAttribute('role', isSuccess ? 'status' : 'alert');

        // Keep the message visible on top even when scrolled
        summary.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    function hideOnTopMessage() {
        const summary = document.getElementById('exitTypesValidationSummary');
        const iconEl = document.getElementById('exitTypesValidationIcon');
        const textEl = document.getElementById('exitTypesValidationText');
        if (!summary || !iconEl || !textEl) return;

        textEl.textContent = '';
        summary.classList.remove('is-visible');
        summary.classList.remove('validation-summary--success');
        summary.style.display = 'none';
        iconEl.className = 'bi bi-exclamation-circle validation-summary__icon';
    }

    function showSuccess(message) {
        const appCore = getAppCore();
        showOnTopMessage('success', message);
        appCore?.showToastMessage?.(message, 'success') || console.log('✅', message);
    }

    function showError(message) {
        const appCore = getAppCore();
        showOnTopMessage('error', message);
        appCore?.showToastMessage?.(message, 'error') || console.error('❌', message);
    }

    function showWarning(message) {
        const appCore = getAppCore();
        showOnTopMessage('warning', message);
        appCore?.showToastMessage?.(message, 'warning') || console.warn('⚠️', message);
    }

    function showInfo(message) {
        const appCore = getAppCore();
        showOnTopMessage('info', message);
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
