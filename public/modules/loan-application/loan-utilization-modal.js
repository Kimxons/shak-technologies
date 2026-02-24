// Loan Utilization Modal - JavaScript

// State
let isEditMode = false;
let currentUtilization = null;

// Service references
let LookupService = null;

function getLookupService() {
    if (!LookupService) {
        LookupService = window.LookupService || window.parent?.LookupService;
    }
    return LookupService;
}

// DOM Elements - will be initialized after DOM loads
let branchId, branchName, clientId, applicationId, groupId, slno;
let utilizationDate, utilizationType, utilizationAmount, description;
let createdBy, modifiedBy, createdOn, modifiedOn;

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    // Initialize DOM elements
    branchId = document.getElementById('branchId');
    branchName = document.getElementById('branchName');
    clientId = document.getElementById('clientId');
    applicationId = document.getElementById('applicationId');
    groupId = document.getElementById('groupId');
    slno = document.getElementById('slno');
    utilizationDate = document.getElementById('utilizationDate');
    utilizationType = document.getElementById('utilizationType');
    utilizationAmount = document.getElementById('utilizationAmount');
    description = document.getElementById('description');
    createdBy = document.getElementById('createdBy');
    modifiedBy = document.getElementById('modifiedBy');
    createdOn = document.getElementById('createdOn');
    modifiedOn = document.getElementById('modifiedOn');

    // Top bar button handlers
    const btnClose = document.getElementById('btnClose');
    const btnResize = document.getElementById('btnResize');

    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }

    if (btnResize) {
        btnResize.addEventListener('click', toggleWidth);
    }

    // Utilization Type change - adjust fields dynamically
    if (utilizationType) {
        utilizationType.addEventListener('change', handleUtilizationTypeChange);
    }

    // Load services first
    try {
        if (window.ServiceLoader) {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadLookupService();
            await ServiceLoader.loadLoanUtilizationService();
        }
    } catch (error) {
        console.error('Error loading services:', error);
    }

    // Load dynamic dropdowns
    setTimeout(loadDynamicDropdowns, 100);

    // Get data from parent window if available
    if (window.parent && window.parent.getLoanApplicationData) {
        const loanData = window.parent.getLoanApplicationData();
        if (loanData) {
            populateFromParent(loanData);
            // Auto-fetch utilization data from backend on modal open
            if (loanData.applicationId) {
                fetchUtilizationData(loanData);
            }
        }
    }
    
    disableEdit();
});

/**
 * Load dynamic dropdowns from database
 */
async function loadDynamicDropdowns() {
    await loadUtilizationTypes();
}

/**
 * Load Utilization Types from database
 */
async function loadUtilizationTypes() {
    try {
        console.log('[LoanUtilization] Loading utilization types...');
        
        const service = getLookupService();
        if (!service) {
            console.error('[LoanUtilization] LookupService not available');
            loadStaticUtilizationTypes();
            return;
        }

        // Try to load from system codes
        const types = await service.getSystemCodeOptions('UtilizationTypeID');
        console.log('[LoanUtilization] Utilization types loaded:', types);
        
        if (types && types.length > 0) {
            utilizationType.innerHTML = '<option value="">--Select--</option>';
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type.value;
                option.textContent = type.label;
                utilizationType.appendChild(option);
            });
        } else {
            loadStaticUtilizationTypes();
        }
    } catch (error) {
        console.error('[LoanUtilization] Error loading utilization types:', error);
        loadStaticUtilizationTypes();
    }
}

/**
 * Fallback static utilization types
 */
function loadStaticUtilizationTypes() {
    if (!utilizationType) return;
    utilizationType.innerHTML = `
        <option value="">--Select--</option>
        <option value="stock">Stock</option>
        <option value="cash">Cash</option>
        <option value="equipment">Equipment</option>
        <option value="inventory">Inventory</option>
        <option value="raw-materials">Raw Materials</option>
        <option value="working-capital">Working Capital</option>
        <option value="other">Other</option>
    `;
}

/**
 * Handle utilization type change - adjust fields dynamically
 */
