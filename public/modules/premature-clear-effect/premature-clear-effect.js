// Premature Clear Effect - Main JavaScript

(async function() {
    'use strict';

    // Load services
    const { ServiceLoader } = window;
    await ServiceLoader.loadCore();
    await ServiceLoader.loadPrematureClearEffectService();
    await ServiceLoader.loadSearchService();
    await ServiceLoader.loadLookupService();

    // Get services
    const PrematureClearEffectService = window.PrematureClearEffectService;
    const SearchService = window.SearchService;
    const CoreApi = window.CoreApi;
    const Environment = window.Environment || {};

// DOM Elements
const viewBtn = document.getElementById('viewBtn');
const editBtn = document.getElementById('editBtn');
const saveBtn = document.getElementById('saveBtn');
const cancelBtn = document.getElementById('cancelBtn');

// Form Elements
const branchId = document.getElementById('branchId');
const branchName = document.getElementById('branchName');
const accountId = document.getElementById('accountId');
const accountName = document.getElementById('accountName');
const searchBranchBtn = document.getElementById('searchBranchBtn');
const searchAccountBtn = document.getElementById('searchAccountBtn');

// Table Elements
const chequesTableBody = document.getElementById('chequesTableBody');

// Data Storage
let cheques = [];
let originalCheques = [];
let isEditMode = false;
let allAccounts = [];
let allBranches = [];

// Get logged-in user info from session
function getLoggedInBranchId() {
    return sessionStorage.getItem('branchId') || 
           sessionStorage.getItem('OurBranchID') || 
           sessionStorage.getItem('ourBranchId') ||
           Environment.OurBranchID || 
           '0101';
}

function getLoggedInBranchName() {
    return sessionStorage.getItem('branchName') || 
           sessionStorage.getItem('BranchName') ||
           Environment.BranchName || 
           'Head Office';
}

function getOperatorId() {
    return sessionStorage.getItem('operatorId') || 
           sessionStorage.getItem('OperatorID') ||
           Environment.OperatorID || 
           'web_portal';
}

// Event Listeners
viewBtn.addEventListener('click', viewCheques);
editBtn.addEventListener('click', enableEdit);
saveBtn.addEventListener('click', saveCheques);
cancelBtn.addEventListener('click', cancelOperation);
searchBranchBtn.addEventListener('click', showBranchSearchModal);
searchAccountBtn.addEventListener('click', showAccountSearchModal);

// Enter key on Account ID to trigger fetch
accountId.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault();
        viewCheques();
    }
});

// Initialize
function init() {
    // Set default Branch ID and Name from logged-in user session
    branchId.value = getLoggedInBranchId();
    branchName.value = getLoggedInBranchName();
    
    disableEdit();
    renderTable();
    console.log('🚀 Premature Clear Effect initialized');
    console.log('📌 Default Branch ID:', branchId.value);
    console.log('📌 Default Branch Name:', branchName.value);
    console.log('📌 Operator ID:', getOperatorId());
}

async function viewCheques() {
    if (!branchId.value || !branchId.value.trim()) {
        showMessage('Please enter a Branch ID', 'warning');
        branchId.focus();
        return;
    }

    if (!accountId.value || !accountId.value.trim()) {
        showMessage('Please enter an Account ID', 'warning');
        accountId.focus();
        return;
    }

    await fetchValueDatedTransactions();
}

