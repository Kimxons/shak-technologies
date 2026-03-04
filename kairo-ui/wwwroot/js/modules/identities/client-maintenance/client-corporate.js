const CM_CORPORATE_BASE = 'Identities/ClientMaintenance/Corporate';

function invokeClientMaintenanceCorporate(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_CORPORATE_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceCorporateService = {
    get: (requestData) => invokeClientMaintenanceCorporate('get', requestData),
    create: (requestData) => invokeClientMaintenanceCorporate('create', requestData),
    update: (requestData) => invokeClientMaintenanceCorporate('update', requestData),
    delete: (requestData) => invokeClientMaintenanceCorporate('delete', requestData)
};

function initCorporateValidation() {
    const utils = window.ValidationUtils;
    if (!utils) return;

    // Company name - alphanumeric
    const companyNameInput = document.getElementById('txt_corporateCompanyName');
    if (companyNameInput) utils.restrictAlphanumeric(companyNameInput);

    // Registration date - not future
    const regDateInput = document.getElementById('dt_corporateRegDate');
    if (regDateInput) utils.setupDateField(regDateInput, { notFuture: true });

    // TIN - alphanumeric
    const tinInput = document.getElementById('txt_corporateTin');
    if (tinInput) utils.restrictAlphanumeric(tinInput);

    // Year Started - validate year, not future
    const yearStartedInput = document.getElementById('txt_corporateYearStarted');
    if (yearStartedInput) {
        yearStartedInput.setAttribute('maxlength', '4');
        yearStartedInput.setAttribute('pattern', '[0-9]{4}');
        utils.restrictNumeric(yearStartedInput);
        
        yearStartedInput.addEventListener('blur', () => {
            if (yearStartedInput.value && !utils.isValidYear(yearStartedInput.value)) {
                utils.showError(yearStartedInput, 'Please enter a valid year (1800-current year)');
            } else {
                utils.clearError(yearStartedInput);
            }
        });
    }

    // Number of employees - numeric, min 0
    const employeesInput = document.getElementById('txt_corporateEmployees');
    if (employeesInput) {
        utils.restrictNumeric(employeesInput);
        employeesInput.setAttribute('min', '0');
    }

    // Website - URL format
    const websiteInput = document.getElementById('txt_corporateWebsite');
    if (websiteInput) {
        websiteInput.addEventListener('blur', () => {
            if (websiteInput.value && !utils.isValidWebsite(websiteInput.value)) {
                utils.showError(websiteInput, 'Please enter a valid website URL');
            } else {
                utils.clearError(websiteInput);
            }
        });
    }

    // ID dates - not future
    const issueDateInput = document.getElementById('dt_corporateIssueDate');
    const expiryDateInput = document.getElementById('dt_corporateExpiryDate');
    
    if (issueDateInput) utils.setupDateField(issueDateInput, { notFuture: true });
    if (expiryDateInput) utils.setupDateField(expiryDateInput, { notPast: true });

    // VAT registration date - not future
    const vatDateInput = document.getElementById('dt_corporateVatRegDate');
    if (vatDateInput) utils.setupDateField(vatDateInput, { notFuture: true });

    // Opened On - not future
    const openedOnInput = document.getElementById('dt_corporateOpenedOn');
    if (openedOnInput) utils.setupDateField(openedOnInput, { notFuture: true });
}

window.initClientMaintenanceCorporateTab = function (tabRoot, moduleId) {
    bindClientMaintenanceCrud(tabRoot, moduleId, window.ClientMaintenanceCorporateService, 'corporate');
    initCorporateValidation();
};
