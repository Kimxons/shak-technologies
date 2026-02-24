// Clearing Bank Signatories - Integrated with OtherStaticDataService
// Location: dataEntry/clearing-bank-signatories.js

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

// =========================================================================
// TOAST NOTIFICATION SYSTEM - Same pattern as maintain-banks.js
// =========================================================================

function ensureToastContainer() {
    let el = document.querySelector('[data-kairo-toast-container]');
    if (el) return el;
    el = document.createElement('div');
    el.className = 'kairo-toast-container';
    el.setAttribute('data-kairo-toast-container', '');
    el.setAttribute('aria-live', 'polite');
    el.setAttribute('aria-relevant', 'additions');
    document.body.appendChild(el);
    return el;
}

function showToast(message, { title = 'Notification', variant = 'info', timeoutMs = 5000 } = {}) {
    const container = ensureToastContainer();

    const toast = document.createElement('div');
    toast.className = `kairo-toast kairo-toast--${variant}`;
    toast.setAttribute('role', 'alert');
    toast.setAttribute('aria-atomic', 'true');

    const header = document.createElement('div');
    header.className = 'kairo-toast__title';

    const titleEl = document.createElement('div');
    titleEl.textContent = title;

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'kairo-toast__close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.textContent = '×';

    const body = document.createElement('div');
    body.className = 'kairo-toast__body';
    body.textContent = String(message || '');

    header.appendChild(titleEl);
    header.appendChild(closeBtn);
    toast.appendChild(header);
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

    closeBtn.addEventListener('click', remove);
    setTimeout(() => toast.classList.add('is-show'), 0);
    if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
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
            showToast('Required services not loaded', { title: 'Error', variant: 'error' });
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
        
        // Try to get BankID from parent window
        try {
            if (window.parent && window.parent !== window) {
                const parentBankId = window.parent.document.getElementById('bankId')?.value;
                if (parentBankId) {
                    currentBankID = parentBankId;
                }
            }
        } catch (e) {
            console.log('Could not access parent BankID:', e.message);
        }
        
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

        // Signatory ID Enter key
        if (signatoryIdInput) {
            signatoryIdInput.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && currentMode === 'view') {
                    e.preventDefault();
                    handleView();
                }
            });
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
            case 'close':
                handleClose();
                break;
        }
    }

    // Show Handler
    function handleShow() {
        console.log('Show clicked');
        
        if (!currentSignatoryData) {
            showStatus('Please load a signatory first to view the image', 'warning');
            showToast('Please load a signatory first', { title: 'Show Image', variant: 'warning', timeoutMs: 3000 });
            return;
        }
        
        const imagePath = currentSignatoryData.ImagePath || currentSignatoryData.SignaturePath || signaturePathInput?.value;
        
        if (!imagePath || !imagePath.trim()) {
            showStatus('No image path available for this signatory', 'info');
            showToast('No image found for this signatory', { title: 'Show Image', variant: 'info', timeoutMs: 3000 });
            return;
        }
        
        showStatus('Displaying signatory image...', 'info');
        showImageModal(imagePath, currentSignatoryData.SignatoryName || currentSignatoryData.SignatoryID);
    }
    
    // Show Image Modal
    function showImageModal(imagePath, signatoryName) {
        const modalId = `signatory-image-modal-${Date.now()}`;

        const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered" style="max-width: 800px;">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white;">
                        <h5 class="modal-title" style="color: white;">Signatory Signature - ${escapeHtml(signatoryName || 'Preview')}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="padding: 20px; text-align: center; background: #f8f9fa;">
                        <div style="margin-bottom: 10px; color: #666;">
                            <small><strong>Image Path:</strong> ${escapeHtml(imagePath)}</small>
                        </div>
                        <div style="background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                            <img src="${escapeHtml(imagePath)}" 
                                 alt="Signatory Signature" 
                                 style="max-width: 100%; max-height: 500px; object-fit: contain;"
                                 onerror="this.onerror=null; this.src='data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%22400%22 height=%22200%22%3E%3Crect fill=%22%23f0f0f0%22 width=%22400%22 height=%22200%22/%3E%3Ctext x=%2250%25%22 y=%2250%25%22 text-anchor=%22middle%22 dy=%22.3em%22 fill=%22%23999%22 font-family=%22Arial%22 font-size=%2216%22%3EImage not found%3C/text%3E%3C/svg%3E';">
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        const modalEl = document.getElementById(modalId);

        // Get Bootstrap Modal constructor
        let ModalConstructor = null;
        if (window.parent && window.parent.bootstrap && window.parent.bootstrap.Modal) {
            ModalConstructor = window.parent.bootstrap.Modal;
        } else if (window.bootstrap && window.bootstrap.Modal) {
            ModalConstructor = window.bootstrap.Modal;
        }

        let modal;
        if (!ModalConstructor) {
            console.warn('Bootstrap Modal not found, using fallback');
            modalEl.classList.add('show');
            modalEl.style.display = 'block';
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);

            modal = {
                hide: () => {
                    modalEl.remove();
                    backdrop.remove();
                    modalContainer.remove();
                }
            };

            backdrop.addEventListener('click', () => modal.hide());
            modalEl.querySelector('.btn-close')?.addEventListener('click', () => modal.hide());
            modalEl.querySelector('.btn-secondary')?.addEventListener('click', () => modal.hide());
        } else {
            modal = new ModalConstructor(modalEl, { backdrop: true, keyboard: true });
            modal.show();
            
            modalEl.addEventListener('hidden.bs.modal', () => {
                modalContainer.remove();
            });
        }
    }

    // View Handler
    async function handleView() {
        console.log('View clicked');
        if (!signatoryIdInput.value.trim()) {
            showStatus('Please enter a Signatory ID to view', 'warning');
            showToast('Please enter a Signatory ID', { title: 'View', variant: 'warning', timeoutMs: 3000 });
            signatoryIdInput.focus();
            return;
        }
        
        showStatus('Loading signatory details...', 'info');
        showToast('Loading signatory data...', { title: 'Loading', variant: 'info', timeoutMs: 2000 });
        await loadSignatoryDetails(signatoryIdInput.value.trim());
    }

    // Add Handler
    function handleAdd() {
        console.log('Add clicked');
        
        if (!currentBankID) {
            showStatus('No bank selected. Please select a bank first.', 'error');
            showToast('Please select a bank first', { title: 'Add', variant: 'warning', timeoutMs: 3000 });
            return;
        }
        
        if (!signatoryIdInput.value.trim()) {
            showStatus('Please enter a Signatory ID first', 'warning');
            showToast('Please enter a Signatory ID first', { title: 'Add', variant: 'warning', timeoutMs: 3000 });
            signatoryIdInput.focus();
            return;
        }
        
        currentMode = 'add';
        const preservedSignatoryId = signatoryIdInput.value.trim();
        clearForm();
        signatoryIdInput.value = preservedSignatoryId; // Restore the signatory ID
        enableFormInputs();
        signatoryIdInput.disabled = true; // Lock the Signatory ID
        setButtonState('add');
        showStatus('Ready to add new signatory', 'success');
        signatoryNameInput.focus();
    }

    // Edit Handler
    function handleEdit() {
        console.log('Edit clicked');
        
        if (!signatoryIdInput.value) {
            showStatus('Please select a signatory to edit', 'warning');
            showToast('Please select a signatory to edit', { title: 'Edit', variant: 'warning', timeoutMs: 3000 });
            return;
        }
        
        if (!currentSignatoryData) {
            showStatus('Please load signatory data first', 'warning');
            showToast('Please load signatory data first', { title: 'Edit', variant: 'warning', timeoutMs: 3000 });
            return;
        }
        
        currentMode = 'edit';
        enableFormInputs();
        signatoryIdInput.disabled = true; // Lock Signatory ID during edit
        setButtonState('edit');
        showStatus('Edit mode enabled', 'info');
        showToast('Edit mode enabled', { title: 'Edit', variant: 'info', timeoutMs: 2000 });
    }

    // Delete Handler
    async function handleDelete() {
        console.log('Delete clicked');
        
        if (!signatoryIdInput.value) {
            showStatus('Please select a signatory to delete', 'warning');
            showToast('Please select a signatory to delete', { title: 'Delete', variant: 'warning', timeoutMs: 3000 });
            return;
        }
        
        if (!currentSignatoryData) {
            showStatus('Please load signatory data first', 'warning');
            showToast('Please load signatory data first', { title: 'Delete', variant: 'warning', timeoutMs: 3000 });
            return;
        }

        if (!confirm('Are you sure you want to delete this signatory?')) {
            return;
        }

        try {
            showStatus('Deleting signatory...', 'info');
            showToast('Deleting signatory...', { title: 'Delete', variant: 'info', timeoutMs: 2000 });
            
            const deletePayload = {
                OurBranchID: '0603',
                BankID: currentBankID,
                SignatoryID: currentSignatoryData.SignatoryID,
                NewRecord: currentSignatoryData.UpdateCount || 0
            };
            
            console.log('🗑️ Delete payload:', deletePayload);
            
            const response = await OtherStaticDataService.deleteBankSignatory(deletePayload);
            
            console.log('🗑️ Delete response:', response);
            
            if (response.success) {
                showStatus('Signatory deleted successfully', 'success');
                showToast('Signatory deleted successfully!', { title: 'Success', variant: 'success' });
                clearForm();
                disableFormInputs();
                currentSignatoryData = null;
                currentMode = 'view';
                setButtonState('initial');
                signatoryIdInput.removeAttribute('disabled');
            } else {
                showStatus(`Delete failed: ${response.message || 'Unknown error'}`, 'error');
                showToast(`Delete failed: ${response.message || 'Unknown error'}`, { title: 'Error', variant: 'error', timeoutMs: 4000 });
            }
        } catch (error) {
            console.error('❌ Delete error:', error);
            showStatus(`Error deleting signatory: ${error.message}`, 'error');
            showToast('Error deleting signatory: ' + error.message, { title: 'Error', variant: 'error', timeoutMs: 4000 });
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
            showToast('Saving signatory...', { title: 'Saving', variant: 'info', timeoutMs: 2000 });
            
            const formData = getFormData();
            console.log('💾 Save payload:', formData);
            
            const response = await OtherStaticDataService.addEditBankSignatory(formData);
            
            console.log('💾 Save response:', response);
            
            if (response.success) {
                showToast('Signatory saved successfully!', { title: 'Success', variant: 'success' });
                showStatus('Signatory saved successfully', 'success');
                
                // Clear the form
                clearForm();
                
                // Disable all form inputs
                disableFormInputs();
                
                // Reset mode to view
                currentMode = 'view';
                currentSignatoryData = null;
                
                // Reset to initial state
                setButtonState('initial');
                signatoryIdInput.removeAttribute('disabled');
            } else {
                showStatus(`Save failed: ${response.message || 'Unknown error'}`, 'error');
                showToast(`Save failed: ${response.message || 'Unknown error'}`, { title: 'Error', variant: 'error', timeoutMs: 4000 });
            }
        } catch (error) {
            console.error('❌ Save error:', error);
            showStatus(`Error saving signatory: ${error.message}`, 'error');
            showToast('Error saving signatory: ' + error.message, { title: 'Error', variant: 'error', timeoutMs: 4000 });
        }
    }

    // Cancel Handler
    function handleCancel() {
        console.log('Cancel clicked');
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            clearForm();
            disableFormInputs();
            currentMode = 'view';
            currentSignatoryData = null;
            setButtonState('initial');
            signatoryIdInput.removeAttribute('disabled');
            showStatus('Changes cancelled', 'info');
            showToast('Changes cancelled', { title: 'Cancelled', variant: 'info', timeoutMs: 2000 });
        }
    }

    // Back Handler
    function handleBack() {
        console.log('Back clicked');
        handleClose();
    }

    // Close Handler
    function handleClose() {
        console.log('Close clicked');
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ 
                    action: 'submoduleClosed',
                    source: 'Clearing Bank Signatories'
                }, '*');
            }
        } catch (error) {
            console.error('Error closing form:', error);
        }
    }

    // Search Handler
    async function handleSearch() {
        console.log('Search signatory clicked');
        showStatus('Opening signatory search...', 'info');
        
        if (!currentBankID) {
            showToast('Please select a bank first', { title: 'Warning', variant: 'warning' });
            return;
        }
        
        try {
            // Fetch signatories for the current bank
            const requestData = {
                BankID: currentBankID,
                SignatoryID: '',
                OurBranchID: '0603',
                OperatorID: 'CSADM',
                Direction: 0
            };
            
            const response = await OtherStaticDataService.getBankSignatories(requestData);
            
            console.log('📥 Search signatories response:', response);
            
            if (response.success) {
                let signatories = [];
                
                // Try multiple data sources
                if (response.data?.Details01 && Array.isArray(response.data.Details01) && response.data.Details01.length > 0) {
                    signatories = response.data.Details01;
                    console.log('📊 Using data from: response.data.Details01');
                } else if (response.data?.Details && Array.isArray(response.data.Details) && response.data.Details.length > 0) {
                    signatories = response.data.Details;
                    console.log('📊 Using data from: response.data.Details');
                } else if (response.Details && Array.isArray(response.Details) && response.Details.length > 0) {
                    signatories = response.Details;
                    console.log('📊 Using data from: response.Details');
                } else if (response.data?.Details01 && !Array.isArray(response.data.Details01)) {
                    signatories = [response.data.Details01];
                    console.log('📊 Using data from: response.data.Details01 (single object)');
                } else if (response.data?.Details && !Array.isArray(response.data.Details)) {
                    signatories = [response.data.Details];
                    console.log('📊 Using data from: response.data.Details (single object)');
                }
                
                // Filter out metadata-only records (records without SignatoryID or SignatoryName)
                signatories = signatories.filter(sig => 
                    (sig.SignatoryID && sig.SignatoryID.trim()) || 
                    (sig.SignatoryName && sig.SignatoryName.trim())
                );
                
                if (signatories.length > 0) {
                    showSignatorySearchModal(signatories);
                } else {
                    showToast('No signatories found for this bank', { title: 'Info', variant: 'info' });
                }
            } else {
                showToast('No signatories found', { title: 'Info', variant: 'info' });
            }
        } catch (error) {
            console.error('❌ Search error:', error);
            showToast('Error searching signatories: ' + error.message, { title: 'Error', variant: 'error' });
        }
    }
    
    // Show Signatory Search Modal
    function showSignatorySearchModal(results) {
        const modalId = `signatory-search-modal-${Date.now()}`;

        const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width: 600px;">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white;">
                        <h5 class="modal-title" style="color: white;">Bank Signatories</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <div class="results-header" style="padding: 10px; background: #f0f8ff; border-left: 3px solid #1e7cc4; margin-bottom: 15px;">
                            <strong>Search Results - ${results.length} signatory(ies) found</strong>
                        </div>
                        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                            <table class="table table-hover table-sm">
                                <thead style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white; position: sticky; top: 0;">
                                    <tr>
                                        <th style="width: 40px; color: white;">#</th>
                                        <th style="color: white;">Signatory ID</th>
                                        <th style="color: white;">Signatory Name</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${results.map((sig, idx) => `
                                        <tr class="signatory-row" data-idx="${idx}" style="cursor: pointer;">
                                            <td>${idx + 1}</td>
                                            <td>${escapeHtml(sig.SignatoryID || '')}</td>
                                            <td>${escapeHtml(sig.SignatoryName || sig.Names || '')}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                    </div>
                </div>
            </div>
        </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        const modalEl = document.getElementById(modalId);

        // Get Bootstrap Modal constructor
        let ModalConstructor = null;
        if (window.parent && window.parent.bootstrap && window.parent.bootstrap.Modal) {
            ModalConstructor = window.parent.bootstrap.Modal;
        } else if (window.bootstrap && window.bootstrap.Modal) {
            ModalConstructor = window.bootstrap.Modal;
        }

        let modal;
        if (!ModalConstructor) {
            console.warn('Bootstrap Modal not found, using fallback');
            modalEl.classList.add('show');
            modalEl.style.display = 'block';
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);

            modal = {
                hide: () => {
                    modalEl.remove();
                    backdrop.remove();
                }
            };

            backdrop.addEventListener('click', () => modal.hide());
        } else {
            modal = new ModalConstructor(modalEl, { backdrop: 'static', keyboard: false });
            modal.show();
        }

        // Add click handlers to rows
        modalEl.querySelectorAll('.signatory-row').forEach((row) => {
            row.addEventListener('click', async () => {
                const idx = parseInt(row.dataset.idx);
                const selectedSignatory = results[idx];

                console.log('✅ Signatory selected:', selectedSignatory);

                modal.hide();
                setTimeout(() => modalContainer.remove(), 500);

                if (selectedSignatory.SignatoryID) {
                    signatoryIdInput.value = selectedSignatory.SignatoryID;
                    await loadSignatoryDetails(selectedSignatory.SignatoryID);
                }
            });

            row.addEventListener('mouseenter', () => row.style.backgroundColor = '#d0e8ff');
            row.addEventListener('mouseleave', () => row.style.backgroundColor = '');
        });
    }

    // Browse Handler
    function handleBrowse() {
        console.log('Browse clicked');
        showFileUploadModal();
    }
    
    // Show File Upload Modal
    function showFileUploadModal() {
        const modalId = `file-upload-modal-${Date.now()}`;

        const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered" style="max-width: 600px;">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white;">
                        <h5 class="modal-title" style="color: white;">Attach Signature Image</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <div class="mb-3">
                            <label for="fileInput" class="form-label" style="font-weight: 500; color: #1e7cc4;">Select Image File</label>
                            <input type="file" class="form-control" id="fileInput" accept="image/*" style="padding: 10px; border: 2px solid #e5e7eb; border-radius: 6px;">
                            <small class="form-text text-muted">Supported formats: JPG, PNG, GIF, BMP</small>
                        </div>
                        
                        <div class="mb-3">
                            <label for="filePathInput" class="form-label" style="font-weight: 500; color: #1e7cc4;">Or enter image path manually</label>
                            <input type="text" class="form-control" id="filePathInput" placeholder="C:\\path\\to\\signature.png" style="padding: 10px; border: 2px solid #e5e7eb; border-radius: 6px;">
                        </div>
                        
                        <div id="imagePreview" style="display: none; margin-top: 15px; text-align: center;">
                            <label style="font-weight: 500; color: #1e7cc4; display: block; margin-bottom: 10px;">Preview</label>
                            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; border: 2px dashed #cbd5e1;">
                                <img id="previewImage" src="" alt="Preview" style="max-width: 100%; max-height: 300px; object-fit: contain;">
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-primary" id="btnAttachFile" style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); border: none;">
                            <i class="bi bi-check-lg"></i> Attach
                        </button>
                    </div>
                </div>
            </div>
        </div>
        `;

        const modalContainer = document.createElement('div');
        modalContainer.innerHTML = modalHTML;
        document.body.appendChild(modalContainer);

        const modalEl = document.getElementById(modalId);
        const fileInput = modalEl.querySelector('#fileInput');
        const filePathInput = modalEl.querySelector('#filePathInput');
        const imagePreview = modalEl.querySelector('#imagePreview');
        const previewImage = modalEl.querySelector('#previewImage');
        const btnAttach = modalEl.querySelector('#btnAttachFile');

        // File input change handler
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                // Show preview
                const reader = new FileReader();
                reader.onload = (event) => {
                    previewImage.src = event.target.result;
                    imagePreview.style.display = 'block';
                };
                reader.readAsDataURL(file);
                
                // Set file path (in real scenario, this would be uploaded to server)
                filePathInput.value = file.name;
            }
        });

        // Manual path input change handler
        filePathInput.addEventListener('input', (e) => {
            const path = e.target.value.trim();
            if (path) {
                // Try to preview if it's a valid image URL/path
                previewImage.src = path;
                previewImage.onerror = () => {
                    imagePreview.style.display = 'none';
                };
                previewImage.onload = () => {
                    imagePreview.style.display = 'block';
                };
            } else {
                imagePreview.style.display = 'none';
            }
        });

        // Get Bootstrap Modal constructor
        let ModalConstructor = null;
        if (window.parent && window.parent.bootstrap && window.parent.bootstrap.Modal) {
            ModalConstructor = window.parent.bootstrap.Modal;
        } else if (window.bootstrap && window.bootstrap.Modal) {
            ModalConstructor = window.bootstrap.Modal;
        }

        let modal;
        if (!ModalConstructor) {
            console.warn('Bootstrap Modal not found, using fallback');
            modalEl.classList.add('show');
            modalEl.style.display = 'block';
            const backdrop = document.createElement('div');
            backdrop.className = 'modal-backdrop fade show';
            document.body.appendChild(backdrop);

            modal = {
                hide: () => {
                    modalEl.remove();
                    backdrop.remove();
                    modalContainer.remove();
                }
            };

            backdrop.addEventListener('click', () => modal.hide());
            modalEl.querySelector('.btn-close')?.addEventListener('click', () => modal.hide());
            modalEl.querySelector('.btn-secondary')?.addEventListener('click', () => modal.hide());
        } else {
            modal = new ModalConstructor(modalEl, { backdrop: true, keyboard: true });
            modal.show();
            
            modalEl.addEventListener('hidden.bs.modal', () => {
                modalContainer.remove();
            });
        }

        // Attach button handler
        btnAttach.addEventListener('click', () => {
            const filePath = filePathInput.value.trim();
            
            if (!filePath) {
                showToast('Please select a file or enter a path', { title: 'Validation', variant: 'warning', timeoutMs: 3000 });
                return;
            }
            
            // Update the signature path input
            if (signaturePathInput) {
                signaturePathInput.value = filePath;
                showToast('Image attached successfully', { title: 'Success', variant: 'success', timeoutMs: 2000 });
            }
            
            modal.hide();
        });
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
                    showToast('Signatory data loaded successfully', { title: 'Success', variant: 'success', timeoutMs: 3000 });
                    setButtonState('loaded');
                } else {
                    // Signatory not found - allow user to add it
                    showStatus('Signatory not found. You can add a new one.', 'info');
                    showToast('Signatory not found. Click ADD to create new.', { title: 'Not Found', variant: 'info', timeoutMs: 4000 });
                    clearForm();
                    signatoryIdInput.value = signatoryId;
                    currentSignatoryData = null;
                    setButtonState('afterView');
                }
            } else {
                showStatus(`Error loading signatory: ${response.message || 'Unknown error'}`, 'error');
                showToast(`Error: ${response.message || 'Unknown error'}`, { title: 'Error', variant: 'error', timeoutMs: 4000 });
                clearForm();
                currentSignatoryData = null;
                setButtonState('initial');
            }
        } catch (error) {
            console.error('❌ Error loading signatory:', error);
            showStatus(`Error loading signatory: ${error.message}`, 'error');
            showToast('Error loading signatory: ' + error.message, { title: 'Error', variant: 'error', timeoutMs: 4000 });
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
        
        console.log('✅ Form populated successfully');
    }

    // Load Signatories List
    async function loadSignatoriesList() {
        console.log('Loading signatories list');
        
        if (!currentBankID) {
            showStatus('No bank selected', 'error');
            showToast('Please select a bank first', { title: 'Show', variant: 'warning', timeoutMs: 3000 });
            return;
        }
        
        try {
            const requestData = {
                BankID: currentBankID,
                SignatoryID: '',
                OurBranchID: '0603',
                OperatorID: 'CSADM',
                Direction: 0
            };
            
            const response = await OtherStaticDataService.getBankSignatories(requestData);
            
            console.log('📥 Signatories list response:', response);
            
            if (response.success) {
                let signatories = [];
                
                // Try multiple data sources
                if (response.data?.Details01 && Array.isArray(response.data.Details01) && response.data.Details01.length > 0) {
                    signatories = response.data.Details01;
                    console.log('📊 Using data from: response.data.Details01');
                } else if (response.data?.Details && Array.isArray(response.data.Details) && response.data.Details.length > 0) {
                    signatories = response.data.Details;
                    console.log('📊 Using data from: response.data.Details');
                } else if (response.Details && Array.isArray(response.Details) && response.Details.length > 0) {
                    signatories = response.Details;
                    console.log('📊 Using data from: response.Details');
                } else if (response.data?.Details01 && !Array.isArray(response.data.Details01)) {
                    signatories = [response.data.Details01];
                    console.log('📊 Using data from: response.data.Details01 (single object)');
                } else if (response.data?.Details && !Array.isArray(response.data.Details)) {
                    signatories = [response.data.Details];
                    console.log('📊 Using data from: response.data.Details (single object)');
                }
                
                console.log('📊 Raw signatories before filtering:', signatories);
                console.log('📊 First record structure:', signatories[0]);
                
                // Filter out metadata-only records (records without SignatoryID or SignatoryName)
                const beforeCount = signatories.length;
                signatories = signatories.filter(sig => {
                    const hasSignatoryId = sig.SignatoryID && sig.SignatoryID.trim();
                    const hasSignatoryName = sig.SignatoryName && sig.SignatoryName.trim();
                    const isValid = hasSignatoryId || hasSignatoryName;
                    
                    if (!isValid) {
                        console.log('🚫 Filtering out record (no SignatoryID/Name):', sig);
                    }
                    
                    return isValid;
                });
                
                console.log(`📊 Filtered: ${beforeCount} → ${signatories.length} records`);
                
                if (signatories.length > 0) {
                    populateSignatoriesTable(signatories);
                    showStatus(`Found ${signatories.length} signatories`, 'success');
                    showToast(`Found ${signatories.length} signatory record(s)`, { title: 'Success', variant: 'success', timeoutMs: 3000 });
                } else {
                    showStatus('No signatories found', 'info');
                    showToast('No signatories found for this bank', { title: 'Info', variant: 'info', timeoutMs: 3000 });
                }
            } else {
                showStatus('No signatories found', 'info');
                showToast('No signatories found for this bank', { title: 'Info', variant: 'info', timeoutMs: 3000 });
            }
        } catch (error) {
            console.error('❌ Error loading signatories list:', error);
            showStatus(`Error loading signatories: ${error.message}`, 'error');
            showToast('Error loading signatories: ' + error.message, { title: 'Error', variant: 'error', timeoutMs: 4000 });
        }
    }

    // Populate Signatories Table
    function populateSignatoriesTable(signatories) {
        const tableBody = document.querySelector('#signatoriesTable tbody');
        if (!tableBody) return;
        
        tableBody.innerHTML = '';
        
        if (!signatories || signatories.length === 0) {
            tableBody.innerHTML = '<tr class="no-data"><td colspan="4">No signatories to display.</td></tr>';
            return;
        }
        
        signatories.forEach((signatory, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${index + 1}</td>
                <td>${escapeHtml(signatory.SignatoryID || '')}</td>
                <td>${escapeHtml(signatory.SignatoryName || signatory.Names || '')}</td>
                <td>${escapeHtml(signatory.ImagePath || signatory.SignaturePath || '')}</td>
            `;
            
            row.style.cursor = 'pointer';
            row.addEventListener('click', () => {
                signatoryIdInput.value = signatory.SignatoryID;
                loadSignatoryDetails(signatory.SignatoryID);
            });
            
            tableBody.appendChild(row);
        });
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
            showToast(errors[0], { title: 'Validation Error', variant: 'error', timeoutMs: 4000 });
            return false;
        }

        return true;
    }

    // Get Form Data
    function getFormData() {
        const remarksInput = document.getElementById('remarks');
        
        return {
            BankID: currentBankID,
            SignatoryID: signatoryIdInput.value.trim(),
            SignatoryName: signatoryNameInput.value.trim(),
            ImageID: 0, // Default, would come from file upload
            CreatedBy: currentMode === 'add' ? 'CSADM' : (currentSignatoryData?.CreatedBy || 'CSADM'),
            CreatedOn: currentMode === 'add' ? null : (currentSignatoryData?.CreatedOn || null),
            ModifiedBy: 'CSADM',
            ModifiedOn: null,
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
            browse: document.querySelector('[data-action="browse"]'),
            close: document.querySelector('[data-action="close"]')
        };
        
        const foundCount = Object.values(buttons).filter(b => b !== null).length;
        console.log(`Found ${foundCount}/${Object.keys(buttons).length} buttons`);

        // Disable all buttons first (except close which should always work)
        Object.entries(buttons).forEach(([key, btn]) => {
            if (btn && key !== 'close') btn.disabled = true;
        });

        // Enable specific buttons based on state
        switch(state) {
            case 'initial':
                // Only VIEW active
                if (buttons.view) {
                    buttons.view.disabled = false;
                    console.log('  ✅ VIEW enabled');
                }
                break;
                
            case 'afterView':
                // After viewing non-existent: ADD, CANCEL active
                if (buttons.add) {
                    buttons.add.disabled = false;
                    console.log('  ✅ ADD enabled');
                }
                if (buttons.cancel) {
                    buttons.cancel.disabled = false;
                    console.log('  ✅ CANCEL enabled');
                }
                break;
                
            case 'add':
                // In add mode: SAVE, CANCEL active
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
                if (buttons.browse) {
                    buttons.browse.disabled = false;
                    console.log('  ✅ BROWSE enabled');
                }
                break;
                
            case 'loaded':
                // After loading existing signatory: SHOW, EDIT, DELETE, CANCEL active
                if (buttons.show) {
                    buttons.show.disabled = false;
                    console.log('  ✅ SHOW enabled');
                }
                if (buttons.edit) {
                    buttons.edit.disabled = false;
                    console.log('  ✅ EDIT enabled');
                }
                if (buttons.delete) {
                    buttons.delete.disabled = false;
                    console.log('  ✅ DELETE enabled');
                }
                if (buttons.cancel) {
                    buttons.cancel.disabled = false;
                    console.log('  ✅ CANCEL enabled');
                }
                break;
        }
    }

    // Clear Form
    function clearForm() {
        if (form) form.reset();
        currentSignatoryData = null;
    }

    // Enable Form Inputs
    function enableFormInputs() {
        const inputs = form?.querySelectorAll('.bs-input-text:not([readonly]), .bs-select');
        inputs?.forEach(input => {
            input.removeAttribute('disabled');
        });
        
        // Enable Signatory Name field (remove readonly for add/edit mode)
        if (signatoryNameInput) {
            signatoryNameInput.removeAttribute('readonly');
            signatoryNameInput.removeAttribute('disabled');
        }
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
        
        // Set Signatory Name back to readonly and disable it
        if (signatoryNameInput) {
            signatoryNameInput.setAttribute('readonly', 'readonly');
            signatoryNameInput.setAttribute('disabled', 'disabled');
        }
        
        // Keep Signatory ID enabled in view mode
        if (currentMode === 'view' && signatoryIdInput) {
            signatoryIdInput.removeAttribute('disabled');
        }
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
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    }

    // Listen for messages from parent window
    window.addEventListener('message', (event) => {
        if (event.data?.action === 'setBankId' && event.data?.bankId) {
            currentBankID = event.data.bankId;
            console.log('🏦 BankID set from parent:', currentBankID);
        }
    });

    // Expose for testing
    window.ClearingBankSignatoriesDebug = {
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

    // Initialize after DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', () => {
            initializeForm();
            attachEventListeners();
        });
    } else {
        initializeForm();
        attachEventListeners();
    }

    console.log('✅ CLEARING BANK SIGNATORIES - v1.0 LOADED');
    console.log('🧪 Debug tools: window.ClearingBankSignatoriesDebug');
    console.log('📅 Build: February 5, 2026');

})();
