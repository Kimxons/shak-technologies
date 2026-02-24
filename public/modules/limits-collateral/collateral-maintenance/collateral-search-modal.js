// Collateral Search Modal - Kairo Banking Application

// ========== STATE MANAGEMENT ==========
let collateralSearchResults = [];
let selectedCollateralRow = null;
let currentCollateralPage = 1;
const collateralPageSize = 10;
let collateralModalInitialized = false;

// ========== INITIALIZATION ==========
// Note: setupCollateralSearchModal is called from collateral-maintenance.html after modal HTML is loaded

function setupCollateralSearchModal() {
    // Prevent double initialization
    if (collateralModalInitialized) {
        console.log('Collateral search modal already initialized');
        return;
    }
    
    // Check if modal elements exist
    const searchButton = document.getElementById('btnSearchCollaterals');
    if (!searchButton) {
        console.log('Collateral search modal elements not yet loaded');
        return;
    }
    
    console.log('Initializing collateral search modal...');
    
    // Search button
    searchButton.addEventListener('click', performCollateralSearch);
    
    // Clear button
    document.getElementById('btnClearCollateralSearch')?.addEventListener('click', clearCollateralSearch);
    
    // Select button
    document.getElementById('btnSelectCollateral')?.addEventListener('click', selectCollateral);
    
    // Pagination buttons
    document.getElementById('btnPrevCollateralPage')?.addEventListener('click', () => {
        if (currentCollateralPage > 1) {
            currentCollateralPage--;
            renderCollateralResults();
        }
    });
    
    document.getElementById('btnNextCollateralPage')?.addEventListener('click', () => {
        const totalPages = Math.ceil(collateralSearchResults.length / collateralPageSize);
        if (currentCollateralPage < totalPages) {
            currentCollateralPage++;
            renderCollateralResults();
        }
    });
    
    // Enter key to search
    const searchInputs = [
        document.getElementById('searchCollateralIdFilter'),
        document.getElementById('searchDescriptionFilter')
    ];
    
    searchInputs.forEach(input => {
        input?.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performCollateralSearch();
            }
        });
    });
    
    // Reset modal on close
    const modal = document.getElementById('collateralSearchModal');
    if (modal) {
        modal.addEventListener('hidden.bs.modal', function() {
            // Keep the search results when modal is closed
            // clearCollateralSearch();
        });
        
        modal.addEventListener('shown.bs.modal', function() {
            document.getElementById('searchCollateralIdFilter')?.focus();
            // Always auto-load all collaterals when modal opens (if Branch ID is entered)
            loadAllCollaterals();
        });
    }
    
    collateralModalInitialized = true;
    console.log('Collateral search modal initialized successfully');
}

