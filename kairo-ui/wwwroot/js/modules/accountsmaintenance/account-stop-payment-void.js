/**
 * Stop Payment Void Module
 * Refactored to align with IApiService pattern and AppCore.invokeControllerAsync
 */
window.StopPaymentVoidModule = (function () {
    'use strict';

    // Module State
    const state = {
        submoduleName: 'StopPaymentVoid',
        currentMode: 'VIEW', // VIEW, ADD, EDIT
        records: [],
        selectedIndex: -1,
        selectedRecord: null,
        context: {
            accountId: '',
            branchId: '',
            operatorId: '',
            accountTypeId: ''
        }
    };

    // API Endpoints
    const API = {
        GET: 'AccountsMaintenance/api/get-stop-payments',
        ADD: 'AccountsMaintenance/api/add-stop-payment',
        UPDATE: 'AccountsMaintenance/api/update-stop-payment',
        DELETE: 'AccountsMaintenance/api/delete-stop-payment'
    };

    let requestRefSearchModal = null;

    // Graceful loading indicator wrapper for hosts where AppCore.showLoading is unavailable.
    function toggleLoading(isLoading, message) {
        if (window.AppCore && typeof window.AppCore.showLoading === 'function') {
            window.AppCore.showLoading(isLoading, message);
            return;
        }

        const overlay = document.getElementById('loadingOverlay');
        if (overlay) {
            overlay.hidden = !isLoading;
        }
    }

    // Graceful message wrapper for hosts where AppCore.showMsg is unavailable.
    function showMsg(message, type) {
        if (window.AppCore && typeof window.AppCore.showMsg === 'function') {
            window.AppCore.showMsg(message, type);
            return;
        }
        if (type === 'error') console.error(message);
        else if (type === 'warning') console.warn(message);
        else console.log(message);
    }

    function formatDateValue(value) {
        if (!value) return '';

        if (window.AppCore && typeof window.AppCore.formatDate === 'function') {
            return window.AppCore.formatDate(value) || '';
        }

        try {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return String(value);
            }

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            return `${day}/${month}/${year}`;
        } catch {
            return String(value || '');
        }
    }

    function formatDateForInput(value) {
        if (!value) return '';

        if (window.GlobalUtils?.parseDateInput) {
            const parsed = window.GlobalUtils.parseDateInput(value);
            if (parsed) return parsed;
        }

        try {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return '';
            }

            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        } catch {
            return '';
        }
    }

    function formatDateTimeValue(value) {
        if (!value) return '';

        if (window.AppCore && typeof window.AppCore.formatDate === 'function') {
            return window.AppCore.formatDate(value, 'DD/MM/YYYY HH:mm') || '';
        }

        try {
            const date = new Date(value);
            if (Number.isNaN(date.getTime())) {
                return String(value);
            }

            const day = String(date.getDate()).padStart(2, '0');
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const year = date.getFullYear();
            const hours = String(date.getHours()).padStart(2, '0');
            const minutes = String(date.getMinutes()).padStart(2, '0');
            return `${day}/${month}/${year} ${hours}:${minutes}`;
        } catch {
            return String(value || '');
        }
    }

    function formatCurrencyValue(value) {
        if (window.AppCore && typeof window.AppCore.formatCurrency === 'function') {
            return window.AppCore.formatCurrency(value);
        }

        const numberValue = Number(String(value ?? '0').replace(/,/g, ''));
        if (!Number.isFinite(numberValue)) {
            return value == null ? '' : String(value);
        }

        return numberValue.toLocaleString('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    }

    /**
     * Initialize Module
     */
    function init() {
        console.log(`[${state.submoduleName}] Initializing...`);

        wireSectionToggles();

        // Load context from global state or session
        const ctx = loadContext();

        wireInternalLookups();

        if (!ctx.accountId) {
            showMsg('No account selected. Please load an account first.', 'warning');
            return;
        }

        // Initial Data Load
        loadData();

        // Initial UI State
        setMode('VIEW');

        console.log(`[${state.submoduleName}] Initialized successfully.`);
    }

    function wireSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            if (header._wiredSectionToggle) return;
            header._wiredSectionToggle = true;

            header.addEventListener('click', function () {
                const section = this.closest('.form-section');
                const content = section?.querySelector('[data-section-content], .section-content');
                const btn = section?.querySelector('.section-toggle-btn');
                const icon = btn?.querySelector('i');
                if (!content) return;

                const expanded = (btn?.getAttribute('aria-expanded') ?? 'true') === 'true';
                content.style.display = expanded ? 'none' : '';
                btn?.setAttribute('aria-expanded', String(!expanded));

                if (icon) {
                    icon.classList.toggle('bi-chevron-up', !expanded);
                    icon.classList.toggle('bi-chevron-down', expanded);
                }
            });
        });
    }

    /**
     * Load Account Context
     */
    function getContext() {
        const globalState = window.AccountMaintenanceState || {};
        return {
            accountId: globalState.AccountID || sessionStorage.getItem('currentAccountID') || '',
            branchId: globalState.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            operatorId: globalState.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM',
            accountTypeId: globalState.AccountTypeID || sessionStorage.getItem('currentAccountTypeID') || 'C',
            accountName: globalState.AccountName || sessionStorage.getItem('currentAccountName') || '',
            branchName: globalState.BranchName || sessionStorage.getItem('currentBranchName') || ''
        };
    }

    function applyContextToIdentification(ctx) {
        const accountIdEl = document.getElementById('accountId');
        const branchIdEl = document.getElementById('branchId');
        const accountNameEl = document.getElementById('accountName');
        const branchNameEl = document.getElementById('branchName');

        if (accountIdEl) accountIdEl.value = ctx.accountId || '';
        if (branchIdEl) branchIdEl.value = ctx.branchId || '';
        if (accountNameEl) accountNameEl.value = ctx.accountName || '';
        if (branchNameEl) branchNameEl.value = ctx.branchName || '';
    }

    function loadContext() {
        const ctx = getContext();
        state.context.accountId = ctx.accountId;
        state.context.branchId = ctx.branchId;
        state.context.operatorId = ctx.operatorId;
        state.context.accountTypeId = ctx.accountTypeId;
        applyContextToIdentification(ctx);
        return ctx;
    }

    function extractChequeNumber(rawValue) {
        const value = String(rawValue || '').trim();
        const digitGroups = value.match(/\d+/g);
        return digitGroups ? digitGroups.join('') : value;
    }

    function getSelectedOptionText(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return '';
        const option = select.options[select.selectedIndex];
        return option ? option.text.trim() : '';
    }

    function tryParseJson(value) {
        if (!value || typeof value !== 'string') return null;
        try {
            return JSON.parse(value);
        } catch {
            return null;
        }
    }

    function getResponseDetails(result) {
        if (!result) return null;
        if (result.Details && typeof result.Details === 'object') return result.Details;
        if (result.details && typeof result.details === 'object') return result.details;
        return tryParseJson(result.Details || result.details);
    }

    function buildSaveSuccessMessage(result) {
        const details = getResponseDetails(result);
        const responseMessage = result?.ResponseMessage || result?.message || 'Stop payment record saved successfully.';
        const requestReferenceNo =
            details?.Metadata?.CurrentRequestReferenceNo ||
            details?.StopPaymentData?.RawRequestReferenceNo ||
            details?.StopPaymentData?.RequestReferenceNo ||
            result?.RequestReferenceNo ||
            '';

        if (requestReferenceNo) {
            return `${responseMessage} Request Ref: ${requestReferenceNo}`;
        }

        return responseMessage;
    }

    function buildErrorMessage(result, fallbackMessage) {
        const details = getResponseDetails(result);
        const baseMessage = result?.ErrorMessage || result?.message || result?.ResponseMessage || fallbackMessage;

        const detailMessage =
            details?.DBErrorMessage ||
            details?.dbErrorMessage ||
            details?.Message ||
            details?.message ||
            details?.errorMessage ||
            details?.ErrorMessage ||
            details?.error ||
            details?.Error ||
            '';

        if (detailMessage && detailMessage !== baseMessage) {
            return `${baseMessage} (${detailMessage})`;
        }

        return baseMessage;
    }

    function getStopPaymentRecords(result) {
        const details = getResponseDetails(result) || {};

        if (Array.isArray(details.Details02)) {
            return details.Details02;
        }

        if (Array.isArray(details.StopPaymentData)) {
            return details.StopPaymentData;
        }

        if (details.StopPaymentData && typeof details.StopPaymentData === 'object') {
            return [details.StopPaymentData];
        }

        if (Array.isArray(result?.Data)) {
            return result.Data;
        }

        if (Array.isArray(result?.data)) {
            return result.data;
        }

        if (Array.isArray(result?.Details)) {
            return result.Details;
        }

        return [];
    }

    function normalizeRequestRef(value) {
        return String(value || '').replace(/:/g, '').trim();
    }

    function getSearchResultRows(result) {
        const envelope = result?.data || result || {};
        const details = envelope?.Details || envelope?.details || {};

        let payload = details;
        if (typeof payload?.RootElement === 'string') {
            payload = tryParseJson(payload.RootElement) || {};
        } else if (typeof payload === 'string') {
            payload = tryParseJson(payload) || {};
        }

        if (Array.isArray(payload?.SearchResults)) {
            return payload.SearchResults;
        }

        if (Array.isArray(payload?.details?.SearchResults)) {
            return payload.details.SearchResults;
        }

        return [];
    }

    function hasRecordDetails(record) {
        if (!record || typeof record !== 'object') return false;

        return !!(
            record.StopPaymentReasonID ||
            record.StopPaymentReason ||
            record.StopPaymentBy ||
            record.ChequeDate ||
            record.ChequeAmount ||
            record.CreatedBy ||
            record.CreatedOn ||
            record.RawRequestReferenceNo
        );
    }

    function mergeRecordData(baseRecord, detailRecord) {
        const merged = {
            ...(baseRecord || {}),
            ...(detailRecord || {})
        };

        if (!merged.RawRequestReferenceNo) {
            merged.RawRequestReferenceNo = normalizeRequestRef(
                merged.RequestReferenceNo || merged.RequestRef || baseRecord?.RequestReferenceNo
            );
        }

        if (!merged.RequestReferenceNo && merged.RawRequestReferenceNo) {
            merged.RequestReferenceNo = merged.RawRequestReferenceNo;
        }

        return merged;
    }

    function buildRequestRefAdvFilter(ctx) {
        if (!ctx.branchId || !ctx.accountId) return '';
        return `OurBranchID='${ctx.branchId}' AND AccountID='${ctx.accountId}'`;
    }

    async function searchStopPaymentRows(ctx) {
        const advFilterString = buildRequestRefAdvFilter(ctx);
        if (!advFilterString) {
            return [];
        }

        const response = await AppCore.invokeControllerAsync('SearchModal/Search', {
            TableID: 'StopPayID',
            WhereStmt: '',
            AdvFilterString: advFilterString,
            SearchKey: '',
            ModuleID: '100',
            PageSize: 20,
            RefID: '',
            PrevOrNext: 0,
            OurBranchID: ctx.branchId
        });

        return getSearchResultRows(response).map(row => mergeRecordData(row, {
            RawRequestReferenceNo: normalizeRequestRef(row?.RequestReferenceNo || row?.RequestRef)
        }));
    }

    async function fetchStopPaymentDetail(ctx, requestRef) {
        const normalizedRequestRef = normalizeRequestRef(requestRef);
        if (!normalizedRequestRef) {
            return null;
        }

        const requestData = {
            AccountID: ctx.accountId,
            AccountTypeID: ctx.accountTypeId || 'C',
            OurBranchID: ctx.branchId,
            OperatorID: ctx.operatorId,
            SearchKey: normalizedRequestRef,
            SearchID: normalizedRequestRef,
            ModuleTypeID: 'A',
            RelevantID: ctx.accountId
        };

        const result = await AppCore.invokeControllerAsync(API.GET, requestData);
        const records = getStopPaymentRecords(result);
        const detailRecord = Array.isArray(records) && records.length > 0 ? records[0] : null;
        if (!detailRecord) {
            return null;
        }

        const detailRequestRef = normalizeRequestRef(
            detailRecord.RawRequestReferenceNo || detailRecord.RequestReferenceNo
        );

        if (detailRequestRef && detailRequestRef !== normalizedRequestRef) {
            return null;
        }

        return mergeRecordData({ RawRequestReferenceNo: normalizedRequestRef }, detailRecord);
    }

    async function ensureRecordDetails(index) {
        const existingRecord = state.records[index];
        if (!existingRecord) {
            return null;
        }

        if (hasRecordDetails(existingRecord)) {
            return existingRecord;
        }

        const ctx = loadContext();
        const requestRef = normalizeRequestRef(
            existingRecord.RawRequestReferenceNo || existingRecord.RequestReferenceNo || existingRecord.RequestRef
        );

        const detailRecord = await fetchStopPaymentDetail(ctx, requestRef);
        if (!detailRecord) {
            return existingRecord;
        }

        state.records[index] = mergeRecordData(existingRecord, detailRecord);
        return state.records[index];
    }

    async function enrichGridRecords(records) {
        if (!Array.isArray(records) || !records.length) {
            return [];
        }

        const ctx = loadContext();
        const enrichedRecords = await Promise.all(records.map(async (record) => {
            const requestRef = normalizeRequestRef(
                record.RawRequestReferenceNo || record.RequestReferenceNo || record.RequestRef
            );

            if (!requestRef) {
                return record;
            }

            const detailRecord = await fetchStopPaymentDetail(ctx, requestRef);
            return detailRecord ? mergeRecordData(record, detailRecord) : record;
        }));

        return enrichedRecords;
    }

    async function selectRecordByRequestRef(requestRef) {
        const normalizedRequestRef = normalizeRequestRef(requestRef);
        if (!normalizedRequestRef) {
            return;
        }

        const matchingIndex = state.records.findIndex(record =>
            normalizeRequestRef(record.RawRequestReferenceNo || record.RequestReferenceNo || record.RequestRef) === normalizedRequestRef
        );

        if (matchingIndex >= 0) {
            await selectRecord(matchingIndex);
            return;
        }

        const ctx = loadContext();
        const detailRecord = await fetchStopPaymentDetail(ctx, normalizedRequestRef);
        if (!detailRecord) {
            showMsg('No stop payment record found for the selected Request Ref No.', 'warning');
            return;
        }

        state.records.unshift(detailRecord);
        await selectRecord(0);
    }

    function openRequestRefLookup() {
        const ctx = loadContext();
        const advFilterString = buildRequestRefAdvFilter(ctx);

        if (!advFilterString) {
            showMsg('Load Branch ID and Account ID before searching Request Ref No.', 'warning');
            return;
        }

        if (typeof window.SearchModal === 'undefined' || !window.AppCore) {
            showMsg('Search modal is not available.', 'error');
            return;
        }

        if (!requestRefSearchModal) {
            requestRefSearchModal = new window.SearchModal(window.AppCore);
        }

        requestRefSearchModal.open({
            tableID: 'StopPayID',
            whereStmt: '',
            advFilterString,
            onSelect: (selectedRow) => {
                const requestRef = selectedRow?.RequestReferenceNo || selectedRow?.RequestRef || '';
                const requestRefInput = document.getElementById('requestRef');
                if (!requestRefInput || !requestRef) return;

                requestRefInput.value = requestRef;
                requestRefInput.dispatchEvent(new Event('change', { bubbles: true }));
                requestRefInput.dispatchEvent(new Event('blur', { bubbles: true }));
            }
        });
    }

    function wireInternalLookups() {
        const requestRefButton = document.querySelector('.btn-lookup[data-lookup="requestRef"][data-lookup-owner="module"]');
        if (!requestRefButton || requestRefButton.dataset.wired === 'module') return;

        requestRefButton.dataset.wired = 'module';
        requestRefButton.addEventListener('click', function (e) {
            e.preventDefault();
            e.stopPropagation();
            openRequestRefLookup();
        });

        const requestRefInput = document.getElementById('requestRef');
        if (requestRefInput && requestRefInput.dataset.wired !== 'module') {
            requestRefInput.dataset.wired = 'module';

            requestRefInput.addEventListener('change', async function () {
                if (state.currentMode !== 'VIEW') {
                    return;
                }

                const normalizedRequestRef = normalizeRequestRef(this.value);
                if (!normalizedRequestRef) {
                    return;
                }

                await selectRecordByRequestRef(normalizedRequestRef);
            });
        }
    }

    /**
     * Load Stop Payment Records
     */
    async function loadData(autoSelectFirst = true) {
        const ctx = loadContext();
        if (!ctx.accountId || !ctx.branchId) {
            showMsg('No account selected. Please load an account first.', 'warning');
            return;
        }

        try {
            toggleLoading(true, 'Loading stop payment records...');

            const requestRefInput = document.getElementById('requestRef');
            const requestedRef = normalizeRequestRef(requestRefInput?.value);

            state.records = await enrichGridRecords(await searchStopPaymentRows(ctx));
            state.selectedIndex = -1;
            state.selectedRecord = null;
            renderGrid();

            if (!state.records.length) {
                clearForm();
                return;
            }

            if (requestedRef) {
                await selectRecordByRequestRef(requestedRef);
                return;
            }

            if (autoSelectFirst) {
                await selectRecord(0);
            } else {
                clearForm();
            }
        } catch (error) {
            console.error(`[${state.submoduleName}] Load Error:`, error);
            showMsg('Error loading records: ' + error.message, 'error');
        } finally {
            toggleLoading(false);
        }
    }

    /**
     * Render Records Grid
     */
    function renderGrid() {
        const gridBody = document.querySelector('#stopPaymentGrid tbody');
        const recordCountEl = document.getElementById('recordCount');

        if (!gridBody) return;

        gridBody.innerHTML = '';
        if (recordCountEl) recordCountEl.textContent = `${state.records.length} records`;

        if (state.records.length === 0) {
            gridBody.innerHTML = '<tr class="grid-empty-row"><td colspan="6" class="text-center">No records to display.</td></tr>';
            return;
        }

        state.records.forEach((rec, index) => {
            const row = document.createElement('tr');
            if (index === state.selectedIndex) row.classList.add('selected');

            row.innerHTML = `
                <td>${rec.StartChequeID || rec.ChequeNoStart || '-'}</td>
                <td>${rec.EndChequeID || rec.ChequeNoEnd || '-'}</td>
                <td>${formatDateValue(rec.ChequeDate)}</td>
                <td class="text-end">${formatCurrencyValue(rec.ChequeAmount)}</td>
                <td>${rec.StopPaymentReason || rec.ReasonDescription || '-'}</td>
                <td>${formatDateValue(rec.StopPaymentDate || rec.VoidDate)}</td>
            `;

            row.addEventListener('click', () => selectRecord(index));
            gridBody.appendChild(row);
        });
    }

    /**
     * Select Record from Grid
     */
    async function selectRecord(index) {
        if (index < 0 || index >= state.records.length) return;

        state.selectedIndex = index;
        state.selectedRecord = await ensureRecordDetails(index);

        populateForm(state.selectedRecord);
        renderGrid();
    }

    /**
     * Populate Form with Data
     */
    function populateForm(data) {
        if (!data) return;

        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val !== null && val !== undefined ? val : '';
        };

        setVal('chequeNoStart', data.StartChequeID || data.ChequeNoStart);
        setVal('chequeNoEnd', data.EndChequeID || data.ChequeNoEnd);
        setVal('chequeDate', formatDateForInput(data.ChequeDate));
        setVal('chequeAmount', data.ChequeAmount);
        setVal('reasonId', data.StopPaymentReasonID || data.ReasonID);
        setVal('voidDate', formatDateForInput(data.StopPaymentDate || data.VoidDate));
        setVal('requestRef', data.RawRequestReferenceNo || data.RequestReferenceNo || data.RequestRef);
        setVal('instructionGivenBy', data.StopPaymentBy);

        // Audit Fields
        const setAudit = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;

            if ('value' in el) {
                el.value = val || '';
                return;
            }

            el.textContent = val || '-';
        };

        setAudit('MakerID', data.MakerID || data.CreatedBy);
        setAudit('MakerDT', formatDateTimeValue(data.MakerDT || data.CreatedOn));
        setAudit('ModifierID', data.ModifierID || data.ModifiedBy);
        setAudit('ModifierDT', formatDateTimeValue(data.ModifierDT || data.ModifiedOn));
        setAudit('CheckerID', data.CheckerID || data.SupervisedBy);
        setAudit('CheckerDT', formatDateTimeValue(data.CheckerDT || data.SupervisedOn));
    }

    /**
     * Clear Form for New Record
     */
    function clearForm() {
        const fields = ['chequeNoStart', 'chequeNoEnd', 'chequeDate', 'chequeAmount', 'reasonId', 'voidDate', 'requestRef', 'instructionGivenBy'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.value = '';
        });

        // Reset Audit
        ['MakerID', 'MakerDT', 'ModifierID', 'ModifierDT', 'CheckerID', 'CheckerDT'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            if ('value' in el) {
                el.value = '';
                return;
            }

            el.textContent = '-';
        });
    }

    /**
     * Set Module Mode
     */
    function setMode(mode) {
        state.currentMode = mode;
        const isReadOnly = mode === 'VIEW';

        const fields = ['chequeNoStart', 'chequeNoEnd', 'chequeDate', 'chequeAmount', 'reasonId', 'voidDate', 'requestRef', 'instructionGivenBy'];
        fields.forEach(f => {
            const el = document.getElementById(f);
            if (el) el.disabled = isReadOnly;
        });

        if (mode === 'ADD') {
            clearForm();
            const ctx = loadContext();
            const instructionGivenByEl = document.getElementById('instructionGivenBy');
            const voidDateEl = document.getElementById('voidDate');
            if (instructionGivenByEl) instructionGivenByEl.value = ctx.operatorId || '';
            if (voidDateEl) voidDateEl.value = new Date().toISOString().split('T')[0];
            state.selectedIndex = -1;
            state.selectedRecord = null;
            renderGrid();
        }

        // Update Global Buttons
        const btnView = document.getElementById('submoduleBtnView');
        const btnAdd = document.getElementById('submoduleBtnAdd');
        const btnEdit = document.getElementById('submoduleBtnEdit');
        const btnSave = document.getElementById('submoduleBtnSave');
        const btnCancel = document.getElementById('submoduleBtnCancel');
        const btnDelete = document.getElementById('submoduleBtnDelete');

        const isEditing = mode !== 'VIEW';
        if (btnView) btnView.disabled = isEditing;
        if (btnAdd) btnAdd.disabled = isEditing;
        if (btnEdit) btnEdit.disabled = isEditing;
        // Keep Save clickable in VIEW so users get immediate feedback instead of a silent no-op.
        if (btnSave) btnSave.disabled = false;
        if (btnCancel) btnCancel.disabled = !isEditing;
        if (btnDelete) btnDelete.disabled = isEditing;
    }

    /**
     * Navigation Logic (Proxy for View Button)
     */
    function navigate() {
        setMode('VIEW');
        loadData();
    }

    /**
     * Mode Confirmation - Add
     */
    function confirmAdd() {
        setMode('ADD');
    }

    /**
     * Mode Confirmation - Edit
     */
    function confirmEdit() {
        if (!state.selectedRecord) {
            showMsg('Please select a record to edit.', 'warning');
            return;
        }
        setMode('EDIT');
    }

    /**
     * Save Data
     */
    async function saveData() {
        try {
            console.log(`[${state.submoduleName}] Save clicked`, {
                mode: state.currentMode,
                selectedIndex: state.selectedIndex,
                hasSelectedRecord: !!state.selectedRecord
            });

            if (state.currentMode === 'VIEW') {
                showMsg('Click Add or Edit before saving.', 'warning');
                return;
            }
            const ctx = loadContext();

            if (!ctx.accountId || !ctx.branchId) {
                showMsg('No account selected. Please load an account first.', 'warning');
                return;
            }

            const isAdd = state.currentMode === 'ADD';

            const rawChequeNoStart = document.getElementById('chequeNoStart').value;
            const rawChequeNoEnd = document.getElementById('chequeNoEnd').value;
            const reasonId = document.getElementById('reasonId').value;
            const instructionGivenBy = (document.getElementById('instructionGivenBy').value || '').trim() || ctx.operatorId;
            const stopPaymentDate = document.getElementById('voidDate').value || new Date().toISOString().split('T')[0];

            const payload = {
                OurBranchID: ctx.branchId,
                AccountTypeID: ctx.accountTypeId || 'C',
                AccountID: ctx.accountId,
                StartChequeID: extractChequeNumber(rawChequeNoStart),
                EndChequeID: extractChequeNumber(rawChequeNoEnd),
                ChequeDate: document.getElementById('chequeDate').value,
                ChequeAmount: document.getElementById('chequeAmount').value || '0',
                StopPaymentReasonID: reasonId,
                StopPaymentReason: getSelectedOptionText('reasonId'),
                StopPaymentBy: instructionGivenBy,
                StopPaymentDate: stopPaymentDate,
                RequestReferenceNo: document.getElementById('requestRef').value,
                CreatedBy: ctx.operatorId,
                CreatedOn: stopPaymentDate,
                OperatorID: ctx.operatorId
            };

            console.log(`[${state.submoduleName}] Save payload preview`, {
                mode: state.currentMode,
                payload
            });

            if (!isAdd && state.selectedRecord) {
                payload.UpdateCount = state.selectedRecord.UpdateCount || state.selectedRecord.Updatecount || 0;
                payload.CreatedBy = state.selectedRecord.CreatedBy || state.selectedRecord.MakerID || ctx.operatorId;
                payload.CreatedOn = state.selectedRecord.CreatedOn || state.selectedRecord.MakerDT || payload.CreatedOn;
            }

            // Validation
            console.log(`[${state.submoduleName}] Validation check`, {
                StartChequeID: payload.StartChequeID,
                EndChequeID: payload.EndChequeID,
                StopPaymentReasonID: payload.StopPaymentReasonID,
                StopPaymentBy: payload.StopPaymentBy,
                AccountTypeID: payload.AccountTypeID
            });
            if (!payload.StartChequeID) { showMsg('Cheque No Start is required.', 'warning'); return; }
            if (!payload.EndChequeID) { showMsg('Cheque No End is required.', 'warning'); return; }
            if (!payload.StopPaymentReasonID) { showMsg('Reason is required.', 'warning'); return; }
            if (!payload.StopPaymentBy) { showMsg('Instruction Given By is required.', 'warning'); return; }

            toggleLoading(true, 'Saving stop payment record...');
            const endpoint = isAdd ? API.ADD : API.UPDATE;
            console.log(`[${state.submoduleName}] Save payload`, {
                mode: state.currentMode,
                endpoint,
                payload
            });
            const result = await AppCore.invokeControllerAsync(endpoint, payload);

            const isOk = result && (result.Success || result.success || result.ResponseCode === '00');
            if (isOk) {
                showMsg(buildSaveSuccessMessage(result), 'success');
                setMode('VIEW');
                await loadData(false);
                clearForm();
            } else {
                showMsg(buildErrorMessage(result, 'Failed to save record.'), 'error');
            }
        } catch (error) {
            console.error(`[${state.submoduleName}] Save Error:`, error);
            showMsg('Error saving record: ' + error.message, 'error');
        } finally {
            toggleLoading(false);
        }
    }

    /**
     * Delete/Void Record
     */
    async function deleteData() {
        if (!state.selectedRecord) {
            showMsg('Please select a record to void.', 'warning');
            return;
        }

        const ctx = loadContext();

        const confirmed = await AppCore.showConfirmation('Confirm Void', 'Are you sure you want to void this stop payment record?');
        if (!confirmed) return;

        try {
            toggleLoading(true, 'Voiding stop payment record...');

            const requestData = {
                AccountID: ctx.accountId,
                OurBranchID: ctx.branchId,
                RecordID: state.selectedRecord.RecordID, // Adjust field name if necessary
                OperatorID: ctx.operatorId
            };

            const result = await AppCore.invokeControllerAsync(API.DELETE, requestData);

            const isOk = result && (result.Success || result.success || result.ResponseCode === '00');
            if (isOk) {
                showMsg('Stop payment record voided successfully.', 'success');
                await loadData();
            } else {
                showMsg(result?.ErrorMessage || result?.message || result?.ResponseMessage || 'Failed to void record.', 'error');
            }
        } catch (error) {
            console.error(`[${state.submoduleName}] Void Error:`, error);
            showMsg('Error voiding record: ' + error.message, 'error');
        } finally {
            toggleLoading(false);
        }
    }

    /**
     * Cancel Changes
     */
    function confirmCancel() {
        setMode('VIEW');
        if (state.selectedIndex >= 0) {
            void selectRecord(state.selectedIndex);
        } else {
            clearForm();
        }
    }

    // Public API
    return {
        init,
        navigate,
        confirmAdd,
        confirmEdit,
        saveData,
        deleteData,
        confirmCancel
    };
})();
