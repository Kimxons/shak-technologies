/**
 * Account Cheque Book Module
 * Refactored to use AppCore.invokeControllerAsync and align with IApiService pattern.
 */
window.AccountChequeBookModule = (function () {
    'use strict';

    const state = {
        currentMode: 'VIEW',
        chequeBooks: [],
        chequeRequests: [],
        selectedBook: null,
        selectedRequest: null,
        activeTab: 'books',
        context: {
            AccountID: '',
            OurBranchID: '',
            AccountName: '',
            BranchName: '',
            OperatorID: '',
            WorkingDate: '',
            CurrencyID: ''
        }
    };

    const API = {
        GET_BOOKS: 'get-cheque-books',
        GET_REQUESTS: 'get-cheque-book-requests',
        GET_ACCOUNT: 'get-account',
        ADD: 'add-cheque-book-request',
        APPROVE: 'approve-cheque-request',
        DISPATCH: 'dispatch-cheque-book'
    };

    /**
     * Get context from global state or storage
     */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        const defaultWorkingDate = window.GlobalUtils?.getCurrentDate
            ? window.GlobalUtils.getCurrentDate()
            : new Date().toISOString().split('T')[0];
        return {
            AccountID: ps?.AccountID || sessionStorage.getItem('currentAccountID') || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            AccountName: ps?.AccountName || sessionStorage.getItem('currentAccountName') || '',
            BranchName: ps?.BranchName || sessionStorage.getItem('currentBranchName') || '',
            OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'web_portal',
            WorkingDate: ps?.WorkingDate || new Date().toISOString().split('T')[0],
            CurrencyID: ps?.CurrencyID || sessionStorage.getItem('currentCurrencyID') || ''
        };
    }

    const el = (id) => document.getElementById(id);
    const val = (id) => el(id)?.value?.trim() || '';
    const setVal = (id, v) => { const e = el(id); if (e) e.value = (v == null) ? '' : v; };

    function setCurrencyDisplay(value) {
        const currencyEl = el('currencyId');
        if (currencyEl) currencyEl.textContent = value || '-';
    }

    function resolveCurrency(...sources) {
        for (const src of sources) {
            if (!src) continue;
            const candidate = src.CurrencyID || src.currencyID || src.currencyId || src.Currency;
            if (candidate) return candidate;
        }
        return '';
    }

    function syncContext(ctx) {
        state.context = { ...ctx };

        if (!window.AccountMaintenanceState) window.AccountMaintenanceState = {};
        window.AccountMaintenanceState.AccountID = ctx.AccountID || '';
        window.AccountMaintenanceState.OurBranchID = ctx.OurBranchID || '';
        window.AccountMaintenanceState.AccountName = ctx.AccountName || '';
        window.AccountMaintenanceState.BranchName = ctx.BranchName || '';
        window.AccountMaintenanceState.OperatorID = ctx.OperatorID || '';
        window.AccountMaintenanceState.WorkingDate = ctx.WorkingDate || '';
        window.AccountMaintenanceState.CurrencyID = ctx.CurrencyID || '';

        if (ctx.AccountID) sessionStorage.setItem('currentAccountID', ctx.AccountID);
        if (ctx.OurBranchID) sessionStorage.setItem('currentBranchID', ctx.OurBranchID);
        if (ctx.AccountName) sessionStorage.setItem('currentAccountName', ctx.AccountName);
        if (ctx.BranchName) sessionStorage.setItem('currentBranchName', ctx.BranchName);
        if (ctx.OperatorID) sessionStorage.setItem('currentOperatorID', ctx.OperatorID);
        if (ctx.CurrencyID) sessionStorage.setItem('currentCurrencyID', ctx.CurrencyID);
    }

    function hydrateIdentificationFromContext(ctx) {
        setVal('branchId', ctx.OurBranchID);
        setVal('branchName', ctx.BranchName);
        setVal('accountId', ctx.AccountID);
        setVal('accountName', ctx.AccountName);
    }

    function populateAccountDetailsFromContext() {
        const gs = window.AccountMaintenanceState || {};

        setVal('clientId', gs.ClientID || sessionStorage.getItem('currentClientID') || val('clientId'));
        setVal('clientName', gs.ClientName || document.getElementById('ClientName')?.value || state.context.AccountName || val('clientName'));
        setVal('productId', gs.ProductID || sessionStorage.getItem('currentProductID') || val('productId'));
        setVal('productName', gs.ProductName || document.getElementById('ProductName')?.value || val('productName'));
        setVal('address1', gs.Address1 || val('address1'));
        setVal('address2', gs.Address2 || val('address2'));
        setVal('city', gs.City || val('city'));
        setVal('country', gs.Country || val('country'));
        setVal('phoneHome', gs.PhoneHome || val('phoneHome'));
        setVal('phoneWork', gs.PhoneWork || val('phoneWork'));
        setVal('faxNo', gs.FaxNo || val('faxNo'));
        setVal('mobile', gs.Mobile || val('mobile'));

        const currency = resolveCurrency(gs, state.context, { CurrencyID: sessionStorage.getItem('currentCurrencyID') });
        if (currency) setCurrencyDisplay(currency);
    }

    function toggleLoading(isLoading) {
        if (window.AppCore && typeof window.AppCore.toggleLoading === 'function') {
            window.AppCore.toggleLoading(isLoading);
            return;
        }

        // Fallback when AppCore variant does not expose toggleLoading.
        document.body.classList.toggle('is-loading', !!isLoading);
    }

    function formatDate(dateValue) {
        if (!dateValue) return '-';

        if (window.AppCore && typeof window.AppCore.formatDate === 'function') {
            return window.AppCore.formatDate(dateValue);
        }

        const d = new Date(dateValue);
        if (Number.isNaN(d.getTime())) return '-';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function formatDateForInput(dateValue) {
        if (!dateValue) return '';
        const d = new Date(dateValue);
        if (Number.isNaN(d.getTime())) return '';
        const yyyy = d.getFullYear();
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const dd = String(d.getDate()).padStart(2, '0');
        return `${yyyy}-${mm}-${dd}`;
    }

    function showMsg(msg, type) {
        const t = window.showSystemToast || window.parent?.showSystemToast;
        if (t) t(msg, { variant: type === 'error' ? 'danger' : type === 'warning' ? 'warning' : 'success' });
    }

    function setMode(mode) {
        state.currentMode = mode;
        const editing = (mode === 'ADD' || mode === 'EDIT');
        ['bookType', 'chequeStart'].forEach(id => {
            const e = el(id); if (e) e.readOnly = !editing;
        });
        const bt = el('bookType'); if (bt) bt.disabled = !editing;
        if (mode === 'ADD') clearForm();
    }

    // Tracks whether View has returned data — used to restore correct state after Cancel
    let hasLoadedData = false;

    function setInitButtonState() {
        const btnView = el('submoduleBtnView');
        const btnAdd = el('submoduleBtnAdd');
        const btnEdit = el('submoduleBtnEdit');
        const btnSave = el('submoduleBtnSave');
        const btnCancel = el('submoduleBtnCancel');
        const btnDelete = el('submoduleBtnDelete');
        const btnApprove = el('submoduleBtnApprove');
        const btnDispatch = el('submoduleBtnDispatch');

        // Only View is active on first load
        if (btnView) btnView.disabled = false;
        if (btnAdd) btnAdd.disabled = true;
        if (btnEdit) btnEdit.disabled = true;
        if (btnSave) btnSave.disabled = true;
        if (btnCancel) btnCancel.disabled = true;
        if (btnDelete) btnDelete.disabled = true;
        if (btnApprove) btnApprove.disabled = true;
        if (btnDispatch) btnDispatch.disabled = true;
    }

    /**
     * Button state after View completes.
     * Mirrors legacy setButtonStatesAfterView(hasResults):
     * - View stays enabled so user can re-query
     * - Add, Edit, Delete, Cancel always enabled
     * - Save, Approve, Dispatch disabled (Approve/Dispatch enabled only when a request row is selected)
     * hasResults is stored so the Cancel handler can restore this same state.
     */
    function setButtonStatesAfterView(hasResults) {
        hasLoadedData = !!hasResults;

        const btnView = el('submoduleBtnView');
        const btnAdd = el('submoduleBtnAdd');
        const btnEdit = el('submoduleBtnEdit');
        const btnSave = el('submoduleBtnSave');
        const btnCancel = el('submoduleBtnCancel');
        const btnDelete = el('submoduleBtnDelete');
        const btnApprove = el('submoduleBtnApprove');
        const btnDispatch = el('submoduleBtnDispatch');

        if (btnView) btnView.disabled = false;      // stays enabled — user can re-query
        if (btnAdd) btnAdd.disabled = false;
        if (btnEdit) btnEdit.disabled = false;
        if (btnSave) btnSave.disabled = true;
        if (btnCancel) btnCancel.disabled = false;
        if (btnDelete) btnDelete.disabled = false;
        if (btnApprove) btnApprove.disabled = true; // enabled when a request row is selected
        if (btnDispatch) btnDispatch.disabled = true;
    }

    function setAddModeButtonState() {
        const btnView = el('submoduleBtnView');
        const btnAdd = el('submoduleBtnAdd');
        const btnEdit = el('submoduleBtnEdit');
        const btnSave = el('submoduleBtnSave');
        const btnCancel = el('submoduleBtnCancel');
        const btnDelete = el('submoduleBtnDelete');
        const btnApprove = el('submoduleBtnApprove');
        const btnDispatch = el('submoduleBtnDispatch');

        if (btnView) btnView.disabled = true;
        if (btnAdd) btnAdd.disabled = true;
        if (btnEdit) btnEdit.disabled = true;
        if (btnSave) btnSave.disabled = false;
        if (btnCancel) btnCancel.disabled = false;
        if (btnDelete) btnDelete.disabled = true;
        if (btnApprove) btnApprove.disabled = true;
        if (btnDispatch) btnDispatch.disabled = true;
    }

    function setEditModeButtonState() {
        const btnView = el('submoduleBtnView');
        const btnAdd = el('submoduleBtnAdd');
        const btnEdit = el('submoduleBtnEdit');
        const btnSave = el('submoduleBtnSave');
        const btnCancel = el('submoduleBtnCancel');
        const btnDelete = el('submoduleBtnDelete');
        const btnApprove = el('submoduleBtnApprove');
        const btnDispatch = el('submoduleBtnDispatch');

        if (btnView) btnView.disabled = true;
        if (btnAdd) btnAdd.disabled = true;
        if (btnEdit) btnEdit.disabled = true;
        if (btnSave) btnSave.disabled = false;
        if (btnCancel) btnCancel.disabled = false;
        if (btnDelete) btnDelete.disabled = false; // Delete stays enabled in edit mode
        if (btnApprove) btnApprove.disabled = true;
        if (btnDispatch) btnDispatch.disabled = true;
    }

    function calculateChequeEnd() {
        const start = parseInt(val('chequeStart')) || 0;
        const leaves = parseInt(val('noOfLeaves')) || 0;
        if (start > 0 && leaves > 0) setVal('chequeEnd', start + leaves - 1);
        else setVal('chequeEnd', '');
    }

    function isSuccessfulResponse(res) {
        const code = res?.ResponseCode || res?.responseCode || res?.data?.ResponseCode;
        return !!(res?.success || res?.Success || code === '00');
    }

    function extractPayload(res) {
        if (!res || typeof res !== 'object') return {};
        if (res.Details && typeof res.Details === 'object') return res.Details;
        if (res.details && typeof res.details === 'object') return res.details;
        if (res.data?.Details && typeof res.data.Details === 'object') return res.data.Details;
        if (res.data?.details && typeof res.data.details === 'object') return res.data.details;
        if (res.data && typeof res.data === 'object') return res.data;
        return {};
    }

    function asArray(value) {
        return Array.isArray(value) ? value : [];
    }

    function hasPopulatedViewFields() {
        const hasRows = state.chequeRequests.length > 0 || state.chequeBooks.length > 0;
        const hasAccountDetails = !!(val('clientId') || val('clientName') || val('productId') || val('productName'));
        const hasBehindScene = !!(
            (el('currencyId')?.textContent || '').trim() !== '-' ||
            (el('MakerID')?.textContent || '').trim() !== '-' ||
            (el('MakerDT')?.textContent || '').trim() !== '-' ||
            (el('approvedBy')?.textContent || '').trim() !== '-' ||
            (el('approvedOn')?.textContent || '').trim() !== '-' ||
            (el('dispatchedBy')?.textContent || '').trim() !== '-' ||
            (el('dispatchedOn')?.textContent || '').trim() !== '-'
        );

        return hasRows || hasAccountDetails || hasBehindScene;
    }

    async function ensureAccountFallbackData(ctx) {
        const hasCurrency = !!resolveCurrency(
            { CurrencyID: el('currencyId')?.textContent?.trim() },
            state.context,
            window.AccountMaintenanceState,
            { CurrencyID: sessionStorage.getItem('currentCurrencyID') }
        );

        if (hasCurrency) return;

        try {
            const accountRes = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.GET_ACCOUNT}`, {
                AccountID: ctx.AccountID,
                OurBranchID: ctx.OurBranchID,
                Direction: 0
            });

            const accountData = extractPayload(accountRes);
            const accountDetails = accountData.AccountDetails || accountData.accountDetails || (Array.isArray(accountData.Details01) ? accountData.Details01[0] : null);

            if (accountDetails) {
                populateAccountDetails(accountDetails);
                return;
            }

            const fallbackCurrency = resolveCurrency(accountData, accountRes, state.context, window.AccountMaintenanceState, { CurrencyID: sessionStorage.getItem('currentCurrencyID') });
            if (fallbackCurrency) {
                setCurrencyDisplay(fallbackCurrency);
                syncContext({ ...state.context, CurrencyID: fallbackCurrency });
            }
        } catch (_err) {
            // Keep UI functional even if account fallback endpoint is unavailable.
        }
    }

    async function loadData() {
        const ctx = getContext();
        syncContext(ctx);
        hydrateIdentificationFromContext(ctx);
        populateAccountDetailsFromContext();

        if (!ctx.AccountID) return;
        try {
            toggleLoading(true);
            const booksRes = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.GET_BOOKS}`, {
                OurBranchID: ctx.OurBranchID, AccountID: ctx.AccountID, AccountTypeID: 'C', RequestReferenceNo: '0', OperatorID: ctx.OperatorID, Direction: 0
            });
            console.log('[ChequeBook] loadData - booksRes:', booksRes);
            const booksData = extractPayload(booksRes);

            if (booksData.AccountDetails) {
                console.log('[ChequeBook] data found - booksData.AccountDetails:', booksData.AccountDetails);
                populateAccountDetails(booksData.AccountDetails);
                // set btn state withh data, 
            }
            console.log('[ChequeBook] loadData - booksData:', booksData);

            const responseCurrency = resolveCurrency(booksData.AccountDetails, booksData.ChequeRequestDetails, booksData, state.context, window.AccountMaintenanceState, { CurrencyID: sessionStorage.getItem('currentCurrencyID') });
            if (responseCurrency) {
                setCurrencyDisplay(responseCurrency);
                syncContext({ ...state.context, CurrencyID: responseCurrency });
            }

            if (booksData.ChequeRequestDetails) {
                populateForm(booksData.ChequeRequestDetails);
            }

            state.chequeBooks = asArray(
                booksData.ChequeBooks || booksData.ChequeBookDetails || booksData.Details03 || booksData.chequeBooks || booksData.ChequeBook
            );
            renderBooks(state.chequeBooks);

            const reqsRes = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.GET_REQUESTS}`, {
                OurBranchID: ctx.OurBranchID, AccountID: ctx.AccountID, AccountTypeID: 'C', ChequeRequestsID: '', OperatorID: ctx.OperatorID, Direction: 0
            });

            const reqsData = extractPayload(reqsRes);
            state.chequeRequests = asArray(reqsData.ChequeRequests || reqsData.chequeRequests || reqsData.Details02 || reqsData.Details);
            renderRequests(state.chequeRequests);

            await ensureAccountFallbackData(ctx);

            const hasResults = state.chequeRequests.length > 0 || state.chequeBooks.length > 0;

            if (state.chequeRequests.length > 0) {
                window.AccountChequeBookModule.selectRequest(0);
            } else if (state.chequeBooks.length > 0) {
                window.AccountChequeBookModule.selectBook(0);
            }

            // Set button states based on whether View returned data.
            // Mirrors legacy setButtonStatesAfterView(hasResults).
            setButtonStatesAfterView(hasResults);

            if (!hasResults && !isSuccessfulResponse(booksRes) && !isSuccessfulResponse(reqsRes)) {
                showMsg((booksRes?.ResponseMessage || reqsRes?.ResponseMessage || 'No cheque book records found'), 'warning');
            }
        } catch (err) {
            showMsg('Error loading data', 'error');
        } finally {
            toggleLoading(false);
        }
    }

    function renderBooks(books) {
        const tbody = el('chequeBookTableBody');
        if (!tbody) return;
        tbody.innerHTML = books.map((b, i) => `
            <tr data-index="${i}" onclick="AccountChequeBookModule.selectBook(${i}, this)">
                <td>${b.ChequeStart || b.chequeStart || '-'}</td>
                <td>${b.ChequeEnd || b.chequeEnd || '-'}</td>
                <td>${b.ChequePrefix || b.chequePrefix || '-'}</td>
                <td>${b.NoOfLeaves || b.noOfLeaves || '-'}</td>
                <td>${formatDate(b.DateIssued || b.dateIssued)}</td>
                <td>${b.Paid || b.paid || 0}</td>
                <td>${b.Stopped || b.stopped || 0}</td>
                <td>${b.Returned || b.returned || 0}</td>
            </tr>
        `).join('') || '<tr><td colspan="8" class="text-center p-3 text-muted">No cheque books found</td></tr>';
    }

    function renderRequests(reqs) {
        const tbody = el('chequeRequestTableBody');
        if (!tbody) return;
        tbody.innerHTML = reqs.map((r, i) => `
            <tr data-index="${i}" onclick="AccountChequeBookModule.selectRequest(${i}, this)">
                <td>${r.NoOfLeaves || r.leaves || '-'}</td>
                <td>${r.ChequeStart || r.start || '-'}</td>
                <td>${r.ChequeEnd || r.end || '-'}</td>
                <td>${formatDate(r.DateIssued || r.issueDate)}</td>
                <td>${r.ApprovedBy || '-'}</td>
                <td>${formatDate(r.ApprovedOn)}</td>
                <td>${r.DispatchedBy || '-'}</td>
            </tr>
        `).join('') || '<tr><td colspan="7" class="text-center p-3 text-muted">No cheque requests found</td></tr>';
    }

    function populateAccountDetails(d) {
        setVal('branchId', d.OurBranchID || d.BranchID || state.context.OurBranchID);
        setVal('branchName', d.BranchName || state.context.BranchName);
        setVal('accountId', d.AccountID || state.context.AccountID);
        setVal('accountName', d.AccountName || d.Name || state.context.AccountName);

        setVal('clientId', d.ClientID || '');
        setVal('clientName', d.ClientName || d.Name || state.context.AccountName || '');
        setVal('productId', d.ProductID || '');
        setVal('productName', d.ProductName || sessionStorage.getItem('currentProductID') || '');

        setVal('address1', d.Address1 || '');
        setVal('address2', d.Address2 || '');
        setVal('city', d.City || d.CityName || '');
        setVal('country', d.Country || d.CountryName || '');
        setVal('phoneHome', d.Phone1 || d.PhoneHome || '');
        setVal('phoneWork', d.Phone2 || d.PhoneWork || '');
        setVal('faxNo', d.FaxNo || '');
        setVal('mobile', d.MobileNo || d.Mobile || '');

        const currency = resolveCurrency(d, state.context, window.AccountMaintenanceState, { CurrencyID: sessionStorage.getItem('currentCurrencyID') });
        if (currency) {
            setCurrencyDisplay(currency);
        }

        // Keep module/session/global context synchronized after successful view load.
        syncContext({
            ...state.context,
            AccountID: d.AccountID || d.accountId || state.context.AccountID,
            OurBranchID: d.OurBranchID || d.BranchID || d.branchId || state.context.OurBranchID,
            AccountName: d.AccountName || d.accountName || state.context.AccountName,
            BranchName: d.BranchName || d.branchName || state.context.BranchName,
            CurrencyID: currency || state.context.CurrencyID
        });
    }

    function populateForm(d) {
        setVal('issueDate', formatDateForInput(d.DateIssued || d.dateIssued || d.IssueDate));
        setVal('bookType', d.BookTypeID || d.bookTypeID || d.BookType || d.bookType || '');
        setVal('noOfLeaves', d.NoOfLeaves || d.noOfLeaves || '');
        setVal('chequePrefix', d.ChequePrefix || d.chequePrefix || '');
        setVal('chequeStart', d.ChequeStart || d.chequeStart || '');
        setVal('chequeEnd', d.ChequeEnd || d.chequeEnd || '');
        el('MakerID').textContent = d.MakerID || d.CreatedBy || '-';
        el('MakerDT').textContent = formatDate(d.MakerDT || d.CreatedOn);
        if (el('ModifierID')) el('ModifierID').textContent = d.ModifierID || d.ModifiedBy || '-';
        if (el('ModifierDT')) el('ModifierDT').textContent = formatDate(d.ModifierDT || d.ModifiedOn);
        el('approvedBy').textContent = d.ApprovedBy || '-';
        el('approvedOn').textContent = formatDate(d.ApprovedOn);
        el('dispatchedBy').textContent = d.DispatchedBy || '-';
        el('dispatchedOn').textContent = formatDate(d.DispatchedOn);
    }

    // Populates only the range fields on row selection — bookType is intentionally excluded
    // so it does not change unless the user enters Add/Edit mode.
    function populateSelectionFields(d) {
        setVal('chequePrefix', d.ChequePrefix || d.chequePrefix || '');
        setVal('chequeStart', d.ChequeStart || d.chequeStart || '');
        setVal('chequeEnd', d.ChequeEnd || d.chequeEnd || '');
        el('MakerID').textContent = d.MakerID || d.CreatedBy || '-';
        el('MakerDT').textContent = formatDate(d.MakerDT || d.CreatedOn);
        if (el('ModifierID')) el('ModifierID').textContent = d.ModifierID || d.ModifiedBy || '-';
        if (el('ModifierDT')) el('ModifierDT').textContent = formatDate(d.ModifierDT || d.ModifiedOn);
        el('approvedBy').textContent = d.ApprovedBy || '-';
        el('approvedOn').textContent = formatDate(d.ApprovedOn);
        el('dispatchedBy').textContent = d.DispatchedBy || '-';
        el('dispatchedOn').textContent = formatDate(d.DispatchedOn);
    }

    function clearForm() {
        ['issueDate', 'bookType', 'noOfLeaves', 'chequePrefix', 'chequeStart', 'chequeEnd'].forEach(id => setVal(id, ''));
        ['MakerID', 'MakerDT', 'approvedBy', 'approvedOn', 'dispatchedBy', 'dispatchedOn'].forEach(id => {
            if (el(id)) el(id).textContent = '-';
        });
        if (el('ModifierID')) el('ModifierID').textContent = '-';
        if (el('ModifierDT')) el('ModifierDT').textContent = '-';
        setVal('issueDate', formatDateForInput(getContext().WorkingDate));
    }

    function clearAccountDetailsAndBehindScene() {
        ['clientId', 'clientName', 'productId', 'productName', 'address1', 'address2', 'city', 'country', 'phoneHome', 'phoneWork', 'faxNo', 'mobile']
            .forEach(id => setVal(id, ''));

        if (el('currencyId')) el('currencyId').textContent = '-';
        if (el('MakerID')) el('MakerID').textContent = '-';
        if (el('MakerDT')) el('MakerDT').textContent = '-';
        if (el('ModifierID')) el('ModifierID').textContent = '-';
        if (el('ModifierDT')) el('ModifierDT').textContent = '-';
        if (el('approvedBy')) el('approvedBy').textContent = '-';
        if (el('approvedOn')) el('approvedOn').textContent = '-';
        if (el('dispatchedBy')) el('dispatchedBy').textContent = '-';
        if (el('dispatchedOn')) el('dispatchedOn').textContent = '-';

        state.chequeBooks = [];
        state.chequeRequests = [];
        state.selectedBook = null;
        state.selectedRequest = null;
        renderBooks(state.chequeBooks);
        renderRequests(state.chequeRequests);
    }

    async function handleSave() {
        if (!val('bookType') || !val('chequeStart')) { showMsg('Missing required fields', 'warning'); return false; }
        const ctx = getContext();
        // Determine add vs edit: in EDIT mode a request row must be selected
        const isEdit = state.currentMode === 'EDIT' && !!state.selectedRequest;
        const req = state.selectedRequest;
        const now = new Date().toISOString();
        const chequeRequestsID = isEdit ? (req?.ChequeRequestsID || req?.ID || '0') : '0';
        try {
            const res = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.ADD}`, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                AccountTypeID: 'C',
                ChequeRequestsID: chequeRequestsID,
                ChequeStart: parseInt(val('chequeStart')) || 0,
                ChequeEnd: parseInt(val('chequeEnd')) || 0,
                ChequePrefix: val('chequePrefix'),
                BookTypeID: val('bookType'),
                NoOfLeaves: parseInt(val('noOfLeaves')) || 0,
                DateIssued: val('issueDate') || ctx.WorkingDate,
                CreatedBy: isEdit ? (req?.CreatedBy || ctx.OperatorID) : ctx.OperatorID,
                CreatedOn: isEdit ? (req?.CreatedOn || now) : now,
                ModifiedBy: ctx.OperatorID,
                ModifiedOn: now,
                SupervisedBy: req?.SupervisedBy || '',
                RequestDate: isEdit ? (req?.RequestDate || now) : now,
                ChequeRequestStatusID: isEdit ? (req?.ChequeRequestStatusID || 'APP') : 'APP',
                ApprovedBy: req?.ApprovedBy || '',
                ApprovedOn: req?.ApprovedOn || '',
                DispatchedBy: req?.DispatchedBy || '',
                DispatchedOn: req?.DispatchedOn || '',
                UpdateCount: isEdit ? ((req?.UpdateCount || 0) + 1) : 2,
                NewRecord: isEdit ? 0 : 1,
                OperatorID: ctx.OperatorID
            });
            if (isSuccessfulResponse(res)) {
                showMsg(isEdit ? 'Cheque request updated successfully' : 'Cheque request saved successfully', 'success');
                loadData();
                return true;
            }
            showMsg(res?.ResponseMessage || res?.data?.ResponseMessage || res?.message || 'Save failed', 'error');
            return false;
        } catch (err) { showMsg('Error saving cheque request', 'error'); return false; }
    }

    function init() {
        const ctx = getContext();

        // On first load keep only View active until user explicitly loads/acts.
        setInitButtonState();

        // Show and store identification values immediately on screen init.
        syncContext(ctx);
        hydrateIdentificationFromContext(ctx);
        clearAccountDetailsAndBehindScene();

        document.querySelectorAll('.de-tab').forEach(btn => {
            btn.addEventListener('click', function () {
                const tab = this.dataset.tab; state.activeTab = tab;
                document.querySelectorAll('.de-tab').forEach(b => b.classList.remove('is-active')); this.classList.add('is-active');
                document.querySelectorAll('.de-tab-panel').forEach(p => p.classList.add('d-none'));
                document.querySelector(`[data-panel="${tab}"]`)?.classList.remove('d-none');
            });
        });
        el('chequeStart')?.addEventListener('input', calculateChequeEnd);
        el('bookType')?.addEventListener('change', () => {
            const leaves = val('bookType') === '50' ? 50 : 25; setVal('noOfLeaves', leaves); setVal('chequePrefix', 'CB'); calculateChequeEnd();
        });
        document.querySelectorAll('[data-section-toggle]').forEach(hdr => {
            hdr.addEventListener('click', function () {
                const sec = this.closest('.form-section'); const content = sec?.querySelector('.section-content, [data-section-content]');
                const btn = sec?.querySelector('.section-toggle-btn'); const icon = btn?.querySelector('i');
                const exp = btn?.getAttribute('aria-expanded') === 'true'; if (content) content.hidden = exp;
                btn?.setAttribute('aria-expanded', String(!exp)); icon?.classList.toggle('bi-chevron-up'); icon?.classList.toggle('bi-chevron-down');
            });
        });
        // Do not auto-load details at init.
        // User must click View to populate Account Details and Behind The Scene.
    }

    function handleView() {
        const ctx = getContext();
        syncContext(ctx);
        hydrateIdentificationFromContext(ctx);
        setMode('VIEW');
        return loadData();
    }

    function handleAdd() {
        setMode('ADD');
        setAddModeButtonState();
    }

    async function handleUpdate() {
        if (!state.selectedBook) { showMsg('No cheque book selected', 'warning'); return false; }
        const ctx = getContext();
        try {
            const payload = {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                BookType: val('bookType'),
                NoOfLeaves: parseInt(val('noOfLeaves')),
                ChequeStart: parseInt(val('chequeStart')),
                IssueDate: ctx.WorkingDate,
                OperatorID: ctx.OperatorID,
                ChequeBookID: state.selectedBook.ChequeBookID || state.selectedBook.ID
            };
            const res = await AppCore.invokeControllerAsync('AccountsMaintenance/api/update-cheque-book', payload);
            if (res && res.success) { showMsg('Cheque book updated', 'success'); loadData(); return true; }
            showMsg(res.message || 'Update failed', 'error'); return false;
        } catch (err) { showMsg('Error updating cheque book', 'error'); return false; }
    }

    async function handleDelete() {
        if (!state.selectedBook) { showMsg('No cheque book selected', 'warning'); return false; }
        const ctx = getContext();
        try {
            const payload = {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                ChequeBookID: state.selectedBook.ChequeBookID || state.selectedBook.ID,
                OperatorID: ctx.OperatorID
            };
            const res = await AppCore.invokeControllerAsync('AccountsMaintenance/api/delete-cheque-book', payload);
            if (res && res.success) { showMsg('Cheque book deleted', 'success'); loadData(); return true; }
            showMsg(res.message || 'Delete failed', 'error'); return false;
        } catch (err) { showMsg('Error deleting cheque book', 'error'); return false; }
    }

    return {
        init,
        navigate: handleView,
        save: handleSave,
        update: handleUpdate,
        delete: handleDelete,
        edit: () => {
            // Populate all form fields (including bookType) from the selected record before entering edit mode
            const selected = state.selectedRequest || state.selectedBook;
            if (selected) populateForm(selected);
            setMode('EDIT'); setEditModeButtonState();
        },
        cancel: () => { setMode('VIEW'); setButtonStatesAfterView(hasLoadedData); loadData(); },
        add: handleAdd,
        view: handleView,
        refresh: loadData,
        approve: async () => {
            const ok = await AppCore.showConfirmation('Approve Cheque Request', 'Are you sure you want to approve this cheque book request?');
            if (!ok) return;
            const ctx = getContext();
            try {
                const res = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.APPROVE}`, {
                    OurBranchID: ctx.OurBranchID, AccountID: ctx.AccountID, ChequeRequestsID: state.selectedRequest.ChequeRequestsID || state.selectedRequest.ID, OperatorID: ctx.OperatorID
                });
                if (res && res.success) { showMsg('Approved successfully', 'success'); loadData(); }
                else showMsg(res.message || 'Approval failed', 'error');
            } catch (err) { showMsg('Error during approval', 'error'); }
        },
        dispatch: async () => {
            const ok = await AppCore.showConfirmation('Dispatch Cheque Book', 'Are you sure you want to dispatch this cheque book?');
            if (!ok) return;
            const ctx = getContext();
            try {
                const res = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.DISPATCH}`, {
                    OurBranchID: ctx.OurBranchID, AccountID: ctx.AccountID, ChequeRequestsID: state.selectedRequest.ChequeRequestsID || state.selectedRequest.ID, OperatorID: ctx.OperatorID
                });
                if (res && res.success) { showMsg('Dispatched successfully', 'success'); loadData(); }
                else showMsg(res.message || 'Dispatch failed', 'error');
            } catch (err) { showMsg('Error during dispatch', 'error'); }
        },
        selectBook: (idx, row) => {
            state.selectedBook = state.chequeBooks[idx]; state.selectedRequest = null;
            const targetRow = row || document.querySelector(`#chequeBookTableBody tr[data-index="${idx}"]`);
            document.querySelectorAll('#chequeBookGrid tr').forEach(r => r.classList.remove('table-primary'));
            if (targetRow) targetRow.classList.add('table-primary');
            populateSelectionFields(state.selectedBook); setMode('VIEW');
            // Cheque books have no approval/dispatch workflow
            const btnApprove = el('submoduleBtnApprove');
            const btnDispatch = el('submoduleBtnDispatch');
            if (btnApprove) btnApprove.disabled = true;
            if (btnDispatch) btnDispatch.disabled = true;
        },
        selectRequest: (idx, row) => {
            state.selectedRequest = state.chequeRequests[idx]; state.selectedBook = null;
            const targetRow = row || document.querySelector(`#chequeRequestTableBody tr[data-index="${idx}"]`);
            document.querySelectorAll('#chequeRequestGrid tr').forEach(r => r.classList.remove('table-primary'));
            if (targetRow) targetRow.classList.add('table-primary');
            populateSelectionFields(state.selectedRequest); setMode('VIEW');
            // Enable Approve if not yet approved; enable Dispatch if approved but not yet dispatched
            const needsAppr = !state.selectedRequest.ApprovedBy;
            const needsDisp = !needsAppr && !state.selectedRequest.DispatchedBy;
            const btnApprove = el('submoduleBtnApprove');
            const btnDispatch = el('submoduleBtnDispatch');
            if (btnApprove) btnApprove.disabled = !needsAppr;
            if (btnDispatch) btnDispatch.disabled = !needsDisp;
        }
    };
})();
