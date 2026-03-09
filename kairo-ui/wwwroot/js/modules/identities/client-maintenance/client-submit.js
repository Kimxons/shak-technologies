const CM_SUBMIT_BASE = 'Identities/ClientMaintenance/Submit';

// Explicit field mapping for Submit tab: API response key => form field ID/name
const SUBMIT_FIELD_MAP = {
    'SubmissionStatus': 'sel_submitStatus',
    'SubmittedBy': 'txt_submitSubmittedBy',
    'SubmittedOn': 'dt_submitSubmittedOn',
    'ApprovedBy': 'txt_submitApprovedBy',
    'ApprovedOn': 'dt_submitApprovedOn',
    'RejectionReason': 'txt_submitRejectionReason',
    'Remarks': 'txt_submitRemarks'
};

function invokeClientMaintenanceSubmit(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_SUBMIT_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceSubmitService = {
    get: (requestData) => invokeClientMaintenanceSubmit('get', requestData),
    create: (requestData) => invokeClientMaintenanceSubmit('create', requestData),
    update: (requestData) => invokeClientMaintenanceSubmit('update', requestData),
    delete: (requestData) => invokeClientMaintenanceSubmit('delete', requestData)
};

window.initClientMaintenanceSubmitTab = function (tabRoot, moduleId) {
    bindClientMaintenanceCrud(tabRoot, moduleId, window.ClientMaintenanceSubmitService, 'submit');
};
