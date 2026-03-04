const CM_PRODUCTS_BASE = 'Identities/ClientMaintenance/Products';

function invokeClientMaintenanceProducts(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_PRODUCTS_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceProductsService = {
    get: (requestData) => invokeClientMaintenanceProducts('get', requestData),
    create: (requestData) => invokeClientMaintenanceProducts('create', requestData),
    update: (requestData) => invokeClientMaintenanceProducts('update', requestData),
    delete: (requestData) => invokeClientMaintenanceProducts('delete', requestData)
};

window.initClientMaintenanceProductsTab = function (tabRoot, moduleId) {
    bindClientMaintenanceCrud(tabRoot, moduleId, window.ClientMaintenanceProductsService, 'products');
};
