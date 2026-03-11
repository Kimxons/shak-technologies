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
        searchKey: null
    };

    let searchModal = null;

    // Elements
    const elements = {
        form: document.getElementById('frm_standingInstructionType'),
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
        document.querySelector('[data-action="close"]')?.addEventListener('click', () => {
            if (state.isDirty && !confirm('You have unsaved changes. Are you sure you want to close?')) return;
            window.close(); // Or navigate back
            window.location.href = '/Dashboard/Index';
        });
        document.querySelector('[data-action="refresh"]')?.addEventListener('click', () => {
            if (state.searchKey) loadData(state.searchKey);
            else clearForm();
        });

        console.log('✅ StandingInstructionTypeModule initialized');
    }

    // ─────────────────────────────────────────────────────────────
    // Form & UI State Management
    // ─────────────────────────────────────────────────────────────

    function setMode(mode) {
        state.currentMode = mode;
        const isEditing = mode === 'ADD' || mode === 'EDIT';

        // Enable/Disable form fields
        const inputs = elements.form.querySelectorAll('input:not([readonly]):not([type="hidden"]), select:not([readonly]), textarea:not([readonly])');
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
        } else if (mode === 'ADD') {
            if (buttons.searchSIType) buttons.searchSIType.disabled = true;
            document.getElementById('txt_instructionTypeId').disabled = false;
        } else if (mode === 'EDIT') {
            if (buttons.searchSIType) buttons.searchSIType.disabled = true;
            document.getElementById('txt_instructionTypeId').disabled = true;
        }

        // Action Buttons
        if (buttons.view) buttons.view.disabled = isEditing;
        if (buttons.add) buttons.add.disabled = isEditing;
        if (buttons.edit) buttons.edit.disabled = isEditing || !state.searchKey;
        if (buttons.delete) buttons.delete.disabled = isEditing || !state.searchKey;
        if (buttons.save) buttons.save.disabled = !isEditing;
        if (buttons.cancel) buttons.cancel.disabled = !isEditing;

        if (!isEditing) {
            state.isDirty = false;
        }

        clearMessages();
    }

    function clearForm() {
        elements.form.reset();
        
        // Clear descriptive readonly fields
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
        state.isDirty = false;
    }

    function wireFormChanges() {
        if (!elements.form) return;
        ['change', 'input'].forEach(evt => {
            elements.form.addEventListener(evt, () => {
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

    function showMsg(msg, type = 'info') {
        if (AppCore && AppCore.showNotification) {
            AppCore.showNotification(msg, type);
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

    // ─────────────────────────────────────────────────────────────
    // API Operations
    // ─────────────────────────────────────────────────────────────

    async function loadData(searchKey) {
        if (!searchKey) return;
        showLoading(true);

        try {
            const req = { SITypeID: searchKey };
            const res = await AppCore.invokeControllerAsync(API.GET, req);
            
            if (res && res.Success && (res.Data || res.Details)) {
                const d = res.Data || res.Details;
                populateForm(d);
                state.searchKey = searchKey;
                setMode('VIEW');
                showMsg('Data loaded successfully', 'success');
            } else {
                showMsg(res?.ErrorMessage || 'Failed to load record.', 'error');
            }
        } catch (err) {
            console.error(err);
            showMsg('Error loading record. See console.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function saveData() {
        if (!elements.form.checkValidity()) {
            elements.form.reportValidity();
            return;
        }

        const formData = new FormData(elements.form);
        const data = Object.fromEntries(formData.entries());
        data.freezeAmountOnFailure = document.getElementById('chk_freezeAmountOnFailure')?.checked ? "1" : "0";

        showLoading(true);
        try {
            const endpoint = state.currentMode === 'ADD' ? API.CREATE : API.UPDATE;
            const res = await AppCore.invokeControllerAsync(endpoint, data);

            if (res && res.Success) {
                showMsg('Saved successfully.', 'success');
                state.isDirty = false;
                setMode('VIEW');
                if (data.instructionTypeId) {
                    state.searchKey = data.instructionTypeId;
                    loadData(state.searchKey);
                }
            } else {
                showMsg(res?.ErrorMessage || 'Failed to save record.', 'error');
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

        AppCore.showConfirmation({
            title: 'Confirm Delete',
            message: 'Are you sure you want to delete this Standing Instruction Type?',
            confirmButtonText: 'Delete',
            confirmButtonClass: 'btn-danger',
            onConfirm: async () => {
                showLoading(true);
                try {
                    const req = { SITypeID: state.searchKey };
                    const res = await AppCore.invokeControllerAsync(API.DELETE, req);
                    if (res && res.Success) {
                        showMsg('Deleted successfully.', 'success');
                        clearForm();
                        setMode('VIEW');
                    } else {
                        showMsg(res?.ErrorMessage || 'Delete failed.', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showMsg('Error deleting.', 'error');
                } finally {
                    showLoading(false);
                }
            }
        });
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
        setVal('txt_description', row.Description);
        setVal('ddl_siTransferType', row.SITransferType || row.TransferType || '');
        setVal('txt_noOfRetries', row.NoOfRetries);
        setVal('txt_retryAfterDays', row.RetryAfterDays);
        setVal('ddl_failedChargeType', row.FailedChargeType);
        
        const chk = document.getElementById('chk_freezeAmountOnFailure');
        if (chk) chk.checked = row.FreezeAmountOnFailure === '1' || row.FreezeAmountOnFailure === 'true';

        setVal('txt_successfulTrxId', row.SuccessfulTrxID || row.SuccessfulTransactionID);
        setVal('txt_successfulTrxName', row.SuccessfulTrxName || row.SuccessfulTransactionName);
        setVal('txt_successfulNarration', row.SuccessfulNarration);
        
        setVal('txt_failureTrxId', row.FailureTrxID || row.FailureTransactionID);
        setVal('txt_failureTrxName', row.FailureTrxName || row.FailureTransactionName);
        setVal('txt_failureNarration', row.FailureNarration);

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
            if (state.searchKey) loadData(state.searchKey);
            else { clearForm(); setMode('VIEW'); }
        });

        if (buttons.add) buttons.add.addEventListener('click', () => {
            clearForm();
            setMode('ADD');
        });

        if (buttons.edit) buttons.edit.addEventListener('click', () => setMode('EDIT'));

        if (buttons.save) buttons.save.addEventListener('click', () => {
            if (state.currentMode === 'VIEW') return;
            saveData();
        });

        if (buttons.cancel) buttons.cancel.addEventListener('click', () => {
            if (state.isDirty) {
                AppCore.showConfirmation({
                    title: 'Cancel Changes',
                    message: 'You have unsaved changes. Are you sure you want to cancel?',
                    onConfirm: () => {
                        if (state.searchKey) loadData(state.searchKey);
                        else { clearForm(); setMode('VIEW'); }
                    }
                });
            } else {
                if (state.searchKey) loadData(state.searchKey);
                else { clearForm(); setMode('VIEW'); }
            }
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
                            loadData(id);
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
