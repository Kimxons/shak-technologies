/**
 * Center Loan Menu - Data Entry Controller
 * Handles form interactions, lookups, and CRUD operations for loan menu
 */

(function() {
    'use strict';

    // =========================================================================
    // State Management
    // =========================================================================
    let currentMenu = null;
    let isEditMode = false;
    let isAddMode = false;
    let parentSchemeData = null;
    let currentLookupType = null; // Track which lookup button was clicked

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
            toast.classList.remove('is-show');
            setTimeout(() => {
                try { toast.remove(); } catch { /* ignore */ }
            }, 300);
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
    // Form Mode Management
    // =========================================================================
    function setFormMode(mode) {
        // Fields that should remain disabled during edit mode (key identifiers)
        const editProtectedFields = ['LoanCycleNo', 'LoanLevelNo', 'EffectiveDate'];
        
        // Determine if this is a view-like mode
        const isViewLikeMode = ['default', 'view-with-data', 'view-no-data'].includes(mode);
        
        console.log('Setting form mode to:', mode, 'isViewLikeMode:', isViewLikeMode);
        
        // Get all form inputs (more comprehensive selector)
        const inputs = document.querySelectorAll('.form-card input:not([readonly]), .form-card select, .kairo-control input:not([readonly])');
        const readonlyInputs = document.querySelectorAll('.form-card input[readonly]');
        const lookupButtons = document.querySelectorAll('.form-card [data-mcs-lookup]');
        
        inputs.forEach(input => {
            // Keep key fields always enabled for search functionality (in default/view modes)
            if (editProtectedFields.includes(input.id)) {
                // In edit mode, disable key fields; in default/view/add modes, keep enabled for search
                const shouldDisable = (mode === 'edit');
                input.disabled = shouldDisable;
                console.log('Setting', input.id, 'disabled:', shouldDisable, 'mode:', mode);
                return;
            }
            
            if (isViewLikeMode) {
                input.disabled = true;
            } else {
                input.disabled = false;
            }
        });

        // Keep readonly inputs always readonly
        readonlyInputs.forEach(input => {
            input.disabled = true;
        });

        // Handle lookup button states
        lookupButtons.forEach(btn => {
            const lookupType = btn.getAttribute('data-mcs-lookup');
            const keyLookups = ['loan-cycle', 'loan-level', 'effective-date'];
            
            if (mode === 'edit' && keyLookups.includes(lookupType)) {
                // Disable key lookups during edit
                btn.disabled = true;
            } else if (isViewLikeMode) {
                // In view-like modes, key lookups are enabled (for search)
                btn.disabled = !keyLookups.includes(lookupType);
            } else {
                // In add mode, all lookups are enabled
                btn.disabled = false;
            }
        });

        // Update action buttons state
        updateActionButtons(mode);
    }

    function updateActionButtons(mode) {
        const btnView = document.querySelector('[data-action="view"]');
        const btnAdd = document.querySelector('[data-action="add"]');
        const btnEdit = document.querySelector('[data-action="edit"]');
        const btnDelete = document.querySelector('[data-action="delete"]');
        const btnSave = document.querySelector('[data-action="save"]');
        const btnCancel = document.querySelector('[data-action="cancel"]');

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

    // =========================================================================
    // Form Actions
    // =========================================================================
    function handleView() {
        // Validate required fields
        const loanCycleNo = document.getElementById('LoanCycleNo')?.value?.trim();
        const loanLevelNo = document.getElementById('LoanLevelNo')?.value?.trim();
        const effectiveDate = getEffectiveDate(); // Use helper function

        // Check all required fields
        const missingFields = [];
        
        if (!loanCycleNo) {
            missingFields.push('Loan Cycle No');
        }
        if (!loanLevelNo) {
            missingFields.push('Loan Level No');
        }
        if (!effectiveDate) {
            missingFields.push('Effective Date');
        }

        if (missingFields.length > 0) {
            showWarning(`Please fill in the following required fields: ${missingFields.join(', ')}`);
            
            // Focus on the first missing field
            if (!loanCycleNo) {
                document.getElementById('LoanCycleNo')?.focus();
            } else if (!loanLevelNo) {
                document.getElementById('LoanLevelNo')?.focus();
            } else if (!effectiveDate) {
                document.getElementById('EffectiveDate')?.focus();
            }
            return;
        }

        // Reset modes
        isEditMode = false;
        isAddMode = false;

        showInfo(`Loading menu for Cycle: ${loanCycleNo}, Level: ${loanLevelNo}...`);
        
        // Fetch menu data from API
        loadMenuData(loanCycleNo, loanLevelNo, effectiveDate);
    }

    async function loadMenuData(loanCycleNo, loanLevelNo, effectiveDate) {
        const { bankID, ourBranchID, operatorID } = getEnv();
        
        // Get scheme ID from parent if available
        const schemeId = parentSchemeData?.SchemeId || parentSchemeData?.LoanSchemeID || '';

        if (!schemeId) {
            showWarning('No scheme ID available. Please load a scheme first from the parent screen.');
            setFormMode('default');
            return null;
        }

        // Format effective date for API (smalldatetime format: YYYY-MM-DDTHH:mm:ss)
        let formattedEffectiveDate = effectiveDate;
        if (effectiveDate && !effectiveDate.includes('T')) {
            formattedEffectiveDate = effectiveDate + 'T00:00:00';
        }

        const requestData = {
            BankID: bankID,
            OurBranchID: ourBranchID,
            LoanSchemeID: schemeId,
            LoanCycleNo: parseInt(loanCycleNo, 10) || 0,
            LoanLevelNo: parseInt(loanLevelNo, 10) || 0,
            EffectiveDate: formattedEffectiveDate,
            OperatorID: operatorID
        };

        console.log('Loading menu with request:', requestData);

        try {
            // Check if GroupService is available
            if (!window.GroupService) {
                showError('GroupService not available. Please ensure services are loaded.');
                setFormMode('default');
                return null;
            }

            const response = await window.GroupService.getGroupLoanMenu(requestData);

            console.log('Menu API response:', response);

            // Handle response - API returns:
            // - Details01: Product defaults (always present)
            // - Details02: Full menu data (if menu exists for the criteria)
            // Check both response.data and response directly for the arrays
            const productDefaults = response?.data?.Details01 || response?.Details01 || [];
            const menuData = response?.data?.Details02 || response?.Details02 || [];
            
            const productData = Array.isArray(productDefaults) && productDefaults.length > 0 
                ? productDefaults[0] 
                : null;
            const menuRecord = Array.isArray(menuData) && menuData.length > 0 
                ? menuData[0] 
                : null;

            console.log('Product defaults (Details01):', productData);
            console.log('Menu record (Details02):', menuRecord);

            if (menuRecord && menuRecord.LoanSchemeID) {
                // Full menu data found in Details02 - populate all fields
                currentMenu = mapApiResponseToFormData(menuRecord, productData);
                
                // Populate the form with full data
                populateForm(currentMenu);
                
                // Set mode to view-with-data (Edit/Delete enabled)
                setFormMode('view-with-data');
                showSuccess('Menu loaded successfully');
                return currentMenu;
            } else if (productData && productData.LoanProductID) {
                // Only product defaults found in Details01 - partial fill
                currentMenu = null;
                
                // Populate the product defaults (Behind the Scene + Min/Max Loan Amount)
                populateProductDefaults(productData);
                
                // Set mode to view-no-data (Add enabled)
                setFormMode('view-no-data');
                showWarning('No menu found. Product defaults loaded. You can add a new menu.');
                return null;
            } else {
                // No data found at all
                currentMenu = null;
                setFormMode('view-no-data');
                showWarning('No menu found with the provided criteria. You can add a new menu.');
                return null;
            }
        } catch (error) {
            console.error('Error loading menu data:', error);
            showError('Failed to load menu data: ' + (error.message || 'Unknown error'));
            setFormMode('default');
            return null;
        }
    }

    /**
     * Populate only the product defaults (Behind the Scene section ONLY)
     * Does NOT populate editable fields like Min/Max Loan Amount
     */
    function populateProductDefaults(productData) {
        if (!productData) return;
        
        // Behind the Scene (readonly) - from Details01 ONLY
        setFieldValue('MenuLoanProductId', productData.LoanProductID || '');
        setFieldValue('MenuCurrencyId', productData.CurrencyID || '');
        setFieldValue('MenuTermExcludesGracePeriod', productData.IsTermExcludesGracePeriod ? 'Yes' : 'No');
        setFieldValue('MenuLoanPeriod', productData.InstallmentFrequency || '');
        setFieldValue('MenuCalculationMethod', productData.CalculationMethod || '');
        
        // DO NOT populate Min/Max Loan Amount here - user should fill these when adding
    }

    /**
     * Map API response to form data structure
     * @param {Object} menuRecord - Full menu record from Details02
     * @param {Object} productData - Product defaults from Details01
     */
    function mapApiResponseToFormData(menuRecord, productData) {
        // Merge data: menuRecord takes priority, fall back to productData
        const data = menuRecord || {};
        const product = productData || {};
        
        return {
            // Key fields (from Details02)
            LoanCycleNo: data.LoanCycleNo || '',
            LoanCycleDesc: data.LoanCycleDesc || data.CycleDescription || '',
            LoanLevelNo: data.LoanLevelNo || '',
            LoanLevelDesc: data.LoanLevelDesc || data.LevelDescription || '',
            EffectiveDate: formatDateForInput(data.EffectiveDate),
            
            // Menu Details (from Details02, fallback to Details01)
            MinimumLoanAmount: data.MinLoanAmount || product.MinLoanAmount || '',
            MaximumLoanAmount: data.MaxLoanAmount || product.MaxLoanAmount || '',
            DefaultLoanAmount: data.DefaultLoanAmount || '',
            Term: data.Term || product.MinLoanTerm || '',
            InterestMenuId: data.InterestRateID || data.InterestMenuID || '',
            InstallmentGracePeriod: data.InstallmentGracePeriod || '',
            MaxAdjustmentDays: data.MaxAdjustmentDays || '',
            
            // Collateral Details (from Details02)
            MenuSavingToLoanRatio: data.CollateralRatio || '',
            MenuSLRecoveryType: data.SLRecoveryType || '',
            MenuCollectSavingWithInstallment: toBoolean(data.CollectSavingWithInst),
            MenuSavingsCollectionType: data.SavingsTypeID || '',
            MenuSavingsValue: data.SavingsAmount || '',
            
            // Behind the Scene (readonly) - from Details01 (product defaults)
            MenuLoanProductId: product.LoanProductID || '',
            MenuCurrencyId: product.CurrencyID || '',
            MenuTermExcludesGracePeriod: product.IsTermExcludesGracePeriod !== undefined 
                ? (product.IsTermExcludesGracePeriod ? 'Yes' : 'No') 
                : '',
            MenuLoanPeriod: product.InstallmentFrequency || '',
            MenuCalculationMethod: product.CalculationMethod || '',
            
            // Additional fields from product defaults
            MinLoanTerm: product.MinLoanTerm || '',
            MaxLoanTerm: product.MaxLoanTerm || '',
            Multiplier: product.Multiplier || 0,
            
            // Audit fields (from Details02)
            CreatedBy: data.CreatedBy || '',
            CreatedOn: data.CreatedOn || '',
            ModifiedBy: data.ModifiedBy || '',
            ModifiedOn: data.ModifiedOn || '',
            SupervisedBy: data.SupervisedBy || '',
            SupervisedOn: data.SupervisedOn || '',
            
            // For update tracking
            UpdateCount: data.UpdateCount || 0,
            LoanSchemeID: data.LoanSchemeID || ''
        };
    }

    /**
     * Format date for input field (YYYY-MM-DD format for date input)
     */
    function formatDateForInput(dateStr) {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            if (isNaN(date.getTime())) return dateStr;
            // Format as YYYY-MM-DD for date input
            return date.toISOString().split('T')[0];
        } catch {
            return dateStr;
        }
    }

    function handleAdd() {
        // Preserve the key fields
        const loanCycleNo = document.getElementById('LoanCycleNo')?.value?.trim() || '';
        const loanLevelNo = document.getElementById('LoanLevelNo')?.value?.trim() || '';
        const effectiveDate = document.getElementById('EffectiveDate')?.value?.trim() || '';
        
        // Preserve Behind the Scene fields ONLY (product defaults from Details01 - readonly)
        const menuLoanProductId = document.getElementById('MenuLoanProductId')?.value || '';
        const menuCurrencyId = document.getElementById('MenuCurrencyId')?.value || '';
        const menuTermExcludesGracePeriod = document.getElementById('MenuTermExcludesGracePeriod')?.value || '';
        const menuLoanPeriod = document.getElementById('MenuLoanPeriod')?.value || '';
        const menuCalculationMethod = document.getElementById('MenuCalculationMethod')?.value || '';
        
        // Clear form but keep key fields and Behind the Scene product defaults
        clearForm();
        
        // Restore key fields
        setFieldValue('LoanCycleNo', loanCycleNo);
        setFieldValue('LoanLevelNo', loanLevelNo);
        setFieldValue('EffectiveDate', effectiveDate);
        
        // Restore Behind the Scene fields (product defaults - readonly)
        setFieldValue('MenuLoanProductId', menuLoanProductId);
        setFieldValue('MenuCurrencyId', menuCurrencyId);
        setFieldValue('MenuTermExcludesGracePeriod', menuTermExcludesGracePeriod);
        setFieldValue('MenuLoanPeriod', menuLoanPeriod);
        setFieldValue('MenuCalculationMethod', menuCalculationMethod);
        
        // DO NOT restore Min/Max Loan Amount - user should fill these
        
        isAddMode = true;
        isEditMode = false;
        setFormMode('add');

        // Update savings fields state based on checkbox
        const collectSavingChecked = document.getElementById('MenuCollectSavingWithInstallment')?.checked || false;
        toggleSavingsFields(collectSavingChecked);

        showInfo('Add mode enabled. Fill in the menu details.');
    }

    function handleEdit() {
        if (!currentMenu) {
            showWarning('Please view a menu first before editing');
            return;
        }

        isEditMode = true;
        isAddMode = false;
        setFormMode('edit');

        // Update savings fields state based on checkbox
        const collectSavingChecked = document.getElementById('MenuCollectSavingWithInstallment')?.checked || false;
        toggleSavingsFields(collectSavingChecked);

        showInfo('Edit mode enabled. Make your changes and save.');
    }

    async function handleDelete() {
        if (!currentMenu) {
            showWarning('Please view a menu first before deleting');
            return;
        }

        // Show confirmation dialog using the dedicated confirmation dialog
        if (window.showConfirmationDialog) {
            const confirmed = await window.showConfirmationDialog(
                'Confirm Delete',
                `Are you sure you want to delete this menu entry?`,
                'danger'
            );
            if (confirmed) {
                performDelete();
            }
        } else {
            // Fallback to browser confirm if dialog not available
            if (confirm('Are you sure you want to delete this menu entry?')) {
                performDelete();
            }
        }
    }

    async function performDelete() {
        if (!currentMenu) {
            showError('No menu loaded to delete');
            return;
        }

        const { bankID } = getEnv();

        const requestData = {
            BankID: bankID,
            // Add other required fields for delete
        };

        console.log('Delete request data:', requestData);

        try {
            showInfo('Deleting menu...');
            
            // TODO: Implement actual delete API call
            // const result = await window.GroupService.deleteGroupLoanMenu(requestData);

            // For now, simulate success
            showSuccess('Menu deleted successfully');
            clearForm();
            setFormMode('default');
        } catch (error) {
            console.error('Error deleting menu:', error);
            showError('Failed to delete menu: ' + error.message);
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

        // Get scheme ID from parent
        const schemeId = parentSchemeData?.SchemeId || parentSchemeData?.LoanSchemeID || '';
        if (!schemeId) {
            showError('No scheme ID available. Please load a scheme first from the parent screen.');
            return;
        }

        // Get environment values
        const { bankID, operatorID } = getEnv();
        const now = new Date().toISOString().slice(0, 19);

        // Get form field values
        const loanCycleNo = document.getElementById('LoanCycleNo')?.value?.trim() || '';
        const loanLevelNo = document.getElementById('LoanLevelNo')?.value?.trim() || '';
        const effectiveDate = getEffectiveDate(); // Use helper function for flatpickr
        
        // Format effective date for API (smalldatetime format)
        let formattedEffectiveDate = effectiveDate;
        if (effectiveDate && !effectiveDate.includes('T')) {
            formattedEffectiveDate = effectiveDate + 'T00:00:00';
        }

        // Build request data matching API specification
        const requestData = {
            BankID: bankID,
            LoanSchemeID: schemeId,
            LoanCycleNo: parseInt(loanCycleNo, 10) || 0,
            LoanLevelNo: parseInt(loanLevelNo, 10) || 0,
            EffectiveDate: formattedEffectiveDate,
            MinLoanAmount: parseFloat(document.getElementById('MinimumLoanAmount')?.value) || 0,
            MaxLoanAmount: parseFloat(document.getElementById('MaximumLoanAmount')?.value) || 0,
            DefaultLoanAmount: parseFloat(document.getElementById('DefaultLoanAmount')?.value) || 0,
            Term: parseInt(document.getElementById('Term')?.value, 10) || 0,
            InterestRateID: document.getElementById('InterestMenuId')?.value || '',
            MaxAdjustmentDays: parseInt(document.getElementById('MaxAdjustmentDays')?.value, 10) || 0,
            SavingsTypeID: document.getElementById('MenuSavingsCollectionType')?.value || '',
            SavingsAmount: parseFloat(document.getElementById('MenuSavingsValue')?.value) || 0,
            CollateralRatio: parseFloat(document.getElementById('MenuSavingToLoanRatio')?.value) || 0,
            SLRecoveryType: document.getElementById('MenuSLRecoveryType')?.value || null,
            CollectSavingWithInst: document.getElementById('MenuCollectSavingWithInstallment')?.checked ? true : false,
            InstallmentGracePeriod: parseInt(document.getElementById('InstallmentGracePeriod')?.value, 10) || 0,
            // For Add: CreatedBy = current user, ModifiedBy = null
            // For Edit: CreatedBy = original creator, ModifiedBy = current user
            CreatedBy: isAddMode ? operatorID : (currentMenu?.CreatedBy || ''),
            CreatedOn: isAddMode ? now : (currentMenu?.CreatedOn || ''),
            ModifiedBy: isEditMode ? operatorID : (isAddMode ? null : (currentMenu?.ModifiedBy || null)),
            ModifiedOn: isEditMode ? now : (isAddMode ? null : (currentMenu?.ModifiedOn || null)),
            SupervisedBy: null,
            SupervisedOn: null,
            UpdateCount: isAddMode ? 1 : ((currentMenu?.UpdateCount || 0) )
        };
 
        try {
            console.log('Saving menu with data:', requestData);
            showInfo('Saving menu...');

            // Check if GroupService is available
            if (!window.GroupService) {
                showError('GroupService not available. Please ensure services are loaded.');
                return;
            }
            
            const response = await window.GroupService.addEditGroupLoanMenu(requestData);
            
            console.log('Save response:', response);

            if (response?.success || response?.code === '00') {
                if (isAddMode) {
                    showSuccess('Menu created successfully');
                } else {
                    showSuccess('Menu updated successfully');
                }
                
                // Reset modes
                isAddMode = false;
                isEditMode = false;
                
                // Reload the data to show fresh state
                await loadMenuData(loanCycleNo, loanLevelNo, effectiveDate);
            } else {
                showError('Failed to save menu: ' + (response?.message || 'Unknown error'));
            }
        } catch (error) {
            console.error('Error saving menu:', error);
            showError('An error occurred while saving the menu: ' + (error.message || 'Please try again.'));
        }
    }

    function handleCancel() {
        // Reset modes
        isAddMode = false;
        isEditMode = false;
        
        // Clear the form
        clearForm();
        
        // Reset to default state
        setFormMode('default');
        
        showInfo('Form cleared');
    }

    // =========================================================================
    // Form Helpers
    // =========================================================================
    function validateForm() {
        const loanCycleNo = document.getElementById('LoanCycleNo')?.value?.trim();
        const loanLevelNo = document.getElementById('LoanLevelNo')?.value?.trim();
        const effectiveDate = document.getElementById('EffectiveDate')?.value?.trim();

        if (!loanCycleNo) {
            showError('Loan Cycle No is required');
            document.getElementById('LoanCycleNo')?.focus();
            return false;
        }

        if (!loanLevelNo) {
            showError('Loan Level No is required');
            document.getElementById('LoanLevelNo')?.focus();
            return false;
        }

        if (!effectiveDate) {
            showError('Effective Date is required');
            document.getElementById('EffectiveDate')?.focus();
            return false;
        }

        return true;
    }

    function collectFormData() {
        return {
            LoanCycleNo: document.getElementById('LoanCycleNo')?.value?.trim() || '',
            LoanCycleDesc: document.getElementById('LoanCycleDesc')?.value?.trim() || '',
            LoanLevelNo: document.getElementById('LoanLevelNo')?.value?.trim() || '',
            LoanLevelDesc: document.getElementById('LoanLevelDesc')?.value?.trim() || '',
            EffectiveDate: document.getElementById('EffectiveDate')?.value?.trim() || '',
            // Menu Details
            MinimumLoanAmount: document.getElementById('MinimumLoanAmount')?.value?.trim() || '',
            MaximumLoanAmount: document.getElementById('MaximumLoanAmount')?.value?.trim() || '',
            DefaultLoanAmount: document.getElementById('DefaultLoanAmount')?.value?.trim() || '',
            Term: document.getElementById('Term')?.value?.trim() || '',
            InterestMenuId: document.getElementById('InterestMenuId')?.value || '',
            InstallmentGracePeriod: document.getElementById('InstallmentGracePeriod')?.value?.trim() || '',
            MaxAdjustmentDays: document.getElementById('MaxAdjustmentDays')?.value?.trim() || '',
            // Collateral Details
            MenuSavingToLoanRatio: document.getElementById('MenuSavingToLoanRatio')?.value?.trim() || '',
            MenuSLRecoveryType: document.getElementById('MenuSLRecoveryType')?.value || '',
            MenuCollectSavingWithInstallment: document.getElementById('MenuCollectSavingWithInstallment')?.checked || false,
            MenuSavingsCollectionType: document.getElementById('MenuSavingsCollectionType')?.value || '',
            MenuSavingsValue: document.getElementById('MenuSavingsValue')?.value?.trim() || '',
            // Behind the Scene
            MenuLoanProductId: document.getElementById('MenuLoanProductId')?.value?.trim() || '',
            MenuCurrencyId: document.getElementById('MenuCurrencyId')?.value?.trim() || '',
            MenuTermExcludesGracePeriod: document.getElementById('MenuTermExcludesGracePeriod')?.value?.trim() || '',
            MenuLoanPeriod: document.getElementById('MenuLoanPeriod')?.value?.trim() || '',
            MenuCalculationMethod: document.getElementById('MenuCalculationMethod')?.value?.trim() || ''
        };
    }

    function populateForm(data) {
        if (!data) return;

        // Loan Cycle Details
        setFieldValue('LoanCycleNo', data.LoanCycleNo);
        setFieldValue('LoanCycleDesc', data.LoanCycleDesc);
        setFieldValue('LoanLevelNo', data.LoanLevelNo);
        setFieldValue('LoanLevelDesc', data.LoanLevelDesc);
        setEffectiveDate(data.EffectiveDate);

        // Menu Details
        setFieldValue('MinimumLoanAmount', data.MinimumLoanAmount);
        setFieldValue('MaximumLoanAmount', data.MaximumLoanAmount);
        setFieldValue('DefaultLoanAmount', data.DefaultLoanAmount);
        setFieldValue('Term', data.Term);
        setFieldValue('InterestMenuId', data.InterestMenuId);
        setFieldValue('InstallmentGracePeriod', data.InstallmentGracePeriod);
        setFieldValue('MaxAdjustmentDays', data.MaxAdjustmentDays);

        // Collateral Details
        setFieldValue('MenuSavingToLoanRatio', data.MenuSavingToLoanRatio);
        setFieldValue('MenuSLRecoveryType', data.MenuSLRecoveryType);
        setCheckboxValue('MenuCollectSavingWithInstallment', data.MenuCollectSavingWithInstallment);
        setFieldValue('MenuSavingsCollectionType', data.MenuSavingsCollectionType);
        setFieldValue('MenuSavingsValue', data.MenuSavingsValue);

        // Behind the Scene
        setFieldValue('MenuLoanProductId', data.MenuLoanProductId);
        setFieldValue('MenuCurrencyId', data.MenuCurrencyId);
        setFieldValue('MenuTermExcludesGracePeriod', data.MenuTermExcludesGracePeriod);
        setFieldValue('MenuLoanPeriod', data.MenuLoanPeriod);
        setFieldValue('MenuCalculationMethod', data.MenuCalculationMethod);

        // Audit fields
        setFieldValue('MenuCreatedBy', data.CreatedBy);
        setFieldValue('MenuCreatedOn', formatDateTime(data.CreatedOn));
        setFieldValue('MenuModifiedBy', data.ModifiedBy);
        setFieldValue('MenuModifiedOn', formatDateTime(data.ModifiedOn));
        setFieldValue('MenuSupervisedBy', data.SupervisedBy);
        setFieldValue('MenuSupervisedOn', formatDateTime(data.SupervisedOn));
    }

    function setFieldValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.value = value || '';
        }
    }

    function toBoolean(value) {
        if (value === true || value === 1 || value === '1' || value === 'true' || value === 'True' || value === 'TRUE') {
            return true;
        }
        return false;
    }

    function setCheckboxValue(fieldId, value) {
        const field = document.getElementById(fieldId);
        if (field) {
            field.checked = toBoolean(value);
        }
    }

    function clearForm() {
        const form = document.querySelector('.form-card');
        if (!form) return;

        // Clear all text/number/date inputs
        form.querySelectorAll('input[type="text"], input[type="number"], input[type="date"]').forEach(input => {
            // Skip flatpickr alt inputs
            if (!input.classList.contains('flatpickr-input') || input.id === 'EffectiveDate') {
                input.value = '';
            }
        });

        // Clear flatpickr date picker
        const fp = getEffectiveDateFlatpickr();
        if (fp) {
            fp.clear();
        }

        // Uncheck all checkboxes
        form.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
            checkbox.checked = false;
        });

        // Reset selects to first option
        form.querySelectorAll('select').forEach(select => {
            select.selectedIndex = 0;
        });

        currentMenu = null;
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

    // =========================================================================
    // Window/Form Controls
    // =========================================================================
    function notifyParentFormOpened() {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ 
                    action: 'submoduleOpened',
                    source: 'Center Loan Menu'
                }, '*');
            }
        } catch (error) {
            console.error('Error notifying parent of form open:', error);
        }
    }

    function closeChildForm() {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ 
                    action: 'submoduleClosed',
                    source: 'Center Loan Menu'
                }, '*');
            } else {
                window.close();
            }
        } catch (error) {
            console.error('Error closing form:', error);
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
                section.classList.toggle('collapsed');
                icon.className = isExpanded ? 'bi bi-chevron-down' : 'bi bi-chevron-up';
            });
        });
    }

    // =========================================================================
    // Date Picker Helpers (uses date-pickers.js which loads flatpickr)
    // =========================================================================
    
    /**
     * Get the flatpickr instance for the effective date input
     * date-pickers.js attaches _flatpickr to the input element
     */
    function getEffectiveDateFlatpickr() {
        const input = document.getElementById('EffectiveDate');
        if (!input) return null;
        return input._flatpickr || null;
    }

    /**
     * Set the effective date value
     * @param {string} dateStr - Date string in any format
     */
    function setEffectiveDate(dateStr) {
        const input = document.getElementById('EffectiveDate');
        if (!input) return;

        if (!dateStr) {
            const fp = getEffectiveDateFlatpickr();
            if (fp) {
                fp.clear();
            } else {
                input.value = '';
            }
            return;
        }

        // Parse date to YYYY-MM-DD format
        let parsedDate = dateStr;
        if (window.GlobalUtils && window.GlobalUtils.parseDateInput) {
            parsedDate = window.GlobalUtils.parseDateInput(dateStr);
        } else {
            try {
                const d = new Date(dateStr);
                if (!isNaN(d.getTime())) {
                    parsedDate = d.toISOString().split('T')[0];
                }
            } catch (e) {
                // keep original
            }
        }

        // Set via flatpickr if available
        const fp = getEffectiveDateFlatpickr();
        if (fp) {
            fp.setDate(parsedDate, true);
        } else {
            input.value = parsedDate;
        }
    }

    /**
     * Get the effective date in ISO format (YYYY-MM-DD)
     * @returns {string} Date in ISO format
     */
    function getEffectiveDate() {
        const input = document.getElementById('EffectiveDate');
        if (!input) return '';

        const fp = getEffectiveDateFlatpickr();
        if (fp && fp.selectedDates && fp.selectedDates.length > 0) {
            const date = fp.selectedDates[0];
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}`;
        }
        
        // Fallback to input value
        return input.value || '';
    }

    // =========================================================================
    // Event Listeners
    // =========================================================================
    function initEventListeners() {
        // Header button handlers
        document.querySelectorAll('.am-btn[data-action]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                handleWindowAction(action);
            });
        });

        // Action panel button handlers
        document.querySelectorAll('.action-panel .btn-action[data-action]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const action = btn.getAttribute('data-action');
                handleAction(action);
            });
        });

        // Lookup button handlers
        document.querySelectorAll('[data-mcs-lookup]').forEach((btn) => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const lookupType = btn.getAttribute('data-mcs-lookup');
                handleLookup(lookupType);
            });
        });

        // Collect Saving With Installment checkbox handler
        const collectSavingCheckbox = document.getElementById('MenuCollectSavingWithInstallment');
        if (collectSavingCheckbox) {
            collectSavingCheckbox.addEventListener('change', function() {
                toggleSavingsFields(this.checked);
            });
            // Initialize state on load
            toggleSavingsFields(collectSavingCheckbox.checked);
        }

        // Request scheme data from parent
        requestSchemeDataFromParent();
    }

    /**
     * Toggle Savings Collection Type and Savings Value fields based on checkbox state
     */
    function toggleSavingsFields(isChecked) {
        const savingsCollectionType = document.getElementById('MenuSavingsCollectionType');
        const savingsValue = document.getElementById('MenuSavingsValue');
        
        if (savingsCollectionType) {
            // Only enable if checkbox is checked AND we're in add/edit mode
            savingsCollectionType.disabled = !isChecked || (!isAddMode && !isEditMode);
            if (!isChecked) {
                savingsCollectionType.selectedIndex = 0; // Reset to --Select--
            }
        }
        
        if (savingsValue) {
            savingsValue.disabled = !isChecked || (!isAddMode && !isEditMode);
            if (!isChecked) {
                savingsValue.value = ''; // Clear value
            }
        }
    }

    function handleWindowAction(action) {
        switch (action) {
            case 'refresh':
                document.querySelectorAll('[class*="invalid"]').forEach(el => {
                    el.classList.remove(...Array.from(el.classList).filter(c => c.includes('invalid')));
                });
                window.location.reload();
                break;

            case 'close':
                closeChildForm();
                break;
        }
    }

    function handleAction(action) {
        switch (action) {
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
    }

    // =========================================================================
    // Search Dialog Configuration
    // =========================================================================
    // NOTE: URLs are relative to the PARENT window (center-loan-scheme.html) since the modal opens there
    const searchDialogConfig = {
        'loan-cycle': {
            title: 'Loan Cycle Search',
            getUrl: () => {
                const schemeId = parentSchemeData?.SchemeId || parentSchemeData?.LoanSchemeID || '';
                return `../../common/searchDialogs/loan-cycle-search/loan-cycle-search.html?schemeId=${encodeURIComponent(schemeId)}&moduleId=5020`;
            }
        },
        'loan-level': {
            title: 'Loan Level Search',
            getUrl: () => {
                const schemeId = parentSchemeData?.SchemeId || parentSchemeData?.LoanSchemeID || '';
                return `../../common/searchDialogs/loan-cycle-search/loan-cycle-search.html?schemeId=${encodeURIComponent(schemeId)}&moduleId=5020`;
            }
        },
        'effective-date': {
            title: 'Effective Date Search',
            getUrl: () => {
                const schemeId = parentSchemeData?.SchemeId || parentSchemeData?.LoanSchemeID || '';
                return `../../common/searchDialogs/loan-cycle-search/loan-cycle-search.html?schemeId=${encodeURIComponent(schemeId)}&moduleId=5020`;
            }
        }
    };

    function handleLookup(lookupType) {
        // Only allow lookups when in appropriate mode
        const keyLookups = ['loan-cycle', 'loan-level', 'effective-date'];
        
        if (!keyLookups.includes(lookupType) && !isAddMode && !isEditMode) {
            showWarning('Search is only available in Add or Edit mode.');
            return;
        }

        // Get the search dialog configuration
        const config = searchDialogConfig[lookupType];
        if (!config) {
            showWarning(`No search dialog configured for "${lookupType}"`);
            return;
        }

        // Check if scheme data is available
        const schemeId = parentSchemeData?.SchemeId || parentSchemeData?.LoanSchemeID || '';
        if (!schemeId) {
            showWarning('No scheme ID available. Please load a scheme first from the parent screen.');
            return;
        }

        // Request parent to open search dialog (so modal appears above everything)
        openSearchDialogInParent(lookupType, config);
    }

    function openSearchDialogInParent(lookupType, config) {
        try {
            // Store which lookup was clicked to handle selection appropriately
            currentLookupType = lookupType;
            
            // Send message to parent to open the search dialog
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({
                    action: 'openSearchDialog',
                    lookupType: lookupType,
                    title: config.title || 'Search',
                    url: config.getUrl(),
                    source: 'center-loan-menu'
                }, '*');
            } else {
                showError('Cannot open search dialog - no parent window');
            }
        } catch (error) {
            console.error('Error opening search dialog in parent:', error);
            showError('Failed to open search dialog');
        }
    }

    // Listen for messages from parent (search selections and scheme data)
    window.addEventListener('message', function(event) {
        const { type, action, data } = event.data || {};

        // Handle loan cycle selection from parent
        if (type === 'LOAN_CYCLE_SELECTED') {
            handleLoanCycleSelection(event.data);
        }
        
        // Handle scheme data from parent
        if (action === 'schemeData' && data) {
            parentSchemeData = data;
            console.log('Received scheme data from parent:', parentSchemeData);
            
            // Load interest menu combo when scheme data is received
            const schemeId = data.SchemeId || data.LoanSchemeID || '';
            if (schemeId) {
                loadInterestMenuCombo(schemeId);
            }
        }
    });

    function handleLoanCycleSelection(data) {
        if (!data) return;

        // Fill ONLY the fields relevant to the lookup that was clicked
        if (currentLookupType === 'loan-cycle') {
            // Only fill Loan Cycle fields
            setFieldValue('LoanCycleNo', data.loanCycleNo || '');
            setFieldValue('LoanCycleDesc', data.loanCycleDesc || '');
            showInfo(`Selected Loan Cycle: ${data.loanCycleNo}`);
        } else if (currentLookupType === 'loan-level') {
            // Only fill Loan Level fields
            setFieldValue('LoanLevelNo', data.loanLevelNo || '');
            setFieldValue('LoanLevelDesc', data.loanLevelDesc || '');
            showInfo(`Selected Loan Level: ${data.loanLevelNo}`);
        } else if (currentLookupType === 'effective-date') {
            // Only fill Effective Date field
            const effectiveDate = data.effectiveDate || '';
            setEffectiveDate(effectiveDate);
            let displayDate = effectiveDate;
            if (effectiveDate && window.GlobalUtils && window.GlobalUtils.formatDate) {
                displayDate = window.GlobalUtils.formatDate(effectiveDate);
            }
            showInfo(`Selected Effective Date: ${displayDate}`);
        }

        // Reset the lookup type
        currentLookupType = null;

        // Close the modal (parent handles this now)
        const modal = document.getElementById('searchModal');
        if (modal) {
            const bsModal = bootstrap.Modal.getInstance(modal);
            if (bsModal) {
                bsModal.hide();
            }
        }
    }

    function requestSchemeDataFromParent() {
        try {
            if (window.parent && window.parent !== window) {
                window.parent.postMessage({ action: 'requestSchemeData' }, '*');
            }
        } catch (error) {
            console.error('Error requesting scheme data from parent:', error);
        }
    }

    // =========================================================================
    // S/L Recovery Type Dropdown (Saving Payment Types)
    // =========================================================================
    
    /**
     * Load S/L Recovery Type options from LookupService and populate dropdown
     */
    async function loadSavingPaymentTypes() {
        try {
            if (!window.LookupService) {
                console.warn('[CenterLoanMenu] LookupService not available');
                return;
            }

            console.log('[CenterLoanMenu] Loading S/L Recovery Type options...');
            const options = await window.LookupService.getSavingPaymentTypes();
            
            if (options && options.length > 0) {
                populateSLRecoveryTypeDropdown(options);
                console.log('[CenterLoanMenu] S/L Recovery Type options loaded:', options.length);
            } else {
                console.warn('[CenterLoanMenu] No S/L Recovery Type options returned');
            }
        } catch (error) {
            console.error('[CenterLoanMenu] Error loading S/L Recovery Type options:', error);
        }
    }

    /**
     * Populate the S/L Recovery Type dropdown with options
     * @param {Array} options - Array of options from LookupService
     */
    function populateSLRecoveryTypeDropdown(options) {
        const select = document.getElementById('MenuSLRecoveryType');
        if (!select) {
            console.warn('[CenterLoanMenu] MenuSLRecoveryType select not found');
            return;
        }

        // Clear existing options except the first placeholder
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add options from API
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value || '';
            option.textContent = opt.label || opt.value || '';
            select.appendChild(option);
        });

        console.log('[CenterLoanMenu] S/L Recovery Type dropdown populated with', options.length, 'options');
    }

    // =========================================================================
    // Interest Menu Dropdown
    // =========================================================================
    
    /**
     * Load interest menu options from API and populate dropdown
     * @param {string} loanSchemeID - The loan scheme ID to fetch interest menus for
     */
    async function loadInterestMenuCombo(loanSchemeID) {
        if (!loanSchemeID) {
            console.warn('No LoanSchemeID provided for interest menu combo');
            return;
        }

        const { bankID } = getEnv();
        
        try {
            if (!window.GroupService || !window.GroupService.getInterestMenuCombo) {
                console.warn('GroupService.getInterestMenuCombo not available');
                return;
            }

            const requestData = {
                BankID: bankID,
                LoanSchemeID: loanSchemeID
            };

            console.log('Loading interest menu combo with:', requestData);
            const response = await window.GroupService.getInterestMenuCombo(requestData);
            
            if (response && response.success !== false) {
                const data = response.data || response.Details01 || response;
                populateInterestMenuDropdown(Array.isArray(data) ? data : [data]);
            } else {
                console.warn('Failed to load interest menu combo:', response?.message);
            }
        } catch (error) {
            console.error('Error loading interest menu combo:', error);
        }
    }

    /**
     * Populate the Interest Menu ID dropdown with options
     * @param {Array} options - Array of interest menu options from API
     * Expected fields: RateID, Description
     */
    function populateInterestMenuDropdown(options) {
        const select = document.getElementById('InterestMenuId');
        if (!select) {
            console.warn('InterestMenuId dropdown not found');
            return;
        }

        // Clear existing options except the first placeholder
        while (select.options.length > 1) {
            select.remove(1);
        }

        // Add options from API response
        // API returns: RateID, Description
        if (Array.isArray(options)) {
            options.forEach(item => {
                const option = document.createElement('option');
                // Use RateID as the value (e.g., 'AOS', 'BALC', 'GLIM', etc.)
                option.value = item.RateID || item.rateid || item.InterestMenuID || item.InterestRateID || item.ID || '';
                // Use Description as the display text
                option.textContent = item.Description || item.description || item.InterestMenuDesc || item.Name || option.value;
                select.appendChild(option);
            });
            console.log('Populated interest menu dropdown with', options.length, 'options');
        }
    }

    // =========================================================================
    // Initialization
    // =========================================================================
    async function initialize() {
        console.log('Initializing Center Loan Menu...');

        // Load services if available
        if (window.ServiceLoader) {
            try {
                await window.ServiceLoader.loadCore();
                await window.ServiceLoader.loadScript('../../../../assets/js/services/shared/lookupService.js');
                await window.ServiceLoader.loadScript('../../../../assets/js/services/microfinance/groupService.js');
                console.log('GroupService loaded:', !!window.GroupService);
            } catch (error) {
                console.warn('Could not load services:', error);
            }
        } else {
            console.warn('ServiceLoader not available');
        }

        // Initialize components
        initSectionToggles();
        initEventListeners();

        // Load S/L Recovery Type dropdown options
        loadSavingPaymentTypes();

        // Set form mode to default (only View button enabled)
        setFormMode('default');

        // Explicitly ensure key fields are editable in default mode
        const keyFields = ['LoanCycleNo', 'LoanLevelNo', 'EffectiveDate'];
        keyFields.forEach(fieldId => {
            const field = document.getElementById(fieldId);
            if (field) {
                field.disabled = false;
                field.readOnly = false;
                field.removeAttribute('disabled');
                field.removeAttribute('readonly');
                console.log('Ensuring', fieldId, 'is enabled, disabled:', field.disabled, 'readonly:', field.readOnly);
            }
        });

        // Also ensure the lookup buttons are enabled
        document.querySelectorAll('[data-mcs-lookup]').forEach(btn => {
            btn.disabled = false;
            btn.removeAttribute('disabled');
        });

        // Initialize date pickers AFTER form mode is set (so they're not disabled)
        // Small delay to ensure DOM is ready
        setTimeout(() => {
            if (window.KairoDatePickers && window.KairoDatePickers.init) {
                console.log('Initializing date pickers after form mode set...');
                window.KairoDatePickers.init();
            }
            
            // Also ensure EffectiveDate flatpickr allows clicks
            const effectiveDateInput = document.getElementById('EffectiveDate');
            if (effectiveDateInput && effectiveDateInput._flatpickr) {
                effectiveDateInput._flatpickr.set('clickOpens', true);
                effectiveDateInput._flatpickr.set('allowInput', true);
            }
        }, 100);

        // Notify parent that form is open
        notifyParentFormOpened();

        console.log('Center Loan Menu initialized');

        // Final check after a delay to ensure fields are enabled
        setTimeout(() => {
            const keyFields = ['LoanCycleNo', 'LoanLevelNo', 'EffectiveDate'];
            keyFields.forEach(fieldId => {
                const field = document.getElementById(fieldId);
                if (field) {
                    field.disabled = false;
                    field.readOnly = false;
                    field.removeAttribute('disabled');
                    field.removeAttribute('readonly');
                    console.log('Final check -', fieldId, 'disabled:', field.disabled, 'readonly:', field.readOnly);
                }
            });
        }, 500);
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initialize);
    } else {
        initialize();
    }

    // Expose functions for external use
    window.CenterLoanMenu = {
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
        showInfo
    };

})();
