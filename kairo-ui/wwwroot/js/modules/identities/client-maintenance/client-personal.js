const CM_PERSONAL_BASE = 'Identities/ClientMaintenance/Personal';

// Explicit field mapping for Personal tab: API response key => form field ID/name
const PERSONAL_FIELD_MAP = {
    'FirstName': 'txt_personalFirstName',
    'Firstname': 'txt_personalFirstName',
    'MiddleName': 'txt_personalMiddleName',
    'Middlename': 'txt_personalMiddleName',
    'LastName': 'txt_personalLastName',
    'Lastname': 'txt_personalLastName',
    'MotherName': 'txt_personalMotherName',
    'DateOfBirth': 'dt_personalDob',
    'DOB': 'dt_personalDob',
    'Age': 'txt_personalAge',
    'AgeAsOn': 'txt_personalAgeAsOn',
    'TitleID': 'sel_personalTitle',
    'GenderID': 'sel_personalGender',
    'NationalityID': 'sel_personalNationality',
    'ResidentID': 'sel_personalResident',
    'IdentificationTypeID': 'sel_personalIdType',
    'IDNumber': 'txt_personalIdNumber',
    'IssueDate': 'dt_personalIssueDate',
    'ExpiryDate': 'dt_personalExpiryDate',
    'LiteracyLevelID': 'sel_personalLiteracy',
    'MaritalStatusID': 'sel_personalMaritalStatus',
    'BloodGroupID': 'sel_personalBloodGroup',
    'HouseHoldMembers': 'txt_personalHouseMembers',
    'Children': 'txt_personalChildren',
    'Dependents': 'txt_personalDependents',
    'OpenedOn': 'dt_personalOpenedOn',
    'RelationshipManagerID': 'sel_personalRelationshipManager'
};

