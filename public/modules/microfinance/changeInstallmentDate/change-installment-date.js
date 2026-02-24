/**
 * Change Installment Date Module
 * Handles branch, center, and scheme search, installment date changes
 */

// State management
let currentBranch = null;
let currentCenter = null;
let currentScheme = null;
let installmentsData = [];
let editMode = false;

// Context for passing to search dialogs
const parentContext = {
    branchId: '',
    centerId: '',
    centerName: '',
    schemeId: ''
};

/**
 * Initialize the module
 */
document.addEventListener('DOMContentLoaded', async function() {
    await initializeServices();
    setupEventListeners();
    initializeDefaultValues();
});

/**
 * Load required services
 */
async function initializeServices() {
    if (window.ServiceLoader) {
        try {
            await window.ServiceLoader.loadCore();
            await window.ServiceLoader.loadScript('../../../assets/js/services/shared/lookupService.js');
            await window.ServiceLoader.loadScript('../../../assets/js/services/microfinance/groupService.js');
            console.log('[Change Installment Date] Services loaded successfully');
        } catch (error) {
            console.error('[Change Installment Date] Error loading services:', error);
            showStatus('Failed to load required services', 'error');
        }
    }
}

/**
 * Initialize default values
 */
function initializeDefaultValues() {
    // Set default branch from form values
    const branchId = document.getElementById('BranchId')?.value || '0101';
    const branchName = document.getElementById('BranchName')?.value || 'Head Office';
    
    parentContext.branchId = branchId;
    
    // Initialize change mode (default is 'holiday', so disable Day of Week)
    handleChangeModeChange();
    
    // Initially disable save button
    setSaveButtonState(false);
    
    console.log('[Change Installment Date] Initialized with branch:', branchId, branchName);
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

    // Generate button
    const generateBtn = document.querySelector('.btn-generate');
    if (generateBtn) {
        generateBtn.addEventListener('click', handleGenerate);
    }

    // Enter key handlers
    document.getElementById('BranchId')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleViewBranch();
        }
    });

    document.getElementById('CenterId')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleViewCenter();
        }
    });

    document.getElementById('SchemeId')?.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            handleViewScheme();
        }
    });

    // Blur handlers - fetch details when clicking outside or tabbing away
    document.getElementById('BranchId')?.addEventListener('blur', (e) => {
        const branchId = e.target.value.trim();
        if (branchId && branchId !== parentContext.branchId) {
            handleViewBranch();
        }
    });

    document.getElementById('CenterId')?.addEventListener('blur', (e) => {
        const centerId = e.target.value.trim();
        if (centerId && centerId !== parentContext.centerId) {
            handleViewCenter();
        }
    });

    document.getElementById('SchemeId')?.addEventListener('blur', (e) => {
        const schemeId = e.target.value.trim();
        if (schemeId && schemeId !== parentContext.schemeId) {
            handleViewScheme();
        }
    });

    // Radio button change
    document.querySelectorAll('input[name="ChangeMode"]').forEach(radio => {
        radio.addEventListener('change', handleChangeModeChange);
    });

    // Status close button
    document.querySelector('.status-close')?.addEventListener('click', () => {
        document.getElementById('statusMessage').classList.add('hidden');
    });

    // Listen for messages from search dialogs
    window.addEventListener('message', handleSearchMessage);
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
        case 'scheme':
            openSchemeSearch();
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
}

/**
 * Open Branch Search Dialog
 */
function openBranchSearch() {
    console.log('[Change Installment Date] Opening branch search dialog');
    openSearchDialog('../../common/searchDialogs/branch-search/branch-search.html', 'Branch Search');
    console.log('[Change Installment Date] Branch search dialog opened');
}

/**
 * Open Center Search Dialog
 */
function openCenterSearch() {
    const branchId = document.getElementById('BranchId').value.trim();
    
    if (!branchId) {
        showStatus('Please select a Branch first', 'error');
        return;
    }

    console.log('[Change Installment Date] Opening center search dialog');
    openSearchDialog(`../../common/searchDialogs/group-search/group-search.html?context=center&branch=${branchId}`, 'Center Search');
    console.log('[Change Installment Date] Center search dialog opened');
}

