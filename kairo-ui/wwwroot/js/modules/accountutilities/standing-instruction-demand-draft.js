/**
 * Standing Instruction Demand Draft Module
 * Manages SI Demand Draft CRUD operations
 */

window.SIDemandDraftModule = (function () {
    'use strict';

    const state = {
        accountId: null,
        branchId: null,
        operatorId: null,
        standingInstructionId: null,
        referenceNo: null,
        currentMode: 'VIEW',
        currentRecord: null,
        originalData: null
    };

    const API = {
        GET:    '/AccountUtilities/api/get-si-demand-draft',
        CREATE: '/AccountUtilities/api/create-si-demand-draft',
        UPDATE: '/AccountUtilities/api/update-si-demand-draft',
        DELETE: '/AccountUtilities/api/delete-si-demand-draft',
        STOP:   '/AccountUtilities/api/stop-si-demand-draft',
        DROPDOWN: '/AccountUtilities/StandingInstructionDemandDraft/get-dropdown-options'
    };

    const STATIC_SELECT_OPTIONS = {
        ddl_amountIn: [
            { value: 'T', label: 'Transaction CurrencyID' },
            { value: 'F', label: 'Transfer CurrencyID' }
        ],
        ddl_mailingAddress: [
            { value: 'R', label: 'Residential Address' },
            { value: 'O', label: 'Office Address' }
        ]
    };

    /* ====================================================================
       INIT
       ==================================================================== */
    async function init() {
        console.log('[SI-DD] Initializing module...');
        getContext();
        wireHeaderControls();
        wireActionButtons();
        wireSectionToggles();
        wireLookupButtons();
        initSearchModals();
        initStaticSelects();
        await loadDropdowns();
        setMode('VIEW');
    }

    async function loadDropdowns() {
        try {
            const [siTypeOptions, chargeRecoveryOptions, transferFrequencyOptions] = await Promise.all([
                fetchDropdownOptions('SITypeID').catch(() => []),
                fetchDropdownOptions('SIChargeTypeID').catch(() => []),
                fetchDropdownOptions('TrfFrequencyID').catch(() => [])
            ]);

            populateSelect('ddl_siTransferType', siTypeOptions, '--Select--');
            populateSelect('ddl_chargeRecovery', chargeRecoveryOptions, '--Select--');
            populateSelect('ddl_transferFrequency', transferFrequencyOptions, '--Select--');

            if (state.currentRecord) {
                populateForm(state.currentRecord);
            }
        } catch (error) {
            console.error('[SI-DD] Failed to load dropdowns:', error);
        }
    }

    function initStaticSelects() {
        populateSelect('ddl_amountIn', STATIC_SELECT_OPTIONS.ddl_amountIn, '--Select--');
        populateSelect('ddl_mailingAddress', STATIC_SELECT_OPTIONS.ddl_mailingAddress, '--Select--');
    }

    async function fetchDropdownOptions(codeId, valueField) {
        let url = `${API.DROPDOWN}?codeId=${encodeURIComponent(codeId)}`;
        if (valueField) {
            url += `&valueField=${encodeURIComponent(valueField)}`;
        }

        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const result = await response.json();
        if (!result.success) {
            throw new Error(result.message || 'Failed to load options');
        }

        return result.data || [];
    }

    function populateSelect(selectId, options, placeholder) {
        const select = document.getElementById(selectId);
        if (!select) return;

        const currentValue = select.value;
        select.innerHTML = `<option value="">${placeholder || '--Select--'}</option>`;

        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value ?? '';
            option.textContent = opt.label ?? opt.value ?? '';
            select.appendChild(option);
        });

        if (currentValue) {
            ensureSelectOption(selectId, currentValue, resolveSelectLabel(selectId, currentValue));
        }
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
            'view':   () => {
                // Always sync latest values from the form
                const siIdFromInput = document.getElementById('txt_standingInstructionId')?.value?.trim();
                if (siIdFromInput) {
                    state.standingInstructionId = siIdFromInput;
                }

                const referenceNoFromInput = document.getElementById('txt_referenceNo')?.value?.trim();
                if (referenceNoFromInput) {
                    state.referenceNo = referenceNoFromInput;
                }

                // If we still don't have an SI ID, first open the Standing Instruction lookup,
                // then load data for the selected instruction (matches legacy behaviour of selecting SI first).
                if (!state.standingInstructionId) {
                    showMessage('Select a Standing Instruction first', 'warning');
                    openSearchModal('standingInstruction');
                    return;
                }

                loadData();
            },
            'add':    () => {
                snapshotForm();
                clearForm();
                state.currentRecord = null;
                state.standingInstructionId = null;
                state.referenceNo = null;
                setMode('ADD');
                focusField('txt_accountId');
            },
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
       MODE MANAGEMENT
       ==================================================================== */
    function setMode(mode) {
        console.log('[SI-DD] Setting mode:', mode);
        state.currentMode = mode;

        const isEditing = mode === 'ADD' || mode === 'EDIT';
        const formCard = document.querySelector('[data-main-form]');
        if (formCard) {
            formCard.querySelectorAll('input:not([readonly]), select, textarea').forEach(el => {
                el.disabled = !isEditing;
            });
            const cb = document.getElementById('chk_accountPayee');
            if (cb) cb.disabled = !isEditing;
        }

        // Allow manual entry of Branch ID when adding/editing (matches legacy behaviour)
        const branchInput = document.getElementById('txt_branchId');
        if (branchInput) {
            branchInput.readOnly = !isEditing;
        }

        // Standing Instruction ID is always readonly (auto-generated on ADD, lookup-only on EDIT/VIEW)
        const siIdInput = document.getElementById('txt_standingInstructionId');
        if (siIdInput) siIdInput.readOnly = true;

        // Hide search button in ADD mode (ID will be auto-generated); show it in VIEW/EDIT
        const siLookupBtn = document.querySelector('[data-open-search="standingInstruction"]');
        if (siLookupBtn) siLookupBtn.style.display = mode === 'ADD' ? 'none' : '';

        const buttons = {
            'view':   { disabled: isEditing },
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
            if (key) snapshot.set(key, el.type === 'checkbox' ? el.checked : el.value);
        });
    }

    function restoreForm() {
        const formCard = document.querySelector('[data-main-form]');
        if (!formCard) return;
        formCard.querySelectorAll('input, select, textarea').forEach(el => {
            const key = el.name || el.id;
            if (snapshot.has(key)) {
                if (el.type === 'checkbox') el.checked = snapshot.get(key);
                else el.value = String(snapshot.get(key) ?? '');
            }
        });
    }

    function clearForm() {
        const formCard = document.querySelector('[data-main-form]');
        if (!formCard) return;
        formCard.querySelectorAll('input:not([readonly]), select, textarea').forEach(el => {
            el.value = '';
        });
        const cb = document.getElementById('chk_accountPayee');
        if (cb) cb.checked = false;

        const generatedIdField = document.getElementById('txt_standingInstructionId');
        if (generatedIdField) generatedIdField.value = '';

        state.referenceNo = null;

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
            SITransferType:       val('ddl_siTransferType'),
            EffectiveDate:        val('ddl_effectiveDate'),
            TransferCurrencyID:   val('txt_transferCurrencyId'),
            AmountIn:             val('ddl_amountIn'),
            FixedAmount:          parseFloat(val('txt_fixedAmount')) || 0,
            BeneficiaryName:      val('txt_beneficiaryName'),
            AccountPayee:         document.getElementById('chk_accountPayee')?.checked || false,
            PayeeAccountID:       val('txt_payeeAccountId'),
            PayableAt:            val('txt_payableAt'),
            TransferFrequency:    val('ddl_transferFrequency'),
            NoOfExecution:        parseInt(val('txt_noOfExecution')) || 0,
            RegularExecutionDay:  parseInt(val('txt_regularExecutionDay')) || 0,
            FirstExecutionDate:   val('ddl_firstExecutionDate'),
            ChargeRecovery:       val('ddl_chargeRecovery'),
            MailingAddress:       val('ddl_mailingAddress'),
            Address1:             val('txt_address1'),
            Address2:             val('txt_address2'),
            City:                 val('ddl_city'),
            ZipCode:              val('txt_zipCode'),
            Phone:                val('txt_phone'),
            LandMark:             val('txt_landMark')
        };
    }

    function populateForm(data) {
        if (!data) return;
        const set = (id, value) => {
            const el = document.getElementById(id);
            if (el) {
                if (el.type === 'checkbox') {
                    el.checked = !!value;
                } else if (el.tagName === 'SELECT') {
                    ensureSelectOption(id, value, resolveSelectLabel(id, value));
                } else {
                    el.value = value ?? '';
                }
            }
        };

        set('txt_branchId',                data.OurBranchID || data.BranchID);
        set('txt_branchName',              data.BranchName);
        set('txt_accountId',               data.AccountID);
        set('txt_accountName',             data.AccountName);
        set('txt_standingInstructionId',   data.StandingInstructionID || data.SIID || data.InstructionID);
        set('txt_referenceNo',             data.ReferenceNo);
        set('ddl_siTransferType',          data.SITransferType);
        set('ddl_effectiveDate',           data.EffectiveDate);
        set('txt_transferCurrencyId',      data.TransferCurrencyID);
        set('txt_transferCurrencyName',    data.CurrencyName || data.TransferCurrencyName);
        set('ddl_amountIn',                data.AmountIn);
        set('txt_fixedAmount',             data.FixedAmount);
        set('ddl_transferFrequency',       data.TransferFrequency);
        set('txt_noOfExecution',           data.NoOfExecution);
        set('txt_regularExecutionDay',     data.RegularExecutionDay);
        set('ddl_chargeRecovery',          data.ChargeRecovery);
        set('ddl_firstExecutionDate',      data.FirstExecutionDate);
        set('txt_lastExecutionDate',       data.LastExecutionDate);
        set('txt_beneficiaryName',         data.BeneficiaryName);
        set('chk_accountPayee',            data.AccountPayee);
        set('txt_payeeAccountId',          data.PayeeAccountID);
        set('txt_payableAt',               data.PayableAt);
        set('ddl_mailingAddress',          data.MailingAddress || data.MailingAddressID);
        set('txt_address1',                data.Address1);
        set('txt_address2',                data.Address2);
        set('ddl_city',                    data.City || data.CityID);
        set('txt_zipCode',                 data.ZipCode);
        set('txt_phone',                   data.Phone);
        set('txt_landMark',                data.LandMark);

        state.standingInstructionId = data.StandingInstructionID || data.SIID || data.InstructionID || state.standingInstructionId;
        state.referenceNo = data.ReferenceNo ?? state.referenceNo;

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
        return true;
    }

    /* ====================================================================
       API CALLS
       ==================================================================== */
    async function loadData() {
        const standingInstructionId = document.getElementById('txt_standingInstructionId')?.value?.trim() || state.standingInstructionId || '';
        const referenceNo = document.getElementById('txt_referenceNo')?.value?.trim() || state.referenceNo || state.currentRecord?.ReferenceNo || '';

        if (!standingInstructionId && !state.accountId) {
            showMessage('Please select a Standing Instruction first', 'warning');
            return;
        }

        state.standingInstructionId = standingInstructionId || state.standingInstructionId;
        state.referenceNo = referenceNo || state.referenceNo;

        console.log('[SI-DD] Loading data...');
        showLoading(true);

        try {
            const payload = {
                SearchKey:  `[${state.branchId}:${state.accountId}]`,
                SearchID:   standingInstructionId || '',
                StandingInstructionID: standingInstructionId || '',
                ReferenceNo: referenceNo || 0,
                AccountID:  state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                Direction: 0
            };

            const result = await apiPost(API.GET, payload);
            console.log('[SI-DD] Load response:', result);

            if (isSuccess(result)) {
                const data = result?.Details || result?.Data || result?.data;
                state.currentRecord = Array.isArray(data) ? data[0] : data;
                populateForm(state.currentRecord);
                snapshotForm();
                showSuccess('Data loaded successfully');
            } else {
                showMessage(result?.ResponseMessage || 'No record found', 'info');
            }
        } catch (error) {
            console.error('[SI-DD] Load error:', error);
            showError('Failed to load data: ' + error.message);
        } finally {
            showLoading(false);
            setMode('VIEW');
        }
    }

    async function saveRecord() {
        if (!validateForm()) return;
        console.log('[SI-DD] Saving record...');
        showLoading(true);

        try {
            const formData = getFormData();
            formData.OperatorID = state.operatorId;

            const endpoint = state.currentMode === 'ADD' ? API.CREATE : API.UPDATE;
            const result = await apiPost(endpoint, formData);

            if (isSuccess(result)) {
                const responseData = getResponseData(result);
                const savedRecord = mergeSavedRecord(formData, responseData);

                state.currentRecord = savedRecord;
                state.standingInstructionId = savedRecord.StandingInstructionID || state.standingInstructionId;

                if (savedRecord.StandingInstructionID) {
                    document.getElementById('txt_standingInstructionId').value = savedRecord.StandingInstructionID;
                }

                if (responseData) {
                    populateForm(savedRecord);
                }

                snapshotForm();
                showSuccess(result?.ResponseMessage || 'Record saved successfully');
                setMode('VIEW');
            } else {
                showError(result?.ResponseMessage || 'Failed to save record');
            }
        } catch (error) {
            console.error('[SI-DD] Save error:', error);
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
        if (!confirm('Are you sure you want to delete this standing instruction?')) return;

        console.log('[SI-DD] Deleting record...');
        showLoading(true);

        try {
            const standingInstructionId = state.currentRecord?.StandingInstructionID || state.currentRecord?.SIID || state.standingInstructionId || '';
            const referenceNo = state.currentRecord?.ReferenceNo || state.referenceNo || 0;
            const payload = {
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                StandingInstructionID: standingInstructionId,
                ReferenceNo: referenceNo
            };

            const result = await apiPost(API.DELETE, payload);

            if (isSuccess(result)) {
                showSuccess(result?.ResponseMessage || 'Record deleted');
                clearForm();
                state.currentRecord = null;
                setMode('VIEW');
            } else {
                showError(result?.ResponseMessage || 'Failed to delete record');
            }
        } catch (error) {
            console.error('[SI-DD] Delete error:', error);
            showError('Failed to delete: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function stopInstruction() {
        if (!state.currentRecord) {
            showMessage('No record to stop', 'warning');
            return;
        }
        if (!confirm('Are you sure you want to stop this standing instruction?')) return;

        console.log('[SI-DD] Stopping instruction...');
        showLoading(true);

        try {
            const standingInstructionId = state.currentRecord?.StandingInstructionID || state.currentRecord?.SIID || state.standingInstructionId || '';
            const referenceNo = state.currentRecord?.ReferenceNo || state.referenceNo || 0;
            const payload = {
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                StandingInstructionID: standingInstructionId,
                ReferenceNo: referenceNo
            };

            const result = await apiPost(API.STOP, payload);

            if (isSuccess(result)) {
                const statusEl = document.getElementById('spn_standingInstructionStatus');
                if (statusEl) statusEl.textContent = 'Stopped';
                showSuccess(result?.ResponseMessage || 'Standing instruction stopped');
                await loadData();
            } else {
                showError(result?.ResponseMessage || 'Failed to stop instruction');
            }
        } catch (error) {
            console.error('[SI-DD] Stop error:', error);
            showError('Failed to stop: ' + error.message);
        } finally {
            showLoading(false);
        }
    }

    async function navigateRecord(direction) {
        console.log('[SI-DD] Navigating:', direction > 0 ? 'next' : 'prev');
        showLoading(true);

        try {
            const standingInstructionId = state.currentRecord?.StandingInstructionID || state.currentRecord?.SIID || state.standingInstructionId || '';
            const referenceNo = state.currentRecord?.ReferenceNo || state.referenceNo || 0;
            const payload = {
                AccountID: state.accountId,
                OurBranchID: state.branchId,
                OperatorID: state.operatorId,
                SearchID: standingInstructionId,
                StandingInstructionID: standingInstructionId,
                ReferenceNo: referenceNo,
                Direction: direction,
                DirectionType: direction > 0 ? 'NEXT' : 'PREV'
            };

            const result = await apiPost(API.GET, payload);

            if (isSuccess(result)) {
                const data = result?.Details || result?.Data || result?.data;
                state.currentRecord = Array.isArray(data) ? data[0] : data;
                populateForm(state.currentRecord);
                snapshotForm();
                showSuccess('Record loaded');
            } else {
                showMessage('No more records', 'info');
            }
        } catch (error) {
            console.error('[SI-DD] Navigate error:', error);
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
        console.log('[SI-DD] SearchModal initialized');
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
            currency: {
                tableID: 'BranchCurrencyID',
                advFilterString: branchId ? `OurBranchID='${branchId}'` : '',
                onSelect: (rec) => {
                    document.getElementById('txt_transferCurrencyId').value   = rec.CurrencyID          || rec.ID          || '';
                    document.getElementById('txt_transferCurrencyName').value = rec.CurrencyDescription || rec.Description || rec.CurrencyName || rec.Name || '';
                }
            },
            standingInstruction: {
                tableID: 'InstructionID',
                moduleID: '1920',
                whereStmt: branchId ? `OurBranchID='${branchId}'` : '',
                ourbranchId: branchId,
                onSelect: (rec) => {
                    const siId = rec.SIID || rec.InstructionID || rec.StandingInstructionID || rec.ID || '';
                    document.getElementById('txt_standingInstructionId').value = siId;
                    document.getElementById('txt_referenceNo').value = rec.ReferenceNo || '';
                    state.standingInstructionId = siId;
                    state.referenceNo = rec.ReferenceNo || null;
                    // The InstructionID lookup only returns the ID; load the full record
                    // to populate description and all other fields (matches loan application pattern)
                    loadData();
                }
            }
        };

        const config = configs[type];
        if (!config) {
            console.warn('[SI-DD] Unknown lookup type:', type);
            return;
        }

        _searchModal.open(config).catch(err => {
            console.error('[SI-DD] Search modal error:', err);
            showMessage('Error opening search', 'error');
        });
    }

    /* ====================================================================
       UTILITIES
       ==================================================================== */
    async function apiPost(url, payload) {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        return response.json();
    }

    function isSuccess(result) {
        return result?.ResponseCode === '00' || result?.ResponseCode === 0 ||
               result?.success === true || result?.Success === true;
    }

    function getResponseData(result) {
        const data = result?.Details || result?.Data || result?.data;
        return Array.isArray(data) ? data[0] : data;
    }

    function mergeSavedRecord(formData, responseData) {
        if (!responseData || typeof responseData !== 'object') {
            return { ...formData };
        }

        return {
            ...formData,
            ...responseData,
            StandingInstructionID:
                responseData.StandingInstructionID ||
                responseData.SIID ||
                responseData.InstructionID ||
                formData.StandingInstructionID ||
                ''
        };
    }

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

    function ensureSelectOption(id, value, label) {
        const select = document.getElementById(id);
        if (!select) return;

        const normalizedValue = value ?? '';
        if (!normalizedValue) {
            select.value = '';
            return;
        }

        const valueAsString = String(normalizedValue);
        let option = Array.from(select.options).find(item => item.value === valueAsString);

        if (!option) {
            option = document.createElement('option');
            option.value = valueAsString;
            option.textContent = label || valueAsString;
            select.appendChild(option);
        }

        select.value = valueAsString;
    }

    function resolveSelectLabel(id, value) {
        if (value === null || value === undefined || value === '') {
            return '';
        }

        const valueAsString = String(value);
        const staticOption = (STATIC_SELECT_OPTIONS[id] || []).find(option => option.value === valueAsString);
        if (staticOption) {
            return staticOption.label;
        }

        if (id === 'ddl_effectiveDate' || id === 'ddl_firstExecutionDate') {
            return formatDateOnly(valueAsString);
        }

        return valueAsString;
    }

    function formatDateOnly(dateString) {
        if (!dateString) {
            return '';
        }

        const date = new Date(dateString);
        if (Number.isNaN(date.getTime())) {
            return dateString;
        }

        return date.toLocaleDateString();
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
            window.parent.postMessage({ action: 'submoduleClosed', source: 'Standing Instruction Demand Draft' }, '*');
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
    document.addEventListener('DOMContentLoaded', () => window.SIDemandDraftModule?.init());
} else {
    window.SIDemandDraftModule?.init();
}

console.log('✅ Standing Instruction Demand Draft module loaded');
