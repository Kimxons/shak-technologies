// Collateral Modal JavaScript

// Service references
let LoanCollateralsService = null;
let CoreApi = null;
let LookupService = null;

function getLookupService() {
    if (!LookupService) {
        LookupService = window.LookupService || window.parent?.LookupService;
    }
    return LookupService;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Load services
    await loadServices();
    initializeCollateralModal();
    // Load dynamic dropdowns
    setTimeout(loadDynamicDropdowns, 100);
});

/**
 * Load required services
 */
async function loadServices() {
    try {
        const { ServiceLoader } = window;
        
        if (!ServiceLoader) {
            console.error('ServiceLoader not available');
            return;
        }

        await ServiceLoader.loadCore();
        await ServiceLoader.loadLookupService();
        await ServiceLoader.loadLoanCollateralsService();
        
        LoanCollateralsService = window.LoanCollateralsService;
        CoreApi = window.CoreApi;
        LookupService = window.LookupService;
        
        console.log('[Collateral Modal] Services loaded successfully');
    } catch (error) {
        console.error('[Collateral Modal] Error loading services:', error);
        showMessage('Error loading services: ' + error.message, 'error');
    }
}

/**
 * Load dynamic dropdowns from database
 */
async function loadDynamicDropdowns() {
    await loadCollateralTypes();
}

/**
 * Load Collateral Types from database
 */
async function loadCollateralTypes() {
    try {
        console.log('[Collateral Modal] Loading collateral types...');
        
        const service = getLookupService();
        if (!service) {
            console.error('[Collateral Modal] LookupService not available');
            return;
        }

        const types = await service.getCollateralTypes();
        console.log('[Collateral Modal] Collateral types loaded:', types);
        
        // Store for dynamic adjustments when viewing
        window.collateralTypeOptions = types;
    } catch (error) {
        console.error('[Collateral Modal] Error loading collateral types:', error);
    }
}

/**
 * Handle collateral type change - adjust fields dynamically
 */
function handleCollateralTypeChange(collateralType) {
    console.log('[Collateral Modal] Collateral type:', collateralType);
    
    const marginField = document.getElementById('margin');
    const marginRow = marginField?.closest('.form-row');
    const exchangeRateField = document.getElementById('exchangeRate');
    const exchangeRateRow = exchangeRateField?.closest('.col');
    const apportionedRatioField = document.getElementById('apportionedRatio');
    
    // Get type info from loaded options
    const typeLabel = collateralType?.toLowerCase() || '';
    
    // Adjust fields based on collateral type
    if (typeLabel.includes('property') || typeLabel.includes('real estate') || typeLabel.includes('land')) {
        // Property - margin and apportioned ratio are important
        if (marginField) {
            marginField.placeholder = 'e.g., 70%';
        }
        if (apportionedRatioField) {
            apportionedRatioField.placeholder = 'Property share ratio';
        }
    } else if (typeLabel.includes('vehicle') || typeLabel.includes('motor')) {
        // Vehicle - depreciation considerations
        if (marginField) {
            marginField.placeholder = 'e.g., 50-60% (depreciation factor)';
        }
    } else if (typeLabel.includes('cash') || typeLabel.includes('deposit') || typeLabel.includes('fixed')) {
        // Cash/Fixed Deposits - high margin, exchange rate relevant
        if (marginField) {
            marginField.placeholder = 'e.g., 90-100%';
        }
        if (exchangeRateRow) {
            exchangeRateRow.style.display = '';
        }
    } else if (typeLabel.includes('stock') || typeLabel.includes('share') || typeLabel.includes('equity')) {
        // Stocks/Shares - volatile, lower margins
        if (marginField) {
            marginField.placeholder = 'e.g., 40-50% (volatility factor)';
        }
    } else if (typeLabel.includes('guarantee') || typeLabel.includes('guarantor')) {
        // Guarantee - different fields may be relevant
        if (marginField) {
            marginField.placeholder = 'Guarantee coverage %';
        }
    }
}

/**
 * Get value from parent form field
 * @param {string} fieldId - The ID of the field in parent form
 * @returns {string} Field value or empty string
 */
function getParentFormValue(fieldId) {
    try {
        if (window.parent && window.parent !== window) {
            const field = window.parent.document.getElementById(fieldId);
            if (field && field.value) {
                return field.value.trim();
            }
        }
    } catch (error) {
        console.warn(`[Collateral Modal] Could not access parent form field: ${fieldId}`, error);
    }
    return "";
}

/**
 * Get ApplicationID from parent form or sessionStorage
 * @returns {string} ApplicationID
 */
function getApplicationID() {
    // Try parent form first
    let applicationID = getParentFormValue('applicationId');
    
    // Fallback to sessionStorage
    if (!applicationID) {
        applicationID = window.sessionStorage.getItem("currentApplicationID") || "";
    }
    
    return applicationID;
}

