/**
 * Center Loan Disbursement Reversal Module
 * Handles branch, center, group, and scheme search with disbursement reversal operations
 */

// Sample data for Disbursement Reversal
const disbursalData = [
    {
        branchId: '0101',
        centerId: 'C001',
        groupId: 'G001',
        schemeId: 'S001',
        loanAccounts: [
            { clientId: 'CLI001', clientName: 'Ahmed Mohamed', appId: 'APP001', loanAcctId: 'LOAN001', loanAmount: 50000, disbursedAmount: 50000, disbursedBy: 'OFF001' },
            { clientId: 'CLI002', clientName: 'Fatima Hassan', appId: 'APP002', loanAcctId: 'LOAN002', loanAmount: 40000, disbursedAmount: 40000, disbursedBy: 'OFF001' }
        ],
        reason: '',
        remarks: '',
        productId: 'PROD001',
        currencyId: 'KES'
    }
];

let currentData = null;
let editMode = false;
let servicesReady = false;
let currentAccounts = [];

// SearchModal instance for group search
let groupSearchModal = null;

// SearchModal instances for branch/center/scheme search (to match Group lookup UX)
let branchSearchModal = null;
let centerSearchModal = null;
let schemeSearchModal = null;

// Session helpers (match working SearchModal implementations like CPIW)
const getSession = () => window.getAuthSession?.() || {};

function getOperatorId() {
    const session = getSession();
    return (
        session?.operatorId ||
        session?.OperatorID ||
        session?.name ||
        session?.Name ||
        window.Environment?.OperatorID ||
        window.CurrentUser?.OperatorID ||
        'CSADM'
    );
}

function getLoggedBranchId() {
    const session = getSession();
    return (
        session?.branchId ||
        session?.BranchID ||
        window.Environment?.OurBranchID ||
        window.Environment?.branchId ||
        ''
    );
}

function getOurBranchIdForLookup() {
    const fromField = String(document.getElementById('branchId')?.value || '').trim();
    return fromField || getLoggedBranchId() || '0101';
}

function escapeSqlString(value) {
    return String(value ?? '').replace(/'/g, "''");
}

// Context for passing to search dialogs
const parentContext = {
    branchId: '',
    centerId: '',
    centerName: '',
    groupId: '',
    groupName: '',
    schemeId: ''
};

/**
 * Initialize the module
 */
document.addEventListener('DOMContentLoaded', async function() {
    await initializeServices();
    setupEventListeners();
    initializeDefaultValues();
    applyInitialUiState();
});

/**
 * Load required services
 */
async function initializeServices() {
    if (window.ServiceLoader) {
        try {
            await window.ServiceLoader.loadCore();
            // Prefer ServiceLoader helpers when available; fall back to explicit script paths.
            if (window.ServiceLoader.loadSearchService) {
                await window.ServiceLoader.loadSearchService();
            } else {
                await window.ServiceLoader.loadScript('../../../assets/js/services/shared/searchService.js');
            }

            // SearchModal isn't wrapped by ServiceLoader, load it directly (relative + absolute fallback)
            try {
                await window.ServiceLoader.loadScript('../../../assets/js/shared/search-modal.js');
            } catch {
                await window.ServiceLoader.loadScript('/assets/js/shared/search-modal.js');
            }

            if (window.ServiceLoader.loadLookupService) {
                await window.ServiceLoader.loadLookupService();
            } else {
                await window.ServiceLoader.loadScript('../../../assets/js/services/shared/lookupService.js');
            }

            // MicrofinanceService (for View action)
            try {
                await window.ServiceLoader.loadScript('../../../assets/js/services/microfinance/microfinanceService.js');
            } catch {
                await window.ServiceLoader.loadScript('/assets/js/services/microfinance/microfinanceService.js');
            }

            // Optional (kept for parity with older code paths)
            try {
                await window.ServiceLoader.loadScript('../../../assets/js/services/microfinance/groupService.js');
            } catch {
                // ignore if not present/needed for this page
            }

            servicesReady = !!(window.SearchModal && window.SearchService && window.LookupService);
            console.log('[Disbursement Reversal] Services loaded successfully', {
                SearchModal: !!window.SearchModal,
                SearchService: !!window.SearchService,
                LookupService: !!window.LookupService,
                MicrofinanceService: !!window.MicrofinanceService,
                baseUrlCommon: window.Environment?.baseUrlCommon
            });
        } catch (error) {
            console.error('[Disbursement Reversal] Error loading services:', error);
            showStatus('Failed to load required services', 'error');
            servicesReady = false;
        }
    }
}

async function ensureSearchModalServicesLoaded() {
    if (window.SearchModal && window.SearchService && window.LookupService) {
        servicesReady = true;
        return true;
    }

    await initializeServices();
    servicesReady = !!(window.SearchModal && window.SearchService && window.LookupService);
    return servicesReady;
}

// Backward-compatible alias used by existing blur/enter view handlers
async function ensureServicesLoaded() {
    return ensureSearchModalServicesLoaded();
}

/**
 * Initialize default values
 */
function initializeDefaultValues() {
    const branchId = document.getElementById('branchId')?.value || '0101';
    parentContext.branchId = branchId;
    console.log('[Disbursement Reversal] Initialized with branch:', branchId);
}

/**
 * Setup all event listeners
 */
function setupEventListeners() {
    // Search buttons
    document.querySelectorAll('[data-search]').forEach(btn => {
        btn.addEventListener('click', handleSearchClick);
    });

    // Enter key and blur handlers for ID fields
    setupFieldListeners('branchId', handleViewBranch);
    setupFieldListeners('centerId', handleViewCenter);
    setupFieldListeners('groupId', handleViewGroup);
    setupFieldListeners('schemeId', handleViewScheme);

    // Status close button
    document.querySelector('.status-close')?.addEventListener('click', () => {
        document.getElementById('statusMessage').classList.add('hidden');
    });

    // Listen for messages from search dialogs
    window.addEventListener('message', handleSearchMessage);

    // Action panel buttons
    document.querySelectorAll('.action-button[data-action]').forEach(btn => {
        btn.addEventListener('click', () => {
            const action = btn.dataset.action;
            switch (action) {
                case 'view':
                    handleView();
                    break;
                case 'edit':
                    handleEdit();
                    break;
                case 'delete':
                    handleDelete();
                    break;
                case 'save':
                    handleSave();
                    break;
                case 'cancel':
                    handleCancel();
                    break;
            }
        });
    });
}

function setActionButtonEnabled(action, enabled) {
    const btn = document.querySelector(`.action-button[data-action="${action}"]`);
    if (!btn) return;
    btn.disabled = !enabled;
    btn.classList.toggle('disabled', !enabled);
}

function setLookupControlsEnabled(enabled) {
    ['branchId', 'centerId', 'groupId', 'schemeId'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.disabled = !enabled;
    });

    document.querySelectorAll('button[data-search]').forEach(btn => {
        btn.disabled = !enabled;
    });
}

