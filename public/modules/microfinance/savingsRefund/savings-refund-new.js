const savingsRefundData = [{centerId: 'C001', centerName: 'Main Center', groupId: 'G001', groupName: 'Unity Group', clientId: 'CLI001', clientName: 'John Doe', exitDate: '2025-01-15', exitReason: 'Graduation', nextOfKin: 'Unknown', unclaimedAmount: 5000, osUnclaimed: 1000, transactionType: 'transfer', accountType: 'customer', accountId: 'ACC001', accountName: 'John Savings', narration: 'Savings refund on exit', transactionAmount: 4000}];
let currentData = null, editMode = false, currentSearchContext = null, servicesReady = false;

// Context for passing to search dialogs
const parentContext = {
    branchId: '0603',
    centerId: '',
    groupId: ''
};

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', function() {
    setupEventListeners();
    initializeServices();
});

// Setup event listeners
function setupEventListeners() {
    // Search buttons
    document.querySelectorAll('[data-search]').forEach(btn => {
        btn.addEventListener('click', handleSearchClick);
    });

    // Listen for messages from search dialogs
    window.addEventListener('message', handleSearchMessage);

    // Enter key and blur handlers for ID fields - direct lookup without dialogs
    setupFieldListeners('centerId', handleCenterLookup);
    setupFieldListeners('groupId', handleGroupLookup);
    setupFieldListeners('clientId', handleClientLookup);
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

// Initialize services
async function initializeServices() {
    if (window.ServiceLoader) {
        try {
            await window.ServiceLoader.loadCore();
            await window.ServiceLoader.loadScript('../../../assets/js/services/shared/lookupService.js');
            await window.ServiceLoader.loadScript('../../../assets/js/services/shared/searchService.js');
            await window.ServiceLoader.loadScript('../../../assets/js/services/microfinance/groupService.js');
            
            servicesReady = true;
            console.log('[Savings Refund] Services loaded successfully');
            console.log('[Savings Refund] LookupService available:', !!window.LookupService);
        } catch (error) {
            console.error('[Savings Refund] Error loading services:', error);
            showStatus('Failed to load required services', 'error');
        }
    } else {
        console.error('[Savings Refund] ServiceLoader not found');
        showStatus('ServiceLoader not available', 'error');
    }
}

/**
 * Ensure services are loaded before using them
 */
async function ensureServicesLoaded() {
    if (servicesReady && window.LookupService) {
        return true;
    }
    
    if (!servicesReady) {
        console.log('[Savings Refund] Services not ready, initializing...');
        await initializeServices();
    }
    
    if (!window.LookupService) {
        console.error('[Savings Refund] LookupService still not available after initialization');
        return false;
    }
    
    return true;
}

// Handle search button clicks
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
    }
}

// Open Center Search Dialog
function openCenterSearch() {
    console.log('[Savings Refund] Opening center search dialog');
    currentSearchContext = 'center';

    const modal = document.getElementById('centerSearchModal');
    const iframe = document.getElementById('centerSearchFrame');
    const modalTitle = document.getElementById('centerSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        console.error('[Savings Refund] Center search modal elements not found');
        return;
    }

    modalTitle.textContent = 'Center Search';
    iframe.src = `../../common/searchDialogs/group-search/group-search.html?context=center&branch=0603`;

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    console.log('[Savings Refund] Center search dialog opened');
}

// Open Group Search Dialog (uses subgroup search)
function openGroupSearch() {
    const centerId = document.getElementById('centerId').value.trim();
    
    if (!centerId) {
        showStatus('Please select a Center first', 'error');
        return;
    }

    console.log('[Savings Refund] Opening subgroup search dialog');
    currentSearchContext = 'group';

    const modal = document.getElementById('groupSearchModal');
    const iframe = document.getElementById('groupSearchFrame');
    const modalTitle = document.getElementById('groupSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        console.error('[Savings Refund] Group search modal elements not found');
        return;
    }

    modalTitle.textContent = 'Sub Group Search';
    iframe.src = `../../common/searchDialogs/subgroup-search/subgroup-search.html`;

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    console.log('[Savings Refund] Subgroup search dialog opened');
}

