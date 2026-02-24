// Owner Search Modal - Kairo Banking Application
// Uses p_GetSearchResult stored procedure to fetch client data

// ========== STATE MANAGEMENT ==========
let ownerSearchResults = [];
let selectedOwnerRow = null;
let currentOwnerPage = 1;
const ownerPageSize = 10;
let ownerModalInitialized = false;

// ========== INITIALIZATION ==========
function setupOwnerSearchModal() {
    // Prevent double initialization
    if (ownerModalInitialized) {
        console.log('Owner search modal already initialized');
        return;
    }
    
    // Check if modal elements exist
    const searchButton = document.getElementById('btnSearchOwners');
    if (!searchButton) {
        console.log('Owner search modal elements not yet loaded');
        return;
    }
    
    console.log('Initializing owner search modal...');
    
    // Search button
    searchButton.addEventListener('click', performOwnerSearch);
    
    // Clear button
    document.getElementById('btnClearOwnerSearch')?.addEventListener('click', clearOwnerSearch);
    
    // Select button
    document.getElementById('btnSelectOwner')?.addEventListener('click', selectOwner);
    
    // Pagination buttons
    document.getElementById('btnPrevOwnerPage')?.addEventListener('click', () => {
        if (currentOwnerPage > 1) {
            currentOwnerPage--;
            renderOwnerResults();
        }
    });
    
    document.getElementById('btnNextOwnerPage')?.addEventListener('click', () => {
        const totalPages = Math.ceil(ownerSearchResults.length / ownerPageSize);
        if (currentOwnerPage < totalPages) {
            currentOwnerPage++;
            renderOwnerResults();
        }
    });
    
    // Enter key to search
    const searchInputs = [
        document.getElementById('searchOwnerIdFilter'),
        document.getElementById('searchOwnerNameFilter')
    ];
    
    searchInputs.forEach(input => {
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performOwnerSearch();
            }
        });
    });
    
    // Auto-load on modal open
    const modal = document.getElementById('ownerSearchModal');
    if (modal) {
        modal.addEventListener('hidden.bs.modal', function() {
            // Keep search results when modal is closed
        });
        
        modal.addEventListener('shown.bs.modal', function() {
            document.getElementById('searchOwnerIdFilter')?.focus();
            // Auto-load all clients when modal opens
            if (ownerSearchResults.length === 0) {
                loadAllOwners();
            }
        });
    }
    
    ownerModalInitialized = true;
    console.log('Owner search modal initialized successfully');
}

// ========== LOAD ALL OWNERS ==========
async function loadAllOwners() {
    try {
        showOwnerSearchLoading();
        
        // Call the API to get all clients
        const results = await searchOwners({
            clientId: '',
            clientName: ''
        });
        
        ownerSearchResults = results;
        currentOwnerPage = 1;
        selectedOwnerRow = null;
        
        renderOwnerResults();
        
        if (results.length === 0) {
            showOwnerSearchMessage('No clients found in the system.', 'info');
        } else {
            showOwnerSearchMessage(`Loaded ${results.length} clients.`, 'success');
        }
    } catch (error) {
        console.error('Load owners error:', error);
        showOwnerSearchMessage('Error loading clients. Please try again.', 'error');
    }
}

// ========== SEARCH FUNCTIONS ==========
async function performOwnerSearch() {
    const clientIdFilter = document.getElementById('searchOwnerIdFilter')?.value.trim() || '';
    const clientIdOperator = document.getElementById('searchOwnerIdOperator')?.value || 'like';
    const clientNameFilter = document.getElementById('searchOwnerNameFilter')?.value.trim() || '';
    const clientNameOperator = document.getElementById('searchOwnerNameOperator')?.value || 'like';
    
    // Build search parameters
    const searchParams = {
        clientId: clientIdFilter,
        clientIdOperator: clientIdOperator,
        clientName: clientNameFilter,
        clientNameOperator: clientNameOperator
    };
    
    try {
        showOwnerSearchLoading();
        
        // Call the API
        const results = await searchOwners(searchParams);
        
        ownerSearchResults = results;
        currentOwnerPage = 1;
        selectedOwnerRow = null;
        
        renderOwnerResults();
        
        if (results.length === 0) {
            showOwnerSearchMessage('No clients found matching your criteria.', 'info');
        }
    } catch (error) {
        console.error('Owner search error:', error);
        showOwnerSearchMessage('Error searching clients. Please try again.', 'error');
    }
}

