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
        activeTab: 'books'
    };

    const API = {
        GET_BOOKS: 'get-cheque-books',
        GET_REQUESTS: 'get-cheque-book-requests',
        ADD: 'add-cheque-book',
        APPROVE: 'approve-cheque-request',
        DISPATCH: 'dispatch-cheque-book'
    };

    /**
     * Get context from global state or storage
     */
    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID: ps?.AccountID || sessionStorage.getItem('currentAccountID') || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID') || '',
            OperatorID: ps?.OperatorID || sessionStorage.getItem('currentOperatorID') || localStorage.getItem('OperatorID') || 'web_portal',
            WorkingDate: ps?.WorkingDate || new Date().toISOString().split('T')[0]
        };
    }

    const el = (id) => document.getElementById(id);
    const val = (id) => el(id)?.value?.trim() || '';
    const setVal = (id, v) => { const e = el(id); if (e) e.value = (v == null) ? '' : v; };

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

    function calculateChequeEnd() {
        const start = parseInt(val('chequeStart')) || 0;
        const leaves = parseInt(val('noOfLeaves')) || 0;
        if (start > 0 && leaves > 0) setVal('chequeEnd', start + leaves - 1);
        else setVal('chequeEnd', '');
    }

    async function loadData() {
        const ctx = getContext();
        if (!ctx.AccountID) return;
        try {
            AppCore.toggleLoading(true);
            const booksRes = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.GET_BOOKS}`, {
                OurBranchID: ctx.OurBranchID, AccountID: ctx.AccountID, AccountTypeID: 'C', RequestReferenceNo: '0', OperatorID: ctx.OperatorID, Direction: 0
            });
            if (booksRes && booksRes.success) {
                const data = booksRes.data || booksRes;
                state.chequeBooks = data.details03 || data.Details || [];
                renderBooks(state.chequeBooks);
                if (data.details01 && data.details01.length > 0) populateAccountDetails(data.details01[0]);
            }
            const reqsRes = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.GET_REQUESTS}`, {
                OurBranchID: ctx.OurBranchID, AccountID: ctx.AccountID, AccountTypeID: 'C', ChequeRequestsID: '', OperatorID: ctx.OperatorID, Direction: 0
            });
            if (reqsRes && reqsRes.success) {
                const data = reqsRes.data || reqsRes;
                state.chequeRequests = data.chequeRequests || data.Details || [];
                renderRequests(state.chequeRequests);
            }
        } catch (err) {
            showMsg('Error loading data', 'error');
        } finally {
            AppCore.toggleLoading(false);
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
                <td>${AppCore.formatDate(b.DateIssued || b.dateIssued)}</td>
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
                <td>${AppCore.formatDate(r.DateIssued || r.issueDate)}</td>
                <td>${r.ApprovedBy || '-'}</td>
                <td>${AppCore.formatDate(r.ApprovedOn)}</td>
                <td>${r.DispatchedBy || '-'}</td>
            </tr>
        `).join('') || '<tr><td colspan="7" class="text-center p-3 text-muted">No cheque requests found</td></tr>';
    }

    function populateAccountDetails(d) {
        ['branchId', 'branchName', 'accountId', 'accountName', 'clientId', 'clientName', 'productId', 'productName', 'address1', 'address2', 'city', 'country', 'phoneHome', 'phoneWork', 'faxNo', 'mobile']
            .forEach(id => {
                const key = id.charAt(0).toUpperCase() + id.slice(1);
                setVal(id, d[key] || d[id]);
            });
        el('currencyId').textContent = d.CurrencyID || '-';
    }

    function populateForm(d) {
        setVal('issueDate', AppCore.formatDate(d.DateIssued || d.dateIssued || d.IssueDate));
        setVal('bookType', d.BookType || d.bookType || '');
        setVal('noOfLeaves', d.NoOfLeaves || d.noOfLeaves || '');
        setVal('chequePrefix', d.ChequePrefix || d.chequePrefix || '');
        setVal('chequeStart', d.ChequeStart || d.chequeStart || '');
        setVal('chequeEnd', d.ChequeEnd || d.chequeEnd || '');
        el('MakerID').textContent = d.MakerID || d.CreatedBy || '-';
        el('MakerDT').textContent = AppCore.formatDate(d.MakerDT || d.CreatedOn);
        el('approvedBy').textContent = d.ApprovedBy || '-';
        el('approvedOn').textContent = AppCore.formatDate(d.ApprovedOn);
        el('dispatchedBy').textContent = d.DispatchedBy || '-';
        el('dispatchedOn').textContent = AppCore.formatDate(d.DispatchedOn);
    }

    function clearForm() {
        ['issueDate', 'bookType', 'noOfLeaves', 'chequePrefix', 'chequeStart', 'chequeEnd'].forEach(id => setVal(id, ''));
        ['MakerID', 'MakerDT', 'approvedBy', 'approvedOn', 'dispatchedBy', 'dispatchedOn'].forEach(id => {
            if (el(id)) el(id).textContent = '-';
        });
        setVal('issueDate', AppCore.formatDate(getContext().WorkingDate));
    }

    async function handleSave() {
        if (!val('bookType') || !val('chequeStart')) { showMsg('Missing required fields', 'warning'); return false; }
        const ctx = getContext();
        try {
            const res = await AppCore.invokeControllerAsync(`AccountsMaintenance/api/${API.ADD}`, {
                OurBranchID: ctx.OurBranchID, AccountID: ctx.AccountID, AccountTypeID: 'C', BookType: val('bookType'), NoOfLeaves: parseInt(val('noOfLeaves')), ChequeStart: parseInt(val('chequeStart')), IssueDate: ctx.WorkingDate, OperatorID: ctx.OperatorID
            });
            if (res && res.success) { showMsg('Request saved', 'success'); loadData(); return true; }
            showMsg(res.message || 'Save failed', 'error'); return false;
        } catch (err) { return false; }
    }

    function init() {
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
        loadData();
    }

    return {
        init, navigate: loadData, save: handleSave, edit: () => setMode('EDIT'), cancel: () => { loadData(); setMode('VIEW'); }, add: () => setMode('ADD'),
        view: loadData,
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
            document.querySelectorAll('#chequeBookGrid tr').forEach(r => r.classList.remove('table-primary')); row.classList.add('table-primary');
            populateForm(state.selectedBook); setMode('VIEW');
        },
        selectRequest: (idx, row) => {
            state.selectedRequest = state.chequeRequests[idx]; state.selectedBook = null;
            document.querySelectorAll('#chequeRequestGrid tr').forEach(r => r.classList.remove('table-primary')); row.classList.add('table-primary');
            populateForm(state.selectedRequest); setMode('VIEW');
            const needsAppr = !state.selectedRequest.ApprovedBy;
            const needsDisp = !needsAppr && !state.selectedRequest.DispatchedBy;
            if (window.AppCore && window.AppCore.toggleSubmoduleButton) {
                window.AppCore.toggleSubmoduleButton('Approve', needsAppr); window.AppCore.toggleSubmoduleButton('Dispatch', needsDisp);
            }
        }
    };
})();
