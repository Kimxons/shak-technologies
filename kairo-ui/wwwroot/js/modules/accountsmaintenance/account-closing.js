/**
 * Account Closing Module
 * Two-tab layout: Close Details (components grid + fields) + Transaction Details (txn grid + form)
 * Uses JsonElement endpoints — frontend sends OperatorID/OurBranchID
 * XML transaction building for CloseAccount payload
 *
 * Parent wires: View → setMode('VIEW'), Edit → setMode('EDIT'), Save → saveData(), Cancel → cancelChanges()
 */
window.AccountClosingModule = (function () {
    'use strict';

    const state = {
        currentMode: 'VIEW',
        closingDetails: null,
        components: [],
        transactions: [],
        selectedTxnIndex: -1,
        updateCount: 0
    };

    const API = {
        GET_CLOSING:  '/AccountsMaintenance/api/get-account-closing',
        CLOSE:        '/AccountsMaintenance/api/close-account',
        TRANSFER:     '/AccountsMaintenance/api/transfer-account'
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
    function showMsg(msg, type) { const t = window.showSystemToast || window.parent?.showSystemToast; if (t) t(msg, { variant: type==='error'?'danger':type }); console.log(`[Closing] ${type}: ${msg}`); }
    function isSuccess(r) { return r?.ResponseCode === '00' || r?.ResponseCode === 0; }

    function fmtAmt(n) { if (n === null || n === undefined || n === '') return '0.00'; return parseFloat(n).toFixed(2); }
    function fmtDateTime(ds) { if (!ds) return '-'; try { const d = new Date(ds); return isNaN(d.getTime()) ? ds : d.toLocaleString(); } catch { return ds; } }
    function escHtml(s) { if (!s) return ''; const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
    function escXml(s) { if (!s) return ''; return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&apos;'); }

    const CLOSE_FIELDS = ['reason', 'remarks'];
    const TXN_FIELDS   = ['transactionType', 'till', 'typeOfService', 'accountType', 'txnAccountId', 'chequeId', 'payableAt', 'beneficiaryName', 'referenceNo', 'transactionId', 'narration', 'transactionAmount'];

    // ── Mode management ────────────────────────────────────────
    function setActionBtn(action, enabled) {
        const btn = document.querySelector(`[data-action="${action}"]`);
        if (btn) { btn.disabled = !enabled; btn.style.opacity = enabled ? '1' : '0.5'; }
    }

    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD' || mode === 'EDIT';

        CLOSE_FIELDS.forEach(id => { const e = el(id); if (e) e.disabled = !editing; });
        TXN_FIELDS.forEach(id => { const e = el(id); if (e) e.disabled = !editing; });

        setActionBtn('view',   !editing);
        setActionBtn('add',    !editing);
        setActionBtn('edit',   !editing);
        setActionBtn('save',   editing);
        setActionBtn('cancel', editing);

        ['txnNew', 'txnAlter', 'txnRemove', 'txnUpdate', 'txnClear'].forEach(a => setActionBtn(a, editing));

        console.log('[Closing] Mode →', mode);
    }

    // ── Wire Events ────────────────────────────────────────────
    function wireEvents() {
        document.querySelectorAll('[data-action]').forEach(btn => {
            if (btn._wired) return;
            btn._wired = true;
            const a = btn.getAttribute('data-action');
            if (a === 'view')      btn.addEventListener('click', () => setMode('VIEW'));
            if (a === 'add')       btn.addEventListener('click', () => setMode('ADD'));
            if (a === 'edit')      btn.addEventListener('click', () => setMode('EDIT'));
            if (a === 'save')      btn.addEventListener('click', saveData);
            if (a === 'cancel')    btn.addEventListener('click', cancelChanges);
            if (a === 'txnNew')    btn.addEventListener('click', txnNew);
            if (a === 'txnAlter')  btn.addEventListener('click', txnAlter);
            if (a === 'txnRemove') btn.addEventListener('click', txnRemove);
            if (a === 'txnUpdate') btn.addEventListener('click', txnUpdate);
            if (a === 'txnClear')  btn.addEventListener('click', txnClear);
        });

        // Tab wiring
        document.querySelectorAll('[data-tab]').forEach(tab => {
            if (tab._wired) return;
            tab._wired = true;
            tab.addEventListener('click', () => {
                document.querySelectorAll('[data-tab]').forEach(t => t.classList.remove('active'));
                tab.classList.add('active');
                const name = tab.getAttribute('data-tab');
                document.querySelectorAll('[data-panel]').forEach(p => {
                    p.hidden = p.getAttribute('data-panel') !== name;
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

        // Amount compute watchers
        ['balance', 'penalInterestReceivable', 'creditInterestPayable', 'taxAmount', 'debitInterestReceivable', 'closingCharges'].forEach(id => {
            const e = el(id);
            if (e && !e._wired) { e._wired = true; e.addEventListener('input', computeNetPayable); }
        });
        const txnAmtEl = el('transactionAmount');
        const rateEl   = el('exchangeRate');
        if (txnAmtEl && !txnAmtEl._wired) { txnAmtEl._wired = true; txnAmtEl.addEventListener('input', computeLocalAmount); }
        if (rateEl && !rateEl._wired)      { rateEl._wired = true;   rateEl.addEventListener('input', computeLocalAmount); }
    }

    // ── Load Data ──────────────────────────────────────────────
    function loadData() {
        const ctx = getContext();
        showLoading(true);

        fetch(API.GET_CLOSING, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                OurBranchID: ctx.OurBranchID,
                AccountID:   ctx.AccountID,
                OperatorID:  ctx.OperatorID,
                InsertYN:    null
            })
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            if (isSuccess(result)) {
                const d = result.Details;

                // Closing details — try Details01[0] first, fall back to direct Details[0]
                const details = d?.Details01?.[0] || (d && !d.Details01 ? (Array.isArray(d) ? d[0] : d) : {});
                state.closingDetails = details;
                state.updateCount = parseInt(details.UpdateCount || 0) || 0;
                populateClosingFields(details);

                // Components from Details02
                state.components = d?.Details02 || [];
                renderComponentsGrid();

                // Audit
                populateAuditFields(details);

                showMsg(result.ResponseMessage || 'Closing details loaded', 'success');
            } else {
                showMsg(result?.ResponseMessage || 'Failed to load closing details', 'error');
            }
        })
        .catch(err => {
            showLoading(false);
            showMsg('Load error: ' + err.message, 'error');
        });
    }

    // ── Populate fields ────────────────────────────────────────
    function populateClosingFields(d) {
        setVal('reason',                    d.ReasonID || '');
        setVal('remarks',                   d.Remarks || '');
        setVal('balance',                   fmtAmt(d.Balance));
        setVal('penalInterestReceivable',   fmtAmt(d.PenalInterestReceivable));
        setVal('creditInterestPayable',     fmtAmt(d.CreditInterestPayable));
        setVal('taxAmount',                 fmtAmt(d.TaxAmount));
        setVal('debitInterestReceivable',   fmtAmt(d.DebitInterestReceivable));
        setVal('closingCharges',            fmtAmt(d.ClosingCharges));
        computeNetPayable();

        setVal('productId',  d.ProductID || '');
        setVal('currencyId', d.CurrencyID || '');
    }

    function computeNetPayable() {
        const balance  = parseFloat(val('balance')) || 0;
        const penal    = parseFloat(val('penalInterestReceivable')) || 0;
        const credit   = parseFloat(val('creditInterestPayable')) || 0;
        const tax      = parseFloat(val('taxAmount')) || 0;
        const debit    = parseFloat(val('debitInterestReceivable')) || 0;
        const charges  = parseFloat(val('closingCharges')) || 0;
        setVal('netPayable', fmtAmt(balance + credit - penal - tax - debit - charges));
    }

    function computeLocalAmount() {
        const txnAmt = parseFloat(val('transactionAmount')) || 0;
        const rate   = parseFloat(val('exchangeRate')) || 1;
        setVal('localAmount', fmtAmt(txnAmt * rate));
    }

    function populateAuditFields(d) {
        setText('MakerID',    d.MakerID || d.CreatedBy || '-');
        setText('MakerDT',    fmtDateTime(d.MakerDT || d.CreatedOn));
        setText('CheckerID',  d.CheckerID || d.SupervisedBy || '-');
        setText('CheckerDT',  fmtDateTime(d.CheckerDT || d.SupervisedOn));
        setText('ModifierID', d.ModifierID || d.ModifiedBy || '-');
        setText('ModifierDT', fmtDateTime(d.ModifierDT || d.ModifiedOn));
    }

    // ── Components grid ────────────────────────────────────────
    function renderComponentsGrid() {
        const tbody = el('componentsGrid')?.querySelector('tbody') || el('componentsGridBody');
        if (!tbody) return;

        if (state.components.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted py-3">No components found</td></tr>';
            return;
        }

        tbody.innerHTML = state.components.map(c => `
            <tr>
                <td>${escHtml(c.ComponentID || '')}</td>
                <td>${escHtml(c.TrxBranchID || c.BranchID || '')}</td>
                <td>${escHtml(c.AccountTypeID || '')}</td>
                <td>${escHtml(c.AccountID || '')}</td>
            </tr>
        `).join('');
    }

    // ── Transaction grid ───────────────────────────────────────
    function renderTransactionsGrid() {
        const tbody = el('transactionsGrid')?.querySelector('tbody') || el('transactionsGridBody');
        if (!tbody) return;

        if (state.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No transactions added</td></tr>';
            return;
        }

        tbody.innerHTML = state.transactions.map((txn, idx) => `
            <tr class="grid-row ${idx === state.selectedTxnIndex ? 'selected' : ''}" data-index="${idx}" style="cursor:pointer;">
                <td>${escHtml(txn.AccountTypeID || '')}</td>
                <td>${escHtml(txn.AccountID || '')}</td>
                <td>${escHtml(txn.TrxType || txn.TransactionType || '')}</td>
                <td>${escHtml(txn.CurrencyID || '')}</td>
                <td class="text-end">${fmtAmt(txn.TransactionAmount)}</td>
                <td>${escHtml(txn.Narration || '')}</td>
            </tr>
        `).join('');

        tbody.querySelectorAll('.grid-row').forEach(row => {
            row.addEventListener('click', () => {
                state.selectedTxnIndex = parseInt(row.dataset.index);
                renderTransactionsGrid();
                populateTxnForm(state.transactions[state.selectedTxnIndex]);
            });
        });

        const totalPosted = state.transactions.reduce((sum, t) => sum + (parseFloat(t.TransactionAmount) || 0), 0);
        const netPayable  = parseFloat(val('netPayable')) || 0;
        setVal('unpostedAmount', fmtAmt(netPayable - totalPosted));
        setVal('balanceAmount',  fmtAmt(netPayable - totalPosted));
    }

    function populateTxnForm(txn) {
        if (!txn) return;
        setVal('transactionType', txn.TrxType || txn.TransactionType || '');
        setVal('till',            txn.TillID || '');
        setVal('typeOfService',   txn.TypeOfServiceID || '');
        setVal('accountType',     txn.AccountTypeID || '');
        setVal('txnAccountId',    txn.AccountID || '');
        setText('txnAccountName', txn.AccountName || '');
        setVal('productId',       txn.ProductID || '');
        setVal('currencyId',      txn.CurrencyID || '');
        setVal('chequeId',        txn.ChequeID || '');
        setVal('payableAt',       txn.PayableAtBranchID || '');
        setText('payableAtName',  txn.PayableAtBranchName || '');
        setVal('beneficiaryName', txn.BeneficiaryName || '');
        setVal('referenceNo',     txn.ReferenceNo || '');
        setVal('transactionId',   txn.TransactionID || '');
        setText('transactionIdName', txn.TransactionName || '');
        setVal('narration',       txn.Narration || '');
        setVal('exchangeRate',    txn.ExchangeRate || '1');
        setVal('transactionAmount', txn.TransactionAmount || '');
        computeLocalAmount();
    }

    // ── Transaction sub-actions ────────────────────────────────
    function txnNew() {
        state.selectedTxnIndex = -1;
        clearTxnForm();
        if (state.closingDetails) {
            setVal('productId',  state.closingDetails.ProductID || '');
            setVal('currencyId', state.closingDetails.CurrencyID || '');
        }
        setVal('exchangeRate', '1');
    }

    function txnAlter() {
        if (state.selectedTxnIndex < 0) { showMsg('Select a transaction to alter', 'warning'); return; }
        populateTxnForm(state.transactions[state.selectedTxnIndex]);
    }

    function txnRemove() {
        if (state.selectedTxnIndex < 0) { showMsg('Select a transaction to remove', 'warning'); return; }
        if (!confirm('Remove this transaction?')) return;
        state.transactions.splice(state.selectedTxnIndex, 1);
        state.selectedTxnIndex = -1;
        renderTransactionsGrid();
        clearTxnForm();
    }

    function txnUpdate() {
        const txn = collectTxnFields();
        if (!txn.AccountTypeID) { showMsg('Account Type is required', 'warning'); return; }
        if (!txn.AccountID)     { showMsg('Account is required', 'warning'); return; }
        if (!txn.TransactionAmount || parseFloat(txn.TransactionAmount) === 0) { showMsg('Amount is required', 'warning'); return; }

        if (state.selectedTxnIndex >= 0) {
            state.transactions[state.selectedTxnIndex] = txn;
        } else {
            state.transactions.push(txn);
        }
        state.selectedTxnIndex = -1;
        renderTransactionsGrid();
        clearTxnForm();
        showMsg('Transaction updated', 'success');
    }

    function txnClear() {
        state.selectedTxnIndex = -1;
        clearTxnForm();
    }

    function collectTxnFields() {
        return {
            TrxType:            val('transactionType'),
            TillID:             val('till'),
            TypeOfServiceID:    val('typeOfService'),
            AccountTypeID:      val('accountType'),
            AccountID:          val('txnAccountId'),
            AccountName:        el('txnAccountName')?.textContent || '',
            ProductID:          val('productId'),
            CurrencyID:         val('currencyId'),
            ChequeID:           val('chequeId'),
            PayableAtBranchID:  val('payableAt'),
            BeneficiaryName:    val('beneficiaryName'),
            ReferenceNo:        val('referenceNo'),
            TransactionID:      val('transactionId'),
            Narration:          val('narration'),
            ExchangeRate:       val('exchangeRate') || '1',
            TransactionAmount:  val('transactionAmount') || '0',
            LocalAmount:        val('localAmount') || '0'
        };
    }

    function clearTxnForm() {
        TXN_FIELDS.forEach(id => setVal(id, ''));
        setText('txnAccountName', '');
        setText('payableAtName', '');
        setText('transactionIdName', '');
        setVal('exchangeRate', '1');
        setVal('forexGainLoss', '0.00');
        setVal('localAmount', '0.00');
    }

    // ── Build XML ──────────────────────────────────────────────
    function buildTransactionXml() {
        if (state.transactions.length === 0) return '';
        let xml = '<DocumentElement>';
        state.transactions.forEach(txn => {
            xml += '<dt_TransactionBackOffice>';
            xml += `<AccountTypeID>${escXml(txn.AccountTypeID)}</AccountTypeID>`;
            xml += `<AccountID>${escXml(txn.AccountID)}</AccountID>`;
            xml += `<TillID>${escXml(txn.TillID)}</TillID>`;
            xml += `<TrxType>${escXml(txn.TrxType)}</TrxType>`;
            xml += `<ProductID>${escXml(txn.ProductID)}</ProductID>`;
            xml += `<CurrencyID>${escXml(txn.CurrencyID)}</CurrencyID>`;
            xml += `<CreditAmount>${txn.TrxType === 'C' ? txn.TransactionAmount : '0'}</CreditAmount>`;
            xml += `<DebitAmount>${txn.TrxType === 'D' ? txn.TransactionAmount : '0'}</DebitAmount>`;
            xml += `<Narration>${escXml(txn.Narration)}</Narration>`;
            xml += `<ExchangeRate>${txn.ExchangeRate || '1'}</ExchangeRate>`;
            xml += `<TypeOfServiceID>${escXml(txn.TypeOfServiceID)}</TypeOfServiceID>`;
            xml += `<ChequeID>${escXml(txn.ChequeID)}</ChequeID>`;
            xml += `<PayableAtBranchID>${escXml(txn.PayableAtBranchID)}</PayableAtBranchID>`;
            xml += `<BeneficiaryName>${escXml(txn.BeneficiaryName)}</BeneficiaryName>`;
            xml += `<ReferenceNo>${escXml(txn.ReferenceNo)}</ReferenceNo>`;
            xml += `<TransactionID>${escXml(txn.TransactionID)}</TransactionID>`;
            xml += `<LocalAmount>${txn.LocalAmount || '0'}</LocalAmount>`;
            xml += '</dt_TransactionBackOffice>';
        });
        xml += '</DocumentElement>';
        return xml;
    }

    // ── Save (Close Account) ───────────────────────────────────
    function saveData() {
        const reason = val('reason');
        if (!reason) { showMsg('Please select a close reason', 'warning'); return; }
        if (state.transactions.length === 0) { showMsg('Please add at least one transaction', 'warning'); return; }
        if (!confirm('Are you sure you want to close this account? This action cannot be undone.')) return;

        const ctx = getContext();
        showLoading(true);

        fetch(API.CLOSE, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                OurBranchID:   ctx.OurBranchID,
                AccountID:     ctx.AccountID,
                CloseReasonID: reason,
                CloseReason:   el('reason')?.selectedOptions?.[0]?.text || '',
                ClosedBy:      ctx.OperatorID,
                OperatorID:    ctx.OperatorID,
                UpdateCount:   state.updateCount,
                Remarks:       val('remarks'),
                SysTrx:        '',
                UserTrx:       buildTransactionXml()
            })
        })
        .then(r => r.json())
        .then(result => {
            showLoading(false);
            if (isSuccess(result)) {
                showMsg(result.ResponseMessage || 'Account closed', 'success');
                state.currentMode = 'VIEW';
                loadData();
            } else {
                showMsg(result?.ResponseMessage || 'Failed to close account', 'error');
            }
        })
        .catch(err => {
            showLoading(false);
            showMsg('Close error: ' + err.message, 'error');
        });
    }

    // ── Cancel ─────────────────────────────────────────────────
    function cancelChanges() {
        state.transactions = [];
        state.selectedTxnIndex = -1;
        renderTransactionsGrid();
        clearTxnForm();
        if (state.closingDetails) populateClosingFields(state.closingDetails);
        state.currentMode = 'VIEW';
        [...CLOSE_FIELDS, ...TXN_FIELDS].forEach(id => { const e = el(id); if (e) e.disabled = true; });
        setActionBtn('view', true);
        setActionBtn('add', true);
        setActionBtn('edit', true);
        setActionBtn('save', false);
        setActionBtn('cancel', false);
        ['txnNew', 'txnAlter', 'txnRemove', 'txnUpdate', 'txnClear'].forEach(a => setActionBtn(a, false));
    }

    // ── Confirmation Dialog ─────────────────────────────────────
    async function showConfirmationDialog(title, message) {
        if (window.showConfirmationDialog) {
            return window.showConfirmationDialog(title, message, 'primary');
        }
        return window.confirm(message);
    }

    async function confirmAndLoad() {
        const ok = await showConfirmationDialog('Confirm', 'Do you want to close this account?');
        if (!ok) {
            showMsg('Account closing cancelled.', 'info');
            closeSubmodule();
            return;
        }
        await loadData();
    }

    function closeSubmodule() {
        if (window.parent && window.parent.AccountMaintenanceCore) {
            window.parent.AccountMaintenanceCore.closeSubmodule();
        } else {
            window.parent?.postMessage({ type: 'accountMaintenanceChildClose' }, '*');
        }
    }

    // ── Init ───────────────────────────────────────────────────
    function init() {
        console.log('[Closing] Initializing');
        wireEvents();

        [...CLOSE_FIELDS, ...TXN_FIELDS].forEach(id => { const e = el(id); if (e) e.disabled = true; });
        setActionBtn('save', false);
        setActionBtn('cancel', false);
        ['txnNew', 'txnAlter', 'txnRemove', 'txnUpdate', 'txnClear'].forEach(a => setActionBtn(a, false));

        const ctx = getContext();
        if (ctx.AccountID) {
            // Show confirmation popup before loading
            setTimeout(() => confirmAndLoad(), 300);
        }
    }

    return { init, setMode, saveData, cancelChanges, loadData };
})();

console.log('[Closing] Module registered');
