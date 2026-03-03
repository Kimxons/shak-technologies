/**
 * Center Loan Scheme - Main Controller
 * Handles all form interactions, lookups, and CRUD operations
 */

(function() {
    'use strict';

    const SEARCH_MODAL_PREFIX = (window.Environment?.searchModalPrefix || 'mfs').toString();
    const DEFAULT_SEARCH_MODULE_ID = String(window.Environment?.defaultSearchModuleId || window.Environment?.microfinanceModuleId || '5010');

    // =========================================================================
    // State Management
    // =========================================================================
    let currentScheme = null;
    let isEditMode = false;
    let isAddMode = false;
    let activeSearchContext = null;
    let schemesList = [];       // List of all schemes for navigation
    let currentSchemeIndex = -1; // Current position in schemes list
    let lastFetchedSchemeId = ''; // Track last fetched scheme to avoid duplicate fetches

    // =========================================================================
    // Environment Helper
    // =========================================================================
    function getEnv() {
        const e = window.Environment || {};
        const bankID = e.defaultBankId || e.defaultBankID || e.bankID || e.bankId || 
                       sessionStorage.getItem('BankID') || localStorage.getItem('BankID') || '00';
        const ourBranchID = e.branchID || e.branchId || 
                            sessionStorage.getItem('BranchID') || localStorage.getItem('BranchID') || '0325';
        const operatorID = e.operatorID || e.operatorId || 
                           sessionStorage.getItem('OperatorID') || localStorage.getItem('OperatorID') || 'CSADM';
        return { bankID, ourBranchID, operatorID };
    }

    // Format date as MM/DD/YYYY HH:mm:ss (matches OldAPI samples)
    function formatSmallDateTime(date = new Date()) {
        const pad2 = (n) => String(n).padStart(2, '0');
        const mm = pad2(date.getMonth() + 1);
        const dd = pad2(date.getDate());
        const yyyy = String(date.getFullYear());
        const hh = pad2(date.getHours());
        const mi = pad2(date.getMinutes());
        const ss = pad2(date.getSeconds());
        return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
    }

    async function mcsSearchServiceOrCoreApi(payload) {
        const service = window.SearchService;
        if (service && typeof service.search === 'function') {
            return service.search(payload);
        }

        // Same-origin fallback (CSP-safe)
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort('Search request timeout (>30000ms)'), 30000);
        try {
            const response = await fetch('/SearchModal/Search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'same-origin',
                body: JSON.stringify(payload || {}),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const text = await response.text();
                throw new Error(`Search request failed (${response.status}): ${text}`);
            }

            return await response.json();
        } finally {
            clearTimeout(timeoutId);
        }
    }

    // =========================================================================
    // Toast Notifications
    // =========================================================================
    function ensureToastContainer() {
        let el = document.querySelector('[data-kairo-toast-container]');
        if (!el) {
            el = document.getElementById('toastContainer');
        }
        if (el) return el;

        el = document.createElement('div');
        el.className = 'kairo-toast-container';
        el.setAttribute('data-kairo-toast-container', '');
        el.setAttribute('aria-live', 'polite');
        el.setAttribute('aria-relevant', 'additions');
        document.body.appendChild(el);
        return el;
    }

    function showToast(message, { title = 'Notice', variant = 'info', timeoutMs = 5000 } = {}) {
        const container = ensureToastContainer();

        // Remove existing toasts
        container.querySelectorAll('.kairo-toast').forEach(t => t.remove());

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
            } catch { /* ignore */ }
        };

        setTimeout(() => toast.classList.add('is-show'), 0);
        if (timeoutMs && timeoutMs > 0) setTimeout(remove, timeoutMs);
    }

    function showSuccess(message) {
        showToast(message, { variant: 'success' });
    }

    function showError(message) {
        showToast(message, { variant: 'danger' });
    }

    function showWarning(message) {
        showToast(message, { variant: 'warning' });
    }

    function showInfo(message) {
        showToast(message, { variant: 'info' });
    }

    // =========================================================================
    // Search Dialog Management
    // =========================================================================
    let sharedSearchModal = null;

    const searchDialogConfig = {
        'scheme': {
            title: 'Loan Scheme Search',
            targetId: 'SchemeId',
            targetName: 'Description',
            tableID: 'GroupDefaultSchemeID',
            moduleIDOverride: 5060,
            searchFields: [
                { name: 'schemeId', label: 'Scheme ID', column: 'LoanSchemeID' },
                { name: 'schemeName', label: 'Scheme Name', column: 'Description' }
            ],
            displayFields: [
                { key: 'LoanSchemeID', label: 'Scheme ID' },
                { key: 'Description', label: 'Scheme Name' },
                { key: 'GroupProductID', label: 'Group Product ID' }
            ],
            getAdvFilterString: () => {
                const groupProductId = document.getElementById('LoanProductId')?.value?.trim() || '';
                return `GroupProductID ='${groupProductId.replace(/'/g, "''")}' AND SchemeTypeID = 'P'`;
            }
        },
        'loan-product': {
            title: 'Loan Product Search',
            targetId: 'LoanProductId',
            targetName: 'LoanProductName',
            tableID: 'schemeproductid',
            moduleIDOverride: Number(DEFAULT_SEARCH_MODULE_ID),
            getAdvFilterString: () => {
                const { bankID } = getEnv();
                const safeBankId = String(bankID || '').replace(/'/g, "''");
                return `BankID ='${safeBankId}' AND ProductTypeID in ('LN')`;
            },
            searchFields: [
                { name: 'productId', label: 'Product ID', column: 'SchemeProductID' },
                { name: 'productName', label: 'Product Name', column: 'Description' }
            ],
            displayFields: [
                { key: 'SchemeProductID', label: 'Product ID' },
                { key: 'Description', label: 'Product Name' },
                { key: 'ProductTypeID', label: 'Product Type' }
            ]
        },
        'advance-type': {
            title: 'Advance Type Search',
            targetId: 'AdvanceTypeId',
            targetName: 'AdvanceTypeName',
            tableID: 'WFAdvTypeActiveID',
            moduleIDOverride: Number(DEFAULT_SEARCH_MODULE_ID),
            getAdvFilterString: () => {
                const { bankID, ourBranchID } = getEnv();
                const safeBankId = String(bankID || '').replace(/'/g, "''");
                const safeBranchId = String(ourBranchID || '').replace(/'/g, "''");
                return `ModuleID in ('LN') AND BankID ='${safeBankId}' AND OurBranchID ='${safeBranchId}'`;
            },
            searchFields: [
                { name: 'advanceTypeId', label: 'Advance Type ID', column: 'WFAdvTypeID' },
                { name: 'advanceTypeName', label: 'Advance Type Name', column: 'Description' }
            ],
            displayFields: [
                { key: 'WFAdvTypeID', label: 'Advance Type ID' },
                { key: 'Description', label: 'Advance Type Name' }
            ]
        },
        'collection-product': {
            title: 'Collection Product Search',
            targetId: 'CenterCollectionProductId',
            targetName: 'CenterCollectionProductName',
            tableID: 'ProductID',
            moduleIDOverride: Number(DEFAULT_SEARCH_MODULE_ID),
            advFilterString: "ProductTypeID='SB'",
            searchFields: [
                { name: 'productId', label: 'Product ID', column: 'ProductID' },
                { name: 'productName', label: 'Product Name', column: 'Description' }
            ],
            displayFields: [
                { key: 'ProductID', label: 'Product ID' },
                { key: 'Description', label: 'Product Name' },
                { key: 'ProductTypeID', label: 'Product Type' }
            ]
        },
        'deposit-product-primary': {
            title: 'Deposit Product Search',
            targetId: 'DepositProductIdPrimary',
            targetName: 'DepositProductNamePrimary',
            tableID: 'ProductID',
            moduleIDOverride: Number(DEFAULT_SEARCH_MODULE_ID),
            getAdvFilterString: () => {
                const { bankID } = getEnv();
                const safeBankId = String(bankID || '').replace(/'/g, "''");
                return `ProductTypeID in ('SB', 'CS') AND BankID ='${safeBankId}' AND ProductCategoryID='A'`;
            },
            searchFields: [
                { name: 'productId', label: 'Product ID', column: 'ProductID' },
                { name: 'productName', label: 'Product Name', column: 'Description' }
            ],
            displayFields: [
                { key: 'ProductID', label: 'Product ID' },
                { key: 'Description', label: 'Product Name' },
                { key: 'ProductTypeID', label: 'Product Type' }
            ]
        },
        'deposit-product-secondary': {
            title: 'Deposit Product Search',
            targetId: 'DepositProductIdSecondary',
            targetName: 'DepositProductNameSecondary',
            tableID: 'ProductID',
            moduleIDOverride: Number(DEFAULT_SEARCH_MODULE_ID),
            getAdvFilterString: () => {
                const { bankID } = getEnv();
                const safeBankId = String(bankID || '').replace(/'/g, "''");
                return `ProductTypeID in ('SB', 'CS') AND BankID ='${safeBankId}' AND ProductCategoryID='A'`;
            },
            searchFields: [
                { name: 'productId', label: 'Product ID', column: 'ProductID' },
                { name: 'productName', label: 'Product Name', column: 'Description' }
            ],
            displayFields: [
                { key: 'ProductID', label: 'Product ID' },
                { key: 'Description', label: 'Product Name' },
                { key: 'ProductTypeID', label: 'Product Type' }
            ]
        },
        'deposit-product-additional': {
            title: 'Deposit Product Search',
            targetId: 'DepositProductIdAdditional',
            targetName: 'DepositProductNameAdditional',
            tableID: 'ProductID',
            moduleIDOverride: Number(DEFAULT_SEARCH_MODULE_ID),
            getAdvFilterString: () => {
                const { bankID } = getEnv();
                const safeBankId = String(bankID || '').replace(/'/g, "''");
                return `ProductTypeID in ('SB', 'CS') AND BankID ='${safeBankId}' AND ProductCategoryID='A'`;
            },
            searchFields: [
                { name: 'productId', label: 'Product ID', column: 'ProductID' },
                { name: 'productName', label: 'Product Name', column: 'Description' }
            ],
            displayFields: [
                { key: 'ProductID', label: 'Product ID' },
                { key: 'Description', label: 'Product Name' },
                { key: 'ProductTypeID', label: 'Product Type' }
            ]
        }
    };

    function ensureSharedSearchModal() {
        if (sharedSearchModal) return sharedSearchModal;

        if (typeof window.SearchModal !== 'function') {
            return null;
        }

        sharedSearchModal = new window.SearchModal({
            prefix: SEARCH_MODAL_PREFIX,
            moduleID: DEFAULT_SEARCH_MODULE_ID,
            getOperatorId: () => getEnv().operatorID || 'web_portal',
            getOurBranchId: () => getEnv().ourBranchID || '',
            searchFn: async (payload) => {
                const env = getEnv();
                const searchPayload = {
                    OperatorID: env.operatorID || payload.OperatorID || 'web_portal',
                    OurBranchID: env.ourBranchID || payload.OurBranchID || '',
                    ModuleID: payload.ModuleID || DEFAULT_SEARCH_MODULE_ID,
                    ...payload
                };

                // Use the same pattern as Account Maintenance: SearchService if present, else CoreApi OldAPI
                return mcsSearchServiceOrCoreApi(searchPayload);
            },
            onError: (err) => {
                console.error('[CenterLoanScheme] Search error:', err);
                showError(err?.message || 'Search failed. Please try again.');
            }
        });

        return sharedSearchModal;
    }

    function mapSelectedData(lookupType, data) {
        if (!data) return;

        if (lookupType === 'scheme') {
            const schemeId = data.LoanSchemeID || data.SchemeId || data.ID || '';
            const schemeIdField = document.getElementById('SchemeId');
            if (schemeIdField) {
                schemeIdField.value = schemeId;
            }
            handleView();
            return;
        }

        const config = searchDialogConfig[lookupType];
        if (!config) return;

        const idField = document.getElementById(config.targetId);
        const nameField = document.getElementById(config.targetName);

        if (idField) {
            idField.value = data.LoanSchemeID || data.SchemeProductID || data.WFAdvTypeID || data.GroupProductID || data.ProductID || data.ID || '';
        }

        if (nameField) {
            nameField.value = data.Description || data.GroupProductName || data.ProductName || data.AdvanceTypeName || data.Name || '';
        }
    }

    function openSearchDialog(lookupType) {
        const config = searchDialogConfig[lookupType];
        if (!config) {
            showWarning(`Unknown lookup type: ${lookupType}`);
            return;
        }

        const sharedModal = ensureSharedSearchModal();
        if (!sharedModal || !config.tableID) {
            showError('Shared search dialog is not available.');
            return;
        }

        const advFilterString = typeof config.getAdvFilterString === 'function'
            ? config.getAdvFilterString()
            : (config.advFilterString || '');

        sharedModal.open({
            title: config.title,
            tableID: config.tableID,
            moduleIDOverride: config.moduleIDOverride || Number(DEFAULT_SEARCH_MODULE_ID),
            whereStmt: '',
            advFilterString,
            searchFields: config.searchFields || [],
            displayFields: config.displayFields || [],
            onSelect: (record) => mapSelectedData(lookupType, record)
        });
    }

    async function handleSearchSelection(data) {
        if (!activeSearchContext || !data) return;

        const lookupType = Object.keys(searchDialogConfig).find(
            key => searchDialogConfig[key].targetId === activeSearchContext.targetId
        );

        if (lookupType) {
            mapSelectedData(lookupType, data);
        }

        activeSearchContext = null;

        const searchModal = document.getElementById('searchModal');
        if (searchModal) {
            const modal = bootstrap.Modal.getInstance(searchModal);
            if (modal) modal.hide();
        }
    }

    // =========================================================================
    // Form Actions
    // =========================================================================
    async function handleView() {
        const schemeId = document.getElementById('SchemeId')?.value?.trim();
        
        if (!schemeId) {
            showWarning('Please enter a Scheme ID to view');
            return;
        }

        // Reset modes
        isEditMode = false;
        isAddMode = false;

        showInfo(`Loading scheme: ${schemeId}...`);
        
        // Fetch scheme data from API FIRST (before disabling form)
        const scheme = await loadSchemeData(schemeId);
        
        if (scheme) {
            // Results found - set form mode to view with data
            setFormMode('view-with-data');
            
            // Update the scheme index in the list if found
            const foundIndex = schemesList.findIndex(s => 
                (s.LoanSchemeID || s.SchemeId) === schemeId
            );
            if (foundIndex >= 0) {
                currentSchemeIndex = foundIndex;
            }
            showSuccess(`Scheme "${schemeId}" loaded successfully`);
        } else {
            // No results found - enable Add button
            setFormMode('view-no-data');
            showWarning(`Scheme "${schemeId}" not found. You can add a new scheme.`);
        }
    }

    function handleAdd() {
        // Preserve the scheme ID if user has entered one
        const schemeId = document.getElementById('SchemeId')?.value?.trim() || '';
        
        // Clear the form for new entry
        clearForm();
        
        // Restore the scheme ID so user doesn't have to re-enter it
        if (schemeId) {
            setFieldValue('SchemeId', schemeId);
        }
        
        isAddMode = true;
        isEditMode = false;
        setFormMode('add');

        showInfo('Add mode enabled. Fill in the scheme details.');
    }

    function handleEdit() {
        if (!currentScheme) {
            showWarning('Please view a scheme first before editing');
            return;
        }

        isEditMode = true;
        isAddMode = false;
        setFormMode('edit');

        showInfo('Edit mode enabled. Make your changes and save.');
    }

    async function handleDelete() {
        if (!currentScheme) {
            showWarning('Please view a scheme first before deleting');
            return;
        }

        // Show confirmation dialog using the dedicated confirmation dialog
        if (window.showConfirmationDialog) {
            const confirmed = await window.showConfirmationDialog(
                'Confirm Delete',
                `Are you sure you want to delete scheme "${currentScheme.SchemeId}"?`,
                'danger'
            );
            if (confirmed) {
                performDelete();
            }
        } else {
            // Fallback to browser confirm if dialog not available
            if (confirm(`Are you sure you want to delete scheme "${currentScheme.SchemeId}"?`)) {
                performDelete();
            }
        }
    }

    async function performDelete() {
        if (!currentScheme) {
            showError('No scheme loaded to delete');
            return;
        }

        const { bankID } = getEnv();
        const schemeId = currentScheme.SchemeId || currentScheme.LoanSchemeID || '';
        const newRecord = currentScheme.UpdateCount || currentScheme.NewRecord || 0;

        if (!schemeId) {
            showError('Scheme ID is required for deletion');
            return;
        }

        const requestData = {
            BankID: bankID,
            LoanSchemeID: schemeId,
            NewRecord: newRecord
        };

        console.log('Delete request data:', requestData);

        try {
            showInfo('Deleting scheme...');
            
            if (!window.GroupService) {
                throw new Error('GroupService not available');
            }

            const result = await window.GroupService.deleteGroupLoanSchemes(requestData);

            console.log('Delete API response:', result);

            if (result.success) {
                showSuccess(`Scheme "${schemeId}" deleted successfully`);
                
                // Remove from schemes list if present
                const index = schemesList.findIndex(s => 
                    (s.LoanSchemeID || s.SchemeId) === schemeId
                );
                if (index > -1) {
                    schemesList.splice(index, 1);
                    // Adjust current index if needed
                    if (currentSchemeIndex >= schemesList.length) {
                        currentSchemeIndex = schemesList.length - 1;
                    }
                }
                
                // Clear form and reset state
                clearForm();
                setFormMode('default');
            } else {
                showError(result.message || 'Failed to delete scheme');
            }
        } catch (error) {
            console.error('Error deleting scheme:', error);
            showError('Failed to delete scheme: ' + error.message);
        }
    }

    async function handleSave() {
        if (!isAddMode && !isEditMode) {
            showWarning('Please enter Add or Edit mode first');
            return;
        }

        // Validate required fields
        if (!validateForm()) {
            return;
        }

        // Collect form data
        const formData = collectFormData();
        
        // Build request data for API
        const { bankID, operatorID } = getEnv();
        // Format date for SQL smalldatetime: YYYY-MM-DDTHH:mm:ss
        const now = new Date().toISOString().slice(0, 19);
        
        const requestData = {
            BankID: bankID,
            LoanSchemeID: formData.SchemeId,
            Description: formData.Description,
            WFAdvTypeID: formData.AdvanceTypeId || '',
            LoanProductID: formData.LoanProductId,
            PrimaryCollateralReq: formData.PrimaryCollateralRequired ? 1 : 0,
            PrimaryCollateralID: formData.PrimaryCollateral || '',
            PrimaryProductID: formData.DepositProductIdPrimary || '',
            SavingsAmount: formData.SavingsValue || '0',
            IsStaggered: formData.CycleWiseGroupLoanMenu ? 1 : 0,
            SecondaryCollateralReq: formData.SecondaryCollateralRequired ? 1 : 0,
            SecondaryCollateralID: formData.SecondaryCollateral || '',
            SecondaryProductID: formData.DepositProductIdSecondary || '',
            AdditionalCollateralReq: formData.AdditionalCollateralRequired ? 1 : 0,
            AdditionalCollateralID: formData.AdditionalCollateral || '',
            AdditionalProductID: formData.DepositProductIdAdditional || '',
            LoanCycleTypeID: formData.GroupCycleTypeId || '',
            RestrictLoanAmount: formData.LoanAmountRestricted ? 1 : 0,
            SavingToLoanRatio: formData.SavingToLoanRatio || '0',
            SLRecoveryType: formData.SLRecoveryType || '',
            CollectSavingWithInst: formData.CollectSavingWithInstallment ? 1 : 0,
            SavingsTypeID: formData.SavingsCollectionType || '',
            CreatedBy: isAddMode ? operatorID : (currentScheme?.CreatedBy || operatorID),
            CreatedOn: isAddMode ? now : (formatDateForApi(currentScheme?.CreatedOn) || now),
            ModifiedBy: operatorID,
            ModifiedOn: now,
            SupervisedBy: '',
            GroupCollectionProductID: formData.CenterCollectionProductId || '',
            NewRecord: isAddMode ? 1 : (currentScheme?.UpdateCount || 0),
        };
 
        try {
            console.log('Saving scheme with data:', requestData);
            showInfo('Saving scheme...');
            
            // Check if GroupService is available
            if (!window.GroupService || !window.GroupService.addEditGroupLoanSchemes) {
                showError('GroupService not available. Please ensure services are loaded.');
                return;
            }
            
            const response = await window.GroupService.addEditGroupLoanSchemes(requestData);
            
            if (response && (response.success || response.Success || response.ResponseCode === '00' || response.ResponseCode === 0)) {
                if (isAddMode) {
                    showSuccess('Scheme created successfully');
                } else {
                    showSuccess('Scheme updated successfully');
                }
                
                // Reset modes
                isAddMode = false;
                isEditMode = false;
                
                // Reset to default state
                clearForm();
                setFormMode('default');
            } else {
                const errorMsg = response?.ResponseMessage || response?.message || response?.Message || 'Failed to save scheme';
                showError(errorMsg);
            }
        } catch (error) {
            console.error('Error saving scheme:', error);
            showError('An error occurred while saving the scheme. Please try again.');
        }
    }

    function handleCancel() {
        // Reset modes
        isAddMode = false;
        isEditMode = false;
        
        // Clear the form
        clearForm();
        
        // Reset to default state (only View enabled)
        setFormMode('default');
        
        // Update collateral sections visibility (all hidden since checkboxes are cleared)
        updateCollateralSectionsVisibility();
        
        showInfo('Form cleared');
    }

    // =========================================================================
    // Navigation
    // =========================================================================
    async function handlePrevious() {
        if (schemesList.length === 0) {
            showWarning('No schemes loaded for navigation');
            return;
        }

        if (currentSchemeIndex > 0) {
            currentSchemeIndex--;
            const prevScheme = schemesList[currentSchemeIndex];
            await loadSchemeData(prevScheme.LoanSchemeID || prevScheme.SchemeId, -1);
            showInfo(`Scheme ${currentSchemeIndex + 1} of ${schemesList.length}`);
        } else {
            showInfo('Already at the first scheme');
        }
    }

    async function handleNext() {
        if (schemesList.length === 0) {
            showWarning('No schemes loaded for navigation');
            return;
        }

        if (currentSchemeIndex < schemesList.length - 1) {
            currentSchemeIndex++;
            const nextScheme = schemesList[currentSchemeIndex];
            await loadSchemeData(nextScheme.LoanSchemeID || nextScheme.SchemeId, 1);
            showInfo(`Scheme ${currentSchemeIndex + 1} of ${schemesList.length}`);
        } else {
            showInfo('Already at the last scheme');
        }
    }

    // =========================================================================
    // Form Helpers
    // =========================================================================
    function setFormMode(mode) {
        const isReadOnly = mode === 'view';
        
        // Fields that should remain disabled during edit mode (key identifiers)
        const editProtectedFields = ['SchemeId', 'LoanProductId', 'InstallmentFrequency'];
        // Lookup types that should be disabled during edit mode
        const editProtectedLookups = ['scheme', 'loan-product'];
        
        // Determine if this is a view-like mode (default, view-with-data, view-no-data)
        const isViewLikeMode = ['default', 'view-with-data', 'view-no-data'].includes(mode);
        
        // Get all form inputs
        const inputs = document.querySelectorAll('.form-card input:not([readonly]), .form-card select');
        const readonlyInputs = document.querySelectorAll('.form-card input[readonly]');
        const lookupButtons = document.querySelectorAll('.form-card [data-mcs-lookup]');
        
        inputs.forEach(input => {
            // Keep SchemeId always enabled for search functionality (in default/view modes)
            if (input.id === 'SchemeId') {
                // In edit mode, disable SchemeId; in default/view/add modes, keep enabled for search
                input.disabled = (mode === 'edit');
                return;
            }
            
            // Keep LoanProductId and InstallmentFrequency disabled during edit
            if (mode === 'edit' && editProtectedFields.includes(input.id)) {
                input.disabled = true;
                return;
            }
            
            if (isViewLikeMode) {
                input.disabled = true;
            } else {
                input.disabled = false;
            }
        });

        // Keep readonly inputs always readonly (except Description in add mode)
        readonlyInputs.forEach(input => {
            // Allow Description to be editable in add mode
            if (input.id === 'Description' && mode === 'add') {
                input.disabled = false;
                input.readOnly = false;  // Also remove readonly attribute
                input.removeAttribute('readonly');
            } else {
                input.disabled = true;
                input.readOnly = true;
                input.setAttribute('readonly', '');
            }
        });

        // Handle lookup button states
        lookupButtons.forEach(btn => {
            const lookupType = btn.getAttribute('data-mcs-lookup');
            
            if (mode === 'edit' && editProtectedLookups.includes(lookupType)) {
                // Disable protected lookups during edit
                btn.disabled = true;
            } else if (isViewLikeMode) {
                // In view-like modes, only scheme lookup is enabled (for search)
                btn.disabled = (lookupType !== 'scheme');
            } else {
                // In add mode, all lookups are enabled
                btn.disabled = false;
            }
        });

        // Update action buttons state
        updateActionButtons(mode);
    }

    function updateActionButtons(mode) {
        const btnView = document.querySelector('[data-mcs-action="view"]');
        const btnAdd = document.querySelector('[data-mcs-action="add"]');
        const btnEdit = document.querySelector('[data-mcs-action="edit"]');
        const btnDelete = document.querySelector('[data-mcs-action="delete"]');
        const btnSave = document.querySelector('[data-mcs-action="save"]');
        const btnCancel = document.querySelector('[data-mcs-action="cancel"]');

        switch (mode) {
            case 'default':
                // Default state: only View enabled, Cancel enabled to reset
                if (btnView) btnView.disabled = false;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = true;
                if (btnDelete) btnDelete.disabled = true;
                if (btnSave) btnSave.disabled = true;
                if (btnCancel) btnCancel.disabled = false;
                break;
            case 'view-with-data':
                // Results found: Edit/Delete enabled, View/Add disabled
                if (btnView) btnView.disabled = true;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = false;
                if (btnDelete) btnDelete.disabled = false;
                if (btnSave) btnSave.disabled = true;
                if (btnCancel) btnCancel.disabled = false;
                break;
            case 'view-no-data':
                // No results found: Add enabled, View disabled
                if (btnView) btnView.disabled = true;
                if (btnAdd) btnAdd.disabled = false;
                if (btnEdit) btnEdit.disabled = true;
                if (btnDelete) btnDelete.disabled = true;
                if (btnSave) btnSave.disabled = true;
                if (btnCancel) btnCancel.disabled = false;
                break;
            case 'add':
            case 'edit':
                // Add/Edit mode: only Save and Cancel enabled
                if (btnView) btnView.disabled = true;
                if (btnAdd) btnAdd.disabled = true;
                if (btnEdit) btnEdit.disabled = true;
                if (btnDelete) btnDelete.disabled = true;
                if (btnSave) btnSave.disabled = false;
                if (btnCancel) btnCancel.disabled = false;
                break;
        }
    }

    function validateForm() {
        const schemeId = document.getElementById('SchemeId')?.value?.trim();
        const loanProductId = document.getElementById('LoanProductId')?.value?.trim();

        if (!schemeId) {
            showError('Scheme ID is required');
            document.getElementById('SchemeId')?.focus();
            return false;
        }

        if (!loanProductId) {
            showError('Loan Product ID is required');
            document.getElementById('LoanProductId')?.focus();
            return false;
        }

        // Validate Primary Collateral details if checkbox is checked
        const primaryCollateralRequired = document.getElementById('PrimaryCollateralRequired')?.checked;
        if (primaryCollateralRequired) {
            const primaryCollateral = document.getElementById('PrimaryCollateral')?.value?.trim();
            const depositProductPrimary = document.getElementById('DepositProductIdPrimary')?.value?.trim();

            if (!primaryCollateral) {
                showError('Primary Collateral is required when Primary Collateral is checked');
                document.getElementById('PrimaryCollateral')?.focus();
                return false;
            }
            if (!depositProductPrimary) {
                showError('Deposit Product ID is required for Primary Collateral');
                document.getElementById('DepositProductIdPrimary')?.focus();
                return false;
            }
        }

        // Validate Secondary Collateral details if checkbox is checked
        const secondaryCollateralRequired = document.getElementById('SecondaryCollateralRequired')?.checked;
        if (secondaryCollateralRequired) {
            const secondaryCollateral = document.getElementById('SecondaryCollateral')?.value?.trim();
            const depositProductSecondary = document.getElementById('DepositProductIdSecondary')?.value?.trim();

            if (!secondaryCollateral) {
                showError('Secondary Collateral is required when Secondary Collateral is checked');
                document.getElementById('SecondaryCollateral')?.focus();
                return false;
            }
            if (!depositProductSecondary) {
                showError('Deposit Product ID is required for Secondary Collateral');
                document.getElementById('DepositProductIdSecondary')?.focus();
                return false;
            }
        }

        // Validate Additional Collateral details if checkbox is checked
        const additionalCollateralRequired = document.getElementById('AdditionalCollateralRequired')?.checked;
        if (additionalCollateralRequired) {
            const additionalCollateral = document.getElementById('AdditionalCollateral')?.value?.trim();
            const depositProductAdditional = document.getElementById('DepositProductIdAdditional')?.value?.trim();

            if (!additionalCollateral) {
                showError('Additional Collateral is required when Additional Collateral is checked');
                document.getElementById('AdditionalCollateral')?.focus();
                return false;
            }
            if (!depositProductAdditional) {
                showError('Deposit Product ID is required for Additional Collateral');
                document.getElementById('DepositProductIdAdditional')?.focus();
                return false;
            }
        }

        return true;
    }

    function collectFormData() {
        return {
            SchemeId: document.getElementById('SchemeId')?.value?.trim() || '',
            Description: document.getElementById('Description')?.value?.trim() || '',
            LoanProductId: document.getElementById('LoanProductId')?.value?.trim() || '',
            LoanProductName: document.getElementById('LoanProductName')?.value?.trim() || '',
            GroupCycleTypeId: document.getElementById('GroupCycleTypeId')?.value || '',
            CycleWiseGroupLoanMenu: document.getElementById('CycleWiseGroupLoanMenu')?.checked || false,
            InstallmentFrequency: document.getElementById('InstallmentFrequency')?.value?.trim() || '',
            LoanAmountRestricted: document.getElementById('LoanAmountRestricted')?.checked || false,
            AdvanceTypeId: document.getElementById('AdvanceTypeId')?.value?.trim() || '',
            CenterCollectionProductId: document.getElementById('CenterCollectionProductId')?.value?.trim() || '',
            PrimaryCollateralRequired: document.getElementById('PrimaryCollateralRequired')?.checked || false,
            SecondaryCollateralRequired: document.getElementById('SecondaryCollateralRequired')?.checked || false,
            AdditionalCollateralRequired: document.getElementById('AdditionalCollateralRequired')?.checked || false,
            PrimaryCollateral: document.getElementById('PrimaryCollateral')?.value || '',
            DepositProductIdPrimary: document.getElementById('DepositProductIdPrimary')?.value?.trim() || '',
            SavingToLoanRatio: document.getElementById('SavingToLoanRatio')?.value?.trim() || '',
            SLRecoveryType: document.getElementById('SLRecoveryType')?.value || '',
            CollectSavingWithInstallment: document.getElementById('CollectSavingWithInstallment')?.checked || false,
            SavingsCollectionType: document.getElementById('SavingsCollectionType')?.value || '',
            SavingsValue: document.getElementById('SavingsValue')?.value?.trim() || '',
            SecondaryCollateral: document.getElementById('SecondaryCollateral')?.value || '',
            DepositProductIdSecondary: document.getElementById('DepositProductIdSecondary')?.value?.trim() || '',
            AdditionalCollateral: document.getElementById('AdditionalCollateral')?.value || '',
            DepositProductIdAdditional: document.getElementById('DepositProductIdAdditional')?.value?.trim() || ''
        };
    }

    function populateForm(data) {
        if (!data) return;

        // Scheme Identification
        setFieldValue('SchemeId', data.SchemeId || data.LoanSchemeID);
        setFieldValue('Description', data.Description);
        setFieldValue('LoanProductId', data.LoanProductId || data.GroupProductID);
        setFieldValue('LoanProductName', data.LoanProductName || data.GroupProductName);
        setFieldValue('GroupCycleTypeId', data.GroupCycleTypeId);
        setCheckboxValue('CycleWiseGroupLoanMenu', data.CycleWiseGroupLoanMenu);
        setFieldValue('InstallmentFrequency', data.InstallmentFrequency);
        setCheckboxValue('LoanAmountRestricted', data.LoanAmountRestricted);
        setFieldValue('AdvanceTypeId', data.AdvanceTypeId);
        setFieldValue('AdvanceTypeName', data.AdvanceTypeName);
        setFieldValue('CenterCollectionProductId', data.CenterCollectionProductId);
        setFieldValue('CenterCollectionProductName', data.CenterCollectionProductName);


        setCheckboxValue('PrimaryCollateralRequired', data.PrimaryCollateralRequired);
        setCheckboxValue('SecondaryCollateralRequired', data.SecondaryCollateralRequired);
        setCheckboxValue('AdditionalCollateralRequired', data.AdditionalCollateralRequired);

        // Primary Collateral Details
        setFieldValue('PrimaryCollateral', data.PrimaryCollateral);
        setFieldValue('PrimaryCollateralName', data.PrimaryCollateralID || '');
        setFieldValue('DepositProductIdPrimary', data.DepositProductIdPrimary);
        setFieldValue('DepositProductNamePrimary', data.DepositProductNamePrimary);
        setFieldValue('SavingToLoanRatio', data.SavingToLoanRatio);
        setFieldValue('SLRecoveryType', data.SLRecoveryType);
        setCheckboxValue('CollectSavingWithInstallment', data.CollectSavingWithInst);
        setFieldValue('SavingsCollectionType', data.SavingsTypeID);
        setFieldValue('SavingsValue', data.SavingsAmount);

        // Secondary Collateral Details
        setFieldValue('SecondaryCollateral', data.SecondaryCollateral);
        setFieldValue('SecondaryCollateralName', data.SecondaryCollateralID || '');
        setFieldValue('DepositProductIdSecondary', data.DepositProductIdSecondary);
        setFieldValue('DepositProductNameSecondary', data.DepositProductNameSecondary);

        // Additional Collateral Details
        setFieldValue('AdditionalCollateral', data.AdditionalCollateral);
        setFieldValue('AdditionalCollateralName', data.AdditionalCollateralID || '');
        setFieldValue('DepositProductIdAdditional', data.DepositProductIdAdditional);
        setFieldValue('DepositProductNameAdditional', data.DepositProductNameAdditional);

        // Audit fields (use display-formatted values)
        setFieldValue('CreatedBy', data.CreatedBy);
        setFieldValue('CreatedOn', data.CreatedOnDisplay || data.CreatedOn);
        setFieldValue('ModifiedBy', data.ModifiedBy);
        setFieldValue('ModifiedOn', data.ModifiedOnDisplay || data.ModifiedOn);
        setFieldValue('SupervisedBy', data.SupervisedBy);
        setFieldValue('SupervisedOn', data.SupervisedOnDisplay || data.SupervisedOn);

        // Update collateral sections visibility based on checkbox states
        updateCollateralSectionsVisibility();
    }

    /**
     * Show/hide collateral detail sections based on checkbox states
     * Also clears the section fields when unchecked
     */
    function updateCollateralSectionsVisibility() {
        const primaryRequired = document.getElementById('PrimaryCollateralRequired')?.checked;
        const secondaryRequired = document.getElementById('SecondaryCollateralRequired')?.checked;
        const additionalRequired = document.getElementById('AdditionalCollateralRequired')?.checked;

        // Get the collateral detail sections
        const primarySection = document.querySelector('[data-section="primary-collateral"]');
        const secondarySection = document.querySelector('[data-section="secondary-collateral"]');
        const additionalSection = document.querySelector('[data-section="additional-collateral"]');

        // Show/hide based on checkbox state and clear fields when unchecked
        if (primarySection) {
            primarySection.style.display = primaryRequired ? '' : 'none';
            if (!primaryRequired) {
                clearCollateralSection('primary');
            }
        }
        if (secondarySection) {
            secondarySection.style.display = secondaryRequired ? '' : 'none';
            if (!secondaryRequired) {
                clearCollateralSection('secondary');
            }
        }
        if (additionalSection) {
            additionalSection.style.display = additionalRequired ? '' : 'none';
            if (!additionalRequired) {
                clearCollateralSection('additional');
            }
        }
    }

    /**
     * Clear all fields in a specific collateral section
     */
    function clearCollateralSection(type) {
        if (type === 'primary') {
            // Clear Primary Collateral fields
            setFieldValue('PrimaryCollateral', '');
            setFieldValue('DepositProductIdPrimary', '');
            setFieldValue('DepositProductNamePrimary', '');
            setFieldValue('SavingToLoanRatio', '');
            setFieldValue('SLRecoveryType', '');
            setFieldValue('SavingsCollectionType', '');
            setFieldValue('SavingsValue', '');
            // Uncheck the checkbox
            const collectSavingCheckbox = document.getElementById('CollectSavingWithInstallment');
            if (collectSavingCheckbox) {
                collectSavingCheckbox.checked = false;
            }
        } else if (type === 'secondary') {
            // Clear Secondary Collateral fields
            setFieldValue('SecondaryCollateral', '');
            setFieldValue('DepositProductIdSecondary', '');
            setFieldValue('DepositProductNameSecondary', '');
        } else if (type === 'additional') {
            // Clear Additional Collateral fields
            setFieldValue('AdditionalCollateral', '');
            setFieldValue('DepositProductIdAdditional', '');
            setFieldValue('DepositProductNameAdditional', '');
        }
    }

    function setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
        }
    }

    /**
     * Convert any value to a boolean for checkbox
     */
    function toBoolean(value) {
        if (value === true || value === 1 || value === '1' || value === 'true' || value === 'True' || value === 'TRUE') {
            return true;
        }
        return false;
    }

    function setCheckboxValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (!field) {
            console.warn(`Checkbox field not found: ${fieldId}`);
            return;
        }
        
        const isChecked = toBoolean(value);
        
        // Direct property assignment is the most reliable way
        field.checked = isChecked;
        
        // Force the visual state by directly manipulating the element
        if (isChecked) {
            field.setAttribute('checked', 'checked');
        } else {
            field.removeAttribute('checked');
        }
        
        // Add/remove visual indicator class for checked state in view mode
        const formCheck = field.closest('.form-check');
        if (formCheck) {
            if (isChecked) {
                formCheck.classList.add('is-checked-view');
            } else {
                formCheck.classList.remove('is-checked-view');
            }
        }
   }

    function clearForm() {
        const form = document.querySelector('.form-card');
        if (!form) return;

        // Clear all inputs
        form.querySelectorAll('input[type="text"], input[type="number"]').forEach(input => {
            input.value = '';
        });

        // Uncheck all checkboxes
        form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        // Reset selects to first option
        form.querySelectorAll('select').forEach(select => {
            select.selectedIndex = 0;
        });

        currentScheme = null;
        lastFetchedSchemeId = ''; // Reset to allow re-fetching same scheme
    }

    async function loadSchemeData(schemeId, direction = 0) {
        const { bankID, ourBranchID, operatorID } = getEnv();
        
        const requestData = {
            BankID: bankID,
            OurBranchID: ourBranchID,
            LoanSchemeID: schemeId || '',
            OperatorID: operatorID,
            Direction: direction
        };

        try {
            // Check if GroupService is available
            if (!window.GroupService) {
                showError('GroupService not available. Please ensure services are loaded.');
                console.error('GroupService not found');
                return null;
            }

            const response = await window.GroupService.getGroupLoanSchemes(requestData);

            // Handle response - data is in response.data.Details01
            const details = response?.data?.Details01 || response?.ResponseData || [];
            const data = Array.isArray(details) ? details[0] : details;

            if (data && data.LoanSchemeID) {
                // Log raw API checkbox values for debugging


                // Map API response to form fields based on actual response structure
                currentScheme = {
                    SchemeId: data.LoanSchemeID || '',
                    Description: data.Description || '',
                    LoanProductId: data.LoanProductID || '',
                    LoanProductName: data.LoanProductName || '',
                    LoanProductCurrencyId: data.LoanProductCurrencyID || '',
                    GroupCycleTypeId: data.LoanCycleTypeID || '',
                    CycleWiseGroupLoanMenu: toBoolean(data.IsStaggered),
                    InstallmentFrequency: data.InstallmentFrequency || data.InstallmentFrequencyID || '',
                    LoanAmountRestricted: toBoolean(data.RestrictLoanAmount),
                    AdvanceTypeId: data.WFAdvTypeID || '',
                    AdvanceTypeName: data.WFAdvTypeName || '',
                    CenterCollectionProductId: data.GroupCollectionProductID || '',
                    CenterCollectionProductName: data.GroupCollectionProductName || '',
                    // Required Collateral checkboxes - use toBoolean for proper conversion
                    PrimaryCollateralRequired: toBoolean(data.PrimaryCollateralReq),
                    SecondaryCollateralRequired: toBoolean(data.SecondaryCollateralReq),
                    AdditionalCollateralRequired: toBoolean(data.AdditionalCollateralReq),
                    // Primary Collateral Details
                    PrimaryCollateral: data.PrimaryCollateralID || '',
                    PrimaryCollateralName: data.PrimaryCollateralID || '', // Use ID as name if no separate name field
                    DepositProductIdPrimary: data.PrimaryProductID || '',
                    DepositProductNamePrimary: data.PrimaryProductName || '',
                    SavingToLoanRatio: data.SavingToLoanRatio || '',
                    SLRecoveryType: data.SLRecoveryType || '',
                    CollectSavingWithInstallment: toBoolean(data.CollectSavingWithInst),
                    SavingsCollectionType: data.SavingsTypeID || '',
                    SavingsValue: data.SavingsAmount || '',
                    // Secondary Collateral Details
                    SecondaryCollateral: data.SecondaryCollateralID || '',
                    SecondaryCollateralName: data.SecondaryCollateralID || '',
                    DepositProductIdSecondary: data.SecondaryProductID || '',
                    DepositProductNameSecondary: data.SecondaryProductName || '',
                    // Additional Collateral Details
                    AdditionalCollateral: data.AdditionalCollateralID || '',
                    AdditionalCollateralName: data.AdditionalCollateralID || '',
                    DepositProductIdAdditional: data.AdditionalProductID || '',
                    DepositProductNameAdditional: data.AdditionalProductName || '',
                    // Additional fields
                    MinLoanAmount: data.MinLoanAmount || '',
                    MaxLoanAmount: data.MaxLoanAmount || '',
                    MinLoanTerm: data.MinLoanTerm || '',
                    MaxLoanTerm: data.MaxLoanTerm || '',
                    IsUsed: data.IsUsed || 0,
                    UpdateCount: data.UpdateCount || 0,
                    CanChangeLoanProductID: data.CanChangeLoanProductID || 0,
                    // Audit fields (store raw values for API, formatted for display)
                    CreatedBy: data.CreatedBy || '',
                    CreatedOn: data.CreatedOn || '',
                    CreatedOnDisplay: formatDateTime(data.CreatedOn),
                    ModifiedBy: data.ModifiedBy || '',
                    ModifiedOn: data.ModifiedOn || '',
                    ModifiedOnDisplay: formatDateTime(data.ModifiedOn),
                    SupervisedBy: data.SupervisedBy || '',
                    SupervisedOn: data.SupervisedOn || '',
                    SupervisedOnDisplay: formatDateTime(data.SupervisedOn)
                };

                populateForm(currentScheme);
                
                
                updateActionButtons('view');
                return currentScheme;
            } else if (response?.success === false || response?.code !== '00') {
                showError(response?.message || 'Failed to load scheme');
                return null;
            } else {
                showWarning('No scheme found with the provided ID');
                return null;
            }
        } catch (error) {
            console.error('Error loading scheme data:', error);
            showError('Failed to load scheme data: ' + (error.message || 'Unknown error'));
            return null;
        }
    }

    /**
     * Format date/time for display using GlobalUtils
     */
    function formatDateTime(dateStr) {
        if (!dateStr) return '';
        if (window.GlobalUtils && window.GlobalUtils.formatDateTime) {
            return window.GlobalUtils.formatDateTime(dateStr);
        }
        // Fallback if GlobalUtils not available
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            return date.toLocaleString();
        } catch {
            return dateStr;
        }
    }

    /**
     * Format date/time for API submission using GlobalUtils (SQL smalldatetime compatible)
     */
    function formatDateForApi(dateStr) {
        if (!dateStr) return '';
        if (window.GlobalUtils && window.GlobalUtils.parseDateInput) {
            const isoDate = window.GlobalUtils.parseDateInput(dateStr);
            if (isoDate) {
                // Add time component for smalldatetime
                return isoDate + 'T00:00:00';
            }
        }
        // Fallback if GlobalUtils not available
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return '';
            // Format as YYYY-MM-DDTHH:mm:ss for SQL smalldatetime
            return date.toISOString().slice(0, 19);
        } catch {
            return '';
        }
    }

    /**
     * Fetch all loan schemes for navigation (on page load)
     */
    async function fetchAllSchemes() {
        const { bankID, ourBranchID, operatorID } = getEnv();
        
        const requestData = {
            BankID: bankID,
            OurBranchID: ourBranchID,
            LoanSchemeID: '',  // Empty to get all schemes
            OperatorID: operatorID,
            Direction: 0       // 0 for all/first
        };

        try {
            if (!window.GroupService) {
                console.warn('GroupService not available for fetching schemes list');
                return;
            }

            const response = await window.GroupService.getGroupLoanSchemes(requestData);
            
            // Handle response - data is in response.data.Details01
            const details = response?.data?.Details01 || response?.ResponseData || [];
            schemesList = Array.isArray(details) ? details : [details];
            
            // Filter out empty entries
            schemesList = schemesList.filter(s => s && s.LoanSchemeID);
            

            // Load the first scheme if available
            if (schemesList.length > 0) {
                currentSchemeIndex = 0;
                await loadSchemeData(schemesList[0].LoanSchemeID);
            }
        } catch (error) {
            console.error('Error fetching all schemes:', error);
        }
    }

    // =========================================================================
    // Child Form Management
    // =========================================================================
    function openChildForm(formName) {
        const childInline = document.querySelector('[data-child-inline]');
        const childIframe = document.querySelector('[data-child-iframe]');
        const mainForm = document.querySelector('[data-main-form]');
        const mainContainer = document.querySelector('.main-container');

        if (!childInline || !childIframe || !mainForm || !mainContainer) {
            console.error('Required elements for child form not found.');
            return;
        }

        const formConfig = {
            'center-loan-menu': { url: 'dataEntry/center-loan-menu.html' },
            'products': { url: 'dataEntry/products.html' }
        };

        const config = formConfig[formName];
        if (config) {
            
            // Animate: Hide main form, show child form
            mainContainer.classList.add('child-opening');
            childInline.hidden = false;
            
            // Load iframe
            childIframe.onload = function() {
            };
            childIframe.onerror = function() {
                console.error('Iframe failed to load:', config.url);
            };
            childIframe.src = config.url;
            
            // Small delay to ensure CSS transitions work
            requestAnimationFrame(() => {
                requestAnimationFrame(() => {
                    mainContainer.classList.add('child-open');
                    childInline.classList.add('is-visible');
                    childInline.classList.remove('is-closing');
                    
                    // Clean up opening state after animation
                    setTimeout(() => {
                        mainContainer.classList.remove('child-opening');
                        mainForm.hidden = true;
                    }, 350);
                });
            });
        } else {
            console.error('No config found for form:', formName);
        }
    }

    function closeChildForm() {
        const childInline = document.querySelector('[data-child-inline]');
        const childIframe = document.querySelector('[data-child-iframe]');
        const mainForm = document.querySelector('[data-main-form]');
        const mainContainer = document.querySelector('.main-container');

        if (!childInline || !mainContainer) return;
        
        // Animate: Hide child form, show main form
        mainContainer.classList.add('child-closing');
        childInline.classList.add('is-closing');
        childInline.classList.remove('is-visible');
        
        // Show main form immediately for the animation
        if (mainForm) mainForm.hidden = false;
        
        // Wait for animation to complete
        setTimeout(() => {
            childInline.hidden = true;
            mainContainer.classList.remove('child-open', 'child-closing');
            if (childIframe) childIframe.src = 'about:blank';
        }, 350);
    }

    // =========================================================================
    // Sidebar Management
    // =========================================================================
    function initSidebar() {
        // Sidebar toggle
        const sidebarToggle = document.getElementById('sidebarToggle');
        const sidebar = document.getElementById('main-sidebar');
        
        if (sidebarToggle && sidebar) {
            sidebarToggle.addEventListener('click', function() {
                sidebar.classList.toggle('collapsed');
                const isExpanded = !sidebar.classList.contains('collapsed');
                sidebarToggle.setAttribute('aria-expanded', isExpanded);
            });
        }

        // Nav section toggles
        document.querySelectorAll('.nav-arrow--card').forEach(arrow => {
            arrow.addEventListener('click', function(e) {
                e.stopPropagation();
                const section = this.closest('.nav-section');
                const items = section.querySelector('.nav-items--card');
                const isOpen = section.classList.toggle('is-open');
                
                this.setAttribute('aria-expanded', isOpen);
                items.hidden = !isOpen;
                
                const icon = this.querySelector('i');
                icon.className = isOpen ? 'bi bi-chevron-up' : 'bi bi-chevron-down';
            });
        });

        // Sidebar item click handlers
        document.querySelectorAll('.sidebar-item[data-child-form]').forEach(item => {
            item.addEventListener('click', function() {
                // Check if a scheme is loaded before allowing access to data entry pages
                if (!currentScheme) {
                    showWarning('Please load a scheme first before accessing data entry pages.');
                    return;
                }
                
                const formName = this.dataset.childForm;
                openChildForm(formName);
            });
        });

        // Sidebar search functionality
        const submoduleSearch = document.getElementById('submoduleSearch');
        const navSections = document.querySelectorAll('.nav-section[data-nav-section]');

        if (submoduleSearch && navSections.length > 0) {
            submoduleSearch.addEventListener('input', function() {
                const searchTerm = this.value.toLowerCase().trim();

                navSections.forEach(section => {
                    const items = section.querySelectorAll('.sidebar-item');
                    let sectionHasVisibleItems = false;

                    items.forEach(item => {
                        const title = item.querySelector('.sidebar-item__title')?.textContent.toLowerCase() || '';
                        const description = item.querySelector('.sidebar-item__description')?.textContent.toLowerCase() || '';
                        const isMatch = title.includes(searchTerm) || description.includes(searchTerm);
                        
                        item.hidden = !isMatch;
                        if (isMatch) {
                            sectionHasVisibleItems = true;
                        }
                    });

                    // Toggle section visibility based on search results
                    const navItems = section.querySelector('.nav-items--card');
                    const navArrow = section.querySelector('.nav-arrow--card');
                    const arrowIcon = navArrow?.querySelector('i');

                    if (searchTerm.length > 0) {
                        if (sectionHasVisibleItems) {
                            if (!section.classList.contains('is-open')) {
                                section.classList.add('is-open');
                                navItems.hidden = false;
                                if (navArrow) navArrow.setAttribute('aria-expanded', 'true');
                                if (arrowIcon) arrowIcon.className = 'bi bi-chevron-up';
                            }
                        } else {
                            if (section.classList.contains('is-open')) {
                                section.classList.remove('is-open');
                                navItems.hidden = true;
                                if (navArrow) navArrow.setAttribute('aria-expanded', 'false');
                                if (arrowIcon) arrowIcon.className = 'bi bi-chevron-down';
                            }
                        }
                    } else {
                        items.forEach(item => item.hidden = false);
                    }
                });
            });
        }
    }

    // =========================================================================
    // Section Toggles
    // =========================================================================
    function initSectionToggles() {
        document.querySelectorAll('[data-section-toggle]').forEach(header => {
            header.addEventListener('click', function() {
                const section = this.closest('.form-section');
                const content = section.querySelector('[data-section-content]');
                const btn = this.querySelector('.section-toggle-btn');
                const icon = btn.querySelector('i');
                const isExpanded = btn.getAttribute('aria-expanded') === 'true';
                
                btn.setAttribute('aria-expanded', !isExpanded);
                content.hidden = isExpanded;
                icon.className = isExpanded ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
            });
        });
    }

    // =========================================================================
    // Event Listeners
    // =========================================================================
    function initEventListeners() {
        // Lookup button handlers
        document.querySelectorAll('[data-mcs-lookup]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                e.stopPropagation();
                
                const lookupType = this.getAttribute('data-mcs-lookup');
                
                // Scheme search is always available (needed to view/load a scheme)
                // Other lookups require Add or Edit mode
                if (lookupType !== 'scheme' && !canUseSearchDialogs()) {
                    showWarning('Search is only available in Add or Edit mode.');
                    return;
                }
                
                openSearchDialog(lookupType);
            });
        });

        // Action button handlers
        document.querySelectorAll('[data-mcs-action]').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const actionType = this.getAttribute('data-mcs-action');
                
                switch (actionType) {
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
                }
            });
        });

        // Navigation buttons
        document.querySelectorAll('.btn-nav').forEach(btn => {
            btn.addEventListener('click', function(e) {
                e.preventDefault();
                const label = this.getAttribute('aria-label') || '';
                
                if (label.toLowerCase().includes('previous')) {
                    handlePrevious();
                } else if (label.toLowerCase().includes('next')) {
                    handleNext();
                }
            });
        });

        // Collateral checkbox change handlers - toggle section visibility
        const collateralCheckboxes = ['PrimaryCollateralRequired', 'SecondaryCollateralRequired', 'AdditionalCollateralRequired'];
        collateralCheckboxes.forEach(checkboxId => {
            const checkbox = document.getElementById(checkboxId);
            if (checkbox) {
                checkbox.addEventListener('change', updateCollateralSectionsVisibility);
            }
        });

        // Listen for messages from child iframes
        window.addEventListener('message', function(event) {
            if (event.data === 'closeChildForm' || event.data?.action === 'submoduleClosed') {
                closeChildForm();
            }
            
            // Handle request for scheme data from child forms (e.g., Products)
            if (event.data?.action === 'requestSchemeData') {
                const childIframe = document.querySelector('[data-child-iframe]');
                if (childIframe && childIframe.contentWindow && currentScheme) {
                    childIframe.contentWindow.postMessage({
                        action: 'schemeData',
                        data: currentScheme
                    }, '*');
                }
            }
            
            // Handle request to open search dialog from child iframe (center-loan-menu)
            if (event.data?.action === 'openSearchDialog') {
                openSearchDialogForChild(event.data);
            }
            
            // Handle search selection from modal iframe
            // Support multiple message formats from different search dialogs
            if (event.data?.type === 'GROUP_LOAN_SCHEME_SELECTED') {
                // Group Loan Scheme search dialog format
                handleSearchSelection(event.data.data || {
                    LoanSchemeID: event.data.schemeId,
                    Description: event.data.schemeName,
                    GroupProductID: event.data.groupProductId
                });
            } else if (event.data?.type === 'GROUP_PRODUCT_SELECTED') {
                // Group Product search dialog format
                handleSearchSelection(event.data.data || {
                    GroupProductID: event.data.productId,
                    GroupProductName: event.data.productName
                });
            } else if (event.data?.type === 'SCHEME_PRODUCT_SELECTED') {
                // Scheme Product search dialog format (for loan products)
                handleSearchSelection(event.data.data || {
                    SchemeProductID: event.data.productId,
                    Description: event.data.productName,
                    ProductTypeID: event.data.productTypeId
                });
            } else if (event.data?.type === 'WF_ADVANCE_TYPE_SELECTED') {
                // WF Advance Type search dialog format
                handleSearchSelection(event.data.data || {
                    WFAdvTypeID: event.data.advanceTypeId,
                    Description: event.data.advanceTypeName,
                    ModuleID: event.data.moduleId
                });
            } else if (event.data?.type === 'PRODUCT_SELECTED') {
                // Generic Product search dialog format (for collection/deposit products)
                handleSearchSelection(event.data.data || {
                    ProductID: event.data.productId,
                    Description: event.data.productName,
                    ProductTypeID: event.data.productTypeId,
                    CurrencyID: event.data.currencyId
                });
            } else if (event.data?.type === 'LOAN_CYCLE_SELECTED') {
                // Loan Cycle search - relay to child iframe
                relaySearchSelectionToChild(event.data);
            } else if (event.data?.action === 'searchSelected' && event.data?.data) {
                // Generic search selected format
                handleSearchSelection(event.data.data);
            }
        });
        
        // Track which child requested the search
        let childSearchSource = null;
        
        /**
         * Open search dialog requested by child iframe
         */
        function openSearchDialogForChild(requestData) {
            const { lookupType, title, url, source } = requestData;
            
            // Store which child requested the search
            childSearchSource = source;
            
            const searchModal = document.getElementById('searchModal');
            const searchModalTitle = document.getElementById('searchModalTitle');
            const searchModalFrame = document.getElementById('searchModalFrame');

            if (!searchModal || !searchModalFrame) {
                console.error('Search modal elements not found');
                return;
            }

            // Set modal title
            if (searchModalTitle) {
                searchModalTitle.textContent = title || 'Search';
            }
            
            // Set iframe source with noheader parameter
            const separator = url.includes('?') ? '&' : '?';
            searchModalFrame.src = url + separator + 'noheader=1';

            // Show the modal
            const modal = new bootstrap.Modal(searchModal);
            modal.show();
        }
        
        /**
         * Relay search selection back to child iframe
         */
        function relaySearchSelectionToChild(selectionData) {
            const childIframe = document.querySelector('[data-child-iframe]');
            if (childIframe && childIframe.contentWindow) {
                childIframe.contentWindow.postMessage(selectionData, '*');
            }
            
            // Close the search modal
            const searchModal = document.getElementById('searchModal');
            if (searchModal) {
                const bsModal = bootstrap.Modal.getInstance(searchModal);
                if (bsModal) {
                    bsModal.hide();
                }
            }
            
            // Clear the source tracker
            childSearchSource = null;
        }

        // Search modal close cleanup
        const searchModal = document.getElementById('searchModal');
        if (searchModal) {
            searchModal.addEventListener('hidden.bs.modal', function() {
                const searchModalFrame = document.getElementById('searchModalFrame');
                if (searchModalFrame) {
                    searchModalFrame.src = 'about:blank';
                }
                activeSearchContext = null;
            });
        }

        // Field blur handlers for auto-lookup
        setupFieldBlurHandlers();
    }

    function setupFieldBlurHandlers() {
        // Scheme ID - fetch details on blur or Enter key
        const schemeIdField = document.getElementById('SchemeId');
        if (schemeIdField) {
            // Handle Enter key press
            schemeIdField.addEventListener('keydown', async function(e) {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    const schemeId = this.value.trim();
                    if (schemeId && schemeId !== lastFetchedSchemeId) {
                        lastFetchedSchemeId = schemeId;
                        await handleView();
                    }
                }
            });

            // Handle blur (navigate out of field)
            schemeIdField.addEventListener('blur', async function() {
                const schemeId = this.value.trim();
                if (schemeId && schemeId !== lastFetchedSchemeId) {
                    lastFetchedSchemeId = schemeId;
                    await handleView();
                }
            });
        }

        // Loan Product ID - fetch details on blur
        const loanProductField = document.getElementById('LoanProductId');
        if (loanProductField) {
            loanProductField.addEventListener('blur', async function() {
                const productId = this.value.trim();
                if (productId && (isAddMode || isEditMode)) {
                    // TODO: Implement actual lookup
                    console.log('Fetching product details for:', productId);
                }
            });
        }
    }

    // =========================================================================
    // Initialization
    // =========================================================================
    async function initialize() {

        // Load services if available
        if (window.ServiceLoader) {
            try {
                await window.ServiceLoader.loadCore();
                await window.ServiceLoader.loadLookupService();
                await window.ServiceLoader.loadSearchService();
                await window.ServiceLoader.loadScript('/js/services/microfinance/groupService.js');
            } catch (error) {
                console.warn('Could not load services:', error);
            }
        }

        // Initialize components
        initSidebar();
        initSectionToggles();
        initEventListeners();

        // Fetch loan schemes on page load FIRST (for navigation purposes)
        await fetchAllSchemes();

        // Set form mode to default (only View button enabled)
        setFormMode('default');

        // Update collateral sections visibility based on loaded data
        updateCollateralSectionsVisibility();

    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Expose functions for external use
    window.CenterLoanScheme = {
        openChildForm,
        closeChildForm,
        handleView,
        handleAdd,
        handleEdit,
        handleDelete,
        handleSave,
        handleCancel,
        showToast,
        showSuccess,
        showError,
        showWarning,
        showInfo,
        // Expose getCurrentScheme for child forms to access parent data
        getCurrentScheme: function() {
            return currentScheme;
        }
    };

    // Also expose currentScheme directly on window for iframe access
    Object.defineProperty(window, 'currentScheme', {
        get: function() { return currentScheme; },
        configurable: true
    });

})();
