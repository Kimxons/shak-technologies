const CM_BANK_ACCOUNTS_BASE = 'Identities/ClientMaintenance/BankAccounts';

function getBankAccountsAppCore() {
    const win = window;
    return win.AppCore ||
        (win.parent && win.parent !== win && win.parent.AppCore) ||
        (win.top && win.top !== win && win.top.AppCore) ||
        null;
}

function getBankAccountsClientMaintenanceCore() {
    const win = window;
    return win.ClientMaintenanceCore ||
        (win.parent && win.parent !== win && win.parent.ClientMaintenanceCore) ||
        (win.top && win.top !== win && win.top.ClientMaintenanceCore) ||
        null;
}

function getBankAccountsSidebarManager() {
    const win = window;
    try {
        return (win.parent && win.parent !== win && win.parent.SidebarManager) ||
            (win.top && win.top !== win && win.top.SidebarManager) ||
            null;
    } catch (_error) {
        return null;
    }
}

function getBankAccountsParentContext() {
    const maintenanceCore = getBankAccountsClientMaintenanceCore();
    if (maintenanceCore?.getParentContext) {
        return maintenanceCore.getParentContext();
    }

    const sidebarManager = getBankAccountsSidebarManager();
    if (sidebarManager?.getParentContext) {
        return sidebarManager.getParentContext();
    }

    return null;
}

function toBankAccountsString(value) {
    return value === undefined || value === null ? '' : String(value).trim();
}

function firstNonEmptyBankAccountsString(...values) {
    for (const value of values) {
        const normalized = toBankAccountsString(value);
        if (normalized) {
            return normalized;
        }
    }

    return '';
}

function getBankAccountsViewState() {
    return window.ClientBankAccountsState || {};
}

function resolveBankAccountsContext(requestData, fallbackModuleId) {
    const viewState = getBankAccountsViewState();
    const parentContext = getBankAccountsParentContext() || {};
    const maintenanceCore = getBankAccountsClientMaintenanceCore();

    const moduleId = firstNonEmptyBankAccountsString(
        requestData?.ModuleID,
        fallbackModuleId,
        maintenanceCore?.moduleId,
        parentContext.moduleId,
        viewState.ModuleID
    );

    const clientId = firstNonEmptyBankAccountsString(
        requestData?.ClientID,
        maintenanceCore?.getClientId?.(),
        maintenanceCore?.clientId,
        parentContext.clientId,
        viewState.ClientID
    );

    const requestId = firstNonEmptyBankAccountsString(
        requestData?.RequestID,
        maintenanceCore?.getRequestId?.(),
        maintenanceCore?.requestId,
        parentContext.requestId,
        viewState.RequestID
    );

    return {
        ModuleID: moduleId,
        ClientID: clientId,
        RequestID: requestId,
        AutoLoad: Boolean(viewState.AutoLoad),
        IsStandalone: Boolean(viewState.IsStandalone)
    };
}

function shouldAutoLoadStandaloneBankAccounts(context) {
    return Boolean(context?.IsStandalone && (context?.ClientID || context?.RequestID));
}

function invokeClientMaintenanceBankAccounts(action, requestData) {
    const maintenanceCore = getBankAccountsClientMaintenanceCore();
    if (maintenanceCore?.invokeControllerMethod) {
        return maintenanceCore.invokeControllerMethod(CM_BANK_ACCOUNTS_BASE, action, 'POST', requestData || {});
    }

    const appCore = getBankAccountsAppCore();
    if (appCore?.invokeControllerByMethodAsync) {
        return appCore.invokeControllerByMethodAsync(`${CM_BANK_ACCOUNTS_BASE}/${action}`, 'POST', requestData || {});
    }

    return Promise.reject(new Error('Bank accounts controller invocation is not available.'));
}

window.ClientMaintenanceBankAccountsService = {
    get: (requestData) => invokeClientMaintenanceBankAccounts('get', requestData),
    create: (requestData) => invokeClientMaintenanceBankAccounts('create', requestData),
    update: (requestData) => invokeClientMaintenanceBankAccounts('update', requestData),
    delete: (requestData) => invokeClientMaintenanceBankAccounts('delete', requestData)
};

function showBankAccountsToast(message, type = 'info') {
    const maintenanceCore = getBankAccountsClientMaintenanceCore();
    if (maintenanceCore?.showToast) {
        maintenanceCore.showToast(message, type);
        return;
    }

    if (window.NotificationService?.showToast) {
        window.NotificationService.showToast(message, type, 4000);
        return;
    }

    console.log(`[${type}] ${message}`);
}

