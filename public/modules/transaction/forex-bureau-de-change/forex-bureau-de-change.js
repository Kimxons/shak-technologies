// Forex Bureau De Change JavaScript - Modern Blue Edition
(function () {
    let currentMode = 'VIEW';

    // Field Formatter Helpers (Aligning with Account Maintenance)
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
        const moneySelectors = [
            'input.money-field',
            '#amount',
            '#rate',
            '#localAmount',
            '#charges',
            '#netAmount'
        ];
        document.querySelectorAll(moneySelectors.join(',')).forEach(field => {
            if (field.readOnly || field.disabled) return;
            field.addEventListener('blur', function () {
                const raw = parseMoneyInput(this.value);
                if (raw !== '') this.value = formatMoney(raw);
            });
            field.addEventListener('focus', function () {
                const raw = parseMoneyInput(this.value);
                if (raw !== '') this.value = raw;
            });
            // Initial format
            if (field.value) field.value = formatMoney(parseMoneyInput(field.value));
        });
    }

    // Calculations
    function calculateTotals() {
        const amountEl = document.getElementById('amount');
        const rateEl = document.getElementById('rate');
        const chargesEl = document.getElementById('charges');
        const localAmountEl = document.getElementById('localAmount');
        const netAmountEl = document.getElementById('netAmount');

        if (!amountEl || !rateEl || !localAmountEl || !netAmountEl) return;

        const amount = parseFloat(parseMoneyInput(amountEl.value) || 0);
        const rate = parseFloat(parseMoneyInput(rateEl.value) || 0);
        const charges = parseFloat(parseMoneyInput(chargesEl?.value) || 0);

        const local = amount * rate;
        const net = local - charges;

        localAmountEl.value = formatMoney(local);
        netAmountEl.value = formatMoney(net);
    }

    function wireCalculations() {
        ['amount', 'rate', 'charges'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('blur', calculateTotals);
        });
    }

    // Action Panel Functions
    function enableAddMode() {
        currentMode = 'ADD';
        clearForm();
        enableFormControls();
        updateActionButtonsState('Add');
        setStatus('Ready to add new transaction', 'text-info');
    }

    function enableEditMode() {
        currentMode = 'EDIT';
        enableFormControls();
        updateActionButtonsState('Edit');
        setStatus('Edit mode active', 'text-info');
    }

    function performSave() {
        if (!validateForm()) return;

        setStatus('Saving...', 'text-primary');
        setTimeout(() => {
            setStatus('Transaction saved successfully', 'text-success');
            currentMode = 'VIEW';
            disableFormControls();
            updateActionButtonsState('View');
        }, 800);
    }

    function validateForm() {
        let isValid = true;
        const requiredIds = ['transaction', 'currencyId', 'glAccountId', 'amount', 'rate'];

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
        document.querySelectorAll('#forexForm input:not([readonly]), #forexForm select, #forexForm textarea').forEach(el => {
            if (el.type === 'checkbox') el.checked = false;
            else el.value = '';
        });
        // Reset defaults
        document.getElementById('transaction').value = 'Buying';
        document.getElementById('accountType').value = 'Customer';
    }

    function disableFormControls() {
        document.querySelectorAll('#forexForm input, #forexForm select, #forexForm textarea, .btn-lookup').forEach(el => {
            el.disabled = true;
        });
    }

    function enableFormControls() {
        document.querySelectorAll('#forexForm input, #forexForm select, #forexForm textarea, .btn-lookup').forEach(el => {
            if (el.readOnly) return;
            el.disabled = false;
        });
    }

    function updateActionButtonsState(activeAction) {
        document.querySelectorAll('.btn-action').forEach(btn => {
            const action = btn.dataset.action;

            if (['account-info', 'view-all', 'denomination', 'print'].includes(action)) {
                btn.disabled = false;
                return;
            }

            if (activeAction === 'Add' || activeAction === 'Edit') {
                btn.disabled = !['save', 'cancel'].includes(action);
                if (action === 'save') btn.classList.add('underline');
                else btn.classList.remove('underline');
            } else {
                btn.disabled = !['add', 'edit', 'delete', 'view'].includes(action);
                btn.classList.remove('underline');
            }
        });
    }

    function setStatus(msg, className) {
        const el = document.getElementById('statusMessage');
        if (!el) return;
        el.textContent = msg;
        el.className = className || '';
    }

    function wireActionButtons() {
        document.querySelectorAll('.btn-action').forEach(btn => {
            btn.addEventListener('click', function () {
                const action = this.dataset.action;
                if (action === 'add') enableAddMode();
                else if (action === 'edit') enableEditMode();
                else if (action === 'save') performSave();
                else if (action === 'cancel') {
                    currentMode = 'VIEW';
                    disableFormControls();
                    updateActionButtonsState('View');
                    setStatus('Operation cancelled', 'text-secondary');
                }
                else if (action === 'view') {
                    setStatus('Viewing record...', 'text-primary');
                }
                else {
                    alert('Action: ' + action);
                }
            });
        });

        // Top Refresh & Close
        const refreshBtn = document.querySelector('.title-btn.refresh');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => location.reload());
        }

        const closeBtn = document.getElementById('btnCloseTop');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => {
                if (window.parent && window.parent.closeTab) window.parent.closeTab();
                else window.close();
            });
        }
    }

    // Initialization
    document.addEventListener('DOMContentLoaded', function () {
        wireMoneyFields();
        wireCalculations();
        wireActionButtons();

        disableFormControls();
        updateActionButtonsState('View');

        console.log('Forex Bureau De Change - Modern Blue Edition Initialized');
    });
})();
