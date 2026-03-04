const CM_OFFERS_BASE = 'Identities/ClientMaintenance/Offers';

function invokeClientMaintenanceOffers(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_OFFERS_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceOffersService = {
    get: (requestData) => invokeClientMaintenanceOffers('get', requestData),
    create: (requestData) => invokeClientMaintenanceOffers('create', requestData),
    update: (requestData) => invokeClientMaintenanceOffers('update', requestData),
    delete: (requestData) => invokeClientMaintenanceOffers('delete', requestData)
};

window.initClientMaintenanceOffersTab = function (tabRoot, moduleId) {
    bindClientMaintenanceCrud(tabRoot, moduleId, window.ClientMaintenanceOffersService, 'offers');
};