function invokeClientMaintenancePersonal(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_PERSONAL_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenancePersonalService = {
    get: (requestData) => invokeClientMaintenancePersonal('get', requestData),
    create: (requestData) => invokeClientMaintenancePersonal('create', requestData),
    update: (requestData) => invokeClientMaintenancePersonal('update', requestData),
    delete: (requestData) => invokeClientMaintenancePersonal('delete', requestData)
    // Note: Dropdown options are now rendered server-side in the Razor view
    // getAllOptions() endpoint is deprecated - maintain for backward compatibility only
};

/**
 * Show validation errors in consolidated error panel
 */
function showPersonalValidationErrors(errorMessages) {
    const panel = document.getElementById('frm_personalValidationPanel');
    const errorsList = document.getElementById('frm_personalErrorsList');
    
    if (!panel || !errorsList) return;
    
    // Clear previous errors
    errorsList.innerHTML = '';
    
    if (!errorMessages || errorMessages.length === 0) {
        panel.style.display = 'none';
        return;
    }
    
    // Populate error list
    errorMessages.forEach(error => {
        const li = document.createElement('li');
        li.innerHTML = `<span style="color: #dc2626; font-weight: 500;">${error}</span>`;
        errorsList.appendChild(li);
    });
    
    // Show panel
    panel.style.display = 'block';
    panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

/**
 * Clear validation error panel
 */
function clearPersonalValidationErrors() {
    const panel = document.getElementById('frm_personalValidationPanel');
    if (panel) panel.style.display = 'none';
}

/**
 * Initialize flatpickr for date fields with dd-MMM-yyyy format
 */
function initPersonalDateFields(tabRoot) {
    if (typeof window.flatpickr !== 'function') return;
    
    // Parse dd-MMM-yyyy format with flexible input (case-insensitive, various separators)
    const parseDDMMMYYYYDate = (dateStr) => {
        if (!dateStr) return null;
        dateStr = String(dateStr).trim();
        
        // Month name map (case-insensitive)
        const monthMap = {
            'jan': 0, 'january': 0,
            'feb': 1, 'february': 1,
            'mar': 2, 'march': 2,
            'apr': 3, 'april': 3,
            'may': 4,
            'jun': 5, 'june': 5,
            'jul': 6, 'july': 6,
            'aug': 7, 'august': 7,
            'sep': 8, 'sept': 8, 'september': 8,
            'oct': 9, 'october': 9,
            'nov': 10, 'november': 10,
            'dec': 11, 'december': 11
        };
        
        // Pattern 1: "04-mar-2000" or "4-Mar-2000" or "04 mar 2000" (flexible separators and case)
        const textMonthRegex = /^(\d{1,2})[-\/\s.,]+([a-z]{3,}?)[-\/\s.,]+(\d{4})$/i;
        let match = dateStr.match(textMonthRegex);
        if (match) {
            const day = parseInt(match[1], 10);
            const monthStr = match[2].toLowerCase().substring(0, 3);
            const month = monthMap[monthStr];
            const year = parseInt(match[3], 10);
            
            if (!isNaN(day) && month !== undefined && !isNaN(year)) {
                return new Date(year, month, day);
            }
        }
        
        // Pattern 2: Numeric format "04032000" (DDMMYYYY)
        const numericRegex = /^(\d{1,2})(\d{2})(\d{4})$/;
        match = dateStr.match(numericRegex);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1; // Month is 0-indexed in JS
            const year = parseInt(match[3], 10);
            
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                return new Date(year, month, day);
            }
        }
        
        // Pattern 3: "04-03-2000" or "4/3/2000" (numeric date with various separators)
        const numericSeparatedRegex = /^(\d{1,2})[-\/\s.,]+(\d{1,2})[-\/\s.,]+(\d{4})$/;
        match = dateStr.match(numericSeparatedRegex);
        if (match) {
            const day = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1; // Month is 0-indexed in JS
            const year = parseInt(match[3], 10);
            
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                return new Date(year, month, day);
            }
        }
        
        // Pattern 4: ISO "2000-03-04"
        const isoRegex = /^(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})$/;
        match = dateStr.match(isoRegex);
        if (match) {
            const year = parseInt(match[1], 10);
            const month = parseInt(match[2], 10) - 1;
            const day = parseInt(match[3], 10);
            
            if (day >= 1 && day <= 31 && month >= 0 && month <= 11) {
                return new Date(year, month, day);
            }
        }
        
        // Fallback: try native Date parsing
        try {
            const nativeDate = new Date(dateStr);
            if (!isNaN(nativeDate.getTime())) {
                return nativeDate;
            }
        } catch (_) {
        }
        
        return null;
    };
    
    // Format date as dd-MMM-yyyy
    const formatDDMMMYYYY = (date) => {
        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const day = String(date.getDate()).padStart(2, '0');
        const month = months[date.getMonth()];
        const year = date.getFullYear();
        return `${day}-${month}-${year}`;
    };
    
    // Initialize DOB with flatpickr
    const dobInput = tabRoot?.querySelector('#dt_personalDob');
    if (dobInput) {
        window.flatpickr(dobInput, {
            dateFormat: 'd-M-Y',
            mode: 'single',
            clickOpens: true,
            allowInput: true,
            parseDate: parseDDMMMYYYYDate,
            formatDate: formatDDMMMYYYY,
            maxDate: new Date(),
            onReady: function(selectedDates, dateStr, instance) {
                if (dobInput.disabled || dobInput.readOnly) {
                    instance.close();
                }
            },
            onChange: function(selectedDates) {
                if (selectedDates.length > 0) {
                    // Calculate age
                    const selectedDate = selectedDates[0];
                    const today = new Date();
                    let age = today.getFullYear() - selectedDate.getFullYear();
                    const monthDiff = today.getMonth() - selectedDate.getMonth();
                    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < selectedDate.getDate())) {
                        age--;
                    }
                    
                    const ageInput = tabRoot?.querySelector('#txt_personalAge');
                    const ageAsOnInput = tabRoot?.querySelector('#txt_personalAgeAsOn');
                    
                    if (ageInput) ageInput.value = Math.max(0, age);
                    if (ageAsOnInput) {
                        const now = new Date();
                        const day = String(now.getDate()).padStart(2, '0');
                        const month = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'][now.getMonth()];
                        const year = now.getFullYear();
                        ageAsOnInput.value = `${day}-${month}-${year}`;
                    }
                }
            }
        });
    }
    
    // Initialize Issue Date and Expiry Date with flatpickr
    const issueDateInput = tabRoot?.querySelector('#dt_personalIssueDate');
    if (issueDateInput) {
        window.flatpickr(issueDateInput, {
            dateFormat: 'd-M-Y',
            mode: 'single',
            clickOpens: true,
            allowInput: true,
            parseDate: parseDDMMMYYYYDate,
            formatDate: formatDDMMMYYYY,
            maxDate: new Date()
        });
    }
    
    const expiryDateInput = tabRoot?.querySelector('#dt_personalExpiryDate');
    if (expiryDateInput) {
        window.flatpickr(expiryDateInput, {
            dateFormat: 'd-M-Y',
            mode: 'single',
            clickOpens: true,
            allowInput: true,
            parseDate: parseDDMMMYYYYDate,
            formatDate: formatDDMMMYYYY,
            minDate: new Date()
        });
    }
}

