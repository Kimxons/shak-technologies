(function (global) {
    // DOM Elements - Match search-modal.js naming convention
    const closeBtn = document.getElementById('branch-close');
    const okBtn = document.getElementById('branch-ok');
    const searchBtn = document.getElementById('branch-search-btn');
    const loadingDiv = document.getElementById('branch-loading');
    const resultsDiv = document.getElementById('branch-results');
    const emptyDiv = document.getElementById('branch-empty');
    const criteriaInputs = document.querySelectorAll('[data-search-field]');

    let filteredResults = [];
    let selectedIndex = null;

    // Load dependencies using ServiceLoader
    (async () => {
        const { ServiceLoader } = global;
        if (!ServiceLoader) return;
        try {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadScript('../../../../assets/js/services/shared/lookupService.js');
            init();
        } catch (err) {
            console.error('Error loading services:', err);
            showError('Failed to load required services.');
        }
    })();

    function init() {
        console.log('[BranchSearch] Initialized');
        
        // Close button
        if (closeBtn) {
            closeBtn.addEventListener('click', () => close());
        }

        // OK button - select if row is selected
        if (okBtn) {
            okBtn.addEventListener('click', () => {
                if (selectedIndex !== null && filteredResults[selectedIndex]) {
                    selectResult(selectedIndex);
                }
            });
        }

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
            emptyDiv.textContent = 'Enter search criteria and click Search to find branches.';
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
            console.log('[BranchSearch] Could not access parent modal directly:', e);
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

    function matchesFilter(value, searchTerm, mode) {
        if (!searchTerm) return true;
        const val = (value || '').toLowerCase();
        const term = searchTerm.toLowerCase();
        
        if (mode === 'Exact') {
            return val === term;
        }
        // Default is Like (contains)
        return val.includes(term);
    }

    async function executeSearch() {
        // Collect filter values
        const filters = {};
        criteriaInputs.forEach(input => {
            const fieldName = input.dataset.searchField;
            const value = input.value?.trim();
            if (value) {
                const mode = document.querySelector(`[data-search-mode="${fieldName}"]`)?.value || 'Like';
                filters[fieldName] = { value, mode, column: input.dataset.searchColumn };
            }
        });

        console.log('[BranchSearch] Filters:', filters);

        // Show loading state
        showLoading(true);

        try {
            const result = await global.LookupService.getBranches({ BankID: "00" });
            console.log('[BranchSearch] Result:', result);

            if (result.success) {
                // Extract branches from response
                let branches = Array.isArray(result.data) ? result.data : (result.Details || []);
                
                // Apply filters
                if (filters.branchId) {
                    branches = branches.filter(b => matchesFilter(b.OurBranchID, filters.branchId.value, filters.branchId.mode));
                }
                if (filters.branchName) {
                    branches = branches.filter(b => matchesFilter(b.BranchName, filters.branchName.value, filters.branchName.mode));
                }
                
                filteredResults = branches;
                renderResults(branches);
            } else {
                showError(result.message || 'Search failed. Please try again.');
            }
        } catch (err) {
            console.error('[BranchSearch] Error:', err);
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
            emptyDiv.textContent = 'No branches matched the search criteria.';
            emptyDiv.style.display = 'block';
            return;
        }

        emptyDiv.style.display = 'none';

        // Define columns - match search-modal.js pattern
        const columns = [
            { key: 'OurBranchID', label: 'Branch ID' },
            { key: 'BranchName', label: 'Branch Name' }
        ];

        // Build table dynamically - match search-modal.js styling
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
                td.textContent = row[col.key] || '';
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
        const branchData = filteredResults[index];

        const data = {
            type: 'BRANCH_SELECTED',
            branchId: branchData.OurBranchID || '',
            branchName: branchData.BranchName || '',
            regionId: branchData.RegionID || '',
            data: branchData
        };

        console.log('[BranchSearch] Selected:', data);

        // Send message to parent
        window.parent.postMessage(data, '*');

        // Close the dialog
        close();
    }

})(window);
