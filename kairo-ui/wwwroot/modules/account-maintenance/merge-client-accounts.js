(function () {
    'use strict';

    const moduleRoot = document.getElementById('mergeClientAccountsModule');
    if (!moduleRoot) {
        return;
    }

    const state = {
        branchId: moduleRoot.dataset.branchId || '',
        branchName: moduleRoot.dataset.branchName || '',
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
        clientRows: [],
        branchRows: [],
        branchRowsRaw: [],
        hasBranchSearchRun: false
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
        selectedCountDisplay: document.getElementById('selectedCountDisplay'),
        summaryBalance: document.getElementById('summaryBalance'),
        mergeReadyBadge: document.getElementById('mergeReadyBadge'),
        btnView: document.getElementById('btnView'),
        btnMerge: document.getElementById('btnMerge'),
        btnClear: document.getElementById('btnClear'),
        btnCancel: document.getElementById('btnCancel'),
        loadingOverlay: document.getElementById('loadingOverlay'),
        statusBar: document.getElementById('mergeClientAccountsStatus'),
        messagePanel: document.getElementById('amMessagePanel'),
        messagePanelText: document.getElementById('messagePanelText'),
        messagePanelIcon: document.getElementById('messagePanelIcon'),
        messagePanelClose: document.getElementById('messagePanelClose'),
        branchSearchModal: document.getElementById('branchSearchModal'),
        filterBranchIDOperator: document.getElementById('filterBranchIDOperator'),
        filterBranchID: document.getElementById('filterBranchID'),
        filterBranchNameOperator: document.getElementById('filterBranchNameOperator'),
        filterBranchName: document.getElementById('filterBranchName'),
        btnSearchBranches: document.getElementById('btnSearchBranches'),
        btnClearBranchFilters: document.getElementById('btnClearBranchFilters'),
        branchSearchResultsBody: document.getElementById('branchSearchResultsBody'),
        btnSelectBranch: document.getElementById('btnSelectBranch'),
        clientSearchModal: document.getElementById('clientSearchModal'),
        filterClientID: document.getElementById('filterClientID'),
        filterName: document.getElementById('filterName'),
        filterIDNumber: document.getElementById('filterIDNumber'),
        filterMobileNo: document.getElementById('filterMobileNo'),
        filterClientApplicationID: document.getElementById('filterClientApplicationID'),
        filterAccountID: document.getElementById('filterAccountID'),
        filterMotherName: document.getElementById('filterMotherName'),
        btnSearchClients: document.getElementById('btnSearchClients'),
        btnClearFilters: document.getElementById('btnClearFilters'),
        clientSearchResultsBody: document.getElementById('clientSearchResultsBody'),
        btnSelectClient: document.getElementById('btnSelectClient')
    };

    let branchModal = null;
    let clientModal = null;
    let messageTimer = 0;
    const branchSearchHintText = 'select branch, click search to load';

    function invokeController(endpoint, requestData) {
        if (!window.AppCore || typeof window.AppCore.invokeControllerAsync !== 'function') {
            return Promise.reject(new Error('AppCore is unavailable.'));
        }

        return window.AppCore.invokeControllerAsync(endpoint, requestData || {});
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
        updateMergeButton();
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

    function getBranchId() {
        return (elements.branchId?.value || state.branchId || '').trim();
    }

    function getFromClientId() {
        return (elements.fromClientId?.value || state.fromClientId || '').trim();
    }

    function getToClientId() {
        return (elements.toClientId?.value || state.toClientId || '').trim();
    }

    function resetClientFilters() {
        if (elements.filterClientID) elements.filterClientID.value = '';
        if (elements.filterName) elements.filterName.value = '';
        if (elements.filterIDNumber) elements.filterIDNumber.value = '';
        if (elements.filterMobileNo) elements.filterMobileNo.value = '';
        if (elements.filterClientApplicationID) elements.filterClientApplicationID.value = '';
        if (elements.filterAccountID) elements.filterAccountID.value = '';
        if (elements.filterMotherName) elements.filterMotherName.value = '';
    }

    function resetBranchFilters() {
        if (elements.filterBranchIDOperator) elements.filterBranchIDOperator.value = 'Like';
        if (elements.filterBranchID) elements.filterBranchID.value = '';
        if (elements.filterBranchNameOperator) elements.filterBranchNameOperator.value = 'Like';
        if (elements.filterBranchName) elements.filterBranchName.value = '';
        state.selectedBranchRow = null;
        if (elements.btnSelectBranch) {
            elements.btnSelectBranch.disabled = true;
        }
    }

    function normalizeText(value) {
        return String(value || '').trim().toLowerCase();
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

        if (!state.fromAccounts.length) {
            elements.fromAccountsGrid.innerHTML = '<tr><td colspan="6" class="text-center text-muted py-3">No records to display.</td></tr>';
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

        if (!state.toAccounts.length) {
            elements.toAccountsGrid.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-3">No records to display.</td></tr>';
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

    function applyBranch(branchId, branchName) {
        state.branchId = String(branchId || '').trim();
        state.branchName = String(branchName || '').trim();
        if (elements.branchId) elements.branchId.value = state.branchId;
        if (elements.branchName) elements.branchName.value = state.branchName;
    }

    function applyClient(target, clientId, clientName) {
        const normalizedClientId = String(clientId || '').trim();
        const normalizedClientName = String(clientName || '').trim();
        if (!normalizedClientId) {
            return false;
        }

        if (target === 'from' && normalizedClientId === getToClientId()) {
            showMessage('Target client cannot be same as source client.', 'warning');
            return false;
        }

        if (target === 'to' && normalizedClientId === getFromClientId()) {
            showMessage('Target client cannot be same as source client.', 'warning');
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
        updateMergeButton();
        return true;
    }

    async function resolveBranchById() {
        const branchId = getBranchId();
        if (!branchId) {
            return false;
        }

        showLoading(true);
        try {
            const response = await invokeController('AccountCustomers/MergeClientAccounts/resolve-branch', {
                branchId: branchId
            });

            if (!response?.success || !response.data) {
                showMessage(response?.message || 'Branch not found.', 'warning');
                return false;
            }

            applyBranch(response.data.branchId, response.data.branchName);
            showMessage(response.message || 'Branch resolved.', 'info');
            return true;
        } catch (error) {
            showMessage(error.message || 'Error resolving branch.', 'error');
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

        showLoading(true);
        try {
            const response = await invokeController('AccountCustomers/MergeClientAccounts/resolve-client', {
                clientId: lookupId,
                ourBranchID: getBranchId()
            });

            if (!response?.success || !response.data) {
                showMessage(response?.message || 'Client/Account not found.', 'warning');
                return false;
            }

            const applied = applyClient(target, response.data.clientId, response.data.clientName);
            if (applied) {
                showMessage(response.message || 'Client resolved.', 'info');
            }
            return applied;
        } catch (error) {
            showMessage(error.message || 'Error resolving client/account.', 'error');
            return false;
        } finally {
            showLoading(false);
        }
    }

    function renderBranchSearchResults(rows) {
        if (!elements.branchSearchResultsBody) {
            return;
        }

        state.selectedBranchRow = null;
        if (elements.btnSelectBranch) {
            elements.btnSelectBranch.disabled = true;
        }

        if (!rows.length) {
            elements.branchSearchResultsBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">No branches found.</td></tr>';
            return;
        }

        elements.branchSearchResultsBody.innerHTML = rows.map((row, index) => {
            const branchId = String(pickValue(row, ['BranchID', 'OurBranchID', 'SubCodeID']) || '-');
            const branchName = String(pickValue(row, ['BranchName', 'Description', 'Name']) || '-');
            return '<tr data-index="' + index + '"><td>' + (index + 1) + '</td><td>' + branchId + '</td><td>' + branchName + '</td></tr>';
        }).join('');

        elements.branchSearchResultsBody.querySelectorAll('tr[data-index]').forEach((row) => {
            row.addEventListener('click', () => {
                elements.branchSearchResultsBody.querySelectorAll('tr').forEach((item) => item.classList.remove('selected'));
                row.classList.add('selected');
                state.selectedBranchRow = rows[Number(row.dataset.index)];
                if (elements.btnSelectBranch) elements.btnSelectBranch.disabled = false;
            });

            row.addEventListener('dblclick', () => {
                state.selectedBranchRow = rows[Number(row.dataset.index)];
                selectBranchFromModal();
            });
        });
    }

    function renderBranchSearchPrompt(message) {
        if (!elements.branchSearchResultsBody) {
            return;
        }

        state.selectedBranchRow = null;
        if (elements.btnSelectBranch) {
            elements.btnSelectBranch.disabled = true;
        }

        elements.branchSearchResultsBody.innerHTML = '<tr><td colspan="3" class="text-center text-muted py-4">'
            + (message || branchSearchHintText) + '</td></tr>';
    }

    function applyBranchFiltersToCurrentResults() {
        const branchIdFilter = elements.filterBranchID?.value || '';
        const branchNameFilter = elements.filterBranchName?.value || '';
        const branchIdOperator = elements.filterBranchIDOperator?.value || 'Like';
        const branchNameOperator = elements.filterBranchNameOperator?.value || 'Like';

        if (!state.hasBranchSearchRun) {
            renderBranchSearchPrompt(branchSearchHintText);
            updateStatusBar(branchSearchHintText);
            return;
        }

        const filteredRows = filterBranchRows(state.branchRowsRaw, branchIdFilter, branchNameFilter, branchIdOperator, branchNameOperator);

        state.branchRows = filteredRows;

        if (!state.branchRowsRaw.length && !branchIdFilter && !branchNameFilter) {
            renderBranchSearchPrompt(branchSearchHintText);
            updateStatusBar(branchSearchHintText);
            return;
        }

        renderBranchSearchResults(filteredRows);
        if (!filteredRows.length) {
            updateStatusBar('No details Found [No:1011]');
            return;
        }

        updateStatusBar('Found ' + filteredRows.length + ' branch(s)');
    }

    async function searchBranches() {
        showLoading(true);
        try {
            const branchIdFilter = elements.filterBranchID?.value || '';
            const branchNameFilter = elements.filterBranchName?.value || '';
            const branchIdOperator = elements.filterBranchIDOperator?.value || 'Like';
            const branchNameOperator = elements.filterBranchNameOperator?.value || 'Like';

            state.hasBranchSearchRun = true;
            const response = await invokeController('AccountCustomers/MergeClientAccounts/search-branches', {
                branchID: branchIdFilter,
                branchName: branchNameFilter
            });

            const serverRows = response?.success && Array.isArray(response.data) ? response.data : [];
            state.branchRowsRaw = serverRows;
            state.branchRows = filterBranchRows(serverRows, branchIdFilter, branchNameFilter, branchIdOperator, branchNameOperator);
            renderBranchSearchResults(state.branchRows);

            if (!state.branchRows.length) {
                updateStatusBar('No details Found [No:1011]');
            } else {
                updateStatusBar('Found ' + state.branchRows.length + ' branch(s)');
            }
        } catch (error) {
            updateStatusBar('Error searching branches');
            showMessage(error.message || 'Error searching branches.', 'error');
        } finally {
            showLoading(false);
        }
    }

    function selectBranchFromModal() {
        if (!state.selectedBranchRow) {
            return;
        }

        applyBranch(
            pickValue(state.selectedBranchRow, ['BranchID', 'OurBranchID', 'SubCodeID']),
            pickValue(state.selectedBranchRow, ['BranchName', 'Description', 'Name'])
        );

        if (branchModal) {
            branchModal.hide();
        }
    }

    function renderClientSearchResults(rows) {
        if (!elements.clientSearchResultsBody) {
            return;
        }

        if (!rows.length) {
            elements.clientSearchResultsBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted py-4">No clients found.</td></tr>';
            if (elements.btnSelectClient) elements.btnSelectClient.disabled = true;
            return;
        }

        elements.clientSearchResultsBody.innerHTML = rows.map((row, index) => {
            const clientId = String(pickValue(row, ['ClientID', 'ID', 'CustomerID', 'CustomerCode']) || '-');
            const name = String(pickValue(row, ['Name', 'ClientName', 'FullName']) || '-');
            const idNo = String(pickValue(row, ['IDNumber', 'NationalID']) || '-');
            const appId = String(pickValue(row, ['ApplicationID', 'ClientApplicationID']) || '-');
            const clientType = String(pickValue(row, ['ClientTypeID', 'ClientType']) || '-');
            return '<tr data-index="' + index + '"><td>' + clientId + '</td><td>' + name + '</td><td>' + idNo + '</td><td>' + appId + '</td><td>' + clientType + '</td></tr>';
        }).join('');

        elements.clientSearchResultsBody.querySelectorAll('tr[data-index]').forEach((row) => {
            row.addEventListener('click', () => {
                elements.clientSearchResultsBody.querySelectorAll('tr').forEach((item) => item.classList.remove('selected'));
                row.classList.add('selected');
                state.selectedClientRow = rows[Number(row.dataset.index)];
                if (elements.btnSelectClient) elements.btnSelectClient.disabled = false;
            });

            row.addEventListener('dblclick', () => {
                state.selectedClientRow = rows[Number(row.dataset.index)];
                selectClientFromModal();
            });
        });
    }

    async function searchClients() {
        showLoading(true);
        try {
            const response = await invokeController('AccountCustomers/MergeClientAccounts/search-clients', {
                ourBranchID: getBranchId(),
                clientID: elements.filterClientID?.value || '',
                name: elements.filterName?.value || '',
                idNumber: elements.filterIDNumber?.value || '',
                mobileNo: elements.filterMobileNo?.value || '',
                clientApplicationID: elements.filterClientApplicationID?.value || '',
                accountID: elements.filterAccountID?.value || '',
                motherName: elements.filterMotherName?.value || ''
            });

            state.clientRows = response?.success && Array.isArray(response.data) ? response.data : [];
            renderClientSearchResults(state.clientRows);
            updateStatusBar(response?.message || ('Found ' + state.clientRows.length + ' clients'));
        } catch (error) {
            showMessage(error.message || 'Error searching clients.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function selectClientFromModal() {
        if (!state.selectedClientRow) {
            return;
        }

        const selectedClientId = String(pickValue(state.selectedClientRow, ['ClientID', 'ID', 'CustomerID', 'CustomerCode']) || '').trim();
        const selectedClientName = String(pickValue(state.selectedClientRow, ['Name', 'ClientName', 'FullName']) || '').trim();

        if (selectedClientId) {
            const applied = applyClient(state.searchTarget, selectedClientId, selectedClientName);
            if (!applied) {
                return;
            }
            if (clientModal) {
                clientModal.hide();
            }
            return;
        }

        const accountId = String(pickValue(state.selectedClientRow, ['AccountID', 'ID']) || '').trim();
        if (accountId) {
            const appliedFromResolve = await resolveClientByInput(state.searchTarget, accountId);
            if (appliedFromResolve && clientModal) {
                clientModal.hide();
            }
            return;
        }

        showMessage('Selected record does not contain Client/Account ID.', 'warning');
    }

    function openBranchModal() {
        state.selectedBranchRow = null;
        state.branchRows = [];
        state.branchRowsRaw = [];
        state.hasBranchSearchRun = false;
        resetBranchFilters();
        renderBranchSearchPrompt(branchSearchHintText);
        updateStatusBar(branchSearchHintText);
        if (branchModal) {
            branchModal.show();
        }
    }

    function openClientModal(target) {
        state.searchTarget = target;
        state.selectedClientRow = null;
        resetClientFilters();
        renderClientSearchResults([]);
        if (clientModal) {
            clientModal.show();
            window.setTimeout(() => {
                searchClients();
            }, 100);
        }
    }

    async function handleView() {
        const branchId = getBranchId();
        const fromClientId = getFromClientId();
        const toClientId = getToClientId();

        if (!branchId) {
            showMessage('Branch ID is required.', 'warning');
            return;
        }

        if (!fromClientId || !toClientId) {
            showMessage('Source and target Client/Account IDs are required.', 'warning');
            return;
        }

        if (fromClientId === toClientId) {
            showMessage('Source and target clients must be different.', 'warning');
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
                showMessage(response?.message || 'Unable to load accounts.', 'warning');
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
            updateMergeButton();
            showMessage(response.message || 'Accounts loaded.', 'info');
        } catch (error) {
            showMessage(error.message || 'Error loading accounts.', 'error');
        } finally {
            showLoading(false);
        }
    }

    async function mergeAccounts() {
        if (state.selectedAccounts.size === 0) {
            showMessage('Select at least one source account.', 'warning');
            return;
        }

        const fromClientId = getFromClientId();
        const toClientId = getToClientId();
        if (!fromClientId || !toClientId || fromClientId === toClientId) {
            showMessage('Source and target clients must be different.', 'warning');
            return;
        }

        const selectedAccountIds = [];
        state.selectedAccounts.forEach((index) => {
            selectedAccountIds.push(String(pickValue(state.fromAccounts[index], ['AccountID', 'ID']) || ''));
        });

        const confirmed = window.confirm('Are you sure you want to merge the selected accounts? This action cannot be undone.');
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
                showMessage(response?.message || 'Merge failed.', 'error');
                return;
            }

            showMessage(response.message || 'Merge completed successfully.', 'success');
            await handleView();
        } catch (error) {
            showMessage(error.message || 'Error merging accounts.', 'error');
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
        updateMergeButton();
        showMessage('Form cleared.', 'info');
    }

    function wireEvents() {
        elements.btnBranchLookup?.addEventListener('click', openBranchModal);
        elements.btnFromClientLookup?.addEventListener('click', () => openClientModal('from'));
        elements.btnToClientLookup?.addEventListener('click', () => openClientModal('to'));

        elements.btnSearchBranches?.addEventListener('click', searchBranches);
        elements.btnClearBranchFilters?.addEventListener('click', () => {
            resetBranchFilters();
            if (state.branchRowsRaw.length) {
                state.hasBranchSearchRun = true;
                state.branchRows = state.branchRowsRaw.slice();
                renderBranchSearchResults(state.branchRows);
                updateStatusBar('Found ' + state.branchRows.length + ' branch(s)');
            } else {
                state.hasBranchSearchRun = false;
                renderBranchSearchPrompt(branchSearchHintText);
                updateStatusBar(branchSearchHintText);
            }
        });
        elements.btnSelectBranch?.addEventListener('click', selectBranchFromModal);

        elements.btnSearchClients?.addEventListener('click', searchClients);
        elements.btnClearFilters?.addEventListener('click', resetClientFilters);
        elements.btnSelectClient?.addEventListener('click', selectClientFromModal);

        elements.btnView?.addEventListener('click', handleView);
        elements.btnMerge?.addEventListener('click', mergeAccounts);
        elements.btnClear?.addEventListener('click', clearForm);
        elements.btnCancel?.addEventListener('click', () => {
            state.selectedAccounts.clear();
            renderFromAccounts();
            updateSummary();
            updateMergeButton();
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
            updateMergeButton();
        });

        elements.filterBranchID?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchBranches();
            }
        });

        elements.filterBranchName?.addEventListener('keydown', (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                searchBranches();
            }
        });

        elements.filterBranchIDOperator?.addEventListener('change', () => {
            applyBranchFiltersToCurrentResults();
        });

        elements.filterBranchNameOperator?.addEventListener('change', () => {
            applyBranchFiltersToCurrentResults();
        });

        elements.filterBranchID?.addEventListener('input', () => {
            applyBranchFiltersToCurrentResults();
        });

        elements.filterBranchName?.addEventListener('input', () => {
            applyBranchFiltersToCurrentResults();
        });

        [
            elements.filterClientID,
            elements.filterName,
            elements.filterIDNumber,
            elements.filterMobileNo,
            elements.filterClientApplicationID,
            elements.filterAccountID,
            elements.filterMotherName
        ].forEach((input) => {
            input?.addEventListener('keydown', (event) => {
                if (event.key === 'Enter') {
                    event.preventDefault();
                    searchClients();
                }
            });
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
    }

    function initModals() {
        if (window.bootstrap && elements.branchSearchModal) {
            branchModal = new window.bootstrap.Modal(elements.branchSearchModal);
        }

        if (window.bootstrap && elements.clientSearchModal) {
            clientModal = new window.bootstrap.Modal(elements.clientSearchModal);
        }
    }

    function init() {
        initModals();
        wireEvents();
        renderFromAccounts();
        renderToAccounts();
        updateSummary();
        updateMergeButton();
        updateStatusBar('Ready');
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