// Open Client Search Dialog
function openClientSearch() {
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

    console.log('[Savings Refund] Opening exited client search dialog');

    const modal = document.getElementById('clientSearchModal');
    const iframe = document.getElementById('clientSearchFrame');
    const modalTitle = document.getElementById('clientSearchModalLabel');

    if (!modal || !iframe || !modalTitle) {
        console.error('[Savings Refund] Client search modal elements not found');
        return;
    }

    modalTitle.textContent = 'Exited Client Search';
    iframe.src = `../../common/searchDialogs/group-exited-client-search/group-exited-client-search.html?branch=0603&centerId=${centerId}&groupId=${groupId}`;

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();

    console.log('[Savings Refund] Exited client search dialog opened');
}

// Handle messages from search dialogs
function handleSearchMessage(event) {
    const { type, context } = event.data;

    switch (type) {
        case 'GROUP_SELECTED':
            // Handle based on context from message
            if (context === 'center') {
                console.log('[Savings Refund] Center selected:', event.data);
                document.getElementById('centerId').value = event.data.groupId || '';
                document.getElementById('centerName').value = event.data.groupName || '';
                
                // Update parent context for subgroup search
                parentContext.centerId = event.data.groupId || '';
                
                // Clear dependent fields
                clearGroupFields();
                clearClientFields();
                
                closeCenterSearchModal();
            }
            // Reset context
            currentSearchContext = null;
            break;

        case 'SUBGROUP_SELECTED':
            // Handle subgroup selection (for group field)
            console.log('[Savings Refund] Subgroup selected:', event.data);
            document.getElementById('groupId').value = event.data.subGroupId || '';
            document.getElementById('groupName').value = event.data.subGroupName || '';
            
            // Update parent context for exited client search
            parentContext.groupId = event.data.subGroupId || '';
            
            // Clear dependent fields
            clearClientFields();
            
            closeGroupSearchModal();
            break;

        case 'EXITED_CLIENT_SELECTED':
            // Handle exited client selection
            console.log('[Savings Refund] Exited client selected:', event.data);
            document.getElementById('clientId').value = event.data.clientId || '';
            document.getElementById('clientName').value = event.data.clientName || '';
            
            // Populate exit details if available
            if (event.data.exitDate) document.getElementById('exitDate').value = event.data.exitDate;
            if (event.data.exitReason) document.getElementById('exitReason').value = event.data.exitReason;
            if (event.data.nextOfKin) document.getElementById('nextOfKin').value = event.data.nextOfKin;
            if (event.data.unclaimedAmount) document.getElementById('unclaimedAmount').value = event.data.unclaimedAmount;
            if (event.data.osUnclaimed) document.getElementById('osUnclaimed').value = event.data.osUnclaimed;
            
            closeClientSearchModal();
            break;

        case 'CLIENT_SELECTED':
            // Handle regular client selection (for backwards compatibility)
            console.log('[Savings Refund] Client selected:', event.data);
            document.getElementById('clientId').value = event.data.clientId || '';
            document.getElementById('clientName').value = event.data.clientName || '';
            
            closeClientSearchModal();
            
            // Load client exit data
            handleClientLookup();
            break;

        case 'kairo-dataentry-close':
        case 'kairo-search-close':
            // Close any open modals
            closeCenterSearchModal();
            closeGroupSearchModal();
            closeClientSearchModal();
            // Reset context
            currentSearchContext = null;
            break;
    }
}

// Close modal functions
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

// Clear field functions
function clearGroupFields() {
    document.getElementById('groupId').value = '';
    document.getElementById('groupName').value = '';
}

function clearClientFields() {
    document.getElementById('clientId').value = '';
    document.getElementById('clientName').value = '';
}