/**
 * Get BranchID from parent form or sessionStorage
 * @returns {string} BranchID
 */
function getBranchID() {
    // Try parent form first
    let branchID = getParentFormValue('branchId');
    
    // Fallback to sessionStorage
    if (!branchID) {
        branchID = window.sessionStorage.getItem("branchID") || "0603";
    }
    
    return branchID;
}

// Initialize modal handlers
function initializeCollateralModal() {
    // Top bar button handlers
    const btnClose = document.getElementById('btnClose');
    const btnResize = document.getElementById('btnResize');

    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }

    if (btnResize) {
        btnResize.addEventListener('click', toggleWidth);
    }

    // Search button handler
    const searchBtn = document.querySelector('.btn-search');
    if (searchBtn) {
        searchBtn.addEventListener('click', handleSearchCollateral);
    }

    // Action button handlers
    const viewBtn = document.getElementById('viewBtn');
    const addBtn = document.getElementById('addBtn');
    const editBtn = document.getElementById('editBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const backBtn = document.getElementById('backBtn');

    if (viewBtn) viewBtn.addEventListener('click', handleView);
    if (addBtn) addBtn.addEventListener('click', handleAdd);
    if (editBtn) editBtn.addEventListener('click', handleEdit);
    if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
    if (saveBtn) saveBtn.addEventListener('click', handleSave);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (backBtn) backBtn.addEventListener('click', handleBack);
}

// Handle search collateral
async function handleSearchCollateral() {
    const collateralId = document.getElementById('collateralId').value;
    
    if (!collateralId) {
        showMessage('Please enter a Collateral ID', 'warning');
        return;
    }

    // Trigger view to fetch data
    await handleView();
}

// Handle view
async function handleView() {
    console.log('View collateral');
    
    const collateralId = document.getElementById('collateralId').value;
    
    if (!collateralId) {
        showMessage('Please enter a Collateral ID to view', 'warning');
        return;
    }

    try {
        showMessage('Loading collateral data...', 'info');
        
        // Get ApplicationID from parent loan application form
        const applicationID = getApplicationID();
        
        if (!applicationID) {
            showMessage('Application ID not found in the main form. Please ensure you have a valid loan application open.', 'error');
            return;
        }

        console.log('[Collateral Modal] Using ApplicationID from parent form:', applicationID);

        const requestData = {
            ModuleID: "1",
            OurBranchID: getBranchID(),
            ApplicationID: applicationID,
            CollateralID: collateralId,
            OperatorID: window.sessionStorage.getItem("operatorID") || "web_portal",
            Direction: "1"
        };

        console.log('[Collateral Modal] Fetching data:', requestData);

        const result = await LoanCollateralsService.getWFAdvCollaterals(requestData);

        if (result.success && result.data) {
            console.log('[Collateral Modal] Response:', result.data);
            populateCollateralData(result.data);
            showMessage('Collateral data loaded successfully', 'success');
            disableEdit();
        } else {
            showMessage(result.message || 'Failed to load collateral data', 'error');
        }
    } catch (error) {
        console.error('[Collateral Modal] Error fetching data:', error);
        showMessage('Error loading collateral: ' + error.message, 'error');
    }
}

/**
 * Populate form with collateral data from API response
 */
function populateCollateralData(data) {
    // Populate collateral details (Details01)
    if (data.Details01 && data.Details01.length > 0) {
        const details = data.Details01[0];
        
        document.getElementById('owner').value = details.Owner || details.OwnerName || '';
        document.getElementById('collateralType').value = details.CollateralType || details.CollateralTypeName || '';
        document.getElementById('collateralValue').value = formatNumber(details.CollateralValue) || '';
        document.getElementById('currencyId').value = details.CurrencyID || '';
        document.getElementById('usedCollateralValue').value = formatNumber(details.UsedCollateralValue) || '';
        
        // Adjust fields based on collateral type
        handleCollateralTypeChange(details.CollateralType || details.CollateralTypeName);
    }

    // Populate loan details (Details02)
    if (data.Details02 && data.Details02.length > 0) {
        const loanDetails = data.Details02[0];
        
        document.getElementById('sanctionAmount').value = formatNumber(loanDetails.SanctionAmount || loanDetails.LoanAmount) || '';
        document.getElementById('loanCurrencyId').value = loanDetails.CurrencyID || loanDetails.LoanCurrencyID || '';
    }

    // Populate assigned collateral details (Details03)
    if (data.Details03 && data.Details03.length > 0) {
        const assignedData = data.Details03[0];
        
        document.getElementById('collateralId').value = assignedData.CollateralID || '';
        document.getElementById('apportionedRatio').value = assignedData.ApportionedRatio || '';
        document.getElementById('apportionedValue').value = formatNumber(assignedData.ApportionedValue) || '';
        document.getElementById('margin').value = formatNumber(assignedData.Margin) || '';
        document.getElementById('apportionedCollateralValue').value = formatNumber(assignedData.ApportionedCollateralValue) || '';
        document.getElementById('loanCollateralValue').value = formatNumber(assignedData.LoanCollateralValue) || '';
        document.getElementById('assignedDate').value = formatDate(assignedData.AssignedDate) || '';
        document.getElementById('exchangeRate').value = assignedData.ExchangeRate || '';
        
        // Behind the scene fields
        document.getElementById('applicationStatus').value = assignedData.Status || assignedData.ApplicationStatus || '';
        document.getElementById('createdBy').value = assignedData.CreatedBy || '';
        document.getElementById('modifiedBy').value = assignedData.ModifiedBy || '';
        document.getElementById('createdOn').value = formatDateTime(assignedData.CreatedOn) || '';
        document.getElementById('modifiedOn').value = formatDateTime(assignedData.ModifiedOn) || '';
    }
}