async function fetchValueDatedTransactions() {
    try {
        const requestData = {
            OurBranchID: branchId.value.trim(),
            AccountID: accountId.value.trim(),
            OperatorID: getOperatorId()
        };

        console.log('🚀 Starting API request...');
        console.log('📋 Request Parameters:', requestData);
        
        showMessage('Loading cheques...', 'info');

        const result = await PrematureClearEffectService.getAccountValueDatedTrx(requestData);

        console.log('✅ API Call Complete');
        console.log('📊 Full Result Object:', result);

        if (result.success) {
            // Backend returns Details array with transaction data
            const transactions = result.data?.Details || result.data || [];
            
            console.log('🎯 Transactions Found:', transactions);
            console.log('📏 Transaction Count:', transactions.length);
            
            if (transactions && transactions.length > 0) {
                cheques = transactions.map(trx => ({
                    chequeId: trx.ChequeID || trx.chequeId || trx.EventID || '',
                    chequeDate: formatDate(trx.ChequeDate || trx.chequeDate || trx.CreatedOn || ''),
                    valueDate: formatDate(trx.ValueDate || trx.valueDate || ''),
                    amount: trx.Amount || trx.amount || 0,
                    accountId: trx.AccountID || trx.accountId || accountId.value,
                    bankName: trx.BankName || trx.bankName || '',
                    newData: trx.NewData || trx.newData || '',
                    operatorId: trx.OperatorID || trx.operatorId || '',
                    eventId: trx.EventID || trx.eventId || 0,
                    updateCount: trx.UpdateCount || trx.updateCount || 0
                }));
                originalCheques = JSON.parse(JSON.stringify(cheques));
                renderTable();
                showMessage(`✅ Loaded ${transactions.length} cheque(s) successfully`, 'success');
            } else {
                cheques = [];
                originalCheques = [];
                renderTable();
                showMessage('ℹ️ No cheques found for this account', 'info');
            }
        } else {
            console.warn('❌ API returned error');
            if (result.code === '091') {
                showMessage('❌ Account not found. Please check and try again.', 'warning');
            } else {
                showMessage(`❌ ${result.message || 'Failed to load cheques'}`, 'error');
            }
            cheques = [];
            originalCheques = [];
            renderTable();
        }
    } catch (error) {
        console.error('💥 Exception caught:', error);
        showMessage('💥 Error loading cheques: ' + error.message, 'error');
        cheques = [];
        originalCheques = [];
        renderTable();
    }
}

function formatDate(dateStr) {
    if (!dateStr) return '';
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-GB', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });
    } catch {
        return dateStr;
    }
}

function enableEdit() {
    if (cheques.length === 0) {
        showMessage('No records to edit. Please view cheques first.', 'warning');
        return;
    }

    isEditMode = true;
    viewBtn.disabled = false;
    editBtn.disabled = true;
    saveBtn.disabled = false;
    
    showMessage('Edit mode enabled', 'info');
}

function disableEdit() {
    isEditMode = false;
    viewBtn.disabled = false;
    editBtn.disabled = false;
    saveBtn.disabled = true;
}

async function saveCheques() {
    if (!branchId.value.trim()) {
        showMessage('Please enter a Branch ID', 'warning');
        return;
    }

    if (!accountId.value.trim()) {
        showMessage('Please enter an Account ID', 'warning');
        return;
    }

    if (cheques.length === 0) {
        showMessage('No records to save', 'warning');
        return;
    }

    if (confirm('Are you sure you want to save the changes?')) {
        try {
            // Build DetailRecords XML for the stored procedure
            const detailRecordsXml = buildDetailRecordsXml(cheques);
            
            const requestData = {
                OurBranchID: branchId.value.trim(),
                CreatedBy: getOperatorId(),
                CreatedOn: formatDateTimeForDb(new Date()),
                SupervisedBy: getOperatorId(),
                DetailRecords: detailRecordsXml
            };

            console.log('📤 Saving changes with request:', requestData);
            showMessage('Saving changes...', 'info');

            const result = await PrematureClearEffectService.editAccountValueDatedTrx(requestData);

            console.log('📥 Save result:', result);

            if (result.success) {
                showMessage('✅ Changes saved successfully', 'success');
                originalCheques = JSON.parse(JSON.stringify(cheques));
                disableEdit();
            } else {
                showMessage(`❌ ${result.message || 'Failed to save changes'}`, 'error');
            }
        } catch (error) {
            console.error('💥 Save error:', error);
            showMessage('💥 Error saving changes: ' + error.message, 'error');
        }
    }
}

function buildDetailRecordsXml(records) {
    let xml = '<DetailRecords>';
    records.forEach((record, index) => {
        xml += `<Record>
            <RowNum>${index + 1}</RowNum>
            <ChequeID>${record.chequeId || ''}</ChequeID>
            <AccountID>${record.accountId || ''}</AccountID>
            <Amount>${record.amount || 0}</Amount>
            <ValueDate>${record.valueDate || ''}</ValueDate>
            <ChequeDate>${record.chequeDate || ''}</ChequeDate>
            <BankName>${record.bankName || ''}</BankName>
        </Record>`;
    });
    xml += '</DetailRecords>';
    return xml;
}

function formatDateTimeForDb(date) {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const hh = String(date.getHours()).padStart(2, '0');
    const mi = String(date.getMinutes()).padStart(2, '0');
    const ss = String(date.getSeconds()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
}

function cancelOperation() {
    if (isEditMode) {
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            disableEdit();
            cheques = JSON.parse(JSON.stringify(originalCheques));
            renderTable();
            showMessage('Operation cancelled', 'info');
        }
    } else {
        // Reset form to defaults
        branchId.value = getLoggedInBranchId();
        branchName.value = getLoggedInBranchName();
        accountId.value = '';
        if (accountName) accountName.value = '';
        cheques = [];
        originalCheques = [];
        renderTable();
        showMessage('Form reset successfully', 'info');
    }
}

