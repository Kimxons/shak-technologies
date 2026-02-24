/**
 * Forfeit Recovery Module
 * Handles center, group, client, and officer search with forfeit recovery operations
 */

// Sample data for Forfeit Recovery
const forfeitRecoveryData = [
    {
        centerId: 'C001', 
        groupId: 'G001', 
        clientId: 'CLI001', 
        amountRecovered: 5000, 
        exchangeRate: 1.0, 
        creditOfficer: 'OFF001', 
        remarks: 'Recovery on forfeit', 
        recoveredChargeOff: true, 
        recoveredForfeit: false, 
        transactions: [
            { accountType: 'GL', accountId: 'GL001', description: 'Forfeit Account', transactionType: 'Credit', amount: 3000 }
        ], 
        recoveryDetails: [
            { accountType: 'Customer', accountId: 'ACC001', description: 'Customer Savings', transactionType: 'Debit', amount: 3000 }
        ]
    }
];

let currentData = null;
let editMode = false;
let servicesReady = false;

// Context for passing to search dialogs
const parentContext = {
    branchId: '',
    centerId: '',
    centerName: '',
    groupId: '',
    groupName: ''
};

/**
 * Initialize the module
 */
document.addEventListener('DOMContentLoaded', async function() {
    await initializeServices();
    setupEventListeners();
    initializeDefaultValues();
    
    // Add snackbar styles
    const style = document.createElement('style');
    style.textContent = `
        .snackbar-container {
            position: fixed;
            bottom: 24px;
            left: 50%;
            transform: translateX(-50%);
            z-index: 10000;
            display: flex;
            flex-direction: column;
            gap: 12px;
            pointer-events: none;
        }
        
        .snackbar {
            display: flex;
            align-items: center;
            gap: 12px;
            min-width: 300px;
            max-width: 500px;
            padding: 14px 20px;
            background: #323232;
            color: #fff;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
            font-size: 14px;
            font-weight: 500;
            opacity: 0;
            transform: translateY(20px);
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            pointer-events: auto;
        }
        
        .snackbar.show {
            opacity: 1;
            transform: translateY(0);
        }
        
        .snackbar-icon {
            display: flex;
            align-items: center;
            justify-content: center;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            font-size: 16px;
            font-weight: bold;
            flex-shrink: 0;
        }
        
        .snackbar-success {
            background: #2e7d32;
        }
        
        .snackbar-success .snackbar-icon {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .snackbar-error {
            background: #c62828;
        }
        
        .snackbar-error .snackbar-icon {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .snackbar-warning {
            background: #f57c00;
        }
        
        .snackbar-warning .snackbar-icon {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .snackbar-info {
            background: #0288d1;
        }
        
        .snackbar-info .snackbar-icon {
            background: rgba(255, 255, 255, 0.2);
        }
        
        .snackbar-message {
            flex: 1;
            line-height: 1.4;
        }
    `;
    document.head.appendChild(style);
});

/**
 * Load required services
 */
async function initializeServices() {
    if (window.ServiceLoader) {
        try {
            await window.ServiceLoader.loadCore();
            // Load both LookupService and SearchService (used by search dialogs)
            await window.ServiceLoader.loadScript('../../../assets/js/services/shared/lookupService.js');
            await window.ServiceLoader.loadScript('../../../assets/js/services/shared/searchService.js');
            await window.ServiceLoader.loadScript('../../../assets/js/services/microfinance/groupService.js');
            
            servicesReady = true;
            console.log('[Forfeit Recovery] Services loaded successfully');
            console.log('[Forfeit Recovery] LookupService available:', !!window.LookupService);
            console.log('[Forfeit Recovery] SearchService available:', !!window.SearchService);
            console.log('[Forfeit Recovery] GroupService available:', !!window.GroupService);
        } catch (error) {
            console.error('[Forfeit Recovery] Error loading services:', error);
            showStatus('Failed to load required services', 'error');
        }
    } else {
        console.error('[Forfeit Recovery] ServiceLoader not found');
        showStatus('ServiceLoader not available', 'error');
    }
}