async function searchOwners(params) {
    // Build the WHERE statement for filtering
    let whereStmt = '';
    const conditions = [];
    
    if (params.clientId) {
        switch (params.clientIdOperator) {
            case 'equals':
                conditions.push(`ClientID = '${params.clientId}'`);
                break;
            case 'startswith':
                conditions.push(`ClientID LIKE '${params.clientId}%'`);
                break;
            case 'like':
            default:
                conditions.push(`ClientID LIKE '%${params.clientId}%'`);
                break;
        }
    }
    
    if (params.clientName) {
        switch (params.clientNameOperator) {
            case 'equals':
                conditions.push(`Name = '${params.clientName}'`);
                break;
            case 'startswith':
                conditions.push(`Name LIKE '${params.clientName}%'`);
                break;
            case 'like':
            default:
                conditions.push(`Name LIKE '%${params.clientName}%'`);
                break;
        }
    }
    
    if (conditions.length > 0) {
        whereStmt = conditions.join(' AND ');
    }
    
    // Get environment settings
    const baseUrl = window.Environment?.baseUrlCommon || 'http://172.16.2.31:3306';
    const apiUrl = `${baseUrl}/api/OldAPI`;
    const operatorId = sessionStorage.getItem('operatorId') || sessionStorage.getItem('username') || 'STEVE';
    const branchId = document.getElementById('branchId')?.value.trim() || 
                     window.Environment?.OurBranchID || 
                     sessionStorage.getItem('branchId') || '0101';
    
    // Build request body for p_GetSearchResult
    const requestBody = {
        RequestID: "dbo.p_GetSearchResult",
        FormId: "dbo.p_GetSearchResult",
        RequestData: {
            WhereStmt: whereStmt,
            TableID: "clientID",
            RefID: null,
            PrevOrNext: "0",
            AdvFilterString: "CloseDate IS NULL",
            OperatorID: operatorId,
            ModuleID: "5505",
            OurBranchID: branchId,
            SearchKey: null,
            LanguageID: "en"
        },
        RequestTime: new Date().toLocaleString('en-US', { 
            year: 'numeric', 
            month: '2-digit', 
            day: '2-digit', 
            hour: '2-digit', 
            minute: '2-digit', 
            second: '2-digit',
            hour12: false 
        }).replace(',', ''),
        AppName: "PROJECT_KAIRO",
        Checksum: ""
    };
    
    console.log('[OwnerSearch] Request:', requestBody);
    
    try {
        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'accept': '*/*'
            },
            body: JSON.stringify(requestBody)
        });
        
        if (!response.ok) {
            console.warn('API not available, using mock data');
            return getMockOwnerData(params);
        }
        
        const data = await response.json();
        console.log('[OwnerSearch] Response:', data);
        
        // The API returns data in Details array or root level
        let clients = [];
        
        if (data.Details && Array.isArray(data.Details)) {
            clients = data.Details;
        } else if (data.Details01 && Array.isArray(data.Details01)) {
            clients = data.Details01;
        } else if (Array.isArray(data)) {
            clients = data;
        }
        
        // Map to consistent format
        return clients.map(item => ({
            clientID: item.ClientID || item.clientID,
            name: item.Name || item.name || '',
            idNumber: item.IDNumber || item.idNumber || '',
            applicationID: item.ApplicationID || item.applicationID || '',
            clientTypeID: item.ClientTypeID || item.clientTypeID || '',
            motherName: item.MotherName || item.motherName || ''
        }));
        
    } catch (error) {
        console.warn('API call failed, using mock data:', error);
        return getMockOwnerData(params);
    }
}

function getMockOwnerData(params) {
    // Mock data based on the stored procedure results
    const mockData = [
        { clientID: '0000000001', name: 'ANDALEM FEKADU TESEFAYE', idNumber: '12654', applicationID: '03251', clientTypeID: 'E' },
        { clientID: '0000000002', name: 'BELACHEW GITAHUN MOGES', idNumber: '3665/32/2015', applicationID: '03252', clientTypeID: 'E' },
        { clientID: '0000000003', name: 'YEREGA AGEZU WOREKIE', idNumber: '2214/32/2015', applicationID: '03253', clientTypeID: 'E' },
        { clientID: '0000000004', name: 'TESFA ABERA GITIE', idNumber: '45263', applicationID: '03254', clientTypeID: 'E' },
        { clientID: '0000000005', name: 'ANEDAREGACHEW TAMER ENEGA', idNumber: '01254', applicationID: '03255', clientTypeID: 'E' },
        { clientID: '0000000006', name: 'SHFERAW WOREKIE YUM', idNumber: '3456777', applicationID: '03256', clientTypeID: 'b' },
        { clientID: '0000000007', name: 'MEKONEN WOREKIE MESEKER', idNumber: '42563', applicationID: '03257', clientTypeID: 'E' },
        { clientID: '0000000008', name: 'YEREGAE GITIE ZELEKE', idNumber: '2754/32/2017', applicationID: '03258', clientTypeID: 'E' },
        { clientID: '0000000009', name: 'ASEMARE GEREME NEGASH', idNumber: '42563', applicationID: '03259', clientTypeID: 'E' },
        { clientID: '0000000010', name: 'DAGNE ANEDALELEM KASAYE', idNumber: '00449', applicationID: '032510', clientTypeID: 'E' },
        { clientID: 'test', name: 'Test Owner', idNumber: 'TEST001', applicationID: 'APP001', clientTypeID: 'E' }
    ];
    
    // Filter by search criteria
    let filtered = mockData;
    
    if (params.clientId) {
        filtered = filtered.filter(item => {
            const value = item.clientID.toLowerCase();
            const search = params.clientId.toLowerCase();
            
            switch (params.clientIdOperator) {
                case 'equals':
                    return value === search;
                case 'startswith':
                    return value.startsWith(search);
                case 'like':
                default:
                    return value.includes(search);
            }
        });
    }
    
    if (params.clientName) {
        filtered = filtered.filter(item => {
            const value = item.name.toLowerCase();
            const search = params.clientName.toLowerCase();
            
            switch (params.clientNameOperator) {
                case 'equals':
                    return value === search;
                case 'startswith':
                    return value.startsWith(search);
                case 'like':
                default:
                    return value.includes(search);
            }
        });
    }
    
    return filtered;
}

