/**
 * Account Charge Rates Module
 * Thoroughly refactored to match legacy behavior including tiered settings grid,
 * XML generation for multiple tiers, and local grid CRUD.
 */
window.AccountChargeRatesModule = (function () {
    'use strict';

    const state = {
        currentMode: 'VIEW',
        chargeRates: [],
        chargeSettings: [], // Array of tiered settings
        selectedSettingIndex: -1,
        updateCount: 0
    };

    const API = {
        GET: 'get-account-charge-rate',
        SAVE: 'add-edit-account-charge-rate',
        DELETE: 'delete-account-charge-rate'
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
        console.log(`[ChargeRates] ${type}: ${msg}`);
    }

    function fmtAmt(n) {
        const num = parseFloat(String(n).replace(/,/g, '')) || 0;
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // ── Mode Management ────────────────────────────────────────
    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD' || mode === 'EDIT';

        const mainFields = ['chargeId', 'effectiveDate', 'expiryDate'];
        const settingFields = ['ceilingAmountType', 'ceilingAmount', 'calculationMethod', 'minCharge', 'maximumCharge', 'value', 'fixedAmount'];

        [...mainFields, ...settingFields].forEach(id => {
            const e = el(id);
            if (e) e.disabled = !editing;
        });

        // Grid buttons
        document.querySelectorAll('[data-grid-action]').forEach(btn => {
            btn.disabled = !editing;
        });

        // Main lookups
        document.querySelectorAll('.btn-lookup').forEach(btn => btn.disabled = !editing);

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
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.GET}`, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                OperatorID: ctx.OperatorID
            });

            if (result && result.success) {
                const d = result.Details || result.data?.Details || result.data || {};
                const header = d.Details01?.[0] || {};
                state.updateCount = header.UpdateCount || 0;

                populateHeader(header);

                state.chargeSettings = d.Details02 || [];
                renderSettingsGrid();

                showMsg('Charge rate details loaded', 'success');
                setMode('VIEW');
            } else {
                showMsg(result?.message || 'Failed to load charge rates', 'error');
            }
        } catch (err) {
            showMsg('Error loading charge rates: ' + err.message, 'error');
        } finally {
            if (loader) loader.hidden = true;
        }
    }

    function populateHeader(d) {
        setVal('chargeId', d.ChargeID || '');
        setVal('chargeName', d.ChargeName || d.Description || '');
        setVal('effectiveDate', formatDateForInput(d.EffectiveDate));
        setVal('expiryDate', formatDateForInput(d.ExpiryDate));

        // Audit
        setTxt('MakerID', d.CreatedBy || d.MakerID);
        setTxt('MakerDT', d.CreatedOn || d.MakerDT);
        setTxt('CheckerID', d.SupervisedBy || d.CheckerID);
        setTxt('CheckerDT', d.SupervisedOn || d.CheckerDT);
        setTxt('ModifierID', d.ModifiedBy || d.ModifierID);
        setTxt('ModifierDT', d.ModifiedOn || d.ModifierDT);
    }

    function clearForm() {
        ['chargeId', 'chargeName', 'effectiveDate', 'expiryDate'].forEach(id => setVal(id, ''));
        ['MakerID', 'MakerDT', 'CheckerID', 'CheckerDT', 'ModifierID', 'ModifierDT'].forEach(id => setTxt(id, '-'));
        state.chargeSettings = [];
        state.selectedSettingIndex = -1;
        state.updateCount = 0;
        clearSettingForm();
        renderSettingsGrid();
    }

    function formatDateForInput(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toISOString().split('T')[0];
    }

    // ── Grid Operations ────────────────────────────────────────
    function renderSettingsGrid() {
        const tbody = el('chargeSettingsBody');
        if (!tbody) return;

        if (state.chargeSettings.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No records to display.</td></tr>';
            return;
        }

        tbody.innerHTML = state.chargeSettings.map((s, i) => `
            <tr onclick="AccountChargeRatesModule.selectSetting(${i})" class="${state.selectedSettingIndex === i ? 'table-primary' : ''}" style="cursor:pointer">
                <td>${fmtAmt(s.CeilingAmount || s.CeilingAmount)}</td>
                <td>${fmtAmt(s.MinimumCharge || s.MinCharge)}</td>
                <td>${fmtAmt(s.MaximumCharge || s.MaxCharge)}</td>
                <td>${s.CalculationMethodID || ''}</td>
                <td>${s.Value || '0'}</td>
                <td>${fmtAmt(s.FixedAmount || s.FixedAmt)}</td>
            </tr>
        `).join('');
    }

    function collectSetting() {
        return {
            CeilingAmountTypeID: val('ceilingAmountType'),
            CeilingAmount: val('ceilingAmount') || '0',
            CalculationMethodID: val('calculationMethod'),
            MinimumCharge: val('minCharge') || '0',
            MaximumCharge: val('maximumCharge') || '0',
            Value: val('value') || '0',
            FixedAmount: val('fixedAmount') || '0'
        };
    }

    function clearSettingForm() {
        ['ceilingAmountType', 'ceilingAmount', 'calculationMethod', 'minCharge', 'maximumCharge', 'value', 'fixedAmount'].forEach(id => setVal(id, ''));
        state.selectedSettingIndex = -1;
    }

    // ── Action Handlers ────────────────────────────────────────
    function buildXMLData() {
        const ctx = getContext();
        const effDate = val('effectiveDate');
        const chargeId = val('chargeId');

        let xml = '';
        state.chargeSettings.forEach(row => {
            xml += '<dt_ChargeRates>';
            xml += '<BankID>00</BankID>';
            xml += `<OurBranchID>${ctx.OurBranchID}</OurBranchID>`;
            xml += `<ChargeID>${chargeId}</ChargeID>`;
            xml += `<CalculationMethod>${row.CalculationMethodID}</CalculationMethod>`;
            xml += `<CeilingAmount>${row.CeilingAmount}</CeilingAmount>`;
            xml += '<ComparisonSignID>=</ComparisonSignID>';
            xml += '<ComparisonSign>Equal To</ComparisonSign>';
            xml += `<MinimumCharge>${row.MinimumCharge || row.MinCharge}</MinimumCharge>`;
            xml += `<MaximumCharge>${row.MaximumCharge || row.MaxCharge}</MaximumCharge>`;
            xml += `<EffectiveDate>${effDate}</EffectiveDate>`;
            xml += '<ButtonMark>N</ButtonMark>';
            xml += '<EffectiveDateID>0</EffectiveDateID>';
            xml += '<UpdateCount>1</UpdateCount>';
            xml += `<AccountID>${ctx.AccountID}</AccountID>`;
            xml += `<Value>${row.Value}</Value>`;
            xml += `<FixedAmount>${row.FixedAmount}</FixedAmount>`;
            xml += '</dt_ChargeRates>';
        });
        return xml;
    }

    async function handleSave() {
        if (!val('chargeId')) { showMsg('Charge ID is required', 'warning'); return false; }
        if (!val('effectiveDate')) { showMsg('Effective Date is required', 'warning'); return false; }
        if (state.chargeSettings.length === 0) { showMsg('Please add at least one charge tier', 'warning'); return false; }

        const ok = await AppCore.showConfirmation('Save Charge Rate', 'Are you sure you want to save these charge rates?');
        if (!ok) return false;

        const ctx = getContext();
        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            ChargeID: val('chargeId'),
            EffectiveDate: val('effectiveDate'),
            ExpiryDate: val('expiryDate'),
            EffectiveDateID: 0,
            ApplicationID: '',
            OperatorID: ctx.OperatorID,
            XMLData: buildXMLData()
        };

        try {
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.SAVE}`, payload);
            if (result && result.success) {
                showMsg(result.message || 'Charge rates saved successfully', 'success');
                loadData();
                setMode('VIEW');
                return true;
            } else {
                showMsg(result?.message || 'Failed to save charge rates', 'error');
                return false;
            }
        } catch (err) {
            showMsg('Save error: ' + err.message, 'error');
            return false;
        }
    }

    async function handleDelete() {
        if (!val('chargeId')) return;
        const ctx = getContext();
        const ok = await AppCore.showConfirmation('Delete Charge Rate', 'Are you sure you want to delete this charge rate setting?');
        if (!ok) return;

        try {
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.DELETE}`, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                ChargeID: val('chargeId'),
                OperatorID: ctx.OperatorID
            });
            if (result && result.success) {
                showMsg('Charge rate deleted successfully', 'success');
                loadData();
                setMode('VIEW');
            } else {
                showMsg(result?.message || 'Delete failed', 'error');
            }
        } catch (err) {
            showMsg('Delete error: ' + err.message, 'error');
        }
    }

    // ── Init & Wire ───────────────────────────────────────────
    function init() {
        console.log('[ChargeRates] Initializing (Thorough Migration)');
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

        // Search Lookups
        document.querySelectorAll('.btn-lookup').forEach(btn => {
            btn.addEventListener('click', () => {
                const type = btn.getAttribute('data-lookup');
                if (window.SearchModal) {
                    const modal = new window.SearchModal(window.AppCore);
                    modal.open({
                        tableID: type,
                        onSelect: (r) => {
                            if (type === 'Charge') {
                                setVal('chargeId', r.ChargeID || r.ID);
                                setVal('chargeName', r.ChargeDescription || r.ChargeName || r.Description);
                            }
                        }
                    });
                }
            });
        });

        // Grid Actions
        document.querySelector('[data-grid-action="new"]')?.addEventListener('click', () => {
            const s = collectSetting();
            if (!s.CalculationMethodID) { showMsg('Calculation method required', 'warning'); return; }
            state.chargeSettings.push(s);
            clearSettingForm();
            renderSettingsGrid();
            showMsg('New setting tier added to grid', 'info');
        });

        document.querySelector('[data-grid-action="update"]')?.addEventListener('click', () => {
            if (state.selectedSettingIndex < 0) { showMsg('Please select a row from the grid to update', 'warning'); return; }
            state.chargeSettings[state.selectedSettingIndex] = collectSetting();
            clearSettingForm();
            renderSettingsGrid();
            showMsg('Setting tier updated', 'info');
        });

        document.querySelector('[data-grid-action="remove"]')?.addEventListener('click', () => {
            if (state.selectedSettingIndex < 0) { showMsg('Select row to remove', 'warning'); return; }
            state.chargeSettings.splice(state.selectedSettingIndex, 1);
            clearSettingForm();
            renderSettingsGrid();
            showMsg('Setting tier removed', 'info');
        });

        document.querySelector('[data-grid-action="clear"]')?.addEventListener('click', clearSettingForm);

        const ctx = getContext();
        if (ctx.AccountID) loadData();
    }

    return {
        init: init,
        save: handleSave,
        delete: handleDelete,
        edit: () => setMode('EDIT'),
        add: () => { clearForm(); state.chargeSettings = []; renderSettingsGrid(); setMode('ADD'); },
        cancel: async () => {
            const ok = await AppCore.showConfirmation('Cancel', 'Are you sure you want to cancel your changes?');
            if (ok) { loadData(); setMode('VIEW'); }
        },
        view: loadData,
        selectSetting: (i) => {
            state.selectedSettingIndex = i;
            const s = state.chargeSettings[i];
            setVal('ceilingAmountType', s.CeilingAmountTypeID || '');
            setVal('ceilingAmount', s.CeilingAmount || s.CeilingAmount);
            setVal('calculationMethod', s.CalculationMethodID || '');
            setVal('minCharge', s.MinimumCharge || s.MinCharge);
            setVal('maximumCharge', s.MaximumCharge || s.MaxCharge);
            setVal('value', s.Value || '');
            setVal('fixedAmount', s.FixedAmount || s.FixedAmt);
            renderSettingsGrid();
        }
    };
})();

console.log('[AccountChargeRates] Module loaded');
