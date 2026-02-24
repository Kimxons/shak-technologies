// Cash Payment Order JavaScript - Modern Blue Edition
(function () {
    let currentMode = 'VIEW';

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
            if (field.value) field.value = formatMoney(parseMoneyInput(field.value));
        });
    }

    // Action Panel Functions
    function enableAddMode() {
        currentMode = 'ADD';
        clearForm();
        enableFormControls();
        updateActionButtonsState('Add');
        setStatus('Ready to add new Cash Payment Order', 'text-info');
    }

    function performSave() {
        if (!validateForm()) return;

        setStatus('Saving...', 'text-primary');
        setTimeout(() => {
            setStatus('CPO saved successfully', 'text-success');
            currentMode = 'VIEW';
            disableFormControls();
            updateActionButtonsState('View');
        }, 800);
    }

    function validateForm() {
        let isValid = true;
        const blueLabels = document.querySelectorAll('.label-blue');

        blueLabels.forEach(label => {
            const id = label.getAttribute('for');
            if (!id) return;
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
            setStatus('Please fill in all required fields (indicated in blue).', 'text-danger');
        }
        return isValid;
    }

    function clearForm() {
        document.querySelectorAll('#cashPaymentOrderForm input:not([readonly]), #cashPaymentOrderForm select, #cashPaymentOrderForm textarea').forEach(el => {
            if (el.type === 'checkbox') el.checked = false;
            else el.value = '';
        });
        // Reset defaults from image
        document.getElementById('serviceType').value = 'CPO - Issuance';
        document.getElementById('branchId').value = '0101';
        document.getElementById('branchName').value = 'Head Office';
        document.getElementById('currencyId').value = 'ETB';
        document.getElementById('currencyName').value = 'BIRR';
        document.getElementById('accountId').value = '21555000';
        document.getElementById('accountName').value = 'Cashiers Payable Orders Payable';
        document.getElementById('cpoType').value = 'CPO';
        document.getElementById('byTransfer').checked = true;
        document.getElementById('accountType').value = 'Customer';
        document.getElementById('debitBranchId').value = '0101';
    }

    function disableFormControls() {
        document.querySelectorAll('#cashPaymentOrderForm input, #cashPaymentOrderForm select, #cashPaymentOrderForm textarea, .btn-lookup').forEach(el => {
            el.disabled = true;
        });
    }

    function enableFormControls() {
        document.querySelectorAll('#cashPaymentOrderForm input, #cashPaymentOrderForm select, #cashPaymentOrderForm textarea, .btn-lookup').forEach(el => {
            if (el.readOnly) return;
            el.disabled = false;
        });
    }

    function updateActionButtonsState(activeAction) {
        document.querySelectorAll('.btn-action[data-action]').forEach(btn => {
            const action = btn.dataset.action;

            // Primary nav actions always enabled for demo
            if (['view-all', 'denomination', 'print', 'print-voucher', 'account-info'].includes(action)) {
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
                if (!action) return;

                if (action === 'add') enableAddMode();
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
            });
        });
    }

    // Initialization
    document.addEventListener('DOMContentLoaded', function () {
        wireMoneyFields();
        wireActionButtons();

        disableFormControls();
        updateActionButtonsState('View');

        console.log('Cash Payment Order - Modern Blue Edition Initialized');
    });
})();
