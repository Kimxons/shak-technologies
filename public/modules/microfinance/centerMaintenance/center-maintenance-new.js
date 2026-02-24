// Sample data for Center Maintenance
const centerData = [];

// ---------------------------------------------------------------------------
// Toast helpers (aligned with modern Account Maintenance system to show
// system-level toasts like "Please close 'X' first" in a consistent style)
// ---------------------------------------------------------------------------

function ensureToastContainer() {
    // Prefer a shared Kairo toast container if it already exists
    let el = document.querySelector('[data-kairo-toast-container]');
    if (!el) {
        el = document.getElementById('toastContainer');
    }
    if (el) return el;

    // Otherwise create one (same pattern as modern-account-maintenance.js)
    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
}

function showToast(message, { title = 'Validation', variant = 'danger', timeoutMs = 9000 } = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    toast.appendChild(body);
    container.appendChild(toast);

    const remove = () => {
        try {
            toast.classList.remove('is-show');
            setTimeout(() => toast.remove(), 160);
        } catch {
            // ignore
        }
    };

    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
}

function showSystemToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
    // Limit to one toast at a time for system-level messages
    const container = ensureToastContainer();
    const existingToasts = container.querySelectorAll('.kairo-toast');
    existingToasts.forEach(t => t.remove());

    showToast(message, { title, variant, timeoutMs });
}

// Backwards-compatible helper used throughout this module
function showSnackbar(message, type = 'info') {
    console.log('[CenterMaintenance] showSnackbar:', type, message);

    let variant = 'info';
    if (type === 'success') variant = 'success';
    else if (type === 'error') variant = 'danger';
    else if (type === 'warning') variant = 'warning';

    showSystemToast(message, { title: 'Notice', variant });
}

let currentCenter = null;
let isEditMode = false;
let isAddMode = false;
let activeOfficerSearchContext = null; // Track which field triggered the officer search

function canUseSearchDialogs() {
    return isAddMode || isEditMode;
}

/**
 * Displays a success message showing the newly created center's GroupID.
 * The message appears under the Center Details section header.
 * The message persists until the form is cleared or page is refreshed.
 * @param {string} groupId - The GroupID of the newly created center
 */
function showCenterCreatedMessage(groupId) {
    const messageContainer = document.getElementById('centerCreatedMessage');
    const messageText = document.getElementById('centerCreatedText');
    
    if (messageContainer && messageText) {
        messageText.textContent = `Center created successfully, group ID: ${groupId}`;
        messageContainer.hidden = false;
        // Message persists until form is cleared or page is refreshed
    }
}

/**
 * Hides the center created success message.
 */
function hideCenterCreatedMessage() {
    const messageContainer = document.getElementById('centerCreatedMessage');
    if (messageContainer) {
        messageContainer.hidden = true;
    }
}

/**
 * Safely extracts date in YYYY-MM-DD format from various datetime string formats.
 * Handles formats like "2007-04-02T18:35:00", "2007-04-02", etc.
 * @param {string} dateString - The date string to parse
 * @returns {string} - Date in YYYY-MM-DD format, or empty string if invalid
 */
function extractDateForInput(dateString) {
    if (!dateString) return '';
    
    try {
        // If the date contains 'T', extract the date part before it
        if (dateString.includes('T')) {
            const datePart = dateString.split('T')[0];
            // Validate it's in YYYY-MM-DD format
            if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) {
                return datePart;
            }
        }
        
        // Check if already in YYYY-MM-DD format
        if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
            return dateString;
        }
        
        // Try parsing as Date object (fallback)
        const date = new Date(dateString);
        if (!isNaN(date.getTime())) {
            // Use local date parts to avoid timezone issues
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        return '';
    } catch (e) {
        return '';
    }
}

/**
 * Sets a date input value and forces a visual update.
 * HTML5 date inputs can be finicky about updating visually.
 * @param {HTMLInputElement} inputEl - The date input element
 * @param {string} dateValue - Date in YYYY-MM-DD format
 */
function setDateInputValue(inputEl, dateValue) {
    if (!inputEl || !dateValue) return;

    // If Kairo's Flatpickr wrapper is attached, use it so the
    // visible altInput (e.g. "01 May 2025") updates correctly.
    if (inputEl._flatpickr) {
        try {
            // triggerChange = true to force Flatpickr to refresh altInput
            inputEl._flatpickr.setDate(dateValue, true, 'Y-m-d');
        } catch (e) {
            inputEl.value = dateValue;
        }
        return;
    }

    // Fallback for plain native inputs (no Flatpickr)
    const wasDisabled = inputEl.disabled;
    const wasReadonly = inputEl.readOnly;
    inputEl.disabled = false;
    inputEl.readOnly = false;

    inputEl.value = '';

    if (inputEl.type === 'date') {
        try {
            const [year, month, day] = dateValue.split('-').map(Number);
            const dateObj = new Date(year, month - 1, day);
            inputEl.valueAsDate = dateObj;
            inputEl.value = dateValue;
        } catch (e) {
            inputEl.value = dateValue;
        }
    } else {
        inputEl.value = dateValue;
    }

    inputEl.dispatchEvent(new Event('input', { bubbles: true }));
    inputEl.dispatchEvent(new Event('change', { bubbles: true }));

    inputEl.disabled = wasDisabled;
    inputEl.readOnly = wasReadonly;

}

async function initializeCenterMaintenance() {
    // Load services
    if (window.ServiceLoader) {
        await window.ServiceLoader.loadCore();
        await window.ServiceLoader.loadScript('../../../assets/js/services/shared/lookupService.js');
        await window.ServiceLoader.loadGroupService();
    } else {
    }
    
    // Load Group Class dropdown options
    await loadGroupClassOptions();
    
    setupEventListeners();
}

/**
 * Load Group Class options from API and populate dropdown
 */
async function loadGroupClassOptions() {
    try {
        if (!window.GroupService || !window.GroupService.getSpConditionClassCombo) {
            console.warn('[CenterMaintenance] GroupService.getSpConditionClassCombo not available');
            return;
        }

        const requestData = {
            BankID: '00',
            ClasificationType: 'T'
        };

        console.log('[CenterMaintenance] Loading Group Class options...');
        const response = await window.GroupService.getSpConditionClassCombo(requestData);
        
        if (response && response.success !== false) {
            const data = response.data || response.Details01 || response;
            populateGroupClassDropdown(Array.isArray(data) ? data : [data]);
            console.log('[CenterMaintenance] Group Class options loaded');
        } else {
            console.warn('[CenterMaintenance] Failed to load Group Class options:', response?.message);
        }
    } catch (error) {
        console.error('[CenterMaintenance] Error loading Group Class options:', error);
    }
}