/**
 * Initialize ID Number field - enable/disable based on ID Type selection
 */
function initPersonalIdNumberControl(tabRoot) {
    const idTypeSelect = tabRoot?.querySelector('#ddl_personalIdType');
    const idNumberInput = tabRoot?.querySelector('#txt_personalIdNumber');
    
    if (!idTypeSelect || !idNumberInput) return;
    
    // Initial state: disable if ID Type is empty
    const updateIdNumberState = () => {
        const hasIdType = Boolean(idTypeSelect.value);
        idNumberInput.disabled = !hasIdType;
        
        if (!hasIdType) {
            idNumberInput.value = '';
        }
    };
    
    // Set initial state
    updateIdNumberState();
    
    // Listen for ID Type changes
    idTypeSelect.addEventListener('change', updateIdNumberState);
}

/**
 * Validate age when DOB is set
 */
function validatePersonalAge(tabRoot) {
    const dobInput = tabRoot?.querySelector('#dt_personalDob');
    const ageInput = tabRoot?.querySelector('#txt_personalAge');
    
    if (!dobInput || !ageInput) return;
    
    const minimumAge = 18;
    const age = parseInt(ageInput.value) || 0;
    
    if (age < minimumAge) {
        return `Client must be at least ${minimumAge} years old (Current age: ${age})`;
    }
    
    return null;
}

function initPersonalValidation() {
    const utils = window.ValidationUtils;
    if (!utils) return;

    const tabRoot = document.querySelector('[data-cm-tab="personal"]');
    if (!tabRoot) return;

    // Name fields - alphabetic only
    const firstNameInput = document.getElementById('txt_personalFirstName');
    const middleNameInput = document.getElementById('txt_personalMiddleName');
    const lastNameInput = document.getElementById('txt_personalLastName');
    const motherNameInput = document.getElementById('txt_personalMotherName');
    
    [firstNameInput, middleNameInput, lastNameInput, motherNameInput].forEach(input => {
        if (input) utils.restrictAlphabetic(input);
    });

    // Initialize flatpickr for date fields
    initPersonalDateFields(tabRoot);

    // National ID - alphanumeric (only when ID Type is selected)
    const nationalIdInput = document.getElementById('txt_personalIdNumber');
    if (nationalIdInput) utils.restrictAlphanumeric(nationalIdInput);

    // House members, children, dependents - numeric only
    const houseMembersInput = document.getElementById('txt_personalHouseMembers');
    const childrenInput = document.getElementById('txt_personalChildren');
    const dependentsInput = document.getElementById('txt_personalDependents');
    
    [houseMembersInput, childrenInput, dependentsInput].forEach(input => {
        if (input) {
            utils.restrictNumeric(input);
            input.setAttribute('min', '0');
        }
    });
    
    // Initialize ID Number enable/disable control
    initPersonalIdNumberControl(tabRoot);
}

window.initClientMaintenancePersonalTab = function (tabRoot, moduleId) {
    bindClientMaintenanceCrud(tabRoot, moduleId, window.ClientMaintenancePersonalService, 'personal');
    
    // Initialize validation
    initPersonalValidation();

    // Initialize Opened By user lookup
    initPersonalUserLookup(tabRoot, moduleId);
    
    // Initialize all form fields as readonly until edit mode
    tabRoot.querySelectorAll('input, select, textarea').forEach((field) => {
        if (field.type !== 'button' && field.type !== 'submit') {
            field.readOnly = true;
            if (field.tagName === 'SELECT') {
                field.disabled = true;
            }
        }
    });

    // Edit mode handler - called from main client maintenance view
    tabRoot._cmSetEditMode = (isEditMode) => {
        const idTypeSelect = tabRoot.querySelector('#ddl_personalIdType');
        const idNumberInput = tabRoot.querySelector('#txt_personalIdNumber');
        const openedByNameInput = tabRoot.querySelector('#txt_personalOpenedByName');
        
        tabRoot.querySelectorAll('input, select, textarea, button[data-personal-action]').forEach((field) => {
            if (field.type === 'button' || field.type === 'submit') {
                // Enable/disable action buttons
                if (field.dataset.personalAction === 'lookup-opened-by') {
                    field.disabled = !isEditMode;
                }
            } else if (field.tagName === 'SELECT') {
                field.disabled = !isEditMode;
            } else if (field.type !== 'hidden') {
                field.readOnly = !isEditMode;
            }
        });
        
        // Special handling for ID Number - keep it disabled unless ID Type has a value
        if (idNumberInput && isEditMode) {
            const hasIdType = Boolean(idTypeSelect?.value);
            idNumberInput.disabled = !hasIdType;
            idNumberInput.readOnly = false;
        }

        // Opened By name should never be editable in any mode.
        if (openedByNameInput) {
            openedByNameInput.readOnly = true;
        }
    };
    
    // Add validation hook for workflow (to validate age before save)
    tabRoot._cmValidate = () => {
        const errors = [];
        
        // Validate age
        const ageError = validatePersonalAge(tabRoot);
        if (ageError) {
            errors.push(ageError);
        }
        
        if (errors.length > 0) {
            showPersonalValidationErrors(errors);
            return false;
        }
        
        clearPersonalValidationErrors();
        return true;
    };
}