/**
 * Initialize default values
 */
function initializeDefaultValues() {
    // Set default branch (used by group/center search)
    parentContext.branchId = '0603';
    console.log('[Forfeit Recovery] Initialized with default branch:', parentContext.branchId);
}

/**
 * Ensure services are loaded before using them
 */
async function ensureServicesLoaded() {
    // If services are ready and LookupService exists, we're good
    if (servicesReady && window.LookupService) {
        return true;
    }
    
    // If not ready, try to initialize
    if (!servicesReady) {
        console.log('[Forfeit Recovery] Services not ready, initializing...');
        await initializeServices();
    }
    
    // Final check
    if (!window.LookupService) {
        console.error('[Forfeit Recovery] LookupService still not available after initialization');
        console.error('[Forfeit Recovery] ServiceLoader:', !!window.ServiceLoader);
        console.error('[Forfeit Recovery] servicesReady:', servicesReady);
        return false;
    }
    
    return true;
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Search buttons
    document.querySelectorAll('[data-search]').forEach(btn => {
        btn.addEventListener('click', handleSearchClick);
    });

    // Action buttons
    document.querySelectorAll('[data-action]').forEach(btn => {
        btn.addEventListener('click', handleActionClick);
    });

    // Enter key and blur handlers for ID fields - direct lookup without dialogs
    setupFieldListeners('centerId', handleViewCenter);
    setupFieldListeners('groupId', handleViewGroup);
    setupFieldListeners('clientId', handleViewClient);
    setupFieldListeners('creditOfficer', handleViewOfficer);

    // Status close button
    document.querySelector('.status-close')?.addEventListener('click', () => {
        document.getElementById('statusMsg').classList.add('hidden');
    });

    // Listen for messages from search dialogs
    window.addEventListener('message', handleSearchMessage);
}

/**
 * Setup enter key and blur listeners for a field
 */
function setupFieldListeners(fieldId, handler) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    // Enter key handler
    field.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handler();
        }
    });

    // Blur handler - fetch details when clicking outside or tabbing away
    field.addEventListener('blur', () => {
        const value = field.value.trim();
        if (value) {
            handler();
        }
    });
}

/**
 * Handle search button clicks
 */
function handleSearchClick(event) {
    const searchType = event.currentTarget.dataset.search;
    
    switch (searchType) {
        case 'center':
            openCenterSearch();
            break;
        case 'group':
            openGroupSearch();
            break;
        case 'client':
            openClientSearch();
            break;
        case 'officer':
            openOfficerSearch();
            break;
    }
}

/**
 * Handle action button clicks
 */
function handleActionClick(event) {
    const action = event.currentTarget.dataset.action;
    
    switch (action) {
        case 'view':
            handleView();
            break;
        case 'add':
            handleAdd();
            break;
        case 'save':
            handleSave();
            break;
        case 'cancel':
            handleCancel();
            break;
    }
}

// ═══════════════════════════════════════════════════════════════
// SEARCH DIALOG FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Open Center Search Dialog
 */
function openCenterSearch(searchFilter = '') {
    console.log('[Forfeit Recovery] Opening center search dialog', searchFilter ? `with filter: ${searchFilter}` : '');

    const modal = document.getElementById('centerSearchModal');
    const iframe = document.getElementById('centerSearchFrame');
    const modalTitle = document.getElementById('centerSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        console.error('[Forfeit Recovery] Center search modal elements not found');
        return;
    }

    modalTitle.textContent = 'Center Search';
    let url = `../../common/searchDialogs/group-search/group-search.html?context=center&branch=${parentContext.branchId || '0603'}`;
    if (searchFilter) {
        url += `&searchKey=${encodeURIComponent(searchFilter)}`;
    }
    iframe.src = url;

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    console.log('[Forfeit Recovery] Center search dialog opened');
}

