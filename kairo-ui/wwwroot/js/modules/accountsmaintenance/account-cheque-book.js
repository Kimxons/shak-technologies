/**
 * Account Cheque Book Module
 * DTOs: GetChequeBooksRequest(AccountID, AccountTypeID), GetChequeBookRequestsRequest(AccountID, AccountTypeID),
 *        AddChequeBookRequest(AccountID, AccountTypeID, BookType, NoOfLeaves, ChequeStart, IssueDate) — all typed with EnsureDefaults
 *
 * Parent wires: View → setMode('VIEW'), Save → saveData(), Cancel → cancelChanges()
 */
window.AccountChequeBookModule = (function () {
    'use strict';

    const state = {
        currentMode: 'VIEW',
        chequeBooks: [],
        chequeRequests: [],
        selectedBookIndex: -1,
        selectedRequestIndex: -1,
        activeTab: 'books',
        currentUpdateCount: 0
    };

    const API = {
        GET_BOOKS:    '/AccountsMaintenance/api/get-cheque-books',
        GET_REQUESTS: '/AccountsMaintenance/api/get-cheque-book-requests',
        ADD:          '/AccountsMaintenance/api/add-cheque-book'
    };

    function getContext() {
        const ps = window.AccountMaintenanceState;
        return {
            AccountID:   ps?.AccountID   || sessionStorage.getItem('currentAccountID')   || '',
            OurBranchID: ps?.OurBranchID || sessionStorage.getItem('currentBranchID')    || '',
            OperatorID:  ps?.OperatorID  || sessionStorage.getItem('currentOperatorID')  || localStorage.getItem('OperatorID') || 'SYSTEM'
        };
    }

    // ── UI Helpers ─────────────────────────────────────────────
    function el(id)       { return document.getElementById(id); }
    function val(id)      { const e = el(id); return e ? e.value : ''; }
    function setVal(id,v) { const e = el(id); if (e) e.value = (v == null) ? '' : v; }
    function setText(id,v){ const e = el(id); if (!e) return; if (e.tagName==='INPUT'||e.tagName==='TEXTAREA'||e.tagName==='SELECT') e.value=(v==null)?'':v; else e.textContent=(v==null)?'-':v; }

    function showLoading(show) { const o = el('loadingOverlay') || document.querySelector('.de-loading-overlay'); if (o) o.hidden = !show; }
    function showMsg(msg, type) { const t = window.showSystemToast || window.parent?.showSystemToast; if (t) t(msg, { variant: type==='error'?'danger':type }); console.log(`[ChequeBook] ${type}: ${msg}`); }
    function isSuccess(r) { return r?.ResponseCode === '00' || r?.ResponseCode === 0; }

    function fmtDate(ds) { if (!ds) return ''; try { const d = (ds instanceof Date) ? ds : new Date(ds); return isNaN(d.getTime()) ? (typeof ds==='string'?ds:'') : d.toLocaleDateString(); } catch { return typeof ds==='string'?ds:''; } }
    function fmtDateTime(ds) { if (!ds) return '-'; try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch { return ds; } }
    function escHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

    const EDITABLE = ['bookType', 'chequeStart'];

    // ── Mode management ────────────────────────────────────────
    function setActionBtn(action, enabled) {
        const btn = document.querySelector(`[data-action="${action}"]`);
        if (btn) { btn.disabled = !enabled; btn.style.opacity = enabled ? '1' : '0.5'; }
    }

    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD' || mode === 'EDIT';

        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = !editing; });

        setActionBtn('view',     !editing);
        setActionBtn('add',      !editing);
        setActionBtn('edit',     !editing && state.chequeRequests.length > 0);
        setActionBtn('save',     editing);
        setActionBtn('cancel',   editing);
        setActionBtn('approve',  !editing && state.selectedRequestIndex >= 0);
        setActionBtn('dispatch', !editing && state.selectedRequestIndex >= 0);

        console.log('[ChequeBook] Mode →', mode);
    }

    // ── Wire Events ────────────────────────────────────────────
    function wireEvents() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            if (btn._wired) return;
            btn._wired = true;
            const a = btn.getAttribute('data-action');
            if (a === 'view')     btn.addEventListener('click', () => setMode('VIEW'));
            if (a === 'add')      btn.addEventListener('click', () => { setMode('ADD'); clearRequestForm(); });
            if (a === 'edit')     btn.addEventListener('click', () => setMode('EDIT'));
            if (a === 'save')     btn.addEventListener('click', saveData);
            if (a === 'cancel')   btn.addEventListener('click', cancelChanges);
            if (a === 'approve')  btn.addEventListener('click', approveRequest);
            if (a === 'dispatch') btn.addEventListener('click', dispatchRequest);
        });

        // Tabs
        document.querySelectorAll('[data-tab]').forEach(tab => {
            if (tab._wired) return;
            tab._wired = true;
            tab.addEventListener('click', () => {
                state.activeTab = tab.getAttribute('data-tab');
                document.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                document.querySelectorAll('[data-panel]').forEach(p => {
                    p.hidden = p.getAttribute('data-panel') !== state.activeTab;
                });
            });
        });

        // Section toggles
        document.querySelectorAll('[data-section-toggle]').forEach(hdr => {
            if (hdr._wired) return;
            hdr._wired = true;
            hdr.addEventListener('click', function () {
                const sec = this.closest('.form-section');
                const c = sec?.querySelector('.section-content');
                const btn = sec?.querySelector('.section-toggle-btn');
                const icon = btn?.querySelector('i');
                const exp = btn?.getAttribute('aria-expanded') === 'true';
                if (c) c.hidden = exp;
                btn?.setAttribute('aria-expanded', String(!exp));
                icon?.classList.toggle('bi-chevron-up');
                icon?.classList.toggle('bi-chevron-down');
            });
        });

        // Cheque start/bookType → compute end
        const startEl = el('chequeStart');
        if (startEl && !startEl._wired) { startEl._wired = true; startEl.addEventListener('input', computeChequeEnd); }
        const btEl = el('bookType');
        if (btEl && !btEl._wired) { btEl._wired = true; btEl.addEventListener('change', () => { updateLeavesAndPrefix(); computeChequeEnd(); }); }
    }

    function updateLeavesAndPrefix() {
        const bt = val('bookType');
        const leavesMap = { '25': 25, '50': 50, '100': 100 };
        const prefixMap = { '25': 'TBT', '50': 'TBF', '100': 'TBH' };
        setVal('noOfLeaves', leavesMap[bt] || 0);
        setVal('chequePrefix', prefixMap[bt] || '');
    }

    function computeChequeEnd() {
        const start = parseInt(val('chequeStart')) || 0;
        const leaves = parseInt(val('noOfLeaves')) || 0;
        setVal('chequeEnd', start && leaves ? start + leaves - 1 : '');
    }

    // ── Load Data ──────────────────────────────────────────────
    function loadData() {
        const ctx = getContext();
        showLoading(true);

        const basePayload = {
            AccountID:     ctx.AccountID,
            AccountTypeID: 'C',
            OurBranchID:   ctx.OurBranchID,
            OperatorID:    ctx.OperatorID
        };

        Promise.all([
            fetch(API.GET_BOOKS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(basePayload)
            }).then(r => r.json()),
            fetch(API.GET_REQUESTS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(basePayload)
            }).then(r => r.json())
        ])
        .then(([booksResult, reqsResult]) => {
            showLoading(false);

            const bd = booksResult.Details;
            const rd = reqsResult.Details;

            // Account info
            const acctInfo = bd?.Details01?.[0] || rd?.Details01?.[0] || {};
            populateAccountDetails(acctInfo);

            // Cheque books from Details02 or Details03
            state.chequeBooks = bd?.Details03 || bd?.Details02 || (Array.isArray(bd) ? bd : []);
            renderBooksGrid();

            // Cheque requests
            state.chequeRequests = rd?.Details02 || (Array.isArray(rd) ? rd : []);
            renderRequestsGrid();

            // Audit
            const audit = bd?.Details01?.[0] || {};
            populateAuditFields(audit);

            setVal('issueDate', fmtDate(new Date()));
            showMsg(booksResult.ResponseMessage || 'Data loaded', 'success');
        })
        .catch(err => {
            showLoading(false);
            showMsg('Error loading data: ' + err.message, 'error');
        });
    }

    // ── Populate ───────────────────────────────────────────────
    function populateAccountDetails(acct) {
        const ctx = getContext();
        setVal('branchId',    ctx.OurBranchID);
        setText('branchName',  acct.BranchName || acct.OurBranchName || window.AccountMaintenanceState?.BranchName || '');
        setVal('accountId',   ctx.AccountID);
        setText('accountName', acct.AccountName || window.AccountMaintenanceState?.AccountName || '');
        setText('clientId',    acct.ClientID || '');
        setText('clientName',  acct.ClientName || '');
        setText('productId',   acct.ProductID || '');
        setText('productName', acct.ProductName || '');
        setText('address1',    acct.Address1 || '');
        setText('address2',    acct.Address2 || '');
        setText('city',        acct.CityID || acct.City || '');
        setText('country',     acct.CountryID || acct.Country || '');
        setText('phoneHome',   acct.PhoneHome || acct.Phone1 || '');
        setText('phoneWork',   acct.PhoneWork || acct.Phone2 || '');
        setText('faxNo',       acct.FaxNo || '');
        setText('mobile',      acct.Mobile || '');
    }

    function populateAuditFields(data) {
        setText('currencyId',   data.CurrencyID || '-');
        setText('approvedBy',   data.ApprovedBy || '-');
        setText('approvedOn',   fmtDateTime(data.ApprovedOn));
        setText('dispatchedBy', data.DispatchedBy || '-');
        setText('dispatchedOn', fmtDateTime(data.DispatchedOn));
        setText('MakerID',     data.CreatedBy || data.MakerID || '-');
        setText('MakerDT',     fmtDateTime(data.CreatedOn || data.MakerDT));
        setText('ModifierID',  data.ModifiedBy || data.ModifierID || '-');
        setText('ModifierDT',  fmtDateTime(data.ModifiedOn || data.ModifierDT));
        setText('CheckerID',   data.SupervisedBy || data.CheckerID || '-');
        setText('CheckerDT',   fmtDateTime(data.SupervisedOn || data.CheckerDT));
    }

    // ── Grids ──────────────────────────────────────────────────
    function renderBooksGrid() {
        const tbody = el('chequeBookTableBody');
        if (!tbody) return;

        if (state.chequeBooks.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" class="text-center text-muted py-3">No cheque books found</td></tr>';
            return;
        }

        tbody.innerHTML = state.chequeBooks.map((book, idx) => `
            <tr class="grid-row ${idx === state.selectedBookIndex ? 'selected' : ''}" data-index="${idx}" style="cursor:pointer;">
                <td>${escHtml(book.ChequeStart || book.StartChequeID || '')}</td>
                <td>${escHtml(book.ChequeEnd || book.EndChequeID || '')}</td>
                <td>${escHtml(book.ChequePrefix || '')}</td>
                <td>${book.NoOfLeaves || ''}</td>
                <td>${fmtDate(book.DateIssued || book.IssueDate)}</td>
                <td>${book.PaidCount || book.Paid || '0'}</td>
                <td>${book.StoppedCount || book.Stopped || '0'}</td>
                <td>${book.ReturnedCount || book.Returned || '0'}</td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.grid-row').forEach(row => {
            row.addEventListener('click', () => {
                state.selectedBookIndex = parseInt(row.dataset.index);
                renderBooksGrid();
            });
        });
    }

    function renderRequestsGrid() {
        const tbody = el('chequeRequestTableBody');
        if (!tbody) return;

        if (state.chequeRequests.length === 0) {
            tbody.innerHTML = '<tr><td colspan="7" class="text-center text-muted py-3">No cheque requests found</td></tr>';
            return;
        }

        tbody.innerHTML = state.chequeRequests.map((req, idx) => `
            <tr class="grid-row ${idx === state.selectedRequestIndex ? 'selected' : ''}" data-index="${idx}" style="cursor:pointer;">
                <td>${req.NoOfLeaves || ''}</td>
                <td>${escHtml(req.ChequeStart || req.StartChequeID || '')}</td>
                <td>${escHtml(req.ChequeEnd || req.EndChequeID || '')}</td>
                <td>${fmtDate(req.DateIssued || req.IssueDate)}</td>
                <td>${escHtml(req.ApprovedBy || '-')}</td>
                <td>${fmtDate(req.ApprovedOn)}</td>
                <td>${escHtml(req.DispatchedBy || '-')}</td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.grid-row').forEach(row => {
            row.addEventListener('click', () => {
                state.selectedRequestIndex = parseInt(row.dataset.index);
                renderRequestsGrid();
                const req = state.chequeRequests[state.selectedRequestIndex];
                if (req) populateRequestForm(req);
            });
        });
    }

    function populateRequestForm(req) {
        setVal('bookType',     req.BookTypeID || '');
        setVal('noOfLeaves',   req.NoOfLeaves || '');
        setVal('chequePrefix', req.ChequePrefix || '');
        setVal('chequeStart',  req.ChequeStart || req.StartChequeID || '');
        setVal('chequeEnd',    req.ChequeEnd || req.EndChequeID || '');
        state.currentUpdateCount = parseInt(req.UpdateCount || 0) || 0;
    }

    // ── Save ───────────────────────────────────────────────────
    function saveData() {
        const bookType    = val('bookType');
        const chequeStart = val('chequeStart').trim();

        if (!bookType)    { showMsg('Please select a book type', 'warning'); return; }
        if (!chequeStart) { showMsg('Please enter cheque start number', 'warning'); return; }

        const ctx = getContext();
        showLoading(true);

        fetch(API.ADD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AccountID:     ctx.AccountID,
                AccountTypeID: 'C',
                BookType:      bookType,
                NoOfLeaves:    val('noOfLeaves') || '',
                ChequeStart:   chequeStart,
                IssueDate:     new Date().toISOString(),
                OurBranchID:   ctx.OurBranchID,
                OperatorID:    ctx.OperatorID
            })
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            if (isSuccess(result)) {
                showMsg(result.ResponseMessage || 'Cheque book request saved', 'success');
                state.currentMode = 'VIEW';
                loadData();
            } else {
                showMsg(result?.ResponseMessage || 'Failed to save', 'error');
            }
        })
        .catch(err => {
            showLoading(false);
            showMsg('Save error: ' + err.message, 'error');
        });
    }

    // ── Approve / Dispatch ─────────────────────────────────────
    function approveRequest() {
        if (state.selectedRequestIndex < 0) { showMsg('Select a request to approve', 'warning'); return; }
        if (!confirm('Approve this cheque book request?')) return;
        updateRequestStatus('APP');
    }

    function dispatchRequest() {
        if (state.selectedRequestIndex < 0) { showMsg('Select a request to dispatch', 'warning'); return; }
        if (!confirm('Mark as dispatched?')) return;
        updateRequestStatus('ISD');
    }

    function updateRequestStatus(statusCode) {
        const ctx = getContext();
        const req = state.chequeRequests[state.selectedRequestIndex];
        const now = new Date().toISOString();
        showLoading(true);

        fetch(API.ADD, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                AccountID:              ctx.AccountID,
                AccountTypeID:          'C',
                BookType:               req.BookTypeID || val('bookType') || '',
                NoOfLeaves:             req.NoOfLeaves || '',
                ChequeStart:            req.ChequeStart || req.StartChequeID || '',
                IssueDate:              req.DateIssued || now,
                OurBranchID:            ctx.OurBranchID,
                OperatorID:             ctx.OperatorID,
                ChequeRequestStatusID:  statusCode,
                ApprovedBy:             statusCode === 'APP' ? ctx.OperatorID : (req.ApprovedBy || ''),
                ApprovedOn:             statusCode === 'APP' ? now : (req.ApprovedOn || ''),
                DispatchedBy:           statusCode === 'ISD' ? ctx.OperatorID : (req.DispatchedBy || ''),
                DispatchedOn:           statusCode === 'ISD' ? now : (req.DispatchedOn || ''),
                UpdateCount:            req.UpdateCount || 0
            })
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            const action = statusCode === 'APP' ? 'approved' : 'dispatched';
            if (isSuccess(result)) {
                showMsg(result.ResponseMessage || `Request ${action}`, 'success');
                loadData();
            } else {
                showMsg(result?.ResponseMessage || `Failed to ${action}`, 'error');
            }
        })
        .catch(err => {
            showLoading(false);
            showMsg('Status update error: ' + err.message, 'error');
        });
    }

    // ── Cancel / Clear ─────────────────────────────────────────
    function cancelChanges() {
        if (state.selectedRequestIndex >= 0) {
            populateRequestForm(state.chequeRequests[state.selectedRequestIndex]);
        } else {
            clearRequestForm();
        }
        state.currentMode = 'VIEW';
        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = true; });
        setActionBtn('view', true);
        setActionBtn('add', true);
        setActionBtn('save', false);
        setActionBtn('cancel', false);
        setActionBtn('edit', state.chequeRequests.length > 0);
        setActionBtn('approve', state.selectedRequestIndex >= 0);
        setActionBtn('dispatch', state.selectedRequestIndex >= 0);
    }

    function clearRequestForm() {
        setVal('bookType', '');
        setVal('noOfLeaves', '');
        setVal('chequePrefix', '');
        setVal('chequeStart', '');
        setVal('chequeEnd', '');
    }

    // ── Init ───────────────────────────────────────────────────
    function init() {
        console.log('[ChequeBook] Initializing');
        wireEvents();

        EDITABLE.forEach(id => { const e = el(id); if (e) e.disabled = true; });
        setActionBtn('save', false);
        setActionBtn('cancel', false);
        setActionBtn('approve', false);
        setActionBtn('dispatch', false);

        const ctx = getContext();
        setVal('branchId', ctx.OurBranchID);
        setVal('accountId', ctx.AccountID);

        if (ctx.AccountID) {
            setTimeout(() => loadData(), 300);
        }
    }

    return { init, setMode, saveData, cancelChanges, loadData };
})();

console.log('[ChequeBook] Module registered');