async function requestBankAccountsConfirmation(title, message) {
    const appCore = getBankAccountsAppCore();
    if (appCore?.showConfirmation) {
        return Boolean(await appCore.showConfirmation(title, message));
    }

    return window.confirm(message);
}

function getBankAccountsResponseCode(response) {
    return toBankAccountsString(response?.ResponseCode ?? response?.responseCode);
}

function getBankAccountsResponseMessage(response, fallbackMessage) {
    return response?.ResponseMessage ??
        response?.responseMessage ??
        response?.Message ??
        response?.message ??
        response?.ErrorMessage ??
        response?.errorMessage ??
        fallbackMessage;
}

function isBankAccountsResponseSuccess(response) {
    const successFlag = response?.Success ?? response?.success;
    if (typeof successFlag === 'boolean') {
        return successFlag;
    }

    const responseCode = getBankAccountsResponseCode(response).toUpperCase();
    if (responseCode) {
        return responseCode === '000' || responseCode === '00' || responseCode === 'SUCCESS';
    }

    return true;
}

function isBankAccountsNoDataResponse(response) {
    const responseCode = getBankAccountsResponseCode(response).toUpperCase();
    const responseMessage = toBankAccountsString(getBankAccountsResponseMessage(response, ''));
    return responseCode === 'DBEX000020' || /do not exist/i.test(responseMessage);
}

function closeBankAccountsView() {
    const parentWindowRef = window.parent && window.parent !== window ? window.parent : null;
    let handled = false;

    try {
        if (parentWindowRef?.SidebarManager?.closeChildForm) {
            parentWindowRef.SidebarManager.closeChildForm();
            handled = true;
        }
    } catch (_error) {
    }

    if (!handled) {
        try {
            parentWindowRef?.postMessage({ type: 'submoduleClose', source: 'ClientBankAccounts' }, '*');
            handled = Boolean(parentWindowRef);
        } catch (_error) {
        }
    }

    try { parentWindowRef?.postMessage({ action: 'submoduleClosed', source: 'ClientBankAccounts' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'accountMaintenanceChildClose', source: 'ClientBankAccounts' }, '*'); } catch (_error) { }
    try { parentWindowRef?.postMessage({ type: 'CLOSE_DATAENTRY', source: 'ClientBankAccounts' }, '*'); } catch (_error) { }

    if (!handled) {
        if (window.history.length > 1) {
            window.history.back();
        } else {
            window.close();
        }
    }
}

function bindBankAccountsActionPanel(tabRoot) {
    if (!tabRoot) return;

    const actionScope =
        tabRoot.closest('.window') ||
        tabRoot.closest('[data-cm-layout="client-bank-accounts"]') ||
        tabRoot.parentElement ||
        tabRoot;

    if (!actionScope || actionScope.dataset.cmBankAccountsActionDelegated === 'true') return;
    actionScope.dataset.cmBankAccountsActionDelegated = 'true';

    const handleRefresh = async (event) => {
        event.preventDefault();
        if (typeof tabRoot._cmRefreshData === 'function') {
            await tabRoot._cmRefreshData();
        }
    };

    actionScope.addEventListener('click', async (event) => {
        const actionButton = event.target.closest('[data-action]');
        if (!actionButton || !actionScope.contains(actionButton)) return;

        const action = String(actionButton.getAttribute('data-action') || '').toLowerCase();
        if (action === 'refresh') {
            await handleRefresh(event);
            return;
        }

        if (action === 'close') {
            event.preventDefault();
            closeBankAccountsView();
        }
    });

    actionScope.addEventListener('kairo:titlebar:refresh', handleRefresh);
    actionScope.addEventListener('kairo:titlebar:close', (event) => {
        event.preventDefault();
        closeBankAccountsView();
    });
}