/**
 * Open Center Search with filter from input field
 */
function openCenterSearchWithFilter() {
    const centerId = document.getElementById('centerId').value.trim();
    openCenterSearch(centerId);
}

/**
 * Open Group Search Dialog (Subgroup within Center)
 */
function openGroupSearch(searchFilter = '') {
    const centerId = document.getElementById('centerId').value.trim();
    
    if (!centerId) {
        showStatus('Please select a Center first', 'error');
        return;
    }

    console.log('[Forfeit Recovery] Opening group search dialog', searchFilter ? `with filter: ${searchFilter}` : '');

    const modal = document.getElementById('groupSearchModal');
    const iframe = document.getElementById('groupSearchFrame');
    const modalTitle = document.getElementById('groupSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        console.error('[Forfeit Recovery] Group search modal elements not found');
        return;
    }

    modalTitle.textContent = 'Group Search';
    let url = '../../common/searchDialogs/subgroup-search/subgroup-search.html';
    if (searchFilter) {
        url += `?searchKey=${encodeURIComponent(searchFilter)}`;
    }
    iframe.src = url;

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    console.log('[Forfeit Recovery] Group search dialog opened');
}

/**
 * Open Group Search with filter from input field
 */
function openGroupSearchWithFilter() {
    const groupId = document.getElementById('groupId').value.trim();
    openGroupSearch(groupId);
}

/**
 * Open Client Search Dialog
 */
function openClientSearch(searchFilter = '') {
    const centerId = document.getElementById('centerId').value.trim();
    const groupId = document.getElementById('groupId').value.trim();
    
    if (!centerId) {
        showStatus('Please select a Center first', 'error');
        return;
    }

    if (!groupId) {
        showStatus('Please select a Group first', 'error');
        return;
    }

    console.log('[Forfeit Recovery] Opening client search dialog', searchFilter ? `with filter: ${searchFilter}` : '');

    const modal = document.getElementById('clientSearchModal');
    const iframe = document.getElementById('clientSearchFrame');
    const modalTitle = document.getElementById('clientSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        console.error('[Forfeit Recovery] Client search modal elements not found');
        return;
    }

    modalTitle.textContent = 'Exited Client Search';
    let url = `../../common/searchDialogs/group-exited-client-search/group-exited-client-search.html?branch=${parentContext.branchId || '0603'}&centerId=${centerId}&groupId=${groupId}`;
    if (searchFilter) {
        url += `&searchKey=${encodeURIComponent(searchFilter)}`;
    }
    iframe.src = url;

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    console.log('[Forfeit Recovery] Exited client search dialog opened');
}

/**
 * Open Client Search with filter from input field
 */
function openClientSearchWithFilter() {
    const clientId = document.getElementById('clientId').value.trim();
    openClientSearch(clientId);
}

/**
 * Open Credit Officer Search Dialog
 */
function openOfficerSearch(searchFilter = '') {
    console.log('[Forfeit Recovery] Opening officer search dialog', searchFilter ? `with filter: ${searchFilter}` : '');

    const modal = document.getElementById('officerSearchModal');
    const iframe = document.getElementById('officerSearchFrame');
    const modalTitle = document.getElementById('officerSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        console.error('[Forfeit Recovery] Officer search modal elements not found');
        return;
    }

    modalTitle.textContent = 'Credit Officer Search';
    let url = '../../common/searchDialogs/active-officer-search/active-officer-search.html';
    if (searchFilter) {
        url += `?searchKey=${encodeURIComponent(searchFilter)}`;
    }
    iframe.src = url;

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    console.log('[Forfeit Recovery] Officer search dialog opened');
}

/**
 * Open Officer Search with filter from input field
 */
function openOfficerSearchWithFilter() {
    const officerId = document.getElementById('creditOfficer').value.trim();
    openOfficerSearch(officerId);
}

/**
 * Handle messages from search dialogs
 */
