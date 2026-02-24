// Loan Utilization Service (Workflow)
(function (global) {
    const CoreApi = global.CoreApi;
    const Environment = global.Environment || {};
    const BASE_URL = (Environment.baseUrl || Environment.baseUrlCommon || "http://172.16.2.31:3306").replace(/\/+$/, "");

    const LoanUtilizationService = {
        /**
         * Get workflow loan utilization details
         * @param {Object} requestData - { OurBranchID, ApplicationID, OperatorID, ModuleID }
         * @returns {Promise<Object>} Normalized response with loan utilization data
         */
        getWFLoanUtilization(requestData) {
            console.log('[LoanUtilizationService] getWFLoanUtilization called with:', requestData);
            const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetWFLoanUtilization", requestData);
            return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        },

        /**
         * Add or edit loan utilization record
         * @param {Object} requestData - Utilization details
         * @returns {Promise<Object>} Normalized response
         */
        addEditLoanUtilization(requestData) {
            console.log('[LoanUtilizationService] addEditLoanUtilization called with:', requestData);
            const envelope = CoreApi.makeRequestEnvelope("dbo.p_AddEditWFLoanUtilization", requestData);
            return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        },

        /**
         * Delete loan utilization record
         * @param {Object} requestData - { OurBranchID, ApplicationID, SLNO, OperatorID }
         * @returns {Promise<Object>} Normalized response
         */
        deleteLoanUtilization(requestData) {
            console.log('[LoanUtilizationService] deleteLoanUtilization called with:', requestData);
            const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteWFLoanUtilization", requestData);
            return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        }
    };

    global.LoanUtilizationService = LoanUtilizationService;
})(window);