// ========== BRANCH SEARCH MODAL ==========
async function showBranchSearchModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('branchSearchModal');
    if (existingModal) existingModal.remove();

    // Create modal
    const modal = document.createElement('div');
    modal.id = 'branchSearchModal';
    modal.className = 'search-modal-overlay';
    modal.innerHTML = `
        <div class="search-modal-content">
            <div class="search-modal-header">
                <span class="search-modal-title">Branch Search</span>
                <div class="search-modal-header-buttons">
                    <button type="button" class="search-modal-btn" id="branchModalMinBtn">−</button>
                    <button type="button" class="search-modal-btn" id="branchModalMaxBtn">□</button>
                    <button type="button" class="search-modal-btn search-modal-close" id="branchModalCloseBtn">×</button>
                </div>
            </div>
            <div class="search-modal-body" id="branchModalBody">
                <div class="search-modal-filters-row">
                    <div class="search-modal-filter-item">
                        <label>Branch ID</label>
                        <div class="search-modal-filter-controls">
                            <select id="branchIdSearchType"><option value="like">Like</option><option value="equals">Equals</option></select>
                            <input type="text" id="branchIdSearchInput" placeholder="">
                        </div>
                    </div>
                    <div class="search-modal-filter-item">
                        <label>Branch Name</label>
                        <div class="search-modal-filter-controls">
                            <select id="branchNameSearchType"><option value="like">Like</option><option value="equals">Equals</option></select>
                            <input type="text" id="branchNameSearchInput" placeholder="">
                        </div>
                    </div>
                </div>
                <div class="search-modal-btn-row">
                    <button type="button" class="search-modal-search-btn" id="branchSearchBtn">Search</button>
                </div>
                <div class="search-modal-results-header">Search Results</div>
                <div class="search-modal-table-container">
                    <table class="search-modal-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Branch ID</th>
                                <th>Branch Name</th>
                            </tr>
                        </thead>
                        <tbody id="branchSearchTableBody">
                            <tr><td colspan="3" class="text-center">Click Search to load branches...</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="search-modal-footer">
                    <button type="button" class="search-modal-nav-btn" id="branchPrevBtn">◀</button>
                    <button type="button" class="search-modal-ok-btn" id="branchOkBtn">OK</button>
                    <button type="button" class="search-modal-nav-btn" id="branchNextBtn">▶</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event handlers
    const closeBtn = document.getElementById('branchModalCloseBtn');
    const searchBtn = document.getElementById('branchSearchBtn');
    const okBtn = document.getElementById('branchOkBtn');
    const minBtn = document.getElementById('branchModalMinBtn');
    const maxBtn = document.getElementById('branchModalMaxBtn');
    const body = document.getElementById('branchModalBody');
    const content = modal.querySelector('.search-modal-content');
    
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    let isMinimized = false;
    let isMaximized = false;
    
    minBtn.onclick = () => {
        isMinimized = !isMinimized;
        body.style.display = isMinimized ? 'none' : 'block';
    };
    
    maxBtn.onclick = () => {
        if (!isMaximized) {
            content.style.width = '95vw';
            content.style.maxHeight = '95vh';
            isMaximized = true;
        } else {
            content.style.width = '700px';
            content.style.maxHeight = '80vh';
            isMaximized = false;
        }
    };
    
    searchBtn.onclick = async () => {
        await searchBranches();
    };
    
    okBtn.onclick = () => {
        const selectedRow = document.querySelector('#branchSearchTableBody tr.table-active');
        if (selectedRow) {
            branchId.value = selectedRow.dataset.branchId;
            branchName.value = selectedRow.dataset.branchName;
            modal.remove();
        } else {
            showMessage('Please select a branch', 'warning');
        }
    };
    
    // Load branches on open
    await searchBranches();
}

async function searchBranches() {
    const tableBody = document.getElementById('branchSearchTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="3" class="text-center">Loading...</td></tr>';
    
    try {
        const branchIdVal = document.getElementById('branchIdSearchInput')?.value.trim() || '';
        const branchNameVal = document.getElementById('branchNameSearchInput')?.value.trim() || '';
        const branchIdType = document.getElementById('branchIdSearchType')?.value || 'like';
        const branchNameType = document.getElementById('branchNameSearchType')?.value || 'like';
        
        // Use LookupService.getBranches like Loan Application does
        const requestData = { BankID: '00' };
        
        console.log('🔍 Branch search request (LookupService.getBranches):', requestData);
        
        // Check if LookupService is available
        if (!window.LookupService) {
            console.error('❌ LookupService not available');
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">LookupService not loaded</td></tr>';
            return;
        }
        
        const result = await window.LookupService.getBranches(requestData);
        
        console.log('📥 Branch search result:', result);
        
        // Handle response - check for success and data
        if (result.success && result.data) {
            let branches = Array.isArray(result.data) ? result.data : (result.data.Details || result.Details || []);
            
            // Map to consistent format like Loan Application
            let mappedBranches = branches.map(branch => ({
                branchId: branch.OurBranchID || branch.BranchID || '',
                branchName: branch.BranchName || branch.Name || ''
            }));
            
            // Client-side filtering for ID
            if (branchIdVal && mappedBranches.length > 0) {
                const searchTerm = branchIdVal.toLowerCase();
                if (branchIdType === 'like') {
                    mappedBranches = mappedBranches.filter(b => 
                        b.branchId.toLowerCase().includes(searchTerm)
                    );
                } else {
                    mappedBranches = mappedBranches.filter(b => 
                        b.branchId.toLowerCase() === searchTerm
                    );
                }
            }
            
            // Client-side filtering for name
            if (branchNameVal && mappedBranches.length > 0) {
                const searchTerm = branchNameVal.toLowerCase();
                if (branchNameType === 'like') {
                    mappedBranches = mappedBranches.filter(b => 
                        b.branchName.toLowerCase().includes(searchTerm)
                    );
                } else {
                    mappedBranches = mappedBranches.filter(b => 
                        b.branchName.toLowerCase() === searchTerm
                    );
                }
            }
            
            allBranches = mappedBranches;
            renderBranchTable(mappedBranches);
            console.log(`✅ Loaded ${mappedBranches.length} branches`);
        } else {
            console.warn('❌ Branch search returned no data');
            tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No branches found</td></tr>';
        }
    } catch (error) {
        console.error('Branch search error:', error);
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center text-danger">Error loading branches</td></tr>';
    }
}

function renderBranchTable(data) {
    const tableBody = document.getElementById('branchSearchTableBody');
    if (!tableBody) return;
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="text-center">No branches found</td></tr>';
        return;
    }
    
    tableBody.innerHTML = data.map((branch, idx) => `
        <tr data-branch-id="${branch.branchId || ''}" 
            data-branch-name="${branch.branchName || ''}"
            tabindex="0" style="cursor:pointer;">
            <td>${idx + 1}</td>
            <td>${branch.branchId || ''}</td>
            <td>${branch.branchName || ''}</td>
        </tr>
    `).join('');
    
    // Row selection
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        row.addEventListener('click', () => {
            rows.forEach(r => r.classList.remove('table-active'));
            row.classList.add('table-active');
        });
        row.addEventListener('dblclick', () => {
            branchId.value = row.dataset.branchId;
            branchName.value = row.dataset.branchName;
            document.getElementById('branchSearchModal')?.remove();
        });
    });
}

// ========== ACCOUNT SEARCH MODAL ==========
async function showAccountSearchModal() {
    // Remove existing modal if present
    const existingModal = document.getElementById('accountSearchModal');
    if (existingModal) existingModal.remove();

    // Create modal matching the legacy "Active Account" dialog
    const modal = document.createElement('div');
    modal.id = 'accountSearchModal';
    modal.className = 'search-modal-overlay';
    modal.innerHTML = `
        <div class="search-modal-content" style="width: 900px;">
            <div class="search-modal-header">
                <span class="search-modal-title">Active Account</span>
                <div class="search-modal-header-buttons">
                    <button type="button" class="search-modal-btn" id="accountModalMinBtn">−</button>
                    <button type="button" class="search-modal-btn" id="accountModalMaxBtn">□</button>
                    <button type="button" class="search-modal-btn search-modal-close" id="accountModalCloseBtn">×</button>
                </div>
            </div>
            <div class="search-modal-body" id="accountModalBody">
                <div class="search-modal-filters-row">
                    <div class="search-modal-filter-item">
                        <label>AccountID</label>
                        <div class="search-modal-filter-controls">
                            <select id="accountIdSearchType"><option value="like">Like</option><option value="equals">Equals</option></select>
                            <input type="text" id="accountIdSearchInput" placeholder="">
                        </div>
                    </div>
                    <div class="search-modal-filter-item">
                        <label>AccountName</label>
                        <div class="search-modal-filter-controls">
                            <select id="accountNameSearchType"><option value="like">Like</option><option value="equals">Equals</option></select>
                            <input type="text" id="accountNameSearchInput" placeholder="">
                        </div>
                    </div>
                </div>
                <div class="search-modal-filters-row">
                    <div class="search-modal-filter-item">
                        <label>Product ID</label>
                        <div class="search-modal-filter-controls">
                            <select id="productIdSearchType"><option value="like">Like</option><option value="equals">Equals</option></select>
                            <input type="text" id="productIdSearchInput" placeholder="">
                        </div>
                    </div>
                    <div class="search-modal-filter-item">
                        <label>Legacy AccountID</label>
                        <div class="search-modal-filter-controls">
                            <select id="legacyAccountSearchType"><option value="like">Like</option><option value="equals">Equals</option></select>
                            <input type="text" id="legacyAccountSearchInput" placeholder="">
                        </div>
                    </div>
                </div>
                <div class="search-modal-filters-row">
                    <div class="search-modal-filter-item">
                        <label>Account Short Code</label>
                        <div class="search-modal-filter-controls">
                            <select id="shortCodeSearchType"><option value="like">Like</option><option value="equals">Equals</option></select>
                            <input type="text" id="shortCodeSearchInput" placeholder="">
                        </div>
                    </div>
                </div>
                <div class="search-modal-btn-row">
                    <button type="button" class="search-modal-search-btn" id="accountSearchBtn">Search</button>
                </div>
                <div class="search-modal-results-header">Search Results</div>
                <div class="search-modal-table-container">
                    <table class="search-modal-table">
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>AccountID</th>
                                <th>Name</th>
                                <th>ShortName</th>
                                <th>ProductID</th>
                            </tr>
                        </thead>
                        <tbody id="accountSearchTableBody">
                            <tr><td colspan="5" class="text-center">No records to display.</td></tr>
                        </tbody>
                    </table>
                </div>
                <div class="search-modal-footer">
                    <button type="button" class="search-modal-nav-btn" id="accountPrevBtn">◀</button>
                    <button type="button" class="search-modal-ok-btn" id="accountOkBtn">OK</button>
                    <button type="button" class="search-modal-nav-btn" id="accountNextBtn">▶</button>
                </div>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event handlers
    const closeBtn = document.getElementById('accountModalCloseBtn');
    const searchBtn = document.getElementById('accountSearchBtn');
    const okBtn = document.getElementById('accountOkBtn');
    const minBtn = document.getElementById('accountModalMinBtn');
    const maxBtn = document.getElementById('accountModalMaxBtn');
    const body = document.getElementById('accountModalBody');
    const content = modal.querySelector('.search-modal-content');
    
    closeBtn.onclick = () => modal.remove();
    modal.onclick = (e) => { if (e.target === modal) modal.remove(); };
    
    let isMinimized = false;
    let isMaximized = false;
    
    minBtn.onclick = () => {
        isMinimized = !isMinimized;
        body.style.display = isMinimized ? 'none' : 'block';
    };
    
    maxBtn.onclick = () => {
        if (!isMaximized) {
            content.style.width = '95vw';
            content.style.maxHeight = '95vh';
            isMaximized = true;
        } else {
            content.style.width = '900px';
            content.style.maxHeight = '80vh';
            isMaximized = false;
        }
    };
    
    searchBtn.onclick = async () => {
        await searchAccounts();
    };
    
    okBtn.onclick = async () => {
        const selectedRow = document.querySelector('#accountSearchTableBody tr.table-active');
        if (selectedRow) {
            accountId.value = selectedRow.dataset.accountId;
            if (accountName) accountName.value = selectedRow.dataset.accountName || '';
            modal.remove();
            // Automatically fetch data after account selection
            await fetchValueDatedTransactions();
        } else {
            showMessage('Please select an account', 'warning');
        }
    };
    
    // Load accounts on open
    await searchAccounts();
}