function applyInitialUiState() {
    // Default state on form load: View enabled; Edit/Save/Cancel disabled.
    setLookupControlsEnabled(true);
    setActionButtonEnabled('view', true);
    setActionButtonEnabled('edit', false);
    setActionButtonEnabled('save', false);
    setActionButtonEnabled('cancel', false);
    setActionButtonEnabled('delete', false);

    editMode = false;
    setEditMode(false);
    setGridSelectionEnabled(false);
}

function bindBehindTheScene(details01 = [], details = []) {
    const bts = Array.isArray(details01) ? details01[0] : null;
    if (bts) {
        document.getElementById('productId').value = bts.ProductID || '';
        document.getElementById('currencyId').value = bts.CurrencyID || '';
        document.getElementById('disbursementType').value = bts.GrpDisbType || '';
    }

    // Prefer first detail row for reversal type display
    const first = Array.isArray(details) ? details[0] : null;
    if (first) {
        document.getElementById('reversalType').value = first.ReversalType || '';
    }
}

function bindReversalDetailsToGrid(details) {
    const rows = Array.isArray(details) ? details : [];
    const accounts = rows.map(r => ({
        clientId: r.ClientID,
        clientName: r.ClientName,
        appId: r.ApplicationID,
        loanAcctId: r.LoanAccountID,
        loanAmount: r.LoanAmount,
        disbursedAmount: r.DisbursedAmount,
        disbursedBy: r.DisbursedBy,
        raw: r
    }));
    loadLoanAccountsTable(accounts);
}

/**
 * Setup enter key and blur listeners for a field
 */
function setupFieldListeners(fieldId, handler) {
    const field = document.getElementById(fieldId);
    if (!field) return;

    field.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handler();
        }
    });

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
        case 'branch':
            openBranchSearch();
            break;
        case 'center':
            openCenterSearch();
            break;
        case 'group':
            openGroupSearch();
            break;
        case 'scheme':
            openSchemeSearch();
            break;
    }
}

// ═══════════════════════════════════════════════════════════════
// SEARCH DIALOG FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function openBranchSearch() {
    // migrated to SearchModal (async)
    return openBranchSearchModal();
}

async function openBranchSearchModal() {
    console.log('[Disbursement Reversal] Opening branch search');

    try {
        const ok = await ensureSearchModalServicesLoaded();
        if (!ok || !window.SearchModal || !window.SearchService) {
            throw new Error('Search modal services not loaded');
        }

        if (!branchSearchModal) {
            branchSearchModal = new window.SearchModal({
                prefix: 'cldr-branch',
                moduleID: '4560',
                getOperatorId,
                getOurBranchId: getOurBranchIdForLookup,
                onError: (err) => {
                    console.error('[CLDR] Branch search error:', err);
                    showStatus('Failed to open branch search', 'error');
                }
            });
        }

        await branchSearchModal.open({
            title: 'Branch Search',
            tableID: 'BranchID',
            whereStmt: '',
            advFilterString: '',
            autoCloseOnRowClick: true,
            searchFields: [
                // NOTE: Branch search returns OurBranchID as the branch identifier (see working CPIW config)
                { label: 'Branch ID', name: 'OurBranchID', column: 'OurBranchID' },
                { label: 'Branch Name', name: 'BranchName', column: 'BranchName' }
            ],
            displayFields: [
                { key: 'OurBranchID', label: 'Branch ID' },
                { key: 'BranchName', label: 'Branch Name' },
                { key: 'CurrencyID', label: 'Currency ID' }
            ],
            onSelect: (record) => {
                const rowKeys = Object.keys(record || {});
                const pick = (k) => {
                    const actual = rowKeys.find(rk => rk.toLowerCase() === String(k).toLowerCase());
                    return actual ? record[actual] : '';
                };

                const branchId = String(pick('OurBranchID') || pick('BranchID') || '').trim();
                const branchName = String(pick('BranchName') || '').trim();
                if (!branchId) {
                    showStatus('Invalid branch selection', 'warning');
                    return;
                }

                document.getElementById('branchId').value = branchId;
                document.getElementById('branchName').value = branchName;
                parentContext.branchId = branchId;

                // Clear dependent fields
                clearCenterFields();
                clearGroupFields();
                clearSchemeFields();

                showStatus(`Branch '${branchName || branchId}' selected`, 'success');
            }
        });
    } catch (error) {
        console.error('❌ Branch search init failed:', error);
        showStatus('Service not available. Please refresh the page.', 'error');
    }
}

function openCenterSearch() {
    const branchId = document.getElementById('branchId').value.trim();
    
    if (!branchId) {
        showStatus('Please select a Branch first', 'error');
        return;
    }

    // migrated to SearchModal (async)
    return openCenterSearchModal(branchId);
}

