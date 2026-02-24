(function (global) {
    if (global.__CustomerQueryLoaded) return;
    global.__CustomerQueryLoaded = true;

    const txtClientId = document.getElementById('txtClientId');
    const txtClientDescription = document.getElementById('txtClientDescription');
    const searchBtn = document.querySelector('.search-btn');
    const tableBody = document.querySelector('table tbody');

    // View Button Selection (Robust)
    const viewBtn = Array.from(document.querySelectorAll('.action-btn'))
        .find(btn => btn.textContent.trim().includes('View'));

    // Cancel Button Selection (Robust)
    const cancelBtn = Array.from(document.querySelectorAll('.action-btn'))
        .find(btn => btn.textContent.trim().includes('Cancel'));

    // BTS Fields Map
    const btsFields = {
        ClearBalance: document.getElementById('txtClearBalance'),
        UnclearBalance: document.getElementById('txtUnclearBalance'),
        UnSupervisedCredits: document.getElementById('txtUnSupervisedCredits'),
        UnSupervisedDebits: document.getElementById('txtUnSupervisedDebits'),
        DrawingPower: document.getElementById('txtDrawingPower'),
        FreezedAmount: document.getElementById('txtFreezedAmount'),
        MinimumBalance: document.getElementById('txtMinimumBalance'),
        DepositBalance: document.getElementById('txtDepositBalance'),
        CurrencyID: document.getElementById('txtCurrencyID'),
        AvailableBalance: document.getElementById('txtAvailableBalance'),
        TotalBalance: document.getElementById('txtTotalBalance'),
        CreditInterest: document.getElementById('txtCreditInterest'),
        DebitInterest: document.getElementById('txtDebitInterest'),
        OpenDate: document.getElementById('txtOpenDate'),
        Status: document.getElementById('txtStatus'),

        // Audit
        CreatedBy: document.getElementById('txtCreatedBy'),
        CreatedOn: document.getElementById('txtCreatedOn'),
        ModifiedBy: document.getElementById('txtModifiedBy'),
        ModifiedOn: document.getElementById('txtModifiedOn'),
        SupervisedBy: document.getElementById('txtSupervisedBy'),
        SupervisedOn: document.getElementById('txtSupervisedOn')
    };

    // Load dependencies
    (async () => {
        const { ServiceLoader } = global;
        if (!ServiceLoader) {
            console.error("ServiceLoader not found!");
            return;
        }

        try {
            await ServiceLoader.loadCore();
            // Load AuthService explicitly since it's not in loadCommonServices or loadCore
            await ServiceLoader.loadScript('/assets/js/auth/auth.service.js');
            await ServiceLoader.loadClientService(); // We added getCustomerQuery here
            await ServiceLoader.loadCommonServices(); // For Auth/Lookup

            console.log('[CustomerQuery] Dependencies loaded');
            init();
        } catch (error) {
            console.error('[CustomerQuery] Failed to load dependencies:', error);
        }
    })();

    function init() {
        setupNavigation();
        setupAutofill();

        if (searchBtn) {
            searchBtn.addEventListener('click', () => {
                // If input is empty, open search modal. If not, maybe just trigger blur?
                // User said: "when I click on search icon ... I want a small popup"
                // So always open popup on icon click.
                openSearchModal();
            });
        }

        if (viewBtn) {
            viewBtn.addEventListener('click', onView);
        }

        if (cancelBtn) {
            cancelBtn.addEventListener('click', onCancel);
        }

        // Listener for messages from Search Modal
        window.addEventListener('message', (event) => {
            if (event.data && event.data.type === 'CLIENT_SELECTED') {
                const { clientId, data } = event.data;

                // Close modal (find the overlay)
                const overlay = document.querySelector('.search-modal-overlay');
                if (overlay) overlay.remove();

                // Populate Client ID
                if (txtClientId) {
                    txtClientId.value = clientId;
                    // User requested "paste the details in the original customer query form".
                    // This implies populating the whole form (GRID + BTS), which onView does.
                    // So we simulate a view action.
                    if (viewBtn) {
                        // We can call the handler directly or trigger click.
                        // Calling handler logic is safer/more explicit if we extract it,
                        // but triggering onView(e) requires a mock event or extracted logic.
                        // Let's call a shared function or mock the event.
                        const mockEvent = { preventDefault: () => { } };
                        onView(mockEvent);
                    } else {
                        // Fallback if view button missing
                        onClientIdBlur({ target: txtClientId });
                    }
                }
            }
        });
    }

    function openSearchModal() {
        const overlay = document.createElement('div');
        overlay.className = 'search-modal-overlay'; // For easy find
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
            z-index: 9999; display: flex; align-items: center; justify-content: center;
            padding: 20px;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            width: 900px; height: 600px; background: white;
            border-radius: 16px; overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            display: flex; flex-direction: column;
        `;

        const iframe = document.createElement('iframe');
        iframe.src = 'client-search.html';
        iframe.style.cssText = 'flex: 1; width: 100%; border: none;';

        // Header for modal
        const header = document.createElement('div');
        header.style.cssText = `
            padding: 10px 20px; border-bottom: 1px solid #eee; 
            display: flex; justify-content: space-between; align-items: center;
            background: #f8fafc;
        `;
        header.innerHTML = `
            <span style="font-weight:600">Client Search</span>
            <button class="close-btn" style="border:none;background:none;font-size:18px;cursor:pointer">&times;</button>
        `;

        header.querySelector('.close-btn').addEventListener('click', () => overlay.remove());

        modal.appendChild(header);
        modal.appendChild(iframe);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    function setupAutofill() {
        if (txtClientId) {
            txtClientId.addEventListener('blur', onClientIdBlur);
        }
    }

    function onCancel(e) {
        if (e) e.preventDefault();

        // Clear Search Inputs
        if (txtClientId) txtClientId.value = '';
        if (txtClientDescription) txtClientDescription.value = '';

        // Clear Grid
        if (tableBody) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-muted italic text-center">No records to display.</td></tr>';
        }

        // Clear BTS Inputs
        clearBTS();
    }

    async function onClientIdBlur(e) {
        // ... (existing logic handled below in generic fetch if desired, but kept separate for single field update)
        // Re-implementing strictly for description as previously done
        const clientId = e.target.value.trim();
        if (!txtClientDescription) return;

        if (!clientId) {
            txtClientDescription.value = '';
            return;
        }

        // Only show loading if empty
        if (!txtClientDescription.value) txtClientDescription.value = 'Loading...';

        // We can reuse the fetch logic or keep it separate. 
        // For autofill, we just need the name.
        // Let's call a lightweight version or the same one.
        const payload = getPayload(clientId);
        try {
            const result = await global.ClientService.getCustomerQuery(payload);
            if (result.success && result.data) {
                const data = result.data.Details || result.data || [];
                let clientName = "";
                // Try to find name in Details (DataSet 1)
                if (Array.isArray(data) && data.length > 0) {
                    clientName = data[0].ClientName || data[0].Name || "";
                }
                txtClientDescription.value = clientName || "Client not found";
            } else {
                txtClientDescription.value = "Client not found";
            }
        } catch (err) {
            console.error(err);
            txtClientDescription.value = "Error";
        }
    }

    async function onView(e) {
        e.preventDefault();
        const clientId = txtClientId ? txtClientId.value.trim() : "";

        if (!clientId) {
            alert("Please enter a Client ID");
            return;
        }

        if (tableBody) tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';

        const payload = getPayload(clientId);
        console.log('[CustomerQuery] View Payload:', payload);

        try {
            const result = await global.ClientService.getCustomerQuery(payload);
            console.log('[CustomerQuery] View Result:', result);

            if (result.success) {
                processViewData(result.data);
            } else {
                if (tableBody) tableBody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">${result.message || "No data"}</td></tr>`;
                clearBTS();
            }
        } catch (error) {
            console.error('[CustomerQuery] View Error:', error);
            if (tableBody) tableBody.innerHTML = `<tr><td colspan="5" class="text-danger text-center">Error fetching data</td></tr>`;
        }
    }

    function processViewData(data) {
        // User said: "data from the second dataset to populate on the grid and behind the scen section too"
        // Dataset 1: Details
        // Dataset 2: Details01 (prioritized for Grid/BTS)

        const secondDataset = data.Details01 || [];
        const firstDataset = data.Details || [];

        // Use second dataset if available, otherwise first for Grid/BTS
        const records = (Array.isArray(secondDataset) && secondDataset.length > 0) ? secondDataset : (Array.isArray(firstDataset) ? firstDataset : []);

        bindTable(records);

        // For BTS, bind the first record of the dataset used for the grid
        if (records.length > 0) {
            bindBTS(records[0]);
        } else {
            clearBTS();
        }

        // Populate Client Description (Name)
        // We look for Name in Details (Standard) first, then Details01
        if (txtClientDescription) {
            let clientName = "";

            // Try Details first (usually contains Client Header info)
            if (Array.isArray(firstDataset) && firstDataset.length > 0) {
                const r = firstDataset[0];
                clientName = r.ClientName || r.Name || r.Description || r.AccountName;
            }

            // Fallback to Details01 if not found
            if (!clientName && Array.isArray(secondDataset) && secondDataset.length > 0) {
                const r = secondDataset[0];
                clientName = r.ClientName || r.Name || r.Description || r.AccountName;
            }

            txtClientDescription.value = clientName || "";
        }
    }

    let selectedAccount = null;

    // Expose selectedAccount to window so child frames can access it
    window.selectedAccount = null;

    function setupNavigation() {
        const navLinks = document.querySelectorAll('.nav-item-link');

        const actions = {
            'Account Statement': 'account-statement-new.html',
            'Loan Schedule': 'loan-schedule.html',
            'Loan History': 'loan-history.html',
            'Account Collaterals': 'account-collaterals.html',
            'Account Guarantors': 'account-guarantors.html',
            'Signature/Photograph': 'signature-photograph.html',
            'Graphical Client Portfolio': 'graphical-client-portfolio.html'
        };

        navLinks.forEach(link => {
            const text = link.textContent.trim();
            if (actions[text]) {
                link.addEventListener('click', (e) => {
                    e.preventDefault();
                    let url = actions[text];

                    // Check if account is selected
                    if (!selectedAccount) {
                        alert("Please select an account from the customer query result first.");
                        return;
                    }

                    // Pass context if available for Account Statement
                    if (text === 'Account Statement') {
                        const accId = selectedAccount.AccountID;
                        const brId = selectedAccount.OurBranchID;
                        if (accId) {
                            url += `?accountId=${accId}&branchId=${brId}`;
                        }
                    }

                    // Log for debugging Loan Schedule
                    if (text === 'Loan Schedule') {
                        console.log('[CustomerQuery] Opening Loan Schedule for account:', selectedAccount);
                        console.log('[CustomerQuery] ProductTypeID:', selectedAccount.ProductTypeID);
                    }

                    // Log for debugging Loan History
                    if (text === 'Loan History') {
                        console.log('[CustomerQuery] Opening Loan History for account:', selectedAccount);
                        console.log('[CustomerQuery] ProductTypeID:', selectedAccount.ProductTypeID);
                    }

                    // Log for debugging Account Collaterals
                    if (text === 'Account Collaterals') {
                        console.log('[CustomerQuery] Opening Account Collaterals for account:', selectedAccount);
                        console.log('[CustomerQuery] ProductTypeID:', selectedAccount.ProductTypeID);
                    }

                    // Log for debugging Account Guarantors
                    if (text === 'Account Guarantors') {
                        console.log('[CustomerQuery] Opening Account Guarantors for account:', selectedAccount);
                        console.log('[CustomerQuery] ProductTypeID:', selectedAccount.ProductTypeID);
                    }

                    openModal(url);
                });
            }
        });
    }

    function bindTable(rows) {
        if (!tableBody) return;

        if (rows.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5" class="text-muted italic text-center">No records to display.</td></tr>';
            selectedAccount = null;
            return;
        }

        tableBody.innerHTML = rows.map((row, index) => {
            const rowData = encodeURIComponent(JSON.stringify(row));
            const activeClass = index === 0 ? 'table-active' : '';
            if (index === 0) {
                selectedAccount = row;
                window.selectedAccount = row; // Expose to child windows
                
                // Create CustomerQueryState for child windows (like Loan Schedule)
                window.CustomerQueryState = {
                    OurBranchID: row.OurBranchID || '',
                    AccountID: row.AccountID || row.AccountNumber || '',
                    AccountType: row.AccountType || row.Type || '',
                    ProductID: row.ProductID || '',
                    ProductTypeID: row.ProductTypeID || '',
                    ProductType: row.ProductType || '',
                    LoanSeries: row.LoanSeries || row.LoanSeriesNo || '',
                    ClientID: txtClientId ? txtClientId.value.trim() : ''
                };
            }

            // Parse the balance - it comes as formatted string like "-5,391,348.92"
            const balance = parseCurrency(row.ClearBalance);
            const isNegative = balance < 0;
            const formattedBalance = formatMoney(Math.abs(balance));
            const balanceHTML = isNegative
                ? `<span style="color: red;">(${formattedBalance})</span>`
                : formattedBalance;

            return `
            <tr data-row="${rowData}" data-index="${index}" class="clickable-row ${activeClass}">
                <td>${row.AccountType || row.Type || ''}</td>
                <td>${row.OurBranchID || ''}</td>
                <td>${row.ProductID || ''}</td>
                <td>${row.AccountID || row.AccountNumber || ''}</td>
                <td class="text-end">${balanceHTML}</td>
            </tr>
        `}).join('');

        // Add Click Listeners
        const trs = tableBody.querySelectorAll('tr');
        trs.forEach(tr => {
            tr.addEventListener('click', () => {
                console.log('[CustomerQuery] Table row clicked');
                trs.forEach(t => t.classList.remove('table-active'));
                tr.classList.add('table-active');

                try {
                    const data = JSON.parse(decodeURIComponent(tr.dataset.row));
                    console.log('[CustomerQuery] Parsed row data:', data);
                    console.log('[CustomerQuery] OpenedDate from row:', data.OpenedDate);
                    selectedAccount = data;
                    
                    // Update CustomerQueryState for child windows
                    window.CustomerQueryState = {
                        OurBranchID: data.OurBranchID || '',
                        AccountID: data.AccountID || data.AccountNumber || '',
                        AccountType: data.AccountType || data.Type || '',
                        ProductID: data.ProductID || '',
                        ProductTypeID: data.ProductTypeID || '',
                        ProductType: data.ProductType || '',
                        LoanSeries: data.LoanSeries || data.LoanSeriesNo || '',
                        ClientID: txtClientId ? txtClientId.value.trim() : ''
                    };
                    console.log('[CustomerQuery] Updated CustomerQueryState:', window.CustomerQueryState);
                    
                    bindBTS(data);
                } catch (e) { 
                    console.error('[CustomerQuery] Error parsing row data:', e); 
                }
            });
        });
        
        // Auto-bind first row
        if (rows.length > 0) {
            console.log('[CustomerQuery] Auto-binding first row');
            bindBTS(rows[0]);
        }
    }

    function bindBTS(record) {
        console.log('[CustomerQuery] bindBTS called with record:', record);
        if (!record) {
            console.log('[CustomerQuery] bindBTS: No record provided');
            return;
        }

        // Create field aliases to map database field names to our input field keys
        const fieldAliases = {
            'OpenedDate': 'OpenDate'  // Database field -> Our field key
        };

        console.log('[CustomerQuery] Record.OpenedDate:', record.OpenedDate);
        console.log('[CustomerQuery] Record.OpenDate:', record.OpenDate);

        const normalizedRecord = {};
        Object.keys(record).forEach(k => {
            normalizedRecord[k.toLowerCase()] = record[k];
            // Also map with aliases
            const alias = fieldAliases[k];
            if (alias) {
                console.log(`[CustomerQuery] Mapping alias: ${k} -> ${alias}, value:`, record[k]);
                normalizedRecord[alias.toLowerCase()] = record[k];
            }
        });

        console.log('[CustomerQuery] Normalized record keys:', Object.keys(normalizedRecord));
        console.log('[CustomerQuery] Normalized opendate:', normalizedRecord['opendate']);
        console.log('[CustomerQuery] Normalized openeddate:', normalizedRecord['openeddate']);

        Object.keys(btsFields).forEach(key => {
            const input = btsFields[key];
            if (!input) {
                if (key === 'OpenDate') console.log('[CustomerQuery] OpenDate input not found!');
                return;
            }

            let val = record[key];
            if (val === undefined) {
                val = normalizedRecord[key.toLowerCase()];
            }
            
            if (key === 'OpenDate') {
                console.log(`[CustomerQuery] Processing OpenDate: val=${val}, record[${key}]=${record[key]}, normalized=${normalizedRecord[key.toLowerCase()]}`);
            }

            if (key.includes('Balance') || key.includes('Amount') || key.includes('Interest') || key.includes('DrawingPower') || key.includes('Credits') || key.includes('Debits')) {
                // Parse currency string (handles commas and formats like "-5,391,348.92")
                const numericVal = parseCurrency(val);
                const isNegative = numericVal < 0;
                const formatted = formatMoney(Math.abs(numericVal));

                if (isNegative) {
                    input.value = `(${formatted})`;
                    input.style.cssText = 'color: #dc3545 !important; font-weight: 600; text-align: right;';
                } else {
                    input.value = formatted;
                    input.style.cssText = 'color: #495057; font-weight: 600; text-align: right;';
                }
            } else {
                input.value = val !== undefined && val !== null ? val : '';
                input.style.cssText = 'color: #495057; font-weight: 600; text-align: right;';
            }
        });
    }

    function clearBTS() {
        Object.values(btsFields).forEach(input => {
            if (input) {
                input.value = '';
                input.style.color = '';
            }
        });
    }

    function formatMoney(amount) {
        if (amount == null || amount === '') return '0.00';
        const numeric = typeof amount === 'number' ? amount : parseCurrency(amount);
        if (isNaN(numeric)) return '0.00';
        return numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    }

    // Helper function to parse currency strings that may contain commas
    // Handles formats like: "-5,391,348.92", "45,718.18", "0.00", etc.
    function parseCurrency(value) {
        if (value == null || value === '') return 0;
        if (typeof value === 'number') return value;
        
        // Convert to string and remove all commas
        const cleanValue = String(value).replace(/,/g, '');
        const numeric = parseFloat(cleanValue);
        
        return isNaN(numeric) ? 0 : numeric;
    }

    function getPayload(clientId) {
        const AuthService = global.AuthService;
        let operatorId = "CSADM";
        let branchId = "0101";

        try {
            const session = AuthService?.getSession?.();
            if (session) {
                if (session.operatorId) operatorId = session.operatorId;
                if (session.branchId) branchId = session.branchId;
            }
        } catch (err) { }

        return {
            OurBranchID: branchId || "0101",
            ClientID: clientId,
            OperatorID: operatorId
        };
    }

    function openModal(src) {
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
            z-index: 9999; display: flex; align-items: center; justify-content: center;
            padding: 20px;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            width: 95%; height: 90vh; background: white;
            border-radius: 16px; overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            display: flex; flex-direction: column;
        `;

        const iframe = document.createElement('iframe');
        iframe.src = src;
        iframe.style.cssText = 'flex: 1; width: 100%; border: none;';

        modal.appendChild(iframe);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });

        const messageHandler = (event) => {
            if (typeof event.data === 'string' && event.data.includes('close-')) {
                overlay.remove();
                window.removeEventListener('message', messageHandler);
            }
        };
        window.addEventListener('message', messageHandler);
    }
})(window);
