const CM_OFFERS_BASE = 'Identities/ClientMaintenance/Offers';

// Explicit field mapping for Offers tab: API response key => form field ID/name
const OFFERS_FIELD_MAP = {
    'OfferID': 'sel_offersOffer',
    'OfferCode': 'txt_offersOfferCode',
    'OfferName': 'txt_offersOfferName',
    'OfferType': 'sel_offersOfferType',
    'Status': 'sel_offersStatus',
    'Amount': 'txt_offersAmount',
    'DiscountPercentage': 'txt_offersDiscount',
    'ValidFrom': 'dt_offersValidFrom',
    'ValidTo': 'dt_offersValidTo'
};

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
