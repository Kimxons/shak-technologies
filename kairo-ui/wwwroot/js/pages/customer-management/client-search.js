(function (global) {
    const btnSearch = document.getElementById('btnSearch');
    const btnOk = document.getElementById('btnOk');
    const tableBody = document.getElementById('resultsBody');
    const searchFields = document.querySelectorAll('.search-field');

    let selectedRow = null;
    let selectedData = null;

    // Load dependencies using ServiceLoader
    (async () => {
        const { ServiceLoader } = global;
        if (!ServiceLoader) return;
        try {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadCommonServices(); // Loads Object SearchService
            await ServiceLoader.loadScript('/assets/js/auth/auth.service.js');
            init();
        } catch (err) {
            console.error(err);
        }
    })();

    function init() {
        if (btnSearch) btnSearch.addEventListener('click', onSearch);
        // btnOk removed per request

        // Allow Enter key to search
        searchFields.forEach(field => {
            field.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') onSearch();
            });
        });

        // Use delegation for table clicks
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const tr = e.target.closest('tr');
                if (!tr || !tr.dataset.row) return;

                // Highlight logic
                if (selectedRow) selectedRow.classList.remove('selected');
                selectedRow = tr;
                selectedRow.classList.add('selected');

                selectedData = JSON.parse(tr.dataset.row);
            });

            tableBody.addEventListener('dblclick', (e) => {
                const tr = e.target.closest('tr');
                if (tr && tr.dataset.row) {
                    selectedData = JSON.parse(tr.dataset.row);
                    onConfirmSelection();
                }
            });
        }
    }

    async function onSearch() {
        // Construct filters
        // Logic: Build a SQL-like WhereStmt or AdvFilterString based on inputs
        // "Field LIKE '%Value%'" OR "Field = 'Value'"

        const conditions = [];

        searchFields.forEach(field => {
            const val = field.value.trim();
            if (val) {
                const fieldName = field.dataset.field;
                // Find associated operator dropdown (previous sibling's previous sibling)
                // Layout: Label - Select - Input
                const select = field.previousElementSibling;
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
        } catch (e) { }

        // Read tableId from URL parameter, default to 'Client'
        const urlParams = new URLSearchParams(window.location.search);
        const tableId = urlParams.get('tableId') || 'Client';
        const advFilter = urlParams.get('advFilter') || '';

        const payload = {
            TableID: tableId,
            AdvFilterString: advFilter,
            WhereStmt: whereStmt,
            PrevOrNext: false,
            RefID: "",
            OperatorID: operatorId,
            ModuleID: 0,
            OurBranchID: branchId,
            SearchKey: "",
            LanguageID: "ENG"
        };

        console.log('Search Payload:', payload);

        if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Searching...</td></tr>';

        try {
            const result = await global.SearchService.searchClients(payload);
            console.log('Search Result:', result);

            if (result.success) {
                renderResults(result.data);
            } else {
                renderError(result.message);
            }
        } catch (err) {
            console.error('Search Error:', err);
            renderError("Error occurred during search.");
        }
    }

    function renderResults(data) {
        if (!tableBody) return;

        // Normalize data: result.data might be the array, or result.data.Details/Details01
        // For introducer search: data.Details contains the array
        // For regular client search: data.Details or data itself
        const rows = Array.isArray(data) ? data : (data.Details || []);

        if (rows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No results found.</td></tr>';
            return;
        }

        tableBody.innerHTML = rows.map((row, index) => {
            // Need to make sure we map the right fields. 
            // API usually returns PascalCase properties.
            // For introducer search: IntroducerClientID, IntroducerClientName
            // For regular client search: ClientID, ClientName
            const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');

            // Determine which fields to use based on what's available
            const clientId = row.IntroducerClientID || row.ClientID || row.ClientId || '';
            const clientName = row.IntroducerClientName || row.ClientName || row.Name || '';

            return `
                <tr onclick="selectRow(this, ${index})" data-row="${jsonData}">
                    <td>${clientId}</td>
                    <td>${clientName}</td>
                    <td>${row.IDNumber || ''}</td>
                    <td>${row.ClientApplicationID || ''}</td>
                    <td>${row.AccountID || ''}</td>
                </tr>
            `;
        }).join('');
    }

    function renderError(msg) {
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:red">${msg}</td></tr>`;
    }



    function onConfirmSelection() {
        if (!selectedData) {
            return;
        }

        // Send message to parent
        window.parent.postMessage({
            type: 'CLIENT_SELECTED',
            clientId: selectedData.ClientID || selectedData.ClientId,
            data: selectedData
        }, '*');
    }

})(window);