/**
 * Format number with thousand separators
 */
function formatNumber(value) {
    if (!value) return '';
    const num = parseFloat(value);
    if (isNaN(num)) return value;
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/**
 * Format date to YYYY-MM-DD
 */
function formatDate(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    } catch {
        return dateString;
    }
}

/**
 * Format datetime
 */
function formatDateTime(dateString) {
    if (!dateString) return '';
    try {
        const date = new Date(dateString);
        return date.toLocaleString('en-US');
    } catch {
        return dateString;
    }
}

// Handle add
function handleAdd() {
    console.log('Add new collateral');
    showMessage('Add mode activated', 'info');
    clearCollateralForm();
    enableEdit();
}

// Handle edit
function handleEdit() {
    console.log('Edit collateral');
    showMessage('Edit mode activated', 'info');
    enableEdit();
}

// Handle delete
function handleDelete() {
    console.log('Delete collateral');
    if (confirm('Are you sure you want to delete this collateral?')) {
        showMessage('Delete functionality - connect to backend', 'info');
    }
}

// Handle save
function handleSave() {
    console.log('Save collateral');
    
    if (!validateForm()) {
        return;
    }

    // TODO: Implement API call to save collateral
    showMessage('Save functionality - connect to backend', 'info');
}

// Handle cancel
function handleCancel() {
    console.log('Cancel operation');
    clearCollateralForm();
    disableEdit();
    showMessage('Operation cancelled', 'info');
}

// Handle back
function handleBack() {
    console.log('Back to main form');
    closeModal();
}

// Enable form editing
function enableEdit() {
    const inputs = document.querySelectorAll('.form-control:not([readonly])');
    inputs.forEach(input => {
        input.disabled = false;
    });
}

// Disable form editing
function disableEdit() {
    const inputs = document.querySelectorAll('.form-control:not([readonly])');
    inputs.forEach(input => {
        input.disabled = true;
    });
}

// Clear form
function clearCollateralForm() {
    document.getElementById('collateralId').value = '';
    document.getElementById('apportionedRatio').value = '';
    document.getElementById('assignedDate').value = '';
    document.getElementById('apportionedValue').value = '';
    document.getElementById('margin').value = '';
    document.getElementById('apportionedCollateralValue').value = '';
    document.getElementById('exchangeRate').value = '';
    document.getElementById('loanCollateralValue').value = '';
    document.getElementById('owner').value = '';
    document.getElementById('collateralType').value = '';
    document.getElementById('currencyId').value = '';
    document.getElementById('collateralValue').value = '';
    document.getElementById('usedCollateralValue').value = '';
    document.getElementById('sanctionAmount').value = '';
    document.getElementById('loanCurrencyId').value = '';
    document.getElementById('applicationStatus').value = '';
    document.getElementById('createdBy').value = '';
    document.getElementById('modifiedBy').value = '';
    document.getElementById('createdOn').value = '';
    document.getElementById('modifiedOn').value = '';
}

// Validate form
function validateForm() {
    const collateralId = document.getElementById('collateralId').value;
    
    if (!collateralId) {
        showMessage('Please enter Collateral ID', 'error');
        return false;
    }
    
    return true;
}

// Show message
function showMessage(message, type) {
    if (window.parent && window.parent.NotificationService) {
        window.parent.NotificationService.showToast(message, type);
    } else if (window.NotificationService) {
        window.NotificationService.showToast(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
        if (type === 'error') alert(message);
    }
}

// Close modal function
function closeModal() {
    // Send message to parent to close modal
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: 'closeCollateralModal' }, '*');
    } else {
        window.close();
    }
}

// Toggle width function
function toggleWidth() {
    document.body.classList.toggle('wide-mode');
}
