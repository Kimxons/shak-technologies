const CM_CORPORATE_BASE = 'Identities/ClientMaintenance/Corporate';

// Explicit field mapping for Corporate tab: API response key => form field ID/name
const CORPORATE_FIELD_MAP = {
    'CompanyName': 'txt_corporateCompanyName',
    'RegistrationDate': 'dt_corporateRegDate',
    'TIN': 'txt_corporateTin',
    'YearStarted': 'txt_corporateYearStarted',
    'NumberOfEmployees': 'txt_corporateEmployees',
    'Website': 'txt_corporateWebsite',
    'IssueDate': 'dt_corporateIssueDate',
    'ExpiryDate': 'dt_corporateExpiryDate',
    'VATRegistrationDate': 'dt_corporateVatRegDate',
    'OpenedOn': 'dt_corporateOpenedOn',
    'BusinessOwnershipID': 'sel_corporateOwnership',
    'BusinessLineID': 'sel_corporateBusinessLine',
    'IdentificationTypeID': 'sel_corporateIdType',
    'CountryID': 'sel_corporateCountry',
    'RelationshipManagerID': 'sel_corporateRelationshipManager'
};

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
    initCorporateGlLookup(tabRoot, moduleId);
    initCorporateUserLookup(tabRoot, moduleId);
};

function initCorporateGlLookup(tabRoot, moduleId) {
    if (!tabRoot) return;

    const searchBtn = tabRoot.querySelector('[data-corporate-action="lookup-gl"]');
    if (!searchBtn) return;

    const appCore = window.ClientMaintenanceCore?.getAppCore?.() || window.AppCore;
    if (!appCore || !window.SearchModal) {
        console.warn('[Corporate] SearchModal not available for GL lookup');
        return;
    }

    let searchModal = window._corporateGlSearchModal;
    if (!searchModal) {
        searchModal = new window.SearchModal(appCore);
        window._corporateGlSearchModal = searchModal;
    }

    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentValue = tabRoot.querySelector('#txt_corporateReportingGL')?.value || '';

        searchModal.open({
            title: 'Find GL Account',
            tableID: 'GeneralLedgerID',
            moduleID: moduleId || window.ClientMaintenanceCore?.moduleId || '',
            searchFields: [
                { name: 'AccountID', label: 'Account ID', column: 'AccountID', value: currentValue },
                { name: 'Description', label: 'Description', column: 'Description' }
            ],
            autoSearch: false,
            onSelect: (record) => {
                const accountId = record?.AccountID || record?.GLAccountID || '';
                const accountName = record?.Description || record?.AccountName || record?.ShortName || '';

                const idField = tabRoot.querySelector('#txt_corporateReportingGL');
                const nameField = tabRoot.querySelector('#txt_corporateReportingGLName');
                if (idField) idField.value = accountId;
                if (nameField) nameField.value = accountName;
            }
        });
    });
}

function initCorporateUserLookup(tabRoot, moduleId) {
    if (!tabRoot) return;

    const searchBtn = tabRoot.querySelector('[data-corporate-action="lookup-opened-by"]');
    if (!searchBtn) return;

    const appCore = window.ClientMaintenanceCore?.getAppCore?.() || window.AppCore;
    if (!appCore || !window.SearchModal) {
        console.warn('[Corporate] SearchModal not available for user lookup');
        return;
    }

    let searchModal = window._corporateOpenedBySearchModal;
    if (!searchModal) {
        searchModal = new window.SearchModal(appCore);
        window._corporateOpenedBySearchModal = searchModal;
    }

    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentValue = tabRoot.querySelector('#txt_corporateOpenedBy')?.value || '';

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

                const idField = tabRoot.querySelector('#txt_corporateOpenedBy');
                const nameField = tabRoot.querySelector('#txt_corporateOpenedByName');
                if (idField) idField.value = userId;
                if (nameField) nameField.value = userName;
            }
        });
    });
}