// Direct lookup functions
async function handleCenterLookup() {
    const centerId = document.getElementById('centerId').value.trim();
    
    if (!centerId) return;
    
    // If same as current, no need to reload
    if (centerId === parentContext.centerId) return;

    try {
        // Ensure services are loaded
        const servicesAvailable = await ensureServicesLoaded();
        if (!servicesAvailable) {
            showStatus('Services not available', 'error');
            return;
        }

        // API call using LookupService
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

        console.log('[Savings Refund] Center lookup payload:', payload);

        const result = await window.LookupService.getSearchResult(payload);

        console.log('[Savings Refund] Center lookup result:', result);

        if (result && result.success && result.data) {
            const centers = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            if (centers && centers.length > 0) {
                const center = centers.find(c => c.GroupID === centerId) || centers[0];
                
                document.getElementById('centerName').value = center.GroupName || '';
                parentContext.centerId = center.GroupID;
                parentContext.centerName = center.GroupName;
                
                // Clear dependent fields
                clearGroupFields();
                clearClientFields();
                
                showStatus('Center loaded successfully', 'success');
            } else {
                document.getElementById('centerName').value = '';
                showStatus(`Center '${centerId}' not found`, 'error');
            }
        } else {
            document.getElementById('centerName').value = '';
            showStatus(`Center '${centerId}' not found`, 'error');
        }
    } catch (error) {
        console.error('[Savings Refund] Error loading center:', error);
        document.getElementById('centerName').value = '';
        showStatus('Error loading center details', 'error');
    }
}

async function handleGroupLookup() {
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
            showStatus('Services not available', 'error');
            return;
        }

        // API call using LookupService
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

        console.log('[Savings Refund] Group lookup payload:', payload);
        console.log('[Savings Refund] Using centerId from context:', centerId);

        const result = await window.LookupService.getSearchResult(payload);

        console.log('[Savings Refund] Group lookup result:', result);

        if (result && result.success && result.data) {
            const groups = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            if (groups && groups.length > 0) {
                const group = groups.find(g => g.SubGroupID === groupId) || groups[0];
                
                document.getElementById('groupName').value = group.SubGroupName || '';
                parentContext.groupId = group.SubGroupID;
                parentContext.groupName = group.SubGroupName;
                
                // Clear dependent fields
                clearClientFields();
                
                showStatus('Group loaded successfully', 'success');
            } else {
                document.getElementById('groupName').value = '';
                showStatus(`Group '${groupId}' not found`, 'error');
            }
        } else {
            document.getElementById('groupName').value = '';
            showStatus(`Group '${groupId}' not found`, 'error');
        }
    } catch (error) {
        console.error('[Savings Refund] Error loading group:', error);
        document.getElementById('groupName').value = '';
        showStatus('Error loading group details', 'error');
    }
}

async function handleClientLookup() {
    const clientId = document.getElementById('clientId').value.trim();
    
    if (!clientId) return;

    // Check sample data first
    const data = savingsRefundData.find(s => s.clientId === clientId);
    if (data) {
        loadForm(data);
        currentData = JSON.parse(JSON.stringify(data));
        showStatus('Client data loaded successfully', 'success');
        return;
    }

    // Try API lookup if no sample data - using group exited client search
    try {
        // Ensure services are loaded
        const servicesAvailable = await ensureServicesLoaded();
        if (!servicesAvailable) {
            showStatus('Services not available', 'error');
            return;
        }

        const centerId = document.getElementById('centerId').value.trim();
        const groupId = document.getElementById('groupId').value.trim();
        
        if (!centerId || !groupId) {
            showStatus('Please select Center and Group first', 'error');
            return;
        }


        // API call using LookupService for GroupExitedClientID
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

        console.log('[Savings Refund] Exited client lookup payload:', payload);

        const result = await window.LookupService.getSearchResult(payload);

        console.log('[Savings Refund] Exited client lookup result:', result);

        if (result && result.success && result.data) {
            const clients = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            if (clients && clients.length > 0) {
                const client = clients.find(c => c.GroupExitedClientID === clientId || c.ClientID === clientId) || clients[0];
                
                document.getElementById('clientName').value = client.GroupExitedClientName || client.ClientName || '';
                showStatus('Exited client loaded successfully', 'success');
            } else {
                document.getElementById('clientName').value = '';
                showStatus(`Exited client '${clientId}' not found`, 'error');
            }
        } else {
            document.getElementById('clientName').value = '';
            showStatus(`Exited client '${clientId}' not found`, 'error');
        }
    } catch (error) {
        console.error('[Savings Refund] Error loading exited client:', error);
        document.getElementById('clientName').value = '';
        showStatus('Error loading exited client details', 'error');
    }
}

