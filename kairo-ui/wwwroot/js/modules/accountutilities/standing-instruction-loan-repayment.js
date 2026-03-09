/**
 * Standing Instruction Loan Repayment Module
 * Migrated from: public/modules/AccountUtilities/standing-instruction-loan-repayment.html
 *
 * Uses: AppCore.invokeControllerAsync (POST) for ALL API calls
 * Lookups: SearchModal for LoanAccount, Bank, SavBranch, SavAccount
 * Dropdowns: SI Type loaded client-side via get-dropdown-options endpoint (CodeID: SITypeID)
 *
 * Field layout matches legacy screenshot:
 *   Top: Reference No, Branch ID, Loan Account ID, SI Type, Effective Date
 *   Savings Account Details: Bank ID, Branch ID, Account ID, Name
 *   Loan Account Details: 8 readonly fields (auto-populated)
 *   Behind The Scene: execution/status readonly fields
 *   Audit Footer: Created/Stopped/Supervised By+On
 */
(function () {
    'use strict';

    // ═══════════════════════════════════════════════════════════════════
    // STATE MANAGEMENT
    // ═══════════════════════════════════════════════════════════════════

    const state = {
        currentId: null,
        branchId: null,
        operatorId: null,
        currentMode: 'VIEW',    // VIEW, EDIT, NEW
        isDirty: false,
        moduleId: null
    };

    // SearchModal instance
    let searchModal = null;

    // ═══════════════════════════════════════════════════════════════════
    // LOOKUP CONFIGURATION (for SearchModal)
    // Matches the screenshot lookup buttons:
    //   Top: Loan Account ID
    //   Savings: Bank ID, Branch ID, Account ID
    // ═══════════════════════════════════════════════════════════════════

    const LOOKUP_CONFIG = {
        'LoanAccountID': {
            tableID: 'LoanID',
            displayField: 'txt_loanAccountName',
            valueField: 'txt_loanAccountId',
            displayColumn: 'AccountName',
            valueColumn: 'LoanAccountID',
            whereStmt: ''
        },
        'BankID': {
            tableID: 'MastClrBankID',
            displayField: 'txt_savBankName',
            valueField: 'txt_savBankId',
            displayColumn: 'BankName',
            valueColumn: 'BankID',
            whereStmt: ''
        },
        'SavBranchID': {
            tableID: 'BranchID',
            displayField: 'txt_savBranchName',
            valueField: 'txt_savBranchId',
            displayColumn: 'BranchName',
            valueColumn: 'BranchID',
            whereStmt: ''
        },
        'SavAccountID': {
            tableID: 'AccountID',
            displayField: 'txt_savAccountName',
            valueField: 'txt_savAccountId',
            displayColumn: 'AccountName',
            valueColumn: 'AccountID',
            whereStmt: ''
        }
    };

    // ═══════════════════════════════════════════════════════════════════
    // INITIALIZATION
    // ═══════════════════════════════════════════════════════════════════

    async function init() {
        console.log('🚀 Initializing Standing Instruction Loan Repayment module...');

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
        console.log('📋 [SILR] Branch fields set → ID:', state.branchId || '(empty)', '| Name:', state.branchName || '(empty)');

        // Load dropdowns via API (LookupService pattern)
        await loadDropdowns();

        // Start in VIEW mode (all fields disabled, only View + Add active)
        setMode('VIEW');

        // Auto-load if entityId is provided
        const autoLoad = document.getElementById('entityId_silr')?.value;
        if (autoLoad) {
            loadRecord(autoLoad);
        }

        console.log('✅ Standing Instruction Loan Repayment module initialized');
    }

    // ═══════════════════════════════════════════════════════════════════
    // DROPDOWN LOADING (LookupService pattern via controller API)
    // ═══════════════════════════════════════════════════════════════════

    async function loadDropdowns() {
        try {
            const options = await fetchDropdownOptions('SITypeID');
            populateSelect('ddl_siType', options, '--Select--');
            console.log('✅ [SILR] SI Type dropdown loaded:', options.length, 'options');
        } catch (err) {
            console.error('❌ [SILR] Failed to load SI Type dropdown:', err);
        }
    }

    async function fetchDropdownOptions(codeId) {
        const url = `/AccountUtilities/StandingInstructionLoanRepayment/get-dropdown-options?codeId=${encodeURIComponent(codeId)}`;
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
        state.moduleId = document.getElementById('moduleId_silr')?.value || '100';

        // ── PRIMARY: Read from server-injected hidden fields (most reliable, works cross-origin) ──
        const serverBranch = document.getElementById('sessionBranchCode_silr')?.value || '';
        const serverBranchName = document.getElementById('sessionBranchName_silr')?.value || '';
        const serverOperator = document.getElementById('sessionOperatorId_silr')?.value || '';

        // ── FALLBACK: Try localStorage session (works when same-origin) ──
        let session = null;
        try {
            const raw = localStorage.getItem('nimble_auth_session');
            session = raw ? JSON.parse(raw) : null;
        } catch (e) {
            console.warn('[SILR] Failed to parse localStorage session:', e);
        }

        // ── Resolve with fallback chain: server hidden fields → localStorage → parent window ──
        state.branchId = serverBranch
            || session?.branchID
            || '';
        state.branchName = serverBranchName
            || session?.selectedBranchName
            || '';
        state.operatorId = serverOperator
            || session?.operatorID
            || '';

        console.log('📦 [SILR] Context loaded:', {
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

        console.log('[SILR] Opening lookup:', lookupKey, '→ tableID:', config.tableID, '| moduleID:', state.moduleId, '| branchId:', state.branchId);

        // Create fresh instance per lookup to avoid stale state
        const modal = new SearchModal(window.AppCore);

        modal.open({
            tableID: config.tableID,
            moduleID: state.moduleId,
            whereStmt: config.whereStmt || '',
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
            }
        }).catch(err => {
            console.error('[SILR] SearchModal open failed for', lookupKey, err);
        });
    }

    // ═══════════════════════════════════════════════════════════════════
    // ACTION BUTTONS
    // ═══════════════════════════════════════════════════════════════════

    function wireActionButtons() {
        document.querySelector('[data-action="view"]')?.addEventListener('click', () => {
            const loanAccountId = document.getElementById('txt_loanAccountId')?.value;
            if (loanAccountId) {
                loadRecord(loanAccountId);
            } else {
                showWarning('Enter or select a Loan Account ID first');
            }
        });

        document.querySelector('[data-action="add"]')?.addEventListener('click', () => {
            clearForm();
            setMode('NEW');

            // Pre-fill branch from session
            const branchIdField = document.getElementById('txt_branchId');
            if (branchIdField && state.branchId) {
                branchIdField.value = state.branchId;
            }

            document.getElementById('txt_loanAccountId')?.focus();
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
        const form = document.getElementById('frm_silr');
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

    async function loadRecord(loanAccountId) {
        showLoading(true);

        try {
            const response = await AppCore.invokeControllerAsync(
                'AccountUtilities/StandingInstructionLoanRepayment/get',
                {
                    LoanAccountID: loanAccountId,
                    ModuleID: state.moduleId,
                    OurBranchID: state.branchId
                }
            );

            if (response?.success && response.data) {
                populateForm(response.data);
                state.currentId = loanAccountId;
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
                'AccountUtilities/StandingInstructionLoanRepayment/save',
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
                'AccountUtilities/StandingInstructionLoanRepayment/delete',
                {
                    LoanAccountID: state.currentId,
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
                'AccountUtilities/StandingInstructionLoanRepayment/stop',
                {
                    LoanAccountID: state.currentId,
                    ModuleID: state.moduleId,
                    OurBranchID: state.branchId
                }
            );

            if (response?.success) {
                showSuccess('Standing instruction stopped');
                // Reload to show updated status
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
        const form = document.getElementById('frm_silr');
        if (!form) return;

        // Top Section: Header Fields
        setFieldValue('txt_referenceNo', data.ReferenceNo);
        setFieldValue('txt_branchId', data.BranchID || data.OurBranchID);
        setFieldValue('txt_branchName', data.BranchName);
        setFieldValue('txt_loanAccountId', data.LoanID || data.LoanAccountID);
        setFieldValue('txt_loanAccountName', data.LoanAccountName || data.LoanName);
        setFieldValue('ddl_siType', data.RepaymentType || data.SIType);
        setFieldValue('txt_effectiveDate', formatDateForInput(data.EffectiveDate));

        // Savings Account Details
        setFieldValue('txt_savBankId', data.BankID);
        setFieldValue('txt_savBankName', data.BankName);
        setFieldValue('txt_savBranchId', data.SavBranchID || data.BranchID);
        setFieldValue('txt_savBranchName', data.SavBranchName || data.BranchName);
        setFieldValue('txt_savAccountId', data.AccountID);
        setFieldValue('txt_savAccountName', data.AccountName);

        // Loan Account Details (all readonly, auto-populated)
        setFieldValue('txt_loanSeries', data.LoanSeries);
        setFieldValue('txt_loanCurrencyId', data.CurrencyID);
        setFieldValue('txt_repaymentTerm', data.RepaymentTerm);
        setFieldValue('txt_repaymentFrequency', data.RepaymentFrequency);
        setFieldValue('txt_firstInstallmentDate', data.FirstInstallmentDate);
        setFieldValue('txt_maturityDate', data.MaturityDate);
        setFieldValue('txt_installmentAmount', data.InstallmentAmount);
        setFieldValue('txt_lastInstallmentAmount', data.LastInstallmentAmount);

        // Behind The Scene (all readonly)
        setFieldValue('txt_nextExecutionDate', data.NextExecutionDate);
        setFieldValue('txt_lastRunDate', data.LastRunDate);
        setFieldValue('txt_noOfTimesFailed', data.NoOfTimesFailed);
        setFieldValue('txt_stoppedReason', data.StoppedReason);
        setFieldValue('txt_siStatus', data.StandingInstructionStatus);
        setFieldValue('txt_lastRunStatus', data.LastRunStatus);

        // Audit Footer (span elements)
        setFieldValue('audit_createdBy', data.CreatedBy);
        setFieldValue('audit_createdOn', data.CreatedOn);
        setFieldValue('audit_stoppedBy', data.StoppedBy);
        setFieldValue('audit_stoppedOn', data.StoppedOn);
        setFieldValue('audit_supervisedBy', data.SupervisedBy);
        setFieldValue('audit_supervisedOn', data.SupervisedOn);

        state.isDirty = false;
    }

    function captureFormData() {
        const form = document.getElementById('frm_silr');
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
        const form = document.getElementById('frm_silr');
        form?.reset();

        // Clear lookup hidden fields
        document.querySelectorAll('#frm_silr input[type="hidden"]').forEach(field => {
            if (!field.id.includes('moduleId') && !field.id.includes('entityId')) {
                field.value = '';
            }
        });

        // Clear editable + lookup display fields
        ['txt_referenceNo', 'txt_loanAccountId', 'txt_loanAccountName',
         'txt_savBankId', 'txt_savBankName', 'txt_savBranchId', 'txt_savBranchName',
         'txt_savAccountId', 'txt_savAccountName'].forEach(id => {
            setFieldValue(id, '');
        });

        // Clear readonly loan details
        ['txt_loanSeries', 'txt_loanCurrencyId', 'txt_repaymentTerm', 'txt_repaymentFrequency',
         'txt_firstInstallmentDate', 'txt_maturityDate', 'txt_installmentAmount', 'txt_lastInstallmentAmount'].forEach(id => {
            setFieldValue(id, '');
        });

        // Clear Behind The Scene fields
        ['txt_nextExecutionDate', 'txt_lastRunDate', 'txt_noOfTimesFailed', 'txt_stoppedReason',
         'txt_siStatus', 'txt_lastRunStatus'].forEach(id => {
            setFieldValue(id, '');
        });

        // Clear audit fields (inputs)
        ['audit_createdBy', 'audit_createdOn', 'audit_stoppedBy', 'audit_stoppedOn',
         'audit_supervisedBy', 'audit_supervisedOn'].forEach(id => {
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

        // Loan Account ID (required)
        const loanAccountId = document.getElementById('txt_loanAccountId');
        if (!loanAccountId?.value?.trim()) {
            errors.push('Loan Account ID is required');
            loanAccountId?.classList.add('is-invalid');
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

        // Savings Account ID (required)
        const savAccountId = document.getElementById('txt_savAccountId');
        if (!savAccountId?.value?.trim()) {
            errors.push('Savings Account ID is required');
            savAccountId?.classList.add('is-invalid');
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
        const form = document.getElementById('frm_silr');

        // Enable/disable form fields based on mode
        form?.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(field => {
            if (!field.hasAttribute('data-always-readonly')) {
                field.readOnly = isViewMode;
                if (field.tagName === 'SELECT') {
                    field.disabled = isViewMode;
                }
            }
        });

        // Lookup buttons: Loan Account search always active; others only in EDIT/NEW
        form?.querySelectorAll('.btn-lookup').forEach(btn => {
            const lookupKey = btn.getAttribute('data-lookup');
            if (lookupKey === 'LoanAccountID') {
                btn.disabled = false; // Always active — needed to find/view records
            } else {
                btn.disabled = !isEditing; // BankID, SavBranchID, SavAccountID only when adding/editing
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

        // Default init: only View + Add are enabled
        // After a record is loaded: View, Add, Edit, Delete, Stop, Print become enabled
        // While editing/adding: only Save + Cancel are enabled
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

    function setText(id, text) {
        const el = document.getElementById(id);
        if (el) el.textContent = text || '-';
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
    // EXPOSE PUBLIC API
    // ═══════════════════════════════════════════════════════════════════

    window.StandingInstructionLoanRepaymentModule = {
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

    console.log('✅ Standing Instruction Loan Repayment module loaded');
})();
