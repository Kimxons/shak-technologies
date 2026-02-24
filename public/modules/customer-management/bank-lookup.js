(function (global) {
    let ClientService;
    const searchInput = document.getElementById('searchInput');
    const btnSearch = document.getElementById('btnSearch');
    const resultsBody = document.getElementById('resultsBody');

    // Initialize services
    (async () => {
        const { ServiceLoader } = global;
        if (!ServiceLoader) return;
        try {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadClientService();
            ClientService = global.ClientService;
            init();
        } catch (err) {
            console.error('[Bank Lookup] Failed to load services:', err);
        }
    })();

    function init() {
        if (btnSearch) btnSearch.addEventListener('click', onSearch);

        if (searchInput) {
            searchInput.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') onSearch();
            });
            searchInput.focus();
        }

        // Table selection logic
        if (resultsBody) {
            resultsBody.addEventListener('click', (e) => {
                const tr = e.target.closest('tr');
                if (!tr || !tr.dataset.row) return;

                const rowData = JSON.parse(tr.dataset.row);
                onSelect(rowData);
            });
        }
    }

    async function onSearch() {
        console.log('[Bank Lookup] onSearch invoked.');
        if (!ClientService) {
            console.error('[Bank Lookup] ClientService MISSING');
            return;
        }

        const term = searchInput.value.trim().toLowerCase();

        resultsBody.innerHTML = '<tr><td colspan="2" class="status-msg"><i class="bi bi-hourglass-split"></i> Searching...</td></tr>';

        try {
            console.log('[Bank Lookup] Calling searchClearingBanks (paramless)');
            // Procedure pc_SearchClearingBanks expects NO parameters
            const response = await ClientService.searchClearingBanks({});
            console.log('[Bank Lookup] Result received:', response);

            if (response && response.success) {
                // Determine rows from response structure
                let rows = [];
                if (Array.isArray(response.Details)) {
                    rows = response.Details;
                } else if (response.data) {
                    const d = response.data;
                    rows = d.Details || d.Details01 || d.Table || (Array.isArray(d) ? d : []);
                }

                console.log(`[Bank Lookup] Total rows: ${Array.isArray(rows) ? rows.length : 0}`);
                const finalRows = Array.isArray(rows) ? rows : [];

                // Client-side filtering if API returns all results
                const filteredRows = term
                    ? finalRows.filter(r =>
                        (r.BankID && r.BankID.toString().toLowerCase().includes(term)) ||
                        (r.BankName && r.BankName.toLowerCase().includes(term)) ||
                        (r.InstitutionName && r.InstitutionName.toLowerCase().includes(term))
                    )
                    : finalRows;

                renderResults(filteredRows);
            } else {
                resultsBody.innerHTML = `<tr><td colspan="2" class="status-msg text-danger">Error: ${response?.message || 'Failed to fetch data'}</td></tr>`;
            }
        } catch (err) {
            console.error('[Bank Lookup] Search error:', err);
            resultsBody.innerHTML = '<tr><td colspan="2" class="status-msg text-danger">An error occurred during search.</td></tr>';
        }
    }

    function renderResults(rows) {
        if (!rows || rows.length === 0) {
            resultsBody.innerHTML = '<tr><td colspan="2" class="status-msg">No banks found matching your search.</td></tr>';
            return;
        }

        resultsBody.innerHTML = rows.map(row => {
            const bankId = row.BankID || row.BankCode || '';
            const bankName = row.BankName || row.InstitutionName || '';
            const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');

            return `
                <tr data-row="${jsonData}">
                    <td>${bankId}</td>
                    <td>${bankName}</td>
                </tr>
            `;
        }).join('');
    }

    function onSelect(data) {
        // Send selection back to parent
        window.parent.postMessage({
            type: 'BANK_SELECTED',
            data: data
        }, '*');
    }

})(window);