/**
 * Populate the Group Class dropdown with options
 * @param {Array} options - Array of group class options from API
 * Expected fields: SubCodeID, Description, ProductTypeID
 */
function populateGroupClassDropdown(options) {
    const select = document.getElementById('groupClass');
    if (!select) {
        console.warn('[CenterMaintenance] groupClass select not found');
        return;
    }

    // Clear existing options except the first placeholder
    while (select.options.length > 1) {
        select.remove(1);
    }

    // Add options from API
    // API returns: SubCodeID, Description, ProductTypeID
    options.forEach(opt => {
        const option = document.createElement('option');
        // Use SubCodeID as the value (e.g., 'GRP01', 'MFIGRP')
        option.value = opt.SubCodeID || opt.subcodeid || opt.ClassID || opt.ID || opt.value || '';
        // Use Description as the display text
        option.textContent = opt.Description || opt.description || opt.ClassDesc || opt.Name || opt.label || option.value;
        select.appendChild(option);
    });

    console.log('[CenterMaintenance] Group Class dropdown populated with', options.length, 'options');
}

function setupEventListeners() {
    document.getElementById('centerId').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleCenterSearch();
    });
    
    // Auto-view when both branch and center IDs are provided
    document.getElementById('centerId').addEventListener('change', () => {
        const centerId = document.getElementById('centerId').value.trim();
        const branchId = document.getElementById('branchId').value.trim();
        if (centerId && branchId && !isAddMode) {
            handleView();
        }
    });
    
    // Check for auto-view when branch changes (don't clear center fields)
    document.getElementById('branchId').addEventListener('change', () => {
        // Check if both IDs are present for auto-view
        const centerId = document.getElementById('centerId').value.trim();
        const branchId = document.getElementById('branchId').value.trim();
        if (centerId && branchId && !isAddMode) {
            handleView();
        }
    });
    
    // Meeting Time - accept numbers only
    document.getElementById('meetingTime').addEventListener('input', (e) => {
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
    });
    
    // Branch ID - fetch branch details on blur
    document.getElementById('branchId').addEventListener('blur', async (e) => {
        const branchId = e.target.value.trim();
        if (branchId && window.LookupService) {
            await fetchBranchDetails(branchId);
        }
    });
    
    // Center Product ID - fetch product details on blur
    document.getElementById('centerProductId').addEventListener('blur', async (e) => {
        const productId = e.target.value.trim();
        if (productId && window.GroupService) {
            await fetchGroupProductDetails(productId);
        }
    });
    
    // Primary Scheme ID - fetch scheme details on blur
    document.getElementById('primarySchemeId').addEventListener('blur', async (e) => {
        const schemeId = e.target.value.trim();
        if (schemeId && window.LookupService) {
            await fetchSchemeDetails(schemeId);
        }
    });
    
    // Credit Officer - fetch officer details on blur
    document.getElementById('creditOfficer').addEventListener('blur', async (e) => {
        const officerId = e.target.value.trim();
        if (officerId && window.LookupService) {
            await fetchOfficerDetails(officerId, 'creditOfficer');
        }
    });
    
    // Group Formed By - fetch officer details on blur
    document.getElementById('groupFormedBy').addEventListener('blur', async (e) => {
        const officerId = e.target.value.trim();
        if (officerId && window.LookupService) {
            await fetchOfficerDetails(officerId, 'groupFormedBy');
        }
    });
}

function handleBranchSearch() {
    // Branch search is always available (needed for View mode)
    const url = '../../common/searchDialogs/branch-search/branch-search.html';
    openSearchDialog(url, 'Branch Search');
}

function handleCenterSearch() {
    if (isAddMode) {
        // In Add mode, Center ID is auto-generated
        showSnackbar('Center ID is auto-generated during Add mode.', 'info');
        return;
    }
    // Center search is available for View and Edit modes
    const branchId = document.getElementById('branchId')?.value?.trim() || '';
    let url = '../../common/searchDialogs/group-search/group-search.html';
    if (branchId) {
        url += `?branch=${encodeURIComponent(branchId)}&context=group`;
    }
    openSearchDialog(url, 'Group Search');
}

function handleCenterProductSearch() {
    if (!canUseSearchDialogs()) {
        showSnackbar('Center Product search is only available in Add or Edit mode.', 'warning');
        return;
    }
    const url = '../../common/searchDialogs/group-product-search/group-product-search.html';
    openSearchDialog(url, 'Group Product Search');
}

function handlePrimarySchemeSearch() {
    if (!canUseSearchDialogs()) {
        showSnackbar('Scheme search is only available in Add or Edit mode.', 'warning');
        return;
    }
    const url = '../../common/searchDialogs/group-loan-scheme-search/group-loan-scheme-search.html';
    openSearchDialog(url, 'Group Loan Scheme Search');
}

function handleCreditOfficerSearch() {
    if (!canUseSearchDialogs()) {
        showSnackbar('Officer search is only available in Add or Edit mode.', 'warning');
        return;
    }
    activeOfficerSearchContext = 'creditOfficer';
    const url = '../../common/searchDialogs/active-officer-search/active-officer-search.html';
    openSearchDialog(url, 'Active Officer Search');
}

function handleGroupFormedBySearch() {
    if (!canUseSearchDialogs()) {
        showSnackbar('Officer search is only available in Add or Edit mode.', 'warning');
        return;
    }
    activeOfficerSearchContext = 'groupFormedBy';
    const url = '../../common/searchDialogs/active-officer-search/active-officer-search.html';
    openSearchDialog(url, 'Active Officer Search');
}

function handleNgoSearch() {
    if (!canUseSearchDialogs()) {
        showSnackbar('NGO search is only available in Add or Edit mode.', 'warning');
        return;
    }
    const url = '../../common/searchDialogs/ngo-search/ngo-search.html';
    openSearchDialog(url, 'NGO Search');
}

