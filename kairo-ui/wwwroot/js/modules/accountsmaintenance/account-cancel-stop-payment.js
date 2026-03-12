/**
 * Account Cancel Stop Payment Module
 * Standardized for KAIRO MVC project.
 * Uses AppCore.invokeControllerAsync for all API calls.
 */
window.CancelStopPaymentModule = (function () {
    'use strict';

    // Module State
    const state = {
        accountId: '',
        accountTypeId: 'C',
        branchId: '',
        operatorId: '',
        currentMode: 'VIEW', // VIEW, ADD, EDIT
        records: [],
        selectedIndex: -1,
        selectedRecord: null,
        currentUpdateCount: 0
    };

    // API Paths
    const API = {
        GET: 'AccountsMaintenance/CancelStopPayment/api/get',
        ADD: 'AccountsMaintenance/CancelStopPayment/api/create',
        UPDATE: 'AccountsMaintenance/CancelStopPayment/api/update',
        DELETE: 'AccountsMaintenance/CancelStopPayment/api/delete'
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

    function formatDateTimeValue(value) {
        if (!value) return '';

        if (window.AppCore && typeof window.AppCore.formatDate === 'function') {
            return window.AppCore.formatDate(value, true) || '';
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

    function getEnvelope(result) {
        return (result && result.data && typeof result.data === 'object') ? result.data : result;
    }

    function isResultFailure(result) {
        if (!result) return true;

        const envelope = getEnvelope(result);
        const successFlag = envelope?.success ?? envelope?.Success ?? result?.success ?? result?.Success;
        if (successFlag === false || String(successFlag).toLowerCase() === 'false') {
            return true;
        }

        const responseCode = String(
            envelope?.ResponseCode ?? envelope?.responseCode ?? result?.ResponseCode ?? result?.responseCode ?? ''
        ).trim();

        return !!(responseCode && !['00', '0', '000'].includes(responseCode));
    }

    function parseDetails(details) {
        if (!details) return null;
        if (typeof details === 'string') {
            try {
                return JSON.parse(details);
            } catch {
                return { raw: details };
            }
        }
        if (typeof details === 'object') {
            return details;
        }
        return null;
    }

    function getResponseDetails(result) {
        if (!result) return null;
        const envelope = getEnvelope(result);
        if (envelope?.Details && typeof envelope.Details === 'object') return envelope.Details;
        if (result?.Details && typeof result.Details === 'object') return result.Details;
        return parseDetails(envelope?.Details ?? result?.Details);
    }

    function getResultMessage(result, fallback) {
        const envelope = getEnvelope(result);
        const responseCode = String(
            envelope?.ResponseCode ?? envelope?.responseCode ?? result?.ResponseCode ?? result?.responseCode ?? ''
        ).trim();
        const details = getResponseDetails(result);
        const detailsMessage =
            details?.DBErrorMessage ||
            details?.dbErrorMessage ||
            details?.error ||
            details?.ErrorMessage ||
            details?.message ||
            details?.Message ||
            details?.raw;
        const message = (
            envelope?.ResponseMessage ||
            envelope?.message ||
            envelope?.Message ||
            envelope?.ErrorMessage ||
            detailsMessage ||
            result?.message ||
            result?.Message ||
            fallback
        );

        return responseCode && message ? `[${responseCode}] ${message}` : message;
    }

    function buildSaveSuccessMessage(result) {
        const details = getResponseDetails(result);
        const envelope = getEnvelope(result);
        const responseMessage = envelope?.ResponseMessage || envelope?.message || result?.ResponseMessage || result?.message || 'Record saved successfully';
        const requestReferenceNo =
            details?.Metadata?.CurrentRequestReferenceNo ||
            details?.StopPaymentData?.RawRequestReferenceNo ||
            details?.CancelStopPaymentData?.RawRequestReferenceNo ||
            details?.CancelStopPaymentData?.RequestReferenceNo ||
            details?.StopPaymentData?.RequestReferenceNo ||
            envelope?.RequestReferenceNo ||
            result?.RequestReferenceNo ||
            '';

        if (requestReferenceNo) {
            return `${responseMessage} Request Ref: ${requestReferenceNo}`;
        }

        return responseMessage;
    }

    function extractChequeNumber(rawValue) {
        const value = String(rawValue || '').trim();
        const digitGroups = value.match(/\d+/g);
        return digitGroups ? digitGroups.join('') : value;
    }

    function normalizeRequestRef(value) {
        return String(value || '').replace(/:/g, '').trim();
    }

    function getSelectedOptionText(selectId) {
        const select = document.getElementById(selectId);
        if (!select) return '';
        const option = select.options[select.selectedIndex];
        return option ? option.text.trim() : '';
    }

    function buildRequestRefAdvFilter(ctx) {
        if (!ctx.branchId || !ctx.accountId) return '';
        return `OurBranchID='${ctx.branchId}' AND AccountID='${ctx.accountId}'`;
    }

    function getSearchResultRows(result) {
        const envelope = getEnvelope(result);
        const details = envelope?.Details || envelope?.details || {};

        let payload = details;
        if (typeof payload?.RootElement === 'string') {
            payload = parseDetails(payload.RootElement) || {};
        } else if (typeof payload === 'string') {
            payload = parseDetails(payload) || {};
        }

        if (Array.isArray(payload?.SearchResults)) {
            return payload.SearchResults;
        }

        if (Array.isArray(payload?.details?.SearchResults)) {
            return payload.details.SearchResults;
        }

        return [];
    }

    function getCancelStopPaymentRecords(result) {
        const details = getResponseDetails(result) || {};

        if (Array.isArray(details.Details02)) {
            return details.Details02;
        }

        if (Array.isArray(details.CancelStopPaymentData)) {
            return details.CancelStopPaymentData;
        }

        if (details.CancelStopPaymentData && typeof details.CancelStopPaymentData === 'object') {
            return [details.CancelStopPaymentData];
        }

        if (Array.isArray(details)) {
            return details;
        }

        return [];
    }

    function getCancelStopPaymentAccountInfo(result) {
        const details = getResponseDetails(result) || {};

        if (Array.isArray(details.Details01) && details.Details01.length > 0) {
            return details.Details01[0];
        }

        if (details.Details01 && typeof details.Details01 === 'object') {
            return details.Details01;
        }

        if (details.AccountDetails && typeof details.AccountDetails === 'object') {
            return details.AccountDetails;
        }

        return null;
    }

    function hasRecordDetails(record) {
        if (!record || typeof record !== 'object') return false;

        return !!(
            record.CancelReasonID ||
            record.CancelReason ||
            record.CancelledBy ||
            record.CancelledDate ||
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

    async function searchCancelStopPaymentRows(ctx) {
        const advFilterString = buildRequestRefAdvFilter(ctx);
        if (!advFilterString) {
            return [];
        }

        const response = await AppCore.invokeControllerAsync('SearchModal/Search', {
            TableID: 'StopPayCancelID',
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

    async function fetchCancelStopPaymentDetail(ctx, requestRef) {
        const normalizedRequestRef = normalizeRequestRef(requestRef);
        if (!normalizedRequestRef) {
            return null;
        }

        const result = await AppCore.invokeControllerAsync(API.GET, {
            OurBranchID: ctx.branchId,
            AccountTypeID: ctx.accountTypeId || 'C',
            AccountID: ctx.accountId,
            OperatorID: ctx.operatorId,
            SearchKey: normalizedRequestRef,
            SearchID: normalizedRequestRef,
            ModuleTypeID: 'A',
            RelevantID: ctx.accountId
        });

        const accountInfo = getCancelStopPaymentAccountInfo(result);
        if (accountInfo) {
            populateAccountDetails(accountInfo);
        }

        const records = getCancelStopPaymentRecords(result);
        if (!Array.isArray(records) || records.length === 0) {
            return null;
        }

        const detailRecord = records.find(record =>
            normalizeRequestRef(record?.RawRequestReferenceNo || record?.RequestReferenceNo || record?.RequestRef) === normalizedRequestRef
        ) || records[0];

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

        const detailRecord = await fetchCancelStopPaymentDetail(ctx, requestRef);
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

            const detailRecord = await fetchCancelStopPaymentDetail(ctx, requestRef);
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
        const detailRecord = await fetchCancelStopPaymentDetail(ctx, normalizedRequestRef);
        if (!detailRecord) {
            showMsg('No cancel stop payment record found for the selected Request Ref No.', 'warning');
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
            tableID: 'StopPayCancelID',
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

    /**
     * Initialize the module
     */
    function init() {
        console.log('[CancelStopPayment] Initializing module...');
        wireSectionToggles();
        const ctx = loadContext();

        // Initial data load
        if (ctx.accountId) {
            loadData();
        } else {
            showMsg('No account context found. Please select an account.', 'warning');
            setMode('VIEW');
        }

        // Wire lookup buttons that are internal to this submodule
        wireInternalLookups();
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
     * Load account and branch context from global state or session
     */
    function getContext() {
        const globalState = window.AccountMaintenanceState || {};
        return {
            accountId: globalState.AccountID || sessionStorage.getItem('currentAccountID') || '',
            accountTypeId: globalState.AccountTypeID || sessionStorage.getItem('currentAccountTypeID') || localStorage.getItem('AccountTypeID') || 'C',
            branchId: globalState.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            operatorId: globalState.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'SYSTEM',
            accountName: globalState.AccountName || sessionStorage.getItem('currentAccountName') || '',
            branchName: globalState.BranchName || sessionStorage.getItem('currentBranchName') || ''
        };
    }

    function applyContextToIdentification(ctx) {
        const branchInput = document.getElementById('branchId');
        const accountInput = document.getElementById('accountId');
        const branchNameInput = document.getElementById('branchName');
        const accountNameInput = document.getElementById('accountName');

        if (branchInput) branchInput.value = ctx.branchId;
        if (accountInput) accountInput.value = ctx.accountId;
        if (branchNameInput) branchNameInput.value = ctx.branchName;
        if (accountNameInput) accountNameInput.value = ctx.accountName;
    }

    function loadContext() {
        const ctx = getContext();
        state.accountId = ctx.accountId;
        state.accountTypeId = ctx.accountTypeId;
        state.branchId = ctx.branchId;
        state.operatorId = ctx.operatorId;
        applyContextToIdentification(ctx);
        return ctx;
    }

    /**
     * Load data from the server
     */
    async function loadData(autoSelectFirst = true) {
        const ctx = loadContext();
        if (!ctx.accountId || !ctx.branchId) {
            showMsg('Account context is incomplete. Reload Account Maintenance and try again.', 'warning');
            return;
        }

        toggleLoading(true);
        try {
            const baselineResult = await AppCore.invokeControllerAsync(API.GET, {
                OurBranchID: ctx.branchId,
                AccountTypeID: ctx.accountTypeId || 'C',
                AccountID: ctx.accountId,
                OperatorID: ctx.operatorId,
                ModuleTypeID: 'A',
                RelevantID: ctx.accountId
            });

            if (!isResultFailure(baselineResult)) {
                const accountInfo = getCancelStopPaymentAccountInfo(baselineResult);
                if (accountInfo) {
                    populateAccountDetails(accountInfo);
                }
            }

            const requestRefInput = document.getElementById('requestRef');
            const requestedRef = normalizeRequestRef(requestRefInput?.value);

            state.records = await enrichGridRecords(await searchCancelStopPaymentRows(ctx));
            state.selectedIndex = -1;
            state.selectedRecord = null;
            renderGrid();

            if (!state.records.length) {
                clearForm();
                setMode('VIEW');
                return;
            }

            if (requestedRef) {
                await selectRecordByRequestRef(requestedRef);
                setMode('VIEW');
                return;
            }

            if (autoSelectFirst) {
                await selectRecord(0);
            } else {
                clearForm();
            }

            setMode('VIEW');
        } catch (error) {
            console.error('[CancelStopPayment] Error loading data:', error);
            showMsg(getResultMessage(error, 'Failed to load cancel stop payment records.'), 'error');
        } finally {
            toggleLoading(false);
        }
    }

    /**
     * Render the grid with records
     */
    function renderGrid() {
        const gridBody = document.querySelector('#stopPaymentGrid tbody');
        if (!gridBody) return;

        if (state.records.length === 0) {
            gridBody.innerHTML = '<tr class="grid-empty-row"><td colspan="8" class="text-center">No records to display.</td></tr>';
            document.getElementById('recordCount').textContent = '0 records';
            return;
        }

        gridBody.innerHTML = state.records.map((rec, index) => `
            <tr class="grid-row ${index === state.selectedIndex ? 'selected' : ''}" data-index="${index}">
                <td>${rec.ChequePrefix || rec.SPRowID || ''}</td>
                <td>${rec.StartChequeID || rec.ChequeNoStart || ''}</td>
                <td>${rec.EndChequeID || rec.ChequeNoEnd || ''}</td>
                <td>${formatDateValue(rec.ChequeDate)}</td>
                <td>${rec.CancelReason || rec.ReasonText || ''}</td>
                <td>${formatDateValue(rec.CancelledDate || rec.CancellationDate)}</td>
                <td class="text-end">${formatCurrencyValue(rec.ChequeAmount)}</td>
                <td>${rec.CancelledBy || rec.InstructionGivenBy || ''}</td>
            </tr>
        `).join('');

        document.getElementById('recordCount').textContent = `${state.records.length} record(s)`;

        // Wire up row click events
        gridBody.querySelectorAll('.grid-row').forEach(row => {
            row.addEventListener('click', () => {
                const index = parseInt(row.getAttribute('data-index'));
                selectRecord(index);
            });
        });
    }

    /**
     * Select a record from the grid
     */
    async function selectRecord(index) {
        if (index < 0 || index >= state.records.length) return;

        state.selectedIndex = index;
        state.selectedRecord = await ensureRecordDetails(index);

        if (state.selectedRecord) {
            populateForm(state.selectedRecord);
        }

        renderGrid();
    }

    /**
     * Populate the form fields with record data
     */
    function populateForm(rec) {
        document.getElementById('requestRef').value = rec.RequestReferenceNo || rec.RequestRef || '';
        document.getElementById('chequeNoStart').value = rec.StartChequeID || rec.ChequeNoStart || '';
        document.getElementById('chequeNoEnd').value = rec.EndChequeID || rec.ChequeNoEnd || '';
        document.getElementById('chequeDate').value = formatDateForInput(rec.ChequeDate);
        document.getElementById('chequeAmount').value = rec.ChequeAmount || '0.00';
        document.getElementById('reasonId').value = rec.CancelReasonID || rec.ReasonId || '';
        document.getElementById('reasonText').value = rec.CancelReason || rec.ReasonText || '';
        document.getElementById('cancellationDate').value = formatDateForInput(rec.CancelledDate || rec.CancellationDate);
        document.getElementById('instructionGivenBy').value = rec.CancelledBy || rec.InstructionGivenBy || '';

        state.currentUpdateCount = parseInt(rec.UpdateCount || 0);

        const setAudit = (id, val) => {
            const el = document.getElementById(id);
            if (!el) return;

            if ('value' in el) {
                el.value = val || '';
                return;
            }

            el.textContent = val || '-';
        };

        setAudit('CurrencyID', rec.CurrencyID);
        setAudit('MakerID', rec.MakerID || rec.CreatedBy);
        setAudit('MakerDT', formatDateTimeValue(rec.MakerDT || rec.CreatedOn));
        setAudit('SupervisorID', rec.SupervisorID || rec.SupervisedBy);
        setAudit('SupervisorDT', formatDateTimeValue(rec.SupervisorDT || rec.SupervisedOn));
    }

    function formatDateForInput(dateStr) {
        if (!dateStr) return '';
        if (window.GlobalUtils?.parseDateInput) {
            const parsed = window.GlobalUtils.parseDateInput(dateStr);
            if (parsed) return parsed;
        }
        try {
            const d = new Date(dateStr);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().split('T')[0];
        } catch {
            return '';
        }
    }

    /**
     * Populate the account details section
     */
    function populateAccountDetails(client) {
        if (!client) return;

        document.getElementById('clientId').value = client.ClientID || '';
        document.getElementById('clientName').value = client.ClientName || '';
        document.getElementById('productId').value = client.ProductID || '';
        document.getElementById('productName').value = client.ProductName || '';
        document.getElementById('address1').value = client.Address1 || '';
        document.getElementById('address2').value = client.Address2 || '';
        document.getElementById('city').value = client.City || '';
        document.getElementById('country').value = client.Country || '';
        document.getElementById('phoneHome').value = client.PhoneHome || '';
        document.getElementById('phoneWork').value = client.PhoneWork || '';
        document.getElementById('faxNo').value = client.FaxNo || '';
        document.getElementById('mobile').value = client.Mobile || '';

        const currencyEl = document.getElementById('CurrencyID');
        if (currencyEl) {
            currencyEl.value = client.CurrencyID || currencyEl.value || '';
        }

        // If not already set, update branch and account names from client info
        if (client.BranchName && !document.getElementById('branchName').value) {
            document.getElementById('branchName').value = client.BranchName;
        }
        if (client.AccountName && !document.getElementById('accountName').value) {
            document.getElementById('accountName').value = client.AccountName;
        }
    }

    /**
     * Clear the form fields
     */
    function clearForm() {
        const fields = [
            'requestRef', 'chequeNoStart', 'chequeNoEnd', 'chequeDate', 'chequeAmount',
            'reasonId', 'reasonText', 'cancellationDate', 'instructionGivenBy'
        ];
        fields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.value = '';
        });

        ['CurrencyID', 'MakerID', 'MakerDT', 'SupervisorID', 'SupervisorDT'].forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;

            if ('value' in el) {
                el.value = '';
                return;
            }

            el.textContent = '-';
        });

        state.currentUpdateCount = 0;
    }

    /**
     * Set the UI mode (VIEW, ADD, EDIT)
     */
    function setMode(mode) {
        state.currentMode = mode;
        const isEditing = mode === 'ADD' || mode === 'EDIT';

        // Enable/disable fields based on mode
        const editableFields = [
            'requestRef', 'chequeNoStart', 'chequeNoEnd', 'chequeDate', 'chequeAmount',
            'reasonId', 'reasonText', 'cancellationDate', 'instructionGivenBy'
        ];

        editableFields.forEach(id => {
            const el = document.getElementById(id);
            if (el) el.disabled = !isEditing;
        });

        if (mode === 'ADD') {
            const ctx = loadContext();
            const instructionGivenByEl = document.getElementById('instructionGivenBy');
            const cancellationDateEl = document.getElementById('cancellationDate');
            if (instructionGivenByEl) instructionGivenByEl.value = ctx.operatorId || '';
            if (cancellationDateEl) cancellationDateEl.value = new Date().toISOString().split('T')[0];
        }

        console.log(`[CancelStopPayment] Mode changed to: ${mode}`);

        // Update Global Buttons
        const btnView = document.getElementById('submoduleBtnView');
        const btnAdd = document.getElementById('submoduleBtnAdd');
        const btnEdit = document.getElementById('submoduleBtnEdit');
        const btnSave = document.getElementById('submoduleBtnSave');
        const btnCancel = document.getElementById('submoduleBtnCancel');
        const btnDelete = document.getElementById('submoduleBtnDelete');

        if (btnView) btnView.disabled = isEditing;
        if (btnAdd) btnAdd.disabled = isEditing;
        if (btnEdit) btnEdit.disabled = isEditing;
        // Keep Save clickable in VIEW so users get immediate feedback instead of a silent no-op.
        if (btnSave) btnSave.disabled = false;
        if (btnCancel) btnCancel.disabled = !isEditing;
        if (btnDelete) btnDelete.disabled = isEditing;
    }

    /**
     * UI Action: Navigate (Refresh data)
     */
    function navigate() {
        setMode('VIEW');
        loadData();
    }

    /**
     * UI Action: Confirm Add
     */
    function confirmAdd() {
        clearForm();
        setMode('ADD');
    }

    /**
     * UI Action: Confirm Edit
     */
    function confirmEdit() {
        if (state.selectedIndex < 0) {
            showMsg('Please select a record to edit', 'warning');
            return;
        }
        setMode('EDIT');
    }

    /**
     * UI Action: Save Data
     */
    async function saveData() {
        console.log('[CancelStopPayment] Save clicked', {
            mode: state.currentMode,
            selectedIndex: state.selectedIndex
        });

        if (state.currentMode === 'VIEW') {
            showMsg('Click Add or Edit before saving.', 'warning');
            return;
        }
        const ctx = loadContext();

        // Validation
        const rawStartCh = document.getElementById('chequeNoStart').value.trim();
        const rawEndCh = document.getElementById('chequeNoEnd').value.trim();
        const reasonId = document.getElementById('reasonId').value;
        const startCh = extractChequeNumber(rawStartCh);
        const endCh = extractChequeNumber(rawEndCh);

        const hasStartCheque = !!startCh;
        const hasEndCheque = !!endCh;
        const hasReasonId = !!reasonId;

        if (!hasStartCheque || !hasEndCheque || !hasReasonId) {
            console.warn('[CancelStopPayment] Save blocked by validation', {
                hasStartCheque,
                hasEndCheque,
                hasReasonId,
                mode: state.currentMode
            });

            if (!hasStartCheque) { showMsg('Cheque No Start is required', 'warning'); return; }
            if (!hasEndCheque) { showMsg('Cheque No End is required', 'warning'); return; }
            if (!hasReasonId) { showMsg('Cancel Reason is required', 'warning'); return; }
        }

        toggleLoading(true);
        try {
            const isAdd = state.currentMode === 'ADD';
            const cancelledBy = document.getElementById('instructionGivenBy').value.trim() || ctx.operatorId;
            const cancelledDate = document.getElementById('cancellationDate').value || new Date().toISOString().split('T')[0];
            const cancelReasonText = document.getElementById('reasonText').value.trim() || getSelectedOptionText('reasonId');
            const payload = {
                OurBranchID: ctx.branchId,
                AccountTypeID: ctx.accountTypeId || 'C',
                AccountID: ctx.accountId,
                OperatorID: ctx.operatorId,
                RequestReferenceNo: document.getElementById('requestRef').value.trim(),
                StartChequeID: startCh,
                EndChequeID: endCh,
                ChequeDate: document.getElementById('chequeDate').value,
                ChequeAmount: document.getElementById('chequeAmount').value || '0',
                CancelReasonID: reasonId,
                CancelReason: cancelReasonText,
                CancelledBy: cancelledBy,
                CancelledDate: cancelledDate,
                NewRecord: isAdd ? 1 : 0,
                UpdateCount: state.currentUpdateCount
            };

            console.log('[CancelStopPayment] Save payload preview', {
                mode: state.currentMode,
                payload
            });

            const endpoint = isAdd ? API.ADD : API.UPDATE;
            console.log('[CancelStopPayment] Save payload', {
                mode: state.currentMode,
                endpoint,
                payload
            });
            const result = await AppCore.invokeControllerAsync(endpoint, payload);

            const isOk = result && (result.ResponseCode === '00' || result.success || result.Success);
            if (isOk) {
                showMsg(buildSaveSuccessMessage(result), 'success');
                setMode('VIEW');
                await loadData(false);
                clearForm();
            } else {
                showMsg(getResultMessage(result, 'Failed to save record.'), 'error');
            }
        } catch (error) {
            console.error('[CancelStopPayment] Error saving data:', error);
            showMsg(getResultMessage(error, 'An error occurred while saving.'), 'error');
        } finally {
            toggleLoading(false);
        }
    }

    /**
     * UI Action: Delete Data
     */
    async function deleteData() {
        if (state.selectedIndex < 0) {
            showMsg('Please select a record to delete', 'warning');
            return;
        }

        const ctx = loadContext();

        const confirmed = await AppCore.showConfirmation('Confirm Delete', 'Are you sure you want to delete this cancel stop payment record?');
        if (!confirmed) return;

        toggleLoading(true);
        try {
            const rec = state.records[state.selectedIndex];
            const payload = {
                OurBranchID: ctx.branchId,
                AccountTypeID: ctx.accountTypeId || 'C',
                AccountID: ctx.accountId,
                OperatorID: ctx.operatorId,
                RequestReferenceNo: rec.RequestReferenceNo || rec.RequestRef || '',
                NewRecord: -1 // Signal for delete
            };

            const result = await AppCore.invokeControllerAsync(API.DELETE, payload);

            const isOk = result && (result.ResponseCode === '00' || result.success || result.Success);
            if (isOk) {
                showMsg(result.ResponseMessage || result.message || 'Record deleted successfully', 'success');
                loadData();
            } else {
                showMsg(getResultMessage(result, 'Failed to delete record.'), 'error');
            }
        } catch (error) {
            console.error('[CancelStopPayment] Error deleting data:', error);
            showMsg(getResultMessage(error, 'An error occurred while deleting.'), 'error');
        } finally {
            toggleLoading(false);
        }
    }

    /**
     * UI Action: Confirm Cancel (Discard changes)
     */
    function confirmCancel() {
        if (state.currentMode === 'VIEW') return;

        if (state.selectedIndex >= 0) {
            void selectRecord(state.selectedIndex);
        } else {
            clearForm();
        }
        setMode('VIEW');
    }

    /**
     * Wire up internal lookup buttons
     */
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

    // Public API
    return {
        init,
        navigate,
        confirmAdd,
        confirmEdit,
        saveData,
        deleteData,
        confirmCancel,
        setMode
    };

})();

console.log('[CancelStopPayment] Module loaded');