async function openCenterSearchModal(branchId) {
    console.log('[Disbursement Reversal] Opening center search');

    try {
        const ok = await ensureSearchModalServicesLoaded();
        if (!ok || !window.SearchModal || !window.SearchService) {
            throw new Error('Search modal services not loaded');
        }

        if (!centerSearchModal) {
            centerSearchModal = new window.SearchModal({
                prefix: 'cldr-center',
                moduleID: '4560',
                getOperatorId,
                getOurBranchId: getOurBranchIdForLookup,
                onError: (err) => {
                    console.error('[CLDR] Center search error:', err);
                    showStatus('Failed to open center search', 'error');
                }
            });
        }

        // Match known-working behavior: do not over-filter centers by branch to avoid empty results
        const advFilterString = '';

        await centerSearchModal.open({
            title: 'Center Search',
            tableID: 'GroupID',
            whereStmt: '',
            advFilterString,
            autoCloseOnRowClick: true,
            searchFields: [
                { label: 'Center ID', name: 'GroupID', column: 'GroupID' },
                { label: 'Center Name', name: 'GroupName', column: 'GroupName' }
            ],
            displayFields: [
                { key: 'GroupID', label: 'Center ID' },
                { key: 'GroupName', label: 'Center Name' },
                { key: 'OurBranchID', label: 'Branch ID' }
            ],
            onSelect: (record) => {
                const rowKeys = Object.keys(record || {});
                const pick = (k) => {
                    const actual = rowKeys.find(rk => rk.toLowerCase() === String(k).toLowerCase());
                    return actual ? record[actual] : '';
                };

                const centerId = String(pick('GroupID') || '').trim();
                const centerName = String(pick('GroupName') || '').trim();
                if (!centerId) {
                    showStatus('Invalid center selection', 'warning');
                    return;
                }

                document.getElementById('centerId').value = centerId;
                document.getElementById('centerName').value = centerName;
                parentContext.centerId = centerId;
                parentContext.centerName = centerName;

                // Clear dependent fields
                clearGroupFields();
                clearSchemeFields();

                showStatus(`Center '${centerName || centerId}' selected`, 'success');
            }
        });
    } catch (error) {
        console.error('❌ Center search init failed:', error);
        showStatus('Service not available. Please refresh the page.', 'error');
    }
}

async function openGroupSearch() {
    const centerId = document.getElementById('centerId').value.trim();
    
    if (!centerId) {
        showStatus('Please select a Center first', 'error');
        return;
    }

    try {
        const ok = await ensureSearchModalServicesLoaded();
        if (!ok || !window.SearchModal || !window.SearchService) {
            throw new Error('Search modal services not loaded');
        }

        if (!groupSearchModal) {
            groupSearchModal = new window.SearchModal({
                prefix: 'cldr-group',
                moduleID: '4560',
                getOperatorId,
                getOurBranchId: getOurBranchIdForLookup,
                onError: (err) => {
                    console.error('[CLDR] Group search error:', err);
                    showStatus('Failed to open group search', 'error');
                }
            });
        }

        const branchId = String(document.getElementById('branchId')?.value || '').trim() || '0101';
        // Correct filter (see subgroup-search-modal.js): OurBranchID + GroupID
        const advFilterString = `OurBranchID='${escapeSqlString(branchId)}' AND GroupID='${escapeSqlString(centerId)}'`;

        await groupSearchModal.open({
            title: 'Search Groups',
            tableID: 'SubGroupID',
            whereStmt: '',
            advFilterString: advFilterString,
            autoCloseOnRowClick: true,
            searchFields: [
                { label: 'Group ID', name: 'SubGroupID', column: 'SubGroupID' },
                { label: 'Group Name', name: 'SubGroupName', column: 'SubGroupName' }
            ],
            displayFields: [
                { key: 'SubGroupID', label: 'Group ID' },
                { key: 'SubGroupName', label: 'Group Name' }
            ],
            onSelect: (record) => {
                const rowKeys = Object.keys(record || {});
                const pick = (k) => {
                    const actual = rowKeys.find(rk => rk.toLowerCase() === String(k).toLowerCase());
                    return actual ? record[actual] : '';
                };

                const groupId = String(pick('SubGroupID') || '').trim();
                const groupName = String(pick('SubGroupName') || '').trim();
                if (!groupId) {
                    showStatus('Invalid group selection', 'warning');
                    return;
                }
                
                document.getElementById('groupId').value = groupId;
                document.getElementById('groupName').value = groupName;
                parentContext.groupId = groupId;
                parentContext.groupName = groupName;
                showStatus(`Selected Group: ${groupId} - ${groupName}`, 'success');
            }
        });
    } catch (error) {
        console.error('❌ Group search init failed:', error);
        showStatus('Service not available. Please refresh the page.', 'error');
    }
}

function openSchemeSearch() {
    const centerId = document.getElementById('centerId').value.trim();
    
    if (!centerId) {
        showStatus('Please select a Center first', 'error');
        return;
    }

    // migrated to SearchModal (async)
    return openSchemeSearchModal();
}

async function openSchemeSearchModal() {
    const branchId = document.getElementById('branchId')?.value?.trim() || '';
    const centerId = document.getElementById('centerId')?.value?.trim() || '';

    if (!centerId) {
        showStatus('Please select a Center first', 'error');
        return;
    }

    try {
        const ok = await ensureSearchModalServicesLoaded();
        if (!ok || !window.SearchModal || !window.SearchService) {
            throw new Error('Search modal services not loaded');
        }

        if (!schemeSearchModal) {
            schemeSearchModal = new window.SearchModal({
                prefix: 'cldr-scheme',
                moduleID: '4560',
                getOperatorId,
                // Scheme search must use the selected BranchId as OurBranchID
                getOurBranchId: getOurBranchIdForLookup,
                onError: (err) => {
                    console.error('[CLDR] Scheme search error:', err);
                    showStatus('Failed to open scheme search', 'error');
                }
            });
        }

        const advFilterString = `GroupID = '${escapeSqlString(centerId)}' AND OurBranchID = '${escapeSqlString(branchId)}'`;

        await schemeSearchModal.open({
            title: 'Loan Scheme Search',
            tableID: 'GroupLoanSchemeID',
            whereStmt: '',
            advFilterString,
            autoCloseOnRowClick: true,
            searchFields: [
                // Match working CPIW config/returned columns for GroupLoanSchemeID table
                { label: 'Scheme ID', name: 'LoanSchemeID', column: 'LoanSchemeID' },
                { label: 'Description', name: 'Description', column: 'Description' }
            ],
            displayFields: [
                { key: 'LoanSchemeID', label: 'Scheme ID' },
                { key: 'Description', label: 'Description' }
            ],
            onSelect: (record) => {
                const rowKeys = Object.keys(record || {});
                const pick = (k) => {
                    const actual = rowKeys.find(rk => rk.toLowerCase() === String(k).toLowerCase());
                    return actual ? record[actual] : '';
                };

                const schemeId = String(pick('LoanSchemeID') || '').trim();
                const schemeName = String(pick('Description') || '').trim();
                if (!schemeId) {
                    showStatus('Invalid scheme selection', 'warning');
                    return;
                }

                document.getElementById('schemeId').value = schemeId;
                document.getElementById('schemeName').value = schemeName;
                parentContext.schemeId = schemeId;

                showStatus(`Scheme '${schemeName || schemeId}' selected`, 'success');
                loadLoanAccountsForScheme(schemeId);
            }
        });
    } catch (error) {
        console.error('❌ Scheme search init failed:', error);
        showStatus('Service not available. Please refresh the page.', 'error');
    }
}

