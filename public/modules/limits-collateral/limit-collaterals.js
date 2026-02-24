// Limit Collaterals - Main JavaScript
// Limits & Collateral Module

// Initialize services and load dependencies
(async function () {
    const { ServiceLoader } = window;

    // Load required services
    await ServiceLoader.loadCore();
    await ServiceLoader.loadLimitsCollateralService();
    await ServiceLoader.loadLookupService();
    await ServiceLoader.loadSearchService();

    // Get services
    const LimitsCollateralService = window.LimitsCollateralService;
    const LookupService = window.LookupService;
    const SearchService = window.SearchService;

    // DOM Elements - Action Buttons
    const btnView = document.getElementById('btnView');
    const btnAdd = document.getElementById('btnAdd');
    const btnEdit = document.getElementById('btnEdit');
    const btnSave = document.getElementById('btnSave');
    const btnDelete = document.getElementById('btnDelete');
    const btnCancel = document.getElementById('btnCancel');
    const btnPrevious = document.getElementById('btnPrevious');
    const btnNext = document.getElementById('btnNext');

    // DOM Elements - Form Fields
    const branchId = document.getElementById('BranchId');
    const limitId = document.getElementById('LimitId');
    const collateralId = document.getElementById('CollateralId');
    const refNo = document.getElementById('RefNo');
    const collateralType = document.getElementById('CollateralType');
    const collateralValue = document.getElementById('CollateralValue');
    const apportionedValue = document.getElementById('ApportionedValue');
    const apportionmentRate = document.getElementById('ApportionmentRate');
    const remarks = document.getElementById('Remarks');

    // DOM Elements - Behind the Scene
    const createdBy = document.getElementById('CreatedBy');
    const modifiedBy = document.getElementById('ModifiedBy');
    const supervisedBy = document.getElementById('SupervisedBy');
    const createdOn = document.getElementById('CreatedOn');
    const modifiedOn = document.getElementById('ModifiedOn');
    const supervisedOn = document.getElementById('SupervisedOn');

    // DOM Elements - Search Buttons
    const btnSearchLimit = document.getElementById('btnSearchLimit');
    const btnSearchCollateral = document.getElementById('btnSearchCollateral');

    // Form State
    let currentMode = 'view'; // 'view', 'add', 'edit'
    let currentData = null;
    let isDirty = false;

    // Event Listeners - Action Buttons
    btnView.addEventListener('click', () => switchMode('view'));
    btnAdd.addEventListener('click', () => switchMode('add'));
    btnEdit.addEventListener('click', () => switchMode('edit'));
    btnSave.addEventListener('click', saveLimitCollateral);
    btnDelete.addEventListener('click', deleteLimitCollateral);
    btnCancel.addEventListener('click', cancelOperation);
    btnPrevious.addEventListener('click', navigatePrevious);
    btnNext.addEventListener('click', navigateNext);

    // Event Listeners - Search Buttons
    btnSearchLimit.addEventListener('click', searchLimit);
    btnSearchCollateral.addEventListener('click', searchCollateral);

    // Event Listener - Auto-load when LimitId is entered
    limitId.addEventListener('blur', () => {
        if (limitId.value.trim() && currentMode === 'view') {
            loadLimitCollateral();
        }
    });

    // Event Listeners - Form Change Detection
    const formInputs = [branchId, limitId, collateralId, refNo, collateralType, collateralValue,
        apportionedValue, apportionmentRate, remarks];
    formInputs.forEach(input => {
        input.addEventListener('change', () => isDirty = true);
    });

    // Initialize
    document.addEventListener('DOMContentLoaded', () => {
        console.log('🚀 Limit Collaterals page initialized');
        console.log('🌍 Environment:', window.Environment);
        switchMode('view');
        initializeDropdowns();
    });

    // Initialize dropdowns with data
    async function initializeDropdowns() {
        try {
            // Load collateral type options if using system codes
            // const types = await LookupService.getSystemCodeOptions("CollateralTypeID");
            // populateDropdown(collateralType, types);

            // For now, dropdowns are hard-coded in HTML
            console.log('Dropdowns initialized');
        } catch (error) {
            console.error('Error loading dropdowns:', error);
            showMessage('Error loading dropdown data', 'error');
        }
    }

    function switchMode(mode) {
        currentMode = mode;
        updateUIForMode();
    }

    function updateUIForMode() {
        const isView = currentMode === 'view';
        const isAdd = currentMode === 'add';
        const isEdit = currentMode === 'edit';

        // Enable/Disable buttons
        btnView.disabled = isView;
        btnAdd.disabled = isAdd;
        btnEdit.disabled = isEdit || isAdd;
        btnSave.disabled = isView;
        btnDelete.disabled = isView || isAdd;
        btnCancel.disabled = isView;
        btnPrevious.disabled = !isView;
        btnNext.disabled = !isView;

        // Enable/Disable form fields
        const fieldsToToggle = [branchId, collateralType, collateralValue, apportionedValue,
            apportionmentRate, remarks];

        fieldsToToggle.forEach(field => {
            if (isView) {
                field.setAttribute('readonly', 'true');
                field.disabled = field.tagName === 'SELECT';
            } else {
                field.removeAttribute('readonly');
                field.disabled = false;
            }
        });

        // LimitId and CollateralId are readonly except in Add mode
        if (isAdd) {
            limitId.removeAttribute('readonly');
            collateralId.removeAttribute('readonly');
            btnSearchLimit.disabled = false;
            btnSearchCollateral.disabled = false;
        } else {
            limitId.setAttribute('readonly', 'true');
            collateralId.setAttribute('readonly', 'true');
            btnSearchLimit.disabled = isView;
            btnSearchCollateral.disabled = isView;
        }

        // Behind the scene fields are always readonly
        [createdBy, modifiedBy, supervisedBy, createdOn, modifiedOn, supervisedOn].forEach(field => {
            field.setAttribute('readonly', 'true');
        });

        if (isAdd) {
            clearForm();
        }
    }

    function loadLimitCollateral() {
        if (!limitId.value.trim()) {
            showMessage('Please enter a Limit ID', 'warning');
            return;
        }

        showMessage('Loading limit collateral...', 'info');

        // Get data from Environment or use defaults
        const ourBranchID = branchId?.value || window.Environment?.branchID || "0325";
        const operatorID = window.Environment?.operatorID || "STEVE";

        const requestData = {
            OurBranchID: ourBranchID,
            LimitID: limitId.value.trim(),
            CollateralID: collateralId?.value || "N",
            RefNo: refNo?.value || "0",
            OperatorID: operatorID,
            Direction: "1" // Default view direction
        };

        console.log('🔍 Loading Limit Collateral:', requestData);

        LimitsCollateralService.getLimitCollaterals(requestData)
            .then(result => {
                console.log('📥 API Response:', result);

                if (result.success) {
                    showMessage('Limit collateral loaded', 'success');

                    // Parse the response data
                    if (result.data && result.data.Details && result.data.Details.length > 0) {
                        const details = result.data.Details[0];
                        const details01 = result.data.Details01?.[0] || {};
                        const details02 = result.data.Details02?.[0] || {};

                        console.log('📋 Details:', details);
                        console.log('📋 Details01:', details01);
                        console.log('📋 Details02:', details02);

                        // Map API response to form fields (Original Logic)
                        const mappedData = {
                            ourBranchID: details02.OurBranchID || ourBranchID,
                            limitID: details02.LimitID || limitId.value,
                            collateralID: details02.CollateralID || collateralId.value,
                            refNo: details02.RefNo || '',
                            collateralType: details02.CollateralType || '',
                            collateralValue: details02.CollateralValue || '',
                            apportionedValue: details02.ApportionedValue || '',
                            apportionmentRate: details02.ApportionmentRate || '',
                            remarks: details02.Remarks || '',
                            createdBy: details02.CreatedBy || details.OperatorID || '',
                            createdOn: details02.CreatedOn || details.CreatedOn || '',
                            modifiedBy: details02.ModifiedBy || '',
                            modifiedOn: details02.ModifiedOn || '',
                            supervisedBy: details02.SupervisedBy || '',
                            supervisedOn: details02.SupervisedOn || ''
                        };

                        console.log('✅ Mapped Data:', mappedData);

                        currentData = mappedData;
                        loadDataToForm(mappedData);
                    } else {
                        console.warn('⚠️ No Details in response:', result.data);
                        showMessage('No data found for this limit collateral', 'warning');
                    }
                } else {
                    console.error('❌ API Error:', result.message);
                    showMessage(result.message || 'Failed to load limit collateral', 'error');
                }
            })
            .catch(error => {
                console.error('💥 Error loading limit collateral:', error);
                showMessage('Error loading limit collateral', 'error');
            });
    }

    function saveLimitCollateral() {
        if (!validateForm()) {
            return;
        }

        const ourBranchID = branchId?.value || window.Environment?.branchID || "0325";
        const operatorID = window.Environment?.operatorID || "STEVE";

        const data = {
            OurBranchID: ourBranchID,
            LimitID: limitId.value,
            CollateralID: collateralId.value,
            RefNo: refNo.value,
            CollateralType: collateralType.value,
            CollateralValue: collateralValue.value,
            ApportionedValue: apportionedValue.value,
            ApportionmentRate: apportionmentRate.value,
            Remarks: remarks.value,
            OperatorID: operatorID
        };

        showMessage(`${currentMode === 'add' ? 'Creating' : 'Updating'} limit collateral...`, 'info');

        const apiCall = currentMode === 'add'
            ? LimitsCollateralService.createLimitCollateral(data)
            : LimitsCollateralService.updateLimitCollateral(data);

        apiCall
            .then(result => {
                if (result.success) {
                    showMessage(`Limit collateral ${currentMode === 'add' ? 'created' : 'updated'} successfully`, 'success');
                    currentData = data;
                    isDirty = false;
                    switchMode('view');
                } else {
                    showMessage(result.message || 'Failed to save limit collateral', 'error');
                }
            })
            .catch(error => {
                console.error('Error saving limit collateral:', error);
                showMessage('Error saving limit collateral', 'error');
            });
    }

    function deleteLimitCollateral() {
        if (!limitId.value.trim() || !collateralId.value.trim()) {
            showMessage('No limit collateral selected to delete', 'warning');
            return;
        }

        if (confirm(`Are you sure you want to delete this limit collateral?\nLimit ID: ${limitId.value}\nCollateral ID: ${collateralId.value}`)) {
            showMessage('Deleting limit collateral...', 'info');

            const ourBranchID = branchId?.value || window.Environment?.branchID || "0325";
            const operatorID = window.Environment?.operatorID || "STEVE";

            const data = {
                OurBranchID: ourBranchID,
                LimitID: limitId.value,
                CollateralID: collateralId.value,
                OperatorID: operatorID
            };

            LimitsCollateralService.deleteLimitCollateral(data)
                .then(result => {
                    if (result.success) {
                        showMessage('Limit collateral deleted successfully', 'success');
                        clearForm();
                        switchMode('view');
                    } else {
                        showMessage(result.message || 'Failed to delete limit collateral', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error deleting limit collateral:', error);
                    showMessage('Error deleting limit collateral', 'error');
                });
        }
    }

    function cancelOperation() {
        if (isDirty) {
            if (!confirm('You have unsaved changes. Are you sure you want to cancel?')) {
                return;
            }
        }

        isDirty = false;

        if (currentMode === 'add') {
            clearForm();
        } else if (currentData) {
            loadDataToForm(currentData);
        }

        switchMode('view');
        showMessage('Operation cancelled', 'info');
    }

    function navigatePrevious() {
        if (isDirty) {
            if (!confirm('You have unsaved changes. Continue navigation?')) {
                return;
            }
        }

        if (!limitId.value.trim()) {
            showMessage('No limit ID selected', 'warning');
            return;
        }

        showMessage('Loading previous record...', 'info');

        const ourBranchID = branchId?.value || window.Environment?.branchID || "0325";
        const operatorID = window.Environment?.operatorID || "STEVE";

        const requestData = {
            OurBranchID: ourBranchID,
            LimitID: limitId.value.trim(),
            CollateralID: collateralId?.value || "N",
            RefNo: refNo?.value || "0",
            OperatorID: operatorID,
            Direction: "0" // 0 for previous
        };

        LimitsCollateralService.getLimitCollaterals(requestData)
            .then(result => {
                if (result.success && result.data && result.data.Details02 && result.data.Details02.length > 0) {
                    const details02 = result.data.Details02[0];
                    limitId.value = details02.LimitID || limitId.value;
                    collateralId.value = details02.CollateralID || collateralId.value;
                    loadLimitCollateral();
                } else {
                    showMessage('No previous record found', 'info');
                }
            })
            .catch(error => {
                console.error('Error navigating to previous record:', error);
                showMessage('Error loading previous record', 'error');
            });
    }

    function navigateNext() {
        if (isDirty) {
            if (!confirm('You have unsaved changes. Continue navigation?')) {
                return;
            }
        }

        if (!limitId.value.trim()) {
            showMessage('No limit ID selected', 'warning');
            return;
        }

        showMessage('Loading next record...', 'info');

        const ourBranchID = branchId?.value || window.Environment?.branchID || "0325";
        const operatorID = window.Environment?.operatorID || "STEVE";

        const requestData = {
            OurBranchID: ourBranchID,
            LimitID: limitId.value.trim(),
            CollateralID: collateralId?.value || "N",
            RefNo: refNo?.value || "0",
            OperatorID: operatorID,
            Direction: "1" // 1 for next
        };

        LimitsCollateralService.getLimitCollaterals(requestData)
            .then(result => {
                if (result.success && result.data && result.data.Details02 && result.data.Details02.length > 0) {
                    const details02 = result.data.Details02[0];
                    limitId.value = details02.LimitID || limitId.value;
                    collateralId.value = details02.CollateralID || collateralId.value;
                    loadLimitCollateral();
                } else {
                    showMessage('No next record found', 'info');
                }
            })
            .catch(error => {
                console.error('Error navigating to next record:', error);
                showMessage('Error loading next record', 'error');
            });
    }

    function searchLimit() {
        const ourBranchID = branchId?.value || window.Environment?.branchID || "0325";
        const operatorID = window.Environment?.operatorID || "STEVE";
        const moduleID = window.Environment?.moduleID || 1000;

        showMessage('Opening search dialog...', 'info');

        const searchTerm = prompt('Enter Limit ID to search:');
        if (!searchTerm) return;

        const searchRequest = {
            TableID: "Limits",
            WhereStmt: `LimitID like '%${searchTerm}%'`,
            OrderBy: "order by LimitID asc",
            PrevOrNext: "1",
            RefID: "",
            OperatorID: operatorID,
            ModuleID: moduleID,
            OurBranchID: ourBranchID
        };

        SearchService.search(searchRequest)
            .then(result => {
                if (result.success && result.data) {
                    if (Array.isArray(result.data) && result.data.length > 0) {
                        limitId.value = result.data[0].LimitID || searchTerm;
                        loadLimitCollateral();
                    } else if (result.data.LimitID) {
                        limitId.value = result.data.LimitID;
                        loadLimitCollateral();
                    } else {
                        showMessage('No matching limits found', 'info');
                    }
                } else {
                    showMessage('No results found', 'info');
                }
            })
            .catch(error => {
                console.error('Error searching limits:', error);
                showMessage('Error searching limits', 'error');
            });
    }

    function searchCollateral() {
        const ourBranchID = branchId?.value || window.Environment?.branchID || "0325";
        const operatorID = window.Environment?.operatorID || "STEVE";
        const moduleID = window.Environment?.moduleID || 1000;

        showMessage('Opening collateral search dialog...', 'info');

        const searchTerm = prompt('Enter Collateral ID to search:');
        if (!searchTerm) return;

        const searchRequest = {
            TableID: "Collaterals",
            WhereStmt: `CollateralID like '%${searchTerm}%'`,
            OrderBy: "order by CollateralID asc",
            PrevOrNext: "1",
            RefID: "",
            OperatorID: operatorID,
            ModuleID: moduleID,
            OurBranchID: ourBranchID
        };

        SearchService.search(searchRequest)
            .then(result => {
                if (result.success && result.data) {
                    if (Array.isArray(result.data) && result.data.length > 0) {
                        collateralId.value = result.data[0].CollateralID || searchTerm;
                    } else if (result.data.CollateralID) {
                        collateralId.value = result.data.CollateralID;
                    } else {
                        showMessage('No matching collaterals found', 'info');
                    }
                } else {
                    showMessage('No results found', 'info');
                }
            })
            .catch(error => {
                console.error('Error searching collaterals:', error);
                showMessage('Error searching collaterals', 'error');
            });
    }

    function validateForm() {
        const requiredFields = [
            { field: branchId, name: 'Branch ID' },
            { field: limitId, name: 'Limit ID' },
            { field: collateralId, name: 'Collateral ID' }
        ];

        // Remove previous validation states
        requiredFields.forEach(({ field }) => {
            field.classList.remove('is-invalid');
            field.classList.remove('is-valid');
        });

        // Validate each field
        let isValid = true;
        let firstInvalidField = null;

        for (const { field, name } of requiredFields) {
            const value = field.value ? field.value.trim() : '';

            if (!value || value === '' || value === '--Select--') {
                field.classList.add('is-invalid');
                if (!firstInvalidField) {
                    firstInvalidField = field;
                    showMessage(`${name} is required`, 'error');
                }
                isValid = false;
            }
        }

        if (firstInvalidField) {
            firstInvalidField.focus();
        }

        return isValid;
    }

    function clearForm() {
        branchId.value = window.Environment?.branchID || '';
        limitId.value = '';
        collateralId.value = '';
        refNo.value = '';
        collateralType.value = '';
        collateralValue.value = '';
        apportionedValue.value = '';
        apportionmentRate.value = '';
        remarks.value = '';

        createdBy.value = '';
        modifiedBy.value = '';
        supervisedBy.value = '';
        createdOn.value = '';
        modifiedOn.value = '';
        supervisedOn.value = '';

        currentData = null;
        isDirty = false;
    }

    function loadDataToForm(data) {
        branchId.value = data.ourBranchID || '';
        limitId.value = data.limitID || '';
        collateralId.value = data.collateralID || '';
        refNo.value = data.refNo || '';
        collateralType.value = data.collateralType || '';
        collateralValue.value = data.collateralValue || '';
        apportionedValue.value = data.apportionedValue || '';
        apportionmentRate.value = data.apportionmentRate || '';
        remarks.value = data.remarks || '';

        // Behind the scene fields
        createdBy.value = data.createdBy || '';
        modifiedBy.value = data.modifiedBy || '';
        supervisedBy.value = data.supervisedBy || '';
        createdOn.value = data.createdOn || '';
        modifiedOn.value = data.modifiedOn || '';
        supervisedOn.value = data.supervisedOn || '';
    }

    function populateDropdown(selectElement, options) {
        selectElement.innerHTML = '<option value="">--Select--</option>';
        options.forEach(opt => {
            const option = document.createElement('option');
            option.value = opt.value;
            option.textContent = opt.label;
            selectElement.appendChild(option);
        });
    }

    function showMessage(message, type = 'info') {
        console.log(`[${type.toUpperCase()}] ${message}`);
        // In a real application, this would show a toast notification
    }

})(); // End of async IIFE