// ========== LOAD ALL COLLATERALS ==========
async function loadAllCollaterals() {
    // Get branch ID from main form - REQUIRED
    const branchId = document.getElementById('branchId')?.value.trim() || '';
    
    if (!branchId) {
        showCollateralSearchMessage('Please enter Branch ID first to search collaterals.', 'warning');
        const tbody = document.getElementById('collateralSearchResults');
        if (tbody) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" class="no-results">
                        <i class="bi bi-exclamation-triangle"></i> Enter Branch ID in the main form first, then click Search.
                    </td>
                </tr>
            `;
        }
        return;
    }
    
    // Build search parameters - empty filters to get all collaterals for this branch
    const searchParams = {
        branchId: branchId,
        collateralId: '',
        collateralIdOperator: 'like',
        description: '',
        descriptionOperator: 'like',
        direction: 0
    };
    
    try {
        showCollateralSearchLoading();
        showCollateralSearchMessage(`Loading all collaterals for Branch ${branchId}...`, 'info');
        
        // Call the search API to get ALL collaterals for this branch
        const results = await searchCollaterals(searchParams);
        
        console.log('[CollateralSearch] Loaded collaterals:', results.length);
        
        collateralSearchResults = results;
        currentCollateralPage = 1;
        selectedCollateralRow = null;
        
        renderCollateralResults();
        
        if (results.length === 0) {
            showCollateralSearchMessage(`No collaterals found for Branch ${branchId}.`, 'info');
        } else {
            showCollateralSearchMessage(`Found ${results.length} collateral(s) for Branch ${branchId}. Select one and click OK.`, 'success');
        }
    } catch (error) {
        console.error('Load collaterals error:', error);
        showCollateralSearchMessage('Error loading collaterals. Please try again.', 'error');
    }
}

// ========== SEARCH FUNCTIONS ==========
async function performCollateralSearch() {
    const collateralIdFilter = document.getElementById('searchCollateralIdFilter').value.trim();
    const collateralIdOperator = document.getElementById('searchCollateralIdOperator').value;
    const descriptionFilter = document.getElementById('searchDescriptionFilter').value.trim();
    const descriptionOperator = document.getElementById('searchDescriptionOperator').value;
    
    // Get branch ID from main form (optional - can search without it)
    const branchId = document.getElementById('branchId')?.value.trim() || '';
    
    // Build search parameters
    const searchParams = {
        branchId: branchId,
        collateralId: collateralIdFilter,
        collateralIdOperator: collateralIdOperator,
        description: descriptionFilter,
        descriptionOperator: descriptionOperator,
        direction: 0 // 0 for search, 1 for next, -1 for previous
    };
    
    try {
        showCollateralSearchLoading();
        
        // Call the stored procedure via API
        const results = await searchCollaterals(searchParams);
        
        collateralSearchResults = results;
        currentCollateralPage = 1;
        selectedCollateralRow = null;
        
        renderCollateralResults();
        
        if (results.length === 0) {
            showCollateralSearchMessage('No collaterals found matching your criteria.', 'info');
        }
    } catch (error) {
        console.error('Collateral search error:', error);
        showCollateralSearchMessage('Error searching collaterals. Please try again.', 'error');
    }
}

async function searchCollaterals(params) {
    // Use SearchService.search() which calls p_GetSearchResult to get ALL collaterals for a branch
    // This returns a list of all matching collaterals instead of just one specific record
    
    const operatorId = sessionStorage.getItem('operatorId') || sessionStorage.getItem('username') || 'ADMIN';
    const moduleID = window.Environment?.moduleID || 1000;
    
    // Build the AdvFilterString based on search parameters
    // p_GetSearchResult uses AdvFilterString for filtering, not WhereStmt
    let filterConditions = [];
    
    // Always filter by branch if provided
    if (params.branchId) {
        filterConditions.push(`OurBranchID='${params.branchId}'`);
    }
    
    // Only show active collaterals
    filterConditions.push(`CollateralStatusID='A'`);
    
    // Build WhereStmt for additional filters (CollateralID, Description)
    let whereConditions = [];
    
    // Filter by CollateralID if provided
    if (params.collateralId) {
        switch (params.collateralIdOperator) {
            case 'equals':
                whereConditions.push(`CollateralID='${params.collateralId}'`);
                break;
            case 'startswith':
                whereConditions.push(`CollateralID like '${params.collateralId}%'`);
                break;
            case 'like':
            default:
                whereConditions.push(`CollateralID like '%${params.collateralId}%'`);
                break;
        }
    }
    
    // Filter by Description if provided
    if (params.description) {
        switch (params.descriptionOperator) {
            case 'equals':
                whereConditions.push(`Description='${params.description}'`);
                break;
            case 'startswith':
                whereConditions.push(`Description like '${params.description}%'`);
                break;
            case 'like':
            default:
                whereConditions.push(`Description like '%${params.description}%'`);
                break;
        }
    }
    
    const advFilterString = filterConditions.join(' AND ');
    const whereStmt = whereConditions.length > 0 ? whereConditions.join(' AND ') : '';
    
    // p_GetSearchResult parameters (NO OrderBy parameter!)
    const searchRequest = {
        TableID: "CollateralID",
        WhereStmt: whereStmt,
        AdvFilterString: advFilterString,
        RefID: null,
        PrevOrNext: 0,
        OperatorID: operatorId,
        ModuleID: moduleID,
        OurBranchID: params.branchId || '',
        SearchKey: null,
        LanguageID: 'en'
    };
    
    console.log('[CollateralSearch] Search Request:', searchRequest);
    
    try {
        // Use SearchService if available
        if (window.SearchService && typeof window.SearchService.search === 'function') {
            const result = await window.SearchService.search(searchRequest);
            console.log('[CollateralSearch] SearchService Response:', result);
            
            if (result && result.success && result.data) {
                // Extract data from response
                let collaterals = [];
                
                if (Array.isArray(result.data)) {
                    collaterals = result.data;
                } else if (result.data.Details && Array.isArray(result.data.Details)) {
                    collaterals = result.data.Details;
                } else if (result.data.Details02 && Array.isArray(result.data.Details02)) {
                    collaterals = result.data.Details02;
                }
                
                return collaterals.map(item => ({
                    collateralID: item.CollateralID,
                    description: item.Description,
                    branchId: item.OurBranchID,
                    ownerClientID: item.OwnerClientID,
                    collateralTypeID: item.CollateralTypeID,
                    _fullDetails: item
                }));
            }
        }
        
        // Fallback: Direct API call if SearchService not available
        const apiUrl = (window.Environment?.baseUrlCommon || 'http://172.16.2.31:3306').replace(/\/+$/, '') + '/api/OldAPI';
        
        const requestBody = {
            RequestID: "dbo.p_GetSearchResult",
            FormId: "dbo.p_GetSearchResult",
            RequestData: searchRequest,
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
        
        console.log('[CollateralSearch] Direct API Request:', requestBody);
        
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
            return getMockCollateralData(params);
        }
        
        const data = await response.json();
        console.log('[CollateralSearch] API Response:', data);
        
        // Extract collaterals from response - check multiple possible locations
        let collaterals = [];
        
        if (data.Details && Array.isArray(data.Details)) {
            collaterals = data.Details;
        } else if (data.Details02 && Array.isArray(data.Details02)) {
            collaterals = data.Details02;
        } else if (Array.isArray(data)) {
            collaterals = data;
        }
        
        return collaterals.map(item => ({
            collateralID: item.CollateralID,
            description: item.Description,
            branchId: item.OurBranchID,
            ownerClientID: item.OwnerClientID,
            collateralTypeID: item.CollateralTypeID,
            _fullDetails: item
        }));
        
    } catch (error) {
        console.warn('[CollateralSearch] API call failed, using mock data:', error);
        return getMockCollateralData(params);
    }
}

function getMockCollateralData(params) {
    // Mock data for testing - comprehensive list with multiple branches
    const mockData = [
        {
            collateralID: 'test001',
            description: 'Landed collateral LRA 169099',
            ownerClientID: 'test',
            collateralTypeID: '01',
            branchId: '0101'
        },
        {
            collateralID: '0000000228001',
            description: 'LAND 1 ACRE : Place identification number (RT56960465)',
            ownerClientID: '0000000228',
            collateralTypeID: '01',
            branchId: '0101'
        },
        {
            collateralID: '0000000229002',
            description: 'VEHICLE Toyota Hilux KCB 123X',
            ownerClientID: '0000000229',
            collateralTypeID: '02',
            branchId: '0101'
        },
        {
            collateralID: '0000000230003',
            description: 'BUILDING Commercial Property - Westlands',
            ownerClientID: '0000000230',
            collateralTypeID: '01',
            branchId: '0101'
        },
        {
            collateralID: 'COLL001',
            description: 'Industrial Equipment - Manufacturing Plant',
            ownerClientID: 'CL00145',
            collateralTypeID: '03',
            branchId: '0101'
        },
        {
            collateralID: 'COLL002',
            description: 'Fixed Deposit Certificate - KES 5,000,000',
            ownerClientID: 'CL00178',
            collateralTypeID: '04',
            branchId: '0101'
        },
        {
            collateralID: 'COLL003',
            description: 'Share Certificate - 10,000 shares XYZ Ltd',
            ownerClientID: 'CL00201',
            collateralTypeID: '05',
            branchId: '0101'
        },
        {
            collateralID: 'COLL004',
            description: 'Agricultural Land - 5 Hectares Nakuru',
            ownerClientID: 'CL00256',
            collateralTypeID: '01',
            branchId: '0101'
        },
        {
            collateralID: 'COLL005',
            description: 'Motor Vehicle - Mercedes Benz KDD 456Y',
            ownerClientID: 'CL00312',
            collateralTypeID: '02',
            branchId: '0101'
        },
        // Additional collaterals for other branches
        {
            collateralID: 'COLL100',
            description: 'Land Plot - Mombasa Road',
            ownerClientID: 'CL00400',
            collateralTypeID: '01',
            branchId: '0325'
        },
        {
            collateralID: 'COLL101',
            description: 'Warehouse - Industrial Area',
            ownerClientID: 'CL00401',
            collateralTypeID: '01',
            branchId: '0325'
        }
    ];
    
    // Filter by branch first
    let filtered = mockData;
    
    if (params.branchId) {
        filtered = filtered.filter(item => item.branchId === params.branchId);
    }
    
    // Filter by CollateralID if provided
    if (params.collateralId) {
        filtered = filtered.filter(item => {
            const value = item.collateralID.toLowerCase();
            const search = params.collateralId.toLowerCase();
            
            switch (params.collateralIdOperator) {
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
    
    // Filter by Description if provided
    if (params.description) {
        filtered = filtered.filter(item => {
            const value = item.description.toLowerCase();
            const search = params.description.toLowerCase();
            
            switch (params.descriptionOperator) {
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
    
    console.log('[CollateralSearch] Mock data filtered:', filtered.length, 'results for branch:', params.branchId);
    return filtered;
}

function clearCollateralSearch() {
    document.getElementById('searchCollateralIdFilter').value = '';
    document.getElementById('searchCollateralIdOperator').value = 'like';
    document.getElementById('searchDescriptionFilter').value = '';
    document.getElementById('searchDescriptionOperator').value = 'like';
    
    collateralSearchResults = [];
    currentCollateralPage = 1;
    selectedCollateralRow = null;
    
    renderCollateralResults();
}

// ========== RENDERING ==========
function renderCollateralResults() {
    const tbody = document.getElementById('collateralSearchResults');
    const selectBtn = document.getElementById('btnSelectCollateral');
    
    if (!tbody) return;
    
    // Clear previous results
    tbody.innerHTML = '';
    
    if (collateralSearchResults.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" class="no-results">
                    <i class="bi bi-search"></i> No collaterals found. Try adjusting your search criteria.
                </td>
            </tr>
        `;
        selectBtn.disabled = true;
        updateCollateralPagination();
        return;
    }
    
    // Calculate pagination
    const start = (currentCollateralPage - 1) * collateralPageSize;
    const end = start + collateralPageSize;
    const pageResults = collateralSearchResults.slice(start, end);
    
    // Render rows
    pageResults.forEach((collateral, index) => {
        const globalIndex = start + index + 1;
        const row = document.createElement('tr');
        row.dataset.index = start + index;
        
        row.innerHTML = `
            <td>${globalIndex}</td>
            <td>${collateral.branchId || collateral.OurBranchID || '-'}</td>
            <td>${collateral.collateralID || collateral.CollateralID || ''}</td>
            <td>${collateral.description || collateral.Description || ''}</td>
            <td>${collateral.ownerClientID || collateral.OwnerClientID || ''}</td>
            <td>${collateral.collateralTypeID || collateral.CollateralTypeID || ''}</td>
        `;
        
        row.addEventListener('click', () => {
            // Remove previous selection
            tbody.querySelectorAll('tr').forEach(r => r.classList.remove('selected'));
            
            // Add selection to clicked row
            row.classList.add('selected');
            selectedCollateralRow = collateral;
            selectBtn.disabled = false;
        });
        
        // Double-click to select
        row.addEventListener('dblclick', () => {
            selectedCollateralRow = collateral;
            selectCollateral();
        });
        
        tbody.appendChild(row);
    });
    
    updateCollateralPagination();
}