async function fetchBranchDetails(branchId) {
    try {
        const requestData = {
            BankID: '00'
        };
        
        const result = await window.LookupService.getBranches(requestData);
        
        if (result.success && result.data) {
            // Extract branches array
            let branches = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            // Filter branches similar to branch search dialog
            const lowerBranchId = branchId.toLowerCase();
            const filteredBranches = branches.filter(b => 
                (b.OurBranchID || '').toLowerCase().includes(lowerBranchId)
            );
            
            if (filteredBranches.length === 1) {
                // Exact single match - populate
                const branch = filteredBranches[0];
                document.getElementById('branchName').value = branch.BranchName || '';
            } else if (filteredBranches.length === 0) {
                // No matches - clear name and show warning
                document.getElementById('branchName').value = '';
                showSnackbar('Branch not found', 'warning');
            } else {
                // Multiple matches
                document.getElementById('branchName').value = '';
                showSnackbar('Multiple branches match, please use search dialog', 'warning');
            }
        } else {
            document.getElementById('branchName').value = '';
            showSnackbar('Branch not found', 'warning');
        }
    } catch (error) {
        document.getElementById('branchName').value = '';
        showSnackbar('Error fetching branch details', 'error');
    }
}

async function fetchGroupProductDetails(productId) {
    try {
        const requestData = {
            BankID: '00',
            GroupProductID: productId,
            OperatorID: 'CSADM'
        };
        
        const result = await window.GroupService.getGroupProductMinDetail(requestData);
        
        if (result.success && result.data) {
            // Check different possible data structures
            let productData = null;
            if (Array.isArray(result.data) && result.data.length > 0) {
                productData = result.data[0];
            } else if (result.data.Details && Array.isArray(result.data.Details) && result.data.Details.length > 0) {
                productData = result.data.Details[0];
            }
            
            if (productData) {
                // Populate product name field
                const productName = productData.GroupProductName || productData.Description || '';
                document.getElementById('centerProductName').value = productName;
            } else {
                document.getElementById('centerProductName').value = '';
                showSnackbar('Product not found', 'warning');
            }
        } else {
            document.getElementById('centerProductName').value = '';
            showSnackbar('Product not found', 'warning');
        }
    } catch (error) {
        document.getElementById('centerProductName').value = '';
        showSnackbar('Error fetching product details', 'error');
    }
}