/**
 * Handle messages from search dialogs
 */
function handleSearchMessage(event) {
    const { type } = event.data;

    switch (type) {
        case 'BRANCH_SELECTED':
            console.log('[Disbursement Reversal] Branch selected:', event.data);
            document.getElementById('branchId').value = event.data.branchId || '';
            document.getElementById('branchName').value = event.data.branchName || '';
            
            parentContext.branchId = event.data.branchId || '';
            
            // Clear dependent fields
            clearCenterFields();
            clearGroupFields();
            clearSchemeFields();
            
            closeBranchSearchModal();
            showStatus(`Branch '${event.data.branchName}' selected`, 'success');
            break;

        case 'GROUP_SELECTED':
            // Center selected from group-search dialog
            console.log('[Disbursement Reversal] Center selected:', event.data);
            document.getElementById('centerId').value = event.data.groupId || '';
            document.getElementById('centerName').value = event.data.groupName || '';
            
            parentContext.centerId = event.data.groupId || '';
            parentContext.centerName = event.data.groupName || '';
            
            // Clear dependent fields
            clearGroupFields();
            clearSchemeFields();
            
            closeCenterSearchModal();
            showStatus(`Center '${event.data.groupName}' selected`, 'success');
            break;

        case 'SUBGROUP_SELECTED':
            // Group selected from subgroup-search dialog
            console.log('[Disbursement Reversal] Group selected:', event.data);
            document.getElementById('groupId').value = event.data.subgroupId || '';
            document.getElementById('groupName').value = event.data.subgroupName || '';
            
            parentContext.groupId = event.data.subgroupId || '';
            parentContext.groupName = event.data.subgroupName || '';
            
            closeGroupSearchModal();
            showStatus(`Group '${event.data.subgroupName}' selected`, 'success');
            break;

        case 'GROUP_LOAN_SCHEME_SELECTED':
            // Scheme selected
            console.log('[Disbursement Reversal] Scheme selected:', event.data);
            document.getElementById('schemeId').value = event.data.schemeId || '';
            document.getElementById('schemeName').value = event.data.schemeName || '';
            
            parentContext.schemeId = event.data.schemeId || '';
            
            closeSchemeSearchModal();
            showStatus(`Scheme '${event.data.schemeName}' selected`, 'success');
            
            // Load loan accounts for this scheme
            loadLoanAccountsForScheme(event.data.schemeId);
            break;

        case 'kairo-dataentry-close':
        case 'kairo-search-close':
            closeBranchSearchModal();
            closeCenterSearchModal();
            closeGroupSearchModal();
            closeSchemeSearchModal();
            break;
    }
}

// ═══════════════════════════════════════════════════════════════
// MODAL CLOSE FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function closeBranchSearchModal() {
    if (branchSearchModal?.close) {
        branchSearchModal.close();
        return;
    }

    const modal = document.getElementById('branchSearchModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
}

