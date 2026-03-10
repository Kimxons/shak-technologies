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
        updateCount: 0,
        currentRateID: 0
    };

    const API = {
        GET: 'get-account-charge-rate',
        ADD: 'add-account-charge-rate',
        UPDATE: 'update-account-charge-rate',
        DELETE: 'delete-account-charge-rate'
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
    const setTxt = (id, v) => { const e = el(id); if (e) e.textContent = (v == null) ? '-' : v; };

    function refreshGridActionButtons() {
        const editing = state.currentMode === 'ADD' || state.currentMode === 'EDIT';
        const hasSelection = state.selectedSettingIndex >= 0 && state.selectedSettingIndex < state.chargeSettings.length;

        const btnNew = document.querySelector('[data-grid-action="new"]');
        const btnUpdate = document.querySelector('[data-grid-action="update"]');
        const btnRemove = document.querySelector('[data-grid-action="remove"]');
        const btnClear = document.querySelector('[data-grid-action="clear"]');

        if (btnNew) btnNew.disabled = !editing;
        if (btnClear) btnClear.disabled = !editing;
        if (btnUpdate) btnUpdate.disabled = !editing || !hasSelection;
        if (btnRemove) btnRemove.disabled = !editing || !hasSelection;
    }

    function populateSettingForm(setting) {
        if (!setting) return;
        setVal('ceilingAmountType', setting.CeilingAmountTypeID || '');
        setVal('ceilingAmount', setting.CeilingAmount || setting.CeilingAmount);
        setVal('calculationMethod', setting.CalculationMethodID || setting.CalculationMethod || '');
        setVal('minCharge', setting.MinimumCharge || setting.MinCharge);
        setVal('maximumCharge', setting.MaximumCharge || setting.MaxCharge);
        setVal('value', setting.Value || '');
        setVal('fixedAmount', setting.FixedAmount || setting.FixedAmt);
    }

    function showMsg(msg, type) {
        const t = window.showSystemToast || window.parent?.showSystemToast;
        if (t) t(msg, { variant: type === 'error' ? 'danger' : type });
        console.log(`[ChargeRates] ${type}: ${msg}`);
    }

    function getCaseInsensitive(row, keys) {
        if (!row || !keys || keys.length === 0) return '';
        const allKeys = Object.keys(row);
        for (const candidate of keys) {
            const found = allKeys.find(k => k.toLowerCase() === String(candidate).toLowerCase());
            if (found && row[found] != null && row[found] !== '') {
                return row[found];
            }
        }
        return '';
    }

    function fmtAmt(n) {
        const num = parseFloat(String(n).replace(/,/g, '')) || 0;
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function normalizeDecimal(value, fallback = '0') {
        const raw = String(value ?? '').trim();
        if (!raw) return fallback;

        const cleaned = raw.replace(/,/g, '');
        const parsed = Number(cleaned);
        if (!Number.isFinite(parsed)) return fallback;
        return String(parsed);
    }

    function normalizeInteger(value, fallback = '0') {
        const raw = String(value ?? '').trim();
        if (!raw) return fallback;

        const parsed = parseInt(raw, 10);
        if (!Number.isFinite(parsed)) return fallback;
        return String(parsed);
    }

    function normalizeMethodId(value) {
        const raw = String(value ?? '').trim();
        if (!raw || raw === '--Select--') return '';
        return raw;
    }

    function getNumericIdFromObject(row, keys) {
        const picked = getCaseInsensitive(row, keys);
        const normalized = normalizeInteger(picked, '0');
        const asNumber = Number(normalized);
        return Number.isFinite(asNumber) && asNumber > 0 ? asNumber : 0;
    }

    function extractRateIdFromRow(row) {
        return getNumericIdFromObject(row, [
            'RateID',
            'RateId',
            'rateID',
            'rateId',
            'rateid',
            'ChargeRateID',
            'ChargeRateId',
            'AccountChargeRateID',
            'AccountChargeRateId',
            'EffectiveDateID',
            'ID',
            'Id'
        ]);
    }

    // ── Mode Management ────────────────────────────────────────
    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD' || mode === 'EDIT';

        const mainFields = ['chargeId', 'effectiveDate', 'expiryDate'];
        const settingFields = ['ceilingAmountType', 'ceilingAmount', 'calculationMethod', 'minCharge', 'maximumCharge', 'value', 'fixedAmount'];

        // Charge selection must stay available in VIEW so user can search and load records.
        mainFields.forEach(id => {
            const e = el(id);
            if (e) e.disabled = false;
        });

        settingFields.forEach(id => {
            const e = el(id);
            if (e) e.disabled = !editing;
        });

        // Charge name is editable to allow direct name-based lookup.
        const chargeName = el('chargeName');
        if (chargeName) chargeName.readOnly = false;

        refreshGridActionButtons();

        // Keep lookup active in VIEW so charge selection search remains usable.
        document.querySelectorAll('.btn-lookup').forEach(btn => btn.disabled = !editing);
        document.querySelectorAll('.btn-lookup').forEach(btn => {
            if ((btn.dataset.lookup || '').toLowerCase().includes('charge')) {
                btn.disabled = false;
            }
        });

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
    function isResultFailure(result) {
        if (!result) return false;

        const envelope = (result?.data && typeof result.data === 'object') ? result.data : result;

        const successFlag = envelope?.success ?? envelope?.Success ?? result?.success ?? result?.Success;
        if (successFlag === false || String(successFlag).toLowerCase() === 'false') {
            return true;
        }

        const responseCode = String(envelope?.ResponseCode ?? envelope?.responseCode ?? result?.ResponseCode ?? result?.responseCode ?? '').trim();
        if (responseCode && !['00', '0', '000'].includes(responseCode)) {
            return true;
        }

        return false;
    }

    function getResultMessage(result, fallback) {
        const envelope = (result?.data && typeof result.data === 'object') ? result.data : result;
        return (
            envelope?.message ||
            envelope?.Message ||
            envelope?.ErrorMessage ||
            envelope?.ResponseMessage ||
            envelope?.Details?.error ||
            result?.message ||
            result?.Message ||
            fallback
        );
    }

    function looksLikeChargeRateDetail(payload) {
        if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return false;
        const keys = Object.keys(payload).map(k => k.toLowerCase());
        return keys.includes('chargeid') ||
            keys.includes('rateid') ||
            keys.includes('effectivedate') ||
            keys.includes('minimumcharge') ||
            keys.includes('maximumcharge') ||
            keys.includes('fixedamount');
    }

    function normalizeChargeRateResponse(result) {
        const envelope = (result?.data && typeof result.data === 'object') ? result.data : result;
        const payload = envelope?.Details ?? envelope?.data?.Details ?? envelope ?? {};

        const chargeRates = Array.isArray(payload?.ChargeRates)
            ? payload.ChargeRates
            : Array.isArray(payload?.chargeRates)
                ? payload.chargeRates
                : null;

        if (chargeRates) {
            return {
                header: chargeRates[0] || null,
                settings: chargeRates
            };
        }

        if (Array.isArray(payload)) {
            return {
                header: payload[0] || null,
                settings: payload
            };
        }

        const isSingleDetail = looksLikeChargeRateDetail(payload);

        return {
            header: payload?.Details01?.[0] || payload?.Header || (isSingleDetail ? payload : null),
            settings: payload?.Details02 || payload?.Settings || (isSingleDetail ? [payload] : [])
        };
    }

    async function loadData() {
        const ctx = getContext();
        if (!ctx.AccountID) {
            showMsg('Please select an account first', 'warning');
            return;
        }

        if (!ctx.OurBranchID) {
            showMsg('Branch context is missing. Reload Account Maintenance and try again.', 'warning');
            return;
        }

        if (!ctx.OperatorID) {
            showMsg('Operator context is missing. Please sign in again.', 'warning');
            return;
        }

        const chargeId = await resolveChargeSelectionForView();
        if (!chargeId) {
            showMsg('Charge selection is required. Enter Charge ID/Name or use lookup search.', 'warning');
            return;
        }

        const loader = el('loadingOverlay');
        if (loader) loader.hidden = false;

        try {
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.GET}`, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                ChargeID: chargeId,
                EffectiveDate: val('effectiveDate') || '',
                EffectiveDateID: 0,
                OperatorID: ctx.OperatorID
            });

            if (isResultFailure(result)) {
                showMsg(getResultMessage(result, 'Failed to load charge rates'), 'error');
                return;
            }

            const normalized = normalizeChargeRateResponse(result);

            if (normalized.header || (normalized.settings && normalized.settings.length > 0)) {
                const header = normalized.header || normalized.settings[0] || {};
                state.updateCount = Number(getCaseInsensitive(header, ['UpdateCount']) || 0) || 0;
                state.currentRateID = extractRateIdFromRow(header);

                populateHeader(header);
                state.chargeSettings = Array.isArray(normalized.settings) ? normalized.settings : [];
                renderSettingsGrid();

                showMsg('Charge rate details loaded', 'success');
                setMode('VIEW');
            } else {
                state.chargeSettings = [];
                state.updateCount = 0;
                state.currentRateID = 0;
                clearSettingForm();
                renderSettingsGrid();
                setMode('ADD');
                showMsg('No existing charge rate found. Click Add to create a new one.', 'info');
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
        state.currentRateID = 0;
        clearSettingForm();
        renderSettingsGrid();
    }

    function formatDateForInput(dateStr) {
        if (!dateStr) return '';
        if (window.GlobalUtils?.parseDateInput) {
            const parsed = window.GlobalUtils.parseDateInput(dateStr);
            if (parsed) return parsed;
        }
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toISOString().split('T')[0];
    }

    // ── Grid Operations ────────────────────────────────────────
    function renderSettingsGrid() {
        const tbody = el('chargeSettingsBody');
        if (!tbody) return;

        if (state.chargeSettings.length === 0) {
            state.selectedSettingIndex = -1;
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No records to display.</td></tr>';
            refreshGridActionButtons();
            return;
        }

        tbody.innerHTML = state.chargeSettings.map((s, i) => `
            <tr onclick="AccountChargeRatesModule.selectSetting(${i})" class="${state.selectedSettingIndex === i ? 'table-primary' : ''}" style="cursor:pointer">
                <td>${fmtAmt(s.CeilingAmount || s.CeilingAmount)}</td>
                <td>${fmtAmt(s.MinimumCharge || s.MinCharge)}</td>
                <td>${fmtAmt(s.MaximumCharge || s.MaxCharge)}</td>
                <td>${s.CalculationMethodID || s.CalculationMethod || ''}</td>
                <td>${s.Value || '0'}</td>
                <td>${fmtAmt(s.FixedAmount || s.FixedAmt)}</td>
            </tr>
        `).join('');

        refreshGridActionButtons();
    }

    function collectSetting() {
        return {
            CeilingAmountTypeID: val('ceilingAmountType'),
            CeilingAmount: normalizeDecimal(val('ceilingAmount')),
            CalculationMethodID: normalizeMethodId(val('calculationMethod')),
            MinimumCharge: normalizeDecimal(val('minCharge')),
            MaximumCharge: normalizeDecimal(val('maximumCharge')),
            Value: normalizeDecimal(val('value')),
            FixedAmount: normalizeDecimal(val('fixedAmount'))
        };
    }

    function clearSettingForm(resetSelection = true) {
        ['ceilingAmountType', 'ceilingAmount', 'calculationMethod', 'minCharge', 'maximumCharge', 'value', 'fixedAmount'].forEach(id => setVal(id, ''));
        if (resetSelection) {
            state.selectedSettingIndex = -1;
        }
        refreshGridActionButtons();
    }

    function hasDraftTierInput() {
        const fields = ['ceilingAmountType', 'ceilingAmount', 'calculationMethod', 'minCharge', 'maximumCharge', 'value', 'fixedAmount'];
        return fields.some(id => val(id));
    }

    function addDraftTierIfPresent() {
        if (state.chargeSettings.length > 0 || !hasDraftTierInput()) {
            return true;
        }

        const draft = collectSetting();
        if (!draft.CalculationMethodID) {
            showMsg('Calculation method is required for a charge tier', 'warning');
            return false;
        }

        state.chargeSettings.push(draft);
        clearSettingForm();
        renderSettingsGrid();
        return true;
    }

    // ── Action Handlers ────────────────────────────────────────
    function buildXMLData() {
        const ctx = getContext();
        const effDate = val('effectiveDate');
        const chargeId = val('chargeId');

        let xml = '';
        state.chargeSettings.forEach(row => {
            const calculationMethod = normalizeMethodId(row.CalculationMethodID || row.CalculationMethod);
            const ceilingAmount = normalizeDecimal(row.CeilingAmount);
            const minimumCharge = normalizeDecimal(row.MinimumCharge || row.MinCharge);
            const maximumCharge = normalizeDecimal(row.MaximumCharge || row.MaxCharge);
            const value = normalizeDecimal(row.Value);
            const fixedAmount = normalizeDecimal(row.FixedAmount || row.FixedAmt);
            const comparisonSignId = normalizeInteger(row.ComparisonSignID, '0');

            xml += '<dt_ChargeRates>';
            xml += '<BankID>00</BankID>';
            xml += `<OurBranchID>${ctx.OurBranchID}</OurBranchID>`;
            xml += `<ChargeID>${chargeId}</ChargeID>`;
            xml += `<CalculationMethod>${calculationMethod}</CalculationMethod>`;
            xml += `<CeilingAmount>${ceilingAmount}</CeilingAmount>`;
            xml += `<ComparisonSignID>${comparisonSignId}</ComparisonSignID>`;
            xml += '<ComparisonSign>Equal To</ComparisonSign>';
            xml += `<MinimumCharge>${minimumCharge}</MinimumCharge>`;
            xml += `<MaximumCharge>${maximumCharge}</MaximumCharge>`;
            xml += `<EffectiveDate>${effDate}</EffectiveDate>`;
            xml += '<ButtonMark>N</ButtonMark>';
            xml += '<EffectiveDateID>0</EffectiveDateID>';
            xml += '<UpdateCount>1</UpdateCount>';
            xml += `<AccountID>${ctx.AccountID}</AccountID>`;
            xml += `<Value>${value}</Value>`;
            xml += `<FixedAmount>${fixedAmount}</FixedAmount>`;
            xml += '</dt_ChargeRates>';
        });
        return xml;
    }

    function getPrimaryTierForSave() {
        if (!state.chargeSettings.length) {
            const fallbackRateId = Number(state.currentRateID) > 0 ? String(state.currentRateID) : '0';
            return {
                RateID: fallbackRateId,
                MinimumCharge: '0',
                MaximumCharge: '0',
                CeilingAmount: '0',
                Amount: '0',
                FixedAmount: '0',
                Formulae: '',
                ComparisonSignID: '0'
            };
        }

        const chosen = state.selectedSettingIndex >= 0
            ? state.chargeSettings[state.selectedSettingIndex]
            : state.chargeSettings[0];

        const resolvedRateId = extractRateIdFromRow(chosen) || Number(state.currentRateID) || 0;

        return {
            RateID: resolvedRateId > 0 ? String(resolvedRateId) : '0',
            MinimumCharge: normalizeDecimal(chosen?.MinimumCharge || chosen?.MinCharge),
            MaximumCharge: normalizeDecimal(chosen?.MaximumCharge || chosen?.MaxCharge),
            CeilingAmount: normalizeDecimal(chosen?.CeilingAmount),
            Amount: normalizeDecimal(chosen?.Value),
            FixedAmount: normalizeDecimal(chosen?.FixedAmount || chosen?.FixedAmt),
            Formulae: String(chosen?.Formulae || ''),
            ComparisonSignID: normalizeInteger(chosen?.ComparisonSignID, '0')
        };
    }

    function validateTierRowsForSave() {
        for (let i = 0; i < state.chargeSettings.length; i += 1) {
            const row = state.chargeSettings[i] || {};
            const methodId = normalizeMethodId(row.CalculationMethodID || row.CalculationMethod);
            if (!methodId) {
                showMsg(`Calculation method is required for charge tier row ${i + 1}`, 'warning');
                return false;
            }
        }

        return true;
    }

    async function handleSave() {
        if (!val('chargeId')) { showMsg('Charge ID is required', 'warning'); return false; }
        if (!val('effectiveDate')) { showMsg('Effective Date is required', 'warning'); return false; }
        if (!addDraftTierIfPresent()) { return false; }
        if (state.chargeSettings.length === 0) { showMsg('Please add at least one charge tier', 'warning'); return false; }
        if (!validateTierRowsForSave()) { return false; }

        const ok = await AppCore.showConfirmation('Save Charge Rate', 'Are you sure you want to save these charge rates?');
        if (!ok) return false;

        const ctx = getContext();
        if (!ctx.OurBranchID) { showMsg('Branch context is missing. Reload Account Maintenance and try again.', 'warning'); return false; }
        if (!ctx.OperatorID) { showMsg('Operator context is missing. Please sign in again.', 'warning'); return false; }
        const primaryTier = getPrimaryTierForSave();
        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            ChargeID: val('chargeId'),
            EffectiveDate: val('effectiveDate'),
            ExpiryDate: val('expiryDate'),
            EffectiveDateID: 0,
            ApplicationID: '',
            OperatorID: ctx.OperatorID,
            NewRecord: state.currentMode === 'ADD' ? 1 : 0,
            UpdateCount: state.updateCount || 0,
            RateID: primaryTier?.RateID || '0',
            MinimumCharge: primaryTier?.MinimumCharge || '0',
            MaximumCharge: primaryTier?.MaximumCharge || '0',
            CeilingAmount: primaryTier?.CeilingAmount || '0',
            Amount: primaryTier?.Amount || '0',
            Formulae: primaryTier?.Formulae || '',
            FixedAmount: primaryTier?.FixedAmount || '0',
            ComparisonSignID: primaryTier?.ComparisonSignID || '0',
            XMLData: buildXMLData()
        };

        const hasValidRateId = Number(payload.RateID) > 0;
        const useUpdate = state.currentMode === 'EDIT' && hasValidRateId;
        const saveEndpoint = useUpdate ? API.UPDATE : API.ADD;
        payload.NewRecord = useUpdate ? 0 : 1;

        if (state.currentMode === 'EDIT' && !hasValidRateId) {
            showMsg('RateID was not found for update; saving as a new charge-rate record instead.', 'info');
        }

        try {
            const result = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${saveEndpoint}`, payload);
            if (!isResultFailure(result)) {
                showMsg(getResultMessage(result, 'Charge rates saved successfully'), 'success');
                loadData();
                setMode('VIEW');
                return true;
            } else {
                showMsg(getResultMessage(result, 'Failed to save charge rates'), 'error');
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
                EffectiveDate: val('effectiveDate') || '',
                EffectiveDateID: 0,
                OperatorID: ctx.OperatorID
            });
            if (!isResultFailure(result)) {
                showMsg(getResultMessage(result, 'Charge rate deleted successfully'), 'success');
                loadData();
                setMode('VIEW');
            } else {
                showMsg(getResultMessage(result, 'Delete failed'), 'error');
            }
        } catch (err) {
            showMsg('Delete error: ' + err.message, 'error');
        }
    }

    function extractSearchRows(response) {
        if (!response?.success) return [];

        const payload = response.data || {};
        const details = payload.Details;

        if (Array.isArray(details)) return details;
        if (details && typeof details === 'object') return [details];
        return [];
    }

    async function searchCharge(searchKey, pageSize = 1) {
        if (!window.AppCore || !searchKey) return [];

        const response = await AppCore.invokeControllerAsync('SearchModal/Search', {
            TableID: 'ChargeID',
            SearchID: 'ChargeID',
            SearchKey: searchKey,
            PrevOrNext: 0,
            PageSize: pageSize,
            RefID: ''
        });

        return extractSearchRows(response);
    }

    async function searchChargeById(chargeId) {
        if (!chargeId) return null;

        const rows = await searchCharge({
            ChargeID: {
                value: chargeId,
                mode: 'equal'
            }
        }, 1);

        return rows[0] || null;
    }

    async function resolveChargeSelectionForView() {
        const chargeId = val('chargeId');
        const chargeName = val('chargeName');

        if (chargeId) {
            return chargeId;
        }

        if (!chargeName) {
            return '';
        }

        const rows = await searchCharge({
            ChargeName: {
                value: chargeName,
                mode: 'like'
            }
        }, 10);

        if (!rows.length) {
            return '';
        }

        const exactMatch = rows.find(r => String(getCaseInsensitive(r, ['ChargeName', 'ChargeDescription', 'Description', 'Name'])).toLowerCase() === chargeName.toLowerCase());
        const selected = exactMatch || rows[0];

        const selectedChargeId = getCaseInsensitive(selected, ['ChargeID', 'ID', 'Code']);
        const selectedChargeName = getCaseInsensitive(selected, ['ChargeName', 'ChargeDescription', 'Description', 'Name']);

        if (selectedChargeId) {
            setVal('chargeId', selectedChargeId);
        }

        if (selectedChargeName) {
            setVal('chargeName', selectedChargeName);
        }

        return selectedChargeId || '';
    }

    function wireChargeLookup() {
        const chargeLookupBtn = document.querySelector('[data-lookup="Charge"], [data-lookup="ChargeID"]');
        const chargeIdInput = el('chargeId');
        const chargeNameInput = el('chargeName');

        const openChargeLookupModal = () => {
            if (!window.SearchModal) {
                showMsg('Search service is not available', 'error');
                return;
            }

            const modal = new window.SearchModal(window.AppCore);
            const searchKey = {};

            if (val('chargeId')) {
                searchKey.ChargeID = { value: val('chargeId'), mode: 'like' };
            }

            if (val('chargeName')) {
                searchKey.ChargeName = { value: val('chargeName'), mode: 'like' };
            }

            modal.open({
                tableID: 'ChargeID',
                searchKey,
                onSelect: (row) => {
                    const selectedChargeId = getCaseInsensitive(row, ['ChargeID', 'ID', 'Code']);
                    const selectedChargeName = getCaseInsensitive(row, ['ChargeName', 'ChargeDescription', 'Description', 'Name']);
                    setVal('chargeId', selectedChargeId);
                    setVal('chargeName', selectedChargeName);
                }
            });
        };

        const resolveChargeById = async (openLookupOnMiss = false) => {
            const chargeId = val('chargeId');
            if (!chargeId) {
                setVal('chargeName', '');
                return;
            }

            // Do not override if user already selected/typed a name.
            if (val('chargeName')) return;

            try {
                const row = await searchChargeById(chargeId);
                if (!row) {
                    setVal('chargeName', '');
                    if (openLookupOnMiss) {
                        openChargeLookupModal();
                    }
                    return;
                }

                const selectedChargeName = getCaseInsensitive(row, ['ChargeName', 'ChargeDescription', 'Description', 'Name']);
                setVal('chargeName', selectedChargeName);
            } catch (error) {
                console.error('[ChargeRates] Failed to resolve charge by ID:', error);
            }
        };

        if (chargeLookupBtn) {
            if (!chargeLookupBtn.dataset.lookupWired) {
                chargeLookupBtn.addEventListener('click', openChargeLookupModal);
                chargeLookupBtn.dataset.lookupWired = 'true';
            }
        }

        if (chargeIdInput) {
            if (!chargeIdInput.dataset.lookupWired) {
                chargeIdInput.addEventListener('blur', async () => {
                    await resolveChargeById(false);
                });

                chargeIdInput.addEventListener('keydown', async (event) => {
                    if (event.key !== 'Enter') return;

                    event.preventDefault();
                    event.stopPropagation();
                    await resolveChargeById(true);
                });

                chargeIdInput.dataset.lookupWired = 'true';
            }
        }

        if (chargeNameInput) {
            if (!chargeNameInput.dataset.lookupWired) {
                chargeNameInput.addEventListener('dblclick', () => {
                    chargeLookupBtn?.click();
                });

                chargeNameInput.addEventListener('keydown', async (event) => {
                    if (event.key !== 'Enter') return;

                    event.preventDefault();
                    event.stopPropagation();

                    const resolvedChargeId = await resolveChargeSelectionForView();
                    if (!resolvedChargeId) {
                        chargeLookupBtn?.click();
                    }
                });

                chargeNameInput.dataset.lookupWired = 'true';
            }
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

        // Charge lookup and typed charge-id resolution.
        wireChargeLookup();

        // Grid Actions
        document.querySelector('[data-grid-action="new"]')?.addEventListener('click', () => {
            const s = collectSetting();
            if (!s.CalculationMethodID) { showMsg('Calculation method required', 'warning'); return; }
            state.chargeSettings.push(s);
            state.selectedSettingIndex = state.chargeSettings.length - 1;
            populateSettingForm(state.chargeSettings[state.selectedSettingIndex]);
            renderSettingsGrid();
            showMsg('New setting tier added to grid', 'info');
        });

        document.querySelector('[data-grid-action="update"]')?.addEventListener('click', () => {
            if (state.selectedSettingIndex < 0) { showMsg('Please select a row from the grid to update', 'warning'); return; }
            state.chargeSettings[state.selectedSettingIndex] = collectSetting();
            populateSettingForm(state.chargeSettings[state.selectedSettingIndex]);
            renderSettingsGrid();
            showMsg('Setting tier updated', 'info');
        });

        document.querySelector('[data-grid-action="remove"]')?.addEventListener('click', () => {
            if (state.selectedSettingIndex < 0) { showMsg('Select row to remove', 'warning'); return; }
            state.chargeSettings.splice(state.selectedSettingIndex, 1);
            if (state.chargeSettings.length === 0) {
                clearSettingForm(true);
            } else {
                state.selectedSettingIndex = Math.min(state.selectedSettingIndex, state.chargeSettings.length - 1);
                populateSettingForm(state.chargeSettings[state.selectedSettingIndex]);
            }
            renderSettingsGrid();
            showMsg('Setting tier removed', 'info');
        });

        document.querySelector('[data-grid-action="clear"]')?.addEventListener('click', () => clearSettingForm(true));

        const ctx = getContext();
        // Do not auto-load here without a Charge ID because backend requires it.
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
            state.currentRateID = extractRateIdFromRow(s) || state.currentRateID || 0;
            populateSettingForm(s);
            renderSettingsGrid();
        }
    };
})();

console.log('[AccountChargeRates] Module loaded');
