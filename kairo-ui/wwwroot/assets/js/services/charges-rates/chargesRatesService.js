(function (global) {
    const CoreApi = global.CoreApi;
    const Environment = global.Environment || {};

    if (!CoreApi) {
        console.error("CoreApi is not loaded. Ensure services/shared/coreApi.js is included before chargesRatesService.js.");
        return;
    }

    // Use baseUrlCommon as default if no specific service URL is defined
    const BASE_URL = (Environment.baseUrlCommon || "http://localhost:3306").replace(/\/+$/, "");

    const ChargesRatesService = {
        /**
         * Get currency maintenance data
         * @param {object} requestData - { OurBranchID, CurrencyID, OperatorID, Direction }
         * @returns {Promise} Normalized response with { success, code, message, data }
         */
        getCurrencyMaintenanceData(requestData) {
            // FormID/Procedure name: dbo.p_GetCurrencies as per user request
            const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetCurrencies", requestData);
            return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        },

        /**
         * Get denomination data
         * @param {object} requestData 
         * @returns {Promise}
         */
        getDenominationData(requestData) {
            const envelope = CoreApi.makeRequestEnvelope("p_GetDenominationDetails", requestData);
            return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
        }
    };

    global.ChargesRatesService = ChargesRatesService;
})(window);