async function fetchSchemeDetails(schemeId) {
    try {
        // Get current product ID for filtering
        const productId = document.getElementById('centerProductId').value.trim();
        
        if (!productId) {
            document.getElementById('primarySchemeName').value = '';
            showSnackbar('Please select a product first', 'warning');
            return;
        }

        // Get branch ID from form
        const branchId = document.getElementById('branchId').value.trim() || '0603';
        
        const requestData = {
            TableID: 'GroupDefaultSchemeID',
            WhereStmt: `LoanSchemeID LIKE '%${schemeId}%'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: `GroupProductID='${productId}' AND SchemeTypeID='P'`,
            OperatorID: 'CSADM',
            ModuleID: 5060,
            OurBranchID: branchId,
            SearchKey: null,
            LanguageID: 'en'
        };
        
        const result = await window.LookupService.getSearchResult(requestData);
        
        if (result.success && result.data) {
            // Extract schemes from response
            let schemes = Array.isArray(result.data) ? result.data : (result.Details || []);
            
            // Filter for exact match (since WhereStmt uses LIKE, we need to find exact)
            const scheme = schemes.find(s => 
                (s.LoanSchemeID || '').toLowerCase() === schemeId.toLowerCase()
            );
            
            if (scheme) {
                // Populate scheme name field
                document.getElementById('primarySchemeName').value = scheme.Description || '';
            } else {
                document.getElementById('primarySchemeName').value = '';
                showSnackbar('Scheme not found', 'warning');
            }
        } else {
            document.getElementById('primarySchemeName').value = '';
            showSnackbar('Scheme not found', 'warning');
        }
    } catch (error) {
        document.getElementById('primarySchemeName').value = '';
        showSnackbar('Error fetching scheme details', 'error');
    }
}

async function fetchOfficerDetails(officerId, fieldType) {
    try {
        // Get current branch ID for filtering
        const branchId = document.getElementById('branchId').value.trim();
        
        if (!branchId) {
            // Clear the appropriate name field
            const nameFieldId = fieldType === 'creditOfficer' ? 'creditOfficerName' : 'groupFormedByName';
            document.getElementById(nameFieldId).value = '';
            showSnackbar('Please select a branch first', 'warning');
            return;
        }
        
        const payload = {
            TableID: 'ActiveOfficerID',
            WhereStmt: `OfficerID LIKE '%${officerId}%'`,
            RefID: null,
            PrevOrNext: 0,
            AdvFilterString: `BankID='00' AND OfficerTypeID in ('CO','AO') AND ReportingBranchID='${branchId}'`,
            OperatorID: 'CSADM',
            ModuleID: 5060,
            OurBranchID: branchId,
            SearchKey: null,
            LanguageID: 'en'
        };
        
        const result = await window.LookupService.getSearchResult(payload);
        
        if (result.success && result.data) {
            // Extract officers from response - check multiple possible locations
            let officers = [];
            if (result.data && result.data.Details) {
                officers = result.data.Details;
            } else if (result.Details) {
                officers = result.Details;
            } else if (Array.isArray(result.data)) {
                officers = result.data;
            }
            
            // Filter for exact match (since WhereStmt uses LIKE, we need to find exact)
            const officer = officers.find(o => 
                (o.OfficerID || '').toLowerCase() === officerId.toLowerCase()
            );
            
            if (officer) {
                // Populate the appropriate name field
                const nameFieldId = fieldType === 'creditOfficer' ? 'creditOfficerName' : 'groupFormedByName';
                document.getElementById(nameFieldId).value = officer.Name || '';
            } else {
                // Clear the appropriate name field
                const nameFieldId = fieldType === 'creditOfficer' ? 'creditOfficerName' : 'groupFormedByName';
                document.getElementById(nameFieldId).value = '';
                showSnackbar('Officer not found', 'warning');
            }
        } else {
            // Clear the appropriate name field
            const nameFieldId = fieldType === 'creditOfficer' ? 'creditOfficerName' : 'groupFormedByName';
            document.getElementById(nameFieldId).value = '';
            showSnackbar('Officer not found', 'warning');
        }
    } catch (error) {
        // Clear the appropriate name field
        const nameFieldId = fieldType === 'creditOfficer' ? 'creditOfficerName' : 'groupFormedByName';
        document.getElementById(nameFieldId).value = '';
        showSnackbar('Error fetching officer details', 'error');
    }
}

function populateForm(center) {
    
    // Main form fields
    document.getElementById('branchId').value = center.OurBranchID || '';
    document.getElementById('branchName').value = center.BranchName || '';
    document.getElementById('centerId').value = center.GroupID || '';
    document.getElementById('centerName').value = center.GroupName || '';
    document.getElementById('centerName').setAttribute('readonly', 'readonly');
    document.getElementById('centerProductId').value = center.GroupProductID || '';
    document.getElementById('centerProductName').value = center.GroupProductName || '';
    document.getElementById('primarySchemeId').value = center.DefaultLoanSchemeID || '';
    document.getElementById('primarySchemeName').value = center.DefaultLoanScheme || '';
    document.getElementById('creditOfficer').value = center.CreditOfficerID || '';
    document.getElementById('creditOfficerName').value = center.CreditOfficerName || '';
    document.getElementById('registrationNo').value = center.RegistrationNo || '';
    document.getElementById('groupFormedBy').value = center.GroupFormedBy || '';
    document.getElementById('groupFormedByName').value = center.GroupFormedByName || '';
    
    // Additional fields
    document.getElementById('village').value = center.VillageID || '';
    document.getElementById('ngoId').value = center.NGOID || '';
    document.getElementById('ngoName').value = center.NGOName || '';
    
    // Select fields - set value and add option if not exists
    const locationSelect = document.getElementById('location');
    if (center.CityID) {
        locationSelect.value = center.CityID;
        // If value not in options, add it dynamically
        if (locationSelect.selectedIndex === -1) {
            const option = document.createElement('option');
            option.value = center.CityID;
            option.textContent = center.CityID; // Use value as text since we don't have the name
            locationSelect.appendChild(option);
            locationSelect.value = center.CityID;
        }
    }
    
    const centreSelect = document.getElementById('centre');
    if (center.CenterID) {
        centreSelect.value = center.CenterID;
        // If value not in options, add it dynamically
        if (centreSelect.selectedIndex === -1) {
            const option = document.createElement('option');
            option.value = center.CenterID;
            option.textContent = center.CenterID; // Use value as text since we don't have the name
            centreSelect.appendChild(option);
            centreSelect.value = center.CenterID;
        }
    }
    
    // Group Class - must match option value
    const groupClassSelect = document.getElementById('groupClass');
    if (center.GroupClassID) {
        groupClassSelect.value = center.GroupClassID;
    }
    
    // Date fields - handle null/undefined gracefully using robust date extraction
    const formationDateEl = document.getElementById('formationDate');
    const firstMeetingDateEl = document.getElementById('firstMeetingDate');
    const nextMeetingDateEl = document.getElementById('nextMeetingDate');

    
    // Formation Date - use robust setter
    const formationDate = extractDateForInput(center.FormationDate);
    setDateInputValue(formationDateEl, formationDate);
    
    // First Meeting Date - use robust setter
    const firstMeetingDate = extractDateForInput(center.FirstMeetingDate);
    setDateInputValue(firstMeetingDateEl, firstMeetingDate);
    
    // Next Meeting Date - use robust setter
    const nextMeetingDate = extractDateForInput(center.NextMeetingDate);
    setDateInputValue(nextMeetingDateEl, nextMeetingDate);
    
    // Meeting Day select
    const meetingDaySelect = document.getElementById('meetingDay');
    if (center.MeetingDayID) {
        meetingDaySelect.value = center.MeetingDayID;
    }
    
    // Numeric fields - use nullish coalescing to handle 0 properly
    document.getElementById('firstDay').value = center.FirstDay ?? '';
    document.getElementById('nextDay').value = center.NextDay ?? '';
    document.getElementById('meetingTime').value = center.MeetingTime ?? '';
    document.getElementById('meetingPlace').value = center.MeetingPlace || '';
    
    // Status select
    const statusSelect = document.getElementById('status');
    if (center.GroupStatusID) {
        statusSelect.value = center.GroupStatusID;
    } else {
        statusSelect.value = 'A'; // Default to Active
    }
    document.getElementById('statusReason').value = '';
    
    // Behind The Scene fields (from Details01)
    document.getElementById('totalMembers').value = center.TotalMembers ?? '0';
    document.getElementById('totalSavingsAcs').value = center.TotalSavingACs ?? '0';
    document.getElementById('totalSavingsBalance').value = center.TotalSavingsBalance ?? '0';
    document.getElementById('totalLoanAcs').value = center.TotalLoanACs ?? '0';
    document.getElementById('totalLoanBalance').value = center.TotalLoanBalance ?? '0';
    document.getElementById('zeroBalance').value = center.TotalZeroSavingACs ?? '0';
    document.getElementById('loanCycleType').value = center.LoanCycleType || '';
    document.getElementById('loanCycleNo').value = center.LoanCycleNo ?? '0';
    document.getElementById('savingOsLoan').value = center.SavingsTOOSLoan ?? '0';
    // MeetingFrequency comes from Details02 (may be null)
    document.getElementById('meetingFrequency').value = center.MeetingFrequency || center.MeetingFrequencyID || '';
    
    // Audit fields
    document.getElementById('createdBy').value = center.CreatedBy || '';
    document.getElementById('modifiedBy').value = center.ModifiedBy || '';
    document.getElementById('supervisedBy').value = center.SupervisedBy || '';
    
    // Use global date-time formatter so audit fields follow the same
    // "01 May 2025" style (with time) across the application.
    if (center.CreatedOn && window.GlobalUtils?.formatDateTime) {
        document.getElementById('createdOn').value = window.GlobalUtils.formatDateTime(center.CreatedOn);
    } else if (center.CreatedOn) {
        document.getElementById('createdOn').value = new Date(center.CreatedOn).toLocaleString();
    }
    if (center.ModifiedOn && window.GlobalUtils?.formatDateTime) {
        document.getElementById('modifiedOn').value = window.GlobalUtils.formatDateTime(center.ModifiedOn);
    } else if (center.ModifiedOn) {
        document.getElementById('modifiedOn').value = new Date(center.ModifiedOn).toLocaleString();
    }
    if (center.SupervisedOn && window.GlobalUtils?.formatDateTime) {
        document.getElementById('supervisedOn').value = window.GlobalUtils.formatDateTime(center.SupervisedOn);
    } else if (center.SupervisedOn) {
        document.getElementById('supervisedOn').value = new Date(center.SupervisedOn).toLocaleString();
    }
}

function clearForm() {
    // Clear branch fields
    document.getElementById('branchId').value = '';
    document.getElementById('branchName').value = '';
    
    // Clear center fields
    clearCenterFields();
    
    // Hide any success message
    hideCenterCreatedMessage();
    
    // Reset current center and mode
    currentCenter = null;
    window.currentCenter = null; // Clear from window as well
    isEditMode = false;
    isAddMode = false;
    setEditMode(false);
}

function clearCenterFields() {
    // Clear all center-related fields but keep branch fields
    const fieldsToClear = [
        'centerId', 'centerName', 'centerProductId', 'centerProductName',
        'primarySchemeId', 'primarySchemeName', 'creditOfficer', 'creditOfficerName',
        'registrationNo', 'groupFormedBy', 'groupFormedByName', 'village', 'location', 'centre',
        'ngoId', 'ngoName', 'formationDate', 'firstMeetingDate', 'nextMeetingDate',
        'meetingDay', 'groupClass', 'totalSavingsAcs', 'totalSavingsBalance',
        'totalLoanAcs', 'totalLoanBalance', 'zeroBalance', 'loanCycleType', 'loanCycleNo',
        'savingOsLoan', 'meetingFrequency', 'createdBy', 'modifiedBy', 'supervisedBy',
        'createdOn', 'modifiedOn', 'supervisedOn', 'status', 'statusReason',
        'firstDay', 'nextDay', 'meetingTime', 'meetingPlace'
    ];
    
    fieldsToClear.forEach(fieldId => {
        const element = document.getElementById(fieldId);
        if (element) {
            element.value = '';
        }
    });
    
    // Reset readonly state (only for non-Add modes)
    if (!isAddMode) {
        document.getElementById('centerName').setAttribute('readonly', 'readonly');
    }
}

async function handleView() {
    const centerId = document.getElementById('centerId').value.trim();
    const branchId = document.getElementById('branchId').value.trim();
    if (!centerId || !branchId) {
        showSnackbar('Please provide Center ID and Branch ID', 'error');
        return;
    }
    
    if (!window.GroupService) {
        showSnackbar('GroupService not loaded', 'error');
        return;
    }
    
    try {
        const requestData = {
            OurBranchID: branchId,
            GroupID: centerId,
            OperatorID: 'CSADM',
            Direction: 0
        };
        
        const result = await window.GroupService.getGroupDetails(requestData);
        
        if (result.success && result.data) {
            if (result.data.Details02 && result.data.Details02.length > 0) {
                const centerData = result.data.Details02[0];
                const totalsData = result.data.Details01 && result.data.Details01.length > 0 ? result.data.Details01[0] : {};
                currentCenter = { ...centerData, ...totalsData, UpdateCount: centerData.UpdateCount };
                window.currentCenter = currentCenter; // Expose to child iframes
                populateForm(currentCenter);
                setEditMode(false);
                isAddMode = false;
                showSnackbar(`Center '${centerId}' loaded successfully`, 'success');
            } else {
                currentCenter = null;
                clearForm();
                showSnackbar('Group Details Not Found', 'error');
            }
        } else {
            currentCenter = null;
            clearForm();
            showSnackbar(`Center '${centerId}' not found`, 'error');
        }
    } catch (error) {
        currentCenter = null;
        clearForm();
        showSnackbar('Error fetching center details: ' + error.message, 'error');
    }
}

function handleAdd() {
    clearForm();
    document.getElementById('status').value = 'A';
    isAddMode = true;
    setEditMode(true);
    document.getElementById('centerName').removeAttribute('readonly');
    showSnackbar('Add Mode: Center ID will be auto-generated. Please provide Center Name.', 'info');
}

function handleEdit() {
    if (!currentCenter) {
        showSnackbar('Please select a center first', 'error');
        return;
    }
    
    isAddMode = false;
    setEditMode(true);
    document.getElementById('centerName').removeAttribute('readonly');
    centerName=document.getElementById('centerName').value;
    showSnackbar(`Editing center '${centerName}'`, 'warning');
}

async function handleDelete() {
    if (!currentCenter) {
        showSnackbar('Please select a center first', 'error');
        return;
    }
    
    const confirmed = await showConfirmationDialog(
        'Delete Center',
        `Are you sure you want to delete center "${currentCenter.GroupName || currentCenter.GroupID}"? This action cannot be undone.`,
        'danger'
    );
    
    if (confirmed) {
        deleteCenter();
    }
}

async function deleteCenter() {
    if (!window.GroupService) {
        showSnackbar('GroupService not available', 'error');
        return;
    }
    
    const requestData = {
        OurBranchID: currentCenter.OurBranchID,
        GroupID: currentCenter.GroupID,
        NewRecord: currentCenter.UpdateCount || 0
    };
    try {
        const response = await window.GroupService.deleteGroupDetails(requestData);
        if (response && response.success) {
            showSnackbar('Center deleted successfully', 'success');
            clearForm();
        } else {
            const errorMessage = response?.message || response?.data?.Message || 'Failed to delete center';
            showSnackbar(errorMessage, 'error');
        }
    } catch (error) {
        showSnackbar('Error deleting center', 'error');
    }
}

async function handleSave() {
    if (!validateForm()) {
        return;
    }
    
    const isNew = isAddMode;
    const requestData = {
        OurBranchID: document.getElementById('branchId').value.trim(),
        GroupID: isNew ? null : document.getElementById('centerId').value.trim(), // Autogenerate for new
        GroupName: document.getElementById('centerName').value.trim(),
        GroupProductID: document.getElementById('centerProductId').value.trim(),
        DefaultLoanSchemeID: document.getElementById('primarySchemeId').value.trim(),
        FormationDate: document.getElementById('formationDate').value || null,
        OpenDate: '2025-08-29',
        GroupClassID: document.getElementById('groupClass').value || null,
        CreditOfficerID: document.getElementById('creditOfficer').value.trim(),
        GroupFormedBy: document.getElementById('groupFormedBy').value.trim(),
        CityID: document.getElementById('location').value || null,
        CenterID: document.getElementById('centre').value || null,
        VillageID: document.getElementById('village').value.trim() || null,
        NGOID: document.getElementById('ngoId').value.trim() || null,
        MeetingFrequencyID: document.getElementById('meetingFrequency').value || null,
        FirstMeetingDate: document.getElementById('firstMeetingDate').value || null,
        FirstDay: parseInt(document.getElementById('firstDay').value) || 0,
        NextDay: parseInt(document.getElementById('nextDay').value) || 0,
        MeetingDayID: document.getElementById('meetingDay').value || null,
        MeetingPlace: document.getElementById('meetingPlace').value.trim(),
        MeetingTime: parseInt(document.getElementById('meetingTime').value) || null,
        NextMeetingDate: document.getElementById('nextMeetingDate').value || null,
        RegistrationNo: document.getElementById('registrationNo').value.trim(),
        GroupLead1: '', // Not in form
        GroupLead2: '', // Not in form
        GroupLead3: '', // Not in form
        GroupStatusID: isNew?'A':document.getElementById('status').value || 'A',
        CreatedBy: 'CSADM',
        CreatedOn: new Date().toISOString(),
        ModifiedBy: 'CSADM',
        ModifiedOn: new Date().toISOString(),
        SupervisedBy: 'CSADM',
        NewRecord: isNew ? 1 : (currentCenter?.UpdateCount || 0),
    };
   
    
    if (window.GroupService) {
        try {
            const result = await window.GroupService.addEditGroup(requestData);
            if (result.success) {
                // Extract GroupID from response - API returns { data: [{ GroupID: '...' }], Details: [{ GroupID: '...' }] }
                let savedGroupId = requestData.GroupID;
                
                // Check result.data as array first (primary location)
                if (Array.isArray(result.data) && result.data.length > 0 && result.data[0].GroupID) {
                    savedGroupId = result.data[0].GroupID;
                }
                // Then check result.Details as array
                else if (Array.isArray(result.Details) && result.Details.length > 0 && result.Details[0].GroupID) {
                    savedGroupId = result.Details[0].GroupID;
                }
                // Fallback: check nested result.data.Details
                else if (result.data?.Details && Array.isArray(result.data.Details) && result.data.Details.length > 0) {
                    savedGroupId = result.data.Details[0].GroupID || savedGroupId;
                }
                // Fallback: direct GroupID property
                else if (result.data?.GroupID) {
                    savedGroupId = result.data.GroupID;
                }
                
                // Store whether this was a new center creation
                const wasNewCenter = isNew && savedGroupId;
                
                // Clear fields and refresh
                clearForm();
                
                // Reload the saved record
                if (savedGroupId && requestData.OurBranchID) {
                    document.getElementById('branchId').value = requestData.OurBranchID;
                    document.getElementById('centerId').value = savedGroupId;
                    await handleView();
                }
                
                // Show success message with GroupID for new centers AFTER clearForm and handleView
                // (both toast and text element above Branch ID)
                if (wasNewCenter) {
                    showCenterCreatedMessage(savedGroupId);
                    showSnackbar(`Center created successfully, group ID: ${savedGroupId}`, 'success');
                } else {
                    showSnackbar(`Center saved successfully`, 'success');
                }
            } else {
                showSnackbar('Error saving center: ' + result.message, 'error');
            }
        } catch (error) {
            showSnackbar('Error saving center: ' + error.message, 'error');
        }
    } else {
        showSnackbar('GroupService not available for saving', 'error');
    }
}

function handleCancel() {
    // Always clear all fields and reset to initial state
    clearForm();
    currentCenter = null;
    window.currentCenter = null; // Clear from window as well
    isEditMode = false;
    isAddMode = false;
    document.getElementById('centerName').setAttribute('readonly', 'readonly');
    setEditMode(false);
    showSnackbar('Cancelled - all fields cleared', 'info');
}

function validateForm() {
    const centerName = document.getElementById('centerName').value.trim();
    const centerProductId = document.getElementById('centerProductId').value.trim();
    const primarySchemeId = document.getElementById('primarySchemeId').value.trim();
    const groupClass = document.getElementById('groupClass').value;
    
    if (!centerName) {
        showSnackbar('Center Name is required', 'error');
        return false;
    }
    
    if (!centerProductId) {
        showSnackbar('Center Product ID is required', 'error');
        return false;
    }
    
    if (!primarySchemeId) {
        showSnackbar('Primary Scheme ID is required', 'error');
        return false;
    }
    
    // Group Class is mandatory during Add mode
    if (isAddMode && !groupClass) {
        showSnackbar('Group Class is required', 'error');
        return false;
    }
    
    return true;
}

function setEditMode(enabled) {
    isEditMode = enabled;
    const editBtn = document.querySelector('button[title="Edit"]');
    const deleteBtn = document.querySelector('button[title="Delete"]');
    const saveBtn = document.querySelector('button[title="Save"]');
    const addBtn = document.querySelector('button[title="Add"]');
    const viewBtn = document.querySelector('button[title="View"]');
    
    // Target all form inputs including date inputs (which are in .form-section, not .field-control)
    const inputs = document.querySelectorAll('.form-section input, .form-section select');
    
    // List of date field IDs that need special handling
    const dateFieldIds = ['formationDate', 'firstMeetingDate', 'nextMeetingDate'];
    
    inputs.forEach(input => {
        if (enabled) {
            // In ADD / EDIT modes: all fields are editable except Center ID
            if (input.id === 'centerId') {
                input.disabled = true;
                return;
            }

            input.disabled = false;

            // Description / lookup name fields should still remain readonly
            const readonlyNameFields = [
                'branchName',
                'centerProductName',
                'primarySchemeName',
                'creditOfficerName',
                'groupFormedByName',
                'ngoName'
            ];

            if (readonlyNameFields.includes(input.id)) {
                input.setAttribute('readonly', 'readonly');
            } else {
                input.removeAttribute('readonly');
            }

            // Date fields should be fully editable in edit/add modes
            if (dateFieldIds.includes(input.id)) {
                input.removeAttribute('readonly');
            }
        } else {
            // View mode
            // Date inputs: use readonly instead of disabled to ensure value displays properly
            if (dateFieldIds.includes(input.id)) {
                input.disabled = false;
                input.setAttribute('readonly', 'readonly');
            } else if (['branchId', 'centerId'].includes(input.id)) {
                input.disabled = false;
            } else {
                input.disabled = true;
            }
            // Set readonly for description fields in view mode
            if (['centerName', 'branchName', 'centerProductName', 'primarySchemeName', 
                 'creditOfficerName', 'groupFormedByName', 'ngoName'].includes(input.id)) {
                input.setAttribute('readonly', 'readonly');
            }
        }
    });

    // Enable/disable lookup buttons based on edit/add mode
    // Exception: Branch and Center lookups are always enabled (needed for View)
    const lookupButtons = document.querySelectorAll('.btn-lookup');
    lookupButtons.forEach(btn => {
        // Check if this is a branch or center lookup button
        const parent = btn.closest('[data-kairo-branch-control], [data-kairo-control]');
        const isBranchLookup = btn.closest('[data-kairo-branch-control]') !== null;
        const isCenterLookup = parent && parent.querySelector('#centerId') !== null;
        
        if (isBranchLookup || isCenterLookup) {
            // Branch and Center lookups are always enabled (for View mode)
            btn.disabled = false;
        } else {
            // Other lookups only enabled in Add/Edit mode
            btn.disabled = !enabled;
        }
    });
    
    if (enabled) {
        editBtn.disabled = true;
        deleteBtn.disabled = true;
        addBtn.disabled = true;
        saveBtn.disabled = false;
        viewBtn.disabled = true;
        document.getElementById('branchId').disabled = false;
    } else {
        editBtn.disabled = !currentCenter;
        deleteBtn.disabled = !currentCenter;
        addBtn.disabled = false;
        saveBtn.disabled = true;
        viewBtn.disabled = false;
        document.getElementById('branchId').disabled = false;
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', async () => {
    await initializeCenterMaintenance();
});

// Add input-group-icon styling
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
        transition: color 0.3s;
    }
    
    .input-group-icon:hover {
        color: var(--primary);
    }
    
    .field-control {
        display: flex;
        align-items: center;
        position: relative;
    }
    
    .field-control input {
        width: 100%;
    }
    
    /* Ensure date inputs display their values properly when readonly or disabled */
    input[type="date"].bs-input-date {
        color: var(--kairo-text-color, var(--bs-input-text, #333));
    }
    
    input[type="date"].bs-input-date:read-only {
        background-color: var(--glass-bg, #f8f9fa);
        cursor: default;
    }
    
    input[type="date"].bs-input-date:disabled {
        opacity: 0.7;
        background-color: var(--glass-bg-disabled, #e9ecef);
    }
    
    /* Ensure the date value text is visible in webkit browsers */
    input[type="date"].bs-input-date::-webkit-datetime-edit {
        color: inherit;
    }
    
    input[type="date"].bs-input-date::-webkit-datetime-edit-fields-wrapper {
        color: inherit;
    }
    
    input[type="date"].bs-input-date::-webkit-datetime-edit-text,
    input[type="date"].bs-input-date::-webkit-datetime-edit-month-field,
    input[type="date"].bs-input-date::-webkit-datetime-edit-day-field,
    input[type="date"].bs-input-date::-webkit-datetime-edit-year-field {
        color: inherit;
    }
    
    /* Success message styling for newly created center */
    .center-created-message {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        padding: 0.75rem 1rem;
        margin: 0.5rem 1rem;
        background: linear-gradient(135deg, rgba(25, 135, 84, 0.1) 0%, rgba(25, 135, 84, 0.05) 100%);
        border: 1px solid rgba(25, 135, 84, 0.3);
        border-radius: 0.5rem;
        color: #198754;
        font-weight: 500;
        font-size: 0.9rem;
        animation: slideInDown 0.3s ease-out;
    }
    
    .center-created-message i {
        font-size: 1.1rem;
    }
    
    .center-created-message[hidden] {
        display: none;
    }
    
    @keyframes slideInDown {
        from {
            opacity: 0;
            transform: translateY(-10px);
        }
        to {
            opacity: 1;
            transform: translateY(0);
        }
    }
`;
document.head.appendChild(style);

// ═══════════════════════════════════════════════════════════════
// CHILD FORM OVERLAY SYSTEM (matching user maintenance)
// ═══════════════════════════════════════════════════════════════
// NOTE: openChildForm is now handled in center-maintenance.html inline script

const THEME_VAR_KEYS = [
    // Core theme vars used by center-maintenance.css and DataEntry overlay
    '--copilot-bg-gradient',
    '--copilot-primary',
    '--copilot-primary-hover',
    '--copilot-text-main',
    '--copilot-text-muted',
    '--copilot-card-bg',
    '--kairo-border-color',
    '--kairo-font-family',
    '--kairo-font-size',
    // New form background overrides
    '--kairo-form-canvas-bg',
    '--kairo-form-surface-bg',
    '--kairo-form-actions-bg'
];

function copyThemeVarsToDocument(targetDoc) {
    if (!targetDoc || !targetDoc.documentElement) return;
    const computed = getComputedStyle(document.documentElement);
    THEME_VAR_KEYS.forEach((key) => {
        const value = computed.getPropertyValue(key);
        const trimmed = value === undefined || value === null ? '' : String(value).trim();
        if (trimmed) targetDoc.documentElement.style.setProperty(key, trimmed);
    });
}

function applyThemeVarsToChildIframe() {
    const iframe = document.querySelector('[data-child-iframe]');
    if (!iframe) return;
    try {
        const doc = iframe.contentDocument;
        if (!doc) return;
        copyThemeVarsToDocument(doc);
    } catch {
        // ignore cross-origin restrictions
    }
}

function openSearchDialog(url, title) {
    const modal = document.getElementById('searchModal');
    const iframe = document.getElementById('searchModalFrame');
    const modalTitle = document.getElementById('searchModalTitle');

    if (!modal || !iframe || !modalTitle) return;

    modalTitle.textContent = title;
    // Append noheader parameter to hide the search dialog's internal header
    const separator = url.includes('?') ? '&' : '?';
    iframe.src = url + separator + 'noheader=1';

    // Use Bootstrap modal
    const bsModal = new bootstrap.Modal(modal);
    bsModal.show();
}

function openNestedDataEntry(url, title) {
    // Use the same modal for nested data entry dialogs (e.g., search dialogs opened from child forms)
    openSearchDialog(url, title);
}

// closeChildForm is now handled in center-maintenance.html inline script

(() => {
    const setActiveNavItem = (btn) => {
        const items = btn.closest('.menu-items');
        if (!items) return;
        items.querySelectorAll('.menu-item').forEach((el) => el.classList.remove('is-active'));
        btn.classList.add('is-active');
    };

    // Handle menu toggle (matching center loan scheme pattern)
    document.querySelectorAll('.menu-arrow').forEach((arrow) => {
        arrow.addEventListener('click', (e) => {
            const menuSection = e.currentTarget.closest('.menu-section');
            const menuItems = menuSection.querySelector('.menu-items');
            const isExpanded = e.currentTarget.getAttribute('aria-expanded') === 'true';
            
            if (isExpanded) {
                menuItems.setAttribute('hidden', '');
                e.currentTarget.setAttribute('aria-expanded', 'false');
                e.currentTarget.querySelector('i').className = 'bi bi-chevron-down';
            } else {
                menuItems.removeAttribute('hidden');
                e.currentTarget.setAttribute('aria-expanded', 'true');
                e.currentTarget.querySelector('i').className = 'bi bi-chevron-up';
            }
        });
    });

    document.querySelector('.cm-legacy-nav')?.addEventListener('click', (e) => {
        const btn = e.target.closest?.('[data-child-form]');
        if (!btn) return;
        e.preventDefault();
        const childKey = btn.getAttribute('data-child-form');
        if (!childKey) return;
        setActiveNavItem(btn);
        openChildForm(childKey);
    });

    // Listen for close messages from child forms
    window.addEventListener('message', (event) => {
        if (event?.data?.type === 'kairo-dataentry-close') {
            closeChildForm();
            // Also close the modal if open
            const modal = document.getElementById('centerMaintenanceDataEntryModal');
            if (modal) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            }
        } else if (event?.data?.type === 'kairo-open-dataentry') {
            // Handle opening nested data entry dialogs (e.g., search dialogs from child forms)
            const { url, title } = event.data;
            openNestedDataEntry(url, title);
        } else if (event?.data?.type === 'kairo-dataentry-minimize') {
            // Handle minimize - hide the data entry container
            const container = document.getElementById('dataEntryContainer');
            if (container) {
                container.style.display = 'none';
                // Show main content again
                const allCards = document.querySelectorAll('.content .card');
                const actionBar = document.querySelector('.action-bar');
                const moduleLayout = document.querySelector('.module-layout');
                allCards.forEach(card => {
                    card.style.display = '';
                });
                if (actionBar) actionBar.style.display = '';
                if (moduleLayout) moduleLayout.style.gridTemplateColumns = '180px 1fr 120px';
            }
        } else if (event?.data?.type === 'BRANCH_SELECTED') {
            // Handle branch selection from search dialog
            const { branchId, branchName } = event.data;
            document.getElementById('branchId').value = branchId;
            document.getElementById('branchName').value = branchName;
            // Store current mode before clearing
            const wasInAddMode = isAddMode;
            // Clear center fields when branch changes
            clearCenterFields();
            // Restore Add mode if it was active
            if (wasInAddMode) {
                isAddMode = true;
                setEditMode(true);
            }
            showSnackbar(`Branch selected: ${branchId} - ${branchName}`, 'success');
        } else if (event?.data?.type === 'GROUP_SELECTED') {
            // Handle group selection from search dialog
            const { groupId, groupName } = event.data;
            document.getElementById('centerId').value = groupId;
            document.getElementById('centerName').value = groupName;
            showSnackbar(`Group selected: ${groupId} - ${groupName}`, 'success');
            // Auto-trigger view if branch ID is also present and not in Add mode
            const branchId = document.getElementById('branchId').value.trim();
            if (groupId && branchId && !isAddMode) {
                handleView();
            } else if (isAddMode) {
                // Re-apply edit mode to ensure all fields remain enabled in Add mode
                setEditMode(true);
            }
        } else if (event?.data?.type === 'GROUP_PRODUCT_SELECTED') {
            // Handle group product selection from search dialog
            const { productId, productName } = event.data;
            document.getElementById('centerProductId').value = productId;
            document.getElementById('centerProductName').value = productName;
            showSnackbar(`Group Product selected: ${productId} - ${productName}`, 'success');
            // Re-apply edit mode to ensure all fields remain enabled in Add mode
            if (isAddMode) {
                setEditMode(true);
            }
        } else if (event?.data?.type === 'GROUP_LOAN_SCHEME_SELECTED') {
            // Handle group loan scheme selection from search dialog
            const { schemeId, schemeName } = event.data;
            document.getElementById('primarySchemeId').value = schemeId;
            document.getElementById('primarySchemeName').value = schemeName;
            showSnackbar(`Loan Scheme selected: ${schemeId} - ${schemeName}`, 'success');
            // Re-apply edit mode to ensure all fields remain enabled in Add mode
            if (isAddMode) {
                setEditMode(true);
            }
        } else if (event?.data?.type === 'ACTIVE_OFFICER_SELECTED') {
            // Handle active officer selection from search dialog
            const { officerId, officerName } = event.data;
            
            if (activeOfficerSearchContext === 'groupFormedBy') {
                document.getElementById('groupFormedBy').value = officerId;
                document.getElementById('groupFormedByName').value = officerName;
                showSnackbar(`Group Formed By selected: ${officerId} - ${officerName}`, 'success');
            } else {
                // Default to Credit Officer
                document.getElementById('creditOfficer').value = officerId;
                document.getElementById('creditOfficerName').value = officerName;
                showSnackbar(`Credit Officer selected: ${officerId} - ${officerName}`, 'success');
            }
            
            // Reset context
            activeOfficerSearchContext = null;
            
            // Re-apply edit mode to ensure all fields remain enabled in Add mode
            if (isAddMode) {
                setEditMode(true);
            }
        } else if (event?.data?.type === 'NGO_SELECTED') {
            // Handle NGO selection from search dialog
            const { ngoId, ngoName } = event.data;
            document.getElementById('ngoId').value = ngoId;
            document.getElementById('ngoName').value = ngoName;
            showSnackbar(`NGO selected: ${ngoId} - ${ngoName}`, 'success');
            // Re-apply edit mode to ensure all fields remain enabled in Add mode
            if (isAddMode) {
                setEditMode(true);
            }
        } else if (event?.data?.type === 'kairo-open-search') {
            // Handle search dialog open request from child forms (like GRT Details, Group Details)
            const { url, title, source } = event.data;
            if (url && title) {
                // Track which child form requested this search
                window.childSearchSource = source || 'unknown';
                console.log('[Center Maintenance] Opening search for child:', window.childSearchSource, 'URL:', url);
                openSearchDialog(url, title);
            }
        } else if (event?.data?.type === 'kairo-search-close') {
            // Close just the search modal, not the child form
            const modal = document.getElementById('searchModal');
            if (modal) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            }
        } else if (event?.data?.type === 'GROUP_LOAN_SCHEME_SELECTED') {
            // Forward scheme selection to the child form (GRT Details)
            const childFrame = document.getElementById('dataEntryFrame');
            if (childFrame && childFrame.contentWindow) {
                childFrame.contentWindow.postMessage(event.data, '*');
            }
            // Also close the search modal
            const modal = document.getElementById('searchModal');
            if (modal) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            }
        } else if (event?.data?.type === 'SUBGROUP_SELECTED') {
            // Forward subgroup selection to the child form (Group Details)
            const childFrame = document.getElementById('dataEntryFrame');
            if (childFrame && childFrame.contentWindow) {
                console.log('[Center Maintenance] Relaying SUBGROUP_SELECTED to child:', event.data);
                childFrame.contentWindow.postMessage(event.data, '*');
            }
            // Also close the search modal
            const modal = document.getElementById('searchModal');
            if (modal) {
                const bsModal = bootstrap.Modal.getInstance(modal);
                if (bsModal) bsModal.hide();
            }
        }
    });
})();
