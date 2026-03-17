/**
 * Account Closing Module
 * Thoroughly refactored to match legacy behavior including transaction pairing,
 * unposted balance tracking, and XML generation.
 */
window.AccountClosingModule = (function () {
    'use strict';

    const moduleScript = document.currentScript;

    const state = {
        root: moduleScript?.closest('.form-content') || null,
        currentMode: 'VIEW',
        closingDetails: null,
        transactions: [], // Array of transaction objects
        selectedTxnIndex: -1,
        updateCount: 0,
        originalNetPayable: 0,
        unpostedAmount: 0
    };

    const API = {
        GET_CLOSING: 'AccountsMaintenance/api/get-account-closing',
        CLOSE: 'AccountsMaintenance/api/close-account',
        GET_ACCOUNT: 'AccountsMaintenance/get-account'
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
    function getRoot() {
        return state.root || moduleScript?.closest('.form-content') || document;
    }

    const el = (id) => getRoot().querySelector(`[id="${id}"]`);
    const val = (id) => el(id)?.value?.trim() || '';
    const setVal = (id, v) => { const e = el(id); if (e) e.value = (v == null) ? '' : v; };
    const setTxt = (id, v) => {
        const e = el(id);
        if (!e) return;
        const nextValue = (v == null || v === '') ? '-' : v;
        if ('value' in e) e.value = nextValue;
        else e.textContent = nextValue;
    };

    function showMsg(msg, type) {
        const t = window.showSystemToast || window.parent?.showSystemToast;
        if (t) t(msg, { variant: type === 'error' ? 'danger' : type });
        console.log(`[AccountClosing] ${type}: ${msg}`);
    }

    function fmtAmt(n) {
        const num = parseFloat(String(n).replace(/,/g, '')) || 0;
        return num.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function getValue(source) {
        return source === null || source === undefined ? '' : String(source).trim();
    }

    function formatAuditDate(value) {
        if (!value) {
            return '';
        }

        const date = new Date(value);
        if (Number.isNaN(date.getTime())) {
            return getValue(value);
        }

        return date.toLocaleString();
    }

    function pickField(source, keys) {
        if (!source || typeof source !== 'object') {
            return undefined;
        }

        const names = Object.keys(source);
        for (let index = 0; index < keys.length; index += 1) {
            const key = keys[index];
            const match = names.find((name) => name.toLowerCase() === key.toLowerCase());
            if (match) {
                return source[match];
            }
        }

        return undefined;
    }

    function pickObject(source, keys) {
        const value = pickField(source, keys);
        return value && typeof value === 'object' && !Array.isArray(value) ? value : null;
    }

    function pickArray(source, keys) {
        const value = pickField(source, keys);
        return Array.isArray(value) ? value : null;
    }

    function getResponseCode(source) {
        const direct = pickField(source, ['ResponseCode', 'responseCode', 'Status', 'status']);
        if (getValue(direct)) {
            return getValue(direct);
        }

        const nested = pickField(source, ['data', 'Data']);
        return nested && typeof nested === 'object' ? getResponseCode(nested) : '';
    }

    function getResponseMessage(source, fallback) {
        const direct = pickField(source, ['ResponseMessage', 'responseMessage', 'Message', 'message', 'ErrorMessage', 'errorMessage']);
        if (getValue(direct)) {
            return getValue(direct);
        }

        const nested = pickField(source, ['data', 'Data']);
        return nested && typeof nested === 'object' ? getResponseMessage(nested, fallback) : fallback;
    }

    function isSuccessResponse(source) {
        const code = getResponseCode(source);
        if (code) {
            return code === '00' || code === '0' || code === '000' || code.toLowerCase() === 'success' || code.toLowerCase() === 'ok';
        }

        return !!(source?.success || source?.Success);
    }

    function collectDetailSets(source) {
        const sets = [];
        const visited = new Set();
        const keys = ['Details', 'Details01', 'Details1', 'Details02', 'details', 'details01', 'details1', 'details02'];

        function addSet(value) {
            if (!Array.isArray(value) || visited.has(value)) {
                return;
            }

            visited.add(value);
            sets.push(value);
        }

        function inspect(value) {
            if (!value || typeof value !== 'object') {
                return;
            }

            keys.forEach((key) => {
                const child = value[key];
                if (Array.isArray(child)) {
                    addSet(child);
                }
            });
        }

        inspect(source);
        inspect(source?.data);
        inspect(source?.Data);

        return sets;
    }

    function isSummaryRow(row) {
        return !!pickField(row, ['Balance', 'ClearBalance', 'InterestPayable', 'CreditInterestPayable', 'InterestReceivable', 'DebitInterestReceivable', 'PenaltyReceivable', 'PenalInterestReceivable', 'ClosingCharge', 'ClosingCharges', 'CHRG_AMT', 'CurrencyID', 'TaxAmount', 'CHRG_TAX_AMT']);
    }

    function extractClosingSummary(source) {
        const detailObject = pickObject(source, ['Details', 'details'])
            || pickObject(source?.data, ['Details', 'details'])
            || pickObject(source?.Data, ['Details', 'details']);

        if (detailObject && isSummaryRow(detailObject)) {
            return detailObject;
        }

        if (source && typeof source === 'object' && !Array.isArray(source) && isSummaryRow(source)) {
            return source;
        }

        const detailSets = collectDetailSets(source);
        for (let setIndex = 0; setIndex < detailSets.length; setIndex += 1) {
            const detailSet = detailSets[setIndex];
            for (let rowIndex = 0; rowIndex < detailSet.length; rowIndex += 1) {
                const row = detailSet[rowIndex];
                if (row && typeof row === 'object' && isSummaryRow(row)) {
                    return row;
                }
            }
        }

        return null;
    }

    function escXml(s) {
        return !s ? '' : String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
    }

    function clearBehindScene() {
        ['MakerID', 'MakerDT', 'CheckerID', 'CheckerDT', 'ModifierID', 'ModifierDT'].forEach((id) => setTxt(id, ''));
    }

    function hasBehindSceneData(source) {
        return !!getValue(pickField(source, [
            'MakerID',
            'CreatedBy',
            'MakerDT',
            'CreatedOn',
            'CheckerID',
            'SupervisedBy',
            'SupervisorID',
            'CheckerDT',
            'SupervisedOn',
            'SupervisorDT',
            'ModifierID',
            'ModifiedBy',
            'ModifierDT',
            'ModifiedOn'
        ]));
    }

    function populateBehindScene(source) {
        if (!source) {
            clearBehindScene();
            return;
        }

        setTxt('MakerID', pickField(source, ['MakerID', 'CreatedBy']));
        setTxt('MakerDT', formatAuditDate(pickField(source, ['MakerDT', 'CreatedOn'])));
        setTxt('CheckerID', pickField(source, ['CheckerID', 'SupervisedBy', 'SupervisorID']));
        setTxt('CheckerDT', formatAuditDate(pickField(source, ['CheckerDT', 'SupervisedOn', 'SupervisorDT'])));
        setTxt('ModifierID', pickField(source, ['ModifierID', 'ModifiedBy']));
        setTxt('ModifierDT', formatAuditDate(pickField(source, ['ModifierDT', 'ModifiedOn'])));
    }

    function unwrapAccountDetails(result) {
        const data = result?.data || result;
        let account = pickObject(data, ['Details']) || data;

        if (account?.AccountDetails) {
            account = {
                ...account,
                ...account.AccountDetails,
                ...(account.FinancialSummary || {}),
                ...(account.Supervision || {})
            };
        }

        return account && typeof account === 'object' ? account : null;
    }

    async function loadBehindSceneFromAccount(ctx) {
        if (!ctx?.AccountID) {
            clearBehindScene();
            return false;
        }

        try {
            const response = await fetch(`/${API.GET_ACCOUNT}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Requested-With': 'XMLHttpRequest'
                },
                body: JSON.stringify({
                    AccountID: ctx.AccountID,
                    OurBranchID: ctx.OurBranchID || ''
                })
            });

            if (!response.ok) {
                throw new Error(`Server returned error ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();
            const data = result?.data || result;
            const success = result?.success || (data && (data.ResponseCode === '000' || data.ResponseCode === '00'));
            const account = success ? unwrapAccountDetails(result) : null;

            if (account && hasBehindSceneData(account)) {
                populateBehindScene(account);
                return true;
            }
        } catch (error) {
            console.warn('[AccountClosing] Failed to load account audit fallback', error);
        }

        clearBehindScene();
        return false;
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
        getRoot().querySelectorAll('.btn-lookup').forEach(btn => btn.disabled = !editing);

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
        setVal('forexGainLoss', fmtAmt(0));
    }

    function updateBalanceAndUnpostedFields() {
        setVal('balanceAmount', fmtAmt(state.originalNetPayable));
        setVal('unpostedAmount', fmtAmt(state.unpostedAmount));
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
        updateBalanceAndUnpostedFields();
    }

    // ── Data Operations ────────────────────────────────────────
    async function loadData() {
        const ctx = getContext();
        if (!ctx.AccountID) {
            clearBehindScene();
            showMsg('Please select an account first', 'warning');
            return;
        }

        const loader = el('loadingOverlay');
        if (loader) loader.hidden = false;

        try {
            const result = await AppCore.invokeControllerAsync(API.GET_CLOSING, {
                OurBranchID: ctx.OurBranchID,
                AccountID: ctx.AccountID,
                OperatorID: ctx.OperatorID
            });

            if (isSuccessResponse(result)) {
                const details = extractClosingSummary(result?.data || result);
                state.closingDetails = details;
                state.updateCount = pickField(details || {}, ['UpdateCount']) || 0;

                if (details) {
                    populateForm(details);
                }

                if (!hasBehindSceneData(details)) {
                    await loadBehindSceneFromAccount(ctx);
                }

                const responseMessage = getResponseMessage(result, '');
                showMsg(
                    details
                        ? 'Closing details loaded successfully.'
                        : (responseMessage || 'No closing details found.'),
                    'success'
                );
            } else {
                clearBehindScene();
                showMsg(getResponseMessage(result, 'Failed to load closing details'), 'error');
            }
        } catch (err) {
            clearBehindScene();
            showMsg(getResponseMessage(err?.response || err, 'Error loading closing details: ' + err.message), 'error');
        } finally {
            if (loader) loader.hidden = true;
        }
    }

    function populateForm(d) {
        if (!d) return;
        setVal('reason', pickField(d, ['CloseReasonID', 'ReasonID', 'ReasonCode']) || '');
        setVal('remarks', pickField(d, ['Remarks', 'CloseReason']) || '');
        setVal('balance', fmtAmt(pickField(d, ['Balance', 'ClearBalance']) || 0));
        setVal('penalInterestReceivable', fmtAmt(pickField(d, ['PenaltyReceivable', 'PenalInterestReceivable']) || 0));
        setVal('creditInterestPayable', fmtAmt(pickField(d, ['InterestPayable', 'CreditInterestPayable']) || 0));
        setVal('taxAmount', fmtAmt(pickField(d, ['TaxAmount', 'CHRG_TAX_AMT']) || 0));
        setVal('debitInterestReceivable', fmtAmt(pickField(d, ['InterestReceivable', 'DebitInterestReceivable']) || 0));
        setVal('closingCharges', fmtAmt(pickField(d, ['ClosingCharge', 'ClosingCharges', 'CHRG_AMT']) || 0));
        computeNetPayable();
        updateBalanceAndUnpostedFields();

        setVal('productId', pickField(d, ['ProductID']) || '');
        setVal('currencyId', pickField(d, ['CurrencyID', 'CHRG_CURR']) || '');

        populateBehindScene(d);
    }

    // ── Transaction Management ─────────────────────────────────
    function renderTransactionsGrid() {
        const tbody = el('transactionGridBody');
        if (!tbody) return;

        if (state.transactions.length === 0) {
            tbody.innerHTML = '<tr><td colspan="16" class="text-center text-muted">No records to display.</td></tr>';
            updateUnpostedBalance();
            return;
        }

        tbody.innerHTML = state.transactions.map((t, i) => `
            <tr onclick="AccountClosingModule.selectTxn(${i})" class="${state.selectedTxnIndex === i ? 'table-primary' : ''}" style="cursor:pointer">
                <td>${t.AccountTypeID || ''}</td>
                <td>${t.AccountID || ''}</td>
                <td>${t.TillID || ''}</td>
                <td>${t.TrxType || ''}</td>
                <td>${t.ProductID || ''}</td>
                <td>${t.CurrencyID || ''}</td>
                <td class="text-end">${t.TrxType === 'TC' ? fmtAmt(t.Amount) : fmtAmt(0)}</td>
                <td class="text-end">${t.TrxType === 'TD' ? fmtAmt(t.Amount) : fmtAmt(0)}</td>
                <td class="text-end">${fmtAmt(t.Amount)}</td>
                <td class="text-end">${fmtAmt(t.LocalAmount)}</td>
                <td class="text-end">${fmtAmt(t.ExchangeRate)}</td>
                <td>${t.ReferenceNo || ''}</td>
                <td>${t.BeneficiaryName || ''}</td>
                <td>${t.TrxDescription || ''}</td>
                <td class="text-end">${fmtAmt(t.Profit || 0)}</td>
                <td>${t.Narration || ''}</td>
            </tr>
        `).join('');

        updateUnpostedBalance();
    }

    function loadSelectedTransaction() {
        if (state.selectedTxnIndex < 0 || state.selectedTxnIndex >= state.transactions.length) {
            showMsg('Please select a transaction row', 'warning');
            return;
        }

        const selected = state.transactions[state.selectedTxnIndex];
        if (!selected) {
            return;
        }

        setVal('transactionType', selected.TrxType === 'TC' ? 'C' : 'D');
        setVal('till', selected.TillID || '');
        setVal('typeOfService', selected.TypeOfServiceID || '');
        setVal('accountType', selected.AccountTypeID || '');
        setVal('txnAccountId', selected.AccountID || '');
        setVal('productId', selected.ProductID || '');
        setVal('currencyId', selected.CurrencyID || '');
        setVal('chequeId', selected.ChequeID || '');
        setVal('payableAt', selected.PayableAtBranchID || '');
        setVal('beneficiaryName', selected.BeneficiaryName || '');
        setVal('referenceNo', selected.ReferenceNo || '');
        setVal('transactionId', selected.TrxDescriptionID || '');
        setVal('transactionIdName', selected.TrxDescription || '');
        setVal('narration', selected.Narration || '');
        setVal('transactionAmount', fmtAmt(selected.Amount || 0));
        setVal('exchangeRate', selected.ExchangeRate || '1');
        computeLocalAmount();
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
        ['transactionType', 'till', 'typeOfService', 'accountType', 'txnAccountId', 'txnAccountName', 'productId', 'currencyId', 'chequeId', 'payableAt', 'payableAtName', 'beneficiaryName', 'referenceNo', 'transactionId', 'transactionIdName', 'narration', 'transactionAmount', 'forexGainLoss'].forEach(id => setVal(id, ''));
        setVal('exchangeRate', '1');
        setVal('localAmount', '0.00');
        updateBalanceAndUnpostedFields();
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
            const result = await AppCore.invokeControllerAsync(API.CLOSE, payload);
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
            const result = await AppCore.invokeControllerAsync('AccountsMaintenance/api/search-accounts', {
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
        getRoot().querySelectorAll('#closingTabs button').forEach(btn => {
            btn.addEventListener('click', function () {
                const target = this.getAttribute('data-bs-target');
                getRoot().querySelectorAll('.tab-pane').forEach(p => p.classList.remove('show', 'active'));
                getRoot().querySelector(target)?.classList.add('show', 'active');
                getRoot().querySelectorAll('#closingTabs button').forEach(b => b.classList.remove('active'));
                this.classList.add('active');
            });
        });

        // Section toggles
        getRoot().querySelectorAll('[data-section-toggle]').forEach(hdr => {
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
        getRoot().querySelectorAll('.btn-lookup').forEach(btn => {
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
        getRoot().querySelector('[data-action="txnNew"]')?.addEventListener('click', () => {
            state.selectedTxnIndex = -1;
            clearTxnForm();
        });
        getRoot().querySelector('[data-action="txnAlter"]')?.addEventListener('click', loadSelectedTransaction);
        getRoot().querySelector('[data-action="txnUpdate"]')?.addEventListener('click', addTransactionPair);
        getRoot().querySelector('[data-action="txnRemove"]')?.addEventListener('click', async () => {
            if (state.selectedTxnIndex < 0) { showMsg('Please select a transaction row', 'warning'); return; }
            const ok = await AppCore.showConfirmation('Remove Transaction', 'Are you sure you want to remove this transaction pair?');
            if (!ok) return;

            const idx = state.selectedTxnIndex;
            state.transactions.splice(idx, 1);
            state.selectedTxnIndex = -1;
            renderTransactionsGrid();
        });
        getRoot().querySelector('[data-action="txnClear"]')?.addEventListener('click', clearTxnForm);

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