/**
 * Open Scheme Search Dialog
 */
function openSchemeSearch() {
    const centerId = document.getElementById('CenterId').value.trim();
    
    if (!centerId) {
        showStatus('Please select a Center first', 'error');
        return;
    }

    console.log('[Change Installment Date] Opening scheme search dialog');
    openSearchDialog('../../common/searchDialogs/group-loan-scheme-search/group-loan-scheme-search.html', 'Loan Scheme Search');
    console.log('[Change Installment Date] Scheme search dialog opened');
}

/**
 * Unified Search Dialog opener
 */
function openSearchDialog(url, title) {
    const modal = document.getElementById('searchModal');
    const iframe = document.getElementById('searchModalFrame');
    const modalTitle = document.getElementById('searchModalTitle');

    if (!modal || !iframe || !modalTitle) {
        console.error('[Change Installment Date] Search modal elements not found');
        return;
    }

    modalTitle.textContent = title;
    // Append noheader=1 to hide iframe's internal header (parent modal provides header)
    const separator = url.includes('?') ? '&' : '?';
    iframe.src = url + separator + 'noheader=1';

    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

/**
 * Handle messages from search dialogs
 */
function handleSearchMessage(event) {
    const { type } = event.data;

    switch (type) {
        case 'BRANCH_SELECTED':
            console.log('[Change Installment Date] Branch selected:', event.data);
            document.getElementById('BranchId').value = event.data.branchId || '';
            document.getElementById('BranchName').value = event.data.branchName || '';
            
            parentContext.branchId = event.data.branchId || '';
            currentBranch = event.data.data || event.data;
            
            // Clear dependent fields
            clearCenterFields();
            clearSchemeFields();
            
            closeSearchModal();
            showStatus(`Branch '${event.data.branchName}' selected`, 'success');
            break;

        case 'GROUP_SELECTED':
            // Handle based on context - could be center or subgroup selection
            if (event.data.context === 'center') {
                // Center selected from group-search dialog
                console.log('[Change Installment Date] Center selected:', event.data);
                document.getElementById('CenterId').value = event.data.groupId || '';
                document.getElementById('CenterName').value = event.data.groupName || '';
                
                parentContext.centerId = event.data.groupId || '';
                parentContext.centerName = event.data.groupName || '';
                currentCenter = event.data.data || event.data;
                
                // Clear dependent fields
                clearSchemeFields();
                
                closeSearchModal();
                showStatus(`Center '${event.data.groupName}' selected`, 'success');
            }
            break;

        case 'GROUP_LOAN_SCHEME_SELECTED':
            // Scheme selected
            console.log('[Change Installment Date] Scheme selected:', event.data);
            document.getElementById('SchemeId').value = event.data.schemeId || '';
            document.getElementById('SchemeName').value = event.data.schemeName || '';
            
            parentContext.schemeId = event.data.schemeId || '';
            currentScheme = event.data.data || event.data;
            
            closeSearchModal();
            showStatus(`Scheme '${event.data.schemeName}' selected`, 'success');
            break;

        case 'kairo-dataentry-close':
        case 'kairo-search-close':
            // Close the search modal
            closeSearchModal();
            break;
    }
}

/**
 * Close search modal
 */
function closeSearchModal() {
    const modal = document.getElementById('searchModal');
    if (modal) {
        const bsModal = bootstrap.Modal.getInstance(modal);
        if (bsModal) bsModal.hide();
    }
}

/**
 * Clear center fields
 */
function clearCenterFields() {
    document.getElementById('CenterId').value = '';
    document.getElementById('CenterName').value = '';
    parentContext.centerId = '';
    parentContext.centerName = '';
    currentCenter = null;
    setSaveButtonState(false); // Disable save when center changes
}

/**
 * Clear scheme fields
 */
function clearSchemeFields() {
    document.getElementById('SchemeId').value = '';
    document.getElementById('SchemeName').value = '';
    parentContext.schemeId = '';
    currentScheme = null;
    setSaveButtonState(false); // Disable save when scheme changes
}

/**
 * Handle View Branch action
 */
async function handleViewBranch() {
    const branchId = document.getElementById('BranchId').value.trim();
    
    if (!branchId) {
        showStatus('Please enter a Branch ID', 'error');
        return;
    }

    try {
        showStatus('Loading branch details...', 'info');

        if (!window.LookupService) {
            showStatus('LookupService not available', 'error');
            return;
        }

        const result = await window.LookupService.getBranches({ BankID: "00" });

        if (result.success) {
            const branches = Array.isArray(result.data) ? result.data : (result.Details || []);
            const branch = branches.find(b => b.OurBranchID === branchId);

            if (branch) {
                document.getElementById('BranchName').value = branch.BranchName || '';
                parentContext.branchId = branch.OurBranchID;
                currentBranch = branch;
                showStatus(`Branch '${branch.BranchName}' loaded`, 'success');
            } else {
                showStatus('Branch not found', 'error');
            }
        } else {
            showStatus('Branch not found', 'error');
        }
    } catch (error) {
        console.error('[Change Installment Date] Error loading branch:', error);
        showStatus('Error loading branch details', 'error');
    }
}

/**
 * Handle View Center action
 */
async function handleViewCenter() {
    const centerId = document.getElementById('CenterId').value.trim();
    
    if (!centerId) {
        showStatus('Please enter a Center ID', 'error');
        return;
    }

    try {
        showStatus('Loading center details...', 'info');

        if (!window.LookupService) {
            showStatus('LookupService not available', 'error');
            return;
        }

        const payload = {
            TableID: 'GroupID',
            OurBranchID: parentContext.branchId || '0101',
            WhereStmt: `GroupID='${centerId}'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: '',
            OperatorID: 'CSADM',
            ModuleID: 5060,
            SearchKey: null,
            LanguageID: 'en'
        };

        const result = await window.LookupService.getSearchResult(payload);

        if (result.success && result.data) {
            const groups = Array.isArray(result.data) ? result.data : (result.data.Details || result.Details || []);
            const center = groups.find(g => g.GroupID === centerId);

            if (center) {
                document.getElementById('CenterName').value = center.GroupName || '';
                parentContext.centerId = center.GroupID;
                parentContext.centerName = center.GroupName;
                currentCenter = center;
                showStatus(`Center '${center.GroupName}' loaded`, 'success');
            } else {
                showStatus('Center not found', 'error');
            }
        } else {
            showStatus('Center not found', 'error');
        }
    } catch (error) {
        console.error('[Change Installment Date] Error loading center:', error);
        showStatus('Error loading center details', 'error');
    }
}

/**
 * Handle View Scheme action
 */
async function handleViewScheme() {
    const schemeId = document.getElementById('SchemeId').value.trim();
    
    if (!schemeId) {
        showStatus('Please enter a Scheme ID', 'error');
        return;
    }

    try {
        showStatus('Loading scheme details...', 'info');

        if (!window.LookupService) {
            showStatus('LookupService not available', 'error');
            return;
        }

        const payload = {
            TableID: 'GroupDefaultSchemeID',
            WhereStmt: `LoanSchemeID='${schemeId}'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: "SchemeTypeID = 'P'",
            OperatorID: 'CSADM',
            ModuleID: 5060,
            OurBranchID: parentContext.branchId || '0101',
            SearchKey: null,
            LanguageID: 'en'
        };

        const result = await window.LookupService.getSearchResult(payload);

        if (result.success && result.data) {
            const schemes = result.data.Details || result.Details || [];
            const scheme = schemes.find(s => s.LoanSchemeID === schemeId);

            if (scheme) {
                document.getElementById('SchemeName').value = scheme.Description || '';
                parentContext.schemeId = scheme.LoanSchemeID;
                currentScheme = scheme;
                showStatus(`Scheme '${scheme.Description}' loaded`, 'success');
            } else {
                showStatus('Scheme not found', 'error');
            }
        } else {
            showStatus('Scheme not found', 'error');
        }
    } catch (error) {
        console.error('[Change Installment Date] Error loading scheme:', error);
        showStatus('Error loading scheme details', 'error');
    }
}

/**
 * Handle change mode radio change
 */
function handleChangeModeChange() {
    const mode = document.querySelector('input[name="ChangeMode"]:checked')?.value;
    console.log('[Change Installment Date] Change mode:', mode);
    
    const dateField = document.getElementById('InstallmentDate');
    const dayOfWeekField = document.getElementById('DayOfWeek');
    
    if (mode === 'holiday') {
        // For holiday marking, we need the date, disable day of week
        if (dateField) dateField.disabled = false;
        if (dayOfWeekField) {
            dayOfWeekField.disabled = true;
            dayOfWeekField.value = '--Select--';
        }
    } else if (mode === 'meeting') {
        // For changing meeting day, we need the day of week, disable date
        if (dateField) {
            dateField.disabled = true;
            dateField.value = '';
        }
        if (dayOfWeekField) dayOfWeekField.disabled = false;
    }
}

/**
 * Handle Generate button
 */
async function handleGenerate() {
    const branchId = document.getElementById('BranchId').value.trim();
    const centerId = document.getElementById('CenterId').value.trim();
    const schemeId = document.getElementById('SchemeId').value.trim();
    
    if (!centerId) {
        showStatus('Please select a Center first', 'error');
        return;
    }

    if (!schemeId) {
        showStatus('Please select a Scheme first', 'error');
        return;
    }

    const mode = document.querySelector('input[name="ChangeMode"]:checked')?.value;
    const installmentDate = document.getElementById('InstallmentDate').value;
    const dayOfWeek = document.getElementById('DayOfWeek').value;

    if (mode === 'holiday' && !installmentDate) {
        showStatus('Please select a Date', 'error');
        return;
    }

    if (mode === 'meeting' && (!dayOfWeek || dayOfWeek === '--Select--')) {
        showStatus('Please select a Day of Week', 'error');
        return;
    }

    showStatus('Generating installments...', 'info');

    try {
        if (!window.GroupService) {
            showStatus('GroupService not available', 'error');
            return;
        }

        // Map day of week to smallint (0=Sunday, 1=Monday, etc.)
        const dayOfWeekMap = {
            'Sunday': 0,
            'Monday': 1,
            'Tuesday': 2,
            'Wednesday': 3,
            'Thursday': 4,
            'Friday': 5,
            'Saturday': 6
        };

        const requestData = {
            OurBranchID: branchId || '0603',
            GroupID: centerId,
            LoanSchemeID: schemeId,
            HoliDayDate: mode === 'holiday' ? installmentDate : null,
            DayOfWeek: mode === 'meeting' ? dayOfWeekMap[dayOfWeek] : null,
            OperatorID: 'CSADM'
        };

        console.log('[Change Installment Date] Generating with payload:', requestData);

        const result = await window.GroupService.getGroupLoanInstDateChange(requestData);

        console.log('[Change Installment Date] Generate result:', result);

        if (result.success) {
            const data = result.data?.Details || result.data || [];
            installmentsData = Array.isArray(data) ? data : [];
            
            renderInstallmentsTable(installmentsData);
            setSaveButtonState(true); // Enable save button on success
            showStatus(`Generated ${installmentsData.length} installment(s)`, 'success');
        } else {
            // Show error response as snackbar
            const errorMessage = result.message || result.error || 'Failed to generate installments';
            showStatus(errorMessage, 'error');
            setSaveButtonState(false); // Keep save button disabled on error
        }
    } catch (error) {
        console.error('[Change Installment Date] Error generating installments:', error);
        showStatus('Error generating installments', 'error');
        setSaveButtonState(false); // Disable save button on error
    }
}

/**
 * Render installments table
 */
function renderInstallmentsTable(data) {
    const tbody = document.querySelector('.data-table tbody');
    
    if (!data || data.length === 0) {
        tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No records to display.</td></tr>';
        return;
    }

    tbody.innerHTML = data.map(item => `
        <tr>
            <td>${formatDate(item.ActualInstDate) || item.ActualInstDate || '-'}</td>
            <td>${formatDate(item.NewInstDate) || item.NewInstDate || '-'}</td>
            <td>${formatAmount(item.ExpectedAmount) || item.ExpectedAmount || '-'}</td>
        </tr>
    `).join('');
}

/**
 * Format date for display
 */
function formatDate(dateStr) {
    if (!dateStr) return null;
    try {
        const date = new Date(dateStr);
        if (isNaN(date.getTime())) return dateStr;
        return date.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    } catch {
        return dateStr;
    }
}

/**
 * Format amount for display
 */
function formatAmount(amount) {
    if (amount === null || amount === undefined) return null;
    const num = parseFloat(amount);
    if (isNaN(num)) return amount;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Handle View action
 */
function handleView() {
    const centerId = document.getElementById('CenterId').value.trim();
    const schemeId = document.getElementById('SchemeId').value.trim();
    
    if (!centerId || !schemeId) {
        showStatus('Please select Center and Scheme first', 'error');
        return;
    }

    showStatus(`Viewing installment data for Center '${centerId}', Scheme '${schemeId}'`, 'info');
}

/**
 * Handle Edit action
 */
function handleEdit() {
    editMode = !editMode;
    setEditMode(editMode);
    showStatus(editMode ? 'Edit mode enabled' : 'Edit mode disabled', 'info');
}

/**
 * Handle Delete action
 */
function handleDelete() {
    if (!currentScheme) {
        showStatus('Please select a scheme first', 'error');
        return;
    }

    showStatus('Delete functionality - API integration pending', 'warning');
}

/**
 * Handle Save action
 */
function handleSave() {
    if (!currentCenter || !currentScheme) {
        showStatus('Please fill required fields', 'error');
        return;
    }

    showStatus('Save functionality - API integration pending', 'warning');
}

/**
 * Handle Cancel action
 */
function handleCancel() {
    // Reset fields
    document.getElementById('BranchId').value = '0101';
    document.getElementById('BranchName').value = 'Head Office';
    clearCenterFields();
    clearSchemeFields();
    
    document.getElementById('Description').value = '';
    document.getElementById('InstallmentDate').value = '';
    document.getElementById('DayOfWeek').value = '--Select--';
    document.getElementById('ProductId').value = '';
    document.getElementById('Currency').value = '';
    
    // Reset table
    const tbody = document.querySelector('.data-table tbody');
    tbody.innerHTML = '<tr class="empty-row"><td colspan="3">No records to display.</td></tr>';
    
    // Reset state
    currentCenter = null;
    currentScheme = null;
    installmentsData = [];
    editMode = false;
    
    // Disable save button
    setSaveButtonState(false);
    
    showStatus('Cancelled', 'info');
}

/**
 * Set edit mode for form fields
 */
function setEditMode(enabled) {
    document.getElementById('Description').disabled = !enabled;
    document.getElementById('InstallmentDate').disabled = !enabled;
    document.getElementById('DayOfWeek').disabled = !enabled;
}

/**
 * Set save button state
 */
function setSaveButtonState(enabled) {
    const saveBtn = document.querySelector('[data-action="save"]');
    if (saveBtn) {
        saveBtn.disabled = !enabled;
        saveBtn.style.opacity = enabled ? '1' : '0.5';
    }
}

/**
 * Show status message
 */
function showStatus(message, type = 'info') {
    const statusEl = document.getElementById('statusMessage');
    const textEl = statusEl.querySelector('.status-text');
    const iconEl = statusEl.querySelector('i');

    textEl.textContent = message;
    
    // Reset classes
    statusEl.classList.remove('hidden', 'success', 'error', 'warning', 'info');
    statusEl.classList.add(type);

    // Update icon
    switch (type) {
        case 'success':
            iconEl.className = 'bi bi-check-circle';
            break;
        case 'error':
            iconEl.className = 'bi bi-exclamation-circle';
            break;
        case 'warning':
            iconEl.className = 'bi bi-exclamation-triangle';
            break;
        default:
            iconEl.className = 'bi bi-info-circle';
    }

    // Auto-hide after 4 seconds
    setTimeout(() => {
        statusEl.classList.add('hidden');
    }, 4000);
}
