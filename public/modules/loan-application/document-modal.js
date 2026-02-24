// Document Modal JavaScript

// Service references
let LookupService = null;

function getLookupService() {
    if (!LookupService) {
        LookupService = window.LookupService || window.parent?.LookupService;
    }
    return LookupService;
}

function showMessage(message, type = 'info') {
    if (window.parent && window.parent.NotificationService) {
        window.parent.NotificationService.showToast(message, type);
    } else {
        console.log(`${type.toUpperCase()}: ${message}`);
        if (type === 'error') alert(message);
    }
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async function() {
    await loadServices();
    initializeDocumentModal();
    // Wait for services then load dropdowns
    setTimeout(loadDynamicDropdowns, 100);
});

/**
 * Load required services
 */
async function loadServices() {
    try {
        if (window.ServiceLoader) {
            await ServiceLoader.loadCore();
            await ServiceLoader.loadLookupService();
        }
        console.log('[DocumentModal] Services loaded');
    } catch (error) {
        console.error('[DocumentModal] Error loading services:', error);
    }
}

/**
 * Load all dynamic dropdowns
 */
async function loadDynamicDropdowns() {
    await Promise.all([
        loadDocumentTypes(),
        loadDocumentClasses(),
        loadLocations()
    ]);
}

/**
 * Load Document Types from database
 */
async function loadDocumentTypes() {
    try {
        const service = getLookupService();
        if (!service) {
            loadStaticDocumentTypes();
            return;
        }

        const types = await service.getDocumentTypes();
        console.log('[DocumentModal] Document types loaded:', types);
        
        const selectElement = document.getElementById('documentType');
        if (!selectElement) return;

        if (types && types.length > 0) {
            selectElement.innerHTML = '<option value="">--Select--</option>';
            types.forEach(type => {
                const option = document.createElement('option');
                option.value = type.value;
                option.textContent = type.label;
                selectElement.appendChild(option);
            });
        } else {
            loadStaticDocumentTypes();
        }
    } catch (error) {
        console.error('[DocumentModal] Error loading document types:', error);
        loadStaticDocumentTypes();
    }
}

function loadStaticDocumentTypes() {
    const selectElement = document.getElementById('documentType');
    if (!selectElement) return;
    selectElement.innerHTML = `
        <option value="">--Select--</option>
        <option value="original">Original</option>
        <option value="copy">Copy</option>
        <option value="certified">Certified Copy</option>
    `;
}

/**
 * Load Document Classes from database
 */
async function loadDocumentClasses() {
    try {
        const service = getLookupService();
        if (!service) {
            loadStaticDocumentClasses();
            return;
        }

        const classes = await service.getSystemCodeOptions('DocumentClassID');
        console.log('[DocumentModal] Document classes loaded:', classes);
        
        const selectElement = document.getElementById('documentClass');
        if (!selectElement) return;

        if (classes && classes.length > 0) {
            selectElement.innerHTML = '<option value="">--Select--</option>';
            classes.forEach(cls => {
                const option = document.createElement('option');
                option.value = cls.value;
                option.textContent = cls.label;
                selectElement.appendChild(option);
            });
        } else {
            loadStaticDocumentClasses();
        }
    } catch (error) {
        console.error('[DocumentModal] Error loading document classes:', error);
        loadStaticDocumentClasses();
    }
}

function loadStaticDocumentClasses() {
    const selectElement = document.getElementById('documentClass');
    if (!selectElement) return;
    selectElement.innerHTML = `
        <option value="">--Select--</option>
        <option value="identity">Identity Document</option>
        <option value="financial">Financial Document</option>
        <option value="legal">Legal Document</option>
        <option value="property">Property Document</option>
        <option value="other">Other</option>
    `;
}

/**
 * Load Document Locations from database
 */
