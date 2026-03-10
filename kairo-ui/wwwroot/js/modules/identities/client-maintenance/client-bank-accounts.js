const CM_BANK_ACCOUNTS_BASE = 'Identities/ClientMaintenance/BankAccounts';

function invokeClientMaintenanceBankAccounts(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_BANK_ACCOUNTS_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceBankAccountsService = {
    get: (requestData) => invokeClientMaintenanceBankAccounts('get', requestData),
    create: (requestData) => invokeClientMaintenanceBankAccounts('create', requestData),
    update: (requestData) => invokeClientMaintenanceBankAccounts('update', requestData),
    delete: (requestData) => invokeClientMaintenanceBankAccounts('delete', requestData)
};

window.initClientMaintenanceBankAccounts = function (tabRoot, moduleId) {
    if (!tabRoot) return;

    const state = {
        accounts: [],
        selectedAccount: null,
        mode: 'view'
    };

    const form = tabRoot.querySelector('[data-bankaccounts-form]');
    const table = tabRoot.querySelector('[data-table="bank-accounts"]');
    const tbody = table?.querySelector('[data-bankaccounts-body]');

    const renderTable = (accounts) => {
        if (!tbody) return;

        tbody.innerHTML = '';

        if (!Array.isArray(accounts) || accounts.length === 0) {
            const tr = document.createElement('tr');
            tr.innerHTML = '<td colspan="8" class="text-center text-muted py-3">No bank accounts registered</td>';
            tbody.appendChild(tr);
            return;
        }

        accounts.forEach((account, index) => {
            const tr = document.createElement('tr');
            tr.dataset.accountIndex = index;
            tr.style.cursor = 'pointer';

            const accountTypeText = account?.ProductTypeName || account?.AccountType || '';
            const institutionTypeText = account?.InstitutionTypeName || account?.InstitutionType || '';
            const bankName = account?.BankName || '';
            const branchName = account?.BranchName || '';
            const accountNo = account?.AccountNo || '';
            const iban = account?.IBAN || '';
            const statusText = account?.StatusID == 1 || account?.Status == 'Active' ? 'Active' : 'Inactive';
            const statusClass = account?.StatusID == 1 || account?.Status == 'Active' ? 'text-success' : 'text-danger';

            tr.innerHTML = `
                <td class="ps-2">${escapeHtml(accountTypeText)}</td>
                <td>${escapeHtml(institutionTypeText)}</td>
                <td>${escapeHtml(bankName)}</td>
                <td>${escapeHtml(branchName)}</td>
                <td>${escapeHtml(accountNo)}</td>
                <td>${escapeHtml(iban)}</td>
                <td class="text-center ${statusClass}">${statusText}</td>
                <td class="text-center">
                    <button type="button" class="btn btn-sm btn-outline-primary" data-account-action="select" data-account-index="${index}">
                        <i class="bi bi-check2"></i>
                    </button>
                </td>
            `;

            tr.addEventListener('click', (e) => {
                if (e.target.closest('[data-account-action="select"]')) return;
                selectAccount(accounts[index], tr);
            });

            tbody.appendChild(tr);
        });
    };

    const selectAccount = (account, rowElement) => {
        tbody?.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
        rowElement?.classList.add('table-active');

        state.selectedAccount = account;
        populateForm(account);
        setFormState('view');
    };

    const populateForm = (account) => {
        if (!account) return;

        setFieldValue('hdn_bankAccountId', account.ID || account.BankAccountID);
        setFieldValue('ddl_accountType', account.ProductTypeID || account.AccountTypeID);
        setFieldValue('ddl_institutionType', account.InstitutionTypeID);
        setFieldValue('txt_bankCode', account.BankID || account.BankCode);
        setFieldValue('txt_bankName', account.BankName);
        setFieldValue('txt_branchCode', account.BranchID || account.BranchCode);
        setFieldValue('txt_branchName', account.BranchName);
        setFieldValue('txt_accountNumber', account.AccountNo);
        setFieldValue('txt_accountIBAN', account.IBAN);
        setFieldValue('ddl_accountStatus', account.StatusID != null ? String(account.StatusID) : '');
        setFieldValue('txt_accountRemarks', account.Remarks);
    };

    const clearForm = () => {
        form?.querySelectorAll('input:not([type="hidden"]), select, textarea').forEach(field => {
            if (field.type === 'checkbox') {
                field.checked = false;
            } else {
                field.value = '';
            }
        });
        setFieldValue('hdn_bankAccountId', '');
        state.selectedAccount = null;
        tbody?.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
    };

    const setFieldValue = (id, value) => {
        const field = form?.querySelector(`#${id}`);
        if (!field) return;

        if (field.tagName === 'SELECT') {
            field.value = value || '';
        } else if (field.type === 'checkbox') {
            field.checked = Boolean(value);
        } else {
            field.value = value || '';
        }
    };

    const getFormData = () => {
        return {
            ID: getFieldValue('hdn_bankAccountId'),
            ProductTypeID: getFieldValue('ddl_accountType'),
            InstitutionTypeID: getFieldValue('ddl_institutionType'),
            BankID: getFieldValue('txt_bankCode'),
            BankName: getFieldValue('txt_bankName'),
            BranchID: getFieldValue('txt_branchCode'),
            BranchName: getFieldValue('txt_branchName'),
            AccountNo: getFieldValue('txt_accountNumber'),
            IBAN: getFieldValue('txt_accountIBAN'),
            StatusID: getFieldValue('ddl_accountStatus'),
            Remarks: getFieldValue('txt_accountRemarks')
        };
    };

    const getFieldValue = (id) => {
        const field = form?.querySelector(`#${id}`);
        if (!field) return '';

        if (field.type === 'checkbox') {
            return field.checked;
        }
        return field.value || '';
    };

    const validateForm = () => {
        const errors = [];

        if (!getFieldValue('ddl_accountType')) {
            errors.push('Account Type is required');
        }
        if (!getFieldValue('ddl_institutionType')) {
            errors.push('Institution Type is required');
        }
        if (!getFieldValue('txt_bankCode')) {
            errors.push('Bank is required');
        }
        if (!getFieldValue('txt_branchCode')) {
            errors.push('Branch is required');
        }
        if (!getFieldValue('txt_accountNumber')) {
            errors.push('Account Number is required');
        }

        if (errors.length > 0) {
            window.ClientMaintenanceCore?.showToast(errors.join(', '), 'error');
            return false;
        }

        return true;
    };

    const setFormState = (mode) => {
        state.mode = mode;

        const newBtn = tabRoot.querySelector('[data-bankaccount-action="new"]');
        const alterBtn = tabRoot.querySelector('[data-bankaccount-action="alter"]');
        const removeBtn = tabRoot.querySelector('[data-bankaccount-action="remove"]');
        const updateBtn = tabRoot.querySelector('[data-bankaccount-action="update"]');
        const clearBtn = tabRoot.querySelector('[data-bankaccount-action="clear"]');

        const fields = form?.querySelectorAll('input:not([type="hidden"]), select, textarea');
        const allowEdit = Boolean(window.ClientMaintenanceCore?.isEditMode);

        if (!allowEdit) {
            fields?.forEach(f => f.disabled = true);
            if (newBtn) newBtn.disabled = true;
            if (alterBtn) alterBtn.disabled = true;
            if (removeBtn) removeBtn.disabled = true;
            if (updateBtn) updateBtn.disabled = true;
            if (clearBtn) clearBtn.disabled = true;
            return;
        }

        if (mode === 'view') {
            fields?.forEach(f => f.disabled = true);
            if (newBtn) newBtn.disabled = false;
            if (alterBtn) alterBtn.disabled = !state.selectedAccount;
            if (removeBtn) removeBtn.disabled = !state.selectedAccount;
            if (updateBtn) updateBtn.disabled = true;
            if (clearBtn) clearBtn.disabled = false;
        } else if (mode === 'add' || mode === 'edit') {
            fields?.forEach(f => f.disabled = false);
            if (newBtn) newBtn.disabled = true;
            if (alterBtn) alterBtn.disabled = true;
            if (removeBtn) removeBtn.disabled = true;
            if (updateBtn) updateBtn.disabled = false;
            if (clearBtn) clearBtn.disabled = false;
        }
    };

    const refreshTable = async (requestData) => {
        try {
            const response = await window.ClientMaintenanceBankAccountsService.get({
                ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                ClientID: requestData?.ClientID || window.ClientMaintenanceCore?.clientId || '',
                RequestID: requestData?.RequestID || window.ClientMaintenanceCore?.requestId || ''
            });

            const accounts = extractAccounts(response);
            state.accounts = accounts;
            renderTable(accounts);
            setFormState('view');
        } catch (error) {
            console.error('Bank Accounts load failed:', error);
            window.ClientMaintenanceCore?.showToast?.(`Failed to load bank accounts - ${error.message}`, 'error');
            state.accounts = [];
            renderTable([]);
        }
    };

    const extractAccounts = (response) => {
        const candidates = [
            response?.Details,
            response?.details,
            response?.data?.Details,
            response?.data?.details,
            response?.Data,
            response?.data
        ];

        for (const candidate of candidates) {
            if (Array.isArray(candidate)) return candidate;
        }

        return [];
    };

    const handleNew = () => {
        clearForm();
        setFormState('add');
        window.ClientMaintenanceCore?.showToast('Enter new bank account details', 'info');
    };

    const handleAlter = () => {
        if (!state.selectedAccount) {
            window.ClientMaintenanceCore?.showToast('Please select a bank account to edit', 'warning');
            return;
        }
        setFormState('edit');
    };

    const handleRemove = async () => {
        if (!state.selectedAccount) {
            window.ClientMaintenanceCore?.showToast('Please select a bank account to remove', 'warning');
            return;
        }

        const confirmed = await window.ClientMaintenanceCore?.showDialog(
            'Delete Bank Account',
            'Are you sure you want to delete this bank account?',
            'YesNo'
        );

        if (!confirmed) return;

        try {
            const response = await window.ClientMaintenanceBankAccountsService.delete({
                ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                ClientID: window.ClientMaintenanceCore?.clientId || '',
                RequestID: window.ClientMaintenanceCore?.requestId || '',
                ID: state.selectedAccount.ID || state.selectedAccount.BankAccountID
            });

            if (response?.ResponseCode === '00' || response?.responseCode === '00') {
                window.ClientMaintenanceCore?.showToast('Bank account deleted successfully', 'success');
                clearForm();
                await refreshTable({});
            } else {
                window.ClientMaintenanceCore?.showToast(response?.ResponseMessage || response?.message || 'Delete failed', 'error');
            }
        } catch (error) {
            console.error('Delete bank account error:', error);
            window.ClientMaintenanceCore?.showToast?.(`Delete failed - ${error.message}`, 'error');
        }
    };

    const handleUpdate = async () => {
        if (!validateForm()) return;

        const formData = getFormData();

        try {
            let response;

            if (state.mode === 'add') {
                response = await window.ClientMaintenanceBankAccountsService.create({
                    ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                    ClientID: window.ClientMaintenanceCore?.clientId || '',
                    RequestID: window.ClientMaintenanceCore?.requestId || '',
                    ...formData
                });
            } else if (state.mode === 'edit') {
                response = await window.ClientMaintenanceBankAccountsService.update({
                    ModuleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
                    ClientID: window.ClientMaintenanceCore?.clientId || '',
                    RequestID: window.ClientMaintenanceCore?.requestId || '',
                    ...formData
                });
            }

            if (response?.ResponseCode === '00' || response?.responseCode === '00') {
                window.ClientMaintenanceCore?.showToast(
                    `Bank account ${state.mode === 'add' ? 'created' : 'updated'} successfully`,
                    'success'
                );
                clearForm();
                await refreshTable({});
            } else {
                window.ClientMaintenanceCore?.showToast(
                    response?.ResponseMessage || response?.message || 'Update failed',
                    'error'
                );
            }
        } catch (error) {
            console.error('Update bank account error:', error);
            window.ClientMaintenanceCore?.showToast?.(`Update failed - ${error.message}`, 'error');
        }
    };

    const handleClear = () => {
        clearForm();
        setFormState('view');
    };

    const handleLookupBank = () => {
        if (state.mode === 'view') {
            window.ClientMaintenanceCore?.showToast('Click "New" or "Alter" to search for banks', 'info');
            return;
        }

        window.ClientMaintenanceCore?.openSearchModal({
            searchType: 'Bank',
            title: 'Search Bank',
            onSelect: (selected) => {
                if (selected) {
                    setFieldValue('txt_bankCode', selected.BankCode || selected.Code || selected.ID);
                    setFieldValue('txt_bankName', selected.BankName || selected.Name);
                }
            }
        });
    };

    const handleLookupBranch = () => {
        if (state.mode === 'view') {
            window.ClientMaintenanceCore?.showToast('Click "New" or "Alter" to search for branches', 'info');
            return;
        }

        const bankCode = getFieldValue('txt_bankCode');
        if (!bankCode) {
            window.ClientMaintenanceCore?.showToast('Please select a bank first', 'warning');
            return;
        }

        window.ClientMaintenanceCore?.openSearchModal({
            searchType: 'Branch',
            title: 'Search Branch',
            filter: { BankCode: bankCode },
            onSelect: (selected) => {
                if (selected) {
                    setFieldValue('txt_branchCode', selected.BranchCode || selected.Code || selected.ID);
                    setFieldValue('txt_branchName', selected.BranchName || selected.Name);
                }
            }
        });
    };

    // Event Listeners
    tabRoot.querySelector('[data-bankaccount-action="new"]')?.addEventListener('click', handleNew);
    tabRoot.querySelector('[data-bankaccount-action="alter"]')?.addEventListener('click', handleAlter);
    tabRoot.querySelector('[data-bankaccount-action="remove"]')?.addEventListener('click', handleRemove);
    tabRoot.querySelector('[data-bankaccount-action="update"]')?.addEventListener('click', handleUpdate);
    tabRoot.querySelector('[data-bankaccount-action="clear"]')?.addEventListener('click', handleClear);
    tabRoot.querySelector('[data-bankaccount-action="lookup-bank"]')?.addEventListener('click', handleLookupBank);
    tabRoot.querySelector('[data-bankaccount-action="lookup-branch"]')?.addEventListener('click', handleLookupBranch);

    tbody?.addEventListener('click', (e) => {
        const selectBtn = e.target.closest('[data-account-action="select"]');
        if (selectBtn) {
            const index = parseInt(selectBtn.dataset.accountIndex);
            if (!isNaN(index) && state.accounts[index]) {
                const row = selectBtn.closest('tr');
                selectAccount(state.accounts[index], row);
            }
        }
    });

    // Register load function for external calls
    tabRoot._cmLoadData = (requestData) => refreshTable(requestData);

    // Initial state
    setFormState('view');
    refreshTable({});
};

function escapeHtml(value) {
    const text = String(value ?? '');
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
