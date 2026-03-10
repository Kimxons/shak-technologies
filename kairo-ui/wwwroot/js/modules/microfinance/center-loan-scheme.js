/**
 * Center Loan Scheme - Main Controller
 * Handles all form interactions, lookups, and CRUD operations
 */

(function() {
    'use strict';

    const SEARCH_MODAL_PREFIX = (window.Environment?.searchModalPrefix || 'mfs').toString();
    const DEFAULT_SEARCH_MODULE_ID = String(window.Environment?.defaultSearchModuleId || window.Environment?.microfinanceModuleId || '5010');

    function getAppCore() {
        const win = window;
        return win.AppCore || (win.parent && win.parent !== win && win.parent.AppCore) || (win.top && win.top !== win && win.top.AppCore) || null;
    }

    // =========================================================================
    // Service Invoker (Client360 pattern)
    // =========================================================================
    function invokeCenterLoanController(action, requestData) {
        return new Promise((resolve, reject) => {
            const appCore = getAppCore();
            if (!appCore || typeof appCore.invokeController !== 'function') {
                reject(new Error('AppCore is not available (AppCore.invokeController not found)'));
                return;
            }

            const endpoint = `MicroFinance/${action}`;
            appCore.invokeController(endpoint, requestData || {}, (error, response) => {
                if (error) {
                    // Resolve with the error payload so getOldApiStatus can read ResponseCode/ResponseMessage
                    // Only reject on network-level failures (no response at all)
                    if (response) {
                        resolve(response);
                    } else {
                        reject(error);
                    }
                } else {
                    resolve(response);
                }
            });
        });
    }

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

    function canUseSearchDialogs() {
        return isAddMode || isEditMode;
    }

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
                if (groupProductId != '') {
                    return `GroupProductID ='${groupProductId.replace(/'/g, "''")}' AND SchemeTypeID = 'P'`;
                }
                else {
                    return `SchemeTypeID = 'P'`;
 }
                
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
        if (typeof window.SearchModal !== 'function') {
            return null;
        }

        const appCore = getAppCore();
        if (!appCore) {
            return null;
        }

        const appCoreCompat = {
            invokeControllerGetViewAsync: typeof appCore.invokeControllerGetViewAsync === 'function'
                ? (endpoint, query) => appCore.invokeControllerGetViewAsync(endpoint, query)
                : async (endpoint, query) => {
                    const qs = new URLSearchParams(query || {}).toString();
                    const resp = await fetch(`/${endpoint}?${qs}`, { credentials: 'same-origin' });
                    if (!resp.ok) {
                        const text = await resp.text();
                        throw new Error(`Failed to load view (${resp.status}): ${text}`);
                    }
                    return resp.text();
                },
            invokeControllerAsync: typeof appCore.invokeControllerAsync === 'function'
                ? (endpoint, data) => appCore.invokeControllerAsync(endpoint, data)
                : async (endpoint, data) => {
                    const resp = await fetch(`/${endpoint}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        credentials: 'same-origin',
                        body: JSON.stringify(data || {})
                    });
                    if (!resp.ok) {
                        const text = await resp.text();
                        throw new Error(`Request failed (${resp.status}): ${text}`);
                    }
                    return resp.json();
                },
            showToastMessage: typeof appCore.showToastMessage === 'function'
                ? (...args) => appCore.showToastMessage(...args)
                : () => {}
        };

        // Keep per-open behavior to avoid stale/broken modal instances.
        return new window.SearchModal(appCoreCompat);
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

        const searchModal = ensureSharedSearchModal();
        if (!searchModal || !config.tableID) {
            showError('Shared search dialog is not available.');
            return;
        }

        const advFilterString = typeof config.getAdvFilterString === 'function'
            ? config.getAdvFilterString()
            : (config.advFilterString || '');

        searchModal.open({
            tableID: config.tableID,
            moduleID: config.moduleIDOverride || Number(DEFAULT_SEARCH_MODULE_ID),
            whereStmt: '',
            advFilterString,
            searchKey: '',
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
            document.getElementById('SchemeId')?.focus();
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

            const resp = await invokeCenterLoanController('delete-group-loan-scheme', requestData);
            const payload = resp?.raw ?? resp?.data ?? resp;
            const status = getOldApiStatus(payload);

            if (status.ok) {
                showSuccess(`Scheme "${schemeId}" deleted successfully`);

                const index = schemesList.findIndex(s =>
                    (s.LoanSchemeID || s.SchemeId) === schemeId
                );
                if (index > -1) {
                    schemesList.splice(index, 1);
                    if (currentSchemeIndex >= schemesList.length) {
                        currentSchemeIndex = schemesList.length - 1;
                    }
                }

                clearForm();
                setFormMode('default');
            } else {
                showError(status.message || 'Failed to delete scheme');
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

            const resp = await invokeCenterLoanController('save-group-loan-scheme', requestData);
            const payload = resp?.raw ?? resp?.data ?? resp;
            const status = getOldApiStatus(payload);

            if (status.ok) {
                showSuccess(isAddMode ? 'Scheme created successfully' : 'Scheme updated successfully');
                isAddMode = false;
                isEditMode = false;
                clearForm();
                setFormMode('default');
            } else {
                showError(status.message || 'Failed to save scheme');
            }
        } catch (error) {
            console.error('Error saving scheme:', error);
            const msg = error?.response?.ErrorMessage || error?.response?.ResponseMessage || error?.message || 'Unknown error';
            showError(`Failed to save scheme: ${msg}`);
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
                // Results found: enable Add for new entry, Edit/Delete enabled
                if (btnView) btnView.disabled = true;
                if (btnAdd) btnAdd.disabled = false;
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

    function formatDateTime(value) {
        if (!value) return '';
        try {
            const d = new Date(value);
            if (isNaN(d.getTime())) return String(value);
            return d.toLocaleDateString('en-GB') + ' ' + d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
        } catch {
            return String(value);
        }
    }

    function formatDateForApi(value) {
        if (!value) return '';
        try {
            const d = new Date(value);
            if (isNaN(d.getTime())) return '';
            return d.toISOString().slice(0, 19);
        } catch {
            return '';
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
            const resp = await invokeCenterLoanController('group-loan-schemes', requestData);

            console.log('[CenterLoanScheme] loadSchemeData Response:', resp);

            // Unwrap envelope the same way Client360 does
            const payload = resp?.raw ?? resp?.data ?? resp;

            // Check OldAPI status
            const status = getOldApiStatus(payload);
            if (!status.ok) {
                showError(status.message || 'Failed to load scheme');
                return null;
            }

            // Normalise details — SP may return Details01 or Details array
            const detailsArr = payload?.Details01 ?? payload?.Details ?? payload?.details ?? payload?.ResponseData ?? [];
            const details = Array.isArray(detailsArr) ? detailsArr : [detailsArr];
            const data = details.find(d => d && d.LoanSchemeID) ?? details[0] ?? null;

            if (data && data.LoanSchemeID) {
                currentScheme = mapSchemeDataToViewModel(data);
                populateForm(currentScheme);
                updateActionButtons('view');
                return currentScheme;
            }

            showWarning('No scheme found with the provided ID');
            return null;
        } catch (error) {
            console.error('Error loading scheme data:', error);
            showError('Failed to load scheme data: ' + (error.message || 'Unknown error'));
            return null;
        }
    }

    // Helper function to extract status from OldAPI responses (Client360 pattern)
    function getOldApiStatus(payload) {
        const candidates = [];
        if (payload) candidates.push(payload);
        if (Array.isArray(payload?.Details) && payload.Details.length) candidates.push(payload.Details[0]);
        if (Array.isArray(payload?.details) && payload.details.length) candidates.push(payload.details[0]);
        if (Array.isArray(payload?.Details01) && payload.Details01.length) candidates.push(payload.Details01[0]);

        for (const candidate of candidates) {
            const code = candidate?.ResponseCode ?? candidate?.responseCode ?? candidate?.Status ?? candidate?.status ?? candidate?.code;
            if (code === undefined || code === null) continue;
            const normalized = String(code).trim();
            const ok = normalized === '' || normalized === '00' || normalized === '0' || normalized.toLowerCase() === 'ok' || normalized.toLowerCase() === 'success';
            const message = candidate?.ResponseMessage ?? candidate?.responseMessage ?? candidate?.Message ?? candidate?.message ?? '';
            return { ok, code: normalized, message };
        }

        return { ok: true, code: '', message: '' };
    }

    // Map API response to view model (Client360 pattern)
    function mapSchemeDataToViewModel(data) {
        return {
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
            // Required Collateral checkboxes
            PrimaryCollateralRequired: toBoolean(data.PrimaryCollateralReq),
            SecondaryCollateralRequired: toBoolean(data.SecondaryCollateralReq),
            AdditionalCollateralRequired: toBoolean(data.AdditionalCollateralReq),
            // Primary Collateral Details
            PrimaryCollateral: data.PrimaryCollateralID || '',
            PrimaryCollateralName: data.PrimaryCollateralID || '',
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
            // Audit fields
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
            const response = await invokeCenterLoanController('group-loan-schemes', requestData);
            
            console.log('[CenterLoanScheme] fetchAllSchemes Response:', response);

            // Handle response - data is in response.data.Details01
            const details = response?.data?.Details01 || response?.Details01 || response?.ResponseData || [];
            schemesList = Array.isArray(details) ? details : [details];
            
            // Filter out empty entries
            schemesList = schemesList.filter(s => s && s.LoanSchemeID);
            
            console.log(`[CenterLoanScheme] Loaded ${schemesList.length} schemes for navigation`);

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
    // Event Wiring (member360-style lookup trigger)
    // =========================================================================
    function wireLookupButtons() {
        document.querySelectorAll('[data-mcs-lookup]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lookupType = btn.dataset.mcsLookup;
                if (!lookupType) {
                    showWarning('Lookup type missing on button');
                    return;
                }
                openSearchDialog(lookupType);
            });
        });
    }

    function wireActionButtons() {
        const actionMap = {
            view: handleView,
            add: handleAdd,
            edit: handleEdit,
            delete: handleDelete,
            save: handleSave,
            cancel: handleCancel,
            previous: handlePrevious,
            next: handleNext
        };

        Object.entries(actionMap).forEach(([action, handler]) => {
            const btn = document.querySelector(`[data-mcs-action="${action}"]`);
            if (btn && typeof handler === 'function') {
                btn.addEventListener('click', (e) => {
                    e.preventDefault();
                    handler();
                });
            }
        });
    }

    function wireSidebarItems() {
        document.querySelectorAll('.sidebar-item[data-child-form]').forEach(item => {
            item.addEventListener('click', function () {
                if (!currentScheme) {
                    showWarning('Please load a record before accessing this feature.');
                    return;
                }
                const formName = this.dataset.childForm;
                openChildForm(formName);
            });
        });
    }

    function openChildForm(formName) {
        const childInline = document.querySelector('[data-child-inline]');
        const childIframe = document.querySelector('[data-child-iframe]');
        const mainForm = document.querySelector('[data-main-form]');
        const mainContainer = document.querySelector('.main-container');

        if (!childInline || !childIframe || !mainForm || !mainContainer) return;

        const schemeId = currentScheme?.SchemeId || '';
        const loanProductId = currentScheme?.LoanProductId || '';

        const formConfig = {
            'center-loan-menu': { url: `/MicroFinance/DataEntry/CenterLoanMenu?schemeId=${encodeURIComponent(schemeId)}&loanProductId=${encodeURIComponent(loanProductId)}` },
            'products':         { url: `/MicroFinance/DataEntry/GroupLoanSchemeProducts?schemeId=${encodeURIComponent(schemeId)}` }
        };

        const config = formConfig[formName];
        if (!config) return;

        mainContainer.classList.add('child-opening');
        childInline.hidden = false;
        childIframe.src = config.url;

        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                mainContainer.classList.add('child-open');
                childInline.classList.add('is-visible');
                childInline.classList.remove('is-closing');
                setTimeout(() => {
                    mainContainer.classList.remove('child-opening');
                    mainForm.hidden = true;
                }, 350);
            });
        });
    }

    document.addEventListener('DOMContentLoaded', () => {
        wireLookupButtons();
        wireActionButtons();
        wireSidebarItems();
        setFormMode('default');
    });
})();
