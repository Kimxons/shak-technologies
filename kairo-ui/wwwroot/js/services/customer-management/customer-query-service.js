// --- Legacy Utility Functions ---
function formatMoney(amount) {
    if (amount == null || amount === '') return '0.00';
    const numeric = typeof amount === 'number' ? amount : parseCurrency(amount);
    if (isNaN(numeric)) return '0.00';
    return numeric.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function parseCurrency(value) {
    if (value == null || value === '') return 0;
    if (typeof value === 'number') return value;
    const cleanValue = String(value).replace(/,/g, '');
    const numeric = parseFloat(cleanValue);
    return isNaN(numeric) ? 0 : numeric;
}

function getPayload(clientId) {
    const AuthService = window.AuthService || global.AuthService;
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

function bindTable(rows, tableBody, txtClientId) {
    if (!tableBody) return;
    if (rows.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-muted italic text-center">No records to display.</td></tr>';
        window.selectedAccount = null;
        return;
    }
    tableBody.innerHTML = rows.map((row, index) => {
        const rowData = encodeURIComponent(JSON.stringify(row));
        const activeClass = index === 0 ? 'table-active' : '';
        if (index === 0) {
            window.selectedAccount = row;
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
        const balance = parseCurrency(row.ClearBalance);
        const isNegative = balance < 0;
        const formattedBalance = formatMoney(Math.abs(balance));
        const balanceHTML = isNegative
            ? `<span style="color: red;">(${formattedBalance})</span>`
            : formattedBalance;
        return `\n<tr data-row="${rowData}" data-index="${index}" class="clickable-row ${activeClass}">\n    <td>${row.AccountType || row.Type || ''}</td>\n    <td>${row.OurBranchID || ''}</td>\n    <td>${row.ProductID || ''}</td>\n    <td>${row.AccountID || row.AccountNumber || ''}</td>\n    <td class="text-end">${balanceHTML}</td>\n</tr>\n`;
    }).join('');
    // Add Click Listeners
    const trs = tableBody.querySelectorAll('tr');
    trs.forEach(tr => {
        tr.addEventListener('click', () => {
            trs.forEach(t => t.classList.remove('table-active'));
            tr.classList.add('table-active');
            try {
                const data = JSON.parse(decodeURIComponent(tr.dataset.row));
                window.selectedAccount = data;
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
                bindBTS(data);
            } catch (e) { }
        });
    });
    // Auto-bind first row
    if (rows.length > 0) {
        bindBTS(rows[0]);
    }
}

function bindBTS(record) {
    if (!record) return;
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
        CreatedBy: document.getElementById('txtCreatedBy'),
        CreatedOn: document.getElementById('txtCreatedOn'),
        ModifiedBy: document.getElementById('txtModifiedBy'),
        ModifiedOn: document.getElementById('txtModifiedOn'),
        SupervisedBy: document.getElementById('txtSupervisedBy'),
        SupervisedOn: document.getElementById('txtSupervisedOn')
    };
    const fieldAliases = { 'OpenedDate': 'OpenDate' };
    const normalizedRecord = {};
    Object.keys(record).forEach(k => {
        normalizedRecord[k.toLowerCase()] = record[k];
        const alias = fieldAliases[k];
        if (alias) normalizedRecord[alias.toLowerCase()] = record[k];
    });
    Object.keys(btsFields).forEach(key => {
        const input = btsFields[key];
        if (!input) return;
        let val = record[key];
        if (val === undefined) val = normalizedRecord[key.toLowerCase()];
        if (key.includes('Balance') || key.includes('Amount') || key.includes('Interest') || key.includes('DrawingPower') || key.includes('Credits') || key.includes('Debits')) {
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

function processViewData(data, tableBody, txtClientId) {
    const secondDataset = data.Details01 || [];
    const firstDataset = data.Details || [];
    const records = (Array.isArray(secondDataset) && secondDataset.length > 0) ? secondDataset : (Array.isArray(firstDataset) ? firstDataset : []);
    bindTable(records, tableBody, txtClientId);
    if (records.length > 0) {
        bindBTS(records[0]);
    }
    // Populate Client Description (Name)
    const txtClientDescription = document.getElementById('txtClientDescription');
    let clientName = "";
    if (Array.isArray(firstDataset) && firstDataset.length > 0) {
        const r = firstDataset[0];
        clientName = r.ClientName || r.Name || r.Description || r.AccountName;
    }
    if (!clientName && Array.isArray(secondDataset) && secondDataset.length > 0) {
        const r = secondDataset[0];
        clientName = r.ClientName || r.Name || r.Description || r.AccountName;
    }
    if (txtClientDescription) txtClientDescription.value = clientName || "";
}

export { formatMoney, parseCurrency, getPayload, bindTable, bindBTS, processViewData };
// Utility: Envelope creation and request time formatting
function pad2(n) { return String(n).padStart(2, "0"); }
function formatRequestTime(date = new Date()) {
    const mm = pad2(date.getMonth() + 1);
    const dd = pad2(date.getDate());
    const yyyy = String(date.getFullYear());
    const hh = pad2(date.getHours());
    const mi = pad2(date.getMinutes());
    const ss = pad2(date.getSeconds());
    return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
}
function makeRequestEnvelope(formId, requestData, appName = 'PROJECT_KAIRO') {
    return {
        RequestID: formId,
        FormId: formId,
        RequestData: requestData,
        RequestTime: formatRequestTime(new Date()),
        AppName: appName,
        Checksum: ''
    };
}
function getBaseUrl() {
    return window.Environment?.baseUrlSystemCodes || window.Environment?.baseUrlCommon || "http://localhost:5059";
}
function getLegacyBaseUrl() {
    return "http://172.16.2.31:3306";
}
// customer-query-service.js
// Dedicated service for Customer Query DB calls


class CustomerQueryService {
        // Customer Query main DB call
        async getCustomerQuery(requestData) {
            const formId = "dbo.p_GetCustomerQuery";
            const envelope = makeRequestEnvelope(formId, requestData);
            const endpoint = `${getBaseUrl().replace(/\/+$/, '')}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to fetch customer query');
            return response.json();
        }

        // Account Details for View modules
        async getAccountDetails(requestData) {
            const formId = "dbo.p_GetAccountDetails";
            const envelope = makeRequestEnvelope(formId, requestData);
            const endpoint = `${getBaseUrl().replace(/\/+$/, '')}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to fetch account details');
            return response.json();
        }

        // Client Details for autofill
        async getClientDetails(requestData) {
            const formId = "dbo.p_GetClient";
            // Ensure Direction is included (default 0)
            const fullRequestData = {
                ...requestData,
                Direction: typeof requestData.Direction !== 'undefined' ? requestData.Direction : 0
            };
            const envelope = makeRequestEnvelope(formId, fullRequestData);
            const endpoint = `${getBaseUrl().replace(/\/+$/, '')}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to fetch client details');
            return response.json();
        }

        // View submodules: Address
        async getClientAddressDetails(requestData) {
            const formId = "dbo.p_GetClientAddress";
            const envelope = makeRequestEnvelope(formId, requestData);
            const endpoint = `${getLegacyBaseUrl()}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to fetch client address details');
            return response.json();
        }
        async addEditClientAddress(requestData) {
            const formId = "dbo.p_AddEditClientAddress";
            const envelope = makeRequestEnvelope(formId, requestData);
            const endpoint = `${getLegacyBaseUrl()}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to add/edit client address');
            return response.json();
        }
        async deleteClientAddress(requestData) {
            const formId = "dbo.p_DeleteClientAddress";
            const envelope = makeRequestEnvelope(formId, requestData);
            const endpoint = `${getLegacyBaseUrl()}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to delete client address');
            return response.json();
        }

        // View submodules: Introducer
        async getClientIntroducer(requestData) {
            const formId = "dbo.p_GetClientIntroducer";
            const envelope = makeRequestEnvelope(formId, requestData);
            const endpoint = `${getLegacyBaseUrl()}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to fetch client introducer');
            return response.json();
        }
        async addEditClientIntroducer(requestData) {
            const formId = "dbo.p_AddEditClientIntroducer";
            const envelope = makeRequestEnvelope(formId, requestData);
            const endpoint = `${getLegacyBaseUrl()}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to add/edit client introducer');
            return response.json();
        }
        async deleteClientIntroducer(requestData) {
            const formId = "dbo.p_DeleteClientIntroducer";
            const envelope = makeRequestEnvelope(formId, requestData);
            const endpoint = `${getLegacyBaseUrl()}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to delete client introducer');
            return response.json();
        }

        // View submodules: Bank Accounts
        async getClientBankAccounts(requestData) {
            const formId = "dbo.p_GetClientBankAccounts";
            const envelope = makeRequestEnvelope(formId, requestData);
            const endpoint = `${getLegacyBaseUrl()}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to fetch client bank accounts');
            return response.json();
        }

        // View submodules: Relations
        async getClientMaintenanceRelation(requestData) {
            const formId = "dbo.p_GetClientRelations";
            const envelope = makeRequestEnvelope(formId, requestData);
            const endpoint = `${getLegacyBaseUrl()}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to fetch client relations');
            return response.json();
        }
        async addEditClientRelation(requestData) {
            const formId = "dbo.p_AddEditClientRelations";
            const envelope = makeRequestEnvelope(formId, requestData);
            const endpoint = `${getLegacyBaseUrl()}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to add/edit client relation');
            return response.json();
        }
        async deleteClientRelation(requestData) {
            const formId = "dbo.p_DeleteClientRelations";
            const envelope = makeRequestEnvelope(formId, requestData);
            const endpoint = `${getLegacyBaseUrl()}/api/OldAPI`;
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(envelope)
            });
            if (!response.ok) throw new Error('Failed to delete client relation');
            return response.json();
        }

        // View submodules: Collaterals, Guarantors, Signature/Photograph, Portfolio, etc. can be added similarly if needed
    constructor(apiBaseUrl) {
        this.apiBaseUrl = apiBaseUrl || '/api/customer-query';
    }

    async getPortfolioData(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/portfolio`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to fetch portfolio data');
        return response.json();
    }

    async getClientDetails(clientId) {
        // Match legacy ClientService.getClient logic
        const formId = "dbo.p_GetClient";
        // Try to get OurBranchID from environment or fallback
        const ourBranchId = window.Environment?.OurBranchID || window.Environment?.ourBranchId || '0001';
        const operatorId = window.Environment?.OperatorID || window.Environment?.operatorId || 'admin';
        const requestData = { ClientID: clientId, OurBranchID: ourBranchId, OperatorID: operatorId };
        // Legacy request time formatting: MM/DD/YYYY HH:mm:ss
        function pad2(n) { return String(n).padStart(2, "0"); }
        function formatRequestTime(date = new Date()) {
            const mm = pad2(date.getMonth() + 1);
            const dd = pad2(date.getDate());
            const yyyy = String(date.getFullYear());
            const hh = pad2(date.getHours());
            const mi = pad2(date.getMinutes());
            const ss = pad2(date.getSeconds());
            return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
        }
        const envelope = {
            RequestID: formId,
            FormId: formId,
            RequestData: requestData,
            RequestTime: formatRequestTime(new Date()),
            AppName: 'PROJECT_KAIRO',
            Checksum: ''
        };
        // Use legacy base URL logic
        const baseUrl = window.Environment?.baseUrlSystemCodes || window.Environment?.baseUrlCommon || "http://localhost:5059";
        const endpoint = `${baseUrl.replace(/\/+$/, '')}/api/OldAPI`;
        const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(envelope)
        });
        if (!response.ok) throw new Error('Failed to fetch client details');
        return response.json();
    }

    async getAccountDetails(clientId) {
        const response = await fetch(`${this.apiBaseUrl}/accounts/${clientId}`);
        if (!response.ok) throw new Error('Failed to fetch account details');
        return response.json();
    }

    async getBehindTheScene(accountId) {
        const response = await fetch(`${this.apiBaseUrl}/behind-the-scene/${accountId}`);
        if (!response.ok) throw new Error('Failed to fetch behind the scene data');
        return response.json();
    }

    async getCustomerQuery(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/customer-query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to fetch customer query');
        return response.json();
    }

    async getClientAddressDetails(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/client-address`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to fetch client address details');
        return response.json();
    }

    async addEditClientAddress(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/client-address/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to add/edit client address');
        return response.json();
    }

    async deleteClientAddress(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/client-address/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to delete client address');
        return response.json();
    }

    async getClientIntroducer(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/client-introducer`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to fetch client introducer');
        return response.json();
    }

    async addEditClientIntroducer(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/client-introducer/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to add/edit client introducer');
        return response.json();
    }

    async deleteClientIntroducer(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/client-introducer/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to delete client introducer');
        return response.json();
    }

    async getClientBankAccounts(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/client-bank-accounts`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to fetch client bank accounts');
        return response.json();
    }

    async searchClearingBanks(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/clearing-banks/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to search clearing banks');
        return response.json();
    }

    async getClientMaintenanceRelation(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/client-relations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to fetch client relations');
        return response.json();
    }

    async addEditClientRelation(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/client-relations/edit`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to add/edit client relation');
        return response.json();
    }

    async deleteClientRelation(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/client-relations/delete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to delete client relation');
        return response.json();
    }

    async saveClientBankAccount(requestData) {
        const response = await fetch(`${this.apiBaseUrl}/client-bank-accounts/save`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(requestData)
        });
        if (!response.ok) throw new Error('Failed to save client bank account');
        return response.json();
    }
}

const customerQueryService = new CustomerQueryService();
export default customerQueryService;