function updateCollateralPagination() {
    const totalResults = collateralSearchResults.length;
    const totalPages = Math.ceil(totalResults / collateralPageSize);
    
    const pageInfo = document.getElementById('collateralPageInfo');
    const prevBtn = document.getElementById('btnPrevCollateralPage');
    const nextBtn = document.getElementById('btnNextCollateralPage');
    
    if (pageInfo) {
        pageInfo.textContent = `Page ${currentCollateralPage} of ${totalPages} (${totalResults} results)`;
    }
    
    if (prevBtn) {
        prevBtn.disabled = currentCollateralPage <= 1;
    }
    
    if (nextBtn) {
        nextBtn.disabled = currentCollateralPage >= totalPages;
    }
}

function showCollateralSearchLoading() {
    const tbody = document.getElementById('collateralSearchResults');
    if (tbody) {
        tbody.innerHTML = `
            <tr>
                <td colspan="5" class="no-results">
                    <i class="bi bi-hourglass-split"></i> Searching...
                </td>
            </tr>
        `;
    }
}

function showCollateralSearchMessage(message, type = 'info') {
    // Use the main form's status message if available
    if (typeof showStatusMessage === 'function') {
        showStatusMessage(message, type);
    } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
    }
}

// ========== SELECTION ==========
function selectCollateral() {
    if (!selectedCollateralRow) {
        showCollateralSearchMessage('Please select a collateral from the list', 'warning');
        return;
    }
    
    // If we have full details from the API, use them
    if (selectedCollateralRow._fullDetails) {
        populateCollateralForm(selectedCollateralRow._fullDetails, selectedCollateralRow._details01);
    } else {
        // Otherwise populate basic fields
        const collateralIdInput = document.getElementById('collateralId');
        const descriptionInput = document.getElementById('description');
        const ownerIdInput = document.getElementById('ownerId');
        const branchIdInput = document.getElementById('branchId');
        const collateralTypeInput = document.getElementById('collateralType');
        
        if (collateralIdInput) {
            collateralIdInput.value = selectedCollateralRow.collateralID;
        }
        
        if (descriptionInput) {
            descriptionInput.value = selectedCollateralRow.description || '';
        }
        
        if (ownerIdInput) {
            ownerIdInput.value = selectedCollateralRow.ownerClientID || '';
        }

        if (typeof window.fetchOwnerDescription === 'function') {
            window.fetchOwnerDescription(selectedCollateralRow.ownerClientID || '');
        }
        
        // Populate Branch ID if available
        if (branchIdInput && selectedCollateralRow.branchId) {
            branchIdInput.value = selectedCollateralRow.branchId;
        }
        
        // Populate Collateral Type if available
        if (collateralTypeInput && selectedCollateralRow.collateralTypeID) {
            collateralTypeInput.value = selectedCollateralRow.collateralTypeID;
        }
    }
    
    // Close modal
    const modal = bootstrap.Modal.getInstance(document.getElementById('collateralSearchModal'));
    if (modal) {
        modal.hide();
    }
    
    showCollateralSearchMessage('Collateral selected successfully. Click View to load full details.', 'success');
}

