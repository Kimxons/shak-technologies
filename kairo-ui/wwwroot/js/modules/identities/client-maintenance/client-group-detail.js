const CM_GROUP_DETAIL_BASE = 'Identities/ClientMaintenance/GroupDetail';

// Explicit field mapping for GroupDetail tab: API response key => form field ID/name
const GROUPDETAIL_FIELD_MAP = {
    'MaxGroupLoans': 'txt_groupMaxGroupLoans',
    'MaxGroupLoanLimit': 'txt_groupMaxGroupLoanLimit',
    'CurrentGroupLoans': 'txt_groupCurrentGroupLoans',
    'CurrentGroupLoanAmount': 'txt_groupCurrentGroupLoanAmount',
    'MaxOtherLoans': 'txt_groupMaxOtherLoans',
    'MaxOtherLoanLimit': 'txt_groupMaxOtherLoanLimit',
    'CurrentOtherLoans': 'txt_groupCurrentOtherLoans',
    'CurrentOtherLoanAmount': 'txt_groupCurrentOtherLoanAmount'
};

function invokeClientMaintenanceGroupDetail(action, requestData) {
    return window.ClientMaintenanceCore.invokeControllerMethod(CM_GROUP_DETAIL_BASE, action, 'POST', requestData || {});
}

window.ClientMaintenanceGroupDetailService = {
    get: (requestData) => invokeClientMaintenanceGroupDetail('get', requestData),
    create: (requestData) => invokeClientMaintenanceGroupDetail('create', requestData),
    update: (requestData) => invokeClientMaintenanceGroupDetail('update', requestData),
    delete: (requestData) => invokeClientMaintenanceGroupDetail('delete', requestData)
};

function initGroupDetailValidation() {
    const utils = window.ValidationUtils;
    if (!utils) return;

    // Max Group Loans - numeric, min 0
    const maxGroupLoansInput = document.getElementById('txt_groupMaxGroupLoans');
    if (maxGroupLoansInput) {
        utils.restrictNumeric(maxGroupLoansInput);
        maxGroupLoansInput.setAttribute('min', '0');
    }

    // Max Group Loan Limit - accounting format
    const maxGroupLimitInput = document.getElementById('txt_groupMaxGroupLoanLimit');
    if (maxGroupLimitInput) {
        utils.applyAccountingFormat(maxGroupLimitInput);
    }

    // Max Other Loans - numeric, min 0
    const maxOtherLoansInput = document.getElementById('txt_groupMaxOtherLoans');
    if (maxOtherLoansInput) {
        utils.restrictNumeric(maxOtherLoansInput);
        maxOtherLoansInput.setAttribute('min', '0');
    }

    // Max Other Loan Limit - accounting format
    const maxOtherLimitInput = document.getElementById('txt_groupMaxOtherLoanLimit');
    if (maxOtherLimitInput) {
        utils.applyAccountingFormat(maxOtherLimitInput);
    }
}

window.initClientMaintenanceGroupDetailTab = function (tabRoot, moduleId) {
    bindClientMaintenanceCrud(tabRoot, moduleId, window.ClientMaintenanceGroupDetailService, 'groupDetail');
    initGroupDetailValidation();
};
