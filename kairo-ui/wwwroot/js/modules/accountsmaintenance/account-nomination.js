/**
 * Account Nomination Module
 * Thoroughly refactored to match legacy behavior including dual lookup logic
 * (Client search vs Existing Nominee search) and strict percentage validation.
 */
window.AccountNominationModule = (function () {
    'use strict';

    const state = {
        currentMode: 'VIEW',
        nominees: [],
        selectedIndex: -1,
        updateCount: 0
    };

    const API = {
        GET: 'get-account-nominee',
        SAVE: 'add-edit-account-nominee',
        DELETE: 'delete-account-nominee'
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
    const isChecked = (id) => el(id)?.checked || false;
    const setChecked = (id, v) => { const e = el(id); if (e) e.checked = !!v; };

    function showMsg(msg, type) {
        const t = window.showSystemToast || window.parent?.showSystemToast;
        if (t) t(msg, { variant: type === 'error' ? 'danger' : type });
        console.log(`[AccountNomination] ${type}: ${msg}`);
    }

    // ── Mode Management ────────────────────────────────────────
    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD' || mode === 'EDIT';

        const fields = ['nominationPercentage', 'isDependent', 'isNominationRollover', 'remarks'];
        fields.forEach(id => {
            const e = el(id);
            if (e) e.disabled = !editing;
        });

        // Nominee ID is only editable in ADD mode via lookup
        const idField = el('nomineeId');
        if (idField) idField.disabled = mode !== 'ADD';

        const lookups = document.querySelectorAll('.btn-lookup');
        lookups.forEach(btn => btn.disabled = !editing);

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
            const result = await AppCore.invokeControllerAsync('AccountsMaintenance', API.GET, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                OperatorID: ctx.OperatorID
            });

            if (result && result.success) {
                const d = result.Details || result.data?.Details || result.data || [];
                state.nominees = Array.isArray(d) ? d : [d];

                if (state.nominees.length > 0) {
                    state.selectedIndex = 0;
                    populateForm(state.nominees[0]);
                    setMode('VIEW');
                    renderNomineeSummary();
                } else {
                    showMsg('No current nomination details found', 'info');
                    clearForm();
                    setMode('VIEW');
                }
            } else {
                showMsg(result?.message || 'Failed to load nomination details', 'error');
            }
        } catch (err) {
            showMsg('Error loading nomination details: ' + err.message, 'error');
        } finally {
            if (loader) loader.hidden = true;
        }
    }

    function populateForm(data) {
        if (!data) return;
        state.updateCount = data.UpdateCount || 0;
        setVal('nomineeId', data.NomineeID || '');
        setVal('nomineeName', data.NomineeName || '');
        setVal('nominationPercentage', data.NominationPercentage || '0');
        setChecked('isDependent', data.IsDependent === 1 || data.IsDependent === true);
        setChecked('isNominationRollover', data.IsNominationRollover === 1 || data.IsNominationRollover === true);
        setVal('remarks', data.Remarks || '');

        // Audit Fields (Behind the Scene)
        setTxt('MakerID', data.CreatedBy || data.MakerID);
        setTxt('MakerDT', data.CreatedOn || data.MakerDT);
        setTxt('CheckerID', data.SupervisedBy || data.CheckerID);
        setTxt('CheckerDT', data.SupervisedOn || data.CheckerDT);
        setTxt('ModifierID', data.ModifiedBy || data.ModifierID);
        setTxt('ModifierDT', data.ModifiedOn || data.ModifierDT);
    }

    function clearForm() {
        ['nomineeId', 'nomineeName', 'nominationPercentage', 'remarks'].forEach(id => setVal(id, ''));
        ['isDependent', 'isNominationRollover'].forEach(id => setChecked(id, false));
        ['MakerID', 'MakerDT', 'CheckerID', 'CheckerDT', 'ModifierID', 'ModifierDT'].forEach(id => setTxt(id, '-'));
        state.selectedIndex = -1;
        state.updateCount = 0;
    }

    function renderNomineeSummary() {
        // Optional: populate a list if multiple nominees exist (legacy usually only shows one in the form at a time)
        console.log(`[AccountNomination] Current Nominees: ${state.nominees.length}`);
    }

    async function handleSave() {
        if (!val('nomineeId')) { showMsg('Please select a Nominee', 'warning'); return false; }

        const pct = parseFloat(val('nominationPercentage'));
        if (isNaN(pct) || pct < 1 || pct > 100) {
            showMsg('Nomination percentage must be between 1 and 100', 'warning');
            return false;
        }

        const ok = await AppCore.showConfirmation('Save Nomination', 'Are you sure you want to save these nomination details?');
        if (!ok) return false;

        const ctx = getContext();
        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            NomineeID: val('nomineeId'),
            NomineeName: val('nomineeName'),
            NominationPercentage: pct,
            IsDependent: isChecked('isDependent') ? 1 : 0,
            IsNominationRollover: isChecked('isNominationRollover') ? 1 : 0,
            Remarks: val('remarks'),
            OperatorID: ctx.OperatorID,
            UpdateCount: state.updateCount,
            NewRecord: state.currentMode === 'ADD' ? 1 : 0
        };

        try {
            const result = await AppCore.invokeControllerAsync('AccountsMaintenance', API.SAVE, payload);
            if (result && result.success) {
                showMsg(result.message || 'Nomination details saved successfully', 'success');
                loadData();
                setMode('VIEW');
                return true;
            } else {
                showMsg(result?.message || 'Failed to save nomination details', 'error');
                return false;
            }
        } catch (err) {
            showMsg('Save error: ' + err.message, 'error');
            return false;
        }
    }

    async function handleDelete() {
        if (!val('nomineeId')) { showMsg('No nominee selected for deletion', 'warning'); return; }

        const ok = await AppCore.showConfirmation('Delete Nominee', 'Are you sure you want to remove this nominee from the account?');
        if (!ok) return;

        const ctx = getContext();
        try {
            const result = await AppCore.invokeControllerAsync('AccountsMaintenance', API.DELETE, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                NomineeID: val('nomineeId'),
                OperatorID: ctx.OperatorID
            });

            if (result && result.success) {
                showMsg(result.message || 'Nominee deleted successfully', 'success');
                loadData();
            } else {
                showMsg(result?.message || 'Delete failed', 'error');
            }
        } catch (err) {
            showMsg('Delete error: ' + err.message, 'error');
        }
    }

    // ── Lookups ────────────────────────────────────────────────
    function wireLookups() {
        /**
         * Search Clients: To pick a NEW nominee from the bank's clients.
         */
        document.querySelector('[data-lookup="Nominee"]')?.addEventListener('click', () => {
            if (window.SearchModal) {
                const modal = new window.SearchModal(window.AppCore);
                modal.open({
                    tableID: 'CustomerID', // Search global client database
                    onSelect: (r) => {
                        setVal('nomineeId', r.CustomerID || r.ID);
                        setVal('nomineeName', r.CustomerName || r.Description || r.CustomerTitle);
                        showMsg('Client selected as nominee candidate', 'info');
                    }
                });
            }
        });

        /**
         * Search Existing: To pick from nominees ALREADY attached to this account.
         */
        document.querySelector('[data-lookup="ExistingNominee"]')?.addEventListener('click', () => {
            const ctx = getContext();
            if (window.SearchModal) {
                const modal = new window.SearchModal(window.AppCore);
                modal.open({
                    tableID: 'AccountNominee', // Search specifically account nominees
                    params: { AccountID: ctx.AccountID, OurBranchID: ctx.OurBranchID },
                    onSelect: (r) => {
                        populateForm(r);
                        state.currentMode = 'VIEW';
                        setMode('VIEW');
                    }
                });
            }
        });
    }

    // ── Init ───────────────────────────────────────────────────
    function init() {
        console.log('[AccountNomination] Initializing (Thorough Migration)');
        setMode('VIEW');
        wireLookups();

        const ctx = getContext();
        if (ctx.AccountID) {
            loadData();
        }

        // Section Toggles
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
    }

    return {
        init: init,
        save: handleSave,
        edit: () => setMode('EDIT'),
        add: () => { clearForm(); state.currentMode = 'ADD'; setMode('ADD'); },
        delete: handleDelete,
        cancel: async () => {
            const ok = await AppCore.showConfirmation('Cancel', 'Are you sure you want to cancel your changes?');
            if (ok) { loadData(); setMode('VIEW'); }
        },
        view: loadData,
        refresh: loadData
    };
})();

console.log('[AccountNomination] Module loaded');