function initPersonalUserLookup(tabRoot, moduleId) {
    if (!tabRoot) return;

    const idField = tabRoot.querySelector('#txt_personalOpenedBy');
    const nameField = tabRoot.querySelector('#txt_personalOpenedByName');
    const searchBtn = tabRoot.querySelector('[data-personal-action="lookup-opened-by"]');
    if (!searchBtn || !idField || !nameField) return;

    // Name field is display-only by design.
    nameField.readOnly = true;

    const appCore = window.ClientMaintenanceCore?.getAppCore?.() || window.AppCore;
    if (!appCore || !window.SearchModal) {
        console.warn('[Personal] SearchModal not available for user lookup');
        return;
    }

    let searchModal = window._personalOpenedBySearchModal;
    if (!searchModal) {
        searchModal = new window.SearchModal(appCore);
        window._personalOpenedBySearchModal = searchModal;
    }

    const getUserId = (record) => {
        return String(record?.OperatorID || record?.LoginID || record?.UserID || record?.UserId || '').trim();
    };

    const getUserName = (record) => {
        return String(record?.ClientName || record?.Name || record?.UserName || record?.FullName || '').trim();
    };

    const setOpenedByFields = (record) => {
        if (!record) return;

        const userId = getUserId(record);
        const userName = getUserName(record);

        idField.value = userId;
        nameField.value = userName;
    };

    let openedByLookupInFlight = false;

    const autoLoadOpenedByNameFromId = async () => {
        const typedOperatorId = String(idField.value || '').trim();
        if (!typedOperatorId) {
            nameField.value = '';
            return;
        }

        if (idField.readOnly || idField.disabled || openedByLookupInFlight) {
            return;
        }

        const lookupIdDescription = window.ClientMaintenanceCore?.lookupIdDescription;
        if (typeof lookupIdDescription !== 'function') {
            return;
        }

        openedByLookupInFlight = true;

        try {
            const result = await lookupIdDescription({
                controlTypeId: 'OperatorID',
                id: typedOperatorId,
                bankId: '00',
                typeId: '',
                advanceFilter: '',
                moduleId: String(moduleId || window.ClientMaintenanceCore?.moduleId || ''),
                descriptionFieldCandidates: ['ClientName', 'Name', 'UserName', 'FullName']
            });

            const record = result?.record;
            if (!record) {
                nameField.value = '';
                return;
            }

            setOpenedByFields(record);

            if (!String(idField.value || '').trim()) {
                idField.value = typedOperatorId;
            }
        } catch (error) {
            console.warn('[Personal] Failed to auto-load Opened By name from ID:', error);
        } finally {
            openedByLookupInFlight = false;
        }
    };

    const openUserSearch = () => {
        if (searchBtn.disabled || idField.readOnly || idField.disabled) return;

        searchModal.open({
            title: 'Find User',
            tableID: 'OperatorID',
            moduleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
            searchFields: [
                { name: 'OperatorID', label: 'Operator ID', column: 'OperatorID', value: idField.value || '' },
                { name: 'ClientName', label: 'User Name', column: 'ClientName' }
            ],
            autoSearch: false,
            onSelect: (record) => {
                setOpenedByFields(record);
            }
        });
    };

    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        openUserSearch();
    });

    idField.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            openUserSearch();
        }
    });

    idField.addEventListener('blur', (e) => {
        const relatedTarget = e.relatedTarget;
        if (relatedTarget instanceof HTMLElement && relatedTarget.matches('[data-personal-action="lookup-opened-by"]')) {
            return;
        }

        void autoLoadOpenedByNameFromId();
    });
}