function closeCenterSearchModal() {
    if (centerSearchModal?.close) {
        centerSearchModal.close();
        return;
    }

    const modal = document.getElementById('centerSearchModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
}

function closeGroupSearchModal() {
    if (groupSearchModal?.close) {
        groupSearchModal.close();
        return;
    }

    const modal = document.getElementById('groupSearchModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
}

function closeSchemeSearchModal() {
    if (schemeSearchModal?.close) {
        schemeSearchModal.close();
        return;
    }

    const modal = document.getElementById('schemeSearchModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
}

// ═══════════════════════════════════════════════════════════════
// CLEAR FIELD FUNCTIONS
// ═══════════════════════════════════════════════════════════════

function clearCenterFields() {
    document.getElementById('centerId').value = '';
    document.getElementById('centerName').value = '';
    parentContext.centerId = '';
    parentContext.centerName = '';
}

function clearGroupFields() {
    document.getElementById('groupId').value = '';
    document.getElementById('groupName').value = '';
    parentContext.groupId = '';
    parentContext.groupName = '';
}

function clearSchemeFields() {
    document.getElementById('schemeId').value = '';
    document.getElementById('schemeName').value = '';
    parentContext.schemeId = '';
}

// ═══════════════════════════════════════════════════════════════
// VIEW FIELD FUNCTIONS (on blur/enter)
// ═══════════════════════════════════════════════════════════════

async function handleViewBranch() {
    const branchId = document.getElementById('branchId').value.trim();
    
    if (!branchId || branchId === parentContext.branchId) return;

    try {
        // Ensure services are loaded
        const servicesAvailable = await ensureServicesLoaded();
        if (!servicesAvailable) {
            showStatus('Services not available', 'error');
            return;
        }

        showStatus('Loading branch details...', 'info');

        // API call using LookupService
        const payload = {
            TableID: 'BranchID',
            OurBranchID: branchId,
            WhereStmt: `OurBranchID='${branchId}'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: '',
            OperatorID: window.CurrentUser?.OperatorID || 'CSADM',
            ModuleID: 5060,
            SearchKey: null,
            LanguageID: 'en'
        };

        console.log('[Disbursement Reversal] Branch lookup payload:', payload);

        const result = await window.LookupService.getSearchResult(payload);

        console.log('[Disbursement Reversal] Branch lookup result:', result);

        if (result && result.success && result.data) {
            const branches = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            if (branches && branches.length > 0) {
                const branch = branches.find(b => b.OurBranchID === branchId) || branches[0];
                
                document.getElementById('branchName').value = branch.BranchName || '';
                parentContext.branchId = branch.OurBranchID;
                
                // Clear dependent fields
                clearCenterFields();
                clearGroupFields();
                clearSchemeFields();
                
                showStatus('Branch loaded successfully', 'success');
            } else {
                document.getElementById('branchName').value = '';
                showStatus(`Branch '${branchId}' not found`, 'error');
            }
        } else {
            document.getElementById('branchName').value = '';
            showStatus(`Branch '${branchId}' not found`, 'error');
        }
    } catch (error) {
        console.error('[Disbursement Reversal] Error loading branch:', error);
        document.getElementById('branchName').value = '';
        showStatus('Error loading branch details', 'error');
    }
}

async function handleViewCenter() {
    const centerId = document.getElementById('centerId').value.trim();
    
    if (!centerId || centerId === parentContext.centerId) return;

    try {
        // Ensure services are loaded
        const servicesAvailable = await ensureServicesLoaded();
        if (!servicesAvailable) {
            showStatus('Services not available', 'error');
            return;
        }

        showStatus('Loading center details...', 'info');

        // API call using LookupService
        const payload = {
            TableID: 'GroupID',
            OurBranchID: parentContext.branchId || '0101',
            WhereStmt: `GroupID='${centerId}'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: `OurBranchID='${parentContext.branchId || '0101'}'`,
            OperatorID: window.CurrentUser?.OperatorID || 'CSADM',
            ModuleID: 5060,
            SearchKey: null,
            LanguageID: 'en'
        };

        console.log('[Disbursement Reversal] Center lookup payload:', payload);

        const result = await window.LookupService.getSearchResult(payload);

        console.log('[Disbursement Reversal] Center lookup result:', result);

        if (result && result.success && result.data) {
            const centers = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            if (centers && centers.length > 0) {
                const center = centers.find(c => c.GroupID === centerId) || centers[0];
                
                document.getElementById('centerName').value = center.GroupName || '';
                parentContext.centerId = center.GroupID;
                parentContext.centerName = center.GroupName;
                
                // Clear dependent fields
                clearGroupFields();
                clearSchemeFields();
                
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
        console.error('[Disbursement Reversal] Error loading center:', error);
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
            showStatus('Services not available', 'error');
            return;
        }

        showStatus('Loading group details...', 'info');

        // API call using LookupService
        const payload = {
            TableID: 'SubGroupID',
            OurBranchID: parentContext.branchId || '0101',
            WhereStmt: `SubGroupID='${groupId}'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: `GroupID='${centerId}'`,
            OperatorID: window.CurrentUser?.OperatorID || 'CSADM',
            ModuleID: 5060,
            SearchKey: null,
            LanguageID: 'en'
        };

        console.log('[Disbursement Reversal] Group lookup payload:', payload);
        console.log('[Disbursement Reversal] Using centerId from context:', centerId);

        const result = await window.LookupService.getSearchResult(payload);

        console.log('[Disbursement Reversal] Group lookup result:', result);

        if (result && result.success && result.data) {
            const groups = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            if (groups && groups.length > 0) {
                const group = groups.find(g => g.SubGroupID === groupId) || groups[0];
                
                document.getElementById('groupName').value = group.SubGroupName || '';
                parentContext.groupId = group.SubGroupID;
                parentContext.groupName = group.SubGroupName;
                
                // Clear dependent fields
                clearSchemeFields();
                
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
        console.error('[Disbursement Reversal] Error loading group:', error);
        document.getElementById('groupName').value = '';
        showStatus('Error loading group details', 'error');
    }
}

async function handleViewScheme() {
    const schemeId = document.getElementById('schemeId').value.trim();
    
    if (!schemeId || schemeId === parentContext.schemeId) return;

    // Check sample data first
    const data = disbursalData.find(d => d.schemeId === schemeId);
    if (data) {
        loadForm(data);
        currentData = JSON.parse(JSON.stringify(data));
        loadLoanAccountsTable(data.loanAccounts);
        parentContext.schemeId = schemeId;
        showStatus(`Loan accounts loaded for scheme '${schemeId}'`, 'success');
        return;
    }

    // Try API lookup if no sample data
    try {
        // Ensure services are loaded
        const servicesAvailable = await ensureServicesLoaded();
        if (!servicesAvailable) {
            showStatus('Services not available', 'error');
            return;
        }

        showStatus('Loading scheme details...', 'info');

        // API call using LookupService
        const payload = {
            TableID: 'GroupLoanSchemeID',
            OurBranchID: parentContext.branchId || '0101',
            WhereStmt: `GroupLoanSchemeID='${schemeId}'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: '',
            OperatorID: window.CurrentUser?.OperatorID || 'CSADM',
            ModuleID: 5060,
            SearchKey: null,
            LanguageID: 'en'
        };

        console.log('[Disbursement Reversal] Scheme lookup payload:', payload);

        const result = await window.LookupService.getSearchResult(payload);

        console.log('[Disbursement Reversal] Scheme lookup result:', result);

        if (result && result.success && result.data) {
            const schemes = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            if (schemes && schemes.length > 0) {
                const scheme = schemes.find(s => s.GroupLoanSchemeID === schemeId) || schemes[0];
                
                document.getElementById('schemeName').value = scheme.GroupLoanSchemeName || scheme.SchemeName || '';
                parentContext.schemeId = scheme.GroupLoanSchemeID;
                
                showStatus('Scheme loaded successfully', 'success');
            } else {
                document.getElementById('schemeName').value = '';
                showStatus(`Scheme '${schemeId}' not found`, 'error');
            }
        } else {
            document.getElementById('schemeName').value = '';
            showStatus(`Scheme '${schemeId}' not found`, 'error');
        }
    } catch (error) {
        console.error('[Disbursement Reversal] Error loading scheme:', error);
        document.getElementById('schemeName').value = '';
        showStatus('Error loading scheme details', 'error');
    }
}

// ═══════════════════════════════════════════════════════════════
// FORM OPERATIONS
// ═══════════════════════════════════════════════════════════════

function loadLoanAccountsForScheme(schemeId) {
    const data = disbursalData.find(d => d.schemeId === schemeId);
    if (!data) {
        showStatus(`No loan accounts found for scheme '${schemeId}'`, 'info');
        return;
    }
    
    loadForm(data);
    currentData = JSON.parse(JSON.stringify(data));
    loadLoanAccountsTable(data.loanAccounts);
}

function loadForm(data) {
    document.getElementById('branchId').value = data.branchId || '';
    document.getElementById('centerId').value = data.centerId || '';
    document.getElementById('groupId').value = data.groupId || '';
    document.getElementById('schemeId').value = data.schemeId || '';
    document.getElementById('cancellationReason').value = data.reason || '';
    document.getElementById('remarks').value = data.remarks || '';
    document.getElementById('productId').value = data.productId || '';
    document.getElementById('currencyId').value = data.currencyId || '';
}

function loadLoanAccountsTable(accounts) {
    const tbody = document.querySelector('#loanAccountsTable tbody');
    currentAccounts = Array.isArray(accounts) ? accounts : [];
    if (!accounts || accounts.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="8">No records to display</td></tr>';
        return;
    }
    tbody.innerHTML = accounts.map((a, i) => `
        <tr>
            <td><input type="checkbox" value="${i}" data-allow-reversal="${a?.raw?.AllowReversal ?? a?.allowReversal ?? a?.AllowReversal ?? ''}" onchange="handleRowSelect(event)"></td>
            <td>${a.clientId || ''}</td>
            <td>${a.clientName || ''}</td>
            <td>${a.appId || ''}</td>
            <td>${a.loanAcctId || ''}</td>
            <td class="text-end">${a.loanAmount ?? ''}</td>
            <td class="text-end">${a.disbursedAmount ?? ''}</td>
            <td>${a.disbursedBy || ''}</td>
        </tr>
    `).join('');
}

function handleSelectAll() {
    const selectAll = document.getElementById('selectAll');
    const all = !!selectAll?.checked;
    const rowCheckboxes = Array.from(document.querySelectorAll('#loanAccountsTable input[type="checkbox"]:not(#selectAll)'));

    if (!editMode) {
        if (selectAll) selectAll.checked = false;
        return;
    }

    let blocked = 0;
    rowCheckboxes.forEach(cb => {
        if (!all) {
            cb.checked = false;
            return;
        }

        const allow = cb.dataset.allowReversal;
        if (isReversalAllowed(allow)) {
            cb.checked = true;
        } else {
            cb.checked = false;
            blocked++;
        }
    });

    if (blocked > 0) {
        showStatus('Reversal Not Allowed', 'error');
    }

    updateActionButtons();
}

function handleRowSelect(evt) {
    if (editMode) {
        const cb = evt?.target;
        if (cb && cb.checked) {
            const allow = cb.dataset.allowReversal;
            if (!isReversalAllowed(allow)) {
                cb.checked = false;
                showStatus('Reversal Not Allowed', 'error');
            }
        }
    }

    updateActionButtons();
}

function isReversalAllowed(value) {
    if (value === true) return true;
    if (value === false || value == null) return false;
    if (typeof value === 'number') return value === 1;

    const s = String(value).trim().toLowerCase();
    return s === '1' || s === 'true' || s === 'tru';
}

function escapeXml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildLoanRevAppListXml(selectedRows) {
    const items = selectedRows.map(r => {
        const appId = r.ApplicationID ?? r.applicationId;
        const loanSeries = r.LoanSeries ?? r.loanSeries;
        const reversalTypeId = r.ReversalTypeID ?? r.reversalTypeId;
        const trxDate = r.DisbursedDate ?? r.TrxDate ?? r.disbursedDate;
        const loanAccountId = r.LoanAccountID ?? r.loanAcctId ?? r.LoanAcctId;

        return (
            `<dt_GroupLoanReversals>` +
            `<ApplicationID>${escapeXml(appId)}</ApplicationID>` +
            `<LoanSeries>${escapeXml(loanSeries)}</LoanSeries>` +
            `<ReversalTypeID>${escapeXml(reversalTypeId)}</ReversalTypeID>` +
            `<TrxDate>${escapeXml(trxDate)}</TrxDate>` +
            `<TrxBatchID>0</TrxBatchID>` +
            `<LoanAccountID>${escapeXml(loanAccountId)}</LoanAccountID>` +
            `</dt_GroupLoanReversals>`
        );
    }).join('');

    // Ensure valid XML document (single root)
    return `<NewDataSet>${items}</NewDataSet>`;
}

function setGridSelectionEnabled(enabled) {
    const selectAll = document.getElementById('selectAll');
    if (selectAll) selectAll.disabled = !enabled;
    document.querySelectorAll('#loanAccountsTable input[type="checkbox"]:not(#selectAll)').forEach(cb => {
        cb.disabled = !enabled;
    });
}

function updateActionButtons() {
    const checked = document.querySelectorAll('#loanAccountsTable input[type="checkbox"]:not(#selectAll):checked').length;
    // Enable save button when at least one row is selected
    console.log(`[Disbursement Reversal] ${checked} row(s) selected`);
}

async function handleView() {
    const branchId = String(document.getElementById('branchId')?.value || '').trim();
    const centerId = String(document.getElementById('centerId')?.value || '').trim();
    const groupId = String(document.getElementById('groupId')?.value || '').trim();
    const schemeId = String(document.getElementById('schemeId')?.value || '').trim();

    if (!branchId || !centerId || !groupId || !schemeId) {
        showStatus('Branch ID, Center ID, Group ID and Scheme ID are required', 'error');
        return;
    }

    const ok = await ensureSearchModalServicesLoaded();
    if (!ok) {
        showStatus('Services not available. Please refresh the page.', 'error');
        return;
    }

    // Ensure MicrofinanceService exists
    if (!window.MicrofinanceService) {
        try {
            await window.ServiceLoader?.loadScript?.('../../../assets/js/services/microfinance/microfinanceService.js');
        } catch {
            // ignore
        }
    }

    if (!window.MicrofinanceService?.viewCenterLoanDisbursementReversal) {
        showStatus('MicrofinanceService.viewCenterLoanDisbursementReversal not available', 'error');
        return;
    }

    try {
        showStatus('Loading loan reversals...', 'info');

        const requestData = {
            OurBranchID: branchId,
            GroupID: centerId,
            LoanSchemeID: schemeId,
            OperatorID: getOperatorId()
        };

        const resp = await window.MicrofinanceService.viewCenterLoanDisbursementReversal(requestData);

        if (!resp?.success) {
            showStatus(resp?.message || 'Request failed', 'error');
            return;
        }

        // Some procedures return Status/Message even when HTTP succeeded
        const data = resp?.data;
        const status = data?.Status;
        if (status !== undefined && !(status === '00' || status === '0' || status === 0)) {
            showStatus(data?.Message || resp?.message || 'Request failed', 'error');
            return;
        }

        const details = data?.Details || resp?.Details || [];
        const details01 = data?.Details01 || [];

        bindReversalDetailsToGrid(details);
        bindBehindTheScene(details01, details);

        // Lock lookups and set button states as requested
        setLookupControlsEnabled(false);
        setActionButtonEnabled('view', false);
        setActionButtonEnabled('save', false);
        setActionButtonEnabled('edit', true);
        setActionButtonEnabled('cancel', true);
        setActionButtonEnabled('delete', false);

        // View-only: disable grid selection until Edit
        setGridSelectionEnabled(false);

        editMode = false;
        setEditMode(false);

        // Ensure edit fields are disabled until Edit is clicked
        editMode = false;
        setEditMode(false);

        currentData = {
            branchId,
            centerId,
            groupId,
            schemeId,
            details,
            details01
        };

        showStatus('Loaded loan reversals successfully', 'success');
    } catch (err) {
        console.error('[CLDR] View failed:', err);
        showStatus(err?.message || 'View failed', 'error');
    }
}

function handleEdit() {
    if (!currentData) {
        showStatus('Click View first', 'error');
        return;
    }

    if (editMode) {
        // Already editing; ignore repeat clicks
        return;
    }

    editMode = true;
    setEditMode(true);

    // Enable edit workflow
    setActionButtonEnabled('save', true);
    setActionButtonEnabled('cancel', true);
    setActionButtonEnabled('edit', false);
    setGridSelectionEnabled(true);

    showStatus('Edit mode enabled', 'info');
}

function handleDelete() {
    if (!currentData) {
        showStatus('Load scheme first', 'error');
        return;
    }
    showStatus('Disbursement deleted', 'error');
    clearForm();
}

async function handleSave() {
    if (!editMode) {
        showStatus('Click Edit first', 'error');
        return;
    }

    const reasonId = String(document.getElementById('cancellationReason')?.value || '').trim();
    if (!reasonId) {
        showStatus('Select cancellation reason', 'error');
        return;
    }

    const checkedBoxes = Array.from(document.querySelectorAll('#loanAccountsTable input[type="checkbox"]:not(#selectAll):checked'));
    if (checkedBoxes.length === 0) {
        showStatus('Select loan account(s) to reverse', 'error');
        return;
    }

    const ok = await ensureSearchModalServicesLoaded();
    if (!ok) {
        showStatus('Services not available. Please refresh the page.', 'error');
        return;
    }

    // Ensure MicrofinanceService exists
    if (!window.MicrofinanceService) {
        try {
            await window.ServiceLoader?.loadScript?.('../../../assets/js/services/microfinance/microfinanceService.js');
        } catch {
            // ignore
        }
    }

    if (!window.MicrofinanceService?.saveCenterLoanDisburseReversal) {
        showStatus('MicrofinanceService.saveCenterLoanDisburseReversal not available', 'error');
        return;
    }

    const branchId = String(document.getElementById('branchId')?.value || '').trim();
    const centerId = String(document.getElementById('centerId')?.value || '').trim();
    const schemeId = String(document.getElementById('schemeId')?.value || '').trim();
    const remarks = String(document.getElementById('remarks')?.value || '').trim();

    const selectedRows = checkedBoxes
        .map(cb => Number(cb.value))
        .filter(i => Number.isFinite(i) && i >= 0 && i < currentAccounts.length)
        .map(i => currentAccounts[i])
        .map(a => a?.raw || a)
        .filter(Boolean);

    if (selectedRows.length === 0) {
        showStatus('Select loan account(s) to reverse', 'error');
        return;
    }

    // Validate required XML fields exist
    const missing = selectedRows.find(r =>
        (r.ApplicationID ?? r.applicationId) == null ||
        (r.LoanSeries ?? r.loanSeries) == null ||
        (r.ReversalTypeID ?? r.reversalTypeId) == null ||
        (r.DisbursedDate ?? r.TrxDate ?? r.disbursedDate) == null ||
        (r.LoanAccountID ?? r.loanAcctId ?? r.LoanAcctId) == null
    );
    if (missing) {
        showStatus('Selected record missing required reversal fields', 'error');
        return;
    }

    const xmlData = buildLoanRevAppListXml(selectedRows);

    // Lock save while posting
    setActionButtonEnabled('save', false);
    showStatus('Saving reversal...', 'info');

    try {
        const requestData = {
            OurBranchID: branchId,
            GroupID: centerId,
            LoanSchemeID: schemeId,
            LoanRevAppList: xmlData,
            LoanReversalReasonID: reasonId,
            Remarks: remarks,
            OperatorID: getOperatorId(),
            ModuleID: 5092
        };

        const resp = await window.MicrofinanceService.saveCenterLoanDisburseReversal(requestData);

        if (!resp?.success) {
            showStatus(resp?.message || 'Request failed', 'error');
            setActionButtonEnabled('save', true);
            return;
        }

        const data = resp?.data;
        const status = data?.Status;
        if (status !== undefined && !(status === '00' || status === '0' || status === 0)) {
            showStatus(data?.Message || resp?.message || 'Error in reversal', 'error');
            setActionButtonEnabled('save', true);
            return;
        }

        const details = data?.Details || resp?.Details || [];
        const trxBatchId = details?.[0]?.TrxBatchID;

        showStatus(`Successful Reversal${trxBatchId ? ` (TrxBatchID: ${trxBatchId})` : ''}`, 'success');

        // Reset screen like Cancel
        handleCancel({ silent: true });
    } catch (err) {
        console.error('[CLDR] Save failed:', err);
        showStatus(err?.message || 'Error in reversal', 'error');
        setActionButtonEnabled('save', true);
    }
}

function handleCancel(opts) {
    // Clear all controls except Branch ID/Branch Name, restore initial UI state, focus Center ID
    const silent = !!opts?.silent;
    const branchId = document.getElementById('branchId')?.value || '0101';
    const branchName = document.getElementById('branchName')?.value || '';

    // Preserve branch fields
    document.getElementById('branchId').value = branchId;
    document.getElementById('branchName').value = branchName;

    // Clear the rest
    document.getElementById('centerId').value = '';
    document.getElementById('centerName').value = '';
    document.getElementById('groupId').value = '';
    document.getElementById('groupName').value = '';
    document.getElementById('schemeId').value = '';
    document.getElementById('schemeName').value = '';
    document.getElementById('cancellationReason').value = '';
    document.getElementById('remarks').value = '';
    document.getElementById('productId').value = '';
    document.getElementById('currencyId').value = '';
    const reversalType = document.getElementById('reversalType');
    if (reversalType) reversalType.value = '';
    const disbursementType = document.getElementById('disbursementType');
    if (disbursementType) disbursementType.value = '';

    // Reset grid
    document.querySelector('#loanAccountsTable tbody').innerHTML = '<tr class="empty-row"><td colspan="8">No records to display</td></tr>';
    const selectAll = document.getElementById('selectAll');
    if (selectAll) selectAll.checked = false;

    // Reset context, preserve branch
    parentContext.branchId = branchId;
    parentContext.centerId = '';
    parentContext.centerName = '';
    parentContext.groupId = '';
    parentContext.groupName = '';
    parentContext.schemeId = '';
    currentData = null;

    // Restore requested UI state
    applyInitialUiState();
    setActionButtonEnabled('view', true);

    // Focus Center ID
    document.getElementById('centerId')?.focus();

    if (!silent) {
        showStatus('Cancelled', 'info');
    }
}

function clearForm() {
    document.getElementById('branchId').value = '0101';
    document.getElementById('branchName').value = '';
    document.getElementById('centerId').value = '';
    document.getElementById('centerName').value = '';
    document.getElementById('groupId').value = '';
    document.getElementById('groupName').value = '';
    document.getElementById('schemeId').value = '';
    document.getElementById('schemeName').value = '';
    document.getElementById('cancellationReason').value = '';
    document.getElementById('remarks').value = '';
    document.getElementById('productId').value = '';
    document.getElementById('currencyId').value = '';
    
    document.querySelector('#loanAccountsTable tbody').innerHTML = '<tr class="empty-row"><td colspan="8">No records to display</td></tr>';
    document.getElementById('selectAll').checked = false;
    
    // Reset context
    parentContext.branchId = '0101';
    parentContext.centerId = '';
    parentContext.centerName = '';
    parentContext.groupId = '';
    parentContext.groupName = '';
    parentContext.schemeId = '';
    currentData = null;

    // Restore default UI state
    applyInitialUiState();
    
    showStatus('Cancelled', 'info');
}

function setEditMode(enabled) {
    document.getElementById('cancellationReason').disabled = !enabled;
    document.getElementById('remarks').disabled = !enabled;
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    const textEl = statusEl?.querySelector('.status-text');
    const iconEl = statusEl?.querySelector('i');

    if (!statusEl || !textEl) {
        // Fallback: use toast container if present, otherwise console.
        const toastContainer = document.getElementById('toastContainer');
        if (toastContainer) {
            const toastType = type === 'error' ? 'danger' : type;
            const toast = document.createElement('div');
            toast.className = `kairo-toast kairo-toast--${toastType}`;
            toast.setAttribute('role', 'status');

            toast.innerHTML = `
                <div class="kairo-toast__title">
                    <span>${toastType === 'danger' ? 'Error' : toastType === 'success' ? 'Success' : toastType === 'warning' ? 'Warning' : 'Info'}</span>
                    <button type="button" class="kairo-toast__close" aria-label="Close">&times;</button>
                </div>
                <div class="kairo-toast__body">${String(message ?? '')}</div>
            `;

            toast.querySelector('.kairo-toast__close')?.addEventListener('click', () => toast.remove());
            toastContainer.appendChild(toast);

            // Global CSS keeps toasts hidden until .is-show is added.
            requestAnimationFrame(() => toast.classList.add('is-show'));
            setTimeout(() => toast.remove(), 4500);
            return;
        }

        console.log(`[Status] ${type}: ${message}`);
        return;
    }

    textEl.textContent = message;
    
    // Reset classes
    statusEl.classList.remove('hidden', 'success', 'error', 'warning', 'info', 'danger');
    statusEl.classList.add(type === 'danger' ? 'error' : type);

    // Update icon
    if (iconEl) {
        switch (type) {
            case 'success':
                iconEl.className = 'bi bi-check-circle';
                break;
            case 'error':
            case 'danger':
                iconEl.className = 'bi bi-exclamation-circle';
                break;
            case 'warning':
                iconEl.className = 'bi bi-exclamation-triangle';
                break;
            default:
                iconEl.className = 'bi bi-info-circle';
        }
    }

    // Auto-hide after 4 seconds
    setTimeout(() => {
        statusEl.classList.add('hidden');
    }, 4000);
}
