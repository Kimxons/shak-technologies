/**
 * Direct Debit Maintenance Module
 * Standardized for KAIRO MVC using AppCore.invokeControllerAsync
 */
window.DirectDebitMaintenanceModule = (function () {
    'use strict';

    // Module State
    const state = {
        submoduleName: 'DirectDebitMaintenance',
        moduleId: '1000',
        currentMode: 'VIEW', // VIEW, ADD, EDIT
        isDirty: false,
        selectedIndex: -1,
        searchKey: null
    };

    let searchModal = null;

    // Elements
    const elements = {
        form: document.getElementById('frm_directDebitMaintenance'),
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
        STOP: 'AccountUtilities/api/stop-direct-debit-maintenance'
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
        document.querySelector('[data-action="close"]')?.addEventListener('click', () => {
            if (state.isDirty && !confirm('You have unsaved changes. Are you sure you want to close?')) return;
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

        // Enable/Disable form fields
        const inputs = elements.form.querySelectorAll('input:not([readonly]):not([type="hidden"]), select:not([readonly]), textarea:not([readonly])');
        inputs.forEach(el => el.disabled = !isEditing);
        
        // Special lookup buttons
        const lookups = [buttons.searchBranch, buttons.searchAccount, buttons.searchDDInstruction, buttons.searchCurrency, buttons.searchContraBank, buttons.searchContraBranch];
        lookups.forEach(btn => { if (btn) btn.disabled = !isEditing; });

        // In View Mode, DD Instruction search is used to load data
        if (mode === 'VIEW') {
            if (buttons.searchDDInstruction) buttons.searchDDInstruction.disabled = false;
        }

        // Action Buttons
        if (buttons.view) buttons.view.disabled = isEditing;
        if (buttons.add) buttons.add.disabled = isEditing;
        if (buttons.edit) buttons.edit.disabled = isEditing || !state.searchKey;
        if (buttons.delete) buttons.delete.disabled = isEditing || !state.searchKey;
        if (buttons.stop) buttons.stop.disabled = isEditing || !state.searchKey;
        if (buttons.print) buttons.print.disabled = isEditing || !state.searchKey;
        if (buttons.save) buttons.save.disabled = !isEditing;
        if (buttons.cancel) buttons.cancel.disabled = !isEditing;

        if (!isEditing) {
            state.isDirty = false;
        }

        clearMessages();
    }

    function clearForm() {
        elements.form.reset();
        
        // Clear pseudo-readonly lookup descriptions
        document.getElementById('txt_branchName').value = '';
        document.getElementById('txt_accountName').value = '';
        document.getElementById('txt_standingInstructionStatus').value = '';
        document.getElementById('txt_originatorRef').value = '';
        document.getElementById('txt_policyNumber1').value = '';
        document.getElementById('txt_policyNumber2').value = '';
        
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
        state.isDirty = false;
    }

    function wireFormChanges() {
        if (!elements.form) return;
        elements.form.addEventListener('change', () => {
            if (state.currentMode !== 'VIEW') {
                state.isDirty = true;
            }
        });
        elements.form.addEventListener('input', () => {
            if (state.currentMode !== 'VIEW') {
                state.isDirty = true;
            }
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
            const req = { SearchKey: searchKey, StandingInstructionID: searchKey };
            const res = await AppCore.invokeControllerAsync(API.GET, req);
            
            if (res && res.Success && res.Data) {
                populateForm(res.Data);
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

        showLoading(true);
        try {
            const endpoint = state.currentMode === 'ADD' ? API.CREATE : API.UPDATE;
            const res = await AppCore.invokeControllerAsync(endpoint, data);

            if (res && res.Success) {
                showMsg('Saved successfully.', 'success');
                state.isDirty = false;
                setMode('VIEW');
                if (data.directDebitInstructionId) {
                    state.searchKey = data.directDebitInstructionId;
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
            message: 'Are you sure you want to delete this Direct Debit Instruction?',
            confirmButtonText: 'Delete',
            confirmButtonClass: 'btn-danger',
            onConfirm: async () => {
                showLoading(true);
                try {
                    const req = { StandingInstructionID: state.searchKey };
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

    async function stopData() {
        if (!state.searchKey) return;
        
        AppCore.showConfirmation({
            title: 'Confirm Stop',
            message: 'Are you sure you want to stop this Standing Instruction?',
            confirmButtonText: 'Stop',
            confirmButtonClass: 'btn-warning',
            onConfirm: async () => {
                showLoading(true);
                try {
                    const req = { StandingInstructionID: state.searchKey };
                    const res = await AppCore.invokeControllerAsync(API.STOP, req);
                    if (res && res.Success) {
                        showMsg('Stopped successfully.', 'success');
                        loadData(state.searchKey);
                    } else {
                        showMsg(res?.ErrorMessage || 'Stop failed.', 'error');
                    }
                } catch (err) {
                    console.error(err);
                    showMsg('Error stopping.', 'error');
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
        
        // We handle mapping generic DTOs array or object
        const row = Array.isArray(data) ? data[0] : data;
        
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        const setDate = (id, val) => {
            const el = document.getElementById(id);
            if (el && val) {
                try {
                     const d = new Date(val);
                     if(!isNaN(d)) el.value = d.toISOString().split('T')[0];
                } catch(e){}
            }
        };

        setVal('ddl_directDebitType', row.DirectDebitType);
        
        setVal('txt_branchId', row.OurBranchID || row.BranchID);
        setVal('txt_branchName', row.BranchName);
        
        setVal('txt_accountId', row.AccountID);
        setVal('txt_accountName', row.AccountName || row.Description);
        
        setVal('txt_directDebitInstructionId', row.DirectDebitInstructionID || row.StandingInstructionID);
        setVal('txt_referenceNo', row.ReferenceNo);
        
        setVal('txt_transactionCurrencyId', row.CurrencyID || row.TransactionCurrencyID);
        setVal('txt_fixedAmount', row.FixedAmount);
        
        setDate('txt_effectiveDate', row.EffectiveDate);
        setVal('ddl_transferFrequency', row.TransferFrequency);
        
        setVal('txt_noOfExecution', row.NoOfExecution);
        setDate('txt_firstExecutionDate', row.FirstExecutionDate);
        setDate('txt_lastExecutionDate', row.LastExecutionDate);
        setDate('txt_valueDate', row.ValueDate);
        
        setVal('txt_standingInstructionStatus', row.StatusDescription || row.Status);
        setVal('ddl_chargeRecovery', row.ChargeRecovery);
        
        setVal('txt_bankId', row.ContraBankID || row.BankID);
        setVal('txt_contraBranchId', row.ContraBranchID);
        setVal('txt_contraAccountId', row.ContraAccountID);
        setVal('txt_originatorCode', row.OriginatorCode);
        
        setVal('txt_originatorRef', row.OriginatorRef);
        setVal('txt_policyNumber1', row.PolicyNumber1);
        setVal('txt_policyNumber2', row.PolicyNumber2);
        setVal('txt_returnCode', row.ReturnCode || '00');
        setVal('txt_remarks', row.Remarks);

        // Audit Fields
        document.getElementById('spn_nextExecutionDate').textContent = row.NextExecutionDate ? new Date(row.NextExecutionDate).toLocaleDateString() : '-';
        document.getElementById('spn_lastRunDate').textContent = row.LastRunDate ? new Date(row.LastRunDate).toLocaleDateString() : '-';
        document.getElementById('spn_lastRunStatus').textContent = row.LastRunStatus || '-';
        document.getElementById('spn_noOfTimesFailed').textContent = row.NoOfTimesFailed || '-';
        document.getElementById('spn_stoppedReason').textContent = row.StoppedReason || '-';
        document.getElementById('spn_createdBy').textContent = row.CreatedBy || '-';
        document.getElementById('spn_createdOn').textContent = row.CreatedOn ? new Date(row.CreatedOn).toLocaleDateString() : '-';
        document.getElementById('spn_modifiedBy').textContent = row.ModifiedBy || '-';
        document.getElementById('spn_modifiedOn').textContent = row.ModifiedOn ? new Date(row.ModifiedOn).toLocaleDateString() : '-';
        document.getElementById('spn_stoppedBy').textContent = row.StoppedBy || '-';
        document.getElementById('spn_stoppedOn').textContent = row.StoppedOn ? new Date(row.StoppedOn).toLocaleDateString() : '-';
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
                const acct = document.getElementById('txt_accountId').value;
                let where = '';
                if (branch) where += `OurBranchID = '${branch}'`;
                if (acct) where += (where ? ' AND ' : '') + `AccountID = '${acct}'`;

                searchModal.open({
                    title: 'Find Direct Debit Instruction',
                    tableID: 'DirectDebitInstructionID',
                    whereStmt: where,
                    searchFields: [
                        { name: 'instructionId', label: 'Instruction ID', column: 'DirectDebitInstructionID' },
                        { name: 'referenceNo', label: 'Reference No.', column: 'ReferenceNo' }
                    ],
                    displayFields: [
                        { key: 'DirectDebitInstructionID', label: 'Instruction ID' },
                        { key: 'AccountID', label: 'Account ID' },
                        { key: 'ReferenceNo', label: 'Reference No.' },
                        { key: 'FixedAmount', label: 'Amount' },
                        { key: 'StatusDescription', label: 'Status' }
                    ],
                    onSelect: (r) => {
                        const id = r.DirectDebitInstructionID || r.StandingInstructionID;
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
                        document.getElementById('txt_contraBranchId').value = ''; // Reset branch
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