async function searchAccounts() {
    const tableBody = document.getElementById('accountSearchTableBody');
    if (!tableBody) return;
    
    tableBody.innerHTML = '<tr><td colspan="5" class="text-center">Loading...</td></tr>';
    
    try {
        const accountIdVal = document.getElementById('accountIdSearchInput')?.value.trim() || '';
        const accountNameVal = document.getElementById('accountNameSearchInput')?.value.trim() || '';
        const productIdVal = document.getElementById('productIdSearchInput')?.value.trim() || '';
        const accountIdType = document.getElementById('accountIdSearchType')?.value || 'like';
        const accountNameType = document.getElementById('accountNameSearchType')?.value || 'like';
        
        // Build where clause
        let whereConditions = [];
        
        if (accountIdVal) {
            if (accountIdType === 'like') {
                whereConditions.push(`AccountID LIKE '%${accountIdVal}%'`);
            } else {
                whereConditions.push(`AccountID='${accountIdVal}'`);
            }
        }
        
        if (accountNameVal) {
            if (accountNameType === 'like') {
                whereConditions.push(`Name LIKE '%${accountNameVal}%'`);
            } else {
                whereConditions.push(`Name='${accountNameVal}'`);
            }
        }
        
        if (productIdVal) {
            whereConditions.push(`ProductID LIKE '%${productIdVal}%'`);
        }
        
        const whereStmt = whereConditions.join(' AND ');
        
        const requestData = {
            TableID: "AccountID",
            AdvFilterString: "",
            WhereStmt: whereStmt,
            PrevOrNext: "1",
            RefID: "",
            OperatorID: getOperatorId(),
            ModuleID: 6902, // Premature Clear Effect Module ID
            OurBranchID: branchId.value.trim() || getLoggedInBranchId()
        };
        
        console.log('🔍 Account search request:', requestData);
        
        const result = await SearchService.searchClients(requestData);
        
        console.log('📥 Account search result:', result);
        
        const accounts = result?.Details || result?.data?.Details || [];
        allAccounts = accounts;
        renderAccountTable(accounts);
    } catch (error) {
        console.error('Account search error:', error);
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center text-danger">Error loading accounts</td></tr>';
    }
}

