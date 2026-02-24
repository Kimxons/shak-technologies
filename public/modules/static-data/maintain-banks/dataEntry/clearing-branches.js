// Clearing Branches - Integrated with OtherStaticDataService
// Location: dataEntry/clearing-branches.js

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
        add: document.querySelector('[data-action="add"]'),
        edit: document.querySelector('[data-action="edit"]'),
        delete: document.querySelector('[data-action="delete"]'),
        save: document.querySelector('[data-action="save"]'),
        cancel: document.querySelector('[data-action="cancel"]')
    };
    
    // Enable only VIEW
    if (buttons.view) buttons.view.disabled = false;
    
    // Ensure all others are disabled
    if (buttons.add) buttons.add.disabled = true;
    if (buttons.edit) buttons.edit.disabled = true;
    if (buttons.delete) buttons.delete.disabled = true;
    if (buttons.save) buttons.save.disabled = true;
    if (buttons.cancel) buttons.cancel.disabled = true;
    
    console.log('✅ Initial button states set: VIEW enabled');
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
    const SearchService = window.SearchService;
    const LookupService = window.LookupService;
    const CustomCodesLookupService = window.customCodesLookupService;

    // DOM Elements - will be initialized after DOM is ready
    let form;
    let branchIdInput;
    let branchNameInput;
    let address1Input;
    let address2Input;
    let citySelect;
    let countrySelect;
    let zipCodeInput;
    let emailIdInput;
    let phone1Input;
    let phone2Input;
    let mobileInput;
    let faxNoInput;
    let branchTypeSelect;
    let clearingDaysInput;
    let swiftCodeInput;
    let isUpcountryBranchCheckbox;
    let branchRemarksInput;

    // State management
    let currentMode = 'view'; // view, add, edit
    let currentBranchData = null;
    let currentBankID = null; // This should be set from parent/context

    // Wait for required services to load
    async function waitForServices() {
        let attempts = 0;
        while ((!window.OtherStaticDataService || !window.SearchService || !window.LookupService || !window.customCodesLookupService) && attempts < 50) {
            await new Promise(resolve => setTimeout(resolve, 100));
            attempts++;
        }
        if (!window.OtherStaticDataService) {
            console.error('❌ OtherStaticDataService not loaded');
            showToast('Required services not loaded', { title: 'Error', variant: 'error' });
        } else {
            console.log('✅ OtherStaticDataService loaded successfully');
        }
        if (!window.SearchService) {
            console.error('❌ SearchService not loaded');
            showToast('SearchService not loaded', { title: 'Error', variant: 'error' });
        } else {
            console.log('✅ SearchService loaded successfully');
        }
        if (!window.LookupService) {
            console.error('❌ LookupService not loaded');
        } else {
            console.log('✅ LookupService loaded successfully');
        }
        if (!window.customCodesLookupService) {
            console.error('❌ CustomCodesLookupService not loaded');
        } else {
            console.log('✅ CustomCodesLookupService loaded successfully');
        }
    }

    // Initialize Form
    function initializeForm() {
        console.log('🔧 Initializing form...');
        
        // Initialize DOM element references
        form = document.getElementById('branchesForm');
        branchIdInput = document.getElementById('branchId');
        branchNameInput = document.getElementById('branchName');
        address1Input = document.getElementById('address1');
        address2Input = document.getElementById('address2');
        citySelect = document.getElementById('city');
        countrySelect = document.getElementById('country');
        zipCodeInput = document.getElementById('zipCode');
        emailIdInput = document.getElementById('emailId');
        phone1Input = document.getElementById('phone1');
        phone2Input = document.getElementById('phone2');
        mobileInput = document.getElementById('mobile');
        faxNoInput = document.getElementById('faxNo');
        branchTypeSelect = document.getElementById('branchType');
        clearingDaysInput = document.getElementById('clearingDays');
        swiftCodeInput = document.getElementById('swiftCode');
        isUpcountryBranchCheckbox = document.getElementById('isUpcountryBranch');
        branchRemarksInput = document.getElementById('branchRemarks');
        
        console.log('📋 Form elements:', {
            form: !!form,
            branchIdInput: !!branchIdInput,
            branchNameInput: !!branchNameInput,
            phone1Input: !!phone1Input
        });
        
        if (!form || !branchIdInput) {
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
        
        // Load dropdowns
        loadDropdowns();
        
        // Disable form inputs first
        disableFormInputs();
        
        // Set initial button state
        setButtonState('initial');
        
        // Enable Branch ID field for user input
        if (branchIdInput) {
            branchIdInput.removeAttribute('disabled');
            console.log('✅ Branch ID field enabled');
        }
        
        console.log('✅ Form initialization complete');
    }

    // Load Dropdowns (City, Country, Branch Type) - Same pattern as maintain-banks.js
    async function loadDropdowns() {
        console.log('📥 Loading dropdowns...');
        
        try {
            // Load Country dropdown using LookupService
            if (LookupService) {
                const countryOptions = await LookupService.getCountries();
                populateDropdown(countrySelect, countryOptions);
                console.log('✅ Country dropdown loaded with', countryOptions.length, 'options');

                // Load City dropdown using LookupService
                const cityOptions = await LookupService.getCities();
                populateDropdown(citySelect, cityOptions);
                console.log('✅ City dropdown loaded with', cityOptions.length, 'options');
            } else {
                console.warn('⚠️ LookupService not available - City/Country dropdowns not populated');
            }

            // Load Branch Type dropdown using CustomCodesLookupService
            if (CustomCodesLookupService) {
                const branchTypeOptions = await CustomCodesLookupService.getCustomCodeOptions('BranchTypeID');
                populateDropdown(branchTypeSelect, branchTypeOptions);
                console.log('✅ Branch Type dropdown loaded with', branchTypeOptions.length, 'options');
            } else {
                console.warn('⚠️ CustomCodesLookupService not available - Branch Type dropdown not populated');
            }

            console.log('✅ All dropdowns loaded');
        } catch (error) {
            console.error('❌ Error loading dropdowns:', error);
        }
    }

    // Populate Dropdown - Updated to match maintain-banks.js pattern
    // LookupService returns { value, label, order } objects
    function populateDropdown(selectElement, options) {
        if (!selectElement || !options) return;
        
        // Keep the default option
        selectElement.innerHTML = '<option value="">--Select--</option>';
        
        if (Array.isArray(options)) {
            options.forEach(opt => {
                const option = document.createElement('option');
                option.value = opt.value || '';
                option.textContent = opt.label || opt.text || opt.value || '';
                selectElement.appendChild(option);
            });
        }
    }

    // Attach Event Listeners
    function attachEventListeners() {
        console.log('🔗 Attaching event listeners...');
        
        // Action buttons
        const actionButtons = document.querySelectorAll('.btn-action');
        console.log('Found action buttons:', actionButtons.length);
        actionButtons.forEach(button => {
            button.addEventListener('click', handleActionButton);
        });

        // Search button
        const searchButton = document.querySelector('[data-lookup="branchId"]');
        if (searchButton) {
            searchButton.addEventListener('click', handleSearch);
        }

        // Branch ID Enter key
        if (branchIdInput) {
            branchIdInput.addEventListener('keydown', (e) => {
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
            case 'close':
                handleClose();
                break;
        }
    }

    // View Handler
    async function handleView() {
        console.log('View clicked');
        const branchId = branchIdInput?.value.trim();
        
        if (!branchId) {
            showStatus('Please enter a Branch ID to view', 'warning');
            showToast('Please enter a Branch ID', { title: 'View', variant: 'warning', timeoutMs: 3000 });
            branchIdInput?.focus();
            return;
        }
        
        showStatus('Loading branch details...', 'info');
        showToast('Loading branch data...', { title: 'Loading', variant: 'info', timeoutMs: 2000 });
        await loadBranchDetails(branchId);
    }

    // Add Handler
    function handleAdd() {
        console.log('Add clicked');
        
        if (!currentBankID) {
            showStatus('No bank selected. Please select a bank first.', 'error');
            showToast('Please select a bank first', { title: 'Add', variant: 'warning', timeoutMs: 3000 });
            return;
        }
        
        const branchId = branchIdInput?.value.trim();
        if (!branchId) {
            showStatus('Please enter a Branch ID first', 'warning');
            showToast('Please enter a Branch ID first', { title: 'Add', variant: 'warning', timeoutMs: 3000 });
            branchIdInput?.focus();
            return;
        }
        
        currentMode = 'add';
        const preservedBranchId = branchId;
        clearForm();
        branchIdInput.value = preservedBranchId; // Restore the branch ID
        enableFormInputs();
        branchIdInput.disabled = true; // Lock the Branch ID
        setButtonState('add');
        showStatus('Ready to add new branch', 'success');
        branchNameInput?.focus();
    }

    // Edit Handler
    function handleEdit() {
        console.log('Edit clicked');
        
        if (!branchIdInput?.value) {
            showStatus('Please select a branch to edit', 'warning');
            showToast('Please select a branch to edit', { title: 'Edit', variant: 'warning', timeoutMs: 3000 });
            return;
        }
        
        if (!currentBranchData) {
            showStatus('Please load branch data first', 'warning');
            showToast('Please load branch data first', { title: 'Edit', variant: 'warning', timeoutMs: 3000 });
            return;
        }
        
        currentMode = 'edit';
        enableFormInputs();
        branchIdInput.disabled = true; // Lock Branch ID during edit
        setButtonState('edit');
        showStatus('Edit mode enabled', 'info');
        showToast('Edit mode enabled', { title: 'Edit', variant: 'info', timeoutMs: 2000 });
    }

    // Delete Handler
    async function handleDelete() {
        console.log('Delete clicked');
        
        if (!branchIdInput?.value) {
            showStatus('Please select a branch to delete', 'warning');
            showToast('Please select a branch to delete', { title: 'Delete', variant: 'warning', timeoutMs: 3000 });
            return;
        }
        
        if (!currentBranchData) {
            showStatus('Please load branch data first', 'warning');
            showToast('Please load branch data first', { title: 'Delete', variant: 'warning', timeoutMs: 3000 });
            return;
        }

        if (!confirm('Are you sure you want to delete this branch?')) {
            return;
        }

        try {
            showStatus('Deleting branch...', 'info');
            showToast('Deleting branch...', { title: 'Delete', variant: 'info', timeoutMs: 2000 });
            
            const deletePayload = {
                OurBranchID: '0603',
                BankID: currentBankID,
                BranchID: currentBranchData.BranchID,
                NewRecord: currentBranchData.UpdateCount || 0
            };
            
            console.log('🗑️ Delete payload:', deletePayload);
            
            const response = await OtherStaticDataService.deleteBranch(deletePayload);
            
            console.log('🗑️ Delete response:', response);
            
            if (response.success) {
                showStatus('Branch deleted successfully', 'success');
                showToast('Branch deleted successfully!', { title: 'Success', variant: 'success' });
                clearForm();
                disableFormInputs();
                currentBranchData = null;
                currentMode = 'view';
                setButtonState('initial');
                branchIdInput.removeAttribute('disabled');
            } else {
                showStatus(`Delete failed: ${response.message || 'Unknown error'}`, 'error');
                showToast(`Delete failed: ${response.message || 'Unknown error'}`, { title: 'Error', variant: 'error', timeoutMs: 4000 });
            }
        } catch (error) {
            console.error('❌ Delete error:', error);
            showStatus(`Error deleting branch: ${error.message}`, 'error');
            showToast('Error deleting branch: ' + error.message, { title: 'Error', variant: 'error', timeoutMs: 4000 });
        }
    }

    // Save Handler
    async function handleSave() {
        console.log('Save clicked');
        
        if (!validateForm()) {
            return;
        }

        try {
            showStatus('Saving branch...', 'info');
            showToast('Saving branch...', { title: 'Saving', variant: 'info', timeoutMs: 2000 });
            
            const formData = getFormData();
            console.log('💾 Save payload:', formData);
            
            const response = await OtherStaticDataService.addEditBranch(formData);
            
            console.log('💾 Save response:', response);
            
            if (response.success) {
                showToast('Branch saved successfully!', { title: 'Success', variant: 'success' });
                showStatus('Branch saved successfully', 'success');
                
                // Clear the form
                clearForm();
                
                // Disable all form inputs
                disableFormInputs();
                
                // Reset mode to view
                currentMode = 'view';
                currentBranchData = null;
                
                // Reset to initial state
                setButtonState('initial');
                branchIdInput.removeAttribute('disabled');
            } else {
                showStatus(`Save failed: ${response.message || 'Unknown error'}`, 'error');
                showToast(`Save failed: ${response.message || 'Unknown error'}`, { title: 'Error', variant: 'error', timeoutMs: 4000 });
            }
        } catch (error) {
            console.error('❌ Save error:', error);
            showStatus(`Error saving branch: ${error.message}`, 'error');
            showToast('Error saving branch: ' + error.message, { title: 'Error', variant: 'error', timeoutMs: 4000 });
        }
    }

    // Cancel Handler
    function handleCancel() {
        console.log('Cancel clicked');
        if (confirm('Are you sure you want to cancel? Any unsaved changes will be lost.')) {
            clearForm();
            disableFormInputs();
            currentMode = 'view';
            currentBranchData = null;
            setButtonState('initial');
            branchIdInput.removeAttribute('disabled');
            showStatus('Changes cancelled', 'info');
            showToast('Changes cancelled', { title: 'Cancelled', variant: 'info', timeoutMs: 2000 });
        }
    }

    // Close Handler
    function handleClose() {
        console.log('Close clicked');
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ 
                    action: 'submoduleClosed',
                    source: 'Clearing Branches'
                }, '*');
            }
        } catch (error) {
            console.error('Error closing form:', error);
        }
    }

    // Search Handler - Uses SearchService like maintain-banks.js
    async function handleSearch() {
        console.log('Search branch clicked');
        showStatus('Searching for branches...', 'info');
        
        if (!currentBankID) {
            showToast('Please select a bank first', { title: 'Warning', variant: 'warning' });
            return;
        }
        
        if (!SearchService) {
            showToast('SearchService not available', { title: 'Error', variant: 'error' });
            return;
        }
        
        try {
            // Build AdvFilterString with BankID filter
            const advFilterString = `BankID='${currentBankID}'`;
            console.log('🔍 AdvFilterString:', advFilterString);
            
            // Use SearchService.search with ClearingBranchID table (same as maintain-banks.js)
            const result = await SearchService.search({
                WhereStmt: '',
                TableID: 'ClearingBranchID',
                RefID: null,
                PrevOrNext: 0,
                AdvFilterString: advFilterString,
                OperatorID: 'CSADM',
                ModuleID: 2020,
                OurBranchID: '0603',
                SearchKey: null,
                LanguageID: 'en'
            });
            
            console.log('🔍 Branch search result:', result);
            
            // Extract branches data from response
            let branchesData = [];
            if (result.success) {
                if (result.data && Array.isArray(result.data)) {
                    branchesData = result.data;
                } else if (result.Details && Array.isArray(result.Details)) {
                    branchesData = result.Details;
                } else if (result.data && result.data.Details && Array.isArray(result.data.Details)) {
                    branchesData = result.data.Details;
                }
            }
            
            if (branchesData.length > 0) {
                console.log(`✅ Found ${branchesData.length} branches`);
                showBranchSearchModal(branchesData);
            } else {
                console.warn('⚠️ No branches found');
                showStatus('No branches found for this bank. You can add a new branch.', 'info');
                showToast('No branches found for this bank', { title: 'Info', variant: 'info' });
                
                // Enable Add button to allow adding new branch
                const btnAdd = document.querySelector('[data-action="add"]');
                if (btnAdd) {
                    btnAdd.disabled = false;
                    console.log('✅ Add button enabled - ready to add new branch');
                }
            }
        } catch (error) {
            console.error('❌ Branch search error:', error);
            showStatus('Error searching branches: ' + error.message, 'error');
            showToast('Error searching branches: ' + error.message, { title: 'Error', variant: 'error' });
        }
    }
    
    // Show Branch Search Modal
    function showBranchSearchModal(results) {
        const modalId = `branch-search-modal-${Date.now()}`;

        const modalHTML = `
        <div class="modal fade" id="${modalId}" tabindex="-1">
            <div class="modal-dialog modal-dialog-centered modal-dialog-scrollable" style="max-width: 700px;">
                <div class="modal-content">
                    <div class="modal-header" style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white;">
                        <h5 class="modal-title" style="color: white;">Clearing Branches</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body" style="padding: 20px;">
                        <div class="results-header" style="padding: 10px; background: #f0f8ff; border-left: 3px solid #1e7cc4; margin-bottom: 15px;">
                            <strong>Search Results - ${results.length} branch(es) found</strong>
                        </div>
                        <div class="table-responsive" style="max-height: 400px; overflow-y: auto;">
                            <table class="table table-hover table-sm">
                                <thead style="background: linear-gradient(90deg, #1e7cc4 0%, #1a6ba3 100%); color: white; position: sticky; top: 0;">
                                    <tr>
                                        <th style="width: 40px; color: white;">#</th>
                                        <th style="color: white;">Branch ID</th>
                                        <th style="color: white;">Branch Name</th>
                                        <th style="color: white;">SWIFT Code</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${results.map((branch, idx) => `
                                        <tr class="branch-row" data-idx="${idx}" style="cursor: pointer;">
                                            <td>${idx + 1}</td>
                                            <td>${escapeHtml(branch.BranchID || '')}</td>
                                            <td>${escapeHtml(branch.BranchName || '')}</td>
                                            <td>${escapeHtml(branch.SWIFTCode || branch.SwiftCode || '')}</td>
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
        modalEl.querySelectorAll('.branch-row').forEach((row) => {
            row.addEventListener('click', async () => {
                const idx = parseInt(row.dataset.idx);
                const selectedBranch = results[idx];

                console.log('✅ Branch selected:', selectedBranch);

                modal.hide();
                setTimeout(() => modalContainer.remove(), 500);

                if (selectedBranch.BranchID) {
                    branchIdInput.value = selectedBranch.BranchID;
                    await loadBranchDetails(selectedBranch.BranchID);
                }
            });

            row.addEventListener('mouseenter', () => row.style.backgroundColor = '#d0e8ff');
            row.addEventListener('mouseleave', () => row.style.backgroundColor = '');
        });
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

    // Load Branch Details
    async function loadBranchDetails(branchId) {
        console.log('Loading details for branch:', branchId);
        
        if (!currentBankID) {
            showStatus('No bank selected', 'error');
            return;
        }
        
        try {
            showStatus('Loading branch data...', 'info');
            
            const requestData = {
                BankID: currentBankID,
                BranchID: branchId,
                OurBranchID: '0603',
                OperatorID: 'CSADM',
                Direction: 0
            };
            
            console.log('📤 Get branch request:', requestData);
            
            const response = await OtherStaticDataService.getBranches(requestData);
            
            console.log('📥 Get branch response:', response);
            
            if (response.success && response.data) {
                let branchData = null;
                
                // Handle different response formats
                if (response.data.Details01) {
                    if (Array.isArray(response.data.Details01) && response.data.Details01.length > 0) {
                        branchData = response.data.Details01[0];
                    } else if (typeof response.data.Details01 === 'object' && response.data.Details01.BranchID) {
                        branchData = response.data.Details01;
                    }
                }
                
                if (branchData && branchData.BranchID) {
                    currentBranchData = branchData;
                    populateForm(branchData);
                    showStatus('Branch details loaded', 'success');
                    showToast('Branch data loaded successfully', { title: 'Success', variant: 'success', timeoutMs: 3000 });
                    setButtonState('loaded');
                } else {
                    // Branch not found - allow user to add it
                    showStatus('Branch not found. You can add a new one.', 'info');
                    showToast('Branch not found. Click ADD to create new.', { title: 'Not Found', variant: 'info', timeoutMs: 4000 });
                    clearForm();
                    branchIdInput.value = branchId;
                    currentBranchData = null;
                    setButtonState('afterView');
                }
            } else {
                showStatus(`Error loading branch: ${response.message || 'Unknown error'}`, 'error');
                showToast(`Error: ${response.message || 'Unknown error'}`, { title: 'Error', variant: 'error', timeoutMs: 4000 });
                clearForm();
                currentBranchData = null;
                setButtonState('initial');
            }
        } catch (error) {
            console.error('❌ Error loading branch:', error);
            showStatus(`Error loading branch: ${error.message}`, 'error');
            showToast('Error loading branch data: ' + error.message, { title: 'Error', variant: 'error', timeoutMs: 4000 });
            clearForm();
            currentBranchData = null;
            setButtonState('initial');
        }
    }

    // Populate Form
    function populateForm(data) {
        console.log('📝 Populating form with data:', data);
        
        branchIdInput.value = data.BranchID || '';
        branchNameInput.value = data.BranchName || '';
        address1Input.value = data.Address1 || '';
        address2Input.value = data.Address2 || '';
        citySelect.value = data.CityID || '';
        countrySelect.value = data.CountryID || '';
        zipCodeInput.value = data.ZipCode || '';
        emailIdInput.value = data.EmailID || data.EMail || '';
        phone1Input.value = data.Phone1 || '';
        phone2Input.value = data.Phone2 || '';
        mobileInput.value = data.Mobile || '';
        faxNoInput.value = data.FaxNo || data.Fax || '';
        branchTypeSelect.value = data.BranchTypeID || '';
        clearingDaysInput.value = data.ClearingDays || '';
        swiftCodeInput.value = data.SwiftCode || data.SWIFTCode || '';
        isUpcountryBranchCheckbox.checked = data.IsUpcountryBranch === 1 || data.IsUpcountry === 1 || data.IsUpcountryBranch === true;
        branchRemarksInput.value = data.Remarks || '';
        
        // Populate Behind The Scene (now using textContent for span elements)
        document.getElementById('createdBy').textContent = data.CreatedBy || '-';
        document.getElementById('createdOn').textContent = data.CreatedOn ? formatDateTime(data.CreatedOn) : '-';
        document.getElementById('modifiedBy').textContent = data.ModifiedBy || '-';
        document.getElementById('modifiedOn').textContent = data.ModifiedOn ? formatDateTime(data.ModifiedOn) : '-';
        document.getElementById('supervisedBy').textContent = data.SupervisedBy || '-';
        document.getElementById('supervisedOn').textContent = data.SupervisedOn ? formatDateTime(data.SupervisedOn) : '-';
        
        console.log('✅ Form populated successfully');
    }

    // Validate Form
    function validateForm() {
        const errors = [];

        if (!branchIdInput?.value.trim()) {
            errors.push('Branch ID is required');
            branchIdInput?.focus();
        }

        if (!citySelect?.value) {
            errors.push('City is required');
            if (errors.length === 1) citySelect?.focus();
        }

        if (!countrySelect?.value) {
            errors.push('Country is required');
            if (errors.length === 1) countrySelect?.focus();
        }

        if (errors.length > 0) {
            showToast(errors[0], { title: 'Validation Error', variant: 'error', timeoutMs: 4000 });
        }

        if (!phone1Input?.value.trim()) {
            errors.push('Phone 1 is required');
            if (errors.length === 1) phone1Input?.focus();
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
            BranchID: branchIdInput?.value.trim() || '',
            BranchTypeID: branchTypeSelect?.value || '',
            BranchName: branchNameInput?.value.trim() || '',
            Address1: address1Input?.value.trim() || '',
            Address2: address2Input?.value.trim() || '',
            CityID: citySelect?.value || '',
            CountryID: countrySelect?.value || '',
            ZipCode: zipCodeInput?.value.trim() || '',
            Phone1: phone1Input?.value.trim() || '',
            Phone2: phone2Input?.value.trim() || '',
            Mobile: mobileInput?.value.trim() || '',
            Fax: faxNoInput?.value.trim() || '',
            EMail: emailIdInput?.value.trim() || '',
            ContactPerson1: '',
            ContactPerson2: '',
            ourBranchID: '0603',
            Remarks: branchRemarksInput?.value.trim() || '',
            IsUpcountry: isUpcountryBranchCheckbox?.checked ? 1 : 0,
            ClearingCenter: '',
            SWIFTCode: swiftCodeInput?.value.trim() || '',
            CreatedBy: currentMode === 'add' ? 'CSADM' : (currentBranchData?.CreatedBy || 'CSADM'),
            CreatedOn: currentMode === 'add' ? null : (currentBranchData?.CreatedOn || null),
            ModifiedBy: 'CSADM',
            ModifiedOn: null,
            SupervisedBy: '',
            NewRecord: currentMode === 'add' ? 1 : (currentBranchData?.UpdateCount || 0)
        };
    }

    // Set Button States
    function setButtonState(state) {
        console.log('🔘 Setting button state to:', state);
        
        const buttons = {
            view: document.querySelector('[data-action="view"]'),
            add: document.querySelector('[data-action="add"]'),
            edit: document.querySelector('[data-action="edit"]'),
            delete: document.querySelector('[data-action="delete"]'),
            save: document.querySelector('[data-action="save"]'),
            cancel: document.querySelector('[data-action="cancel"]')
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
                // After loading existing branch: EDIT, DELETE, CANCEL active
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
        clearBehindTheScene();
        currentBranchData = null;
    }

    // Enable Form Inputs
    function enableFormInputs() {
        const inputs = form?.querySelectorAll('.bs-input-text:not([readonly]), .bs-select, .form-check-input');
        inputs?.forEach(input => {
            input.removeAttribute('disabled');
        });
        
        // Enable Branch Name field (remove readonly for add/edit mode)
        if (branchNameInput) {
            branchNameInput.removeAttribute('readonly');
            branchNameInput.removeAttribute('disabled');
        }
    }

    // Disable Form Inputs
    function disableFormInputs() {
        if (!form) {
            console.warn('⚠️ Cannot disable inputs - form not initialized');
            return;
        }
        
        const inputs = form.querySelectorAll('.bs-input-text:not([readonly]), .bs-select, .form-check-input');
        inputs.forEach(input => {
            input.setAttribute('disabled', 'disabled');
        });
        
        // Set Branch Name back to readonly and disable it
        if (branchNameInput) {
            branchNameInput.setAttribute('readonly', 'readonly');
            branchNameInput.setAttribute('disabled', 'disabled');
        }
        
        // Keep Branch ID enabled in view mode
        if (currentMode === 'view' && branchIdInput) {
            branchIdInput.removeAttribute('disabled');
        }
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

    // Listen for messages from parent window
    window.addEventListener('message', (event) => {
        if (event.data?.action === 'setBankId' && event.data?.bankId) {
            currentBankID = event.data.bankId;
            console.log('🏦 BankID set from parent:', currentBankID);
        }
    });

    // Expose for testing
    window.ClearingBranchesDebug = {
        loadBranch: (id) => loadBranchDetails(id),
        getCurrentData: () => currentBranchData,
        getCurrentMode: () => currentMode,
        setBankID: (bankId) => { currentBankID = bankId; },
        testAdd: async () => {
            handleAdd();
            branchIdInput.value = 'TEST001';
            branchNameInput.value = 'Test Branch';
            phone1Input.value = '0123456789';
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

    console.log('✅ CLEARING BRANCHES - v1.0 LOADED');
    console.log('🧪 Debug tools: window.ClearingBranchesDebug');
    console.log('📅 Build: February 5, 2026');

})();
