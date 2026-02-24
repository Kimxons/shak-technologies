(function (global) {
    const btnSearch = document.getElementById('btnSearch');
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
            await ServiceLoader.loadCommonServices(); // Loads SearchService
            await ServiceLoader.loadScript('../../../assets/js/auth/auth.service.js');
            init();
        } catch (err) {
            console.error('Error loading services:', err);
        }
    })();

    function init() {
        if (btnSearch) btnSearch.addEventListener('click', onSearch);

        // Allow Enter key to search
        searchFields.forEach(field => {
            field.addEventListener('keypress', (e) => {
                if (e.key === 'Enter') onSearch();
            });
        });

        // Handle table row clicks for selection and confirmation
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
    }

    async function onSearch() {
        const conditions = [];

        searchFields.forEach(field => {
            const val = field.value.trim();
            if (val) {
                const fieldName = field.dataset.field;
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

        const payload = {
            TableID: "FxDealFrontOffice",
            AdvFilterString: "",
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
            const result = await global.SearchService.searchDeals(payload);
            console.log('Search Result:', result);

            if (result.success) {
                renderResults(result.data);
            } else {
                renderError(result.message || "Search failed.");
            }
        } catch (err) {
            console.error('Search Error:', err);
            renderError("Error occurred during search.");
        }
    }

    function renderResults(data) {
        if (!tableBody) return;

        const rows = Array.isArray(data) ? data : (data.Details || []);

        if (rows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-muted">No results found.</td></tr>';
            return;
        }

        tableBody.innerHTML = rows.map((row) => {
            const jsonData = JSON.stringify(row).replace(/"/g, '&quot;');
            return `
                <tr data-row="${jsonData}">
                    <td>${row.DealNo || ''}</td>
                    <td>${row.DealDate || ''}</td>
                    <td>${row.BranchId || ''}</td>
                    <td>${row.ClientId || ''}</td>
                    <td>${row.BuySell || ''}</td>
                </tr>
            `;
        }).join('');
    }

    function renderError(msg) {
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="5" class="text-center" style="color:red">${msg}</td></tr>`;
    }

    function onConfirmSelection() {
        if (!selectedData) return;

        // Send message to parent
        window.parent.postMessage({
            type: 'DEAL_SELECTED',
            dealNo: selectedData.DealNo,
            data: selectedData
        }, '*');

        // Close the dialog
        window.parent?.postMessage?.({ type: 'kairo-dataentry-close' }, '*');
    }

})(window);