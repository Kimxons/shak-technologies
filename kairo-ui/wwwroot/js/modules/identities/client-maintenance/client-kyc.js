const CM_KYC_BASE = 'Identities/ClientMaintenance/Kyc';

// Explicit field mapping for KYC tab: API response key => form field ID/name
const KYC_FIELD_MAP = {
    'PEP': 'rad_pep',
    'PEPYes': 'rad_pepYes',
    'PEPNo': 'rad_pepNo',
    'PEPCategory': 'txt_kycPepCategory',
    'PEPDetails': 'txt_kycPepDetails',
    'USPerson': 'rad_usPerson',
    'USPersonYes': 'rad_usPersonYes',
    'USPersonNo': 'rad_usPersonNo',
    'SSN': 'txt_ssn',
    'SocialSecurityNumber': 'txt_ssn',
    'USTIN': 'txt_ustin',
    'USTaxIdentificationNumber': 'txt_ustin',
    'TradeLicenseNo': 'txt_kycTradeLicenseNo',
    'ClientAreaID': 'sel_kycClientArea',
    'ClientArea': 'sel_kycClientArea',
    'PersonalStatusID': 'sel_kycPersonalStatus',
    'PersonalStatus': 'sel_kycPersonalStatus',
    'CloseLawSuitID': 'sel_kycCloseLawSuit',
    'CloseLawSuit': 'sel_kycCloseLawSuit',
    'CNFSOID': 'sel_kycCnfso',
    'CNFSO': 'sel_kycCnfso'
};

function invokeClientMaintenanceKyc(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_KYC_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceKycService = {
    get: (requestData) => invokeClientMaintenanceKyc('get', requestData),
    create: (requestData) => invokeClientMaintenanceKyc('create', requestData),
    update: (requestData) => invokeClientMaintenanceKyc('update', requestData),
    delete: (requestData) => invokeClientMaintenanceKyc('delete', requestData)
};

function initKycValidation() {
    const utils = window.ValidationUtils;
    if (!utils) return;

    // PEP section toggle
    const pepYesRadio = document.getElementById('rad_pepYes');
    const pepNoRadio = document.getElementById('rad_pepNo');
    const pepDetailsSection = document.querySelector('[data-kyc-section="pep-details"]');

    const togglePepSection = () => {
        if (pepDetailsSection) {
            const isPep = pepYesRadio && pepYesRadio.checked;
            if (isPep) {
                pepDetailsSection.classList.remove('d-none');
            } else {
                pepDetailsSection.classList.add('d-none');
            }
        }
    };

    if (pepYesRadio) pepYesRadio.addEventListener('change', togglePepSection);
    if (pepNoRadio) pepNoRadio.addEventListener('change', togglePepSection);

    // US Person section toggle
    const usPersonYesRadio = document.getElementById('rad_usPersonYes');
    const usPersonNoRadio = document.getElementById('rad_usPersonNo');
    const usDetailsSection = document.querySelector('[data-kyc-section="us-details"]');

    const toggleUsPersonSection = () => {
        if (usDetailsSection) {
            const isUsPerson = usPersonYesRadio && usPersonYesRadio.checked;
            if (isUsPerson) {
                usDetailsSection.classList.remove('d-none');
            } else {
                usDetailsSection.classList.add('d-none');
            }
        }
    };

    if (usPersonYesRadio) usPersonYesRadio.addEventListener('change', toggleUsPersonSection);
    if (usPersonNoRadio) usPersonNoRadio.addEventListener('change', toggleUsPersonSection);

    // SSN - alphanumeric
    const ssnInput = document.getElementById('txt_ssn');
    if (ssnInput) utils.restrictAlphanumeric(ssnInput);

    // US TIN - alphanumeric
    const ustinInput = document.getElementById('txt_ustin');
    if (ustinInput) utils.restrictAlphanumeric(ustinInput);

    // Trade License No - alphanumeric
    const tradeLicenseInput = document.getElementById('txt_kycTradeLicenseNo');
    if (tradeLicenseInput) utils.restrictAlphanumeric(tradeLicenseInput);
}

window.initClientMaintenanceKycTab = function (tabRoot, moduleId) {
    bindClientMaintenanceCrud(tabRoot, moduleId, window.ClientMaintenanceKycService, 'kyc');
    initKycValidation();
};
