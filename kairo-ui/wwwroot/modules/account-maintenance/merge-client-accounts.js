(function () {
    'use strict';

    const moduleRoot = document.getElementById('mergeClientAccountsModule');
    if (!moduleRoot) {
        return;
    }

    const state = {
        branchId: moduleRoot.dataset.branchId || '',
        branchName: moduleRoot.dataset.branchName || '',
        operatorId: moduleRoot.dataset.operatorId || '',
        bankId: moduleRoot.dataset.bankId || '00',
        fromClientId: '',
        fromClientName: '',
        toClientId: '',
        toClientName: '',
        fromAccounts: [],
        toAccounts: [],
        selectedAccounts: new Set(),
        searchTarget: 'from',
        selectedClientRow: null,
        selectedBranchRow: null,
        isBusy: false,
        closeMode: moduleRoot.dataset.closeMode || 'window',
        clientRows: [],
        branchRows: [],
        branchRowsRaw: [],
        hasBranchSearchRun: false,
        searchModal: null
    };

    const elements = {
        branchId: document.getElementById('branchId'),
        branchName: document.getElementById('branchName'),
        btnBranchLookup: document.getElementById('btnBranchLookup'),
        fromClientId: document.getElementById('fromClientId'),
        fromClientName: document.getElementById('fromClientName'),
        btnFromClientLookup: document.getElementById('btnFromClientLookup'),
        toClientId: document.getElementById('toClientId'),
        toClientName: document.getElementById('toClientName'),
        btnToClientLookup: document.getElementById('btnToClientLookup'),
        fromAccountsGrid: document.getElementById('fromAccountsGrid'),
        toAccountsGrid: document.getElementById('toAccountsGrid'),
        selectAllFrom: document.getElementById('selectAllFrom'),
        fromRecordCount: document.getElementById('fromRecordCount'),
        toRecordCount: document.getElementById('toRecordCount'),
        selectedCountDisplay: document.getElementById('selectedCountDisplay'),
        summaryBalance: document.getElementById('summaryBalance'),
        mergeReadyBadge: document.getElementById('mergeReadyBadge'),
        btnView: document.getElementById('btnView'),
        btnMerge: document.getElementById('btnMerge'),
        btnClear: document.getElementById('btnClear'),
        btnCancel: document.getElementById('btnCancel'),
        localViewBtn: moduleRoot.querySelector('aside.action-panel [data-action="view"]'),
        localMergeBtn: moduleRoot.querySelector('aside.action-panel [data-action="merge"]'),
        localClearBtn: moduleRoot.querySelector('aside.action-panel [data-action="clear"]'),
        localCancelBtn: moduleRoot.querySelector('aside.action-panel [data-action="cancel"]'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        statusBar: document.getElementById('mergeClientAccountsStatus'),
        messagePanel: document.getElementById('amMessagePanel'),
        messagePanelText: document.getElementById('messagePanelText'),
        messagePanelIcon: document.getElementById('messagePanelIcon'),
        messagePanelClose: document.getElementById('messagePanelClose'),
        btnSelectClient: document.getElementById('btnSelectClient')
    };

    let messageTimer = 0;

    function invokeController(endpoint, requestData) {
        if (!window.AppCore || typeof window.AppCore.invokeControllerAsync !== 'function') {
            return Promise.reject(new Error('AppCore is unavailable.'));
        }

        return window.AppCore.invokeControllerAsync(endpoint, requestData || {});
    }

    function extractSearchResults(response) {
        if (!response?.success || !response?.data) {
            return [];
        }

        const data = response.data;

        if (Array.isArray(data)) {
            return data;
        }

        if (Array.isArray(data.Details)) {
            return data.Details;
        }

        if (data.Details && typeof data.Details === 'object') {
            return [data.Details];
        }

        if (Array.isArray(data.details)) {
            return data.details;
        }

        if (Array.isArray(data.details?.SearchResults)) {
            return data.details.SearchResults;
        }

        if (data.details?.SearchResults && typeof data.details.SearchResults === 'object') {
            return [data.details.SearchResults];
        }

        if (Array.isArray(data.Records)) {
            return data.Records;
        }

        if (Array.isArray(data.records)) {
            return data.records;
        }

        return [];
    }

    async function backgroundSearch(tableID, advFilterString, whereStmt, moduleID, searchKey, ourBranchID) {
        const response = await invokeController('SearchModal/Search', {
            TableID: tableID,
            WhereStmt: whereStmt || '',
            AdvFilterString: advFilterString || '',
            SearchKey: searchKey || '',
            ModuleID: String(moduleID || getModuleId()),
            PageSize: 1000,
            RefID: '',
            PrevOrNext: 0,
            OurBranchID: ourBranchID || null
        });

        return extractSearchResults(response);
    }

    function pickValue(row, keys) {
        const source = row || {};
        const propertyNames = Object.keys(source);

        for (let i = 0; i < keys.length; i += 1) {
            const requested = keys[i];
            const match = propertyNames.find((name) => name.toLowerCase() === requested.toLowerCase());
            if (!match) {
                continue;
            }

            const value = source[match];
            if (value !== null && value !== undefined && String(value).trim() !== '') {
                return value;
            }
        }

        return '';
    }

    function formatCurrency(value) {
        const amount = Number(String(value ?? '0').replace(/,/g, '').trim());
        const normalized = Number.isFinite(amount) ? amount : 0;
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(normalized);
    }

    function updateStatusBar(text) {
        if (elements.statusBar) {
            elements.statusBar.textContent = text || 'Ready';
        }
    }

    function showLoading(show) {
        state.isBusy = !!show;
        if (elements.loadingOverlay) {
            elements.loadingOverlay.hidden = !show;
        }
        syncActionButtons();
    }

    function hasFormState() {
        return !!(
            getBranchId()
            || String(elements.branchName?.value || state.branchName || '').trim()
            || getFromClientId()
            || String(elements.fromClientName?.value || state.fromClientName || '').trim()
            || getToClientId()
            || String(elements.toClientName?.value || state.toClientName || '').trim()
            || state.fromAccounts.length
            || state.toAccounts.length
            || state.selectedAccounts.size
        );
    }

    function showMessage(message, type, durationMs) {
        if (!elements.messagePanel || !elements.messagePanelText) {
            updateStatusBar(message);
            return;
        }

        window.clearTimeout(messageTimer);

        elements.messagePanel.classList.remove('success', 'error', 'warning', 'info', 'show');
        elements.messagePanel.classList.add(type || 'info', 'show');
        elements.messagePanel.hidden = false;
        elements.messagePanelText.textContent = message;

        if (elements.messagePanelIcon) {
            if (type === 'success') {
                elements.messagePanelIcon.className = 'bi bi-check-circle-fill am-message-panel__icon';
            } else if (type === 'error') {
                elements.messagePanelIcon.className = 'bi bi-exclamation-octagon-fill am-message-panel__icon';
            } else if (type === 'warning') {
                elements.messagePanelIcon.className = 'bi bi-exclamation-triangle-fill am-message-panel__icon';
            } else {
                elements.messagePanelIcon.className = 'bi bi-info-circle-fill am-message-panel__icon';
            }
        }

        updateStatusBar(message);
        messageTimer = window.setTimeout(() => {
            elements.messagePanel.classList.remove('show');
            elements.messagePanel.hidden = true;
        }, durationMs || 3000);
    }

    function showAlertDialog(title, message) {
        if (window.AppCore && typeof window.AppCore.showAlert === 'function') {
            return window.AppCore.showAlert(title || 'Alert', message || '');
        }

        if (window.AppCore && typeof window.AppCore.showDialog === 'function') {
            return window.AppCore.showDialog({
                type: 'alert',
                title: title || 'Alert',
                message: message || ''
            });
        }

        window.alert(message || title || 'Alert');
        return Promise.resolve(true);
    }

    function notify(message, type, options) {
        const settings = options || {};
        const variant = String(type || 'info').toLowerCase();
        showMessage(message, variant, settings.durationMs);

        const shouldUseDialog = settings.useDialog === true
            || variant === 'warning'
            || variant === 'error';

        if (!shouldUseDialog) {
            return Promise.resolve(true);
        }

        const title = settings.title
            || (variant === 'error' ? 'Error' : variant === 'warning' ? 'Warning' : 'Information');

        return showAlertDialog(title, message);
    }

    function getBranchId() {
        return (elements.branchId?.value || state.branchId || '').trim();
    }

    function getOperatorId() {
        return String(state.operatorId || moduleRoot.dataset.operatorId || '').trim();
    }

    function getBankId() {
        return String(state.bankId || moduleRoot.dataset.bankId || '00').trim() || '00';
    }

    function getModuleId() {
        const datasetValue = String(moduleRoot.dataset.moduleId || '').trim();
        if (datasetValue) {
            return datasetValue;
        }

        const queryValue = new URLSearchParams(window.location.search).get('ModuleID')
            || new URLSearchParams(window.location.search).get('moduleId')
            || new URLSearchParams(window.location.search).get('moduleID');

        return String(queryValue || '9900').trim() || '9900';
    }

    function getFromClientId() {
        return (elements.fromClientId?.value || state.fromClientId || '').trim();
    }

    function getToClientId() {
        return (elements.toClientId?.value || state.toClientId || '').trim();
    }

    function normalizeText(value) {
        return String(value || '').trim().toLowerCase();
    }

    function escapeSql(value) {
        return String(value || '').replace(/'/g, "''");
    }

    function escapeHtml(value) {
        return String(value ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    function buildSharedSearchContext() {
        return {
            prefix: 'mergeclientaccounts',
            moduleID: getModuleId(),
            getOperatorId: getOperatorId,
            getOurBranchId: getBranchId,
            getBankId: getBankId,
            onError: function (error) {
                console.error('[MergeClientAccounts] Search helper error:', error);
            }
        };
    }

    function ensureSearchModal() {
        if (state.searchModal) {
            return state.searchModal;
        }

        if (typeof window.SearchModal !== 'function' || !window.AppCore) {
            return null;
        }

        state.searchModal = new window.SearchModal(window.AppCore);
        return state.searchModal;
    }

    function showConfirmDialog(title, message) {
        if (window.AppCore && typeof window.AppCore.showDialog === 'function') {
            return window.AppCore.showDialog({
                title: title || 'Confirm action',
                message: message || '',
                type: 'custom',
                buttons: {
                    list: [
                        { label: 'Cancel', variant: 'outline-secondary', value: false },
                        { label: 'OK', variant: 'primary', value: true }
                    ]
                }
            }).then(function (result) {
                return result === true;
            });
        }

        if (window.AppCore && typeof window.AppCore.showConfirmation === 'function') {
            return window.AppCore.showConfirmation(title || 'Confirm action', message || '').then(function (result) {
                return !!result;
            });
        }

        return Promise.resolve(window.confirm(message || title || 'Are you sure?'));
    }

    function isBranchFilterMatch(source, needle, operator) {
        if (!needle) {
            return true;
        }

        const value = normalizeText(source);
        const term = normalizeText(needle);
        const mode = normalizeText(operator) || 'like';

        if (mode === 'equal') {
            return value === term;
        }

        if (mode === 'startswith') {
            return value.startsWith(term);
        }

        if (mode === 'endswith') {
            return value.endsWith(term);
        }

        return value.includes(term);
    }

    function filterBranchRows(rows, branchIdFilter, branchNameFilter, branchIdOperator, branchNameOperator) {
        const branchIdNeedle = normalizeText(branchIdFilter);
        const branchNameNeedle = normalizeText(branchNameFilter);

        return (rows || []).filter((row) => {
            const branchId = normalizeText(pickValue(row, ['BranchID', 'OurBranchID', 'SubCodeID']));
            const branchName = normalizeText(pickValue(row, ['BranchName', 'Description', 'Name']));
            const branchMatches = isBranchFilterMatch(branchId, branchIdNeedle, branchIdOperator);
            const nameMatches = isBranchFilterMatch(branchName, branchNameNeedle, branchNameOperator);
            return branchMatches && nameMatches;
        });
    }

    function renderFromAccounts() {
        if (!elements.fromAccountsGrid) {
            return;
        }

        if (elements.fromRecordCount) {
            elements.fromRecordCount.textContent = state.fromAccounts.length + ' record' + (state.fromAccounts.length === 1 ? '' : 's');
        }

        if (!state.fromAccounts.length) {
            elements.fromAccountsGrid.innerHTML = '<tr class="table-empty"><td colspan="6"><i class="bi bi-inbox" aria-hidden="true"></i><span>No records to display. Select a branch and source client.</span></td></tr>';
            updateSummary();
            return;
        }

        elements.fromAccountsGrid.innerHTML = state.fromAccounts.map((row, index) => {
            const checked = state.selectedAccounts.has(index) ? 'checked' : '';
            const selectedClass = state.selectedAccounts.has(index) ? 'table-active row-selected' : '';
            return '<tr data-index="' + index + '" class="' + selectedClass + '">' +
                '<td class="text-center"><input type="checkbox" class="form-check-input from-account-check" data-index="' + index + '" ' + checked + ' /></td>' +
                '<td>' + String(pickValue(row, ['AccountType', 'AccountTypeID', 'AccountTypeName']) || '-') + '</td>' +
                '<td>' + String(pickValue(row, ['OurBranchID', 'BranchID']) || '-') + '</td>' +
                '<td>' + String(pickValue(row, ['ProductID', 'ProductCode']) || '-') + '</td>' +
                '<td>' + String(pickValue(row, ['AccountID', 'ID']) || '-') + '</td>' +
                '<td class="text-end">' + formatCurrency(pickValue(row, ['ClearBalance', 'ClearedBalance', 'Balance'])) + '</td>' +
                '</tr>';
        }).join('');

        elements.fromAccountsGrid.querySelectorAll('.from-account-check').forEach((checkbox) => {
            checkbox.addEventListener('change', (event) => {
                const index = Number(event.target.dataset.index);
                if (event.target.checked) {
                    state.selectedAccounts.add(index);
                } else {
                    state.selectedAccounts.delete(index);
                }
                renderFromAccounts();
                updateSummary();
                updateMergeButton();
            });
        });

        elements.fromAccountsGrid.querySelectorAll('tr[data-index]').forEach((row) => {
            row.addEventListener('click', (event) => {
                if (event.target instanceof HTMLInputElement && event.target.type === 'checkbox') {
                    return;
                }
                const checkbox = row.querySelector('.from-account-check');
                if (!(checkbox instanceof HTMLInputElement)) {
                    return;
                }
                checkbox.checked = !checkbox.checked;
                checkbox.dispatchEvent(new Event('change'));
            });
        });

        const visibleCount = state.fromAccounts.length;
        const selectedVisible = state.selectedAccounts.size;
        if (elements.selectAllFrom) {
            elements.selectAllFrom.checked = visibleCount > 0 && selectedVisible === visibleCount;
            elements.selectAllFrom.indeterminate = selectedVisible > 0 && selectedVisible < visibleCount;
            elements.selectAllFrom.disabled = visibleCount === 0;
        }
    }

    function renderToAccounts() {
        if (!elements.toAccountsGrid) {
            return;
        }

        if (elements.toRecordCount) {
            elements.toRecordCount.textContent = state.toAccounts.length + ' record' + (state.toAccounts.length === 1 ? '' : 's');
        }

        if (!state.toAccounts.length) {
            elements.toAccountsGrid.innerHTML = '<tr class="table-empty"><td colspan="5"><i class="bi bi-inbox" aria-hidden="true"></i><span>No records to display. Select a branch and target client.</span></td></tr>';
            return;
        }

        elements.toAccountsGrid.innerHTML = state.toAccounts.map((row) => {
            return '<tr>' +
                '<td>' + String(pickValue(row, ['AccountType', 'AccountTypeID', 'AccountTypeName']) || '-') + '</td>' +
                '<td>' + String(pickValue(row, ['OurBranchID', 'BranchID']) || '-') + '</td>' +
                '<td>' + String(pickValue(row, ['ProductID', 'ProductCode']) || '-') + '</td>' +
                '<td>' + String(pickValue(row, ['AccountID', 'ID']) || '-') + '</td>' +
                '<td class="text-end">' + formatCurrency(pickValue(row, ['ClearBalance', 'ClearedBalance', 'Balance'])) + '</td>' +
                '</tr>';
        }).join('');
    }

    function updateSummary() {
        const selectedCount = state.selectedAccounts.size;
        let total = 0;
        state.selectedAccounts.forEach((index) => {
            total += Number(pickValue(state.fromAccounts[index], ['ClearBalance', 'ClearedBalance', 'Balance']) || 0);
        });

        if (elements.selectedCountDisplay) {
            elements.selectedCountDisplay.textContent = String(selectedCount);
        }

        if (elements.summaryBalance) {
            elements.summaryBalance.textContent = formatCurrency(total);
        }
    }

    function updateMergeButton() {
        const sourceId = getFromClientId();
        const targetId = getToClientId();
        const canMerge = !state.isBusy
            && sourceId
            && targetId
            && sourceId !== targetId
            && state.selectedAccounts.size > 0;

        if (elements.btnMerge) {
            elements.btnMerge.disabled = !canMerge;
        }

        if (elements.localMergeBtn && elements.localMergeBtn !== elements.btnMerge) {
            elements.localMergeBtn.disabled = !canMerge;
        }

        if (elements.mergeReadyBadge) {
            if (sourceId && targetId && sourceId === targetId) {
                elements.mergeReadyBadge.textContent = 'Source and target clients must be different';
            } else if (canMerge) {
                elements.mergeReadyBadge.textContent = 'Ready to merge';
            } else {
                elements.mergeReadyBadge.textContent = 'Awaiting validated selection';
            }
        }
    }

    function syncActionButtons() {
        const hasSelection = state.selectedAccounts.size > 0;
        const canClear = !state.isBusy && hasFormState();
        const canView = !state.isBusy;
        const canCancel = !state.isBusy && hasSelection;

        if (elements.btnView) {
            elements.btnView.disabled = !canView;
        }

        if (elements.localViewBtn && elements.localViewBtn !== elements.btnView) {
            elements.localViewBtn.disabled = !canView;
        }

        if (elements.btnClear) {
            elements.btnClear.disabled = !canClear;
        }

        if (elements.localClearBtn && elements.localClearBtn !== elements.btnClear) {
            elements.localClearBtn.disabled = !canClear;
        }

        if (elements.btnCancel) {
            elements.btnCancel.disabled = !canCancel;
        }

        if (elements.localCancelBtn && elements.localCancelBtn !== elements.btnCancel) {
            elements.localCancelBtn.disabled = !canCancel;
        }

        if (elements.btnBranchLookup) {
            elements.btnBranchLookup.disabled = state.isBusy;
        }

        if (elements.btnFromClientLookup) {
            elements.btnFromClientLookup.disabled = state.isBusy;
        }

        if (elements.btnToClientLookup) {
            elements.btnToClientLookup.disabled = state.isBusy;
        }

        updateMergeButton();
    }

    function applyBranch(branchId, branchName) {
        state.branchId = String(branchId || '').trim();
        state.branchName = String(branchName || '').trim();
        if (elements.branchId) elements.branchId.value = state.branchId;
        if (elements.branchName) elements.branchName.value = state.branchName;
        syncActionButtons();
    }

    function applyClient(target, clientId, clientName) {
        const normalizedClientId = String(clientId || '').trim();
        const normalizedClientName = String(clientName || '').trim();
        if (!normalizedClientId) {
            return false;
        }

        if (target === 'from' && normalizedClientId === getToClientId()) {
            notify('Target client cannot be same as source client.', 'warning');
            return false;
        }

        if (target === 'to' && normalizedClientId === getFromClientId()) {
            notify('Target client cannot be same as source client.', 'warning');
            return false;
        }

        if (target === 'from') {
            state.fromClientId = normalizedClientId;
            state.fromClientName = normalizedClientName;
            if (elements.fromClientId) elements.fromClientId.value = normalizedClientId;
            if (elements.fromClientName) elements.fromClientName.value = normalizedClientName;
            state.fromAccounts = [];
            state.selectedAccounts.clear();
            renderFromAccounts();
        } else {
            state.toClientId = normalizedClientId;
            state.toClientName = normalizedClientName;
            if (elements.toClientId) elements.toClientId.value = normalizedClientId;
            if (elements.toClientName) elements.toClientName.value = normalizedClientName;
            state.toAccounts = [];
            renderToAccounts();
        }

        updateSummary();
        syncActionButtons();
        return true;
    }

    function cancelSelection() {
        const hadSelection = state.selectedAccounts.size > 0;
        state.selectedAccounts.clear();
        renderFromAccounts();
        updateSummary();
        syncActionButtons();
        showMessage(hadSelection ? 'Selection cleared.' : 'No selected accounts to clear.', 'info');
    }

    async function resolveBranchById() {
        const branchId = getBranchId();
        if (!branchId) {
            return false;
        }

        showLoading(true);
        try {
            const rows = await backgroundSearch(
                'BranchID',
                "BankID='" + escapeSql(getBankId()) + "'",
                '',
                getModuleId(),
                {
                    OurBranchID: { value: branchId, mode: 'equals' }
                },
                getBranchId()
            );

            if (!rows.length) {
                await notify('Branch not found.', 'warning');
                return false;
            }

            const row = rows[0];
            applyBranch(
                pickValue(row, ['OurBranchID', 'BranchID', 'SubCodeID']),
                pickValue(row, ['BranchName', 'Description', 'Name'])
            );
            showMessage('Branch resolved.', 'info');
            return true;
        } catch (error) {
            await notify(error.message || 'Error resolving branch.', 'error');
            return false;
        } finally {
            showLoading(false);
        }
    }

    async function resolveClientByInput(target, inputId) {
        const lookupId = String(inputId || '').trim();
        if (!lookupId) {
            return false;
        }

        const branchId = getBranchId();
        if (!branchId) {
            await notify('Branch ID is required before searching for clients.', 'warning');
            return false;
        }

        showLoading(true);
        try {
            let rows = await backgroundSearch(
                'ClientID',
                '',
                "OurBranchID = '" + escapeSql(branchId) + "'",
                getModuleId(),
                {
                    ClientID: { value: lookupId, mode: 'equals' }
                },
                branchId
            );

            if (!rows.length) {
                rows = await backgroundSearch(
                    'ClientID',
                    '',
                    "OurBranchID = '" + escapeSql(branchId) + "'",
                    getModuleId(),
                    {
                        AccountID: { value: lookupId, mode: 'equals' }
                    },
                    branchId
                );
            }

            if (!rows.length) {
                await notify('Client/Account not found.', 'warning');
                return false;
            }

            const row = rows[0];
            const applied = applyClient(
                target,
                pickValue(row, ['ClientID', 'ID', 'CustomerID', 'CustomerCode']),
                pickValue(row, ['ClientName', 'Name', 'FullName'])
            );
            if (applied) {
                showMessage('Client resolved.', 'info');
            }
            return applied;
        } catch (error) {
            await notify(error.message || 'Error resolving client/account.', 'error');
            return false;
        } finally {
            showLoading(false);
        }
    }

    async function openBranchModal() {
        const searchModal = ensureSearchModal();
        if (!searchModal) {
            notify('Search modal is not available.', 'error');
            return;
        }

        try {
            await searchModal.open({
                tableID: 'BranchID',
                moduleID: getModuleId(),
                pageSize: 1000,
                advFilterString: "BankID='" + escapeSql(getBankId()) + "'",
                whereStmt: '',
                searchKey: '',
                onSelect: function (row) {
                    applyBranch(
                        pickValue(row, ['BranchID', 'OurBranchID', 'SubCodeID']),
                        pickValue(row, ['BranchName', 'Description', 'Name'])
                    );
                    showMessage('Branch selected.', 'info');
                }
            });
        } catch (error) {
            console.error('[MergeClientAccounts] Branch lookup error:', error);
            notify(error.message || 'Error opening branch search.', 'error');
        }
    }

    async function openClientModal(target) {
        const branchId = getBranchId();
        if (!branchId) {
            notify('Branch ID is required before searching for clients.', 'warning');
            return;
        }

        const searchModal = ensureSearchModal();
        if (!searchModal) {
            notify('Search modal is not available.', 'error');
            return;
        }

        try {
            await searchModal.open({
                tableID: 'ClientID',
                moduleID: getModuleId(),
                pageSize: 1000,
                whereStmt: "OurBranchID = '" + escapeSql(branchId) + "'",
                advFilterString: '',
                searchKey: '',
                ourbranchId: branchId,
                onSelect: function (row) {
                    const clientId = String(pickValue(row, ['ClientID', 'ID', 'CustomerID', 'CustomerCode']) || '').trim();
                    const clientName = String(pickValue(row, ['ClientName', 'Name', 'FullName']) || '').trim();
                    if (!clientId) {
                        notify('Selected record does not contain Client ID.', 'warning');
                        return;
                    }

                    applyClient(target, clientId, clientName);
                    showMessage('Client selected.', 'info');
                }
            });
        } catch (error) {
            console.error('[MergeClientAccounts] Client lookup error:', error);
            notify(error.message || 'Error opening client search.', 'error');
        }
    }

    async function handleView() {
        const branchId = getBranchId();
        const fromClientId = getFromClientId();
        const toClientId = getToClientId();

        if (!branchId) {
            notify('Branch ID is required.', 'warning');
            return;
        }

        if (!fromClientId || !toClientId) {
            notify('Source and target Client/Account IDs are required.', 'warning');
            return;
        }

        if (fromClientId === toClientId) {
            notify('Source and target clients must be different.', 'warning');
            return;
        }

        showLoading(true);
        updateStatusBar('Loading client accounts...');

        try {
            const response = await invokeController('AccountCustomers/MergeClientAccounts/view-accounts', {
                ourBranchID: branchId,
                fromClientID: fromClientId,
                toClientID: toClientId
            });

            if (!response?.success || !response.data) {
                await notify(response?.message || 'Unable to load accounts.', 'warning');
                return;
            }

            const data = response.data;
            applyBranch(data.branch?.branchId || branchId, data.branch?.branchName || state.branchName);
            applyClient('from', data.sourceClient?.clientId || fromClientId, data.sourceClient?.clientName || '');
            applyClient('to', data.targetClient?.clientId || toClientId, data.targetClient?.clientName || '');

            state.fromAccounts = Array.isArray(data.fromAccounts) ? data.fromAccounts : [];
            state.toAccounts = Array.isArray(data.toAccounts) ? data.toAccounts : [];
            state.selectedAccounts.clear();

            renderFromAccounts();
            renderToAccounts();
            updateSummary();
            syncActionButtons();
            showMessage(
                'Loaded ' + state.fromAccounts.length + ' source account(s) and ' + state.toAccounts.length + ' target account(s).',
                'info'
            );
        } catch (error) {
            await notify(error.message || 'Error loading accounts.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function mergeAccounts() {
        if (state.selectedAccounts.size === 0) {
            await notify('Select at least one source account.', 'warning');
            return;
        }

        const fromClientId = getFromClientId();
        const toClientId = getToClientId();
        if (!fromClientId || !toClientId || fromClientId === toClientId) {
            await notify('Source and target clients must be different.', 'warning');
            return;
        }

        const selectedAccountIds = [];
        state.selectedAccounts.forEach((index) => {
            selectedAccountIds.push(String(pickValue(state.fromAccounts[index], ['AccountID', 'ID']) || ''));
        });

        const confirmed = await showConfirmDialog('Confirm merge', 'Are you sure you want to merge the selected accounts? This action cannot be undone.');
        if (!confirmed) {
            return;
        }

        showLoading(true);
        updateStatusBar('Merging accounts...');

        try {
            const response = await invokeController('AccountCustomers/MergeClientAccounts/merge', {
                ourBranchID: getBranchId(),
                moduleID: 0,
                fromClientID: fromClientId,
                toClientID: toClientId,
                selectedAccount: selectedAccountIds.join('|')
            });

            if (!response?.success) {
                await notify(response?.message || 'Merge failed.', 'error');
                return;
            }

            showMessage(response.message || 'Merge completed successfully.', 'success');
            await handleView();
        } catch (error) {
            await notify(error.message || 'Error merging accounts.', 'error');
        } finally {
            showLoading(false);
        }
    }

    function clearForm() {
        state.fromClientId = '';
        state.fromClientName = '';
        state.toClientId = '';
        state.toClientName = '';
        state.fromAccounts = [];
        state.toAccounts = [];
        state.selectedAccounts.clear();

        if (elements.fromClientId) elements.fromClientId.value = '';
        if (elements.fromClientName) elements.fromClientName.value = '';
        if (elements.toClientId) elements.toClientId.value = '';
        if (elements.toClientName) elements.toClientName.value = '';

        renderFromAccounts();
        renderToAccounts();
        updateSummary();
        syncActionButtons();
        showMessage('Form cleared.', 'info');
    }

    function wireEvents() {
        elements.btnBranchLookup?.addEventListener('click', openBranchModal);
        elements.btnFromClientLookup?.addEventListener('click', () => openClientModal('from'));
        elements.btnToClientLookup?.addEventListener('click', () => openClientModal('to'));

        elements.localViewBtn?.addEventListener('click', handleView);
        elements.localMergeBtn?.addEventListener('click', mergeAccounts);
        elements.localClearBtn?.addEventListener('click', clearForm);
        elements.localCancelBtn?.addEventListener('click', cancelSelection);

        elements.branchId?.addEventListener('input', () => {
            state.branchId = String(elements.branchId?.value || '').trim();
            syncActionButtons();
        });

        elements.fromClientId?.addEventListener('input', () => {
            state.fromClientId = String(elements.fromClientId?.value || '').trim();
            syncActionButtons();
        });

        elements.toClientId?.addEventListener('input', () => {
            state.toClientId = String(elements.toClientId?.value || '').trim();
            syncActionButtons();
        });

        elements.branchId?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                resolveBranchById();
            }
        });

        elements.fromClientId?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                resolveClientByInput('from', elements.fromClientId.value);
            }
        });

        elements.toClientId?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                resolveClientByInput('to', elements.toClientId.value);
            }
        });

        elements.selectAllFrom?.addEventListener('change', (event) => {
            const shouldSelect = !!event.target.checked;
            if (shouldSelect) {
                state.fromAccounts.forEach((_, index) => state.selectedAccounts.add(index));
            } else {
                state.selectedAccounts.clear();
            }
            renderFromAccounts();
            updateSummary();
            syncActionButtons();
        });

        elements.messagePanelClose?.addEventListener('click', () => {
            elements.messagePanel?.classList.remove('show');
            if (elements.messagePanel) {
                elements.messagePanel.hidden = true;
            }
        });

        document.querySelectorAll('.am-header [data-action="close"]').forEach((button) => {
            button.addEventListener('click', () => {
                if (window.parent && window.parent !== window) {
                    window.parent.postMessage({ action: 'submoduleClosed', source: 'Merge Client Accounts' }, '*');
                } else {
                    window.close();
                }
            });
        });

        document.querySelectorAll('.am-header [data-action="refresh"]').forEach((button) => {
            button.addEventListener('click', () => window.location.reload());
        });

        document.querySelectorAll('#mergeClientAccountsModule [data-section-toggle]').forEach((toggle) => {
            toggle.addEventListener('click', (event) => {
                const trigger = event.currentTarget;
                const section = trigger.closest('.form-section');
                const content = section ? section.querySelector('[data-section-content]') || section.querySelector('.section-content') : null;
                const icon = trigger.querySelector('.section-toggle-btn i') || trigger.querySelector('i.bi-chevron-up, i.bi-chevron-down');
                const button = trigger.classList.contains('section-toggle-btn') ? trigger : trigger.querySelector('.section-toggle-btn');

                if (!content) {
                    return;
                }

                const willExpand = content.style.display === 'none';
                content.style.display = willExpand ? 'block' : 'none';

                if (icon) {
                    icon.className = willExpand ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
                }

                if (button) {
                    button.setAttribute('aria-expanded', willExpand ? 'true' : 'false');
                }
            });
        });
    }

    function init() {
        ensureSearchModal();
        wireEvents();
        renderFromAccounts();
        renderToAccounts();
        updateSummary();
        syncActionButtons();
        updateStatusBar('Ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
