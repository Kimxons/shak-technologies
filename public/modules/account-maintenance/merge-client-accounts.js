/**
 * Merge Client Accounts Module
 * Handles merging accounts from one client to another
 * Uses real API calls via CoreApi
 */
(function() {
    'use strict';

    // ============================================================
    // CONFIGURATION
    // ============================================================
    const CONFIG = {
        operatorId: 'JOHN_KIMANI',
        formId: '700', // Adjust as needed
        appName: 'PROJECT_KAIRO'
    };

    // ============================================================
    // STATE MANAGEMENT
    // ============================================================
    const state = {
        branchId: '',
        branchName: '',
        fromClientId: '',
        fromClientName: '',
        fromClientData: null,
        toClientId: '',
        toClientName: '',
        toClientData: null,
        fromAccounts: [],
        toAccounts: [],
        selectedAccounts: new Set(),
        searchTarget: null, // 'from' or 'to'
        selectedClient: null,
        selectedBranch: null
    };

    // ============================================================
    // DOM ELEMENTS
    // ============================================================
    const elements = {
        // Branch
        branchId: document.getElementById('branchId'),
        branchName: document.getElementById('branchName'),
        btnBranchLookup: document.getElementById('btnBranchLookup'),
        
        // From Client
        fromClientId: document.getElementById('fromClientId'),
        fromClientName: document.getElementById('fromClientName'),
        btnFromClientLookup: document.getElementById('btnFromClientLookup'),
        fromAccountsGrid: document.getElementById('fromAccountsGrid'),
        selectAllFrom: document.getElementById('selectAllFrom'),
        
        // To Client
        toClientId: document.getElementById('toClientId'),
        toClientName: document.getElementById('toClientName'),
        btnToClientLookup: document.getElementById('btnToClientLookup'),
        toAccountsGrid: document.getElementById('toAccountsGrid'),
        
        // Summary
        selectedCount: document.getElementById('selectedCount'),
        totalBalance: document.getElementById('totalBalance'),
        
        // Actions
        btnView: document.getElementById('btnView'),
        btnMerge: document.getElementById('btnMerge'),
        btnClear: document.getElementById('btnClear'),
        
        // UI
        loadingOverlay: document.getElementById('loadingOverlay'),
        messageBar: document.getElementById('messageBar'),

        // Client Search Modal
        clientSearchModal: null,
        filterClientID: document.getElementById('filterClientID'),
        filterName: document.getElementById('filterName'),
        filterIDNumber: document.getElementById('filterIDNumber'),
        filterMobileNo: document.getElementById('filterMobileNo'),
        filterClientApplicationID: document.getElementById('filterClientApplicationID'),
        filterAccountID: document.getElementById('filterAccountID'),
        filterMotherName: document.getElementById('filterMotherName'),
        btnClearFilters: document.getElementById('btnClearFilters'),
        btnSearchClients: document.getElementById('btnSearchClients'),
        clientSearchResultsBody: document.getElementById('clientSearchResultsBody'),
        btnSelectClient: document.getElementById('btnSelectClient'),

        // Branch Search Modal
        branchSearchModal: null,
        filterBranchID: document.getElementById('filterBranchID'),
        filterBranchName: document.getElementById('filterBranchName'),
        btnSearchBranches: document.getElementById('btnSearchBranches'),
        branchSearchResultsBody: document.getElementById('branchSearchResultsBody'),
        btnSelectBranch: document.getElementById('btnSelectBranch')
    };

    // ============================================================
    // API HELPER
    // ============================================================
    function getApiUrl() {
        const env = window.Environment || {};
        const baseUrl = (env.baseUrlCommon || env.baseUrlSystemCodes || env.baseUrlClient || 'http://172.16.2.31:3306').replace(/\/+$/, '');
        return `${baseUrl}/api/OldAPI`;
    }

    function getRequestTime() {
        const now = new Date();
        const pad2 = n => String(n).padStart(2, '0');
        return `${pad2(now.getMonth() + 1)}/${pad2(now.getDate())}/${now.getFullYear()} ${pad2(now.getHours())}:${pad2(now.getMinutes())}:${pad2(now.getSeconds())}`;
    }

    async function callApi(requestId, requestData) {
        const apiUrl = getApiUrl();
        const envelope = {
            RequestID: requestId,
            FormId: requestId,
            RequestData: requestData,
            RequestTime: getRequestTime(),
            AppName: CONFIG.appName,
            Checksum: ''
        };

        console.log('[API Request]', requestId, envelope);

        try {
            if (window.CoreApi && window.CoreApi.post) {
                const response = await window.CoreApi.post(apiUrl, envelope);
                console.log('[API Response]', requestId, response);
                return response;
            } else {
                // Fallback to fetch
                const response = await fetch(apiUrl, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(envelope)
                });
                const data = await response.json();
                console.log('[API Response]', requestId, data);
                return data;
            }
        } catch (error) {
            console.error('[API Error]', requestId, error);
            throw error;
        }
    }

    // ============================================================
    // UI HELPERS
    // ============================================================
    function showLoading(show = true) {
        if (elements.loadingOverlay) {
            elements.loadingOverlay.hidden = !show;
        }
    }

    function showMessage(message, type = 'info') {
        if (elements.messageBar) {
            elements.messageBar.textContent = message;
            elements.messageBar.className = `de-message-bar de-message-bar--${type}`;
            elements.messageBar.hidden = false;
            
            setTimeout(() => {
                elements.messageBar.hidden = true;
            }, 3000);
        }
    }

    function updateStatusBar(message) {
        const statusBar = document.querySelector('.de-status-bar');
        if (statusBar) {
            statusBar.textContent = message;
        }
    }

    // ============================================================
    // TABLE RENDERING
    // ============================================================
    function renderFromAccountsTable(accounts) {
        if (!elements.fromAccountsGrid) return;
        
        if (!accounts || accounts.length === 0) {
            elements.fromAccountsGrid.innerHTML = `
                <tr>
                    <td colspan="6">
                        <div class="empty-state">
                            <i class="bi bi-inbox d-block"></i>
                            <span>No accounts found for this client.</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        elements.fromAccountsGrid.innerHTML = accounts.map((acc, index) => `
            <tr data-index="${index}" class="${state.selectedAccounts.has(index) ? 'selected' : ''}">
                <td>
                    <input type="checkbox" class="form-check-input account-checkbox" 
                           data-index="${index}" 
                           ${state.selectedAccounts.has(index) ? 'checked' : ''} 
                           aria-label="Select account ${acc.AccountID || ''}" />
                </td>
                <td>${acc.AccountType || acc.AccountTypeID || '-'}</td>
                <td>${acc.OurBranchID || '-'}</td>
                <td>${acc.ProductID || '-'}</td>
                <td class="fw-medium">${acc.AccountID || '-'}</td>
                <td class="text-end">${formatCurrency(acc.ClearBalance || acc.ClearedBalance || 0)}</td>
            </tr>
        `).join('');

        // Attach checkbox listeners
        elements.fromAccountsGrid.querySelectorAll('.account-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', handleAccountSelection);
        });

        // Attach row click listeners
        elements.fromAccountsGrid.querySelectorAll('tr[data-index]').forEach(row => {
            row.addEventListener('click', (e) => {
                if (e.target.type !== 'checkbox') {
                    const checkbox = row.querySelector('.account-checkbox');
                    if (checkbox) {
                        checkbox.checked = !checkbox.checked;
                        checkbox.dispatchEvent(new Event('change'));
                    }
                }
            });
        });
    }

    function renderToAccountsTable(accounts) {
        if (!elements.toAccountsGrid) return;
        
        if (!accounts || accounts.length === 0) {
            elements.toAccountsGrid.innerHTML = `
                <tr>
                    <td colspan="5">
                        <div class="empty-state">
                            <i class="bi bi-inbox d-block"></i>
                            <span>No accounts found for this client.</span>
                        </div>
                    </td>
                </tr>
            `;
            return;
        }

        elements.toAccountsGrid.innerHTML = accounts.map((acc) => `
            <tr>
                <td>${acc.AccountType || acc.AccountTypeID || '-'}</td>
                <td>${acc.OurBranchID || '-'}</td>
                <td>${acc.ProductID || '-'}</td>
                <td class="fw-medium">${acc.AccountID || '-'}</td>
                <td class="text-end">${formatCurrency(acc.ClearBalance || acc.ClearedBalance || 0)}</td>
            </tr>
        `).join('');
    }

    function formatCurrency(value) {
        if (value === null || value === undefined) return '-';
        return new Intl.NumberFormat('en-US', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(value);
    }

    // ============================================================
    // SELECTION HANDLING
    // ============================================================
    function handleAccountSelection(e) {
        const index = parseInt(e.target.dataset.index);
        const row = e.target.closest('tr');
        
        if (e.target.checked) {
            state.selectedAccounts.add(index);
            row?.classList.add('selected');
        } else {
            state.selectedAccounts.delete(index);
            row?.classList.remove('selected');
        }
        
        updateSummary();
        updateMergeButton();
    }

    function handleSelectAll(e) {
        const checkboxes = elements.fromAccountsGrid.querySelectorAll('.account-checkbox');
        checkboxes.forEach(checkbox => {
            checkbox.checked = e.target.checked;
            const index = parseInt(checkbox.dataset.index);
            if (e.target.checked) {
                state.selectedAccounts.add(index);
            } else {
                state.selectedAccounts.delete(index);
            }
        });
        
        renderFromAccountsTable(state.fromAccounts);
        updateSummary();
        updateMergeButton();
    }

    function updateSummary() {
        const selectedCount = state.selectedAccounts.size;
        let totalBalance = 0;
        
        state.selectedAccounts.forEach(index => {
            if (state.fromAccounts[index]) {
                totalBalance += parseFloat(state.fromAccounts[index].ClearBalance || state.fromAccounts[index].ClearedBalance || 0);
            }
        });
        
        if (elements.selectedCount) {
            elements.selectedCount.textContent = selectedCount;
        }
        if (elements.totalBalance) {
            elements.totalBalance.textContent = formatCurrency(totalBalance);
        }
    }

    function updateMergeButton() {
        if (elements.btnMerge) {
            const canMerge = state.fromClientId && 
                            state.toClientId && 
                            state.selectedAccounts.size > 0 &&
                            state.fromClientId !== state.toClientId;
            elements.btnMerge.disabled = !canMerge;
        }
    }

    // ============================================================
    // CLIENT SEARCH MODAL
    // ============================================================
    function openClientSearchModal(target) {
        state.searchTarget = target;
        state.selectedClient = null;
        
        // Clear previous search
        clearClientSearchFilters();
        renderClientSearchResults([]);
        
        if (elements.btnSelectClient) {
            elements.btnSelectClient.disabled = true;
        }
        
        if (elements.clientSearchModal) {
            elements.clientSearchModal.show();
            // Auto-trigger search when modal opens
            setTimeout(() => searchClients(), 100);
        }
    }

    function clearClientSearchFilters() {
        if (elements.filterClientID) elements.filterClientID.value = '';
        if (elements.filterName) elements.filterName.value = '';
        if (elements.filterIDNumber) elements.filterIDNumber.value = '';
        if (elements.filterMobileNo) elements.filterMobileNo.value = '';
        if (elements.filterClientApplicationID) elements.filterClientApplicationID.value = '';
        if (elements.filterAccountID) elements.filterAccountID.value = '';
        if (elements.filterMotherName) elements.filterMotherName.value = '';
    }

    function renderClientSearchResults(clients) {
        if (!elements.clientSearchResultsBody) return;

        if (!clients || clients.length === 0) {
            elements.clientSearchResultsBody.innerHTML = `
                <tr>
                    <td colspan="5" class="text-center text-muted py-4">
                        <i class="bi bi-info-circle me-1"></i>No clients found. Enter search criteria and click Search.
                    </td>
                </tr>
            `;
            return;
        }

        elements.clientSearchResultsBody.innerHTML = clients.map((client, index) => `
            <tr data-index="${index}">
                <td>${client.ClientID || '-'}</td>
                <td>${client.Name || client.ClientName || '-'}</td>
                <td>${client.IDNumber || '-'}</td>
                <td>${client.ApplicationID || client.ClientApplicationID || '-'}</td>
                <td>${client.ClientTypeID || '-'}</td>
            </tr>
        `).join('');

        // Attach row click listeners
        elements.clientSearchResultsBody.querySelectorAll('tr[data-index]').forEach(row => {
            row.addEventListener('click', () => {
                // Remove previous selection
                elements.clientSearchResultsBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                // Select this row
                row.classList.add('selected');
                
                const index = parseInt(row.dataset.index);
                state.selectedClient = clients[index];
                
                if (elements.btnSelectClient) {
                    elements.btnSelectClient.disabled = false;
                }
            });

            // Double-click to select
            row.addEventListener('dblclick', () => {
                const index = parseInt(row.dataset.index);
                state.selectedClient = clients[index];
                handleClientSelection();
            });
        });
    }

    async function searchClients() {
        showLoading(true);
        updateStatusBar('Searching clients...');

        try {
            // Build search key from filters
            let searchKey = '';
            if (elements.filterClientID?.value) searchKey = elements.filterClientID.value;
            else if (elements.filterName?.value) searchKey = elements.filterName.value;
            else if (elements.filterIDNumber?.value) searchKey = elements.filterIDNumber.value;
            else if (elements.filterMobileNo?.value) searchKey = elements.filterMobileNo.value;
            else if (elements.filterClientApplicationID?.value) searchKey = elements.filterClientApplicationID.value;
            else if (elements.filterAccountID?.value) searchKey = elements.filterAccountID.value;
            else if (elements.filterMotherName?.value) searchKey = elements.filterMotherName.value;

            const branchId = state.branchId || elements.branchId?.value || '0101';

            const response = await callApi('dbo.p_GetSearchResult', {
                TableID: 'ClientID',
                AdvFilterString: '',
                WhereStmt: '',
                PrevOrNext: 0,
                RefID: null,
                OperatorID: CONFIG.operatorId,
                ModuleID: 0,
                OurBranchID: branchId,
                SearchKey: searchKey,
                LanguageID: 'en'
            });

            let clients = [];
            if (response && response.data) {
                clients = Array.isArray(response.data) ? response.data : [];
            } else if (response && response.Details) {
                clients = Array.isArray(response.Details) ? response.Details : [];
            } else if (response && response.Details01) {
                clients = Array.isArray(response.Details01) ? response.Details01 : [];
            }

            renderClientSearchResults(clients);
            updateStatusBar(`Found ${clients.length} clients`);
        } catch (error) {
            console.error('Error searching clients:', error);
            showMessage('Error searching clients', 'error');
            updateStatusBar('Error searching clients');
        } finally {
            showLoading(false);
        }
    }

    async function handleClientSelection() {
        if (!state.selectedClient) return;

        const client = state.selectedClient;

        if (state.searchTarget === 'from') {
            state.fromClientId = client.ClientID;
            state.fromClientName = client.Name || client.ClientName;
            state.fromClientData = client;
            
            if (elements.fromClientId) elements.fromClientId.value = client.ClientID;
            if (elements.fromClientName) elements.fromClientName.value = client.Name || client.ClientName || '';

            // Clear accounts - will be loaded when View is clicked
            state.fromAccounts = [];
            state.selectedAccounts.clear();
            renderFromAccountsTable([]);
            updateSummary();
            
            updateStatusBar(`Selected source client: ${client.ClientID}. Click View to load accounts.`);
        } else if (state.searchTarget === 'to') {
            if (client.ClientID === state.fromClientId) {
                showMessage('Target client cannot be the same as source client', 'error');
                return;
            }

            state.toClientId = client.ClientID;
            state.toClientName = client.Name || client.ClientName;
            state.toClientData = client;
            
            if (elements.toClientId) elements.toClientId.value = client.ClientID;
            if (elements.toClientName) elements.toClientName.value = client.Name || client.ClientName || '';

            // Clear accounts - will be loaded when View is clicked
            state.toAccounts = [];
            renderToAccountsTable([]);
            
            updateStatusBar(`Selected target client: ${client.ClientID}. Click View to load accounts.`);
        }

        updateMergeButton();
        
        if (elements.clientSearchModal) {
            elements.clientSearchModal.hide();
        }
    }

    // ============================================================
    // BRANCH SEARCH MODAL
    // ============================================================
    function openBranchSearchModal() {
        state.selectedBranch = null;
        
        // Clear previous search
        if (elements.filterBranchID) elements.filterBranchID.value = '';
        if (elements.filterBranchName) elements.filterBranchName.value = '';
        renderBranchSearchResults([]);
        
        if (elements.btnSelectBranch) {
            elements.btnSelectBranch.disabled = true;
        }
        
        if (elements.branchSearchModal) {
            elements.branchSearchModal.show();
            // Auto-trigger search when modal opens
            setTimeout(() => searchBranches(), 100);
        }
    }

    function renderBranchSearchResults(branches) {
        if (!elements.branchSearchResultsBody) return;

        if (!branches || branches.length === 0) {
            elements.branchSearchResultsBody.innerHTML = `
                <tr>
                    <td colspan="2" class="text-center text-muted py-4">
                        <i class="bi bi-info-circle me-1"></i>No branches found. Enter search criteria and click Search.
                    </td>
                </tr>
            `;
            return;
        }

        elements.branchSearchResultsBody.innerHTML = branches.map((branch, index) => `
            <tr data-index="${index}">
                <td>${branch.BranchID || branch.OurBranchID || '-'}</td>
                <td>${branch.BranchName || branch.Description || '-'}</td>
            </tr>
        `).join('');

        // Attach row click listeners
        elements.branchSearchResultsBody.querySelectorAll('tr[data-index]').forEach(row => {
            row.addEventListener('click', () => {
                // Remove previous selection
                elements.branchSearchResultsBody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
                // Select this row
                row.classList.add('selected');
                
                const index = parseInt(row.dataset.index);
                state.selectedBranch = branches[index];
                
                if (elements.btnSelectBranch) {
                    elements.btnSelectBranch.disabled = false;
                }
            });

            // Double-click to select
            row.addEventListener('dblclick', () => {
                const index = parseInt(row.dataset.index);
                state.selectedBranch = branches[index];
                handleBranchSelection();
            });
        });
    }

    async function searchBranches() {
        showLoading(true);
        updateStatusBar('Searching branches...');

        try {
            // Use pc_SearchSystemBranches like the branchSearchService
            const response = await callApi('dbo.pc_SearchSystemBranches', {
                BankID: '00'
            });

            let branches = [];
            if (response && response.data) {
                branches = Array.isArray(response.data) ? response.data : [];
            } else if (response && response.Details) {
                branches = Array.isArray(response.Details) ? response.Details : [];
            } else if (response && response.Details01) {
                branches = Array.isArray(response.Details01) ? response.Details01 : [];
            }

            // Apply client-side filtering if filters provided
            const filterBranchID = elements.filterBranchID?.value?.toLowerCase() || '';
            const filterBranchName = elements.filterBranchName?.value?.toLowerCase() || '';

            if (filterBranchID || filterBranchName) {
                branches = branches.filter(branch => {
                    const branchId = (branch.BranchID || branch.OurBranchID || '').toLowerCase();
                    const branchName = (branch.BranchName || branch.Description || '').toLowerCase();
                    
                    let match = true;
                    if (filterBranchID) match = match && branchId.includes(filterBranchID);
                    if (filterBranchName) match = match && branchName.includes(filterBranchName);
                    return match;
                });
            }

            renderBranchSearchResults(branches);
            updateStatusBar(`Found ${branches.length} branches`);
        } catch (error) {
            console.error('Error searching branches:', error);
            showMessage('Error searching branches', 'error');
            updateStatusBar('Error searching branches');
        } finally {
            showLoading(false);
        }
    }

    function handleBranchSelection() {
        if (!state.selectedBranch) return;

        const branch = state.selectedBranch;
        state.branchId = branch.BranchID || branch.OurBranchID;
        state.branchName = branch.BranchName || branch.Description;

        if (elements.branchId) elements.branchId.value = state.branchId;
        if (elements.branchName) elements.branchName.value = state.branchName;

        updateStatusBar(`Branch: ${state.branchName}`);
        
        if (elements.branchSearchModal) {
            elements.branchSearchModal.hide();
        }
    }

    // ============================================================
    // LOAD CLIENT ACCOUNTS
    // ============================================================
    async function loadClientAccounts(target, branchId, clientId) {
        showLoading(true);
        updateStatusBar(`Loading accounts for ${target === 'from' ? 'source' : 'target'} client...`);

        try {
            // Call p_GetCustomerQuery_MergeClientAccount with exact format
            const response = await callApi('dbo.p_GetCustomerQuery_MergeClientAccount ', {
                OurBranchID: branchId,
                ClientID: clientId,
                OperatorID: CONFIG.operatorId
            });

            let accounts = [];
            // Details01 contains the accounts, Details contains client info
            if (response && response.Details01 && Array.isArray(response.Details01)) {
                accounts = response.Details01;
            } else if (response && response.data && Array.isArray(response.data)) {
                accounts = response.data;
            } else if (response && response.Details && Array.isArray(response.Details)) {
                accounts = response.Details;
            }

            console.log(`[MergeClientAccounts] Loaded ${accounts.length} accounts for ${target} client:`, accounts);

            if (target === 'from') {
                state.fromAccounts = accounts;
                state.selectedAccounts.clear();
                renderFromAccountsTable(accounts);
                updateSummary();
            } else {
                state.toAccounts = accounts;
                renderToAccountsTable(accounts);
            }

            updateStatusBar(`Loaded ${accounts.length} accounts for ${target === 'from' ? 'source' : 'target'} client`);
        } catch (error) {
            console.error('Error loading accounts:', error);
            showMessage('Error loading client accounts', 'error');
            updateStatusBar('Error loading accounts');
            
            if (target === 'from') {
                state.fromAccounts = [];
                renderFromAccountsTable([]);
            } else {
                state.toAccounts = [];
                renderToAccountsTable([]);
            }
        } finally {
            showLoading(false);
        }
    }

    // ============================================================
    // DIRECT SEARCH HANDLERS (when pressing Enter or typing in the ID field)
    // ============================================================
    async function handleFromClientDirectSearch() {
        const clientId = elements.fromClientId?.value?.trim();
        if (!clientId) {
            showMessage('Please enter a Client ID or use the search button', 'warning');
            return;
        }

        const branchId = state.branchId || elements.branchId?.value || '0101';
        
        showLoading(true);
        try {
            // First, try to get client details
            const response = await callApi('dbo.p_GetSearchResult', {
                TableID: 'ClientID',
                AdvFilterString: '',
                WhereStmt: '',
                PrevOrNext: 0,
                RefID: null,
                OperatorID: CONFIG.operatorId,
                ModuleID: 0,
                OurBranchID: branchId,
                SearchKey: clientId,
                LanguageID: 'en'
            });

            let clients = [];
            if (response && response.data) {
                clients = Array.isArray(response.data) ? response.data : [];
            } else if (response && response.Details) {
                clients = Array.isArray(response.Details) ? response.Details : [];
            } else if (response && response.Details01) {
                clients = Array.isArray(response.Details01) ? response.Details01 : [];
            }

            // Find exact match or first result
            const client = clients.find(c => c.ClientID === clientId) || clients[0];

            if (client) {
                state.fromClientId = client.ClientID;
                state.fromClientName = client.Name || client.ClientName;
                state.fromClientData = client;
                
                if (elements.fromClientName) elements.fromClientName.value = client.Name || client.ClientName || '';

                // Clear accounts - will be loaded when View is clicked
                state.fromAccounts = [];
                state.selectedAccounts.clear();
                renderFromAccountsTable([]);
                updateSummary();
                
                updateStatusBar(`Selected source client: ${client.ClientID}. Click View to load accounts.`);
            } else {
                showMessage('Client not found', 'warning');
            }
        } catch (error) {
            console.error('Error searching client:', error);
            showMessage('Error searching client', 'error');
        } finally {
            showLoading(false);
        }

        updateMergeButton();
    }

    async function handleToClientDirectSearch() {
        const clientId = elements.toClientId?.value?.trim();
        if (!clientId) {
            showMessage('Please enter a Client ID or use the search button', 'warning');
            return;
        }

        if (clientId === state.fromClientId) {
            showMessage('Target client cannot be the same as source client', 'error');
            return;
        }

        const branchId = state.branchId || elements.branchId?.value || '0101';
        
        showLoading(true);
        try {
            // First, try to get client details
            const response = await callApi('dbo.p_GetSearchResult', {
                TableID: 'ClientID',
                AdvFilterString: '',
                WhereStmt: '',
                PrevOrNext: 0,
                RefID: null,
                OperatorID: CONFIG.operatorId,
                ModuleID: 0,
                OurBranchID: branchId,
                SearchKey: clientId,
                LanguageID: 'en'
            });

            let clients = [];
            if (response && response.data) {
                clients = Array.isArray(response.data) ? response.data : [];
            } else if (response && response.Details) {
                clients = Array.isArray(response.Details) ? response.Details : [];
            } else if (response && response.Details01) {
                clients = Array.isArray(response.Details01) ? response.Details01 : [];
            }

            // Find exact match or first result
            const client = clients.find(c => c.ClientID === clientId) || clients[0];

            if (client) {
                state.toClientId = client.ClientID;
                state.toClientName = client.Name || client.ClientName;
                state.toClientData = client;
                
                if (elements.toClientName) elements.toClientName.value = client.Name || client.ClientName || '';

                // Clear accounts - will be loaded when View is clicked
                state.toAccounts = [];
                renderToAccountsTable([]);
                
                updateStatusBar(`Selected target client: ${client.ClientID}. Click View to load accounts.`);
            } else {
                showMessage('Client not found', 'warning');
            }
        } catch (error) {
            console.error('Error searching client:', error);
            showMessage('Error searching client', 'error');
        } finally {
            showLoading(false);
        }

        updateMergeButton();
    }

    async function handleBranchDirectSearch() {
        const branchId = elements.branchId?.value?.trim();
        if (!branchId) {
            showMessage('Please enter a Branch ID or use the search button', 'warning');
            return;
        }

        showLoading(true);
        try {
            // Use pc_SearchSystemBranches
            const response = await callApi('dbo.pc_SearchSystemBranches', {
                BankID: '00'
            });

            let branches = [];
            if (response && response.data) {
                branches = Array.isArray(response.data) ? response.data : [];
            } else if (response && response.Details) {
                branches = Array.isArray(response.Details) ? response.Details : [];
            } else if (response && response.Details01) {
                branches = Array.isArray(response.Details01) ? response.Details01 : [];
            }

            // Find matching branch
            const branch = branches.find(b => 
                (b.BranchID || b.OurBranchID) === branchId
            );

            if (branch) {
                state.branchId = branch.BranchID || branch.OurBranchID;
                state.branchName = branch.BranchName || branch.Description;
                
                if (elements.branchName) elements.branchName.value = state.branchName;
                updateStatusBar(`Branch: ${state.branchName}`);
            } else {
                showMessage('Branch not found', 'warning');
            }
        } catch (error) {
            console.error('Error searching branch:', error);
            showMessage('Error searching branch', 'error');
        } finally {
            showLoading(false);
        }
    }

    // ============================================================
    // MERGE ACCOUNTS
    // ============================================================
    async function mergeAccounts() {
        if (!confirm('Are you sure you want to merge the selected accounts? This action cannot be undone.')) {
            return;
        }

        if (!state.fromClientId || !state.toClientId || state.selectedAccounts.size === 0) {
            showMessage('Please select source client, target client, and accounts to merge', 'warning');
            return;
        }

        showLoading(true);
        updateStatusBar('Merging accounts...');

        try {
            // Get selected account IDs
            const accountsToMerge = [];
            state.selectedAccounts.forEach(index => {
                if (state.fromAccounts[index]) {
                    accountsToMerge.push(state.fromAccounts[index]);
                }
            });

            // Call merge API
            const response = await callApi('dbo.p_MergeClientAccounts', {
                FromClientID: state.fromClientId,
                ToClientID: state.toClientId,
                OurBranchID: state.branchId,
                Accounts: accountsToMerge.map(a => a.AccountID).join(','),
                OperatorID: CONFIG.operatorId
            });

            if (response && (response.Status === 'Success' || response.ResponseCode === '00')) {
                showMessage('Accounts merged successfully!', 'success');
                updateStatusBar('Merge completed successfully');
                clearForm();
            } else {
                const errorMsg = response?.Message || response?.ResponseMessage || 'Unknown error';
                showMessage(`Error: ${errorMsg}`, 'error');
                updateStatusBar('Merge failed');
            }
        } catch (error) {
            console.error('Error merging accounts:', error);
            showMessage('Error merging accounts', 'error');
            updateStatusBar('Merge failed');
        } finally {
            showLoading(false);
        }
    }

    // ============================================================
    // VIEW BUTTON HANDLER - Load accounts for both clients
    // ============================================================
    async function handleView() {
        const branchId = state.branchId || elements.branchId?.value || '0101';
        
        if (!state.fromClientId && !state.toClientId) {
            showMessage('Please select at least one client first', 'warning');
            return;
        }

        // Load accounts for FROM client if selected
        if (state.fromClientId) {
            await loadClientAccounts('from', branchId, state.fromClientId);
        }

        // Load accounts for TO client if selected
        if (state.toClientId) {
            await loadClientAccounts('to', branchId, state.toClientId);
        }

        updateMergeButton();
    }

    // ============================================================
    // FORM ACTIONS
    // ============================================================
    function clearForm() {
        // Reset state
        state.fromClientId = '';
        state.fromClientName = '';
        state.fromClientData = null;
        state.toClientId = '';
        state.toClientName = '';
        state.toClientData = null;
        state.fromAccounts = [];
        state.toAccounts = [];
        state.selectedAccounts.clear();
        
        // Reset form fields
        if (elements.fromClientId) elements.fromClientId.value = '';
        if (elements.fromClientName) elements.fromClientName.value = '';
        if (elements.toClientId) elements.toClientId.value = '';
        if (elements.toClientName) elements.toClientName.value = '';
        
        // Reset tables
        renderFromAccountsTable([]);
        renderToAccountsTable([]);
        
        // Reset summary
        updateSummary();
        updateMergeButton();
        
        updateStatusBar('Form cleared');
    }

    function handleClose() {
        // Send close message to parent
        if (window.parent && window.parent !== window) {
            window.parent.postMessage({ action: 'close' }, '*');
        }
    }

    // ============================================================
    // SECTION TOGGLE
    // ============================================================
    function initSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', () => {
                const section = header.closest('.form-section');
                const content = section.querySelector('.section-content');
                const icon = header.querySelector('.section-toggle-btn i');
                
                if (content) {
                    const isHidden = content.style.display === 'none';
                    content.style.display = isHidden ? 'block' : 'none';
                    if (icon) {
                        icon.className = isHidden ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
                    }
                }
            });
        });
    }

    // ============================================================
    // INITIALIZATION
    // ============================================================
    function init() {
        console.log('[MergeClientAccounts] Initializing...');
        
        // Initialize Bootstrap modals
        const clientSearchModalEl = document.getElementById('clientSearchModal');
        const branchSearchModalEl = document.getElementById('branchSearchModal');
        
        if (clientSearchModalEl && window.bootstrap) {
            elements.clientSearchModal = new bootstrap.Modal(clientSearchModalEl);
        }
        if (branchSearchModalEl && window.bootstrap) {
            elements.branchSearchModal = new bootstrap.Modal(branchSearchModalEl);
        }

        // Client search button listeners - open modal
        elements.btnFromClientLookup?.addEventListener('click', () => openClientSearchModal('from'));
        elements.btnToClientLookup?.addEventListener('click', () => openClientSearchModal('to'));
        elements.btnBranchLookup?.addEventListener('click', openBranchSearchModal);
        
        // Modal search buttons
        elements.btnSearchClients?.addEventListener('click', searchClients);
        elements.btnSearchBranches?.addEventListener('click', searchBranches);
        elements.btnSelectClient?.addEventListener('click', handleClientSelection);
        elements.btnSelectBranch?.addEventListener('click', handleBranchSelection);
        elements.btnClearFilters?.addEventListener('click', clearClientSearchFilters);

        // Select all checkbox
        elements.selectAllFrom?.addEventListener('change', handleSelectAll);
        
        // Action buttons
        elements.btnView?.addEventListener('click', handleView);
        elements.btnClear?.addEventListener('click', clearForm);
        elements.btnMerge?.addEventListener('click', mergeAccounts);
        
        // Enter key handlers for direct search
        elements.fromClientId?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleFromClientDirectSearch();
        });
        elements.toClientId?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleToClientDirectSearch();
        });
        elements.branchId?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleBranchDirectSearch();
        });

        // Modal filter enter key
        document.querySelectorAll('#clientSearchModal input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchClients();
            });
        });
        document.querySelectorAll('#branchSearchModal input').forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') searchBranches();
            });
        });
        
        // Window controls
        document.querySelectorAll('[data-action="close"]').forEach(btn => {
            btn.addEventListener('click', handleClose);
        });
        
        // Initialize section toggles
        initSectionToggles();
        
        // Set default branch
        elements.branchId.value = '0101';
        state.branchId = '0101';
        
        updateStatusBar('Ready');
        console.log('[MergeClientAccounts] Initialization complete');
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