function handleSearchMessage(event) {
    const { type } = event.data;

    switch (type) {
        case 'GROUP_SELECTED':
            // Center selected from group-search dialog (context-aware)
            if (event.data.context === 'center') {
                console.log('[Forfeit Recovery] Center selected:', event.data);
                document.getElementById('centerId').value = event.data.groupId || '';
                document.getElementById('centerName').value = event.data.groupName || '';
                
                parentContext.centerId = event.data.groupId || '';
                parentContext.centerName = event.data.groupName || '';
                
                // Clear dependent fields
                clearGroupFields();
                clearClientFields();
                
                closeCenterSearchModal();
                showStatus(`Center '${event.data.groupName}' selected`, 'success');
            }
            break;

        case 'SUBGROUP_SELECTED':
            // Group selected from subgroup-search dialog
            console.log('[Forfeit Recovery] Group selected:', event.data);
            document.getElementById('groupId').value = event.data.subGroupId || event.data.subgroupId || '';
            document.getElementById('groupName').value = event.data.subGroupName || event.data.subgroupName || '';
            
            parentContext.groupId = event.data.subGroupId || event.data.subgroupId || '';
            parentContext.groupName = event.data.subGroupName || event.data.subgroupName || '';
            
            // Clear dependent fields
            clearClientFields();
            
            closeGroupSearchModal();
            showStatus(`Group '${event.data.subGroupName || event.data.subgroupName}' selected`, 'success');
            break;

        case 'EXITED_CLIENT_SELECTED':
            // Exited client selected
            console.log('[Forfeit Recovery] Exited client selected:', event.data);
            document.getElementById('clientId').value = event.data.clientId || '';
            document.getElementById('clientName').value = event.data.clientName || '';
            
            closeClientSearchModal();
            showStatus(`Client '${event.data.clientName}' selected`, 'success');
            
            // Auto-load forfeit data for this client
            loadForfeitData(event.data.clientId);
            break;

        case 'CLIENT_SELECTED':
            // Handle regular client selection (for backwards compatibility)
            console.log('[Forfeit Recovery] Client selected:', event.data);
            document.getElementById('clientId').value = event.data.clientId || '';
            document.getElementById('clientName').value = event.data.data?.Name || event.data.data?.ClientName || '';
            
            closeClientSearchModal();
            showStatus(`Client '${event.data.clientId}' selected`, 'success');
            
            // Auto-load forfeit data for this client
            loadForfeitData(event.data.clientId);
            break;

        case 'ACTIVE_OFFICER_SELECTED':
            // Officer selected
            console.log('[Forfeit Recovery] Officer selected:', event.data);
            document.getElementById('creditOfficer').value = event.data.officerId || '';
            document.getElementById('officerName').value = event.data.officerName || '';
            
            closeOfficerSearchModal();
            showStatus(`Officer '${event.data.officerName}' selected`, 'success');
            break;

        case 'kairo-dataentry-close':
        case 'kairo-search-close':
            // Close any open modals
            closeCenterSearchModal();
            closeGroupSearchModal();
            closeClientSearchModal();
            closeOfficerSearchModal();
            break;
    }
}

// ═══════════════════════════════════════════════════════════════
// MODAL CLOSE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function closeCenterSearchModal() {
    const modal = document.getElementById('centerSearchModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
}