async function loadLocations() {
    try {
        const service = getLookupService();
        if (!service) {
            loadStaticLocations();
            return;
        }

        const locations = await service.getDocumentLocations();
        console.log('[DocumentModal] Locations loaded:', locations);
        
        const selectElement = document.getElementById('location');
        if (!selectElement) return;

        if (locations && locations.length > 0) {
            selectElement.innerHTML = '<option value="">--Select--</option>';
            locations.forEach(loc => {
                const option = document.createElement('option');
                option.value = loc.value;
                option.textContent = loc.label;
                selectElement.appendChild(option);
            });
        } else {
            loadStaticLocations();
        }
    } catch (error) {
        console.error('[DocumentModal] Error loading locations:', error);
        loadStaticLocations();
    }
}

function loadStaticLocations() {
    const selectElement = document.getElementById('location');
    if (!selectElement) return;
    selectElement.innerHTML = `
        <option value="">--Select--</option>
        <option value="head-office">Head Office</option>
        <option value="branch">Branch</option>
        <option value="archive">Archive</option>
        <option value="digital">Digital Storage</option>
    `;
}

// Initialize modal handlers
function initializeDocumentModal() {
    // Top bar button handlers
    const btnClose = document.getElementById('btnClose');
    const btnResize = document.getElementById('btnResize');

    if (btnClose) {
        btnClose.addEventListener('click', closeModal);
    }

    if (btnResize) {
        btnResize.addEventListener('click', toggleWidth);
    }

    // Document Class change - adjust fields dynamically
    const documentClassSelect = document.getElementById('documentClass');
    if (documentClassSelect) {
        documentClassSelect.addEventListener('change', handleDocumentClassChange);
    }

    // Browse button handler
    const browseBtn = document.getElementById('browseBtn');
    const fileInput = document.getElementById('fileInput');
    const documentImage = document.getElementById('documentImage');

    if (browseBtn && fileInput) {
        browseBtn.addEventListener('click', function() {
            fileInput.click();
        });

        fileInput.addEventListener('change', function(e) {
            if (e.target.files.length > 0) {
                documentImage.value = e.target.files[0].name;
            }
        });
    }

    // Search button handlers
    const searchBtns = document.querySelectorAll('.btn-search');
    searchBtns.forEach(btn => {
        btn.addEventListener('click', handleSearch);
    });

    // Action button handlers
    const showImageBtn = document.getElementById('showImageBtn');
    const viewBtn = document.getElementById('viewBtn');
    const addBtn = document.getElementById('addBtn');
    const editBtn = document.getElementById('editBtn');
    const deleteBtn = document.getElementById('deleteBtn');
    const saveBtn = document.getElementById('saveBtn');
    const cancelBtn = document.getElementById('cancelBtn');
    const backBtn = document.getElementById('backBtn');

    if (showImageBtn) showImageBtn.addEventListener('click', handleShowImage);
    if (viewBtn) viewBtn.addEventListener('click', handleView);
    if (addBtn) addBtn.addEventListener('click', handleAdd);
    if (editBtn) editBtn.addEventListener('click', handleEdit);
    if (deleteBtn) deleteBtn.addEventListener('click', handleDelete);
    if (saveBtn) saveBtn.addEventListener('click', handleSave);
    if (cancelBtn) cancelBtn.addEventListener('click', handleCancel);
    if (backBtn) backBtn.addEventListener('click', handleBack);

    // Initialize form state
    disableEdit();
}

/**
 * Handle document class change - adjust fields dynamically
 */
function handleDocumentClassChange(event) {
    const docClass = event.target.value;
    console.log('[DocumentModal] Document class changed to:', docClass);
    
    const documentTypeSelect = document.getElementById('documentType');
    const locationSelect = document.getElementById('location');
    const remarksField = document.getElementById('remarks');
    const documentImageRow = document.getElementById('documentImage')?.closest('.form-row');
    
    // Reset visibility
    if (documentImageRow) documentImageRow.style.display = '';
    
    switch (docClass) {
        case 'identity':
            // Identity documents - emphasize image upload
            if (documentImageRow) documentImageRow.style.display = '';
            if (remarksField) remarksField.placeholder = 'Enter ID verification notes...';
            break;
            
        case 'financial':
            // Financial documents
            if (remarksField) remarksField.placeholder = 'Enter financial document details...';
            break;
            
        case 'legal':
            // Legal documents - location is important
            if (remarksField) remarksField.placeholder = 'Enter legal document notes, registration numbers...';
            break;
            
        case 'property':
            // Property documents
            if (remarksField) remarksField.placeholder = 'Enter property description, title deed numbers...';
            break;
            
        case 'digital':
            // Digital - no physical location needed
            if (locationSelect) {
                locationSelect.value = 'digital';
                locationSelect.disabled = true;
            }
            if (remarksField) remarksField.placeholder = 'Enter digital storage reference...';
            break;
            
        default:
            if (remarksField) remarksField.placeholder = '';
            if (locationSelect) locationSelect.disabled = false;
            break;
    }
}

