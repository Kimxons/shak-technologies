/**
 * Account Blocking / Unblocking Module
 * Thoroughly refactored to match legacy behavior including context-sensitive reasons
 * (Block vs Unblock) and dual API endpoints for blocking/unblocking operations.
 */
window.AccountBlockingModule = (function () {
    'use strict';

    const state = {
        currentMode: 'VIEW',
        blockingDetails: [],
        currentActiveRecord: null,
        isBlocked: false,
        updateCount: 0
    };

    const API = {
        GET_DETAILS: 'api/get-blocked-details',
        BLOCK: 'api/block-entity',
        UNBLOCK: 'api/unblock-entity'
    };

    /**
     * Get context from global state or storage
     */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID: ps?.AccountID || sessionStorage.getItem('currentAccountID') || '',
            OurBranchID:
                ps?.OurBranchID ||
                ps?.BranchID ||
                sessionStorage.getItem('currentBranchID') ||
                sessionStorage.getItem('branch_code') ||
                sessionStorage.getItem('branch_id') ||
                localStorage.getItem('OurBranchID') ||
                localStorage.getItem('BranchID') ||
                '',
            OperatorID:
                ps?.OperatorID ||
                sessionStorage.getItem('currentOperatorID') ||
                sessionStorage.getItem('user_name') ||
                sessionStorage.getItem('user_id') ||
                localStorage.getItem('OperatorID') ||
                localStorage.getItem('user_name') ||
                'web_portal'
        };
    }

    // ── UI Helpers ─────────────────────────────────────────────
    const el = (id) => document.getElementById(id);
    const val = (id) => el(id)?.value?.trim() || '';
    const setVal = (id, v) => { const e = el(id); if (e) e.value = (v == null) ? '' : v; };
    const setTxt = (id, v) => {
        const e = el(id);
        if (!e) return;
        const nextValue = (v == null || v === '') ? '-' : v;
        if ('value' in e) e.value = nextValue;
        else e.textContent = nextValue;
    };

    function showMsg(msg, type) {
        const t = window.showSystemToast || window.parent?.showSystemToast;
        if (t) t(msg, { variant: type === 'error' ? 'danger' : type });
        console.log(`[Blocking] ${type}: ${msg}`);
    }

    function isResultFailure(result) {
        if (!result) return false;

        const envelope = (result?.data && typeof result.data === 'object') ? result.data : result;

        const successFlag = envelope?.success ?? envelope?.Success ?? result?.success ?? result?.Success;
        if (successFlag === false || String(successFlag).toLowerCase() === 'false') {
            return true;
        }

        const responseCode = String(
            envelope?.ResponseCode ?? envelope?.responseCode ?? result?.ResponseCode ?? result?.responseCode ?? ''
        ).trim();

        if (responseCode && !['00', '0', '000'].includes(responseCode)) {
            return true;
        }

        return false;
    }

    function getResultMessage(result, fallback = '') {
        if (!result) return fallback;

        const envelope = (result?.data && typeof result.data === 'object') ? result.data : result;

        return (
            envelope?.ResponseMessage ||
            envelope?.message ||
            envelope?.Message ||
            envelope?.ErrorMessage ||
            envelope?.error ||
            envelope?.Details?.error ||
            result?.message ||
            result?.Message ||
            fallback
        );
    }

    function isNoBlockedDetailsResult(result) {
        if (!result) return false;

        const envelope = (result?.data && typeof result.data === 'object') ? result.data : result;
        const responseCode = String(envelope?.ResponseCode ?? envelope?.responseCode ?? '').trim();
        const message = String(getResultMessage(result, '')).trim().toLowerCase();
        const detailsError = String(envelope?.Details?.error ?? envelope?.error ?? '').trim().toLowerCase();

        return responseCode === 'DBEX000020' || detailsError === 'no_blocked_details' || message.includes('no blocked details');
    }

    function normalizeBlockingDetails(result) {
        const envelope = (result?.data && typeof result.data === 'object') ? result.data : result;
        const details = envelope?.Details ?? envelope?.data ?? envelope ?? {};

        if (Array.isArray(details)) return details;
        if (Array.isArray(details?.Details01)) return details.Details01;
        if (Array.isArray(details?.BlockedDetails)) return details.BlockedDetails;
        if (Array.isArray(details?.blockedDetails)) return details.blockedDetails;
        if (Array.isArray(envelope?.Details01)) return envelope.Details01;
        if (
            details &&
            typeof details === 'object' &&
            !Array.isArray(details) &&
            (
                details.ReferenceID != null ||
                details.BlockedDate ||
                details.BlockedReasonID ||
                details.BlockedReason ||
                details.Status
            )
        ) {
            return [details];
        }
        return [];
    }

    function isActiveBlockedRecord(record) {
        if (!record) return false;

        const hasBlockMarker = !!(
            record.BlockedReasonID ||
            record.BlockedReason ||
            record.BlockedDate ||
            String(record.Status || '').trim().toLowerCase() === 'entity_blocked'
        );

        return hasBlockMarker && !record.UnBlockedDate;
    }

    function applyEmptyState(message) {
        state.blockingDetails = [];
        state.currentActiveRecord = null;
        state.isBlocked = false;
        state.updateCount = 0;

        updateUILabels();
        clearForm();
        setVal('previousStatus', 'Active');
        setMode('VIEW');

        if (message) {
            showMsg(message, 'info');
        }
    }

    // ── Mode Management ────────────────────────────────────────
    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD' || mode === 'EDIT';

        ['reason', 'description', 'instructionGivenBy'].forEach(id => {
            const e = el(id);
            if (e) e.disabled = !editing;
        });

        if (editing) {
            loadReasonsDropdown();
        }

        // Update Global Buttons
        const btnView = document.getElementById('submoduleBtnView');
        const btnAdd = document.getElementById('submoduleBtnAdd');
        const btnEdit = document.getElementById('submoduleBtnEdit');
        const btnSave = document.getElementById('submoduleBtnSave');
        const btnCancel = document.getElementById('submoduleBtnCancel');
        const btnDelete = document.getElementById('submoduleBtnDelete');

        if (btnView) btnView.disabled = editing;
        if (btnAdd) btnAdd.disabled = editing;
        if (btnEdit) btnEdit.disabled = editing;
        if (btnSave) btnSave.disabled = !editing;
        if (btnCancel) btnCancel.disabled = !editing;
        if (btnDelete) btnDelete.disabled = editing;
    }

    // ── Data Operations ────────────────────────────────────────
    async function loadData() {
        const ctx = getContext();
        if (!ctx.AccountID) {
            showMsg('Please select an account first', 'warning');
            return;
        }

        const loader = el('loadingOverlay');
        if (loader) loader.hidden = false;

        try {
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/${API.GET_DETAILS}`, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                ModuleTypeID: 'A', // Acc
                RelevantID: ctx.AccountID,
                ModuleID: 1420, // Acc Blocking
                OperatorID: ctx.OperatorID
            });

            if (isNoBlockedDetailsResult(result)) {
                applyEmptyState('Account is active');
                return;
            }

            if (isResultFailure(result)) {
                showMsg(getResultMessage(result, 'Failed to load blocking details'), 'error');
                return;
            }

            const allRecords = normalizeBlockingDetails(result);
            state.blockingDetails = allRecords;

            // Find any record that is currently blocked, even when backend returns reason text instead of reason ID.
            const activeRecord = allRecords.find(isActiveBlockedRecord);
            state.currentActiveRecord = activeRecord || null;
            state.isBlocked = !!activeRecord;
            state.updateCount = activeRecord?.UpdateCount || allRecords[0]?.UpdateCount || 0;

            updateUILabels();

            if (allRecords.length === 0) {
                applyEmptyState('Account is active');
                return;
            }

            populateForm(activeRecord || allRecords[0]);

            showMsg(state.isBlocked ? 'Account is currently blocked' : 'Account is active', 'info');
            setMode('VIEW');
        } catch (err) {
            showMsg('Error loading blocking details: ' + err.message, 'error');
        } finally {
            if (loader) loader.hidden = true;
        }
    }

    function updateUILabels() {
        const reasonLabel = document.querySelector('label[for="reason"]');
        if (reasonLabel) {
            reasonLabel.textContent = state.isBlocked ? 'Unblock Reason' : 'Block Reason';
        }

        const saveBtnText = document.querySelector('[data-action="save"] span');
        if (saveBtnText) {
            saveBtnText.textContent = state.isBlocked ? 'Unblock Account' : 'Block Account';
        }
    }

    function getOptionValue(option) {
        return option?.Value || option?.value || option?.ID || option?.id || option?.SubCodeID || option?.subCodeID || option?.CodeID || option?.codeID || '';
    }

    function getOptionLabel(option) {
        return option?.Label || option?.label || option?.Description || option?.description || option?.CodeDescription || option?.codeDescription || option?.Text || option?.text || '';
    }

    function isHistoricalUnblockedRecord(record) {
        if (!record) return false;

        return !!(
            record.UnBlockedDate ||
            record.UnBlockedReasonID ||
            record.UnBlockedReason ||
            String(record.Status || '').trim().toLowerCase() === 'entity_unblocked'
        );
    }

    async function loadReasonsDropdown() {
        const reasonSelect = el('reason');
        if (!reasonSelect) return;

        try {
            const endpoint = state.isBlocked ? 'api/get-unblocked-reasons' : 'api/get-blocked-reasons';
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/${endpoint}`, {});

            const options = result?.Details || result?.details || result?.data?.Details || result?.data?.details || result?.data || [];
            reasonSelect.innerHTML = '<option value="">Select Reason...</option>';
            options.forEach(opt => {
                const optionValue = getOptionValue(opt);
                const optionLabel = getOptionLabel(opt);
                if (!optionValue && !optionLabel) return;

                const o = document.createElement('option');
                o.value = optionValue;
                o.textContent = optionLabel || optionValue;
                reasonSelect.appendChild(o);
            });
        } catch (e) {
            console.error('Failed to load reasons', e);
        }
    }

    function populateForm(d) {
        if (!d) {
            clearForm();
            return;
        }

        const hasHistoricalUnblock = isHistoricalUnblockedRecord(d);
        const primaryStatus = state.isBlocked ? 'Blocked' : 'Active';
        const detailDate = hasHistoricalUnblock ? (d.UnBlockedDate || d.ModifiedOn || d.SupervisedOn) : (d.BlockedDate || d.Date);
        const detailReason = hasHistoricalUnblock
            ? (d.UnBlockedReasonID || d.UnBlockedReason || '-')
            : (d.BlockedReasonID || d.BlockedReason || d.ReasonID || '-');
        const detailDescription = hasHistoricalUnblock
            ? (d.UnBlockedDescription || d.BlockedDescription || d.Description || '-')
            : (d.BlockedDescription || d.Description || d.UnBlockedDescription || '-');
        const detailInstruction = hasHistoricalUnblock
            ? (d.UnBlockedInstructionBy || d.BlockedInstructionBy || d.InstructionGivenBy || '-')
            : (d.BlockedInstructionBy || d.InstructionGivenBy || d.UnBlockedInstructionBy || '-');

        // Form Fields
        setVal('reason', '');
        setVal('description', '');
        setVal('instructionGivenBy', '');

        // Audit Fields (Behind the Scene)
        setVal('previousStatus', primaryStatus);
        setVal('btsDate', formatDate(detailDate));
        setVal('reasonId', detailReason);
        setVal('btsDescription', detailDescription);
        setVal('btsInstructionGivenBy', detailInstruction);

        setTxt('MakerID', d.CreatedBy || d.MakerID);
        setTxt('MakerDT', formatDate(d.CreatedOn || d.MakerDT));
        setTxt('CheckerID', d.SupervisedBy || d.CheckerID);
        setTxt('CheckerDT', formatDate(d.SupervisedOn || d.CheckerDT));
        setTxt('ModifierID', d.ModifiedBy || d.ModifierID);
        setTxt('ModifierDT', formatDate(d.ModifiedOn || d.ModifierDT));
    }

    function clearForm() {
        ['reason', 'description', 'instructionGivenBy', 'previousStatus', 'btsDate', 'reasonId', 'btsDescription', 'btsInstructionGivenBy'].forEach(id => setVal(id, ''));
        ['MakerID', 'MakerDT', 'CheckerID', 'CheckerDT', 'ModifierID', 'ModifierDT'].forEach(id => setTxt(id, '-'));
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        if (window.GlobalUtils?.formatDateTime) {
            return window.GlobalUtils.formatDateTime(dateStr);
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleString();
    }

    // ── Save Operation ─────────────────────────────────────────
    async function handleSave() {
        if (!val('reason')) { showMsg('Please select a reason', 'warning'); return false; }
        if (!val('description')) { showMsg('Description is required', 'warning'); return false; }

        const actionName = state.isBlocked ? 'Unblock' : 'Block';
        const ok = await AppCore.showConfirmation(`${actionName} Account`, `Are you sure you want to ${actionName.toLowerCase()} this account?`);
        if (!ok) return false;

        const ctx = getContext();
        const now = new Date().toISOString();

        if (state.isBlocked) {
            // PERFORM UNBLOCK
            const payload = {
                OurBranchID: ctx.OurBranchID,
                ModuleTypeID: 'A',
                RelevantID: ctx.AccountID,
                ReferenceID: state.currentActiveRecord?.ReferenceID || state.currentActiveRecord?.BlockedID || state.currentActiveRecord?.ID || 0,
                UnBlockedDate: now,
                UnBlockedReasonID: val('reason'),
                UnBlockedDescription: val('description'),
                UnBlockedInstructionBy: val('instructionGivenBy'),
                ModifiedBy: ctx.OperatorID,
                ModifiedOn: now,
                OperatorID: ctx.OperatorID,
                NewRecord: state.updateCount || 0
            };

            try {
                const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/${API.UNBLOCK}`, payload);
                if (!isResultFailure(result)) {
                    showMsg(getResultMessage(result, 'Account unblocked successfully'), 'success');
                    loadData();
                    return true;
                } else {
                    showMsg(getResultMessage(result, 'Unblock failed'), 'error');
                }
            } catch (err) { showMsg('Error: ' + err.message, 'error'); }
        } else {
            // PERFORM BLOCK
            const payload = {
                OurBranchID: ctx.OurBranchID,
                ModuleTypeID: 'A',
                RelevantID: ctx.AccountID,
                BlockedDate: now,
                BlockedReasonID: val('reason'),
                BlockedDescription: val('description'),
                BlockedInstructionBy: val('instructionGivenBy'),
                CreatedBy: ctx.OperatorID,
                CreatedOn: now,
                OperatorID: ctx.OperatorID
            };

            try {
                const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/${API.BLOCK}`, payload);
                if (!isResultFailure(result)) {
                    showMsg(getResultMessage(result, 'Account blocked successfully'), 'success');
                    loadData();
                    return true;
                } else {
                    showMsg(getResultMessage(result, 'Block failed'), 'error');
                }
            } catch (err) { showMsg('Error: ' + err.message, 'error'); }
        }
        return false;
    }

    // ── Init & Wire ───────────────────────────────────────────
    function init() {
        console.log('[AccountBlocking] Initializing (Thorough Migration)');
        setMode('VIEW');

        // Section toggles
        document.querySelectorAll('[data-section-toggle]').forEach(hdr => {
            hdr.addEventListener('click', function () {
                const sec = this.closest('.form-section');
                const content = sec?.querySelector('.section-content, [data-section-content]');
                const icon = this.querySelector('.bi-chevron-up, .bi-chevron-down');
                if (content) {
                    content.hidden = !content.hidden;
                    icon?.classList.toggle('bi-chevron-up');
                    icon?.classList.toggle('bi-chevron-down');
                }
            });
        });

        // History Action
        document.querySelector('[data-action="history"]')?.addEventListener('click', () => {
            showMsg('Blocking history navigation requested', 'info');
            // Logic to show a modal or navigate to a history view
        });

        const ctx = getContext();
        if (ctx.AccountID) loadData();
    }

    function showHistory() {
        showMsg('Blocking history navigation requested', 'info');
    }

    return {
        init: init,
        save: handleSave,
        edit: () => setMode('EDIT'),
        cancel: () => { loadData(); setMode('VIEW'); },
        view: loadData,
        showHistory: showHistory
    };
})();

console.log('[AccountBlocking] Module loaded');
