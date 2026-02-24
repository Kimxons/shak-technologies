(function (global) {
    let LookupService;
    let bankId = '';
    const searchInput = document.getElementById('searchInput');
    const btnSearch = document.getElementById('btnSearch');
    const resultsBody = document.getElementById('resultsBody');

    // Get BankID from URL parameters
    const urlParams = new URLSearchParams(window.location.search);
    bankId = urlParams.get('bankId') || '';

    // Initialize services
    (async () => {
        const { ServiceLoader } = global;
        if (!ServiceLoader) return;
        try {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadLookupService();
            LookupService = global.LookupService;
            init();
        } catch (err) {
            console.error('[Branch Lookup] Failed to load services:', err);
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

        // Initial search if bankId is present
        if (bankId) {
            onSearch();
        } else {
            resultsBody.innerHTML = '<tr><td colspan="2" class="status-msg text-warning">No Bank selected. Please select a bank first.</td></tr>';
        }
    }

    async function onSearch() {
        console.log('[Branch Lookup] onSearch invoked. bankId:', bankId);
        if (!LookupService) {
            console.error('[Branch Lookup] LookupService MISSING');
            return;
        }
        if (!bankId) {
            console.warn('[Branch Lookup] bankId is empty, stopping search');
            resultsBody.innerHTML = '<tr><td colspan="2" class="status-msg text-warning">Please select a Bank on the main form first.</td></tr>';
            return;
        }

        const term = searchInput.value.trim();
        resultsBody.innerHTML = '<tr><td colspan="2" class="status-msg"><i class="bi bi-hourglass-split"></i> Loading branches...</td></tr>';

        // Prepare p_GetSearchResult request
        const whereStmt = term ? `(BranchID LIKE '%${term}%' OR BranchName LIKE '%${term}%')` : "";

        // Get Session/Env for OperatorID and OurBranchID
        const session = global.parent?.getAuthSession?.() || {};
        const env = global.parent?.Environment || {};

        const payload = {
            TableID: "ClearingBranchID",
            AdvFilterString: `BankID='${bankId}'`,
            WhereStmt: whereStmt,
            PrevOrNext: false,
            RefID: "",
            OperatorID: session.operatorId || session.operatorID || env.OperatorID || "SYSTEM",
            ModuleID: 0,
            OurBranchID: session.branchID || session.branchId || env.OurBranchID || "0101",
            SearchKey: "",
            LanguageID: "ENG"
        };

        try {
            console.log('[Branch Lookup] Calling API with:', payload);
            const response = await LookupService.getSearchResult(payload);
            console.log('[Branch Lookup] API Result Received:', response);

            if (response && response.success) {
                // The console log shows data is in response.Details or data.Details
                let rows = [];
                if (Array.isArray(response.Details)) {
                    rows = response.Details;
                } else if (response.data) {
                    const d = response.data;
                    rows = d.Details || d.Details01 || d.Table || (Array.isArray(d) ? d : []);
                }

                console.log(`[Branch Lookup] Extracted ${Array.isArray(rows) ? rows.length : 'non-array'} rows`);
                renderResults(Array.isArray(rows) ? rows : []);
            } else {
                console.warn('[Branch Lookup] API failed or success=false', response);
                resultsBody.innerHTML = `<tr><td colspan="2" class="status-msg text-danger">Error: ${response?.message || 'Failed to fetch data'}</td></tr>`;
            }
        } catch (err) {
            console.error('[Branch Lookup] EXCEPTION during performRequest:', err);
            resultsBody.innerHTML = '<tr><td colspan="2" class="status-msg text-danger">An error occurred while fetching branches.</td></tr>';
        }
    }

    function renderResults(rows) {
        if (!rows || rows.length === 0) {
            resultsBody.innerHTML = '<tr><td colspan="2" class="status-msg">No branches discovered for this bank.</td></tr>';
            return;
        }

        resultsBody.innerHTML = rows.map(row => {
            const branchId = row.BranchID || row.BranchCode || '';
            const branchName = row.BranchName || '';
            const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');

            return `
                <tr data-row="${jsonData}">
                    <td>${branchId}</td>
                    <td>${branchName}</td>
                </tr>
            `;
        }).join('');
    }

    function onSelect(data) {
        // Send selection back to parent
        window.parent.postMessage({
            type: 'BRANCH_SELECTED',
            data: data
        }, '*');
    }

})(window);