function handleUtilizationTypeChange(event) {
    const type = event.target.value;
    console.log('[LoanUtilization] Utilization type changed to:', type);
    
    const descriptionField = document.getElementById('description');
    const amountField = document.getElementById('utilizationAmount');
    const amountLabel = amountField?.previousElementSibling;
    
    switch (type) {
        case 'stock':
        case 'inventory':
            if (descriptionField) descriptionField.placeholder = 'Enter stock/inventory details, quantities, items...';
            if (amountLabel) amountLabel.textContent = 'Stock Value';
            break;
            
        case 'cash':
            if (descriptionField) descriptionField.placeholder = 'Enter cash utilization purpose...';
            if (amountLabel) amountLabel.textContent = 'Cash Amount';
            break;
            
        case 'equipment':
            if (descriptionField) descriptionField.placeholder = 'Enter equipment details, model, specifications...';
            if (amountLabel) amountLabel.textContent = 'Equipment Cost';
            break;
            
        case 'raw-materials':
            if (descriptionField) descriptionField.placeholder = 'Enter raw materials details, suppliers...';
            if (amountLabel) amountLabel.textContent = 'Material Cost';
            break;
            
        case 'working-capital':
            if (descriptionField) descriptionField.placeholder = 'Enter working capital usage breakdown...';
            if (amountLabel) amountLabel.textContent = 'Working Capital Amount';
            break;
            
        case 'other':
            if (descriptionField) {
                descriptionField.placeholder = 'Please describe the utilization in detail (required)...';
                descriptionField.required = true;
            }
            if (amountLabel) amountLabel.textContent = 'Utilization Amount';
            break;
            
        default:
            if (descriptionField) {
                descriptionField.placeholder = 'Enter description';
                descriptionField.required = false;
            }
            if (amountLabel) amountLabel.textContent = 'Utilization Amount';
            break;
    }
}

// Fetch utilization data from backend
async function fetchUtilizationData(loanData) {
    try {
        console.log('Fetching utilization data for:', loanData);
        
        const requestData = {
            OurBranchID: loanData.branchId || '',
            ApplicationID: loanData.applicationId || '',
            OperatorID: 'OperatorID', // Should come from session
            ModuleID: 1
        };

        console.log('Request data:', requestData);
        const response = await LoanUtilizationService.getWFLoanUtilization(requestData);
        console.log('Utilization response:', response);
        
        if (response && response.Details && response.Details.length > 0) {
            const data = response.Details[0];
            populateUtilizationData(data);
            showMessage('Loan utilization data loaded successfully', 'success');
            return data;
        } else {
            // Even if no Details01 records, populate main data from parent
            console.log('No utilization records found, keeping parent data');
            showMessage('Ready to add utilization records', 'info');
            return null;
        }
    } catch (error) {
        console.error('Error fetching utilization data:', error);
        showMessage('Error loading utilization data: ' + (error.message || 'Unknown error'), 'error');
        return null;
    }
}

// Populate utilization data from backend response
function populateUtilizationData(data) {
    // Helper function to safely set value
    const setValue = (element, value) => {
        if (element) {
            element.value = value || '';
        }
    };

    // Populate basic fields
    setValue(branchId, data.OurBranchID);
    setValue(branchName, data.BranchName);
    setValue(clientId, data.ClientID);
    setValue(applicationId, data.ApplicationID);
    setValue(groupId, data.GroupID);
    
    // Store loan amount for reference
    if (data.LoanAmount) {
        setValue(utilizationAmount, data.LoanAmount);
    }
    
    // Update readonly status fields
    if (data.WFAdvStageID) {
        console.log('Workflow Stage:', data.WFAdvStageID);
    }
    if (data.WFAppStatusID) {
        console.log('Application Status:', data.WFAppStatusID);
    }
}

// Populate fields from parent window data
function populateFromParent(data) {
    // Helper function to safely set value
    const setValue = (element, value) => {
        if (element) {
            element.value = value || '';
        }
    };
    
    // Populate all available fields from parent
    setValue(branchId, data.branchId);
    setValue(branchName, data.branchName);
    setValue(clientId, data.clientId);
    setValue(applicationId, data.applicationId);
    setValue(groupId, data.groupId);
    
    // Set loan amount if available
    setValue(utilizationAmount, data.loanAmount);
    
    console.log('Populated from parent:', data);
}

// Action Functions
async function view() {
    // Get parent data to fetch utilization records
    if (window.parent && window.parent.getLoanApplicationData) {
        const loanData = window.parent.getLoanApplicationData();
        if (loanData && loanData.applicationId) {
            await fetchUtilizationData(loanData);
        } else {
            showMessage('No application data available', 'warning');
        }
    } else {
        showMessage('Cannot access parent application data', 'error');
    }
}

