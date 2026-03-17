/**
 * Account Interest Rates Module
 * Legacy-style fixed slab UI
 */
window.AccountInterestRatesModule = (function () {
    'use strict';

    const state = {
        mode: 'view',
        currentRecord: null,
        records: [],
        pendingRateUpdates: {}
    };

    const API = {
        ADD: 'AccountsMaintenance/api/add-account-interest-rate',
        UPDATE: 'AccountsMaintenance/api/update-account-interest-rate',
        DELETE: 'AccountsMaintenance/api/delete-account-interest-rate'
    };

    function el(id) { return document.getElementById(id); }
    function val(id) { return el(id)?.value || ''; }
    function setVal(id, value) {
        const node = el(id);
        if (!node) return;
        const normalized = value == null ? '' : String(value);
        if ('value' in node) node.value = normalized;
        else node.textContent = normalized;
    }

    function parseNumericInput(value) {
        const normalized = String(value ?? '').replace(/,/g, '').trim();
        if (!normalized) return null;
        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : null;
    }

    function formatAmount(value) {
        const parsed = parseNumericInput(value);
        if (parsed == null) return '';
        return Number.isInteger(parsed) ? String(parsed) : String(parsed);
    }

    function isZeroLike(value) {
        const parsed = parseNumericInput(value);
        return parsed == null || parsed === 0;
    }

    function isEmptySlabData(source, index) {
        const spreadSign = String(source?.[`SpreadSign${index}`] || '').trim();
        return isZeroLike(source?.[`CeilingAmount${index}`])
            && isZeroLike(source?.[`MarkingRate${index}`])
            && isZeroLike(source?.[`EffectiveRate${index}`])
            && isZeroLike(source?.[`MinVariance${index}`])
            && isZeroLike(source?.[`MaxVariance${index}`])
            && !spreadSign;
    }

    function getContext() {
        const ps = window.AccountMaintenanceState || {};
        let branchID = ps.OurBranchID || sessionStorage.getItem('OurBranchID') || sessionStorage.getItem('currentBranchID') || sessionStorage.getItem('BranchID') || '';
        let accountID = ps.AccountID || sessionStorage.getItem('CurrentAccountID') || sessionStorage.getItem('currentAccountID') || sessionStorage.getItem('AccountID') || '';
        let operatorID = ps.OperatorID || sessionStorage.getItem('OperatorID') || sessionStorage.getItem('currentOperatorID') || sessionStorage.getItem('UserID') || localStorage.getItem('OperatorID') || 'SYS';

        if ((!branchID || !accountID) && window.parent && window.parent !== window) {
            try {
                branchID = branchID || window.parent.document.getElementById('branchID')?.value || window.parent.document.getElementById('OurBranchID')?.value || '';
                accountID = accountID || window.parent.document.getElementById('accountID')?.value || window.parent.document.getElementById('AccountID')?.value || '';
            } catch (_) {
                // ignore
            }
        }

        return {
            OurBranchID: branchID,
            AccountID: accountID,
            OperatorID: operatorID
        };
    }

    function formatDateForSQL(dateString) {
        if (!dateString) return '';
        const str = String(dateString).trim();
        // Already ISO yyyy-MM-dd or yyyy-MM-ddTHH:mm:ss — return date portion only
        if (/^\d{4}-\d{2}-\d{2}/.test(str)) return str.substring(0, 10);
        // dd/mm/yyyy (display format) → yyyy-MM-dd
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
            const [dd, mm, yyyy] = str.split('/');
            return `${yyyy}-${mm}-${dd}`;
        }
        // yyyy/mm/dd → yyyy-MM-dd
        if (/^\d{4}\/\d{2}\/\d{2}$/.test(str)) {
            return str.replace(/\//g, '-');
        }
        return str;
    }

    function formatDateForInput(value) {
        if (!value) return '';
        const raw = String(value).trim();
        // Already yyyy-mm-dd (HTML date input format) — return as-is
        if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return raw;
        // ISO with time component e.g. 2026-03-12T00:00:00
        if (/^\d{4}-\d{2}-\d{2}T/.test(raw)) return raw.substring(0, 10);
        // dd/mm/yyyy (system display format) → yyyy-mm-dd
        if (/^\d{2}\/\d{2}\/\d{4}$/.test(raw)) {
            const [dd, mm, yyyy] = raw.split('/');
            return `${yyyy}-${mm}-${dd}`;
        }
        // Fallback: let the browser parse (handles other ISO-like strings)
        const date = new Date(raw);
        if (isNaN(date.getTime())) return '';
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    function formatDateTime(value) {
        if (!value) return '-';
        if (window.GlobalUtils?.formatDateTime) return window.GlobalUtils.formatDateTime(value);
        const date = new Date(value);
        return isNaN(date.getTime()) ? String(value) : date.toLocaleString();
    }

    function showLoading(show) {
        const overlay = el('loadingOverlay') || el('pageLoadingOverlay');
        if (!overlay) return;
        if ('hidden' in overlay) overlay.hidden = !show;
    }

    function showMessage(text, type = 'info') {
        const panel = document.querySelector('.am-message-panel') || document.querySelector('.de-message-bar');
        if (!panel) return;
        const span = panel.querySelector('span');
        if (span) span.textContent = text;

        panel.classList.remove('show', 'am-message-panel--success', 'am-message-panel--error', 'am-message-panel--warning', 'de-message-bar--success', 'de-message-bar--error', 'de-message-bar--warning');

        if (panel.classList.contains('am-message-panel')) {
            panel.classList.add('show');
            if (type === 'success') panel.classList.add('am-message-panel--success');
            else if (type === 'error') panel.classList.add('am-message-panel--error');
            else if (type === 'warning') panel.classList.add('am-message-panel--warning');
        } else {
            panel.style.display = 'flex';
            if (type === 'success') panel.classList.add('de-message-bar--success');
            else if (type === 'error') panel.classList.add('de-message-bar--error');
            else if (type === 'warning') panel.classList.add('de-message-bar--warning');
        }

        clearTimeout(panel._timer);
        panel._timer = setTimeout(() => {
            if (panel.classList.contains('am-message-panel')) panel.classList.remove('show');
            else panel.style.display = 'none';
        }, 5000);
    }

    function showConfirm(message, title) {
        if (window.AppCore?.showConfirmation) {
            return window.AppCore.showConfirmation(title || 'Confirm Action', message);
        }
        return Promise.resolve(window.confirm(message));
    }

    function isSuccess(response) {
        if (!response) return false;
        return response.Success === true
            || response.success === true
            || response.ResponseCode === '00'
            || response.ResponseCode === '000'
            || response.ResponseCode === 0;
    }

    async function invokeController(endpoint, payload) {
        if (!window.AppCore?.invokeControllerAsync) {
            throw new Error('AppCore.invokeControllerAsync is not available');
        }
        return window.AppCore.invokeControllerAsync(endpoint, payload || {});
    }

    function normalizePayload(payload) {
        if (!payload) return null;
        if (typeof payload === 'string') {
            try {
                return JSON.parse(payload);
            } catch (_) {
                return null;
            }
        }
        if (typeof payload === 'object' && payload.json && typeof payload.json === 'function') {
            return payload.json();
        }
        return payload;
    }

    async function loadRateTypes() {
        const select = el('rateType');
        if (!select || !window.LookupService?.getBaseRateTypes) return;
        try {
            const options = await window.LookupService.getBaseRateTypes();
            const current = select.value;
            select.innerHTML = '<option value="">--Select--</option>';
            options.forEach(option => {
                const item = document.createElement('option');
                item.value = option.value;
                item.textContent = option.label;
                select.appendChild(item);
            });
            select.value = current || select.value;
        } catch (error) {
            console.error('[InterestRates] Failed to load rate types', error);
        }
    }

    function loadMarkUpDownOptions() {
        const options = [
            { value: '', label: '--Select--' },
            { value: 'UP', label: 'Mark Up' },
            { value: 'DOWN', label: 'Mark Down' },
            { value: 'FIXED', label: 'Fixed Rate' }
        ];

        for (let i = 1; i <= 5; i += 1) {
            const suffix = i === 1 ? '' : String(i);
            const select = el(`markUpDown${suffix}`);
            if (!select) continue;
            const current = select.value;
            select.innerHTML = '';
            options.forEach(option => {
                const item = document.createElement('option');
                item.value = option.value;
                item.textContent = option.label;
                select.appendChild(item);
            });
            select.value = current || '';
        }
    }

    function initializeTabs() {
        document.querySelectorAll('.rate-tab').forEach(tab => {
            if (tab._wiredInterestTab) return;
            tab._wiredInterestTab = true;
            tab.addEventListener('click', function () {
                document.querySelectorAll('.rate-tab').forEach(node => {
                    node.classList.remove('active');
                    node.style.background = '#f5f5f5';
                    node.style.color = '#666';
                    node.style.borderBottom = '';
                    node.style.marginBottom = '';
                });
                this.classList.add('active');
                this.style.background = 'white';
                this.style.color = '#2c5f7d';
                this.style.borderBottom = '3px solid #2c5f7d';
                this.style.marginBottom = '-2px';
            });
        });
    }

    function openDatePickerById(id) {
        const input = el(id);
        if (!input || input.disabled) return;
        try {
            if (typeof input.showPicker === 'function') {
                input.showPicker();
                return;
            }
        } catch (_) {
            // ignore
        }
        input.focus();
        input.click();
    }

    function wireDatePickerButtons() {
        document.querySelectorAll('[data-open-date]').forEach(button => {
            if (button._wiredInterestDate) return;
            button._wiredInterestDate = true;
            button.addEventListener('click', function (e) {
                e.preventDefault();
                openDatePickerById(button.getAttribute('data-open-date'));
            });
        });
    }

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            if (header._wiredInterestSection) return;
            header._wiredInterestSection = true;
            header.addEventListener('click', function (e) {
                if (e.target.closest('button') && !e.target.closest('.section-toggle-btn')) return;
                const section = header.closest('.form-section');
                const content = section?.querySelector('[data-section-content]');
                const icon = header.querySelector('.section-toggle-btn i');
                if (!content) return;
                const isOpen = content.style.display !== 'none';
                content.style.display = isOpen ? 'none' : '';
                if (icon) {
                    icon.classList.toggle('bi-chevron-up', !isOpen);
                    icon.classList.toggle('bi-chevron-down', isOpen);
                }
            });
        });
    }

    function setButtons() {
        const editing = state.mode === 'add' || state.mode === 'edit';
        const hasRecord = !!state.currentRecord;
        if (el('submoduleBtnView')) el('submoduleBtnView').disabled = editing;
        if (el('submoduleBtnAdd')) el('submoduleBtnAdd').disabled = editing;
        if (el('submoduleBtnEdit')) el('submoduleBtnEdit').disabled = editing || !hasRecord;
        if (el('submoduleBtnDelete')) el('submoduleBtnDelete').disabled = editing || !hasRecord;
        if (el('submoduleBtnSave')) el('submoduleBtnSave').disabled = !editing;
        if (el('submoduleBtnCancel')) el('submoduleBtnCancel').disabled = !editing;
    }

    function enableFormForEdit(mode) {
        state.mode = mode;
        state.pendingRateUpdates = {};
        const inputs = document.querySelectorAll('#interestRateForm input, #interestRateForm select');
        inputs.forEach(input => {
            if (input.id === 'baseRate') return;
            input.disabled = false;
        });
        setButtons();
    }

    function disableFormInputs() {
        state.mode = 'view';
        const inputs = document.querySelectorAll('#interestRateForm input, #interestRateForm select');
        inputs.forEach(input => {
            input.disabled = input.id !== 'rateType' && input.id !== 'effectiveDate';
        });
        if (el('rateType')) el('rateType').disabled = false;
        if (el('effectiveDate')) el('effectiveDate').disabled = false;
        if (el('baseRate')) el('baseRate').disabled = true;
        setButtons();
    }

    function clearGrid() {
        const tbody = document.querySelector('#rateListContent tbody');
        if (!tbody) return;
        tbody.innerHTML = '<tr><td colspan="11" style="padding:10px 12px; color:#000; border:1px solid #d0d0d0; vertical-align:top; height:200px;">No records to display.</td></tr>';
    }

    function clearForm() {
        state.currentRecord = null;
        state.pendingRateUpdates = {};
        setVal('rateType', '');
        setVal('baseRate', '0.0000');
        setVal('effectiveDate', '');
        setVal('expiryDate', '');
        setVal('refId', '');
        for (let i = 1; i <= 5; i += 1) {
            const suffix = i === 1 ? '' : String(i);
            setVal(`amount${suffix}From`, i === 1 ? '0.00' : '');
            setVal(`amount${suffix}To`, '');
            setVal(`markUpDown${suffix}`, '');
            setVal(`markValue${suffix}`, '');
            setVal(`effectiveRate${suffix}`, '');
        }
        setVal('penaltyRate', '');
        ['CreatedBy', 'CreatedOn', 'SupervisedBy', 'SupervisedOn', 'ModifiedBy', 'ModifiedOn'].forEach(id => setVal(id, '-'));
        syncSlabStartValues();
        clearGrid();
        disableFormInputs();
    }

    function syncSlabStartValues() {
        setVal('amountFrom', '0.00');

        for (let i = 2; i <= 5; i += 1) {
            const previousSuffix = i - 1 === 1 ? '' : String(i - 1);
            const currentSuffix = String(i);
            const previousTo = parseNumericInput(val(`amount${previousSuffix}To`));
            setVal(`amount${currentSuffix}From`, previousTo == null ? '' : formatAmount(previousTo));
        }
    }

    function getSlabValues(index) {
        const suffix = index === 1 ? '' : String(index);
        const fromValue = index === 1 ? null : parseNumericInput(val(`amount${suffix}From`));
        const toValue = parseNumericInput(val(`amount${suffix}To`));
        const markValue = parseNumericInput(val(`markValue${suffix}`));
        const effectiveRate = parseNumericInput(val(`effectiveRate${suffix}`));
        const markUpDown = val(`markUpDown${suffix}`);
        const hasNonZeroValue = (toValue != null && toValue !== 0)
            || (markValue != null && markValue !== 0)
            || (effectiveRate != null && effectiveRate !== 0);

        return {
            fromValue,
            toValue,
            markValue,
            effectiveRate,
            markUpDown,
            // A slab is only considered active when it has a numeric value (not just a dropdown selection).
            // This allows users to clear a slab without triggering validation errors.
            hasData: hasNonZeroValue
        };
    }

    function hasEffectiveRateValue(index) {
        const suffix = index === 1 ? '' : String(index);
        return !!val(`effectiveRate${suffix}`).trim();
    }

    function validateSlabs() {
        let lastTo = null;

        for (let i = 1; i <= 5; i += 1) {
            const slab = getSlabValues(i);
            if (!slab.hasData) continue;

            if (slab.toValue == null) {
                return `Please enter the To amount for slab ${i}`;
            }

            if (i > 1 && lastTo == null) {
                return `Please complete slab ${i - 1} before entering slab ${i}`;
            }

            if (i > 1 && slab.fromValue == null) {
                return `Slab ${i} start amount is missing`;
            }

            if (i > 1 && slab.fromValue != null && slab.toValue < slab.fromValue) {
                return `Slab ${i} To amount cannot be less than the From amount`;
            }

            if (i === 1 && slab.toValue <= 0) {
                return 'The first slab To amount must be greater than zero';
            }

            lastTo = slab.toValue;
        }

        return null;
    }

    function extractInterestRateRecords(rawData) {
        if (!rawData) return [];

        const detailKeys = ['Details04', 'details04'];
        for (const key of detailKeys) {
            if (Array.isArray(rawData?.[key]) && rawData[key].length > 0) {
                return rawData[key];
            }
        }

        if (Array.isArray(rawData) && rawData.length > 0 && rawData[0]?.CeilingAmount1 !== undefined) return rawData;
        return [];
    }

    function populateForm(data) {
        if (!data) return;
        state.currentRecord = data;
        state.pendingRateUpdates = {};
        setVal('rateType', data.TrxTypeID || data.RateType || '');
        setVal('baseRate', (parseFloat(data.BaseRate || 0) || 0).toFixed(4));
        setVal('effectiveDate', formatDateForInput(data.EffectiveDate));
        setVal('expiryDate', formatDateForInput(data.ExpiryDate));
        setVal('refId', data.RefNo || data.RefID || '');

        for (let i = 1; i <= 5; i += 1) {
            const suffix = i === 1 ? '' : String(i);
            const minVariance = data[`MinVariance${i}`];
            const ceilingAmount = data[`CeilingAmount${i}`];
            const markValue = data[`MarkingRate${i}`];
            const effectiveRate = data[`EffectiveRate${i}`];
            const spreadSign = String(data[`SpreadSign${i}`] || '').trim();
            const isEmptySlab = i > 1 && isEmptySlabData(data, i);
            setVal(`amount${suffix}From`, i === 1 ? '0.00' : (isEmptySlab || minVariance == null ? '' : Math.abs(parseFloat(minVariance) || 0)));
            setVal(`amount${suffix}To`, isEmptySlab || ceilingAmount == null || parseFloat(ceilingAmount) === 0 ? '' : Math.abs(parseFloat(ceilingAmount) || 0));
            setVal(`markValue${suffix}`, isEmptySlab || markValue == null || parseFloat(markValue) === 0 ? '' : markValue);
            setVal(`effectiveRate${suffix}`, isEmptySlab || effectiveRate == null || parseFloat(effectiveRate) === 0 ? '' : effectiveRate);
            if (spreadSign === '+') setVal(`markUpDown${suffix}`, 'UP');
            else if (spreadSign === '-') setVal(`markUpDown${suffix}`, 'DOWN');
            else if (spreadSign) setVal(`markUpDown${suffix}`, 'FIXED');
            else setVal(`markUpDown${suffix}`, '');
        }

        const penaltyValue = String(data.PenaltyRate || '');
        if (penaltyValue.startsWith('+') || penaltyValue.startsWith('-')) setVal('penaltyRate', penaltyValue.charAt(0));
        else setVal('penaltyRate', '');

        setVal('CreatedBy', data.CreatedBy || '-');
        setVal('CreatedOn', formatDateTime(data.CreatedOn));
        setVal('ModifiedBy', data.ModifiedBy || '-');
        setVal('ModifiedOn', formatDateTime(data.ModifiedOn));
        setVal('SupervisedBy', data.SupervisedBy || '-');
        setVal('SupervisedOn', formatDateTime(data.SupervisedOn));
        syncSlabStartValues();
    }

    function populateGrid(records) {
        const tbody = document.querySelector('#rateListContent tbody');
        if (!tbody) return;
        tbody.innerHTML = '';

        if (!Array.isArray(records) || records.length === 0) {
            clearGrid();
            return;
        }

        records.forEach(record => {
            const row = document.createElement('tr');
            row.style.cursor = 'pointer';
            let html = `<td style="padding:8px; border:1px solid #d0d0d0;">${record.RefNo || record.RefID || ''}</td>`;
            for (let i = 1; i <= 5; i += 1) {
                const isEmptySlab = i > 1 && isEmptySlabData(record, i);
                const minVariance = record[`MinVariance${i}`];
                const ceilingAmount = record[`CeilingAmount${i}`];
                const effectiveRate = parseFloat(record[`EffectiveRate${i}`]) || 0;
                const markingRate = parseFloat(record[`MarkingRate${i}`]) || 0;
                // Show EffectiveRate when non-zero; fall back to MarkingRate (what the user configured).
                // EffectiveRate is computed by the interest engine and may be 0 until applied.
                const displayRate = effectiveRate !== 0 ? effectiveRate : (markingRate !== 0 ? markingRate : null);
                let amountRange = '';
                const fromValue = isEmptySlab ? '' : (i === 1 ? 0 : (minVariance == null || minVariance === '' ? '' : Math.abs(parseFloat(minVariance) || 0)));
                const toValue = isEmptySlab || ceilingAmount == null || ceilingAmount === '' || parseFloat(ceilingAmount) === 0 ? '' : Math.abs(parseFloat(ceilingAmount) || 0);
                if (fromValue !== '' && toValue !== '') amountRange = `${fromValue} - ${toValue}`;
                else if (fromValue !== '') amountRange = String(fromValue);
                else if (toValue !== '') amountRange = String(toValue);
                html += `<td style="padding:8px; border:1px solid #d0d0d0;">${amountRange}</td><td style="padding:8px; border:1px solid #d0d0d0; text-align:right;">${isEmptySlab || displayRate == null ? '' : displayRate}</td>`;
            }
            row.innerHTML = html;
            row.addEventListener('click', () => {
                populateForm(record);
                disableFormInputs();
            });
            tbody.appendChild(row);
        });
    }

    async function navigate(direction = 0) {
        const rateType = val('rateType');
        const effectiveDate = val('effectiveDate');
        const ctx = getContext();

        if (!rateType) {
            showMessage('Please select a Rate Type before viewing interest rates', 'warning');
            el('rateType')?.focus();
            return;
        }
        if (!effectiveDate) {
            showMessage('Please select an Effective Date before viewing interest rates', 'warning');
            el('effectiveDate')?.focus();
            return;
        }
        if (!ctx.OurBranchID || !ctx.AccountID) {
            showMessage('Branch ID and Account ID are required. Please select an account first.', 'error');
            return;
        }

        try {
            showLoading(true);
            const response = await invokeController('AccountsMaintenance/api/get-account-interest-rate', {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                TrxTypeID: rateType,
                EffectiveDate: formatDateForSQL(effectiveDate),
                OperatorID: ctx.OperatorID,
                Direction: direction,
                SearchKey: `[${ctx.OurBranchID}:${ctx.AccountID}]`,
                RelevantID: ctx.AccountID,
                ModuleTypeID: 'A'
            });

            const rawData = normalizePayload(response?.Details || response?.details || response?.data || response?.Data || response);
            const gridData = extractInterestRateRecords(rawData);
            const formData = gridData.length > 0 ? gridData[0] : null;

            state.records = gridData;
            if (!formData && gridData.length === 0) {
                clearForm();
                showMessage('No interest rate data found. Account may not have interest rates configured for this date/type.', 'info');
                return;
            }

            if (formData) populateForm(formData);
            populateGrid(gridData);
            state.mode = 'view';
            disableFormInputs();
            showMessage('Interest rate data loaded successfully', 'success');
        } catch (error) {
            console.error('[InterestRates] Error fetching interest rates:', error);
            showMessage('Error loading interest rate data', 'error');
        } finally {
            showLoading(false);
        }
    }

    function buildSaveRequestData() {
        const ctx = getContext();
        const parseNumber = (input) => parseNumericInput(input) ?? 0;
        const parseNullableNumber = (input, zeroAsNull = false) => {
            const parsed = parseNumericInput(input);
            if (parsed == null) return null;
            if (zeroAsNull && parsed === 0) return null;
            return parsed;
        };
        const requestData = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            OperatorID: ctx.OperatorID,
            SearchKey: `[${ctx.OurBranchID}:${ctx.AccountID}]`,
            RelevantID: ctx.AccountID,
            ModuleTypeID: 'A',
            TrxTypeID: val('rateType'),
            EffectiveDate: formatDateForSQL(val('effectiveDate')),
            RefNo: state.mode === 'add' ? 0 : (parseInt(val('refId'), 10) || 0),
            ExpiryDate: formatDateForSQL(val('expiryDate')),
            CreatedBy: state.mode === 'add' ? ctx.OperatorID : (state.currentRecord?.CreatedBy || ctx.OperatorID),
            CreatedOn: null,
            ModifiedBy: state.mode === 'edit' ? ctx.OperatorID : null,
            ModifiedOn: null,
            SupervisedBy: null,
            UpdateCount: state.mode === 'add' ? 1 : (parseInt(val('refId'), 10) > 0 ? 2 : 1)
        };

        for (let i = 1; i <= 5; i += 1) {
            const suffix = i === 1 ? '' : String(i);
            const markUpDown = val(`markUpDown${suffix}`);
            let spreadSign = '';
            if (markUpDown === 'UP') spreadSign = '+';
            else if (markUpDown === 'DOWN') spreadSign = '-';
            else if (markUpDown === 'FIXED') spreadSign = 'F';

            // MinVariance and MaxVariance are commented out in the SP INSERT/UPDATE but the
            // parameters are still type-checked. The Rate SQL UDT has limited precision and
            // cannot hold currency amounts. Always send null to avoid decimal overflow errors.
            requestData[`MinVariance${i}`] = null;
            requestData[`CeilingAmount${i}`] = parseNumber(val(`amount${suffix}To`));
            requestData[`MarkingRate${i}`] = parseNumber(val(`markValue${suffix}`));
            requestData[`SpreadSign${i}`] = spreadSign || null;
            requestData[`EffectiveRate${i}`] = parseNumber(val(`effectiveRate${suffix}`));
            requestData[`MaxVariance${i}`] = null;
        }

        requestData.PenaltySpreadSign = val('penaltyRate') || null;
        requestData.PenaltyMarkingRate = 0;
        requestData.PenaltyRate = 0;
        return requestData;
    }

    function buildDeletePayload() {
        const ctx = getContext();
        // Use the real UpdateCount from the loaded record — the SP checks it for concurrency.
        const updateCount = parseInt(state.currentRecord?.UpdateCount, 10) || 0;
        return {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            OperatorID: ctx.OperatorID,
            SearchKey: `[${ctx.OurBranchID}:${ctx.AccountID}]`,
            RelevantID: ctx.AccountID,
            ModuleTypeID: 'A',
            TrxTypeID: val('rateType'),
            EffectiveDate: formatDateForSQL(val('effectiveDate')),
            RefNo: parseInt(val('refId'), 10) || 0,
            UpdateCount: updateCount,
            ModifiedBy: ctx.OperatorID,
            ModifiedOn: null,
            RefID: val('refId') || '0'
        };
    }

    async function saveData() {
        if (state.mode === 'view') {
            showMessage('Please click Add or Edit before saving', 'warning');
            return;
        }

        if (!val('rateType')) {
            showMessage('Please select a Rate Type', 'warning');
            el('rateType')?.focus();
            return;
        }
        if (!val('effectiveDate')) {
            showMessage('Please select an Effective Date', 'warning');
            el('effectiveDate')?.focus();
            return;
        }
        if (!val('expiryDate')) {
            showMessage('Please select an Expiry Date', 'warning');
            el('expiryDate')?.focus();
            return;
        }

        const effectiveDate = new Date(val('effectiveDate'));
        const expiryDate = new Date(val('expiryDate'));
        if (expiryDate <= effectiveDate) {
            showMessage('Expiry Date should be more than Effective Date', 'error');
            el('expiryDate')?.focus();
            return;
        }

        const pendingSlabs = Object.keys(state.pendingRateUpdates)
            .filter(key => state.pendingRateUpdates[key])
            .map(key => parseInt(key.replace('slab', ''), 10))
            .filter(index => Number.isFinite(index) && !hasEffectiveRateValue(index));
        if (pendingSlabs.length > 0) {
            showMessage(`Please update the Effective Rate for amount slab(s): ${pendingSlabs.join(', ')}`, 'error');
            return;
        }

        const slabValidationError = validateSlabs();
        if (slabValidationError) {
            showMessage(slabValidationError, 'error');
            return;
        }

        const payload = buildSaveRequestData();
        const hasAnySlab = Array.from({ length: 5 }, (_, index) => index + 1).some((i) => getSlabValues(i).hasData);
        if (!hasAnySlab) {
            showMessage('Please enter at least one amount slab with an effective rate', 'warning');
            el('effectiveRate')?.focus();
            return;
        }

        const confirmed = await showConfirm(`Are you sure you want to ${state.mode === 'add' ? 'create' : 'update'} this interest rate?`, 'Save Confirmation');
        if (!confirmed) return;

        try {
            showLoading(true);
            const response = await invokeController(state.mode === 'add' ? API.ADD : API.UPDATE, payload);
            if (!isSuccess(response)) {
                showMessage(response?.ErrorMessage || response?.ResponseMessage || response?.message || 'Failed to save interest rate data', 'error');
                return;
            }
            showMessage(state.mode === 'add' ? 'Interest rate added successfully' : 'Interest rate updated successfully', 'success');

            // After save, the GET SP returns early (no Details04) when a supervision record is
            // pending (EventID=2 for new adds). Instead of re-fetching, reconstruct the saved
            // record directly from the payload so the form and grid always reflect what was just saved.
            const savedRecord = { ...payload };
            // Rebuild MinVariance from ceiling amounts so the grid "From" values display correctly.
            savedRecord.MinVariance1 = null;
            for (let i = 2; i <= 5; i++) {
                const prevSuffix = i - 1 === 1 ? '' : String(i - 1);
                const prevTo = parseNumericInput(val(`amount${prevSuffix}To`));
                savedRecord[`MinVariance${i}`] = prevTo != null && prevTo !== 0 ? prevTo : null;
            }
            // Use RefNo from the response Details04 row if available (assigned by DB function).
            const responseDetails = normalizePayload(response?.Details || response?.details);
            const responseRecords = extractInterestRateRecords(responseDetails);
            if (responseRecords.length > 0 && responseRecords[0].RefNo) {
                savedRecord.RefNo = responseRecords[0].RefNo;
            }

            state.records = [savedRecord];
            state.currentRecord = savedRecord;
            state.mode = 'view';
            populateForm(savedRecord);
            populateGrid([savedRecord]);
            disableFormInputs();
        } catch (error) {
            console.error('[InterestRates] Error saving interest rate:', error);
            showMessage('Error saving interest rate data', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function deleteData() {
        if (!val('rateType') || !val('effectiveDate') || !val('refId')) {
            showMessage('Please select a record to delete', 'warning');
            return;
        }

        const confirmed = await showConfirm('Are you sure you want to delete this interest rate record?', 'Delete Confirmation');
        if (!confirmed) return;

        try {
            showLoading(true);
            const response = await invokeController(API.DELETE, buildDeletePayload());
            if (!isSuccess(response)) {
                const errorMessage = response?.ErrorMessage || response?.ResponseMessage || response?.message || 'Failed to delete interest rate data';
                showMessage(errorMessage, 'error');
                return;
            }
            showMessage('Interest rate deleted successfully', 'success');
            clearForm();
        } catch (error) {
            console.error('[InterestRates] Error deleting interest rate:', error);
            showMessage(error?.message || 'Error deleting interest rate data', 'error');
        } finally {
            showLoading(false);
        }
    }

    function confirmAdd() {
        clearForm();
        enableFormForEdit('add');
        if (!val('rateType')) setVal('rateType', 'ADV');
        setVal('amountFrom', '0.00');
        el('effectiveDate')?.focus();
        showMessage('Add mode: Enter new interest rate details', 'info');
    }

    function confirmEdit() {
        if (!val('refId')) {
            showMessage('Please view a record before editing', 'warning');
            return;
        }
        enableFormForEdit('edit');
        el('effectiveDate')?.focus();
        showMessage('Edit mode: Modify interest rate details', 'info');
    }

    function confirmCancel() {
        if (state.currentRecord) populateForm(state.currentRecord);
        else clearForm();
        disableFormInputs();
        showMessage('Changes cancelled', 'info');
    }

    function wireFieldWatchers() {
        const effectiveDateInput = el('effectiveDate');
        if (effectiveDateInput && !effectiveDateInput._wiredAddEnable) {
            effectiveDateInput._wiredAddEnable = true;
            effectiveDateInput.addEventListener('change', setButtons);
        }

        for (let i = 1; i <= 5; i += 1) {
            const suffix = i === 1 ? '' : String(i);
            const amountToField = el(`amount${suffix}To`);
            const effectiveRateField = el(`effectiveRate${suffix}`);
            if (!amountToField || !effectiveRateField || amountToField._wiredAmountChange) continue;

            let originalValue = '';
            amountToField._wiredAmountChange = true;
            amountToField.addEventListener('focus', function () {
                originalValue = this.value || '';
            });
            amountToField.addEventListener('change', function () {
                const newValue = this.value || '';
                syncSlabStartValues();
                if (!newValue.trim()) return;
                const newAmount = parseFloat(newValue.replace(/,/g, ''));
                const oldAmount = parseFloat((originalValue || '').replace(/,/g, ''));
                if (originalValue && !isNaN(oldAmount) && !isNaN(newAmount) && newAmount !== oldAmount) {
                    state.pendingRateUpdates[`slab${i}`] = !hasEffectiveRateValue(i);
                    showMessage('Amount has changed. Please verify and update the Effective Rate if needed', 'warning');
                    if (!hasEffectiveRateValue(i)) effectiveRateField.focus();
                }
            });
            const clearPendingFlag = function () {
                if (this.value && this.value.trim()) state.pendingRateUpdates[`slab${i}`] = false;
            };
            effectiveRateField.addEventListener('change', clearPendingFlag);
            effectiveRateField.addEventListener('input', clearPendingFlag);
        }
    }

    function init() {
        wireSectionToggles();
        wireDatePickerButtons();
        wireFieldWatchers();
        initializeTabs();
        loadRateTypes();
        loadMarkUpDownOptions();
        clearForm();
        setVal('amountFrom', '0.00');
        syncSlabStartValues();
        disableFormInputs();
    }

    return {
        init,
        navigate,
        saveData,
        deleteData,
        confirmAdd,
        confirmEdit,
        confirmCancel,
        cancelChanges: confirmCancel,
        loadData: navigate,
        setMode: function (mode) {
            if (mode === 'ADD') confirmAdd();
            else if (mode === 'EDIT') confirmEdit();
            else confirmCancel();
        }
    };
})();

console.log('[InterestRates] Module registered');
