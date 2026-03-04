const CM_SUBMIT_BASE = 'Identities/ClientMaintenance/Submit';

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
