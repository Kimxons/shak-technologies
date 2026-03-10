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
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'web_portal'
        };
    }

    // ── UI Helpers ─────────────────────────────────────────────
    const el = (id) => document.getElementById(id);
    const val = (id) => el(id)?.value?.trim() || '';
    const setVal = (id, v) => { const e = el(id); if (e) e.value = (v == null) ? '' : v; };
    const setTxt = (id, v) => { const e = el(id); if (e) e.textContent = (v == null) ? '-' : v; };

    function showMsg(msg, type) {
        const t = window.showSystemToast || window.parent?.showSystemToast;
        if (t) t(msg, { variant: type === 'error' ? 'danger' : type });
        console.log(`[Blocking] ${type}: ${msg}`);
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
            const result = await AppCore.invokeControllerAsync('AccountsMaintenance/' + API.GET_DETAILS, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                ModuleTypeID: 'A', // Acc
                RelevantID: ctx.AccountID,
                ModuleID: 1420, // Acc Blocking
                OperatorID: ctx.OperatorID
            });

            if (result && result.success) {
                const d = result.Details || result.data?.Details || result.data || {};
                const allRecords = d.Details01 || [];
                state.blockingDetails = allRecords;

                // Find any record that is currently BLOCKED (has BlockedReasonID but no UnBlockedDate)
                const activeRecord = allRecords.find(r => r.BlockedReasonID && !r.UnBlockedDate);
                state.currentActiveRecord = activeRecord || null;
                state.isBlocked = !!activeRecord;
                state.updateCount = activeRecord?.UpdateCount || 0;

                updateUILabels();
                populateForm(activeRecord || allRecords[0]);

                showMsg(state.isBlocked ? 'Account is currently blocked' : 'Account is active', 'info');
                setMode('VIEW');
            } else {
                showMsg(result?.message || 'Failed to load blocking details', 'error');
            }
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

    async function loadReasonsDropdown() {
        const reasonSelect = el('reason');
        if (!reasonSelect) return;

        try {
            const endpoint = state.isBlocked ? 'api/get-unblocked-reasons' : 'api/get-blocked-reasons';
            const result = await AppCore.invokeControllerAsync('AccountsMaintenance/' + endpoint, {});

            const options = result?.Details || result?.data || [];
            reasonSelect.innerHTML = '<option value="">Select Reason...</option>';
            options.forEach(opt => {
                const o = document.createElement('option');
                o.value = opt.Value || opt.ID;
                o.textContent = opt.Label || opt.Description;
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

        // Form Fields
        setVal('reason', state.isBlocked ? '' : (d.BlockedReasonID || d.ReasonID));
        setVal('description', state.isBlocked ? '' : (d.BlockedDescription || d.Description));
        setVal('instructionGivenBy', state.isBlocked ? '' : (d.BlockedInstructionBy || d.InstructionGivenBy));

        // Audit Fields (Behind the Scene)
        setVal('previousStatus', state.isBlocked ? 'Blocked' : 'Active');
        setVal('btsDate', formatDate(d.BlockedDate || d.Date));
        setVal('reasonId', d.BlockedReasonID || d.ReasonID || d.UnBlockedReasonID || '-');
        setVal('btsDescription', d.BlockedDescription || d.Description || d.UnBlockedDescription || '-');
        setVal('btsInstructionGivenBy', d.BlockedInstructionBy || d.InstructionGivenBy || d.UnBlockedInstructionBy || '-');

        setTxt('MakerID', d.CreatedBy || d.MakerID);
        setTxt('MakerDT', formatDate(d.CreatedOn || d.MakerDT));
        setTxt('CheckerID', d.SupervisedBy || d.CheckerID);
        setTxt('CheckerDT', formatDate(d.SupervisedOn || d.CheckerDT));
    }

    function clearForm() {
        ['reason', 'description', 'instructionGivenBy', 'previousStatus', 'btsDate', 'reasonId', 'btsDescription', 'btsInstructionGivenBy'].forEach(id => setVal(id, ''));
        ['MakerID', 'MakerDT', 'CheckerID', 'CheckerDT'].forEach(id => setTxt(id, '-'));
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
                const result = await AppCore.invokeControllerAsync('AccountsMaintenance/' + API.UNBLOCK, payload);
                if (result && result.success) {
                    showMsg(result.message || 'Account unblocked successfully', 'success');
                    loadData();
                    return true;
                } else {
                    showMsg(result?.message || 'Unblock failed', 'error');
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
                const result = await AppCore.invokeControllerAsync('AccountsMaintenance/' + API.BLOCK, payload);
                if (result && result.success) {
                    showMsg(result.message || 'Account blocked successfully', 'success');
                    loadData();
                    return true;
                } else {
                    showMsg(result?.message || 'Block failed', 'error');
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

    return {
        init: init,
        save: handleSave,
        edit: () => setMode('EDIT'),
        cancel: () => { loadData(); setMode('VIEW'); },
        view: loadData
    };
})();

console.log('[AccountBlocking] Module loaded');