function renderAccountTable(data) {
    const tableBody = document.getElementById('accountSearchTableBody');
    if (!tableBody) return;
    
    if (!data || data.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5" class="text-center">No records to display.</td></tr>';
        return;
    }
    
    tableBody.innerHTML = data.map((account, idx) => `
        <tr data-account-id="${account.AccountID || ''}" 
            data-account-name="${account.Name || account.AccountName || ''}"
            data-short-name="${account.ShortName || ''}"
            data-product-id="${account.ProductID || ''}"
            tabindex="0" style="cursor:pointer;">
            <td>${idx + 1}</td>
            <td>${account.AccountID || ''}</td>
            <td>${account.Name || account.AccountName || ''}</td>
            <td>${account.ShortName || ''}</td>
            <td>${account.ProductID || ''}</td>
        </tr>
    `).join('');
    
    // Row selection
    const rows = tableBody.querySelectorAll('tr');
    rows.forEach(row => {
        row.addEventListener('click', () => {
            rows.forEach(r => r.classList.remove('table-active'));
            row.classList.add('table-active');
        });
        row.addEventListener('dblclick', async () => {
            accountId.value = row.dataset.accountId;
            if (accountName) accountName.value = row.dataset.accountName || '';
            document.getElementById('accountSearchModal')?.remove();
            // Automatically fetch data after account selection
            await fetchValueDatedTransactions();
        });
    });
}

