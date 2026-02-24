(function (global) {
    const CoreApi = global.CoreApi;
    const Environment = global.Environment || {};

    // Use baseUrlCommon if specific one isn't defined, robust fallback
    const BASE_URL = (Environment.baseUrlSystemAudit || Environment.baseUrlCommon || "http://localhost:XXXX").replace(/\/+$/, "");
    const API_ENDPOINT = `${BASE_URL}/api/OldAPI`;

    const SystemAuditService = {
        /**
         * Fetch Customer Balance data
         * @param {Object} requestData - { OurBranchID, ProductID, Year, Mode, Status, OperatorID }
         * @returns {Promise<Object>}
         */
        getCustomerBalance(requestData) {
            const formId = "dbo.ch_AccountBalance";
            const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
            return CoreApi.post(API_ENDPOINT, envelope);
        },

        /**
         * Fetch GL vs Sub Ledger data
         * @param {Object} requestData - { OurBranchID, Mode, Status, OperatorID, PostTransaction, TrxDate, ErrorNo, EOY }
         * @returns {Promise<Object>}
         */
        getGLSubLedger(requestData) {
            const formId = "dbo.ch_GLSubLedger";
            const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
            // Assuming same endpoint as Customer Balance
            return CoreApi.post(API_ENDPOINT, envelope);
        },

        /**
         * Search System Branches
         * @param {Object} requestData - { BankID }
         * @returns {Promise<Object>}
         */
        getSystemBranches(requestData) {
            const formId = "dbo.pc_SearchSystemBranches";
            const envelope = CoreApi.makeRequestEnvelope(formId, requestData);
            return CoreApi.post(API_ENDPOINT, envelope);
        }
    };

    global.SystemAuditService = SystemAuditService;
})(window);

