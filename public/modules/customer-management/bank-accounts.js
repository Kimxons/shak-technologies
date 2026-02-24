(function (global) {
    let ClientService;
    let bankAccounts = [];
    let selectedAccount = null;
    let allAccounts = [];

    // Mappings for ProductTypeID and InstitutionTypeID as per enterprise standards
    const PRODUCT_TYPE_MAP = {
        "Savings Bank": "SB",
        "Compulsory Savings / Loan Insurance Fund": "CS",
        "Overdraft": "OD",
        "Current Account": "CA",
        "Fixed Deposit": "FD",
        "Loans": "LN",
        "Shares": "SH",
        "Lockers": "LK",
        "Recurring Deposits": "RD",
        "Money Market Lending": "ML",
        "Money Market Borrowing": "MB",
        "Treasury Bills": "TB",
        "Treasury Bonds": "TR",
        "Commercial Papers": "CP",
        "Repos": "RP",
        "Reverse Repos": "RR",
        "Zero Coupon Bonds": "ZB",
        "Bill Discounting": "BD",
        "Letters of Guarantee": "LG",
        "Fixed Assets": "FA",
        "Letters Of Credit": "LC",
        "Savings Certificates": "SC",
        "Term Deposit": "TD",
        "PostBank": "PB",
        "NONE": "NN"
    };

    const INST_TYPE_MAP = {
        "Bank": "B",
        "International Bank": "I"
    };

    /**
     * Initialization of Bank Accounts Page logic
     */
    const initBankAccountsPage = async function () {
        const { ServiceLoader } = global;

        if (ServiceLoader) {
            const basePath = '../../assets/js/';
            try {
                // Synchronize script loading with other modules
                await ServiceLoader.loadScripts([
                    `${basePath}services/shared/coreApi.js`,
                    `${basePath}services/client/clientService.js`
                ]);
                ClientService = global.ClientService;
                console.log('[Bank Accounts] Services loaded successfully');

                // Initialize UI State
                setInitialButtonState();
                toggleFields(true); // Lock fields by default

                // Populate Dropdowns
                loadDropdownOptions();

                // Fetch and display initial data
                await fetchBankAccounts();
            } catch (error) {
                console.error('[Bank Accounts] Initialization failed:', error);
            }
        }

        // Wire up Action Buttons
        setupEventListeners();
    };

    /**
     * Populates static dropdown options as per requested screenshots
     */
    function loadDropdownOptions() {
        // 1. Account Type Dropdown
        const accountTypeSelect = document.getElementById('accountType');
        if (accountTypeSelect) {
            const types = [
                "Savings Bank",
                "Compulsory Savings / Loan Insurance Fund",
                "Overdraft",
                "Current Account",
                "Fixed Deposit",
                "Loans",
                "Shares",
                "Lockers",
                "Recurring Deposits",
                "Money Market Lending",
                "Money Market Borrowing",
                "Treasury Bills",
                "Treasury Bonds",
                "Commercial Papers",
                "Repos",
                "Reverse Repos",
                "Zero Coupon Bonds",
                "Bill Discounting",
                "Letters of Guarantee",
                "Fixed Assets",
                "Letters Of Credit",
                "Savings Certificates",
                "Term Deposit",
                "PostBank",
                "NONE"
            ];

            // Clear existing except placeholder
            accountTypeSelect.innerHTML = '<option value="">--Select Account Type--</option>';
            types.forEach(type => {
                const opt = document.createElement('option');
                opt.value = type;
                opt.textContent = type;
                accountTypeSelect.appendChild(opt);
            });
        }

        // 2. Institution Type Dropdown
        const institutionTypeSelect = document.getElementById('institutionType');
        if (institutionTypeSelect) {
            const instTypes = ["Bank", "International Bank"];
            institutionTypeSelect.innerHTML = '<option value="">--Select Institution Type--</option>';
            instTypes.forEach(type => {
                const opt = document.createElement('option');
                opt.value = type;
                opt.textContent = type;
                institutionTypeSelect.appendChild(opt);
            });
        }
    }

    /**
     * Fetches bank accounts for the active client from the parent container
     */
    async function fetchBankAccounts() {
        if (!ClientService) return;

        const parentWindow = global.parent;
        const parentDoc = parentWindow.document;
        // Retrieve Client ID from the parent Maintenance window
        const clientId = parentDoc.getElementById('ClientID')?.value?.trim();

        if (!clientId) {
            console.warn('[Bank Accounts] ClientID not found. Ensure a client is loaded in the main form.');
            return;
        }

        // Gather session/environment info for the request
        const session = parentWindow.getAuthSession?.() || {};
        const env = parentWindow.Environment || {};

        const payload = {
            ClientID: clientId,
            OurBranchID: session.branchID || session.branchId || env.OurBranchID || "0101",
            OperatorID: session.operatorId || session.operatorID || env.OperatorID || "SYSTEM"
        };

        try {
            console.log('[Bank Accounts] Fetching accounts for:', clientId);
            const response = await ClientService.getClientBankAccounts(payload);
            console.log('[Bank Accounts] API Response:', response);

            if (response && response.success) {
                // Determine the correct array source (response.data could be an array, or an object with Details01/Table)
                let rawData = response.data;
                if (rawData && !Array.isArray(rawData)) {
                    // Try common wrapper names used in the backend
                    bankAccounts = rawData.Details01 || rawData.Table || rawData.data || [];
                    // If it's still an object (but not an array), wrap it as a single-item array
                    if (!Array.isArray(bankAccounts) && typeof bankAccounts === 'object') {
                        bankAccounts = [bankAccounts];
                    }
                } else {
                    bankAccounts = Array.isArray(rawData) ? rawData : [];
                }

                renderBankAccountsTable(bankAccounts);
                updateActionButtonsState(); // Update buttons based on record count

                if (bankAccounts.length === 0) {
                    global.Toast?.show('No bank accounts found for this client.', 'info');
                }
            } else {
                global.Toast?.show(response?.message || 'Failed to fetch bank accounts.', 'error');
                updateActionButtonsState();
            }
        } catch (error) {
            console.error('[Bank Accounts] API Error:', error);
            global.Toast?.show('An error occurred while fetching bank accounts.', 'error');
        }
    }

    /**
     * Renders the fetched records into the results table
     */
    function renderBankAccountsTable(accounts) {
        const tbody = document.querySelector('.bank-table tbody');
        if (!tbody) return;

        allAccounts = Array.isArray(accounts) ? accounts : [];

        if (allAccounts.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="3" style="text-align: center; padding: 30px; color: var(--text-muted);">
                        No records found. Click 'Add' to enter new account details.
                    </td>
                </tr>
            `;
            return;
        }

        tbody.innerHTML = allAccounts.map((acc, index) => `
            <tr data-index="${index}" style="cursor: pointer;">
                <td>${acc.ClientID || ''}</td>
                <td>${acc.InstitutionName || acc.Name || ''}</td>
                <td>${acc.AccountID || acc.AccountNumber || ''}</td>
            </tr>
        `).join('');

        // Add Click Listeners to Rows
        tbody.querySelectorAll('tr').forEach(row => {
            row.addEventListener('click', (e) => {
                const index = e.currentTarget.getAttribute('data-index');
                const account = allAccounts[index];
                selectAccount(account, e.currentTarget);
            });
        });
    }

    /**
     * Handles selection of a row in the table
     */
    function selectAccount(account, rowElement) {
        selectedAccount = account;

        // Visual selection
        const tbody = document.querySelector('.bank-table tbody');
        tbody.querySelectorAll('tr').forEach(tr => tr.classList.remove('selected-row'));
        rowElement.classList.add('selected-row');

        // Populate Fields
        populateForm(account);
        toggleFields(true); // Keep locked

        // Enable Edit, Disable Add/Delete
        const actions = getActionButtons();
        actions.add.disabled = true;
        actions.edit.disabled = false;
        if (actions.delete) actions.delete.disabled = true;
        actions.save.disabled = true;
        actions.cancel.disabled = false;
    }

    /**
     * Maps database fields back to the form inputs
     */
    function populateForm(acc) {
        if (!acc) return;

        // 1. Map labels back for dropdowns
        const accountTypeSelect = document.getElementById('accountType');
        const institutionTypeSelect = document.getElementById('institutionType');

        const typeLabel = Object.keys(PRODUCT_TYPE_MAP).find(key => PRODUCT_TYPE_MAP[key] === acc.ProductTypeID)
            || acc.AccountType || '';
        if (accountTypeSelect) accountTypeSelect.value = typeLabel;

        const instLabel = Object.keys(INST_TYPE_MAP).find(key => INST_TYPE_MAP[key] === acc.InstitutionTypeID)
            || acc.InstitutionType || '';
        if (institutionTypeSelect) institutionTypeSelect.value = instLabel;

        // 2. Simple fields
        const setVal = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.value = val || '';
        };

        setVal('bankId', acc.BankID);
        setVal('branchId', acc.BranchID);
        setVal('accountId', acc.AccountID || acc.AccountNumber || acc.BankAccountID);
        setVal('balance', acc.Balance);
        setVal('terms', acc.Term || acc.Terms);
        setVal('advanceAmount', acc.AdvanceAmount);
        setVal('monthlyPayment', acc.MonthlyPayment);
        setVal('institutionName', acc.InstitutionName || acc.Name);
        setVal('branchName', acc.BranchName);

        // 3. Populate Audit Spans
        const setSpan = (id, val) => {
            const el = document.getElementById(id);
            if (el) el.textContent = val || '-';
        };

        setSpan('createdBy', acc.CreatedBy);
        setSpan('createdOn', acc.CreatedOn);
        setSpan('modifiedBy', acc.ModifiedBy);
        setSpan('modifiedOn', acc.ModifiedOn);
    }

    /**
     * Toggled when clicking 'Add' to start data entry
     */
    function onAdd() {
        selectedAccount = null;
        clearFields();
        toggleFields(false); // Enable all inputs

        // Update Button States
        const actions = getActionButtons();
        actions.add.disabled = true;
        actions.edit.disabled = true;
        if (actions.delete) actions.delete.disabled = true;
        actions.save.disabled = false;
        actions.cancel.disabled = false;
    }

    /**
     * Triggered when the Edit button is clicked
     */
    function onEdit() {
        if (!selectedAccount) return;
        toggleFields(false); // Enable fields for editing

        const actions = getActionButtons();
        actions.save.disabled = false;
        actions.edit.disabled = true;
    }



    /**
     * Returns to the parent maintenance screen
     */
    function onBack() {
        global.parent?.postMessage({ type: 'CLOSE_DATAENTRY' }, '*');
    }

    /**
     * Cancels the current operation and resets the UI
     */
    function onCancel() {
        toggleFields(true);
        setInitialButtonState();
        clearFields();
    }

    /**
     * Sets button availability for the starting view
     */
    function setInitialButtonState() {
        // Initial state logic is now mostly handled dynamically by updateActionButtonsState
        updateActionButtonsState();
    }

    /**
     * Updates action buttons based on whether records exist
     */
    function updateActionButtonsState() {
        const actions = getActionButtons();
        const hasRecords = bankAccounts && bankAccounts.length > 0;

        // Always enabled
        if (actions.add) actions.add.disabled = false;
        if (actions.back) actions.back.disabled = false;

        // Disabled initially or based on selection context (handled by selectAccount)
        // Here we just set the general state for "Table View" mode
        if (!selectedAccount) {
            if (actions.edit) actions.edit.disabled = true; // Need to select a row first
            if (actions.delete) actions.delete.disabled = true;
            if (actions.save) actions.save.disabled = true;
            if (actions.cancel) actions.cancel.disabled = true;
        }
    }

    /**
     * Helper to grab all button elements
     */
    function getActionButtons() {
        return {
            add: document.querySelector('.action-add'),
            edit: document.querySelector('.action-edit'),
            delete: document.querySelector('.action-delete'),
            save: document.querySelector('.action-save'),
            cancel: document.querySelector('.action-cancel'),
            back: document.querySelector('.action-back')
        };
    }

    /**
     * toggles the 'readonly' or 'disabled' state of the form controls
     */
    function toggleFields(readonly) {
        const controls = document.querySelectorAll('.de-input, .de-select');
        controls.forEach(ctrl => {
            // These two are traditionally populated via Lookups and remain read-only
            if (ctrl.id === 'institutionName' || ctrl.id === 'branchName') {
                ctrl.readOnly = true;
                return;
            }

            if (ctrl.tagName === 'SELECT') {
                ctrl.disabled = readonly;
            } else {
                ctrl.readOnly = readonly;
            }
        });

        // Handle lookup magnifying glass buttons
        document.querySelectorAll('.de-btn-lookup, .btn-lookup').forEach(btn => btn.disabled = readonly);
    }

    /**
     * Resets all input values
     */
    function clearFields() {
        document.querySelectorAll('.de-input, .de-select').forEach(ctrl => {
            ctrl.value = '';
        });

        // Clear Audit spans
        const auditSpans = ['createdBy', 'createdOn', 'modifiedBy', 'modifiedOn'];
        auditSpans.forEach(id => {
            const span = document.getElementById(id);
            if (span) span.textContent = '-';
        });
    }

    /**
     * Global event listeners setup
     */
    function setupEventListeners() {
        const actions = getActionButtons();

        // Actions
        if (actions.add) actions.add.addEventListener('click', onAdd);
        if (actions.edit) actions.edit.addEventListener('click', onEdit);
        if (actions.save) actions.save.addEventListener('click', onSave);
        if (actions.cancel) actions.cancel.addEventListener('click', onCancel);
        if (actions.back) {
            actions.back.addEventListener('click', (e) => {
                const text = e.currentTarget.textContent.toLowerCase();
                if (text.includes('close') || text.includes('back')) {
                    onBack();
                }
            });
        }

        // Bank Lookup Button
        const btnBankLookup = document.getElementById('btnBankLookup');
        if (btnBankLookup) {
            btnBankLookup.addEventListener('click', (e) => {
                e.preventDefault();
                openBankSearchModal();
            });
        }

        // Branch Lookup Button
        const btnBranchLookup = document.getElementById('btnBranchLookup');
        if (btnBranchLookup) {
            btnBranchLookup.addEventListener('click', (e) => {
                e.preventDefault();
                openBranchSearchModal();
            });
        }
    }

    /**
     * Handles the saving of bank account details
     */
    async function onSave() {
        if (!ClientService) {
            global.Toast?.show('Client Service not loaded.', 'error');
            return;
        }

        // 1. Gather Identification Data
        const parentWindow = global.parent;
        const parentDoc = parentWindow.document;
        const clientId = parentDoc.getElementById('ClientID')?.value?.trim();

        if (!clientId) {
            global.Toast?.show('Please load a Client in the main Maintenance form first.', 'error');
            return;
        }

        // 2. Gather Form Data
        const accountType = document.getElementById('accountType')?.value;
        const institutionType = document.getElementById('institutionType')?.value;
        const bankId = document.getElementById('bankId')?.value?.trim();
        const branchId = document.getElementById('branchId')?.value?.trim();
        const accountId = document.getElementById('accountId')?.value?.trim();

        // Optional/Financial fields
        const balance = document.getElementById('balance')?.value || '0';
        const terms = document.getElementById('terms')?.value || '';
        const advanceAmount = document.getElementById('advanceAmount')?.value || '0';
        const monthlyPayment = document.getElementById('monthlyPayment')?.value || '0';

        // 3. Validation
        if (!accountType || !bankId || !branchId) {
            global.Toast?.show('Please fill in all required fields (Account Type, Bank, and Branch).', 'warning');
            return;
        }

        // 4. Build XML for DetailRecords as per requested format (dt_ClientBankAccounts)
        // Note: The procedure expects the entire list of bank accounts.
        // We include existing ones and the one being added/modified.
        let xml = '';

        // Add the new/modified record first as per the requested example structure
        xml += `<dt_ClientBankAccounts>`;
        xml += `<SerialID>${selectedAccount?.SerialID || 0}</SerialID>`;
        xml += `<InstitutionTypeID>${INST_TYPE_MAP[institutionType] || 'B'}</InstitutionTypeID>`;
        xml += `<BankID>${bankId}</BankID>`;
        xml += `<BranchID>${branchId}</BranchID>`;
        xml += `<ProductTypeID>${PRODUCT_TYPE_MAP[accountType] || 'SB'}</ProductTypeID>`;
        xml += `<AdvanceAmount>${advanceAmount}</AdvanceAmount>`;
        xml += `<MonthlyPayment>${monthlyPayment}</MonthlyPayment>`;
        xml += `<Balance>${balance}</Balance>`;
        xml += `<Term>${terms || 0}</Term>`;
        xml += `<BranchName>${document.getElementById('branchName')?.value || ''}</BranchName>`;
        const btnMark = selectedAccount ? 'A' : 'N'; // A for Amended (Edit), N for New
        xml += `<ButtonMark>${btnMark}</ButtonMark>`;
        xml += `<InstitutionName>${document.getElementById('institutionName')?.value || ''}</InstitutionName>`;
        xml += `</dt_ClientBankAccounts>`;

        // Add other existing accounts (excluding the one being edited if applicable)
        allAccounts.forEach(acc => {
            if (selectedAccount && acc.SerialID === selectedAccount.SerialID) return;

            xml += `<dt_ClientBankAccounts>`;
            xml += `<SerialID>${acc.SerialID || 0}</SerialID>`;
            xml += `<InstitutionTypeID>${acc.InstitutionTypeID || (acc.InstitutionType === 'Bank' ? 'B' : 'I')}</InstitutionTypeID>`;
            xml += `<BankID>${acc.BankID || ''}</BankID>`;
            xml += `<BranchID>${acc.BranchID || ''}</BranchID>`;
            xml += `<ProductTypeID>${acc.ProductTypeID || PRODUCT_TYPE_MAP[acc.AccountType] || ''}</ProductTypeID>`;
            xml += `<AdvanceAmount>${acc.AdvanceAmount || 0}</AdvanceAmount>`;
            xml += `<MonthlyPayment>${acc.MonthlyPayment || 0}</MonthlyPayment>`;
            xml += `<Balance>${acc.Balance || 0}</Balance>`;
            xml += `<Term>${acc.Term || 0}</Term>`;
            xml += `<BranchName>${acc.BranchName || ''}</BranchName>`;
            xml += `<InstitutionName>${acc.InstitutionName || ''}</InstitutionName>`;
            xml += `</dt_ClientBankAccounts>`;
        });

        // 5. Prepare Payload exactly as requested in the trace
        const session = parentWindow.getAuthSession?.() || {};
        const env = parentWindow.Environment || {};
        const operatorId = session.operatorId || session.operatorID || env.OperatorID || "SYSTEM";

        // UpdateCount Logic: 
        // - New Record: Always 1
        // - Edit Record: Use the value from the database (no manual increment here as backend handles it or expects current version)
        let updateCount = 1;
        if (selectedAccount) {
            updateCount = selectedAccount.UpdateCount;
        }

        const payload = {
            ClientID: clientId,
            CreatedOn: null,
            CreatedBy: operatorId,
            ModifiedOn: null,
            ModifiedBy: operatorId,
            SupervisedBy: null,
            UpdateCount: updateCount,
            DetailRecords: xml
        };

        try {
            console.log('[Bank Accounts] Saving record:', payload);
            const response = await ClientService.saveClientBankAccount(payload);
            console.log('[Bank Accounts] Save Response:', response);

            if (response && response.success) {
                global.Toast?.show('Bank account details saved successfully.', 'success');

                // Refresh table and reset UI
                onCancel(); // Use cancel logic to clear and lock fields
                await fetchBankAccounts();
            } else {
                global.Toast?.show(response?.message || 'Failed to save bank account.', 'error');
            }
        } catch (error) {
            console.error('[Bank Accounts] Save Error:', error);
            global.Toast?.show('An error occurred while saving.', 'error');
        }
    }

    /**
     * Opens the Bank Lookup search modal
     */
    function openBankSearchModal() {
        console.log('[Bank Accounts] Opening Bank Search Modal');

        const overlay = document.createElement('div');
        overlay.className = 'bank-search-modal-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
            z-index: 9999; display: flex; align-items: center; justify-content: center;
            padding: 20px;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            width: 700px; height: 450px; background: white;
            border-radius: 12px; overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            display: flex; flex-direction: column;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 12px 20px; border-bottom: 1px solid #eee; 
            display: flex; justify-content: space-between; align-items: center;
            background: #f8fafc;
        `;
        header.innerHTML = `
            <span style="font-weight:700; color: #1F6DB1;"><i class="bi bi-bank"></i> Clearing Bank Search</span>
            <button class="close-btn" style="border:none;background:none;font-size:20px;cursor:pointer;color:#64748b">&times;</button>
        `;

        const iframe = document.createElement('iframe');
        iframe.src = './bank-lookup.html';
        iframe.style.cssText = 'flex: 1; width: 100%; border: none;';

        header.querySelector('.close-btn').addEventListener('click', () => overlay.remove());

        modal.appendChild(header);
        modal.appendChild(iframe);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    /**
     * Opens the Branch Lookup search modal
     */
    function openBranchSearchModal() {
        // Get the current BankID from the UI
        const bankId = document.getElementById('bankId')?.value?.trim();

        if (!bankId) {
            global.Toast?.show('Please select a Bank first.', 'warning');
            document.getElementById('bankId')?.focus();
            return;
        }

        console.log('[Bank Accounts] Opening Branch Search Modal for BankID:', bankId);

        const overlay = document.createElement('div');
        overlay.className = 'branch-search-modal-overlay';
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0, 0, 0, 0.4); backdrop-filter: blur(4px);
            z-index: 9999; display: flex; align-items: center; justify-content: center;
            padding: 20px;
        `;

        const modal = document.createElement('div');
        modal.style.cssText = `
            width: 700px; height: 450px; background: white;
            border-radius: 12px; overflow: hidden;
            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.25);
            display: flex; flex-direction: column;
        `;

        const header = document.createElement('div');
        header.style.cssText = `
            padding: 12px 20px; border-bottom: 1px solid #eee; 
            display: flex; justify-content: space-between; align-items: center;
            background: #f8fafc;
        `;
        header.innerHTML = `
            <span style="font-weight:700; color: #1F6DB1;"><i class="bi bi-geo-alt"></i> Clearing Branch Search (Bank ID: ${bankId})</span>
            <button class="close-btn" style="border:none;background:none;font-size:20px;cursor:pointer;color:#64748b">&times;</button>
        `;

        const iframe = document.createElement('iframe');
        iframe.src = `./branch-lookup.html?bankId=${encodeURIComponent(bankId)}`;
        iframe.style.cssText = 'flex: 1; width: 100%; border: none;';

        header.querySelector('.close-btn').addEventListener('click', () => overlay.remove());

        modal.appendChild(header);
        modal.appendChild(iframe);
        overlay.appendChild(modal);
        document.body.appendChild(overlay);

        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) overlay.remove();
        });
    }

    // Listener for messages from Lookup Modals
    window.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'BANK_SELECTED') {
            const { data } = event.data;
            console.log('[Bank Accounts] Bank selected:', data);

            // Populate fields
            const bankIdInput = document.getElementById('bankId');
            const institutionNameInput = document.getElementById('institutionName');

            if (bankIdInput) bankIdInput.value = data.BankID || data.BankCode || '';
            if (institutionNameInput) institutionNameInput.value = data.BankName || data.InstitutionName || '';

            // Close modal
            const overlay = document.querySelector('.bank-search-modal-overlay');
            if (overlay) overlay.remove();

            // Move focus to branch lookup or next field
            document.getElementById('branchId')?.focus();
        } else if (event.data && event.data.type === 'BRANCH_SELECTED') {
            const { data } = event.data;
            console.log('[Bank Accounts] Branch selected:', data);

            // Populate fields
            const branchIdInput = document.getElementById('branchId');
            const branchNameInput = document.getElementById('branchName');

            if (branchIdInput) branchIdInput.value = data.BranchID || data.BranchCode || '';
            if (branchNameInput) branchNameInput.value = data.BranchName || '';

            // Close modal
            const overlay = document.querySelector('.branch-search-modal-overlay');
            if (overlay) overlay.remove();

            // Set focus to Account ID
            document.getElementById('accountId')?.focus();
        }
    });

    // Explicitly initialize when the DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initBankAccountsPage);
    } else {
        initBankAccountsPage();
    }

})(window);
