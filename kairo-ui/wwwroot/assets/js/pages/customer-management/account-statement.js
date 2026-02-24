(function (global) {
    const ddlStatementFor = document.getElementById('ddlStatementFor');
    const dtFromDate = document.getElementById('dtFromDate');
    const dtToDate = document.getElementById('dtToDate');
    const tableBody = document.querySelector('table tbody');

    // Get Context
    const urlParams = new URLSearchParams(window.location.search);
    const contextAccountId = urlParams.get('accountId');
    const contextBranchId = urlParams.get('branchId');
    const contextClientId = urlParams.get('clientId');

    // Load dependencies
    (async () => {
        const { ServiceLoader } = global;
        if (!ServiceLoader) return;
        try {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadClientService();
            await ServiceLoader.loadScript('/assets/js/auth/auth.service.js');

            init();
        } catch (err) {
            console.error(err);
        }
    })();

    function init() {
        const viewBtn = Array.from(document.querySelectorAll('.action-btn'))
            .find(btn => btn.textContent.trim() === 'View');
        if (viewBtn) viewBtn.addEventListener('click', onView);

        const cancelBtn = document.getElementById('btnCancel');
        if (cancelBtn) cancelBtn.addEventListener('click', onCancel);

        // Optional: Auto-set dates based on dropdown
        if (ddlStatementFor) {
            ddlStatementFor.addEventListener('change', onStatementForChange);
            // Trigger once to set defaults
            // onStatementForChange(); 
        }
    }

    function onCancel() {
        // Clear Inputs
        if (ddlStatementFor) ddlStatementFor.selectedIndex = 0;
        if (dtFromDate) dtFromDate.value = '';
        if (dtToDate) dtToDate.value = '';

        // Clear Table
        if (tableBody) {
            tableBody.innerHTML = '<tr class="empty-row"><td colspan="7">No records to display.</td></tr>';
        }
    }

    function onStatementForChange() {
        const val = ddlStatementFor.value;
        const now = new Date();
        const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);

        if (val === 'CurrentMonth') {
            const toYMD = (d) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };
            dtFromDate.value = toYMD(firstDay);
            dtToDate.value = toYMD(now);
        } else if (val === 'CurrentPrevMonth') {
            const prevMonthFirstDay = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const toYMD = (d) => {
                const y = d.getFullYear();
                const m = String(d.getMonth() + 1).padStart(2, '0');
                const day = String(d.getDate()).padStart(2, '0');
                return `${y}-${m}-${day}`;
            };
            dtFromDate.value = toYMD(prevMonthFirstDay);
            dtToDate.value = toYMD(now);
        }
        // DateRange logic is manual
    }

    async function onView() {
        // Fallback to clientId if accountId is missing, per user request
        const targetId = contextAccountId || contextClientId;

        if (!targetId) {
            alert("No Account or Client context provided. Please load a client in Customer Query first.");
            return;
        }

        const fromDate = dtFromDate.value;
        const toDate = dtToDate.value;

        if (!fromDate || !toDate) {
            alert("Please select From Date and To Date.");
            return;
        }

        const AuthService = global.AuthService;
        let operatorId = "CSADM";
        let branchId = contextBranchId || "0101";

        try {
            const session = AuthService?.getSession?.();
            if (session) {
                if (session.operatorId) operatorId = session.operatorId;
                if (!branchId && session.branchId) branchId = session.branchId;
            }
        } catch (err) { }

        const payload = {
            OurBranchID: branchId,
            AccountID: targetId,
            FromDate: fromDate,
            ToDate: toDate,
            OperatorID: operatorId
        };

        console.log('[AccountStatement] Fetching:', payload);
        if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" class="text-center">Loading...</td></tr>';

        try {
            const result = await global.ClientService.getAccountTransactions(payload);
            console.log('[AccountStatement] Result:', result);

            if (result.success) {
                const data = result.data.Details || result.data || [];
                renderTable(Array.isArray(data) ? data : []);
            } else {
                if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" class="text-center text-danger">${result.message || "No records found."}</td></tr>`;
            }
        } catch (error) {
            console.error(error);
            if (tableBody) tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-danger">Error fetching data.</td></tr>';
        }
    }

    function renderTable(rows) {
        if (!tableBody) return;

        if (rows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="7" class="text-center text-muted">No records found.</td></tr>';
            return;
        }

        tableBody.innerHTML = rows.map(row => `
            <tr>
                <td>${formatDate(row.TrxDate || row.Date)}</td>
                <td>${formatDate(row.ValueDate)}</td>
                <td>${row.Particulars || row.Description || ''}</td>
                <td>${formatMoney(row.Debit)}</td>
                <td>${formatMoney(row.Credit)}</td>
                <td>${formatMoney(row.Balance || row.Closing)}</td>
                <td>${row.OpenBalance ? formatMoney(row.OpenBalance) : ''}</td> 
            </tr>
        `).join('');
    }

    function formatMoney(amount) {
        if (amount == null || amount === '') return '';
        return Number(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    function formatDate(dateStr) {
        if (!dateStr) return '';
        const d = new Date(dateStr);
        if (isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString();
    }

})(window);
