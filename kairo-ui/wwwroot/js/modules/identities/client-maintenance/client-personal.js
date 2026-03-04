const CM_PERSONAL_BASE = 'Identities/ClientMaintenance/Personal';

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
    
    // Note: Dropdown options are now server-side rendered in _ClientPersonal.cshtml
    // No client-side loading necessary
};