function closeGroupSearchModal() {
    const modal = document.getElementById('groupSearchModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
}

function closeClientSearchModal() {
    const modal = document.getElementById('clientSearchModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
}

function closeOfficerSearchModal() {
    const modal = document.getElementById('officerSearchModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
}

// ═══════════════════════════════════════════════════════════════
// CLEAR FIELD FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function clearGroupFields() {
    document.getElementById('groupId').value = '';
    document.getElementById('groupName').value = '';
    parentContext.groupId = '';
    parentContext.groupName = '';
}

function clearClientFields() {
    document.getElementById('clientId').value = '';
    document.getElementById('clientName').value = '';
}

// ═══════════════════════════════════════════════════════════════
// VIEW FIELD FUNCTIONS (on blur/enter)
// ═══════════════════════════════════════════════════════════════

async function handleViewCenter() {
    const centerId = document.getElementById('centerId').value.trim();
    
    if (!centerId) return;
    
    // If same as current, no need to reload
    if (centerId === parentContext.centerId) return;

    try {
        // Ensure services are loaded
        const servicesAvailable = await ensureServicesLoaded();
        if (!servicesAvailable) {
            showStatus('Services not available. Please try again.', 'error');
            return;
        }


        // Replicate group-search-modal.js search pattern for centers
        const payload = {
            TableID: 'GroupID',
            OurBranchID: parentContext.branchId || '0603',
            WhereStmt: `GroupID='${centerId}'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: `OurBranchID='${parentContext.branchId || '0603'}'`,
            OperatorID: window.CurrentUser?.OperatorID || 'CSADM',
            ModuleID: 5060,
            SearchKey: null,
            LanguageID: 'en'
        };

        console.log('[Forfeit Recovery] Center lookup payload:', payload);

        const result = await window.LookupService.getSearchResult(payload);

        console.log('[Forfeit Recovery] Center lookup result:', result);

        if (result && result.success && result.data) {
            const groups = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            if (groups && groups.length > 0) {
                const center = groups.find(g => g.GroupID === centerId) || groups[0];
                
                document.getElementById('centerName').value = center.GroupName || '';
                parentContext.centerId = center.GroupID;
                parentContext.centerName = center.GroupName;
                
                // Clear dependent fields
                clearGroupFields();
                clearClientFields();
                
                showStatus(`Center '${center.GroupName}' loaded`, 'success');
            } else {
                document.getElementById('centerName').value = '';
                showStatus('Center not found', 'error');
            }
        } else {
            document.getElementById('centerName').value = '';
            showStatus('Center not found', 'error');
        }
    } catch (error) {
        console.error('[Forfeit Recovery] Error loading center:', error);
        document.getElementById('centerName').value = '';
        showStatus('Error loading center details', 'error');
    }
}

async function handleViewGroup() {
    const groupId = document.getElementById('groupId').value.trim();
    
    if (!groupId || groupId === parentContext.groupId) return;

    const centerId = document.getElementById('centerId').value.trim();
    if (!centerId) {
        showStatus('Please select a Center first', 'error');
        return;
    }

    try {
        // Ensure services are loaded
        const servicesAvailable = await ensureServicesLoaded();
        if (!servicesAvailable) {
            showStatus('Services not available. Please try again.', 'error');
            return;
        }


        // Replicate subgroup-search-modal.js search pattern
        const payload = {
            TableID: 'SubGroupID',
            OurBranchID: parentContext.branchId || '0603',
            WhereStmt: `SubGroupID='${groupId}'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: `GroupID='${centerId}'`,
            OperatorID: window.CurrentUser?.OperatorID || 'CSADM',
            ModuleID: 5060,
            SearchKey: null,
            LanguageID: 'en'
        };

        console.log('[Forfeit Recovery] Group lookup payload:', payload);
        console.log('[Forfeit Recovery] Using centerId from context:', centerId);

        // Use LookupService only (SearchService may not have getSearchResult method)
        const result = await window.LookupService.getSearchResult(payload);

        console.log('[Forfeit Recovery] Group lookup result:', result);

        if (result && result.success && result.data) {
            const groups = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            if (groups && groups.length > 0) {
                const group = groups.find(g => g.SubGroupID === groupId) || groups[0];
                
                document.getElementById('groupName').value = group.SubGroupName || '';
                parentContext.groupId = group.SubGroupID;
                parentContext.groupName = group.SubGroupName;
                
                // Clear dependent fields
                clearClientFields();
                
                showStatus(`Group '${group.SubGroupName}' loaded`, 'success');
            } else {
                document.getElementById('groupName').value = '';
                showStatus('Group not found', 'error');
            }
        } else {
            document.getElementById('groupName').value = '';
            showStatus('Group not found', 'error');
        }
    } catch (error) {
        console.error('[Forfeit Recovery] Error loading group:', error);
        document.getElementById('groupName').value = '';
        showStatus('Error loading group details', 'error');
    }
}

async function handleViewClient() {
    const clientId = document.getElementById('clientId').value.trim();
    
    if (!clientId) return;

    // Check sample data first
    const data = forfeitRecoveryData.find(f => f.clientId === clientId);
    if (data) {
        loadForm(data);
        currentData = JSON.parse(JSON.stringify(data));
        loadTransactionTable(data.transactions);
        loadRecoveryTable(data.recoveryDetails);
        showStatus(`Forfeit recovery data loaded for client '${clientId}'`, 'success');
        return;
    }

    // Try API lookup if no sample data - using group exited client search
    try {
        // Ensure services are loaded
        const servicesAvailable = await ensureServicesLoaded();
        if (!servicesAvailable) {
            showStatus('Client not found', 'error');
            return;
        }

        const centerId = document.getElementById('centerId').value.trim();
        const groupId = document.getElementById('groupId').value.trim();
        
        if (!centerId || !groupId) {
            showStatus('Please select Center and Group first', 'error');
            return;
        }

        // Replicate exited client search pattern
        const payload = {
            TableID: 'GroupExitedClientID',
            OurBranchID: parentContext.branchId || '0603',
            WhereStmt: `GroupExitedClientID='${clientId}'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: `OurBranchID='${parentContext.branchId || '0603'}' AND GroupID='${centerId}' AND SubGroupID='${groupId}'`,
            OperatorID: window.CurrentUser?.OperatorID || 'CSADM',
            ModuleID: 5170,
            SearchKey: null,
            LanguageID: 'en'
        };

        console.log('[Forfeit Recovery] Exited client lookup payload:', payload);

        const result = await window.LookupService.getSearchResult(payload);

        console.log('[Forfeit Recovery] Exited client lookup result:', result);

        if (result && result.success && result.data) {
            const clients = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            if (clients && clients.length > 0) {
                const client = clients.find(c => c.GroupExitedClientID === clientId || c.ClientID === clientId) || clients[0];
                
                document.getElementById('clientName').value = client.GroupExitedClientName || client.ClientName || client.Name || '';
                showStatus(`Exited client '${client.GroupExitedClientName || client.ClientName || client.Name}' found`, 'success');
            } else {
                document.getElementById('clientName').value = '';
                showStatus('Exited client not found', 'error');
            }
        } else {
            document.getElementById('clientName').value = '';
            showStatus('Exited client not found', 'error');
        }
    } catch (error) {
        console.error('[Forfeit Recovery] Error loading exited client:', error);
        document.getElementById('clientName').value = '';
        showStatus('Error loading exited client details', 'error');
    }
}

async function handleViewOfficer() {
    const officerId = document.getElementById('creditOfficer').value.trim();
    
    if (!officerId) return;

    try {
        // Ensure services are loaded
        const servicesAvailable = await ensureServicesLoaded();
        if (!servicesAvailable) {
            showStatus('Services not available. Please try again.', 'error');
            return;
        }


        // Replicate active-officer-search pattern
        const payload = {
            TableID: 'ActiveOfficerID',
            OurBranchID: parentContext.branchId || '0603',
            WhereStmt: `OfficerID='${officerId}'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: "BankID='00' AND OfficerTypeID in ('CO','AO')",
            OperatorID: window.CurrentUser?.OperatorID || 'CSADM',
            ModuleID: 5060,
            SearchKey: null,
            LanguageID: 'en'
        };

        console.log('[Forfeit Recovery] Officer lookup payload:', payload);

        const result = await window.LookupService.getSearchResult(payload);

        console.log('[Forfeit Recovery] Officer lookup result:', result);

        if (result && result.success && result.data) {
            const officers = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            if (officers && officers.length > 0) {
                const officer = officers.find(o => o.OfficerID === officerId) || officers[0];
                
                document.getElementById('officerName').value = officer.OfficerName || '';
                showStatus(`Officer '${officer.OfficerName}' loaded`, 'success');
            } else {
                document.getElementById('officerName').value = '';
                showStatus('Officer not found', 'error');
            }
        } else {
            document.getElementById('officerName').value = '';
            showStatus('Officer not found', 'error');
        }
    } catch (error) {
        console.error('[Forfeit Recovery] Error loading officer:', error);
        document.getElementById('officerName').value = '';
        showStatus('Error loading officer details', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// FORM OPERATIONS
// ═══════════════════════════════════════════════════════════════

function loadForfeitData(clientId) {
    const data = forfeitRecoveryData.find(f => f.clientId === clientId);
    if (!data) {
        showStatus(`No forfeit data found for client '${clientId}'`, 'info');
        return;
    }
    
    loadForm(data);
    currentData = JSON.parse(JSON.stringify(data));
    loadTransactionTable(data.transactions);
    loadRecoveryTable(data.recoveryDetails);
}

function loadForm(data) {
    document.getElementById('centerId').value = data.centerId || '';
    document.getElementById('groupId').value = data.groupId || '';
    document.getElementById('clientId').value = data.clientId || '';
    document.getElementById('amountRecovered').value = data.amountRecovered || '';
    document.getElementById('exchangeRate').value = data.exchangeRate || '';
    document.getElementById('creditOfficer').value = data.creditOfficer || '';
    document.getElementById('remarks').value = data.remarks || '';
    document.getElementById('recoveredChargeOff').checked = data.recoveredChargeOff || false;
    document.getElementById('recoveredForfeit').checked = data.recoveredForfeit || false;
}

function loadTransactionTable(transactions) {
    const tbody = document.querySelector('#transactionTable tbody');
    if (!transactions || transactions.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="5">No records</td></tr>';
        return;
    }
    tbody.innerHTML = transactions.map(t => `
        <tr>
            <td>${t.accountType || ''}</td>
            <td>${t.accountId || ''}</td>
            <td>${t.description || ''}</td>
            <td>${t.transactionType || ''}</td>
            <td>${t.amount || ''}</td>
        </tr>
    `).join('');
}

function loadRecoveryTable(details) {
    const tbody = document.querySelector('#recoveryTable tbody');
    if (!details || details.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="6">No records</td></tr>';
        return;
    }
    tbody.innerHTML = details.map(d => `
        <tr>
            <td>${d.name || d.clientName || ''}</td>
            <td>${d.accountId || ''}</td>
            <td>${d.forfeitedAmount || d.amount || ''}</td>
            <td>${d.osForfeit || d.osAmount || ''}</td>
            <td>${d.recoveredAmount || ''}</td>
            <td>${d.recoveryStatus || d.status || ''}</td>
        </tr>
    `).join('');
}

function switchTab(index) {
    document.querySelectorAll('.tab-button').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });
    document.querySelectorAll('.tab-content').forEach((content, i) => {
        content.classList.toggle('active', i === index);
    });
}

function handleContinue() {
    if (!currentData) {
        showStatus('Load client first', 'error');
        return;
    }
    showStatus('Proceeding to next step', 'info');
}

function handleView() {
    const centerId = document.getElementById('centerId').value.trim();
    const groupId = document.getElementById('groupId').value.trim();
    const clientId = document.getElementById('clientId').value.trim();
    
    // Validate all required fields
    if (!centerId) {
        showStatus('Please select a Center', 'error');
        return;
    }
    
    if (!groupId) {
        showStatus('Please select a Group', 'error');
        return;
    }
    
    if (!clientId) {
        showStatus('Please select a Client', 'error');
        return;
    }
    
    if (!currentData) {
        showStatus('No forfeit recovery data found for this client', 'error');
        return;
    }
    
    // All validations passed - enable other buttons
    enableActionButtons();
    showStatus(`Viewing forfeit recovery for client '${currentData.clientId}'`, 'success');
}

function handleAdd() {
    clearForm();
    editMode = true;
    // Keep only View and Save active during add mode
    document.querySelector('[data-action="add"]').disabled = true;
    document.querySelector('[data-action="save"]').disabled = false;
    document.querySelector('[data-action="cancel"]').disabled = false;
    showStatus('Add mode enabled - enter forfeit recovery details', 'info');
}

function handleSave() {
    if (!document.getElementById('clientId').value) {
        showStatus('Client ID required', 'error');
        return;
    }
    showStatus('Forfeit recovery saved', 'success');
    editMode = false;
}

function handleCancel() {
    clearForm();
}

function clearForm() {
    document.getElementById('centerId').value = '';
    document.getElementById('centerName').value = '';
    document.getElementById('groupId').value = '';
    document.getElementById('groupName').value = '';
    document.getElementById('clientId').value = '';
    document.getElementById('clientName').value = '';
    document.getElementById('amountRecovered').value = '';
    document.getElementById('exchangeRate').value = '';
    document.getElementById('creditOfficer').value = '';
    document.getElementById('officerName').value = '';
    document.getElementById('remarks').value = '';
    document.getElementById('recoveredChargeOff').checked = false;
    document.getElementById('recoveredForfeit').checked = false;
    
    document.querySelector('#transactionTable tbody').innerHTML = '<tr class="empty-row"><td colspan="5">No records</td></tr>';
    document.querySelector('#recoveryTable tbody').innerHTML = '<tr class="empty-row"><td colspan="5">No records</td></tr>';
    
    // Reset context
    parentContext.centerId = '';
    parentContext.centerName = '';
    parentContext.groupId = '';
    parentContext.groupName = '';
    currentData = null;
    
    // Disable action buttons except View
    disableActionButtons();
    
    showStatus('Cancelled', 'info');
}

function setEditMode(enabled) {
    document.getElementById('amountRecovered').disabled = !enabled;
    document.getElementById('exchangeRate').disabled = !enabled;
    document.getElementById('creditOfficer').disabled = !enabled;
    document.getElementById('remarks').disabled = !enabled;
    document.getElementById('recoveredChargeOff').disabled = !enabled;
    document.getElementById('recoveredForfeit').disabled = !enabled;
}

function enableActionButtons() {
    document.querySelector('[data-action="add"]').disabled = false;
    document.querySelector('[data-action="save"]').disabled = false;
    document.querySelector('[data-action="cancel"]').disabled = false;
}

function disableActionButtons() {
    document.querySelector('[data-action="add"]').disabled = true;
    document.querySelector('[data-action="save"]').disabled = true;
    document.querySelector('[data-action="cancel"]').disabled = true;
}

/**
 * Show status message with snackbar
 */
function showStatus(msg, type = 'info') {
    // Create or get snackbar container
    let container = document.getElementById('snackbarContainer');
    if (!container) {
        container = document.createElement('div');
        container.id = 'snackbarContainer';
        container.className = 'snackbar-container';
        document.body.appendChild(container);
    }

    // Create snackbar element
    const snackbar = document.createElement('div');
    snackbar.className = `snackbar snackbar-${type}`;
    
    // Add icon based on type
    const icons = {
        success: '✓',
        error: '✕',
        warning: '⚠',
        info: 'ℹ'
    };
    
    snackbar.innerHTML = `
        <span class="snackbar-icon">${icons[type] || icons.info}</span>
        <span class="snackbar-message">${msg}</span>
    `;
    
    container.appendChild(snackbar);
    
    // Trigger animation
    setTimeout(() => snackbar.classList.add('show'), 10);
    
    // Remove after delay
    setTimeout(() => {
        snackbar.classList.remove('show');
        setTimeout(() => snackbar.remove(), 300);
    }, 4000);
}
