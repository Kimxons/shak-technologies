// On load, trigger a search to display all data by default
document.addEventListener('DOMContentLoaded', function () {
    // Try to find the Search button and click it programmatically
    const searchBtn = document.querySelector('button[type="submit"], button.btn-search, button:contains("Search")');
    if (searchBtn) {
        // If the form has a submit event, trigger it
        const form = searchBtn.closest('form');
        if (form) {
            // If the form uses submit, dispatch submit event
            const event = new Event('submit', { bubbles: true, cancelable: true });
            form.dispatchEvent(event);
        } else {
            // Otherwise, just click the button
            searchBtn.click();
        }
    }
});
// Ensure Cancel button clears the search fields
document.addEventListener('DOMContentLoaded', function () {
    const cancelBtn = document.querySelector('button[type="button"].btn-cancel, button[type="button"].btn-danger, button[type="button"].btn-outline-danger');
    if (cancelBtn) {
        cancelBtn.addEventListener('click', function () {
            // Find all input and select fields in the search form and clear them
            const form = cancelBtn.closest('form');
            if (form) {
                form.querySelectorAll('input[type="text"], input[type="search"], select').forEach(function (el) {
                    if (el.tagName === 'SELECT') {
                        el.selectedIndex = 0;
                    } else {
                        el.value = '';
                    }
                });
            }
        });
    }
});
(function (global) {
    const btnSearch = document.getElementById('btnSearch');
    const tableBody = document.getElementById('resultsBody');
    const searchFields = document.querySelectorAll('.search-field');

    let selectedRow = null;
    let selectedData = null;

    // Initialize when DOM is ready
    document.addEventListener('DOMContentLoaded', function() {
        init();
        // After initializing, trigger a search to load all data by default
        setTimeout(() => {
            if (typeof onSearch === 'function') onSearch();
        }, 0);
    });

    // Also initialize immediately if DOM is already loaded
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        init();
        setTimeout(() => {
            if (typeof onSearch === 'function') onSearch();
        }, 0);
    }

    function init() {
        const btnSearch = document.getElementById('btnSearch');
        const searchFields = document.querySelectorAll('.search-field');
        
        // Add event listener to sidebar search button
        if (btnSearch) {
            btnSearch.addEventListener('click', onSearch);
            console.log('[FunderSearch] Search button initialized');
        }

        // Allow Enter key to search
        searchFields.forEach(field => {
            field.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    onSearch();
                }
            });
        });

        // Handle table row clicks for selection and confirmation
        const tableBody = document.getElementById('resultsBody');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const tr = e.target.closest('tr');
                if (!tr || !tr.dataset.row) return;

                // Highlight logic
                if (selectedRow) selectedRow.classList.remove('selected');
                selectedRow = tr;
                selectedRow.classList.add('selected');

                selectedData = JSON.parse(tr.dataset.row);

                // Single click selects and confirms (closes dialog)
                onConfirmSelection();
            });
        }

        // Make header search icon clickable (card-header, not sidebar button)
        const headerSearchIcon = document.querySelector('.card-header .bi-search');
        if (headerSearchIcon) {
            headerSearchIcon.style.cursor = 'pointer';
            headerSearchIcon.addEventListener('click', onSearch);
        }
        
        // Handle cancel button
        const cancelBtn = document.querySelector('[data-dataentry-close]');
        if (cancelBtn) {
            cancelBtn.addEventListener('click', function() {
                window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
            });
        }
    }

    async function onSearch() {
        console.log('[FunderSearch] Search initiated');
        const searchFields = document.querySelectorAll('.search-field');
        const tableBody = document.getElementById('resultsBody');
        
        const conditions = [];
        searchFields.forEach(field => {
            const val = field.value.trim();
            if (val) {
                const fieldName = field.dataset.field;
                const select = field.previousElementSibling?.querySelector?.('select') || 
                               field.closest('.input-with-action')?.querySelector('select') ||
                               field.closest('.input-with-operator')?.querySelector('select');
                const op = select ? select.value : 'Like';
                if (op === 'Like') {
                    conditions.push(`${fieldName} LIKE '%${val}%'`);
                } else {
                    conditions.push(`${fieldName} = '${val}'`);
                }
            }
        });
        const whereStmt = conditions.length > 0 ? conditions.join(' AND ') : "";
        
        // Get Session
        let operatorId = "CSADM";
        let branchId = "0101";
        try {
            const session = global.AuthService?.getSession?.();
            if (session) {
                operatorId = session.operatorId || operatorId;
                branchId = session.branchId || branchId;
            }
        } catch (e) { 
            console.warn('[FunderSearch] Could not get session:', e);
        }
        
        const requestData = {
            TableID: "DonorID",
            AdvFilterString: "BankID='00'",
            WhereStmt: whereStmt,
            PrevOrNext: 0,
            RefID: "",
            OperatorID: operatorId,
            ModuleID: 5110,
            OurBranchID: branchId,
            SearchKey: "",
            LanguageID: "en"
        };
        
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="2" style="padding: 20px; text-align: center;">Searching...</td></tr>';
        
        try {
            // Check if SearchService is available
            if (!global.SearchService) {
                console.error('[FunderSearch] SearchService not available');
                renderError("Search service not loaded. Please refresh the page.");
                return;
            }
            
            console.log('[FunderSearch] Calling SearchService with:', requestData);
            const result = await global.SearchService.searchClients(requestData);
            console.log('[FunderSearch] Search result:', result);
            
            if (result.success) {
                renderResults(result.data);
            } else {
                renderError(result.message || "Search failed.");
            }
        } catch (err) {
            console.error('[FunderSearch] Search Error:', err);
            renderError("Error occurred during search: " + err.message);
        }
    }

    function renderResults(data) {
        const tableBody = document.getElementById('resultsBody');
        if (!tableBody) return;
        const rows = Array.isArray(data) ? data : (data.Details || []);
        if (rows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="2" style="padding: 20px; text-align: center; color: #666;">No results found.</td></tr>';
            return;
        }
        tableBody.innerHTML = rows.map((row) => {
            const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
            return `
                <tr data-row="${jsonData}" style="cursor: pointer;">
                    <td style="padding: 8px; border: 1px solid #ddd;">${row.FunderID || row.DonorID || ''}</td>
                    <td style="padding: 8px; border: 1px solid #ddd;">${row.FunderName || row.DonorName || ''}</td>
                </tr>
            `;
        }).join('');
    }

    function renderError(msg) {
        const tableBody = document.getElementById('resultsBody');
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="2" style="padding: 20px; text-align: center; color: red;">${msg}</td></tr>`;
    }

    function onConfirmSelection() {
        if (!selectedData) return;

        // Send message to parent with full data
        // Use DonorID or FunderID (API returns DonorID)
        window.parent.postMessage({
            type: 'FUNDER_SELECTED',
            funderId: selectedData.DonorID || selectedData.FunderID,
            data: selectedData
        }, '*');

        // Close the dialog
        window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
    }

})(window);
