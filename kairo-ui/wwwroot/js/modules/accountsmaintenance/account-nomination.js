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
        updateCount: 0,
        selectedNomineeClientID: '',
        hasLoadedRecord: false,
        createdBy: '',
        createdOn: ''
    };

    const API = {
        GET: 'get-account-nominee',
        OPENING: 'check-account-nominee-opening',
        CREATE: 'add-account-nominee',
        UPDATE: 'update-account-nominee',
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

    function normalizeNomineeClientID(data) {
        return data?.NomineeClientID
            || data?.NomineeID
            || data?.nomineeClientID
            || data?.nomineeID
            || data?.ClientID
            || data?.CustomerID
            || '';
    }

    function isSuccessResult(result) {
        const responseCode = String(result?.ResponseCode ?? result?.responseCode ?? '').trim();
        return Boolean(
            result?.success
            || result?.Success
            || responseCode === '00'
            || responseCode === '0'
            || responseCode === '000'
        );
    }

    function getResultDetails(result) {
        return result?.Details ?? result?.data?.Details ?? result?.data ?? null;
    }

    function getResultMessage(result, fallbackMessage = '') {
        return result?.message || result?.Message || result?.ResponseMessage || fallbackMessage;
    }

    function buildNomineeSearchKey(ctx) {
        return `[OurBranchID:${ctx.OurBranchID}][AccountID:${ctx.AccountID}]`;
    }

    function buildNomineeAdvFilter(ctx) {
        return `OurBranchID = '${ctx.OurBranchID}' AND AccountID = '${ctx.AccountID}'`;
    }

    function formatSqlDateAtMidnight(value) {
        if (!value) {
            return null;
        }

        const parsed = window.GlobalUtils?.parseDateInput
            ? window.GlobalUtils.parseDateInput(value)
            : String(value).slice(0, 10);

        return parsed ? `${parsed} 00:00:00` : null;
    }

    // ── Mode Management ────────────────────────────────────────
    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD' || mode === 'EDIT';
        const hasRecord = state.hasLoadedRecord;

        const fields = ['nominationPercentage', 'isDependent', 'isNominationRollover', 'remarks'];
        fields.forEach(id => {
            const e = el(id);
            if (e) e.disabled = !editing;
        });

        // Nominee ID is only editable in ADD mode via lookup
        const idField = el('nomineeId');
        if (idField) idField.disabled = mode !== 'ADD';

        const nomineeLookup = el('btn_searchNominee');
        if (nomineeLookup) {
            nomineeLookup.disabled = false;
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
        if (btnEdit) btnEdit.disabled = editing || !hasRecord;
        if (btnSave) btnSave.disabled = !editing;
        if (btnCancel) btnCancel.disabled = !editing;
        if (btnDelete) btnDelete.disabled = editing || !hasRecord;
    }

    // ── Data Operations ────────────────────────────────────────
    async function loadData(nomineeClientID = '') {
        const ctx = getContext();
        if (!ctx.AccountID) {
            showMsg('Please select an account first', 'warning');
            return;
        }

        const loader = el('loadingOverlay');
        if (loader) loader.hidden = false;

        try {
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.GET}`, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                NomineeClientID: nomineeClientID || state.selectedNomineeClientID || '',
                OperatorID: ctx.OperatorID,
                Direction: 0
            });

            if (isSuccessResult(result)) {
                const d = getResultDetails(result) || [];
                const nominees = Array.isArray(d) ? d : (d ? [d] : []);

                state.nominees = nominees.filter(Boolean);

                if (nomineeClientID) {
                    state.selectedNomineeClientID = nomineeClientID;
                }

                if (state.nominees.length > 0) {
                    const matchIndex = nomineeClientID
                        ? state.nominees.findIndex(item => normalizeNomineeClientID(item) === nomineeClientID)
                        : 0;

                    state.selectedIndex = matchIndex >= 0 ? matchIndex : 0;
                    state.hasLoadedRecord = true;
                    populateForm(state.nominees[state.selectedIndex]);
                    setMode('VIEW');
                    renderNomineeSummary();
                } else {
                    showMsg('No current nomination details found', 'info');
                    clearForm();
                    setMode('VIEW');
                }
            } else {
                state.hasLoadedRecord = false;
                showMsg(getResultMessage(result, 'Failed to load nomination details'), 'error');
            }
        } catch (err) {
            state.hasLoadedRecord = false;
            showMsg('Error loading nomination details: ' + err.message, 'error');
        } finally {
            if (loader) loader.hidden = true;
        }
    }

    async function loadNomineeOpening(nomineeClientID) {
        const ctx = getContext();
        if (!ctx.AccountID || !ctx.OurBranchID || !nomineeClientID) {
            showMsg('Please select an account and nominee first', 'warning');
            return;
        }

        const loader = el('loadingOverlay');
        if (loader) loader.hidden = false;

        try {
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.OPENING}`, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                NomineeClientID: nomineeClientID,
                OperatorID: ctx.OperatorID
            });

            if (isSuccessResult(result)) {
                const details = getResultDetails(result);
                if (details && typeof details === 'object') {
                    populateForm(details);
                    state.currentMode = 'ADD';
                    setMode('ADD');
                    showMsg(getResultMessage(result, 'Nominee loaded successfully'), 'success');
                } else {
                    setVal('nomineeId', nomineeClientID);
                    state.selectedNomineeClientID = nomineeClientID;
                    state.currentMode = 'ADD';
                    setMode('ADD');
                    showMsg('Nominee selected. Complete the remaining details.', 'info');
                }
            } else {
                showMsg(getResultMessage(result, 'Failed to load nominee opening details'), 'error');
            }
        } catch (err) {
            showMsg('Error loading nominee opening details: ' + err.message, 'error');
        } finally {
            if (loader) loader.hidden = true;
        }
    }

    function populateForm(data) {
        if (!data) return;
        state.hasLoadedRecord = true;
        state.updateCount = data.UpdateCount || 0;
        state.selectedNomineeClientID = normalizeNomineeClientID(data);
        state.createdBy = data.CreatedBy || data.MakerID || state.createdBy || '';
        state.createdOn = data.CreatedOn || data.MakerDT || state.createdOn || '';
        setVal('nomineeId', state.selectedNomineeClientID);
        setVal('nomineeName', data.NomineeName || data.CustomerName || data.ClientName || '');
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
        state.nominees = [];
        state.selectedIndex = -1;
        state.updateCount = 0;
        state.selectedNomineeClientID = '';
        state.hasLoadedRecord = false;
        state.createdBy = '';
        state.createdOn = '';
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
        const createdBy = state.createdBy || 'web_portal';
        const createdOn = formatSqlDateAtMidnight(state.createdOn || window.GlobalUtils?.getCurrentDate?.() || new Date().toISOString().slice(0, 10));
        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            NomineeClientID: val('nomineeId'),
            NominationPercentage: pct,
            IsDependent: isChecked('isDependent') ? 1 : 0,
            IsNominationRollover: isChecked('isNominationRollover') ? 1 : 0,
            Remarks: val('remarks'),
            CreatedBy: createdBy,
            CreatedOn: createdOn,
            ModifiedBy: ctx.OperatorID || null,
            ModifiedOn: null,
            SupervisedBy: null,
            NewRecord: 2
        };

        try {
            const endpoint = state.currentMode === 'ADD' ? API.CREATE : API.UPDATE;
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${endpoint}`, payload);
            if (isSuccessResult(result)) {
                showMsg(getResultMessage(result, 'Nomination details saved successfully'), 'success');
                loadData();
                setMode('VIEW');
                return true;
            } else {
                showMsg(getResultMessage(result, 'Failed to save nomination details'), 'error');
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
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.DELETE}`, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                NomineeID: val('nomineeId'),
                NomineeClientID: val('nomineeId'),
                OperatorID: ctx.OperatorID
            });

            if (isSuccessResult(result)) {
                showMsg(getResultMessage(result, 'Nominee deleted successfully'), 'success');
                loadData();
            } else {
                showMsg(getResultMessage(result, 'Delete failed'), 'error');
            }
        } catch (err) {
            showMsg('Delete error: ' + err.message, 'error');
        }
    }

    // ── Lookups ────────────────────────────────────────────────
    function wireLookups() {
        el('btn_searchNominee')?.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            const ctx = getContext();
            if (!window.SearchModal) {
                return;
            }

            if (window.SearchModal) {
                const modal = new window.SearchModal(window.AppCore);

                if (state.currentMode === 'ADD') {
                    modal.open({
                        tableID: 'CustomerID',
                        onSelect: (r) => {
                            const nomineeClientID = normalizeNomineeClientID(r);
                            if (!nomineeClientID) {
                                showMsg('Selected client is missing a nominee client ID', 'warning');
                                return;
                            }

                            loadNomineeOpening(nomineeClientID);
                        }
                    });
                    return;
                }

                if (!ctx.AccountID || !ctx.OurBranchID) {
                    showMsg('Please select an account first', 'warning');
                    return;
                }

                modal.open({
                    tableID: 'AccountNomineeID',
                    moduleID: 1390,
                    advFilterString: buildNomineeAdvFilter(ctx),
                    searchKey: buildNomineeSearchKey(ctx),
                    ourbranchId: ctx.OurBranchID,
                    onSelect: (r) => {
                        const nomineeClientID = normalizeNomineeClientID(r);
                        if (!nomineeClientID) {
                            showMsg('Selected nominee is missing a client ID', 'warning');
                            return;
                        }

                        loadData(nomineeClientID);
                    }
                });
            }
        });
    }

    // ── Init ───────────────────────────────────────────────────
    function init() {
        console.log('[AccountNomination] Initializing (Thorough Migration)');
        clearForm();
        setMode('VIEW');
        wireLookups();

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
        edit: () => {
            if (!state.hasLoadedRecord) {
                showMsg('Please load a nominee first', 'warning');
                return;
            }

            setMode('EDIT');
        },
        add: () => { clearForm(); state.currentMode = 'ADD'; setMode('ADD'); },
        delete: handleDelete,
        cancel: async () => {
            const ok = await AppCore.showConfirmation('Cancel', 'Are you sure you want to cancel your changes?');
            if (ok) {
                if (state.hasLoadedRecord || val('nomineeId')) {
                    loadData();
                } else {
                    clearForm();
                    setMode('VIEW');
                }
            }
        },
        view: loadData,
        refresh: loadData
    };
})();

console.log('[AccountNomination] Module loaded');
