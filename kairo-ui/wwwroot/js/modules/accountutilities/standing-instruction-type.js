/**
 * Standing Instruction Type Module
 * Standardized for KAIRO MVC using AppCore.invokeControllerAsync
 */
window.StandingInstructionTypeModule = (function () {
    'use strict';

    // Module State
    const state = {
        submoduleName: 'StandingInstructionType',
        moduleId: '1000',
        currentMode: 'VIEW', // VIEW, ADD, EDIT
        isDirty: false,
        searchKey: null,
        canAddFromView: false,
        updateCount: 0,
        createdBy: null,
        createdOn: null
    };

    let searchModal = null;

    // Elements
    const elements = {
        form: document.getElementById('frm_standingInstructionType'),
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

        searchSIType: document.getElementById('btn_searchSIType'),
        searchSuccessfulTrx: document.getElementById('btn_searchSuccessfulTrx'),
        searchFailureTrx: document.getElementById('btn_searchFailureTrx'),
        sectionToggles: document.querySelectorAll('.section-toggle-btn')
    };

    // API Endpoints (mapped to AccountUtilitiesController)
    const API = {
        GET: 'AccountUtilities/api/get-si-type',
        CREATE: 'AccountUtilities/api/create-si-type',
        UPDATE: 'AccountUtilities/api/update-si-type',
        DELETE: 'AccountUtilities/api/delete-si-type'
    };

    // ─────────────────────────────────────────────────────────────
    // Initialization
    // ─────────────────────────────────────────────────────────────

    function init() {
        console.log('🚀 Initializing Standing Instruction Type module...');
        
        searchModal = new SearchModal(window.AppCore);

        wireButtons();
        wireLookups();
        wireFormChanges();
        wireSectionToggles();

        setMode('VIEW');
        
        // Window controls
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
            else {
                clearForm();
                setMode('VIEW');
            }
        });

        console.log('✅ StandingInstructionTypeModule initialized');
    }

    // ─────────────────────────────────────────────────────────────
    // Form & UI State Management
    // ─────────────────────────────────────────────────────────────

    function setMode(mode) {
        state.currentMode = mode;
        const isEditing = mode === 'ADD' || mode === 'EDIT';
        const hasLoadedRecord = Boolean(state.searchKey);
        const hasMissingRecordCandidate = !hasLoadedRecord && state.canAddFromView;
        const instructionTypeInput = document.getElementById('txt_instructionTypeId');

        // Enable/Disable form fields
        const inputs = elements.mainForm
            ? elements.mainForm.querySelectorAll('input:not([readonly]):not([type="hidden"]), select:not([readonly]), textarea:not([readonly])')
            : [];
        inputs.forEach(el => el.disabled = !isEditing);
        
        // Checkboxes specifically need handling if grouped improperly
        const chk = document.getElementById('chk_freezeAmountOnFailure');
        if (chk) chk.disabled = !isEditing;
        
        // Search buttons
        const lookups = [buttons.searchSuccessfulTrx, buttons.searchFailureTrx];
        lookups.forEach(btn => { if (btn) btn.disabled = !isEditing; });

        // Instruction Type search is used to load data in VIEW Mode
        if (mode === 'VIEW') {
            if (buttons.searchSIType) buttons.searchSIType.disabled = false;
            if (instructionTypeInput) instructionTypeInput.disabled = hasLoadedRecord;
        } else if (mode === 'ADD') {
            if (buttons.searchSIType) buttons.searchSIType.disabled = true;
            if (instructionTypeInput) instructionTypeInput.disabled = false;
        } else if (mode === 'EDIT') {
            if (buttons.searchSIType) buttons.searchSIType.disabled = true;
            if (instructionTypeInput) instructionTypeInput.disabled = true;
        }

        // Action Buttons
        if (mode === 'VIEW') {
            if (buttons.view) buttons.view.disabled = hasMissingRecordCandidate;
            if (buttons.add) buttons.add.disabled = !state.canAddFromView;
            if (buttons.edit) buttons.edit.disabled = !hasLoadedRecord;
            if (buttons.delete) buttons.delete.disabled = !hasLoadedRecord;
            if (buttons.save) buttons.save.disabled = true;
            if (buttons.cancel) buttons.cancel.disabled = !hasLoadedRecord && !hasMissingRecordCandidate;
        } else {
            if (buttons.view) buttons.view.disabled = true;
            if (buttons.add) buttons.add.disabled = true;
            if (buttons.edit) buttons.edit.disabled = true;
            if (buttons.delete) buttons.delete.disabled = true;
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
        
        // Clear descriptive readonly fields
        document.getElementById('txt_instructionTypeName').value = '';
        document.getElementById('txt_successfulTrxName').value = '';
        document.getElementById('txt_failureTrxName').value = '';
        
        const chk = document.getElementById('chk_freezeAmountOnFailure');
        if (chk) chk.checked = false;
        
        // Clear audit
        document.getElementById('spn_createdBy').textContent = '-';
        document.getElementById('spn_createdOn').textContent = '-';
        document.getElementById('spn_modifiedBy').textContent = '-';
        document.getElementById('spn_modifiedOn').textContent = '-';
        document.getElementById('spn_supervisedBy').textContent = '-';
        document.getElementById('spn_supervisedOn').textContent = '-';

        state.searchKey = null;
        state.canAddFromView = false;
        state.updateCount = 0;
        state.createdBy = null;
        state.createdOn = null;
        state.isDirty = false;
    }

    function getEnteredInstructionTypeId() {
        const instructionTypeInput = document.getElementById('txt_instructionTypeId');
        return instructionTypeInput ? instructionTypeInput.value.trim() : '';
    }

    function setInstructionTypeSelection(id, description) {
        clearForm();

        const instructionTypeInput = document.getElementById('txt_instructionTypeId');
        const instructionTypeNameInput = document.getElementById('txt_instructionTypeName');

        if (instructionTypeInput) {
            instructionTypeInput.value = id || '';
        }

        if (instructionTypeNameInput) {
            instructionTypeNameInput.value = description || '';
        }

        state.canAddFromView = false;
        setMode('VIEW');
    }

    function prepareMissingRecordState(instructionTypeId) {
        clearForm();

        const instructionTypeInput = document.getElementById('txt_instructionTypeId');
        if (instructionTypeInput) {
            instructionTypeInput.value = instructionTypeId || '';
        }

        state.canAddFromView = Boolean(instructionTypeId);
        setMode('VIEW');
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

        return data;
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

    async function showConfirmationDialog(title, message) {
        if (window.AppCore && typeof window.AppCore.showConfirmation === 'function') {
            return await window.AppCore.showConfirmation(title, message);
        }

        return confirm(message);
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

    function getSiTypeRecord(response) {
        const payload = getResponseValue(response, 'Data', 'data') || getResponseValue(response, 'Details', 'details');

        if (Array.isArray(payload)) {
            return payload[0] || null;
        }

        if (payload && typeof payload === 'object') {
            const detailRows = getResponseValue(payload, 'Details01', 'details01');
            if (Array.isArray(detailRows) && detailRows.length > 0) {
                return detailRows[0];
            }

            const rows = getResponseValue(payload, 'Details', 'details');
            if (Array.isArray(rows) && rows.length > 0) {
                return rows[0];
            }

            return payload;
        }

        return null;
    }

    function isSiTypeRecord(row) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
            return false;
        }

        return Boolean(
            row.SITypeID
            || row.siTypeID
            || row.Description
            || row.description
            || row.SITrfTypeID
            || row.SITransferType
        );
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

    // ─────────────────────────────────────────────────────────────
    // API Operations
    // ─────────────────────────────────────────────────────────────

    async function loadData(searchKey) {
        if (!searchKey) return;
        showLoading(true);

        try {
            const req = { SITypeID: searchKey };
            const res = await AppCore.invokeControllerAsync(API.GET, req);
            const result = getOperationResult(res);
            const row = getSiTypeRecord(res);
            
            if (result.isSuccess && isSiTypeRecord(row)) {
                populateForm(row);
                state.searchKey = searchKey;
                state.canAddFromView = false;
                setMode('VIEW');
                showMsg('Data loaded successfully', 'success');
            } else {
                prepareMissingRecordState(searchKey);
                showMsg(result.message || 'Record not found. Click Add to create it.', 'warning');
            }
        } catch (err) {
            console.error(err);
            showMsg('Error loading record. See console.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function saveData() {
        const data = getFormData();
        data.instructionTypeId = data.instructionTypeId || state.searchKey || getEnteredInstructionTypeId();
        data.freezeAmountOnFailure = document.getElementById('chk_freezeAmountOnFailure')?.checked ? "1" : "0";
        data.createdBy = state.createdBy || undefined;
        data.createdOn = state.createdOn || null;
        data.newRecord = state.currentMode === 'ADD' ? 1 : (state.updateCount || 0);
        data.updateCount = state.updateCount || 0;

        showLoading(true);
        try {
            const endpoint = state.currentMode === 'ADD' ? API.CREATE : API.UPDATE;
            const res = await AppCore.invokeControllerAsync(endpoint, data);
            const result = getOperationResult(res);

            if (result.isSuccess) {
                showMsg('Saved successfully.', 'success');
                state.isDirty = false;
                setMode('VIEW');
                if (data.instructionTypeId) {
                    state.searchKey = data.instructionTypeId;
                    loadData(state.searchKey);
                }
            } else {
                showMsg(result.message || 'Failed to save record.', 'error');
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

        const confirmed = await showConfirmationDialog('Confirm Delete', 'Are you sure you want to delete this Standing Instruction Type?');
        if (!confirmed) return;

        showLoading(true);
        try {
            const req = {
                SITypeID: state.searchKey,
                NewRecord: state.updateCount || 0,
                UpdateCount: state.updateCount || 0
            };
            const res = await AppCore.invokeControllerAsync(API.DELETE, req);
            const result = getOperationResult(res);

            if (result.isSuccess) {
                showMsg('Deleted successfully.', 'success');
                clearForm();
                setMode('VIEW');
            } else {
                showMsg(result.message || 'Delete failed.', 'error');
            }
        } catch (err) {
            console.error(err);
            showMsg('Error deleting.', 'error');
        } finally {
            showLoading(false);
        }
    }

    // ─────────────────────────────────────────────────────────────
    // Form Population
    // ─────────────────────────────────────────────────────────────

    function populateForm(data) {
        clearForm();
        if (!data) return;
        
        const row = Array.isArray(data) ? data[0] : data;
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        setVal('txt_instructionTypeId', row.SITypeID);
        setVal('txt_instructionTypeName', row.Description);
        setVal('txt_description', row.Description);
        setVal('ddl_siTransferType', row.SITransferType || row.SITrfTypeID || row.TransferType || '');
        setVal('txt_noOfRetries', row.NoOfRetries);
        setVal('txt_retryAfterDays', row.RetryAfterDays);
        setVal('ddl_failedChargeType', row.FailedChargeType || row.FailedChargeTypeID || '');
        
        const chk = document.getElementById('chk_freezeAmountOnFailure');
        if (chk) {
            chk.checked = row.FreezeAmountOnFailure === '1'
                || row.FreezeAmountOnFailure === 'true'
                || row.IsFailureFreezeAmount === true;
        }

        setVal('txt_successfulTrxId', row.SuccessfulTrxID || row.SuccessfulTransactionID);
        setVal('txt_successfulTrxName', row.SuccessfulTrxName || row.SuccessfulTransactionName || row.SuccessfulTrxDescription);
        setVal('txt_successfulNarration', row.SuccessfulNarration);
        
        setVal('txt_failureTrxId', row.FailureTrxID || row.FailureTransactionID);
        setVal('txt_failureTrxName', row.FailureTrxName || row.FailureTransactionName || row.FailureTrxDescription);
        setVal('txt_failureNarration', row.FailureNarration);

        state.updateCount = Number(row.UpdateCount) || 0;
        state.createdBy = row.CreatedBy || null;
        state.createdOn = row.CreatedOn || null;

        // Audit Fields
        document.getElementById('spn_createdBy').textContent = row.CreatedBy || '-';
        document.getElementById('spn_createdOn').textContent = row.CreatedOn ? new Date(row.CreatedOn).toLocaleDateString() : '-';
        document.getElementById('spn_modifiedBy').textContent = row.ModifiedBy || '-';
        document.getElementById('spn_modifiedOn').textContent = row.ModifiedOn ? new Date(row.ModifiedOn).toLocaleDateString() : '-';
        document.getElementById('spn_supervisedBy').textContent = row.SupervisedBy || '-';
        document.getElementById('spn_supervisedOn').textContent = row.SupervisedOn ? new Date(row.SupervisedOn).toLocaleDateString() : '-';
    }

    // ─────────────────────────────────────────────────────────────
    // Action Wiring
    // ─────────────────────────────────────────────────────────────

    function wireButtons() {
        if (buttons.view) buttons.view.addEventListener('click', () => {
            const enteredInstructionTypeId = getEnteredInstructionTypeId();
            if (enteredInstructionTypeId) {
                loadData(enteredInstructionTypeId);
                return;
            }

            clearForm();
            setMode('VIEW');
            showMsg('Enter Instruction Type ID to view a record.', 'warning');
        });

        if (buttons.add) buttons.add.addEventListener('click', () => {
            const enteredInstructionTypeId = getEnteredInstructionTypeId();
            clearForm();
            if (enteredInstructionTypeId) {
                const instructionTypeInput = document.getElementById('txt_instructionTypeId');
                if (instructionTypeInput) {
                    instructionTypeInput.value = enteredInstructionTypeId;
                }
            }
            setMode('ADD');
        });

        if (buttons.edit) buttons.edit.addEventListener('click', () => setMode('EDIT'));

        if (buttons.save) buttons.save.addEventListener('click', () => {
            if (state.currentMode === 'VIEW') return;
            saveData();
        });

        if (buttons.cancel) buttons.cancel.addEventListener('click', () => {
            clearForm();
            setMode('VIEW');
        });

        if (buttons.delete) buttons.delete.addEventListener('click', deleteData);
    }

    // ─────────────────────────────────────────────────────────────
    // Lookups (SearchModal)
    // ─────────────────────────────────────────────────────────────

    function wireLookups() {
        if (buttons.searchSIType) {
            buttons.searchSIType.addEventListener('click', () => {
                searchModal.open({
                    title: 'SI Type',
                    tableID: 'SITypeID',
                    searchFields: [
                        { name: 'siTypeId', label: 'SIType ID', column: 'SITypeID' },
                        { name: 'description', label: 'Description', column: 'Description' }
                    ],
                    displayFields: [
                        { key: 'SITypeID', label: 'SITypeID' },
                        { key: 'Description', label: 'Description' }
                    ],
                    onSelect: (r) => {
                        const id = r.SITypeID;
                        if (id) {
                            setInstructionTypeSelection(id, r.Description);
                        }
                    }
                });
            });
        }

        if (buttons.searchSuccessfulTrx) {
            buttons.searchSuccessfulTrx.addEventListener('click', () => {
                searchModal.open({
                    title: 'Trx Description',
                    tableID: 'TrxDescriptionID',
                    searchFields: [
                        { name: 'trxDescriptionId', label: 'TrxDescriptionID', column: 'TrxDescriptionID' },
                        { name: 'description', label: 'Description', column: 'Description' }
                    ],
                    displayFields: [
                        { key: 'TrxDescriptionID', label: 'TrxDescriptionID' },
                        { key: 'Description', label: 'Description' }
                    ],
                    onSelect: (r) => {
                        document.getElementById('txt_successfulTrxId').value = r.TrxDescriptionID || '';
                        document.getElementById('txt_successfulTrxName').value = r.Description || '';
                    }
                });
            });
        }

        if (buttons.searchFailureTrx) {
            buttons.searchFailureTrx.addEventListener('click', () => {
                searchModal.open({
                    title: 'Trx Description',
                    tableID: 'TrxDescriptionID',
                    searchFields: [
                        { name: 'trxDescriptionId', label: 'TrxDescriptionID', column: 'TrxDescriptionID' },
                        { name: 'description', label: 'Description', column: 'Description' }
                    ],
                    displayFields: [
                        { key: 'TrxDescriptionID', label: 'TrxDescriptionID' },
                        { key: 'Description', label: 'Description' }
                    ],
                    onSelect: (r) => {
                        document.getElementById('txt_failureTrxId').value = r.TrxDescriptionID || '';
                        document.getElementById('txt_failureTrxName').value = r.Description || '';
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
    if (window.StandingInstructionTypeModule) {
        window.StandingInstructionTypeModule.init();
    }
});
