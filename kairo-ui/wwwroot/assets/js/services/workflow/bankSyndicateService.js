// Bank Syndicate Service (Workflow)
(function (global) {
  const CoreApi = global.CoreApi;
  const BASE_URL = (Environment.baseUrlCommon || "http://localhost:5000").replace(/\/+$/, "");

  const BankSyndicateService = {
    /**
     * Get bank syndicate data for a loan application
     * @param {Object} requestData - { OurBranchID, ApplicationID, OperatorID }
     * @returns {Promise<Object>} Normalized response with bank syndicate data
     */
    getBankSyndicate(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_GetWFLoanBankSyndicate", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Create a new bank syndicate record
     * @param {Object} requestData - Bank syndicate details
     * @returns {Promise<Object>} Normalized response
     */
    createBankSyndicate(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_CreateWFLoanBankSyndicate", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Update an existing bank syndicate record
     * @param {Object} requestData - Updated bank syndicate details
     * @returns {Promise<Object>} Normalized response
     */
    updateBankSyndicate(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_UpdateWFLoanBankSyndicate", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    },

    /**
     * Delete a bank syndicate record
     * @param {Object} requestData - { OurBranchID, ApplicationID, BankID }
     * @returns {Promise<Object>} Normalized response
     */
    deleteBankSyndicate(requestData) {
      const envelope = CoreApi.makeRequestEnvelope("dbo.p_DeleteWFLoanBankSyndicate", requestData);
      return CoreApi.post(`${BASE_URL}/api/OldAPI`, envelope);
    }
  };

  global.BankSyndicateService = BankSyndicateService;
})(window);
