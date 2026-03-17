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
        tabRoot.querySelectorAll('input, select, textarea, button[data-corporate-action]').forEach((field) => {
            if (field.type === 'button' || field.type === 'submit') {
                // Enable/disable action buttons (lookup buttons)
                if (field.dataset.corporateAction?.includes('lookup')) {
                    field.disabled = !isEditMode;
                }
            } else if (field.tagName === 'SELECT') {
                field.disabled = !isEditMode;
            } else if (field.type !== 'hidden') {
                field.readOnly = !isEditMode;
            }
        });
    };
};

function initCorporateGlLookup(tabRoot, moduleId) {
    if (!tabRoot) return;

    const idField = tabRoot.querySelector('#txt_corporateReportingGL');
    const nameField = tabRoot.querySelector('#txt_corporateReportingGLName');
    const searchBtn = tabRoot.querySelector('[data-corporate-action="lookup-gl"]');
    if (!searchBtn || !idField || !nameField) return;

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

    const setGlFields = (record) => {
        const accountId = record?.AccountID || record?.GLAccountID || record?.ID || '';
        const accountName = record?.Description || record?.AccountName || record?.ShortName || record?.Name || '';

        idField.value = accountId;
        nameField.value = accountName;
    };

    let glLookupInFlight = false;

    const autoLoadGlNameFromId = async () => {
        const typedAccountId = String(idField.value || '').trim();
        if (!typedAccountId) {
            nameField.value = '';
            return;
        }

        if (idField.readOnly || idField.disabled || glLookupInFlight) {
            return;
        }

        const lookupIdDescription = window.ClientMaintenanceCore?.lookupIdDescription;
        if (typeof lookupIdDescription !== 'function') {
            return;
        }

        glLookupInFlight = true;
        try {
            const result = await lookupIdDescription({
                controlTypeId: 'GeneralLedgerID',
                id: typedAccountId,
                bankId: '00',
                typeId: '',
                advanceFilter: '',
                moduleId: String(moduleId || window.ClientMaintenanceCore?.moduleId || ''),
                descriptionFieldCandidates: ['Description', 'AccountName', 'ShortName', 'Name']
            });

            const record = result?.record;
            if (!record) {
                nameField.value = '';
                return;
            }

            setGlFields(record);

            if (!String(idField.value || '').trim()) {
                idField.value = typedAccountId;
            }
        } catch (error) {
            console.warn('[Corporate] Failed to auto-load GL description from ID:', error);
        } finally {
            glLookupInFlight = false;
        }
    };

    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentValue = idField.value || '';

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
                setGlFields(record);
            }
        });
    });

    idField.addEventListener('blur', (e) => {
        const relatedTarget = e.relatedTarget;
        if (relatedTarget instanceof HTMLElement && relatedTarget.matches('[data-corporate-action="lookup-gl"]')) {
            return;
        }

        void autoLoadGlNameFromId();
    });

    idField.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            searchBtn.click();
        }
    });
}

function initCorporateUserLookup(tabRoot, moduleId) {
    if (!tabRoot) return;

    const idField = tabRoot.querySelector('#txt_corporateOpenedBy');
    const nameField = tabRoot.querySelector('#txt_corporateOpenedByName');
    const searchBtn = tabRoot.querySelector('[data-corporate-action="lookup-opened-by"]');
    if (!searchBtn || !idField || !nameField) return;

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

    const setOpenedByFields = (record) => {
        const userId = record?.OperatorID || record?.LoginID || record?.UserID || record?.UserId || '';
        const userName = record?.ClientName || record?.Name || record?.UserName || record?.FullName || '';

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
            console.warn('[Corporate] Failed to auto-load Opened By name from ID:', error);
        } finally {
            openedByLookupInFlight = false;
        }
    };

    searchBtn.addEventListener('click', (e) => {
        e.preventDefault();
        const currentValue = idField.value || '';

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
                setOpenedByFields(record);
            }
        });
    });

    idField.addEventListener('blur', (e) => {
        const relatedTarget = e.relatedTarget;
        if (relatedTarget instanceof HTMLElement && relatedTarget.matches('[data-corporate-action="lookup-opened-by"]')) {
            return;
        }

        void autoLoadOpenedByNameFromId();
    });

    idField.addEventListener('keydown', (e) => {
        if (e.key === 'F2') {
            e.preventDefault();
            searchBtn.click();
        }
    });
}
