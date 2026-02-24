// Clearing Bank Signatories - Integrated with OtherStaticDataService

// Initialize button states IMMEDIATELY - don't wait for anything
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setInitialButtonStates);
} else {
    setInitialButtonStates();
}

function setInitialButtonStates() {
    console.log('🔘 Setting initial button states IMMEDIATELY...');
    const buttons = {
        view: document.querySelector('[data-action="view"]'),
        back: document.querySelector('[data-action="back"]'),
        show: document.querySelector('[data-action="show"]'),
        add: document.querySelector('[data-action="add"]'),
        edit: document.querySelector('[data-action="edit"]'),
        delete: document.querySelector('[data-action="delete"]'),
        save: document.querySelector('[data-action="save"]'),
        cancel: document.querySelector('[data-action="cancel"]')
    };
    
    // Enable only VIEW and BACK
    if (buttons.view) buttons.view.disabled = false;
    if (buttons.back) buttons.back.disabled = false;
    
    // Ensure all others are disabled
    if (buttons.show) buttons.show.disabled = true;
    if (buttons.add) buttons.add.disabled = true;
    if (buttons.edit) buttons.edit.disabled = true;
    if (buttons.delete) buttons.delete.disabled = true;
    if (buttons.save) buttons.save.disabled = true;
    if (buttons.cancel) buttons.cancel.disabled = true;
    
    console.log('✅ Initial button states set: VIEW and BACK enabled');
}

