(function (global) {
    // DOM Elements - Match search-modal.js naming convention
    const searchBtn = document.getElementById('client-search-btn');
    const loadingDiv = document.getElementById('client-loading');
    const resultsDiv = document.getElementById('client-results');
    const emptyDiv = document.getElementById('client-empty');
    const criteriaInputs = document.querySelectorAll('[data-search-field]');

    let filteredResults = [];
    let selectedIndex = null;

    // Load dependencies using ServiceLoader
    (async () => {
        const { ServiceLoader } = global;
        if (!ServiceLoader) return;
        try {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadClientSearchService();
            init();
        } catch (err) {
            console.error('Error loading services:', err);
            showError('Failed to load required services.');
        }
    })();

    function init() {
        console.log('[ClientSearch] Initialized');

        // Search button
        if (searchBtn) {
            searchBtn.addEventListener('click', () => executeSearch());
        }

        // Allow Enter key to search
        criteriaInputs.forEach(input => {
            input.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    executeSearch();
                }
            });
        });

        // Show empty state initially
        if (emptyDiv) {
            emptyDiv.textContent = 'Enter search criteria and click Search to find clients.';
            emptyDiv.style.display = 'block';
        }
    }

    function close() {
        // Try to close the Bootstrap modal in the parent
        try {
            const modal = window.parent.document.getElementById('searchModal');
            if (modal && window.parent.bootstrap) {
                const bsModal = window.parent.bootstrap.Modal.getInstance(modal);
                if (bsModal) {
                    bsModal.hide();
                    return;
                }
            }
            // Fallback: click the close button
            const closeBtn = window.parent.document.querySelector('#searchModal .btn-close');
            if (closeBtn) {
                closeBtn.click();
                return;
            }
        } catch (e) {
            console.log('[ClientSearch] Could not access parent modal directly:', e);
        }
        // Final fallback: send message to parent
        window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
    }

    function showLoading(show) {
        if (loadingDiv) loadingDiv.style.display = show ? 'block' : 'none';
        if (emptyDiv && show) emptyDiv.style.display = 'none';
        if (resultsDiv && show) resultsDiv.style.display = 'none';
    }

    function showError(message) {
        if (emptyDiv) {
            emptyDiv.textContent = message;
            emptyDiv.style.display = 'block';
        }
        if (loadingDiv) loadingDiv.style.display = 'none';
    }

    async function executeSearch() {
        // Collect filter values
        const searchCriteria = {};
        criteriaInputs.forEach(input => {
            const fieldName = input.dataset.searchField;
            const value = input.value?.trim();
            if (value) {
                const mode = document.querySelector(`[data-search-mode="${fieldName}"]`)?.value || 'Like';
                const column = input.dataset.searchColumn;
                
                // Map to service parameter names
                const paramMap = {
                    'clientId': 'clientId',
                    'clientName': 'clientName',
                    'idNumber': 'idNumber',
                    'mobileNo': 'mobileNo',
                    'applicationId': 'clientApplicationId',
                    'accountId': 'accountId'
                };
                
                const paramName = paramMap[fieldName];
                if (paramName) {
                    searchCriteria[paramName] = value;
                    searchCriteria[paramName + 'Operator'] = mode === 'Like' ? 'like' : 'equals';
                }
            }
        });

        console.log('[ClientSearch] Criteria:', searchCriteria);

        // Show loading state
        showLoading(true);

        try {
            const result = await global.ClientSearchService.searchClients(searchCriteria);
            console.log('[ClientSearch] Result:', result);

            if (result && Array.isArray(result)) {
                filteredResults = result;
                renderResults(result);
            } else {
                showError('Search failed. Please try again.');
            }
        } catch (err) {
            console.error('[ClientSearch] Error:', err);
            showError('An error occurred during search. Please try again.');
        } finally {
            showLoading(false);
        }
    }

    function setSelected(index) {
        selectedIndex = index;
        const tbody = resultsDiv?.querySelector('table tbody');
        if (!tbody) return;

        const rows = Array.from(tbody.querySelectorAll('tr'));
        rows.forEach((tr, idx) => {
            const base = tr.dataset.baseBg || (idx % 2 === 0 ? '#ffffff' : '#e8f4ff');
            if (idx === index) {
                tr.style.background = '#bfe0ff';
            } else {
                tr.style.background = base;
            }
        });
    }

    function renderResults(results) {
        if (!resultsDiv || !emptyDiv) return;

        if (!results || results.length === 0) {
            resultsDiv.innerHTML = '';
            resultsDiv.style.display = 'none';
            emptyDiv.textContent = 'No clients matched the search criteria.';
            emptyDiv.style.display = 'block';
            return;
        }

        emptyDiv.style.display = 'none';

        // Define columns
        const columns = [
            { key: 'ClientID', label: 'Client ID' },
            { key: 'ClientName', label: 'Name', altKey: 'Name' },
            { key: 'IDNumber', label: 'ID Number' },
            { key: 'ClientApplicationID', label: 'Application ID' },
            { key: 'AccountID', label: 'Account ID' }
        ];

        // Build table dynamically
        const table = document.createElement('table');
        table.className = 'results-table';

        // Build thead
        const thead = document.createElement('thead');
        const headRow = document.createElement('tr');

        // Row number column
        const numTh = document.createElement('th');
        numTh.textContent = '#';
        numTh.className = 'num-col';
        headRow.appendChild(numTh);

        columns.forEach(col => {
            const th = document.createElement('th');
            th.textContent = col.label;
            headRow.appendChild(th);
        });
        thead.appendChild(headRow);
        table.appendChild(thead);

        // Build tbody
        const tbody = document.createElement('tbody');
        results.forEach((row, idx) => {
            const tr = document.createElement('tr');
            const rowColor = idx % 2 === 0 ? '#ffffff' : '#e8f4ff';
            tr.dataset.baseBg = rowColor;
            tr.style.background = rowColor;
            tr.style.cursor = 'pointer';
            
            tr.onmouseover = () => {
                if (selectedIndex !== idx) tr.style.background = '#d0e8ff';
            };
            tr.onmouseout = () => {
                tr.style.background = selectedIndex === idx ? '#bfe0ff' : rowColor;
            };
            tr.onclick = () => {
                setSelected(idx);
            };
            tr.ondblclick = () => {
                selectResult(idx);
            };

            // Row number
            const numTd = document.createElement('td');
            numTd.textContent = idx + 1;
            numTd.className = 'num-col';
            tr.appendChild(numTd);

            // Data columns
            columns.forEach(col => {
                const td = document.createElement('td');
                td.textContent = row[col.key] || row[col.altKey] || '';
                tr.appendChild(td);
            });

            tbody.appendChild(tr);
        });
        table.appendChild(tbody);

        resultsDiv.innerHTML = '';
        resultsDiv.appendChild(table);
        resultsDiv.style.display = 'block';
    }

    function selectResult(index) {
        if (!filteredResults || !filteredResults[index]) return;
        const clientData = filteredResults[index];

        const data = {
            type: 'CLIENT_SELECTED',
            clientId: clientData.ClientID || '',
            clientName: clientData.ClientName || clientData.Name || '',
            data: clientData
        };

        console.log('[ClientSearch] Selected:', data);

        // Send message to parent
        window.parent.postMessage(data, '*');

        // Close the dialog
        close();
    }

})(window);