function populateCollateralForm(details02, details01) {
    // Populate from Details02
    if (details02.CollateralID) {
        document.getElementById('collateralId').value = details02.CollateralID;
    }
    
    if (details02.Description) {
        document.getElementById('description').value = details02.Description;
    }
    
    if (details02.CollateralTypeID) {
        document.getElementById('collateralType').value = details02.CollateralTypeID;
    }
    
    if (details02.OwnerClientID) {
        document.getElementById('ownerId').value = details02.OwnerClientID;
    }

    if (typeof window.fetchOwnerDescription === 'function') {
        window.fetchOwnerDescription(details02.OwnerClientID || '');
    }
    
    if (details02.LodgedDate) {
        const date = new Date(details02.LodgedDate);
        document.getElementById('lodgedDate').value = date.toISOString().split('T')[0];
    }
    
    if (details02.IsInsured !== undefined) {
        document.getElementById('insured').checked = details02.IsInsured;
    }
    
    if (details02.NatureOfChargeID) {
        document.getElementById('natureOfCharge').value = details02.NatureOfChargeID;
    }
    
    if (details02.Remarks) {
        document.getElementById('remarks').value = details02.Remarks;
    }
    
    // Audit fields
    if (details02.CreatedBy) {
        document.getElementById('createdBy').value = details02.CreatedBy;
    }
    
    if (details02.CreatedOn) {
        document.getElementById('createdOn').value = new Date(details02.CreatedOn).toLocaleString();
    }
    
    if (details02.ModifiedBy) {
        document.getElementById('modifiedBy').value = details02.ModifiedBy;
    }
    
    if (details02.ModifiedOn) {
        document.getElementById('modifiedOn').value = new Date(details02.ModifiedOn).toLocaleString();
    }
    
    if (details02.SupervisedBy) {
        document.getElementById('supervisedBy').value = details02.SupervisedBy;
    }
    
    if (details02.SupervisedOn) {
        document.getElementById('supervisedOn').value = new Date(details02.SupervisedOn).toLocaleString();
    }
    
    // Populate from Details01 (financial)
    if (details01) {
        if (details01.CollateralValue !== undefined) {
            document.getElementById('collateralValue').value = details01.CollateralValue;
        }
        
        if (details01.CurrencyID) {
            document.getElementById('currencyId').value = details01.CurrencyID;
        }
        
        if (details01.CollateralValueUsed !== undefined) {
            document.getElementById('usedCollateralValue').value = details01.CollateralValueUsed;
        }
        
        if (details01.CollateralValueTypeID) {
            document.getElementById('valueType').value = details01.CollateralValueTypeID;
        }
        
        if (details01.CollateralStatus) {
            document.getElementById('status').value = details01.CollateralStatus;
        }
        
        if (details01.WithdrawnDate) {
            const date = new Date(details01.WithdrawnDate);
            document.getElementById('withdrawnDate').value = date.toISOString().split('T')[0];
        }
        
        if (details01.WithdrawnReason) {
            document.getElementById('withdrawnReason').value = details01.WithdrawnReason;
        }
    }
}

// Make functions globally available
window.performCollateralSearch = performCollateralSearch;
window.clearCollateralSearch = clearCollateralSearch;
window.selectCollateral = selectCollateral;
window.loadAllCollaterals = loadAllCollaterals;
window.setupCollateralSearchModal = setupCollateralSearchModal;