(async function() {
    'use strict';

    // Wait for services to load
    await waitForServices();

    const OtherStaticDataService = window.OtherStaticDataService;

    // DOM Elements - will be initialized after DOM is ready
    let statusMessage;
    let form;
    let signatoryIdInput;
    let signatoryNameInput;
    let signaturePathInput;

    // State management
    let currentMode = 'view'; // view, add, edit
    let currentSignatoryData = null;
    let currentBankID = null; // This should be set from parent/context

    // Wait for required services to load
    async function waitForServices() {
        let attempts = 0;
        while (!window.OtherStaticDataService && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        if (!window.OtherStaticDataService) {
            console.error('❌ OtherStaticDataService not loaded');
            alert('Error: Required services not loaded');
        } else {
            console.log('✅ OtherStaticDataService loaded successfully');
        }
    }

    // Initialize Form
    function initializeForm() {
        console.log('🔧 Initializing form...');
        
        // Initialize DOM element references
        statusMessage = document.getElementById('statusMessage');
        form = document.getElementById('signatoriesForm');
        signatoryIdInput = document.getElementById('signatoryId');
        signatoryNameInput = document.getElementById('signatoryName');
        signaturePathInput = document.getElementById('signaturePath');
        
        console.log('📋 Form elements:', {
            statusMessage: !!statusMessage,
            form: !!form,
            signatoryIdInput: !!signatoryIdInput,
            signatoryNameInput: !!signatoryNameInput,
            signaturePathInput: !!signaturePathInput
        });
        
        if (!form || !signatoryIdInput || !signatoryNameInput || !signaturePathInput) {
            console.error('❌ CRITICAL: Required form elements not found!');
            return;
        }
        
        // Get BankID from parent context or URL parameter
        const urlParams = new URLSearchParams(window.location.search);
        currentBankID = urlParams.get('bankId') || '04'; // Default for testing
        
        console.log('🏦 Initialized with BankID:', currentBankID);
        
        // Disable form inputs first
        disableFormInputs();
        
        // Set initial button state
        setButtonState('initial');
        
        // Enable Signatory ID field for user input
        if (signatoryIdInput) {
            signatoryIdInput.removeAttribute('disabled');
            console.log('✅ Signatory ID field enabled');
        }
        
        console.log('✅ Form initialization complete');
    }

    // Attach Event Listeners
    function attachEventListeners() {
        console.log('🔗 Attaching event listeners...');
        
        // Action buttons (new structure uses .btn-action)
        const actionButtons = document.querySelectorAll('.btn-action');
        console.log('Found action buttons:', actionButtons.length);
        actionButtons.forEach(button => {
            button.addEventListener('click', handleActionButton);
        });

        // Search button (new structure uses [data-lookup])
        const searchButton = document.querySelector('[data-lookup="signatoryId"]');
        if (searchButton) {
            searchButton.addEventListener('click', handleSearch);
        }

        // Browse button
        const browseButton = document.querySelector('[data-action="browse"]');
        if (browseButton) {
            browseButton.addEventListener('click', handleBrowse);
        }

        // Form inputs
        const sigIdInput = document.getElementById('signatoryId');
        if (sigIdInput) {
            sigIdInput.addEventListener('change', validateSignatoryId);
        }
        
        console.log('✅ Event listeners attached');
    }

    // Handle Action Buttons
    function handleActionButton(event) {
        const button = event.currentTarget;
        const action = button.dataset.action;

        switch(action) {
            case 'show':
                handleShow();
                break;
            case 'view':
                handleView();
                break;
            case 'add':
                handleAdd();
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
            case 'back':
                handleBack();
                break;
        }
    }

    // Show Handler
    function handleShow() {
        console.log('Show clicked');
        showStatus('Displaying all signatories...', 'info');
        loadSignatoriesList();
    }

    // View Handler
    async function handleView() {
        console.log('View clicked');
        if (!signatoryIdInput.value.trim()) {
            showStatus('Please enter a Signatory ID to view', 'warning');
            signatoryIdInput.focus();
            return;
        }
        
        showStatus('Loading signatory details...', 'info');
        await loadSignatoryDetails(signatoryIdInput.value.trim());
    }

    // Add Handler
    function handleAdd() {
        console.log('Add clicked');
        
        if (!currentBankID) {
            showStatus('No bank selected. Please select a bank first.', 'error');
            return;
        }
        
        if (!signatoryIdInput.value.trim()) {
            showStatus('Please enter a Signatory ID first', 'warning');
            signatoryIdInput.focus();
            return;
        }
        
        currentMode = 'add';
        const preservedSignatoryId = signatoryIdInput.value.trim();
        clearForm();
        signatoryIdInput.value = preservedSignatoryId; // Restore the signatory ID
        enableFormInputs();
        setButtonState('add');
        showStatus('Ready to add new signatory', 'success');
        signatoryNameInput.focus();
    }

    // Edit Handler
    function handleEdit() {
        console.log('Edit clicked');
        
        if (!signatoryIdInput.value) {
            showStatus('Please select a signatory to edit', 'warning');
            return;
        }
        
        if (!currentSignatoryData) {
            showStatus('Please load signatory data first', 'warning');
            return;
        }
        
        currentMode = 'edit';
        enableFormInputs();
        signatoryIdInput.disabled = true; // Lock Signatory ID during edit
        setButtonState('edit');
        showStatus('Edit mode enabled', 'info');
    }

    // Delete Handler
    async function handleDelete() {
        console.log('Delete clicked');
        
        if (!signatoryIdInput.value) {
            showStatus('Please select a signatory to delete', 'warning');
            return;
        }
        
        if (!currentSignatoryData) {
            showStatus('Please load signatory data first', 'warning');
            return;
        }

        if (!confirm('Are you sure you want to delete this signatory?')) {
            return;
        }

        try {
            showStatus('Deleting signatory...', 'info');
            
            const deletePayload = {
                BankID: currentBankID,
                SignatoryID: currentSignatoryData.SignatoryID,
                NewRecord: currentSignatoryData.UpdateCount || 0
            };
            
            console.log('🗑️ Delete payload:', deletePayload);
            
            const response = await OtherStaticDataService.deleteBankSignatory(deletePayload);
            
            console.log('🗑️ Delete response:', response);
            
            if (response.success) {
                showStatus('Signatory deleted successfully', 'success');
                clearForm();
                disableFormInputs();
                currentSignatoryData = null;
                currentMode = 'view';
            } else {
                showStatus(`Delete failed: ${response.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Delete error:', error);
            showStatus(`Error deleting signatory: ${error.message}`, 'error');
        }
    }

    // Save Handler
    async function handleSave() {
        console.log('Save clicked');
        
        if (!validateForm()) {
            return;
        }

        try {
            showStatus('Saving signatory...', 'info');
            
            const formData = getFormData();
            console.log('💾 Save payload:', formData);
            
            const response = await OtherStaticDataService.addEditBankSignatory(formData);
            
            console.log('💾 Save response:', response);
            
            if (response.success) {
                // Show success alert
                alert('Data saved successfully!');
                showStatus('Signatory saved successfully', 'success');
                
                // Clear the form
                clearForm();
                
                // Disable all form inputs
                disableFormInputs();
                
                // Reset mode to view
                currentMode = 'view';
                currentSignatoryData = null;
                
                // Reset to initial state: only VIEW and BACK active
                setButtonState('initial');
            } else {
                showStatus(`Save failed: ${response.message || 'Unknown error'}`, 'error');
            }
        } catch (error) {
            console.error('❌ Save error:', error);
            showStatus(`Error saving signatory: ${error.message}`, 'error');
        }
    }

    // Cancel Handler
    function handleCancel() {
        console.log('Cancel clicked');
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            clearForm();
            disableFormInputs();
            currentMode = 'view';
            setButtonState('initial');
            showStatus('Changes cancelled', 'info');
        }
    }

    // Back Handler
    function handleBack() {
        console.log('Back clicked');
        if (window.parent && window.parent !== window) {
            // Close modal if in iframe
            const modalElement = window.parent.document.getElementById('clearingBankSignatoriesModal');
            if (modalElement) {
                const modal = window.parent.bootstrap.Modal.getInstance(modalElement);
                if (modal) {
                    modal.hide();
                }
            }
        }
    }

    // Search Handler
    async function handleSearch() {
        console.log('Search signatory clicked');
        showStatus('Opening signatory search...', 'info');
        
        // TODO: Implement search modal with SearchService
        // For now, show a prompt to enter signatory ID
        const signatoryId = prompt('Enter Signatory ID to search:');
        if (signatoryId) {
            signatoryIdInput.value = signatoryId;
            await loadSignatoryDetails(signatoryId);
        }
    }

    // Browse Handler
    function handleBrowse() {
        console.log('Browse clicked');
        // In a real implementation, this would open a file picker
        alert('File browsing not yet implemented. Please enter the path manually.');
    }

    // Validate Signatory ID
    async function validateSignatoryId() {
        const value = signatoryIdInput.value.trim();
        if (value && currentMode === 'view') {
            await loadSignatoryDetails(value);
        }
    }

    // Load Signatory Details
    async function loadSignatoryDetails(signatoryId) {
        console.log('Loading details for signatory:', signatoryId);
        
        if (!currentBankID) {
            showStatus('No bank selected', 'error');
            return;
        }
        
        try {
            showStatus('Loading signatory data...', 'info');
            
            const requestData = {
                BankID: currentBankID,
                SignatoryID: signatoryId,
                OurBranchID: '0603',
                OperatorID: 'CSADM',
                Direction: 0
            };
            
            console.log('📤 Get signatory request:', requestData);
            
            const response = await OtherStaticDataService.getBankSignatories(requestData);
            
            console.log('📥 Get signatory response:', response);
            
            if (response.success && response.data) {
                let signatoryData = null;
                
                // Handle different response formats
                if (response.data.Details01) {
                    if (Array.isArray(response.data.Details01) && response.data.Details01.length > 0) {
                        signatoryData = response.data.Details01[0];
                    } else if (typeof response.data.Details01 === 'object' && response.data.Details01.SignatoryID) {
                        signatoryData = response.data.Details01;
                    }
                }
                
                if (signatoryData && signatoryData.SignatoryID) {
                    currentSignatoryData = signatoryData;
                    populateForm(signatoryData);
                    showStatus('Signatory details loaded', 'success');
                    // If signatory exists, user can edit or delete
                    setButtonState('loaded');
                } else {
                    // Signatory not found - allow user to add it
                    showStatus('Signatory not found. You can add a new one.', 'info');
                    clearForm();
                    signatoryIdInput.value = signatoryId;
                    currentSignatoryData = null;
                    // Activate ADD, CANCEL, and BACK buttons
                    setButtonState('afterView');
                }
            } else {
                showStatus(`Error loading signatory: ${response.message || 'Unknown error'}`, 'error');
                clearForm();
                currentSignatoryData = null;
                setButtonState('initial');
            }
        } catch (error) {
            console.error('❌ Error loading signatory:', error);
            showStatus(`Error loading signatory: ${error.message}`, 'error');
            clearForm();
            currentSignatoryData = null;
            setButtonState('initial');
        }
    }

    // Populate Form
    function populateForm(data) {
        console.log('📝 Populating form with data:', data);
        
        signatoryIdInput.value = data.SignatoryID || '';
        signatoryNameInput.value = data.SignatoryName || data.Names || '';
        signaturePathInput.value = data.ImagePath || data.SignaturePath || '';
        
        // Populate Behind The Scene (now using textContent for span elements)
        document.getElementById('createdBy').textContent = data.CreatedBy || '-';
        document.getElementById('createdOn').textContent = data.CreatedOn ? formatDateTime(data.CreatedOn) : '-';
        document.getElementById('modifiedBy').textContent = data.ModifiedBy || '-';
        document.getElementById('modifiedOn').textContent = data.ModifiedOn ? formatDateTime(data.ModifiedOn) : '-';
        document.getElementById('supervisedBy').textContent = data.SupervisedBy || '-';
        document.getElementById('supervisedOn').textContent = data.SupervisedOn ? formatDateTime(data.SupervisedOn) : '-';
        
        console.log('✅ Form populated successfully');
    }

    // Load Signatories List
    function loadSignatoriesList() {
        console.log('Loading signatories list');
        // In a real implementation, this would show a list/grid of signatories
        showStatus('Found 5 signatories', 'info');
    }

    // Validate Form
    function validateForm() {
        const errors = [];

        if (!signatoryIdInput.value.trim()) {
            errors.push('Signatory ID is required');
            signatoryIdInput.focus();
        }

        if (!signatoryNameInput.value.trim()) {
            errors.push('Signatory Name is required');
            if (errors.length === 1) signatoryNameInput.focus();
        }

        if (errors.length > 0) {
            showStatus(errors[0], 'error');
            return false;
        }

        return true;
    }

    // Get Form Data
    function getFormData() {
        return {
            BankID: currentBankID,
            SignatoryID: signatoryIdInput.value.trim(),
            SignatoryName: signatoryNameInput.value.trim(),
            ImageID: 0, // Default, would come from file upload
            CreatedBy: currentMode === 'add' ? 'CSADM' : (currentSignatoryData?.CreatedBy || 'CSADM'),
            CreatedOn: currentMode === 'add' ? null : (currentSignatoryData?.CreatedOn || null),
            ModifiedBy: 'CSADM',
            ModifiedOn: null, // Will be set by backend
            SupervisedBy: '',
            NewRecord: currentMode === 'add' ? 1 : (currentSignatoryData?.UpdateCount || 0)
        };
    }

    // Set Button States
    function setButtonState(state) {
        console.log('🔘 Setting button state to:', state);
        
        const buttons = {
            show: document.querySelector('[data-action="show"]'),
            view: document.querySelector('[data-action="view"]'),
            add: document.querySelector('[data-action="add"]'),
            edit: document.querySelector('[data-action="edit"]'),
            delete: document.querySelector('[data-action="delete"]'),
            save: document.querySelector('[data-action="save"]'),
            cancel: document.querySelector('[data-action="cancel"]'),
            back: document.querySelector('[data-action="back"]'),
            browse: document.querySelector('[data-action="browse"]')
        };
        
        const foundCount = Object.values(buttons).filter(b => b !== null).length;
        console.log(`Found ${foundCount}/${Object.keys(buttons).length} buttons`);

        // Disable all buttons first
        Object.values(buttons).forEach(btn => {
            if (btn) btn.disabled = true;
        });

        // Enable specific buttons based on state
        switch(state) {
            case 'initial':
                // Only VIEW and BACK active
                if (buttons.view) {
                    buttons.view.disabled = false;
                    console.log('  ✅ VIEW enabled');
                }
                if (buttons.back) {
                    buttons.back.disabled = false;
                    console.log('  ✅ BACK enabled');
                }
                break;
                
            case 'afterView':
                // After viewing: ADD, CANCEL, and BACK active
                if (buttons.add) {
                    buttons.add.disabled = false;
                    console.log('  ✅ ADD enabled');
                }
                if (buttons.cancel) {
                    buttons.cancel.disabled = false;
                    console.log('  ✅ CANCEL enabled');
                }
                if (buttons.back) {
                    buttons.back.disabled = false;
                    console.log('  ✅ BACK enabled');
                }
                break;
                
            case 'add':
                // In add mode: SAVE, CANCEL, and BROWSE active
                if (buttons.save) {
                    buttons.save.disabled = false;
                    console.log('  ✅ SAVE enabled');
                }
                if (buttons.cancel) {
                    buttons.cancel.disabled = false;
                    console.log('  ✅ CANCEL enabled');
                }
                if (buttons.browse) {
                    buttons.browse.disabled = false;
                    console.log('  ✅ BROWSE enabled');
                }
                break;
                
            case 'edit':
                // In edit mode: SAVE, CANCEL active
                if (buttons.save) {
                    buttons.save.disabled = false;
                    console.log('  ✅ SAVE enabled');
                }
                if (buttons.cancel) {
                    buttons.cancel.disabled = false;
                    console.log('  ✅ CANCEL enabled');
                }
                break;
                
            case 'loaded':
                // After loading existing signatory: EDIT, DELETE, BACK active
                if (buttons.edit) {
                    buttons.edit.disabled = false;
                    console.log('  ✅ EDIT enabled');
                }
                if (buttons.delete) {
                    buttons.delete.disabled = false;
                    console.log('  ✅ DELETE enabled');
                }
                if (buttons.back) {
                    buttons.back.disabled = false;
                    console.log('  ✅ BACK enabled');
                }
                break;
        }
    }

    // Clear Form
    function clearForm() {
        form.reset();
        clearBehindTheScene();
        currentSignatoryData = null;
    }

    // Enable Form Inputs
    function enableFormInputs() {
        const inputs = form.querySelectorAll('.bs-input-text:not([readonly]), .bs-select');
        inputs.forEach(input => {
            input.removeAttribute('disabled');
        });
    }

    // Disable Form Inputs
    function disableFormInputs() {
        if (!form) {
            console.warn('⚠️ Cannot disable inputs - form not initialized');
            return;
        }
        
        const inputs = form.querySelectorAll('.bs-input-text:not([readonly]), .bs-select');
        inputs.forEach(input => {
            input.setAttribute('disabled', 'disabled');
        });
        
        // Keep Signatory ID enabled in view mode
        if (currentMode === 'view' && signatoryIdInput) {
            signatoryIdInput.removeAttribute('disabled');
        }
    }

    // Update Behind The Scene
    function updateBehindTheScene() {
        const now = new Date().toLocaleString();
        const currentUser = 'CSADM';

        document.getElementById('createdBy').textContent = currentUser;
        document.getElementById('createdOn').textContent = now;
        document.getElementById('modifiedBy').textContent = currentUser;
        document.getElementById('modifiedOn').textContent = now;
        document.getElementById('supervisedBy').textContent = '-';
        document.getElementById('supervisedOn').textContent = '-';
    }

    // Clear Behind The Scene
    function clearBehindTheScene() {
        document.getElementById('createdBy').textContent = '-';
        document.getElementById('createdOn').textContent = '-';
        document.getElementById('modifiedBy').textContent = '-';
        document.getElementById('modifiedOn').textContent = '-';
        document.getElementById('supervisedBy').textContent = '-';
        document.getElementById('supervisedOn').textContent = '-';
    }

    // Load Demo Data
    function loadDemoData() {
        // Initially disable form inputs
        disableFormInputs();
    }

    // Show Status Message (using am-message-panel)
    function showStatus(message, type = 'info') {
        const messagePanel = document.querySelector('.am-message-panel');
        if (!messagePanel) {
            console.log(`📢 Status (${type}):`, message);
            return;
        }
        
        const iconMap = {
            success: 'bi-check-circle-fill',
            error: 'bi-exclamation-circle-fill',
            warning: 'bi-exclamation-triangle-fill',
            info: 'bi-info-circle-fill'
        };

        messagePanel.className = `am-message-panel am-message-panel--${type}`;
        const icon = messagePanel.querySelector('i');
        const text = messagePanel.querySelector('span');
        
        if (icon) icon.className = `bi ${iconMap[type]}`;
        if (text) text.textContent = message;
        
        messagePanel.hidden = false;

        // Auto-hide after 5 seconds
        setTimeout(hideStatus, 5000);
    }

    // Hide Status Message
    function hideStatus() {
        const messagePanel = document.querySelector('.am-message-panel');
        if (messagePanel) messagePanel.hidden = true;
    }

    // Utility: Format Date
    function formatDateTime(dateString) {
        if (!dateString) return '';
        try {
            const date = new Date(dateString);
            const options = { 
                year: 'numeric', 
                month: '2-digit', 
                day: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit'
            };
            return date.toLocaleString('en-US', options);
        } catch (error) {
            return dateString;
        }
    }

    // Utility: Escape HTML
    function escapeHtml(text) {
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return text.replace(/[&<>"']/g, m => map[m]);
    }

    // Expose for testing
    window.SignatoriesDebug = {
        loadSignatory: (id) => loadSignatoryDetails(id),
        getCurrentData: () => currentSignatoryData,
        getCurrentMode: () => currentMode,
        setBankID: (bankId) => { currentBankID = bankId; },
        testAdd: async () => {
            handleAdd();
            signatoryIdInput.value = 'TEST001';
            signatoryNameInput.value = 'Test Signatory';
            signaturePathInput.value = 'C:\\Test\\signature.png';
            await handleSave();
        }
    };

    // Initialize after DOM is ready (buttons already initialized outside async function)
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeForm();          // ← FIRST: Initialize variables
            attachEventListeners();    // ← SECOND: Attach handlers that use variables
        });
    } else {
        initializeForm();              // ← FIRST
        attachEventListeners();        // ← SECOND
    }

    console.log('✅ CLEARING BANK SIGNATORIES - v5.0 FINAL FIX - MAINTAIN BANKS');
    console.log('🧪 Debug tools: window.SignatoriesDebug');
    console.log('📅 Build: February 4, 2026 - 12:45 PM');
    
    // Log final button state
    setTimeout(() => {
        const allButtons = document.querySelectorAll('.action-button');
        console.log('\n🔘 FINAL BUTTON STATUS:');
        allButtons.forEach(btn => {
            const action = btn.dataset.action;
            console.log(`   ${btn.disabled ? '❌' : '✅'} ${action.toUpperCase()}: ${btn.disabled ? 'DISABLED' : 'ENABLED'}`);
        });
        console.log('\n');
    }, 500);

})();
