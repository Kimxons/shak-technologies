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

function initPersonalValidation() {
    const utils = window.ValidationUtils;
    if (!utils) return;

    // Name fields - alphabetic only
    const firstNameInput = document.getElementById('txt_personalFirstName');
    const middleNameInput = document.getElementById('txt_personalMiddleName');
    const lastNameInput = document.getElementById('txt_personalLastName');
    const motherNameInput = document.getElementById('txt_personalMotherName');
    
    [firstNameInput, middleNameInput, lastNameInput, motherNameInput].forEach(input => {
        if (input) utils.restrictAlphabetic(input);
    });

    // DOB - not future, calculate age
    const dobInput = document.getElementById('dt_personalDob');
    if (dobInput) {
        utils.setupDateField(dobInput, { notFuture: true, minAge: 18 });
        
        dobInput.addEventListener('change', () => {
            const age = utils.calculateAge(dobInput.value);
            const ageInput = document.getElementById('txt_personalAge');
            const ageAsOnInput = document.getElementById('txt_personalAgeAsOn');
            
            if (ageInput) ageInput.value = age;
            if (ageAsOnInput) ageAsOnInput.value = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
            
            // Validate minimum age
            if (age < 18) {
                utils.showError(dobInput, 'Client must be at least 18 years old');
            } else {
                utils.clearError(dobInput);
            }
        });
    }

    // ID dates - not future
    const issueDateInput = document.getElementById('dt_personalIssueDate');
    const expiryDateInput = document.getElementById('dt_personalExpiryDate');
    
    if (issueDateInput) utils.setupDateField(issueDateInput, { notFuture: true });
    if (expiryDateInput) utils.setupDateField(expiryDateInput, { notPast: true });

    // National ID - alphanumeric
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

    // Opened On - readonly, auto-fill with today's date on new client
    const openedOnInput = document.getElementById('dt_personalOpenedOn');
    if (openedOnInput) {
        utils.setupDateField(openedOnInput, { notFuture: true });
    }
}

window.initClientMaintenancePersonalTab = function (tabRoot, moduleId) {
    bindClientMaintenanceCrud(tabRoot, moduleId, window.ClientMaintenancePersonalService, 'personal');
    
    // Initialize validation
    initPersonalValidation();

    // Initialize Opened By user lookup
    initPersonalUserLookup(tabRoot, moduleId);
    
    // Note: Dropdown options are now server-side rendered in _ClientPersonal.cshtml
    // No client-side loading necessary
};

function initPersonalUserLookup(tabRoot, moduleId) {
    if (!tabRoot) return;

    const searchBtn = tabRoot.querySelector('[data-personal-action="lookup-opened-by"]');
    if (!searchBtn) return;

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

    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentValue = tabRoot.querySelector('#txt_personalOpenedBy')?.value || '';

        searchModal.open({
            title: 'Find User',
            tableID: 'OperatorID',
            moduleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
            searchFields: [
                { name: 'OperatorID', label: 'Operator ID', column: 'OperatorID', value: currentValue },
                { name: 'ClientName', label: 'User Name', column: 'ClientName' }
            ],
            autoSearch: false,
            onSelect: (record) => {
                const userId = record?.OperatorID || record?.LoginID || record?.UserID || record?.UserId || '';
                const userName = record?.ClientName || record?.Name || record?.UserName || record?.FullName || '';

                const idField = tabRoot.querySelector('#txt_personalOpenedBy');
                const nameField = tabRoot.querySelector('#txt_personalOpenedByName');
                if (idField) idField.value = userId;
                if (nameField) nameField.value = userName;
            }
        });
    });
}
