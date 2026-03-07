/**
 * Account Closing Module
 * Thoroughly refactored to match legacy behavior including transaction pairing,
 * unposted balance tracking, and XML generation.
 */
window.AccountClosingModule = (function () {
    'use strict';

    const state = {
        currentMode: 'VIEW',
        closingDetails: null,
        components: [],
        transactions: [], // Array of transaction objects
        selectedTxnIndex: -1,
        updateCount: 0,
        originalNetPayable: 0,
        unpostedAmount: 0
    };

    const API = {
        GET_CLOSING: 'api/get-account-closing',
        CLOSE: 'api/close-account'
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
            ProductID: ps?.ProductID || sessionStorage.getItem('currentProductID') || '',
            CurrencyID: ps?.CurrencyID || sessionStorage.getItem('currentCurrencyID') || ''
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
        console.log(`[AccountClosing] ${type}: ${msg}`);
    }

    function fmtAmt(n) {
        const num = parseFloat(String(n).replace(/,/g, '')) || 0;
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function escXml(s) {
        return !s ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    // ── Mode Management ────────────────────────────────────────
    function setMode(mode) {
        state.currentMode = mode;
        const editing = mode === 'ADD' || mode === 'EDIT';

        const closeFields = ['reason', 'remarks', 'penalInterestReceivable', 'creditInterestPayable', 'taxAmount', 'debitInterestReceivable', 'closingCharges'];
        const txnFields = ['transactionType', 'till', 'typeOfService', 'accountType', 'txnAccountId', 'chequeId', 'payableAt', 'beneficiaryName', 'referenceNo', 'transactionId', 'narration', 'transactionAmount', 'exchangeRate'];

        [...closeFields, ...txnFields].forEach(id => {
            const e = el(id);
            if (e) e.disabled = !editing;
        });

        // Loop lookups
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

    // ── Financial Logic ────────────────────────────────────────
    function computeNetPayable() {
        const balance = parseFloat(val('balance').replace(/,/g, '')) || 0;
        const penal = parseFloat(val('penalInterestReceivable').replace(/,/g, '')) || 0;
        const credit = parseFloat(val('creditInterestPayable').replace(/,/g, '')) || 0;
        const tax = parseFloat(val('taxAmount').replace(/,/g, '')) || 0;
        const debit = parseFloat(val('debitInterestReceivable').replace(/,/g, '')) || 0;
        const charges = parseFloat(val('closingCharges').replace(/,/g, '')) || 0;

        const net = balance + credit - penal - tax - debit - charges;
        state.originalNetPayable = net;
        setVal('netPayable', fmtAmt(net));
        updateUnpostedBalance();
    }

    function computeLocalAmount() {
        const txnAmt = parseFloat(val('transactionAmount').replace(/,/g, '')) || 0;
        const rate = parseFloat(val('exchangeRate')) || 1;
        setVal('localAmount', fmtAmt(txnAmt * rate));
    }

    function updateUnpostedBalance() {
        // Unposted = NetPayable - Sum of TD transactions (or TC transactions since they are pairs)
        // In legacy, each pair corresponds to a part of the net payable.
        let totalPosted = 0;
        state.transactions.forEach(t => {
            if (t.TrxType === 'TD') { // Use the Debit part of the pair as the 'posted' amount
                totalPosted += parseFloat(t.Amount) || 0;
            }
        });
        state.unpostedAmount = state.originalNetPayable - totalPosted;
        setVal('unpostedAmount', fmtAmt(state.unpostedAmount));
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
            const result = await AppCore.invokeControllerAsync('AccountsMaintenance/' + API.GET_CLOSING, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                OperatorID: ctx.OperatorID
            });

            if (result && result.success) {
                const d = result.Details || result.data?.Details || result.data;
                const details = d?.Details01?.[0] || (Array.isArray(d) ? d[0] : d);
                state.closingDetails = details;
                state.updateCount = details?.UpdateCount || 0;

                populateForm(details);

                state.components = d?.Details02 || [];
                renderComponentsGrid();

                showMsg('Closing details loaded', 'success');
            } else {
                showMsg(result?.message || 'Failed to load closing details', 'error');
            }
        } catch (err) {
            showMsg('Error loading closing details: ' + err.message, 'error');
        } finally {
            if (loader) loader.hidden = true;
        }
    }

    function populateForm(d) {
        if (!d) return;
        setVal('reason', d.ReasonID || d.ReasonCode || '');
        setVal('remarks', d.Remarks || '');
        setVal('balance', fmtAmt(d.Balance || 0));
        setVal('penalInterestReceivable', d.PenalInterestReceivable || '0.00');
        setVal('creditInterestPayable', d.CreditInterestPayable || '0.00');
        setVal('taxAmount', d.TaxAmount || '0.00');
        setVal('debitInterestReceivable', d.DebitInterestReceivable || '0.00');
        setVal('closingCharges', d.ClosingCharges || '0.00');
        computeNetPayable();

        setVal('productId', d.ProductID || '');
        setVal('currencyId', d.CurrencyID || '');

        // Audit
        setTxt('MakerID', d.MakerID || d.CreatedBy);
        setTxt('MakerDT', d.MakerDT || d.CreatedOn);
        setTxt('CheckerID', d.CheckerID || d.SupervisedBy);
        setTxt('CheckerDT', d.CheckerDT || d.SupervisedOn);
        setTxt('ModifierID', d.ModifierID || d.ModifiedBy);
        setTxt('ModifierDT', d.ModifierDT || d.ModifiedOn);
    }

    function renderComponentsGrid() {
        const tbody = el('componentsGridBody');
        if (!tbody) return;

        if (!state.components || state.components.length === 0) {
            tbody.innerHTML = '<tr><td colspan="4" class="text-center text-muted">No components found</td></tr>';
            return;
        }

        tbody.innerHTML = state.components.map(c => `
            <tr>
                <td>${c.ComponentID || ''}</td>
                <td>${c.TrxBranchID || c.OurBranchID || ''}</td>
                <td>${c.AccountTypeID || ''}</td>
                <td>${c.AccountID || ''}</td>
            </tr>
        `).join('');
    }

    // ── Transaction Management ─────────────────────────────────
    function renderTransactionsGrid() {
        const tbody = el('transactionGridBody');
        if (!tbody) return;

        if (state.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="6" class="text-center text-muted">No transactions added</td></tr>';
            updateUnpostedBalance();
            return;
        }

        tbody.innerHTML = state.transactions.map((t, i) => `
            <tr onclick="AccountClosingModule.selectTxn(${i})" class="${state.selectedTxnIndex === i ? 'table-primary' : ''}" style="cursor:pointer">
                <td>${t.AccountTypeID || ''}</td>
                <td>${t.AccountID || ''}</td>
                <td>${t.TrxType}</td>
                <td>${t.CurrencyID || ''}</td>
                <td class="text-end">${fmtAmt(t.Amount)}</td>
                <td>${t.Narration || ''}</td>
            </tr>
        `).join('');

        updateUnpostedBalance();
    }

    /**
     * Legacy Logic: Account Closing Transactions are processed in pairs:
     * 1. A Debit (TD) from the account being closed.
     * 2. A Credit (TC) to the destination account.
     */
    function addTransactionPair() {
        const txnAmt = parseFloat(val('transactionAmount').replace(/,/g, '')) || 0;
        if (txnAmt <= 0) { showMsg('Transaction amount must be greater than zero', 'warning'); return; }
        if (!val('txnAccountId')) { showMsg('Target Account is required', 'warning'); return; }
        if (!val('transactionId')) { showMsg('Transaction Description is required', 'warning'); return; }

        const ctx = getContext();
        const baseTxn = {
            TillID: val('till'),
            TypeOfServiceID: val('typeOfService'),
            ChequeID: val('chequeId'),
            PayableAtBranchID: val('payableAt'),
            BeneficiaryName: val('beneficiaryName'),
            ReferenceNo: val('referenceNo'),
            TrxDescriptionID: val('transactionId'),
            TrxDescription: val('transactionIdName'),
            Narration: val('narration'),
            ExchangeRate: val('exchangeRate') || '1',
            Amount: txnAmt,
            LocalAmount: (txnAmt * (parseFloat(val('exchangeRate')) || 1)).toFixed(2)
        };

        // 1. Debit (TD) for Main Account
        const tdPart = {
            ...baseTxn,
            AccountTypeID: 'C', // Main is always Customer
            AccountID: ctx.AccountID,
            TrxType: 'TD',
            ProductID: ctx.ProductID,
            CurrencyID: ctx.CurrencyID,
            EntryType: 'S', // Source
            DbtTrxAmt: txnAmt
        };

        // 2. Credit (TC) for Target Account
        const tcPart = {
            ...baseTxn,
            AccountTypeID: val('accountType'),
            AccountID: val('txnAccountId'),
            TrxType: 'TC',
            ProductID: val('productId'),
            CurrencyID: val('currencyId'),
            EntryType: 'U', // Update
            DbtTrxAmt: 0
        };

        state.transactions.push(tdPart);
        state.transactions.push(tcPart);

        clearTxnForm();
        renderTransactionsGrid();
        showMsg('Transaction pair added (TD + TC)', 'success');
    }

    function clearTxnForm() {
        ['transactionType', 'till', 'typeOfService', 'accountType', 'txnAccountId', 'txnAccountName', 'productId', 'currencyId', 'chequeId', 'payableAt', 'payableAtName', 'beneficiaryName', 'referenceNo', 'transactionId', 'transactionIdName', 'narration', 'transactionAmount'].forEach(id => setVal(id, ''));
        setVal('exchangeRate', '1');
        setVal('localAmount', '0.00');
    }

    function buildTxnXml() {
        if (state.transactions.length === 0) return '';
        let xml = '';
        state.transactions.forEach(t => {
            xml += '<dt_TransactionBackOffice>';
            xml += `<AccountTypeID>${escXml(t.AccountTypeID)}</AccountTypeID>`;
            xml += `<AccountID>${escXml(t.AccountID)}</AccountID>`;
            xml += `<TrxTypeID>${escXml(t.TrxType)}</TrxTypeID>`;
            xml += `<Amount>${t.Amount}</Amount>`;
            xml += `<LocalAmount>${t.LocalAmount}</LocalAmount>`;
            xml += `<ExchangeRate>${t.ExchangeRate}</ExchangeRate>`;
            xml += `<TrxDescriptionID>${escXml(t.TrxDescriptionID)}</TrxDescriptionID>`;
            xml += `<TrxDescription>${escXml(t.TrxDescription || t.Narration)}</TrxDescription>`;
            xml += `<EntryType>${escXml(t.EntryType)}</EntryType>`;
            xml += `<DbtTrxAmt>${t.DbtTrxAmt}</DbtTrxAmt>`;
            xml += '</dt_TransactionBackOffice>';
        });
        return xml;
    }

    // ── Save Operation ─────────────────────────────────────────
    async function handleSave() {
        if (!val('reason')) { showMsg('Close reason is required', 'warning'); return false; }

        // Validation: Unposted amount must be zero (or very close to it)
        if (Math.abs(state.unpostedAmount) > 0.01) {
            showMsg(`Unposted amount must be zero. Current balance: ${fmtAmt(state.unpostedAmount)}`, 'warning');
            return false;
        }

        const ok = await AppCore.showConfirmation('Close Account', 'Are you sure you want to close this account? This cannot be undone.');
        if (!ok) return false;

        const ctx = getContext();
        const payload = {
            OurBranchID: ctx.OurBranchID,
            AccountID: ctx.AccountID,
            CloseReasonID: val('reason'),
            CloseReason: el('reason')?.selectedOptions?.[0]?.text || '',
            ClosedBy: ctx.OperatorID,
            OperatorID: ctx.OperatorID,
            UpdateCount: state.updateCount,
            Remarks: val('remarks'),
            SysTrx: '',
            UserTrx: buildTxnXml()
        };

        try {
            const result = await AppCore.invokeControllerAsync('AccountsMaintenance/' + API.CLOSE, payload);
            if (result && result.success) {
                showMsg(result.message || 'Account closed successfully', 'success');
                loadData();
                setMode('VIEW');
                state.transactions = [];
                renderTransactionsGrid();
                return true;
            } else {
                showMsg(result?.message || 'Failed to close account', 'error');
                return false;
            }
        } catch (err) {
            showMsg('Save error: ' + err.message, 'error');
            return false;
        }
    }

    // ── Lookups & Type-and-Tab ────────────────────────────────
    async function lookupAccount(accountId) {
        if (!accountId) return;
        try {
            const result = await AppCore.invokeControllerAsync('AccountsMaintenance', 'search-accounts', {
                SearchTerm: accountId,
                AccountTypeID: val('accountType') || 'C'
            });
            const r = result?.Details?.[0] || result.data?.[0];
            if (r) {
                setVal('txnAccountName', r.AccountName || r.Description);
                setVal('productId', r.ProductID || '');
                setVal('currencyId', r.CurrencyID || '');
            } else {
                showMsg('Account not found', 'warning');
            }
        } catch (e) { console.error('Lookup failed', e); }
    }

    // ── Init & Wire ───────────────────────────────────────────
    function init() {
        console.log('[AccountClosing] Initializing (Thorough Migration)');
        setMode('VIEW');

        // Watchers
        ['penalInterestReceivable', 'creditInterestPayable', 'taxAmount', 'debitInterestReceivable', 'closingCharges'].forEach(id => {
            el(id)?.addEventListener('input', computeNetPayable);
        });
        ['transactionAmount', 'exchangeRate'].forEach(id => {
            el(id)?.addEventListener('input', computeLocalAmount);
        });

        // Type-and-Tab Lookups
        el('txnAccountId')?.addEventListener('blur', (e) => lookupAccount(e.target.value));

        // Tab wiring
        document.querySelectorAll('#closingTabs button').forEach(btn => {
            btn.addEventListener('click', function () {
                const target = this.getAttribute('data-bs-target');
                document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('show', 'active'));
                document.querySelector(target)?.classList.add('show', 'active');
                document.querySelectorAll('#closingTabs button').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });

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
                        tableID: type === 'Account' ? (val('accountType') === 'G' ? 'GL' : 'Account') : (type === 'Branch' ? 'Branch' : 'Transaction'),
                        onSelect: (r) => {
                            if (type === 'Account') {
                                setVal('txnAccountId', r.AccountID || r.ID);
                                setVal('txnAccountName', r.AccountName || r.Description);
                                setVal('productId', r.ProductID || '');
                                setVal('currencyId', r.CurrencyID || '');
                            }
                            if (type === 'Branch') { setVal('payableAt', r.BranchID || r.ID); setVal('payableAtName', r.BranchName || r.Description); }
                            if (type === 'Transaction') { setVal('transactionId', r.TransactionID || r.ID); setVal('transactionIdName', r.TransactionName || r.Description); }
                        }
                    });
                }
            });
        });

        // Txn Buttons
        document.querySelector('[data-action="txnNew"]')?.addEventListener('click', () => {
            state.selectedTxnIndex = -1;
            clearTxnForm();
        });
        document.querySelector('[data-action="txnUpdate"]')?.addEventListener('click', addTransactionPair);
        document.querySelector('[data-action="txnRemove"]')?.addEventListener('click', async () => {
            if (state.selectedTxnIndex < 0) { showMsg('Please select a transaction row', 'warning'); return; }
            const ok = await AppCore.showConfirmation('Remove Transaction', 'Are you sure you want to remove this transaction pair?');
            if (!ok) return;

            const idx = state.selectedTxnIndex;
            state.transactions.splice(idx, 1);
            state.selectedTxnIndex = -1;
            renderTransactionsGrid();
        });
        document.querySelector('[data-action="txnClear"]')?.addEventListener('click', clearTxnForm);

        const ctx = getContext();
        if (ctx.AccountID) loadData();
    }

    return {
        init: init,
        save: handleSave,
        edit: () => setMode('EDIT'),
        add: () => { setMode('ADD'); clearTxnForm(); state.transactions = []; renderTransactionsGrid(); },
        cancel: async () => {
            const ok = await AppCore.showConfirmation('Cancel', 'Are you sure you want to cancel your changes?');
            if (ok) { loadData(); setMode('VIEW'); }
        },
        view: loadData,
        selectTxn: (i) => { state.selectedTxnIndex = i; renderTransactionsGrid(); }
    };
})();

console.log('[AccountClosing] Module loaded');

console.log('[AccountClosing] Module loaded');