function add() {
    isEditMode = true;
    clearFormFields();
    enableEdit();
    showMessage('Add new utilization record', 'info');
}

function edit() {
    if (!currentUtilization) {
        showMessage('No utilization record selected', 'warning');
        return;
    }
    isEditMode = true;
    enableEdit();
    showMessage('Edit mode enabled', 'info');
}

function deleteRecord() {
    if (!currentUtilization) {
        showMessage('No utilization record selected', 'warning');
        return;
    }
    
    if (confirm('Are you sure you want to delete this utilization record?')) {
        showMessage('Delete utilization - connect to backend', 'info');
    }
}

function save() {
    if (!validateForm()) {
        return;
    }
    
    const utilizationData = {
        branchId: branchId.value,
        clientId: clientId.value,
        applicationId: applicationId.value,
        groupId: groupId.value,
        slno: slno.value,
        utilizationDate: utilizationDate.value,
        utilizationType: utilizationType.value,
        utilizationAmount: utilizationAmount.value,
        description: description.value
    };
    
    showMessage('Save utilization - connect to backend', 'info');
    currentUtilization = utilizationData;
    disableEdit();
}

function cancel() {
    if (isEditMode) {
        if (confirm('Discard changes?')) {
            disableEdit();
            if (currentUtilization) {
                loadUtilizationData(currentUtilization);
            } else {
                clearFormFields();
            }
        }
    }
}

function back() {
    if (window.parent && window.parent.closeLoanUtilizationModal) {
        window.parent.closeLoanUtilizationModal();
    }
}

function addNew() {
    clearFormFields();
    enableEdit();
    showMessage('New utilization record', 'info');
}

function alter() {
    if (!currentUtilization) {
        showMessage('No utilization record to alter', 'warning');
        return;
    }
    enableEdit();
    showMessage('Alter mode enabled', 'info');
}

function remove() {
    if (!currentUtilization) {
        showMessage('No utilization record to remove', 'warning');
        return;
    }
    
    if (confirm('Remove this utilization record?')) {
        clearFormFields();
        currentUtilization = null;
        showMessage('Record removed', 'success');
    }
}

function update() {
    if (!currentUtilization) {
        showMessage('No utilization record to update', 'warning');
        return;
    }
    showMessage('Update utilization - connect to backend', 'info');
}

function clearForm() {
    if (confirm('Clear all fields?')) {
        clearFormFields();
    }
}

// Helper Functions
function enableEdit() {
    utilizationDate.removeAttribute('disabled');
    utilizationType.removeAttribute('disabled');
    utilizationAmount.removeAttribute('readonly');
    description.removeAttribute('readonly');
}

function disableEdit() {
    isEditMode = false;
    utilizationDate.setAttribute('disabled', true);
    utilizationType.setAttribute('disabled', true);
    utilizationAmount.setAttribute('readonly', true);
    description.setAttribute('readonly', true);
}

function clearFormFields() {
    slno.value = '';
    utilizationDate.value = '';
    utilizationType.value = '';
    utilizationAmount.value = '';
    description.value = '';
    createdBy.value = '';
    modifiedBy.value = '';
    createdOn.value = '';
    modifiedOn.value = '';
}

function loadUtilizationData(data) {
    slno.value = data.slno || '';
    utilizationDate.value = data.utilizationDate || '';
    utilizationType.value = data.utilizationType || '';
    utilizationAmount.value = data.utilizationAmount || '';
    description.value = data.description || '';
}

function validateForm() {
    if (!utilizationType.value) {
        showMessage('Please select Utilization Type', 'error');
        return false;
    }
    
    if (!utilizationAmount.value || parseFloat(utilizationAmount.value) <= 0) {
        showMessage('Please enter a valid Utilization Amount', 'error');
        return false;
    }
    
    return true;
}

// Close modal function
function closeModal() {
    // Send message to parent to close modal
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: 'closeLoanUtilizationModal' }, '*');
    } else {
        window.close();
    }
}

// Toggle width function
function toggleWidth() {
    document.body.classList.toggle('wide-mode');
}

function showMessage(message, type) {
    if (window.parent && window.parent.NotificationService) {
        window.parent.NotificationService.showToast(message, type);
    } else if (window.NotificationService) {
        window.NotificationService.showToast(message, type);
    } else {
        const icon = {
            success: '✓',
            error: '✗',
            warning: '⚠',
            info: 'ℹ'
        };
        alert(`${icon[type] || ''} ${message}`);
    }
}
