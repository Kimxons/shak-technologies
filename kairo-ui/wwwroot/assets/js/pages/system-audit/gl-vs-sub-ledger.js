(function (global) {
    if (global.__GLSubLedgerLoaded) {
        return;
    }
    global.__GLSubLedgerLoaded = true;

    // DOM Elements
    const txtBranchId = document.getElementById('txtBranchId');
    const chkShowDifferences = document.getElementById('showDifferences');
    const btnProcess = document.getElementById('btnProcess');
    const tableBody = document.querySelector('.data-table tbody');

    let dependenciesReady = false;

    // Load dependencies using ServiceLoader
    (async () => {
        const { ServiceLoader } = global;
        if (!ServiceLoader) {
            console.error("ServiceLoader not found!");
            return;
        }

        try {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadSystemAuditService();
            await ServiceLoader.loadCommonServices();

            dependenciesReady = true;
            console.log('[GLvsSubLedger] Dependencies loaded');

            init();
        } catch (error) {
            console.error('[GLvsSubLedger] Failed to load dependencies:', error);
        }
    })();

    function init() {
        if (btnProcess) {
            btnProcess.addEventListener('click', onProcess);
        }

        if (txtBranchId) {
            txtBranchId.addEventListener('blur', onBranchIdBlur);
        }
    }

    async function onBranchIdBlur(e) {
        const branchId = '00';
        const txtHeadOffice = document.getElementById('txtHeadOffice'); // Assuming we want to populate this or similar

        if (!branchId) {
            if (txtHeadOffice) txtHeadOffice.value = '';
            return;
        }

        if (txtHeadOffice) txtHeadOffice.value = 'Loading...';

        const SystemAuditService = global.SystemAuditService;
        if (!SystemAuditService) return;

        // User mentioned payload uses BankID. 
        // Typically typically branch search implies BankID=OurBranchID or similar? 
        // Or "BankID" is the parameter name for the branch ID?
        // Let's assume BankID in requestData maps to the entered branchId.

        const payload = {
            BankID: branchId
        };

        try {
            const result = await SystemAuditService.getSystemBranches(payload);
            console.log('[GLvsSubLedger] Branch Search Result:', result);

            // Need to parse result and find "Description" or "BranchName"
            if (result.success && result.data) {
                // Check if it's "Head Office" or "Office 1" as per user request
                // Assuming result.data[0].BranchName or Description exists
                const data = Array.isArray(result.data) ? result.data : (result.data.Details || []);
                const branchInfo = data[0];

                if (branchInfo) {
                    const branchName = branchInfo.BranchName || branchInfo.Description || branchInfo.Name || "";
                    if (txtHeadOffice) txtHeadOffice.value = branchName;
                } else {
                    if (txtHeadOffice) txtHeadOffice.value = 'Branch not found';
                }
            } else {
                if (txtHeadOffice) txtHeadOffice.value = '';
            }
        } catch (error) {
            console.error('[GLvsSubLedger] Branch search error:', error);
            if (txtHeadOffice) txtHeadOffice.value = 'Error';
        }
    }

    function getOperatorId() {
        try {
            const session = global.AuthService?.getSession?.();
            return session?.operatorId || session?.operatorID || "CSADM"; // Default to CSADM for testing as requested previously
        } catch {
            return "CSADM";
        }
    }

    async function onProcess(e) {
        e.preventDefault();

        if (!dependenciesReady) {
            alert("System is still loading dependencies. Please wait.");
            return;
        }

        const SystemAuditService = global.SystemAuditService;
        if (!SystemAuditService) {
            console.error("SystemAuditService not available");
            return;
        }

        // Prepare Default Date (Today)
        const today = new Date().toISOString();

        const payload = {
            OurBranchID: txtBranchId ? txtBranchId.value : "",
            // Mode: "Q",
            // Status: true,
            OperatorID: getOperatorId(),
            // PostTransaction: "N", // Defaulting to No
            // TrxDate: today,
            // ErrorNo: 0,
            // EOY: false
        };

        console.log('[GLvsSubLedger] Processing request:', payload);

        // Show loading state
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Loading...</td></tr>';
        }

        try {
            const result = await SystemAuditService.getGLSubLedger(payload);
            console.log('[GLvsSubLedger] API Full Result:', result);

            if (result.success) {
                renderTable(result.data);
            } else {
                console.error('[GLvsSubLedger] API Error:', result.message);
                if (tableBody) {
                    tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: red;">${result.message || "Error fetching data"}</td></tr>`;
                }
            }
        } catch (err) {
            console.error('[GLvsSubLedger] Catch Error:', err);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: red;">Unexpected Error</td></tr>`;
            }
        }
    }

    function renderTable(data) {
        console.log('[GLvsSubLedger] RenderTable received:', data);
        if (!tableBody) return;

        let rows = [];

        // Parsing logic mainly from LoanMaintenance/CustomerBalance experience
        const payload = data && data.Details ? data : (data && data.data ? data.data : data);

        const candidates = [
            payload?.Details01,
            payload?.Details02,
            payload?.Details
        ];

        let bestMatch = candidates.find(arr => Array.isArray(arr) && arr.length > 0);

        if (!bestMatch) {
            if (Array.isArray(payload?.Details01)) bestMatch = payload.Details01;
            else if (Array.isArray(payload?.Details02)) bestMatch = payload.Details02;
            else if (Array.isArray(payload?.Details)) bestMatch = payload.Details;
            else if (Array.isArray(payload)) bestMatch = payload;
        }

        if (bestMatch) {
            rows = bestMatch;
        }

        if (!rows || rows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: left; padding: 20px 12px; color: #64748b;">No records to display.</td></tr>';
            return;
        }

        // Filter if checkbox is checked
        // Assuming "Differences" column check? 
        // User didn't specify logic for checkbox, but UI says "Show Only Rows Having Differences"
        const showDiffOnly = chkShowDifferences ? chkShowDifferences.checked : false;

        const displayRows = showDiffOnly
            ? rows.filter(r => (parseFloat(r.Difference || r.Differences || 0) !== 0))
            : rows;

        if (displayRows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" style="text-align: left; padding: 20px 12px; color: #64748b;">No records match criteria.</td></tr>';
            return;
        }

        tableBody.innerHTML = displayRows.map((row, idx) => {
            if (idx === 0) console.log('[GLvsSubLedger] First Row Sample:', row);

            return `
            <tr>
                <td style="text-align: center;"><input type="checkbox"></td>
                <td>${row.AccountID || ''}</td>
                <td>${row.Description || row.AccountName || ''}</td>
                <td>${row.CurrencyID || ''}</td>
                <td>${formatMoney(row.AccountBalance || row.Balance)}</td>
                <td>${formatMoney(row.GLBalance || row.GeneralLedgerBalance)}</td>
                <td>${formatMoney(row.Difference || row.Differences)}</td>
            </tr>
            `;
        }).join('');
    }

    function formatMoney(amount) {
        if (amount == null || amount === '') return '';
        return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

})(window);
