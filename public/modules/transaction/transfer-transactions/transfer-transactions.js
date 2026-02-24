// Transfer Transactions JavaScript - Modern Blue Edition
(function () {
    let currentMode = 'VIEW';
    let details = [];
    let selectedDetailIndex = -1;
    let lastSavedSnapshot = null;
    let hasSavedRecord = false;

    let renderScheduled = false;
    let cachedFormControls = null;
    let cachedEditableFormControls = null;
    let gridTbody = null;
    let gridClickWired = false;

    let toastContainerEl = null;

    function $(id) {
        return document.getElementById(id);
    }

    function notifyParent(action, payload) {
        if (!action) return;
        if (window.parent === window) return;
        try {
            window.parent.postMessage({
                type: 'kairo-action',
                module: 'transfer-transactions',
                action,
                payload: payload || null
            }, '*');
        } catch {
            // Ignore cross-window messaging issues.
        }
    }

    function ensureToastContainer() {
        if (toastContainerEl && document.body.contains(toastContainerEl)) return toastContainerEl;
        toastContainerEl = document.createElement('div');
        toastContainerEl.className = 'toast-container position-fixed top-0 end-0 p-3';
        toastContainerEl.style.zIndex = '1080';
        document.body.appendChild(toastContainerEl);
        return toastContainerEl;
    }

    function showToast(message, variant) {
        if (!message) return;
        const container = ensureToastContainer();
        const toastEl = document.createElement('div');
        const tone = (variant || 'danger').toLowerCase();
        toastEl.className = `toast align-items-center text-bg-${tone} border-0`;
        toastEl.setAttribute('role', 'alert');
        toastEl.setAttribute('aria-live', 'assertive');
        toastEl.setAttribute('aria-atomic', 'true');
        toastEl.innerHTML = `
            <div class="d-flex">
                <div class="toast-body"></div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        toastEl.querySelector('.toast-body').textContent = message;
        container.appendChild(toastEl);

        try {
            if (window.bootstrap?.Toast) {
                const toast = new window.bootstrap.Toast(toastEl, { delay: 3500 });
                toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove(), { once: true });
                toast.show();
            } else {
                // Fallback: if Bootstrap JS isn't available for some reason.
                setTimeout(() => toastEl.remove(), 3500);
            }
        } catch {
            setTimeout(() => toastEl.remove(), 3500);
        }
    }

    function openDatePickerById(id) {
        const input = document.getElementById(id);
        if (!input) return;
        if (input.disabled) return;
        try {
            if (typeof input.showPicker === 'function') {
                input.showPicker();
                return;
            }
        } catch {
            // ignore
        }
        input.focus();
        input.click();
    }

    function wireDatePickerButtons() {
        document.querySelectorAll('[data-open-date]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const id = btn.getAttribute('data-open-date');
                if (!id) return;
                openDatePickerById(id);
            });
        });
    }

    // Field Formatter Helpers
    function formatMoney(value) {
        if (value === null || value === undefined || value === '') return '0.00';
        let num;
        if (typeof value === 'number') num = value;
        else {
            const cleaned = String(value).replace(/,/g, '').trim();
            num = parseFloat(cleaned);
        }
        if (isNaN(num)) return '0.00';
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function parseMoneyInput(value) {
        if (value === null || value === undefined || value === '') return '';
        return String(value).replace(/,/g, '').trim();
    }

    function wireMoneyFields() {
        document.querySelectorAll('.money-field').forEach(field => {
            if (field.readOnly || field.disabled) return;
            field.addEventListener('blur', function () {
                const raw = parseMoneyInput(this.value);
                if (raw !== '') this.value = formatMoney(raw);
            });
            field.addEventListener('focus', function () {
                const raw = parseMoneyInput(this.value);
                if (raw !== '') this.value = raw;
            });
            if (field.value && !isNaN(parseFloat(parseMoneyInput(field.value)))) {
                field.value = formatMoney(parseMoneyInput(field.value));
            }
        });
    }

    function parseNumber(value) {
        const raw = parseMoneyInput(value);
        if (raw === '') return 0;
        const n = Number(raw);
        return Number.isFinite(n) ? n : 0;
    }

    function setMoneyValue(el, value) {
        if (!el) return;
        el.value = formatMoney(value);
    }

    function setSelectOptionsIfEmpty(selectEl, options) {
        if (!selectEl) return;
        const hasNonEmptyOption = Array.from(selectEl.options || []).some(o => (o.value || '').trim() !== '');
        if (hasNonEmptyOption) return;

        // Preserve the first placeholder option if it exists.
        const placeholder = selectEl.querySelector('option[value=""]');
        selectEl.innerHTML = '';
        if (placeholder) {
            selectEl.appendChild(placeholder);
        } else {
            const opt = document.createElement('option');
            opt.value = '';
            opt.textContent = '--Select--';
            selectEl.appendChild(opt);
        }

        options.forEach(({ value, label }) => {
            const opt = document.createElement('option');
            opt.value = value;
            opt.textContent = label;
            selectEl.appendChild(opt);
        });
    }

    function recalcAmounts() {
        const transferType = $('transferType')?.value;
        const amount = parseNumber($('transactionAmount')?.value);
        const rate = Math.max(0, parseNumber($('exchangeRate')?.value) || 1);

        if (transferType === 'local') {
            setMoneyValue($('localAmount'), amount);
            setMoneyValue($('foreignAmount'), 0);
            if ($('foreignAmount')) $('foreignAmount').disabled = true;
        } else {
            setMoneyValue($('foreignAmount'), amount);
            setMoneyValue($('localAmount'), amount * rate);
            if ($('foreignAmount')) $('foreignAmount').disabled = currentMode === 'VIEW';
        }
    }

    function readEntryFromForm() {
        const transactionTypeEl = $('transactionType');
        const transactionCurrencyEl = $('transactionCurrency');

        return {
            branchNo: ($('branchNo')?.value || '').trim(),
            accountType: ($('accountType')?.value || '').trim(),
            accountId: ($('accountId')?.value || '').trim(),
            accountName: ($('accountName')?.value || '').trim(),
            transactionType: (transactionTypeEl?.value || '').trim(),
            transactionTypeLabel: (transactionTypeEl?.selectedOptions?.[0]?.textContent || '').trim(),
            transactionCurrency: (transactionCurrencyEl?.value || '').trim(),
            transactionCurrencyName: ($('transactionCurrencyName')?.value || '').trim(),
            amount: parseNumber($('transactionAmount')?.value),
            exchangeRate: Math.max(0, parseNumber($('exchangeRate')?.value) || 1),
            narration: ($('narration')?.value || '').trim(),
        };
    }

    function validateEntry(entry) {
        let ok = true;
        const mark = (id, valid) => {
            const el = $(id);
            if (!el) return;
            el.style.borderColor = valid ? '' : 'var(--danger)';
        };

        const requiredChecks = [
            { id: 'branchNo', valid: !!entry.branchNo },
            { id: 'accountId', valid: !!entry.accountId },
            { id: 'transactionType', valid: !!entry.transactionType },
            { id: 'transactionCurrency', valid: !!entry.transactionCurrency },
            { id: 'transactionAmount', valid: entry.amount > 0 },
        ];

        requiredChecks.forEach(c => {
            mark(c.id, c.valid);
            if (!c.valid) ok = false;
        });

        if (!ok) {
            setStatus('Please fill in all required fields before updating the grid.', 'text-danger');
        }
        return ok;
    }

    function clearEntryFields() {
        // Keep a few defaults, clear the rest of editable header fields.
        const keep = new Set(['branchNo', 'branchName', 'accountType', 'exchangeRate', 'transferType']);
        document
            .querySelectorAll('#transferTransactionsForm input:not([readonly]), #transferTransactionsForm select, #transferTransactionsForm textarea')
            .forEach(el => {
                if (!el.id || keep.has(el.id)) return;
                if (el.type === 'checkbox') el.checked = false;
                else el.value = '';
            });
        selectedDetailIndex = -1;
        recalcAmounts();
    }

    function scheduleRenderGrid() {
        if (renderScheduled) return;
        renderScheduled = true;
        window.requestAnimationFrame(() => {
            renderScheduled = false;
            renderGrid();
        });
    }

    function setSelectedRow(index) {
        selectedDetailIndex = index;
        if (!gridTbody) return;
        gridTbody.querySelectorAll('tr.is-selected').forEach(tr => tr.classList.remove('is-selected'));
        const active = gridTbody.querySelector(`tr[data-index="${index}"]`);
        active?.classList.add('is-selected');
    }

    function renderGrid() {
        gridTbody = $('transactionGrid')?.querySelector('tbody');
        if (!gridTbody) return;

        gridTbody.innerHTML = '';

        if (!details.length) {
            const tr = document.createElement('tr');
            const td = document.createElement('td');
            td.colSpan = 9;
            td.style.textAlign = 'center';
            td.style.color = 'var(--text-gray)';
            td.style.padding = '40px';
            td.textContent = 'No records to display.';
            tr.appendChild(td);
            gridTbody.appendChild(tr);
            updateSummary();
            return;
        }

        const fragment = document.createDocumentFragment();
        details.forEach((row, index) => {
            const tr = document.createElement('tr');
            tr.dataset.index = String(index);
            if (index === selectedDetailIndex) tr.classList.add('is-selected');

            const cells = [
                row.branchNo,
                row.accountType,
                row.accountId,
                row.accountName,
                row.transactionTypeLabel || row.transactionType,
                row.transactionCurrency,
                formatMoney(row.amount),
                formatMoney(row.exchangeRate),
                row.narration,
            ];
            cells.forEach(text => {
                const td = document.createElement('td');
                td.textContent = text || '';
                tr.appendChild(td);
            });

            fragment.appendChild(tr);
        });

        gridTbody.appendChild(fragment);

        updateSummary();
    }

    function wireGridClick() {
        if (gridClickWired) return;
        const tbody = $('transactionGrid')?.querySelector('tbody');
        if (!tbody) return;
        gridClickWired = true;
        tbody.addEventListener('click', (e) => {
            const tr = e.target?.closest?.('tr');
            if (!tr || !tbody.contains(tr)) return;
            const idx = Number(tr.dataset.index);
            if (!Number.isFinite(idx) || idx < 0 || !details[idx]) return;
            setSelectedRow(idx);
            loadEntryToForm(details[idx]);
            setStatus('Row selected.', 'text-secondary');
            notifyParent('detail-select', { index: idx });
        });
    }

    function loadEntryToForm(row) {
        if (!row) return;
        if ($('branchNo')) $('branchNo').value = row.branchNo || '';
        if ($('accountType')) $('accountType').value = row.accountType || '';
        if ($('accountId')) $('accountId').value = row.accountId || '';
        if ($('accountName')) $('accountName').value = row.accountName || '';
        if ($('transactionType')) $('transactionType').value = row.transactionType || '';
        if ($('transactionCurrency')) $('transactionCurrency').value = row.transactionCurrency || '';
        if ($('transactionCurrencyName')) $('transactionCurrencyName').value = row.transactionCurrencyName || '';
        if ($('transactionAmount')) $('transactionAmount').value = formatMoney(row.amount || 0);
        if ($('exchangeRate')) $('exchangeRate').value = formatMoney(row.exchangeRate || 1);
        if ($('narration')) $('narration').value = row.narration || '';
        recalcAmounts();
    }

    function updateSummary() {
        const debitTotal = details
            .filter(r => (r.transactionType || '').toLowerCase() === 'debit')
            .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);
        const creditTotal = details
            .filter(r => (r.transactionType || '').toLowerCase() === 'credit')
            .reduce((sum, r) => sum + (Number(r.amount) || 0), 0);

        setMoneyValue($('totalDebit'), debitTotal);
        setMoneyValue($('totalCredit'), creditTotal);
        setMoneyValue($('unPosted'), debitTotal - creditTotal);
    }

    function takeSnapshot() {
        const ids = [
            'transferType', 'serialId', 'transactionType', 'accountType', 'branchNo', 'branchName',
            'crossCurrency', 'liquidationOption', 'accountId', 'accountName', 'costCenterId', 'costCenterName',
            'valueDate', 'instrumentType', 'instrumentId', 'instrumentDate', 'declarationRefNo',
            'transactionId', 'transactionIdName', 'narration', 'transactionCurrency', 'transactionCurrencyName',
            'transactionAmount', 'exchangeRate', 'localAmount', 'foreignAmount'
        ];
        const values = {};
        ids.forEach(id => {
            const el = $(id);
            if (!el) return;
            values[id] = el.type === 'checkbox' ? !!el.checked : el.value;
        });
        return {
            values,
            details: details.map(d => ({ ...d })),
        };
    }

    function restoreSnapshot(snapshot) {
        if (!snapshot) return;
        Object.entries(snapshot.values || {}).forEach(([id, value]) => {
            const el = $(id);
            if (!el) return;
            if (el.type === 'checkbox') el.checked = !!value;
            else el.value = value;
        });
        details = (snapshot.details || []).map(d => ({ ...d }));
        selectedDetailIndex = -1;
        recalcAmounts();
        scheduleRenderGrid();
    }

    // Action Panel Functions
    function enableAddMode() {
        currentMode = 'ADD';
        clearForm();
        enableFormControls();
        updateActionButtonsState('Add');
        setStatus('Ready to add new Transfer Transaction', 'text-info');
        notifyParent('mode', { mode: 'ADD' });
    }

    function performSave() {
        if (!validateForm()) return;
        if (!details.length) {
            setStatus('Add at least one row to the grid before saving.', 'text-danger');
            return;
        }

        const unPosted = parseNumber($('unPosted')?.value);
        if (Math.abs(unPosted) > 0.000001) {
            setStatus('Total Debit and Total Credit must balance (Un-Posted must be 0.00) before saving.', 'text-danger');
            return;
        }

        if ($('serialId') && !$('serialId').value) {
            $('serialId').value = `TRF-${Date.now()}`;
        }

        setStatus('Saving...', 'text-primary');
        setTimeout(() => {
            setStatus('Transaction saved successfully', 'text-success');
            currentMode = 'VIEW';
            hasSavedRecord = true;
            lastSavedSnapshot = takeSnapshot();
            disableFormControls();
            updateActionButtonsState('View');
            notifyParent('save', { serialId: $('serialId')?.value || null });
        }, 800);
    }

    function validateForm() {
        let isValid = true;
        // Required for normal flow: key header fields + amount/rate.
        const requiredIds = [
            'transferType',
            'branchNo',
            'accountId',
            'transactionType',
            'transactionCurrency',
            'transactionAmount',
            'exchangeRate'
        ];

        requiredIds.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            if (!el.value || el.value === '--Select--') {
                el.style.borderColor = 'var(--danger)';
                isValid = false;
            } else {
                el.style.borderColor = '';
            }
        });

        if (!isValid) {
            setStatus('Please fill in all required fields.', 'text-danger');
        }
        return isValid;
    }

    function clearForm() {
        document.querySelectorAll('#transferTransactionsForm input:not([readonly]), #transferTransactionsForm select, #transferTransactionsForm textarea').forEach(el => {
            if (el.type === 'checkbox') el.checked = false;
            else el.value = '';
        });
        if ($('branchNo')) $('branchNo').value = '0325';
        if ($('branchName')) $('branchName').value = 'Tillil';
        if ($('exchangeRate')) $('exchangeRate').value = '1.00';

        details = [];
        selectedDetailIndex = -1;
        scheduleRenderGrid();
        recalcAmounts();
    }

    function disableFormControls() {
        if (!cachedFormControls) {
            cachedFormControls = Array.from(document.querySelectorAll('#transferTransactionsForm input, #transferTransactionsForm select, #transferTransactionsForm textarea, .btn-detail, .btn-lookup'));
        }
        cachedFormControls.forEach(el => { el.disabled = true; });
    }

    function enableFormControls() {
        if (!cachedEditableFormControls) {
            cachedEditableFormControls = Array.from(document.querySelectorAll('#transferTransactionsForm input, #transferTransactionsForm select, #transferTransactionsForm textarea, .btn-detail, .btn-lookup'));
        }
        cachedEditableFormControls.forEach(el => {
            if (el.readOnly) return;
            el.disabled = false;
        });
    }

    function updateActionButtonsState(activeAction) {
        document.querySelectorAll('.btn-action[data-action]').forEach(btn => {
            const action = btn.dataset.action;

            if (['print', 'account-info', 'view-all'].includes(action)) {
                btn.disabled = false;
                return;
            }

            if (activeAction === 'Add' || activeAction === 'Edit') {
                btn.disabled = !['save', 'cancel'].includes(action);
                return;
            }

            // View mode
            if (action === 'add' || action === 'view') {
                btn.disabled = false;
                return;
            }

            if (action === 'edit' || action === 'rollback') {
                btn.disabled = !hasSavedRecord;
                return;
            }

            btn.disabled = true;
        });
    }

    function setStatus(msg, className) {
        const el = document.getElementById('statusMessage');
        if (!el) return;
        // Replace inline red errors with a toast (time-sensitive UX).
        if ((className || '').includes('text-danger')) {
            showToast(msg, 'danger');
            el.textContent = '';
            el.className = '';
            return;
        }

        el.textContent = msg;
        el.className = className || '';
    }

    function wireActionButtons() {
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', function () {
                const action = this.dataset.action;
                if (!action) return;

                if (action === 'add') {
                    enableAddMode();
                    return;
                }

                if (action === 'edit') {
                    if (!hasSavedRecord) {
                        setStatus('No saved record to edit.', 'text-danger');
                        return;
                    }
                    currentMode = 'EDIT';
                    enableFormControls();
                    updateActionButtonsState('Edit');
                    setStatus('Edit mode enabled.', 'text-info');
                    notifyParent('mode', { mode: 'EDIT' });
                    return;
                }

                if (action === 'save') {
                    performSave();
                    return;
                }

                if (action === 'cancel') {
                    if (lastSavedSnapshot) {
                        restoreSnapshot(lastSavedSnapshot);
                        hasSavedRecord = true;
                    } else {
                        clearForm();
                        hasSavedRecord = false;
                    }
                    currentMode = 'VIEW';
                    disableFormControls();
                    updateActionButtonsState('View');
                    setStatus('Operation cancelled', 'text-secondary');
                    notifyParent('cancel');
                    return;
                }

                if (action === 'rollback') {
                    if (!lastSavedSnapshot) {
                        setStatus('Nothing to rollback.', 'text-secondary');
                        return;
                    }
                    restoreSnapshot(lastSavedSnapshot);
                    currentMode = 'VIEW';
                    hasSavedRecord = true;
                    disableFormControls();
                    updateActionButtonsState('View');
                    setStatus('Rolled back to last saved state.', 'text-secondary');
                    notifyParent('rollback');
                    return;
                }

                if (action === 'view') {
                    currentMode = 'VIEW';
                    disableFormControls();
                    updateActionButtonsState('View');
                    setStatus('Viewing record...', 'text-primary');
                    notifyParent('view');
                    return;
                }

                if (action === 'print') {
                    window.print();
                    notifyParent('print');
                    return;
                }

                if (action === 'account-info') {
                    setStatus('Account Info is not yet implemented.', 'text-secondary');
                    notifyParent('account-info');
                    return;
                }

                if (action === 'view-all') {
                    setStatus('View All is not yet implemented.', 'text-secondary');
                    notifyParent('view-all');
                    return;
                }
            });
        });
    }

    function wireDetailButtons() {
        document.querySelectorAll('.btn-detail[data-action]').forEach(btn => {
            btn.addEventListener('click', function () {
                const action = this.dataset.action;
                if (!action) return;

                if (currentMode === 'VIEW') {
                    setStatus('Switch to Add/Edit mode to modify details.', 'text-secondary');
                    return;
                }

                if (action === 'new' || action === 'clear') {
                    clearEntryFields();
                    setStatus(action === 'new' ? 'Ready for new row entry.' : 'Entry fields cleared.', 'text-secondary');
                    notifyParent(`detail-${action}`);
                    return;
                }

                if (action === 'update') {
                    const entry = readEntryFromForm();
                    if (!validateEntry(entry)) return;

                    const normalized = {
                        ...entry,
                        transactionType: (entry.transactionType || '').toLowerCase(),
                    };

                    if (selectedDetailIndex >= 0 && details[selectedDetailIndex]) {
                        details[selectedDetailIndex] = { ...normalized };
                        setStatus('Row updated.', 'text-success');
                        notifyParent('detail-update', { index: selectedDetailIndex });
                    } else {
                        details.push({ ...normalized });
                        setStatus('Row added.', 'text-success');
                        notifyParent('detail-add', { index: details.length - 1 });
                    }
                    setSelectedRow(-1);
                    scheduleRenderGrid();
                    return;
                }

                if (action === 'remove') {
                    if (selectedDetailIndex < 0 || !details[selectedDetailIndex]) {
                        setStatus('Select a row to remove.', 'text-danger');
                        return;
                    }
                    const removedIndex = selectedDetailIndex;
                    details.splice(selectedDetailIndex, 1);
                    setSelectedRow(-1);
                    scheduleRenderGrid();
                    setStatus('Row removed.', 'text-secondary');
                    notifyParent('detail-remove', { index: removedIndex });
                    return;
                }
            });
        });
    }

    function wireRecalculation() {
        const amountEl = $('transactionAmount');
        const rateEl = $('exchangeRate');
        const typeEl = $('transferType');

        amountEl?.addEventListener('input', recalcAmounts);
        rateEl?.addEventListener('input', recalcAmounts);
        typeEl?.addEventListener('change', recalcAmounts);
    }

    // Initialization
    document.addEventListener('DOMContentLoaded', function () {
        setSelectOptionsIfEmpty($('transactionType'), [
            { value: 'debit', label: 'Debit' },
            { value: 'credit', label: 'Credit' },
        ]);

        wireMoneyFields();
        wireRecalculation();
        wireActionButtons();
        wireDetailButtons();
        wireGridClick();
        wireDatePickerButtons();

        renderGrid();
        recalcAmounts();

        disableFormControls();
        updateActionButtonsState('View');

        console.log('Transfer Transactions - Modern Blue Edition Initialized');
    });
})();