window.initClientMaintenanceBankAccounts = function (tabRoot, moduleId) {
    if (!tabRoot || tabRoot.dataset.cmBankAccountsInitialized === 'true') return;
    tabRoot.dataset.cmBankAccountsInitialized = 'true';

    const configuredModuleId = toBankAccountsString(moduleId || getBankAccountsViewState().ModuleID);
    const initialContext = resolveBankAccountsContext(null, configuredModuleId);

    const state = {
        accounts: [],
        selectedAccount: null,
        mode: 'view',
        lastContext: { ...initialContext },
        initialLoadApplied: false,
        autoLoadInFlight: false
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
        const isEditing = mode === 'add' || mode === 'edit';
        const hasSelection = Boolean(state.selectedAccount);

        fields?.forEach((field) => {
            field.disabled = !isEditing;
            if (field.matches('input:not([type="checkbox"]), textarea')) {
                field.readOnly = !isEditing;
            }
        });

        ['#txt_bankCode', '#txt_bankName', '#txt_branchCode', '#txt_branchName'].forEach((selector) => {
            const field = form?.querySelector(selector);
            if (field) {
                field.readOnly = true;
            }
        });

        tabRoot.querySelectorAll('[data-bankaccount-action="lookup-bank"], [data-bankaccount-action="lookup-branch"]').forEach((button) => {
            button.disabled = !isEditing;
        });

        if (newBtn) newBtn.disabled = hasSelection || isEditing;
        if (alterBtn) alterBtn.disabled = !hasSelection || isEditing;
        if (removeBtn) removeBtn.disabled = !hasSelection || isEditing;
        if (updateBtn) updateBtn.disabled = !isEditing;
        if (clearBtn) clearBtn.disabled = !isEditing;
    };

    const refreshTable = async (requestData = {}, refreshOptions = {}) => {
        const context = resolveBankAccountsContext(requestData, configuredModuleId);
        state.lastContext = { ...state.lastContext, ...context };

        clearForm();
        setFormState('view');

        if (!context.ClientID && !context.RequestID) {
            state.accounts = [];
            renderTable([]);
            if (refreshOptions.markInitialLoad) {
                state.initialLoadApplied = true;
            }
            return [];
        }

        try {
            const response = await window.ClientMaintenanceBankAccountsService.get({
                ModuleID: context.ModuleID,
                ClientID: context.ClientID,
                RequestID: context.RequestID
            });

            if (!isBankAccountsResponseSuccess(response) && !isBankAccountsNoDataResponse(response)) {
                throw new Error(getBankAccountsResponseMessage(response, 'Unable to load bank account details.'));
            }

            const accounts = isBankAccountsNoDataResponse(response) ? [] : extractAccounts(response);
            state.accounts = accounts;
            renderTable(accounts);
            if (refreshOptions.markInitialLoad) {
                state.initialLoadApplied = true;
            }
            return accounts;
        } catch (error) {
            console.error('Bank Accounts load failed:', error);
            showBankAccountsToast(`Failed to load bank accounts - ${error.message}`, 'error');
            state.accounts = [];
            renderTable([]);
            return [];
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
        showBankAccountsToast('Enter new bank account details', 'info');
    };

    const handleAlter = () => {
        if (!state.selectedAccount) {
            showBankAccountsToast('Please select a bank account to edit', 'warning');
            return;
        }
        setFormState('edit');
    };

    const handleRemove = async () => {
        if (!state.selectedAccount) {
            showBankAccountsToast('Please select a bank account to remove', 'warning');
            return;
        }

        const confirmed = await requestBankAccountsConfirmation(
            'Delete Bank Account',
            'Are you sure you want to delete this bank account?'
        );

        if (!confirmed) return;

        const context = resolveBankAccountsContext(state.lastContext, configuredModuleId);

        try {
            const response = await window.ClientMaintenanceBankAccountsService.delete({
                ModuleID: context.ModuleID,
                ClientID: context.ClientID,
                RequestID: context.RequestID,
                ID: state.selectedAccount.ID || state.selectedAccount.BankAccountID
            });

            if (isBankAccountsResponseSuccess(response)) {
                showBankAccountsToast('Bank account deleted successfully', 'success');
                clearForm();
                await refreshTable({});
            } else {
                showBankAccountsToast(getBankAccountsResponseMessage(response, 'Delete failed'), 'error');
            }
        } catch (error) {
            console.error('Delete bank account error:', error);
            showBankAccountsToast(`Delete failed - ${error.message}`, 'error');
        }
    };

    const handleUpdate = async () => {
        if (!validateForm()) return;

        const formData = getFormData();
        const context = resolveBankAccountsContext(state.lastContext, configuredModuleId);

        try {
            let response;

            if (state.mode === 'add') {
                response = await window.ClientMaintenanceBankAccountsService.create({
                    ModuleID: context.ModuleID,
                    ClientID: context.ClientID,
                    RequestID: context.RequestID,
                    ...formData
                });
            } else if (state.mode === 'edit') {
                response = await window.ClientMaintenanceBankAccountsService.update({
                    ModuleID: context.ModuleID,
                    ClientID: context.ClientID,
                    RequestID: context.RequestID,
                    ...formData
                });
            }

            if (isBankAccountsResponseSuccess(response)) {
                showBankAccountsToast(
                    `Bank account ${state.mode === 'add' ? 'created' : 'updated'} successfully`,
                    'success'
                );
                clearForm();
                await refreshTable({});
            } else {
                showBankAccountsToast(
                    getBankAccountsResponseMessage(response, 'Update failed'),
                    'error'
                );
            }
        } catch (error) {
            console.error('Update bank account error:', error);
            showBankAccountsToast(`Update failed - ${error.message}`, 'error');
        }
    };

    const handleClear = () => {
        clearForm();
        setFormState('view');
    };

    const handleLookupBank = () => {
        if (state.mode === 'view') {
            showBankAccountsToast('Click "New" or "Alter" to search for banks', 'info');
            return;
        }

        const maintenanceCore = getBankAccountsClientMaintenanceCore();
        if (typeof maintenanceCore?.openSearchModal !== 'function') {
            return;
        }

        maintenanceCore.openSearchModal({
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
            showBankAccountsToast('Click "New" or "Alter" to search for branches', 'info');
            return;
        }

        const bankCode = getFieldValue('txt_bankCode');
        if (!bankCode) {
            showBankAccountsToast('Please select a bank first', 'warning');
            return;
        }

        const maintenanceCore = getBankAccountsClientMaintenanceCore();
        if (typeof maintenanceCore?.openSearchModal !== 'function') {
            return;
        }

        maintenanceCore.openSearchModal({
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

    const bindStandaloneBootstrap = () => {
        if (typeof tabRoot._cmMaybeAutoLoadBankAccounts === 'function') {
            void tabRoot._cmMaybeAutoLoadBankAccounts(initialContext);
        }

        if (tabRoot.dataset.cmBankAccountsParentContextBound === 'true') {
            return;
        }

        tabRoot.dataset.cmBankAccountsParentContextBound = 'true';
        window.addEventListener('message', (event) => {
            const data = event?.data;
            if (!data || typeof data !== 'object') return;
            if (data.type !== 'parentContext' && data.action !== 'parentContextLoaded') return;

            const parentData = data.data || {};
            const nextContext = resolveBankAccountsContext({
                ModuleID: parentData.moduleId,
                ClientID: parentData.clientId,
                RequestID: parentData.requestId
            }, configuredModuleId);

            if (typeof tabRoot._cmMaybeAutoLoadBankAccounts === 'function') {
                void tabRoot._cmMaybeAutoLoadBankAccounts(nextContext);
                return;
            }

            if (typeof tabRoot._cmLoadData === 'function') {
                void tabRoot._cmLoadData(nextContext);
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
    tabRoot._cmLoadData = (requestData, refreshOptions = {}) => refreshTable(requestData, {
        markInitialLoad: !state.initialLoadApplied,
        ...refreshOptions
    });
    tabRoot._cmRefreshData = (requestData, refreshOptions = {}) => refreshTable(requestData, {
        markInitialLoad: !state.initialLoadApplied,
        ...refreshOptions
    });
    tabRoot._cmMaybeAutoLoadBankAccounts = (requestData) => {
        const context = resolveBankAccountsContext(requestData, configuredModuleId);
        if (state.initialLoadApplied || state.autoLoadInFlight || !shouldAutoLoadStandaloneBankAccounts(context)) {
            return Promise.resolve([]);
        }

        state.autoLoadInFlight = true;
        return refreshTable(context, { markInitialLoad: true }).finally(() => {
            state.autoLoadInFlight = false;
        });
    };

    tabRoot._cmSetEditMode = () => {
        setFormState(state.mode);
    };

    bindBankAccountsActionPanel(tabRoot);
    setFormState('view');
    bindStandaloneBootstrap();
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

function autoInitializeStandaloneBankAccountsView() {
    const moduleRoot = document.querySelector('[data-section="client-bank-accounts"]');
    if (!moduleRoot || typeof window.initClientMaintenanceBankAccounts !== 'function') return;

    const moduleId = document.getElementById('moduleIdBankAccounts')?.value || '';
    window.initClientMaintenanceBankAccounts(moduleRoot, moduleId);
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', autoInitializeStandaloneBankAccountsView);
} else {
    autoInitializeStandaloneBankAccountsView();
}