// Handle search
function handleSearch(e) {
    const parent = e.target.closest('.input-with-search');
    const input = parent ? parent.querySelector('input') : null;
    
    if (input) {
        const value = input.value;
        if (!value) {
            showMessage('Please enter a search value', 'warning');
            return;
        }
        console.log('Searching for:', value);
        showMessage('Search functionality - connect to backend', 'info');
    }
}

// Handle show image
function handleShowImage() {
    const documentImage = document.getElementById('documentImage').value;
    
    if (!documentImage) {
        showMessage('No document image selected', 'warning');
        return;
    }

    console.log('Show image:', documentImage);
    showMessage('Show image functionality - connect to backend', 'info');
}

// Handle view
function handleView() {
    console.log('View document');
    showMessage('View mode activated', 'info');
    disableEdit();
}

// Handle add
function handleAdd() {
    console.log('Add new document');
    showMessage('Add mode activated', 'info');
    clearDocumentForm();
    enableEdit();
}

// Handle edit
function handleEdit() {
    console.log('Edit document');
    showMessage('Edit mode activated', 'info');
    enableEdit();
}

// Handle delete
function handleDelete() {
    console.log('Delete document');
    if (confirm('Are you sure you want to delete this document?')) {
        showMessage('Delete functionality - connect to backend', 'info');
    }
}

// Handle save
function handleSave() {
    console.log('Save document');
    
    if (!validateForm()) {
        return;
    }

    // TODO: Implement API call to save document
    showMessage('Save functionality - connect to backend', 'info');
}

// Handle cancel
function handleCancel() {
    console.log('Cancel operation');
    clearDocumentForm();
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

    const browseBtn = document.getElementById('browseBtn');
    if (browseBtn) browseBtn.disabled = false;
}

// Disable form editing
function disableEdit() {
    const inputs = document.querySelectorAll('.form-control:not([readonly])');
    inputs.forEach(input => {
        input.disabled = true;
    });

    const browseBtn = document.getElementById('browseBtn');
    if (browseBtn) browseBtn.disabled = true;
}

// Clear form
function clearDocumentForm() {
    document.getElementById('documentId').value = '';
    document.getElementById('documentType').value = '';
    document.getElementById('documentClass').value = '';
    document.getElementById('receivedBy').value = '';
    document.getElementById('receivedDate').value = '';
    document.getElementById('location').value = '';
    document.getElementById('documentImage').value = '';
    document.getElementById('remarks').value = '';
    document.getElementById('applicationStatus').value = '';
    document.getElementById('createdBy').value = '';
    document.getElementById('modifiedBy').value = '';
    document.getElementById('createdOn').value = '';
    document.getElementById('modifiedOn').value = '';

    const fileInput = document.getElementById('fileInput');
    if (fileInput) fileInput.value = '';
}

// Validate form
function validateForm() {
    const documentType = document.getElementById('documentType').value;
    const documentClass = document.getElementById('documentClass').value;
    
    if (!documentType) {
        showMessage('Please select Document Type', 'error');
        return false;
    }

    if (!documentClass) {
        showMessage('Please select Document Class', 'error');
        return false;
    }
    
    return true;
}

// Show message
function showMessage(message, type) {
    console.log(`${type.toUpperCase()}: ${message}`);
    // TODO: Implement proper message display
}

// Close modal function
function closeModal() {
    // Send message to parent to close modal
    if (window.parent && window.parent !== window) {
        window.parent.postMessage({ action: 'closeDocumentModal' }, '*');
    } else {
        window.close();
    }
}

// Toggle width function
function toggleWidth() {
    document.body.classList.toggle('wide-mode');
}
