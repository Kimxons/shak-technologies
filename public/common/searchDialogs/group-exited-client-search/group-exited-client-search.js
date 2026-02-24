// Group Exited Client Search Dialog
let selectedClient = null;
let searchResults = [];
let parentContext = null;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    initializeDialog();
    setupEventListeners();
    loadServices();
});

// Initialize dialog
function initializeDialog() {
    console.log('[Exited Client Search] Dialog initialized');
    
    // Get parent context
    if (window.parent && window.parent.parentContext) {
        parentContext = window.parent.parentContext;
        console.log('[Exited Client Search] Parent context:', parentContext);
    } else {
        console.warn('[Exited Client Search] No parent context found');
    }
}

// Setup event listeners
function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    const searchBtn = document.getElementById('searchBtn');
    const clearBtn = document.getElementById('clearSearch');
    const confirmBtn = document.getElementById('confirmBtn');
    const closeBtn = document.getElementById('closeBtn');

    // Search button
    searchBtn.addEventListener('click', performSearch);

    // Search on Enter
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            performSearch();
        }
    });

    // Show/hide clear button
    searchInput.addEventListener('input', (e) => {
        if (e.target.value) {
            clearBtn.classList.add('show');
        } else {
            clearBtn.classList.remove('show');
        }
    });

    // Clear search
    clearBtn.addEventListener('click', () => {
        searchInput.value = '';
        clearBtn.classList.remove('show');
        searchInput.focus();
    });

    // Confirm selection
    confirmBtn.addEventListener('click', confirmSelection);

    // Close dialog
    closeBtn.addEventListener('click', closeDialog);
}

// Load services
async function loadServices() {
    if (window.parent && window.parent.ServiceLoader) {
        try {
            await window.parent.ServiceLoader.loadCore();
            await window.parent.ServiceLoader.loadScript('../../../assets/js/services/shared/lookupService.js');
            console.log('[Exited Client Search] Services loaded');
        } catch (error) {
            console.error('[Exited Client Search] Error loading services:', error);
        }
    }
}

// Perform search
async function performSearch() {
    const searchKey = document.getElementById('searchInput').value.trim();
    
    // Validate parent context
    if (!parentContext || !parentContext.branchId) {
        showError('Branch context is required');
        return;
    }

    if (!parentContext.centerId) {
        showError('Please select a Center first');
        return;
    }

    if (!parentContext.groupId) {
        showError('Please select a Group first');
        return;
    }

    try {
        showLoading();

        // Build AdvFilterString
        const advFilterString = `OurBranchID='${parentContext.branchId}' AND GroupID='${parentContext.centerId}' AND SubGroupID='${parentContext.groupId}'`;

        console.log('[Exited Client Search] Searching with:', {
            TableID: 'GroupExitedClientID',
            AdvFilterString: advFilterString,
            SearchKey: searchKey
        });

        // Get LookupService from parent
        const LookupService = window.parent.LookupService;
        
        if (!LookupService) {
            throw new Error('LookupService not available');
        }

        // Build search payload
        const payload = {
            TableID: 'GroupExitedClientID',
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: advFilterString,
            SearchKey: searchKey || null
        };

        // Execute search
        const response = await LookupService.getSearchResult(payload);
        
        console.log('[Exited Client Search] Search response:', response);

        if (response && response.data && response.data.Table) {
            searchResults = response.data.Table;
            renderResults(searchResults);
        } else {
            searchResults = [];
            showEmpty('No exited clients found');
        }

    } catch (error) {
        console.error('[Exited Client Search] Search error:', error);
        showError('Error performing search. Please try again.');
    }
}

// Show loading state
function showLoading() {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="loading-state">
            <div class="spinner"></div>
            <p>Searching exited clients...</p>
        </div>
    `;
}

// Show empty state
function showEmpty(message) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="empty-state">
            <i class="bi bi-person-x"></i>
            <p>${message}</p>
        </div>
    `;
}

// Show error state
function showError(message) {
    const container = document.getElementById('resultsContainer');
    container.innerHTML = `
        <div class="empty-state">
            <i class="bi bi-exclamation-triangle" style="color: #dc2626;"></i>
            <p style="color: #dc2626;">${message}</p>
        </div>
    `;
}

// Render search results
function renderResults(results) {
    const container = document.getElementById('resultsContainer');

    if (!results || results.length === 0) {
        showEmpty('No exited clients found');
        return;
    }

    // Build table
    let html = `
        <table class="results-table">
            <thead>
                <tr>
                    <th>Client ID</th>
                    <th>Client Name</th>
                    <th>Mobile</th>
                    <th>Exit Date</th>
                    <th>Exit Reason</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    results.forEach((client, index) => {
        const clientId = client.GroupExitedClientID || client.ClientID || '';
        const clientName = client.GroupExitedClientName || client.ClientName || '';
        const mobile = client.MobileNo || '';
        const exitDate = client.ExitDate || '';
        const exitReason = client.ExitReason || '';
        const status = client.Status || '';

        html += `
            <tr data-index="${index}" onclick="selectClient(${index})">
                <td><strong>${clientId}</strong></td>
                <td>${clientName}</td>
                <td>${mobile}</td>
                <td>${exitDate}</td>
                <td>${exitReason}</td>
                <td>
                    ${status ? `<span class="badge badge-${status === 'Active' ? 'success' : 'danger'}">${status}</span>` : '-'}
                </td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    container.innerHTML = html;
    
    console.log('[Exited Client Search] Rendered', results.length, 'results');
}

// Select client
function selectClient(index) {
    // Remove previous selection
    document.querySelectorAll('.results-table tbody tr').forEach(row => {
        row.classList.remove('selected');
    });

    // Mark selected
    const row = document.querySelector(`tr[data-index="${index}"]`);
    if (row) {
        row.classList.add('selected');
        selectedClient = searchResults[index];
        document.getElementById('confirmBtn').disabled = false;
        
        console.log('[Exited Client Search] Selected:', selectedClient);
    }
}

// Confirm selection
function confirmSelection() {
    if (!selectedClient) {
        return;
    }

    const clientData = {
        type: 'EXITED_CLIENT_SELECTED',
        clientId: selectedClient.GroupExitedClientID || selectedClient.ClientID || '',
        clientName: selectedClient.GroupExitedClientName || selectedClient.ClientName || '',
        mobile: selectedClient.MobileNo || '',
        exitDate: selectedClient.ExitDate || '',
        exitReason: selectedClient.ExitReason || '',
        nextOfKin: selectedClient.NextOfKin || '',
        unclaimedAmount: selectedClient.UnclaimedAmount || 0,
        osUnclaimed: selectedClient.OSUnclaimed || 0
    };

    console.log('[Exited Client Search] Sending selection to parent:', clientData);

    // Send to parent window
    if (window.parent) {
        window.parent.postMessage(clientData, '*');
    }

    // Close dialog
    closeDialog();
}

// Close dialog
function closeDialog() {
    console.log('[Exited Client Search] Closing dialog');
    
    if (window.parent) {
        window.parent.postMessage({ type: 'kairo-search-close' }, '*');
    }
}

// Make selectClient available globally
window.selectClient = selectClient;
