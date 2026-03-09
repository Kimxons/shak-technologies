/**
 * Direct Debit Maintenance Module
 * Migrated from: public/modules/AccountUtilities/direct-debit-maintenance.js
 *
 * Handles CRUD for Direct Debit Instruction records via:
 *   POST /AccountUtilities/api/save-direct-debit → dbo.p_AddEditDirectDebitTransfer
 */

window.DirectDebitMaintenanceModule = (function () {
    'use strict';

    // ─────────────────────────────────────────────────────────────────────────
    // State
    // ─────────────────────────────────────────────────────────────────────────
    const state = {
        branchId: '',
        operatorId: '',
        currentMode: 'VIEW',   // VIEW | ADD | EDIT
        originalData: null,
        searchModal: null
    };

    const API = {
        SAVE: '/AccountUtilities/api/save-direct-debit'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    const getEl  = (id) => document.getElementById(id);
    const val    = (id) => (getEl(id)?.value ?? '').trim();
    const setVal = (id, v) => { const el = getEl(id); if (el) el.value = v ?? ''; };
    const setText = (id, v) => { const el = getEl(id); if (el) el.textContent = v || '-'; };

    function isSuccess(result) {
        if (!result) return false;
        const code = result.ResponseCode ?? result.responseCode ?? result.StatusCode ?? '';
        return String(code) === '00' || String(code) === '0' || result.success === true;
    }

    function pad2(n) { return String(n).padStart(2, '0'); }

    function formatRequestTime(date = new Date()) {
        return `${pad2(date.getMonth() + 1)}/${pad2(date.getDate())}/${date.getFullYear()} ${pad2(date.getHours())}:${pad2(date.getMinutes())}:${pad2(date.getSeconds())}`;
    }

    /** Convert HTML date input (YYYY-MM-DD) to smalldatetime (MM/DD/YYYY) */
    function toApiDate(htmlDate) {
        if (!htmlDate) return '';
        const parts = htmlDate.split('-');
        if (parts.length !== 3) return htmlDate;
        return `${parts[1]}/${parts[2]}/${parts[0]}`;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Session context
    // ─────────────────────────────────────────────────────────────────────────
    function loadContext() {
        state.branchId = sessionStorage.getItem('currentBranchID')
            || sessionStorage.getItem('OurBranchID')
            || sessionStorage.getItem('branch_code')
            || '';

        state.operatorId = sessionStorage.getItem('currentOperatorID')
            || sessionStorage.getItem('OperatorID')
            || sessionStorage.getItem('user_name')
            || 'SYSTEM';
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Form field IDs (editable controls)
    // ─────────────────────────────────────────────────────────────────────────
    const FIELD_IDS = [
        'txt_branchId',
        'txt_accountId',
        'txt_directDebitInstructionId',
        'txt_referenceNo',
        'txt_transactionCurrencyId',
        'txt_fixedAmount',
        'txt_effectiveDate',
        'ddl_transferFrequency',
        'txt_noOfExecution',
        'txt_firstExecutionDate',
        'txt_lastExecutionDate',
        'txt_valueDate',
        'ddl_chargeRecovery',
        'ddl_directDebitType',
        'txt_bankId',
        'txt_contraBranchId',
        'txt_contraAccountId',
        'txt_originatorCode',
        'txa_remarks'
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // Mode management
    // ─────────────────────────────────────────────────────────────────────────
    function setMode(mode) {
        console.log('[DDM] Setting mode:', mode);
        state.currentMode = mode;

        const isEditing = mode === 'ADD' || mode === 'EDIT';

        // Enable / disable form fields
        FIELD_IDS.forEach(id => {
            const el = getEl(id);
            if (!el) return;
            el.disabled = !isEditing;
        });

        // Search buttons follow edit mode
        ['btn_searchBranch', 'btn_searchAccount', 'btn_searchDDInstruction',
         'btn_searchCurrency', 'btn_searchContraBank', 'btn_searchContraBranch'].forEach(id => {
            const el = getEl(id);
            if (el) el.disabled = !isEditing;
        });

        // DD Instruction search always available for lookup/view
        const searchDD = getEl('btn_searchDDInstruction');
        if (searchDD) searchDD.disabled = false;

        // Action buttons
        const btnStates = {
            view:   { active: mode === 'VIEW', disabled: mode === 'VIEW' },
            add:    { active: mode === 'ADD',  disabled: isEditing       },
            edit:   { active: mode === 'EDIT', disabled: isEditing       },
            delete: { active: false,           disabled: isEditing       },
            save:   { active: false,           disabled: !isEditing      },
            cancel: { active: false,           disabled: !isEditing      },
            stop:   { active: false,           disabled: isEditing       },
            print:  { active: false,           disabled: isEditing       }
        };

        Object.entries(btnStates).forEach(([action, cfg]) => {
            const btn = document.querySelector(`[data-action="${action}"]`);
            if (!btn) return;
            btn.classList.toggle('active', cfg.active);
            btn.disabled = cfg.disabled;
        });

        if (mode === 'ADD') clearForm();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Form population & clearing
    // ─────────────────────────────────────────────────────────────────────────
    function populateForm(r) {
        if (!r) return;

        setVal('txt_branchId',                  r.OurBranchID || r.BranchID || '');
        setVal('txt_branchName',                r.BranchName || '');
        setVal('txt_accountId',                 r.AccoutID || r.AccountID || r.DebitAccountID || '');
        setVal('txt_accountName',               r.AccountName || '');
        setVal('txt_directDebitInstructionId',   r.DDID || r.DirectDebitInstructionID || r.SIID || '');
        setVal('txt_referenceNo',               r.ReferenceNo || '');
        setVal('txt_transactionCurrencyId',     r.CurrencyID || r.TransactionCurrencyID || r.TrfCurrencyID || '');
        setVal('txt_fixedAmount',               r.FixedAmount || r.Amount || '');
        setVal('txt_effectiveDate',             r.EffectiveDate || '');
        setVal('ddl_transferFrequency',         r.TransferFrequency || r.TrfFrequencyID || '');
        setVal('txt_noOfExecution',             r.NoOfExecution || r.NoOfExecutions || '');
        setVal('txt_firstExecutionDate',        r.FirstExecutionDate || '');
        setVal('txt_lastExecutionDate',         r.LastExecutionDate || '');
        setVal('txt_valueDate',                 r.ValueDate || '');
        setVal('txt_standingInstructionStatus', r.StatusDescription || r.Status || r.SIStatusID || '');
        setVal('ddl_chargeRecovery',            r.ChargeRecovery || r.ChargeTypeID || '');
        setVal('ddl_directDebitType',           r.DirectDebitType || r.SITypeID || '');
        setVal('txt_bankId',                    r.ContraBankID || r.BankID || r.CreditAccountBankID || '');
        setVal('txt_contraBranchId',            r.ContraBranchID || r.CreditAccountBranchID || '');
        setVal('txt_contraAccountId',           r.ContraAccountID || r.CreditAccountID || '');
        setVal('txt_originatorCode',            r.OrigCode || r.OriginatorCode || '');
        setVal('txt_originatorRef',             r.OrigRef || r.OriginatorRef || '');
        setVal('txt_policyNumber1',             r.Policy1 || r.PolicyNumber1 || '');
        setVal('txt_policyNumber2',             r.Policy2 || r.PolicyNumber2 || '');
        setVal('txt_returnCode',                r.ReturnCode || '00');
        setVal('txa_remarks',                   r.Remarks || r.Reference || '');

        // Audit (Behind The Scene)
        setText('ddm_nextExecutionDate', r.NextExecutionDate || '-');
        setText('ddm_lastRunDate',       r.LastRunDate || '-');
        setText('ddm_lastRunStatus',     r.LastRunStatus || '-');
        setText('ddm_noOfTimesFailed',   r.NoOfTimesFailed || '-');
        setText('ddm_stoppedReason',     r.StoppedReason || '-');
        setText('ddm_createdBy',         r.CreatedBy || '-');
        setText('ddm_createdOn',         r.CreatedOn || '-');
        setText('ddm_modifiedBy',        r.ModifiedBy || '-');
        setText('ddm_modifiedOn',        r.ModifiedOn || '-');
        setText('ddm_stoppedBy',         r.StoppedBy || '-');
        setText('ddm_stoppedOn',         r.StoppedOn || '-');
        setText('ddm_supervisedBy',      r.SupervisedBy || '-');
        setText('ddm_supervisedOn',      r.SupervisedOn || '-');

        state.originalData = { ...r };
    }

    function clearForm() {
        FIELD_IDS.forEach(id => {
            const el = getEl(id);
            if (!el) return;
            el.value = '';
        });

        // Clear readonly fields
        ['txt_branchName', 'txt_accountName', 'txt_standingInstructionStatus',
         'txt_originatorRef', 'txt_policyNumber1', 'txt_policyNumber2'].forEach(id => setVal(id, ''));
        setVal('txt_returnCode', '00');
        setVal('txa_remarks', '');

        // Clear audit fields
        ['ddm_nextExecutionDate', 'ddm_lastRunDate', 'ddm_lastRunStatus', 'ddm_noOfTimesFailed',
         'ddm_stoppedReason', 'ddm_createdBy', 'ddm_createdOn', 'ddm_modifiedBy', 'ddm_modifiedOn',
         'ddm_stoppedBy', 'ddm_stoppedOn', 'ddm_supervisedBy', 'ddm_supervisedOn'].forEach(id => setText(id, '-'));

        state.originalData = null;
    }

    function restoreForm() {
        if (state.originalData) {
            populateForm(state.originalData);
        } else {
            clearForm();
        }
    }

    function collectFormData() {
        return {
            OurBranchID:            val('txt_branchId'),
            SIID:                   val('txt_directDebitInstructionId'),
            ReferenceNo:            val('txt_referenceNo') || '0',
            SITypeID:               val('ddl_directDebitType'),
            EffectiveDate:          toApiDate(val('txt_effectiveDate')),
            DebitAccountID:         val('txt_accountId'),
            TrfCurrencyID:          val('txt_transactionCurrencyId'),
            AmountTypeID:           '',
            Amount:                 val('txt_fixedAmount') || '0',
            TrfFrequencyID:         val('ddl_transferFrequency'),
            NoOfExecutions:         val('txt_noOfExecution') || '1',
            FirstExecutionDate:     toApiDate(val('txt_firstExecutionDate')),
            LastExecutionDate:      toApiDate(val('txt_lastExecutionDate')),
            ChargeTypeID:           val('ddl_chargeRecovery'),
            CreditAccountBranchID:  val('txt_contraBranchId'),
            CreditAccountBankID:    val('txt_bankId'),
            CreditAccountID:        val('txt_contraAccountId'),
            SIStatusID:             val('txt_standingInstructionStatus'),
            OrigCode:               val('txt_originatorCode'),
            OrigRef:                val('txt_originatorRef'),
            Policy1:                val('txt_policyNumber1'),
            Policy2:                val('txt_policyNumber2'),
            CreatedBy:              state.operatorId,
            VoucherNo:              '0',
            Reference:              val('txa_remarks'),
            ReturnCode:             val('txt_returnCode') || '00',
            CreatedOn:              formatRequestTime(),
            SupervisedBy:           '',
            BBankID:                '00',
            BBranchID:              val('txt_branchId'),
            ValueDate:              toApiDate(val('txt_valueDate')),
            OperatorID:             state.operatorId
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Validation
    // ─────────────────────────────────────────────────────────────────────────
    function validateForm() {
        const errors = [];
        if (!val('txt_branchId'))              errors.push('Branch ID is required.');
        if (!val('txt_accountId'))             errors.push('Account ID is required.');
        if (!val('txt_transactionCurrencyId')) errors.push('Transaction Currency is required.');
        if (!val('ddl_directDebitType'))       errors.push('Direct Debit Type is required.');
        if (!val('txt_effectiveDate'))         errors.push('Effective Date is required.');
        if (!val('ddl_transferFrequency'))     errors.push('Transfer Frequency is required.');

        if (errors.length > 0) {
            showMessage(errors.join(' '), 'error');
            return false;
        }
        return true;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API Calls
    // ─────────────────────────────────────────────────────────────────────────
    async function saveData() {
        if (!validateForm()) return;

        try {
            showLoading(true);
            const payload = collectFormData();

            const response = await fetch(API.SAVE, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log('[DDM] Save response:', result);

            if (isSuccess(result)) {
                const action = state.currentMode === 'ADD' ? 'added' : 'updated';
                showMessage(`Direct Debit Instruction ${action} successfully.`, 'success');

                // If we got back an ID on add, populate it
                if (state.currentMode === 'ADD') {
                    const newId = result.data?.SIID || result.data?.DirectDebitInstructionID
                               || result.Details?.SIID || '';
                    if (newId) setVal('txt_directDebitInstructionId', newId);
                }

                state.originalData = { ...collectFormData() };
                setMode('VIEW');
            } else {
                showMessage(result?.ResponseMessage || result?.message || 'Save failed.', 'error');
            }
        } catch (err) {
            console.error('[DDM] Save error:', err);
            showMessage('Error saving record: ' + err.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    async function deleteData() {
        const ddId = val('txt_directDebitInstructionId');
        if (!ddId) {
            showMessage('No record selected to delete.', 'warning');
            return;
        }

        if (!confirm('Delete this Direct Debit Instruction?')) return;

        try {
            showLoading(true);
            const payload = {
                SIID:        ddId,
                OurBranchID: state.branchId,
                OperatorID:  state.operatorId,
                NewRecord:   '2'   // convention: 2 = delete
            };

            const response = await fetch(API.SAVE, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const result = await response.json();

            if (isSuccess(result)) {
                showMessage('Record deleted.', 'success');
                clearForm();
                setMode('VIEW');
            } else {
                showMessage(result?.ResponseMessage || 'Delete failed.', 'error');
            }
        } catch (err) {
            console.error('[DDM] Delete error:', err);
            showMessage('Error deleting record: ' + err.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UI helpers
    // ─────────────────────────────────────────────────────────────────────────
    function showLoading(visible) {
        const overlay = getEl('ddm_loadingOverlay');
        if (overlay) overlay.hidden = !visible;
    }

    function showMessage(text, type) {
        const panel = getEl('ddm_messagePanel');
        const span  = getEl('ddm_messageText');
        if (!panel || !span) return;

        span.textContent = text;
        panel.className  = `am-message-panel am-message-panel--${type || 'info'}`;
        panel.hidden = false;

        if (type !== 'error') {
            setTimeout(() => { panel.hidden = true; }, 4000);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Section toggle wiring
    // ─────────────────────────────────────────────────────────────────────────
    function wireSectionToggles() {
        document.querySelectorAll('.section-toggle-btn').forEach(btn => {
            btn.addEventListener('click', function () {
                const section = this.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const icon    = this.querySelector('i');
                const isExpanded = this.getAttribute('aria-expanded') === 'true';

                if (content) content.hidden = isExpanded;
                this.setAttribute('aria-expanded', String(!isExpanded));
                if (icon) {
                    icon.classList.toggle('bi-chevron-up',   !isExpanded);
                    icon.classList.toggle('bi-chevron-down',  isExpanded);
                }
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Action button wiring (View / Add / Edit / Delete / Save / Cancel / Stop / Print)
    // ─────────────────────────────────────────────────────────────────────────
    function wireActionButtons() {
        const actions = {
            view:   () => { restoreForm(); setMode('VIEW'); },
            add:    () => { setMode('ADD'); getEl('txt_branchId')?.focus(); },
            edit:   () => {
                if (!val('txt_directDebitInstructionId')) {
                    showMessage('Please load a Direct Debit Instruction first before editing.', 'warning');
                    return;
                }
                setMode('EDIT');
                getEl('txt_referenceNo')?.focus();
            },
            delete: () => deleteData(),
            save:   () => saveData(),
            cancel: () => { restoreForm(); setMode('VIEW'); },
            stop:   () => {
                setVal('txt_standingInstructionStatus', 'Stopped');
                showMessage('Status set to Stopped. Save to persist.', 'info');
            },
            print:  () => window.print()
        };

        Object.entries(actions).forEach(([action, handler]) => {
            document.querySelector(`[data-action="${action}"]`)
                ?.addEventListener('click', handler);
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SearchModal wiring
    // ─────────────────────────────────────────────────────────────────────────
    function wireSearchButtons() {
        const appCore = window.AppCore;
        if (!window.SearchModal) {
            console.warn('[DDM] SearchModal not available - search buttons will be disabled');
            return;
        }

        const searchModal = new window.SearchModal(appCore);
        state.searchModal = searchModal;

        // 1. Branch Search
        getEl('btn_searchBranch')?.addEventListener('click', () => {
            searchModal.open({
                tableID:  'BranchID',
                moduleID: '1000',
                onSelect: (record) => {
                    setVal('txt_branchId',   record.OurBranchID || record.BranchID || '');
                    setVal('txt_branchName', record.BranchName || record.Description || '');
                }
            });
        });

        // 2. Account Search
        getEl('btn_searchAccount')?.addEventListener('click', () => {
            const branch = val('txt_branchId');
            searchModal.open({
                tableID:  'AccountID',
                moduleID: '1000',
                whereStmt: branch ? "OurBranchID = '" + branch + "'" : '',
                onSelect: (record) => {
                    setVal('txt_accountId',   record.AccountID || '');
                    setVal('txt_accountName', record.Name || record.Description || record.AccountName || '');
                }
            });
        });

        // 3. Direct Debit Instruction Search
        getEl('btn_searchDDInstruction')?.addEventListener('click', () => {
            const branch  = val('txt_branchId');
            const account = val('txt_accountId');
            let advFilter = '';
            if (branch)  advFilter += "OurBranchID='" + branch + "'";
            if (account) advFilter += (advFilter ? ' AND ' : '') + "AccountID='" + account + "'";

            searchModal.open({
                tableID:         'DDInstruction',
                moduleID:        '1000',
                advFilterString: advFilter,
                onSelect: (record) => {
                    populateForm(record);
                    state.originalData = { ...record };
                    showMessage('Instruction loaded.', 'success');
                }
            });
        });

        // 4. Currency Search
        getEl('btn_searchCurrency')?.addEventListener('click', () => {
            searchModal.open({
                tableID:  'MastCurrencyID',
                moduleID: '1000',
                onSelect: (record) => {
                    setVal('txt_transactionCurrencyId', record.CurrencyID || '');
                }
            });
        });

        // 5. Contra Bank Search
        getEl('btn_searchContraBank')?.addEventListener('click', () => {
            searchModal.open({
                tableID:  'MastClrBankID',
                moduleID: '1000',
                onSelect: (record) => {
                    setVal('txt_bankId', record.BankID || record.ClrBankID || '');
                }
            });
        });

        // 6. Contra Branch Search
        getEl('btn_searchContraBranch')?.addEventListener('click', () => {
            const bankId = val('txt_bankId');
            searchModal.open({
                tableID:   'BranchID',
                moduleID:  '1000',
                whereStmt: bankId ? "BankID = '" + bankId + "'" : '',
                onSelect: (record) => {
                    setVal('txt_contraBranchId', record.OurBranchID || record.BranchID || '');
                }
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Message panel close button
    // ─────────────────────────────────────────────────────────────────────────
    function wireMessagePanel() {
        const panel = getEl('ddm_messagePanel');
        const closeBtn = panel?.querySelector('.am-message-panel__close');
        closeBtn?.addEventListener('click', () => { panel.hidden = true; });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public init
    // ─────────────────────────────────────────────────────────────────────────
    function init() {
        console.log('[DDM] Initializing Direct Debit Maintenance module...');

        loadContext();
        wireActionButtons();
        wireSectionToggles();
        wireSearchButtons();
        wireMessagePanel();
        setMode('VIEW');

        console.log('[DDM] Module ready | branch:', state.branchId, '| operator:', state.operatorId);
    }

    // Public API
    return { init };

})();
