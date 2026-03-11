/**
 * Direct Debit Maintenance Module
 * Standardized for KAIRO MVC using AppCore.invokeControllerAsync
 */
window.DirectDebitMaintenanceModule = (function () {
    'use strict';

    // Module State
    const state = {
        submoduleName: 'DirectDebitMaintenance',
        moduleId: '3079',
        currentMode: 'VIEW', // VIEW, ADD, EDIT
        isDirty: false,
        selectedIndex: -1,
        searchKey: null,
        lastViewedKey: null,
        amountTypeId: 'T'
    };

    let searchModal = null;

    // Elements
    const elements = {
        form: document.getElementById('frm_directDebitMaintenance'),
        mainForm: document.querySelector('[data-main-form]'),
        loadingOverlay: document.getElementById('dv_loadingOverlay'),
        msgPanel: document.querySelector('.am-message-panel'),
        msgText: document.querySelector('.message-text')
    };

    // Action Buttons
    const buttons = {
        view: document.getElementById('btn_view'),
        add: document.getElementById('btn_add'),
        edit: document.getElementById('btn_edit'),
        save: document.getElementById('btn_save'),
        cancel: document.getElementById('btn_cancel'),
        delete: document.getElementById('btn_delete'),
        stop: document.getElementById('btn_stop'),
        print: document.getElementById('btn_print'),

        searchBranch: document.getElementById('btn_searchBranch'),
        searchAccount: document.getElementById('btn_searchAccount'),
        searchDDInstruction: document.getElementById('btn_searchDDInstruction'),
        searchCurrency: document.getElementById('btn_searchCurrency'),
        searchContraBank: document.getElementById('btn_searchContraBank'),
        searchContraBranch: document.getElementById('btn_searchContraBranch'),
        sectionToggles: document.querySelectorAll('.section-toggle-btn')
    };

    // API Endpoints (mapped to AccountUtilitiesController)
    const API = {
        GET: 'AccountUtilities/api/get-direct-debit-maintenance',
        CREATE: 'AccountUtilities/api/create-direct-debit-maintenance',
        UPDATE: 'AccountUtilities/api/update-direct-debit-maintenance',
        DELETE: 'AccountUtilities/api/delete-direct-debit-maintenance',
        STOP: 'AccountUtilities/api/stop-direct-debit-maintenance',
        ADD_LOCK: 'AccountUtilities/api/add-direct-debit-lock',
        RELEASE_LOCK: 'AccountUtilities/api/release-direct-debit-lock'
    };

    // ─────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────

    function init() {
        console.log('🚀 Initializing Direct Debit Maintenance module...');
        
        searchModal = new SearchModal(window.AppCore);

        wireButtons();
        wireLookups();
        wireFormChanges();
        wireSectionToggles();

        setMode('VIEW');
        
        // Formulate window controls
        document.querySelector('[data-action="close"]')?.addEventListener('click', async () => {
            if (state.isDirty) {
                const confirmed = await showConfirmationDialog('Close Window', 'You have unsaved changes. Are you sure you want to close?');
                if (!confirmed) return;
            }
            window.close(); // Or navigate back
            window.location.href = '/Dashboard/Index';
        });
        document.querySelector('[data-action="refresh"]')?.addEventListener('click', () => {
            if (state.searchKey) loadData(state.searchKey);
            else clearForm();
        });

        console.log('✅ DirectDebitMaintenanceModule initialized');
    }

    // ─────────────────────────────────────────────────────────────
    // Form & UI State Management
    // ─────────────────────────────────────────────────────────────

    function setMode(mode) {
        state.currentMode = mode;
        const isEditing = mode === 'ADD' || mode === 'EDIT';
        const hasLoadedRecord = Boolean(state.searchKey);

        // Enable/Disable form fields
        const inputs = elements.mainForm
            ? elements.mainForm.querySelectorAll('input:not([readonly]):not([type="hidden"]), select:not([readonly]), textarea:not([readonly])')
            : [];
        inputs.forEach(el => el.disabled = !isEditing);
        
        // Special lookup buttons
        const lookups = [buttons.searchBranch, buttons.searchAccount, buttons.searchDDInstruction, buttons.searchCurrency, buttons.searchContraBank, buttons.searchContraBranch];
        lookups.forEach(btn => { if (btn) btn.disabled = !isEditing; });

        // In View Mode, DD Instruction search is used to load data
        if (mode === 'VIEW') {
            if (buttons.searchDDInstruction) buttons.searchDDInstruction.disabled = false;
        }

        // Action Buttons
        if (mode === 'VIEW') {
            if (buttons.view) buttons.view.disabled = hasLoadedRecord;
            if (buttons.add) buttons.add.disabled = hasLoadedRecord;
            if (buttons.edit) buttons.edit.disabled = !hasLoadedRecord;
            if (buttons.delete) buttons.delete.disabled = !hasLoadedRecord;
            if (buttons.stop) buttons.stop.disabled = !hasLoadedRecord;
            if (buttons.print) buttons.print.disabled = !hasLoadedRecord;
            if (buttons.save) buttons.save.disabled = true;
            if (buttons.cancel) buttons.cancel.disabled = !hasLoadedRecord;
        } else {
            if (buttons.view) buttons.view.disabled = true;
            if (buttons.add) buttons.add.disabled = true;
            if (buttons.edit) buttons.edit.disabled = true;
            if (buttons.delete) buttons.delete.disabled = true;
            if (buttons.stop) buttons.stop.disabled = true;
            if (buttons.print) buttons.print.disabled = true;
            if (buttons.save) buttons.save.disabled = false;
            if (buttons.cancel) buttons.cancel.disabled = false;
        }

        if (!isEditing) {
            state.isDirty = false;
        }

        clearMessages();
    }

    function clearForm() {
        if (elements.form) {
            elements.form.reset();
        }

        if (elements.mainForm) {
            const fields = elements.mainForm.querySelectorAll('input, select, textarea');
            fields.forEach(field => {
                if (field.matches('button, [type="button"], [type="submit"], [type="reset"], [type="hidden"]')) {
                    return;
                }

                if (field.type === 'checkbox' || field.type === 'radio') {
                    field.checked = false;
                    return;
                }

                field.value = '';
            });
        }
        
        // Clear pseudo-readonly lookup descriptions
        document.getElementById('txt_branchName').value = '';
        document.getElementById('txt_accountName').value = '';
        document.getElementById('txt_directDebitInstructionName').value = '';
        document.getElementById('txt_transactionCurrencyName').value = '';
        document.getElementById('txt_bankName').value = '';
        document.getElementById('txt_contraBranchName').value = '';
        document.getElementById('txt_standingInstructionStatus').value = '';
        document.getElementById('txt_originatorRef').value = '';
        document.getElementById('txt_policyNumber1').value = '';
        document.getElementById('txt_policyNumber2').value = '';
        document.getElementById('txt_returnCode').value = '00';
        
        // Clear audit
        document.getElementById('spn_nextExecutionDate').textContent = '-';
        document.getElementById('spn_lastRunDate').textContent = '-';
        document.getElementById('spn_lastRunStatus').textContent = '-';
        document.getElementById('spn_noOfTimesFailed').textContent = '-';
        document.getElementById('spn_stoppedReason').textContent = '-';
        document.getElementById('spn_createdBy').textContent = '-';
        document.getElementById('spn_createdOn').textContent = '-';
        document.getElementById('spn_modifiedBy').textContent = '-';
        document.getElementById('spn_modifiedOn').textContent = '-';
        document.getElementById('spn_stoppedBy').textContent = '-';
        document.getElementById('spn_stoppedOn').textContent = '-';
        document.getElementById('spn_supervisedBy').textContent = '-';
        document.getElementById('spn_supervisedOn').textContent = '-';

        state.searchKey = null;
        state.amountTypeId = 'T';
        state.isDirty = false;
    }

    function wireFormChanges() {
        if (!elements.mainForm) return;
        ['change', 'input'].forEach(evt => {
            elements.mainForm.addEventListener(evt, () => {
                if (state.currentMode !== 'VIEW') {
                    state.isDirty = true;
                }
            });
        });
    }

    function wireSectionToggles() {
        buttons.sectionToggles.forEach(btn => {
            const header = btn.closest('.section-header');
            header.addEventListener('click', () => {
                const content = header.nextElementSibling;
                if (!content) return;
                
                const isHidden = content.hasAttribute('hidden');
                if (isHidden) {
                    content.removeAttribute('hidden');
                    btn.innerHTML = '<i class="bi bi-chevron-up"></i>';
                    btn.setAttribute('aria-expanded', 'true');
                } else {
                    content.setAttribute('hidden', '');
                    btn.innerHTML = '<i class="bi bi-chevron-down"></i>';
                    btn.setAttribute('aria-expanded', 'false');
                }
            });
        });
    }

    // ─────────────────────────────────────────────────────────────
    // Alerts & UI Feedback
    // ─────────────────────────────────────────────────────────────

    function showLoading(show) {
        if (elements.loadingOverlay) {
            if (show) elements.loadingOverlay.removeAttribute('hidden');
            else elements.loadingOverlay.setAttribute('hidden', '');
        }
    }

    function hasAppCoreDialogs() {
        return Boolean(window.AppCore && typeof window.AppCore.showDialog === 'function');
    }

    async function showAlertDialog(title, message) {
        if (window.AppCore && typeof window.AppCore.showAlert === 'function') {
            await window.AppCore.showAlert(title, message);
            return;
        }

        alert(message);
    }

    function showMsg(msg, type = 'info') {
        if ((type === 'error' || type === 'warning') && hasAppCoreDialogs()) {
            showAlertDialog(type === 'error' ? 'Error' : 'Warning', msg);
        } else if (window.AppCore && typeof window.AppCore.showNotification === 'function') {
            window.AppCore.showNotification(msg, type);
        } else if (elements.msgPanel && elements.msgText) {
            elements.msgPanel.className = `am-message-panel am-message-panel--${type}`;
            elements.msgText.textContent = msg;
            elements.msgPanel.style.display = 'flex';
        } else {
            alert(msg);
        }
    }

    async function showConfirmationDialog(title, message) {
        if (window.AppCore && typeof window.AppCore.showConfirmation === 'function') {
            return await window.AppCore.showConfirmation(title, message);
        }

        return confirm(message);
    }

    function clearMessages() {
        if (elements.msgPanel) {
            elements.msgPanel.style.display = 'none';
        }
    }

    function getResponseValue(response, pascalKey, camelKey) {
        if (!response || typeof response !== 'object') {
            return undefined;
        }

        if (Object.prototype.hasOwnProperty.call(response, pascalKey)) {
            return response[pascalKey];
        }

        if (Object.prototype.hasOwnProperty.call(response, camelKey)) {
            return response[camelKey];
        }

        return undefined;
    }

    function getOperationResult(response) {
        const payload = getResponseValue(response, 'Data', 'data') || {};
        const status = getResponseValue(payload, 'Status', 'status');
        const message = getResponseValue(payload, 'Message', 'message')
            || getResponseValue(response, 'ErrorMessage', 'errorMessage')
            || getResponseValue(response, 'Message', 'message');
        const transportSuccess = Boolean(getResponseValue(response, 'Success', 'success'));
        const businessSuccess = status === undefined
            || status === null
            || status === ''
            || status === 0
            || status === '0'
            || status === '00'
            || status === '000';

        return {
            status,
            message,
            isSuccess: transportSuccess && businessSuccess
        };
    }

    function getSuccessMessage(response, fallbackMessage) {
        const result = getOperationResult(response);
        return result.message || fallbackMessage;
    }

    function formatAuditDate(value) {
        if (!value) {
            return '-';
        }

        if (window.GlobalUtils && typeof window.GlobalUtils.formatDateTime === 'function') {
            return window.GlobalUtils.formatDateTime(value);
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
    }

    function normalizeInputDate(value) {
        if (!value) {
            return '';
        }

        if (window.GlobalUtils && typeof window.GlobalUtils.parseDateInput === 'function') {
            return window.GlobalUtils.parseDateInput(value);
        }

        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? '' : date.toISOString().split('T')[0];
    }

    function getDirectDebitRecord(response) {
        const payload = getResponseValue(response, 'Data', 'data');
        if (!payload || typeof payload !== 'object') {
            return null;
        }

        const details = getResponseValue(payload, 'Details', 'details');
        const details01 = getResponseValue(payload, 'Details01', 'details01');
        const details02 = getResponseValue(payload, 'Details02', 'details02');

        const meta = Array.isArray(details) && details.length > 0 ? details[0] : {};
        const status = Array.isArray(details01) && details01.length > 0 ? details01[0] : {};
        const row = Array.isArray(details02) && details02.length > 0 ? details02[0] : null;

        if (!row || typeof row !== 'object') {
            return null;
        }

        return {
            ...meta,
            ...status,
            ...row
        };
    }

    function getFormData() {
        if (!elements.mainForm) return {};

        const data = {};
        const fields = elements.mainForm.querySelectorAll('input[name], select[name], textarea[name]');

        fields.forEach(field => {
            if (field.disabled) {
                return;
            }

            if ((field.type === 'checkbox' || field.type === 'radio') && !field.checked) {
                return;
            }

            data[field.name] = field.value;
        });

        data.amountTypeId = state.amountTypeId || 'T';

        return data;
    }

    function validateMainForm() {
        if (!elements.mainForm) {
            return true;
        }

        const fields = elements.mainForm.querySelectorAll('input, select, textarea');

        for (const field of fields) {
            if (field.disabled || typeof field.checkValidity !== 'function') {
                continue;
            }

            if (!field.checkValidity()) {
                if (typeof field.reportValidity === 'function') {
                    field.reportValidity();
                }

                return false;
            }
        }

        return true;
    }

    // ─────────────────────────────────────────────────────────────
    // API Operations
    // ─────────────────────────────────────────────────────────────

    async function loadData(searchKey) {
        if (!searchKey) return;
        showLoading(true);

        try {
            const req = { SearchKey: searchKey, StandingInstructionID: searchKey };
            const res = await AppCore.invokeControllerAsync(API.GET, req);
            const result = getOperationResult(res);
            const record = getDirectDebitRecord(res);

            if (result.isSuccess && record) {
                populateForm(record);
                state.searchKey = searchKey;
                state.lastViewedKey = searchKey;
                setMode('VIEW');
                showMsg('Data loaded successfully', 'success');
            } else {
                showMsg(result.message || 'Failed to load record.', 'error');
            }
        } catch (err) {
            console.error(err);
            showMsg('Error loading record. See console.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function saveData() {
        if (!validateMainForm()) {
            return;
        }

        const data = getFormData();

        showLoading(true);
        try {
            const endpoint = state.currentMode === 'ADD' ? API.CREATE : API.UPDATE;
            const res = await AppCore.invokeControllerAsync(endpoint, data);
            const result = getOperationResult(res);

            if (result.isSuccess) {
                showMsg(getSuccessMessage(res, 'Saved successfully.'), 'success');
                state.isDirty = false;
                setMode('VIEW');
                if (data.directDebitInstructionId) {
                    state.searchKey = data.directDebitInstructionId;
                    loadData(state.searchKey);
                }
            } else {
                showMsg(result.message || res?.ErrorMessage || 'Failed to save record.', 'error');
            }
        } catch (err) {
            console.error(err);
            showMsg('Error saving record.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function deleteData() {
        if (!state.searchKey) return;

        const confirmed = await showConfirmationDialog('Confirm Delete', 'Are you sure you want to delete this Direct Debit Instruction?');
        if (!confirmed) return;

        showLoading(true);
        try {
            const req = { StandingInstructionID: state.searchKey };
            const res = await AppCore.invokeControllerAsync(API.DELETE, req);
            const result = getOperationResult(res);
            if (result.isSuccess) {
                showMsg(getSuccessMessage(res, 'Deleted successfully.'), 'success');
                clearForm();
                setMode('VIEW');
            } else {
                showMsg(result.message || res?.ErrorMessage || 'Delete failed.', 'error');
            }
        } catch (err) {
            console.error(err);
            showMsg('Error deleting.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function stopData() {
        if (!state.searchKey) return;
        
        const confirmed = await showConfirmationDialog('Confirm Stop', 'Are you sure you want to stop this Standing Instruction?');
        if (!confirmed) return;

        showLoading(true);
        try {
            const locked = await addRecordLock();
            if (!locked) {
                return;
            }

            const req = { StandingInstructionID: state.searchKey };
            const res = await AppCore.invokeControllerAsync(API.STOP, req);
            const result = getOperationResult(res);
            if (result.isSuccess) {
                showMsg(getSuccessMessage(res, 'Stopped successfully.'), 'success');
                loadData(state.searchKey);
            } else {
                showMsg(result.message || res?.ErrorMessage || 'Stop failed.', 'error');
            }
        } catch (err) {
            console.error(err);
            showMsg('Error stopping.', 'error');
        } finally {
            await releaseRecordLock();
            showLoading(false);
        }
    }

    async function releaseRecordLock() {
        const branchId = document.getElementById('txt_branchId')?.value.trim();
        const siId = state.searchKey || document.getElementById('txt_directDebitInstructionId')?.value.trim();

        if (!branchId || !siId) {
            return true;
        }

        const req = {
            OurBranchID: branchId,
            StandingInstructionID: siId,
            ModuleID: Number(state.moduleId),
            LockModuleID: Number(state.moduleId),
            PKKey: `[OurBranchID:${branchId}][SIID:${siId}]`
        };

        try {
            const res = await AppCore.invokeControllerAsync(API.RELEASE_LOCK, req);
            return Boolean(res && (res.Success || res.success));
        } catch (err) {
            console.error(err);
            showMsg('Failed to release record lock.', 'warning');
            return false;
        }
    }

    async function addRecordLock() {
        const branchId = document.getElementById('txt_branchId')?.value.trim();
        const siId = state.searchKey || document.getElementById('txt_directDebitInstructionId')?.value.trim();

        if (!branchId || !siId) {
            showMsg('Branch ID and Direct Debit Instruction ID are required before editing.', 'warning');
            return false;
        }

        const req = {
            OurBranchID: branchId,
            StandingInstructionID: siId,
            ModuleID: Number(state.moduleId),
            LockModuleID: Number(state.moduleId),
            PKKey: `[OurBranchID:${branchId}][SIID:${siId}]`
        };

        try {
            const res = await AppCore.invokeControllerAsync(API.ADD_LOCK, req);
            return Boolean(res && (res.Success || res.success));
        } catch (err) {
            console.error(err);
            showMsg('Failed to add record lock.', 'warning');
            return false;
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Form Population
    // ─────────────────────────────────────────────────────────────

    function populateForm(data) {
        clearForm();
        if (!data) return;
        
        // We handle mapping generic DTOs array or object
        const row = Array.isArray(data) ? data[0] : data;
        state.amountTypeId = row.AmountTypeID || row.AmountTypeId || 'T';
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        const setSelectValue = (id, ...candidates) => {
            const el = document.getElementById(id);
            if (!el) {
                return;
            }

            const normalizedCandidates = candidates
                .filter(value => value !== undefined && value !== null && String(value).trim() !== '')
                .map(value => String(value).trim().toLowerCase());

            if (normalizedCandidates.length === 0) {
                el.value = '';
                return;
            }

            const matchedOption = Array.from(el.options || []).find(option => {
                const optionValue = String(option.value || '').trim().toLowerCase();
                const optionText = String(option.text || '').trim().toLowerCase();

                return normalizedCandidates.includes(optionValue) || normalizedCandidates.includes(optionText);
            });

            el.value = matchedOption ? matchedOption.value : candidates.find(value => value !== undefined && value !== null) || '';
        };

        const getStatusDisplay = () => {
            const rawStatus = row.StandingInstructionStatus
                || row.StatusDescription
                || row.SIStatus
                || row.Status
                || row.SIStatusID
                || row.StatusID;

            if (rawStatus === undefined || rawStatus === null || String(rawStatus).trim() === '') {
                return '';
            }

            const normalizedStatus = String(rawStatus).trim().toUpperCase();
            const statusMap = {
                A: 'Active',
                I: 'Inactive',
                S: 'Stopped',
                P: 'Pending',
                C: 'Cancelled'
            };

            return statusMap[normalizedStatus] || rawStatus;
        };

        const setDate = (id, val) => {
            const el = document.getElementById(id);
            if (el && val) {
                const parsed = normalizeInputDate(val);
                if (parsed) {
                    el.value = parsed;
                }
            }
        };

        setSelectValue(
            'ddl_directDebitType',
            row.DirectDebitTypeID,
            row.DirectDebitType,
            row.SITypeID,
            row.SIType,
            row.SITypeName,
            row.DirectDebitTypeName
        );
        
        setVal('txt_branchId', row.OurBranchID || row.BranchID);
        setVal('txt_branchName', row.BranchName);
        
        setVal('txt_accountId', row.AccountID);
        setVal('txt_accountName', row.AccountName || row.Description);
        
        setVal('txt_directDebitInstructionId', row.DirectDebitInstructionID || row.SIID || row.StandingInstructionID);
        setVal('txt_directDebitInstructionName', row.Reference || row.ReferenceNo || row.Description || row.AccountName);
        setVal('txt_referenceNo', row.ReferenceNo);
        
        setVal('txt_transactionCurrencyId', row.CurrencyID || row.TrfCurrencyID || row.TransactionCurrencyID);
        setVal('txt_transactionCurrencyName', row.CurrencyName || row.CurrencyDescription || row.TransactionCurrencyName || row.TrfCurrency);
        setVal('txt_fixedAmount', row.FixedAmount || row.Amount);
        
        setDate('txt_effectiveDate', row.EffectiveDate);
        setSelectValue(
            'ddl_transferFrequency',
            row.TrfFrequencyID,
            row.TransferFrequencyID,
            row.TransferFrequency,
            row.TrfFrequency,
            row.TrfFrequencyDescription
        );
        
        setVal('txt_noOfExecution', row.NoOfExecution || row.NoOfExecutions);
        setDate('txt_firstExecutionDate', row.FirstExecutionDate);
        setDate('txt_lastExecutionDate', row.LastExecutionDate);
        setDate('txt_valueDate', row.ValueDate);
        
        setVal('txt_standingInstructionStatus', getStatusDisplay());
        setSelectValue(
            'ddl_chargeRecovery',
            row.ChargeRecoveryID,
            row.ChargeRecovery,
            row.ChargeTypeID,
            row.ChargeType,
            row.ChargeRecoveryDescription,
            row.ChargeTypeDescription
        );
        
        setVal('txt_bankId', row.ContraBankID || row.BBankID || row.BankID);
        setVal('txt_bankName', row.BankName || row.ContraBankName || row.BBankName);
        setVal('txt_contraBranchId', row.ContraBranchID || row.BBranchID || row.CreditAccountBranchID);
        setVal('txt_contraBranchName', row.ContraBranchName || row.BBranchName || row.CreditAccountBranch || row.BranchName);
        setVal('txt_contraAccountId', row.ContraAccountID || row.CreditAccountID);
        setVal('txt_originatorCode', row.OriginatorCode || row.OrigCode);
        
        setVal('txt_originatorRef', row.OriginatorRef || row.OrigRef);
        setVal('txt_policyNumber1', row.PolicyNumber1 || row.Policy1);
        setVal('txt_policyNumber2', row.PolicyNumber2 || row.Policy2);
        setVal('txt_returnCode', row.ReturnCode || '00');
        setVal('txt_remarks', row.Remarks || row.Reference);

        // Audit Fields
        document.getElementById('spn_nextExecutionDate').textContent = formatAuditDate(row.NextExecutionDate);
        document.getElementById('spn_lastRunDate').textContent = formatAuditDate(row.LastRunDate);
        document.getElementById('spn_lastRunStatus').textContent = row.LastRunStatus || row.LastProcessedStatus || '-';
        document.getElementById('spn_noOfTimesFailed').textContent = row.NoOfTimesFailed || row.NoOfFailedExecutions || '-';
        document.getElementById('spn_stoppedReason').textContent = row.StoppedReason || '-';
        document.getElementById('spn_createdBy').textContent = row.CreatedBy || '-';
        document.getElementById('spn_createdOn').textContent = formatAuditDate(row.CreatedOn);
        document.getElementById('spn_modifiedBy').textContent = row.ModifiedBy || '-';
        document.getElementById('spn_modifiedOn').textContent = formatAuditDate(row.ModifiedOn);
        document.getElementById('spn_stoppedBy').textContent = row.StoppedBy || '-';
        document.getElementById('spn_stoppedOn').textContent = formatAuditDate(row.StoppedOn);
        document.getElementById('spn_supervisedBy').textContent = row.SupervisedBy || '-';
        document.getElementById('spn_supervisedOn').textContent = formatAuditDate(row.SupervisedOn);
    }

    // ─────────────────────────────────────────────────────────────
    // Action Wiring
    // ─────────────────────────────────────────────────────────────

    function wireButtons() {
        if (buttons.view) buttons.view.addEventListener('click', () => {
            const instructionId = document.getElementById('txt_directDebitInstructionId')?.value.trim();
            if (instructionId) loadData(instructionId);
            else if (state.searchKey) loadData(state.searchKey);
            else {
                clearForm();
                setMode('VIEW');
                showMsg('Enter Direct Debit Instruction ID to view a record.', 'warning');
            }
        });

        if (buttons.add) buttons.add.addEventListener('click', () => {
            clearForm();
            setMode('ADD');
            if (buttons.save) buttons.save.disabled = false;
        });

        if (buttons.edit) buttons.edit.addEventListener('click', async () => {
            if (!state.searchKey) {
                return;
            }

            showLoading(true);
            try {
                const locked = await addRecordLock();
                if (!locked) {
                    return;
                }

                setMode('EDIT');
                if (buttons.save) buttons.save.disabled = false;
            } finally {
                showLoading(false);
            }
        });

        if (buttons.save) buttons.save.addEventListener('click', () => {
            if (state.currentMode === 'VIEW') return;
            saveData();
        });

        if (buttons.cancel) buttons.cancel.addEventListener('click', async () => {
            if (state.isDirty) {
                const confirmed = await showConfirmationDialog('Cancel Changes', 'You have unsaved changes. Are you sure you want to cancel?');
                if (!confirmed) return;
            }

            if (state.currentMode === 'EDIT' && state.searchKey) {
                const released = await releaseRecordLock();
                if (!released) {
                    return;
                }
            }

            const restoreKey = state.searchKey
                || state.lastViewedKey
                || document.getElementById('txt_directDebitInstructionId')?.value.trim();

            if (restoreKey) {
                loadData(restoreKey);
            } else {
                clearForm();
                setMode('VIEW');
            }
        });

        if (buttons.delete) buttons.delete.addEventListener('click', deleteData);
        if (buttons.stop) buttons.stop.addEventListener('click', stopData);
        if (buttons.print) buttons.print.addEventListener('click', () => window.print());
    }

    // ─────────────────────────────────────────────────────────────
    // Lookups (SearchModal)
    // ─────────────────────────────────────────────────────────────

    function wireLookups() {
        if (buttons.searchBranch) {
            buttons.searchBranch.addEventListener('click', () => {
                searchModal.open({
                    title: 'Find Branch',
                    tableID: 'BranchID',
                    searchFields: [
                        { name: 'branchId', label: 'Branch ID', column: 'OurBranchID' },
                        { name: 'branchName', label: 'Branch Name', column: 'BranchName' }
                    ],
                    displayFields: [
                        { key: 'OurBranchID', label: 'Branch ID' },
                        { key: 'BranchName', label: 'Branch Name' }
                    ],
                    onSelect: (r) => {
                        document.getElementById('txt_branchId').value = r.OurBranchID || r.BranchID || '';
                        document.getElementById('txt_branchName').value = r.BranchName || r.Description || '';
                    }
                });
            });
        }

        if (buttons.searchAccount) {
            buttons.searchAccount.addEventListener('click', () => {
                const branch = document.getElementById('txt_branchId').value;
                searchModal.open({
                    title: 'Find Account',
                    tableID: 'AccountID',
                    whereStmt: branch ? `OurBranchID = '${branch}'` : '',
                    searchFields: [
                        { name: 'accountId', label: 'Account ID', column: 'AccountID' },
                        { name: 'accountName', label: 'Account Name', column: 'Name' }
                    ],
                    displayFields: [
                        { key: 'AccountID', label: 'Account ID' },
                        { key: 'Name', label: 'Name' },
                        { key: 'ProductID', label: 'Product' }
                    ],
                    onSelect: (r) => {
                        document.getElementById('txt_accountId').value = r.AccountID || '';
                        document.getElementById('txt_accountName').value = r.Name || r.Description || '';
                    }
                });
            });
        }

        if (buttons.searchDDInstruction) {
            buttons.searchDDInstruction.addEventListener('click', () => {
                const branch = document.getElementById('txt_branchId').value;

                searchModal.open({
                    title: 'DDInstruction',
                    tableID: 'DDInstructionID',
                    whereStmt: branch ? `OurBranchID = '${branch}'` : '',
                    searchFields: [
                        { name: 'instructionId', label: 'Instruction ID', column: 'DDID' },
                        { name: 'accountId', label: 'Account ID', column: 'AccountID' },
                        { name: 'accountName', label: 'Account Name', column: 'AccountName' },
                        { name: 'originatorCode', label: 'Originator Code', column: 'OrigCode' },
                        { name: 'originatorRef', label: 'Originator Ref', column: 'OrigRef' }
                    ],
                    displayFields: [
                        { key: 'DDID', label: 'DDID' },
                        { key: 'OrigCode', label: 'OrigCode' },
                        { key: 'OrigRef', label: 'OrigRef' },
                        { key: 'Policy1', label: 'Policy1' },
                        { key: 'Policy2', label: 'Policy2' },
                        { key: 'AccountID', label: 'Account ID' },
                        { key: 'AccountName', label: 'Account Name' },
                        { key: 'ReferenceNo', label: 'Reference No.' }
                    ],
                    onSelect: (r) => {
                        const id = r.DDID || r.DirectDebitInstructionID || r.StandingInstructionID;
                        document.getElementById('txt_directDebitInstructionId').value = id || '';
                        document.getElementById('txt_directDebitInstructionName').value = r.AccountName || r.ReferenceNo || r.Description || '';
                        if (id) {
                            loadData(id);
                        }
                    }
                });
            });
        }

        if (buttons.searchCurrency) {
            buttons.searchCurrency.addEventListener('click', () => {
                searchModal.open({
                    title: 'Find Currency',
                    tableID: 'MastCurrencyID',
                    searchFields: [
                        { name: 'currencyId', label: 'Currency ID', column: 'CurrencyID' }
                    ],
                    displayFields: [
                        { key: 'CurrencyID', label: 'Currency ID' },
                        { key: 'Description', label: 'Description' }
                    ],
                    onSelect: (r) => {
                        document.getElementById('txt_transactionCurrencyId').value = r.CurrencyID || '';
                        document.getElementById('txt_transactionCurrencyName').value = r.Description || '';
                    }
                });
            });
        }

        if (buttons.searchContraBank) {
            buttons.searchContraBank.addEventListener('click', () => {
                searchModal.open({
                    title: 'Find Bank',
                    tableID: 'MastClrBankID',
                    searchFields: [
                        { name: 'bankId', label: 'Bank ID', column: 'BankID' }
                    ],
                    displayFields: [
                        { key: 'BankID', label: 'Bank ID' },
                        { key: 'BankName', label: 'Bank Name' }
                    ],
                    onSelect: (r) => {
                        document.getElementById('txt_bankId').value = r.BankID || r.ClrBankID || '';
                        document.getElementById('txt_bankName').value = r.BankName || r.Description || '';
                        document.getElementById('txt_contraBranchId').value = ''; // Reset branch
                        document.getElementById('txt_contraBranchName').value = '';
                    }
                });
            });
        }

        if (buttons.searchContraBranch) {
            buttons.searchContraBranch.addEventListener('click', () => {
                const bankId = document.getElementById('txt_bankId').value;
                searchModal.open({
                    title: 'Find Contra Branch',
                    tableID: 'BranchID',
                    whereStmt: bankId ? `BankID = '${bankId}'` : '',
                    searchFields: [
                        { name: 'branchId', label: 'Branch ID', column: 'OurBranchID' }
                    ],
                    displayFields: [
                        { key: 'OurBranchID', label: 'Branch ID' },
                        { key: 'BranchName', label: 'Branch Name' }
                    ],
                    onSelect: (r) => {
                        document.getElementById('txt_contraBranchId').value = r.OurBranchID || r.BranchID || '';
                        document.getElementById('txt_contraBranchName').value = r.BranchName || r.Description || '';
                    }
                });
            });
        }
    }

    // Public API
    return {
        init,
        loadData
    };

})();

// Auto-initialize when loaded
document.addEventListener('DOMContentLoaded', () => {
    if (window.DirectDebitMaintenanceModule) {
        window.DirectDebitMaintenanceModule.init();
    }
});
