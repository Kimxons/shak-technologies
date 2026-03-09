/**
 * Standing Instruction Transfer Module
 * Migrated from: public/modules/AccountUtilities/standing-instruction-transfer.html
 *
 * Uses: AppCore.invokeControllerAsync (POST) for ALL API calls
 * Lookups: SearchModal for Account, StandingInstruction, TransferCurrency,
 *          BeneficiaryBranch, BeneficiaryAccount
 * Dropdowns: SI Type, Amount In, Charge Recovery, Transfer Frequency,
 *            Beneficiary Account Type — loaded client-side via get-dropdown-options
 *
 * Field layout matches legacy:
 *   Account Details: Branch (readonly), Account ID (lookup)
 *   SI Details: Standing Instruction ID, Reference No, SI Type, Effective Date
 *   Transfer Details: Transfer Currency ID, Amount In, Fixed Amount, Charge Recovery
 *   Frequency & Execution: Transfer Frequency, No Of Executions, Reg Execution Day,
 *                          First/Last Execution Date
 *   Beneficiary: Branch (lookup), Account Type, Account ID (lookup)
 *   Behind The Scene: readonly status fields
 *   Audit Trail: Created/Stopped/Supervised/Modified
 */
(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    const state = {
        currentId: null,         // Current standing instruction account ID
        branchId: null,
        branchName: null,
        operatorId: null,
        currentMode: 'VIEW',     // VIEW, EDIT, NEW
        isDirty: false,
        moduleId: null
    };

    // SearchModal instance
    let searchModal = null;

    // ═══════════════════════════════════════════════════════════════════
    // LOOKUP CONFIGURATION (for SearchModal)
    // ═══════════════════════════════════════════════════════════════════

    const LOOKUP_CONFIG = {
        'AccountID': {
            tableID: 'AccountID',
            displayField: 'txt_accountName',
            valueField: 'txt_accountId',
            displayColumn: 'AccountName',
            valueColumn: 'AccountID',
            whereStmt: ''
        },
        'StandingInstructionID': {
            tableID: 'InstructionID',
            displayField: 'txt_standingInstructionName',
            valueField: 'txt_standingInstructionId',
            displayColumn: 'AccountName',
            valueColumn: 'SIID',
            advFilter: true
        },
        'TransferCurrencyID': {
            tableID: 'CurrencyID',
            displayField: 'txt_transferCurrencyName',
            valueField: 'txt_transferCurrencyId',
            displayColumn: 'CurrencyName',
            valueColumn: 'CurrencyID',
            whereStmt: ''
        },
        'BeneficiaryBranchID': {
            tableID: 'BranchID',
            displayField: 'txt_beneficiaryBranchName',
            valueField: 'txt_beneficiaryBranchId',
            displayColumn: 'BranchName',
            valueColumn: 'BranchID',
            whereStmt: ''
        },
        'BeneficiaryAccountID': {
            tableID: 'AccountID',
            displayField: 'txt_beneficiaryAccountName',
            valueField: 'txt_beneficiaryAccountId',
            displayColumn: 'AccountName',
            valueColumn: 'AccountID',
            whereStmt: ''
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    async function init() {
        console.log('🚀 Initializing Standing Instruction Transfer module...');

        loadContext();
        searchModal = new SearchModal(window.AppCore);

        wireSectionToggles();
        wireLookupButtons();
        wireActionButtons();
        wireFormEvents();

        // Pre-fill branch from logged-in session
        if (state.branchId) {
            setFieldValue('txt_branchId', state.branchId);
        }
        if (state.branchName) {
            setFieldValue('txt_branchName', state.branchName);
        }
        console.log('📋 [SIT] Branch fields set → ID:', state.branchId || '(empty)', '| Name:', state.branchName || '(empty)');

        // Load dropdowns via API
        await loadDropdowns();

        // Start in VIEW mode
        setMode('VIEW');

        // Wire signatory print button
        wireSignatoryPrint();

        // Auto-load if entityId is provided
        const autoLoad = document.getElementById('entityId_sit')?.value;
        if (autoLoad) {
            loadRecord(autoLoad);
        }

        console.log('✅ Standing Instruction Transfer module initialized');
    }

    // ═══════════════════════════════════════════════════════════════════
    // DROPDOWN LOADING
    // ═══════════════════════════════════════════════════════════════════

    async function loadDropdowns() {
        try {
            // Load all dropdowns in parallel (Amount In is hardcoded in the view)
            const [siTypeOpts, chargeRecOpts, freqOpts, acctTypeOpts] = await Promise.all([
                fetchDropdownOptions('SITypeID').catch(() => []),
                fetchDropdownOptions('SIChargeTypeID').catch(() => []),
                fetchDropdownOptions('TrfFrequencyID').catch(() => []),
                fetchDropdownOptions('AccountTypeID').catch(() => [])
            ]);

            populateSelect('ddl_siType', siTypeOpts, '--Select--');
            populateSelect('ddl_chargeRecovery', chargeRecOpts, '--Select--');
            populateSelect('ddl_transferFrequency', freqOpts, '--Select--');
            populateSelect('ddl_beneficiaryAccountType', acctTypeOpts, '--Select--');

            console.log('✅ [SIT] Dropdowns loaded:', {
                siType: siTypeOpts.length,
                chargeRecovery: chargeRecOpts.length,
                transferFrequency: freqOpts.length,
                beneficiaryAccountType: acctTypeOpts.length
            });
        } catch (err) {
            console.error('❌ [SIT] Failed to load dropdowns:', err);
        }
    }

    async function fetchDropdownOptions(codeId, valueField) {
        let url = `/AccountUtilities/StandingInstructionTransfer/get-dropdown-options?codeId=${encodeURIComponent(codeId)}`;
        if (valueField) url += `&valueField=${encodeURIComponent(valueField)}`;
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        if (!result.success) throw new Error(result.message || 'Failed to load options');
        return result.data || [];
    }

    function populateSelect(selectId, options, placeholder) {
        const select = document.getElementById(selectId);
        if (!select) return;
        select.innerHTML = `<option value="">${placeholder || '--Select--'}</option>`;
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // CONTEXT LOADING
    // ═══════════════════════════════════════════════════════════════════

    function loadContext() {
        state.moduleId = document.getElementById('moduleId_sit')?.value || '100';

        // PRIMARY: Read from server-injected hidden fields
        const serverBranch = document.getElementById('sessionBranchCode_sit')?.value || '';
        const serverBranchName = document.getElementById('sessionBranchName_sit')?.value || '';
        const serverOperator = document.getElementById('sessionOperatorId_sit')?.value || '';

        // FALLBACK: Try localStorage session
        let session = null;
        try {
            const raw = localStorage.getItem('nimble_auth_session');
            session = raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn('[SIT] Failed to parse localStorage session:', e);
        }

        // Resolve with fallback chain
        state.branchId = serverBranch || session?.branchID || '';
        state.branchName = serverBranchName || session?.selectedBranchName || '';
        state.operatorId = serverOperator || session?.operatorID || '';

        console.log('📦 [SIT] Context loaded:', {
            moduleId: state.moduleId,
            branchId: state.branchId,
            branchName: state.branchName,
            operatorId: state.operatorId,
            source: serverBranch ? 'server session (ViewData)' : session ? 'localStorage' : 'none'
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // SECTION TOGGLES
    // ═══════════════════════════════════════════════════════════════════

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const icon = header.querySelector('.section-toggle-btn i');

                if (content) {
                    const isHidden = content.style.display === 'none';
                    content.style.display = isHidden ? '' : 'none';
                    if (icon) {
                        icon.className = isHidden ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
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

        console.log('[SIT] Opening lookup:', lookupKey, '→ tableID:', config.tableID, '| moduleID:', state.moduleId, '| branchId:', state.branchId);

        // Create fresh instance per lookup to avoid stale state
        const modal = new SearchModal(window.AppCore);

        // Build AdvFilterString for branch-scoped searches (e.g. InstructionID)
        const advFilter = config.advFilter ? `OurBranchID = '${state.branchId}'` : '';

        modal.open({
            tableID: config.tableID,
            moduleID: state.moduleId,
            whereStmt: config.whereStmt || '',
            advFilterString: advFilter,
            ourbranchId: state.branchId,
            onSelect: (row) => {
                console.log('[Lookup] Selected:', lookupKey, row);

                const displayField = document.getElementById(config.displayField);
                if (displayField) {
                    displayField.value = row[config.displayColumn] || Object.values(row)[1] || '';
                }

                const valueField = document.getElementById(config.valueField);
                if (valueField) {
                    valueField.value = row[config.valueColumn] || Object.values(row)[0] || '';
                }

                state.isDirty = true;

                // When Account ID is selected, show Signature/Photo popup
                if (lookupKey === 'AccountID') {
                    const selectedAccountId = row[config.valueColumn] || Object.values(row)[0] || '';
                    if (selectedAccountId) {
                        showSignatoryPopup(selectedAccountId);
                    }
                }
            }
        }).catch(err => {
            console.error('[SIT] SearchModal open failed for', lookupKey, err);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // ACTION BUTTONS
    // ═══════════════════════════════════════════════════════════════════

    function wireActionButtons() {
        document.querySelector('[data-action="view"]')?.addEventListener('click', () => {
            const accountId = document.getElementById('txt_accountId')?.value;
            if (accountId) {
                loadRecord(accountId);
            } else {
                showWarning('Enter or select an Account ID first');
            }
        });

        document.querySelector('[data-action="add"]')?.addEventListener('click', () => {
            clearForm();
            setMode('NEW');

            // Pre-fill branch from session
            if (state.branchId) {
                setFieldValue('txt_branchId', state.branchId);
            }
            if (state.branchName) {
                setFieldValue('txt_branchName', state.branchName);
            }

            document.getElementById('txt_accountId')?.focus();
        });

        document.querySelector('[data-action="edit"]')?.addEventListener('click', () => {
            if (!state.currentId) {
                showWarning('Please load a record first');
                return;
            }
            setMode('EDIT');
            document.getElementById('ddl_siType')?.focus();
        });

        document.querySelector('[data-action="save"]')?.addEventListener('click', () => {
            saveRecord();
        });

        document.querySelector('[data-action="delete"]')?.addEventListener('click', () => {
            deleteRecord();
        });

        document.querySelector('[data-action="stop"]')?.addEventListener('click', () => {
            stopRecord();
        });

        document.querySelector('[data-action="cancel"]')?.addEventListener('click', () => {
            if (state.isDirty && !confirm('You have unsaved changes. Discard?')) {
                return;
            }
            if (state.currentId) {
                loadRecord(state.currentId);
            } else {
                clearForm();
            }
            setMode('VIEW');
        });

        document.querySelector('[data-action="print"]')?.addEventListener('click', () => {
            window.print();
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM EVENTS (dirty tracking)
    // ═══════════════════════════════════════════════════════════════════

    function wireFormEvents() {
        const form = document.getElementById('frm_sit');
        form?.querySelectorAll('input, select, textarea').forEach(field => {
            field.addEventListener('change', () => {
                if (state.currentMode !== 'VIEW') {
                    state.isDirty = true;
                }
            });
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // CRUD OPERATIONS - ALL USE invokeControllerAsync (POST)
    // ═══════════════════════════════════════════════════════════════════

    async function loadRecord(accountId) {
        showLoading(true);

        try {
            const response = await AppCore.invokeControllerAsync(
                'AccountUtilities/StandingInstructionTransfer/get',
                {
                    AccountID: accountId,
                    ModuleID: state.moduleId,
                    OurBranchID: state.branchId
                }
            );

            if (response?.success && response.data) {
                populateForm(response.data);
                state.currentId = accountId;
                setMode('VIEW');
                showSuccess('Record loaded');
            } else {
                showError(response?.message || 'Failed to load record');
            }
        } catch (error) {
            console.error('Load error:', error);
            showError('Error loading record: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function saveRecord() {
        if (!validateForm()) {
            showError('Please correct the errors before saving');
            return;
        }

        const formData = captureFormData();
        formData.ActionMode = state.currentMode === 'NEW' ? 'ADD' : 'EDIT';

        showLoading(true);

        try {
            const response = await AppCore.invokeControllerAsync(
                'AccountUtilities/StandingInstructionTransfer/save',
                formData
            );

            if (response?.success) {
                showSuccess(state.currentMode === 'NEW' ? 'Created successfully' : 'Updated successfully');
                state.isDirty = false;
                setMode('VIEW');

                // Reload the record if we have an ID
                if (response.data?.StandingInstructionID) {
                    state.currentId = response.data.StandingInstructionID;
                }
            } else {
                showError(response?.message || 'Save failed');
            }
        } catch (error) {
            console.error('Save error:', error);
            showError('Error saving: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function deleteRecord() {
        if (!state.currentId) {
            showWarning('Please load a record first');
            return;
        }

        if (!confirm('Are you sure you want to delete this standing instruction?')) {
            return;
        }

        showLoading(true);

        try {
            const response = await AppCore.invokeControllerAsync(
                'AccountUtilities/StandingInstructionTransfer/delete',
                {
                    AccountID: state.currentId,
                    ModuleID: state.moduleId,
                    OurBranchID: state.branchId
                }
            );

            if (response?.success) {
                showSuccess('Deleted successfully');
                clearForm();
                state.currentId = null;
                setMode('VIEW');
            } else {
                showError(response?.message || 'Delete failed');
            }
        } catch (error) {
            console.error('Delete error:', error);
            showError('Error deleting: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function stopRecord() {
        if (!state.currentId) {
            showWarning('Please load a record first');
            return;
        }

        if (!confirm('Are you sure you want to stop this standing instruction?')) {
            return;
        }

        showLoading(true);

        try {
            const response = await AppCore.invokeControllerAsync(
                'AccountUtilities/StandingInstructionTransfer/stop',
                {
                    AccountID: state.currentId,
                    ModuleID: state.moduleId,
                    OurBranchID: state.branchId
                }
            );

            if (response?.success) {
                showSuccess('Standing instruction stopped');
                loadRecord(state.currentId);
            } else {
                showError(response?.message || 'Stop failed');
            }
        } catch (error) {
            console.error('Stop error:', error);
            showError('Error stopping: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // FORM DATA OPERATIONS
    // ═══════════════════════════════════════════════════════════════════

    function populateForm(data) {
        const form = document.getElementById('frm_sit');
        if (!form) return;

        // Account Details
        setFieldValue('txt_branchId', data.BranchID || data.OurBranchID);
        setFieldValue('txt_branchName', data.BranchName);
        setFieldValue('txt_accountId', data.AccountID);
        setFieldValue('txt_accountName', data.AccountName);

        // Standing Instruction Details
        setFieldValue('txt_standingInstructionId', data.StandingInstructionID);
        setFieldValue('txt_standingInstructionName', data.StandingInstructionName);
        setFieldValue('txt_referenceNo', data.ReferenceNo);
        setFieldValue('ddl_siType', data.SIType);
        setFieldValue('txt_effectiveDate', formatDateForInput(data.EffectiveDate));

        // Transfer Details
        setFieldValue('txt_transferCurrencyId', data.TransferCurrencyID);
        setFieldValue('txt_transferCurrencyName', data.TransferCurrencyName || data.CurrencyName);
        setFieldValue('ddl_amountIn', data.AmountIn);
        setFieldValue('txt_fixedAmount', data.FixedAmount);
        setFieldValue('ddl_chargeRecovery', data.ChargeRecovery);

        // Frequency & Execution
        setFieldValue('ddl_transferFrequency', data.TransferFrequency);
        setFieldValue('txt_noOfExecution', data.NoOfExecution);
        setFieldValue('txt_regularExecutionDay', data.RegularExecutionDay);
        setFieldValue('txt_firstExecutionDate', formatDateForInput(data.FirstExecutionDate));
        setFieldValue('txt_lastExecutionDate', data.LastExecutionDate);

        // Beneficiary Account Details
        setFieldValue('txt_beneficiaryBranchId', data.BeneficiaryBranchID);
        setFieldValue('txt_beneficiaryBranchName', data.BeneficiaryBranchName);
        setFieldValue('ddl_beneficiaryAccountType', data.BeneficiaryAccountType);
        setFieldValue('txt_beneficiaryAccountId', data.BeneficiaryAccountID);
        setFieldValue('txt_beneficiaryAccountName', data.BeneficiaryAccountName);

        // Behind The Scene (all readonly)
        setFieldValue('txt_nextExecutionDate', data.NextExecutionDate);
        setFieldValue('txt_lastRunDate', data.LastRunDate);
        setFieldValue('txt_noOfTimesFailed', data.NoOfTimesFailed);
        setFieldValue('txt_stoppedReason', data.StoppedReason);
        setFieldValue('txt_siStatus', data.StandingInstructionStatus);
        setFieldValue('txt_lastRunStatus', data.LastRunStatus);

        // Audit Trail
        setFieldValue('audit_createdBy', data.CreatedBy);
        setFieldValue('audit_createdOn', data.CreatedOn);
        setFieldValue('audit_stoppedBy', data.StoppedBy);
        setFieldValue('audit_stoppedOn', data.StoppedOn);
        setFieldValue('audit_supervisedBy', data.SupervisedBy);
        setFieldValue('audit_supervisedOn', data.SupervisedOn);
        setFieldValue('audit_modifiedBy', data.ModifiedBy);

        state.isDirty = false;
    }

    function captureFormData() {
        const form = document.getElementById('frm_sit');
        const formData = new FormData(form);

        const data = {
            StandingInstructionID: state.currentId,
            ModuleID: state.moduleId,
            OurBranchID: state.branchId,
            OperatorID: state.operatorId
        };

        formData.forEach((value, key) => {
            data[key] = value;
        });

        return data;
    }

    function clearForm() {
        const form = document.getElementById('frm_sit');
        form?.reset();

        // Clear lookup hidden fields
        document.querySelectorAll('#frm_sit input[type="hidden"]').forEach(field => {
            if (!field.id.includes('moduleId') && !field.id.includes('entityId') &&
                !field.id.includes('session')) {
                field.value = '';
            }
        });

        // Clear editable + lookup display fields
        ['txt_accountId', 'txt_accountName',
         'txt_standingInstructionId', 'txt_standingInstructionName',
         'txt_referenceNo',
         'txt_transferCurrencyId', 'txt_transferCurrencyName',
         'txt_fixedAmount',
         'txt_noOfExecution', 'txt_regularExecutionDay',
         'txt_beneficiaryBranchId', 'txt_beneficiaryBranchName',
         'txt_beneficiaryAccountId', 'txt_beneficiaryAccountName'
        ].forEach(id => {
            setFieldValue(id, '');
        });

        // Clear readonly fields
        ['txt_lastExecutionDate', 'txt_nextExecutionDate', 'txt_lastRunDate',
         'txt_noOfTimesFailed', 'txt_stoppedReason', 'txt_siStatus', 'txt_lastRunStatus'
        ].forEach(id => {
            setFieldValue(id, '');
        });

        // Clear audit fields
        ['audit_createdBy', 'audit_createdOn', 'audit_stoppedBy', 'audit_stoppedOn',
         'audit_supervisedBy', 'audit_supervisedOn', 'audit_modifiedBy'
        ].forEach(id => {
            setFieldValue(id, '-');
        });

        state.currentId = null;
        state.isDirty = false;
    }

    // ═══════════════════════════════════════════════════════════════════
    // VALIDATION
    // ═══════════════════════════════════════════════════════════════════

    function validateForm() {
        let isValid = true;
        const errors = [];

        // Clear previous validation states
        document.querySelectorAll('.is-invalid').forEach(el => el.classList.remove('is-invalid'));

        // Account ID (required)
        const accountId = document.getElementById('txt_accountId');
        if (!accountId?.value?.trim()) {
            errors.push('Account ID is required');
            accountId?.classList.add('is-invalid');
            isValid = false;
        }

        // SI Type (required)
        const siType = document.getElementById('ddl_siType');
        if (!siType?.value) {
            errors.push('SI Type is required');
            siType?.classList.add('is-invalid');
            isValid = false;
        }

        // Effective Date (required)
        const effectiveDate = document.getElementById('txt_effectiveDate');
        if (!effectiveDate?.value) {
            errors.push('Effective Date is required');
            effectiveDate?.classList.add('is-invalid');
            isValid = false;
        }

        // Transfer Currency ID (required)
        const currencyId = document.getElementById('txt_transferCurrencyId');
        if (!currencyId?.value?.trim()) {
            errors.push('Transfer Currency ID is required');
            currencyId?.classList.add('is-invalid');
            isValid = false;
        }

        // Fixed Amount (required)
        const fixedAmount = document.getElementById('txt_fixedAmount');
        if (!fixedAmount?.value?.trim()) {
            errors.push('Fixed Amount is required');
            fixedAmount?.classList.add('is-invalid');
            isValid = false;
        }

        // Beneficiary Branch (required)
        const benBranch = document.getElementById('txt_beneficiaryBranchId');
        if (!benBranch?.value?.trim()) {
            errors.push('Beneficiary Branch is required');
            benBranch?.classList.add('is-invalid');
            isValid = false;
        }

        // Beneficiary Account ID (required)
        const benAccount = document.getElementById('txt_beneficiaryAccountId');
        if (!benAccount?.value?.trim()) {
            errors.push('Beneficiary Account ID is required');
            benAccount?.classList.add('is-invalid');
            isValid = false;
        }

        if (errors.length > 0) {
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
        const isEditing = mode === 'EDIT' || mode === 'NEW';
        const hasRecord = !!state.currentId;
        const form = document.getElementById('frm_sit');

        // Enable/disable form fields based on mode
        form?.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(field => {
            if (!field.hasAttribute('data-always-readonly')) {
                field.readOnly = isViewMode;
                if (field.tagName === 'SELECT') {
                    field.disabled = isViewMode;
                }
            }
        });

        // Lookup buttons: ALL search icons only active in EDIT/NEW mode
        form?.querySelectorAll('.btn-lookup').forEach(btn => {
            btn.disabled = !isEditing;
        });

        // SID fields: disabled in NEW mode (can't add an existing SID),
        // but enabled in VIEW mode so user can search/load a record
        form?.querySelectorAll('[data-si-field]').forEach(el => {
            if (mode === 'NEW') {
                el.disabled = true;
                el.readOnly = true;
            } else {
                // VIEW & EDIT — SID lookup is accessible to load/navigate records
                el.disabled = false;
                el.readOnly = el.tagName !== 'BUTTON';
            }
        });

        // Toggle action button states
        const viewBtn = document.querySelector('[data-action="view"]');
        const addBtn = document.querySelector('[data-action="add"]');
        const editBtn = document.querySelector('[data-action="edit"]');
        const saveBtn = document.querySelector('[data-action="save"]');
        const deleteBtn = document.querySelector('[data-action="delete"]');
        const stopBtn = document.querySelector('[data-action="stop"]');
        const cancelBtn = document.querySelector('[data-action="cancel"]');
        const printBtn = document.querySelector('[data-action="print"]');

        if (viewBtn) viewBtn.disabled = isEditing;
        if (addBtn) addBtn.disabled = isEditing;
        if (editBtn) editBtn.disabled = isEditing || !hasRecord;
        if (saveBtn) saveBtn.disabled = !isEditing;
        if (deleteBtn) deleteBtn.disabled = isEditing || !hasRecord;
        if (stopBtn) stopBtn.disabled = isEditing || !hasRecord;
        if (cancelBtn) cancelBtn.disabled = !isEditing;
        if (printBtn) printBtn.disabled = isEditing || !hasRecord;

        console.log(`📝 Mode: ${mode}, hasRecord: ${hasRecord}`);
    }

    // ═══════════════════════════════════════════════════════════════════
    // UI HELPERS
    // ═══════════════════════════════════════════════════════════════════

    function setFieldValue(id, value) {
        const el = document.getElementById(id);
        if (!el) return;
        if (el.tagName === 'SPAN' || el.classList.contains('audit-value')) {
            el.textContent = value || '-';
        } else if (el.tagName === 'SELECT') {
            el.value = value || '';
        } else {
            el.value = value || '';
        }
    }

    function showLoading(show) {
        const overlay = document.getElementById('loadingOverlay');
        if (overlay) overlay.hidden = !show;
    }

    function showSuccess(message) {
        if (AppCore?.showToastMessage) {
            AppCore.showToastMessage(message, 'success');
        } else {
            console.log('✅', message);
        }
    }

    function showError(message) {
        if (AppCore?.showToastMessage) {
            AppCore.showToastMessage(message, 'error');
        } else {
            console.error('❌', message);
        }
    }

    function showWarning(message) {
        if (AppCore?.showToastMessage) {
            AppCore.showToastMessage(message, 'warning');
        } else {
            console.warn('⚠️', message);
        }
    }

    function formatDateForInput(dateString) {
        if (!dateString) return '';
        try {
            return new Date(dateString).toISOString().split('T')[0];
        } catch {
            return '';
        }
    }

    // ═══════════════════════════════════════════════════════════════════
    // SIGNATURE / PHOTO POPUP
    // ═══════════════════════════════════════════════════════════════════

    async function showSignatoryPopup(accountId) {
        console.log('[SIT] Showing signatory popup for AccountID:', accountId);

        // Reset popup content
        resetSignatoryPopup();
        setSignatoryStatus('Loading signatories...', 'info');

        // Show the modal
        const modalEl = document.getElementById('signatoryModal');
        if (!modalEl) {
            console.error('[SIT] signatoryModal element not found');
            return;
        }
        const bsModal = new bootstrap.Modal(modalEl);
        bsModal.show();

        try {
            // Step 1: Fetch account signatories
            const response = await AppCore.invokeControllerAsync(
                'AccountUtilities/StandingInstructionTransfer/get-signatories',
                {
                    OurBranchID: state.branchId,
                    AccountID: accountId,
                    OperatorID: state.operatorId
                }
            );

            console.log('[SIT] Signatories response:', response);

            if (!response?.success) {
                setSignatoryStatus(response?.message || 'Failed to load signatories', 'warning');
                return;
            }

            // Extract rows from various response shapes
            let rows = [];
            const d = response.data;
            if (Array.isArray(d?.Details)) rows = d.Details;
            else if (Array.isArray(d?.data?.Details)) rows = d.data.Details;
            else if (Array.isArray(d?.data)) rows = d.data;
            else if (Array.isArray(d)) rows = d;

            if (rows.length === 0) {
                setSignatoryStatus('Signature / Photo is Not Available [No:' + accountId + ']', 'warning');
                return;
            }

            console.log('[SIT] Signatory rows:', rows.length);

            // Step 2: Use the first signatory to fetch images
            const firstRow = rows[0];
            const signID = firstRow.SignID || firstRow.SignatoryID || firstRow.signatoryId || 0;
            const photoID = firstRow.PhotoID || firstRow.photoId || 0;
            const documentID = firstRow.DocumentID || firstRow.documentId || 0;

            await fetchAndDisplayImages(signID, photoID, documentID, firstRow);

        } catch (err) {
            console.error('[SIT] Signatory popup error:', err);
            setSignatoryStatus('Error loading signatories: ' + err.message, 'danger');
        }
    }

    async function fetchAndDisplayImages(signID, photoID, documentID, rowData) {
        console.log('[SIT] Fetching signatory images:', { signID, photoID, documentID });

        try {
            const response = await AppCore.invokeControllerAsync(
                'AccountUtilities/StandingInstructionTransfer/get-signatory-image',
                {
                    SignID: signID,
                    PhotoID: photoID,
                    DocumentID: documentID
                }
            );

            console.log('[SIT] Image response:', response);

            if (!response?.success) {
                setSignatoryStatus('No images available', 'info');
                updateAuditFromRow(rowData);
                return;
            }

            // Extract image records
            let imageRecords = [];
            const d = response.data;
            if (Array.isArray(d?.Details)) imageRecords = d.Details;
            else if (Array.isArray(d?.data?.Details)) imageRecords = d.data.Details;
            else if (Array.isArray(d?.data)) imageRecords = d.data;
            else if (Array.isArray(d)) imageRecords = d;
            else if (d && typeof d === 'object') imageRecords = [d];

            console.log('[SIT] Image records:', imageRecords.length);

            // Separate signature vs photo by ImageTypeID: 'S' = Signature, 'P' = Photo
            let signatureData = null;
            let photoData = null;

            imageRecords.forEach(record => {
                const imgType = String(
                    record.ImageTypeID || record.sType || record.Type || record.type || ''
                ).toUpperCase().trim();

                if (imgType === 'S' || imgType === 'SIGNATURE') {
                    signatureData = record;
                } else if (imgType === 'P' || imgType === 'PHOTO') {
                    photoData = record;
                }
            });

            // If no explicit type separation, try first two records as signature / photo
            if (!signatureData && !photoData && imageRecords.length >= 2) {
                signatureData = imageRecords[0];
                photoData = imageRecords[1];
            } else if (!signatureData && !photoData && imageRecords.length === 1) {
                signatureData = imageRecords[0];
            }

            // Render images
            renderImage('signatureImageContainer', signatureData, 'Signature');
            renderImage('photoImageContainer', photoData, 'Photo');

            // Update audit info
            updateSignatureAudit(signatureData);
            updatePhotoAudit(photoData);

            setSignatoryStatus('', 'hide');

        } catch (err) {
            console.error('[SIT] Image fetch error:', err);
            setSignatoryStatus('Failed to load images', 'warning');
            updateAuditFromRow(rowData);
        }
    }

    function renderImage(containerId, record, altText) {
        const container = document.getElementById(containerId);
        if (!container) return;

        if (!record) {
            container.innerHTML = '<span class="text-muted">No ' + altText.toLowerCase() + ' available</span>';
            return;
        }

        // Get base64 image data — field names vary by SP
        const imgData = record.sImage || record.simage || record.SImage ||
                        record.Image || record.ImageData || record.Base64 ||
                        record.SignatureImage || record.PhotoImage ||
                        record.Picture || record.Photo || record.Document || '';

        if (!imgData) {
            container.innerHTML = '<span class="text-muted">No ' + altText.toLowerCase() + ' available</span>';
            return;
        }

        // Detect MIME type from base64 header
        let mimeType = 'image/png';
        if (imgData.charAt(0) === '/') mimeType = 'image/jpeg';
        else if (imgData.charAt(0) === 'i') mimeType = 'image/png';
        else if (imgData.charAt(0) === 'R') mimeType = 'image/gif';

        const src = imgData.indexOf('data:') === 0
            ? imgData
            : 'data:' + mimeType + ';base64,' + imgData;

        container.innerHTML = '<img src="' + src + '" alt="' + altText +
            '" style="max-width:100%; max-height:100%; object-fit:contain;" />';
    }

    function updateSignatureAudit(record) {
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || '-';
        };
        if (!record) return;
        setText('sigScannedBy', record.ScannedBy || record.CreatedBy);
        setText('sigScannedOn', record.ScannedOn || record.CreatedOn);
        setText('sigSupervisedBy', record.SupervisedBy);
        setText('sigSupervisedOn', record.SupervisedOn);
    }

    function updatePhotoAudit(record) {
        const setText = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || '-';
        };
        if (!record) return;
        setText('photoScannedBy', record.ScannedBy || record.CreatedBy);
        setText('photoScannedOn', record.ScannedOn || record.CreatedOn);
        setText('photoSupervisedBy', record.SupervisedBy);
        setText('photoSupervisedOn', record.SupervisedOn);
    }

    function updateAuditFromRow(rowData) {
        if (!rowData) return;
        updateSignatureAudit(rowData);
        updatePhotoAudit(rowData);
    }

    function resetSignatoryPopup() {
        const ids = ['signatureImageContainer', 'photoImageContainer'];
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '<span class="text-muted">Loading...</span>';
        });
        ['sigScannedBy', 'sigScannedOn', 'sigSupervisedBy', 'sigSupervisedOn',
         'photoScannedBy', 'photoScannedOn', 'photoSupervisedBy', 'photoSupervisedOn'
        ].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.textContent = '-';
        });
        setSignatoryStatus('', 'hide');
    }

    function setSignatoryStatus(message, type) {
        const el = document.getElementById('signatoryStatus');
        if (!el) return;
        if (!message || type === 'hide') {
            el.style.display = 'none';
            return;
        }
        el.style.display = 'block';
        el.className = 'alert alert-' + (type || 'info') + ' py-1 px-2 mb-3 small';
        el.textContent = message;
    }

    // Wire the print button inside signatory modal
    function wireSignatoryPrint() {
        document.getElementById('btnSignatoryPrint')?.addEventListener('click', () => {
            window.print();
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // EXPOSE PUBLIC API
    // ═══════════════════════════════════════════════════════════════════

    window.StandingInstructionTransferModule = {
        init,
        loadRecord,
        saveRecord,
        deleteRecord,
        stopRecord,
        setMode,
        clearForm,
        getState: () => ({ ...state })
    };

    // Auto-initialize
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    console.log('✅ Standing Instruction Transfer module loaded');
})();
