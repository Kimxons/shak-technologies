/**
 * Standing Instruction EFT Module
 * Manages SI EFT CRUD operations
 */

window.SIEFTModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        standingInstructionId: null,
        currentMode: 'VIEW',
        currentRecord: null,
        originalData: null
    };

    const API = {
        GET:    'AccountUtilities/api/get-si-eft',
        CREATE: 'AccountUtilities/api/create-si-eft',
        UPDATE: 'AccountUtilities/api/update-si-eft',
        DELETE: 'AccountUtilities/api/delete-si-eft',
        STOP:   'AccountUtilities/api/stop-si-eft'
    };

    /* ====================================================================
       INIT
       ==================================================================== */
    function init() {
        console.log('[SI-EFT] Initializing module...');
        getContext();
        wireHeaderControls();
        wireActionButtons();
        wireSectionToggles();
        wireLookupButtons();
        initSearchModals();
        loadDropdowns();
        setMode('VIEW');
        loadData();
    }

    function getContext() {
        if (window.parent && window.parent !== window && window.parent.AccountMaintenanceState) {
            const p = window.parent.AccountMaintenanceState;
            state.accountId  = p.AccountID;
            state.branchId   = p.OurBranchID || p.BranchID;
            state.operatorId = p.OperatorID;
        } else {
            state.accountId  = sessionStorage.getItem('currentAccountID');
            state.branchId   = sessionStorage.getItem('currentBranchID');
            state.operatorId = sessionStorage.getItem('currentOperatorID') || 'SYSTEM';
        }
    }

    /* ====================================================================
       WIRING
       ==================================================================== */
    function wireHeaderControls() {
        document.querySelector('[data-action="refresh"]')?.addEventListener('click', loadData);
        document.querySelector('[data-action="close"]')?.addEventListener('click', closeModule);
        document.querySelector('[data-action="maximize"]')?.addEventListener('click', toggleMaximize);
    }

    function wireActionButtons() {
        const actions = {
            'view':   () => { cancelChanges(); setMode('VIEW'); },
            'add':    () => { snapshotForm(); clearForm(); setMode('ADD'); focusField('txt_standingInstructionId'); },
            'edit':   () => { snapshotForm(); setMode('EDIT'); focusField('txt_referenceNo'); },
            'delete': deleteRecord,
            'save':   saveRecord,
            'cancel': () => { cancelChanges(); setMode('VIEW'); },
            'stop':   stopInstruction
        };

        Object.keys(actions).forEach(action => {
            document.querySelector(`[data-action="${action}"]`)?.addEventListener('click', actions[action]);
        });

        document.getElementById('btn_prevRecord')?.addEventListener('click', () => navigateRecord(-1));
        document.getElementById('btn_nextRecord')?.addEventListener('click', () => navigateRecord(1));
    }

    function wireSectionToggles() {
        document.querySelectorAll('.section-toggle-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const section = this.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const icon = this.querySelector('i');
                const isExpanded = this.getAttribute('aria-expanded') === 'true';

                if (content) content.hidden = isExpanded;
                this.setAttribute('aria-expanded', !isExpanded);
                if (icon) {
                    icon.classList.toggle('bi-chevron-up');
                    icon.classList.toggle('bi-chevron-down');
                }
            });
        });
    }

    function wireLookupButtons() {
        document.querySelectorAll('[data-open-search]').forEach(btn => {
            btn.addEventListener('click', function () {
                const type = this.getAttribute('data-open-search');
                openSearchModal(type);
            });
        });
    }

    /* ====================================================================
       DROPDOWN LOADING
       ==================================================================== */
    async function loadDropdowns() {
        console.log('[SI-EFT] Loading dropdowns...');
        try {
            const [freqOpts, amountInOpts, chargeRecOpts] = await Promise.all([
                fetchDropdownOptions('TrfFrequencyID').catch(() => []),
                fetchDropdownOptions('ChargingCurrencyID', 'ChargingCurrencyID').catch(() => []),
                fetchDropdownOptions('SIChargeTypeID').catch(() => [])
            ]);

            console.log('[SI-EFT] Dropdown raw results:', {
                transferFrequency: freqOpts,
                amountIn: amountInOpts,
                chargeRecovery: chargeRecOpts
            });

            populateSelect('ddl_transferFrequency', freqOpts, '--Select--');
            populateSelect('ddl_amountIn', amountInOpts, '--Select--');
            populateSelect('ddl_chargeRecovery', chargeRecOpts, '--Select--');

            // Load SI Type combo via MVC controller endpoint (converted from legacy p_getsitYPEcombo)
            await loadSITypeCombo();

            console.log('[SI-EFT] All dropdowns loaded:', {
                transferFrequency: freqOpts.length,
                amountIn: amountInOpts.length,
                chargeRecovery: chargeRecOpts.length,
                siType: document.getElementById('ddl_siType')?.options?.length - 1 || 0
            });
        } catch (err) {
            console.error('[SI-EFT] Failed to load dropdowns:', err);
        }
    }

    /**
     * Fetches SI Type combo options via MVC controller endpoint.
     * Converted from legacy StandingInstructionEftService.getSITypeCombo()
     * which called dbo.p_getsitYPEcombo via CoreApi.post to /api/OldAPI.
     * Now routed through: JS → AppCore.invokeControllerAsync → AccountUtilities/api/get-si-type-combo → OldApiService → p_GetSITypeCombo
     */
    async function loadSITypeCombo() {
        console.log('[SI-EFT] Fetching SI Type combo options...');
        try {
            const payload = {
                BankID: state.branchId || '',
                ModuleID: 1906
            };
            console.log('[SI-EFT] SI Type combo request payload:', payload);

            const response = await AppCore.invokeControllerAsync('AccountUtilities/api/get-si-type-combo', payload);
            console.log('[SI-EFT] SI Type combo raw response:', response);

            if (response && response.success && response.data) {
                const data = response.data;
                console.log('[SI-EFT] SI Type combo data:', data);

                // Parse the response — look for Details array structures
                let rows = [];
                if (data.Details) {
                    const details = data.Details;
                    if (details.Details01 && Array.isArray(details.Details01)) {
                        rows = details.Details01;
                    } else if (details.Details02 && Array.isArray(details.Details02)) {
                        rows = details.Details02;
                    } else if (Array.isArray(details)) {
                        rows = details;
                    }
                } else if (Array.isArray(data)) {
                    rows = data;
                }
                console.log('[SI-EFT] SI Type combo parsed rows:', rows);

                // Map rows to { value, label } for populateSelect
                const siTypeOpts = rows
                    .map(row => ({
                        value: row.SITypeID || row.SubCodeID || row.ID || '',
                        label: row.SITypeDescription || row.Description || row.CodeDescription || row.Name || ''
                    }))
                    .filter(opt => opt.value);

                console.log('[SI-EFT] SI Type options mapped:', siTypeOpts);

                // Preserve any current selection before repopulating
                const currentVal = document.getElementById('ddl_siType')?.value || '';
                populateSelect('ddl_siType', siTypeOpts, '--Select--');
                if (currentVal) {
                    document.getElementById('ddl_siType').value = currentVal;
                }

                console.log('[SI-EFT] SI Type dropdown populated with', siTypeOpts.length, 'options');
            } else {
                console.warn('[SI-EFT] SI Type combo response empty or failed:', response);
            }
        } catch (err) {
            console.error('[SI-EFT] Failed to load SI Type combo:', err);
        }
    }

    async function fetchDropdownOptions(codeId, valueField) {
        let url = `/AccountUtilities/get-dropdown-options?codeId=${encodeURIComponent(codeId)}`;
        if (valueField) url += `&valueField=${encodeURIComponent(valueField)}`;
        console.log('[SI-EFT] Fetching dropdown options:', { codeId, valueField, url });
        const response = await fetch(url);
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const result = await response.json();
        console.log('[SI-EFT] Dropdown response for', codeId, ':', result);
        if (!result.success) throw new Error(result.message || 'Failed to load options');
        return result.data || [];
    }

    function populateSelect(selectId, options, placeholder) {
        const select = document.getElementById(selectId);
        if (!select) return;
        const currentVal = select.value;
        select.innerHTML = `<option value="">${placeholder || '--Select--'}</option>`;
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            select.appendChild(option);
        });
        if (currentVal) select.value = currentVal;
    }

    /* ====================================================================
       MODE MANAGEMENT
       ==================================================================== */
    function setMode(mode) {
        console.log('[SI-EFT] Setting mode:', mode);
        state.currentMode = mode;

        const isEditing = mode === 'ADD' || mode === 'EDIT';
        const formCard = document.querySelector('[data-main-form]');
        if (formCard) {
            formCard.querySelectorAll('input:not([readonly]), select, textarea').forEach(el => {
                el.disabled = !isEditing;
            });
        }

        const buttons = {
            'view':   { disabled: mode === 'VIEW' },
            'add':    { disabled: isEditing },
            'edit':   { disabled: isEditing || !state.currentRecord },
            'delete': { disabled: isEditing || !state.currentRecord },
            'save':   { disabled: !isEditing },
            'cancel': { disabled: !isEditing },
            'stop':   { disabled: isEditing || !state.currentRecord }
        };

        Object.keys(buttons).forEach(action => {
            const btn = document.querySelector(`[data-action="${action}"]`);
            if (btn) btn.disabled = buttons[action].disabled;
        });

        const navDisabled = isEditing;
        document.getElementById('btn_prevRecord')?.toggleAttribute('disabled', navDisabled);
        document.getElementById('btn_nextRecord')?.toggleAttribute('disabled', navDisabled);

        showMessage(mode === 'ADD' ? 'Add mode – fill in the details' :
                    mode === 'EDIT' ? 'Edit mode' : 'View mode', 'info');
    }

    /* ====================================================================
       FORM HELPERS
       ==================================================================== */
    const snapshot = new Map();

    function snapshotForm() {
        snapshot.clear();
        const formCard = document.querySelector('[data-main-form]');
        if (!formCard) return;
        formCard.querySelectorAll('input, select, textarea').forEach(el => {
            const key = el.name || el.id;
            if (key) snapshot.set(key, el.value);
        });
    }

    function restoreForm() {
        const formCard = document.querySelector('[data-main-form]');
        if (!formCard) return;
        formCard.querySelectorAll('input, select, textarea').forEach(el => {
            const key = el.name || el.id;
            if (snapshot.has(key)) el.value = String(snapshot.get(key) ?? '');
        });
    }

    function clearForm() {
        const formCard = document.querySelector('[data-main-form]');
        if (!formCard) return;
        formCard.querySelectorAll('input:not([readonly]), select, textarea').forEach(el => {
            el.value = '';
        });
        // Clear audit spans
        document.querySelectorAll('.audit-value').forEach(el => { el.textContent = '-'; });
    }

    function cancelChanges() {
        restoreForm();
        showMessage('Changes cancelled', 'warning');
    }

    function focusField(id) {
        document.getElementById(id)?.focus();
    }

    function getFormData() {
        const val = id => document.getElementById(id)?.value?.trim() || '';
        return {
            AccountID:            val('txt_accountId'),
            OurBranchID:          val('txt_branchId') || state.branchId,
            StandingInstructionID: val('txt_standingInstructionId'),
            ReferenceNo:          val('txt_referenceNo'),
            SITransferType:       val('ddl_siType'),
            EffectiveDate:        val('txt_effectiveDate'),
            TransferCurrencyID:   val('txt_transactionCurrencyId'),
            AmountIn:             val('ddl_amountIn'),
            FixedAmount:          parseFloat(val('txt_fixedAmount')) || 0,
            TransferFrequency:    val('ddl_transferFrequency'),
            NoOfExecution:        parseInt(val('txt_noOfExecution')) || 0,
            RegularExecutionDay:  parseInt(val('txt_regularExecutionDay')) || 0,
            FirstExecutionDate:   val('ddl_firstExecutionDate'),
            ChargeRecovery:       val('ddl_chargeRecovery'),
            // EFT-specific beneficiary fields
            BeneficiaryBankID:    val('txt_bankId'),
            BeneficiaryBranchID:  val('txt_beneficiaryBranchId'),
            BeneficiaryAccountID: val('txt_beneficiaryAccountId'),
            VoucherCode:          val('txt_voucherCode'),
            ReturnCode:           val('txt_returnCode'),
            EFTReference:         val('txt_eftReference')
        };
    }

    function populateForm(data) {
        if (!data) return;
        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) el.value = value ?? '';
        };

        set('txt_branchId',                data.OurBranchID || data.BranchID);
        set('txt_branchName',              data.BranchName);
        set('txt_accountId',               data.AccountID);
        set('txt_accountName',             data.AccountName);
        set('txt_standingInstructionId',   data.StandingInstructionID);
        set('txt_standingInstructionName', data.StandingInstructionDesc);
        set('txt_referenceNo',             data.ReferenceNo);
        set('ddl_siType',                  data.SITransferType);
        set('txt_effectiveDate',           data.EffectiveDate);
        set('txt_transactionCurrencyId',   data.TransferCurrencyID);
        set('txt_transactionCurrencyName', data.CurrencyName);
        set('ddl_amountIn',               data.AmountIn);
        set('txt_fixedAmount',             data.FixedAmount);
        set('ddl_transferFrequency',       data.TransferFrequency);
        set('txt_noOfExecution',           data.NoOfExecution);
        set('txt_regularExecutionDay',     data.RegularExecutionDay);
        set('ddl_chargeRecovery',          data.ChargeRecovery);
        set('ddl_firstExecutionDate',      data.FirstExecutionDate);
        set('txt_lastExecutionDate',       data.LastExecutionDate);
        // EFT-specific beneficiary fields
        set('txt_bankId',                  data.BeneficiaryBankID || data.BankID);
        set('txt_bankName',                data.BankName);
        set('txt_beneficiaryBranchId',     data.BeneficiaryBranchID);
        set('txt_beneficiaryBranchName',   data.BeneficiaryBranchName);
        set('txt_beneficiaryAccountId',    data.BeneficiaryAccountID);
        set('txt_voucherCode',             data.VoucherCode);
        set('txt_returnCode',              data.ReturnCode);
        set('txt_eftReference',            data.EFTReference || data.Reference);

        populateAuditFields(data);
    }

    function populateAuditFields(data) {
        if (!data) return;
        const fields = {
            'spn_nextExecutionDate':          formatDate(data.NextExecutionDate),
            'spn_standingInstructionStatus':  data.SIStatus || data.StandingInstructionStatus || '-',
            'spn_lastRunDate':                formatDate(data.LastRunDate),
            'spn_lastRunStatus':              data.LastRunStatus || '-',
            'spn_noOfTimesFailed':            data.NoOfTimesFailed ?? '-',
            'spn_stoppedReason':              data.StoppedReason || '-',
            'spn_auditCreatedBy':             data.CreatedBy || data.MakerID || '-',
            'spn_auditCreatedOn':             formatDate(data.CreatedOn || data.MakerDT),
            'spn_auditStoppedBy':             data.StoppedBy || '-',
            'spn_auditStoppedOn':             formatDate(data.StoppedOn),
            'spn_auditSupervisedBy':          data.SupervisedBy || data.CheckerID || '-',
            'spn_auditSupervisedOn':          formatDate(data.SupervisedOn || data.CheckerDT)
        };

        Object.entries(fields).forEach(([id, value]) => {
            const el = document.getElementById(id);
            if (el) el.textContent = value || '-';
        });
    }

    /* ====================================================================
       VALIDATION
       ==================================================================== */
    function validateForm() {
        const accountId = document.getElementById('txt_accountId')?.value?.trim();
        if (!accountId) {
            showMessage('Account ID is required', 'warning');
            focusField('txt_accountId');
            return false;
        }
        const siType = document.getElementById('ddl_siType')?.value;
        if (!siType) {
            showMessage('SI Type is required', 'warning');
            focusField('ddl_siType');
            return false;
        }
        const effectiveDate = document.getElementById('txt_effectiveDate')?.value;
        if (!effectiveDate) {
            showMessage('Effective Date is required', 'warning');
            focusField('txt_effectiveDate');
            return false;
        }
        const bankId = document.getElementById('txt_bankId')?.value?.trim();
        if (!bankId) {
            showMessage('Bank ID is required', 'warning');
            focusField('txt_bankId');
            return false;
        }
        const beneficiaryBranchId = document.getElementById('txt_beneficiaryBranchId')?.value?.trim();
        if (!beneficiaryBranchId) {
            showMessage('Beneficiary Branch ID is required', 'warning');
            focusField('txt_beneficiaryBranchId');
            return false;
        }
        const beneficiaryAccountId = document.getElementById('txt_beneficiaryAccountId')?.value?.trim();
        if (!beneficiaryAccountId) {
            showMessage('Beneficiary Account ID is required', 'warning');
            focusField('txt_beneficiaryAccountId');
            return false;
        }
        return true;
    }

    /* ====================================================================
       API CALLS
       ==================================================================== */
    async function loadData() {
        console.log('[SI-EFT] Loading data...');
        showLoading(true);

        try {
            const payload = {
                SearchKey:  `[${state.branchId}:${state.accountId}]`,
                SearchID:   state.standingInstructionId || '',
                AccountID:  state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId
            };

            const res = await AppCore.invokeControllerAsync(API.GET, payload);
            console.log('[SI-EFT] Load response:', res);

            if (res && res.Success && (res.Data || res.Details)) {
                const data = res.Data || res.Details;
                state.currentRecord = Array.isArray(data) ? data[0] : data;
                populateForm(state.currentRecord);
                snapshotForm();
                showSuccess('Data loaded successfully');
            } else {
                showMessage(res?.ErrorMessage || 'No record found', 'info');
            }
        } catch (error) {
            console.error('[SI-EFT] Load error:', error);
            showError('Failed to load data: ' + error.message);
        } finally {
            showLoading(false);
            setMode('VIEW');
        }
    }

    async function saveRecord() {
        if (!validateForm()) return;
        console.log('[SI-EFT] Saving record...');
        showLoading(true);

        try {
            const formData = getFormData();
            formData.OperatorID = state.operatorId;

            const endpoint = state.currentMode === 'ADD' ? API.CREATE : API.UPDATE;
            const res = await AppCore.invokeControllerAsync(endpoint, formData);

            if (res && res.Success) {
                state.currentRecord = formData;
                snapshotForm();
                showSuccess(res?.ErrorMessage || 'Record saved successfully');
                setMode('VIEW');
            } else {
                showError(res?.ErrorMessage || 'Failed to save record');
            }
        } catch (error) {
            console.error('[SI-EFT] Save error:', error);
            showError('Failed to save: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function deleteRecord() {
        if (!state.currentRecord) {
            showMessage('No record to delete', 'warning');
            return;
        }

        AppCore.showConfirmation({
            title: 'Confirm Delete',
            message: 'Are you sure you want to delete this standing instruction?',
            confirmButtonText: 'Delete',
            confirmButtonClass: 'btn-danger',
            onConfirm: async () => {
                console.log('[SI-EFT] Deleting record...');
                showLoading(true);

                try {
                    const payload = {
                        AccountID: state.accountId,
                        OurBranchID: state.branchId,
                        OperatorID: state.operatorId,
                        StandingInstructionID: state.currentRecord.StandingInstructionID
                    };

                    const res = await AppCore.invokeControllerAsync(API.DELETE, payload);

                    if (res && res.Success) {
                        showSuccess(res?.ErrorMessage || 'Record deleted');
                        clearForm();
                        state.currentRecord = null;
                        setMode('VIEW');
                    } else {
                        showError(res?.ErrorMessage || 'Failed to delete record');
                    }
                } catch (error) {
                    console.error('[SI-EFT] Delete error:', error);
                    showError('Failed to delete: ' + error.message);
                } finally {
                    showLoading(false);
                }
            }
        });
    }

    async function stopInstruction() {
        if (!state.currentRecord) {
            showMessage('No record to stop', 'warning');
            return;
        }

        AppCore.showConfirmation({
            title: 'Confirm Stop',
            message: 'Are you sure you want to stop this standing instruction?',
            confirmButtonText: 'Stop',
            confirmButtonClass: 'btn-warning',
            onConfirm: async () => {
                console.log('[SI-EFT] Stopping instruction...');
                showLoading(true);

                try {
                    const payload = {
                        AccountID: state.accountId,
                        OurBranchID: state.branchId,
                        OperatorID: state.operatorId,
                        StandingInstructionID: state.currentRecord.StandingInstructionID
                    };

                    const res = await AppCore.invokeControllerAsync(API.STOP, payload);

                    if (res && res.Success) {
                        const statusEl = document.getElementById('spn_standingInstructionStatus');
                        if (statusEl) statusEl.textContent = 'Stopped';
                        showSuccess(res?.ErrorMessage || 'Standing instruction stopped');
                        await loadData();
                    } else {
                        showError(res?.ErrorMessage || 'Failed to stop instruction');
                    }
                } catch (error) {
                    console.error('[SI-EFT] Stop error:', error);
                    showError('Failed to stop: ' + error.message);
                } finally {
                    showLoading(false);
                }
            }
        });
    }

    async function navigateRecord(direction) {
        console.log('[SI-EFT] Navigating:', direction > 0 ? 'next' : 'prev');
        showLoading(true);

        try {
            const payload = {
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                StandingInstructionID: state.currentRecord?.StandingInstructionID || '',
                Direction: direction,
                DirectionType: direction > 0 ? 'NEXT' : 'PREV'
            };

            const res = await AppCore.invokeControllerAsync(API.GET, payload);

            if (res && res.Success && (res.Data || res.Details)) {
                const data = res.Data || res.Details;
                state.currentRecord = Array.isArray(data) ? data[0] : data;
                populateForm(state.currentRecord);
                snapshotForm();
                showSuccess('Record loaded');
            } else {
                showMessage('No more records', 'info');
            }
        } catch (error) {
            console.error('[SI-EFT] Navigate error:', error);
            showError('Failed to navigate: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    /* ====================================================================
       SEARCH MODALS
       ==================================================================== */
    let _searchModal = null;

    function initSearchModals() {
        if (typeof window.SearchModal === 'undefined') {
            setTimeout(initSearchModals, 500);
            return;
        }
        _searchModal = new window.SearchModal(window.AppCore);
        console.log('[SI-EFT] SearchModal initialized');
    }

    function openSearchModal(type) {
        if (!_searchModal) {
            showMessage('Search modal not ready, please try again', 'warning');
            return;
        }

        const branchId = document.getElementById('txt_branchId')?.value?.trim() || state.branchId || '';

        const configs = {
            branch: {
                tableID: 'BranchID',
                onSelect: (rec) => {
                    document.getElementById('txt_branchId').value   = rec.OurBranchID || rec.BranchID || '';
                    document.getElementById('txt_branchName').value = rec.BranchName  || rec.Name    || '';
                    state.branchId = rec.OurBranchID || rec.BranchID || state.branchId;
                }
            },
            account: {
                tableID: 'AccountID',
                whereStmt: branchId ? `OurBranchID='${branchId}'` : '',
                onSelect: (rec) => {
                    document.getElementById('txt_accountId').value   = rec.AccountID   || '';
                    document.getElementById('txt_accountName').value = rec.AccountName || rec.Name || '';
                    state.accountId = rec.AccountID || state.accountId;
                }
            },
            bank: {
                tableID: 'MastClrBankID',
                onSelect: (rec) => {
                    document.getElementById('txt_bankId').value   = rec.BankID   || rec.ClearingBankID || rec.ID   || '';
                    document.getElementById('txt_bankName').value = rec.BankName || rec.ClearingBankName || rec.Name || '';
                }
            },
            currency: {
                tableID: 'BranchCurrencyID',
                advFilterString: branchId ? `OurBranchID='${branchId}'` : '',
                onSelect: (rec) => {
                    document.getElementById('txt_transactionCurrencyId').value   = rec.CurrencyID          || rec.ID          || '';
                    document.getElementById('txt_transactionCurrencyName').value = rec.CurrencyDescription || rec.Description || rec.CurrencyName || rec.Name || '';
                }
            },
            beneficiaryBranch: {
                tableID: 'ClearingBranchID',
                advFilterString: (() => {
                    const bankId = document.getElementById('txt_bankId')?.value?.trim();
                    return bankId ? `BankID='${bankId}'` : '';
                })(),
                onSelect: (rec) => {
                    document.getElementById('txt_beneficiaryBranchId').value   = rec.ClearingBranchID || rec.BranchID || rec.OurBranchID || '';
                    document.getElementById('txt_beneficiaryBranchName').value = rec.ClearingBranchName || rec.BranchName || rec.Name || '';
                }
            },
            standingInstruction: {
                tableID: 'InstructionID',
                onSelect: (rec) => {
                    document.getElementById('txt_standingInstructionId').value   = rec.InstructionID || rec.StandingInstructionID || rec.ID   || '';
                    document.getElementById('txt_standingInstructionName').value = rec.AccountID     || rec.AccountName          || rec.Name || '';
                }
            }
        };

        const config = configs[type];
        if (!config) {
            console.warn('[SI-EFT] Unknown lookup type:', type);
            return;
        }

        _searchModal.open(config).catch(err => {
            console.error('[SI-EFT] Search modal error:', err);
            showMessage('Error opening search', 'error');
        });
    }

    /* ====================================================================
       UTILITIES
       ==================================================================== */
    function formatDate(dateString) {
        if (!dateString || dateString === '-') return '-';
        try {
            const date = new Date(dateString);
            if (window.GlobalUtils?.formatDateTime) {
                return window.GlobalUtils.formatDateTime(dateString);
            }
            return isNaN(date.getTime()) ? dateString : date.toLocaleString();
        } catch (e) {
            return dateString;
        }
    }

    function showLoading(show) {
        const overlay = document.getElementById('dv_loadingOverlay');
        if (overlay) overlay.hidden = !show;
    }

    function toggleMaximize() {
        const win = document.querySelector('.window');
        if (win) win.classList.toggle('maximized');
    }

    function closeModule() {
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ action: 'submoduleClosed', source: 'Standing Instruction EFT' }, '*');
        }
    }

    function showSuccess(message) { showMessage(message, 'success'); }
    function showError(message)   { showMessage(message, 'error'); }

    function showMessage(text, type) {
        const panel = document.querySelector('.am-message-panel');
        if (!panel) return;
        const icon = panel.querySelector('i');
        const span = panel.querySelector('.message-text');
        const icons = {
            success: 'bi bi-check-circle',
            error:   'bi bi-exclamation-circle',
            warning: 'bi bi-exclamation-triangle',
            info:    'bi bi-info-circle'
        };
        if (icon) icon.className = icons[type] || icons.info;
        if (span) span.textContent = text;
        panel.className = `am-message-panel am-message-panel--${type || 'info'}`;
        panel.hidden = false;
        setTimeout(() => { panel.hidden = true; }, type === 'error' ? 5000 : 3000);
    }

    /* ====================================================================
       PUBLIC API
       ==================================================================== */
    return {
        init,
        loadData,
        saveRecord,
        deleteRecord,
        stopInstruction,
        setMode,
        cancelChanges: () => { cancelChanges(); setMode('VIEW'); }
    };
})();

// Auto-initialize
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => window.SIEFTModule?.init());
} else {
    window.SIEFTModule?.init();
}

console.log('✅ Standing Instruction EFT module loaded');