function clearOwnerSearch() {
    const idFilter = document.getElementById('searchOwnerIdFilter');
    const idOperator = document.getElementById('searchOwnerIdOperator');
    const nameFilter = document.getElementById('searchOwnerNameFilter');
    const nameOperator = document.getElementById('searchOwnerNameOperator');
    
    if (idFilter) idFilter.value = '';
    if (idOperator) idOperator.value = 'like';
    if (nameFilter) nameFilter.value = '';
    if (nameOperator) nameOperator.value = 'like';
    
    ownerSearchResults = [];
    currentOwnerPage = 1;
    selectedOwnerRow = null;
    
    renderOwnerResults();
}

// ========== RENDERING ==========
function renderOwnerResults() {
    const tbody = document.getElementById('ownerSearchResults');
    const selectBtn = document.getElementById('btnSelectOwner');
    
    if (!tbody) return;
    
    // Clear previous results
    tbody.innerHTML = '';
    
    if (ownerSearchResults.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="no-results">
                    <i class="bi bi-search"></i> No clients found. Try adjusting your search criteria.
                </td>
            </tr>
        `;
        if (selectBtn) selectBtn.disabled = true;
        updateOwnerPagination();
        return;
    }
    
    // Calculate pagination
    const start = (currentOwnerPage - 1) * ownerPageSize;
    const end = start + ownerPageSize;
    const pageResults = ownerSearchResults.slice(start, end);
    
    // Render rows
    pageResults.forEach((client, index) => {
        const globalIndex = start + index + 1;
        const row = document.createElement('tr');
        row.dataset.index = start + index;
        
        row.innerHTML = `
            <td>${globalIndex}</td>
            <td>${client.clientID || ''}</td>
            <td>${client.name || ''}</td>
            <td>${client.idNumber || ''}</td>
            <td>${client.clientTypeID || ''}</td>
        `;
        
        row.addEventListener('click', () => {
            // Remove previous selection
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
            
            // Add selection to clicked row
            row.classList.add('selected');
            selectedOwnerRow = client;
            if (selectBtn) selectBtn.disabled = false;
        });
        
        // Double-click to select
        row.addEventListener('dblclick', () => {
            selectedOwnerRow = client;
            selectOwner();
        });
        
        tbody.appendChild(row);
    });
    
    updateOwnerPagination();
}

function updateOwnerPagination() {
    const totalResults = ownerSearchResults.length;
    const totalPages = Math.ceil(totalResults / ownerPageSize) || 1;
    
    const pageInfo = document.getElementById('ownerPageInfo');
    const prevBtn = document.getElementById('btnPrevOwnerPage');
    const nextBtn = document.getElementById('btnNextOwnerPage');
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentOwnerPage} of ${totalPages} (${totalResults} results)`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentOwnerPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentOwnerPage >= totalPages;
    }
}

function showOwnerSearchLoading() {
    const tbody = document.getElementById('ownerSearchResults');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="no-results">
                    <i class="bi bi-hourglass-split"></i> Searching clients...
                </td>
            </tr>
        `;
    }
}

function showOwnerSearchMessage(message, type = 'info') {
    // Use the main form's status message if available
    if (typeof showStatusMessage === 'function') {
        showStatusMessage(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// ========== SELECTION ==========
function selectOwner() {
    if (!selectedOwnerRow) {
        showOwnerSearchMessage('Please select a client from the list', 'warning');
        return;
    }
    
    // Populate the Owner ID field in the main form
    const ownerIdInput = document.getElementById('ownerId');
    const ownerDescriptionInput = document.getElementById('ownerDescription');
    
    if (ownerIdInput) {
        ownerIdInput.value = selectedOwnerRow.clientID;
    }

    if (ownerDescriptionInput) {
        ownerDescriptionInput.value = selectedOwnerRow.name || '';
    }
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('ownerSearchModal'));
    if (modal) {
        modal.hide();
    }
    
    showOwnerSearchMessage(`Owner selected: ${selectedOwnerRow.name}`, 'success');
}

// Make functions globally available
window.performOwnerSearch = performOwnerSearch;
window.clearOwnerSearch = clearOwnerSearch;
window.selectOwner = selectOwner;
window.loadAllOwners = loadAllOwners;
window.setupOwnerSearchModal = setupOwnerSearchModal;