// Legacy functions for backwards compatibility
function handleCenterSearch() { openCenterSearch(); }
function handleGroupSearch() { openGroupSearch(); }
function handleClientSearch() { openClientSearch(); }
function handleTransactionTypeChange() { const type = document.getElementById('transactionType').value; if (type === 'transfer') { document.getElementById('accountType').disabled = false; document.getElementById('accountId').disabled = false; } else { document.getElementById('accountType').disabled = true; document.getElementById('accountId').disabled = true; } }
function handleAccountSearch() { showStatus('Lookup (Account) is a UI stub', 'info'); }
function loadForm(data) { 
    document.getElementById('centerId').value = data.centerId; 
    document.getElementById('centerName').value = data.centerName || '';
    document.getElementById('groupId').value = data.groupId; 
    document.getElementById('groupName').value = data.groupName || '';
    document.getElementById('clientId').value = data.clientId; 
    document.getElementById('clientName').value = data.clientName || '';
    document.getElementById('exitDate').value = data.exitDate; 
    document.getElementById('exitReason').value = data.exitReason; 
    document.getElementById('nextOfKin').value = data.nextOfKin; 
    document.getElementById('unclaimedAmount').value = data.unclaimedAmount; 
    document.getElementById('osUnclaimed').value = data.osUnclaimed; 
    document.getElementById('transactionType').value = data.transactionType; 
    document.getElementById('accountType').value = data.accountType; 
    document.getElementById('accountId').value = data.accountId; 
    document.getElementById('accountName').value = data.accountName; 
    document.getElementById('narration').value = data.narration; 
    document.getElementById('transactionAmount').value = data.transactionAmount; 
}
function handleView() {
    const centerId = document.getElementById('centerId').value.trim();
    const groupId = document.getElementById('groupId').value.trim();
    const clientId = document.getElementById('clientId').value.trim();
    
    if (!centerId || !groupId || !clientId) {
        showStatus('Please fill all client details (Center, Group, and Client)', 'error');
        return;
    }
    
    if (!currentData) {
        showStatus('No data found for this client', 'error');
        return;
    }
    
    showStatus(`Viewing refund data for client '${currentData.clientName}'`, 'success');
}
function handleIdentification() { showStatus('Identification functionality - to be implemented', 'info'); }
function handleAdd() { clearForm(); editMode = true; showStatus('Add mode enabled', 'info'); }
function handleSave() { if (!document.getElementById('clientId').value) { showStatus('Client ID required', 'error'); return; } showStatus('Refund saved', 'success'); editMode = false; }
function handleCancel() { clearForm(); }
function clearForm() { 
    document.getElementById('centerId').value = ''; 
    document.getElementById('centerName').value = '';
    document.getElementById('groupId').value = ''; 
    document.getElementById('groupName').value = '';
    document.getElementById('clientId').value = ''; 
    document.getElementById('clientName').value = '';
    document.getElementById('exitDate').value = ''; 
    document.getElementById('exitReason').value = ''; 
    document.getElementById('nextOfKin').value = ''; 
    document.getElementById('unclaimedAmount').value = ''; 
    document.getElementById('osUnclaimed').value = ''; 
    document.getElementById('transactionType').value = ''; 
    document.getElementById('accountType').value = ''; 
    document.getElementById('accountId').value = ''; 
    document.getElementById('accountName').value = ''; 
    document.getElementById('narration').value = ''; 
    document.getElementById('transactionAmount').value = ''; 
    showStatus('Cancelled', 'info'); 
}


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

document.addEventListener('DOMContentLoaded', () => { 
    const style = document.createElement('style'); 
    style.textContent = `
        .input-group-icon { 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            width: 32px; 
            height: 32px; 
            margin-left: -35px; 
            color: var(--text-gray); 
            cursor: pointer; 
        }
        
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