function renderTable() {
    chequesTableBody.innerHTML = '';

    if (cheques.length === 0) {
        chequesTableBody.innerHTML = `
            <tr class="empty-row">
                <td colspan="6" class="text-center text-muted py-4">
                    <i class="bi bi-inbox fs-3 d-block mb-2"></i>
                    No records to display.
                </td>
            </tr>
        `;
        return;
    }

    cheques.forEach((cheque, index) => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${cheque.chequeId || ''}</td>
            <td>${cheque.chequeDate || ''}</td>
            <td>${cheque.valueDate || ''}</td>
            <td>${formatCurrency(cheque.amount)}</td>
            <td>${cheque.accountId || ''}</td>
            <td>${cheque.bankName || ''}</td>
        `;
        row.style.cursor = 'pointer';
        row.addEventListener('click', () => {
            chequesTableBody.querySelectorAll('tr').forEach(r => r.classList.remove('table-active'));
            row.classList.add('table-active');
        });
        chequesTableBody.appendChild(row);
    });
}

function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(amount || 0);
}

function showMessage(message, type) {
    const icon = {
        success: '✓',
        error: '✗',
        warning: '⚠',
        info: 'ℹ'
    };
    alert(`${icon[type] || ''} ${message}`);
}

// Initialize on load
init();

})();
