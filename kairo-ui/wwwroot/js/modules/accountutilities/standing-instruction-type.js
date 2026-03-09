/**
 * Standing Instruction Type Module
 * Migrated from: public/modules/AccountUtilities/standing-instruction-type.js
 *
 * Handles CRUD for Standing Instruction Type records via:
 *   GET  /AccountUtilities/api/get-si-type   → dbo.p_GetSITypes
 *   POST /AccountUtilities/api/save-si-type  → dbo.p_AddEditSITypes
 */

window.StandingInstructionTypeModule = (function () {
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
        GET:  '/AccountUtilities/api/get-si-type',
        SAVE: '/AccountUtilities/api/save-si-type'
    };

    // ─────────────────────────────────────────────────────────────────────────
    // Helpers
    // ─────────────────────────────────────────────────────────────────────────
    const getEl  = (id) => document.getElementById(id);
    const val    = (id) => (getEl(id)?.value ?? '').trim();
    const setVal = (id, v) => { const el = getEl(id); if (el) el.value = v ?? ''; };
    const setText = (id, v) => { const el = getEl(id); if (el) el.textContent = v || '-'; };

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = String(text ?? '');
        return div.innerHTML;
    }

    function isSuccess(result) {
        if (!result) return false;
        const code = result.ResponseCode ?? result.responseCode ?? result.StatusCode ?? '';
        return String(code) === '00' || String(code) === '0' || result.success === true;
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
    // Form field selectors (all editable non-readonly controls inside the form card)
    // ─────────────────────────────────────────────────────────────────────────
    const FIELD_IDS = [
        'txt_instructionTypeId',
        'txt_description',
        'ddl_siTransferType',
        'txt_noOfRetries',
        'txt_retryAfterDays',
        'ddl_failedChargeType',
        'chk_freezeAmountOnFailure',
        'txt_successfulTrxId',
        'txt_successfulTrxName',
        'txt_successfulNarration',
        'txt_failureTrxId',
        'txt_failureTrxName',
        'txt_failureNarration'
    ];

    // ─────────────────────────────────────────────────────────────────────────
    // Mode management
    // ─────────────────────────────────────────────────────────────────────────
    function setMode(mode) {
        console.log('[SIT] Setting mode:', mode);
        state.currentMode = mode;

        const isEditing = mode === 'ADD' || mode === 'EDIT';

        // Enable / disable form fields
        FIELD_IDS.forEach(id => {
            const el = getEl(id);
            if (!el || el.readOnly) return;
            // Instruction Type ID is only editable in ADD mode
            if (id === 'txt_instructionTypeId') {
                el.disabled = mode !== 'ADD';
            } else {
                el.disabled = !isEditing;
            }
        });

        // Search buttons follow edit mode (except SI Type button → always available)
        const searchSI = getEl('btn_searchSIType');
        if (searchSI) searchSI.disabled = false;  // always available for lookup

        const searchSuccess = getEl('btn_searchSuccessfulTrx');
        if (searchSuccess) searchSuccess.disabled = !isEditing;

        const searchFailure = getEl('btn_searchFailureTrx');
        if (searchFailure) searchFailure.disabled = !isEditing;

        // Action buttons
        const btnStates = {
            view:   { active: mode === 'VIEW', disabled: mode === 'VIEW'    },
            add:    { active: mode === 'ADD',  disabled: isEditing           },
            edit:   { active: mode === 'EDIT', disabled: isEditing           },
            delete: { active: false,           disabled: isEditing           },
            save:   { active: false,           disabled: !isEditing          },
            cancel: { active: false,           disabled: !isEditing          }
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

        setVal('txt_instructionTypeId',   r.SITypeID          || '');
        setVal('txt_description',         r.Description       || '');
        setVal('ddl_siTransferType',      r.SITransferType    || r.TransferType || '');
        setVal('txt_noOfRetries',         r.NoOfRetries       || '');
        setVal('txt_retryAfterDays',      r.RetryAfterDays    || '');
        setVal('ddl_failedChargeType',    r.FailedChargeType  || '');

        const freezeEl = getEl('chk_freezeAmountOnFailure');
        if (freezeEl) {
            const raw = r.FreezeAmountOnFailure;
            freezeEl.checked = raw === '1' || raw === true || raw === 'true';
        }

        setVal('txt_successfulTrxId',      r.SuccessfulTrxID   || r.SuccessfulTransactionID   || '');
        setVal('txt_successfulTrxName',    r.SuccessfulTrxName  || r.SuccessfulTransactionName || '');
        setVal('txt_successfulNarration',  r.SuccessfulNarration || '');
        setVal('txt_failureTrxId',         r.FailureTrxID       || r.FailureTransactionID      || '');
        setVal('txt_failureTrxName',       r.FailureTrxName     || r.FailureTransactionName    || '');
        setVal('txt_failureNarration',     r.FailureNarration   || '');

        // Audit (Behind The Scene) - read-only display spans
        setText('sit_createdBy',   r.CreatedBy   || '-');
        setText('sit_createdOn',   r.CreatedOn   || '-');
        setText('sit_modifiedBy',  r.ModifiedBy  || '-');
        setText('sit_modifiedOn',  r.ModifiedOn  || '-');
        setText('sit_supervisedBy', r.SupervisedBy || '-');
        setText('sit_supervisedOn', r.SupervisedOn || '-');

        state.originalData = { ...r };
    }

    function clearForm() {
        FIELD_IDS.forEach(id => {
            const el = getEl(id);
            if (!el) return;
            if (el.type === 'checkbox') {
                el.checked = false;
            } else {
                el.value = '';
            }
        });

        ['sit_createdBy','sit_createdOn','sit_modifiedBy',
         'sit_modifiedOn','sit_supervisedBy','sit_supervisedOn'].forEach(id => setText(id, '-'));

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
        const freezeEl = getEl('chk_freezeAmountOnFailure');
        return {
            SITypeID:              val('txt_instructionTypeId'),
            Description:           val('txt_description'),
            SITransferType:        val('ddl_siTransferType'),
            NoOfRetries:           val('txt_noOfRetries'),
            RetryAfterDays:        val('txt_retryAfterDays'),
            FailedChargeType:      val('ddl_failedChargeType'),
            FreezeAmountOnFailure: freezeEl?.checked ? '1' : '0',
            SuccessfulTrxID:       val('txt_successfulTrxId'),
            SuccessfulNarration:   val('txt_successfulNarration'),
            FailureTrxID:          val('txt_failureTrxId'),
            FailureNarration:      val('txt_failureNarration'),
            OurBranchID:           state.branchId,
            OperatorID:            state.operatorId,
            NewRecord:             state.currentMode === 'ADD' ? '1' : '0'
        };
    }

    // ─────────────────────────────────────────────────────────────────────────
    // API Calls
    // ─────────────────────────────────────────────────────────────────────────
    async function fetchSITypeDetails(siTypeId) {
        try {
            showLoading(true);
            const payload = {
                BankID:      '00',
                OurBranchID: state.branchId,
                SITypeID:    siTypeId,
                OperatorID:  state.operatorId,
                Direction:   0
            };

            const response = await fetch(API.GET, {
                method:  'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(payload)
            });

            const result = await response.json();
            console.log('[SIT] GetSIType response:', result);

            const details = result?.Details ?? result?.data ?? result?.Data ?? null;
            const row = Array.isArray(details) ? details[0] : details;

            if (row) {
                populateForm(row);
                showMessage('Record loaded.', 'success');
            } else {
                showMessage(result?.ResponseMessage || 'No record found.', 'warning');
            }
        } catch (err) {
            console.error('[SIT] Error fetching SI Type:', err);
            showMessage('Error loading record: ' + err.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    async function saveData() {
        const siTypeId = val('txt_instructionTypeId');
        if (!siTypeId) {
            showMessage('Instruction Type ID is required.', 'warning');
            return;
        }

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
            console.log('[SIT] SaveSIType response:', result);

            if (isSuccess(result)) {
                showMessage('Record saved successfully.', 'success');
                state.originalData = { ...collectFormData() };
                setMode('VIEW');
            } else {
                showMessage(result?.ResponseMessage || result?.message || 'Save failed.', 'error');
            }
        } catch (err) {
            console.error('[SIT] Error saving SI Type:', err);
            showMessage('Error saving record: ' + err.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    async function deleteData() {
        const siTypeId = val('txt_instructionTypeId');
        if (!siTypeId) {
            showMessage('No record selected to delete.', 'warning');
            return;
        }

        if (!confirm(`Delete SI Type "${siTypeId}"?`)) return;

        try {
            showLoading(true);
            const payload = {
                SITypeID:    siTypeId,
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
            console.error('[SIT] Error deleting SI Type:', err);
            showMessage('Error deleting record: ' + err.message, 'error');
        } finally {
            showLoading(false);
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UI helpers
    // ─────────────────────────────────────────────────────────────────────────
    function showLoading(visible) {
        const overlay = getEl('sit_loadingOverlay');
        if (overlay) overlay.hidden = !visible;
    }

    function showMessage(text, type) {
        const panel = getEl('sit_messagePanel');
        const span  = getEl('sit_messageText');
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
    // Header control wiring (Refresh / Maximize / Close)
    // ─────────────────────────────────────────────────────────────────────────
    function wireHeaderControls() {
        document.querySelector('[data-action="refresh"]')?.addEventListener('click', () => {
            const siTypeId = val('txt_instructionTypeId');
            if (siTypeId) {
                fetchSITypeDetails(siTypeId);
            } else {
                clearForm();
                showMessage('Enter or search for an SI Type ID first.', 'info');
            }
        });

        document.querySelector('[data-action="maximize"]')?.addEventListener('click', () => {
            const sidebar = document.getElementById('main-sidebar');
            if (sidebar) sidebar.classList.toggle('collapsed');
        });

        document.querySelector('[data-action="close"]')?.addEventListener('click', () => {
            if (window.closeSubmodule) window.closeSubmodule();
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Action button wiring (View / Add / Edit / Delete / Save / Cancel)
    // ─────────────────────────────────────────────────────────────────────────
    function wireActionButtons() {
        const actions = {
            view:   () => { restoreForm(); setMode('VIEW'); },
            add:    () => setMode('ADD'),
            edit:   () => setMode('EDIT'),
            delete: () => deleteData(),
            save:   () => saveData(),
            cancel: () => { restoreForm(); setMode('VIEW'); }
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
            console.warn('[SIT] SearchModal not available - search buttons will be disabled');
            return;
        }

        const searchModal = new window.SearchModal(appCore);
        state.searchModal = searchModal;

        // 1. SI Type lookup
        getEl('btn_searchSIType')?.addEventListener('click', () => {
            searchModal.open({
                tableID:    'SITypeID',
                moduleID:   '1000',
                autoSearch: true,
                onSelect: (record) => {
                    setVal('txt_instructionTypeId', record.SITypeID    || '');
                    setVal('txt_description',       record.Description || '');
                    // Fetch full record to populate all remaining fields
                    const siTypeId = record.SITypeID || '';
                    if (siTypeId) fetchSITypeDetails(siTypeId);
                }
            });
        });

        // 2. Successful Transaction lookup
        getEl('btn_searchSuccessfulTrx')?.addEventListener('click', () => {
            searchModal.open({
                tableID:  'TrxDescriptionID',
                moduleID: '1000',
                onSelect: (record) => {
                    setVal('txt_successfulTrxId',   record.TrxDescriptionID || '');
                    setVal('txt_successfulTrxName', record.Description      || '');
                }
            });
        });

        // 3. Failure Transaction lookup
        getEl('btn_searchFailureTrx')?.addEventListener('click', () => {
            searchModal.open({
                tableID:  'TrxDescriptionID',
                moduleID: '1000',
                onSelect: (record) => {
                    setVal('txt_failureTrxId',   record.TrxDescriptionID || '');
                    setVal('txt_failureTrxName', record.Description      || '');
                }
            });
        });
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Public init
    // ─────────────────────────────────────────────────────────────────────────
    function init() {
        console.log('[SIT] Initializing Standing Instruction Type module...');

        loadContext();
        wireHeaderControls();
        wireActionButtons();
        wireSectionToggles();
        wireSearchButtons();
        setMode('VIEW');

        console.log('[SIT] Module ready | branch:', state.branchId, '| operator:', state.operatorId);
    }

    // Public API
    return { init };

})();
